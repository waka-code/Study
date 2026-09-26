# Sesión 21 — OpenAPI/Swagger, versionado de API y serialización de respuestas

> **Objetivo de la sesión**: aprender a tratar la API como un **contrato público**. Al terminar deberías poder generar documentación **OpenAPI** fiel al código con `@nestjs/swagger` (y su CLI plugin), documentar respuestas, errores, autenticación y respuestas genéricas paginadas; **versionar** la API sin romper clientes (URI, header, media type, custom); y **serializar** las respuestas para no filtrar datos (`ClassSerializerInterceptor`, `@Exclude`/`@Expose`, grupos, DTOs de salida) sabiendo cuándo conviene cada enfoque.

---

## 1. La API como contrato: por qué importan estas tres cosas juntas

Cuando tu API tiene **un** cliente (tu frontend) puedes cambiarla a voluntad. Cuando tiene **varios** (app móvil que no se actualiza, integraciones de partners, otros equipos), cada cambio es potencialmente un incidente. Las tres piezas de esta sesión responden a tres preguntas del contrato:

| Pregunta del contrato | Pieza | Herramienta en Nest |
|---|---|---|
| ¿**Qué** expone la API y con qué forma? | Documentación OpenAPI | `@nestjs/swagger` |
| ¿**Cómo evoluciona** sin romper a quien ya la usa? | Versionado | `app.enableVersioning()` |
| ¿**Qué datos salen** realmente por el cable? | Serialización | `ClassSerializerInterceptor`, DTOs de salida |

Si documentas `ProductoResponse` en Swagger pero luego devuelves la entidad completa de TypeORM, **tu documentación miente**. Por eso estas tres cosas se diseñan juntas: la clase que serializa la respuesta debería ser la misma que documenta el schema.

> ❓ **Entrevista**: *"¿Qué es un breaking change en una API REST?"* → Todo cambio que hace fallar a un cliente existente sin que él cambie nada: eliminar o renombrar un campo, cambiar su tipo, volver obligatorio un campo de entrada que era opcional, cambiar códigos de estado, cambiar la semántica de un endpoint. **Agregar** un campo opcional de entrada o un campo nuevo de salida normalmente *no* es breaking (si los clientes ignoran campos desconocidos, que es lo que debe hacer un cliente tolerante).

---

## 2. OpenAPI y Swagger: conceptos

- **OpenAPI** (antes "Swagger Specification") es un **estándar** (JSON/YAML) que describe una API HTTP: rutas, parámetros, bodies, respuestas, esquemas, seguridad. Nest genera **OpenAPI 3.0**.
- **Swagger UI** es una **herramienta** que renderiza ese documento como una web interactiva ("Try it out").
- Con el documento OpenAPI puedes además **generar clientes** tipados (`openapi-generator`, `orval`, `openapi-typescript`), hacer **contract testing** y **mock servers**.

Hay dos enfoques: **design-first** (escribes el YAML y generas código; el código puede divergir) y **code-first** (el documento se genera del código; siempre sincronizado). Nest es **code-first**: `@nestjs/swagger` recorre tus controllers y DTOs, lee la metadata de decoradores (Sesión 2: `reflect-metadata`) y produce el documento.

### 2.1 Instalación y setup

```bash
npm i @nestjs/swagger
```

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 1. Metadatos generales del documento
  const config = new DocumentBuilder()
    .setTitle('TiendaApi')
    .setDescription('API de productos, categorías, usuarios y órdenes')
    .setVersion('1.0')
    .addBearerAuth()                 // esquema de seguridad "bearer" (JWT, Sesión 18)
    .addTag('productos')
    .addTag('ordenes')
    .build();

  // 2. Factory: el documento se genera de forma perezosa (solo cuando se pide)
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  // 3. Montar la UI en /docs y el JSON en /docs-json
  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true }, // no perder el token al recargar
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Con eso tienes:
- `http://localhost:3000/docs` → Swagger UI.
- `http://localhost:3000/docs-json` → el documento OpenAPI (lo que consumen los generadores de clientes).

> ⚠️ El prefijo global (`setGlobalPrefix('api')`) **no** afecta a la ruta de Swagger por defecto: la UI queda en `/docs`, no en `/api/docs`. Si la quieres bajo el prefijo usa `useGlobalPrefix: true` en las opciones de `setup`. Las **rutas documentadas** sí incluyen `/api`.

> ⚠️ En producción decide conscientemente si expones la UI. Una API pública puede publicar su documento; una API interna quizás solo en `dev`/`staging` o detrás de autenticación. Envuelve el `setup` en un `if (config.get('SWAGGER_ENABLED'))` (Sesión 7).

---

## 3. Documentar DTOs: `@ApiProperty` y el CLI plugin

TypeScript **borra los tipos** en tiempo de ejecución. `reflect-metadata` conserva algunos (`design:type`), pero no sabe si una propiedad es opcional, si es un array de qué, ni cuál es su enum. Por eso Swagger necesita ayuda.

### 3.1 A mano

```typescript
// src/productos/dto/crear-producto.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, Length, Min } from 'class-validator';

export class CrearProductoDto {
  @ApiProperty({ example: 'Teclado mecánico', minLength: 3, maxLength: 80 })
  @IsString()
  @Length(3, 80)
  nombre: string;

  @ApiProperty({ example: 49990, description: 'Precio en CLP, sin decimales' })
  @IsInt()
  @IsPositive()
  precio: number;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: 3, description: 'ID de la categoría' })
  @IsInt()
  categoriaId: number;
}
```

Funciona, pero duplicas información: `@Length(3, 80)` y `minLength: 3, maxLength: 80` dicen lo mismo.

### 3.2 Con el CLI plugin (recomendado)

El plugin se engancha en la **compilación** de TypeScript y, leyendo el AST, agrega por ti los `@ApiProperty` según los tipos, el `?` de opcional, los valores por defecto y (opcionalmente) los comentarios JSDoc y las reglas de class-validator.

```jsonc
// nest-cli.json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,   // traduce @Length, @Min, @IsEmail... a restricciones OpenAPI
          "introspectComments": true,   // usa los comentarios /** */ como description/example
          "dtoFileNameSuffix": [".dto.ts", ".entity.ts"]
        }
      }
    ]
  }
}
```

```typescript
// Con el plugin, este DTO queda documentado sin @ApiProperty
export class CrearProductoDto {
  /**
   * Nombre visible del producto
   * @example 'Teclado mecánico'
   */
  @IsString()
  @Length(3, 80)
  nombre: string;

  /** Precio en CLP, sin decimales */
  @IsInt()
  @IsPositive()
  precio: number;

  @IsOptional()
  @IsInt()
  stock?: number = 0; // opcional + default detectados por el plugin
}
```

> ⚠️ El plugin **solo** procesa archivos con los sufijos configurados (`.dto.ts`, `.entity.ts` por defecto). Si tu DTO vive en `crear-producto.ts`, no se documenta y verás `{}` en Swagger. Además solo actúa al compilar con `nest build`/`nest start`; si compilas con `tsc` puro o con Jest sin configurarlo, no corre (en tests normalmente da igual).

> ❓ **Entrevista**: *"¿Por qué Swagger no puede inferir solo que una propiedad es un `string[]` opcional?"* → Porque el tipado de TypeScript desaparece al compilar. `design:type` para `string[]` emite solo `Array`, y la opcionalidad (`?`) no se emite nunca. El CLI plugin resuelve esto analizando el código fuente en compilación, no en runtime.

### 3.3 Mapped types: reutiliza sin perder la documentación

En la Sesión 6 viste `PartialType` de `@nestjs/mapped-types`. Si usas Swagger, **impórtalos desde `@nestjs/swagger`**: son las mismas utilidades pero además copian la metadata de OpenAPI.

```typescript
import { OmitType, PartialType, PickType, IntersectionType } from '@nestjs/swagger';

export class ActualizarProductoDto extends PartialType(CrearProductoDto) {}      // todo opcional
export class CambiarPrecioDto extends PickType(CrearProductoDto, ['precio'] as const);
export class ProductoPublicoDto extends OmitType(ProductoDto, ['costoInterno'] as const) {}
export class ProductoConStockDto extends IntersectionType(ProductoDto, StockDto) {}
```

> ⚠️ Error clásico: `PartialType` importado de `@nestjs/mapped-types` en un proyecto con Swagger → el DTO de actualización aparece **vacío** en la documentación, aunque la validación funciona.

---

## 4. Documentar endpoints: respuestas, errores, parámetros y seguridad

```typescript
// src/productos/productos.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse,
  ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('productos')                  // agrupa en la UI
@Controller('productos')
export class ProductosController {
  constructor(private readonly productos: ProductosService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un producto por id' })
  @ApiParam({ name: 'id', type: Number, example: 42 })
  @ApiOkResponse({ type: ProductoResponseDto })
  @ApiNotFoundResponse({ description: 'El producto no existe', type: ErrorResponseDto })
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.productos.buscar(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()                     // candado en la UI; usa el esquema de addBearerAuth()
  @ApiCreatedResponse({ type: ProductoResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Ya existe un producto con ese nombre', type: ErrorResponseDto })
  crear(@Body() dto: CrearProductoDto) {
    return this.productos.crear(dto);
  }
}
```

Decoradores más usados:

| Decorador | Para qué |
|---|---|
| `@ApiTags('x')` | Agrupar endpoints |
| `@ApiOperation({ summary })` | Título/descr. del endpoint |
| `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiNoContentResponse`... | Respuestas exitosas tipadas |
| `@ApiBadRequestResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`... | Errores |
| `@ApiResponse({ status, type })` | Cualquier código |
| `@ApiParam`, `@ApiQuery`, `@ApiHeader`, `@ApiBody` | Entradas que el plugin no infiere |
| `@ApiBearerAuth()`, `@ApiCookieAuth()`, `@ApiSecurity()` | Seguridad |
| `@ApiHideProperty()` / `@ApiExcludeEndpoint()` / `@ApiExcludeController()` | Ocultar |
| `@ApiExtraModels()` + `getSchemaPath()` | Schemas genéricos y `oneOf`/`allOf` |

### 4.1 Documenta el formato de error una sola vez

En la Sesión 9 definiste un exception filter global con un formato uniforme. Modélalo como clase y reutilízalo:

```typescript
// src/common/dto/error-response.dto.ts
export class ErrorResponseDto {
  /** @example 404 */
  statusCode: number;
  /** @example 'Producto 42 no encontrado' */
  message: string | string[];
  /** @example 'Not Found' */
  error: string;
  /** @example '/api/v1/productos/42' */
  path: string;
  /** @example '2026-09-25T12:00:00.000Z' */
  timestamp: string;
}
```

Y en vez de repetir cuatro decoradores en cada endpoint, **compónlos** con `applyDecorators` (Sesión 13):

```typescript
// src/common/decorators/api-errores-comunes.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

export const ApiErroresComunes = () =>
  applyDecorators(
    ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validación fallida' }),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
    ApiInternalServerErrorResponse({ type: ErrorResponseDto }),
  );
```

### 4.2 Respuestas genéricas: `PaginadoDto<T>`

Los genéricos de TypeScript tampoco existen en runtime: `PaginadoDto<ProductoResponseDto>` es, para Swagger, solo `PaginadoDto`. La solución oficial es `allOf` + `getSchemaPath`:

```typescript
// src/common/dto/paginado.dto.ts
export class MetaPaginacionDto {
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export class PaginadoDto<T> {
  data: T[];               // el plugin no sabe qué es T
  meta: MetaPaginacionDto;
}
```

```typescript
// src/common/decorators/api-paginado.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginado = <M extends Type<unknown>>(modelo: M) =>
  applyDecorators(
    ApiExtraModels(PaginadoDto, modelo),       // registra ambos schemas en components
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginadoDto) },
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(modelo) } },
            },
          },
        ],
      },
    }),
  );

// Uso
@Get()
@ApiPaginado(ProductoResponseDto)
listar(@Query() q: PaginacionQueryDto) { ... }
```

> ❓ **Entrevista**: *"¿Cómo documentas una respuesta que puede ser de dos tipos?"* → Registrando ambos modelos con `@ApiExtraModels(A, B)` y usando `schema: { oneOf: [{ $ref: getSchemaPath(A) }, { $ref: getSchemaPath(B) }] }`. Si hay discriminador, agregar `discriminator: { propertyName: 'tipo' }`.

---

## 5. Explotar el documento: generación de clientes y contract checks

El JSON de `/docs-json` es un artefacto valioso. Patrones de equipos maduros:

Un script `scripts/exportar-openapi.ts` puede crear la app con `NestFactory.create(AppModule, { logger: false })`, aplicar el mismo prefijo, llamar a `SwaggerModule.createDocument(...)`, escribir `openapi.json` con `writeFileSync` y cerrar con `app.close()`. Con ese archivo:

```bash
# El frontend genera tipos desde el contrato
npx openapi-typescript openapi.json -o src/api/tienda.d.ts

# En CI: detectar breaking changes comparando con el contrato de main
npx oasdiff breaking openapi.main.json openapi.json --fail-on ERR
```

> ⚠️ `NestFactory.create(AppModule)` en un script ejecuta los `onModuleInit` de todos los providers (Sesión 24): si alguno conecta a la base de datos o a Redis, el script lo necesitará. Mantén los hooks de arranque tolerantes o usa variables de entorno de CI.

---

## 6. Versionado de API

### 6.1 ¿Por qué versionar?

Porque no controlas cuándo se actualizan tus clientes. La app móvil v3.2 que alguien no actualiza en dos años seguirá llamando a tu API. Versionar permite **convivir** con contratos viejos mientras introduces nuevos.

Pero versionar tiene costo: cada versión viva es código a mantener, testear y documentar. Regla sana:

1. **Evoluciona sin romper** mientras puedas (agrega campos, no los quites; acepta ambos formatos).
2. Crea una **versión nueva solo** para cambios breaking inevitables.
3. **Depreca** con fecha y comunícalo (header `Deprecation`/`Sunset`, docs, métricas de uso por versión).

### 6.2 Tipos de versionado en Nest

```typescript
// main.ts
import { VersioningType } from '@nestjs/common';

app.enableVersioning({
  type: VersioningType.URI,   // /api/v1/productos
  defaultVersion: '1',        // controllers sin versión explícita → v1
});
```

| Tipo | Cómo lo manda el cliente | Config | Pros | Contras |
|---|---|---|---|---|
| `URI` | `/api/v1/productos` | `prefix` (default `'v'`) | Visible, cacheable, fácil de probar en el navegador | "Ensucia" la URL; recurso = misma entidad en 2 URLs |
| `HEADER` | `X-API-Version: 2` | `header: 'X-API-Version'` | URLs limpias | Invisible; proxies/CDN deben variar por header |
| `MEDIA_TYPE` | `Accept: application/json;v=2` | `key: 'v='` | "Purista" REST (content negotiation) | Menos conocido, más difícil de probar |
| `CUSTOM` | Lo que quieras | `extractor: (req) => string \| string[]` | Total flexibilidad | Lo mantienes tú |

```typescript
// Ejemplos de configuración
app.enableVersioning({ type: VersioningType.HEADER, header: 'X-API-Version' });
app.enableVersioning({ type: VersioningType.MEDIA_TYPE, key: 'v=' });
app.enableVersioning({
  type: VersioningType.CUSTOM,
  // Debe devolver una versión o un array ordenado (se toma la más alta que coincida)
  extractor: (req: any) => {
    const v = req.headers['x-client-version'] as string | undefined;
    return v?.startsWith('3.') ? '2' : '1';
  },
});
```

### 6.3 Versionar controllers y rutas

```typescript
import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';

// Todo el controller en v1
@Controller({ path: 'productos', version: '1' })
export class ProductosV1Controller {
  @Get()
  listar() { /* devuelve { id, nombre, precio } */ }
}

// v2: el precio ahora es un objeto { monto, moneda } → breaking change
@Controller({ path: 'productos', version: '2' })
export class ProductosV2Controller {
  @Get()
  listar() { /* devuelve { id, nombre, precio: { monto, moneda } } */ }
}

// Un controller que responde en varias versiones, y una ruta que cambia solo en v2
@Controller({ path: 'categorias', version: ['1', '2'] })
export class CategoriasController {
  @Get()
  listar() { /* igual en v1 y v2 */ }

  @Version('2')
  @Get(':id/arbol')
  arbol() { /* solo existe en v2 */ }
}

// Sin versión: /api/health responde siempre, sin importar la versión pedida
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController { ... }
```

```
GET /api/v1/productos      → ProductosV1Controller.listar
GET /api/v2/productos      → ProductosV2Controller.listar
GET /api/v2/categorias/7/arbol → CategoriasController.arbol
GET /api/v1/categorias/7/arbol → 404
```

> ⚠️ `defaultVersion` y `VERSION_NEUTRAL` no son lo mismo. `defaultVersion: '1'` asigna **v1** a controllers sin versión (en URI quedan en `/v1/...`). `VERSION_NEUTRAL` hace que la ruta **ignore** la versión (con URI queda sin prefijo `/vX`). Puedes usar `defaultVersion: [VERSION_NEUTRAL, '1']`.

### 6.4 No dupliques la lógica: versiona el borde, no el núcleo

```
 v1 Controller ──▶ ProductoV1Mapper ─┐
                                     ├─▶ ProductosService (única) ──▶ Repositorio
 v2 Controller ──▶ ProductoV2Mapper ─┘
```

Las versiones difieren en el **contrato** (DTOs de entrada/salida), no en las reglas de negocio. Mantén **un** servicio y pon la diferencia en DTOs y mappers. Si v2 cambia una regla de negocio, eso ya es otro caso de uso.

> ❓ **Entrevista**: *"URI vs header versioning, ¿cuál eliges?"* → URI para APIs públicas por simplicidad operativa: se ve en logs, se prueba en el navegador, los CDN cachean sin configuración extra y el routing del API Gateway es trivial. Header/media type si la prioridad es URLs estables por recurso y controlas bien la infraestructura (CDN con `Vary`). Lo más importante no es el mecanismo sino la **política**: cuándo se crea una versión, cuánto vive y cómo se depreca.

### 6.5 Swagger por versión

Un documento con v1 y v2 mezclados confunde. Genera uno por versión filtrando **módulos** con `include` (lo que te empuja a agrupar los controllers de cada versión en su propio módulo):

```typescript
SwaggerModule.setup('docs/v1', app, SwaggerModule.createDocument(app, configV1, { include: [ProductosV1Module] }));
SwaggerModule.setup('docs/v2', app, SwaggerModule.createDocument(app, configV2, { include: [ProductosV2Module] }));
```

---

## 7. Serialización: controlar lo que sale por el cable

### 7.1 El problema

```typescript
// Entidad de TypeORM (Sesión 14)
@Entity()
export class Usuario {
  @PrimaryGeneratedColumn() id: number;
  @Column() email: string;
  @Column() passwordHash: string;         // 😱
  @Column({ default: 'cliente' }) rol: string;
  @Column({ nullable: true }) resetToken: string | null;  // 😱😱
  @CreateDateColumn() creadoEn: Date;
}

@Get('me')
perfil(@UsuarioActual() u: Usuario) {
  return this.usuarios.buscar(u.id);     // devuelve la entidad entera: hash y token incluidos
}
```

Esto es **OWASP API3: Broken Object Property Level Authorization / Excessive Data Exposure** (Sesión 20). Nunca confíes en que "el frontend no muestra ese campo".

Dos grandes estrategias:

| Estrategia | Idea | Pros | Contras |
|---|---|---|---|
| **Blacklist** en la entidad (`@Exclude` en la entidad) | Marcas lo que NO sale | Rápido | Un campo nuevo sensible sale por defecto; acopla la entidad a HTTP |
| **Whitelist** con DTO de salida (`@Expose` + `excludeExtraneousValues`, o mapper manual) | Declaras lo que SÍ sale | Seguro por defecto, contrato explícito, documentable en Swagger | Más código |

La recomendación senior: **DTOs de salida con whitelist** para todo lo público; `@Exclude` en la entidad solo como red de seguridad adicional.

### 7.2 `ClassSerializerInterceptor` + class-transformer

`ClassSerializerInterceptor` es un interceptor (Sesión 12) que, en el camino de vuelta, aplica `instanceToPlain()` de class-transformer a lo que devuelve el handler, respetando los decoradores `@Exclude`, `@Expose`, `@Transform`, `@Type`.

```typescript
// app.module.ts — registrarlo global (con DI disponible)
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';

@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor }],
})
export class AppModule {}

// o en main.ts:
// app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

```typescript
// src/usuarios/dto/usuario-response.dto.ts
import { Exclude, Expose, Transform, Type } from 'class-transformer';

export class UsuarioResponseDto {
  @Expose() id: number;
  @Expose() email: string;
  @Expose() rol: string;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  creadoEn: string;

  // Propiedad calculada: los getters también se pueden exponer
  @Expose()
  get esAdmin(): boolean {
    return this.rol === 'admin';
  }

  @Exclude() passwordHash: string; // explícito, aunque con excludeExtraneousValues no haría falta

  constructor(parcial: Partial<UsuarioResponseDto>) {
    Object.assign(this, parcial);
  }
}
```

```typescript
@Get('me')
@SerializeOptions({ excludeExtraneousValues: true })   // whitelist: solo lo que tenga @Expose
async perfil(@UsuarioActual() u: JwtPayload) {
  const usuario = await this.usuarios.buscar(u.sub);
  return new UsuarioResponseDto(usuario);             // ⚠️ DEBE ser una instancia de la clase
}
```

> ⚠️ **El error más común de serialización**: devolver un objeto plano (`{ ...usuario }`, el resultado de Prisma, un `.lean()` de Mongoose o un `JSON.parse`). `ClassSerializerInterceptor` solo aplica los decoradores si el valor es **instancia** de una clase decorada. Un objeto plano sale tal cual, con el `passwordHash` incluido.

Para los casos en que el servicio devuelve objetos planos (Prisma, Sesión 15), usa la opción `type` de `@SerializeOptions`: el interceptor convierte primero el objeto plano en instancia de esa clase y después serializa.

```typescript
@Get(':id')
@SerializeOptions({ type: UsuarioResponseDto, excludeExtraneousValues: true })
buscar(@Param('id', ParseIntPipe) id: number) {
  return this.usuarios.buscar(id);   // objeto plano de Prisma → se transforma a UsuarioResponseDto
}
```

### 7.3 Grupos: distinta vista según quién pregunta

```typescript
export class ProductoResponseDto {
  @Expose() id: number;
  @Expose() nombre: string;
  @Expose() precio: number;

  @Expose({ groups: ['admin'] })        // solo visible con el grupo 'admin'
  costoInterno: number;

  @Expose({ groups: ['admin'] })
  proveedorId: number;
}

@Get('admin/productos/:id')
@Roles('admin')
@SerializeOptions({ groups: ['admin'], excludeExtraneousValues: true })
detalleAdmin(...) { ... }
```

Si los grupos dependen del usuario (no de la ruta), extiende el interceptor:

```typescript
// src/common/interceptors/serializer-por-rol.interceptor.ts
import {
  ClassSerializerContextOptions, ClassSerializerInterceptor, ExecutionContext, Injectable,
} from '@nestjs/common';

@Injectable()
export class SerializerPorRolInterceptor extends ClassSerializerInterceptor {
  // getContextOptions lee @SerializeOptions; aquí añadimos el rol del usuario como grupo
  protected getContextOptions(context: ExecutionContext): ClassSerializerContextOptions | undefined {
    const base = super.getContextOptions(context) ?? {};
    const req = context.switchToHttp().getRequest();
    const rol = req.user?.rol as string | undefined;
    return { ...base, groups: [...(base.groups ?? []), ...(rol ? [rol] : [])] };
  }
}
```

### 7.4 Relaciones anidadas y `@Type`

```typescript
export class OrdenResponseDto {
  @Expose() id: number;
  @Expose() total: number;

  @Expose()
  @Type(() => UsuarioResumenDto)      // sin @Type, 'cliente' queda como objeto plano → sin filtrar
  cliente: UsuarioResumenDto;

  @Expose()
  @Type(() => ItemOrdenDto)
  items: ItemOrdenDto[];
}
```

> ⚠️ Con `excludeExtraneousValues: true`, un objeto anidado **sin** `@Type` se trata como plano y, dependiendo de la versión y opciones, puede salir vacío o completo. Declara siempre `@Type` en propiedades anidadas.

### 7.5 La alternativa sin magia: mappers explícitos

```typescript
// src/productos/mappers/producto.mapper.ts
export const ProductoMapper = {
  aRespuesta(p: Producto): ProductoResponseDto {
    return {
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      categoria: p.categoria ? { id: p.categoria.id, nombre: p.categoria.nombre } : null,
    };
  },
};
```

| | `ClassSerializerInterceptor` | Mapper manual |
|---|---|---|
| Código | Poco (decoradores) | Más |
| Seguridad por defecto | Solo con `excludeExtraneousValues` | Total: solo sale lo que escribes |
| Performance | Reflexión en cada respuesta (notable en listas grandes) | Máxima |
| Tipado | Débil (el interceptor recibe `any`) | Fuerte: el compilador valida el shape |
| Testeable | Indirecto | Función pura, trivial |

Ambos son válidos. En APIs de alto tráfico o equipos que priorizan tipado estricto, los mappers explícitos suelen ganar. Lo que **no** es válido es no tener ninguno de los dos.

> ❓ **Entrevista**: *"¿Qué haces para garantizar que un campo sensible nunca salga en una respuesta?"* → Whitelist: DTOs de salida explícitos (`@Expose` + `excludeExtraneousValues` o mappers), nunca devolver entidades. Como defensa en profundidad, `@Exclude()` o `select: false` en la columna del ORM para que ni siquiera se cargue, y tests e2e que aserten que el campo **no** está en la respuesta (Sesión 22).

### 7.6 Envoltorios globales `{ data, meta }`

Si tu API envuelve todo con un interceptor de transformación (Sesión 12), recuerda que class-transformer aplica los decoradores de las **instancias anidadas** dentro del envoltorio, pero `@SerializeOptions({ type })` actúa sobre el **valor raíz**. Regla práctica: convierte a instancias (o mapea) dentro del handler/servicio y deja que el interceptor solo agregue estructura (ver sección 8).

---

## 8. Todo junto en TiendaApi

Estructura: DTOs de entrada (validación + Swagger vía plugin) y de **salida** (`@Expose`) por versión en `productos/dto/`, decoradores `ApiPaginado`/`ApiErroresComunes` y `ErrorResponseDto` en `common/`, **dos controllers** (`productos-v1`, `productos-v2`) y **un solo** `ProductosService`. En `main.ts`: `setGlobalPrefix`, `enableVersioning`, `ValidationPipe` y Swagger.

```typescript
// productos-v2.controller.ts
import { plainToInstance } from 'class-transformer';

@ApiTags('productos')
@ApiErroresComunes()
@Controller({ path: 'productos', version: '2' })
export class ProductosV2Controller {
  constructor(private readonly productos: ProductosService) {}

  @Get()
  @ApiPaginado(ProductoV2ResponseDto)
  async listar(@Query() q: PaginacionQueryDto) {
    const { items, total } = await this.productos.listar(q);
    // Convertimos los ITEMS a instancias; el envoltorio { data, meta } queda plano
    const data = plainToInstance(
      ProductoV2ResponseDto,
      items.map((p) => ({ ...p, precio: { monto: p.precio, moneda: 'CLP' } })),
      { excludeExtraneousValues: true },
    );
    return { data, meta: { total, pagina: q.pagina, porPagina: q.porPagina, totalPaginas: Math.ceil(total / q.porPagina) } };
  }
}
```

> ⚠️ Aquí **no** usamos `@SerializeOptions({ type: ProductoV2ResponseDto })`: se aplicaría al valor raíz, es decir, intentaría convertir **el envoltorio** `{ data, meta }` en un producto. Con envoltorios, convierte los items explícitamente o usa mappers. Esta sutileza es una de las razones por las que muchos equipos prefieren mappers explícitos.

---

## 9. Errores comunes

> ⚠️ **Documentar la entidad en vez del DTO**: `@ApiOkResponse({ type: Usuario })` publica en el contrato que existe `passwordHash`. Documenta siempre el DTO de salida.

> ⚠️ **Olvidar `ValidationPipe({ transform: true })` y culpar a Swagger**: Swagger documenta `pagina: number`, pero sin `transform` el query param llega como `string`. La documentación no transforma nada; solo describe.

> ⚠️ **Versionar sin política**: crear `v2`, `v3`, `v4` sin nunca apagar ninguna. Mide el uso por versión (logs/metrics por `req.url` o una etiqueta) antes de apagar, y comunica `Sunset`.

> ⚠️ **Circularidad en Swagger**: DTOs que se referencian mutuamente (`Categoria.productos` ↔ `Producto.categoria`) producen `undefined` o errores al generar el documento. Usa `@ApiProperty({ type: () => CategoriaDto })` (función perezosa) y, mejor aún, DTOs de salida que **no** sean circulares (resúmenes).

---

## Resumen mental de la sesión

```
CONTRATO = documentación + versionado + serialización (diseñarlos juntos)

OpenAPI (estándar) ≠ Swagger UI (visor). Nest = code-first.
  DocumentBuilder → SwaggerModule.createDocument → SwaggerModule.setup('docs', app, factory)
  CLI plugin (nest-cli.json): infiere @ApiProperty, opcionales, JSDoc, class-validator
    · solo archivos *.dto.ts / *.entity.ts · solo con nest build
  Mapped types desde @nestjs/swagger (no mapped-types) para conservar docs
  Genéricos: ApiExtraModels + allOf + getSchemaPath  (T no existe en runtime)
  applyDecorators para componer ApiErroresComunes / ApiPaginado

Versionado: app.enableVersioning({ type, defaultVersion })
  URI (/v1) · HEADER · MEDIA_TYPE (Accept ;v=) · CUSTOM (extractor)
  @Controller({ path, version }) · @Version('2') · VERSION_NEUTRAL
  Versiona el BORDE (DTOs/mappers), no la lógica. Política de deprecación.

Serialización: whitelist > blacklist
  ClassSerializerInterceptor (instanceToPlain) → solo con INSTANCIAS
  @Expose/@Exclude/@Transform/@Type · excludeExtraneousValues · groups
  @SerializeOptions({ type }) para objetos planos (Prisma, lean)
  Alternativa: mappers explícitos (tipado fuerte, rápido, sin magia)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué diferencia hay entre OpenAPI y Swagger? ¿Code-first vs design-first?
2. ❓ ¿Por qué `@nestjs/swagger` necesita decoradores o un plugin para describir DTOs? ¿Qué hace exactamente el CLI plugin y cuáles son sus limitaciones?
3. ❓ ¿Por qué importar `PartialType` desde `@nestjs/swagger` y no desde `@nestjs/mapped-types`?
4. ❓ ¿Cómo documentas una respuesta paginada genérica `PaginadoDto<T>`?
5. ❓ ¿Qué es un breaking change? Da tres ejemplos y tres cambios que no lo son.
6. ❓ Compara versionado por URI, header y media type. ¿Cuál usarías en una API pública y por qué?
7. ❓ ¿Qué diferencia hay entre `defaultVersion` y `VERSION_NEUTRAL`?
8. ❓ Si tienes v1 y v2, ¿duplicas el servicio? ¿Dónde vive la diferencia?
9. ❓ ¿Cómo funciona `ClassSerializerInterceptor`? ¿Por qué a veces "no hace nada"?
10. ❓ Blacklist (`@Exclude`) vs whitelist (`@Expose` + `excludeExtraneousValues`/mappers): ¿cuál es más segura y por qué?
11. ❓ ¿Cómo expondrías campos distintos a un admin y a un cliente sobre el mismo recurso?
12. ❓ ¿Cómo integrarías el documento OpenAPI en el pipeline de CI?

## Ejercicio práctico
1. Instala `@nestjs/swagger`, configura `DocumentBuilder` con `addBearerAuth()` y monta la UI en `/docs` y el JSON en `/docs-json`.
2. Activa el CLI plugin con `classValidatorShim` e `introspectComments`. Borra los `@ApiProperty` manuales de `CrearProductoDto` y comprueba en la UI que siguen documentados (con min/max y ejemplos desde JSDoc).
3. Cambia `ActualizarProductoDto` para que use `PartialType` de `@nestjs/mapped-types` y observa que en Swagger aparece vacío; vuelve a importarlo desde `@nestjs/swagger`.
4. Crea `ErrorResponseDto` y los decoradores `@ApiErroresComunes()` y `@ApiPaginado(Modelo)`; aplícalos a `GET /productos`.
5. Activa versionado URI con `defaultVersion: '1'`. Crea `ProductosV2Controller` donde `precio` sea `{ monto, moneda }`, reutilizando el mismo `ProductosService`. Verifica `/api/v1/productos` y `/api/v2/productos`.
6. Marca `HealthController` como `VERSION_NEUTRAL` y comprueba que responde en `/api/health`.
7. Crea `UsuarioResponseDto` con `@Expose` y registra `ClassSerializerInterceptor` global. Devuelve primero `{ ...usuario }` (objeto plano) y observa que el `passwordHash` se filtra; luego arréglalo con `@SerializeOptions({ type: UsuarioResponseDto, excludeExtraneousValues: true })`.
8. Agrega el campo `costoInterno` a productos con `@Expose({ groups: ['admin'] })` e implementa `SerializerPorRolInterceptor`. Prueba con un token de cliente y uno de admin.
9. Escribe `scripts/exportar-openapi.ts`, genera `openapi.json` y genera tipos con `openapi-typescript`.
10. (Opcional) Reescribe el serializado de órdenes con un `OrdenMapper` explícito y compara la legibilidad y el tipado.

---

➡️ **Cuando termines**, marca la Sesión 21 en el [README](README.md) y pasa a la **Sesión 22 — Testing: unit, integración y e2e con Jest y Supertest**.
