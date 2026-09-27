# Pessimistic concurrency (control pesimista)

## Qué es
- Estrategia que **bloquea antes de actuar**: asume que habrá conflicto y evita que ocurra. Quien llega segundo **espera** (o falla de inmediato) en lugar de descubrir el conflicto al final.
- Se implementa con [locks](07-Locks.md): `SELECT ... FOR UPDATE`, locks de tabla, advisory locks o locks distribuidos.
- Contraparte: [09-OptimisticConcurrency.md](09-OptimisticConcurrency.md).

## Patrón base
```sql
BEGIN;
SELECT saldo, limite_credito
FROM cuentas
WHERE id = $1
FOR UPDATE;                -- otras tx que quieran modificar/bloquear esta fila esperan

-- lógica en la app con los valores bloqueados (validaciones, reglas, cálculos)

UPDATE cuentas SET saldo = $nuevoSaldo WHERE id = $1;
INSERT INTO movimientos (cuenta_id, monto) VALUES ($1, $monto);
COMMIT;                    -- libera el lock
```
- Las lecturas normales (`SELECT` sin `FOR`) **no esperan** en motores MVCC: ven la versión anterior confirmada.
- Tras esperar, la segunda tx lee el valor **ya actualizado** (en Read Committed, Postgres re-lee la fila bloqueada).

## Variantes de espera
```sql
-- Esperar (default), con tope
SET LOCAL lock_timeout = '2s';
SELECT * FROM pedidos WHERE id = $1 FOR UPDATE;     -- 55P03 si pasa el tope

-- No esperar: fallar de inmediato
SELECT * FROM pedidos WHERE id = $1 FOR UPDATE NOWAIT;   -- 55P03 / MySQL 3572

-- Saltar lo bloqueado (colas, repartir trabajo)
SELECT * FROM jobs WHERE estado = 'pendiente'
ORDER BY id LIMIT 10
FOR UPDATE SKIP LOCKED;
```

| Modo | Úsalo para |
|---|---|
| Esperar | Secciones críticas cortas donde la espera será de ms |
| `lock_timeout` | Casi siempre, como red de seguridad |
| `NOWAIT` | UI que prefiere decir "otro usuario está editando" a colgar; evitar acumular requests |
| `SKIP LOCKED` | Colas de trabajo, asignación de recursos ("dame cualquier asiento libre") |

- Cola completa con `SKIP LOCKED`: [../Transactions/Transacciones.md](../Transactions/Transacciones.md#cola-de-trabajos-con-skip-locked).

## Elegir la fuerza del lock (Postgres)
- `FOR UPDATE`: vas a borrar o cambiar la clave.
- `FOR NO KEY UPDATE`: vas a actualizar columnas normales. Menos conflicto con FKs (inserts de hijos no esperan). Es lo que toma un `UPDATE` común.
- `FOR SHARE`: "que nadie lo cambie mientras decido", sin intención de escribir. Cuidado con el upgrade a exclusivo ([08-Deadlocks.md](08-Deadlocks.md)).

## Bloquear varias filas
```sql
-- Siempre en orden determinista para evitar deadlocks
SELECT id, stock FROM productos
WHERE id = ANY($1::bigint[])
ORDER BY id
FOR UPDATE;
```
- Con joins, `FOR UPDATE` bloquea filas de **todas** las tablas del `FROM`; limita con `FOR UPDATE OF productos`.
- No combina con `GROUP BY`, `DISTINCT` ni agregados: bloquea en una subquery y agrega afuera.

## Materializar el conflicto
Cuando la invariante es sobre un **conjunto** (fantasmas, write skew), bloquea una fila "padre" que represente el recurso:
```sql
BEGIN;
SELECT 1 FROM turnos WHERE id = $turno FOR UPDATE;   -- serializa todas las decisiones de este turno
SELECT count(*) FROM guardias WHERE turno_id = $turno AND de_guardia;
-- si count > 1, permitir salir
UPDATE guardias SET de_guardia = false WHERE turno_id = $turno AND medico_id = $medico;
COMMIT;
```
- Si no existe una fila natural, usa un **advisory lock**:
```sql
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('reserva-sala'), $salaId);   -- clave (int, int)
-- verificar solapamientos e insertar
COMMIT;   -- se libera solo
```

## Locks de tabla explícitos
```sql
BEGIN;
LOCK TABLE tarifas IN SHARE ROW EXCLUSIVE MODE;   -- impide escrituras concurrentes (y otro igual), permite lecturas
-- recalcular todas las tarifas de forma consistente
COMMIT;
```
- Raramente necesario en OLTP; útil para procesos batch que reescriben una tabla completa. `ACCESS EXCLUSIVE` bloquea incluso `SELECT`.

## En ORMs
```ts
// TypeORM
await dataSource.transaction(async (m) => {
  const cuenta = await m.getRepository(Cuenta)
    .createQueryBuilder('c')
    .setLock('pessimistic_write')      // FOR UPDATE
    // .setOnLocked('nowait') | .setOnLocked('skip_locked')
    .where('c.id = :id', { id })
    .getOneOrFail();
  cuenta.saldo -= monto;
  await m.save(cuenta);
});

// Prisma: sin API de locks -> SQL crudo dentro de la transacción interactiva
await prisma.$transaction(async (tx) => {
  const [cuenta] = await tx.$queryRaw<Cuenta[]>`
    SELECT * FROM cuentas WHERE id = ${id} FOR UPDATE`;
  await tx.cuenta.update({ where: { id }, data: { saldo: cuenta.saldo - monto } });
});
```
- JPA/Hibernate: `@Lock(LockModeType.PESSIMISTIC_WRITE)` en el repositorio → `FOR UPDATE`; `PESSIMISTIC_READ` → `FOR SHARE`; timeout con `jakarta.persistence.lock.timeout` (`0` = `NOWAIT`).
- Error clásico: el lock se toma fuera de una transacción (autocommit) → se libera en cuanto termina el `SELECT` y no protege nada.

## "Checkout" para ediciones humanas largas
Un lock de base de datos **no** puede durar minutos (retiene conexión, bloquea a otros, frena VACUUM). Si necesitas exclusividad durante una edición humana, modela el lock como **dato** con lease:
```sql
ALTER TABLE documentos
  ADD COLUMN editando_por bigint,
  ADD COLUMN editando_hasta timestamptz;

-- Tomar el "checkout" (atómico)
UPDATE documentos
SET editando_por = $usuario, editando_hasta = now() + interval '10 minutes'
WHERE id = $1
  AND (editando_por IS NULL OR editando_hasta < now() OR editando_por = $usuario)
RETURNING id;    -- 0 filas: otro lo está editando

-- Renovar periódicamente (heartbeat) y liberar al guardar/cancelar
```
- Combínalo con control optimista al guardar, por si el lease expiró.

## Costos y riesgos
- **Esperas**: el throughput sobre un recurso caliente queda limitado a 1 / (duración de la sección crítica).
- **[Deadlocks](08-Deadlocks.md)**: ordenar accesos y reintentar.
- **Conexiones retenidas**: cada tx esperando ocupa una conexión; con esperas largas el pool se agota y cae todo el servicio.
- **Transacciones largas**: bloat y locks retenidos (ver [../Transactions/Transacciones.md](../Transactions/Transacciones.md#transacciones-largas-y-sus-costos)).
- **Escalabilidad**: locks de base no cruzan servicios ni bases; en sistemas distribuidos necesitas locks distribuidos (con sus riesgos) o rediseñar (una partición/consumidor por entidad).

## Optimista vs pesimista

| Criterio | Pesimista | Optimista |
|---|---|---|
| Contención alta | ✅ espera ordenada | ❌ tormenta de reintentos |
| Contención baja | Paga locks innecesarios | ✅ casi gratis |
| Sección crítica | Debe ser corta (ms) | Puede ser larga (minutos) |
| Interacción humana | ❌ (usar checkout con lease) | ✅ |
| Deadlocks | Posibles | No |
| Trabajo desperdiciado | Nada (esperas antes) | Todo lo hecho antes del conflicto |
| Sistemas sin locks (REST, DynamoDB) | No aplica | ✅ |

- Y antes de ambos: ¿cabe en un **update atómico** o un **constraint**? Suele ser la opción más simple y rápida.

## Preguntas de entrevista
1. **¿Qué es el control pesimista?** Bloquear el recurso antes de leerlo para modificarlo, de modo que los demás esperen.
2. **¿Cuándo lo preferirías al optimista?** Alta contención, sección crítica corta y trabajo que no conviene repetir.
3. **¿Qué es `SKIP LOCKED` y para qué sirve?** Omite filas bloqueadas; permite que varios workers tomen trabajos distintos sin esperar.
4. **¿Cómo implementas exclusividad para una edición de 10 minutos?** Checkout con lease en columnas (usuario + expiración) y control optimista al guardar; nunca un lock de base abierto.
5. **¿Qué pasa si haces `SELECT ... FOR UPDATE` sin transacción?** En autocommit, el lock se libera al terminar la sentencia; no protege nada.
6. **¿Cómo proteges una invariante sobre filas que aún no existen?** Bloqueando una fila padre o un advisory lock (materializar el conflicto), o con un constraint.

## Errores comunes
- `FOR UPDATE` en autocommit o con el ORM fuera de la transacción.
- Llamadas HTTP o espera de input con el lock tomado.
- Bloquear sin `ORDER BY` varias filas.
- Esperar sin `lock_timeout`.
- `FOR UPDATE` en joins sin `OF tabla` (bloquea de más).
- Usar pesimista para contadores simples que resolvería un `UPDATE ... SET x = x + 1`.
