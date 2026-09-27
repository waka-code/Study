# Concurrencia

Qué puede salir mal cuando varias transacciones tocan los mismos datos a la vez, y cómo evitarlo.

## Índice

| # | Tema | En una línea |
|---|---|---|
| 01 | [Race conditions](01-RaceConditions.md) | El resultado depende del intercalado: check-then-act y read-modify-write |
| 02 | [Lost updates](02-LostUpdates.md) | Dos tx leen, calculan y escriben la misma fila; una pisa a la otra |
| 03 | [Dirty reads](03-DirtyReads.md) | Leer datos no confirmados que pueden desaparecer con un rollback |
| 04 | [Non-repeatable reads](04-NonRepeatableReads.md) | La misma fila cambia entre dos lecturas de la misma tx |
| 05 | [Phantom reads](05-PhantomReads.md) | El conjunto que cumple un `WHERE` cambia: aparecen o desaparecen filas |
| 06 | [Isolation](06-Isolation.md) | Niveles de aislamiento, MVCC vs locking, snapshot isolation, serializable |
| 07 | [Locks](07-Locks.md) | Modos, granularidad, 2PL, locks en Postgres/InnoDB, diagnóstico |
| 08 | [Deadlocks](08-Deadlocks.md) | Ciclos de espera: causas típicas, detección, prevención y reintentos |
| 09 | [Optimistic concurrency](09-OptimisticConcurrency.md) | Versiones y compare-and-set: detectar el conflicto al escribir |
| 10 | [Pessimistic concurrency](10-PessimisticConcurrency.md) | `FOR UPDATE`, `NOWAIT`, `SKIP LOCKED`: evitar el conflicto bloqueando |

Orden de estudio sugerido: 01 → 03 → 04 → 05 → 02 → 06 → 07 → 08 → 09 → 10.

## Mapa rápido: anomalía → solución

| Anomalía | Solución más simple | Alternativas |
|---|---|---|
| Duplicados por check-then-act | `UNIQUE` + `ON CONFLICT` | Advisory lock |
| Lost update | Update atómico (`x = x - 1`) | Versión optimista, `FOR UPDATE`, RR en Postgres |
| Dirty read | Read Committed (default en todos) | `READ_COMMITTED_SNAPSHOT` en SQL Server |
| Non-repeatable / read skew | Repeatable Read `READ ONLY` | Leer una sola vez, `FOR SHARE` |
| Phantom / write skew | Constraint (`UNIQUE` parcial, `EXCLUDE`) | Materializar el conflicto, Serializable |
| Deadlock | Orden consistente + reintento | Tx cortas, índices, lotes |

## Relacionado
- [../Transactions/Transacciones.md](../Transactions/Transacciones.md): ACID, tabla de niveles por motor, savepoints, reintentos, advisory locks.
- [../InternosMotor.md](../InternosMotor.md): MVCC, WAL, VACUUM.
- [../TransaccionesDistribuidas.md](../TransaccionesDistribuidas.md): 2PC, sagas.
- [../OutboxCDC.md](../OutboxCDC.md): publicar eventos sin dirty reads a nivel de aplicación.
