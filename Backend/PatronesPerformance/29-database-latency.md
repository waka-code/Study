# Database Latency

La base de datos es el cuello de botella más común de un backend. La latencia de DB no es solo "la query es lenta": es la suma de todo lo que pasa entre que la app pide datos y los recibe.

```
Latencia DB total =
    espera por una conexión del pool
  + round trip de red
  + espera por locks
  + ejecución de la query (planificación + I/O + CPU)
  + transferencia y deserialización del resultado
```

**Ventajas de atacarla:**
- Mayor impacto por esfuerzo: una query arreglada suele bajar el p99 de varios endpoints.
- Libera conexiones → sube el throughput de todo el sistema (Ley de Little).

**Trade-off:**
- Índices aceleran lecturas pero cuestan en escrituras y espacio.
- Caches y réplicas introducen datos desactualizados (stale).
- Denormalizar complica la consistencia.

---

## 🔍 Fuentes de latencia y cómo detectarlas

| Fuente | Síntoma | Cómo detectarla |
|---|---|---|
| **Pool agotado** | Latencia alta pero la DB está tranquila | Métrica de "tiempo esperando conexión", requests en cola del pool |
| **Demasiadas queries (N+1)** | Cada query es rápida, el endpoint es lento | Contar queries por request, APM traces |
| **Full table scan** | Query lenta que empeora con el volumen | `EXPLAIN ANALYZE` → `Seq Scan` |
| **Locks / contención** | Lentitud intermitente en escrituras | `pg_stat_activity`, `pg_locks`, deadlocks en logs |
| **Resultado enorme** | Query rápida, transferencia lenta | Filas/bytes devueltos, `SELECT *` |
| **Red** | Latencia base alta en toda query | App y DB en distintas regiones/AZ |
| **DB saturada** | Todo lento a la vez | CPU/IOPS de la DB al 100% |

---

## 1️⃣ Medir primero

### Slow query log

```sql
-- PostgreSQL: loguear queries de más de 200 ms
ALTER SYSTEM SET log_min_duration_statement = 200;
SELECT pg_reload_conf();
```

```sql
-- MySQL
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.2;
```

### pg_stat_statements: las queries que más tiempo total consumen

```sql
SELECT
  query,
  calls,
  round(total_exec_time::numeric, 0) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

👉 Ordena por **tiempo total**, no por promedio: una query de 5 ms llamada 1 millón de veces pesa más que una de 2 s llamada 10 veces.

### Medir desde la app

```javascript
// Prisma: loguear duración de cada query
const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });

prisma.$on('query', (e) => {
  if (e.duration > 100) {
    logger.warn({ query: e.query, ms: e.duration }, 'slow query');
  }
});
```

Con OpenTelemetry/APM (Datadog, New Relic) cada query aparece como un span dentro del trace de la request, lo que hace evidente el N+1 y las queries lentas.

---

## 2️⃣ Entender el plan de ejecución

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
```

```
❌ Sin índice:
Limit
  -> Sort (cost=...) (actual time=850.1..850.2 rows=20)
       -> Seq Scan on orders (rows=2000000)   ← lee toda la tabla
            Filter: (customer_id = 42)
            Rows Removed by Filter: 1999800

✅ Con índice compuesto (customer_id, created_at DESC):
Limit (actual time=0.03..0.05 rows=20)
  -> Index Scan using idx_orders_customer_created on orders
```

Qué buscar:
- `Seq Scan` sobre tablas grandes con filtros selectivos
- `Rows Removed by Filter` alto
- `Sort` en memoria/disco que un índice podría evitar
- Estimaciones de filas muy distintas de las reales → `ANALYZE` para actualizar estadísticas

Ver [Indexing Pattern](19-indexing-pattern.md) y `DatosConsistencia/PlanesDeEjecucion.md`.

---

## 3️⃣ Técnicas para reducir la latencia

### Traer menos datos

```sql
-- ❌
SELECT * FROM users WHERE id = 1;

-- ✅ Solo lo necesario (y habilita index-only scans)
SELECT id, name, email FROM users WHERE id = 1;
```

### Paginación por cursor en vez de OFFSET

```sql
-- ❌ OFFSET grande: la DB lee y descarta 100.000 filas
SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 100000;

-- ✅ Keyset / cursor: usa el índice directamente
SELECT * FROM posts WHERE id > 100020 ORDER BY id LIMIT 20;
```

### Menos round trips

```javascript
// ❌ 3 round trips secuenciales
const user = await db.user.findUnique({ where: { id } });
const orders = await db.order.findMany({ where: { userId: id } });
const prefs = await db.pref.findUnique({ where: { userId: id } });

// ✅ Independientes → en paralelo
const [user, orders, prefs] = await Promise.all([
  db.user.findUnique({ where: { id } }),
  db.order.findMany({ where: { userId: id } }),
  db.pref.findUnique({ where: { userId: id } }),
]);
```

Y eliminar N+1 (ver [N+1 Problem](30-n-plus-1.md)).

### Escrituras en lote

```sql
-- ❌ 1000 INSERTs = 1000 round trips
-- ✅ Un solo INSERT multi-fila
INSERT INTO events (type, payload) VALUES ('a', '{}'), ('b', '{}'), ...;
```

### Transacciones cortas

Una transacción abierta mantiene locks y una conexión ocupada. No hagas llamadas HTTP externas dentro de una transacción.

```javascript
// ❌ La conexión y los locks quedan tomados mientras esperamos a Stripe
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data });
  await stripe.charges.create({ ... }); // 800 ms de red
  await tx.order.update({ where: { id: order.id }, data: { paid: true } });
});
```

### Otras palancas

| Técnica | Cuándo |
|---|---|
| **Índices** | Filtros, joins y ordenamientos frecuentes |
| **Caching** (Redis) | Lecturas repetidas, datos que toleran estar algo desactualizados |
| **Read replicas** | Mucha lectura, se tolera replication lag |
| **Denormalización / vistas materializadas** | Joins/agregaciones costosas en lectura |
| **Connection pooling** (PgBouncer) | Muchas instancias, conexiones cortas |
| **Misma región/AZ** | Latencia de red base alta |
| **Timeouts de query** | Evitar que una query mala tumbe el pool |

```sql
-- PostgreSQL: cortar queries que se pasen de 5 s
SET statement_timeout = '5s';
```

---

## 📊 Métricas a monitorear

| Métrica | Por qué |
|---|---|
| Latencia de query p95/p99 por tipo | Detecta regresiones |
| Queries por request | Detecta N+1 |
| Tiempo de espera por conexión del pool | Pool mal dimensionado o queries lentas |
| Conexiones activas vs máximo | Saturación |
| Lock waits / deadlocks | Contención |
| CPU, IOPS, memoria de la DB | Saturación del motor |
| Replication lag | Datos stale en réplicas |
| Cache hit ratio (buffer cache) | Si baja, la DB va a disco |

---

## 🎯 Mejores Prácticas

✅ Activar slow query log y `pg_stat_statements` desde el día 1
✅ `EXPLAIN ANALYZE` antes de agregar índices "a ojo"
✅ Seleccionar solo las columnas necesarias
✅ Paginación por cursor para listados grandes
✅ Queries independientes en paralelo, escrituras en lote
✅ Transacciones cortas, sin I/O externo adentro
✅ `statement_timeout` y timeouts en el cliente
✅ Monitorear el tiempo de espera del pool, no solo el de la query

---

## 🔗 Relación con Otros Patrones

- **Indexing**: la palanca principal contra full scans
- **N+1 / Eager Loading**: reducen el número de round trips
- **Connection Pooling**: evita el costo de conexión y protege a la DB
- **Caching / Read-Write Splitting**: descargan lecturas de la DB principal
- **Data Denormalization**: cambia consistencia por velocidad de lectura
- **Locking Patterns**: explican la latencia por contención

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
