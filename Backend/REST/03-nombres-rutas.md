# Nombres de Rutas

## 📌 Importancia del Naming

El nombre de una ruta (endpoint) es la **primera impresión** que tiene un cliente sobre tu API. Nombres claros = API profesional y fácil de usar.

```
Bueno:     /api/v1/usuarios/1
Malo:      /api/v1/user_get_by_id
Terrible:  /api/v1/u
```

---

## 🎯 Reglas Principales

### 1. **Usa Sustantivos, No Verbos**

Los verbos ya están en los métodos HTTP (GET, POST, PUT, DELETE).

```
✅ CORRECTO
GET    /api/v1/usuarios              → Listar
POST   /api/v1/usuarios              → Crear
GET    /api/v1/usuarios/1            → Obtener
PUT    /api/v1/usuarios/1            → Actualizar
DELETE /api/v1/usuarios/1            → Eliminar

❌ INCORRECTO
GET    /api/v1/listarUsuarios
POST   /api/v1/crearUsuario
GET    /api/v1/obtenerUsuario/1
PUT    /api/v1/actualizarUsuario/1
DELETE /api/v1/eliminarUsuario/1
```

**Por qué:**
- El verbo duplica información (GET ya significa "obtener")
- No es RESTful
- Inconsistente cuando el método no coincide

---

### 2. **Usa Minúsculas Consistentemente**

```
✅ CORRECTO
/api/v1/usuarios
/api/v1/ordenes
/api/v1/productos-electronicos

❌ INCORRECTO
/api/v1/Usuarios
/api/v1/USUARIOS
/api/v1/UsuariosActivos
/api/v1/usuarios_activos (guiones bajos)
```

**Convención:** minúsculas con guiones (-) para palabras compuestas.

---

### 3. **Usa Plural para Colecciones**

```
✅ CORRECTO
GET    /api/v1/usuarios           → Colección (múltiples)
GET    /api/v1/usuarios/1         → Recurso individual
GET    /api/v1/usuarios/1/ordenes → Sub-colección

❌ INCORRECTO
GET    /api/v1/usuario            → Confuso
GET    /api/v1/usuarioById/1      → Redundante (? es obvio que es por ID)
```

---

### 4. **Guiones (-) No Guiones Bajos (_)**

```
✅ CORRECTO
/api/v1/productos-electronicos
/api/v1/usuarios/1/cambiar-contrasena

❌ INCORRECTO
/api/v1/productos_electronicos
/api/v1/usuarios/1/cambiar_contrasena
```

**Por qué:** Los guiones son más legibles en URLs y es el estándar HTTP.

---

### 5. **Identificadores (IDs) sin Nombres**

```
✅ CORRECTO
GET /api/v1/usuarios/123          ← ID directo
GET /api/v1/usuarios/123/ordenes/5

❌ INCORRECTO
GET /api/v1/usuarios/id:123       ← Tipo de ID innecesario
GET /api/v1/usuarios/uid/123      ← Redundante
GET /api/v1/usuarios/123/ord/5    ← Abreviaciones confusas
```

---

## 📚 Patrones Comunes

### Listar Recursos

```
GET /api/v1/{recurso}

Ejemplos:
GET /api/v1/usuarios
GET /api/v1/productos
GET /api/v1/ordenes
GET /api/v1/categorias
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", () =>
{
    var usuarios = db.usuarios.ObtenerTodos();
    return Results.Ok(usuarios);
});
```

---

### Crear Recurso

```
POST /api/v1/{recurso}

Ejemplos:
POST /api/v1/usuarios
POST /api/v1/productos
POST /api/v1/ordenes
```

**C# Ejemplo:**
```csharp
app.MapPost("/api/v1/usuarios", (UsuarioRequest req) =>
{
    var usuario = new Usuario { Nombre = req.Nombre, Email = req.Email };
    db.usuarios.Agregar(usuario);
    return Results.Created($"/api/v1/usuarios/{usuario.Id}", usuario);
});
```

---

### Obtener Recurso Individual

```
GET /api/v1/{recurso}/{id}

Ejemplos:
GET /api/v1/usuarios/123
GET /api/v1/productos/456
GET /api/v1/ordenes/789
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    return usuario != null ? Results.Ok(usuario) : Results.NotFound();
});
```

---

### Actualizar Recurso

```
PUT /api/v1/{recurso}/{id}        ← Reemplazar completo
PATCH /api/v1/{recurso}/{id}      ← Actualizar parcial

Ejemplos:
PUT /api/v1/usuarios/123
PATCH /api/v1/usuarios/123
```

**C# Ejemplo:**
```csharp
app.MapPut("/api/v1/usuarios/{id}", (int id, UsuarioRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null) return Results.NotFound();
    
    usuario.Nombre = req.Nombre;
    usuario.Email = req.Email;
    db.usuarios.Actualizar(usuario);
    
    return Results.Ok(usuario);
});

app.MapPatch("/api/v1/usuarios/{id}", (int id, UsuarioPatchRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null) return Results.NotFound();
    
    if (!string.IsNullOrEmpty(req.Nombre))
        usuario.Nombre = req.Nombre;
    
    if (!string.IsNullOrEmpty(req.Email))
        usuario.Email = req.Email;
    
    db.usuarios.Actualizar(usuario);
    return Results.Ok(usuario);
});
```

---

### Eliminar Recurso

```
DELETE /api/v1/{recurso}/{id}

Ejemplos:
DELETE /api/v1/usuarios/123
DELETE /api/v1/productos/456
```

**C# Ejemplo:**
```csharp
app.MapDelete("/api/v1/usuarios/{id}", (int id) =>
{
    db.usuarios.Eliminar(id);
    return Results.NoContent();
});
```

---

### Sub-recursos (Relaciones)

```
GET    /api/v1/{recurso}/{id}/{sub-recurso}
POST   /api/v1/{recurso}/{id}/{sub-recurso}
GET    /api/v1/{recurso}/{id}/{sub-recurso}/{subId}
PUT    /api/v1/{recurso}/{id}/{sub-recurso}/{subId}
DELETE /api/v1/{recurso}/{id}/{sub-recurso}/{subId}

Ejemplos:
GET    /api/v1/usuarios/1/ordenes
POST   /api/v1/usuarios/1/ordenes
GET    /api/v1/usuarios/1/ordenes/5
PUT    /api/v1/usuarios/1/ordenes/5
DELETE /api/v1/usuarios/1/ordenes/5
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios/{userId}/ordenes", (int userId) =>
{
    var ordenes = db.ordenes.ObtenerPorUsuario(userId);
    return Results.Ok(ordenes);
});

app.MapPost("/api/v1/usuarios/{userId}/ordenes", (int userId, OrdenRequest req) =>
{
    var orden = new Orden { UsuarioId = userId, Total = req.Total };
    db.ordenes.Agregar(orden);
    return Results.Created($"/api/v1/usuarios/{userId}/ordenes/{orden.Id}", orden);
});
```

---

## 🚫 Antipatrones a Evitar

### ❌ Verbos en la Ruta

```
GET    /api/v1/obtenerUsuarios
POST   /api/v1/crearUsuario
PUT    /api/v1/editarUsuario/1
GET    /api/v1/borrarUsuario/1

// Problemas:
// - Redundante con métodos HTTP
// - No escalable
// - Difícil de mantener
```

**Solución:**
```
GET    /api/v1/usuarios
POST   /api/v1/usuarios
PUT    /api/v1/usuarios/1
DELETE /api/v1/usuarios/1
```

---

### ❌ Verbos para Acciones Especiales

```
❌ POST /api/v1/usuarios/1/enviarEmail
❌ POST /api/v1/ordenes/5/calcularTotal
❌ GET  /api/v1/usuarios/1/verificar-existencia
```

**Mejor:**
```
// Opción 1: Sub-recurso (si es un concepto)
POST /api/v1/usuarios/1/emails                    ← Crear email

// Opción 2: Query param (si es una acción)
POST /api/v1/usuarios/1?enviarEmail=true

// Opción 3: Usar un controller separado
POST /api/v1/emails                               ← Crear email general
```

---

### ❌ Identificadores Genéricos

```
❌ /api/v1/get/123
❌ /api/v1/item/123
❌ /api/v1/data/123

// No es claro qué recurso es
```

**Correcto:**
```
✅ /api/v1/usuarios/123
✅ /api/v1/productos/456
✅ /api/v1/ordenes/789
```

---

### ❌ Rutas Demasiado Profundas

```
❌ /api/v1/usuarios/1/ordenes/5/items/10/descuentos/3

// Muy complejo, poco mantenible
```

**Mejor:**
```
✅ /api/v1/usuarios/1/ordenes/5
✅ /api/v1/items/10
✅ /api/v1/descuentos/3

// Claro, simple, mantenible
```

---

## 🎯 Ejemplo Completo de API Bien Nombrada

```
┌─────────────────────────────────────────────────────────┐
│                 TIENDA ONLINE API                       │
├─────────────────────────────────────────────────────────┤
│                     USUARIOS                            │
├─────────────────────────────────────────────────────────┤
│ GET    /api/v1/usuarios                 → Listar        │
│ POST   /api/v1/usuarios                 → Crear         │
│ GET    /api/v1/usuarios/123             → Obtener       │
│ PUT    /api/v1/usuarios/123             → Actualizar    │
│ PATCH  /api/v1/usuarios/123             → Parcial       │
│ DELETE /api/v1/usuarios/123             → Eliminar      │
│                                                          │
│               ÓRDENES DE USUARIO                        │
│ GET    /api/v1/usuarios/123/ordenes     → Listar        │
│ POST   /api/v1/usuarios/123/ordenes     → Crear         │
│ GET    /api/v1/usuarios/123/ordenes/5   → Obtener       │
│ PUT    /api/v1/usuarios/123/ordenes/5   → Actualizar    │
│ DELETE /api/v1/usuarios/123/ordenes/5   → Eliminar      │
│                                                          │
│                   PRODUCTOS                             │
│ GET    /api/v1/productos                → Listar        │
│ POST   /api/v1/productos                → Crear         │
│ GET    /api/v1/productos/456            → Obtener       │
│ PUT    /api/v1/productos/456            → Actualizar    │
│ DELETE /api/v1/productos/456            → Eliminar      │
│                                                          │
│              CATEGORÍAS DE PRODUCTOS                    │
│ GET    /api/v1/productos/456/categorias → Listar        │
│ POST   /api/v1/productos/456/categorias → Crear         │
│                                                          │
│                  CARRITO                                │
│ GET    /api/v1/usuarios/123/carrito     → Obtener       │
│ POST   /api/v1/usuarios/123/carrito     → Agregar item  │
│ DELETE /api/v1/usuarios/123/carrito/10  → Quitar item   │
│                                                          │
│                  ÓRDENES                                │
│ GET    /api/v1/ordenes                  → Listar        │
│ POST   /api/v1/ordenes                  → Crear         │
│ GET    /api/v1/ordenes/5                → Obtener       │
│ PUT    /api/v1/ordenes/5                → Actualizar    │
│ DELETE /api/v1/ordenes/5                → Cancelar      │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Checklist de Nombres

Antes de definir un endpoint:

- ✅ ¿Usa **sustantivos** (no verbos)?
- ✅ ¿Está en **minúsculas**?
- ✅ ¿Usa **guiones** para palabras compuestas?
- ✅ ¿Usa **plural** para colecciones?
- ✅ ¿Es **consistente** con otros endpoints?
- ✅ ¿Es **predecible** y fácil de adivinar?
- ✅ ¿No tiene **más de 2 niveles** de anidación?

---

## 💡 Regla de Oro

> Si alguien ve tu endpoint por primera vez, ¿entendería qué hace sin documentación?

---

## 🔗 Próximo Paso

Continúa con [Métodos HTTP Correcto](04-metodos-http-correcto.md) para dominar su uso.

---

**Nivel de Dificultad:** ⭐ Básico
