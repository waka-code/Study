# Sesión 7 — Comunicación entre componentes

> **Objetivo**: dominar todas las formas en que dos componentes se pasan datos: `@Input`/`@Output`/`EventEmitter` (padre↔hijo), `@ViewChild`/`@ContentChild` (acceso a hijos), `ng-content` (proyección de contenido), y saber **cuándo usar cada una** — incluido cuándo ninguna sirve y toca un servicio.

> Requisito: [Sesión 3](sesion-03-componentes.md) y [Sesión 4](sesion-04-templates-binding.md).

---

## 0. Mapa de comunicación

```
                 @Input()  ▼ (datos)
        ┌──────────────────────────┐
PADRE   │          HIJO            │
        └──────────────────────────┘
                 @Output() ▲ (eventos)

@ViewChild → el padre accede a la instancia/elemento del hijo
ng-content + @ContentChild → el padre PROYECTA contenido dentro del hijo
Servicio compartido → comunicación entre componentes NO relacionados
```

| Necesidad | Herramienta |
|---|---|
| Padre → Hijo: pasar datos | `@Input()` |
| Hijo → Padre: notificar/emitir | `@Output()` + `EventEmitter` |
| Padre accede a método/prop del hijo | `@ViewChild()` |
| Padre inserta HTML dentro del hijo | `<ng-content>` |
| Hijo accede a lo proyectado | `@ContentChild()` |
| Componentes sin relación directa | **Servicio compartido** (Sesión 8) |

---

## 1. `@Input()` — Padre → Hijo

El padre pasa datos al hijo mediante property binding.

```typescript
// hijo.component.ts
import { Component, Input } from '@angular/core';

@Component({ selector: 'app-tarjeta', /* ... */ })
export class TarjetaComponent {
  @Input() titulo = '';
  @Input() precio!: number;
  @Input() producto!: Producto;
}
```

```html
<!-- padre.component.html -->
<app-tarjeta
  [titulo]="'Teclado'"
  [precio]="25000"
  [producto]="miProducto">
</app-tarjeta>
```

### 1.1 Alias
```typescript
@Input('nombreExterno') nombreInterno = '';
```
```html
<app-x [nombreExterno]="valor"></app-x>   <!-- se usa el alias -->
```

### 1.2 Detectar cambios de un `@Input`
Con `ngOnChanges` (Sesión 3) o con un setter:
```typescript
@Input() set usuarioId(id: number) {
  this._id = id;
  this.cargar(id);       // reacciona cada vez que cambia el input
}
private _id!: number;
```

### 1.3 Input requerido (Angular 16+)
```typescript
@Input({ required: true }) id!: number;   // error de compilación si el padre no lo pasa
```

---

## 2. `@Output()` + `EventEmitter` — Hijo → Padre

El hijo **emite eventos** que el padre escucha con event binding.

```typescript
// hijo.component.ts
import { Component, Output, EventEmitter } from '@angular/core';

@Component({ selector: 'app-tarjeta', /* ... */ })
export class TarjetaComponent {
  @Output() comprar = new EventEmitter<Producto>();
  @Output() eliminar = new EventEmitter<number>();

  onComprar(): void {
    this.comprar.emit(this.producto);   // emite un valor hacia el padre
  }
}
```

```html
<!-- hijo template -->
<button (click)="onComprar()">Comprar</button>
```

```html
<!-- padre template -->
<app-tarjeta
  [producto]="p"
  (comprar)="onCompra($event)"       <!-- $event = lo emitido -->
  (eliminar)="onEliminar($event)">
</app-tarjeta>
```

```typescript
// padre.component.ts
onCompra(producto: Producto): void { /* ... */ }
onEliminar(id: number): void { /* ... */ }
```

> 🔑 `$event` en un `@Output` es el **valor emitido** (`emit(valor)`), no un evento del DOM. El genérico `EventEmitter<T>` tipa ese valor.

### 2.1 Convención two-way
Para hacer un input two-way propio (`[(x)]`), la convención es un `@Input() x` + un `@Output() xChange`:
```typescript
@Input() valor = '';
@Output() valorChange = new EventEmitter<string>();
cambiar(v: string) { this.valor = v; this.valorChange.emit(v); }
```
```html
<app-x [(valor)]="dato"></app-x>   <!-- funciona por la convención xChange -->
```
Esto es exactamente cómo funciona `[(ngModel)]` por dentro (Sesión 4).

---

## 3. `@ViewChild()` — el padre accede al hijo

Permite al padre obtener la **instancia** de un componente hijo, un elemento del DOM o una directiva, y llamar sus métodos/propiedades.

```typescript
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({ /* ... */ })
export class PadreComponent implements AfterViewInit {
  @ViewChild(TarjetaComponent) tarjeta!: TarjetaComponent;      // por tipo
  @ViewChild('miInput') input!: ElementRef<HTMLInputElement>;   // por ref #miInput

  ngAfterViewInit(): void {
    // ✅ aquí la vista YA está lista (ver Sesión 3)
    this.tarjeta.recargar();
    this.input.nativeElement.focus();
  }
}
```

```html
<app-tarjeta></app-tarjeta>
<input #miInput>
```

### 3.1 Reglas clave
- Disponible **a partir de `ngAfterViewInit`** (no en el constructor ni en `ngOnInit`).
- Si el hijo está dentro de un `*ngIf`, puede ser `undefined` hasta que exista → usa `{ static: false }` (default) y accede tras el render.
- `static: true` solo si el elemento **siempre existe** y lo necesitas en `ngOnInit`.

### 3.2 `@ViewChildren`
Para **varios** elementos → devuelve un `QueryList`:
```typescript
@ViewChildren(TarjetaComponent) tarjetas!: QueryList<TarjetaComponent>;
```

---

## 4. `ng-content` — proyección de contenido

Permite al **padre insertar HTML dentro del hijo**. El hijo define "huecos" con `<ng-content>`. Es la base de componentes reutilizables (cards, modales, botones).

```html
<!-- boton.component.html (el hijo define el hueco) -->
<button class="btn">
  <ng-content></ng-content>   <!-- aquí se inserta lo que ponga el padre -->
</button>
```

```html
<!-- padre: el contenido va DENTRO de las etiquetas del hijo -->
<app-boton>Guardar cambios</app-boton>
<app-boton><span class="icono">✓</span> OK</app-boton>
```

### 4.1 Múltiples slots con `select`
```html
<!-- card.component.html -->
<div class="card">
  <header><ng-content select="[card-title]"></ng-content></header>
  <main><ng-content select="[card-body]"></ng-content></main>
  <footer><ng-content></ng-content></footer>   <!-- el resto (default) -->
</div>
```

```html
<!-- padre -->
<app-card>
  <h2 card-title>Título</h2>
  <p card-body>Contenido…</p>
  <button>Acción</button>   <!-- va al slot default -->
</app-card>
```

`select` acepta selectores CSS (atributo `[card-title]`, clase `.x`, tag `p`).

---

## 5. `@ContentChild()` — el hijo accede a lo proyectado

Mientras `@ViewChild` accede a elementos de **su propio template**, `@ContentChild` accede al contenido **proyectado desde el padre** vía `ng-content`.

```typescript
@ContentChild(IconoComponent) icono!: IconoComponent;

ngAfterContentInit(): void {     // ← disponible aquí, no en AfterViewInit
  this.icono?.animar();
}
```

| | Origen | Hook donde está listo |
|---|---|---|
| `@ViewChild` | Template propio del componente | `ngAfterViewInit` |
| `@ContentChild` | Contenido proyectado (`ng-content`) | `ngAfterContentInit` |

`@ContentChildren` → `QueryList` para varios.

---

## 6. `TemplateRef` y `ng-template`

`ng-template` define un bloque de HTML que **no se renderiza** hasta que se pide. Ya lo viste con `*ngIf ... else` (Sesión 5). Se puede pasar como `@Input` para plantillas configurables:

```typescript
@Input() plantillaItem!: TemplateRef<unknown>;
```
```html
<ng-container *ngTemplateOutlet="plantillaItem; context: { $implicit: item }">
</ng-container>
```
Patrón avanzado (listas/tablas configurables). Por ahora, reconócelo.

---

## 7. ¿Y componentes NO relacionados?

`@Input`/`@Output` solo sirven entre **padre e hijo directos**. Para componentes lejanos o sin relación (ej. un header y una página profunda), **no** encadenes inputs por toda la jerarquía ("prop drilling"). Usa un **servicio compartido** con un `Subject`/`BehaviorSubject` (Sesión 8 y 13) o gestión de estado (NgRx, Sesión 23).

```typescript
// servicio compartido (adelanto)
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private items$ = new BehaviorSubject<Producto[]>([]);
  items = this.items$.asObservable();
  agregar(p: Producto) { /* ... */ }
}
```
Cualquier componente inyecta el servicio y se suscribe. **Esta es la forma correcta** para comunicación global.

---

## 8. Tabla de decisión

| Situación | Solución |
|---|---|
| Padre pasa datos al hijo | `@Input` |
| Hijo avisa al padre | `@Output` + `EventEmitter` |
| Two-way binding propio | `@Input x` + `@Output xChange` |
| Padre llama método del hijo | `@ViewChild` (en `ngAfterViewInit`) |
| Reutilizar layout con contenido variable | `ng-content` |
| Hijo lee lo proyectado | `@ContentChild` (en `ngAfterContentInit`) |
| Componentes sin relación | Servicio compartido / NgRx |

---

## 9. Preguntas de entrevista

1. ¿Cómo pasas datos de padre a hijo y de hijo a padre?
2. ¿Qué es un `EventEmitter` y qué es `$event` en un `@Output`?
3. ¿Cómo implementas un two-way binding propio?
4. ¿Diferencia entre `@ViewChild` y `@ContentChild`? ¿En qué hook está listo cada uno?
5. ¿Por qué `@ViewChild` no está disponible en el constructor?
6. ¿Qué es `ng-content` y para qué sirve `select`?
7. ¿Cómo comunicas dos componentes sin relación padre-hijo?
8. ¿Qué es el "prop drilling" y cómo lo evitas?
9. ¿Diferencia entre `@ViewChild` y `@ViewChildren`?
10. ¿Cómo detectas cambios de un `@Input`?

<details>
<summary>Respuestas resumidas</summary>

1. Padre→hijo con `@Input` (property binding); hijo→padre con `@Output`+`EventEmitter` (event binding).
2. Emisor de eventos personalizados; `$event` es el valor pasado a `.emit(valor)`.
3. `@Input() x` + `@Output() xChange`; el template usa `[(x)]`.
4. `@ViewChild` accede al template propio (listo en `ngAfterViewInit`); `@ContentChild` al contenido proyectado (listo en `ngAfterContentInit`).
5. La vista aún no se ha renderizado en el constructor/ngOnInit.
6. Proyección de contenido: inserta HTML del padre en el hijo; `select` define slots por selector CSS.
7. Con un servicio compartido (`Subject`/`BehaviorSubject`) o NgRx.
8. Pasar props a través de muchos niveles intermedios; se evita con servicio/estado compartido.
9. `@ViewChild` uno; `@ViewChildren` varios (QueryList).
10. Con `ngOnChanges` o un setter en el `@Input`.

</details>

---

## ✅ Checklist para pasar a la Sesión 8

- [ ] Domino `@Input`/`@Output`/`EventEmitter` y `$event`.
- [ ] Sé implementar un two-way binding propio (`xChange`).
- [ ] Entiendo `@ViewChild`/`@ViewChildren` y su hook (`ngAfterViewInit`).
- [ ] Sé usar `ng-content` con múltiples slots (`select`).
- [ ] Distingo `@ViewChild` vs `@ContentChild`.
- [ ] Sé cuándo NINGUNO sirve y toca un servicio compartido.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 8 — Servicios** (qué son, singleton, `@Injectable`, `providedIn`, y el comienzo de la Inyección de Dependencias).
