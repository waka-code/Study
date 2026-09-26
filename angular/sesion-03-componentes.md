# Sesión 3 — Componentes y ciclo de vida

> **Objetivo**: entender qué es un componente, cómo se declara con `@Component`, cómo se comunica con su template, y — lo más preguntado en entrevistas — **cuándo y por qué se ejecuta cada hook del ciclo de vida**. Al terminar deberías dibujar de memoria el orden de los hooks y saber qué poner en cada uno.

> Requisito: [Sesión 1](sesion-01-fundamentos.md) y [Sesión 2](sesion-02-typescript.md).

---

## 1. ¿Qué es un componente?

Un **componente** es la unidad básica de UI en Angular: una **clase** con lógica + un **template** (HTML) + **estilos**. Todo lo que ves en pantalla es un árbol de componentes.

```
AppComponent
├── HeaderComponent
├── SidebarComponent
│   └── MenuComponent
└── ProductListComponent
    └── ProductCardComponent (×N)
```

Cada componente:
- Controla una porción de la pantalla (su "vista").
- Tiene su propio estado y lógica.
- Se comunica con otros vía `@Input`/`@Output` (Sesión 7).

---

## 2. El decorador `@Component`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-producto',        // cómo lo usas en HTML: <app-producto>
  templateUrl: './producto.component.html',
  styleUrls: ['./producto.component.css'],
})
export class ProductoComponent {
  nombre = 'Teclado';
  precio = 25000;
}
```

### 2.1 Propiedades del decorador

| Propiedad | Qué hace |
|---|---|
| `selector` | El tag HTML con que lo insertas (`<app-producto>`) |
| `templateUrl` | Ruta al archivo `.html` |
| `template` | HTML inline (para componentes pequeños), en vez de `templateUrl` |
| `styleUrls` | Array de rutas a `.css`/`.scss` |
| `styles` | Estilos inline |
| `standalone` | `true` = sin necesidad de módulo (moderno, ver §6) |
| `imports` | Dependencias del componente (solo standalone) |
| `changeDetection` | Estrategia de detección de cambios (Sesión 14) |
| `providers` | Servicios propios de este componente (Sesión 8) |
| `encapsulation` | Cómo se aíslan los estilos (§5) |

> `template` vs `templateUrl` (y `styles` vs `styleUrls`): usa la versión *inline* para componentes muy pequeños; la versión *Url* (archivo aparte) para todo lo demás. No puedes usar ambas a la vez.

### 2.2 Tipos de selector

```typescript
selector: 'app-x'        // por elemento:  <app-x></app-x>   ← el normal
selector: '[appX]'       // por atributo:  <div appX>        ← típico de directivas
selector: '.appX'        // por clase:     <div class="appX">
```

---

## 3. La clase del componente

La clase contiene el **estado** (propiedades) y el **comportamiento** (métodos) que el template usa.

```typescript
@Component({ /* ... */ })
export class ContadorComponent {
  contador = 0;                    // estado

  incrementar(): void {            // comportamiento
    this.contador++;
  }

  get esPar(): boolean {           // getter usable en template
    return this.contador % 2 === 0;
  }
}
```

```html
<p>Valor: {{ contador }} ({{ esPar ? 'par' : 'impar' }})</p>
<button (click)="incrementar()">+1</button>
```

> El template solo puede acceder a miembros **públicos** de la clase. El binding de eventos e interpolación son la **Sesión 4**.

---

## 4. Ciclo de vida (lifecycle hooks) 🔑

Angular crea, actualiza y destruye componentes. En momentos concretos llama a métodos "hook" **si los implementas**. Este es el tema estrella de la sesión.

### 4.1 Orden de ejecución

```
constructor          ← 1. crea la instancia (NO es un hook de Angular)
       │
ngOnChanges          ← 2. cada vez que cambia un @Input (y antes de OnInit)
       │
ngOnInit             ← 3. una vez, tras el primer OnChanges. INICIALIZACIÓN
       │
ngDoCheck            ← 4. en cada ciclo de detección de cambios
       │
ngAfterContentInit   ← 5. una vez, tras proyectar contenido (<ng-content>)
       │
ngAfterContentChecked← 6. tras cada revisión del contenido proyectado
       │
ngAfterViewInit      ← 7. una vez, tras inicializar la vista y sus hijos
       │
ngAfterViewChecked   ← 8. tras cada revisión de la vista
       │
   (... la app vive, se repiten DoCheck/Checked ...)
       │
ngOnDestroy          ← 9. justo antes de destruir el componente. LIMPIEZA
```

Mnemotecnia: **Changes → Init → DoCheck → Content → View → Destroy**.

### 4.2 Cada hook en detalle

Se implementan con la interfaz correspondiente (buena práctica) y el prefijo `ng`:

```typescript
import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';

@Component({ /* ... */ })
export class DemoComponent implements OnInit, OnChanges, OnDestroy {

  constructor() {
    // Solo inyección de dependencias y valores simples.
    // ❌ NO hagas llamadas HTTP ni accedas a @Input aquí (aún no están listos).
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Se ejecuta cuando cambia CUALQUIER @Input.
    // 'changes' trae previousValue / currentValue / firstChange.
    console.log(changes);
  }

  ngOnInit(): void {
    // El lugar para INICIALIZAR: llamadas HTTP, subscripciones, setup.
    // Aquí los @Input YA tienen valor.
  }

  ngOnDestroy(): void {
    // LIMPIEZA: desuscribir Observables, limpiar timers, listeners.
    // Evita memory leaks (Sesión 13/30).
  }
}
```

| Hook | Cuándo | Uso típico |
|---|---|---|
| `constructor` | Al crear la clase | Inyección de dependencias. Nada de lógica pesada |
| `ngOnChanges` | Antes de OnInit y en cada cambio de `@Input` | Reaccionar a cambios de inputs |
| **`ngOnInit`** | Una vez, tras el primer OnChanges | **HTTP, subscripciones, inicialización** |
| `ngDoCheck` | En cada ciclo de detección | Detección personalizada (avanzado, con cuidado) |
| `ngAfterContentInit` | Tras proyectar `<ng-content>` | Acceder a `@ContentChild` |
| `ngAfterContentChecked` | Tras revisar contenido proyectado | Raro |
| **`ngAfterViewInit`** | Tras montar la vista e hijos | **Acceder a `@ViewChild`, integrar libs del DOM** |
| `ngAfterViewChecked` | Tras revisar la vista | Raro |
| **`ngOnDestroy`** | Antes de destruir | **Limpieza: unsubscribe, timers** |

### 4.3 Los tres que SÍ usarás a diario

- **`ngOnInit`** → inicializas datos. *"¿Por qué no en el constructor?"* Porque en el constructor los `@Input` aún no llegaron y quieres separar construcción de inicialización (mejor para testing).
- **`ngAfterViewInit`** → cuando necesitas el DOM ya renderizado o un `@ViewChild` (Sesión 7).
- **`ngOnDestroy`** → para no dejar subscripciones vivas (fuente #1 de memory leaks).

### 4.4 `constructor` vs `ngOnInit` (pregunta clásica)

| | `constructor` | `ngOnInit` |
|---|---|---|
| Es de… | JavaScript/TS | Angular |
| Cuándo | Al instanciar | Tras el primer render de inputs |
| `@Input` listos | ❌ No | ✅ Sí |
| Para qué | Inyectar dependencias | Inicializar (HTTP, setup) |

Regla: **inyecta en el constructor, inicializa en `ngOnInit`**.

### 4.5 Ejemplo de `ngOnChanges`

```typescript
@Input() usuarioId!: number;

ngOnChanges(changes: SimpleChanges): void {
  if (changes['usuarioId'] && !changes['usuarioId'].firstChange) {
    // el id cambió (no es la primera asignación) → recargar datos
    this.cargarUsuario(this.usuarioId);
  }
}
```

`SimpleChanges` te da por cada input: `previousValue`, `currentValue` y `firstChange` (booleano).

> ⚠️ `ngOnChanges` solo detecta cambios de **referencia** de los `@Input`. Si mutas un objeto por dentro (`this.usuario.nombre = 'x'`) sin cambiar la referencia, **no se dispara**. Otra razón para trabajar con inmutabilidad (spread, Sesión 2).

---

## 5. Encapsulación de estilos

Por defecto, los estilos de un componente **solo afectan a ese componente** (View Encapsulation `Emulated`). Angular añade atributos únicos al HTML para aislarlos.

```typescript
import { ViewEncapsulation } from '@angular/core';

@Component({
  encapsulation: ViewEncapsulation.Emulated,  // por defecto: estilos aislados
  // ViewEncapsulation.None      → estilos globales (se filtran a toda la app)
  // ViewEncapsulation.ShadowDom → aislamiento real vía Shadow DOM del navegador
})
```

Para afectar hijos o contenido proyectado existen selectores especiales:
```css
:host { display: block; }          /* el propio elemento del componente */
:host(.activo) { color: red; }     /* el host cuando tiene clase .activo */
::ng-deep .hijo { color: blue; }   /* perfora la encapsulación (usar con cuidado) */
```

---

## 6. Componentes Standalone (Angular moderno)

Desde Angular 15+, un componente puede ser **standalone**: no necesita declararse en un `NgModule`. Es la dirección oficial del framework y el **default desde Angular 17+**.

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-producto',
  standalone: true,                 // ← no pertenece a ningún módulo
  imports: [CommonModule],          // ← importa lo que use (pipes, otros componentes…)
  templateUrl: './producto.component.html',
})
export class ProductoComponent {}
```

Diferencia con el enfoque clásico (basado en `NgModule`):
- **Clásico**: el componente se declara en `declarations` de un módulo, y el módulo importa dependencias.
- **Standalone**: el componente declara sus propias `imports`. Menos boilerplate.

> Cubrimos módulos a fondo en la Sesión 15. Por ahora: reconoce ambos estilos porque en proyectos reales (Angular 8–16) verás **módulos**, y en proyectos nuevos verás **standalone**.

---

## 7. El componente raíz y el bootstrap

Todo arranca en un componente raíz (`AppComponent`), montado en `<app-root>` del `index.html` (visto en Sesión 1).

```typescript
// main.ts (proyecto standalone moderno)
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent);
```

```typescript
// main.ts (proyecto clásico con módulo)
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);
```

---

## 8. Preguntas de entrevista

1. ¿Qué es un componente y de qué partes consta?
2. ¿Cuál es el orden de los lifecycle hooks?
3. ¿Diferencia entre `constructor` y `ngOnInit`? ¿Por qué no hacer el HTTP en el constructor?
4. ¿Qué hook usas para limpiar subscripciones y por qué?
5. ¿En qué hook accedes a un `@ViewChild` y por qué no antes?
6. ¿Qué recibe `ngOnChanges` y qué limitación tiene con objetos?
7. ¿Cuándo se ejecuta `ngOnChanges` respecto a `ngOnInit`?
8. ¿Qué es la View Encapsulation y qué opciones hay?
9. ¿Qué es un componente standalone y qué ventaja aporta?
10. ¿Qué diferencia hay entre `template` y `templateUrl`?

<details>
<summary>Respuestas resumidas</summary>

1. Unidad de UI: clase (lógica/estado) + template (HTML) + estilos, declarada con `@Component`.
2. constructor → ngOnChanges → ngOnInit → ngDoCheck → ngAfterContentInit/Checked → ngAfterViewInit/Checked → ngOnDestroy.
3. constructor (JS) inyecta dependencias; ngOnInit (Angular) inicializa. En el constructor los `@Input` aún no están listos y conviene separar construcción de inicialización.
4. `ngOnDestroy`, para desuscribir Observables/timers y evitar memory leaks.
5. `ngAfterViewInit`, porque la vista y sus hijos ya están renderizados.
6. Un `SimpleChanges` con previousValue/currentValue/firstChange. Solo detecta cambios de **referencia** de los inputs.
7. `ngOnChanges` se ejecuta **antes** del primer `ngOnInit` (y luego en cada cambio de input).
8. Cómo se aíslan los estilos: `Emulated` (default), `None` (global), `ShadowDom` (nativo).
9. Componente que no necesita `NgModule`; declara sus propios `imports`. Menos boilerplate; default en Angular 17+.
10. `template` = HTML inline; `templateUrl` = ruta a archivo. No se usan ambas a la vez.

</details>

---

## ✅ Checklist para pasar a la Sesión 4

- [ ] Sé declarar un componente con `@Component` y sus propiedades clave.
- [ ] Dibujo de memoria el orden de los hooks.
- [ ] Explico `constructor` vs `ngOnInit` y dónde va el HTTP.
- [ ] Sé qué va en `ngOnDestroy` y por qué.
- [ ] Entiendo `ngOnChanges`, `SimpleChanges` y su límite con objetos mutados.
- [ ] Reconozco standalone vs módulos.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 4 — Templates y binding** (interpolación, property/event/two-way binding: cómo la clase y el HTML se hablan).
