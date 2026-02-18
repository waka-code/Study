# Express: Conceptos Avanzados

## Orden de Middleware

**CRÍTICO**: El orden de middleware importa.

```javascript
const express = require('express');
const app = express();

// 1. Parsers primero
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 3. Autenticación
const authMiddleware = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// 4. Rutas públicas
app.get('/health', (req, res) => res.json({ ok: true }));

// 5. Proteger rutas posteriores
app.use(authMiddleware);

// 6. Rutas protegidas
app.get('/profile', (req, res) => res.json({ user: 'data' }));

// 7. Error handler SIEMPRE al final
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(3000);
```

## Router (Sub-aplicaciones)

Organiza rutas en módulos:

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

router.post('/', (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id });
});

router.put('/:id', (req, res) => {
  res.json({ id: req.params.id, ...req.body });
});

router.delete('/:id', (req, res) => {
  res.sendStatus(204);
});

module.exports = router;
```

```javascript
// app.js
const express = require('express');
const usersRouter = require('./routes/users');

const app = express();
app.use(express.json());

// Monta el router en /api/users
app.use('/api/users', usersRouter);

app.listen(3000);
```

## Error Handling Global

### Approach 1: Error Handler Middleware

```javascript
// ✅ BIEN: Capturar errores con async
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await database.findUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(user);
  } catch (err) {
    next(err); // Pasa a error handler
  }
});

// Error handler: 4 parámetros (err, req, res, next)
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Errores conocidos
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Error genérico
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### Approach 2: Wrapper Async

```javascript
// Función helper para envolver routes async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await database.findUser(req.params.id);
  res.json(user);
}));
```

### Approach 3: Validación Centralizada

```javascript
const validateRequest = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  req.validated = value;
  next();
};

app.post('/users', validateRequest(userSchema), (req, res) => {
  // req.validated tiene datos validados
  res.json(req.validated);
});
```

## Best Practices

### 1. Estructura de Proyecto

```
project/
├── routes/
│   ├── users.js
│   ├── products.js
│   └── index.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   └── validation.js
├── controllers/
│   ├── userController.js
│   └── productController.js
├── services/
│   └── userService.js
├── models/
│   └── user.js
└── app.js
```

### 2. Separación de Concerns

```javascript
// controllers/userController.js
async function getUser(req, res, next) {
  try {
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// routes/users.js
const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

router.get('/:id', userController.getUser);

module.exports = router;
```

### 3. Middleware Reutilizable

```javascript
// middleware/auth.js
const authRequired = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// routes/protected.js
router.get('/profile', authRequired, (req, res) => {
  res.json(req.user);
});
```

### 4. Logging Estructurado

```javascript
// middleware/logging.js
const logger = require('pino')();

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: duration
    });
  });

  next();
});
```

### 5. CORS Seguro

```javascript
// ❌ MAL
app.use(cors()); // Permite TODOS los orígenes

// ✅ BIEN
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

## Problemas Comunes

| Problema | Solución |
|----------|----------|
| Middleware no ejecuta | Verificar orden de `app.use()` |
| Error handler no ejecuta | Debe tener 4 parámetros `(err, req, res, next)` |
| Rutas no encontradas | Error handler 404 debe ser ÚLTIMO |
| Async/await cuelga | Usar try/catch o asyncHandler |

## Referencias

- [http-nativo.md](../05-http/http-nativo.md)
- [nestjs.md](./nestjs.md)
- [global-error-handling.md](../07-errores-estabilidad/global-error-handling.md)

## Pregunta de Entrevista

**¿Por qué debe colocar el error handler al final?**

Porque middleware se ejecuta en orden. Si coloca error handler antes que las rutas, nunca capturará errores. El error handler debe ser el último middleware con 4 parámetros (err, req, res, next).
