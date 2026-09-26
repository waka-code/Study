# Sesión 5 — Directivas

> **Objetivo**: entender los tres tipos de directivas de Angular, dominar las estructurales (`*ngIf`, `*ngFor`, `*ngSwitch`) y las de atributo (`ngClass`, `ngStyle`, `ngModel`), y saber **crear directivas propias** con `@Directive`, `HostBinding`, `HostListener`, `ElementRef` y `Renderer2`. También verás la nueva sintaxis de control de flujo (`@if`, `@for`) de Angular 17+.

> Requisito: [Sesión 4](sesion-04-templates-binding.md).

---

## 0. ¿Qué es una directiva?

Una **directiva** es una clase que **modifica el DOM o el comportamiento** de un elemento. De hecho, **un componente es una directiva con template**. Hay tres tipos:

| Tipo | Qué hace | Ejemplos |
|---|---|---|
| **De componente** | Directiva con template propio | Todo `@Component` |
| **Estructural** | **Cambia la estructura** del DOM (añade/quita elementos). Prefijo `*` | `*ngIf`, `*ngFor`, `*ngSwitch` |
| **De atributo** | **Cambia apariencia/comportamiento** de un elemento existente | `ngClass`, `ngStyle`, `ngModel`, propias |

Regla mnemotécnica: **estructural = existe o no existe** el elemento; **atributo = existe pero cambia**.

---

## 1. Directivas estructurales

Llevan `*` (azúcar sintáctico que Angular expande a un `<ng-template>`).

### 1.1 `*ngIf`
Añade o quita un elemento del DOM según una condición.

```html
<p *ngIf="estaLogueado">Bienvenido</p>

<!-- con else -->
<p *ngIf="cargando; else contenido">Cargando…</p>
<ng-template #contenido>
  <p>Datos listos</p>
</ng-template>

<!-- then/else explícitos -->
<div *ngIf="ok; then bloqueOk; else bloqueError"></div>
<ng-template #bloqueOk>OK</ng-template>
<ng-template #bloqueError>Error</ng-template>
```

> 🔑 `*ngIf="false"` **quita el elemento del DOM** (no lo oculta). Distinto de `[hidden]="true"` o `display:none`, que lo mantienen en el DOM. Con `*ngIf`, el componente hijo se **destruye** (dispara `ngOnDestroy`) y se recrea.

Patrón útil con `async` (Sesión 13) para evitar múltiples subscripciones:
```html
<div *ngIf="usuario$ | async as usuario">
  {{ usuario.nombre }}
</div>
```

### 1.2 `*ngFor`
Repite un elemento por cada item de una colección.

```html
<li *ngFor="let producto of productos">{{ producto.nombre }}</li>
```

Variables locales disponibles:
```html
<li *ngFor="let item of items;
            let i = index;
            let primero = first;
            let ultimo = last;
            let par = even;
            let impar = odd;
            let n = count">
  {{ i }} - {{ item }}
</li>
```

| Variable | Valor |
|---|---|
| `index` | Índice (0-based) |
| `first` / `last` | Booleano: primer/último elemento |
| `even` / `odd` | Booleano: índice par/impar |
| `count` | Total de elementos |

### 1.3 `trackBy` (rendimiento 🔑)
Por defecto, si la lista cambia, Angular **recrea todos los elementos** del DOM. Con `trackBy` le dices cómo identificar cada item, y solo re-renderiza lo que cambió.

```html
<li *ngFor="let p of productos; trackBy: trackById">{{ p.nombre }}</li>
```
```typescript
trackById(index: number, producto: Producto): number {
  return producto.id;   // Angular reutiliza el DOM si el id no cambió
}
```
> Sin `trackBy`, reemplazar la lista entera (típico tras un HTTP) recrea todo. **Es una de las optimizaciones más citadas en entrevistas** (Sesión 20).

### 1.4 `*ngSwitch`
Muestra un bloque según un valor (como un `switch`).

```html
<div [ngSwitch]="rol">
  <p *ngSwitchCase="'admin'">Panel de admin</p>
  <p *ngSwitchCase="'editor'">Editor</p>
  <p *ngSwitchDefault>Invitado</p>
</div>
```
Nota: `[ngSwitch]` es property binding (sin `*`), pero `*ngSwitchCase`/`*ngSwitchDefault` sí son estructurales.

### 1.5 Regla: una sola directiva estructural por elemento
No puedes poner `*ngIf` y `*ngFor` en el **mismo** elemento. Solución clásica: envolver con `<ng-container>` (no genera HTML extra):

```html
<ng-container *ngIf="mostrar">
  <li *ngFor="let x of items">{{ x }}</li>
</ng-container>
```

---

## 2. Nueva sintaxis de control de flujo (Angular 17+)

Desde Angular 17 hay un flujo de control **integrado en el template**, sin importar `CommonModule`, más rápido y legible. Convive con `*ngIf`/`*ngFor` (que siguen funcionando).

```html
<!-- @if / @else -->
@if (estaLogueado) {
  <p>Bienvenido</p>
} @else if (cargando) {
  <p>Cargando…</p>
} @else {
  <p>Inicia sesión</p>
}

<!-- @for (trackBy es OBLIGATORIO aquí) -->
@for (producto of productos; track producto.id) {
  <li>{{ producto.nombre }}</li>
} @empty {
  <li>No hay productos</li>
}

<!-- @switch -->
@switch (rol) {
  @case ('admin')  { <p>Admin</p> }
  @case ('editor') { <p>Editor</p> }
  @default         { <p>Invitado</p> }
}
```

Diferencias clave con lo clásico:
- `@for` exige `track` (equivalente a `trackBy`) → rendimiento por defecto.
- Trae `@empty` para listas vacías.
- No necesita `<ng-container>` para combinar condicionales y bucles.

> En entrevista: menciona que `@if/@for/@switch` son la forma **moderna** (Sesión 29), pero que en proyectos existentes verás `*ngIf/*ngFor`. Saber ambas te posiciona bien.

---

## 3. Directivas de atributo integradas

Cambian apariencia/comportamiento sin alterar la estructura. Ya las viste en la Sesión 4:

```html
<div [ngClass]="{ activo: on, error: hayError }"></div>
<div [ngStyle]="{ color: c, 'font-size.px': 16 }"></div>
<input [(ngModel)]="valor">
```

---

## 4. Crear una directiva de atributo propia

Es lo que separa saber *usar* Angular de *entenderlo*. Ejemplo: resaltar un elemento al pasar el mouse.

```typescript
import { Directive, ElementRef, HostListener, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[appResaltar]',   // se usa como atributo: <p appResaltar>
  standalone: true,
})
export class ResaltarDirective {
  @Input() appResaltar = 'yellow';   // color configurable

  constructor(private el: ElementRef) {}

  @HostBinding('style.backgroundColor') fondo = '';

  @HostListener('mouseenter') onEnter() {
    this.fondo = this.appResaltar;
  }

  @HostListener('mouseleave') onLeave() {
    this.fondo = '';
  }
}
```

```html
<p appResaltar="lightblue">Pásame el mouse</p>
```

### Piezas clave

| Elemento | Qué es |
|---|---|
| `@Directive` | Declara la directiva (como `@Component` sin template) |
| `selector: '[appX]'` | Selector por atributo (los corchetes) |
| `ElementRef` | Referencia al elemento host del DOM (`el.nativeElement`) |
| `@HostBinding('prop')` | Enlaza una **propiedad del host** a una propiedad de la clase |
| `@HostListener('evento')` | Escucha un **evento del host** y ejecuta un método |
| `@Input()` | Configura la directiva desde el template |

### 4.1 `@HostBinding` y `@HostListener`
- **`@HostBinding`** = property binding hacia el elemento que lleva la directiva. `@HostBinding('class.activo') activo = true` equivale a poner `[class.activo]` en el host.
- **`@HostListener`** = event binding desde el host. Puede recibir `$event`:

```typescript
@HostListener('click', ['$event']) onClick(e: MouseEvent) {
  e.preventDefault();
}
@HostListener('window:resize') onResize() { /* eventos globales */ }
```

---

## 5. `ElementRef` vs `Renderer2`

Puedes tocar el DOM de dos formas:

```typescript
// ElementRef: acceso directo (rápido, pero acoplado al navegador)
this.el.nativeElement.style.color = 'red';   // ⚠️ evitar en SSR/Web Workers
```

```typescript
// Renderer2: abstracción segura y recomendada
constructor(private el: ElementRef, private renderer: Renderer2) {}

ngOnInit() {
  this.renderer.setStyle(this.el.nativeElement, 'color', 'red');
  this.renderer.addClass(this.el.nativeElement, 'activo');
  this.renderer.setAttribute(this.el.nativeElement, 'role', 'button');
}
```

**¿Por qué `Renderer2`?** Angular puede correr fuera del navegador (SSR con Angular Universal, Web Workers). Acceder al DOM directo con `nativeElement` rompe en esos entornos y es un vector de seguridad (XSS). `Renderer2` abstrae el DOM y es **la forma recomendada** de manipularlo desde directivas.

> Regla de entrevista: *"Evita manipular el DOM directamente; usa `Renderer2` por portabilidad (SSR) y seguridad."*

---

## 6. Directivas estructurales propias (avanzado, resumen)

Se crean con `TemplateRef` y `ViewContainerRef`. Ejemplo simplificado de un `*appSiEs` (como `*ngIf`):

```typescript
@Directive({ selector: '[appSiEs]', standalone: true })
export class SiEsDirective {
  constructor(
    private tpl: TemplateRef<unknown>,
    private vcr: ViewContainerRef,
  ) {}

  @Input() set appSiEs(cond: boolean) {
    this.vcr.clear();
    if (cond) this.vcr.createEmbeddedView(this.tpl);
  }
}
```
- `TemplateRef` = el bloque de HTML "plantilla" (lo que envuelve el `*`).
- `ViewContainerRef` = el contenedor donde insertas/quitas ese template.

El `*` es azúcar: `*appSiEs="x"` se expande a `<ng-template [appSiEs]="x">`. Entender esto explica por qué solo puede haber **una** estructural por elemento.

---

## 7. Preguntas de entrevista

1. ¿Qué tipos de directivas hay? Da ejemplos.
2. ¿Diferencia entre directiva estructural y de atributo?
3. ¿Por qué no puedes poner `*ngIf` y `*ngFor` en el mismo elemento? ¿Solución?
4. ¿Qué hace `trackBy` y por qué mejora el rendimiento?
5. ¿Diferencia entre `*ngIf="false"` y `[hidden]="true"`?
6. ¿Para qué sirven `@HostBinding` y `@HostListener`?
7. ¿`ElementRef` vs `Renderer2`? ¿Cuál usar y por qué?
8. ¿Qué significa el `*` en una directiva estructural?
9. ¿Qué aporta `@for ... track` de Angular 17 frente a `*ngFor`?
10. ¿Qué son `TemplateRef` y `ViewContainerRef`?

<details>
<summary>Respuestas resumidas</summary>

1. Componente (con template), estructural (`*ngIf`,`*ngFor`,`*ngSwitch`), atributo (`ngClass`,`ngStyle`, propias).
2. Estructural añade/quita elementos del DOM; atributo cambia apariencia/comportamiento del elemento existente.
3. Solo se permite una estructural por elemento (cada `*` genera un `<ng-template>`). Solución: `<ng-container>`.
4. Da una identidad a cada item; Angular reutiliza el DOM en vez de recrear toda la lista.
5. `*ngIf=false` quita el elemento del DOM (destruye el componente); `[hidden]` lo mantiene, solo lo oculta con CSS.
6. `@HostBinding` enlaza una propiedad del host; `@HostListener` escucha un evento del host.
7. `Renderer2` (recomendado): abstrae el DOM, seguro para SSR/Web Workers y contra XSS. `ElementRef.nativeElement` es acceso directo, evitar.
8. Azúcar sintáctico que expande el elemento a un `<ng-template>` con la directiva.
9. `track` es obligatorio (rendimiento por defecto), trae `@empty`, no requiere `CommonModule` ni `<ng-container>`.
10. `TemplateRef` = el HTML plantilla; `ViewContainerRef` = contenedor donde se inserta/quita ese template.

</details>

---

## ✅ Checklist para pasar a la Sesión 6

- [ ] Distingo los tres tipos de directivas.
- [ ] Domino `*ngIf` (con else), `*ngFor` (variables locales), `*ngSwitch`.
- [ ] Entiendo `trackBy` y por qué importa.
- [ ] Conozco `@if`/`@for`/`@switch` de Angular 17+.
- [ ] Sé crear una directiva de atributo con `@HostBinding`/`@HostListener`.
- [ ] Explico `ElementRef` vs `Renderer2` y cuándo usar cada uno.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 6 — Pipes** (built-in, `async`, crear pipes propios, pure vs impure).
