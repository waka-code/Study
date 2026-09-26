# Sesión 14 — TypeORM: entidades, relaciones, repositorios, QueryBuilder

> **Objetivo de la sesión**: llevar TiendaApi de la memoria a **PostgreSQL** con TypeORM 0.3 y `@nestjs/typeorm`. Al terminar deberías poder explicar qué es un ORM y qué patrón usa TypeORM (Data Mapper vs Active Record), configurar `TypeOrmModule.forRootAsync` con `ConfigService`, modelar entidades con columnas, índices y relaciones (`ManyToOne`, `OneToMany`, `ManyToMany`), usar la API de `Repository` (find options, `save` vs `insert`/`update`, `preload`, soft delete), escribir consultas con **QueryBuilder** sin abrir la puerta a SQL injection, y reconocer las trampas clásicas: `synchronize`, `numeric` como string, `where` con `undefined`, `eager` y paginación con joins. Migraciones y transacciones a fondo quedan para la **Sesión 17**.

---

## 1. ¿Qué es un ORM y por qué TypeORM?

Un **ORM** (*Object-Relational Mapper*) traduce entre **filas** de tablas y **objetos** del lenguaje. Te ahorra escribir SQL repetitivo (CRUD, joins simples, mapeo de columnas) y te da tipado. A cambio agrega una **abstracción** que, si no entiendes, genera consultas lentas o incorrectas.

```
 ProductosService ──▶ Repository<Producto> ──▶ EntityManager ──▶ QueryRunner ──▶ Driver (pg) ──▶ PostgreSQL
                         (API tipada)          (unit of work)     (una conexión)   (pool de conexiones)
                                 ▲
                            DataSource  ← la "conexión" configurada (en 0.2 se llamaba Connection)
```

| Pieza TypeORM 0.3 | Rol |
|---|---|
| `DataSource` | Configuración + pool de conexiones + metadata de entidades. Reemplaza a `Connection`/`getConnection()` de 0.2 (eliminados). |
| `EntityManager` | Operaciones sobre **cualquier** entidad (`manager.save(Producto, ...)`). |
| `Repository<T>` | Operaciones sobre **una** entidad. Lo que inyectarás en los servicios. |
| `QueryRunner` | Una conexión concreta del pool: transacciones manuales, DDL en migraciones. |
| `SelectQueryBuilder` | Constructor fluido de SQL para lo que las find options no cubren. |

### 1.1 Data Mapper vs Active Record

TypeORM soporta ambos:

```ts
// Active Record: la entidad sabe persistirse (extiende BaseEntity)
const p = Producto.create({ nombre: 'Taza' });
await p.save();

// Data Mapper: la entidad es un objeto "tonto"; un repositorio la persiste
const p = repo.create({ nombre: 'Taza' });
await repo.save(p);
```

En Nest se usa **Data Mapper**: encaja con la DI (inyectas `Repository<Producto>`), se mockea fácil en tests (Sesión 22) y mantiene las entidades libres de dependencias de infraestructura.

> ❓ **Entrevista**: *"¿TypeORM, Prisma o SQL a mano?"* → TypeORM: decoradores sobre clases, encaja con el estilo de Nest, Data Mapper, QueryBuilder potente, pero tipado de consultas más débil (relaciones y `select` no cambian el tipo de retorno). Prisma (Sesión 15): schema propio, cliente generado con tipado muy fuerte, gran DX, menos flexible para SQL complejo. SQL a mano / query builders (Kysely, Knex): control total, más código. Ningún ORM te exime de **saber SQL** y leer los planes de ejecución.

---

## 2. Instalación y configuración

```bash
npm i @nestjs/typeorm typeorm pg
# Base local rápida
docker run -d --name tienda-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tienda -p 5432:5432 postgres:17
```

```bash
# .env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tienda
DB_LOGGING=true
```

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosModule } from './productos/productos.module';
import { CategoriasModule } from './categorias/categorias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // forRootAsync: esperamos a que ConfigService exista (Sesión 7)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,   // registra las entidades de cada forFeature()
        synchronize: false,       // ⚠️ NUNCA true fuera de un prototipo (ver 2.1)
        logging: config.get('DB_LOGGING') === 'true' ? ['query', 'error'] : ['error'],
        maxQueryExecutionTime: 500,   // loguea queries que tarden más de 500 ms
        extra: { max: 10 },           // tamaño del pool de pg
      }),
    }),
    ProductosModule,
    CategoriasModule,
  ],
})
export class AppModule {}
```

```ts
// src/productos/productos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './entities/producto.entity';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Producto])],   // crea el provider Repository<Producto>
  providers: [ProductosService],
  controllers: [ProductosController],
  exports: [TypeOrmModule],   // opcional: otros módulos que importen este podrán inyectar el repo
})
export class ProductosModule {}
```

| Opción | Qué hace | Recomendación |
|---|---|---|
| `autoLoadEntities` | Toma las entidades de todos los `forFeature()` | ✅ En apps Nest |
| `entities: ['dist/**/*.entity.js']` | Globs de archivos | ⚠️ Frágil: `.ts` vs `.js`, rutas de `dist`, monorepos |
| `synchronize` | Altera el esquema para que calce con las entidades al arrancar | ❌ En producción |
| `migrationsRun` | Ejecuta migraciones pendientes al arrancar | Mejor como paso explícito del deploy (Sesión 34) |
| `retryAttempts` / `retryDelay` | Reintentos de conexión de `@nestjs/typeorm` al arrancar | Útil en Docker Compose |

### 2.1 Por qué `synchronize: true` es peligroso

`synchronize` compara entidades con la base y ejecuta DDL **sin preguntar**. Si renombras la propiedad `precio` a `precioUnitario`, TypeORM no sabe que es un rename: **borra la columna `precio`** (con sus datos) y crea una nueva vacía.

> ⚠️ `synchronize: true` + un rename en producción = pérdida de datos. Úsalo solo en prototipos o tests desechables. El camino real son las **migraciones** (sección 9 y Sesión 17).

---

## 3. Entidades: columnas

```ts
// src/productos/entities/producto.entity.ts
import {
  Check, Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn,
  ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Etiqueta } from './etiqueta.entity';
import { DecimalTransformer } from '../../common/db/decimal.transformer';

@Entity({ name: 'productos' })
@Index(['categoriaId', 'precio'])                 // índice compuesto para "por categoría, ordenado por precio"
@Check(`"precio" >= 0`)                            // la BD también protege la regla
export class Producto {
  @PrimaryGeneratedColumn()                        // SERIAL/IDENTITY; 'uuid' para UUID
  id: number;

  @Index({ unique: true })
  @Column({ length: 120 })                         // varchar(120) NOT NULL
  sku: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: new DecimalTransformer() })
  precio: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })   // default como expresión SQL
  atributos: Record<string, string>;               // { color: 'rojo', talla: 'M' }

  // FK explícita: permite asignar la categoría sin cargar la entidad
  @Column({ name: 'categoria_id', nullable: true })
  categoriaId: number | null;

  @ManyToOne(() => Categoria, (c) => c.productos, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria | null;

  @ManyToMany(() => Etiqueta, (e) => e.productos)
  etiquetas: Etiqueta[];

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'eliminado_en' })   // habilita soft delete
  eliminadoEn: Date | null;

  @VersionColumn()                                  // se incrementa en cada save (bloqueo optimista)
  version: number;
}
```

> ⚠️ Con `strict: true` en TypeScript, las propiedades de entidad sin inicializar dan error `TS2564`. Las plantillas de Nest traen `strictPropertyInitialization: false`; si lo activas, usa `id!: number`.

### 3.1 La trampa de `numeric` y `bigint`

El driver `pg` devuelve `numeric` y `bigint` como **string** (porque no caben con precisión en un `number` de JS). Sin transformer, `producto.precio` es `"4990.00"` y `producto.precio + 10` da `"4990.0010"`.

```ts
// src/common/db/decimal.transformer.ts
import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(valor?: number | null): number | null | undefined {
    return valor;                                     // JS → BD: pg acepta number
  }
  from(valor?: string | null): number | null {
    return valor == null ? null : Number.parseFloat(valor);   // BD → JS
  }
}
```

> ⚠️ Convertir a `number` pierde precisión con montos grandes o muchos decimales (`0.1 + 0.2`). Para dinero: guarda **enteros en la unidad mínima** (centavos; en CLP el peso ya es entero) o usa una librería decimal (`decimal.js`) en el transformer. Decide esto antes de tener datos.

### 3.2 Nombres de columnas

TypeORM usa el nombre de la propiedad tal cual (`creadoEn` → columna `"creadoEn"`, con comillas en Postgres). Opciones: `name:` explícito en cada columna (como arriba) o una `namingStrategy` global. El paquete comunitario `typeorm-naming-strategies` trae `SnakeNamingStrategy` y se pasa como `namingStrategy: new SnakeNamingStrategy()` en la config.

---

## 4. Relaciones

```ts
// src/categorias/entities/categoria.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

@Entity({ name: 'categorias' })
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  nombre: string;

  // Lado inverso: NO crea columna; la FK vive en productos.categoria_id
  @OneToMany(() => Producto, (p) => p.categoria)
  productos: Producto[];
}
```

```ts
// src/productos/entities/etiqueta.entity.ts
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';

@Entity({ name: 'etiquetas' })
export class Etiqueta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40, unique: true })
  nombre: string;

  @ManyToMany(() => Producto, (p) => p.etiquetas)
  @JoinTable({                               // @JoinTable va en UNO de los dos lados (el "dueño")
    name: 'productos_etiquetas',
    joinColumn: { name: 'etiqueta_id' },
    inverseJoinColumn: { name: 'producto_id' },
  })
  productos: Producto[];
}
```

Órdenes con ítems (relación con datos propios → entidad intermedia explícita, no `ManyToMany`):

```ts
// src/ordenes/entities/orden.entity.ts
@Entity({ name: 'ordenes' })
export class Orden {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'enum', enum: ['pendiente', 'pagada', 'enviada', 'cancelada'], default: 'pendiente' })
  estado: 'pendiente' | 'pagada' | 'enviada' | 'cancelada';

  // cascade insert: al guardar la orden se insertan sus ítems nuevos
  @OneToMany(() => OrdenItem, (i) => i.orden, { cascade: ['insert'] })
  items: OrdenItem[];

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;
}

@Entity({ name: 'orden_items' })
export class OrdenItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Orden, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orden_id' })
  orden: Orden;

  @Column({ name: 'producto_id' })
  productoId: number;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  // Precio "congelado" al momento de la compra: el del producto puede cambiar
  @Column({ name: 'precio_unitario', type: 'numeric', precision: 12, scale: 2, transformer: new DecimalTransformer() })
  precioUnitario: number;
}
```

| Relación | Decoradores | ¿Dónde vive la FK? |
|---|---|---|
| N:1 | `@ManyToOne` (+ `@JoinColumn` opcional) | En esta tabla |
| 1:N | `@OneToMany` (requiere el `@ManyToOne` del otro lado) | En la otra tabla |
| 1:1 | `@OneToOne` + `@JoinColumn` en el dueño | En el lado con `@JoinColumn` |
| N:M | `@ManyToMany` + `@JoinTable` en el dueño | Tabla intermedia |

> 💡 Las funciones flecha `() => Categoria` existen para resolver **imports circulares**: `Producto` importa `Categoria` y viceversa; al evaluar el decorador la clase podría ser `undefined`, así que TypeORM la pide de forma perezosa.

> ⚠️ `cascade: true` (todas las operaciones) es cómodo y peligroso: un `save` de la orden con un ítem modificado lo actualiza en silencio, y con `remove` podrías borrar lo que no querías. Sé explícito: `cascade: ['insert']`.

### 4.1 Cargar relaciones: `relations`, `eager`, `lazy`

```ts
// Explícito (recomendado): cargas lo que necesitas en cada consulta
await repo.find({ relations: { categoria: true, etiquetas: true } });
```

| Estrategia | Cómo | Problema |
|---|---|---|
| Explícita | `relations: {...}` o `leftJoinAndSelect` | Ninguno; tú decides |
| `eager: true` en la relación | Se carga **siempre** con `find*` | Sobrecarga en todas las consultas; **no** aplica a QueryBuilder |
| `lazy` (`categoria: Promise<Categoria>`) | Se carga al hacer `await producto.categoria` | Queries ocultas, **N+1** garantizado en loops |

> ❓ **Entrevista**: *"¿Qué es el problema N+1?"* → Hacer 1 query para una lista de N elementos y luego 1 query **por cada** elemento para su relación (N queries más). Con lazy relations dentro de un `for` o serializando entidades es trivial caer en él. Se resuelve con joins (`relations`), cargando en lote (`WHERE id IN (...)`) o con DataLoader (Sesión 28). A fondo en la Sesión 17.

---

## 5. El Repository en el servicio

```ts
// src/productos/productos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  async crear(dto: CrearProductoDto): Promise<Producto> {
    // create() solo instancia (no toca la BD); save() hace el INSERT y devuelve id, fechas, version
    const producto = this.repo.create(dto);
    return this.repo.save(producto);
  }

  async obtener(id: number): Promise<Producto> {
    const producto = await this.repo.findOne({
      where: { id },
      relations: { categoria: true },
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no existe`);
    return producto;
  }

  async buscar(texto: string, categoriaIds?: number[]) {
    return this.repo.find({
      where: {
        nombre: ILike(`%${texto}%`),                       // parametrizado: seguro
        activo: true,
        ...(categoriaIds?.length ? { categoriaId: In(categoriaIds) } : {}),
      },
      select: { id: true, nombre: true, precio: true },   // solo lo necesario
      order: { precio: 'ASC' },
      take: 20,
    });
  }

  async actualizar(id: number, dto: ActualizarProductoDto): Promise<Producto> {
    // preload: busca por id y mezcla los cambios; undefined si no existe
    const producto = await this.repo.preload({ id, ...dto });
    if (!producto) throw new NotFoundException(`Producto ${id} no existe`);
    return this.repo.save(producto);
  }

  async eliminar(id: number): Promise<void> {
    const { affected } = await this.repo.softDelete(id);   // UPDATE eliminado_en = now()
    if (!affected) throw new NotFoundException(`Producto ${id} no existe`);
  }
}
```

### 5.1 Métodos más usados (TypeORM 0.3)

| Método | SQL aproximado | Notas |
|---|---|---|
| `find(opts)` / `findBy(where)` | `SELECT` | Lista |
| `findOne(opts)` / `findOneBy(where)` | `SELECT ... LIMIT 1` | `null` si no hay |
| `findOneOrFail` / `findOneByOrFail` | idem | Lanza `EntityNotFoundError` |
| `findAndCount(opts)` | `SELECT` + `COUNT` | Paginación con total |
| `exists(opts)` / `existsBy(where)` | `SELECT 1 ... LIMIT 1` | Más barato que traer la fila |
| `count` / `sum` / `average` / `minimum` / `maximum` | agregados | `sum('precio', where)` |
| `save(entidad \| entidades)` | `SELECT` + `INSERT`/`UPDATE` | Corre listeners y cascadas; devuelve la entidad |
| `insert(parcial)` | `INSERT` | Directo, sin cascadas ni listeners de entidad |
| `update(criterio, parcial)` | `UPDATE ... WHERE` | Directo; no carga la entidad; no corre `@BeforeUpdate` |
| `upsert(parcial, ['sku'])` | `INSERT ... ON CONFLICT` | Requiere índice único |
| `delete(criterio)` / `remove(entidad)` | `DELETE` | `remove` corre listeners |
| `softDelete` / `restore` / `softRemove` | `UPDATE eliminado_en` | Requiere `@DeleteDateColumn` |
| `increment/decrement(where, 'stock', n)` | `UPDATE stock = stock ± n` | Atómico en SQL |

> ❓ **Entrevista**: *"¿`save` o `update`?"* → `save` es cómodo (detecta si insertar o actualizar, corre listeners, cascadas, `@VersionColumn`), pero hace un `SELECT` previo y actualiza la entidad completa en memoria. `update` es un único `UPDATE` directo: más rápido y sin carreras en campos que no tocas, pero sin hooks ni cascadas. Para operaciones masivas o contadores, `update`/`increment`; para agregados de dominio con relaciones, `save`.

### 5.2 Find options y operadores

```ts
import { Between, In, IsNull, LessThan, Like, MoreThanOrEqual, Not, Raw } from 'typeorm';

await repo.find({
  where: [
    // Array = OR entre objetos; dentro de cada objeto = AND
    { precio: Between(1000, 5000), stock: MoreThanOrEqual(1) },
    { etiquetas: { nombre: In(['oferta', 'liquidación']) } },   // filtrar por relación
  ],
  relations: { etiquetas: true },
  order: { creadoEn: 'DESC', id: 'DESC' },
  skip: 40,
  take: 20,
  withDeleted: false,   // por defecto excluye soft-deleted
});

await repo.findBy({ descripcion: IsNull() });                 // WHERE descripcion IS NULL
await repo.findBy({ categoriaId: Not(IsNull()) });
await repo.findBy({ stock: LessThan(5) });
await repo.findBy({ sku: Like('TAZ-%') });
await repo.findBy({ nombre: Raw((alias) => `lower(${alias}) = :n`, { n: 'taza' }) });
```

> ⚠️ **La trampa más peligrosa de TypeORM 0.3**: en las find options, las propiedades con valor `undefined` (y `null`) **se ignoran**. `repo.findOneBy({ id: undefined })` genera `SELECT ... LIMIT 1` **sin WHERE** y devuelve **el primer producto de la tabla**. Si `id` viene de un parámetro mal parseado o de un token sin `sub`, puedes devolver (o modificar) el registro de otro. Valida siempre antes (`ParseIntPipe`, DTOs) y usa `IsNull()` cuando quieras de verdad `IS NULL`.

---

## 6. QueryBuilder: cuando las find options no alcanzan

Agregados, subconsultas, `GROUP BY`, condiciones complejas, bloqueos o SQL específico de Postgres.

```ts
// Listado con filtros opcionales y total
async listar(f: { texto?: string; min?: number; max?: number; categoriaId?: number; page: number; limit: number }) {
  const qb = this.repo
    .createQueryBuilder('p')                               // alias de la tabla productos
    .leftJoinAndSelect('p.categoria', 'c')                 // JOIN + trae columnas de categoría
    .where('p.activo = :activo', { activo: true });

  if (f.texto) qb.andWhere('p.nombre ILIKE :texto', { texto: `%${f.texto}%` });
  if (f.min != null) qb.andWhere('p.precio >= :min', { min: f.min });
  if (f.max != null) qb.andWhere('p.precio <= :max', { max: f.max });
  if (f.categoriaId) qb.andWhere('p.categoriaId = :cat', { cat: f.categoriaId });

  const [items, total] = await qb
    .orderBy('p.creadoEn', 'DESC')
    .addOrderBy('p.id', 'DESC')                            // desempate estable para paginar
    .skip((f.page - 1) * f.limit)                          // skip/take: correctos con joins
    .take(f.limit)
    .getManyAndCount();

  return { items, total, page: f.page, limit: f.limit };
}
```

```ts
// Agregado: ventas por categoría (resultado "crudo", no entidades)
async ventasPorCategoria(desde: Date) {
  return this.dataSource
    .createQueryBuilder()
    .select('c.nombre', 'categoria')
    .addSelect('SUM(i.cantidad * i.precio_unitario)', 'total')
    .addSelect('COUNT(DISTINCT o.id)', 'ordenes')
    .from(OrdenItem, 'i')
    .innerJoin('i.orden', 'o')
    .innerJoin('i.producto', 'p')
    .innerJoin('p.categoria', 'c')
    .where('o.estado = :estado', { estado: 'pagada' })
    .andWhere('o.creadoEn >= :desde', { desde })
    .groupBy('c.nombre')
    .orderBy('total', 'DESC')
    .getRawMany<{ categoria: string; total: string; ordenes: string }>();   // ⚠️ agregados vuelven como string
}
```

```ts
// OR agrupado con Brackets: WHERE activo AND (nombre ILIKE x OR sku ILIKE x)
import { Brackets } from 'typeorm';

qb.where('p.activo = true').andWhere(
  new Brackets((b) => {
    b.where('p.nombre ILIKE :q', { q }).orWhere('p.sku ILIKE :q', { q });
  }),
);
```

| Método | Devuelve |
|---|---|
| `getMany()` / `getOne()` | Entidades hidratadas |
| `getManyAndCount()` | `[entidades, total]` |
| `getRawMany()` / `getRawOne()` | Objetos planos con los alias de `select` |
| `getCount()` / `getExists()` | número / boolean |
| `execute()` | Resultado crudo del driver (para `update()`/`delete()`/`insert()` builders) |
| `getSql()` / `getQueryAndParameters()` | El SQL generado (debug) |

| | `skip`/`take` | `offset`/`limit` |
|---|---|---|
| Con joins 1:N | ✅ TypeORM pagina por entidad raíz (subconsulta de ids) | ❌ Pagina **filas** del join: páginas incompletas |
| Sin joins | ✅ | ✅ |

> ⚠️ **SQL injection**: nunca interpoles valores del usuario en el string (`.where(\`p.nombre = '${q}'\`)`). Usa **siempre** parámetros `:nombre`. Y cuidado con lo que **no** se puede parametrizar: nombres de columnas en `orderBy`. Si el cliente elige el orden, usa una **whitelist**:
>
> ```ts
> const ORDEN = { precio: 'p.precio', fecha: 'p.creadoEn', nombre: 'p.nombre' } as const;
> qb.orderBy(ORDEN[dto.ordenarPor] ?? 'p.creadoEn', dto.dir === 'asc' ? 'ASC' : 'DESC');
> ```

> ⚠️ Los nombres de parámetros son **globales** al builder: si usas `:q` dos veces con valores distintos (ej. en un helper reutilizado), el segundo pisa al primero.

---

## 7. `DataSource`, `EntityManager` y transacciones (adelanto)

```ts
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class OrdenesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
  // También puedes inyectar DataSource directamente por tipo: constructor(private ds: DataSource)

  async crear(usuarioId: number, items: { productoId: number; cantidad: number }[]) {
    // Todo o nada: si algo lanza, ROLLBACK automático
    return this.dataSource.transaction(async (manager) => {
      const orden = manager.create(Orden, { usuarioId, items: [] });

      for (const { productoId, cantidad } of items) {
        // Descuento atómico y condicional: evita vender stock inexistente
        const res = await manager
          .createQueryBuilder()
          .update(Producto)
          .set({ stock: () => 'stock - :cantidad' })
          .where('id = :productoId AND stock >= :cantidad', { productoId, cantidad })
          .execute();
        if (res.affected !== 1) throw new ConflictException(`Sin stock para ${productoId}`);

        const producto = await manager.findOneByOrFail(Producto, { id: productoId });
        orden.items.push(manager.create(OrdenItem, { productoId, cantidad, precioUnitario: producto.precio }));
      }

      return manager.save(orden);   // cascade insert guarda los ítems
    });
  }
}
```

> ⚠️ Dentro de la transacción usa **solo** el `manager` que recibe el callback. Si llamas a `this.productosRepo.save(...)` (el repositorio inyectado), esa operación va por **otra conexión** del pool y queda **fuera** de la transacción. Es el bug de transacciones más común con TypeORM.

Niveles de aislamiento, `QueryRunner` manual, bloqueos pesimistas (`setLock('pessimistic_write')`), optimistas con `@VersionColumn` y cómo propagar la transacción entre servicios: **Sesión 17**.

---

## 8. Listeners y subscribers

```ts
@Entity({ name: 'usuarios' })
export class Usuario {
  // ...
  @Column({ unique: true }) email: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalizarEmail() {
    this.email = this.email?.trim().toLowerCase();
  }
}
```

> ⚠️ Los listeners de entidad (`@BeforeInsert`, `@AfterLoad`...) **solo** corren con `save`/`remove`/`find*` sobre entidades, **no** con `update()`, `insert()` ni QueryBuilder. No pongas reglas críticas (hash de contraseñas, auditoría) solo ahí: alguien usará `update()` y se las saltará. El hashing va en el servicio (Sesión 18).

Para lógica transversal existe `EntitySubscriberInterface` (se registra en `subscribers` de la config o como provider que se agrega a `dataSource.subscribers`). Úsalo con moderación: es lógica "invisible".

---

## 9. Migraciones (lo mínimo) y el `data-source.ts`

La CLI de TypeORM no conoce Nest: necesita un `DataSource` exportado en un archivo propio.

```ts
// src/database/data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
```

```jsonc
// package.json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate src/database/migrations/$npm_config_name",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

```bash
npm run migration:generate --name=init   # compara entidades vs BD y escribe el SQL
npm run migration:run
```

> 💡 `migration:generate` **revisa el diff**, no lo escribe perfecto: renames aparecen como DROP + ADD. Lee y edita cada migración antes de commitearla. Estrategias de deploy, migraciones sin downtime y seeds: **Sesión 17**.

---

## 10. Varias bases de datos y testing

```ts
// Segunda conexión con nombre
TypeOrmModule.forRootAsync({ name: 'reportes', useFactory: () => ({ /* réplica de lectura */ }) });
TypeOrmModule.forFeature([VentaDiaria], 'reportes');

// Inyección
constructor(
  @InjectRepository(VentaDiaria, 'reportes') private readonly ventas: Repository<VentaDiaria>,
  @InjectDataSource('reportes') private readonly ds: DataSource,
) {}
```

Test unitario del servicio sin base de datos:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

const repoMock = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), preload: jest.fn(), softDelete: jest.fn() };

const moduleRef = await Test.createTestingModule({
  providers: [
    ProductosService,
    { provide: getRepositoryToken(Producto), useValue: repoMock },   // el token que usa @InjectRepository
  ],
}).compile();

it('lanza 404 si no existe', async () => {
  repoMock.findOne.mockResolvedValue(null);
  await expect(moduleRef.get(ProductosService).obtener(99)).rejects.toThrow(NotFoundException);
});
```

> 💡 Mockear el repositorio prueba la lógica del servicio, **no** tus queries. Las consultas (sobre todo QueryBuilder) se prueban contra un Postgres real, por ejemplo con Testcontainers (Sesión 22).

---

## 11. Errores comunes

> ⚠️ **Devolver entidades directamente al cliente**: expones `version`, `eliminadoEn`, `passwordHash` y relaciones que cargaste por accidente. Mapea a DTOs de respuesta o usa `ClassSerializerInterceptor` con `@Exclude()` (Sesión 21).

> ⚠️ **`relations` en todo "por si acaso"**: cada relación 1:N multiplica filas. Carga lo que el endpoint necesita.

> ⚠️ **Olvidar `forFeature`**: *"Nest can't resolve dependencies of ProductosService (?). Please make sure that the argument ProductoRepository..."*. Cada módulo que inyecta un repositorio necesita `TypeOrmModule.forFeature([Entidad])` (o importar un módulo que lo exporte).

> ⚠️ **Errores de unicidad como 500**: un `INSERT` con `sku` duplicado lanza `QueryFailedError` (código Postgres `23505`). Tradúcelo a `409 Conflict` en un exception filter (Sesión 9) revisando `err.driverError.code`.

> ⚠️ **Confiar en validaciones solo de la app**: `unique`, `CHECK`, `NOT NULL` y FKs en la BD son tu última línea de defensa ante carreras entre requests concurrentes.

---

## Resumen mental de la sesión

```
Stack: Service → Repository<T> → EntityManager → QueryRunner → pg pool → Postgres
TypeORM 0.3: DataSource (no Connection) · Data Mapper en Nest

Config: TypeOrmModule.forRootAsync({ inject:[ConfigService], useFactory }) + autoLoadEntities
        forFeature([Entidad]) en cada módulo · @InjectRepository(Entidad)
        synchronize:false SIEMPRE fuera de prototipos → migraciones (data-source.ts + CLI)

Entidad: @Entity @PrimaryGeneratedColumn @Column @Index @Check
         @Create/Update/DeleteDateColumn @VersionColumn
         numeric/bigint llegan como STRING → transformer o centavos
Relaciones: ManyToOne(+JoinColumn, FK aquí) · OneToMany (inverso) · ManyToMany(+JoinTable) · OneToOne
            FK explícita (categoriaId) · cascade explícito · relations explícitas > eager > lazy (N+1)

Repository: find/findOne(By) · findAndCount · exists · save vs insert/update · preload · upsert
            softDelete/restore · increment · operadores In/ILike/Between/IsNull/Not/Raw
            ⚠️ where { id: undefined } → sin WHERE → primer registro
QueryBuilder: alias · leftJoinAndSelect · :params (nunca interpolar) · Brackets
              getMany/getManyAndCount/getRawMany · skip/take (ok con joins) · orderBy con whitelist
Transacción: dataSource.transaction(manager => ...) — usar SOLO ese manager
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un ORM, qué te da y qué te cuesta? ¿Por qué igual tienes que saber SQL?
2. ❓ Data Mapper vs Active Record: ¿cuál se usa con Nest y por qué?
3. ❓ ¿Qué cambió de `Connection` a `DataSource` en TypeORM 0.3?
4. ❓ ¿Por qué `synchronize: true` es peligroso en producción? Da un ejemplo concreto de pérdida de datos.
5. ❓ ¿Qué hacen `forRootAsync`, `forFeature` y `autoLoadEntities`?
6. ❓ ¿Por qué un `numeric` llega como string y cómo modelarías precios?
7. ❓ En una relación `ManyToOne`/`OneToMany`, ¿dónde vive la FK? ¿Para qué sirve declarar la columna `categoriaId` explícita?
8. ❓ `eager` vs `lazy` vs `relations` explícitas. ¿Qué es el problema N+1?
9. ❓ `save` vs `update` vs `insert`: diferencias en SQL, listeners y cascadas.
10. ❓ ¿Qué pasa con `findOneBy({ id: undefined })` y por qué es un riesgo de seguridad?
11. ❓ ¿Cómo evitas SQL injection en QueryBuilder, incluido el `ORDER BY` elegido por el cliente? ¿Por qué `skip/take` y no `offset/limit` con joins?
12. ❓ Dentro de `dataSource.transaction()`, ¿por qué no puedes usar el repositorio inyectado?

## Ejercicio práctico
1. Levanta Postgres con Docker, instala `@nestjs/typeorm typeorm pg` y configura `TypeOrmModule.forRootAsync` con `DATABASE_URL` validado (Sesión 7).
2. Crea las entidades `Categoria`, `Producto`, `Etiqueta`, `Usuario`, `Orden` y `OrdenItem` con las relaciones de la sección 4 y el `DecimalTransformer`.
3. Crea `data-source.ts`, los scripts de migración y genera la migración `init`. **Léela** entera y ejecútala. Revisa las tablas con `psql` o DBeaver.
4. Reemplaza el `ProductosService` en memoria por uno con `Repository<Producto>`: `crear`, `obtener` (con categoría), `actualizar` con `preload`, `eliminar` con `softDelete`.
5. Implementa `GET /productos` con QueryBuilder: filtros opcionales `q`, `min`, `max`, `categoriaId`, orden por whitelist y paginación con `getManyAndCount`.
6. Activa `logging: ['query']` y compara el SQL de `find({ relations: { categoria: true } })` con el del QueryBuilder.
7. Demuestra la trampa de `undefined`: crea un endpoint de prueba que haga `findOneBy({ id: Number(req.query.id) || undefined })`, llámalo sin `id` y observa qué devuelve. Luego elimínalo.
8. Implementa `OrdenesService.crear` con `dataSource.transaction` y descuento atómico de stock. Prueba dos requests concurrentes que compren el último producto: solo una debe tener éxito.
9. Crea un exception filter que traduzca `QueryFailedError` con código `23505` a `409` (inserta dos productos con el mismo `sku`).
10. Escribe `GET /reportes/ventas-por-categoria` con `getRawMany` y convierte los agregados de string a number en el servicio.
11. Escribe un test unitario de `ProductosService` con `getRepositoryToken(Producto)` mockeado.

---

➡️ **Cuando termines**, marca la Sesión 14 en el [README](README.md) y pasa a la **Sesión 15 — Prisma: schema, cliente, relaciones, integración con Nest**.
