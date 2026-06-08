# Angular Senior Engineering Masterclass

> **Interviewer Technical Guide & Senior Frontend Engineer Mastery**
> 
> Complete roadmap to master Angular internals, advanced patterns, and enterprise-grade frontend engineering.

---

## Table of Contents

1. [Fundamentos Internos de Angular](#fundamentos-internos-de-angular)
2. [Change Detection Profundo](#change-detection-profundo)
3. [Dependency Injection Profundo](#dependency-injection-profundo)
4. [Component Architecture Avanzado](#component-architecture-avanzado)
5. [RxJS Profundo en Angular](#rxjs-profundo-en-angular)
6. [Signals Profundo](#signals-profundo)
7. [Routing Avanzado](#routing-avanzado)
8. [Formularios Profundos](#formularios-profundos)
9. [State Management en Angular](#state-management-en-angular)
10. [Performance y Optimización](#performance-y-optimización)
11. [Angular Avanzado Enterprise](#angular-avanzado-enterprise)
12. [Seguridad en Angular](#seguridad-en-angular)
13. [Testing Profesional Angular](#testing-profesional-angular)
14. [Angular + TypeScript Avanzado](#angular--typescript-avanzado)
15. [Angular Build y Tooling](#angular-build-y-tooling)
16. [Angular SSR y Rendering Moderno](#angular-ssr-y-rendering-moderno)
17. [APIs y Comunicación](#apis-y-comunicación)
18. [Arquitectura Frontend Senior](#arquitectura-frontend-senior)
19. [Entrevistas Técnicas Senior Angular](#entrevistas-técnicas-senior-angular)

---

## Fundamentos Internos de Angular

### Qué es Angular Realmente

Angular no es simplemente un framework MVC. Es una **plataforma completa** para construir aplicaciones web, mobile, y desktop:

```typescript
// Angular Architecture Layers
/*
┌─────────────────────────────────────────┐
│         Application Layer                │  ← Your Components, Services
├─────────────────────────────────────────┤
│         Framework Layer                  │  ← Core (@angular/core)
│  - Components                            │
│  - Directives                            │
│  - Pipes                                │
│  - Dependency Injection                  │
├─────────────────────────────────────────┤
│         Renderer Layer                   │  ← DOM Abstraction
│  - DOM Renderer                         │
│  - Server Renderer (SSR)                 │
├─────────────────────────────────────────┤
│         Compiler Layer                   │  ← Ivy Compiler
│  - Template Parser                      │
│  - Type Checker                         │
│  - Code Generator                       │
├─────────────────────────────────────────┤
│         Platform Layer                   │  ← Browser/Server APIs
│  - Browser Platform                     │
│  - Server Platform                      │
└─────────────────────────────────────────┘
*/
```

### Arquitectura Interna de Angular

```typescript
// Angular Internal Architecture
/*
┌─────────────────────────────────────────────────────────────┐
│                    Application Bootstrap                     │
│  platformBrowserDynamic().bootstrapModule(AppModule)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Platform Bootstrap (platform-browser)          │
│  - Initialize Browser Platform                               │
│  - Initialize DOM Renderer                                  │
│  - Initialize Zone.js                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Module Bootstrap (AppModule)                    │
│  - Compile Components/Directives/Pipes                      │
│  - Create Root Injector                                     │
│  - Bootstrap Root Component                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Component Bootstrap                             │
│  - Create Component Instance                                │
│  - Initialize Change Detection                              │
│  - Render Template                                          │
└─────────────────────────────────────────────────────────────┘
*/
```

### Angular Compiler

```typescript
// Angular Ivy Compilation Pipeline
/*
Angular Template (.html)
    ↓
Template Parser (AST)
    ↓
Type Checker (TypeScript)
    ↓
Semantic Analyzer
    ↓
Code Generator (Ivy)
    ↓
Component Definition
    ↓
JavaScript Bundle
*/
```

**Ivy Compiler Internals:**

```typescript
// Ivy generates component definitions like this
// This is what Ivy compiles to (simplified)

const AppComponent = i0.ɵɵdefineComponent({
  type: AppComponent,
  selectors: [["app-root"]],
  decls: 2,
  vars: 0,
  template: function AppComponent_Template(rf, ctx) {
    if (rf & 1) {
      i0.ɵɵelementStart(0, "h1");
      i0.ɵɵtext(1, "Hello Angular");
      i0.ɵɵelementEnd();
    }
  },
  encapsulation: 2
});
```

### Ivy Internamente

**Ivy es el nuevo rendering engine de Angular (v9+):**

```typescript
// Ivy Characteristics
/*
1. Incremental DOM - Solo actualiza lo que cambia
2. Tree-shakeable - Elimina código no usado
3. Faster compilation - Compilación incremental
4. Smaller bundles - Mejor tree-shaking
5. Local compilation - No requiere compilación en runtime
*/

// View Engine (Old) vs Ivy (New)
/*
View Engine:
- Genera código complejo en runtime
- Difícil de tree-shake
- Compilación más lenta
- Bundles más grandes

Ivy:
- Genera código simple y directo
- Tree-shaking efectivo
- Compilación rápida y incremental
- Bundles más pequeños
- Mejor debugging
*/
```

### Rendering Engine

```typescript
// Angular's Rendering Abstraction
/*
┌─────────────────────────────────────────┐
│         Application                     │
├─────────────────────────────────────────┤
│         Renderer (Abstraction)         │
│  - Renderer2                           │
│  - DomRenderer2 (Browser)              │
│  - ServerRenderer (SSR)                │
├─────────────────────────────────────────┤
│         DOM / Virtual DOM              │
└─────────────────────────────────────────┘
*/

// Renderer2 API
interface Renderer2 {
  createElement(name: string, namespace?: string | null): any;
  createComment(value: string): any;
  createText(value: string): any;
  destroy(): void;
  appendChild(parent: any, newChild: any): void;
  insertBefore(parent: any, newChild: any, refChild: any): void;
  removeChild(parent: any, oldChild: any): void;
  selectRootElement(selectorOrNode: string | any): any;
  parentNode(node: any): any;
  nextSibling(node: any): any;
  setValue(node: any, value: string): void;
  listen(
    target: 'window' | 'document' | 'body' | any,
    eventName: string,
    callback: (event: any) => boolean | void
  ): () => void;
}
```

### Incremental DOM
Incremental DOM es una técnica de renderizado usada por Angular (especialmente con Ivy) para actualizar el DOM de manera extremadamente eficiente.

```typescript
// Incremental DOM Concept
/*
Traditional Virtual DOM (React):
- Compara todo el DOM virtual anterior con el nuevo
- Diff completo del árbol
- Puede ser costoso para árboles grandes

Angular Incremental DOM (Ivy):
- Solo actualiza lo que cambió
- Usa instrucciones específicas para actualizaciones
- Más eficiente para actualizaciones parciales
*/

// Example of Ivy's incremental updates
function AppComponent_Template(rf, ctx) {
  if (rf & 1) { // CREATE phase
    ɵɵelementStart(0, "div");
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) { // UPDATE phase
    ɵɵadvance(1);
    ɵɵtextInterpolate(ctx.message);
  }
}
```

### Change Detection Internamente

Detectar cambios en los datos y reflejarlos automáticamente en la UI.

```typescript
// Change Detection Mechanism
/*
┌─────────────────────────────────────────┐
│         Application State               │
├─────────────────────────────────────────┤
│         Zone.js                         │  ← Detects async events
├─────────────────────────────────────────┤
│         Change Detector                 │  ← Triggers CD
├─────────────────────────────────────────┤
│         Component Tree                  │  ← Runs CD top-down
│  - Check bindings                       │
│  - Update DOM                          │
│  - Run lifecycle hooks                 │
└─────────────────────────────────────────┘
*/
```

### Zone.js

```typescript
// Zone.js - Execution Context
/*
Zone.js intercepta todas las operaciones asíncronas:
- setTimeout/setInterval
- Promises
- Event listeners
- XHR/Fetch
- WebSocket

Cuando una operación asíncrona completa, Zone.js notifica a Angular
para ejecutar change detection.
*/

// Zone.js Patches (conceptual)
// Zone.js patches global APIs
const originalSetTimeout = window.setTimeout;
window.setTimeout = function(callback, delay) {
  return originalSetTimeout(() => {
    zone.run(() => callback());
  }, delay);
};

// Angular's NgZone
@Component({
  selector: 'app-example',
  template: `<button (click)="onClick()">Click</button>`
})
export class ExampleComponent {
  constructor(private ngZone: NgZone) {}

  onClick() {
    // Runs in Angular zone - triggers CD
    console.log('In Angular zone');
    
    // Runs outside Angular zone - no CD
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        console.log('Outside Angular zone');
        // Manually trigger CD if needed
        this.ngZone.run(() => {
          // Update state
        });
      }, 1000);
    });
  }
}
```

### Signals

```typescript
// Signals - Fine-grained reactivity (Angular 16+)
import { signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <div>Count: {{ count() }}</div>
    <div>Double: {{ doubleCount() }}</div>
    <button (click)="increment()">Increment</button>
  `
})
export class CounterComponent {
  // Writable signal
  count = signal(0);
  
  // Computed signal (derived)
  doubleCount = computed(() => this.count() * 2);
  
  // Effect (side effects)
  constructor() {
    effect(() => {
      console.log('Count changed:', this.count());
    });
  }
  
  increment() {
    this.count.update(value => value + 1);
  }
}

// Signals vs Traditional State
/*
Traditional:
- Relies on Zone.js for change detection
- Checks entire component tree
- Less fine-grained

Signals:
- Fine-grained reactivity
- Only updates what depends on changed signal
- Can work without Zone.js (Zone-less)
- Better performance
*/
```

### Dependency Injection Internamente

```typescript
// DI System Architecture
/*
┌─────────────────────────────────────────┐
│         Injector Tree                   │
│  - Platform Injector (root)             │
│  - Module Injectors                     │
│  - Element Injectors                    │
├─────────────────────────────────────────┤
│         Providers                      │
│  - Class Providers                     │
│  - Value Providers                     │
│  - Factory Providers                   │
│  - Existing Providers                  │
├─────────────────────────────────────────┤
│         Resolution                     │
│  - Hierarchical lookup                 │
│  - Singleton vs Instance               │
│  - Lazy loading                        │
└─────────────────────────────────────────┘
*/

// Internal DI Implementation (simplified)
class Injector {
  private providers = new Map();
  
  constructor(providers: Provider[]) {
    this.registerProviders(providers);
  }
  
  registerProviders(providers: Provider[]) {
    providers.forEach(provider => {
      this.providers.set(provider.provide, provider);
    });
  }
  
  get(token: any): any {
    const provider = this.providers.get(token);
    if (!provider) {
      throw new Error(`No provider for ${token}`);
    }
    
    if (provider.useClass) {
      return new provider.useClass();
    }
    
    if (provider.useFactory) {
      return provider.useFactory();
    }
    
    if (provider.useValue) {
      return provider.useValue;
    }
  }
}
```

### Metadata Reflection

```typescript
// Angular Decorators and Metadata
/*
Decorators in Angular use TypeScript metadata reflection:

@Component({
  selector: 'app-example',
  template: '<h1>Hello</h1>'
})
export class ExampleComponent {}

// Compiles to (simplified):
ExampleComponent.decorators = [
  {
    type: Component,
    args: [{
      selector: 'app-example',
      template: '<h1>Hello</h1>'
    }]
  }
];

ExampleComponent.ctorParameters = [];
ExampleComponent.propDecorators = {};
*/

// Reflection with reflect-metadata
import 'reflect-metadata';

@Component({
  selector: 'app-example',
  template: '<h1>Hello</h1>'
})
export class ExampleComponent {
  @Input() title: string;
  @Output() clicked = new EventEmitter();
}

// Accessing metadata
const designParamTypes = Reflect.getMetadata('design:paramtypes', ExampleComponent);
const propertyMetadata = Reflect.getMetadata('design:paramtypes', ExampleComponent.prototype, 'title');
```

### Decorators

Son funciones especiales que agregan metadata o modifican el comportamiento de:

clases
propiedades
métodos
parámetros

La idea principal:

Los decorators le dicen a Angular cómo debe interpretar una clase o miembro.

```typescript
// Custom Decorator Implementation
function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`${propertyKey} returned:`, result);
    return result;
  };
  
  return descriptor;
}

@Component({ selector: 'app-example', template: '' })
export class ExampleComponent {
  @Log
  doSomething(value: string) {
    return value.toUpperCase();
  }
}

// Parameter Decorators
function Inject(token: any) {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingTokens = Reflect.getMetadata('design:paramtypes', target) || [];
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata('design:paramtypes', existingTokens, target);
  };
}

class Service {
  constructor(@Inject('API_URL') private apiUrl: string) {}
}
```

### Bootstrapping

```typescript
// Angular Bootstrapping Process

El Bootstrapping es el proceso mediante el cual Angular:

Inicializa la aplicación y monta el componente raíz en el DOM.
/*
┌─────────────────────────────────────────┐
│         main.ts                         │
│  platformBrowserDynamic()               │
├─────────────────────────────────────────┤
│         Platform Bootstrap              │
│  - Initialize Browser Platform         │
│  - Initialize Renderer                 │
│  - Initialize Zone.js                  │
├─────────────────────────────────────────┤
│         Module Bootstrap               │
│  - Compile Module                      │
│  - Create Root Injector                │
├─────────────────────────────────────────┤
│         Component Bootstrap            │
│  - Create Component                    │
│  - Render Template                    │
│  - Start Change Detection              │
└─────────────────────────────────────────┘
*/

// main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));

// Bootstrap with options
platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    ngZoneEventCoalescing: true,  // Coalesce events
    ngZoneRunCoalescing: true     // Coalesce run() calls
  })
  .catch(err => console.error(err));
```

### Angular Runtime

```typescript
// Angular Runtime Components
El Angular Runtime es todo el conjunto de código y mecanismos que se ejecutan en el navegador DESPUÉS de que la aplicación fue compilada.
/*
┌─────────────────────────────────────────┐
│         @angular/core                  │
│  - Components                          │
│  - Directives                          │
│  - Pipes                               │
│  - Dependency Injection                 │
│  - Change Detection                    │
├─────────────────────────────────────────┤
│         @angular/common                │
│  - HTTP Client                         │
│  - Router                              │
│  - Forms                               │
├─────────────────────────────────────────┤
│         @angular/platform-browser       │
│  - Browser Platform                    │
│  - DOM Renderer                        │
├─────────────────────────────────────────┤
│         @angular/platform-server        │
│  - Server Platform (SSR)               │
└─────────────────────────────────────────┘
*/
```

### Angular CLI Internamente

```typescript
// Angular CLI Architecture
/*
┌─────────────────────────────────────────┐
│         CLI Commands                    │
│  ng new, ng serve, ng build            │
├─────────────────────────────────────────┤
│         Architect (Schematics)          │
│  - Application Schema                  │
│  - Class Schema                        │
│  - Component Schema                    │
├─────────────────────────────────────────┤
│         Builders                        │
│  - Browser Builder (Webpack/Vite)      │
│  - Server Builder (SSR)                │
├─────────────────────────────────────────┤
│         Workspace                       │
│  - Monorepo support                    │
│  - Library support                     │
└─────────────────────────────────────────┘
*/

// Custom Schematic
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

export function myComponent(options: any): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // Create component files
    tree.create('src/app/my.component.ts', componentTemplate);
    tree.create('src/app/my.component.html', htmlTemplate);
    tree.create('src/app/my.component.css', cssTemplate);
    
    // Update module
    const modulePath = 'src/app/app.module.ts';
    const moduleContent = tree.read(modulePath);
    // ... update module
    
    return tree;
  };
}
```

### Standalone Components

```typescript
// Standalone Components (Angular 14+)
Standalone es el nuevo modelo de arquitectura de Angular que elimina la necesidad de usar módulos tradicionales.
@Component({
  selector: 'app-user-card',
  template: `
    <div class="card">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
    </div>
  `,
  styles: [`
    .card { border: 1px solid #ccc; padding: 16px; }
  `],
  standalone: true,
  imports: [CommonModule, MatButtonModule]
})
export class UserCardComponent {
  @Input() user!: User;
}

// Standalone Component with providers
@Component({
  selector: 'app-user-list',
  template: `...`,
  standalone: true,
  imports: [UserCardComponent],
  providers: [UserService]
})
export class UserListComponent {
  constructor(private userService: UserService) {}
}

// Bootstrap standalone component
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent);
```

### Angular Build System

```typescript
// Angular Build Process
/*
┌─────────────────────────────────────────┐
│         Source Code                     │
│  .ts, .html, .css, .scss               │
├─────────────────────────────────────────┤
│         TypeScript Compiler            │
│  - Type checking                       │
│  - Transpilation to ES2020             │
├─────────────────────────────────────────┤
│         Angular Compiler (Ivy)         │
│  - Template compilation                │
│  - Component generation                │
├─────────────────────────────────────────┤
│         Bundler (Webpack/Vite)          │
│  - Module resolution                   │
│  - Tree shaking                        │
│  - Code splitting                     │
│  - Minification                       │
├─────────────────────────────────────────┤
│         Output                          │
│  main.js, polyfills.js, styles.css     │
└─────────────────────────────────────────┘
*/
```

### Tree Shaking

```typescript
// Tree Shaking in Angular
/*
Tree shaking elimina código no usado del bundle.

Angular Ivy mejora tree shaking porque:
1. Genera código más simple y directo
2. Usa estáticos en lugar de dinámicos
3. Mejor análisis de dependencias
*/

// Before (View Engine - harder to tree shake)
export class CommonModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: CommonModule,
      providers: [/* many providers */]
    };
  }
}

// After (Ivy - easier to tree shake)
// Ivy generates static component definitions
// Dead code elimination works better
```

### AOT vs JIT

```typescript
// AOT (Ahead-of-Time) vs JIT (Just-in-Time)
/*
JIT Compilation:
- Compiles templates in browser at runtime
- Slower initial load
- Larger bundle size
- Better for development
- ng serve uses JIT by default

AOT Compilation:
- Compiles templates at build time
- Faster initial load
- Smaller bundle size
- Better for production
- ng build --aot (default in production)
*/

// Enable AOT
ng build --aot

// Or in angular.json
"architect": {
  "build": {
    "options": {
      "aot": true
    }
  }
}

// JIT in development
ng serve --aot=false
```

### Hydration

```typescript
// Angular Hydration (Angular 17+)
/*
Hydration es el proceso de tomar HTML renderizado en el servidor
y attaching event listeners y state en el cliente.

Without Hydration:
- Server renders HTML
- Client re-renders entire app
- Flicker, slower TTI

With Hydration:
- Server renders HTML
- Client attaches to existing DOM
- No re-render, faster TTI
*/

// Enable hydration
import { provideClientHydration } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [provideClientHydration()]
});

// Hydration Events
@Component({
  selector: 'app-root',
  template: `{{ isHydrated ? 'Hydrated' : 'Loading' }}`
})
export class AppComponent {
  isHydrated = false;
  
  constructor() {
    afterNextRender(() => {
      this.isHydrated = true;
    });
  }
}
```

### SSR (Server-Side Rendering)

```typescript
// Angular Universal - SSR
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

// Client-side bootstrap
bootstrapApplication(AppComponent);

// Server-side bootstrap (server.ts)
import { renderApplication } from '@angular/platform-server';

app.get('*', (req, res) => {
  renderApplication(AppComponent, {
    document: '<app-root></app-root>',
    url: req.url
  }).then(html => {
    res.send(html);
  });
});

// SSR Benefits:
// - Better SEO (crawlers can read content)
// - Faster initial page load
// - Better performance on slow devices
// - Social media preview

// SSR Challenges:
// - Server resources
// - State management
// - Browser-specific APIs
// - Memory leaks
```

### Angular Universal

```typescript
// Angular Universal Setup
// server.ts
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';

const app = express();

app.engine('html', ngExpressEngine({
  bootstrap: AppServerModule,
}));

app.set('view engine', 'html');
app.set('views', join(DIST_FOLDER, 'browser'));

app.get('*', (req, res) => {
  res.render('index', { req });
});

app.listen(4000, () => {
  console.log('Node Express server listening on http://localhost:4000');
});

// main.server.ts
import { AppComponent } from './app/app.component';
import { bootstrapApplication } from '@angular/platform-server';

export default bootstrapApplication(AppComponent);
```

---

## Change Detection Profundo

### Cómo Funciona el Change Detection

```typescript
// Change Detection Flow
Es el mecanismo que detecta cambios en los datos y actualiza el DOM automáticamente.
/*
┌─────────────────────────────────────────┐
│         Async Event Occurs               │
│  (click, setTimeout, XHR, etc.)         │
├─────────────────────────────────────────┤
│         Zone.js Detects Event           │
│  Zone intercepts async operations       │
├─────────────────────────────────────────┤
│         NgZone Notifies Angular        │
│  onMicrotaskEmpty triggers              │
├─────────────────────────────────────────┤
│         Change Detection Runs          │
│  - Traverses component tree             │
│  - Checks bindings                      │
│  - Updates DOM if changed              │
├─────────────────────────────────────────┤
│         View Updates                    │
│  DOM is updated                        │
└─────────────────────────────────────────┘
*/
```

### Zone.js Internamente

```typescript
// Zone.js Execution Context
/*
Zone.js divides execution into zones:
- Root Zone (default)
- Angular Zone (NgZone)
- Custom Zones

Each zone can:
- Intercept async operations
- Track async tasks
- Run code on task completion
*/

// Zone.js Concept
const zone = Zone.current.fork({
  name: 'my-zone',
  onInvokeTask: (parentZoneDelegate, currentZone, targetZone, task, applyThis, applyArgs) => {
    console.log('Task invoked:', task);
    return parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs);
  },
  onHasTask: (parentZoneDelegate, currentZone, targetZone, hasTaskState) => {
    console.log('Task state changed:', hasTaskState);
    return parentZoneDelegate.hasTask(targetZone, hasTaskState);
  }
});

zone.run(() => {
  setTimeout(() => {
    console.log('In zone');
  }, 1000);
});

// Angular's NgZone
@Component({})
export class MyComponent {
  constructor(private ngZone: NgZone) {}
  
  runOutsideAngular() {
    this.ngZone.runOutsideAngular(() => {
      // This won't trigger change detection
      setTimeout(() => {
        console.log('Outside Angular zone');
      }, 1000);
    });
  }
}
```

### Default Strategy

```typescript
// Default Change Detection Strategy
La Default Strategy es el modo de Change Detection que Angular usa por defecto en todos los componentes si no especificas otra estrategia.
@Component({
  selector: 'app-default',
  template: `<div>{{ message }}</div>`,
  // changeDetection: ChangeDetectionStrategy.Default // (default)
})
export class DefaultComponent {
  message = 'Hello';
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  updateMessage() {
    // Triggers change detection for entire tree
    this.message = 'Updated';
  }
}

// Default strategy:
// - Checks component on every async event
// - Checks entire component tree
// - Easy to use but less performant
// - Good for small apps
```

### OnPush Internamente

La estrategia OnPush no es solo una “optimización superficial”. Internamente cambia cómo Angular decide si un componente debe ser revisado o no durante Change Detection.

```typescript
// OnPush Change Detection Strategy
@Component({
  selector: 'app-onpush',
  template: `<div [textContent]="data.message"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnPushComponent {
  @Input() data: any;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // Change detection only runs when:
  // 1. @Input reference changes
  // 2. Event from component or children
  // 3. Manual trigger (markForCheck, detectChanges)
  
  updateData() {
    // This won't trigger CD with OnPush
    this.data.message = 'Updated';
    
    // Must trigger manually
    this.cdr.markForCheck();
  }
}

// OnPush benefits:
// - Better performance
// - Fewer checks
// - Predictable updates
// - Required for performance optimization
```

### Signals vs RxJS

```typescript
// Signals vs RxJS for State Management
@Component({
  selector: 'app-comparison',
  template: `
    <h3>RxJS Approach</h3>
    <div>{{ rxjsMessage$ | async }}</div>
    <button (click)="updateRxjs()">Update RxJS</button>
    
    <h3>Signals Approach</h3>
    <div>{{ signalMessage() }}</div>
    <button (click)="updateSignal()">Update Signal</button>
  `
})
export class ComparisonComponent {
  // RxJS Approach
  private rxjsSubject = new BehaviorSubject<string>('Hello RxJS');
  rxjsMessage$ = this.rxjsSubject.asObservable();
  
  updateRxjs() {
    this.rxjsSubject.next('Updated RxJS');
  }
  
  // Signals Approach
  signalMessage = signal('Hello Signal');
  
  updateSignal() {
    this.signalMessage.set('Updated Signal');
  }
}

/*
RxJS:
- Powerful for complex async flows
- Operators for transformation
- Memory management (unsubscribe)
- Learning curve
- Overhead for simple cases

Signals:
- Simple for synchronous state
- Fine-grained reactivity
- No unsubscribe needed
- Easier to use
- Better performance for simple cases
*/
```

### markForCheck
es un método del sistema de Change Detection que se usa principalmente con la estrategia OnPush.
```typescript
// markForCheck - Manual Change Detection Trigger
@Component({
  selector: 'app-mark-for-check',
  template: `<div>{{ data }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarkForCheckComponent {
  @Input() data: any;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // Called when @Input changes
  ngOnChanges() {
    // Already scheduled for CD
  }
  
  updateDataInternally() {
    // Modify internal state
    this.data = 'Updated';
    
    // Manually schedule CD
    this.cdr.markForCheck();
  }
  
  // markForCheck ensures:
  // - Component is checked in next CD cycle
  // - Works with OnPush
  // - Doesn't run CD immediately
  // - Just marks for checking
}
```

### detectChanges

```typescript
// detectChanges - Immediate Change Detection
@Component({
  selector: 'app-detect-changes',
  template: `<div>{{ data }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetectChangesComponent {
  data = 'Initial';
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  updateImmediately() {
    this.data = 'Updated';
    
    // Runs CD immediately
    this.cdr.detectChanges();
  }
  
  // detectChanges:
  // - Runs CD synchronously
  // - Checks this component and children
  // - Can cause performance issues if overused
  // - Use sparingly
}
```

### detach

```typescript
// detach - Stop Change Detection
@Component({
  selector: 'app-detach',
  template: `<div>{{ data }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetachComponent {
  data = 'Initial';
  
  constructor(private cdr: ChangeDetectorRef) {
    // Stop automatic CD
    this.cdr.detach();
  }
  
  update() {
    this.data = 'Updated';
    
    // Won't update automatically
    // Must manually trigger
    this.cdr.detectChanges();
  }
  
  // detach use cases:
  // - Performance optimization
  // - Manual control
  // - Static content
  // - Complex animations
}
```

### reattach

```typescript
// reattach - Resume Change Detection
@Component({
  selector: 'app-reattach',
  template: `<div>{{ data }}</div>`
})
export class ReattachComponent {
  data = 'Initial';
  
  constructor(private cdr: ChangeDetectorRef) {
    // Detach initially
    this.cdr.detach();
  }
  
  enableCD() {
    // Resume automatic CD
    this.cdr.reattach();
  }
  
  disableCD() {
    // Stop automatic CD
    this.cdr.detach();
  }
  
  // reattach use cases:
  // - Temporarily disable CD
  // - Re-enable when needed
  // - Dynamic CD control
}
```

### AsyncPipe Internamente

```typescript
// AsyncPipe Implementation (simplified)
El AsyncPipe es un pipe integrado de Angular que permite consumir valores asíncronos directamente desde el template.
@Pipe({
  name: 'async',
  pure: false
})
export class AsyncPipe implements OnDestroy {
  private subscription: Subscription | null = null;
  private latestValue: any = null;
  
  constructor(private ref: ChangeDetectorRef) {}
  
  transform(obj: Observable<any>): any {
    if (!this.subscription) {
      this.subscription = obj.subscribe(value => {
        this.latestValue = value;
        this.ref.markForCheck();
      });
    }
    
    return this.latestValue;
  }
  
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

// AsyncPipe:
// - Subscribes to observable
// - Unsubscribes on destroy
// - Triggers CD on new value
// - Handles memory management
```

### Event Propagation

```typescript
// Event Propagation in Change Detection
La Event Propagation es el mecanismo del navegador que define cómo viajan los eventos DOM (click, input, etc.) a través de los elementos HTML.
@Component({
  selector: 'app-parent',
  template: `
    <app-child (customEvent)="handleEvent($event)"></app-child>
  `
})
export class ParentComponent {
  handleEvent(event: any) {
    console.log('Event received:', event);
  }
}

@Component({
  selector: 'app-child',
  template: `<button (click)="emitEvent()">Click</button>`
})
export class ChildComponent {
  @Output() customEvent = new EventEmitter<any>();
  
  emitEvent() {
    this.customEvent.emit({ data: 'value' });
  }
}

// Event propagation:
// - Bubbles up component tree
// - Triggers CD in parent
// - Can be stopped
// - Used for parent-child communication
```

### Dirty Checking

```typescript
// Dirty Checking Mechanism
/*
Angular uses dirty checking to detect changes:

1. Store previous value
2. Get current value
3. Compare
4. If different, update DOM
5. Repeat for all bindings
*/

// Simplified dirty check
function dirtyCheck(component: any) {
  const changes: PropertyChange[] = [];
  
  for (const property of component.properties) {
    const oldValue = component.previousValues[property];
    const newValue = component[property];
    
    if (oldValue !== newValue) {
      changes.push({ property, oldValue, newValue });
      component.previousValues[property] = newValue;
    }
  }
  
  if (changes.length > 0) {
    updateDOM(changes);
  }
}

// Angular's dirty checking:
// - Efficient comparison
// - Only checks bindings
// - Skips unchanged components (OnPush)
// - Optimized with Ivy
```

### Performance Implications

```typescript
// Change Detection Performance
@Component({
  selector: 'app-performance',
  template: `
    <div *ngFor="let item of items">{{ item }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceComponent {
  @Input() items: any[] = [];
  
  // Performance optimizations:
  
  // 1. Use OnPush strategy
  changeDetection = ChangeDetectionStrategy.OnPush;
  
  // 2. Use trackBy with ngFor
  trackByFn(index: number, item: any) {
    return item.id;
  }
  
  // 3. Run outside Angular when possible
  constructor(private ngZone: NgZone) {
    this.ngZone.runOutsideAngular(() => {
      // Heavy computation
    });
  }
  
  // 4. Detach when static
  detachWhenStatic() {
    this.cdr.detach();
  }
  
  // 5. Manual CD control
  manualCD() {
    this.cdr.detectChanges();
  }
}
```

### Cómo Optimizar Rendering

```typescript
// Rendering Optimization Strategies
@Component({
  selector: 'app-optimized',
  template: `
    <div *ngFor="let item of items; trackBy: trackById">
      {{ item.name }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {
  @Input() items: any[] = [];
  
  // trackBy - Essential for performance
  trackById(index: number, item: any) {
    return item.id; // Unique identifier
  }
  
  // trackBy benefits:
  // - Prevents unnecessary DOM recreation
  // - Maintains component state
  // - Better performance for large lists
  // - Critical for virtual scrolling
  
  // Virtual scrolling for large lists
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  
  items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));
}

// Other optimizations:
// 1. OnPush strategy
// 2. trackBy with ngFor
// 3. Virtual scrolling
// 4. Lazy loading
// 5. Code splitting
// 6. Pure pipes
// 7. Memoization
```

---

## Dependency Injection Profundo

### Injector Tree

```typescript
// Hierarchical Injector Tree
/*
┌─────────────────────────────────────────┐
│         Platform Injector (Root)        │  ← @angular/platform-browser
│  - Browser platform providers           │
│  - Renderer providers                  │
├─────────────────────────────────────────┤
│         Root Injector (AppModule)       │  ← @NgModule({ providers: [] })
│  - App-level providers                 │
├─────────────────────────────────────────┤
│         Module Injectors               │  ← Feature modules
│  - Module-level providers              │
├─────────────────────────────────────────┤
│         Component Injectors            │  ← @Component({ providers: [] })
│  - Component-level providers           │
└─────────────────────────────────────────┘
*/

// Provider resolution flows up the tree
// Component → Module → Root → Platform
```

### Hierarchical Injectors

```typescript
// Hierarchical Dependency Injection
@NgModule({
  providers: [
    { provide: 'API_URL', useValue: 'https://api.example.com' }
  ]
})
export class AppModule {}

@Component({
  selector: 'app-root',
  template: '',
  providers: [
    { provide: 'API_URL', useValue: 'https://local.api' } // Overrides parent
  ]
})
export class AppComponent {
  constructor(@Inject('API_URL') private apiUrl: string) {
    console.log(apiUrl); // 'https://local.api'
  }
}

// Hierarchy:
// - Child providers override parent
// - Parent providers available to children
// - Singleton at each level
// - Enables feature isolation
```

### Root Injector

```typescript
// Root Injector Configuration
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  providers: [
    // Root-level services (singletons)
    AuthService,
    ApiService,
    {
      provide: 'CONFIG',
      useValue: { apiUrl: 'https://api.example.com' }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

// Root injector characteristics:
// - Created at app bootstrap
// - Singleton services
// - Available to entire app
// - Created once
```

### Platform Injector

```typescript
// Platform Injector
/*
Platform injector is created before root injector.
It contains platform-level providers.
*/

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// Platform providers (simplified)
const platformProviders = [
  { provide: PLATFORM_ID, useValue: 'browser' },
  { provide: DOCUMENT, useValue: document }
];

// Platform injector is created internally
// Cannot be modified after creation
```

### Element Injector

```typescript
// Element Injector (Component-level)
@Component({
  selector: 'app-child',
  template: '',
  providers: [
    ChildService // Instance per component
  ]
})
export class ChildComponent {
  constructor(private childService: ChildService) {}
}

// Element injector:
// - Created for each component instance
// - Providers are instance-scoped
// - Not shared with other components
// - Good for component-specific services
```

### Injection Tokens

```typescript
// Injection Tokens for Non-Class Dependencies
import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('api-url');
export const CONFIG = new InjectionToken<AppConfig>('app-config');

@NgModule({
  providers: [
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: CONFIG, useValue: { debug: true, version: '1.0' } }
  ]
})
export class AppModule {}

@Component({
  selector: 'app-root',
  template: ''
})
export class AppComponent {
  constructor(
    @Inject(API_URL) private apiUrl: string,
    @Inject(CONFIG) private config: AppConfig
  ) {}
}

// Injection tokens:
// - For non-class dependencies
// - Type-safe injection
// - Avoid string-based injection
// - Better than OpaqueToken (deprecated)
```

### Multi Providers

```typescript
// Multi Providers - Multiple values for same token
export const LOGGER = new InjectionToken<Logger>('logger');

@NgModule({
  providers: [
    { provide: LOGGER, useClass: ConsoleLogger, multi: true },
    { provide: LOGGER, useClass: FileLogger, multi: true }
  ]
})
export class AppModule {}

@Component({
  selector: 'app-root',
  template: ''
})
export class AppComponent {
  constructor(@Inject(LOGGER) private loggers: Logger[]) {
    // loggers is an array: [ConsoleLogger, FileLogger]
    loggers.forEach(logger => logger.log('App initialized'));
  }
}

// Multi providers:
// - Provide multiple implementations
// - Useful for plugins, loggers, validators
// - Injected as array
```

### Factory Providers

```typescript
// Factory Providers - Dynamic dependency creation
export const API_SERVICE_FACTORY = {
  provide: ApiService,
  useFactory: (http: HttpClient, config: AppConfig) => {
    return new ApiService(http, config.apiUrl);
  },
  deps: [HttpClient, AppConfig]
};

@NgModule({
  providers: [API_SERVICE_FACTORY]
})
export class AppModule {}

// Complex factory
export const DATA_SERVICE = {
  provide: DataService,
  useFactory: (http: HttpClient, @Inject(API_URL) apiUrl: string) => {
    const isProduction = apiUrl.includes('production');
    return isProduction 
      ? new CachedDataService(http)
      : new DirectDataService(http);
  },
  deps: [HttpClient, API_URL]
};

// Factory providers:
// - Dynamic logic
// - Conditional creation
// - Complex dependencies
```

### Value Providers

```typescript
// Value Providers - Simple values
@NgModule({
  providers: [
    { provide: 'API_URL', useValue: 'https://api.example.com' },
    { provide: 'DEBUG', useValue: true },
    { provide: 'VERSION', useValue: '1.0.0' }
  ]
})
export class AppModule {}

// Value providers:
// - Simple values
// - Configuration objects
// - Constants
// - Not for services
```

### Existing Providers

```typescript
// Existing Providers - Alias existing provider
@NgModule({
  providers: [
    { provide: Logger, useClass: ConsoleLogger },
    // Alias ConsoleLogger as Logger
    { provide: AdvancedLogger, useExisting: Logger }
  ]
})
export class AppModule {}

// useExisting:
// - Alias for existing provider
// - Same instance
// - Useful for interfaces
```

### Circular Dependencies

```typescript
// Circular Dependencies Problem
/*
Service A depends on Service B
Service B depends on Service A
→ Circular dependency error
*/

// Solution 1: ForwardRef
import { Injectable, forwardRef } from '@angular/core';

@Injectable()
export class ServiceA {
  constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(@Inject(forwardRef(() => ServiceA)) private serviceA: ServiceA) {}
}

// Solution 2: Refactor architecture
// Extract common logic to separate service
@Injectable()
export class SharedService {
  commonLogic() {}
}

@Injectable()
export class ServiceA {
  constructor(private shared: SharedService) {}
}

@Injectable()
export class ServiceB {
  constructor(private shared: SharedService) {}
}

// Solution 3: Use Observable pattern
@Injectable()
export class ServiceA {
  private data$ = new BehaviorSubject<any>(null);
  
  getData() {
    return this.data$.asObservable();
  }
  
  setData(data: any) {
    this.data$.next(data);
  }
}

@Injectable()
export class ServiceB {
  constructor(private serviceA: ServiceA) {
    this.serviceA.getData().subscribe(data => {
      // Process data without direct dependency
    });
  }
}
```

### Injection Scopes

```typescript
// Injection Scopes - providedIn
@Injectable({
  providedIn: 'root' // Singleton at root level
})
export class GlobalService {}

@Injectable({
  providedIn: 'platform' // Singleton at platform level
})
export class PlatformService {}

// Component-level (instance per component)
@Component({
  selector: 'app-example',
  providers: [LocalService]
})
export class ExampleComponent {
  constructor(private localService: LocalService) {}
}

// providedIn vs providers array:
/*
providedIn: 'root'
- Tree-shakeable
- Singleton
- Better for most services

providers: []
- Not tree-shakeable
- Instance per module/component
- For specific scenarios
*/
```

### Lazy Providers

```typescript
// Lazy Providers - Load on demand
export const LAZY_SERVICE = {
  provide: LazyService,
  useFactory: () => import('./lazy.service').then(m => new m.LazyService()),
  deps: []
};

@NgModule({
  providers: [LAZY_SERVICE]
})
export class AppModule {}

// Or with makeProvider
import { makeEnvironmentProviders } from '@angular/core';

export const appProviders = makeEnvironmentProviders([
  {
    provide: LazyService,
    useFactory: () => import('./lazy.service').then(m => new m.LazyService())
  }
]);

bootstrapApplication(AppComponent, {
  providers: [appProviders]
});

// Lazy providers:
- Load code when needed
- Reduce initial bundle
- Better performance
- Tree-shakeable
```

---

## Component Architecture Avanzado

### Smart vs Dumb Components

```typescript
// Smart Component (Container)
@Component({
  selector: 'app-user-list-container',
  template: `
    <app-user-list
      [users]="users$ | async"
      [loading]="loading$ | async"
      [error]="error$ | async"
      (userSelected)="onUserSelected($event)"
      (refresh)="onRefresh()"
    ></app-user-list>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListContainerComponent {
  users$ = this.userService.getUsers();
  loading$ = this.userService.loading$;
  error$ = this.userService.error$;
  
  constructor(private userService: UserService) {}
  
  onUserSelected(user: User) {
    this.userService.selectUser(user);
  }
  
  onRefresh() {
    this.userService.loadUsers();
  }
}

// Dumb Component (Presentational)
@Component({
  selector: 'app-user-list',
  template: `
    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error">{{ error }}</div>
    <div *ngIf="users">
      <div *ngFor="let user of users; trackBy: trackById"
           (click)="selectUser.emit(user)"
           class="user-item">
        {{ user.name }}
      </div>
    </div>
    <button (click)="refresh.emit()">Refresh</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
  @Input() users: User[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Output() userSelected = new EventEmitter<User>();
  @Output() refresh = new EventEmitter<void>();
  
  selectUser(user: User) {
    this.userSelected.emit(user);
  }
  
  trackById(index: number, user: User) {
    return user.id;
  }
}

/*
Smart Component (Container):
- Manages state
- Handles business logic
- Communicates with services
- No direct UI concerns
- Testable with mock services

Dumb Component (Presentational):
- Receives data via @Input
- Emits events via @Output
- No business logic
- Pure UI component
- Highly reusable
*/
```

### Container/Presentational Pattern

```typescript
// Complete Container/Presentational Architecture
// container/user.container.ts
@Component({
  selector: 'app-user-container',
  template: `
    <app-user-presentational
      [user]="user$ | async"
      [loading]="loading$ | async"
      (save)="onSave($event)"
      (delete)="onDelete()"
    ></app-user-presentational>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserContainerComponent {
  user$ = this.userService.getUser(this.userId);
  loading$ = this.userService.loading$;
  
  constructor(
    private userService: UserService,
    private route: ActivatedRoute
  ) {
    this.userId = this.route.snapshot.paramMap.get('id')!;
  }
  
  onSave(userData: UserData) {
    this.userService.updateUser(this.userId, userData);
  }
  
  onDelete() {
    this.userService.deleteUser(this.userId);
  }
}

// presentational/user.component.ts
@Component({
  selector: 'app-user-presentational',
  template: `
    <div *ngIf="loading">Loading...</div>
    <form *ngIf="user" [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" />
      <input formControlName="email" />
      <button type="submit">Save</button>
      <button type="button" (click)="delete.emit()">Delete</button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPresentationalComponent {
  @Input() user: User | null = null;
  @Input() loading = false;
  @Output() save = new EventEmitter<UserData>();
  @Output() delete = new EventEmitter<void>();
  
  form = new FormGroup({
    name: new FormControl(''),
    email: new FormControl('')
  });
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['user'] && this.user) {
      this.form.patchValue(this.user);
    }
  }
  
  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }
}
```

### Feature Modules

```typescript
// Feature Module Structure
@NgModule({
  declarations: [
    UserListComponent,
    UserDetailComponent,
    UserFormComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: UserListComponent },
      { path: ':id', component: UserDetailComponent },
      { path: 'new', component: UserFormComponent }
    ])
  ],
  providers: [
    UserService, // Feature-scoped service
    UserGuard
  ]
})
export class UserModule {}

// Lazy Loading Feature Module
const routes: Routes = [
  {
    path: 'users',
    loadChildren: () => import('./user/user.module').then(m => m.UserModule)
  }
];

// Benefits of feature modules:
// - Code splitting
// - Lazy loading
// - Encapsulation
// - Clear boundaries
// - Better organization
```

### Standalone Architecture

```typescript
// Standalone Component Architecture (Angular 14+)
@Component({
  selector: 'app-user-card',
  template: `
    <div class="card">
      <h2>{{ user().name }}</h2>
      <p>{{ user().email }}</p>
      <button (click)="edit.emit()">Edit</button>
    </div>
  `,
  styles: [`
    .card { border: 1px solid #ccc; padding: 16px; border-radius: 8px; }
  `],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCardComponent {
  @Input({ required: true }) user!: Signal<User>;
  @Output() edit = new EventEmitter<void>();
}

// Standalone Feature
@Component({
  selector: 'app-user-list',
  template: `
    <div *ngFor="let user of users(); trackBy: trackById">
      <app-user-card [user]="userSignal(user)" (edit)="onEdit(user)" />
    </div>
  `,
  standalone: true,
  imports: [UserCardComponent, CommonModule]
})
export class UserListComponent {
  users = input.required<User[]>();
  
  userSignal(user: User): Signal<User> {
    return signal(user);
  }
  
  trackById(index: number, user: User) {
    return user.id;
  }
  
  onEdit(user: User) {
    // Emit to parent
  }
}

// Bootstrap standalone app
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(HttpClientModule)
  ]
});

// Standalone benefits:
// - No modules needed
// - Better tree-shaking
// - Clearer dependencies
// - Easier migration
// - Better for micro-frontends
```

### Component Composition

```typescript
// Component Composition Patterns
@Component({
  selector: 'app-data-table',
  template: `
    <table>
      <thead>
        <ng-content select="[header]"></ng-content>
      </thead>
      <tbody>
        <ng-content select="[row]"></ng-content>
      </tbody>
      <tfoot>
        <ng-content select="[footer]"></ng-content>
      </tfoot>
    </table>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class DataTableComponent {}

// Usage
@Component({
  selector: 'app-users-page',
  template: `
    <app-data-table>
      <tr header>
        <th>Name</th>
        <th>Email</th>
      </tr>
      <tr *ngFor="let user of users" row>
        <td>{{ user.name }}</td>
        <td>{{ user.email }}</td>
      </tr>
      <tr footer>
        <td colspan="2">Total: {{ users.length }}</td>
      </tr>
    </app-data-table>
  `,
  standalone: true,
  imports: [DataTableComponent, CommonModule]
})
export class UsersPageComponent {
  users = input<User[]>([]);
}

// Composition benefits:
// - Reusable components
// - Flexible templates
// - Clear separation
// - Better testability
```

### Dynamic Components

```typescript
// Dynamic Component Loading
@Component({
  selector: 'app-dynamic-loader',
  template: `
    <ng-container #container></ng-container>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class DynamicLoaderComponent {
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
  
  @Input() component!: Type<any>;
  @Input() data: any;
  
  ngOnChanges() {
    if (this.component) {
      this.loadComponent();
    }
  }
  
  loadComponent() {
    this.container.clear();
    const componentRef = this.container.createComponent(this.component);
    
    if (this.data) {
      Object.assign(componentRef.instance, this.data);
    }
  }
}

// Usage
@Component({
  selector: 'app-page',
  template: `
    <app-dynamic-loader
      [component]="currentComponent"
      [data]="componentData"
    ></app-dynamic-loader>
    <button (click)="loadComponent('profile')">Profile</button>
    <button (click)="loadComponent('settings')">Settings</button>
  `,
  standalone: true,
  imports: [DynamicLoaderComponent]
})
export class PageComponent {
  currentComponent: any;
  componentData: any;
  
  components = {
    profile: ProfileComponent,
    settings: SettingsComponent
  };
  
  loadComponent(name: string) {
    this.currentComponent = this.components[name];
    this.componentData = { /* data */ };
  }
}

// Dynamic component benefits:
// - Runtime component selection
// - Plugin architecture
// - Code splitting
// - Flexible UI
```

### Content Projection

```typescript
// Multi-slot Content Projection
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="card-header">
        <ng-content select="[header]"></ng-content>
      </div>
      <div class="card-body">
        <ng-content select="[body]"></ng-content>
      </div>
      <div class="card-footer">
        <ng-content select="[footer]"></ng-content>
      </div>
      <div class="card-default">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class CardComponent {}

// Usage
<app-card>
  <div header>Card Title</div>
  <div body>Card content goes here</div>
  <div footer>Card footer</div>
  <div>Default content</div>
</app-card>

// Conditional content projection
@Component({
  selector: 'app-modal',
  template: `
    <div class="modal" *ngIf="visible">
      <div class="modal-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class ModalComponent {
  @Input() visible = false;
}
```

### ViewContainerRef

```typescript
// ViewContainerRef - Dynamic View Management
@Component({
  selector: 'app-dynamic-tabs',
  template: `
    <div class="tabs">
      <button *ngFor="let tab of tabs; let i = index"
              (click)="selectTab(i)"
              [class.active]="activeTab === i">
        {{ tab.title }}
      </button>
    </div>
    <div class="tab-content">
      <ng-container #container></ng-container>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class DynamicTabsComponent {
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
  
  tabs = input.required<{ title: string; component: Type<any> }[]>();
  activeTab = signal(0);
  
  private componentRefs: ComponentRef<any>[] = [];
  
  ngOnChanges() {
    this.loadTab(this.activeTab());
  }
  
  selectTab(index: number) {
    this.activeTab.set(index);
    this.loadTab(index);
  }
  
  loadTab(index: number) {
    this.container.clear();
    this.componentRefs = [];
    
    const componentRef = this.container.createComponent(this.tabs()[index].component);
    this.componentRefs.push(componentRef);
  }
  
  ngOnDestroy() {
    this.componentRefs.forEach(ref => ref.destroy());
  }
}
```

### Embedded Views

```typescript
// Embedded Views with TemplateRef
@Component({
  selector: 'app-conditional-render',
  template: `
    <ng-template #successTemplate>
      <div class="success">Operation successful!</div>
    </ng-template>
    
    <ng-template #errorTemplate>
      <div class="error">Operation failed!</div>
    </ng-template>
    
    <ng-container *ngIf="status === 'success'; then successTemplate else errorTemplate"></ng-container>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class ConditionalRenderComponent {
  @Input() status: 'success' | 'error' = 'success';
}

// Manual embedded view management
@Component({
  selector: 'app-template-manager',
  template: `
    <ng-template #defaultTemplate>
      <div>Default content</div>
    </ng-template>
    
    <ng-container #container></ng-container>
    <button (click)="showDefault()">Show Default</button>
    <button (click)="clear()">Clear</button>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class TemplateManagerComponent {
  @ViewChild('defaultTemplate', { read: TemplateRef }) defaultTemplate!: TemplateRef<any>;
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
  
  showDefault() {
    this.container.clear();
    this.container.createEmbeddedView(this.defaultTemplate);
  }
  
  clear() {
    this.container.clear();
  }
}
```

### Structural Directives Internamente

```typescript
// Custom Structural Directive
@Directive({
  selector: '[appUnless]',
  standalone: true
})
export class UnlessDirective {
  private hasView = false;
  
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}
  
  @Input() set appUnless(condition: boolean) {
    if (!condition && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (condition && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

// Usage
<div *appUnless="isVisible">This is hidden when isVisible is true</div>

// Structural directive internals:
/*
1. Angular creates TemplateRef from template
2. Directive receives TemplateRef and ViewContainerRef
3. Directive creates/destroys embedded views
4. ViewContainerRef manages view lifecycle
*/
```

### Attribute Directives

```typescript
// Custom Attribute Directive
@Directive({
  selector: '[appHighlight]',
  standalone: true
})
export class HighlightDirective implements OnInit {
  @Input() appHighlight = '';
  @Input() defaultColor = 'yellow';
  
  constructor(private el: ElementRef, private renderer: Renderer2) {}
  
  ngOnInit() {
    this.renderer.setStyle(
      this.el.nativeElement,
      'backgroundColor',
      this.appHighlight || this.defaultColor
    );
  }
}

// Host binding
@Directive({
  selector: '[appHover]',
  standalone: true,
  host: {
    '[class.hovered]': 'isHovered'
  }
})
export class HoverDirective {
  isHovered = false;
  
  @HostListener('mouseenter') onMouseEnter() {
    this.isHovered = true;
  }
  
  @HostListener('mouseleave') onMouseLeave() {
    this.isHovered = false;
  }
}
```

### Host Bindings

```typescript
// Host Binding - Bind to Host Element
@Component({
  selector: 'app-button',
  template: `<ng-content></ng-content>`,
  host: {
    '[class.btn-primary]': 'variant === "primary"',
    '[class.btn-secondary]': 'variant === "secondary"',
    '[attr.disabled]': 'disabled',
    '(click)': 'onClick()'
  },
  standalone: true
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
  @Output() clicked = new EventEmitter<void>();
  
  onClick() {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}

// HostListener
@Directive({
  selector: '[appClickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();
  
  constructor(private elementRef: ElementRef) {}
  
  @HostListener('document:click', ['$event.target'])
  onClick(target: HTMLElement) {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
```

### Signals Architecture

```typescript
// Signal-based Component Architecture
@Component({
  selector: 'app-signal-counter',
  template: `
    <div>Count: {{ count() }}</div>
    <div>Doubled: {{ doubledCount() }}</div>
    <button (click)="increment()">Increment</button>
    <button (click)="reset()">Reset</button>
  `,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignalCounterComponent {
  // Writable signal
  count = signal(0);
  
  // Computed signal (derived)
  doubledCount = computed(() => this.count() * 2);
  
  // Effect (side effects)
  constructor() {
    effect(() => {
      console.log('Count changed:', this.count());
      // Save to localStorage, analytics, etc.
    });
  }
  
  increment() {
    this.count.update(value => value + 1);
  }
  
  reset() {
    this.count.set(0);
  }
}

// Signal-based service
@Injectable({ providedIn: 'root' })
export class CounterService {
  private count = signal(0);
  
  readonly count = this.count.asReadonly();
  
  increment() {
    this.count.update(value => value + 1);
  }
  
  decrement() {
    this.count.update(value => value - 1);
  }
  
  reset() {
    this.count.set(0);
  }
}
```

### Reusable UI Systems

```typescript
// Design System with Signals
@Component({
  selector: 'app-button',
  template: `
    <button
      [class]="classes()"
      [disabled]="disabled()"
      (click)="handleClick()">
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .btn { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; }
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
  size = input<'small' | 'medium' | 'large'>('medium');
  disabled = input(false);
  
  classes = computed(() => {
    return [
      'btn',
      `btn-${this.variant()}`,
      `btn-${this.size()}`
    ].join(' ');
  });
  
  @Output() clicked = new EventEmitter<void>();
  
  handleClick() {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}

// Reusable input component
@Component({
  selector: 'app-input',
  template: `
    <div class="input-group">
      <label *ngIf="label()">{{ label() }}</label>
      <input
        [type]="type()"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($event)"
        [disabled]="disabled()"
      />
      <div *ngIf="error()" class="error">{{ error() }}</div>
    </div>
  `,
  styles: [`
    .input-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 4px; }
    input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .error { color: red; font-size: 12px; margin-top: 4px; }
  `],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent {
  label = input<string>('');
  type = input<'text' | 'email' | 'password'>('text');
  placeholder = input<string>('');
  value = model<string>('');
  disabled = input(false);
  error = input<string>('');
  
  onInput(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
```

---

## RxJS Profundo en Angular

### Observables Internamente

```typescript
// Observable Internals
/*
Observable is a representation of any set of values over time.

Observable Lifecycle:
1. Creation
2. Subscription
3. Emission of values
4. Completion or Error
5. Unsubscription
*/

// Custom Observable
class CustomObservable extends Observable<number> {
  constructor() {
    super(subscriber => {
      let count = 0;
      const interval = setInterval(() => {
        subscriber.next(count++);
        if (count > 5) {
          subscriber.complete();
          clearInterval(interval);
        }
      }, 1000);
      
      return () => {
        clearInterval(interval);
      };
    });
  }
}

// Usage
const custom$ = new CustomObservable();
custom$.subscribe({
  next: value => console.log(value),
  complete: () => console.log('Complete')
});
```

### Cold vs Hot Observables

```typescript
// Cold Observable
const cold$ = new Observable(subscriber => {
  subscriber.next(Math.random());
});

// Each subscription gets new value
cold$.subscribe(val => console.log('Sub 1:', val));
cold$.subscribe(val => console.log('Sub 2:', val));
// Different values for each subscription

// Hot Observable (Subject)
const hot$ = new Subject<number>();
const random = Math.random();
hot$.next(random);

// All subscriptions share same value
hot$.subscribe(val => console.log('Sub 1:', val));
hot$.subscribe(val => console.log('Sub 2:', val));

// Using share to make cold observable hot
const shared$ = new Observable(subscriber => {
  subscriber.next(Math.random());
}).pipe(share());

shared$.subscribe(val => console.log('Sub 1:', val));
shared$.subscribe(val => console.log('Sub 2:', val));
// Same value for all subscriptions
```

### Subjects

```typescript
// Subject - Multicast Observable
const subject = new Subject<number>();

subject.subscribe(val => console.log('Observer 1:', val));
subject.subscribe(val => console.log('Observer 2:', val));

subject.next(1);
subject.next(2);
// Both observers receive same values

// BehaviorSubject - Has initial value
const behaviorSubject = new BehaviorSubject<number>(0);

behaviorSubject.subscribe(val => console.log('Observer 1:', val)); // 0
behaviorSubject.next(1); // 1
behaviorSubject.subscribe(val => console.log('Observer 2:', val)); // 1

// ReplaySubject - Replays N values
const replaySubject = new ReplaySubject<number>(2);

replaySubject.next(1);
replaySubject.next(2);
replaySubject.next(3);

replaySubject.subscribe(val => console.log(val)); // 2, 3

// AsyncSubject - Emits last value on complete
const asyncSubject = new AsyncSubject<number>();

asyncSubject.next(1);
asyncSubject.next(2);
asyncSubject.next(3);
asyncSubject.complete();

asyncSubject.subscribe(val => console.log(val)); // 3 (last value)
```

### BehaviorSubject

```typescript
// BehaviorSubject in Angular Service
@Injectable({ providedIn: 'root' })
export class UserService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  
  constructor() {
    this.loadUser();
  }
  
  private loadUser() {
    this.http.get<User>('/api/user').subscribe(user => {
      this.userSubject.next(user);
    });
  }
  
  updateUser(user: User) {
    this.http.put('/api/user', user).subscribe(updatedUser => {
      this.userSubject.next(updatedUser);
    });
  }
  
  getCurrentUser(): User | null {
    return this.userSubject.value;
  }
}

// Component
@Component({
  selector: 'app-profile',
  template: `
    <div *ngIf="user$ | async as user">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
    </div>
  `
})
export class ProfileComponent {
  user$ = this.userService.user$;
  
  constructor(private userService: UserService) {}
}
```

### ReplaySubject

```typescript
// ReplaySubject for Caching
@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, ReplaySubject<any>>();
  
  get<T>(key: string, fetchFn: () => Observable<T>): Observable<T> {
    if (!this.cache.has(key)) {
      const subject = new ReplaySubject<T>(1);
      this.cache.set(key, subject);
      fetchFn().subscribe(subject);
    }
    
    return this.cache.get(key)!.asObservable();
  }
  
  invalidate(key: string) {
    this.cache.delete(key);
  }
}

// Usage
this.cacheService.get('users', () => this.http.get<User[]>('/api/users'))
  .subscribe(users => console.log(users));
```

### AsyncSubject

```typescript
// AsyncSubject - Waits for completion
@Injectable({ providedIn: 'root' })
export class CalculationService {
  private calculationSubject = new AsyncSubject<number>();
  
  performCalculation() {
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += i;
    }
    this.calculationSubject.next(result);
    this.calculationSubject.complete();
  }
  
  getResult(): Observable<number> {
    return this.calculationSubject.asObservable();
  }
}

// Usage
this.calculationService.getResult().subscribe(result => {
  console.log('Final result:', result); // Only receives last value
});
```

### Operators Internamente

```typescript
// Custom Operator
function customMap<T, R>(project: (value: T) => R): OperatorFunction<T, R> {
  return (source: Observable<T>) => new Observable<R>(subscriber => {
    return source.subscribe({
      next: value => {
        try {
          subscriber.next(project(value));
        } catch (error) {
          subscriber.error(error);
        }
      },
      error: error => subscriber.error(error),
      complete: () => subscriber.complete()
    });
  });
}

// Usage
source$.pipe(customMap(x => x * 2)).subscribe(console.log);
```

### switchMap

```typescript
// switchMap - Cancel previous, use latest
@Component({
  selector: 'app-search',
  template: `
    <input [(ngModel)]="searchTerm" (input)="onSearch()" />
    <div *ngIf="results$ | async as results">
      <div *ngFor="let result of results">{{ result }}</div>
    </div>
  `,
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class SearchComponent {
  searchTerm = '';
  results$!: Observable<string[]>;
  
  constructor(private searchService: SearchService) {}
  
  onSearch() {
    this.results$ = fromEvent(document, 'input').pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.searchService.search(term))
    );
  }
  
  // switchMap:
  // - Cancels previous observable
  // - Subscribes to new observable
  // - Good for search, type-ahead
  // - Prevents race conditions
}
```

### mergeMap

```typescript
// mergeMap - Maintain all subscriptions
@Component({
  selector: 'app-batch-upload',
  template: `
    <button (click)="uploadFiles()">Upload Files</button>
    <div *ngFor="let progress of uploadProgress$ | async">
      {{ progress }}
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class BatchUploadComponent {
  uploadProgress$!: Observable<number>;
  
  constructor(private uploadService: UploadService) {}
  
  uploadFiles() {
    const files = [/* files */];
    
    this.uploadProgress$ = from(files).pipe(
      mergeMap(file => this.uploadService.upload(file))
    );
  }
  
  // mergeMap:
  // - Maintains all subscriptions
  // - Concurrent execution
  // - Good for parallel operations
  // - Can cause memory issues with many observables
}
```

### concatMap

```typescript
// concatMap - Sequential execution
@Component({
  selector: 'app-sequential-operations',
  template: `
    <button (click)="executeOperations()">Execute</button>
    <div *ngIf="result$ | async as result">
      {{ result }}
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class SequentialOperationsComponent {
  result$!: Observable<any>;
  
  constructor(private operationService: OperationService) {}
  
  executeOperations() {
    const operations = [/* operations */];
    
    this.result$ = from(operations).pipe(
      concatMap(op => this.operationService.execute(op))
    );
  }
  
  // concatMap:
  // - Sequential execution
  // - Waits for completion before next
  // - Good for dependent operations
  // - Maintains order
}
```

### exhaustMap

```typescript
// exhaustMap - Ignore while active
@Component({
  selector: 'app-submit-form',
  template: `
    <form (ngSubmit)="onSubmit()">
      <input [(ngModel)]="data" />
      <button type="submit" [disabled]="loading$ | async">
        {{ (loading$ | async) ? 'Submitting...' : 'Submit' }}
      </button>
    </form>
  `,
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class SubmitFormComponent {
  data = '';
  loading$ = new BehaviorSubject<boolean>(false);
  
  constructor(private formService: FormService) {}
  
  onSubmit() {
    this.loading$.next(true);
    
    fromEvent(this.form.nativeElement, 'submit').pipe(
      exhaustMap(() => this.formService.submit(this.data))
    ).subscribe({
      next: result => {
        this.loading$.next(false);
        console.log('Success:', result);
      },
      error: error => {
        this.loading$.next(false);
        console.error('Error:', error);
      }
    });
  }
  
  // exhaustMap:
  // - Ignores new sources while active
  // - Good for preventing double submissions
  // - Maintains single active subscription
}
```

### combineLatest

```typescript
// combineLatest - Combine latest values
@Component({
  selector: 'app-user-dashboard',
  template: `
    <div *ngIf="dashboard$ | async as dashboard">
      <h2>{{ dashboard.user.name }}</h2>
      <p>Posts: {{ dashboard.posts.length }}</p>
      <p>Notifications: {{ dashboard.notifications.length }}</p>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class UserDashboardComponent {
  dashboard$!: Observable<{ user: User; posts: Post[]; notifications: Notification[] }>;
  
  constructor(
    private userService: UserService,
    private postService: PostService,
    private notificationService: NotificationService
  ) {
    this.dashboard$ = combineLatest({
      user: this.userService.user$,
      posts: this.postService.posts$,
      notifications: this.notificationService.notifications$
    });
  }
  
  // combineLatest:
  // - Emits when any source emits
  // - Combines latest values
  // - Requires all sources to emit at least once
  // - Good for combining independent data
}
```

### forkJoin

```typescript
// forkJoin - Wait for all to complete
@Component({
  selector: 'app-initial-data',
  template: `
    <div *ngIf="data$ | async as data">
      <!-- Display data -->
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class InitialDataComponent {
  data$!: Observable<{ users: User[]; posts: Post[]; settings: Settings }>;
  
  constructor(
    private userService: UserService,
    private postService: PostService,
    private settingsService: SettingsService
  ) {
    this.data$ = forkJoin({
      users: this.userService.getUsers(),
      posts: this.postService.getPosts(),
      settings: this.settingsService.getSettings()
    });
  }
  
  // forkJoin:
  // - Waits for all observables to complete
  // - Emits once with all values
  // - Errors if any observable errors
  // - Good for initial data loading
}
```

### shareReplay

```typescript
// shareReplay - Share and replay
@Injectable({ providedIn: 'root' })
export class DataService {
  private data$ = this.http.get<Data>('/api/data').pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );
  
  getData(): Observable<Data> {
    return this.data$;
  }
}

// shareReplay:
// - Shares single subscription
// - Replays N values to new subscribers
// - refCount: true - unsubscribe when no subscribers
// - Good for caching HTTP responses
```

### catchError

```typescript
// catchError - Error handling
@Component({
  selector: 'app-error-handling',
  template: `
    <div *ngIf="data$ | async as data">
      {{ data }}
    </div>
    <div *ngIf="error$ | async as error" class="error">
      {{ error }}
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class ErrorHandlingComponent {
  data$!: Observable<string>;
  error$ = new BehaviorSubject<string | null>(null);
  
  constructor(private dataService: DataService) {
    this.data$ = this.dataService.getData().pipe(
      catchError(error => {
        this.error$.next(error.message);
        return of('Default data');
      })
    );
  }
  
  // catchError:
  // - Catches errors from observable
  // - Returns fallback observable
  // - Doesn't affect original stream
  // - Good for graceful degradation
}
```

### retry

```typescript
// retry - Retry on error
@Injectable({ providedIn: 'root' })
export class ApiService {
  getData(): Observable<any> {
    return this.http.get('/api/data').pipe(
      retry(3), // Retry 3 times
      catchError(error => {
        console.error('Failed after retries:', error);
        return throwError(() => error);
      })
    );
  }
  
  // retry with delay
  getDataWithDelay(): Observable<any> {
    return this.http.get('/api/data').pipe(
      retryWhen(errors =>
        errors.pipe(
          delay(1000),
          take(3)
        )
      )
    );
  }
  
  // retry:
  // - Retries on error
  // - Good for transient failures
  // - Use with delay for backoff
  // - Don't retry indefinitely
}
```

### debounceTime

```typescript
// debounceTime - Delay emission
@Component({
  selector: 'app-autocomplete',
  template: `
    <input [(ngModel)]="searchTerm" (input)="onInput()" />
    <div *ngIf="suggestions$ | async as suggestions">
      <div *ngFor="let suggestion of suggestions">{{ suggestion }}</div>
    </div>
  `,
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class AutocompleteComponent {
  searchTerm = '';
  suggestions$!: Observable<string[]>;
  
  constructor(private searchService: SearchService) {}
  
  onInput() {
    this.suggestions$ = fromEvent(document, 'input').pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.searchService.suggest(term))
    );
  }
  
  // debounceTime:
  // - Delays emission
  // - Discards intermediate values
  // - Good for search, auto-save
  // - Reduces API calls
}
```

### distinctUntilChanged

```typescript
// distinctUntilChanged - Only emit distinct values
@Component({
  selector: 'app-filter',
  template: `
    <input [(ngModel)]="value" (input)="onInput()" />
    <div *ngIf="filtered$ | async as filtered">
      {{ filtered }}
    </div>
  `,
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class FilterComponent {
  value = '';
  filtered$!: Observable<string>;
  
  onInput() {
    this.filtered$ = fromEvent(document, 'input').pipe(
      map((e: Event) => (e.target as HTMLInputElement).value),
      distinctUntilChanged(),
      debounceTime(300)
    );
  }
  
  // distinctUntilChanged:
  // - Only emits when value changes
  // - Uses === by default
  - Can use custom comparator
  - Good for preventing duplicate work
}
```

### takeUntil

```typescript
// takeUntil - Cancel on signal
@Component({
  selector: 'app-live-data',
  template: `
    <div *ngIf="data$ | async as data">
      {{ data }}
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class LiveDataComponent implements OnDestroy {
  data$!: Observable<any>;
  private destroy$ = new Subject<void>();
  
  constructor(private dataService: DataService) {
    this.data$ = this.dataService.getData().pipe(
      takeUntil(this.destroy$)
    );
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // takeUntil:
  // - Cancels observable when trigger emits
  // - Good for cleanup
  // - Prevents memory leaks
  // - Use in ngOnDestroy
}
```

### Scheduler Internals

```typescript
// Schedulers - Control execution context
import { asyncScheduler, queueScheduler, asapScheduler } from 'rxjs';

// asyncScheduler - setTimeout based
of(1, 2, 3, asyncScheduler).subscribe(console.log);
// Emits after current call stack clears

// queueScheduler - Microtask based
of(1, 2, 3, queueScheduler).subscribe(console.log);
// Emits in current event loop tick

// asapScheduler - Promise based
of(1, 2, 3, asapScheduler).subscribe(console.log);
// Emits as soon as possible

// Custom scheduler usage
this.http.get('/api/data').pipe(
  observeOn(asyncScheduler) // Run on next tick
).subscribe(data => {
  // Heavy computation
});
```

### Memory Leaks

```typescript
// Memory Leaks with RxJS
@Component({
  selector: 'app-leaky',
  template: `<div>{{ data$ | async }}</div>`
})
export class LeakyComponent {
  data$ = interval(1000); // Never completes!
  
  // Memory leak: Subscription never cleaned up
  
  constructor() {
    this.data$.subscribe(value => console.log(value));
  }
}

// Fixed with takeUntil
@Component({
  selector: 'app-fixed',
  template: `<div>{{ data$ | async }}</div>`
})
export class FixedComponent implements OnDestroy {
  data$!: Observable<number>;
  private destroy$ = new Subject<void>();
  
  constructor() {
    this.data$ = interval(1000).pipe(
      takeUntil(this.destroy$)
    );
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// Common memory leak sources:
// 1. Subscriptions not cleaned up
// 2. Long-lived observables (interval, fromEvent)
// 3. Subject references in services
// 4. Closures keeping references
```

### Reactive Architecture

```typescript
// Reactive Architecture Pattern
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private todos$ = new BehaviorSubject<Todo[]>([]);
  private filter$ = new BehaviorSubject<TodoFilter>('all');
  
  readonly todos = this.todos$.asObservable();
  readonly filteredTodos = combineLatest([this.todos$, this.filter$]).pipe(
    map(([todos, filter]) => {
      switch (filter) {
        case 'active': return todos.filter(t => !t.completed);
        case 'completed': return todos.filter(t => t.completed);
        default: return todos;
      }
    })
  );
  
  addTodo(text: string) {
    const todo: Todo = { id: Date.now(), text, completed: false };
    this.todos$.next([...this.todos$.value, todo]);
  }
  
  toggleTodo(id: number) {
    this.todos$.next(
      this.todos$.value.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  }
  
  setFilter(filter: TodoFilter) {
    this.filter$.next(filter);
  }
}

// Component
@Component({
  selector: 'app-todos',
  template: `
    <div *ngFor="let todo of filteredTodos$ | async">
      <input type="checkbox" [checked]="todo.completed" (change)="toggle(todo.id)" />
      <span>{{ todo.text }}</span>
    </div>
    <input [(ngModel)]="newTodo" (keyup.enter)="add()" />
  `,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TodosComponent {
  filteredTodos$ = this.todoStore.filteredTodos;
  newTodo = '';
  
  constructor(private todoStore: TodoStore) {}
  
  add() {
    this.todoStore.addTodo(this.newTodo);
    this.newTodo = '';
  }
  
  toggle(id: number) {
    this.todoStore.toggleTodo(id);
  }
}
```

---

## Signals Profundo

### Cómo Funcionan Internamente

```typescript
// Signals Internal Implementation (simplified)
class Signal<T> {
  private value: T;
  private consumers: Set<Consumer> = new Set();
  
  constructor(initialValue: T) {
    this.value = initialValue;
  }
  
  get(): T {
    // Track consumer if in effect
    if (currentConsumer) {
      this.consumers.add(currentConsumer);
      currentConsumer.dependencies.add(this);
    }
    
    return this.value;
  }
  
  set(newValue: T) {
    if (newValue !== this.value) {
      this.value = newValue;
      this.notifyConsumers();
    }
  }
  
  update(updater: (value: T) => T) {
    this.set(updater(this.value));
  }
  
  private notifyConsumers() {
    this.consumers.forEach(consumer => consumer.run());
  }
}

class ComputedSignal<T> extends Signal<T> {
  private dirty = true;
  private cachedValue: T;
  
  constructor(private computation: () => T) {
    super(undefined as T);
  }
  
  get(): T {
    if (this.dirty) {
      this.cachedValue = this.computation();
      this.dirty = false;
    }
    
    return this.cachedValue;
  }
  
  notifyConsumers() {
    this.dirty = true;
    super.notifyConsumers();
  }
}

// Signals vs Traditional Reactivity:
// Traditional: Zone.js detects changes, checks entire tree
// Signals: Fine-grained reactivity, only updates dependents
```

### Writable Signals

```typescript
// Writable Signal - Basic signal
@Component({
  selector: 'app-counter',
  template: `
    <div>Count: {{ count() }}</div>
    <button (click)="increment()">Increment</button>
    <button (click)="reset()">Reset</button>
  `,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CounterComponent {
  count = signal(0);
  
  increment() {
    this.count.update(value => value + 1);
  }
  
  reset() {
    this.count.set(0);
  }
  
  // Writable signal methods:
  // - get() - read value
  // - set() - set new value
  // - update() - transform value
  // - mutate() - mutate value (for objects)
}
```

### Computed Signals

```typescript
// Computed Signal - Derived values
@Component({
  selector: 'app-calculator',
  template: `
    <input [(ngModel)]="a" type="number" />
    <input [(ngModel)]="b" type="number" />
    <div>Sum: {{ sum() }}</div>
    <div>Product: {{ product() }}</div>
    <div>Greater: {{ greater() }}</div>
  `,
  standalone: true,
  imports: [FormsModule]
})
export class CalculatorComponent {
  a = model(0);
  b = model(0);
  
  sum = computed(() => this.a() + this.b());
  product = computed(() => this.a() * this.b());
  greater = computed(() => this.a() > this.b() ? 'A' : 'B');
  
  // Computed signals:
  // - Derived from other signals
  // - Lazy evaluation
  // - Memoized
  // - Recomputed only when dependencies change
}
```

### Effects

```typescript
// Effect - Side effects from signals
@Component({
  selector: 'app-persistence',
  template: `
    <input [(ngModel)]="value" />
  `,
  standalone: true,
  imports: [FormsModule]
})
export class PersistenceComponent {
  value = model(localStorage.getItem('value') || '');
  
  constructor() {
    effect(() => {
      localStorage.setItem('value', this.value());
      console.log('Value saved:', this.value());
    });
  }
  
  // Effects:
  // - Run when dependencies change
  // - For side effects
  // - Auto cleanup on destroy
  // - Can be manual with effect()
}
```

### Dependency Tracking

```typescript
// Signal Dependency Tracking
@Component({
  selector: 'app-dependency-tracking',
  template: `
    <div>{{ fullName() }}</div>
    <input [(ngModel)]="firstName" />
    <input [(ngModel)]="lastName" />
  `,
  standalone: true,
  imports: [FormsModule]
})
export class DependencyTrackingComponent {
  firstName = model('');
  lastName = model('');
  
  fullName = computed(() => {
    // Dependencies tracked automatically
    return `${this.firstName()} ${this.lastName()}`;
  });
  
  // Dependency tracking:
  // - Automatic during get()
  // - Tracks signal reads
  // - Recomputes when dependencies change
  // - Efficient dependency graph
}
```

### Fine-grained Reactivity

```typescript
// Fine-grained Reactivity Example
@Component({
  selector: 'app-list',
  template: `
    <div *ngFor="let item of items(); trackBy: trackById">
      <app-item [item]="itemSignal(item)"></app-item>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class ListComponent {
  items = input<Item[]>([]);
  
  itemSignal(item: Item): Signal<Item> {
    // Create signal from input
    return signal(item);
  }
  
  trackById(index: number, item: Item) {
    return item.id;
  }
  
  // Fine-grained reactivity:
  // - Individual item updates
  // - Only re-render changed items
  - - Better performance for large lists
}
```

### Signals vs RxJS

```typescript
// Signals vs RxJS Comparison
@Component({
  selector: 'app-comparison',
  template: `
    <h3>RxJS Approach</h3>
    <div>{{ rxjsMessage$ | async }}</div>
    <button (click)="updateRxjs()">Update RxJS</button>
    
    <h3>Signals Approach</h3>
    <div>{{ signalMessage() }}</div>
    <button (click)="updateSignal()">Update Signal</button>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class ComparisonComponent {
  // RxJS Approach
  private rxjsSubject = new BehaviorSubject<string>('Hello RxJS');
  rxjsMessage$ = this.rxjsSubject.asObservable();
  
  updateRxjs() {
    this.rxjsSubject.next('Updated RxJS');
  }
  
  // Signals Approach
  signalMessage = signal('Hello Signal');
  
  updateSignal() {
    this.signalMessage.set('Updated Signal');
  }
}

/*
Signals:
- Synchronous state
- Simple API
- Fine-grained reactivity
- No unsubscribe needed
- Better for local component state

RxJS:
- Asynchronous streams
- Powerful operators
- Complex async flows
- Requires unsubscribe
- Better for async operations
*/
```

### Signals Performance

```typescript
// Signals Performance Optimization
@Component({
  selector: 'app-performance',
  template: `
    <div *ngFor="let item of items(); trackBy: trackById">
      {{ item.name }}
    </div>
  `,
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceComponent {
  items = signal<Item[]>([]);
  
  constructor() {
    // Batch updates
    this.updateItems();
  }
  
  updateItems() {
    // Batch multiple updates
    batch(() => {
      const newItems = [...this.items()];
      for (let i = 0; i < 1000; i++) {
        newItems.push({ id: i, name: `Item ${i}` });
      }
      this.items.set(newItems);
    });
  }
  
  trackById(index: number, item: Item) {
    return item.id;
  }
  
  // Performance benefits:
  // - Only update dependent components
  // - No full component tree check
  // - Can work without Zone.js
  // - Better for large applications
}
```

### Signal-based Architecture

```typescript
// Signal-based Service Architecture
@Injectable({ providedIn: 'root' })
export class TodoService {
  private todos = signal<Todo[]>([]);
  private filter = signal<TodoFilter>('all');
  
  readonly todos$ = this.todos.asReadonly();
  readonly filter$ = this.filter.asReadonly();
  
  readonly filteredTodos = computed(() => {
    const todos = this.todos();
    const filter = this.filter();
    
    switch (filter) {
      case 'active': return todos.filter(t => !t.completed);
      case 'completed': return todos.filter(t => t.completed);
      default: return todos;
    }
  });
  
  addTodo(text: string) {
    this.todos.update(todos => [
      ...todos,
      { id: Date.now(), text, completed: false }
    ]);
  }
  
  toggleTodo(id: number) {
    this.todos.update(todos =>
      todos.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  }
  
  setFilter(filter: TodoFilter) {
    this.filter.set(filter);
  }
}

// Component using signal service
@Component({
  selector: 'app-todos',
  template: `
    <div *ngFor="let todo of todoService.filteredTodos()">
      <input type="checkbox" [checked]="todo.completed" (change)="toggle(todo.id)" />
      <span>{{ todo.text }}</span>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class TodosComponent {
  constructor(public todoService: TodoService) {}
  
  toggle(id: number) {
    this.todoService.toggleTodo(id);
  }
}
```

### Migración desde RxJS

```typescript
// Migration from RxJS to Signals
// Before (RxJS)
@Injectable({ providedIn: 'root' })
export class UserServiceRxJS {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  
  setUser(user: User) {
    this.userSubject.next(user);
  }
}

// After (Signals)
@Injectable({ providedIn: 'root' })
export class UserServiceSignals {
  private user = signal<User | null>(null);
  user = this.user.asReadonly();
  
  setUser(user: User) {
    this.user.set(user);
  }
}

// Component migration
// Before
@Component({ template: `<div>{{ user$ | async }}</div>` })
export class UserComponent {
  user$ = this.userService.user$;
}

// After
@Component({ template: `<div>{{ userService.user() }}</div>` })
export class UserComponent {
  constructor(public userService: UserServiceSignals) {}
}

// Migration strategy:
// 1. Start with new features using signals
// 2. Gradually migrate simple state
// 3. Keep RxJS for complex async flows
// 4. Use signals for local component state
// 5. Use RxJS for API calls, websockets
```

---

## Routing Avanzado

### Angular Router Internamente

```typescript
// Angular Router Internal Architecture
/*
┌─────────────────────────────────────────┐
│         Router Configuration            │
│  Routes, Guards, Resolvers             │
├─────────────────────────────────────────┤
│         URL Matching                    │
│  - Path matching                       │
│  - Parameter extraction               │
├─────────────────────────────────────────┤
│         Navigation                     │
│  - RouterLink clicks                  │
│  - router.navigate()                   │
├─────────────────────────────────────────┤
│         Guard Execution                │
│  - canActivate                        │
│  - canActivateChild                   │
├─────────────────────────────────────────┤
│         Resolver Execution              │
│  - Resolve data                       │
├─────────────────────────────────────────┤
│         Component Activation            │
│  - Create component                   │
│  - Update view                        │
└─────────────────────────────────────────┘
*/
```

### Lazy Loading

```typescript
// Lazy Loading Routes
const routes: Routes = [
  {
    path: 'users',
    loadChildren: () => import('./users/users.module').then(m => m.UsersModule)
  },
  {
    path: 'posts',
    loadComponent: () => import('./posts/posts.component').then(m => m.PostsComponent)
  }
];

// Lazy loading benefits:
// - Code splitting
// - Faster initial load
// - Load on demand
// - Better performance
```

### Route Preloading

```typescript
// Route Preloading Strategies
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules // Preload all lazy routes
    })
  ]
})
export class AppModule {}

// Custom preloading strategy
@Injectable({ providedIn: 'root' })
export class CustomPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data && route.data['preload']) {
      return load();
    }
    return of(null);
  }
}

// Usage
const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    data: { preload: true }
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: CustomPreloadingStrategy
    })
  ]
})
export class AppModule {}
```

### Guards

```typescript
// Route Guards
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    }
    
    this.router.navigate(['/login']);
    return false;
  }
}

// CanActivateChild
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivateChild {
  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.authService.isAdmin();
  }
}

// CanDeactivate
@Injectable({ providedIn: 'root' })
export class CanDeactivateGuard implements CanDeactivate<any> {
  canDeactivate(component: any): boolean {
    if (component.hasUnsavedChanges()) {
      return confirm('You have unsaved changes. Leave?');
    }
    return true;
  }
}

// Usage
const routes: Routes = [
  {
    path: 'admin',
    canActivate: [AuthGuard],
    canActivateChild: [AdminGuard],
    children: [
      { path: 'users', component: UsersComponent }
    ]
  },
  {
    path: 'edit',
    component: EditComponent,
    canDeactivate: [CanDeactivateGuard]
  }
];
```

### Resolvers

```typescript
// Route Resolvers
Un Resolver es una función del Router que permite cargar datos antes de que una ruta se active.
@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<User> {
  constructor(private userService: UserService) {}
  
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<User> {
    return this.userService.getUser(route.paramMap.get('id')!);
  }
}

// Usage
const routes: Routes = [
  {
    path: 'users/:id',
    component: UserDetailComponent,
    resolve: {
      user: UserResolver
    }
  }
];

// Component
@Component({
  selector: 'app-user-detail',
  template: `
    <div *ngIf="user">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
    </div>
  `
})
export class UserDetailComponent {
  user = this.route.snapshot.data['user'];
  
  constructor(private route: ActivatedRoute) {}
  
  // Resolver benefits:
  // - Data loaded before navigation
  // - No loading state in component
  // - Better UX
  // - Reusable across routes
}
```

### Route Reuse Strategy
La RouteReuseStrategy es un mecanismo del Angular Router que controla si una ruta debe:

destruirse completamente o reutilizarse cuando el usuario navega.
```typescript
// Custom Route Reuse Strategy
@Injectable({ providedIn: 'root' })
export class CustomReuseStrategy implements RouteReuseStrategy {
  private handlers: { [key: string]: DetachedRouteHandle } = {};
  
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data['shouldReuse'] || false;
  }
  
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    this.handlers[route.routeConfig?.path || ''] = handle;
  }
  
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!this.handlers[route.routeConfig?.path || ''];
  }
  
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.handlers[route.routeConfig?.path || ''] || null;
  }
  
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}

// Usage
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      onSameUrlNavigation: 'reload',
      routeReuseStrategy: CustomReuseStrategy
    })
  ]
})
export class AppModule {}

const routes: Routes = [
  {
    path: 'search',
    component: SearchComponent,
    data: { shouldReuse: true }
  }
];
```

### Nested Routing

```typescript
// Nested Routes
const routes: Routes = [
  {
    path: 'users',
    component: UsersComponent,
    children: [
      { path: '', component: UserListComponent },
      { path: ':id', component: UserDetailComponent },
      {
        path: ':id/posts',
        component: UserPostsComponent,
        children: [
          { path: ':postId', component: PostDetailComponent }
        ]
      }
    ]
  }
];

// Parent component template
@Component({
  selector: 'app-users',
  template: `
    <h2>Users</h2>
    <router-outlet></router-outlet>
  `
})
export class UsersComponent {}
```

### Dynamic Routing

```typescript
// Dynamic Routes
const routes: Routes = [
  {
    path: 'users/:id',
    component: UserDetailComponent
  },
  {
    path: 'posts/:category/:id',
    component: PostDetailComponent
  }
];

// Access parameters
@Component({
  selector: 'app-user-detail',
  template: `
    <div>User ID: {{ userId }}</div>
  `
})
export class UserDetailComponent {
  userId = this.route.snapshot.paramMap.get('id');
  
  constructor(private route: ActivatedRoute) {}
  
  // Observable parameters
  id$ = this.route.paramMap.pipe(
    map(params => params.get('id'))
  );
}
```

### Standalone Routing

```typescript
// Standalone Routing (Angular 14+)
const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Home'
  },
  {
    path: 'users',
    loadComponent: () => import('./users/users.component').then(c => c.UsersComponent),
    title: 'Users'
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding())
  ]
});

// Router outlet in standalone component
@Component({
  selector: 'app-root',
  template: `
    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/users">Users</a>
    </nav>
    <router-outlet></router-outlet>
  `,
  standalone: true,
  imports: [RouterModule, RouterOutlet, RouterLink]
})
export class AppComponent {}
```

### Navigation Lifecycle

```typescript
// Navigation Lifecycle
@Component({
  selector: 'app-navigation',
  template: `
    <button (click)="navigate()">Navigate</button>
  `
})
export class NavigationComponent {
  constructor(private router: Router) {}
  
  navigate() {
    this.router.navigate(['/users', 1]);
  }
  
  // Navigation events
  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('Navigation started');
      }
      if (event instanceof NavigationEnd) {
        console.log('Navigation ended');
      }
      if (event instanceof NavigationCancel) {
        console.log('Navigation cancelled');
      }
      if (event instanceof NavigationError) {
        console.error('Navigation error:', event.error);
      }
    });
  }
}
```

### Router Events

```typescript
// Router Events Tracking
@Injectable({ providedIn: 'root' })
export class RouterAnalytics {
  constructor(private router: Router) {
    this.trackNavigation();
  }
  
  private trackNavigation() {
    let startTime: number;
    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        startTime = performance.now();
      }
      
      if (event instanceof NavigationEnd) {
        const duration = performance.now() - startTime;
        console.log(`Navigation to ${event.url} took ${duration}ms`);
      }
    });
  }
}
```

### URL Serialization

```typescript
// Custom URL Serialization
@Injectable({ providedIn: 'root' })
export class CustomUrlSerializer implements UrlSerializer {
  parse(url: string): UrlTree {
    const tree = this.defaultSerializer.parse(url);
    // Custom parsing logic
    return tree;
  }
  
  serialize(tree: UrlTree): string {
    const url = this.defaultSerializer.serialize(tree);
    // Custom serialization logic
    return url;
  }
  
  constructor(private defaultSerializer: DefaultUrlSerializer) {}
}

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      urlSerializer: CustomUrlSerializer
    })
  ]
})
export class AppModule {}
```

### State Management con Routing

```typescript
// State Management with Router
@Component({
  selector: 'app-search',
  template: `
    <input [(ngModel)]="searchTerm" />
    <button (click)="search()">Search</button>
  `
})
export class SearchComponent {
  searchTerm = '';
  
  constructor(private router: Router, private route: ActivatedRoute) {}
  
  ngOnInit() {
    // Read from query params
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['q'] || '';
    });
  }
  
  search() {
    // Update query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.searchTerm },
      queryParamsHandling: 'merge'
    });
  }
  
  // Benefits:
  // - State in URL
  // - Shareable links
  // - Back button works
  // - Refresh preserves state
}
```

---

*Continúa en la parte 3...*
