# Sesión 33 — Performance: Fastify, event loop, profiling, memory leaks, clustering

> **Objetivo de la sesión**: dejar de optimizar "a ojo". Al terminar deberías poder explicar **dónde** se va el tiempo en una API Nest, por qué **bloquear el event loop** es el pecado capital de Node, medir con **load testing** y percentiles, perfilar CPU con flame graphs, cazar un **memory leak** con heap snapshots, decidir cuándo cambiar a **Fastify**, cuándo usar **worker threads** y cuándo escalar con **cluster** vs más contenedores, y reconocer los costos propios de Nest (request scope, validación, serialización).

---

## 1. Metodología: medir antes de tocar

> "La optimización prematura es la raíz de todos los males" — pero la frase completa de Knuth dice que no debemos dejar pasar ese **3% crítico**. El trabajo senior es encontrar ese 3% con datos.

El ciclo:

```
  1. Definir objetivo  ──▶  "p99 de GET /productos < 150 ms a 500 req/s"
  2. Medir baseline    ──▶  load test reproducible (autocannon / k6)
  3. Perfilar          ──▶  ¿CPU? ¿I/O? ¿GC? ¿locks en DB?
  4. Cambiar UNA cosa  ──▶  la hipótesis más barata con mayor impacto
  5. Medir de nuevo    ──▶  ¿mejoró el percentil objetivo? si no, revertir
```

### 1.1 Latencia vs throughput, y por qué el promedio miente

| Concepto | Qué mide |
|---|---|
| **Throughput** | Requests por segundo que el sistema completa |
| **Latencia** | Tiempo de una request (se reporta en **percentiles**) |
| **p50** | La mitad de las requests tardan menos que esto |
| **p99** | 1 de cada 100 tarda más que esto: la experiencia de tus usuarios más activos |

Un promedio de 80 ms puede esconder un p99 de 3 s. Si una página hace 20 llamadas a la API, la probabilidad de que al menos una caiga en el peor 1% es `1 - 0.99^20 ≈ 18%`.

### 1.2 ¿Dónde se va el tiempo en una API típica?

```
 GET /ordenes/123  (total 120 ms)
 ├── red + TLS (ALB)            ~5 ms
 ├── Nest: middleware/guards    ~1 ms
 ├── validación + pipes         <1 ms
 ├── query a Postgres           ~95 ms   ◀── casi siempre el cuello de botella
 ├── serialización JSON         ~3 ms
 └── logging                    ~1 ms
```

En la mayoría de las APIs de negocio el cuello de botella es **I/O**: base de datos (N+1, índices faltantes, Sesión 17), llamadas a otros servicios, falta de caché (Sesión 25). Cambiar Express por Fastify no arregla una query sin índice.

> ❓ **Entrevista**: *"La API está lenta. ¿Qué haces primero?"* → No toco código. Miro métricas (¿es una ruta o todas? ¿desde cuándo? ¿correlaciona con tráfico o con un deploy?), luego una traza de una request lenta (Sesión 32) para ver qué span domina. Si es DB, `EXPLAIN ANALYZE`; si es CPU en Node, perfil con flame graph; si es GC, métricas de heap. Solo entonces formulo una hipótesis y la mido.

---

## 2. El event loop: el recurso más escaso

Node ejecuta **tu JavaScript en un solo hilo**. El I/O (red, disco, DNS en parte) se delega a libuv y al sistema operativo; cuando termina, su callback vuelve a la cola del event loop.

```
   ┌───────────────────────────┐
┌─▶│          timers           │  setTimeout / setInterval
│  ├───────────────────────────┤
│  │     pending callbacks     │
│  ├───────────────────────────┤
│  │           poll            │  ◀── llegan conexiones y datos de sockets
│  ├───────────────────────────┤
│  │           check           │  setImmediate
│  ├───────────────────────────┤
└──│      close callbacks      │
   └───────────────────────────┘
  (entre cada callback: process.nextTick y microtasks de Promises)
```

Mientras tu código ejecuta algo síncrono, **ninguna otra request avanza**: ni la que ya tenía su respuesta de la DB lista, ni los health checks. Si un endpoint tarda 200 ms de CPU pura, con 10 requests simultáneas la última espera 2 s.

### 2.1 Qué bloquea el event loop en una app Nest

| Culpable | Ejemplo | Alternativa |
|---|---|---|
| Crypto síncrono | `bcrypt.hashSync`, `crypto.pbkdf2Sync` | Versiones async (usan el threadpool de libuv) |
| JSON gigante | `JSON.parse` de un body de 50 MB | Límite de body + streaming (Sesión 26) |
| Transformaciones masivas | `plainToInstance` de 100 000 filas | Paginar; proyectar en la query |
| Regex catastrófica (ReDoS) | `/^(a+)+$/` con input malicioso | Regex lineales, validar longitud antes |
| fs síncrono | `readFileSync` en un handler | `fs/promises` o leer al arrancar |
| Cálculo pesado | Generar un PDF / reporte / imagen | Worker threads o cola (BullMQ) |
| Loops "inocentes" | `array.find` dentro de `array.map` (O(n²)) | `Map` indexado |

```ts
// ❌ ReDoS: backtracking exponencial. Un email de 30 caracteres raros congela el proceso
const EMAIL_MALO = /^([a-zA-Z0-9]+)*@dominio\.cl$/;

// ✅ Valida longitud ANTES de cualquier regex y usa patrones sin cuantificadores anidados
@IsEmail()
@MaxLength(254)
email!: string;
```

> ⚠️ `async` **no** significa "no bloqueante". Una función `async` que hace un `for` de 10 millones de iteraciones bloquea igual: `async` solo cambia el valor de retorno a una Promise. Lo único que libera el event loop es **esperar I/O** o mover el trabajo a otro hilo.

### 2.2 Medir el lag del event loop

```ts
// src/perf/event-loop.monitor.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

@Injectable()
export class EventLoopMonitor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventLoopMonitor.name);
  private readonly histograma = monitorEventLoopDelay({ resolution: 20 });
  private intervalo?: NodeJS.Timeout;
  private eluAnterior = performance.eventLoopUtilization();

  onModuleInit() {
    this.histograma.enable();
    this.intervalo = setInterval(() => {
      const elu = performance.eventLoopUtilization(this.eluAnterior);
      this.eluAnterior = performance.eventLoopUtilization();
      this.logger.log({
        lagP99Ms: this.histograma.percentile(99) / 1e6,   // viene en nanosegundos
        utilizacion: Number(elu.utilization.toFixed(2)),  // 0..1: fracción del tiempo ocupado
      }, 'event loop');
      this.histograma.reset();
    }, 10_000);
    this.intervalo.unref();     // no impide que el proceso termine
  }

  onModuleDestroy() {
    clearInterval(this.intervalo);
    this.histograma.disable();
  }
}
```

`collectDefaultMetrics` de prom-client (Sesión 32) ya expone `nodejs_eventloop_lag_*`: grafícalo siempre. Un lag p99 sostenido > 50–100 ms indica CPU saturado o código bloqueante.

> ❓ **Entrevista**: *"¿Qué es Event Loop Utilization (ELU) y por qué es mejor que el % de CPU?"* → ELU es la fracción del tiempo en que el event loop estuvo ocupado ejecutando callbacks vs esperando I/O. El % de CPU del proceso incluye hilos de libuv y del GC; un proceso puede mostrar 60% de CPU con el loop saturado al 100%. ELU mide directamente el recurso que se agota en Node.

---

## 3. Fastify: cuándo y cómo

Nest es agnóstico del servidor HTTP: `@nestjs/platform-express` (default) o `@nestjs/platform-fastify`. Fastify tiene menos overhead por request (router basado en radix tree, serialización y hooks optimizados). En benchmarks "hello world" suele manejar bastante más req/s que Express; en una API real dominada por DB la diferencia se diluye mucho. Úsalo cuando el perfil muestre overhead del framework, o en servicios de alto volumen y lógica liviana (gateway, BFF).

### 3.1 Migrar TiendaApi

```bash
npm i @nestjs/platform-fastify
npm i @fastify/helmet @fastify/compress @fastify/multipart   # equivalentes de los middleware de Express
```

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,          // estamos detrás de un ALB: respeta X-Forwarded-*
      bodyLimit: 1_048_576,      // 1 MB: protege el event loop de JSON gigantes
    }),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));

  // Los plugins de Fastify se registran con app.register, no con app.use
  await app.register(helmet);

  app.enableShutdownHooks();
  // ⚠️ Fastify escucha por defecto solo en 127.0.0.1: en Docker nadie te alcanzaría
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
```

### 3.2 Qué cambia

| Tema | Express | Fastify |
|---|---|---|
| Tipos de `@Req()` / `@Res()` | `Request` / `Response` de express | `FastifyRequest` / `FastifyReply` |
| Middleware Express de terceros | Directo con `app.use` | Algunos funcionan vía `@fastify/middie`; mejor usar el plugin nativo |
| Middleware de Nest (`NestMiddleware`) | Recibe `req`/`res` de Express | Recibe los objetos **crudos** de Node (`IncomingMessage` / `ServerResponse`) |
| Helmet / compresión | `helmet`, `compression` | `@fastify/helmet`, `@fastify/compress` |
| Uploads (`FileInterceptor`, Multer) | ✅ | ❌ Multer no aplica: `@fastify/multipart` (Sesión 26) |
| Host por defecto en `listen` | Todas las interfaces | `127.0.0.1` → pasa `'0.0.0.0'` |
| Ruta de la request en métricas | `req.route.path` | `request.routeOptions.url` (en un hook `onResponse`) |

> ⚠️ Si tu código usa `@Res()` con métodos de Express (`res.status(201).json(...)`), se rompe al migrar. Por eso la regla de la Sesión 4: evita `@Res()`; si lo necesitas, usa `@Res({ passthrough: true })` y deja que Nest envíe la respuesta. El código que no toca el objeto de la plataforma migra gratis.

> ❓ **Entrevista**: *"¿Migrarías a Fastify para mejorar la latencia?"* → Solo si el perfil muestra que el overhead HTTP/framework es significativo. En una API que pasa 90% del tiempo en Postgres, Fastify mejora el throughput máximo por instancia pero casi no mueve el p99. Primero DB, caché e I/O; después el framework. Y evalúo el costo: middleware de Express, Multer y código con `@Res()` que hay que migrar.

---

## 4. Costos propios de Nest

### 4.1 Providers `Scope.REQUEST`

Con un provider request-scoped, Nest crea **una instancia nueva por request de él y de toda su cadena de dependientes** (el scope "burbujea" hacia arriba, Sesión 23): controllers, servicios, repositorios... por cada request.

```
 Singleton:  [OrdenesController] ─▶ [OrdenesService] ─▶ [Repo]      (1 vez al arrancar)
 REQUEST:    [OrdenesController] ─▶ [OrdenesService] ─▶ [TenantCtx*] (N veces: una por request)
                     ▲ también se vuelve request-scoped por depender de TenantCtx
```

Más asignaciones, más trabajo de GC, más latencia. Alternativas: `AsyncLocalStorage` / `nestjs-cls` para contexto por request, o **durable providers** (`ContextIdFactory` con estrategia por tenant) para reutilizar el subárbol por tenant.

### 4.2 Validación y serialización

- `ValidationPipe` con `transform: true` ejecuta `plainToInstance` + `validate` de class-validator: basado en reflexión y decoradores, cómodo pero no gratis. Para bodies normales es despreciable; para arrays de miles de items se nota.
- `ClassSerializerInterceptor` (Sesión 21) recorre y transforma **cada objeto** de la respuesta con `instanceToPlain`. En un listado de 5 000 entidades anidadas puede costar decenas de ms de CPU.

```ts
// ✅ En rutas calientes, proyecta en la query y devuelve objetos planos ya con la forma del DTO
async listar(page: number, size: number): Promise<ProductoListadoDto[]> {
  return this.repo
    .createQueryBuilder('p')
    .select(['p.id AS id', 'p.nombre AS nombre', 'p.precio AS precio'])
    .orderBy('p.id')
    .offset((page - 1) * size)
    .limit(size)
    .getRawMany();      // sin hidratar entidades ni pasar por class-transformer
}
```

> 💡 Con Fastify puedes declarar un **JSON Schema de respuesta** y Fastify usa `fast-json-stringify`, más rápido que `JSON.stringify` y que además actúa como allowlist de campos. En Nest esto requiere acceder a la configuración de rutas de Fastify; se usa en rutas muy calientes, no por defecto.

### 4.3 Tiempo de arranque

Un grafo de DI grande (cientos de providers) y muchos módulos dinámicos con `forRootAsync` alargan el arranque. Importa en contenedores con autoscaling y es **crítico** en Lambda (Sesión 34). Herramientas: `LazyModuleLoader` para cargar módulos pesados bajo demanda, y bundling (webpack/esbuild) para reducir la resolución de miles de archivos en `node_modules`.

---

## 5. Trabajo CPU-bound: worker threads

Para lo que realmente es CPU (reportes, imágenes, compresión, cálculo), sácalo del hilo principal.

| Opción | Cuándo |
|---|---|
| **Worker threads** (`node:worker_threads`, `piscina`) | Resultado necesario en la misma request, trabajo de ms a pocos segundos |
| **Cola** (BullMQ, Sesión 25) | Puede ser asíncrono para el usuario ("te enviaremos el reporte"), reintentos, trabajos largos |
| **Otro servicio** / lenguaje | CPU intensivo sostenido (ML, video) |

```ts
// src/reportes/workers/reporte.worker.ts — corre en OTRO hilo, sin acceso al contenedor de Nest
interface Tarea { ordenes: { id: string; total: number; creadaEn: string }[] }

export default function generarCsv({ ordenes }: Tarea): string {
  const lineas = ['id,total,creada_en'];
  for (const o of ordenes) lineas.push(`${o.id},${o.total},${o.creadaEn}`);
  return lineas.join('\n');
}
```

```ts
// src/reportes/reportes.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { resolve } from 'node:path';
import Piscina from 'piscina';     // pool de worker threads (requiere esModuleInterop)

@Injectable()
export class ReportesService implements OnModuleDestroy {
  // Crear un worker cuesta decenas de ms y memoria: se reutilizan en un POOL
  private readonly pool = new Piscina({
    filename: resolve(__dirname, 'workers/reporte.worker.js'),   // el .js compilado
    maxThreads: 2,
  });

  generarCsv(ordenes: { id: string; total: number; creadaEn: string }[]): Promise<string> {
    return this.pool.run({ ordenes });   // el event loop principal queda libre
  }

  async onModuleDestroy() {
    await this.pool.destroy();
  }
}
```

> ⚠️ Los datos se pasan al worker con *structured clone* (copia). Enviar 200 MB de datos a un worker puede costar más que el cálculo. Pasa lo mínimo (ids, parámetros) o usa `SharedArrayBuffer`/transferables para binarios. Y si usas webpack para el build (monorepo, Sesión 31), el archivo del worker debe emitirse como entrada separada.

---

## 6. Load testing

```bash
# autocannon: rápido para Node, ideal para comparar antes/después
npx autocannon -c 100 -d 30 -p 1 http://localhost:3000/productos
#   -c conexiones concurrentes · -d duración (s) · -p pipelining
```

```js
// k6: escenarios realistas, umbrales que fallan el CI
// k6 run carga-ordenes.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // rampa
    { duration: '3m', target: 200 },   // carga sostenida
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<300'],  // falla si p99 >= 300 ms
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/productos?page=1&size=20`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

> ⚠️ Errores comunes al hacer load testing: correr la herramienta en la **misma máquina** que la app (compiten por CPU), probar en modo `start:dev` con watch y `pino-pretty`, olvidar el *warm-up* (JIT de V8, pools de conexiones), probar contra una DB vacía (las queries con 10 filas siempre son rápidas) y medir solo el promedio.

---

## 7. Profiling de CPU

### 7.1 Herramientas

| Herramienta | Uso |
|---|---|
| `node --cpu-prof dist/main.js` | Escribe un `.cpuprofile` al salir; ábrelo en Chrome DevTools (pestaña Performance) |
| `node --inspect dist/main.js` | Conecta Chrome DevTools (`chrome://inspect`) y graba un perfil en vivo |
| `0x` | Genera un **flame graph** interactivo: `npx 0x -- node dist/main.js` |
| Clinic.js (`doctor`, `flame`, `bubbleprof`) | Diagnóstico guiado (CPU vs I/O vs GC). Verifica su estado de mantenimiento con tu versión de Node |
| Profilers continuos (Datadog, Pyroscope/Grafana) | Perfiles en **producción** con bajo overhead |

### 7.2 Leer un flame graph

```
 ┌───────────────────────────────────────────────────────────────┐
 │                          main loop                            │
 ├───────────────────────────────────┬───────────────────────────┤
 │        RouterExecutionContext     │        pg: parse rows     │
 ├──────────────────┬────────────────┤                           │
 │  ValidationPipe  │ calcularDescto │                           │
 │                  ├────────────────┤                           │
 │                  │  regex.exec ███│ ◀── ancho = tiempo de CPU │
 └──────────────────┴────────────────┴───────────────────────────┘
```

- **Eje X**: proporción del tiempo de CPU (no es cronológico).
- **Eje Y**: profundidad del stack.
- Busca las **mesetas anchas** en la parte superior: funciones que consumen CPU propia.

Flujo: levanta la app con `0x` o `--cpu-prof`, dispara carga con autocannon sobre la ruta sospechosa, detén la app y abre el perfil.

---

## 8. Memoria y memory leaks

### 8.1 Cómo usa memoria Node

- **Heap de V8**: *new space* (objetos jóvenes, GC frecuente y barato) y *old space* (objetos que sobreviven; GC mark-sweep-compact más caro).
- **Fuera del heap**: `Buffer`s, memoria nativa de addons → cuentan en el RSS pero no en `heapUsed`.
- `process.memoryUsage()` → `rss`, `heapTotal`, `heapUsed`, `external`, `arrayBuffers`.

```bash
# Límite del old space (MB). Déjalo por debajo del límite del contenedor
# para dejar espacio a buffers, stacks y memoria nativa (~75% es un punto de partida común)
node --max-old-space-size=768 dist/main.js      # contenedor con 1 GB
```

> ⚠️ Si el heap llega al límite, V8 pasa cada vez más tiempo en GC (la latencia se dispara) y luego el proceso muere con `FATAL ERROR: Reached heap limit`. Si el **contenedor** llega a su límite antes, el kernel lo mata con **OOMKilled** (exit code 137) sin stack trace.

### 8.2 Leaks típicos en apps Nest

Un leak en Node es memoria que sigue **alcanzable** desde una raíz (normalmente un singleton o un módulo) aunque ya no la necesites. Como los providers por defecto son **singletons que viven toda la vida del proceso**, cualquier colección que crece dentro de ellos es sospechosa.

```ts
// ❌ 1. Caché sin límite en un singleton: crece con cada producto distinto consultado
@Injectable()
export class PreciosService {
  private readonly cache = new Map<string, Precio>();   // nunca se borra nada
}

// ✅ Caché acotada con TTL (o cache-manager/Redis, Sesión 25)
import { LRUCache } from 'lru-cache';
private readonly cache = new LRUCache<string, Precio>({ max: 5_000, ttl: 60_000 });
```

```ts
// ❌ 2. Listener registrado por request: nunca se remueve
@Get('stream')
stream(@Req() req: Request) {
  this.eventos.on('orden.creada', (o) => { /* usa req ... */ }); // retiene req para siempre
}
// Síntoma: "MaxListenersExceededWarning: Possible EventEmitter memory leak detected"
// ✅ Remueve el listener cuando el cliente se desconecta (req.on('close', ...)),
//    o usa SSE con Observables que se completan (Sesión 26)
```

```ts
// ❌ 3. Suscripción RxJS eterna en un provider
onModuleInit() {
  this.precios$.subscribe((p) => this.ultimos.push(p));  // array que crece + suscripción viva
}
// ✅ Guarda la Subscription y haz unsubscribe() en onModuleDestroy; no acumules sin límite
```

Otros clásicos: guardar el `request` o el usuario en una propiedad de un singleton (además de leak, es un **bug de seguridad**: mezcla datos entre usuarios), `setInterval` sin `clearInterval`, closures capturando objetos grandes, y registrar métricas con labels de alta cardinalidad (Sesión 32).

### 8.3 Cazar un leak con heap snapshots

```bash
# Permite pedir un snapshot en caliente enviando una señal
node --heapsnapshot-signal=SIGUSR2 dist/main.js
kill -USR2 <pid>          # escribe Heap.<fecha>.<pid>...heapsnapshot en el cwd
```

```ts
// O desde código (endpoint interno de diagnóstico, NUNCA público)
import { writeHeapSnapshot } from 'node:v8';
const archivo = writeHeapSnapshot();   // ⚠️ bloquea el proceso mientras escribe (segundos)
```

Técnica de los **tres snapshots**:
1. Arranca, calienta y toma el snapshot **A**.
2. Aplica carga (autocannon 5 min) y toma **B**.
3. Repite la carga y toma **C**.
4. En Chrome DevTools → Memory, carga los tres y usa la vista **Comparison** (C vs B): los constructores cuyo `# Delta` crece de forma sostenida son los sospechosos. En la vista **Retainers** sigue la cadena hasta la raíz (normalmente tu singleton).

> ❓ **Entrevista**: *"La memoria de tu servicio sube 50 MB por hora hasta que ECS lo mata. ¿Cómo lo investigas?"* → Confirmo que es `heapUsed` (leak de JS) y no `external`/RSS (buffers o nativo) con las métricas de `collectDefaultMetrics`. Reproduzco en staging con carga, tomo tres heap snapshots y comparo; sigo los *retainers* del objeto que crece. Sospechosos habituales en Nest: `Map` en singletons, listeners por request, suscripciones RxJS y timers. Mientras tanto, mitigo con límites de memoria correctos y reinicio controlado, pero sin confundir la mitigación con la solución.

---

## 9. Escalar: cluster, PM2 o más contenedores

Un proceso Node usa **un núcleo** para tu JavaScript. Opciones para usar más:

```ts
// src/main.ts — modo cluster con node:cluster
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(3000);   // los workers comparten el puerto: el primary reparte conexiones
}

if (cluster.isPrimary) {
  const n = Number(process.env.WORKERS ?? availableParallelism());
  for (let i = 0; i < n; i++) cluster.fork();
  cluster.on('exit', (worker, code) => {
    console.error(`Worker ${worker.process.pid} murió (code ${code}), relanzando`);
    cluster.fork();
  });
} else {
  bootstrap();
}
```

| Estrategia | Pros | Contras |
|---|---|---|
| **1 proceso por contenedor** + más réplicas (ECS/K8s) | Simple, el orquestador gestiona salud, logs y escalado; fallos aislados | Más overhead de memoria por réplica |
| `node:cluster` / PM2 cluster en un contenedor/VM | Aprovecha una máquina grande | Health checks y señales más complejas; un OOM del contenedor mata a todos |
| Worker threads | Paraleliza CPU dentro de una request | No sirve para escalar HTTP |

**Recomendación en contenedores**: un proceso por contenedor, tareas de 0.5–1 vCPU, y escalar horizontalmente con autoscaling por CPU/latencia/requests. Deja `cluster`/PM2 para VMs o servidores dedicados.

> ⚠️ En cuanto tienes más de un proceso, el **estado en memoria deja de ser compartido**: caché local, contadores del rate limiter (Sesión 20), sesiones de WebSocket (Sesión 27) y locks. Cada proceso tiene los suyos. Muévelos a Redis o diseña para que no importe.

---

## 10. Otros ajustes de producción que sí importan

```ts
// Keep-alive detrás de un ALB (idle timeout por defecto: 60 s).
// Si Node cierra la conexión antes que el ALB, verás 502 intermitentes bajo carga.
const server = app.getHttpServer();
server.keepAliveTimeout = 65_000;   // > idle timeout del ALB
server.headersTimeout = 66_000;     // > keepAliveTimeout
```

- **Pool de conexiones a la DB**: dimensiona `max` según `réplicas × pool ≤ max_connections` de Postgres. Más conexiones no es más rápido: con 20 réplicas × 20 = 400 conexiones puedes saturar la DB. RDS Proxy o PgBouncer ayudan.
- **Compresión**: mejor en el proxy/CDN que en Node (gzip consume CPU del event loop).
- **Límites de body**: `app.useBodyParser('json', { limit: '1mb' })` en Express (`NestExpressApplication`), `bodyLimit` en Fastify.
- **Timeouts hacia afuera**: todo `HttpService`/fetch con timeout; una dependencia lenta sin timeout agota tus sockets y memoria.
- **Caché** (Sesión 25) y **paginación** siempre, y vigila el N+1 (Sesión 17).
- **Versión de Node**: usa una LTS reciente; cada versión mayor trae mejoras de V8 y de rendimiento gratuitas.

---

## Resumen mental de la sesión

```
MÉTODO: objetivo (p99 @ req/s) → baseline → perfil → cambiar UNA cosa → medir
        percentiles, no promedios · casi siempre es I/O (DB), no el framework

EVENT LOOP: un hilo para tu JS · async ≠ no bloqueante
  bloquean: crypto sync, JSON gigante, ReDoS, loops O(n²), fs sync, transformaciones masivas
  medir: monitorEventLoopDelay · eventLoopUtilization · nodejs_eventloop_lag

FASTIFY: NestFastifyApplication + FastifyAdapter · app.register(plugins)
  listen(port, '0.0.0.0') · sin Multer · evitar @Res() · gana en throughput de framework

COSTOS NEST: Scope.REQUEST burbujea (usa ALS/nestjs-cls/durable) ·
  ClassSerializerInterceptor en listas grandes · arranque (LazyModuleLoader, bundling)

CPU-BOUND: worker threads en pool (piscina) · colas (BullMQ) para lo asíncrono
PROFILING: --cpu-prof · --inspect · 0x flame graph (mesetas anchas arriba)
LOAD TEST: autocannon (comparar) · k6 (escenarios + thresholds) · máquina separada, warm-up

MEMORIA: heap (new/old) vs external/RSS · --max-old-space-size ~75% del contenedor
  leaks: Map en singletons, listeners por request, subscriptions, timers
  3 heap snapshots → Comparison → Retainers
ESCALAR: 1 proceso por contenedor + réplicas · estado compartido → Redis
PROD: keepAliveTimeout > idle del ALB · pool DB acotado · compresión en el proxy
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ La API está lenta: describe tu proceso paso a paso antes de cambiar código.
2. ❓ ¿Por qué el p99 importa más que el promedio? Da el ejemplo de la página con 20 llamadas.
3. ❓ ¿Por qué `async` no significa "no bloqueante"? Da tres ejemplos de código que bloquea el event loop en una app Nest.
4. ❓ ¿Qué es ELU y por qué es mejor indicador que el % de CPU?
5. ❓ ¿Qué cambia al migrar de Express a Fastify en Nest? ¿Qué se rompe típicamente?
6. ❓ ¿Por qué un provider `Scope.REQUEST` puede degradar el rendimiento de toda una cadena? ¿Alternativas?
7. ❓ ¿Cuándo usarías worker threads, cuándo una cola y cuándo otro servicio?
8. ❓ ¿Cómo se lee un flame graph?
9. ❓ Diferencia entre `FATAL ERROR: Reached heap limit` y un OOMKilled (137). ¿Cómo configuras `--max-old-space-size`?
10. ❓ Nombra tres fuentes típicas de memory leaks en Nest y cómo las evitas.
11. ❓ Explica la técnica de los tres heap snapshots.
12. ❓ `cluster`/PM2 vs más contenedores: ¿qué recomiendas y qué problema de estado aparece al tener varios procesos?

## Ejercicio práctico
1. Levanta TiendaApi compilada (`npm run build && node dist/main.js`) con logs en JSON y mide `GET /productos` con `npx autocannon -c 50 -d 20` desde otra terminal. Anota req/s, p50 y p99.
2. Crea un endpoint `GET /debug/bloqueo` que haga `crypto.pbkdf2Sync` con 1 000 000 iteraciones. Mientras autocannon golpea `/productos`, llama a `/debug/bloqueo` en bucle y observa cómo se dispara el p99 de `/productos`. Cámbialo a `crypto.pbkdf2` (async con `promisify`) y repite.
3. Agrega `EventLoopMonitor` y observa el lag p99 y el ELU durante el paso 2.
4. Genera un flame graph con `npx 0x -- node dist/main.js` bajo carga y encuentra la meseta de `pbkdf2Sync`.
5. Migra una copia de TiendaApi a Fastify con la sección 3.1 (con `@fastify/helmet`) y repite el benchmark del paso 1. Compara resultados y explica la diferencia (o la falta de ella).
6. Introduce a propósito un leak: un `Map` en `ProductosService` que guarda cada respuesta por `requestId`. Arranca con `--heapsnapshot-signal=SIGUSR2`, aplica carga y toma tres snapshots. Encuentra el `Map` en la vista Comparison y su retainer. Arréglalo con `LRUCache`.
7. Mueve la generación de un CSV de órdenes (100 000 filas simuladas) a un worker con `piscina` y compara el p99 de `/productos` mientras se generan reportes, con y sin worker.
8. Escribe un script de k6 con `thresholds` de p99 < 300 ms y hazlo fallar reduciendo el pool de conexiones de la DB a 1.

---

➡️ **Cuando termines**, marca la Sesión 33 en el [README](README.md) y pasa a la **Sesión 34 — Producción: Docker, CI/CD, graceful shutdown, deploy en AWS (ECS / Lambda)**.
