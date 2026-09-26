# Sesión 28 — Internals de Angular

> **Objetivo**: entender cómo funciona Angular **por dentro** — el conocimiento que distingue a un senior que "usa" Angular de uno que "entiende" Angular. Cómo Ivy crea componentes, cómo funciona Zone.js, el árbol de inyectores, cómo se compila el HTML, cómo se genera y destruye el DOM, y cómo se maneja la memoria. Integra y profundiza sesiones previas.

> Requisito: Change Detection (S14), DI (S9), Compilación/Ivy (S27), RxJS/leaks (S13).

---

## 0. Nota sobre esta sesión

Estos son detalles de implementación que **cambian entre versiones** y que rara vez tocas directamente. El objetivo no es memorizar APIs internas (`ɵɵ...`), sino tener un **modelo mental correcto** de qué hace Angular, para razonar sobre rendimiento, bugs sutiles y preguntas avanzadas de entrevista.

---

## 1. Cómo Ivy crea un componente

Cuando defines un `@Component`, Ivy (Sesión 27) compila su template a **dos funciones** dentro de la clase, más una estructura de datos:

```
Componente compilado por Ivy:
├── Template function (create mode)  → construye el DOM la 1ª vez
├── Template function (update mode)  → actualiza los bindings en cada CD
└── LView / TView                    → estructuras de datos del estado de la vista
```

- **`TView`** (Template View): la parte **estática/compartida** entre todas las instancias del componente (la "plantilla" de la vista). Se crea una vez por tipo de componente.
- **`LView`** (Logical View): la parte **dinámica** por instancia — guarda los valores actuales de los bindings, referencias a nodos del DOM, hijos, etc. Un `LView` por cada instancia del componente.

### 1.1 Create vs Update mode
```typescript
// pseudocódigo de lo que genera Ivy para <p>{{ nombre }}</p>
function Template(rf, ctx) {
  if (rf & CREATE) {          // primera vez: crear nodos
    ɵɵelementStart(0, 'p');
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & UPDATE) {          // cada detección: actualizar si cambió
    ɵɵadvance(1);
    ɵɵtextInterpolate(ctx.nombre);
  }
}
```
Los bindings viven en el `LView` y Ivy compara el valor nuevo con el guardado; solo toca el DOM si cambió. **Esto es la detección de cambios a bajo nivel** (Sesión 14).

---

## 2. Cómo funciona Zone.js (por dentro)

Zone.js (Sesión 14) hace **monkey-patching**: al cargar, **reemplaza** las APIs asíncronas del navegador (`setTimeout`, `addEventListener`, `Promise`, `XHR`…) por versiones envueltas que, además de su función original, **notifican** cuando la tarea async empieza/termina.

```
setTimeout original  →  [Zone.js lo envuelve]  →  ejecuta callback + avisa a Angular
```

Angular corre dentro de la **NgZone** (una zona especial). Cuando una tarea async termina dentro de esa zona, `NgZone` emite `onMicrotaskEmpty` → Angular dispara un ciclo de detección de cambios sobre todo el árbol.

- `runOutsideAngular` (Sesión 14) ejecuta código en una zona **distinta** que no dispara CD.
- El futuro **zoneless** (Sesión 14/29) elimina esta capa: con Signals, Angular sabe exactamente qué cambió sin necesitar que Zone.js le avise "algo pasó".

---

## 3. El árbol de inyectores (por dentro)

Visto en DI (Sesión 9). A bajo nivel, Angular mantiene **dos jerarquías** que se resuelven juntas:

- **EnvironmentInjector** (antes ModuleInjector): providers de `providedIn:'root'`, de la aplicación y de módulos/rutas lazy. Jerarquía por entorno.
- **ElementInjector**: providers declarados en `@Component`/`@Directive`. Vive **en el `LView`** de cada elemento, formando un árbol paralelo al árbol de componentes.

Al resolver un token: Angular sube por el **ElementInjector** (de elemento en elemento hacia la raíz), y si no lo encuentra, consulta el **EnvironmentInjector**. Si ninguno lo tiene → `NullInjectorError`. Esto explica el shadowing y el "bubbling up" de la Sesión 9 a nivel de estructuras de datos.

---

## 4. Cómo se compila el HTML

```
Template HTML string
   │  Angular Compiler (ngtsc) parsea el HTML
   ▼
AST del template (nodos: elementos, bindings, directivas estructurales)
   │  detecta {{}}, [prop], (event), *ngIf, componentes hijos…
   ▼
Genera las funciones create/update (instrucciones Ivy)
   │
   ▼  incrustadas en la clase compilada del componente
```
Las **directivas estructurales** (`*ngIf`, `*ngFor`) se desugarizan a `<ng-template>` con un `ViewContainerRef` (Sesión 5): Ivy genera código que crea/destruye vistas embebidas dinámicamente según la condición/colección.

---

## 5. Cómo se genera y destruye el DOM

### 5.1 Generación
1. Angular arranca (bootstrap) y crea el `LView` del componente raíz.
2. Ejecuta la template function en **create mode** → crea los nodos del DOM y los inserta.
3. Instancia componentes hijos (recursivamente), creando sus `LView`.
4. Ejecuta los hooks: `ngOnInit`, `ngAfterViewInit`… (Sesión 3).

### 5.2 Destrucción
Cuando un componente se quita (ej. `*ngIf` pasa a false, se navega fuera):
1. Angular llama a `ngOnDestroy` del componente y sus hijos (de dentro hacia afuera).
2. Ejecuta las funciones de **cleanup** registradas en el `LView` (listeners del DOM, outputs).
3. Elimina los nodos del DOM.
4. Libera las referencias del `LView` para que el GC pueda recogerlas.

> 🔑 Aquí está la clave de los **memory leaks**: Angular limpia lo *suyo* (listeners de template, bindings), pero **no** tus subscripciones manuales de RxJS ni listeners que agregaste con `addEventListener`. Por eso debes desuscribir en `ngOnDestroy` (Sesión 13).

---

## 6. Cómo Angular maneja la memoria

- Cada instancia de componente = un `LView` que referencia sus nodos DOM, su contexto (la clase) y sus hijos.
- Al destruir el componente, Angular rompe esas referencias → el **Garbage Collector** de JS libera la memoria.
- **Fugas** ocurren cuando **algo externo** retiene una referencia al componente destruido:
  - Una **subscripción** viva (un `Subject`/`interval` sigue apuntando al callback del componente).
  - Un **listener** global (`window.addEventListener`) no removido.
  - Un **timer** (`setInterval`) no limpiado.
  - Referencias en un servicio singleton a componentes destruidos.

**Diagnóstico** (Sesión 20/30): Chrome DevTools → Memory → *heap snapshot*. Navega, vuelve, fuerza GC y toma otro snapshot: si instancias del componente destruido siguen "retained", hay fuga; el snapshot muestra la **cadena de retención** (quién lo retiene).

---

## 7. El ciclo completo (mapa mental integrador)

```
1. Build: Angular Compiler + tsc + bundler → bundles (Sesión 27)
2. Carga: navegador descarga index.html + JS → bootstrap (Sesión 1/3)
3. Ivy crea LView del root → create mode monta el DOM (esta sesión)
4. DI resuelve dependencias por el árbol de inyectores (Sesión 9)
5. Zone.js vigila lo async; al terminar → detección de cambios (Sesión 14)
6. Update mode compara bindings y toca el DOM solo si cambió
7. Navegación/condiciones crean y destruyen LViews (hooks, cleanup)
8. Al destruir: ngOnDestroy + cleanup; el GC libera si nada externo retiene
```
Si tienes este mapa claro, puedes razonar sobre casi cualquier comportamiento o bug de Angular.

---

## 8. Preguntas de entrevista

1. ¿Qué genera Ivy a partir de un `@Component`?
2. ¿Diferencia entre `TView` y `LView`?
3. ¿Qué son los modos create y update de una template function?
4. ¿Cómo funciona Zone.js internamente (monkey-patching)?
5. ¿Cómo dispara Angular la detección de cambios tras una tarea async?
6. ¿Cómo se resuelve un token entre ElementInjector y EnvironmentInjector?
7. ¿Cómo se desugarizan las directivas estructurales?
8. ¿Qué pasa exactamente al destruir un componente?
9. ¿Por qué ocurren los memory leaks si Angular limpia el DOM?
10. ¿Cómo diagnosticas una fuga de memoria?

<details>
<summary>Respuestas resumidas</summary>

1. Funciones de template (create y update) más estructuras TView/LView, incrustadas en la clase.
2. TView = parte estática compartida por tipo de componente; LView = estado dinámico por instancia (valores, nodos).
3. Create monta el DOM la primera vez; update compara y actualiza los bindings en cada detección.
4. Reemplaza las APIs async del navegador por versiones envueltas que notifican cuando la tarea empieza/termina.
5. Al vaciarse la cola de microtareas en la NgZone, emite un evento que dispara CD sobre el árbol.
6. Sube por el ElementInjector (elemento a elemento); si no está, consulta el EnvironmentInjector; si no, NullInjectorError.
7. `*ngIf`/`*ngFor` se convierten en `<ng-template>` + ViewContainerRef que crea/destruye vistas embebidas.
8. Llama ngOnDestroy (hijos primero), ejecuta cleanups (listeners/outputs), quita nodos y libera el LView.
9. Angular limpia lo suyo, pero no las subscripciones/listeners/timers que tú creaste y siguen reteniendo el componente.
10. Con heap snapshots en DevTools: comparar antes/después de navegar y ver la cadena de retención de instancias no liberadas.

</details>

---

## ✅ Checklist para pasar a la Sesión 29

- [ ] Tengo el modelo mental de TView/LView y create/update.
- [ ] Entiendo el monkey-patching de Zone.js y cómo dispara CD.
- [ ] Comprendo las dos jerarquías de inyectores a bajo nivel.
- [ ] Sé cómo se genera y destruye el DOM (y los hooks).
- [ ] Entiendo por qué ocurren los memory leaks pese a la limpieza de Angular.
- [ ] Puedo recorrer el ciclo completo build → destroy.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 29 — Evolución Angular 8 → 20** (Ivy, standalone, Signals, control flow, defer, zoneless: la línea de tiempo del framework).
