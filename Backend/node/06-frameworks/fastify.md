# Fastify: Framework de Alta Performance

## Por qué Fastify

```
Benchmark (requests/sec) - Máquina típica:

Express:   5,000
Fastify:  20,000+
Node.js HTTP: 25,000

Fastify es 4x más rápido que Express con menos overhead.
```

## Servidor Básico

```javascript
const Fastify = require('fastify');

const fastify = Fastify({ logger: true });

fastify.get('/', async (request, reply) => {
  return { hello: 'world' };
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) fastify.log.error(err);
  fastify.log.info('Server listening on port 3000');
});
```

## Routes y Métodos

```javascript
// GET
fastify.get('/users/:id', async (request, reply) => {
  return { id: request.params.id };
});

// POST con body
fastify.post('/users', async (request, reply) => {
  return { created: request.body };
});

// Métodos múltiples
fastify.route({
  method: 'PUT',
  url: '/users/:id',
  handler: async (request, reply) => {
    return { updated: request.params.id };
  }
});

// Prefix automático
fastify.register(async (fastify) => {
  fastify.get('/list', async () => []);
  fastify.post('/create', async () => ({}));
}, { prefix: '/users' });
```

## JSON Schema para Validación y Documentación

```javascript
// ✅ BIEN: Schema declarativo
const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      age: { type: 'integer', minimum: 0 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    }
  }
};

fastify.post('/users',
  { schema: createUserSchema },
  async (request, reply) => {
    // request.body está validado
    reply.code(201);
    return { id: 1, ...request.body };
  }
);
```

## Plugins (Ecosystem)

Fastify es completamente modular:

```javascript
// logger-plugin.js
async function loggerPlugin(fastify, options) {
  fastify.decorate('logger', {
    log: (msg) => console.log(msg)
  });
}

// main.js
fastify.register(loggerPlugin);

// Plugins oficiales
fastify.register(require('@fastify/cors'));
fastify.register(require('@fastify/helmet')); // Seguridad
fastify.register(require('@fastify/jwt'), {
  secret: 'your-secret'
});

fastify.register(require('@fastify/postgresql'), {
  connectionString: 'postgres://user:pass@localhost/db'
});
```

## Hooks (Lifecycle)

```javascript
// Antes de manejo de ruta
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

// Después de handler
fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  console.log(`${request.method} ${request.url} - ${duration}ms`);
});

// Manejo de errores
fastify.addHook('onError', async (request, reply, error) => {
  fastify.log.error(error);
});
```

## Error Handling

```javascript
// Error handler personalizado
fastify.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 429) {
    reply.statusCode = 429;
    return { statusCode: 429, message: 'Rate limited' };
  }

  if (error.statusCode >= 500) {
    fastify.log.error(error);
  }

  reply.send(error);
});

// Errores en rutas
fastify.post('/users', async (request, reply) => {
  try {
    const user = await createUser(request.body);
    return user;
  } catch (err) {
    reply.code(400).send({ error: err.message });
  }
});
```

## Streaming y Grandes Respuestas

```javascript
const fs = require('fs');

// Stream de archivo
fastify.get('/file', async (request, reply) => {
  return fs.createReadStream('large-file.txt');
});

// JSON streaming
fastify.get('/large-data', async (request, reply) => {
  reply.type('application/x-ndjson');

  for (let i = 0; i < 10000; i++) {
    reply.send({ id: i, data: 'value' } + '\n');
  }
});
```

## Comparación Fastify vs Express

| Característica | Express | Fastify |
|---|---|---|
| **Performance** | 5,000 req/s | 20,000+ req/s |
| **Schema Validation** | Manual | Built-in JSON Schema |
| **Overhead** | Alto | Bajo |
| **Plugins** | Middleware | Plugins modulares |
| **TypeScript** | Manual | Soporte nativo |
| **Async/Await** | ✅ | ✅ Optimizado |
| **Documentación** | Excelente | Muy buena |
| **Comunidad** | Muy grande | Creciente |
| **Curva aprendizaje** | Baja | Media |

### Cuándo usar cada uno

**Express:**
- Proyectos pequeños
- Máxima compatibilidad
- Equipo familiar con Express

**Fastify:**
- APIs de alta performance
- Microservicios
- Proyectos nuevos
- Validación automática con schemas

## Estructura de Proyecto Fastify

```
src/
├── plugins/
│   ├── db.js
│   ├── auth.js
│   └── cors.js
├── routes/
│   ├── users.js
│   └── products.js
├── controllers/
│   └── userController.js
├── services/
│   └── userService.js
├── app.js
└── main.js
```

```javascript
// app.js
async function build(opts = {}) {
  const fastify = Fastify(opts);

  // Plugins
  await fastify.register(require('./plugins/db'));
  await fastify.register(require('./plugins/auth'));

  // Routes
  await fastify.register(require('./routes/users'), { prefix: '/users' });
  await fastify.register(require('./routes/products'), { prefix: '/products' });

  return fastify;
}

module.exports = build;
```

## Referencias

- [express-senior.md](./express-senior.md)
- [event-loop-monitoring.md](../08-performance/event-loop-monitoring.md)
- [Documentación Fastify](https://www.fastify.io/)

## Pregunta de Entrevista

**¿Por qué Fastify es más rápido que Express?**

Fastify usa un router patentado más eficiente, validación con JSON Schema integrada, y un sistema de plugins más ligero. Además, evita middleware innecesarios. Express tiene más flexibility pero más overhead.
