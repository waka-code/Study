# HTTP Nativo en Node.js

## Módulo http: Crear Servidor Básico

Node.js incluye el módulo `http` para crear servidores web sin dependencias externas.

HTTP es un protocolo de aplicación que define cómo un cliente y un servidor se comunican mediante requests y responses.

```javascript
// ✅ BIEN: Servidor básico
const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
```

## Estructura Request/Response

### Request (req)

El objeto `req` contiene:
- `req.method`: GET, POST, PUT, DELETE, etc.
- `req.url`: URL solicitada
- `req.headers`: Headers del cliente
- `req.httpVersion`: Versión HTTP

```javascript
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
});
```

### Response (res)

Métodos principales:
- `res.writeHead(statusCode, headers)`: Escribe headers
- `res.write(data)`: Escribe datos
- `res.end(data)`: Finaliza response

```javascript
// ✅ BIEN: Respuesta correcta
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify({ message: 'success' }));
  res.end();
});

// ❌ MAL: Escribir después de end()
const badServer = http.createServer((req, res) => {
  res.end('Primera');
  res.write('Esto genera error'); // Error!
});
```

## Parsing de URL y Query Strings

```javascript
const url = require('url');
const querystring = require('querystring');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`Path: ${pathname}`);
  console.log(`Query:`, query);

  if (pathname === '/') {
    res.end('Home');
  } else if (pathname === '/user') {
    res.end(`User: ${query.name}`);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000);
```

## Manejo de Métodos HTTP

```javascript
const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (url === '/api/users' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([{ id: 1, name: 'John' }]));
  } else if (url === '/api/users' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const user = JSON.parse(body);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...user, id: 2 }));
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000);
```

## Streaming de Datos

```javascript
const fs = require('fs');

const server = http.createServer((req, res) => {
  if (req.url === '/file') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    // ✅ BIEN: Usar streams
    fs.createReadStream('large-file.txt').pipe(res);
  }
});

server.listen(3000);
```

## Eventos del Servidor

```javascript
const server = http.createServer((req, res) => {
  res.end('OK');
});

server.on('connection', (socket) => {
  console.log('New connection');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('close', () => {
  console.log('Server closed');
});

server.listen(3000);
```

## Límites del HTTP Nativo

| Aspecto | HTTP Nativo | Frameworks |
|--------|------------|-----------|
| Routing | Manual | Automático |
| Middleware | Manual | Built-in |
| Validación | Manual | Plugins |
| Error Handling | Básico | Robusto |

Use HTTP nativo para proyectos simples. Para aplicaciones grandes, use **Express**, **Fastify** o **NestJS**.

## Referencias

- [Documentación http de Node.js](https://nodejs.org/api/http.html)
- [request-response-cycle.md](./request-response-cycle.md)
- [status-codes-headers.md](./status-codes-headers.md)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre `res.write()` y `res.end()`?**

`res.write()` envía datos pero mantiene abierta la conexión. `res.end()` envía datos finales y cierra la respuesta. Nunca llame `res.write()` después de `res.end()`.
