# Path y OS

Módulos esenciales para trabajar con rutas de archivos y obtener información del sistema operativo.

## Path Module

El módulo `path` proporciona utilidades para trabajar con rutas de archivos y directorios de forma multiplataforma.

### Métodos Principales

```javascript
const path = require('path');

// path.join() - Une segmentos de ruta normalizando
const fullPath = path.join('/users', 'john', 'documents', 'file.txt');
// Unix: /users/john/documents/file.txt
// Windows: \users\john\documents\file.txt

const relativePath = path.join('folder', '../', 'file.txt');
// './file.txt'

// path.resolve() - Resuelve a ruta absoluta
const absolutePath = path.resolve('folder', 'file.txt');
// Unix: /current/working/directory/folder/file.txt
// Windows: C:\current\working\directory\folder\file.txt

const fromRoot = path.resolve('/users', 'john', 'documents');
// /users/john/documents (ignora CWD si empieza con /)

// path.basename() - Obtiene el nombre del archivo
path.basename('/users/john/file.txt');        // 'file.txt'
path.basename('/users/john/file.txt', '.txt'); // 'file' (sin extensión)
path.basename('/users/john/');                 // 'john'

// path.dirname() - Obtiene el directorio padre
path.dirname('/users/john/file.txt');  // '/users/john'
path.dirname('/users/john/');          // '/users'

// path.extname() - Obtiene la extensión
path.extname('file.txt');       // '.txt'
path.extname('file.tar.gz');    // '.gz'
path.extname('file');           // ''
path.extname('.gitignore');     // ''

// path.parse() - Parsea ruta en objeto
path.parse('/users/john/file.txt');
/*
{
  root: '/',
  dir: '/users/john',
  base: 'file.txt',
  ext: '.txt',
  name: 'file'
}
*/

// path.format() - Crea ruta desde objeto
path.format({
  dir: '/users/john',
  base: 'file.txt'
});
// '/users/john/file.txt'

// path.normalize() - Normaliza ruta
path.normalize('/users//john/../jane/./file.txt');
// '/users/jane/file.txt'

// path.relative() - Obtiene ruta relativa entre dos rutas
path.relative('/users/john', '/users/john/documents/file.txt');
// 'documents/file.txt'

path.relative('/users/john', '/users/jane/file.txt');
// '../jane/file.txt'

// path.isAbsolute() - Verifica si es absoluta
path.isAbsolute('/users/john');  // true
path.isAbsolute('./file.txt');   // false
path.isAbsolute('C:\\users');    // true (Windows)
```

### Separadores Multiplataforma

```javascript
const path = require('path');

// path.sep - Separador del sistema
console.log(path.sep);
// Unix: '/'
// Windows: '\\'

// path.delimiter - Delimitador de PATH
console.log(path.delimiter);
// Unix: ':'
// Windows: ';'

// Usar join() para evitar problemas de separador
// ❌ Mal - No es multiplataforma
const badPath = '/users' + '/' + 'john' + '/' + 'file.txt';

// ✅ Bien - Multiplataforma
const goodPath = path.join('users', 'john', 'file.txt');

// Parsear PATH del sistema
const pathDirs = process.env.PATH.split(path.delimiter);
```

### Patrones Comunes

```javascript
const path = require('path');

// Obtener directorio del módulo actual
const __filename = '/users/john/project/src/index.js';
const __dirname = path.dirname(__filename); // '/users/john/project/src'

// Subir niveles en el árbol
const projectRoot = path.join(__dirname, '../..');
// '/users/john/project'

// Construir rutas desde la raíz del proyecto
const configPath = path.join(projectRoot, 'config', 'app.json');
const publicPath = path.join(projectRoot, 'public', 'images');

// Cambiar extensión de archivo
function changeExtension(filePath, newExt) {
  const parsed = path.parse(filePath);
  return path.format({
    ...parsed,
    base: undefined, // Forzar uso de name + ext
    ext: newExt.startsWith('.') ? newExt : `.${newExt}`
  });
}

changeExtension('/users/file.txt', '.md');
// '/users/file.md'

// Verificar si un path está dentro de otro
function isSubPath(parent, child) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

isSubPath('/users/john', '/users/john/documents/file.txt'); // true
isSubPath('/users/john', '/users/jane/file.txt');           // false

// Encontrar archivos con patrón
function hasExtension(filePath, extensions) {
  const ext = path.extname(filePath).toLowerCase();
  return extensions.includes(ext);
}

hasExtension('file.js', ['.js', '.ts']);  // true
hasExtension('file.txt', ['.js', '.ts']); // false
```

### Path con ESM (import.meta.url)

```javascript
// En módulos ES6, no existe __dirname ni __filename
// Usar import.meta.url y fileURLToPath

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, '..', 'config', 'app.json');
```

## OS Module

El módulo `os` proporciona información sobre el sistema operativo.

### Información del Sistema

```javascript
const os = require('os');

// Información de CPU
const cpus = os.cpus();
console.log(`CPUs: ${cpus.length}`);
console.log(`Model: ${cpus[0].model}`);
console.log(`Speed: ${cpus[0].speed} MHz`);

// Ejemplo de estructura de CPU
/*
{
  model: 'Intel(R) Core(TM) i7-9750H',
  speed: 2600,
  times: {
    user: 252020,
    nice: 0,
    sys: 30340,
    idle: 1070356870,
    irq: 0
  }
}
*/

// Calcular uso de CPU
function getCPUUsage() {
  const cpus = os.cpus();

  return cpus.map(cpu => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    const usage = 100 - (idle / total * 100);

    return {
      model: cpu.model,
      usage: usage.toFixed(2) + '%'
    };
  });
}

// Memoria
const totalMemory = os.totalmem();      // Bytes
const freeMemory = os.freemem();        // Bytes
const usedMemory = totalMemory - freeMemory;

console.log(`Total: ${(totalMemory / 1024 ** 3).toFixed(2)} GB`);
console.log(`Free: ${(freeMemory / 1024 ** 3).toFixed(2)} GB`);
console.log(`Used: ${(usedMemory / 1024 ** 3).toFixed(2)} GB`);
console.log(`Usage: ${((usedMemory / totalMemory) * 100).toFixed(2)}%`);

// Sistema operativo
console.log('Platform:', os.platform());    // 'darwin', 'linux', 'win32'
console.log('Type:', os.type());            // 'Linux', 'Darwin', 'Windows_NT'
console.log('Release:', os.release());      // Versión del kernel
console.log('Arch:', os.arch());            // 'x64', 'arm', 'arm64'
console.log('Hostname:', os.hostname());    // Nombre del host
console.log('Uptime:', os.uptime(), 'seg'); // Tiempo encendido en segundos

// Usuario
console.log('User info:', os.userInfo());
/*
{
  uid: 501,
  gid: 20,
  username: 'john',
  homedir: '/Users/john',
  shell: '/bin/zsh'
}
*/

// Directorios del sistema
console.log('Home dir:', os.homedir());     // '/Users/john'
console.log('Temp dir:', os.tmpdir());      // '/tmp'

// EOL (End of Line)
console.log('EOL:', JSON.stringify(os.EOL));
// Unix/Mac: '\n'
// Windows: '\r\n'

// Interfaces de red
const networkInterfaces = os.networkInterfaces();
console.log(networkInterfaces);
```

### Patrones Útiles

```javascript
const os = require('os');

// Detectar plataforma para lógica específica
function getPlatformSpecificPath() {
  switch (os.platform()) {
    case 'win32':
      return 'C:\\Program Files\\App';
    case 'darwin':
      return '/Applications/App';
    case 'linux':
      return '/usr/local/bin/app';
    default:
      throw new Error('Unsupported platform');
  }
}

// Helper para verificar plataforma
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

// Formatear bytes a human-readable
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(2)} ${units[i]}`;
}

console.log(formatBytes(os.totalmem())); // "16.00 GB"

// Obtener IP local
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return '127.0.0.1';
}

console.log('Local IP:', getLocalIP()); // "192.168.1.100"

// Health check del sistema
function getSystemHealth() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

  const loadAvg = os.loadavg(); // [1min, 5min, 15min] - solo Unix
  const cpuCount = os.cpus().length;

  return {
    memory: {
      total: formatBytes(totalMem),
      free: formatBytes(freeMem),
      used: formatBytes(totalMem - freeMem),
      usagePercent: memUsagePercent.toFixed(2) + '%',
      healthy: memUsagePercent < 80
    },
    cpu: {
      count: cpuCount,
      loadAverage: loadAvg.map(l => l.toFixed(2)),
      // Load average saludable: < número de CPUs
      healthy: loadAvg[0] < cpuCount
    },
    uptime: {
      seconds: os.uptime(),
      formatted: formatUptime(os.uptime())
    },
    platform: os.platform(),
    nodeVersion: process.version
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

// Logs con EOL correcto
function log(...messages) {
  const line = messages.join(' ') + os.EOL;
  process.stdout.write(line);
}

// Determinar número óptimo de workers (para cluster)
function getOptimalWorkerCount() {
  const cpuCount = os.cpus().length;
  const totalMemGB = os.totalmem() / 1024 ** 3;

  // Regla: 1 worker por CPU, pero max según memoria disponible
  // Asumir ~512MB por worker
  const maxByMemory = Math.floor(totalMemGB / 0.5);

  return Math.min(cpuCount, maxByMemory, 8); // Max 8 workers
}
```

### Monitoreo Continuo

```javascript
const os = require('os');

class SystemMonitor {
  constructor(interval = 5000) {
    this.interval = interval;
    this.timer = null;
  }

  start(callback) {
    this.timer = setInterval(() => {
      const stats = {
        timestamp: new Date().toISOString(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        loadAverage: os.loadavg(),
        uptime: os.uptime()
      };

      callback(stats);
    }, this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// Uso
const monitor = new SystemMonitor(10000); // cada 10 segundos

monitor.start((stats) => {
  if (stats.memory.usagePercent > 80) {
    console.warn('High memory usage:', stats.memory.usagePercent.toFixed(2) + '%');
  }

  if (stats.loadAverage[0] > os.cpus().length) {
    console.warn('High CPU load:', stats.loadAverage[0]);
  }
});

// Detener cuando sea necesario
// monitor.stop();
```

### Integración Path + OS

```javascript
const path = require('path');
const os = require('os');

// Rutas de configuración según SO
function getConfigPath(appName) {
  switch (os.platform()) {
    case 'win32':
      return path.join(process.env.APPDATA || os.homedir(), appName);
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName);
    case 'linux':
      return path.join(os.homedir(), '.config', appName);
    default:
      return path.join(os.homedir(), `.${appName}`);
  }
}

// Rutas de logs según SO
function getLogPath(appName) {
  switch (os.platform()) {
    case 'win32':
      return path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', appName, 'logs');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Logs', appName);
    case 'linux':
      return path.join('/var/log', appName);
    default:
      return path.join(os.tmpdir(), appName, 'logs');
  }
}

// Archivo temporal con nombre único
function getTempFilePath(prefix = 'temp', extension = '.tmp') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const filename = `${prefix}-${timestamp}-${random}${extension}`;

  return path.join(os.tmpdir(), filename);
}

console.log(getTempFilePath('upload', '.json'));
// /tmp/upload-1234567890-abc123.json
```

## Pregunta de Entrevista

**P: ¿Cuál es la diferencia entre path.join() y path.resolve()? ¿Cuándo usarías cada uno?**

**R:**

**path.join():**
- Une segmentos de ruta con el separador correcto del SO
- No considera el directorio actual (CWD)
- Resultado puede ser relativo o absoluto dependiendo del input
- Normaliza la ruta (resuelve `..` y `.`)

```javascript
path.join('/users', 'john', 'file.txt');
// '/users/john/file.txt'

path.join('users', 'john', 'file.txt');
// 'users/john/file.txt' (relativo)

path.join('/users', '../home', 'file.txt');
// '/home/file.txt' (normaliza ..)
```

**path.resolve():**
- Resuelve a una ruta ABSOLUTA
- Considera el CWD si la ruta es relativa
- Procesa de derecha a izquierda hasta encontrar una ruta absoluta
- Si ningún segmento es absoluto, agrega el CWD al principio

```javascript
// Asumiendo CWD = '/current/dir'

path.resolve('file.txt');
// '/current/dir/file.txt'

path.resolve('/users', 'john', 'file.txt');
// '/users/john/file.txt' (ignora CWD por el / inicial)

path.resolve('users', '/john', 'file.txt');
// '/john/file.txt' (resetea en /john porque es absoluto)
```

**Cuándo usar cada uno:**

**Usa path.join():**
- Combinar segmentos de ruta relativa
- Construir rutas sin importar si son absolutas o relativas
- Mantener la naturaleza (relativa/absoluta) del primer segmento

**Usa path.resolve():**
- Necesitas garantizar ruta absoluta
- Convertir ruta relativa a absoluta
- Resolver rutas relativas al CWD

```javascript
// ✅ Join para combinar segmentos
const configPath = path.join(__dirname, 'config', 'app.json');

// ✅ Resolve para garantizar absoluta desde CWD
const uploadPath = path.resolve('uploads', 'file.txt');
// Siempre absoluta sin importar dónde se ejecute
```

## Referencias

- [Path Module](https://nodejs.org/api/path.html)
- [OS Module](https://nodejs.org/api/os.html)
- Ver: `fs-file-system.md` para operaciones con archivos
- Ver: `08-performance/clustering.md` para uso de os.cpus() en clustering
