# Graceful Shutdown

## Señales del Sistema

Node.js recibe señales del SO:

| Señal | Origen | Acción |
|-------|--------|--------|
| SIGTERM | Gestor de procesos (PM2, Docker) | Salida planeada |
| SIGINT | Ctrl+C en terminal | Interrupción del usuario |
| SIGHUP | Terminal cerrada | Recargar configuración |
| SIGKILL | Sistema operativo | Salida forzada (no se puede capturar) |

## Implementación Básica

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Fuerza salida después de timeout
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 30000); // 30 segundos
});

server.listen(3000);
```

## Cierre de Conexiones

```javascript
const http = require('http');
const db = require('./database');

let server;
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received`);

  // 1. Detener nuevas solicitudes
  server.close(() => {
    console.log('HTTP server closed');
  });

  // 2. Cerrar base de datos
  try {
    await db.close();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error closing database:', err);
  }

  // 3. Cerrar otras conexiones
  try {
    // Cerrar redis, cache, etc.
  } catch (err) {
    console.error('Error closing connections:', err);
  }

  // 4. Salir
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server = require('./app').listen(3000);
```

## Con Express

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ ok: true });
});

let server;
const connections = new Set();

// Rastrear conexiones
app.use((req, res, next) => {
  connections.add(req.socket);
  req.socket.on('close', () => connections.delete(req.socket));
  next();
});

function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  // Dejar de aceptar nuevas conexiones
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Timeout para fuerza salida
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);

  // Cerrar conexiones activas
  connections.forEach((socket) => {
    socket.destroy();
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server = app.listen(3000);
```

## Con Timeouts de Solicitud

```javascript
const http = require('http');

let server;
const activeRequests = new Map();
let requestId = 0;

const requestHandler = (req, res) => {
  const id = ++requestId;
  const timeout = setTimeout(() => {
    console.warn(`Request ${id} timeout during shutdown`);
    if (!res.headersSent) {
      res.writeHead(503);
      res.end('Server is shutting down');
    }
  }, 5000);

  activeRequests.set(id, { req, res, timeout });

  res.on('finish', () => {
    clearTimeout(timeout);
    activeRequests.delete(id);
  });

  res.on('close', () => {
    clearTimeout(timeout);
    activeRequests.delete(id);
  });

  // Lógica normal
  res.end('OK');
};

process.on('SIGTERM', () => {
  console.log('SIGTERM, closing gracefully...');

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Esperar a que terminen requests
  setTimeout(() => {
    // Forzar cierre de requests activos
    activeRequests.forEach(({ res }) => {
      if (!res.headersSent) {
        res.writeHead(503);
      }
      res.destroy();
    });
    process.exit(1);
  }, 30000);
});

server = http.createServer(requestHandler);
server.listen(3000);
```

## Con Connection Pooling (DB)

```javascript
const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  max: 10, // Máximo de conexiones
  idleTimeoutMillis: 30000
});

app.get('/users', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

let server;

async function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  // Dejar de aceptar requests
  server.close(() => {
    console.log('Server closed');
  });

  // Cerrar conexiones de DB
  try {
    console.log('Closing database connections...');
    await pool.end();
    console.log('Database pool closed');
  } catch (err) {
    console.error('Error closing pool:', err);
  }

  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server = app.listen(3000);
```

## Health Check durante Shutdown

```javascript
const express = require('express');
const app = express();

let isShuttingDown = false;

// Health check
app.get('/health', (req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ status: 'shutting_down' });
  } else {
    res.json({ status: 'healthy' });
  }
});

// Otras rutas
app.get('/data', (req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ error: 'Server shutting down' });
    return;
  }
  res.json({ data: 'value' });
});

function gracefulShutdown() {
  isShuttingDown = true;

  // Load balancer detecta shutdown via /health
  // y deja de enviar requests

  // Después de un delay, cerrar servidor
  setTimeout(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  }, 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const server = app.listen(3000);
```

## Testing de Graceful Shutdown

```javascript
describe('Graceful Shutdown', () => {
  it('should handle SIGTERM gracefully', (done) => {
    const child = require('child_process').spawn('node', ['server.js']);
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Esperar a que inicie
    setTimeout(() => {
      child.kill('SIGTERM');
    }, 1000);

    child.on('exit', (code) => {
      expect(code).toBe(0);
      expect(output).toContain('gracefully');
      done();
    });
  });
});
```

## Checklist de Shutdown

```javascript
// ✅ Checklist antes de exit
async function gracefulShutdown() {
  console.log('Starting graceful shutdown...');

  // ✅ 1. Dejar de aceptar conexiones
  server.close();

  // ✅ 2. Cerrar bases de datos
  await database.close();

  // ✅ 3. Cerrar caches (Redis, etc)
  await cache.disconnect();

  // ✅ 4. Cerrar message queues
  await messageQueue.close();

  // ✅ 5. Guardar estado critico si es necesario
  await saveState();

  // ✅ 6. Logs finales
  console.log('All services closed');

  // ✅ 7. Exit
  process.exit(0);
}
```

## Referencias

- [uncaught-exceptions.md](./uncaught-exceptions.md)
- [global-error-handling.md](./global-error-handling.md)
- [pm2-process-manager.md](../12-devops/pm2-process-manager.md)

## Pregunta de Entrevista

**¿Por qué es importante el graceful shutdown en producción?**

Sin graceful shutdown, se pierden requests en progreso y datos sin guardar. El graceful shutdown permite finalizar operaciones activas, cerrar conexiones, guardar estado, y hacer exit limpio. PM2 y Docker esperan graceful shutdown antes de forzar kill.
