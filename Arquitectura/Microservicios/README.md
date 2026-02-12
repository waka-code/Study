# Arquitectura de Microservicios

La arquitectura de microservicios consiste en dividir una aplicación en pequeños servicios independientes, cada uno responsable de una funcionalidad específica. Cada microservicio se comunica con otros mediante APIs (generalmente HTTP/REST o mensajería) y puede ser desplegado, escalado y actualizado de forma autónoma.

## ¿Cuándo usarla?
- Cuando se requiere escalabilidad y despliegue independiente.
- En sistemas grandes con equipos trabajando en diferentes dominios.
- Para facilitar la resiliencia y el aislamiento de fallos.
- Cuando se necesita flexibilidad tecnológica (cada servicio puede usar un stack diferente).

## Ventajas
- Escalabilidad granular.
- Despliegue y actualización independientes.
- Resiliencia ante fallos.
- Flexibilidad tecnológica.

## Ejemplo de estructura
```
Microservicios/
├── auth-service/
│   ├── app.ts
│   └── AuthService.md
├── order-service/
│   ├── app.ts
│   └── OrderService.md
├── product-service/
│   ├── app.ts
│   └── ProductService.md
└── README.md
```

## Ejemplo de definición de un microservicio (Node.js)
```js
// auth-service/app.ts
const express = require('express');
const app = express();
app.post('/login', (req, res) => {
  // lógica de autenticación
  res.send('OK');
});
app.listen(3001);
```

## Comunicación entre microservicios
- HTTP/REST
- Mensajería (RabbitMQ, Kafka)
- gRPC

---

> Usa microservicios cuando requieras escalabilidad, resiliencia y despliegue independiente, pero evalúa la complejidad de la gestión y comunicación entre servicios.