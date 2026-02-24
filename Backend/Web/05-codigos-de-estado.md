# Códigos de Estado HTTP

## 📌 ¿Qué son los Códigos de Estado?

Los códigos de estado HTTP indican el **resultado** de una solicitud HTTP. Son números de 3 dígitos que comunican si la operación fue exitosa, redirecciona, tiene error, etc.

```
┌─────────────────────────────────────┐
│         Código de Estado            │
├─────────────────────────────────────┤
│ 2xx → Éxito ✅                      │
│ 3xx → Redirección 🔄                │
│ 4xx → Error del Cliente ⚠️         │
│ 5xx → Error del Servidor ❌        │
└─────────────────────────────────────┘
```

## 🟢 2xx - Éxito (Success)

Los 2xx indican que la solicitud fue **exitosa**.

### 200 OK

El más común. La solicitud fue exitosa y la respuesta contiene datos.

```http
GET /usuarios/123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{"id": 123, "nombre": "Juan", "email": "juan@ejemplo.com"}
```

**Uso:**
- ✅ GET exitoso
- ✅ PUT exitoso
- ✅ POST sin necesidad de ubicación
- ✅ PATCH exitoso

**C# Ejemplo:**
```csharp
app.MapGet("/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null) return Results.NotFound();
    
    return Results.Ok(usuario); // 200 OK
});
```

**Node.js Ejemplo:**
```javascript
app.get('/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    
    res.status(200).json(usuario); // 200 OK
});
```

---

### 201 Created

Indica que un **nuevo recurso ha sido creado** exitosamente.

```http
POST /usuarios HTTP/1.1
Content-Type: application/json

{"nombre": "Juan", "email": "juan@ejemplo.com"}

HTTP/1.1 201 Created
Location: /usuarios/1
Content-Type: application/json

{"id": 1, "nombre": "Juan", "email": "juan@ejemplo.com"}
```

**Características:**
- El header `Location` indica dónde encontrar el nuevo recurso
- Devuelve el recurso creado en el body

**C# Ejemplo:**
```csharp
app.MapPost("/usuarios", (UsuarioRequest req) =>
{
    var usuarioCreado = new { id = 1, nombre = req.Nombre, email = req.Email };
    
    return Results.Created($"/usuarios/1", usuarioCreado); // 201 Created
});
```

**Node.js Ejemplo:**
```javascript
app.post('/usuarios', (req, res) => {
    const nuevoUsuario = { id: 1, nombre: req.body.nombre, email: req.body.email };
    
    res.status(201)
       .location('/usuarios/1')
       .json(nuevoUsuario); // 201 Created
});
```

---

### 204 No Content

La solicitud fue exitosa pero **no hay contenido en la respuesta**.

```http
DELETE /usuarios/123 HTTP/1.1

HTTP/1.1 204 No Content

```

**Uso:**
- ✅ DELETE exitoso
- ✅ PUT exitoso sin respuesta
- ✅ Operaciones sin retorno

**C# Ejemplo:**
```csharp
app.MapDelete("/usuarios/{id}", (int id) =>
{
    db.usuarios.Eliminar(id);
    return Results.NoContent(); // 204 No Content
});
```

**Node.js Ejemplo:**
```javascript
app.delete('/usuarios/:id', (req, res) => {
    db.usuarios.delete(req.params.id);
    res.sendStatus(204); // 204 No Content
});
```

---

### 202 Accepted

La solicitud fue aceptada pero **aún no ha sido procesada** (procesamiento asincrónico).

```http
POST /tareas/procesar HTTP/1.1

HTTP/1.1 202 Accepted

{"taskId": "task-123", "status": "processing"}
```

**Uso:**
- Procesamiento de largo duración
- Colas de trabajo
- Tareas asincrónicas

---

## 🔄 3xx - Redirección (Redirection)

Los 3xx indican que se **necesita una acción adicional** para completar la solicitud.

### 301 Moved Permanently

El recurso ha sido **movido permanentemente** a una nueva URL.

```http
GET /api/usuarios HTTP/1.1

HTTP/1.1 301 Moved Permanently
Location: /api/v2/usuarios

```

**Uso:**
- Cambios de URL permanentes
- SEO (redirecciones)
- Reestructuración de API

**C# Ejemplo:**
```csharp
app.MapGet("/usuarios", () =>
{
    return Results.Redirect("/api/v2/usuarios", permanent: true); // 301
});
```

---

### 302 Found (Temporal)

El recurso está **temporalmente** en otra ubicación.

```http
GET /descargar HTTP/1.1

HTTP/1.1 302 Found
Location: https://cdn.ejemplo.com/archivo.zip

```

**Uso:**
- Redirecciones temporales
- CDN
- Balanceo de carga

**Node.js Ejemplo:**
```javascript
app.get('/descargar', (req, res) => {
    res.redirect(302, 'https://cdn.ejemplo.com/archivo.zip');
});
```

---

### 304 Not Modified

El cliente tiene una **copia válida en caché**, no se necesita descargar.

```http
GET /usuarios HTTP/1.1
If-None-Match: "abc123"

HTTP/1.1 304 Not Modified

```

**Uso:**
- Optimización de caché
- Reducir ancho de banda

---

## ⚠️ 4xx - Error del Cliente (Client Error)

Los 4xx indican que el **cliente** hizo algo mal.

### 400 Bad Request

La solicitud es **inválida o malformada**.

```http
POST /usuarios HTTP/1.1
Content-Type: application/json

{invalid json}

HTTP/1.1 400 Bad Request

{"error": "JSON inválido"}
```

**Uso:**
- JSON malformado
- Parámetros inválidos
- Validación fallida

**C# Ejemplo:**
```csharp
app.MapPost("/usuarios", (UsuarioRequest req) =>
{
    if (string.IsNullOrEmpty(req.Nombre))
        return Results.BadRequest("El nombre es requerido");
    
    // Procesar
});
```

**Node.js Ejemplo:**
```javascript
app.post('/usuarios', (req, res) => {
    if (!req.body.nombre) {
        return res.status(400).json({ error: 'Nombre requerido' });
    }
});
```

---

### 401 Unauthorized

Falta **autenticación** (credenciales no válidas).

```http
GET /api/privado HTTP/1.1

HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer

{"error": "Autenticación requerida"}
```

**Uso:**
- Sin token JWT
- Token expirado
- Sin credenciales

**C# Ejemplo:**
```csharp
app.MapGet("/api/privado", () =>
{
    // Verificar si está autenticado
    if (!User.Identity?.IsAuthenticated ?? true)
        return Results.Unauthorized(); // 401
    
    return Results.Ok("Datos privados");
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/privado', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    
    // Verificar token
});
```

---

### 403 Forbidden

El cliente está **autenticado pero NO tiene permiso**.

```http
GET /api/admin HTTP/1.1
Authorization: Bearer token123

HTTP/1.1 403 Forbidden

{"error": "No tienes permiso para acceder"}
```

**Diferencia 401 vs 403:**
```
401: "¿Quién eres?" (falta autenticación)
403: "Te conozco, pero no puedes entrar" (falta autorización)
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/admin", (HttpContext context) =>
{
    // Está autenticado
    if (!context.User.Identity?.IsAuthenticated ?? true)
        return Results.Unauthorized(); // 401
    
    // Verificar si es admin
    bool esAdmin = context.User.IsInRole("Admin");
    if (!esAdmin)
        return Results.Forbid(); // 403
    
    return Results.Ok("Acceso admin");
});
```

---

### 404 Not Found

El recurso **no existe** o no fue encontrado.

```http
GET /usuarios/99999 HTTP/1.1

HTTP/1.1 404 Not Found

{"error": "Usuario no encontrado"}
```

**Uso:**
- Recurso eliminado
- URL incorrecta
- Endpoint no existe

**Node.js Ejemplo:**
```javascript
app.get('/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.findById(req.params.id);
    
    if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(usuario);
});
```

---

### 409 Conflict

Hay un **conflicto** en la solicitud (duplicate, versión, etc.).

```http
POST /usuarios HTTP/1.1

{"email": "juan@ejemplo.com"}

HTTP/1.1 409 Conflict

{"error": "Email ya registrado"}
```

**Uso:**
- Recurso duplicado
- Conflicto de versión
- Estado inconsistente

---

### 429 Too Many Requests

El cliente ha hecho **demasiadas solicitudes** en poco tiempo (rate limiting).

```http
GET /api/datos HTTP/1.1

HTTP/1.1 429 Too Many Requests
Retry-After: 60

{"error": "Demasiadas solicitudes. Reintenta en 60 segundos"}
```

**Uso:**
- Rate limiting
- Protección contra abuso
- Throttling

---

## 🔴 5xx - Error del Servidor (Server Error)

Los 5xx indican que el **servidor** tiene un problema.

### 500 Internal Server Error

Error **genérico** del servidor, generalmente una excepción no controlada.

```http
GET /usuarios HTTP/1.1

HTTP/1.1 500 Internal Server Error

{"error": "Algo salió mal en el servidor"}
```

**Uso:**
- Excepciones no controladas
- Errores inesperados
- Bugs

**C# Ejemplo:**
```csharp
app.MapGet("/usuarios", () =>
{
    try
    {
        var usuarios = db.usuarios.ObtenerTodos();
        return Results.Ok(usuarios);
    }
    catch (Exception ex)
    {
        // Log error
        Console.WriteLine(ex.Message);
        return Results.StatusCode(500); // 500 Internal Server Error
    }
});
```

---

### 502 Bad Gateway

El **gateway/proxy** recibió una respuesta inválida del servidor.

```http
HTTP/1.1 502 Bad Gateway

{"error": "El servidor no responde correctamente"}
```

**Uso:**
- Servidor caído
- Proxy/Load balancer error
- Servidor upstream no responde

---

### 503 Service Unavailable

El servidor está **temporalmente no disponible** (mantenimiento, sobrecarga).

```http
GET /api/datos HTTP/1.1

HTTP/1.1 503 Service Unavailable
Retry-After: 300

{"error": "Servidor en mantenimiento"}
```

**Uso:**
- Mantenimiento
- Sobrecarga del servidor
- Servicios caídos

**Node.js Ejemplo:**
```javascript
// Simular mantenimiento
app.get('/api/datos', (req, res) => {
    const enMantenimiento = true;
    
    if (enMantenimiento) {
        return res.status(503)
                  .set('Retry-After', '300')
                  .json({ error: 'Servidor en mantenimiento' });
    }
    
    // Procesar
});
```

---

## 📊 Tabla Resumen de Códigos Comunes

| Código | Significado | Uso |
|--------|------------|-----|
| **200** | OK | Éxito general |
| **201** | Created | Recurso creado |
| **204** | No Content | Eliminación exitosa |
| **301** | Moved Permanently | Redirección permanente |
| **302** | Found | Redirección temporal |
| **304** | Not Modified | En caché |
| **400** | Bad Request | JSON inválido |
| **401** | Unauthorized | Sin autenticación |
| **403** | Forbidden | Sin permiso |
| **404** | Not Found | No existe |
| **409** | Conflict | Duplicado |
| **429** | Too Many Requests | Rate limiting |
| **500** | Internal Server Error | Error servidor |
| **502** | Bad Gateway | Gateway error |
| **503** | Service Unavailable | No disponible |

## 🔍 Cómo Verificar Códigos de Estado

### En C#
```csharp
var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios");
int statusCode = (int)response.StatusCode;
bool esExito = response.IsSuccessStatusCode; // true para 2xx

Console.WriteLine($"Status: {statusCode}");
```

### En Node.js
```javascript
const response = await axios.get('https://api.ejemplo.com/usuarios');
const statusCode = response.status;
console.log(`Status: ${statusCode}`);

// Con try-catch
try {
    const response = await axios.get('...');
} catch (error) {
    const statusCode = error.response.status;
    console.log(`Error Status: ${statusCode}`);
}
```

## 💡 Mejores Prácticas

✅ Devuelve el código correcto para cada situación
✅ 201 Created para recursos nuevos, no 200
✅ 204 No Content para DELETE exitoso
✅ 401 para autenticación, 403 para autorización
✅ 409 para conflictos (duplicados)
✅ 5xx solo para errores reales del servidor
✅ Siempre devuelve mensajes de error útiles

## 🔗 Próximo Paso

Continúa con [Headers HTTP](06-headers-http.md) para entender los encabezados de solicitud y respuesta.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
