# Idempotencia

## 📌 ¿Qué es Idempotencia?

**Idempotencia** es una propiedad matemática que en HTTP significa que **múltiples llamadas idénticas producen el mismo resultado** que una sola llamada.

```
Llamada 1 → Resultado
Llamada 2 → Mismo Resultado
Llamada 3 → Mismo Resultado
```

La idempotencia es **crítica** para la confiabilidad de APIs y sistemas distribuidos.

---

## 🔄 Idempotente vs No-Idempotente

### Operaciones Idempotentes

| Método | Idempotente | Por qué |
|--------|------------|---------|
| **GET** | ✅ Sí | No modifica datos |
| **PUT** | ✅ Sí | Reemplaza completo |
| **PATCH** | ✅ Sí | Actualización descriptiva |
| **DELETE** | ✅ Sí | Resultado final: eliminado |
| **HEAD** | ✅ Sí | Solo metadata |
| **OPTIONS** | ✅ Sí | Solo información |

### Operaciones No-Idempotentes

| Método | No-Idempotente | Por qué |
|--------|----------------|---------|
| **POST** | ❌ No | Crea nuevo recurso cada vez |

---

## 📚 Ejemplos Detallados

### 1️⃣ GET - Idempotente

```
GET /usuarios/1
GET /usuarios/1  ← Mismo resultado
GET /usuarios/1  ← Mismo resultado
```

**C# Ejemplo:**
```csharp
// Múltiples llamadas = mismo resultado
var usuario1 = await cliente.GetAsync("https://api.ejemplo.com/usuarios/1");
var usuario2 = await cliente.GetAsync("https://api.ejemplo.com/usuarios/1");
var usuario3 = await cliente.GetAsync("https://api.ejemplo.com/usuarios/1");

// usuario1.Content ≈ usuario2.Content ≈ usuario3.Content
```

**Node.js Ejemplo:**
```javascript
// Múltiples llamadas = mismo resultado
const res1 = await axios.get('http://localhost:3000/usuarios/1');
const res2 = await axios.get('http://localhost:3000/usuarios/1');
const res3 = await axios.get('http://localhost:3000/usuarios/1');

// res1.data === res2.data === res3.data
```

**Por qué es idempotente:** GET nunca modifica datos, solo los obtiene.

---

### 2️⃣ POST - NO Idempotente

```
POST /usuarios
Body: { nombre: "Juan" }
→ Crea usuario 1

POST /usuarios
Body: { nombre: "Juan" }  ← Mismo body
→ Crea usuario 2 (DUPLICADO!)

POST /usuarios
Body: { nombre: "Juan" }  ← Mismo body
→ Crea usuario 3 (DUPLICADO!)
```

**❌ Problema: Sin idempotencia**

```csharp
// Cliente C#
var usuario = new { nombre = "Juan" };
var json = JsonSerializer.Serialize(usuario);

// Intento 1
var res1 = await cliente.PostAsync("api/usuarios", 
    new StringContent(json, Encoding.UTF8, "application/json"));

// Red error, reintentar
// Intento 2
var res2 = await cliente.PostAsync("api/usuarios", 
    new StringContent(json, Encoding.UTF8, "application/json"));

// Se crean 2 usuarios con el mismo nombre!
```

**✅ Solución: Usar un ID Único (Idempotency Key)**

```csharp
// Agregar header Idempotency-Key
var idempotencyKey = Guid.NewGuid().ToString();

var request = new HttpRequestMessage(HttpMethod.Post, "api/usuarios");
request.Content = new StringContent(json, Encoding.UTF8, "application/json");
request.Headers.Add("Idempotency-Key", idempotencyKey);

// Intento 1
var res1 = await cliente.SendAsync(request);

// Intento 2 (mismo key)
request = new HttpRequestMessage(HttpMethod.Post, "api/usuarios");
request.Content = new StringContent(json, Encoding.UTF8, "application/json");
request.Headers.Add("Idempotency-Key", idempotencyKey);

var res2 = await cliente.SendAsync(request);
// Se devuelve el usuario creado en el intento 1
```

**Servidor C# con Idempotency-Key:**
```csharp
using System;
using System.Collections.Generic;

var idempotencyCache = new Dictionary<string, object>();

app.MapPost("/usuarios", (HttpContext context, UsuarioRequest req) =>
{
    var idempotencyKey = context.Request.Headers["Idempotency-Key"].ToString();
    
    if (string.IsNullOrEmpty(idempotencyKey))
        return Results.BadRequest("Idempotency-Key requerido");
    
    // Verificar si ya procesamos esta solicitud
    if (idempotencyCache.TryGetValue(idempotencyKey, out var resultado))
    {
        return Results.Ok(resultado); // Devolver resultado anterior
    }
    
    // Crear usuario
    var usuarioCreado = new { id = 1, nombre = req.Nombre };
    
    // Guardar en caché
    idempotencyCache[idempotencyKey] = usuarioCreado;
    
    return Results.Created("/usuarios/1", usuarioCreado);
});

record UsuarioRequest(string Nombre);
```

**Node.js con Idempotency-Key:**
```javascript
const express = require('express');
const app = express();

app.use(express.json());

const idempotencyCache = {};

app.post('/usuarios', (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];
    
    if (!idempotencyKey) {
        return res.status(400).json({ error: 'Idempotency-Key requerido' });
    }
    
    // Si ya procesamos esta solicitud
    if (idempotencyCache[idempotencyKey]) {
        return res.status(201).json(idempotencyCache[idempotencyKey]);
    }
    
    // Crear usuario
    const usuarioCreado = { id: 1, nombre: req.body.nombre };
    
    // Guardar en caché
    idempotencyCache[idempotencyKey] = usuarioCreado;
    
    res.status(201).json(usuarioCreado);
});

app.listen(3000);
```

---

### 3️⃣ PUT - Idempotente

```
PUT /usuarios/1
Body: { nombre: "Juan García", edad: 31 }
→ Actualiza usuario 1

PUT /usuarios/1
Body: { nombre: "Juan García", edad: 31 }  ← Mismo body
→ Actualiza igual (mismo resultado)

PUT /usuarios/1
Body: { nombre: "Juan García", edad: 31 }  ← Mismo body
→ Actualiza igual (mismo resultado)
```

**✅ Por qué es idempotente:** PUT reemplaza completamente el recurso, independientemente de cuántas veces se llame.

**C# Ejemplo:**
```csharp
var usuario = new { nombre = "Juan García", edad = 31 };
var json = JsonSerializer.Serialize(usuario);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

// Intento 1
var res1 = await cliente.PutAsync("https://api.ejemplo.com/usuarios/1", contenido);

// Intento 2 (reintento, misma solicitud)
contenido = new StringContent(json, Encoding.UTF8, "application/json");
var res2 = await cliente.PutAsync("https://api.ejemplo.com/usuarios/1", contenido);

// Intento 3 (reintento, misma solicitud)
contenido = new StringContent(json, Encoding.UTF8, "application/json");
var res3 = await cliente.PutAsync("https://api.ejemplo.com/usuarios/1", contenido);

// Los 3 intentos tienen el mismo resultado: usuario actualizado
```

**Servidor C# con PUT:**
```csharp
app.MapPut("/usuarios/{id}", (int id, UsuarioRequest req) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    if (usuario == null) return Results.NotFound();
    
    // Reemplazar completamente
    usuario.Nombre = req.Nombre;
    usuario.Edad = req.Edad;
    db.usuarios.Guardar(usuario);
    
    return Results.Ok(usuario);
});
```

---

### 4️⃣ PATCH - Idempotente

```
PATCH /usuarios/1
Body: { nombre: "Juan García" }
→ Actualiza nombre

PATCH /usuarios/1
Body: { nombre: "Juan García" }  ← Mismo body
→ Actualiza igual (mismo resultado)

PATCH /usuarios/1
Body: { nombre: "Juan García" }  ← Mismo body
→ Actualiza igual (mismo resultado)
```

**✅ Por qué es idempotente:** PATCH actualiza descriptivamente, múltiples actualizaciones del mismo valor = mismo resultado final.

**Node.js Ejemplo:**
```javascript
const actualizacion = { nombre: "Juan García" };

// Intento 1
await axios.patch('http://localhost:3000/usuarios/1', actualizacion);

// Intento 2 (reintento)
await axios.patch('http://localhost:3000/usuarios/1', actualizacion);

// Intento 3 (reintento)
await axios.patch('http://localhost:3000/usuarios/1', actualizacion);

// Los 3 intentos: nombre = "Juan García"
```

---

### 5️⃣ DELETE - Idempotente

```
DELETE /usuarios/1
→ Elimina usuario 1

DELETE /usuarios/1
→ Ya está eliminado (estado final: eliminado)

DELETE /usuarios/1
→ Ya está eliminado (estado final: eliminado)
```

**✅ Por qué es idempotente:** El estado final es "eliminado", múltiples llamadas mantienen ese estado.

**C# Ejemplo:**
```csharp
// Intento 1
var res1 = await cliente.DeleteAsync("https://api.ejemplo.com/usuarios/1");
// 204 No Content - Eliminado

// Intento 2 (reintento, usuario ya no existe)
var res2 = await cliente.DeleteAsync("https://api.ejemplo.com/usuarios/1");
// 204 No Content - Ya no existe

// Intento 3 (reintento, usuario ya no existe)
var res3 = await cliente.DeleteAsync("https://api.ejemplo.com/usuarios/1");
// 204 No Content - Ya no existe

// Todos devuelven 204, resultado final: recurso no existe
```

**Servidor C# con DELETE:**
```csharp
app.MapDelete("/usuarios/{id}", (int id) =>
{
    var usuario = db.usuarios.ObtenerPorId(id);
    
    if (usuario != null)
        db.usuarios.Eliminar(id);
    
    // Devolver 204 en ambos casos (no existe o fue eliminado)
    return Results.NoContent();
});
```

---

## 💡 Por qué Importa Idempotencia

### Problema: Red Inestable

```
Cliente intenta POST /usuarios
└─ Envía solicitud
   └─ Servidor procesa
      └─ Envía respuesta
         └─ ❌ Respuesta se pierde en la red
            
Cliente reintentar automáticamente (no sabe si se procesó)
└─ Envía mismo POST /usuarios
   └─ Servidor procesa NUEVAMENTE
      └─ Se crean 2 usuarios idénticos
```

### Solución: Operaciones Idempotentes

```
Cliente intenta POST /usuarios con Idempotency-Key
└─ Envía solicitud
   └─ Servidor procesa Y guarda resultado con key
      └─ Envía respuesta
         └─ ❌ Respuesta se pierde en la red
            
Cliente reintentar automáticamente
└─ Envía mismo POST /usuarios con misma Idempotency-Key
   └─ Servidor ve que ya procesó esta key
      └─ Devuelve resultado anterior
         └─ ✅ No crea duplicados
```

---

## 🎯 Implementar Idempotencia Correctamente

### Pasos

1. **Cliente:** Generar `Idempotency-Key` único
2. **Cliente:** Incluir en header de POST
3. **Servidor:** Verificar si key ya fue procesada
4. **Servidor:** Si sí, devolver resultado anterior
5. **Servidor:** Si no, procesar y guardar resultado

### C# - Implementación Completa

```csharp
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var idempotencyCache = new Dictionary<string, (int statusCode, object data)>();

app.MapPost("/usuarios", (HttpContext context, UsuarioRequest req) =>
{
    var key = context.Request.Headers["Idempotency-Key"].ToString();
    
    if (string.IsNullOrEmpty(key))
        return Results.BadRequest("Idempotency-Key requerido");
    
    // Verificar caché
    if (idempotencyCache.TryGetValue(key, out var cached))
    {
        return Results.StatusCode(cached.statusCode)(cached.data);
    }
    
    // Crear recurso
    var usuario = new { id = 1, nombre = req.Nombre };
    
    // Guardar en caché
    idempotencyCache[key] = (201, usuario);
    
    return Results.Created("/usuarios/1", usuario);
});

app.Run();

record UsuarioRequest(string Nombre);
```

### Node.js - Implementación Completa

```javascript
const express = require('express');
const app = express();

app.use(express.json());

const idempotencyCache = {};

// Middleware para verificar Idempotency-Key
const idempotencyMiddleware = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const key = req.headers['idempotency-key'];
        
        if (!key) {
            return res.status(400).json({ error: 'Idempotency-Key requerido' });
        }
        
        // Si ya procesamos, devolver resultado anterior
        if (idempotencyCache[key]) {
            const cached = idempotencyCache[key];
            return res.status(cached.statusCode).json(cached.data);
        }
    }
    
    next();
};

app.use(idempotencyMiddleware);

app.post('/usuarios', (req, res) => {
    const key = req.headers['idempotency-key'];
    
    // Crear usuario
    const usuario = { id: 1, nombre: req.body.nombre };
    
    // Guardar en caché
    idempotencyCache[key] = {
        statusCode: 201,
        data: usuario
    };
    
    res.status(201).json(usuario);
});

app.listen(3000);
```

---

## 🔍 Headers de Idempotencia

### Idempotency-Key (RFC 7231)

El estándar actual para indicar operaciones idempotentes:

```http
POST /usuarios HTTP/1.1
Host: api.ejemplo.com
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{"nombre": "Juan"}
```

**Características:**
- ✅ UUID único por solicitud
- ✅ Debe ser constante en reintentos
- ✅ El servidor devuelve resultado anterior si existe

---

## 📊 Tabla de Idempotencia

| Método | Idempotente | Necesita Key | Cuándo Úsalo |
|--------|------------|-------------|-----------|
| GET | ✅ Sí | No | Obtener datos |
| POST | ❌ No | ✅ Sí | Crear recurso |
| PUT | ✅ Sí | No | Actualizar completo |
| PATCH | ✅ Sí | No | Actualizar parcial |
| DELETE | ✅ Sí | No | Eliminar |

---

## 💡 Mejores Prácticas

✅ POST debe usar `Idempotency-Key`
✅ PUT/PATCH/DELETE son idempotentes por defecto
✅ Guardar resultados en caché temporal (5-24 horas)
✅ Generar UUID único por solicitud
✅ Mantener consistencia en reintentos automáticos

## 🔗 Próximo Paso

Continúa con [Stateless vs Stateful](09-stateless-vs-stateful.md) para entender la gestión de estado.

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
