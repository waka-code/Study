# CPU & Memory Bottlenecks

Cuellos de botella de recursos dentro del propio proceso. Antes de escalar (más instancias, más RAM) hay que saber **qué recurso** se está agotando y **por qué**.

- **CPU-bound:** el proceso pasa el tiempo calculando (JSON gigante, crypto, regex, compresión, templates, loops pesados).
- **Memory-bound:** el proceso usa demasiada memoria o la libera mal (leaks, cargar todo en RAM, caches sin límite), lo que dispara GC y OOM kills.
- **I/O-bound:** el proceso espera red/disco/DB. CPU baja, latencia alta. (Ver [Database Latency](29-database-latency.md).)

**Ventajas de diagnosticarlo bien:**
- Eliges el fix correcto (optimizar código vs escalar vs cachear).
- Evitas pagar por hardware que no resuelve nada.

**Trade-off:**
- Perfilar en producción tiene overhead.
- Optimizar CPU suele costar memoria (caches, memoization) y viceversa.

---

## 🔍 ¿Qué recurso es el cuello de botella?

| Síntoma | CPU del proceso | Memoria | Probable causa |
|---|---|---|---|
| Latencia alta, CPU ~100% | 🔴 Alta | Normal | CPU-bound |
| Latencia alta, CPU baja | 🟢 Baja | Normal | I/O-bound (DB, red, locks, pool agotado) |
| Memoria crece sin parar | Normal → alta | 🔴 Crece | Memory leak |
| Pausas periódicas / picos de p99 | Picos | Alta | Presión de GC |
| Proceso reinicia solo | — | 🔴 Límite | OOM kill (contenedor/heap) |

**Regla:** CPU baja + latencia alta = **no** es un problema de CPU. Escalar verticalmente no va a ayudar.

---

## 1️⃣ CPU

### Problema en Node.js: bloquear el event loop

Node ejecuta JavaScript en **un solo hilo**. Una tarea CPU-bound de 200 ms bloquea **todas** las requests concurrentes durante 200 ms.

```javascript
// ❌ Bloquea el event loop: ninguna otra request avanza mientras corre
app.post('/hash', (req, res) => {
  const hash = crypto.pbkdf2Sync(req.body.password, 'salt', 500000, 64, 'sha512');
  res.json({ hash: hash.toString('hex') });
});

// ✅ Versión async: corre en el threadpool de libuv
app.post('/hash', (req, res, next) => {
  crypto.pbkdf2(req.body.password, 'salt', 500000, 64, 'sha512', (err, hash) => {
    if (err) return next(err);
    res.json({ hash: hash.toString('hex') });
  });
});
```

### Mover trabajo pesado a Worker Threads

```javascript
// worker.js
const { parentPort, workerData } = require('worker_threads');
const result = heavyComputation(workerData);
parentPort.postMessage(result);

// main.js
const { Worker } = require('worker_threads');

function runInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData: data });
    worker.once('message', resolve);
    worker.once('error', reject);
  });
}
```

En producción usa un **pool** de workers (ej: `piscina`) en lugar de crear uno por request.

### Medir el event loop lag

```javascript
const { monitorEventLoopDelay } = require('perf_hooks');

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  console.log({
    p50: h.percentile(50) / 1e6, // ms
    p99: h.percentile(99) / 1e6,
    max: h.max / 1e6,
  });
  h.reset();
}, 10000);
```

Un p99 de event loop lag > 50-100 ms indica código bloqueante.

### Profiling de CPU

```bash
# Flamegraph con clinic.js
npx clinic flame -- node server.js

# Profiler nativo de V8
node --cpu-prof server.js      # genera .cpuprofile → abrir en Chrome DevTools

# Inspector en vivo
node --inspect server.js       # chrome://inspect → Profiler
```

En el flamegraph, las barras **anchas** en la parte superior son las funciones donde se va el tiempo.

### Causas comunes de CPU alta

| Causa | Fix |
|---|---|
| `JSON.parse` / `JSON.stringify` de payloads enormes | Paginar, streaming JSON, reducir campos |
| Regex con backtracking catastrófico (ReDoS) | Reescribir la regex, limitar input |
| Compresión gzip/brotli en el proceso | Delegar al proxy/CDN o nivel de compresión menor |
| Hashing de passwords síncrono | Versión async o worker |
| Serializar/renderizar templates en cada request | Cachear el resultado |
| Logging excesivo (sync, pretty print) | Logger async (`pino`), JSON plano |
| Loops O(n²) sobre colecciones grandes | `Map`/`Set` para lookups O(1) |

### Usar todos los cores

Un proceso Node usa ~1 core para JS. En una máquina de 8 cores:
- `cluster` / PM2 en modo cluster (ver `Backend/node/08-performance/clustering.md`)
- O mejor en contenedores: **1 proceso por contenedor** y escalar réplicas horizontalmente.

---

## 2️⃣ Memory

### Anatomía de la memoria en Node

```javascript
console.log(process.memoryUsage());
// {
//   rss:        memoria total del proceso (lo que ve el SO / el contenedor)
//   heapTotal:  heap reservado por V8
//   heapUsed:   heap realmente usado por objetos JS
//   external:   memoria de objetos C++ ligados a JS
//   arrayBuffers: Buffers
// }
```

- El límite del heap de V8 se ajusta con `--max-old-space-size=<MB>`.
- En contenedores, deja margen: heap ≈ 70-75% del límite del contenedor (RSS incluye más que el heap).

### Memory leaks típicos

```javascript
// ❌ 1. Cache sin límite: crece para siempre
const cache = {};
app.get('/user/:id', async (req, res) => {
  cache[req.params.id] ??= await db.getUser(req.params.id);
  res.json(cache[req.params.id]);
});

// ✅ Cache con límite y TTL
const { LRUCache } = require('lru-cache');
const cache = new LRUCache({ max: 10_000, ttl: 60_000 });
```

```javascript
// ❌ 2. Listeners que nunca se remueven
function onRequest(req) {
  emitter.on('update', () => notify(req.user)); // uno nuevo por request
}

// ✅ Remover al terminar
function onRequest(req, res) {
  const handler = () => notify(req.user);
  emitter.on('update', handler);
  res.on('close', () => emitter.off('update', handler));
}
```

```javascript
// ❌ 3. Timers que retienen closures
setInterval(() => doSomething(bigObject), 1000); // nunca se limpia

// ✅
const id = setInterval(...);
clearInterval(id);
```

Otros sospechosos: arrays globales que acumulan, closures que capturan objetos grandes, conexiones/sockets no cerrados.

### Cargar todo en memoria

```javascript
// ❌ Carga 2 millones de filas en RAM
const rows = await db.query('SELECT * FROM events');
res.json(rows);

// ✅ Streaming: memoria constante
const stream = db.queryStream('SELECT * FROM events');
stream.pipe(JSONStream.stringify()).pipe(res);
```

Ver [Streaming Pattern](22-streaming-pattern.md) y [Pagination Pattern](04-pagination-pattern.md).

### Diagnosticar un leak

1. Confirmar: `heapUsed` crece de forma sostenida y no baja tras GC.
2. Tomar **dos heap snapshots** separados en el tiempo:
   ```bash
   node --inspect server.js   # Chrome DevTools → Memory → Heap snapshot
   # o programáticamente:
   require('v8').writeHeapSnapshot();
   ```
3. Comparar ("Comparison" view): los objetos cuyo conteo crece son el leak.
4. Revisar el **retainer path** para ver quién mantiene la referencia.

```bash
npx clinic heapprofiler -- node server.js
```

### Presión de GC

Aunque no haya leak, **crear muchos objetos temporales** hace que el GC corra seguido y cause pausas (picos de p99).

- Reducir asignaciones en hot paths (reutilizar buffers, evitar `map().filter().map()` encadenados sobre arrays enormes).
- Evitar payloads gigantes en memoria.
- Observar con `node --trace-gc server.js`.

---

## 📊 Métricas a monitorear

| Métrica | Alerta sugerida |
|---|---|
| CPU del proceso / contenedor | > 70-80% sostenido |
| Event loop lag p99 | > 100 ms |
| `heapUsed` | tendencia creciente sostenida |
| RSS vs límite del contenedor | > 85% |
| Tiempo en GC | > 10% del tiempo |
| Reinicios por OOM | cualquiera |

---

## 🎯 Mejores Prácticas

✅ Primero **medir** (profiler, métricas), después optimizar
✅ Nunca operaciones síncronas pesadas en el request path de Node
✅ Trabajo CPU-bound → worker threads o un servicio/cola aparte
✅ Toda cache en memoria con **límite** (LRU) y **TTL**
✅ Streaming o paginación para datasets grandes
✅ Configurar `--max-old-space-size` acorde al contenedor
✅ Limpiar listeners, timers y conexiones
✅ Alertar sobre event loop lag y crecimiento de heap

---

## 🔗 Relación con Otros Patrones

- **Vertical Scaling**: más CPU/RAM, solo sirve si el cuello es realmente ese recurso
- **Horizontal Scaling**: repartir carga CPU-bound entre instancias
- **Asynchronous Processing / Queues**: sacar trabajo pesado del request path
- **Memoization / Caching**: cambian CPU por memoria
- **Streaming / Pagination**: memoria constante con datasets grandes
- **Compression**: cambia CPU por ancho de banda

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
