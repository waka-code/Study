# Phantom reads

## Qué es
- Repites una consulta con un **predicado** (`WHERE`) dentro de la misma transacción y el **conjunto** de filas cambia: aparecen filas nuevas ("fantasmas") o desaparecen, porque otra tx insertó/borró/actualizó filas que ahora cumplen (o dejan de cumplir) el predicado.
- Fenómeno **P3** del estándar ANSI. El Repeatable Read del estándar lo permite; Serializable lo evita.

```sql
-- T1                                                   -- T2
BEGIN;
SELECT count(*) FROM reservas
 WHERE sala_id = 3 AND fecha = '2026-10-01';  -- 4
                                                         INSERT INTO reservas (sala_id, fecha) VALUES (3, '2026-10-01');
                                                         COMMIT;
SELECT count(*) FROM reservas
 WHERE sala_id = 3 AND fecha = '2026-10-01';  -- 5  (fantasma)
COMMIT;
```

### Por qué es distinto a non-repeatable read
- Un lock de **fila** protege filas que ya existen. Una fila fantasma **no existía** cuando la leíste, así que no había nada que bloquear. Para evitarlos hay que proteger el **predicado** o el **rango** (predicate locks, gap/next-key locks, key-range locks).

## El problema real: phantoms que causan write skew
Leer fantasmas es molesto; **decidir** en base a su ausencia es peligroso.
```sql
-- Regla: una sala no puede tener reservas solapadas
-- T1                                                  -- T2
BEGIN ISOLATION LEVEL REPEATABLE READ;                 BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT 1 FROM reservas                                 SELECT 1 FROM reservas
 WHERE sala_id = 3                                      WHERE sala_id = 3
   AND periodo && '[10:00,11:00)';  -- 0 filas            AND periodo && '[10:30,11:30)';  -- 0 filas
INSERT INTO reservas VALUES (3, '[10:00,11:00)');      INSERT INTO reservas VALUES (3, '[10:30,11:30)');
COMMIT;                                                COMMIT;
-- Dos reservas solapadas. FOR UPDATE no ayuda: el SELECT no devolvió filas que bloquear.
```
- Otros ejemplos: usernames únicos sin constraint, límite de "máximo 5 tickets por usuario", "un solo pedido activo por cliente", cupos de un evento.

## Qué hace cada motor

| Motor / nivel | Lectura fantasma | Write skew por fantasma |
|---|---|---|
| Postgres Read Committed | Sí | Sí |
| Postgres Repeatable Read (snapshot) | **No** (el snapshot no ve inserts posteriores) | **Sí** |
| Postgres Serializable (SSI) | No | No: aborta con 40001 |
| MySQL RR, `SELECT` normal | No (snapshot) | — |
| MySQL RR, `SELECT ... FOR UPDATE/SHARE` | No: **next-key locks** bloquean inserts en el rango | No, si el rango está indexado |
| SQL Server Serializable | No: **key-range locks** | No |

### MySQL: gap locks y next-key locks
```sql
-- InnoDB, Repeatable Read, índice en (sala_id, fecha)
BEGIN;
SELECT * FROM reservas WHERE sala_id = 3 AND fecha = '2026-10-01' FOR UPDATE;
-- Bloquea las filas encontradas + los "huecos" del índice alrededor
-- Otra tx que intente INSERT (3, '2026-10-01') espera
```
- **Record lock**: la entrada del índice. **Gap lock**: el hueco entre entradas (impide inserts). **Next-key lock** = record + gap anterior.
- Sin índice útil, el scan recorre (y bloquea) toda la tabla.
- En `READ COMMITTED`, InnoDB desactiva la mayoría de gap locks: menos deadlocks, pero vuelven los phantoms en lecturas con lock.
- Los gap locks son compatibles entre sí: dos tx pueden tener el mismo gap y luego ambas intentar insertar → deadlock clásico (ver [08-Deadlocks.md](08-Deadlocks.md)).

### Postgres: SSI con predicate locks
- En `SERIALIZABLE`, Postgres registra *SIRead locks* sobre lo que leíste (tuplas, páginas o relaciones enteras según granularidad). No bloquean; sirven para detectar que otra tx escribió algo que habría cambiado tu lectura, y abortan una de las dos.
- Con índices adecuados los predicate locks son de página/tupla; sin índice (seq scan) se registra la relación completa y aumentan los falsos positivos (más 40001).

## Soluciones

### 1. Constraint (lo mejor cuando existe)
```sql
-- Unicidad simple
ALTER TABLE usuarios ADD CONSTRAINT usuarios_username_uq UNIQUE (username);

-- "Un solo pedido activo por cliente": índice único parcial
CREATE UNIQUE INDEX pedido_activo_uq ON pedidos (cliente_id) WHERE estado = 'activo';

-- Sin solapamientos de rangos (Postgres)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE reservas
  ADD CONSTRAINT reservas_sin_solape
  EXCLUDE USING gist (sala_id WITH =, periodo WITH &&);
```
- El `EXCLUDE` resuelve el ejemplo de las salas sin locks explícitos ni Serializable: la segunda tx falla con `23P01` (exclusion_violation) o espera a la primera si aún no confirmó.

### 2. Materializar el conflicto
Si no hay constraint posible (ej. "máximo 5 tickets por usuario"), convierte el predicado en una **fila concreta** que se pueda bloquear:
```sql
BEGIN;
-- Fila "padre" que representa el recurso
SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE;       -- serializa por usuario
SELECT count(*) FROM tickets WHERE usuario_id = $1;    -- ya no hay fantasmas concurrentes
INSERT INTO tickets (usuario_id, ...) VALUES ($1, ...); -- si count < 5
COMMIT;
```
- Alternativas: `pg_advisory_xact_lock(usuario_id)`, o una tabla de cupos con un contador que se decrementa atómicamente (`UPDATE cupos SET disponibles = disponibles - 1 WHERE evento_id = $1 AND disponibles > 0`).

### 3. Serializable + reintentos
```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) FROM tickets WHERE usuario_id = $1;
INSERT INTO tickets (usuario_id) VALUES ($1);
COMMIT;  -- puede fallar con 40001 -> reintentar la tx completa
```
- La solución más general: no necesitas identificar cada invariante. El costo son abortos y la obligación de reintentar.

## Preguntas de entrevista
1. **¿Qué es un phantom read?** Una consulta con predicado devuelve un conjunto distinto al repetirse porque otra tx insertó o borró filas que cumplen el predicado.
2. **¿Por qué `FOR UPDATE` no evita phantoms?** Bloquea filas existentes; una fila que aún no existe no se puede bloquear (salvo con gap locks en InnoDB).
3. **¿Postgres Repeatable Read tiene phantoms?** En lecturas no (snapshot), pero sí permite write skew basado en ellos; Serializable lo evita.
4. **¿Qué son los next-key locks?** Locks de InnoDB que cubren la entrada del índice y el hueco anterior para impedir inserts en el rango leído.
5. **¿Cómo evitas reservas solapadas en Postgres?** `EXCLUDE USING gist (sala_id WITH =, periodo WITH &&)`.

## Errores comunes
- `SELECT` para verificar que "no existe" y luego `INSERT` sin constraint.
- Creer que Repeatable Read de Postgres protege invariantes sobre conjuntos.
- `SELECT ... FOR UPDATE` en MySQL sin índice sobre el predicado (bloquea la tabla entera).
- Olvidar `btree_gist` al combinar igualdad y rangos en un `EXCLUDE`.
