# Manejo de Errores en Código Asíncrono

El manejo de errores en código asíncrono requiere técnicas específicas diferentes al código síncrono.

## Errores en Callbacks

```javascript
// Convention: primer parámetro es error
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) {
    // Manejar error
    console.error('Error reading file:', err);
    return; // IMPORTANTE: return temprano
  }

  // Procesar data solo si no hay error
  console.log(data);
});

// ❌ Error común: no verificar err
fs.readFile('file.txt', 'utf8', (err, data) => {
  console.log(data); // Podría ser undefined!
});

// ❌ Error común: no hacer return después de manejar error
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    // Sin return, ejecuta código siguiente!
  }

  console.log(data); // Se ejecuta incluso si hay error
});

// ✅ Patrón correcto
function readFileCallback(path, callback) {
  fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }

    // Procesar data
    try {
      const parsed = JSON.parse(data);
      callback(null, parsed);
    } catch (parseError) {
      callback(parseError);
    }
  });
}
```

### Propagación de Errores en Callbacks

```javascript
function step1(callback) {
  fs.readFile('file1.txt', 'utf8', callback);
}

function step2(data, callback) {
  fs.readFile('file2.txt', 'utf8', (err, data2) => {
    if (err) return callback(err);

    callback(null, data + data2);
  });
}

function processFiles(callback) {
  step1((err, data1) => {
    if (err) return callback(err);

    step2(data1, (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    });
  });
}

// Uso
processFiles((err, result) => {
  if (err) {
    console.error('Process failed:', err);
    return;
  }

  console.log('Success:', result);
});
```

## Errores en Promises

```javascript
// Promise puede estar en 3 estados:
// - pending: inicial
// - fulfilled: resolve() llamado
// - rejected: reject() llamado

// Crear Promise con error
const promise = new Promise((resolve, reject) => {
  const success = false;

  if (success) {
    resolve('Success');
  } else {
    reject(new Error('Failed'));
  }
});

// Manejar con .catch()
promise
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.error('Error:', error);
  });

// Chain de Promises con error handling
fetchUser(1)
  .then((user) => fetchPosts(user.id))
  .then((posts) => fetchComments(posts[0].id))
  .then((comments) => {
    console.log('Comments:', comments);
  })
  .catch((error) => {
    // Captura errores de cualquier paso
    console.error('Pipeline failed:', error);
  });

// Error en then() se propaga automáticamente
Promise.resolve(42)
  .then((value) => {
    throw new Error('Oops'); // Se convierte en rejected Promise
  })
  .then((value) => {
    // Este then NO se ejecuta
    console.log('Never runs');
  })
  .catch((error) => {
    console.error('Caught:', error); // 'Caught: Error: Oops'
  });
```

### Recuperación de Errores en Promises

```javascript
// .catch() puede recuperar errores
fetchUser(1)
  .catch((error) => {
    console.warn('Using default user due to error:', error);
    return { id: 0, name: 'Guest' }; // Valor por defecto
  })
  .then((user) => {
    // Recibe user real o default
    console.log('User:', user);
  });

// Re-throw para propagar error
fetchData()
  .catch((error) => {
    console.error('Fetch failed:', error);
    // Log y re-throw
    throw error;
  })
  .then((data) => {
    // NO se ejecuta si error re-thrown
  })
  .catch((error) => {
    // Se ejecuta si re-throw
    console.error('Final handler:', error);
  });

// Retry pattern
function fetchWithRetry(url, retries = 3) {
  return fetch(url).catch((error) => {
    if (retries === 0) {
      throw error; // Ya no más retries
    }

    console.log(`Retrying... (${retries} left)`);
    return fetchWithRetry(url, retries - 1);
  });
}

// Fallback cascade
function fetchUserWithFallback(id) {
  return fetchFromCache(id)
    .catch(() => fetchFromDatabase(id))
    .catch(() => fetchFromAPI(id))
    .catch(() => {
      // Último recurso
      return { id, name: 'Unknown' };
    });
}
```

### Promise.finally()

```javascript
// finally() se ejecuta siempre, con éxito o error
let isLoading = true;

fetchData()
  .then((data) => {
    console.log('Data:', data);
  })
  .catch((error) => {
    console.error('Error:', error);
  })
  .finally(() => {
    // Siempre se ejecuta
    isLoading = false;
    console.log('Loading finished');
  });

// Útil para cleanup
function processFile(path) {
  let fileHandle;

  return openFile(path)
    .then((handle) => {
      fileHandle = handle;
      return processData(handle);
    })
    .finally(() => {
      // Cleanup siempre se ejecuta
      if (fileHandle) {
        return fileHandle.close();
      }
    });
}
```

## Errores en Async/Await

```javascript
// try/catch para manejar errores
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error; // Re-throw si quieres propagar
  }
}

// finally con async/await
async function processWithCleanup() {
  let resource;

  try {
    resource = await acquireResource();
    const result = await processResource(resource);
    return result;
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  } finally {
    // Cleanup siempre se ejecuta
    if (resource) {
      await resource.close();
    }
  }
}

// ❌ Error común: olvidar try/catch
async function dangerous() {
  const data = await fetchData(); // Si falla, error no capturado!
  return data;
}

// Llamar dangerous() sin await no muestra el error
dangerous(); // Unhandled Promise rejection!

// ✅ Opciones correctas:
// 1. try/catch interno
async function safe1() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// 2. try/catch en el caller
async function caller() {
  try {
    const data = await dangerous();
  } catch (error) {
    console.error('Error:', error);
  }
}

// 3. .catch() en la Promise retornada
dangerous().catch((error) => {
  console.error('Error:', error);
});
```

### Error Wrapping

```javascript
// Crear tipos de error custom
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class DatabaseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

// Usar errores específicos
async function createUser(data) {
  // Validación
  if (!data.email) {
    throw new ValidationError('Email is required', 'email');
  }

  try {
    // Intentar guardar en DB
    const user = await db.users.insert(data);
    return user;
  } catch (error) {
    // Convertir error de DB a nuestro formato
    throw new DatabaseError(
      'Failed to create user',
      error.code
    );
  }
}

// Manejar errores por tipo
async function handleUser() {
  try {
    const user = await createUser({ name: 'John' });
    console.log('User created:', user);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`Validation failed on ${error.field}: ${error.message}`);
    } else if (error instanceof DatabaseError) {
      console.error(`Database error (${error.code}): ${error.message}`);
    } else {
      console.error('Unknown error:', error);
    }
  }
}
```

### Error Boundaries Pattern

```javascript
// Higher-order function para error handling
function asyncErrorHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${fn.name}:`, error);
      throw error;
    }
  };
}

// Uso
const safeProcessUser = asyncErrorHandler(async (userId) => {
  const user = await fetchUser(userId);
  const posts = await fetchPosts(user.id);
  return { user, posts };
});

// Express error handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Uso en Express routes
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
  // Errores automáticamente pasan a error middleware
}));
```

## Parallel Error Handling

### Promise.all()

```javascript
// Promise.all falla si CUALQUIER Promise falla
async function fetchAllUsers() {
  try {
    const users = await Promise.all([
      fetchUser(1),
      fetchUser(2),
      fetchUser(3) // Si este falla, Promise.all falla
    ]);

    return users;
  } catch (error) {
    // No sabemos cuál falló
    console.error('One or more fetches failed:', error);
    throw error;
  }
}
```

### Promise.allSettled()

```javascript
// allSettled espera TODAS las Promises, exitosas o fallidas
async function fetchUsersSettled() {
  const results = await Promise.allSettled([
    fetchUser(1),
    fetchUser(2),
    fetchUser(3)
  ]);

  // Separar éxitos y fallos
  const successes = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const failures = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason);

  console.log('Successful:', successes.length);
  console.log('Failed:', failures.length);

  if (failures.length > 0) {
    console.error('Failures:', failures);
  }

  return successes;
}

// Pattern: Procesar lo que se pueda
async function processUsersPartial(userIds) {
  const results = await Promise.allSettled(
    userIds.map((id) => processUser(id))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`User ${userIds[index]}: Success`);
    } else {
      console.error(`User ${userIds[index]}: Failed - ${result.reason}`);
    }
  });

  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
}
```

### Promise.any()

```javascript
// any() resuelve con la PRIMERA Promise exitosa
async function fetchFromMirrors() {
  try {
    // Intentar múltiples mirrors, usar el primero que responda
    const data = await Promise.any([
      fetch('https://mirror1.com/data'),
      fetch('https://mirror2.com/data'),
      fetch('https://mirror3.com/data')
    ]);

    return data;
  } catch (error) {
    // AggregateError: TODAS fallaron
    console.error('All mirrors failed');
    console.error(error.errors); // Array de todos los errores
    throw error;
  }
}
```

## Global Error Handlers

```javascript
// Uncaught exceptions (síncrono)
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);

  // Log a external service
  logger.fatal('Uncaught exception', { error });

  // Graceful shutdown
  process.exit(1);
});

// Unhandled Promise rejections (asíncrono)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);

  // Log a external service
  logger.error('Unhandled rejection', { reason });

  // Opcionalmente exit
  process.exit(1);
});

// Warning events
process.on('warning', (warning) => {
  console.warn('Warning:', warning.name);
  console.warn(warning.message);
  console.warn(warning.stack);
});

// ⚠️ IMPORTANTE: Estos son last resort
// El código debe manejar errores apropiadamente
// No confiar en estos handlers para lógica de negocio
```

## Best Practices

```javascript
// 1. Siempre manejar errores en async functions
// ✅ Correcto
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    logger.error('Fetch failed:', error);
    throw new Error('Failed to fetch data');
  }
}

// 2. Ser específico con tipos de error
// ✅ Correcto
class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

async function getUser(id) {
  const user = await db.users.findById(id);

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

// 3. No silenciar errores
// ❌ Malo
try {
  await riskyOperation();
} catch (error) {
  // Silencioso - error desaparece!
}

// ✅ Correcto
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  // Decidir: re-throw, return default, o manejar
}

// 4. Cleanup en finally
// ✅ Correcto
async function processFile(path) {
  const file = await fs.open(path);

  try {
    const data = await file.read();
    return processData(data);
  } finally {
    await file.close(); // Siempre se ejecuta
  }
}

// 5. Evitar try/catch anidado
// ❌ Difícil de leer
async function nested() {
  try {
    const user = await fetchUser();

    try {
      const posts = await fetchPosts(user.id);

      try {
        return await processPosts(posts);
      } catch (error) {
        console.error('Process failed');
      }
    } catch (error) {
      console.error('Fetch posts failed');
    }
  } catch (error) {
    console.error('Fetch user failed');
  }
}

// ✅ Mejor: Funciones separadas
async function fetchUserWithPosts(userId) {
  try {
    const user = await fetchUser(userId);
    const posts = await fetchPosts(user.id);
    return { user, posts };
  } catch (error) {
    logger.error('Failed to fetch user data:', error);
    throw error;
  }
}

async function processUserPosts(userId) {
  try {
    const data = await fetchUserWithPosts(userId);
    return await processPosts(data.posts);
  } catch (error) {
    logger.error('Failed to process posts:', error);
    throw error;
  }
}

// 6. Contexto en errores
// ✅ Correcto
async function updateUser(userId, updates) {
  try {
    return await db.users.update(userId, updates);
  } catch (error) {
    // Agregar contexto
    throw new Error(
      `Failed to update user ${userId}: ${error.message}`
    );
  }
}
```

## Error Recovery Strategies

```javascript
// 1. Retry con Exponential Backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Retry ${i + 1} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Uso
const data = await retryWithBackoff(() => fetchData());

// 2. Circuit Breaker
class CircuitBreaker {
  constructor(fn, threshold = 5, timeout = 60000) {
    this.fn = fn;
    this.threshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }

      this.state = 'HALF_OPEN';
    }

    try {
      const result = await this.fn(...args);

      // Success: reset
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
      }

      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;

      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
        console.log('Circuit breaker opened');
      }

      throw error;
    }
  }
}

// Uso
const breaker = new CircuitBreaker(fetchData, 3, 30000);

try {
  const data = await breaker.execute();
} catch (error) {
  console.error('Circuit breaker prevented call or call failed');
}

// 3. Fallback Values
async function fetchWithFallback(url, fallback) {
  try {
    return await fetch(url);
  } catch (error) {
    console.warn('Using fallback due to error:', error);
    return fallback;
  }
}

// 4. Timeout
async function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });

  return Promise.race([promise, timeout]);
}

// Uso
try {
  const data = await withTimeout(fetchData(), 5000);
} catch (error) {
  if (error.message === 'Timeout') {
    console.error('Operation timed out');
  }
}
```

## Pregunta de Entrevista

**P: ¿Qué sucede si lanzas un error dentro de un setTimeout o setInterval? ¿Cómo lo manejarías?**

**R:**

```javascript
// ❌ try/catch NO funciona con setTimeout
try {
  setTimeout(() => {
    throw new Error('Oops'); // Uncaught error!
  }, 1000);
} catch (error) {
  // NUNCA se ejecuta
  console.error('Never caught');
}
```

**Por qué no funciona:**
- `setTimeout` ejecuta callback DESPUÉS de que try/catch termina
- El callback se ejecuta en diferente stack trace
- Error ocurre fuera del contexto del try/catch

**Soluciones:**

**1. try/catch dentro del callback:**
```javascript
setTimeout(() => {
  try {
    throw new Error('Oops');
  } catch (error) {
    console.error('Caught:', error);
  }
}, 1000);
```

**2. Usar Promises:**
```javascript
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function example() {
  try {
    await delay(1000);
    throw new Error('Oops');
  } catch (error) {
    console.error('Caught:', error);
  }
}
```

**3. Process-level handler (último recurso):**
```javascript
process.on('uncaughtException', (error) => {
  console.error('Uncaught:', error);
  process.exit(1);
});

setTimeout(() => {
  throw new Error('Oops'); // Capturado por handler global
}, 1000);
```

**Best Practice:**
```javascript
// ✅ Siempre manejar errores dentro del callback async
async function scheduleTask() {
  setTimeout(async () => {
    try {
      await performTask();
    } catch (error) {
      logger.error('Task failed:', error);
      // Handle error apropiadamente
    }
  }, 1000);
}
```

## Referencias

- Ver: `callbacks-promises-async.md` para fundamentos de asincronía
- Ver: `07-errores-estabilidad/global-error-handling.md` para error handling a nivel aplicación
