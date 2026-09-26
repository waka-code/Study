# Sesión 13 — RxJS

> **Objetivo**: entender la programación reactiva que usa Angular por dentro. Esta es **la sesión que separa a un Junior de un Semi-Senior**. Cubre: qué es un Observable, la diferencia con Promises, Subjects, cold vs hot, y — lo más importante — los **operadores** y **cuándo usar cada uno** (especialmente los cuatro "map" de aplanamiento).

> Requisito: [Sesión 12](sesion-12-http.md). Es larga; estúdiala en dos pasadas.

---

## 0. ¿Qué es RxJS y por qué?

**RxJS** = programación reactiva con **Observables**: flujos de datos asíncronos que puedes **transformar, combinar y cancelar** con operadores. Angular lo usa en todo lo asíncrono: HTTP, formularios (`valueChanges`), router events, `EventEmitter`.

Idea central: en vez de "pide un dato y espera" (imperativo), declaras "cuando lleguen datos, transfórmalos así" (reactivo/declarativo).

---

## 1. Observable, Observer, Subscription

```typescript
import { Observable } from 'rxjs';

// un Observable: define QUÉ emite (pero no emite nada hasta que alguien se suscribe)
const numeros$ = new Observable<number>(subscriber => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.next(3);
  subscriber.complete();
});

// Observer: los tres callbacks que reaccionan
const subscription = numeros$.subscribe({
  next:  v => console.log(v),        // por cada valor emitido
  error: e => console.error(e),      // si hay error (termina el flujo)
  complete: () => console.log('fin'),// cuando termina (opcional)
});

// Subscription: permite CANCELAR
subscription.unsubscribe();
```

| Pieza | Qué es |
|---|---|
| **Observable** | La fuente/flujo. Define qué se emitirá. **Lazy** (no hace nada solo) |
| **Observer** | Los callbacks `next/error/complete` que consumen |
| **Subscription** | El "contrato" activo; permite `unsubscribe()` |

> Convención: las variables Observable terminan en `$` (`usuario$`, `productos$`).

### 1.1 Ciclo de un Observable
Emite 0..N valores (`next`), y termina de **una** de dos formas: `complete` (éxito) o `error`. Tras terminar, no emite más. Un `error` **mata** el flujo.

---

## 2. Observable vs Promise 🔑

| | **Promise** | **Observable** |
|---|---|---|
| Valores | **Uno** solo | **Muchos** (stream) |
| Ejecución | **Eager** (corre al crearse) | **Lazy** (corre al suscribirse) |
| Cancelable | ❌ No | ✅ Sí (`unsubscribe`) |
| Operadores | No (solo `.then`) | Sí (map, filter, retry…) |
| Reintentable | No | Sí (`retry`) |
| Perezoso/reejecutable | Un resultado fijo | Se re-ejecuta por cada suscripción (si es cold) |

Por eso `HttpClient` usa Observables (Sesión 12): cancelables, reintentables, componibles.

---

## 3. Crear Observables (creation functions)

```typescript
import { of, from, interval, timer, fromEvent, EMPTY, throwError } from 'rxjs';

of(1, 2, 3);                      // emite 1,2,3 y completa
from([1, 2, 3]);                  // desde array/promise/iterable
from(fetch('/api'));              // desde una Promise
interval(1000);                   // 0,1,2,3… cada 1s (infinito)
timer(2000);                      // emite una vez tras 2s
fromEvent(boton, 'click');        // desde eventos del DOM
EMPTY;                            // completa sin emitir nada
throwError(() => new Error('x')); // emite un error
```

---

## 4. Subjects 🔑

Un **Subject** es un Observable **y** un Observer a la vez: puedes **emitir** valores con `.next()` **y** suscribirte. Es la base de la comunicación entre componentes (Sesión 8) y del state management manual.

```typescript
import { Subject } from 'rxjs';

const sub = new Subject<number>();
sub.subscribe(v => console.log('A:', v));
sub.next(1);   // A: 1
sub.subscribe(v => console.log('B:', v));   // B solo verá lo que venga DESPUÉS
sub.next(2);   // A: 2, B: 2
```

### 4.1 Los cuatro tipos de Subject

| Tipo | Comportamiento |
|---|---|
| **`Subject`** | No guarda valores. Los suscriptores solo reciben emisiones **posteriores** |
| **`BehaviorSubject`** | Guarda el **último** valor; requiere valor inicial; nuevos suscriptores lo reciben al instante |
| **`ReplaySubject`** | Reemite los **últimos N** valores a nuevos suscriptores |
| **`AsyncSubject`** | Solo emite el **último** valor, y **solo al completar** |

```typescript
const bs = new BehaviorSubject<number>(0);  // valor inicial obligatorio
bs.subscribe(v => console.log(v));          // 0 (inmediato)
bs.next(5);                                 // 5
bs.value;                                   // 5 (lectura síncrona)
```

> 🔑 **`BehaviorSubject`** es el más usado en Angular: perfecto para estado compartido (siempre tiene un valor "actual"). Ver el patrón del carrito en Sesión 8. Regla: *"¿necesito un valor inicial y el último estado? → BehaviorSubject"*.

---

## 5. Cold vs Hot Observables

- **Cold**: cada suscripción crea una **ejecución nueva e independiente**. Los productores viven "dentro" del Observable. Ej: `http.get()` → **cada** `subscribe` hace **otra** petición.
- **Hot**: la ejecución es **compartida**; el productor vive "fuera". Los suscriptores comparten el mismo flujo. Ej: `Subject`, `fromEvent`.

```typescript
// COLD: dos peticiones HTTP distintas
const req$ = this.http.get('/api');
req$.subscribe();   // petición 1
req$.subscribe();   // petición 2  ⚠️

// convertir a HOT/compartido con shareReplay → una sola petición
const shared$ = this.http.get('/api').pipe(shareReplay(1));
shared$.subscribe();  // petición 1
shared$.subscribe();  // reutiliza el resultado ✅
```
> Consecuencia práctica: repetir `obs$ | async` en el template hace múltiples peticiones (visto en Sesión 6) porque el HTTP es cold. `shareReplay(1)` lo soluciona.

---

## 6. Operadores y el `pipe()`

Los operadores transforman flujos. Se encadenan en `.pipe()` y son **funciones puras** (no mutan, devuelven un Observable nuevo).

```typescript
source$.pipe(
  operador1(),
  operador2(),
).subscribe();
```

### 6.1 Transformación
```typescript
map(x => x * 2)                    // transforma cada valor
tap(x => console.log(x))           // side-effect (log/debug) sin alterar el flujo
scan((acc, x) => acc + x, 0)       // como reduce pero emite cada acumulado
```

### 6.2 Filtrado
```typescript
filter(x => x > 5)                 // deja pasar los que cumplen
take(3)                            // solo los primeros 3, luego completa
first()  / last()                  // el primero / el último
takeWhile(x => x < 10)             // mientras se cumpla
takeUntil(destroy$)                // hasta que otro Observable emita (unsubscribe pattern)
distinctUntilChanged()             // ignora valores repetidos consecutivos
debounceTime(300)                  // espera 300ms de silencio antes de emitir
throttleTime(300)                  // máximo un valor cada 300ms
skip(2)                            // ignora los primeros 2
```

### 6.3 Utilidad
```typescript
startWith('inicial')               // emite un valor inicial primero
finalize(() => ...)                // se ejecuta al completar o error (limpieza)
catchError(err => of(fallback))    // maneja errores (Sesión 12)
retry(3)                           // reintenta (Sesión 12)
```

---

## 7. Operadores de aplanamiento (map de orden superior) 🔑🔑

**El tema estrella de RxJS en entrevistas.** Cuando un valor de un Observable dispara **otro** Observable (ej. un click que lanza un HTTP), necesitas "aplanar" el Observable-de-Observables. Hay cuatro, y la diferencia es **cómo manejan lo que llega mientras el anterior no ha terminado**.

| Operador | Estrategia | Úsalo para… |
|---|---|---|
| **`switchMap`** | **Cancela** el anterior y cambia al nuevo | Búsquedas/autocomplete, lo último manda |
| **`mergeMap`** | **Todos en paralelo** (sin orden) | Peticiones independientes, máxima concurrencia |
| **`concatMap`** | **En cola**, uno tras otro (orden garantizado) | Cuando el orden importa (guardar secuencial) |
| **`exhaustMap`** | **Ignora** nuevos mientras uno corre | Evitar dobles clicks (login, submit) |

### 7.1 `switchMap` — cancela el anterior
```typescript
// buscador: cada tecla cancela la búsqueda anterior → solo importa la última
this.busqueda.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(termino => this.api.buscar(termino)),   // cancela la petición previa
).subscribe(resultados => this.resultados = resultados);
```
> Sin `switchMap`, si escribes rápido, llegan respuestas viejas después de nuevas (race condition). `switchMap` cancela la anterior. **Es el default para búsquedas.**

### 7.2 `mergeMap` (alias `flatMap`) — todo en paralelo
```typescript
// guardar varios ítems a la vez, sin importar el orden
from(ids).pipe(
  mergeMap(id => this.api.guardar(id)),   // todas las peticiones a la vez
).subscribe();
```

### 7.3 `concatMap` — en orden, uno tras otro
```typescript
// operaciones que DEBEN ejecutarse en secuencia
from(operaciones).pipe(
  concatMap(op => this.api.ejecutar(op)),   // espera a que termine cada una
).subscribe();
```

### 7.4 `exhaustMap` — ignora mientras trabaja
```typescript
// botón de login: ignora clicks extra mientras la petición está en curso
this.clickLogin$.pipe(
  exhaustMap(() => this.auth.login(credenciales)),   // evita doble submit
).subscribe();
```

> Mnemotecnia: **switch**=el último gana · **merge**=todos a la vez · **concat**=en fila · **exhaust**=el primero manda hasta acabar.

---

## 8. Operadores de combinación

Combinan **varios** Observables:

| Operador | Qué hace |
|---|---|
| **`forkJoin`** | Espera a que **todos completen** y emite el **último** de cada uno (como `Promise.all`) |
| **`combineLatest`** | Emite cuando **cualquiera** emite, combinando los **últimos** valores de todos |
| **`zip`** | Empareja por índice: el 1º con el 1º, el 2º con el 2º… |
| **`merge`** | Fusiona emisiones de varios en un solo flujo (según llegan) |
| **`concat`** | Uno tras otro: emite todo el primero, luego el segundo |
| **`withLatestFrom`** | Como combineLatest pero "disparado" por el flujo principal |

```typescript
// forkJoin: varias peticiones, actuar cuando TODAS terminen
forkJoin({
  usuario: this.http.get<Usuario>('/api/usuario/1'),
  roles:   this.http.get<Rol[]>('/api/roles'),
}).subscribe(({ usuario, roles }) => { /* ambos listos */ });

// combineLatest: reaccionar a la combinación de filtros
combineLatest([this.categoria$, this.orden$]).pipe(
  switchMap(([cat, orden]) => this.api.buscar(cat, orden)),
).subscribe();
```

> `forkJoin` vs `combineLatest`: `forkJoin` emite **una vez al final** (necesita que completen — cuidado con Subjects infinitos); `combineLatest` emite **cada vez** que uno cambia.

---

## 9. `shareReplay` y multicasting

`shareReplay(n)` comparte una ejecución entre suscriptores y "reproduce" los últimos `n` valores para los que llegan tarde. Evita peticiones HTTP duplicadas (§5):
```typescript
config$ = this.http.get('/api/config').pipe(shareReplay(1));
// todos los que se suscriban comparten UNA petición
```

---

## 10. Memory leaks y cómo desuscribirse 🔑

Una suscripción que no se cierra sigue viva tras destruir el componente → **memory leak** (fuente #1 de fugas en Angular). Formas de evitarlo:

### 10.1 Pipe `async` (preferido)
Se desuscribe solo (Sesión 6). **Siempre que puedas, usa `async` y no `.subscribe()`.**
```typescript
productos$ = this.service.listar();   // en el template: | async
```

### 10.2 `takeUntilDestroyed` (Angular 16+)
```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

constructor() {
  this.service.datos$.pipe(
    takeUntilDestroyed(),          // se desuscribe al destruir el componente
  ).subscribe();
}
```

### 10.3 Patrón `takeUntil` clásico (pre-16)
```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.datos$.pipe(takeUntil(this.destroy$)).subscribe();
}
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 10.4 Guardar y desuscribir manualmente
```typescript
private sub = new Subscription();
ngOnInit() { this.sub.add(this.a$.subscribe()); this.sub.add(this.b$.subscribe()); }
ngOnDestroy() { this.sub.unsubscribe(); }
```

> No necesitas desuscribir de: `HttpClient` (completa solo), pipe `async`, o Observables finitos con `take(1)`/`first()`. Sí de: `interval`, `fromEvent`, Subjects, `valueChanges` — que son infinitos.

---

## 11. Preguntas de entrevista

1. ¿Qué es un Observable y en qué se diferencia de una Promise?
2. ¿Qué significa que un Observable es "lazy"?
3. ¿Qué es un Subject y cuáles son sus 4 tipos?
4. ¿Cuándo usas `BehaviorSubject`?
5. ¿Cold vs hot? Da un ejemplo de cada uno.
6. Explica `switchMap` vs `mergeMap` vs `concatMap` vs `exhaustMap`. ¿Cuál para un buscador? ¿Cuál para un login?
7. ¿`forkJoin` vs `combineLatest`?
8. ¿Cómo evitas memory leaks con subscripciones?
9. ¿Qué hace `shareReplay` y qué problema resuelve?
10. ¿Qué hacen `debounceTime` y `distinctUntilChanged` juntos?

<details>
<summary>Respuestas resumidas</summary>

1. Observable = flujo de 0..N valores, lazy, cancelable, componible; Promise = un valor, eager, no cancelable.
2. No ejecuta nada hasta que alguien se suscribe.
3. Observable+Observer a la vez (emites y te suscribes). Tipos: Subject, BehaviorSubject, ReplaySubject, AsyncSubject.
4. Cuando necesitas un valor inicial y que nuevos suscriptores reciban el último estado (estado compartido).
5. Cold: cada subscribe re-ejecuta (`http.get`). Hot: ejecución compartida (`Subject`, `fromEvent`).
6. switchMap cancela el anterior (buscador); mergeMap paralelo; concatMap en cola ordenada; exhaustMap ignora mientras corre (login).
7. forkJoin emite una vez cuando todos completan; combineLatest emite cada vez que uno cambia con los últimos valores.
8. Pipe `async`, `takeUntilDestroyed` (v16+), patrón `takeUntil(destroy$)`, o `Subscription.unsubscribe()`.
9. Comparte una ejecución y reproduce los últimos N valores; evita peticiones HTTP duplicadas.
10. debounceTime espera silencio antes de emitir; distinctUntilChanged ignora repetidos → buscador eficiente.

</details>

---

## ✅ Checklist para pasar a la Sesión 14

- [ ] Explico Observable vs Promise y qué es "lazy".
- [ ] Conozco Observer, Subscription y la convención `$`.
- [ ] Domino los 4 Subjects y cuándo usar `BehaviorSubject`.
- [ ] Entiendo cold vs hot y por qué HTTP se duplica.
- [ ] **Distingo los 4 operadores de aplanamiento y cuándo cada uno.**
- [ ] Conozco `forkJoin`/`combineLatest` y operadores de filtrado (`debounceTime`, `takeUntil`…).
- [ ] Sé 3 formas de evitar memory leaks.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 14 — Change Detection** (Default vs OnPush, `ChangeDetectorRef`, Zone.js, y el enlace directo con todo lo de inmutabilidad y `async` que hemos venido acumulando).
