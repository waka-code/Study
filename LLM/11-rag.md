# RAG (Retrieval-Augmented Generation)

**RAG** es un patrón donde, antes de llamar al LLM, **recuperas información relevante** de una fuente externa (documentos, base de datos, API) y la **inyectas en el prompt** para que el modelo responda basándose en ella y no solo en lo que aprendió en su entrenamiento.

El modelo pasa de "recordar" a **leer y sintetizar**. Es la forma estándar de dar a un LLM conocimiento privado, actualizado y citable sin fine-tuning.

**Por qué importa en producción:**
- El modelo no conoce tus datos internos ni lo ocurrido después de su fecha de corte.
- Reduce alucinaciones al anclar la respuesta en fuentes (grounding) y permite **citas verificables**.
- Actualizar conocimiento = re-indexar un documento, no re-entrenar un modelo.
- La mayoría de los fallos de un sistema RAG son **fallos de recuperación**, no del LLM.

---

## 🧠 Cómo funciona

### Pipeline de ingesta (offline / async)

```
 Fuentes           Parseo          Chunking        Embedding        Índice
┌────────┐     ┌───────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ PDF    │     │ extraer   │    │ dividir  │    │ vectorizar│    │ vector DB│
│ HTML   │ ──► │ texto,    │ ─► │ + overlap│ ─► │ cada chunk│ ─► │ + BM25   │
│ Notion │     │ tablas,   │    │ + meta   │    │ (batch)   │    │ + meta   │
│ DB     │     │ limpiar   │    │          │    │           │    │          │
└────────┘     └───────────┘    └──────────┘    └───────────┘    └──────────┘
     ▲                                                                 │
     └──────── re-ingesta por cambios (webhooks / CDC / cron) ◄────────┘
```

### Pipeline de consulta (online)

```
Usuario ─► [1] Query rewriting (opcional: resolver "¿y eso?" con el historial)
        ─► [2] Retrieval: híbrido (vector + BM25) con filtros (tenant, ACL)   top 50
        ─► [3] Reranking con cross-encoder                                    top 5-8
        ─► [4] Construcción del prompt: instrucciones + contexto + pregunta
        ─► [5] LLM genera con citas
        ─► [6] Post-proceso: validar citas, guardrails, logging para evals
```

---

## 💻 Implementación (TypeScript)

### Ingesta

```typescript
import OpenAI from 'openai';
import { Pool } from 'pg';

const openai = new OpenAI();
const pool = new Pool();

interface Chunk { docId: string; index: number; text: string; metadata: Record<string, unknown> }

export async function ingestDocument(tenantId: string, chunks: Chunk[]) {
  // Embeddings en batch (1 request por lote, no 1 por chunk)
  const BATCH = 128;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const { data } = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      dimensions: 1024,
      input: batch.map((c) => c.text),
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [j, c] of batch.entries()) {
        await client.query(
          `INSERT INTO chunks (tenant_id, doc_id, chunk_index, content, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)
           ON CONFLICT (doc_id, chunk_index)
           DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata,
                         embedding = EXCLUDED.embedding`,
          [tenantId, c.docId, c.index, c.text, c.metadata, `[${data[j].embedding.join(',')}]`],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
```

### Consulta con citas

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface Retrieved { id: string; title: string; content: string }

export async function answer(question: string, docs: Retrieved[]) {
  const context = docs
    .map((d, i) => `<source id="${i + 1}" title="${d.title}">\n${d.content}\n</source>`)
    .join('\n');

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system:
      'Responde SOLO con la información de <sources>. ' +
      'Cita cada afirmación con [n] usando el id de la fuente. ' +
      'Si las fuentes no contienen la respuesta, di "No encuentro esa información en la documentación".',
    messages: [
      {
        role: 'user',
        content: `<sources>\n${context}\n</sources>\n\nPregunta: ${question}`,
      },
    ],
  });

  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  // Validar que las citas existan
  const cited = [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const invalid = cited.filter((n) => n < 1 || n > docs.length);
  return { text, sources: [...new Set(cited)].map((n) => docs[n - 1]).filter(Boolean), invalid };
}
```

> Varios proveedores ofrecen **citas nativas** (p. ej. bloques `document` con `citations: { enabled: true }` en la API de Anthropic), que devuelven el fragmento exacto citado. Son más fiables que parsear `[n]` a mano.

---

## 🔴 Cuándo falla RAG

| Síntoma | Causa probable | Arreglo |
|---|---|---|
| "No encuentro la información" pero sí está | Recuperación: chunking malo, query ≠ vocabulario del doc | Híbrida BM25, query rewriting, mejor chunking |
| Respuesta con datos de otro producto/versión | Falta filtro de metadata | Filtros por versión, producto, fecha |
| Responde bien a medias | La respuesta está repartida en varios chunks | Chunks más grandes, parent-document retrieval, más top-k |
| Inventa aunque haya contexto | Contexto ruidoso o instrucciones débiles | Reranking, menos chunks, instrucción de "no sé" |
| Preguntas agregadas fallan ("¿cuántos clientes en Chile?") | RAG no sirve para agregaciones | Text-to-SQL / tool calling |
| Pregunta multi-hop ("el jefe del autor de X") | Una sola recuperación no basta | RAG iterativo / agéntico |
| Info desactualizada | Ingesta sin re-sync | CDC, webhooks, TTL, borrar chunks huérfanos |
| Tablas y PDFs escaneados | Parseo pobre | OCR / parsers de layout, tablas a markdown |
| Lost in the middle | Chunk clave en el centro de un contexto largo | Reranking, relevantes al inicio/final |

```
❌ "Metemos 50 chunks, el modelo ya elegirá"
   → más costo, más latencia, más ruido y más alucinación

✅ Recuperar 50 → rerank → pasar 5-8 de alta relevancia, ordenados
```

---

## ✅ Buenas prácticas

✅ Evalúa **retrieval y generación por separado**: recall@k / MRR para recuperación; faithfulness y relevancia para la respuesta
✅ Arma un **golden set** de 50–200 preguntas reales con su documento esperado antes de optimizar
✅ Búsqueda híbrida + reranking como baseline serio
✅ Filtros de ACL en la recuperación (el LLM nunca debe ver lo que el usuario no puede ver)
✅ Delimita el contexto con etiquetas (`<source>`) y trátalo como **datos no confiables** (prompt injection indirecta)
✅ Loguea query, chunks recuperados, scores y respuesta para debuggear
✅ Da al modelo permiso explícito para decir "no sé"
✅ Considera **prompt caching** si el contexto base se repite

---

## ⚖️ Trade-offs

| Decisión | Gana | Pierde |
|---|---|---|
| Más chunks en contexto | Recall | Costo, latencia, ruido, lost in the middle |
| Reranking | Precisión | +50–300 ms, costo extra |
| Query rewriting con LLM | Recall en conversaciones | +1 llamada LLM (usa modelo pequeño) |
| RAG agéntico (el modelo decide buscar) | Multi-hop, flexibilidad | Latencia y costo impredecibles |
| Contexto largo sin RAG ("mete todo") | Simplicidad para corpus pequeños | Costo por request, no escala |

---

## 📊 Números de referencia (aproximados)

- Latencia típica: embedding query 20–100 ms · retrieval 10–50 ms · rerank 50–300 ms · LLM TTFT 300–1500 ms.
- Contexto típico: 5–10 chunks de 300–800 tokens → 2k–8k tokens de contexto.
- Un buen retrieval híbrido + rerank suele alcanzar recall@10 de 85–95% en dominios bien indexados.

---

## 🎤 Preguntas de entrevista

**1. ¿RAG o fine-tuning para conocimiento de la empresa?**
RAG: los datos cambian, necesitas citas y control de acceso por usuario. Fine-tuning sirve para estilo, formato o tareas específicas, no para inyectar hechos actualizables.

**2. Un usuario dice que el bot "no sabe" algo que está en la documentación. ¿Cómo lo depuras?**
Primero miro si el chunk correcto fue recuperado (logs de retrieval). Si no: chunking, vocabulario (añadir BM25), filtros, query rewriting. Si sí fue recuperado pero no usado: posición en el contexto, ruido, reranking, instrucciones.

**3. ¿Cómo evalúas un sistema RAG?**
Golden set con preguntas y documentos esperados. Retrieval: recall@k, MRR. Generación: faithfulness (¿todo está soportado por el contexto?), answer relevance, exactitud de citas. LLM-as-judge calibrado con revisión humana, corrido en CI ante cada cambio.

**4. ¿Cómo manejas permisos?**
Metadata de ACL por chunk (tenant, grupos) y filtro obligatorio en la query al vector store, derivado del usuario autenticado, no del prompt. Sincronizar cambios de permisos en la ingesta.

**5. ¿Qué haces con preguntas tipo "cuántos pedidos hubo en marzo"?**
No es un caso RAG. Router/tool calling hacia text-to-SQL o una API con permisos. RAG recupera texto; no agrega.

**6. ¿Cómo mantienes el índice actualizado?**
Ingesta event-driven (webhooks/CDC) con upserts idempotentes por `(doc_id, chunk_index)`, borrado de chunks huérfanos cuando un doc se acorta o elimina, y hash del contenido para no re-embeber lo que no cambió.

**7. ¿Qué riesgo de seguridad introduce RAG?**
Prompt injection indirecta: un documento indexado puede contener instrucciones. Mitigar delimitando el contexto, instruyendo al modelo a tratarlo como datos, limitando las herramientas disponibles y validando la salida.

---

## 🔗 Relacionado

- [09 - Embeddings](./09-embeddings.md)
- [10 - Vector Databases](./10-vector-databases.md)
- [12 - Chunking](./12-chunking.md)
- [13 - Semantic Search](./13-semantic-search.md)
- [14 - Reranking](./14-reranking.md)
- [15 - Hallucinations](./15-hallucinations.md)
- [23 - Evaluación de respuestas](./23-evaluacion-de-respuestas.md)
- [24 - Prompt Injection](./24-prompt-injection.md)
- [28 - Fine-tuning vs RAG vs Prompting](./28-fine-tuning-vs-rag-vs-prompting.md)
