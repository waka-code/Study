# S3 Intelligent-Tiering

## Descripción General

S3 Intelligent-Tiering es una clase de almacenamiento que optimiza automáticamente los costos moviendo datos entre diferentes niveles de acceso basándose en patrones de uso reales. Ideal cuando los patrones de acceso son desconocidos o cambian frecuentemente.

## Características Técnicas

| Característica | Valor |
|---|---|
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Disponibilidad** | 99.9% |
| **Zonas de Disponibilidad** | ≥ 3 |
| **Latencia** | Milisegundos (Frequent) a horas (Deep Archive) |
| **Tamaño Mínimo** | 128 KB recomendado |
| **Período Mínimo** | 0 días (sin cargos de eliminación temprana) |
| **Encriptación** | Soportada |
| **Versionado** | Soportado |
| **Monitoreo** | Automático 24/7 |

## Niveles de Acceso

### 1. Frequent Access
- **Latencia**: Milisegundos
- **Criterio**: Acceso durante los últimos 30 días
- **Costo**: Similar a S3 Standard
- **Automático**: Sí, siempre activo

### 2. Infrequent Access
- **Latencia**: Milisegundos
- **Criterio**: Sin acceso durante 30 días
- **Costo**: Similar a S3 Standard-IA
- **Automático**: Sí, siempre activo

### 3. Archive Instant Access
- **Latencia**: 1-5 minutos (ms en algunos casos)
- **Criterio**: Sin acceso durante 90 días
- **Costo**: Similar a S3 Glacier Instant
- **Automático**: Sí, siempre activo

### 4. Archive Access (Opcional)
- **Latencia**: 1 minuto a 12 horas (configurable)
- **Criterio**: Sin acceso durante 90-700 días (configurable)
- **Costo**: Más bajo que Archive Instant
- **Automático**: No, requiere configuración

### 5. Deep Archive Access (Opcional)
- **Latencia**: 12 horas (configurable)
- **Criterio**: Sin acceso durante 180-730+ días (configurable)
- **Costo**: Más bajo que Archive Access
- **Automático**: No, requiere configuración

## Ventajas

### Optimización Automática
- **Sin intervención manual**: Monitoreo 24/7 automático
- **Adaptable**: Se ajusta a patrones reales de acceso
- **Rentable**: Reduce costos sin afectar rendimiento
- **Flexible**: Configuración opcional de niveles avanzados

### Rendimiento
- **Acceso rápido**: Latencia de milisegundos en niveles de acceso frecuente
- **Transparente**: Movimiento automático sin afectar aplicaciones
- **Escalable**: Maneja millones de objetos

### Gestión
- **Menos administración**: No requiere políticas de ciclo de vida complejas
- **Auditoría**: CloudWatch integrado
- **Sincronización**: Automática con patrones reales
- **Sin sorpresas**: Optimización predecible

### Costos
- **Ahorros automáticos**: Hasta 70% vs Standard sin configuración
- **Pequeña tarifa de monitoreo**: $0.0025 por 1,000 objetos/mes
- **Rentable incluso con cambios frecuentes**: Mejor que Standard para acceso impredecible

## Desventajas

### Complejidad
- **Comportamiento impredecible**: Nivel actualmente activo depende de patrones
- **Latencia variable**: Depende de qué nivel esté activo
- **Debugging**: Más difícil determinar dónde están los datos

### Costos Ocultos
- **Tarifa de monitoreo**: $0.0025 por 1,000 objetos/mes
- **Solicitudes adicionales**: Movimientos entre niveles generan solicitudes
- **Recuperación**: Archive Access/Deep Archive tienen costos de recuperación
- **No ideal para pequeña cantidad de datos**: Tarifa de monitoreo puede superar ahorros

### Limitaciones
- **Tamaño mínimo**: 128 KB recomendado (no hay penalización oficial)
- **Transiciones lentamente**: Máximo 30 días para cambio de nivel
- **No WORM**: No compatible con Object Lock
- **Necesita configuración para niveles avanzados**: Archive Access/Deep Archive opcionales

## Casos de Uso Ideales

### Datos con Acceso Impredecible
- Logs de aplicaciones
- Datos de investigación
- Archivos de usuario
- Backups con acceso variable

### Datos Que Envejecen
- Contenido generado por usuario
- Datos de transacciones históricas
- Archivos de sesión
- Caché distribuido

### Dev/Test
- Entornos de prueba
- Datos de QA
- Conjuntos de datos experimentales

### Analytics
- Datos de entrada para análisis
- Resultados intermedios
- Datasets variados

## Casos de Uso NO Ideales

- ❌ Datos muy pequeños (< 128 KB) en gran cantidad
- ❌ Datos críticos que requieren latencia garantizada
- ❌ Datos que se acceden regularmente (cada día)
- ❌ Aplicaciones sensibles a latencia variable
- ❌ Object Lock requerido

## Consideraciones de Costo

### Tarifa de Monitoreo

```
1,000 objetos × $0.0025 = $0.0025/mes
100,000 objetos × $0.0025 = $0.25/mes
1,000,000 objetos × $0.0025 = $2.50/mes
```

### Ejemplo Comparativo (100,000 objetos, 1 TB)

**S3 Standard**:
- Almacenamiento: 1 TB × $0.023 = $23/mes
- Solicitudes: Asumidas = $5/mes
- **Total**: $28/mes

**S3 Intelligent-Tiering**:
- Almacenamiento (Frequent, 50% del mes): 0.5 TB × $0.023 × 1/2 = $5.75/mes
- Almacenamiento (Infrequent, 50%): 0.5 TB × $0.0125 × 1/2 = $3.13/mes
- Monitoreo: 100,000 × $0.0025 = $0.25/mes
- Solicitudes: $3/mes
- **Total**: $12.13/mes
- **Ahorro**: $15.87/mes (56%)

## Comparativa con Otras Clases

| Aspecto | Intelligent-Tiering | Standard | Standard-IA | Glacier Flexible |
|---|---|---|---|---|
| Optimización | Automática | Manual | Manual | Manual |
| Latencia | Variable | ⚡⚡⚡ | ⚡⚡⚡ | ⚡ |
| Costo | $$-$$ | $$$ | $$ | $ |
| Configuración | Minimal | Minimal | Media | Media |
| Mejor Para | Acceso variable | Acceso frecuente | Acceso ocasional | Archivo |

## Mejores Prácticas

### Configuración Inicial
```
Frequent Access:        Automático (30 días)
Infrequent Access:      Automático (30 días)
Archive Instant Access: Automático (90 días) - RECOMENDADO
Archive Access:         DESACTIVADO (activar solo si necesario)
Deep Archive Access:    DESACTIVADO (activar solo si necesario)
```

### Monitoreo
- Usar CloudWatch para monitorear transiciones
- Revisar distribución de datos entre niveles
- Validar que los patrones de acceso coincidan con expectativas

### Optimización
- Habilitar Archive Access solo para datos > 6 meses sin acceso
- Usar Deep Archive Access para cumplimiento a largo plazo
- Combinar con Lifecycle policies para transiciones específicas

### Seguridad
- Versionado recomendado
- IAM policies restrictivas
- Logging de acceso
- Encriptación habilitada

## Limitaciones Conocidas

1. **Sin garantía de latencia**: Nivel actual depende de acceso previo
2. **Tarifa de monitoreo**: Pequeña pero acumulativa
3. **Transiciones gradualmente**: No instantáneo
4. **No compatible con Object Lock**: Para WORM requerida otra clase
5. **Mínimo 30 días para transición a Infrequent**: No hay aceleración

## Cuándo NO Usar

- Datos < 128 KB (tarifa supera ahorros)
- Latencia garantizada requerida (< 100ms)
- Datos accedidos diariamente (mejor Standard)
- Menos de 10,000 objetos (tarifa no justificable)
- Cumplimiento WORM estricto

## Cuándo Usar

- ✅ Acceso impredecible
- ✅ Datos que envejecen
- ✅ Presupuesto flexible
- ✅ Datos > 128 KB
- ✅ Más de 10,000 objetos
- ✅ Dispuesto a tolerar latencia variable

## Conclusión

S3 Intelligent-Tiering es ideal para organizaciones que quieren optimización de costos sin complejidad operacional. Es perfecto para datos con patrones de acceso cambiantes o desconocidos. La tarifa de monitoreo es pequeña comparada con los ahorros potenciales, especialmente con miles de objetos.