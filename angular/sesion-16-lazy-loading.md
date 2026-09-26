# Sesión 16 — Lazy Loading

> **Objetivo**: entender a fondo la carga diferida: cómo el bundler crea **chunks**, cómo funcionan los **dynamic imports**, las **estrategias de preloading**, y el impacto real en el rendimiento (tiempo de carga inicial). Ya viste el "cómo" básico en Routing (Sesión 10); aquí va el "por qué" y el detalle.

> Requisito: [Sesión 10](sesion-10-routing.md) (routing) y [Sesión 15](sesion-15-modulos.md) (módulos/standalone).

---

## 0. El problema que resuelve

Sin lazy loading, Angular empaqueta **toda la app** en un bundle inicial que el navegador descarga antes de mostrar nada. En apps grandes eso son megabytes → **primera carga lenta**.

**Lazy loading** = cargar cada parte de la app **solo cuando se necesita** (al navegar a esa ruta). El bundle inicial baja mucho de tamaño.

```
Sin lazy:  [ TODO el JS ] ────────▶ descarga enorme antes de ver nada
Con lazy:  [ core mínimo ] ──▶ ves la app ──▶ /admin ──▶ [ chunk admin ] se descarga
```

---

## 1. Eager vs Lazy

| | **Eager** (ansioso) | **Lazy** (diferido) |
|---|---|---|
| Cuándo se carga | Al inicio, con la app | Al visitar la ruta |
| Bundle | Todo junto (o pocos chunks) | Chunks separados por feature |
| Carga inicial | Más lenta | **Más rápida** |
| Uso | Lo esencial (home, layout, core) | Features secundarios (admin, reportes) |

Regla: **eager** lo que se usa siempre; **lazy** lo que se usa a veces.

---

## 2. Dynamic imports y chunking 🔑

El mecanismo es el `import()` **dinámico** de JavaScript (ES2020). A diferencia del `import` estático (arriba del archivo), el dinámico:
- Es una **función** que devuelve una **Promise**.
- Se ejecuta **en runtime**, cuando lo llamas.
- Le indica al **bundler** (esbuild/Webpack) que ese código va en un **chunk separado**.

```typescript
// import estático (siempre en el bundle inicial)
import { AdminComponent } from './admin.component';

// import dinámico (chunk separado, se descarga al ejecutarse)
() => import('./admin.component').then(m => m.AdminComponent)
```

Cuando el bundler ve un `import()` dinámico, **corta** ("code splitting") ese módulo y sus dependencias en un archivo `.js` aparte (un **chunk**). Ese chunk solo se descarga cuando el router ejecuta la función.

```
dist/
├── main.js          ← bundle inicial (core + rutas eager)
├── chunk-ADMIN.js   ← se descarga al entrar en /admin
└── chunk-REPORTS.js ← se descarga al entrar en /reportes
```

---

## 3. Configuración

### 3.1 Standalone (moderno)
```typescript
// cargar un componente
{ path: 'admin', loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent) }

// cargar un grupo de rutas (todo un feature)
{ path: 'admin', loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) }
```

### 3.2 Clásico (NgModules)
```typescript
{ path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) }
```
El feature module (`AdminModule`) tiene su propio routing con `RouterModule.forChild()` (Sesión 15).

> ⚠️ Error clásico: importar el módulo/componente **estáticamente** en algún lado además del lazy. Si lo importas arriba con `import ... from`, entra en el bundle inicial y **pierdes** el lazy loading. Mantén los features aislados.

---

## 4. Preloading strategies 🔑

El lazy puro tiene un coste: al hacer click en `/admin`, hay un pequeño **retraso** mientras se descarga el chunk. El **preloading** mitiga esto: carga los chunks lazy **en segundo plano** *después* de que la app inicial ya cargó (cuando la red está ociosa).

```
Carga inicial (rápida)  →  app usable  →  [en background] precarga chunks lazy
                                          →  al navegar, ya están listos ✅
```

### 4.1 Estrategias integradas
```typescript
// Standalone
import { provideRouter, withPreloading, PreloadAllModules, NoPreloading } from '@angular/router';

provideRouter(routes, withPreloading(PreloadAllModules));
```
```typescript
// Clásico
RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
```

| Estrategia | Comportamiento |
|---|---|
| **`NoPreloading`** (default) | No precarga nada; cada chunk se descarga al visitarlo |
| **`PreloadAllModules`** | Precarga **todos** los lazy en background tras la carga inicial |

### 4.2 Estrategia de preloading personalizada
Precargar **solo algunas** rutas (ej. marcadas con `data: { preload: true }`):
```typescript
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data?.['preload'] ? load() : of(null);
  }
}
```
```typescript
{ path: 'admin', loadChildren: ..., data: { preload: true } }
```
Útil para precargar lo probable (dashboard) y no lo raro (configuración avanzada).

> Trade-off: `PreloadAllModules` mejora la navegación posterior pero consume ancho de banda de todos los usuarios. La selectiva equilibra. En entrevista, menciona que la elección depende del tamaño de la app y el patrón de uso.

---

## 5. Impacto en performance

Métricas que mejora el lazy loading:
- **Initial bundle size** ↓ → menos JS que descargar/parsear al arrancar.
- **Time to Interactive (TTI)** ↓ → la app responde antes.
- **First Contentful Paint (FCP)** ↓ → se ve contenido antes.

Cómo medirlo:
```bash
ng build --stats-json               # genera estadísticas del build
npx webpack-bundle-analyzer dist/stats.json   # visualiza el tamaño de cada chunk
# o: ng build --configuration production y revisar los tamaños en consola
```
Ves qué chunk pesa más y qué dependencias lo inflan (Sesión 20 — Performance).

> 🔑 Regla de oro: **cada feature grande = una ruta lazy**. El bundle inicial debe contener solo lo imprescindible para el primer render (shell + home).

---

## 6. Buenas prácticas y errores

- ✅ Divide por **features** (dominios), no por tipos de archivo.
- ✅ Combina lazy + **preloading** para lo más probable.
- ✅ Usa `@defer` (Angular 17+, Sesión 17/29) para diferir *partes* de un componente, no solo rutas.
- ❌ No importes estáticamente lo que quieres lazy (rompe el splitting).
- ❌ No pongas servicios singleton en módulos lazy sin cuidado → instancias duplicadas (usa `providedIn:'root'`, Sesión 8).
- ❌ No hagas todo lazy: rutas diminutas como chunks separados añaden overhead de red.

---

## 7. `@defer` — lazy a nivel de vista (Angular 17+)

Además de rutas, Angular 17 permite diferir **bloques del template** hasta que se necesiten (visibles, tras interacción, etc.), cargando su JS solo entonces:

```html
@defer (on viewport) {
  <app-comentarios />           <!-- se carga cuando entra en pantalla -->
} @placeholder {
  <p>Cargando comentarios…</p>
} @loading {
  <spinner />
}
```
Triggers: `on viewport`, `on interaction`, `on hover`, `on timer`, `when condición`. Es lazy loading **granular** dentro de un componente. Se amplía en la Sesión 29.

---

## 8. Preguntas de entrevista

1. ¿Qué problema resuelve el lazy loading?
2. ¿Diferencia entre carga eager y lazy?
3. ¿Cómo funciona el `import()` dinámico y qué es un chunk?
4. ¿Qué pasa si importas estáticamente un módulo que querías lazy?
5. ¿Qué es el preloading y qué problema del lazy resuelve?
6. ¿Diferencia entre `NoPreloading` y `PreloadAllModules`?
7. ¿Cuándo usarías una estrategia de preloading personalizada?
8. ¿Qué métricas de performance mejora el lazy loading?
9. ¿Cómo analizas el tamaño de los bundles?
10. ¿Qué es `@defer` y en qué se diferencia del lazy de rutas?

<details>
<summary>Respuestas resumidas</summary>

1. Reduce el bundle inicial cargando cada feature solo cuando se visita → carga inicial más rápida.
2. Eager carga al inicio con la app; lazy carga al navegar a la ruta.
3. `import()` es una función que devuelve Promise y le dice al bundler que separe ese código en un chunk aparte (code splitting), descargado en runtime.
4. Entra en el bundle inicial y pierdes el lazy loading.
5. Precargar chunks lazy en background tras la carga inicial; elimina el retraso al navegar.
6. NoPreloading no precarga (default); PreloadAllModules precarga todos los lazy en background.
7. Para precargar solo rutas probables (marcadas con `data.preload`) y ahorrar ancho de banda.
8. Initial bundle size, Time to Interactive y First Contentful Paint.
9. Con `ng build --stats-json` + webpack-bundle-analyzer, o revisando tamaños del build de producción.
10. `@defer` difiere bloques del template (no rutas) con triggers como viewport/interaction; es lazy granular dentro de un componente.

</details>

---

## ✅ Checklist para pasar a la Sesión 17

- [ ] Explico eager vs lazy y cuándo cada uno.
- [ ] Entiendo el `import()` dinámico y el chunking.
- [ ] Sé configurar lazy con `loadComponent`/`loadChildren`.
- [ ] Conozco las estrategias de preloading y cuándo usar la selectiva.
- [ ] Sé qué métricas mejora y cómo analizar bundles.
- [ ] Reconozco `@defer` como lazy a nivel de vista.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 17 — Guards** (`CanActivate`, `CanDeactivate`, `CanMatch`, `CanLoad`, `Resolve`; forma funcional moderna vs clases).
