# Event Loop Monitoring

## Event Loop Lag (Retraso)

El event loop puede saturarse si hay código sincrónico pesado o promises pendientes:

```javascript
// ❌ MAL: Bloquea event loop
function slowSync() {
  for (let i = 0; i < 1e9; i++) {
    Math.sqrt(i);
  }
}

// ✅ BIEN: Permite otros callbacks
async function slowAsync() {
  for (let i = 0; i < 1e9; i++) {
    Math.sqrt(i);
    if (i % 1e8 === 0) {
      await new Promise(r => setImmediate(r));
    }
  }
}
```

## Detectar Event Loop Lag

### Con setTimeout

```javascript
let lastCheck = Date.now();
let lagTotal = 0;
let lagCount = 0;

setInterval(() => {
  const now = Date.now();
  const expectedDelay = 1000; // Cada 1 segundo
  const actualDelay = now - lastCheck;
  const lag = actualDelay - expectedDelay;

  if (lag > 0) {
    lagTotal += lag;
    lagCount++;
    console.log(`Event loop lag: ${lag}ms`);
  }

  lastCheck = now;
}, 1000);

// Mostrar promedio cada 60 segundos
setInterval(() => {
  if (lagCount > 0) {
    const avgLag = lagTotal / lagCount;
    console.log(`Average lag: ${avgLag.toFixed(2)}ms (${lagCount} samples)`);
    lagTotal = 0;
    lagCount = 0;
  }
}, 60000);
```

### Con Module `perf_hooks`

```javascript
const { performance, PerformanceObserver } = require('perf_hooks');

const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    if (entry.duration > 100) {
      console.warn(`Slow operation: ${entry.name} took ${entry.duration}ms`);
    }
  });
});

obs.observe({ entryTypes: ['measure'] });

// Usar
performance.mark('operation-start');
// ... código
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');
```

### Con `lightfuzz/toobusy`

```javascript
const toobusy = require('toobusy-js');

toobusy.maxLag(100); // Considera ocupado si lag > 100ms

app.use((req, res, next) => {
  if (toobusy()) {
    res.status(503).json({ error: 'Server too busy' });
  } else {
    next();
  }
});

// Log cuando está ocupado
toobusy.onLag((lag) => {
  console.warn(`Event loop lag: ${lag}ms`);
});

process.on('exit', () => {
  toobusy.shutdown();
});
```

## Monitoreo de Timers Pendientes

```javascript
class TimerMonitor {
  constructor() {
    this.timers = new Map();
    this.nextId = 0;
  }

  setTimeout(fn, delay) {
    const id = ++this.nextId;
    const timer = global.setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, delay);
    this.timers.set(id, { fn: fn.toString(), delay, created: Date.now() });
    return timer;
  }

  setInterval(fn, delay) {
    const id = ++this.nextId;
    const timer = global.setInterval(fn, delay);
    this.timers.set(id, { fn: fn.toString(), delay, created: Date.now(), interval: true });
    return timer;
  }

  getStatus() {
    const pending = Array.from(this.timers.values());
    const totalDelay = pending.reduce((sum, t) => sum + t.delay, 0);
    return {
      pending: pending.length,
      totalDelay,
      items: pending
    };
  }
}

const monitor = new TimerMonitor();

// Monitorear periódicamente
setInterval(() => {
  const status = monitor.getStatus();
  if (status.pending > 10) {
    console.warn(`Many pending timers: ${status.pending}`);
  }
}, 30000);
```

## Detectar Promises Pendientes

```javascript
const asyncHooks = require('async_hooks');
const fs = require('fs');

const promises = new Map();

const hook = asyncHooks.createHook({
  init(asyncId, type) {
    if (type === 'PROMISE') {
      promises.set(asyncId, {
        created: Date.now(),
        asyncId
      });
    }
  },
  destroy(asyncId) {
    promises.delete(asyncId);
  }
});

hook.enable();

// Monitorear promises pendientes
setInterval(() => {
  const pending = promises.size;
  if (pending > 50) {
    console.warn(`Many pending promises: ${pending}`);
    const items = Array.from(promises.values()).slice(0, 5);
    console.log('Sample:', items);
  }
}, 30000);
```

## Métricas del Proceso

```javascript
function getMetrics() {
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  return {
    memory: {
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`, // Memoria residente
      external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`
    },
    uptime: `${uptime.toFixed(2)}s`,
    cpu: process.cpuUsage(),
    handles: process._getActiveHandles().length,
    requests: process._getActiveRequests().length
  };
}

// Log cada 60 segundos
setInterval(() => {
  console.log('Process metrics:', getMetrics());
}, 60000);
```

## Health Endpoint con Monitoreo

```javascript
const express = require('express');
const app = express();

let eventLoopLag = 0;
let lastCheck = Date.now();

// Monitorear lag
setInterval(() => {
  const now = Date.now();
  const lag = now - lastCheck - 1000;
  eventLoopLag = Math.max(0, lag);
  lastCheck = now;
}, 1000);

app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    eventLoopLag: `${eventLoopLag}ms`,
    memory: {
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: (mem.rss / 1024 / 1024).toFixed(2)
    },
    handles: process._getActiveHandles().length,
    requests: process._getActiveRequests().length
  };

  res.json(metrics);
});

app.get('/health', (req, res) => {
  const isHealthy = eventLoopLag < 100 &&
    process.memoryUsage().heapUsed < (process.memoryUsage().heapTotal * 0.9);

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    lag: eventLoopLag
  });
});

app.listen(3000);
```

## APM Integración

Usar servicios como New Relic, Datadog, o Elastic:

```javascript
// newrelic integration
const newrelic = require('newrelic');
const express = require('express');

const app = express();

// Automatic instrumentation
app.get('/api/users', (req, res) => {
  // Registra automáticamente tiempo, errores, etc
  res.json([]);
});

app.listen(3000);
```

## Problemas Comunes

| Síntoma | Causa | Solución |
|--------|-------|----------|
| Lag > 100ms | Código sincrónico | Usar async/await |
| Memory leak | Objetos no liberados | Revisar closures |
| Muchos timers | setInterval sin cleanup | Usar clearInterval |
| Promises colgadas | Sin .catch() | Usar catch/finally |

## Referencias

- [clustering.md](./clustering.md)
- [profiling-memory.md](./profiling-memory.md)
- [graceful-shutdown.md](../07-errores-estabilidad/graceful-shutdown.md)

## Pregunta de Entrevista

**¿Qué significa "Event Loop Lag" y cómo lo detecta?**

Event Loop Lag es el retraso entre cuando se espera que se ejecute un callback y cuándo realmente se ejecuta. Se detecta con setInterval: si espera 1000ms pero pasan 1050ms, el lag es 50ms. Indica que el event loop está ocupado (código sincrónico pesado).
