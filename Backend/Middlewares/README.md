# Middlewares & Pipeline HTTP

## Qué es un middleware

Un middleware es un componente de software que se ejecuta en la cadena de procesamiento de una petición HTTP. Su función principal es interceptar, modificar o actuar sobre la solicitud y/o respuesta antes de que llegue al controlador final o después de que salga de él. Los middlewares permiten implementar funcionalidades transversales como autenticación, logging, manejo de errores, etc.

**Ejemplo en Node.js (Express):**
```js
function miMiddleware(req, res, next) {
  console.log('Petición recibida:', req.method, req.url);
  next(); // Continúa al siguiente middleware
}
app.use(miMiddleware);
```

**Ejemplo en C# (ASP.NET Core):**
```csharp
public class MiMiddleware {
    private readonly RequestDelegate _next;
    public MiMiddleware(RequestDelegate next) {
        _next = next;
    }
    public async Task InvokeAsync(HttpContext context) {
        Console.WriteLine($"Petición: {context.Request.Method} {context.Request.Path}");
        await _next(context);
    }
}
```

## Orden del pipeline

El pipeline de middlewares es la secuencia en la que se ejecutan los middlewares registrados en la aplicación. El orden es importante porque cada middleware puede decidir si continúa la cadena (`next()` en Express, `await _next(context)` en ASP.NET Core) o termina la respuesta.

- El primer middleware registrado es el primero en ejecutarse.
- El último puede ser el que envía la respuesta final.
- El flujo puede ser interrumpido si un middleware no llama a `next()`.

**Visualización del pipeline:**
```
[Request] → [Middleware 1] → [Middleware 2] → ... → [Controller] → [Middleware N] → [Response]
```

## Middlewares integrados

### Routing
- Determina a qué controlador o endpoint se debe enviar la petición.
- En Express: `app.use('/ruta', router)`
- En ASP.NET Core: `app.UseRouting()`

### Authorization
- Verifica permisos y autenticación antes de permitir el acceso a recursos.
- En Express: se puede usar librerías como `passport` o middlewares personalizados.
- En ASP.NET Core: `app.UseAuthorization()`

### Exception Handling
- Captura y maneja errores que ocurren en el pipeline.
- En Express: middleware con 4 parámetros (`err, req, res, next`).
- En ASP.NET Core: `app.UseExceptionHandler()`

## Crear middleware personalizado

**Node.js (Express):**
```js
function tiempoMiddleware(req, res, next) {
  req.requestTime = Date.now();
  next();
}
app.use(tiempoMiddleware);
```

**C# (ASP.NET Core):**
```csharp
public class TiempoMiddleware {
    private readonly RequestDelegate _next;
    public TiempoMiddleware(RequestDelegate next) {
        _next = next;
    }
    public async Task InvokeAsync(HttpContext context) {
        context.Items["RequestTime"] = DateTime.UtcNow;
        await _next(context);
    }
}
```

## Logging básico con middleware

**Node.js (Express):**
```js
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
```

**C# (ASP.NET Core):**
```csharp
public class LoggingMiddleware {
    private readonly RequestDelegate _next;
    public LoggingMiddleware(RequestDelegate next) {
        _next = next;
    }
    public async Task InvokeAsync(HttpContext context) {
        Console.WriteLine($"[{DateTime.UtcNow}] {context.Request.Method} {context.Request.Path}");
        await _next(context);
    }
}
```

---

> Los middlewares son esenciales para la arquitectura de aplicaciones web modernas, permitiendo modularidad, reutilización y separación de responsabilidades en el manejo de peticiones HTTP.