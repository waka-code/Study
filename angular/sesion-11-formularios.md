# Sesión 11 — Formularios

> **Objetivo**: dominar los dos enfoques de formularios de Angular (Template Driven y Reactive), las clases base (`FormControl`, `FormGroup`, `FormArray`, `FormBuilder`), validadores (built-in, personalizados, async, cross-field) y los formularios dinámicos. Los formularios reactivos son el estándar en apps serias.

> Requisito: [Sesión 4](sesion-04-templates-binding.md) (binding) y nociones de RxJS (Sesión 13, para `valueChanges`).

---

## 0. Los dos enfoques

Angular ofrece **dos** formas de manejar formularios:

| | **Template Driven** | **Reactive Forms** |
|---|---|---|
| Dónde vive la lógica | En el **template** (HTML) | En la **clase** (TypeScript) |
| Módulo | `FormsModule` | `ReactiveFormsModule` |
| Base | `ngModel` | `FormControl`/`FormGroup` |
| Validación | Directivas en el HTML | Funciones en la clase |
| Testeable | Menos | **Más** (lógica en TS) |
| Escala | Formularios simples | Formularios complejos/dinámicos |
| Control | Implícito (Angular gestiona) | **Explícito** (tú controlas el modelo) |

> Regla práctica: **Template Driven** para formularios pequeños (un login, un filtro). **Reactive** para todo lo serio. En entrevista, di que prefieres Reactive por testeabilidad y control explícito.

---

## 1. Template Driven Forms

Basado en `ngModel` (Sesión 4). La lógica está en el HTML.

```typescript
import { FormsModule } from '@angular/forms';
@Component({ imports: [FormsModule], /* ... */ })
export class LoginComponent {
  modelo = { email: '', password: '' };
  onSubmit(form: NgForm) {
    if (form.valid) console.log(this.modelo);
  }
}
```

```html
<form #form="ngForm" (ngSubmit)="onSubmit(form)">
  <input name="email" [(ngModel)]="modelo.email" required email #email="ngModel">
  <span *ngIf="email.invalid && email.touched">Email inválido</span>

  <input name="password" type="password" [(ngModel)]="modelo.password"
         required minlength="6">

  <button [disabled]="form.invalid">Entrar</button>
</form>
```

- `#form="ngForm"` expone el estado del formulario.
- Los validadores son **directivas HTML** (`required`, `email`, `minlength`).
- `#email="ngModel"` da acceso al estado de ese control (`valid`, `touched`, `errors`).

---

## 2. Reactive Forms

El modelo del formulario vive en la **clase**. Más explícito, testeable y potente.

```typescript
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({ imports: [ReactiveFormsModule], /* ... */ })
export class LoginComponent {
  formulario = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  onSubmit(): void {
    if (this.formulario.valid) {
      console.log(this.formulario.value);   // { email, password }
    }
  }
}
```

```html
<form [formGroup]="formulario" (ngSubmit)="onSubmit()">
  <input formControlName="email">
  <span *ngIf="formulario.get('email')?.hasError('email')">Email inválido</span>

  <input formControlName="password" type="password">

  <button [disabled]="formulario.invalid">Entrar</button>
</form>
```

- `[formGroup]` enlaza el form del HTML con el de la clase.
- `formControlName` conecta cada input con su `FormControl`.
- La validación son **funciones** (`Validators.x`) en la clase.

---

## 3. Las clases base

### 3.1 `FormControl` — un campo
```typescript
const email = new FormControl('valor inicial', [Validators.required]);
email.value;         // valor actual
email.valid;         // booleano
email.errors;        // { required: true } | null
email.setValue('x'); // asignar
email.reset();       // limpiar
```

### 3.2 `FormGroup` — un grupo de controles (un objeto)
```typescript
const form = new FormGroup({
  nombre: new FormControl(''),
  direccion: new FormGroup({          // grupos anidados
    calle: new FormControl(''),
    ciudad: new FormControl(''),
  }),
});
form.value;   // { nombre, direccion: { calle, ciudad } }
```

### 3.3 `FormArray` — lista dinámica de controles
Para cantidades variables (ej. varios teléfonos, ítems de una factura):
```typescript
const form = new FormGroup({
  telefonos: new FormArray([
    new FormControl(''),
    new FormControl(''),
  ]),
});

// agregar / quitar dinámicamente
get telefonos() { return this.form.get('telefonos') as FormArray; }
agregar() { this.telefonos.push(new FormControl('')); }
quitar(i: number) { this.telefonos.removeAt(i); }
```
```html
<div formArrayName="telefonos">
  <div *ngFor="let tel of telefonos.controls; let i = index">
    <input [formControlName]="i">
    <button (click)="quitar(i)">X</button>
  </div>
</div>
<button (click)="agregar()">+ Teléfono</button>
```

### 3.4 `FormBuilder` — azúcar sintáctico
Evita escribir tanto `new`. Se inyecta:
```typescript
constructor(private fb: FormBuilder) {}

formulario = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', Validators.required],
  direccion: this.fb.group({
    calle: [''],
    ciudad: [''],
  }),
  telefonos: this.fb.array([]),
});
```
`this.fb.group / .control / .array`. Es la forma más usada en la práctica.

---

## 4. Estados de un control

Angular rastrea el estado de cada control y del formulario:

| Estado | Significado |
|---|---|
| `valid` / `invalid` | Pasa/no pasa validación |
| `pristine` / `dirty` | Sin cambiar / modificado por el usuario |
| `touched` / `untouched` | Recibió/no recibió blur (foco perdido) |
| `pending` | Validación async en curso |
| `disabled` | Deshabilitado |

Uso típico para mostrar errores solo cuando corresponde:
```html
<span *ngIf="control.invalid && control.touched">Requerido</span>
```
> Mostrar el error solo si `touched` (o `dirty`) evita gritar errores antes de que el usuario escriba.

---

## 5. Validadores

### 5.1 Built-in
```typescript
Validators.required
Validators.email
Validators.min(0)
Validators.max(100)
Validators.minLength(6)
Validators.maxLength(50)
Validators.pattern(/^[0-9]+$/)
Validators.requiredTrue        // para checkboxes (aceptar términos)
```

### 5.2 Validador personalizado (síncrono)
Una función que recibe el control y devuelve `null` (válido) o un objeto de error:
```typescript
export function noEspacios(control: AbstractControl): ValidationErrors | null {
  const tieneEspacio = (control.value || '').includes(' ');
  return tieneEspacio ? { espacios: true } : null;
}

// uso
usuario: ['', [Validators.required, noEspacios]]
```
```html
<span *ngIf="form.get('usuario')?.hasError('espacios')">Sin espacios</span>
```

Validador con parámetro (factory que devuelve un validador):
```typescript
export function minPalabras(n: number): ValidatorFn {
  return (control) => {
    const palabras = (control.value || '').trim().split(/\s+/).length;
    return palabras >= n ? null : { minPalabras: { requerido: n, actual: palabras } };
  };
}
// uso: [minPalabras(3)]
```

### 5.3 Validador async
Para validar contra el servidor (ej. ¿email ya registrado?). Devuelve un `Observable`/`Promise`. Se pasa como **tercer** argumento:
```typescript
export function emailNoRegistrado(api: UserService): AsyncValidatorFn {
  return (control) => api.existeEmail(control.value).pipe(
    map(existe => existe ? { emailTomado: true } : null),
  );
}

// uso: [valor, [sync validators], [async validators]]
email: ['', [Validators.required, Validators.email], [emailNoRegistrado(this.userService)]]
```
Mientras corre, el control está en estado `pending`. Conviene aplicar `debounceTime` (Sesión 13) para no golpear el servidor en cada tecla.

### 5.4 Cross-field validation (validación entre campos)
Validar la relación entre dos controles (ej. password == confirmación). El validador va en el **FormGroup**, no en un control:
```typescript
export function passwordsIguales(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('password')?.value;
  const conf = group.get('confirmar')?.value;
  return pass === conf ? null : { noCoinciden: true };
}

formulario = this.fb.group({
  password: ['', Validators.required],
  confirmar: ['', Validators.required],
}, { validators: passwordsIguales });   // ← validador a nivel de grupo
```

---

## 6. Reaccionar a cambios: `valueChanges` / `statusChanges`

Cada control/form expone Observables (RxJS, Sesión 13):
```typescript
this.formulario.get('busqueda')!.valueChanges.pipe(
  debounceTime(300),           // espera 300ms tras dejar de escribir
  distinctUntilChanged(),      // ignora si el valor no cambió
).subscribe(valor => this.buscar(valor));

this.formulario.statusChanges.subscribe(estado => { /* VALID | INVALID | PENDING */ });
```
Este es el patrón típico de un **buscador reactivo**.

---

## 7. Formularios dinámicos

Construir el formulario desde una configuración/datos (campos que no conoces en tiempo de escritura). Se combina `FormArray`/`FormGroup` con un array de definiciones:
```typescript
const campos = [{ nombre: 'edad', tipo: 'number' }, { nombre: 'bio', tipo: 'text' }];
const grupo: Record<string, FormControl> = {};
campos.forEach(c => grupo[c.nombre] = new FormControl(''));
this.formulario = new FormGroup(grupo);
```
Útil para formularios generados por backend, encuestas, configuraciones.

---

## 8. Typed Forms (Angular 14+)

Desde Angular 14 los formularios reactivos son **tipados**: `FormControl<string>` sabe que su valor es string. Con `FormBuilder`, `this.fb.group({ email: [''] })` infiere tipos. Beneficio: `form.value.email` tiene tipo correcto y errores en compilación. Antes, todo era `any`. Menciónalo como mejora moderna (Sesión 29).

---

## 9. Preguntas de entrevista

1. ¿Diferencia entre Template Driven y Reactive Forms? ¿Cuándo cada uno?
2. ¿Qué módulo importa cada enfoque?
3. ¿Qué son `FormControl`, `FormGroup` y `FormArray`?
4. ¿Para qué sirve `FormBuilder`?
5. ¿Diferencia entre `touched`, `dirty` y `pristine`?
6. ¿Cómo creas un validador personalizado síncrono?
7. ¿Cómo funciona un validador async y qué estado activa?
8. ¿Cómo validas que dos campos coincidan (cross-field)?
9. ¿Cómo implementas un buscador que reacciona al escribir?
10. ¿Qué son los Typed Forms?

<details>
<summary>Respuestas resumidas</summary>

1. Template Driven pone la lógica en el HTML (`ngModel`); Reactive en la clase (`FormControl`). Reactive escala mejor y es más testeable.
2. `FormsModule` (template driven); `ReactiveFormsModule` (reactive).
3. Control = un campo; Group = objeto de controles; Array = lista dinámica de controles.
4. Azúcar para crear controles/grupos/arrays sin tanto `new` (`fb.group/control/array`).
5. `touched` = perdió el foco; `dirty` = el usuario lo cambió; `pristine` = intacto.
6. Función que recibe `AbstractControl` y devuelve `ValidationErrors | null`.
7. Devuelve Observable/Promise; se pasa como tercer argumento; el control queda `pending` mientras corre.
8. Con un validador a nivel de `FormGroup` que compara los dos controles.
9. Suscribiéndose a `valueChanges` con `debounceTime` + `distinctUntilChanged`.
10. Formularios reactivos con tipos (v14+): el valor de cada control tiene tipo, errores en compilación.

</details>

---

## ✅ Checklist para pasar a la Sesión 12

- [ ] Distingo Template Driven vs Reactive y cuándo usar cada uno.
- [ ] Domino `FormControl/FormGroup/FormArray` y `FormBuilder`.
- [ ] Conozco los estados (valid, touched, dirty, pending…).
- [ ] Sé usar validadores built-in y crear uno personalizado.
- [ ] Entiendo validadores async y cross-field.
- [ ] Sé reaccionar con `valueChanges` (buscador reactivo).

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 12 — HTTP** (`HttpClient`, verbos, headers/params, manejo de errores, retry, timeout — con Observables).
