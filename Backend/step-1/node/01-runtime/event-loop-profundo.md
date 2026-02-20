# Event Loop en Node.js (Nivel Senior)

> **Nota:** Para fundamentos básicos del Event Loop, ver [event-loop.md](../../AsincroniaConcurrencia/event-loop.md)

## Diferencia: Event Loop en Node vs Browser

El Event Loop de Node.js **NO es el mismo** que el del navegador, aunque el concepto es similar.

### Browser Event Loop
- **Fases:** Solo tiene una cola principal + microtasks
- **Prioridad:** Rendering tiene alta prioridad
- **APIs:** setTimeout, requestAnimationFrame, fetch

### Node.js Event Loop
- **Fases:** 6 fases distintas con colas separadas
- **Prioridad:** I/O tiene máxima prioridad
- **APIs:** fs, http, crypto, timers, process.nextTick

---

## Call Stack

El **Call Stack** (pila de llamadas) es donde V8 ejecuta el código JavaScript de forma síncrona. Funciona como una pila LIFO (Last In, First Out).

```javascript
function third() {
  console.log('third');   // 3. Se ejecuta y sale del stack
}

function second() {
  third();                // 2. Entra al stack → llama a third()
}

function first() {
  second();               // 1. Entra al stack → llama a second()
}

first();

// Stack frames (de abajo a arriba):
// [ first() → second() → third() ]
// Cuando third() termina, sale del stack
// Cuando second() termina, sale del stack
// Cuando first() termina, el stack queda vacío
```

**Regla clave:** El Event Loop solo puede procesar callbacks cuando el Call Stack está **vacío**.

```javascript
setTimeout(() => console.log('timer'), 0);
console.log('sync');

// Aunque el timer sea 0ms, "sync" siempre imprime primero
// porque el callback espera a que el Call Stack esté vacío
```

---

## Macrotasks vs Microtasks

JavaScript tiene dos tipos de colas de tareas diferidas:

### Macrotasks (Task Queue)
Son tareas de "mayor peso" programadas para la siguiente iteración del Event Loop.

**APIs que generan macrotasks:**
- `setTimeout()`
- `setInterval()`
- `setImmediate()` (Node.js)
- Callbacks de I/O (`fs.readFile`, red, etc.)
- Callbacks de `close` events

### Microtasks (Microtask Queue)
Son tareas de "menor peso" que se ejecutan **antes** de que el Event Loop pase a la siguiente fase o procese el siguiente macrotask.

**APIs que generan microtasks:**
- `Promise.then()` / `Promise.catch()` / `Promise.finally()`
- `queueMicrotask()`
- `process.nextTick()` (técnicamente es una "nextTick queue" con prioridad aún mayor)

### Orden de Ejecución

```
┌─────────────────────────────────────────────────┐
│               Código Síncrono                   │
│               (Call Stack)                      │
└──────────────────────┬──────────────────────────┘
                       │ Stack vacío
                       ▼
┌─────────────────────────────────────────────────┐
│          process.nextTick queue                 │  ← Máxima prioridad
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│             Microtask Queue                     │  ← Promises
│         (se vacía completamente)                │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│             Macrotask Queue                     │  ← setTimeout, I/O
│   (procesa UN macrotask, luego vuelve arriba)   │
└─────────────────────────────────────────────────┘
```

```javascript
console.log('1: sync');

setTimeout(() => console.log('2: macrotask'), 0);

Promise.resolve()
  .then(() => console.log('3: microtask'));

queueMicrotask(() => console.log('4: microtask'));

console.log('5: sync');

// Salida:
// 1: sync
// 5: sync
// 3: microtask   ← microtasks antes que macrotasks
// 4: microtask
// 2: macrotask
```

**Punto clave:** Entre cada macrotask, se vacía **toda** la cola de microtasks.

```javascript
setTimeout(() => {
  console.log('macrotask 1');
  Promise.resolve().then(() => console.log('microtask después de macrotask 1'));
}, 0);

setTimeout(() => console.log('macrotask 2'), 0);

// Salida:
// macrotask 1
// microtask después de macrotask 1   ← se ejecuta ANTES de macrotask 2
// macrotask 2
```

---

## Las 6 Fases del Event Loop en Node

```
   ┌───────────────────────────┐
┌─>│           timers          │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │           check           │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │
   └───────────────────────────┘
```

### 1️⃣ **Timers** (setTimeout, setInterval)
Ejecuta callbacks cuyo tiempo de espera ha expirado.

```javascript
setTimeout(() => {
  console.log('timeout');
}, 0);
```

### 2️⃣ **Pending Callbacks**
Ejecuta callbacks de operaciones I/O diferidas (errores de red, etc.).

### 3️⃣ **Idle, Prepare**
Uso interno de Node.js (no afecta código de usuario).

### 4️⃣ **Poll** (la fase MÁS IMPORTANTE)
- Procesa eventos de I/O (archivos, red, etc.)
- Ejecuta callbacks de I/O
- Si hay timers listos, salta a **timers**
- Si no, espera por nuevos eventos

**Esta es la fase donde Node.js "espera" sin bloquear.**

### 5️⃣ **Check** (setImmediate)
Ejecuta callbacks de `setImmediate()`.

```javascript
setImmediate(() => {
  console.log('immediate');
});
```

### 6️⃣ **Close Callbacks**
Callbacks de cierre (ej: `socket.on('close', ...)`).

---

## Orden de Ejecución: setTimeout vs setImmediate vs process.nextTick

### Ejemplo práctico:

```javascript
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));

// ¿Qué se imprime primero?
```

### Respuesta:
```
nextTick
promise
timeout o immediate (depende del contexto)
```

### ¿Por qué?

```
1. process.nextTick tiene MÁXIMA prioridad
   → Se ejecuta ANTES de cualquier fase

2. Promises (microtasks)
   → Se ejecutan después de nextTick pero ANTES de las fases

3. setTimeout vs setImmediate
   → Depende de DÓNDE se ejecute el código
```

---

## setTimeout vs setImmediate: El Caso Confuso

### Caso 1: En el contexto principal (main)

```javascript
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

// Resultado: NO DETERMINISTA
// Puede ser: timeout → immediate
// O puede ser: immediate → timeout
```

**¿Por qué?** Depende de cuánto tarde el sistema en iniciar el event loop.

### Caso 2: Dentro de I/O (DETERMINISTA)

```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});

// Resultado SIEMPRE:
// immediate
// timeout
```

**¿Por qué?**
- `fs.readFile` se ejecuta en la fase **poll**
- `setImmediate` se ejecuta en la fase **check** (siguiente fase)
- `setTimeout` debe esperar a la fase **timers** (siguiente vuelta del loop)

---

## process.nextTick: El "Atajo" Peligroso

### ¿Qué es?

```javascript
process.nextTick(() => {
  console.log('nextTick');
});
```

`process.nextTick()` **NO es parte del Event Loop**.

Se ejecuta **INMEDIATAMENTE** después de la operación actual, antes de que el Event Loop continúe.

### ⚠️ Peligro: Recursión infinita

```javascript
function recurse() {
  process.nextTick(recurse);
}
recurse();

// ❌ Esto BLOQUEA el Event Loop
// No se ejecutará NADA más (ni I/O, ni timers)
```

### ✅ Uso correcto de nextTick

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
  constructor() {
    super();

    // ❌ MAL: El listener aún no está registrado
    // this.emit('event');

    // ✅ BIEN: Da tiempo a registrar el listener
    process.nextTick(() => {
      this.emit('event');
    });
  }
}

const emitter = new MyEmitter();
emitter.on('event', () => console.log('event fired'));
```

---

## Microtasks: Promises en Node

Las Promises usan la **microtask queue**, que tiene prioridad sobre el Event Loop pero menor que `process.nextTick`.

### Orden completo:

```javascript
console.log('1: sync');

setTimeout(() => console.log('2: timeout'), 0);

Promise.resolve().then(() => console.log('3: promise'));

process.nextTick(() => console.log('4: nextTick'));

console.log('5: sync');

// Resultado:
// 1: sync
// 5: sync
// 4: nextTick
// 3: promise
// 2: timeout
```

---

## Cuándo Usar Cada Uno

| API | Cuándo Usar | Prioridad |
|-----|-------------|-----------|
| **process.nextTick** | Emisión de eventos, inicialización | Máxima |
| **Promise** | Operaciones async modernas | Alta |
| **setImmediate** | Después de I/O | Media |
| **setTimeout** | Delay real o polling | Baja |

---

## Pregunta de Entrevista Senior

**P:** ¿Qué imprime este código?

```javascript
Promise.resolve().then(() => {
  console.log('promise1');
  process.nextTick(() => console.log('nextTick inside promise'));
});

process.nextTick(() => {
  console.log('nextTick1');
  Promise.resolve().then(() => console.log('promise inside nextTick'));
});

console.log('sync');
```

**R:**
```
sync
nextTick1
promise1
promise inside nextTick
nextTick inside promise
```

**Explicación:**
1. Código síncrono primero: `sync`
2. Cola de `nextTick`: `nextTick1` (y dentro encola `promise inside nextTick`)
3. Cola de microtasks: `promise1` (y dentro encola `nextTick inside promise`)
4. Vuelve a `nextTick`: `nextTick inside promise`
5. Vuelve a microtasks: `promise inside nextTick`

---

## Referencias

- Documentación oficial: https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
- Para Event Loop básico: [event-loop.md](../../AsincroniaConcurrencia/event-loop.md)
