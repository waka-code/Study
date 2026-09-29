# Transformers y Atención

El **transformer** es la arquitectura detrás de casi todos los LLMs actuales (GPT, Claude, Llama, Gemini). Su pieza central es la **self-attention**: para cada token, el modelo calcula cuánto debe "mirar" a cada uno de los tokens anteriores para decidir qué viene después. Los LLMs de chat son transformers **decoder-only** que generan texto **un token a la vez** (generación autoregresiva).

**Por qué importa en producción:** no necesitas saber derivar gradientes, pero sí entender por qué **el contexto largo cuesta más**, por qué el **primer token tarda** (TTFT) y los siguientes salen a ritmo constante, por qué existe el **KV cache** y por qué el **prompt caching** abarata tanto. Esas son decisiones de arquitectura y costo que un backend senior toma todos los días.

---

## 🧠 Cómo funciona (vista de backend)

```
 "El gato se sentó en la"
          │
          ▼
 ┌──────────────────┐
 │   Tokenizer      │  texto → IDs  [412, 8812, 377, 9021, 290, 21]
 └──────────────────┘
          │
          ▼
 ┌──────────────────┐
 │   Embeddings     │  cada ID → vector (ej. 4096 dims) + info de posición
 └──────────────────┘
          │
          ▼
 ┌──────────────────────────────────────┐
 │  Bloque transformer  × N capas       │  (N ≈ 30–120+)
 │  ┌────────────────────────────────┐  │
 │  │  Masked self-attention         │  │  cada token mira a los anteriores
 │  │  (multi-head)                  │  │
 │  └────────────────────────────────┘  │
 │  ┌────────────────────────────────┐  │
 │  │  Feed-forward (MLP)            │  │  "conocimiento" por token
 │  └────────────────────────────────┘  │
 │  (+ residual connections, normalización)
 └──────────────────────────────────────┘
          │
          ▼
 ┌──────────────────┐
 │  Proyección a    │  logits sobre todo el vocabulario (~100k–200k)
 │  vocabulario     │
 └──────────────────┘
          │
          ▼
   sampling (temperature, top-p) → "alfombra"
```

### Self-attention en una frase

Cada token produce tres vectores: **Query** (qué busco), **Key** (qué ofrezco) y **Value** (qué información llevo).

```
atención(Q, K, V) = softmax( Q · Kᵀ / √d ) · V

Token actual "la" (Q) compara contra K de: El, gato, se, sentó, en
Scores:         El:0.05  gato:0.40  se:0.05  sentó:0.30  en:0.20
Resultado:      mezcla ponderada de los V → representación contextual de "la"
```

- **Multi-head**: se hace en paralelo con varias "cabezas" (sintaxis, correferencia, etc.).
- **Masked (causal)**: un token solo puede mirar hacia atrás, nunca al futuro. Eso es lo que permite generar de izquierda a derecha.

---

## 🔁 Generación autoregresiva

El modelo no "escribe la respuesta"; predice **el siguiente token**, lo agrega al input y repite.

```
paso 1: [prompt]                    → "El"
paso 2: [prompt, El]                → "gato"
paso 3: [prompt, El, gato]          → "duerme"
...
paso k: [...]                       → <end_of_turn>   (o max_tokens)
```

Consecuencias prácticas:
- La salida es **secuencial**: 1000 tokens de output = 1000 pasos de forward. No se paraleliza.
- Por eso el **output cuesta más** (en precio y tiempo) que el input.
- `max_tokens` es un límite duro: si se alcanza, la respuesta se corta (`stop_reason: "max_tokens"`).
- **Streaming** es natural: cada paso produce un token que puedes enviar al cliente.

---

## ⚡ Prefill vs Decode

La inferencia tiene dos fases con perfiles de costo muy distintos:

```
          PREFILL                          DECODE
  ┌──────────────────────┐      ┌──────────────────────────────┐
  │ Procesa TODO el      │      │ Genera 1 token por paso       │
  │ prompt en paralelo   │ ───▶ │ reutilizando el KV cache      │
  │ (compute-bound, GPU) │      │ (memory-bandwidth-bound)      │
  └──────────────────────┘      └──────────────────────────────┘
        determina TTFT               determina tokens/segundo
   (time to first token)             (inter-token latency)
```

| Fase | Qué hace | Cuello de botella | Métrica afectada |
|------|----------|-------------------|------------------|
| Prefill | Calcula atención sobre todo el input | Cómputo (FLOPs) | TTFT |
| Decode | Un token por paso | Ancho de banda de memoria (leer pesos + KV cache) | Tokens/s |

**Implicación:** un prompt de 100k tokens con una respuesta de 50 tokens tiene TTFT alto pero decode corto. Un prompt corto con respuesta de 4000 tokens tiene TTFT bajo pero tarda por el decode.

---

## 🗄️ KV Cache

Sin optimización, en cada paso de decode habría que recalcular K y V de **todos** los tokens previos. El **KV cache** guarda las Keys y Values ya calculadas por capa, y en cada paso solo se computan las del token nuevo.

```
Sin KV cache:  paso k recalcula K,V de k tokens     → O(k²) total por respuesta
Con KV cache:  paso k calcula K,V de 1 token        → reutiliza los k-1 guardados
```

**El costo:** memoria de GPU. Aproximadamente:

```
KV cache ≈ 2 (K y V) × capas × heads_kv × dim_head × tokens × bytes_por_valor
```

Para un modelo mediano, del orden de **cientos de KB a ~1 MB por token** (aproximado; depende de GQA/MQA y precisión). 100k tokens de contexto pueden ocupar **decenas de GB** solo en KV cache. Eso limita cuántas requests concurrentes caben en una GPU y explica por qué los proveedores cobran más o limitan el contexto largo.

Técnicas que lo reducen: **GQA/MQA** (compartir K,V entre cabezas), cuantización del cache (FP8), **PagedAttention** (vLLM, gestiona el cache en páginas como memoria virtual).

> El **prompt caching** del proveedor (ver [27-prompt-caching](./27-prompt-caching.md)) es básicamente persistir el KV cache de un prefijo entre requests.

---

## 📈 Por qué el costo crece cuadráticamente con el contexto

En self-attention, cada token compara su Query contra las Keys de todos los tokens anteriores:

```
n tokens → matriz de scores n × n

n = 1.000     →        1.000.000 comparaciones
n = 10.000    →      100.000.000
n = 100.000   →   10.000.000.000   (×10 tokens = ×100 trabajo de atención)
```

- **Cómputo de atención en prefill**: O(n²).
- **Memoria del KV cache**: O(n) (lineal), pero multiplicada por usuarios concurrentes.
- **Decode**: cada token nuevo mira n tokens → O(n) por token; se hace más lento a medida que crece el contexto.

En la práctica los proveedores cobran **por token** (lineal), pero la latencia y la capacidad del servidor sufren más que linealmente. Además, la **calidad** degrada: información en el medio de contextos muy largos se recupera peor ("lost in the middle").

Optimizaciones reales: FlashAttention (misma complejidad, mucho menos IO de memoria), sliding window attention, sparse attention, etc. No eliminan el problema: **menos contexto sigue siendo más rápido y barato**.

---

## 🔴 Errores comunes en producción

❌ "Metamos todo el historial y todos los documentos, el modelo tiene 200k de contexto"
```typescript
// ❌ Contexto inflado: TTFT alto, costo alto, peor precisión
const messages = [...fullHistory, { role: 'user', content: allDocs.join('\n') + question }];
```

✅ Recortar, resumir y recuperar solo lo relevante
```typescript
// ✅ Historial acotado + RAG top-k
const recent = fullHistory.slice(-10);
const context = (await retriever.search(question, { topK: 6 })).map((c) => c.text).join('\n---\n');

const res = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 1024,
  system: 'Responde usando solo el contexto provisto.',
  messages: [...recent, { role: 'user', content: `<contexto>\n${context}\n</contexto>\n\n${question}` }],
});
```

❌ Medir solo latencia total. ✅ Medir **TTFT** y **tokens/s** por separado: diagnostican cosas distintas (prompt largo vs respuesta larga).

❌ Pedir respuestas largas "por si acaso". ✅ `max_tokens` ajustado y pedir concisión: cada token de salida es un paso secuencial.

---

## ⚖️ Trade-offs

| Decisión | A favor | En contra |
|----------|---------|-----------|
| Contexto largo (meter todo) | Simple, sin pipeline de retrieval | Costo/latencia alta, lost-in-the-middle |
| RAG con top-k pequeño | Barato, rápido, preciso si el retrieval es bueno | Complejidad, riesgo de no recuperar lo necesario |
| Respuestas cortas | Menos decode, menos costo | Puede faltar detalle |
| Modelo grande | Mejor razonamiento | Decode más lento, más caro |

---

## 📊 Números de referencia (aproximados)

| Métrica | Orden de magnitud |
|---------|-------------------|
| Velocidad de decode (API comercial) | ~30–150 tokens/s según modelo |
| TTFT con prompt corto | ~0.3–1 s |
| TTFT con 100k tokens de input (sin caché) | varios segundos a decenas de segundos |
| Relación precio output/input | output suele costar ~3–5× el input |
| Palabras por token (inglés) | ~0.75; en español algo menos |

---

## 🎤 Preguntas de entrevista

**1. ¿Por qué un LLM genera la respuesta token a token y qué implica para el backend?**
Porque es autoregresivo: cada token depende de los anteriores. Implica que la salida es secuencial (no paralelizable), el output es más caro, conviene hacer streaming y limitar `max_tokens`.

**2. Explica prefill vs decode.**
Prefill procesa todo el prompt en paralelo y determina el TTFT; es compute-bound. Decode genera un token por paso reutilizando el KV cache; es memory-bound y determina tokens/s. Optimizas distinto: prompts cortos/caché para prefill, respuestas cortas o modelos más pequeños para decode.

**3. ¿Qué es el KV cache y cuál es su costo?**
Guardar Keys y Values de tokens ya procesados para no recalcularlos en cada paso. Ahorra cómputo a cambio de memoria de GPU lineal en tokens × usuarios concurrentes; es lo que limita el throughput de un servidor de inferencia.

**4. ¿Por qué el contexto largo es caro si el precio es por token?**
La atención es O(n²) en cómputo; la latencia de prefill crece más que linealmente y el KV cache consume memoria. Además la calidad baja con contextos enormes. El precio lineal no refleja el impacto en latencia ni en calidad.

**5. ¿Qué es la atención causal (masked)?**
Una máscara que impide que un token vea tokens futuros. Es lo que hace posible entrenar prediciendo el siguiente token y generar de izquierda a derecha.

**6. ¿Cómo bajarías el TTFT de un chatbot con system prompt de 20k tokens?**
Prompt caching del prefijo estable (system + tools), recortar el prompt, RAG en vez de documentos completos, y streaming para que el usuario perciba respuesta inmediata.

---

## 🔗 Relacionado

- [01-que-es-un-llm](./01-que-es-un-llm.md)
- [02-tokens](./02-tokens.md)
- [03-context-window](./03-context-window.md)
- [04-temperature-y-sampling](./04-temperature-y-sampling.md)
- [17-streaming](./17-streaming.md)
- [19-latency](./19-latency.md)
- [27-prompt-caching](./27-prompt-caching.md)
- [32-seleccion-de-modelos](./32-seleccion-de-modelos.md)
