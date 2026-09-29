# ¿Qué es un LLM?

Un **Large Language Model (LLM)** es una red neuronal (casi siempre un *Transformer*) entrenada con enormes cantidades de texto para hacer una sola cosa: **predecir el siguiente token** dada una secuencia de tokens previa. Todo lo demás (responder preguntas, escribir código, llamar herramientas, devolver JSON) emerge de repetir esa predicción muchas veces, una tras otra.

Para un backend, un LLM es básicamente **una dependencia externa no determinista, lenta, cara y con límites de tamaño de entrada**. Se consume por HTTP (API de un proveedor) o se hospeda (modelos open-weights). Entender cómo funciona por dentro explica casi todos sus problemas de producción: alucinaciones, costos por token, latencia proporcional a la salida, límites de contexto y variabilidad entre llamadas.

**Por qué importa en producción:**
- El costo y la latencia se miden en **tokens**, no en requests.
- La salida es **probabilística**: el mismo input puede dar outputs distintos.
- El modelo **no "sabe" nada en tiempo real**: solo conoce su entrenamiento (hasta un *knowledge cutoff*) más lo que le pases en el prompt.
- El modelo **no tiene memoria entre llamadas**: la API es *stateless*; tú reenvías el historial cada vez.

---

## 🧠 Cómo funciona (vista de ingeniero)

```
 Texto de entrada
       │
       ▼
 ┌─────────────┐   "Hola mundo" → [15496, 23420]
 │ Tokenizador │
 └─────────────┘
       │ ids de tokens
       ▼
 ┌─────────────┐   cada token → vector (ej. 4096–16384 dims)
 │ Embeddings  │
 └─────────────┘
       │
       ▼
 ┌──────────────────────────┐
 │ N capas Transformer      │   atención: cada token "mira" a los anteriores
 │ (self-attention + MLP)   │
 └──────────────────────────┘
       │
       ▼
 ┌─────────────┐   distribución de probabilidad sobre TODO el vocabulario
 │ Logits      │   (~100k–250k tokens posibles)
 └─────────────┘
       │ sampling (temperature, top-p…)
       ▼
  siguiente token ──► se agrega a la entrada ──► repetir hasta stop
```

### Generación autoregresiva

El modelo genera **un token a la vez**. Cada token nuevo se agrega a la secuencia y se vuelve a ejecutar el modelo:

```
Paso 1: "La capital de Chile es"            → " Santiago"
Paso 2: "La capital de Chile es Santiago"   → "."
Paso 3: "La capital de Chile es Santiago."  → <end_turn>
```

Consecuencias directas:
- **Latencia ∝ tokens de salida.** Generar 1.000 tokens tarda ~10× más que generar 100.
- **Los tokens de entrada se procesan en paralelo** (fase *prefill*), por eso son más baratos y rápidos que los de salida.
- **No puede "volver atrás"**: si arranca mal una frase, la continúa. Por eso ayuda pedirle que razone antes de responder.

### Dos fases de una llamada

```
┌────────────── Prefill ──────────────┐┌────── Decode ──────────────────┐
│ procesa todo el prompt en paralelo  ││ genera token por token          │
│ → determina Time To First Token     ││ → determina tokens/seg          │
│ (TTFT)                              ││ (output throughput)             │
└─────────────────────────────────────┘└─────────────────────────────────┘
```

---

## 🏗️ Cómo se entrena (lo justo para la entrevista)

| Etapa | Qué hace | Resultado |
|---|---|---|
| **Pre-training** | Predecir el siguiente token sobre billones de tokens de internet, libros, código | Modelo "base": completa texto, no sigue instrucciones |
| **Supervised fine-tuning (SFT)** | Entrenar con pares instrucción → respuesta ideal | Sigue instrucciones, formato de chat |
| **RLHF / RLAIF / RL con verificadores** | Optimizar según preferencias humanas o recompensas automáticas | Más útil, seguro, mejor razonamiento |

Lo importante: **el conocimiento viene del pre-training** (fijo hasta el *knowledge cutoff*), y **el comportamiento** (tono, formato, seguridad) viene del post-training.

---

## 🔌 Cómo se consume desde un backend

La API es un endpoint HTTP stateless: le mandas el historial completo y te devuelve el siguiente mensaje.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno

const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  system: "Eres un asistente que responde en español, de forma concisa.",
  messages: [{ role: "user", content: "¿Qué es un índice B-tree?" }],
});

for (const block of response.content) {
  if (block.type === "text") console.log(block.text);
}

console.log(response.stop_reason); // "end_turn" | "max_tokens" | "tool_use" | ...
console.log(response.usage);       // { input_tokens, output_tokens, ... }
```

En NestJS esto suele vivir en un provider inyectable:

```typescript
@Injectable()
export class LlmService {
  private readonly client = new Anthropic({ maxRetries: 3, timeout: 60_000 });

  async ask(question: string): Promise<string> {
    const res = await this.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: question }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}
```

---

## 🔴 Problemas típicos en producción

| Problema | Causa raíz | Mitigación |
|---|---|---|
| **Alucinaciones** | Predice texto plausible, no verdadero | RAG, citas, validación, "di que no sabes" |
| **No determinismo** | Sampling probabilístico + infra distribuida | Temperature baja, structured output, evals |
| **Latencia alta** | Decode token a token | Streaming, modelos más chicos, limitar `max_tokens` |
| **Costos que explotan** | Contexto reenviado en cada turno | Prompt caching, recortar historial, modelo adecuado |
| **Conocimiento desactualizado** | Knowledge cutoff | Inyectar datos frescos en el prompt (RAG, tools) |
| **Prompt injection** | No distingue instrucciones de datos | Delimitadores, least privilege, guardrails |
| **Rate limits (429)** | Cuotas por tokens/min y requests/min | Retries con backoff, colas, múltiples keys/regiones |

```typescript
// ❌ Tratar la salida del LLM como verdad y usarla directo
const sql = await llm.ask(`Genera SQL para: ${userInput}`);
await db.query(sql);

// ✅ Tratarla como input no confiable: validar, restringir, auditar
const plan = QueryPlanSchema.parse(await llm.structured(userInput)); // zod
const rows = await repo.findByFilters(plan.filters); // query parametrizada tuya
```

---

## ✅ Buenas prácticas

- Trata al LLM como **un servicio externo poco confiable**: timeouts, retries, circuit breaker, fallbacks.
- **Nunca confíes en la salida**: valídala como si fuera input de usuario.
- **Loguea `usage`** (tokens de entrada/salida) por request para controlar costos.
- Revisa siempre `stop_reason`: `max_tokens` significa respuesta truncada.
- Elige el **modelo más chico que cumpla** la tarea (clasificar ≠ razonar sobre código).
- Mide con **evals**, no con "a mí me funcionó en el playground".

---

## ⚖️ Trade-offs

| Decisión | Opción A | Opción B |
|---|---|---|
| API gestionada vs self-hosted | Cero infra, mejores modelos, pago por token | Control de datos, costo fijo, GPU y MLOps a tu cargo |
| Modelo grande vs chico | Mejor calidad en tareas difíciles | Más barato y rápido, suficiente para tareas simples |
| Prompting vs fine-tuning | Iteración rápida, sin entrenamiento | Mejor para formato/estilo muy específico, más costoso de mantener |

---

## 📊 Números de referencia (aproximados)

| Métrica | Valor típico (aprox.) |
|---|---|
| Tamaño de vocabulario | ~100k–250k tokens |
| Ventana de contexto | ~128k–1M tokens |
| Máx. tokens de salida | ~8k–128k según modelo |
| TTFT (time to first token) | ~0,3–2 s (más con razonamiento extendido) |
| Velocidad de salida | ~50–200 tokens/s |
| Precio | ~$1–$25 por millón de tokens (salida 4–5× más cara que entrada) |

> Valores orientativos; cambian con cada generación de modelos. Consulta siempre la documentación del proveedor.

---

## 🎤 Preguntas de entrevista

**1. ¿Qué hace realmente un LLM?**
Predice el siguiente token dada una secuencia, de forma autoregresiva. Las capacidades "inteligentes" emergen de esa predicción a escala. No consulta una base de datos ni verifica hechos.

**2. ¿Por qué los tokens de salida son más caros y lentos que los de entrada?**
La entrada se procesa en paralelo en una sola pasada (prefill); la salida requiere una pasada del modelo por cada token (decode), que además está limitada por ancho de banda de memoria de la GPU.

**3. ¿La API "recuerda" la conversación?**
No, es stateless. El cliente reenvía el historial completo en cada request; por eso el costo de una conversación crece con cada turno.

**4. ¿Cómo integrarías un LLM en un servicio crítico?**
Como una dependencia externa: timeouts, retries con backoff y jitter, circuit breaker, fallback a otro modelo o respuesta degradada, validación de la salida con schema y observabilidad de tokens, latencia y errores.

**5. ¿Por qué un LLM alucina?**
Porque optimiza la plausibilidad del texto, no su veracidad. Si no tiene la información en el contexto o en sus pesos, igual genera algo con forma de respuesta. Se mitiga dándole contexto (RAG), permitiéndole decir "no sé" y verificando.

**6. ¿Qué es el knowledge cutoff y cómo lo manejas?**
La fecha hasta la que llegan los datos de entrenamiento. Todo lo posterior hay que inyectarlo en el prompt: RAG, tools que consultan APIs o la DB, o datos del request.

**7. ¿Cuándo NO usarías un LLM?**
Cuando la lógica es determinista y expresable en código (validaciones, cálculos, reglas de negocio), cuando se requiere exactitud del 100% sin verificación o cuando la latencia/costo no se justifica.

---

## 🔗 Relacionado

- [02 - Tokens](./02-tokens.md)
- [03 - Context window](./03-context-window.md)
- [04 - Temperature y sampling](./04-temperature-y-sampling.md)
- [15 - Hallucinations](./15-hallucinations.md)
- [26 - Transformers y atención](./26-transformers-y-atencion.md)
- [32 - Selección de modelos](./32-seleccion-de-modelos.md)
- [34 - Arquitectura LLM en producción](./34-arquitectura-llm-en-produccion.md)
