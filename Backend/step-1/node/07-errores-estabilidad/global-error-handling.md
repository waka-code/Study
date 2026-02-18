# Manejo Global de Errores

## Error Handler Centralizado en Express

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// 1. Rutas normales
app.post('/users', (req, res, next) => {
  // Pasar errores a next()
  try {
    validateUser(req.body);
    res.json({ success: true });
  } catch (err) {
    next(err); // Error handler lo captura
  }
});

// 2. Async con try/catch
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err); // Pasa a error handler
  }
});

// 3. Error handler (DEBE ser al final)
// ⚠️ IMPORTANTE: 4 parámetros (err, req, res, next)
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  // Tipos de error conocidos
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: err.message,
      type: 'VALIDATION'
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized',
      type: 'AUTH'
    });
  }

  if (err.code === 'ENOENT') {
    return res.status(404).json({
      status: 'error',
      message: 'Resource not found',
      type: 'NOT_FOUND'
    });
  }

  // Error desconocido
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    type: 'SERVER_ERROR'
  });
});

app.listen(3000);
```

## Try/Catch con Async/Await

```javascript
// ✅ BIEN: Manejo explícito
app.get('/data', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ❌ MAL: Promise colgada
app.get('/data', async (req, res) => {
  const data = await fetchData(); // Si falla, error no se captura
  res.json(data);
});

// ✅ BIEN: Catch implícito con .catch()
app.get('/data', (req, res, next) => {
  fetchData()
    .then(data => res.json(data))
    .catch(next); // Pasa al error handler
});
```

## Wrapper para Async Routes

Para evitar repetir try/catch en cada ruta:

```javascript
// asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

// Uso
const asyncHandler = require('./asyncHandler');

app.post('/users', asyncHandler(async (req, res) => {
  const user = await db.create(req.body);
  res.status(201).json(user);
  // Si falla, automáticamente va al error handler
}));
```

## Errores Personalizados

```javascript
// Crear clase de error personalizada
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usar en la aplicación
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Error handler mejorado
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

## Validación de Entrada

```javascript
// Middleware de validación
const validateInput = (req, res, next) => {
  const { name, email } = req.body;

  // Validaciones
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Name is required'
    });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      error: 'Valid email is required'
    });
  }

  // Pasar datos limpios
  req.validated = { name: name.trim(), email: email.trim() };
  next();
};

app.post('/users', validateInput, async (req, res, next) => {
  try {
    const user = await db.create(req.validated);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});
```

## Error Logging Estructurado

```javascript
const fs = require('fs');

const errorLogger = (err, req, res, next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode: err.statusCode || 500,
    message: err.message,
    stack: err.stack,
    userId: req.user?.id || null
  };

  // Escribir a archivo
  fs.appendFileSync(
    'logs/errors.json',
    JSON.stringify(errorLog) + '\n'
  );

  // Enviar alerta si es crítico
  if (err.statusCode >= 500) {
    sendAlert(errorLog);
  }

  res.status(err.statusCode || 500).json({
    error: err.message
  });
};

app.use(errorLogger);
```

## Manejo de Diferentes Tipos de Error

```javascript
// Custom error types
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// Uso
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id);
    if (!user) {
      throw new NotFoundError('User');
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Error handler
app.use((err, req, res, next) => {
  const errorMap = {
    'ValidationError': 400,
    'NotFoundError': 404,
    'UnauthorizedError': 401
  };

  const statusCode = errorMap[err.name] || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message
  });
});
```

## Testing de Error Handling

```javascript
const request = require('supertest');

describe('Error Handling', () => {
  it('should return 400 for invalid input', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 404 for missing resource', async () => {
    const res = await request(app)
      .get('/users/999');

    expect(res.status).toBe(404);
  });

  it('should return 500 on server error', async () => {
    const res = await request(app)
      .get('/error-endpoint');

    expect(res.status).toBe(500);
  });
});
```

## Referencias

- [express-senior.md](../06-frameworks/express-senior.md)
- [uncaught-exceptions.md](./uncaught-exceptions.md)
- [graceful-shutdown.md](./graceful-shutdown.md)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre throw y next(err) en Express?**

`throw` lanza un error sincrónico. `next(err)` lo pasa al error handler. En async/await, ambos funcionan si están en try/catch. La recomendación es usar try/catch → next(err) para consistencia.
