# Input Validation & Sanitization

Valida y limpia todos los datos recibidos del usuario para evitar ataques.

**Ejemplo Express:**
```js
const { body, validationResult } = require('express-validator');
app.post('/user', [
  body('email').isEmail(),
  body('name').trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  // ...
});
```
