# Versionado de APIs

## 📌 ¿Por Qué Versionar?

Las APIs cambian con el tiempo:
- Nuevos campos en respuestas
- Eliminación de campos
- Cambios en estructura
- Nuevos métodos

Sin versionado, los clientes antiguos **se rompen**.

```
v1: { id, nombre, email }
v2: { id, nombre, email, createdAt, updatedAt }

Sin versión: Clientes v1 reciben createdAt que no esperaban
Con versión: Clientes pueden elegir v1 o v2
```

---

## 🎯 Estrategias de Versionado

### 1. **URL Path (Más Común)** ✅ RECOMENDADO

La versión está en la ruta:

```
GET  /api/v1/usuarios
GET  /api/v2/usuarios
GET  /api/v3/usuarios
```

**Ventajas:**
- ✅ Explícito y claro
- ✅ Fácil de cachear
- ✅ Fácil de monitorear
- ✅ Cada versión es una ruta diferente

**Desventajas:**
- Múltiples rutas mantenidas

**C# Ejemplo:**
```csharp
// Versión 1
app.MapGet("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    return Results.Ok(new 
    { 
        id = usuario.Id,
        nombre = usuario.Nombre,
        email = usuario.Email
    });
});

// Versión 2 (incluye más campos)
app.MapGet("/api/v2/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    return Results.Ok(new 
    { 
        id = usuario.Id,
        nombre = usuario.Nombre,
        email = usuario.Email,
        createdAt = usuario.FechaCreacion,
        updatedAt = usuario.FechaActualizacion,
        isActive = usuario.Activo
    });
});
```

**Node.js Ejemplo:**
```javascript
// Versión 1
app.get('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    res.json({
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
    });
});

// Versión 2
app.get('/api/v2/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    res.json({
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
        isActive: usuario.isActive
    });
});
```

---

### 2. **Header Accept-Version**

La versión se envía en un header:

```
GET /api/usuarios
Accept-Version: v1

o

GET /api/usuarios
X-API-Version: 2
```

**Ventajas:**
- ✅ Limpia (una ruta para todas)
- ✅ La versión es metadato (no ruta)

**Desventajas:**
- ❌ Menos visible
- ❌ Más difícil de cachear
- ❌ Necesita documentación clara

**C# Ejemplo:**
```csharp
app.MapGet("/api/usuarios/{id}", (int id, HttpContext context) =>
{
    var version = context.Request.Headers["Accept-Version"].ToString();
    
    var usuario = db.usuarios.ObtenerPorId(id);
    
    if (version == "v2")
    {
        return Results.Ok(new 
        { 
            id = usuario.Id,
            nombre = usuario.Nombre,
            email = usuario.Email,
            createdAt = usuario.FechaCreacion,
            updatedAt = usuario.FechaActualizacion
        });
    }
    
    // Por defecto v1
    return Results.Ok(new 
    { 
        id = usuario.Id,
        nombre = usuario.Nombre,
        email = usuario.Email
    });
});
```

---

### 3. **Content Negotiation (Menos Común)**

La versión va en Accept header:

```
GET /api/usuarios
Accept: application/vnd.example.v1+json

GET /api/usuarios
Accept: application/vnd.example.v2+json
```

**Ventajas:**
- Estándar HTTP puro

**Desventajas:**
- ❌ Complejo de implementar
- ❌ Difícil de entender
- ❌ Menos popular

---

## 🏗️ Estructura de Versionado

### Directorio por Versión

```csharp
// Controllers/v1/UsuariosController.cs
namespace API.Controllers.v1
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class UsuariosController : ControllerBase
    {
        [HttpGet("{id}")]
        public IActionResult GetUsuario(int id)
        {
            // Versión 1
        }
    }
}

// Controllers/v2/UsuariosController.cs
namespace API.Controllers.v2
{
    [ApiController]
    [Route("api/v2/[controller]")]
    public class UsuariosController : ControllerBase
    {
        [HttpGet("{id}")]
        public IActionResult GetUsuario(int id)
        {
            // Versión 2
        }
    }
}
```

### Middleware para Versionado

**C# Avanzado:**
```csharp
public class ApiVersioningMiddleware
{
    private readonly RequestDelegate _next;

    public ApiVersioningMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value;
        
        // Detectar versión de la ruta
        var versionMatch = System.Text.RegularExpressions.Regex.Match(path, @"/api/v(\d+)/");
        if (versionMatch.Success)
        {
            int version = int.Parse(versionMatch.Groups[1].Value);
            context.Items["ApiVersion"] = version;
        }
        
        await _next(context);
    }
}

app.UseMiddleware<ApiVersioningMiddleware>();
```

---

## 📋 Estrategia de Deprecación

### Anunciar Cambios

```
1. Versión actual: v1 (estable)
2. Nueva versión: v2 (experimental)
   - Anunciar 6 meses antes
   - Documentar cambios
3. Transición: 12 meses de soporte a ambas
4. Fin de vida: Desactivar v1
```

### Respuesta Headers para Deprecación

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sun, 31 Dec 2024 23:59:59 GMT
Link: </api/v2/usuarios>; rel="successor-version"

{...datos...}
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios/{id}", (int id, HttpContext context) =>
{
    // Advertir que v1 está deprecada
    context.Response.Headers.Add("Deprecation", "true");
    context.Response.Headers.Add("Sunset", "Sun, 31 Dec 2024 23:59:59 GMT");
    context.Response.Headers.Add("Link", "</api/v2/usuarios>; rel=\"successor-version\"");
    
    var usuario = db.usuarios.ObtenerPorId(id);
    return Results.Ok(usuario);
});
```

---

## 🔄 Ejemplo: Migración de v1 a v2

### Cambios en v2

```
v1 Response:
{
  "id": 1,
  "name": "Juan",
  "email": "juan@ejemplo.com"
}

v2 Response:
{
  "id": 1,
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@ejemplo.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-02-05T14:20:00Z",
  "status": "active"
}
```

### Implementación

**C# Versiones Paralelas:**
```csharp
// V1: Endpoint antiguo
app.MapGet("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    
    return Results.Ok(new 
    { 
        id = usuario.Id,
        name = usuario.Nombre,
        email = usuario.Email
    });
});

// V2: Endpoint nuevo
app.MapGet("/api/v2/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    
    return Results.Ok(new 
    { 
        id = usuario.Id,
        firstName = usuario.Nombre.Split(' ')[0],
        lastName = usuario.Nombre.Split(' ')[1],
        email = usuario.Email,
        createdAt = usuario.FechaCreacion,
        updatedAt = usuario.FechaActualizacion,
        status = usuario.Activo ? "active" : "inactive"
    });
});
```

**Node.js Versiones Paralelas:**
```javascript
// V1: Endpoint antiguo
app.get('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    
    res.json({
        id: usuario.id,
        name: usuario.nombre,
        email: usuario.email
    });
});

// V2: Endpoint nuevo
app.get('/api/v2/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    const [firstName, lastName] = usuario.nombre.split(' ');
    
    res.json({
        id: usuario.id,
        firstName,
        lastName,
        email: usuario.email,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
        status: usuario.isActive ? 'active' : 'inactive'
    });
});
```

---

## 🚀 Mejores Prácticas

### ✅ DO's

✅ Versionar en la URL (`/api/v1`)
✅ Soportar máximo 2 versiones activas
✅ Anunciar deprecación 6 meses antes
✅ Documentar cambios en cada versión
✅ Mantener compatibilidad hacia atrás

### ❌ DON'Ts

❌ Versionar por subdominios (`v1.api.ejemplo.com`)
❌ Cambiar versión frecuentemente
❌ Remover versión sin aviso
❌ Versionar campos individuales

---

## 📊 Plan de Vida de Versión

```
Mes 0-6: Nueva versión (beta/experimental)
├─ Aceptar feedback
├─ Hacer cambios
└─ Documentar bien

Mes 6-12: Versión actual (estable)
├─ v1 sigue disponible
├─ Recomendar migración a v2
└─ Ambas soportadas

Mes 12-18: Transición (mantenimiento)
├─ v1 en deprecación
├─ Seguir soportando
└─ Última oportunidad para migrar

Mes 18+: Fin de vida
├─ v1 retirada
└─ Solo v2 disponible
```

---

## 💡 Decisión: ¿Cuándo Incrementar Versión?

### Major Version (v1 → v2)
- ❌ Eliminación de campos
- ❌ Cambio de estructura
- ❌ Nuevo formato de respuesta
- ❌ Cambios en comportamiento

### Minor Version (v1.0 → v1.1)
- ✅ Nuevos campos opcionales
- ✅ Nuevos endpoints
- ✅ Mejoras de performance
- ✅ Campos deprecados

**Nota:** Mantener v1.0, v1.1, v1.2 es complejo. Lo mejor es hacer solo v1, v2, v3...

---

## 🔗 Próximo Paso

Continúa con [Paginación Básica](06-paginacion-basica.md) para manejar grandes volúmenes de datos.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
