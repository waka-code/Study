# Testing de APIs con Supertest

## Setup Básico

```bash
npm install --save-dev supertest
```

```javascript
// app.js
const express = require('express');
const app = express();

app.use(express.json());

app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.post('/users', (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});

module.exports = app;
```

## Testing básico de Endpoints

```javascript
// app.test.js
const request = require('supertest');
const app = require('./app');

describe('API', () => {
  describe('GET /users', () => {
    it('should return users array', async () => {
      const res = await request(app)
        .get('/users')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'John' })
        ])
      );
    });
  });

  describe('POST /users', () => {
    it('should create user', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'Jane', email: 'jane@example.com' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Jane');
    });

    it('should reject invalid data', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });
});
```

## Assertions Comunes

```javascript
describe('Assertions', () => {
  it('should check status code', async () => {
    await request(app).get('/users').expect(200);
  });

  it('should check headers', async () => {
    const res = await request(app)
      .get('/users')
      .expect('Content-Type', /json/)
      .expect('X-Custom-Header', 'value');

    expect(res.headers['x-custom-header']).toBe('value');
  });

  it('should check body', async () => {
    const res = await request(app).get('/users');

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual({
      id: expect.any(Number),
      name: expect.any(String)
    });
  });

  it('should check response type', async () => {
    const res = await request(app)
      .get('/users')
      .expect('Content-Type', /application\/json/);

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });
});
```

## Setup/Teardown con DB

```javascript
let app;
let db;

beforeAll(async () => {
  // Iniciar servidor
  app = require('./app');
  // Conectar DB test
  db = await initTestDatabase();
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  // Limpiar DB antes de cada test
  await db.clear();
  // Seed datos de test
  await seedTestData();
});

describe('User API', () => {
  it('should list users', async () => {
    const res = await request(app).get('/users');
    expect(res.body).toHaveLength(3); // 3 users seeded
  });
});
```

## Testing CRUD Completo

```javascript
describe('User CRUD', () => {
  it('should create, read, update, delete', async () => {
    // CREATE
    const createRes = await request(app)
      .post('/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);

    const userId = createRes.body.id;

    // READ
    const getRes = await request(app)
      .get(`/users/${userId}`)
      .expect(200);

    expect(getRes.body.name).toBe('John');

    // UPDATE
    const updateRes = await request(app)
      .put(`/users/${userId}`)
      .send({ name: 'Jane' })
      .expect(200);

    expect(updateRes.body.name).toBe('Jane');

    // DELETE
    await request(app)
      .delete(`/users/${userId}`)
      .expect(204);

    // Verify deleted
    await request(app)
      .get(`/users/${userId}`)
      .expect(404);
  });
});
```

## Testing de Autenticación

```javascript
describe('Auth', () => {
  const credentials = {
    email: 'user@example.com',
    password: 'secret123'
  };

  it('should login and get token', async () => {
    const res = await request(app)
      .post('/login')
      .send(credentials)
      .expect(200);

    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should access protected route with token', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('email');
  });

  it('should reject without token', async () => {
    await request(app)
      .get('/profile')
      .expect(401);
  });

  it('should reject with invalid token', async () => {
    await request(app)
      .get('/profile')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
  });
});
```

## Testing de Errores

```javascript
describe('Error Handling', () => {
  it('should return 404 for missing resource', async () => {
    const res = await request(app)
      .get('/users/9999')
      .expect(404);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should return 400 for invalid input', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: '' }) // Inválido
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 500 on server error', async () => {
    // Mock error en servicio
    jest.spyOn(userService, 'getUser').mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .get('/users/1')
      .expect(500);

    expect(res.body).toHaveProperty('error');
  });
});
```

## Testing con Mocks de Servicios

```javascript
const userService = require('./services/userService');
jest.mock('./services/userService');

describe('User API with Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return mocked users', async () => {
    userService.getAllUsers.mockResolvedValue([
      { id: 1, name: 'John' }
    ]);

    const res = await request(app)
      .get('/users')
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(userService.getAllUsers).toHaveBeenCalled();
  });

  it('should handle service error', async () => {
    userService.getAllUsers.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .get('/users')
      .expect(500);

    expect(res.body).toHaveProperty('error');
  });
});
```

## Chaining de Requests

```javascript
describe('Workflow', () => {
  it('should complete full workflow', async () => {
    let userId;

    // Paso 1: Crear usuario
    {
      const res = await request(app)
        .post('/users')
        .send({ name: 'John' });
      userId = res.body.id;
    }

    // Paso 2: Crear post para usuario
    {
      const res = await request(app)
        .post(`/users/${userId}/posts`)
        .send({ title: 'Hello', content: 'World' });
      expect(res.status).toBe(201);
    }

    // Paso 3: Listar posts
    {
      const res = await request(app)
        .get(`/users/${userId}/posts`);
      expect(res.body).toHaveLength(1);
    }
  });
});
```

## Testing de Query Strings y Headers

```javascript
describe('Query and Headers', () => {
  it('should filter by query params', async () => {
    const res = await request(app)
      .get('/users')
      .query({ role: 'admin', limit: 10 })
      .expect(200);

    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'admin' })
      ])
    );
  });

  it('should accept custom headers', async () => {
    const res = await request(app)
      .get('/users')
      .set('X-API-Key', 'secret')
      .set('Accept', 'application/json')
      .expect(200);

    expect(res.ok).toBe(true);
  });

  it('should handle cookies', async () => {
    const res = await request(app)
      .get('/users')
      .set('Cookie', 'session=abc123')
      .expect(200);

    expect(res.headers['set-cookie']).toBeDefined();
  });
});
```

## Timeouts en Tests

```javascript
describe('Timeouts', () => {
  it('should handle slow requests', async () => {
    jest.setTimeout(10000); // 10 segundos para este test

    const res = await request(app)
      .get('/slow-endpoint')
      .timeout(5000) // 5 segundos timeout de request
      .expect(200);
  }, 15000); // 15 segundos para todo el test
});
```

## Estructura Recomendada

```
tests/
├── unit/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   │   ├── users.test.js
│   │   └── posts.test.js
│   └── database/
├── fixtures/
│   └── seeds.js
└── setup.js
```

## Referencias

- [jest-vitest.md](./jest-vitest.md)
- [mocks-stubs.md](./mocks-stubs.md)
- [global-error-handling.md](../07-errores-estabilidad/global-error-handling.md)

## Pregunta de Entrevista

**¿Por qué es importante mockear servicios en tests de API?**

Porque permite testear la API independiente de dependencias (DB, servicios externos). Aisla la lógica de rutas del comportamiento de servicios. Hace tests más rápidos, determinísticos, y sin side effects. Permite simular errores sin afectar infraestructura real.
