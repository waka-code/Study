# Sesión 15 — Módulos (NgModules) y Standalone

> **Objetivo**: entender qué es un `NgModule`, sus metadatos (`declarations`, `imports`, `exports`, `providers`), los patrones clásicos de organización (Feature / Shared / Core module), los barrel exports, y la transición hacia **Standalone** (que hace los módulos opcionales). Debes reconocer y trabajar con **ambos** mundos.

> Requisito: [Sesión 3](sesion-03-componentes.md) (componentes/standalone) y [Sesión 8-9](sesion-08-servicios.md) (providers).

---

## 0. ¿Qué es un NgModule?

Un **NgModule** es una clase con `@NgModule` que **agrupa y organiza** piezas relacionadas (componentes, directivas, pipes, servicios) y declara sus dependencias. Fue el mecanismo central de organización de Angular hasta la llegada de Standalone.

```typescript
import { NgModule } from '@angular/core';

@NgModule({
  declarations: [ProductoComponent, PrecioPipe],   // lo que PERTENECE a este módulo
  imports: [CommonModule, FormsModule],             // otros módulos que necesita
  exports: [ProductoComponent],                     // lo que ofrece a quien lo importe
  providers: [ProductoService],                     // servicios (scope, Sesión 8)
})
export class ProductosModule {}
```

### 0.1 Los cuatro metadatos clave 🔑

| Metadato | Qué contiene |
|---|---|
| **`declarations`** | Componentes, directivas y pipes que **pertenecen** a este módulo |
| **`imports`** | **Otros módulos** cuyas exportaciones este módulo necesita |
| **`exports`** | Lo que este módulo hace **público** para quien lo importe |
| **`providers`** | Servicios que registra (ver scopes, Sesión 8) |
| `bootstrap` | Solo en el módulo raíz: el componente inicial (`AppComponent`) |

> 🔑 Regla mental: *declaro lo mío, importo lo que uso, exporto lo que comparto.*

### 0.2 Reglas importantes
- Un componente/directiva/pipe se declara en **un solo** módulo (`declarations`). Declararlo en dos → error.
- Para usar un componente de otro módulo, ese módulo debe **exportarlo** y tú **importarlo**.
- `CommonModule` trae `*ngIf`, `*ngFor`, pipes (`date`, `currency`…). El módulo raíz usa `BrowserModule` (que ya incluye `CommonModule`).

---

## 1. El módulo raíz (`AppModule`)

En proyectos clásicos, todo arranca en `AppModule`:

```typescript
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent],   // ← componente raíz que se monta en <app-root>
})
export class AppModule {}
```
`main.ts` lo arranca con `platformBrowserDynamic().bootstrapModule(AppModule)` (Sesión 3).

---

## 2. Patrones de organización 🔑

En apps medianas/grandes con NgModules, se usan tres tipos de módulo por convención:

### 2.1 Feature Module
Agrupa todo lo de **una funcionalidad** (productos, usuarios, checkout). Se puede cargar de forma **lazy** (Sesión 16).
```typescript
@NgModule({
  declarations: [ListaProductosComponent, DetalleProductoComponent],
  imports: [CommonModule, ProductosRoutingModule],
})
export class ProductosModule {}
```
Ventaja: código cohesionado y **lazy loadable** → mejor rendimiento inicial.

### 2.2 Shared Module
Agrupa piezas **reutilizables** que usan varios features (componentes UI, pipes, directivas comunes). Se **importa** en cada feature que lo necesita.
```typescript
@NgModule({
  declarations: [BotonComponent, CardComponent, TruncarPipe],
  imports: [CommonModule],
  exports: [BotonComponent, CardComponent, TruncarPipe, CommonModule],  // re-exporta
})
export class SharedModule {}
```
> El SharedModule **re-exporta** lo común (incluido `CommonModule`) para que los features solo importen `SharedModule`. ⚠️ No pongas servicios singleton aquí si se importa en módulos lazy (crearía instancias duplicadas).

### 2.3 Core Module
Servicios **singleton** de toda la app (auth, logger, interceptors) y cosas que se cargan **una sola vez**. Se importa **solo en `AppModule`**.
```typescript
@NgModule({
  providers: [AuthService, LoggerService],   // (con providedIn:'root' esto ya no es necesario)
})
export class CoreModule {
  // guard: evita que se importe dos veces
  constructor(@Optional() @SkipSelf() core: CoreModule) {
    if (core) throw new Error('CoreModule ya está cargado. Importa solo en AppModule.');
  }
}
```
> El guard con `@Optional() @SkipSelf()` (Sesión 9) es el ejemplo clásico de esos decoradores: si el módulo ya existe en un injector superior, lanza error.

### Resumen

| Módulo | Contiene | Se importa en |
|---|---|---|
| **Feature** | Una funcionalidad | Lazy o en AppModule |
| **Shared** | UI/pipes/directivas reutilizables | Cada feature que lo use |
| **Core** | Servicios singleton, carga única | Solo AppModule |

---

## 3. Barrel Exports

Un **barrel** es un archivo `index.ts` que **re-exporta** varias cosas de una carpeta, para importar con una sola ruta limpia:

```typescript
// productos/index.ts (barrel)
export * from './lista.component';
export * from './detalle.component';
export * from './producto.service';
export * from './producto.model';
```
```typescript
// en vez de varios imports:
import { ListaComponent } from './productos/lista.component';
import { ProductoService } from './productos/producto.service';

// con barrel, uno solo:
import { ListaComponent, ProductoService } from './productos';
```

Ventaja: imports más limpios y refactors más fáciles.
⚠️ Cuidado: los barrels mal usados pueden crear **dependencias circulares** y afectar el tree-shaking/lazy loading. Úsalos para agrupar APIs públicas, no de forma indiscriminada.

---

## 4. `forRoot()` y `forChild()`

Patrón para módulos que ofrecen **servicios de configuración global**. `forRoot()` registra los providers (una vez, en el raíz); `forChild()` registra solo lo necesario en features:

```typescript
imports: [
  RouterModule.forRoot(routes),    // en AppModule: providers globales del router
  RouterModule.forChild(rutas),    // en features: solo rutas, sin duplicar servicios
]
```
Lo verás en `RouterModule`, `StoreModule` (NgRx), etc. Objetivo: evitar **duplicar servicios singleton** cuando el módulo se importa en varios sitios o de forma lazy.

---

## 5. Standalone: el fin del NgModule obligatorio 🔑

Desde Angular 15 (estable) y como **default en 17+**, los componentes/directivas/pipes pueden ser **standalone**: se declaran a sí mismos sus dependencias con `imports`, sin necesitar un NgModule.

```typescript
@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule, RouterLink, BotonComponent],  // importa lo que use directamente
  templateUrl: './producto.component.html',
})
export class ProductoComponent {}
```

### 5.1 Bootstrap sin módulos
```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),        // reemplaza RouterModule.forRoot
    provideHttpClient(),          // reemplaza HttpClientModule
  ],
});
```
Las funciones `provideX()` reemplazan a los `XModule`. El `app.config.ts` centraliza estos providers.

### 5.2 Rutas lazy con standalone
```typescript
{ path: 'admin', loadComponent: () => import('./admin.component').then(m => m.AdminComponent) }
```
Ya no necesitas un módulo por feature para hacer lazy loading (Sesión 16).

### 5.3 NgModules vs Standalone

| | NgModules (clásico) | Standalone (moderno) |
|---|---|---|
| Organización | Módulos agrupan piezas | Cada pieza declara sus imports |
| Boilerplate | Más | Menos |
| Dependencias | En el módulo | En el propio componente |
| Lazy loading | `loadChildren` (módulo) | `loadComponent` / `loadChildren` (rutas) |
| Config global | `XModule.forRoot()` | `provideX()` |
| Estado | Legacy pero muy presente | Recomendado en proyectos nuevos |

> En entrevista: *"Standalone es la dirección oficial; simplifica la organización y hace opcional el NgModule. Pero en proyectos existentes (Angular 8–16) los NgModules siguen siendo el pan de cada día, así que hay que dominar ambos."* Se pueden **mezclar**: un standalone puede importarse en un NgModule y viceversa.

---

## 6. Preguntas de entrevista

1. ¿Qué es un NgModule y qué contienen `declarations/imports/exports/providers`?
2. ¿Por qué un componente no puede declararse en dos módulos?
3. ¿Cómo usas un componente de otro módulo?
4. ¿Qué es un Feature Module, un Shared Module y un Core Module?
5. ¿Por qué el CoreModule solo se importa en AppModule y cómo lo garantizas?
6. ¿Qué es un barrel export y qué riesgo tiene?
7. ¿Para qué sirven `forRoot()` y `forChild()`?
8. ¿Qué es un componente standalone y qué ventaja aporta?
9. ¿Con qué reemplazas `RouterModule.forRoot` y `HttpClientModule` en standalone?
10. ¿Se pueden mezclar NgModules y standalone?

<details>
<summary>Respuestas resumidas</summary>

1. Clase que agrupa piezas. declarations=lo propio; imports=módulos que usa; exports=lo público; providers=servicios.
2. Cada declarable pertenece a un solo módulo; declararlo en dos rompe la unicidad y da error.
3. El otro módulo lo **exporta** y tú **importas** ese módulo.
4. Feature=una funcionalidad (lazy); Shared=reutilizables; Core=singletons y carga única.
5. Para evitar múltiples instancias de servicios singleton; con un guard `@Optional() @SkipSelf()` que lanza error si ya existe.
6. Un `index.ts` que re-exporta; riesgo de dependencias circulares y afectar tree-shaking.
7. Registrar providers globales una vez (`forRoot`) y solo lo necesario en features (`forChild`), evitando duplicados.
8. Componente que declara sus propios imports sin NgModule; menos boilerplate, default en v17+.
9. `provideRouter(routes)` y `provideHttpClient()`.
10. Sí; un standalone se importa en un NgModule y viceversa.

</details>

---

## ✅ Checklist para pasar a la Sesión 16

- [ ] Explico los 4 metadatos de `@NgModule`.
- [ ] Entiendo la regla "declaro/importo/exporto".
- [ ] Conozco Feature / Shared / Core module y su propósito.
- [ ] Sé qué es un barrel export y su riesgo.
- [ ] Entiendo `forRoot`/`forChild` y por qué existen.
- [ ] Distingo NgModules vs Standalone y sé que conviven.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 16 — Lazy Loading** (cómo funciona el chunking, preloading strategies, dynamic imports y su impacto en performance).
