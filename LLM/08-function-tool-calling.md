# Function / Tool Calling

**Tool calling** (o *function calling*) permite que el LLM **solicite ejecutar funciones de tu backend**: consultar la DB, llamar una API, buscar en documentos, crear un ticket. El modelo **no ejecuta nada**: devuelve una intención estructurada (`nombre + argumentos JSON`); **tu código** decide si ejecuta, ejecuta y le devuelve el resultado para que continúe.

Es la base de RAG "agéntico", asistentes que actúan y agentes. Convierte al LLM de "generador de texto" a "orquestador" que decide qué información necesita y qué acciones tomar.

**Por qué importa en producción:**
- Los argumentos vienen del modelo → son **input no confiable**: validar, autorizar y limitar.
- Cada ciclo de tool es **un round-trip más** → latencia y costo se multiplican.
- Loops mal controlados → **iteraciones infinitas**, costos descontrolados o acciones repetidas (no idempotentes).

---

## 🔁 El loop de herramientas

```
           ┌──────────────────────────────────────────────────┐
           │                                                  │
 user ──►  │  LLM  ── stop_reason: "tool_use" ──►  tu backend  │
           │   ▲         { name, input, id }        │          │
           │   │                                    │ valida   │
           │   │                                    │ autoriza │
           │   │                                    │ ejecuta  │
           │   └──── tool_result { id, content } ◄──┘          │
           │                                                  │
           └──── stop_reason: "end_turn" ──► respuesta final ─┘
```

Secuencia de mensajes:

```
user:       "¿Cuál es el estado del pedido 123 y cuándo llega?"
assistant:  [text "Voy a revisar"] [tool_use id=t1 get_order {orderId:"123"}]
user:       [tool_result tool_use_id=t1 "{status:'shipped', carrier:'X', tracking:'ABC'}"]
assistant:  [tool_use id=t2 get_tracking {tracking:"ABC"}]
user:       [tool_result tool_use_id=t2 "{eta:'2026-10-01'}"]
assistant:  [text "Tu pedido fue despachado y llega el 1 de octubre."]   ← end_turn
```

---

## 🛠️ Definición de tools

```typescript
import Anthropic from "@anthropic-ai/sdk";

const tools: Anthropic.Tool[] = [
  {
    name: "get_order",
    description:
      "Obtiene el estado de un pedido del usuario autenticado. Úsala cuando el usuario " +
      "pregunte por un pedido específico. Devuelve estado, items y tracking si existe.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID del pedido, ej. 'ord_8f2k1'" },
      },
      required: ["orderId"],
      additionalProperties: false,
    },
  },
  {
    name: "search_faq",
    description: "Busca en las preguntas frecuentes de la tienda. Úsala para políticas, envíos, devoluciones.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 10 },
      },
      required: ["query"],
    },
  },
];
```

Claves de una buena definición:
- **La descripción es el prompt de la tool**: qué hace, cuándo usarla, cuándo NO, qué devuelve.
- **Nombres claros y específicos** (`get_order`, no `tool1` ni `query`).
- **Pocos parámetros**, con `enum` cuando aplique y descripciones de formato.
- **`strict: true`** (cuando el proveedor lo soporta) para garantizar que los argumentos cumplan el schema.
- **Pocas tools bien diseñadas** > muchas tools solapadas (el modelo se confunde al elegir).

---

## 💻 Loop manual con validación y ejecución paralela

```typescript
import { z } from "zod";

const client = new Anthropic();

// Validadores y handlers por tool
const handlers = {
  get_order: {
    schema: z.object({ orderId: z.string().regex(/^ord_[a-z0-9]+$/) }),
    run: async (input: { orderId: string }, ctx: RequestContext) => {
      const order = await ctx.orders.findOne({ id: input.orderId, userId: ctx.userId }); // autorización
      if (!order) return { error: "Pedido no encontrado" };
      return { status: order.status, items: order.items.length, tracking: order.tracking };
    },
  },
  search_faq: {
    schema: z.object({ query: z.string().min(2).max(200), limit: z.number().int().min(1).max(10).default(5) }),
    run: async (input: { query: string; limit: number }, ctx: RequestContext) =>
      ctx.faq.search(input.query, input.limit),
  },
} as const;

type ToolName = keyof typeof handlers;

async function executeTool(
  block: Anthropic.ToolUseBlock,
  ctx: RequestContext,
): Promise<Anthropic.ToolResultBlockParam> {
  const handler = handlers[block.name as ToolName];
  if (!handler) {
    return { type: "tool_result", tool_use_id: block.id, content: `Tool desconocida: ${block.name}`, is_error: true };
  }

  const parsed = handler.schema.safeParse(block.input);
  if (!parsed.success) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: `Argumentos inválidos: ${JSON.stringify(parsed.error.issues)}`,
      is_error: true, // el modelo puede corregir y reintentar
    };
  }

  try {
    const result = await withTimeout(handler.run(parsed.data as never, ctx), 10_000);
    return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) };
  } catch (err) {
    ctx.logger.error({ err, tool: block.name }, "tool failed");
    return { type: "tool_result", tool_use_id: block.id, content: "Error interno ejecutando la tool", is_error: true };
  }
}

export async function runAgent(userInput: string, ctx: RequestContext): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userInput }];
  const MAX_ITERATIONS = 8;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: res.content }); // content completo

    if (res.stop_reason === "end_turn") {
      return res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    }
    if (res.stop_reason === "max_tokens") throw new Error("Respuesta truncada");
    if (res.stop_reason === "refusal") throw new Error("El modelo declinó");
    if (res.stop_reason !== "tool_use") continue;

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

    // ✅ Ejecución paralela + TODOS los resultados en UN solo mensaje user
    const results = await Promise.all(toolUses.map((t) => executeTool(t, ctx)));
    messages.push({ role: "user", content: results });
  }
  throw new Error("Máximo de iteraciones alcanzado");
}
```

### Alternativa: tool runner del SDK

```typescript
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

const getOrder = betaZodTool({
  name: "get_order",
  description: "Obtiene el estado de un pedido del usuario autenticado",
  inputSchema: z.object({ orderId: z.string() }),
  run: async ({ orderId }) => JSON.stringify(await orders.findForUser(orderId, userId)),
});

const final = await client.beta.messages.toolRunner({
  model: "claude-sonnet-5",
  max_tokens: 4096,
  tools: [getOrder],
  messages: [{ role: "user", content: "¿Dónde está mi pedido ord_8f2k1?" }],
});
```

El runner maneja el loop y valida con zod; el loop manual da control total (aprobaciones, métricas por iteración, límites custom).

---

## ⚡ Ejecución paralela

El modelo puede pedir **varias tools en un mismo turno** (ej. `get_weather("Santiago")` y `get_weather("Lima")`).

```typescript
// ❌ Secuencial: suma latencias
for (const t of toolUses) results.push(await executeTool(t, ctx));

// ❌ Un mensaje user por cada resultado → rompe el formato y
//    enseña al modelo a no pedir tools en paralelo
for (const r of results) messages.push({ role: "user", content: [r] });

// ✅ Paralelo, con límite de concurrencia si las tools son pesadas
const results = await pMap(toolUses, (t) => executeTool(t, ctx), { concurrency: 4 });
messages.push({ role: "user", content: results });
```

- **Cada `tool_use` necesita su `tool_result`** con el mismo `tool_use_id`; si falta alguno → 400.
- Si una tool falla, responde con `is_error: true`, **no la omitas**.
- Tools con **efectos secundarios** (pagos, emails) no deberían correr en paralelo sin control; considera serializarlas o requerir confirmación.

---

## 🔴 Riesgos y problemas

```typescript
// ❌ Confiar en argumentos del modelo para autorización
run: ({ userId, orderId }) => orders.findOne({ id: orderId, userId }) // userId inventable/inyectable

// ✅ Identidad desde el contexto de la request, nunca desde el modelo
run: ({ orderId }, ctx) => orders.findOne({ id: orderId, userId: ctx.userId })
```

```typescript
// ❌ Tool genérica con poder total
{ name: "run_sql", input_schema: { properties: { sql: { type: "string" } } } }

// ✅ Tools específicas, parametrizadas, least privilege
{ name: "get_orders_by_status", input_schema: { properties: { status: { enum: ["pending", "shipped"] } } } }
```

| Riesgo | Mitigación |
|---|---|
| Prompt injection vía resultados de tools (web, emails) | Tratar resultados como datos, least privilege, confirmación humana para acciones sensibles |
| Loop infinito | `MAX_ITERATIONS`, presupuesto de tokens, detección de llamadas repetidas |
| Acciones duplicadas por retries | Idempotency keys en tools con side effects |
| Resultados enormes | Paginar, truncar, resumir antes de devolver al modelo |
| Tool lenta | Timeouts por tool, devolver error manejable |
| Demasiadas tools | Agrupar, cargar dinámicamente, tool search |

---

## ✅ Buenas prácticas

- **Descripciones detalladas**: cuándo usar, cuándo no, formato de retorno.
- **Valida argumentos** con zod aunque uses `strict`, y **autoriza** con el contexto real del usuario.
- **Errores como `tool_result` con `is_error`**: el modelo puede recuperarse (corregir argumentos o explicar).
- **Resultados compactos**: solo los campos útiles; los resultados ocupan contexto en cada iteración siguiente.
- **Human-in-the-loop** para acciones irreversibles (pagar, borrar, enviar).
- **Observabilidad por iteración**: tool, args (sanitizados), latencia, error, tokens.
- **Idempotencia** en tools que escriben.

---

## ⚖️ Trade-offs

| Decisión | Pros | Contras |
|---|---|---|
| Loop manual vs tool runner | Control total | Más código y bugs posibles |
| Muchas tools pequeñas | Precisión, least privilege | Más tokens de definición, más elección errónea |
| Pocas tools genéricas | Menos tokens | Menos seguras, más ambiguas |
| Paralelo | Menor latencia | Más carga concurrente, cuidado con side effects |
| Forzar una tool (`tool_choice`) | Determinismo | Menos flexibilidad; no todos los modelos lo soportan |

---

## 📊 Números de referencia (aproximados)

| Referencia | Valor aprox. |
|---|---|
| Tokens por definición de tool | ~100–500 |
| Overhead de sistema al habilitar tools | ~cientos de tokens |
| Latencia por iteración del loop | ~1–5 s (modelo) + latencia de la tool |
| Iteraciones típicas de un asistente | 1–4 |
| Límite de iteraciones razonable | 5–20 (agentes largos, más) |
| Tools manejables sin tool search | ~10–30 |

---

## 🎤 Preguntas de entrevista

**1. ¿El LLM ejecuta la función?**
No. Devuelve un bloque `tool_use` con nombre y argumentos. Mi backend valida, autoriza, ejecuta y devuelve el resultado como `tool_result`. El control y la seguridad son del backend.

**2. ¿Cómo aseguras los argumentos que genera el modelo?**
Schema con `strict` cuando existe, validación zod en runtime, identidad y permisos tomados del contexto de la request (nunca de los argumentos), queries parametrizadas y límites de tamaño.

**3. ¿Cómo manejas llamadas paralelas?**
Ejecuto los `tool_use` concurrentemente (con límite de concurrencia), y devuelvo todos los `tool_result` en un único mensaje user, cada uno con su `tool_use_id`. Errores con `is_error: true`.

**4. ¿Cómo evitas loops infinitos o costos descontrolados?**
Límite de iteraciones, presupuesto de tokens/tiempo, detección de llamadas repetidas con mismos argumentos, y métricas/alertas por conversación.

**5. ¿Qué pasa si una tool falla?**
Devuelvo un `tool_result` con `is_error: true` y un mensaje útil pero sin detalles internos. El modelo puede reintentar con otros argumentos o informar al usuario. No omito el resultado.

**6. ¿Cómo diseñas una buena tool?**
Una responsabilidad clara, nombre descriptivo, descripción con cuándo usarla y qué devuelve, pocos parámetros tipados con enums, resultados compactos y errores accionables. Similar a diseñar una API pública para un consumidor que lee docs literalmente.

**7. ¿Cómo mitigas prompt injection que llega por resultados de tools?**
Least privilege en tools, confirmación humana para acciones sensibles, delimitar resultados como datos, no dar tools de exfiltración (ej. HTTP arbitrario) junto con datos sensibles, y monitoreo de patrones anómalos.

---

## 🔗 Relacionado

- [06 - System, user y assistant prompts](./06-system-user-prompts.md)
- [07 - Structured output](./07-structured-output.md)
- [11 - RAG](./11-rag.md)
- [21 - Retries](./21-retries.md)
- [24 - Prompt injection](./24-prompt-injection.md)
- [29 - Agentes y agentic loops](./29-agentes-y-agentic-loops.md)
- [30 - MCP (Model Context Protocol)](./30-mcp-model-context-protocol.md)
