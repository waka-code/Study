# 1️⃣3️⃣ Escalabilidad en PostgreSQL

No necesitas ser DBA, pero **SÍ entender cómo escalar bases de datos** a nivel senior.

---

## Índice

1. [Read Replicas (Replicación)](#read-replicas-replicación)
2. [Write vs Read Scaling](#write-vs-read-scaling)
3. [Connection Pooling (PgBouncer)](#connection-pooling-pgbouncer)
4. [Sharding (Particionamiento Horizontal)](#sharding-particionamiento-horizontal)
5. [Particionamiento (Table Partitioning)](#particionamiento-table-partitioning)
6. [Normalization vs Denormalization](#normalization-vs-denormalization)
7. [Elegir el Motor de Base de Datos](#elegir-el-motor-de-base-de-datos)
8. [Caching Strategies](#caching-strategies)

---

## Read Replicas (Replicación)

### Ventajas
1. **Escalabilidad de lecturas**: Permite distribuir la carga de trabajo de lectura entre múltiples réplicas, reduciendo la carga en el servidor principal.
2. **Alta disponibilidad**: En caso de que el servidor principal falle, una réplica puede ser promovida a principal, minimizando el tiempo de inactividad.
3. **Respaldo en tiempo real**: Las réplicas pueden actuar como una copia de seguridad en tiempo real, lo que permite recuperar datos en caso de fallos catastróficos.

### Desventajas
1. **Latencia de replicación**: Existe un retraso entre el momento en que los datos se escriben en el servidor principal y cuando están disponibles en las réplicas.
2. **Complejidad operativa**: Configurar y mantener réplicas puede ser complicado, especialmente en sistemas grandes.
3. **No soporta escrituras**: Las réplicas son solo de lectura, por lo que no pueden manejar operaciones de escritura.

### ¿Por qué usar Read Replicas?
- Son ideales para aplicaciones con una alta carga de lectura, como sistemas de análisis o aplicaciones con muchos usuarios que realizan consultas frecuentes.
- Mejoran la disponibilidad y la tolerancia a fallos, lo que es crucial para sistemas críticos.
- Permiten escalar horizontalmente sin necesidad de cambiar la arquitectura de la base de datos principal.

---

## Write vs Read Scaling

### Ventajas
1. **Write Scaling**:
   - Permite manejar un mayor volumen de transacciones de escritura.
   - Es útil para aplicaciones con alta concurrencia de usuarios que realizan operaciones de escritura.
2. **Read Scaling**:
   - Mejora el rendimiento de las consultas al distribuirlas entre múltiples réplicas.
   - Reduce la carga en el servidor principal, permitiendo que se enfoque en las escrituras.

### Desventajas
1. **Write Scaling**:
   - Requiere particionar los datos (sharding), lo que puede ser complejo de implementar y mantener.
   - Puede ser difícil garantizar la consistencia entre particiones.
2. **Read Scaling**:
   - No resuelve problemas de escalabilidad relacionados con escrituras.
   - Puede haber inconsistencias temporales debido a la latencia de replicación.

### ¿Por qué usar Write vs Read Scaling?
- **Write Scaling** es esencial para aplicaciones que generan grandes volúmenes de datos, como sistemas de registro de eventos o aplicaciones de comercio electrónico con muchas transacciones.
- **Read Scaling** es más adecuado para aplicaciones con una alta proporción de lecturas frente a escrituras, como dashboards o sistemas de consulta de datos.

---

## Connection Pooling (PgBouncer)

### Ventajas
1. **Reducción de la sobrecarga**: Reduce el costo de establecer y cerrar conexiones repetidamente.
2. **Mejor uso de recursos**: Permite manejar más conexiones simultáneas con menos recursos.
3. **Configuración flexible**: Soporta múltiples modos de conexión, como `session`, `transaction` y `statement`.

### Desventajas
1. **Configuración inicial**: Requiere configuración adicional y monitoreo continuo.
2. **Limitaciones en transacciones largas**: En el modo `transaction`, las transacciones largas pueden causar problemas.

### ¿Por qué usar Connection Pooling?
- Es esencial para aplicaciones con un alto número de conexiones concurrentes, ya que reduce la carga en el servidor de base de datos.
- Mejora el rendimiento general al reutilizar conexiones existentes en lugar de crear nuevas para cada solicitud.

---

## Sharding (Particionamiento Horizontal)

### Ventajas
1. **Escalabilidad horizontal**: Permite distribuir datos entre múltiples nodos, reduciendo la carga en cada uno.
2. **Aislamiento de fallos**: Si un nodo falla, solo afecta a una parte de los datos.
3. **Rendimiento mejorado**: Las consultas se ejecutan más rápido al trabajar con subconjuntos más pequeños de datos.

### Desventajas
1. **Complejidad**: Requiere cambios significativos en la aplicación para manejar múltiples nodos.
2. **Requiere balanceo de carga**: Es necesario implementar un sistema para distribuir las solicitudes entre los nodos.
3. **Dificultad en consultas complejas**: Las consultas que abarcan múltiples nodos pueden ser lentas y complicadas.

### ¿Por qué usar Sharding?
- Es ideal para aplicaciones con grandes volúmenes de datos que no pueden ser manejados por un solo servidor.
- Permite escalar horizontalmente sin límites teóricos, lo que es crucial para sistemas en crecimiento exponencial.

---

## Particionamiento (Table Partitioning)

### Ventajas
1. **Rendimiento**: Mejora el rendimiento de las consultas al dividir grandes tablas en partes más pequeñas.
2. **Mantenimiento**: Facilita el mantenimiento de datos, como la eliminación de datos antiguos.
3. **Optimización de índices**: Los índices se aplican a particiones individuales, lo que reduce su tamaño y mejora la velocidad.

### Desventajas
1. **Complejidad**: Requiere planificación y configuración cuidadosa.
2. **Limitaciones en consultas**: Algunas consultas pueden no beneficiarse del particionamiento y ser más lentas.

### ¿Por qué usar Particionamiento?
- Es útil para tablas muy grandes donde las consultas suelen trabajar con un subconjunto de datos.
- Facilita la gestión de datos históricos y mejora el rendimiento de las consultas.

---

## Normalization vs Denormalization

### Ventajas
1. **Normalización**:
   - Reduce la redundancia de datos.
   - Mejora la consistencia y evita anomalías de actualización.
2. **Desnormalización**:
   - Mejora el rendimiento de las consultas al reducir la necesidad de uniones.
   - Es ideal para sistemas de lectura intensiva.

### Desventajas
1. **Normalización**:
   - Puede hacer que las consultas sean más complejas y lentas debido a las uniones.
2. **Desnormalización**:
   - Aumenta la redundancia de datos, lo que puede llevar a inconsistencias.

### ¿Por qué elegir una u otra?
- **Normalización** es ideal para sistemas donde la consistencia de los datos es crítica, como sistemas financieros.
- **Desnormalización** es más adecuada para sistemas de análisis o aplicaciones con alta carga de lectura.

---

## Elegir el Motor de Base de Datos

### Ventajas
1. **PostgreSQL**:
   - Soporte para transacciones ACID.
   - Extensibilidad y soporte para JSON/JSONB.
2. **MySQL**:
   - Rendimiento rápido en lecturas simples.
   - Amplia comunidad y soporte.
3. **NoSQL (MongoDB, Cassandra)**:
   - Escalabilidad horizontal nativa.
   - Flexibilidad en el esquema.

### Desventajas
1. **PostgreSQL**:
   - Puede ser más lento en operaciones simples comparado con MySQL.
2. **MySQL**:
   - Menor soporte para transacciones complejas.
3. **NoSQL**:
   - Falta de soporte para transacciones ACID completas.

### ¿Por qué elegir un motor?
- **PostgreSQL**: Ideal para aplicaciones que requieren transacciones complejas y datos estructurados.
- **MySQL**: Adecuado para aplicaciones con consultas simples y alta velocidad.
- **NoSQL**: Perfecto para sistemas distribuidos y datos no estructurados.

---

## Caching Strategies

### Ventajas
1. **Memcached**:
   - Extremadamente rápido para datos en memoria.
   - Ideal para datos temporales.
2. **Redis**:
   - Soporte para estructuras de datos avanzadas.
   - Persistencia opcional.

### Desventajas
1. **Memcached**:
   - No tiene persistencia.
   - Limitado a datos clave-valor simples.
2. **Redis**:
   - Mayor consumo de memoria.
   - Puede ser más complejo de configurar.

### ¿Por qué usar Caching?
- Reduce la latencia de las aplicaciones al evitar consultas repetitivas a la base de datos.
- Mejora la experiencia del usuario al acelerar los tiempos de respuesta.
