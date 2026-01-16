# Transacciones distribuidas

## Saga Pattern
- Divide una transacción grande en pasos locales, cada uno con su compensación en caso de fallo.
- Útil en microservicios donde no hay transacciones distribuidas nativas.

### Ejemplo Saga Pattern
```js
// Pseudocódigo de saga
async function reservarViaje() {
  try {
    await reservarVuelo();
    await reservarHotel();
  } catch (e) {
    await cancelarVuelo();
    // No se reservó hotel, no hace falta cancelar
  }
}
```

## Eventual Consistency
- Los datos pueden no estar sincronizados inmediatamente, pero eventualmente todos los nodos tendrán el mismo estado.
- Común en sistemas distribuidos y NoSQL.

### Ejemplo Eventual Consistency
```js
// Microservicio A actualiza y publica evento
pedido.estado = 'pagado';
publish('pedido_pagado', pedido);
// Microservicio B escucha y actualiza su copia
on('pedido_pagado', (pedido) => actualizarInventario(pedido));
```

## Idempotencia
- Garantiza que una operación puede ejecutarse varias veces sin cambiar el resultado más allá de la primera vez.
- Esencial para manejar reintentos y evitar efectos secundarios no deseados en sistemas distribuidos.

### Ejemplo Idempotencia
```js
// Operación idempotente
function procesarPago(idTransaccion) {
  if (pagosProcesados.has(idTransaccion)) return;
  // Procesar pago
  pagosProcesados.add(idTransaccion);
}
```
