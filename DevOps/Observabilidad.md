# Observabilidad

## Logs
- Registros de eventos y errores de la aplicación.
- Permiten rastrear problemas y auditar el comportamiento.

### Ejemplo (TypeScript)
```typescript
console.log('Usuario creado', { userId });
```

### Ejemplo (C#)
```csharp
using Microsoft.Extensions.Logging;
logger.LogInformation("Usuario creado: {UserId}", userId);
```

---

## Métricas
- Datos numéricos sobre el rendimiento (CPU, memoria, peticiones por segundo).

### Ejemplo (TypeScript)
```typescript
const start = Date.now();
// ...
const duration = Date.now() - start;
console.log('Duración de la petición:', duration);
```

### Ejemplo (C#)
```csharp
var stopwatch = System.Diagnostics.Stopwatch.StartNew();
// ...
stopwatch.Stop();
Console.WriteLine($"Duración: {stopwatch.ElapsedMilliseconds}ms");
```

---

## Tracing
- Seguimiento de una petición a través de múltiples servicios.
- Útil para microservicios y detectar cuellos de botella.

### Ejemplo (pseudocódigo)
```typescript
// Asigna un traceId a cada petición y propágalo entre servicios
const traceId = uuid();
log({ traceId, evento: 'inicio' });
// ...
log({ traceId, evento: 'fin' });
```

---

## Alertas
- Notificaciones automáticas ante errores o métricas anómalas.
- Se configuran en herramientas de monitoreo (ej: Prometheus, Grafana, Azure Monitor).

### Ejemplo
- Si el tiempo de respuesta > 2s, enviar alerta a Slack.
