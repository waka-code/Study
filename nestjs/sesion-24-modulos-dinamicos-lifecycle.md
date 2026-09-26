# Sesión 24 — Módulos dinámicos, lifecycle hooks y DiscoveryService

> **Objetivo de la sesión**: construir módulos **reutilizables y configurables** como los de la propia comunidad de Nest (`TypeOrmModule.forRoot`, `JwtModule.registerAsync`), entender el **ciclo de vida** de la aplicación de principio a fin (arranque y apagado ordenado) y usar el **DiscoveryService** para crear mecanismos declarativos basados en decoradores. Al terminar deberías poder escribir un módulo dinámico a mano y con `ConfigurableModuleBuilder`, explicar las convenciones `forRoot`/`register`/`forFeature`, saber en qué hook inicializar o liberar recursos, y construir tu propio "registry" de handlers a partir de un decorador custom.

---

## 1. Módulos estáticos vs dinámicos

Un módulo **estático** tiene su configuración escrita en el decorador `@Module()`: siempre es igual, lo importe quien lo importe.

```typescript
@Module({ providers: [ProductosService], exports: [ProductosService] })
export class ProductosModule {}
```

Pero muchos módulos necesitan **parámetros**: la URL de la base de datos, el secreto del JWT, el nombre de una cola. No puedes escribirlos en el decorador porque dependen de la app que lo usa. Un **módulo dinámico** es un módulo cuya definición se **calcula** al importarlo, mediante un método estático que devuelve un objeto `DynamicModule`.

```typescript
// Lo que ya usaste sin saber cómo funciona:
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),                 // Sesión 7
    TypeOrmModule.forRootAsync({ useFactory: ... }),          // Sesión 14
    TypeOrmModule.forFeature([Producto, Categoria]),
    JwtModule.registerAsync({ useFactory: ... }),             // Sesión 18
    BullModule.registerQueue({ name: 'emails' }),             // Sesión 25
  ],
})
export class AppModule {}
```

```typescript
// La interfaz (de @nestjs/common)
interface DynamicModule extends ModuleMetadata {
  module: Type<any>;     // la clase del módulo (obligatorio)
  global?: boolean;      // registrarlo como global
  // + imports, providers, exports, controllers de ModuleMetadata
}
```

Los metadatos devueltos **se suman** (no reemplazan) a los del decorador `@Module()` de la clase.

> ❓ **Entrevista**: *"¿Qué es un módulo dinámico y por qué existe?"* → Es un módulo cuya metadata (providers, imports, exports) se genera en tiempo de importación a partir de parámetros, a través de un método estático que retorna `DynamicModule`. Existe porque un módulo reutilizable (librería, módulo compartido del monorepo) necesita configuración del consumidor sin acoplarse a ella: el módulo expone un contrato de opciones y el consumidor decide los valores.

---

## 2. Convenciones de nombres

No son obligatorias, pero la comunidad las respeta y tus compañeros las esperan:

| Método | Significado | Ejemplo |
|---|---|---|
| `forRoot` / `forRootAsync` | Configuración **una vez** para toda la app; normalmente en `AppModule`, a menudo global | `ConfigModule.forRoot`, `TypeOrmModule.forRoot` |
| `register` / `registerAsync` | Configuración **por import**: cada módulo que lo importa lo configura a su manera | `JwtModule.register`, `HttpModule.register` |
| `forFeature` | Usa la config de `forRoot` y agrega algo específico del módulo consumidor | `TypeOrmModule.forFeature([Producto])`, `BullModule.registerQueue` |

La variante `Async` existe porque a menudo las opciones dependen de **otro provider** (típicamente `ConfigService`), que no está disponible al evaluar el decorador del módulo.

---

## 3. Un módulo dinámico a mano: `NotificacionesModule`

Queremos que TiendaApi (y otras apps del monorepo, Sesión 31) envíen notificaciones con un proveedor configurable.

```typescript
// src/notificaciones/notificaciones.options.ts
export interface NotificacionesModuleOptions {
  proveedor: 'smtp' | 'ses' | 'consola';
  remitente: string;
  apiKey?: string;
}

export const NOTIFICACIONES_OPTIONS = Symbol('NOTIFICACIONES_OPTIONS');
```

```typescript
// src/notificaciones/notificaciones.service.ts
@Injectable()
export class NotificacionesService {
  constructor(@Inject(NOTIFICACIONES_OPTIONS) private readonly opts: NotificacionesModuleOptions) {}

  async enviar(para: string, asunto: string, cuerpo: string) {
    if (this.opts.proveedor === 'consola') {
      console.log(`[${this.opts.remitente} → ${para}] ${asunto}: ${cuerpo}`);
      return;
    }
    // ... SMTP / SES usando this.opts.apiKey
  }
}
```

```typescript
// src/notificaciones/notificaciones.module.ts
import { DynamicModule, Module, Provider } from '@nestjs/common';

export interface NotificacionesAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => NotificacionesModuleOptions | Promise<NotificacionesModuleOptions>;
}

@Module({})
export class NotificacionesModule {
  // Variante síncrona: opciones literales
  static forRoot(options: NotificacionesModuleOptions): DynamicModule {
    return {
      module: NotificacionesModule,
      global: true,
      providers: [
        { provide: NOTIFICACIONES_OPTIONS, useValue: options },
        NotificacionesService,
      ],
      exports: [NotificacionesService],
    };
  }

  // Variante async: opciones calculadas desde otros providers
  static forRootAsync(options: NotificacionesAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: NOTIFICACIONES_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    return {
      module: NotificacionesModule,
      global: true,
      imports: options.imports ?? [],   // para que los providers de `inject` sean visibles
      providers: [optionsProvider, NotificacionesService],
      exports: [NotificacionesService],
    };
  }
}
```

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificacionesModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        proveedor: config.getOrThrow('NOTIF_PROVEEDOR'),
        remitente: 'no-reply@tienda.cl',
        apiKey: config.get('NOTIF_API_KEY'),
      }),
    }),
  ],
})
export class AppModule {}
```

El patrón clave: **las opciones son un provider más** (`NOTIFICACIONES_OPTIONS`). El servicio no sabe si vinieron de un literal, de `ConfigService` o de un secreto de AWS: solo las inyecta.

> ⚠️ Olvidar `imports` en la variante async: si `ConfigService` no es global y no importas `ConfigModule` dentro del `DynamicModule`, el factory no puede resolver `inject: [ConfigService]` y verás el clásico "can't resolve dependencies of NOTIFICACIONES_OPTIONS".

> ⚠️ Importar un módulo con `register()` en dos lugares con opciones distintas crea **dos instancias distintas** del módulo (y de sus providers): Nest identifica cada módulo dinámico por su metadata, y metadata diferente = módulo diferente. Es justo lo que quieres con `register`, y justo lo que **no** quieres con un `forRoot` que abre una conexión.

---

## 4. `ConfigurableModuleBuilder`: sin boilerplate

Escribir `forRoot` + `forRootAsync` con `useFactory`, `useClass` y `useExisting` bien hecho es repetitivo y propenso a errores. `ConfigurableModuleBuilder` (en `@nestjs/common`) genera todo eso.

```typescript
// src/notificaciones/notificaciones.module-definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common';
import { NotificacionesModuleOptions } from './notificaciones.options';

export const {
  ConfigurableModuleClass,     // clase base con los métodos estáticos generados
  MODULE_OPTIONS_TOKEN,        // token con el que se inyectan las opciones
  OPTIONS_TYPE,                // tipo de las opciones de forRoot (incluye extras)
  ASYNC_OPTIONS_TYPE,          // tipo de las opciones de forRootAsync
} = new ConfigurableModuleBuilder<NotificacionesModuleOptions>()
  .setClassMethodName('forRoot')                  // genera forRoot/forRootAsync (default: register)
  .setFactoryMethodName('crearOpciones')          // método esperado en clases useClass (default: create)
  .setExtras(
    { isGlobal: false },                          // opciones extra que NO llegan al servicio
    (definicion, extras) => ({ ...definicion, global: extras.isGlobal }),
  )
  .build();
```

```typescript
// src/notificaciones/notificaciones.module.ts
@Module({
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule extends ConfigurableModuleClass {}

// src/notificaciones/notificaciones.service.ts
@Injectable()
export class NotificacionesService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly opts: NotificacionesModuleOptions) {}
}
```

Ahora el módulo soporta todas estas formas sin que escribas nada más:

```typescript
// 1. Literal
NotificacionesModule.forRoot({ proveedor: 'consola', remitente: 'dev@tienda.cl', isGlobal: true })

// 2. Factory
NotificacionesModule.forRootAsync({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (c: ConfigService) => ({ proveedor: c.getOrThrow('NOTIF_PROVEEDOR'), remitente: 'no-reply@tienda.cl' }),
})

// 3. Clase que fabrica las opciones (útil si la lógica es larga o necesita varias deps)
@Injectable()
export class NotificacionesConfig implements ConfigurableModuleOptionsFactory<NotificacionesModuleOptions, 'crearOpciones'> {
  constructor(private readonly secrets: SecretsService) {}
  async crearOpciones(): Promise<NotificacionesModuleOptions> {
    return { proveedor: 'ses', remitente: 'no-reply@tienda.cl', apiKey: await this.secrets.get('ses-key') };
  }
}
NotificacionesModule.forRootAsync({ useClass: NotificacionesConfig })

// 4. Reutilizar un provider existente que ya fabrica opciones
NotificacionesModule.forRootAsync({ imports: [ConfigCompartidaModule], useExisting: NotificacionesConfig })
```

> 💡 `ConfigurableModuleOptionsFactory` es el tipo helper que exporta `@nestjs/common` para tipar la clase de `useClass`. El segundo parámetro de tipo debe coincidir con `setFactoryMethodName`.

### 4.1 Extender los métodos generados

Si necesitas agregar providers según las opciones (por ejemplo, un adaptador distinto por proveedor), sobrescribe el método estático y llama a `super`:

```typescript
@Module({ providers: [NotificacionesService], exports: [NotificacionesService] })
export class NotificacionesModule extends ConfigurableModuleClass {
  static forRoot(options: typeof OPTIONS_TYPE): DynamicModule {
    const base = super.forRoot(options);
    return {
      ...base,
      providers: [
        ...(base.providers ?? []),
        { provide: CanalEnvio, useClass: options.proveedor === 'ses' ? SesCanal : ConsolaCanal },
      ],
      exports: [...(base.exports ?? []), CanalEnvio],
    };
  }

  static forRootAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    return super.forRootAsync(options);   // aquí las opciones aún no existen (son async)
  }
}
```

> ⚠️ En `forRootAsync` **no** puedes decidir providers según los valores de las opciones, porque todavía no existen (se calculan cuando el injector ejecuta el factory). La decisión debe ir dentro de un `useFactory` que inyecte `MODULE_OPTIONS_TOKEN`:
> ```typescript
> { provide: CanalEnvio, inject: [MODULE_OPTIONS_TOKEN],
>   useFactory: (o: NotificacionesModuleOptions) => (o.proveedor === 'ses' ? new SesCanal(o) : new ConsolaCanal()) }
> ```

| Característica | A mano | `ConfigurableModuleBuilder` |
|---|---|---|
| `forRoot` + `forRootAsync` | Tú | Generados |
| `useFactory` / `useClass` / `useExisting` | Tú, uno por uno | Todos |
| Tipos de opciones | Tú | `OPTIONS_TYPE`, `ASYNC_OPTIONS_TYPE` |
| Extras (`isGlobal`) | Tú | `setExtras` |
| `forFeature` | Tú | No lo genera (escríbelo a mano) |

---

## 5. `forFeature`: configuración global + específica

Patrón en dos niveles, como `TypeOrmModule`: `forRoot` una vez con la conexión; `forFeature` en cada módulo para registrar "sus" cosas.

```typescript
// Módulo de auditoría: la conexión se configura una vez, cada feature registra sus entidades auditables
@Module({})
export class AuditoriaModule {
  static forFeature(entidades: string[]): DynamicModule {
    const providers = entidades.map((nombre) => ({
      provide: tokenAuditor(nombre),                         // p.ej. 'AUDITOR_Producto'
      inject: [AuditoriaCore],                               // provisto por forRoot (global)
      useFactory: (core: AuditoriaCore) => core.crearAuditor(nombre),
    }));
    return { module: AuditoriaModule, providers, exports: providers };
  }
}

export const tokenAuditor = (nombre: string) => `AUDITOR_${nombre}`;
export const InjectAuditor = (nombre: string) => Inject(tokenAuditor(nombre));   // decorador azúcar

// productos.module.ts
@Module({ imports: [AuditoriaModule.forFeature(['Producto'])], ... })
// productos.service.ts
constructor(@InjectAuditor('Producto') private readonly auditor: Auditor) {}
```

Así funcionan por dentro `@InjectRepository(Entidad)` (`getRepositoryToken`) o `@InjectQueue('emails')` (Sesión 25): un `forFeature` que genera providers con tokens derivados de un nombre, y un decorador que envuelve `@Inject(token)`.

---

## 6. Lifecycle hooks

### 6.1 La secuencia completa

```
 NestFactory.create()
   │  scanner + injector: se instancian providers (constructores)
   ▼
 onModuleInit()            ← por cada módulo, en orden de dependencias
   ▼
 onApplicationBootstrap()  ← todos los módulos ya inicializados
   ▼
 app.listen()              ← empieza a aceptar conexiones
   │
   │   ... la app atiende tráfico ...
   │
   ▼  SIGTERM / SIGINT (con enableShutdownHooks) o app.close()
 onModuleDestroy()
   ▼
 beforeApplicationShutdown(signal)   ← después de esto se cierran las conexiones HTTP
   ▼
 onApplicationShutdown(signal)
   ▼
 proceso termina
```

| Hook | Interfaz | Cuándo | Uso típico |
|---|---|---|---|
| `onModuleInit` | `OnModuleInit` | Tras resolver las dependencias del módulo | Conectar, precargar caché, validar config |
| `onApplicationBootstrap` | `OnApplicationBootstrap` | Todos los módulos inicializados | Arrancar consumidores/schedulers que usan otros módulos |
| `onModuleDestroy` | `OnModuleDestroy` | Al comenzar el apagado | Dejar de aceptar trabajo nuevo |
| `beforeApplicationShutdown` | `BeforeApplicationShutdown` | Antes de cerrar el servidor/conexiones | Drenar trabajo en curso |
| `onApplicationShutdown` | `OnApplicationShutdown` | Al final | Cerrar clientes (DB, Redis), flush de logs/métricas |

- Todos pueden ser `async`: Nest **espera** su promesa antes de pasar al siguiente paso. Un `onModuleInit` que no resuelve deja la app sin arrancar.
- El orden de `onModuleInit` sigue la **distancia de dependencias** entre módulos: los módulos importados se inicializan antes que quienes los importan. Dentro de un módulo, el orden entre providers no está garantizado.
- **No** se llaman en providers `REQUEST` ni `TRANSIENT` (Sesión 23).

### 6.2 Constructor vs `onModuleInit`

```typescript
@Injectable()
export class CatalogoCache implements OnModuleInit {
  private destacados: Producto[] = [];

  constructor(private readonly productos: ProductosService) {
    // ❌ no hagas trabajo async aquí: un constructor no puede ser await-eado
    // this.productos.destacados().then(...)  → la app arranca antes de que termine
  }

  async onModuleInit() {
    // ✅ Nest espera esto antes de arrancar
    this.destacados = await this.productos.destacados();
  }
}
```

### 6.3 Graceful shutdown

Los hooks de apagado **solo** se disparan por señales si lo activas:

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();          // escucha SIGTERM, SIGINT, etc.
await app.listen(3000);
```

```typescript
// src/redis/redis-lifecycle.service.ts
@Injectable()
export class RedisLifecycle implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(signal?: string) {
    console.log(`Cerrando Redis por ${signal}`);
    await this.redis.quit();          // cierra ordenado: termina comandos pendientes
  }
}
```

¿Por qué importa? En ECS o Kubernetes (Sesión 34), un deploy envía **SIGTERM** al contenedor viejo y, tras un periodo de gracia (p. ej. 30 s), **SIGKILL**. Si no manejas SIGTERM: requests a medio responder se cortan, jobs de cola quedan a medias, conexiones a la DB quedan colgadas hasta timeout.

> ⚠️ `enableShutdownHooks()` registra listeners por proceso y consume algo de memoria. En tests que crean muchas apps (Jest) puede producir "MaxListenersExceededWarning"; no lo llames en la configuración compartida de tests.

> ⚠️ En Windows las señales no se comportan igual (SIGTERM no existe como en POSIX). Y si ejecutas con `npm start`, algunos entornos no reenvían la señal al proceso de Node: en contenedores ejecuta `node dist/main.js` directamente o usa un init como `tini`.

> ❓ **Entrevista**: *"¿Cómo implementas graceful shutdown en Nest?"* → `app.enableShutdownHooks()` para que SIGTERM dispare los hooks; en `onModuleDestroy`/`beforeApplicationShutdown` dejo de aceptar trabajo nuevo (pausar consumidores de colas, marcar el readiness como no listo para que el load balancer deje de enviar tráfico) y espero el trabajo en curso; en `onApplicationShutdown` cierro clientes (DB, Redis, brokers) y hago flush de logs. Todo debe caber en el periodo de gracia del orquestador.

---

## 7. `DiscoveryService`: descubrir providers por metadata

A veces quieres un mecanismo **declarativo**: "todo método marcado con `@AlCrearOrden()` debe ejecutarse cuando se crea una orden", sin que nadie los registre a mano. Así funcionan por dentro `@Cron()`, `@OnEvent()` o `@Processor()` (Sesión 25): al arrancar, el módulo recorre todos los providers, busca metadata y registra los handlers.

`DiscoveryService` (de `@nestjs/core`, con `DiscoveryModule`) da acceso a todos los providers y controllers ya instanciados, como `InstanceWrapper`s.

### 7.1 Opción moderna: `DiscoveryService.createDecorator`

```typescript
// src/integraciones/integracion.decorator.ts
import { DiscoveryService } from '@nestjs/core';

// Crea un decorador de clase/método con metadata tipada y su clave (Integracion.KEY)
export const Integracion = DiscoveryService.createDecorator<{ nombre: string }>();
```

```typescript
// Providers marcados
@Injectable()
@Integracion({ nombre: 'erp' })
export class ErpSync implements Sincronizador {
  sincronizar(orden: Orden) { /* ... */ }
}

@Injectable()
@Integracion({ nombre: 'contabilidad' })
export class ContabilidadSync implements Sincronizador {
  sincronizar(orden: Orden) { /* ... */ }
}
```

```typescript
// src/integraciones/integraciones.registry.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

@Injectable()
export class IntegracionesRegistry implements OnModuleInit {
  private readonly sincronizadores = new Map<string, Sincronizador>();

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit() {
    // Solo los providers que tengan la metadata de @Integracion
    const wrappers = this.discovery.getProviders({ metadataKey: Integracion.KEY });

    for (const wrapper of wrappers) {
      const meta = this.discovery.getMetadataByDecorator(Integracion, wrapper);
      if (!meta || !wrapper.instance) continue;   // instance es undefined en providers no estáticos
      this.sincronizadores.set(meta.nombre, wrapper.instance as Sincronizador);
    }
  }

  async notificar(orden: Orden) {
    await Promise.all([...this.sincronizadores.values()].map((s) => s.sincronizar(orden)));
  }
}

@Module({
  imports: [DiscoveryModule],
  providers: [IntegracionesRegistry, ErpSync, ContabilidadSync],
  exports: [IntegracionesRegistry],
})
export class IntegracionesModule {}
```

Agregar una integración nueva = crear una clase con `@Integracion({ nombre })` y registrarla como provider. El registry no cambia (principio abierto/cerrado).

### 7.2 Descubrir **métodos**: `MetadataScanner` + `Reflector`

Para decoradores de método (estilo `@OnEvent`), recorre los métodos del prototipo:

```typescript
// src/ordenes/al-crear-orden.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const AL_CREAR_ORDEN = 'AL_CREAR_ORDEN';
export const AlCrearOrden = () => SetMetadata(AL_CREAR_ORDEN, true);
```

```typescript
// src/ordenes/hooks-orden.explorer.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

type Handler = (orden: Orden) => Promise<void> | void;

@Injectable()
export class HooksOrdenExplorer implements OnApplicationBootstrap {
  private handlers: Handler[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onApplicationBootstrap() {
    for (const wrapper of this.discovery.getProviders()) {
      const { instance } = wrapper;
      // Saltar providers sin instancia (async aún no resueltos, REQUEST/TRANSIENT) o valores planos
      if (!instance || typeof instance !== 'object' || !wrapper.isDependencyTreeStatic()) continue;

      const prototipo = Object.getPrototypeOf(instance);
      for (const nombreMetodo of this.scanner.getAllMethodNames(prototipo)) {
        const metodo = instance[nombreMetodo];
        if (this.reflector.get(AL_CREAR_ORDEN, metodo)) {
          this.handlers.push(metodo.bind(instance));  // bind: conservar el this del provider
        }
      }
    }
  }

  async ejecutar(orden: Orden) {
    for (const h of this.handlers) await h(orden);
  }
}
```

```typescript
// Cualquier provider puede engancharse
@Injectable()
export class PuntosFidelidad {
  @AlCrearOrden()
  async sumarPuntos(orden: Orden) { /* ... */ }
}
```

> ⚠️ `wrapper.instance` de un provider `REQUEST`/`TRANSIENT` no es la instancia "real" que usan las requests (no hay una única). Filtra con `wrapper.isDependencyTreeStatic()` o resuélvelos con `ModuleRef.resolve` (Sesión 23).

> ⚠️ Olvidar `bind(instance)`: el handler pierde su `this` y falla con "Cannot read properties of undefined" al acceder a sus dependencias.

> 💡 Para este caso concreto (reaccionar a "orden creada"), `@nestjs/event-emitter` ya resuelve el problema (Sesión 25). Escribe tu propio explorer cuando necesites semántica que las librerías no dan: orden garantizado, resultado agregado, validación en arranque ("falta un handler para X"), etc.

> ❓ **Entrevista**: *"¿Cómo implementa Nest decoradores como `@Cron()` o `@OnEvent()`?"* → El decorador solo guarda metadata en el método (`SetMetadata`/`Reflect.defineMetadata`). Al arrancar, un "explorer" del módulo usa `DiscoveryService` para listar providers, `MetadataScanner` para recorrer sus métodos y `Reflector` para leer la metadata; con eso registra cada método (bindeado a su instancia) en el scheduler, el emisor de eventos o el worker correspondiente.

---

## 8. Combinando todo: un módulo de librería completo

```
 NotificacionesModule.forRootAsync({ useFactory })     ← ConfigurableModuleBuilder
   ├── MODULE_OPTIONS_TOKEN  (opciones como provider)
   ├── NotificacionesService (usa las opciones)
   ├── PlantillasExplorer    ← DiscoveryService: busca @PlantillaEmail('bienvenida') en providers
   │      onApplicationBootstrap: registra plantillas; FALLA si hay nombres duplicados
   └── ConexionSmtp
          onModuleInit: verifica credenciales (fail fast)
          onApplicationShutdown: cierra el pool
```

Esa combinación es lo que distingue un módulo "copiado y pegado" de un módulo que puedes publicar como librería interna (Sesión 31): configurable sin tocar su código, extensible por decoradores y con ciclo de vida limpio.

> ⚠️ **Fail fast en el arranque**: valida opciones (con class-validator o zod) dentro del factory o en `onModuleInit` y lanza si están mal. Es mucho mejor un contenedor que no arranca en el deploy que uno que arranca y falla con el primer usuario.

---

## Resumen mental de la sesión

```
Módulo dinámico = static metodo(opciones): DynamicModule { module, imports, providers, exports, global }
  metadata devuelta SE SUMA a la de @Module()
  forRoot (1 vez, global) · register (por import, instancias separadas) · forFeature (específico)
  Async: opciones dependen de otros providers → { imports, inject, useFactory } 
  Clave: las OPCIONES SON UN PROVIDER (token) que el servicio inyecta

ConfigurableModuleBuilder<Opts>()
  .setClassMethodName('forRoot') .setFactoryMethodName('crear') .setExtras({isGlobal}, fn) .build()
  → ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE
  soporta useFactory / useClass / useExisting; extender con super.forRoot()
  en Async no hay valores aún → decide dentro de un factory que inyecte MODULE_OPTIONS_TOKEN

Lifecycle: constructor → onModuleInit → onApplicationBootstrap → listen
           SIGTERM → onModuleDestroy → beforeApplicationShutdown → onApplicationShutdown
  async y esperados · no en REQUEST/TRANSIENT · enableShutdownHooks() para señales
  graceful shutdown: dejar de aceptar → drenar → cerrar clientes (dentro del periodo de gracia)

DiscoveryService (DiscoveryModule):
  createDecorator<T>() + getProviders({ metadataKey: D.KEY }) + getMetadataByDecorator
  métodos: MetadataScanner.getAllMethodNames + Reflector.get + bind(instance)
  = cómo funcionan @Cron, @OnEvent, @Processor
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un `DynamicModule` y cómo se combina con la metadata de `@Module()`?
2. ❓ Explica la diferencia entre `forRoot`, `register` y `forFeature`. ¿Qué pasa si importas `register()` en dos módulos?
3. ❓ ¿Por qué existe la variante `Async`? ¿Para qué sirve `imports` dentro de `forRootAsync`?
4. ❓ ¿Qué genera `ConfigurableModuleBuilder` y para qué sirven `setExtras` y `setFactoryMethodName`?
5. ❓ ¿Por qué en `forRootAsync` no puedes elegir providers según el valor de las opciones? ¿Cómo lo resuelves?
6. ❓ ¿Cómo funciona por dentro `@InjectRepository(Producto)`?
7. ❓ Enumera los lifecycle hooks en orden. ¿Cuáles se ejecutan en el apagado y qué los dispara?
8. ❓ ¿Por qué no debes hacer trabajo async en el constructor de un provider?
9. ❓ ¿Qué pasa con los lifecycle hooks en providers request-scoped?
10. ❓ Describe un graceful shutdown completo en un contenedor de ECS/Kubernetes.
11. ❓ ¿Qué es `DiscoveryService` y cómo implementarías un decorador `@AlCrearOrden()`?
12. ❓ ¿Por qué hay que hacer `bind(instance)` al registrar métodos descubiertos?

## Ejercicio práctico
1. Escribe `NotificacionesModule` **a mano** con `forRoot` y `forRootAsync` (`useFactory` + `inject` + `imports`), con opciones inyectadas vía `NOTIFICACIONES_OPTIONS`.
2. Reescríbelo con `ConfigurableModuleBuilder` usando `setClassMethodName('forRoot')`, `setExtras({ isGlobal })` y un `setFactoryMethodName`. Prueba las variantes `useFactory`, `useClass` y `useExisting`.
3. Agrega un provider `CanalEnvio` que dependa de `proveedor` y que funcione tanto con `forRoot` como con `forRootAsync` (factory que inyecta `MODULE_OPTIONS_TOKEN`).
4. Valida las opciones en el factory (zod o class-validator) y verifica que la app **no arranca** con opciones inválidas.
5. Implementa `AuditoriaModule.forFeature(['Producto', 'Orden'])` con un decorador `@InjectAuditor('Producto')`.
6. Agrega `console.log` en constructor, `onModuleInit` y `onApplicationBootstrap` de tres providers en módulos distintos y observa el orden. Luego activa `enableShutdownHooks()`, envía `kill -TERM <pid>` y observa los hooks de apagado.
7. Implementa `RedisLifecycle` que cierre `ioredis` con `quit()` en `onApplicationShutdown`.
8. Crea `@Integracion({ nombre })` con `DiscoveryService.createDecorator` y un `IntegracionesRegistry` que llame a todas al crear una orden.
9. Implementa `@AlCrearOrden()` con `MetadataScanner` + `Reflector`, registra dos handlers y haz que el explorer **falle al arrancar** si encuentra un handler en un provider REQUEST-scoped.

---

➡️ **Cuando termines**, marca la Sesión 24 en el [README](README.md) y pasa a la **Sesión 25 — Caching (Redis), tareas programadas, colas con BullMQ y eventos**.
