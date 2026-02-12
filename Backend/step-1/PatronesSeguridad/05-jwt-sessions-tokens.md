# JWT / Sessions / Tokens

Tokens permiten autenticación y autorización sin guardar estado en el servidor.

**Ejemplo JWT:**
```js
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 1 }, 'secreto', { expiresIn: '1h' });
```

**Ejemplo ASP.NET Core:**
```csharp
var token = new JwtSecurityToken(...);
```
