# ORMs: uso a nivel senior

Un ORM (TypeORM, Prisma, Sequelize, MikroORM, JPA/Hibernate) acelera el desarrollo y reduce el código repetitivo, pero **esconde el SQL**. A nivel senior se espera saber qué consultas genera, cuándo se vuelve un problema y cuándo conviene bajar a SQL. Regla general: **el ORM es una herramienta para el 80% de los casos CRUD, no un reemplazo de conocer la base de datos.**

Relacionados: [Performance.md](Performance.md), [Transacciones.md](Transacciones.md), [Migraciones.md](Migraciones.md), [ConnectionPooling.md](ConnectionPooling.md).

## Espectro de herramientas

| Enfoque | Ejemplos | Ventaja | Costo |
|---|---|---|---|
| SQL crudo | `pg`, `postgres.js`, JDBC | Control total, sin sorpresas | Mapeo manual, menos tipado |
| Query builder | Knex, **Kysely**, jOOQ | SQL componible y tipado | Sigues pensando en SQL (lo cual es bueno) |
| Data mapper ORM | TypeORM (DataMapper), MikroORM, Hibernate | Entidades, unit of work, relaciones | Complejidad, SQL oculto |
| Cliente generado | **Prisma** | Tipado excelente, API simple | Menos flexible con SQL complejo; sin unit of work |

## El problema N+1

Se ejecuta **1 consulta** para traer una lista y luego **N consultas** adicionales, una por cada elemento, para cargar una relación.

```ts
// TypeORM con relación lazy o acceso en bucle
const orders = await orderRepo.find({ take: 50 });           // 1 consulta
for (const o of orders) {
  const items = await itemRepo.findBy({ orderId: o.id });    // 50 consultas
}
```

- Con 50 filas y 1 ms de round-trip ya son 50 ms extra; con latencia de red entre la app y la BD (por ejemplo, entre zonas de disponibilidad) es mucho peor.
- Es **invisible en desarrollo** (BD local, pocos datos) y aparece en producción.
- Variantes: serializadores o resolvers GraphQL que acceden a relaciones, getters lazy en JPA disparados por Jackson al serializar.

### Detección

- Logs de SQL del ORM en desarrollo (`logging: true` en TypeORM, `log: ['query']` en Prisma, `spring.jpa.show-sql` / `hibernate.generate_statistics`).
- **Contar consultas por request** en tests de integración y fallar si se supera un umbral.
- APM (Datadog, New Relic, OpenTelemetry): un trace con decenas de spans de BD idénticos es la firma del N+1.
- `pg_stat_statements`: una consulta con `calls` desproporcionadamente alto respecto de los requests.

### Soluciones

**1. Eager loading / JOIN** (una consulta):

```ts
// TypeORM
const orders = await orderRepo.find({ relations: { items: true }, take: 50 });

// QueryBuilder explícito
const orders2 = await dataSource.getRepository(Order)
  .createQueryBuilder('o')
  .leftJoinAndSelect('o.items', 'i')
  .where('o.customerId = :cid', { cid })
  .getMany();
```

- Cuidado con JOIN + paginación: `LIMIT` sobre un JOIN 1:N limita **filas**, no órdenes padre. TypeORM lo resuelve con una consulta extra de IDs distintos cuando usas `take`/`skip` (no `limit`/`offset`).
- Cuidado con el **producto cartesiano**: unir dos colecciones 1:N (items y pagos) multiplica filas (10 items × 10 pagos = 100 filas por orden).

**2. IN batching** (2 consultas, sin producto cartesiano):

```ts
// Prisma: include genera una segunda consulta con WHERE "orderId" IN (...)
const orders = await prisma.order.findMany({
  take: 50,
  include: { items: true },
});
```

```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 50;
SELECT * FROM order_items WHERE order_id IN ($1, $2, ..., $50);
```

- En Hibernate: `@BatchSize(size = 50)` o `hibernate.default_batch_fetch_size`; `JOIN FETCH` o `@EntityGraph` para eager puntual.
- Con listas muy grandes, `= ANY($1::bigint[])` evita generar miles de parámetros.

**3. DataLoader** (GraphQL y resolvers independientes):

```ts
import DataLoader from 'dataloader';

// Una instancia POR REQUEST (la caché no debe compartirse entre usuarios)
export const createLoaders = () => ({
  itemsByOrder: new DataLoader<string, OrderItem[]>(async (orderIds) => {
    const items = await prisma.orderItem.findMany({
      where: { orderId: { in: [...orderIds] } },
    });
    const byOrder = new Map<string, OrderItem[]>();
    for (const it of items) {
      byOrder.set(it.orderId, [...(byOrder.get(it.orderId) ?? []), it]);
    }
    return orderIds.map((id) => byOrder.get(id) ?? []);  // mismo orden que las keys
  }),
});
```

- Agrupa todas las llamadas `load(id)` de un mismo tick del event loop en una sola consulta con `IN`.
- Debe devolver los resultados **en el mismo orden** que las keys.

| Técnica | Consultas | Riesgo |
|---|---|---|
| JOIN | 1 | Producto cartesiano, paginación incorrecta |
| IN batching | 1 + 1 por relación | Listas `IN` muy grandes |
| DataLoader | 1 por relación por tick | Caché por request mal configurada |

## Lazy vs eager loading

- **Lazy**: la relación se carga al accederla. Cómodo, pero es la fuente principal del N+1 y de `LazyInitializationException` en Hibernate (se accede fuera de la sesión/transacción).
- **Eager en la definición de la entidad** (`eager: true` en TypeORM, `FetchType.EAGER` en JPA): carga la relación **siempre**, aunque no se use. Es un mal default: cada consulta arrastra joins innecesarios.
- Recomendación: relaciones **lazy por defecto** (en JPA, `@ManyToOne(fetch = LAZY)`, ya que `@ManyToOne` es EAGER por defecto) y **eager explícito por caso de uso** (`relations`, `include`, `JOIN FETCH`, `@EntityGraph`).
- **Anti-patrón Open Session in View** (Spring `spring.jpa.open-in-view=true` por defecto): mantiene la sesión abierta durante el render, así que el lazy loading "funciona" pero dispara consultas desde la capa de vista y retiene conexiones. Desactívalo.

## Identity map y unit of work

Conceptos de los ORMs **data mapper** (Hibernate, MikroORM, parcialmente TypeORM). Prisma no los implementa.

- **Identity map**: dentro de una sesión, cada fila se representa por **una única instancia** de objeto. Pedir dos veces el mismo `id` devuelve el mismo objeto (y en Hibernate, sin ir de nuevo a la BD: caché de primer nivel).
- **Unit of work**: el ORM rastrea los cambios en las entidades cargadas (**dirty checking**) y, al hacer `flush`/commit, genera los `INSERT/UPDATE/DELETE` necesarios en orden correcto.

```java
@Transactional
public void rename(Long id, String name) {
    Customer c = em.find(Customer.class, id);
    c.setName(name);      // sin save(): el dirty checking genera el UPDATE en el commit
}
```

Trade-offs:

- Cómodo y reduce escrituras redundantes, pero genera **escrituras "mágicas"**: modificar una entidad por error la persiste.
- Sesiones largas acumulan miles de entidades en memoria y el dirty checking se vuelve lento. En procesos batch: `flush()` + `clear()` cada N entidades, o `StatelessSession`.
- El orden del flush puede no ser el que esperas (Hibernate ordena inserts antes que deletes), lo que puede violar restricciones únicas.

## Transacciones en ORMs

```ts
// Prisma: transacción interactiva
await prisma.$transaction(async (tx) => {
  const acc = await tx.account.update({
    where: { id: from },
    data: { balance: { decrement: amount } },
  });
  if (acc.balance.lessThan(0)) throw new Error('Saldo insuficiente'); // rollback
  await tx.account.update({ where: { id: to }, data: { balance: { increment: amount } } });
}, { isolationLevel: 'Serializable', timeout: 5000 });

// TypeORM
await dataSource.transaction('REPEATABLE READ', async (manager) => {
  await manager.decrement(Account, { id: from }, 'balance', amount);
  await manager.increment(Account, { id: to }, 'balance', amount);
});
```

- **Usa el objeto transaccional** (`tx`, `manager`) dentro del callback. Usar el cliente global (`prisma`, `repo`) ejecuta **fuera** de la transacción, en otra conexión: bug silencioso y posible deadlock contra tu propia transacción.
- `@Transactional` de Spring funciona por **proxy**: llamar a un método anotado desde la misma clase (self-invocation) **no abre transacción**. Solo hace rollback por defecto con excepciones unchecked.
- Mantén las transacciones cortas: nada de HTTP ni colas dentro. Para eventos, usa outbox ([OutboxCDC.md](OutboxCDC.md)).
- Operaciones atómicas en SQL (`balance = balance - $1`) en lugar de leer, modificar en memoria y guardar: esto último produce **lost updates**. Alternativas: `SELECT ... FOR UPDATE` o locking optimista con columna `version` (`@VersionColumn` en TypeORM, `@Version` en JPA). Ver [Transacciones.md](Transacciones.md).
- Los reintentos ante `serialization_failure` (40001) o deadlock (40P01) deben reintentar **la transacción completa**.

## SQL generado ineficiente

Casos típicos que conviene revisar con logs y `EXPLAIN`:

- `find()` sin `select`: trae todas las columnas (incluidos JSON/texto pesados).
- `count` + `findMany` para paginación: dos consultas y un `COUNT(*)` caro. Ver [Performance.md](Performance.md).
- `save()` en TypeORM sobre una entidad: hace un `SELECT` previo para decidir entre INSERT o UPDATE. Para escrituras masivas usa `insert()` / `upsert()` / QueryBuilder.
- `delete` con cascadas del ORM (`cascade: ['remove']`, `CascadeType.REMOVE`): carga todas las hijas y las borra **una por una**. Prefiere `ON DELETE CASCADE` en la BD cuando corresponda.
- `createMany`/`saveMany` que en algunos ORMs o versiones se traducen en N inserts.
- Filtros sobre relaciones que se traducen en subconsultas correlacionadas o `EXISTS` sin índice en la FK.
- **FKs sin índice**: PostgreSQL no indexa automáticamente las columnas FK. Los JOINs y los borrados en cascada lo sufren. Ver [Indices.md](Indices.md).

## Proyecciones y DTOs

Traer entidades completas para mostrar tres campos desperdicia IO, memoria e hidratación (y en data mappers, dirty checking).

```ts
// Prisma
const users = await prisma.user.findMany({
  select: { id: true, email: true, _count: { select: { orders: true } } },
});

// TypeORM
const rows = await dataSource.getRepository(User)
  .createQueryBuilder('u')
  .select(['u.id', 'u.email'])
  .where('u.active = true')
  .getMany();
```

```java
// JPA: proyección a DTO (no entidades gestionadas, sin dirty checking)
@Query("select new com.acme.UserSummary(u.id, u.email) from User u where u.active = true")
List<UserSummary> findActiveSummaries();
```

- Para lecturas, las proyecciones evitan N+1 accidentales porque no hay relaciones lazy que acceder.
- No expongas entidades directamente en la API: acoplas el contrato público al esquema y arriesgas serializar relaciones lazy.

## Mapeo de relaciones

- **1:N / N:1**: la FK vive en el lado "N". Declara el índice en la FK.
- **N:M**: la tabla intermedia implícita (`@ManyToMany`) sirve hasta que necesitas atributos en la relación (fecha, rol). Entonces se modela como **entidad explícita** (`OrderProduct` con `quantity`). Conviene empezar así si hay dudas.
- **Herencia**: *single table* (rápida, columnas nulas), *joined* (normalizada, JOINs en cada consulta), *table per class* (UNION en consultas polimórficas). En general, prefiere single table o composición.
- **Relaciones bidireccionales**: mantener ambos lados sincronizados en memoria es responsabilidad tuya en JPA (el lado dueño es el que tiene la FK).
- Evita cascadas amplias (`cascade: true`, `CascadeType.ALL`): un `save` del padre puede insertar o actualizar objetos que no pretendías.

## Cuándo bajar a SQL crudo

- Reportes y agregaciones: window functions, CTEs recursivas, `GROUP BY` con `FILTER`, `LATERAL`. Ver [SQLAvanzado.md](SQLAvanzado.md).
- Operaciones masivas: `INSERT ... SELECT`, `UPDATE ... FROM`, `COPY`, `ON CONFLICT` complejos.
- Consultas críticas de rendimiento donde necesitas controlar el plan (keyset pagination con row values, índices parciales, hints de lock `FOR UPDATE SKIP LOCKED`).
- Features específicas del motor: `jsonb`, full-text search, PostGIS, advisory locks.

```ts
// Prisma: parametrizado (seguro frente a SQL injection)
const rows = await prisma.$queryRaw<{ id: bigint; total: number }[]>`
  SELECT customer_id AS id, sum(amount) AS total
  FROM orders
  WHERE created_at >= ${since}
  GROUP BY customer_id
  ORDER BY total DESC
  LIMIT 10`;

// NUNCA: $queryRawUnsafe con interpolación de strings del usuario
```

- En TypeORM: `dataSource.query(sql, params)` con `$1, $2`. En JPA: `@Query(nativeQuery = true)`.
- Un **query builder tipado** (Kysely, jOOQ) es un buen término medio: SQL explícito con verificación de tipos.
- Estrategia pragmática: ORM para CRUD y escrituras transaccionales; query builder o SQL para lecturas complejas (patrón cercano a CQRS).

## Migraciones autogeneradas peligrosas

- **`synchronize: true` en TypeORM** (o `hibernate.ddl-auto=update` en JPA) altera el esquema al arrancar la app comparando entidades contra la BD. En producción puede **borrar columnas con datos** (un rename se interpreta como drop + add), tomar locks `ACCESS EXCLUSIVE` en pleno tráfico y ejecutarse simultáneamente desde varias instancias. **Nunca en producción**; úsalo solo en prototipos locales.
- Las migraciones autogeneradas (`typeorm migration:generate`, `prisma migrate dev`) son un **borrador**: revísalas siempre. Errores frecuentes:
  - Renombrados como `DROP COLUMN` + `ADD COLUMN` (pérdida de datos).
  - `CREATE INDEX` sin `CONCURRENTLY` (bloquea escrituras).
  - `ALTER COLUMN TYPE` que reescribe la tabla.
  - `ADD CONSTRAINT FOREIGN KEY` sin `NOT VALID`.
- Prisma permite editar el SQL generado con `prisma migrate dev --create-only` antes de aplicarlo.
- Detalle de migraciones sin downtime en [Migraciones.md](Migraciones.md).

## Preguntas de entrevista

1. **¿Qué es el problema N+1 y cómo lo detectas en producción?**
   Una consulta para la lista y una por cada elemento para su relación. Se detecta en traces con muchos spans de BD idénticos, conteo de consultas por request en tests y `pg_stat_statements` con `calls` desproporcionados.
2. **¿JOIN, IN batching o DataLoader?**
   JOIN para relaciones N:1 o 1:N pequeñas; IN batching cuando hay varias colecciones (evita el producto cartesiano) o paginación; DataLoader cuando los accesos están dispersos en resolvers independientes (GraphQL).
3. **¿Por qué `FetchType.EAGER` o `eager: true` es un mal default?**
   Carga la relación en todas las consultas aunque no se use y, en colecciones, puede generar N+1 o productos cartesianos. Es mejor lazy por defecto y eager explícito por caso de uso.
4. **¿Qué son identity map y unit of work? ¿Qué riesgo tienen?**
   Una instancia por fila dentro de la sesión y seguimiento de cambios con flush automático. Riesgos: escrituras no intencionales, consumo de memoria y dirty checking lento en sesiones largas o batch.
5. **Un `@Transactional` no hace rollback. ¿Qué revisas?**
   Self-invocation (el proxy no intercepta), método no público, excepción checked (por defecto no hace rollback) o excepción capturada dentro del método.
6. **¿Por qué `synchronize: true` es peligroso?**
   Aplica DDL automáticamente al arrancar: puede eliminar columnas con datos, tomar locks exclusivos con tráfico y ejecutarse en paralelo desde varias instancias, sin revisión ni versionado.
7. **¿Cuándo dejarías el ORM para usar SQL crudo?**
   Reportes, operaciones masivas, consultas críticas donde necesitas controlar el plan y features específicas del motor. Siempre parametrizado.
8. **¿Cómo evitas lost updates con un ORM?**
   Updates atómicos en SQL, locking optimista con columna de versión, o `SELECT ... FOR UPDATE` dentro de la transacción, según el nivel de contención.

## Errores comunes

- No mirar nunca el SQL generado.
- Relaciones eager por defecto o lazy loading accedido desde serializadores.
- Usar el cliente global en lugar del transaccional dentro de una transacción.
- Llamadas HTTP dentro de `$transaction` / `@Transactional`.
- `synchronize: true` o `ddl-auto=update` fuera de local.
- Aplicar migraciones autogeneradas sin revisarlas.
- Exponer entidades del ORM directamente en la API.
- Cargar entidades completas en procesos batch sin `flush/clear` ni lotes.
- `$queryRawUnsafe` o concatenación de strings con input del usuario.
