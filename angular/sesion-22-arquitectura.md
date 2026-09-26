# Sesión 22 — Arquitectura

> **Objetivo**: pensar como un arquitecto Angular: cómo estructurar apps grandes para que escalen y se mantengan. Verás organización feature-based, arquitectura por capas, Clean/Hexagonal, DDD aplicado al frontend, patrones (Repository, Facade), el enfoque Smart/Dumb components, monorepos con Nx, y una visión general del state management. Es un tema de conversación abierta en entrevistas senior.

> Requisito: idealmente todo lo anterior (S1–S21). Se apoya en servicios/DI (S8-9), módulos (S15) y RxJS (S13).

---

## 0. Por qué importa la arquitectura

En apps pequeñas cualquier estructura funciona. En apps grandes (decenas de features, varios equipos), una mala arquitectura genera: acoplamiento, código duplicado, imposibilidad de testear, builds lentos y miedo a cambiar. La arquitectura busca: **cohesión** (lo relacionado, junto), **bajo acoplamiento** (piezas independientes), **testeabilidad** y **escalabilidad de equipo**.

---

## 1. Organización de carpetas: feature-based 🔑

La convención recomendada por Angular. Se organiza por **dominio/funcionalidad**, no por tipo de archivo.

```
src/app/
├── core/                    # singletons, carga única (auth, interceptors, guards)
│   ├── services/
│   ├── guards/
│   └── interceptors/
├── shared/                  # reutilizable entre features (UI, pipes, directivas)
│   ├── components/
│   ├── pipes/
│   └── directives/
├── features/                # una carpeta por dominio (lazy)
│   ├── productos/
│   │   ├── components/      # dumb components
│   │   ├── pages/          # smart components (rutas)
│   │   ├── services/
│   │   ├── models/
│   │   └── productos.routes.ts
│   ├── usuarios/
│   └── checkout/
└── layout/                  # header, sidebar, footer
```

❌ **Anti-patrón** (organizar por tipo): `components/`, `services/`, `models/` en la raíz con TODO mezclado. No escala: para tocar "productos" saltas entre 5 carpetas.

Regla: **"screaming architecture"** — la estructura debe "gritar" de qué va la app (productos, checkout), no qué framework usa.

---

## 2. Smart vs Dumb components (Container/Presentational) 🔑

Patrón central del frontend moderno. Divide los componentes en dos roles:

| | **Smart (Container)** | **Dumb (Presentational)** |
|---|---|---|
| Responsabilidad | Lógica, datos, estado | Solo mostrar / emitir |
| Conoce servicios | Sí (inyecta) | **No** |
| Datos | Los obtiene | Los recibe por `@Input` |
| Eventos | Los maneja | Los emite por `@Output` |
| Testeable | Media | **Muy fácil** (solo inputs/outputs) |
| Reutilizable | Poco | **Mucho** |
| Change Detection | Default | **OnPush** (Sesión 14) |

```typescript
// SMART: página, conoce el servicio
@Component({ template: `<app-lista [items]="productos$ | async" (eliminar)="borrar($event)" />` })
export class ProductosPage {
  productos$ = inject(ProductoService).listar();
  borrar(id: number) { /* ... */ }
}

// DUMB: solo presenta, no sabe de dónde vienen los datos
@Component({ selector: 'app-lista', changeDetection: ChangeDetectionStrategy.OnPush })
export class ListaComponent {
  @Input() items: Producto[] = [];
  @Output() eliminar = new EventEmitter<number>();
}
```
> Beneficio: los dumb components son reutilizables, testeables y funcionan perfecto con OnPush (solo dependen de sus inputs). Los smart concentran la complejidad.

---

## 3. Arquitectura por capas (layered)

Separar responsabilidades en capas con dependencias unidireccionales:

```
┌─────────────────────────────────┐
│  Presentación (Components)       │  ← UI, sin lógica de negocio
├─────────────────────────────────┤
│  Aplicación (Facades / Services) │  ← orquesta casos de uso, estado
├─────────────────────────────────┤
│  Dominio (Models, reglas)        │  ← entidades y lógica pura
├─────────────────────────────────┤
│  Infraestructura (HTTP, storage) │  ← APIs, repositorios, detalles técnicos
└─────────────────────────────────┘
```
Regla clave: las capas **superiores dependen de las inferiores**, nunca al revés. La UI no habla directo con HTTP; pasa por servicios/facades.

---

## 4. Clean Architecture / Hexagonal (Ports & Adapters)

Llevan la separación por capas al extremo: el **dominio** (reglas de negocio) es el centro y **no depende de nada** (ni de Angular, ni de HTTP). Los detalles (framework, API, DB) son **intercambiables** en los bordes.

- **Puerto**: una interfaz que el dominio define ("necesito obtener productos": `ProductoRepository`).
- **Adaptador**: una implementación concreta del puerto (`HttpProductoRepository`, `MockProductoRepository`).
- Se conectan con **DI** (Sesión 9): el dominio depende de la interfaz; Angular inyecta la implementación.

```typescript
// dominio (puerto) — no sabe de HTTP
export abstract class ProductoRepository {
  abstract obtenerTodos(): Observable<Producto[]>;
}

// infraestructura (adaptador)
@Injectable()
export class HttpProductoRepository extends ProductoRepository {
  private http = inject(HttpClient);
  obtenerTodos() { return this.http.get<Producto[]>('/api/productos'); }
}

// wiring con DI
providers: [{ provide: ProductoRepository, useClass: HttpProductoRepository }]
```
> Ventaja: puedes cambiar HTTP por GraphQL, o mockear en tests, **sin tocar** la lógica de negocio. Es donde el `useClass` de la Sesión 9 brilla. Trade-off: más abstracción/boilerplate → justifícalo en apps grandes/de larga vida, no en un CRUD simple.

---

## 5. Patrones útiles

### 5.1 Repository Pattern
Abstrae el **acceso a datos** tras una interfaz (como en §4). El resto de la app no sabe si los datos vienen de HTTP, caché o localStorage.

### 5.2 Facade Pattern 🔑
Un servicio que **expone una API simple** ocultando la complejidad interna (varios servicios, estado, RxJS). Muy usado para encapsular state management:
```typescript
@Injectable({ providedIn: 'root' })
export class CarritoFacade {
  private state = inject(CarritoStore);      // NgRx o BehaviorSubject
  items$ = this.state.items$;                // API limpia para los componentes
  total$ = this.state.total$;
  agregar(p: Producto) { this.state.agregar(p); }   // esconde el "cómo"
}
```
Los componentes usan la facade sin saber si por debajo hay NgRx, Signals o Subjects. Facilita cambiar la implementación de estado sin tocar la UI.

### 5.3 DDD en el frontend
Del Domain-Driven Design se toman: **bounded contexts** (cada feature es un dominio con su lenguaje), **entidades/value objects** (modelos ricos, no solo interfaces anémicas), y organización por dominio (§1). En frontend se aplica de forma ligera: no toda la ceremonia del backend.

---

## 6. State management: panorama

Cómo gestionar estado compartido, de menor a mayor complejidad:

| Enfoque | Cuándo |
|---|---|
| `@Input`/`@Output` | Estado local, padre-hijo (Sesión 7) |
| **Servicio + `BehaviorSubject`** | Estado compartido simple (Sesión 8) |
| **Servicio + Signals** | Moderno, reactivo, menos boilerplate (Sesión 14/29) |
| **Facade** sobre lo anterior | Encapsular y exponer API limpia |
| **NgRx / NgXs / Akita** | Estado global complejo, muchas acciones, time-travel, equipos grandes (Sesión 23) |
| **Component Store (NgRx)** | Estado local complejo de un componente/feature |

> 🔑 Regla de oro (respuesta senior): *"No uses NgRx por defecto. Empieza con servicios + Subjects/Signals; adopta NgRx solo cuando el estado global se vuelve complejo (múltiples fuentes, sincronización, undo/redo, muchos consumidores)."* Sobre-ingeniería con NgRx en apps simples es un error común.

---

## 7. Monorepos con Nx

**Nx** es una herramienta para monorepos (varias apps/librerías en un repo) muy usada con Angular en organizaciones grandes.

Aporta:
- **Librerías** con límites explícitos (una feature = una lib) → fuerza el bajo acoplamiento.
- **Reglas de dependencia** (`enforce-module-boundaries`): impide que `checkout` importe internals de `productos`.
- **Build/test afectados**: solo recompila/re-testea lo que cambió (`nx affected`) → CI rápido.
- **Caché** de builds y tests (local y remoto).
- Generadores y utilidades para escalar equipos.

Alternativa a **Microfrontends** (Module Federation, Sesión 30) cuando quieres despliegues independientes. Nx = un repo, un despliegue (normalmente); microfrontends = despliegues separados.

---

## 8. Principios transversales

- **SOLID** (tienes carpeta propia en el repo): Single Responsibility en componentes/servicios, DI para inversión de dependencias (D).
- **DRY** con cuidado: reutiliza, pero no acoples features distintos por "ahorrar".
- **Barrel exports** (Sesión 15) para APIs públicas de cada feature/lib.
- **Lazy loading por feature** (Sesión 16) como default arquitectónico.
- Documentar decisiones (ADRs) en equipos grandes.

---

## 9. Preguntas de entrevista

1. ¿Cómo estructurarías una app Angular grande?
2. ¿Feature-based vs organizar por tipo de archivo? ¿Por qué?
3. ¿Qué es el patrón Smart/Dumb y qué ventajas da?
4. ¿Qué es una arquitectura por capas y cuál es su regla de dependencias?
5. Explica Clean/Hexagonal: puertos, adaptadores y su relación con la DI.
6. ¿Qué es el Repository pattern y el Facade pattern?
7. ¿Cuándo usar NgRx y cuándo no?
8. ¿Qué aporta Nx a un proyecto grande?
9. ¿Cómo aplicarías DDD en el frontend?
10. ¿Cómo evitas el acoplamiento entre features?

<details>
<summary>Respuestas resumidas</summary>

1. Feature-based: core (singletons), shared (reutilizable), features (dominios lazy), layout.
2. Feature-based: cohesión por dominio, escala mejor; por tipo mezcla todo y no escala.
3. Smart maneja lógica/datos; Dumb solo presenta (inputs/outputs). Dumb es reutilizable, testeable y funciona con OnPush.
4. Capas con dependencias unidireccionales (presentación→aplicación→dominio→infraestructura); las superiores dependen de las inferiores.
5. El dominio define puertos (interfaces) y no depende de detalles; los adaptadores los implementan; se conectan con DI (`useClass`).
6. Repository abstrae el acceso a datos; Facade expone una API simple ocultando complejidad (ideal para estado).
7. NgRx cuando el estado global es complejo (muchas fuentes/consumidores, sincronización, undo); no en apps simples (usa Subjects/Signals).
8. Monorepo con librerías, límites de dependencia, builds/tests afectados y caché → escala equipos y CI.
9. Bounded contexts por feature, modelos ricos, organización por dominio; de forma ligera.
10. Límites por feature/lib, comunicación por interfaces/facades, reglas de dependencia (Nx), sin imports cruzados de internals.

</details>

---

## ✅ Checklist para pasar a la Sesión 23

- [ ] Sé estructurar una app feature-based (core/shared/features).
- [ ] Domino Smart vs Dumb components.
- [ ] Entiendo arquitectura por capas y su regla de dependencias.
- [ ] Comprendo Clean/Hexagonal (puertos/adaptadores) y su vínculo con la DI.
- [ ] Conozco Repository y Facade patterns.
- [ ] Sé cuándo (y cuándo no) usar NgRx, y qué aporta Nx.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 23 — NgRx** (Store, Actions, Reducers, Selectors, Effects, Entity, el flujo Redux completo y cuándo usarlo).
