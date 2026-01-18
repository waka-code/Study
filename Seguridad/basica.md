# Seguridad Básica Obligatoria

## HTTPS
- Protocolo seguro para cifrar la comunicación entre cliente y servidor.
- Protege contra ataques de intermediarios (man-in-the-middle).

### Ejemplo
- Acceso seguro: `https://tusitio.com`

---

## JWT (JSON Web Token)
- Estándar para autenticación basada en tokens.
- El servidor genera un token firmado que el cliente usa en cada petición.

### Ejemplo (Node.js)
```js
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 1 }, 'secreto', { expiresIn: '1h' });
```

---

## OAuth2
- Protocolo para autorización delegada (ej: "Inicia sesión con Google").
- Permite a apps acceder a recursos de usuario sin compartir credenciales.

---

## Roles & permisos
- Define qué puede hacer cada usuario según su rol (admin, user, etc).

### Ejemplo
```js
if (user.role === 'admin') {
  // Permitir acceso
}
```

---

## Rate limiting
- Limita la cantidad de peticiones que un usuario puede hacer en un periodo de tiempo.
- Protege contra ataques de denegación de servicio (DoS).

### Ejemplo (Express.js)
```js
const rateLimit = require('express-rate-limit');
app.use(rateLimit({ windowMs: 60000, max: 100 }));
```

### ¿Cómo implementarlo y buenas prácticas?
- Usa librerías probadas para rate limiting (ej: express-rate-limit, nginx limit_req).
- Aplica límites por IP, usuario o API key según el caso.
- Devuelve un código HTTP 429 (Too Many Requests) cuando se supera el límite.
- Ajusta los límites según la criticidad de la ruta (más estricto en login, más laxo en recursos públicos).
- Monitorea y ajusta los límites según el tráfico real.
