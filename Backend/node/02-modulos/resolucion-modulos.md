# Resolución de Módulos en Node.js

## ¿Qué es la Resolución de Módulos?

Es el proceso por el cual Node.js encuentra y carga un módulo cuando haces `require()` o `import`.

---

## Tipos de Módulos

### 1️⃣ Módulos Core (Built-in)

Son módulos nativos de Node.js.

```javascript
const fs = require('fs');
const http = require('http');
const path = require('path');
```

**Características:**
- No necesitan instalación
- Tienen prioridad sobre módulos de `node_modules`
- Se resuelven instantáneamente

**Lista de módulos core:**
```
fs, http, https, path, os, crypto, stream, events,
buffer, util, url, querystring, zlib, child_process,
cluster, net, dns, etc.
```

---

### 2️⃣ Módulos Locales (File Modules)

Archivos en tu proyecto.

```javascript
// Con ruta relativa
const utils = require('./utils');
const config = require('../config/database');

// Con ruta absoluta
const logger = require('/home/user/app/logger');
```

**Reglas:**
- Deben empezar con `./`, `../` o `/`
- Node busca en este orden:
  1. Archivo exacto: `./utils.js`
  2. Archivo con extensiones: `./utils.js`, `./utils.json`, `./utils.node`
  3. Carpeta con `index.js`: `./utils/index.js`

---

### 3️⃣ Módulos de node_modules (Third-party)

Librerías instaladas con npm/yarn.

```javascript
const express = require('express');
const lodash = require('lodash');
```

**Cómo los encuentra Node:**

Busca en carpetas `node_modules` subiendo en el árbol:

```
/home/user/projects/myapp/src/controllers/user.js
↓
require('express')
↓
Busca en:
1. /home/user/projects/myapp/src/controllers/node_modules/express
2. /home/user/projects/myapp/src/node_modules/express
3. /home/user/projects/myapp/node_modules/express  ← ENCUENTRA
4. /home/user/projects/node_modules/express
5. /home/user/node_modules/express
6. /home/node_modules/express
7. /node_modules/express
```

---

## Algoritmo de Resolución (CommonJS)

### require('./module')

```
1. ¿Existe ./module.js?
   ✅ Sí → Carga ./module.js
   ❌ No → Continúa

2. ¿Existe ./module.json?
   ✅ Sí → Carga ./module.json (lo parsea como JSON)
   ❌ No → Continúa

3. ¿Existe ./module.node?
   ✅ Sí → Carga ./module.node (binario compilado)
   ❌ No → Continúa

4. ¿Existe ./module/package.json?
   ✅ Sí → Lee "main" field → require('./module/[main]')
   ❌ No → Continúa

5. ¿Existe ./module/index.js?
   ✅ Sí → Carga ./module/index.js
   ❌ No → Error: Cannot find module
```

---

## package.json: El "main" field

Cuando requieres un paquete, Node lee `package.json` para saber qué archivo cargar.

### Ejemplo:

```json
// node_modules/express/package.json
{
  "name": "express",
  "version": "4.18.2",
  "main": "index.js"
}
```

```javascript
const express = require('express');
// Se traduce a: require('express/index.js')
```

---

## ES Modules: "exports" field

Con ESM, se usa el campo `"exports"` en `package.json` (más moderno y flexible).

### Ejemplo simple:

```json
{
  "name": "my-package",
  "exports": "./index.js"
}
```

```javascript
import pkg from 'my-package';
// Carga ./index.js
```

---

### Ejemplo avanzado (conditional exports):

```json
{
  "name": "my-package",
  "exports": {
    ".": {
      "import": "./esm/index.js",
      "require": "./cjs/index.js"
    },
    "./utils": {
      "import": "./esm/utils.js",
      "require": "./cjs/utils.js"
    }
  }
}
```

```javascript
// ESM
import pkg from 'my-package'; // Carga ./esm/index.js
import { helper } from 'my-package/utils'; // Carga ./esm/utils.js

// CommonJS
const pkg = require('my-package'); // Carga ./cjs/index.js
const { helper } = require('my-package/utils'); // Carga ./cjs/utils.js
```

---

## Extensiones de Archivo

### CommonJS:

```javascript
// Estas 3 líneas son equivalentes
const utils = require('./utils.js');
const utils = require('./utils');
const utils = require('./utils.cjs'); // Si "type": "module" en package.json
```

### ES Modules:

```javascript
// ⚠️ DEBES incluir la extensión
import { add } from './math.js'; // ✅ Correcto
import { add } from './math';    // ❌ Error
```

**Excepción:** Bundlers como Webpack permiten omitir extensiones.

---

## Resolución de Carpetas

### Carpeta sin package.json:

```
/utils
├── index.js
└── helper.js
```

```javascript
const utils = require('./utils');
// Carga ./utils/index.js
```

---

### Carpeta con package.json:

```
/database
├── package.json
├── index.js
└── connection.js
```

```json
// database/package.json
{
  "main": "connection.js"
}
```

```javascript
const db = require('./database');
// Carga ./database/connection.js (según "main")
```

---

## require.resolve()

Útil para encontrar la ruta real de un módulo sin cargarlo.

```javascript
const path = require.resolve('express');
console.log(path);
// /home/user/projects/myapp/node_modules/express/index.js

const localPath = require.resolve('./utils');
console.log(localPath);
// /home/user/projects/myapp/utils.js
```

**Uso real:**
```javascript
// Limpiar caché de un módulo
delete require.cache[require.resolve('./config')];
```

---

## NODE_PATH (legacy, no recomendado)

Permite agregar rutas custom para resolución de módulos.

```bash
export NODE_PATH=/home/user/my-modules
node app.js
```

```javascript
// Ahora puede hacer require() de módulos en /home/user/my-modules
const custom = require('custom-module');
```

**⚠️ NO recomendado:** Usa `package.json` `"exports"` en su lugar.

---

## Symlinks y npm link

### npm link (desarrollo local):

```bash
# En el paquete que desarrollas
cd my-package
npm link

# En el proyecto que lo usa
cd my-app
npm link my-package
```

**Cómo funciona:**
- Crea un symlink en `node_modules/my-package` → `../my-package`
- Los cambios en `my-package` se reflejan inmediatamente en `my-app`

---

## Caché de Módulos

Node.js cachea módulos en `require.cache`.

```javascript
console.log(require.cache);
// {
//   '/home/user/app/utils.js': Module { ... },
//   '/home/user/app/node_modules/express/index.js': Module { ... },
//   ...
// }
```

### Invalidar caché:

```javascript
delete require.cache[require.resolve('./config')];
const freshConfig = require('./config'); // Se recarga
```

---

## Pregunta de Entrevista

**P:** ¿En qué orden Node.js busca módulos cuando haces `require('lodash')`?

**R:**

1. ¿Es un módulo core? (`fs`, `http`, etc.) → No
2. ¿Empieza con `./`, `../` o `/`? → No
3. Busca en `node_modules`:
   - `./node_modules/lodash`
   - `../node_modules/lodash`
   - `../../node_modules/lodash`
   - ... hasta llegar a `/node_modules/lodash`
4. Si encuentra `lodash/package.json`, lee el campo `"main"`
5. Si no, busca `lodash/index.js`
6. Si no encuentra nada → `Error: Cannot find module 'lodash'`

---

## Diferencias: CommonJS vs ESM

| Resolución | CommonJS | ES Modules |
|------------|----------|------------|
| **Extensiones opcionales** | ✅ `require('./math')` | ❌ `import from './math.js'` |
| **Carpetas (index.js)** | ✅ Soportado | ✅ Soportado |
| **package.json "main"** | ✅ `"main"` | ✅ `"exports"` (preferido) |
| **Symlinks** | ✅ Soportado | ✅ Soportado |
| **Caché** | ✅ `require.cache` | ✅ (interno, no accesible) |

---

## Referencias

- Ver también: [commonjs-vs-esm.md](./commonjs-vs-esm.md)
- Interoperabilidad: [interoperabilidad.md](./interoperabilidad.md)
- Documentación oficial: https://nodejs.org/api/modules.html
