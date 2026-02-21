# Implementación de Redis en Node.js

## Introducción
Redis es ampliamente utilizado en aplicaciones Node.js para mejorar el rendimiento mediante el almacenamiento en caché, la gestión de sesiones y otras funcionalidades avanzadas como Pub/Sub y rate limiting.

## Instalación
Para usar Redis en Node.js, primero instala el cliente oficial de Redis:

```bash
npm install redis
```

## Ejemplo Básico
```javascript
const redis = require('redis');
const client = redis.createClient();

client.on('error', (err) => console.error('Error de Redis:', err));

client.connect().then(() => {
    console.log('Conectado a Redis');

    // Establecer un valor
    client.set('clave', 'valor');

    // Obtener un valor
    client.get('clave', (err, valor) => {
        if (err) throw err;
        console.log('Valor:', valor);
    });
});
```

## Uso Avanzado
- **Almacenamiento de sesiones**: Usar bibliotecas como `connect-redis` para gestionar sesiones de usuario.
- **Rate Limiting**: Implementar límites de solicitudes por usuario con comandos como `INCR` y `EXPIRE`.
- **Pub/Sub**: Usar Redis para notificaciones en tiempo real entre servicios.