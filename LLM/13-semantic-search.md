# Semantic Search

**Semantic search** es buscar por **significado** en lugar de por coincidencia exacta de palabras. La query y los documentos se convierten en embeddings y se recuperan los documentos cuyo vector está más cerca del de la query: "¿cómo cancelo mi plan?" encuentra "Pasos para dar de baja la suscripción" aunque no compartan palabras.

En producción casi nunca se usa sola: la combinación de **búsqueda léxica (BM25) + vectorial** —búsqueda **híbrida**— es el baseline serio, complementada con técnicas de transformación de la query (rewriting, HyDE, multi-query).

**Por qué importa en producción:**
- Es el componente de recuperación de RAG: si no encuentra el documento, el LLM no puede responder bien.
- Los embeddings fallan con **términos exactos**: códigos de producto, SKUs, nombres propios, errores (`ERR_CONN_RESET`), siglas.
- BM25 falla con **sinónimos y paráfrasis**. Cada uno cubre los puntos ciegos del otro.

---

## 🧠 Léxica vs semántica

```
Query: "error ECONNREFUSED al conectar a postgres"

BM25 (léxica)                          Vectorial (semántica)
─────────────                          ─────────────────────
✅ doc con "ECONNREFUSED" literal       ✅ "No se puede establecer conexión con la DB"
❌ "conexión rechazada por la base"     ❌ puede rankear alto un doc genérico de redes
   (no comparte tokens)                    y perder el código exacto
```

| | BM25 | Vectorial (dense) |
|---|---|---|
| Base | Frecuencia de términos (TF-IDF mejorado) | Similitud de embeddings |
| Fuerte en | Palabras exactas, códigos, nombres, siglas | Sinónimos, paráfrasis, multi-idioma |
| Débil en | Vocabulario distinto | Términos raros, negaciones, números |
| Costo | Barato, sin GPU | Embedding por doc y por query |
| Explicable | Sí (qué términos matchean) | Poco |

**BM25** en una línea: puntúa alto si los términos de la query aparecen mucho en el doc (con saturación, parámetro `k1`), son raros en el corpus (IDF) y el doc no es exageradamente largo (normalización, parámetro `b`).

---

## 🔀 Búsqueda híbrida + RRF

Los scores de BM25 (0–∞) y coseno (−1..1) **no son comparables**, así que no se suman directamente. La fusión más robusta es **Reciprocal Rank Fusion (RRF)**: usa solo la **posición** en cada ranking.

```
RRF(d) = Σ  1 / (k + rank_i(d))        k ≈ 60
        i∈rankings

Doc   rank BM25   rank vector   RRF
A        1            5         1/61 + 1/65 = 0.0318
B        3            1         1/63 + 1/61 = 0.0323  ◄ gana
C        2            —         1/62         = 0.0161
D        —            2         1/62         = 0.0161
```

```typescript
export function reciprocalRankFusion<T extends { id: string }>(
  rankings: T[][],
  k = 60,
  weights: number[] = rankings.map(() => 1),
): (T & { rrfScore: number })[] {
  const scores = new Map<string, { item: T; score: number }>();
  rankings.forEach((list, i) => {
    list.forEach((item, rank) => {
      const prev = scores.get(item.id);
      const add = weights[i] / (k + rank + 1); // rank base 1
      scores.set(item.id, { item: prev?.item ?? item, score: (prev?.score ?? 0) + add });
    });
  });
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, rrfScore: score }));
}
```

### Híbrida en Postgres (pgvector + full-text)

```sql
WITH semantic AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
  FROM chunks
  WHERE tenant_id = $2
  ORDER BY embedding <=> $1::vector
  LIMIT 50
),
lexical AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS rank
  FROM chunks, websearch_to_tsquery('spanish', $3) q
  WHERE tenant_id = $2 AND tsv @@ q
  ORDER BY ts_rank_cd(tsv, q) DESC
  LIMIT 50
)
SELECT c.id, c.content,
       COALESCE(1.0 / (60 + s.rank), 0) + COALESCE(1.0 / (60 + l.rank), 0) AS rrf
FROM semantic s
FULL OUTER JOIN lexical l USING (id)
JOIN chunks c USING (id)
ORDER BY rrf DESC
LIMIT 20;

-- columna auxiliar para full-text:
-- ALTER TABLE chunks ADD COLUMN tsv tsvector
--   GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED;
-- CREATE INDEX ON chunks USING gin (tsv);
```

> `ts_rank` de Postgres no es BM25 real. Si la calidad léxica importa mucho, usa OpenSearch/Elastic, o extensiones con BM25 (p. ej. ParadeDB `pg_search`).

---

## ✍️ Transformaciones de la query

### Query rewriting (conversacional)

El usuario escribe "¿y para empresas?" tras preguntar por precios. Embeber eso tal cual no encuentra nada. Se reescribe con el historial a una query autocontenida.

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();

export async function rewriteQuery(history: string, question: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',     // modelo pequeño: es una tarea simple y está en el camino crítico
    max_tokens: 100,
    system:
      'Reescribe la última pregunta del usuario como una consulta de búsqueda autocontenida, ' +
      'resolviendo pronombres con el historial. Devuelve solo la consulta.',
    messages: [{ role: 'user', content: `<historial>\n${history}\n</historial>\n\nPregunta: ${question}` }],
  });
  const block = res.content[0];
  return block.type === 'text' ? block.text.trim() : question;
}
// "¿y para empresas?" → "precios del plan para empresas"
```

### Multi-query

Generar 3–5 variantes de la query, buscar con cada una y fusionar con RRF. Mejora recall en preguntas ambiguas a cambio de más búsquedas.

### HyDE (Hypothetical Document Embeddings)

Las queries son cortas y con forma de pregunta; los documentos son largos y afirmativos. HyDE pide al LLM una **respuesta hipotética** y embebe esa respuesta en vez de la pregunta: se parece más a los documentos reales.

```
Query:     "¿cuánto dura la garantía de un notebook?"
                    │ LLM (sin contexto, puede inventar: no importa)
                    ▼
Hipotético: "Los notebooks tienen una garantía de 12 meses desde la compra,
             que cubre defectos de fábrica..."
                    │ embedding
                    ▼
            buscar vecinos → docs reales de garantía
```

- ✅ Mejora recall en queries cortas o de dominio especializado.
- ❌ +1 llamada al LLM (latencia), y si el modelo desconoce el dominio puede sesgar hacia lo incorrecto. La respuesta hipotética **nunca** se muestra al usuario.

### Otras

- **Step-back**: generar una pregunta más general ("¿qué cubre la garantía?") además de la específica.
- **Descomposición**: dividir preguntas compuestas en sub-queries.
- **Extracción de filtros**: el LLM extrae `{ year: 2024, product: "X" }` de la query y se aplica como filtro de metadata (con structured output).

---

## 🔴 Problemas comunes

- ❌ Solo vectorial con usuarios que buscan por códigos, SKUs o mensajes de error.
- ❌ Sumar scores BM25 + coseno crudos (escalas distintas) → usar RRF o normalizar.
- ❌ Umbral fijo de similitud "0.8 = relevante": los scores varían por modelo y por query.
- ❌ Query rewriting con un modelo grande en el camino crítico → +1 s de latencia.
- ❌ Embeber la query con un modelo distinto al de los documentos, o sin el prefijo requerido (algunos modelos usan `query:` / `passage:` o `input_type`).
- ❌ No manejar idiomas: BM25 necesita el stemmer/analizador correcto (`spanish`).

---

## ✅ Buenas prácticas

✅ Baseline: **híbrida (BM25 + vector) con RRF → reranker**
✅ Recuperar amplio (top 50–100) y dejar la precisión al reranker
✅ Query rewriting solo en conversaciones multi-turno, con modelo pequeño
✅ HyDE / multi-query como experimentos medidos, no por defecto
✅ Mide recall@k y MRR por tipo de query (exacta, conceptual, conversacional)
✅ Loguea queries sin resultados relevantes: son tu backlog de mejoras

---

## ⚖️ Trade-offs

| Técnica | Gana | Pierde |
|---|---|---|
| Híbrida vs solo vector | Robustez con términos exactos | Dos índices, más complejidad |
| RRF vs combinación ponderada | Sin calibrar escalas | Ignora magnitud del score |
| Query rewriting | Recall en conversaciones | +100–500 ms |
| HyDE | Recall en queries cortas | +latencia del LLM, riesgo de sesgo |
| Multi-query | Recall en ambigüedad | N× búsquedas |

---

## 📊 Números de referencia (aproximados)

- Híbrida vs solo densa: mejoras típicas de recall de **5–15 puntos** según corpus (más en dominios técnicos con códigos).
- BM25 sobre millones de docs: < 20–50 ms en un motor dedicado.
- Rewriting con modelo pequeño: ~200–600 ms.
- `k = 60` en RRF es el valor estándar; rara vez hace falta tunearlo.

---

## 🎤 Preguntas de entrevista

**1. ¿Por qué búsqueda híbrida si ya tienes embeddings?**
Los embeddings generalizan significado pero fallan con tokens exactos poco frecuentes (IDs, errores, nombres). BM25 los captura. Fusionarlos cubre ambos modos de búsqueda.

**2. ¿Qué es RRF y por qué se prefiere a sumar scores?**
Fusiona rankings sumando `1/(k + rank)`. No requiere que los scores estén en la misma escala ni calibrarlos, y es robusto a outliers.

**3. ¿Qué es HyDE y cuándo lo usarías?**
Embeber una respuesta hipotética generada por el LLM en vez de la pregunta, porque se parece más a los documentos. Útil en queries cortas o muy distintas en forma a los docs; lo evalúo porque añade latencia y puede sesgar.

**4. El usuario pregunta "¿y cuánto cuesta?" en un chat. ¿Qué haces?**
Query rewriting con el historial para generar una query autocontenida ("precio del plan Pro"), con un modelo pequeño y rápido, y luego la búsqueda híbrida.

**5. ¿Usarías un umbral de similitud para decidir si hay resultados relevantes?**
Con cuidado: los scores absolutos varían entre modelos y queries. Prefiero el score del reranker (mejor calibrado) y validar el umbral empíricamente, o dejar que el LLM diga "no sé" si el contexto no alcanza.

**6. ¿Cómo mides la calidad de la búsqueda?**
Golden set con queries y documentos relevantes. Métricas: recall@k (¿está el relevante en el top-k?), MRR / nDCG (¿en qué posición?). Segmentado por tipo de query.

---

## 🔗 Relacionado

- [09 - Embeddings](./09-embeddings.md)
- [10 - Vector Databases](./10-vector-databases.md)
- [11 - RAG](./11-rag.md)
- [14 - Reranking](./14-reranking.md)
- [16 - Context Management](./16-context-management.md)
- [19 - Latency](./19-latency.md)
