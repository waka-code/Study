# Sesión 8 — Middleware

> **Objetivo de la sesión**: entender qué es un middleware en Nest, *dónde* se ubica en el ciclo de vida de la request y *por qué* existe junto a guards, interceptors y pipes. Al terminar deberías poder escribir middleware de clase (con DI) y funcional, registrarlo con `MiddlewareConsumer` (`apply`, `forRoutes`, `exclude`), entender los cambios de rutas y wildcards que trajo **Express 5 en Nest 11**, aplicar middleware global, integrar librerías del ecosistema Express (helmet, compression, cookie-parser), construir un **correlation ID** con `AsyncLocalStorage` y, sobre todo, saber **cuándo NO usar middleware**.

---

## 1. Qué es un middleware (y de dónde viene)

Nest corre **encima** de un adaptador HTTP: Express (default) o Fastify (Sesión 1). Un middleware en Nest es, por defecto, **exactamente un middleware de Express**: una función `(req, res, next)` que se ejecuta **antes** del route handler y puede:

1. Ejecutar código arbitrario.
2. Modificar `req` y `res` (agregar propiedades, headers).
3. Terminar el ciclo request/response (responder directamente → *cortocircuito*).
4. Llamar a `next()` para pasar al siguiente middleware.

```
Request ─▶ MW global 1 ─▶ MW global 2 ─▶ MW de módulo ─▶ [ zona Nest: Guards → Interceptors → Pipes → Handler ]
              │                 │               │
              │ next()          │ next()        │ next()
              └── o responde ───┴── o responde ─┴── (cortocircuito: la request no llega al handler)
```

Esta es la posición de middleware en el **ciclo de vida completo** que irás armando en el Bloque 2:

```
                      ┌────────────────── ExceptionsZone (filters, Sesión 9) ──────────────────┐
Request ─▶ MIDDLEWARE ─┼─▶ Guards (11) ─▶ Interceptors antes (12) ─▶ Pipes (10) ─▶ Handler      │
                      │                                                             │         │
Response ◀────────────┼── Interceptors después (12) ◀───────────────────────────────┘         │
                      └──────────────────────────────────────────────────────────────────────┘
```

(El orden completo, con global/controller/método, lo consolidamos en la Sesión 13.)

### 1.1 La diferencia clave: middleware **no sabe** qué handler se ejecutará

Un middleware recibe `req`, `res` y `next`. **No recibe `ExecutionContext`**: no sabe qué controller ni qué método atenderá la request, ni puede leer su metadata (`@Roles('admin')`, `@Public()`). Es "tonto" a propósito: opera a nivel HTTP crudo.

> ❓ **Entrevista**: *"¿Por qué no hacer la autorización en un middleware?"* → Porque el middleware no tiene acceso al `ExecutionContext`: no sabe qué handler se va a ejecutar ni puede leer su metadata (roles, `@Public()`). Los **guards** sí (vía `Reflector`) y además corren después de todos los middleware, con el usuario ya autenticado. Middleware sirve para concerns HTTP genéricos; la autorización por ruta es trabajo de guards (Sesión 11).

---

## 2. Middleware de clase

```typescript
// src/common/middleware/request-logger.middleware.ts
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()                                 // participa de la DI como cualquier provider
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const inicio = process.hrtime.bigint();
    const { method, originalUrl } = req;

    // 'finish' se emite cuando la response terminó de enviarse: aquí ya conocemos el status
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - inicio) / 1_000_000;
      this.logger.log(`${method} ${originalUrl} → ${res.statusCode} (${ms.toFixed(1)} ms)`);
    });

    next();                                   // ⚠️ si no llamas next() ni respondes, la request queda colgada
  }
}
```

Ventajas de la versión de clase:
- **Inyección de dependencias** en el constructor (un `ConfigService`, un repositorio...).
- Es testeable como cualquier provider.

```typescript
@Injectable()
export class MantenimientoMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}      // DI ✅

  use(req: Request, res: Response, next: NextFunction) {
    if (this.config.get('MODO_MANTENIMIENTO') === 'true') {
      // Cortocircuito: respondemos y NO llamamos next()
      res.status(503).json({ statusCode: 503, message: 'TiendaApi en mantenimiento' });
      return;
    }
    next();
  }
}
```

> ⚠️ **Olvidar `next()`** es el bug clásico de middleware: la request queda colgada hasta que el cliente o el load balancer hacen timeout (típicamente 60 s en un ALB). No hay error, no hay log. Toda rama del código debe terminar en `next()`, en `next(error)` o en una respuesta.

> ⚠️ **Llamar `next()` Y responder** también es un bug: el handler intentará responder de nuevo y verás `Cannot set headers after they are sent to the client`.

---

## 3. Registrar middleware: `MiddlewareConsumer`

Los middleware **no** se declaran en el decorador `@Module`. Se registran en el método `configure()` de una clase de módulo que implementa `NestModule`:

```typescript
// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ProductosController } from './productos/productos.controller';

@Module({
  imports: [ProductosModule, UsuariosModule, OrdenesModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('{*splat}');                              // todas las rutas (sintaxis Express 5 / Nest 11)

    consumer
      .apply(MantenimientoMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },     // el health check debe seguir respondiendo
        'admin/{*splat}',
      )
      .forRoutes(ProductosController, OrdenesController);  // por controller: todas sus rutas

    consumer
      .apply(AuditoriaMiddleware)
      .forRoutes({ path: 'ordenes', method: RequestMethod.POST }); // ruta + método concreto
  }
}
```

¿Por qué en `configure()` y no en `@Module`? Porque registrar middleware es **configurar el adaptador HTTP** (Express/Fastify), y necesita conocer rutas y controllers ya resueltos. `configure()` se llama durante la inicialización, y puede ser `async`.

### 3.1 Formas de `forRoutes` y `exclude`

| Argumento | Ejemplo | Significado |
|---|---|---|
| String | `'productos'` | Esa ruta, todos los métodos |
| String con wildcard | `'productos/{*splat}'` | `/productos` y todo lo que cuelga |
| `RouteInfo` | `{ path: 'ordenes', method: RequestMethod.POST }` | Ruta + método |
| Controller | `ProductosController` | Todas las rutas del controller |
| Varios | `.forRoutes(A, B, 'x')` | Unión |

- `apply(A, B, C)` registra varios middleware que se ejecutan **en ese orden**.
- `exclude()` acepta strings o `RouteInfo` y se aplica a lo que viene en `forRoutes`.
- Las rutas de `forRoutes` son **relativas al prefijo global**: con `app.setGlobalPrefix('api')`, `forRoutes('productos')` aplica a `/api/productos`.

### 3.2 ⚠️ Express 5 en Nest 11: cambió la sintaxis de rutas

Nest 11 usa **Express 5** por defecto, y Express 5 actualizó `path-to-regexp` (v8). Esto afecta a `forRoutes`, `exclude` y a tus `@Get()`:

| Nest ≤ 10 (Express 4) | Nest 11 (Express 5) | Nota |
|---|---|---|
| `forRoutes('*')` | `forRoutes('{*splat}')` | El wildcard **debe tener nombre** |
| `'productos/*'` | `'productos/*splat'` | No matchea `/productos` (sin nada después) |
| — | `'productos/{*splat}'` | Llaves = opcional: matchea `/productos` **y** `/productos/x/y` |
| `'(.*)'` | `'{*splat}'` | Regex en rutas ya no se soportan |
| `':archivo.:ext?'` | `':archivo{.:ext}'` | `?` ya no existe: los opcionales van entre llaves |
| `'ab+cd'`, `'(a|b)'` | Escapar `\\(` `\\+` | `()[]?+!` son caracteres reservados |

`splat` es solo un nombre convencional: puedes llamarlo `*path` o `*resto`. Nest intenta convertir automáticamente algunos patrones antiguos y avisa por consola, pero **no dependas de eso**: migra a la sintaxis nueva.

Con **Fastify v5** (también en Nest 11), el patrón `(.*)` para middleware tampoco se soporta; se usan wildcards con nombre como `'*splat'`.

> ❓ **Entrevista**: *"Migré a Nest 11 y mi middleware con `forRoutes('*')` da warnings o no aplica donde esperaba, ¿por qué?"* → Express 5 usa `path-to-regexp` v8, donde los wildcards deben tener nombre. Se reemplaza por `forRoutes('{*splat}')`; las llaves hacen que también matchee la raíz del path.

---

## 4. Middleware funcional

Si el middleware no necesita dependencias, una función basta:

```typescript
// src/common/middleware/no-cache.middleware.ts
import { NextFunction, Request, Response } from 'express';

export function noCache(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');   // datos de usuario: que ningún proxy los cachee
  next();
}

// app.module.ts
consumer.apply(noCache).forRoutes('usuarios/{*splat}', 'ordenes/{*splat}');
```

| | Clase (`@Injectable`) | Funcional |
|---|---|---|
| DI | ✅ | ❌ |
| Testeable | ✅ con `TestingModule` | ✅ como función pura |
| Ceremonia | Más | Mínima |
| Cuándo | Necesita config, servicios, logger de Nest | Lógica simple y sin estado |

---

## 5. Middleware global: `app.use()`

```typescript
// main.ts
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

const app = await NestFactory.create(AppModule);

app.use(helmet());          // headers de seguridad (Sesión 20)
app.use(compression());     // gzip/brotli de respuestas (Sesión 26)
app.use(cookieParser());    // req.cookies
```

`app.use()` pasa el middleware **directamente** al adaptador (Express). Consecuencias:

| | `app.use()` en `main.ts` | `consumer.apply().forRoutes('{*splat}')` |
|---|---|---|
| Momento | Antes que cualquier middleware de módulo | Después de los globales de `app.use` |
| DI | ❌ (tú haces `new`) | ✅ |
| Rutas no existentes (404) | ✅ se ejecuta | Depende del patrón de ruta |
| En tests e2e | Tienes que repetirlo en la app de test | Viene con el módulo |

> ⚠️ Si pasas una clase a `app.use(new MiMiddleware())` no funciona: `app.use` espera una **función**. Tendrías que hacer `app.use((req, res, next) => mw.use(req, res, next))`. Si el middleware necesita DI, regístralo con `MiddlewareConsumer` en el módulo raíz.

> 💡 Muchos equipos extraen la configuración de `main.ts` a una función `configurarApp(app)` que llaman **tanto** desde `main.ts` como desde el setup de los tests e2e (Sesión 22). Así el middleware global, los pipes y los filters son idénticos en ambos.

### 5.1 Body parsing en Nest 11 / Express 5

Nest registra el body parser (JSON y urlencoded) por ti. Puedes ajustarlo:

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,             // expone req.rawBody (necesario para verificar firmas de webhooks, p. ej. Stripe)
});
app.useBodyParser('json', { limit: '1mb' });   // límite de tamaño (protege memoria)
```

> ⚠️ En Express 5, si no hay body parseado, `req.body` es `undefined` (en Express 4 solía ser `{}`). Un middleware que hace `req.body.algo` sin verificar puede lanzar `TypeError`. Además, `req.query` ahora es un *getter*: no puedes reasignarlo (`req.query = ...`) en un middleware.

---

## 6. Orden de ejecución

```
1. app.use(...) en main.ts                   → en el orden en que los llamas
2. Middleware del módulo raíz (AppModule)
3. Middleware de los demás módulos           → según el orden de resolución de módulos (imports)
   Dentro de un apply(A, B, C)               → A, luego B, luego C
```

Dentro de un mismo `configure()`, cada llamada a `consumer.apply(...)` se registra en orden. No construyas lógica que dependa del orden **entre módulos** distintos: es frágil. Si dos middleware dependen uno del otro (p. ej. correlation ID antes que logging), regístralos juntos en el mismo `apply`:

```typescript
consumer.apply(CorrelationIdMiddleware, RequestLoggerMiddleware).forRoutes('{*splat}');
```

---

## 7. Caso real: correlation ID con `AsyncLocalStorage`

Problema: una orden falla. En los logs tienes 10 000 líneas por minuto de 20 instancias. ¿Qué líneas pertenecen a *esa* request? Solución: asignar un **ID por request**, devolverlo en un header y adjuntarlo a **cada** log, incluso los que se emiten desde servicios profundos que no tienen acceso a `req`.

¿Cómo llega el ID a un service sin pasarlo por parámetro por todas las capas? Con **`AsyncLocalStorage`** (módulo `node:async_hooks`): un almacenamiento que "sigue" al flujo asíncrono (promesas, callbacks) iniciado dentro de `run()`.

```
Request A ──▶ als.run({ id: 'A' }, next) ──▶ controller ──▶ service ──▶ await repo ──▶ log → id 'A'
Request B ──▶ als.run({ id: 'B' }, next) ──▶ controller ──▶ service ──▶ log → id 'B'
               (concurrentes en el mismo event loop, pero cada una ve SU contexto)
```

```typescript
// src/common/contexto/request-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export interface ContextoRequest {
  correlationId: string;
  usuarioId?: number;       // lo completará el guard de auth (Sesión 18)
}

@Injectable()
export class RequestContext {
  private readonly als = new AsyncLocalStorage<ContextoRequest>();

  run<T>(ctx: ContextoRequest, fn: () => T): T {
    return this.als.run(ctx, fn);
  }

  get(): ContextoRequest | undefined {
    return this.als.getStore();
  }
}
```

```typescript
// src/common/middleware/correlation-id.middleware.ts
import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestContext } from '../contexto/request-context';

const HEADER = 'x-correlation-id';
const FORMATO_VALIDO = /^[A-Za-z0-9-]{8,64}$/;   // no aceptes cualquier cosa del cliente (log injection)

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly contexto: RequestContext) {}

  use(req: Request, res: Response, next: NextFunction) {
    const entrante = req.header(HEADER);
    const correlationId = entrante && FORMATO_VALIDO.test(entrante) ? entrante : randomUUID();

    res.setHeader(HEADER, correlationId);          // el cliente puede reportarlo en un ticket de soporte

    // Todo lo que ocurra "dentro" de next() (guards, pipes, handler, services) verá este contexto
    this.contexto.run({ correlationId }, () => next());
  }
}
```

```typescript
// src/common/common.module.ts
@Global()
@Module({
  providers: [RequestContext],
  exports: [RequestContext],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('{*splat}');
  }
}
```

```typescript
// Uso en cualquier service, sin tocar req
@Injectable()
export class OrdenesService {
  private readonly logger = new Logger(OrdenesService.name);
  constructor(private readonly contexto: RequestContext) {}

  async crear(dto: CrearOrdenDto) {
    this.logger.log(`[${this.contexto.get()?.correlationId}] creando orden con ${dto.items.length} ítems`);
    // ...
  }
}
```

¿Por qué no un provider con `Scope.REQUEST`? Porque hacerlo *request-scoped* obliga a Nest a **recrear** toda la cadena de dependencias en cada request (costo de rendimiento que estudiamos en la Sesión 23). `AsyncLocalStorage` da el mismo resultado con un singleton.

> 💡 En producción, en vez de escribirlo a mano, se usa **`nestjs-cls`** (implementa exactamente esto con más features) y un logger como **Pino** que agrega el ID automáticamente a cada línea (Sesión 32). Y si usas OpenTelemetry, el `traceId` cumple este rol de forma estándar entre servicios.

> ❓ **Entrevista**: *"¿Cómo propagas un correlation ID a todos los logs sin pasarlo por parámetro?"* → Un middleware lo genera (o lo acepta del header entrante, validado) y ejecuta `next()` dentro de `AsyncLocalStorage.run()`. Cualquier código en esa cadena asíncrona lo lee con `getStore()`. Es un singleton, a diferencia de un provider `REQUEST`-scoped, que tiene costo de recreación por request.

---

## 8. Integrar middleware del ecosistema Express

Una ventaja enorme de Nest sobre Express es que **no pierdes** el ecosistema: cualquier middleware de Express funciona.

```typescript
// main.ts
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

app.use(helmet({ contentSecurityPolicy: false }));      // en APIs JSON puras, CSP aporta poco
app.use('/auth/login', rateLimit({ windowMs: 60_000, limit: 5 }));   // path como en Express
```

```typescript
// O dentro de un módulo (con rutas de Nest y exclude)
consumer.apply(cookieParser()).forRoutes('auth/{*splat}');
```

| Librería | Para qué | Sesión |
|---|---|---|
| `helmet` | Headers de seguridad | 20 |
| `compression` | Comprimir respuestas | 26, 33 |
| `cookie-parser` | Leer cookies (refresh tokens en cookie httpOnly) | 18 |
| `express-session` | Sesiones server-side | 18 |
| `pino-http` (vía `nestjs-pino`) | Logging estructurado de requests | 32 |
| `morgan` | Logging de acceso simple | — |

> ⚠️ Para rate limiting, en Nest se prefiere **`@nestjs/throttler`** (un guard, Sesión 20): conoce el handler, permite `@Throttle()` y `@SkipThrottle()` por ruta, y soporta storage en Redis para múltiples instancias.

---

## 9. Express vs Fastify en middleware

Si cambias a `@nestjs/platform-fastify` (Sesión 33):

- Fastify no tiene un sistema de middleware tipo Express; Nest lo emula con **`@fastify/middie`**.
- En middleware de Nest bajo Fastify, `req` y `res` son los objetos **crudos de Node** (`IncomingMessage` / `ServerResponse`), **no** `FastifyRequest`/`FastifyReply`. No tienes `res.status().json()`: usarías `res.statusCode = 503; res.end(JSON.stringify(...))`.
- Muchos middleware de Express funcionan, pero para lo habitual existen **plugins de Fastify** más eficientes (`@fastify/helmet`, `@fastify/compress`, `@fastify/cookie`) que se registran con `app.register(...)`.

```typescript
// Middleware portable entre Express y Fastify: usa solo la API de Node
import { IncomingMessage, ServerResponse } from 'node:http';

export function poweredBy(req: IncomingMessage, res: ServerResponse, next: () => void) {
  res.setHeader('X-Powered-By', 'TiendaApi');
  next();
}
```

> ❓ **Entrevista**: *"¿Tu middleware funciona igual si migras a Fastify?"* → No necesariamente. Bajo Fastify, Nest ejecuta middleware vía `@fastify/middie` y entrega objetos `req`/`res` crudos de Node, sin los helpers de Express (`res.json`, `req.header`...). Para ser portable, un middleware debe usar solo la API de `node:http` o la lógica debería moverse a guards/interceptors, que trabajan sobre el `ExecutionContext` independiente del adaptador.

---

## 10. Errores en middleware

```typescript
@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.header('x-api-key')) {
      throw new UnauthorizedException('Falta la API key');   // ✅ Nest lo captura
    }
    next();
  }
}
```

- Nest envuelve los middleware registrados con `MiddlewareConsumer`: una excepción lanzada (sync o en un `async use()`) es procesada por los **exception filters globales** (Sesión 9) y responde con el formato estándar de Nest.
- Los filters aplicados con `@UseFilters()` en un controller **no** aplican: el middleware corre antes de que se sepa qué controller atiende.
- En middleware registrados con `app.use()` directamente en Express, los errores siguen las reglas de Express (`next(err)`), fuera del control de Nest.

### 10.1 Testear un middleware de forma unitaria

Un middleware de clase es solo un provider con un método `use`: no necesitas levantar HTTP para probarlo.

```typescript
// mantenimiento.middleware.spec.ts
describe('MantenimientoMiddleware', () => {
  it('responde 503 y NO llama next() en modo mantenimiento', () => {
    const config = { get: jest.fn().mockReturnValue('true') } as unknown as ConfigService;
    const mw = new MantenimientoMiddleware(config);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn();

    mw.use({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();     // el cortocircuito es parte del contrato
  });
});
```

La integración real (rutas de `forRoutes`/`exclude`) se verifica con tests e2e y Supertest (Sesión 22).

---

## 11. ¿Middleware, guard, interceptor o pipe?

| Necesito... | Herramienta | Por qué |
|---|---|---|
| Headers de seguridad, compresión, cookies, CORS | **Middleware** | Concern HTTP genérico, sin importar el handler |
| Correlation ID / contexto por request | **Middleware** | Debe existir lo antes posible, incluso para 404 |
| Log de acceso de todas las requests | **Middleware** (o interceptor) | Middleware ve también las rutas que no existen |
| ¿El usuario está autenticado / tiene el rol? | **Guard** (11) | Necesita metadata del handler (`@Roles`, `@Public`) |
| Transformar la respuesta, medir el handler, cachear | **Interceptor** (12) | Ve antes **y** después del handler, trabaja con el valor de retorno |
| Validar / convertir un parámetro | **Pipe** (10) | Opera sobre argumentos concretos del handler |
| Formatear errores | **Exception filter** (9) | Centraliza la conversión error → respuesta |

> ❓ **Entrevista**: *"¿Qué diferencia hay entre un middleware y un interceptor?"* → El middleware corre **antes** de la zona de Nest, a nivel HTTP crudo, sin conocer el handler y solo "hacia adelante" (salvo escuchar `res.on('finish')`). El interceptor corre después de los guards, tiene `ExecutionContext` (sabe el handler y su metadata), envuelve la ejecución con RxJS y puede **transformar el valor de retorno** o la excepción. Además los interceptors funcionan igual en HTTP, WebSockets y microservicios; el middleware es solo HTTP.

---

## Resumen mental de la sesión

```
Middleware = (req, res, next) de Express/Fastify, ANTES de guards/interceptors/pipes
  - puede modificar req/res, cortocircuitar (responder sin next) o llamar next()
  - NO conoce el handler (sin ExecutionContext) → nada de autorización por ruta
  - toda rama termina en next(), next(err) o una respuesta (si no: request colgada)

Clase: @Injectable() implements NestMiddleware { use(req, res, next) } → con DI
Funcional: function mw(req, res, next) → sin DI

Registro: class XModule implements NestModule {
  configure(consumer) { consumer.apply(A, B).exclude(...).forRoutes(Controller | 'ruta' | {path, method}) }
}
Global: app.use(fn) en main.ts → primero, sin DI, repetir en tests e2e

Nest 11 = Express 5 (path-to-regexp v8):
  '*' → '{*splat}'   'x/*' → 'x/*splat' | 'x/{*splat}'   ':a?' → '{:a}'   sin regex
  req.body undefined sin body; req.query es getter
Fastify: middie, req/res crudos de Node; mejor plugins @fastify/*

Orden: app.use → módulo raíz → otros módulos; dentro de apply(A,B): A→B
Correlation ID: middleware + AsyncLocalStorage.run(ctx, next) (o nestjs-cls)
Errores en middleware → filtros GLOBALES (no los @UseFilters de controller)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un middleware en Nest y en qué punto del ciclo de vida se ejecuta?
2. ❓ ¿Qué pasa si un middleware no llama a `next()` ni responde? ¿Y si hace ambas cosas?
3. ❓ ¿Por qué el middleware no es el lugar para la autorización por rol?
4. ❓ Middleware de clase vs funcional: ¿cuándo usar cada uno?
5. ❓ ¿Cómo aplicas un middleware a todas las rutas de un controller excepto una?
6. ❓ ¿Qué cambió en los wildcards de rutas con Express 5 / Nest 11? ¿Qué significa `{*splat}`?
7. ❓ `app.use()` vs `MiddlewareConsumer`: diferencias en DI, orden y tests.
8. ❓ ¿Cómo implementarías un correlation ID que llegue a los logs de los services sin pasarlo por parámetro?
9. ❓ ¿Por qué `AsyncLocalStorage` en vez de un provider `Scope.REQUEST`?
10. ❓ ¿Qué filtros capturan una excepción lanzada en un middleware?
11. ❓ ¿Qué cambia en el middleware si migras de Express a Fastify?
12. ❓ Middleware vs interceptor: da dos diferencias concretas.

## Ejercicio práctico
1. En TiendaApi crea `RequestLoggerMiddleware` (clase) que loguee método, URL, status y duración usando `res.on('finish')`. Regístralo con `forRoutes('{*splat}')`.
2. Cámbialo temporalmente a `forRoutes('*')` y observa el comportamiento/warnings en Nest 11. Vuelve a la sintaxis nueva.
3. Crea un middleware funcional `noCache` y aplícalo solo a `usuarios/{*splat}` y `ordenes/{*splat}`. Verifica el header con `curl -i`.
4. Crea `MantenimientoMiddleware` que lea `MODO_MANTENIMIENTO` de `ConfigService` (Sesión 7) y responda 503, excluyendo `GET /health`.
5. Agrega `helmet()` y `compression()` en `main.ts`. Extrae la configuración a `configurarApp(app)`.
6. Implementa `RequestContext` + `CorrelationIdMiddleware` con `AsyncLocalStorage`. Haz que `OrdenesService` loguee el ID. Lanza dos requests concurrentes (`curl ... & curl ... &`) y verifica que cada log tiene su propio ID.
7. Envía un `x-correlation-id` con caracteres raros (`$(whoami)` o saltos de línea) y verifica que se descarta y se genera uno nuevo.
8. Lanza una `UnauthorizedException` desde un middleware y compara la respuesta con la de un `throw` en un controller. Luego agrega un `@UseFilters()` en el controller y comprueba que **no** aplica al error del middleware.
9. Registra `apply(CorrelationIdMiddleware, RequestLoggerMiddleware)` e invierte el orden: ¿qué le pasa al ID en el log de acceso?
10. (Opcional) Arranca la app con `@nestjs/platform-fastify` y observa qué se rompe en tus middleware; reescribe uno para que use solo la API de `node:http`.

---

➡️ **Cuando termines**, marca la Sesión 8 en el [README](README.md) y pasa a la **Sesión 9 — Exception Filters y manejo global de errores**.
