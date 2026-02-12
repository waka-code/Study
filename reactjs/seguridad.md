# Seguridad en React

## XSS y validación de props
Evita inyección de código y valida datos recibidos.

## Sanitización
Uso de librerías como DOMPurify para limpiar HTML.

## Ejemplo
```js
import DOMPurify from 'dompurify';
const safeHtml = DOMPurify.sanitize(userInput);
```
