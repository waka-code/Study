# Evolución: Callbacks → Promises → Async/Await

La asincronía en Node.js ha evolucionado significativamente. Este documento muestra la progresión histórica y cuándo usar cada patrón.

## Callbacks (Era Legacy)

El patrón original de Node.js. Función que se ejecuta cuando una operación asíncrona completa.

### Callback Pattern

```javascript
const fs = require('fs');

// Node.js callback convention: (err, result)
fs.readFile('/path/to/file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('File content:', data);
});

// Custom async function con callback
function fetchUser(userId, callback) {
  setTimeout(() => {
    if (userId <= 0) {
      callback(new Error('Invalid user ID'));
      return;
    }

    callback(null, { id: userId, name: 'John' });
  }, 1000);
}

// Uso
fetchUser(1, (err, user) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log('User:', user);
});
```

### Callback Hell (Pyramid of Doom)

```javascript
// ❌ Callback Hell - código difícil de mantener
fs.readFile('config.json', 'utf8', (err, config) => {
  if (err) {
    console.error(err);
    return;
  }

  const parsedConfig = JSON.parse(config);

  db.connect(parsedConfig.dbUrl, (err, connection) => {
    if (err) {
      console.error(err);
      return;
    }

    connection.query('SELECT * FROM users', (err, users) => {
      if (err) {
        console.error(err);
        return;
      }

      users.forEach((user) => {
        sendEmail(user.email, (err, result) => {
          if (err) {
            console.error(err);
            return;
          }

          console.log('Email sent to', user.email);
        });
      });
    });
  });
});

// Problemas:
// 1. Difícil de leer (anidación profunda)
// 2. Manejo de errores repetitivo
// 3. Difícil de debuggear
// 4. No se puede usar con async/await
```

### Mitigar Callback Hell

```javascript
// Técnica 1: Named functions
function handleUsers(err, users) {
  if (err) {
    console.error(err);
    return;
  }

  users.forEach(sendEmailToUser);
}

function handleConnection(err, connection) {
  if (err) {
    console.error(err);
    return;
  }

  connection.query('SELECT * FROM users', handleUsers);
}

function handleConfig(err, config) {
  if (err) {
    console.error(err);
    return;
  }

  const parsedConfig = JSON.parse(config);
  db.connect(parsedConfig.dbUrl, handleConnection);
}

fs.readFile('config.json', 'utf8', handleConfig);

// Técnica 2: Early return
function processUser(userId, callback) {
  fetchUser(userId, (err, user) => {
    if (err) return callback(err);

    fetchUserPosts(user.id, (err, posts) => {
      if (err) return callback(err);

      callback(null, { user, posts });
    });
  });
}

// Técnica 3: Modularización
const async = require('async'); // librería helper

async.waterfall([
  (callback) => fs.readFile('config.json', 'utf8', callback),
  (config, callback) => {
    const parsed = JSON.parse(config);
    db.connect(parsed.dbUrl, callback);
  },
  (connection, callback) => {
    connection.query('SELECT * FROM users', callback);
  }
], (err, users) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log('Users:', users);
});
```

## Promises (Era Moderna)

Promises representan el eventual resultado de una operación asíncrona. Introducidas en ES6.

### Promise Basics

```javascript
// Crear Promise
const promise = new Promise((resolve, reject) => {
  // Operación asíncrona
  setTimeout(() => {
    const success = true;

    if (success) {
      resolve('Operation succeeded');
    } else {
      reject(new Error('Operation failed'));
    }
  }, 1000);
});

// Consumir Promise
promise
  .then((result) => {
    console.log('Success:', result);
  })
  .catch((error) => {
    console.error('Error:', error);
  })
  .finally(() => {
    console.log('Cleanup');
  });

// Encadenar Promises
promise
  .then((result) => {
    console.log('Step 1:', result);
    return 'Step 2 data';
  })
  .then((data) => {
    console.log('Step 2:', data);
    return fetchMoreData();
  })
  .then((moreData) => {
    console.log('Step 3:', moreData);
  })
  .catch((error) => {
    // Maneja errores de cualquier paso
    console.error('Error:', error);
  });
```

### Convertir Callbacks a Promises

```javascript
const fs = require('fs');
const { promisify } = require('util');

// Manualmente
function readFilePromise(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// Con promisify (recomendado)
const readFile = promisify(fs.readFile);

// Uso
readFile('file.txt', 'utf8')
  .then((data) => console.log(data))
  .catch((err) => console.error(err));

// Custom async function con Promises
function fetchUser(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userId <= 0) {
        reject(new Error('Invalid user ID'));
        return;
      }

      resolve({ id: userId, name: 'John' });
    }, 1000);
  });
}

// Refactorizar callback hell a Promises
const fs = require('fs').promises;

fs.readFile('config.json', 'utf8')
  .then((config) => JSON.parse(config))
  .then((parsedConfig) => db.connect(parsedConfig.dbUrl))
  .then((connection) => connection.query('SELECT * FROM users'))
  .then((users) => {
    return Promise.all(
      users.map((user) => sendEmail(user.email))
    );
  })
  .then(() => {
    console.log('All emails sent');
  })
  .catch((error) => {
    console.error('Error:', error);
  });
```

### Promise Patterns

```javascript
// Retornar valor inmediato
Promise.resolve(42)
  .then((value) => console.log(value)); // 42

Promise.reject(new Error('Failed'))
  .catch((err) => console.error(err));

// Encadenar con transformación
function processUser(userId) {
  return fetchUser(userId)
    .then((user) => {
      return { ...user, processed: true };
    });
}

// Error propagation
function riskyOperation() {
  return doStep1()
    .then(doStep2)
    .then(doStep3)
    .catch((err) => {
      // Manejar y re-throw
      console.error('Step failed:', err);
      throw err;
    });
}

// Error recovery
function fetchWithRetry(url, retries = 3) {
  return fetch(url).catch((err) => {
    if (retries > 0) {
      console.log(`Retry ${3 - retries + 1}...`);
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  });
}

// Finally para cleanup
function processFile(path) {
  let file;

  return openFile(path)
    .then((f) => {
      file = f;
      return processData(file);
    })
    .finally(() => {
      if (file) {
        file.close();
      }
    });
}
```

## Async/Await (Era Actual)

Syntactic sugar sobre Promises. Hace código asíncrono parecer síncrono.

### Async/Await Basics

```javascript
// Async function siempre retorna Promise
async function fetchUser(userId) {
  // Simular async operation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: userId, name: 'John' });
    }, 1000);
  });
}

// Await pausa ejecución hasta que Promise resuelva
async function getUser() {
  const user = await fetchUser(1);
  console.log('User:', user);
  return user;
}

// Equivalente a:
function getUserPromise() {
  return fetchUser(1).then((user) => {
    console.log('User:', user);
    return user;
  });
}

// Manejo de errores con try/catch
async function getUserSafe() {
  try {
    const user = await fetchUser(1);
    console.log('User:', user);
    return user;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Finally
async function processData() {
  let connection;

  try {
    connection = await db.connect();
    const data = await connection.query('SELECT * FROM users');
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
```

### Refactorizar Callback Hell con Async/Await

```javascript
// ✅ Código limpio y legible
async function processUsers() {
  try {
    // Leer config
    const configData = await fs.readFile('config.json', 'utf8');
    const config = JSON.parse(configData);

    // Conectar a DB
    const connection = await db.connect(config.dbUrl);

    // Query users
    const users = await connection.query('SELECT * FROM users');

    // Enviar emails
    for (const user of users) {
      await sendEmail(user.email);
      console.log('Email sent to', user.email);
    }

    console.log('All emails sent');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Comparación
// Callbacks: 30+ líneas, 5 niveles anidación
// Async/await: 15 líneas, 0 anidación
```

### Async/Await Patterns

```javascript
// Sequential vs Parallel
async function sequential() {
  const user = await fetchUser(1);      // 1s
  const posts = await fetchPosts(1);    // 1s
  const comments = await fetchComments(1); // 1s
  // Total: 3 segundos
  return { user, posts, comments };
}

async function parallel() {
  // Iniciar todas al mismo tiempo
  const [user, posts, comments] = await Promise.all([
    fetchUser(1),      // 1s
    fetchPosts(1),     // 1s
    fetchComments(1)   // 1s
  ]);
  // Total: 1 segundo
  return { user, posts, comments };
}

// Conditional await
async function conditionalFetch(useCache) {
  if (useCache) {
    return cache.get('data');
  }

  const data = await fetchFromAPI();
  await cache.set('data', data);
  return data;
}

// Await en loop
async function processItems(items) {
  // ❌ Sequential (lento)
  for (const item of items) {
    await processItem(item);
  }

  // ✅ Parallel (rápido)
  await Promise.all(
    items.map((item) => processItem(item))
  );

  // ✅ Parallel con límite (mejor)
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(5); // Max 5 concurrent

  await Promise.all(
    items.map((item) => limit(() => processItem(item)))
  );
}

// Early return
async function getUser(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const user = await fetchUser(id);
  cache.set(id, user);
  return user;
}

// Top-level await (ES modules)
// main.mjs
const config = await loadConfig();
const db = await connectDB(config.dbUrl);
export { db };
```

### Common Mistakes

```javascript
// ❌ Error: Olvidar await
async function bad1() {
  const user = fetchUser(1); // user es Promise, no valor!
  console.log(user.name); // undefined
}

// ✅ Correcto
async function good1() {
  const user = await fetchUser(1);
  console.log(user.name);
}

// ❌ Error: Await en función no-async
function bad2() {
  const user = await fetchUser(1); // SyntaxError!
}

// ✅ Correcto
async function good2() {
  const user = await fetchUser(1);
}

// ❌ Error: No manejar errores
async function bad3() {
  const user = await fetchUser(1); // Si falla, error no capturado
  return user;
}

// ✅ Correcto
async function good3() {
  try {
    const user = await fetchUser(1);
    return user;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ❌ Error: Secuencial cuando puede ser paralelo
async function bad4() {
  const user = await fetchUser(1);     // 1s
  const posts = await fetchPosts(1);   // 1s
  // Total: 2s
  return { user, posts };
}

// ✅ Correcto
async function good4() {
  const [user, posts] = await Promise.all([
    fetchUser(1),
    fetchPosts(1)
  ]);
  // Total: 1s
  return { user, posts };
}

// ❌ Error: No retornar Promise
async function bad5() {
  setTimeout(() => {
    return 'done'; // No funciona!
  }, 1000);
}

// ✅ Correcto
async function good5() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('done');
    }, 1000);
  });
}

// ❌ Error: Async sin await
async function bad6() {
  return 42; // No necesita ser async
}

// ✅ Correcto
function good6() {
  return 42;
}

// Async solo necesario si usas await o retornas Promise
async function needsAsync() {
  const result = await someAsyncOperation();
  return result;
}
```

## Mixing Patterns

### Callbacks → Promises

```javascript
const { promisify } = require('util');
const fs = require('fs');

// Método 1: promisify
const readFile = promisify(fs.readFile);

// Método 2: Manual
function readFilePromise(path, encoding) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, encoding, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// Método 3: fs.promises (built-in)
const fsPromises = require('fs').promises;

// Todos retornan Promises
await readFile('file.txt', 'utf8');
await readFilePromise('file.txt', 'utf8');
await fsPromises.readFile('file.txt', 'utf8');
```

### Promises → Callbacks

```javascript
// Wrapper para convertir async function a callback-based
function asyncToCallback(asyncFn, callback) {
  asyncFn()
    .then((result) => callback(null, result))
    .catch((err) => callback(err));
}

// Uso
async function fetchData() {
  return await someAsyncOperation();
}

asyncToCallback(fetchData, (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log('Data:', data);
});
```

### Event Emitters con Async/Await

```javascript
const EventEmitter = require('events');

class AsyncEmitter extends EventEmitter {
  async emitAsync(event, ...args) {
    const listeners = this.listeners(event);

    for (const listener of listeners) {
      await listener(...args);
    }
  }
}

// Uso
const emitter = new AsyncEmitter();

emitter.on('process', async (data) => {
  await processData(data);
  console.log('Processed:', data);
});

await emitter.emitAsync('process', { id: 1 });

// Promisify events
function once(emitter, event) {
  return new Promise((resolve, reject) => {
    emitter.once(event, resolve);
    emitter.once('error', reject);
  });
}

// Uso
const server = http.createServer();
server.listen(3000);
await once(server, 'listening');
console.log('Server started');

// Built-in (Node 11.13+)
const { once } = require('events');
await once(server, 'listening');
```

## Best Practices

```javascript
// 1. Siempre usar async/await para nuevo código
// ✅ Preferir
async function fetchUser(id) {
  const user = await db.users.findById(id);
  return user;
}

// ❌ Evitar (a menos que necesites Promise chain)
function fetchUserPromise(id) {
  return db.users.findById(id)
    .then((user) => user);
}

// 2. Manejar todos los errores
// ✅ Correcto
async function safeOperation() {
  try {
    return await riskyOperation();
  } catch (error) {
    logger.error('Operation failed:', error);
    throw error; // o manejar apropiadamente
  }
}

// 3. Usar Promise.all para paralelo
// ✅ Correcto
const results = await Promise.all([
  operation1(),
  operation2(),
  operation3()
]);

// 4. No mezclar callbacks con async/await
// ❌ Confuso
async function mixed() {
  fs.readFile('file.txt', (err, data) => {
    // Callback hell dentro de async function
    if (err) throw err; // throw aquí no funciona como esperas
  });
}

// ✅ Consistente
async function consistent() {
  const data = await fsPromises.readFile('file.txt');
  return data;
}

// 5. Usar promisify para legacy APIs
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const { stdout } = await exec('ls -la');

// 6. Return await solo cuando sea necesario
// ❌ Innecesario
async function unnecessary() {
  return await fetchData(); // return ya desempaqueta Promise
}

// ✅ Correcto
async function correct() {
  return fetchData();
}

// Excepción: necesario en try/catch
async function needsReturnAwait() {
  try {
    return await fetchData(); // Necesario para capturar error aquí
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

## Pregunta de Entrevista

**P: ¿Cuál es la diferencia entre Promise.all() y ejecutar awaits secuencialmente? ¿Cuándo usarías cada uno?**

**R:**

**Sequential (awaits uno tras otro):**
```javascript
async function sequential() {
  const user = await fetchUser(1);      // Espera 1s
  const posts = await fetchPosts(1);    // Luego espera 1s
  const comments = await fetchComments(1); // Luego espera 1s
  // Total: 3 segundos
  return { user, posts, comments };
}
```
- Operaciones se ejecutan una tras otra
- Tiempo total = suma de todos los tiempos
- Usar cuando operaciones dependen entre sí

**Parallel (Promise.all):**
```javascript
async function parallel() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(1),      // Inicia inmediatamente
    fetchPosts(1),     // Inicia inmediatamente
    fetchComments(1)   // Inicia inmediatamente
  ]);
  // Total: 1 segundo (el más lento)
  return { user, posts, comments };
}
```
- Operaciones se ejecutan simultáneamente
- Tiempo total = la operación más lenta
- Falla si cualquier Promise falla (fail-fast)

**Cuándo usar cada uno:**

**Sequential cuando:**
- La segunda operación necesita resultado de la primera
- Quieres limitar concurrencia (rate limiting)
- Operaciones modifican estado compartido

**Parallel cuando:**
- Operaciones son independientes
- Quieres máxima velocidad
- Todas las operaciones son críticas (si una falla, todas deben fallar)

**Promise.allSettled cuando:**
- Quieres ejecutar todas aunque algunas fallen
- Necesitas saber cuáles fallaron y cuáles no

```javascript
const results = await Promise.allSettled([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3)
]);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`User ${i}: Success`);
  } else {
    console.log(`User ${i}: Failed - ${result.reason}`);
  }
});
```

## Referencias

- [MDN: Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: Async/Await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- Ver: `promise-combinators.md` para Promise.all, race, etc.
- Ver: `error-handling.md` para manejo de errores avanzado
