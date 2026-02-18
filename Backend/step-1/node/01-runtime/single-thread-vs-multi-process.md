# Single-Thread ≠ Single Process

## El Mito de "Node es Single-Thread"

**❌ FALSO:** "Node solo usa 1 hilo"
**✅ VERDADERO:** "El código JavaScript de usuario corre en 1 hilo, pero Node usa múltiples hilos internamente"

---

## Arquitectura Real de Node.js

```
┌─────────────────────────────────────────────┐
│         Tu Código JavaScript                │
│         (Single Thread - V8)                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           Event Loop (libuv)                │
│         (Single Thread también)             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│        Thread Pool (libuv)                  │
│   [Thread 1] [Thread 2] [Thread 3] [...]   │
│                                             │
│  - Operaciones de archivos (fs)            │
│  - DNS lookup                               │
│  - Crypto (algunas operaciones)             │
│  - Zlib (compresión)                        │
└─────────────────────────────────────────────┘
```

---

## ¿Qué Corre en el Thread Principal?

### ✅ En el Thread Principal (Single):
- Tu código JavaScript
- El Event Loop
- Callbacks
- Timers
- I/O non-blocking (red, HTTP)

### ❌ NO en el Thread Principal:
- Operaciones de archivos (`fs.*`)
- DNS lookups (`dns.lookup()`)
- Compresión (`zlib`)
- Crypto (algunas operaciones)
- C++ addons con operaciones pesadas

---

## Operaciones que Usan el Thread Pool

### 1. File System (fs)

```javascript
const fs = require('fs');

// ❌ Esto SÍ bloquea el thread principal (sync)
const data = fs.readFileSync('file.txt');

// ✅ Esto usa el thread pool (async)
fs.readFile('file.txt', (err, data) => {
  // Este callback vuelve al thread principal
});
```

### 2. DNS Lookup

```javascript
const dns = require('dns');

// Usa el thread pool
dns.lookup('google.com', (err, address) => {
  console.log(address);
});

// NO usa thread pool (hace consulta de red directa)
dns.resolve4('google.com', (err, addresses) => {
  console.log(addresses);
});
```

### 3. Crypto

```javascript
const crypto = require('crypto');

// Usa thread pool (operación CPU-intensive)
crypto.pbkdf2('password', 'salt', 100000, 64, 'sha512', (err, key) => {
  console.log(key.toString('hex'));
});
```

### 4. Zlib (Compresión)

```javascript
const zlib = require('zlib');

// Usa thread pool
zlib.gzip('data', (err, compressed) => {
  console.log(compressed);
});
```

---

## Tamaño del Thread Pool

Por defecto, Node.js usa **4 threads** en el thread pool.

### Cambiar el tamaño:

```bash
# En la terminal (antes de ejecutar Node)
export UV_THREADPOOL_SIZE=8
node app.js
```

```javascript
// NO funciona dentro de Node (debe ser antes)
// process.env.UV_THREADPOOL_SIZE = 8; // ❌ Demasiado tarde
```

### ¿Cuántos threads necesitas?

- **Regla general:** 4 es suficiente
- **Si usas mucho fs/crypto:** Aumenta a 8-16
- **No lo hagas muy grande:** Más threads = más cambio de contexto

---

## Cuándo Node SE BLOQUEA (Single-Thread Problem)

### ❌ Operaciones CPU-intensive SÍ bloquean:

```javascript
// ❌ Esto bloquea TODO Node.js
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

app.get('/slow', (req, res) => {
  const result = fibonacci(45); // 🔥 BLOQUEA TODO
  res.json({ result });
});

// Mientras esto corre, NINGUNA otra request puede procesarse
```

### ✅ I/O async NO bloquea:

```javascript
// ✅ Esto NO bloquea (usa thread pool)
app.get('/fast', (req, res) => {
  fs.readFile('huge-file.txt', (err, data) => {
    res.send(data);
  });

  // Otras requests pueden procesarse mientras espera
});
```

---

## Soluciones para Operaciones CPU-Intensive

### 1️⃣ Worker Threads

```javascript
const { Worker } = require('worker_threads');

app.get('/cpu-intensive', (req, res) => {
  const worker = new Worker('./cpu-task.js');

  worker.on('message', (result) => {
    res.json({ result });
  });

  worker.postMessage({ task: 'calculate' });
});
```

**Archivo:** `cpu-task.js`
```javascript
const { parentPort } = require('worker_threads');

parentPort.on('message', (msg) => {
  const result = heavyComputation(); // No bloquea el thread principal
  parentPort.postMessage(result);
});
```

### 2️⃣ Cluster Mode (múltiples procesos)

```javascript
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers (1 por CPU)
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  // Workers share the TCP connection
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello from worker ' + process.pid);
  }).listen(8000);

  console.log(`Worker ${process.pid} started`);
}
```

### 3️⃣ Mover a un servicio externo

```javascript
// En vez de hacer esto en Node:
app.get('/resize-image', async (req, res) => {
  const resized = await heavyImageProcessing(); // ❌ Bloquea
  res.send(resized);
});

// Mejor: delegar a un worker separado (microservicio, queue, etc.)
app.get('/resize-image', async (req, res) => {
  await queue.add('resize', { image: req.file }); // ✅ No bloquea
  res.json({ status: 'processing' });
});
```

---

## Single-Thread vs Multi-Process: Tabla Comparativa

| Característica | Single Thread | Worker Threads | Cluster Mode |
|----------------|---------------|----------------|--------------|
| **Código JavaScript** | 1 hilo | Múltiples hilos | Múltiples procesos |
| **Memoria compartida** | N/A | Sí (SharedArrayBuffer) | No |
| **Overhead** | Mínimo | Bajo | Alto |
| **Casos de uso** | I/O-bound | CPU-bound (tareas cortas) | Escalar en múltiples CPUs |
| **Comunicación** | N/A | Rápida (memoria) | Lenta (IPC) |

---

## Pregunta de Entrevista Senior

**P:** ¿Por qué Node.js puede manejar 10,000 requests concurrentes si es single-thread?

**R:**

Node.js es single-thread para **código JavaScript**, pero:

1. **I/O es non-blocking:** Las operaciones de red/archivos se delegan al sistema operativo (epoll/kqueue) y al thread pool de libuv.

2. **Event Loop:** El thread principal solo ejecuta callbacks cuando las operaciones terminan, sin bloquear.

3. **No hay context switching costoso:** A diferencia de crear 10,000 threads (como en servidores tradicionales), Node usa 1 thread + event loop.

**Resultado:** Puede manejar miles de conexiones concurrentes con bajo consumo de memoria.

**PERO:** Si las requests hacen operaciones CPU-intensive, el thread se bloquea y el performance colapsa. Ahí se necesita Worker Threads o Cluster Mode.

---

## Referencias

- Ver también: [event-loop-profundo.md](./event-loop-profundo.md)
- Documentación Worker Threads: https://nodejs.org/api/worker_threads.html
- Documentación Cluster: https://nodejs.org/api/cluster.html
