# Sesión 20 — Performance

> **Objetivo**: consolidar todas las técnicas de optimización de Angular en un solo lugar (muchas ya vistas en sesiones previas) y saber **cuándo aplicar cada una**: `trackBy`, OnPush, lazy loading, virtual scroll, tree shaking, análisis de bundles, memoization, pure pipes, AOT. La performance es un tema recurrente en entrevistas senior.

> Requisito: Sesiones 5, 6, 13, 14, 16 (aquí se integran).

---

## 0. Las tres dimensiones de performance

1. **Load performance** — qué tan rápido carga la app (bundle, red).
2. **Runtime performance** — qué tan fluida es al usarla (detección de cambios, renders).
3. **Memory** — no acumular fugas (subscripciones, listeners).

Cada técnica ataca una o varias. Vamos por categorías.

---

## 1. Optimizar la carga (load)

### 1.1 Lazy loading (Sesión 16)
Cargar features bajo demanda → bundle inicial pequeño. La palanca #1 de carga.

### 1.2 AOT (Sesión 1)
Compilación anticipada (default desde v9): bundles más livianos (sin compilador), arranque más rápido, errores en build.

### 1.3 Tree shaking (Sesión 1)
El bundler elimina código no usado. Se favorece con: ES modules, `providedIn:'root'` (servicios tree-shakeables), evitar side-effects, imports específicos.
```typescript
import { map } from 'rxjs';           // ✅ tree-shakeable
// evita imports que traigan toda una librería
```

### 1.4 Análisis de bundles
```bash
ng build --configuration production
ng build --stats-json
npx webpack-bundle-analyzer dist/<app>/stats.json
```
Identifica chunks pesados y dependencias que inflan el bundle (ej. moment.js → usar date-fns o el `DatePipe` nativo).

### 1.5 Budgets (presupuestos de tamaño)
En `angular.json` puedes fijar límites que fallan el build si se exceden:
```json
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" }
]
```

### 1.6 Otros
- **Differential loading** (v8): servía bundles modernos/legacy según el navegador (menos relevante hoy).
- **SSR / prerender** (Sesión 26): mejora FCP y SEO.
- **Optimizar imágenes**: `NgOptimizedImage` (`ngSrc`) con lazy loading y priorización.

---

## 2. Optimizar el runtime (detección de cambios y render)

### 2.1 `OnPush` + inmutabilidad (Sesión 14) 🔑
La palanca #1 de runtime: reduce drásticamente cuántos componentes se revisan por ciclo. Requiere trabajar con referencias inmutables.

### 2.2 `trackBy` / `@for track` (Sesión 5) 🔑
En listas, evita recrear el DOM entero al cambiar la colección: Angular reutiliza los nodos cuya identidad no cambió.
```html
<li *ngFor="let p of productos; trackBy: trackById">{{ p.nombre }}</li>
```

### 2.3 Pure pipes en vez de métodos (Sesión 6) 🔑
Un pipe puro se cachea (solo recalcula si cambia el input); un método en el template se ejecuta en **cada** ciclo de CD.
```html
{{ valor | formatear }}        <!-- ✅ cacheado -->
{{ formatear(valor) }}         <!-- ❌ cada ciclo -->
```

### 2.4 Virtual Scroll (CDK, Sesión 25)
Para listas largas (miles de ítems): solo renderiza los visibles, reciclando nodos al hacer scroll.
```html
<cdk-virtual-scroll-viewport itemSize="50">
  <div *cdkVirtualFor="let item of items">{{ item }}</div>
</cdk-virtual-scroll-viewport>
```
Sin esto, renderizar 10.000 `<div>` colapsa el navegador.

### 2.5 `@defer` (Sesión 16/29)
Diferir partes del template (comentarios, gráficos) hasta que sean visibles/necesarias.

### 2.6 `runOutsideAngular` (Sesión 14)
Sacar eventos de alta frecuencia (mousemove, scroll, animaciones) de Zone.js para que no disparen CD.

### 2.7 Evitar trabajo en el template
- No llamar funciones costosas en interpolación/bindings (se ejecutan cada CD).
- No crear objetos/arrays inline en el template (`[config]="{a:1}"`) → nueva referencia cada CD, rompe OnPush.

---

## 3. Memoization

**Memoizar** = cachear el resultado de una función para inputs repetidos. En Angular se logra con:
- **Pure pipes** (memoization "gratis" por input).
- Selectores memoizados de **NgRx** (`createSelector`, Sesión 23).
- `computed()` de **Signals** (Sesión 14/29): recalcula solo si cambian sus dependencias.
```typescript
total = computed(() => this.items().reduce((a, i) => a + i.precio, 0));
```

---

## 4. Optimizar memoria (fugas)

Ya cubierto en RxJS (Sesión 13): la fuente #1 de memory leaks son **subscripciones no cerradas**.
- Usa el pipe **`async`** (se desuscribe solo).
- `takeUntilDestroyed()` (v16+) o `takeUntil(destroy$)`.
- Limpia listeners/timers en `ngOnDestroy`.
- Cuidado con closures que retienen referencias grandes.

**Detección**: Chrome DevTools → pestaña **Memory** → *heap snapshots*; compara antes/después de navegar. Si los componentes destruidos no se liberan (retained), hay fuga (Sesión 30).

---

## 5. Herramientas de profiling

- **Angular DevTools** (extensión de Chrome): árbol de componentes, **profiler de detección de cambios** (ve qué componentes se revisan y cuánto tardan).
- **Chrome DevTools Performance**: graba y analiza el runtime, long tasks, layout thrashing.
- **Lighthouse**: audita FCP, LCP, TTI, best practices.
- **`ng build --stats-json`** + analyzer: tamaño de bundles.

Flujo típico: mide primero (no optimices a ciegas) → identifica el cuello de botella → aplica la técnica adecuada → vuelve a medir.

---

## 6. Checklist de optimización (mental)

| Síntoma | Técnica |
|---|---|
| Carga inicial lenta | Lazy loading, análisis de bundle, AOT, SSR |
| Bundle enorme | Tree shaking, quitar librerías pesadas, budgets |
| UI lenta al interactuar | OnPush + inmutabilidad, evitar métodos en template |
| Lista larga que se traba | `trackBy` + Virtual Scroll |
| Recalcula sin parar | Pure pipes, memoization, `computed` |
| App consume RAM creciente | Desuscribir (async/takeUntil), limpiar en OnDestroy |
| Eventos frecuentes laggean | `runOutsideAngular`, debounce/throttle |

---

## 7. Preguntas de entrevista

1. ¿Cuál es la mayor palanca para mejorar la carga inicial?
2. ¿Cómo mejoras el runtime de la detección de cambios?
3. ¿Por qué `trackBy` mejora el rendimiento de una lista?
4. ¿Por qué un pipe puro rinde mejor que un método en el template?
5. ¿Cómo renderizas una lista de 10.000 elementos sin colapsar?
6. ¿Qué es tree shaking y cómo lo favoreces?
7. ¿Cómo detectas y evitas memory leaks?
8. ¿Qué herramientas usas para hacer profiling?
9. ¿Por qué no crear objetos inline en el template con OnPush?
10. ¿Qué es la memoization en Angular y dónde aparece?

<details>
<summary>Respuestas resumidas</summary>

1. Lazy loading (reduce el bundle inicial), junto con AOT y análisis de bundles.
2. `OnPush` + inmutabilidad, evitar métodos costosos en el template, `trackBy`, `runOutsideAngular`.
3. Da identidad a cada item; Angular reutiliza el DOM en vez de recrear toda la lista.
4. El pipe puro se cachea (recalcula solo si cambia el input); el método corre en cada ciclo de CD.
5. Con Virtual Scroll del CDK (solo renderiza lo visible).
6. Eliminación de código no usado; se favorece con ES modules, imports específicos, `providedIn:'root'`.
7. Desuscribir (async/takeUntilDestroyed), limpiar en OnDestroy; detectar con heap snapshots en DevTools.
8. Angular DevTools (profiler de CD), Chrome Performance, Lighthouse, bundle-analyzer.
9. Crea una nueva referencia en cada CD → dispara re-render y rompe la ventaja de OnPush.
10. Cachear resultados por input; aparece en pure pipes, selectores NgRx y `computed()` de Signals.

</details>

---

## ✅ Checklist para pasar a la Sesión 21

- [ ] Distingo load / runtime / memory y qué técnica ataca cada uno.
- [ ] Domino OnPush + inmutabilidad, `trackBy`, pure pipes, virtual scroll.
- [ ] Sé analizar bundles y fijar budgets.
- [ ] Entiendo memoization (pipes, selectores, `computed`).
- [ ] Sé detectar memory leaks y hacer profiling.
- [ ] Puedo mapear un síntoma a su técnica.

Sigue con la **Sesión 21 — Testing** (ya creada).
