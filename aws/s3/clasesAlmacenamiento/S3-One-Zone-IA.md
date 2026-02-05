# S3 One Zone-IA

## Descripción General

S3 One Zone-IA es similar a Standard-IA pero almacena datos en una única zona de disponibilidad en lugar de múltiples zonas. Ofrece el almacenamiento más económico después de Glacier, pero con menor redundancia. Ideal para datos secundarios o fácilmente recreables.

## Características Técnicas

| Característica | Valor |
|---|---|
| **Durabilidad** | 99.999999999% (11 nueves) |
| **Disponibilidad** | 99.5% |
| **Zonas de Disponibilidad** | 1 (Single AZ) |
| **Latencia** | Milisegundos |
| **Tamaño Mínimo** | 128 KB |
| **Período Mínimo** | 30 días |
| **Redundancia** | Dentro de una sola zona |
| **Encriptación** | Soportada |
| **Versionado** | Soportado |

## Diferencia Principal: One Zone vs Standard-IA

```
Standard-IA:        Multi-AZ (3+ zonas)     99.9% disponibilidad
One Zone-IA:        Single-AZ (1 zona)      99.5% disponibilidad
```

| Escenario | Standard-IA | One Zone-IA |
|---|---|---|
| Fallo de zona de disponibilidad | ✓ Accesible | ❌ No accesible |
| Fallo regional | ❌ Múltiples copias perdidas | ❌ Todos los datos perdidos |
| Costo por GB | $0.0125 | $0.01 |

## Ventajas

### Costo Muy Bajo
- **20% más barato**: vs Standard-IA
- **80% más barato**: vs S3 Standard
- **El más económico sin archiving**: Entre almacenamiento inmediato
- **Ideal para grandes volúmenes**: Ahorro masivo en TB/PB

### Rendimiento
- **Acceso instantáneo**: Latencia de milisegundos
- **No requiere recuperación**: Sin esperas
- **Transparente para aplicaciones**: Funciona como Standard

### Flexibilidad
- **Sin restricción de acceso**: Se puede acceder ilimitadamente
- **Ciclo de vida**: Fácil transición desde Standard
- **Compatible**: Funciona con todas las herramientas S3

## Desventajas

### Riesgo de Disponibilidad
- **Punto único de fallo**: Fallo de zona = pérdida de datos
- **99.5% vs 99.9%**: Menor disponibilidad garantizada
- **No para datos críticos**: Riesgo inaceptable para producción
- **Impredecible**: Zona puede ser inaccesible

### Restricciones
- **Tamaño mínimo**: 128 KB (cargos mínimos)
- **Período mínimo**: 30 días (cargos por eliminación temprana)
- **Costo de acceso**: Más alto que Standard
- **Sin replicación multi-región**: CRR no disponible nativo

### Falta de Redundancia Geográfica
- **Sin protección regional**: AWS fallo en región = todo perdido
- **No recomendado para cumplimiento**: Muchas regulaciones lo prohíben
- **No apto para Disaster Recovery**: No puede ser sitio de backup
- **No BCDR**: Continuidad de negocio comprometida

## Casos de Uso Ideales

### Datos Secundarios
- Cachés que se pueden regenerar
- Datos de trabajo temporales
- Copias locales de datos distribuidos

### Datos Fácilmente Recreables
- Artefactos de build (puedo reconstruir)
- Logs que existen en otro lugar
- Datos de sesión temporal
- Datos de test/desarrollo

### Presupuesto Ultra-Bajo
- Startups con restricciones presupuestarias
- Datos experimentales
- Almacenamiento de bajo valor

### Nivel 2 de Backup
- Backup de backup (primer backup en Standard-IA)
- Copia local dentro de región
- No es copia de seguridad primaria

### QA/Dev
- Datos de test
- Ambiantes no-críticos
- Experimentación

## Casos de Uso NO Ideales

- ❌ Datos de producción críticos
- ❌ Datos únicos (sin backup)
- ❌ Datos sujetos a regulación (GDPR, HIPAA, etc.)
- ❌ Datos que deben tener Disaster Recovery
- ❌ Datos accedidos frecuentemente
- ❌ Datos < 128 KB
- ❌ Datos que deben estar accesibles 24/7 (SLA crítico)

## Consideraciones de Costo

### Desglose de Costos (USA East, aproximado)

| Concepto | Costo |
|---|---|
| Almacenamiento | $0.01 per GB |
| Solicitud GET | $0.001 per 10,000 |
| Solicitud PUT/POST | $0.01 per 1,000 |
| Transferencia de datos (egreso) | $0.09 per GB |
| Cargos por eliminación temprana | Si < 30 días |

### Ejemplo: Datos de Test (100 GB, 20 accesos/mes)

**S3 Standard**:
- Almacenamiento: 100 × $0.023 = $2.30/mes
- Accesos: 20 × ($0.0004/10k) = $0.00008/mes
- **Total**: ~$2.30/mes

**S3 Standard-IA**:
- Almacenamiento: 100 × $0.0125 = $1.25/mes
- Accesos: 20 × ($0.001/10k) = $0.0002/mes
- **Total**: ~$1.25/mes
- **Ahorro**: 46%

**S3 One Zone-IA**:
- Almacenamiento: 100 × $0.01 = $1.00/mes
- Accesos: 20 × ($0.001/10k) = $0.0002/mes
- **Total**: ~$1.00/mes
- **Ahorro vs Standard**: 57%
- **Ahorro vs Standard-IA**: 20%

### Cálculo Break-Even

```
One Zone-IA se justifica si:
- Datos son recreables
- O datos son backup de backup
- O datos no son críticos para SLA
- Y almacenamiento > 50 GB
```

## Comparativa con Otras Clases

| Aspecto | One Zone-IA | Standard-IA | Glacier Instant | Standard |
|---|---|---|---|---|
| Latencia | ⚡⚡⚡ | ⚡⚡⚡ | ⚡ | ⚡⚡⚡ |
| Almacenamiento | $ | $$ | $ | $$$ |
| Acceso | $$$ | $$$ | $$$$ | $ |
| Disponibilidad | 99.5% | 99.9% | 99.9% | 99.99% |
| Redundancia | 1 AZ | 3+ AZ | 3+ AZ | 3+ AZ |
| Período Mínimo | 30d | 30d | 90d | - |
| Ideal Para | Recreables | Ocasional | Archivo | Frecuente |

## Matriz de Decisión

```
¿Datos son críticos para producción?
├─ SÍ: NO USAR One Zone-IA
│   ├─ Acceso frecuente → Standard
│   ├─ Acceso ocasional → Standard-IA
│   └─ Archivo → Glacier
│
└─ NO: Continuar
    ├─ ¿Datos son fácilmente recreables?
    │ └─ SÍ: Use One Zone-IA ✓
    │
    ├─ ¿Datos son backup de backup?
    │ └─ SÍ: Use One Zone-IA ✓
    │
    └─ ¿Datos deben estar en múltiples zonas?
      └─ SÍ: Use Standard-IA en su lugar
      └─ NO: Use One Zone-IA ✓
```

## Mejores Prácticas

### Selección Inicial
- **Validar recreabilidad**: ¿Puedo regenerar estos datos?
- **Documentar riesgo**: Registrar por qué datos no son críticos
- **No para datos únicos**: Solo si existen otras copias

### Estrategia de Backup
```
Datos Críticos:
  Primario: S3 Standard (Multi-AZ)
  Backup 1: S3 Standard-IA (otra región - CRR)
  Backup 2: Glacier Flexible (long-term)

Datos No-Críticos:
  Primario: S3 One Zone-IA
  Backup: ¿Necesario? Depende del SLA
```

### Monitoreo
- Alertas en CloudWatch
- Revisión mensual de datos
- Documentación de riesgo aceptado

### Límites Organizacionales
Establecer políticas:
```
- One Zone-IA: Máximo 10% de datos de producción
- Etiquetas mandatorias: Marcar como "non-critical"
- Revisión trimestral: Validar que sigue siendo recreable
```

## Riesgo Calculado

### Probabilidad de Fallo
- AWS reporta 99.99% uptime (no fallo anual promedio)
- AZ individual: ~99.95% uptime
- Probabilidad de perder One Zone-IA: ~0.05% anual
- Por cada 20 años: 1 pérdida esperada

### Decisión
```
Riesgo aceptable si:
(Costo mensual × 12 meses × años de datos) 
< (Valor de datos + impacto de pérdida)
```

## Limitaciones

1. **Redundancia limitada**: Solo en una zona
2. **Fallo regional**: Sin protección
3. **Disponibilidad SLA**: 99.5% (bajo para misión crítica)
4. **Período mínimo**: 30 días (cargos por eliminación temprana)
5. **Tamaño mínimo**: 128 KB

## Conclusión

S3 One Zone-IA es la opción más económica con acceso inmediato, perfecta para datos no críticos que son fácilmente recreables. Es ideal para cachés, datos de desarrollo/test, y backups de backup. Sin embargo, NO debe usarse para datos únicos o críticos para la continuidad del negocio. La decisión debe ser consciente del riesgo y documentada.