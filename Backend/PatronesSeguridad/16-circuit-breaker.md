# Circuit Breaker

El patrón Circuit Breaker es una técnica de resiliencia que protege tu aplicación de fallos repetidos en servicios externos (como APIs, bases de datos o microservicios). Cuando una operación falla varias veces consecutivas, el circuito se "abre" y bloquea nuevas llamadas durante un tiempo, permitiendo que el sistema se recupere y evitando sobrecargar el recurso fallido.

## ¿Cuándo se usa?
- Cuando dependes de servicios externos que pueden fallar o volverse lentos.
- Para evitar que tu aplicación se degrade por intentar operaciones fallidas repetidamente.
- Para mejorar la experiencia del usuario y la estabilidad del sistema.

## ¿Cómo funciona?
1. **Cerrado:** El circuito permite todas las llamadas.
2. **Abierto:** Tras varios fallos consecutivos, el circuito bloquea nuevas llamadas por un tiempo.
3. **Semiabierto:** Tras el tiempo de espera, permite algunas llamadas de prueba. Si funcionan, el circuito se cierra; si fallan, sigue abierto.

**Ejemplo Node.js:**
```js
const opossum = require('opossum');
const breaker = new opossum(miFuncion);
breaker.fire();
```
