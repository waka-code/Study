# Sesión 27 — Compilación

> **Objetivo**: entender qué pasa "por debajo" cuando construyes una app Angular: el compilador de Angular, **Ivy** (vs el antiguo View Engine), AOT vs JIT en profundidad, `ngcc`, y la evolución del sistema de build de **Webpack a esbuild/Vite**. Es la base para entender los Internals (Sesión 28).

> Requisito: fundamentos de compilación (S1) y lazy/bundles (S16, S20).

---

## 0. Panorama: de tu código al bundle

```
Tu código (TS + templates HTML + decoradores)
      │
      ▼  Angular Compiler (ngtsc) — compila templates a instrucciones
      │
      ▼  TypeScript Compiler (tsc) — TS → JS
      │
      ▼  Bundler (esbuild / Webpack) — empaqueta + tree shaking + minifica
      │
      ▼  dist/ : bundles .js optimizados
```
Hay **dos** compilaciones que conviene distinguir: la del **framework** (templates/decoradores → instrucciones Ivy) y la del **lenguaje** (TS → JS). Luego el bundler junta todo.

---

## 1. AOT vs JIT (en profundidad) 🔑

Ya visto en la Sesión 1; aquí el detalle.

### 1.1 JIT (Just-In-Time)
- La compilación de templates ocurre **en el navegador, en runtime**.
- El **compilador de Angular viaja en el bundle** → bundle más grande.
- Arranque más lento (compila al cargar).
- Errores de template se descubren en runtime.
- Se usaba en desarrollo antiguamente.

### 1.2 AOT (Ahead-Of-Time)
- La compilación ocurre **en el build**, antes de desplegar.
- El compilador **no** se incluye en el bundle → más liviano.
- Arranque más rápido (ya está compilado).
- Errores de template se detectan **en build** (template type checking).
- **Default desde Angular 9** (Ivy), tanto en dev como en prod.

| | JIT | AOT |
|---|---|---|
| Compila templates | En el navegador | En el build |
| Compilador en el bundle | Sí | No |
| Tamaño del bundle | Mayor | Menor |
| Arranque | Lento | Rápido |
| Errores de template | Runtime | Build |
| Seguridad | Mayor superficie (eval) | Menor |

> Regla: **AOT = producción = mejor**. Hoy es el default siempre; JIT es residual.

---

## 2. Ivy — el compilador y runtime moderno 🔑

**Ivy** es el motor de compilación y renderizado de Angular, **por defecto desde Angular 9**. Reemplazó al antiguo **View Engine**.

### 2.1 Cómo compila Ivy
Ivy compila cada componente a un conjunto de **instrucciones** (funciones) que crean y actualizan el DOM. En lugar de metadata interpretada (View Engine), genera **código imperativo** incrustado en la propia clase del componente:
- Una función de **creación** (monta el DOM la primera vez).
- Una función de **actualización** (aplica los cambios en cada detección).

```
@Component template → Ivy → funciones ɵɵelement(), ɵɵtext(), ɵɵproperty()… en el componente
```

### 2.2 Ventajas de Ivy sobre View Engine
- **Bundles más pequeños**: mejor tree shaking (el código no usado del framework no entra).
- **Locality**: cada componente se compila de forma independiente (no necesita metadata global) → builds incrementales más rápidos.
- **Debugging mejorado**: APIs de depuración (`ng.getComponent`, etc.).
- **Lazy loading más granular**: incluso componentes.
- Habilitó features modernas: standalone, hydration, mejores mensajes de error.

### 2.3 View Engine (histórico)
El motor anterior (Angular 4–8): compilaba a metadata que un intérprete leía en runtime. Menos eficiente en tree shaking y builds. **Eliminado por completo en Angular 13**. Solo aparece en preguntas de "evolución" (Sesión 29).

---

## 3. `ngcc` (Angular Compatibility Compiler) — histórico

Cuando Ivy llegó, muchas **librerías de terceros** seguían compiladas para View Engine. **`ngcc`** las convertía al formato Ivy durante la instalación/build ("Angular Compatibility Compiler").

- Fue un **puente temporal** durante la transición a Ivy.
- Ralentizaba los builds (procesaba node_modules).
- **Eliminado en Angular 16** (ya todas las librerías publican en formato Ivy).

> En entrevista: reconoce qué era `ngcc` y que ya no existe. Muestra que sigues la evolución.

---

## 4. El sistema de build: Webpack → esbuild/Vite 🔑

### 4.1 Webpack (clásico)
Históricamente Angular CLI usaba **Webpack** como bundler (empaqueta, transpila, tree-shaking, code-splitting, dev server). Potente pero **lento** en builds y en el arranque del dev server de apps grandes.

### 4.2 esbuild + Vite (moderno)
Desde Angular 16 (experimental) y **por defecto desde Angular 17**, el CLI usa el **Application Builder** basado en **esbuild** (bundler en Go, órdenes de magnitud más rápido) y **Vite** para el dev server (con HMR).

Beneficios:
- Builds de producción mucho **más rápidos**.
- Dev server casi instantáneo (Vite sirve módulos bajo demanda).
- HMR (Hot Module Replacement) mejorado.

```
Angular ≤15: Webpack (angular-devkit browser builder)
Angular 16:  esbuild builder (opt-in, experimental)
Angular 17+: esbuild + Vite (Application Builder por defecto en apps nuevas)
```
> Migrar de Webpack a esbuild es un tema de "actualización entre versiones" (Sesión 29/30). El `angular.json` cambia el `builder` de `@angular-devkit/build-angular:browser` a `:application`.

### 4.3 Qué hace el bundler (repaso)
- **Bundling**: junta módulos en pocos archivos.
- **Tree shaking**: elimina código no usado (Sesión 20).
- **Code splitting**: chunks para lazy loading (Sesión 16).
- **Minificación**: reduce el tamaño (nombres cortos, sin espacios).
- **Transpilación**: baja el JS a versiones compatibles con navegadores objetivo (targets del `tsconfig`/browserslist).

---

## 5. Template type checking

Con AOT/Ivy, Angular hace **type-check de los templates** (no solo del TS). Con `strictTemplates` (recomendado), detecta en build errores como pasar un `string` a un `@Input()` que espera `number`, o usar una propiedad inexistente en interpolación.
```json
// tsconfig.json → angularCompilerOptions
{ "strictTemplates": true }
```
Es una de las grandes ventajas de AOT: errores de template en compilación, no en producción.

---

## 6. Preguntas de entrevista

1. ¿Qué dos compilaciones ocurren al construir una app Angular?
2. ¿Diferencia detallada entre AOT y JIT? ¿Cuál es el default y desde cuándo?
3. ¿Qué es Ivy y qué ventajas trajo sobre View Engine?
4. ¿Cómo compila Ivy un componente (creación/actualización)?
5. ¿Qué era `ngcc` y por qué ya no existe?
6. ¿Qué cambió al pasar de Webpack a esbuild/Vite?
7. ¿Qué hace un bundler (bundling, tree shaking, code splitting…)?
8. ¿Qué es `strictTemplates` y qué aporta?
9. ¿Cuándo se eliminó View Engine?
10. ¿Por qué AOT produce bundles más pequeños que JIT?

<details>
<summary>Respuestas resumidas</summary>

1. La del framework (Angular Compiler: templates/decoradores → instrucciones Ivy) y la del lenguaje (tsc: TS→JS); luego el bundler.
2. AOT compila en build (liviano, rápido, errores en build); JIT en el navegador (incluye el compilador, más lento). AOT es default desde v9.
3. El motor de compilación/render moderno; mejor tree shaking, bundles menores, locality (builds incrementales), debugging y features nuevas.
4. Genera una función de creación (primer render) y una de actualización (por cada detección) con instrucciones ɵɵ.
5. El Angular Compatibility Compiler que convertía librerías View Engine a Ivy; puente temporal, eliminado en v16.
6. Builds y dev server mucho más rápidos; esbuild (Go) para bundling y Vite para dev server con HMR; default en v17+.
7. Empaqueta módulos, elimina código no usado, crea chunks lazy, minifica y transpila a los targets.
8. Type checking de templates en build; detecta errores de tipos en el HTML antes de producción.
9. En Angular 13.
10. AOT no incluye el compilador en el bundle (ya compiló los templates en build).

</details>

---

## ✅ Checklist para pasar a la Sesión 28

- [ ] Distingo las dos compilaciones (framework y lenguaje).
- [ ] Domino AOT vs JIT en detalle.
- [ ] Entiendo qué es Ivy y sus ventajas sobre View Engine.
- [ ] Sé qué era `ngcc` y que ya no existe.
- [ ] Conozco el cambio de Webpack a esbuild/Vite.
- [ ] Entiendo `strictTemplates`.

Cuando lo tengas, dime **"siguiente"**. La **Sesión 28 — Internals** ya está creada (cierra el bloque técnico profundo).
