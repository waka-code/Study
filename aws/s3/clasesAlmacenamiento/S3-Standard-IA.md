# S3 Standard-IA (Infrequent Access)

## Descripción General

S3 Standard-IA es una clase de almacenamiento diseñada para datos de larga duración que se acceden ocasionalmente. Ofrece disponibilidad inmediata con un costo de almacenamiento más bajo, pero con cargos más altos por acceso.

## Características Técnicas

| Característica | Valor |
|---|---|
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Disponibilidad** | 99.9% |
| **SLA de Disponibilidad** | 99.0% |
| **Zonas de Disponibilidad** | ≥ 3 |
| **Latencia** | Milisegundos |
| **Tamaño Mínimo** | 128 KB |
| **Período Mínimo** | 30 días |
| **Encriptación** | Soportada |
| **Versionado** | Soportado |
| **IA** | No, requiere configuración manual |

## Ventajas

### Costo de Almacenamiento
- **60% más barato**: vs S3 Standard para almacenamiento
- **Predecible**: Costo fijo por GB
- **Escalable**: Ahorro crece con volumen
- **Ideal para grandes volúmenes**: Mejor para TB/PB de datos

### Disponibilidad
- **Acceso inmediato**: Sin tiempos de espera de recuperación
- **SLA de 99%**: Disponibilidad garantizada
- **Redundancia geográfica**: Datos en múltiples zonas
- **Alta durabilidad**: 11 nueves

### Flexibilidad
- **Sin bloqueos**: Se puede acceder cualquier número de veces
- **Compatible**: Funciona con todas las herramientas de S3
- **Ciclo de vida**: Fácil transición desde Standard
- **Replicación**: CRR y SRR completamente soportadas

### Características
- **Versionado completo**: Control total
- **Etiquetas**: Organización por metadatos
- **CloudWatch**: Monitoreo incluido
- **Notificaciones**: Eventos en tiempo real

## Desventajas

### Costo de Acceso
- **Más caro por solicitud**: ~10x que Standard
- **Mínimo de carga**: $0.01 por 1,000 GET
- **No ideal para acceso frecuente**: Se vuelve más caro que Standard

### Restricciones
- **Tamaño mínimo**: 128 KB (cargos mínimos aplican)
- **Período mínimo**: 30 días (cargos de eliminación temprana)
- **Disponibilidad**: 99.9% vs 99.99% de Standard
- **No instant**: Disponibilidad garantizada de 99% (vs 99.9%)

### Cálculo Break-Even
Para que Standard-IA sea más económico que Standard:
- Acceso < 1 vez por mes
- O acceso < 10 veces al mes y mucho almacenamiento

## Casos de Uso Ideales

### Backups
- Backups semanales/mensuales
- Backups de compliance
- Copias de seguridad secundarias

### Datos Históricos
- Logs archivados
- Datos de transacciones pasadas
- Registros financieros

### Archivos de Usuario
- Documentos descargados ocasionalmente
- Fotos antiguas
- Archivos de proyecto completado

### Distribución de Contenido
- Archivos de origen para CDN
- Contenido no popular
- Activos multimedia antiguos

### DevOps/QA
- Artefactos de versiones antiguas
- Datos de prueba históricos
- Configuraciones archivadas

### Conformidad y Legal
- Datos para auditoría
- Documentos legales
- Registros de cumplimiento

## Casos de Uso NO Ideales

- ❌ Datos accedidos diariamente (mejor Standard)
- ❌ Datos < 128 KB en gran volumen (cargos mínimos)
- ❌ Datos accedidos > 1 vez por semana
- ❌ Muy bajo presupuesto (Glacier sería mejor)
- ❌ Datos eliminados regularmente (< 30 días)

## Consideraciones de Costo

### Desglose de Costos (USA East, aproximado)

| Concepto | Costo |
|---|---|
| Almacenamiento (primeros 50 TB/mes) | $0.0125 per GB |
| Almacenamiento (50-500 TB/mes) | $0.012 per GB |
| Almacenamiento (>500 TB/mes) | $0.011 per GB |
| Solicitud GET | $0.001 per 10,000 |
| Solicitud PUT/POST | $0.01 per 1,000 |
| Transferencia de datos (egreso) | $0.09 per GB |
| Recuperación temprana | Cargos aplican si < 30 días |

### Ejemplo 1: Backup Mensual (10 GB, 10 accesos/mes)

**S3 Standard**:
- Almacenamiento: 10 × $0.023 = $0.23/mes
- Accesos: 10 × ($0.0004/10k) = $0.00004/mes
- **Total**: ~$0.23/mes

**S3 Standard-IA**:
- Almacenamiento: 10 × $0.0125 = $0.125/mes
- Accesos: 10 × ($0.001/10k) = $0.0001/mes
- **Total**: ~$0.125/mes
- **Ahorro**: 45%

### Ejemplo 2: Datos Históricos (500 GB, 50 accesos/mes)

**S3 Standard**:
- Almacenamiento: 500 × $0.023 = $11.50/mes
- Accesos: 50 × ($0.0004/10k) = $0.0002/mes
- **Total**: ~$11.50/mes

**S3 Standard-IA**:
- Almacenamiento: 500 × $0.0125 = $6.25/mes
- Accesos: 50 × ($0.001/10k) = $0.0005/mes
- **Total**: ~$6.25/mes
- **Ahorro**: 46%

## Comparativa con Otras Clases

| Aspecto | Standard-IA | Standard | Glacier Instant | One Zone-IA |
|---|---|---|---|---|
| Latencia | ⚡⚡⚡ | ⚡⚡⚡ | ⚡ | ⚡⚡⚡ |
| Almacenamiento | $$ | $$$ | $ | $ |
| Acceso | $$$ | $ | $$$$ | $$$ |
| Disponibilidad | 99.9% | 99.99% | 99.9% | 99.5% |
| Período Mínimo | 30d | - | 90d | 30d |
| Redundancia | 3+ AZ | 3+ AZ | 3+ AZ | 1 AZ |
| Ideal Para | Acceso ocasional | Acceso frecuente | Acceso raro | Datos recreables |

## Mejores Prácticas

### Selección de Datos
- Validar que datos se acceden < 1 vez por semana
- Asegurar objetos ≥ 128 KB
- Calcular break-even antes de migrar

### Transiciones
```
Día 0-30:     S3 Standard (caliente)
Día 30+:      S3 Standard-IA (templado)
Día 90+:      S3 Glacier (frío) - opcional
```

### Configuración de Lifecycle
```json
{
  "Rules": [
    {
      "Id": "Transition to IA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
```

### Monitoreo
- CloudWatch para seguimiento de costos
- Alertas para acceso no esperado
- Auditoría de solicitudes

### Seguridad
- Versionado habilitado (especialmente importante)
- MFA Delete para buckets críticos
- IAM policies restrictivas
- Encriptación de datos

## Limitaciones

1. **Tamaño mínimo 128 KB**: Pequeños archivos pagan mínimos
2. **Período mínimo 30 días**: Cargos si se elimina antes
3. **Cargos de recuperación temprana**: Si acceso < 30 días
4. **Disponibilidad 99.9%**: No 99.99% como Standard
5. **SLA inferior**: Menos garantías que Standard

## Cargas por Eliminación Temprana

Si elimina datos antes de 30 días:
- Se cobra el almacenamiento por los días completos (redondeado al mes)
- Ejemplo: Almacenar 5 días en 100 GB = cargo de 30 días completos

Evitar si datos no son permanentes.

## Calculadora de Decisión

```
¿Datos se acceden < 1 vez por semana?
└─ SÍ: Continuar
   └─ ¿Datos > 128 KB?
      └─ SÍ: Continuar
         └─ ¿Datos permanecerán > 30 días?
            └─ SÍ: USE S3 Standard-IA ✓
            └─ NO: Use S3 Standard

└─ NO: Use S3 Standard
```

## Conclusión

S3 Standard-IA es ideal para datos que necesitan estar disponibles inmediatamente pero se acceden ocasionalmente. Es perfecto para backups, datos históricos y archivos de cumplimiento. Con una estrategia de ciclo de vida adecuada, puede ahorrar significativamente comparado con Standard mientras mantiene acceso inmediato.