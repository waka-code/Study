# Sesión 14 — Change Detection

> **Objetivo**: entender **cómo Angular detecta cambios** y actualiza el DOM: qué es Zone.js, la estrategia Default vs `OnPush`, `ChangeDetectorRef` (`markForCheck`, `detectChanges`, `detach`, `reattach`) y la dirección moderna hacia **Signals** y **Zoneless**. Aquí se conecta todo lo de inmutabilidad y `async` de sesiones anteriores.

> Requisito: [Sesión 13](sesion-13-rxjs.md), y las notas de inmutabilidad de las Sesiones 2, 6, 8.

---

## 0. ¿Qué es la detección de cambios?

Angular mantiene sincronizados **el modelo (clase)** y **la vista (DOM)**. Cuando algo cambia en la clase (una propiedad, una respuesta HTTP), Angular debe **detectarlo** y actualizar el DOM. A ese proceso se le llama **Change Detection (CD)**.

```
Cambia el estado  →  Angular detecta  →  re-evalúa los bindings  →  actualiza el DOM
```

La pregunta clave es: **¿cuándo** ejecuta Angular la detección, y **cuánto** revisa?

---

## 1. Zone.js — el "cuándo"

Angular no sabe por arte de magia que algo cambió. Usa **Zone.js**, una librería que hace *monkey-patching* de las APIs asíncronas del navegador:

- Eventos del DOM (`click`, `input`, `submit`…)
- `setTimeout` / `setInterval`
- Peticiones HTTP (`XHR`/`fetch`)
- Promesas

Cuando **cualquiera** de estas cosas termina, Zone.js le avisa a Angular: *"algo asíncrono ocurrió, revisa si hay cambios"*. Angular entonces dispara un ciclo de detección de cambios **en toda la aplicación**.

```
click / setTimeout / HTTP  →  Zone.js lo intercepta  →  Angular ejecuta CD
```

> 🔑 Idea clave de entrevista: *"Angular no vigila variables; Zone.js le avisa cuando ocurre algo asíncrono, y ahí Angular revisa el árbol de componentes"*.

---

## 2. El árbol de componentes y el ciclo de CD

Angular organiza los componentes en un **árbol** (Sesión 3). En cada ciclo de detección, recorre el árbol **de arriba abajo** (desde la raíz) y, por cada componente, re-evalúa sus **bindings** (`{{ }}`, `[prop]`, etc.). Si el valor cambió respecto al anterior, actualiza el DOM.

```
AppComponent
├── HeaderComponent      ← se revisa
├── ListaComponent       ← se revisa
│   └── ItemComponent ×N ← cada uno se revisa
└── FooterComponent      ← se revisa
```

**El problema**: con la estrategia por defecto, Angular revisa **TODOS** los componentes en **cada** ciclo, aunque no hayan cambiado. En apps grandes esto es costoso.

---

## 3. Estrategias: Default vs OnPush 🔑

### 3.1 `Default` (CheckAlways)
La estrategia por defecto. En cada ciclo, Angular revisa **todos** los componentes del árbol. Simple pero puede ser ineficiente.

### 3.2 `OnPush`
Le dices a Angular: *"solo revisa este componente si pasa algo relevante"*. Con `OnPush`, un componente se re-evalúa **solo** cuando:

1. Cambia la **referencia** de un `@Input()` (no una mutación interna).
2. Se dispara un **evento** originado en el propio componente o sus hijos (click, etc.).
3. Un Observable enlazado con el pipe **`async`** emite.
4. Se llama manualmente a `ChangeDetectorRef` (`markForCheck()`).

```typescript
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-item',
  changeDetection: ChangeDetectionStrategy.OnPush,   // ← activar OnPush
  /* ... */
})
export class ItemComponent {
  @Input() producto!: Producto;
}
```

### 3.3 Por qué la inmutabilidad es obligatoria con OnPush 🔑
`OnPush` compara `@Input` por **referencia** (`===`), no por contenido. Si **mutas** el objeto por dentro, la referencia no cambia y **Angular no detecta el cambio**:

```typescript
// ❌ NO funciona con OnPush: misma referencia
this.producto.precio = 200;          // Angular NO lo ve

// ✅ funciona: nueva referencia
this.producto = { ...this.producto, precio: 200 };   // Angular SÍ lo ve
```

> Por esto insistimos en **inmutabilidad** (spread) desde la Sesión 2. Con `OnPush`, mutar = bugs invisibles. Trabajar inmutable = detección correcta y rápida.

### 3.4 Comparación

| | Default | OnPush |
|---|---|---|
| Cuándo se revisa | Cada ciclo, siempre | Solo si input cambia por referencia, evento propio o async |
| Rendimiento | Menor en apps grandes | **Mejor** (menos revisiones) |
| Requiere inmutabilidad | No | **Sí** |
| Combina con `async` | Sí | **Ideal** (async llama markForCheck) |

> Estrategia recomendada en apps serias: **`OnPush` + inmutabilidad + pipe `async`**. Es una respuesta de oro en entrevistas de performance (Sesión 20).

---

## 4. `ChangeDetectorRef` — control manual

Se inyecta para controlar la detección de cambios de un componente:

```typescript
constructor(private cdr: ChangeDetectorRef) {}
```

| Método | Qué hace |
|---|---|
| `markForCheck()` | Marca el componente (y sus ancestros) para revisar en el **próximo** ciclo. Uso típico con `OnPush` |
| `detectChanges()` | Ejecuta CD **ahora**, en este componente y sus hijos (síncrono) |
| `detach()` | **Desconecta** el componente del árbol de CD (no se revisa más) |
| `reattach()` | Vuelve a conectarlo |

### 4.1 `markForCheck` vs `detectChanges`
- **`markForCheck()`**: no ejecuta CD inmediatamente; **marca** para que el próximo ciclo lo incluya. Es lo que usa el pipe `async` internamente. Seguro y habitual con OnPush.
- **`detectChanges()`**: fuerza CD **ya mismo**. Útil tras cambios fuera de Angular. ⚠️ Puede dar el error `ExpressionChangedAfterItHasBeenCheckedError` si lo usas mal.

```typescript
// caso típico: OnPush + datos que llegan por un callback que Angular no "ve"
this.servicioExterno.onData(data => {
  this.data = data;
  this.cdr.markForCheck();   // avisa a Angular que revise
});
```

### 4.2 `detach`/`reattach` (avanzado)
Para componentes con actualizaciones muy frecuentes (ej. un gráfico en tiempo real), puedes desconectarlo del árbol y controlar tú cuándo refrescar:
```typescript
ngOnInit() {
  this.cdr.detach();
  setInterval(() => this.cdr.detectChanges(), 1000);   // refresca 1 vez/s en vez de constantemente
}
```

---

## 5. `runOutsideAngular` — salir de la zona

A veces tienes tareas asíncronas frecuentes (animaciones, scroll, `mousemove`) que **no** deben disparar CD cada vez. Con `NgZone.runOutsideAngular` las ejecutas fuera de Zone.js:

```typescript
constructor(private zone: NgZone) {}

ngOnInit() {
  this.zone.runOutsideAngular(() => {
    // esto NO dispara detección de cambios
    document.addEventListener('mousemove', this.onMove);
  });
}
```
Para volver a entrar y actualizar la vista: `this.zone.run(() => { ... })`. Es una optimización de performance clásica (Sesión 20/30).

---

## 6. El futuro: Signals y Zoneless (Angular 16+)

Angular está evolucionando hacia una detección de cambios **sin Zone.js**, más granular, basada en **Signals**.

### 6.1 Signals (Angular 16+)
Un **signal** es un contenedor reactivo de un valor que **avisa** cuando cambia. Angular sabe exactamente qué actualizar sin revisar todo el árbol:
```typescript
import { signal, computed, effect } from '@angular/core';

contador = signal(0);                              // crear
duplicado = computed(() => this.contador() * 2);   // derivado, se recalcula solo

incrementar() {
  this.contador.set(this.contador() + 1);          // set
  this.contador.update(v => v + 1);                // update
}
```
```html
<p>{{ contador() }} / {{ duplicado() }}</p>   <!-- se llama como función -->
```
`effect(() => ...)` ejecuta un efecto cada vez que cambian los signals que lee. Los Signals se ven a fondo en la **Sesión 29** (novedades modernas).

### 6.2 Zoneless
Con Signals, Angular puede prescindir de Zone.js (**zoneless**, experimental/estabilizándose): detección **precisa** (solo lo que cambió), bundles más pequeños (sin Zone.js) y mejor rendimiento. Es la dirección oficial del framework (Sesión 29).

| | Zone.js (clásico) | Signals / Zoneless (moderno) |
|---|---|---|
| Cómo detecta | Intercepta todo lo async, revisa el árbol | Sabe exactamente qué signal cambió |
| Granularidad | Componente entero (o todo el árbol) | Solo lo que depende del signal |
| Rendimiento | Bueno con OnPush | Mejor, más preciso |

---

## 7. Errores frecuentes

- Mutar un `@Input` con OnPush y no ver el cambio → usar inmutabilidad.
- `ExpressionChangedAfterItHasBeenCheckedError`: cambiar un valor **después** de que Angular lo revisó (típico al modificar estado en `ngAfterViewInit`). Solución: mover la lógica, usar `setTimeout`, o `markForCheck`.
- Llamar métodos costosos en el template → se ejecutan en cada ciclo de CD (usa pipes puros, Sesión 6).
- Suscripciones manuales + OnPush sin `markForCheck` → la vista no se actualiza (usa `async`).

---

## 8. Preguntas de entrevista

1. ¿Qué es la detección de cambios y cuándo se dispara?
2. ¿Qué papel juega Zone.js?
3. ¿Diferencia entre estrategia Default y OnPush?
4. ¿Bajo qué condiciones se revisa un componente OnPush?
5. ¿Por qué la inmutabilidad es obligatoria con OnPush?
6. ¿Diferencia entre `markForCheck()` y `detectChanges()`?
7. ¿Para qué sirven `detach()`/`reattach()`?
8. ¿Qué es `runOutsideAngular` y cuándo lo usarías?
9. ¿Qué es el error `ExpressionChangedAfterItHasBeenChecked`?
10. ¿Qué son los Signals y cómo cambian la detección de cambios?

<details>
<summary>Respuestas resumidas</summary>

1. Proceso que sincroniza modelo y DOM; se dispara cuando ocurre algo asíncrono (eventos, timers, HTTP) vía Zone.js.
2. Intercepta las APIs async del navegador y avisa a Angular para que ejecute CD.
3. Default revisa todos los componentes cada ciclo; OnPush solo bajo ciertas condiciones.
4. Cambio de referencia de un `@Input`, evento propio/de hijos, emisión de un `async`, o `markForCheck()`.
5. OnPush compara inputs por referencia; mutar no cambia la referencia y el cambio pasa desapercibido.
6. `markForCheck` marca para el próximo ciclo (lo usa `async`); `detectChanges` ejecuta CD ahora mismo.
7. Desconectar/reconectar un componente del árbol de CD (para componentes muy dinámicos).
8. Ejecutar código async fuera de Zone.js para que no dispare CD (mousemove, animaciones).
9. Cambiar un valor después de que Angular ya lo revisó en el mismo ciclo; ocurre típicamente en hooks tardíos.
10. Contenedores reactivos que avisan al cambiar; permiten CD precisa (solo lo dependiente) y zoneless.

</details>

---

## ✅ Checklist para pasar a la Sesión 15

- [ ] Explico qué es la detección de cambios y el rol de Zone.js.
- [ ] Distingo Default vs OnPush y las 4 condiciones de OnPush.
- [ ] Entiendo por qué OnPush exige inmutabilidad.
- [ ] Conozco `markForCheck` vs `detectChanges` y `detach/reattach`.
- [ ] Sé qué es `runOutsideAngular`.
- [ ] Tengo una noción de Signals y zoneless.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 15 — Módulos** (Feature/Shared/Core modules, barrel exports, y el paso de NgModules a Standalone).
