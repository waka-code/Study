# Redis para Rate Limiting

## Introducción
El rate limiting es una técnica para controlar la cantidad de solicitudes que un usuario o cliente puede realizar en un período de tiempo. Redis es ideal para implementar esta funcionalidad debido a su velocidad y soporte para operaciones atómicas.

## Ejemplo Básico
```javascript
const redis = require('redis');
const client = redis.createClient();

client.connect().then(() => {
    const userId = 'user:123';
    const limit = 10; // Máximo de solicitudes permitidas
    const ventana = 60; // Ventana de tiempo en segundos

    async function verificarRateLimit() {
        const solicitudes = await client.incr(userId);

        if (solicitudes === 1) {
            // Establecer tiempo de expiración en la primera solicitud
            await client.expire(userId, ventana);
        }

        if (solicitudes > limit) {
            console.log('Rate limit excedido');
            return false;
        }

        console.log('Solicitud permitida');
        return true;
    }

    verificarRateLimit();
});
```

## Casos de Uso
- **Protección contra abuso**: Limitar el número de solicitudes a una API.
- **Control de recursos**: Evitar que un usuario consuma demasiados recursos en un corto período de tiempo.