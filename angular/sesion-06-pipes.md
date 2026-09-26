# Sesión 6 — Pipes

> **Objetivo**: dominar los pipes (transforman datos *en el template* sin tocar la clase), conocer los built-in más usados, entender a fondo el pipe `async`, saber crear pipes propios y — lo más preguntado — la diferencia entre **pure** e **impure** y su impacto en rendimiento.

> Requisito: [Sesión 5](sesion-05-directivas.md).

---

## 0. ¿Qué es un pipe?

Un **pipe** transforma un valor **para mostrarlo**, directamente en el template, con el operador `|`. No modifica el dato original: solo cambia su representación.

```html
{{ valor | nombrePipe : arg1 : arg2 }}
```

```html
{{ precio | currency:'CLP' }}          <!-- 25000 → $25.000 -->
{{ fecha | date:'dd/MM/yyyy' }}        <!-- Date → 06/08/2026 -->
{{ nombre | uppercase }}               <!-- 'ada' → 'ADA' -->
```

Ventaja: la lógica de formato vive en el template (declarativa) y es **reutilizable**, en vez de crear propiedades/métodos de formato en la clase.

---

## 1. Pipes incorporados (built-in)

Vienen en `CommonModule` (o disponibles por defecto en standalone al importarlo).

### 1.1 Texto
```html
{{ 'ada' | uppercase }}        <!-- ADA -->
{{ 'ADA' | lowercase }}        <!-- ada -->
{{ 'hola mundo' | titlecase }} <!-- Hola Mundo -->
```

### 1.2 Números y moneda
```html
{{ 3.14159 | number:'1.0-2' }}   <!-- 3.14   (min1 entero, 0-2 decimales) -->
{{ 0.25 | percent }}             <!-- 25%    -->
{{ 25000 | currency:'CLP':'symbol':'1.0-0' }}  <!-- $25.000 -->
{{ 1234.5 | currency:'USD' }}    <!-- $1,234.50 -->
```
El patrón `'1.0-2'` = `{mínInteros}.{mínDecimales}-{máxDecimales}`.

### 1.3 Fechas
```html
{{ hoy | date }}                  <!-- Aug 6, 2026 -->
{{ hoy | date:'dd/MM/yyyy' }}     <!-- 06/08/2026 -->
{{ hoy | date:'HH:mm' }}          <!-- 14:30 -->
{{ hoy | date:'fullDate' }}       <!-- Thursday, August 6, 2026 -->
{{ hoy | date:'dd/MM/yyyy':'UTC':'es-CL' }}  <!-- con timezone y locale -->
```

### 1.4 Estructuras y utilidad
```html
{{ texto | slice:0:10 }}          <!-- primeros 10 caracteres -->
{{ [1,2,3,4] | slice:1:3 }}       <!-- [2,3] -->
{{ objeto | json }}               <!-- útil para debug: muestra el objeto -->
{{ {a:1} | keyvalue }}            <!-- itera claves/valores en *ngFor -->
```

### 1.5 Encadenar pipes
```html
{{ fecha | date:'fullDate' | uppercase }}
{{ precio | currency:'CLP' | slice:0:6 }}
```
Se evalúan de izquierda a derecha.

---

## 2. El pipe `async` 🔑

El más importante. **Se suscribe automáticamente** a un `Observable` (o `Promise`), muestra el último valor emitido, y **se desuscribe solo** cuando el componente se destruye.

```typescript
usuario$ = this.http.get<Usuario>('/api/usuario/1');   // Observable
```

```html
{{ (usuario$ | async)?.nombre }}

<!-- patrón recomendado: async una sola vez con 'as' -->
<div *ngIf="usuario$ | async as usuario">
  <h2>{{ usuario.nombre }}</h2>
  <p>{{ usuario.email }}</p>
</div>

<!-- Angular 17+ -->
@if (usuario$ | async; as usuario) {
  <h2>{{ usuario.nombre }}</h2>
}
```

### ¿Por qué usar `async` en vez de `.subscribe()` en la clase?

| `.subscribe()` manual | pipe `async` |
|---|---|
| Debes desuscribir en `ngOnDestroy` | Se desuscribe solo ✅ |
| Riesgo de memory leak si lo olvidas | Sin fugas |
| Más código | Menos código, declarativo |
| Funciona con OnPush si haces `markForCheck` | Dispara detección de cambios solo |

> Regla de oro (aparece siempre en entrevistas): *"Prefiere el pipe `async` sobre suscribirte manualmente"* — evita memory leaks y funciona de forma natural con `ChangeDetectionStrategy.OnPush` (Sesión 14). RxJS es la Sesión 13.

⚠️ Cuidado: cada `| async` crea **una suscripción**. Repetir `usuario$ | async` varias veces en el template dispara varias peticiones. Solución: el patrón `as` de arriba (una suscripción reutilizada).

---

## 3. Crear un pipe propio

Ejemplo: un pipe que trunca texto largo.

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncar',
  standalone: true,     // moderno; en clásico se declara en un módulo
})
export class TruncarPipe implements PipeTransform {
  transform(valor: string, limite = 20, sufijo = '…'): string {
    if (!valor) return '';
    return valor.length > limite
      ? valor.substring(0, limite) + sufijo
      : valor;
  }
}
```

```html
{{ descripcion | truncar }}
{{ descripcion | truncar:50 }}
{{ descripcion | truncar:50:' [ver más]' }}
```

Piezas:
- `@Pipe({ name })` → el nombre con que se invoca en el template.
- Implementa `PipeTransform` → obliga a tener `transform`.
- `transform(valor, ...args)` → el primer parámetro es el valor a la izquierda del `|`; los demás son los argumentos tras los `:`.

---

## 4. Pure vs Impure pipes 🔑

Este es **el** concepto de rendimiento de los pipes.

### 4.1 Pipe Pure (por defecto)
Angular solo re-ejecuta `transform()` cuando **cambia la referencia** del input (o de sus argumentos). Es eficiente: no recalcula en cada ciclo de detección de cambios.

```typescript
@Pipe({ name: 'truncar' })          // pure por defecto
```

⚠️ Consecuencia: si **mutas** un array/objeto por dentro (sin cambiar la referencia), un pipe puro **no se actualiza**.

```typescript
this.items.push(nuevo);   // muta → un pipe puro que reciba 'items' NO se recalcula
this.items = [...this.items, nuevo];  // nueva referencia → sí se recalcula ✅
```

### 4.2 Pipe Impure
Se re-ejecuta en **cada ciclo de detección de cambios**, aunque la referencia no cambie. Detecta mutaciones internas, pero es **costoso**.

```typescript
@Pipe({ name: 'filtrar', pure: false })   // ← impure
```

`AsyncPipe` es impure (necesita reaccionar a cada emisión). `KeyValuePipe`/`SlicePipe` también.

| | Pure | Impure |
|---|---|---|
| Se recalcula cuando… | Cambia la **referencia** | **Cada** ciclo de detección |
| Rendimiento | ✅ Eficiente | ⚠️ Costoso |
| Detecta mutaciones internas | ❌ No | ✅ Sí |
| Por defecto | ✅ Sí | Hay que declararlo |

### 4.3 Regla práctica
- Mantén tus pipes **pure** (default) y trabaja con **inmutabilidad** (spread, Sesión 2).
- **Evita pipes impure** para filtrar/ordenar listas grandes: se re-ejecutan constantemente. Angular incluso **no incluye** un `FilterPipe`/`OrderByPipe` a propósito, por esta razón. Filtra/ordena en la **clase** (con RxJS o métodos) en su lugar.

---

## 5. Pipes vs métodos de la clase

```html
{{ precio | currency }}          <!-- pipe puro: cacheado -->
{{ formatearPrecio(precio) }}    <!-- método: se ejecuta en CADA detección ⚠️ -->
```

Un **pipe puro** se recalcula solo si cambia el input; un **método** en el template se ejecuta en cada ciclo de detección de cambios. Para transformaciones de presentación, **prefiere pipes** por rendimiento.

---

## 6. Preguntas de entrevista

1. ¿Qué es un pipe y qué ventaja tiene sobre formatear en la clase?
2. ¿Qué hace el pipe `async` y por qué se prefiere sobre `.subscribe()`?
3. ¿Qué problema hay si usas `obs$ | async` varias veces en el template?
4. ¿Diferencia entre pure e impure pipe?
5. ¿Por qué un pipe puro no se actualiza al hacer `array.push()`?
6. ¿Por qué Angular no trae un `FilterPipe` o `OrderByPipe`?
7. ¿Un pipe puro vs un método en el template en cuanto a rendimiento?
8. ¿Cómo creas un pipe propio? ¿Qué interfaz implementas?
9. ¿Cómo pasas argumentos a un pipe?
10. ¿Puedes encadenar pipes? ¿En qué orden se evalúan?

<details>
<summary>Respuestas resumidas</summary>

1. Transforma un valor para mostrarlo en el template con `|`. Es declarativo, reutilizable y (si es puro) cacheado.
2. Se suscribe/desuscribe solo a un Observable/Promise. Evita memory leaks y funciona con OnPush.
3. Cada `| async` crea una suscripción → múltiples peticiones. Solución: `*ngIf="obs$ | async as x"`.
4. Pure recalcula solo al cambiar la referencia; impure en cada ciclo de detección.
5. `push` muta el array sin cambiar la referencia; el pipe puro solo reacciona a cambios de referencia.
6. Porque serían impure y filtrar/ordenar listas grandes en cada detección degrada el rendimiento; se hace en la clase.
7. El pipe puro se cachea; el método se ejecuta en cada ciclo de detección. El pipe rinde mejor.
8. Clase con `@Pipe({name})` que implementa `PipeTransform` (método `transform`).
9. Tras el nombre con `:` → `{{ x | pipe:arg1:arg2 }}`.
10. Sí; de izquierda a derecha.

</details>

---

## ✅ Checklist para pasar a la Sesión 7

- [ ] Sé usar los built-in (date, currency, number, slice, json, uppercase…).
- [ ] Domino el pipe `async` y el patrón `as`.
- [ ] Sé crear un pipe propio con `PipeTransform`.
- [ ] Explico pure vs impure y su impacto en rendimiento.
- [ ] Entiendo por qué un pipe puro no reacciona a mutaciones.
- [ ] Sé por qué prefiero pipes sobre métodos en el template.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 7 — Comunicación entre componentes** (`@Input`, `@Output`, `EventEmitter`, `ViewChild`, `ContentChild`, `ng-content`).
