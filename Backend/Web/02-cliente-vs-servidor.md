# Cliente vs Servidor

## 📌 Arquitectura Cliente-Servidor

La web se basa en la arquitectura **cliente-servidor**, un modelo de comunicación distribuida donde:

- **Cliente**: Solicita recursos o servicios
- **Servidor**: Proporciona recursos o servicios

```
┌─────────────────┐          HTTP Request         ┌─────────────────┐
│                 │─────────────────────────────→│                 │
│  Cliente        │                              │    Servidor     │
│  (Navegador)    │←─────────────────────────────│   (Web Server)  │
│                 │          HTTP Response       │                 │
└─────────────────┘                              └─────────────────┘
```

## 👨‍💻 ¿Qué es un Cliente?

### Definición
Un cliente es una aplicación que **solicita** recursos o servicios a un servidor. El cliente inicia la comunicación.

### Tipos de Clientes

#### 1. **Navegador Web (Browser)**
- Chrome, Firefox, Safari, Edge
- Solicita HTML, CSS, JavaScript
- Renderiza y muestra contenido

#### 2. **Aplicación Móvil**
- iOS, Android
- Realiza peticiones a APIs

#### 3. **Aplicación de Escritorio**
- Software que se comunica con servidores

#### 4. **CLI (Command Line Interface)**
- Herramientas como `curl`, `wget`, `Postman`

#### 5. **IoT Devices**
- Dispositivos inteligentes que envían datos

### Responsabilidades del Cliente

```
1. Crear la solicitud HTTP
   ↓
2. Incluir headers necesarios
   ↓
3. Enviar el request al servidor
   ↓
4. Recibir la respuesta
   ↓
5. Procesar los datos
   ↓
6. Mostrar/usar los datos
```

### Ejemplo: Cliente en C# (HttpClient)

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class ClienteEjemplo
{
    static async Task Main()
    {
        using (HttpClient cliente = new HttpClient())
        {
            try
            {
                // 1. Crear solicitud
                var url = "https://api.ejemplo.com/usuarios/1";
                
                // 2. Enviar GET request
                HttpResponseMessage respuesta = await cliente.GetAsync(url);
                
                // 3. Verificar si fue exitosa
                if (respuesta.IsSuccessStatusCode)
                {
                    string contenido = await respuesta.Content.ReadAsStringAsync();
                    Console.WriteLine("Respuesta: " + contenido);
                }
                else
                {
                    Console.WriteLine("Error: " + respuesta.StatusCode);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        }
    }
}
```

### Ejemplo: Cliente en Node.js (axios/fetch)

```javascript
// Usando fetch (nativo)
async function clienteFetch() {
    try {
        const url = 'https://api.ejemplo.com/usuarios/1';
        
        const respuesta = await fetch(url);
        
        if (respuesta.ok) {
            const datos = await respuesta.json();
            console.log('Respuesta:', datos);
        } else {
            console.log('Error:', respuesta.status);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Usando axios (requiere npm install axios)
const axios = require('axios');

async function clienteAxios() {
    try {
        const url = 'https://api.ejemplo.com/usuarios/1';
        const respuesta = await axios.get(url);
        console.log('Respuesta:', respuesta.data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

clienteFetch();
```

## 🖥️ ¿Qué es un Servidor?

### Definición
Un servidor es una aplicación que **escucha** y **responde** a las solicitudes de los clientes. El servidor es reactivo, no inicia comunicación.

### Tipos de Servidores

#### 1. **Web Server**
- Nginx, Apache
- Sirve archivos estáticos

#### 2. **Application Server**
- Ejecuta código (ASP.NET, Node.js, Django)
- Procesa lógica de negocio

#### 3. **API Server**
- RESTful APIs
- Devuelve datos en JSON

#### 4. **Database Server**
- SQL Server, PostgreSQL, MongoDB
- Almacena y recupera datos

### Responsabilidades del Servidor

```
1. Escuchar en un puerto
   ↓
2. Recibir la solicitud HTTP
   ↓
3. Parsear la solicitud
   ↓
4. Procesar la lógica de negocio
   ↓
5. Acceder a datos si es necesario
   ↓
6. Construir la respuesta HTTP
   ↓
7. Enviar la respuesta al cliente
```

### Ejemplo: Servidor en C# (ASP.NET Core)

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Agregar servicios
builder.Services.AddControllers();

var app = builder.Build();

app.UseRouting();

app.MapControllers();

// Crear un endpoint simple
app.MapGet("/api/usuarios/{id}", (int id) =>
{
    // Simular obtener un usuario
    return Results.Ok(new 
    { 
        id = id, 
        nombre = "Juan Pérez", 
        email = "juan@ejemplo.com" 
    });
});

app.Run("http://localhost:5000");
```

### Ejemplo: Servidor en Node.js (Express)

```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Simular base de datos
const usuarios = {
    1: { id: 1, nombre: 'Juan Pérez', email: 'juan@ejemplo.com' },
    2: { id: 2, nombre: 'María García', email: 'maria@ejemplo.com' }
};

// Endpoint GET
app.get('/api/usuarios/:id', (req, res) => {
    const usuario = usuarios[req.params.id];
    
    if (usuario) {
        res.status(200).json(usuario);
    } else {
        res.status(404).json({ error: 'Usuario no encontrado' });
    }
});

// Iniciar servidor
app.listen(5000, () => {
    console.log('Servidor escuchando en puerto 5000');
});
```

## 🔄 Ciclo de Vida: Cliente-Servidor

```
1. INICIACIÓN
   Cliente elige conectar a un servidor
   │
2. RESOLUCIÓN DNS
   Cliente resuelve el dominio a IP
   │
3. CONEXIÓN TCP
   Se establece conexión con el servidor
   │
4. REQUEST
   Cliente envía HTTP request
   │
5. PROCESAMIENTO
   Servidor procesa la solicitud
   │
6. RESPONSE
   Servidor envía HTTP response
   │
7. CIERRE
   Se cierra la conexión (HTTP/1.0)
   O se mantiene abierta (HTTP/1.1)
```

## 📊 Comparación Cliente vs Servidor

| Aspecto | Cliente | Servidor |
|--------|--------|----------|
| **Inicia** | Sí (HTTP Request) | No (solo responde) |
| **Puerto** | Aleatorio (efímero) | Fijo (80, 443, 3000, 5000) |
| **Múltiples** | Muchos clientes | Uno o varios servidores |
| **Ubicación** | Usuario final | Centro de datos / Nube |
| **Responsabilidad** | Validación UI, UX | Lógica, Seguridad, Datos |
| **Estado** | Mantiene sesión local | Stateless (por defecto) |

## 🔍 Ejemplo Práctico Completo

### Cliente (Navegador)

```javascript
// El usuario ingresa en su navegador:
// https://api.github.com/users/torvalds

// JavaScript detrás de escenas:
fetch('https://api.github.com/users/torvalds')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));

// Lo que el navegador envía:
// GET /users/torvalds HTTP/1.1
// Host: api.github.com
// User-Agent: Mozilla/5.0...
// Accept: application/json
```

### Servidor (GitHub API)

```
Servidor recibe: GET /users/torvalds

1. Autentica el request
2. Busca el usuario 'torvalds' en la base de datos
3. Si existe:
   - Construye el JSON con los datos
   - Envía: HTTP/1.1 200 OK
   - Content-Type: application/json
   - Body: { "login": "torvalds", ... }
4. Si no existe:
   - Envía: HTTP/1.1 404 Not Found
```

## 💡 Conceptos Clave

✅ El **cliente** inicia la comunicación
✅ El **servidor** siempre está escuchando
✅ La comunicación es **request-response**
✅ El servidor es **stateless** (sin memoria de peticiones anteriores)
✅ Múltiples clientes pueden conectar al mismo servidor

## 🔗 Próximo Paso

Continúa con [Ciclo Request → Response](03-ciclo-request-response.md) para entender en detalle cómo funciona cada interacción.

---

**Nivel de Dificultad:** ⭐ Básico
