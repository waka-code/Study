# Logging básico con middleware

## Express
```js
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
```

## ASP.NET Core
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
