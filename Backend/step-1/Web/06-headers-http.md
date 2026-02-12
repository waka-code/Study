# Headers HTTP

## 📌 ¿Qué son los Headers?

Los **headers** (encabezados) son pares clave-valor que proporcionan **información adicional** sobre la solicitud o respuesta HTTP. Son metadatos que modifican el comportamiento del protocolo.

```
┌──────────────────────────┐
│     HTTP Request         │
├──────────────────────────┤
│ GET /usuarios            │
├──────────────────────────┤
│ Headers (metadatos)      │
│ ─────────────────────    │
│ Host: api.ejemplo.com    │
│ Content-Type: json       │
│ Authorization: Bearer... │
│ Accept: application/json │
├──────────────────────────┤
│ Body (datos)             │
└──────────────────────────┘
```

## 📤 Headers Comunes en Requests

### 1. Content-Type

Define el **tipo de contenido** que se envía en el body.

```http
POST /usuarios HTTP/1.1
Content-Type: application/json

{"nombre": "Juan", "email": "juan@ejemplo.com"}
```

**Valores Comunes:**

| Content-Type | Uso | Ejemplo |
|--------------|-----|---------|
| `application/json` | JSON | APIs REST |
| `application/x-www-form-urlencoded` | Formularios HTML | Formularios web |
| `multipart/form-data` | Archivos | Subidas de archivos |
| `text/plain` | Texto plano | Logs |
| `text/html` | HTML | Páginas web |
| `application/xml` | XML | Datos XML |

**C# Ejemplo:**
```csharp
// JSON
var json = JsonSerializer.Serialize(usuario);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

// Formulario
var contenido = new FormUrlEncodedContent(new Dictionary<string, string>
{
    { "nombre", "Juan" },
    { "email", "juan@ejemplo.com" }
});

// Archivos
var contenido = new MultipartFormDataContent();
var archivoStream = File.OpenRead("documento.pdf");
contenido.Add(new StreamContent(archivoStream), "archivo", "documento.pdf");
```

**Node.js Ejemplo:**
```javascript
// JSON
await axios.post('http://localhost:3000/usuarios', 
    { nombre: 'Juan', email: 'juan@ejemplo.com' },
    { headers: { 'Content-Type': 'application/json' } }
);

// Formulario
const form = new FormData();
form.append('nombre', 'Juan');
form.append('email', 'juan@ejemplo.com');

await axios.post('http://localhost:3000/usuarios', form, {
    headers: form.getHeaders()
});
```

---

### 2. Authorization

Envía **credenciales** para autenticación.

```http
GET /api/privado HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

```

**Formatos Comunes:**

```
Authorization: Bearer <token>          (JWT)
Authorization: Basic <base64>          (Usuario:Contraseña)
Authorization: ApiKey <api-key>        (API Key)
```

**C# Ejemplo:**
```csharp
var cliente = new HttpClient();

// Bearer Token
cliente.DefaultRequestHeaders.Authorization = 
    new AuthenticationHeaderValue("Bearer", "token123abc");

var response = await cliente.GetAsync("https://api.ejemplo.com/api/privado");

// Más específico
var request = new HttpRequestMessage(HttpMethod.Get, "https://api.ejemplo.com/api/privado");
request.Headers.Add("Authorization", "Bearer token123abc");
var response = await cliente.SendAsync(request);
```

**Node.js Ejemplo:**
```javascript
// Bearer Token
const response = await axios.get('http://localhost:3000/api/privado', {
    headers: {
        'Authorization': 'Bearer token123abc'
    }
});

// Con axios instance
const apiClient = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
        'Authorization': 'Bearer token123abc'
    }
});

const response = await apiClient.get('/api/privado');
```

---

### 3. Accept

Define qué **tipo de respuesta** espera el cliente.

```http
GET /usuarios HTTP/1.1
Accept: application/json

```

**Valores Comunes:**

```
Accept: application/json              (JSON)
Accept: application/xml               (XML)
Accept: text/html                     (HTML)
Accept: */*                           (Cualquier tipo)
Accept: application/json, text/xml    (Múltiples tipos)
```

**Negociación de Contenido:**

```
Cliente solicita: Accept: application/json
Servidor responde: Content-Type: application/json

Cliente solicita: Accept: text/html
Servidor responde: Content-Type: text/html
```

**C# Ejemplo:**
```csharp
var cliente = new HttpClient();
cliente.DefaultRequestHeaders.Accept.Add(
    new MediaTypeWithQualityHeaderValue("application/json")
);

var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios");
```

**Node.js Ejemplo:**
```javascript
const response = await axios.get('http://localhost:3000/usuarios', {
    headers: {
        'Accept': 'application/json'
    }
});
```

---

### 4. User-Agent

Identifica la **aplicación cliente** que realiza la solicitud.

```http
GET /usuarios HTTP/1.1
User-Agent: Mozilla/5.0 (Windows NT 10.0) Chrome/120.0

```

**Ejemplos Reales:**

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36

PostmanRuntime/7.32.3

curl/7.68.0

MyApp/1.0 (+http://ejemplo.com/bot)
```

**C# Ejemplo:**
```csharp
var cliente = new HttpClient();
cliente.DefaultRequestHeaders.Add("User-Agent", "MyApp/1.0");

var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios");
```

**Node.js Ejemplo:**
```javascript
const response = await axios.get('http://localhost:3000/usuarios', {
    headers: {
        'User-Agent': 'MyApp/1.0'
    }
});
```

---

### 5. Host

Especifica el **servidor destino** (requerido en HTTP/1.1).

```http
GET /usuarios HTTP/1.1
Host: api.ejemplo.com

```

---

### 6. Otros Headers Útiles

#### Content-Length
Tamaño en bytes del body:
```http
Content-Length: 256
```

#### Accept-Language
Idioma preferido:
```http
Accept-Language: es-ES, es;q=0.9, en;q=0.8
```

#### Cache-Control
Instrucciones de caché:
```http
Cache-Control: no-cache
Cache-Control: max-age=3600
```

#### If-None-Match / ETag
Para validar caché:
```http
If-None-Match: "abc123"
```

---

## 📥 Headers Comunes en Responses

### 1. Content-Type

Define el **tipo de contenido** de la respuesta.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"id": 1, "nombre": "Juan"}
```

---

### 2. Set-Cookie

Instruye al cliente a **guardar una cookie**.

```http
HTTP/1.1 200 OK
Set-Cookie: sessionId=abc123def456; Path=/; HttpOnly

```

**Atributos:**

```
sessionId=abc123           ← Cookie nombre=valor
Path=/                     ← Ruta aplicable
HttpOnly                   ← No accesible desde JavaScript
Secure                     ← Solo HTTPS
Max-Age=3600               ← Duración en segundos
SameSite=Strict            ← Protección CSRF
```

**C# Ejemplo:**
```csharp
app.MapGet("/login", (HttpContext context) =>
{
    // Crear cookie
    var cookieOptions = new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Expires = DateTimeOffset.UtcNow.AddHours(1)
    };
    
    context.Response.Cookies.Append("sessionId", "abc123", cookieOptions);
    
    return Results.Ok("Login exitoso");
});
```

**Node.js Ejemplo:**
```javascript
app.get('/login', (req, res) => {
    res.cookie('sessionId', 'abc123', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 3600000 // milisegundos
    });
    
    res.json({ message: 'Login exitoso' });
});
```

---

### 3. Location

Indica la **ubicación** del recurso (redirecciones, recursos creados).

```http
HTTP/1.1 201 Created
Location: /usuarios/1

```

```http
HTTP/1.1 301 Moved Permanently
Location: /api/v2/usuarios

```

**C# Ejemplo:**
```csharp
app.MapPost("/usuarios", (UsuarioRequest req) =>
{
    var usuario = new { id = 1, nombre = req.Nombre };
    return Results.Created("/usuarios/1", usuario);
});
```

**Node.js Ejemplo:**
```javascript
app.post('/usuarios', (req, res) => {
    const usuario = { id: 1, nombre: req.body.nombre };
    res.location('/usuarios/1').status(201).json(usuario);
});
```

---

### 4. Cache-Control

Controla el **almacenamiento en caché** de la respuesta.

```http
Cache-Control: public, max-age=3600
```

**Directivas:**

```
public              ← Cualquiera puede cachear
private             ← Solo el cliente puede cachear
max-age=3600        ← Válido por 3600 segundos
no-cache            ← Validar siempre con servidor
no-store            ← No cachear
must-revalidate     ← Revalidar cuando esté expirado
```

**C# Ejemplo:**
```csharp
app.MapGet("/datos", () =>
{
    var response = Results.Ok(new { dato = "valor" });
    return response;
});
```

**Node.js Ejemplo:**
```javascript
app.get('/datos', (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ dato: 'valor' });
});
```

---

### 5. Otros Headers Útiles

#### Content-Length
Tamaño del body:
```http
Content-Length: 256
```

#### Date
Cuándo se generó la respuesta:
```http
Date: Mon, 05 Feb 2026 10:30:00 GMT
```

#### Server
Tipo de servidor:
```http
Server: Apache/2.4
Server: nginx/1.21
```

#### ETag
Versión del recurso (para caché):
```http
ETag: "abc123"
```

#### Retry-After
Cuándo reintentar (para 429, 503):
```http
Retry-After: 60
```

---

## 📊 Headers Personalizados

Puedes crear tus propios headers:

```http
GET /usuarios HTTP/1.1
X-Custom-Header: mi-valor
X-Request-ID: req-12345
X-API-Version: 2.0

```

**Convención:** Headers personalizados comienzan con `X-`

**C# Ejemplo:**
```csharp
var cliente = new HttpClient();
cliente.DefaultRequestHeaders.Add("X-Request-ID", "req-12345");
cliente.DefaultRequestHeaders.Add("X-API-Version", "2.0");

var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios");
```

**Node.js Ejemplo:**
```javascript
const response = await axios.get('http://localhost:3000/usuarios', {
    headers: {
        'X-Request-ID': 'req-12345',
        'X-API-Version': '2.0'
    }
});
```

---

## 🔍 Inspeccionar Headers

### En Navegador (DevTools)

```
1. Abre DevTools (F12)
2. Ve a pestaña "Network"
3. Realiza una solicitud
4. Haz click en la solicitud
5. Verás Headers, Request, Response
```

### En C#

```csharp
var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios");

// Headers de respuesta
foreach (var header in response.Headers)
{
    Console.WriteLine($"{header.Key}: {string.Join(", ", header.Value)}");
}

// Headers de contenido
foreach (var header in response.Content.Headers)
{
    Console.WriteLine($"{header.Key}: {string.Join(", ", header.Value)}");
}
```

### En Node.js

```javascript
const response = await axios.get('http://localhost:3000/usuarios');

// Headers de respuesta
console.log(response.headers);

// Request headers
const config = {
    headers: {
        'Authorization': 'Bearer token'
    }
};
console.log(config.headers);
```

---

## 📋 Tabla de Headers Comunes

| Header | Tipo | Descripción | Ejemplo |
|--------|------|-------------|---------|
| **Content-Type** | Ambos | Tipo de contenido | `application/json` |
| **Authorization** | Request | Credenciales | `Bearer token` |
| **Accept** | Request | Tipo esperado | `application/json` |
| **User-Agent** | Request | Cliente | `Chrome/120.0` |
| **Host** | Request | Servidor | `api.ejemplo.com` |
| **Set-Cookie** | Response | Guardar cookie | `sessionId=abc` |
| **Location** | Response | Ubicación recurso | `/usuarios/1` |
| **Cache-Control** | Response | Caché | `max-age=3600` |
| **Content-Length** | Ambos | Tamaño | `256` |
| **Date** | Response | Fecha | `Mon, 05 Feb 2026...` |

## 💡 Mejores Prácticas

✅ Siempre establece `Content-Type` correcto
✅ Usa `Authorization` para autenticación
✅ Establece `Cache-Control` apropiadamente
✅ Devuelve `Location` en 201 Created
✅ Usa headers personalizados con prefijo `X-`
✅ Valida headers en el servidor

## 🔗 Próximo Paso

Continúa con [Body JSON](07-body-json.md) para entender la estructura de datos.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
