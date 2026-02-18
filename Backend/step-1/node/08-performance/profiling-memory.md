# Profiling de CPU y Memoria

## Monitoreo Básico de Memoria

```javascript
const formatMem = (bytes) => {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

// Log periódico
setInterval(() => {
  const mem = process.memoryUsage();
  console.log({
    heapUsed: formatMem(mem.heapUsed),
    heapTotal: formatMem(mem.heapTotal),
    rss: formatMem(mem.rss),
    external: formatMem(mem.external)
  });
}, 10000);

// Antes y después
console.log('Before:', process.memoryUsage().heapUsed);
const arr = new Array(1e6).fill('x');
console.log('After:', process.memoryUsage().heapUsed);
```

## Detectar Memory Leaks

### Patrón: Acumulación

```javascript
// ❌ MAL: Memory leak
let cache = [];

app.get('/data', (req, res) => {
  cache.push({ data: req.query.data });
  res.json({ cached: cache.length });
});

// Cada request agrega item → memory leak

// ✅ BIEN: Limpiar periódicamente
const LRU = require('lru-cache');
const cache = new LRU({ max: 1000 }); // Max 1000 items

app.get('/data', (req, res) => {
  cache.set(req.query.key, req.query.data);
  res.json({ cached: cache.size });
});
```

### Patrón: Event Listeners

```javascript
// ❌ MAL: Listeners acumulados
function loadData() {
  const stream = fs.createReadStream('file.txt');
  stream.on('data', (chunk) => {
    // Procesar
  });
  // ¿on('end')? ¿stream.destroy()?
}

// Cada llamada agrega listener

// ✅ BIEN: Cleanup explícito
function loadData() {
  const stream = fs.createReadStream('file.txt');
  let data = '';

  stream.on('data', (chunk) => {
    data += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(data);
    });
    stream.on('error', reject);
    stream.on('close', () => {
      // Limpieza implícita
    });
  });
}
```

## Heap Snapshots (Inspección Manual)

```javascript
const fs = require('fs');
const v8 = require('v8');

// Tomar snapshot
function takeHeapSnapshot() {
  const filename = `heap-${Date.now()}.heapsnapshot`;
  const snapshot = v8.writeHeapSnapshot(filename);
  console.log(`Snapshot saved: ${filename}`);
}

// Endpoint para disparar snapshot
app.get('/debug/heap-snapshot', (req, res) => {
  takeHeapSnapshot();
  res.json({ ok: true });
});

// Usar desde CLI
// node --inspect app.js
// Luego en DevTools: Memory → Take snapshot
```

## Profiling de CPU

### Con Node Inspector

```bash
# Iniciar con inspector
node --inspect app.js

# O con --inspect-brk (pausa al inicio)
node --inspect-brk app.js

# Abrir en: chrome://inspect
```

### Programáticamente

```javascript
const v8Profiler = require('v8-profiler-next');

// Iniciar profiling
v8Profiler.startProfiling();

// ... código a perfilar ...

// Parar y obtener profile
const profile = v8Profiler.stopProfiling();

// Escribir a archivo
profile.export((err, data) => {
  if (!err) {
    require('fs').writeFileSync('profile.json', data);
    profile.delete();
  }
});
```

## Herramientas de Análisis

### Clinic.js

```bash
npm install -g clinic

# Profiling
clinic doctor -- node app.js

# Luego acceder a http://localhost:8000
# Ve recomendaciones automáticas
```

### Autocannon (Load Testing + Profiling)

```bash
npm install -g autocannon

# Test mientras monitorea
autocannon -c 100 -d 30 http://localhost:3000
```

## Memory Leak Detection Pattern

```javascript
class MemoryMonitor {
  constructor(threshold = 100) {
    this.threshold = threshold; // MB
    this.readings = [];
    this.checkInterval = null;
  }

  start(intervalMs = 5000) {
    this.checkInterval = setInterval(() => {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      this.readings.push({
        timestamp: Date.now(),
        value: used
      });

      // Mantener últimas 100 lecturas
      if (this.readings.length > 100) {
        this.readings.shift();
      }

      // Detectar leak: aumento consistente
      if (this.readings.length >= 10) {
        const trend = this.calculateTrend();
        if (trend > 5) { // 5 MB/min
          console.warn('Possible memory leak detected!');
          console.warn('Current:', used.toFixed(2), 'MB');
          console.warn('Trend:', trend.toFixed(2), 'MB/min');
        }
      }
    }, intervalMs);
  }

  calculateTrend() {
    const recent = this.readings.slice(-10);
    if (recent.length < 2) return 0;

    const timespan = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000 / 60; // minutos
    const memChange = recent[recent.length - 1].value - recent[0].value;

    return memChange / timespan;
  }

  stop() {
    clearInterval(this.checkInterval);
  }
}

const monitor = new MemoryMonitor();
monitor.start();

// Aplicación
const app = require('express')();
app.listen(3000);
```

## Garbage Collection Monitoring

```javascript
const perfHooks = require('perf_hooks');

// Detectar GC pausas
const obs = new perfHooks.PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('gc')) {
      const duration = entry.duration;
      const type = entry.detail.kind;

      if (duration > 50) {
        console.warn(`Long GC pause: ${duration.toFixed(2)}ms (type: ${type})`);
      }
    }
  }
});

obs.observe({ entryTypes: ['gc'], buffered: true });
```

### Con V8 Flags

```bash
# Ver estadísticas de GC
node --trace-gc app.js 2>&1 | grep GC

# Más detalle
node --trace-gc --trace-gc-verbose app.js

# Aumentar tamaño de heap si GC ocurre mucho
node --max-old-space-size=4096 app.js  # 4GB
```

## Comparación de Herramientas

| Herramienta | Uso | Overhead |
|------------|-----|----------|
| `process.memoryUsage()` | Monitoreo básico | Mínimo |
| Heap snapshots | Análisis profundo | Alto |
| V8 Profiler | CPU profiling | Medio |
| Clinic.js | Análisis integral | Alto |
| `--trace-gc` | GC analysis | Bajo-Medio |

## Checklist de Optimización

```javascript
// ✅ Checklist
// 1. Monitor memory regularly
setInterval(() => {
  const mem = process.memoryUsage();
  if (mem.heapUsed > 500e6) { // > 500MB
    console.warn('High memory usage');
  }
}, 30000);

// 2. Limpiar event listeners
stream.on('data', handler);
stream.once('end', () => {
  stream.removeListener('data', handler);
});

// 3. Usar límites de cache
const cache = new LRU({ max: 1000 });

// 4. Destruir streams/connections
fs.createReadStream(file)
  .pipe(destination)
  .on('finish', () => {
    destination.destroy();
  });

// 5. Usar const/let, no global
let bad = 'global';
const good = 'scoped';
```

## Referencias

- [event-loop-monitoring.md](./event-loop-monitoring.md)
- [clustering.md](./clustering.md)
- [logs-monitoring.md](../12-devops/logs-monitoring.md)

## Pregunta de Entrevista

**¿Cómo detecta un memory leak en Node.js?**

Monitorea `process.memoryUsage().heapUsed` periódicamente. Si crece consistentemente sin bajar (incluso después de GC), hay leak. Use heap snapshots para comparar antes/después, o Clinic.js para análisis automático. Causas: referencias globales no liberadas, event listeners sin cleanup, caches sin límite.
