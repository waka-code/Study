# Health Checks en ASG

## ¿Para qué sirven en el ASG?

El ASG usa health checks para determinar si una instancia está **sana o debe ser reemplazada**.

Si una instancia falla el health check:
1. El ASG la **termina** automáticamente
2. **Lanza una nueva** instancia en su lugar
3. La nueva instancia se registra en el ELB

## Tipos de Health Check

### EC2 Health Check (por defecto)

- Verifica el estado de la instancia a nivel de **infraestructura**
- Detecta: instancia parada, terminada, o con fallo de hardware
- **No detecta** problemas a nivel de aplicación

### ELB Health Check (recomendado)

- Verifica si la aplicación **responde correctamente**
- Usa el mismo endpoint configurado en el ELB (ej. `GET /health`)
- **Detecta fallos de aplicación**, no solo de infraestructura
- Más completo que el EC2 health check

## ¿Por qué usar ELB Health Check?

| Escenario | EC2 Check | ELB Check |
| --- | --- | --- |
| Instancia apagada | ✅ Detecta | ✅ Detecta |
| App caída pero EC2 viva | ❌ No detecta | ✅ Detecta |
| Endpoint `/health` falla | ❌ No detecta | ✅ Detecta |

## Buenas prácticas

- **Usar ELB health check** en lugar del EC2 por defecto
- Implementar un endpoint `/health` real que verifique dependencias
- No hacer health checks "fake" (que siempre devuelven 200)
- Configurar umbrales adecuados para evitar reemplazos innecesarios
