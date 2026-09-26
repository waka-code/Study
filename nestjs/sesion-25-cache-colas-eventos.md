# Sesión 25 — Caching (Redis), tareas programadas, colas con BullMQ y eventos

> **Objetivo de la sesión**: sacar trabajo del camino crítico de la request. Al terminar deberías poder cachear lecturas con `@nestjs/cache-manager` (v3, sobre **cache-manager v6 + Keyv**) en memoria y en Redis, elegir e implementar una estrategia de invalidación, programar tareas con `@nestjs/schedule` sabiendo por qué fallan con varias réplicas, procesar trabajo en segundo plano con **BullMQ** (`@nestjs/bullmq`, `WorkerHost`) con reintentos, backoff e idempotencia, y desacoplar módulos con eventos in-process (`@nestjs/event-emitter`). Y lo más importante: saber **cuál de las cuatro herramientas** corresponde a cada problema.

---

## 1. El problema común: la request no debería hacerlo todo

```
POST /ordenes  (sin nada de esta sesión)
  ├─ validar y guardar orden ............ 40 ms   ← lo único que el cliente necesita esperar
  ├─ recalcular "productos más vendidos"  300 ms
  ├─ enviar email de confirmación ....... 800 ms  (y si el SMTP cae, la orden falla)
  ├─ notificar al ERP ................... 1200 ms
  └─ respuesta ......................... ~2.3 s
```

| Herramienta | Resuelve | Durabilidad | Ámbito |
|---|---|---|---|
| **Cache** | Leer rápido algo caro que cambia poco | Volátil (se puede perder) | Lecturas |
| **Schedule (cron)** | Hacer algo **cada cierto tiempo** | No aplica | Tiempo |
| **Colas (BullMQ)** | Hacer algo **después**, con reintentos, fuera de la request | **Persistente** (Redis) | Trabajo diferido, entre procesos |
| **Eventos (EventEmitter)** | Avisar "ocurrió X" a otros módulos **en el mismo proceso** | Ninguna (en memoria) | Desacoplar módulos |

```
POST /ordenes  (con esta sesión)
  ├─ guardar orden ...................... 40 ms
  ├─ emit('orden.creada') ────────▶ listener: invalida caché de "más vendidos"
  │                                 listener: queue.add('confirmacion', ...) ──▶ Redis
  └─ respuesta 201 ...................... ~45 ms
                                            Worker (otro proceso) ◀── toma el job,
                                            envía email, reintenta si falla
```

> ❓ **Entrevista**: *"¿Cuándo usarías un evento in-process y cuándo una cola?"* → Evento in-process cuando la reacción es barata, puede perderse sin daño o es parte de la misma unidad de trabajo, y quiero desacoplar módulos. Cola cuando el trabajo es lento, depende de sistemas externos que pueden fallar, necesita **reintentos**, debe sobrevivir a un reinicio o se quiere escalar en workers separados. Si el proceso muere un milisegundo después del `emit`, el evento se pierde; el job en Redis no.

---

## 2. Caching con `@nestjs/cache-manager`

### 2.1 Qué cambió (y por qué verás tutoriales rotos)

`@nestjs/cache-manager` es un wrapper sobre la librería `cache-manager`. Esa librería cambió mucho entre versiones y la mayoría del material en internet quedó obsoleto:

| | cache-manager v4 | cache-manager v5 | **cache-manager v6 (actual, con @nestjs/cache-manager 3)** |
|---|---|---|---|
| Unidad de `ttl` | **segundos** | milisegundos | **milisegundos** |
| Stores | `store: redisStore` | `store: redisStore` (`cache-manager-redis-yet`) | `stores: [Keyv, ...]` (adaptadores **Keyv**) |
| Redis | `cache-manager-redis-store` | `cache-manager-redis-yet` | **`@keyv/redis`** |
| Borrar todo | `reset()` | `reset()` | **`clear()`** |
| Multi-nivel | `multiCaching` | `multiCaching` | array `stores` (L1 → L2) nativo |

> ⚠️ Si copias `CacheModule.register({ store: redisStore, host, port })` de un tutorial, con v6 **no** falla al compilar necesariamente, pero la caché termina en memoria o no funciona. En v6 los stores son instancias de **Keyv** pasadas en `stores`.

### 2.2 Instalación y registro

```bash
npm i @nestjs/cache-manager cache-manager
npm i keyv @keyv/redis cacheable   # Redis + store en memoria LRU
```

```typescript
// src/app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheableMemory } from 'cacheable';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,                          // CACHE_MANAGER inyectable en todos los módulos
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 60_000,                           // ⚠️ MILISEGUNDOS: 60 s por defecto
        stores: [
          // L1: memoria del proceso, LRU acotado (rapidísimo, pero por réplica)
          new Keyv({ store: new CacheableMemory({ ttl: 10_000, lruSize: 5_000 }) }),
          // L2: Redis compartido entre réplicas; namespace = prefijo de claves
          new Keyv({ store: new KeyvRedis(config.getOrThrow('REDIS_URL')), namespace: 'tienda' }),
        ],
      }),
    }),
  ],
})
export class AppModule {}
```

Con varios `stores`, `get` busca en orden (L1 y luego L2) y `set` escribe en todos. Sin `stores`, se usa un store en memoria por defecto.

```
 get('producto:42') ─▶ L1 memoria ──hit──▶ ✅
                          │ miss
                          ▼
                       L2 Redis ──hit──▶ ✅ 
                          │ miss
                          ▼
                     tu código consulta la DB y hace set()
```

> ⚠️ Una caché **solo en memoria** con 3 réplicas detrás de un load balancer = 3 cachés distintas. Invalidar en una réplica no invalida en las otras. Para datos que se invalidan, el L1 debe tener TTL muy corto o no existir.

### 2.3 Uso programático: cache-aside

```typescript
// src/productos/productos.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ProductosService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(Producto) private readonly repo: Repository<Producto>,
  ) {}

  async buscar(id: number): Promise<Producto> {
    const clave = `producto:${id}`;

    const enCache = await this.cache.get<Producto>(clave);
    if (enCache) return enCache;                        // hit

    const producto = await this.repo.findOneBy({ id }); // miss → fuente de verdad
    if (!producto) throw new NotFoundException();

    await this.cache.set(clave, producto, 5 * 60_000);  // ttl por clave, en ms
    return producto;
  }

  // wrap = get + (si no está) ejecutar la función + set, en una sola llamada
  masVendidos(): Promise<Producto[]> {
    return this.cache.wrap('productos:mas-vendidos', () => this.repo.query(SQL_MAS_VENDIDOS), 10 * 60_000);
  }

  async actualizar(id: number, dto: ActualizarProductoDto) {
    const p = await this.repo.save({ id, ...dto });
    await this.cache.del(`producto:${id}`);              // invalidar DESPUÉS de escribir
    return p;
  }
}
```

API de `Cache` en v6: `get`, `set(key, value, ttl?)`, `del`, `clear`, `wrap(key, fn, ttl?)`, `mget`, `mset`, `mdel`, `ttl(key)`.

> ⚠️ Lo que guardas en Redis se **serializa a JSON**. Una entidad de TypeORM vuelve como objeto plano: sin métodos, sin prototipo, y los `Date` vuelven como **strings**. Si luego usas `ClassSerializerInterceptor` (Sesión 21), recuerda que ya no es una instancia. Cachea DTOs, no entidades.

### 2.4 `CacheInterceptor`: cachear respuestas HTTP automáticamente

```typescript
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('categorias')
@UseInterceptors(CacheInterceptor)       // solo cachea peticiones GET
export class CategoriasController {
  @Get()
  @CacheTTL(30_000)                      // ms (en v4 eran segundos)
  listar() { return this.categorias.listar(); }

  @Get('arbol')
  @CacheKey('categorias:arbol')          // clave fija en vez de la URL
  arbol() { return this.categorias.arbol(); }
}
```

Por defecto la clave es la **URL** de la request (con query string). Para cambiarla, extiende el interceptor:

```typescript
@Injectable()
export class CachePorUsuarioInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET') return undefined;           // undefined = no cachear
    const usuario = req.user?.sub ?? 'anon';
    return `${usuario}:${req.originalUrl}`;
  }
}
```

> ⚠️ **Fuga de datos clásica**: `CacheInterceptor` global + `GET /usuarios/me` → la clave es `/usuarios/me` para **todos**, y el segundo usuario recibe el perfil del primero. Nunca caches con la clave por defecto respuestas que dependen del usuario autenticado. Aplica el interceptor solo a recursos públicos o usa un `trackBy` que incluya al usuario.

> ⚠️ `CacheInterceptor` no sirve si el handler usa `@Res()` directamente (Sesión 4): Nest no ve el valor de retorno. Tampoco funciona en resolvers de GraphQL (Sesión 28).

### 2.5 Invalidación: el problema difícil

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

| Estrategia | Cómo | Pros | Contras |
|---|---|---|---|
| **Solo TTL** | Expira sola | Cero código | Datos viejos hasta que expire |
| **Borrar al escribir** | `del(clave)` tras el update | Consistencia rápida | Hay que conocer todas las claves afectadas |
| **Claves versionadas** | `productos:v{N}:lista`; al escribir, `N++` | Invalida "grupos" sin listar claves | Claves viejas quedan hasta su TTL |
| **Por evento** | Listener de `producto.actualizado` hace `del` | Desacopla escritor e invalidación | Más piezas |

```typescript
// Claves versionadas: invalidar TODAS las listas de productos de un golpe
private async versionListas(): Promise<number> {
  return (await this.cache.get<number>('productos:version')) ?? 1;
}

async listar(q: PaginacionQueryDto) {
  const v = await this.versionListas();
  const clave = `productos:v${v}:p${q.pagina}:n${q.porPagina}`;
  return this.cache.wrap(clave, () => this.consultarLista(q), 5 * 60_000);
}

async invalidarListas() {
  const v = await this.versionListas();
  await this.cache.set('productos:version', v + 1, 30 * 24 * 3600_000); // TTL largo explícito (30 días)
}
```

> ⚠️ **Cache stampede**: una clave muy leída expira y 500 requests simultáneas van a la DB a la vez. Mitigaciones: TTL con *jitter* (aleatoriedad), refresco anticipado en background, o un lock para que solo una request recalcule. El `wrap` de cache-manager v6 deduplica llamadas concurrentes **dentro del mismo proceso**, pero no entre réplicas.

> ❓ **Entrevista**: *"¿Qué patrones de caché conoces?"* → **Cache-aside** (la app lee de la caché, si falla lee la DB y llena la caché; el más común), **read-through** (la caché misma carga desde la DB), **write-through** (se escribe en caché y DB a la vez), **write-behind** (se escribe en caché y la DB se actualiza después, con riesgo de pérdida). En Nest con cache-manager lo típico es cache-aside con `wrap` e invalidación explícita o por TTL.

---

## 3. Tareas programadas con `@nestjs/schedule`

```bash
npm i @nestjs/schedule
```

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';
@Module({ imports: [ScheduleModule.forRoot()] })
export class AppModule {}
```

```typescript
// src/carritos/carritos.tasks.ts
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class CarritosTasks {
  private readonly logger = new Logger(CarritosTasks.name);

  constructor(private readonly carritos: CarritosService) {}

  // Formato cron: segundo(opcional) minuto hora día-mes mes día-semana
  @Cron('0 */15 * * * *', { name: 'expirar-carritos' })       // cada 15 minutos
  async expirarCarritos() {
    const n = await this.carritos.expirarAbandonados();
    this.logger.log(`Carritos expirados: ${n}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'reporte-diario', timeZone: 'America/Santiago' })
  async reporteDiario() { /* ... */ }

  @Interval('ping-proveedores', 60_000)                        // cada 60 s desde el arranque
  async pingProveedores() { /* ... */ }

  @Timeout(5_000)                                              // una vez, 5 s tras arrancar
  calentarCache() { /* ... */ }
}
```

### 3.1 Control dinámico con `SchedulerRegistry`

```typescript
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class TareasAdmin {
  constructor(private readonly registry: SchedulerRegistry) {}

  pausarExpiracion() {
    this.registry.getCronJob('expirar-carritos').stop();
  }

  // Crear un cron en runtime (p. ej. desde la configuración de un tenant)
  programarCierreCaja(tenant: string, expresion: string) {
    const job = new CronJob(expresion, () => this.cerrarCaja(tenant), null, false, 'America/Santiago');
    this.registry.addCronJob(`cierre-${tenant}`, job);
    job.start();
  }

  private cerrarCaja(tenant: string) { /* ... */ }
}
```

### 3.2 El problema de las réplicas

```
         ┌── réplica 1: @Cron 03:00 → envía reporte ✉️
 ECS ────┼── réplica 2: @Cron 03:00 → envía reporte ✉️
         └── réplica 3: @Cron 03:00 → envía reporte ✉️      → el gerente recibe 3 emails
```

`@nestjs/schedule` corre **dentro de cada proceso**. No hay coordinación entre réplicas. Opciones:

| Opción | Cómo |
|---|---|
| Job scheduler de BullMQ | Un solo job repetible en Redis; **un** worker lo toma (sección 4.5) |
| Lock distribuido | Redis `SET clave valor NX PX 60000` al inicio del cron; si no obtienes el lock, sales |
| Proceso dedicado | Solo el servicio "scheduler" (1 réplica) importa `ScheduleModule` |
| Scheduler externo | EventBridge Scheduler / Kubernetes CronJob llamando a un endpoint o lanzando una tarea |

> ⚠️ Otros detalles de `@Cron`: si la ejecución dura más que el intervalo, se **solapan** ejecuciones; los providers REQUEST-scoped no están disponibles (no hay request, Sesión 23); y un error no manejado solo se loguea, sin reintento. Envuelve el cuerpo en `try/catch` y usa un flag o lock para evitar solapes.

---

## 4. Colas con BullMQ

### 4.1 Conceptos

**BullMQ** es una librería de colas sobre **Redis**. Un *producer* agrega **jobs** a una **queue**; uno o varios *workers* (en el mismo proceso o en otros) los toman y procesan.

```
 Producer (API)                 Redis                         Workers (N procesos)
 queue.add('bienvenida', {...}) ─▶ [wait] ─▶ [active] ─▶ ✅ completed
                                     ▲          │
                                     │          └─✖─▶ reintento (backoff) ─▶ ... ─▶ ❌ failed
                                  [delayed] (jobs con delay o esperando reintento)
```

Garantía: **at-least-once**. Si un worker muere a mitad de un job, BullMQ lo detecta (lock expirado, job *stalled*) y otro worker lo reprocesa. Consecuencia directa: **tus processors deben ser idempotentes**.

> 💡 `@nestjs/bull` (Bull clásico) está en modo mantenimiento; para proyectos nuevos usa `@nestjs/bullmq`. Las APIs se parecen pero no son iguales: en BullMQ el processor extiende `WorkerHost` e implementa `process()`, en vez de usar `@Process('nombre')` por método.

### 4.2 Instalación y registro

```bash
npm i @nestjs/bullmq bullmq
```

```typescript
// app.module.ts
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
        prefix: 'tienda',                       // prefijo de claves en Redis
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2_000 },   // 2s, 4s, 8s, 16s...
          removeOnComplete: { age: 3600, count: 1000 },     // no llenar Redis con históricos
          removeOnFail: { age: 7 * 24 * 3600 },             // conservar fallidos 7 días para análisis
        },
      }),
    }),
  ],
})
export class AppModule {}

// src/notificaciones/notificaciones.module.ts
@Module({
  imports: [BullModule.registerQueue({ name: 'emails' })],   // forFeature (Sesión 24)
  providers: [EmailsProducer, EmailsProcessor],
  exports: [EmailsProducer],
})
export class NotificacionesModule {}
```

### 4.3 Producer

```typescript
// src/notificaciones/emails.producer.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface ConfirmacionOrdenJob { ordenId: number; email: string; }

@Injectable()
export class EmailsProducer {
  constructor(@InjectQueue('emails') private readonly emails: Queue) {}

  async confirmacionOrden(data: ConfirmacionOrdenJob) {
    await this.emails.add('confirmacion-orden', data, {
      jobId: `confirmacion-orden-${data.ordenId}`,   // deduplicación: mismo id → no se encola dos veces
      priority: 1,                                    // menor número = mayor prioridad
    });
  }

  async recordatorioCarrito(usuarioId: number) {
    await this.emails.add('recordatorio-carrito', { usuarioId }, { delay: 24 * 3600_000 }); // en 24 h
  }
}
```

> ⚠️ Pasa **IDs**, no objetos completos: `{ ordenId }` en vez de la orden entera. El job se procesa quizá minutos después y el worker debe leer el estado **actual**; además los datos viajan y se guardan en Redis (tamaño, datos personales).

### 4.4 Processor (worker)

```typescript
// src/notificaciones/emails.processor.ts
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';

@Processor('emails', { concurrency: 5, limiter: { max: 20, duration: 1_000 } }) // ≤20 jobs/s
export class EmailsProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailsProcessor.name);

  constructor(
    private readonly ordenes: OrdenesService,
    private readonly notificaciones: NotificacionesService,
  ) {
    super();
  }

  // Un solo método para todos los jobs de la cola: se distingue por job.name
  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'confirmacion-orden':
        return this.confirmacion(job as Job<ConfirmacionOrdenJob>);
      case 'recordatorio-carrito':
        return this.recordatorio(job);
      default:
        throw new UnrecoverableError(`Job desconocido: ${job.name}`); // no reintentar
    }
  }

  private async confirmacion(job: Job<ConfirmacionOrdenJob>) {
    const orden = await this.ordenes.buscar(job.data.ordenId);
    if (!orden) throw new UnrecoverableError('Orden inexistente');   // reintentar no ayuda

    if (orden.confirmacionEnviadaEn) return { omitido: true };       // IDEMPOTENCIA

    await job.updateProgress(50);
    await this.notificaciones.enviar(job.data.email, 'Orden confirmada', `Tu orden #${orden.id}...`);
    await this.ordenes.marcarConfirmacionEnviada(orden.id);
    return { enviado: true };                                         // queda en job.returnvalue
  }

  private async recordatorio(job: Job) { /* ... */ }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} (${job.name}) falló intento ${job.attemptsMade}: ${error.message}`);
  }
}
```

Puntos clave:
- Lanzar un error → el job se **reintenta** según `attempts`/`backoff`. `UnrecoverableError` → falla definitivamente sin reintentar.
- `concurrency` = cuántos jobs procesa **este** worker en paralelo (en el mismo event loop: ideal para I/O, no para CPU).
- El processor es un provider normal: puede inyectar servicios singleton. Los REQUEST-scoped no están disponibles directamente (usa `ModuleRef.resolve` con un `contextId`, Sesión 23).

> ⚠️ **Trabajo CPU-intensivo** (generar PDFs grandes, procesar imágenes) en un worker con `concurrency: 5` bloquea el event loop del proceso, y si es el mismo proceso de la API, **bloquea la API**. Pon esos workers en un proceso separado o usa *sandboxed processors* de BullMQ (archivo aparte ejecutado en un proceso hijo).

### 4.5 Jobs repetibles: el cron distribuido

```typescript
// Se ejecuta UNA vez en todo el clúster, sin importar cuántas réplicas haya
@Injectable()
export class ReportesScheduler implements OnApplicationBootstrap {
  constructor(@InjectQueue('reportes') private readonly reportes: Queue) {}

  async onApplicationBootstrap() {
    // upsert: idempotente; llamarlo en cada arranque/réplica no crea duplicados
    await this.reportes.upsertJobScheduler(
      'reporte-diario-ventas',
      { pattern: '0 0 8 * * *', tz: 'America/Santiago' },    // 08:00 todos los días
      { name: 'ventas-diarias', data: {} },
    );
  }
}
```

### 4.6 Procesos separados: API y worker

```typescript
// src/worker.ts — mismo código, otro entrypoint, sin servidor HTTP
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();       // en SIGTERM, el worker termina el job actual y cierra (Sesión 24)
}
bootstrap();
```

```
 ┌──────────────┐    add()     ┌───────┐   process()   ┌──────────────────┐
 │ API (x3)     │ ───────────▶ │ Redis │ ◀──────────── │ Worker (x2..x10) │
 │ AppModule    │              └───────┘               │ WorkerModule     │
 └──────────────┘                                      └──────────────────┘
   escala por tráfico HTTP                               escala por largo de la cola
```

`WorkerModule` importa los processors; `AppModule` solo registra las colas (producers). Así escalas cada uno por su métrica: la API por latencia/CPU, los workers por **jobs en espera**.

> ❓ **Entrevista**: *"¿Cómo garantizas que un email no se envíe dos veces si BullMQ reprocesa un job?"* → No se puede garantizar *exactly-once* en la entrega; se diseña *at-least-once* + **idempotencia**: `jobId` determinista para no encolar duplicados, y en el processor verificar un estado persistido (p. ej. `confirmacionEnviadaEn`) antes del efecto y marcarlo después. Si el proveedor de email acepta una *idempotency key*, se la paso también.

> ⚠️ **Dual write**: `await repo.save(orden); await queue.add(...)`. Si el proceso muere entre ambas líneas, la orden existe y el job nunca se encola. Si lo haces al revés, el job puede correr antes del commit. La solución robusta es el **patrón outbox** (guardar el "mensaje" en la misma transacción que la orden y publicarlo después), que se ve en las Sesiones 29–30.

> 💡 Para observar colas en desarrollo/operación: **Bull Board** (`@bull-board/nestjs` + `@bull-board/api`) da una UI con jobs en espera, activos, fallidos y permite reintentar. Protégela con autenticación.

---

## 5. Eventos in-process con `@nestjs/event-emitter`

```bash
npm i @nestjs/event-emitter
```

```typescript
// app.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,        // permite 'orden.*'
      delimiter: '.',
      maxListeners: 20,
    }),
  ],
})
export class AppModule {}
```

### 5.1 Emitir

```typescript
// src/ordenes/eventos/orden-creada.event.ts
export class OrdenCreadaEvent {
  static readonly nombre = 'orden.creada';
  constructor(
    public readonly ordenId: number,
    public readonly usuarioId: number,
    public readonly email: string,
    public readonly total: number,
  ) {}
}

// src/ordenes/ordenes.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrdenesService {
  constructor(private readonly eventos: EventEmitter2, /* ... */) {}

  async crear(usuario: UsuarioActual, dto: CrearOrdenDto) {
    const orden = await this.guardarEnTransaccion(usuario, dto);   // commit primero
    this.eventos.emit(OrdenCreadaEvent.nombre,
      new OrdenCreadaEvent(orden.id, usuario.id, usuario.email, orden.total));
    return orden;
  }
}
```

`OrdenesModule` ya no conoce a `NotificacionesModule`, ni a la caché, ni a Fidelidad: solo anuncia un hecho. Esto también rompe dependencias circulares (Sesión 23).

### 5.2 Escuchar

```typescript
// src/notificaciones/listeners/orden-creada.listener.ts
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class OrdenCreadaListener {
  constructor(
    private readonly emails: EmailsProducer,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // async: true → el listener corre de forma asíncrona (no bloquea a quien emite)
  @OnEvent(OrdenCreadaEvent.nombre, { async: true })
  async encolarConfirmacion(evento: OrdenCreadaEvent) {
    await this.emails.confirmacionOrden({ ordenId: evento.ordenId, email: evento.email });
  }

  @OnEvent('orden.*')                         // wildcard: creada, pagada, cancelada...
  async invalidarMasVendidos() {
    await this.cache.del('productos:mas-vendidos');
  }
}
```

### 5.3 Semántica que debes conocer

| Aspecto | Comportamiento |
|---|---|
| `emit()` | Síncrono: invoca los listeners y **no espera** sus promesas; devuelve `boolean` |
| `emitAsync()` | Devuelve una promesa con los resultados de los listeners: puedes `await`-earla |
| Errores en listeners | Por defecto se **suprimen** (opción `suppressErrors` de `@OnEvent`, `true` por defecto): se pierden en silencio si no los logueas |
| Durabilidad | **Ninguna**: si el proceso cae, los eventos en curso se pierden |
| Alcance | Solo el **proceso actual**: otras réplicas no se enteran |
| Registro | Los listeners se registran en `onApplicationBootstrap` (con `DiscoveryService`, Sesión 24) |

> ⚠️ Un `emit()` dentro de `onModuleInit` se **pierde**: los listeners aún no están registrados. Si necesitas emitir en el arranque, espera con `EventEmitterReadinessWatcher`: `await this.readinessWatcher.waitUntilReady()`.

> ⚠️ Emitir **dentro** de una transacción que luego hace rollback: los listeners ya reaccionaron (email encolado, caché invalidada) a algo que no ocurrió. Emite **después del commit**.

> ⚠️ `@OnEvent` en un provider REQUEST-scoped no recibe "la request" que originó el evento. Mantén los listeners singleton y pasa en el payload del evento todo lo que necesiten.

> ❓ **Entrevista**: *"¿`@nestjs/event-emitter` sirve para comunicar microservicios?"* → No. Es un `EventEmitter2` en memoria del proceso: sin persistencia, sin reintentos, sin entrega entre réplicas. Sirve para desacoplar módulos dentro de un monolito modular. Entre servicios se usa un broker (RabbitMQ, Kafka, NATS, SNS/SQS) con los transports de microservicios (Sesión 29) o, para trabajo interno, una cola como BullMQ.

---

## 6. Juntándolo todo en TiendaApi

```
 POST /api/v1/ordenes
   OrdenesService.crear()
     ├─ transacción: guardar orden + items, descontar stock  (Sesión 17)
     ├─ commit
     └─ emit('orden.creada')  ───────────────┐
                                             ▼
   OrdenCreadaListener (async) ── queue.add('confirmacion-orden', { ordenId }, { jobId })
   CacheListener ('orden.*')  ── cache.del('productos:mas-vendidos')
                                             │
                                          Redis (BullMQ)
                                             ▼
   EmailsProcessor (proceso worker) ── lee orden actual ── idempotente ── envía ── marca enviada
                                                               └─ falla → backoff exponencial x5

 GET /api/v1/productos/mas-vendidos ── cache.wrap(..., 10 min) ── DB solo en miss
 Job scheduler BullMQ 08:00 ── 'ventas-diarias' ── 1 sola ejecución en el clúster
 @Cron cada 15 min ── expirar carritos (con lock Redis porque hay 3 réplicas)
```

| Pregunta | Respuesta |
|---|---|
| ¿Es una lectura cara y repetida? | **Cache** (con estrategia de invalidación) |
| ¿Tiene que pasar a una hora/intervalo? | **Cron** si es 1 instancia o idempotente con lock; **job scheduler de BullMQ** si hay réplicas |
| ¿Es lento, externo, reintentable o debe sobrevivir a un reinicio? | **Cola** |
| ¿Es "avisar a otros módulos" dentro del proceso? | **Evento** (y si la reacción es importante, el listener encola un job) |

---

## Resumen mental de la sesión

```
Sacar trabajo del camino crítico: cache (leer) · cron (tiempo) · cola (después, durable) · evento (avisar)

@nestjs/cache-manager 3 = cache-manager v6 + Keyv
  ttl en MILISEGUNDOS (v4 eran segundos) · stores: [Keyv L1 memoria, Keyv(@keyv/redis) L2]
  reset() → clear() · redisStore/cache-manager-redis-yet → @keyv/redis
  @Inject(CACHE_MANAGER) cache: Cache → get/set(k,v,ttl)/del/clear/wrap
  CacheInterceptor: solo GET, clave = URL → ⚠️ fuga con datos por usuario (trackBy)
  Invalidación: TTL · del al escribir · claves versionadas · por evento; stampede → jitter/lock
  Redis serializa JSON: sin prototipo, Date → string

@nestjs/schedule: ScheduleModule.forRoot() · @Cron(expr, {name, timeZone}) · @Interval · @Timeout
  SchedulerRegistry (stop/addCronJob) · corre en CADA réplica → lock o job scheduler BullMQ

@nestjs/bullmq: BullModule.forRoot({connection, defaultJobOptions}) · registerQueue({name})
  @InjectQueue('x') Queue.add(nombre, {ids}, {jobId, attempts, backoff, delay, priority})
  @Processor('x', {concurrency, limiter}) extends WorkerHost → process(job) switch(job.name)
  throw → reintento · UnrecoverableError → falla final · @OnWorkerEvent('failed')
  at-least-once ⇒ IDEMPOTENCIA · upsertJobScheduler = cron distribuido
  worker en proceso aparte: createApplicationContext · dual write → outbox

@nestjs/event-emitter: EventEmitterModule.forRoot({wildcard}) · EventEmitter2.emit/emitAsync
  @OnEvent('orden.creada', {async:true}) · errores suprimidos por defecto
  en memoria, un proceso, sin reintentos · emitir DESPUÉS del commit · no en onModuleInit
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué cambió en `@nestjs/cache-manager` 3 / cache-manager v6 respecto a v5? ¿Cómo configuras Redis ahora?
2. ❓ ¿En qué unidad está el `ttl` en v6 y qué pasaba en v4?
3. ❓ Explica cache-aside y cómo lo implementas con `wrap`.
4. ❓ ¿Qué riesgo tiene aplicar `CacheInterceptor` globalmente en una API con autenticación?
5. ❓ ¿Qué estrategias de invalidación conoces? ¿Qué es un cache stampede y cómo lo mitigas?
6. ❓ ¿Qué pasa con un `@Cron` cuando la app corre con 3 réplicas? Da tres soluciones.
7. ❓ ¿Qué garantías de entrega da BullMQ? ¿Qué implica para el diseño del processor?
8. ❓ ¿Cómo se configuran reintentos con backoff? ¿Cuándo lanzarías `UnrecoverableError`?
9. ❓ ¿Por qué pasar IDs y no objetos completos en el payload de un job?
10. ❓ ¿Por qué separar el worker de la API en otro proceso? ¿Cómo escalas cada uno?
11. ❓ `emit` vs `emitAsync`. ¿Qué pasa con los errores de un listener y con un `emit` en `onModuleInit`?
12. ❓ ¿Cuándo usas un evento in-process, cuándo una cola y cuándo un broker entre servicios?

## Ejercicio práctico
1. Levanta Redis con `docker run -d -p 6379:6379 redis:7-alpine`.
2. Registra `CacheModule.registerAsync` con dos stores (`CacheableMemory` L1 y `@keyv/redis` L2, namespace `tienda`). Verifica con `redis-cli KEYS 'tienda*'` que se escriben claves.
3. Implementa cache-aside en `ProductosService.buscar` e invalidación en `actualizar`. Mide la latencia con y sin caché.
4. Implementa `masVendidos()` con `wrap` y las claves versionadas para las listas paginadas.
5. Aplica `CacheInterceptor` a `GET /usuarios/me` y **demuestra la fuga** con dos tokens distintos; arréglala con `CachePorUsuarioInterceptor` o quitando el interceptor.
6. Crea `CarritosTasks` con un `@Cron` cada minuto y levanta dos instancias de la app (puertos distintos): observa la ejecución duplicada y agrega un lock con `SET NX PX`.
7. Crea la cola `emails` con BullMQ: producer con `jobId` determinista y processor con `WorkerHost`, `attempts: 5` y backoff exponencial. Haz que `NotificacionesService` falle aleatoriamente y observa los reintentos en logs.
8. Haz el processor idempotente (`confirmacionEnviadaEn`) y verifica que encolar dos veces la misma orden no envía dos emails.
9. Mueve el processor a `src/worker.ts` con `createApplicationContext` y córrelo como proceso separado.
10. Reemplaza el `@Cron` del reporte diario por `upsertJobScheduler` y verifica que con dos réplicas corre una sola vez.
11. Emite `orden.creada` desde `OrdenesService` (después del commit) y crea dos listeners: uno que encola el email y otro (`orden.*`) que invalida la caché. Lanza un error en un listener y comprueba que el `POST /ordenes` responde igual (y que necesitas loguearlo tú).

---

➡️ **Cuando termines**, marca la Sesión 25 en el [README](README.md) y pasa a la **Sesión 26 — Archivos: uploads, streaming, S3, Server-Sent Events y compresión**.
