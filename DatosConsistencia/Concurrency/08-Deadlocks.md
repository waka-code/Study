# Deadlocks

## Qué es
- Dos (o más) transacciones esperan cada una un lock que tiene la otra. Ninguna puede avanzar: el ciclo nunca se resuelve solo.
- No es un bug de la base: es la consecuencia inevitable de usar locks con acceso en orden arbitrario. El objetivo es **minimizarlos** y **manejarlos** (reintentar), no eliminarlos al 100%.

```sql
-- Transferencias cruzadas
-- T1: 1 -> 2                                   -- T2: 2 -> 1
BEGIN;                                          BEGIN;
UPDATE cuentas SET saldo = saldo - 10           UPDATE cuentas SET saldo = saldo - 10
 WHERE id = 1;  -- lock fila 1                   WHERE id = 2;  -- lock fila 2
UPDATE cuentas SET saldo = saldo + 10           
 WHERE id = 2;  -- espera a T2                  UPDATE cuentas SET saldo = saldo + 10
                                                 WHERE id = 1;  -- espera a T1 -> ciclo
-- La base detecta el ciclo y aborta una (la "víctima")
```

## Condiciones de Coffman
Un deadlock requiere las cuatro a la vez; romper cualquiera lo evita:
1. **Exclusión mutua**: el recurso no se comparte (lock X).
2. **Hold and wait**: se retiene un lock mientras se espera otro.
3. **No preemption**: nadie puede quitarle el lock a su dueño.
4. **Espera circular**: A espera a B y B espera a A.

- En bases de datos, la palanca práctica es la **4**: orden consistente de adquisición. La **2** se ataca bloqueando todo al inicio (`SELECT ... WHERE id IN (...) ORDER BY id FOR UPDATE`).

## Cómo lo manejan los motores

| Motor | Detección | Error |
|---|---|---|
| Postgres | Busca ciclos en el grafo de espera después de `deadlock_timeout` (1s) | `40P01 deadlock_detected` |
| MySQL InnoDB | Detección inmediata (`innodb_deadlock_detect=ON`); aborta la tx con menos filas modificadas | `1213 ER_LOCK_DEADLOCK` |
| SQL Server | Monitor cada ~5s (más frecuente si detecta muchos); víctima según `DEADLOCK_PRIORITY` y costo de rollback | `1205` |
| Oracle | Detección inmediata; revierte la **sentencia**, no la tx | `ORA-00060` |

- **Wait-for graph**: nodos = transacciones, arista A→B = A espera un lock de B. Un ciclo = deadlock.
- Alternativa a detectar: **timeouts** (si esperas más de X, abortas). Más simple, pero aborta también esperas legítimas y tarda más en resolver ciclos reales. InnoDB permite desactivar la detección en cargas con muchísima concurrencia y confiar en `innodb_lock_wait_timeout`.
- La víctima recibe el error; la otra tx continúa normalmente.

## Deadlocks típicos

### 1. Orden inverso (el de arriba)
- Solución: bloquear siempre en el mismo orden (por id).
```sql
BEGIN;
SELECT id FROM cuentas WHERE id IN ($origen, $destino) ORDER BY id FOR UPDATE;
UPDATE cuentas SET saldo = saldo - $monto WHERE id = $origen;
UPDATE cuentas SET saldo = saldo + $monto WHERE id = $destino;
COMMIT;
```

### 2. Updates masivos en orden distinto
```sql
-- T1: UPDATE productos SET activo = false WHERE categoria_id = 5;   (recorre por índice A)
-- T2: UPDATE productos SET precio = precio * 1.1 WHERE marca_id = 9; (recorre por índice B)
-- Las filas en común se bloquean en orden distinto -> deadlock
```
- Solución: lotes pequeños ordenados por PK.
```sql
-- Postgres: bloquear en orden y actualizar por lotes
WITH lote AS (
  SELECT id FROM productos
  WHERE categoria_id = 5 AND activo
  ORDER BY id
  LIMIT 1000
  FOR UPDATE
)
UPDATE productos p SET activo = false FROM lote WHERE p.id = lote.id;
```

### 3. Upgrade de lock compartido a exclusivo
```sql
-- T1 y T2 ejecutan lo mismo
BEGIN;
SELECT * FROM pedidos WHERE id = 1 FOR SHARE;   -- ambas obtienen S
UPDATE pedidos SET estado = 'pagado' WHERE id = 1; -- ambas quieren X, cada una espera a la otra
```
- Solución: si vas a escribir, toma el lock exclusivo desde el principio (`FOR UPDATE`, o `FOR NO KEY UPDATE` en Postgres).
- MySQL tiene una versión implícita: insertar un hijo toma un S sobre la fila padre (chequeo de FK); si dos tx insertan líneas del mismo pedido y luego actualizan `pedidos.total`, ambas tienen S y quieren X → deadlock. Postgres lo evita porque la FK toma `FOR KEY SHARE`, compatible con `FOR NO KEY UPDATE`.

### 4. Gap locks en MySQL ("upsert" manual)
```sql
-- T1 y T2, Repeatable Read, id 50 no existe
BEGIN;
SELECT * FROM stock WHERE id = 50 FOR UPDATE;    -- ambas obtienen gap lock (compatibles)
INSERT INTO stock (id, cantidad) VALUES (50, 1); -- insert intention espera al gap de la otra
-- Deadlock
```
- Soluciones: `INSERT ... ON DUPLICATE KEY UPDATE` (una sola sentencia), o `READ COMMITTED` (sin gap locks).

### 5. Deadlocks de aplicación (la base no los detecta)
- **Pool de conexiones**: un handler abre una tx (retiene la conexión 1) y dentro pide otra conexión al pool para una query "fuera de la tx". Con pool de tamaño N y N requests concurrentes, todos esperan una conexión libre que nunca llega.
```ts
// ❌ Pool de 10, 10 requests simultáneos -> cuelgue total
await prisma.$transaction(async (tx) => {
  await tx.pedido.create({ data });
  await prisma.auditoria.create({ data: log }); // usa OTRA conexión del pool
});
// ✅ Usar siempre el cliente de la transacción (tx) dentro de ella
```
- Además: la tx 1 bloquea una fila y la query por la otra conexión quiere esa misma fila → espera a su propio padre para siempre. La base **no** lo ve como deadlock (son dos sesiones sin ciclo en el grafo; la app es la que cierra el ciclo).
- Mutex en memoria + lock de base en orden distinto entre dos rutas de código.

## Diagnóstico
```sql
-- Postgres: el log incluye las queries involucradas
-- ERROR: deadlock detected
-- DETAIL: Process 123 waits for ShareLock on transaction 456; blocked by process 789. ...
SET log_lock_waits = on;   -- además registra esperas largas

-- MySQL: último deadlock
SHOW ENGINE INNODB STATUS\G         -- sección LATEST DETECTED DEADLOCK
SET GLOBAL innodb_print_all_deadlocks = ON;  -- todos al error log
```
- SQL Server: sesión de Extended Events `system_health` guarda el **deadlock graph** en XML (`xml_deadlock_report`).
- Métricas: `pg_stat_database.deadlocks` en Postgres, `Innodb_deadlocks` en MySQL. Alertar sobre la tendencia, no sobre un evento aislado.

## Prevención (checklist)
1. **Orden consistente** de acceso a filas y tablas en todas las rutas de código.
2. **Transacciones cortas**: menos tiempo con locks = menos solapamiento.
3. **Índices** en los `WHERE` de `UPDATE`/`DELETE`/`FOR UPDATE`: menos filas bloqueadas.
4. **Lotes pequeños** y ordenados en operaciones masivas.
5. **Lock exclusivo desde el inicio** si vas a escribir (no S → X).
6. **Una sola sentencia** cuando sea posible (`ON CONFLICT`, `ON DUPLICATE KEY`, update atómico).
7. **`NOWAIT` / `lock_timeout`** donde esperar no tiene sentido.
8. MySQL: considerar `READ COMMITTED` si los gap locks son la causa.
9. Alternativas sin locks: control optimista ([09-OptimisticConcurrency.md](09-OptimisticConcurrency.md)).

## Manejo: reintentar
- Un deadlock aborta la **transacción completa** (salvo Oracle): reintenta desde `BEGIN`, releyendo datos.
- Backoff con jitter para que las mismas tx no vuelvan a chocar en el mismo instante.
- Patrón en [../Transactions/Transacciones.md](../Transactions/Transacciones.md#patrón-de-reintentos-con-backoff) (`40P01` es reintentable).

## Preguntas de entrevista
1. **¿Qué es un deadlock y cómo lo resuelve la base?** Ciclo de esperas entre tx; la base lo detecta con un grafo de espera y aborta una víctima.
2. **¿Cómo los prevendrías?** Orden consistente, tx cortas, índices, lotes pequeños, lock exclusivo desde el inicio.
3. **¿Deadlock vs lock wait timeout?** El deadlock es un ciclo detectado (nunca se resolvería); el timeout es una espera que excede un límite, aunque podría haberse resuelto.
4. **¿Por qué `SELECT ... FOR SHARE` seguido de `UPDATE` es peligroso?** Dos tx pueden tener el S y ninguna consigue el X.
5. **Describe un deadlock que la base no puede detectar.** Agotamiento del pool: una tx retiene una conexión y espera otra conexión del mismo pool.

## Errores comunes
- Tratar el deadlock como error fatal (500) en vez de reintentar.
- Reintentar solo la última sentencia.
- Subir `deadlock_timeout` para "que haya menos" (solo tarda más en detectarlos).
- Usar el cliente global del ORM dentro de un callback de transacción.
- Bloquear filas en el orden en que llegan en el request (`ids` sin ordenar).
