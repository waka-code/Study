# Hashing de contraseñas

El hashing es el proceso de transformar una contraseña en una cadena irreconocible mediante algoritmos como bcrypt, Argon2 o SHA-256. El objetivo es que, aunque se acceda a la base de datos, las contraseñas no sean legibles.

- Nunca almacenes contraseñas en texto plano.
- Usa algoritmos de hashing seguros y, preferentemente, con sal.

**Ejemplo en Node.js (bcrypt):**
```js
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('miPassword', 10);
```

**Ejemplo en C# (ASP.NET Core):**
```csharp
var hash = BCrypt.Net.BCrypt.HashPassword("miPassword");
```
