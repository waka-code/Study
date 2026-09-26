# Sesión 12 — Interceptors: RxJS, logging, transformación, timeout, caching

> **Objetivo de la sesión**: entender por qué el interceptor es la única pieza del ciclo de vida que ve la request **antes y después** del handler, y por qué Nest lo modela con **RxJS**. Al terminar deberías poder escribir interceptors de logging/tiempo de respuesta, envolver respuestas en un formato estándar, aplicar timeouts correctos, mapear errores, cachear en memoria cortocircuitando el handler, parametrizarlos con metadata (`Reflector`) y conocer las trampas: `@Res()`, `map` con funciones async, y timeouts que no cancelan el trabajo.

---

## 1. ¿Qué es un interceptor y por qué existe?

Un interceptor es una clase que implementa `NestInterceptor` y **envuelve** la ejecución del handler. Es el patrón *Aspect-Oriented Programming* (AOP): lógica transversal (logging, métricas, transformación, cache) que no quieres repetir en cada método.

```
                 ┌──────────────── Interceptor ────────────────┐
Request ─▶ Guards ─▶ │ antes ─▶ [ Pipes ─▶ Handler ] ─▶ después (RxJS) │ ─▶ Response
                 └──────────────────────────────────────────────┘
```

Qué puede hacer y ninguna otra pieza puede:

| Capacidad | Middleware | Guard | Pipe | Interceptor | Filter |
|---|---|---|---|---|---|
| Lógica **antes** del handler | ✅ | ✅ | ✅ (solo argumentos) | ✅ | ❌ |
| Lógica **después** del handler | ⚠️ solo con eventos de `res` | ❌ | ❌ | ✅ | ❌ |
| **Transformar el resultado** | ❌ | ❌ | ❌ | ✅ | ❌ |
| Transformar/mapear **excepciones** | ❌ | ❌ | ❌ | ✅ (`catchError`) | ✅ |
| **No ejecutar** el handler y responder otra cosa | ✅ | ❌ (solo rechaza) | ❌ | ✅ (cache) | ❌ |
| Conoce el handler y su metadata | ❌ | ✅ | ✅ (vía `ArgumentMetadata`, parcial) | ✅ | ✅ |

> ❓ **Entrevista**: *"¿Para qué usarías un interceptor y no un middleware?"* → Cuando necesitas el **resultado** del handler (transformarlo, medir cuánto tardó *ese* handler, cachearlo) o su **metadata** (`@Timeout(2000)`, `@SinEnvoltura()`). El middleware no conoce el handler y solo puede "ver el después" enganchándose a eventos de la response cruda.

---

## 2. La interfaz y el `CallHandler`

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class NadaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // ANTES: aquí el handler todavía no se ejecutó
    return next.handle();   // ← devuelve un Observable con el resultado del handler
    // DESPUÉS: se expresa con operadores RxJS sobre ese Observable
  }
}
```

- `context`: el mismo `ExecutionContext` de los guards (Sesión 11): `getHandler()`, `getClass()`, `switchToHttp()`.
- `next.handle()`: **dispara** pipes + handler y te devuelve un `Observable` con lo que el handler retornó.
- Si **no llamas** a `next.handle()`, el handler **no se ejecuta**. Es la base del caching.
- `intercept` puede ser `async` y devolver `Promise<Observable<...>>`, útil si necesitas `await` antes de llamar al handler.

¿Por qué Observable? Porque un handler puede devolver un valor, una `Promise` o un `Observable` (incluso varios valores, como en SSE — Sesión 26). Nest **normaliza todo a Observable**, y así el "después" se expresa de forma uniforme con operadores.

> ⚠️ `next.handle()` es **lazy** como todo Observable frío: el handler se ejecuta cuando Nest se suscribe al Observable que tú devuelves. Si lo llamas dos veces y te suscribes a ambos, el handler se ejecuta **dos veces**.

---

## 3. RxJS mínimo para interceptors

No necesitas dominar RxJS; con estos operadores cubres el 95% de los casos:

| Operador | Qué hace | Uso típico en un interceptor |
|---|---|---|
| `map(fn)` | Transforma cada valor | Envolver `{ data }`, quitar campos |
| `tap({ next, error, complete })` | Efecto secundario sin cambiar el valor | Logging, métricas, headers |
| `catchError(fn)` | Atrapa un error y devuelve otro Observable | Traducir errores de infraestructura |
| `timeout(ms)` / `timeout({ each })` | Error si no llega valor a tiempo | Timeouts por endpoint |
| `finalize(fn)` | Corre al terminar (éxito, error o cancelación) | Liberar recursos, decrementar contadores |
| `of(valor)` | Crea un Observable que emite ese valor | Responder desde cache |
| `throwError(() => err)` | Crea un Observable que falla | Relanzar un error transformado |
| `mergeMap` / `concatMap` / `switchMap` | Encadenar trabajo **async** | Guardar en cache tras la respuesta |
| `from(promise)` | Promise → Observable | Integrar código async |

```ts
import { of, throwError, TimeoutError } from 'rxjs';
import { map, tap, catchError, timeout, finalize, mergeMap } from 'rxjs/operators';
// En RxJS 7+ también puedes importar los operadores directamente desde 'rxjs'
```

---

## 4. Interceptor de logging y tiempo de respuesta

```ts
// src/common/interceptors/logging.interceptor.ts
import {
  CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Solo aplica a HTTP; en WS/RPC dejamos pasar sin tocar
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const destino = `${context.getClass().name}.${context.getHandler().name}`;
    const inicio = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = (performance.now() - inicio).toFixed(1);
          // Aún no se envió la respuesta: podemos agregar headers
          res.setHeader('X-Response-Time', `${ms}ms`);
          this.logger.log(`${req.method} ${req.originalUrl} → ${destino} ${ms}ms`);
        },
        error: (err: Error) => {
          const ms = (performance.now() - inicio).toFixed(1);
          this.logger.warn(`${req.method} ${req.originalUrl} → ${destino} FALLÓ en ${ms}ms: ${err.message}`);
        },
      }),
    );
  }
}
```

> 💡 ¿Por qué `tap` y no `map`? Porque no queremos **cambiar** el valor, solo observarlo. `tap({ error })` ve la excepción pero **no la atrapa**: sigue su camino hacia los exception filters (Sesión 9).

> ⚠️ Aquí `res.statusCode` todavía **no** es el definitivo en caso de error: el status lo decide después el exception filter. Para loguear el status real de toda request (incluidas las rechazadas por guards o middleware), el lugar correcto es un **middleware** con `res.on('finish')` (Sesión 8) o un logger como `nestjs-pino` (Sesión 32). Cada herramienta ve una parte distinta del viaje.

---

## 5. Transformar la respuesta: un envelope estándar

Muchos equipos devuelven siempre `{ data, meta }`. En vez de hacerlo en cada handler:

```ts
// src/common/interceptors/envelope.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

export interface Envelope<T> {
  data: T;
  meta: { timestamp: string; path: string };
}

// Decorador para excluir endpoints (health checks, archivos, webhooks de terceros...)
export const SinEnvoltura = Reflector.createDecorator<boolean>();

@Injectable()
export class EnvelopeInterceptor<T> implements NestInterceptor<T, Envelope<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Envelope<T> | T> {
    const omitir = this.reflector.getAllAndOverride(SinEnvoltura, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (omitir) return next.handle();

    const path = context.switchToHttp().getRequest<{ url: string }>().url;

    return next.handle().pipe(
      map((data) => ({
        data: data ?? (null as T),   // undefined no se serializa: normalizamos a null
        meta: { timestamp: new Date().toISOString(), path },
      })),
    );
  }
}
```

`NestInterceptor<T, R>`: `T` es lo que devuelve el handler, `R` lo que sale del interceptor. Te obliga a ser explícito sobre el contrato.

```ts
@Controller('productos')
export class ProductosController {
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.productos.obtener(id);   // devuelve el DTO "pelado"
  }

  @SinEnvoltura(true)
  @Get('export.csv')
  exportar() { /* ... */ }
}
```

```jsonc
// GET /productos/7
{ "data": { "id": 7, "nombre": "Taza", "precio": 4990 },
  "meta": { "timestamp": "2026-09-25T13:00:00.000Z", "path": "/productos/7" } }
```

> ⚠️ Un envelope global **cambia el contrato** de toda la API. Decídelo al inicio y documéntalo en OpenAPI (Sesión 21); agregarlo cuando ya hay clientes en producción rompe a todos.

> ❓ **Entrevista**: *"¿Dónde transformas las respuestas de error al mismo formato del envelope?"* → En un **exception filter**, no en el interceptor. El `map` del interceptor solo se ejecuta en el camino feliz; los errores viajan por el canal de error del Observable hasta los filtros.

---

## 6. `@Res()` rompe los interceptors

```ts
@Get()
listar(@Res() res: Response) {
  res.json(this.productos.listar());   // ← respondiste tú, a mano
}
```

Cuando inyectas `@Res()`, Nest entra en **modo específico de librería**: asume que tú envías la respuesta. El handler devuelve `undefined`, así que el `map` del interceptor transforma `undefined`… y la respuesta **ya se envió** con lo que tú pusiste. Los interceptors de transformación y el `ClassSerializerInterceptor` (Sesión 21) quedan inútiles.

```ts
// ✅ Si solo necesitas setear headers/cookies, usa passthrough
@Get()
listar(@Res({ passthrough: true }) res: Response) {
  res.setHeader('X-Total-Count', '42');
  return this.productos.listar();   // Nest sigue manejando la respuesta
}
```

> ⚠️ Regla práctica: **no uses `@Res()` sin `passthrough`** salvo para streaming muy específico. Para archivos existe `StreamableFile` (Sesión 26), que sí respeta el ciclo de vida.

---

## 7. Timeouts

```ts
// src/common/interceptors/timeout.interceptor.ts
import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';

// @Timeout(10_000) para endpoints lentos conocidos (reportes, exportaciones)
export const Timeout = Reflector.createDecorator<number>();

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly porDefectoMs = 5_000,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ms =
      this.reflector.getAllAndOverride(Timeout, [context.getHandler(), context.getClass()]) ??
      this.porDefectoMs;

    return next.handle().pipe(
      timeout(ms),
      catchError((err: unknown) =>
        err instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException(`Superó ${ms}ms`))   // 408
          : throwError(() => err),                                            // otros errores intactos
      ),
    );
  }
}
```

> ⚠️ Como el constructor tiene un parámetro primitivo (`porDefectoMs`), registrarlo con `APP_INTERCEPTOR` + `useClass` fallaría (Nest no sabe inyectar un `number`). Usa una factory: `{ provide: APP_INTERCEPTOR, inject: [Reflector], useFactory: (r: Reflector) => new TimeoutInterceptor(r, 5_000) }`.

> ⚠️ **El timeout no cancela el trabajo.** RxJS se desuscribe del Observable, el cliente recibe un 408/504… pero la `Promise` del servicio **sigue corriendo**: la query a la BD o la llamada HTTP externa continúan consumiendo recursos. Para cancelar de verdad necesitas propagar un `AbortSignal` hasta el cliente HTTP/driver y fijar timeouts en la capa de datos (`statement_timeout` en Postgres, timeout del cliente HTTP).

> ❓ **Entrevista**: *"¿408 o 504 para un timeout?"* → `408 Request Timeout` significa, estrictamente, que **el cliente** tardó en enviar la request. Para "mi servidor o una dependencia tardó demasiado", `503`/`504 Gateway Timeout` es semánticamente más correcto cuando eres un proxy de otra dependencia. La documentación de Nest usa `RequestTimeoutException` (408) en su ejemplo; lo importante es que el equipo lo acuerde y lo documente.

---

## 8. Mapear errores con `catchError`

Útil para traducir errores de **infraestructura** en algo que el cliente entienda, sin acoplar el servicio a HTTP:

```ts
// src/common/interceptors/errores-externos.interceptor.ts
import {
  BadGatewayException, CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { PasarelaPagoError } from '../../pagos/pasarela-pago.error';

@Injectable()
export class ErroresExternosInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err: unknown) => {
        if (err instanceof PasarelaPagoError) {
          // El proveedor de pagos falló: no es culpa del cliente → 502
          return throwError(() => new BadGatewayException('Proveedor de pagos no disponible'));
        }
        return throwError(() => err);
      }),
    );
  }
}
```

> 💡 ¿Interceptor o exception filter para esto? Ambos funcionan. El filtro es el lugar **canónico** para convertir excepciones en respuestas (Sesión 9). El interceptor con `catchError` brilla cuando quieres **recuperarte** (devolver un valor por defecto con `of(...)`) o **reintentar** (`retry`) solo para ciertos endpoints.

> ⚠️ `catchError(() => of([]))` "traga" el error y responde `200 []`. Es válido para degradación elegante (ej. recomendaciones opcionales), pero peligroso por defecto: ocultas fallos y tu monitoreo no los ve. Loguea siempre lo que tragas.

---

## 9. Cache en memoria: cortocircuitar el handler

```ts
// src/common/interceptors/cache-simple.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, of, tap } from 'rxjs';

@Injectable()
export class CacheSimpleInterceptor implements NestInterceptor {
  // ⚠️ Solo para aprender: Map sin límite = memory leak; no se comparte entre réplicas
  private readonly cache = new Map<string, { valor: unknown; expira: number }>();
  private readonly ttlMs = 30_000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.method !== 'GET') return next.handle();   // solo cacheamos lecturas

    const clave = req.originalUrl;
    const hit = this.cache.get(clave);
    if (hit && hit.expira > Date.now()) {
      return of(hit.valor);            // ← NO llamamos a next.handle(): el handler no corre
    }

    return next.handle().pipe(
      tap((valor) => this.cache.set(clave, { valor, expira: Date.now() + this.ttlMs })),
    );
  }
}
```

En producción usa `CacheInterceptor` de `@nestjs/cache-manager` con Redis (TTL, invalidación, compartido entre instancias). Lo vemos en la **Sesión 25**.

> ⚠️ **Nunca cachees por URL respuestas que dependen del usuario** (`GET /ordenes/mias`). La clave debe incluir la identidad, o el usuario B verá las órdenes del usuario A. Es uno de los bugs de seguridad más comunes con caching.

### 9.1 Trabajo async en el "después": `map` vs `mergeMap`

```ts
// ❌ map con función async: emite una Promise, no el valor
next.handle().pipe(map(async (v) => { await this.redis.set(k, v); return v; }));
// El cliente recibe {} (una Promise serializada) o el valor sin garantía de guardado

// ✅ mergeMap/concatMap esperan la Promise y emiten su resultado
next.handle().pipe(
  mergeMap(async (v) => {
    await this.redis.set(k, JSON.stringify(v));
    return v;
  }),
);
```

> ❓ **Entrevista**: *"Mi interceptor devuelve `{}` en vez de los datos, ¿qué pasa?"* → Casi siempre es un `map(async ...)`: el operador emite la `Promise` como valor. Usa `mergeMap`/`concatMap` (o `from(promise)`) para aplanar trabajo asíncrono.

---

## 10. Dónde se aplica y en qué orden

```ts
// Método o controller
@UseInterceptors(LoggingInterceptor, new TimeoutInterceptor(new Reflector(), 2_000))
@Controller('reportes')
export class ReportesController {}

// Global con DI (recomendado)
import { APP_INTERCEPTOR } from '@nestjs/core';
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },   // el más externo
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
})
export class AppModule {}

// Global sin DI
app.useGlobalInterceptors(new LoggingInterceptor());
```

Los interceptors forman una **cebolla**: el primero en entrar es el último en salir.

```
Entrada (antes):  Global1 → Global2 → Controller → Método → [Pipes → Handler]
Salida (después): Método → Controller → Global2 → Global1 → Response
```

Consecuencia práctica con el ejemplo de arriba: `EnvelopeInterceptor` envuelve primero y `LoggingInterceptor` (más externo) ve el valor **ya envuelto** y mide el tiempo **total**, incluido el envelope. Si inviertes el orden, el logging mide menos y ve el valor crudo.

> ⚠️ Las mismas reglas que con los guards: `app.useGlobalInterceptors()` **no** tiene DI y no aplica en tests e2e que no ejecutan `main.ts`; `APP_INTERCEPTOR` es global sin importar en qué módulo lo declares.

---

## 11. Interceptors built-in y del ecosistema

| Interceptor | Paquete | Para qué | Sesión |
|---|---|---|---|
| `ClassSerializerInterceptor` | `@nestjs/common` | Aplica `class-transformer` (`@Exclude`, `@Expose`) a la respuesta | 21 |
| `CacheInterceptor` | `@nestjs/cache-manager` | Cache de GETs con TTL, stores como Redis | 25 |
| `FileInterceptor`, `FilesInterceptor` | `@nestjs/platform-express` | Parsear `multipart/form-data` con Multer | 26 |
| `LoggerErrorInterceptor` | `nestjs-pino` | Asociar errores al log de la request | 32 |

> 💡 `FileInterceptor` es un buen ejemplo de interceptor que trabaja **antes**: ejecuta Multer para parsear el archivo antes de que corran los pipes y el handler.

---

## 12. Interceptors con Observables de larga vida (SSE)

Si el handler devuelve un `Observable` que emite **varios** valores (Server-Sent Events con `@Sse()`), el `map` del interceptor se aplica **a cada evento**, y `tap({ complete })` corre cuando el stream termina. Un `timeout(5000)` aplicado ingenuamente cortaría el stream a los 5 segundos: usa `timeout({ first: 5000 })` (solo el primer valor) o excluye esos endpoints con metadata.

---

## 13. Testing de un interceptor

```ts
// src/common/interceptors/envelope.interceptor.spec.ts
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { EnvelopeInterceptor } from './envelope.interceptor';

const ctx = {
  getHandler: () => function handler() {},
  getClass: () => class C {},
  switchToHttp: () => ({ getRequest: () => ({ url: '/productos/7' }) }),
} as unknown as ExecutionContext;

describe('EnvelopeInterceptor', () => {
  it('envuelve el resultado del handler', async () => {
    const interceptor = new EnvelopeInterceptor(new Reflector());
    const next: CallHandler = { handle: () => of({ id: 7 }) };   // handler falso

    const resultado = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(resultado).toMatchObject({ data: { id: 7 }, meta: { path: '/productos/7' } });
  });

  it('normaliza undefined a null', async () => {
    const interceptor = new EnvelopeInterceptor(new Reflector());
    const next: CallHandler = { handle: () => of(undefined) };
    const r = await lastValueFrom(interceptor.intercept(ctx, next));
    expect(r).toMatchObject({ data: null });
  });
});
```

La clave: `CallHandler` es solo `{ handle(): Observable }`, así que simular el handler es trivial con `of(...)` o `throwError(...)`.

---

## 14. Errores comunes

> ⚠️ **Olvidar `return`** delante de `next.handle().pipe(...)`: el interceptor devuelve `undefined` y Nest falla o la request queda colgada.

> ⚠️ **Suscribirse manualmente** (`next.handle().subscribe(...)`) dentro del interceptor: ejecutas el handler por tu cuenta y además Nest se suscribe al que devuelves (o a ninguno). Siempre **devuelve** el Observable, nunca te suscribas.

> ⚠️ **Estado mutable en la instancia** (contadores, "último usuario"): los interceptors son singletons compartidos entre requests concurrentes.

> ⚠️ **Poner lógica de negocio** en interceptors ("si es cliente VIP, aplicar descuento al resultado"). Oculta reglas de dominio en una capa transversal: nadie las encontrará. Eso va en el servicio.

> ⚠️ **Asumir HTTP**. Si registras un interceptor global en una app híbrida o con WebSockets, `switchToHttp().getRequest()` devolverá otra cosa. Revisa `context.getType()`.

---

## Resumen mental de la sesión

```
Interceptor = intercept(ctx, next) → Observable
  antes: código antes de next.handle()
  después: operadores RxJS sobre next.handle()
  sin next.handle() → el handler NO se ejecuta (cache)

Posición: Guards → INTERCEPTORS(antes) → Pipes → Handler → INTERCEPTORS(después) → Filters(si error)

RxJS útil: map · tap({next,error}) · catchError · timeout · finalize · of · throwError · mergeMap
  map(async) ❌ → mergeMap/concatMap ✅

Patrones: logging/tiempo · envelope {data,meta} · timeout (+@Timeout metadata) ·
          mapear errores externos · cache (clave incluye usuario si aplica)

Orden: cebolla. Entrada global→controller→método; salida al revés
Global: APP_INTERCEPTOR (DI) vs useGlobalInterceptors (sin DI)

Trampas: @Res() sin passthrough anula interceptors · timeout NO cancela la Promise ·
         el map solo corre en éxito (errores → filters) · estado en la instancia = bug
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué puede hacer un interceptor que no puede hacer un guard ni un middleware?
2. ❓ ¿Qué devuelve `next.handle()` y qué pasa si no lo llamas?
3. ❓ ¿Por qué Nest usa Observables en los interceptors si tu handler devuelve una Promise?
4. ❓ ¿Diferencia entre `map` y `tap`? ¿Qué pasa con `map(async ...)`?
5. ❓ ¿En qué orden se ejecutan varios interceptors a la entrada y a la salida?
6. ❓ ¿Por qué `@Res()` rompe los interceptors de transformación? ¿Cómo lo evitas?
7. ❓ Implementa de palabra un `TimeoutInterceptor`. ¿Cancela la query a la base de datos? ¿Cómo lo lograrías?
8. ❓ ¿Dónde formateas los errores al mismo formato que el envelope de éxito y por qué no en el interceptor?
9. ❓ Diseña un interceptor de cache. ¿Qué error de seguridad es típico al elegir la clave?
10. ❓ `APP_INTERCEPTOR` vs `app.useGlobalInterceptors()`: diferencias.
11. ❓ ¿Cómo parametrizas un interceptor por endpoint (ej. timeout distinto)?
12. ❓ ¿Cómo testeas un interceptor sin levantar HTTP?

## Ejercicio práctico
1. En TiendaApi crea `src/common/interceptors/` y agrega `LoggingInterceptor` con `X-Response-Time`.
2. Implementa `EnvelopeInterceptor` con el decorador `@SinEnvoltura()`; regístralos ambos con `APP_INTERCEPTOR` (logging primero).
3. Crea un exception filter (Sesión 9) que devuelva los errores como `{ error: { statusCode, message }, meta }` para que éxito y error compartan forma.
4. Implementa `TimeoutInterceptor` con `@Timeout(ms)` y 3 s por defecto (registro con `useFactory`). Crea `GET /productos/lento` que haga `await new Promise(r => setTimeout(r, 5000))` y verifica el error; agrega un `console.log` al final del handler y confirma que **igual se ejecuta** (el trabajo no se canceló).
5. Aplica `CacheSimpleInterceptor` solo a `GET /productos` y `GET /categorias`; mide con `X-Response-Time` la diferencia entre la primera y la segunda llamada.
6. Crea `PasarelaPagoError` y un endpoint `POST /ordenes/:id/pagar` que la lance; mapea a `502` con `ErroresExternosInterceptor`.
7. Cambia un handler a `@Res()` sin passthrough y observa que el envelope desaparece; corrígelo con `passthrough: true`.
8. Invierte el orden de los `APP_INTERCEPTOR` y explica qué cambió en el log.
9. Escribe los tests unitarios de `EnvelopeInterceptor` y de `TimeoutInterceptor` (usa `of(x).pipe(delay(100))` como handler lento y un timeout de 10 ms).

---

➡️ **Cuando termines**, marca la Sesión 12 en el [README](README.md) y pasa a la **Sesión 13 — Custom decorators y el orden completo del request lifecycle**.
