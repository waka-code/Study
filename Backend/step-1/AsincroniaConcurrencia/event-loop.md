# Event Loop

El Event Loop es el mecanismo que permite a entornos como JavaScript manejar operaciones asíncronas y concurrencia, a pesar de tener un solo hilo de ejecución. Gestiona la cola de tareas y ejecuta callbacks cuando el hilo principal está libre.

## ¿Cómo funciona?
1. El código principal se ejecuta en el hilo principal.
2. Las operaciones asíncronas (timers, I/O, promesas) se delegan y sus callbacks se ponen en la cola de tareas.
3. El Event Loop revisa la cola y ejecuta los callbacks cuando el stack está vacío.

## Ejemplo visual
```js
console.log('Inicio');
setTimeout(() => console.log('Timeout'), 0);
Promise.resolve().then(() => console.log('Promise'));
console.log('Fin');
// Salida: Inicio, Fin, Promise, Timeout
```

## Fases del Event Loop (Node.js)
- timers
- pending callbacks
- idle, prepare
- poll
- check
- close callbacks

## Importancia
- Permite concurrencia sin múltiples hilos.
- Es clave para la asincronía en JavaScript y Node.js.

---

> Entender el Event Loop es fundamental para escribir código eficiente y evitar bloqueos en aplicaciones JavaScript.
