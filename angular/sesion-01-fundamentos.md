# Sesión 1 — Fundamentos de Angular

> **Objetivo de la sesión**: entender *qué es* Angular, *por qué* existe, cómo está organizado un proyecto y cómo se trabaja con la CLI. Al terminar deberías poder explicar con tus palabras qué es un SPA, la diferencia entre framework y librería, qué hace el compilador, y crear/levantar un proyecto.

---

## 1. ¿Qué es Angular?

Angular es un **framework** de desarrollo para construir aplicaciones web (principalmente **SPA**) mantenido por Google. Está escrito en **TypeScript** y ofrece una solución *completa y opinada*: routing, formularios, cliente HTTP, inyección de dependencias, testing, etc. vienen "de fábrica".

> ⚠️ No confundir **Angular** (2+, moderno, TypeScript) con **AngularJS** (1.x, obsoleto, JavaScript). Son frameworks distintos.

### 1.1 SPA (Single Page Application)

Una **SPA** es una aplicación que carga **una sola página HTML** y, a partir de ahí, **JavaScript reescribe el DOM** dinámicamente en vez de pedir páginas nuevas al servidor.

```
App tradicional (MPA)          SPA (Angular)
─────────────────────          ─────────────────────
click → GET /productos         click → JS cambia la vista
servidor devuelve HTML         no hay recarga completa
recarga completa 🔁            el router simula navegación
```

**Ventajas**: navegación fluida (sin recargas), sensación de app nativa, menos tráfico tras la carga inicial.
**Desventajas**: primera carga más pesada, SEO más difícil (se resuelve con SSR → Sesión 26), requiere JS habilitado.

### 1.2 Framework vs Librería

| | Librería (ej: React "puro") | Framework (Angular) |
|---|---|---|
| **Quién manda** | Tú llamas a la librería | El framework te llama a ti (*Inversion of Control*) |
| **Alcance** | Resuelve una cosa | Resuelve todo el ciclo |
| **Decisiones** | Tú eliges routing, http, forms… | Ya vienen incluidos y estandarizados |
| **Curva** | Más simple al inicio | Más empinada, pero consistente en equipos grandes |

Frase para entrevista: *"Una librería la usas tú; un framework te usa a ti"*. Angular define la estructura y el flujo; tú rellenas los huecos (componentes, servicios).

### 1.3 TypeScript

Angular está construido sobre **TypeScript**: JavaScript + **tipado estático** + características modernas (interfaces, decoradores, genéricos, enums). El navegador **no entiende TypeScript**, por eso hay un paso de compilación.

Beneficios: errores en tiempo de compilación (no en producción), autocompletado, refactors seguros, contratos claros entre capas. TypeScript aplicado a Angular es la **Sesión 2**.

---

## 2. Conceptos de compilación y build

Estos términos aparecen en toda entrevista. Entiéndelos bien:

### 2.1 Compilación vs Transpilación

- **Transpilación**: traducir de un lenguaje a *otro del mismo nivel*. Ej: TypeScript → JavaScript (ambos corren en el navegador).
- **Compilación**: en Angular es el proceso donde el **Angular Compiler** toma tus templates HTML + decoradores y genera el código JavaScript optimizado que crea y actualiza el DOM.

> En la práctica el término "compilación de Angular" engloba ambas cosas: transpilar TS→JS y compilar los templates.

### 2.2 AOT vs JIT

Este es **clásico de entrevista**:

| | **JIT** (Just In Time) | **AOT** (Ahead Of Time) |
|---|---|---|
| **Cuándo compila** | En el navegador, en tiempo de ejecución | En el build, antes de desplegar |
| **Incluye el compilador en el bundle** | Sí (más pesado) | No (más liviano) |
| **Velocidad de arranque** | Más lenta | Más rápida |
| **Errores de template** | En runtime | En build (los ves antes) |
| **Uso** | Antiguamente en `ng serve` dev | **Por defecto** desde Angular 9 (Ivy), dev y prod |

Regla mnemotécnica: **AOT = compila antes = producción = mejor**. Desde Angular 9, AOT es el default siempre.

### 2.3 Bundling

**Empaquetar** todos tus archivos (`.ts`, `.html`, `.css`, dependencias) en unos pocos archivos `.js` optimizados que el navegador descarga. Históricamente lo hacía **Webpack**; Angular moderno usa **esbuild/Vite** (más rápido). → Sesión 27.

### 2.4 Tree Shaking

Proceso del bundler que **elimina el código que no se usa** ("sacude el árbol y caen las hojas muertas"). Si importas una librería pero solo usas una función, el resto **no se incluye** en el bundle final → apps más livianas.

```
import { onlyThis } from 'big-lib';  // el resto de big-lib se descarta
```

Para que funcione bien: usar `import`/`export` de ES Modules (no `require`) y evitar side-effects.

---

## 3. Arquitectura de un proyecto Angular

Un proyecto Angular se organiza en piezas con responsabilidades claras:

```
App
│
├── Components      → UI: lo que el usuario ve (HTML + lógica de vista)
├── Modules         → Agrupan y organizan piezas (menos usados con Standalone)
├── Services        → Lógica de negocio, datos, estado, llamadas HTTP
├── Pipes           → Transforman datos en el template (fecha, moneda…)
├── Directives      → Modifican el DOM / comportamiento de elementos
├── Guards          → Protegen rutas (¿puede entrar el usuario?)
├── Interceptors    → Interceptan peticiones HTTP (token, errores, loader)
├── Models          → Clases que representan datos
├── Interfaces      → Contratos de tipos (forma de los datos)
├── Environments    → Config por entorno (dev, prod)
└── Assets          → Archivos estáticos (imágenes, íconos, json)
```

Idea clave de la arquitectura Angular:
- **Componentes** = la vista (presentación).
- **Servicios** = la lógica y los datos (reutilizable, inyectable).
- **Módulos / Standalone** = cómo se agrupa y carga todo.

> Angular separa **presentación** (componentes) de **lógica** (servicios) mediante **Inyección de Dependencias**. Este principio es la base de todo (Sesiones 8 y 9).

### 3.1 Estructura típica de carpetas

```
mi-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts        // componente raíz
│   │   ├── app.component.html
│   │   ├── app.config.ts           // config (Angular moderno standalone)
│   │   ├── app.routes.ts           // rutas
│   │   ├── core/                   // servicios singleton, guards, interceptors
│   │   ├── shared/                 // componentes/pipes reutilizables
│   │   └── features/               // módulos/páginas por funcionalidad
│   ├── assets/
│   ├── environments/
│   ├── index.html                  // la ÚNICA página del SPA
│   ├── main.ts                     // punto de arranque (bootstrap)
│   └── styles.css                  // estilos globales
├── angular.json                    // configuración del workspace/CLI
├── package.json
└── tsconfig.json
```

- **`index.html`** contiene `<app-root></app-root>`: ahí se "monta" toda la app.
- **`main.ts`** hace el *bootstrap*: arranca la aplicación.

---

## 4. Angular CLI

La **CLI** (Command Line Interface) es la herramienta oficial para crear, servir, construir y generar código. Se instala con:

```bash
npm install -g @angular/cli
ng version   # comprobar instalación
```

### 4.1 Crear un proyecto

```bash
ng new mi-app
```

Te preguntará por routing y formato de estilos (CSS/SCSS…). Genera toda la estructura y **package.json** con dependencias.

### 4.2 Levantar en desarrollo

```bash
ng serve            # http://localhost:4200
ng serve -o         # además abre el navegador
ng serve --port 4300
```

Levanta un servidor de desarrollo con **recarga automática** (live reload) al guardar cambios.

### 4.3 Compilar (build)

```bash
ng build                 # build de desarrollo
ng build --configuration production   # optimizado para producción
```

> En versiones **antiguas** se usaba `ng build --prod`. Desde Angular 12+ el flag correcto es `--configuration production` (o simplemente `ng build`, que ya usa producción por defecto en proyectos nuevos). Menciona esto en entrevista: demuestra que sigues la evolución del framework.

El resultado va a la carpeta `dist/`: son los archivos estáticos que subes al servidor.

### 4.4 Generadores (`ng generate` / `ng g`)

Crean piezas ya conectadas y con su archivo de test:

```bash
ng g c productos          # component  → ProductosComponent
ng g s productos          # service    → ProductosService
ng g p moneda             # pipe       → MonedaPipe
ng g d resaltar           # directive  → ResaltarDirective
ng g guard auth           # guard
ng g interceptor auth     # interceptor
ng g module productos     # module
ng g interface producto   # interface
ng g enum estado          # enum
```

Atajos de tipo: `c`=component, `s`=service, `p`=pipe, `d`=directive, `m`=module.

Flags útiles:
```bash
ng g c productos --skip-tests      # sin archivo .spec
ng g c productos --standalone      # componente standalone (moderno)
ng g c ui/boton --flat             # sin carpeta propia
```

### 4.5 Otros comandos útiles

```bash
ng test          # ejecuta tests unitarios (Karma/Jasmine)
ng lint          # analiza el código
ng update        # actualiza Angular y dependencias
ng add @angular/material   # instala y configura una librería
```

---

## 5. El flujo completo (cómo encaja todo)

```
1. Escribes TypeScript + templates HTML
2. ng build → Angular Compiler (AOT) compila templates
              → TS se transpila a JS
              → bundler empaqueta + tree shaking
3. Se genera dist/ con index.html + bundles .js
4. El navegador carga index.html → main.ts hace bootstrap
5. Angular monta <app-root> y controla el DOM (SPA)
6. El router cambia vistas sin recargar la página
```

---

## 6. Preguntas de entrevista (nivel Junior)

Intenta responderlas **sin mirar** antes de revisar la teoría:

1. ¿Qué es un SPA y qué ventajas/desventajas tiene?
2. ¿Diferencia entre framework y librería? ¿Angular cuál es?
3. ¿Diferencia entre compilar y transpilar?
4. ¿Qué es AOT vs JIT? ¿Cuál usa Angular por defecto y desde cuándo?
5. ¿Qué es tree shaking y por qué importa?
6. ¿Para qué sirve la carpeta `environments`?
7. ¿Qué hace `main.ts` y qué es `<app-root>`?
8. ¿Qué genera `ng build` y dónde?
9. ¿Diferencia entre Angular y AngularJS?
10. ¿Qué hace `ng g c` y qué archivos crea?

<details>
<summary>Respuestas resumidas</summary>

1. App que carga un solo HTML y reescribe el DOM con JS. Ventaja: navegación fluida. Desventaja: primera carga pesada y SEO.
2. Librería la usas tú; framework te usa a ti (IoC). Angular es framework.
3. Transpilar = mismo nivel (TS→JS). Compilar = generar código optimizado (templates→JS del DOM).
4. AOT compila antes del deploy (rápido, liviano, errores en build); JIT compila en el navegador. Angular usa **AOT por defecto desde v9 (Ivy)**.
5. Eliminar código no usado del bundle final para reducir peso.
6. Configuración por entorno (URLs de API dev/prod, flags).
7. `main.ts` arranca (bootstrap) la app; `<app-root>` es el elemento del `index.html` donde se monta.
8. Archivos estáticos optimizados en `dist/`.
9. AngularJS = 1.x (JS, obsoleto); Angular = 2+ (TypeScript, moderno). Frameworks distintos.
10. Crea un componente (`.ts`, `.html`, `.css`, `.spec.ts`) y lo declara/exporta según corresponda.

</details>

---

## 7. Práctica sugerida (opcional, refuerza mucho)

Si tienes Node instalado:

```bash
npm install -g @angular/cli
ng new practica-01
cd practica-01
ng serve -o
```

Luego:
- Abre `src/app/app.component.html`, cambia el texto y observa el live reload.
- Genera un componente: `ng g c hola` y muéstralo.
- Corre `ng build` y mira la carpeta `dist/`.

---

## ✅ Checklist para pasar a la Sesión 2

- [ ] Sé explicar qué es un SPA y sus trade-offs.
- [ ] Distingo framework vs librería.
- [ ] Entiendo compilación, transpilación, bundling y tree shaking.
- [ ] Explico AOT vs JIT y cuál usa Angular.
- [ ] Reconozco las piezas de la arquitectura (components, services, etc.).
- [ ] Sé crear, levantar, construir y generar con la CLI.

Cuando marques todo, avísame y pasamos a la **Sesión 2 — TypeScript aplicado a Angular**.
