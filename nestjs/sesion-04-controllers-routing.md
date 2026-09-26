# Sesión 4 — Controllers y routing: params, query, body, headers, status codes, respuestas

> **Objetivo de la sesión**: dominar la capa HTTP de Nest. Al terminar deberías poder definir rutas con `@Controller` y los decoradores de método, entender la **sintaxis de rutas de Express 5** que trae Nest 11 (comodines con nombre, segmentos opcionales), extraer datos con `@Param`, `@Query`, `@Body` y `@Headers` convirtiendo tipos con pipes, devolver los **status codes** correctos (201 + `Location`, 204, 404), elegir entre el modo **estándar** de respuesta y el modo **específico de librería** (`@Res()`, `passthrough`), y construir el `ProductosController` completo de TiendaApi.

---

## 1. El rol del controller

Un controller es un **adaptador HTTP**: traduce una request en una llamada a un service y el resultado en una response. Nada más.

```
Request ─▶ [ routing: ¿qué método? ] ─▶ extraer datos (params, query, body)
                                          │
                                          ▼
                               service.metodo(datos)   ← lógica de negocio
                                          │
Response ◀── serializar + status ◀────────┘
```

| Responsabilidad | ¿Controller? | ¿Dónde va si no? |
|---|---|---|
| Mapear URL y verbo a un método | ✅ | — |
| Extraer y convertir parámetros | ✅ (con pipes) | Pipes (Sesión 10) |
| Validar la forma del body | ⚠️ Declarativo (DTO) | `ValidationPipe` (Sesión 6) |
| Elegir el status code | ✅ | — |
| Reglas de negocio (stock, precios, permisos por dueño) | ❌ | Service |
| Acceso a base de datos | ❌ | Service / repositorio |
| Autenticación | ❌ | Guards (Sesión 11, 18) |
| Logging, métricas, formateo común de respuesta | ❌ | Interceptors (Sesión 12) |

> ❓ **Entrevista**: *"¿Cómo sabes si un controller está haciendo demasiado?"* → Si tiene `if` de negocio, accede a la base de datos, captura excepciones para transformarlas o repite lógica en varios handlers. Un handler sano tiene 1–3 líneas: extrae datos, llama al service y devuelve. Si lo expusieras mañana por GraphQL o por una cola, no deberías duplicar nada salvo ese adaptador.

---

## 2. Definiendo rutas

```ts
import { Controller, Get, Post, Put, Patch, Delete } from '@nestjs/common';

@Controller('productos')          // prefijo de ruta del controller
export class ProductosController {
  @Get()             // GET    /productos
  listar() {}

  @Get(':id')        // GET    /productos/:id
  obtener() {}

  @Post()            // POST   /productos
  crear() {}

  @Put(':id')        // PUT    /productos/:id   (reemplazo completo)
  reemplazar() {}

  @Patch(':id')      // PATCH  /productos/:id   (actualización parcial)
  actualizar() {}

  @Delete(':id')     // DELETE /productos/:id
  eliminar() {}
}
```

Decoradores de método HTTP disponibles en `@nestjs/common`: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Options`, `@Head` y `@All` (cualquier verbo). Todos aceptan un path (string) o un array de paths.

### 2.1 Cómo se construye la ruta final

```
app.setGlobalPrefix('api')  +  RouterModule (Sesión 3)  +  @Controller('productos')  +  @Get(':id')
          /api              +       (opcional)          +        /productos          +    /:id
                                                   = GET /api/productos/:id
```

```ts
// main.ts
app.setGlobalPrefix('api', {
  exclude: ['health'], // /health queda sin prefijo (útil para el load balancer, Sesión 32)
});
```

El versionado de rutas (`/v1/productos`) tiene su propio mecanismo (`app.enableVersioning`): lo vemos en la Sesión 21.

### 2.2 El orden de declaración importa

Nest registra las rutas en el orden en que aparecen los métodos en la clase, y Express usa la **primera** que coincide:

```ts
@Controller('productos')
export class ProductosController {
  @Get(':id')          // ❌ declarado primero: captura también "/productos/destacados"
  obtener(@Param('id') id: string) {}

  @Get('destacados')   // nunca se alcanza
  destacados() {}
}
```

> ⚠️ Declara siempre las rutas **estáticas antes que las parametrizadas**: `destacados` arriba, `:id` abajo. Si además usas `ParseIntPipe` en `:id`, el síntoma es un confuso `400 Validation failed (numeric string is expected)` al pedir `/productos/destacados`.

### 2.3 Sintaxis de rutas en Nest 11 (Express 5 / path-to-regexp v8)

| Necesito | Nest ≤10 (Express 4) | **Nest 11 (Express 5)** |
|---|---|---|
| Parámetro | `':id'` | `':id'` (igual) |
| Varios parámetros | `':categoria/:id'` | igual |
| Comodín (resto del path) | `'archivos/*'` | `'archivos/*ruta'` — el comodín **debe tener nombre** |
| Comodín que también acepta la raíz | `'archivos*'` | `'archivos{/*ruta}'` — las **llaves** marcan lo opcional |
| Parámetro opcional | `':id?'` | `'{:id}'` o `'resenas{/:id}'` |
| Regex en el parámetro | `':id(\\d+)'` | ❌ No soportado → usa `ParseIntPipe` (Sesión 10) |
| Caracteres literales `( ) [ ] ? + !` | Tenían significado especial | Deben **escaparse** con `\\` |

```ts
@Controller('archivos')
export class ArchivosController {
  // GET /archivos/imagenes/2025/teclado.png
  @Get('*ruta')
  descargar(@Param('ruta') ruta: string[]) {
    // ⚠️ En Express 5 un comodín con nombre llega como ARRAY de segmentos:
    // ['imagenes', '2025', 'teclado.png']
    return { ruta: ruta.join('/') };
  }
}

@Controller('productos')
export class ResenasController {
  // GET /productos/1/resenas  y  GET /productos/1/resenas/7
  @Get(':productoId/resenas{/:resenaId}')
  resenas(
    @Param('productoId') productoId: string,
    @Param('resenaId') resenaId?: string, // undefined si no vino
  ) {}
}
```

> ⚠️ Si migras un proyecto de Nest 10 y ves en el arranque warnings sobre rutas no soportadas o comodines, es esto. Nest 11 intenta convertir automáticamente algunas rutas antiguas (como `'*'` en middleware) y avisa, pero no confíes en la conversión: actualiza los paths. Con **Fastify** la sintaxis de comodines es la de Fastify (`'*'`), así que este es otro punto donde las plataformas difieren.

---

## 3. Extrayendo datos de la request

| Decorador | Fuente | Tipo que llega | Ejemplo |
|---|---|---|---|
| `@Param('id')` / `@Param()` | Segmentos de la ruta | **string** (o `string[]` en comodines) | `/productos/42` |
| `@Query('pagina')` / `@Query()` | Query string | **string**, `string[]` si se repite | `?pagina=2&tag=a&tag=b` |
| `@Body()` / `@Body('nombre')` | Body parseado (JSON, urlencoded) | Lo que envió el cliente | `POST` con JSON |
| `@Headers('x-tenant')` / `@Headers()` | Headers (nombres en **minúscula**) | string | `X-Tenant: acme` |
| `@Ip()` | IP del cliente | string | detrás de proxy, ver Sesión 20 |
| `@HostParam('cuenta')` | Parámetro del host (sección 8) | string | `acme.tienda.cl` |
| `@Req()` | Objeto request nativo | `Request` de Express / `FastifyRequest` | último recurso |
| `@Res()` | Objeto response nativo | ver sección 6 | último recurso |

```ts
@Get(':id')
obtener(
  @Param('id') id: string,               // "42" — ¡siempre string!
  @Query('incluir') incluir: string,     // "categoria"  (o undefined)
  @Headers('accept-language') idioma: string,
) {}
```

### 3.1 Todo llega como string: conviértelo con pipes

HTTP es texto. `@Param('id') id: number` **no convierte nada**: el tipo de TypeScript es una mentira en runtime. Nest trae pipes que convierten **y** validan:

```ts
import {
  DefaultValuePipe, ParseIntPipe, ParseBoolPipe, ParseUUIDPipe,
  ParseEnumPipe, ParseArrayPipe, ParseFloatPipe, HttpStatus,
} from '@nestjs/common';

export enum OrdenProductos {
  Reciente = 'reciente',
  Precio = 'precio',
}

@Get(':id')
obtener(@Param('id', ParseIntPipe) id: number) {
  // "42"  → 42
  // "abc" → 400 {"message":"Validation failed (numeric string is expected)", ...}
}

@Get()
listar(
  // Valor por defecto + conversión: el orden importa (primero default, luego parse)
  @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
  @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite: number,
  @Query('activos', new DefaultValuePipe(true), ParseBoolPipe) activos: boolean,
  // ParseEnumPipe recibe un ENUM de TypeScript (existe en runtime, Sesión 2)
  @Query('orden', new DefaultValuePipe(OrdenProductos.Reciente), new ParseEnumPipe(OrdenProductos))
  orden: OrdenProductos,
) {}

@Get('por-codigo/:codigo')
porCodigo(
  @Param('codigo', new ParseUUIDPipe({ version: '4' })) codigo: string,
) {}

@Delete(':id')
eliminar(
  // Personalizar el status del error
  @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE })) id: number,
) {}
```

Los pipes tienen su sesión completa (Sesión 10). Para query strings con muchos campos, en lugar de 5 `@Query` sueltos se usa **un DTO** con `@Query() filtros: FiltrarProductosDto` y `ValidationPipe({ transform: true })` (Sesión 6).

> ❓ **Entrevista**: *"Si declaro `@Param('id') id: number`, ¿qué recibo?"* → Un **string**. Los tipos de TypeScript no existen en runtime y Nest no convierte automáticamente salvo que uses un pipe (`ParseIntPipe`) o `ValidationPipe` con `transform: true` (que usa la metadata `design:paramtypes` para convertir tipos primitivos). Comparar `id === 42` con un string `"42"` es `false`: un bug clásico que devuelve 404 para productos que sí existen.

### 3.2 Query strings en Express 5: el parser "simple"

Express 4 usaba por defecto el parser **extended** (librería `qs`), que convierte corchetes en objetos. **Express 5 usa el parser "simple"** (el `querystring` de Node):

| Query | Express 4 (extended) | Express 5 / Nest 11 (simple) |
|---|---|---|
| `?pagina=2` | `{ pagina: '2' }` | `{ pagina: '2' }` |
| `?tag=a&tag=b` | `{ tag: ['a','b'] }` | `{ tag: ['a','b'] }` |
| `?precio[min]=10&precio[max]=50` | `{ precio: { min:'10', max:'50' } }` | `{ 'precio[min]': '10', 'precio[max]': '50' }` |

Si tu API usa filtros anidados, vuelve al parser extended explícitamente:

```ts
// main.ts
import { NestExpressApplication } from '@nestjs/platform-express';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.set('query parser', 'extended'); // restaura el comportamiento de Express 4 (qs)
```

> ⚠️ Un único `?tag=a` llega como **string**, pero `?tag=a&tag=b` llega como **array**. Si esperas un array, normalízalo (`ParseArrayPipe` o `@Transform` en el DTO, Sesión 6); si no, tu código recibirá tipos distintos según cuántos valores mande el cliente.

### 3.3 El body

```ts
@Post()
crear(@Body() dto: CreateProductoDto) {
  return this.productosService.create(dto);
}

@Patch(':id/precio')
cambiarPrecio(
  @Param('id', ParseIntPipe) id: number,
  @Body('precio', ParseIntPipe) precio: number, // solo una propiedad del body
) {}
```

- Nest registra el parser JSON y urlencoded automáticamente (`bodyParser: true` por defecto en `NestFactory.create`).
- Límite de tamaño por defecto del parser JSON de Express: **100 kb**. Para cambiarlo: `app.useBodyParser('json', { limit: '1mb' })` (con `NestExpressApplication`).
- Sin `Content-Type: application/json`, el body llega vacío (`{}`) y no hay error: **siempre** revisa el header cuando "el body llega vacío".
- Sin `ValidationPipe`, `@Body() dto: CreateProductoDto` es **cualquier cosa** que mande el cliente, aunque el tipo diga otra cosa (Sesión 6).

---

## 4. Respuestas: el modo estándar

En el modo estándar, **lo que retornas es la respuesta**:

| Retornas | Nest envía |
|---|---|
| Objeto o array | JSON (`Content-Type: application/json`) |
| `string`, `number`, `boolean` | El valor tal cual (un string sale como `text/html` en Express) |
| `Promise<T>` | Espera y envía `T` |
| `Observable<T>` | Se suscribe y envía el **último** valor emitido al completarse |
| `undefined` / nada | Body vacío con el status actual |
| `StreamableFile` | Stream de archivo (Sesión 26) |

Status por defecto: **200**, salvo `@Post()` que devuelve **201**.

```ts
import { HttpCode, HttpStatus, Header, Redirect } from '@nestjs/common';

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)      // 204: éxito sin body
eliminar(@Param('id', ParseIntPipe) id: number) {
  this.productosService.remove(id);
}

@Post('buscar')
@HttpCode(HttpStatus.OK)              // POST que es una CONSULTA → 200, no 201
buscar(@Body() filtros: BuscarProductosDto) {}

@Get('catalogo.csv')
@Header('Content-Type', 'text/csv')   // header estático
@Header('Cache-Control', 'no-store')
exportar() {
  return 'id,nombre\n1,Teclado';
}

@Get('docs')
@Redirect('https://docs.tienda.cl', 302)
docs(@Query('version') version?: string) {
  // Si retornas { url, statusCode }, sobrescribe los valores del decorador
  if (version) return { url: `https://docs.tienda.cl/${version}` };
}
```

> 💡 Usa `HttpStatus.NO_CONTENT` en vez de `204`: se lee mejor y el enum está en `@nestjs/common`.

### 4.1 Async y RxJS

```ts
@Get(':id')
async obtener(@Param('id', ParseIntPipe) id: number): Promise<Producto> {
  return this.productosService.findOne(id); // Nest hace await por ti
}
```

Si la promesa se rechaza con una `HttpException` (ej. `NotFoundException`), Nest responde con su status. Si se rechaza con cualquier otro error, responde **500** `Internal server error` (el detalle solo va al log). El manejo de errores completo es la Sesión 9.

---

## 5. Status codes: los que debes usar bien

| Situación | Status | Cómo en Nest |
|---|---|---|
| Consulta exitosa | 200 OK | default |
| Recurso creado | **201 Created** + header `Location` | default en `@Post` + `passthrough` (sección 6) |
| Aceptado para procesarse después (cola) | 202 Accepted | `@HttpCode(202)` (Sesión 25) |
| Éxito sin body (DELETE, PUT sin respuesta) | **204 No Content** | `@HttpCode(204)` |
| Datos inválidos | 400 Bad Request | `BadRequestException`, `ValidationPipe` |
| No autenticado | 401 Unauthorized | `UnauthorizedException` (Sesión 18) |
| Autenticado pero sin permiso | 403 Forbidden | `ForbiddenException` (Sesión 19) |
| No existe | 404 Not Found | `NotFoundException` |
| Conflicto de estado (duplicado, versión) | 409 Conflict | `ConflictException` |
| Regla de negocio violada con datos bien formados | 422 Unprocessable Entity | `UnprocessableEntityException` |
| Demasiadas requests | 429 Too Many Requests | `@nestjs/throttler` (Sesión 20) |
| Error inesperado | 500 | cualquier excepción no-HTTP |

```ts
// Las excepciones HTTP incluidas generan un JSON consistente:
throw new NotFoundException(`Producto ${id} no existe`);
// → 404 {"message":"Producto 5 no existe","error":"Not Found","statusCode":404}

throw new ConflictException('Ya existe un producto con ese SKU');
// → 409 {"message":"Ya existe un producto con ese SKU","error":"Conflict","statusCode":409}
```

> ❓ **Entrevista**: *"¿400 o 422 para una regla de negocio?"* → Una convención extendida: **400** cuando el request está mal formado o no pasa la validación de esquema (falta un campo, tipo incorrecto); **422** cuando está bien formado pero viola una regla de negocio (stock insuficiente, fecha de entrega en el pasado). Lo importante es ser **consistente** en toda la API y documentarlo (Sesión 21).

> ⚠️ `401` significa "no sé quién eres" y `403` "sé quién eres y no puedes". Devolver 401 a un usuario autenticado sin permisos hace que el frontend lo mande al login en bucle.

---

## 6. Modo específico de librería: `@Res()`

Puedes pedir el objeto response nativo y manejarlo tú:

```ts
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@Get(':id')
obtener(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
  const producto = this.productosService.findOne(id);
  res.status(200).json(producto); // TÚ envías la respuesta
}
```

> ⚠️ En cuanto inyectas `@Res()` **sin** `passthrough`, Nest asume que tú envías la respuesta. Consecuencias: (1) si olvidas `res.json()` la request **queda colgada** hasta el timeout; (2) los **interceptors** que transforman la respuesta (Sesión 12) y `ClassSerializerInterceptor` (Sesión 21) dejan de funcionar porque no hay valor retornado; (3) quedas acoplado a Express y el código no funciona igual con Fastify.

### 6.1 La solución intermedia: `passthrough: true`

Tocas headers o cookies del objeto nativo, pero **sigues retornando** el valor para que Nest lo envíe:

```ts
@Post()
crear(
  @Body() dto: CreateProductoDto,
  @Res({ passthrough: true }) res: Response,
) {
  const producto = this.productosService.create(dto);
  res.location(`/productos/${producto.id}`); // header Location para el 201
  return producto;                           // Nest sigue serializando y aplicando interceptors
}
```

| Enfoque | Interceptors / serialización | Portabilidad Express↔Fastify | Riesgo |
|---|---|---|---|
| Retornar el valor (estándar) | ✅ | ✅ | — |
| `@Res({ passthrough: true })` + retornar | ✅ | ⚠️ los métodos de `res` difieren | Bajo |
| `@Res()` y `res.json()` | ❌ | ❌ | Requests colgadas, lógica duplicada |

Úsalo solo cuando sea necesario: cookies (Sesión 18), headers dinámicos, streaming manual (Sesión 26). Para `Content-Type` fijos y status fijos, prefiere `@Header` y `@HttpCode`.

> 💡 Fíjate en `import type { Response } from 'express'`: con `isolatedModules` + `emitDecoratorMetadata` (plantilla de Nest 11), un tipo usado en una firma decorada debe importarse como tipo (Sesión 2).

---

## 7. `ProductosController` completo de TiendaApi

```ts
// src/productos/productos.controller.ts
import {
  Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Patch, Post, Put, Query, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  // GET /productos?pagina=1&limite=20&categoriaId=3
  @Get()
  listar(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite: number,
    @Query('categoriaId', new ParseIntPipe({ optional: true })) categoriaId?: number,
  ) {
    // Nunca confíes en el cliente: acota el tamaño de página
    const limiteSeguro = Math.min(Math.max(limite, 1), 100);
    return this.productosService.listar({ pagina, limite: limiteSeguro, categoriaId });
  }

  // GET /productos/stock-bajo  ← ruta estática ANTES de :id
  @Get('stock-bajo')
  stockBajo(@Query('umbral', new DefaultValuePipe(5), ParseIntPipe) umbral: number) {
    return this.productosService.conStockBajo(umbral);
  }

  // GET /productos/42
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id); // 404 si no existe (lo lanza el service)
  }

  // POST /productos → 201 + Location
  @Post()
  crear(@Body() dto: CreateProductoDto, @Res({ passthrough: true }) res: Response) {
    const producto = this.productosService.create(dto);
    res.location(`/productos/${producto.id}`);
    return producto;
  }

  // PUT /productos/42 → reemplazo completo (todos los campos obligatorios)
  @Put(':id')
  reemplazar(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateProductoDto) {
    return this.productosService.update(id, dto);
  }

  // PATCH /productos/42 → solo los campos enviados
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }

  // DELETE /productos/42 → 204
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number): void {
    this.productosService.remove(id);
  }
}
```

`ParseIntPipe({ optional: true })` deja pasar `undefined` cuando el query param no viene, en lugar de responder 400.

Y el service correspondiente (sigue en memoria):

```ts
// src/productos/productos.service.ts (extracto)
import { Paginado, paginar } from '../common/dto/paginado'; // Sesión 2

export interface FiltroProductos { pagina: number; limite: number; categoriaId?: number }

@Injectable()
export class ProductosService {
  private readonly productos = new Map<number, Producto>();
  private siguienteId = 1;

  listar({ pagina, limite, categoriaId }: FiltroProductos): Paginado<Producto> {
    let items = [...this.productos.values()];
    if (categoriaId !== undefined) items = items.filter((p) => p.categoriaId === categoriaId);
    return paginar(items, pagina, limite);
  }

  conStockBajo(umbral: number): Producto[] {
    return [...this.productos.values()].filter((p) => p.stock < umbral);
  }
  // create, findOne, update, remove como en la Sesión 1
}
```

### 7.1 PUT vs PATCH vs POST

| Verbo | Semántica | Idempotente | Body |
|---|---|---|---|
| `POST /productos` | Crear (el servidor asigna id) | ❌ | Recurso completo sin id |
| `PUT /productos/42` | **Reemplazar** entero | ✅ | Recurso completo |
| `PATCH /productos/42` | Modificar parcialmente | No garantizado (en la práctica suele serlo) | Solo campos a cambiar |
| `DELETE /productos/42` | Eliminar | ✅ (el segundo DELETE puede dar 404, pero el estado final es el mismo) | — |

> ❓ **Entrevista**: *"¿Qué significa idempotente y por qué importa?"* → Que repetir la request produce el **mismo estado** en el servidor. Importa porque clientes, proxies y SDKs reintentan ante timeouts: reintentar un `PUT` es seguro; reintentar un `POST /ordenes` puede **duplicar la orden**. Para POST críticos se usa un header `Idempotency-Key` (lo implementamos con un interceptor en la Sesión 12).

---

## 8. Otras capacidades del routing

### 8.1 Sub-dominios

```ts
@Controller({ host: ':cuenta.tienda.cl' })
export class TiendaPorCuentaController {
  @Get()
  inicio(@HostParam('cuenta') cuenta: string) {
    return `Tienda de ${cuenta}`; // acme.tienda.cl → "Tienda de acme"
  }
}
```

> ⚠️ El routing por `host` funciona con la plataforma **Express**; la documentación de Nest indica que con Fastify no está soportado de la misma forma, y recomienda Express si lo necesitas.

### 8.2 Varios paths y `@All`

```ts
@Get(['catalogo', 'productos-publicos']) // dos rutas, mismo handler
catalogo() {}

@All('ping') // cualquier verbo
ping() { return 'pong'; }
```

### 8.3 Evitar tocar `@Req()`

`@Req()` te da el request nativo. Es tentador para leer `req.user` o `req.headers`, pero acopla el controller a la plataforma y complica los tests. La alternativa limpia es un **decorador de parámetro propio**:

```ts
// Vista previa de la Sesión 13
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

@Get('mias')
misOrdenes(@UsuarioActual() usuario: UsuarioAutenticado) {}
```

### 8.4 Cancelación

Nest no tiene un equivalente al `CancellationToken` de ASP.NET: si el cliente cierra la conexión, tu handler sigue ejecutándose. Para operaciones largas se puede escuchar el evento `close` del request nativo o delegar el trabajo a una cola (Sesión 25). En la mayoría de endpoints CRUD no hace falta.

---

## 9. Registrar y probar

Recuerda: un controller solo existe si está en `controllers` de un módulo alcanzable desde `AppModule` (Sesión 3). Verifica en el arranque:

```
[RoutesResolver] ProductosController {/api/productos}:
[RouterExplorer] Mapped {/api/productos, GET} route
[RouterExplorer] Mapped {/api/productos/stock-bajo, GET} route
[RouterExplorer] Mapped {/api/productos/:id, GET} route
[RouterExplorer] Mapped {/api/productos, POST} route
...
```

Archivo `tienda.http` (VS Code REST Client / JetBrains):

```http
@base = http://localhost:3000/api

### Crear
POST {{base}}/productos
Content-Type: application/json

{ "nombre": "Teclado", "precio": 49990, "stock": 3, "categoriaId": 1 }

### Listar paginado
GET {{base}}/productos?pagina=1&limite=10

### Id no numérico → 400
GET {{base}}/productos/abc

### Eliminar → 204
DELETE {{base}}/productos/1
```

Con `curl -i` verás el status y los headers (`Location` incluido).

---

## Resumen mental de la sesión

```
Controller = adaptador HTTP delgado: extrae → service → devuelve

Ruta final = globalPrefix + RouterModule + @Controller('x') + @Get(':id')
Orden: rutas ESTÁTICAS antes que :param
Nest 11 / Express 5: '*nombre' (array de segmentos) · '{/:opcional}' · sin regex en paths

@Param @Query @Body @Headers(minúsculas) @Ip @HostParam  → TODO llega como STRING
  → ParseIntPipe · DefaultValuePipe (antes del parse) · ParseBoolPipe · ParseUUIDPipe
    ParseEnumPipe · ParseArrayPipe · ParseIntPipe({ optional: true })
Express 5 query parser "simple": sin objetos anidados → app.set('query parser','extended')

Modo estándar: return valor → JSON · Promise/Observable soportados
  200 default · POST 201 · @HttpCode(204) · @Header · @Redirect (return {url} sobrescribe)
@Res() → TÚ respondes: sin interceptors, sin serializer, acoplado; olvido = request colgada
@Res({ passthrough: true }) → headers/cookies + sigues retornando

201+Location · 204 · 400 vs 422 · 401 vs 403 · 404 · 409
PUT reemplaza (idempotente) · PATCH parcial · POST no idempotente
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué responsabilidades tiene un controller y cuáles no? ¿Cómo detectas uno "gordo"?
2. ❓ ¿Cómo se compone la ruta final de un handler? ¿Por qué importa el orden de declaración de los métodos?
3. ❓ ¿Qué cambió en la sintaxis de rutas con Express 5 en Nest 11 (comodines, opcionales, regex)?
4. ❓ Si declaras `@Param('id') id: number`, ¿qué tipo llega realmente? ¿Cómo lo conviertes?
5. ❓ ¿Por qué `DefaultValuePipe` va antes que `ParseIntPipe`?
6. ❓ ¿Qué diferencia hay entre el query parser "simple" y "extended"? ¿Cuál usa Nest 11 por defecto?
7. ❓ Tu `@Body()` llega vacío: ¿qué revisas primero?
8. ❓ ¿Qué status devuelve Nest por defecto para GET y para POST? ¿Cómo devuelves 204?
9. ❓ ¿Qué pierdes al usar `@Res()`? ¿Qué resuelve `passthrough: true`?
10. ❓ ¿Cómo devuelves un 201 con header `Location`?
11. ❓ 400 vs 422, 401 vs 403: ¿cuándo cada uno?
12. ❓ ¿Qué es la idempotencia? ¿Qué verbos lo son y por qué importa para los reintentos?

## Ejercicio práctico
1. Implementa el `ProductosController` completo de la sección 7 con `setGlobalPrefix('api', { exclude: ['health'] })` y un `@Get('health')` en `AppController`.
2. Pon `@Get(':id')` **antes** de `@Get('stock-bajo')`, pide `/api/productos/stock-bajo` y observa el 400. Corrige el orden.
3. Prueba `GET /api/productos?limite=500` y verifica que se acota a 100. Prueba `?pagina=abc` y lee el error del pipe.
4. Verifica con `curl -i` que `POST` devuelve `201` y el header `Location`, y que `DELETE` devuelve `204` sin body.
5. Agrega `GET /api/productos/buscar?q=...&tag=a&tag=b`. Imprime cómo llega `tag` con uno y con dos valores. Luego prueba `?precio[min]=10` con el parser por defecto y con `app.set('query parser', 'extended')`.
6. Crea un `ArchivosController` con `@Get('*ruta')` y comprueba que el parámetro llega como array de segmentos.
7. Crea `GET /api/productos/:productoId/resenas{/:resenaId}` que devuelva todas las reseñas o una sola según venga el segundo parámetro.
8. Implementa `CategoriasController` y `UsuariosController` con el mismo patrón (paginación, 201 + Location, 204, `ParseIntPipe`).
9. Reescribe un handler con `@Res()` **sin** passthrough y **olvida** llamar a `res.json()`. Observa que la request se queda colgada. Luego conviértelo a `passthrough: true`.
10. Crea `tienda.http` con al menos un caso de éxito y uno de error por endpoint.

---

➡️ **Cuando termines**, marca la Sesión 4 en el [README](README.md) y pasa a la **Sesión 5 — Providers e Inyección de Dependencias (básico)**.
