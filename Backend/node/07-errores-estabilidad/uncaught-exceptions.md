# Excepciones No Capturadas

## process.on('uncaughtException')

Atrapa errores síncronos no manejados:

```javascript
// ⚠️ IMPORTANTE: Registrar PRIMERO antes de cargar aplicación
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);

  // Log a archivo
  fs.appendFileSync(
    'logs/crashes.log',
    `${new Date().toISOString()}: ${error.message}\n${error.stack}\n\n`
  );

  // Alertar
  sendAlert({
    type: 'CRASH',
    message: error.message,
    stack: error.stack
  });

  // ⚠️ CRÍTICO: Salir limpiamente (después de logging)
  // El proceso está en estado inestable
  process.exit(1);
});

// Ahora cargar la aplicación
const app = require('./app');
app.listen(3000);
```

## process.on('unhandledRejection')

Atrapa rechazos de Promises no manejados:

```javascript
// Registrar primero
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', {
    reason,
    promise
  });

  // Logging
  fs.appendFileSync(
    'logs/rejections.log',
    `${new Date().toISOString()}: ${reason}\n\n`
  );

  // Opcional: salir si es crítico
  if (isCritical(reason)) {
    process.exit(1);
  }
});

function isCritical(reason) {
  // Definir qué se considera crítico
  return reason.code === 'ECONNREFUSED' || reason.message.includes('database');
}

// Cargar aplicación
require('./app');
```

## Errores Síncronos vs Asincronos

```javascript
// ❌ SINCRÓNICO: Capturado por uncaughtException
setTimeout(() => {
  throw new Error('Sync error in timeout');
}, 100);

// ✅ MAL: No capturado
setTimeout(() => {
  Promise.reject(new Error('Promise rejection'));
}, 100);

// ✅ BIEN: Capturado por unhandledRejection
Promise.reject(new Error('Rejected promise'));

// ✅ BIEN: Capturado en .catch()
Promise.reject(new Error('Rejected promise'))
  .catch(err => console.error(err));
```

## Patrón Seguro: Wrapping Promises

```javascript
// ✅ BIEN: Envolver promises con manejo de error
async function safeExecute(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error('Error in async function:', err);
    throw err; // Re-lanzar si es necesario
  }
}

// Uso
safeExecute(async () => {
  await database.connect();
}).catch(err => {
  console.error('Failed to connect:', err);
  process.exit(1);
});
```

## Estructura Segura de Aplicación

```javascript
// main.js
const app = require('./app');

// Handlers de proceso
process.on('uncaughtException', (error) => {
  console.error('CRASH:', error.message);
  fs.appendFileSync('logs/crashes.log', `${new Date()}: ${error}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('REJECTION:', reason);
  fs.appendFileSync('logs/rejections.log', `${new Date()}: ${reason}\n`);
  // No salir automáticamente
});

process.on('warning', (warning) => {
  console.warn('WARNING:', warning.name, warning.message);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Iniciar servidor
const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port 3000 already in use');
    process.exit(1);
  }
});
```

## Logging de Errores a Archivo

```javascript
const fs = require('fs');
const path = require('path');

class ErrorLogger {
  constructor(logDir = 'logs') {
    this.logDir = logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  logUncaughtException(error) {
    const file = path.join(this.logDir, 'uncaught-exceptions.log');
    const message = `
[${new Date().toISOString()}] UNCAUGHT EXCEPTION
Message: ${error.message}
Stack: ${error.stack}
---
`;
    fs.appendFileSync(file, message);
  }

  logUnhandledRejection(reason) {
    const file = path.join(this.logDir, 'unhandled-rejections.log');
    const message = `
[${new Date().toISOString()}] UNHANDLED REJECTION
Reason: ${reason}
---
`;
    fs.appendFileSync(file, message);
  }
}

const errorLogger = new ErrorLogger();

process.on('uncaughtException', (error) => {
  errorLogger.logUncaughtException(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  errorLogger.logUnhandledRejection(reason);
});
```

## Testing de Error Handlers

```javascript
describe('Error Handlers', () => {
  it('should log uncaught exceptions', (done) => {
    const originalHandler = process.listeners('uncaughtException')[0];

    process.once('uncaughtException', (error) => {
      expect(error.message).toBe('Test error');
      done();
    });

    throw new Error('Test error');
  });

  it('should log unhandled rejections', (done) => {
    process.once('unhandledRejection', (reason) => {
      expect(reason).toBe('Test rejection');
      done();
    });

    Promise.reject('Test rejection');
  });
});
```

## Diferencia con Express Error Handler

| Tipo | Captura | Cómo Manejar |
|------|---------|------------|
| Express Handler | Errores en rutas | `next(err)` |
| uncaughtException | Errores no capturados | `process.on()` |
| unhandledRejection | Promises no resueltas | `process.on()` |

```javascript
// Jerarquía de manejo
try {
  // Code
} catch (err) {
  // Express error handler
  next(err);
}

// Si no es capturado:
// → uncaughtException / unhandledRejection
// → process.exit(1)
```

## Referencias

- [global-error-handling.md](./global-error-handling.md)
- [graceful-shutdown.md](./graceful-shutdown.md)
- [Documentación Node.js - Process](https://nodejs.org/api/process.html)

## Pregunta de Entrevista

**¿Por qué debe registrar uncaughtException al inicio?**

Porque debe estar registrado ANTES de que ocurra cualquier error. Si lo registra después de cargar módulos, puede que ya haya un error sin manejo. Es una protección de último recurso.
