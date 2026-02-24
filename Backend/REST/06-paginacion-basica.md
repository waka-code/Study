# Paginación Básica

## 📌 ¿Por Qué Paginar?

Imagina una tabla con **1 millón de registros**:

```
Sin paginación:
GET /api/v1/usuarios
Respuesta: 1,000,000 usuarios en JSON (cientos de MB)
❌ Tiempo de respuesta: 30+ segundos
❌ Uso de memoria: Enorme
❌ Ancho de banda: Agotado

Con paginación:
GET /api/v1/usuarios?pagina=1&limite=10
Respuesta: 10 usuarios en JSON (1-2 KB)
✅ Tiempo de respuesta: <100ms
✅ Uso de memoria: Mínimo
✅ Ancho de banda: Eficiente
```

---

## 🔑 Conceptos Clave

### Parámetros Principales

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| **page** o **pagina** | Número de página | `?page=1` |
| **limit** o **limite** | Items por página | `?limit=10` |
| **offset** | Desplazamiento | `?offset=20` |
| **sort** | Campo para ordenar | `?sort=nombre` |
| **order** | Dirección | `?order=asc` |

---

## 📋 Estrategias de Paginación

### 1. **Offset/Limit** (Más Común)

Especifica cuántos items saltar y cuántos traer:

```
GET /api/v1/usuarios?offset=0&limit=10      → Items 0-9
GET /api/v1/usuarios?offset=10&limit=10     → Items 10-19
GET /api/v1/usuarios?offset=20&limit=10     → Items 20-29
```

**O con página:**

```
GET /api/v1/usuarios?page=1&limit=10        → Page 1 (items 0-9)
GET /api/v1/usuarios?page=2&limit=10        → Page 2 (items 10-19)
GET /api/v1/usuarios?page=3&limit=10        → Page 3 (items 20-29)

Formula: offset = (page - 1) * limit
```

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", (int page = 1, int limit = 10) =>
{
    // Validar
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;  // Limitar máximo
    
    // Calcular offset
    int offset = (page - 1) * limit;
    
    // Contar total
    int total = db.usuarios.Count();
    
    // Obtener página
    var usuarios = db.usuarios
        .OrderBy(u => u.Id)
        .Skip(offset)
        .Take(limit)
        .ToList();
    
    // Calcular información de paginación
    int totalPages = (int)Math.Ceiling((double)total / limit);
    
    return Results.Ok(new
    {
        data = usuarios,
        pagination = new
        {
            page = page,
            limit = limit,
            total = total,
            totalPages = totalPages,
            hasNext = page < totalPages,
            hasPrev = page > 1
        }
    });
});
```

**Node.js Ejemplo:**
```javascript
app.get('/api/v1/usuarios', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    
    // Calcular offset
    const offset = (page - 1) * limit;
    
    // Contar total
    const usuarios = db.usuarios.getAll();
    const total = usuarios.length;
    
    // Obtener página
    const data = usuarios.slice(offset, offset + limit);
    
    // Calcular información
    const totalPages = Math.ceil(total / limit);
    
    res.json({
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    });
});
```

---

### 2. **Cursor-Based** (Para APIs de Alto Rendimiento)

Usa un cursor (identificador) en lugar de offset:

```
GET /api/v1/usuarios?cursor=abc123&limit=10
```

**Ventajas:**
- ✅ Más rápido con bases de datos grandes
- ✅ Evita problemas con datos que cambian
- ✅ Usado por APIs modernas (Twitter, Facebook)

**Desventajas:**
- ❌ Más complejo de implementar
- ❌ No puedes saltar a página específica

**C# Ejemplo:**
```csharp
app.MapGet("/api/v1/usuarios", (string cursor = null, int limit = 10) =>
{
    var query = db.usuarios.OrderBy(u => u.Id);
    
    // Si hay cursor, filtrar desde ese punto
    if (!string.IsNullOrEmpty(cursor))
    {
        int cursorId = int.Parse(cursor);
        query = query.Where(u => u.Id > cursorId);
    }
    
    // Obtener limit + 1 para saber si hay más
    var usuarios = query.Take(limit + 1).ToList();
    
    bool hasMore = usuarios.Count > limit;
    if (hasMore)
        usuarios.RemoveAt(usuarios.Count - 1); // Quitar el extra
    
    // Próximo cursor es el último ID
    string nextCursor = usuarios.Count > 0 ? usuarios.Last().Id.ToString() : null;
    
    return Results.Ok(new
    {
        data = usuarios,
        pagination = new
        {
            cursor = nextCursor,
            hasMore = hasMore,
            limit = limit
        }
    });
});
```

---

## 📊 Respuesta de Paginación

### Formato Estándar

```json
{
  "data": [
    { "id": 1, "nombre": "Juan" },
    { "id": 2, "nombre": "María" },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 250,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Formato Alternativo (Metadata)

```json
{
  "data": [...],
  "meta": {
    "count": 10,
    "total": 250,
    "pages": 25,
    "currentPage": 1
  },
  "links": {
    "first": "/api/v1/usuarios?page=1",
    "next": "/api/v1/usuarios?page=2",
    "last": "/api/v1/usuarios?page=25"
  }
}
```

---

## 🎯 Paginación + Filtros + Ordenamiento

Combinar todo:

```
GET /api/v1/usuarios?page=1&limit=10&role=admin&sort=nombre&order=asc
```

**C# Ejemplo Completo:**
```csharp
app.MapGet("/api/v1/usuarios", (
    int page = 1,
    int limit = 10,
    string role = null,
    string sort = "id",
    string order = "asc") =>
{
    // Validación
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;
    
    // Query base
    var query = db.usuarios.AsQueryable();
    
    // FILTRAR
    if (!string.IsNullOrEmpty(role))
        query = query.Where(u => u.Rol == role);
    
    // ORDENAR
    query = order.ToLower() == "desc" 
        ? query.OrderByDescending(u => EF.Property<object>(u, sort))
        : query.OrderBy(u => EF.Property<object>(u, sort));
    
    // CONTAR
    int total = query.Count();
    
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const role = req.query.role;
    const sort = req.query.sort || 'id';
    const order = req.query.order === 'desc' ? -1 : 1;
    
    // Obtener todos (en producción, desde BD)
    let usuarios = db.usuarios.getAll();
    
    // FILTRAR
    if (role) {
        usuarios = usuarios.filter(u => u.rol === role);
    }
    
    // ORDENAR
    usuarios.sort((a, b) => {
        return (a[sort] > b[sort] ? 1 : -1) * order;
    });
    
    // CONTAR
    const total = usuarios.length;
    
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

## ⚙️ Límites y Validación

### Límites Recomendados

```
Mínimo por página: 1
Máximo por página: 100
Por defecto: 10-20
```

**C# Validación:**
```csharp
int limit = req.Query["limit"] != null ? int.Parse(req.Query["limit"]) : 10;

// Asegurar que está en rango
limit = Math.Max(1, Math.Min(100, limit));
```

### Evitar Problemas de Performance

```
❌ MALO
GET /api/v1/usuarios?limit=10000
GET /api/v1/usuarios?offset=9999990&limit=10

✅ BUENO
GET /api/v1/usuarios?limit=100
GET /api/v1/usuarios?page=5&limit=10
```

---

## 🔍 Links HATEOAS (Opcional)

Incluir links a otras páginas:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "totalPages": 25
  },
  "links": {
    "first": "/api/v1/usuarios?page=1",
    "prev": "/api/v1/usuarios?page=1",
    "next": "/api/v1/usuarios?page=3",
    "last": "/api/v1/usuarios?page=25"
  }
}
```

**C# Ejemplo:**
```csharp
var response = new
{
    data = usuarios,
    pagination = new { page, limit, total },
    links = new
    {
        first = $"/api/v1/usuarios?page=1&limit={limit}",
        prev = page > 1 ? $"/api/v1/usuarios?page={page-1}&limit={limit}" : null,
        next = page < totalPages ? $"/api/v1/usuarios?page={page+1}&limit={limit}" : null,
        last = $"/api/v1/usuarios?page={totalPages}&limit={limit}"
    }
};

return Results.Ok(response);
```

---

## 📝 Headers Útiles

```
Link: </api/v1/usuarios?page=2>; rel="next"
Link: </api/v1/usuarios?page=1>; rel="first"
X-Total-Count: 250
X-Page-Number: 1
X-Page-Size: 10
```

**C# Ejemplo:**
```csharp
context.Response.Headers.Add("X-Total-Count", total.ToString());
context.Response.Headers.Add("X-Page-Number", page.ToString());
context.Response.Headers.Add("X-Page-Size", limit.ToString());
```

---

## 💡 Mejores Prácticas

✅ Usa offset/limit por defecto
✅ Incluye total en respuesta
✅ Limita el máximo por página
✅ Devuelve hasNext/hasPrev
✅ Ordena consistentemente
✅ Cachea cuando sea posible

---

## 🔗 Próximo Paso

Continúa con [Filtrado y Ordenamiento](07-filtrado-ordenamiento.md) para búsquedas avanzadas.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
