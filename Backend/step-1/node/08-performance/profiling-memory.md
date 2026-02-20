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

## Causas Comunes de Memory Leaks

### 1. Variables Globales que Crecen

```javascript
// ❌ Acumula indefinidamente
const logs = [];
app.use((req, res, next) => {
  logs.push({ url: req.url, time: Date.now() }); // Nunca se limpia
  next();
});

// ✅ Límite fijo
const logs = [];
const MAX_LOGS = 1000;
app.use((req, res, next) => {
  if (logs.length >= MAX_LOGS) logs.shift(); // Elimina el más viejo
  logs.push({ url: req.url, time: Date.now() });
  next();
});
```

### 2. Closures que Retienen Objetos Grandes

```javascript
// ❌ La closure retiene bigData aunque ya no se necesite
function processData() {
  const bigData = new Array(1e6).fill('x'); // 8MB

  return function getFirst() {
    return bigData[0]; // bigData nunca se libera mientras getFirst exista
  };
}

const getFirst = processData();
// bigData sigue en memoria mientras getFirst esté referenciado

// ✅ Extraer solo lo necesario
function processData() {
  const bigData = new Array(1e6).fill('x');
  const first = bigData[0]; // Solo guarda lo que necesitas

  return function getFirst() {
    return first; // bigData puede ser GC'd
  };
}
```

### 3. Timers / Intervals sin Limpiar

```javascript
// ❌ El interval mantiene vivo el objeto user y su scope
function startUserSession(user) {
  const interval = setInterval(() => {
    ping(user.id); // Referencia a user → no puede ser GC'd
  }, 5000);
  // ¿Quién limpia este interval?
}

// ✅ Cleanup explícito
function startUserSession(user) {
  const interval = setInterval(() => {
    ping(user.id);
  }, 5000);

  return function cleanup() {
    clearInterval(interval); // user puede ser GC'd después de esto
  };
}

const cleanup = startUserSession(user);
// Cuando la sesión termina:
cleanup();
```

### 4. Event Listeners sin Remover

```javascript
// ❌ Cada llamada agrega un listener nuevo
function setupFeature(emitter) {
  emitter.on('data', (chunk) => {
    processChunk(chunk);
  });
}

// Si setupFeature se llama 100 veces → 100 listeners acumulados
// Node lanza warning: MaxListenersExceededWarning

// ✅ Remover listener cuando ya no se necesita
function setupFeature(emitter) {
  const handler = (chunk) => processChunk(chunk);

  emitter.on('data', handler);

  return function teardown() {
    emitter.off('data', handler); // o emitter.removeListener('data', handler)
  };
}

// ✅ Alternativa: usar once() si solo necesitas el primer evento
emitter.once('data', (chunk) => processChunk(chunk));
```

### 5. Caches sin Límite ni Expiración

```javascript
// ❌ Cache que crece para siempre
const cache = new Map();
async function getUser(id) {
  if (!cache.has(id)) {
    cache.set(id, await db.findUser(id));
  }
  return cache.get(id);
}

// ✅ WeakMap: el GC puede limpiar valores si la key es recogida
const cache = new WeakMap();
// Solo funciona si las keys son objetos (no strings/numbers)

// ✅ LRU con límite de tamaño
const LRU = require('lru-cache');
const cache = new LRU({
  max: 500,           // Máximo 500 items
  ttl: 1000 * 60 * 5 // 5 minutos de vida
});
```

---

## WeakMap y WeakRef: Prevención Moderna de Leaks

### WeakMap
Las keys de un `WeakMap` son referencias débiles: si el objeto-key no tiene otras referencias, el GC lo puede recolectar junto con su valor.

```javascript
// Caso de uso: metadata asociada a objetos sin prevenir GC
const metadata = new WeakMap();

class Request {
  constructor(url) {
    this.url = url;
    metadata.set(this, { startTime: Date.now() }); // No previene GC de 'this'
  }
}

function getRequestTime(req) {
  return metadata.get(req)?.startTime;
}

// Cuando 'req' ya no tiene referencias fuertes, GC limpia
// tanto el Request como su entrada en el WeakMap
let req = new Request('/api/data');
const time = getRequestTime(req);

req = null; // El WeakMap no impide que req sea recogido por GC
```

### WeakRef (Node 14.6+)
Permite tener una referencia a un objeto que el GC puede limpiar.

```javascript
// Caso de uso: cache que cede memoria bajo presión
class SoftCache {
  constructor() {
    this._cache = new Map(); // Map<key, WeakRef<value>>
  }

  set(key, value) {
    this._cache.set(key, new WeakRef(value));
  }

  get(key) {
    const ref = this._cache.get(key);
    if (!ref) return undefined;

    const value = ref.deref(); // null si fue recolectado por GC
    if (!value) {
      this._cache.delete(key); // Limpiar entrada muerta
      return undefined;
    }
    return value;
  }
}

const cache = new SoftCache();
let bigObject = { data: new Array(1e6).fill('x') };

cache.set('key', bigObject);
console.log(cache.get('key')); // Retorna bigObject

bigObject = null; // El GC PUEDE (no garantizado) recolectar el objeto
// En algún momento, cache.get('key') puede retornar undefined
```

---

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

## Verificar Leak con GC Forzado

Antes de analizar heap snapshots, confirma que existe un leak real:

```bash
# Forzar GC manualmente con --expose-gc
node --expose-gc app.js
```

```javascript
// En tu código:
global.gc(); // Fuerza GC

const before = process.memoryUsage().heapUsed;

// ... operación sospechosa ...
global.gc();

const after = process.memoryUsage().heapUsed;
const diff = (after - before) / 1024 / 1024;

console.log(`Memory diff: +${diff.toFixed(2)} MB`);

// Si después de GC la memoria no baja → leak real
// Si baja → era memoria temporal (esperado)
```

---

## Heap Snapshots: Workflow Completo

### 1. Tomar Snapshots

```javascript
const v8 = require('v8');

// Snapshot en código
function takeHeapSnapshot(label = '') {
  const filename = `heap-${label}-${Date.now()}.heapsnapshot`;
  v8.writeHeapSnapshot(filename);
  console.log(`Snapshot guardado: ${filename}`);
  return filename;
}

// Uso: tomar baseline, hacer operación, tomar segundo snapshot
takeHeapSnapshot('before');
// ... código sospechoso ...
takeHeapSnapshot('after');
```

```bash
# O desde CLI con --inspect
node --inspect app.js
# Abrir: chrome://inspect
# DevTools → Memory → Take snapshot
```

### 2. Analizar en Chrome DevTools

**Columnas clave:**
- **Shallow size:** Memoria que ocupa el objeto en sí (sin sus referencias)
- **Retained size:** Memoria total que se liberaría si se elimina este objeto (incluye todo lo que referencia)
- **Retainers:** Qué objetos están previniendo que este sea GC'd

**Flujo para encontrar el leak:**

1. Tomar snapshot **antes** de la operación
2. Ejecutar la operación varias veces
3. Tomar snapshot **después**
4. En DevTools: seleccionar "Comparison" entre los dos snapshots
5. Ordenar por **"Size Delta"** (Δ) de mayor a menor
6. Objetos con delta positivo grande = sospechosos
7. Expandir → ver "Retainers" → traza qué los mantiene vivos

### 3. Buscar Retainers: El Rastro del Leak

```
Array @123        retained: 45MB  ← sospechoso
  └─ cache Map @456
       └─ module.exports @789
            └─ (global scope)    ← aquí está el leak: referencia global sin limpiar
```

---

## Profiling Built-in: `--heap-prof` (Node 12+)

Sin instalar ninguna librería:

```bash
# Generar heap profile durante ejecución
node --heap-prof app.js

# Con más detalle
node --heap-prof --heap-prof-interval=512 app.js
# (un sample cada 512 bytes de allocación)

# Genera: Heap.${pid}.${tid}.${sequence}.heapprofile
```

```bash
# Profiling de CPU built-in
node --prof app.js
# Genera: isolate-0x*.log

# Procesar el log
node --prof-process isolate-0x*.log > profile.txt
cat profile.txt
```

**Abrir `.heapprofile` en Chrome DevTools:**
- DevTools → Memory → Load Profile → selecciona el archivo
- Muestra dónde se están allocando bytes (por función)

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

**P: ¿Cómo detectarías y solucionarías un memory leak en Node.js en producción?**

**R:**

**1. Detectar que hay un leak:**
- Monitorear `process.memoryUsage().heapUsed` periódicamente; si crece de forma consistente sin bajar tras GC, hay leak
- Síntomas: RSs crece sin parar, GC frecuente, eventual OOM crash

**2. Confirmar el leak (local):**
```bash
node --expose-gc app.js
# Forzar GC y medir antes/después de la operación sospechosa
```

**3. Localizar el leak:**
- Tomar dos heap snapshots (antes y después de reproducir el leak)
- En Chrome DevTools → Comparison → ordenar por "Size Delta"
- Seguir los Retainers para encontrar qué referencia impide el GC

**4. Causas más comunes:**
- Caches / arrays globales sin límite
- Event listeners sin `removeListener()`
- Closures que retienen objetos grandes innecesariamente
- Timers / intervals sin `clearInterval()`

**5. Soluciones por causa:**
- Cache → `lru-cache` con `max` y `ttl`
- Listeners → `removeListener()` o `once()`
- Closures → extraer solo el valor necesario, no la referencia al objeto completo
- Timers → siempre guardar el id y llamar `clearInterval()`/`clearTimeout()`
- Objetos asociados a otros → usar `WeakMap` en vez de `Map`
