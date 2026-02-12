# APIs resilientes: Retry, Circuit Breaker

## Retry
Reintenta automáticamente una operación fallida (por ejemplo, llamada HTTP) para mejorar la robustez.

**Ejemplo Node.js:**
```js
const axios = require('axios-retry');
axiosRetry(axios, { retries: 3 });
```

## Circuit Breaker
Evita que una aplicación siga intentando operaciones que fallan repetidamente, permitiendo la recuperación.

**Ejemplo Node.js:**
```js
const opossum = require('opossum');
const breaker = new opossum(miFuncion);
breaker.fire();
```
