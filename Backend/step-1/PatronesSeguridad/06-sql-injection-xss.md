# SQL Injection & XSS (cómo prevenirlos)

## SQL Injection
Evita concatenar strings para consultas. Usa parámetros.

**Ejemplo C#:**
```csharp
var cmd = new SqlCommand("SELECT * FROM Users WHERE Name = @name", conn);
cmd.Parameters.AddWithValue("@name", nombre);
```

## XSS
Escapa y valida todo input que se renderiza en HTML.

**Ejemplo Express:**
```js
res.send(escape(userInput));
```

Para evitar SQL Injection:

Usa consultas parametrizadas/preparadas (no concatenes strings).
Valida y sanitiza el input del usuario.
Utiliza ORM (Entity Framework, Sequelize) que internamente parametriza consultas.

Para evitar XSS:
Escapa y valida todo input que se renderiza en HTML.
Usa funciones de escape (como escape() en Node.js).
Nunca insertes datos del usuario directamente en el DOM sin sanitizar.