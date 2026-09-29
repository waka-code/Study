# Observabilidad y LLMOps

**LLMOps** es el conjunto de prácticas para operar aplicaciones con LLM en producción: trazar cada llamada, medir tokens/costo/latencia/calidad, versionar prompts, evaluar cambios antes de desplegarlos y detectar regresiones. La **observabilidad** de un sistema LLM extiende la clásica (logs, métricas, trazas) con dimensiones propias: qué prompt se envió, qué versión, qué contexto se recuperó, cuántos tokens, cuánto costó, y si la respuesta fue buena.

**Por qué importa en producción:** un LLM falla de forma **silenciosa**: devuelve 200 OK con una respuesta incorrecta, alucinada o lenta. Sin trazas no puedes responder *"¿por qué el bot le dijo eso a este cliente?"*, *"¿por qué la factura de la API subió 3× esta semana?"* o *"¿el cambio de prompt de ayer empeoró la calidad?"*.

---

## 🧠 Qué hay que observar

```
Request del usuario (trace)
│
├── span: guardrail.input            12 ms   ok
├── span: rag.embed_query            35 ms   model=embed-v3, tokens=18
├── span: rag.vector_search          48 ms   topK=20, index=docs-v7
├── span: rag.rerank                 90 ms   kept=6
├── span: llm.chat                 2340 ms   model=claude-sonnet-5
│     prompt_version=support-v14
│     input_tokens=6120  cached=5200  output_tokens=310
│     ttft=620ms  cost_usd≈0.0x  stop_reason=end_turn
│   ├── span: tool.get_order          80 ms
│   └── span: llm.chat (turno 2)     900 ms
├── span: guardrail.output            20 ms   ok
└── feedback: 👎 (usuario, 2 min después)
```

| Dimensión | Métricas/atributos |
|-----------|--------------------|
| Latencia | TTFT, duración total, tokens/s, latencia por paso (retrieval, LLM, tools) |
| Tokens | input, output, cache read/write, por request, usuario, tenant, feature |
| Costo | USD estimado por request/tenant/feature; presupuesto diario |
| Fiabilidad | tasa de error por proveedor, 429, timeouts, retries, fallbacks activados |
| Calidad | feedback 👍/👎, evals online (LLM-as-judge muestreado), tasa de rechazo, `stop_reason=max_tokens` |
| RAG | nº de chunks, scores, docs citados, "sin contexto relevante" |
| Seguridad | guardrails disparados, intentos de prompt injection detectados |

---

## 🔭 Tracing con OpenTelemetry

OpenTelemetry tiene **semantic conventions para GenAI** (atributos `gen_ai.*`), lo que permite enviar trazas LLM a cualquier backend (Jaeger, Tempo, Datadog, Honeycomb, Langfuse, etc.).

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';
import Anthropic from '@anthropic-ai/sdk';

const tracer = trace.getTracer('llm-service');
const anthropic = new Anthropic();

export async function tracedChat(
  params: Anthropic.MessageCreateParamsNonStreaming,
  meta: { promptVersion: string; tenantId: string; feature: string },
) {
  return tracer.startActiveSpan(`chat ${params.model}`, async (span) => {
    span.setAttributes({
      'gen_ai.operation.name': 'chat',
      'gen_ai.system': 'anthropic',
      'gen_ai.request.model': params.model,
      'gen_ai.request.max_tokens': params.max_tokens,
      'app.prompt_version': meta.promptVersion,
      'app.tenant_id': meta.tenantId,
      'app.feature': meta.feature,
    });
    const start = performance.now();
    try {
      const res = await anthropic.messages.create(params);
      span.setAttributes({
        'gen_ai.response.model': res.model,
        'gen_ai.response.finish_reasons': [res.stop_reason ?? 'unknown'],
        'gen_ai.usage.input_tokens': res.usage.input_tokens,
        'gen_ai.usage.output_tokens': res.usage.output_tokens,
        'app.usage.cache_read_tokens': res.usage.cache_read_input_tokens ?? 0,
        'app.cost_usd_estimate': estimateCost(res.model, res.usage),
      });
      metrics.llmLatency.record(performance.now() - start, { model: params.model, feature: meta.feature });
      return res;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

En NestJS, esto encaja como un **provider `LlmClient`** envuelto o un **interceptor**, con auto-instrumentación de HTTP/DB vía `@opentelemetry/sdk-node` para ver el trace completo desde el controller hasta el proveedor.

---

## 🔐 Logging de prompts y respuestas (con cuidado de PII)

Guardar prompts/respuestas es esencial para depurar y construir datasets de evals, pero contienen datos personales, secretos y contenido de clientes.

❌ Loguear todo en texto plano en el log general:
```typescript
// ❌ PII y secretos en logs con retención infinita y acceso amplio
logger.info({ prompt: messages, response: res.content }, 'llm call');
```

✅ Separar metadatos (siempre) de contenido (controlado):
```typescript
// ✅ Metadatos en logs/métricas; contenido redactado en almacén dedicado con retención y ACL
logger.info({
  traceId, tenantId, model, promptVersion,
  inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, latencyMs,
}, 'llm call');

if (tenantSettings.allowsContentLogging) {
  await llmTraceStore.save({
    traceId,
    prompt: redactPII(messages),      // emails, RUT/DNI, tarjetas, teléfonos, tokens
    response: redactPII(res.content),
    expiresAt: addDays(new Date(), 30),
  });
}
```

Reglas:
- **Redacción** antes de persistir (regex + NER/servicio de detección de PII).
- **Retención** limitada y configurable por tenant; derecho a borrado.
- **Acceso** restringido y auditado (no todo el equipo necesita ver conversaciones).
- **Muestreo**: en alto volumen, guardar contenido de un % + todos los errores/feedback negativo.
- Revisar qué envía el SDK de observabilidad de terceros (muchos capturan todo por defecto).

---

## 🏷️ Versionado de prompts

Un prompt es **código**: cambia el comportamiento del sistema y debe versionarse, revisarse y poder revertirse.

```
prompts/
  support-agent/
    v13.md
    v14.md        ← activo en producción (80%)
    v15.md        ← en canary (20%)
  evals/
    support-agent.dataset.jsonl
```

```typescript
// Registro de prompts: ID + versión viajan en cada trace
interface PromptVersion { id: string; version: string; template: string; model: string; }

const prompt = await promptRegistry.get('support-agent', { label: 'production' });
const system = render(prompt.template, { companyName });
// meta.promptVersion = `${prompt.id}@${prompt.version}`
```

Opciones:
- **En el repo** (Git): revisión por PR, despliegue con el código. Simple y auditable.
- **En un registro** (Langfuse, LangSmith, PromptLayer, propio): cambiar sin deploy, labels (`production`, `staging`), A/B. Requiere caché local y fallback si el registro cae.

Flujo sano: cambio de prompt → **evals offline** contra dataset → canary → comparar métricas (calidad, costo, latencia) → promover o revertir.

---

## 🧰 Herramientas

| Herramienta | Tipo | Fuerte en |
|-------------|------|-----------|
| **Langfuse** | Open source (self-host o cloud) | Tracing, prompts versionados, evals, costos; compatible con OTel |
| **LangSmith** | SaaS (LangChain) | Tracing, datasets, evals; muy integrado con LangChain/LangGraph |
| **Arize Phoenix** | Open source | Tracing OTel (OpenInference), evals, análisis de RAG |
| **Helicone** | Proxy/gateway | Logging con cambio mínimo (base URL), caché, costos |
| **Datadog / New Relic / Grafana** | APM general | LLM observability sobre la infraestructura que ya tienes |
| **OpenTelemetry + backend propio** | Estándar | Sin lock-in; más trabajo |

Criterios: self-hosting por soberanía de datos, compatibilidad OTel, costo por volumen de trazas, soporte de evals y control de PII.

---

## 🔴 Problemas típicos

- Factura del proveedor sube y no sabes qué feature/tenant la causó → falta atribución de costo.
- Calidad cae tras cambiar de modelo o prompt y te enteras por quejas → faltan evals y canary.
- Respuestas cortadas → no se monitorea `stop_reason = max_tokens`.
- Trazas sin `prompt_version` → imposible correlacionar regresiones.
- Logs con PII de clientes replicados en 5 sistemas.

---

## ✅ Buenas prácticas

✅ Un trace por request con spans por retrieval, LLM, tools y guardrails
✅ Atributos: modelo, prompt_version, tenant, feature, tokens (incl. caché), costo estimado
✅ Dashboards: p50/p95 de TTFT y latencia, tokens/costo por tenant/día, tasa de error por proveedor, cache hit rate
✅ Alertas: costo diario sobre presupuesto, spike de 429/5xx, caída de feedback positivo
✅ Contenido redactado, muestreado, con retención y ACL
✅ Prompts versionados + evals offline + canary
✅ Feedback de usuario enlazado al traceId

---

## 📊 Números de referencia (aproximados)

| Concepto | Orden de magnitud |
|----------|-------------------|
| Overhead de tracing asíncrono | ~ms, despreciable frente a la llamada LLM |
| Tamaño de una traza con contenido | KB a cientos de KB (prompts RAG largos) |
| Muestreo de evals online con LLM-as-judge | ~1–10% del tráfico |
| Retención típica de contenido | días a pocas semanas, según política |

---

## 🎤 Preguntas de entrevista

**1. ¿Qué métricas pondrías en el dashboard de un servicio LLM?**
TTFT y latencia p50/p95, tokens in/out y cache hit rate, costo por tenant/feature/día, tasa de errores/429/timeouts por proveedor, activación de fallback, `stop_reason`, feedback de usuario y scores de evals online.

**2. ¿Cómo loguearías prompts sin violar privacidad?**
Metadatos siempre; contenido solo si la política del tenant lo permite, redactado, muestreado, en un almacén con ACL, auditoría y retención limitada. Revisar qué captura el SDK de observabilidad.

**3. ¿Cómo detectas que un cambio de prompt empeoró el sistema?**
Versionado del prompt en cada trace, evals offline antes del deploy, canary con comparación de métricas de calidad (judge, feedback), costo y latencia, y rollback rápido.

**4. ¿Por qué OpenTelemetry y no solo la herramienta X?**
Estándar vendor-neutral con semantic conventions GenAI; correlaciona la llamada LLM con el resto del trace (HTTP, DB, colas) y permite cambiar de backend sin reinstrumentar.

**5. La factura del LLM se triplicó. ¿Cómo investigas?**
Costo por feature/tenant/modelo en el tiempo; buscar cambios de deploy (prompt más largo, caché rota, modelo más caro), agentes con más pasos, loops de retry, abuso de un tenant. Luego alertas de presupuesto y límites por tenant.

**6. ¿Prompts en Git o en un registro?**
Git da revisión y trazabilidad junto al código; un registro permite cambiar sin deploy y A/B. En ambos casos: versión inmutable, evals antes de promover y la versión registrada en cada trace.

---

## 🔗 Relacionado

- [18-cost-optimization](./18-cost-optimization.md)
- [19-latency](./19-latency.md)
- [23-evaluacion-de-respuestas](./23-evaluacion-de-respuestas.md)
- [25-seguridad-de-datos](./25-seguridad-de-datos.md)
- [29-agentes-y-agentic-loops](./29-agentes-y-agentic-loops.md)
- [34-arquitectura-llm-en-produccion](./34-arquitectura-llm-en-produccion.md)
