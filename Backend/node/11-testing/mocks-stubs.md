# Mocks, Stubs y Spies

## Conceptos Fundamentales

| Concepto | Propósito | Comportamiento |
|----------|-----------|----------------|
| **Mock** | Simular dependencia | Responde valores predefinidos |
| **Stub** | Reemplazar función | Devuelve valores fijos |
| **Spy** | Monitorear llamadas | Registra pero permite original |

## Jest.fn() - Crear Mocks

### Mock Básico

```javascript
const mockFn = jest.fn();

mockFn();
mockFn(1, 2);
mockFn({ a: 1 });

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(1, 2);
expect(mockFn).toHaveBeenCalledTimes(3);
expect(mockFn.mock.calls).toHaveLength(3);
```

### Configurar Valores de Retorno

```javascript
const mockFn = jest.fn();

// Valores específicos
mockFn.mockReturnValue(42);
expect(mockFn()).toBe(42);

// Múltiples llamadas con diferentes valores
mockFn
  .mockReturnValueOnce(1)
  .mockReturnValueOnce(2)
  .mockReturnValueOnce(3);

expect(mockFn()).toBe(1);
expect(mockFn()).toBe(2);
expect(mockFn()).toBe(3);
```

### Promises (Async)

```javascript
const mockFn = jest.fn();

// Resolver
mockFn.mockResolvedValue({ id: 1 });
await expect(mockFn()).resolves.toEqual({ id: 1 });

// Rechazar
mockFn.mockRejectedValue(new Error('Failed'));
await expect(mockFn()).rejects.toThrow('Failed');

// Múltiples valores
mockFn
  .mockResolvedValueOnce({ id: 1 })
  .mockRejectedValueOnce(new Error('Failed'))
  .mockResolvedValueOnce({ id: 2 });
```

### Mock con Implementación Personalizada

```javascript
const mockFn = jest.fn((a, b) => {
  return a + b;
});

expect(mockFn(2, 3)).toBe(5);

// O con mockImplementation
const add = jest.fn();
add.mockImplementation((a, b) => a + b);

expect(add(2, 3)).toBe(5);
```

## Jest.mock() - Mock de Módulos

### Mock Completo

```javascript
// database.js
async function getUser(id) {
  // Acceso real a DB
  return db.query(`SELECT * FROM users WHERE id = ${id}`);
}

module.exports = { getUser };

// user.test.js
jest.mock('./database');
const { getUser } = require('./database');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get user', async () => {
    getUser.mockResolvedValue({ id: 1, name: 'John' });

    const user = await getUser(1);
    expect(user.name).toBe('John');
    expect(getUser).toHaveBeenCalledWith(1);
  });
});
```

### Mock con factory

```javascript
jest.mock('./api', () => ({
  fetchUser: jest.fn(),
  fetchPosts: jest.fn(),
  API_URL: 'http://test.api'
}));

const { fetchUser, API_URL } = require('./api');

it('should use API_URL', () => {
  fetchUser.mockResolvedValue({});
  expect(API_URL).toBe('http://test.api');
});
```

### Mock Parcial (algunos reales)

```javascript
jest.mock('./utils', () => ({
  sum: jest.fn((a, b) => a + b), // Mock
  subtract: jest.requireActual('./utils').subtract // Real
}));

const { sum, subtract } = require('./utils');

it('should have mocked sum', () => {
  expect(sum(2, 3)).toBe(5);
  expect(sum).toHaveBeenCalled();
});

it('should have real subtract', () => {
  // subtract es real
});
```

## jest.spyOn() - Spies

### Spy en Objetos

```javascript
const obj = {
  method: () => 'original'
};

const spy = jest.spyOn(obj, 'method');
spy.mockReturnValue('spied');

expect(obj.method()).toBe('spied');
expect(spy).toHaveBeenCalled();

spy.mockRestore(); // Restaurar original
expect(obj.method()).toBe('original');
```

### Spy en Módulos

```javascript
const math = require('./math');

const spy = jest.spyOn(math, 'add');
spy.mockReturnValue(99);

math.add(1, 2); // 99
expect(spy).toHaveBeenCalledWith(1, 2);

spy.mockRestore();
math.add(1, 2); // 3
```

### Partial Spy (monitorear sin cambiar)

```javascript
const obj = {
  method: (x) => x * 2
};

const spy = jest.spyOn(obj, 'method');
// NO mockear, dejar original

expect(obj.method(5)).toBe(10); // Original
expect(spy).toHaveBeenCalledWith(5);
```

## Sinon (Alternativa a Jest)

```bash
npm install --save-dev sinon
```

```javascript
const sinon = require('sinon');

describe('Sinon', () => {
  let stub;

  beforeEach(() => {
    stub = sinon.stub();
  });

  afterEach(() => {
    stub.restore();
  });

  it('should stub function', () => {
    stub.returns(42);
    expect(stub()).toBe(42);
    expect(stub.calledOnce).toBe(true);
  });

  it('should spy on method', () => {
    const obj = {
      method: () => 'original'
    };

    const spy = sinon.spy(obj, 'method');
    obj.method();

    expect(spy.calledOnce).toBe(true);
    spy.restore();
  });
});
```

## Comparación: Jest vs Sinon

| Característica | Jest | Sinon |
|---|---|---|
| Spy | `jest.spyOn()` | `sinon.spy()` |
| Stub | `jest.fn()` | `sinon.stub()` |
| Mock | `jest.mock()` | `sinon.mock()` |
| Ease | ✅ Fácil | ⚠️ Más complejo |
| Standalone | ❌ Con Jest | ✅ Sí |

## Patrón: Service Mocking

```javascript
// userService.js
async function getUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

module.exports = { getUser };

// useCase.js
async function getUserProfile(userId) {
  const user = await getUser(userId);
  return {
    name: user.name,
    email: user.email
  };
}

// useCase.test.js
jest.mock('./userService');
const { getUser } = require('./userService');
const { getUserProfile } = require('./useCase');

describe('getUserProfile', () => {
  it('should return user profile', async () => {
    getUser.mockResolvedValue({
      id: 1,
      name: 'John',
      email: 'john@example.com'
    });

    const profile = await getUserProfile(1);
    expect(profile.name).toBe('John');
  });

  it('should handle errors', async () => {
    getUser.mockRejectedValue(new Error('Not found'));

    await expect(getUserProfile(999)).rejects.toThrow();
  });
});
```

## Patrón: HTTP Mocking

```javascript
describe('HTTP Requests', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('should fetch data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'John' })
    });

    const response = await fetch('/api/user');
    const data = await response.json();

    expect(data.name).toBe('John');
    expect(fetchMock).toHaveBeenCalledWith('/api/user');
  });

  it('should handle 404', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404
    });

    const response = await fetch('/api/user');
    expect(response.ok).toBe(false);
  });
});
```

## Patrón: Timer Mocking

```javascript
describe('Timers', () => {
  it('should mock timers', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    jest.runAllTimers();
    expect(callback).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should advance timers', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    setInterval(callback, 1000);

    jest.advanceTimersByTime(3500);
    expect(callback).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });
});
```

## Best Practices

```javascript
// ✅ BIEN

// 1. Mock solo dependencias externas
jest.mock('./database'); // Sí
jest.mock('./utils/format'); // Sí

// 2. No mockear módulos que testeas
jest.mock('./userService'); // Si no la testeas
// Pero testea userService sin mock

// 3. Limpiar mocks después de cada test
beforeEach(() => {
  jest.clearAllMocks();
});

// 4. Usar nombres descriptivos
const mockGetUser = jest.fn();
const mockDatabaseError = jest.fn().mockRejectedValue(new Error('DB error'));

// 5. Restaurar spies
afterEach(() => {
  jest.restoreAllMocks();
});

// 6. Verificar calls, no valores globales
expect(mockFn).toHaveBeenCalledWith(expectedArg);
```

## Referencias

- [jest-vitest.md](./jest-vitest.md)
- [supertest-api.md](./supertest-api.md)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre jest.fn(), jest.mock(), y jest.spyOn()?**

- `jest.fn()`: Función mock desde cero, sin implementación
- `jest.mock()`: Mock de módulo completo, reemplaza todo
- `jest.spyOn()`: Monitorea función existente, puede mantener original con mockRestore()

Usa fn() para crear mocks, mock() para reemplazar módulos, spyOn() para monitorear sin romper.
