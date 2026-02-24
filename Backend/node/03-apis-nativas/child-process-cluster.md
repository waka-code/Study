# Child Process y Cluster

Node.js es single-threaded, pero puede aprovechar múltiples cores mediante child processes y clustering.

## Child Process Module

El módulo `child_process` permite ejecutar procesos externos y comandos del sistema.

### spawn() - Stream-based

Ejecuta comando y comunica vía streams. Ideal para procesos que generan mucha salida.

```javascript
const { spawn } = require('child_process');

// Ejecutar comando con argumentos
const ls = spawn('ls', ['-lh', '/usr']);

// Streams: stdout, stderr, stdin
ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

// Con opciones
const python = spawn('python', ['script.py'], {
  cwd: '/path/to/directory',      // Working directory
  env: { ...process.env, VAR: 'value' }, // Variables de entorno
  stdio: 'inherit'                 // Heredar stdio del padre
});

// Ejemplo: Ejecutar git
function runGit(args) {
  return new Promise((resolve, reject) => {
    const git = spawn('git', args);
    let output = '';
    let error = '';

    git.stdout.on('data', (data) => {
      output += data.toString();
    });

    git.stderr.on('data', (data) => {
      error += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(error || `Git exited with code ${code}`));
      }
    });
  });
}

// Uso
async function example() {
  try {
    const branch = await runGit(['branch', '--show-current']);
    console.log('Current branch:', branch);

    const status = await runGit(['status', '--short']);
    console.log('Git status:\n', status);
  } catch (err) {
    console.error('Git error:', err.message);
  }
}

// Comunicación bidireccional
const grep = spawn('grep', ['ssh']);

// Escribir a stdin
grep.stdin.write('some text with ssh\n');
grep.stdin.write('some text without\n');
grep.stdin.write('another line with ssh\n');
grep.stdin.end();

// Leer de stdout
grep.stdout.on('data', (data) => {
  console.log('Match:', data.toString());
});

// Pipeline de procesos
const { pipeline } = require('stream');
const fs = require('fs');

const cat = spawn('cat', ['large-file.txt']);
const grep = spawn('grep', ['error']);
const wc = spawn('wc', ['-l']);

// cat large-file.txt | grep error | wc -l
cat.stdout.pipe(grep.stdin);
grep.stdout.pipe(wc.stdin);

wc.stdout.on('data', (data) => {
  console.log(`Number of error lines: ${data}`);
});
```

### exec() - Buffer-based

Ejecuta comando en shell. Bufferiza toda la salida. Ideal para comandos cortos.

```javascript
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Callback version
exec('ls -lh', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }

  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }

  console.log(`stdout: ${stdout}`);
});

// Promise version (recomendado)
async function runCommand(command) {
  try {
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.warn('Warning:', stderr);
    }

    return stdout.trim();
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

// Uso
async function example() {
  // Ejecutar múltiples comandos
  const nodeVersion = await runCommand('node --version');
  const npmVersion = await runCommand('npm --version');

  console.log('Node:', nodeVersion);
  console.log('npm:', npmVersion);

  // Con timeout
  try {
    const output = await execPromise('sleep 10', { timeout: 5000 });
  } catch (err) {
    console.error('Timeout!', err.message);
  }

  // Con maxBuffer
  try {
    const output = await execPromise('cat huge-file.txt', {
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });
  } catch (err) {
    console.error('Output too large:', err.message);
  }
}

// ⚠️ PELIGRO: Evitar inyección de comandos
// ❌ NUNCA hacer esto con input del usuario:
const userInput = req.query.filename;
exec(`cat ${userInput}`); // Vulnerable a command injection!

// ✅ Usar spawn con argumentos separados:
spawn('cat', [userInput]); // Seguro
```

### execFile() - Sin shell

Ejecuta archivo ejecutable directamente (sin shell). Más seguro y eficiente.

```javascript
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFilePromise = promisify(execFile);

// Ejecutar binario
async function runBinary(file, args = []) {
  try {
    const { stdout, stderr } = await execFilePromise(file, args);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to execute ${file}: ${error.message}`);
  }
}

// Ejemplo: Ejecutar script de Python
async function runPythonScript(scriptPath, args = []) {
  return await runBinary('python', [scriptPath, ...args]);
}

const result = await runPythonScript('./script.py', ['--verbose']);

// Ejecutar script Node
async function runNodeScript(scriptPath) {
  return await runBinary(process.execPath, [scriptPath]);
}
```

### fork() - Child process de Node.js

Crea proceso Node.js hijo con IPC (Inter-Process Communication).

```javascript
const { fork } = require('child_process');

// Parent process
const child = fork('./child.js');

// Enviar mensaje al hijo
child.send({ type: 'task', data: { id: 1, value: 100 } });

// Recibir mensaje del hijo
child.on('message', (message) => {
  console.log('Message from child:', message);
});

// Manejar errores
child.on('error', (error) => {
  console.error('Child error:', error);
});

// Detectar cuando termina
child.on('exit', (code, signal) => {
  console.log(`Child exited with code ${code}`);
});

// =========================================
// child.js
// =========================================
process.on('message', (message) => {
  console.log('Message from parent:', message);

  if (message.type === 'task') {
    // Procesar tarea
    const result = processTask(message.data);

    // Enviar resultado al padre
    process.send({ type: 'result', data: result });
  }
});

function processTask(data) {
  // Procesamiento pesado
  return { id: data.id, result: data.value * 2 };
}

// =========================================
// Worker pool con fork
// =========================================
class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];

    this.initWorkers();
  }

  initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = fork(this.workerScript);

      worker.on('message', (message) => {
        // Worker está libre, procesar siguiente tarea
        if (message.type === 'ready') {
          this.assignTask(worker);
        }
      });

      worker.on('error', (error) => {
        console.error('Worker error:', error);
      });

      worker.on('exit', (code) => {
        console.log(`Worker exited with code ${code}`);
        // Reemplazar worker muerto
        const index = this.workers.indexOf(worker);
        if (index > -1) {
          this.workers.splice(index, 1);
          this.initWorkers();
        }
      });

      this.workers.push(worker);
    }
  }

  assignTask(worker) {
    if (this.queue.length === 0) return;

    const task = this.queue.shift();
    worker.send({ type: 'task', data: task.data });

    worker.once('message', (message) => {
      if (message.type === 'result') {
        task.resolve(message.data);
      } else if (message.type === 'error') {
        task.reject(new Error(message.error));
      }

      // Worker está libre nuevamente
      this.assignTask(worker);
    });
  }

  execute(data) {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });

      // Intentar asignar a worker libre
      const freeWorker = this.workers.find(w => w.connected);
      if (freeWorker) {
        this.assignTask(freeWorker);
      }
    });
  }

  destroy() {
    this.workers.forEach(worker => worker.kill());
    this.workers = [];
  }
}

// Uso
const pool = new WorkerPool('./worker.js', 4);

async function processTasks() {
  const tasks = [
    { id: 1, value: 100 },
    { id: 2, value: 200 },
    { id: 3, value: 300 }
  ];

  const results = await Promise.all(
    tasks.map(task => pool.execute(task))
  );

  console.log('Results:', results);
}
```

## Cluster Module

Permite crear múltiples procesos Node.js que comparten el mismo puerto.

### Clustering Básico

```javascript
const cluster = require('cluster');
const http = require('http');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Manejar workers que mueren
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker...');
    cluster.fork();
  });

  // Comunicación con workers
  cluster.on('message', (worker, message) => {
    console.log(`Message from worker ${worker.id}:`, message);
  });

} else {
  // Worker code
  const server = http.createServer((req, res) => {
    // Simular trabajo pesado
    const start = Date.now();
    while (Date.now() - start < 100) {} // Block por 100ms

    res.writeHead(200);
    res.end(`Handled by worker ${process.pid}\n`);
  });

  server.listen(3000);
  console.log(`Worker ${process.pid} started`);
}
```

### Cluster con Express

```javascript
const cluster = require('cluster');
const express = require('express');
const os = require('os');

if (cluster.isMaster) {
  const numWorkers = process.env.WEB_CONCURRENCY || os.cpus().length;

  console.log(`Master ${process.pid} starting ${numWorkers} workers...`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code}`);

    if (!worker.exitedAfterDisconnect) {
      console.log('Worker crashed. Starting a new worker...');
      cluster.fork();
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');

    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown');
      cluster.workers[id].disconnect();
    }

    setTimeout(() => {
      console.log('Forcing shutdown');
      process.exit(0);
    }, 10000);
  });

} else {
  const app = express();

  app.get('/', (req, res) => {
    res.send(`Hello from worker ${process.pid}`);
  });

  app.get('/heavy', (req, res) => {
    // Simular operación pesada
    const start = Date.now();
    while (Date.now() - start < 5000) {}
    res.send('Done');
  });

  const server = app.listen(3000, () => {
    console.log(`Worker ${process.pid} listening on port 3000`);
  });

  // Graceful shutdown en worker
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      console.log(`Worker ${process.pid} shutting down...`);

      server.close(() => {
        console.log(`Worker ${process.pid} closed all connections`);
        process.exit(0);
      });

      setTimeout(() => {
        console.error(`Worker ${process.pid} forcing shutdown`);
        process.exit(1);
      }, 5000);
    }
  });
}
```

### Cluster Manager Avanzado

```javascript
const cluster = require('cluster');
const os = require('os');

class ClusterManager {
  constructor(options = {}) {
    this.workerScript = options.workerScript;
    this.workers = options.workers || os.cpus().length;
    this.restartDelay = options.restartDelay || 1000;
    this.maxRestarts = options.maxRestarts || 10;
    this.workerRestarts = new Map();
  }

  start() {
    if (!cluster.isMaster) {
      throw new Error('ClusterManager must run in master process');
    }

    console.log(`Starting ${this.workers} workers...`);

    for (let i = 0; i < this.workers; i++) {
      this.forkWorker();
    }

    cluster.on('exit', (worker, code, signal) => {
      this.handleWorkerExit(worker, code, signal);
    });

    this.setupSignalHandlers();
  }

  forkWorker() {
    const worker = cluster.fork();
    const workerId = worker.id;

    worker.on('message', (msg) => {
      this.handleWorkerMessage(workerId, msg);
    });

    return worker;
  }

  handleWorkerExit(worker, code, signal) {
    const workerId = worker.id;

    console.log(`Worker ${workerId} died (code: ${code}, signal: ${signal})`);

    // No reiniciar si fue shutdown intencional
    if (worker.exitedAfterDisconnect) {
      return;
    }

    // Limitar reintentos
    const restarts = this.workerRestarts.get(workerId) || 0;

    if (restarts >= this.maxRestarts) {
      console.error(`Worker ${workerId} exceeded max restarts`);
      return;
    }

    this.workerRestarts.set(workerId, restarts + 1);

    // Restart con delay
    setTimeout(() => {
      console.log(`Restarting worker ${workerId}...`);
      this.forkWorker();
    }, this.restartDelay);
  }

  handleWorkerMessage(workerId, message) {
    switch (message.type) {
      case 'metric':
        console.log(`Worker ${workerId} metric:`, message.data);
        break;

      case 'error':
        console.error(`Worker ${workerId} error:`, message.error);
        break;

      default:
        console.log(`Worker ${workerId} message:`, message);
    }
  }

  setupSignalHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  shutdown(signal) {
    console.log(`${signal} received, shutting down cluster...`);

    const workers = Object.values(cluster.workers);

    workers.forEach((worker) => {
      worker.send('shutdown');
      worker.disconnect();
    });

    // Force kill después de timeout
    setTimeout(() => {
      workers.forEach((worker) => {
        if (!worker.isDead()) {
          console.log(`Force killing worker ${worker.id}`);
          worker.kill();
        }
      });

      process.exit(0);
    }, 10000);
  }

  // Broadcast a todos los workers
  broadcast(message) {
    for (const id in cluster.workers) {
      cluster.workers[id].send(message);
    }
  }

  // Restart todos los workers (zero-downtime)
  async restartAll() {
    const workers = Object.values(cluster.workers);

    for (const worker of workers) {
      await this.restartWorker(worker);
      await this.delay(1000); // Delay entre restarts
    }
  }

  restartWorker(worker) {
    return new Promise((resolve) => {
      const newWorker = this.forkWorker();

      newWorker.once('listening', () => {
        worker.disconnect();
        resolve();
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Uso
if (cluster.isMaster) {
  const manager = new ClusterManager({
    workers: 4,
    restartDelay: 2000,
    maxRestarts: 5
  });

  manager.start();

  // Reload config en todos los workers
  setInterval(() => {
    manager.broadcast({ type: 'reload-config' });
  }, 60000);
}
```

## Comparación: ¿Cuándo usar qué?

```javascript
// spawn - Comandos largos con mucha salida
spawn('ffmpeg', ['-i', 'input.mp4', 'output.avi']);

// exec - Comandos cortos con salida pequeña
exec('git rev-parse HEAD');

// execFile - Ejecutar binarios de forma segura
execFile('./my-binary', ['--flag']);

// fork - Procesar tareas pesadas en Node.js
fork('./heavy-computation.js');

// cluster - Escalar servidor HTTP en múltiples cores
cluster.fork(); // En servidor HTTP
```

## Pregunta de Entrevista

**P: ¿Cuál es la diferencia entre cluster y child_process? ¿Cuándo usarías cada uno?**

**R:**

**Child Process:**
- Propósito general para ejecutar procesos externos
- Puede ejecutar cualquier comando/binario
- No comparte puerto automáticamente
- Usado para: scripts, comandos del sistema, tareas pesadas aisladas

**Cluster:**
- Específicamente para escalar servidores HTTP
- Solo ejecuta código Node.js (clones del proceso actual)
- Comparte puerto automáticamente (load balancing built-in)
- Usado para: aprovechar múltiples CPUs en servidor web

**Casos de uso:**

**Usa child_process cuando:**
- Necesitas ejecutar comando del sistema (git, ffmpeg, etc.)
- Procesamiento en background (enviar emails, generar PDFs)
- Ejecutar scripts en otros lenguajes (Python, Ruby)
- Tareas one-off que no necesitan comunicación frecuente

**Usa cluster cuando:**
- Servidor HTTP/API que necesita manejar más requests
- Aprovechar todos los cores de CPU
- Necesitas alta disponibilidad (workers se reinician automáticamente)
- Load balancing automático entre workers

**Comparación:**

```javascript
// ❌ Ineficiente: Un solo proceso HTTP
http.createServer((req, res) => {
  res.end('Hello');
}).listen(3000);
// Solo usa 1 CPU de 8 disponibles

// ✅ Cluster: Escala a todos los CPUs
if (cluster.isMaster) {
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
} else {
  http.createServer((req, res) => {
    res.end(`Worker ${process.pid}`);
  }).listen(3000);
}
// Usa todos los CPUs, ~8x más throughput

// ✅ Child Process: Tarea pesada en background
app.post('/generate-report', (req, res) => {
  const child = fork('./generate-report.js');
  child.send({ userId: req.user.id });

  child.on('message', (result) => {
    res.json({ reportId: result.id });
  });
});
```

**Nota:** En producción moderna, cluster muchas veces se reemplaza con:
- PM2 (process manager)
- Docker/Kubernetes (container orchestration)
- Serverless (auto-scaling)

## Referencias

- [Child Process](https://nodejs.org/api/child_process.html)
- [Cluster](https://nodejs.org/api/cluster.html)
- Ver: `08-performance/clustering.md` para patrones avanzados de clustering
- Ver: `12-devops/pm2-process-manager.md` para alternativas en producción
