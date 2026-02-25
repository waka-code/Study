# Amazon DynamoDB

Amazon DynamoDB es un servicio de base de datos NoSQL completamente administrado que proporciona almacenamiento rápido y predecible con escalabilidad automática. Está diseñado para aplicaciones que requieren baja latencia y alta disponibilidad.

## Características principales

- **Modelo de datos flexible:**
  - Soporta esquemas dinámicos con tablas basadas en clave-valor y documentos.
- **Escalabilidad automática:**
  - Ajusta la capacidad de lectura y escritura según la carga.
- **Alta disponibilidad:**
  - Réplicas en múltiples zonas de disponibilidad (Multi-AZ).
- **Baja latencia:**
  - Respuesta en milisegundos para aplicaciones en tiempo real.
- **Integración con otros servicios de AWS:**
  - AWS Lambda, Amazon S3, Amazon Kinesis, entre otros.

## Casos de uso

- **Aplicaciones web y móviles:**
  - Almacenar perfiles de usuario, sesiones y configuraciones.
- **IoT (Internet of Things):**
  - Gestionar datos de dispositivos conectados.
- **Gaming:**
  - Almacenar puntuaciones, estados de juego y datos en tiempo real.
- **E-commerce:**
  - Gestionar catálogos de productos, carritos de compra y pedidos.

## Beneficios

- **Rendimiento escalable:**
  - Maneja millones de solicitudes por segundo.
- **Gestión simplificada:**
  - AWS se encarga de la infraestructura, el mantenimiento y las actualizaciones.
- **Alta disponibilidad:**
  - Réplicas automáticas para garantizar la continuidad del servicio.
- **Seguridad:**
  - Integración con IAM, cifrado en reposo y en tránsito.

## Ejemplo de configuración

### Crear una tabla con AWS CLI
```bash
aws dynamodb create-table \
    --table-name MiTabla \
    --attribute-definitions AttributeName=Id,AttributeType=S \
    --key-schema AttributeName=Id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

## Buenas prácticas

1. **Diseño de tablas:**
   - Usa claves de partición y de clasificación para optimizar el acceso.
2. **Índices secundarios:**
   - Configura índices globales y locales para consultas eficientes.
3. **Monitoreo:**
   - Usa Amazon CloudWatch para supervisar métricas como consumo de capacidad y latencia.
4. **Control de costos:**
   - Usa el modo de capacidad bajo demanda para cargas impredecibles.
5. **Seguridad:**
   - Configura políticas de IAM para controlar el acceso.

## Limitaciones

- **Tamaño de elementos:**
  - Máximo 400 KB por elemento.
- **Operaciones transaccionales:**
  - Limitadas a 25 elementos por transacción.
- **Costo:**
  - Puede ser costoso para cargas de trabajo con alta capacidad provisionada.

## Recursos adicionales

- [Documentación oficial de Amazon DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [Guía de diseño de tablas](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Ejemplos de uso con AWS SDK](https://aws.amazon.com/sdk/)