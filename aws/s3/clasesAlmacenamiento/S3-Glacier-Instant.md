# S3 Glacier Instant Retrieval

## Descripción General

S3 Glacier Instant Retrieval es una clase de almacenamiento de archivo con recuperación rápida (1-5 minutos). Ofrece costo muy bajo con acceso más rápido que Glacier Flexible, ideal para archivos que necesitan ser recuperados ocasionalmente pero con urgencia.

## Características Técnicas

| Característica | Valor |
|---|---|
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Disponibilidad** | 99.9% |
| **Zonas de Disponibilidad** | ≥ 3 |
| **Latencia de Recuperación** | 1-5 minutos |
| **Tamaño Mínimo** | 128 KB |
| **Período Mínimo** | 90 días |
| **Encriptación** | Soportada |
| **Versionado** | Soportado |
| **Recuperación** | Instantánea (sin espera de job) |

## Características Glaciar

### Modelo de Recuperación
- **Instantáneo**: Sin requerir job de restauración
- **Milisegundos a minutos**: Datos en minutos, no horas
- **Transparente**: Acceso normal de S3, sin APIs especiales
- **Automático**: No requiere "restaurar" explícitamente

### Componentes de Costo
```
Almacenamiento: $0.004/GB
Recuperación: $0.02/GB (por GB recuperado)
Solicitudes: $0.01/1000 PUT
             $0.001/10000 GET
```

## Ventajas

### Costo de Almacenamiento
- **82% más barato**: vs S3 Standard
- **68% más barato**: vs Standard-IA
- **Más caro solo que Deep Archive**: Pero recuperación rápida
- **Excelente para volúmenes grandes**: Ahorro masivo en escala

### Recuperación Rápida
- **1-5 minutos**: Mucho más rápido que Glacier Flexible
- **Instantáneo a intención de acceso**: No esperas largas
- **Adecuado para urgencia**: Si se necesita dentro de minutos
- **Transparente**: Funciona como acceso normal de S3

### Disponibilidad
- **Alta durabilidad**: 11 nueves
- **99.9% disponibilidad**: Garantizada
- **Multi-AZ**: Redundancia geográfica
- **Automático**: Sin configuración de recuperación

### Flexibilidad
- **Sin límite de acceso**: Se puede recuperar múltiples veces
- **Compatible**: Funciona con todas las herramientas S3
- **Replicación**: CRR y SRR soportadas
- **Ciclo de vida**: Fácil transición desde Standard

## Desventajas

### Período Mínimo Largo
- **90 días mínimo**: Cargos si elimina antes
- **Penalización**: Paga meses completos si elimina temprano
- **Comprometimiento**: Debe estar seguro de datos a largo plazo

### Costo de Recuperación
- **$0.02 por GB recuperado**: Caro si recupera mucho
- **Acumula**: Múltiples recuperaciones = múltiples cargos
- **No ideal para acceso frecuente**: Mejor Standard-IA
- **Break-even**: Necesita < 10 accesos/año

### Restricciones
- **Tamaño mínimo**: 128 KB (pequeños archivos caros)
- **Período mínimo**: 90 días (comprometimiento)
- **No immediate**: 1-5 minutos, no instantáneo
- **Disponibilidad**: 99.9% (no 99.99%)

### Complejidad Operacional
- **Recuperación aún requiere tiempo**: No instantánea
- **Monitoreo necesario**: Seguimiento de recuperaciones
- **Costo variable**: Depende de acceso real
- **Break-even calculado**: No siempre obvio si usar

## Casos de Uso Ideales

### Datos de Cumplimiento
- Registros regulatorios
- Datos legales que necesitan acceso rápido
- Auditoría con ciclo de 6+ meses

### Backups de Acceso Rápido
- Backup de aplicación (recuperación en 5 min vs horas)
- BCDR con RPO/RTO moderados
- Backups de base de datos que ocasionalmente se necesitan

### Archivos Médicos
- Historias médicas (acceso ocasional, rápido)
- Imágenes médicas archivadas
- Registros de pacientes históricos

### Datos de Investigación
- Datasets de investigación completados
- Resultados de análisis históricos
- Datos científicos archivados

### Logs Históricos
- Logs de aplicación > 3 meses
- Logs de seguridad archivados
- Datos de auditoría

### Medios de Comunicación
- Archivos de video/podcast antiguos
- Fotos de eventos históricos
- Contenido multimedia archivado

## Casos de Uso NO Ideales

- ❌ Datos accedidos > 1 vez por mes (mejor Standard-IA)
- ❌ Datos necesarios en < 1 minuto (mejor Standard)
- ❌ Datos que se eliminarán < 90 días
- ❌ Datos muy frecuentemente recuperados (costo prohibitivo)
- ❌ Datos < 128 KB en gran volumen

## Consideraciones de Costo

### Desglose (USA East, aproximado)

| Concepto | Costo |
|---|---|
| Almacenamiento | $0.004 per GB per month |
| Recuperación | $0.02 per GB retrieved |
| Solicitud PUT | $0.05 per 1,000 |
| Solicitud GET | $0.001 per 10,000 |

### Ejemplo 1: Archivo Médico (200 GB, 4 accesos/año)

**S3 Standard**:
- Almacenamiento: 200 × $0.023 × 12 = $55.2/año
- Accesos: 4 × ($0.0004/10k) = $0.00016/año
- **Total**: $55.20/año

**S3 Glacier Instant**:
- Almacenamiento: 200 × $0.004 × 12 = $9.6/año
- Recuperación: 200 × $0.02 × 4 = $16/año
- Accesos: 4 × ($0.001/10k) = $0.0004/año
- **Total**: $25.60/año
- **Ahorro**: 53.6%

### Ejemplo 2: Backup Ocasional (500 GB, 2 accesos/año)

**S3 Standard-IA**:
- Almacenamiento: 500 × $0.0125 × 12 = $75/año
- Accesos: 2 × ($0.001/10k) = $0.0002/año
- **Total**: $75/año

**S3 Glacier Instant**:
- Almacenamiento: 500 × $0.004 × 12 = $24/año
- Recuperación: 500 × $0.02 × 2 = $20/año
- **Total**: $44/año
- **Ahorro**: 41%

## Comparativa con Otras Clases

| Aspecto | Glacier Instant | Glacier Flexible | Standard-IA | Deep Archive |
|---|---|---|---|---|
| Latencia | 1-5 min | 1-12 hrs | ms | 12 hrs |
| Almacenamiento | $ | $ | $$ | $ |
| Recuperación | $0.02/GB | $0.01/GB | - | $0.05/GB |
| Período Mínimo | 90d | 90d | 30d | 180d |
| Disponibilidad | 99.9% | 99.99% | 99.9% | 99.99% |
| Ideal Para | Recuperación rápida | Recuperación flexible | Acceso ocasional | Largo plazo |

## Matriz de Decisión

```
¿Cuándo necesita datos si falla?

< 1 minuto → Use S3 Standard
1-5 minutos → Use S3 Glacier Instant ✓
5 minutos - 12 horas → Use S3 Glacier Flexible
> 12 horas → Use S3 Glacier Deep Archive

Consideraciones adicionales:
├─ Almacenamiento largo (>90 días): ✓ OK
├─ Acceso muy frecuente (>10/mes): ✗ NO, caro
├─ Cumplimiento legal: ✓ Ideal
├─ BCDR rápido: ✓ Excelente
└─ Presupuesto máximo: ✗ NO
```

## Mejores Prácticas

### Selección de Datos
- Validar que recuperaciones < 10 por año
- Calcular costo total (almacenamiento + recuperación)
- Documentar SLA de recuperación (5 minutos aceptable)
- Asegurar período mínimo 90 días

### Estrategia de Migración
```
Datos Nuevos → S3 Standard (caliente)
Después 30d  → S3 Standard-IA (tibio)
Después 90d  → S3 Glacier Instant (frío)
Después 1yr  → S3 Glacier Deep Archive (congelado) - opcional
```

### Configuración de Lifecycle
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
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

### Monitoreo
- CloudWatch para seguimiento de recuperaciones
- Alertas si recuperaciones > esperado
- Revisión trimestral de costos
- Análisis de patrón de acceso

### Gestión de Costos
- Calcular costo/GB recuperado
- Alertas si recuperación > presupuesto
- Análisis mensual de tendencias
- Optimizar período mínimo

## Limitaciones

1. **Período mínimo 90 días**: No flexible
2. **Recuperación 1-5 min**: No instantánea
3. **Costo de recuperación**: Significativo si acceso frecuente
4. **Tamaño mínimo 128 KB**: Pequeños archivos poco económicos
5. **Disponibilidad 99.9%**: No 99.99%

## Cálculo Break-Even

```
Usar Glacier Instant si:

(GB × $0.004 × 12) + (GB × $0.02 × N_accesos)
<
(GB × $0.0125 × 12)

Donde N_accesos = número de recuperaciones/año

Simplificando:
$0.048 + ($0.02 × N_accesos) < $0.15
$0.02 × N_accesos < $0.102
N_accesos < 5.1

Si accesos > 5 por año: Probably Standard-IA mejor
Si accesos < 5 por año: Glacier Instant probablemente mejor
```

## Conclusión

S3 Glacier Instant es ideal para datos archivados que ocasionalmente necesitan recuperación rápida. Es perfecto para cumplimiento legal, backups ocasionales, y BCDR con RTO de 5-10 minutos. El costo es muy bajo de almacenamiento, pero la recuperación tiene un costo significativo, así que solo es rentable si accesos son infrecuentes.