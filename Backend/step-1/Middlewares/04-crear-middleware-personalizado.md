# Crear middleware personalizado

## Express
```js
function tiempoMiddleware(req, res, next) {
  req.requestTime = Date.now();
  next();
}
app.use(tiempoMiddleware);
```

## ASP.NET Core
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
