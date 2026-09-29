# Agentes y Agentic Loops

Un **agente** es un sistema donde el LLM decide dinámicamente **qué pasos dar y qué herramientas usar** para cumplir un objetivo, en un loop: el modelo pide ejecutar una tool, tu código la ejecuta, le devuelve el resultado, y el modelo decide el siguiente paso hasta terminar. A diferencia de un **workflow**, donde el flujo está programado por ti (paso A → B → C), en un agente el control de flujo lo tiene el modelo.

**Por qué importa en producción:** los agentes resuelven tareas abiertas (investigar un bug, operar sobre varios sistemas, responder preguntas que requieren varias consultas), pero son **no deterministas, más caros, más lentos y más difíciles de depurar**. En una entrevista senior se valora tanto saber construir un loop robusto como saber decir *"esto no necesita un agente"*.

---

## 🔁 El loop de herramientas

```
        ┌──────────────────────────────────────────────┐
        │                                              │
        ▼                                              │
  ┌───────────┐   stop_reason = tool_use   ┌───────────┴─────┐
  │    LLM    │ ─────────────────────────▶ │ Tu código       │
  │ (decide)  │                            │ ejecuta tools   │
  └───────────┘ ◀───────────────────────── │ (DB, API, etc.) │
        │          tool_result              └─────────────────┘
        │
        │ stop_reason = end_turn
        ▼
   respuesta final
```

### Implementación con el SDK de Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: 'get_order',
    description: 'Obtiene un pedido por su ID. Úsala cuando el usuario mencione un número de pedido.',
    input_schema: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
  },
  {
    name: 'search_shipments',
    description: 'Busca envíos asociados a un pedido.',
    input_schema: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
  },
];

type ToolHandler = (input: any, ctx: { tenantId: string }) => Promise<unknown>;
const handlers: Record<string, ToolHandler> = {
  get_order: ({ orderId }, ctx) => ordersRepo.findOne(ctx.tenantId, orderId),
  search_shipments: ({ orderId }, ctx) => shipmentsApi.byOrder(ctx.tenantId, orderId),
};

export async function runAgent(userMessage: string, ctx: { tenantId: string }) {
  const MAX_STEPS = 8;
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: 'Eres un agente de soporte. Usa las herramientas para verificar datos antes de responder.',
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: res.content });

    if (res.stop_reason !== 'tool_use') {
      return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    }

    // Ejecutar todas las tool calls del turno (pueden venir varias en paralelo)
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => {
        try {
          const handler = handlers[tu.name];
          if (!handler) throw new Error(`Tool desconocida: ${tu.name}`);
          const output = await withTimeout(handler(tu.input, ctx), 10_000);
          return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(output) };
        } catch (err) {
          // Devolver el error al modelo para que se recupere, no romper el loop
          return { type: 'tool_result', tool_use_id: tu.id, content: String(err), is_error: true };
        }
      }),
    );

    messages.push({ role: 'user', content: results });
  }

  throw new Error('Agente excedió el máximo de pasos');
}
```

Puntos clave:
- El **contexto (tenantId, permisos)** lo inyecta tu código, **nunca** lo decide el modelo.
- Los errores de tools vuelven como `is_error: true`: el modelo suele corregirse (reintentar con otro ID, pedir aclaración).
- **Límite de pasos** obligatorio (y de tokens/costo/tiempo).

---

## 🧭 Planificación y ReAct

**ReAct (Reason + Act)**: el modelo alterna razonamiento y acción.

```
Pensamiento: El usuario pregunta por el pedido 8812. Necesito su estado.
Acción:      get_order({ orderId: "8812" })
Observación: { status: "shipped", carrier: "DHL" }
Pensamiento: Está enviado. Busco el tracking.
Acción:      search_shipments({ orderId: "8812" })
Observación: [{ tracking: "JD0123", eta: "2026-09-30" }]
Respuesta:   Tu pedido fue enviado por DHL, llega el 30/09 (tracking JD0123).
```

Hoy los modelos con tool calling nativo y "extended thinking" hacen esto implícitamente; no necesitas parsear texto "Acción:" como en los papers originales.

**Plan-and-execute**: el modelo primero genera un plan (lista de pasos), luego se ejecuta cada paso (a veces con un modelo más barato) y se re-planifica si algo falla. Útil en tareas largas para no perder el objetivo.

---

## 👥 Multi-agente: orquestador y subagentes

```
                     ┌─────────────────────────┐
                     │   Orquestador (Opus)     │  descompone, delega, sintetiza
                     └───────────┬─────────────┘
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
 ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
 │ Subagente A      │   │ Subagente B      │   │ Subagente C      │
 │ búsqueda en docs │   │ consulta a DB    │   │ análisis de logs │
 │ (Sonnet/Haiku)   │   │ (Haiku)          │   │ (Sonnet)         │
 │ contexto propio  │   │ contexto propio  │   │ contexto propio  │
 └─────────────────┘   └─────────────────┘   └─────────────────┘
          │                      │                      │
          └──────── resúmenes compactos al orquestador ─┘
```

Ventajas:
- **Aislamiento de contexto**: cada subagente trabaja con su propia ventana; el orquestador solo recibe el resumen.
- **Paralelismo**: subtareas independientes corren concurrentes.
- **Especialización**: tools y prompts distintos; modelos más baratos para subtareas simples.

Costos:
- Muchos más tokens totales (varias veces lo de un agente único, aproximadamente).
- Coordinación difícil: trabajo duplicado, subagentes que malinterpretan la tarea.
- Debugging: necesitas tracing de todo el árbol.

```typescript
// Subagente expuesto como tool del orquestador
const delegateTool: Anthropic.Tool = {
  name: 'research_docs',
  description: 'Delega a un subagente la búsqueda en la documentación interna. Devuelve un resumen con citas.',
  input_schema: {
    type: 'object',
    properties: { task: { type: 'string', description: 'Objetivo concreto y criterios de éxito' } },
    required: ['task'],
  },
};
// handler: research_docs → runAgent(task, ctx) con otro modelo/tools y MAX_STEPS propio
```

---

## 🛑 Límites y control

| Límite | Por qué |
|--------|---------|
| Máx. pasos (ej. 5–20) | Evita loops infinitos (el modelo repite la misma tool) |
| Presupuesto de tokens / costo por ejecución | Un agente descontrolado puede costar cientos de veces una request normal |
| Timeout total y por tool | UX y liberar recursos |
| Allowlist de tools por rol/tenant | Mínimo privilegio |
| Confirmación humana para acciones destructivas | Enviar emails, pagos, borrar datos |
| Idempotencia en tools con efectos | El agente puede reintentar la misma acción |
| Detección de repetición | Misma tool + mismo input N veces → cortar |

```typescript
// ✅ Human-in-the-loop para tools peligrosas
const REQUIRES_APPROVAL = new Set(['refund_order', 'delete_account', 'send_email']);

if (REQUIRES_APPROVAL.has(tu.name)) {
  await approvals.create({ runId, tool: tu.name, input: tu.input });
  return { type: 'tool_result', tool_use_id: tu.id, content: 'Pendiente de aprobación humana. Informa al usuario.' };
}
```

---

## ⚖️ Workflows deterministas vs agentes

| | Workflow (flujo en código) | Agente (flujo decidido por el LLM) |
|---|---|---|
| Control de flujo | Tu código | El modelo |
| Predecibilidad | Alta | Baja |
| Costo/latencia | Acotado y conocido | Variable, a veces alto |
| Testing | Unitario por paso | Evals estadísticas |
| Flexibilidad | Baja: casos no previstos fallan | Alta |
| Ideal para | Procesos conocidos (clasificar → extraer → validar → guardar) | Tareas abiertas, exploratorias |

Patrones de workflow (sin agente): **prompt chaining**, **routing** (clasificar y derivar), **paralelización** (varias llamadas + agregación), **evaluator-optimizer** (generar → evaluar → corregir con límite de iteraciones).

---

## 🔴 Cuándo NO usar agentes

❌ El proceso es siempre el mismo: *"lee la factura, extrae campos, valida, guarda"* → workflow con structured output.
❌ Una sola llamada con RAG responde la pregunta.
❌ Latencia estricta (<1–2 s) o costo por request muy acotado.
❌ Acciones irreversibles sin posibilidad de supervisión.
❌ No tienes evals: no podrás saber si el agente empeora al cambiar el prompt.

✅ Empieza por la solución más simple (1 llamada → workflow → agente) y sube de complejidad solo cuando la métrica lo justifique.

---

## 📊 Números de referencia (aproximados)

| Concepto | Orden de magnitud |
|----------|-------------------|
| Pasos típicos de un agente de soporte | 2–6 |
| Tokens de un agente vs una llamada simple | ~4× o más |
| Multi-agente vs agente único | varias veces más tokens (hasta ~10×+) |
| Latencia por paso | ~1–5 s (llamada LLM + tool) |

---

## 🎤 Preguntas de entrevista

**1. ¿Diferencia entre workflow y agente?**
En un workflow el flujo está en el código y el LLM ejecuta pasos definidos; en un agente el LLM decide qué hacer y cuándo terminar. Workflow = predecible y barato; agente = flexible pero variable.

**2. ¿Cómo evitas que un agente entre en loop o se dispare en costo?**
Límite de pasos, presupuesto de tokens/costo, timeouts, detección de llamadas repetidas, y métricas/alertas por ejecución. Si se excede, respuesta degradada o escalar a humano.

**3. ¿Cómo manejas errores de tools?**
Se devuelven al modelo como `tool_result` con `is_error`, con un mensaje útil; el modelo puede reintentar o cambiar de estrategia. Errores de infraestructura con retry/backoff en tu código; nunca exponer stack traces ni secretos.

**4. ¿Cuándo usarías multi-agente?**
Tareas amplias y paralelizables donde el contexto de un solo agente se satura (investigación sobre muchas fuentes). No para tareas secuenciales o acopladas: el costo y la coordinación no compensan.

**5. ¿Cómo aseguras un agente con acceso a APIs internas?**
Contexto de identidad inyectado por el servidor (no por el modelo), tools con mínimo privilegio y validación de input, allowlist por rol, aprobación humana para acciones destructivas, idempotencia, y defensa contra prompt injection en los resultados de tools.

**6. ¿Cómo testeas un agente?**
Tests unitarios de cada tool; evals end-to-end con casos y criterios (¿llegó a la respuesta correcta?, ¿cuántos pasos?, ¿usó tools prohibidas?); replay de trazas reales; métricas de tasa de éxito y costo por tarea.

**7. ¿Qué es ReAct?**
Patrón donde el modelo alterna razonamiento y acción (tool) y observa el resultado antes del siguiente paso. Los modelos actuales lo implementan con tool calling nativo.

---

## 🔗 Relacionado

- [08-function-tool-calling](./08-function-tool-calling.md)
- [16-context-management](./16-context-management.md)
- [21-retries](./21-retries.md)
- [22-guardrails](./22-guardrails.md)
- [24-prompt-injection](./24-prompt-injection.md)
- [30-mcp-model-context-protocol](./30-mcp-model-context-protocol.md)
- [31-observabilidad-llmops](./31-observabilidad-llmops.md)
