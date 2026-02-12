# Body JSON

## 📌 ¿Qué es el Body?

El **body** (cuerpo) es la **parte de datos** en una solicitud o respuesta HTTP. Contiene la información que se envía o recibe, generalmente en formato JSON.

```
┌─────────────────────────────────────┐
│     HTTP Request / Response         │
├─────────────────────────────────────┤
│ Method / Status                     │
│ Headers (metadatos)                 │
├─────────────────────────────────────┤
│ Línea en blanco                     │
├─────────────────────────────────────┤
│ Body (datos JSON) ← Aquí estamos   │
└─────────────────────────────────────┘
```

## 📤 Body en Requests

### No Todos los Métodos Llevan Body

| Método | Body | Uso |
|--------|------|-----|
| GET | ❌ No | Obtener datos |
| POST | ✅ Sí | Crear con datos |
| PUT | ✅ Sí | Actualizar completo |
| PATCH | ✅ Sí | Actualizar parcial |
| DELETE | ❌ No | Eliminar |

---

## 🔄 JSON - JavaScript Object Notation

### ¿Qué es JSON?

JSON es un **formato de texto** para intercambiar datos estructurados. Es independiente del lenguaje y ampliamente soportado.

### Estructura JSON Básica

```json
{
  "nombre": "Juan",
  "edad": 30,
  "email": "juan@ejemplo.com",
  "activo": true,
  "direccion": {
    "calle": "Calle 123",
    "ciudad": "Madrid"
  },
  "telefonos": [
    "123456789",
    "987654321"
  ]
}
```

### Tipos de Datos en JSON

| Tipo | Ejemplo | Descripción |
|------|---------|-------------|
| **String** | `"hola"` | Texto entre comillas |
| **Number** | `42`, `3.14` | Números enteros o decimales |
| **Boolean** | `true`, `false` | Verdadero o falso |
| **Null** | `null` | Valor nulo |
| **Array** | `[1, 2, 3]` | Lista de valores |
| **Object** | `{ "key": "value" }` | Objeto con propiedades |

---

## 📝 Ejemplos de Body en Requests

### POST - Crear Usuario

```http
POST /api/usuarios HTTP/1.1
Host: api.ejemplo.com
Content-Type: application/json
Content-Length: 67

{
  "nombre": "Juan",
  "email": "juan@ejemplo.com",
  "edad": 30
}
```

**C# Ejemplo:**
```csharp
var usuario = new { nombre = "Juan", email = "juan@ejemplo.com", edad = 30 };
var json = JsonSerializer.Serialize(usuario);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

var response = await cliente.PostAsync("https://api.ejemplo.com/usuarios", contenido);
```

**Node.js Ejemplo:**
```javascript
const usuario = { nombre: "Juan", email: "juan@ejemplo.com", edad: 30 };

const response = await axios.post('http://localhost:3000/usuarios', usuario, {
    headers: { 'Content-Type': 'application/json' }
});
```

---

### PUT - Actualizar Usuario Completo

```http
PUT /api/usuarios/1 HTTP/1.1
Host: api.ejemplo.com
Content-Type: application/json

{
  "nombre": "Juan García",
  "email": "juan.garcia@ejemplo.com",
  "edad": 31
}
```

**C# Ejemplo:**
```csharp
var usuarioActualizado = new 
{ 
    nombre = "Juan García", 
    email = "juan.garcia@ejemplo.com",
    edad = 31
};

var json = JsonSerializer.Serialize(usuarioActualizado);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

var response = await cliente.PutAsync("https://api.ejemplo.com/usuarios/1", contenido);
```

**Node.js Ejemplo:**
```javascript
const usuarioActualizado = { 
    nombre: "Juan García", 
    email: "juan.garcia@ejemplo.com",
    edad: 31
};

await axios.put('http://localhost:3000/usuarios/1', usuarioActualizado);
```

---

### PATCH - Actualizar Solo Algunos Campos

```http
PATCH /api/usuarios/1 HTTP/1.1
Host: api.ejemplo.com
Content-Type: application/json

{
  "nombre": "Juan García"
}
```

**C# Ejemplo:**
```csharp
var actualizacion = new { nombre = "Juan García" };
var json = JsonSerializer.Serialize(actualizacion);
var contenido = new StringContent(json, Encoding.UTF8, "application/json");

var request = new HttpRequestMessage(HttpMethod.Patch, "https://api.ejemplo.com/usuarios/1");
request.Content = contenido;

var response = await cliente.SendAsync(request);
```

**Node.js Ejemplo:**
```javascript
const actualizacion = { nombre: "Juan García" };

await axios.patch('http://localhost:3000/usuarios/1', actualizacion);
```

---

## 📥 Body en Responses

### Respuesta con Datos (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 68

{
  "id": 1,
  "nombre": "Juan",
  "email": "juan@ejemplo.com",
  "createdAt": "2026-02-05T10:30:00Z"
}
```

---

### Respuesta con Array

```http
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "id": 1,
    "nombre": "Juan",
    "email": "juan@ejemplo.com"
  },
  {
    "id": 2,
    "nombre": "María",
    "email": "maria@ejemplo.com"
  }
]
```

**Node.js Servidor:**
```javascript
app.get('/api/usuarios', (req, res) => {
    const usuarios = [
        { id: 1, nombre: "Juan", email: "juan@ejemplo.com" },
        { id: 2, nombre: "María", email: "maria@ejemplo.com" }
    ];
    res.json(usuarios);
});
```

---

### Respuesta con Objeto Anidado

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 1,
  "nombre": "Juan",
  "perfil": {
    "bio": "Desarrollador",
    "ciudad": "Madrid"
  },
  "habilidades": ["JavaScript", "Python", "C#"]
}
```

---

### Respuesta de Error

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Email inválido",
  "campo": "email",
  "statusCode": 400
}
```

**Node.js Servidor:**
```javascript
app.post('/api/usuarios', (req, res) => {
    if (!req.body.email) {
        return res.status(400).json({
            error: "Email requerido",
            campo: "email",
            statusCode: 400
        });
    }
    
    res.status(201).json({ id: 1, ...req.body });
});
```

---

## 🎯 Estructura JSON Recomendada

### Para Crear/Actualizar (Request)

```json
{
  "nombre": "Juan",
  "email": "juan@ejemplo.com",
  "edad": 30,
  "activo": true
}
```

### Para Respuesta de Éxito (Response 200/201)

```json
{
  "id": 1,
  "nombre": "Juan",
  "email": "juan@ejemplo.com",
  "edad": 30,
  "activo": true,
  "createdAt": "2026-02-05T10:30:00Z",
  "updatedAt": "2026-02-05T10:30:00Z"
}
```

### Para Lista de Resultados (Response 200)

```json
{
  "data": [
    { "id": 1, "nombre": "Juan" },
    { "id": 2, "nombre": "María" }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 10
}
```

### Para Errores (Response 4xx/5xx)

```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "details": {
    "campo": "valor"
  }
}
```

---

## 🔍 Parsear JSON

### C# - Deserializar JSON a Objeto

```csharp
using System.Text.Json;

// JSON string
string json = @"{
    ""nombre"": ""Juan"",
    ""email"": ""juan@ejemplo.com"",
    ""edad"": 30
}";

// Deserializar
var usuario = JsonSerializer.Deserialize<Usuario>(json);
Console.WriteLine(usuario.Nombre); // "Juan"

// Clase
public class Usuario
{
    public string Nombre { get; set; }
    public string Email { get; set; }
    public int Edad { get; set; }
}
```

### C# - Serializar Objeto a JSON

```csharp
var usuario = new Usuario 
{ 
    Nombre = "Juan",
    Email = "juan@ejemplo.com",
    Edad = 30
};

// Serializar
string json = JsonSerializer.Serialize(usuario);
Console.WriteLine(json);
// {"nombre":"Juan","email":"juan@ejemplo.com","edad":30}
```

### Node.js - Parsear JSON

```javascript
// JSON string
const jsonString = '{"nombre":"Juan","email":"juan@ejemplo.com","edad":30}';

// Parsear
const usuario = JSON.parse(jsonString);
console.log(usuario.nombre); // "Juan"

// Convertir objeto a JSON
const obj = { nombre: "Juan", email: "juan@ejemplo.com", edad: 30 };
const json = JSON.stringify(obj);
console.log(json);
// {"nombre":"Juan","email":"juan@ejemplo.com","edad":30}
```

---

## ✅ Validación de JSON

### C# - HttpClient Automatiza

```csharp
// Leer respuesta como JSON
var response = await cliente.GetAsync("https://api.ejemplo.com/usuarios");
var usuario = await response.Content.ReadAsAsync<Usuario>();
```

### Node.js con Express

```javascript
// Express parsea automáticamente
app.use(express.json());

app.post('/usuarios', (req, res) => {
    console.log(req.body); // Ya es un objeto JSON
    res.json(req.body);
});

// Con validación manual
app.post('/usuarios', (req, res) => {
    try {
        if (!req.body.nombre) {
            return res.status(400).json({ error: "Nombre requerido" });
        }
        
        res.status(201).json({ id: 1, ...req.body });
    } catch (error) {
        res.status(400).json({ error: "JSON inválido" });
    }
});
```

---

## 📊 Body Size Limits

### C# - Configurar Tamaño Máximo

```csharp
builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartBodyLengthLimit = int.MaxValue;
});
```

### Node.js - Configurar Tamaño Máximo

```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
```

---

## 💡 Mejores Prácticas

✅ Siempre establece `Content-Type: application/json`
✅ Valida el JSON en el servidor
✅ Devuelve errores con estructura consistente
✅ Usa nombres descriptivos en las propiedades
✅ No incluyas información sensible en el body
✅ Limita el tamaño del body para evitar abuso
✅ Usa herramientas como Postman para testear

## 🔗 Próximo Paso

Continúa con [Idempotencia](08-idempotencia.md) para entender operaciones seguras.

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
