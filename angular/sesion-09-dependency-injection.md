# Sesión 9 — Dependency Injection (DI) a fondo

> **Objetivo**: entender la **mecánica interna** de la inyección de dependencias de Angular: qué es un `Injector`, qué es un `provider` y sus tipos (class, value, factory, existing), qué es un `InjectionToken`, y cómo funcionan los **inyectores jerárquicos**. Esto separa a quien *usa* servicios de quien *entiende* Angular.

> Requisito: [Sesión 8](sesion-08-servicios.md).

---

## 0. El patrón: Dependency Injection

**DI** es un patrón donde una clase **recibe** sus dependencias en vez de crearlas. Angular tiene un **sistema de DI propio** integrado en el framework.

Tres piezas:
1. **Consumidor**: la clase que necesita algo (`constructor(private http: HttpClient)`).
2. **Token**: la "llave" que identifica qué se pide (normalmente el tipo/clase).
3. **Provider**: la receta de *cómo crear* lo que corresponde a ese token.
4. **Injector**: el contenedor que, dado un token, busca su provider y entrega la instancia.

```
Consumidor pide  →  TOKEN  →  Injector busca el PROVIDER  →  crea/devuelve instancia
```

---

## 1. El `Injector`

El **Injector** es un contenedor que mantiene un registro de `token → provider` y resuelve dependencias. Cuando Angular crea un componente/servicio:

1. Lee los tipos del constructor (los **tokens**).
2. Por cada token, pregunta al Injector.
3. El Injector busca el provider, crea la instancia (una vez, si es singleton) y la entrega.
4. Si el provider ya se resolvió antes en ese injector, **reutiliza** la instancia (cache) → singleton.

No sueles crear injectors a mano; Angular los gestiona. Pero entender que existe explica los scopes y los inyectores jerárquicos (§4).

---

## 2. `provide` + `useX`: los cuatro tipos de provider 🔑

Un provider se declara con la forma larga `{ provide: TOKEN, useX: ... }`. Hay cuatro maneras de decir *cómo* crear el valor.

### 2.1 `useClass` — Class Provider
Provee una instancia de una clase. La forma corta `providers: [ApiService]` es azúcar de esto:

```typescript
providers: [ApiService]
// equivale a:
providers: [{ provide: ApiService, useClass: ApiService }]
```

Útil para **sustituir implementaciones** (ej. un mock en tests, o distinta implementación por entorno):

```typescript
providers: [{ provide: ApiService, useClass: ApiMockService }]
// donde se pida ApiService, Angular inyecta ApiMockService
```

### 2.2 `useValue` — Value Provider
Provee un **valor ya existente** (objeto, constante, config). No lo instancia Angular; se lo das hecho:

```typescript
providers: [{ provide: API_URL, useValue: 'https://api.midominio.com' }]
providers: [{ provide: CONFIG, useValue: { debug: true, retries: 3 } }]
```
Muy usado con `InjectionToken` (§3) para inyectar configuración.

### 2.3 `useFactory` — Factory Provider
Provee el resultado de **ejecutar una función**. Útil cuando la creación depende de lógica o de otras dependencias:

```typescript
providers: [{
  provide: LoggerService,
  useFactory: (config: AppConfig) => {
    return config.debug ? new VerboseLogger() : new SilentLogger();
  },
  deps: [AppConfig],   // ← dependencias que Angular inyecta a la factory
}]
```
`deps` lista qué inyectar como argumentos de la factory.

### 2.4 `useExisting` — Existing (Alias) Provider
Crea un **alias**: dos tokens que apuntan a la **misma** instancia (no crea una nueva):

```typescript
providers: [
  ApiService,
  { provide: LegacyApi, useExisting: ApiService },  // LegacyApi → la MISMA instancia de ApiService
]
```
Diferencia con `useClass`: `useClass` crearía **otra** instancia; `useExisting` **reutiliza** la existente.

### Resumen

| Provider | Provee | Cuándo |
|---|---|---|
| `useClass` | Instancia de una clase | Sustituir implementaciones, mocks |
| `useValue` | Un valor fijo | Config, constantes, objetos |
| `useFactory` | Resultado de una función | Creación condicional / con dependencias |
| `useExisting` | Alias a otra instancia | Reusar la misma instancia bajo otro token |

---

## 3. `InjectionToken` 🔑

Los tokens suelen ser **clases** (`ApiService`). Pero, ¿cómo inyectas algo que **no es una clase** — un string, un objeto de config, una interfaz? Las interfaces de TypeScript **desaparecen** al compilar (no existen en runtime), así que no sirven como token.

Solución: un **`InjectionToken`**, un token único creado a mano.

```typescript
import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  retries: number;
}

// crear el token (el string es solo para debug)
export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

// proveer el valor
providers: [
  { provide: APP_CONFIG, useValue: { apiUrl: '/api', retries: 3 } }
]

// inyectarlo con @Inject o inject()
constructor(@Inject(APP_CONFIG) private config: AppConfig) {}
// o moderno:
private config = inject(APP_CONFIG);
```

- Se necesita `@Inject(TOKEN)` en el constructor porque el tipo (interface) no basta como token.
- Con `inject(APP_CONFIG)` no hace falta `@Inject`.

> Pregunta clásica: *"¿Por qué no puedo inyectar una interface directamente?"* → Porque las interfaces de TS no existen en runtime; se usa un `InjectionToken`.

---

## 4. Inyectores jerárquicos 🔑

Angular no tiene **un** injector, tiene un **árbol** de injectors que refleja el árbol de componentes/módulos. Cuando se pide una dependencia, Angular **sube** por la jerarquía hasta encontrar un provider.

```
EnvironmentInjector (root)      ← providedIn:'root', providers de módulos
        │
   Componente A (providers: [X])
        │
   Componente B  ── pide X ──▶ busca en B → no está → sube a A → ¡encontrado!
```

### 4.1 Regla de resolución ("bubbling up")
1. Angular busca el provider en el injector del componente que lo pide.
2. Si no está, sube al injector del padre.
3. Sigue subiendo hasta el injector **root**.
4. Si no lo encuentra en ningún nivel → error `NullInjectorError: No provider for X`.

### 4.2 Consecuencia práctica: shadowing
Si un componente declara `providers: [X]`, **él y sus hijos** reciben *esa* instancia local, "tapando" (shadowing) la del root. Esto es lo que permite **estado aislado por componente** (visto en Sesión 8).

```typescript
@Component({ providers: [ContadorService] })   // instancia propia para este subárbol
```

### 4.3 Dos jerarquías
Angular tiene en realidad dos árboles de injectors que trabajan juntos:
- **ModuleInjector / EnvironmentInjector**: `providedIn:'root'`, providers de módulos y de la app.
- **ElementInjector**: providers declarados en `@Component`/`@Directive`.
Se resuelve primero el ElementInjector (subiendo por el árbol de elementos) y luego el ModuleInjector. Para entrevista basta con: *"hay una jerarquía y Angular sube buscando el provider más cercano"*.

---

## 5. Modificadores de resolución (decoradores de inyección)

Controlan **cómo** el injector busca:

```typescript
constructor(
  @Optional() private log?: LoggerService,   // no error si no existe → null
  @Self() private a: ServiceA,               // solo en el injector propio
  @SkipSelf() private b: ServiceB,           // empieza a buscar en el PADRE
  @Host() private c: ServiceC,               // busca hasta el componente host
) {}
```

| Decorador | Efecto |
|---|---|
| `@Optional()` | Si no hay provider, inyecta `null` en vez de fallar |
| `@Self()` | Busca **solo** en el injector propio (no sube) |
| `@SkipSelf()` | **Salta** el injector propio y busca desde el padre |
| `@Host()` | Sube hasta el componente host y no más |

Con `inject()` se pasan como opciones: `inject(LoggerService, { optional: true })`.

> `@SkipSelf` + `@Optional` es un patrón clásico para evitar que un módulo se importe dos veces (guard del CoreModule, Sesión 15).

---

## 6. Ejemplo integrador

```typescript
// token de configuración
export const FEATURE_FLAGS = new InjectionToken<Record<string, boolean>>('flags');

// providers de la app
providers: [
  { provide: FEATURE_FLAGS, useValue: { nuevoDashboard: true } },
  { provide: ApiService, useClass: environment.production ? ApiService : ApiMockService },
  {
    provide: AnalyticsService,
    useFactory: (flags: Record<string, boolean>) =>
      flags['tracking'] ? new RealAnalytics() : new NoopAnalytics(),
    deps: [FEATURE_FLAGS],
  },
]

// consumo
export class DashboardComponent {
  private api = inject(ApiService);              // mock o real según entorno
  private flags = inject(FEATURE_FLAGS);         // objeto de config
}
```

---

## 7. Preguntas de entrevista

1. Explica el sistema de DI de Angular: consumidor, token, provider, injector.
2. ¿Cuáles son los cuatro tipos de provider y cuándo usas cada uno?
3. ¿Diferencia entre `useClass` y `useExisting`?
4. ¿Qué es un `InjectionToken` y por qué lo necesitas?
5. ¿Por qué no puedes inyectar una interface de TypeScript?
6. ¿Qué son los inyectores jerárquicos y cómo se resuelve una dependencia?
7. ¿Qué pasa si declaras `providers:[X]` en un componente respecto al root?
8. ¿Qué error da si no hay provider para un token?
9. ¿Para qué sirven `@Optional`, `@Self`, `@SkipSelf`, `@Host`?
10. ¿Cómo cambiarías la implementación de un servicio según el entorno?

<details>
<summary>Respuestas resumidas</summary>

1. El consumidor pide por un token; el injector busca el provider (receta) del token y entrega/reutiliza la instancia.
2. `useClass` (instancia), `useValue` (valor fijo/config), `useFactory` (resultado de función, con `deps`), `useExisting` (alias a otra instancia).
3. `useClass` crea otra instancia; `useExisting` reutiliza una existente bajo otro token.
4. Un token único para inyectar cosas que no son clases (strings, config, objetos). Necesario porque las interfaces no existen en runtime.
5. Las interfaces de TS se borran al compilar; no hay token en runtime.
6. Un árbol de injectors; Angular sube desde el injector del componente hasta root buscando el provider más cercano.
7. Ese componente y sus hijos reciben una instancia local que "tapa" (shadowing) la del root.
8. `NullInjectorError: No provider for X`.
9. `@Optional` (null si falta), `@Self` (solo propio), `@SkipSelf` (empieza en el padre), `@Host` (hasta el host).
10. Con un provider condicional (`useClass`/`useFactory`) según `environment.production`, o mock en tests.

</details>

---

## ✅ Checklist para pasar a la Sesión 10

- [ ] Explico consumidor, token, provider e injector.
- [ ] Domino los 4 tipos de provider (`useClass/Value/Factory/Existing`).
- [ ] Sé qué es un `InjectionToken` y por qué las interfaces no sirven como token.
- [ ] Entiendo los inyectores jerárquicos y el "bubbling up".
- [ ] Sé qué hace `providers` a nivel de componente (shadowing).
- [ ] Conozco `@Optional/@Self/@SkipSelf/@Host`.

Cuando lo tengas, dime **"siguiente"** y armo la **Sesión 10 — Routing** (rutas, lazy loading, params, guards intro, resolvers, `ActivatedRoute` vs `Router`).
