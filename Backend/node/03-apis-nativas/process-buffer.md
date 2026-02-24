# Process y Buffer

## Process

El objeto global `process` proporciona información y control sobre el proceso Node.js actual.

### Información del Proceso

```javascript
// Información básica
console.log('Process ID:', process.pid);
console.log('Parent Process ID:', process.ppid);
console.log('Platform:', process.platform); // 'darwin', 'linux', 'win32'
console.log('Architecture:', process.arch); // 'x64', 'arm64'
console.log('Node version:', process.version); // 'v18.12.0'
console.log('Node versions:', process.versions);
/*
{
  node: '18.12.0',
  v8: '10.2.154.15-node.12',
  uv: '1.43.0',
  zlib: '1.2.11',
  ...
}
*/

// Directorio actual
console.log('Current directory:', process.cwd());

// Cambiar directorio
process.chdir('/tmp');
console.log('New directory:', process.cwd());

// Tiempo de ejecución
console.log('Uptime (seconds):', process.uptime());

// Ejecutable de Node
console.log('Node executable:', process.execPath);
// '/usr/local/bin/node'

// Argumentos de línea de comandos
console.log('Arguments:', process.argv);
// ['node', '/path/to/script.js', 'arg1', 'arg2']

// Título del proceso (visible en ps/top)
process.title = 'my-app-server';

// Usuario del proceso (Unix)
console.log('User ID:', process.getuid?.());
console.log('Group ID:', process.getgid?.());
```

### Variables de Entorno

```javascript
// Acceder a variables de entorno
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

console.log('Environment variables:', process.env);

// Establecer variable (solo en el proceso actual)
process.env.MY_VAR = 'value';

// Verificar si existe
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

// Helper para obtener env vars requeridas
function getRequiredEnv(key) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
}

const dbUrl = getRequiredEnv('DATABASE_URL');

// Configuración por ambiente
const config = {
  development: {
    db: 'mongodb://localhost/dev',
    debug: true
  },
  production: {
    db: process.env.DATABASE_URL,
    debug: false
  },
  test: {
    db: 'mongodb://localhost/test',
    debug: false
  }
};

const currentConfig = config[process.env.NODE_ENV || 'development'];

// dotenv pattern (cargar desde .env file)
require('dotenv').config();

console.log(process.env.API_KEY); // Loaded from .env
```

### Argumentos CLI

```javascript
// process.argv contiene argumentos de línea de comandos
// node script.js --port 3000 --verbose
// ['node', '/path/to/script.js', '--port', '3000', '--verbose']

// Parser simple de argumentos
function parseArgs(argv) {
  const args = {};

  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1]?.startsWith('--') ? true : argv[i + 1];
      args[key] = value;
      if (value !== true) i++;
    }
  }

  return args;
}

const args = parseArgs(process.argv);
console.log(args);
// { port: '3000', verbose: true }

// Mejor: usar librería como yargs o commander
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('port', {
    alias: 'p',
    type: 'number',
    description: 'Port to listen on',
    default: 3000
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Enable verbose logging'
  })
  .argv;

console.log(`Server running on port ${argv.port}`);
if (argv.verbose) {
  console.log('Verbose mode enabled');
}
```

### Stdin, Stdout, Stderr

```javascript
// process.stdout - Salida estándar
process.stdout.write('Hello\n');
console.log('Hello'); // Usa stdout internamente

// process.stderr - Salida de errores
process.stderr.write('Error!\n');
console.error('Error!'); // Usa stderr internamente

// process.stdin - Entrada estándar
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  console.log('Received:', chunk);

  if (chunk.trim() === 'exit') {
    process.exit(0);
  }
});

// Leer línea por línea
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('What is your name? ', (name) => {
  console.log(`Hello, ${name}!`);
  rl.close();
});

// Prompt interactivo
async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Uso
const name = await prompt('Enter your name: ');
const age = await prompt('Enter your age: ');
console.log(`${name} is ${age} years old`);

// Verificar si stdin/stdout es TTY (terminal)
if (process.stdin.isTTY) {
  console.log('Running in terminal');
} else {
  console.log('Input is piped or redirected');
}

if (!process.stdout.isTTY) {
  // Output es piped, no usar colores/spinners
}
```

### Memoria

```javascript
// Uso de memoria
const used = process.memoryUsage();
console.log(used);
/*
{
  rss: 4935680,        // Resident Set Size (total memory)
  heapTotal: 1826816,  // V8 heap total
  heapUsed: 650472,    // V8 heap used
  external: 49879,     // C++ objects bound to JS
  arrayBuffers: 9386   // ArrayBuffers and SharedArrayBuffers
}
*/

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

console.log('Memory usage:');
console.log('  RSS:', formatBytes(used.rss));
console.log('  Heap Total:', formatBytes(used.heapTotal));
console.log('  Heap Used:', formatBytes(used.heapUsed));
console.log('  External:', formatBytes(used.external));

// Monitorear memoria
function logMemory() {
  const usage = process.memoryUsage();
  console.log({
    timestamp: new Date().toISOString(),
    heapUsed: formatBytes(usage.heapUsed),
    heapTotal: formatBytes(usage.heapTotal),
    rss: formatBytes(usage.rss)
  });
}

setInterval(logMemory, 10000); // Cada 10 segundos

// Forzar garbage collection (requiere flag --expose-gc)
// node --expose-gc script.js
if (global.gc) {
  global.gc();
  console.log('GC executed');
}

// Resource usage (CPU time)
const usage = process.cpuUsage();
console.log(usage);
/*
{
  user: 38579,    // microseconds (CPU time in user mode)
  system: 6986    // microseconds (CPU time in system mode)
}
*/

// Medir CPU usage de operación
const startUsage = process.cpuUsage();
// ... operación ...
const endUsage = process.cpuUsage(startUsage);
console.log('CPU time:', endUsage);
```

### Señales y Eventos

```javascript
// Señales del sistema operativo
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  // Cleanup: cerrar DB, terminar requests, etc.
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT (Ctrl+C) received');
  process.exit(0);
});

// Enviar señal a otro proceso
process.kill(pid, 'SIGTERM');

// Eventos del proceso
process.on('exit', (code) => {
  // Solo código síncrono aquí
  console.log(`Process exiting with code ${code}`);
});

process.on('beforeExit', (code) => {
  // Permite código asíncrono
  console.log('Before exit event');
});

// Errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Log error y exit
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Log error y exit
  process.exit(1);
});

// Warning events
process.on('warning', (warning) => {
  console.warn('Warning:', warning.name);
  console.warn(warning.message);
  console.warn(warning.stack);
});

// Graceful shutdown completo
class GracefulShutdown {
  constructor() {
    this.shuttingDown = false;
    this.listeners = [];

    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  onShutdown(callback) {
    this.listeners.push(callback);
  }

  async shutdown(signal) {
    if (this.shuttingDown) return;

    this.shuttingDown = true;
    console.log(`${signal} received, shutting down...`);

    try {
      // Ejecutar todos los cleanup handlers
      await Promise.all(
        this.listeners.map(callback => callback())
      );

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  }
}

// Uso
const graceful = new GracefulShutdown();

graceful.onShutdown(async () => {
  console.log('Closing database connection...');
  await db.close();
});

graceful.onShutdown(async () => {
  console.log('Closing HTTP server...');
  await new Promise(resolve => server.close(resolve));
});
```

### Métricas de Rendimiento

```javascript
// High-resolution time
const start = process.hrtime.bigint();

// ... operación ...

const end = process.hrtime.bigint();
const duration = end - start;

console.log(`Operation took ${duration} nanoseconds`);
console.log(`Operation took ${Number(duration) / 1e6} milliseconds`);

// performance.now() alternativa
const { performance } = require('perf_hooks');

const t0 = performance.now();
// ... operación ...
const t1 = performance.now();

console.log(`Took ${t1 - t0} milliseconds`);

// Medir múltiples operaciones
class PerformanceTracker {
  constructor() {
    this.measurements = new Map();
  }

  start(name) {
    this.measurements.set(name, process.hrtime.bigint());
  }

  end(name) {
    const start = this.measurements.get(name);
    if (!start) {
      throw new Error(`No measurement started for ${name}`);
    }

    const duration = process.hrtime.bigint() - start;
    this.measurements.delete(name);

    return Number(duration) / 1e6; // milliseconds
  }

  measure(name, fn) {
    this.start(name);
    const result = fn();
    const duration = this.end(name);

    console.log(`${name}: ${duration.toFixed(2)}ms`);
    return result;
  }

  async measureAsync(name, fn) {
    this.start(name);
    const result = await fn();
    const duration = this.end(name);

    console.log(`${name}: ${duration.toFixed(2)}ms`);
    return result;
  }
}

// Uso
const perf = new PerformanceTracker();

await perf.measureAsync('Database query', async () => {
  return await db.query('SELECT * FROM users');
});

perf.measure('JSON parsing', () => {
  return JSON.parse(largeJsonString);
});
```

## Buffer

`Buffer` es una clase para trabajar con datos binarios. Similar a arrays de bytes.

### Crear Buffers

```javascript
// Crear buffer vacío
const buf1 = Buffer.alloc(10); // 10 bytes inicializados a 0
console.log(buf1); // <Buffer 00 00 00 00 00 00 00 00 00 00>

// Crear buffer sin inicializar (más rápido, pero puede contener datos viejos)
const buf2 = Buffer.allocUnsafe(10);

// Crear desde string
const buf3 = Buffer.from('Hello');
console.log(buf3); // <Buffer 48 65 6c 6c 6f>

// Con encoding específico
const buf4 = Buffer.from('Hello', 'utf8');
const buf5 = Buffer.from('48656c6c6f', 'hex');
const buf6 = Buffer.from('SGVsbG8=', 'base64');

// Crear desde array
const buf7 = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

// Crear desde otro buffer (copia)
const buf8 = Buffer.from(buf3);

// Tamaño
console.log('Length:', buf3.length); // 5 bytes
console.log('Byte length:', Buffer.byteLength('Hello', 'utf8')); // 5

// Concatenar buffers
const buf9 = Buffer.concat([buf3, buf4]);
```

### Leer y Escribir

```javascript
const buf = Buffer.alloc(10);

// Escribir strings
buf.write('Hello');
console.log(buf.toString()); // 'Hello\x00\x00\x00\x00\x00'

buf.write('World', 5); // Escribir en offset 5
console.log(buf.toString()); // 'HelloWorld'

// Escribir con encoding
buf.write('48656c6c6f', 'hex');

// Leer como string
console.log(buf.toString('utf8'));
console.log(buf.toString('hex'));
console.log(buf.toString('base64'));

// Slice (crea vista, no copia)
const slice = buf.slice(0, 5);
console.log(slice.toString()); // 'Hello'

// Modificar slice modifica original
slice[0] = 0x4A; // 'J'
console.log(buf.toString()); // 'Jello...'

// Copiar buffer (copia real)
const copy = Buffer.alloc(buf.length);
buf.copy(copy);

// Acceder a bytes individuales
console.log(buf[0]); // 74 (código ASCII de 'J')
buf[0] = 0x48; // 'H'

// Iterar
for (const byte of buf) {
  console.log(byte.toString(16)); // hex
}

// Fill
buf.fill(0); // Llenar con ceros
buf.fill('ab', 'hex'); // Llenar con patrón hex
```

### Números y Tipos de Datos

```javascript
const buf = Buffer.alloc(8);

// Escribir números
buf.writeInt8(127, 0);           // 1 byte signed
buf.writeUInt8(255, 1);          // 1 byte unsigned
buf.writeInt16LE(32767, 2);      // 2 bytes Little Endian
buf.writeInt32BE(-2147483648, 4);// 4 bytes Big Endian

// Leer números
const num1 = buf.readInt8(0);
const num2 = buf.readUInt8(1);
const num3 = buf.readInt16LE(2);
const num4 = buf.readInt32BE(4);

// Float
const floatBuf = Buffer.alloc(8);
floatBuf.writeFloatLE(3.14, 0);    // 4 bytes
floatBuf.writeDoubleLE(3.14159, 4); // 8 bytes

const pi = floatBuf.readFloatLE(0);
const piDouble = floatBuf.readDoubleLE(4);

// BigInt (64-bit)
const bigBuf = Buffer.alloc(8);
bigBuf.writeBigInt64LE(9007199254740991n, 0);
const bigNum = bigBuf.readBigInt64LE(0);
```

### Comparación y Búsqueda

```javascript
const buf1 = Buffer.from('ABC');
const buf2 = Buffer.from('ABD');
const buf3 = Buffer.from('ABC');

// Comparar
console.log(buf1.compare(buf2)); // -1 (buf1 < buf2)
console.log(buf1.compare(buf3)); // 0 (iguales)

// Equals
console.log(buf1.equals(buf3)); // true

// Includes
console.log(buf1.includes('B')); // true
console.log(buf1.includes(0x42)); // true (código de 'B')

// IndexOf
console.log(buf1.indexOf('B')); // 1

// Ordenar array de buffers
const buffers = [buf2, buf1, buf3];
buffers.sort(Buffer.compare);
```

### Casos de Uso Prácticos

```javascript
// 1. Leer archivo como buffer
const fs = require('fs').promises;

const fileBuffer = await fs.readFile('image.png');
console.log('File size:', fileBuffer.length, 'bytes');
console.log('First bytes:', fileBuffer.slice(0, 4).toString('hex'));

// Verificar PNG signature
const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
const isPNG = fileBuffer.slice(0, 4).equals(pngSignature);

// 2. Convertir entre encodings
function convertEncoding(data, fromEncoding, toEncoding) {
  const buf = Buffer.from(data, fromEncoding);
  return buf.toString(toEncoding);
}

const hex = convertEncoding('Hello', 'utf8', 'hex');
const base64 = convertEncoding(hex, 'hex', 'base64');

// 3. Streaming con buffers
const { Transform } = require('stream');

class BufferTransform extends Transform {
  constructor() {
    super();
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk, encoding, callback) {
    // Acumular chunks
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Procesar cuando tengamos suficiente
    while (this.buffer.length >= 1024) {
      const data = this.buffer.slice(0, 1024);
      this.buffer = this.buffer.slice(1024);

      this.push(data);
    }

    callback();
  }

  _flush(callback) {
    // Enviar buffer restante
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }
    callback();
  }
}

// 4. Protocolo binario custom
class BinaryProtocol {
  // Message format: [type:1byte][length:4bytes][data:Nbytes]

  static encode(type, data) {
    const dataBuffer = Buffer.from(data, 'utf8');
    const buffer = Buffer.allocUnsafe(5 + dataBuffer.length);

    buffer.writeUInt8(type, 0);
    buffer.writeUInt32BE(dataBuffer.length, 1);
    dataBuffer.copy(buffer, 5);

    return buffer;
  }

  static decode(buffer) {
    const type = buffer.readUInt8(0);
    const length = buffer.readUInt32BE(1);
    const data = buffer.slice(5, 5 + length).toString('utf8');

    return { type, data };
  }
}

// Uso
const message = BinaryProtocol.encode(1, 'Hello World');
const decoded = BinaryProtocol.decode(message);
console.log(decoded); // { type: 1, data: 'Hello World' }

// 5. Hash de buffer
const crypto = require('crypto');

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

const hash = hashBuffer(Buffer.from('data'));
```

### Performance Tips

```javascript
// ❌ Lento: Múltiples allocaciones
let buffer = Buffer.alloc(0);
for (let i = 0; i < 1000; i++) {
  buffer = Buffer.concat([buffer, Buffer.from('data')]);
}

// ✅ Rápido: Pre-allocar
const buffer = Buffer.allocUnsafe(1000 * 4);
for (let i = 0; i < 1000; i++) {
  buffer.write('data', i * 4);
}

// ✅ Más rápido: Buffer pool
const buffers = [];
for (let i = 0; i < 1000; i++) {
  buffers.push(Buffer.from('data'));
}
const result = Buffer.concat(buffers);

// ⚠️ allocUnsafe es más rápido pero puede contener datos viejos
const unsafe = Buffer.allocUnsafe(10);
console.log(unsafe); // Puede contener basura

// Limpiar si es necesario
unsafe.fill(0);

// ✅ Para datos sensibles, siempre usar alloc o fill
const sensitive = Buffer.alloc(10); // Garantiza ceros
```

## Pregunta de Entrevista

**P: ¿Qué es la diferencia entre process.exit() y process.kill()? ¿Cuándo usarías cada uno?**

**R:**

**process.exit([code]):**
- Termina el proceso ACTUAL inmediatamente
- Parámetro: exit code (0 = success, >0 = error)
- No espera operaciones asíncronas pendientes
- Llama event listener 'exit' (solo código síncrono)
- No puede ser cancelado

```javascript
// Termina el proceso actual
process.exit(0); // Success
process.exit(1); // Error

// Código después NO se ejecuta
console.log('Never printed');
```

**process.kill(pid, [signal]):**
- Envía señal a OTRO proceso (o al actual)
- Parámetro: PID del proceso target
- Segundo parámetro: señal (default: 'SIGTERM')
- El proceso receptor puede capturar y manejar la señal
- Nombre confuso: NO necesariamente "mata" el proceso

```javascript
// Enviar señal a otro proceso
process.kill(1234, 'SIGTERM');

// Enviar señal al proceso actual (equivalente a recibir señal)
process.kill(process.pid, 'SIGTERM');

// El proceso puede manejar la señal
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  // Cleanup graceful
  server.close(() => process.exit(0));
});
```

**Señales comunes:**
- `SIGTERM`: Graceful termination (puede ser capturado)
- `SIGKILL`: Force kill (NO puede ser capturado)
- `SIGINT`: Ctrl+C
- `SIGHUP`: Terminal cerrado

**Cuándo usar cada uno:**

**Usa process.exit():**
- Error fatal en inicio (config inválida, dependencias faltantes)
- Shutdown inmediato después de cleanup
- CLI tools que terminan después de ejecutar comando

**Usa process.kill():**
- Shutdown graceful (enviar SIGTERM al proceso)
- Comunicación entre procesos
- Recargar configuración (SIGHUP)
- Nunca usar SIGKILL a menos que sea absolutamente necesario

**Best practice:**
```javascript
// ✅ Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received');

  // Cleanup
  await db.close();
  await server.close();

  // Exit después de cleanup
  process.exit(0);
});

// ❌ Exit inmediato (malo)
process.on('SIGTERM', () => {
  process.exit(0); // Puede perder datos!
});

// ✅ Timeout para force exit si cleanup tarda mucho
process.on('SIGTERM', async () => {
  const timeout = setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);

  await cleanup();
  clearTimeout(timeout);
  process.exit(0);
});
```

## Referencias

- [Process](https://nodejs.org/api/process.html)
- [Buffer](https://nodejs.org/api/buffer.html)
- Ver: `07-errores-estabilidad/graceful-shutdown.md` para shutdown patterns
- Ver: `12-devops/env-docker.md` para manejo de variables de entorno
