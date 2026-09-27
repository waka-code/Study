# 🤖 AI / LLM — Guía para entrevistas

Apuntes para explicar LLMs con criterio de backend senior: qué son, cómo se integran en un sistema real y qué puede salir mal en producción.

---

## 📚 Índice

### 🧠 Fundamentos
- [01 · Qué es un LLM](01-que-es-un-llm.md)
- [02 · Tokens](02-tokens.md)
- [03 · Context window](03-context-window.md)
- [04 · Temperature y sampling](04-temperature-y-sampling.md)
- [26 · Transformers y atención](26-transformers-y-atencion.md)

### ✍️ Prompting e interacción con el modelo
- [05 · Prompt engineering](05-prompt-engineering.md)
- [06 · System / user prompts](06-system-user-prompts.md)
- [07 · Structured output](07-structured-output.md)
- [08 · Function / tool calling](08-function-tool-calling.md)
- [16 · Context management](16-context-management.md)
- [33 · Multimodalidad](33-multimodalidad.md)

### 🔎 RAG y búsqueda
- [09 · Embeddings](09-embeddings.md)
- [10 · Vector databases](10-vector-databases.md)
- [11 · RAG](11-rag.md)
- [12 · Chunking](12-chunking.md)
- [13 · Semantic search (y búsqueda híbrida)](13-semantic-search.md)
- [14 · Reranking](14-reranking.md)
- [15 · Hallucinations](15-hallucinations.md)
- [28 · Fine-tuning vs RAG vs prompting](28-fine-tuning-vs-rag-vs-prompting.md)

### ⚙️ Producción
- [17 · Streaming](17-streaming.md)
- [18 · Cost optimization](18-cost-optimization.md)
- [19 · Latency](19-latency.md)
- [20 · Rate limits](20-rate-limits.md)
- [21 · Retries](21-retries.md)
- [27 · Prompt caching](27-prompt-caching.md)
- [31 · Observabilidad y LLMOps](31-observabilidad-llmops.md)
- [32 · Selección de modelos](32-seleccion-de-modelos.md)

### 🛡️ Calidad y seguridad
- [22 · Guardrails](22-guardrails.md)
- [23 · Evaluación de respuestas](23-evaluacion-de-respuestas.md)
- [24 · Prompt injection](24-prompt-injection.md)
- [25 · Seguridad de datos](25-seguridad-de-datos.md)

### 🚀 Avanzado
- [29 · Agentes y agentic loops](29-agentes-y-agentic-loops.md)
- [30 · MCP (Model Context Protocol)](30-mcp-model-context-protocol.md)
- [34 · Arquitectura LLM en producción (system design)](34-arquitectura-llm-en-produccion.md)

---

## 🗺️ Ruta de estudio sugerida

1. **Base (día 1):** 01 → 02 → 03 → 04 → 26. Sin esto no puedes justificar costos ni límites.
2. **Hablarle bien al modelo (día 2):** 05 → 06 → 07 → 08 → 16.
3. **RAG completo (días 3–4):** 09 → 10 → 12 → 13 → 14 → 11 → 15 → 28.
4. **Producción (día 5):** 17 → 19 → 18 → 27 → 20 → 21 → 32 → 31.
5. **Calidad y seguridad (día 6):** 22 → 23 → 24 → 25.
6. **Cierre (día 7):** 29 → 30 → 34. Practica en voz alta "diseña un chatbot con RAG sobre documentos internos".

> 💡 Cada archivo termina con **🎤 Preguntas de entrevista**. Repásalas respondiendo sin mirar y después compara.
