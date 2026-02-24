# Stateless vs Stateful

## 📌 ¿Qué es el Estado?

El **estado** es la información que el servidor **recuerda** sobre un cliente o solicitud anterior. Determine si el servidor necesita recordar algo o no es fundamental en el diseño de APIs.

```
Stateless:  Servidor NO recuerda → Cada solicitud es independiente
Stateful:   Servidor SÍ recuerda → Las solicitudes están conectadas
```

---

## 🔄 HTTP es Stateless por Defecto

**HTTP es un protocolo sin estado** por diseño:

```
Solicitud 1: GET /usuarios/1
└─ Servidor procesa → Respuesta

Solicitud 2: GET /usuarios/2
└─ Servidor: "¿Quién eres? No recuerdo la solicitud 1"
   Procesa desde cero → Respuesta

Solicitud 3: DELETE /usuarios/1
└─ Servidor: "¿Quién eres? ¿Qué es eso de usuarios?"
   Procesa desde cero → Respuesta
```

Cada solicitud es completamente independiente. El servidor no mantiene información sobre solicitudes anteriores.

---

## ⭐ Stateless - Sin Estado

### Definición

El servidor **no mantiene información** sobre el cliente. Cada solicitud contiene toda la información necesaria.

### Características

✅ Escalable - Fácil agregar más servidores
✅ Confiable - Sin información perdida
✅ Simple - Menos complejidad
✅ Cacheable - Cada respuesta es independiente
✅ HTTP nativo - Diseñado así

### Ejemplo: Stateless

```
Cliente envía:
GET /usuarios/123 HTTP/1.1
Host: api.ejemplo.com

Servidor recibe solicitud
└─ "Nunca vi este cliente"
└─ Busca usuario 123 en BD
└─ Devuelve usuario 123

Cliente envía:
GET /usuarios/456 HTTP/1.1
Host: api.ejemplo.com

Servidor recibe solicitud
└─ "Nunca vi este cliente" (no recuerda anterior)
└─ Busca usuario 456 en BD
└─ Devuelve usuario 456
```

### Ejemplo Stateless: C#

```csharp
// Cada request es independiente
app.MapGet("/usuarios/{id}", (int id) =>
{
    // El servidor NO recuerda solicitudes anteriores
    // Busca directamente en BD por ID
    var usuario = db.usuarios.ObtenerPorId(id);
    
    if (usuario == null)
        return Results.NotFound();
    
    return Results.Ok(usuario);
});

// Cliente 1 solicita
// GET /usuarios/1 → Obtiene usuario 1

// Cliente 2 solicita
// GET /usuarios/2 → Obtiene usuario 2 (servidor no recuerda cliente 1)

// Cliente 1 solicita nuevamente
// GET /usuarios/1 → Obtiene usuario 1 (servidor procesa igual)
```

### Ejemplo Stateless: Node.js

```javascript
const express = require('express');
const app = express();

app.get('/usuarios/:id', (req, res) => {
    // Cada request es independiente
    const userId = req.params.id;
    
    // El servidor NO recuerda sesiones anteriores
    const usuario = db.usuarios.findById(userId);
    
    if (!usuario) {
        return res.status(404).json({ error: 'No encontrado' });
    }
    
    res.json(usuario);
});

// GET /usuarios/1 → Usuario 1
// GET /usuarios/2 → Usuario 2
// GET /usuarios/1 → Usuario 1 (igual que primera vez)
```

### Ventaja Stateless: Escalabilidad

```
┌──────────┐
│ Cliente  │
└──────────┘
      │
      ├─→ Servidor 1: GET /usuarios/1 ✓
      │
      ├─→ Servidor 2: GET /usuarios/2 ✓ (No necesita info de Servidor 1)
      │
      └─→ Servidor 3: GET /usuarios/1 ✓ (Igual respuesta)

Todos los servidores pueden responder la misma solicitud
```

---

## 🔐 Stateful - Con Estado

### Definición

El servidor **mantiene información** sobre el cliente entre solicitudes. Las solicitudes están conectadas por el estado del servidor.

### Características

❌ Menos escalable - Perder servidor = perder estado
❌ Complejo - Sincronizar estado entre servidores
❌ Riesgoso - Si servidor falla, se pierde información
✅ Útil - Para ciertos casos (sesiones, transacciones)

### Ejemplo: Stateful

```
Cliente 1 conecta
└─ Servidor recuerda: "Cliente 1 conectado"

Cliente 1 envía: Iniciar compra
└─ Servidor recuerda: "Cliente 1 está en proceso de compra"

Cliente 1 envía: Agregar producto
└─ Servidor: "Cliente 1 está en compra, agrego producto"
└─ Servidor recuerda: "Cliente 1 tiene 1 producto en carrito"

Cliente 1 envía: Agregar otro producto
└─ Servidor: "Cliente 1 tiene 1 producto, agrego otro"
└─ Servidor recuerda: "Cliente 1 tiene 2 productos"

Cliente 1 desconecta
└─ Servidor olvida todo sobre Cliente 1
```

### Ejemplo Stateful: C#

```csharp
using System;
using System.Collections.Generic;

// Base de datos en memoria para sesiones (MALO en producción)
var sesiones = new Dictionary<string, SesionUsuario>();

app.MapPost("/login", (LoginRequest req, HttpContext context) =>
{
    var usuario = db.usuarios.ValidarCredenciales(req.Email, req.Password);
    
    if (usuario == null)
        return Results.Unauthorized();
    
    // Crear sesión (ESTADO)
    var sessionId = Guid.NewGuid().ToString();
    var sesion = new SesionUsuario
    {
        UsuarioId = usuario.Id,
        FechaLogin = DateTime.UtcNow,
        Carrito = new List<int>()
    };
    
    sesiones[sessionId] = sesion;
    
    // Guardar cookie
    context.Response.Cookies.Append("sessionId", sessionId, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict
    });
    
    return Results.Ok("Login exitoso");
});

// Servidor RECUERDA la sesión
app.MapPost("/carrito/agregar", (int productoId, HttpContext context) =>
{
    var sessionId = context.Request.Cookies["sessionId"];
    
    if (!sesiones.TryGetValue(sessionId, out var sesion))
        return Results.Unauthorized();
    
    // Usar información guardada (ESTADO)
    sesion.Carrito.Add(productoId);
    
    return Results.Ok(new { carritoCount = sesion.Carrito.Count });
});

// Recuperar carrito
app.MapGet("/carrito", (HttpContext context) =>
{
    var sessionId = context.Request.Cookies["sessionId"];
    
    if (!sesiones.TryGetValue(sessionId, out var sesion))
        return Results.Unauthorized();
    
    // Devolver estado guardado
    return Results.Ok(new { productos = sesion.Carrito });
});

record LoginRequest(string Email, string Password);
record SesionUsuario
{
    public int UsuarioId { get; set; }
    public DateTime FechaLogin { get; set; }
    public List<int> Carrito { get; set; }
}
```

### Ejemplo Stateful: Node.js

```javascript
const express = require('express');
const session = require('express-session');

const app = express();

// Configurar sesiones (ESTADO)
app.use(session({
    secret: 'secreto-super-seguro',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true, httpOnly: true }
}));

app.post('/login', (req, res) => {
    const usuario = db.usuarios.validarCredenciales(req.body.email, req.body.password);
    
    if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Crear sesión (ESTADO)
    req.session.usuarioId = usuario.id;
    req.session.carrito = [];
    
    res.json({ message: 'Login exitoso' });
});

// Servidor RECUERDA la sesión
app.post('/carrito/agregar', (req, res) => {
    // Verificar sesión
    if (!req.session.usuarioId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Usar información guardada (ESTADO)
    req.session.carrito.push(req.body.productoId);
    
    res.json({ carritoCount: req.session.carrito.length });
});

// Recuperar carrito
app.get('/carrito', (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Devolver estado guardado
    res.json({ productos: req.session.carrito });
});

app.listen(3000);
```

### Problema Stateful: Escalabilidad

```
┌──────────┐
│ Cliente  │
└──────────┘
      │
      ├─→ Servidor 1: Login
      │   Servidor 1 recuerda: "Cliente en sesión"
      │
      └─→ Servidor 2: Obtener carrito ❌
          Servidor 2 NO conoce la sesión (está en Servidor 1)
          ERROR: No encontrado

Se necesita sincronizar estado entre servidores (complejidad)
```

---

## 🎯 JWT - Stateless con Autenticación

La solución moderna: **JWT (JSON Web Token)** proporciona seguridad sin mantener estado.

### Concepto

En lugar de guardar sesión en servidor:
1. Cliente se autentica
2. Servidor genera JWT (contiene datos del cliente)
3. Cliente envía JWT en cada solicitud
4. Servidor verifica JWT (no lo guarda)

### Flujo JWT

```
Cliente                         Servidor
   │                               │
   ├─ POST /login ─────────────→  │
   │ { email, password }           │
   │                               │
   │ ← JWT (token) ────────────────┤
   │ { header.payload.signature }  │
   │                               │
   ├─ GET /usuarios/1 ───────────→ │
   │ Authorization: Bearer JWT     │
   │                               │
   │ ← Usuario 1 ──────────────────┤
   │                               │
   └─ GET /carrito ──────────────→ │
     Authorization: Bearer JWT     │
     ← Carrito ────────────────────┤
```

### JWT No Guarda Estado

```javascript
// JWT contiene los datos (no se guarda en servidor)
const token = {
    header: { alg: 'HS256', typ: 'JWT' },
    payload: { userId: 1, email: 'juan@ejemplo.com', rol: 'user' },
    signature: 'hash-verificado'
};

// Cada solicitud incluye el token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Servidor solo VERIFICA el token (no lo guarda)
// Por eso es stateless
```

### Ejemplo JWT: Node.js

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const SECRET_KEY = 'mi-secreto-super-seguro';

// Login - Generar JWT
app.post('/login', (req, res) => {
    const usuario = db.usuarios.validarCredenciales(req.body.email, req.body.password);
    
    if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar JWT (sin guardar estado)
    const token = jwt.sign(
        { userId: usuario.id, email: usuario.email },
        SECRET_KEY,
        { expiresIn: '1h' }
    );
    
    res.json({ token }); // Devolver token (NO guardar en servidor)
});

// Middleware para verificar JWT
function verificarJWT(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    
    try {
        // VERIFICAR token (sin guardar estado)
        const payload = jwt.verify(token, SECRET_KEY);
        req.usuario = payload;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
}

// Usar JWT
app.get('/usuarios/1', verificarJWT, (req, res) => {
    // req.usuario contiene info del JWT (no de sesión guardada)
    res.json({ userId: req.usuario.userId, email: req.usuario.email });
});

app.listen(3000);
```

### Ejemplo JWT: C#

```csharp
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

const string SECRET_KEY = "mi-secreto-super-seguro-debe-tener-minimo-32-caracteres";

// Login - Generar JWT
app.MapPost("/login", (LoginRequest req) =>
{
    var usuario = db.usuarios.ValidarCredenciales(req.Email, req.Password);
    
    if (usuario == null)
        return Results.Unauthorized();
    
    // Generar JWT (sin guardar estado)
    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.ASCII.GetBytes(SECRET_KEY);
    
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new System.Security.Claims.ClaimsIdentity(new[]
        {
            new System.Security.Claims.Claim("userId", usuario.Id.ToString()),
            new System.Security.Claims.Claim("email", usuario.Email)
        }),
        Expires = DateTime.UtcNow.AddHours(1),
        SigningCredentials = new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256Signature
        )
    };
    
    var token = tokenHandler.CreateToken(tokenDescriptor);
    var tokenString = tokenHandler.WriteToken(token);
    
    return Results.Ok(new { token = tokenString }); // Devolver token (NO guardar)
});

// Usar JWT
app.MapGet("/usuarios/1", () =>
{
    // JWT es verificado por middleware (no guardado en servidor)
    return Results.Ok(new { userId = 1, email = "juan@ejemplo.com" });
}).RequireAuthorization();

app.Run();

record LoginRequest(string Email, string Password);
```

---

## 📊 Comparativa: Stateless vs Stateful

| Aspecto | Stateless | Stateful |
|--------|-----------|----------|
| **Servidor recuerda** | ❌ No | ✅ Sí |
| **Escalable** | ✅ Fácil | ❌ Difícil |
| **Sincronización** | ❌ No necesita | ✅ Necesita |
| **Pérdida de datos** | ❌ No (cada request es independiente) | ✅ Sí (si servidor falla) |
| **Complejidad** | ✅ Simple | ❌ Compleja |
| **Ejemplo** | REST API con JWT | Sesiones tradicionales |

---

## 🏆 Mejor Práctica: Híbrido

Usa **Stateless + JWT** para APIs RESTful:

```javascript
// ✅ RECOMENDADO: Stateless con JWT

app.post('/login', (req, res) => {
    const usuario = validarCredenciales(req.body);
    const token = generarJWT(usuario);
    res.json({ token }); // Devolver token
});

app.get('/api/datos', verificarJWT, (req, res) => {
    // JWT contiene info, no se guarda en servidor
    const userId = req.usuario.userId;
    res.json({ datos: obtenerDatos(userId) });
});
```

---

## 💡 Resumen

| Situación | Usar |
|-----------|------|
| **API REST** | Stateless + JWT |
| **Aplicación tradicional** | Stateful + Sesiones |
| **Microservicios** | Stateless + JWT |
| **Tiempo real (WebSocket)** | Stateful + Conexión persistente |
| **Máxima escalabilidad** | Stateless |

---

## 🔗 Recursos Finales

Ahora entiendes los **Fundamentos de Web & HTTP**:

✅ Qué es HTTP y para qué sirve
✅ Arquitectura cliente-servidor
✅ Ciclo request-response
✅ Métodos HTTP (GET, POST, PUT, PATCH, DELETE)
✅ Códigos de estado (2xx, 3xx, 4xx, 5xx)
✅ Headers HTTP importantes
✅ Body JSON
✅ Idempotencia
✅ Stateless vs Stateful

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado

