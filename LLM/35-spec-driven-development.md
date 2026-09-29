# Spec-Driven Development (SDD)

**Spec-Driven Development** es una forma de desarrollar con agentes de IA en la que **primero se escribe una especificación** (qué se construye y por qué), luego un **plan técnico** (cómo) y una **lista de tareas**, y recién después el agente implementa. La spec, versionada en el repo, es la **fuente de verdad**: el código se deriva de ella y se verifica contra ella.

Es la respuesta al "vibe coding" (pedirle código al modelo prompt a prompt, sin plan): funciona para prototipos, pero en features grandes el agente pierde contexto, inventa requisitos y deja decisiones implícitas que nadie revisó.

**Por qué importa en producción:**
- El LLM no conoce tus reglas de negocio ni tus convenciones; la spec se las da de forma **explícita y persistente** (no se pierde al cerrar la sesión).
- Mueve la revisión humana **antes del código**: revisar 1 página de requisitos es más barato que revisar 2.000 líneas generadas.
- Reduce alucinaciones de requisitos: el agente implementa criterios de aceptación concretos, no su interpretación.
- Deja trazabilidad: requisito → decisión de diseño → tarea → commit → test.

---

## 🧠 Cómo funciona

```
 Idea / ticket
      │
      ▼
┌──────────────┐   humano revisa   ┌──────────────┐   humano revisa   ┌──────────────┐
│ 1. SPEC      │ ────────────────► │ 2. PLAN      │ ────────────────► │ 3. TAREAS    │
│ qué y por qué│                   │ cómo (stack, │                   │ pasos chicos │
│ historias,   │                   │ arquitectura,│                   │ ordenados y  │
│ criterios de │                   │ modelos de   │                   │ verificables │
│ aceptación   │                   │ datos, APIs) │                   │              │
└──────────────┘                   └──────────────┘                   └──────┬───────┘
                                                                             │
      ┌──────────────────────────────────────────────────────────────────────┘
      ▼
┌──────────────┐        ┌──────────────┐
│ 4. IMPLEMENT │ ─────► │ 5. VERIFICAR │ ── falla ──► vuelve a 4 (o corrige la spec)
│ agente hace  │        │ tests, lint, │
│ tarea por    │        │ criterios de │ ── ok ─────► PR
│ tarea        │        │ aceptación   │
└──────────────┘        └──────────────┘
```

**Regla clave:** si cambia el comportamiento esperado, **se cambia la spec primero** y se regenera plan/tareas. El código nunca es la única fuente de verdad del requisito.

### Contexto persistente vs spec por feature

| Tipo | Ejemplos | Qué contiene | Vida útil |
|---|---|---|---|
| **Reglas del proyecto** | `CLAUDE.md`, `AGENTS.md`, `constitution.md` (Spec Kit), *steering files* (Kiro) | stack, convenciones, comandos de test, "nunca hagas X" | todo el proyecto |
| **Spec de feature** | `specs/001-login/spec.md`, `plan.md`, `tasks.md` | requisitos, diseño y tareas de una feature | hasta que la feature se cierra (queda como documentación) |

---

## 📄 Ejemplo de archivos

### `spec.md` — qué y por qué (sin tecnología)

```markdown
# Feature: Recuperación de contraseña

## Contexto
Hoy el 18% de los tickets de soporte son "olvidé mi contraseña".

## Historias de usuario
- Como usuario registrado, quiero pedir un link de recuperación por email
  para volver a entrar sin contactar a soporte.

## Criterios de aceptación (formato EARS)
- CUANDO el usuario envía un email registrado, EL SISTEMA DEBE enviar un
  link de un solo uso que expira en 30 minutos.
- CUANDO el email no está registrado, EL SISTEMA DEBE responder el mismo
  mensaje genérico (no revelar si la cuenta existe).
- SI el link ya fue usado o expiró, EL SISTEMA DEBE mostrar un error y
  permitir pedir uno nuevo.
- EL SISTEMA DEBE limitar a 5 solicitudes por email por hora.

## Fuera de alcance
- Recuperación por SMS.

## Preguntas abiertas
- [NEEDS CLARIFICATION] ¿Se cierran las sesiones activas al cambiar la contraseña?
```

### `plan.md` — cómo

```markdown
# Plan técnico
- Módulo NestJS `password-reset` (controller + service).
- Tabla `password_reset_tokens(id, user_id, token_hash, expires_at, used_at)`.
  Se guarda el hash SHA-256 del token, nunca el token en claro.
- Rate limit: Redis, clave `pwreset:{email}`, TTL 1h.
- Email vía cola (BullMQ) para no bloquear el request.
- Endpoints: POST /auth/password-reset, POST /auth/password-reset/confirm.
```

### `tasks.md` — pasos chicos y verificables

```markdown
- [ ] T1 Migración de `password_reset_tokens` + entidad
- [ ] T2 Servicio: generar token, guardar hash, expiración 30 min (tests unitarios)
- [ ] T3 Endpoint de solicitud con respuesta genérica + rate limit (test e2e)
- [ ] T4 Job de envío de email
- [ ] T5 Endpoint de confirmación: valida hash, expiración y uso único (tests e2e)
```

Cada tarea es lo bastante chica para que el agente la haga en una pasada y **tiene una forma objetiva de verificarse** (un test).

---

## 🛠️ Herramientas

| Herramienta | Cómo aplica SDD |
|---|---|
| **GitHub Spec Kit** | CLI `specify` + comandos para el agente: `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`. Genera `spec.md`, `plan.md`, `tasks.md` por feature. Funciona con Claude Code, Copilot, Cursor, Gemini CLI, etc. |
| **Kiro (AWS)** | IDE con specs integradas: `.kiro/specs/<feature>/requirements.md` (notación EARS), `design.md`, `tasks.md`, y *steering files* para reglas del proyecto. |
| **Claude Code / Cursor / Copilot "a mano"** | Plan mode + `CLAUDE.md`/`AGENTS.md` + pedir al agente que escriba la spec en un archivo antes de codear. No hace falta un framework para aplicar la idea. |

> Los nombres de comandos cambian entre versiones; lo importante en una entrevista es el flujo, no la sintaxis.

---

## 🔴 Problemas comunes

❌ **Spec que ya es código:** "crear clase `ResetService` con método `generate()`" en el `spec.md`. Mezcla el qué con el cómo y deja sin espacio para evaluar alternativas.
✅ La spec habla de comportamiento observable; la tecnología va en `plan.md`.

❌ **Criterios vagos:** "debe ser seguro y rápido".
✅ Criterios verificables: "expira en 30 min", "p95 < 300 ms", "máx 5 por hora".

❌ **Tareas gigantes:** "T1: implementar recuperación de contraseña". El agente pierde el foco, llena el contexto y es imposible revisar el diff.
✅ Tareas de minutos, cada una con su test.

❌ **Spec que se desactualiza:** se corrige el comportamiento directamente en el código y la spec queda mintiendo.
✅ Cambio de requisito = cambio de spec en el mismo PR.

❌ **Ceremonia para todo:** spec de 3 archivos para cambiar un texto de un botón.
✅ SDD para features con reglas de negocio, varias piezas o varios días de trabajo; para fixes triviales basta un prompt.

❌ **Aprobar sin leer:** el agente genera spec, plan y tareas y el humano pulsa "ok" a todo. Se pierde todo el valor.
✅ El humano revisa y corrige la spec y el plan; ahí están las decisiones caras.

---

## ✅ Buenas prácticas

- Marca lo que no sabes (`[NEEDS CLARIFICATION]`) en vez de dejar que el agente lo invente.
- Incluye **"fuera de alcance"**: evita que el agente agregue features no pedidas.
- Define la verificación **antes** de implementar: tests de aceptación derivados de los criterios (SDD combina muy bien con TDD).
- Mantén las reglas del proyecto (`CLAUDE.md` / constitución) cortas y concretas: comandos de build/test, convenciones, prohibiciones.
- Implementa **una tarea por vez**, corre tests, y haz commit; si el agente se desvía, vuelves a un punto conocido.
- Versiona las specs en el repo junto al código: sirven como documentación y como contexto para el próximo agente.
- Para features grandes, usa subagentes o sesiones nuevas por tarea: la spec permite empezar con contexto limpio sin perder información (ver [16](16-context-management.md)).

---

## ⚖️ Trade-offs

| | Vibe coding | Spec-Driven Development |
|---|---|---|
| Velocidad inicial | muy alta | más lenta (escribir y revisar spec) |
| Features grandes / equipos | se degrada rápido | escala mejor |
| Revisión humana | sobre el diff final (cara) | sobre spec y plan (barata) |
| Trazabilidad | baja | alta |
| Riesgo de requisitos inventados | alto | bajo |
| Mejor para | prototipos, scripts, spikes | producto, reglas de negocio, código que se mantiene |

---

## 📊 Números de referencia (aproximados)

- Spec útil de una feature mediana: **1–2 páginas**; si pasa de ~5, probablemente son varias features.
- Tareas: **5–15 por feature**, cada una revisable en pocos minutos.
- Archivo de reglas del proyecto: idealmente **< 200–300 líneas**; se carga en cada sesión y consume tokens del contexto (ver [03](03-context-window.md)).

---

## 🎤 Preguntas de entrevista

**1. ¿Qué es Spec-Driven Development?**
Un flujo de trabajo con agentes de IA donde se escribe primero una especificación (qué y por qué), luego un plan técnico y tareas, y el agente implementa contra eso. La spec versionada es la fuente de verdad y la base de la verificación.

**2. ¿Por qué no simplemente pedirle el código al modelo?**
Porque en tareas grandes el modelo rellena huecos con supuestos, pierde contexto entre sesiones y produce diffs enormes difíciles de revisar. La spec hace explícitos los requisitos y mueve la revisión humana a donde es más barata.

**3. ¿Qué diferencia hay entre spec, plan y tareas?**
Spec: comportamiento y criterios de aceptación, sin tecnología. Plan: decisiones técnicas (arquitectura, datos, APIs). Tareas: pasos pequeños, ordenados y verificables que el agente ejecuta uno a uno.

**4. ¿Cómo evitas que la spec quede desactualizada?**
Regla de que cualquier cambio de comportamiento pasa primero por la spec, en el mismo PR que el código; revisión en code review; y tests de aceptación derivados de los criterios, que fallan si el código diverge.

**5. ¿Cuándo NO usarías SDD?**
En fixes triviales, prototipos desechables o spikes de exploración. El costo de escribir y revisar la spec no compensa si el cambio es pequeño o si todavía no sabes qué quieres construir.

**6. ¿Cómo se relaciona con TDD y con el manejo de contexto del LLM?**
Los criterios de aceptación se convierten en tests antes de implementar, lo que da al agente una señal objetiva de "terminado". Y como la spec vive en archivos, cada tarea puede empezar con contexto limpio cargando solo lo necesario, en vez de depender de un historial largo.

**7. ¿Qué herramientas conoces?**
GitHub Spec Kit (constitution → specify → plan → tasks → implement, agnóstico del agente) y Kiro de AWS (requirements en notación EARS, design, tasks y steering files). También se aplica sin framework con plan mode y archivos como `CLAUDE.md` o `AGENTS.md`.

---

## 🔗 Relacionado
- [05 · Prompt engineering](05-prompt-engineering.md)
- [15 · Hallucinations](15-hallucinations.md)
- [16 · Context management](16-context-management.md)
- [23 · Evaluación de respuestas](23-evaluacion-de-respuestas.md)
- [29 · Agentes y agentic loops](29-agentes-y-agentic-loops.md)
- [30 · MCP](30-mcp-model-context-protocol.md)
