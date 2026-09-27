# Latency & Throughput

Las dos métricas base de performance. Casi cualquier otro patrón de esta carpeta existe para mejorar una de ellas (o para cambiar una por la otra).

- **Latency (latencia):** cuánto tarda **una** operación, de principio a fin. Se mide en ms.
- **Throughput (rendimiento):** cuántas operaciones completa el sistema **por unidad de tiempo**. Se mide en req/s, TPS, msgs/s, MB/s.

**Analogía:** una autopista.
- Latencia = cuánto tarda un auto en ir de A a B.
- Throughput = cuántos autos llegan a B por minuto.

Puedes ensanchar la autopista (más throughput) sin que cada auto vaya más rápido (misma latencia).

---

## 📊 Cómo medir la latencia: percentiles, no promedios

El promedio esconde a los usuarios que más sufren.

```
10 requests: 20, 22, 21, 19, 23, 20, 22, 21, 20, 900 ms

Promedio → 108 ms   (no describe a nadie)
p50      →  21 ms   (el usuario típico)
p99      → 900 ms   (el peor 1%)
```

| Percentil | Significado | Uso |
|---|---|---|
| **p50** (mediana) | La mitad de las requests es más rápida | Experiencia típica |
| **p95** | El 95% es más rápido | SLO habitual |
| **p99** | El 99% es más rápido | Tail latency, usuarios "pesados" |
| **p99.9** | 1 de cada 1000 | Sistemas críticos |

**Tail latency importa más de lo que parece:** si una página hace 50 llamadas a backend en paralelo, la probabilidad de que al menos una caiga en el p99 es `1 - 0.99^50 ≈ 40%`. El p99 del backend se vuelve la experiencia normal del usuario.

---

## 🧮 Ley de Little

Relaciona latencia, throughput y concurrencia en un sistema estable:

```
L = λ × W

L = requests en vuelo (concurrencia)
λ = throughput (req/s)
W = latencia promedio (s)
```

**Ejemplo:**
- Tu API recibe 500 req/s y cada una tarda 200 ms.
- Concurrencia = 500 × 0.2 = **100 requests en vuelo simultáneamente**.
- Si la DB se pone lenta y la latencia sube a 1 s → necesitas **500** conexiones/hilos en vuelo para el mismo throughput.

👉 Por eso cuando la latencia sube, **se agotan los pools** (conexiones, hilos, workers) y el sistema colapsa en cascada.

---

## 📈 La curva latencia vs carga

```
Latencia
  │                                   ╱
  │                                 ╱
  │                              ╱    ← saturación: la cola crece sin límite
  │                         ╱
  │ ────────────────────╱             ← "rodilla" (~70-80% de utilización)
  │
  └──────────────────────────────────── Throughput / utilización
```

- Con carga baja, la latencia es casi constante.
- Cerca del **70-80% de utilización** de un recurso (CPU, DB, pool), las colas empiezan a crecer y la latencia se dispara.
- Pasado el punto de saturación, **más carga no da más throughput**, solo más latencia (y timeouts).

**Regla práctica:** planifica capacidad para operar bajo la rodilla, no al 100%.

---

## ⚖️ Trade-offs típicos

| Técnica | Throughput | Latencia |
|---|---|---|
| **Batching** | ⬆️ Sube | ⬆️ Sube (esperas a llenar el lote) |
| **Colas / async** | ⬆️ Sube (absorbe picos) | ⬆️ Sube (end-to-end) |
| **Caching** | ⬆️ Sube | ⬇️ Baja |
| **Compresión** | ⬆️ Sube (menos bytes) | ↕️ Depende (CPU vs red) |
| **Paralelismo** | ⬆️ Sube | ⬇️ Baja (si la tarea es divisible) |
| **Réplicas / horizontal scaling** | ⬆️ Sube | ≈ Igual (no hace más rápida una request) |

---

## 🔍 Dónde se va la latencia (desglose de una request)

```
Cliente → DNS → TCP/TLS handshake → LB → App → DB → App → respuesta
          ~ms   1-3 RTT              ~ms  CPU  query  serialización
```

Números aproximados que conviene saber:

| Operación | Tiempo aprox. |
|---|---|
| Lectura L1 cache | ~1 ns |
| Lectura RAM | ~100 ns |
| Lectura SSD aleatoria | ~100 µs |
| Round trip mismo datacenter | ~0.5 ms |
| Query simple indexada a DB | ~1-5 ms |
| Round trip entre continentes | ~100-150 ms |

👉 Un round trip de red cuesta lo mismo que **millones** de operaciones en memoria. Por eso el N+1 y los chatty APIs son tan caros.

---

## 🛠️ Medición en Node.js

```javascript
const express = require('express');
const client = require('prom-client');

const app = express();

// Histograma: permite calcular percentiles en Prometheus/Grafana
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de requests HTTP',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path ?? req.path, status: res.statusCode });
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

Consulta del p99 en PromQL:

```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

Throughput:

```promql
sum(rate(http_request_duration_seconds_count[1m])) by (route)
```

---

## 🧪 Pruebas de carga

```bash
# autocannon (Node): 100 conexiones durante 30 s
npx autocannon -c 100 -d 30 http://localhost:3000/api/users

# k6: escenario con rampa de usuarios
k6 run script.js
```

Qué mirar en el resultado:
- **req/s** → throughput
- **p50 / p95 / p99** → latencia
- **errores / timeouts** → dónde empieza la saturación

---

## 🎯 Mejores Prácticas

✅ Reportar **percentiles** (p50, p95, p99), nunca solo el promedio
✅ Usar **histogramas**, no promedios pre-calculados (los percentiles no se pueden promediar entre instancias)
✅ Definir **SLOs** (ej: p99 < 300 ms para `/checkout`)
✅ Medir latencia **por endpoint** y **por dependencia** (DB, APIs externas)
✅ Operar por debajo del 70-80% de utilización
✅ Poner **timeouts** en todas las llamadas externas
✅ Pruebas de carga antes de lanzar, no después

---

## 🔗 Relación con Otros Patrones

- **Caching / CDN**: bajan latencia y suben throughput
- **Batch Processing / Queues**: suben throughput a costa de latencia
- **Connection Pooling**: evita pagar handshakes en cada request
- **Horizontal Scaling / Load Balancing**: suben throughput
- **Database Latency / N+1**: la causa más común de latencia alta en backends

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
