# Manejo de Errores REST

## 📌 Importancia del Manejo de Errores

Un cliente debe entender **exactamente qué salió mal**:

```
❌ MAL
HTTP/1.1 500 Internal Server Error


✅ BIEN
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "El email debe ser válido",
  "code": "INVALID_EMAIL",
  "field": "email",
  "statusCode": 400
}
```

---

## 🎯 Códigos de Estado Adecuados

### 2xx - Éxito

| Código | Uso |
|--------|-----|
| **200 OK** | Solicitud exitosa con respuesta |
| **201 Created** | Recurso creado |
| **204 No Content** | Éxito sin contenido |

---

### 3xx - Redirección

| Código | Uso |
|--------|-----|
| **301 Moved Permanently** | Recurso movido permanentemente |
| **304 Not Modified** | En caché, no cambió |

---

### 4xx - Error del Cliente

| Código | Situación | Ejemplo |
|--------|-----------|---------|
| **400 Bad Request** | Datos inválidos | JSON malformado |
| **401 Unauthorized** | Sin autenticación | Sin token JWT |
| **403 Forbidden** | Sin permiso | Usuario no es admin |
| **404 Not Found** | No existe | Usuario con ID 999 |
| **409 Conflict** | Conflicto | Email duplicado |
| **422 Unprocessable Entity** | Validación falló | Email inválido |
| **429 Too Many Requests** | Rate limit | Demasiadas solicitudes |

---

### 5xx - Error del Servidor

| Código | Situación |
|--------|-----------|
| **500 Internal Server Error** | Error genérico del servidor |
| **502 Bad Gateway** | Gateway/Proxy error |
| **503 Service Unavailable** | Servidor caído/mantenimiento |

---

## 📋 Estructura de Respuesta de Error

### Formato Estándar

```json
{
  "error": "El email debe ser válido",
  "code": "INVALID_EMAIL",
  "statusCode": 400,
  "timestamp": "2024-02-05T14:30:00Z"
}
```

### Formato Detallado (con validaciones)

```json
{
  "error": "Validación fallida",
  "code": "VALIDATION_ERROR",
  "statusCode": 422,
  "timestamp": "2024-02-05T14:30:00Z",
  "details": {
    "nombre": {
      "error": "Campo requerido",
      "code": "REQUIRED"
    },
    "email": {
      "error": "Email inválido",
      "code": "INVALID_FORMAT"
    }
  }
}
```

### Formato Alternativo (Array)

```json
{
  "errors": [
    {
      "message": "El nombre es requerido",
      "field": "nombre",
      "code": "REQUIRED"
    },
    {
      "message": "El email debe ser válido",
      "field": "email",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

---

## 🔴 Errores Comunes y Soluciones

### 1. JSON Inválido

```http
POST /api/v1/usuarios HTTP/1.1
Content-Type: application/json

{invalid json}
```

**Respuesta:**
```json
HTTP/1.1 400 Bad Request
{
  "error": "JSON inválido en el body",
  "code": "INVALID_JSON",
  "statusCode": 400
}
```

**C# Manejador:**
```csharp
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerPathFeature>()?.Error;
        
        if (exception is JsonException)
        {
            context.Response.StatusCode = 400;
            context.Response.ContentType = "application/json";
            
            await context.Response.WriteAsJsonAsync(new
            {
                error = "JSON inválido",
                code = "INVALID_JSON",
                statusCode = 400
            });
        }
    });
});
```

---

### 2. Validación de Datos

```http
POST /api/v1/usuarios HTTP/1.1
Content-Type: application/json

{
  "nombre": "",
  "email": "email-invalido"
}
```

**Respuesta:**
```json
HTTP/1.1 422 Unprocessable Entity
{
  "error": "Validación fallida",
  "code": "VALIDATION_ERROR",
  "statusCode": 422,
  "details": {
    "nombre": "El nombre es requerido",
    "email": "El email debe ser válido"
  }
}
```

**C# Validador:**
```csharp
app.MapPost("/api/v1/usuarios", (UsuarioRequest req) =>
{
    var errores = new Dictionary<string, string>();
    
    // Validar nombre
    if (string.IsNullOrWhiteSpace(req.Nombre))
        errores["nombre"] = "El nombre es requerido";
    
    // Validar email
    if (string.IsNullOrWhiteSpace(req.Email))
        errores["email"] = "El email es requerido";
    else if (!IsValidEmail(req.Email))
        errores["email"] = "El email debe ser válido";
    
    // Si hay errores
    if (errores.Count > 0)
    {
        return Results.UnprocessableEntity(new
        {
            error = "Validación fallida",
            code = "VALIDATION_ERROR",
            statusCode = 422,
            details = errores
        });
    }
    
    // Crear usuario
    var usuario = new Usuario { Nombre = req.Nombre, Email = req.Email };
    db.usuarios.Agregar(usuario);
    
    return Results.Created($"/api/v1/usuarios/{usuario.Id}", usuario);
});

private static bool IsValidEmail(string email)
{
    try
    {
        var addr = new System.Net.Mail.MailAddress(email);
        return addr.Address == email;
    }
    catch
    {
        return false;
    }
}

record UsuarioRequest(string Nombre, string Email);
```

**Node.js Validador:**
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/v1/usuarios', (req, res) => {
    const errores = {};
    
    // Validar nombre
    if (!req.body.nombre || !req.body.nombre.trim()) {
        errores.nombre = "El nombre es requerido";
    }
    
    // Validar email
    if (!req.body.email) {
        errores.email = "El email es requerido";
    } else if (!isValidEmail(req.body.email)) {
        errores.email = "El email debe ser válido";
    }
    
    // Si hay errores
    if (Object.keys(errores).length > 0) {
        return res.status(422).json({
            error: "Validación fallida",
            code: "VALIDATION_ERROR",
            statusCode: 422,
            details: errores
        });
    }
    
    // Crear usuario
    const usuario = { id: 1, ...req.body };
    db.usuarios.create(usuario);
    
    res.status(201).json(usuario);
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.listen(3000);
```

---

### 3. Recurso No Encontrado

```http
GET /api/v1/usuarios/99999
```

**Respuesta:**
```json
HTTP/1.1 404 Not Found
{
  "error": "Usuario no encontrado",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "resource": "usuarios",
  "id": 99999
}
```

**C# Manejador:**
```csharp
app.MapGet("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    
    if (usuario == null)
    {
        return Results.NotFound(new
        {
            error = "Usuario no encontrado",
            code = "NOT_FOUND",
            statusCode = 404,
            resource = "usuarios",
            id = id
        });
    }
    
    return Results.Ok(usuario);
});
```

---

### 4. Sin Autenticación

```http
GET /api/v1/admin/datos
(sin Authorization header)
```

**Respuesta:**
```json
HTTP/1.1 401 Unauthorized
{
  "error": "Autenticación requerida",
  "code": "UNAUTHORIZED",
  "statusCode": 401
}
```

**C# Middleware:**
```csharp
app.MapGet("/api/v1/admin/datos", () =>
{
    // Verificar autenticación
    return Results.Unauthorized();
}).RequireAuthorization();
```

---

### 5. Sin Permiso

```http
GET /api/v1/admin/datos
Authorization: Bearer token-usuario-normal
```

**Respuesta:**
```json
HTTP/1.1 403 Forbidden
{
  "error": "No tienes permiso para acceder a este recurso",
  "code": "FORBIDDEN",
  "statusCode": 403,
  "requiredRole": "admin"
}
```

**C# Middleware:**
```csharp
app.MapGet("/api/v1/admin/datos", (HttpContext context) =>
{
    var user = context.User;
    
    if (!user.IsInRole("admin"))
    {
        return Results.Forbid();
    }
    
    return Results.Ok(new { datos = "..." });
}).RequireAuthorization();
```

---

### 6. Recurso Duplicado (Conflicto)

```http
POST /api/v1/usuarios
{
  "email": "juan@ejemplo.com"
}
// Email ya existe
```

**Respuesta:**
```json
HTTP/1.1 409 Conflict
{
  "error": "El email ya existe",
  "code": "DUPLICATE_EMAIL",
  "statusCode": 409,
  "field": "email",
  "value": "juan@ejemplo.com"
}
```

**C# Manejador:**
```csharp
app.MapPost("/api/v1/usuarios", (UsuarioRequest req) =>
{
    // Verificar si email existe
    var existente = db.usuarios.ObtenerPorEmail(req.Email);
    
    if (existente != null)
    {
        return Results.Conflict(new
        {
            error = "El email ya existe",
            code = "DUPLICATE_EMAIL",
            statusCode = 409,
            field = "email",
            value = req.Email
        });
    }
    
    var usuario = new Usuario { Email = req.Email };
    db.usuarios.Agregar(usuario);
    
    return Results.Created($"/api/v1/usuarios/{usuario.Id}", usuario);
});
```

---

### 7. Rate Limit

```http
GET /api/v1/datos
(después de 1000 requests en 1 minuto)
```

**Respuesta:**
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-02-05T14:31:00Z

{
  "error": "Demasiadas solicitudes",
  "code": "RATE_LIMIT_EXCEEDED",
  "statusCode": 429,
  "retryAfter": 60
}
```

**Node.js con Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 1000, // máximo 1000 requests
    message: {
        error: "Demasiadas solicitudes",
        code: "RATE_LIMIT_EXCEEDED",
        statusCode: 429
    },
    standardHeaders: true, // Devolver headers X-RateLimit
    legacyHeaders: false
});

app.use('/api/', limiter);
```

---

### 8. Error del Servidor

```http
GET /api/v1/usuarios
(error desconocido en la base de datos)
```

**Respuesta:**
```json
HTTP/1.1 500 Internal Server Error
{
  "error": "Error interno del servidor",
  "code": "INTERNAL_SERVER_ERROR",
  "statusCode": 500,
  "requestId": "req-12345-abcde",
  "timestamp": "2024-02-05T14:30:00Z"
}
```

**C# Global Exception Handler:**
```csharp
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerPathFeature>()?.Error;
        var requestId = context.TraceIdentifier;
        
        // Log error
        Console.WriteLine($"Error: {exception?.Message}");
        
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        
        await context.Response.WriteAsJsonAsync(new
        {
            error = "Error interno del servidor",
            code = "INTERNAL_SERVER_ERROR",
            statusCode = 500,
            requestId = requestId,
            timestamp = DateTime.UtcNow
        });
    });
});
```

---

## 📝 Respuestas Consistentes

**Estructura Recomendada:**
```json
{
  "error": "Descripción legible",
  "code": "CODIGO_ERROR",
  "statusCode": 400,
  "timestamp": "2024-02-05T14:30:00Z",
  "requestId": "req-12345",
  "details": null // opcional
}
```

---

## 🛡️ No Exponer Información Sensible

```javascript
// ❌ MAL: Expone detalles internos
{
  "error": "SQLException: No se pudo conectar a la base de datos",
  "stack": "at Database.query() line 45..."
}

// ✅ BIEN: Mensaje genérico seguro
{
  "error": "Error al procesar la solicitud",
  "code": "INTERNAL_SERVER_ERROR",
  "statusCode": 500
}
```

**Regla:** Los detalles técnicos van en logs, no en respuestas.

---

## 📋 Guía de Selección de Códigos

```
¿El cliente envió datos inválidos?
├─ ¿Formato inválido (JSON)? → 400
├─ ¿Validación de datos falló? → 422
└─ ¿Conflicto (duplicado)? → 409

¿Autenticación?
├─ ¿Sin credenciales? → 401
├─ ¿Sin permiso? → 403
└─ ¿Token inválido? → 401

¿Recurso?
├─ ¿No existe? → 404
├─ ¿Cambió de ubicación? → 301
└─ ¿Éxito? → 200/201/204

¿Servidor?
├─ ¿Error genérico? → 500
├─ ¿No disponible? → 503
└─ ¿Rate limit? → 429
```

---

## 💡 Mejores Prácticas

✅ Devuelve código HTTP correcto
✅ Incluye mensaje claro en error
✅ Devuelve código de error (`code`)
✅ Valida antes de procesar
✅ No expones detalles internos
✅ Incluye timestamp y requestId
✅ Documenta todos los errores posibles

---

## 🔗 Final del Módulo

Has completado **Arquitectura de APIs REST**:

✅ Qué es REST
✅ Recursos y endpoints
✅ Nombres de rutas
✅ Métodos HTTP correcto
✅ Versionado de APIs
✅ Paginación básica
✅ Filtrado y ordenamiento
✅ Manejo de errores REST

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
