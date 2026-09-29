# Cost Optimization

Optimizar costos en LLMs significa **pagar solo por los tokens que de verdad aportan valor**. Los proveedores cobran por token, con precios distintos para **input** (prompt, contexto, historial, tools) y **output** (lo que genera el modelo). El output suele costar **~3–5x más** que el input, y un modelo "grande" puede costar **~10–20x más** que uno "pequeño".

**Por qué importa en producción:** en un prototipo, 1.000 requests al día no se notan. En producción, con 1M requests diarias, prompts de 8k tokens y un modelo grande, la factura se vuelve la partida más grande del sistema. El costo escala **linealmente con el tráfico** y **multiplicativamente con el tamaño del contexto**; un system prompt inflado o un historial sin recortar se paga en *cada* request.

---

## ⚙️ Cómo se calcula el costo

```
costo_request = (input_tokens  × precio_input  / 1M)
              + (output_tokens × precio_output / 1M)
              + (cache_write_tokens × precio_cache_write / 1M)   // si aplica
              + (cache_read_tokens  × precio_cache_read  / 1M)   // mucho más barato

Ejemplo ilustrativo (precios inventados, solo para razonar):
  modelo grande:  $3 / 1M input,  $15 / 1M output
  request: 6.000 input + 500 output
  = 6000×3/1M + 500×15/1M = $0.018 + $0.0075 = $0.0255
  × 1M requests/día ≈ $25.500/día  → ~$765k/mes
```

Dónde se van los tokens de input en una app típica:

```
┌──────────────────────────────────────────────┐
│ System prompt (instrucciones, reglas)  ~1-3k │ ← se repite en CADA request
│ Definiciones de tools (JSON schema)    ~0.5-2k│ ← idem
│ Contexto RAG (chunks)                  ~2-8k │ ← suele ser el mayor
│ Historial de conversación              ~0-20k│ ← crece sin control
│ Mensaje del usuario                    ~50-500│
└──────────────────────────────────────────────┘
```

---

## 🔴 Problemas comunes

- **Un solo modelo grande para todo**: clasificar un ticket no necesita el modelo más potente.
- **Historial sin recortar**: una conversación de 40 turnos reenvía todo en cada mensaje → costo cuadrático sobre la sesión.
- **Top-k RAG demasiado alto**: 20 chunks "por si acaso" cuando 4 bien rerankeados bastan.
- **`max_tokens` alto sin control** + prompts que invitan a la verbosidad.
- **Reintentos ciegos**: cada retry es otra request cobrada (ver [21-retries](./21-retries.md)).
- **Procesos offline con la API síncrona** cuando existe Batch API más barata.
- **No medir**: nadie sabe qué feature o qué tenant consume el 80% del gasto.

---

## ✅ Técnicas de optimización

### 1️⃣ Modelos pequeños y routing

La mayor palanca. Usa el modelo más barato que cumpla el umbral de calidad (medido con evals, ver [23-evaluacion-de-respuestas](./23-evaluacion-de-respuestas.md)).

```
                ┌──────────────┐
  request ────▶ │   Router     │ (reglas, clasificador, o modelo pequeño)
                └──────┬───────┘
          simple ◀─────┴─────▶ complejo
     ┌──────────────┐     ┌──────────────┐
     │ claude-haiku │     │claude-sonnet │
     │  (barato)    │     │  (caro)      │
     └──────────────┘     └──────────────┘
```

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

type Tier = 'fast' | 'smart';
const MODELS: Record<Tier, string> = {
  fast: 'claude-haiku-4-5',
  smart: 'claude-sonnet-5',
};

function routeTask(task: { kind: string; inputChars: number }): Tier {
  // ✅ Reglas baratas primero; solo escalar lo que lo necesita
  if (['classify', 'extract', 'summarize-short'].includes(task.kind)) return 'fast';
  if (task.inputChars > 20_000 || task.kind === 'reasoning') return 'smart';
  return 'fast';
}

export async function run(task: { kind: string; prompt: string }) {
  const tier = routeTask({ kind: task.kind, inputChars: task.prompt.length });
  return client.messages.create({
    model: MODELS[tier],
    max_tokens: tier === 'fast' ? 300 : 1024,
    messages: [{ role: 'user', content: task.prompt }],
  });
}
```

**Cascada (fallback hacia arriba):** intenta con el modelo pequeño; si la salida no valida (schema, confianza baja, el juez la rechaza), reintenta con el grande. Paga el grande solo en el ~10–20% de casos.

### 2️⃣ Caching de respuestas (exact / semantic)

Si la misma pregunta llega muchas veces, no la vuelvas a pagar.

```typescript
import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';

export async function cachedCompletion(redis: Redis, model: string, system: string, user: string) {
  // ✅ La clave incluye TODO lo que afecta la salida (modelo, system, versión del prompt)
  const key = 'llm:' + createHash('sha256')
    .update(JSON.stringify({ model, system, user, v: 'prompt-v3' }))
    .digest('hex');

  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  const res = await client.messages.create({
    model, max_tokens: 512, system,
    messages: [{ role: 'user', content: user }],
  });
  await redis.set(key, JSON.stringify(res), 'EX', 60 * 60 * 24);
  return res;
}
```

- **Exact cache**: hash del prompt normalizado. Seguro, hit rate bajo en texto libre.
- **Semantic cache**: embedding de la pregunta + búsqueda por similitud (umbral ~0.95). Mayor hit rate, riesgo de devolver una respuesta a una pregunta *parecida pero distinta*.
- ⚠️ Nunca compartas caché entre tenants/usuarios si la respuesta depende de datos privados (ver [25-seguridad-de-datos](./25-seguridad-de-datos.md)).

### 3️⃣ Prompt caching (del proveedor)

El proveedor cachea el **prefijo** del prompt (system + tools + documentos estáticos). Las lecturas de caché cuestan una fracción del input normal (~10% aprox.) y además bajan la latencia. Detalle en [27-prompt-caching](./27-prompt-caching.md).

```typescript
const res = await client.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: LONG_STATIC_INSTRUCTIONS, // manual de políticas, ejemplos few-shot...
      cache_control: { type: 'ephemeral' }, // ✅ marca el fin del prefijo cacheable
    },
  ],
  messages: [{ role: 'user', content: question }],
});

console.log(res.usage.cache_read_input_tokens, res.usage.cache_creation_input_tokens);
```

```
❌ [timestamp dinámico][system][tools][docs][pregunta]  → prefijo cambia siempre, 0 hits
✅ [system][tools][docs estáticos] | [contexto dinámico][pregunta]
                                   ↑ breakpoint de caché
```

### 4️⃣ Batch API

Para trabajos que no necesitan respuesta inmediata (clasificar 100k tickets, generar embeddings/resúmenes nocturnos, evals). Suele tener **~50% de descuento** y límites de rate separados, a cambio de latencia de minutos a horas (ventana de hasta ~24h).

```typescript
const batch = await client.messages.batches.create({
  requests: tickets.map((t) => ({
    custom_id: `ticket-${t.id}`,
    params: {
      model: 'claude-haiku-4-5',
      max_tokens: 50,
      messages: [{ role: 'user', content: `Clasifica este ticket: ${t.body}` }],
    },
  })),
});

// Más tarde (job/cron): consultar estado y leer resultados
const status = await client.messages.batches.retrieve(batch.id);
if (status.processing_status === 'ended') {
  for await (const r of await client.messages.batches.results(batch.id)) {
    if (r.result.type === 'succeeded') save(r.custom_id, r.result.message);
  }
}
```

### 5️⃣ Recortar contexto

```typescript
// ❌ Reenviar todo el historial
messages: conversation.allMessages

// ✅ Ventana deslizante + resumen de lo antiguo
const recent = conversation.messages.slice(-8);
const system = `${BASE_SYSTEM}\n\nResumen de la conversación previa:\n${conversation.summary}`;
```

- RAG: top-k bajo (3–5) tras reranking, en lugar de 20 chunks crudos ([14-reranking](./14-reranking.md)).
- Tools: expón solo las relevantes para el paso actual; cada schema cuesta tokens.
- Elimina HTML, espacios, boilerplate y campos JSON que el modelo no usa.
- Mide antes de enviar con `client.messages.countTokens(...)`.

### 6️⃣ Controlar el output (`max_tokens` y formato)

El output es el token más caro y además el más lento ([19-latency](./19-latency.md)).

```typescript
// ❌ Sin límite real y prompt abierto
{ max_tokens: 4096, messages: [{ role: 'user', content: 'Analiza este ticket' }] }

// ✅ Límite ajustado + formato compacto
{
  max_tokens: 150,
  system: 'Responde SOLO con JSON: {"category": string, "priority": "low"|"med"|"high"}. Sin explicación.',
  messages: [{ role: 'user', content: ticket }],
}
```

`max_tokens` es un **tope**, no un objetivo: no ahorra si el modelo igual es verboso, pero evita respuestas desbocadas. Revisa `stop_reason === 'max_tokens'` para detectar truncados.

---

## 📈 Medir: costo por feature y por tenant

```typescript
function costUSD(model: string, u: Anthropic.Usage): number {
  const p = PRICING[model]; // tabla de precios en config, no hardcodeada en el código
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1_000_000
  );
}

metrics.histogram('llm.cost_usd', costUSD(model, res.usage), { feature, tenantId, model });
```

Sin este dato no puedes priorizar: normalmente 1–2 features concentran la mayoría del gasto.

---

## ⚖️ Trade-offs

| Técnica | Ahorro | Costo / riesgo |
|---|---|---|
| Modelo pequeño | Alto (~5–20x) | Calidad menor en tareas complejas; requiere evals |
| Routing / cascada | Alto | Complejidad; un router que se equivoca degrada calidad |
| Response cache | Muy alto en hits | Respuestas obsoletas; fugas entre tenants |
| Prompt caching | Alto en input repetido | Requiere prefijo estable; TTL corto |
| Batch API | ~50% | Latencia de horas; solo offline |
| Recortar contexto | Medio–alto | Perder información relevante → peor respuesta |
| `max_tokens` bajo | Medio | Respuestas truncadas |

---

## 📊 Números de referencia (aproximados)

- Output vs input: **~3–5x** más caro por token.
- Modelo pequeño vs grande: **~5–20x** más barato.
- Lectura de prompt cache: **~10%** del precio de input normal.
- Batch API: **~50%** de descuento típico.
- 1 token ≈ **~4 caracteres** en inglés; en español algo más de tokens por palabra.
- Un system prompt de 2k tokens × 1M requests = **2.000M tokens** de input al día solo en instrucciones.

---

## 🎤 Preguntas de entrevista

**1. La factura de LLM se triplicó este mes. ¿Cómo lo investigas?**
Primero observabilidad: costo por feature, modelo, tenant y tipo de token (input/output/cache). Busco el driver: más tráfico, contexto creciente (historial, top-k), cambio de modelo, bucle de retries o un agente en loop. Después ataco la mayor partida.

**2. ¿Por qué el output importa más que el input?**
Es más caro por token y además determina la latencia (se genera token a token). Controlarlo con formato compacto, instrucciones de brevedad y `max_tokens` da ahorro doble.

**3. ¿Cuándo usarías un modelo pequeño?**
Clasificación, extracción, routing, resúmenes cortos, reformulación de queries para RAG. Lo decido con evals: si el pequeño cumple el umbral de calidad del golden dataset, va el pequeño.

**4. Diferencia entre response caching y prompt caching.**
Response caching evita la llamada completa si la entrada es igual (lo implemento yo, en Redis). Prompt caching lo hace el proveedor: igual se genera la respuesta, pero el prefijo repetido se cobra mucho más barato y se procesa más rápido.

**5. ¿Riesgos del semantic cache?**
Falsos positivos (preguntas parecidas con respuestas distintas), datos obsoletos y fuga entre usuarios. Mitigo con umbral alto, TTL, clave particionada por tenant/permisos y no cachear respuestas personalizadas.

**6. Tienes que clasificar 2M documentos históricos. ¿Cómo?**
Batch API con modelo pequeño, `max_tokens` mínimo, salida estructurada, prompt caching del system común; primero un piloto de 1k para validar calidad y costo estimado.

**7. ¿Cómo evitas que la conversación se vuelva cada vez más cara?**
Ventana deslizante de turnos recientes + resumen incremental de lo antiguo, y prompt caching del prefijo estable. Límite duro de tokens por sesión.

---

## 🔗 Relacionado

- [02-tokens](./02-tokens.md)
- [03-context-window](./03-context-window.md)
- [16-context-management](./16-context-management.md)
- [19-latency](./19-latency.md)
- [21-retries](./21-retries.md)
- [27-prompt-caching](./27-prompt-caching.md)
- [31-observabilidad-llmops](./31-observabilidad-llmops.md)
- [32-seleccion-de-modelos](./32-seleccion-de-modelos.md)
