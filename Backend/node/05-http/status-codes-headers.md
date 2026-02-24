# Códigos HTTP y Headers

## Códigos de Estado (Status Codes)

Los códigos HTTP se dividen en 5 categorías:

### 1xx: Informacionales

| Código | Significado |
|--------|------------|
| 100 | Continue |
| 101 | Switching Protocols |

### 2xx: Éxito

| Código | Significado | Caso de uso |
|--------|------------|-----------|
| 200 | OK | Respuesta exitosa general |
| 201 | Created | Recurso creado exitosamente |
| 202 | Accepted | Solicitud aceptada (procesamiento async) |
| 204 | No Content | Éxito sin body |

```javascript
// 200 OK
res.writeHead(200);
res.end(JSON.stringify({ data: 'value' }));

// 201 Created
res.writeHead(201, { 'Location': '/api/users/123' });
res.end(JSON.stringify({ id: 123 }));

// 204 No Content
res.writeHead(204);
res.end();
```

### 3xx: Redirección

| Código | Significado |
|--------|------------|
| 301 | Moved Permanently |
| 302 | Found (Temporary Redirect) |
| 304 | Not Modified (use cache) |

```javascript
// 301 Redirección permanente
res.writeHead(301, { 'Location': '/new-path' });
res.end();

// 302 Redirección temporal
res.writeHead(302, { 'Location': '/temporary-path' });
res.end();

// 304 Sin cambios
if (cachedVersion === currentVersion) {
  res.writeHead(304);
  res.end();
}
```

### 4xx: Error del Cliente

| Código | Significado |
|--------|------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |

```javascript
// 400 Solicitud mal formada
res.writeHead(400);
res.end(JSON.stringify({ error: 'Invalid input' }));

// 401 Sin autenticación
res.writeHead(401, { 'WWW-Authenticate': 'Bearer' });
res.end();

// 404 No encontrado
res.writeHead(404);
res.end(JSON.stringify({ error: 'Resource not found' }));
```

### 5xx: Error del Servidor

| Código | Significado |
|--------|------------|
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

```javascript
// ✅ BIEN: Manejo de errores
try {
  // lógica
} catch (err) {
  console.error(err);
  res.writeHead(500);
  res.end(JSON.stringify({ error: 'Internal Server Error' }));
}

// 503 Servicio no disponible
if (!databaseConnected) {
  res.writeHead(503);
  res.end();
}
```

## Headers Comunes

### Response Headers

```javascript
const server = http.createServer((req, res) => {
  // Content-Type
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Cache Control
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora
  // or
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');

  // Compresión
  res.setHeader('Content-Encoding', 'gzip');

  res.end('OK');
});
```

### Request Headers

Acceso a headers del cliente:

```javascript
const server = http.createServer((req, res) => {
  const contentType = req.headers['content-type'];
  const authorization = req.headers['authorization'];
  const userAgent = req.headers['user-agent'];

  console.log(`Content-Type: ${contentType}`);
  console.log(`Authorization: ${authorization}`);
  console.log(`User-Agent: ${userAgent}`);

  res.end();
});
```

## Ejemplo Completo: API RESTful

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Content-Type', 'application/json');

  // Manejo de preflight (OPTIONS)
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (url === '/api/users' && method === 'GET') {
    // ✅ 200 OK
    res.writeHead(200);
    res.end(JSON.stringify([{ id: 1, name: 'John' }]));
  } else if (url === '/api/users' && method === 'POST') {
    // ✅ 201 Created
    res.writeHead(201, { 'Location': '/api/users/2' });
    res.end(JSON.stringify({ id: 2, name: 'Jane' }));
  } else if (url === '/api/users/999') {
    // ✅ 404 Not Found
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'User not found' }));
  } else {
    // ✅ 405 Method Not Allowed
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
});

server.listen(3000);
```

## Tabla de Selección de Status Code

| Situación | Código |
|-----------|--------|
| Operación exitosa (GET, PUT) | 200 |
| Recurso creado | 201 |
| Sin contenido en respuesta | 204 |
| Redirigir permanentemente | 301 |
| Redirigir temporalmente | 302 |
| Uso caché (no cambió) | 304 |
| Solicitud mal formada | 400 |
| Sin autenticación | 401 |
| Permiso denegado | 403 |
| Recurso no existe | 404 |
| Datos conflictivos | 409 |
| Error genérico servidor | 500 |
| Servidor no disponible | 503 |

## Referencias

- [request-response-cycle.md](./request-response-cycle.md)
- [http-nativo.md](./http-nativo.md)
- [MDN - HTTP Status Codes](https://developer.mozilla.org/es/docs/Web/HTTP/Status)

## Pregunta de Entrevista

**¿Cuándo usarías 409 (Conflict) en lugar de 400 (Bad Request)?**

Usa 409 cuando hay conflicto con el estado actual (ej: versión desactualizada). Usa 400 cuando la solicitud es inválida (ej: JSON malformado).
