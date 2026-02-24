# Redis Clustering & Replicación

## Introducción
Redis soporta clustering y replicación para mejorar la escalabilidad y la disponibilidad de los datos.

## Clustering
- **Descripción**: Divide los datos entre múltiples nodos para manejar grandes volúmenes de datos y aumentar el rendimiento.
- **Ventajas**:
  - Escalabilidad horizontal.
  - Alta disponibilidad.
- **Ejemplo**:
  ```bash
  redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
    127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 --cluster-replicas 1
  ```

## Replicación
- **Descripción**: Replica datos de un nodo maestro a uno o más nodos esclavos para alta disponibilidad.
- **Ventajas**:
  - Failover automático.
  - Lecturas distribuidas.
- **Ejemplo**:
  ```bash
  # Configurar un esclavo
  replicaof <master-ip> <master-port>
  ```

## Casos de Uso
- **Clustering**: Manejo de grandes volúmenes de datos.
- **Replicación**: Alta disponibilidad y balanceo de carga para lecturas.