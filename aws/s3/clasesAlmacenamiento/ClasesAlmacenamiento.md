# Clases de Almacenamiento en Amazon S3

## Introducción

Amazon S3 ofrece diferentes clases de almacenamiento optimizadas para diferentes patrones de acceso a datos, frecuencia de uso y requisitos de durabilidad. Cada clase tiene características específicas en términos de costo, rendimiento y disponibilidad.

## Clases de Almacenamiento Disponibles

### 1. S3 Standard
- **Descripción**: Clase de almacenamiento general purpose para datos accedidos con frecuencia
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.99%
- **Tiempo de recuperación**: Milisegundos
- **Casos de uso**: Sitios web, distribución de contenido, big data analytics, aplicaciones móviles
- **Costo**: Más alto por GB almacenado, pero bajo costo de acceso

### 2. S3 Intelligent-Tiering
- **Descripción**: Optimización automática de costos moviendo datos entre niveles de acceso según patrones de uso
- **Niveles**:
  - Frequent Access (acceso frecuente)
  - Infrequent Access (acceso infrecuente)
  - Archive Instant Access (acceso instantáneo a archivo)
  - Archive Access (acceso a archivo) - opcional
  - Deep Archive Access (acceso a archivo profundo) - opcional
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.9%
- **Tiempo de recuperación**: Milisegundos a horas
- **Casos de uso**: Datos con patrones de acceso desconocidos o cambiantes
- **Costo**: Pequeña tarifa mensual por monitoreo y automatización

### 3. S3 Standard-IA (Infrequent Access)
- **Descripción**: Para datos de larga duración accedidos menos frecuentemente
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.9%
- **Tiempo de recuperación**: Milisegundos
- **Requisitos**: Objetos ≥ 128 KB, período mínimo de almacenamiento de 30 días
- **Casos de uso**: Backups, archivos antiguos, datos para recuperación de desastres
- **Costo**: Menor costo de almacenamiento, mayor costo de acceso

### 4. S3 One Zone-IA
- **Descripción**: Similar a Standard-IA pero almacenado en una sola zona de disponibilidad
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.5%
- **Tiempo de recuperación**: Milisegundos
- **Requisitos**: Objetos ≥ 128 KB, período mínimo de almacenamiento de 30 días
- **Casos de uso**: Datos secundarios, fácil recreación, almacenamiento temporal
- **Costo**: 20% más barato que Standard-IA

### 5. S3 Glacier Instant Retrieval
- **Descripción**: Para archivos de larga duración con acceso instantáneo
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.9%
- **Tiempo de recuperación**: 1-5 minutos
- **Requisitos**: Objetos ≥ 128 KB, período mínimo de almacenamiento de 90 días
- **Casos de uso**: Archivos médicos, datos de investigación, backups que necesitan acceso rápido
- **Costo**: Muy bajo costo de almacenamiento

### 6. S3 Glacier Flexible Retrieval (anteriormente Glacier)
- **Descripción**: Para archivos de larga duración con acceso flexible
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.99%
- **Tiempo de recuperación**: 1 minuto a 12 horas
- **Opciones de recuperación**:
  - Expedited (1-5 minutos) - más caro
  - Standard (3-5 horas)
  - Bulk (5-12 horas) - más barato
- **Requisitos**: Objetos ≥ 40 KB, período mínimo de almacenamiento de 90 días
- **Casos de uso**: Backups de compliance, archivos legales, datos históricos
- **Costo**: Muy bajo costo de almacenamiento

### 7. S3 Glacier Deep Archive
- **Descripción**: Clase más económica para retención a largo plazo
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.99%
- **Tiempo de recuperación**: 12 horas
- **Opciones de recuperación**:
  - Standard (12 horas)
  - Bulk (hasta 48 horas)
- **Requisitos**: Objetos ≥ 40 KB, período mínimo de almacenamiento de 180 días
- **Casos de uso**: Retención de datos regulatorios, backups históricos
- **Costo**: El más bajo de todas las clases

### 8. S3 Outposts
- **Descripción**: Almacenamiento de objetos en las instalaciones del cliente
- **Durabilidad**: 99.999999999% (11 nueves)
- **Disponibilidad**: 99.95%
- **Tiempo de recuperación**: Milisegundos
- **Casos de uso**: Datos que deben permanecer en las instalaciones por requisitos de latencia o residencia
- **Costo**: Similar a S3 Standard más costos de hardware

## Comparación de Clases de Almacenamiento

| Clase | Durabilidad | Disponibilidad | Tiempo de Recuperación | Costo Almacenamiento | Costo Acceso |
|-------|-------------|----------------|----------------------|---------------------|--------------|
| Standard | 11 nueves | 99.99% | ms | $$$ | $ |
| Intelligent-Tiering | 11 nueves | 99.9% | ms-horas | $$ | $$ |
| Standard-IA | 11 nueves | 99.9% | ms | $$ | $$$ |
| One Zone-IA | 11 nueves | 99.5% | ms | $ | $$$ |
| Glacier Instant | 11 nueves | 99.9% | 1-5 min | $ | $$$$ |
| Glacier Flexible | 11 nueves | 99.99% | 1 min-12 hrs | $ | $$$$ |
| Glacier Deep Archive | 11 nueves | 99.99% | 12 hrs | $ | $$$$$ |
| Outposts | 11 nueves | 99.95% | ms | $$$ | $ |

## Transición entre Clases

- **Lifecycle Policies**: Configurar políticas automáticas para mover objetos entre clases
- **S3 Intelligent-Tiering**: Movimiento automático basado en patrones de acceso
- **Operaciones manuales**: Cambiar clase de almacenamiento de objetos individuales
- **Batch Operations**: Para cambios masivos en objetos existentes

## Consideraciones de Costo

- **Almacenamiento**: Costo por GB por mes
- **Solicitudes**: Costo por cada operación (GET, PUT, etc.)
- **Transferencia de datos**: Costo por GB transferido
- **Recuperación**: Costos adicionales para clases de archivo
- **Eliminación temprana**: Penalizaciones por eliminar objetos antes del período mínimo

## Mejores Prácticas

- Analizar patrones de acceso antes de elegir clase
- Usar Intelligent-Tiering para datos con patrones impredecibles
- Configurar Lifecycle policies para optimización automática
- Considerar latencia y frecuencia de acceso requerida
- Monitorear costos usando AWS Cost Explorer
- Usar Storage Lens para análisis de uso de almacenamiento