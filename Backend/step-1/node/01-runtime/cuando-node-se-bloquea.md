# Cuándo Node.js se Bloquea (y Cómo Evitarlo)

## El Problema Fundamental

Node.js es **single-threaded** para código JavaScript.
→ **Si bloqueas el Event Loop, bloqueas TODO.**

---

## Operaciones que Bloquean el Event Loop

### 1️⃣ Operaciones Síncronas (sync)

```javascript
const fs = require('fs');

// ❌ BLOQUEA el Event Loop
const data = fs.readFileSync('huge-file.txt', 'utf8');

// ✅ NO bloquea
fs.readFile('huge-file.txt', 'utf8', (err, data) => {
  // Callback cuando termine
});
```

**Regla de oro:** NUNCA uses métodos `*Sync` en producción (excepto al inicio de la app).

---

### 2️⃣ Loops Largos (CPU-intensive)

```javascript
// ❌ Esto bloquea TODO Node.js
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

app.get('/fib', (req, res) => {
  const result = fibonacci(45); // 🔥 Bloquea por varios segundos
  res.json({ result });
});

// Mientras esto corre, NINGUNA otra request puede procesarse
```

**Síntomas:**
- Otras requests se quedan esperando
- Health checks fallan
- Timeouts en el cliente

---

### 3️⃣ Expresiones Regulares Complejas (ReDoS)

```javascript
// ❌ Regular Expression Denial of Service
const maliciousInput = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa!';
const regex = /^(a+)+$/;

// Esto puede tardar MINUTOS en CPUs modernos
regex.test(maliciousInput); // 🔥 BLOQUEA
```

**Solución:** Valida regex con herramientas como [safe-regex](https://www.npmjs.com/package/safe-regex).

---

### 4️⃣ JSON.parse/stringify con Datos Grandes

```javascript
// ❌ Parsear JSON enorme bloquea
const hugeJSON = fs.readFileSync('100mb.json', 'utf8');
const data = JSON.parse(hugeJSON); // 🔥 Bloquea varios segundos

// ✅ Usa streaming para JSON grande
const JSONStream = require('JSONStream');
const stream = fs.createReadStream('100mb.json');
stream.pipe(JSONStream.parse('*'));
```

---

### 5️⃣ Crypto Operations Síncronas

```javascript
const crypto = require('crypto');

// ❌ Versión síncrona (bloquea)
const hash = crypto.pbkdf2Sync('password', 'salt', 100000, 64, 'sha512');

// ✅ Versión asíncrona (no bloquea)
crypto.pbkdf2('password', 'salt', 100000, 64, 'sha512', (err, key) => {
  // ...
});
```

---

## Cómo Detectar Bloqueos del Event Loop

### 1️⃣ Herramienta: `blocked-at`

```javascript
const blocked = require('blocked-at');

blocked((time, stack) => {
  console.log(`Blocked for ${time}ms`);
  console.log('Stack:', stack);
}, { threshold: 100 }); // Alerta si bloquea >100ms
```

### 2️⃣ Métricas en producción

```javascript
const loopMonitor = require('event-loop-monitor');

loopMonitor.on('data', (stats) => {
  console.log('Event loop lag:', stats.delay);
  // Si delay > 100ms → problema
});
```

---

## Soluciones para Operaciones Bloqueantes

### 1️⃣ Worker Threads (CPU-intensive tasks)

```javascript
const { Worker } = require('worker_threads');

function runHeavyTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./heavy-task.js', {
      workerData: data
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with code ${code}`));
    });
  });
}

// Uso
app.get('/heavy', async (req, res) => {
  const result = await runHeavyTask({ n: 45 });
  res.json({ result });
});
```

**Archivo:** `heavy-task.js`
```javascript
const { workerData, parentPort } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(workerData.n);
parentPort.postMessage(result);
```

---

### 2️⃣ Dividir Tareas Largas (Chunking)

```javascript
// ❌ Procesar 1 millón de items de una vez (bloquea)
function processAllItems(items) {
  items.forEach(item => processItem(item));
}

// ✅ Procesar en chunks (libera el Event Loop entre chunks)
async function processItemsInChunks(items, chunkSize = 1000) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    chunk.forEach(item => processItem(item));

    // Libera el Event Loop
    await setImmediatePromise();
  }
}

function setImmediatePromise() {
  return new Promise(resolve => setImmediate(resolve));
}
```

---

### 3️⃣ Usar Streams para Datos Grandes

```javascript
const fs = require('fs');
const csv = require('csv-parser');

// ❌ Leer archivo completo en memoria (puede bloquear)
const data = fs.readFileSync('huge-file.csv');
const parsed = parseCSV(data);

// ✅ Usar streams (procesa línea por línea)
fs.createReadStream('huge-file.csv')
  .pipe(csv())
  .on('data', (row) => {
    processRow(row); // Procesa cada línea sin bloquear
  })
  .on('end', () => {
    console.log('Done');
  });
```

---

### 4️⃣ Mover a Cola de Tareas (Queue)

```javascript
const Queue = require('bull');
const imageQueue = new Queue('image processing');

// API endpoint (no bloquea)
app.post('/resize', async (req, res) => {
  const job = await imageQueue.add({
    image: req.file.path,
    width: 200
  });

  res.json({ jobId: job.id });
});

// Worker separado (procesa en background)
imageQueue.process(async (job) => {
  const result = await resizeImage(job.data.image, job.data.width);
  return result;
});
```

---

## Reglas de Oro para NO Bloquear

### ✅ DO:
1. Usa métodos **async** siempre (`fs.readFile`, no `readFileSync`)
2. Divide tareas largas en **chunks**
3. Usa **Worker Threads** para CPU-intensive
4. Usa **Streams** para datos grandes
5. Mueve tareas pesadas a **queues** (Bull, BullMQ)
6. Monitorea el **Event Loop lag** en producción

### ❌ DON'T:
1. NUNCA uses `*Sync` en request handlers
2. NUNCA hagas loops largos en el thread principal
3. NUNCA parsees JSON gigante de una vez
4. NUNCA uses regex sin validar complejidad
5. NUNCA ignores métricas de Event Loop delay

---

## Ejemplo Real: API que NO se Bloquea

```javascript
const express = require('express');
const { Worker } = require('worker_threads');
const app = express();

// ✅ Endpoint rápido (I/O bound)
app.get('/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
});

// ✅ Endpoint lento pero NO bloquea (Worker Thread)
app.post('/process', async (req, res) => {
  const worker = new Worker('./processor.js', {
    workerData: req.body
  });

  worker.on('message', (result) => {
    res.json({ result });
  });

  worker.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

// ✅ Endpoint de streaming (archivo grande)
app.get('/download', (req, res) => {
  const stream = fs.createReadStream('large-file.zip');
  stream.pipe(res);
});

app.listen(3000);
```

---

## Pregunta de Entrevista

**P:** ¿Cómo detectarías que el Event Loop está bloqueado en producción?

**R:**

1. **Métricas:**
   - Event Loop lag (con `perf_hooks` o librerías como `event-loop-stats`)
   - Response time de health checks
   - Queue depth de requests

2. **Herramientas:**
   - New Relic / Datadog (APM)
   - `clinic.js` (diagnóstico local)
   - Prometheus + Grafana (métricas custom)

3. **Señales:**
   - Timeouts en cliente
   - HTTP 503 (Service Unavailable)
   - Health checks fallando
   - CPU al 100% en 1 core (mientras otros cores están idle)

---

## Referencias

- Event Loop profundo: [event-loop-profundo.md](./event-loop-profundo.md)
- Worker Threads: [single-thread-vs-multi-process.md](./single-thread-vs-multi-process.md)
- Performance: [../08-performance/](../08-performance/)
