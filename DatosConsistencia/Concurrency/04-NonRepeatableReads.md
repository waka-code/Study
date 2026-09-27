# Non-repeatable reads

## Qué es
- Dentro de una misma transacción lees **la misma fila** dos veces y obtienes valores distintos, porque otra transacción la modificó (o borró) y confirmó entre ambas lecturas.
- Fenómeno **P2** del estándar ANSI. Read Committed lo permite; Repeatable Read lo evita (por eso el nombre).

```sql
-- T1 (Read Committed)                                 -- T2
BEGIN;
SELECT precio FROM productos WHERE id = 7;  -- 1000
                                                        UPDATE productos SET precio = 1500 WHERE id = 7;
                                                        COMMIT;
SELECT precio FROM productos WHERE id = 7;  -- 1500
COMMIT;
```
- Ninguna de las dos lecturas es "sucia": ambas ven datos confirmados. El problema es que la transacción no ve un estado **estable**.

## Por qué importa
```ts
// Checkout en Read Committed
await tx.query('BEGIN');
const { rows: [p] } = await tx.query('SELECT precio FROM productos WHERE id = $1', [id]);
mostrarResumen(p.precio);           // cliente ve 1000

// ... validaciones, cálculo de impuestos que vuelve a leer el producto ...
const total = await calcularTotal(tx, id);   // lee de nuevo: 1500
await tx.query('INSERT INTO pedidos (producto_id, total) VALUES ($1, $2)', [id, total]);
await tx.query('COMMIT');
// El pedido se guarda con un precio distinto al que validaste
```
- Casos donde duele: reportes con varias queries que deben cuadrar, validaciones que leen en un paso y usan en otro, migraciones de datos que recorren tablas en varias pasadas.

### Pariente cercano: read skew
- Non-repeatable read es sobre **una** fila leída dos veces. **Read skew** es leer filas **distintas** en momentos distintos y ver un estado global inconsistente (dos cuentas que no suman lo que deberían durante una transferencia). Ambas desaparecen con un snapshot único por transacción. Ejemplo completo en [../Transactions/Transacciones.md](../Transactions/Transacciones.md).

## Cómo lo resuelve cada motor

### Postgres
- **Read Committed**: cada **sentencia** toma un snapshot nuevo. Una sola sentencia sí es consistente consigo misma (un `SELECT` con joins ve un único momento), pero dos sentencias pueden ver momentos distintos.
- **Repeatable Read**: el snapshot se toma en la **primera sentencia** de la transacción (no en `BEGIN`) y se mantiene hasta el final.
```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT precio FROM productos WHERE id = 7;  -- 1000
-- otra tx cambia a 1500 y confirma
SELECT precio FROM productos WHERE id = 7;  -- sigue 1000
UPDATE productos SET stock = stock - 1 WHERE id = 7;
-- ERROR 40001: la fila cambió después del snapshot -> reintentar
COMMIT;
```
- Leer es estable y gratis (no bloquea). Si intentas **escribir** una fila que cambió, falla: la app debe reintentar.

### MySQL InnoDB
- Default **Repeatable Read**: los `SELECT` normales (*consistent reads*) leen del snapshot creado en la **primera lectura** de la transacción.
- Para fijar el snapshot en el inicio: `START TRANSACTION WITH CONSISTENT SNAPSHOT;` (lo usa `mysqldump --single-transaction`).
- Trampa: `SELECT ... FOR UPDATE`, `UPDATE` y `DELETE` hacen **current read** (última versión confirmada), así que en la misma tx puedes ver un valor con `SELECT` y otro con `SELECT ... FOR UPDATE`.

### SQL Server
- Read Committed con locks: el lock compartido se libera al terminar de leer cada fila → non-repeatable reads.
- `REPEATABLE READ` mantiene los locks compartidos hasta el commit → los escritores **esperan** (más bloqueo).
- `SNAPSHOT` da lecturas estables con versionado (similar a Postgres RR).

## Alternativas sin cambiar el nivel de aislamiento
1. **Leer una sola vez** y pasar el valor por la lógica (no volver a consultar).
2. **Bloquear lo que lees** si vas a decidir en base a ello:
```sql
SELECT precio FROM productos WHERE id = 7 FOR SHARE;   -- nadie puede modificarlo hasta mi commit
```
3. **Una sola sentencia** para reportes que deben cuadrar (CTEs en lugar de varias queries), aprovechando que cada sentencia es consistente.
4. **Snapshot explícito para reportes**: `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;` en Postgres, o compartir un snapshot entre sesiones con `pg_export_snapshot()` (lo usa `pg_dump -j`).

## Costos de Repeatable Read
- Postgres/MySQL: no bloquean lecturas, pero una tx larga en RR retiene versiones viejas → bloat / history list length crece (ver [../InternosMotor.md](../InternosMotor.md)).
- Postgres: errores 40001 en escrituras concurrentes → necesitas reintentos.
- SQL Server `REPEATABLE READ`: bloquea escritores y aumenta deadlocks.

## Preguntas de entrevista
1. **¿Qué es un non-repeatable read?** Leer la misma fila dos veces en una tx y obtener valores distintos porque otra tx la cambió y confirmó.
2. **¿Diferencia con dirty read?** En el dirty read el valor no estaba confirmado; en el non-repeatable, ambos valores estaban confirmados.
3. **¿Diferencia con phantom read?** Non-repeatable es sobre filas existentes que cambian; phantom es sobre el **conjunto** de filas que cumple un predicado (aparecen o desaparecen filas).
4. **¿En qué momento toma el snapshot Postgres Repeatable Read?** En la primera sentencia después de `BEGIN`, no en el `BEGIN` mismo.
5. **¿Cómo haces un reporte consistente sin bloquear?** Transacción `REPEATABLE READ READ ONLY` (o una sola query) en un motor MVCC.

## Errores comunes
- Asumir que `BEGIN ... COMMIT` da una vista estable (en Read Committed, no).
- Mezclar `SELECT` y `SELECT ... FOR UPDATE` en MySQL RR y sorprenderse de valores distintos.
- Subir a Repeatable Read en Postgres sin agregar reintentos.
- Reportes de varias queries en Read Committed que no cuadran.
