# CSRF Protection

Protege contra ataques de falsificación de solicitudes cruzadas.

**Ejemplo Express:**
```js
const csrf = require('csurf');
app.use(csrf());
```
