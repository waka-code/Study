# S3 Glacier Flexible Retrieval

## Descripción General

S3 Glacier Flexible Retrieval (anteriormente S3 Glacier) es una clase de almacenamiento de archivo económica con opciones flexibles de recuperación. Ofrece el mejor balance entre costo de almacenamiento y flexibilidad de acceso, ideal para datos que se necesitan ocasionalmente con diferentes velocidades de recuperación.

## Características Técnicas

| Característica | Valor |
|---|---|
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Disponibilidad** | 99.99% |
| **Zonas de Disponibilidad** | ≥ 3 |
| **Latencia de Recuperación** | 1 minuto a 12 horas |
| **Opciones de Recuperación** | 3 (Expedited, Standard, Bulk) |
| **Tamaño Mínimo** | 40 KB |
| **Período Mínimo** | 90 días |
| **Encriptación** | Soportada |
| **Versionado** | Soportado |

## Opciones de Recuperación

### 1. Expedited (1-5 minutos)
- **Latencia**: 1-5 minutos
- **Costo**: $0.03 per GB + $0.01 per 1,000 requests
- **Uso**: Cuando se necesita urgentemente dentro de minutos

### 2. Standard (3-5 horas)
- **Latencia**: 3-5 horas
- **Costo**: $0.01 per GB + $0.05 per 1,000 requests
- **Uso**: Por defecto, balance costo-tiempo

### 3. Bulk (5-12 horas)
- **Latencia**: 5-12 horas
- **Costo**: $0.0025 per GB + $0.025 per 1,000 requests
- **Uso**: Cuando tiempo no es crítico, máximo ahorro

## Ventajas

### Flexibilidad de Recuperación
- **Tres opciones**: Elegir velocidad según necesidad
- **Costo variable**: Pagar más solo si urgencia
- **Adaptable**: Cambiar velocidad por recuperación
- **Sin compromiso**: No elegir velocidad por adelantado

### Costo de Almacenamiento
- **78% más barato**: vs S3 Standard
- **36% más barato**: vs Standard-IA
- **Solo 3% más caro**: vs Deep Archive (pero recuperación más rápida)
- **Excelente escala**: Máximo ahorro en volúmenes grandes

### Disponibilidad
- **Alta durabilidad**: 11 nueves
- **99.99% disponibilidad**: Mejor que Glacier Instant
- **Multi-AZ**: Redundancia geográfica completa
- **Replicación**: CRR y SRR completamente soportadas

### Casos de Uso
- **Backups de larga duración**: Ideal para cumplimiento
- **Archivos ocasionalmente necesarios**: Cuando velocidad varía
- **BCDR flexible**: Diferentes RTOs según circunstancia
- **Compliance**: Cumple regulaciones de retención

## Desventajas

### Recuperación No Inmediata
- **Job de restauración requerido**: Debe esperar antes de acceder
- **Mínimo 1 minuto**: Incluso Expedited no es instantáneo
- **No apto para producción**: Si necesita < 5 minutos
- **Planificación requerida**: Debe anticipar necesidad

### Período Mínimo Largo
- **90 días obligatorio**: Cargos si elimina antes
- **Penalización**: Paga meses completos si elimina temprano
- **Comprometimiento**: Debe estar seguro a 90+ días

### Costo de Recuperación
- **Expedited**: Puede ser caro si muchas recuperaciones
- **Cálculo complejo**: Múltiples opciones = confusión
- **No ideal para acceso frecuente**: Mejor Standard-IA
- **Sorpresas posibles**: Si récupera más que esperado

### Tamaño Mínimo Bajo
- **40 KB mínimo**: vs 128 KB de otras clases
- **Aún hay tarifas mínimas**: Pequeños archivos caros por byte

## Casos de Uso Ideales

### Backups y Disaster Recovery
- Backups mensuales/anuales
- Snapshots históricos de base de datos
- Backup de aplicación completa
- Archive tape equivalente

### Datos de Compliance
- Retención regulatoria (7 años)
- Datos legales/fiscales
- Registros de auditoría
- Datos sujeto a regulación

### Medios Archivados
- Video/audio profesional
- Fotos de proyecto completado
- Contenido multimedia histórico
- Archivos de producción

### Investigación Científica
- Datasets completados
- Raw data de investigación
- Resultados de análisis histórico
- Datos de laboratorio archivado

### Datos Históricos
- Logs > 1 año
- Transacciones histórica
- Datos de usuarios inactivos
- Información de empleados anterior

### Warehouse/Data Lake
- Archivos históricos de data lake
- Snapshots de análisis completados
- Datos de proyecto cerrado

## Casos de Uso NO Ideales

- ❌ Datos accedidos > 1 vez al mes
- ❌ Recuperación crítica < 1 minuto requerida
- ❌ Producción activa
- ❌ Datos que se eliminarán < 90 días
- ❌ SLA < 5 horas

## Consideraciones de Costo

### Desglose (USA East, aproximado)

| Recuperación | Almacenamiento | Recuperación | Costo/GB ret. |
|---|---|---|---|
| Expedited | $0.0036 | $0.03 | $0.0303 |
| Standard | $0.0036 | $0.01 | $0.0136 |
| Bulk | $0.0036 | $0.0025 | $0.0065 |

### Ejemplo 1: Backup de BCDR (1 TB, 5 recuperaciones/año, mix)

**Almacenamiento**: 1000 GB × $0.0036 × 12 = $43.2/año

**Recuperación** (mix típico):
- 1 Expedited: 1000 × $0.03 = $30
- 2 Standard: 2 × (1000 × $0.01) = $20
- 2 Bulk: 2 × (1000 × $0.0025) = $5
- Total recuperación: $55

**Total anual**: $43.2 + $55 = $98.2/año

**Comparativa**:
- S3 Standard: 1000 × $0.023 × 12 = $276/año (2.8x más)
- S3 Standard-IA: 1000 × $0.0125 × 12 = $150/año (1.5x más)

### Ejemplo 2: Datos Legales (500 GB, 1 acceso/año Bulk)

**Costo anual**:
- Almacenamiento: 500 × $0.0036 × 12 = $21.6
- Recuperación: 500 × $0.0025 = $1.25
- **Total**: $22.85/año

**Comparativa**:
- S3 Standard: $138/año (6x más)
- S3 Glacier Instant: $24 + $10 = $34/año

## Comparativa Glacier Options

| Aspecto | Expedited | Standard | Bulk |
|---|---|---|---|
| Latencia | 1-5 min | 3-5 hrs | 5-12 hrs |
| Almacenamiento/GB | $0.0036 | $0.0036 | $0.0036 |
| Recuperación/GB | $0.03 | $0.01 | $0.0025 |
| Solicitudes | $0.01/1k | $0.05/1k | $0.025/1k |
| Mejor Para | Urgencia | Balance | Máximo ahorro |
| Costo 1TB recupero | $30 | $10 | $2.50 |

## Comparativa con Otras Clases

| Aspecto | Glacier Flexible | Instant | Deep Archive | Standard-IA |
|---|---|---|---|---|
| Latencia | 1-12 hrs | 1-5 min | 12 hrs | ms |
| Almacenamiento | $0.0036 | $0.004 | $0.00099 | $0.0125 |
| Recuperación | $0.0025-0.03 | $0.02 | $0.05 | - |
| Período Mínimo | 90d | 90d | 180d | 30d |
| Flexibilidad | ⚡⚡⚡ | ⚡ | ❌ | - |
| Ideal Para | Backup variado | Backup rápido | Cumplimiento | Acceso ocasional |

## Matriz de Decisión

```
¿Cuál opción de recuperación elegir?

Necesidad de acceso:
├─ < 5 minutos: Expedited (pero costoso)
├─ 3-5 horas OK: Standard (recomendado)
└─ Flexible (> 5 hrs): Bulk (máximo ahorro)

Ejemplos:
├─ BCDR crítico: Mix (algunos Expedited, mayoría Standard)
├─ Backup de cumplimiento: Principalmente Bulk
├─ Backup de aplicación: Principalmente Standard
└─ Datos legales: Bulk (casi nunca se necesita)
```

## Mejores Prácticas

### Selección de Velocidad
```
Costo Expedited = $0.03/GB
Costo Standard = $0.01/GB  (66% más barato)
Costo Bulk = $0.0025/GB    (75% más barato)

Usar Expedited si: Costo de downtime > $0.02/GB
Usar Standard si: Costo de downtime > $0.0075/GB
Usar Bulk si: Costo de downtime > $0.00156/GB
```

### Política de Recuperación
```
Criticidad de datos:

CRÍTICA (RTO 1 hora):
  Usar Expedited si recupero probable
  Costo: $30 por 1GB recupero

MEDIA (RTO 8 horas):
  Usar Standard (default)
  Costo: $10 por 1GB recupero

BAJA (RTO 24+ horas):
  Usar Bulk
  Costo: $2.50 por 1GB recupero
```

### Estrategia de Migración
```
Datos Nuevos → S3 Standard (0-30 días, caliente)
                ↓
           → S3 Standard-IA (30-90 días, templado)
                ↓
           → S3 Glacier Flexible (90d-7yr, frío)
                ↓
           → S3 Glacier Deep Archive (7yr+, congelado)
```

### Configuración Lifecycle
```json
{
  "Rules": [
    {
      "Id": "Archive Strategy",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_FR"
        },
        {
          "Days": 2555,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2920
      }
    }
  ]
}
```

## Limitaciones

1. **Recuperación requerida**: No acceso inmediato
2. **Período mínimo 90 días**: Comprometimiento
3. **Costo de recuperación**: Variable según velocidad
4. **Tamaño mínimo 40 KB**: Aún hay mínimos
5. **Planificación requerida**: No espontáneo

## Conclusión

S3 Glacier Flexible Retrieval es la solución ideal para datos archivados con recuperación ocasional variable. Es perfecto para backups de larga duración, cumplimiento regulatorio, y datos históricos. Con tres opciones de velocidad, permite optimizar costo vs tiempo de recuperación según necesidad real. El costo de almacenamiento es muy bajo, y puede minimizar costos de recuperación eligiendo Bulk para datos no críticos.