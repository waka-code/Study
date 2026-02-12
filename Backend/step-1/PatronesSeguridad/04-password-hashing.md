# Password Hashing

Nunca almacenes contraseñas en texto plano. Usa algoritmos de hashing seguros (bcrypt, Argon2).

**Ejemplo Node.js:**
```js
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('miPassword', 10);
```

**Ejemplo C#:**
```csharp
var hash = BCrypt.Net.BCrypt.HashPassword("miPassword");
```
