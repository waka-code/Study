# Sesión 11 — Guards: autorización por request, ExecutionContext y Reflector

> **Objetivo de la sesión**: entender *qué problema resuelven* los guards y *dónde* se ubican en el ciclo de vida de la request. Al terminar deberías poder escribir guards propios (API key, JWT, roles), explicar por qué un guard recibe un `ExecutionContext` y no un `req` a secas, leer metadata con `Reflector` (`get`, `getAllAndOverride`, `getAllAndMerge`, `createDecorator`), aplicar guards a nivel de método, controller y global (con y sin DI), implementar el patrón `@Public()` y testear un guard sin levantar HTTP.

---

## 1. ¿Qué es un guard y por qué existe?

Un **guard** es una clase que implementa `CanActivate` y responde **una sola pregunta**: *¿esta request puede llegar al handler?* Devuelve `true` (pasa) o `false` (Nest lanza `403 Forbidden`), o lanza su propia excepción.

```
Request ─▶ Middleware ─▶ GUARDS ─▶ Interceptors (antes) ─▶ Pipes ─▶ Handler
                            │
                            └─ false / throw ─▶ Exception filters ─▶ 403 / 401
```

¿Por qué no hacerlo en un middleware (Sesión 8)? Porque el middleware es **tonto respecto al destino**: recibe `req`, `res`, `next` y no sabe *qué handler* se va a ejecutar ni qué metadata tiene. Un guard, en cambio, se ejecuta **después de resolver la ruta** y conoce el controller, el método y sus decoradores. Eso permite reglas declarativas:

```ts
@Roles('admin')          // ← metadata en el handler
@Delete(':id')
eliminar() { ... }       // el guard lee @Roles y decide
```

| | Middleware | Guard |
|---|---|---|
| Sabe qué handler se ejecutará | ❌ | ✅ (`context.getHandler()`) |
| Lee metadata de decoradores | ❌ | ✅ (con `Reflector`) |
| Funciona en HTTP, WS, microservicios, GraphQL | Solo HTTP | ✅ (vía `ExecutionContext`) |
| Responsabilidad típica | CORS, logging crudo, body parsing, correlation id | **Autenticación y autorización** |
| Resultado | Llama o no a `next()` | `true` / `false` / excepción |

> ❓ **Entrevista**: *"¿Por qué la autorización va en un guard y no en un middleware?"* → Porque autorizar depende del **destino** (qué rol exige *este* endpoint). El middleware corre antes de que Nest asocie la request a un handler, así que no puede leer la metadata de `@Roles()`. El guard sí, y además es agnóstico al transporte (HTTP, WebSockets, RPC).

---

## 2. La interfaz `CanActivate`

```ts
// src/common/guards/siempre-permite.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SiemprePermiteGuard implements CanActivate {
  // Puede devolver boolean, Promise<boolean> u Observable<boolean>
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
```

- **Síncrono** (`boolean`): reglas simples, sin I/O.
- **`Promise<boolean>`**: lo más común (verificar un token, consultar la BD).
- **`Observable<boolean>`**: si tu código ya es RxJS. Nest toma el **primer** valor emitido.

Qué pasa según el resultado:

| El guard... | Resultado |
|---|---|
| devuelve `true` | Continúa al siguiente guard o a los interceptors |
| devuelve `false` | Nest lanza `ForbiddenException` → **403** `"Forbidden resource"` |
| lanza `UnauthorizedException` | **401** (tú eliges el status) |
| lanza cualquier excepción | La procesa la capa de **exception filters** (Sesión 9) |

> ⚠️ Devolver `false` **siempre** produce 403. Si el problema es "no sé quién eres" (token ausente o inválido), lo correcto es **401**, y eso solo se logra **lanzando** `UnauthorizedException`. Regla: **401 = no autenticado, 403 = autenticado pero sin permiso**.

---

## 3. `ExecutionContext`: por qué no recibes `req`

Nest no es solo HTTP. El mismo guard puede proteger un endpoint REST, un gateway de WebSockets (Sesión 27), un handler de microservicio (Sesión 29) o un resolver GraphQL (Sesión 28). Por eso recibe una **abstracción del contexto**:

```
ArgumentsHost                        ← "los argumentos del handler", sin importar el transporte
   ├── getType()                    'http' | 'rpc' | 'ws' | 'graphql'
   ├── getArgs() / getArgByIndex()
   ├── switchToHttp()  → getRequest(), getResponse(), getNext()
   ├── switchToRpc()   → getData(), getContext()
   └── switchToWs()    → getClient(), getData()
        ▲
ExecutionContext (extiende ArgumentsHost)
   ├── getClass()                   la CLASE del controller  (ej. ProductosController)
   └── getHandler()                 la FUNCIÓN del método    (ej. ProductosController.prototype.eliminar)
```

`getClass()` y `getHandler()` son la clave: son exactamente los **targets** donde los decoradores guardaron metadata. Por eso el guard puede leerla.

```ts
import { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

function extraerRequest(context: ExecutionContext): Request {
  // Para HTTP (Express o Fastify, según el adapter)
  return context.switchToHttp().getRequest<Request>();
}

function describir(context: ExecutionContext): string {
  const clase = context.getClass().name;     // "ProductosController"
  const metodo = context.getHandler().name;  // "eliminar"
  return `${context.getType()} → ${clase}.${metodo}`;
}
```

Un guard multi-transporte:

```ts
canActivate(context: ExecutionContext): boolean {
  switch (context.getType<'http' | 'ws' | 'rpc'>()) {
    case 'http': {
      const req = context.switchToHttp().getRequest();
      return Boolean(req.headers['authorization']);
    }
    case 'ws': {
      const client = context.switchToWs().getClient();       // socket de Socket.io
      return Boolean(client.handshake?.auth?.token);
    }
    case 'rpc': {
      const ctx = context.switchToRpc().getContext();        // depende del transport
      return Boolean(ctx);
    }
    default:
      return false;
  }
}
```

> 💡 Para GraphQL, `getType()` devuelve `'graphql'` y necesitas `GqlExecutionContext.create(context).getContext().req` de `@nestjs/graphql`. Lo veremos en la Sesión 28.

---

## 4. Primer guard real: API key para TiendaApi

Caso: los endpoints de `/internal/*` los consume un job interno que se autentica con un header `x-api-key`.

```ts
// src/common/guards/api-key.guard.ts
import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: Buffer;

  constructor(config: ConfigService) {
    // getOrThrow: si falta la variable, la app NO arranca (Sesión 7)
    this.apiKey = Buffer.from(config.getOrThrow<string>('INTERNAL_API_KEY'));
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const recibida = req.header('x-api-key');

    if (!recibida) {
      throw new UnauthorizedException('Falta el header x-api-key');
    }

    const buf = Buffer.from(recibida);
    // Comparación en tiempo constante: evita timing attacks.
    // timingSafeEqual exige mismo largo, por eso se compara antes.
    const valida = buf.length === this.apiKey.length && timingSafeEqual(buf, this.apiKey);

    if (!valida) throw new UnauthorizedException('API key inválida');
    return true;
  }
}
```

```ts
// src/internal/internal.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ProductosService } from '../productos/productos.service';

@Controller('internal')
@UseGuards(ApiKeyGuard)                    // ← aplica a TODOS los métodos del controller
export class InternalController {
  constructor(private readonly productos: ProductosService) {}

  @Post('reindexar')
  reindexar() {
    return this.productos.reindexar();
  }
}
```

> ⚠️ Comparar secretos con `===` filtra información por tiempo de respuesta (se corta en el primer carácter distinto). Para API keys, firmas de webhooks o tokens, usa `crypto.timingSafeEqual`.

> ❓ **Entrevista**: *"¿`@UseGuards(ApiKeyGuard)` o `@UseGuards(new ApiKeyGuard())`?"* → Pasar la **clase** deja que Nest la instancie con **DI** (aquí necesita `ConfigService`). Pasar una **instancia** la creas tú, sin inyección. Prefiere la clase salvo que el guard reciba configuración por constructor y no tenga dependencias.

---

## 5. Dónde se aplica un guard: método, controller, global

```ts
@UseGuards(A)             // nivel CONTROLLER
@Controller('productos')
export class ProductosController {
  @UseGuards(B, C)        // nivel MÉTODO (se ejecutan B y luego C)
  @Delete(':id')
  eliminar() {}
}
```

Orden de ejecución: **global → controller → método**, y dentro de un mismo `@UseGuards(...)`, en el **orden en que se listan**. El primero que falla **corta** la cadena: los siguientes no se ejecutan.

```
Global (APP_GUARD, en orden de registro)
   └─▶ Controller: A
          └─▶ Método: B ─▶ C ─▶ (interceptors...)
```

### 5.1 Guards globales: dos formas, una trampa

```ts
// Forma 1: main.ts — SIN inyección de dependencias del módulo
const app = await NestFactory.create(AppModule);
app.useGlobalGuards(new ApiKeyGuard(app.get(ConfigService)));   // tienes que armarlo a mano
```

```ts
// Forma 2 (recomendada): como provider con el token APP_GUARD — CON DI
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },   // se ejecuta primero
    { provide: APP_GUARD, useClass: RolesGuard },     // luego este
  ],
})
export class AppModule {}
```

| | `app.useGlobalGuards()` | `APP_GUARD` |
|---|---|---|
| Inyección de dependencias | ❌ (instancia manual) | ✅ |
| Aparece en tests e2e con `Test.createTestingModule` | ❌ (vive en `main.ts`) | ✅ (vive en un módulo) |
| Se puede sobrescribir en tests | Difícil | Sí, registrándolo con `useExisting` (ver sección 11) |
| En apps híbridas (HTTP + microservicio) | Solo aplica a la app HTTP por defecto | Aplica a todo |

> ⚠️ Un `APP_GUARD` es **global aunque lo declares en un módulo de feature**. No importa si lo pones en `AuthModule` o `AppModule`: aplica a toda la app. Por claridad, declara los globales en el módulo donde vive el guard (ej. `AuthModule`) o en `AppModule`, pero no dupliques.

> ❓ **Entrevista**: *"Registré un guard global en `main.ts` y en los tests e2e no se aplica, ¿por qué?"* → Porque en los tests e2e construyes la app con `Test.createTestingModule({ imports: [AppModule] })` y `main.ts` no se ejecuta. Si el guard se registra con `APP_GUARD` dentro de un módulo, viaja con el módulo y se aplica también en tests (Sesión 22).

---

## 6. `Reflector`: leer metadata de decoradores

Los decoradores de Nest guardan metadata con `Reflect.defineMetadata` (Sesión 2). `Reflector` es el servicio (de `@nestjs/core`, inyectable en cualquier provider) que la **lee**.

### 6.1 Dos formas de crear el decorador

```ts
// Forma clásica: SetMetadata con una clave string
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
```

```ts
// Forma moderna (Nest 10+): Reflector.createDecorator — tipado de punta a punta
import { Reflector } from '@nestjs/core';
export const Roles = Reflector.createDecorator<Rol[]>();
// Uso: @Roles(['admin', 'editor'])   ← recibe UN argumento (el array), no varargs
```

| | `SetMetadata(KEY, valor)` | `Reflector.createDecorator<T>()` |
|---|---|---|
| Clave | String/Symbol que exportas tú | El propio decorador es la clave |
| Tipado al leer | Manual: `reflector.get<Rol[]>(KEY, ...)` | Automático: `reflector.get(Roles, ...)` es `Rol[]` |
| Firma | La que definas (varargs posible) | Un solo argumento de tipo `T` |
| Transformar el valor | En tu función wrapper | Opción `transform` |

### 6.2 Los métodos de lectura

```ts
// Solo el método
reflector.get(Roles, context.getHandler());

// Método tiene prioridad sobre la clase: devuelve el PRIMER valor definido
reflector.getAllAndOverride(Roles, [context.getHandler(), context.getClass()]);

// Combina ambos: concatena arrays / fusiona objetos
reflector.getAllAndMerge(Roles, [context.getHandler(), context.getClass()]);
```

```ts
@Roles(['admin'])                 // clase
@Controller('ordenes')
export class OrdenesController {
  @Roles(['soporte'])             // método
  @Get(':id')
  obtener() {}
}
```

| Método | Resultado para `obtener` | Semántica |
|---|---|---|
| `get(Roles, handler)` | `['soporte']` | Solo el método |
| `get(Roles, clase)` | `['admin']` | Solo la clase |
| `getAllAndOverride` | `['soporte']` | "El más específico gana" |
| `getAllAndMerge` | `['soporte', 'admin']` | "Se acumulan" |

> ❓ **Entrevista**: *"¿Cuándo usarías `getAllAndOverride` y cuándo `getAllAndMerge`?"* → `Override` cuando el método **reemplaza** la política del controller (ej. `@Public()` en un endpoint de un controller protegido, o un rol distinto). `Merge` cuando las reglas **se suman** (ej. permisos requeridos a nivel de clase más permisos extra del método). Elegir mal cambia la semántica de seguridad: es una decisión de diseño, no de estilo.

---

## 7. El patrón `@Public()` con un guard global de autenticación

La práctica segura es **denegar por defecto**: un guard de autenticación global y un decorador explícito para abrir endpoints. Si alguien olvida el decorador, el endpoint queda **protegido**, no expuesto.

```ts
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```ts
// src/auth/usuario-actual.interface.ts
export type Rol = 'cliente' | 'editor' | 'admin';

export interface UsuarioActual {
  id: number;
  email: string;
  roles: Rol[];
}
```

```ts
// src/auth/guards/jwt-auth.guard.ts
import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsuarioActual } from '../usuario-actual.interface';

interface JwtPayload {
  sub: number;
  email: string;
  roles: UsuarioActual['roles'];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. ¿El endpoint (o su controller) está marcado como público?
    const esPublico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) return true;

    // 2. Extraer el token "Bearer xxx"
    const req = context.switchToHttp().getRequest<Request & { user?: UsuarioActual }>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token ausente');
    }

    // 3. Verificar firma y expiración
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      // 4. Adjuntar el usuario a la request: lo leerán otros guards, el handler, etc.
      req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
```

```ts
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },  // 1º: ¿quién eres?
    { provide: APP_GUARD, useClass: RolesGuard },    // 2º: ¿puedes?
  ],
})
export class AuthModule {}
```

```ts
// src/productos/productos.controller.ts
@Controller('productos')
export class ProductosController {
  @Public()                 // catálogo visible sin login
  @Get()
  listar() { /* ... */ }

  @Post()                   // sin @Public → requiere token
  crear(@Body() dto: CrearProductoDto) { /* ... */ }
}
```

> 💡 En producción normalmente usarás `@nestjs/passport` con `AuthGuard('jwt')` y una estrategia de Passport. Es la misma idea envuelta en una librería; lo construimos en la **Sesión 18** (con refresh tokens y hashing). Aquí lo escribimos a mano para ver que **un guard no tiene magia**.

> ⚠️ El orden de los `APP_GUARD` es el orden de registro. Si `RolesGuard` corriera antes que `JwtAuthGuard`, `req.user` aún no existiría y rechazaría todo. Además, los guards de autenticación deben correr **antes** que el `ThrottlerGuard` si limitas por usuario, o **después** si limitas por IP para frenar fuerza bruta (Sesión 20).

---

## 8. `RolesGuard`: autorización declarativa

```ts
// src/auth/decorators/roles.decorator.ts
import { Reflector } from '@nestjs/core';
import { Rol } from '../usuario-actual.interface';

export const Roles = Reflector.createDecorator<Rol[]>();
```

```ts
// src/auth/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { UsuarioActual } from '../usuario-actual.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles → el endpoint no exige rol (solo autenticación)
    if (!requeridos || requeridos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: UsuarioActual }>();
    if (!user) return false;   // endpoint @Public con @Roles: incoherente → 403

    // Basta con tener UNO de los roles requeridos
    return requeridos.some((rol) => user.roles.includes(rol));
  }
}
```

```ts
@Controller('productos')
export class ProductosController {
  @Roles(['editor', 'admin'])
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarProductoDto) {}

  @Roles(['admin'])
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {}
}
```

Flujo completo de `DELETE /productos/7` con un usuario `editor`:

```
JwtAuthGuard: ¿@Public? no → verifica token ✔ → req.user = { roles: ['editor'] }
RolesGuard:   requeridos = ['admin'] → 'editor' ∉ → false
Nest:         ForbiddenException → 403 { "message": "Forbidden resource" }
Handler:      NUNCA se ejecuta
```

> 💡 RBAC por roles se queda corto cuando la regla depende del **recurso** ("un cliente solo puede ver *sus* órdenes"). Eso es autorización basada en ownership/atributos, que resolvemos con CASL y policies en la **Sesión 19**.

---

## 9. Lo que un guard puede y no puede ver

Un guard corre **antes** de los pipes. Consecuencias:

| Dato | ¿Disponible en el guard? |
|---|---|
| Headers, IP, cookies (crudos) | ✅ |
| `req.params`, `req.query`, `req.body` | ✅ pero **sin validar ni transformar** (strings crudos) |
| DTO validado por `ValidationPipe` | ❌ Todavía no se ejecutó |
| Metadata del handler/clase | ✅ con `Reflector` |
| Resultado del handler | ❌ Para eso están los interceptors (Sesión 12) |
| `req.user` puesto por un guard anterior | ✅ |

```ts
// ⚠️ req.params.id es "7" (string), no 7. Y podría ser "abc".
const id = Number(req.params.id);
if (!Number.isInteger(id)) return false;
```

> ⚠️ No valides la **forma** del body en un guard: eso es trabajo del `ValidationPipe`. El guard decide *acceso*; si necesitas el recurso para decidir (ownership), carga lo mínimo o delega la verificación al servicio.

### 9.1 Guards que consultan la base de datos

Es válido que un guard sea `async` y consulte algo (ej. "¿la tienda está en mantenimiento?", "¿el usuario sigue activo?"). Pero recuerda que corre en **cada request** del endpoint protegido:

```ts
@Injectable()
export class UsuarioActivoGuard implements CanActivate {
  constructor(private readonly usuarios: UsuariosService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<{ user?: UsuarioActual }>();
    if (!user) return false;
    // Una query por request: considera cachear (Sesión 25)
    return this.usuarios.estaActivo(user.id);
  }
}
```

> ❓ **Entrevista**: *"¿Un guard puede ser request-scoped?"* → Puede depender de providers request-scoped, pero eso vuelve request-scoped a toda la cadena que lo usa (incluidos los controllers), con costo de instanciación por request (Sesión 23). Normalmente no hace falta: todo lo que el guard necesita de la request está en el `ExecutionContext`.

---

## 10. Guards fuera de HTTP (adelanto)

La misma clase se reutiliza en otros transportes, pero la **excepción** debe ser la del transporte:

```ts
import { WsException } from '@nestjs/websockets';
import { RpcException } from '@nestjs/microservices';

// En un gateway WebSocket: throw new WsException('No autorizado');
// En un microservicio:      throw new RpcException('No autorizado');
```

`UnauthorizedException` es una `HttpException`: en un gateway WS no se traduce a un evento de error útil a menos que tengas un filtro que la convierta. Lo vemos en las Sesiones 27 y 29.

---

## 11. Testing de un guard

Un guard es una clase: se prueba instanciándola y fabricando un `ExecutionContext` falso. No hace falta levantar HTTP.

```ts
// src/auth/guards/roles.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Rol } from '../usuario-actual.interface';

function crearContexto(roles: Rol[]): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controlador {},
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 1, email: 'a@b.cl', roles } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite si el endpoint no exige roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(crearContexto(['cliente']))).toBe(true);
  });

  it('rechaza a un editor en un endpoint de admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(crearContexto(['editor']))).toBe(false);
  });

  it('permite si tiene alguno de los roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor', 'admin']);
    expect(guard.canActivate(crearContexto(['editor']))).toBe(true);
  });
});
```

En tests e2e puedes reemplazar un guard completo:

```ts
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideGuard(JwtAuthGuard)
  .useValue({ canActivate: () => true })   // "todos autenticados"
  .compile();
```

> ⚠️ `overrideGuard` sirve para guards usados con `@UseGuards(...)`, pero **no** alcanza a un `{ provide: APP_GUARD, useClass: JwtAuthGuard }`: ese provider se registra bajo el token `APP_GUARD`, no bajo la clase. El truco es registrar la clase como provider normal y apuntar el token global a ella:
>
> ```ts
> providers: [
>   JwtAuthGuard,                                      // provider con su propio token
>   { provide: APP_GUARD, useExisting: JwtAuthGuard }, // el global reutiliza esa instancia
> ]
> // en el test: .overrideProvider(JwtAuthGuard).useValue({ canActivate: () => true })
> ```
>
> Si en los tests "apagas" la autenticación, agrega al menos un test e2e **sin** override que verifique el 401: es el test que evita el desastre de desplegar endpoints abiertos. Más en la Sesión 22.

---

## 12. Errores comunes

> ⚠️ **Olvidar `@Injectable()`** en un guard con dependencias: Nest no puede resolver el constructor y falla al arrancar con *"Nest can't resolve dependencies of the XGuard"*.

> ⚠️ **Usar el guard en un módulo que no tiene acceso a sus dependencias**. `@UseGuards(JwtAuthGuard)` en `ProductosController` instancia el guard **en el contexto de `ProductosModule`**: si el guard inyecta `JwtService`, ese módulo debe importar `JwtModule` (o el módulo que lo exporta). Con `APP_GUARD` se resuelve en el módulo donde lo declaraste.

> ⚠️ **Meter lógica de negocio en guards**. "¿Hay stock?" no es una pregunta de acceso: es una regla de dominio que va en el servicio y produce un 409/422, no un 403.

> ⚠️ **Guardar estado en la instancia del guard**. Los guards son singletons por defecto: un `this.usuario = ...` se comparte entre requests concurrentes. Usa `req.user` para pasar datos.

> ⚠️ **Confiar en headers como `x-user-id`** que el cliente puede falsificar. La identidad sale **solo** de algo verificado (firma del JWT, sesión en servidor, mTLS).

---

## Resumen mental de la sesión

```
Guard = CanActivate.canActivate(ctx) → boolean | Promise | Observable
  true  → sigue      false → 403 ForbiddenException      throw → tu status (401, etc.)

Posición: Middleware → GUARDS → Interceptors → Pipes → Handler
  Sabe el handler (a diferencia del middleware), NO ve datos transformados por pipes

ExecutionContext (extiende ArgumentsHost)
  getType()  switchToHttp/Ws/Rpc()  getHandler()  getClass()

Aplicación: @UseGuards(Clase) ← con DI   |  new Instancia() ← sin DI
  Orden: global → controller → método; en la lista, izquierda → derecha; el primero que falla corta
  Global: APP_GUARD (DI, viaja con el módulo)  vs  app.useGlobalGuards (sin DI, solo main.ts)

Reflector
  SetMetadata(KEY, v)  |  Reflector.createDecorator<T>()
  get · getAllAndOverride (específico gana) · getAllAndMerge (se acumulan)

Patrones: deny-by-default + @Public() | JwtAuthGuard → RolesGuard (orden de registro)
401 = ¿quién eres?   403 = sé quién eres, pero no puedes
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué problema resuelve un guard que un middleware no puede resolver?
2. ❓ ¿Qué pasa exactamente cuando `canActivate` devuelve `false`? ¿Cómo devuelves un 401?
3. ❓ ¿Qué es `ExecutionContext` y en qué se diferencia de `ArgumentsHost`? ¿Para qué sirven `getHandler()` y `getClass()`?
4. ❓ ¿En qué orden se ejecutan guards globales, de controller y de método? ¿Y varios en el mismo `@UseGuards`?
5. ❓ `app.useGlobalGuards()` vs `APP_GUARD`: diferencias y cuál elegirías.
6. ❓ ¿Por qué pasar la clase del guard a `@UseGuards` y no una instancia?
7. ❓ `getAllAndOverride` vs `getAllAndMerge`: da un ejemplo donde elegir mal abra un hueco de seguridad.
8. ❓ `SetMetadata` vs `Reflector.createDecorator`: ¿qué ganas con el segundo?
9. ❓ Explica el patrón "deny by default" con `@Public()`. ¿Por qué es más seguro que poner `@UseGuards(Auth)` en cada controller?
10. ❓ ¿Puede un guard leer el DTO validado del body? ¿Por qué?
11. ❓ ¿Por qué no deberías guardar datos del usuario en una propiedad de la instancia del guard?
12. ❓ ¿Cómo testeas un guard unitariamente? ¿Y cómo lo desactivas en un test e2e?

## Ejercicio práctico
1. En TiendaApi crea `src/auth/` con `UsuarioActual`, el decorador `@Public()` y el decorador `Roles` con `Reflector.createDecorator<Rol[]>()`.
2. Instala `@nestjs/jwt`, agrega `JWT_SECRET` al `.env` y a la validación de config (Sesión 7).
3. Implementa `JwtAuthGuard` y `RolesGuard` y regístralos como `APP_GUARD` en `AuthModule`, en ese orden.
4. Crea un endpoint temporal `POST /auth/token-demo` marcado `@Public()` que firme un JWT con `jwt.signAsync({ sub, email, roles })` según el body (solo para desarrollo; el login real llega en la Sesión 18).
5. Marca `GET /productos` y `GET /productos/:id` como `@Public()`; `POST`/`PATCH` con `@Roles(['editor', 'admin'])` y `DELETE` con `@Roles(['admin'])`.
6. Prueba con un archivo `.http` o `curl`: sin token (401), token de `cliente` en `POST` (403), token de `editor` en `DELETE` (403), token de `admin` en `DELETE` (200/204).
7. Implementa `ApiKeyGuard` con `timingSafeEqual` y protégelo en un `InternalController`.
8. Invierte el orden de los `APP_GUARD` y observa qué se rompe; explícalo en un comentario y restáuralo.
9. Escribe los tests unitarios de `RolesGuard` y un test de `JwtAuthGuard` que verifique que un endpoint `@Public()` pasa sin token.
10. (Opcional) Agrega `@Roles(['admin'])` a nivel de controller en `OrdenesController` y `@Roles(['soporte'])` en un método; compara el resultado usando `getAllAndOverride` y luego `getAllAndMerge`.

---

➡️ **Cuando termines**, marca la Sesión 11 en el [README](README.md) y pasa a la **Sesión 12 — Interceptors: RxJS, logging, transformación, timeout, caching**.
