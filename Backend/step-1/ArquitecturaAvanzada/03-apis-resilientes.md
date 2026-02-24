# APIs resilientes: Retry, Circuit Breaker

## Retry
Reintenta automáticamente una operación fallida (por ejemplo, llamada HTTP) para mejorar la robustez.

**Ejemplo Node.js:**
```js
const axios = require('axios-retry');
axiosRetry(axios, { retries: 3 });
```

## Circuit Breaker
Evita que una aplicación siga intentando operaciones que fallan repetidamente, permitiendo la recuperación. Este patrón es especialmente útil en sistemas distribuidos donde las fallas en un servicio pueden propagarse y afectar a otros servicios, causando un efecto dominó.

### ¿Cómo funciona?
El patrón Circuit Breaker actúa como un interruptor que puede estar en tres estados:

1. **Cerrado (Closed)**: Las solicitudes se envían normalmente al servicio.
2. **Abierto (Open)**: Si el servicio falla repetidamente, el circuito se abre y las solicitudes futuras fallan inmediatamente sin intentar contactar al servicio.
3. **Semiabierto (Half-Open)**: Después de un tiempo de espera, el circuito permite que algunas solicitudes pasen para probar si el servicio se ha recuperado. Si las solicitudes tienen éxito, el circuito vuelve al estado cerrado; de lo contrario, permanece abierto.

### Beneficios
- **Prevención de fallos en cascada**: Evita que un servicio defectuoso sobrecargue el sistema.
- **Mejora la resiliencia**: Permite que el sistema se recupere más rápidamente al evitar intentos innecesarios.
- **Monitoreo de la salud del sistema**: Proporciona métricas sobre el estado de los servicios.

### Implementación
En Node.js, puedes usar bibliotecas como `opossum` para implementar el patrón Circuit Breaker:

**Ejemplo con opossum:**
```js
const opossum = require('opossum');

// Función que queremos proteger
const miFuncion = () => {
  return new Promise((resolve, reject) => {
    // Simula una operación que puede fallar
    if (Math.random() > 0.5) {
      resolve('Éxito');
    } else {
      reject('Fallo');
    }
  });
};

// Configuración del Circuit Breaker
const opciones = {
  timeout: 3000, // Tiempo máximo para que una operación se complete
  errorThresholdPercentage: 50, // Porcentaje de fallos para abrir el circuito
  resetTimeout: 10000 // Tiempo antes de probar si el servicio se ha recuperado
};

const breaker = new opossum(miFuncion, opciones);

breaker.on('open', () => console.log('Circuito abierto: demasiados fallos.'));
breaker.on('halfOpen', () => console.log('Circuito semiabierto: probando el servicio.'));
breaker.on('close', () => console.log('Circuito cerrado: el servicio se ha recuperado.'));

// Ejecutar la función protegida
breaker.fire()
  .then(console.log)
  .catch(console.error);
```

### Casos de Uso
- **Servicios externos inestables**: Si dependes de APIs de terceros que pueden fallar o ser lentas.
- **Sistemas distribuidos**: Para evitar que un servicio defectuoso afecte a otros servicios.
- **Control de recursos**: Para evitar que un servicio consuma recursos innecesarios al intentar operaciones fallidas.

El patrón Circuit Breaker es una herramienta poderosa para construir sistemas más robustos y resilientes frente a fallos en servicios externos o internos.
