# Node.js Senior Engineering Masterclass

> **Interviewer Technical Guide & Senior Backend Engineer Mastery**
> 
> Complete roadmap to master Node.js internals, advanced patterns, and production-grade backend engineering.

---

## Table of Contents

1. [Fundamentos Internos de Node.js](#fundamentos-internos-de-nodejs)
2. [Streams en Profundidad](#streams-en-profundidad)
3. [Event Loop Avanzado](#event-loop-avanzado)
4. [Asincronismo Avanzado](#asincronismo-avanzado)
5. [Performance y Optimización](#performance-y-optimización)
6. [Escalabilidad en Node.js](#escalabilidad-en-nodejs)
7. [Seguridad en Node.js](#seguridad-en-nodejs)
8. [Manejo Profesional de Errores](#manejo-profesional-de-errores)
9. [APIs en Node.js](#apis-en-nodejs)x
10. [Express.js Profundo](#expressjs-profundo)
11. [Testing en Node.js](#testing-en-nodejs)
12. [Node.js en Producción](#nodejs-en-producción)
13. [Preguntas Técnicas Senior](#preguntas-técnicas-senior)

---

## Fundamentos Internos de Node.js

### Qué es Node.js Realmente

Node.js no es simplemente "JavaScript en el servidor". Es un **runtime environment** que ejecuta JavaScript fuera del navegador, construido sobre:

- **V8 Engine**: Motor de JavaScript de Google Chrome (C++), compila JS a machine code
- **libuv**: Biblioteca C multiplataforma que maneja I/O asíncrono
- **http-parser**: Parser HTTP de alto rendimiento
- **c-ares**: Resolver DNS asíncrono
- **OpenSSL**: Criptografía TLS/SSL
- **zlib**: Compresión

```javascript
// Node.js architecture layers
/*
┌─────────────────────────────────────┐
│         Node.js Bindings (C++)      │
├─────────────────────────────────────┤
│         V8 JavaScript Engine        │
├─────────────────────────────────────┤
│            libuv (Event Loop)       │
├─────────────────────────────────────┤
│     OS Kernel (epoll/kqueue/IOCP)   │
└─────────────────────────────────────┘
*/
```

### Arquitectura Interna de Node.js

Node.js usa una arquitectura **event-driven, non-blocking I/O**:

```javascript
// Arquitectura conceptual
/*
Application Code (JavaScript)
    ↓
Node.js Core Modules (fs, http, net, etc.)
    ↓
C++ Bindings (Node API)
    ↓
libuv (Thread Pool + Event Loop)
    ↓
OS Kernel (System Calls)
*/
```

**Componentes clave:**

1. **V8 Engine**: Ejecuta JavaScript, gestiona memoria (GC), compila JIT
2. **libuv**: Abstrae I/O del SO, implementa Event Loop, Thread Pool
3. **Node.js API**: Bridge entre JavaScript y C++
4. **C++ Addons**: Extensibilidad nativa

### V8 Engine Internals

V8 es el corazón de Node.js. Entender sus internals es crítico para performance:

```javascript
// V8 compilation pipeline
/*
JavaScript Source
    ↓
Parser (AST)
    ↓
Ignition (Baseline Interpreter)
    ↓
Bytecode
    ↓
TurboFan (Optimizing Compiler)
    ↓
Machine Code (Hot functions only)
    ↓
Deoptimization (when assumptions fail)
*/
```

**V8 Memory Structure:**

```javascript
// V8 Heap Layout
/*
┌─────────────────────────────────────┐
│          New Space (Young)          │  ← 1-8MB, Scavenge GC
│   (Eden + 2 Survivor spaces)       │
├─────────────────────────────────────┤
│         Old Space (Old)            │  ← Mark-Sweep-Compact GC
│   (Old objects, long-lived)        │
├─────────────────────────────────────┤
│          Code Space                │  ← Compiled code
├─────────────────────────────────────┤
│         Large Object Space         │  ← Objects > 1MB
├─────────────────────────────────────┤
│          ReadOnly Space            │  ← Immutable data
└─────────────────────────────────────┘
*/
```

**V8 Hidden Classes (Shapes):**

```javascript
// V8 optimizes object property access using hidden classes
function Point(x, y) {
  this.x = x;
  this.y = y;
}

// Same hidden class
const p1 = new Point(1, 2);
const p2 = new Point(3, 4);

// Different hidden class - DEOPTIMIZATION
const p3 = new Point(5, 6);
p3.z = 7; // Adding property changes shape

// Best practice: Initialize all properties in constructor
function OptimizedPoint(x, y, z = 0) {
  this.x = x;
  this.y = y;
  this.z = z;
}
```

### libuv - El Corazón de Node.js

libuv es la biblioteca que hace posible el modelo asíncrono:

```javascript
// libuv components
/*
┌─────────────────────────────────────┐
│         Event Loop                  │
├─────────────────────────────────────┤
│         Thread Pool (4 threads)     │  ← File I/O, DNS, Compression
├─────────────────────────────────────┤
│         Async I/O                   │  ← Network, File System
├─────────────────────────────────────┤
│         Timer Queue                 │
├─────────────────────────────────────┤
│         Signal Handling             │
└─────────────────────────────────────┘
*/
```

**libuv Thread Pool:**

```javascript
const fs = require('fs');
const crypto = require('crypto');

// These operations use libuv thread pool
fs.readFile('large-file.txt', (err, data) => {
  // File I/O → Thread Pool
});

crypto.pbkdf2('password', 'salt', 100000, 512, 'sha512', (err, key) => {
  // Crypto → Thread Pool (CPU-intensive)
});

// Thread pool size (default: 4)
process.env.UV_THREADPOOL_SIZE = 8; // Increase for CPU-bound tasks
```

### Event Loop Internamente

El Event Loop es el mecanismo que permite a Node.js ser non-blocking:

```javascript
// Event Loop Phases (simplified)
/*
┌─────────────────────────────────────────────────────────┐
│                  Timers Phase                          │
│  setTimeout(), setInterval() callbacks                  │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│           Pending Callbacks Phase                      │
│  I/O callbacks (TCP errors, DNS errors)                │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│              Idle, Prepare Phase                       │
│  Internal use only                                     │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│                 Poll Phase                             │
│  New I/O events, execute callbacks (except timers)     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  poll queue                                    │   │
│  │  - fs callbacks                                │   │
│  │  - network callbacks                            │   │
│  │  - other I/O callbacks                          │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│                Check Phase                             │
│  setImmediate() callbacks                              │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│           Close Callbacks Phase                       │
│  socket.close(), stream.close() etc.                   │
└───────────────────────────────────────────────────────┘
*/
```

### Call Stack

El Call Stack es donde V8 ejecuta código JavaScript:

```javascript
// Call Stack visualization
function third() {
  console.log('Third');
}

function second() {
  third();
}

function first() {
  second();
}

first();

/*
Call Stack:
┌──────────────┐
│   third()    │ ← Executing
├──────────────┤
│   second()   │
├──────────────┤
│   first()    │
├──────────────┤
│   main()     │
└──────────────┘
*/
```

### Callback Queue, Microtask Queue, Macrotask Queue

```javascript
// Callback Queue types
/*
┌─────────────────────────────────────┐
│      Microtask Queue (Priority)     │
│  - process.nextTick()               │
│  - Promise.then()                   │
│  - queueMicrotask()                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Macrotask Queue (Timers)       │
│  - setTimeout()                     │
│  - setInterval()                    │
│  - setImmediate()                   │
│  - I/O callbacks                    │
└─────────────────────────────────────┘
*/
```

### process.nextTick(), setImmediate(), setTimeout()

```javascript
console.log('Start');

setTimeout(() => console.log('setTimeout'), 0);

setImmediate(() => console.log('setImmediate'));

process.nextTick(() => console.log('nextTick'));

Promise.resolve().then(() => console.log('Promise'));

console.log('End');

// Output order (in I/O callback):
// 1. Start
// 2. End
// 3. nextTick (highest priority microtask)
// 4. Promise (microtask queue)
// 5. setImmediate OR setTimeout (non-deterministic in I/O)
```

### Diferencias Internas

```javascript
// Execution priority comparison
/*
Priority (highest to lowest):
1. process.nextTick() - microtask, runs immediately after current op
2. Promise.then() - microtask, runs after nextTick queue drains
3. setImmediate() - macrotask, check phase
4. setTimeout() - macrotask, timers phase (after minimum delay)

Use cases:
- nextTick: Ensure code runs after current operation but before I/O
- Promise: Asynchronous results, chaining
- setImmediate: Execute after I/O callbacks
- setTimeout: Delayed execution, minimum time guarantee
*/
```

### Cómo Maneja Node.js el Asincronismo

Node.js usa **non-blocking I/O** con callbacks:

```javascript
// Synchronous (blocking)
const fs = require('fs');
const data = fs.readFileSync('file.txt'); // Blocks thread
console.log(data);

// Asynchronous (non-blocking)
fs.readFile('file.txt', (err, data) => {
  console.log(data); // Callback when ready
});
console.log('This runs before file read completes');
```

### Single Thread vs Multi Thread

**Node.js is single-threaded** for JavaScript execution:

```javascript
// JavaScript runs on single thread
console.log('Start');

// CPU-intensive operation blocks everything
function heavyComputation() {
  let sum = 0;
  for (let i = 0; i < 1e10; i++) {
    sum += i;
  }
  return sum;
}

heavyComputation(); // Blocks event loop
console.log('End'); // Won't run until computation finishes
```

**But Node.js uses multiple threads internally:**

```javascript
// libuv thread pool (default 4 threads)
const crypto = require('crypto');
const fs = require('fs');

// These run on thread pool, don't block main thread
crypto.pbkdf2('password', 'salt', 100000, 512, 'sha512', (err, key) => {
  console.log('Crypto done');
});

fs.readFile('large-file.txt', (err, data) => {
  console.log('File read done');
});

console.log('Main thread continues');
```

### Thread Pool

```javascript
// Default thread pool size: 4
// Can be increased with environment variable
process.env.UV_THREADPOOL_SIZE = 8;

// Operations using thread pool:
// - File system operations (fs module)
// - DNS lookup (dns module)
// - Compression (zlib module)
// - Crypto operations (crypto module - some)
```

### Worker Threads

Node.js 12+ added Worker Threads for CPU-bound tasks:

```javascript
// main.js
const { Worker } = require('worker_threads');

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData });
    
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with ${code}`));
    });
  });
}

async function main() {
  const result = await runWorker({ number: 1000000000 });
  console.log('Result:', result);
}

main();
```

```javascript
// worker.js
const { parentPort, workerData } = require('worker_threads');

function heavyComputation(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += i;
  }
  return sum;
}

const result = heavyComputation(workerData.number);
parentPort.postMessage(result);
```

### Child Processes

```javascript
const { spawn, exec, execFile, fork } = require('child_process');

// Esto crea un proceso nuevo para ejecutar el codigo diferente a worker que dentro
// de el mismo proceso saca un nuevo hilo.
//tiene su propia memoria, event loop, v8 y pid.

// spawn - for long-running processes with large output
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

// exec - for shell commands, buffers output
exec('ls -lh /usr', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});

// fork - specifically for Node.js processes with IPC
const child = fork('./child.js');

child.on('message', (message) => {
  console.log('Received from child:', message);
});

child.send({ hello: 'parent' });
```

### Cluster Module

Cluster module enables Node.js to use all CPU cores:
Este es un módulo que permite crear múltiples procesos Node.js para aprovechar todos los núcleos del CPU.

```javascript
// cluster.js
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Replace dead worker
  });
} else {
  // Workers can share same port
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Hello from worker ${process.pid}`);
  }).listen(8000);
  
  console.log(`Worker ${process.pid} started`);
}
```

### Buffers

Buffers are fixed-size memory allocations for raw binary data:
un Buffer es una estructura de datos usada para manejar datos binarios crudos (raw binary data).

```javascript
// Creating buffers
const buf1 = Buffer.alloc(10); // 10 zero-filled bytes
const buf2 = Buffer.from('hello'); // From string
const buf3 = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]); // From array

// Buffer operations
buf2.write('world'); // Overwrite
console.log(buf2.toString()); // 'world'
console.log(buf2.toString('hex')); // '776f726c64'

// Buffer slicing (reference, not copy)
const buf4 = Buffer.from('hello world');
const slice = buf4.slice(0, 5);
slice[0] = 0x48; // Modify slice
console.log(buf4.toString()); // 'Hello world' - original modified!

// For copy, use Buffer.from()
const copy = Buffer.from(buf4.slice(0, 5));
copy[0] = 0x48;
console.log(buf4.toString()); // 'Hello world' - original unchanged
```

### Streams

Streams are interfaces for reading/writing data sequentially:
los Streams son una forma de manejar datos por partes (chunks) en lugar de cargar todo en memoria de una sola vez.

```javascript
// Stream types
/*
┌─────────────────────────────────────────┐
│         Readable Stream                  │  ← Data source
│   (fs.createReadStream, HTTP request)   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Writable Stream                  │  ← Data destination
│  (fs.createWriteStream, HTTP response)  │
└──────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Duplex Stream                   │  ← Both read and write
│     (TCP sockets, zlib streams)         │
└──────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Transform Stream                │  ← Modify data
│   (crypto streams, compression)         │
└──────────────────────────────────────────┘
*/
```

### Backpressure

Backpressure occurs when producer is faster than consumer:
es un mecanismo que permite controlar la velocidad de producción de datos en un stream, evitando que el consumidor se sobrecargue.

```javascript
const fs = require('fs');
const readable = fs.createReadStream('large-file.txt');
const writable = fs.createWriteStream('output.txt');

// Without backpressure handling, memory issues
readable.on('data', (chunk) => {
  // If writable is slow, this buffers in memory
  writable.write(chunk);
});

// With backpressure handling
readable.on('data', (chunk) => {
  const canWrite = writable.write(chunk);
  if (!canWrite) {
    readable.pause(); // Stop reading
    writable.once('drain', () => {
      readable.resume(); // Resume when writable catches up
    });
  }
});

// Better: use pipe (handles backpressure automatically)
readable.pipe(writable);
```

### Memory Management

Node.js memory management is handled by V8's Garbage Collector:
es el motor de JavaScript que ejecuta el código de Node.js y gestiona la memoria de forma automática.

```javascript
// Memory usage monitoring
const used = process.memoryUsage();
console.log({
  rss: `${Math.round(used.rss / 1024 / 1024)} MB`, // Resident Set Size
  heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
  heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
  external: `${Math.round(used.external / 1024 / 1024)} MB`
});

// Memory limits
// Default: ~1.4GB on 64-bit systems
// Can be increased:
// node --max-old-space-size=4096 app.js
```

### Garbage Collector

V8 uses generational garbage collection:
V8 utiliza un sistema de recolección de basura (garbage collection) que divide la memoria en generaciones para optimizar el proceso.

```javascript
// V8 GC Generations
/*
┌─────────────────────────────────────┐
│      Young Generation               │
│  ┌─────────┐  ┌─────────┐          │
│  │  Eden   │  │Survivor1│ Survivor2│
│  │ Space   │  │  Space  │  Space   │
│  └─────────┘  └─────────┘          │
│                                      │
│  Scavenge GC (fast, ~1ms)           │
│  Copy live objects to survivor      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Old Generation                 │
│                                      │
│  Mark-Sweep-Compact GC (slow, ~50ms) │
│  Mark live objects → Sweep dead     │
│  → Compact fragmentation           │
└─────────────────────────────────────┘
*/
```

### Memory Leaks

Common memory leak patterns:
es cuando un programa no libera la memoria que ya no necesita, causando que el uso de memoria aumente gradualmente hasta agotar los recursos del sistema.

```javascript
// 1. Global variables
global.leak = new Array(1000000); // Never garbage collected

// 2. Event listeners not removed
const EventEmitter = require('events');
const emitter = new EventEmitter();

function handler() {
  console.log('handled');
}

emitter.on('data', handler);
// emitter.removeListener('data', handler); // Never removed

// 3. Closures
function createLeak() {
  const largeArray = new Array(1000000).fill('data');
  return function() {
    // Closure keeps largeArray alive
    console.log('callback');
  };
}

// Solution: use LRU cache
const LRU = require('lru-cache');
const lruCache = new LRU({ max: 1000 });
```

### EventEmitter

EventEmitter is the core pattern for Node.js:
es una clase que permite crear objetos que pueden emitir y escuchar eventos, lo que facilita la comunicación entre diferentes partes del código.

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
  constructor() {
    super();
    this.maxListeners = 20; // Increase default (10)
  }
}

const emitter = new MyEmitter();

// Add listener
emitter.on('event', (arg1, arg2) => {
  console.log('Event fired:', arg1, arg2);
});

// One-time listener
emitter.once('event', () => {
  console.log('Fired once');
});

// Emit event
emitter.emit('event', 'arg1', 'arg2');

// Error handling (critical!)
emitter.on('error', (err) => {
  console.error('Error:', err);
});
```

### Sistema de Módulos

Node.js has two module systems: CommonJS (CJS) and ES Modules (ESM):

es un sistema que permite organizar el código en módulos independientes que pueden ser importados y exportados entre sí.

```javascript
// CommonJS (CJS)
const fs = require('fs');
const { readFile } = require('fs');
const myModule = require('./myModule');

module.exports = myFunction;
exports.anotherFunction = anotherFunction;

// ES Modules (ESM)
import fs from 'fs';
import { readFile } from 'fs';
import myModule from './myModule.js';

export default myFunction;
export const anotherFunction = anotherFunction;
```

### CommonJS vs ES Modules

```javascript
// CommonJS characteristics:
// - Runtime loading (synchronous)
// - require() is not hoisted
// - module.exports is a plain object
// - Can load JSON and C++ addons
// - __dirname, __filename available

// ES Modules characteristics:
// - Compile-time loading (static analysis)
// - import is hoisted
// - export can be any value
// - Better tree-shaking
// - top-level await
// - No __dirname, __filename (use import.meta.url)
```

### Cómo Funciona require()

```javascript
// require() resolution algorithm
/*
1. Check if module is core module (fs, http, etc.)
2. Check if path starts with ./, ../, /
3. Resolve to absolute path
4. Check if file exists with .js, .json, .node extensions
5. Check if directory exists, look for package.json main
6. Check for index.js
7. Look in node_modules
8. Continue up directory tree to root
*/

// require() cache
const module1 = require('./module');
const module2 = require('./module');
console.log(module1 === module2); // true - same instance

// Clear cache
delete require.cache[require.resolve('./module')];
const module3 = require('./module'); // Reloads
```

### Module Caching

```javascript
// module.js
let counter = 0;
module.exports = {
  increment: () => ++counter,
  get: () => counter
};

// main.js
const mod1 = require('./module');
const mod2 = require('./module');

mod1.increment();
console.log(mod1.get()); // 1
console.log(mod2.get()); // 1 - same instance

// Singleton pattern with modules
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    Database.instance = this;
  }
}

module.exports = new Database(); // Singleton
```

### Node Internals

```javascript
// Process object
process.pid; // Process ID
process.ppid; // Parent process ID
process.platform; // 'darwin', 'linux', 'win32'
process.arch; // 'x64', 'arm64'
process.env; // Environment variables
process.argv; // Command line arguments
process.execPath; // Node executable path
process.version; // Node version
process.versions.v8; // V8 version

// Process events
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  gracefulShutdown();
});
```

---

## Streams en Profundidad

### Readable Streams

```javascript
const fs = require('fs');
const { Readable } = require('stream');

// Creating readable stream from file
const readable = fs.createReadStream('large-file.txt', {
  highWaterMark: 64 * 1024, // 64KB chunks (default 64KB)
  encoding: 'utf8',
  start: 0,
  end: 100 // Read first 100 bytes
});

// Consuming readable stream
readable.on('data', (chunk) => {
  console.log('Received chunk:', chunk.length, 'bytes');
});

readable.on('end', () => {
  console.log('Stream ended');
});

// Using async iterator (Node.js 10+)
async function consumeStream() {
  for await (const chunk of readable) {
    console.log('Chunk:', chunk);
  }
}
```

**Custom Readable Stream:**

```javascript
const { Readable } = require('stream');

class CounterStream extends Readable {
  constructor(opt) {
    super(opt);
    this.max = opt.max || 10;
    this.count = 0;
  }

  _read(size) {
    if (this.count >= this.max) {
      this.push(null); // Signal end of stream
      return;
    }
    
    setTimeout(() => {
      this.push(`${this.count}\n`);
      this.count++;
    }, 100);
  }
}

const counter = new CounterStream({ max: 5 });
counter.pipe(process.stdout);
```

### Writable Streams

```javascript
const fs = require('fs');
const { Writable } = require('stream');

// Creating writable stream
const writable = fs.createWriteStream('output.txt', {
  flags: 'w', // 'w' write, 'a' append
  encoding: 'utf8',
  highWaterMark: 16 * 1024, // 16KB buffer
});

// Writing to stream
writable.write('Hello, ');
writable.write('World!');
writable.end(); // Close stream

// Drain event (backpressure)
writable.on('drain', () => {
  console.log('Buffer drained, safe to write more');
});

// Finish event
writable.on('finish', () => {
  console.log('All writes completed');
});
```

**Custom Writable Stream:**

```javascript
const { Writable } = require('stream');

class UppercaseStream extends Writable {
  constructor(opt) {
    super(opt);
  }

  _write(chunk, encoding, callback) {
    console.log('Writing:', chunk.toString().toUpperCase());
    callback(); // Signal write complete
  }

  _writev(chunks, callback) {
    // Batch write for better performance
    for (const chunk of chunks) {
      console.log('Batch:', chunk.chunk.toString().toUpperCase());
    }
    callback();
  }
}
```

### Duplex Streams

```javascript
const { Duplex } = require('stream');
const net = require('net');

// TCP socket is a duplex stream
const socket = new net.Socket();

socket.on('data', (data) => {
  console.log('Received:', data);
});

socket.write('Hello server');

// Custom duplex stream
class PassThroughStream extends Duplex {
  constructor(opt) {
    super(opt);
  }

  _write(chunk, encoding, callback) {
    this.push(chunk); // Pass through
    callback();
  }

  _read(size) {
    // Nothing to read from source
  }
}
```

### Transform Streams

```javascript
const { Transform } = require('stream');
const zlib = require('zlib');

// Built-in transform stream (compression)
const gzip = zlib.createGzip();
const gunzip = zlib.createGunzip();

// Custom transform stream
class ReplaceStream extends Transform {
  constructor(search, replace, opt) {
    super(opt);
    this.search = search;
    this.replace = replace;
    this.tail = '';
  }

  _transform(chunk, encoding, callback) {
    const pieces = (this.tail + chunk).split(this.search);
    const lastPiece = pieces.pop();
    this.tail = lastPiece;
    
    for (const piece of pieces) {
      this.push(piece);
      this.push(this.replace);
    }
    
    callback();
  }

  _flush(callback) {
    this.push(this.tail);
    callback();
  }
}
```

### Pipe

```javascript
const fs = require('fs');

const readable = fs.createReadStream('input.txt');
const writable = fs.createWriteStream('output.txt');

readable.pipe(writable);

// Chain pipes
const gzip = zlib.createGzip();
readable.pipe(gzip).pipe(writable);

// Pipe with error handling
readable
  .on('error', (err) => {
    console.error('Readable error:', err);
  })
  .pipe(writable)
  .on('error', (err) => {
    console.error('Writable error:', err);
  });
```

### Pipeline

Pipeline is the modern replacement for pipe (Node.js 10+):

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  (err) => {
    if (err) console.error('Pipeline failed:', err);
    else console.log('Pipeline succeeded');
  }
);

// With promises
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

async function compress() {
  try {
    await pipeline(
      fs.createReadStream('input.txt'),
      zlib.createGzip(),
      fs.createWriteStream('input.txt.gz')
    );
    console.log('Compression complete');
  } catch (err) {
    console.error('Compression failed:', err);
  }
}
compress();
```

### Backpressure Internamente

```javascript
const { Readable, Writable } = require('stream');

// Internal backpressure handling
const readable = new Readable({
  highWaterMark: 16,
  read(size) {
    this.push('data');
  }
});

const writable = new Writable({
  highWaterMark: 16,
  write(chunk, encoding, callback) {
    setTimeout(() => {
      callback();
    }, 100);
  }
});

readable.on('data', (chunk) => {
  const canWrite = writable.write(chunk);
  console.log('Can write:', canWrite);
  
  if (!canWrite) {
    console.log('Backpressure - pausing readable');
    readable.pause();
    writable.once('drain', () => {
      console.log('Drained - resuming readable');
      readable.resume();
    });
  }
});
```

### Casos Reales de Producción

**File Upload with Progress:**

```javascript
const fs = require('fs');
const { Transform } = require('stream');

class ProgressStream extends Transform {
  constructor(size, opt) {
    super(opt);
    this.size = size;
    this.transferred = 0;
  }

  _transform(chunk, encoding, callback) {
    this.transferred += chunk.length;
    const percent = ((this.transferred / this.size) * 100).toFixed(2);
    this.emit('progress', percent);
    this.push(chunk);
    callback();
  }
}

function uploadWithProgress(inputPath, outputPath, size) {
  const readStream = fs.createReadStream(inputPath);
  const writeStream = fs.createWriteStream(outputPath);
  const progress = new ProgressStream(size);
  
  progress.on('progress', (percent) => {
    console.log(`Upload progress: ${percent}%`);
  });
  
  readStream.pipe(progress).pipe(writeStream);
}
```

### Streaming HTTP

```javascript
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  const filePath = './large-file.txt';
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': fileSize,
    'Transfer-Encoding': 'chunked'
  });
  
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  
  stream.on('error', (err) => {
    res.statusCode = 500;
    res.end('Internal Server Error');
  });
});

server.listen(3000);
```

---

## Event Loop Avanzado

### Cada Fase del Event Loop

```javascript
// Complete Event Loop Phase Diagram
/*
┌─────────────────────────────────────────────────────────────┐
│                    TIMERS PHASE                             │
│  Executes callbacks scheduled by setTimeout() and           │
│  setInterval() after the minimum threshold has elapsed.    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PENDING CALLBACKS PHASE                        │
│  Executes I/O callbacks that were deferred (e.g., TCP       │
│  errors, DNS errors). Usually, these are rare.              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 IDLE, PREPARE PHASE                        │
│  Internal use only. Used by libuv for internal operations.  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      POLL PHASE                             │
│  The most critical phase. Handles new I/O events and       │
│  executes callbacks (except timers, setImmediate, close).   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CHECK PHASE                              │
│  Executes callbacks scheduled by setImmediate().            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                CLOSE CALLBACKS PHASE                        │
│  Executes callbacks for closed handles.                    │
└─────────────────────────────────────────────────────────────┘

Between each phase, microtasks (nextTick, promises) are executed.
*/
```

### Microtasks

```javascript
// Microtask execution order
console.log('1. Script start');

setTimeout(() => console.log('2. setTimeout'), 0);

setImmediate(() => console.log('3. setImmediate'));

process.nextTick(() => console.log('4. nextTick 1'));
process.nextTick(() => console.log('5. nextTick 2'));

Promise.resolve()
  .then(() => console.log('6. Promise 1'))
  .then(() => console.log('7. Promise 2'));

console.log('8. Script end');

// Output:
// 1. Script start
// 8. Script end
// 4. nextTick 1
// 5. nextTick 2
// 6. Promise 1
// 7. Promise 2
// 2. setTimeout OR 3. setImmediate
```

### Event Loop Blocking Detection

El Event Loop Blocking Detection es el proceso de detectar cuándo algo está bloqueando el Event Loop de Node.js.

```javascript
// Detect event loop lag
let lastTime = Date.now();

function checkEventLoop() {
  const now = Date.now();
  const lag = now - lastTime;
  
  if (lag > 100) {
    console.warn(`Event loop blocked for ${lag}ms`);
  }
  
  lastTime = now;
  setTimeout(checkEventLoop, 0);
}

checkEventLoop();
```

### Cómo Optimizar Aplicaciones CPU-bound

**Batch Processing:**

Es el proceso de dividir el trabajo en partes más pequeñas y procesarlas de forma incremental para no bloquear el Event Loop.

```javascript
// Break CPU work into chunks
function processInChunks(items, chunkSize, processor) {
  let index = 0;
  
  function processChunk() {
    const chunk = items.slice(index, index + chunkSize);
    processor(chunk);
    index += chunkSize;
    
    if (index < items.length) {
      // Yield to event loop
      setImmediate(processChunk);
    }
  }
  
  processChunk();
}
```

---

## Asincronismo Avanzado

### Callbacks, Promises, Async/Await

```javascript
// Error-First Callback Pattern
fs.readFile('file.txt', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  console.log('File content:', data);
});

// Promises
function asyncOperation() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = true;
      if (success) {
        resolve('Operation completed');
      } else {
        reject(new Error('Operation failed'));
      }
    }, 1000);
  });
}

// Async/Await with error handling
async function handleRequest() {
  try {
    const user = await fetchUser(1);
    const posts = await fetchPosts(user.id);
    return posts;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

### Promise Combinators

```javascript
// Promise.all - all must succeed
Promise.all([
  fetchUser(1),
  fetchPosts(),
  fetchComments()
])
  .then(([user, posts, comments]) => {
    console.log('All fetched:', { user, posts, comments });
  })
  .catch(error => console.error('One failed:', error));

// Promise.allSettled - all complete, regardless of success
Promise.allSettled([
  fetchUser(1),
  fetchPosts(),
  fetchComments()
])
  .then(results => {
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        console.log(`Success ${i}:`, result.value);
      } else {
        console.error(`Failed ${i}:`, result.reason);
      }
    });
  });

// Promise.race - first to resolve/reject wins
Promise.race([
  fetchFromCache(),
  fetchFromAPI()
])
  .then(result => console.log('First response:', result));

// Promise.any - first successful wins
Promise.any([
  fetchFromPrimary(),
  fetchFromSecondary(),
  fetchFromTertiary()
])
  .then(result => console.log('First success:', result))
  .catch(error => console.error('All failed:', error));
```

### Race Conditions



```javascript
// Race condition example
let balance = 100;

async function withdraw(amount) {
  const currentBalance = balance; // Read
  await simulateDelay(); // Async operation
  balance = currentBalance - amount; // Write
}

async function simulateDelay() {
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Both withdrawals read balance=100
await Promise.all([withdraw(50), withdraw(50)]);
console.log(balance); // 50 instead of 0 - race condition!

// Solution: Use mutex/lock
const { Mutex } = require('async-mutex');
const mutex = new Mutex();

async function safeWithdraw(amount) {
  const release = await mutex.acquire();
  try {
    const currentBalance = balance;
    await simulateDelay();
    balance = currentBalance - amount;
  } finally {
    release();
  }
}
```

### Concurrency Patterns

es la capacidad de manejar múltiples tareas “al mismo tiempo” sin necesariamente ejecutarlas en paralelo real.

```javascript
// Parallel execution
async function parallelExecution() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(1),
    fetchPosts(),
    fetchComments()
  ]);
  return { user, posts, comments };
}

// Sequential execution
async function sequentialExecution() {
  const user = await fetchUser(1);
  const posts = await fetchPosts(user.id);
  const comments = await fetchComments(posts[0].id);
  return { user, posts, comments };
}

// Parallel with limit (p-limit)
const pLimit = require('p-limit');
const limit = pLimit(5); // Max 5 concurrent

async function limitedParallel(items) {
  const results = await Promise.all(
    items.map(item => limit(() => processItem(item)))
  );
  return results;
}

// Batching
async function batchProcessing(items, batchSize) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );
    results.push(...batchResults);
  }
  return results;
}
```

### Error Handling Avanzado

```javascript
// Retry pattern
async function retry(fn, options = {}) {
  const { retries = 3, delay = 1000 } = options;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// Usage
const result = await retry(
  () => fetchAPI(),
  { retries: 5, delay: 1000 }
);

// Timeout pattern
async function withTimeout(promise, timeoutMs) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  
  return Promise.race([promise, timeout]);
}

// Cancellation pattern
async function withCancellation(signal) {
  if (signal.aborted) {
    throw new Error('Operation cancelled');
  }
  
  // Perform operation
  const result = await fetchAPI();
  
  if (signal.aborted) {
    throw new Error('Operation cancelled');
  }
  
  return result;
}

// Usage with AbortController
const controller = new AbortController();
const signal = controller.signal;

const promise = withCancellation(signal);

// Cancel after 1 second
setTimeout(() => controller.abort(), 1000);
```

### Queue Systems Internos

```javascript
// Simple async queue
class AsyncQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

// Usage
const queue = new AsyncQueue(3); // Max 3 concurrent

for (let i = 0; i < 10; i++) {
  queue.add(() => processItem(i))
    .then(result => console.log('Done:', result));
}
```

---

## Performance y Optimización

### Cómo Optimizar Aplicaciones Node.js

**Profiling Basics:**

```javascript
// Built-in profiler
const inspector = require('inspector');
const fs = require('fs');

const session = new inspector.Session();
session.connect();

session.post('Profiler.enable', () => {
  session.post('Profiler.start', () => {
    // Your code here
    setTimeout(() => {
      session.post('Profiler.stop', (err, { profile }) => {
        fs.writeFileSync('./profile.cpuprofile', JSON.stringify(profile));
        session.disconnect();
      });
    }, 5000);
  });
});
```

**CPU Profiling with Chrome DevTools:**

```bash
# Start Node with inspector
node --inspect app.js

# Open chrome://inspect in Chrome
# Click "Inspect" to open DevTools
# Go to Profiler tab → Record CPU profile
```

**Heap Snapshots:**

```javascript
// Take heap snapshot programmatically
const v8 = require('v8');
const fs = require('fs');

const snapshot = v8.getHeapSnapshot();
fs.writeFileSync('heap-snapshot.heapsnapshot', snapshot);

// Or use Chrome DevTools
// chrome://inspect → Memory → Take snapshot
```

### Performance Hooks

```javascript
const { PerformanceObserver, performance } = require('perf_hooks');

const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

obs.observe({ entryTypes: ['measure', 'node'] });

// Measure operations
performance.mark('start');
const result = heavyOperation();
performance.mark('end');
performance.measure('operation', 'start', 'end');
```

### Bottlenecks Detection

```javascript
// Event loop latency monitoring
const { performance } = require('perf_hooks');

let lastLoop = performance.now();
const threshold = 100; // ms

function checkLoopLag() {
  const now = performance.now();
  const lag = now - lastLoop;
  
  if (lag > threshold) {
    console.warn(`Event loop lag: ${lag.toFixed(2)}ms`);
  }
  
  lastLoop = now;
  setImmediate(checkLoopLag);
}

checkLoopLag();

// HTTP request timing
const http = require('http');

const timings = {};

function trackTiming(req, res, next) {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    console.log(`${req.method} ${req.url}: ${duration.toFixed(2)}ms`);
  });
  
  next();
}
```

### Memory Leaks Detection

```javascript
// Memory leak detection pattern
const v8 = require('v8');

function getMemoryUsage() {
  return process.memoryUsage();
}

function compareSnapshots(before, after) {
  // Compare heap snapshots to find leaks
  // Use Chrome DevTools for visual comparison
}

// Leaky pattern detection
const EventEmitter = require('events');

class LeakyComponent extends EventEmitter {
  constructor() {
    super();
    this.data = [];
  }
  
  addData(item) {
    this.data.push(item);
    // Never clears data - potential leak
  }
}

// Fixed version
class FixedComponent extends EventEmitter {
  constructor() {
    super();
    this.data = [];
    this.maxSize = 1000;
  }
  
  addData(item) {
    this.data.push(item);
    if (this.data.length > this.maxSize) {
      this.data.shift(); // Remove oldest
    }
  }
}
```

### Benchmarking

```javascript
const { performance, PerformanceObserver } = require('perf_hooks');

function benchmark(fn, iterations = 10000) {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const duration = performance.now() - start;
  const avg = duration / iterations;
  
  console.log(`${fn.name}: ${avg.toFixed(6)}ms per iteration`);
  console.log(`Total: ${duration.toFixed(2)}ms for ${iterations} iterations`);
  
  return avg;
}

// Compare implementations
function implementation1() {
  return Array.from({ length: 1000 }, (_, i) => i * 2);
}

function implementation2() {
  const arr = [];
  for (let i = 0; i < 1000; i++) {
    arr.push(i * 2);
  }
  return arr;
}

benchmark(implementation1);
benchmark(implementation2);
```

### Optimización de APIs

```javascript
// Response compression
const compression = require('compression');
const express = require('express');

const app = express();
app.use(compression({
  level: 6,
  threshold: 1024 // Only compress if > 1KB
}));

// HTTP/2 for multiplexing
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, app);

server.listen(443);

// Response caching headers
app.get('/api/data', (req, res) => {
  const data = fetchData();
  
  // Cache for 1 hour
  res.set('Cache-Control', 'public, max-age=3600');
  res.set('ETag', generateETag(data));
  
  if (req.fresh) {
    return res.status(304).end();
  }
  
  res.json(data);
});
```

### Optimización de Queries

```javascript
// Connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Query batching
async function batchQueries(queries) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const { sql, params } of queries) {
      const result = await client.query(sql, params);
      results.push(result.rows);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Prepared statements
async function getUsersByIds(ids) {
  const client = await pool.connect();
  try {
    const statement = await client.prepare(
      'SELECT * FROM users WHERE id = ANY($1)'
    );
    const result = await statement.query([ids]);
    return result.rows;
  } finally {
    client.release();
  }
}
```

### Optimización I/O

```javascript
// Use streams for large files
const fs = require('fs');

// BAD: Loads entire file into memory
const data = fs.readFileSync('large-file.txt');

// GOOD: Streams file
const readStream = fs.createReadStream('large-file.txt');
const writeStream = fs.createWriteStream('output.txt');

readStream.pipe(writeStream);

// Async file operations
const fsPromises = fs.promises;

async function processFile(path) {
  const data = await fsPromises.readFile(path);
  // Process data
  return processedData;
}

// Directory operations
async function processDirectory(dir) {
  const files = await fsPromises.readdir(dir);
  
  const results = await Promise.all(
    files.map(file => processFile(`${dir}/${file}`))
  );
  
  return results;
}
```

### Caching Strategies

```javascript
// In-memory cache with TTL
class TTLCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// Redis caching
const Redis = require('ioredis');
const redis = new Redis();

async function getCached(key, fetchFn, ttl = 3600) {
  const cached = await redis.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

// Cache-aside pattern
async function getUser(id) {
  return getCached(
    `user:${id}`,
    () => db.query('SELECT * FROM users WHERE id = $1', [id]),
    3600
  );
}
```

### Redis Caching Patterns

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Cache stampede protection
async function getWithLock(key, fetchFn, ttl = 3600) {
  const cached = await redis.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const lockKey = `lock:${key}`;
  const lock = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  
  if (lock) {
    try {
      const data = await fetchFn();
      await redis.setex(key, ttl, JSON.stringify(data));
      await redis.del(lockKey);
      return data;
    } catch (error) {
      await redis.del(lockKey);
      throw error;
    }
  } else {
    // Wait for lock to release
    await new Promise(resolve => setTimeout(resolve, 100));
    return getWithLock(key, fetchFn, ttl);
  }
}

// Write-through cache
async function setUser(user) {
  await db.query('UPDATE users SET ... WHERE id = $1', [user.id]);
  await redis.setex(`user:${user.id}`, 3600, JSON.stringify(user));
}

// Write-behind cache
async function setUserAsync(user) {
  await redis.setex(`user:${user.id}`, 3600, JSON.stringify(user));
  // Queue for async write to DB
  queue.push({ type: 'update', data: user });
}
```

### Connection Pooling

```javascript

es una técnica para reutilizar conexiones en lugar de crear una nueva conexión cada vez que una aplicación necesita comunicarse con otro servicio.
// Database connection pool
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'user',
  password: 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// HTTP connection pool (keep-alive)
const http = require('http');
const https = require('https');

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: httpsAgent }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}
```

---

## Escalabilidad en Node.js

### Horizontal Scaling

Horizontal scaling adds more instances:

```javascript
// Load balancing with multiple instances
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  require('./app');
}
```

### Vertical Scaling

Vertical scaling increases resources of single instance:

```javascript
// Increase memory limit
// node --max-old-space-size=4096 app.js

// Increase thread pool for CPU-bound tasks
process.env.UV_THREADPOOL_SIZE = 8;

// Optimize for vertical scaling
const { Worker } = require('worker_threads');

class WorkerPool {
  constructor(size) {
    this.workers = [];
    this.queue = [];
    
    for (let i = 0; i < size; i++) {
      this.createWorker();
    }
  }
  
  createWorker() {
    const worker = new Worker('./worker.js');
    worker.on('message', (result) => {
      const { resolve } = worker.task;
      worker.task = null;
      worker.busy = false;
      resolve(result);
      this.processQueue();
    });
    worker.busy = false;
    this.workers.push(worker);
  }
  
  async run(data) {
    return new Promise((resolve, reject) => {
      const available = this.workers.find(w => !w.busy);
      if (available) {
        available.busy = true;
        available.task = { resolve, reject };
        available.postMessage(data);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }
}
```

### Load Balancing
es el proceso de distribuir tráfico entre múltiples servidores o instancias para:
**NGINX Configuration:**

```nginx
upstream nodejs {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://nodejs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Node.js Load Balancer:**

```javascript
const http = require('http');
const servers = [
  { host: 'localhost', port: 3000 },
  { host: 'localhost', port: 3001 },
  { host: 'localhost', port: 3002 }
];

let currentIndex = 0;

const balancer = http.createServer((req, res) => {
  const server = servers[currentIndex];
  currentIndex = (currentIndex + 1) % servers.length;
  
  const proxyReq = http.request({
    host: server.host,
    port: server.port,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  req.pipe(proxyReq);
});

balancer.listen(8080);
```

### PM2 Process Manager

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-app',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};

// Commands
// pm2 start ecosystem.config.js
// pm2 scale my-app 4
// pm2 reload all
// pm2 logs
// pm2 monit
```

### Sticky Sessions

```javascript
// Sticky sessions with IP hash
const sticky = require('sticky-session');
const express = require('express');
const cluster = require('cluster');

const app = express();

app.get('/', (req, res) => {
  res.send(`Worker: ${process.pid}`);
});

if (!cluster.isMaster) {
  const server = app.listen(0);
  sticky.listen(server, 3000);
} else {
  const numCPUs = require('os').cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
}
```

### Queue Systems

**BullMQ (Redis-based):**

```javascript
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Create queue
const emailQueue = new Queue('email', { connection });

// Add job
async function sendEmail(to, subject, body) {
  await emailQueue.add('send', { to, subject, body });
}

// Worker
const worker = new Worker('email', async (job) => {
  const { to, subject, body } = job.data;
  
  // Send email
  await emailService.send(to, subject, body);
  
  console.log(`Email sent to ${to}`);
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

**RabbitMQ:**

```javascript
const amqp = require('amqplib');

async function setupRabbitMQ() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertQueue('tasks', { durable: true });
  
  // Producer
  async function publishTask(task) {
    channel.sendToQueue('tasks', Buffer.from(JSON.stringify(task)), {
      persistent: true
    });
  }
  
  // Consumer
  await channel.prefetch(1);
  channel.consume('tasks', async (msg) => {
    const task = JSON.parse(msg.content.toString());
    
    try {
      await processTask(task);
      channel.ack(msg);
    } catch (error) {
      console.error('Task failed:', error);
      channel.nack(msg, false, true); // Requeue
    }
  });
  
  return { publishTask };
}
```

**Kafka:**

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

// Producer
const producer = kafka.producer();

async function produceMessage(topic, message) {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }]
  });
}

// Consumer
const consumer = kafka.consumer({ groupId: 'my-group' });

async function consumeMessages(topic) {
  await consumer.connect();
  await consumer.subscribe({ topic });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());
      await processMessage(data);
    }
  });
}
```

### Event-Driven Systems

```javascript
const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  publish(event, data) {
    this.emit(event, data);
  }
  
  subscribe(event, handler) {
    this.on(event, handler);
  }
  
  unsubscribe(event, handler) {
    this.off(event, handler);
  }
}

const eventBus = new EventBus();

// Event handlers
eventBus.subscribe('user.created', async (user) => {
  await sendWelcomeEmail(user.email);
  await createUserProfile(user.id);
});

eventBus.subscribe('user.created', async (user) => {
  await analytics.track('user_signup', { userId: user.id });
});

// Publish event
eventBus.publish('user.created', { id: 1, email: 'user@example.com' });
```

### Microservices with Node.js

```javascript
// Service A - User Service
const express = require('express');
const axios = require('axios');

const app = express();

app.get('/users/:id', async (req, res) => {
  const user = await db.getUser(req.params.id);
  res.json(user);
});

app.post('/users', async (req, res) => {
  const user = await db.createUser(req.body);
  
  // Emit event
  await eventBus.publish('user.created', user);
  
  res.status(201).json(user);
});

// Service B - Notification Service
eventBus.subscribe('user.created', async (user) => {
  await sendWelcomeEmail(user.email);
});

// Service C - Analytics Service
eventBus.subscribe('user.created', async (user) => {
  await analytics.track('user_signup', { userId: user.id });
});
```

---

## Seguridad en Node.js

### JWT (JSON Web Tokens)

```javascript
const jwt = require('jsonwebtoken');

// Generate token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'my-app',
      audience: 'my-app-users'
    }
  );
}

// Verify token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'my-app',
      audience: 'my-app-users'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Refresh token
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### OAuth2

```javascript
const express = require('express');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');

passport.use(new OAuth2Strategy({
  authorizationURL: 'https://provider.com/oauth/authorize',
  tokenURL: 'https://provider.com/oauth/token',
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateUser(profile);
    done(null, { user, accessToken, refreshToken });
  } catch (error) {
    done(error);
  }
}));

const app = express();

app.get('/auth/provider', passport.authenticate('oauth2'));

app.get('/auth/provider/callback',
  passport.authenticate('oauth2', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect('/dashboard');
  }
);
```

### Session Handling

```javascript
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const Redis = require('ioredis');

const app = express();

app.use(session({
  store: new RedisStore({ client: new Redis() }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 3600000, // 1 hour
    sameSite: 'strict'
  },
  name: 'sessionId' // Don't use default name
}));
```

### Cookies Security

```javascript
const cookieParser = require('cookie-parser');

app.use(cookieParser({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000
}));

// Set secure cookie
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});
```

### CSRF Protection

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const csrfProtection = csrf({ cookie: true });

app.use(cookieParser());
app.use(csrfProtection);

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/form', csrfProtection, (req, res) => {
  // Form submission
});
```

### CORS

```javascript
const cors = require('cors');

// Simple CORS
app.use(cors());

// Custom CORS
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Dynamic origin
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['https://example.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

### XSS Prevention

```javascript
const xss = require('xss');

// Sanitize input
const sanitized = xss(userInput);

// In Express
app.use((req, res, next) => {
  req.body = sanitize(req.body);
  next();
});

function sanitize(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = xss(obj[key]);
    } else {
      sanitized[key] = sanitize(obj[key]);
    }
  }
  
  return sanitized;
}

// Content Security Policy
const helmet = require('helmet');
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:']
  }
}));
```

### SQL Injection Prevention

```javascript
const { Pool } = require('pg');

const pool = new Pool({ /* config */ });

// BAD: Concatenation
async function getUserBad(id) {
  const query = `SELECT * FROM users WHERE id = '${id}'`;
  return pool.query(query); // Vulnerable!
}

// GOOD: Parameterized queries
async function getUserGood(id) {
  const query = 'SELECT * FROM users WHERE id = $1';
  return pool.query(query, [id]); // Safe
}

// Using ORM (Sequelize)
const { Sequelize, Op } = require('sequelize');

const sequelize = new Sequelize(/* config */);

async function getUser(id) {
  const user = await User.findByPk(id); // Safe
  return user;
}

// Input validation
const { body, validationResult } = require('express-validator');

app.post('/users', 
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const user = await createUser(req.body);
    res.json(user);
  }
);
```

### NoSQL Injection Prevention

```javascript
const mongoose = require('mongoose');

// BAD: Direct object injection
async function findUserBad(query) {
  return User.find(query); // Vulnerable if query from user input
}

// GOOD: Use Mongoose schema
async function findUserGood(email) {
  return User.findOne({ email }); // Safe with schema
}

// Sanitize input
const mongoSanitize = require('express-mongo-sanitize');

app.use(mongoSanitize());

// Input validation
app.get('/users', async (req, res) => {
  const { email } = req.query;
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  
  const user = await User.findOne({ email });
  res.json(user);
});
```

### SSRF Prevention

```javascript
const { URL } = require('url');

// Validate URLs
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    // Block internal IPs
    const hostname = url.hostname;
    if (isPrivateIP(hostname)) {
      return false;
    }
    
    // Block non-HTTP(S) protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

function isPrivateIP(hostname) {
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^0\./,
    /^169\.254\./
  ];
  
  return privatePatterns.some(pattern => pattern.test(hostname));
}

// Usage
app.get('/proxy', async (req, res) => {
  const { url } = req.query;
  
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  const response = await fetch(url);
  const data = await response.text();
  res.send(data);
});
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// API-specific rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many API requests'
});

app.use('/api/', apiLimiter);

// IP-based rate limit with Redis
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redisLimiter = rateLimit({
  store: new RedisStore({
    client: new Redis(),
    prefix: 'rate-limit:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(redisLimiter);
```

### Helmet Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet());

// Custom configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' }
}));
```

### Password Hashing

```javascript
const bcrypt = require('bcrypt');
const argon2 = require('argon2');

// bcrypt
async function hashPasswordBcrypt(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function verifyPasswordBcrypt(password, hash) {
  return bcrypt.compare(password, hash);
}

// argon2 (more secure)
async function hashPasswordArgon2(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });
}

async function verifyPasswordArgon2(password, hash) {
  return argon2.verify(hash, password);
}
```

### Secrets Management

```javascript
// Environment variables
require('dotenv').config();

const config = {
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  jwt: {
    secret: process.env.JWT_SECRET
  }
};

// Using Vault (HashiCorp)
const Vault = require('node-vault');

const vault = Vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

async function getSecret(path) {
  const result = await vault.read(path);
  return result.data;
}

// AWS Secrets Manager
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretId) {
  const data = await secretsManager.getSecretValue({
    SecretId: secretId
  }).promise();
  
  if (data.SecretString) {
    return JSON.parse(data.SecretString);
  }
  
  return data.SecretBinary;
}
```

### Express Security Best Practices

```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const xss = require('xss');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Body size limit
app.use(express.json({ limit: '10kb' }));

// Disable x-powered-by header
app.disable('x-powered-by');

// Trust proxy
app.set('trust proxy', 1);

// Input sanitization
app.use((req, res, next) => {
  if (req.body) {
    req.body = JSON.parse(xss(JSON.stringify(req.body)));
  }
  next();
});

// Secure headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### Data Validation

```javascript
const { body, param, query, validationResult } = require('express-validator');
const { celebrate, Joi, Segments } = require('celebrate');

// express-validator
app.post('/users',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/),
  body('name').trim().isLength({ min: 2, max: 50 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const user = await createUser(req.body);
    res.status(201).json(user);
  }
);

// Joi with celebrate
app.post('/users',
  celebrate({
    [Segments.BODY]: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/).required(),
      name: Joi.string().min(2).max(50).required()
    })
  }),
  async (req, res) => {
    const user = await createUser(req.body);
    res.status(201).json(user);
  }
);
```

---

## Manejo Profesional de Errores

### Error-First Pattern

```javascript
// Standard callback error-first pattern
fs.readFile('file.txt', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  
  console.log('File content:', data);
});

// Creating error-first functions
function asyncOperation(callback) {
  setTimeout(() => {
    const error = null;
    const result = 'success';
    callback(error, result);
  }, 1000);
}

// Promisify error-first functions
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

async function main() {
  try {
    const data = await readFileAsync('file.txt');
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}
```

### Try/Catch

```javascript
// Async/await error handling
async function handleRequest() {
  try {
    const user = await getUser(id);
    const posts = await getPosts(user.id);
    return posts;
  } catch (error) {
    console.error('Request failed:', error);
    throw error; // Re-throw for caller to handle
  }
}

// Multiple catch blocks
async function process() {
  try {
    await riskyOperation();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
    } else if (error instanceof NetworkError) {
      console.error('Network error:', error.message);
    } else {
      console.error('Unknown error:', error);
      throw error;
    }
  }
}
```

### Unhandled Promise Rejections

```javascript
// Global handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // In production, you might want to:
  // - Log to monitoring service
  // - Send alert
  // - Gracefully shutdown
});

// Always handle promise rejections
async function safeOperation() {
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Operation failed:', error);
    // Handle error appropriately
  }
}
```

### Uncaught Exception

```javascript
// Global handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // In production:
  // - Log error
  // - Send alert
  // - Clean up resources
  // - Exit process (process is in undefined state)
  
  gracefulShutdown(error);
});

function gracefulShutdown(error) {
  // Close database connections
  // Close file handles
  // Flush logs
  
  console.error('Shutting down due to error:', error);
  process.exit(1);
}
```

### Custom Errors

```javascript
// Base custom error
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

// Usage
throw new ValidationError('Invalid email format');
throw new NotFoundError('User not found');
throw new UnauthorizedError('Invalid credentials');
```

### Error Boundaries Backend

```javascript
// Error handling middleware
function errorHandler(err, req, res, next) {
  // Log error
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.isOperational) {
    // Operational errors (expected)
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(isDevelopment && { stack: err.stack })
      }
    });
  }
  
  // Programming errors (unexpected)
  res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(isDevelopment && { stack: err.stack })
    }
  });
}

// 404 handler
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
}

// Async error wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  res.json(user);
}));

app.use(notFoundHandler);
app.use(errorHandler);
```

### Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'my-app' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Usage
logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });
logger.warn('Rate limit exceeded', { ip: req.ip });

// Pino (faster alternative)
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

logger.info({ msg: 'Server started', port: 3000 });
```

### Structured Logging

```javascript
const pino = require('pino');

const logger = pino({
  base: {
    pid: process.pid,
    hostname: require('os').hostname()
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
});

// HTTP request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      req,
      res,
      duration,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode
    });
  });
  
  next();
});

// Error logging with context
try {
  await operation();
} catch (error) {
  logger.error({
    error,
    context: { userId: req.user.id, action: 'delete-account' }
  });
}
```

### Observabilidad

```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-service'
  })
});

const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces'
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

registerInstrumentations({
  instrumentations: [
    require('@opentelemetry/instrumentation-http'),
    require('@opentelemetry/instrumentation-express'),
    require('@opentelemetry/instrumentation-pg')
  ]
});

// Manual tracing
const tracer = provider.getTracer('my-app');

async function handleRequest() {
  const span = tracer.startSpan('handle-request');
  
  try {
    const user = await getUser();
    span.setAttribute('user.id', user.id);
    
    const posts = await getPosts(user.id);
    span.setAttribute('posts.count', posts.length);
    
    return posts;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### Tracing

```javascript
const tracer = require('dd-trace').init({
  service: 'my-app',
  env: process.env.NODE_ENV,
  logInjection: true
});

// Automatic tracing for common libraries
// HTTP, Express, PostgreSQL, Redis, etc.

// Manual spans
const span = tracer.startSpan('custom-operation');

try {
  await performOperation();
  span.setTag('operation', 'success');
} catch (error) {
  span.setTag('operation', 'failed');
  span.addTags({ error: error.message });
  throw error;
} finally {
  span.finish();
}
```

### Monitoring

```javascript
// Prometheus metrics
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path, status_code: res.statusCode },
      duration
    );
    
    httpRequestsTotal.inc(
      { method: req.method, route: req.route?.path, status_code: res.statusCode }
    );
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

---

## APIs en Node.js

### REST APIs

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// CRUD operations
app.get('/api/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});
```

### GraphQL

```javascript
const { ApolloServer, gql } = require('apollo-server-express');

const typeDefs = gql`
  type User { id: ID! name: String! email: String! }
  type Query { users: [User!]! }
`;

const server = new ApolloServer({ typeDefs, resolvers });
```

### WebSockets

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});
```

### API Versioning

```javascript
// URL versioning
app.get('/v1/users', v1Handler);
app.get('/v2/users', v2Handler);

// Header versioning
app.get('/users', (req, res) => {
  const version = req.headers['api-version'] || 'v1';
  version === 'v1' ? v1Handler(req, res) : v2Handler(req, res);
});
```

---

## Express.js Profundo

### Middlewares

```javascript
// Custom middleware
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
  });
  next();
}

function authenticate(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Error Handling

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message,
      ...(isDev && { stack: err.stack })
    }
  });
});
```

---

## Testing en Node.js

### Unit Testing with Jest

```javascript
const { sum } = require('./math');

describe('Math functions', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });

  test('async function', async () => {
    const result = await fetchData();
    expect(result).toBe('data');
  });
});
```

### Integration Testing

```javascript
const request = require('supertest');
const app = require('../app');

describe('User API', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### Mocking

```javascript
jest.mock('../models/User');

describe('UserService', () => {
  it('should return user by id', async () => {
    const mockUser = { id: 1, name: 'John' };
    User.findByPk.mockResolvedValue(mockUser);
    const user = await userService.getById(1);
    expect(user).toEqual(mockUser);
  });
});
```

---

## Node.js en Producción

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

### PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-app',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

### Graceful Shutdown

```javascript
function gracefulShutdown(signal) {
  server.close(async (err) => {
    await sequelize.close();
    await redis.quit();
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### Health Checks

```javascript
app.get('/health', (req, res) => {
  res.json({
    uptime: process.uptime(),
    status: 'OK',
    timestamp: Date.now()
  });
});
```

---

## Preguntas Técnicas Senior

### Event Loop

**Pregunta:** "¿Cómo funciona el Event Loop y por qué es importante?"

**Respuesta:** "El Event Loop es el corazón de Node.js que permite non-blocking I/O. Funciona en fases: timers, pending callbacks, poll, check, close callbacks. Entre cada fase se procesan microtasks (nextTick, promises). Es crítico porque permite miles de conexiones concurrentes con un solo thread, pero cualquier operación bloqueante afecta a todas. Monitoreo el event loop lag para detectar bloqueos."

### Memory Management

**Pregunta:** "¿Cómo manejas memory leaks?"

**Respuesta:** "Los memory leaks comunes incluyen: variables globales, event listeners no removidos, closures, caches sin límite. Para detectarlas, uso Chrome DevTools para heap snapshots o `heapdump` en producción. Para prevenirlas, uso WeakMap para caches, siempre remuevo event listeners, y LRU caches con límites."

### Streams & Backpressure

**Pregunta:** "¿Cómo manejas backpressure con streams?"

**Respuesta:** "Verifico el retorno de `write()` - si retorna false, pauso el readable y lo reanudo en 'drain'. En producción, prefiero `pipeline()` que maneja backpressure automáticamente. Los streams son esenciales para procesar datos grandes sin cargar todo en memoria."

### Clustering

**Pregunta:** "¿Cómo escalas una aplicación Node.js?"

**Respuesta:** "Para escalar verticalmente, aumento recursos y ajusto `--max-old-space-size` y `UV_THREADPOOL_SIZE`. Para horizontal, uso cluster module o contenedores Docker con Kubernetes. Consideraciones: sticky sessions para websockets, shared state con Redis, load balancing con NGINX, graceful shutdown."

### Error Handling

**Pregunta:** "¿Cuál es tu estrategia para errores en producción?"

**Respuesta:** "Estrategia multicapa: 1) Validación de input en el edge; 2) Custom error classes para diferenciar operacionales vs programáticos; 3) Error handling middleware; 4) Global handlers para uncaughtException/unhandledRejection; 5) Logging estructurado con contexto; 6) Alertas para errores críticos."

### V8 Optimization

**Pregunta:** "¿Cómo optimizas código JavaScript para V8?"

**Respuesta:** "Estrategias: 1) Inicializar propiedades en constructor para hidden classes estables; 2) Evitar cambiar estructura de objetos dinámicamente; 3) Usar arrays tipados para datos numéricos; 4) Evitar delete en hot paths; 5) Usar funciones arrow para `this`; 6) Minimizar boxing/unboxing. Uso Chrome DevTools Profiler para identificar deoptimizations."

### Race Conditions

**Pregunta:** "¿Cómo manejas race conditions?"

**Respuesta:** "Estrategias: 1) Transacciones de base de datos para operaciones atómicas; 2) Mutex/locks con Redis usando `SET NX`; 3) Optimist locking con version numbers; 4) Atomics con SharedArrayBuffer en Worker Threads; 5) Diseñar arquitectura idempotente; 6) Colas (BullMQ) para serializar operaciones críticas."

### Debugging Production

**Escenario:** "API lenta con timeouts. ¿Cómo investigas?"

**Respuesta:** "1) Verificar métricas - CPU, memoria, event loop lag; 2) Revisar logs recientes; 3) Usar tracing distribuido para identificar endpoint/lentitud; 4) CPU profile con `clinic`; 5) Verificar dependencias externas; 6) Revisar deployment reciente; 7) Habilitar modo debug en staging; 8) Documentar y agregar monitoreo."

---

## Roadmap Completo Senior Node.js

### Checklist de Conocimientos Senior

#### Fundamentos
- [ ] Arquitectura interna de Node.js (V8, libuv, Event Loop)
- [ ] Event Loop fases y microtasks/macrotasks
- [ ] process.nextTick() vs setImmediate() vs setTimeout()
- [ ] Single thread vs multi thread
- [ ] Thread Pool y Worker Threads
- [ ] Child Processes y Cluster module
- [ ] Buffers y Streams
- [ ] Memory Management y Garbage Collector
- [ ] EventEmitter
- [ ] Sistema de módulos (CommonJS vs ESM)

#### Streams Avanzados
- [ ] Readable, Writable, Duplex, Transform streams
- [ ] Backpressure handling
- [ ] Pipeline vs pipe
- [ ] Streams personalizados
- [ ] Casos reales de producción

#### Asincronismo
- [ ] Callbacks, Promises, Async/Await
- [ ] Promise combinators (all, allSettled, race, any)
- [ ] Race conditions y concurrency patterns
- [ ] Error handling avanzado
- [ ] Retry, timeout, cancellation patterns
- [ ] Queue systems

#### Performance
- [ ] Profiling (CPU, Memory)
- [ ] Performance hooks
- [ ] Bottlenecks detection
- [ ] Benchmarking
- [ ] Optimización de APIs, queries, I/O
- [ ] Caching strategies
- [ ] Connection pooling

#### Escalabilidad
- [ ] Horizontal vs vertical scaling
- [ ] Load balancing (NGINX, Node.js)
- [ ] PM2 y Cluster mode
- [ ] Queue systems (BullMQ, RabbitMQ, Kafka)
- [ ] Event-driven systems
- [ ] Microservices con Node.js

#### Seguridad
- [ ] JWT y OAuth2
- [ ] Session handling y cookies
- [ ] CSRF, CORS, XSS
- [ ] SQL/NoSQL injection
- [ ] SSRF prevention
- [ ] Rate limiting
- [ ] Helmet y security headers
- [ ] Password hashing (bcrypt, argon2)
- [ ] Secrets management
- [ ] Data validation

#### Testing
- [ ] Unit testing (Jest, Vitest)
- [ ] Integration testing
- [ ] E2E testing
- [ ] Mocking y Testcontainers
- [ ] Performance testing
- [ ] TDD
- [ ] Testing de streams y APIs

#### Producción
- [ ] Docker y Docker Compose
- [ ] PM2
- [ ] Kubernetes
- [ ] CI/CD
- [ ] Health checks
- [ ] Graceful shutdown
- [ ] Observabilidad (tracing, monitoring)
- [ ] Logs centralizados
- [ ] Zero downtime deployments

---

## Buenas Prácticas Senior

### Principios

1. **Performance First**: Siempre considerar el impacto en performance de cada decisión
2. **Observability**: Todo debe ser medible y debuggable
3. **Security**: Security by default, validación en el edge
4. **Scalability**: Diseñar para escalar desde el inicio
5. **Error Handling**: Errores operacionales vs programáticos
6. **Testing**: Cobertura alta, tests de integración críticos
7. **Documentation**: Código autodocumentado + documentación de arquitectura

### Anti Patrones a Evitar

1. **Bloquear el Event Loop**: Operaciones síncronas en hot paths
2. **Memory Leaks**: No limpiar event listeners, caches sin límite
3. **Callback Hell**: Anidación excesiva de callbacks
4. **Mixing Concerns**: Lógica de negocio en controladores
5. **Hardcoding**: Configuración en código
6. **Ignoring Errors**: No manejar promesas rechazadas
7. **N+1 Queries**: No optimizar queries de base de datos
8. **Secrets in Code**: Hardcodear credenciales

### Trade-offs Técnicos

**CommonJS vs ESM**: CommonJS para legacy, ESM para nuevos proyectos por tree-shaking

**Streams vs Buffers**: Streams para datos grandes, buffers para datos pequeños

**Worker Threads vs External Service**: Worker Threads para CPU-bound frecuente, external para esporádico

**SQL vs NoSQL**: SQL para relaciones complejas, NoSQL para esquema flexible

**Monolith vs Microservices**: Monolith para equipos pequeños, microservices para escala grande

---

## Cómo Responde un Senior en Entrevistas

### Mindset

1. **Piensa en Arquitectura**: No solo código, sino sistema completo
2. **Considera Trade-offs**: Siempre mencionar pros y contras
3. **Experiencia Real**: Usar ejemplos de producción, no solo teoría
3. **Deep Understanding**: Explicar "por qué", no solo "cómo"
5. **Problem Solving**: Enfoque sistemático a debugging
6. **Communication**: Claro y conciso, usar terminología correcta

### Ejemplo de Respuesta Senior

**Pregunta:** "¿Cómo implementarías un sistema de cache?"

**Respuesta Senior:** "Depende del caso de uso. Para cache simple en memoria, usaría una LRU cache con TTL. Para cache distribuido, Redis por performance y features. Implementaría cache-aside pattern para lectura, write-through para consistencia. Consideraría cache stampede protection con locks. Monitorearía hit ratio y ajustaría TTL según patrones de acceso. Para invalidación, usaría eventos o versioning. Trade-off: consistencia eventual vs latencia menor."

---

## Conclusión

Este roadmap cubre todo lo necesario para ser un Senior Backend Engineer especializado en Node.js. La clave es:

1. **Entender los fundamentos profundamente** - Internals de Node.js, V8, Event Loop
2. **Experiencia práctica** - Resolver problemas reales en producción
3. **Continuous Learning** - Mantenerse actualizado con nuevas features
4. **Arquitectura** - Diseñar sistemas escalables y mantenibles
5. **Debugging** - Ser experto en identificar y resolver problemas complejos

El éxito en entrevistas Senior demuestra no solo conocimiento técnico, sino capacidad de diseño arquitectónico, resolución de problemas, y comunicación efectiva.

---

**Happy Coding! 🚀**
