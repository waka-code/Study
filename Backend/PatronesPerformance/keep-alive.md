# Keep-Alive

Keep-Alive es una característica de HTTP que permite reutilizar la misma conexión TCP para múltiples peticiones/respuestas entre cliente y servidor, en vez de abrir una nueva conexión para cada solicitud.

## ¿En qué ayuda?
- Reduce la latencia de nuevas peticiones.
- Disminuye el consumo de recursos en el servidor y el cliente.
- Mejora la eficiencia en aplicaciones con muchas solicitudes consecutivas.

## Ejemplo en Node.js
```js
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Connection': 'keep-alive' });
  res.end('Conexión persistente');
});
server.listen(3000);
```

## Ejemplo en fetch (frontend)
```js
fetch('/api/data', { headers: { Connection: 'keep-alive' } });
```

---

> Keep-Alive es fundamental para performance en APIs y servicios web con tráfico frecuente.
