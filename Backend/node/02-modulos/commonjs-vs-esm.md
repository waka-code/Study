# CommonJS vs ES Modules (ESM)

## Historia

- **CommonJS:** Sistema de módulos original de Node.js (desde 2009)
- **ES Modules:** Estándar de JavaScript (ES6/2015), soportado en Node desde v12+

**Diferencia clave:**
- CommonJS es **específico de Node.js**
- ESM es el **estándar de JavaScript** (funciona en browser y Node)

---

## CommonJS (require/module.exports)

### Sintaxis Básica

```javascript
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// Exportar
module.exports = {
  add,
  subtract
};

// O exportar individual
exports.add = add;
exports.subtract = subtract;
```

```javascript
// app.js
const math = require('./math');

console.log(math.add(2, 3)); // 5
console.log(math.subtract(5, 2)); // 3

// O destructuring
const { add, subtract } = require('./math');
console.log(add(2, 3)); // 5
```

---

### Características de CommonJS

#### 1️⃣ Carga Síncrona

```javascript
const fs = require('fs');
const data = fs.readFileSync('file.txt'); // Bloquea hasta cargar

// El módulo se carga COMPLETAMENTE antes de continuar
```

**Por qué es síncrono:**
- Diseñado para el servidor (acceso rápido a archivos locales)
- No funciona bien en browsers (necesita bundlers como Webpack)

---

#### 2️⃣ Carga Dinámica

```javascript
// ✅ Puedes require() dentro de condiciones
if (process.env.NODE_ENV === 'production') {
  const logger = require('./prod-logger');
} else {
  const logger = require('./dev-logger');
}

// ✅ Puedes require() en runtime
function loadPlugin(name) {
  return require(`./plugins/${name}`);
}
```

---

#### 3️⃣ Exportación por Valor (Copia)

```javascript
// counter.js
let count = 0;

function increment() {
  count++;
}

function getCount() {
  return count;
}

module.exports = { count, increment, getCount };
```

```javascript
// app.js
const counter = require('./counter');

console.log(counter.count); // 0
counter.increment();
console.log(counter.count); // 0 (NO cambió, es copia)
console.log(counter.getCount()); // 1 (función devuelve el valor real)
```

---

#### 4️⃣ Caché de Módulos

```javascript
// logger.js
console.log('Logger loaded');
module.exports = { log: console.log };
```

```javascript
// app.js
const logger1 = require('./logger'); // Imprime: "Logger loaded"
const logger2 = require('./logger'); // NO imprime nada (usa caché)

console.log(logger1 === logger2); // true (mismo objeto)
```

**Para limpiar caché:**
```javascript
delete require.cache[require.resolve('./logger')];
const freshLogger = require('./logger'); // Se recarga
```

---

## ES Modules (import/export)

### Sintaxis Básica

```javascript
// math.js
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

// O export default
export default {
  add,
  subtract
};
```

```javascript
// app.js
import { add, subtract } from './math.js';

console.log(add(2, 3)); // 5

// O import default
import math from './math.js';
console.log(math.add(2, 3)); // 5
```

---

### Características de ES Modules

#### 1️⃣ Carga Asíncrona

```javascript
// Los imports se procesan ANTES de ejecutar el código
import { add } from './math.js'; // Se carga antes de que el código corra

console.log('App started');
```

**Orden de ejecución:**
1. Se resuelven todos los `import`
2. Se ejecuta el código del módulo

---

#### 2️⃣ Importación Estática (por defecto)

```javascript
// ❌ NO puedes hacer esto (sintaxis estática)
if (condition) {
  import { add } from './math.js'; // SyntaxError
}

// ✅ Usa dynamic import para casos dinámicos
if (condition) {
  const { add } = await import('./math.js');
}
```

---

#### 3️⃣ Exportación por Referencia (Live Binding)

```javascript
// counter.js
export let count = 0;

export function increment() {
  count++;
}
```

```javascript
// app.js
import { count, increment } from './counter.js';

console.log(count); // 0
increment();
console.log(count); // 1 (✅ Cambió, es referencia viva)
```

---

#### 4️⃣ Strict Mode por Defecto

```javascript
// ESM siempre está en strict mode
// No necesitas 'use strict';

// ❌ Esto falla en ESM
function test() {
  undeclaredVariable = 5; // ReferenceError
}
```

---

## Comparación Directa

| Característica | CommonJS | ES Modules |
|----------------|----------|------------|
| **Sintaxis** | `require()` / `module.exports` | `import` / `export` |
| **Tipo de carga** | Síncrona | Asíncrona |
| **Importación dinámica** | Nativa | Requiere `import()` |
| **Binding** | Copia (valor) | Referencia viva |
| **Strict mode** | Opcional | Siempre |
| **Extensión archivo** | `.js` | `.mjs` o `.js` con `"type": "module"` |
| **Top-level await** | ❌ No | ✅ Sí |
| **Browser nativo** | ❌ No (necesita bundler) | ✅ Sí |
| **Node.js** | ✅ Siempre | ✅ Desde v12+ |

---

## Cómo Habilitar ESM en Node.js

### Opción 1: Usar extensión `.mjs`

```javascript
// math.mjs
export function add(a, b) {
  return a + b;
}
```

```javascript
// app.mjs
import { add } from './math.mjs';
console.log(add(2, 3));
```

```bash
node app.mjs
```

---

### Opción 2: Usar `"type": "module"` en package.json

```json
{
  "name": "my-app",
  "type": "module"
}
```

Ahora **todos** los `.js` son tratados como ESM:

```javascript
// math.js (se interpreta como ESM)
export function add(a, b) {
  return a + b;
}
```

**Si necesitas CommonJS con `"type": "module"`:**
```javascript
// Renombra a .cjs
// math.cjs
module.exports = {
  add: (a, b) => a + b
};
```

---

## Dynamic Import (importación dinámica)

### En ESM:

```javascript
// ✅ Dynamic import en ESM
async function loadModule() {
  const { add } = await import('./math.js');
  console.log(add(2, 3));
}

loadModule();

// ✅ También funciona con top-level await
const { add } = await import('./math.js');
console.log(add(2, 3));
```

### En CommonJS:

```javascript
// ✅ Dynamic import también funciona en CommonJS
async function loadModule() {
  const { add } = await import('./math.mjs');
  console.log(add(2, 3));
}

loadModule();
```

**Nota:** `import()` siempre retorna una Promise.

---

## Cuándo Usar Cada Uno

### Usa CommonJS si:
- ✅ Trabajas en un proyecto legacy
- ✅ Necesitas carga dinámica frecuente
- ✅ Usas librerías que solo soportan CommonJS
- ✅ No necesitas compatibilidad con browsers

### Usa ES Modules si:
- ✅ Proyecto nuevo
- ✅ Necesitas tree-shaking (eliminar código no usado)
- ✅ Quieres compatibilidad browser/Node
- ✅ Usas top-level await
- ✅ Prefieres el estándar moderno

---

## Pregunta de Entrevista

**P:** ¿Cuál es la diferencia entre estos dos códigos?

```javascript
// CommonJS
let count = 0;
exports.count = count;
exports.increment = () => { count++; };

// app.js
const counter = require('./counter');
counter.increment();
console.log(counter.count); // ¿Qué imprime?
```

```javascript
// ESM
export let count = 0;
export function increment() { count++; }

// app.js
import { count, increment } from './counter.js';
increment();
console.log(count); // ¿Qué imprime?
```

**R:**
- CommonJS imprime `0` (exporta copia del valor)
- ESM imprime `1` (exporta referencia viva)

---

## Referencias

- Siguiente: [resolucion-modulos.md](./resolucion-modulos.md)
- Interoperabilidad: [interoperabilidad.md](./interoperabilidad.md)
- Documentación oficial: https://nodejs.org/api/esm.html
