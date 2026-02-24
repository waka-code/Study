# Ciclo Request → Response

## Flujo HTTP Básico

```
Cliente                 Servidor
  |                        |
  |---(1) HTTP Request ---->|
  |                        | (2) Procesa
  |<---(3) HTTP Response----|
  |                        |
```

1. **Request**: Cliente envía método, headers, URL, body
2. **Procesamiento**: Servidor ejecuta lógica
3. **Response**: Servidor envía status, headers, body

## Estados de la Response

Una respuesta HTTP pasa por tres estados:

### 1. Headers No Enviados (Headerless)

```javascript
const server = http.createServer((req, res) => {
  // ✅ BIEN: Puede cambiar headers
  res.setHeader('X-Custom', 'value');

  // Cuando llama a res.write() o res.writeHead(),
  // los headers se envían y BLOQUEAN cambios posteriores
});
```

### 2. Headers Enviados

```javascript
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });

  // ❌ MAL: Headers ya enviados
  res.setHeader('X-Custom', 'value'); // Error
});
```

### 3. Finalizada (Finished)

```javascript
const server = http.createServer((req, res) => {
  res.end();

  // ❌ MAL: Response finalizada
  res.write('data'); // Error
});
```

## Parsing de Body

### Lectura en Chunks

```javascript
const server = http.createServer((req, res) => {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
    // ⚠️ IMPORTANTE: Validar tamaño para evitar DoS
    if (body.length > 1e6) {
      req.connection.destroy();
    }
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: data }));
    } catch (err) {
      res.writeHead(400);
      res.end('Invalid JSON');
    }
  });
});
```

### Con Límite de Tamaño

```javascript
const server = http.createServer((req, res) => {
  const chunks = [];
  let size = 0;
  const MAX_SIZE = 1024 * 1024; // 1MB

  req.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_SIZE) {
      req.pause();
      res.writeHead(413); // Payload Too Large
      res.end();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    res.end('OK');
  });

  req.on('error', (err) => {
    console.error(err);
    res.writeHead(400);
    res.end('Bad Request');
  });
});
```

## Headers Importantes

### Request Headers

| Header | Descripción |
|--------|------------|
| `Content-Type` | Tipo de datos: `application/json`, `text/plain` |
| `Content-Length` | Tamaño del body en bytes |
| `Authorization` | Token/credenciales |
| `User-Agent` | Info del cliente |
| `Accept` | Formatos que acepta el cliente |

### Response Headers

| Header | Descripción |
|--------|------------|
| `Content-Type` | Tipo de respuesta |
| `Content-Length` | Tamaño de respuesta |
| `Cache-Control` | Política de caché |
| `Set-Cookie` | Cookies para el cliente |
| `Location` | Redireccionamiento |

## Ejemplo Completo

```javascript
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // 1. Validar método
  if (req.method !== 'POST') {
    res.writeHead(405); // Method Not Allowed
    res.end();
    return;
  }

  // 2. Validar tipo de contenido
  const contentType = req.headers['content-type'];
  if (!contentType?.includes('application/json')) {
    res.writeHead(415); // Unsupported Media Type
    res.end();
    return;
  }

  // 3. Parsear body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    if (body.length > 1e6) {
      req.destroy();
    }
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body);

      // 4. Procesar
      const response = { success: true, received: data };

      // 5. Responder
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(response));
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });

  req.on('error', () => {
    res.writeHead(400);
    res.end('Bad Request');
  });
});

server.listen(3000);
```

## Referencias

- [http-nativo.md](./http-nativo.md)
- [status-codes-headers.md](./status-codes-headers.md)
- [Documentación Node.js - Stream](https://nodejs.org/api/stream.html)

## Pregunta de Entrevista

**¿Qué sucede si intenta setear headers después de escribir datos?**

Los headers ya fueron enviados. Node.js lanzará un error: `ERR_HTTP_HEADERS_SENT`. Por eso debe usar `res.setHeader()` ANTES de `res.write()` o usar `res.writeHead()` al principio.
