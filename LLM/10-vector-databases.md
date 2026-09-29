# Vector Databases

Una **vector database** almacena vectores (embeddings) junto con su metadata y permite buscar los **k vectores más cercanos** a un vector de consulta según una métrica de distancia (coseno, producto punto, L2). Es la pieza de "recuperación" en RAG, búsqueda semántica, recomendaciones y deduplicación.

No siempre es un producto aparte: puede ser una **extensión** de tu base de datos (pgvector en Postgres), un **servicio gestionado** (Pinecone), un motor dedicado open source (Qdrant, Weaviate, Milvus) o una capacidad de un motor de búsqueda existente (OpenSearch/Elasticsearch k-NN).

**Por qué importa en producción:**
- La búsqueda exacta sobre millones de vectores es O(N·d) por query: inviable a baja latencia.
- Los índices aproximados (ANN) cambian **recall por velocidad**: si no mides recall, puedes estar perdiendo el documento correcto sin saberlo.
- El filtrado por metadata (tenant, permisos, fecha) mal hecho rompe el recall o filtra datos entre clientes.

---

## 🧠 Cómo funciona

```
Ingesta:   texto ──► embedding model ──► [0.12, -0.04, ..., 0.33] (d=1024)
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │ id | vector | metadata | text │
                              └──────────────────────────────┘
                                             │ índice ANN (HNSW / IVF)
Consulta:  query ──► embedding ──► buscar top-k vecinos + filtro ──► resultados
```

### Métricas de distancia

| Métrica | Fórmula (idea) | Cuándo |
|---|---|---|
| Coseno | 1 − cos(a,b) | Default para embeddings de texto |
| Producto punto | −a·b | Si los vectores ya están normalizados (equivale a coseno, más rápido) |
| L2 (euclídea) | ‖a − b‖ | Embeddings de imagen, algunos modelos específicos |

Usa **la métrica con la que se entrenó el modelo** de embeddings. Mezclarla degrada resultados silenciosamente.

### Exacto vs ANN

- **Exacto (brute force / flat)**: compara contra todos. Recall 100%. Bien hasta ~100k vectores o con filtros muy selectivos.
- **ANN (Approximate Nearest Neighbor)**: estructura de índice que explora solo una parte del espacio. Recall típico 90–99%, latencia de ms sobre millones.

### HNSW (Hierarchical Navigable Small World)

```
Capa 2:   A ─────────────── F                 (pocos nodos, saltos largos)
          │                 │
Capa 1:   A ──── C ──── E ── F ──── H         (más nodos)
          │      │      │    │      │
Capa 0:   A─B─C─D─E─F─G─H─I─J─K─L─M─N         (todos los nodos, saltos cortos)

Búsqueda: entra por arriba, baja "acercándose" greedy al query en cada capa.
```

- Parámetros: `M` (vecinos por nodo), `ef_construction` (calidad al construir), `ef_search` (amplitud de búsqueda en query).
- ✅ Excelente recall/latencia, soporta inserts incrementales.
- ❌ Consume mucha RAM (grafo en memoria), build lento, deletes costosos (tombstones).

### IVF (Inverted File Index)

```
1. k-means sobre los vectores → L centroides ("listas")
2. Cada vector se asigna a su centroide más cercano
3. Query: buscar los `probes` centroides más cercanos y recorrer solo esas listas

   Centroide 1: [v3, v9, v14...]
   Centroide 2: [v1, v7, ...]     ◄── query cae cerca de 2 y 5 → probes=2
   Centroide 5: [v2, v8, ...]
```

- Parámetros: `lists` (≈ √N o N/1000), `probes`.
- ✅ Build rápido, menos memoria. Combinable con **PQ** (product quantization) para comprimir.
- ❌ Hay que construirlo con datos representativos; si la distribución cambia, el recall cae (re-entrenar).

---

## 🐘 pgvector (Postgres)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid        NOT NULL,
  doc_id      uuid        NOT NULL,
  content     text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  embedding   vector(1024) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice HNSW con distancia coseno
CREATE INDEX chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice B-tree para el filtro de tenant
CREATE INDEX chunks_tenant_idx ON chunks (tenant_id);

-- Alternativa IVF
-- CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1000);
```

```sql
-- Consulta: top 10 por similitud coseno dentro de un tenant
SET hnsw.ef_search = 100;          -- más alto = más recall, más lento

SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE tenant_id = $2
ORDER BY embedding <=> $1          -- <=> coseno, <-> L2, <#> producto punto negativo
LIMIT 10;
```

```typescript
import { Pool } from 'pg';
import OpenAI from 'openai';

const pool = new Pool();
const openai = new OpenAI();

export async function searchChunks(tenantId: string, query: string, k = 10) {
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1024,
  });
  const vec = `[${data[0].embedding.join(',')}]`; // formato literal de pgvector

  const { rows } = await pool.query(
    `SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
       FROM chunks
      WHERE tenant_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3`,
    [vec, tenantId, k],
  );
  return rows;
}
```

> Nota: el `ORDER BY` debe usar el **operador directamente** sobre la columna para que el planner use el índice. `ORDER BY similarity DESC` no usa el índice.

---

## 🗂️ Comparativa de opciones

| | pgvector | Pinecone | Qdrant | Weaviate | OpenSearch k-NN |
|---|---|---|---|---|---|
| Tipo | Extensión Postgres | SaaS gestionado | Motor OSS / cloud | Motor OSS / cloud | Motor de búsqueda |
| Índices | HNSW, IVFFlat | Propietario (serverless) | HNSW + cuantización | HNSW, flat | HNSW, IVF (FAISS/Lucene) |
| Filtros metadata | SQL completo | Filtros sobre metadata | Payload filters muy ricos, filtrado durante la búsqueda | GraphQL/where | Query DSL completo |
| Híbrida (BM25) | Con `tsvector` + fusión manual | Sparse-dense vectors | Sparse vectors | Nativa | Nativa (lo mejor si ya usas BM25) |
| Transacciones / joins | ✅ | ❌ | ❌ | ❌ | ❌ |
| Operación | Tu Postgres | Cero ops | Media | Media | Alta |

**Regla práctica:**
- < ~5–10M vectores y ya usas Postgres → **pgvector**. Una sola fuente de verdad, joins con permisos, backups existentes.
- Sin equipo de infra, necesitas escalar rápido → **Pinecone** (o Qdrant Cloud).
- Filtros complejos y alto volumen, quieres OSS → **Qdrant**.
- Ya tienes OpenSearch/Elastic para búsqueda full-text → **OpenSearch k-NN** para híbrida.

---

## 🔎 Filtros de metadata

El problema: el índice ANN encuentra vecinos **sin conocer el filtro**.

```
Pre-filtering:   filtrar primero → búsqueda exacta sobre el subconjunto
                 ✅ recall correcto   ❌ lento si el subconjunto es grande

Post-filtering:  ANN top-k → descartar los que no cumplen
                 ✅ rápido            ❌ si el filtro es selectivo, quedan 0-2 resultados

Filtered ANN:    el filtro se aplica mientras se recorre el grafo (Qdrant, Weaviate,
                 pgvector 0.8+ con iterative scans)
                 ✅ lo mejor de ambos, depende del motor
```

```sql
-- ❌ pgvector con filtro muy selectivo: HNSW devuelve ef_search candidatos
--    y luego filtra → puede devolver menos de 10 filas
SELECT id FROM chunks
WHERE tenant_id = $2 AND metadata->>'lang' = 'es'
ORDER BY embedding <=> $1 LIMIT 10;

-- ✅ pgvector 0.8+: seguir escaneando hasta llenar el LIMIT
SET hnsw.iterative_scan = relaxed_order;

-- ✅ Multi-tenant grande: índice parcial o partición por tenant
CREATE INDEX chunks_emb_tenant_a ON chunks
  USING hnsw (embedding vector_cosine_ops) WHERE tenant_id = '...';
```

---

## 🔴 Problemas comunes

- **Cambiar el modelo de embeddings sin re-indexar**: vectores de modelos distintos no son comparables. Guarda `embedding_model` y versión por fila.
- **No medir recall**: el índice "funciona" pero devuelve vecinos peores. Compara ANN vs búsqueda exacta en un set de queries.
- **Dimensiones enormes sin necesidad**: 3072 dims × 4 bytes × 10M = ~120 GB solo en vectores. Usa `dimensions` reducidas o cuantización.
- **Fuga entre tenants**: filtro de tenant aplicado en la app "después". Debe ir en la query (o RLS en Postgres).
- **HNSW que no cabe en RAM**: latencias de segundos por swapping.
- **Deletes masivos en HNSW**: el grafo se degrada; reconstruir periódicamente.

---

## ✅ Buenas prácticas

✅ Guarda el **texto original y metadata** junto al vector (o su id): siempre necesitarás re-embeber
✅ Versiona el modelo de embedding; re-indexación con **dual write / blue-green** de índices
✅ Normaliza vectores y usa producto punto si el motor lo optimiza
✅ Mide **recall@k** vs búsqueda exacta al tunear `ef_search` / `probes`
✅ Filtros de seguridad (tenant, ACL) siempre en el motor, nunca solo en la app
✅ Upserts idempotentes por `(doc_id, chunk_index)` para re-ingestas

---

## ⚖️ Trade-offs

| Decisión | Gana | Pierde |
|---|---|---|
| HNSW vs IVF | Recall y latencia | RAM y tiempo de build |
| `ef_search` alto | Recall | Latencia |
| Cuantización (int8/binary) | 4–32× menos memoria | 1–5% recall (mitigar con rescoring) |
| DB dedicada vs pgvector | Escala, features | Otra pieza que operar, sin joins/transacciones |

---

## 📊 Números de referencia (aproximados)

- Memoria por vector float32: `d × 4` bytes → 1024 dims ≈ 4 KB; 1M vectores ≈ 4 GB + overhead HNSW (~1.5–2×).
- HNSW bien tuneado: **p95 < 10–50 ms** sobre 1–10M vectores, recall 95–99%.
- Brute force en pgvector: ~100k vectores de 1024 dims en ~50–200 ms sin índice.
- Build HNSW en pgvector: minutos a horas para millones (sube `maintenance_work_mem`).

---

## 🎤 Preguntas de entrevista

**1. ¿Por qué no usar búsqueda exacta siempre?**
Es O(N·d) por query. Con millones de vectores la latencia es de cientos de ms o segundos. ANN da ~95–99% de recall en ms. Exacto sigue siendo válido para colecciones pequeñas o subconjuntos muy filtrados.

**2. HNSW vs IVF: ¿cuál eliges?**
HNSW por defecto: mejor recall/latencia e inserts incrementales. IVF(+PQ) cuando la memoria es la restricción o el dataset es muy grande y estático; requiere re-entrenar centroides si cambia la distribución.

**3. ¿Cómo manejas multi-tenancy?**
Filtro de tenant obligatorio en la query del motor (o RLS en Postgres), con filtered ANN o índices/particiones por tenant grandes. Nunca post-filtrar en la app: rompe recall y arriesga fugas.

**4. ¿pgvector o Pinecone?**
pgvector si ya tienes Postgres y el volumen es moderado: joins con permisos, transacciones, un solo backup. Pinecone/Qdrant cuando el volumen, la latencia o el equipo de infra lo justifican.

**5. Cambiaste de modelo de embeddings, ¿qué haces?**
Re-embeber todo en un índice nuevo en paralelo (dual write para datos nuevos), validar recall con un set de evaluación y hacer switch atómico. Los vectores de modelos distintos no son comparables.

**6. ¿Qué es el problema del post-filtering?**
El ANN devuelve top-k sin considerar el filtro; si el filtro descarta la mayoría, te quedas con pocos o cero resultados. Soluciones: filtered ANN, iterative scans, sobre-pedir k, o pre-filtrar con búsqueda exacta si el subconjunto es pequeño.

**7. ¿Cómo reduces el costo de memoria?**
Menos dimensiones (Matryoshka / `dimensions`), cuantización int8 o binaria con rescoring de los top candidatos con el vector completo, y almacenamiento en disco (DiskANN) para colecciones gigantes.

---

## 🔗 Relacionado

- [09 - Embeddings](./09-embeddings.md)
- [11 - RAG](./11-rag.md)
- [12 - Chunking](./12-chunking.md)
- [13 - Semantic Search](./13-semantic-search.md)
- [14 - Reranking](./14-reranking.md)
- [25 - Seguridad de datos](./25-seguridad-de-datos.md)
- [34 - Arquitectura LLM en producción](./34-arquitectura-llm-en-produccion.md)
