# Selección de Modelos

Elegir un modelo es un trade-off entre **calidad, costo, latencia, contexto, privacidad y operación**. No existe "el mejor modelo": existe el modelo más barato y rápido que cumple el umbral de calidad **para esa tarea concreta**, medido con tus evals. En producción es habitual usar **varios modelos** a la vez: uno grande para razonamiento difícil, uno pequeño para clasificación/extracción, uno de embeddings, y un proveedor alternativo como fallback.

**Por qué importa en producción:** la diferencia de precio entre el tier pequeño y el grande de una misma familia es de un orden de magnitud o más, y la de latencia también es notable. Mandar todo al modelo más potente "por si acaso" suele ser el mayor desperdicio de una factura LLM; mandar todo al más barato degrada la calidad donde más importa.

---

## 🧠 Las dimensiones

```
                  CALIDAD
                     ▲
                     │        ● Opus / frontier grande
                     │
                     │   ● Sonnet / tier medio
                     │
                     │ ● Haiku / tier pequeño
                     │● modelo abierto 8B
                     └──────────────────────────▶ COSTO y LATENCIA
```

| Dimensión | Preguntas |
|-----------|-----------|
| Calidad | ¿Pasa mis evals? ¿Razonamiento, código, seguir instrucciones, idioma español? |
| Costo | Precio por token in/out, caché, batch; tokens que genera (algunos modelos "piensan" mucho) |
| Latencia | TTFT, tokens/s, variabilidad (p95) |
| Contexto | Ventana máxima y calidad en contextos largos |
| Capacidades | Tool calling, structured output, visión, PDF, thinking |
| Privacidad/compliance | Residencia de datos, retención cero, región, certificaciones |
| Operación | Rate limits, SLA, disponibilidad regional, deprecaciones |

---

## 🪜 Tiers típicos (familia Claude como ejemplo)

| Tier | Ejemplo | Uso típico |
|------|---------|-----------|
| Grande | `claude-opus-5-5` | Razonamiento complejo, agentes largos, código difícil, orquestador |
| Medio | `claude-sonnet-5` | Default de producción: chat, RAG, tool use, buen balance |
| Pequeño | `claude-haiku-4-5` | Clasificación, extracción, routing, resúmenes cortos, subagentes, alto volumen |

Lo mismo existe en OpenAI, Google y modelos abiertos (familias con tamaños 8B / 70B / 400B+, etc.).

---

## 🔀 Routing por dificultad

Clasificar la request y enviarla al modelo adecuado.

```
             ┌──────────────┐
request ───▶ │ Router       │  reglas + modelo pequeño clasificador
             └──────┬───────┘
      ┌─────────────┼───────────────┐
      ▼             ▼               ▼
  simple        normal          complejo
  (FAQ,         (RAG, chat)     (análisis multi-doc,
  clasificar)                    código, agente)
  Haiku         Sonnet          Opus
```

```typescript
type Tier = 'small' | 'medium' | 'large';

const MODEL_BY_TIER: Record<Tier, string> = {
  small: 'claude-haiku-4-5',
  medium: 'claude-sonnet-5',
  large: 'claude-opus-5-5',
};

async function pickTier(input: { text: string; feature: string; attachments: number }): Promise<Tier> {
  // 1. Reglas baratas primero
  if (input.feature === 'classify-ticket') return 'small';
  if (input.attachments > 3 || input.text.length > 20_000) return 'large';

  // 2. Clasificador con modelo pequeño
  const res = await anthropic.messages.create({
    model: MODEL_BY_TIER.small,
    max_tokens: 5,
    system: 'Clasifica la dificultad de la solicitud. Responde solo: simple, normal o complejo.',
    messages: [{ role: 'user', content: input.text.slice(0, 4000) }],
  });
  const label = res.content[0].type === 'text' ? res.content[0].text.trim().toLowerCase() : 'normal';
  return label === 'simple' ? 'small' : label === 'complejo' ? 'large' : 'medium';
}
```

Variantes:
- **Cascada**: intentar con el pequeño; si la validación falla (schema inválido, baja confianza, judge negativo), escalar al grande.
- **Por feature**: cada endpoint tiene su modelo fijo, decidido con evals. Lo más simple y a menudo suficiente.
- **Por tenant/plan**: plan premium → modelo grande.

⚠️ El router suma latencia y puede equivocarse; mide la tasa de mal routing con evals.

---

## 🔓 Modelos abiertos vs cerrados

| | Cerrados (API: Claude, GPT, Gemini) | Abiertos (Llama, Mistral, Qwen, DeepSeek, Gemma...) |
|---|---|---|
| Calidad frontier | Generalmente superior | Cerca en tareas acotadas; brecha en razonamiento difícil |
| Operación | Cero infra | GPUs, escalado, actualizaciones, on-call |
| Costo | Por token, lineal | Fijo (GPU) — barato a alto uso sostenido, caro si ocioso |
| Privacidad | Depende del contrato/región | Datos nunca salen de tu red |
| Personalización | Limitada (prompting, algo de fine-tuning) | Total: fine-tuning, LoRA, cuantización |
| Lock-in / deprecación | El proveedor retira versiones | Tú controlas la versión |
| Licencia | Términos de servicio | Revisar licencia (algunas con restricciones de uso) |

---

## 🖥️ Self-hosting con vLLM

**vLLM** es el servidor de inferencia open source más usado: PagedAttention para el KV cache, **continuous batching** (mezcla requests en vuelo para maximizar uso de GPU) y **API compatible con OpenAI**.

```bash
# Servir un modelo abierto con API compatible con OpenAI
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.90 \
  --enable-prefix-caching
```

```typescript
// Mismo SDK de OpenAI apuntando a tu vLLM
import OpenAI from 'openai';

const local = new OpenAI({ baseURL: 'http://vllm.internal:8000/v1', apiKey: 'not-needed' });

const res = await local.chat.completions.create({
  model: 'meta-llama/Llama-3.1-8B-Instruct',
  messages: [{ role: 'user', content: 'Clasifica: "no puedo iniciar sesión"' }],
  max_tokens: 10,
});
```

Consideraciones: dimensionar por **memoria de GPU** (pesos + KV cache × concurrencia), cuantización (AWQ/GPTQ/FP8) para caber en menos GPU, autoscaling lento (cargar pesos tarda minutos), y observabilidad propia. Alternativas: TGI, SGLang, Ollama/llama.cpp (desarrollo local, no para alta carga), NVIDIA NIM/Triton.

---

## ☁️ Cloud gestionado: Bedrock, Vertex, Azure

| Plataforma | Qué ofrece | Por qué elegirla |
|------------|------------|------------------|
| **AWS Bedrock** | Claude, Llama, Mistral, Titan/Nova y otros vía API AWS | IAM, VPC endpoints, facturación AWS, datos en tu cuenta/región |
| **Google Vertex AI** | Gemini, Claude, modelos abiertos | Integración GCP, residencia de datos |
| **Azure OpenAI / AI Foundry** | Modelos de OpenAI y otros | Ecosistema Microsoft, contratos enterprise |

Ventajas: compliance y networking privado con la cuenta cloud existente, un solo contrato, cuotas gestionadas. Desventajas: features nuevas a veces llegan después que en la API directa, cuotas por región, IDs de modelo distintos.

```typescript
// Claude vía Bedrock con el SDK de Anthropic
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';

const bedrock = new AnthropicBedrock({ awsRegion: 'us-east-1' });
// mismo shape de messages.create; el model ID sigue el formato de Bedrock
```

Abstrae el proveedor detrás de una interfaz propia (`LlmProvider`) para poder hacer fallback y cambiar sin tocar lógica de negocio.

---

## 📏 Benchmarks y sus límites

Benchmarks públicos (MMLU, GPQA, SWE-bench, HumanEval, leaderboards de preferencia humana, etc.) sirven para **preseleccionar**, no para decidir.

Límites:
- **Contaminación**: los datos del benchmark pueden estar en el entrenamiento.
- **No representan tu tarea**: tu dominio, tu idioma (español), tu formato, tus documentos.
- **Saturación**: muchos benchmarks ya tienen scores altos en todos los modelos top.
- **Leaderboards de preferencia** premian estilo (respuestas largas, formato bonito).
- No miden latencia, costo, estabilidad ni seguimiento de tu system prompt.

✅ Construye un **eval set propio** (50–500 casos reales con respuestas esperadas o criterios), y compara modelos en calidad, costo por caso y p95 de latencia.

```
| Modelo              | Exactitud | Costo/1k casos (aprox.) | p95 latencia |
|---------------------|-----------|-------------------------|--------------|
| claude-haiku-4-5    | 91%       | $                       | 1.1 s        |
| claude-sonnet-5     | 96%       | $$$                     | 2.4 s        |
| claude-opus-5-5     | 97%       | $$$$$$                  | 5.0 s        |
→ Para esta tarea: Sonnet por defecto; Haiku si el umbral aceptable es 90%.
(números ilustrativos)
```

---

## 🔴 Errores comunes

❌ Usar el modelo más grande para todo. ✅ Modelo por feature decidido con evals; routing donde se justifique.
❌ Elegir por leaderboard. ✅ Eval propio sobre tu tarea.
❌ Hardcodear el model ID en 30 archivos. ✅ Config central; interfaz de proveedor; alias por feature.
❌ No planificar deprecaciones. ✅ Seguir anuncios, re-ejecutar evals al migrar de versión.
❌ Self-hostear "para ahorrar" con tráfico bajo. ✅ Calcular costo total (GPU ociosa + equipo).

---

## 📊 Números de referencia (aproximados)

| Concepto | Orden de magnitud |
|----------|-------------------|
| Diferencia de precio tier pequeño vs grande | ~10× o más |
| Tokens/s tier pequeño vs grande | pequeño suele ser ~2–3× más rápido |
| GPU para un modelo de ~8B (FP16) | 1 GPU de ~24 GB |
| GPU para ~70B | varias GPUs de 80 GB (o cuantizado) |
| Eval set útil | 50–500 casos representativos |

---

## 🎤 Preguntas de entrevista

**1. ¿Cómo eliges modelo para una nueva feature?**
Defino criterios y un eval set con casos reales; pruebo del tier más barato hacia arriba; elijo el más barato que cumple el umbral de calidad y latencia; dejo el modelo configurable y re-evalúo al salir versiones nuevas.

**2. ¿Qué es routing de modelos y qué riesgo tiene?**
Enviar cada request al modelo adecuado según dificultad. Ahorra costo y latencia; el riesgo es clasificar mal (calidad baja en casos difíciles) y la latencia del propio router. Se mitiga con reglas baratas, cascada con validación y evals del router.

**3. ¿Cuándo self-hostearías un modelo abierto?**
Requisitos estrictos de datos que no pueden salir de la red, alto volumen sostenido donde la GPU se amortiza, necesidad de fine-tuning profundo o latencia controlada. Si no, API gestionada.

**4. ¿Por qué no confiar en benchmarks públicos?**
Contaminación, no representan tu dominio ni idioma, saturación, sesgo de estilo, y no miden costo/latencia. Sirven para preseleccionar; decide con evals propios.

**5. ¿API directa o Bedrock/Vertex?**
Bedrock/Vertex si la empresa ya vive en esa nube y necesita IAM, VPC privada, residencia de datos y facturación unificada. API directa para acceso más rápido a features nuevas. Con una interfaz propia puedes usar ambas (una como fallback).

**6. ¿Qué es continuous batching y por qué importa en vLLM?**
Agrupar dinámicamente tokens de muchas requests en vuelo en cada paso de decode, en vez de esperar a que un batch termine. Maximiza el uso de GPU y el throughput sin penalizar mucho la latencia.

---

## 🔗 Relacionado

- [01-que-es-un-llm](./01-que-es-un-llm.md)
- [18-cost-optimization](./18-cost-optimization.md)
- [19-latency](./19-latency.md)
- [23-evaluacion-de-respuestas](./23-evaluacion-de-respuestas.md)
- [26-transformers-y-atencion](./26-transformers-y-atencion.md)
- [28-fine-tuning-vs-rag-vs-prompting](./28-fine-tuning-vs-rag-vs-prompting.md)
- [34-arquitectura-llm-en-produccion](./34-arquitectura-llm-en-produccion.md)
