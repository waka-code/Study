# Qué es REST

## 📌 Definición

**REST (Representational State Transfer)** es una **arquitectura** para diseñar servicios web. No es un protocolo, sino un conjunto de principios y restricciones que determinan cómo usar HTTP de manera estándar y predecible.

REST fue propuesto por **Roy Fielding** en 2000 en su tesis doctoral.

---

## 🔑 Principios Fundamentales de REST

### 1. **Cliente-Servidor**

La arquitectura está separada en dos partes independientes:

```
┌──────────────┐          HTTP          ┌──────────────┐
│              │←────────────────────→│              │
│    Cliente   │                       │   Servidor   │
│              │                       │              │
└──────────────┘                       └──────────────┘
```

- **Cliente:** Solicita recursos, no conoce detalles de implementación
- **Servidor:** Proporciona recursos, sin conocer cómo el cliente los usa

**C# Ejemplo - Cliente:**
```csharp
using System.Net.Http;

var cliente = new HttpClient();
var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios");
var json = await response.Content.ReadAsStringAsync();
// El cliente no sabe cómo el servidor genera los datos
```

**Node.js Ejemplo - Cliente:**
```javascript
const response = await axios.get('https://api.ejemplo.com/usuarios');
console.log(response.data);
// El cliente no sabe detalles de la BD
```

---

### 2. **Stateless (Sin Estado)**

Cada solicitud contiene **toda la información** necesaria para procesarla. El servidor **NO mantiene contexto** entre solicitudes.

```
Solicitud 1 → Servidor (sin memoria)
Solicitud 2 → Servidor (sin memoria)
Solicitud 3 → Servidor (sin memoria)
```

**Ventajas:**
- ✅ Escalable (múltiples servidores)
- ✅ Confiable (sin estado perdido)
- ✅ Fácil de cachear

**C# Ejemplo:**
```csharp
// Cada solicitud es independiente
app.MapGet("/usuarios/{id}", (int id) =>
{
    // El servidor NO recuerda solicitudes anteriores
    var usuario = db.usuarios.ObtenerPorId(id);
    return Results.Ok(usuario);
});

// GET /usuarios/1 → Usuario 1
// GET /usuarios/2 → Usuario 2 (servidor no recuerda request 1)
```

---

### 3. **Cacheable**

Las respuestas deben indicar si son **cacheables** o no, permitiendo optimizar el rendimiento.

```http
GET /usuarios/1 HTTP/1.1

HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Content-Type: application/json

{"id": 1, "nombre": "Juan"}
```

El cliente puede cachear esta respuesta por 3600 segundos (1 hora).

**C# Servidor:**
```csharp
app.MapGet("/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    
    return Results.Ok(usuario);
    // El framework agrega headers de caché automáticamente
});
```

**Node.js Servidor:**
```javascript
app.get('/usuarios/:id', (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(usuario);
});
```

---

### 4. **Interfaz Uniforme**

REST define una interfaz estándar y consistente:

#### a) **Identificación de Recursos**
Cada recurso tiene una **URI única**:

```
/api/usuarios/123      ← Usuario con ID 123
/api/ordenes/456       ← Orden con ID 456
/api/productos/789     ← Producto con ID 789
```

#### b) **Manipulación mediante Representaciones**
El cliente manipula recursos usando su **representación**:

```json
// Representación JSON del usuario
{
  "id": 123,
  "nombre": "Juan",
  "email": "juan@ejemplo.com"
}
```

#### c) **Mensajes Auto-Descriptivos**
Cada mensaje incluye información sobre cómo procesarlo:

```http
GET /api/usuarios/123 HTTP/1.1
Accept: application/json
Authorization: Bearer token

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600

{"id": 123, "nombre": "Juan", "email": "juan@ejemplo.com"}
```

---

### 5. **Código Bajo Demanda (Opcional)**

El servidor puede enviar código ejecutable al cliente (ej: JavaScript):

```http
HTTP/1.1 200 OK
Content-Type: application/javascript

function procesarUsuario(user) {
    return user.nombre.toUpperCase();
}
```

**Nota:** Raramente usado en APIs modernas.

---

## 📊 Operaciones CRUD en REST

REST mapea las operaciones comunes (CRUD) a métodos HTTP:

| Operación | Método | Endpoint | Descripción |
|-----------|--------|----------|-------------|
| **Create** | POST | `/usuarios` | Crear nuevo usuario |
| **Read** | GET | `/usuarios/123` | Obtener usuario |
| **Update** | PUT/PATCH | `/usuarios/123` | Actualizar usuario |
| **Delete** | DELETE | `/usuarios/123` | Eliminar usuario |

---

## ✅ REST vs NO-REST

### ❌ NO-REST (RPC - Remote Procedure Call)

```
GET /obtenerUsuario?id=123
GET /crearUsuario?nombre=Juan&email=juan@ejemplo.com
POST /actualizarUsuario?id=123&nombre=Juan
GET /eliminarUsuario?id=123

// Problemas:
// - Nombres inconsistentes
// - No usa métodos HTTP correctamente
// - Difícil de cachear
// - No escalable
```

### ✅ REST (Correcto)

```
GET    /usuarios/123           → Obtener usuario
POST   /usuarios               → Crear usuario
PUT    /usuarios/123           → Actualizar usuario
DELETE /usuarios/123           → Eliminar usuario

// Ventajas:
// - Interfaz uniforme
// - Fácil de entender
// - Cacheable
// - Escalable
```

---

## 🎯 Niveles de Madurez REST (Richardson Maturity Model)

### Nivel 0: Punto de Partida (RPC)

```
POST /api
Body: { "operacion": "obtenerUsuario", "id": 123 }

// Todo es POST sin usar métodos HTTP
```

### Nivel 1: Recursos

```
GET /usuarios/123
POST /usuarios
DELETE /usuarios/123

// Usa URIs con recursos, pero no métodos HTTP
```

### Nivel 2: Métodos HTTP

```
GET    /usuarios/123
POST   /usuarios
PUT    /usuarios/123
DELETE /usuarios/123

// Usa métodos HTTP correctamente
// ✅ Mayoría de APIs están aquí
```

### Nivel 3: HATEOAS

```json
{
  "id": 123,
  "nombre": "Juan",
  "links": [
    { "rel": "self", "href": "/usuarios/123" },
    { "rel": "update", "href": "/usuarios/123", "method": "PUT" },
    { "rel": "delete", "href": "/usuarios/123", "method": "DELETE" }
  ]
}

// Respuestas incluyen links de navegación
// ⭐ Máximo nivel de REST (hipermedios)
```

---

## 🏗️ Ejemplo: Diseño REST Completo

### Recursos Identificados

```
Usuarios
├─ /usuarios           → Colección
├─ /usuarios/1         → Usuario individual
├─ /usuarios/1/ordenes → Órdenes de usuario 1
└─ /usuarios/1/ordenes/5 → Orden 5 del usuario 1

Órdenes
├─ /ordenes           → Colección
├─ /ordenes/5         → Orden individual
└─ /ordenes/5/items   → Items de la orden 5
```

### Operaciones REST

```
┌─────────────────────────────────────────────────────────┐
│              USUARIOS                                    │
├─────────────────────────────────────────────────────────┤
│ GET    /api/v1/usuarios                 → Listar        │
│ POST   /api/v1/usuarios                 → Crear         │
│ GET    /api/v1/usuarios/1               → Obtener       │
│ PUT    /api/v1/usuarios/1               → Actualizar    │
│ DELETE /api/v1/usuarios/1               → Eliminar      │
├─────────────────────────────────────────────────────────┤
│              ÓRDENES DE USUARIO                         │
├─────────────────────────────────────────────────────────┤
│ GET    /api/v1/usuarios/1/ordenes       → Listar        │
│ POST   /api/v1/usuarios/1/ordenes       → Crear         │
│ GET    /api/v1/usuarios/1/ordenes/5     → Obtener       │
│ PUT    /api/v1/usuarios/1/ordenes/5     → Actualizar    │
│ DELETE /api/v1/usuarios/1/ordenes/5     → Eliminar      │
└─────────────────────────────────────────────────────────┘
```

### C# Ejemplo

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// CRUD Usuarios
app.MapGet("/api/v1/usuarios", () => 
    Results.Ok(db.usuarios.ObtenerTodos()));

app.MapPost("/api/v1/usuarios", (UsuarioRequest req) =>
{
    var usuario = new Usuario { Nombre = req.Nombre, Email = req.Email };
    db.usuarios.Agregar(usuario);
    return Results.Created($"/api/v1/usuarios/{usuario.Id}", usuario);
});

app.MapGet("/api/v1/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    return usuario != null ? Results.Ok(usuario) : Results.NotFound();
});

app.MapPut("/api/v1/usuarios/{id}", (int id, UsuarioRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null) return Results.NotFound();
    
    usuario.Nombre = req.Nombre;
    usuario.Email = req.Email;
    db.usuarios.Actualizar(usuario);
    
    return Results.Ok(usuario);
});

app.MapDelete("/api/v1/usuarios/{id}", (int id) =>
{
    db.usuarios.Eliminar(id);
    return Results.NoContent();
});

// CRUD Órdenes de Usuario
app.MapGet("/api/v1/usuarios/{userId}/ordenes", (int userId) =>
{
    var ordenes = db.ordenes.ObtenerPorUsuario(userId);
    return Results.Ok(ordenes);
});

app.Run();

record UsuarioRequest(string Nombre, string Email);
```

### Node.js Ejemplo

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// CRUD Usuarios
app.get('/api/v1/usuarios', (req, res) => {
    const usuarios = db.usuarios.getAll();
    res.json(usuarios);
});

app.post('/api/v1/usuarios', (req, res) => {
    const usuario = { id: 1, ...req.body };
    db.usuarios.create(usuario);
    res.status(201).location(`/api/v1/usuarios/${usuario.id}`).json(usuario);
});

app.get('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.getById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    res.json(usuario);
});

app.put('/api/v1/usuarios/:id', (req, res) => {
    const usuario = db.usuarios.update(req.params.id, req.body);
    if (!usuario) return res.status(404).json({ error: 'No encontrado' });
    res.json(usuario);
});

app.delete('/api/v1/usuarios/:id', (req, res) => {
    db.usuarios.delete(req.params.id);
    res.sendStatus(204);
});

// CRUD Órdenes
app.get('/api/v1/usuarios/:userId/ordenes', (req, res) => {
    const ordenes = db.ordenes.getByUserId(req.params.userId);
    res.json(ordenes);
});

app.listen(3000);
```

---

## 💡 Mejores Prácticas REST Inmediatas

✅ Usa **sustantivos** para recursos (no verbos)
✅ Usa **métodos HTTP** correctamente (GET, POST, PUT, DELETE)
✅ Devuelve **códigos de estado** apropiados (200, 201, 404, 500)
✅ Usa **versionado** en la URL (/api/v1)
✅ Devuelve **JSON** como formato
✅ Usa **plural** para colecciones (/usuarios, no /usuario)
✅ Incluye **metadatos** útiles (timestamps, links)

---

## 🔗 Próximo Paso

Continúa con [Recursos y Endpoints](02-recursos-endpoints.md) para modelar recursos correctamente.

---

**Nivel de Dificultad:** ⭐ Básico
