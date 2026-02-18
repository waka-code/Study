# Clustering y Balanceo de Carga

## Node.js Cluster Module

Usa múltiples procesos para aprovechar CPU multi-core:

```javascript
const cluster = require('cluster');
const os = require('os');
const http = require('http');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Manejar muerte de workers
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Reiniciar worker
  });
} else {
  // Código del worker
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Response from worker ${process.pid}\n`);
  });

  server.listen(3000);
  console.log(`Worker process ${process.pid} started`);
}
```

## Con Express

```javascript
const cluster = require('cluster');
const os = require('os');
const express = require('express');

const numCPUs = os.cpus().length;
const PORT = 3000;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Crear workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Reiniciar workers si mueren
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });

  // Monitorear workers
  setInterval(() => {
    const workers = Object.values(cluster.workers);
    console.log(`${workers.length} workers online`);
  }, 30000);

} else {
  // Código de worker
  const app = express();

  app.get('/', (req, res) => {
    res.json({
      message: 'Hello from worker',
      pid: process.pid
    });
  });

  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} listening on port ${PORT}`);
  });
}
```

## Balanceo de Carga

El SO automáticamente distribuye conexiones entre workers:

```
Requests → Nginx/Proxy
          ↓
      ┌───┬───┬───┐
      v   v   v   v
    W1  W2  W3  W4 (workers/cores)
      └───┴───┴───┘
          ↓
         DB
```

## Shared State (Problema)

```javascript
// ❌ MAL: Estado no compartido
let counter = 0;

if (cluster.isMaster) {
  for (let i = 0; i < 4; i++) cluster.fork();
} else {
  app.get('/counter', (req, res) => {
    counter++;
    res.json({ counter }); // Cada worker tiene su propio counter
  });
}

// ✅ BIEN: Usar Redis/DB para estado compartido
const redis = require('redis');
const client = redis.createClient();

app.get('/counter', async (req, res) => {
  const value = await client.incr('counter');
  res.json({ counter: value }); // Compartido entre workers
});
```

## Graceful Restart de Workers

```javascript
const cluster = require('cluster');
const os = require('os');
const express = require('express');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  const workers = [];

  // Fork initial workers
  for (let i = 0; i < numCPUs; i++) {
    workers.push(cluster.fork());
  }

  // Graceful reload
  process.on('SIGHUP', () => {
    console.log('SIGHUP: Reloading workers...');
    const newWorkers = [];

    for (let i = 0; i < numCPUs; i++) {
      newWorkers.push(cluster.fork());
    }

    // Esperar a que nuevos workers estén listos
    setTimeout(() => {
      workers.forEach(w => w.kill());
      console.log('Old workers terminated');
    }, 5000);
  });

  cluster.on('exit', (worker) => {
    const idx = workers.indexOf(worker);
    if (idx !== -1) {
      workers.splice(idx, 1);
    }
  });

} else {
  const app = express();
  app.listen(3000);
}
```

## PM2 Clustering (Recomendado)

PM2 maneja clustering automáticamente:

```bash
# Iniciar en cluster mode
pm2 start app.js -i max

# Ver status
pm2 status

# Reload graceful
pm2 reload app

# Restart
pm2 restart app
```

### Archivo de Configuración

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './app.js',
    instances: 'max', // Usar todos los cores
    exec_mode: 'cluster', // Modo cluster
    env: {
      NODE_ENV: 'production'
    },
    // Graceful shutdown
    kill_timeout: 10000,
    // Restart si falla
    max_memory_restart: '500M',
    // Logs
    out_file: './logs/out.log',
    error_file: './logs/error.log'
  }]
};
```

```bash
pm2 start ecosystem.config.js
```

## Comparación de Opciones

| Opción | Pros | Contras |
|--------|------|---------|
| **Sin cluster** | Simple, debugging fácil | 1 core, reinicio lento |
| **Node cluster** | Control total | Manual, complejo |
| **PM2** | Fácil, robusto, monitoreo | Dependencia externa |
| **Docker + Orchestration** | Escalable, portable | Más complejo |

## Monitoreo de Clustering

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Métricas cada 30s
  setInterval(() => {
    const workers = Object.values(cluster.workers);
    const memory = workers.reduce((sum, w) => {
      return sum + (w.process.memoryUsage().heapUsed / 1024 / 1024);
    }, 0);

    console.log({
      workers: workers.length,
      memoryMB: memory.toFixed(2)
    });
  }, 30000);

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} exited`);
    cluster.fork();
  });
}
```

## Load Testing

```bash
# Con Apache Bench
ab -n 10000 -c 100 http://localhost:3000/

# Con wrk
wrk -t4 -c100 -d30s http://localhost:3000/

# Comparar sin cluster vs con cluster
```

### Resultados Esperados

```
Sin cluster:  5,000 req/s
Con 4 cores: 15,000+ req/s (3x mejora)
```

## Referencias

- [event-loop-monitoring.md](./event-loop-monitoring.md)
- [profiling-memory.md](./profiling-memory.md)
- [pm2-process-manager.md](../12-devops/pm2-process-manager.md)

## Pregunta de Entrevista

**¿Por qué Node.js con clustering es más rápido si JavaScript es single-threaded?**

JavaScript es single-threaded en UN proceso. Con clustering, Node.js crea MÚLTIPLES procesos, cada uno con su propio event loop. El OS distribuye conexiones entre procesos, permitiendo usar todos los CPU cores. No es true multi-threading, son procesos independientes.

## Procesos Independientes

En el contexto de Node.js y clustering, los procesos independientes se refieren a múltiples instancias de un programa que se ejecutan de manera separada, cada una con su propio event loop, memoria y recursos. Aunque JavaScript es un lenguaje de un solo hilo (single-threaded), el módulo `cluster` de Node.js permite crear múltiples procesos que trabajan en paralelo, aprovechando todos los núcleos de la CPU disponibles.

Cada proceso independiente es una copia del proceso principal (master) y puede manejar solicitudes de manera autónoma. El sistema operativo se encarga de distribuir las conexiones entrantes entre los diferentes procesos, lo que mejora significativamente el rendimiento y la capacidad de manejo de solicitudes concurrentes.

**Ventajas de los procesos independientes:**
- **Escalabilidad:** Permiten utilizar todos los núcleos de la CPU, maximizando el rendimiento.
- **Aislamiento:** Un fallo en un proceso no afecta a los demás, mejorando la estabilidad de la aplicación.
- **Reinicio automático:** Si un proceso falla, el proceso principal puede reiniciarlo automáticamente.

**Ejemplo básico:**
```javascript
const cluster = require('cluster');
const os = require('os');
const http = require('http');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);

  // Crear procesos independientes
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Reiniciar el proceso
  });
} else {
  // Código del worker
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Response from worker ${process.pid}\n`);
  });

  server.listen(3000);
  console.log(`Worker process ${process.pid} started`);
}
```

En este ejemplo, el proceso principal (master) crea múltiples procesos (workers) que comparten la carga de trabajo. Cada worker es un proceso independiente que puede manejar solicitudes de manera autónoma.
