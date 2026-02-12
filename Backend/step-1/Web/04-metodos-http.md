# Métodos HTTP

## 📌 ¿Qué son los Métodos HTTP?

Los métodos HTTP definen **qué acción** queremos realizar sobre un recurso en el servidor. Cada método tiene un propósito específico y convenciones establecidas.

```
GET    → Obtener       (lectura, seguro)
POST   → Crear         (crea nuevo recurso)
PUT    → Reemplazar    (actualiza completo)
PATCH  → Modificar     (actualiza parcial)
DELETE → Eliminar      (borra)
```

## 🔍 GET - Obtener Recurso

### Definición
Solicita obtener un recurso. Es **seguro** (no modifica datos) e **idempotente** (múltiples llamadas = mismo resultado).

### Características
- ✅ Sin body en la request
- ✅ Parámetros en la URL (query string)
- ✅ Cacheable (almacenable)
- ✅ Seguro (no modifica datos)
- ✅ Idempotente

### Ejemplo: GET en C#

```csharp
// Cliente C#
using System.Net.Http;
using System.Threading.Tasks;

var cliente = new HttpClient();
var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios/123");
var contenido = await response.Content.ReadAsStringAsync();
Console.WriteLine(contenido);

// Servidor C# (ASP.NET Core)
app.MapGet("/usuarios/{id}", (int id) =>
{
    var usuario = new { id = id, nombre = "Juan", email = "juan@ejemplo.com" };
    return Results.Ok(usuario); // 200 OK
});
```

### Ejemplo: GET en Node.js

```javascript
// Cliente Node.js
const axios = require('axios');

async function obtenerUsuario() {
    try {
        const response = await axios.get('http://localhost:3000/usuarios/123');
        console.log(response.data);
    } catch (error) {
        console.error(error);
    }
}

// Servidor Express
app.get('/usuarios/:id', (req, res) => {
    const usuario = { id: req.params.id, nombre: 'Juan', email: 'juan@ejemplo.com' };
    res.json(usuario); // 200 OK
});
```

### Request HTTP Real

```http
GET /usuarios/123 HTTP/1.1
Host: api.ejemplo.com
Accept: application/json

```

### Response HTTP Real

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 60

{"id": 123, "nombre": "Juan", "email": "juan@ejemplo.com"}
```

### Casos de Uso

```
✅ Obtener lista de usuarios      GET /usuarios
✅ Obtener un usuario específico  GET /usuarios/123
✅ Filtrar recursos               GET /usuarios?rol=admin&edad=30
✅ Descargar archivos             GET /descargas/documento.pdf
```

---

## ➕ POST - Crear Recurso

### Definición
Solicita crear un nuevo recurso. **No es idempotente** (múltiples llamadas crean múltiples recursos).

### Características
- ✅ Con body en la request
- ✅ Generalmente devuelve 201 Created
- ✅ No seguro (modifica datos)
- ✅ No idempotente
- ✅ No cacheable directamente

### Ejemplo: POST en C#

```csharp
// Cliente C#
using System.Net.Http;
using System.Text.Json;

var usuario = new { nombre = "Juan", email = "juan@ejemplo.com" };
var json = JsonSerializer.Serialize(usuario);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

var response = await cliente.PostAsync("https://api.ejemplo.com/usuarios", contenido);
var respuestaJson = await response.Content.ReadAsStringAsync();
Console.WriteLine($"Status: {response.StatusCode}");
Console.WriteLine($"Response: {respuestaJson}");

// Servidor C# (ASP.NET Core)
app.MapPost("/usuarios", async (UsuarioCrearRequest req) =>
{
    // Validar
    if (string.IsNullOrEmpty(req.Nombre)) 
        return Results.BadRequest("Nombre requerido");
    
    // Crear
    var usuarioCreado = new { id = 1, nombre = req.Nombre, email = req.Email };
    
    // Devolver 201 Created con la ubicación
    return Results.Created($"/usuarios/1", usuarioCreado);
});

record UsuarioCrearRequest(string Nombre, string Email);
```

### Ejemplo: POST en Node.js

```javascript
// Cliente Node.js
const axios = require('axios');

async function crearUsuario() {
    try {
        const nuevoUsuario = { nombre: 'Juan', email: 'juan@ejemplo.com' };
        
        const response = await axios.post(
            'http://localhost:3000/usuarios',
            nuevoUsuario,
            { headers: { 'Content-Type': 'application/json' } }
        );
        
        console.log('Creado:', response.data);
        console.log('Status:', response.status); // 201
    } catch (error) {
        console.error(error);
    }
}

// Servidor Express
app.post('/usuarios', (req, res) => {
    const { nombre, email } = req.body;
    
    // Validar
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    
    // Simular guardar en BD
    const nuevoUsuario = { id: 1, nombre, email };
    
    // Devolver 201 Created
    res.status(201)
       .location(`/usuarios/1`)
       .json(nuevoUsuario);
});
```

### Request HTTP Real

```http
POST /usuarios HTTP/1.1
Host: api.ejemplo.com
Content-Type: application/json
Content-Length: 45

{"nombre": "Juan", "email": "juan@ejemplo.com"}
```

### Response HTTP Real

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /usuarios/1
Content-Length: 68

{"id": 1, "nombre": "Juan", "email": "juan@ejemplo.com"}
```

### ⚠️ Problema: No Idempotencia

```
Llamada 1: POST /usuarios {"nombre": "Juan"} → Crea usuario 1
Llamada 2: POST /usuarios {"nombre": "Juan"} → Crea usuario 2 (DUPLICADO!)
Llamada 3: POST /usuarios {"nombre": "Juan"} → Crea usuario 3 (DUPLICADO!)
```

---

## 🔄 PUT - Reemplazar Recurso Completo

### Definición
Reemplaza **completo** un recurso existente. Es **idempotente** (múltiples llamadas = mismo resultado).

### Características
- ✅ Con body en la request
- ✅ Reemplaza TODO el recurso
- ✅ Si no existe, puede crear (201) o error (404)
- ✅ Idempotente
- ✅ No seguro (modifica datos)

### Ejemplo: PUT en C#

```csharp
// Cliente C#
var usuarioActualizado = new { nombre = "Juan García", email = "juan.garcia@ejemplo.com" };
var json = JsonSerializer.Serialize(usuarioActualizado);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

var response = await cliente.PutAsync("https://api.ejemplo.com/usuarios/123", contenido);
Console.WriteLine($"Status: {response.StatusCode}"); // 200 OK

// Servidor C# (ASP.NET Core)
app.MapPut("/usuarios/{id}", (int id, UsuarioActualizarRequest req) =>
{
    // Verificar que existe
    var usuarioExistente = db.usuarios.ObtenerPorId(id);
    if (usuarioExistente == null)
        return Results.NotFound($"Usuario {id} no encontrado");
    
    // Reemplazar completamente
    usuarioExistente.Nombre = req.Nombre;
    usuarioExistente.Email = req.Email;
    db.usuarios.Guardar(usuarioExistente);
    
    return Results.Ok(usuarioExistente);
});

record UsuarioActualizarRequest(string Nombre, string Email);
```

### Ejemplo: PUT en Node.js

```javascript
// Cliente Node.js
const usuarioActualizado = { nombre: 'Juan García', email: 'juan.garcia@ejemplo.com' };

const response = await axios.put(
    'http://localhost:3000/usuarios/123',
    usuarioActualizado
);

console.log('Actualizado:', response.data);

// Servidor Express
app.put('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, email } = req.body;
    
    const usuario = db.usuarios.findById(id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    // Reemplazar completo
    usuario.nombre = nombre;
    usuario.email = email;
    db.usuarios.save(usuario);
    
    res.json(usuario); // 200 OK
});
```

### Request HTTP Real

```http
PUT /usuarios/123 HTTP/1.1
Host: api.ejemplo.com
Content-Type: application/json

{"nombre": "Juan García", "email": "juan.garcia@ejemplo.com"}
```

### Response HTTP Real

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"id": 123, "nombre": "Juan García", "email": "juan.garcia@ejemplo.com"}
```

### ✅ Ventaja: Idempotencia

```
Llamada 1: PUT /usuarios/1 {"nombre": "Juan"} → Actualiza usuario 1
Llamada 2: PUT /usuarios/1 {"nombre": "Juan"} → Actualiza igual (mismo resultado)
Llamada 3: PUT /usuarios/1 {"nombre": "Juan"} → Actualiza igual (mismo resultado)
```

---

## 🔧 PATCH - Actualizar Parcialmente

### Definición
Actualiza **parcialmente** un recurso (solo los campos proporcionados). Es **idempotente**.

### Características
- ✅ Con body en la request
- ✅ Actualiza SOLO los campos enviados
- ✅ Otros campos se conservan
- ✅ Idempotente
- ✅ No seguro (modifica datos)

### Diferencia PUT vs PATCH

```
PUT /usuarios/123
{
    "nombre": "Juan",
    "email": "juan@ejemplo.com"
    // ⚠️ Debe incluir TODOS los campos
}

PATCH /usuarios/123
{
    "nombre": "Juan"
    // ✅ Solo actualiza el nombre
    // ✅ El email se conserva
}
```

### Ejemplo: PATCH en C#

```csharp
// Cliente C#
var actualizacion = new { nombre = "Juan García" }; // Solo nombre
var json = JsonSerializer.Serialize(actualizacion);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

// PATCH es un método personalizado
var request = new HttpRequestMessage(HttpMethod.Patch, "https://api.ejemplo.com/usuarios/123");
request.Content = contenido;
var response = await cliente.SendAsync(request);

// Servidor C# (ASP.NET Core)
app.MapMethods("/usuarios/{id}", new[] { "PATCH" }, (int id, UsuarioPatchRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null) return Results.NotFound();
    
    // Actualizar solo campos proporcionados
    if (!string.IsNullOrEmpty(req.Nombre))
        usuario.Nombre = req.Nombre;
    
    if (!string.IsNullOrEmpty(req.Email))
        usuario.Email = req.Email;
    
    db.usuarios.Guardar(usuario);
    return Results.Ok(usuario);
});

record UsuarioPatchRequest(string? Nombre, string? Email);
```

### Ejemplo: PATCH en Node.js

```javascript
// Cliente Node.js
const actualizacion = { nombre: 'Juan García' }; // Solo nombre

const response = await axios.patch(
    'http://localhost:3000/usuarios/123',
    actualizacion
);

console.log('Actualizado:', response.data);

// Servidor Express
app.patch('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    
    const usuario = db.usuarios.findById(id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    // Actualizar solo campos proporcionados
    if (req.body.nombre) usuario.nombre = req.body.nombre;
    if (req.body.email) usuario.email = req.body.email;
    
    db.usuarios.save(usuario);
    res.json(usuario); // 200 OK
});
```

### Request HTTP Real

```http
PATCH /usuarios/123 HTTP/1.1
Host: api.ejemplo.com
Content-Type: application/json

{"nombre": "Juan García"}
```

---

## 🗑️ DELETE - Eliminar Recurso

### Definición
Elimina un recurso existente. Es **idempotente** (múltiples llamadas = mismo resultado).

### Características
- ✅ Sin body (generalmente)
- ✅ Devuelve 204 No Content o 200 OK
- ✅ Idempotente
- ✅ No seguro (modifica datos)

### Ejemplo: DELETE en C#

```csharp
// Cliente C#
var response = await cliente.DeleteAsync("https://api.ejemplo.com/usuarios/123");
Console.WriteLine($"Status: {response.StatusCode}"); // 204 No Content

// Servidor C# (ASP.NET Core)
app.MapDelete("/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null)
        return Results.NotFound($"Usuario {id} no encontrado");
    
    db.usuarios.Eliminar(id);
    return Results.NoContent(); // 204 No Content
});
```

### Ejemplo: DELETE en Node.js

```javascript
// Cliente Node.js
const response = await axios.delete('http://localhost:3000/usuarios/123');
console.log('Status:', response.status); // 204

// Servidor Express
app.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    
    const usuario = db.usuarios.findById(id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    db.usuarios.delete(id);
    res.sendStatus(204); // 204 No Content
});
```

### Request HTTP Real

```http
DELETE /usuarios/123 HTTP/1.1
Host: api.ejemplo.com

```

### Response HTTP Real

```http
HTTP/1.1 204 No Content

```

### ✅ Ventaja: Idempotencia

```
Llamada 1: DELETE /usuarios/1 → Elimina usuario 1
Llamada 2: DELETE /usuarios/1 → Ya está eliminado (mismo resultado)
Llamada 3: DELETE /usuarios/1 → Ya está eliminado (mismo resultado)
```

---

## 📊 Comparativa de Métodos HTTP

| Método | Propósito | Body | Idempotente | Seguro | Status Típico |
|--------|-----------|------|-------------|--------|--------------|
| GET | Obtener | No | ✅ Sí | ✅ Sí | 200 |
| POST | Crear | Sí | ❌ No | ❌ No | 201 |
| PUT | Reemplazar | Sí | ✅ Sí | ❌ No | 200 |
| PATCH | Actualizar | Sí | ✅ Sí | ❌ No | 200 |
| DELETE | Eliminar | No | ✅ Sí | ❌ No | 204 |

## 🔑 Conceptos Clave

✅ **GET** - lectura segura
✅ **POST** - crear, no idempotente
✅ **PUT** - reemplazar completo, idempotente
✅ **PATCH** - actualizar parcial, idempotente
✅ **DELETE** - eliminar, idempotente
✅ **Idempotencia** - múltiples llamadas = mismo resultado

## 📝 Resumen por Caso de Uso

```
Obtener usuarios           → GET /usuarios
Obtener usuario 123        → GET /usuarios/123
Crear nuevo usuario        → POST /usuarios
Actualizar usuario 123     → PUT /usuarios/123 (completo)
Actualizar nombre de 123   → PATCH /usuarios/123 (parcial)
Eliminar usuario 123       → DELETE /usuarios/123
```

## 🔗 Próximo Paso

Continúa con [Códigos de Estado](05-codigos-de-estado.md) para entender qué significa cada respuesta.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
