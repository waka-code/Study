# Promise Combinators

Promise combinators son métodos estáticos que permiten trabajar con múltiples Promises simultáneamente.

## Promise.all()

Espera a que TODAS las Promises se resuelvan. Falla si cualquiera falla (fail-fast).

```javascript
// Básico
const promises = [
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3)
];

const results = await Promise.all(promises);
console.log(results); // [1, 2, 3]

// Con async functions
const [user, posts, comments] = await Promise.all([
  fetchUser(1),
  fetchPosts(1),
  fetchComments(1)
]);

// Falla si una falla
try {
  await Promise.all([
    Promise.resolve(1),
    Promise.reject(new Error('Failed')),
    Promise.resolve(3)
  ]);
} catch (error) {
  console.error(error); // Error: Failed
  // No obtenemos resultado de las otras Promises
}

// Casos de uso típicos
async function loadDashboard() {
  const [user, stats, notifications, activity] = await Promise.all([
    fetchUser(),
    fetchStats(),
    fetchNotifications(),
    fetchRecentActivity()
  ]);

  return { user, stats, notifications, activity };
}

// Map con Promise.all
async function fetchMultipleUsers(userIds) {
  return await Promise.all(
    userIds.map((id) => fetchUser(id))
  );
}

const users = await fetchMultipleUsers([1, 2, 3, 4, 5]);
```

### Performance con Promise.all

```javascript
// ❌ Sequential (lento)
async function sequentialFetch() {
  const user = await fetchUser(1);      // 1 segundo
  const posts = await fetchPosts(1);    // 1 segundo
  const comments = await fetchComments(1); // 1 segundo
  // Total: 3 segundos
  return { user, posts, comments };
}

// ✅ Parallel con Promise.all (rápido)
async function parallelFetch() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(1),      // 1 segundo
    fetchPosts(1),     // 1 segundo
    fetchComments(1)   // 1 segundo
  ]);
  // Total: 1 segundo (tiempo del más lento)
  return { user, posts, comments };
}

// Benchmark
console.time('Sequential');
await sequentialFetch();
console.timeEnd('Sequential'); // ~3000ms

console.time('Parallel');
await parallelFetch();
console.timeEnd('Parallel'); // ~1000ms
```

## Promise.allSettled()

Espera a que TODAS las Promises se completen (fulfilled o rejected). Nunca falla.

```javascript
const results = await Promise.allSettled([
  Promise.resolve(1),
  Promise.reject(new Error('Failed')),
  Promise.resolve(3)
]);

console.log(results);
/*
[
  { status: 'fulfilled', value: 1 },
  { status: 'rejected', reason: Error: Failed },
  { status: 'fulfilled', value: 3 }
]
*/

// Procesar resultados
results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Promise ${index}: Success - ${result.value}`);
  } else {
    console.error(`Promise ${index}: Failed - ${result.reason}`);
  }
});

// Separar éxitos y fallos
const successes = results
  .filter((r) => r.status === 'fulfilled')
  .map((r) => r.value);

const failures = results
  .filter((r) => r.status === 'rejected')
  .map((r) => r.reason);

console.log('Successful:', successes); // [1, 3]
console.log('Failed:', failures); // [Error: Failed]
```

### Casos de Uso de allSettled

```javascript
// 1. Intentar múltiples operaciones, continuar con las que funcionen
async function sendNotifications(users) {
  const results = await Promise.allSettled(
    users.map((user) => sendEmail(user.email))
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`Sent: ${sent}, Failed: ${failed}`);

  return {
    successful: sent,
    failed: failed,
    errors: results
      .filter((r) => r.status === 'rejected')
      .map((r) => r.reason)
  };
}

// 2. Validaciones paralelas
async function validateUser(userData) {
  const validations = await Promise.allSettled([
    validateEmail(userData.email),
    validatePassword(userData.password),
    validateUsername(userData.username),
    checkEmailAvailability(userData.email)
  ]);

  const errors = validations
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason.message);

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

// 3. Fetch de múltiples APIs, usar las que respondan
async function aggregateData() {
  const results = await Promise.allSettled([
    fetch('https://api1.com/data'),
    fetch('https://api2.com/data'),
    fetch('https://api3.com/data')
  ]);

  const successfulResponses = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (successfulResponses.length === 0) {
    throw new Error('All APIs failed');
  }

  return successfulResponses;
}

// 4. Cleanup múltiples recursos
async function cleanup(resources) {
  const results = await Promise.allSettled(
    resources.map((resource) => resource.close())
  );

  const failedCleanups = results.filter((r) => r.status === 'rejected');

  if (failedCleanups.length > 0) {
    console.warn('Some resources failed to cleanup:', failedCleanups);
  }
}
```

## Promise.race()

Resuelve/rechaza con la PRIMERA Promise que se complete (sea éxito o fallo).

```javascript
const result = await Promise.race([
  new Promise((resolve) => setTimeout(() => resolve('First'), 1000)),
  new Promise((resolve) => setTimeout(() => resolve('Second'), 2000)),
  new Promise((resolve) => setTimeout(() => resolve('Third'), 3000))
]);

console.log(result); // 'First' (después de 1 segundo)

// Si la primera falla, race falla
try {
  await Promise.race([
    Promise.reject(new Error('Failed')),
    new Promise((resolve) => setTimeout(() => resolve('Success'), 1000))
  ]);
} catch (error) {
  console.error(error); // Error: Failed (inmediato)
}
```

### Casos de Uso de race

```javascript
// 1. Timeout para operaciones
async function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });

  return Promise.race([promise, timeout]);
}

// Uso
try {
  const data = await withTimeout(fetchData(), 5000);
  console.log('Data:', data);
} catch (error) {
  if (error.message === 'Timeout') {
    console.error('Operation timed out after 5s');
  }
}

// 2. Fetch del servidor más rápido
async function fetchFastest() {
  return Promise.race([
    fetch('https://server1.com/api/data'),
    fetch('https://server2.com/api/data'),
    fetch('https://server3.com/api/data')
  ]);
}

// 3. Cancelación con AbortController
async function fetchWithAbort(url, signal) {
  const abortPromise = new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      reject(new Error('Aborted'));
    });
  });

  return Promise.race([
    fetch(url, { signal }),
    abortPromise
  ]);
}

const controller = new AbortController();

setTimeout(() => controller.abort(), 3000);

try {
  const data = await fetchWithAbort('https://api.com/data', controller.signal);
} catch (error) {
  console.error('Fetch aborted or failed:', error);
}

// 4. Cache vs Network race
async function staleWhileRevalidate(url) {
  const cached = await cache.get(url);

  if (cached) {
    // Retornar cache inmediatamente
    // Actualizar en background
    fetch(url).then((fresh) => cache.set(url, fresh));
    return cached;
  }

  // No hay cache, esperar network
  const fresh = await fetch(url);
  await cache.set(url, fresh);
  return fresh;
}

// O race entre cache y network
async function raceCache(url) {
  return Promise.race([
    cache.get(url),
    fetch(url).then((data) => {
      cache.set(url, data);
      return data;
    })
  ]);
}
```

## Promise.any()

Resuelve con la PRIMERA Promise exitosa. Falla solo si TODAS fallan.

```javascript
const result = await Promise.any([
  Promise.reject(new Error('Failed 1')),
  Promise.resolve('Success'),
  Promise.reject(new Error('Failed 2'))
]);

console.log(result); // 'Success'

// Falla solo si todas fallan
try {
  await Promise.any([
    Promise.reject(new Error('Failed 1')),
    Promise.reject(new Error('Failed 2')),
    Promise.reject(new Error('Failed 3'))
  ]);
} catch (error) {
  console.log(error.name); // 'AggregateError'
  console.log(error.errors); // [Error: Failed 1, Error: Failed 2, Error: Failed 3]
}
```

### Casos de Uso de any

```javascript
// 1. Fetch de múltiples mirrors
async function fetchFromMirrors(endpoint) {
  const mirrors = [
    'https://mirror1.com',
    'https://mirror2.com',
    'https://mirror3.com'
  ];

  try {
    return await Promise.any(
      mirrors.map((mirror) => fetch(`${mirror}${endpoint}`))
    );
  } catch (error) {
    console.error('All mirrors failed');
    throw new Error('Service unavailable');
  }
}

// 2. Redundant APIs (cualquier respuesta válida sirve)
async function getExchangeRate(from, to) {
  try {
    return await Promise.any([
      fetchFromAPI1(from, to),
      fetchFromAPI2(from, to),
      fetchFromAPI3(from, to)
    ]);
  } catch (error) {
    throw new Error('All exchange rate APIs failed');
  }
}

// 3. Database replicas
async function queryAnyReplica(query) {
  const replicas = [db.primary, db.replica1, db.replica2];

  try {
    return await Promise.any(
      replicas.map((replica) => replica.query(query))
    );
  } catch (error) {
    throw new Error('All database replicas failed');
  }
}

// 4. Auth providers fallback
async function authenticateAny(credentials) {
  try {
    return await Promise.any([
      authProvider1.verify(credentials),
      authProvider2.verify(credentials),
      authProvider3.verify(credentials)
    ]);
  } catch (error) {
    throw new Error('Authentication failed on all providers');
  }
}
```

## Comparación de Combinators

```javascript
const promises = [
  Promise.resolve(1),
  Promise.reject(new Error('Error')),
  Promise.resolve(3)
];

// Promise.all() - Falla si una falla
try {
  await Promise.all(promises);
} catch (error) {
  console.log('all failed'); // ✓ Se ejecuta
}

// Promise.allSettled() - Nunca falla
const settled = await Promise.allSettled(promises);
console.log(settled.length); // 3
// [{status: 'fulfilled', value: 1},
//  {status: 'rejected', reason: Error},
//  {status: 'fulfilled', value: 3}]

// Promise.race() - Primera en completar (éxito o fallo)
try {
  await Promise.race([
    new Promise((_, reject) => setTimeout(() => reject('Fast fail'), 100)),
    new Promise((resolve) => setTimeout(() => resolve('Slow success'), 1000))
  ]);
} catch (error) {
  console.log('race failed'); // ✓ Se ejecuta (la primera falló)
}

// Promise.any() - Primera exitosa
const any = await Promise.any([
  Promise.reject('Fail 1'),
  Promise.resolve('Success'),
  Promise.reject('Fail 2')
]);
console.log(any); // 'Success'
```

## Patrones Avanzados

### Batching con límite de concurrencia

```javascript
async function batchProcess(items, batchSize) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item) => processItem(item))
    );
    results.push(...batchResults);
  }

  return results;
}

// Procesar 100 items en batches de 10
const results = await batchProcess(items, 10);

// Con librería p-limit
const pLimit = require('p-limit');
const limit = pLimit(5); // Max 5 concurrent

const results = await Promise.all(
  items.map((item) => limit(() => processItem(item)))
);
```

### Retry con exponential backoff

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

const data = await retryWithBackoff(() => fetchData());
```

### Race con todas las Promises

```javascript
// race pero obtener todas las respuestas
async function raceAll(promises) {
  const results = [];
  const errors = [];

  await new Promise((resolve) => {
    promises.forEach((promise, index) => {
      promise
        .then((value) => {
          results.push({ index, value });
        })
        .catch((error) => {
          errors.push({ index, error });
        })
        .finally(() => {
          if (results.length + errors.length === promises.length) {
            resolve();
          }
        });
    });
  });

  return { results, errors };
}
```

### Promise pool

```javascript
class PromisePool {
  constructor(concurrency = 5) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(fn) {
    while (this.running >= this.concurrency) {
      await new Promise((resolve) => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;

      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }

  async all(fns) {
    return Promise.all(fns.map((fn) => this.add(fn)));
  }
}

// Uso
const pool = new PromisePool(3); // Max 3 concurrent

await pool.all([
  () => processItem(1),
  () => processItem(2),
  () => processItem(3),
  () => processItem(4),
  () => processItem(5)
]);
```

## Pregunta de Entrevista

**P: ¿Cuál es la diferencia entre Promise.all() y Promise.allSettled()? ¿Cuándo usarías cada uno?**

**R:**

**Promise.all():**
- Espera todas las Promises
- Resuelve solo si TODAS son exitosas
- Falla inmediatamente (fail-fast) si UNA falla
- Retorna array de valores
- No obtienes resultados si falla

```javascript
// Falla inmediatamente
await Promise.all([
  Promise.resolve(1),
  Promise.reject('Error'), // Falla aquí
  Promise.resolve(3)       // No se espera
]);
// Throw: 'Error'
// No obtenemos [1, 3]
```

**Promise.allSettled():**
- Espera todas las Promises
- Nunca falla (siempre resuelve)
- Retorna array de objetos con status y value/reason
- Obtienes todos los resultados (éxitos y fallos)

```javascript
const results = await Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('Error'),
  Promise.resolve(3)
]);

// [
//   {status: 'fulfilled', value: 1},
//   {status: 'rejected', reason: 'Error'},
//   {status: 'fulfilled', value: 3}
// ]
```

**Cuándo usar Promise.all():**
- Todas las operaciones son críticas
- Si una falla, todo debe fallar
- Necesitas simplemente los valores
- Performance: fail-fast si algo falla rápido

```javascript
// Cargar página: todas son necesarias
const [user, config, permissions] = await Promise.all([
  fetchUser(),
  fetchConfig(),
  fetchPermissions()
]);
// Si falta cualquiera, no se puede mostrar la página
```

**Cuándo usar Promise.allSettled():**
- Quieres intentar todas las operaciones
- Los fallos de algunas no afectan las demás
- Necesitas reporte de qué falló y qué no
- Procesamiento independiente

```javascript
// Enviar notificaciones: continuar aunque algunas fallen
const results = await Promise.allSettled(
  users.map(user => sendEmail(user.email))
);

const successful = results.filter(r => r.status === 'fulfilled').length;
console.log(`Sent ${successful}/${users.length} emails`);
```

**Resumen:**
- `all()`: "Todo o nada" (transaccional)
- `allSettled()`: "Mejor esfuerzo" (resiliente)

## Referencias

- [MDN: Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- [MDN: Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- Ver: `callbacks-promises-async.md` para fundamentos
- Ver: `error-handling.md` para manejo de errores
