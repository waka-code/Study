# Connection Pooling Pattern

Reutiliza conexiones abiertas a recursos (bases de datos, servicios) para evitar el costo de crearlas repetidamente. Mejora el rendimiento y reduce la latencia.

**Ventajas:**
- Reduce el tiempo de conexión.
- Mejora la eficiencia de recursos.
- Protege a la DB limitando cuántas conexiones concurrentes recibe.

**Trade-off:**
- Puede agotar el pool si hay demasiadas solicitudes.
- Requiere gestión de límites y limpieza.
- Conexiones "rotas" o con estado residual si no se validan/resetean.

---

## 💸 Por qué abrir una conexión es caro

```
Nueva conexión a PostgreSQL:
  TCP handshake          1 RTT
  TLS handshake          1-2 RTT
  Autenticación (SCRAM)  1-2 RTT
  Fork de un proceso backend en el servidor (~5-10 MB de RAM)
  ──────────────────────────────
  ≈ 5-50 ms antes de ejecutar la primera query
```

Una query indexada tarda ~1 ms. Sin pool, **la conexión cuesta más que la query**.

Además, cada conexión en PostgreSQL es un **proceso** en el servidor: miles de conexiones consumen RAM y CPU del motor aunque estén ociosas.

---

## ⚙️ Cómo funciona

```
Request → pool.acquire()
            ├─ hay conexión libre → la entrega (≈0 ms)
            ├─ no hay libres y < max → crea una nueva
            └─ pool lleno → espera en cola hasta connectionTimeout → error
          ... query ...
        → pool.release()  (vuelve al pool, no se cierra)
```

---

## 🛠️ Implementación

### Node.js con `pg`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  max: 10,                        // máximo de conexiones del pool
  idleTimeoutMillis: 30_000,      // cerrar conexiones ociosas
  connectionTimeoutMillis: 2_000, // cuánto esperar por una conexión libre
  maxLifetimeSeconds: 1800,       // reciclar conexiones viejas
});

// Query simple: acquire + release automático
const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

// Transacción: tomar un cliente y SIEMPRE liberarlo
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, from]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, to]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release(); // ❗ si se olvida → leak de conexiones → el pool se agota
}
```

### Prisma

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=5"
```

### C# / .NET (Npgsql)

```
Host=db;Database=app;Username=u;Password=p;Minimum Pool Size=0;Maximum Pool Size=20;Connection Idle Lifetime=300
```

ADO.NET hace pooling automático: `using var conn = new NpgsqlConnection(cs)` **devuelve** la conexión al pool al hacer `Dispose`, no la cierra.

### Pool para HTTP (keep-alive)

El mismo concepto aplica a conexiones HTTP salientes:

```javascript
const { Agent } = require('undici');
const agent = new Agent({ connections: 50, keepAliveTimeout: 10_000 });
await fetch('https://api.example.com', { dispatcher: agent });
```

Ver [Keep-Alive](keep-alive.md).

---

## 📏 Dimensionar el pool

**Más grande no es mejor.** La DB tiene un número limitado de cores y disco; demasiadas conexiones concurrentes compiten entre sí (context switching, locks) y **baja** el throughput.

Punto de partida (fórmula de PostgreSQL / HikariCP):

```
conexiones ≈ (núcleos de la DB × 2) + discos efectivos
```

Una DB de 8 cores rinde bien con ~20 conexiones **activas en total**, no por instancia.

### El problema de multiplicar

```
max_connections de la DB = 100

pool max = 20 por instancia
× 10 instancias (autoscaling)
= 200 conexiones  ❌ la DB rechaza conexiones: "too many clients"
```

```
Regla: pool_max × instancias_max  <  max_connections_DB  (dejando margen para admin/migraciones)
```

Con serverless (Lambda) es peor: cada invocación concurrente puede abrir su propio pool.

### Ley de Little aplicada

```
conexiones necesarias = throughput (queries/s) × duración promedio de query (s)

500 queries/s × 0.005 s = 2.5 conexiones ocupadas en promedio
```

Si necesitas cientos de conexiones, el problema son **queries lentas o transacciones largas**, no el tamaño del pool.

---

## 🔀 Pooler externo: PgBouncer / RDS Proxy

Cuando hay muchas instancias o serverless, se pone un pooler entre las apps y la DB:

```
App ×50 (pool de 10 c/u = 500 conexiones de cliente)
      │
  PgBouncer  (multiplexa)
      │
PostgreSQL  (solo 30 conexiones reales)
```

| Modo PgBouncer | Conexión real asignada durante | Nota |
|---|---|---|
| **session** | Toda la sesión del cliente | Compatible con todo, poco ahorro |
| **transaction** | Solo una transacción | El más usado; rompe `SET`, prepared statements de sesión, advisory locks de sesión |
| **statement** | Solo una sentencia | No permite transacciones multi-statement |

Alternativas gestionadas: **AWS RDS Proxy**, **Supabase Supavisor**, **PgCat**.

---

## 🔴 Problemas Comunes

| Problema | Síntoma | Fix |
|---|---|---|
| **Pool agotado** | Errores "timeout acquiring connection", latencia alta con DB tranquila | Queries más rápidas, transacciones cortas, revisar leaks |
| **Leak de conexiones** | El pool se va llenando y nunca se libera | `release()` en `finally`, usar helpers que liberen solos |
| **Transacciones largas** | Pocas requests acaparan todas las conexiones | No hacer I/O externo dentro de la transacción |
| **Demasiadas conexiones** | "too many clients" / DB con CPU alta | Pool más chico, PgBouncer |
| **Conexiones muertas** | Errores tras un failover o idle del firewall | `maxLifetime`, validación, keepalive TCP |
| **Estado residual** | `SET search_path` o variables de sesión que "saltan" a otra request | Resetear en release o no usar estado de sesión |

---

## 📊 Métricas a monitorear

- Conexiones **activas / ociosas / totales**
- **Requests esperando** conexión (cola del pool)
- **Tiempo de espera** para obtener conexión (p95/p99)
- Timeouts de adquisición
- Conexiones en la DB vs `max_connections`

```javascript
setInterval(() => {
  metrics.gauge('db.pool.total', pool.totalCount);
  metrics.gauge('db.pool.idle', pool.idleCount);
  metrics.gauge('db.pool.waiting', pool.waitingCount);
}, 5000);
```

---

## 🎯 Mejores Prácticas

✅ Un pool **por proceso**, creado al arrancar y reutilizado (nunca por request)
✅ Pool pequeño; dimensionar según los cores de la DB y el total de instancias
✅ `connectionTimeout` corto para fallar rápido en vez de encolar indefinidamente
✅ Liberar siempre en `finally`
✅ Transacciones cortas
✅ PgBouncer / RDS Proxy con muchas instancias o serverless
✅ Cerrar el pool en el graceful shutdown (`await pool.end()`)
✅ Monitorear `waiting` y tiempo de espera

---

## 🔗 Relación con Otros Patrones

- **Database Latency**: el tiempo esperando conexión es parte de la latencia de DB
- **Bulkhead**: pools separados por dependencia aíslan fallos
- **Keep-Alive**: pooling de conexiones HTTP
- **Horizontal Scaling**: multiplica conexiones; requiere pooler externo
- **Latency & Throughput**: la Ley de Little dimensiona el pool

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
