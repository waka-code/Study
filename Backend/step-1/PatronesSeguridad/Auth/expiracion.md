# Expiración de Tokens

La expiración define cuánto tiempo es válido un token. Es clave para limitar el riesgo en caso de robo o filtración.

**Ejemplo:**
- Access token: 15 minutos
- Refresh token: 7 días

**Ejemplo en JWT:**
```js
const token = jwt.sign(payload, secret, { expiresIn: '15m' });
```

> Siempre define expiración corta para access tokens y más larga para refresh tokens.
