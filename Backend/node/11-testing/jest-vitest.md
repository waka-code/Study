# Jest y Vitest

## Jest: Test Framework Estándar

### Setup Básico

```bash
npm install --save-dev jest
npx jest --init
```

```json
{
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/__tests__/**/*.test.js"]
  }
}
```

### Ejemplo Básico

```javascript
// sum.js
function sum(a, b) {
  return a + b;
}
module.exports = sum;

// sum.test.js
const sum = require('./sum');

describe('sum', () => {
  it('should add two numbers', () => {
    expect(sum(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(sum(-1, -1)).toBe(-2);
  });
});
```

```bash
npm test
# o
jest
```

## Matchers Comunes

```javascript
describe('Matchers', () => {
  // Igualdad
  expect(value).toBe(5); // Exact match (===)
  expect(value).toEqual({ a: 1 }); // Deep equality

  // Truthy/Falsy
  expect(value).toBeTruthy();
  expect(value).toBeFalsy();
  expect(value).toBeNull();
  expect(value).toBeUndefined();
  expect(value).toBeDefined();

  // Números
  expect(value).toBeGreaterThan(5);
  expect(value).toBeLessThan(10);
  expect(value).toBeCloseTo(3.14, 2); // 2 decimales

  // Strings
  expect(text).toMatch(/hello/);
  expect(text).toContain('hello');

  // Arrays
  expect(array).toContain(3);
  expect(array).toHaveLength(3);

  // Objetos
  expect(obj).toHaveProperty('key');
  expect(obj).toHaveProperty('key', 'value');

  // Excepciones
  expect(() => throwError()).toThrow();
  expect(() => throwError()).toThrow(Error);
  expect(() => throwError()).toThrow('message');
});
```

## Setup y Teardown

```javascript
describe('Database', () => {
  let db;

  beforeAll(async () => {
    // Una vez antes de todos los tests
    db = await initDatabase();
  });

  afterAll(async () => {
    // Una vez después de todos los tests
    await db.close();
  });

  beforeEach(async () => {
    // Antes de cada test
    await db.clear();
  });

  afterEach(async () => {
    // Después de cada test
    // cleanup
  });

  it('should insert user', async () => {
    const user = await db.insert('users', { name: 'John' });
    expect(user.id).toBeDefined();
  });
});
```

## Mocking

### Mock de Funciones

```javascript
const myFunction = jest.fn();
myFunction.mockReturnValue(42);

expect(myFunction()).toBe(42);
expect(myFunction).toHaveBeenCalled();
expect(myFunction).toHaveBeenCalledWith(arg);
expect(myFunction).toHaveBeenCalledTimes(1);
```

### Mock de Módulos

```javascript
// database.js
async function getUser(id) {
  // Acceso real a DB
}
module.exports = { getUser };

// user.test.js
jest.mock('./database');
const { getUser } = require('./database');

describe('User', () => {
  it('should fetch user', async () => {
    getUser.mockResolvedValue({ id: 1, name: 'John' });

    const user = await getUser(1);
    expect(user.name).toBe('John');
  });
});
```

### Mock Parcial

```javascript
jest.mock('./database', () => ({
  __esModule: true,
  getUser: jest.fn(),
  deleteUser: jest.requireActual('./database').deleteUser // Real
}));
```

## Async/Promises

```javascript
describe('Async', () => {
  // Esperar promises
  it('should resolve', async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });

  // Esperar reject
  it('should reject', async () => {
    await expect(fetchData()).rejects.toThrow('Error');
  });

  // Con done callback
  it('should call callback', (done) => {
    fetchData().then((result) => {
      expect(result).toBeDefined();
      done();
    });
  });

  // Mock de promises
  it('should handle promise', async () => {
    const mock = jest.fn();
    mock.mockResolvedValue({ id: 1 });

    const result = await mock();
    expect(result.id).toBe(1);
  });
});
```

## Coverage (Cobertura de Código)

```bash
jest --coverage
```

```json
{
  "collectCoverageFrom": [
    "src/**/*.js",
    "!src/index.js",
    "!src/**/*.test.js"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## Vitest: Alternativa Moderna

Vitest es más rápido y enfocado en Vite:

```bash
npm install --save-dev vitest
```

```javascript
// Sintaxis idéntica a Jest
import { describe, it, expect, beforeAll, mock } from 'vitest';

describe('sum', () => {
  it('should add numbers', () => {
    expect(2 + 3).toBe(5);
  });
});
```

### Ventajas de Vitest

| Aspecto | Jest | Vitest |
|--------|------|--------|
| Velocidad | 🟡 Media | 🟢 Muy rápido |
| Configuración | ⚠️ Compleja | 🟢 Simple |
| Watch mode | 🟡 Lento | 🟢 Instantáneo |
| ESM nativo | ❌ Parcial | ✅ Full |
| Vite integration | ❌ No | ✅ Sí |

## Comparación: Jest vs Vitest

```javascript
// Ambos usan la misma sintaxis

// jest.config.js / vitest.config.js
export default {
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json']
    }
  }
};
```

## Testing de Funciones Asincrónicas

```javascript
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

describe('fetchUser', () => {
  it('should fetch user correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ id: 1, name: 'John' })
    });

    const user = await fetchUser(1);
    expect(user.name).toBe('John');
    expect(global.fetch).toHaveBeenCalledWith('/api/users/1');
  });

  it('should handle errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchUser(1)).rejects.toThrow('Network error');
  });
});
```

## Spy (Monitoreo sin Mock)

```javascript
const obj = {
  method: () => 'original'
};

const spy = jest.spyOn(obj, 'method');
spy.mockReturnValue('mocked');

expect(obj.method()).toBe('mocked');
expect(spy).toHaveBeenCalled();

spy.mockRestore(); // Restaurar original
```

## Testing de Timeouts

```javascript
describe('Timeouts', () => {
  it('should work with timers', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    jest.runAllTimers();
    expect(callback).toHaveBeenCalled();

    jest.useRealTimers();
  });
});
```

## Snapshot Testing

```javascript
describe('Component', () => {
  it('should render correctly', () => {
    const component = render(<MyComponent />);
    expect(component).toMatchSnapshot();
  });
});

// Genera: __snapshots__/test.test.js.snap
// Update snapshots: jest -u
```

## Referencias

- [supertest-api.md](./supertest-api.md)
- [mocks-stubs.md](./mocks-stubs.md)
- [global-error-handling.md](../07-errores-estabilidad/global-error-handling.md)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre jest.fn(), jest.mock(), y jest.spyOn()?**

- `jest.fn()`: Crea función mock desde cero
- `jest.mock()`: Mock completo de módulo
- `jest.spyOn()`: Monitorea función original (puedes restaurar con mockRestore)

Usa jest.fn() para dependencias, jest.mock() para módulos, jest.spyOn() cuando necesites comportamiento original + monitoreo.
