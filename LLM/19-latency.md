# Latency

La latencia de un LLM no es un solo número. Se descompone en **TTFT** (*Time To First Token*: cuánto tarda en aparecer el primer token) y **velocidad de generación** (*tokens por segundo*, o su inverso, el tiempo entre tokens). La latencia total aproximada es:

```
latencia_total ≈ red + cola del proveedor + TTFT(prefill) + output_tokens / tokens_por_segundo
```

**Por qué importa en producción:** una llamada a un LLM tarda **cientos de ms a decenas de segundos**, órdenes de magnitud más que una query a DB. Si está en el camino crítico de un request HTTP, domina el p95 del endpoint, ocupa conexiones, dispara timeouts de gateways (30–60 s) y define la experiencia del usuario. En agentes con varias llamadas encadenadas, la latencia se **suma**.

---

## ⚙️ Cómo funciona: prefill vs decode

```
  request ──▶ [red] ──▶ [cola] ──▶ [PREFILL] ──▶ [DECODE token 1..N] ──▶ fin
                                    │               │
                          procesa TODO el input   genera 1 token a la vez
                          en paralelo (rápido      (secuencial, cada token
                          por token, crece con     depende del anterior)
                          tamaño del prompt)
                                    │
                                    └─▶ TTFT = red + cola + prefill

  Tiempo ──────────────────────────────────────────────────────────▶
  |--TTFT (~0.3–2 s)--|------ output_tokens / tps (~1–30 s) ------|
```

- **Prefill** escala con los **tokens de input** (pero se paraleliza bien).
- **Decode** escala con los **tokens de output** (secuencial). Por eso **el output es la principal fuente de latencia**.

---

## 🔴 Factores que aumentan la latencia

| Factor | Afecta | Por qué |
|---|---|---|
| Tamaño del modelo | TTFT y tps | Más parámetros → más cómputo por token |
| Tokens de output | Total | Decode secuencial |
| Tokens de input | TTFT | Prefill más largo (contextos de 100k+ se notan) |
| Extended thinking / razonamiento | Total | Tokens de "pensamiento" también se generan |
| Carga del proveedor | Cola, tps | Horas pico, sobrecarga (errores 529/503) |
| Región / red | Red | Distancia al endpoint |
| Tool calling | Total | Cada tool = otro round trip al modelo |
| Llamadas secuenciales | Total | Cadenas de prompts suman latencias |
| Reintentos | Cola de latencia | Un retry duplica el tiempo del request |

---

## ✅ Técnicas para reducir latencia

### 1️⃣ Streaming (mejora la latencia *percibida*)

No acelera la generación, pero el usuario ve texto tras el TTFT en lugar de esperar el total. Detalle en [17-streaming](./17-streaming.md).

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function streamAnswer(question: string, onText: (t: string) => void) {
  const start = performance.now();
  let ttft: number | undefined;

  const stream = client.messages.stream({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: question }],
  });

  stream.on('text', (delta) => {
    ttft ??= performance.now() - start; // ✅ medir TTFT real
    onText(delta);
  });

  const final = await stream.finalMessage();
  const total = performance.now() - start;
  const tps = final.usage.output_tokens / ((total - (ttft ?? 0)) / 1000);
  metrics.histogram('llm.ttft_ms', ttft ?? total, { model: final.model });
  metrics.histogram('llm.tokens_per_sec', tps, { model: final.model });
  return final;
}
```

### 2️⃣ Paralelizar llamadas independientes

```typescript
// ❌ Secuencial: ~3 × latencia
const summary = await summarize(doc);
const entities = await extractEntities(doc);
const sentiment = await classifySentiment(doc);

// ✅ Paralelo: ~max(latencias)
const [summary, entities, sentiment] = await Promise.all([
  summarize(doc),
  extractEntities(doc),
  classifySentiment(doc),
]);
```

Ojo: paralelizar consume más RPM/TPM en ráfaga (ver [20-rate-limits](./20-rate-limits.md)). Limita concurrencia con `p-limit` o similar.

Otros patrones de paralelismo:
- **Map-reduce** sobre documentos largos: resumir chunks en paralelo y luego combinar.
- **Tool calls paralelas**: si el modelo pide 3 tools en un mismo turno, ejecútalas con `Promise.all`.
- **Especulación**: lanzar el retrieval de RAG mientras un modelo pequeño reescribe la query.

### 3️⃣ Modelos rápidos y routing

Un modelo pequeño (p. ej. `claude-haiku-4-5`) tiene menor TTFT y más tokens/segundo. Para autocompletado, clasificación o routing en el camino crítico, suele ser la opción correcta.

### 4️⃣ Reducir output

```typescript
// ❌ "Explica detalladamente..." → 800 tokens a ~60 tps ≈ 13 s
// ✅ "Responde en máximo 3 viñetas" + max_tokens: 200 → ~3 s
```

Formatos compactos (JSON con claves cortas, enums) bajan output y latencia a la vez.

### 5️⃣ Reducir input y usar prompt caching

Menos contexto → prefill más corto → menor TTFT. El prompt caching reduce el TTFT en prompts largos con prefijo repetido (ver [27-prompt-caching](./27-prompt-caching.md)).

### 6️⃣ Sacar el LLM del camino crítico

```
❌ POST /tickets ──▶ LLM clasifica (4 s) ──▶ 201

✅ POST /tickets ──▶ guarda + encola ──▶ 202 (50 ms)
                         │
                         └─▶ worker (BullMQ/SQS) ──▶ LLM ──▶ actualiza + webhook/WS
```

Si el usuario no necesita la respuesta ya, hazlo asíncrono.

### 7️⃣ Timeouts explícitos

```typescript
const client = new Anthropic({
  timeout: 30_000,  // ✅ tope por request (ms)
  maxRetries: 2,
});

// Por request, cancelable desde el cliente HTTP
const controller = new AbortController();
req.on('close', () => controller.abort()); // el usuario se fue → deja de pagar tokens
await client.messages.create({ ...params }, { signal: controller.signal, timeout: 15_000 });
```

---

## 📈 Medir bien: percentiles, no promedios

```
Distribución típica de latencia LLM (long tail):

  p50  ████████                    2.1 s
  p90  ██████████████              3.8 s
  p95  ███████████████████         5.2 s
  p99  ████████████████████████████████  9.7 s   ← retries, respuestas largas, picos
```

- Mide por separado **TTFT**, **tps** y **total**, segmentado por modelo, feature y tamaño de input/output.
- El promedio esconde la cola: 1 de cada 20 usuarios vive el p95.
- Normaliza: latencia total depende de output_tokens; compara "ms por token de output" para detectar degradación del proveedor.
- Define SLOs: p. ej. "TTFT p95 < 1.5 s" para chat, "total p95 < 8 s" para extracción.

---

## ⚖️ Trade-offs

| Decisión | Ganas | Pierdes |
|---|---|---|
| Modelo pequeño | TTFT y tps | Calidad en tareas complejas |
| Streaming | Latencia percibida | Complejidad (SSE, parsing parcial, validación al final) |
| Paralelizar | Latencia total | Picos de RPM/TPM, más costo si especulas |
| Asíncrono (colas) | Latencia del endpoint | UX sin respuesta inmediata, más infraestructura |
| Extended thinking | Calidad en razonamiento | Latencia y costo altos |
| Timeouts agresivos | Protección de recursos | Cortar respuestas válidas pero lentas |

---

## 📊 Números de referencia (aproximados)

- **TTFT**: ~0.3–1 s en modelos rápidos con prompts cortos; ~1–3 s en modelos grandes o prompts de decenas de miles de tokens.
- **Tokens/segundo**: ~30–100 en modelos grandes, ~100–200+ en modelos pequeños (varía mucho por proveedor y carga).
- 500 tokens de output a ~50 tps ≈ **10 s**.
- Prompt caching puede recortar TTFT **significativamente** (del orden de ~50%+) en prompts largos.
- Un agente con 5 turnos de tool calling × ~3 s = **~15 s** mínimo.

---

## 🎤 Preguntas de entrevista

**1. ¿Qué es TTFT y por qué importa distinto que la latencia total?**
Es el tiempo hasta el primer token; determina cuándo el usuario ve algo. Con streaming, TTFT es la latencia percibida; la total importa para procesos que necesitan la respuesta completa (JSON, tool calls).

**2. ¿Qué influye más en la latencia, input o output?**
Normalmente el output: el decode es secuencial. El input afecta sobre todo al TTFT y se nota en contextos muy grandes.

**3. Un endpoint con LLM tiene p95 de 12 s. ¿Qué haces?**
Descompongo: TTFT vs decode vs retries vs llamadas secuenciales. Luego: reducir output, modelo más rápido si las evals lo permiten, paralelizar pasos independientes, prompt caching, streaming, y si no es interactivo, moverlo a una cola.

**4. ¿El streaming reduce la latencia?**
No la total; reduce la percibida. Además complica validar la salida (hay que validar al final o incrementalmente) y el manejo de errores a mitad de stream.

**5. ¿Por qué medir p95/p99 y no promedio?**
Las latencias LLM tienen cola larga (respuestas largas, retries, picos del proveedor). El promedio esconde a los usuarios que sufren; los SLOs se definen en percentiles.

**6. ¿Cómo manejas un request cuyo cliente se desconecta a mitad de generación?**
Propago un `AbortSignal` al SDK para cancelar la llamada: dejo de consumir tokens y liberar recursos.

**7. ¿Cómo reduces la latencia de un agente?**
Menos turnos (tools más gruesas), tool calls paralelas, modelo pequeño para pasos simples, caching del prefijo (system + tools), y límites de iteraciones.

---

## 🔗 Relacionado

- [17-streaming](./17-streaming.md)
- [18-cost-optimization](./18-cost-optimization.md)
- [20-rate-limits](./20-rate-limits.md)
- [21-retries](./21-retries.md)
- [27-prompt-caching](./27-prompt-caching.md)
- [29-agentes-y-agentic-loops](./29-agentes-y-agentic-loops.md)
- [31-observabilidad-llmops](./31-observabilidad-llmops.md)
- [32-seleccion-de-modelos](./32-seleccion-de-modelos.md)
