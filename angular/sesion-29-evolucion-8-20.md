# Sesión 29 — Evolución de Angular (8 → 20)

> **Objetivo**: conocer la línea de tiempo del framework y qué introdujo cada versión mayor. En entrevistas senior preguntan "¿qué novedades trae Angular moderno?" o "¿qué cambió desde la versión X?". Esta sesión conecta features que ya viste (Ivy, standalone, Signals, control flow) en su contexto histórico y explica cada novedad moderna a fondo.

> Requisito: idealmente todo lo anterior; integra S3, S5, S14, S15, S26, S27.

---

## 0. Cadencia de releases

Angular publica **una versión mayor cada ~6 meses** (más minors intermedios). No son reescrituras: cada mayor es incremental, con deprecaciones graduales. Las versiones **LTS** reciben soporte ~18 meses. Por eso hay que saber **migrar** (Sesión 30) y conocer qué trajo cada salto.

---

## 1. Línea de tiempo (resumen) 🔑

| Versión | Año aprox. | Hito principal |
|---|---|---|
| **8** | 2019 | Differential loading, dynamic imports para lazy, Builder API |
| **9** | 2020 | **Ivy por defecto** (gran cambio de compilación/rendimiento) |
| **10** | 2020 | Mejoras de TypeScript, config más estricta |
| **11** | 2020 | HMR mejorado, builds más rápidos |
| **12** | 2021 | Webpack 5, fin de View Engine para apps nuevas |
| **13** | 2021 | **View Engine eliminado**, componentes dinámicos sin `ComponentFactoryResolver` |
| **14** | 2022 | **Typed Forms**, **Standalone APIs (preview)**, `inject()` |
| **15** | 2022 | **Standalone estable**, directivas/pipes standalone |
| **16** | 2023 | **Signals (preview)**, `DestroyRef`, `takeUntilDestroyed`, **Hydration** |
| **17** | 2023 | **Control flow** `@if/@for/@switch`, **`@defer`**, esbuild/Vite por defecto, nueva marca/docs |
| **18** | 2024 | Zoneless (experimental), Signals afinados, Material 3 estable, event replay |
| **19** | 2024 | Standalone por defecto, **incremental hydration**, `linkedSignal`, `resource()` (preview) |
| **20** | 2025 | Signals/zoneless madurando, mejoras de SSR y DX |

> No memorices fechas exactas; sí el **orden de los hitos**: Ivy (9) → View Engine fuera (13) → Standalone (14-15) → Signals + Hydration (16) → Control flow + defer (17) → Zoneless/incremental hydration (18-19+).

---

## 2. Los hitos que importan (detalle)

### 2.1 Angular 9 — Ivy por defecto
El cambio más grande de la era moderna: nuevo compilador/runtime (Sesión 27). Bundles menores, mejor tree shaking, builds incrementales, debugging. Habilitó casi todo lo que vino después (standalone, hydration, control flow). Con Ivy, AOT pasó a ser el default siempre.

### 2.2 Angular 13 — adiós View Engine
Se eliminó el motor antiguo por completo. Simplificó APIs: crear componentes dinámicos ya no necesita `ComponentFactoryResolver` (se usa `ViewContainerRef.createComponent(Componente)` directo). Las librerías pasaron a publicar en formato Ivy (camino a eliminar `ngcc` en v16).

### 2.3 Angular 14 — `inject()` y Typed Forms
- **`inject()`** (Sesión 8): inyectar fuera del constructor, base de guards/interceptors funcionales.
- **Typed Forms** (Sesión 11): formularios reactivos con tipos reales.
- **Standalone (preview)**: primeros componentes sin NgModule.

---

## 3. Standalone Components (14-15, default en 17/19) 🔑

Ya cubierto (Sesión 3 y 15). El componente declara sus propias `imports`, sin NgModule.

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  /* ... */
})
export class MiComponente {}
```
Bootstrap con `bootstrapApplication` + `provideRouter`/`provideHttpClient` (Sesión 15). Es la **dirección oficial**: menos boilerplate, mejor tree shaking, más simple de enseñar. Desde v17 los proyectos nuevos son standalone por defecto; v19 lo hizo el default del schematic.

---

## 4. Signals (16+) 🔑🔑

La novedad más importante de la era moderna. Un **signal** es un valor reactivo que **notifica** con precisión cuando cambia (Sesión 14).

```typescript
import { signal, computed, effect } from '@angular/core';

count = signal(0);                          // WritableSignal<number>
double = computed(() => this.count() * 2);  // derivado, memoizado

incrementar() {
  this.count.set(5);
  this.count.update(v => v + 1);
}

constructor() {
  effect(() => console.log('count =', this.count()));  // corre al cambiar count
}
```
```html
<p>{{ count() }} → {{ double() }}</p>   <!-- se leen como función -->
```

### 4.1 Por qué importan
- **Detección de cambios precisa**: Angular sabe exactamente qué depende de cada signal → puede actualizar solo eso, sin revisar el árbol (base del **zoneless**).
- **Menos boilerplate** que RxJS para estado local sincrónico.
- **`computed`** memoiza automáticamente (Sesión 20).

### 4.2 Signals APIs relacionadas
- **`input()` / `output()`** (v17.1+): inputs/outputs como signals — `nombre = input.required<string>()`.
- **`model()`**: two-way binding con signals.
- **`viewChild()` / `contentChild()`**: queries como signals.
- **`linkedSignal()`** (v19): un signal escribible que se recalcula desde otros.
- **`toSignal()` / `toObservable()`**: puente entre Signals y RxJS (`@angular/core/rxjs-interop`).

### 4.3 Signals vs RxJS
No se reemplazan: **Signals** para estado **síncrono** en el componente/UI; **RxJS** para flujos **asíncronos** y composición compleja (HTTP, eventos, streams). Se interoperan con `toSignal`/`toObservable`. En entrevista: *"Signals para estado de UI, RxJS para asincronía; conviven"*.

---

## 5. `DestroyRef` y `takeUntilDestroyed` (16+)

Simplifican la limpieza de subscripciones (Sesión 13):
```typescript
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

constructor() {
  this.datos$.pipe(takeUntilDestroyed()).subscribe();  // se limpia solo al destruir
}
// o manual:
inject(DestroyRef).onDestroy(() => { /* limpieza */ });
```
Reemplazan el patrón manual `takeUntil(destroy$)` + `ngOnDestroy`.

---

## 6. Control flow integrado (17+) 🔑

Sintaxis de control en el template sin `CommonModule` (Sesión 5): `@if`, `@for` (con `track` obligatorio y `@empty`), `@switch`.

```html
@if (user()) {
  <p>Hola {{ user().nombre }}</p>
} @else {
  <p>Invitado</p>
}

@for (item of items(); track item.id) {
  <li>{{ item.nombre }}</li>
} @empty {
  <li>Vacío</li>
}
```
Ventajas: más rápido, más legible, `track` por defecto (rendimiento, Sesión 20), sin importar directivas. Hay una **migración automática** (`ng generate @angular/core:control-flow`) desde `*ngIf`/`*ngFor`.

---

## 7. `@defer` — deferrable views (17+) 🔑

Diferir la carga de bloques del template hasta que se necesiten (Sesión 16), con lazy loading automático de su JS:
```html
@defer (on viewport) {
  <app-pesado />
} @placeholder { <p>…</p> }
  @loading (minimum 500ms) { <spinner /> }
  @error { <p>Error al cargar</p> }
```
Triggers: `on idle` (default), `on viewport`, `on interaction`, `on hover`, `on timer(2s)`, `when condición`, `prefetch on ...`. Es lazy loading declarativo y granular dentro de un componente.

---

## 8. Hydration e Incremental Hydration (16 / 19+)

- **Hydration** (16): reutiliza el HTML del SSR sin re-renderizar (Sesión 26). `provideClientHydration()`.
- **Incremental hydration** (19+): hidrata **solo** las partes que se ven/interactúan, combinada con `@defer` → menos JS ejecutado al inicio. `provideClientHydration(withIncrementalHydration())`.
- **Event replay** (18): captura eventos del usuario ocurridos **antes** de hidratar y los reproduce tras hidratar, para no perder clicks tempranos.

---

## 9. Zoneless (18+, evolucionando) 🔑

Angular sin Zone.js (Sesión 14/28). Con Signals, Angular detecta cambios de forma precisa y **ya no necesita** que Zone.js le avise "algo pasó".

```typescript
// experimental
bootstrapApplication(App, {
  providers: [provideExperimentalZonelessChangeDetection()],
});
```
Beneficios: mejor rendimiento, bundle más pequeño (sin Zone.js ~unos KB), stack traces más limpios, detección precisa. Es la **dirección a largo plazo** del framework. En entrevista: menciónalo como el futuro, aún estabilizándose.

---

## 10. Otras novedades modernas

- **`NgOptimizedImage`** (`ngSrc`): optimización de imágenes (lazy, priorización LCP) (Sesión 20).
- **`resource()` / `rxResource()`** (19, preview): manejar carga async de datos con signals (loading/error/value declarativos).
- **Material 3** (18): nuevo sistema de theming (Sesión 24).
- **Built-in control flow migration**, **standalone migration**: schematics automáticos para modernizar código.
- **SSR mejorado**: `@angular/ssr` en el core, mejor DX.

---

## 11. Preguntas de entrevista

1. ¿Cada cuánto sale una versión mayor de Angular?
2. ¿Cuál fue el cambio de Angular 9?
3. ¿Qué pasó con View Engine y en qué versión?
4. ¿Qué son los Standalone Components y desde cuándo son el default?
5. ¿Qué son los Signals y por qué importan para la detección de cambios?
6. ¿Signals reemplazan a RxJS?
7. ¿Qué aporta el control flow `@if/@for` frente a `*ngIf/*ngFor`?
8. ¿Qué es `@defer`?
9. ¿Qué es la hidratación incremental y el event replay?
10. ¿Qué es zoneless y por qué es relevante?

<details>
<summary>Respuestas resumidas</summary>

1. Cada ~6 meses una mayor; LTS ~18 meses.
2. Ivy por defecto (nuevo compilador/runtime): bundles menores, mejor tree shaking, builds incrementales.
3. Eliminado en Angular 13; simplificó APIs (componentes dinámicos sin ComponentFactoryResolver).
4. Componentes que declaran sus imports sin NgModule; estables en 15, default de proyectos en 17 y del schematic en 19.
5. Valores reactivos que notifican con precisión al cambiar; permiten CD granular y zoneless, y memoizan (computed).
6. No; Signals para estado síncrono de UI, RxJS para asincronía; interoperan con toSignal/toObservable.
7. Más rápido y legible, `track` obligatorio (rendimiento), `@empty`, sin importar CommonModule.
8. Diferir bloques del template (lazy) con triggers (viewport, interaction…), con placeholder/loading/error.
9. Hidratar solo lo visible/interactuado (incremental) y reproducir eventos ocurridos antes de hidratar (event replay).
10. Angular sin Zone.js: detección precisa vía Signals, mejor rendimiento y bundle menor; el futuro del framework.

</details>

---

## ✅ Checklist para pasar a la Sesión 30

- [ ] Conozco el orden de los hitos (Ivy → View Engine fuera → Standalone → Signals → Control flow → Zoneless).
- [ ] Domino Signals (`signal/computed/effect`, `input()/output()`) y su relación con RxJS.
- [ ] Entiendo el control flow `@if/@for/@switch` y `@defer`.
- [ ] Comprendo hidratación incremental, event replay y zoneless.
- [ ] Sé situar cada novedad en su versión aproximada.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 30 — Temas Senior**, el cierre del temario (microfrontends, memory leak hunting, profiling, librerías, i18n, a11y, CI/CD, observabilidad).
