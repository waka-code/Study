# CORS vs CSP

## CORS
Controla qué dominios pueden acceder a tu API.

**Ejemplo Express:**
```js
const cors = require('cors');
app.use(cors({ origin: 'https://dominio.com' }));
```

## CSP
Define qué recursos pueden cargarse en tu web.

**Ejemplo Express:**
```js
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```
