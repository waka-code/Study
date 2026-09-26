# Sesión 23 — DI avanzada: custom providers, scopes, dependencias circulares, ModuleRef

> **Objetivo de la sesión**: pasar de "pongo `@Injectable()` y funciona" a entender **cómo resuelve Nest el grafo de dependencias**. Al terminar deberías poder usar todos los tipos de custom providers (`useClass`, `useValue`, `useFactory`, `useExisting`) y tokens (clase, string, symbol, clase abstracta), explicar los scopes `DEFAULT`, `REQUEST` y `TRANSIENT` con su **costo real** y la **propagación hacia arriba** (scope bubbling), usar **durable providers** para multi-tenancy, diagnosticar y resolver **dependencias circulares**, y usar `ModuleRef` y `LazyModuleLoader` para resolución dinámica.

---

## 1. Repaso rápido: qué hace realmente el contenedor

En la Sesión 5 viste lo básico: una clase con `@Injectable()`, registrada en `providers` de un módulo, inyectada por constructor. Por dentro ocurre esto:

```
 Arranque (NestFactory.create)
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. Scanner: recorre AppModule y sus imports → grafo de      │
 │    módulos; registra providers, controllers, exports.       │
 │ 2. Para cada provider lee sus dependencias:                 │
 │    - design:paramtypes (tipos del constructor, gracias a    │
 │      emitDecoratorMetadata)                                 │
 │    - self:paramtypes (tokens explícitos de @Inject(...))    │
 │ 3. Injector: instancia en orden topológico (primero lo que  │
 │    no depende de nada), una vez por token y módulo host.    │
 │ 4. Lifecycle hooks: onModuleInit, onApplicationBootstrap    │
 └─────────────────────────────────────────────────────────────┘
```

Tres ideas que sostienen todo lo que sigue:

1. **Un provider = un token + una receta.** El token es la "llave" con la que se pide; la receta dice cómo construir el valor.
2. **Por defecto todo es singleton** (scope `DEFAULT`): una instancia por token **por módulo que lo declara**, compartida por toda la app y creada al arrancar.
3. **La visibilidad es por módulo**: solo puedes inyectar lo que tu módulo declara o lo que importas de un módulo que lo **exporta** (Sesión 3).

`@Injectable() class ProductosService {}` en `providers: [ProductosService]` es un atajo para:

```typescript
providers: [{ provide: ProductosService, useClass: ProductosService }]
```

> ❓ **Entrevista**: *"¿Por qué Nest necesita `emitDecoratorMetadata`?"* → Porque TypeScript borra los tipos al compilar. Con `emitDecoratorMetadata`, el compilador emite `design:paramtypes` con las **clases** de los parámetros del constructor de toda clase decorada. Nest lee esa metadata para saber qué inyectar. Por eso las interfaces no sirven como token (no existen en runtime) y por eso herramientas como esbuild, que no emiten esa metadata, rompen la DI.

---

## 2. Tokens: con qué llave se pide un provider

| Token | Ejemplo | Inyección | Cuándo |
|---|---|---|---|
| **Clase** | `ProductosService` | automática por tipo | Lo normal |
| **Clase abstracta** | `abstract class PagosGateway` | automática por tipo | Puertos/adaptadores sin `@Inject` |
| **String** | `'CONFIG_PAGOS'` | `@Inject('CONFIG_PAGOS')` | Rápido, pero con riesgo de colisión |
| **Symbol** | `export const REDIS = Symbol('REDIS')` | `@Inject(REDIS)` | Valores no-clase, sin colisiones |

```typescript
// Las interfaces NO existen en runtime → no pueden ser token
interface PagosGateway { cobrar(monto: number): Promise<string>; }
constructor(private pagos: PagosGateway) {}          // ❌ design:paramtypes emite Object

// Solución 1: clase abstracta como token (se usa como tipo Y como token)
export abstract class PagosGateway {
  abstract cobrar(monto: number, ordenId: number): Promise<string>;
}
constructor(private readonly pagos: PagosGateway) {} // ✅ sin @Inject

// Solución 2: interfaz + symbol
export const PAGOS_GATEWAY = Symbol('PAGOS_GATEWAY');
constructor(@Inject(PAGOS_GATEWAY) private readonly pagos: PagosGateway) {}
```

> 💡 La clase abstracta como token es la forma más limpia de hacer **inversión de dependencias** en Nest: el dominio define el puerto `PagosGateway` y la infraestructura provee `{ provide: PagosGateway, useClass: TransbankGateway }`. Lo retomarás en la arquitectura hexagonal (Sesión 30).

> ⚠️ Dos módulos que registran `'CONFIG'` como string son dos tokens **iguales** para el lector del código pero se resuelven según la visibilidad del módulo, lo que produce confusión. Prefiere `Symbol` o constantes exportadas; nunca "magic strings" repetidas.

---

## 3. Los cuatro tipos de custom providers

### 3.1 `useClass`: elegir la implementación

```typescript
// src/pagos/pagos.module.ts
@Module({
  providers: [
    {
      provide: PagosGateway,
      useClass: process.env.NODE_ENV === 'production' ? TransbankGateway : PagosFakeGateway,
    },
  ],
  exports: [PagosGateway],
})
export class PagosModule {}
```

Nest instancia la clase indicada y resuelve **sus** dependencias del constructor.

### 3.2 `useValue`: un valor ya construido

```typescript
export const IVA = Symbol('IVA');

providers: [
  { provide: IVA, useValue: 0.19 },
  { provide: ProductosService, useValue: productosMock },   // típico en tests (Sesión 22)
]
```

> ⚠️ Con `useValue` Nest **no** hace DI sobre el objeto: se usa tal cual. Si pasas una instancia de clase creada con `new`, sus dependencias son las que tú le diste.

### 3.3 `useFactory`: construcción con lógica (y async)

El más potente. La función recibe como argumentos los providers listados en `inject`, en ese orden, y puede ser `async`: Nest **espera** a que la promesa se resuelva antes de terminar el arranque y de instanciar a quien dependa de ella.

```typescript
// src/redis/redis.module.ts
import Redis from 'ioredis';
export const REDIS = Symbol('REDIS');

@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService, { token: LOGGER_EXTRA, optional: true }], // dependencia opcional
      useFactory: async (config: ConfigService, logger?: Logger) => {
        const cliente = new Redis(config.getOrThrow<string>('REDIS_URL'), { lazyConnect: true });
        await cliente.connect();                   // el arranque espera la conexión
        logger?.log('Redis conectado');
        return cliente;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
```

Usos típicos: clientes de conexiones (DB, Redis, SDKs), configuración derivada, elegir implementación según config **en runtime** (no en tiempo de import como en 3.1).

> ⚠️ Un factory async que tarda o se cuelga (DB caída sin timeout) **bloquea el arranque completo** y el contenedor nunca pasa el health check. Pon timeouts y reintentos acotados.

### 3.4 `useExisting`: un alias

```typescript
providers: [
  WinstonLoggerService,
  { provide: 'APP_LOGGER', useExisting: WinstonLoggerService }, // MISMA instancia, otro token
]
```

`useExisting` **no** crea una segunda instancia: ambos tokens apuntan al mismo objeto. `useClass: WinstonLoggerService` sí crearía otra.

| Tipo | Crea instancia | DI sobre el valor | Async | Uso típico |
|---|---|---|---|---|
| `useClass` | Sí (Nest) | Sí | No | Cambiar implementación |
| `useValue` | No | No | No | Constantes, mocks |
| `useFactory` | Lo que retornes | Vía `inject` | **Sí** | Clientes, config, lógica |
| `useExisting` | No (alias) | — | No | Varios tokens, una instancia |

### 3.5 Patrón "multi-provider" (colecciones de estrategias)

Nest no tiene `multi: true` como Angular. Para inyectar "todas las estrategias de envío" usa un factory que las agrupa:

```typescript
export const ESTRATEGIAS_ENVIO = Symbol('ESTRATEGIAS_ENVIO');

@Module({
  providers: [
    ChilexpressEnvio, StarkenEnvio, RetiroEnTiendaEnvio,
    {
      provide: ESTRATEGIAS_ENVIO,
      inject: [ChilexpressEnvio, StarkenEnvio, RetiroEnTiendaEnvio],
      useFactory: (...estrategias: EstrategiaEnvio[]) => estrategias,
    },
  ],
})
export class EnviosModule {}

@Injectable()
export class CotizadorEnvio {
  constructor(@Inject(ESTRATEGIAS_ENVIO) private readonly estrategias: EstrategiaEnvio[]) {}

  cotizar(orden: Orden) {
    return this.estrategias.filter((e) => e.aplica(orden)).map((e) => e.cotizar(orden));
  }
}
```

Si quieres descubrirlas automáticamente por decorador (sin listarlas), usa `DiscoveryService` (Sesión 24).

### 3.6 `@Optional()` e inyección por propiedad

```typescript
@Injectable()
export class NotificacionesService {
  constructor(@Optional() @Inject(SLACK_CLIENTE) private readonly slack?: SlackClient) {}
  // si nadie provee SLACK_CLIENTE, slack es undefined en vez de error al arrancar
}

// Inyección por propiedad: útil en clases base para no forzar super(...) en hijas
export abstract class ServicioBase {
  @Inject(Logger) protected readonly logger: Logger;
}
```

> ⚠️ La inyección por propiedad **no** está disponible dentro del constructor (se asigna después). Úsala con moderación: oculta dependencias.

---

## 4. Scopes: cuánto vive una instancia

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.DEFAULT })    // singleton (implícito)
@Injectable({ scope: Scope.REQUEST })    // una instancia nueva por request entrante
@Injectable({ scope: Scope.TRANSIENT })  // una instancia nueva por CADA consumidor
```

| Scope | Instancias | Cuándo se crean | Uso legítimo |
|---|---|---|---|
| `DEFAULT` | 1 por app (por módulo host) | Al arrancar | El 95% de los casos |
| `REQUEST` | 1 por request | En cada request | Estado ligado a la request: tenant, usuario, transacción, DataLoader (Sesión 28) |
| `TRANSIENT` | 1 por consumidor | Al instanciar cada consumidor | Loggers con contexto propio, objetos con estado no compartible |

### 4.1 Por qué los singletons son la norma en Node

Node ejecuta tu código en **un solo hilo** con un event loop. Un singleton **sin estado mutable por request** es seguro aunque atienda miles de requests concurrentes: no hay dos hilos tocándolo a la vez. Lo que **no** es seguro es guardar datos de la request en un campo del singleton:

```typescript
@Injectable()
export class CarritoService {
  private usuarioActual: number;             // ❌ compartido entre TODAS las requests

  async agregar(usuarioId: number, item: Item) {
    this.usuarioActual = usuarioId;
    await this.repo.guardar(item);           // ← aquí el event loop atiende otra request
    return this.repo.listar(this.usuarioActual); // ← puede ser el usuario de OTRA request
  }
}
```

Solución: pasa el dato como parámetro, usa un provider REQUEST o `AsyncLocalStorage` (ver 4.5).

### 4.2 Inyectar la request

```typescript
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class ContextoTenant {
  constructor(@Inject(REQUEST) private readonly req: Request) {}

  get tenantId(): string {
    return (this.req.headers['x-tenant-id'] as string) ?? 'default';
  }
}
```

### 4.3 Scope bubbling: el scope se propaga HACIA ARRIBA

Esta es la parte que más se pregunta en entrevistas. Si un provider depende de otro con scope `REQUEST`, **él también pasa a ser request-scoped**, y así sucesivamente hasta el controller.

```
                     ANTES de agregar ContextoTenant
  ProductosController (singleton) → ProductosService (singleton) → ProductosRepo (singleton)

                     DESPUÉS: ProductosRepo inyecta ContextoTenant (REQUEST)
  ProductosController ─▶ ProductosService ─▶ ProductosRepo ─▶ ContextoTenant
        REQUEST              REQUEST            REQUEST          REQUEST
        ▲ por cada request se re-instancia TODA la cadena ▲
```

Por qué tiene que ser así: un singleton se crea **una vez** al arrancar; no puede recibir "la" request porque aún no existe ninguna, y si recibiera una se quedaría con la primera para siempre. La única forma de que `ProductosRepo` tenga el `ContextoTenant` correcto es crearlo de nuevo en cada request, y lo mismo con quien lo consume.

Consecuencias:
- **Costo**: en cada request Nest construye la subcadena completa (resolución de dependencias + `new`). En rutas calientes se nota en latencia y en presión sobre el GC.
- **Contagio silencioso**: un solo `@Inject(REQUEST)` en un repositorio compartido puede convertir en request-scoped a medio sistema.
- **Contextos sin request**: cron jobs (`@Cron`), processors de colas, listeners de eventos, `onModuleInit` **no tienen request**. Un provider request-scoped no puede usarse ahí de forma normal (Sesión 25).
- **Lifecycle hooks** (`onModuleInit`, etc.) **no** se llaman en providers request-scoped ni transient.

> ⚠️ `TRANSIENT` **no** burbujea como `REQUEST`: un singleton que inyecta un transient sigue siendo singleton (recibe su propia instancia transient, una sola vez). Pero un transient que depende de un REQUEST sí se vuelve request-scoped.

> ❓ **Entrevista**: *"Agregaste `@Inject(REQUEST)` a un servicio y la API se puso más lenta, ¿por qué?"* → Por scope bubbling: ese servicio pasó a ser request-scoped y arrastró a todos sus consumidores hasta los controllers, que ahora se instancian en cada request junto con toda la cadena. Soluciones: pasar el dato como argumento de método, usar `AsyncLocalStorage` (p. ej. `nestjs-cls`) para contexto por request sin cambiar scopes, o aislar el provider REQUEST en el borde y mantener el núcleo singleton.

### 4.4 Durable providers: un árbol por tenant, no por request

Caso multi-tenant: cada tenant tiene su propia conexión a DB. Con `Scope.REQUEST` crearías la cadena (y quizá la conexión) en **cada** request. Con **durable providers** Nest reutiliza el mismo subárbol para todas las requests del mismo tenant.

```typescript
// src/tenancy/tenant-context-id.strategy.ts
import { ContextId, ContextIdFactory, ContextIdStrategy, HostComponentInfo } from '@nestjs/core';
import type { Request } from 'express';

const tenants = new Map<string, ContextId>();

export class TenantContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: Request) {
    const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';

    let tenantSubTreeId = tenants.get(tenantId);
    if (!tenantSubTreeId) {
      tenantSubTreeId = ContextIdFactory.create();   // un "contexto" por tenant
      tenants.set(tenantId, tenantSubTreeId);
    }

    return {
      // Providers durables → usan el contexto del tenant; el resto → el de la request
      resolve: (info: HostComponentInfo) => (info.isTreeDurable ? tenantSubTreeId : contextId),
      // En providers durables, @Inject(REQUEST) recibe ESTE payload, no la request
      payload: { tenantId },
    };
  }
}
```

```typescript
// main.ts
ContextIdFactory.apply(new TenantContextIdStrategy());

// src/tenancy/tenant-connection.service.ts
@Injectable({ scope: Scope.REQUEST, durable: true })
export class TenantConnection {
  constructor(@Inject(REQUEST) private readonly ctx: { tenantId: string }) {}
  // se crea UNA vez por tenant y se reutiliza en todas sus requests
}
```

```
  Requests:  t=A  t=B  t=A  t=A  t=B
               │    │    │    │    │
  REQUEST:    new  new  new  new  new   ← 5 cadenas
  durable:    [A]  [B]  [A]  [A]  [B]   ← 2 subárboles reutilizados
```

> ⚠️ El `Map` de tenants crece sin límite si los tenants son muchos o no confiables (el header lo controla el cliente). Valida el tenant contra una lista conocida antes de crear su contexto; si no, es un vector de agotamiento de memoria.

### 4.5 La alternativa sin scopes: `AsyncLocalStorage`

Node trae `AsyncLocalStorage` (`node:async_hooks`), que mantiene un "almacén" a lo largo de toda la cadena async de una request. La librería `nestjs-cls` lo integra con Nest (middleware que abre el contexto + `ClsService` singleton).

```typescript
// Todo sigue siendo singleton; el dato por request viaja en el contexto async
@Injectable()
export class ProductosRepo {
  constructor(private readonly cls: ClsService) {}
  listar() {
    const tenantId = this.cls.get('tenantId');   // el de la request actual
    ...
  }
}
```

| | `Scope.REQUEST` | Durable | `AsyncLocalStorage` / nestjs-cls |
|---|---|---|---|
| Instancias por request | Toda la cadena | Por tenant | Ninguna extra |
| Costo | Alto | Medio | Bajo |
| Funciona fuera de HTTP | No | No | Sí, si abres el contexto (cron, colas) |
| Explícito en el tipo | Sí | Sí | No (dependencia "ambiental") |

---

## 5. `TRANSIENT` e `INQUIRER`: el logger con contexto

```typescript
import { Inject, Injectable, Scope, ConsoleLogger } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  constructor(@Inject(INQUIRER) private readonly padre: object) {
    super(padre?.constructor?.name ?? 'App');   // contexto = clase que me inyectó
  }
}

@Injectable()
export class OrdenesService {
  constructor(private readonly logger: AppLogger) {}   // logger con contexto "OrdenesService"
}
```

`INQUIRER` da la instancia (o clase) que está pidiendo el provider. Solo tiene sentido en `TRANSIENT`: en un singleton, "quién me pidió" sería solo el primero.

---

## 6. Dependencias circulares

### 6.1 Cómo aparecen

```
OrdenesService ──necesita──▶ UsuariosService
      ▲                            │
      └──────────necesita──────────┘
```

Síntoma al arrancar:

```
Nest can't resolve dependencies of the OrdenesService (?). Please make sure that the argument
dependency at index [0] is available in the OrdenesModule context.
```

A veces el `?` aparece como `undefined` sin que falte nada: es el sello de una **circularidad de imports de archivos** (el `import` de ES todavía no terminó de evaluarse cuando TypeScript emite `design:paramtypes`, así que la clase es `undefined`). También lo provocan los **barrel files** (`index.ts`) que reexportan todo.

### 6.2 `forwardRef`: el parche

```typescript
// ordenes.service.ts
@Injectable()
export class OrdenesService {
  constructor(
    @Inject(forwardRef(() => UsuariosService)) private readonly usuarios: UsuariosService,
  ) {}
}

// usuarios.service.ts
@Injectable()
export class UsuariosService {
  constructor(
    @Inject(forwardRef(() => OrdenesService)) private readonly ordenes: OrdenesService,
  ) {}
}

// Y si la circularidad es entre MÓDULOS, en ambos imports:
@Module({ imports: [forwardRef(() => UsuariosModule)], ... })
export class OrdenesModule {}
```

`forwardRef(() => X)` difiere la lectura de `X` hasta que el archivo terminó de cargarse. Funciona, pero:
- El orden de instanciación queda **indeterminado**: no uses la dependencia en el constructor.
- No funciona bien con providers `REQUEST`.
- Es una **señal de diseño**: dos servicios que se necesitan mutuamente suelen ser uno solo, o les falta una tercera pieza.

### 6.3 Las soluciones de verdad

```
 Antes:  Ordenes ⇄ Usuarios

 1) Extraer lo común:     Ordenes ─▶ PerfilCompras ◀─ Usuarios
 2) Invertir con eventos: Ordenes ─emit('orden.creada')─▶ Usuarios escucha (Sesión 25)
 3) Mover la operación al caso de uso que orquesta: CheckoutService ─▶ Ordenes, Usuarios
```

| Solución | Cuándo |
|---|---|
| Extraer un tercer servicio | Hay lógica compartida mal ubicada |
| Eventos de dominio | Uno solo "avisa" al otro (efectos secundarios) |
| Caso de uso orquestador | Un flujo necesita a ambos (Sesión 30) |
| `ModuleRef.get` perezoso | Transitorio, mientras refactorizas |
| `forwardRef` | Último recurso, documentado |

> ❓ **Entrevista**: *"¿Cómo resuelves una dependencia circular en Nest?"* → `forwardRef` en ambos lados (y en los imports de módulo si aplica) la hace arrancar, pero es un síntoma. La solución real es romper el ciclo: extraer la lógica compartida, usar eventos para las notificaciones o subir la orquestación a un caso de uso. También reviso barrel files, que suelen causar ciclos de imports de archivos que se ven como `undefined` en el mensaje de error.

---

## 7. `ModuleRef`: resolver en runtime

`ModuleRef` es el acceso programático al contenedor del módulo actual.

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';

@Injectable()
export class ProcesadorPagos implements OnModuleInit {
  private gateway: PagosGateway;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    // get(): solo singletons. strict:false → busca en todo el grafo, no solo en este módulo
    this.gateway = this.moduleRef.get(PagosGateway, { strict: false });
  }

  async porProveedor(nombre: 'transbank' | 'mercadopago') {
    // Elegir implementación en runtime por token
    const token = nombre === 'transbank' ? TransbankGateway : MercadoPagoGateway;
    return this.moduleRef.get(token, { strict: false });
  }
}
```

| Método | Qué hace | Scopes |
|---|---|---|
| `get(token, { strict })` | Devuelve la instancia existente | Solo `DEFAULT` (lanza con REQUEST/TRANSIENT) |
| `resolve(token, contextId?)` | Crea/obtiene en un contexto; **async** | `REQUEST`/`TRANSIENT` |
| `create(Clase)` | Instancia una clase **no registrada**, resolviendo su DI | — |
| `registerRequestByContextId(req, ctxId)` | Asocia una request "manual" a un contexto | Para usar providers REQUEST fuera de HTTP |

### 7.1 Usar providers REQUEST fuera de una request

```typescript
// Dos resolve() sin contextId → DOS instancias distintas (cada llamada es un contexto nuevo)
const a = await this.moduleRef.resolve(ContextoTenant);
const b = await this.moduleRef.resolve(ContextoTenant);
a === b; // false

// Compartir contexto: generar un id y reutilizarlo
const contextId = ContextIdFactory.create();
this.moduleRef.registerRequestByContextId({ headers: { 'x-tenant-id': 'acme' } }, contextId);
const ctx = await this.moduleRef.resolve(ContextoTenant, contextId);
const repo = await this.moduleRef.resolve(ProductosRepo, contextId);  // mismo árbol

// Dentro de una request HTTP: recuperar el contexto de ESA request
const id = ContextIdFactory.getByRequest(req);
const svc = await this.moduleRef.resolve(ContextoTenant, id);
```

Este patrón es el que usarías en un processor de BullMQ que necesita un servicio request-scoped (Sesión 25).

> ⚠️ `ModuleRef` es un **service locator**: oculta dependencias y dificulta los tests. Úsalo para casos genuinamente dinámicos (plugins, estrategias elegidas por datos, contextos fuera de HTTP), no para evitar escribir el constructor.

---

## 8. Lazy loading de módulos

En serverless (AWS Lambda, Sesión 34) el **cold start** importa: cargar todos los módulos al arrancar hace lenta la primera invocación. `LazyModuleLoader` carga un módulo **cuando se necesita**.

```typescript
import { Injectable } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

@Injectable()
export class ReportesFacade {
  constructor(private readonly lazyModuleLoader: LazyModuleLoader) {}

  async generarPdfVentas(mes: string) {
    // import() dinámico: el módulo (y sus dependencias pesadas, ej. pdfkit) se carga aquí
    const { ReportesModule } = await import('./reportes/reportes.module');
    const moduleRef = await this.lazyModuleLoader.load(() => ReportesModule);

    const { ReportesService } = await import('./reportes/reportes.service');
    return moduleRef.get(ReportesService).ventasDelMes(mes);
  }
}
```

- La segunda llamada a `load()` devuelve el módulo **cacheado**.
- Los módulos lazy **no pueden registrar controllers** (ni resolvers de GraphQL ni gateways): las rutas se registran al arrancar.
- Tampoco pueden registrarse como módulos **globales**, y no confíes en los lifecycle hooks de arranque (`onApplicationBootstrap` ya ocurrió): si necesitas inicializar algo, hazlo explícitamente tras `load()`.

---

## 9. Diagnóstico: leer los errores del injector

```
Error: Nest can't resolve dependencies of the ProductosService (?, CacheService).
Please make sure that the argument ProductosRepository at index [0] is available
in the CatalogoModule context.
```

Checklist mental:
1. ¿`ProductosRepository` está en `providers` de algún módulo?
2. ¿Ese módulo lo **exporta**?
3. ¿`CatalogoModule` **importa** ese módulo (o es `@Global`)?
4. ¿Pusiste el provider en `imports` por error (o un módulo en `providers`)?
5. ¿Es un token no-clase y te falta `@Inject(TOKEN)`?
6. ¿Aparece `?`/`undefined` sin razón? → circularidad de archivos o barrel file.

> 💡 `NestFactory.create(AppModule, { snapshot: true })` + Nest Devtools permite **visualizar el grafo** de módulos y providers, útil en apps grandes. Los internals del scanner e injector se ven en la **Sesión 35**.

> ⚠️ Registrar `ProductosService` en `providers` de **dos** módulos distintos crea **dos instancias** (una por módulo host), con estados separados (p. ej. dos cachés en memoria). Para compartir una sola instancia, decláralo en un módulo, expórtalo e impórtalo donde se necesite.

---

## Resumen mental de la sesión

```
Provider = TOKEN + RECETA
  token: Clase | clase abstracta (puerto) | Symbol | string   (interfaces NO: no existen en runtime)
  receta: useClass (Nest instancia) · useValue (tal cual) ·
          useFactory + inject (lógica, ASYNC, deps opcionales) · useExisting (alias, misma instancia)
  multi-provider: factory que agrupa varias estrategias en un array

Scopes:
  DEFAULT   singleton (lo normal en Node: 1 hilo; NUNCA estado de request en campos)
  REQUEST   1 por request → BURBUJEA HACIA ARRIBA hasta el controller (costo, sin hooks,
            no disponible en cron/colas/eventos)
  TRANSIENT 1 por consumidor, no burbujea; INQUIRER = quién me pidió
  durable: true + ContextIdStrategy → 1 subárbol por TENANT; payload llega por @Inject(REQUEST)
  Alternativa barata: AsyncLocalStorage / nestjs-cls

Circularidad: forwardRef(() => X) en ambos lados = parche.
  Solución: extraer servicio · eventos · caso de uso orquestador · ojo con barrels

ModuleRef: get (singleton, strict:false) · resolve (REQUEST/TRANSIENT, async, contextId)
           create (clase no registrada) · registerRequestByContextId (REQUEST fuera de HTTP)
LazyModuleLoader.load(() => M): cold starts; sin controllers
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un token de inyección? ¿Por qué una interfaz no puede serlo y qué usas en su lugar?
2. ❓ Diferencias entre `useClass`, `useValue`, `useFactory` y `useExisting`. ¿Cuál permite inicialización async?
3. ❓ ¿Qué pasa si un `useFactory` async nunca resuelve?
4. ❓ ¿Por qué el singleton es el scope por defecto y es seguro en Node? ¿Qué **no** debes hacer en un singleton?
5. ❓ Explica el scope bubbling con un ejemplo. ¿Qué costo tiene?
6. ❓ ¿Por qué un provider REQUEST no funciona dentro de un `@Cron` o un processor de colas? ¿Cómo lo usarías igual?
7. ❓ ¿Qué problema resuelven los durable providers? ¿Qué es `ContextIdStrategy` y qué riesgo tiene?
8. ❓ `Scope.REQUEST` vs `AsyncLocalStorage`: ventajas y desventajas.
9. ❓ ¿Para qué sirve `INQUIRER` y por qué solo en `TRANSIENT`?
10. ❓ ¿Cómo detectas y resuelves una dependencia circular? ¿Por qué `forwardRef` es un parche?
11. ❓ `moduleRef.get` vs `moduleRef.resolve`: ¿qué devuelve cada uno y con qué scopes?
12. ❓ ¿Qué pasa si registras el mismo servicio en `providers` de dos módulos?

## Ejercicio práctico
1. Define `abstract class PagosGateway` con dos implementaciones (`PagosFakeGateway`, `TransbankGateway`) y elige una con `useFactory` según `ConfigService` (`PAGOS_PROVIDER`).
2. Crea el provider `REDIS` con `useFactory` async (`ioredis` + `connect()`), expórtalo desde `RedisModule` e inyéctalo con `@Inject(REDIS)`.
3. Implementa el patrón multi-provider `ESTRATEGIAS_ENVIO` con tres estrategias y un `CotizadorEnvio`.
4. Crea `ContextoTenant` con `Scope.REQUEST` e inyéctalo en `ProductosRepo`. Agrega un `console.log` en el constructor de `ProductosController` y verifica que ahora se instancia en **cada** request (scope bubbling). Mide con `autocannon` el antes y después.
5. Convierte `TenantConnection` en durable con `TenantContextIdStrategy`; valida el tenant contra una lista y comprueba con logs que se crea una vez por tenant.
6. Reemplaza el provider REQUEST por `nestjs-cls` y compara la latencia.
7. Crea un `AppLogger` transient con `INQUIRER` y úsalo en tres servicios.
8. Provoca una circularidad `OrdenesService ⇄ UsuariosService`, lee el error, arréglala con `forwardRef` y luego **elimínala** extrayendo `PerfilComprasService` o emitiendo un evento.
9. En un script, usa `ModuleRef.resolve` con un `contextId` propio y `registerRequestByContextId` para usar `ContextoTenant` fuera de HTTP.
10. (Opcional) Carga un `ReportesModule` con `LazyModuleLoader` y mide el tiempo de arranque con y sin lazy loading.

---

➡️ **Cuando termines**, marca la Sesión 23 en el [README](README.md) y pasa a la **Sesión 24 — Módulos dinámicos, lifecycle hooks y DiscoveryService**.
