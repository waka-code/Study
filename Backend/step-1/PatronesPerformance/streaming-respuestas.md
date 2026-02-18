# Streaming de Respuestas

El streaming de respuestas permite enviar datos al cliente en fragmentos a medida que están disponibles, en vez de esperar a que toda la respuesta esté lista. Es útil para grandes volúmenes de datos, archivos, o aplicaciones en tiempo real.

## ¿En qué ayuda?
- Reduce la latencia percibida.
- Permite procesar datos mientras se reciben.
- Mejora la experiencia en descargas y APIs de datos grandes.

## Ejemplo en Node.js
```js
const fs = require('fs');
const express = require('express');
const app = express();

app.get('/archivo', (req, res) => {
  const stream = fs.createReadStream('archivo-grande.txt');
  stream.pipe(res);
});

app.listen(3000);
```

## Ejemplo en frontend (fetch)
```js
const response = await fetch('/api/stream');
const reader = response.body.getReader();
let result = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  result += new TextDecoder().decode(value);
}
console.log(result);
```

---

> El streaming es clave para performance en APIs, descargas y aplicaciones en tiempo real.
