# Sesión 25 — CDK (Component Dev Kit)

> **Objetivo**: entender el CDK, la caja de herramientas de **comportamientos** sin estilos sobre la que se construye Angular Material. Cubre sus módulos clave: Overlay, Portal, Scrolling (Virtual Scroll), Drag & Drop, A11y, Clipboard, Layout y Observers. El CDK es lo que usas para crear **tus propios** componentes avanzados y accesibles.

> Requisito: [Sesión 24](sesion-24-angular-material.md) (Material) y directivas (S5), ViewChild (S7).

---

## 0. ¿Qué es el CDK?

El **CDK (Component Dev Kit)** es una librería de **primitivas de comportamiento** sin opinión visual: resuelve los problemas difíciles (posicionar overlays, accesibilidad, virtual scroll, drag & drop) **sin imponer estilos**. Angular Material lo usa por debajo; tú puedes usarlo directamente para construir componentes a medida con la robustez de Material pero tu propio diseño ("headless").

```
Angular Material = CDK (comportamiento) + Material Design (estilo)
Tú puedes usar    = CDK (comportamiento) + TU estilo
```

Se instala junto con Material o solo: `npm i @angular/cdk`.

---

## 1. Overlay 🔑

Renderiza contenido **flotante por encima** de la página (dropdowns, tooltips, modales, menús contextuales), gestionando posicionamiento, scroll y z-index. Es la base de `MatDialog`, `MatMenu`, `MatSnackBar`, tooltips.

```typescript
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

constructor(private overlay: Overlay) {}

abrir() {
  const overlayRef: OverlayRef = this.overlay.create({
    positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
    hasBackdrop: true,
  });
  overlayRef.attach(new ComponentPortal(MiComponente));
  overlayRef.backdropClick().subscribe(() => overlayRef.dispose());
}
```
Conceptos: **PositionStrategy** (global o `flexibleConnectedTo` un elemento), **ScrollStrategy** (reposicionar/cerrar al hacer scroll), **backdrop** (fondo oscuro clickeable).

---

## 2. Portal

Un **Portal** es una pieza de UI (componente o template) que puedes **renderizar dinámicamente en otro lugar** del DOM. El Overlay lo usa para inyectar contenido flotante.

```typescript
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';

new ComponentPortal(MiComponente);              // portal de un componente
new TemplatePortal(this.tpl, this.viewContainerRef);  // portal de un <ng-template>
```
```html
<ng-template cdkPortal>Contenido teletransportable</ng-template>
<div [cdkPortalOutlet]="miPortal"></div>   <!-- se renderiza aquí -->
```
Útil para: modales, tabs dinámicos, inyectar contenido en un slot lejano.

---

## 3. Scrolling — Virtual Scroll 🔑

Renderiza solo los elementos **visibles** de una lista enorme, reciclando nodos al hacer scroll → rendimiento (Sesión 20).

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';
```
```html
<cdk-virtual-scroll-viewport itemSize="50" class="viewport">
  <div *cdkVirtualFor="let item of items" class="fila">{{ item.nombre }}</div>
</cdk-virtual-scroll-viewport>
```
```css
.viewport { height: 400px; }
.fila { height: 50px; }
```
- `itemSize` = altura fija de cada ítem (necesaria para calcular qué renderizar).
- `*cdkVirtualFor` reemplaza a `*ngFor` dentro del viewport.
- Sin esto, 10.000 filas crean 10.000 nodos y el navegador se traba; con virtual scroll solo hay ~10-20 en el DOM.

---

## 4. Drag & Drop

Arrastrar y soltar (reordenar listas, kanban) con animaciones y transferencia entre listas:

```typescript
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
```
```html
<div cdkDropList (cdkDropListDropped)="soltar($event)">
  <div class="item" *ngFor="let t of tareas" cdkDrag>{{ t }}</div>
</div>
```
```typescript
soltar(event: CdkDragDrop<string[]>) {
  moveItemInArray(this.tareas, event.previousIndex, event.currentIndex);
}
```
`transferArrayItem` mueve entre listas conectadas (`cdkDropListConnectedTo`) — base de un tablero Kanban.

---

## 5. A11y (accesibilidad) 🔑

Herramientas para hacer componentes accesibles, lo que da a Material su a11y de fábrica:

- **`FocusTrap`** (`cdkTrapFocus`): atrapa el foco dentro de un modal (Tab no se escapa).
- **`FocusMonitor`**: detecta cómo se enfocó un elemento (mouse, teclado, programático) → estilos de focus correctos.
- **`LiveAnnouncer`**: anuncia mensajes a lectores de pantalla (`aria-live`).
- **`ListKeyManager`**: navegación con flechas en listas/menús.

```typescript
constructor(private announcer: LiveAnnouncer) {}
guardar() { this.announcer.announce('Producto guardado'); }
```
```html
<div cdkTrapFocus>  <!-- foco atrapado dentro del modal --> </div>
```

---

## 6. Layout (BreakpointObserver) — responsive en TS

Reaccionar a media queries desde el TypeScript (no solo CSS):
```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

constructor(private bp: BreakpointObserver) {}

esMovil$ = this.bp.observe(Breakpoints.Handset).pipe(map(r => r.matches));
```
Útil para cambiar layout/comportamiento (ej. sidenav colapsable) según el tamaño de pantalla, de forma reactiva.

---

## 7. Otros módulos

- **Clipboard** (`cdkCopyToClipboard`): copiar texto al portapapeles.
  ```html
  <button [cdkCopyToClipboard]="texto">Copiar</button>
  ```
- **Observers** (`cdkObserveContent`): detectar cambios en el contenido proyectado (MutationObserver).
- **Text Field**: autosize de `<textarea>` (`cdkTextareaAutosize`).
- **Table** (`@angular/cdk/table`): la tabla base sin estilos (MatTable la reviste).
- **Stepper / Tree / Menu / Listbox / Dialog**: primitivas base que Material estiliza; puedes usarlas headless.

---

## 8. Cuándo usar el CDK directamente

- Necesitas un componente **a medida** (dropdown, modal, tooltip) con comportamiento robusto pero **tu propio diseño** (no el look Material).
- Usas otra librería de estilos (Tailwind) pero quieres la lógica probada de overlay/a11y/virtual-scroll.
- Construyes una **design system / librería** propia (Sesión 30).

> En entrevista: *"El CDK te da los comportamientos difíciles (posicionamiento, accesibilidad, virtual scroll) sin estilos; es la base de Material y la forma correcta de construir componentes avanzados sin reinventar la rueda ni sacrificar accesibilidad."*

---

## 9. Preguntas de entrevista

1. ¿Qué es el CDK y en qué se diferencia de Angular Material?
2. ¿Qué es el Overlay y qué componentes de Material lo usan?
3. ¿Qué es un Portal?
4. ¿Cómo funciona el Virtual Scroll y qué problema resuelve?
5. ¿Cómo implementas drag & drop entre listas?
6. ¿Qué herramientas de a11y ofrece el CDK?
7. ¿Qué es un FocusTrap y dónde lo usarías?
8. ¿Cómo reaccionas a breakpoints desde el TypeScript?
9. ¿Cuándo usarías el CDK directamente en vez de Material?
10. ¿Por qué el CDK es clave para la accesibilidad?

<details>
<summary>Respuestas resumidas</summary>

1. El CDK son comportamientos sin estilo; Material añade el diseño Material sobre el CDK.
2. Servicio para renderizar contenido flotante posicionado; lo usan MatDialog, MatMenu, MatSnackBar, tooltips.
3. Una pieza de UI (componente/template) que se renderiza dinámicamente en otro lugar del DOM.
4. Renderiza solo los ítems visibles reciclando nodos (`*cdkVirtualFor` + `itemSize`); resuelve listas enormes.
5. Con `cdkDropList`/`cdkDrag` y `transferArrayItem` entre listas conectadas.
6. FocusTrap, FocusMonitor, LiveAnnouncer, ListKeyManager.
7. Atrapa el foco dentro de un contenedor (modal) para que Tab no se escape.
8. Con `BreakpointObserver.observe(Breakpoints.X)` que emite un Observable.
9. Para componentes a medida con tu diseño, otra librería de estilos, o una design system propia.
10. Provee focus management, anuncios a lectores de pantalla y navegación por teclado listos y probados.

</details>

---

## ✅ Checklist para pasar a la Sesión 26

- [ ] Entiendo qué es el CDK y su relación con Material.
- [ ] Conozco Overlay y Portal (base de los flotantes).
- [ ] Sé montar un Virtual Scroll y drag & drop.
- [ ] Conozco las herramientas de a11y (FocusTrap, LiveAnnouncer…).
- [ ] Uso BreakpointObserver para responsive en TS.
- [ ] Sé cuándo usar el CDK directamente.

Cuando lo tengas, dime **"siguiente"**. La **Sesión 26 — Renderizado (SSR)** ya está creada.
