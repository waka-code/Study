# 6️⃣ Transacciones y concurrencia (CRÍTICO)

Aquí se caen muchos.

## Debes dominar

### ACID
- **Descripción**: ACID es un conjunto de propiedades que garantizan la confiabilidad de las transacciones en bases de datos.
  1. **Atomicidad**: Una transacción es todo o nada. Si una parte falla, toda la transacción se revierte.
  2. **Consistencia**: Una transacción lleva la base de datos de un estado válido a otro estado válido.
  3. **Aislamiento**: Las transacciones concurrentes no interfieren entre sí.
  4. **Durabilidad**: Una vez que una transacción se confirma, sus cambios son permanentes.

### `BEGIN / COMMIT / ROLLBACK`
- **Descripción**: Comandos básicos para manejar transacciones en PostgreSQL.
- **Ejemplo**:
  ```sql
  BEGIN;
  UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
  UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;
  COMMIT;

  -- Si ocurre un error
  BEGIN;
  UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
  -- Error aquí
  ROLLBACK;
  ```

### Niveles de aislamiento
- **READ COMMITTED**:
  - **Descripción**: Cada consulta ve solo los datos confirmados en el momento en que se ejecuta.
  - **Ventajas**: Evita lecturas sucias.
  - **Desventajas**: No evita lecturas no repetibles ni lecturas fantasma.

- **REPEATABLE READ**:
  - **Descripción**: Todas las consultas dentro de una transacción ven el mismo estado de los datos.
  - **Ventajas**: Evita lecturas sucias y lecturas no repetibles.
  - **Desventajas**: No evita lecturas fantasma.

- **SERIALIZABLE**:
  - **Descripción**: Garantiza que las transacciones se ejecuten como si fueran secuenciales.
  - **Ventajas**: Evita lecturas sucias, no repetibles y fantasma.
  - **Desventajas**: Puede causar más conflictos y bloqueos.

### Locks
- **Row-level locks**:
  - **Descripción**: Bloquean filas específicas en una tabla.
  - **Ventajas**: Permiten mayor concurrencia.
  - **Ejemplo**:
    ```sql
    BEGIN;
    SELECT * FROM cuentas WHERE id = 1 FOR UPDATE;
    UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
    COMMIT;
    ```

- **Table-level locks**:
  - **Descripción**: Bloquean toda la tabla.
  - **Ventajas**: Útil para operaciones que afectan a toda la tabla.
  - **Ejemplo**:
    ```sql
    LOCK TABLE cuentas IN EXCLUSIVE MODE;
    ```

### Deadlocks
- **Descripción**: Ocurren cuando dos o más transacciones esperan mutuamente por recursos bloqueados.
- **Prevención**:
  - Ordenar las operaciones de manera consistente.
  - Usar tiempos de espera para detectar y resolver deadlocks.
- **Ejemplo**:
  ```sql
  -- Transacción 1
  BEGIN;
  UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
  -- Espera por un lock en id = 2

  -- Transacción 2
  BEGIN;
  UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;
  -- Espera por un lock en id = 1
  ```

---

> **¿Por qué PostgreSQL no usa locks agresivos?**

PostgreSQL utiliza **MVCC (Control de concurrencia multiversión)**, lo que permite que múltiples transacciones lean y escriban en la base de datos sin bloquearse entre sí. Esto mejora el rendimiento y reduce los conflictos de concurrencia.
