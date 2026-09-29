# Embeddings

Un **embedding** es un **vector de números reales** (ej. 1.024 dimensiones) que representa el **significado** de un texto (o imagen, código, audio). Textos con significado similar producen vectores cercanos en ese espacio, aunque no compartan palabras: "no puedo iniciar sesión" y "el login me falla" quedan próximos.

Los embeddings los producen **modelos especializados** (distintos de los LLM de chat), son baratos y rápidos, y son la base de **búsqueda semántica, RAG, clustering, deduplicación, recomendaciones y clasificación**. En backend, se generan al indexar (batch) y al consultar (por request), y se guardan en una base vectorial o en Postgres con `pgvector`.

**Por qué importa en producción:**
- La calidad del retrieval en RAG depende más del **embedding + chunking** que del LLM.
- **Cambiar de modelo de embeddings obliga a re-indexar todo**: los vectores de modelos distintos no son comparables.
- Dimensiones y volumen definen **costo de almacenamiento, memoria y latencia** de búsqueda.

---

## 🧭 Cómo funciona

```
"el login me falla"      ──► [ modelo de embeddings ] ──► [0.12, -0.03, 0.88, ..., 0.07]  (d dims)
"no puedo iniciar sesión" ──►                          ──► [0.10, -0.01, 0.85, ..., 0.09]
"receta de empanadas"    ──►                          ──► [-0.54, 0.33, 0.02, ..., -0.41]

Espacio vectorial (proyección 2D):

      ▲
      │   • login me falla
      │  • no puedo iniciar sesión
      │
      │                         • receta de empanadas
      └──────────────────────────────►
```

Pipeline típico:

```
Indexación (offline/batch)                   Consulta (online)
docs ─► chunking ─► embed ─► vector DB       query ─► embed ─► kNN ─► top-k chunks
                              (+ metadata)                      (coseno)
```

---

## 📐 Similitud coseno

Mide el **ángulo** entre dos vectores, ignorando su magnitud:

```
                    A · B            Σ aᵢ·bᵢ
cos(θ) = ─────────────────── = ─────────────────────
              ‖A‖ · ‖B‖         √Σaᵢ² · √Σbᵢ²

 1   → misma dirección (muy similar)
 0   → ortogonales (sin relación)
-1   → opuestos (raro en embeddings de texto)
```

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Dimensiones distintas");
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### Normalización

Si normalizas los vectores a **norma 1** (`‖v‖ = 1`), entonces:

```
cos(A, B) = A · B            (producto punto)
‖A − B‖²  = 2 − 2·cos(A, B)  (distancia euclidiana equivalente en ranking)
```

```typescript
function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / norm);
}
```

- Muchos proveedores **ya devuelven vectores normalizados** → producto punto = coseno (más rápido).
- Si no estás seguro, **normaliza al indexar y al consultar** y usa producto punto (`inner product`).
- Coseno, producto punto normalizado y L2 normalizada dan **el mismo ranking**.

---

## 💻 Generar embeddings en Node

Anthropic no ofrece un endpoint de embeddings propio (recomienda proveedores como Voyage AI). Ejemplo con el SDK de OpenAI:

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

// ✅ Batch: muchos textos en una sola llamada
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    dimensions: 512, // opcional: reducir dimensiones (modelos con Matryoshka)
  });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
```

Guardar y buscar con Postgres + pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  doc_id      text NOT NULL,
  content     text NOT NULL,
  embedding   vector(512) NOT NULL,
  model       text NOT NULL            -- qué modelo generó el vector
);

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
```

```typescript
async function search(query: string, topK = 8) {
  const [q] = await embedBatch([query]);
  const { rows } = await pool.query(
    `SELECT id, content, 1 - (embedding <=> $1::vector) AS score
       FROM chunks
      WHERE model = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3`,
    [JSON.stringify(q), "text-embedding-3-small@512", topK],
  );
  return rows; // <=> es distancia coseno en pgvector
}
```

---

## 🔴 Problemas comunes

```typescript
// ❌ Mezclar modelos: indexar con A y consultar con B
const docVec = await embedWithModelA(doc);
const queryVec = await embedWithModelB(query); // espacios distintos → similitud sin sentido

// ❌ Un request por texto al indexar 1M de chunks
for (const c of chunks) await embed([c]); // lento, rate limits

// ✅ Lotes + concurrencia controlada + reintentos
for (const batch of chunkArray(chunks, 128)) await limiter.schedule(() => embedBatch(batch));
```

- **Embeber documentos enteros**: un vector para 50 páginas promedia todo y pierde detalle → chunking.
- **Asimetría query/documento**: algunos modelos requieren indicar `input_type` ("query" vs "document") o prefijos; ignorarlo degrada el recall.
- **Umbrales fijos de similitud** copiados de otro modelo: la escala de scores varía por modelo; calibra con tus datos.
- **Olvidar el texto original**: guarda contenido + metadata (doc, página, permisos) junto al vector.
- **No filtrar por permisos**: la búsqueda semántica puede devolver chunks de otro tenant.
- Embeddings **no entienden negaciones ni números exactos** bien ("con IVA" vs "sin IVA", "SKU-1234"): combina con búsqueda léxica (híbrida).

---

## ✅ Buenas prácticas

- **Versiona el modelo** (nombre + dimensiones) junto a cada vector; planifica re-indexación.
- **Normaliza** y usa la métrica que el modelo recomienda (coseno casi siempre).
- **Batch** al indexar, con límite de concurrencia y retries con backoff.
- **Mismo preprocesamiento** en indexación y consulta (limpieza, prefijos, `input_type`).
- **Búsqueda híbrida** (BM25 + vectores) y **reranking** para mejorar precisión.
- **Filtra por metadata** (tenant, permisos, fecha) en la misma query.
- **Evalúa el retrieval** (recall@k, MRR) con un set de consultas reales antes de elegir modelo.
- Cachea embeddings de queries frecuentes.

---

## ⚖️ Trade-offs

| Decisión | Pros | Contras |
|---|---|---|
| Más dimensiones (1.536–3.072) | Mejor matiz semántico | Más storage, RAM e índice más lento |
| Menos dimensiones (256–512) | Barato y rápido | Algo menos de calidad |
| Modelo hospedado (API) | Cero infra, alta calidad | Costo por token, dependencia, datos salen de tu red |
| Modelo open-source local | Privacidad, sin costo por token | Infra GPU/CPU, mantenimiento |
| Modelo multilingüe | Un índice para español/inglés | A veces menos preciso que uno monolingüe |
| float32 vs cuantizado (int8/binario) | Precisión | Cuantizar reduce memoria 4–32× con poca pérdida |

---

## 📊 Números de referencia (aproximados)

| Referencia | Valor aprox. |
|---|---|
| Dimensiones típicas | 256 – 3.072 (comunes: 768, 1.024, 1.536) |
| Tamaño por vector (float32) | dims × 4 bytes → 1.536 dims ≈ 6 KB |
| 1M vectores × 1.536 dims | ≈ 6 GB (sin contar índice) |
| Precio embeddings vía API | ~$0,02–$0,20 por millón de tokens |
| Latencia de embed de una query | ~20–200 ms |
| Máx. tokens de entrada por texto | ~512 – 32k según modelo |
| Similitud coseno "relevante" | depende del modelo; calibrar (no hay umbral universal) |

---

## 🎤 Preguntas de entrevista

**1. ¿Qué es un embedding y para qué lo usas?**
Una representación vectorial densa del significado de un contenido. Textos semánticamente similares quedan cerca. Lo uso para búsqueda semántica, RAG, deduplicación, clustering, recomendaciones y clasificación.

**2. ¿Por qué similitud coseno y no distancia euclidiana?**
El coseno mide dirección e ignora magnitud, que en texto suele reflejar longitud y no significado. Si los vectores están normalizados, coseno, producto punto y L2 producen el mismo ranking; se usa producto punto por eficiencia.

**3. ¿Qué pasa si cambias de modelo de embeddings?**
Los vectores dejan de ser comparables: hay que re-embeber todo el corpus. Por eso versiono modelo y dimensiones por vector, y hago la migración con doble índice (escritura dual, backfill, cambio de lectura).

**4. ¿Cómo eliges las dimensiones?**
Balanceando calidad de retrieval (medida con recall@k en mis datos) contra costo de storage y latencia. Modelos con representaciones tipo Matryoshka permiten truncar dimensiones con poca pérdida.

**5. ¿Por qué la búsqueda semántica falla con códigos o números?**
Porque los embeddings capturan significado general, no coincidencias exactas de tokens como SKUs o IDs. Se resuelve con búsqueda híbrida (léxica + vectorial) y filtros por metadata.

**6. ¿Cómo indexas 10M de documentos eficientemente?**
Chunking, embeddings en lotes con concurrencia limitada y reintentos idempotentes (cola de jobs), guardando vector + texto + metadata + versión de modelo; índice ANN (HNSW/IVF) y, si hace falta, cuantización para reducir memoria.

**7. ¿Qué es la asimetría query/documento?**
Las consultas son cortas y los documentos largos; algunos modelos se entrenan con prefijos o `input_type` distintos para cada caso. Usar el mismo modo para ambos reduce la calidad del retrieval.

---

## 🔗 Relacionado

- [02 - Tokens](./02-tokens.md)
- [10 - Vector databases](./10-vector-databases.md)
- [11 - RAG](./11-rag.md)
- [12 - Chunking](./12-chunking.md)
- [13 - Semantic search](./13-semantic-search.md)
- [14 - Reranking](./14-reranking.md)
- [33 - Multimodalidad](./33-multimodalidad.md)
