# Ciclo Request → Response

## 📌 ¿Qué es el Ciclo Request-Response?

Es el flujo fundamental de HTTP donde:
1. **Cliente** envía una **REQUEST** (solicitud)
2. **Servidor** procesa y envía una **RESPONSE** (respuesta)

```
┌─────────────────────────────────────────────────────────────┐
│                   Ciclo HTTP Completo                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cliente                          Servidor                 │
│  ┌─────────┐                      ┌─────────┐             │
│  │         │ ── REQUEST HTTP ──→  │         │             │
│  │ Browser │                      │ Server  │             │
│  │         │ ←─ RESPONSE HTML ──  │         │             │
│  └─────────┘                      └─────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📤 HTTP REQUEST (Solicitud)

### Estructura de una Request

```
[Método] [Ruta] [Versión HTTP]
[Headers]
[Línea en blanco]
[Body opcional]
```

### Ejemplo Real

```http
GET /api/usuarios/123 HTTP/1.1
Host: api.ejemplo.com
Content-Type: application/json
Authorization: Bearer token123abc
User-Agent: Mozilla/5.0
Accept: application/json

```

### Componentes Detallados

#### 1. **Línea de Solicitud (Request Line)**

```
GET /api/usuarios/123 HTTP/1.1
│   │                 │
│   │                 └─ Versión HTTP
│   └─ Ruta del recurso
└─ Método HTTP
```

#### 2. **Headers (Encabezados)**

Son pares clave-valor que proporcionan información:

```
Host: api.ejemplo.com              ← Dominio del servidor
Content-Type: application/json     ← Tipo de datos que envío
Authorization: Bearer token123     ← Autenticación
User-Agent: Mozilla/5.0            ← Quién hace la solicitud
Accept: application/json           ← Qué tipo de respuesta quiero
Accept-Language: es-ES             ← Idioma preferido
Content-Length: 45                 ← Tamaño del body
```

#### 3. **Body (Cuerpo)**

Opcional, contiene datos que enviamos (generalmente JSON):

```json
{
    "nombre": "Juan",
    "email": "juan@ejemplo.com",
    "edad": 30
}
```

### Ejemplo: Request en C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class CrearRequest
{
    static async Task Main()
    {
        using (HttpClient cliente = new HttpClient())
        {
            var usuario = new { nombre = "Juan", email = "juan@ejemplo.com" };
            var json = JsonSerializer.Serialize(usuario);
            var contenido = new StringContent(json, Encoding.UTF8, "application/json");
            
            // Agregar headers
            cliente.DefaultRequestHeaders.Add("Authorization", "Bearer token123");
            
            // Enviar POST request
            var response = await cliente.PostAsync(
                "https://api.ejemplo.com/usuarios", 
                contenido
            );
            
            Console.WriteLine($"Status: {response.StatusCode}");
            Console.WriteLine($"Response: {await response.Content.ReadAsStringAsync()}");
        }
    }
}
```

### Ejemplo: Request en Node.js

```javascript
const axios = require('axios');

// Usando axios
async function crearRequest() {
    try {
        const usuario = {
            nombre: 'Juan',
            email: 'juan@ejemplo.com'
        };
        
        const response = await axios.post(
            'https://api.ejemplo.com/usuarios',
            usuario,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer token123',
                    'Accept': 'application/json'
                }
            }
        );
        
        console.log('Status:', response.status);
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

crearRequest();
```

```javascript
// Usando fetch (nativo)
async function crearRequestFetch() {
    const usuario = {
        nombre: 'Juan',
        email: 'juan@ejemplo.com'
    };
    
    const response = await fetch('https://api.ejemplo.com/usuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'Accept': 'application/json'
        },
        body: JSON.stringify(usuario)
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
}

crearRequestFetch();
```

## 📥 HTTP RESPONSE (Respuesta)

### Estructura de una Response

```
[Versión HTTP] [Código de Estado] [Descripción]
[Headers]
[Línea en blanco]
[Body]
```

### Ejemplo Real

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 120
Date: Mon, 05 Feb 2026 10:30:00 GMT
Server: Apache/2.4

{"id": 123, "nombre": "Juan", "email": "juan@ejemplo.com"}
```

### Componentes Detallados

#### 1. **Línea de Estado (Status Line)**

```
HTTP/1.1 200 OK
│        │   │
│        │   └─ Descripción legible
│        └─ Código de estado
└─ Versión HTTP
```

#### 2. **Headers (Encabezados)**

```
Content-Type: application/json        ← Tipo de contenido
Content-Length: 120                   ← Tamaño del body
Date: Mon, 05 Feb 2026 10:30:00 GMT  ← Cuándo se genera
Server: Apache/2.4                    ← Tipo de servidor
Set-Cookie: sessionId=abc123          ← Cookies para el cliente
Cache-Control: max-age=3600           ← Instrucciones de caché
```

#### 3. **Body (Cuerpo)**

El contenido real devuelto:

```json
{
    "id": 123,
    "nombre": "Juan",
    "email": "juan@ejemplo.com",
    "createdAt": "2026-02-05"
}
```

### Ejemplo: Response en C#

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using System;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapPost("/api/usuarios", async (UsuarioRequest req, HttpContext context) =>
{
    // Validación
    if (string.IsNullOrEmpty(req.Nombre))
    {
        context.Response.StatusCode = 400; // Bad Request
        context.Response.ContentType = "application/json";
        return Results.Json(new { error = "El nombre es requerido" });
    }
    
    // Procesar
    var usuarioCreado = new 
    { 
        id = 1, 
        nombre = req.Nombre, 
        email = req.Email,
        createdAt = DateTime.UtcNow
    };
    
    // Response exitosa
    context.Response.StatusCode = 201; // Created
    context.Response.Headers.Add("Location", "/api/usuarios/1");
    return Results.Json(usuarioCreado);
});

app.Run();

record UsuarioRequest(string Nombre, string Email);
```

### Ejemplo: Response en Node.js (Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/usuarios', (req, res) => {
    const { nombre, email } = req.body;
    
    // Validación
    if (!nombre) {
        return res.status(400).json({ 
            error: 'El nombre es requerido' 
        });
    }
    
    // Procesar
    const usuarioCreado = {
        id: 1,
        nombre,
        email,
        createdAt: new Date()
    };
    
    // Response exitosa
    res.status(201)
       .location('/api/usuarios/1')
       .json(usuarioCreado);
});

app.listen(3000);
```

## 🔄 Flujo Completo Paso a Paso

### Paso 1: Cliente Prepara Request

```javascript
// Cliente en Node.js
const usuario = { nombre: 'Juan', email: 'juan@ejemplo.com' };

fetch('http://localhost:3000/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usuario)
});
```

### Paso 2: Servidor Recibe Request

```javascript
// Servidor Express escucha
app.post('/api/usuarios', (req, res) => {
    console.log('Recibido:', req.body);
    // {nombre: 'Juan', email: 'juan@ejemplo.com'}
```

### Paso 3: Servidor Procesa

```javascript
    // Validar
    if (!req.body.nombre) {
        return res.status(400).json({ error: 'Nombre requerido' });
    }
    
    // Guardar en base de datos
    const usuario = db.usuarios.crear(req.body);
```

### Paso 4: Servidor Construye Response

```javascript
    // Construir response
    const response = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
    };
```

### Paso 5: Servidor Envía Response

```javascript
    // Enviar response
    res.status(201)
       .json(response);
    // HTTP/1.1 201 Created
    // Content-Type: application/json
    // {"id": 1, "nombre": "Juan", ...}
});
```

### Paso 6: Cliente Recibe Response

```javascript
    .then(response => response.json())
    .then(data => console.log('Creado:', data))
    // Creado: {id: 1, nombre: 'Juan', ...}
```

## 📊 Diagrama de Tiempo

```
Tiempo →

Cliente:  [Prepare]  [Send]  [Wait]        [Receive]  [Process]
           ────────────↓──────────────────────↑────────────
Servidor:             [Receive] [Process] [Send]
```

## 🔍 Headers Importantes en Request-Response

### Request Headers

| Header | Ejemplo | Propósito |
|--------|---------|-----------|
| `Host` | `api.ejemplo.com` | Dominio destino |
| `Content-Type` | `application/json` | Tipo de body enviado |
| `Authorization` | `Bearer token123` | Credenciales |
| `Accept` | `application/json` | Qué tipo espero recibir |
| `User-Agent` | `Chrome/90.0` | Cliente que hace la solicitud |

### Response Headers

| Header | Ejemplo | Propósito |
|--------|---------|-----------|
| `Content-Type` | `application/json` | Tipo del body recibido |
| `Content-Length` | `256` | Tamaño del body |
| `Status` | `200 OK` | Resultado de la operación |
| `Set-Cookie` | `sessionId=abc` | Guardar cookie en cliente |
| `Location` | `/api/usuarios/1` | Ubicación del recurso creado |

## 💡 Conceptos Clave

✅ **Request** siempre va primero (cliente → servidor)
✅ **Response** es la reacción (servidor → cliente)
✅ Ambas tienen **headers** y opcionalmente **body**
✅ El **método HTTP** define qué hacer con el recurso
✅ El **código de estado** indica el resultado

## 🔗 Próximo Paso

Continúa con [Métodos HTTP](04-metodos-http.md) para aprender qué hace cada método.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
