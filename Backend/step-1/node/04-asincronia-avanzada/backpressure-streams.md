# Backpressure en Streams

## ¿Qué es Backpressure?

**Backpressure** ocurre cuando un consumidor de datos (reader) no puede procesar datos tan rápido como el productor (writer) los genera.

**Problema:** Sin manejo de backpressure, la memoria se llena hasta que la aplicación crashea (Out of Memory).

---

## El Problema Sin Backpressure

```javascript
const fs = require('fs');
const http = require('http');

// ❌ MAL: No maneja backpressure
http.createServer((req, res) => {
  const stream = fs.createReadStream('huge-file.mp4');

  // Lee TODO el archivo en memoria antes de enviarlo
  let data = '';
  stream.on('data', (chunk) => {
    data += chunk; // ⚠️ Acumula en memoria
  });

  stream.on('end', () => {
    res.end(data); // ⚠️ Envía todo de una vez
  });
}).listen(3000);

// Con archivo de 1GB → Consume 1GB de RAM por request
// 10 requests simultáneas = 10GB RAM = Crash
```

---

## La Solución: Piping

```javascript
const fs = require('fs');
const http = require('http');

// ✅ BIEN: Usa pipe() que maneja backpressure automáticamente
http.createServer((req, res) => {
  const stream = fs.createReadStream('huge-file.mp4');

  stream.pipe(res);
  // pipe() maneja backpressure automáticamente
  // Solo lee chunks cuando res puede escribirlos
}).listen(3000);

// Con archivo de 1GB → Consume ~64KB de RAM (tamaño de chunk)
// Memoria constante sin importar tamaño del archivo
```

---

## Cómo Funciona pipe()

```javascript
// pipe() internamente hace esto:
readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk);

  if (!canContinue) {
    // Buffer del writable está lleno
    readable.pause(); // Pausa lectura
  }
});

writable.on('drain', () => {
  // Buffer del writable se vació
  readable.resume(); // Resume lectura
});

readable.on('end', () => {
  writable.end(); // Cierra el writable
});
```

---

## Backpressure Manual (sin pipe)

### Implementación Correcta

```javascript
const fs = require('fs');

function copyFile(source, destination) {
  const readable = fs.createReadStream(source);
  const writable = fs.createWriteStream(destination);

  readable.on('data', (chunk) => {
    const canContinue = writable.write(chunk);

    if (!canContinue) {
      // writable buffer está lleno, pausar lectura
      console.log('Backpressure detected, pausing...');
      readable.pause();
    }
  });

  writable.on('drain', () => {
    // writable buffer se vació, resumir lectura
    console.log('Drain event, resuming...');
    readable.resume();
  });

  readable.on('end', () => {
    writable.end();
    console.log('Copy complete');
  });

  readable.on('error', (err) => {
    writable.destroy(err);
  });

  writable.on('error', (err) => {
    readable.destroy(err);
  });
}

copyFile('source.mp4', 'destination.mp4');
```

---

## pipeline() - La Forma Moderna

`pipeline()` maneja backpressure + errores automáticamente.

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

// Comprimir archivo con manejo automático de backpressure
pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);

// Version con Promises (Node 15+)
const { pipeline } = require('stream/promises');

async function compressFile(input, output) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGzip(),
    fs.createWriteStream(output)
  );
  console.log('Compression complete');
}

await compressFile('input.txt', 'input.txt.gz');
```

---

## Transform Streams con Backpressure

```javascript
const { Transform } = require('stream');

class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    // Procesar chunk
    const upperChunk = chunk.toString().toUpperCase();

    // ✅ Llamar callback cuando termines
    // Esto permite que el stream maneje backpressure
    callback(null, upperChunk);

    // ❌ NUNCA hagas esto:
    // this.push(upperChunk);
    // callback();
    // Puede causar problemas de backpressure
  }
}

// Uso
const { pipeline } = require('stream');
const fs = require('fs');

pipeline(
  fs.createReadStream('input.txt'),
  new UpperCaseTransform(),
  fs.createWriteStream('output.txt'),
  (err) => {
    if (err) console.error(err);
  }
);
```

---

## Backpressure en HTTP Responses

```javascript
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => {
  const stream = fs.createReadStream('large-file.json');

  // ✅ pipe() maneja backpressure automáticamente
  stream.pipe(res);

  // Manejar errores
  stream.on('error', (err) => {
    res.statusCode = 500;
    res.end('Server Error');
  });

  // Manejar si el cliente cierra la conexión
  req.on('close', () => {
    stream.destroy(); // Detener lectura
  });
}).listen(3000);
```

---

## Backpressure en HTTP Requests (Upload)

```javascript
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    const writable = fs.createWriteStream('uploaded-file.dat');

    // ✅ req es un Readable stream, pipe maneja backpressure
    req.pipe(writable);

    writable.on('finish', () => {
      res.end('Upload complete');
    });

    writable.on('error', (err) => {
      res.statusCode = 500;
      res.end('Upload failed');
    });
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(3000);
```

---

## Debugging Backpressure

### Detectar Backpressure

```javascript
const fs = require('fs');

const readable = fs.createReadStream('huge-file.txt');
const writable = fs.createWriteStream('output.txt');

let backpressureCount = 0;
let dataCount = 0;

readable.on('data', (chunk) => {
  dataCount++;
  const canContinue = writable.write(chunk);

  if (!canContinue) {
    backpressureCount++;
    console.log(`Backpressure! (${backpressureCount} times)`);
    readable.pause();
  }
});

writable.on('drain', () => {
  console.log('Drain event');
  readable.resume();
});

readable.on('end', () => {
  writable.end();
  console.log(`Data events: ${dataCount}`);
  console.log(`Backpressure events: ${backpressureCount}`);
});
```

---

## Pregunta de Entrevista

**P: ¿Qué pasa si no manejas backpressure en un servidor que envía archivos grandes?**

**R:**

**Sin backpressure:**

```javascript
// ❌ No maneja backpressure
http.createServer((req, res) => {
  const stream = fs.createReadStream('1gb-file.mp4');

  stream.on('data', (chunk) => {
    res.write(chunk); // NO verifica si puede escribir
  });
}).listen(3000);
```

**Consecuencias:**

1. **Memoria infinita:**
   - Si cliente es lento (red lenta), Node sigue leyendo el archivo
   - Datos se acumulan en buffer interno de `res`
   - Memoria crece hasta Out of Memory (OOM)

2. **Múltiples clientes:**
   - 10 clientes lentos × 1GB archivo = 10GB RAM
   - Servidor crashea

3. **CPU desperdiciado:**
   - Lee archivo completo aunque cliente no pueda recibirlo
   - I/O innecesario

**Con backpressure:**

```javascript
// ✅ Maneja backpressure
http.createServer((req, res) => {
  const stream = fs.createReadStream('1gb-file.mp4');
  stream.pipe(res); // pipe() maneja backpressure
}).listen(3000);
```

**Beneficios:**

1. **Memoria constante:** ~64KB por conexión (tamaño de chunk)
2. **Escalable:** 1000 clientes = ~64MB RAM
3. **Eficiente:** Solo lee cuando puede enviar

**Regla de oro:** **SIEMPRE usa `pipe()` o `pipeline()` para streams.**

---

## Referencias

- Ver también: [fs-file-system.md](../03-apis-nativas/fs-file-system.md)
- Documentación: https://nodejs.org/en/docs/guides/backpressuring-in-streams/
