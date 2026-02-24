# Recursos y Endpoints

## 📌 ¿Qué es un Recurso?

En REST, un **recurso** es cualquier **entidad del negocio** que pueda ser:
- **Identificada** - Tiene una URI única
- **Recuperada** - Se puede obtener su representación
- **Manipulada** - Se puede crear, actualizar, eliminar

```
Ejemplos de Recursos:
- Usuario
- Orden
- Producto
- Categoría
- Comentario
- Carrito de compras
```

---

## 🎯 Diferencia: Recurso vs Endpoint

### Recurso
Es el **concepto abstracto** de lo que representas (ej: "Usuario")

### Endpoint
Es la **ruta HTTP** que accede al recurso (ej: `/api/v1/usuarios/1`)

```
Recurso: Usuario
└─ Endpoints:
   ├─ GET    /api/v1/usuarios        → Listar usuarios
   ├─ POST   /api/v1/usuarios        → Crear usuario
   ├─ GET    /api/v1/usuarios/1      → Obtener usuario 1
   ├─ PUT    /api/v1/usuarios/1      → Actualizar usuario 1
   └─ DELETE /api/v1/usuarios/1      → Eliminar usuario 1
```

---

## 📦 Estructuras de Recursos

### 1. Recursos Simples

Recursos independientes sin relaciones:

```
GET    /api/v1/categorias
POST   /api/v1/categorias
GET    /api/v1/categorias/5
PUT    /api/v1/categorias/5
DELETE /api/v1/categorias/5
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/categorias", () =>
{
    var categorias = db.categorias.ObtenerTodas();
    return Results.Ok(categorias);
});

app.MapPost("/api/v1/categorias", (CategoriaRequest req) =>
{
    var categoria = new Categoria { Nombre = req.Nombre };
    db.categorias.Agregar(categoria);
    return Results.Created($"/api/v1/categorias/{categoria.Id}", categoria);
});
```

---

### 2. Recursos Anidados (Relacionales)

Recursos que dependen de otro:

```
Usuario 1 tiene muchas Órdenes
└─ /api/v1/usuarios/1/ordenes        → Órdenes del usuario 1
   ├─ GET    /api/v1/usuarios/1/ordenes         → Listar
   ├─ POST   /api/v1/usuarios/1/ordenes         → Crear
   ├─ GET    /api/v1/usuarios/1/ordenes/5       → Obtener orden 5
   ├─ PUT    /api/v1/usuarios/1/ordenes/5       → Actualizar
   └─ DELETE /api/v1/usuarios/1/ordenes/5       → Eliminar
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios/{userId}/ordenes", (int userId) =>
{
    var usuario = db.usuarios.ObtenerPorId(userId);
    if (usuario == null) return Results.NotFound("Usuario no encontrado");
    
    var ordenes = db.ordenes.ObtenerPorUsuario(userId);
    return Results.Ok(ordenes);
});

app.MapPost("/api/v1/usuarios/{userId}/ordenes", (int userId, OrdenRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(userId);
    if (usuario == null) return Results.NotFound("Usuario no encontrado");
    
    var orden = new Orden { UsuarioId = userId, Total = req.Total };
    db.ordenes.Agregar(orden);
    return Results.Created($"/api/v1/usuarios/{userId}/ordenes/{orden.Id}", orden);
});

app.MapGet("/api/v1/usuarios/{userId}/ordenes/{orderId}", (int userId, int orderId) =>
{
    var orden = db.ordenes.ObtenerPorId(orderId);
    if (orden == null || orden.UsuarioId != userId)
        return Results.NotFound("Orden no encontrada");
    
    return Results.Ok(orden);
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/usuarios/:userId/ordenes', (req, res) => {
    const usuario = db.usuarios.getById(req.params.userId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    const ordenes = db.ordenes.getByUserId(req.params.userId);
    res.json(ordenes);
});

app.post('/api/v1/usuarios/:userId/ordenes', (req, res) => {
    const usuario = db.usuarios.getById(req.params.userId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    const orden = { id: 1, userId: req.params.userId, ...req.body };
    db.ordenes.create(orden);
    
    res.status(201)
       .location(`/api/v1/usuarios/${req.params.userId}/ordenes/${orden.id}`)
       .json(orden);
});
```

---

### 3. Recursos Colecciones

Múltiples recursos del mismo tipo:

```
GET /api/v1/usuarios                    → Todos los usuarios
GET /api/v1/usuarios?rol=admin          → Usuarios con rol admin
GET /api/v1/usuarios?pagina=1&limite=10 → Primera página
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", (int? pagina = 1, int? limite = 10) =>
{
    var skip = ((pagina ?? 1) - 1) * (limite ?? 10);
    var usuarios = db.usuarios.ObtenerTodos()
        .Skip(skip)
        .Take(limite ?? 10)
        .ToList();
    
    return Results.Ok(new { datos = usuarios, pagina, limite });
});

app.MapGet("/api/v1/usuarios/buscar", (string nombre, string email) =>
{
    var usuarios = db.usuarios.ObtenerTodos()
        .Where(u => u.Nombre.Contains(nombre) || u.Email.Contains(email))
        .ToList();
    
    return Results.Ok(usuarios);
});
```

---

### 4. Recursos Sub-recursos

Acciones específicas en un recurso:

```
/api/v1/usuarios/1/cambiar-contraseña
/api/v1/ordenes/5/cancelar
/api/v1/productos/123/stock
```

**Nota:** Algunos usan verbos (menos REST-puro), pero son comunes para acciones especiales.

**C# Ejemplo:**
```csharp
// Cambiar contraseña de usuario
app.MapPost("/api/v1/usuarios/{id}/cambiar-contraseña", (int id, CambiarPasswordRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null) return Results.NotFound();
    
    // Validar contraseña antigua
    if (!BCrypt.Net.BCrypt.Verify(req.ContraseñaActual, usuario.PasswordHash))
        return Results.BadRequest("Contraseña actual inválida");
    
    usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.ContraseñaNueva);
    db.usuarios.Actualizar(usuario);
    
    return Results.Ok("Contraseña actualizada");
});

// Cancelar orden
app.MapPost("/api/v1/ordenes/{id}/cancelar", (int id) =>
{
    var orden = db.ordenes.ObtenerPorId(id);
    if (orden == null) return Results.NotFound();
    
    if (orden.Estado != "Pendiente")
        return Results.BadRequest("Solo se pueden cancelar órdenes pendientes");
    
    orden.Estado = "Cancelada";
    db.ordenes.Actualizar(orden);
    
    return Results.Ok(orden);
});
```

---

## 📊 Estructuras Comunes de Endpoints

### Estructura Estándar

```
/api/v{versión}/{recursos}
/api/v{versión}/{recursos}/{id}
/api/v{versión}/{recursos}/{id}/{sub-recursos}
/api/v{versión}/{recursos}/{id}/{sub-recursos}/{subId}
```

### Ejemplos Reales

```
Estructura                              Descripción
────────────────────────────────────────────────────────
/api/v1/usuarios                       Listar usuarios
/api/v1/usuarios/1                     Usuario 1
/api/v1/usuarios/1/ordenes             Órdenes del usuario 1
/api/v1/usuarios/1/ordenes/5           Orden 5 del usuario 1
/api/v1/usuarios/1/ordenes/5/items     Items de la orden 5
/api/v1/ordenes/5/items/10             Item 10 de la orden 5
```

---

## 🔍 Parámetros de Query

Usa parámetros de query para **filtrar, paginar, ordenar**:

```
GET /api/v1/usuarios?pagina=1&limite=10
GET /api/v1/productos?categoria=5&ordenar=precio&orden=asc
GET /api/v1/ordenes?estado=pendiente&fecha_desde=2024-01-01
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/productos", (
    int? categoria = null,
    decimal? precioMin = null,
    decimal? precioMax = null,
    string ordenar = "nombre",
    string orden = "asc") =>
{
    var query = db.productos.ObtenerTodos();
    
    // Filtrar por categoría
    if (categoria.HasValue)
        query = query.Where(p => p.CategoriaId == categoria);
    
    // Filtrar por precio
    if (precioMin.HasValue)
        query = query.Where(p => p.Precio >= precioMin);
    
    if (precioMax.HasValue)
        query = query.Where(p => p.Precio <= precioMax);
    
    // Ordenar
    query = ordenar switch
    {
        "precio" => orden == "desc" ? query.OrderByDescending(p => p.Precio) : query.OrderBy(p => p.Precio),
        _ => orden == "desc" ? query.OrderByDescending(p => p.Nombre) : query.OrderBy(p => p.Nombre)
    };
    
    return Results.Ok(query.ToList());
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/productos', (req, res) => {
    let query = db.productos.getAll();
    
    // Filtrar por categoría
    if (req.query.categoria) {
        query = query.filter(p => p.categoriaId === parseInt(req.query.categoria));
    }
    
    // Filtrar por precio
    if (req.query.precioMin) {
        query = query.filter(p => p.precio >= parseFloat(req.query.precioMin));
    }
    
    if (req.query.precioMax) {
        query = query.filter(p => p.precio <= parseFloat(req.query.precioMax));
    }
    
    // Ordenar
    const ordenar = req.query.ordenar || 'nombre';
    const orden = req.query.orden === 'desc' ? -1 : 1;
    
    query.sort((a, b) => {
        return (a[ordenar] > b[ordenar] ? 1 : -1) * orden;
    });
    
    res.json(query);
});
```

---

## 🚫 Lo que NO Debes Hacer

### ❌ Endpoints con Verbos

```
GET  /api/obtenerUsuario/1           ← MAL
POST /api/crearUsuario               ← MAL
PUT  /api/actualizarUsuario/1        ← MAL
GET  /api/eliminarUsuario/1          ← MAL
```

**Por qué es malo:**
- El verbo duplica la información del método HTTP
- No es RESTful
- Difícil de mantener
- Inconsistente

### ❌ Múltiples Niveles de Anidación

```
/api/v1/usuarios/1/ordenes/5/items/10/descuentos/2
```

**Por qué es malo:**
- Demasiado complejo
- Difícil de mantener
- Difícil de cachear

**Solución:**
```
/api/v1/usuarios/1/ordenes/5         ← Obtener orden 5
/api/v1/items/10                     ← Obtener item 10 directamente
```

### ❌ Inconsistencia en Nombres

```
/api/v1/usuarios              ← Plural ✓
/api/v1/usuario               ← Singular ✗
/api/v1/user                  ← Inglés ✗
/api/v1/USUARIOS              ← Mayúsculas ✗
/api/v1/users_list            ← Convención incorrecta ✗
```

**Regla:** Siempre plural, siempre minúsculas, siempre con guiones (no guiones bajos).

---

## 📋 Checklist de Diseño de Endpoints

Antes de crear un endpoint, verifica:

- ✅ ¿Es un **recurso** identificable?
- ✅ ¿Tiene una **URI única y clara**?
- ✅ ¿Usa **sustantivos**, no verbos?
- ✅ ¿Usa **métodos HTTP** correctamente?
- ✅ ¿Es **predecible** (sigue convenciones)?
- ✅ ¿Devuelve **códigos de estado** apropiados?
- ✅ ¿Es **escalable** (no demasiado anidado)?

---

## 💡 Resumen Rápido

| Concepto | Ejemplo |
|----------|---------|
| **Recurso** | Usuario |
| **Endpoint GET** | GET /api/v1/usuarios/1 |
| **Endpoint POST** | POST /api/v1/usuarios |
| **Sub-recurso** | Órdenes del usuario 1 |
| **Query params** | ?pagina=1&limite=10 |

---

## 🔗 Próximo Paso

Continúa con [Nombres de Rutas](03-nombres-rutas.md) para dominar las convenciones de naming.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
