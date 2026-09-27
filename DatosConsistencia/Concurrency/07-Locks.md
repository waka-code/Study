# Locks

## Qué es
- Un **lock** es un mecanismo que da a una transacción acceso controlado a un recurso (fila, rango, página, tabla, o un identificador arbitrario) e impide que otras hagan operaciones incompatibles hasta que lo libere.
- Son la base del control pesimista ([10-PessimisticConcurrency.md](10-PessimisticConcurrency.md)), de la serialización con 2PL y de la protección de la estructura (DDL).

## Modos básicos: compartido vs exclusivo

| | S (compartido) solicitado | X (exclusivo) solicitado |
|---|---|---|
| **S tomado** | ✅ compatible | ❌ espera |
| **X tomado** | ❌ espera | ❌ espera |

- **S (shared)**: "estoy leyendo, no lo cambies". Muchos a la vez.
- **X (exclusive)**: "lo estoy cambiando". Solo uno, y nadie más con S.
- Con MVCC, las lecturas normales **no toman S** a nivel de fila: leen versiones. Los S solo aparecen si los pides (`FOR SHARE`) o en motores/niveles basados en locking.

## Granularidad
| Nivel | Protege | Costo |
|---|---|---|
| Fila / clave de índice | Una fila | Muchos locks, máxima concurrencia |
| Rango / gap | Huecos de un índice (evita phantoms) | Concurrencia media, deadlocks sutiles |
| Página | Un bloque de filas | SQL Server |
| Tabla | Toda la tabla | Pocos locks, poca concurrencia |
| Base / esquema | Estructura | DDL, backups |

### Intent locks
- Para no revisar cada fila antes de dar un lock de tabla, los motores jerárquicos ponen **intent locks** (IS, IX, SIX) en los niveles superiores: "alguien tiene un X en alguna fila de esta tabla".
- Un `LOCK TABLE ... EXCLUSIVE` ve el IX y espera, sin escanear filas. InnoDB y SQL Server los usan explícitamente; en Postgres cumple esa función el `ROW EXCLUSIVE` de tabla que toman los DML.

### Lock escalation
- SQL Server convierte muchos locks de fila/página (~5.000 en un objeto) en un lock de tabla. Postgres e InnoDB no escalan. Detalle en [../Transactions/Transacciones.md](../Transactions/Transacciones.md#lock-escalation-en-sql-server).

## Two-phase locking (2PL)
- **Fase de crecimiento**: la tx adquiere locks, no libera ninguno.
- **Fase de liberación**: libera y ya no puede adquirir más.
- **Strict 2PL** (lo usual): los locks exclusivos se liberan recién en `COMMIT`/`ROLLBACK`. Evita cascadas de rollback.
- Garantiza serializabilidad (sumado a locks de predicado para phantoms). Precio: esperas y [deadlocks](08-Deadlocks.md).
- Consecuencia práctica en cualquier motor: **los locks de fila viven hasta el fin de la transacción**. No existe "desbloquear la fila" a mitad de tx.

## Locks de fila en Postgres

| Modo | Lo toma | Bloquea |
|---|---|---|
| `FOR KEY SHARE` | Chequeos de FK al insertar hijos | `FOR UPDATE` |
| `FOR SHARE` | Explícito | `FOR NO KEY UPDATE`, `FOR UPDATE` |
| `FOR NO KEY UPDATE` | `UPDATE` que no toca columnas de clave única | `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE` |
| `FOR UPDATE` | `DELETE`, `UPDATE` de clave, explícito | Todo lo anterior |

- Se guardan en la propia tupla (`xmax` + multixact si hay varios), no en memoria compartida: bloquear millones de filas no agota nada, pero sí **escribe** en cada tupla.
- Locks de tabla (`ACCESS SHARE` ... `ACCESS EXCLUSIVE`) y la trampa del `ALTER TABLE` en cola: ver [../Transactions/Transacciones.md](../Transactions/Transacciones.md#locks-de-tabla-vs-locks-de-fila) y [../Migraciones.md](../Migraciones.md).

## Locks en MySQL InnoDB
- Todos los locks de fila son sobre **entradas de índice** (el clustered index es la tabla).
  - **Record lock**: una entrada.
  - **Gap lock**: el hueco entre dos entradas (solo impide inserts; son compatibles entre sí).
  - **Next-key lock**: record + gap anterior. Default en Repeatable Read para lecturas con lock, `UPDATE` y `DELETE`.
  - **Insert intention lock**: gap lock especial que toma un `INSERT`; espera si alguien tiene un gap lock en ese hueco.
  - **AUTO-INC lock**: para asignar autoincrementales (modo configurable con `innodb_autoinc_lock_mode`).
- Un `UPDATE ... WHERE columna_sin_indice = ?` recorre y bloquea **todas** las filas escaneadas. Los índices reducen locks, no solo latencia.
- En `READ COMMITTED` casi no hay gap locks y los locks de filas que no cumplen el `WHERE` se liberan tras evaluarlas.

## Locks vs latches
- **Lock**: lógico, protege datos de la tx, dura hasta el commit, participa en detección de deadlocks.
- **Latch / LWLock**: físico, protege estructuras en memoria (páginas en el buffer pool, índices) durante microsegundos. No los controlas con SQL, pero aparecen como eventos de espera (`LWLock:BufferContent`, `buffer_content`) cuando hay contención extrema, p. ej. hot pages por inserts en índices monotónicos.

## Timeouts
```sql
-- Postgres
SET lock_timeout = '3s';          -- error 55P03 si espera más por un lock
SET statement_timeout = '30s';    -- tope para toda la sentencia
SELECT ... FOR UPDATE NOWAIT;     -- falla de inmediato

-- MySQL
SET innodb_lock_wait_timeout = 5; -- segundos (default 50), error 1205
SELECT ... FOR UPDATE NOWAIT;

-- SQL Server
SET LOCK_TIMEOUT 3000;            -- ms, error 1222
```
- Prefiere fallar rápido y reintentar antes que acumular esperas que agoten el pool de conexiones.

## Diagnóstico: quién bloquea a quién

### Postgres
```sql
SELECT a.pid,
       pg_blocking_pids(a.pid) AS bloqueado_por,
       a.state,
       now() - a.xact_start   AS duracion_tx,
       a.wait_event_type, a.wait_event,
       left(a.query, 80)       AS query
FROM pg_stat_activity a
WHERE cardinality(pg_blocking_pids(a.pid)) > 0;

-- Detalle de locks
SELECT locktype, relation::regclass, mode, granted, pid
FROM pg_locks WHERE NOT granted;

-- Último recurso
SELECT pg_cancel_backend(<pid>);     -- cancela la query
SELECT pg_terminate_backend(<pid>);  -- mata la sesión
```
- `log_lock_waits = on` registra esperas mayores a `deadlock_timeout`.

### MySQL 8
```sql
SELECT * FROM sys.innodb_lock_waits\G
SELECT * FROM performance_schema.data_locks;
SHOW ENGINE INNODB STATUS\G   -- sección TRANSACTIONS y LATEST DETECTED DEADLOCK
```

### SQL Server
```sql
SELECT request_session_id, resource_type, request_mode, request_status
FROM sys.dm_tran_locks;
SELECT session_id, blocking_session_id, wait_type, wait_time
FROM sys.dm_exec_requests WHERE blocking_session_id <> 0;
```

## Advisory locks y locks distribuidos
- **Advisory locks**: locks sobre un identificador arbitrario (no una fila), útiles para jobs singleton y serializar por entidad. Ver [../Transactions/Transacciones.md](../Transactions/Transacciones.md#advisory-locks).
- **Locks distribuidos** (Redis, ZooKeeper, etcd): cuando el recurso no está en una sola base. Necesitan lease + fencing token para ser seguros (ver [01-RaceConditions.md](01-RaceConditions.md#locks-distribuidos-cuando-la-db-no-alcanza)).

## Buenas prácticas
- Transacciones cortas: los locks se liberan en el commit.
- Nada de I/O externo con locks tomados.
- Índices en las columnas de los `WHERE` que bloquean.
- Orden consistente al bloquear varias filas.
- `lock_timeout` en migraciones y operaciones administrativas.
- Monitorear esperas de locks como métrica (no solo latencia de queries).

## Preguntas de entrevista
1. **¿Diferencia entre lock compartido y exclusivo?** S permite otros S; X no es compatible con nada.
2. **¿Qué es 2PL?** Adquirir todos los locks antes de liberar cualquiera; en la variante strict se liberan al commit. Garantiza serializabilidad.
3. **¿Qué son los intent locks?** Marcas en niveles superiores (tabla) que indican locks en niveles inferiores, para que un lock de tabla no tenga que revisar cada fila.
4. **¿Por qué un `UPDATE` sin índice bloquea tanto en MySQL?** InnoDB bloquea las entradas de índice recorridas; sin índice recorre toda la tabla.
5. **¿Cómo encuentras la query que bloquea en Postgres?** `pg_stat_activity` + `pg_blocking_pids()`; luego cancelar o terminar si es necesario.
6. **¿Diferencia entre lock y latch?** El lock protege datos lógicos durante la tx; el latch protege estructuras físicas en memoria por microsegundos.

## Errores comunes
- Transacciones que retienen locks mientras esperan HTTP o input del usuario.
- Esperar locks indefinidamente (sin `lock_timeout` / `NOWAIT`).
- Matar sesiones sin entender qué estaban haciendo (el rollback de una tx grande también tarda).
- Asumir que `SELECT` no toma ningún lock (toma `ACCESS SHARE` de tabla, que choca con `ALTER TABLE`).
