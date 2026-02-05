# S3 Glacier Deep Archive

## Descripción General

S3 Glacier Deep Archive es la clase de almacenamiento más económica de Amazon S3, diseñada para retención de datos a muy largo plazo (7+ años). Es ideal para cumplimiento regulatorio, archivos históricos y datos que muy raramente necesitan ser recuperados.

## Características Técnicas

| Característica | Valor |
|---|---|
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Disponibilidad** | 99.99% |
| **Zonas de Disponibilidad** | ≥ 3 |
| **Latencia de Recuperación** | 12 horas a 48 horas |
| **Opciones de Recuperación** | 2 (Standard, Bulk) |
| **Tamaño Mínimo** | 40 KB |
| **Período Mínimo** | 180 días |
| **Encriptación** | Soportada |
| **Versionado** | Soportado |

## Opciones de Recuperación

### 1. Standard (12 horas)
- **Latencia**: 12 horas
- **Costo**: $0.01 per GB + $0.1 per 1,000 requests
- **Uso**: Cuando se puede esperar un día

### 2. Bulk (hasta 48 horas)
- **Latencia**: Hasta 48 horas
- **Costo**: $0.0025 per GB + $0.025 per 1,000 requests
- **Uso**: Máximo ahorro, sin urgencia

## Ventajas

### Costo Extremadamente Bajo
- **97% más barato**: vs S3 Standard (almacenamiento)
- **60% más barato**: vs Glacier Flexible
- **El más económico**: De todas las clases S3
- **Escalabilidad total**: Perfecta para PB de datos

### Cumplimiento Ideal
- **Período mínimo 180 días**: Diseñado para cumplimiento
- **Retención a largo plazo**: 7-10 años sin problema
- **SLA 99.99%**: Alta disponibilidad garantizada
- **Multi-AZ redundancia**: Máxima seguridad

### Características
- **Versionado completo**: Control total
- **Encriptación**: Soportada
- **Replicación**: CRR y SRR
- **Object Lock**: Compatible con WORM
- **Compliance**: Diseñada para regulaciones

## Desventajas

### Recuperación Lenta
- **12+ horas mínimo**: No apto para urgencia
- **Hasta 48 horas**: Puede ser mucho tiempo
- **Job de restauración**: Debe esperar antes de acceder
- **No para BCDR crítico**: RTO > 12 horas inaceptable

### Período Mínimo Largo
- **180 días obligatorio**: Más largo que otras clases
- **Penalización cara**: Si elimina antes de 6 meses
- **Comprometimiento**: Debe estar muy seguro
- **No flexible**: No puede cambiar rápidamente

### Costo de Recuperación
- **$0.0025-0.01 per GB**: Significativo para datos grandes
- **Cálculo de ROI**: Debe estar seguro que vale la pena
- **No para acceso ocasional**: Mejor Standard-IA
- **Break-even long**: Requiere años para justificarse

### Limitaciones
- **Acceso muy infrecuente**: Idealmente < 1 vez por año
- **Tamaño mínimo**: 40 KB
- **No instant access**: Planificación requerida
- **Período mínimo largo**: Compromiso de 180 días

## Casos de Uso Ideales

### Cumplimiento Regulatorio
- **Retención fiscal**: 7 años (IRS/HMRC)
- **Retención legal**: Documentos legales
- **Logs de auditoría**: Compliance regulatorio
- **Datos de pacientes**: HIPAA (10 años)

### Archivos Históricos
- **Datos de negocio histórico**: > 5 años
- **Registros de empleados**: Separados de empresa
- **Facturas/recibos**: Archivo histórico
- **Correspondencia**: Histórica de cliente

### Data Lake Archivado
- **Datos completados de análisis**: No volverán a usarse
- **Datasets históricos**: Guardar por razones legales
- **Raw data archivada**: Especificaciones supercedidas
- **Backups de projecto**: Projecto completado

### Medios Profesionales
- **Video profesional**: Archivos maestros
- **Audio masters**: Grabaciones de estudio
- **Fotografía profesional**: Archivos originales
- **Películas/documentales**: Archivos históricos

### Investigación/Ciencia
- **Datasets de investigación**: Retención requerida
- **Raw scientific data**: Especificaciones publicadas
- **Resultados de laboratorio**: Histórico de pruebas
- **Tesis/disertaciones**: Archivos digitales

### Recuperación de Desastres Extrema
- **Última línea de defensa**: Si todo falla
- **Backup de muy largo plazo**: Cambio climático futuro
- **Contingencia extrema**: Colapso de centro de datos
- **Archivo de biodiversidad**: Datos de especie

## Casos de Uso NO Ideales

- ❌ Datos necesarios < 12 horas
- ❌ Acceso frecuente (> 1 vez/mes)
- ❌ Datos que pueden eliminarse < 180 días
- ❌ Datos críticos para BCDR
- ❌ Presupuesto donde costo de acceso es prohibitivo
- ❌ Datos vivos/activos

## Consideraciones de Costo

### Desglose (USA East, aproximado)

| Concepto | Costo |
|---|---|
| Almacenamiento | $0.00099 per GB per month |
| Recuperación Standard | $0.01 per GB |
| Recuperación Bulk | $0.0025 per GB |
| Solicitudes | $0.1/1,000 (Standard) o $0.025/1,000 (Bulk) |

### Ejemplo 1: Retención Fiscal (100 GB, nunca recuperado)

**Por 7 años (84 meses)**:
- Almacenamiento: 100 × $0.00099 × 84 = $8.32
- Recuperación: $0 (nunca se necesita)
- **Total**: $8.32

**Comparativa para 7 años**:
- S3 Standard: 100 × $0.023 × 84 = $193.20 (23x más)
- S3 Glacier Flexible: 100 × $0.0036 × 84 = $30.24 (3.6x más)
- **Ahorro Deep Archive**: $185/7 años = $26/año

### Ejemplo 2: Datos Legales (500 GB, 2 recuperaciones en 10 años)

**Almacenamiento 10 años**: 500 × $0.00099 × 120 = $59.4

**Recuperación** (2 recuperaciones Bulk):
- 500 × $0.0025 × 2 = $2.50

**Total 10 años**: $61.90

**Comparativa**:
- S3 Standard: 500 × $0.023 × 120 = $1,380 (22x más)
- S3 Glacier Flexible: $21.6 (almacenamiento) + $5 (recuperación) = $26.6/año = $266 (4.3x más)

### Break-Even Analysis

```
Cuándo usar Deep Archive vs Glacier Flexible:

Glacier Flexible:
- Almacenamiento: 500GB × $0.0036 × 12 = $21.60/año

Deep Archive:
- Almacenamiento: 500GB × $0.00099 × 12 = $5.94/año
- Recuperación: $0 (si no accede)

Ahorro anual: $15.66

Break-even: $15.66 / año × 6 años = $93.96
Ahorro justificado después de ~1 año
```

## Comparativa con Otras Clases

| Aspecto | Deep Archive | Flexible | Instant | Standard-IA |
|---|---|---|---|---|
| Latencia | 12-48 hrs | 1-12 hrs | 1-5 min | ms |
| Almacenamiento | $0.00099 | $0.0036 | $0.004 | $0.0125 |
| Recuperación | $0.0025-0.01 | $0.0025-0.03 | $0.02 | - |
| Período Mínimo | 180d | 90d | 90d | 30d |
| Ideal Para | Cumplimiento | Backup | Recuperación rápida | Acceso ocasional |
| Mejor para | 7+ años | < 5 años | < 1 año | Meses |

## Matriz de Decisión

```
¿Cuál Glacier elegir?

Frecuencia de acceso:
├─ Nunca esperado: Deep Archive ✓
├─ Muy raro (< 1/año): Deep Archive ✓
├─ Raro (1-5/año): Flexible Standard
├─ Ocasional (< 1/mes): Flexible Standard o Bulk
└─ Frecuente: Standard-IA o Standard

Período requerido:
├─ < 6 meses: NO usar archive
├─ 6 meses - 1 año: Flexible
├─ 1-7 años: Flexible o Deep Archive
└─ 7+ años: Deep Archive ✓

RTO (Recovery Time Objective):
├─ < 12 horas: NO usar Deep Archive
├─ 12-48 horas: Deep Archive OK
└─ > 48 horas: Deep Archive óptimo ✓
```

## Mejores Prácticas

### Política de Retención
```
Datos de Cumplimiento:
Cálculo de Período:
- Fiscal: Crear año + 7 años = 8 años mínimo
- Legal: Evento + 7 años = variable
- Paciente: Último contacto + 10 años = 10 años
- Laboral: Evento + 3-7 años = variable

Usar Deep Archive para períodos > 5 años
```

### Configuración Lifecycle Ideal
```json
{
  "Rules": [
    {
      "Id": "7 Year Compliance",
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
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    }
  ]
}
```

### Documentación
- Registrar por qué datos en Deep Archive
- Documentar período de retención requerido
- Notar si recuperación es realista o teórica
- Mantener inventario de datos archivados

### Monitoreo
- Seguimiento de costos (generalmente muy bajo)
- Alertas si recuperación > esperado
- Revisión anual de datos (¿sigue siendo necesario?)
- Verificación de integridad (spot check anual)

### Recuperación de Emergencia
- Documentar procedimiento de recuperación
- Prueba anual de restauración (pequeño subconjunto)
- Comunicar tiempo de RTO (12-48 horas)
- Preparar stakeholders para espera

## Limitaciones

1. **Recuperación lenta**: 12+ horas mínimo
2. **Período mínimo 180 días**: Comprometimiento largo
3. **Costo de recuperación**: Significativo
4. **No para BCDR**: RTO muy largo
5. **Tamaño mínimo 40 KB**: Pequeños archivos caros
6. **No flexible**: Cambios costosos

## Casos Especiales

### Glacier Deep Archive con Object Lock
```
Ideal para:
- WORM (Write Once, Read Many) compliance
- SEC Rule 17a-4 compliance
- Datos que NO pueden ser modificados
- Retención legal obligatoria
```

### Combinación con S3 Intelligent-Tiering
```
NO COMPATIBLE: No puede usar Intelligent-Tiering
para transicionar a Deep Archive automáticamente.

Solución: Lifecycle policy manual explícita.
```

## Conclusión

S3 Glacier Deep Archive es la opción más económica para retención de datos a muy largo plazo (7+ años). Es perfecta para cumplimiento regulatorio, archivos históricos, y datos que raramente (o nunca) serán accedidos nuevamente. El costo de almacenamiento es mínimo, y con poco acceso esperado, el costo total es prácticamente insignificante para la paz mental de cumplimiento regulatorio a largo plazo.

Con un cálculo cuidadoso del período de retención, Deep Archive ofrece el mejor ROI para datos de archivo permanente.