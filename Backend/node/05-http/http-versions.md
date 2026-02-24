# HTTP/1.1 vs HTTP/2

## HTTP/1.1

### Características

- **Keep-Alive**: Reutiliza conexiones TCP
- **Pipelining**: Puede enviar múltiples requests sin esperar respuesta
- **Chunked Encoding**: Envía datos en trozos sin Content-Length
- **Compresión**: Soporte para gzip

### Problema: Head-of-Line Blocking

```
Request 1 ----
Request 2 ----      (espera respuesta 1)
Request 3 ----      (espera respuesta 2)
```

Aunque el navegador haga 6 conexiones paralelas, cada una sufre de HOL blocking.

### Keep-Alive

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=100');
  res.end('OK');
});

server.listen(3000);
```

| Header | Descripción |
|--------|------------|
| `Connection: keep-alive` | Mantiene conexión abierta |
| `Keep-Alive: timeout=5, max=100` | 5s timeout, máximo 100 requests |

### Ventajas y Desventajas

| Aspecto | HTTP/1.1 |
|--------|----------|
| Compatibilidad | ✅ Universal |
| Complejidad | ✅ Simple |
| Multiplexing | ❌ No true multiplexing |
| Headers | ❌ No comprimidos |
| Conexiones | ⚠️ Múltiples necesarias |

## HTTP/2

### Características Principales

1. **Multiplexing**: Múltiples streams en una conexión
2. **Compresión de Headers**: HPACK
3. **Binary Framing**: Protocolo binario en lugar de texto
4. **Server Push**: Servidor envía recursos sin solicitud
5. **Obligatorio HTTPS**: Seguridad por defecto

### Multiplexing en HTTP/2

```
Conexión TCP única
├── Stream 1 (Request 1)
├── Stream 2 (Request 2)
├── Stream 3 (Request 3)
└── ... (intercalados sin bloqueos)
```

### Usando HTTP/2 en Node.js

```javascript
// Para usar HTTP/2, necesitas spdy o usar Node.js con --experimental-http2
const spdy = require('spdy');
const fs = require('fs');

const options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
};

const server = spdy.createServer(options, (req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.end('HTTP/2 Response');
});

server.listen(443);
```

### Server Push (HTTP/2)

```javascript
const spdy = require('spdy');

const server = spdy.createServer((req, res) => {
  if (req.url === '/') {
    // Server push: enviar CSS sin que lo pida
    res.push('/styles.css', {
      'Content-Type': 'text/css'
    }, (err, pushRes) => {
      if (!err) {
        pushRes.end('body { color: blue; }');
      }
    });

    res.end('<link rel="stylesheet" href="/styles.css">');
  }
});
```

## Comparación Detallada

| Característica | HTTP/1.1 | HTTP/2 |
|----------------|----------|--------|
| **Multiplexing** | ❌ | ✅ |
| **Compresión Headers** | ❌ | ✅ (HPACK) |
| **Binary Protocol** | ❌ (Texto) | ✅ |
| **Server Push** | ❌ | ✅ |
| **Conexiones** | Múltiples | Una única |
| **HTTPS** | Opcional | Obligatorio* |
| **Compatibilidad** | 100% | ~97% |
| **Latencia** | ⚠️ Alto | ✅ Bajo |

*HTTP/2 puede usarse sin TLS, pero navegadores requieren HTTPS.

## Impacto en Performance

### HTTP/1.1

```
6 conexiones paralelas (navegador típico)
Cada conexión maneja requests secuencialmente
→ 6 pipelines independientes
```

### HTTP/2

```
1 conexión
Múltiples streams intercalados
→ Utilización óptima del ancho de banda
```

### Resultados Reales

Para 50 assets pequeños:

| Métrica | HTTP/1.1 | HTTP/2 |
|---------|----------|--------|
| Conexiones TCP | 6 | 1 |
| Tiempo Total | ~2000ms | ~600ms |
| Throughput | 70% | 95% |

## Cómo Verificar HTTP Version

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`HTTP Version: ${req.httpVersion}`);
  // "1.1" para HTTP/1.1
  // "2.0" para HTTP/2
  res.end();
});

server.listen(3000);
```

## Cuándo Usar Cada Una

### USA HTTP/1.1 si:
- Necesitas máxima compatibilidad (proxies viejos)
- Tu servidor no soporta HTTP/2
- Cliente en red muy lenta (latencia alta beneficia a HTTP/2)

### USA HTTP/2 si:
- Todos tus clientes soportan HTTP/2 (~97%)
- Necesitas performance óptima
- Tienes muchos assets pequeños
- Puedes usar HTTPS

## Referencias

- [http-nativo.md](./http-nativo.md)
- [status-codes-headers.md](./status-codes-headers.md)
- [RFC 7540 - HTTP/2](https://tools.ietf.org/html/rfc7540)

## Pregunta de Entrevista

**¿Por qué HTTP/2 usa una única conexión TCP mientras HTTP/1.1 necesita múltiples?**

HTTP/2 implementa multiplexing con streams binarios. Múltiples requests/responses pueden intercalarse en una conexión sin Head-of-Line blocking. HTTP/1.1 requiere múltiples conexiones porque es secuencial por defecto.
