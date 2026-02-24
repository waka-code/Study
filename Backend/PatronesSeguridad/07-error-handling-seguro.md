# Error handling seguro (Fail Securely)

Nunca reveles información sensible en errores. Maneja los fallos de forma segura.

**Ejemplo Express:**
```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error interno');
});
```

**Ejemplo ASP.NET Core:**
```csharp
app.UseExceptionHandler(errorApp => {
  errorApp.Run(async context => {
    // Log interno
    context.Response.StatusCode = 500;
    await context.Response.WriteAsync("Error interno");
  });
});
```
