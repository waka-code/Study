# Middlewares integrados

## Routing
- Determina el destino de la petición.
- Express: `app.use('/ruta', router)`
- ASP.NET Core: `app.UseRouting()`

## Authorization
- Verifica permisos y autenticación.
- Express: librerías como `passport` o middlewares personalizados.
- ASP.NET Core: `app.UseAuthorization()`

## Exception Handling
- Captura y maneja errores.
- Express: middleware con 4 parámetros (`err, req, res, next`).
- ASP.NET Core: `app.UseExceptionHandler()`
