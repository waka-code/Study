# Interoperabilidad: CommonJS ↔ ES Modules

## El Problema

Node.js soporta **dos sistemas de módulos**:
- CommonJS (legacy, pero muy usado)
- ES Modules (moderno, estándar)

**¿Pueden interoperar?** Sí, pero con limitaciones.

---

## Reglas de Interoperabilidad

### ✅ Puedes:

| Desde | Hacia | Sintaxis |
|-------|-------|----------|
| **CommonJS** | **CommonJS** | `require('./module')` |
| **CommonJS** | **ES Module** | `await import('./module.mjs')` |
| **ES Module** | **ES Module** | `import from './module.js'` |
| **ES Module** | **CommonJS** | `import from './module.cjs'` (con limitaciones) |

### ❌ NO puedes:

- `require()` de un ES Module (síncrono vs asíncrono)

---

## CommonJS → CommonJS

**Sin problemas:**

```javascript
// math.cjs
module.exports = {
  add: (a, b) => a + b
};
```

```javascript
// app.cjs
const math = require('./math.cjs');
console.log(math.add(2, 3)); // 5
```

---

## CommonJS → ES Module

**Usa `import()` dinámico:**

```javascript
// math.mjs
export function add(a, b) {
  return a + b;
}
```

```javascript
// app.cjs (CommonJS)
async function loadMath() {
  const math = await import('./math.mjs');
  console.log(math.add(2, 3)); // 5
}

loadMath();
```

**⚠️ No puedes usar `require()`:**

```javascript
// ❌ Esto NO funciona
const math = require('./math.mjs');
// Error: require() of ES modules is not supported
```

---

## ES Module → ES Module

**Sin problemas:**

```javascript
// math.mjs
export function add(a, b) {
  return a + b;
}
```

```javascript
// app.mjs
import { add } from './math.mjs';
console.log(add(2, 3)); // 5
```

---

## ES Module → CommonJS

**Funciona, pero solo con `export default` style:**

```javascript
// math.cjs (CommonJS)
module.exports = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};
```

```javascript
// app.mjs (ES Module)
import math from './math.cjs';
console.log(math.add(2, 3)); // 5
console.log(math.subtract(5, 2)); // 3
```

**⚠️ Named imports NO funcionan directamente:**

```javascript
// ❌ Esto NO funciona
import { add } from './math.cjs';
// Error: Named export 'add' not found
```

**Workaround:**

```javascript
// ✅ Usa import default + destructuring
import math from './math.cjs';
const { add, subtract } = math;

console.log(add(2, 3)); // 5
```

---

## Importar package.json (truco útil)

### CommonJS:

```javascript
const pkg = require('./package.json');
console.log(pkg.version);
```

### ES Modules:

```javascript
// ✅ Opción 1: Import assertion (Node 16+)
import pkg from './package.json' assert { type: 'json' };
console.log(pkg.version);

// ✅ Opción 2: Dynamic import
const pkg = await import('./package.json', {
  assert: { type: 'json' }
});
console.log(pkg.default.version);

// ✅ Opción 3: Leer con fs
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
console.log(pkg.version);
```

---

## package.json: Soportar Ambos Sistemas

### Opción 1: Dual Package (con "exports")

```json
{
  "name": "my-package",
  "type": "module",
  "exports": {
    ".": {
      "import": "./esm/index.js",
      "require": "./cjs/index.cjs"
    }
  }
}
```

**Estructura de archivos:**

```
my-package/
├── package.json
├── esm/
│   └── index.js (ES Module)
└── cjs/
    └── index.cjs (CommonJS)
```

**Uso:**

```javascript
// ESM
import pkg from 'my-package'; // Carga ./esm/index.js

// CommonJS
const pkg = require('my-package'); // Carga ./cjs/index.cjs
```

---

### Opción 2: Solo ES Modules (forzar a usuarios a usar ESM)

```json
{
  "name": "my-package",
  "type": "module",
  "exports": "./index.js"
}
```

**Consecuencia:**

```javascript
// ❌ No funciona en CommonJS
const pkg = require('my-package');
// Error: require() of ES modules is not supported

// ✅ Funciona con dynamic import
const pkg = await import('my-package');
```

---

### Opción 3: Solo CommonJS (legacy, no recomendado)

```json
{
  "name": "my-package",
  "main": "index.js"
}
```

```javascript
// index.js (CommonJS)
module.exports = { ... };
```

**Consecuencia:**

```javascript
// ✅ Funciona en CommonJS
const pkg = require('my-package');

// ✅ Funciona en ESM (con limitaciones)
import pkg from 'my-package'; // Solo default export
```

---

## __dirname y __filename en ES Modules

En CommonJS:

```javascript
console.log(__dirname);  // /home/user/projects/myapp
console.log(__filename); // /home/user/projects/myapp/index.js
```

En ES Modules:

```javascript
// ❌ No existen __dirname ni __filename
console.log(__dirname); // ReferenceError

// ✅ Usa import.meta.url
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname);  // /home/user/projects/myapp
console.log(__filename); // /home/user/projects/myapp/index.js
```

**Alternativa corta:**

```javascript
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

---

## require() en ES Modules

**❌ No existe `require` en ESM:**

```javascript
// app.mjs
const fs = require('fs'); // ReferenceError: require is not defined
```

**✅ Crear tu propio `require`:**

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const pkg = require('./package.json');
console.log(pkg.version);
```

---

## Detección del Sistema de Módulos

### En runtime:

```javascript
// CommonJS
if (typeof module !== 'undefined' && module.exports) {
  console.log('Running in CommonJS');
}

// ES Modules
if (typeof import.meta !== 'undefined') {
  console.log('Running in ES Module');
}
```

---

## Tree Shaking

**CommonJS:** NO soporta tree shaking

```javascript
// lodash (CommonJS)
const _ = require('lodash');
// Importa TODA la librería (incluso funciones no usadas)
```

**ES Modules:** Soporta tree shaking

```javascript
// lodash-es (ES Module)
import { debounce } from 'lodash-es';
// Solo importa la función 'debounce' (bundler elimina el resto)
```

**Resultado:** ESM produce bundles más pequeños.

---

## Pregunta de Entrevista

**P:** Tengo un paquete que exporta con CommonJS. ¿Cómo lo importo en un proyecto ES Module?

```javascript
// lodash (CommonJS)
module.exports = {
  debounce: function() { ... },
  throttle: function() { ... }
};
```

**R:**

```javascript
// ✅ Opción 1: Default import + destructuring
import lodash from 'lodash';
const { debounce, throttle } = lodash;

// ✅ Opción 2: Usar versión ESM del paquete
import { debounce, throttle } from 'lodash-es';

// ❌ Esto NO funciona
import { debounce } from 'lodash';
// Error: Named export 'debounce' not found
```

---

## Tabla Resumen

| Escenario | Sintaxis | ¿Funciona? |
|-----------|----------|------------|
| CJS → CJS | `require('./file.cjs')` | ✅ Sí |
| CJS → ESM | `await import('./file.mjs')` | ✅ Sí |
| CJS → ESM | `require('./file.mjs')` | ❌ No |
| ESM → ESM | `import from './file.mjs'` | ✅ Sí |
| ESM → CJS | `import from './file.cjs'` | ✅ Sí (solo default) |
| ESM → CJS | `import { named } from './file.cjs'` | ❌ No (necesita default) |

---

## Recomendaciones

### Para nuevos proyectos:
1. ✅ Usa ES Modules (`"type": "module"`)
2. ✅ Usa `.js` para ESM y `.cjs` para excepciones CJS
3. ✅ Siempre incluye extensiones en imports

### Para librerías públicas:
1. ✅ Provee dual package (CJS + ESM)
2. ✅ Usa `"exports"` en package.json
3. ✅ Publica versión `-es` para tree shaking

### Para proyectos legacy:
1. ✅ Mantén CommonJS si funciona
2. ✅ Migra gradualmente a ESM
3. ✅ Usa `import()` dinámico para módulos ESM

---

## Referencias

- Ver también: [commonjs-vs-esm.md](./commonjs-vs-esm.md)
- Documentación oficial: https://nodejs.org/api/esm.html#interoperability-with-commonjs
