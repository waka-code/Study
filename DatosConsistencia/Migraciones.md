# Migraciones de esquema

Cambiar el esquema de una base de datos en producción, con tráfico, es una de las operaciones más riesgosas del trabajo backend. Un `ALTER TABLE` inocente puede bloquear una tabla crítica durante minutos. A nivel senior se espera conocer **qué lock toma cada operación**, cómo hacer cambios **sin downtime** y cómo coordinar esquema y código en despliegues rolling.

Relacionados: [ORMs.md](ORMs.md), [Transacciones.md](Transacciones.md), [Indices.md](Indices.md), [Backups.md](Backups.md).

## Migraciones versionadas

Cada cambio de esquema es un archivo versionado en el repositorio, aplicado **una sola vez** y en orden. La BD guarda en una tabla qué migraciones ya se aplicaron.

| Herramienta | Ecosistema | Formato | Tabla de control |
|---|---|---|---|
| **Flyway** | JVM (y CLI) | SQL (`V3__add_email.sql`) o Java | `flyway_schema_history` |
| **Liquibase** | JVM (y CLI) | XML/YAML/JSON/SQL con changesets | `databasechangelog` |
| **Prisma Migrate** | Node | SQL generado desde `schema.prisma` | `_prisma_migrations` |
| **TypeORM** | Node | Clases TS con `up`/`down` | `migrations` |
| Knex, Sequelize, Alembic, Rails | Varios | Código | Propia |

Principios:

- **Inmutables**: una migración aplicada en algún entorno no se edita; se corrige con una nueva. Flyway valida checksums y falla si cambió.
- **Mismo camino en todos los entornos**: dev → staging → prod aplican los mismos archivos.
- **Ejecutar como paso separado del deploy** (job de CI/CD, init container o tarea ECS), no en el arranque de cada instancia: con 20 pods arrancando, 20 procesos intentarían migrar (la mayoría de las herramientas toma un lock, pero el arranque queda acoplado a la migración).
- **Revisar el SQL** siempre, sobre todo si fue autogenerado. Ver [ORMs.md](ORMs.md) (`synchronize: true`).
- `prisma migrate deploy` en producción; **nunca** `prisma migrate dev` ni `db push` (pueden resetear la BD o aplicar cambios sin versionar).

```ts
// TypeORM
export class AddCustomerEmail1727300000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE customers ADD COLUMN email text`);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE customers DROP COLUMN email`);
  }
}
```

## Locks que toma ALTER TABLE

La mayoría de las formas de `ALTER TABLE` en PostgreSQL toman **`ACCESS EXCLUSIVE`**, el lock más fuerte: bloquea **incluso los `SELECT`**.

| Operación | Lock | ¿Reescribe la tabla? |
|---|---|---|
| `ADD COLUMN` (nullable, sin default) | ACCESS EXCLUSIVE (instantáneo) | No |
| `ADD COLUMN ... DEFAULT <constante>` (PG11+) | ACCESS EXCLUSIVE (instantáneo) | No |
| `ADD COLUMN ... DEFAULT <volátil>` (`gen_random_uuid()`, `clock_timestamp()`) | ACCESS EXCLUSIVE | **Sí** |
| `DROP COLUMN` | ACCESS EXCLUSIVE (instantáneo) | No (marca la columna como eliminada) |
| `ALTER COLUMN TYPE` (la mayoría de los casos) | ACCESS EXCLUSIVE | **Sí**, más reconstrucción de índices |
| `ALTER COLUMN TYPE varchar(n)` → mayor o `text` | ACCESS EXCLUSIVE (instantáneo) | No |
| `SET NOT NULL` | ACCESS EXCLUSIVE | No, pero **escanea** toda la tabla |
| `ADD CONSTRAINT ... FOREIGN KEY` | SHARE ROW EXCLUSIVE en ambas tablas | No, pero valida escaneando |
| `ADD CONSTRAINT ... NOT VALID` | Lock breve | No |
| `VALIDATE CONSTRAINT` | SHARE UPDATE EXCLUSIVE (permite lecturas y escrituras) | No |
| `CREATE INDEX` | SHARE (bloquea escrituras) | — |
| `CREATE INDEX CONCURRENTLY` | SHARE UPDATE EXCLUSIVE (no bloquea escrituras) | — |

### La cola de locks: el peligro real

Incluso un `ALTER` "instantáneo" puede causar una caída:

1. Una transacción larga (un reporte, un `idle in transaction`) tiene un `ACCESS SHARE` sobre `orders`.
2. La migración pide `ACCESS EXCLUSIVE` y **espera** detrás de ella.
3. Todas las consultas nuevas sobre `orders`, incluso los `SELECT`, **se encolan detrás de la migración**, porque su lock es incompatible con el que está esperando.
4. Resultado: la tabla queda inaccesible, el pool se agota y la app cae, aunque el `ALTER` en sí tarde 1 ms.

Solución: **`lock_timeout` + reintentos**.

```sql
SET lock_timeout = '3s';          -- si no obtiene el lock en 3 s, falla y libera la cola
SET statement_timeout = '15s';
ALTER TABLE orders ADD COLUMN notes text;
```

- Si falla, la herramienta reintenta con backoff. Es preferible una migración que reintenta 5 veces a una caída.
- Antes de migrar, revisa transacciones largas:

```sql
SELECT pid, now() - xact_start AS dur, state, left(query, 80)
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY dur DESC
LIMIT 10;
```

- Ejecuta **una operación riesgosa por migración/transacción**: si una migración agrupa varios `ALTER` en una transacción, retiene el `ACCESS EXCLUSIVE` del primero hasta el final.

## Operaciones seguras paso a paso

### Añadir columna NOT NULL con default

```sql
-- PG11+: instantáneo con default constante (se guarda en el catálogo, sin reescribir)
ALTER TABLE orders ADD COLUMN priority smallint NOT NULL DEFAULT 0;
```

- Antes de PG11 esto reescribía toda la tabla. En MySQL 8 existe `ALGORITHM=INSTANT` para casos similares.
- Con default volátil o `NOT NULL` sobre una columna existente, usa el enfoque en pasos:

```sql
-- 1. Añadir nullable
ALTER TABLE orders ADD COLUMN region text;
-- 2. Backfill en lotes (ver más abajo)
-- 3. CHECK NOT VALID + VALIDATE (sin bloquear escrituras)
ALTER TABLE orders ADD CONSTRAINT orders_region_nn CHECK (region IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_region_nn;
-- 4. PG12+: SET NOT NULL reutiliza el CHECK validado y evita el escaneo
ALTER TABLE orders ALTER COLUMN region SET NOT NULL;
ALTER TABLE orders DROP CONSTRAINT orders_region_nn;
```

### Crear índices

```sql
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);
```

- No bloquea escrituras, pero tarda más (dos pasadas) y **no puede ejecutarse dentro de una transacción**. En Flyway, Prisma o TypeORM hay que desactivar la transacción para esa migración (TypeORM: `transaction = false` en la clase; Flyway: `executeInTransaction=false`).
- Si falla, deja un índice **INVALID** que igual se mantiene en cada escritura: hay que borrarlo (`DROP INDEX CONCURRENTLY`) y reintentar.

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
```

- Para reemplazar un índice: `REINDEX INDEX CONCURRENTLY` (PG12+).

### Añadir foreign keys

```sql
-- 1. Crea la restricción sin validar filas existentes (lock breve); aplica a filas nuevas
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers (id) NOT VALID;

-- 2. Valida las filas existentes sin bloquear escrituras
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_customer;
```

- Crea también el **índice** sobre `orders.customer_id` (con `CONCURRENTLY`) si no existe: PostgreSQL no lo crea solo.

## Backfills en lotes

Un `UPDATE orders SET region = ...` sobre 200 millones de filas en una sola sentencia genera una transacción enorme: locks de fila durante mucho tiempo, WAL masivo, lag en réplicas y bloat.

```sql
-- Lote por rango de PK; repetir desde la app/script hasta que no queden filas
UPDATE orders o
SET region = c.region
FROM customers c
WHERE o.customer_id = c.id
  AND o.id > $1 AND o.id <= $1 + 10000
  AND o.region IS NULL;
```

```ts
async function backfill(pool: Pool, batch = 10_000) {
  const { rows } = await pool.query<{ max: string }>('SELECT max(id) AS max FROM orders');
  const maxId = BigInt(rows[0].max ?? 0);
  for (let start = 0n; start < maxId; start += BigInt(batch)) {
    await pool.query(
      `UPDATE orders SET region = 'LATAM'
       WHERE id > $1 AND id <= $2 AND region IS NULL`,
      [start.toString(), (start + BigInt(batch)).toString()],
    );
    await new Promise((r) => setTimeout(r, 50)); // throttle: da aire a réplicas y autovacuum
  }
}
```

- Cada lote en su **propia transacción** (autocommit).
- **Idempotente** (`AND region IS NULL`): se puede interrumpir y retomar.
- Recorre por PK (rango), no con `OFFSET`.
- Monitorea el **lag de réplicas** y ajusta el tamaño del lote o el throttle.
- Ejecútalo como job, no dentro de la migración versionada (una migración de horas bloquea el pipeline).

## Compatibilidad con despliegues rolling

Durante un despliegue rolling (Kubernetes, ECS) conviven **código viejo y código nuevo** contra el **mismo esquema**. Además, si hay que hacer rollback del código, el esquema ya migrado debe seguir sirviendo al código viejo.

Regla: **cada migración debe ser compatible con la versión de código anterior y con la siguiente.**

- Añadir una columna nullable → compatible (el código viejo la ignora).
- Borrar o renombrar una columna que el código viejo usa → **rompe** a las instancias viejas en medio del deploy.
- Añadir `NOT NULL` sin default → rompe los `INSERT` del código viejo.
- Cuidado con ORMs que hacen `SELECT` con la lista de columnas de la entidad: si la columna desaparece, fallan todas las consultas de la entidad. En Hibernate/JPA, `@Transient` o eliminar el campo antes; en Rails, `ignored_columns`.

## Patrón expand/contract (parallel change)

Divide un cambio incompatible en pasos compatibles, cada uno desplegado por separado.

### Ejemplo 1: renombrar `users.name` a `users.full_name`

| Paso | Esquema | Código |
|---|---|---|
| 1. **Expand** | `ADD COLUMN full_name text` | — |
| 2. Doble escritura | — | Escribe en `name` y `full_name`; lee de `name` |
| 3. Backfill | `UPDATE ... SET full_name = name WHERE full_name IS NULL` en lotes | — |
| 4. Cambiar lecturas | — | Lee de `full_name`; sigue escribiendo en ambas |
| 5. Dejar de escribir la vieja | — | Solo `full_name` |
| 6. **Contract** | `DROP COLUMN name` | — |

- Cada paso es un deploy independiente y reversible hasta el paso 6.
- La doble escritura puede hacerse en la app o con un **trigger** temporal (útil si hay varios servicios escribiendo):

```sql
CREATE OR REPLACE FUNCTION sync_full_name() RETURNS trigger AS $$
BEGIN
  IF NEW.full_name IS NULL THEN
    NEW.full_name := NEW.name;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_full_name
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION sync_full_name();
```

- `ALTER TABLE ... RENAME COLUMN` es instantáneo, pero **no** es seguro con rolling deploys: el código viejo deja de encontrar la columna en el mismo instante.

### Ejemplo 2: cambiar `orders.id` de INT a BIGINT

`ALTER COLUMN id TYPE bigint` reescribe la tabla y sus índices con `ACCESS EXCLUSIVE`: en una tabla grande son minutos u horas de bloqueo.

1. `ADD COLUMN id_new bigint` (instantáneo).
2. Trigger que copia `id` → `id_new` en cada INSERT/UPDATE.
3. Backfill en lotes de las filas existentes.
4. `CREATE UNIQUE INDEX CONCURRENTLY orders_id_new_idx ON orders (id_new)`.
5. En una transacción corta con `lock_timeout`: eliminar la PK vieja, `ADD CONSTRAINT orders_pkey PRIMARY KEY USING INDEX orders_id_new_idx`, renombrar columnas, mover la secuencia/identity.
6. Repetir para las FKs que apuntan a esa PK (con `NOT VALID` + `VALIDATE`).

Por eso conviene usar `BIGINT` para IDs desde el inicio. Ver [Performance.md](Performance.md).

### Otros casos

- **Dividir una tabla**: crear la nueva, doble escritura, backfill, cambiar lecturas, dejar de escribir la vieja, borrarla.
- **Cambiar un enum**: `ALTER TYPE ... ADD VALUE` es barato; quitar un valor no se puede directamente (requiere crear un tipo nuevo y migrar la columna). Por eso muchos equipos prefieren `text` + `CHECK` o una tabla de referencia.

## Rollback vs roll-forward

- Los scripts `down` suelen ser **teóricos**: rara vez se prueban, y muchos cambios son irreversibles (`DROP COLUMN` pierde los datos; un `down` que re-crea la columna la deja vacía).
- En producción la práctica madura es **roll-forward**: si una migración causa problemas, se escribe y despliega una nueva migración que corrige.
- Expand/contract hace que el rollback **del código** sea seguro sin tocar el esquema: el esquema expandido sirve a ambas versiones.
- La fase **contract** (borrar columnas o tablas) se hace días después, cuando ya no hay posibilidad de volver a la versión anterior. Antes de borrar, considera un respaldo de esa columna ([Backups.md](Backups.md)).
- Probar migraciones contra una **copia de producción** (tamaño real) revela reescrituras y tiempos que en una BD de desarrollo no se ven.

## MySQL: gh-ost y pt-online-schema-change

En MySQL muchos `ALTER TABLE` históricamente copiaban la tabla bloqueando escrituras. MySQL 8 añadió **Online DDL** (`ALGORITHM=INPLACE` / `INSTANT`, `LOCK=NONE`), pero para cambios pesados en tablas grandes se usan herramientas externas:

| Herramienta | Mecanismo | Ventajas | Limitaciones |
|---|---|---|---|
| **pt-online-schema-change** (Percona) | Crea tabla "sombra" con el nuevo esquema, copia en lotes y sincroniza cambios con **triggers**, luego hace swap con `RENAME` atómico | Madura, simple | Los triggers agregan carga a cada escritura; problemas con tablas que ya tienen triggers |
| **gh-ost** (GitHub) | Tabla sombra + lee el **binlog** para aplicar cambios (sin triggers) | Sin triggers, pausable, throttling según lag de réplicas, cut-over controlado | Requiere binlog en formato ROW; más piezas operativas |

- En PostgreSQL el equivalente conceptual es **pg_repack** (reorganiza tablas sin lock prolongado) o, para cambios grandes, replicación lógica hacia una tabla o base nueva.

## Checklist antes de aplicar una migración

1. ¿Qué lock toma? ¿Reescribe o escanea la tabla?
2. ¿Tiene `lock_timeout` y reintentos?
3. ¿Es compatible con la versión anterior y siguiente del código?
4. ¿Los índices usan `CONCURRENTLY` y las FKs/CHECKs `NOT VALID` + `VALIDATE`?
5. ¿Los backfills van en lotes, son idempotentes y están separados de la migración?
6. ¿Se probó contra datos de tamaño real?
7. ¿Hay plan de roll-forward y backup reciente?

## Preguntas de entrevista

1. **¿Por qué un `ALTER TABLE ADD COLUMN` instantáneo puede tumbar producción?**
   Porque necesita `ACCESS EXCLUSIVE`. Si una transacción larga tiene un lock sobre la tabla, el ALTER espera y todas las consultas nuevas se encolan detrás. Se mitiga con `lock_timeout` corto y reintentos.
2. **¿Cómo renombras una columna sin downtime?**
   Expand/contract: añadir la nueva, doble escritura, backfill en lotes, mover lecturas, dejar de escribir la vieja y, en un deploy posterior, borrarla. `RENAME COLUMN` rompe a las instancias con código viejo durante el rolling deploy.
3. **¿Cómo añades una FK a una tabla de 500 millones de filas?**
   `ADD CONSTRAINT ... NOT VALID` (lock breve, aplica a filas nuevas) y luego `VALIDATE CONSTRAINT`, que escanea con un lock que permite lecturas y escrituras. Además, índice en la columna FK con `CONCURRENTLY`.
4. **¿Qué pasa si falla un `CREATE INDEX CONCURRENTLY`?**
   Queda un índice INVALID que no se usa en lecturas pero se mantiene en escrituras. Hay que detectarlo (`pg_index.indisvalid`), borrarlo con `DROP INDEX CONCURRENTLY` y reintentar.
5. **¿Rollback o roll-forward?**
   Roll-forward. Los `down` rara vez están probados y muchos cambios son destructivos. Con expand/contract, el código puede volver atrás sin tocar el esquema.
6. **¿Cómo haces un backfill de 200 millones de filas?**
   Lotes por rango de PK, cada uno en su transacción, idempotente, con throttling según el lag de réplicas, ejecutado como job fuera de la migración versionada.
7. **¿Por qué no correr migraciones en el arranque de la app?**
   Acopla el arranque a operaciones potencialmente largas, con varias instancias compitiendo, y hace fallar health checks. Es mejor un paso dedicado del pipeline antes del rollout.
8. **¿Qué diferencia hay entre gh-ost y pt-online-schema-change?**
   Ambos copian a una tabla sombra y hacen swap. pt-osc sincroniza con triggers (carga extra en escrituras); gh-ost lee el binlog, sin triggers, y permite pausar y controlar el cut-over.

## Errores comunes

- `synchronize: true` / `ddl-auto=update` en producción.
- Migraciones sin `lock_timeout`.
- `CREATE INDEX` sin `CONCURRENTLY` en tablas con tráfico.
- `RENAME COLUMN` o `DROP COLUMN` en el mismo deploy que el cambio de código.
- Backfills masivos en una sola transacción dentro de la migración.
- Editar migraciones ya aplicadas en otros entornos.
- Varios `ALTER` riesgosos en una misma transacción.
- Confiar en scripts `down` nunca probados.
- Probar solo contra una BD de desarrollo vacía.
