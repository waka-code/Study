# Sesión 9 — Exception Filters y manejo global de errores

> **Objetivo de la sesión**: entender *cómo* Nest convierte una excepción en una respuesta HTTP y *por qué* conviene centralizar ese trabajo. Al terminar deberías poder usar `HttpException` y sus subclases correctamente, explicar qué hace la **capa de excepciones integrada**, escribir **exception filters** propios con `@Catch` y `ArgumentsHost`, aplicarlos a nivel de método, controller y global (y saber la diferencia entre `useGlobalFilters` y `APP_FILTER`), extender `BaseExceptionFilter`, mapear **errores de dominio** y de base de datos a status HTTP, y devolver un formato de error consistente basado en **Problem Details (RFC 9457)** sin filtrar información interna.

---

## 1. El problema: errores inconsistentes y `try/catch` por todas partes

Sin una estrategia, cada handler maneja errores a su manera:

```typescript
// ❌ Anti-patrón: try/catch en cada handler, formatos distintos, detalles internos filtrados
@Get(':id')
async buscar(@Param('id') id: string, @Res() res: Response) {
  try {
    const p = await this.productosService.buscar(+id);
    if (!p) return res.status(404).json({ error: 'no existe' });
    return res.json(p);
  } catch (e) {
    return res.status(500).json({ msg: e.message, stack: e.stack });   // 😱 stack trace al cliente
  }
}
```

Problemas: el frontend recibe `error`, `msg` o `message` según el endpoint; el stack trace revela rutas del servidor y versiones de librerías; y cada nuevo endpoint repite la lógica.

La idea de Nest: **los handlers y services lanzan excepciones; una capa central las traduce a respuestas**. Esa capa son los **exception filters**.

```
Handler / Service / Guard / Pipe / Interceptor
        │ throw
        ▼
┌───────────────────────── Exceptions Zone ─────────────────────────┐
│  ¿Hay un filter que haga @Catch de este tipo?                      │
│     método → controller → global  (el más específico primero)      │
│        sí → tu filter construye la respuesta                        │
│        no → BaseExceptionFilter (capa integrada de Nest)            │
└────────────────────────────────────────────────────────────────────┘
        │
        ▼
     Response HTTP (status + body JSON)
```

---

## 2. La capa de excepciones integrada

Nest trae un filtro global por defecto (`BaseExceptionFilter`). Su comportamiento:

| Lo que lanzas | Respuesta |
|---|---|
| `HttpException` o subclase | El status y el body de la excepción |
| Cualquier otra cosa (`Error`, `TypeError`, string...) | `500` con `{"statusCode":500,"message":"Internal server error"}` |

```typescript
throw new NotFoundException('Producto 42 no existe');
```

```json
{ "message": "Producto 42 no existe", "error": "Not Found", "statusCode": 404 }
```

```typescript
throw new Error('conexión rechazada a 10.0.3.17:5432');   // error "desconocido"
```

```json
{ "statusCode": 500, "message": "Internal server error" }
```

Fíjate en lo segundo: el mensaje real **no** llega al cliente. Es seguro por defecto. El error sí se **loguea** en la consola del servidor con su stack.

> 💡 **Qué se loguea**: el `BaseExceptionFilter` loguea los errores desconocidos (500) y **no** loguea las `HttpException`, porque se consideran parte del flujo normal (un 404 no es un incidente). Nest 11 agrega **`IntrinsicException`** en `@nestjs/common`: excepciones que el framework **no** auto-loguea, útil para errores esperados que no son HTTP.

---

## 3. `HttpException` y sus subclases

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

// Forma base: (respuesta, status, opciones)
throw new HttpException('Acceso denegado', HttpStatus.FORBIDDEN);
// → { "statusCode": 403, "message": "Acceso denegado" }

// Body como objeto: reemplaza COMPLETAMENTE el body por defecto
throw new HttpException(
  { code: 'STOCK_INSUFICIENTE', message: 'Solo quedan 2 unidades', disponibles: 2 },
  HttpStatus.CONFLICT,
  { cause: errorOriginal },   // 'cause' se guarda para logging, NO se envía al cliente
);
```

Las subclases integradas (todas en `@nestjs/common`) evitan recordar códigos:

| Excepción | Status | Uso típico en TiendaApi |
|---|---|---|
| `BadRequestException` | 400 | Validación (la lanza el `ValidationPipe`, Sesión 6) |
| `UnauthorizedException` | 401 | Falta token o es inválido (Sesión 18) |
| `ForbiddenException` | 403 | Autenticado pero sin permiso (Sesión 19) |
| `NotFoundException` | 404 | Producto/orden no existe |
| `MethodNotAllowedException` | 405 | — |
| `NotAcceptableException` | 406 | Formato no soportado |
| `RequestTimeoutException` | 408 | Interceptor de timeout (Sesión 12) |
| `ConflictException` | 409 | Email duplicado, stock insuficiente, versión desactualizada |
| `GoneException` | 410 | Recurso eliminado permanentemente |
| `PayloadTooLargeException` | 413 | Upload excesivo (Sesión 26) |
| `UnsupportedMediaTypeException` | 415 | `Content-Type` incorrecto |
| `UnprocessableEntityException` | 422 | Semánticamente inválido |
| `InternalServerErrorException` | 500 | Error genérico explícito |
| `NotImplementedException` | 501 | Endpoint pendiente |
| `BadGatewayException` | 502 | Falló el proveedor de pagos |
| `ServiceUnavailableException` | 503 | Mantenimiento, dependencia caída |
| `GatewayTimeoutException` | 504 | El tercero no respondió a tiempo |

Todas aceptan `(mensaje | objeto, opciones)` donde las opciones son `{ cause?, description? }`:

```typescript
throw new BadRequestException('Cupón vencido', { cause: err, description: 'CUPON_VENCIDO' });
// → { "message": "Cupón vencido", "error": "CUPON_VENCIDO", "statusCode": 400 }
```

> ⚠️ **401 vs 403**: 401 = "no sé quién eres" (no autenticado); 403 = "sé quién eres y no puedes". Confundirlos rompe los interceptors de frontend que, ante un 401, intentan refrescar el token.

> ❓ **Entrevista**: *"¿Qué responde Nest si un service lanza `new Error('x')`?"* → Un 500 con `{"statusCode":500,"message":"Internal server error"}`. El mensaje real no se expone; se loguea en el servidor. Solo las `HttpException` (y subclases) controlan status y body.

---

## 4. ¿Dónde lanzar `HttpException`? El debate de las capas

Lanzar `NotFoundException` desde el service es cómodo y lo verás en la documentación oficial. Pero acopla tu lógica de negocio a HTTP: si el mismo service se usa desde un consumer de colas (Sesión 25), un gateway WebSocket (Sesión 27) o un microservicio (Sesión 29), un "404" no significa nada.

```
Opción A (pragmática):  Service lanza NotFoundException ──────────────▶ filtro integrado → 404
Opción B (por capas):   Service lanza ProductoNoEncontradoError ──▶ DominioExceptionFilter → 404
                                                        (misma clase en colas/WS → otra traducción)
```

| | Opción A: `HttpException` en services | Opción B: errores de dominio + filter |
|---|---|---|
| Simplicidad | ✅ Muy simple | Una clase de error + un filter |
| Reutilización fuera de HTTP | ❌ | ✅ |
| Testing del service | Tests conocen HTTP | Tests hablan el idioma del negocio |
| Recomendado para | CRUD pequeños, junior | Apps medianas/grandes, hexagonal (Sesión 30) |

Implementación de la opción B:

```typescript
// src/common/errors/dominio.error.ts — SIN imports de @nestjs
export abstract class DominioError extends Error {
  abstract readonly codigo: string;
  constructor(mensaje: string, options?: { cause?: unknown }) {
    super(mensaje, options);
    this.name = new.target.name;       // nombre real de la subclase en logs
  }
}

export class RecursoNoEncontradoError extends DominioError {
  readonly codigo = 'RECURSO_NO_ENCONTRADO';
  constructor(recurso: string, id: string | number) {
    super(`${recurso} ${id} no existe`);
  }
}

export class StockInsuficienteError extends DominioError {
  readonly codigo = 'STOCK_INSUFICIENTE';
  constructor(readonly productoId: number, readonly disponibles: number) {
    super(`Stock insuficiente para el producto ${productoId}`);
  }
}

export class ReglaNegocioError extends DominioError {
  readonly codigo = 'REGLA_NEGOCIO';
}
```

```typescript
// ordenes.service.ts — el service no sabe nada de HTTP
async crear(dto: CrearOrdenDto) {
  for (const item of dto.items) {
    const producto = await this.productos.buscar(item.productoId);
    if (!producto) throw new RecursoNoEncontradoError('Producto', item.productoId);
    if (producto.stock < item.cantidad) throw new StockInsuficienteError(producto.id, producto.stock);
  }
  // ...
}
```

El filter que los traduce lo escribimos en la sección 6.

---

## 5. Anatomía de un exception filter

```typescript
// src/common/filters/http-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)                                  // ¿qué tipos atrapa? (vacío = TODO)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();                   // ArgumentsHost → contexto HTTP
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception.getStatus();

    res.status(status).json({
      statusCode: status,
      path: req.url,
      timestamp: new Date().toISOString(),
      detalle: exception.getResponse(),                // string u objeto original
    });
  }
}
```

Piezas:

| Pieza | Qué es |
|---|---|
| `@Catch(A, B, ...)` | Tipos que el filter maneja (usa `instanceof`). Sin argumentos: atrapa todo. |
| `ExceptionFilter<T>` | Interface con `catch(exception: T, host: ArgumentsHost)`. |
| `ArgumentsHost` | Abstracción de los argumentos del handler, **independiente del transporte**. |
| `host.getType()` | `'http'`, `'rpc'` o `'ws'` (y `'graphql'` con `GqlArgumentsHost`, Sesión 28). |
| `host.switchToHttp()` | `getRequest()`, `getResponse()`, `getNext()`. |
| `exception.getStatus()` / `getResponse()` | Status y body de una `HttpException`. |

¿Por qué `ArgumentsHost` y no directamente `(req, res)`? Porque el mismo mecanismo de filters sirve para HTTP, WebSockets y microservicios, donde "los argumentos" son otros (un `Socket` y un payload, un contexto RPC). `ArgumentsHost` es la base de `ExecutionContext` que verás en guards (Sesión 11).

> ⚠️ Un filter **debe responder** (o relanzar). Si atrapas la excepción y no envías nada, la request queda colgada igual que un middleware sin `next()`.

---

## 6. Filter de dominio: traducir errores de negocio a HTTP

```typescript
// src/common/filters/dominio-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DominioError, RecursoNoEncontradoError, ReglaNegocioError, StockInsuficienteError,
} from '../errors/dominio.error';

@Catch(DominioError)                                    // atrapa DominioError y TODAS sus subclases
export class DominioExceptionFilter implements ExceptionFilter<DominioError> {
  // Tabla de traducción: un único lugar donde el negocio se vuelve HTTP
  private statusPara(error: DominioError): number {
    if (error instanceof RecursoNoEncontradoError) return HttpStatus.NOT_FOUND;
    if (error instanceof StockInsuficienteError) return HttpStatus.CONFLICT;
    if (error instanceof ReglaNegocioError) return HttpStatus.UNPROCESSABLE_ENTITY;
    return HttpStatus.BAD_REQUEST;
  }

  catch(error: DominioError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status = this.statusPara(error);

    res.status(status).json({
      statusCode: status,
      code: error.codigo,
      message: error.message,
      // Datos extra seguros de exponer, solo para errores específicos
      ...(error instanceof StockInsuficienteError && { disponibles: error.disponibles }),
    });
  }
}
```

Ahora el `OrdenesService` de la sección 4 produce un 409 con `code: "STOCK_INSUFICIENTE"` sin tocar HTTP.

---

## 7. Dónde aplicar un filter (binding)

```typescript
// 1) Método
@Post()
@UseFilters(DominioExceptionFilter)          // pasa la CLASE (Nest la instancia y puede reutilizarla)
crear(@Body() dto: CrearOrdenDto) {}

// 2) Controller: todas sus rutas
@UseFilters(DominioExceptionFilter)
@Controller('ordenes')
export class OrdenesController {}

// 3a) Global en main.ts — SIN inyección de dependencias
app.useGlobalFilters(new DominioExceptionFilter());

// 3b) Global como provider — CON inyección de dependencias (recomendado)
import { APP_FILTER } from '@nestjs/core';

@Module({
  providers: [
    { provide: APP_FILTER, useClass: DominioExceptionFilter },
    { provide: APP_FILTER, useClass: TodoExceptionFilter },
  ],
})
export class AppModule {}
```

| | `useGlobalFilters(new X())` | `APP_FILTER` |
|---|---|---|
| DI (logger, config, métricas) | ❌ Tú haces `new` | ✅ |
| Incluido en tests e2e automáticamente | ❌ Hay que repetirlo | ✅ Viene con el módulo |
| Dónde se declara | `main.ts` | Cualquier módulo (sigue siendo **global**) |

> ⚠️ `@UseFilters(new X())` (instancia) también funciona, pero pasar la **clase** permite a Nest reutilizar una única instancia y resolver dependencias del módulo.

> ⚠️ Un `APP_FILTER` declarado en `ProductosModule` **no** es "solo para productos": es global. Por claridad, declara los globales en `AppModule` o en un `CoreModule`.

### 7.1 Qué filter gana

Cuando se lanza una excepción, Nest busca el **primer** filter que coincida, del más específico al más general: **método → controller → global**. Solo se ejecuta **uno**.

Si registras varios filters globales, el orden importa. La documentación indica que el filter "atrapa todo" debe declararse **primero** para que el específico pueda manejar su tipo:

```typescript
app.useGlobalFilters(new TodoExceptionFilter(), new DominioExceptionFilter());
//                   ↑ catch-all primero        ↑ el específico se evalúa antes
```

(Internamente Nest evalúa la lista en orden inverso.) Con `APP_FILTER`, el orden de evaluación depende del orden de registro de providers; para evitar sorpresas, muchos equipos usan **un solo filter global** que decide internamente por tipo (sección 9).

> ❓ **Entrevista**: *"Si tengo un filter global y uno en el controller que atrapan el mismo tipo, ¿cuál se ejecuta?"* → El del controller. Nest busca de lo más específico (método) a lo más general (global) y ejecuta solo el primero que coincide; las excepciones no "burbujean" por varios filters.

---

## 8. Extender `BaseExceptionFilter`: agrega, no reemplaces

A veces quieres **solo agregar** comportamiento (reportar a Sentry, métricas) y dejar que Nest responda como siempre:

```typescript
import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()                                            // todo
export class ReportarErroresFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const esEsperado = exception instanceof HttpException && exception.getStatus() < 500;
    if (!esEsperado) {
      // reportarASentry(exception);  ← Sesión 32
    }
    super.catch(exception, host);                   // respuesta estándar de Nest
  }
}
```

Registro: `BaseExceptionFilter` necesita la referencia al adaptador HTTP.

```typescript
// Con APP_FILTER: Nest inyecta el HttpAdapterHost automáticamente
{ provide: APP_FILTER, useClass: ReportarErroresFilter }

// Con useGlobalFilters: pásalo tú
const { httpAdapter } = app.get(HttpAdapterHost);
app.useGlobalFilters(new ReportarErroresFilter(httpAdapter));
```

> ⚠️ Los filters que extienden `BaseExceptionFilter` **no** deben instanciarse con `new` en `@UseFilters()` a nivel de método/controller: les faltaría el adaptador. Usa la clase o regístralos globalmente.

---

## 9. El filter global de producción: Problem Details (RFC 9457)

Un formato estándar de error evita que cada equipo invente el suyo. **RFC 9457** (que reemplaza a RFC 7807) define `application/problem+json`:

```json
{
  "type": "https://api.tienda.cl/errores/stock-insuficiente",
  "title": "Stock insuficiente",
  "status": 409,
  "detail": "Solo quedan 2 unidades del producto 17",
  "instance": "/ordenes",
  "code": "STOCK_INSUFICIENTE",
  "traceId": "0b6f...e1"
}
```

`type`, `title`, `status`, `detail`, `instance` son los campos estándar; puedes agregar **extensiones** (`code`, `traceId`, `errors`).

Filter global, **agnóstico de plataforma** (funciona con Express y Fastify gracias a `HttpAdapterHost`):

```typescript
// src/common/filters/problem-details.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DominioError, RecursoNoEncontradoError, StockInsuficienteError } from '../errors/dominio.error';
import { RequestContext } from '../contexto/request-context';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [extension: string]: unknown;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  constructor(
    private readonly adapterHost: HttpAdapterHost,     // DI ✅ (registrado con APP_FILTER)
    private readonly contexto: RequestContext,         // correlation ID de la Sesión 8
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // Este filter asume una app solo HTTP. En apps híbridas (WS/RPC) usa filters por transporte
    // (Sesiones 27 y 29): un filter HTTP no debe intentar escribir una respuesta HTTP para un mensaje.
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const problema = this.aProblema(exception);
    problema.instance = httpAdapter.getRequestUrl(ctx.getRequest());
    problema.traceId = this.contexto.get()?.correlationId;

    if (problema.status >= 500) {
      // Log completo con stack SOLO en el servidor
      this.logger.error(`[${problema.traceId}] ${String(exception)}`, (exception as Error)?.stack);
    }

    httpAdapter.setHeader(ctx.getResponse(), 'Content-Type', 'application/problem+json');
    httpAdapter.reply(ctx.getResponse(), problema, problema.status);
  }

  private aProblema(exception: unknown): ProblemDetails {
    // 1) Errores de dominio
    if (exception instanceof DominioError) {
      const status =
        exception instanceof RecursoNoEncontradoError ? 404 :
        exception instanceof StockInsuficienteError ? 409 : 422;
      return {
        type: `https://api.tienda.cl/errores/${exception.codigo.toLowerCase().replaceAll('_', '-')}`,
        title: exception.name,
        status,
        detail: exception.message,
        code: exception.codigo,
      };
    }

    // 2) HttpException (incluye las de validación del ValidationPipe)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const mensaje = typeof body === 'string' ? body : (body as { message?: string | string[] }).message;
      return {
        type: 'about:blank',                         // RFC: "about:blank" cuando no hay tipo específico
        title: HttpStatus[status] ?? 'Error',
        status,
        detail: Array.isArray(mensaje) ? 'La request tiene campos inválidos' : mensaje,
        ...(Array.isArray(mensaje) && { errors: mensaje }),   // lista de errores de validación
      };
    }

    // 3) Todo lo demás: 500 sin detalles internos
    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Ocurrió un error inesperado. Usa el traceId para reportarlo.',
    };
  }
}
```

```typescript
// app.module.ts
providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
```

¿Por qué `httpAdapter.reply()` en vez de `res.status().json()`? Porque `res.status().json()` es API de **Express**. Con Fastify la respuesta es un `FastifyReply` con `code().send()`. `HttpAdapterHost` abstrae esa diferencia (Sesión 33).

> ⚠️ **Nunca** envíes `exception.message` de un error desconocido al cliente. Mensajes como `duplicate key value violates unique constraint "usuarios_email_key"` o `connect ECONNREFUSED 10.0.3.17:5432` revelan tu esquema y tu red (OWASP API8: *Security Misconfiguration*).

> ❓ **Entrevista**: *"¿Qué debería ver el cliente cuando hay un 500?"* → Un mensaje genérico y un identificador de correlación (traceId). Nada de stack traces, mensajes de la BD ni rutas internas. El detalle completo va al log del servidor, indexado por ese traceId, para que soporte pueda encontrarlo.

---

## 10. Errores de base de datos: mapearlos, no filtrarlos

Garantizar unicidad con un índice único en la BD (lo correcto, Sesión 6) implica que el insert **falla** con un error del driver. Hay que traducirlo:

```typescript
// Ejemplo con Prisma (Sesión 15). Con TypeORM sería QueryFailedError y el código de Postgres '23505'.
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const res = host.switchToHttp().getResponse();

    const mapa: Record<string, { status: number; detail: string }> = {
      P2002: { status: HttpStatus.CONFLICT, detail: 'Ya existe un registro con esos datos únicos' },
      P2025: { status: HttpStatus.NOT_FOUND, detail: 'El registro no existe' },
      P2003: { status: HttpStatus.CONFLICT, detail: 'Referencia a un registro inexistente' },
    };
    const m = mapa[error.code] ?? { status: 500, detail: 'Error de base de datos' };

    httpAdapter.reply(res, { type: 'about:blank', title: HttpStatus[m.status], status: m.status, detail: m.detail }, m.status);
  }
}
```

> 💡 Alternativa por capas: el **repositorio** captura el error del driver y lanza un `DominioError` (`EmailYaRegistradoError`). Así el filter global no conoce Prisma/TypeORM y cambiar de ORM no toca la capa HTTP (Sesión 17 y 30).

---

## 11. Qué capturan los filters (y qué no)

| Origen de la excepción | ¿La capturan los filters? |
|---|---|
| Handler (sync o `async` con `await`/`return`) | ✅ |
| Pipes, guards, interceptors | ✅ (están dentro de la zona de excepciones) |
| Middleware registrado con `MiddlewareConsumer` | ✅ solo filters **globales** (Sesión 8) |
| Middleware de `app.use()` puro de Express | ❌ lo maneja Express |
| Una promesa **no** awaited (`this.email.enviar()` sin `await`) | ❌ → `unhandledRejection` |
| `setTimeout`, event emitters, callbacks sueltos | ❌ fuera del flujo de la request |
| Excepciones lanzadas **dentro** de un filter | ❌ (no hay un filter para el filter) |
| Errores de arranque (config inválida, Sesión 7) | ❌ la app no arranca |

```typescript
// ❌ Fire-and-forget: si falla, nadie lo captura y en Node ≥ 15 el proceso puede TERMINAR
@Post()
async crear(@Body() dto: CrearOrdenDto) {
  const orden = await this.ordenes.crear(dto);
  this.email.enviarConfirmacion(orden);        // sin await ni .catch
  return orden;
}

// ✅ Si de verdad es "en segundo plano", maneja su error explícitamente (o usa una cola, Sesión 25)
this.email.enviarConfirmacion(orden).catch((e) => this.logger.error('Falló email', e));
```

> ⚠️ Desde Node 15, una `unhandledRejection` sin manejador **termina el proceso** por defecto. En un contenedor eso significa reinicio, requests en vuelo perdidas y una alerta a las 3 AM.

---

## 12. Filters fuera de HTTP (adelanto)

| Contexto | Excepción típica | Filter base |
|---|---|---|
| HTTP | `HttpException` | `BaseExceptionFilter` (`@nestjs/core`) |
| WebSockets | `WsException` | `BaseWsExceptionFilter` (`@nestjs/websockets`) — Sesión 27 |
| Microservicios | `RpcException` | `BaseRpcExceptionFilter` (`@nestjs/microservices`) — Sesión 29 |
| GraphQL | `GraphQLError` | `GqlExceptionFilter` (`@nestjs/graphql`) — Sesión 28 |

Por eso el filter de la sección 9 asume una app solo HTTP: en una app híbrida, un filter global HTTP no debe intentar escribir una respuesta HTTP para un mensaje de Kafka. Usa `host.getType()` para ramificar o registra filters específicos por transporte (en RPC, por ejemplo, el filter debe devolver un `Observable` con `throwError`).

---

## Resumen mental de la sesión

```
Handlers/services LANZAN; los filters TRADUCEN a HTTP (sin try/catch por handler)

Capa integrada (BaseExceptionFilter):
  HttpException → su status y body
  otra cosa     → 500 "Internal server error" (mensaje real solo al log)
  HttpException no se loguea; Nest 11: IntrinsicException (no auto-logueada)

HttpException(body, status, { cause, description }) + subclases (NotFound, Conflict...)
401 = no autenticado · 403 = sin permiso · 409 = conflicto de estado · 422 = semántica

Filter: @Catch(Tipo...) class X implements ExceptionFilter { catch(ex, host: ArgumentsHost) }
  host.getType() http|rpc|ws · host.switchToHttp().getRequest/getResponse
  SIEMPRE responder (o relanzar)

Binding: @UseFilters (método/controller, pasa la CLASE) · useGlobalFilters(new) sin DI
         APP_FILTER con DI (global aunque se declare en otro módulo)
Gana el más específico: método → controller → global; se ejecuta UNO
Varios globales: catch-all declarado PRIMERO
Extender BaseExceptionFilter + super.catch() → agregar sin reemplazar (necesita httpAdapter)

Producción: un filter global → Problem Details (RFC 9457) + traceId, HttpAdapterHost.reply
Errores de dominio (sin @nestjs) → filter los mapea; errores de BD → 409/404, nunca el mensaje crudo
No capturan: promesas sin await, callbacks sueltos, errores dentro de filters, app.use puro
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué hace la capa de excepciones integrada de Nest con una `HttpException` y con un `Error` genérico?
2. ❓ ¿Qué diferencia hay entre 401 y 403? ¿Y entre 409 y 422?
3. ❓ ¿Para qué sirve la opción `cause` de `HttpException`? ¿Se envía al cliente?
4. ❓ ¿Lanzarías `NotFoundException` desde un service? Argumenta a favor y en contra.
5. ❓ ¿Qué es `ArgumentsHost` y por qué los filters no reciben `(req, res)` directamente?
6. ❓ `useGlobalFilters` vs `APP_FILTER`: ¿cuál usarías y por qué?
7. ❓ Si hay filters a nivel de método, controller y global para el mismo tipo, ¿cuál se ejecuta?
8. ❓ ¿Cuándo extenderías `BaseExceptionFilter` en vez de implementar `ExceptionFilter`?
9. ❓ ¿Qué es Problem Details (RFC 9457) y qué campos tiene?
10. ❓ ¿Por qué usar `HttpAdapterHost` en un filter global?
11. ❓ ¿Cómo manejarías un error de unicidad de la base de datos?
12. ❓ Nombra tres tipos de errores que los exception filters **no** capturan.

## Ejercicio práctico
1. En TiendaApi, haz que `GET /productos/:id` lance `NotFoundException` y observa el body por defecto. Luego lanza un `new Error('secreto interno')` y verifica que el cliente solo ve "Internal server error" y el log sí muestra el stack.
2. Crea `DominioError` y sus subclases (`RecursoNoEncontradoError`, `StockInsuficienteError`, `ReglaNegocioError`) en `src/common/errors`, **sin** imports de `@nestjs`.
3. Refactoriza `ProductosService` y `OrdenesService` para lanzar errores de dominio en vez de `HttpException`.
4. Implementa `ProblemDetailsFilter` con `HttpAdapterHost` y regístralo con `APP_FILTER`. Verifica el header `Content-Type: application/problem+json`.
5. Envía un body inválido a `POST /productos` y comprueba que los errores del `ValidationPipe` (Sesión 6) aparecen en la extensión `errors`.
6. Integra el `traceId` usando el `RequestContext` de la Sesión 8 y comprueba que el mismo ID aparece en el header `x-correlation-id`, en el body del error y en el log.
7. Agrega un `@UseFilters()` a nivel de controller que atrape `StockInsuficienteError` con otro formato, y verifica que tiene prioridad sobre el global.
8. Crea `ReportarErroresFilter extends BaseExceptionFilter` que solo loguee los 5xx con un prefijo `[ALERTA]` y delegue en `super.catch`.
9. Crea un endpoint que haga una llamada *fire-and-forget* que rechaza. Observa qué pasa con el proceso y corrígelo con `.catch()`.
10. (Opcional) Arranca con `@nestjs/platform-fastify` y confirma que tu `ProblemDetailsFilter` funciona sin cambios gracias a `HttpAdapterHost`.

---

➡️ **Cuando termines**, marca la Sesión 9 en el [README](README.md) y pasa a la **Sesión 10 — Pipes: built-in, custom, transformación y validación**.
