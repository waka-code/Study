# Clean Architecture

## Principios Fundamentales

Clean Architecture separa concerns en capas independientes:

```
        ┌─────────────────────────────┐
        │  Presentation / Controllers  │
        │  (Express Routes)            │
        ├─────────────────────────────┤
        │  Use Cases / Services        │
        │  (Business Logic)            │
        ├─────────────────────────────┤
        │  Entities / Domain Models    │
        │  (Core Business Rules)       │
        ├─────────────────────────────┤
        │  Repositories / Gateways     │
        │  (Data Access)               │
        └─────────────────────────────┘
              ↓
        External Services (DB, APIs)
```

## Capas

### 1. Entities (Más Interno)

Objetos del dominio sin dependencias externas:

```javascript
// entities/User.js
class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  isValidEmail() {
    return this.email.includes('@');
  }

  setName(newName) {
    if (newName.length < 3) {
      throw new Error('Name too short');
    }
    this.name = newName;
  }
}

module.exports = User;
```

### 2. Use Cases (Business Logic)

Orquestar entities y coordinar acciones:

```javascript
// usecases/CreateUserUseCase.js
const User = require('../entities/User');

class CreateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(createUserDTO) {
    // Validar input
    if (!createUserDTO.email.includes('@')) {
      throw new Error('Invalid email');
    }

    // Crear entity
    const user = new User(null, createUserDTO.name, createUserDTO.email);

    // Guardar
    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }
}

module.exports = CreateUserUseCase;
```

### 3. Controllers (Presentation)

Mapear requests HTTP a use cases:

```javascript
// controllers/UserController.js
class UserController {
  constructor(createUserUseCase, getUserUseCase) {
    this.createUserUseCase = createUserUseCase;
    this.getUserUseCase = getUserUseCase;
  }

  async create(req, res, next) {
    try {
      const user = await this.createUserUseCase.execute(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await this.getUserUseCase.execute(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
```

### 4. Repositories (Data Access)

Abstraer persistencia de datos:

```javascript
// repositories/UserRepository.js
class UserRepository {
  constructor(database) {
    this.database = database;
  }

  async save(user) {
    const result = await this.database('users').insert({
      name: user.name,
      email: user.email
    });
    return { ...user, id: result[0] };
  }

  async findById(id) {
    return this.database('users').where('id', id).first();
  }

  async findAll() {
    return this.database('users').select('*');
  }

  async update(id, user) {
    await this.database('users').where('id', id).update({
      name: user.name,
      email: user.email
    });
    return this.findById(id);
  }

  async delete(id) {
    return this.database('users').where('id', id).del();
  }
}

module.exports = UserRepository;
```

## Inyección de Dependencias (DI)

Pasar dependencias en lugar de crearlas:

```javascript
// config/di.js (Contenedor DI)
const CreateUserUseCase = require('../usecases/CreateUserUseCase');
const GetUserUseCase = require('../usecases/GetUserUseCase');
const UserController = require('../controllers/UserController');
const UserRepository = require('../repositories/UserRepository');
const database = require('./database');

class DIContainer {
  constructor() {
    this.services = {};
  }

  register(name, definition) {
    this.services[name] = definition;
  }

  get(name) {
    const service = this.services[name];
    if (typeof service === 'function') {
      return service(this);
    }
    return service;
  }
}

const container = new DIContainer();

// Registrar dependencias
container.register('database', () => database);
container.register('userRepository', (c) => new UserRepository(c.get('database')));
container.register('createUserUseCase', (c) => new CreateUserUseCase(c.get('userRepository')));
container.register('getUserUseCase', (c) => new GetUserUseCase(c.get('userRepository')));
container.register('userController', (c) => new UserController(
  c.get('createUserUseCase'),
  c.get('getUserUseCase')
));

module.exports = container;
```

### Uso en Routes

```javascript
// routes/users.js
const express = require('express');
const container = require('../config/di');

const router = express.Router();
const userController = container.get('userController');

router.post('/', (req, res, next) => userController.create(req, res, next));
router.get('/:id', (req, res, next) => userController.getById(req, res, next));

module.exports = router;
```

## Estructura de Carpetas

```
src/
├── entities/
│   ├── User.js
│   ├── Order.js
│   └── Product.js
├── usecases/
│   ├── user/
│   │   ├── CreateUserUseCase.js
│   │   ├── GetUserUseCase.js
│   │   └── UpdateUserUseCase.js
│   ├── order/
│   │   └── ...
│   └── product/
│       └── ...
├── repositories/
│   ├── UserRepository.js
│   ├── OrderRepository.js
│   └── ProductRepository.js
├── controllers/
│   ├── UserController.js
│   ├── OrderController.js
│   └── ProductController.js
├── middleware/
│   ├── errorHandler.js
│   └── auth.js
├── routes/
│   ├── users.js
│   ├── orders.js
│   └── index.js
├── config/
│   ├── di.js (Dependency Injection)
│   ├── database.js
│   └── env.js
└── app.js
```

## Beneficios

✅ **Independencia de Framework**: Cambiar Express por Fastify es fácil
✅ **Testeable**: Cada capa se testea aislada
✅ **Mantenible**: Código organizado por responsabilidad
✅ **Flexible**: Cambiar DB sin tocar lógica de negocio
✅ **Escalable**: Fácil agregar nuevas features

## Ejemplo: Testing

```javascript
// __tests__/usecases/CreateUserUseCase.test.js

describe('CreateUserUseCase', () => {
  it('should create user', async () => {
    // Mock repository
    const mockRepository = {
      save: jest.fn().mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com' })
    };

    const useCase = new CreateUserUseCase(mockRepository);

    const result = await useCase.execute({
      name: 'John',
      email: 'john@example.com'
    });

    expect(result.id).toBe(1);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should validate email', async () => {
    const mockRepository = {};
    const useCase = new CreateUserUseCase(mockRepository);

    await expect(
      useCase.execute({ name: 'John', email: 'invalid' })
    ).rejects.toThrow('Invalid email');
  });
});
```

## SOLID Principles

### Single Responsibility

```javascript
// ✅ BIEN: Cada clase tiene una responsabilidad
class User {
  // Solo lógica de User
}

class UserRepository {
  // Solo acceso a datos
}

class CreateUserUseCase {
  // Solo orquestar creación
}
```

### Open/Closed

```javascript
// ✅ BIEN: Abierto para extensión, cerrado para modificación
abstract class Repository {
  abstract save(entity);
  abstract findById(id);
}

class UserRepository extends Repository {
  save(user) { /* ... */ }
  findById(id) { /* ... */ }
}

class OrderRepository extends Repository {
  save(order) { /* ... */ }
  findById(id) { /* ... */ }
}
```

### Liskov Substitution

```javascript
// ✅ BIEN: Subclases reemplazan base sin problemas
const repos = [new UserRepository(), new OrderRepository()];
repos.forEach(repo => repo.save(entity)); // Funciona con cualquiera
```

### Interface Segregation

```javascript
// ❌ MAL: Interfaz grande
class Repository {
  save() {}
  findById() {}
  findAll() {}
  update() {}
  delete() {}
  search() {}
  paginate() {}
}

// ✅ BIEN: Interfaces pequeñas
class SaveableRepository { save() {} }
class FindableRepository { findById() {} }
class SearchableRepository { search() {} }
```

### Dependency Inversion

```javascript
// ❌ MAL: Depende de implementación
class CreateUserUseCase {
  constructor() {
    this.repository = new PostgresUserRepository();
  }
}

// ✅ BIEN: Depende de abstracción
class CreateUserUseCase {
  constructor(userRepository) {
    this.repository = userRepository;
  }
}
```

## Referencias

- [monolith-vs-microservices.md](./monolith-vs-microservices.md)
- [event-driven.md](./event-driven.md)
- [jest-vitest.md](../11-testing/jest-vitest.md)

## Pregunta de Entrevista

**¿Cuáles son los beneficios de Clean Architecture?**

Separación de concerns hace código más testeable, mantenible, flexible. Cambios en la DB no afectan lógica de negocio. Fácil cambiar de Postgres a MongoDB. Cada capa tiene responsabilidad única. Soporta SOLID principles.
