# Sesión 8 — Servicios

> **Objetivo**: entender qué es un servicio, por qué existen, el patrón **singleton**, cómo se declara con `@Injectable`, los **scopes** (`providedIn: 'root'` vs providers de componente/módulo), y cómo usar un servicio para **compartir estado** entre componentes. Es la puerta de entrada a la Inyección de Dependencias (Sesión 9).

> Requisito: [Sesión 7](sesion-07-comunicacion-componentes.md).

---

## 1. ¿Qué es un servicio?

Un **servicio** es una clase que encapsula **lógica reutilizable** que *no* pertenece a la vista: llamadas HTTP, reglas de negocio, acceso a datos, estado compartido, logging, etc.

**Idea central de Angular**: separar responsabilidades.
- **Componente** → presentación (qué se ve, interacción del usuario).
- **Servicio** → lógica y datos (reutilizable, testeable, sin UI).

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private productos: Producto[] = [];

  obtenerTodos(): Producto[] {
    return this.productos;
  }

  agregar(p: Producto): void {
    this.productos.push(p);
  }
}
```

### ¿Por qué no meter esta lógica en el componente?
- **Reutilización**: varios componentes usan el mismo servicio.
- **Testing**: la lógica se prueba sin renderizar UI.
- **Mantenibilidad**: un solo lugar para cambiar la regla.
- **Separación de responsabilidades** (Single Responsibility, SOLID).

---

## 2. `@Injectable`

El decorador `@Injectable()` marca una clase como **inyectable**: le dice a Angular que puede crearla e **inyectarla** en otras clases (y que ella misma puede recibir dependencias).

```typescript
@Injectable({
  providedIn: 'root',   // dónde se registra (ver §4)
})
export class LoggerService { /* ... */ }
```

> Técnicamente, un servicio sin dependencias propias funcionaría sin `@Injectable`, pero **siempre** se pone: es obligatorio si el servicio inyecta otras dependencias y es la convención estándar.

---

## 3. Inyección de dependencias (la idea básica)

En lugar de que un componente **cree** el servicio con `new`, Angular lo **provee** (lo inyecta) por el constructor:

```typescript
// ❌ NO se hace así
export class ListaComponent {
  private servicio = new ProductoService();  // acoplado, no testeable
}

// ✅ Inyección de dependencias
export class ListaComponent {
  constructor(private servicio: ProductoService) {}   // Angular lo inyecta
  // usa this.servicio.obtenerTodos()
}
```

Angular ve el tipo `ProductoService` en el constructor, busca cómo crearlo (su *provider*), y entrega la instancia. Esto es **Inversion of Control**: no controlas la creación, la delega el framework. La mecánica completa (Injector, providers, tokens) es la **Sesión 9**.

### 3.1 `inject()` — forma moderna (Angular 14+)
Alternativa al constructor, muy usada en código nuevo, standalone y funciones:

```typescript
import { inject } from '@angular/core';

export class ListaComponent {
  private servicio = inject(ProductoService);
}
```
Ambas formas son válidas; `inject()` es más flexible (funciona fuera del constructor, en funciones de guard/interceptor modernas).

---

## 4. Singleton y scopes (`providedIn`) 🔑

Por defecto, un servicio es **singleton**: Angular crea **una sola instancia** y la comparte. Esto es lo que permite **compartir estado**. *Dónde* se registra determina *cuántas* instancias hay.

### 4.1 `providedIn: 'root'` (lo habitual)
```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {}
```
- **Una única instancia** para toda la app (singleton global).
- **Tree-shakeable**: si nadie lo usa, no entra en el bundle.
- Es la opción **recomendada por defecto**.

### 4.2 Registrado en un módulo
```typescript
@NgModule({
  providers: [ApiService],   // instancia para ese módulo (matices con lazy loading)
})
```
En módulos *eager* equivale a un singleton global. En un **módulo lazy** (Sesión 16), crea una instancia propia para ese módulo cargado. `providedIn:'root'` evita estas sutilezas.

### 4.3 Providers a nivel de componente
```typescript
@Component({
  providers: [ApiService],   // ← nueva instancia POR cada uso de este componente
})
export class WidgetComponent {}
```
- Cada instancia del componente (y sus hijos) recibe **su propia** copia del servicio.
- Útil cuando quieres estado **aislado** por componente (no compartido).
- La instancia **se destruye** con el componente.

### 4.4 Comparación

| Registro | Instancias | Uso |
|---|---|---|
| `providedIn: 'root'` | 1 global (singleton) | Estado/lógica compartida (lo normal) |
| `providers` en módulo | 1 por módulo (matiz lazy) | Legacy / control por módulo |
| `providers` en componente | 1 por componente | Estado aislado por componente |

> 🔑 Pregunta clásica: *"Tengo un servicio con `providedIn:'root'`. Si lo inyecto en 10 componentes, ¿cuántas instancias hay?"* → **Una** (singleton). Por eso sirve para compartir estado.

---

## 5. Servicio como estado compartido

El caso de uso estrella: comunicar componentes **sin relación** (visto al final de la Sesión 7). Con un `BehaviorSubject` (RxJS, Sesión 13):

```typescript
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private itemsSubject = new BehaviorSubject<Producto[]>([]);
  items$ = this.itemsSubject.asObservable();   // solo lectura para afuera

  agregar(producto: Producto): void {
    const actuales = this.itemsSubject.value;
    this.itemsSubject.next([...actuales, producto]);   // inmutable (spread)
  }

  get total(): number {
    return this.itemsSubject.value.length;
  }
}
```

```typescript
// cualquier componente lo inyecta y se suscribe
export class HeaderComponent {
  private carrito = inject(CarritoService);
  total$ = this.carrito.items$;   // se usa con | async en el template
}
```

```html
<span>Carrito: {{ (total$ | async)?.length }}</span>
```

- **`BehaviorSubject`**: guarda el último valor y lo emite a nuevos suscriptores.
- Se expone `items$` (Observable de solo lectura) y se muta solo dentro del servicio → **encapsulación**.
- Los componentes reaccionan automáticamente vía pipe `async`.

Este patrón (servicio + `BehaviorSubject` + `async`) es la **base del state management** en apps medianas, antes de necesitar NgRx (Sesión 23).

---

## 6. Servicios que dependen de otros servicios

Un servicio puede inyectar otros servicios (por eso `@Injectable` importa):

```typescript
@Injectable({ providedIn: 'root' })
export class ProductoService {
  constructor(
    private http: HttpClient,      // servicio de Angular
    private logger: LoggerService, // servicio propio
  ) {}

  cargar() {
    this.logger.log('cargando…');
    return this.http.get<Producto[]>('/api/productos');
  }
}
```

El `HttpClient` es en sí un servicio inyectable de Angular (Sesión 12).

---

## 7. Errores frecuentes

- Crear el servicio con `new` en vez de inyectarlo → pierdes el singleton y la testeabilidad.
- Poner `providers: [X]` en un componente sin querer estado aislado → creas instancias duplicadas por accidente.
- Exponer el `BehaviorSubject` completo en vez de `.asObservable()` → cualquiera puede emitir y rompes la encapsulación.
- Mutar el estado interno (`array.push`) en vez de emitir uno nuevo → problemas con OnPush y pipes puros (Sesiones 6 y 14).

---

## 8. Preguntas de entrevista

1. ¿Qué es un servicio y por qué separar lógica de la vista?
2. ¿Qué hace `@Injectable`?
3. ¿Qué es un singleton en Angular y cómo se logra?
4. Con `providedIn:'root'`, ¿cuántas instancias hay si lo inyecto en N componentes?
5. ¿Diferencia entre `providedIn:'root'`, providers de módulo y providers de componente?
6. ¿Cuándo usarías providers a nivel de componente?
7. ¿Qué significa que `providedIn:'root'` es "tree-shakeable"?
8. ¿Cómo compartes estado entre componentes sin relación?
9. ¿Diferencia entre inyectar por constructor y `inject()`?
10. ¿Por qué exponer `.asObservable()` en vez del `Subject`?

<details>
<summary>Respuestas resumidas</summary>

1. Clase con lógica/datos reutilizable sin UI; separar mejora reutilización, testing y mantenibilidad.
2. Marca la clase como inyectable y permite que reciba dependencias.
3. Una sola instancia compartida; se logra con `providedIn:'root'` (o providers en nivel adecuado).
4. Una (singleton global).
5. `root` = singleton global tree-shakeable; módulo = por módulo (matiz lazy); componente = una por instancia de componente.
6. Cuando quieres estado aislado por componente, que se destruye con él.
7. Si nadie lo inyecta, el bundler lo elimina del bundle.
8. Con un servicio `providedIn:'root'` y un `BehaviorSubject`.
9. Ambas inyectan; `inject()` (v14+) funciona fuera del constructor y en funciones (guards/interceptors modernos).
10. Para encapsular: los consumidores solo leen, no pueden emitir valores.

</details>

---

## ✅ Checklist para pasar a la Sesión 9

- [ ] Explico qué es un servicio y por qué separar lógica de la vista.
- [ ] Sé declarar un servicio con `@Injectable({ providedIn: 'root' })`.
- [ ] Entiendo el singleton y cuántas instancias genera cada scope.
- [ ] Distingo providers de root / módulo / componente.
- [ ] Sé compartir estado con un servicio + `BehaviorSubject` + `async`.
- [ ] Conozco `inject()` como alternativa al constructor.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 9 — Dependency Injection** (Injector, tipos de providers, `InjectionToken`, inyectores jerárquicos: la mecánica interna completa).
