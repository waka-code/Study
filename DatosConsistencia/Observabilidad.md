# Observabilidad de Bases de Datos

Sin métricas, cada incidente de BD es una adivinanza. Un senior sabe **qué medir**, **qué alertar**, **qué consultar** cuando algo va mal y **en qué orden**. Ejemplos en PostgreSQL; los conceptos aplican a cualquier motor.

## Métodos: USE y RED

- **RED** (desde la app, orientado a requests): **R**ate (QPS), **E**rrors (timeouts, deadlocks, conexiones rechazadas), **D**uration (latencia p50/p95/p99).
- **USE** (desde el recurso): **U**tilization, **S**aturation, **E**rrors para CPU, memoria, disco, red, conexiones.
- Medir desde **ambos lados**: la latencia vista por la app incluye pool, red y espera de conexión; la BD solo ve el tiempo de ejecución. Si la app ve 800 ms y la BD 20 ms, el problema está en el pool o la red (ver [ConnectionPooling.md](ConnectionPooling.md)).

## Métricas clave

| Métrica | Qué indica | Umbral orientativo |
|---|---|---|
| **Latencia p95/p99** de queries | Experiencia real; el promedio esconde colas | Según SLO; alertar desvíos vs baseline |
| **QPS / TPS** (`xact_commit`, `xact_rollback`) | Carga; ratio de rollbacks sube con errores | Cambios bruscos vs baseline |
| **Conexiones** activas / idle / idle in transaction | Saturación del pool o fugas | Total > 80% de `max_connections`; idle in tx > 0 sostenido |
| **Cache hit ratio** (buffer) | Si el working set cabe en RAM | < 99% en OLTP es sospechoso |
| **Replication lag** (bytes y segundos) | Réplicas atrasadas, read-your-writes roto | > pocos segundos (según tolerancia) |
| **Locks / esperas** (`wait_event`) | Contención | Sesiones esperando lock > N por minutos |
| **Deadlocks** | Orden de locks inconsistente en la app | Cualquier aumento sostenido |
| **Transacciones largas** | Bloquean VACUUM y DDL | > 5–15 min en OLTP |
| **XID age** | Riesgo de wraparound | > 1.000M (el límite es ~2.100M) |
| **Tamaño y bloat** de tablas/índices | Crecimiento, VACUUM insuficiente | Bloat > 30–50% en tablas grandes |
| **Dead tuples / último autovacuum** | Autovacuum no da abasto | `n_dead_tup` creciendo sin límite |
| **IOPS, throughput, latencia de disco** | Saturación de I/O (y créditos burst en gp2/gp3) | Cerca del límite provisionado |
| **CPU, memoria, swap** | Saturación del host | CPU > 80% sostenido; swap > 0 |
| **Espacio libre en disco** | Disco lleno = BD caída | < 20% |
| **Temp files** (`temp_bytes`) | Sorts/hashes que no caben en `work_mem` | Crecimiento sostenido |
| **Checkpoints** solicitados vs programados | `max_wal_size` chico | `checkpoints_req` alto |
| **WAL retenido por slots** | Consumidor CDC caído (ver [OutboxCDC.md](OutboxCDC.md)) | GB creciendo |

Contexto de los internos (MVCC, VACUUM, xid, WAL) en [InternosMotor.md](InternosMotor.md).

## Herramientas

- **`pg_stat_statements`**: estadísticas agregadas por query normalizada (llamadas, tiempo total/medio, filas, bloques leídos). La herramienta #1 para saber **qué** consume la BD.
- **`pg_stat_activity`**: qué está haciendo cada conexión **ahora** (query, estado, `wait_event`, inicio de tx).
- **`pg_locks`** + `pg_blocking_pids()`: quién espera a quién.
- **`pg_stat_user_tables` / `pg_stat_user_indexes`**: seq scans vs index scans, dead tuples, último vacuum/analyze, uso de índices.
- **`pg_stat_replication`**, `pg_replication_slots`: lag y slots.
- **Slow query log**: `log_min_duration_statement = '500ms'`; en MySQL `slow_query_log` + `long_query_time`.
- **`auto_explain`**: loguea el plan de queries lentas en producción (con `log_analyze` agrega overhead; usar sampling).
- **`log_lock_waits = on`** (+ `deadlock_timeout`): loguea esperas de lock largas. `log_autovacuum_min_duration`, `log_temp_files`, `log_checkpoints`.
- **AWS RDS Performance Insights / CloudWatch Database Insights**: carga de BD (AAS: *average active sessions*) desglosada por wait event, query, usuario y host. Enhanced Monitoring para métricas del SO.
- Ecosistema: `postgres_exporter` + Prometheus + Grafana, Datadog DBM, pganalyze, pgBadger (análisis de logs), PgHero.
- **Tracing** (OpenTelemetry) en la app: vincula el span de la query con el request que la originó; indispensable para encontrar N+1 (ver [ORMs.md](ORMs.md)).

```sql
-- Configuración base recomendada
-- shared_preload_libraries = 'pg_stat_statements,auto_explain'
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
ALTER SYSTEM SET pg_stat_statements.track = 'top';
ALTER SYSTEM SET log_min_duration_statement = '500ms';
ALTER SYSTEM SET auto_explain.log_min_duration = '1s';
ALTER SYSTEM SET auto_explain.sample_rate = 0.1;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET track_io_timing = on;           -- tiempos de I/O en EXPLAIN y pg_stat_statements
ALTER SYSTEM SET log_autovacuum_min_duration = '10s';
SELECT pg_reload_conf();
```

## Queries de diagnóstico

### Queries que más tiempo consumen (acumulado)

```sql
SELECT round(total_exec_time::numeric / 1000, 1)            AS total_s,
       calls,
       round(mean_exec_time::numeric, 2)                    AS mean_ms,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct,
       rows,
       shared_blks_read,                                     -- bloques leídos de disco
       left(query, 120)                                      AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 15;
```

- Ordenar por **total** encuentra la query rápida pero llamada millones de veces (mejor ROI). Ordenar por **mean** encuentra las lentas individuales.
- `SELECT pg_stat_statements_reset();` antes de medir un cambio.

### Qué se está ejecutando ahora

```sql
SELECT pid, usename, application_name, client_addr, state,
       wait_event_type, wait_event,
       now() - query_start AS query_age,
       now() - xact_start  AS xact_age,
       left(query, 100)    AS query
FROM pg_stat_activity
WHERE state <> 'idle' AND pid <> pg_backend_pid()
ORDER BY query_start;
```

### Quién bloquea a quién

```sql
SELECT blocked.pid                    AS blocked_pid,
       left(blocked.query, 60)        AS blocked_query,
       now() - blocked.query_start    AS waiting_for,
       blocking.pid                   AS blocking_pid,
       blocking.state                 AS blocking_state,
       left(blocking.query, 60)       AS blocking_query,
       now() - blocking.xact_start    AS blocking_xact_age
FROM pg_stat_activity blocked
JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS b(pid) ON true
JOIN pg_stat_activity blocking ON blocking.pid = b.pid
ORDER BY waiting_for DESC;
```

- Frecuente: el bloqueador está `idle in transaction` (la app abrió una tx y se fue a llamar una API). O un `ALTER TABLE` esperando un lock que encola todo detrás (ver [Migraciones.md](Migraciones.md)).
- Terminar: `SELECT pg_cancel_backend(pid);` (cancela la query) o `pg_terminate_backend(pid)` (cierra la conexión y hace rollback).

### Transacciones largas e idle in transaction

```sql
SELECT pid, usename, state, now() - xact_start AS xact_age,
       backend_xmin, left(query, 80) AS last_query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
  AND now() - xact_start > interval '5 minutes'
ORDER BY xact_start;
```

Prevención: `idle_in_transaction_session_timeout = '60s'` y `statement_timeout` por rol.

### Edad de XID (wraparound)

```sql
SELECT datname, age(datfrozenxid) AS xid_age,
       round(100.0 * age(datfrozenxid) / 2147483648, 1) AS pct_to_wraparound
FROM pg_database ORDER BY xid_age DESC;

SELECT relname, age(relfrozenxid) AS xid_age, pg_size_pretty(pg_total_relation_size(oid)) AS size
FROM pg_class WHERE relkind = 'r' ORDER BY age(relfrozenxid) DESC LIMIT 10;
```

### Cache hit ratio

```sql
SELECT datname,
       round(100.0 * blks_hit / nullif(blks_hit + blks_read, 0), 2) AS hit_pct,
       xact_commit, xact_rollback, deadlocks, temp_files, pg_size_pretty(temp_bytes) AS temp
FROM pg_stat_database WHERE datname = current_database();
```

(`blks_read` puede venir del page cache del SO; no es necesariamente disco físico.)

### Tamaño de tablas e índices

```sql
SELECT relname,
       pg_size_pretty(pg_total_relation_size(relid))  AS total,
       pg_size_pretty(pg_relation_size(relid))        AS heap,
       pg_size_pretty(pg_indexes_size(relid))         AS indexes,
       n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 15;
```

Para bloat exacto: extensión `pgstattuple` (costosa: escanea la tabla).

### Índices no usados

```sql
SELECT s.schemaname, s.relname AS table, s.indexrelname AS index,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS size, s.idx_scan
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0
  AND NOT i.indisunique AND NOT i.indisprimary      -- no borrar los que garantizan constraints
ORDER BY pg_relation_size(s.indexrelid) DESC;
```

- Las estadísticas son **por nodo**: un índice sin uso en el primario puede usarse en réplicas. Verificar en todos y tras un ciclo completo de negocio (cierres de mes).
- Los índices sobrantes cuestan en cada escritura y en VACUUM. Ver [Indices.md](Indices.md).

### Tablas con muchos seq scans (índice faltante)

```sql
SELECT relname, seq_scan, seq_tup_read, idx_scan,
       seq_tup_read / nullif(seq_scan, 0) AS avg_rows_per_seq_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC LIMIT 15;
```

### Replicación y slots

```sql
-- En el primario
SELECT application_name, client_addr, state,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replay_lag_bytes,
       replay_lag
FROM pg_stat_replication;

SELECT slot_name, slot_type, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;

-- En la réplica
SELECT now() - pg_last_xact_replay_timestamp() AS replica_delay;
```

(En la réplica, `replica_delay` crece aunque no haya lag si el primario no recibe escrituras.) Ver [ReadReplicas.md](ReadReplicas.md).

## Alertas recomendadas

Alertar sobre **síntomas** que afectan usuarios y sobre **precursores** de caídas; evitar alertas de ruido que nadie atiende.

| Alerta | Severidad | Por qué |
|---|---|---|
| Espacio libre en disco < 15% (o proyección a lleno en < 24 h) | Crítica | Disco lleno detiene la BD |
| XID age > 1.000M | Crítica | Wraparound fuerza modo solo lectura |
| Replication slot inactivo o WAL retenido > X GB | Crítica | Llena el disco del primario |
| Latencia p99 > SLO por 5–10 min | Alta | Impacto directo en usuarios |
| Conexiones > 80% de `max_connections` | Alta | Próximo paso: rechazos |
| Replication lag > umbral de negocio | Alta | Lecturas incorrectas; RPO en failover |
| Transacción abierta > 15–30 min | Media | Bloat, bloqueo de DDL |
| Sesiones bloqueadas por lock > 1 min | Media | Contención / migración atascada |
| Deadlocks > N por hora | Media | Bug de orden de locks |
| CPU > 85% sostenido 15 min | Media | Saturación |
| Créditos de burst / IOPS al límite | Media | Caída abrupta de rendimiento |
| Backup fallido / PITR desactualizado | Alta | Ver [Backups.md](Backups.md) |
| Failover ocurrido | Info/Alta | Revisar causa, reconexiones |

## Runbook: "la base de datos está lenta"

**0. Confirmar y acotar (2 min)**
- ¿Lento para quién? ¿Todos los endpoints o uno? ¿Desde cuándo? Correlacionar con **deploys**, migraciones, jobs batch, campañas o cambios de tráfico.
- Comparar latencia vista por la app vs tiempo en BD. Si la BD está sana y la app espera: pool agotado, red, DNS tras failover.

**1. Salud del host**
- CPU, memoria/swap, IOPS y latencia de disco, créditos burst, espacio libre. En RDS: Performance Insights → carga (AAS) vs número de vCPU.
- AAS > vCPUs = la BD está saturada; mirar **en qué** esperan las sesiones.

**2. Qué está esperando (wait events)**
- `pg_stat_activity` agrupado por `wait_event_type`:
  - `CPU` (NULL wait_event, state active) → queries caras; ir a paso 4.
  - `IO` (`DataFileRead`) → working set no cabe en RAM o seq scans grandes.
  - `Lock` → paso 3.
  - `LWLock` (`WALWrite`, `BufferMapping`) → contención interna, escritura WAL, demasiadas conexiones activas.
  - `Client` (`ClientRead`) → la app es lenta en consumir o hay idle in transaction.

```sql
SELECT coalesce(wait_event_type, 'CPU') AS wait_type, wait_event, count(*)
FROM pg_stat_activity WHERE state = 'active' AND pid <> pg_backend_pid()
GROUP BY 1, 2 ORDER BY 3 DESC;
```

**3. Locks y transacciones largas**
- Query "quién bloquea a quién". Identificar la **raíz** del árbol de bloqueos.
- Si es una tx `idle in transaction` o un reporte: cancelar/terminar (con criterio: ¿es una migración a medio camino?).
- Si es un DDL encolado: cancelarlo; reintentar con `lock_timeout` bajo.

**4. Queries culpables**
- `pg_stat_statements` por `total_exec_time` (reset y medir en ventana si hace falta) y por `mean_exec_time`.
- ¿Query nueva (deploy reciente)? ¿Misma query con **cambio de plan**? (estadísticas desactualizadas, datos que crecieron, parámetro distinto).
- `EXPLAIN (ANALYZE, BUFFERS)` de la sospechosa (cuidado: ANALYZE ejecuta; en DML usar tx con ROLLBACK). Ver [PlanesDeEjecucion.md](PlanesDeEjecucion.md).

**5. Mitigar primero, arreglar después**
- Rollback del deploy culpable.
- `ANALYZE tabla;` si el plan cambió por estadísticas.
- Crear índice faltante con `CREATE INDEX CONCURRENTLY`.
- Pausar jobs batch o reportes; mover lecturas a réplica.
- Rate limiting / feature flag para apagar la funcionalidad costosa.
- Escalar verticalmente como último recurso (en RDS implica failover/reinicio breve).

**6. Revisar mantenimiento**
- Dead tuples altos, autovacuum atrasado o bloqueado por tx largas → bloat y planes peores.
- Checkpoints demasiado frecuentes, temp files grandes (`work_mem`).

**7. Postmortem**
- Causa raíz, por qué no alertó antes, qué alerta/límite agregar (`statement_timeout`, índice, test de carga, revisión de planes en CI).

## Preguntas de entrevista

1. **¿Qué métricas mirarías primero en una BD de producción?** Latencia p95/p99 y QPS desde la app, conexiones (activas, idle in tx), CPU/IO, wait events, replication lag, espacio en disco y xid age. El promedio de latencia no sirve: oculta la cola.
2. **¿Para qué sirve `pg_stat_statements` y cómo lo usas?** Agrega estadísticas por query normalizada. Ordenado por tiempo total muestra dónde se va la capacidad (a menudo queries rápidas llamadas millones de veces); por tiempo medio, las lentas individuales.
3. **La app reporta 1 s de latencia pero la BD muestra queries de 10 ms. ¿Qué pasa?** El tiempo se va fuera de la ejecución: espera por conexión del pool, red, N+1 (muchas queries rápidas), o la app procesando. Revisar métricas del pool y tracing.
4. **¿Por qué es peligrosa una sesión `idle in transaction`?** Mantiene locks y un snapshot viejo: bloquea DDL (y todo lo que se encola detrás) e impide a VACUUM limpiar, generando bloat. Se limita con `idle_in_transaction_session_timeout`.
5. **¿Qué alertas son críticas y no negociables?** Disco casi lleno, xid age alto, slots de replicación reteniendo WAL, conexiones cerca del máximo, backups fallidos y latencia fuera de SLO.
6. **¿Cómo detectas un cambio de plan que degradó una query?** Aumento de `mean_exec_time` en pg_stat_statements sin cambio de código, `auto_explain` mostrando otro plan, y `EXPLAIN ANALYZE` con estimaciones de filas muy distintas a las reales (estadísticas desactualizadas).
7. **¿Cómo decides si borrar un índice sin uso?** `idx_scan = 0` en todos los nodos (primario y réplicas) durante un ciclo de negocio completo, que no respalde un constraint, y midiendo antes; se puede probar marcándolo inválido o en staging.

## Errores comunes

- Alertar solo sobre CPU y no sobre disco, xid age o slots.
- Mirar latencia promedio en vez de percentiles.
- Ejecutar `EXPLAIN ANALYZE` de un `DELETE` en producción sin transacción con ROLLBACK.
- `log_statement = 'all'` en producción: overhead y datos sensibles en logs.
- Borrar índices "sin uso" mirando solo el primario.
- Matar procesos en pánico sin identificar la raíz del árbol de bloqueos.
- No tener baseline: sin saber qué es "normal", no se detecta lo anormal.
