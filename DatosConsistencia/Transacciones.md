# Transacciones y niveles de aislamiento

## ACID
- Conjunto de propiedades que garantizan que una transacción sea confiable.
- **Atomicidad**: la transacción se ejecuta completa o no se ejecuta nada (todo o nada).
- **Consistencia**: la base de datos pasa de un estado válido a otro válido, respetando reglas y constraints.
- **Aislamiento (Isolation)**: las transacciones concurrentes no se interfieren entre sí; el resultado es como si se hubieran ejecutado en serie.
- **Durabilidad**: una vez confirmada (commit), la transacción sobrevive incluso a caídas del sistema.

### Ejemplo ACID (transferencia bancaria)
```sql
BEGIN;
  UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1; -- resto de origen
  UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2; -- sumo a destino
COMMIT; -- si algo falla antes del COMMIT, ROLLBACK deja todo como estaba
```

## Niveles de aislamiento
- Definen cuánto se "aíslan" las transacciones concurrentes. A mayor aislamiento, más consistencia pero menos rendimiento.
- **Read Uncommitted**: puede leer datos no confirmados de otras transacciones (dirty read). Casi nunca se usa.
- **Read Committed**: solo lee datos ya confirmados. Nivel por defecto en Postgres.
- **Repeatable Read**: si lees una fila dos veces en la misma transacción, obtienes el mismo valor. Nivel por defecto en MySQL (InnoDB).
- **Serializable**: el más estricto; simula ejecución totalmente en serie. Máxima consistencia, mayor costo.

## Anomalías que evita cada nivel
- **Dirty read**: leer un dato que otra transacción aún no confirmó (y que podría revertirse).
- **Non-repeatable read**: leer la misma fila dos veces y obtener valores distintos porque otra transacción la modificó.
- **Phantom read**: repetir una consulta y encontrar filas nuevas que otra transacción insertó.

| Nivel | Dirty read | Non-repeatable | Phantom |
|---|---|---|---|
| Read Uncommitted | ✅ posible | ✅ posible | ✅ posible |
| Read Committed | ❌ evitado | ✅ posible | ✅ posible |
| Repeatable Read | ❌ evitado | ❌ evitado | ✅ posible* |
| Serializable | ❌ evitado | ❌ evitado | ❌ evitado |

\* En MySQL (InnoDB) los phantom reads también se evitan en Repeatable Read gracias a los next-key locks.

### Ejemplo niveles de aislamiento
```sql
-- Fijar el nivel de aislamiento de la transacción actual
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

BEGIN;
  SELECT saldo FROM cuentas WHERE id = 1;
  -- otra transacción NO podrá modificar esta fila hasta que termine
  UPDATE cuentas SET saldo = saldo - 50 WHERE id = 1;
COMMIT;
```

## Locks y deadlocks
- Un **lock** (bloqueo) impide que dos transacciones modifiquen el mismo dato a la vez.
- Un **deadlock** ocurre cuando dos transacciones se bloquean mutuamente esperando un recurso que la otra tiene.
- La base de datos detecta el deadlock y aborta una de las transacciones (la "víctima"); tu app debe reintentar.
- Para evitarlos: acceder a los recursos siempre en el mismo orden y mantener las transacciones cortas.

### Ejemplo deadlock
```sql
-- Transacción A            -- Transacción B
BEGIN;                      BEGIN;
UPDATE fila WHERE id=1;     UPDATE fila WHERE id=2;
UPDATE fila WHERE id=2;  -- espera a B
                            UPDATE fila WHERE id=1; -- espera a A -> DEADLOCK
```

## MVCC (Multi-Version Concurrency Control)
- Mecanismo que usan Postgres y MySQL para que las lecturas no bloqueen a las escrituras (ni viceversa).
- En lugar de bloquear, la base de datos mantiene **múltiples versiones** de cada fila.
- Cada transacción ve una "foto" (snapshot) consistente de los datos según cuándo empezó.
- Ventaja: alta concurrencia sin que los lectores esperen a los escritores.
