# Sesión 15 — Prisma: schema, cliente, relaciones, integración con Nest

> **Objetivo de la sesión**: construir la capa de datos de TiendaApi con **Prisma** y compararla con TypeORM (Sesión 14). Al terminar deberías poder explicar el modelo de Prisma (schema declarativo → cliente **generado** y tipado), distinguir el **setup clásico** (`prisma-client-js`, `@prisma/client`, URL en el schema, motor en Rust) del **moderno** de Prisma 6.x/7 (generator `prisma-client` con `output` explícito, `prisma.config.ts`, **driver adapters**, cliente sin Rust), integrar un `PrismaService` en Nest con su ciclo de vida, escribir consultas con relaciones (`include`, `select`, escrituras anidadas), transacciones, traducir errores `P2002`/`P2025` a HTTP, y aprovechar los tipos generados (`Prisma.XGetPayload`, `satisfies`).

---

## 1. ¿Qué es Prisma y en qué se diferencia de TypeORM?

Prisma no mapea **tus clases**: tú describes el modelo en un archivo `schema.prisma` y Prisma **genera** un cliente TypeScript a medida. El schema es la única fuente de verdad para tres cosas:

```
                    schema.prisma
                  (modelos, relaciones)
                 ┌───────┴────────┐
                 ▼                ▼
      prisma migrate dev     prisma generate
       (SQL de migración)    (cliente tipado en src/generated/prisma)
                 │                │
                 ▼                ▼
             PostgreSQL ◀──── PrismaClient ◀── PrismaService (Nest) ◀── ProductosService
                         driver adapter (pg)
```

| Aspecto | TypeORM (Sesión 14) | Prisma |
|---|---|---|
| Fuente del modelo | Clases con decoradores | `schema.prisma` (DSL propio) |
| Tipado de consultas | Entidad completa siempre; `select`/`relations` **no** cambian el tipo | El tipo de retorno **depende** de `select`/`include` |
| Objetos devueltos | Instancias de tus clases | Objetos planos (POJOs) |
| Relaciones cargadas por accidente | Posible (`eager`, `lazy`) | No existe lazy loading: pides o no pides |
| SQL complejo | QueryBuilder muy flexible | `$queryRaw` tipado a mano o TypedSQL |
| Migraciones | Generadas desde entidades; revisar a mano | `migrate dev` genera SQL legible; muy buen flujo |
| Encaje con Nest | Módulo oficial `@nestjs/typeorm` | Un `PrismaService` de ~15 líneas (receta oficial en la doc de Nest) |
| Paso de build extra | No | Sí: `prisma generate` |

> ❓ **Entrevista**: *"¿Por qué el tipado de Prisma es 'más fuerte' que el de TypeORM?"* → Porque el cliente se **genera** desde el schema y sus métodos usan tipos condicionales: `findMany({ select: { id: true } })` devuelve `{ id: number }[]`, y `include: { categoria: true }` agrega `categoria` al tipo. En TypeORM el retorno es siempre `Producto`, aunque no hayas cargado la relación: el compilador te deja leer `producto.categoria.nombre` y revienta en runtime.

---

## 2. Clásico vs moderno: qué cambió en Prisma 6/7

Prisma cambió mucho en 2025. Vas a encontrar tutoriales, código legacy y respuestas de Stack Overflow con el setup **clásico**; los proyectos nuevos usan el **moderno** (por defecto en Prisma 7).

| Tema | Clásico (≤ 5 y buena parte de 6) | Moderno (introducido en 6.x, por defecto/obligatorio en 7) |
|---|---|---|
| Generator | `provider = "prisma-client-js"` | `provider = "prisma-client"` |
| Dónde se genera | `node_modules/.prisma/client` (oculto) | `output` **obligatorio**, dentro de tu código (ej. `src/generated/prisma`) |
| Import | `import { PrismaClient } from '@prisma/client'` | `import { PrismaClient } from './generated/prisma/client'` |
| Motor de consultas | Binario Rust (query engine) + `binaryTargets` para Docker/Lambda | TypeScript (sin Rust), más liviano |
| Conexión a la BD | La hace el engine con `url` | **Driver adapter** (`@prisma/adapter-pg` sobre `pg`, etc.) |
| URL de la BD | `url = env("DATABASE_URL")` en `datasource` | En `prisma.config.ts` (en 7 ya no va en el schema) |
| Config de la CLI | `package.json` (`"prisma": { "seed": ... }`) | `prisma.config.ts` |
| `.env` | La CLI lo cargaba sola | Cárgalo tú (`import 'dotenv/config'` en `prisma.config.ts`) |
| Middleware `$use` | Deprecado desde 4.16 | Eliminado: usa **client extensions** (`$extends`) |

> ⚠️ Mezclar ambos mundos es la fuente #1 de errores tipo *"@prisma/client did not initialize yet"* o *"Cannot find module './generated/prisma/client'"*. Si usas `prisma-client`, **nunca** importes desde `@prisma/client`; si usas `prisma-client-js`, no busques la carpeta `generated`.

> 💡 Prisma 7 es la versión que consolida estos cambios: requiere Node 20.19+ y TypeScript 5.4+, y en su guía de upgrade también indica que `migrate dev` ya no ejecuta `generate` ni el seed automáticamente. Antes de actualizar un proyecto real, lee la guía oficial "Upgrade to Prisma ORM 7": aquí nos centramos en el flujo nuevo y señalamos el clásico cuando aparezca.

---

## 3. Instalación (flujo moderno)

```bash
npm i -D prisma
npm i @prisma/client @prisma/adapter-pg pg dotenv
npm i -D @types/pg
npx prisma init --output ../src/generated/prisma
```

`prisma init` crea `prisma/schema.prisma`, `prisma.config.ts` y un `.env`. Agrega la carpeta generada al `.gitignore`: es un artefacto de build, como `dist`.

```bash
# .gitignore
src/generated/prisma
```

```ts
// prisma.config.ts (en la raíz del proyecto)
import 'dotenv/config';                         // la CLI ya no carga .env por su cuenta
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',                 // lo ejecuta `prisma db seed`
  },
  datasource: {
    url: env('DATABASE_URL'),                   // falla con error claro si no está definida
  },
});
```

---

## 4. El schema de TiendaApi

```prisma
// prisma/schema.prisma

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"   // Nest compila a CommonJS por defecto; ajústalo si tu proyecto es ESM
}

datasource db {
  provider = "postgresql"
  // Clásico: url = env("DATABASE_URL")  ← en Prisma 7 la URL vive en prisma.config.ts
}

enum Rol {
  CLIENTE
  EDITOR
  ADMIN
}

enum EstadoOrden {
  PENDIENTE
  PAGADA
  ENVIADA
  CANCELADA
}

model Categoria {
  id        Int        @id @default(autoincrement())
  nombre    String     @unique @db.VarChar(80)
  productos Producto[]                                   // lado "muchos" (sin columna)

  @@map("categorias")                                    // nombre real de la tabla
}

model Producto {
  id          Int         @id @default(autoincrement())
  sku         String      @unique @db.VarChar(120)
  nombre      String      @db.VarChar(200)
  descripcion String?                                    // ? = nullable
  precio      Decimal     @db.Decimal(12, 2)
  stock       Int         @default(0)
  activo      Boolean     @default(true)
  atributos   Json        @default("{}")

  categoriaId Int?        @map("categoria_id")           // FK escalar
  categoria   Categoria?  @relation(fields: [categoriaId], references: [id], onDelete: SetNull)

  etiquetas   Etiqueta[]                                 // N:M implícita
  items       OrdenItem[]

  creadoEn      DateTime  @default(now()) @map("creado_en") @db.Timestamptz
  actualizadoEn DateTime  @updatedAt      @map("actualizado_en") @db.Timestamptz
  eliminadoEn   DateTime? @map("eliminado_en") @db.Timestamptz

  @@index([categoriaId, precio])
  @@map("productos")
}

model Etiqueta {
  id        Int        @id @default(autoincrement())
  nombre    String     @unique @db.VarChar(40)
  productos Producto[]

  @@map("etiquetas")
}

model Usuario {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String   @map("password_hash")
  roles        Rol[]    @default([CLIENTE])              // arrays de enums: soportado en Postgres
  ordenes      Orden[]
  creadoEn     DateTime @default(now()) @map("creado_en") @db.Timestamptz

  @@map("usuarios")
}

model Orden {
  id        Int         @id @default(autoincrement())
  usuarioId Int         @map("usuario_id")
  usuario   Usuario     @relation(fields: [usuarioId], references: [id], onDelete: Restrict)
  estado    EstadoOrden @default(PENDIENTE)
  items     OrdenItem[]
  creadoEn  DateTime    @default(now()) @map("creado_en") @db.Timestamptz

  @@index([usuarioId, creadoEn(sort: Desc)])
  @@map("ordenes")
}

model OrdenItem {
  id             Int      @id @default(autoincrement())
  ordenId        Int      @map("orden_id")
  orden          Orden    @relation(fields: [ordenId], references: [id], onDelete: Cascade)
  productoId     Int      @map("producto_id")
  producto       Producto @relation(fields: [productoId], references: [id], onDelete: Restrict)
  cantidad       Int
  precioUnitario Decimal  @map("precio_unitario") @db.Decimal(12, 2)   // precio congelado

  @@unique([ordenId, productoId])
  @@map("orden_items")
}
```

Conceptos clave del schema:

| Sintaxis | Significado |
|---|---|
| `Int?`, `String?` | Nullable |
| `Producto[]` | Lista (lado "muchos" de una relación, o array escalar en Postgres) |
| `@relation(fields, references)` | Declara la FK; va en el lado que **tiene** la columna |
| `@map` / `@@map` | Nombre real de columna/tabla (camelCase en TS, snake_case en BD) |
| `@default(now())`, `@default(autoincrement())`, `@default(uuid())` | Valores por defecto |
| `@updatedAt` | Prisma actualiza la fecha en cada `update` (lo hace el cliente, no un trigger) |
| `@db.Decimal(12,2)`, `@db.VarChar(80)` | Tipo nativo exacto de la BD |
| `@@index`, `@@unique` | Índices compuestos |

> 💡 La relación N:M `Producto ↔ Etiqueta` es **implícita**: Prisma crea la tabla intermedia `_EtiquetaToProducto` por su cuenta. Si la relación necesita datos propios (cantidad, precio), modela una tabla explícita, como `OrdenItem`.

> ⚠️ `@updatedAt` y `@default(uuid())` los aplica el **cliente de Prisma**, no la base. Un `INSERT` hecho por otro sistema o por SQL a mano no los respeta. Si necesitas que la BD garantice el valor, usa `@default(dbgenerated("gen_random_uuid()"))` o triggers.

---

## 5. Migraciones y generación

```bash
npx prisma migrate dev --name init   # crea prisma/migrations/<fecha>_init/migration.sql y lo aplica
npx prisma generate                  # genera el cliente en src/generated/prisma
npx prisma studio                    # UI web para explorar datos
```

| Comando | Cuándo |
|---|---|
| `migrate dev` | **Desarrollo**: diff del schema → SQL nuevo, lo aplica; usa una *shadow database* para detectar drift |
| `migrate deploy` | **CI/producción**: aplica migraciones pendientes, nunca genera nuevas |
| `migrate reset` | Desarrollo: borra la BD, reaplica todo y ejecuta el seed |
| `migrate status` | ¿Qué migraciones faltan? |
| `db push` | Sincroniza el schema **sin** migración (prototipos; el equivalente a `synchronize` de TypeORM) |
| `db pull` | Introspección: genera el schema desde una BD existente |
| `generate` | Regenera el cliente (tras cada cambio del schema) |
| `db seed` | Ejecuta el seed configurado en `prisma.config.ts` |

> ⚠️ **Nunca** corras `migrate dev` contra producción: puede proponer resetear la base si detecta drift. En el pipeline de deploy va `prisma migrate deploy` (Sesión 34).

> ⚠️ Como el cliente se genera, tu build debe incluir `prisma generate` **antes** de `nest build` (y en el `Dockerfile`). Un patrón común: `"postinstall": "prisma generate"` o `"prebuild": "prisma generate"` en `package.json`. Con el cliente sin Rust ya no necesitas `binaryTargets` para Alpine/Lambda, un dolor clásico del setup antiguo.

Seed:

```ts
// prisma/seed.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  // upsert: el seed es idempotente (puedes correrlo varias veces)
  const hogar = await prisma.categoria.upsert({
    where: { nombre: 'Hogar' },
    update: {},
    create: { nombre: 'Hogar' },
  });

  await prisma.producto.upsert({
    where: { sku: 'TAZ-001' },
    update: {},
    create: { sku: 'TAZ-001', nombre: 'Taza cerámica', precio: '4990', stock: 50, categoriaId: hogar.id },
  });
}

main().finally(() => prisma.$disconnect());
```

---

## 6. Integración con Nest: `PrismaService` y `PrismaModule`

```ts
// src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    // El driver adapter gestiona la conexión con el driver 'pg' (y su pool)
    const adapter = new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
    super({
      adapter,
      log: ['warn', 'error'],                          // agrega 'query' para depurar
      omit: { usuario: { passwordHash: true } },       // global omit: nunca devolver el hash por defecto
    });
  }

  async onModuleInit() {
    await this.$connect();      // falla al arrancar si la BD no responde (mejor que en la 1ª request)
  }

  async onModuleDestroy() {
    await this.$disconnect();   // cierra el pool en el shutdown
  }
}
```

```ts
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()                        // un solo cliente (y un solo pool) para toda la app
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

```ts
// src/main.ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();       // SIGTERM → onModuleDestroy → $disconnect (Sesión 34)
```

> 💡 **Clásico**: el mismo servicio sin adapter era `super()` sin argumentos y con `url` en el schema. En Prisma 4 también se veía `this.$on('beforeExit', ...)` para el shutdown; eso ya no aplica: usa `enableShutdownHooks()` + `onModuleDestroy`.

> ⚠️ **Un solo `PrismaClient` por proceso.** Hacer `new PrismaClient()` en cada servicio (o peor, en cada request) abre un pool por instancia y agota las conexiones de Postgres. Por eso `PrismaService` es un singleton compartido.

> ❓ **Entrevista**: *"¿Por qué `extends PrismaClient` y no inyectar un cliente?"* → Es la receta de la doc de Nest: el servicio **es** el cliente (`this.prisma.producto.findMany()`) y engancha los lifecycle hooks. La alternativa —un custom provider con `useFactory` que devuelve el cliente (Sesión 23)— es necesaria cuando usas **client extensions**, porque `$extends` devuelve un cliente de **otro tipo** que no puedes heredar.

---

## 7. Consultas: CRUD y relaciones

```ts
// src/productos/productos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CrearProductoDto } from './dto/crear-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  crear(dto: CrearProductoDto) {
    return this.prisma.producto.create({
      data: {
        sku: dto.sku,
        nombre: dto.nombre,
        precio: dto.precio,                          // number | string | Decimal
        // Escritura anidada: conecta con la categoría existente...
        categoria: dto.categoriaId ? { connect: { id: dto.categoriaId } } : undefined,
        // ...y crea/conecta etiquetas por nombre en la misma operación
        etiquetas: {
          connectOrCreate: (dto.etiquetas ?? []).map((nombre) => ({
            where: { nombre },
            create: { nombre },
          })),
        },
      },
      include: { categoria: true, etiquetas: true },
    });
  }

  async obtener(id: number) {
    const producto = await this.prisma.producto.findFirst({
      where: { id, eliminadoEn: null },               // findFirst: permite filtrar por no-únicos
      include: { categoria: { select: { id: true, nombre: true } } },
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no existe`);
    return producto;
  }

  async listar(f: { q?: string; min?: number; max?: number; categoriaId?: number; page: number; limit: number }) {
    const where: Prisma.ProductoWhereInput = {
      activo: true,
      eliminadoEn: null,
      ...(f.q && { nombre: { contains: f.q, mode: 'insensitive' } }),   // ILIKE
      ...(f.categoriaId && { categoriaId: f.categoriaId }),
      precio: { gte: f.min, lte: f.max },            // undefined = sin filtro (ver ⚠️ abajo)
    };

    // Dos queries en una transacción batch: lista + total consistentes
    const [items, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        select: { id: true, nombre: true, precio: true, categoria: { select: { nombre: true } } },
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        skip: (f.page - 1) * f.limit,
        take: f.limit,
      }),
      this.prisma.producto.count({ where }),
    ]);

    return { items, total, page: f.page, limit: f.limit };
  }

  eliminar(id: number) {
    // update lanza P2025 si no existe → lo traducimos a 404 en un filtro (sección 9)
    return this.prisma.producto.update({ where: { id }, data: { eliminadoEn: new Date() } });
  }
}
```

### 7.1 `select` vs `include`

| | `include` | `select` |
|---|---|---|
| Qué trae | **Todos** los escalares + las relaciones indicadas | **Solo** los campos indicados (escalares o relaciones) |
| Se pueden combinar al mismo nivel | ❌ (error de tipos) | — |
| Anidar | `include: { categoria: { select: {...} } }` ✅ | `select: { categoria: { select: {...} } }` ✅ |
| Uso | Rápido en desarrollo | **Endpoints públicos**: contrato explícito, menos datos |

Otras herramientas útiles:

```ts
// Contar relaciones sin traerlas
await prisma.categoria.findMany({
  select: { id: true, nombre: true, _count: { select: { productos: true } } },
});

// Filtrar por relaciones
await prisma.categoria.findMany({ where: { productos: { some: { stock: { lt: 5 } } } } });   // some / every / none

// Omitir un campo en una query concreta (o reincluir uno omitido globalmente)
await prisma.usuario.findUnique({ where: { email }, omit: { passwordHash: false } });  // para el login

// Paginación por cursor (más estable que skip en listas grandes; Sesión 17)
await prisma.producto.findMany({ take: 20, skip: 1, cursor: { id: ultimoId }, orderBy: { id: 'asc' } });

// Agregados
await prisma.ordenItem.groupBy({
  by: ['productoId'],
  _sum: { cantidad: true },
  orderBy: { _sum: { cantidad: 'desc' } },
  take: 10,
});
```

> ⚠️ Igual que en TypeORM, en Prisma `undefined` en un filtro significa **"sin filtro"**, pero `null` significa `IS NULL`. `findFirst({ where: { usuarioId: undefined } })` devuelve el primer registro de **cualquier** usuario. En `findUnique`, en cambio, los tipos exigen el campo único; aun así, valida los ids antes de consultar.

> ⚠️ `findUnique` solo acepta campos `@id`/`@unique` (o `@@unique`). Para "id + no eliminado" usa `findFirst`, como en `obtener`.

### 7.2 El tipo `Decimal`

Los campos `Decimal` llegan como instancias de `Prisma.Decimal` (basado en decimal.js), no como `number`. Ventaja: **sin pérdida de precisión**. Trampas: `JSON.stringify` los convierte en **string** (`"4990"`), y `producto.precio + 1` no hace lo que esperas.

```ts
import { Prisma } from '../generated/prisma/client';

const total = items.reduce(
  (acc, i) => acc.add(i.precioUnitario.mul(i.cantidad)),   // aritmética decimal exacta
  new Prisma.Decimal(0),
);
```

> 💡 Decide el contrato: devolver precios como string en el JSON (preciso, lo recomendado para dinero) o convertir a número en el DTO de respuesta (Sesión 21). Lo importante es que sea **consistente**.

---

## 8. Tipos generados: el superpoder de Prisma

```ts
import { Prisma } from '../generated/prisma/client';

// 1. Reutilizar un select y derivar su tipo
const productoPublico = {
  id: true,
  nombre: true,
  precio: true,
  categoria: { select: { nombre: true } },
} satisfies Prisma.ProductoSelect;                 // satisfies: valida sin perder el tipo literal

export type ProductoPublico = Prisma.ProductoGetPayload<{ select: typeof productoPublico }>;
// → { id: number; nombre: string; precio: Prisma.Decimal; categoria: { nombre: string } | null }

// 2. Inputs tipados para funciones del servicio
function filtroTexto(q: string): Prisma.ProductoWhereInput {
  return { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { sku: { startsWith: q.toUpperCase() } }] };
}

// 3. Enums generados
import { EstadoOrden, Rol } from '../generated/prisma/client';
const esAdmin = (roles: Rol[]) => roles.includes(Rol.ADMIN);
```

> ⚠️ No uses los tipos generados como DTOs de entrada de la API (`@Body() data: Prisma.ProductoCreateInput`): son **interfaces** (sin decoradores de `class-validator`, así que el `ValidationPipe` no valida nada) y permiten escrituras anidadas arbitrarias (`categoria: { create: ... }`), un over-posting de manual. Usa DTOs de clase (Sesión 6) y mapea al input de Prisma.

---

## 9. Errores de Prisma → respuestas HTTP

Prisma lanza `Prisma.PrismaClientKnownRequestError` con un `code` estable:

| Código | Significado | HTTP sugerido |
|---|---|---|
| `P2002` | Violación de unicidad (`meta.target` indica el campo) | 409 Conflict |
| `P2025` | Registro requerido no encontrado (`update`/`delete`/`*OrThrow`/`connect`) | 404 Not Found |
| `P2003` | Violación de FK (ej. borrar categoría con productos y `Restrict`) | 409 Conflict |
| `P2000` | Valor demasiado largo para la columna | 400 Bad Request |

```ts
// src/prisma/prisma-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    const mapa: Record<string, [HttpStatus, string]> = {
      P2002: [HttpStatus.CONFLICT, 'Ya existe un registro con ese valor único'],
      P2025: [HttpStatus.NOT_FOUND, 'Recurso no encontrado'],
      P2003: [HttpStatus.CONFLICT, 'El recurso está referenciado por otros registros'],
      P2000: [HttpStatus.BAD_REQUEST, 'Valor demasiado largo'],
    };

    const [status, message] = mapa[error.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Error de base de datos'];
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(error.message, error.stack);

    // No expongas error.message al cliente: incluye nombres de tablas y la query
    res.status(status).json({ statusCode: status, message, code: error.code });
  }
}
```

Regístralo con `APP_FILTER` (Sesión 9). Con esto, `ProductosService.eliminar` no necesita buscar antes: si el id no existe, `update` lanza `P2025` y el cliente recibe 404.

> ❓ **Entrevista**: *"¿Verificas que el email no exista antes de crear el usuario?"* → Puedes hacerlo para dar un mensaje amable, pero **la garantía es el índice único**: entre tu `findUnique` y tu `create`, otra request concurrente puede insertar el mismo email. Siempre maneja `P2002` (o `23505` en TypeORM); el chequeo previo solo es UX.

---

## 10. Transacciones

```ts
// 1. Batch: array de operaciones independientes, todas o ninguna
await prisma.$transaction([
  prisma.producto.update({ where: { id: 1 }, data: { stock: { decrement: 1 } } }),
  prisma.categoria.update({ where: { id: 3 }, data: { nombre: 'Hogar y cocina' } }),
]);

// 2. Interactiva: lógica entre queries, con el cliente transaccional `tx`
async crearOrden(usuarioId: number, items: { productoId: number; cantidad: number }[]) {
  return this.prisma.$transaction(
    async (tx) => {
      const lineas: { productoId: number; cantidad: number; precioUnitario: Prisma.Decimal }[] = [];

      for (const { productoId, cantidad } of items) {
        // Descuento atómico y condicional: solo si hay stock suficiente
        const { count } = await tx.producto.updateMany({
          where: { id: productoId, stock: { gte: cantidad }, activo: true },
          data: { stock: { decrement: cantidad } },
        });
        if (count !== 1) throw new ConflictException(`Sin stock para el producto ${productoId}`);

        const { precio } = await tx.producto.findUniqueOrThrow({ where: { id: productoId }, select: { precio: true } });
        lineas.push({ productoId, cantidad, precioUnitario: precio });
      }

      return tx.orden.create({
        data: { usuarioId, items: { create: lineas } },     // escritura anidada de los ítems
        include: { items: true },
      });
    },
    { timeout: 10_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
```

> ⚠️ Igual que con el `manager` de TypeORM: dentro del callback usa **solo `tx`**. Una llamada a `this.prisma.x` o a otro servicio que use `PrismaService` va por fuera de la transacción. Y mantén las transacciones interactivas **cortas**: nada de llamadas HTTP externas dentro (retienen una conexión y locks; el `timeout` por defecto es de 5 s). Propagar la transacción entre servicios (ej. con CLS) y niveles de aislamiento: **Sesión 17**.

---

## 11. Raw SQL y client extensions

```ts
// Tagged template: los valores van como PARÁMETROS (seguro)
const top = await this.prisma.$queryRaw<{ nombre: string; vendidos: bigint }[]>`
  SELECT p.nombre, SUM(i.cantidad) AS vendidos
  FROM orden_items i JOIN productos p ON p.id = i.producto_id
  WHERE i.orden_id IN (SELECT id FROM ordenes WHERE estado = 'PAGADA' AND creado_en >= ${desde})
  GROUP BY p.nombre ORDER BY vendidos DESC LIMIT 10`;
// ⚠️ SUM/COUNT llegan como bigint: conviértelos antes de serializar (JSON.stringify falla con bigint)
```

> ⚠️ `$queryRawUnsafe(\`... ${q}\`)` **concatena** el string: SQL injection directa. Solo úsalo con valores que controlas (y aun así, prefiere `Prisma.sql` para componer fragmentos seguros).

**Client extensions** (`$extends`) reemplazan al viejo middleware `$use`: agregan campos calculados, métodos de modelo o interceptan queries.

```ts
const prismaExt = new PrismaClient({ adapter }).$extends({
  result: {
    producto: {
      precioConIva: {
        needs: { precio: true },
        compute: (p) => p.precio.mul(1.19),   // campo virtual, tipado
      },
    },
  },
  query: {
    producto: {
      // Soft delete "automático" en lecturas (cuidado: magia implícita)
      async findMany({ args, query }) {
        args.where = { eliminadoEn: null, ...args.where };
        return query(args);
      },
    },
  },
});
```

Como el tipo de `prismaExt` no es `PrismaClient`, en Nest se expone con un custom provider (`{ provide: PRISMA_EXT, useFactory: ... }`) e `@Inject(PRISMA_EXT)` (Sesión 23).

---

## 12. Testing (adelanto)

```ts
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

let prisma: DeepMockProxy<PrismaService>;

beforeEach(async () => {
  prisma = mockDeep<PrismaService>();
  const moduleRef = await Test.createTestingModule({
    providers: [ProductosService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  service = moduleRef.get(ProductosService);
});

it('lanza 404 si no existe', async () => {
  prisma.producto.findFirst.mockResolvedValue(null);
  await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
});
```

Para las consultas reales: Postgres en Docker/Testcontainers + `prisma migrate deploy` antes de la suite (Sesión 22).

---

## 13. TypeORM vs Prisma: cómo decidir

| Criterio | Elige TypeORM | Elige Prisma |
|---|---|---|
| Equipo y estilo | Viene de Hibernate/EF, le gustan las entidades con decoradores | Prefiere schema declarativo y tipos inferidos |
| Consultas | Muchos reportes y SQL dinámico complejo (QueryBuilder) | CRUD con relaciones, filtros tipados |
| Seguridad de tipos | Aceptable | Excelente (el retorno depende del `select`) |
| Migraciones | Aceptable, revisar mucho | Muy buen flujo (`migrate dev/deploy`) |
| Costo operativo | Ninguno extra | Paso `generate` en build/CI; cambios de versión mayores recientes |
| Ecosistema Nest | Módulo oficial | Receta oficial, sin módulo |

> ❓ **Entrevista**: *"¿Qué ORM elegirías para un proyecto nuevo con Nest?"* → No hay respuesta única; argumenta con criterios: tipo de consultas, experiencia del equipo, necesidad de SQL avanzado, flujo de migraciones y tolerancia a pasos de build. Y deja claro que la capa de datos debe quedar **detrás de tus servicios/repositorios** (Sesión 17 y 30) para que cambiar de ORM no toque controllers ni lógica de negocio.

---

## Resumen mental de la sesión

```
schema.prisma ──migrate dev──▶ SQL + BD      ──generate──▶ cliente tipado (src/generated/prisma)

MODERNO (6.x → por defecto en 7)          CLÁSICO
  provider = "prisma-client"                provider = "prisma-client-js"
  output obligatorio + .gitignore           node_modules/.prisma/client
  import from './generated/prisma/client'   import from '@prisma/client'
  driver adapter (@prisma/adapter-pg)       motor Rust + binaryTargets
  URL en prisma.config.ts (+ dotenv)        url = env("DATABASE_URL") en el schema
  $extends                                  $use (eliminado)

Nest: PrismaService extends PrismaClient (adapter en el constructor)
      onModuleInit $connect · onModuleDestroy $disconnect · enableShutdownHooks
      @Global PrismaModule · UN solo cliente por proceso

Consultas: findMany/findFirst/findUnique(OrThrow) · create/update/upsert/delete · *Many
           select (contrato) vs include (todo + relaciones) · _count · some/every/none
           escrituras anidadas: connect / create / connectOrCreate
           undefined = sin filtro ⚠️ · null = IS NULL · Decimal ≠ number · bigint en raw
Tipos:     Prisma.XWhereInput · XSelect + satisfies · XGetPayload · enums generados
           ⚠️ NO como DTOs de entrada
Errores:   P2002→409 · P2025→404 · P2003→409 → PrismaExceptionFilter
Tx:        $transaction([..]) batch · $transaction(async tx => ..., { timeout, isolationLevel }) → solo tx
Prod:      prisma generate en build · migrate deploy en CI · nunca migrate dev en prod
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Cómo funciona Prisma a alto nivel (schema → migrate → generate) y en qué se diferencia de TypeORM?
2. ❓ ¿Por qué el tipado de Prisma es más fuerte? Da un ejemplo con `select` e `include`.
3. ❓ Enumera las diferencias entre el setup clásico y el moderno (generator, output, import, engine, driver adapter, `prisma.config.ts`).
4. ❓ ¿Por qué la carpeta generada va en `.gitignore` y qué implica para el build y el Dockerfile?
5. ❓ ¿Cómo integras Prisma en Nest? ¿Por qué un solo `PrismaClient` y qué hooks de ciclo de vida usas?
6. ❓ ¿Cuándo usarías un custom provider en vez de `extends PrismaClient`?
7. ❓ `migrate dev` vs `migrate deploy` vs `db push`: ¿cuándo cada uno?
8. ❓ `findUnique` vs `findFirst`. ¿Qué pasa con un `where` que tiene `undefined`?
9. ❓ ¿Qué problemas trae el tipo `Decimal` al serializar y cómo los resuelves? ¿Y los `bigint` de `$queryRaw`?
10. ❓ ¿Por qué no usar `Prisma.ProductoCreateInput` como DTO del `@Body()`?
11. ❓ ¿Cómo traduces `P2002` y `P2025` a HTTP? ¿Por qué el chequeo previo de unicidad no basta?
12. ❓ Batch vs transacción interactiva. ¿Qué error común rompe la atomicidad dentro del callback?

## Ejercicio práctico
1. Crea una rama `prisma` de TiendaApi (la versión TypeORM queda en `main` para comparar). Instala Prisma con el flujo moderno y ejecuta `prisma init --output ../src/generated/prisma`.
2. Configura `prisma.config.ts` con `dotenv` y `env('DATABASE_URL')`; escribe el schema de la sección 4.
3. Ejecuta `prisma migrate dev --name init` y **lee** el `migration.sql` generado; compáralo con la migración de TypeORM de la Sesión 14.
4. Escribe el seed idempotente con `upsert` (3 categorías, 10 productos, 1 admin) y ejecútalo con `prisma db seed` dos veces.
5. Implementa `PrismaService` (adapter + global omit de `passwordHash`) y `PrismaModule` global; activa `enableShutdownHooks()`.
6. Reescribe `ProductosService` con Prisma: `crear` con `connectOrCreate` de etiquetas, `obtener` con `findFirst`, `listar` con filtros, `$transaction([findMany, count])` y un `select` reutilizable tipado con `satisfies` + `GetPayload`.
7. Registra `PrismaExceptionFilter` como `APP_FILTER`. Verifica: SKU duplicado → 409; eliminar id inexistente → 404; borrar una categoría referenciada con `Restrict` → 409.
8. Implementa `OrdenesService.crearOrden` con transacción interactiva y `updateMany` condicional. Lanza dos requests concurrentes por el último producto y comprueba que solo una gana.
9. Escribe `GET /reportes/top-productos` con `$queryRaw` y convierte los `bigint` a `number`.
10. Agrega `"prebuild": "prisma generate"` al `package.json`, borra `src/generated` y comprueba que `npm run build` lo regenera.
11. Escribe un test unitario de `ProductosService` con `jest-mock-extended`.
12. (Opcional) Crea una extensión con `precioConIva` y expónla mediante un custom provider con token propio.

---

➡️ **Cuando termines**, marca la Sesión 15 en el [README](README.md) y pasa a la **Sesión 16 — MongoDB con Mongoose: schemas, populate, índices, agregaciones**.
