# Rate Limiting

Limita el número de peticiones por usuario/IP para evitar abusos.

**Ejemplo Express:**
```js
const rateLimit = require('express-rate-limit');
app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 100 }));
```
