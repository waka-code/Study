# 6️⃣ Transacciones y concurrencia (CRÍTICO)

Aquí se caen muchos.

## Debes dominar
- ACID
- `BEGIN / COMMIT / ROLLBACK`
- Niveles de aislamiento: READ COMMITTED, REPEATABLE READ, SERIALIZABLE
- Locks: Row-level, Table-level
- Deadlocks

> ¿Por qué PostgreSQL no usa locks agresivos? Respuesta: **usa MVCC**.
