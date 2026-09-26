# Sesión 28 — GraphQL: code-first, resolvers, DataLoader, subscriptions

> **Objetivo de la sesión**: entender GraphQL como **lenguaje de consulta con un contrato tipado** y no como "REST con un solo endpoint". Al terminar deberías poder explicar qué problemas resuelve (y cuáles crea), montar GraphQL en Nest con `@nestjs/graphql` + `@nestjs/apollo` (Apollo Server 4) en modo **code-first**, escribir **resolvers** con queries, mutations y `@ResolveField`, reconocer y resolver el **problema N+1 con DataLoader**, proteger el API con guards, límites de **profundidad y complejidad**, manejar errores, paginar con cursores y exponer **subscriptions** en tiempo real con `graphql-ws`.

---

## 1. Qué es GraphQL y por qué existe

Facebook creó GraphQL (2012, público en 2015) porque su app móvil necesitaba, para una sola pantalla, datos de muchos recursos REST. Dos síntomas:

- **Over-fetching**: `GET /productos/1` devuelve 40 campos y la pantalla usa 3.
- **Under-fetching**: para mostrar una orden con su cliente y sus productos haces `GET /ordenes/9`, luego `GET /usuarios/4`, luego N × `GET /productos/:id` → cascada de round-trips (fatal en 3G).

GraphQL invierte el control: **el cliente describe la forma exacta de lo que necesita** y el servidor la resuelve en una sola request.

```graphql
query DetalleOrden {
  orden(id: "9") {
    id
    total
    cliente { nombre email }
    lineas {
      cantidad
      producto { nombre precio categoria { nombre } }
    }
  }
}
```

| Aspecto | REST | GraphQL |
|---|---|---|
| Endpoints | Muchos (uno por recurso) | Uno (`/graphql`) |
| Forma de la respuesta | La decide el servidor | La decide el cliente |
| Contrato | OpenAPI (opcional, Sesión 21) | **Schema obligatorio y tipado**, introspectable |
| Versionado | `/v1`, `/v2` | Evolución: agregar campos, `@deprecated` en los viejos |
| Caché HTTP | Natural (`GET` + `ETag`, CDN) | Difícil (todo es `POST`); caché en cliente (Apollo Client) o *persisted queries* |
| Errores | Status codes | Casi siempre `200` con `errors[]` en el body |
| Subida de archivos | Natural | Incómoda (mejor presigned URL, Sesión 26) |
| Riesgo de performance | Endpoints predecibles | **Queries arbitrarias**: N+1, queries profundas o costosas |
| Ideal para | APIs públicas, CRUD, integraciones máquina-máquina | Frontends con pantallas ricas, múltiples clientes (web, iOS, Android), BFF |

> ❓ **Entrevista**: *"¿GraphQL reemplaza a REST?"* → No. Es otra herramienta. Brilla cuando hay **muchos clientes con necesidades distintas** sobre un grafo de datos relacionado. Tiene costos: caché HTTP más difícil, superficie de ataque mayor (queries arbitrarias), observabilidad más compleja (todo es `POST /graphql`) y el N+1 como problema estructural. Para una API pública simple o server-to-server, REST o gRPC suelen ser mejores.

### 1.1 Vocabulario mínimo

| Concepto | Qué es |
|---|---|
| **Schema** | Contrato tipado: tipos, campos, argumentos |
| **Query** | Lectura (se pueden resolver campos en paralelo) |
| **Mutation** | Escritura (los campos de nivel raíz se ejecutan **en serie**) |
| **Subscription** | Stream de eventos (normalmente sobre WebSocket) |
| **Resolver** | Función que produce el valor de un campo |
| **Input type** | Tipo para argumentos (no puede tener resolvers) |
| **Scalar** | Tipo hoja: `Int`, `Float`, `String`, `Boolean`, `ID` y custom (`DateTime`) |
| **Nullability** | En GraphQL todo es nullable por defecto; `!` lo hace obligatorio |

---

## 2. Code-first vs schema-first

| | **Code-first** | Schema-first |
|---|---|---|
| Fuente de verdad | Clases TypeScript con decoradores | Archivos `.graphql` (SDL) |
| Schema | Generado automáticamente (`autoSchemaFile`) | Escrito a mano (`typePaths`) |
| Tipos TS | Son las mismas clases | Generados desde SDL (`GraphQLDefinitionsFactory` o graphql-codegen) |
| Ventaja | Una sola fuente, refactor seguro, reutilizas DTOs y validación | Contrato explícito primero, ideal cuando el frontend diseña el schema |
| Riesgo | El schema cambia "sin querer" al refactorizar | Divergencia SDL ↔ código si no generas tipos |

Esta sesión usa **code-first**, lo más común en Nest. Mitiga su riesgo commiteando el `schema.gql` generado y revisándolo en los PRs (o con un check de breaking changes en CI, como `graphql-inspector`).

---

## 3. Instalación y configuración

```bash
npm i @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

> ⚠️ Revisa los *peer dependencies* que pide tu versión de `@nestjs/apollo` al instalar (según la versión puede requerir además la integración de Express correspondiente, p. ej. `@as-integrations/express5`). Si `npm` avisa de un peer faltante, instálalo: no ignores el warning.

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'node:path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // genera el SDL (commitéalo)
      sortSchema: true,                                        // orden estable → diffs limpios
      playground: false,                                       // el Playground clásico está deprecado
      plugins: [ApolloServerPluginLandingPageLocalDefault()],  // Apollo Sandbox en /graphql
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req, res }) => ({ req, res }),               // disponible en todos los resolvers
    }),
    ProductosModule,
  ],
})
export class AppModule {}
```

Activa el **plugin del CLI** para no repetir `@Field()` en cada propiedad (igual que el plugin de Swagger, Sesión 21):

```json
// nest-cli.json
{
  "compilerOptions": {
    "plugins": [{ "name": "@nestjs/graphql", "options": { "introspectComments": true } }]
  }
}
```

Con el plugin, las propiedades de clases `*.entity.ts`, `*.model.ts`, `*.input.ts`, `*.args.ts` y `*.dto.ts` se registran solas; los comentarios `/** */` pasan a ser `description` en el schema.

---

## 4. Tipos: `@ObjectType`, `@InputType`, `@ArgsType`

```ts
// src/productos/models/producto.model.ts
import { Field, ID, Int, Float, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Categoria } from '../../categorias/models/categoria.model';

export enum EstadoProducto { ACTIVO = 'ACTIVO', AGOTADO = 'AGOTADO', DESCONTINUADO = 'DESCONTINUADO' }
registerEnumType(EstadoProducto, { name: 'EstadoProducto' });

@ObjectType({ description: 'Producto del catálogo' })
export class Producto {
  @Field(() => ID)
  id: number;
  @Field()
  nombre: string;
  @Field(() => Float, { description: 'Precio en CLP' })
  precio: number;
  @Field(() => Int)
  stock: number;
  @Field(() => EstadoProducto)
  estado: EstadoProducto;
  @Field({ nullable: true })
  descripcion?: string;
  // No es @Field: no se expone. En GraphQL solo existe lo que declaras.
  costoProveedor: number;
  categoriaId: number;
  // Se resuelve con @ResolveField (sección 5.2)
  @Field(() => Categoria)
  categoria?: Categoria;
  @Field()
  creadoEn: Date;   // se expone como scalar DateTime (ISO 8601) por defecto
}
```

```ts
// src/productos/dto/crear-producto.input.ts
import { Field, Float, InputType, Int, PartialType } from '@nestjs/graphql';
import { IsPositive, Length, Min } from 'class-validator';

@InputType()
export class CrearProductoInput {
  @Field() @Length(3, 100)
  nombre: string;

  @Field(() => Float) @IsPositive()
  precio: number;

  @Field(() => Int) @Min(0)
  stock: number;

  @Field(() => Int)
  categoriaId: number;
}

// PartialType de @nestjs/graphql (NO el de @nestjs/mapped-types ni el de swagger)
@InputType()
export class ActualizarProductoInput extends PartialType(CrearProductoInput) {}
```

```ts
// src/productos/dto/productos.args.ts
import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, Max, Min } from 'class-validator';

@ArgsType()
export class ProductosArgs {
  @Field(() => Int, { defaultValue: 20 }) @Min(1) @Max(100)
  primeros: number = 20;

  @Field({ nullable: true }) @IsOptional()
  despuesDe?: string;           // cursor opaco (sección 7)

  @Field(() => Int, { nullable: true }) @IsOptional()
  categoriaId?: number;
}
```

El `ValidationPipe` global (Sesión 6) funciona con inputs y args de GraphQL igual que con DTOs REST.

> ⚠️ `number` en TypeScript es ambiguo para GraphQL: sin `() => Int` se infiere `Float`. Declara siempre `Int` o `Float` (e `ID` para identificadores).

> ⚠️ `@Field({ nullable: true })` en un tipo de salida es una decisión de **contrato**: si un campo non-null resuelve `null` (o lanza), el error "sube" y anula al padre nullable más cercano, pudiendo dejar `data: null` completo. Haz non-null solo lo que de verdad siempre existe.

---

## 5. Resolvers

### 5.1 Queries y mutations

```ts
// src/productos/productos.resolver.ts
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ParseIntPipe, NotFoundException } from '@nestjs/common';
import { Producto } from './models/producto.model';
import { ProductosService } from './productos.service';
import { CrearProductoInput, ActualizarProductoInput } from './dto/crear-producto.input';
import { ProductosArgs } from './dto/productos.args';
import { ProductoConnection } from './models/producto-connection.model';
import { Categoria } from '../categorias/models/categoria.model';

@Resolver(() => Producto)
export class ProductosResolver {
  constructor(private readonly productos: ProductosService) {}

  @Query(() => Producto, { name: 'producto', nullable: true })
  async buscarUno(@Args('id', { type: () => ID }, ParseIntPipe) id: number) {
    return this.productos.buscar(id);             // null → el campo "producto" es null
  }

  @Query(() => ProductoConnection, { name: 'productos' })
  listar(@Args() args: ProductosArgs) {
    return this.productos.paginar(args);
  }

  @Mutation(() => Producto)
  @Roles('admin')
  crearProducto(@Args('input') input: CrearProductoInput) {
    return this.productos.crear(input);
  }

  @Mutation(() => Producto)
  @Roles('admin')
  async actualizarProducto(
    @Args('id', { type: () => ID }, ParseIntPipe) id: number,
    @Args('input') input: ActualizarProductoInput,
  ) {
    const p = await this.productos.actualizar(id, input);
    if (!p) throw new NotFoundException(`Producto ${id} no existe`);
    return p;
  }
}
```

```graphql
# Fragmento del schema.gql generado
type Query {
  producto(id: ID!): Producto
  productos(categoriaId: Int, despuesDe: String, primeros: Int! = 20): ProductoConnection!
}
type Mutation {
  crearProducto(input: CrearProductoInput!): Producto!
  actualizarProducto(id: ID!, input: ActualizarProductoInput!): Producto!
}
```

> 💡 Convención útil para mutations: **un input, un payload** (`crearProducto(input: CrearProductoInput!): CrearProductoPayload!`). El payload puede crecer (agregar `errores` de negocio, el objeto afectado, campos para refrescar la caché del cliente) sin romper el contrato.

### 5.2 `@ResolveField`: resolver campos relacionados

```ts
@Resolver(() => Producto)
export class ProductosResolver {
  // ...
  // Se ejecuta SOLO si la query pide "categoria"
  @ResolveField(() => Categoria)
  categoria(@Parent() producto: Producto) {
    return this.categorias.buscar(producto.categoriaId);   // ⚠️ N+1 (sección 6)
  }

  // Campo calculado: no existe en la base
  @ResolveField(() => Boolean)
  disponible(@Parent() producto: Producto) {
    return producto.estado === 'ACTIVO' && producto.stock > 0;
  }
}
```

### 5.3 Cómo ejecuta GraphQL una query

```
query { productos(primeros: 3) { items { nombre categoria { nombre } } } }

Query.productos ──▶ [p1, p2, p3]                 (1 llamada)
   ├─ p1.nombre (trivial: propiedad)   p1.categoria ──▶ Categoria.buscar(10)
   ├─ p2.nombre                        p2.categoria ──▶ Categoria.buscar(10)
   └─ p3.nombre                        p3.categoria ──▶ Categoria.buscar(12)
                                                         ▲ 1 query por fila = N+1
```

El motor recorre el árbol de la query **campo por campo**, llamando al resolver de cada uno con el valor del padre. Es elegante, y es exactamente lo que produce N+1.

---

## 6. El problema N+1 y DataLoader

Una lista de 100 órdenes con su cliente y sus productos puede disparar 1 + 100 + (100 × líneas) queries. En REST controlas el endpoint; en GraphQL **el cliente elige** qué anidar, así que el N+1 es estructural.

**DataLoader** (librería de Facebook) resuelve esto con dos ideas:

1. **Batching**: acumula todas las llamadas `load(id)` hechas en el mismo *tick* del event loop y hace **una** llamada `batchFn([ids])`.
2. **Caché por request**: `load(10)` dos veces en la misma request devuelve la misma promesa.

```
Sin DataLoader:  SELECT * FROM categorias WHERE id = 10
                 SELECT * FROM categorias WHERE id = 10
                 SELECT * FROM categorias WHERE id = 12
Con DataLoader:  SELECT * FROM categorias WHERE id IN (10, 12)
```

```bash
npm i dataloader
```

```ts
// src/graphql/loaders.factory.ts
import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { CategoriasService } from '../categorias/categorias.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Categoria } from '../categorias/models/categoria.model';
import { Usuario } from '../usuarios/models/usuario.model';

export interface Loaders {
  categoriaPorId: DataLoader<number, Categoria | null>;
  usuarioPorId: DataLoader<number, Usuario | null>;
}

@Injectable()
export class LoadersFactory {
  constructor(
    private readonly categorias: CategoriasService,
    private readonly usuarios: UsuariosService,
  ) {}

  // Se llama UNA vez por request: la caché de DataLoader no debe compartirse entre usuarios
  crear(): Loaders {
    return {
      categoriaPorId: new DataLoader(async (ids: readonly number[]) => {
        const filas = await this.categorias.buscarPorIds([...ids]);   // WHERE id IN (...)
        const porId = new Map(filas.map((c) => [c.id, c]));
        // Contrato de DataLoader: mismo largo y MISMO ORDEN que "ids"
        return ids.map((id) => porId.get(id) ?? null);
      }),
      usuarioPorId: new DataLoader(async (ids: readonly number[]) => {
        const filas = await this.usuarios.buscarPorIds([...ids]);
        const porId = new Map(filas.map((u) => [u.id, u]));
        return ids.map((id) => porId.get(id) ?? null);
      }),
    };
  }
}
```

Crear los loaders en el **context** de cada request (sin volver *request-scoped* los providers):

```ts
// src/app.module.ts
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  imports: [LoadersModule],                 // exporta LoadersFactory
  inject: [LoadersFactory],
  useFactory: (loaders: LoadersFactory) => ({
    autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    sortSchema: true,
    context: ({ req, res }) => ({ req, res, loaders: loaders.crear() }),
  }),
}),
```

```ts
// En el resolver
@ResolveField(() => Categoria)
categoria(@Parent() p: Producto, @Context('loaders') loaders: Loaders) {
  return loaders.categoriaPorId.load(p.categoriaId);
}
```

> ⚠️ **El contrato de la batch function es estricto**: devuelve un array del **mismo largo y en el mismo orden** que las claves. La base de datos no garantiza orden en un `WHERE id IN (...)`; por eso el `Map` y el `ids.map(...)`. Si falta un registro, devuelve `null` (o un `Error` en esa posición), nunca omitas la posición.

> ⚠️ Un DataLoader **global** (singleton) es un bug de seguridad y de consistencia: la caché mezcla datos entre usuarios y nunca se invalida. Uno por request, siempre.

> ❓ **Entrevista**: *"¿Por qué no hacer los resolvers `Scope.REQUEST` para crear el DataLoader?"* → Funciona, pero el scope REQUEST se propaga a toda la cadena de dependencias y Nest recrea esos providers en cada request (Sesión 23), con costo de CPU y GC. Crear los loaders en el `context` da el mismo aislamiento por request sin ese costo.

> 💡 Para relaciones uno-a-muchos (`categoria.productos`), la batch function agrupa: `WHERE categoria_id IN (...)`, luego `ids.map(id => grupos.get(id) ?? [])`. Y si usas Prisma o TypeORM con `relations`, a veces es más eficiente mirar qué campos pidió la query (`info`, o librerías como `graphql-parse-resolve-info`) y hacer un `JOIN`; DataLoader es la solución general, no la única.

---

## 7. Paginación con cursores

`offset/limit` en GraphQL sufre lo mismo que en REST (Sesión 17): lento en páginas profundas e inestable si se insertan filas. El estándar de facto es la **Connection** (especificación de Relay) o una versión simplificada:

```ts
// src/common/graphql/paginado.ts
import { Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';

export interface IPaginado<T> { items: T[]; siguienteCursor: string | null; hayMas: boolean }

// "Generic" de GraphQL: una función que fabrica un ObjectType por cada T
export function Paginado<T>(clase: Type<T>): Type<IPaginado<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginadoType implements IPaginado<T> {
    @Field(() => [clase]) items: T[];
    @Field(() => String, { nullable: true }) siguienteCursor: string | null;
    @Field() hayMas: boolean;
  }
  return PaginadoType as Type<IPaginado<T>>;
}

// src/productos/models/producto-connection.model.ts
@ObjectType()
export class ProductoConnection extends Paginado(Producto) {}
```

```ts
// ProductosService.paginar: keyset sobre id, cursor opaco en base64
async paginar({ primeros, despuesDe, categoriaId }: ProductosArgs): Promise<IPaginado<Producto>> {
  const desdeId = despuesDe ? Number(Buffer.from(despuesDe, 'base64url').toString()) : 0;
  const filas = await this.repo.find({
    where: { id: MoreThan(desdeId), ...(categoriaId && { categoriaId }) },
    order: { id: 'ASC' },
    take: primeros + 1,                               // uno extra para saber si hay más
  });
  const hayMas = filas.length > primeros;
  const items = filas.slice(0, primeros);
  const ultimo = items.at(-1);
  return {
    items,
    hayMas,
    siguienteCursor: hayMas && ultimo ? Buffer.from(String(ultimo.id)).toString('base64url') : null,
  };
}
```

---

## 8. Autenticación y autorización

El `ExecutionContext` de GraphQL no es HTTP: `context.switchToHttp().getRequest()` devuelve `undefined`. Se usa `GqlExecutionContext`:

```ts
// src/auth/gql-auth.guard.ts — reutiliza la estrategia JWT de Passport (Sesión 18)
import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext().req;
  }
}
```

```ts
// src/auth/current-user.decorator.ts — funciona en HTTP y en GraphQL
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  if (ctx.getType<'http' | 'graphql'>() === 'graphql') {
    return GqlExecutionContext.create(ctx).getContext().req.user;
  }
  return ctx.switchToHttp().getRequest().user;
});
```

```ts
@Resolver(() => Orden)
@UseGuards(GqlAuthGuard, RolesGuard)
export class OrdenesResolver {
  @Query(() => [Orden])
  misOrdenes(@CurrentUser() user: UsuarioActual) {
    return this.ordenes.deUsuario(user.id);
  }
}
```

> ⚠️ **Autorización a nivel de campo**: en GraphQL cualquiera puede llegar a `Usuario.email` navegando `producto → resenas → autor → email`. No basta con proteger la query raíz: protege el **tipo** o el **campo** (guard en el `@ResolveField`, o no exponer el campo) y aplica ownership en los servicios (Sesión 19).

---

## 9. Protegerse de queries abusivas

Un cliente malicioso (o descuidado) puede enviar:

```graphql
query { categorias { productos { categoria { productos { categoria { productos { nombre } } } } } } }
```

Cada nivel multiplica filas. Defensas, de la más simple a la más completa:

| Defensa | Qué limita | Cómo |
|---|---|---|
| Límites en listas | Tamaño de cada lista | `@Max(100)` en `primeros`, nunca listas sin paginar |
| **Profundidad** | Niveles de anidamiento | `graphql-depth-limit` en `validationRules` |
| **Complejidad / costo** | Costo total estimado | `graphql-query-complexity` como plugin de Apollo |
| Timeout | Duración | Interceptor con `timeout()` (Sesión 12) o timeouts de DB |
| Rate limiting | Requests por cliente | `@nestjs/throttler` adaptado a GraphQL (Sesión 20), idealmente por **costo** |
| **Persisted queries / allowlist** | Qué queries existen | Solo aceptar hashes de queries registradas por tus clientes |
| Introspección off en prod | Descubrimiento del schema | `introspection: false` (no es seguridad real, solo reduce ruido) |

```ts
// Profundidad
import depthLimit from 'graphql-depth-limit';
GraphQLModule.forRoot<ApolloDriverConfig>({
  // ...
  validationRules: [depthLimit(6)],
});
```

```ts
// Complejidad: plugin de Apollo registrado como provider de Nest
import { Plugin } from '@nestjs/apollo';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';

@Plugin()
export class ComplejidadPlugin implements ApolloServerPlugin {
  constructor(private readonly schemaHost: GraphQLSchemaHost) {}

  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    const maximo = 200;
    const { schema } = this.schemaHost;
    return {
      async didResolveOperation({ request, document }) {
        const complejidad = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),               // usa @Field({ complexity })
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });
        if (complejidad > maximo) {
          throw new GraphQLError(`Query demasiado compleja: ${complejidad} (máx. ${maximo})`, {
            extensions: { code: 'QUERY_TOO_COMPLEX' },
          });
        }
      },
    };
  }
}
```

```ts
// Costo por campo: una lista cuesta según cuántos elementos pide
@Field(() => [Producto], {
  complexity: ({ args, childComplexity }) => (args.primeros ?? 20) * childComplexity,
})
productos: Producto[];
```

> ❓ **Entrevista**: *"¿Cuáles son los riesgos de seguridad específicos de GraphQL?"* → Queries profundas o costosas (DoS), *batching* de muchas operaciones en una request (fuerza bruta de login saltándose el rate limit por request), introspección que expone el schema, autorización olvidada en campos anidados y mensajes de error que filtran internals. Mitigación: depth + complexity limits, paginación obligatoria, rate limit por costo, persisted queries, authz por campo y `formatError` en producción.

---

## 10. Errores

GraphQL responde con **`200`** incluso con errores; la respuesta trae `data` parcial y un array `errors`:

```json
{
  "data": { "orden": null },
  "errors": [{
    "message": "Orden 9 no encontrada",
    "path": ["orden"],
    "extensions": { "code": "NOT_FOUND" }
  }]
}
```

Las `HttpException` de Nest (`NotFoundException`, `ForbiddenException`...) lanzadas en resolvers se convierten en errores GraphQL con su mensaje. Para un contrato estable, normaliza en `formatError`:

```ts
import { GraphQLFormattedError } from 'graphql';

GraphQLModule.forRoot<ApolloDriverConfig>({
  // ...
  includeStacktraceInErrorResponses: false,
  formatError: (formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
    const original = (error as { originalError?: any })?.originalError;
    const status = original?.getStatus?.() ?? original?.status;
    const codigos: Record<number, string> = { 400: 'BAD_USER_INPUT', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT' };
    const code = (status && codigos[status]) ?? formatted.extensions?.code ?? 'INTERNAL_SERVER_ERROR';
    // En 5xx no filtres el mensaje interno
    const message = code === 'INTERNAL_SERVER_ERROR' ? 'Error interno' : formatted.message;
    return { message, path: formatted.path, locations: formatted.locations, extensions: { code } };
  },
});
```

> 💡 Debate senior: los errores de **negocio esperados** ("stock insuficiente") muchos equipos los modelan **en el schema** con unions (`union CrearOrdenResultado = Orden | StockInsuficiente | ProductoNoExiste`, con `createUnionType`), dejando `errors[]` para lo inesperado. El cliente queda obligado por tipos a manejar cada caso.

> ⚠️ Como todo es `200`, tu monitoreo por status code (ALB, dashboards) **no ve** los errores de GraphQL. Mide `errors[].extensions.code` con un plugin o interceptor (Sesión 32).

---

## 11. Subscriptions

Una subscription es un stream de resultados que el servidor empuja. Nest usa el protocolo **`graphql-ws`** (el viejo `subscriptions-transport-ws` está abandonado).

```ts
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  inject: [LoadersFactory, JwtService],
  imports: [LoadersModule, AuthModule],
  useFactory: (loaders: LoadersFactory, jwt: JwtService) => ({
    autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    subscriptions: {
      'graphql-ws': {
        // Auth UNA vez al abrir el WebSocket (connectionParams los envía el cliente)
        onConnect: async (ctx) => {
          const token = (ctx.connectionParams as { authorization?: string })?.authorization?.replace('Bearer ', '');
          if (!token) return false;                             // rechaza la conexión
          try {
            (ctx.extra as Record<string, unknown>).user = await jwt.verifyAsync(token);
            return true;
          } catch { return false; }
        },
      },
    },
    // HTTP → { req }; WebSocket → { extra }
    context: ({ req, res, extra }) => ({
      req: req ?? { user: extra?.user },
      res,
      loaders: loaders.crear(),
    }),
  }),
}),
```

```ts
// src/ordenes/pubsub.provider.ts
import { PubSub } from 'graphql-subscriptions';
export const PUB_SUB = Symbol('PUB_SUB');
export const PubSubProvider = { provide: PUB_SUB, useValue: new PubSub() };
```

```ts
// src/ordenes/ordenes.resolver.ts
import { Inject } from '@nestjs/common';
import { Args, ID, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

@Resolver(() => Orden)
export class OrdenesResolver {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub, private readonly ordenes: OrdenesService) {}

  @Mutation(() => Orden)
  @UseGuards(GqlAuthGuard)
  async pagarOrden(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: UsuarioActual) {
    const orden = await this.ordenes.pagar(id, user.id);
    // La clave del payload debe coincidir con el nombre de la subscription (o usar "resolve")
    await this.pubSub.publish('ordenActualizada', { ordenActualizada: orden });
    return orden;
  }

  @Subscription(() => Orden, {
    // Solo entrega eventos de las órdenes del usuario conectado
    filter: (payload: { ordenActualizada: Orden }, _vars, ctx) =>
      payload.ordenActualizada.usuarioId === ctx.req.user.sub,
  })
  ordenActualizada() {
    // graphql-subscriptions v3: asyncIterableIterator (en v2 se llamaba asyncIterator)
    return this.pubSub.asyncIterableIterator('ordenActualizada');
  }
}
```

```graphql
subscription { ordenActualizada { id estado total } }
```

> ⚠️ **El `PubSub` de `graphql-subscriptions` es en memoria**: con 2+ réplicas, un `publish` en la réplica A no llega a los suscriptores de la B (el mismo problema de la Sesión 27). En producción usa una implementación distribuida, como `graphql-redis-subscriptions` (`RedisPubSub`), detrás del mismo token `PUB_SUB`.

> ⚠️ `filter` se ejecuta **por cada suscriptor y por cada evento**: con 10 000 suscriptores y un evento por segundo son 10 000 llamadas por segundo. Para fan-out masivo, particiona los *triggers* (`orden:${usuarioId}`) en vez de filtrar un canal global.

> 💡 Más allá: **Apollo Federation** (`ApolloFederationDriver` en subgrafos + `ApolloGatewayDriver` o Apollo Router) compone los subgrafos de cada microservicio (Sesión 29) en un supergrafo; útil con varios equipos, a costa de un componente crítico más.

---

## Resumen mental de la sesión

```
GraphQL: el cliente pide la FORMA exacta. 1 endpoint, schema tipado, 200 + errors[].
Resuelve over/under-fetching. Crea: N+1, queries abusivas, caché HTTP difícil.

Nest: @nestjs/graphql + @nestjs/apollo + @apollo/server + graphql
  GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile, sortSchema,
    context: ({ req }) => ({ req, loaders }) })
Code-first: @ObjectType / @InputType / @ArgsType / @Field(() => Int|Float|ID) / registerEnumType
  PartialType de @nestjs/graphql. Plugin CLI "@nestjs/graphql".
Resolver: @Resolver(() => T) · @Query · @Mutation · @Args · @ResolveField + @Parent · @Context
N+1 → DataLoader POR REQUEST en el context; batch fn: mismo largo y orden que las keys
Paginación: cursores (keyset) + Paginado<T>() genérico
Auth: GqlExecutionContext.create(ctx).getContext().req; authz también en campos anidados
Abuso: límites en listas, depthLimit, graphql-query-complexity (@Plugin), persisted queries
Errores: formatError, códigos en extensions.code, unions para errores de negocio
Subscriptions: 'graphql-ws', onConnect (connectionParams), PubSub.asyncIterableIterator,
  filter; en prod RedisPubSub (el PubSub default es en memoria)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué problemas de REST resuelve GraphQL? ¿Qué problemas nuevos introduce?
2. ❓ Code-first vs schema-first: ventajas de cada uno y cómo evitas cambios accidentales del schema en code-first.
3. ❓ ¿Qué diferencia hay entre `@ObjectType`, `@InputType` y `@ArgsType`?
4. ❓ ¿Por qué hay que declarar `() => Int` en un campo `number`?
5. ❓ Explica el problema N+1 en GraphQL con un ejemplo concreto.
6. ❓ ¿Cómo funciona DataLoader (batching y caché)? ¿Qué contrato debe cumplir la batch function?
7. ❓ ¿Por qué el DataLoader debe ser por request y por qué crearlo en el `context` y no con `Scope.REQUEST`?
8. ❓ ¿Cómo obtienes el `request` dentro de un guard en GraphQL?
9. ❓ ¿Cómo proteges un API GraphQL de una query maliciosa muy profunda o costosa?
10. ❓ ¿Por qué GraphQL devuelve `200` con errores y qué implica para el monitoreo? ¿Cómo modelarías errores de negocio?
11. ❓ ¿Cómo funcionan las subscriptions en Nest? ¿Qué problema tiene el `PubSub` por defecto con varias réplicas?
12. ❓ ¿Cuándo elegirías REST en lugar de GraphQL?

## Ejercicio práctico
1. Instala `@nestjs/graphql @nestjs/apollo @apollo/server graphql`, configura `GraphQLModule` con `autoSchemaFile` y el plugin del CLI, y abre Apollo Sandbox en `/graphql`.
2. Modela `Producto`, `Categoria`, `Usuario` y `Orden` (con `LineaOrden`) como `@ObjectType`. Revisa el `schema.gql` generado y commitéalo.
3. Implementa `producto(id)`, `productos(primeros, despuesDe, categoriaId)` con `Paginado<T>` y keyset, y las mutations `crearProducto` / `actualizarProducto` con validación de class-validator.
4. Agrega `@ResolveField categoria` **sin** DataLoader, activa el logging de SQL de TypeORM (`logging: true`) y cuenta las queries de `productos(primeros: 50) { items { categoria { nombre } } }`.
5. Implementa `LoadersFactory` y cambia el resolver a `loaders.categoriaPorId.load(...)`. Vuelve a contar: deberían ser 2 queries.
6. Protege `misOrdenes` con `GqlAuthGuard` y `@CurrentUser`. Agrega `Orden.cliente` y verifica que un usuario no puede ver el email de otros navegando relaciones.
7. Agrega `depthLimit(5)` y el `ComplejidadPlugin` con costo por lista. Construye una query anidada que supere el límite y comprueba el error `QUERY_TOO_COMPLEX`.
8. Implementa `formatError` y verifica que `NotFoundException` sale con `extensions.code = "NOT_FOUND"` y que un error inesperado no filtra su mensaje.
9. Implementa la subscription `ordenActualizada` con auth en `onConnect` y `filter` por usuario. Pruébala desde Sandbox con dos usuarios distintos.
10. (Opcional) Reemplaza `PubSub` por `RedisPubSub` de `graphql-redis-subscriptions`, levanta dos instancias y verifica que la subscription funciona entre ellas.

---

➡️ **Cuando termines**, marca la Sesión 28 en el [README](README.md) y pasa a la **Sesión 29 — Microservicios: transports (TCP, Redis, NATS, RabbitMQ, Kafka, gRPC) y apps híbridas**.
