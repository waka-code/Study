# File System (fs)

El módulo `fs` permite interactuar con el sistema de archivos. Ofrece APIs síncronas, asíncronas con callbacks, y basadas en Promises.

## Patrones de Uso

### 1. Síncrono vs Asíncrono vs Promises vs Streams

```javascript
// 1. SÍNCRONO - Bloquea el Event Loop
const fs = require('fs');

try {
  const data = fs.readFileSync('/path/to/file.txt', 'utf8');
  console.log(data);
} catch (err) {
  console.error('Error:', err);
}

// ❌ Problema: Bloquea el event loop completamente
// ✅ Usar solo en: Scripts, inicio de aplicación, archivos de configuración pequeños


// 2. ASÍNCRONO CON CALLBACKS - Patrón legacy
fs.readFile('/path/to/file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log(data);
});

// ❌ Problema: Callback hell, difícil manejo de errores
// ✅ Usar solo en: Código legacy, compatibilidad


// 3. PROMISES - Moderno y recomendado
const fs = require('fs').promises;

async function readFileAsync() {
  try {
    const data = await fs.readFile('/path/to/file.txt', 'utf8');
    console.log(data);
  } catch (err) {
    console.error('Error:', err);
  }
}

// ✅ Recomendado: API moderna, async/await, mejor manejo de errores


// 4. STREAMS - Para archivos grandes
const fs = require('fs');
const stream = fs.createReadStream('/path/to/large-file.txt', 'utf8');

stream.on('data', (chunk) => {
  console.log('Chunk:', chunk);
});

stream.on('error', (err) => {
  console.error('Error:', err);
});

stream.on('end', () => {
  console.log('Finished reading');
});

// ✅ Usar para: Archivos grandes, procesamiento en chunks, menor uso de memoria
```

## Métodos Principales (Promises API)

### Lectura de Archivos

```javascript
const fs = require('fs').promises;

// Leer archivo completo
async function readFile(path) {
  try {
    // Buffer por defecto
    const buffer = await fs.readFile(path);

    // String con encoding
    const text = await fs.readFile(path, 'utf8');

    // JSON
    const json = JSON.parse(await fs.readFile(path, 'utf8'));

    return text;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Archivo no existe');
    } else if (err.code === 'EACCES') {
      console.error('Sin permisos');
    }
    throw err;
  }
}

// Verificar existencia
async function fileExists(path) {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Leer metadata
async function getFileInfo(path) {
  const stats = await fs.stat(path);

  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    permissions: stats.mode
  };
}
```

### Escritura de Archivos

```javascript
const fs = require('fs').promises;
const path = require('path');

// Escribir archivo (sobreescribe si existe)
async function writeFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
  } catch (err) {
    console.error('Error escribiendo archivo:', err);
    throw err;
  }
}

// Escribir JSON con formato
async function writeJSON(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json, 'utf8');
}

// Append (agregar al final)
async function appendToFile(filePath, content) {
  await fs.appendFile(filePath, content + '\n', 'utf8');
}

// Escritura atómica (segura)
async function atomicWrite(filePath, content) {
  const tempPath = `${filePath}.tmp`;

  try {
    // Escribir en archivo temporal
    await fs.writeFile(tempPath, content, 'utf8');

    // Renombrar atómicamente
    await fs.rename(tempPath, filePath);
  } catch (err) {
    // Limpiar archivo temporal si falla
    await fs.unlink(tempPath).catch(() => {});
    throw err;
  }
}
```

### Operaciones con Directorios

```javascript
const fs = require('fs').promises;
const path = require('path');

// Crear directorio (recursivo)
async function createDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// Leer contenido de directorio
async function listFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  return {
    files: entries.filter(e => e.isFile()).map(e => e.name),
    directories: entries.filter(e => e.isDirectory()).map(e => e.name)
  };
}

// Recorrer directorio recursivamente
async function* walkDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath);
    } else {
      yield fullPath;
    }
  }
}

// Uso
async function findAllJsFiles(dirPath) {
  const jsFiles = [];

  for await (const file of walkDirectory(dirPath)) {
    if (file.endsWith('.js')) {
      jsFiles.push(file);
    }
  }

  return jsFiles;
}

// Copiar directorio recursivamente
async function copyDirectory(src, dest) {
  await createDirectory(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Eliminar directorio recursivamente
async function removeDirectory(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
}
```

## Streams para Archivos Grandes

### ReadStream

```javascript
const fs = require('fs');
const { pipeline } = require('stream/promises');

// Leer archivo grande
async function processLargeFile(filePath) {
  const readStream = fs.createReadStream(filePath, {
    encoding: 'utf8',
    highWaterMark: 64 * 1024 // 64KB chunks
  });

  for await (const chunk of readStream) {
    // Procesar chunk por chunk
    console.log('Chunk size:', chunk.length);
  }
}

// Contar líneas en archivo grande
async function countLines(filePath) {
  const readStream = fs.createReadStream(filePath, 'utf8');
  let count = 0;
  let leftover = '';

  for await (const chunk of readStream) {
    const lines = (leftover + chunk).split('\n');
    leftover = lines.pop() || '';
    count += lines.length;
  }

  if (leftover) count++;
  return count;
}
```

### WriteStream

```javascript
const fs = require('fs');

// Escribir archivo grande
async function writeLargeFile(filePath, dataGenerator) {
  const writeStream = fs.createWriteStream(filePath, {
    encoding: 'utf8',
    highWaterMark: 64 * 1024
  });

  for await (const data of dataGenerator()) {
    // Respetar backpressure
    if (!writeStream.write(data)) {
      await new Promise(resolve => writeStream.once('drain', resolve));
    }
  }

  writeStream.end();
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// Logging eficiente
class FileLogger {
  constructor(filePath) {
    this.stream = fs.createWriteStream(filePath, {
      flags: 'a', // append
      encoding: 'utf8'
    });
  }

  log(message) {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    this.stream.write(line);
  }

  async close() {
    this.stream.end();
    await new Promise(resolve => this.stream.on('finish', resolve));
  }
}
```

### Pipeline para Transformaciones

```javascript
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

// Transformar archivo CSV a JSON
async function csvToJson(inputPath, outputPath) {
  const transformStream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      const lines = chunk.toString().split('\n');
      const jsonLines = lines
        .filter(line => line.trim())
        .map(line => {
          const [name, age, city] = line.split(',');
          return JSON.stringify({ name, age, city }) + '\n';
        })
        .join('');

      callback(null, jsonLines);
    }
  });

  await pipeline(
    fs.createReadStream(inputPath),
    transformStream,
    fs.createWriteStream(outputPath)
  );
}

// Comprimir archivo
const zlib = require('zlib');

async function compressFile(inputPath, outputPath) {
  await pipeline(
    fs.createReadStream(inputPath),
    zlib.createGzip(),
    fs.createWriteStream(outputPath)
  );
}

async function decompressFile(inputPath, outputPath) {
  await pipeline(
    fs.createReadStream(inputPath),
    zlib.createGunzip(),
    fs.createWriteStream(outputPath)
  );
}
```

## Patrones Avanzados

### File Watcher

```javascript
const fs = require('fs');
const { EventEmitter } = require('events');

class FileWatcher extends EventEmitter {
  constructor(filePath, options = {}) {
    super();
    this.filePath = filePath;
    this.debounceTime = options.debounceTime || 100;
    this.timeout = null;

    this.watcher = fs.watch(filePath, (eventType, filename) => {
      clearTimeout(this.timeout);

      this.timeout = setTimeout(() => {
        this.emit('change', eventType, filename);
      }, this.debounceTime);
    });
  }

  close() {
    this.watcher.close();
    clearTimeout(this.timeout);
  }
}

// Uso
const watcher = new FileWatcher('/path/to/config.json');

watcher.on('change', async (eventType, filename) => {
  console.log('Config changed, reloading...');
  const config = JSON.parse(await fs.promises.readFile(filename, 'utf8'));
  // Reload config
});
```

### File Lock (para concurrencia)

```javascript
const fs = require('fs').promises;
const path = require('path');

class FileLock {
  constructor(filePath) {
    this.lockPath = `${filePath}.lock`;
    this.acquired = false;
  }

  async acquire(timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // wx = crear solo si no existe
        await fs.writeFile(this.lockPath, process.pid.toString(), { flag: 'wx' });
        this.acquired = true;
        return true;
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;

        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    throw new Error('Lock timeout');
  }

  async release() {
    if (this.acquired) {
      await fs.unlink(this.lockPath).catch(() => {});
      this.acquired = false;
    }
  }
}

// Uso
async function writeWithLock(filePath, content) {
  const lock = new FileLock(filePath);

  try {
    await lock.acquire();
    await fs.writeFile(filePath, content);
  } finally {
    await lock.release();
  }
}
```

### Cache de Archivos

```javascript
const fs = require('fs').promises;

class FileCache {
  constructor(maxSize = 100 * 1024 * 1024) { // 100MB
    this.cache = new Map();
    this.maxSize = maxSize;
    this.currentSize = 0;
  }

  async read(filePath) {
    // Verificar cache
    if (this.cache.has(filePath)) {
      const cached = this.cache.get(filePath);

      // Verificar si cambió
      const stats = await fs.stat(filePath);
      if (stats.mtimeMs === cached.mtime) {
        return cached.content;
      }

      // Remover entrada obsoleta
      this.currentSize -= cached.size;
      this.cache.delete(filePath);
    }

    // Leer del disco
    const content = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    // Evitar cachear archivos muy grandes
    if (stats.size > this.maxSize / 10) {
      return content;
    }

    // Evict si excede tamaño máximo
    while (this.currentSize + stats.size > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      const entry = this.cache.get(firstKey);
      this.currentSize -= entry.size;
      this.cache.delete(firstKey);
    }

    // Agregar a cache
    this.cache.set(filePath, {
      content,
      mtime: stats.mtimeMs,
      size: stats.size
    });
    this.currentSize += stats.size;

    return content;
  }

  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }
}
```

## Manejo de Errores Común

```javascript
const fs = require('fs').promises;

async function safeFileOperation(operation) {
  try {
    return await operation();
  } catch (err) {
    switch (err.code) {
      case 'ENOENT':
        throw new Error('File or directory not found');

      case 'EACCES':
      case 'EPERM':
        throw new Error('Permission denied');

      case 'EEXIST':
        throw new Error('File already exists');

      case 'ENOSPC':
        throw new Error('No space left on device');

      case 'EMFILE':
        throw new Error('Too many open files');

      default:
        throw err;
    }
  }
}

// Retry con exponential backoff para operaciones de I/O
async function retryFileOperation(operation, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      // Solo reintentar errores transitorios
      if (['EMFILE', 'ENFILE', 'EAGAIN'].includes(err.code)) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}
```

## Pregunta de Entrevista

**P: ¿Cuándo usarías fs.readFile() vs fs.createReadStream()? ¿Qué problemas puede causar usar readFile() para archivos grandes?**

**R:**

`fs.readFile()`:
- Lee el archivo completo en memoria
- Retorna todo el contenido de una vez
- Ideal para archivos pequeños (<10MB)
- Simple y directo

`fs.createReadStream()`:
- Lee el archivo en chunks (por defecto 64KB)
- Procesa datos incrementalmente
- Usa memoria constante O(1) sin importar tamaño
- Ideal para archivos grandes

**Problemas con readFile() en archivos grandes:**
1. **Memory Overflow**: Un archivo de 2GB consumiría 2GB de RAM
2. **Blocking**: El event loop espera hasta leer todo antes de continuar
3. **Escalabilidad**: 10 usuarios leyendo 1GB = 10GB RAM
4. **GC Pressure**: Objetos grandes causan pausas en garbage collection

**Solución:**
```javascript
// ❌ Mal: Lee 1GB en memoria
const data = await fs.readFile('large-file.log');
processData(data);

// ✅ Bien: Procesa en chunks de 64KB
const stream = fs.createReadStream('large-file.log');
for await (const chunk of stream) {
  processChunk(chunk);
}
```

## Referencias

- [fs Promises API](https://nodejs.org/api/fs.html#promises-api)
- Ver: `path-os.md` para trabajar con rutas
- Ver: `04-asincronia-avanzada/backpressure-streams.md` para manejo avanzado de streams
