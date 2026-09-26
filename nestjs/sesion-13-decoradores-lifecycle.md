# Sesión 13 — Custom decorators y el orden completo del request lifecycle

> **Objetivo de la sesión**: cerrar el Bloque 2 juntando todas las piezas. Al terminar deberías poder crear **decoradores de parámetro** (`createParamDecorator`) con y sin pipes, **componer decoradores** con `applyDecorators` para ocultar ceremonia (`@Auth('admin')`), elegir entre `SetMetadata`, `Reflector.createDecorator` y metadata manual, y recitar —y demostrar con logs— el **orden exacto** en que Nest ejecuta middleware, guards, interceptors, pipes, handler y filters, incluyendo qué pasa cuando algo lanza una excepción en cada etapa.

---

## 1. ¿Por qué decoradores propios?

Después de las Sesiones 8–12 tus handlers empiezan a verse así:

```ts
@Roles(['admin'])
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente o inválido' })
@ApiForbiddenResponse({ description: 'Sin permisos' })
@Delete(':id')
eliminar(@Req() req: Request & { user: UsuarioActual }, @Param('id', ParseIntPipe) id: number) {
  return this.productos.eliminar(id, req.user.id);
}
```

Tres problemas:
1. **Repetición**: los mismos 5 decoradores en decenas de endpoints; olvidar uno es un bug (o un hueco de seguridad).
2. **Acoplamiento a la plataforma**: `@Req()` expone el objeto de Express; el handler sabe demasiado del transporte.
3. **Tipado débil**: `req.user` se tipa a mano en cada sitio.

Con decoradores propios:

```ts
@Auth('admin')
@Delete(':id')
eliminar(@UsuarioActual() usuario: UsuarioActual, @Param('id', ParseIntPipe) id: number) {
  return this.productos.eliminar(id, usuario.id);
}
```

Recuerda la base de la Sesión 2: un decorador de TypeScript es solo una **función** que recibe el target (clase, método, parámetro) y, en Nest, casi siempre **escribe metadata** con `Reflect.defineMetadata`. Nest la lee después al construir las rutas o al ejecutar guards/interceptors.

| Tipo de decorador | Recibe | Ejemplos de Nest | Cómo crear uno propio |
|---|---|---|---|
| Clase | el constructor | `@Controller`, `@Injectable`, `@Module` | `applyDecorators(...)` o función propia |
| Método | target, nombre, descriptor | `@Get`, `@UseGuards`, `@HttpCode` | `SetMetadata`, `Reflector.createDecorator`, `applyDecorators` |
| Parámetro | target, nombre, índice | `@Body`, `@Param`, `@Query` | **`createParamDecorator`** |

---

## 2. Decoradores de parámetro con `createParamDecorator`

```ts
// src/auth/decorators/usuario-actual.decorator.ts
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UsuarioActual as Usuario } from '../usuario-actual.interface';

export const UsuarioActual = createParamDecorator(
  // data: el argumento que pasas al decorador → @UsuarioActual('email')
  // ctx:  el mismo ExecutionContext de guards e interceptors
  (data: keyof Usuario | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: Usuario }>();
    const usuario = req.user;

    // Si llegamos aquí sin usuario, alguien usó el decorador en un endpoint @Public
    if (!usuario) throw new UnauthorizedException();

    return data ? usuario[data] : usuario;
  },
);
```

```ts
@Get('mias')
misOrdenes(@UsuarioActual() usuario: Usuario) { /* usuario completo */ }

@Get('mias/resumen')
resumen(@UsuarioActual('id') usuarioId: number) { /* solo el id */ }
```

Qué ganaste:
- El handler **no conoce Express**: puedes cambiar a Fastify (Sesión 33) o reutilizar el decorador en GraphQL cambiando solo el decorador.
- Un único lugar para la regla "sin usuario → 401".
- Es **testeable**: el servicio recibe un `number`, no una request.

> ⚠️ El tipo que escribes en el parámetro (`usuario: Usuario`) **no se verifica**: `createParamDecorator` devuelve `unknown` a efectos prácticos y TypeScript confía en ti. Si la factory devuelve otra cosa, el compilador no lo detecta. Mantén la factory pequeña y testeada.

### 2.1 Más decoradores de parámetro útiles para TiendaApi

```ts
// src/common/decorators/ip-cliente.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// req.ip respeta "trust proxy" si lo configuraste (detrás de un ALB/Nginx)
export const IpCliente = createParamDecorator((_: unknown, ctx: ExecutionContext) =>
  ctx.switchToHttp().getRequest<Request>().ip,
);
```

```ts
// src/common/decorators/paginacion.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface Paginacion {
  page: number;
  limit: number;
  skip: number;
}

interface OpcionesPaginacion {
  limitePorDefecto?: number;
  limiteMaximo?: number;
}

export const Paginar = createParamDecorator(
  (opciones: OpcionesPaginacion | undefined, ctx: ExecutionContext): Paginacion => {
    const { query } = ctx.switchToHttp().getRequest<Request>();
    const maximo = opciones?.limiteMaximo ?? 100;
    const porDefecto = opciones?.limitePorDefecto ?? 20;

    const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
    const pedido = Number.parseInt(String(query.limit ?? porDefecto), 10) || porDefecto;
    const limit = Math.min(Math.max(1, pedido), maximo);   // nunca confíes en el cliente

    return { page, limit, skip: (page - 1) * limit };
  },
);

// Uso
@Get()
listar(@Paginar({ limiteMaximo: 50 }) pag: Paginacion) {
  return this.productos.listar(pag);
}
```

> 💡 Alternativa igual de válida: un `PaginacionQueryDto` con `class-validator` y `@Query()` (Sesión 6). El DTO documenta mejor en OpenAPI y devuelve 400 ante valores inválidos; el decorador **corrige** silenciosamente. Elige según el contrato que quieras: *estricto* (DTO) o *tolerante* (decorador).

### 2.2 Decoradores de parámetro + pipes

Puedes pasar pipes a tu decorador igual que a `@Body()`:

```ts
@Get('mias/:id')
detalle(
  @UsuarioActual('id', ParseIntPipe) usuarioId: number,   // data + pipe
  @Param('id', ParseIntPipe) id: number,
) {}
```

Con `ValidationPipe` hay una trampa: por defecto **no** valida decoradores personalizados.

```ts
// Valida el objeto que devuelve la factory contra una clase con class-validator
@Post()
crear(
  @UsuarioActual(new ValidationPipe({ validateCustomDecorators: true }))
  usuario: UsuarioActualDto,
) {}
```

> ⚠️ Un `ValidationPipe` **global** (Sesión 6) ignora los parámetros de decoradores custom salvo que lo configures con `validateCustomDecorators: true`. Si no lo sabes, puedes creer que un objeto está validado cuando no lo está.

---

## 3. Decoradores de método/clase: tres formas de guardar metadata

### 3.1 `SetMetadata` (clásico)

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 3.2 `Reflector.createDecorator` (Nest 10+)

```ts
export const Roles = Reflector.createDecorator<Rol[]>();
// Con transformación: @Idempotente() → guarda { ttlSegundos: 86400 }
export const Idempotente = Reflector.createDecorator<number | undefined, { ttlSegundos: number }>({
  transform: (ttl) => ({ ttlSegundos: ttl ?? 86_400 }),
});
```

### 3.3 Metadata manual (cuando necesitas lógica propia)

```ts
// Acumular valores en vez de sobrescribirlos si se aplica varias veces
export const AUDITAR_KEY = Symbol('auditar');

export function Auditar(evento: string): MethodDecorator {
  return (target, _propertyKey, descriptor) => {
    const previos: string[] = Reflect.getMetadata(AUDITAR_KEY, descriptor.value!) ?? [];
    Reflect.defineMetadata(AUDITAR_KEY, [...previos, evento], descriptor.value!);
    return descriptor;
  };
}
```

> 💡 Nest guarda la metadata de método sobre `descriptor.value` (la función del handler), que es exactamente lo que devuelve `context.getHandler()`. Por eso `reflector.get(KEY, context.getHandler())` la encuentra.

| | `SetMetadata` | `Reflector.createDecorator` | Manual |
|---|---|---|---|
| Esfuerzo | Mínimo | Mínimo | Alto |
| Tipado al leer | Manual | Automático | Manual |
| Clave | String/Symbol exportado | El decorador | La que elijas |
| Aplicar dos veces | El último aplicado sobrescribe | Sobrescribe | Tú decides (acumular, validar) |
| Cuándo | Código existente, flags simples | **Default para código nuevo** | Semántica especial |

> ⚠️ Los decoradores se evalúan de **abajo hacia arriba** (el más cercano al método se aplica primero). Con `SetMetadata` sobre la misma clave, el que queda escrito arriba es el que se aplica último y **gana**. No apiles el mismo decorador dos veces esperando que se combinen.

---

## 4. Componer decoradores con `applyDecorators`

`applyDecorators` recibe decoradores y devuelve uno solo que los aplica todos. Es la herramienta para ocultar ceremonia repetida.

```ts
// src/auth/decorators/auth.decorator.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Roles } from './roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Rol } from '../usuario-actual.interface';

/**
 * @Auth()              → requiere estar autenticado
 * @Auth('admin')       → requiere rol admin
 * @Auth('editor','admin') → cualquiera de los dos
 */
export function Auth(...roles: Rol[]) {
  return applyDecorators(
    Roles(roles),
    UseGuards(JwtAuthGuard, RolesGuard),        // el orden de la lista es el orden de ejecución
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Token ausente o inválido' }),
    ApiForbiddenResponse({ description: 'Rol insuficiente' }),
  );
}
```

> 💡 Si en la Sesión 11 registraste `JwtAuthGuard` y `RolesGuard` como `APP_GUARD` (deny-by-default), `@Auth()` no debe volver a aplicar los guards —se ejecutarían **dos veces**—: basta con `Roles(roles)` + la documentación Swagger. Elige **un** modelo: guards globales + `@Public()`, o guards opt-in con `@Auth()`. La Sesión 19 discute cuándo conviene cada uno.

Decorador de clase compuesto:

```ts
// src/common/decorators/api-controller.decorator.ts
import { applyDecorators, Controller, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

export function ApiController(ruta: string) {
  return applyDecorators(
    Controller(ruta),
    ApiTags(ruta),
    UseInterceptors(LoggingInterceptor),
  );
}

@ApiController('categorias')
export class CategoriasController {}
```

> ⚠️ `applyDecorators` sirve para decoradores de **clase y método**. Los de **parámetro** no se componen así: para eso creas otro `createParamDecorator` o encadenas pipes.

> ❓ **Entrevista**: *"¿Qué ventaja tiene `@Auth('admin')` sobre escribir los guards a mano?"* → Consistencia y seguridad: una sola definición de "qué significa estar protegido" (guards en el orden correcto, metadata y documentación). Si mañana agregas un `UsuarioActivoGuard`, cambias un archivo y no 80 endpoints. Además la intención del endpoint se lee en una línea.

---

## 5. Decorador + interceptor: `@Idempotente()`

Los decoradores más potentes son los que **declaran** algo y dejan que un guard/interceptor global lo **ejecute**. Ejemplo: evitar órdenes duplicadas si el cliente reintenta un `POST /ordenes` (header `Idempotency-Key`).

```ts
// src/common/interceptors/idempotencia.interceptor.ts
import {
  BadRequestException, CallHandler, ConflictException, ExecutionContext,
  Injectable, NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, of, tap } from 'rxjs';
import { Idempotente } from '../decorators/idempotente.decorator';

@Injectable()
export class IdempotenciaInterceptor implements NestInterceptor {
  // ⚠️ Demo en memoria; en producción: Redis con SET NX + TTL (Sesión 25)
  private readonly respuestas = new Map<string, unknown>();
  private readonly enCurso = new Set<string>();

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const config = this.reflector.get(Idempotente, context.getHandler());
    if (!config) return next.handle();                    // endpoint no marcado → normal

    const req = context.switchToHttp().getRequest<Request & { user?: { id: number } }>();
    const key = req.header('idempotency-key');
    if (!key) throw new BadRequestException('Falta Idempotency-Key');

    const clave = `${req.user?.id ?? 'anon'}:${key}`;     // la clave incluye al usuario
    if (this.respuestas.has(clave)) return of(this.respuestas.get(clave));
    if (this.enCurso.has(clave)) throw new ConflictException('Request en curso');

    this.enCurso.add(clave);
    return next.handle().pipe(
      tap({
        next: (valor) => this.respuestas.set(clave, valor),
        finalize: () => this.enCurso.delete(clave),
      }),
    );
  }
}
```

```ts
@Idempotente()
@Post()
crear(@UsuarioActual('id') usuarioId: number, @Body() dto: CrearOrdenDto) {
  return this.ordenes.crear(usuarioId, dto);
}
```

Este patrón (metadata declarativa + enhancer global que la interpreta) es exactamente cómo funcionan `@nestjs/throttler` (`@Throttle`, `@SkipThrottle`), `@nestjs/cache-manager` (`@CacheTTL`) y `@nestjs/swagger`.

---

## 6. El request lifecycle completo

Esta es **la** pregunta de entrevista Mid de Nest. Memorízala y, sobre todo, entiende por qué cada pieza está donde está.

```
 Request entrante
      │
      ▼
 1. MIDDLEWARE ─────── global (app.use) → módulos (consumer.apply) en orden de registro
      │
      ▼
 2. GUARDS ─────────── global → controller → método
      │
      ▼
 3. INTERCEPTORS (antes) ─ global → controller → método
      │
      ▼
 4. PIPES ──────────── global → controller → método → parámetro
      │
      ▼
 5. HANDLER (controller) ─▶ servicios
      │
      ▼
 6. INTERCEPTORS (después) ─ método → controller → global   (orden inverso: cebolla)
      │
      ▼
 7. EXCEPTION FILTERS ── solo si hubo excepción: método → controller → global
      │                    (el más específico que coincida con @Catch la maneja; UNO solo)
      ▼
 Response
```

### 6.1 Por qué ese orden

| Etapa | Por qué está ahí |
|---|---|
| Middleware | Trabaja con la request cruda antes de enrutar (body parsing, CORS, correlation id). No sabe el handler. |
| Guards | Deciden acceso **lo antes posible** una vez conocido el handler: no tiene sentido validar un body de alguien que no puede entrar. |
| Interceptors (antes) | Envuelven todo lo que sigue, incluidos los pipes; así el tiempo medido y el cache incluyen la validación. |
| Pipes | Transforman/validan los **argumentos** justo antes de llamar al handler. Necesitan saber los tipos del handler. |
| Interceptors (después) | Ven y transforman el resultado. |
| Filters | Última red: convierten cualquier excepción de las etapas 2–6 en una respuesta. |

### 6.2 Detalles finos que separan a un Mid de un Junior

- **Middleware**: los globales (`app.use()`) corren primero; luego los ligados a módulos. Los del módulo raíz van antes, y después los de cada módulo en el orden en que aparece en `imports`.
- **Pipes de parámetro**: si varios parámetros tienen pipes, la documentación de Nest indica que se ejecutan desde el **último parámetro** con pipe **hacia el primero**. No escribas lógica que dependa de ese orden.
- **Filters**: son los únicos que **no** resuelven "global primero": busca el filtro más **específico** (método, luego controller, luego global) cuyo `@Catch()` coincida. Una excepción **no pasa de un filtro a otro**: si la atrapa el del método, el global no la ve.
- **Guards globales vs de módulo**: todos los `APP_GUARD` son globales; se ejecutan en orden de registro antes de los de controller.

### 6.3 ¿Qué pasa si algo lanza una excepción?

| Lanza en... | ¿Corre el handler? | ¿Corren los interceptors "después"? | ¿Quién la maneja? |
|---|---|---|---|
| Middleware | ❌ | ❌ | Filtros **globales** (aún no hay handler resuelto, no aplican los de controller/método) |
| Guard | ❌ | ❌ (los interceptors ni empezaron) | Filtros de método → controller → global |
| Interceptor (antes) | ❌ | Solo los más externos, vía su canal de error | Filtros |
| Pipe (ej. 400 de validación) | ❌ | Canal de error (`tap({ error })`, `catchError`) | Filtros |
| Handler / servicio | — | Canal de error; `map` **no** corre | Filtros (o un `catchError` que la transforme) |
| Interceptor (después) | ✅ ya corrió | Los más externos ven el error | Filtros |
| Exception filter | ✅/❌ | — | Ninguno: Nest responde 500 con su handler interno |

> ❓ **Entrevista**: *"Si un `ValidationPipe` rechaza el body, ¿se ejecuta mi `LoggingInterceptor`?"* → Su parte "antes" sí (los interceptors envuelven a los pipes). La parte "después" solo si la escribiste en el canal de error (`tap({ error })`); un `tap(next)` o un `map` no se ejecutan porque no hay valor, solo error. Después, el exception filter produce el 400.

---

## 7. Demostrarlo con código: el experimento de los logs

Nada fija el orden como verlo. Crea un enhancer de cada tipo que loguee:

```ts
// src/lifecycle-demo/lifecycle-demo.enhancers.ts
import {
  ArgumentMetadata, ArgumentsHost, CallHandler, CanActivate, Catch, ExceptionFilter,
  ExecutionContext, HttpException, Injectable, NestInterceptor, NestMiddleware, PipeTransform,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

const log = (msg: string) => console.log(`[lifecycle] ${msg}`);

@Injectable()
export class DemoMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    log('1. middleware');
    next();
  }
}

export const guard = (nivel: string): CanActivate => ({
  canActivate: () => { log(`2. guard ${nivel}`); return true; },
});

export const interceptor = (nivel: string): NestInterceptor => ({
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    log(`3. interceptor ${nivel} (antes)`);
    return next.handle().pipe(
      tap({
        next: () => log(`6. interceptor ${nivel} (después)`),
        error: () => log(`6. interceptor ${nivel} (error)`),
      }),
    );
  },
});

export const pipe = (nivel: string): PipeTransform => ({
  transform(value: unknown, meta: ArgumentMetadata) {
    log(`4. pipe ${nivel} → ${meta.type}${meta.data ? `(${meta.data})` : ''}`);
    return value;
  },
});

@Catch(HttpException)
export class DemoFilter implements ExceptionFilter {
  constructor(private readonly nivel: string) {}
  catch(ex: HttpException, host: ArgumentsHost) {
    log(`7. filter ${this.nivel}`);
    host.switchToHttp().getResponse<Response>().status(ex.getStatus()).json({ nivel: this.nivel });
  }
}
```

```ts
// src/lifecycle-demo/lifecycle-demo.controller.ts
import {
  BadRequestException, Body, Controller, Param, Post, Query,
  UseFilters, UseGuards, UseInterceptors, UsePipes,
} from '@nestjs/common';
import { DemoFilter, guard, interceptor, pipe } from './lifecycle-demo.enhancers';

@Controller('lifecycle')
@UseGuards(guard('controller'))
@UseInterceptors(interceptor('controller'))
@UsePipes(pipe('controller'))
@UseFilters(new DemoFilter('controller'))
export class LifecycleDemoController {
  @Post(':id')
  @UseGuards(guard('método'))
  @UseInterceptors(interceptor('método'))
  @UsePipes(pipe('método'))
  ejecutar(
    @Param('id', pipe('param')) id: string,
    @Query('falla') falla: string,
    @Body() body: unknown,
  ) {
    console.log('[lifecycle] 5. HANDLER');
    if (falla === 'si') throw new BadRequestException('falla pedida');
    return { id, body };
  }
}
```

```ts
// main.ts (solo para la demo)
app.useGlobalGuards(guard('global'));
app.useGlobalInterceptors(interceptor('global'));
app.useGlobalPipes(pipe('global'));
app.useGlobalFilters(new DemoFilter('global'));
```

Salida de `POST /lifecycle/7` (el orden relativo entre parámetros puede variar, justamente lo que el punto 6.2 advierte):

```
[lifecycle] 1. middleware
[lifecycle] 2. guard global
[lifecycle] 2. guard controller
[lifecycle] 2. guard método
[lifecycle] 3. interceptor global (antes)
[lifecycle] 3. interceptor controller (antes)
[lifecycle] 3. interceptor método (antes)
[lifecycle] 4. pipe global → body / query / param ...     (global, controller, método, param por cada argumento)
[lifecycle] 5. HANDLER
[lifecycle] 6. interceptor método (después)
[lifecycle] 6. interceptor controller (después)
[lifecycle] 6. interceptor global (después)
```

Con `?falla=si`, los tres interceptors loguean `(error)` en orden inverso y luego aparece **solo** `7. filter controller`: el filtro más específico ganó y el global **no** se ejecutó.

> ⚠️ Nota que los pipes se aplican **a cada argumento**: un `ValidationPipe` global corre sobre `@Body()`, `@Query()` y `@Param()` del handler. Por eso filtra por `metadata.type` o por la clase (`metatype`) cuando corresponde (Sesión 10).

---

## 8. Tabla maestra de enhancers

| | Middleware | Guard | Interceptor | Pipe | Filter |
|---|---|---|---|---|---|
| Interfaz | `NestMiddleware` | `CanActivate` | `NestInterceptor` | `PipeTransform` | `ExceptionFilter` |
| Recibe | `req, res, next` | `ExecutionContext` | `ExecutionContext, CallHandler` | `value, ArgumentMetadata` | `exception, ArgumentsHost` |
| Global con DI | `consumer.apply(...)` en un módulo, para todas las rutas (Sesión 8) | `APP_GUARD` | `APP_INTERCEPTOR` | `APP_PIPE` | `APP_FILTER` |
| Global sin DI | `app.use()` | `useGlobalGuards` | `useGlobalInterceptors` | `useGlobalPipes` | `useGlobalFilters` |
| Controller / método | `forRoutes(Controller)` | `@UseGuards` | `@UseInterceptors` | `@UsePipes` | `@UseFilters` |
| Parámetro | ❌ | ❌ | ❌ | ✅ `@Body(Pipe)` | ❌ |
| Transportes | Solo HTTP | Todos | Todos | Todos | Todos (con su `ArgumentsHost`) |
| Pregunta que responde | "¿Preparo la request?" | "¿Puede entrar?" | "¿Qué hago alrededor?" | "¿Son válidos/convertibles los datos?" | "¿Cómo respondo este error?" |

> ❓ **Entrevista**: *"Tengo que rechazar requests sin header `X-Tenant`, ¿middleware, guard o pipe?"* → Depende de la regla: si es "toda la API necesita un tenant para funcionar" y además quieres cargarlo en la request, **middleware** (o guard global). Si depende del endpoint (algunos son multi-tenant, otros no, declarado con metadata), **guard**. Un pipe solo tiene sentido si el tenant es un **argumento** del handler que hay que validar/convertir.

---

## 9. Errores comunes

> ⚠️ **Hacer I/O en un `createParamDecorator`** (ej. cargar el usuario completo desde la BD). La factory no tiene DI (es una función, no un provider) y no es `async`-friendly: si devuelves una `Promise`, el handler recibe la `Promise`. Carga los datos en un guard/interceptor (que sí tienen DI) y deja el decorador solo para **leer** lo que ya está en la request.

> ⚠️ **Decoradores que dependen de un guard que no se ejecutó**: `@UsuarioActual()` en un endpoint `@Public()` devuelve `undefined` si no lanzas. Falla ruidosamente (401) en la factory.

> ⚠️ **Usar `@Req()` "porque es más fácil"** y terminar con servicios que reciben `Request`. Contamina capas: tus servicios deberían recibir datos del dominio (`usuarioId: number`), nunca objetos del transporte.

> ⚠️ **Registrar el mismo guard global y en `@UseGuards`**: se ejecuta dos veces (doble verificación del JWT, doble query).

> ⚠️ **Confundir orden de declaración con orden de ejecución**: en `@UseGuards(A, B)` corre A y luego B; pero entre decoradores apilados (`@X() @Y() metodo`), TypeScript aplica primero `@Y`. Nest no ejecuta enhancers según cómo apilas los decoradores, sino según el **nivel** (global/controller/método) y el orden dentro de cada lista.

---

## Resumen mental de la sesión

```
Decoradores propios
  Parámetro:  createParamDecorator((data, ctx) => ...)   @UsuarioActual('id')  @Paginar({...})
              + pipes: @UsuarioActual(new ValidationPipe({ validateCustomDecorators: true }))
              sin DI, sin async, solo LEER la request
  Metadata:   SetMetadata(KEY, v) | Reflector.createDecorator<T>({ transform? }) | Reflect.defineMetadata
  Composición: applyDecorators(Roles(r), UseGuards(...), ApiBearerAuth(), ...)  → @Auth('admin')
  Patrón:     decorador DECLARA + guard/interceptor global EJECUTA (throttler, cache, idempotencia)

Lifecycle
  1 Middleware (app.use → módulos)
  2 Guards        global → controller → método
  3 Interceptors  global → controller → método   (antes)
  4 Pipes         global → controller → método → parámetro
  5 Handler
  6 Interceptors  método → controller → global   (después)
  7 Filters       método → controller → global   (UNO solo, el más específico que coincida)

Error en cualquier etapa → salta al canal de error → filters
Error en middleware → solo filtros globales
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué recibe la factory de `createParamDecorator` y qué representa `data`?
2. ❓ ¿Por qué `@UsuarioActual()` es mejor que `@Req() req` en un handler?
3. ❓ ¿Por qué un `ValidationPipe` global no valida lo que devuelve tu decorador custom y cómo lo activas?
4. ❓ ¿Por qué no deberías consultar la base de datos dentro de un `createParamDecorator`?
5. ❓ `SetMetadata` vs `Reflector.createDecorator` vs `Reflect.defineMetadata`: ¿cuándo cada uno?
6. ❓ ¿Qué hace `applyDecorators` y en qué tipo de decorador **no** sirve?
7. ❓ Recita el orden completo del request lifecycle, incluyendo el orden global/controller/método de cada etapa.
8. ❓ ¿Por qué los guards van antes que los pipes y los interceptors envuelven a los pipes?
9. ❓ ¿En qué se diferencian los exception filters del resto en cuanto al orden de resolución? ¿Una excepción puede pasar por dos filtros?
10. ❓ Si un pipe lanza un 400, ¿qué partes de los interceptors se ejecutan?
11. ❓ Una excepción lanzada en un middleware, ¿la atrapa un `@UseFilters` del controller? ¿Por qué?
12. ❓ Describe el patrón "decorador declara, enhancer global ejecuta" con un ejemplo del ecosistema.

## Ejercicio práctico
1. Crea `@UsuarioActual()` (con `data` opcional) y reemplaza todos los `@Req()` de TiendaApi.
2. Crea `@Paginar()` con límites configurables y úsalo en `GET /productos` y `GET /ordenes/mias`. Compara con un `PaginacionQueryDto` y decide cuál dejas; justifícalo en un comentario.
3. Crea `@IpCliente()` y guarda la IP en la creación de órdenes (campo `ipOrigen`).
4. Implementa `@Auth(...roles)` con `applyDecorators` coherente con tu modelo de la Sesión 11 (si usas guards globales, que solo aplique `Roles` + Swagger).
5. Implementa `@Idempotente()` + `IdempotenciaInterceptor` y protégelo en `POST /ordenes`. Envía dos veces la misma `Idempotency-Key` y verifica que solo se crea una orden.
6. Crea el módulo `lifecycle-demo` de la sección 7, ejecuta los tres casos (éxito, `?falla=si`, guard de método que devuelve `false`) y copia los logs a un comentario explicando cada línea.
7. Quita el `@UseFilters` del controller en la demo y verifica que ahora responde el filtro global.
8. Lanza una excepción desde `DemoMiddleware` y comprueba cuál filtro la maneja.
9. Escribe un test unitario de la factory de `@Paginar()`. Pista: exporta la función factory por separado y pruébala con un `ExecutionContext` falso.
10. Borra el módulo de demo (o exclúyelo del `AppModule`) antes de seguir.

---

➡️ **Cuando termines**, marca la Sesión 13 en el [README](README.md) y pasa a la **Sesión 14 — TypeORM: entidades, relaciones, repositorios, QueryBuilder**.
