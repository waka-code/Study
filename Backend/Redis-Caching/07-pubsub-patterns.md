# Pub/Sub Patterns

## Introducción
Redis ofrece un sistema de publicación y suscripción (Pub/Sub) que permite a las aplicaciones comunicarse en tiempo real mediante canales.

## Conceptos Clave
- **Publisher**: Publica mensajes en un canal.
- **Subscriber**: Escucha mensajes de un canal específico.
- **Canales**: Identificadores para agrupar mensajes relacionados.

## Ejemplo Básico
### Publicador
```javascript
const redis = require('redis');
const publisher = redis.createClient();

publisher.connect().then(() => {
    publisher.publish('notificaciones', '¡Hola, mundo!');
});
```

### Suscriptor
```javascript
const redis = require('redis');
const subscriber = redis.createClient();

subscriber.connect().then(() => {
    subscriber.subscribe('notificaciones', (mensaje) => {
        console.log('Mensaje recibido:', mensaje);
    });
});
```

## Casos de Uso
- **Notificaciones en tiempo real**: Actualizaciones en aplicaciones colaborativas.
- **Mensajería entre microservicios**: Comunicación eficiente y desacoplada.