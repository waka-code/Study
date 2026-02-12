# Qué es un middleware

Un middleware es un componente que intercepta las peticiones HTTP en el pipeline de una aplicación web. Permite ejecutar lógica antes o después de que la petición llegue al controlador, como autenticación, logging, manejo de errores, etc.

**Ejemplo Express:**
```js
function ejemplo(req, res, next) {
  // lógica
  next();
}
```

**Ejemplo ASP.NET Core:**
```csharp
public class EjemploMiddleware {
    private readonly RequestDelegate _next;
    public EjemploMiddleware(RequestDelegate next) {
        _next = next;
    }
    public async Task InvokeAsync(HttpContext context) {
        // lógica
        await _next(context);
    }
}
```
