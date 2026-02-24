# Auth Middleware

Un auth middleware es una función que intercepta las peticiones HTTP para verificar la autenticación del usuario antes de permitir el acceso a rutas protegidas.

**Ejemplo en Express:**
```js
function authMiddleware(req, res, next) {
  if (!req.user) return res.status(401).send('No autenticado');
  next();
}
app.use('/api/privado', authMiddleware);
```

> Es la base de la seguridad en APIs y aplicaciones web.
