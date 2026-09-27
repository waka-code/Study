# Isolation (aislamiento)

## Qué es
- La **I** de ACID: define **qué puede ver** una transacción de lo que hacen otras transacciones concurrentes.
- El ideal es **serializabilidad**: el resultado de ejecutar transacciones concurrentes es equivalente a **alguna** ejecución en serie (una tras otra). Cuesta rendimiento, así que los motores ofrecen niveles más débiles que permiten anomalías concretas.
- Elegir un nivel de aislamiento es elegir **qué anomalías acepta tu aplicación** y cuáles resuelves tú (con constraints, locks o versiones).

## Niveles del estándar SQL (ANSI/ISO)
El estándar define los niveles por los fenómenos que **prohíben**:

| Nivel | Dirty read (P1) | Non-repeatable (P2) | Phantom (P3) |
|---|---|---|---|
| Read Uncommitted | posible | posible | posible |
| Read Committed | — | posible | posible |
| Repeatable Read | — | — | posible |
| Serializable | — | — | — |

- Dirty write (P0) está prohibido en todos.
- Anomalías: [03-DirtyReads.md](03-DirtyReads.md), [04-NonRepeatableReads.md](04-NonRepeatableReads.md), [05-PhantomReads.md](05-PhantomReads.md), [02-LostUpdates.md](02-LostUpdates.md).

### El estándar está incompleto
- *A Critique of ANSI SQL Isolation Levels* (Berenson et al., 1995) mostró que la definición es ambigua y omite anomalías: **lost update**, **read skew** y **write skew**.
- También describió **Snapshot Isolation (SI)**, que no aparece en el estándar pero es lo que realmente implementan la mayoría de los motores MVCC.
- Por eso el mismo nombre significa cosas distintas según el motor. La tabla completa por motor está en [../Transactions/Transacciones.md](../Transactions/Transacciones.md#niveles-de-aislamiento).

## Dos formas de implementar aislamiento

### 1. Locking (2PL: two-phase locking)
- Lectores toman locks compartidos, escritores locks exclusivos; se liberan al final de la tx (**strict 2PL**).
- Serializable con 2PL requiere además locks de **rango/predicado** para evitar phantoms.
- Costo: lectores y escritores se bloquean mutuamente → esperas y deadlocks.
- Ejemplos: SQL Server Read Committed "clásico" y Serializable, MySQL Serializable, DB2.

### 2. MVCC (multi-version concurrency control)
- Cada escritura crea una **versión nueva**; cada tx lee un **snapshot** de versiones confirmadas.
- Lectores nunca bloquean a escritores ni viceversa. Escritores sobre la **misma fila** sí se bloquean entre sí.
- Da naturalmente **Snapshot Isolation**. Para llegar a serializable hay que añadir algo:
  - **SSI** (Serializable Snapshot Isolation): detectar dependencias peligrosas y abortar (Postgres ≥ 9.1, CockroachDB).
  - O volver a locks en lecturas (MySQL Serializable).
- Detalle interno: [../InternosMotor.md](../InternosMotor.md).

### Snapshot Isolation en una línea
- Cada tx ve el estado confirmado al inicio de su snapshot; si dos tx escriben la **misma fila**, gana el primero en confirmar (*first-committer-wins*) y el otro aborta.
- Evita dirty, non-repeatable, phantom (en lecturas), read skew y lost update.
- **No evita write skew**: dos tx leen lo mismo y escriben filas distintas.
- Oracle llama "SERIALIZABLE" a lo que en realidad es snapshot isolation (permite write skew). Postgres también lo hacía antes de 9.1.

## Defaults por motor

| Motor | Default | Nivel máximo real |
|---|---|---|
| PostgreSQL | Read Committed | Serializable (SSI) |
| MySQL InnoDB | Repeatable Read | Serializable (con locks) |
| SQL Server | Read Committed (locks; snapshot en Azure SQL) | Serializable (key-range locks) |
| Oracle | Read Committed | "Serializable" = snapshot isolation |
| CockroachDB | Serializable | Serializable |
| Google Spanner | Serializable / strict serializable (*external consistency*) | Strict serializable |
| MongoDB (transacciones) | Snapshot (con `readConcern: "snapshot"`) | Snapshot |

## Cómo se configura
```sql
-- Postgres: por transacción
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- o
BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Postgres: por sesión / rol / base
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;
ALTER ROLE reportes SET default_transaction_isolation = 'repeatable read';

-- MySQL
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;   -- solo la próxima tx

-- SQL Server
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;       -- requiere ALLOW_SNAPSHOT_ISOLATION ON
```
```ts
// Prisma
await prisma.$transaction(async (tx) => { /* ... */ }, {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
});

// TypeORM
await dataSource.transaction('SERIALIZABLE', async (manager) => { /* ... */ });
```
- Con PgBouncer en modo transacción, usa `BEGIN ISOLATION LEVEL ...` por transacción; un `SET SESSION` se "pega" a la conexión física (ver [../ConnectionPooling.md](../ConnectionPooling.md)).

## Cómo elegir

| Necesidad | Nivel recomendado |
|---|---|
| OLTP general con updates atómicos, constraints y locks puntuales | Read Committed |
| Reportes/exports que deben ser consistentes | Repeatable Read `READ ONLY` |
| Muchas invariantes entre filas, difíciles de enumerar | Serializable + reintentos |
| Mucha contención sobre las mismas filas | Read Committed + locks explícitos (Serializable abortaría demasiado) |
| MySQL con deadlocks por gap locks | Considerar Read Committed |

- Regla práctica: Read Committed + **las herramientas correctas** (constraints, updates atómicos, versiones, `FOR UPDATE`) resuelve la mayoría de los casos. Serializable es la opción "correcta por defecto" si tu equipo puede sostener la disciplina de reintentos.

## Serializable en la práctica
- Todas las transacciones que participan deberían correr en Serializable: SSI solo protege entre tx serializables.
- Transacciones **cortas**; más duración = más conflictos.
- Índices en los predicados: menos falsos positivos.
- Marca `READ ONLY` lo que no escribe; `READ ONLY DEFERRABLE` para reportes largos (nunca abortan).
- Reintento obligatorio de **toda la transacción** ante `40001` (ver patrón en [../Transactions/Transacciones.md](../Transactions/Transacciones.md#patrón-de-reintentos-con-backoff)).

## Serializable ≠ linealizable
- **Serializable**: equivale a *algún* orden serial, no necesariamente al orden real en el tiempo. Una tx podría "verse" antes que otra que confirmó antes.
- **Linealizable**: cada operación parece ocurrir en un instante entre su inicio y su fin, respetando el tiempo real (propiedad de sistemas distribuidos/registros, ver [../CAP.md](../CAP.md)).
- **Strict serializable** = ambas. Lo ofrece Spanner; una base de un solo nodo con Serializable también lo cumple en la práctica.
- En réplicas asíncronas, aunque el primario sea Serializable, leer de la réplica rompe todo esto (stale reads).

## Preguntas de entrevista
1. **¿Qué garantiza Serializable?** Que el resultado equivale a alguna ejecución serial de las transacciones.
2. **¿Qué es Snapshot Isolation y qué anomalía permite?** Cada tx lee un snapshot fijo y el primer escritor gana en conflictos de la misma fila; permite write skew.
3. **¿Por qué el mismo nivel se comporta distinto en cada motor?** El estándar define niveles por fenómenos de forma ambigua; los motores implementan MVCC/SI o locking y el nombre no dice el mecanismo.
4. **¿Qué nivel usarías por defecto?** Read Committed con constraints, updates atómicos y locks explícitos; Serializable si hay muchas invariantes complejas y hay reintentos.
5. **¿Diferencia entre serializable y linealizable?** Serializable es sobre transacciones (algún orden); linealizable es sobre operaciones individuales respetando tiempo real.

## Errores comunes
- Asumir que el nombre del nivel significa lo mismo en todos los motores.
- Subir a Serializable sin reintentos.
- Mezclar tx serializables con tx de nivel menor esperando protección total.
- `SET SESSION ... ISOLATION` detrás de un pooler en modo transacción.
- Pensar que el aislamiento protege lecturas hechas en una réplica.
