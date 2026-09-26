# Sesión 26 — Renderizado: SSR, Universal, Hydration

> **Objetivo**: entender las estrategias de renderizado en Angular: CSR (por defecto), SSR con **Angular Universal**, prerender (SSG), y la **hidratación** (incluida la incremental, moderna). Cubre por qué importan para SEO y performance percibida (FCP/LCP), `TransferState` y meta tags. Es un tema clave para apps públicas.

> Requisito: fundamentos (S1: SPA/AOT) y performance (S20).

---

## 0. El problema: CSR y sus límites

Por defecto, una SPA Angular hace **CSR (Client-Side Rendering)**: el servidor envía un `index.html` casi vacío (`<app-root></app-root>`) + el JS; el navegador **descarga, parsea y ejecuta** todo, y recién entonces pinta el contenido.

Problemas del CSR:
- **SEO**: los crawlers reciben una página vacía (aunque Google ejecuta JS, no todos lo hacen bien).
- **Performance percibida**: pantalla en blanco hasta que el JS carga (FCP/LCP altos).
- **Redes lentas / dispositivos modestos**: peor experiencia.

Las estrategias de renderizado servidor resuelven esto generando **HTML ya pintado**.

---

## 1. Estrategias de renderizado

| Estrategia | Cuándo se genera el HTML | Uso |
|---|---|---|
| **CSR** (default) | En el navegador, en runtime | Apps internas, tras login, sin SEO |
| **SSR** (Server-Side Rendering) | En el servidor, **por petición** | Contenido dinámico + SEO (e-commerce, portales) |
| **SSG / Prerender** (Static Site Generation) | En **build**, una vez | Contenido estático (blog, landing, docs) |
| **ISR** (Incremental Static Regeneration) | Build + regeneración periódica | Estático que cambia ocasionalmente |

```
CSR:  navegador arma todo         → SEO malo, FCP alto
SSR:  servidor manda HTML pintado → SEO bueno, FCP bajo, coste de servidor
SSG:  HTML pre-generado en build  → SEO bueno, FCP mínimo, contenido fijo
```

---

## 2. Angular Universal / SSR 🔑

**Angular Universal** es el nombre histórico del renderizado del lado del servidor en Angular (hoy integrado en el core como `@angular/ssr`). El servidor (Node/Express) ejecuta la app, genera el HTML **ya renderizado** y lo envía; el navegador lo muestra al instante y luego el JS "toma control".

### 2.1 Añadir SSR
```bash
ng add @angular/ssr
# (proyectos nuevos: ng new mi-app --ssr)
```
Esto crea `server.ts` (servidor Express), configura el build para dos targets (browser + server) y habilita hidratación.

### 2.2 El flujo SSR
```
1. Usuario pide /productos
2. Servidor Node ejecuta la app Angular → genera HTML completo de /productos
3. Envía ese HTML → el usuario VE el contenido de inmediato (FCP bajo)
4. En paralelo, el navegador descarga el JS
5. Angular "hidrata" el HTML: lo conecta con la app viva (eventos, estado)
6. A partir de ahí funciona como SPA normal
```

### 2.3 Coste/consideraciones
- Requiere un **servidor Node** corriendo (no solo hosting estático) → más infraestructura y coste.
- El código debe ser **universal**: no usar `window`, `document`, `localStorage` directamente (no existen en el servidor). Se protege con `isPlatformBrowser` o `afterNextRender` (v16+).
```typescript
constructor(@Inject(PLATFORM_ID) private platformId: object) {}
ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    localStorage.getItem('x');   // solo en el navegador
  }
}
```
Esta es también la razón de usar `Renderer2` en vez de acceso directo al DOM (Sesión 5).

---

## 3. Hydration (hidratación) 🔑

**Hidratación** = el proceso por el cual Angular, en el navegador, **reutiliza el HTML** generado por el servidor en vez de destruirlo y volver a renderizar, conectándole eventos y estado.

### 3.1 Antes vs con hidratación
- **Sin hydration (destructive)**: Angular **borraba** el HTML del servidor y re-renderizaba todo desde cero → parpadeo, doble trabajo.
- **Con hydration (non-destructive, v16+)**: Angular **conserva** el DOM del servidor y solo lo "activa" → sin parpadeo, mejor LCP, menos trabajo.

### 3.2 Activarla
```typescript
// standalone
provideClientHydration(),
```
Es prácticamente obligatoria en SSR moderno; `ng add @angular/ssr` ya la incluye.

### 3.3 Incremental Hydration (Angular 17/19+)
Hidrata **solo las partes que se necesitan** (al hacerse visibles o al interactuar), combinándose con `@defer` (Sesión 16). Menos JS ejecutado al inicio → mejor performance. Es la dirección moderna (Sesión 29).

---

## 4. Prerender (SSG)

Para páginas cuyo contenido **no cambia por usuario** (landing, blog, docs), se pueden **pre-generar** en build como HTML estático, sin servidor Node en runtime:
```bash
ng build   # con rutas configuradas para prerender
```
Se listan las rutas a prerenderizar; el resultado es HTML estático servible desde un CDN → máxima velocidad y coste mínimo. Es lo mejor cuando el contenido es fijo.

---

## 5. SEO: meta tags dinámicos

Con SSR/SSG el HTML llega pintado, pero además hay que poner **títulos y meta tags** correctos por página (para buscadores y previews de redes sociales). Angular provee los servicios `Title` y `Meta`:

```typescript
import { Title, Meta } from '@angular/platform-browser';

constructor(private title: Title, private meta: Meta) {}

ngOnInit() {
  this.title.setTitle('Teclado Mecánico — Mi Tienda');
  this.meta.updateTag({ name: 'description', content: 'El mejor teclado...' });
  this.meta.updateTag({ property: 'og:title', content: 'Teclado Mecánico' });  // Open Graph
}
```
Con CSR, estos cambios llegan tarde para el crawler; con SSR ya están en el HTML inicial.

---

## 6. `TransferState` 🔑

Problema: en SSR, el servidor hace una petición HTTP para renderizar; sin cuidado, el **navegador repite la misma petición** al hidratar → doble llamada.

**`TransferState`** guarda los datos obtenidos en el servidor dentro del HTML y el cliente los **reutiliza** en vez de volver a pedirlos.

- Con `provideClientHydration(withHttpTransferCacheOptions(...))` (o por defecto en SSR moderno), Angular **cachea automáticamente** las respuestas HTTP del servidor y las transfiere al cliente. Evita el doble fetch sin código manual.
- También existe la API `TransferState`/`makeStateKey` para transferir datos arbitrarios manualmente.

> Menciónalo en entrevista: demuestra que entiendes un problema real y no obvio del SSR.

---

## 7. Métricas que mejora

| Métrica | CSR | SSR/SSG |
|---|---|---|
| **FCP** (First Contentful Paint) | Alto | Bajo (HTML ya pintado) |
| **LCP** (Largest Contentful Paint) | Alto | Bajo |
| **TTI** (Time To Interactive) | — | Puede ser similar (hay que hidratar) |
| **SEO** | Limitado | Bueno |

> Matiz: SSR mejora lo **percibido** (ves contenido antes), pero el TTI depende de la hidratación. Incremental hydration + `@defer` optimizan justo eso.

---

## 8. Preguntas de entrevista

1. ¿Qué es CSR y qué limitaciones tiene?
2. ¿Diferencia entre SSR, SSG y CSR?
3. ¿Qué es Angular Universal y cómo funciona el flujo SSR?
4. ¿Qué precauciones hay al escribir código para SSR (window/document)?
5. ¿Qué es la hidratación y en qué mejoró desde Angular 16?
6. ¿Qué es la hidratación incremental?
7. ¿Cómo manejas SEO y meta tags por página?
8. ¿Qué problema resuelve `TransferState`?
9. ¿Cuándo elegirías prerender/SSG?
10. ¿SSR mejora el TTI o solo el FCP?

<details>
<summary>Respuestas resumidas</summary>

1. El navegador renderiza todo tras cargar el JS; problemas de SEO y FCP (pantalla en blanco).
2. CSR: en el navegador; SSR: en el servidor por petición; SSG: en build como HTML estático.
3. El SSR de Angular: el servidor Node ejecuta la app, envía HTML pintado y luego el cliente hidrata.
4. No usar window/document/localStorage directo (no existen en el servidor); proteger con `isPlatformBrowser`/`afterNextRender`.
5. Reutilizar el HTML del servidor conectándole eventos; desde v16 es no-destructiva (sin re-render ni parpadeo).
6. Hidratar solo las partes necesarias al hacerse visibles/interactuar, junto con `@defer`.
7. Con los servicios `Title` y `Meta`; con SSR llegan ya en el HTML inicial.
8. Evita que el cliente repita las peticiones HTTP que ya hizo el servidor, transfiriendo los datos en el HTML.
9. Cuando el contenido es estático/no personalizado (blog, landing, docs): máxima velocidad y coste mínimo.
10. Sobre todo el FCP/LCP (contenido visible antes); el TTI depende de la hidratación.

</details>

---

## ✅ Checklist para pasar a la Sesión 27

- [ ] Distingo CSR / SSR / SSG y cuándo cada uno.
- [ ] Entiendo Angular Universal y el flujo SSR.
- [ ] Sé qué código rompe en el servidor y cómo protegerlo.
- [ ] Explico la hidratación (y la incremental).
- [ ] Manejo SEO con `Title`/`Meta` y entiendo `TransferState`.

Cuando lo tengas, dime **"siguiente"**. La **Sesión 27 — Compilación** ya está creada.
