# Reranking

**Reranking** es un segundo paso de recuperación: tomas los top-N candidatos de una búsqueda rápida (vectorial, BM25 o híbrida) y los **reordenas con un modelo más preciso y más caro** que evalúa cada par *(query, documento)* en conjunto. Te quedas con los top-k finales que van al LLM.

Es el patrón clásico de **retrieve & rerank**: el primer paso optimiza **recall** (no perder el relevante), el segundo optimiza **precisión** (ponerlo arriba).

**Por qué importa en producción:**
- Suele ser la mejora de calidad más barata de implementar en un RAG existente.
- Permite pasar **menos chunks** al LLM (menos tokens, menos costo, menos "lost in the middle").
- Da scores más **calibrados** para decidir "no hay nada relevante".

---

## 🧠 Bi-encoder vs Cross-encoder

```
BI-ENCODER (embeddings)                 CROSS-ENCODER (reranker)
────────────────────────                ────────────────────────
 query ──► [encoder] ──► vq              [CLS] query [SEP] documento
 doc   ──► [encoder] ──► vd                        │
                                             [encoder completo]
 score = cos(vq, vd)                     atención cruzada token a token
                                                   │
                                              score de relevancia
✅ Docs pre-computados offline           ✅ Mucho más preciso
✅ Búsqueda en ms sobre millones         ❌ No se puede pre-computar
❌ Query y doc no "se miran"             ❌ 1 inferencia por par → solo sobre N pequeño
```

| | Bi-encoder | Cross-encoder |
|---|---|---|
| Input | Query y doc por separado | Par (query, doc) junto |
| Pre-cómputo | Sí (índice) | No |
| Costo por query | 1 embedding + ANN | N inferencias |
| Precisión | Buena | Superior |
| Uso | Retrieval sobre todo el corpus | Rerank de 20–200 candidatos |

Intuición: el bi-encoder comprime el documento en un vector **antes** de saber la pregunta. El cross-encoder lee la pregunta y el documento juntos y puede notar que "no aplica a electrónica" invalida el documento.

Opciones intermedias: **late interaction** (ColBERT) guarda un vector por token y compara con max-sim; más preciso que bi-encoder, más barato que cross-encoder, pero con índices mucho más grandes.

---

## 🔁 Pipeline y top-k antes/después

```
Corpus (1M chunks)
      │  híbrida (BM25 + vector)          ~20-50 ms
      ▼
Top N = 50-100 candidatos     ◄── optimizar RECALL: que el relevante esté aquí
      │  cross-encoder                    ~50-300 ms
      ▼
Top k = 3-8                   ◄── optimizar PRECISIÓN: que esté arriba
      │  (+ umbral de score opcional)
      ▼
Prompt del LLM
```

- **N (antes)**: si es muy bajo, el reranker no puede rescatar lo que no llegó. Si es muy alto, sube latencia y costo linealmente. Típico 30–100.
- **k (después)**: lo que cabe útilmente en el contexto. Típico 3–10. Más chunks = más ruido.

---

## 💻 Implementación (TypeScript)

Rerankers gestionados (Cohere Rerank, Voyage rerank, Jina) o self-hosted (bge-reranker, mxbai-rerank) exponen una forma similar: query + lista de documentos → índices con score.

```typescript
interface Candidate { id: string; content: string; metadata: Record<string, unknown> }
interface Reranked extends Candidate { score: number }

// Cliente genérico hacia un endpoint de rerank (gestionado o self-hosted)
async function callReranker(query: string, documents: string[], topN: number) {
  const res = await fetch(process.env.RERANK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RERANK_API_KEY}`,
    },
    body: JSON.stringify({ model: process.env.RERANK_MODEL, query, documents, top_n: topN }),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`rerank ${res.status}`);
  const body = (await res.json()) as { results: { index: number; relevance_score: number }[] };
  return body.results;
}

export async function rerank(
  query: string,
  candidates: Candidate[],
  { topK = 6, minScore = 0.2 } = {},
): Promise<Reranked[]> {
  if (candidates.length === 0) return [];
  try {
    const results = await callReranker(query, candidates.map((c) => c.content), topK);
    return results
      .filter((r) => r.relevance_score >= minScore)
      .map((r) => ({ ...candidates[r.index], score: r.relevance_score }));
  } catch (err) {
    // Degradación: si el reranker cae, seguir con el orden del retrieval
    console.warn('reranker failed, falling back to retrieval order', err);
    return candidates.slice(0, topK).map((c) => ({ ...c, score: NaN }));
  }
}
```

### LLM como reranker

Un LLM pequeño puede puntuar relevancia (listwise o pointwise). Más flexible (entiende instrucciones: "prioriza docs de 2024"), pero más lento y caro que un cross-encoder dedicado.

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();

export async function llmRerank(query: string, docs: Candidate[], topK = 5): Promise<Candidate[]> {
  const list = docs.map((d, i) => `<doc id="${i}">${d.content.slice(0, 1500)}</doc>`).join('\n');
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system:
      'Ordena los documentos por relevancia para responder la consulta. ' +
      'Devuelve SOLO un array JSON con los ids más relevantes, máximo ' + topK + '. ' +
      'Excluye los irrelevantes.',
    messages: [{ role: 'user', content: `Consulta: ${query}\n\n${list}` }],
  });
  const text = res.content[0]?.type === 'text' ? res.content[0].text : '[]';
  const ids = JSON.parse(text.match(/\[[\d,\s]*\]/)?.[0] ?? '[]') as number[];
  return ids.filter((i) => i >= 0 && i < docs.length).map((i) => docs[i]);
}
```

> En producción, usa **structured output** en vez de parsear con regex.

---

## 🔴 Problemas comunes

- ❌ N demasiado pequeño (top 5 → rerank → top 5): el reranker solo reordena, no rescata.
- ❌ Pasar chunks más largos que el límite del reranker (típico 512 tokens por par): se truncan en silencio y el final del chunk no cuenta.
- ❌ Reranker en el camino crítico sin timeout ni fallback.
- ❌ Reranker entrenado en inglés sobre corpus en español: usa modelos multilingües.
- ❌ Umbral de score copiado de otro modelo: los scores no son comparables entre rerankers.
- ❌ Reordenar pero luego volver a ordenar por fecha u otra cosa y perder el beneficio.

---

## ✅ Buenas prácticas

✅ Retrieval amplio (N=50–100) + rerank a k=3–8
✅ Timeout corto y fallback al orden de retrieval
✅ Usar el score del reranker para decidir "no hay contexto suficiente" → respuesta "no sé"
✅ Colocar los mejores chunks al **inicio** (y/o final) del contexto
✅ Medir nDCG@k / MRR antes y después del reranker en el golden set
✅ Cachear resultados de rerank para queries frecuentes

---

## ⚖️ Trade-offs

| Decisión | Gana | Pierde |
|---|---|---|
| Añadir reranker | Precisión, menos tokens al LLM | +50–300 ms, costo por request |
| N mayor | Recall final | Latencia lineal |
| Cross-encoder vs LLM reranker | Velocidad y costo | Flexibilidad de instrucciones |
| Gestionado vs self-hosted | Cero ops | Datos salen de tu red, costo por llamada |
| ColBERT | Precisión con buena latencia | Índice 10×+ más grande |

---

## 📊 Números de referencia (aproximados)

- Cross-encoder base sobre 50 pares: **~50–150 ms en GPU**, varios cientos de ms en CPU.
- API gestionada de rerank: ~100–400 ms para 50–100 docs.
- Mejora típica de nDCG@10 al añadir reranker: **+5 a +15 puntos** según dominio.
- Reducir de 20 a 6 chunks en el prompt puede ahorrar ~50–70% de tokens de input.

---

## 🎤 Preguntas de entrevista

**1. ¿Por qué no usar el cross-encoder directamente sobre todo el corpus?**
No se puede pre-computar: requiere una inferencia por par (query, doc). Sobre millones de docs sería inviable. Por eso se usa solo sobre los N candidatos del retrieval.

**2. Diferencia entre bi-encoder y cross-encoder.**
El bi-encoder codifica query y doc por separado y compara vectores: rápido e indexable. El cross-encoder procesa el par junto con atención cruzada: mucho más preciso, pero caro y no indexable.

**3. ¿Cómo eliges N y k?**
N según el recall@N del retrieval (subo N hasta que el relevante casi siempre esté) y el presupuesto de latencia. k según cuánto contexto útil admite el LLM sin ruido; lo valido con evals de la respuesta final.

**4. El reranker añade 300 ms. ¿Cómo lo justificas o lo reduces?**
Lo justifico con métricas (nDCG, faithfulness). Para reducirlo: menor N, modelo más pequeño, GPU, truncar docs, paralelizar batches, cachear por query, o ejecutar el rerank mientras se reescribe la query.

**5. ¿Un reranker reduce alucinaciones?**
Indirectamente: menos contexto irrelevante y el relevante en posiciones prominentes. Además su score permite detectar que no hay contexto suficiente y responder "no sé".

**6. ¿Qué pasa si el reranker falla en producción?**
Timeout y fallback al orden del retrieval, con métrica y alerta. La calidad baja un poco, pero el servicio sigue disponible.

---

## 🔗 Relacionado

- [09 - Embeddings](./09-embeddings.md)
- [11 - RAG](./11-rag.md)
- [13 - Semantic Search](./13-semantic-search.md)
- [15 - Hallucinations](./15-hallucinations.md)
- [16 - Context Management](./16-context-management.md)
- [19 - Latency](./19-latency.md)
- [23 - Evaluación de respuestas](./23-evaluacion-de-respuestas.md)
