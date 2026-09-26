# Sesión 35 — Internals de NestJS y preparación de entrevista senior

> **Objetivo de la sesión**: abrir la caja negra. Al terminar deberías poder explicar qué ocurre desde `NestFactory.create(AppModule)` hasta que un handler responde: cómo el **DependenciesScanner** recorre el grafo de módulos, cómo el **NestContainer** guarda módulos y providers, cómo el **InstanceLoader** y el **Injector** resuelven el constructor de cada clase, cómo se identifican los módulos (**module tokens**), cómo el **RouterExplorer** convierte métodos decorados en rutas, y para qué existe el **ExternalContextCreator**. Cerramos con un **banco de ~30 preguntas senior** con respuestas breves para repasar todo el curso.

> ⚠️ **Nota de honestidad**: los nombres de clases de esta sesión (`NestFactoryStatic`, `DependenciesScanner`, `InstanceLoader`, `Injector`, `NestContainer`, `Module`, `InstanceWrapper`, `RouterExplorer`, `ExternalContextCreator`) existen en `@nestjs/core`, pero son **API interna**: sus firmas cambian entre versiones sin aviso. El pseudo-código muestra el **flujo**, no firmas exactas. Para los detalles, lee el código fuente de tu versión en `node_modules/@nestjs/core` (está en JavaScript legible con `.d.ts`), que es exactamente lo que hace un senior cuando algo "mágico" falla.

---

## 1. Por qué un senior debe conocer los internals

No para usar APIs internas en producción (no lo hagas), sino para:
- **Diagnosticar** errores de DI (`Nest can't resolve dependencies...`, dependencias circulares, providers duplicados) en minutos, no horas.
- **Predecir** el costo de decisiones: request scope, módulos dinámicos, global modules.
- **Construir** librerías: módulos dinámicos, `DiscoveryService`, decoradores con metadata (Sesión 24) usan los mismos mecanismos.
- **Responder** entrevistas donde la pregunta es "¿qué pasa por dentro cuando...?".

---

## 2. El mapa completo del bootstrap

```
 NestFactory.create(AppModule, adapter?, options?)
   │
   ├─ 1. Crea NestContainer (registro de módulos) + ApplicationConfig
   │
   ├─ 2. DependenciesScanner.scan(AppModule)
   │      ├─ scanForModules: recorre imports recursivamente → container.addModule(...)
   │      ├─ scanModulesForDependencies: por cada módulo lee metadata
   │      │     providers · controllers · imports · exports · enhancers (guards, pipes...)
   │      ├─ calcula la "distancia" de cada módulo (orden de lifecycle hooks)
   │      └─ enlaza módulos globales
   │
   ├─ 3. InstanceLoader.createInstancesOfDependencies()
   │      ├─ crea prototipos (Object.create) de cada clase
   │      └─ Injector: instancia providers → injectables → controllers de cada módulo,
   │                   resolviendo constructores recursivamente
   │
   ├─ 4. Registra providers de aplicación (APP_GUARD, APP_PIPE, APP_INTERCEPTOR, APP_FILTER)
   │
   └─ 5. Devuelve NestApplication (envuelta en un Proxy que delega en el adapter HTTP)

 app.listen() → app.init() si no se llamó:
   ├─ lifecycle: onModuleInit (por módulo, según distancia)
   ├─ MiddlewareModule: registra middleware (configure(consumer))
   ├─ RoutesResolver → RouterExplorer: por controller, por método → ruta en el adapter
   ├─ lifecycle: onApplicationBootstrap
   └─ httpAdapter.listen(port)
```

Todo el scan + instanciación se ejecuta dentro de una "zona de excepciones": si algo falla y `abortOnError` es `true` (default), Nest loguea el error y **termina el proceso**; con `abortOnError: false` la Promise de `create` se rechaza y tú decides (útil en tests).

> ❓ **Entrevista**: *"¿Qué diferencia hay entre `NestFactory.create` y `app.listen` en términos de lo que se ejecuta?"* → `create` construye el grafo: escanea módulos y crea **todas** las instancias singleton (constructores y factories `useFactory` corren aquí). `init` (llamado por `listen`) ejecuta `onModuleInit`, registra middleware y rutas, ejecuta `onApplicationBootstrap`; `listen` además abre el puerto. Por eso un constructor lento retrasa el `create`, y por eso en tests o Lambda llamas `app.init()` sin `listen`.

---

## 3. La materia prima: metadata con `reflect-metadata`

Los decoradores de Nest casi no hacen nada en tiempo de ejecución: **guardan metadata** en las clases (Sesión 2). Los internals luego la leen. Las claves son constantes de `@nestjs/common` y de TypeScript:

| Clave | Quién la escribe | Qué contiene |
|---|---|---|
| `design:paramtypes` | **TypeScript** (`emitDecoratorMetadata`) | Tipos de los parámetros del constructor |
| `self:paramtypes` | `@Inject(TOKEN)` | Overrides de token por índice de parámetro |
| `imports`, `providers`, `controllers`, `exports` | `@Module({...})` | Arrays de la definición del módulo |
| `__module:global__` | `@Global()` | `true` |
| `__injectable__` / `__controller__` | `@Injectable()` / `@Controller()` | Marcas ("watermarks") |
| `scope:options` | `@Injectable({ scope })` | Scope del provider |
| `path` / `method` | `@Controller('x')`, `@Get(':id')` | Ruta y verbo HTTP |
| `__routeArguments__` | `@Body()`, `@Param()`, custom param decorators | Qué inyectar en cada argumento del handler |
| `__guards__`, `__interceptors__`, `__pipes__`, `__exceptionFilters__` | `@UseGuards()` etc. | Enhancers de clase o método |

Puedes comprobarlo tú mismo:

```ts
// scripts/ver-metadata.ts — ejecútalo con ts-node o tras compilar
import 'reflect-metadata';
import { OrdenesController } from '../src/ordenes/ordenes.controller';
import { OrdenesModule } from '../src/ordenes/ordenes.module';
import { OrdenesService } from '../src/ordenes/ordenes.service';

console.log(Reflect.getMetadata('providers', OrdenesModule));        // [OrdenesService, ...]
console.log(Reflect.getMetadata('design:paramtypes', OrdenesService)); // [OrdenesRepository, ConfigService]
console.log(Reflect.getMetadata('path', OrdenesController));          // 'ordenes'
console.log(Reflect.getMetadata('path', OrdenesController.prototype.crear));   // '/'
console.log(Reflect.getMetadata('method', OrdenesController.prototype.crear)); // 1 (RequestMethod.POST)
```

> ⚠️ Por eso **las interfaces no sirven como token de DI**: TypeScript las borra al compilar y `design:paramtypes` registra `Object`. Necesitas un token explícito (`Symbol`/string + `@Inject`) o una clase abstracta (Sesión 23). Y por eso un `import type` de una clase inyectada rompe la DI: el tipo se borra y la metadata queda `undefined`.

---

## 4. NestContainer y la clase Module

El **NestContainer** es, esencialmente, un mapa de **token de módulo → instancia de `Module`**, más el registro de módulos globales y datos auxiliares (config, adapter HTTP).

Cada `Module` interno (no confundir con tu clase decorada) contiene colecciones de **`InstanceWrapper`** indexadas por token:

```
 NestContainer
 └─ modules: Map<moduleToken, Module>
     ├─ "AppModule"      ─ Module { metatype: AppModule, imports: Set<Module>, ... }
     ├─ "OrdenesModule"  ─ Module {
     │                        providers:   Map<token, InstanceWrapper>   ← OrdenesService, repos...
     │                        controllers: Map<token, InstanceWrapper>
     │                        injectables: Map<token, InstanceWrapper>   ← guards/pipes/interceptors
     │                        imports:     Set<Module>
     │                        exports:     Set<token>
     │                        distance:    number
     │                      }
     └─ "a9f3...(hash)"  ─ Module  ← TypeOrmModule.forRoot({...}) (módulo DINÁMICO)
```

Cada módulo también registra automáticamente providers "de sistema" propios: la referencia al módulo (`ModuleRef`), la propia clase del módulo (por eso puedes inyectar dependencias en el constructor de un `@Module`), y el `ApplicationConfig`.

Un **`InstanceWrapper`** envuelve cada provider/controller: su `metatype` (la clase), `name`/token, `scope`, `inject` (para factories), si es `durable`, si es transient, y las **instancias por contexto**: una para el contexto estático (singletons) y, para request/transient, una por `ContextId`.

---

## 5. DependenciesScanner: recorrer el grafo

### 5.1 `scanForModules`

Parte de `AppModule` y recorre recursivamente sus `imports` (incluyendo los `imports` de los módulos dinámicos que devuelven `forRoot()`), insertando cada módulo en el contenedor **una sola vez** (identificado por su token). Maneja:
- `forwardRef(() => OtroModule)`: resuelve la referencia de forma perezosa para cortar el ciclo de *imports* de JavaScript (Sesión 23).
- Un import `undefined`: suele ser un **ciclo de archivos** (el módulo aún no estaba definido cuando se evaluó el array). Nest lanza un error indicando el índice del import indefinido y sugiere `forwardRef`.

### 5.2 `scanModulesForDependencies`

Para cada módulo registrado lee su metadata y la vuelca al `Module` interno: providers, controllers, imports, exports. También recorre los controllers y providers buscando **enhancers** declarados con `@UseGuards/@UseInterceptors/@UsePipes/@UseFilters` para registrarlos como *injectables* (así pueden tener dependencias inyectadas). Los providers con tokens especiales (`APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, `APP_FILTER`) se anotan para aplicarlos globalmente después.

### 5.3 Distancia y módulos globales

- La **distancia** de un módulo es su profundidad respecto a la raíz; se usa para ordenar los lifecycle hooks: los módulos más "profundos" (dependencias) se inicializan antes que los que dependen de ellos.
- Los módulos `@Global()` se enlazan como import implícito de **todos** los módulos. No es magia distinta: es el mismo mecanismo de lookup en imports, aplicado a todos.

### 5.4 Module tokens: cómo se identifica un módulo

- **Módulo estático** (`OrdenesModule`): su identidad es la propia clase.
- **Módulo dinámico** (`JwtModule.register({ secret })`): el objeto devuelto no es una clase, así que Nest genera una clave "opaca" a partir de la clase **y** de la metadata dinámica. Históricamente se calculaba un **hash de la metadata serializada**: dos `register()` con opciones idénticas colapsaban en el **mismo** módulo, y con opciones distintas en módulos distintos.
- En Nest 11 cambió el algoritmo por defecto para generar esa clave (hashear metadata grande era costoso en el arranque): la guía de migración describe una estrategia basada en **referencias** de objeto, con consecuencias sobre la deduplicación de módulos dinámicos importados varias veces. Si tu app dependía de que dos `forRoot()` idénticos se deduplicaran, revisa la guía de migración de v11 para tu caso.

> ❓ **Entrevista**: *"Importé `CacheModule.register()` en dos módulos distintos. ¿Tengo una o dos instancias de caché?"* → Depende de cómo se identifique el módulo dinámico, así que no lo daría por supuesto: si necesito **una sola**, lo registro una vez (en un módulo compartido que lo reexporta, o `isGlobal: true`). La regla práctica: los módulos dinámicos "raíz" (`forRoot`) se importan una vez; los "por feature" (`forFeature`) se importan donde se usan.

---

## 6. InstanceLoader e Injector: construir el grafo de objetos

### 6.1 Dos pasadas

1. **Prototipos**: para cada `InstanceWrapper` de clase, se crea un objeto con `Object.create(Clase.prototype)` como placeholder. Esto permite que existan referencias antes de que el constructor haya corrido (parte de lo que hace posible `forwardRef` entre providers).
2. **Instancias**: por cada módulo, el `Injector` carga providers, luego injectables (enhancers) y luego controllers.

### 6.2 El algoritmo de resolución (conceptual)

```ts
// PSEUDO-CÓDIGO del Injector: muestra el flujo, NO la firma real
async function loadInstance(wrapper: InstanceWrapper, modulo: Module) {
  if (wrapper.isResolved) return;                         // singleton ya construido

  // 1. ¿Qué necesita el constructor? (o el "inject" de un useFactory)
  const deps = wrapper.inject
    ?? mezclar(Reflect.getMetadata('design:paramtypes', wrapper.metatype),
               Reflect.getMetadata('self:paramtypes', wrapper.metatype));   // @Inject overrides

  // 2. Resolver cada dependencia
  const args = [];
  for (const [index, token] of deps.entries()) {
    const depWrapper =
         modulo.providers.get(token)                        // a) en mi propio módulo
      ?? buscarEnImports(modulo, token)                     // b) en providers EXPORTADOS por mis imports
                                                            //    (recursivo: módulos que reexportan)
      ?? lanzar UnknownDependenciesException(wrapper, index, modulo);
    await loadInstance(depWrapper, moduloDue(depWrapper));  // resolver en profundidad primero
    args.push(depWrapper.instance);
  }

  // 3. Construir
  wrapper.instance = wrapper.isFactory
    ? await wrapper.metatype(...args)                       // useFactory (puede ser async)
    : new wrapper.metatype(...args);                        // useClass / clase normal
  wrapper.isResolved = true;
}
```

Consecuencias que explican errores reales:

| Síntoma | Explicación interna |
|---|---|
| `Nest can't resolve dependencies of the OrdenesService (?, ConfigService). Please make sure that the argument X at index [0] is available in the OrdenesModule context.` | El lookup falló en (a) y (b): el provider no está en `providers` ni **exportado** por ningún import |
| `... (?)` con el nombre `Object` o `undefined` | Falta metadata: `import type`, interfaz como tipo, `emitDecoratorMetadata` desactivado, o ciclo de archivos |
| Dos instancias de un servicio "singleton" | Lo declaraste en `providers` de **dos** módulos: son dos `InstanceWrapper` distintos |
| `A circular dependency between modules` / providers `undefined` | Ciclo de módulos o providers sin `forwardRef` en ambos lados |

> 💡 Si exportas la variable de entorno `NEST_DEBUG=true` al arrancar, el Injector imprime trazas de resolución de cada dependencia. Muy útil para entender en qué punto se rompe un grafo grande.

### 6.3 Scopes por dentro

- **DEFAULT (singleton)**: una instancia en el contexto estático, creada en el bootstrap.
- **REQUEST**: el wrapper no se instancia en el bootstrap. Por cada request el router crea un **`ContextId`** y el injector resuelve (y cachea) instancias para ese contexto; todo lo que depende de un provider request-scoped se marca como no estático y también se instancia por contexto (el "burbujeo", Sesión 23).
- **TRANSIENT**: una instancia por **cada consumidor** que lo inyecta.
- **Durable providers**: con una estrategia registrada en `ContextIdFactory.apply(...)`, varias requests (ej. mismo tenant) comparten un mismo sub-árbol en vez de recrearlo.

> ❓ **Entrevista**: *"¿Por qué un interceptor global que depende de un provider REQUEST-scoped hace más lenta toda la app?"* → Porque el interceptor deja de ser estático: por cada request Nest debe crear un `ContextId` y resolver/instanciar el interceptor y su cadena de dependencias en ese contexto, en todas las rutas. Es trabajo extra y presión de GC en el camino caliente.

---

## 7. Del controller a la ruta: RoutesResolver y RouterExplorer

En `app.init()`:

```
 RoutesResolver.resolve(httpAdapter, globalPrefix)
   └─ por cada módulo, por cada controller:
        RouterExplorer
          ├─ lee 'path' del controller (+ versión, host)
          ├─ recorre los métodos del prototipo (MetadataScanner)
          │     lee 'path' y 'method' de cada método → { path, requestMethod, handler }
          ├─ RouterExecutionContext.create(...) construye el HANDLER FINAL:
          │     • guards (global + controller + método) → GuardsConsumer
          │     • interceptors → InterceptorsConsumer (cadena RxJS)
          │     • pipes por parámetro + factory de argumentos desde '__routeArguments__'
          │     • aplica @HttpCode, @Header, @Redirect, @Render
          ├─ RouterProxy envuelve el handler con el ExceptionsHandler (filtros)
          └─ httpAdapter.get/post/...(rutaCompleta, handlerEnvuelto)
```

El handler resultante hace, por request, exactamente el **ciclo de vida** que estudiaste en las Sesiones 8–13:

```
middleware (registrados antes, por MiddlewareModule)
  → guards → interceptors (antes) → pipes → TU MÉTODO → interceptors (después)
  → serialización / respuesta
  ✖ cualquier excepción → exception filters (el más específico primero)
```

Detalles internos que explican comportamientos:
- Los **contextos de guards/interceptors/pipes se precalculan una vez** por ruta al arrancar (salvo los que dependen de request scope). Por eso el overhead por request de Nest es pequeño.
- Si el handler devuelve un `Observable`, Nest lo convierte (espera su último valor); si devuelve una `Promise`, la espera; si usas `@Res()` sin `passthrough`, Nest **no envía** la respuesta por ti.
- El `ExecutionContext` que recibe tu guard es un `ExecutionContextHost` que envuelve los argumentos crudos del adapter (`[req, res, next]` en HTTP) y sabe su tipo (`'http' | 'rpc' | 'ws'` o `'graphql'`).

---

## 8. ExternalContextCreator: enhancers fuera de HTTP

¿Cómo funcionan `@UseGuards()` en un `@MessagePattern` de microservicios, en un `@SubscribeMessage` de WebSockets o en un `@Resolver` de GraphQL, si no pasan por el `RouterExecutionContext`?

Con **`ExternalContextCreator`**: un servicio de `@nestjs/core` que, dado una instancia, un método y un tipo de contexto, devuelve una función envuelta que aplica **guards, interceptors, pipes y filtros** leyendo la misma metadata. Los paquetes `@nestjs/microservices`, `@nestjs/websockets` y `@nestjs/graphql` usan este mecanismo (o equivalentes internos basados en él) para dar la misma experiencia de "request lifecycle" en otros transportes.

```ts
// PSEUDO-CÓDIGO conceptual: así usa una librería el ExternalContextCreator
// (la firma real tiene más parámetros; consulta tu versión antes de usarla)
const handlerEnvuelto = externalContextCreator.create(
  instanciaDelResolver,           // ej. OrdenesResolver
  instanciaDelResolver.crear,     // el método
  'crear',                        // nombre del método
  /* metadata de parámetros, contextId, tipo de contexto ('graphql'), ... */
);
await handlerEnvuelto(...argsDelTransporte);   // corre guards → interceptors → pipes → método
```

Esta es la pieza que tú usarías si construyes tu propio "transport" o integración (por ejemplo, un consumidor de SQS con decoradores propios) y quieres que los usuarios de tu librería puedan usar `@UseGuards` e interceptors como en un controller. Junto con **`DiscoveryService`** (encontrar providers/métodos con tu decorador, Sesión 24) y `MetadataScanner` es la base de las librerías de ecosistema como `@nestjs/schedule`, `@nestjs/event-emitter` o `@nestjs/cqrs`.

---

## 9. Lifecycle hooks, ModuleRef y LazyModuleLoader por dentro

### Lifecycle hooks

Los hooks no son eventos mágicos: después de instanciar el grafo, Nest **recorre los módulos ordenados por distancia** y, por cada instancia (providers, controllers, injectables), comprueba si tiene el método (`onModuleInit`, `onApplicationBootstrap`, etc.) y lo invoca con `await`.

```
 init (arranque):   onModuleInit          → módulos más profundos primero
                    onApplicationBootstrap → idem, cuando TODOS los onModuleInit terminaron
 close (apagado):   onModuleDestroy → beforeApplicationShutdown(signal)
                    → cierre del adapter HTTP → onApplicationShutdown(signal)
```

Consecuencias prácticas:
- Dentro de un mismo módulo, los hooks de sus providers se esperan (secuencialmente o en paralelo según el hook y la versión): un `onModuleInit` lento **retrasa el arranque completo**.
- Los providers **REQUEST-scoped o transient no reciben** lifecycle hooks: no existen como instancia estática cuando se recorre el grafo.
- Los hooks de apagado solo corren si llamas `app.close()` o activaste `enableShutdownHooks()` (Sesión 34).

### ModuleRef

`ModuleRef` es la ventana "oficial" al contenedor desde tu código (Sesión 23):

| Método | Qué hace internamente |
|---|---|
| `moduleRef.get(Token)` | Busca el `InstanceWrapper` en el módulo actual (o en todo el grafo con `{ strict: false }`) y devuelve la instancia **estática** |
| `moduleRef.resolve(Token, contextId?)` | Resuelve la instancia para un `ContextId` (request/transient): puede **construir** el sub-árbol |
| `moduleRef.create(Clase)` | Instancia una clase que **no** está registrada como provider, resolviendo sus dependencias |

> ⚠️ `moduleRef.get()` sobre un provider REQUEST-scoped lanza error: no hay instancia estática. Usa `resolve()` con un `ContextId` (o `ContextIdFactory.getByRequest(req)` para reutilizar el de la request actual).

### LazyModuleLoader

`LazyModuleLoader.load(() => import('./reportes/reportes.module').then(m => m.ReportesModule))` ejecuta **el mismo scanner e instance loader** sobre un sub-grafo, pero en tiempo de ejecución, y cachea el resultado. Limitación importante: los módulos cargados de forma perezosa **no registran controllers ni rutas** (el router ya se construyó en `init`), ni middleware; sirven para providers. Es la herramienta para reducir cold starts en Lambda (Sesión 34).

### Herramientas de diagnóstico

- `NEST_DEBUG=true`: logs de resolución del injector.
- `NestFactory.create(AppModule, { snapshot: true })` + `@nestjs/devtools-integration`: el **GraphInspector** de Nest serializa el grafo (módulos, providers, dependencias, enhancers) para visualizarlo en Nest Devtools. Útil para auditar un grafo grande o detectar módulos importados de más.
- El debugger de Node con breakpoints en `injector.js` cuando un error de DI no tiene sentido.

---

## 10. Construye un mini contenedor de DI (para interiorizarlo)

```ts
// mini-di.ts — 40 líneas para entender el 80% del Injector
import 'reflect-metadata';

type Clase<T = unknown> = new (...args: any[]) => T;
const INJECT_KEY = 'mini:inject';

export function Injectable(): ClassDecorator {
  return () => {};   // solo existe para que TypeScript emita design:paramtypes
}

export function Inject(token: unknown): ParameterDecorator {
  return (target, _prop, index) => {
    const overrides: Record<number, unknown> = Reflect.getMetadata(INJECT_KEY, target) ?? {};
    overrides[index] = token;
    Reflect.defineMetadata(INJECT_KEY, overrides, target);
  };
}

export class Contenedor {
  private readonly proveedores = new Map<unknown, { useClass?: Clase; useValue?: unknown }>();
  private readonly instancias = new Map<unknown, unknown>();
  private readonly resolviendo = new Set<unknown>();

  registrar(token: unknown, def: { useClass?: Clase; useValue?: unknown }) {
    this.proveedores.set(token, def);
  }

  resolver<T>(token: unknown): T {
    if (this.instancias.has(token)) return this.instancias.get(token) as T;  // singleton
    const def = this.proveedores.get(token);
    if (!def) throw new Error(`No hay provider para ${String((token as any)?.name ?? token)}`);
    if (def.useValue !== undefined) return def.useValue as T;

    if (this.resolviendo.has(token)) throw new Error('Dependencia circular detectada');
    this.resolviendo.add(token);

    const clase = def.useClass!;
    const tipos: unknown[] = Reflect.getMetadata('design:paramtypes', clase) ?? [];
    const overrides: Record<number, unknown> = Reflect.getMetadata(INJECT_KEY, clase) ?? {};
    const args = tipos.map((tipo, i) => this.resolver(overrides[i] ?? tipo));  // recursión

    const instancia = new clase(...args);
    this.resolviendo.delete(token);
    this.instancias.set(token, instancia);
    return instancia as T;
  }
}
```

Lo que le falta para ser Nest: módulos con encapsulación (exports/imports), scopes, factories async, `forwardRef`, lifecycle hooks, enhancers y el router. Pero la idea central —**leer `design:paramtypes`, resolver recursivamente, cachear**— es la misma.

---

## 11. Cómo prepararte para la entrevista senior

1. **Cuenta historias con números**: "bajé el p99 de checkout de 1.8 s a 300 ms eliminando un N+1 y agregando un índice compuesto" vale más que diez definiciones.
2. **Habla de trade-offs**, no de "la mejor práctica": toda decisión (request scope, microservicios, CQRS, Lambda) tiene un costo; nombra cuándo **no** la usarías.
3. **Diseño de sistema con Nest**: practica diseñar TiendaApi de punta a punta en 45 minutos: módulos, datos, auth, colas, caché, observabilidad, despliegue, fallas.
4. **Code review en vivo**: te darán un controller con `@Res()`, lógica en el controller, entidades expuestas, `synchronize: true` y secretos en código. Encuentra los problemas por categoría (seguridad, rendimiento, mantenibilidad).
5. **Lee código fuente**: abre `@nestjs/core/injector/injector.js` y `router/router-explorer.js` al menos una vez.

---

## Resumen mental de la sesión

```
BOOTSTRAP
  NestFactory.create → NestContainer → DependenciesScanner.scan(AppModule)
     scanForModules (recursivo, forwardRef, dinámicos) → scanModulesForDependencies
     (providers/controllers/imports/exports/enhancers) → distancia → globales
  → InstanceLoader: prototipos (Object.create) → Injector: providers → injectables → controllers
  → APP_GUARD/APP_PIPE/APP_INTERCEPTOR/APP_FILTER → NestApplication (Proxy al adapter)
  app.init: onModuleInit → middleware → RoutesResolver/RouterExplorer → onApplicationBootstrap
  app.listen: init + abrir puerto

METADATA: design:paramtypes (TS) · self:paramtypes (@Inject) · imports/providers/... (@Module)
          path/method · __routeArguments__ · __guards__/__interceptors__/__pipes__/__exceptionFilters__
INJECTOR: mi módulo → exports de mis imports (recursivo) → UnknownDependenciesException
          InstanceWrapper: metatype, scope, instancias por ContextId
TOKENS: módulo estático = su clase · dinámico = clave opaca (hash de metadata; algoritmo cambió en v11)
SCOPES: singleton (estático) · REQUEST (ContextId por request, burbujea) · TRANSIENT · durable
ROUTER: RouterExplorer → RouterExecutionContext (guards, interceptors, pipes, args) → RouterProxy (filters)
EXTERNAL CONTEXT CREATOR: mismo lifecycle en rpc / ws / graphql / transports propios
DEBUG: NEST_DEBUG=true · leer node_modules/@nestjs/core
```

---

## Chequeo de entrevista (banco senior: respóndelas de memoria y luego contrasta)

**Internals y DI**
1. ❓ *¿Qué pasa desde `NestFactory.create(AppModule)` hasta que el primer handler responde?*
   → Contenedor → scan de módulos y metadata → instanciación de singletons por el Injector → providers globales (APP_*) → `init`: `onModuleInit`, middleware, rutas (RouterExplorer), `onApplicationBootstrap` → `listen`.

2. ❓ *¿Cómo sabe Nest qué inyectar en un constructor?*
   → Lee `design:paramtypes` (emitido por TypeScript con `emitDecoratorMetadata`) y los overrides de `@Inject` (`self:paramtypes`); por eso las interfaces no sirven como token.

3. ❓ *Explica el lookup de un provider.*
   → Primero en los providers del propio módulo, luego en lo **exportado** por sus imports (recursivamente, incluyendo globales); si no aparece, `UnknownDependenciesException` con el índice del argumento.

4. ❓ *¿Por qué tengo dos instancias de un servicio "singleton"?*
   → Porque está declarado en `providers` de dos módulos; el singleton es por módulo que lo declara. Declara una vez y **exporta**.

5. ❓ *¿Cómo funciona `forwardRef` y cuándo es un olor de diseño?*
   → Posterga la resolución de la referencia para cortar el ciclo de imports de JS; necesario en ambos lados. Casi siempre indica que falta extraer un tercer módulo/servicio o usar eventos.

6. ❓ *¿Qué es un module token y qué implica para módulos dinámicos?*
   → La identidad del módulo en el contenedor; estático = la clase, dinámico = clave derivada de clase + metadata. Determina si dos `register()` se deduplican; el algoritmo cambió en v11, así que no dependas de ello.

7. ❓ *Scopes y su costo.*
   → Singleton gratis; REQUEST crea el sub-árbol por request y burbujea a los dependientes; TRANSIENT una instancia por consumidor. Alternativas: `AsyncLocalStorage`/`nestjs-cls`, durable providers.

8. ❓ *¿Qué es un custom provider y cuándo usas cada forma?*
   → `useClass` (implementación intercambiable), `useValue` (constantes, mocks), `useFactory` + `inject` (config dinámica, async), `useExisting` (alias).

9. ❓ *¿Qué hace `ExternalContextCreator`?*
   → Envuelve un método arbitrario con guards, interceptors, pipes y filtros; es cómo microservicios, websockets y GraphQL reutilizan el lifecycle fuera del router HTTP.

10. ❓ *¿Qué ocurre si un constructor lanza durante el bootstrap?*
   → Con `abortOnError: true` (default) Nest loguea y termina el proceso; con `false`, `create` rechaza la Promise.


**Request lifecycle**
11. ❓ *Orden completo del lifecycle.*
   → Middleware → guards → interceptors (antes) → pipes → handler → interceptors (después) → respuesta; excepciones → filters.

12. ❓ *Guard vs middleware para autenticación.*
   → El guard conoce el `ExecutionContext` (handler, clase, metadata con `Reflector`), así que puede decidir por ruta (`@Public`, roles); el middleware no sabe qué handler se ejecutará.

13. ❓ *¿Por qué evitar `@Res()`?*
   → Desactiva el manejo de respuesta de Nest (interceptors de transformación, serialización), acopla a Express/Fastify y rompe la portabilidad; si lo necesitas, `passthrough: true`.

14. ❓ *¿Cómo aplicas un guard global que necesite DI?*
   → Provider con token `APP_GUARD` en un módulo (no `app.useGlobalGuards(new X())`, que se crea fuera del contenedor).


**Datos, seguridad y API**
15. ❓ *¿Qué es el problema N+1 y cómo lo resuelves en REST y GraphQL?*
   → Una query por cada elemento de una lista; joins/relaciones cargadas o `IN (...)` en REST, DataLoader (batch + caché por request) en GraphQL.

16. ❓ *¿Cómo manejas transacciones que cruzan varios repositorios?*
   → `DataSource.transaction`/`QueryRunner` (TypeORM) o `$transaction` (Prisma), propagando el manager (o con CLS); entre servicios, saga + outbox, no transacciones distribuidas.

17. ❓ *Access + refresh tokens: diseño seguro.*
   → Access corto (minutos) y stateless; refresh largo, rotado en cada uso, guardado hasheado, con detección de reutilización y revocación; en navegador, cookie `HttpOnly`/`Secure`/`SameSite`.

18. ❓ *RBAC vs ABAC/CASL.*
   → RBAC decide por rol (simple); ABAC decide por atributos del recurso y del usuario (ownership, tenant); CASL modela habilidades y permite filtrar queries.

19. ❓ *Tres riesgos del OWASP API Top 10 y cómo los mitigas en Nest.*
   → BOLA (chequeo de ownership en el servicio), exposición excesiva de datos (DTOs de respuesta/serialización), falta de rate limiting (`@nestjs/throttler` con Redis).

20. ❓ *¿Cómo versionas una API sin romper clientes?*
   → `enableVersioning` (URI/header/media type), cambios aditivos, deprecación con fecha, contratos en OpenAPI y tests de contrato.


**Arquitectura y sistemas distribuidos**
21. ❓ *¿Cuándo NO usarías microservicios?*
   → Equipo pequeño, dominio no estabilizado, sin observabilidad/CI maduros; un monolito modular bien encapsulado da el 80% del beneficio con una fracción del costo.

22. ❓ *`send` vs `emit` en `ClientProxy`.*
   → `send` es request-response (`@MessagePattern`, devuelve Observable frío que hay que suscribir); `emit` es evento fire-and-forget (`@EventPattern`).

23. ❓ *¿Cómo garantizas que un evento se publica si la transacción se confirmó?*
   → Transactional outbox: guardar el evento en la misma transacción y publicarlo con un relay; consumidores idempotentes.

24. ❓ *CQRS con `@nestjs/cqrs`: beneficio y costo.*
   → Separa escrituras (commands, invariantes) de lecturas (queries optimizadas) y facilita eventos de dominio; costo: más piezas y consistencia eventual si separas modelos. Úsalo en dominios complejos, no en CRUD.

25. ❓ *Arquitectura hexagonal en Nest: ¿dónde vive cada cosa?*
   → Dominio sin Nest ni ORM; puertos como clases abstractas/tokens; adaptadores (repos TypeORM, clientes HTTP) en infraestructura; los módulos de Nest hacen el wiring con custom providers.

26. ❓ *¿Qué compartes entre servicios en un monorepo?*
   → Contratos (DTOs de mensajes, eventos versionados), utilidades y módulos de infraestructura configurables; nunca entidades de dominio. Límites con tags + lint.


**Producción**
27. ❓ *Liveness vs readiness.*
   → Liveness: ¿estoy vivo? (sin dependencias, reinicia); readiness: ¿puedo atender? (DB crítica, saca del balanceo). DB en liveness provoca fallas en cascada.

28. ❓ *¿Cómo instrumentas trazas y por qué el orden de carga importa?*
   → OTel NodeSDK con auto-instrumentaciones, iniciado **antes** de cargar Nest (`--require`), porque parchea módulos al cargarlos; propagación W3C `traceparent`; muestreo `parentbased`.

29. ❓ *La memoria crece hasta OOMKilled. Proceso.*
   → Distinguir heap vs external; reproducir con carga; tres heap snapshots → comparación → retainers; sospechosos: Map en singletons, listeners, subscriptions, timers.

30. ❓ *Deploy sin cortar requests.*
   → `SIGTERM` llega al proceso (node PID 1), `enableShutdownHooks`, readiness 503, drenaje del LB, hooks de cierre ordenados, `keepAliveTimeout` > idle del LB, migraciones expand/contract, circuit breaker con rollback.

31. ❓ *¿Express o Fastify?*
   → Express por ecosistema y compatibilidad; Fastify si el perfil muestra overhead de framework o el servicio es de alto volumen y lógica liviana. Casi nunca es el cuello de botella frente a la DB.

32. ❓ *¿Nest en Lambda?*
   → Viable con `serverless-express` (o Web Adapter), app cacheada entre invocaciones, bundling, RDS Proxy y provisioned concurrency si la latencia importa; para tráfico sostenido, ECS suele ganar.


## Ejercicio práctico
1. Abre `node_modules/@nestjs/core/nest-factory.js` y sigue con el debugger (`node --inspect-brk dist/main.js`) el camino de `create` hasta `DependenciesScanner.scan`. Anota los nombres de los métodos que ves en **tu** versión.
2. Ejecuta el script `ver-metadata.ts` de la sección 3 sobre tus módulos, controllers y servicios de TiendaApi y relaciona cada clave con el decorador que la escribió.
3. Rompe la DI a propósito de tres formas: (a) quita un provider de `exports`, (b) cambia un `import` por `import type`, (c) crea un ciclo `OrdenesModule ↔ UsuariosModule`. Lee cada mensaje de error y explica qué paso del Injector falló. Repite con `NEST_DEBUG=true`.
4. Declara `PreciosService` en los `providers` de dos módulos, loguea un `randomUUID()` en su constructor y demuestra que hay dos instancias. Arréglalo con un único módulo que lo exporte.
5. Implementa el mini contenedor de la sección 10, agrega soporte `useFactory` con `inject` y scope transient, y escribe tests con Jest.
6. Haz un provider REQUEST-scoped, inyéctalo en un interceptor global y mide con autocannon (Sesión 33) la diferencia de throughput frente a la versión con `nestjs-cls`.
7. Construye una mini librería: un decorador `@OnSqsMessage('cola')` que, usando `DiscoveryService` y `MetadataScanner`, encuentre los métodos decorados al arrancar y los registre en un consumidor (puedes simular SQS con un `EventEmitter`). Opcional: envuelve los handlers para que respeten `@UseGuards` investigando `ExternalContextCreator` en tu versión.
8. Practica el banco de 32 preguntas en voz alta cronometrando 2 minutos por respuesta, y graba una sesión de diseño de sistema de TiendaApi de 45 minutos.

---

## 🎓 Cierre del curso

Si llegaste hasta aquí haciendo los ejercicios, recorriste el camino completo: de un `nest new` y un controller en memoria a una TiendaApi con persistencia, seguridad, tests, colas, tiempo real, GraphQL, microservicios en un monorepo, observabilidad de punta a punta, rendimiento medido, despliegue sin downtime en AWS y una comprensión real de lo que Nest hace por dentro. Esa combinación de **construir, operar y explicar** es lo que distingue a un senior.

**Próximos pasos sugeridos:**
1. **Consolida con un proyecto propio público**: TiendaApi completa en GitHub, con README de arquitectura, diagramas, decisiones (ADRs) y el pipeline funcionando. Es tu mejor carta en entrevistas.
2. **Contribuye al ecosistema**: lee issues de `nestjs/nest` o de una librería que uses (`nestjs-pino`, `@nestjs/terminus`); arreglar un bug pequeño te obliga a leer internals de verdad.
3. **Profundiza en lo que Nest no resuelve**: diseño de bases de datos y queries (Postgres a fondo), sistemas distribuidos (consistencia, idempotencia, colas), y diseño de sistemas para entrevistas.
4. **Amplía el stack**: un segundo lenguaje backend (Go, Kotlin o C#) te da perspectiva sobre qué es de Nest y qué es de ingeniería de software.
5. **Repite el chequeo de entrevista** de cada sesión cada pocas semanas: la memoria de largo plazo se construye con repaso espaciado.

➡️ **Cuando termines**, marca la Sesión 35 en el [README](README.md): el curso está completo. ¡Felicitaciones, y a por ese rol senior! 🚀
