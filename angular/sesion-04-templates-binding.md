# Sesión 4 — Templates y data binding

> **Objetivo**: dominar cómo la **clase** (TypeScript) y el **template** (HTML) se comunican. Este es el corazón del día a día en Angular: interpolación, los cuatro tipos de binding y el two-way binding. Al terminar deberías saber elegir el binding correcto y explicar la dirección del flujo de datos en cada caso.

> Requisito: [Sesión 3](sesion-03-componentes.md).

---

## 0. La idea central: dirección del flujo

Todo el binding se resume en **hacia dónde fluyen los datos**:

```
Clase  ──────────────▶  Template     Interpolación, Property binding
Clase  ◀──────────────  Template     Event binding
Clase  ◀─────────────▶  Template     Two-way binding
```

Memoriza los símbolos:

| Sintaxis | Nombre | Dirección |
|---|---|---|
| `{{ }}` | Interpolación | Clase → Vista |
| `[ ]` | Property binding | Clase → Vista |
| `( )` | Event binding | Vista → Clase |
| `[( )]` | Two-way binding | Clase ↔ Vista ("banana in a box" 🍌📦) |

---

## 1. Interpolación `{{ }}`

Muestra el valor de una expresión de la clase **como texto** en el HTML.

```typescript
export class PerfilComponent {
  nombre = 'Ada';
  edad = 30;
  usuario = { rol: 'admin' };
}
```

```html
<h1>Hola, {{ nombre }}</h1>
<p>Edad: {{ edad }}</p>
<p>El año que viene: {{ edad + 1 }}</p>       <!-- puede haber expresiones -->
<p>Mayúsculas: {{ nombre.toUpperCase() }}</p>
<p>Rol: {{ usuario?.rol }}</p>                 <!-- optional chaining -->
<p>Nombre: {{ nombre || 'Anónimo' }}</p>
```

### Reglas de las expresiones de template
- ✅ Permitido: operaciones simples, llamadas a métodos, `?.`, operadores.
- ❌ Prohibido: asignaciones (`=`), `new`, `++`/`--`, `;`, operadores como `|` que no sean pipes, o efectos secundarios.
- 🔁 Se **re-evalúan en cada ciclo de detección de cambios** → evita lógica pesada o llamadas costosas dentro de `{{ }}` (impacta rendimiento; Sesión 14).

---

## 2. Property binding `[ ]`

Enlaza una **propiedad del DOM/elemento/componente** con un valor de la clase.

```typescript
export class GaleriaComponent {
  imagen = 'assets/foto.jpg';
  deshabilitado = true;
  ancho = 300;
}
```

```html
<img [src]="imagen" [width]="ancho">
<button [disabled]="deshabilitado">Guardar</button>
```

### Interpolación vs property binding
```html
<img src="{{ imagen }}">   <!-- funciona, pero solo para strings -->
<img [src]="imagen">        <!-- preferido; evalúa como expresión -->
<button [disabled]="deshabilitado">  <!-- ✅ pasa un booleano real -->
<button disabled="{{ deshabilitado }}">  <!-- ⚠️ pasa el string "true"/"false" -->
```

Regla: para **strings simples** cualquiera vale; para **booleanos, números u objetos** usa `[ ]` porque respeta el tipo.

> 🔑 **Propiedad ≠ atributo.** El property binding enlaza la **propiedad del DOM** (lo que vive en el objeto JS del elemento), no el atributo HTML. Para atributos puros existe el attribute binding (§3).

---

## 3. Attribute, Class y Style binding

### 3.1 Attribute binding `[attr.x]`
Algunos atributos HTML **no tienen** propiedad DOM equivalente (ej. `colspan`, `aria-*`, `role`). Para esos se usa `attr.`:

```html
<td [attr.colspan]="2">...</td>
<button [attr.aria-label]="etiqueta">X</button>
<div [attr.data-id]="id"></div>
```

Si el valor es `null`, el atributo se **quita** del DOM.

### 3.2 Class binding
Añade/quita clases CSS según condiciones.

```html
<!-- una sola clase condicional -->
<div [class.activo]="estaActivo"></div>

<!-- varias clases con objeto (ngClass) -->
<div [ngClass]="{ activo: estaActivo, error: hayError }"></div>

<!-- con array o string -->
<div [ngClass]="['clase1', 'clase2']"></div>
<div [ngClass]="clasesComoString"></div>
```

### 3.3 Style binding
```html
<!-- estilo individual -->
<p [style.color]="color"></p>
<p [style.font-size.px]="tamano"></p>     <!-- con unidad: 16 → "16px" -->

<!-- varios estilos con objeto (ngStyle) -->
<p [ngStyle]="{ color: color, 'font-weight': peso }"></p>
```

> `[class.x]`/`[style.x]` para **uno**; `[ngClass]`/`[ngStyle]` para **varios** dinámicos. (`ngClass`/`ngStyle` son directivas de atributo; más en Sesión 5.)

---

## 4. Event binding `( )`

Ejecuta un método de la clase cuando ocurre un **evento** del DOM. Los datos fluyen **Vista → Clase**.

```html
<button (click)="guardar()">Guardar</button>
<input (input)="onInput($event)">
<input (keyup)="onKey($event)">
<form (submit)="enviar($event)">
<div (mouseenter)="hover = true" (mouseleave)="hover = false"></div>
```

### 4.1 `$event`
Es el objeto del evento nativo. Para inputs, `$event.target.value` trae el texto.

```typescript
onInput(event: Event): void {
  const valor = (event.target as HTMLInputElement).value;
  console.log(valor);
}
```

```html
<button (click)="borrar(item.id)">Borrar</button>   <!-- pasar argumentos propios -->
```

### 4.2 Eventos comunes
`click`, `input`, `change`, `keyup`, `keydown`, `submit`, `focus`, `blur`, `mouseenter`, `mouseleave`, `scroll`.

### 4.3 Key modifiers (azúcar sintáctico)
```html
<input (keyup.enter)="buscar()">          <!-- solo con Enter -->
<input (keyup.escape)="cancelar()">
<input (keyup.control.s)="guardar()">     <!-- Ctrl+S -->
```

### 4.4 `$event` en outputs de componentes
En componentes hijos, `$event` es el valor emitido por un `@Output` (Sesión 7), no un evento del DOM:
```html
<app-hijo (guardado)="onGuardado($event)"></app-hijo>
```

---

## 5. Two-way binding `[( )]` 🍌📦

Combina property binding + event binding: la clase actualiza la vista **y** la vista actualiza la clase. La "banana in a box" `[()]`.

```html
<input [(ngModel)]="nombre">
<p>Escribiste: {{ nombre }}</p>
```

Al escribir en el input, `nombre` se actualiza; si cambias `nombre` en la clase, el input refleja el cambio.

### 5.1 `ngModel` requiere FormsModule
```typescript
// standalone:
import { FormsModule } from '@angular/forms';
@Component({ imports: [FormsModule], /* ... */ })

// o en un módulo:
@NgModule({ imports: [FormsModule] })
```
> Si olvidas importar `FormsModule`, `[(ngModel)]` da error. Es un tropiezo clásico.

### 5.2 Cómo funciona por dentro
`[(ngModel)]="x"` es azúcar sintáctico de:
```html
<input [ngModel]="x" (ngModelChange)="x = $event">
```
Es decir: property binding (`[ngModel]`) + event binding (`(ngModelChange)`). Por eso la convención de un `@Output` para two-way es `nombreChange` (lo verás en Sesión 7).

> Los formularios reactivos (Sesión 11) suelen preferirse a `ngModel` en apps grandes. `ngModel` es del enfoque *template-driven*.

---

## 6. Template reference variables `#var`

Una variable que referencia un **elemento del DOM** o un componente dentro del template.

```html
<input #campo type="text">
<button (click)="log(campo.value)">Leer</button>

<video #player src="..."></video>
<button (click)="player.play()">Play</button>
```

`#campo` te da acceso directo al elemento sin `@ViewChild`. Útil para lecturas rápidas dentro del mismo template. (Para usarlo desde la clase, `@ViewChild` — Sesión 7.)

---

## 7. Ejemplo integrador

```typescript
export class BuscadorComponent {
  termino = '';
  resultados: string[] = [];
  cargando = false;

  buscar(): void {
    this.cargando = true;
    // ... lógica
  }
}
```

```html
<input
  [(ngModel)]="termino"
  [class.activo]="termino.length > 0"
  (keyup.enter)="buscar()"
  placeholder="Buscar...">

<button [disabled]="!termino" (click)="buscar()">
  {{ cargando ? 'Buscando…' : 'Buscar' }}
</button>

<p [style.color]="resultados.length ? 'green' : 'gray'">
  {{ resultados.length }} resultados
</p>
```

Aquí conviven: two-way (`[(ngModel)]`), class binding, event con modifier, property binding, interpolación con expresión y style binding. **Esto es un template Angular típico.**

---

## 8. Errores frecuentes

- Usar `disabled="{{x}}"` (pasa string) en vez de `[disabled]="x"` (pasa booleano).
- Olvidar `FormsModule` al usar `[(ngModel)]`.
- Poner lógica pesada o llamadas HTTP dentro de `{{ }}` → se re-ejecuta en cada detección de cambios.
- Confundir property (`[src]`) con attribute (`[attr.colspan]`).
- Intentar asignaciones dentro de `{{ }}` (prohibido).

---

## 9. Preguntas de entrevista

1. Nombra los cuatro tipos de binding y su dirección de datos.
2. ¿Diferencia entre interpolación y property binding? ¿Cuándo importa?
3. ¿Propiedad vs atributo? ¿Cuándo usas `[attr.x]`?
4. ¿Qué es `$event` y cómo obtienes el valor de un input?
5. ¿Qué es two-way binding y en qué se descompone internamente?
6. ¿Qué necesitas importar para usar `[(ngModel)]`?
7. ¿Qué es una template reference variable?
8. ¿Por qué evitar llamadas a métodos costosos en `{{ }}`?
9. ¿Diferencia entre `[class.x]` y `[ngClass]`?
10. ¿Cómo pasas argumentos propios a un handler de evento?

<details>
<summary>Respuestas resumidas</summary>

1. Interpolación `{{}}` (clase→vista), property `[]` (clase→vista), event `()` (vista→clase), two-way `[()]` (ambas).
2. Interpolación convierte a string; property binding respeta el tipo (booleanos, números, objetos). Importa con no-strings.
3. Propiedad = del objeto DOM en JS; atributo = del HTML. `[attr.x]` para atributos sin propiedad equivalente (colspan, aria-*).
4. El objeto del evento nativo; el valor con `(e.target as HTMLInputElement).value`.
5. Clase↔vista; se descompone en `[ngModel]="x"` + `(ngModelChange)="x=$event"`.
6. `FormsModule`.
7. `#var`: referencia a un elemento/componente del template.
8. Se re-evalúan en cada ciclo de detección de cambios → coste de rendimiento.
9. `[class.x]` alterna una clase; `[ngClass]` maneja varias con objeto/array/string.
10. `(click)="metodo(item.id)"`.

</details>

---

## ✅ Checklist para pasar a la Sesión 5

- [ ] Memoricé los 4 bindings y su dirección.
- [ ] Distingo interpolación vs property binding y sé cuándo cada uno.
- [ ] Entiendo property vs attribute binding.
- [ ] Sé usar event binding, `$event` y key modifiers.
- [ ] Explico two-way binding y su descomposición interna.
- [ ] Sé qué es una template reference variable.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 5 — Directivas** (`*ngIf`, `*ngFor`, `*ngSwitch`, atributo, y crear directivas propias con `HostListener`/`HostBinding`).
