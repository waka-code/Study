# Transacciones, aislamiento y concurrencia

## ACID
- Conjunto de propiedades que garantizan que una transacción sea confiable.
- **Atomicidad**: la transacción se ejecuta completa o no se ejecuta nada (todo o nada).
- **Consistencia**: la base de datos pasa de un estado válido a otro válido, respetando reglas y constraints. Ojo: es en gran parte responsabilidad de la **aplicación** (y de los constraints que declares); no es la misma "C" que la de CAP (ver [CAP.md](CAP.md)).
- **Aislamiento (Isolation)**: las transacciones concurrentes no se interfieren entre sí. Solo en `SERIALIZABLE` el resultado equivale a alguna ejecución en serie; los niveles inferiores permiten anomalías concretas.
- **Durabilidad**: una vez confirmada (commit), la transacción sobrevive a caídas. Se logra con el WAL/redo log y `fsync` (ver [InternosMotor.md](InternosMotor.md)).

### Ejemplo ACID (transferencia bancaria)
```sql
BEGIN;
  UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1; -- resto de origen
  UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2; -- sumo a destino
COMMIT; -- si algo falla antes del COMMIT, ROLLBACK deja todo como estaba
```

- Refuerza la invariante con un constraint en vez de confiar solo en el código: `ALTER TABLE cuentas ADD CONSTRAINT saldo_no_negativo CHECK (saldo >= 0);`

## Anomalías de concurrencia

| Anomalía | Qué pasa | Ejemplo |
|---|---|---|
| **Dirty read** | Lees datos no confirmados de otra tx (que puede hacer rollback). | Ves un saldo que nunca existió. |
| **Non-repeatable read** | Lees la misma fila dos veces y cambia entre lecturas. | Precio distinto en la misma tx. |
| **Phantom read** | Repites una consulta con predicado y aparecen/desaparecen filas. | `COUNT(*)` de reservas cambia. |
| **Read skew** | Ves partes de la base en momentos distintos → estado inconsistente. | Dos cuentas que suman mal durante una transferencia. |
| **Lost update** | Dos tx hacen leer-modificar-escribir y una pisa a la otra. | Dos compras dejan stock en 9 en vez de 8. |
| **Write skew** | Dos tx leen el mismo conjunto, deciden según él y escriben filas **distintas**; juntas violan una invariante. | Médicos de guardia. |

### Read skew
```sql
-- Alice tiene 500 en cuenta 1 y 500 en cuenta 2 (total 1000)
-- T1 (Read Committed)                 -- T2
SELECT saldo FROM cuentas WHERE id=1;  -- 500
                                        BEGIN;
                                        UPDATE cuentas SET saldo=saldo-100 WHERE id=1;
                                        UPDATE cuentas SET saldo=saldo+100 WHERE id=2;
                                        COMMIT;
SELECT saldo FROM cuentas WHERE id=2;  -- 600  -> T1 ve total 1100
```
- Grave en backups lógicos, reportes y validaciones. Se evita con un **snapshot** único por transacción (Repeatable Read). `pg_dump` usa exactamente eso.

### Lost update
```sql
-- T1                                   -- T2
SELECT stock FROM productos WHERE id=7; -- 10
                                         SELECT stock FROM productos WHERE id=7; -- 10
UPDATE productos SET stock = 9 WHERE id=7;
COMMIT;
                                         UPDATE productos SET stock = 9 WHERE id=7;
                                         COMMIT;  -- se vendieron 2, stock dice 9
```
- El patrón culpable: **leer en la app, calcular y escribir un valor absoluto**. Muy común con ORMs (`product.stock -= 1; save()`).
- Soluciones (de más simple a más compleja): update atómico, lock optimista, `SELECT ... FOR UPDATE`, Repeatable Read/Serializable en Postgres (detecta el conflicto y aborta).

### Write skew: médicos de guardia
Invariante: **al menos un médico de guardia** por turno. Alice y Bob están de guardia y ambos piden salir a la vez.
```sql
-- T1 (Alice)                                    -- T2 (Bob)
BEGIN ISOLATION LEVEL REPEATABLE READ;           BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM guardias                    SELECT count(*) FROM guardias
 WHERE turno_id=1 AND de_guardia;  -- 2           WHERE turno_id=1 AND de_guardia;  -- 2
UPDATE guardias SET de_guardia=false             UPDATE guardias SET de_guardia=false
 WHERE turno_id=1 AND medico='alice';             WHERE turno_id=1 AND medico='bob';
COMMIT;                                          COMMIT;
-- Resultado: 0 médicos de guardia. Nadie modificó la misma fila, así que no hubo conflicto.
```
- Snapshot isolation **no** lo evita: cada tx vio un snapshot válido y escribió filas distintas.
- Soluciones:
  - `SERIALIZABLE` en Postgres (SSI detecta la dependencia y aborta una).
  - Materializar el conflicto: `SELECT ... FROM guardias WHERE turno_id=1 AND de_guardia FOR UPDATE` (bloquea las filas leídas).
  - Si el conflicto es sobre filas **que aún no existen** (p. ej. reservas de sala solapadas), `FOR UPDATE` no alcanza: usa un constraint (`EXCLUDE USING gist` en Postgres), una fila "candado" por recurso o Serializable.

## Niveles de aislamiento

| Nivel | Dirty | Non-repeatable | Phantom | Lost update | Write skew |
|---|---|---|---|---|---|
| Read Uncommitted | posible | posible | posible | posible | posible |
| Read Committed | evitado | posible | posible | posible | posible |
| Repeatable Read (estándar) | evitado | evitado | posible | posible | posible |
| Repeatable Read **Postgres** (snapshot) | evitado | evitado | evitado | **evitado (aborta)** | posible |
| Repeatable Read **MySQL InnoDB** | evitado | evitado | evitado* | **posible** | posible |
| Serializable | evitado | evitado | evitado | evitado | evitado |

\* En InnoDB los `SELECT` normales leen del snapshot, pero `UPDATE`/`DELETE`/`SELECT ... FOR UPDATE` hacen **current read** (última versión confirmada) con next-key locks. Por eso el lost update con leer-calcular-escribir **no** se detecta en MySQL RR.

### Por motor
- **Postgres**: por defecto Read Committed. `READ UNCOMMITTED` se comporta como Read Committed (MVCC nunca muestra datos no confirmados).
  - **Read Committed**: cada **sentencia** toma un snapshot nuevo. Si un `UPDATE` encuentra una fila modificada por una tx concurrente, espera, y re-evalúa el `WHERE` sobre la versión nueva.
  - **Repeatable Read = snapshot isolation**: un único snapshot desde la primera sentencia. Si intentas modificar una fila que otra tx cambió y confirmó después de tu snapshot → `ERROR: could not serialize access due to concurrent update` (SQLSTATE **40001**).
  - **Serializable = SSI** (Serializable Snapshot Isolation): snapshot isolation + detección de dependencias lectura-escritura peligrosas mediante *SIRead locks* (predicate locks que **no bloquean**). Si detecta un ciclo posible, aborta una tx con 40001, normalmente al hacer commit o en la siguiente sentencia.
- **MySQL InnoDB**: por defecto Repeatable Read. `SERIALIZABLE` convierte los `SELECT` en `SELECT ... FOR SHARE` → serializa **bloqueando** (más esperas y deadlocks).
- **SQL Server**: por defecto Read Committed **con locks** (los lectores bloquean a escritores). Con `READ_COMMITTED_SNAPSHOT ON` (default en Azure SQL) usa versionado en tempdb. Tiene además el nivel `SNAPSHOT` (similar al RR de Postgres) y `SERIALIZABLE` con range locks.

### Ejemplo SERIALIZABLE (corregido)
```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  SELECT saldo FROM cuentas WHERE id = 1;
  UPDATE cuentas SET saldo = saldo - 50 WHERE id = 1;
COMMIT;
```
- En Postgres, **otra transacción sí puede leer y modificar** esa fila mientras tanto: SSI no toma locks bloqueantes para lecturas. Lo que ocurre es:
  - Si ambas escriben la **misma fila**, la segunda espera el lock de fila; cuando la primera confirma, la segunda falla con 40001.
  - Si hay un patrón de dependencias que haría el resultado no serializable (p. ej. write skew), una de ellas **aborta con 40001** aunque no toquen las mismas filas.
- Consecuencia práctica: con Serializable **la app debe reintentar** la transacción completa. Sin lógica de reintento, Serializable es un generador de errores 500.
- Declara `READ ONLY DEFERRABLE` en reportes largos serializables: espera un snapshot seguro y nunca aborta.

## Locking pesimista
Bloquea antes de modificar: "asumo que habrá conflicto".

```sql
BEGIN;
SELECT stock FROM productos WHERE id = 7 FOR UPDATE;  -- otras tx con FOR UPDATE/UPDATE esperan
UPDATE productos SET stock = stock - 1 WHERE id = 7;
COMMIT;
```

| Cláusula (Postgres) | Efecto |
|---|---|
| `FOR UPDATE` | Lock exclusivo de fila; bloquea otros `FOR UPDATE`, `FOR SHARE`, `UPDATE`, `DELETE`. Las lecturas normales **no** esperan (MVCC). |
| `FOR NO KEY UPDATE` | Como el anterior pero no bloquea `FOR KEY SHARE` (lo que toman las FKs). Es lo que toma un `UPDATE` que no cambia la clave. |
| `FOR SHARE` | Lock compartido: varios pueden tenerlo; impide que otros modifiquen la fila. |
| `FOR KEY SHARE` | El más débil; lo usan los chequeos de FK. |
| `NOWAIT` | Si la fila está bloqueada, falla de inmediato (`55P03`) en vez de esperar. |
| `SKIP LOCKED` | Salta las filas bloqueadas. Ideal para colas. |

- MySQL: `FOR UPDATE`, `FOR SHARE` (antes `LOCK IN SHARE MODE`), `NOWAIT` y `SKIP LOCKED` desde 8.0. SQL Server usa hints: `WITH (UPDLOCK, ROWLOCK, READPAST)`.

### Cola de trabajos con SKIP LOCKED
```sql
-- Cada worker toma un job distinto sin pelearse con los demás
WITH job AS (
  SELECT id FROM jobs
  WHERE estado = 'pendiente'
  ORDER BY creado_en
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE jobs SET estado = 'procesando', tomado_en = now()
FROM job WHERE jobs.id = job.id
RETURNING jobs.*;
```
- Necesita un índice parcial: `CREATE INDEX ON jobs (creado_en) WHERE estado = 'pendiente';`
- Trade-off: sirve bien hasta miles de jobs/s; con mucho churn genera bloat (ver [InternosMotor.md](InternosMotor.md)). Más allá, un broker dedicado.
- No mantengas la transacción abierta mientras procesas el job si tarda: marca `procesando` y confirma; usa un timeout de "visibilidad" para recuperar jobs huérfanos.

## Locking optimista
No bloquea: "asumo que no habrá conflicto, y lo detecto al escribir". Ideal para ediciones de usuario con tiempo de "pensar" (formularios) donde un lock pesimista duraría minutos.

```sql
ALTER TABLE productos ADD COLUMN version integer NOT NULL DEFAULT 0;

UPDATE productos
SET precio = 1990, version = version + 1
WHERE id = 7 AND version = 3;   -- la versión que leí
-- filas afectadas = 0  -> alguien cambió el registro: conflicto
```

```ts
// Node + pg
async function actualizarPrecio(id: number, nuevoPrecio: number, versionLeida: number) {
  const { rowCount } = await pool.query(
    `UPDATE productos SET precio = $1, version = version + 1
     WHERE id = $2 AND version = $3`,
    [nuevoPrecio, id, versionLeida],
  );
  if (rowCount === 0) {
    // Recargar y reintentar, o devolver 409 Conflict al cliente
    throw new ConflictError(`Producto ${id} fue modificado por otro usuario`);
  }
}
```
- ORMs lo traen: `@Version` en JPA/Hibernate, `@VersionColumn` en TypeORM, `rowversion` en EF Core (SQL Server). Ver [ORMs.md](ORMs.md).
- En HTTP se expone con `ETag` + `If-Match` → `412 Precondition Failed`.
- Con alta contención, el optimista degenera en reintentos continuos: ahí conviene pesimista o update atómico.

| | Pesimista | Optimista |
|---|---|---|
| Conflictos frecuentes | Mejor | Muchos reintentos |
| Conflictos raros | Paga locks innecesarios | Mejor |
| Interacción humana larga | Inviable | Ideal |
| Riesgo de deadlock | Sí | No |

## Updates atómicos
La forma más barata de evitar lost updates: que la base haga el cálculo en una sola sentencia.
```sql
UPDATE productos SET stock = stock - 1
WHERE id = 7 AND stock > 0
RETURNING stock;       -- 0 filas = sin stock
```
- El `UPDATE` toma el lock de fila; en Read Committed re-evalúa `stock > 0` sobre la versión más reciente, así que no hay sobreventa.
- Contadores: `UPDATE posts SET likes = likes + 1 WHERE id = $1`. Si una sola fila recibe miles de updates/s, se vuelve **hot row**: usa contadores fragmentados (N filas por contador y se suman) o agrega en memoria/Redis.
- Upsert atómico: `INSERT ... ON CONFLICT (sku) DO UPDATE SET cantidad = inventario.cantidad + EXCLUDED.cantidad`.

## Advisory locks
Locks a nivel de aplicación identificados por un entero, sin asociarse a ninguna fila.
```sql
-- Garantizar que un solo proceso ejecute el cron de facturación
SELECT pg_try_advisory_lock(hashtext('cron:facturacion'));  -- true/false, no espera

-- Variante ligada a la transacción (se libera sola en COMMIT/ROLLBACK)
BEGIN;
SELECT pg_advisory_xact_lock(42);
-- ... trabajo exclusivo ...
COMMIT;
```
- Casos: jobs singleton, serializar operaciones por cliente (`pg_advisory_xact_lock(cliente_id)`), migraciones (Flyway y otros los usan).
- Los de **sesión** son peligrosos con PgBouncer en modo transacción: el lock queda en una conexión física que otro cliente reutiliza. Prefiere los `_xact_`. Ver [ConnectionPooling.md](ConnectionPooling.md).
- MySQL: `GET_LOCK('nombre', timeout)`. SQL Server: `sp_getapplock`.

## Locks de tabla vs locks de fila
- Los locks de fila protegen datos; los de tabla protegen la **estructura** y operaciones masivas. Todo `SELECT` toma un lock de tabla débil (`ACCESS SHARE`).

| Lock de tabla (Postgres) | Lo toma | Conflictos relevantes |
|---|---|---|
| `ACCESS SHARE` | `SELECT` | Solo con `ACCESS EXCLUSIVE` |
| `ROW EXCLUSIVE` | `INSERT/UPDATE/DELETE` | `SHARE` y superiores |
| `SHARE UPDATE EXCLUSIVE` | `VACUUM`, `CREATE INDEX CONCURRENTLY`, `ANALYZE` | Consigo mismo |
| `SHARE` | `CREATE INDEX` (sin concurrently) | Bloquea escrituras |
| `ACCESS EXCLUSIVE` | `ALTER TABLE` (la mayoría), `DROP`, `TRUNCATE`, `VACUUM FULL` | Con todo, incluso `SELECT` |

- Trampa clásica en migraciones: un `ALTER TABLE` espera un `ACCESS EXCLUSIVE` detrás de una query larga, y **todas las queries nuevas se encolan detrás del ALTER** → caída. Mitigación: `SET lock_timeout = '3s'` y reintentar. Ver [Migraciones.md](Migraciones.md).
- Postgres **no** escala locks: los locks de fila se guardan en la propia tupla (xmax), no en memoria, así que bloquear millones de filas no agota la tabla de locks.

### Lock escalation en SQL Server
- SQL Server mantiene los locks de fila/página en memoria. Cuando una sentencia acumula ~**5.000 locks** en un objeto (o hay presión de memoria), los **escala a un lock de tabla**.
- Efecto: un `UPDATE` masivo bloquea toda la tabla para los demás. Mitigación: procesar en lotes (<5.000 filas), `ALTER TABLE ... SET (LOCK_ESCALATION = AUTO | DISABLE)`, particionado.
- InnoDB tampoco escala, pero sus locks van en el índice: un `UPDATE` con `WHERE` sin índice bloquea todas las filas recorridas (en la práctica, toda la tabla).

## Deadlocks
- Dos transacciones se bloquean mutuamente esperando un recurso que la otra tiene.
- La base detecta el ciclo (Postgres tras `deadlock_timeout`, 1s por defecto) y aborta una víctima (`40P01` en Postgres, error 1213 en MySQL, 1205 en SQL Server). La app debe reintentar.

```sql
-- Transacción A                          -- Transacción B
BEGIN;                                    BEGIN;
UPDATE cuentas SET ... WHERE id=1;        UPDATE cuentas SET ... WHERE id=2;
UPDATE cuentas SET ... WHERE id=2; -- espera a B
                                          UPDATE cuentas SET ... WHERE id=1; -- espera a A -> DEADLOCK
```
- Prevención: acceder siempre en el **mismo orden** (p. ej. `ORDER BY id` al bloquear: `SELECT ... WHERE id IN (1,2) ORDER BY id FOR UPDATE`), transacciones cortas, índices adecuados (menos filas bloqueadas), lotes pequeños.

## Savepoints
Rollback parcial dentro de una transacción.
```sql
BEGIN;
INSERT INTO pedidos (id, cliente_id) VALUES (100, 5);
SAVEPOINT antes_cupon;
INSERT INTO cupones_usados (pedido_id, cupon) VALUES (100, 'BLACK');  -- falla por unique
ROLLBACK TO SAVEPOINT antes_cupon;   -- el pedido sigue en pie
RELEASE SAVEPOINT antes_cupon;
COMMIT;
```
- En Postgres, un error deja la tx en estado *aborted* (`current transaction is aborted`): solo puedes hacer `ROLLBACK` o `ROLLBACK TO SAVEPOINT`.
- Los ORMs los usan para "transacciones anidadas" (`transaction()` dentro de otra).
- Costo en Postgres: cada savepoint es una **subtransacción**. Con más de 64 por transacción (p. ej. un savepoint por fila en un loop) se desborda la caché por backend y aparecen contenciones serias (`SubtransSLRU`), sobre todo con réplicas. No uses savepoints por fila.

## Transacciones largas y sus costos
- **Bloat**: en Postgres, `VACUUM` no puede eliminar tuplas muertas más nuevas que el snapshot más antiguo activo. Una tx abierta 2 horas frena la limpieza de **toda la base**. En InnoDB crece el *history list length* (undo). Ver [InternosMotor.md](InternosMotor.md).
- **Locks retenidos**: los locks de fila y tabla se liberan recién al commit → esperas en cascada.
- **Replicación**: en réplicas de Postgres, una query larga entra en conflicto con el replay (`canceling statement due to conflict with recovery`); con `hot_standby_feedback=on` se evita pero el bloat vuelve al primario. Ver [ReadReplicas.md](ReadReplicas.md).
- **Conexiones ocupadas**: una tx abierta retiene una conexión del pool.
- **Wraparound**: una tx eterna impide congelar XIDs.

### Idle in transaction
Sesión que abrió `BEGIN`, hizo algo y ahora no hace nada: típicamente la app llamó a una API externa o esperó input **dentro** de la transacción, o un bug olvidó el commit.
```sql
SELECT pid, now() - xact_start AS duracion, state, left(query, 60)
FROM pg_stat_activity
WHERE state IN ('idle in transaction', 'idle in transaction (aborted)')
ORDER BY xact_start;

-- Red de seguridad (config o por rol)
ALTER ROLE app SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE app SET statement_timeout = '30s';
```
- Regla: **nunca** hagas I/O externo (HTTP, colas, emails) dentro de una transacción de base de datos. Para coordinar DB + mensaje usa [OutboxCDC.md](OutboxCDC.md).

## Patrón de reintentos con backoff
Errores **reintentables**: `40001` (serialization_failure), `40P01` (deadlock_detected), y a veces `55P03` (lock_not_available) o fallas de conexión antes del commit.
```ts
const REINTENTABLES = new Set(['40001', '40P01']);

async function conTransaccion<T>(fn: (c: PoolClient) => Promise<T>, maxIntentos = 5): Promise<T> {
  for (let intento = 1; ; intento++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const r = await fn(client);
      await client.query('COMMIT');
      return r;
    } catch (e: any) {
      await client.query('ROLLBACK').catch(() => {});
      if (!REINTENTABLES.has(e.code) || intento >= maxIntentos) throw e;
      const base = Math.min(1000, 20 * 2 ** intento);       // backoff exponencial con techo
      await sleep(base / 2 + Math.random() * base / 2);     // jitter
    } finally {
      client.release();
    }
  }
}
```
- Reintenta **la transacción completa**, incluidas las lecturas: los datos leídos ya no son válidos.
- El cuerpo debe ser **libre de efectos externos** (o idempotente). Si el `COMMIT` falla por red, no sabes si se aplicó: usa claves de idempotencia.
- Jitter para evitar que todos los clientes reintenten al unísono (thundering herd).

## MVCC (resumen)
- Postgres, MySQL InnoDB, Oracle y SQL Server (con snapshot) mantienen **múltiples versiones** de cada fila para que lectores y escritores no se bloqueen.
- Cada transacción/sentencia ve un **snapshot** consistente. Los escritores sí se bloquean entre sí sobre la misma fila.
- Detalle de implementación (xmin/xmax, undo log, VACUUM): [InternosMotor.md](InternosMotor.md).

## Preguntas de entrevista
1. **¿Qué es write skew y por qué snapshot isolation no lo evita?** Dos tx leen el mismo conjunto, deciden según él y escriben filas distintas; al no haber conflicto de escritura sobre la misma fila, SI no detecta nada. Se evita con Serializable (SSI), `FOR UPDATE` sobre las filas leídas o constraints.
2. **¿Qué ocurre en Postgres Serializable cuando dos tx entran en conflicto?** No se bloquean por las lecturas; SSI rastrea dependencias con SIRead locks y aborta una con 40001. La app debe reintentar la transacción completa.
3. **¿Cómo evitarías vender más stock del que hay?** `UPDATE ... SET stock = stock - 1 WHERE id = ? AND stock > 0` y verificar filas afectadas; alternativa `FOR UPDATE` si hay lógica compleja entre lectura y escritura.
4. **¿Optimista o pesimista?** Optimista con baja contención o interacción humana larga; pesimista con contención alta y secciones críticas cortas. Update atómico cuando la lógica cabe en SQL.
5. **¿Cómo implementas una cola de trabajos en Postgres?** `FOR UPDATE SKIP LOCKED` con índice parcial, transacciones cortas y timeout de visibilidad para jobs huérfanos; conocer su límite por bloat.
6. **¿Por qué es peligrosa una transacción larga en Postgres?** Frena VACUUM (bloat en toda la base), retiene locks, causa conflictos en réplicas y ocupa conexiones.
7. **¿Diferencia de Repeatable Read entre Postgres y MySQL?** Postgres = snapshot isolation que aborta lost updates con 40001; MySQL lee del snapshot pero los updates hacen current read, así que el lost update de leer-calcular-escribir pasa inadvertido.
8. **¿Qué es lock escalation?** En SQL Server, al pasar ~5.000 locks en un objeto se convierten en un lock de tabla; se mitiga con lotes. Postgres no escala porque guarda los locks de fila en la tupla.

## Errores comunes
- Creer que `SERIALIZABLE` "bloquea la fila" y no implementar reintentos.
- Leer-modificar-escribir desde el ORM sin versión ni lock (lost update).
- Llamar APIs externas dentro de la transacción → idle in transaction, locks largos.
- Usar advisory locks de sesión detrás de PgBouncer en modo transacción.
- `ALTER TABLE` en producción sin `lock_timeout`.
- Reintentar solo la sentencia fallida y no la transacción entera.
- Savepoint por cada fila en loops grandes (subtransacciones en Postgres).
- Asumir que el nivel por defecto es el mismo en todos los motores (Postgres/SQL Server: Read Committed; MySQL: Repeatable Read).
