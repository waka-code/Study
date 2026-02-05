# Replicación en Amazon S3

## ¿Qué es la Replicación en S3?

La replicación en Amazon S3 es una característica que permite copiar automáticamente objetos de un bucket de S3 a otro bucket. Esta replicación puede ocurrir dentro de la misma región de AWS (Replicación en la Misma Región - SRR) o entre diferentes regiones (Replicación entre Regiones - CRR).

## Tipos de Replicación

### 1. Replicación entre Regiones (CRR - Cross-Region Replication)
- Copia objetos entre buckets en diferentes regiones de AWS
- Útil para recuperación de desastres, cumplimiento de requisitos de residencia de datos y reducción de latencia

### 2. Replicación en la Misma Región (SRR - Same-Region Replication)
- Copia objetos entre buckets dentro de la misma región de AWS
- Útil para agregación de logs, replicación entre cuentas de desarrollo y producción, y cumplimiento de soberanía de datos

## Casos de Uso

- **Recuperación de Desastres**: Mantener copias de datos en múltiples regiones para alta disponibilidad
- **Cumplimiento y Soberanía de Datos**: Almacenar datos en regiones específicas por requisitos legales
- **Reducción de Latencia**: Servir datos desde la región más cercana al usuario
- **Agregación de Logs**: Consolidar logs de múltiples buckets en un solo lugar
- **Replicación entre Entornos**: Copiar datos entre entornos de desarrollo, staging y producción

## Requisitos Previos

- El bucket de origen debe tener el versionado activado
- Los buckets de origen y destino deben estar en la misma cuenta AWS (para replicación básica) o en cuentas diferentes (requiere configuración adicional)
- Permisos IAM apropiados para S3 para replicar objetos
- Para CRR, las regiones de origen y destino deben ser diferentes

## Configuración

La replicación se configura a través de la consola de AWS S3, AWS CLI o SDKs:

1. Activar versionado en el bucket de origen
2. Crear una regla de replicación especificando:
   - Bucket de destino
   - Prefijo o etiquetas para filtrar objetos
   - Clase de almacenamiento para objetos replicados
   - Configuración de encriptación
   - Permisos de replicación

## Comportamiento de la Replicación

- Solo los nuevos objetos se replican automáticamente
- Los objetos existentes deben replicarse manualmente o usando operaciones por lotes
- Las réplicas son copias exactas de los objetos originales, incluyendo metadatos y etiquetas
- Los cambios en el objeto original (como actualizaciones) generan nuevas versiones que se replican
- Las eliminaciones no se replican por defecto (se puede configurar)

## Costos

- Costos de almacenamiento por las copias replicadas
- Costos de transferencia de datos entre regiones (para CRR)
- Costos por solicitudes de replicación

## Limitaciones

- No replica objetos existentes automáticamente
- No replica cambios en ACLs de objetos
- No replica objetos en buckets con Object Lock
- La replicación puede tener latencia (normalmente minutos, pero puede ser horas en casos extremos)
- No soporta replicación bidireccional nativamente

## Mejores Prácticas

- Usar reglas de replicación específicas con filtros para controlar qué se replica
- Monitorear el estado de replicación usando métricas de CloudWatch
- Configurar notificaciones de eventos de S3 para fallos de replicación
- Usar replicación por lotes para objetos existentes
- Considerar costos antes de habilitar replicación masiva