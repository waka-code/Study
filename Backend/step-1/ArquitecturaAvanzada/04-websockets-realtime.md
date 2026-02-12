# WebSockets y Realtime (Socket.io)

Permiten comunicación bidireccional en tiempo real entre cliente y servidor. Usados para chats, notificaciones, dashboards, etc.

**Ejemplo básico con Socket.io:**
```js
const io = require('socket.io')(server);
io.on('connection', (socket) => {
  socket.emit('mensaje', '¡Conectado!');
  socket.on('evento', (data) => {
    // lógica
  });
});
```
