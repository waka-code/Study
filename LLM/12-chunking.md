# Chunking

**Chunking** es dividir documentos en fragmentos (chunks) antes de generar embeddings e indexarlos. Cada chunk es la **unidad de recuperación**: lo que el buscador encuentra y lo que el LLM termina leyendo.

Un chunk debe ser lo bastante **pequeño** para que su embedding represente una idea concreta, y lo bastante **grande** para ser autocontenido y útil como contexto.

**Por qué importa en producción:**
- Es la decisión que más impacta la calidad de RAG y la más subestimada.
- Chunks mal cortados = embeddings "promedio" que no matchean nada, o frases sueltas sin contexto.
- Cambiar la estrategia después obliga a **re-embeber todo el corpus** (costo y tiempo).

---

## 🧠 El problema

```
Documento: "## Política de devoluciones
            Los clientes pueden devolver productos en 30 días.
            ## Excepciones
            Electrónica: 15 días. Productos abiertos: no aplica."

❌ Chunk de 20 tokens fijo:
   [1] "## Política de devoluciones Los clientes pueden devolver"
   [2] "productos en 30 días. ## Excepciones Electrónica: 15"
   [3] "días. Productos abiertos: no aplica."
   → [3] no dice de qué trata. Pregunta "¿puedo devolver algo abierto?" → falla

✅ Chunk por estructura + título heredado:
   [1] "Política de devoluciones: Los clientes pueden devolver productos en 30 días."
   [2] "Política de devoluciones > Excepciones: Electrónica: 15 días. Productos abiertos: no aplica."
```

---

## 🛠️ Estrategias

### 1️⃣ Tamaño fijo (por tokens o caracteres)

Cortar cada N tokens con overlap. Simple, predecible, rápido.

```typescript
export function fixedSizeChunks(tokens: string[], size = 400, overlap = 60): string[][] {
  if (overlap >= size) throw new Error('overlap debe ser menor que size');
  const chunks: string[][] = [];
  for (let start = 0; start < tokens.length; start += size - overlap) {
    chunks.push(tokens.slice(start, start + size));
    if (start + size >= tokens.length) break;
  }
  return chunks;
}
```

- ✅ Baseline razonable para texto homogéneo.
- ❌ Corta frases, tablas y código a la mitad.

### 2️⃣ Recursivo (por separadores)

Intenta cortar por el separador más "grande" (párrafo) y, si el trozo sigue siendo muy largo, baja al siguiente (línea, oración, palabra).

```typescript
const SEPARATORS = ['\n\n', '\n', '. ', ' '];

export function recursiveSplit(text: string, maxChars = 1500, seps = SEPARATORS): string[] {
  if (text.length <= maxChars) return [text];
  const [sep, ...rest] = seps;
  if (sep === undefined) {
    // sin separadores: corte duro
    const out: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) out.push(text.slice(i, i + maxChars));
    return out;
  }

  const parts = text.split(sep);
  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    const candidate = current ? current + sep + part : part;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      if (part.length > maxChars) {
        chunks.push(...recursiveSplit(part, maxChars, rest));
        current = '';
      } else {
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
```

- ✅ El default más usado (LangChain `RecursiveCharacterTextSplitter`). Respeta párrafos.
- ❌ No entiende semántica ni estructura del documento.

### 3️⃣ Por estructura (Markdown, HTML, código)

Usa la estructura del documento: headings, secciones, filas de tabla, funciones/clases en código.

```typescript
interface StructChunk { text: string; headingPath: string[] }

export function markdownChunks(md: string): StructChunk[] {
  const lines = md.split('\n');
  const path: string[] = [];
  const chunks: StructChunk[] = [];
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join('\n').trim();
    if (body) chunks.push({ text: `${path.join(' > ')}\n\n${body}`, headingPath: [...path] });
    buf = [];
  };

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      const level = m[1].length;
      path.splice(level - 1);       // recortar al nivel del heading actual
      path.push(m[2].trim());       // push evita huecos si se salta un nivel (# → ###)
    } else {
      buf.push(line);
    }
  }
  flush();
  return chunks; // luego aplicar recursiveSplit a las secciones demasiado largas
}
```

- ✅ La mejor calidad cuando hay estructura. El breadcrumb de títulos da contexto al embedding.
- ❌ Requiere parsers por formato; secciones muy desiguales.

### 4️⃣ Semántico

Divide donde **cambia el tema**: embebe oraciones, compara similitud entre vecinas y corta cuando cae por debajo de un umbral.

```
oraciones:  s1   s2   s3 | s4   s5 | s6   s7   s8
sim(i,i+1): 0.91 0.88 0.42 0.87 0.35 0.90 0.85
                       ▲         ▲
                  corte (< 0.6)  corte
```

- ✅ Chunks temáticamente coherentes en texto sin estructura (transcripciones, emails).
- ❌ Costo de embeber cada oración en ingesta, umbral difícil de calibrar, mejora no siempre medible.

### 5️⃣ Variantes avanzadas

- **Parent-document / small-to-big**: indexas chunks pequeños (precisión en búsqueda) pero entregas al LLM el chunk padre o la sección completa (contexto).
- **Contextual chunking**: un LLM barato genera 1–2 frases que sitúan el chunk en el documento ("Este fragmento pertenece al contrato X, sección de penalidades…") y se antepone antes de embeber. Mejora recall notablemente a cambio de costo de ingesta (mitigado con prompt caching del documento).
- **Late chunking**: embeber el documento completo con un modelo de contexto largo y agrupar los token-embeddings por chunk.

---

## 🔁 Overlap

Repetir parte del final del chunk anterior al inicio del siguiente para no perder ideas que cruzan el corte.

```
Chunk 1: [==========|###]
Chunk 2:            [###|==========|###]
Chunk 3:                           [###|==========]
                     ▲ overlap (10–20%)
```

- Típico: **10–20%** del tamaño.
- ❌ Overlap excesivo: duplicados en el top-k, más almacenamiento, más costo de embedding.
- Con chunking por estructura suele bastar poco o ningún overlap.

---

## 🏷️ Metadata

Cada chunk debe llevar metadata para filtrar, citar y re-ingestar:

```typescript
interface ChunkRecord {
  id: string;               // `${docId}:${chunkIndex}` → upsert idempotente
  docId: string;
  chunkIndex: number;
  tenantId: string;         // multi-tenancy
  acl: string[];            // grupos con acceso
  source: string;           // URL o path para la cita
  title: string;
  headingPath: string[];    // "Manual > Instalación > Linux"
  page?: number;            // PDFs
  lang: string;
  updatedAt: string;        // filtros por frescura
  contentHash: string;      // evitar re-embeber si no cambió
  embeddingModel: string;   // versión del modelo usado
  text: string;
}
```

---

## 🔴 Problemas comunes

- ❌ Chunk sin contexto ("Sí, aplica en ese caso.") → antepon título/breadcrumb.
- ❌ Tablas cortadas por filas sin cabecera → repetir el header en cada chunk o convertir cada fila a texto "columna: valor".
- ❌ Código partido a mitad de función → splitter por AST o por bloques.
- ❌ Chunks mayores que el límite del modelo de embeddings → truncado silencioso.
- ❌ Basura de parseo (headers/footers de PDF en cada página) contaminando embeddings.
- ❌ Elegir tamaño "porque lo dijo un blog" sin evaluar.

---

## ✅ Buenas prácticas

✅ Empieza con **recursivo ~300–500 tokens, overlap 10–15%**, y mide
✅ Usa estructura cuando exista (markdown, HTML, secciones legales)
✅ Antepon títulos/breadcrumb al texto a embeber
✅ Separa "texto para embeber" de "texto para mostrar al LLM" (small-to-big)
✅ Mide con un golden set: recall@k por estrategia antes de decidir
✅ Guarda `contentHash` y `embeddingModel` para re-ingestas baratas

---

## ⚖️ Trade-offs

| Tamaño | Pro | Contra |
|---|---|---|
| Pequeño (100–250 tokens) | Embedding preciso, más granular | Falta contexto, más chunks, respuesta fragmentada |
| Medio (300–600) | Buen equilibrio | — |
| Grande (800–1500) | Contexto completo | Embedding "diluido", más tokens en el prompt |

---

## 📊 Números de referencia (aproximados)

- 1 página de texto ≈ 500–800 tokens.
- Tamaño típico en producción: 256–1024 tokens; overlap 10–20%.
- Límite de input de muchos modelos de embeddings: ~8k tokens (varía por proveedor).
- Contextual chunking: mejoras de recall reportadas del orden de 30–50% en fallos de recuperación, dependiendo del corpus.

---

## 🎤 Preguntas de entrevista

**1. ¿Cómo eliges el tamaño de chunk?**
Según el tipo de contenido y preguntas: FAQs cortas → chunks pequeños; manuales y contratos → secciones. Empiezo con un baseline (recursivo ~400 tokens) y comparo estrategias contra un golden set midiendo recall@k.

**2. ¿Para qué sirve el overlap y cuándo sobra?**
Evita perder ideas que cruzan el borde de un corte fijo. Con chunking por estructura (secciones completas) aporta poco y genera duplicados.

**3. ¿Qué es parent-document retrieval?**
Buscar sobre chunks pequeños para precisión, pero entregar al LLM el bloque padre más grande para contexto. Desacopla la unidad de búsqueda de la unidad de lectura.

**4. ¿Cómo manejas tablas?**
Parsers que preserven la tabla (a markdown), repetir cabeceras por chunk o serializar filas como "columna: valor". Para preguntas analíticas sobre tablas, mejor text-to-SQL.

**5. ¿Chunking semántico siempre es mejor?**
No. Cuesta más en ingesta y en muchos benchmarks no supera claramente al recursivo o por estructura. Solo lo adopto si mejora las métricas en mi corpus.

**6. ¿Qué metadata guardas por chunk y por qué?**
Tenant y ACL (seguridad), source/página (citas), headings (contexto), fechas (frescura), hash (ingesta incremental) y modelo de embedding (migraciones).

---

## 🔗 Relacionado

- [02 - Tokens](./02-tokens.md)
- [09 - Embeddings](./09-embeddings.md)
- [10 - Vector Databases](./10-vector-databases.md)
- [11 - RAG](./11-rag.md)
- [13 - Semantic Search](./13-semantic-search.md)
- [27 - Prompt Caching](./27-prompt-caching.md)
