# Bloqueo Optimista vs Bloqueo Pesimista

El concepto de **bloqueo optimista** y **bloqueo pesimista** se refiere a estrategias utilizadas para manejar la concurrencia en sistemas donde múltiples usuarios o procesos pueden acceder y modificar los mismos datos al mismo tiempo. Estas estrategias son comunes en bases de datos y sistemas distribuidos para evitar conflictos y garantizar la consistencia de los datos.

## **Bloqueo Optimista**
- **Definición**: En el bloqueo optimista, se asume que los conflictos entre transacciones son poco probables. Por lo tanto, no se bloquean los recursos de forma preventiva. En su lugar, se permite que múltiples transacciones accedan y modifiquen los datos de manera concurrente.
- **Funcionamiento**:
  1. Una transacción lee los datos y realiza los cambios localmente.
  2. Antes de guardar los cambios, se verifica si los datos originales han sido modificados por otra transacción.
  3. Si no ha habido cambios, la transacción se confirma. Si ha habido cambios, la transacción falla y debe reintentarse.
- **Ventajas**:
  - Mejor rendimiento en sistemas con baja probabilidad de conflictos.
  - No se bloquean recursos, lo que permite mayor concurrencia.
- **Desventajas**:
  - Si hay muchos conflictos, puede haber un alto costo debido a los reintentos.
- **Ejemplo**: Un sistema de comercio electrónico donde los usuarios pueden actualizar sus carritos de compra. Dado que las probabilidades de que dos usuarios editen el mismo carrito al mismo tiempo son bajas, se utiliza un enfoque optimista.

---

## **Bloqueo Pesimista**
- **Definición**: En el bloqueo pesimista, se asume que los conflictos entre transacciones son probables. Por lo tanto, se bloquean los recursos de forma preventiva para evitar que otras transacciones los modifiquen mientras una transacción está en curso.
- **Funcionamiento**:
  1. Una transacción bloquea los datos que necesita modificar.
  2. Mientras los datos están bloqueados, otras transacciones no pueden acceder o modificarlos.
  3. Una vez que la transacción termina, se libera el bloqueo.
- **Ventajas**:
  - Garantiza la consistencia de los datos al evitar conflictos.
  - Útil en sistemas con alta concurrencia y alta probabilidad de conflictos.
- **Desventajas**:
  - Puede generar cuellos de botella y reducir el rendimiento debido a los bloqueos.
  - Riesgo de **deadlocks** (interbloqueos) si no se gestionan adecuadamente.
- **Ejemplo**: Un sistema bancario donde dos usuarios intentan modificar el saldo de la misma cuenta. Para evitar inconsistencias, se bloquea el acceso a la cuenta hasta que la transacción actual finalice.

---

## **Diferencias clave entre bloqueo optimista y pesimista**:

| Característica         | Bloqueo Optimista                          | Bloqueo Pesimista                          |
|------------------------|--------------------------------------------|--------------------------------------------|
| **Suposición**         | Los conflictos son poco probables.         | Los conflictos son probables.              |
| **Bloqueo de recursos**| No se bloquean recursos.                   | Los recursos se bloquean preventivamente.  |
| **Rendimiento**        | Mejor en sistemas con baja concurrencia.   | Mejor en sistemas con alta concurrencia.   |
| **Conflictos**         | Se detectan al final de la transacción.    | Se previenen desde el inicio.              |
| **Riesgos**            | Reintentos en caso de conflicto.           | Deadlocks y menor concurrencia.            |

Ambas estrategias tienen sus casos de uso dependiendo del contexto y la naturaleza del sistema.