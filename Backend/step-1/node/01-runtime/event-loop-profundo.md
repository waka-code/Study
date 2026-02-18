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
