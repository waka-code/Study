# Dirty reads

## Qué es
- Leer datos que otra transacción **escribió pero todavía no confirmó**. Si esa transacción hace `ROLLBACK`, leíste un valor que **nunca existió**.
- Es la anomalía más grave y la única que evita el nivel **Read Committed** (fenómeno P1 del estándar ANSI).

```sql
-- T1                                              -- T2 (READ UNCOMMITTED)
BEGIN;
UPDATE cuentas SET saldo = saldo + 1000000
 WHERE id = 1;                                     
                                                   BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
                                                   SELECT saldo FROM cuentas WHERE id = 1;
                                                   -- ve el millón y aprueba un crédito
ROLLBACK;  -- el millón nunca existió
```

## Dirty write (P0)
- Escribir sobre un dato que otra tx escribió y no confirmó. Si una hace rollback, ¿a qué valor vuelve la fila?
- **Todos** los niveles, incluso Read Uncommitted, lo impiden: el primer escritor toma un lock exclusivo de fila hasta su commit y el segundo espera.

## Qué hace cada motor

| Motor | ¿Puede haber dirty reads? |
|---|---|
| Postgres | **Nunca**. `READ UNCOMMITTED` se acepta pero se comporta como Read Committed (MVCC no expone versiones no confirmadas). |
| MySQL InnoDB | Sí, solo en `READ UNCOMMITTED` (lee la última versión de la fila, confirmada o no). |
| SQL Server | Sí, en `READ UNCOMMITTED` o con el hint **`WITH (NOLOCK)`**. |
| Oracle | Nunca; no ofrece Read Uncommitted. |

## El caso real: `NOLOCK` en SQL Server
En SQL Server con Read Committed "clásico" (sin `READ_COMMITTED_SNAPSHOT`), los lectores toman locks compartidos y esperan a los escritores. Para "que no se bloqueen los reportes" se esparce `NOLOCK` por todo el código:
```sql
SELECT SUM(monto) FROM pedidos WITH (NOLOCK) WHERE fecha >= '2026-09-01';
```
Consecuencias, más allá de leer datos no confirmados:
- **Filas duplicadas o faltantes**: con `NOLOCK` el motor puede recorrer en orden de asignación; si un page split mueve filas durante el scan, puedes leer una fila dos veces o saltártela, aunque esa fila **no** se esté modificando lógicamente.
- **Error 601**: "Could not continue scan with NOLOCK due to data movement".
- Leer una fila a medio actualizar entre índices (ves valores inconsistentes entre índice y tabla).

La alternativa correcta:
```sql
-- Versionado de filas: los lectores leen la última versión confirmada sin bloquear
ALTER DATABASE MiDb SET READ_COMMITTED_SNAPSHOT ON;
```
- Es el default en Azure SQL. Mueve el costo a tempdb (version store), pero elimina los bloqueos lector-escritor sin sacrificar corrección.

## ¿Cuándo es aceptable?
- Casi nunca en OLTP. Algunos lo toleran en:
  - Monitoreo aproximado (`¿cuántas filas hay más o menos?`).
  - Diagnóstico durante un incidente, cuando el bloqueo es el problema.
- Aun ahí, en motores MVCC no ganas nada: Read Committed ya no bloquea lecturas.

## Dirty reads a nivel de aplicación
La base te protege, pero puedes reintroducir el problema fuera de ella: exponer un estado **antes** de que la transacción confirme.
```ts
// ❌ Otro servicio lee el cache / consume el evento de un pedido que luego hace rollback
await db.query('BEGIN');
const pedido = await crearPedido(db, datos);
await redis.set(`pedido:${pedido.id}`, JSON.stringify(pedido)); // visible antes del commit
await kafka.send({ topic: 'pedidos', messages: [{ value: JSON.stringify(pedido) }] });
await cobrar(db, pedido);   // si falla -> ROLLBACK, pero el mundo ya lo vio
await db.query('COMMIT');
```
- Soluciones:
  - Publicar/invalidar **después** del commit (hooks `afterCommit` en ORMs).
  - Para no perder el evento si el proceso muere entre commit y publicación: **Outbox pattern** (ver [../OutboxCDC.md](../OutboxCDC.md)).
- Otras variantes: leer desde otra conexión del pool datos que tu propia tx aún no confirmó (no los verás, no es dirty read, pero confunde); enviar un email de "pedido confirmado" dentro de la tx.

## Dirty reads en sistemas distribuidos
- Réplicas asíncronas **no** producen dirty reads (solo replican lo confirmado); producen **stale reads** (ver [../ReadReplicas.md](../ReadReplicas.md)).
- En sagas o flujos de varios servicios, un paso intermedio confirmado localmente puede compensarse después: otros servicios pudieron ver un estado que "se deshizo". Es la falta de aislamiento global de las sagas; se mitiga con estados explícitos (`PENDIENTE`, `CONFIRMADO`) y *semantic locks* (ver [../TransaccionesDistribuidas.md](../TransaccionesDistribuidas.md)).

## Preguntas de entrevista
1. **¿Qué es un dirty read?** Leer cambios no confirmados de otra tx; si esa tx hace rollback, actuaste sobre datos inexistentes.
2. **¿Postgres permite dirty reads?** No, ni siquiera con `READ UNCOMMITTED`, que se mapea a Read Committed.
3. **¿Por qué `NOLOCK` es peligroso?** Además de datos no confirmados, puede duplicar u omitir filas por movimientos de página y lanzar el error 601. Mejor `READ_COMMITTED_SNAPSHOT`.
4. **¿Cuál es la diferencia entre dirty read y dirty write?** Dirty write es sobrescribir datos no confirmados; ningún nivel lo permite.
5. **¿Puedes tener "dirty reads" con una base que no los permite?** Sí, a nivel de aplicación: publicando eventos o poblando caches antes del commit.

## Errores comunes
- `NOLOCK` como solución universal a bloqueos en SQL Server.
- Creer que `READ UNCOMMITTED` en Postgres "acelera" las lecturas (no cambia nada).
- Publicar eventos, escribir en cache o mandar emails dentro de la transacción.
- Confundir stale reads de réplicas con dirty reads.
