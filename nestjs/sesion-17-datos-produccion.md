# Sesión 17 — Datos en producción: migraciones, transacciones, paginación, N+1, patrón repository

> **Objetivo de la sesión**: pasar de "mi CRUD funciona en local" a "mi capa de datos aguanta producción". Al terminar deberías poder gestionar **migraciones** con TypeORM, Prisma y Mongo (incluido el patrón *expand/contract* para cero downtime), implementar **transacciones** en los tres (y propagarlas sin ensuciar las firmas con `@nestjs-cls/transactional`), manejar **concurrencia** (optimistic/pessimistic locking), paginar con **offset y keyset**, detectar y eliminar el **problema N+1**, y decidir con criterio cuándo vale la pena un **patrón repository** propio.

---

## 1. Lo que cambia al llegar a producción

En las Sesiones 14–16 construiste la persistencia de TiendaApi con TypeORM, Prisma y Mongoose. Todo funcionaba porque: la base estaba vacía, había un solo usuario (tú), el esquema se sincronizaba solo y nadie concurría. En producción aparecen cinco problemas nuevos:

| Problema | Síntoma | Sección |
|---|---|---|
| El esquema evoluciona con datos reales dentro | `synchronize` borra una columna con datos | 2 |
| Operaciones que tocan varias filas/tablas | Orden creada pero stock sin descontar | 3 |
| Requests concurrentes sobre el mismo dato | Se vende más stock del que hay | 4 |
| Tablas con millones de filas | `OFFSET 500000` tarda 3 s | 5 |
| Relaciones cargadas en bucles | 1 endpoint = 201 queries | 6 |

---

## 2. Migraciones

### 2.1 Por qué `synchronize: true` está prohibido en producción

`synchronize` (TypeORM) y `prisma db push` comparan tu modelo con la base y aplican la diferencia **directamente**, sin historial ni revisión. Si renombras una propiedad, la herramienta ve "columna vieja sobra, columna nueva falta" → hace `DROP COLUMN` + `ADD COLUMN` → **pierdes los datos**.

Una **migración** es un archivo versionado con el cambio de esquema (y su reverso), que:
- se revisa en el PR como cualquier código,
- se aplica en orden, **una sola vez** por entorno (se registra en una tabla: `migrations` en TypeORM, `_prisma_migrations` en Prisma),
- es reproducible: dev, staging y prod llegan al mismo esquema.

```
 código ──▶ generar migración ──▶ revisar SQL ──▶ commit ──▶ CI ──▶ deploy: aplicar migraciones ──▶ arrancar app
                                   (¡a mano!)
```

### 2.2 TypeORM

La CLI de TypeORM necesita un `DataSource` **fuera** de Nest (no puede arrancar tu `AppModule`):

```typescript
// src/database/data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false, // SIEMPRE false fuera de prototipos
});
```

```json
// package.json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate src/database/migrations/$npm_config_name",
    "migration:run": "npm run build && npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

```bash
npm run migration:generate --name=AgregarSkuProducto   # compara entidades vs BD y genera el diff
```

```typescript
// src/database/migrations/1727000000000-AgregarSkuProducto.ts (generada y REVISADA)
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarSkuProducto1727000000000 implements MigrationInterface {
  name = 'AgregarSkuProducto1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "productos" ADD "sku" varchar(40)`);
    // Backfill: datos existentes necesitan un valor antes del NOT NULL
    await queryRunner.query(`UPDATE "productos" SET "sku" = 'LEGACY-' || "id" WHERE "sku" IS NULL`);
    await queryRunner.query(`ALTER TABLE "productos" ALTER COLUMN "sku" SET NOT NULL`);
    // CONCURRENTLY no bloquea escrituras, pero no puede ir dentro de una transacción:
    // en ese caso marca la migración con `transaction = false` (TypeORM ≥ 0.3)
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_productos_sku" ON "productos" ("sku")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_productos_sku"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "sku"`);
  }
}
```

En el `TypeOrmModule.forRootAsync` de la app: `synchronize: false` y, opcionalmente, `migrationsRun: true` (aplica al arrancar). Mira la sección 2.5 antes de activarlo.

### 2.3 Prisma

```bash
npx prisma migrate dev --name agregar_sku_producto   # DEV: genera SQL en prisma/migrations/ y lo aplica
npx prisma migrate dev --create-only --name ...      # solo genera: para editar el SQL (backfill) antes
npx prisma migrate deploy                            # PROD/CI: aplica pendientes, nunca genera ni resetea
npx prisma migrate status                            # qué está aplicado y qué no
```

| Comando | Dónde | Qué hace |
|---|---|---|
| `migrate dev` | Solo local | Genera + aplica; puede **resetear** la BD si detecta drift |
| `migrate deploy` | CI / producción | Aplica migraciones pendientes, en orden |
| `db push` | Prototipos | Sincroniza sin migración (como `synchronize`) |
| `migrate reset` | Local | Borra todo, reaplica y ejecuta seed |

> ⚠️ Nunca corras `prisma migrate dev` contra producción: si detecta divergencia te propone resetear la base. En producción **solo** `migrate deploy`.

### 2.4 Mongo

Mongo no tiene DDL, pero sí necesitas migrar **datos** (renombrar campos, backfills) e **índices**. Herramienta habitual: `migrate-mongo`.

```javascript
// migrations/20260901-renombrar-precio.js (migrate-mongo)
module.exports = {
  async up(db) {
    await db.collection('productos').updateMany({ price: { $exists: true } }, { $rename: { price: 'precio' } });
    await db.collection('productos').createIndex({ categoria: 1, activo: 1, createdAt: -1 });
  },
  async down(db) {
    await db.collection('productos').updateMany({}, { $rename: { precio: 'price' } });
  },
};
```

### 2.5 Cero downtime: el patrón expand/contract

Durante un deploy *rolling* conviven la versión vieja y la nueva de la app contra **la misma base**. Una migración que rompe a la versión vieja = errores 500 durante el deploy.

Renombrar `nombre` → `titulo` sin downtime:

```
Deploy 1 (EXPAND)    ADD COLUMN titulo; la app escribe en AMBAS, lee de nombre
Backfill             UPDATE ... SET titulo = nombre WHERE titulo IS NULL  (por lotes)
Deploy 2             la app lee de titulo, sigue escribiendo en ambas
Deploy 3 (CONTRACT)  la app deja de usar nombre; DROP COLUMN nombre
```

Reglas prácticas:
- Nunca `DROP`/`RENAME` en el mismo deploy que el código que deja de usarlo.
- `NOT NULL` en columna nueva: primero nullable + backfill, luego la restricción.
- Índices en tablas grandes: `CREATE INDEX CONCURRENTLY` (Postgres) para no bloquear escrituras.
- Backfills masivos por **lotes** (ej. 5 000 filas) para no bloquear ni llenar el WAL.

> ❓ **Entrevista**: *"¿Corres las migraciones al arrancar la app o en un paso aparte?"* → En un **paso aparte del pipeline** (un job/task antes de actualizar el servicio, Sesión 34). Si cada réplica corre migraciones al arrancar, 10 contenedores compiten por aplicarlas (Prisma usa un advisory lock, pero igual acoplas el arranque a la duración de la migración y un fallo tumba todas las réplicas). Además, las migraciones deben ser compatibles con la versión anterior de la app (expand/contract).

---

## 3. Transacciones

Una transacción agrupa operaciones con garantías **ACID**: *Atomicity* (todo o nada), *Consistency* (invariantes), *Isolation* (las transacciones concurrentes no se pisan, según el nivel), *Durability* (confirmado = persistido).

### 3.1 Niveles de aislamiento

| Nivel | Dirty read | Non-repeatable read | Phantom | Nota |
|---|---|---|---|---|
| Read Uncommitted | posible | posible | posible | Postgres lo trata como Read Committed |
| **Read Committed** | ❌ | posible | posible | **Default de Postgres** |
| Repeatable Read | ❌ | ❌ | posible (no en PG) | Default de MySQL InnoDB |
| Serializable | ❌ | ❌ | ❌ | Puede fallar con error `40001`: hay que **reintentar** |

### 3.2 TypeORM

```typescript
// src/ordenes/ordenes.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Orden } from './entities/orden.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CrearOrdenDto } from './dto/crear-orden.dto';

@Injectable()
export class OrdenesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async crear(clienteId: number, dto: CrearOrdenDto): Promise<Orden> {
    // dataSource.transaction: COMMIT si la promesa resuelve, ROLLBACK si lanza
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      let total = 0;
      for (const item of dto.items) {
        // UPDATE atómico condicional: descuenta solo si hay stock suficiente
        const res = await manager
          .createQueryBuilder()
          .update(Producto)
          .set({ stock: () => 'stock - :cant' })
          .where('id = :id AND stock >= :cant', { id: item.productoId, cant: item.cantidad })
          .execute();
        if (res.affected !== 1) throw new BadRequestException(`Sin stock: producto ${item.productoId}`);

        const p = await manager.findOneByOrFail(Producto, { id: item.productoId });
        total += p.precio * item.cantidad;
      }
      // ⚠️ usa SIEMPRE el `manager` recibido, no this.repo: fuera del manager = fuera de la transacción
      return manager.save(Orden, manager.create(Orden, { clienteId, total, items: dto.items }));
    });
  }
}
```

Con control manual (`QueryRunner`), útil cuando necesitas decidir tú el commit:

```typescript
const qr = this.dataSource.createQueryRunner();
await qr.connect();
await qr.startTransaction('SERIALIZABLE');
try {
  // ... qr.manager.save(...)
  await qr.commitTransaction();
} catch (e) {
  await qr.rollbackTransaction();
  throw e;
} finally {
  await qr.release(); // ⚠️ si no liberas, la conexión nunca vuelve al pool
}
```

### 3.3 Prisma

```typescript
// Batch: array de operaciones independientes, una transacción
await this.prisma.$transaction([
  this.prisma.producto.update({ where: { id: 1 }, data: { stock: { decrement: 2 } } }),
  this.prisma.auditoria.create({ data: { accion: 'AJUSTE_STOCK', productoId: 1 } }),
]);

// Interactiva: lógica entre queries (lee, decide, escribe)
import { Prisma } from '@prisma/client';

await this.prisma.$transaction(
  async (tx) => {
    const res = await tx.producto.updateMany({
      where: { id: item.productoId, stock: { gte: item.cantidad } },
      data: { stock: { decrement: item.cantidad } },
    });
    if (res.count !== 1) throw new BadRequestException('Sin stock'); // lanzar = ROLLBACK
    return tx.orden.create({ data: { clienteId, total, items: { create: itemsData } } });
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 2000,  // ms esperando conexión del pool
    timeout: 5000,  // ms máximos de la transacción (default 5000)
  },
);
```

> ⚠️ En la transacción interactiva usa **`tx`**, no `this.prisma`. Y no hagas llamadas HTTP externas (pasarela de pago) dentro: mantienes una conexión y locks abiertos mientras esperas la red. Si la transacción supera el `timeout`, Prisma la aborta.

Mongoose: `session.withTransaction()` con `{ session }` en cada operación (Sesión 16, sección 10).

### 3.4 Propagar la transacción sin contaminar las firmas

El problema: `OrdenesService` abre la transacción, pero el descuento de stock vive en `ProductosService` y la auditoría en `AuditoriaService`. Pasar `manager`/`tx` como parámetro por todas las capas es feo y fácil de olvidar.

Solución: **AsyncLocalStorage** (el "thread-local" de Node). La librería `nestjs-cls` + `@nestjs-cls/transactional` guarda la transacción activa en el contexto de la request y cada repositorio la usa automáticamente.

```bash
npm i nestjs-cls @nestjs-cls/transactional @nestjs-cls/transactional-adapter-prisma
```

```typescript
// app.module.ts
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

ClsModule.forRoot({
  global: true,
  middleware: { mount: true },
  plugins: [
    new ClsPluginTransactional({
      imports: [PrismaModule],
      adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
    }),
  ],
});
```

```typescript
// productos.service.ts — no sabe si está dentro de una transacción o no
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class ProductosService {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  async descontarStock(id: number, cantidad: number) {
    // txHost.tx = cliente transaccional si hay transacción activa, PrismaClient normal si no
    const res = await this.txHost.tx.producto.updateMany({
      where: { id, stock: { gte: cantidad } },
      data: { stock: { decrement: cantidad } },
    });
    if (res.count !== 1) throw new BadRequestException('Sin stock');
  }
}

// ordenes.service.ts — define el LÍMITE de la transacción
import { Transactional } from '@nestjs-cls/transactional';

@Transactional()
async crear(clienteId: number, dto: CrearOrdenDto) {
  for (const it of dto.items) await this.productos.descontarStock(it.productoId, it.cantidad);
  await this.auditoria.registrar('ORDEN_CREADA', clienteId);
  return this.txHost.tx.orden.create({ data: { /* ... */ } });
}
```

Existe también `@nestjs-cls/transactional-adapter-typeorm` (con `dataSourceToken: getDataSourceToken()`) y adaptadores para otros ORMs. Profundizaremos en AsyncLocalStorage y contexto por request en la **Sesión 23** (alternativa a los providers `REQUEST`-scoped).

> ❓ **Entrevista**: *"¿Dónde va el límite de la transacción: controller, servicio o repositorio?"* → En el **caso de uso** (servicio de aplicación): es quien conoce la operación de negocio completa. El repositorio no debe abrir transacciones (no sabe con qué más se combina) y el controller no debe saber de persistencia.

---

## 4. Concurrencia: locks optimistas y pesimistas

Escenario: queda 1 unidad; dos clientes compran a la vez.

```
Request A: SELECT stock → 1            Request B: SELECT stock → 1
Request A: 1 >= 1 ✓ → UPDATE stock=0   Request B: 1 >= 1 ✓ → UPDATE stock=0
Resultado: 2 ventas, 1 unidad. 💥  (lost update)
```

Tres soluciones, de preferida a menos preferida según el caso:

| Estrategia | Cómo | Cuándo |
|---|---|---|
| **Update atómico condicional** | `UPDATE ... SET stock = stock - 1 WHERE id = ? AND stock >= 1` y revisar filas afectadas | Contadores, stock, saldos. La mejor si cabe en una sentencia |
| **Optimistic locking** | Columna `version`; el UPDATE exige la versión leída; si no coincide → 409 | Edición de entidades con baja contención (formularios) |
| **Pessimistic locking** | `SELECT ... FOR UPDATE` dentro de la transacción | Alta contención, lógica compleja entre lectura y escritura |

Optimistic en TypeORM:

```typescript
@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn() id: number;
  @Column() nombre: string;
  @VersionColumn() version: number; // TypeORM la incrementa en cada save()
}

// El cliente envía la versión que vio (ej. en If-Match / ETag, o en el body)
async actualizar(id: number, dto: ActualizarProductoDto & { version: number }) {
  const res = await this.repo.update({ id, version: dto.version }, { nombre: dto.nombre, version: dto.version + 1 });
  if (res.affected === 0) throw new ConflictException('El producto fue modificado por otro usuario');
}
```

Optimistic en Prisma (mismo patrón con `updateMany`, que acepta filtros no únicos):

```typescript
const res = await this.prisma.producto.updateMany({
  where: { id, version: dto.version },
  data: { nombre: dto.nombre, version: { increment: 1 } },
});
if (res.count === 0) throw new ConflictException('Conflicto de versión');
```

Pessimistic en TypeORM:

```typescript
await this.dataSource.transaction(async (manager) => {
  const p = await manager.getRepository(Producto)
    .createQueryBuilder('p')
    .setLock('pessimistic_write')         // SELECT ... FOR UPDATE
    .where('p.id = :id', { id })
    .getOneOrFail();
  // B espera aquí hasta que A haga COMMIT; luego lee el stock ya actualizado
  if (p.stock < cantidad) throw new BadRequestException('Sin stock');
  p.stock -= cantidad;
  await manager.save(p);
});
```

En Prisma no hay API de locks: usa `tx.$queryRaw\`SELECT ... FOR UPDATE\`` dentro de una transacción interactiva.

> ⚠️ **Deadlocks**: si A bloquea producto 1 y luego 2, y B bloquea 2 y luego 1, se bloquean mutuamente; Postgres aborta una con error `40P01`. Mitigación: bloquear siempre **en el mismo orden** (ordena los items por `productoId`) y reintentar ante `40P01` / `40001` con backoff.

---

## 5. Paginación

### 5.1 DTO de entrada común

```typescript
// src/common/dto/paginacion.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginacionQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) // límite duro: protege la BD
  limit: number = 20;

  @IsOptional() @IsString()
  cursor?: string;
}

export interface Pagina<T> {
  items: T[];
  meta: { page?: number; limit: number; total?: number; siguienteCursor?: string | null };
}
```

### 5.2 Offset vs keyset (cursor)

```
OFFSET 100000 LIMIT 20                        WHERE (created_at, id) < ($1, $2) ORDER BY ... LIMIT 20
┌──────────────────────────────┬──┐           ┌──┐
│ lee y DESCARTA 100 000 filas │20│           │20│ ← salta directo por índice
└──────────────────────────────┴──┘           └──┘
```

| | Offset (`skip/take`) | Keyset / cursor |
|---|---|---|
| Ir a la página N | ✅ | ❌ (solo siguiente/anterior) |
| Costo en páginas profundas | O(offset + limit) | O(log n + limit) |
| Inserciones durante la navegación | Duplica / salta elementos | Estable |
| Total de elementos | `COUNT(*)` (caro en tablas grandes) | Normalmente no se da |
| Uso típico | Backoffice con números de página | Feeds, scroll infinito, APIs públicas, exports |

TypeORM, offset:

```typescript
async listar({ page, limit }: PaginacionQueryDto): Promise<Pagina<Producto>> {
  const [items, total] = await this.repo.findAndCount({
    where: { activo: true },
    order: { createdAt: 'DESC', id: 'DESC' }, // ⚠️ orden DETERMINISTA: desempata por id
    skip: (page - 1) * limit,
    take: limit,
  });
  return { items, meta: { page, limit, total } };
}
```

TypeORM, keyset con cursor opaco (base64 de `createdAt|id`):

```typescript
async listarCursor({ cursor, limit }: PaginacionQueryDto): Promise<Pagina<Producto>> {
  const qb = this.repo.createQueryBuilder('p')
    .where('p.activo = true')
    .orderBy('p.createdAt', 'DESC')
    .addOrderBy('p.id', 'DESC')
    .take(limit + 1); // pedimos uno más para saber si hay siguiente página

  if (cursor) {
    const [fecha, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    // Comparación de tuplas (Postgres): usa el índice compuesto (created_at DESC, id DESC)
    qb.andWhere('(p.createdAt, p.id) < (:fecha, :id)', { fecha: new Date(fecha), id: Number(id) });
  }

  const filas = await qb.getMany();
  const hayMas = filas.length > limit;
  const items = hayMas ? filas.slice(0, limit) : filas;
  const ultimo = items.at(-1);
  const siguienteCursor = hayMas && ultimo
    ? Buffer.from(`${ultimo.createdAt.toISOString()}|${ultimo.id}`).toString('base64url')
    : null;
  return { items, meta: { limit, siguienteCursor } };
}
```

Prisma trae cursor nativo (sobre un campo único):

```typescript
const filas = await this.prisma.producto.findMany({
  take: limit + 1,
  ...(cursor && { cursor: { id: Number(cursor) }, skip: 1 }), // skip: 1 salta el propio cursor
  where: { activo: true },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
});
```

> ⚠️ Ordenar por una columna no única (`createdAt`) sin desempate produce páginas inconsistentes: dos filas con la misma fecha pueden aparecer en ambas páginas o en ninguna. Siempre agrega `id` como segundo criterio, y ten un índice compuesto que coincida.

> 💡 Si el `COUNT(*)` es caro, alternativas: devolver `hayMas` en vez de total, estimaciones (`pg_class.reltuples`), o cachear el total unos minutos (Sesión 25).

---

## 6. El problema N+1

**N+1** = 1 query para traer N elementos + N queries para traer una relación de cada uno.

```typescript
// ❌ N+1 con TypeORM: 1 query de órdenes + 1 por cada orden
const ordenes = await this.ordenRepo.find({ take: 50 });
for (const o of ordenes) {
  o.cliente = await this.usuarioRepo.findOneBy({ id: o.clienteId }); // 50 queries más
}
// Total: 51 queries. Con 20 ms de latencia a la BD → ~1 s solo en red.
```

Por qué es tan dañino: cada query tiene un costo fijo de **ida y vuelta de red** (round-trip) mucho mayor que el costo de leer unas filas más. 51 queries pequeñas son muchísimo peores que 1 o 2 queries medianas.

### 6.1 Soluciones por ORM

```typescript
// TypeORM: JOIN en una sola query
const ordenes = await this.ordenRepo.find({
  relations: { cliente: true, items: { producto: true } },
  take: 50,
});
// o con QueryBuilder, seleccionando solo lo necesario
this.ordenRepo.createQueryBuilder('o')
  .leftJoin('o.cliente', 'c')
  .addSelect(['c.id', 'c.nombre'])
  .take(50)
  .getMany();

// Prisma: include/select (por defecto Prisma hace 1 query por nivel de relación con IN, no N)
const ordenes = await this.prisma.orden.findMany({
  take: 50,
  include: { cliente: { select: { id: true, nombre: true } }, items: true },
});

// Mongoose: populate (2 queries con $in, Sesión 16)
await this.ordenModel.find().limit(50).populate('clienteId', 'nombre').lean();

// Carga manual en lote: 2 queries, válido en cualquier ORM
const ordenes = await this.ordenRepo.find({ take: 50 });
const ids = [...new Set(ordenes.map((o) => o.clienteId))];
const clientes = await this.usuarioRepo.findBy({ id: In(ids) });
const porId = new Map(clientes.map((c) => [c.id, c]));
ordenes.forEach((o) => (o.cliente = porId.get(o.clienteId)!));
```

| Enfoque | Queries | Riesgo |
|---|---|---|
| Bucle con `findOne` | N+1 | Latencia lineal con N |
| JOIN (`relations`, `leftJoinAndSelect`) | 1 | **Explosión cartesiana** con varias relaciones 1-N |
| Carga por lotes con `IN` (Prisma include, populate, manual) | 1 por relación | Listas `IN` enormes |
| **DataLoader** | 1 por relación y por tick | Solo tiene sentido con resolvers independientes (GraphQL, **Sesión 28**) |

> ⚠️ **Explosión cartesiana**: `JOIN` de orden con 10 items y 5 pagos devuelve 10 × 5 = 50 filas por orden, que el ORM luego deduplica en memoria. Con varias colecciones 1-N, a veces es mejor 2–3 queries separadas con `IN` que un JOIN gigante. Además, `take` con JOIN de colecciones obliga a TypeORM a hacer una subquery de ids para paginar correctamente.

> ⚠️ **Relaciones lazy de TypeORM** (`Promise<T>` en la entidad) esconden el N+1: cada `await orden.cliente` en un bucle es una query. Y la **serialización** puede dispararlas sin que lo veas. Evítalas en APIs.

### 6.2 Detectarlo

- Activa el log de queries en desarrollo: `logging: ['query']` (TypeORM), `log: ['query']` en `new PrismaClient()`, `mongoose.set('debug', true)`.
- Cuenta queries por request en tests de integración (un test que falle si un endpoint supera X queries).
- En producción: APM / OpenTelemetry con spans por query (Sesión 32) muestra la "escalera" de queries repetidas.

> ❓ **Entrevista**: *"Tu endpoint de listado tarda 2 s y la query principal tarda 10 ms. ¿Qué miras?"* → Casi seguro N+1: activo el log de queries o miro las trazas y cuento cuántas queries hace la request. Si veo el mismo `SELECT ... WHERE id = $1` repetido N veces, lo reemplazo por un JOIN o una carga por lotes con `IN`.

---

## 7. Patrón repository

### 7.1 El porqué

Un **repositorio** es una abstracción con semántica de colección de agregados (`buscarPorId`, `guardar`, `buscarActivos`) que **oculta cómo** se persisten. Beneficios:

1. El dominio/servicio no depende del ORM (puedes cambiar TypeORM por Prisma tocando una clase).
2. Los tests unitarios usan un repositorio **en memoria**, sin mocks frágiles del ORM.
3. Las queries complejas tienen un solo hogar con nombre de negocio.

### 7.2 Implementación idiomática en Nest

En TypeScript las interfaces **no existen en runtime**, así que no sirven como token de DI. Opciones: un `Symbol`/string con `@Inject(TOKEN)`, o una **clase abstracta**, que sí existe en runtime y funciona como token y como tipo a la vez (Sesión 23 profundiza custom providers).

```typescript
// src/productos/domain/productos.repository.ts
export abstract class ProductosRepository {
  abstract buscarPorId(id: number): Promise<Producto | null>;
  abstract buscarActivos(p: PaginacionQueryDto): Promise<Pagina<Producto>>;
  abstract guardar(producto: Producto): Promise<Producto>;
  abstract descontarStock(id: number, cantidad: number): Promise<boolean>;
}

// src/productos/infra/prisma-productos.repository.ts
@Injectable()
export class PrismaProductosRepository extends ProductosRepository {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) { super(); }

  buscarPorId(id: number) {
    return this.txHost.tx.producto.findUnique({ where: { id } });
  }
  async descontarStock(id: number, cantidad: number) {
    const r = await this.txHost.tx.producto.updateMany({
      where: { id, stock: { gte: cantidad } }, data: { stock: { decrement: cantidad } },
    });
    return r.count === 1;
  }
  // ... resto
}

// test/in-memory-productos.repository.ts — para unit tests (Sesión 22)
export class InMemoryProductosRepository extends ProductosRepository {
  private datos = new Map<number, Producto>();
  async buscarPorId(id: number) { return this.datos.get(id) ?? null; }
  async descontarStock(id: number, cantidad: number) {
    const p = this.datos.get(id);
    if (!p || p.stock < cantidad) return false;
    p.stock -= cantidad;
    return true;
  }
  // ...
}

// productos.module.ts — la abstracción es el token; la implementación se elige aquí
@Module({
  providers: [
    ProductosService,
    { provide: ProductosRepository, useClass: PrismaProductosRepository },
  ],
})
export class ProductosModule {}

// productos.service.ts — depende de la abstracción
@Injectable()
export class ProductosService {
  constructor(private readonly repo: ProductosRepository) {} // sin @Inject: la clase abstracta es el token
}
```

### 7.3 ¿Siempre? El debate honesto

| A favor | En contra |
|---|---|
| Aísla el dominio (clave en hexagonal/DDD, **Sesión 30**) | TypeORM `Repository<T>` y Prisma ya son abstracciones |
| Tests unitarios rápidos y legibles | Duplica métodos 1:1 ("repositorio pasamanos") |
| Queries con nombre de negocio | Pierdes features del ORM si la interfaz es mínima |
| Cambiar de ORM es posible | En la práctica casi nunca se cambia de ORM |

Regla práctica: en un CRUD simple, inyectar el `Repository<T>` de TypeORM o el `PrismaService` directamente en el servicio es aceptable. Cuando hay **lógica de dominio real**, varios orígenes de datos o necesitas tests unitarios sin base, introduce el repositorio propio.

> ⚠️ Un repositorio que devuelve `QueryBuilder` o tipos de Prisma (`Prisma.ProductoWhereInput`) en su interfaz **no abstrae nada**: la dependencia del ORM se filtra a los consumidores.

---

## 8. Otros temas de producción

### 8.1 Soft delete y auditoría

```typescript
// TypeORM: soft delete nativo
@DeleteDateColumn() eliminadoEn?: Date;   // repo.softDelete(id); find() excluye los eliminados
// repo.restore(id); find({ withDeleted: true }) para incluirlos

// Prisma: con client extensions (Prisma ≥ 4.16) puedes interceptar operaciones
const prismaSoft = prisma.$extends({
  query: {
    producto: {
      async findMany({ args, query }) {
        args.where = { ...args.where, eliminadoEn: null }; // filtra siempre
        return query(args);
      },
    },
  },
});
```

> ⚠️ Soft delete + índice único: `email` único impide recrear un usuario "borrado". Solución: índice único **parcial** (`WHERE eliminado_en IS NULL`).

### 8.2 Pool de conexiones

Cada instancia de la app mantiene un pool. **Conexiones totales = réplicas × tamaño del pool**. Con 20 contenedores × 10 conexiones = 200, y Postgres por defecto admite `max_connections = 100`.

| Herramienta | Config del pool |
|---|---|
| TypeORM (pg) | `extra: { max: 10, idleTimeoutMillis: 30000 }` |
| Prisma | `?connection_limit=10&pool_timeout=10` en la URL |
| Mongoose | `maxPoolSize: 10` |

En serverless (Lambda, Sesión 34) o con muchas réplicas usa un **pooler** (PgBouncer, RDS Proxy, Prisma Accelerate).

### 8.3 Lista de chequeo de rendimiento

- `SELECT` solo las columnas necesarias (`select`, proyecciones).
- Índices según las queries reales; verifica con `EXPLAIN ANALYZE`.
- `statement_timeout` en Postgres para que una query rota no acapare la BD.
- Réplicas de lectura para reportes (TypeORM tiene la opción `replication: { master, slaves }`).
- Operaciones masivas con `insert`/`createMany`/`bulkWrite`, no bucles de `save()`.

### 8.4 Comparativa de los tres en producción

| Tema | TypeORM | Prisma | Mongoose |
|---|---|---|---|
| Migraciones | CLI `migration:generate/run/revert` | `migrate dev` / `migrate deploy` | Externas (`migrate-mongo`) |
| Transacción | `dataSource.transaction(manager => …)` | `$transaction([...])` / `$transaction(tx => …)` | `session.withTransaction()` |
| Optimistic lock | `@VersionColumn` | Manual con `updateMany` + versión | `optimisticConcurrency: true` en el schema |
| Pessimistic lock | `setLock('pessimistic_write')` | `$queryRaw` + `FOR UPDATE` | No aplica (usa updates atómicos) |
| Cursor | QueryBuilder manual | `cursor` + `skip: 1` nativo | Manual por `_id` |
| Evitar N+1 | `relations` / joins | `include` / `select` | `populate` |

---

## Resumen mental de la sesión

```
MIGRACIONES
  synchronize / db push → SOLO prototipos (renombrar = DROP + ADD = datos perdidos)
  TypeORM: DataSource aparte + migration:generate → REVISAR SQL → migration:run
  Prisma:  migrate dev (local) | migrate deploy (CI/prod) | --create-only para editar
  Mongo:   migrate-mongo (datos + índices)
  Zero downtime: EXPAND (añadir, escribir en ambas) → backfill por lotes → CONTRACT (borrar)
  Correr migraciones en un paso del pipeline, no en cada réplica

TRANSACCIONES
  TypeORM dataSource.transaction(m => …) usa `m`  | QueryRunner: release() SIEMPRE
  Prisma  $transaction([...]) | $transaction(async tx => …, { isolationLevel, timeout }) usa `tx`
  Mongo   withTransaction + { session } en cada op
  Propagar: nestjs-cls + @Transactional() + TransactionHost (AsyncLocalStorage)
  Límite de la transacción = caso de uso (servicio); nada de HTTP externo dentro

CONCURRENCIA
  1º update atómico condicional (WHERE stock >= n) → revisar filas afectadas
  optimistic (version → 409)  |  pessimistic (FOR UPDATE)  | deadlock: mismo orden + retry

PAGINACIÓN
  offset: saltos a página N, O(offset), inestable | keyset: (createdAt,id) < cursor, O(log n), estable
  limit máximo en el DTO; orden determinista (desempate por id)

N+1 = 1 + N round-trips → relations/include/populate/IN por lotes; DataLoader en GraphQL
  Cuidado: explosión cartesiana, relaciones lazy, serialización
REPOSITORY: clase abstracta como token; útil con dominio real/tests; no filtrar tipos del ORM
POOL: réplicas × pool ≤ max_connections → PgBouncer / RDS Proxy
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Por qué `synchronize: true` es peligroso en producción? ¿Qué pasa al renombrar una propiedad?
2. ❓ ¿Diferencia entre `prisma migrate dev`, `migrate deploy` y `db push`?
3. ❓ Explica el patrón expand/contract con el ejemplo de renombrar una columna.
4. ❓ ¿Correrías las migraciones al arrancar cada réplica? ¿Por qué?
5. ❓ ¿Qué nivel de aislamiento usa Postgres por defecto y qué anomalías permite?
6. ❓ En una transacción de TypeORM o Prisma, ¿cuál es el error más común que deja una operación fuera de la transacción?
7. ❓ ¿Cómo propagas una transacción entre varios servicios sin pasar `tx` como parámetro?
8. ❓ Dos usuarios compran la última unidad a la vez. ¿Cómo lo evitas? Compara update atómico, optimistic y pessimistic locking.
9. ❓ Offset vs keyset: ventajas, desventajas y por qué necesitas un desempate en el orden.
10. ❓ ¿Qué es el problema N+1, cómo lo detectas y cómo lo resuelves en cada ORM?
11. ❓ ¿Qué es la explosión cartesiana y cuándo prefieres varias queries a un JOIN?
12. ❓ ¿Por qué usarías una clase abstracta como token de DI para un repositorio? ¿Cuándo NO crearías un repositorio propio?

## Ejercicio práctico
1. En la versión TypeORM de TiendaApi, desactiva `synchronize`, crea `data-source.ts` y los scripts `migration:*`. Genera la migración inicial y aplícala en una base limpia.
2. Agrega la columna `sku` con una migración de tres pasos (nullable → backfill → `NOT NULL` + índice único). Prueba `migration:revert`.
3. En la versión Prisma, usa `migrate dev --create-only`, edita el SQL para incluir un backfill y aplícalo con `migrate deploy`.
4. Implementa `POST /ordenes` con transacción que descuente stock con update atómico condicional. Escribe un script que lance 20 requests concurrentes por el último item en stock y verifica que solo 1 obtiene `201`.
5. Agrega `@VersionColumn` a `Producto` y haz que `PATCH /productos/:id` devuelva `409` si la versión enviada no coincide.
6. Integra `nestjs-cls` + `@nestjs-cls/transactional`, mueve `descontarStock` a `ProductosService` y marca `OrdenesService.crear` con `@Transactional()`. Verifica que un error en la auditoría revierte el stock.
7. Implementa `GET /productos` con paginación offset y `GET /productos/feed` con keyset y cursor opaco en base64url. Crea el índice `(created_at DESC, id DESC)` y compara `EXPLAIN ANALYZE` de la página 5 000 en ambos.
8. Activa el log de queries, crea a propósito un endpoint con N+1 (`GET /ordenes` con cliente) y cuenta las queries. Corrígelo con `relations` y luego con carga por lotes `In(ids)`; compara.
9. Extrae `ProductosRepository` como clase abstracta con implementación Prisma y otra en memoria; escribe un unit test de `OrdenesService` usando la de memoria.

---

➡️ **Cuando termines**, marca la Sesión 17 en el [README](README.md) y pasa a la **Sesión 18 — Autenticación: Passport, JWT, access/refresh tokens, hashing**.
