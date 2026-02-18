# Estructura y Buenas Prácticas para Microservicios

Este documento describe la estructura recomendada para una arquitectura de microservicios, incluyendo un API Gateway y los componentes esenciales que debe tener cada microservicio.

## Estructura de Carpetas Sugerida
```
Microservicios/
├── api-gateway/
│   ├── app.ts
│   └── ApiGateway.md
├── auth-service/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── config/
│   ├── tests/
│   ├── docs/
│   ├── app.ts
│   └── AuthService.md
├── order-service/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── config/
│   ├── tests/
│   ├── docs/
│   ├── app.ts
│   └── OrderService.md
├── product-service/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── config/
│   ├── tests/
│   ├── docs/
│   ├── app.ts
│   └── ProductService.md
└── README.md
```

### Descripción de carpetas clave
- **api-gateway/**: Punto de entrada único, enruta y orquesta peticiones a los microservicios.
- **controllers/**: Gestionan las rutas y lógica de entrada/salida HTTP.
- **services/**: Lógica de negocio principal.
- **repositories/**: Acceso a datos o integración con otras fuentes.
- **config/**: Configuración del microservicio (variables, conexiones, etc).
- **tests/**: Pruebas unitarias y de integración.
- **docs/**: Documentación, OpenAPI/Swagger, etc.

## Ejemplo de API Gateway (Node.js + Express)
```js
// api-gateway/app.ts
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Proxy para autenticación
app.use('/auth', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
// Proxy para órdenes
app.use('/order', createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true }));
// Proxy para productos
app.use('/product', createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true }));

app.listen(3000, () => console.log('API Gateway corriendo en puerto 3000'));
```

## Ejemplo de microservicio modular (Node.js + Express)
```js
// auth-service/controllers/authController.js
exports.login = (req, res) => {
  // lógica de autenticación
  res.send('OK');
};

// auth-service/app.ts
const express = require('express');
const { login } = require('./controllers/authController');
const app = express();
app.post('/login', login);
app.listen(3001);
```

---

> Además de la estructura, considera implementar:
> - Seguridad (autenticación, autorización, validación de entrada)
> - Monitoreo y logging
> - Orquestación y despliegue (Docker, Kubernetes)
> - Documentación OpenAPI/Swagger
> - Pruebas automatizadas
