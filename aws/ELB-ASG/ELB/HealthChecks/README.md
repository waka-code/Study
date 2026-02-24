# Health Checks en ELB

## ¿Qué es un Health Check?

ELB revisa continuamente el estado de las instancias para asegurarse de que solo envía tráfico a las que están sanas.

## ¿Cómo funciona?

ELB envía una petición periódica al endpoint de salud:

```
GET /health
```

### Si la instancia responde OK (2xx / 3xx):
- Se considera **sana**
- Sigue recibiendo tráfico

### Si la instancia falla:
- Se marca como **no sana (unhealthy)**
- Se **saca del pool** de tráfico
- No recibe requests
- Cuando se recupera → vuelve sola automáticamente

## Parámetros configurables

| Parámetro | Descripción |
| --- | --- |
| Protocol | HTTP, HTTPS, TCP |
| Path | Ruta a verificar (ej. `/health`) |
| Interval | Cada cuántos segundos se revisa |
| Timeout | Tiempo máximo de espera de respuesta |
| Healthy threshold | Cuántas respuestas OK para considerar sana |
| Unhealthy threshold | Cuántas fallas para sacarla del pool |

## Buenas prácticas

- Usar un endpoint `/health` real, no fake
- Que el endpoint verifique dependencias críticas (DB, cache)
- Configurar umbrales apropiados para evitar falsos positivos
- Loguear los resultados de health checks para debugging
