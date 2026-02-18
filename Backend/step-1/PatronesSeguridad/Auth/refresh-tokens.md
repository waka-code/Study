# Refresh Tokens

Un refresh token es un token de larga duración que permite obtener nuevos access tokens sin volver a autenticarse. Se usa para mantener sesiones seguras y renovables.

**Flujo típico:**
1. Usuario inicia sesión y recibe access token + refresh token.
2. Cuando el access token expira, el cliente usa el refresh token para obtener uno nuevo.

**Ejemplo en Node.js:**
```js
// Al autenticar
const refreshToken = generarRefreshToken(user);
// Endpoint para renovar
app.post('/refresh', (req, res) => {
  // Validar refresh token y emitir nuevo access token
});
```
