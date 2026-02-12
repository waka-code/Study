# Filtrado y Ordenamiento

## 📌 Necesidad de Búsquedas

Con paginación, el cliente solo ve 10-20 items por página. ¿Pero cómo encuentra lo que busca?

```
Escenario: API con 10,000 usuarios

Sin filtrado:
Cliente debe paginar 1,000 páginas para encontrar "Juan"
❌ Ineficiente

Con filtrado:
GET /api/v1/usuarios?nombre=Juan
Devuelve solo usuarios con nombre "Juan"
✅ Eficiente
```

---

## 🔍 Filtrado Básico

### Por Campo Exacto

```
GET /api/v1/usuarios?role=admin
GET /api/v1/ordenes?estado=pendiente
GET /api/v1/productos?categoria=5
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", (string role = null, int? page = 1) =>
{
    var query = db.usuarios.AsQueryable();
    
    // FILTRAR
    if (!string.IsNullOrEmpty(role))
        query = query.Where(u => u.Rol == role);
    
    // PAGINAR
    int limit = 10;
    int offset = ((page ?? 1) - 1) * limit;
    var usuarios = query.Skip(offset).Take(limit).ToList();
    
    return Results.Ok(usuarios);
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/usuarios', (req, res) => {
    let usuarios = db.usuarios.getAll();
    
    // FILTRAR
    if (req.query.role) {
        usuarios = usuarios.filter(u => u.role === req.query.role);
    }
    
    // PAGINAR
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    res.json(usuarios.slice(offset, offset + limit));
});
```

---

### Búsqueda por Texto

```
GET /api/v1/usuarios?search=Juan
GET /api/v1/productos?search=laptop
```

Buscar en múltiples campos:

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", (string search = null) =>
{
    var query = db.usuarios.AsQueryable();
    
    if (!string.IsNullOrEmpty(search))
    {
        var searchLower = search.ToLower();
        query = query.Where(u => 
            u.Nombre.ToLower().Contains(searchLower) ||
            u.Email.ToLower().Contains(searchLower) ||
            u.Telefono.Contains(search)
        );
    }
    
    return Results.Ok(query.ToList());
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/usuarios', (req, res) => {
    let usuarios = db.usuarios.getAll();
    
    if (req.query.search) {
        const search = req.query.search.toLowerCase();
        usuarios = usuarios.filter(u =>
            u.nombre.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            u.telefono.includes(search)
        );
    }
    
    res.json(usuarios);
});
```

---

### Filtros Avanzados

```
GET /api/v1/productos?precioMin=100&precioMax=500
GET /api/v1/ordenes?fechaDesde=2024-01-01&fechaHasta=2024-12-31
GET /api/v1/usuarios?edadMin=18&edadMax=65
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/productos", (
    decimal? precioMin = null,
    decimal? precioMax = null,
    int? categoriaId = null) =>
{
    var query = db.productos.AsQueryable();
    
    // Filtrar por rango de precio
    if (precioMin.HasValue)
        query = query.Where(p => p.Precio >= precioMin);
    
    if (precioMax.HasValue)
        query = query.Where(p => p.Precio <= precioMax);
    
    // Filtrar por categoría
    if (categoriaId.HasValue)
        query = query.Where(p => p.CategoriaId == categoriaId);
    
    return Results.Ok(query.ToList());
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/productos', (req, res) => {
    let productos = db.productos.getAll();
    
    // Filtrar por rango de precio
    if (req.query.precioMin) {
        const min = parseFloat(req.query.precioMin);
        productos = productos.filter(p => p.precio >= min);
    }
    
    if (req.query.precioMax) {
        const max = parseFloat(req.query.precioMax);
        productos = productos.filter(p => p.precio <= max);
    }
    
    // Filtrar por categoría
    if (req.query.categoriaId) {
        productos = productos.filter(p => p.categoriaId === req.query.categoriaId);
    }
    
    res.json(productos);
});
```

---

### Múltiples Valores (IN)

```
GET /api/v1/usuarios?estado=activo,inactivo,suspendido
GET /api/v1/productos?categorias=1,2,3,5
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", (string estados = null) =>
{
    var query = db.usuarios.AsQueryable();
    
    if (!string.IsNullOrEmpty(estados))
    {
        var estadosList = estados.Split(',').ToList();
        query = query.Where(u => estadosList.Contains(u.Estado));
    }
    
    return Results.Ok(query.ToList());
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/usuarios', (req, res) => {
    let usuarios = db.usuarios.getAll();
    
    if (req.query.estados) {
        const estados = req.query.estados.split(',');
        usuarios = usuarios.filter(u => estados.includes(u.estado));
    }
    
    res.json(usuarios);
});
```

---

## 📊 Ordenamiento

### Orden Básico

```
GET /api/v1/usuarios?sort=nombre&order=asc
GET /api/v1/usuarios?sort=createdAt&order=desc
GET /api/v1/productos?sort=precio&order=asc
```

**Parámetros:**
- `sort`: Campo por el que ordenar
- `order`: `asc` (ascendente) o `desc` (descendente)

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", (string sort = "id", string order = "asc") =>
{
    var query = db.usuarios.AsQueryable();
    
    // Validar campo
    var camposValidos = new[] { "id", "nombre", "email", "createdAt" };
    if (!camposValidos.Contains(sort))
        sort = "id";
    
    // Ordenar
    if (order.ToLower() == "desc")
        query = query.OrderByDescending(u => EF.Property<object>(u, sort));
    else
        query = query.OrderBy(u => EF.Property<object>(u, sort));
    
    return Results.Ok(query.ToList());
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/usuarios', (req, res) => {
    const sort = req.query.sort || 'id';
    const order = req.query.order === 'desc' ? -1 : 1;
    
    let usuarios = db.usuarios.getAll();
    
    usuarios.sort((a, b) => {
        const aVal = a[sort];
        const bVal = b[sort];
        
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
    });
    
    res.json(usuarios);
});
```

---

### Ordenamiento Múltiple

```
GET /api/v1/ordenes?sort=estado,createdAt&order=asc,desc
```

Primero ordena por estado (asc), luego por createdAt (desc)

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/ordenes", (string sort = "id", string order = "asc") =>
{
    var query = db.ordenes.AsQueryable();
    
    var campos = sort.Split(',');
    var ordenes = order.Split(',');
    
    for (int i = 0; i < campos.Length; i++)
    {
        var campo = campos[i].Trim();
        var ordenActual = i < ordenes.Length && ordenes[i].Trim() == "desc" ? "desc" : "asc";
        
        query = ordenActual == "desc"
            ? query.ThenByDescending(o => EF.Property<object>(o, campo))
            : query.ThenBy(o => EF.Property<object>(o, campo));
    }
    
    return Results.Ok(query.ToList());
});
```

---

## 🎯 Filtrado + Ordenamiento + Paginación

Combinar todo:

```
GET /api/v1/usuarios?search=Juan&role=admin&sort=createdAt&order=desc&page=1&limit=10
```

**C# Ejemplo Completo:**
```csharp
app.MapGet("/api/v1/usuarios", (
    string search = null,
    string role = null,
    string sort = "id",
    string order = "asc",
    int page = 1,
    int limit = 10) =>
{
    // Validación
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;
    
    var query = db.usuarios.AsQueryable();
    
    // FILTRAR - por búsqueda
    if (!string.IsNullOrEmpty(search))
    {
        var searchLower = search.ToLower();
        query = query.Where(u => 
            u.Nombre.ToLower().Contains(searchLower) ||
            u.Email.ToLower().Contains(searchLower)
        );
    }
    
    // FILTRAR - por rol
    if (!string.IsNullOrEmpty(role))
        query = query.Where(u => u.Rol == role);
    
    // CONTAR antes de paginar (para total)
    int total = query.Count();
    
    // ORDENAR
    if (order.ToLower() == "desc")
        query = query.OrderByDescending(u => EF.Property<object>(u, sort));
    else
        query = query.OrderBy(u => EF.Property<object>(u, sort));
    
    // PAGINAR
    int offset = (page - 1) * limit;
    var usuarios = query.Skip(offset).Take(limit).ToList();
    
    return Results.Ok(new
    {
        data = usuarios,
        pagination = new
        {
            page = page,
            limit = limit,
            total = total,
            totalPages = (int)Math.Ceiling((double)total / limit)
        }
    });
});
```

**Node.js Ejemplo Completo:**
```javascript
app.get('/api/v1/usuarios', (req, res) => {
    const search = req.query.search;
    const role = req.query.role;
    const sort = req.query.sort || 'id';
    const order = req.query.order === 'desc' ? -1 : 1;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    
    let usuarios = db.usuarios.getAll();
    
    // FILTRAR - búsqueda
    if (search) {
        const searchLower = search.toLowerCase();
        usuarios = usuarios.filter(u =>
            u.nombre.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
    }
    
    // FILTRAR - rol
    if (role) {
        usuarios = usuarios.filter(u => u.role === role);
    }
    
    // CONTAR
    const total = usuarios.length;
    
    // ORDENAR
    usuarios.sort((a, b) => {
        return (a[sort] > b[sort] ? 1 : -1) * order;
    });
    
    // PAGINAR
    const offset = (page - 1) * limit;
    const data = usuarios.slice(offset, offset + limit);
    
    res.json({
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});
```

---

## 🚫 Errores Comunes

### ❌ Inyección SQL

```javascript
// MAL: Concatenar directamente
const query = `SELECT * FROM usuarios WHERE nombre LIKE '%${search}%'`;

// BIEN: Usar parámetros
const usuario = db.usuarios.findBySearch(search);
```

**Siempre usar ORMs o parámetros preparados.**

---

### ❌ Demasiados Filtros

```
GET /api/v1/usuarios?campo1=x&campo2=y&campo3=z&campo4=a&campo5=b...

// Complejo, poco mantenible
```

**Limitar a 5-10 filtros principales.**

---

### ❌ Campos Restringidos

```
GET /api/v1/ordenes?numeroTarjeta=*&nip=*

// ❌ Nunca exponer campos sensibles en filtros
```

**Validar qué campos son filtrables.**

---

## 🔒 Validación de Filtros

**C# Ejemplo de Validación:**
```csharp
var camposOrdenables = new[] { "id", "nombre", "createdAt", "precio" };
var camposFiltro = new[] { "rol", "estado", "categoria" };

if (!camposOrdenables.Contains(sort))
    return Results.BadRequest("Campo no válido para ordenar");

if (role != null && !camposFiltro.Contains("role"))
    return Results.BadRequest("No se puede filtrar por rol");
```

---

## 📝 Opciones de Query

**Estándar:**
```
?search=
?sort=
?order=
?page=
?limit=
```

**Alternativas comunes:**
```
?q= (en lugar de search)
?by= (en lugar de sort)
?offset=, ?skip=
?size=, ?take= (en lugar de limit)
```

**Elige UNA convención y mantén consistencia.**

---

## 💡 Mejores Prácticas

✅ Limita filtros a campos importantes
✅ Valida todas las entradas
✅ Usa ORMs para evitar SQL injection
✅ Documenta qué campos son filtrables
✅ Devuelve total en resultado
✅ Usa valores por defecto sensatos

---

## 🔗 Próximo Paso

Continúa con [Manejo de Errores REST](08-manejo-errores-rest.md) para respuestas de error consistentes.

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
