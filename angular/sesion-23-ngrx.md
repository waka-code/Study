# Sesión 23 — NgRx

> **Objetivo**: entender el state management con NgRx (implementación de Redux para Angular): el flujo unidireccional, y sus piezas — Store, Actions, Reducers, Selectors, Effects, Entity, Router Store y DevTools. También cuándo usarlo (y cuándo no) y las alternativas modernas basadas en Signals.

> Requisito: [Sesión 13](sesion-13-rxjs.md) (RxJS) y [Sesión 22](sesion-22-arquitectura.md) (state management panorama).

---

## 0. El problema y la idea de Redux

En apps grandes, el estado compartido (usuario, carrito, filtros, caché) se vuelve difícil de rastrear: muchos componentes lo leen y lo modifican desde muchos sitios → bugs impredecibles.

**Redux** (y NgRx) impone un **flujo unidireccional** con una **única fuente de verdad** (el Store) y cambios **predecibles** mediante funciones puras.

```
Componente
   │ dispatch(Action)          ┌─────────────┐
   ▼                           │   EFFECTS   │ (side-effects: HTTP)
 [ACTION] ──────────────────▶  └──────┬──────┘
   │                                  │ dispatch(Action éxito)
   ▼                                  ▼
[REDUCER] (estado viejo + action → estado nuevo, PURO)
   │
   ▼
 [STORE] (single source of truth, inmutable)
   │ select(Selector)
   ▼
Componente (se re-renderiza con | async)
```

Principios: **single source of truth**, estado **inmutable/read-only**, cambios solo vía **acciones**, reducers **puros**.

---

## 1. Actions — "qué pasó"

Una **acción** describe un evento (no cómo se maneja). Tiene un `type` único y opcionalmente un payload.

```typescript
import { createAction, props } from '@ngrx/store';

export const cargarProductos = createAction('[Productos] Cargar');
export const cargarProductosOk = createAction(
  '[Productos API] Cargar Éxito',
  props<{ productos: Producto[] }>(),
);
export const cargarProductosError = createAction(
  '[Productos API] Cargar Error',
  props<{ error: string }>(),
);
```
> Convención del `type`: `[Origen] Evento`. El origen ayuda a rastrear de dónde viene (componente, API…). Las acciones describen **eventos**, no comandos ("Cargar Éxito", no "Set Productos").

---

## 2. Reducers — cómo cambia el estado

Una **función pura** que recibe el estado actual y una acción, y devuelve el **nuevo** estado (sin mutar).

```typescript
import { createReducer, on } from '@ngrx/store';

export interface ProductosState {
  items: Producto[];
  cargando: boolean;
  error: string | null;
}

const initialState: ProductosState = { items: [], cargando: false, error: null };

export const productosReducer = createReducer(
  initialState,
  on(cargarProductos, state => ({ ...state, cargando: true })),
  on(cargarProductosOk, (state, { productos }) => ({
    ...state, items: productos, cargando: false,      // nuevo objeto (inmutable)
  })),
  on(cargarProductosError, (state, { error }) => ({ ...state, cargando: false, error })),
);
```
> 🔑 El reducer **nunca muta** ni hace side-effects (nada de HTTP, `Date.now`, random). Solo `estado + acción → nuevo estado`. Por eso se usa spread (Sesión 2). Ser puro es lo que hace el estado predecible y permite el time-travel de DevTools.

---

## 3. Selectors — leer el estado

Funciones **memoizadas** (Sesión 20) para extraer y derivar datos del store. Solo recalculan si su porción del estado cambió.

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';

const selectProductosState = createFeatureSelector<ProductosState>('productos');

export const selectProductos = createSelector(selectProductosState, s => s.items);
export const selectCargando = createSelector(selectProductosState, s => s.cargando);

// selector derivado (composición)
export const selectProductosCaros = createSelector(
  selectProductos,
  productos => productos.filter(p => p.precio > 1000),
);
```
```typescript
// en el componente
productos$ = this.store.select(selectProductos);   // Observable → | async
```
> Beneficio: la memoization evita recomputar filtros/derivados en cada emisión. Los componentes solo conocen selectores, no la forma interna del estado (encapsulación).

---

## 4. Effects — side-effects (HTTP, async) 🔑

Los reducers son puros, así que las llamadas HTTP van en **Effects**: escuchan acciones, hacen el trabajo async y **despachan** otra acción con el resultado.

```typescript
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { switchMap, map, catchError, of } from 'rxjs';

@Injectable()
export class ProductosEffects {
  private actions$ = inject(Actions);
  private service = inject(ProductoService);

  cargar$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cargarProductos),                        // escucha esta acción
      switchMap(() =>                                  // (Sesión 13: switchMap)
        this.service.listar().pipe(
          map(productos => cargarProductosOk({ productos })),
          catchError(error => of(cargarProductosError({ error: error.message }))),
        ),
      ),
    ),
  );
}
```
> El flujo: componente `dispatch(cargarProductos)` → effect intercepta → HTTP → `dispatch(cargarProductosOk)` → reducer actualiza el store → selector emite → UI se actualiza. Aquí se ve por qué RxJS (Sesión 13) es prerequisito: los operadores de aplanamiento son el corazón de los effects.

---

## 5. Conectar todo

```typescript
// en el componente
export class ProductosPage implements OnInit {
  private store = inject(Store);
  productos$ = this.store.select(selectProductos);
  cargando$ = this.store.select(selectCargando);

  ngOnInit() {
    this.store.dispatch(cargarProductos());   // dispara el flujo
  }
}
```
```html
<div *ngIf="cargando$ | async">Cargando…</div>
<li *ngFor="let p of productos$ | async">{{ p.nombre }}</li>
```

Registro (standalone):
```typescript
provideStore({ productos: productosReducer }),
provideEffects([ProductosEffects]),
provideStoreDevtools(),
```

---

## 6. NgRx Entity

Gestionar **colecciones** (listas de entidades con id) es repetitivo: añadir, actualizar, eliminar, buscar por id. **`@ngrx/entity`** lo automatiza con un `EntityAdapter`:

```typescript
import { createEntityAdapter, EntityState } from '@ngrx/entity';

export interface ProductosState extends EntityState<Producto> {
  cargando: boolean;
}
const adapter = createEntityAdapter<Producto>();

// en el reducer:
on(cargarProductosOk, (state, { productos }) => adapter.setAll(productos, state)),
on(agregar, (state, { producto }) => adapter.addOne(producto, state)),
on(actualizar, (state, { update }) => adapter.updateOne(update, state)),
on(eliminar, (state, { id }) => adapter.removeOne(id, state)),
```
Guarda las entidades normalizadas (`{ ids: [], entities: {} }`) y da selectores listos (`selectAll`, `selectEntities`, `selectTotal`). Evita mucho boilerplate en CRUDs.

---

## 7. Otras piezas

- **Router Store** (`@ngrx/router-store`): sincroniza el estado del router con el store (params, url) → puedes reaccionar a navegación en effects/selectors.
- **Component Store** (`@ngrx/component-store`): store **local** a un componente/feature, sin acciones globales. Para estado complejo pero acotado.
- **DevTools** (`@ngrx/store-devtools`): extensión de Chrome que muestra cada acción, el estado en el tiempo y permite **time-travel** (retroceder acciones). Posible gracias a la pureza de los reducers.
- **createActionGroup** / **functional effects**: APIs modernas que reducen boilerplate.

---

## 8. NgRx SignalStore (moderno)

NgRx moderno ofrece **`@ngrx/signals`** (SignalStore): state management basado en **Signals** (Sesión 14/29) en vez de Observables/Redux clásico. Menos boilerplate, más declarativo:
```typescript
export const ProductosStore = signalStore(
  withState({ items: [], cargando: false }),
  withMethods((store, service = inject(ProductoService)) => ({
    async cargar() { patchState(store, { items: await service.listar() }); },
  })),
);
```
Es la dirección hacia donde va el ecosistema. Menciónalo como alternativa moderna al Redux clásico.

---

## 9. ¿Cuándo usar NgRx? 🔑

**Úsalo cuando**: estado global complejo, muchos componentes lo comparten/modifican, necesitas trazabilidad (DevTools/time-travel), sincronización compleja, equipos grandes que se benefician de un patrón estricto.

**NO lo uses cuando**: la app es simple, el estado es mayormente local o padre-hijo, o basta un servicio con `BehaviorSubject`/Signals. NgRx añade **mucho boilerplate**; aplicarlo a un CRUD pequeño es sobre-ingeniería (respuesta senior, Sesión 22).

Alternativas: servicios + Subjects/Signals, NgXs (menos boilerplate), Akita, Elf, SignalStore.

---

## 10. Preguntas de entrevista

1. ¿Qué problema resuelve NgRx y en qué principios se basa?
2. Describe el flujo unidireccional (action → reducer → store → selector).
3. ¿Por qué los reducers deben ser puros?
4. ¿Dónde van las llamadas HTTP y por qué? Explica un effect.
5. ¿Qué son los selectors y qué ventaja da su memoization?
6. ¿Qué es NgRx Entity y qué resuelve?
7. ¿Qué operador RxJS es típico en un effect de carga y por qué?
8. ¿Cómo funciona el time-travel de DevTools?
9. ¿Cuándo NO usarías NgRx?
10. ¿Qué es SignalStore?

<details>
<summary>Respuestas resumidas</summary>

1. Estado global predecible con flujo unidireccional; single source of truth, estado inmutable, cambios solo por acciones, reducers puros.
2. El componente despacha una acción; el reducer produce el nuevo estado; el store lo guarda; el selector lo expone; la UI se actualiza con async.
3. Para que el estado sea predecible y reproducible (time-travel); sin mutaciones ni side-effects.
4. En effects, porque los reducers son puros; el effect escucha una acción, hace HTTP y despacha otra con el resultado.
5. Funciones memoizadas que derivan/leen el estado; evitan recomputar y encapsulan la forma del store.
6. Utilidad para gestionar colecciones normalizadas con métodos CRUD y selectores listos; reduce boilerplate.
7. `switchMap` (cancela cargas previas); mergeMap/concatMap/exhaustMap según el caso.
8. Al ser puros los reducers, DevTools puede reaplicar acciones y reconstruir cualquier estado pasado.
9. En apps simples o estado local; basta servicio + Subject/Signals. NgRx sería sobre-ingeniería.
10. State management moderno de NgRx basado en Signals, con menos boilerplate que el Redux clásico.

</details>

---

## ✅ Checklist para pasar a la Sesión 24

- [ ] Entiendo el flujo unidireccional y sus principios.
- [ ] Sé qué hace cada pieza: Action, Reducer, Selector, Effect.
- [ ] Explico por qué los reducers son puros y los effects manejan HTTP.
- [ ] Conozco NgRx Entity, Router/Component Store y DevTools.
- [ ] Tengo criterio de cuándo usar NgRx y sus alternativas.

Cuando lo tengas, dime **"siguiente"**. La **Sesión 24 — Angular Material** ya está creada.
