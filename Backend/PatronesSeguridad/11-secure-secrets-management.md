# Secure Secrets Management

Nunca guardes secretos en código. Usa variables de entorno o servicios de gestión de secretos.

**Ejemplo Node.js:**
```js
const dbPassword = process.env.DB_PASSWORD;
```

**Ejemplo Azure Key Vault:**
```csharp
// Recuperar secreto
var secret = keyVaultClient.GetSecretAsync(...);
```
