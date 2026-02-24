# WebSockets y Realtime (Socket.io)

Los WebSockets permiten una comunicación bidireccional en tiempo real entre el cliente y el servidor. Son ampliamente utilizados en aplicaciones que requieren actualizaciones instantáneas, como chats, notificaciones, juegos en línea, dashboards en tiempo real, entre otros.

## ¿Cómo funcionan los WebSockets?
- **Conexión persistente**: A diferencia de HTTP, que sigue un modelo de solicitud-respuesta, los WebSockets establecen una conexión persistente entre el cliente y el servidor.
- **Bidireccionalidad**: Permiten que tanto el cliente como el servidor envíen mensajes en cualquier momento, sin necesidad de que el cliente inicie la comunicación.
- **Bajo overhead**: Una vez establecida la conexión, los WebSockets tienen un menor overhead en comparación con las solicitudes HTTP repetitivas.

## Ejemplo básico con Socket.io
[Socket.io](https://socket.io/) es una biblioteca de JavaScript que facilita la implementación de WebSockets y proporciona características adicionales como reconexión automática y manejo de eventos.

**Ejemplo básico con Socket.io:**
```js
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log('Cliente conectado');

  // Enviar un mensaje al cliente
  socket.emit('mensaje', '¡Conectado!');

  // Escuchar eventos del cliente
  socket.on('evento', (data) => {
    console.log('Evento recibido:', data);
    // lógica
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});
```

## Casos de Uso de WebSockets
1. **Chats en tiempo real**: Permiten enviar y recibir mensajes instantáneamente.
2. **Notificaciones en vivo**: Actualizaciones en tiempo real para aplicaciones como redes sociales o sistemas de monitoreo.
3. **Juegos multijugador**: Sincronización de eventos entre jugadores en tiempo real.
4. **Dashboards**: Actualización en tiempo real de métricas o datos.

---

# gRPC

gRPC (gRPC Remote Procedure Call) es un framework de comunicación de alto rendimiento desarrollado por Google. Es ideal para sistemas distribuidos y microservicios.

## ¿Cómo funciona gRPC?
- **Protocol Buffers (Protobuf)**: gRPC utiliza Protobuf como su lenguaje de serialización, lo que lo hace más eficiente que JSON o XML.
- **Comunicación basada en contratos**: Los servicios se definen en un archivo `.proto`, que describe las operaciones disponibles y los tipos de datos.
- **Soporte para múltiples lenguajes**: gRPC es compatible con varios lenguajes de programación, lo que lo hace ideal para entornos heterogéneos.
- **Soporte para streaming**: gRPC permite tanto streaming unidireccional como bidireccional.

## Ejemplo básico con gRPC
**Definición del servicio en un archivo `.proto`:**
```proto
syntax = "proto3";

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply);
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

**Implementación del servidor en Node.js:**
```js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Cargar el archivo .proto
const packageDefinition = protoLoader.loadSync('greeter.proto', {});
const greeterProto = grpc.loadPackageDefinition(packageDefinition).Greeter;

// Implementar el servicio
const server = new grpc.Server();
server.addService(greeterProto.service, {
  SayHello: (call, callback) => {
    const reply = { message: `Hola, ${call.request.name}!` };
    callback(null, reply);
  },
});

// Iniciar el servidor
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('Servidor gRPC ejecutándose en el puerto 50051');
  server.start();
});
```

**Cliente gRPC en Node.js:**
```js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Cargar el archivo .proto
const packageDefinition = protoLoader.loadSync('greeter.proto', {});
const greeterProto = grpc.loadPackageDefinition(packageDefinition).Greeter;

const client = new greeterProto('localhost:50051', grpc.credentials.createInsecure());

// Llamar al servicio
client.SayHello({ name: 'Mundo' }, (err, response) => {
  if (err) console.error(err);
  else console.log(response.message);
});
```

## Casos de Uso de gRPC
1. **Comunicación entre microservicios**: Ideal para sistemas distribuidos que requieren alta eficiencia.
2. **Streaming de datos**: Para aplicaciones que necesitan enviar y recibir datos en tiempo real.
3. **Interoperabilidad entre lenguajes**: Permite que servicios escritos en diferentes lenguajes se comuniquen fácilmente.

---

Ambas tecnologías, WebSockets y gRPC, son herramientas poderosas para construir aplicaciones modernas y escalables que requieren comunicación en tiempo real. La elección entre ellas dependerá de los requisitos específicos de tu proyecto.
