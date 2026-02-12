# Arquitectura Basada en Componentes

La arquitectura basada en componentes divide el sistema en partes independientes y reutilizables llamadas "componentes". Cada componente encapsula lógica, datos y presentación, y puede ser desarrollado, probado y desplegado de forma aislada.

## ¿Cuándo usarla?
- Cuando se requiere modularidad y reutilización.
- En aplicaciones grandes donde los equipos trabajan en diferentes partes.
- Para facilitar el mantenimiento y escalabilidad.
- En sistemas donde se pueden componer funcionalidades a partir de componentes.

## Ventajas
- Reutilización de código.
- Independencia y aislamiento.
- Facilita pruebas y despliegue.
- Escalabilidad y mantenimiento.

## Ejemplo (React)
```js
// Componente Button
function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}

// Componente App
function App() {
  return <Button label="Click" onClick={() => alert('Hola!')} />;
}
```

## Ejemplo (Backend Node.js)
```js
// Componente de autenticación
module.exports = function auth(req, res, next) {
  // lógica de autenticación
  next();
};

// Componente de logging
module.exports = function logger(req, res, next) {
  // lógica de logging
  next();
};

// Uso en Express
const auth = require('./auth');
const logger = require('./logger');
app.use(auth);
app.use(logger);
```

## Estructura típica
```
Componentes/
├── Button.js
├── Auth.js
├── Logger.js
└── ...
```

---

> Usa arquitectura basada en componentes cuando busques modularidad, escalabilidad y facilidad de mantenimiento en tu sistema.