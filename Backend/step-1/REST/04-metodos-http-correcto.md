# Métodos HTTP Correcto

## 📌 Recordatorio: Métodos HTTP

En REST, cada **método HTTP** tiene un propósito específico:

```
GET    → Obtener (lectura, seguro)
POST   → Crear (crea nuevo)
PUT    → Reemplazar (actualiza completo)
PATCH  → Modificar (actualiza parcial)
DELETE → Eliminar
```

---

## 🎯 GET - Obtener Recurso

### Uso Correcto

```
GET /api/v1/usuarios              → Listar todos
GET /api/v1/usuarios/123          → Obtener uno
GET /api/v1/usuarios?rol=admin    → Filtrar
```

### Características

| Propiedad | Valor |
|-----------|-------|
| **Seguro** | ✅ Sí (no modifica) |
| **Idempotente** | ✅ Sí (mismo resultado) |
| **Body** | ❌ No |
| **Caché** | ✅ Sí |
| **Código típico** | 200 OK |

### C# Ejemplo

```csharp
// Listar todos
app.MapGet("/api/v1/usuarios", () =>
{
    var usuarios = db.usuarios.ObtenerTodos();
    return Results.Ok(usuarios); // 200 OK
});

// Obtener individual
app.MapGet("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null)
        return Results.NotFound(); // 404 Not Found
    
    return Results.Ok(usuario); // 200 OK
});

// Con filtros
app.MapGet("/api/v1/usuarios", (string rol = null, int pagina = 1) =>
{
    var query = db.usuarios.ObtenerTodos();
    
    if (!string.IsNullOrEmpty(rol))
        query = query.Where(u => u.Rol == rol);
    
    var skip = (pagina - 1) * 10;
    var usuarios = query.Skip(skip).Take(10).ToList();
    
    return Results.Ok(usuarios);
});
```

### Node.js Ejemplo

```javascript
// Listar todos
app.get('/api/v1/usuarios', (req, res) => {
    const usuarios = db.usuarios.getAll();
    res.json(usuarios); // 200 OK
});

// Obtener individual
app.get('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    res.json(usuario); // 200 OK
});

// Con filtros
app.get('/api/v1/usuarios', (req, res) => {
    let usuarios = db.usuarios.getAll();
    
    if (req.query.rol) {
        usuarios = usuarios.filter(u => u.rol === req.query.rol);
    }
    
    res.json(usuarios);
});
```

---

## ➕ POST - Crear Recurso

### Uso Correcto

```
POST /api/v1/usuarios              → Crear usuario
POST /api/v1/usuarios/1/ordenes    → Crear orden para usuario
```

### Características

| Propiedad | Valor |
|-----------|-------|
| **Seguro** | ❌ No (modifica) |
| **Idempotente** | ❌ No (crea cada vez) |
| **Body** | ✅ Sí |
| **Caché** | ❌ No |
| **Código típico** | 201 Created |

### C# Ejemplo

```csharp
app.MapPost("/api/v1/usuarios", (UsuarioRequest req) =>
{
    // Validar
    if (string.IsNullOrEmpty(req.Nombre))
        return Results.BadRequest("Nombre requerido");
    
    // Crear
    var usuario = new Usuario { Nombre = req.Nombre, Email = req.Email };
    db.usuarios.Agregar(usuario);
    
    // Devolver con ubicación
    return Results.Created(
        $"/api/v1/usuarios/{usuario.Id}", 
        usuario  // 201 Created
    );
});

record UsuarioRequest(string Nombre, string Email);
```

### Node.js Ejemplo

```javascript
app.post('/api/v1/usuarios', (req, res) => {
    // Validar
    if (!req.body.nombre) {
        return res.status(400).json({ error: 'Nombre requerido' });
    }
    
    // Crear
    const usuario = { id: 1, ...req.body };
    db.usuarios.create(usuario);
    
    // Devolver con ubicación
    res.status(201)  // 201 Created
       .location(`/api/v1/usuarios/${usuario.id}`)
       .json(usuario);
});
```

### ⚠️ Problema: No es Idempotente

```javascript
// Problema: Múltiples POST = múltiples creaciones
POST /api/v1/usuarios {"nombre": "Juan"}  → Crea usuario 1
POST /api/v1/usuarios {"nombre": "Juan"}  → Crea usuario 2 (DUPLICADO!)

// Solución: Usar Idempotency-Key (ver capítulo anterior)
POST /api/v1/usuarios
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
{"nombre": "Juan"}
```

---

## 🔄 PUT - Reemplazar Completo

### Uso Correcto

```
PUT /api/v1/usuarios/123           → Reemplazar usuario 123 completo
```

### Características

| Propiedad | Valor |
|-----------|-------|
| **Seguro** | ❌ No (modifica) |
| **Idempotente** | ✅ Sí (mismo resultado) |
| **Body** | ✅ Sí |
| **Caché** | ❌ No |
| **Código típico** | 200 OK |

### Importante: PUT Reemplaza TODO

```json
// Estado original
{
  "id": 123,
  "nombre": "Juan",
  "email": "juan@ejemplo.com",
  "edad": 30,
  "rol": "usuario"
}

// PUT request (reemplaza TODO)
PUT /api/v1/usuarios/123
{
  "nombre": "Juan García",
  "email": "juan.garcia@ejemplo.com",
  "edad": 31
}

// Resultado después de PUT
{
  "id": 123,
  "nombre": "Juan García",
  "email": "juan.garcia@ejemplo.com",
  "edad": 31,
  "rol": null  // ⚠️ Se borra porque no se envió
}
```

### C# Ejemplo

```csharp
app.MapPut("/api/v1/usuarios/{id}", (int id, UsuarioRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null)
        return Results.NotFound(); // 404
    
    // Reemplazar TODO
    usuario.Nombre = req.Nombre;
    usuario.Email = req.Email;
    usuario.Edad = req.Edad;
    usuario.Rol = req.Rol;
    
    db.usuarios.Actualizar(usuario);
    
    return Results.Ok(usuario); // 200 OK
});

record UsuarioRequest(string Nombre, string Email, int Edad, string Rol);
```

### Node.js Ejemplo

```javascript
app.put('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    // Reemplazar TODO (no actualizar parcialmente)
    const usuarioActualizado = {
        id: usuario.id,
        nombre: req.body.nombre,
        email: req.body.email,
        edad: req.body.edad,
        rol: req.body.rol
    };
    
    db.usuarios.update(req.params.id, usuarioActualizado);
    
    res.json(usuarioActualizado); // 200 OK
});
```

---

## 🔧 PATCH - Actualizar Parcial

### Uso Correcto

```
PATCH /api/v1/usuarios/123         → Actualizar solo algunos campos
```

### Características

| Propiedad | Valor |
|-----------|-------|
| **Seguro** | ❌ No (modifica) |
| **Idempotente** | ✅ Sí (mismo resultado) |
| **Body** | ✅ Sí |
| **Caché** | ❌ No |
| **Código típico** | 200 OK |

### Importante: PATCH Actualiza Parcialmente

```json
// Estado original
{
  "id": 123,
  "nombre": "Juan",
  "email": "juan@ejemplo.com",
  "edad": 30,
  "rol": "usuario"
}

// PATCH request (solo actualiza lo enviado)
PATCH /api/v1/usuarios/123
{
  "nombre": "Juan García"
}

// Resultado después de PATCH
{
  "id": 123,
  "nombre": "Juan García",      // ✅ Actualizado
  "email": "juan@ejemplo.com",  // ✅ Se conserva
  "edad": 30,                   // ✅ Se conserva
  "rol": "usuario"              // ✅ Se conserva
}
```

### C# Ejemplo

```csharp
app.MapPatch("/api/v1/usuarios/{id}", (int id, UsuarioPatchRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null)
        return Results.NotFound();
    
    // Actualizar SOLO los campos proporcionados
    if (!string.IsNullOrEmpty(req.Nombre))
        usuario.Nombre = req.Nombre;
    
    if (!string.IsNullOrEmpty(req.Email))
        usuario.Email = req.Email;
    
    if (req.Edad.HasValue)
        usuario.Edad = req.Edad.Value;
    
    // Campos no proporcionados se conservan
    
    db.usuarios.Actualizar(usuario);
    
    return Results.Ok(usuario); // 200 OK
});

record UsuarioPatchRequest(string Nombre, string Email, int? Edad);
```

### Node.js Ejemplo

```javascript
app.patch('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    // Actualizar SOLO los campos proporcionados
    if (req.body.nombre) usuario.nombre = req.body.nombre;
    if (req.body.email) usuario.email = req.body.email;
    if (req.body.edad) usuario.edad = req.body.edad;
    
    db.usuarios.update(req.params.id, usuario);
    
    res.json(usuario); // 200 OK
});
```

---

## 🗑️ DELETE - Eliminar Recurso

### Uso Correcto

```
DELETE /api/v1/usuarios/123        → Eliminar usuario 123
```

### Características

| Propiedad | Valor |
|-----------|-------|
| **Seguro** | ❌ No (modifica) |
| **Idempotente** | ✅ Sí (mismo resultado) |
| **Body** | ❌ No |
| **Caché** | ❌ No |
| **Código típico** | 204 No Content |

### C# Ejemplo

```csharp
app.MapDelete("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null)
        return Results.NotFound(); // 404
    
    db.usuarios.Eliminar(id);
    
    return Results.NoContent(); // 204 No Content
});

// Alternativa: con respuesta
app.MapDelete("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null)
        return Results.NotFound();
    
    db.usuarios.Eliminar(id);
    
    return Results.Ok(new { mensaje = "Eliminado" }); // 200 OK
});
```

### Node.js Ejemplo

```javascript
app.delete('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    db.usuarios.delete(req.params.id);
    
    res.sendStatus(204); // 204 No Content
});

// Alternativa: con respuesta
app.delete('/api/v1/usuarios/:id', (req, res) => {
    db.usuarios.delete(req.params.id);
    res.json({ mensaje: 'Eliminado' });
});
```

---

## 📊 PUT vs PATCH

| Aspecto | PUT | PATCH |
|--------|-----|-------|
| **Reemplaza** | TODO | PARCIAL |
| **Idempotente** | ✅ Sí | ✅ Sí |
| **Campos omitidos** | Se eliminan | Se conservan |
| **Uso típico** | Actualización completa | Cambio rápido |

### Ejemplo Comparativo

```
Estado original: { nombre: "Juan", email: "juan@ejemplo.com", edad: 30 }

PUT /usuarios/1
{ "nombre": "María", "email": "maria@ejemplo.com", "edad": 25 }
Resultado: { nombre: "María", email: "maria@ejemplo.com", edad: 25 }
(Completo)

PATCH /usuarios/1
{ "nombre": "María" }
Resultado: { nombre: "María", email: "juan@ejemplo.com", edad: 30 }
(Solo cambió nombre)
```

---

## 🚫 Errores Comunes

### ❌ POST para Actualizar

```javascript
// MAL
POST /api/v1/usuarios/123
{ "nombre": "Juan García" }

// La operación no es idempotente
// Cada POST puede crear algo nuevo
```

**Correcto:** Usar PUT o PATCH

---

### ❌ GET para Crear

```javascript
// MAL
GET /api/v1/usuarios/crear?nombre=Juan&email=juan@ejemplo.com

// GET no debe modificar datos
```

**Correcto:** Usar POST

---

### ❌ PUT sin Validar Todos los Campos

```javascript
// MAL
app.put('/usuarios/:id', (req, res) => {
    let usuario = db.getById(req.params.id);
    usuario.nombre = req.body.nombre; // ¿Y otros campos?
    db.save(usuario);
    res.json(usuario);
});

// El cliente no sabe si otros campos se borraron
```

**Correcto:** Documentar claramente o requerir todos los campos

---

## 📋 Checklist de Métodos HTTP

Antes de crear un endpoint:

- ✅ ¿Es una **lectura**? → GET
- ✅ ¿Es una **creación**? → POST
- ✅ ¿Actualizo **TODO**? → PUT
- ✅ ¿Actualizo **parcialmente**? → PATCH
- ✅ ¿Es un **eliminar**? → DELETE
- ✅ ¿Devuelvo el **código correcto**?
- ✅ ¿Es **idempotente** si es necesario?

---

## 💡 Resumen Rápido

| Método | Para | Idempotente | Código |
|--------|------|-------------|--------|
| GET | Obtener | ✅ | 200 |
| POST | Crear | ❌ | 201 |
| PUT | Reemplazar | ✅ | 200 |
| PATCH | Parcial | ✅ | 200 |
| DELETE | Eliminar | ✅ | 204 |

---

## 🔗 Próximo Paso

Continúa con [Versionado de APIs](05-versionado-apis.md) para gestionar cambios en tu API.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
