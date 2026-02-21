# Transacciones distribuidas

## Saga Pattern
- Divide una transacción grande en pasos locales, cada uno con su compensación en caso de fallo.
- Útil en microservicios donde no hay transacciones distribuidas nativas.
- Cada paso de la saga debe ser atómico y garantizar que, en caso de fallo, se pueda revertir o compensar el estado del sistema.
- Existen dos tipos principales de Sagas:
  - **Coreografía**: Cada servicio reacciona a eventos de otros servicios y ejecuta su propia transacción local.
  - **Orquestación**: Un coordinador central gestiona la ejecución de cada paso de la saga y las compensaciones necesarias.

### Ejemplo Saga Pattern
```js
// Pseudocódigo de saga con orquestación
async function procesarPedido(pedido) {
  try {
    await crearOrden(pedido);
    await procesarPago(pedido);
    await enviarNotificacion(pedido);
  } catch (error) {
    await compensarTransaccion(pedido);
  }
}

async function crearOrden(pedido) {
  // Lógica para crear la orden
  if (error) throw new Error('Error al crear la orden');
}

async function procesarPago(pedido) {
  // Lógica para procesar el pago
  if (error) throw new Error('Error al procesar el pago');
}

async function enviarNotificacion(pedido) {
  // Lógica para enviar notificación
  if (error) throw new Error('Error al enviar la notificación');
}
}

async function compensarTransaccion(pedido) {
  // Lógica para revertir los pasos realizados
  await revertirPago(pedido);
  await cancelarOrden(pedido);
}
```

## Eventual Consistency
- Los datos pueden no estar sincronizados inmediatamente, pero eventualmente todos los nodos tendrán el mismo estado.
- Común en sistemas distribuidos y NoSQL.
- Se basa en la idea de que los sistemas distribuidos pueden tolerar inconsistencias temporales mientras se garantice que eventualmente se alcanzará un estado consistente.
- Es importante diseñar sistemas que puedan manejar estados intermedios y resolver conflictos de datos.

### Ejemplo Eventual Consistency
```js
// Microservicio A actualiza y publica evento
pedido.estado = 'pagado';
publish('pedido_pagado', pedido);

// Microservicio B escucha y actualiza su copia
on('pedido_pagado', (pedido) => {
  if (validarPedido(pedido)) {
    actualizarInventario(pedido);
  } else {
    // Manejo de errores o inconsistencias
    registrarError(pedido);
  }
});
```

## Idempotencia
- Garantiza que una operación puede ejecutarse varias veces sin cambiar el resultado más allá de la primera vez.
- Esencial para manejar reintentos y evitar efectos secundarios no deseados en sistemas distribuidos.
- Se puede lograr utilizando identificadores únicos para cada operación y verificando si ya se ha procesado previamente.
- En sistemas distribuidos, la idempotencia es clave para garantizar la confiabilidad y consistencia de las operaciones.

### Ejemplo Idempotencia
```js
// Operación idempotente
const pagosProcesados = new Set();

function procesarPago(idTransaccion) {
  if (pagosProcesados.has(idTransaccion)) {
    console.log('El pago ya fue procesado.');
    return;
  }

  // Procesar pago
  realizarPago(idTransaccion);
  pagosProcesados.add(idTransaccion);
}

function realizarPago(idTransaccion) {
  // Lógica para procesar el pago
  console.log(`Procesando pago para la transacción ${idTransaccion}`);
}

// Ejemplo de uso
procesarPago('12345'); // Procesa el pago
procesarPago('12345'); // No hace nada, ya fue procesado
```
