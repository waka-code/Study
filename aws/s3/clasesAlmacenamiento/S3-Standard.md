# S3 Standard

## Descripción General

S3 Standard es la clase de almacenamiento predeterminada de Amazon S3, diseñada para datos accedidos con frecuencia. Es la opción más flexible y de alto rendimiento, ideal para casos donde la disponibilidad y el rendimiento son prioritarios.

## Características Técnicas

| Característica | Valor |
|---|---|
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Disponibilidad** | 99.99% |
| **SLA de Disponibilidad** | 99.9% |
| **Zonas de Disponibilidad** | ≥ 3 |
| **Latencia** | Milisegundos |
| **Throughput** | Alto |
| **Tamaño Mínimo** | Sin límite |
| **Período Mínimo** | Sin período mínimo |
| **Encriptación** | Soportada |
| **Versionado** | Soportado |
| **Replicación** | CRR y SRR soportadas |

## Ventajas

### Rendimiento
- **Acceso instantáneo**: Latencia de milisegundos
- **Alto throughput**: Ideal para aplicaciones de alto rendimiento
- **Escalabilidad**: Soporta miles de solicitudes por segundo

### Flexibilidad
- **Sin restricciones**: No hay tamaño mínimo de objeto
- **Acceso ilimitado**: Sin período mínimo de almacenamiento
- **Modificación**: Cambiar objeto sin restricciones

### Disponibilidad
- **Alta disponibilidad**: 99.99% SLA
- **Redundancia geográfica**: Datos distribuidos en múltiples zonas
- **Recuperación ante desastres**: Automática

### Características
- **Versionado**: Control total de versiones
- **Ciclo de vida**: Integración con políticas de transición
- **Replicación**: Cross-region y same-region
- **Notificaciones**: Eventos en tiempo real
- **Metadatos**: Etiquetas y metadatos personalizados

## Desventajas

### Costo
- **Almacenamiento más caro**: Precio más alto por GB
- **Solicitudes**: Precio por cada operación
- **No rentable para datos poco accedidos**: Penalización económica
- **Egreso de datos**: Costos de transferencia completos

### Capacidades Limitadas
- **Sin funciones avanzadas**: Comparado con clases especializadas
- **Sin optimización automática**: Requiere gestión manual
- **Sin recuperación escalonada**: No hay opciones de velocidad de recuperación

## Casos de Uso Ideales

### Aplicaciones Web
- Sitios web dinámicos
- APIs REST
- Aplicaciones SaaS

### Distribución de Contenido
- Contenido multimedia
- Descargas de software
- Streaming de media

### Big Data Analytics
- Procesamiento de datos en tiempo real
- Data lakes
- Machine learning training

### Aplicaciones Móviles
- Sincronización de datos
- Almacenamiento de usuario
- Caché distribuido

### Base de Datos
- Backups activos frecuentemente accedidos
- Datos de trabajo de bases de datos

### DevOps
- Artefactos de build
- Logs activos
- Configuraciones

## Casos de Uso NO Ideales

- ❌ Datos accedidos menos de 1 vez al mes
- ❌ Archivos para cumplimiento/retención a largo plazo
- ❌ Datos secundarios fáciles de recrear
- ❌ Backups inactivos
- ❌ Datos con presupuesto muy ajustado

## Consideraciones de Costo

### Desglose de Costos (aproximado, USA East)

| Concepto | Costo |
|---|---|
| Almacenamiento (primeros 50 TB/mes) | $0.023 por GB |
| Almacenamiento (50-500 TB/mes) | $0.022 por GB |
| Almacenamiento (>500 TB/mes) | $0.021 por GB |
| Solicitud PUT/POST/PATCH | $0.005 por 1,000 |
| Solicitud GET/HEAD | $0.0004 por 10,000 |
| Transferencia de datos (egreso) | $0.09 por GB |

### Ejemplo de Costo Mensual
- 100 GB almacenados: 100 × $0.023 = **$2.30**
- 10,000 solicitudes GET: 10 × $0.0004 = **$0.004**
- 1,000 solicitudes PUT: 1 × $0.005 = **$0.005**
- **Total mensual**: ~$2.31

## Optimización de Costos

### Estrategias

1. **Ciclo de Vida**: Mover a clases más baratas después de 30 días sin acceso
2. **Compresión**: Reducir tamaño de objetos
3. **Consolidación**: Agrupar objetos pequeños
4. **CloudFront**: Caché de contenido frecuente
5. **S3 Intelligent-Tiering**: Para patrones impredecibles

### Ejemplo de Migración

```
Día 0-30:     S3 Standard        (acceso frecuente)
Día 30-90:    S3 Standard-IA     (acceso ocasional)
Día 90+:      S3 Glacier Flexible (archivar)
```

Ahorro potencial: 60-80% reducción de costo

## Comparativa con Otras Clases

| Aspecto | Standard | Standard-IA | Glacier | Deep Archive |
|---|---|---|---|---|
| Latencia | ⚡⚡⚡ | ⚡⚡⚡ | ⚡ | ❌ |
| Disponibilidad | 99.99% | 99.9% | 99.99% | 99.99% |
| Costo Almacenamiento | $$$ | $$ | $ | $ |
| Costo Acceso | $ | $$$ | $$$$ | $$$$$ |
| Período Mínimo | - | 30d | 90d | 180d |
| Ideal Para | Frecuente | Ocasional | Archivo | Cumplimiento |

## Mejores Prácticas

### Seguridad
- Habilitar versionado para protección contra eliminación accidental
- Configurar bucket policies restrictivas
- Usar IAM roles para acceso
- Habilitar MFA Delete para buckets críticos

### Rendimiento
- Usar presigned URLs para acceso temporal
- Implementar CloudFront para caché
- Usar multipart upload para objetos grandes (>100 MB)
- Distribución de prefijos para paralelismo

### Cumplimiento
- Configurar Object Lock para WORM (Write Once, Read Many)
- Habilitar logging de acceso
- Usar S3 Analytics para auditoría
- Configurar notificaciones de eventos

### Gestión
- Definir políticas de ciclo de vida
- Usar etiquetas para organización
- Implementar monitoreo de costos
- Revisar acceso regularmente

## Conclusión

S3 Standard es la opción predeterminada cuando el rendimiento y la disponibilidad son críticos. Es ideal para datos que se acceden frecuentemente. Para datos con acceso ocasional o archivicar, considerar clases más económicas.