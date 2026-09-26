# Sesión 30 — Temas Senior

> **Objetivo**: cerrar el temario con lo que se espera de un **Senior/Tech Lead Angular** más allá del código: microfrontends, caza de memory leaks, profiling, diseño de librerías reutilizables, migraciones entre versiones, i18n, accesibilidad, CI/CD y observabilidad. No son APIs sino **prácticas y criterio**.

> Requisito: idealmente todo el temario (S1–S29). Es una sesión de síntesis y ampliación.

---

## 1. Microfrontends (Module Federation) 🔑

**Microfrontends** = dividir una app grande en aplicaciones **independientes** (por equipo/dominio) que se despliegan por separado y se componen en runtime. El mecanismo típico es **Webpack Module Federation** (o Native Federation para esbuild).

```
Shell (host)
├── carga en runtime  →  MFE Productos (equipo A, deploy propio)
├── carga en runtime  →  MFE Checkout  (equipo B, deploy propio)
└── carga en runtime  →  MFE Perfil    (equipo C, deploy propio)
```

- Cada MFE es una app Angular que **expone** componentes/rutas; el shell los **consume** dinámicamente.
- Herramienta común: `@angular-architects/module-federation`.
- **Ventajas**: despliegues independientes, equipos autónomos, escalado organizacional.
- **Costes**: complejidad, versiones compartidas (Angular, RxJS) que hay que alinear, comunicación entre MFEs, duplicación potencial de dependencias.

> **Microfrontends vs Monorepo/Nx** (Sesión 22): Nx = un repo, normalmente **un** despliegue, límites por librería. Microfrontends = **despliegues independientes**. Elige microfrontends solo cuando la autonomía de despliegue por equipo justifica la complejidad; muchas veces un monorepo con Nx es suficiente.

---

## 2. Caza de memory leaks 🔑

La fuga #1 en Angular: **subscripciones no cerradas** (Sesión 13/28). Como senior debes **detectarlas y prevenirlas** sistemáticamente.

### 2.1 Fuentes comunes
- Observables infinitos suscritos sin cerrar (`interval`, `fromEvent`, `valueChanges`, Subjects).
- `addEventListener` global sin `removeEventListener`.
- `setInterval`/`setTimeout` no limpiados.
- Referencias a componentes destruidos en servicios singleton.
- Closures que retienen estructuras grandes.

### 2.2 Prevención
- Pipe **`async`** siempre que se pueda (se limpia solo).
- **`takeUntilDestroyed()`** (v16+) o `takeUntil(destroy$)`.
- Limpiar timers/listeners en `ngOnDestroy`.
- Lint rules que detecten subscribes sin cierre.

### 2.3 Diagnóstico con DevTools
1. Chrome DevTools → **Memory** → *Heap snapshot*.
2. Toma snapshot, navega a una vista y vuelve, fuerza **GC** (icono papelera).
3. Toma otro snapshot y **compara** ("Comparison").
4. Filtra por el nombre del componente: si hay instancias "Detached" o retenidas que deberían haberse liberado → fuga.
5. Mira la **Retainers**: la cadena que impide liberar (quién retiene). Suele ser un Subject o un listener.

---

## 3. Profiling y optimización del Change Detection

- **Angular DevTools** → **Profiler**: graba y muestra qué componentes se revisan en cada ciclo de CD y cuánto tardan → identifica componentes que se revisan de más (candidatos a `OnPush`, Sesión 14).
- **Chrome Performance**: long tasks, layout thrashing, tiempo de scripting.
- **Lighthouse / Web Vitals**: FCP, LCP, CLS, TTI, INP.
- Método: **mide primero**, localiza el cuello de botella, aplica la técnica (Sesión 20), vuelve a medir. No optimices a ciegas.

---

## 4. Diseño de librerías reutilizables

Un senior a menudo construye la **design system / librería interna**.

- **Angular Library**: `ng generate library mi-lib` (o proyecto Nx lib). Se compila con el **Angular Package Format (APF)** y se publica a npm / registro privado.
- **API pública**: expón solo lo necesario vía el `public-api.ts` (barrel, Sesión 15). Todo lo demás es privado.
- **Versionado semántico** (semver): breaking changes = major. Documenta migraciones.
- **Componentes headless con CDK** (Sesión 25): comportamiento robusto + tu diseño.
- **Peer dependencies**: Angular/RxJS como `peerDependencies`, no `dependencies`, para no duplicar versiones.
- **Schematics**: automatiza instalación/uso (`ng add`, `ng generate`) para DX.
- Testear la lib de forma aislada y con ejemplos.

---

## 5. Migraciones entre versiones mayores 🔑

Actualizar Angular es una responsabilidad senior recurrente (Sesión 29: release cada 6 meses).

- **`ng update`**: el CLI actualiza dependencias y ejecuta **migraciones automáticas** (schematics) que reescriben código deprecado.
- Guía oficial: **update.angular.dev** (antes update.angular.io) — pasos por versión origen→destino.
- **Un salto mayor a la vez** (8→9→10…), no varios de golpe.
- Revisa el **changelog** y las deprecaciones; corre tests tras cada salto.
- Migraciones frecuentes: standalone (`ng generate @angular/core:standalone`), control flow, `inject()`, Material 3, Webpack→esbuild.
- En apps grandes: planifica, hazlo en una rama, valida en CI antes de mergear.

---

## 6. Internacionalización (i18n)

Adaptar la app a varios idiomas/regiones.

- **i18n nativo de Angular** (`@angular/localize`): marcas `i18n` en el template, extraes con `ng extract-i18n`, traduces los archivos (`.xlf`) y **compilas un build por idioma** (óptimo en runtime, pero N builds).
  ```html
  <h1 i18n="@@titulo">Bienvenido</h1>
  ```
- **Librerías runtime** (`@ngx-translate/core`, **Transloco**): cambio de idioma **en runtime** sin rebuild (un solo build, JSON de traducciones). Más flexible para cambiar idioma en caliente.
- Considera además: formato de fechas/números/moneda por locale (`registerLocaleData`), pluralización (ICU), dirección RTL.

> Trade-off: i18n nativo = mejor rendimiento, build por idioma; runtime (Transloco) = un build, cambio dinámico. Elige según si el usuario cambia idioma en vivo.

---

## 7. Accesibilidad (a11y) — ARIA / WCAG

Responsabilidad transversal, a menudo requisito legal.

- **WCAG** (Web Content Accessibility Guidelines): estándar objetivo (niveles A, AA, AAA; AA es el común).
- **ARIA**: roles/atributos (`role`, `aria-label`, `aria-live`, `aria-expanded`) para tecnologías asistivas.
- **CDK a11y** (Sesión 25): `FocusTrap`, `LiveAnnouncer`, `FocusMonitor`, `ListKeyManager`.
- Prácticas: navegación completa por **teclado**, foco visible y gestionado, contraste de color, textos alternativos, HTML **semántico** (`<button>`, no `<div click>`), formularios con labels.
- Herramientas: **axe DevTools**, Lighthouse a11y audit, lectores de pantalla (NVDA, VoiceOver).
- Angular Material/CDK ya traen a11y de fábrica → una razón para usarlos (Sesión 24).

---

## 8. CI/CD

Automatizar build, test y despliegue.

- **Pipeline típico**: lint → test unitario (`ng test --watch=false --code-coverage`) → build prod (`ng build`) → E2E (Cypress/Playwright) → deploy.
- **Herramientas**: GitHub Actions, GitLab CI, Azure DevOps, Jenkins (tienes carpeta `DevOps/` en el repo).
- **Optimización**: caché de `node_modules`/build, `nx affected` para construir solo lo cambiado (Sesión 22), builds paralelos.
- **Budgets** (Sesión 20) que fallan el pipeline si el bundle crece de más.
- Despliegue: estáticos a CDN/S3 (CSR/SSG) o Node para SSR (Sesión 26); estrategias blue-green/canary.

---

## 9. Observabilidad

Saber qué pasa en producción.

- **Error tracking**: Sentry, Datadog, Application Insights — capturan errores de runtime. Se integran con un `ErrorHandler` global de Angular:
  ```typescript
  @Injectable()
  export class GlobalErrorHandler implements ErrorHandler {
    handleError(error: unknown) { /* enviar a Sentry */ }
  }
  providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
  ```
- **Logs/métricas**: enviar eventos de negocio y performance.
- **Tracing**: correlacionar peticiones frontend↔backend (headers de trazas, OpenTelemetry).
- **RUM (Real User Monitoring)**: Web Vitals reales de usuarios (LCP, INP, CLS).
- **Feature flags** para lanzar/rollback controlado.

---

## 10. El rol técnico senior (soft + hard)

Más allá de Angular:
- **Decisiones de arquitectura** justificadas (Sesión 22) y documentadas (ADRs).
- **Code reviews** con criterio (rendimiento, a11y, seguridad, tests).
- **Mentoring** y establecer convenciones/lint/prettier compartidos.
- **Trade-offs**: saber cuándo NO usar algo (NgRx, microfrontends, SSR, hexagonal) — la sobre-ingeniería es un error senior común.
- **Estrategias de caché y sincronización** de datos (HTTP cache, `shareReplay`, optimistic updates, offline).
- Mantener el **radar** de la evolución del framework (Sesión 29).

---

## 11. Preguntas de entrevista

1. ¿Qué son los microfrontends y cuándo los usarías frente a un monorepo?
2. ¿Cómo detectas y previenes memory leaks?
3. ¿Cómo haces profiling de la detección de cambios?
4. ¿Cómo diseñarías una librería de componentes reutilizable?
5. ¿Cómo migras una app entre versiones mayores de Angular?
6. ¿i18n nativo vs runtime (Transloco)? Trade-offs.
7. ¿Cómo aseguras accesibilidad en una app Angular?
8. ¿Cómo sería un pipeline de CI/CD para Angular?
9. ¿Cómo capturas errores en producción?
10. ¿Cuándo NO usarías NgRx / SSR / microfrontends?

<details>
<summary>Respuestas resumidas</summary>

1. Apps independientes desplegables por separado (Module Federation); úsalos cuando la autonomía de despliegue por equipo justifica la complejidad; si no, monorepo/Nx.
2. Prevenir con async/takeUntilDestroyed y limpieza en OnDestroy; detectar con heap snapshots comparados y la cadena de retención.
3. Con Angular DevTools Profiler (qué componentes se revisan y cuánto), Chrome Performance y Web Vitals; medir antes de optimizar.
4. Angular Library (APF), API pública mínima (public-api), semver, peerDependencies, CDK headless, schematics y tests aislados.
5. `ng update` con migraciones automáticas, un salto mayor a la vez, seguir update.angular.dev, correr tests, en una rama y validado en CI.
6. Nativo: mejor rendimiento pero build por idioma; runtime: un build y cambio dinámico. Según si se cambia idioma en vivo.
7. HTML semántico, navegación por teclado, ARIA, CDK a11y, contraste, y auditar con axe/Lighthouse/lectores de pantalla.
8. lint → test+coverage → build prod → E2E → deploy; con caché, `nx affected`, budgets y despliegue a CDN o Node (SSR).
9. Con un `ErrorHandler` global que envía a Sentry/Datadog, más logs, tracing y RUM.
10. Cuando la complejidad no se justifica: estado simple (no NgRx), sin SEO/estático (no SSR), un solo equipo/deploy (no microfrontends).

</details>

---

## ✅ Fin del temario

- [ ] Entiendo microfrontends y su trade-off vs monorepo.
- [ ] Sé cazar y prevenir memory leaks con DevTools.
- [ ] Hago profiling con criterio (medir → optimizar → medir).
- [ ] Sé diseñar librerías y migrar entre versiones.
- [ ] Conozco i18n, a11y (WCAG/ARIA), CI/CD y observabilidad.
- [ ] Tengo criterio senior: sé cuándo NO usar algo.

🎉 **Completaste las 30 sesiones.** Vuelve al [README](README.md) para repasar. Próximos pasos sugeridos:
- Construir un **proyecto integrador** que use lo aprendido (auth + interceptors + guards + reactive forms + NgRx/Signals + lazy + OnPush + tests).
- Repasar las **preguntas de entrevista** de cada sesión en voz alta.
- Elegir 2-3 temas para **profundizar con la práctica** (RxJS, Change Detection, Signals suelen ser los diferenciadores).
