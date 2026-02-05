# Clases de Almacenamiento en Amazon S3

Directorio con documentación detallada sobre cada clase de almacenamiento disponible en Amazon S3, incluyendo características, ventajas, desventajas y casos de uso.

## Índice de Clases

1. **[S3 Standard](./S3-Standard.md)** - Almacenamiento general de propósito
2. **[S3 Intelligent-Tiering](./S3-Intelligent-Tiering.md)** - Optimización automática de costos
3. **[S3 Standard-IA](./S3-Standard-IA.md)** - Acceso poco frecuente
4. **[S3 One Zone-IA](./S3-One-Zone-IA.md)** - Acceso poco frecuente, una zona
5. **[S3 Glacier Instant Retrieval](./S3-Glacier-Instant.md)** - Archivo con recuperación instantánea
6. **[S3 Glacier Flexible Retrieval](./S3-Glacier-Flexible.md)** - Archivo con recuperación flexible
7. **[S3 Glacier Deep Archive](./S3-Glacier-Deep-Archive.md)** - Archivo de bajo costo a largo plazo
8. **[S3 Outposts](./S3-Outposts.md)** - Almacenamiento en instalaciones del cliente

## Tabla Comparativa Rápida

| Clase | Durabilidad | Disponibilidad | Latencia | Almacenamiento | Acceso | Uso Ideal |
|-------|-------------|----------------|----------|--|--|--|
| **Standard** | 11 nueves | 99.99% | ms | $$$ | $ | Datos accedidos frecuentemente |
| **Intelligent-Tiering** | 11 nueves | 99.9% | ms-horas | $$ | $$ | Patrones de acceso impredecibles |
| **Standard-IA** | 11 nueves | 99.9% | ms | $$ | $$$ | Datos con acceso ocasional |
| **One Zone-IA** | 11 nueves | 99.5% | ms | $ | $$$ | Datos recreables, acceso ocasional |
| **Glacier Instant** | 11 nueves | 99.9% | 1-5 min | $ | $$$$ | Archivos con acceso rápido |
| **Glacier Flexible** | 11 nueves | 99.99% | 1-12 hrs | $ | $$$$ | Archivos con acceso flexible |
| **Glacier Deep Archive** | 11 nueves | 99.99% | 12 hrs | $ | $$$$$ | Retención a muy largo plazo |
| **Outposts** | 11 nueves | 99.95% | ms | $$$ | $ | Datos on-premise |

## Decisiones Clave

### ¿Cuál elegir según el caso de uso?

- **Acceso frecuente diario**: S3 Standard
- **Acceso impredecible**: S3 Intelligent-Tiering
- **Acceso ocasional (< 1 vez/mes)**: S3 Standard-IA
- **Datos secundarios recreables**: S3 One Zone-IA
- **Archivos legales con acceso rápido**: S3 Glacier Instant
- **Backups con acceso flexible**: S3 Glacier Flexible
- **Cumplimiento regulatorio, retención años**: S3 Glacier Deep Archive
- **Datos que deben estar on-premise**: S3 Outposts

### Matriz de Decisión: Costo vs Latencia

```
LATENCIA
BAJA      │ Standard        │ Intelligent-Tiering
          │ One Zone-IA     │
          │                 │
MEDIA     │ Glacier Instant │
          │                 │
ALTA      │ Glacier Flexible│ Glacier Deep Archive
          └─────────────────────────────────────
          BAJO COSTO        ALTO COSTO
```

## Características Comunes

Todas las clases de S3 comparten:
- **Durabilidad**: 99.999999999% (11 nueves) - diseñado para 1 pérdida por 10 millones de objetos
- **Escalabilidad**: Almacenamiento ilimitado
- **Seguridad**: Encriptación, control de acceso, audit trails
- **Rendimiento**: Bajo latency para operaciones

## Requisitos y Limitaciones

### Tamaño Mínimo de Objeto
- **Standard, Intelligent-Tiering, Outposts**: Sin límite
- **Standard-IA, One Zone-IA, Glacier Instant**: 128 KB mínimo
- **Glacier Flexible, Deep Archive**: 40 KB mínimo

### Período Mínimo de Almacenamiento
- **Standard, Intelligent-Tiering, Outposts**: Sin período mínimo
- **Standard-IA, One Zone-IA**: 30 días
- **Glacier Instant**: 90 días
- **Glacier Flexible, Deep Archive**: 90 y 180 días respectivamente

Eliminar antes del período mínimo incurre en cargos.

## Consideraciones de Costo

### Componentes de Costo

1. **Almacenamiento**: Por GB por mes
   - Mayor en Standard, menor en Glacier Deep Archive
   
2. **Solicitudes**: Por operación (GET, PUT, DELETE, LIST)
   - Varía según clase
   
3. **Transferencia de Datos**: Egreso de datos
   - Generalmente igual en todas las clases
   
4. **Recuperación**: Cargos especiales en clases Glacier
   - Glacier Flexible y Deep Archive tienen cargos según velocidad
   
5. **Eliminación Temprana**: Penalización si se elimina antes del mínimo
   - Importante considerar en Standard-IA, Glacier, etc.

### Estimador de Ahorros

Para decidir cambiar de clase, considerar:
- Costo mensual actual = (GB × precio por GB) + (solicitudes × precio)
- Costo nueva clase = (GB × nuevo precio) + (solicitudes × nuevo precio)
- Si ahorros anuales > costos de transición, cambiar es rentable

## Herramientas de Análisis

- **AWS Storage Lens**: Análisis detallado de uso de almacenamiento
- **AWS Cost Explorer**: Desglose de costos por clase
- **S3 Lifecycle Policies**: Automatizar transiciones
- **S3 Batch Operations**: Cambiar clase masivamente

## Mejores Prácticas

1. **Analizar antes de elegir**: Revisar patrones de acceso
2. **Usar Lifecycle**: Mover automáticamente a clases más baratas
3. **Monitorear costos**: Revisar regularmente con Cost Explorer
4. **Documentar decisiones**: Registrar por qué se eligió cada clase
5. **Revisar periódicamente**: Los patrones de acceso cambian
6. **Combinar clases**: Usar múltiples clases para optimizar

## Referencias Rápidas

- **Costo más bajo**: Glacier Deep Archive
- **Mejor performance**: S3 Standard
- **Mejor relación costo-rendimiento**: S3 Intelligent-Tiering
- **Mejor para backup**: S3 Glacier Flexible
- **Mejor para cumplimiento**: S3 Glacier Deep Archive
