# Context Window

La **ventana de contexto** es el número máximo de tokens que un modelo puede "ver" en una sola llamada: **system prompt + definiciones de tools + historial de mensajes + documentos + la salida que va a generar**. Todo lo que no está dentro de la ventana, para el modelo, no existe.

Es la "memoria RAM" del LLM: finita, cara y compartida entre instrucciones, datos y respuesta. Aunque hoy existen ventanas de cientos de miles o millones de tokens, **llenarla no es gratis**: sube el costo, sube la latencia (TTFT) y la calidad de recuperación de información puede degradarse.

**Por qué importa en producción:**
- Si te pasas, la API responde **400** (o el SDK/framework trunca silenciosamente, que es peor).
- Una conversación o un agente **crece en cada turno** hasta chocar con el límite.
- Más contexto ≠ mejor respuesta: la información relevante se "diluye".

---

## 🧱 Qué ocupa la ventana

```
┌──────────────────────── Context window (ej. 200k tokens) ────────────────────────┐
│                                                                                  │
│  [tools]  [system prompt]  [msg 1] [msg 2] ... [msg N]  [docs RAG]  │ [ salida ] │
│   2k          1.5k               historial 40k            20k       │  max_tokens│
│                                                                     │   8k       │
│◄──────────────────────────── input ────────────────────────────────►│◄─ output ─►│
└──────────────────────────────────────────────────────────────────────────────────┘

Regla:  input_tokens + max_tokens  ≤  context window
```

- **`max_tokens` reserva espacio**: el input disponible es `ventana − max_tokens`.
- Las **tools** cuentan: 30 tools con schemas detallados pueden ser 5–15k tokens.
- En modelos con **razonamiento extendido**, los tokens de pensamiento también consumen presupuesto de salida.

---

## 🔍 Calidad vs tamaño: "lost in the middle"

```
Probabilidad de usar bien un dato según su posición (tendencia típica)

alta │ █                                          █
     │ ██                                        ██
     │ ████                                    ████
baja │ ████████████████████████████████████████████
     └──────────────────────────────────────────────
       inicio            medio                 final
```

- Los modelos suelen atender mejor lo que está **al inicio y al final** del contexto.
- Los modelos modernos mejoraron mucho en pruebas tipo *needle in a haystack*, pero en tareas reales (razonar sobre muchos datos dispersos) **la precisión cae** a medida que crece el contexto.
- Patrón recomendado para documentos largos: **documentos arriba, pregunta e instrucciones al final**.

---

## 🔴 Problemas típicos

### 1. Historial ilimitado

```typescript
// ❌ Acumular todo para siempre
conversation.push({ role: "user", content: input });
const res = await client.messages.create({ model, max_tokens: 2048, messages: conversation });
conversation.push({ role: "assistant", content: res.content });
// Turno 200 → 400 Bad Request: prompt is too long
```

### 2. Truncar a ciegas

```typescript
// ❌ Cortar mensajes del principio sin cuidado
messages = messages.slice(-10);
// Puede romper pares tool_use/tool_result → 400
// Puede dejar un "assistant" como primer mensaje
// Pierde el objetivo original de la conversación
```

### 3. Meter todo "por si acaso"

```typescript
// ❌ 300 páginas de manual en cada request
content: `${entireManual}\n\nPregunta: ${q}`   // caro, lento y diluye lo relevante

// ✅ Recuperar solo los fragmentos relevantes (RAG)
const chunks = await retriever.search(q, { topK: 8 });
```

---

## ✅ Estrategias de gestión de contexto

### Ventana deslizante segura + resumen

```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

const MAX_INPUT_TOKENS = 120_000;

async function fitContext(
  system: string,
  messages: Anthropic.MessageParam[],
): Promise<Anthropic.MessageParam[]> {
  const { input_tokens } = await client.messages.countTokens({
    model: "claude-sonnet-5",
    system,
    messages,
  });
  if (input_tokens <= MAX_INPUT_TOKENS) return messages;

  // Resumir la mitad más antigua con un modelo barato
  const cut = findSafeCutIndex(messages, Math.floor(messages.length / 2));
  const old = messages.slice(0, cut);
  const recent = messages.slice(cut);

  const summary = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: "Resume la conversación preservando decisiones, datos y tareas pendientes.",
    messages: [{ role: "user", content: JSON.stringify(old) }],
  });
  const text = summary.content.find((b) => b.type === "text")?.text ?? "";

  return [
    { role: "user", content: `<resumen_previo>\n${text}\n</resumen_previo>` },
    { role: "assistant", content: "Entendido, continúo con ese contexto." },
    ...recent,
  ];
}

// Corta solo donde empieza un turno "user" que no sea un tool_result,
// para no separar pares tool_use / tool_result.
function findSafeCutIndex(messages: Anthropic.MessageParam[], from: number): number {
  for (let i = from; i < messages.length; i++) {
    const m = messages[i];
    const isToolResult =
      Array.isArray(m.content) && m.content.some((b) => b.type === "tool_result");
    if (m.role === "user" && !isToolResult) return i;
  }
  return messages.length;
}
```

### Otras técnicas

| Técnica | Cuándo |
|---|---|
| **RAG** | Base de conocimiento grande; solo traer lo relevante |
| **Resumen incremental** | Chats largos; guardar "memoria" condensada |
| **Limpiar resultados de tools viejos** | Agentes que leen muchos archivos/respuestas |
| **Compaction del proveedor** | Algunos proveedores resumen server-side al acercarse al límite |
| **Sub-agentes** | Delegar lectura pesada y recibir solo la conclusión |
| **Memoria externa (DB)** | Hechos persistentes del usuario, recuperados bajo demanda |
| **Prompt caching** | Prefijo grande y estable (docs, tools) reutilizado entre requests |

---

## ⚖️ Trade-offs

| Enfoque | Pros | Contras |
|---|---|---|
| **Long context (meter todo)** | Simple, sin pipeline de retrieval, el modelo ve todo | Caro por request, TTFT alto, degradación con mucho ruido |
| **RAG** | Barato, escalable a millones de docs, actualizable | Complejidad, si el retrieval falla la respuesta falla |
| **Resumen** | Conversaciones "infinitas" | Pérdida de detalle, llamada extra |
| **Ventana deslizante** | Trivial de implementar | Olvida el objetivo inicial y datos clave |

Regla práctica: **si el corpus cabe holgado y se reutiliza (con caching), long context es válido; si es grande o cambia, RAG.**

---

## 📊 Números de referencia (aproximados)

| Referencia | Valor aprox. |
|---|---|
| Ventanas típicas actuales | ~128k–1M tokens |
| 200k tokens | ~150k palabras en inglés ≈ 500 páginas |
| 1M tokens | ~2.500+ páginas o un repo mediano |
| TTFT con 100k+ tokens de input (sin cache) | varios segundos |
| Definición de una tool | ~100–500 tokens |
| Límite práctico recomendado | dejar 10–20% de margen bajo el máximo |

---

## 🎤 Preguntas de entrevista

**1. ¿Qué cuenta dentro de la ventana de contexto?**
Todo: system prompt, definiciones de tools, historial completo, documentos inyectados, resultados de tools y los tokens de salida (incluyendo razonamiento). `input + max_tokens ≤ ventana`.

**2. Con ventanas de 1M tokens, ¿RAG está muerto?**
No. Long context sirve para corpus pequeños o análisis puntuales, pero para miles de documentos o datos que cambian, RAG es más barato, rápido y actualizable. Además, más contexto con ruido degrada la precisión. En la práctica se combinan.

**3. ¿Cómo manejas una conversación que crece indefinidamente?**
Presupuesto de tokens por request, conteo antes de enviar, resumen incremental de lo antiguo, limpieza de tool results viejos, memoria persistente fuera del prompt y cortes en puntos seguros (sin separar tool_use de tool_result).

**4. ¿Qué es "lost in the middle"?**
La tendencia de los modelos a aprovechar peor la información en el medio de contextos largos. Mitigación: poner lo importante al inicio o al final, reducir ruido, rerankear y repetir la instrucción clave al final.

**5. ¿Por qué más contexto aumenta la latencia?**
Porque el prefill debe procesar todos los tokens de entrada antes de emitir el primero (TTFT). El prompt caching reduce mucho ese costo para prefijos repetidos.

**6. ¿Qué error ves al exceder la ventana y cómo lo previenes?**
Un 400 de request inválido (prompt too long). Prevención: contar tokens antes, limitar historial y documentos, y fallar de forma controlada (resumir o pedir al usuario que acote) en vez de truncar a ciegas.

---

## 🔗 Relacionado

- [02 - Tokens](./02-tokens.md)
- [11 - RAG](./11-rag.md)
- [12 - Chunking](./12-chunking.md)
- [16 - Context management](./16-context-management.md)
- [19 - Latency](./19-latency.md)
- [27 - Prompt caching](./27-prompt-caching.md)
- [29 - Agentes y agentic loops](./29-agentes-y-agentic-loops.md)
