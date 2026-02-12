# Authentication vs Authorization

**Autenticación:** Verifica la identidad del usuario (¿quién eres?).
> Normalmente, en aplicaciones modernas, la autenticación se realiza mediante JWT (JSON Web Token), que permite validar la identidad del usuario de forma segura y sin mantener estado en el servidor.
> Herramientas comunes para autenticación: JWT, OAuth2, Identity Server, cookies.
**Autorización:** Verifica qué acciones puede realizar el usuario (¿qué puedes hacer?).
> La autorización se realiza mediante roles, claims, políticas, listas de permisos o scopes definidos en el sistema.

**Ejemplo:**
- Login = autenticación
- Acceso a recurso restringido = autorización

```csharp
// ASP.NET Core
[Authorize(Roles = "Admin")]
public IActionResult AdminOnly() { ... }
```

```js
// Express
app.use((req, res, next) => {
  if (!req.user) return res.status(401).send('No autenticado');
  if (!req.user.isAdmin) return res.status(403).send('No autorizado');
  next();
});
```
