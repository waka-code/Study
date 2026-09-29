# Evaluación de Respuestas (Evals)

Los **evals** son la forma sistemática de medir si un sistema basado en LLM responde bien: un conjunto de casos de prueba, una forma de puntuar las respuestas y un proceso para correrlos en cada cambio. Son el equivalente de los tests para software no determinista: en lugar de `expect(x).toBe(y)`, mides **tasas** (% de respuestas correctas, fieles, útiles) sobre un dataset.

**Por qué importa en producción:** cambiar una línea del prompt, subir el top-k del RAG o migrar a un modelo nuevo puede mejorar 10 casos y romper 30, y no te enteras hasta que llegan las quejas. Sin evals, cada cambio es "se ve bien en los 3 ejemplos que probé" (*vibe checking*). Con evals, puedes elegir el modelo más barato que cumple, detectar regresiones en CI y justificar decisiones con datos.

---

## ⚙️ Tipos de evaluación

```
                   ┌──────────────── OFFLINE ────────────────┐
  cambio de prompt │ golden dataset ─▶ sistema ─▶ scorers ─▶ │ ─▶ ¿pasa umbral? ─▶ deploy
  / modelo / RAG   │  (casos fijos)              (reglas,    │         │
                   │                              LLM judge) │         └─ no: bloquea PR
                   └─────────────────────────────────────────┘
                   ┌──────────────── ONLINE ─────────────────┐
  producción ────▶ │ tráfico real ─▶ feedback 👍👎, métricas │ ─▶ dashboards, alertas,
                   │ muestreo ─▶ LLM judge asíncrono         │    nuevos casos al dataset
                   │ A/B entre variantes                     │
                   └─────────────────────────────────────────┘
```

| | Offline | Online |
|---|---|---|
| Datos | Dataset curado | Tráfico real |
| Cuándo | Antes de desplegar (CI) | Después, continuo |
| Detecta | Regresiones conocidas | Problemas nuevos, drift |
| Ground truth | Sí (respuesta esperada) | Normalmente no |

---

## 🔴 Problemas comunes

- **Vibe checking**: probar 3 prompts a mano y declarar victoria.
- **Dataset que no representa producción**: solo casos felices, sin edge cases ni adversariales.
- **Métrica única agregada** que esconde que una categoría se desplomó.
- **LLM-as-judge sin calibrar**: el juez premia respuestas largas o las de su propio modelo.
- **Dataset contaminado**: los casos se usaron como few-shot en el prompt.
- **No versionar** prompt + modelo + dataset juntos → resultados no reproducibles.

---

## ✅ Golden dataset

Casos con entrada, contexto y lo que se espera (respuesta de referencia o criterios).

```typescript
// evals/datasets/support.jsonl (una línea por caso)
type EvalCase = {
  id: string;
  input: string;
  tags: string[];                 // 'billing', 'edge-case', 'adversarial', 'es'
  expected?: string;              // respuesta de referencia (si aplica)
  mustInclude?: string[];         // hechos obligatorios
  mustNotInclude?: string[];      // p. ej. datos de otro cliente
  relevantDocIds?: string[];      // para medir retrieval
};
```

Cómo construirlo:
- Empieza con **50–200 casos** reales (anonimizados) de producción o de expertos del dominio.
- Cubre categorías: frecuentes, difíciles, fuera de tema, adversariales (injection), multi-idioma.
- **Cada bug de producción se convierte en un caso** (regression test).
- Versiona el dataset en git junto al prompt.

---

## ✅ Scorers (cómo puntuar)

### 1️⃣ Deterministas (preferir siempre que se pueda)

```typescript
const scorers = {
  validJson: (out: string) => { try { JSON.parse(out); return 1; } catch { return 0; } },
  exactCategory: (out: Triage, c: EvalCase) => (out.category === c.expected ? 1 : 0),
  includesFacts: (out: string, c: EvalCase) =>
    (c.mustInclude ?? []).filter((f) => out.toLowerCase().includes(f.toLowerCase())).length /
    Math.max(1, c.mustInclude?.length ?? 1),
  noLeak: (out: string, c: EvalCase) =>
    (c.mustNotInclude ?? []).some((f) => out.includes(f)) ? 0 : 1,
};
```

### 2️⃣ LLM-as-judge

Para calidad abierta (utilidad, tono, fidelidad) se usa otro modelo como evaluador con una **rúbrica explícita**.

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const client = new Anthropic();

const Verdict = z.object({
  reasoning: z.string(),
  faithfulness: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
});

export async function judge(question: string, context: string, answer: string) {
  const res = await client.messages.create({
    model: 'claude-sonnet-5',  // ✅ juez igual o más capaz que el modelo evaluado
    max_tokens: 500,
    temperature: 0,
    system: `Eres un evaluador estricto. Rúbrica:
faithfulness 5 = toda afirmación está respaldada por el CONTEXTO; 1 = inventa hechos.
relevance    5 = responde directamente la PREGUNTA; 1 = no la responde.
Razona primero y luego puntúa. Responde SOLO JSON: {"reasoning": string, "faithfulness": n, "relevance": n}.`,
    messages: [{
      role: 'user',
      content: `<pregunta>${question}</pregunta>\n<contexto>${context}</contexto>\n<respuesta>${answer}</respuesta>`,
    }],
  });
  const block = res.content.find((b) => b.type === 'text');
  return Verdict.parse(JSON.parse(block?.type === 'text' ? block.text : '{}'));
}
```

Buenas prácticas del juez:
- **Rúbrica concreta** y escala pequeña (binaria o 1–5), razonamiento antes del puntaje.
- **Calibrar** contra etiquetas humanas (~50–100 casos): medir acuerdo antes de confiar.
- **Comparación pareada** (A vs B) es más fiable que puntaje absoluto; alterna el orden para evitar sesgo de posición.
- Sesgos conocidos: verbosidad, posición, auto-preferencia (mismo modelo/familia).

---

## ✅ Métricas de RAG

Separa la evaluación del **retrieval** y de la **generación**: si la respuesta es mala, necesitas saber cuál falló.

```
 pregunta ─▶ [RETRIEVAL] ─▶ chunks ─▶ [GENERACIÓN] ─▶ respuesta
                 │                          │
      context recall / precision     faithfulness / answer relevance
      (¿trajo los docs correctos?)   (¿se basó en ellos? ¿responde?)
```

| Métrica | Pregunta que responde | Cómo se mide |
|---|---|---|
| **Context recall** (recall@k) | ¿Están los docs relevantes en el top-k? | `relevantDocIds` ∩ recuperados / relevantes |
| **Context precision** / MRR | ¿Los relevantes están arriba? | Posición del primer relevante |
| **Faithfulness** (groundedness) | ¿Cada afirmación está respaldada por el contexto? | LLM judge por afirmación |
| **Answer relevance** | ¿Responde la pregunta? | LLM judge / similitud |
| **Answer correctness** | ¿Coincide con la referencia? | Judge vs `expected` |

```typescript
function recallAtK(retrievedIds: string[], relevantIds: string[], k = 5): number {
  const topK = new Set(retrievedIds.slice(0, k));
  return relevantIds.filter((id) => topK.has(id)).length / Math.max(1, relevantIds.length);
}
```

Frameworks: **Ragas**, **DeepEval**, **promptfoo**, **Braintrust**, **LangSmith**, **Langfuse** (evals + tracing).

---

## ✅ Regresiones en CI

```typescript
// evals/run.ts — se ejecuta en CI cuando cambian prompts/, rag/ o el modelo
const results = await Promise.all(dataset.map(async (c) => {
  const out = await system.answer(c.input);
  return {
    id: c.id, tags: c.tags,
    noLeak: scorers.noLeak(out.text, c),
    facts: scorers.includesFacts(out.text, c),
    recall: recallAtK(out.retrievedIds, c.relevantDocIds ?? []),
    ...(await judge(c.input, out.context, out.text)),
  };
}));

const avg = (k: keyof typeof results[0]) =>
  results.reduce((s, r) => s + Number(r[k]), 0) / results.length;

const report = { faithfulness: avg('faithfulness'), recall: avg('recall'), noLeak: avg('noLeak') };
console.table(report);

// ✅ Umbrales absolutos + comparación contra baseline de main
if (report.noLeak < 1 || report.faithfulness < 4.2 || report.faithfulness < baseline.faithfulness - 0.1) {
  process.exit(1);
}
```

- Corre en PRs que tocan prompts, modelo, chunking o retrieval (no en cada commit: cuesta dinero).
- Reporta **por tag/categoría**, no solo el promedio.
- Guardrails de seguridad (`noLeak`) con umbral **100%**; calidad con tolerancia al ruido.
- Cachea salidas por (prompt versión, modelo, caso) para no pagar reruns idénticos.
- `temperature: 0` o varias corridas por caso para controlar varianza.

---

## ✅ Evaluación online y A/B

```typescript
// Feedback explícito + contexto para poder reproducir
await db.llmFeedback.create({
  data: { traceId, rating: 'down', promptVersion: 'v7', model: 'claude-sonnet-5', comment },
});
```

- **Señales implícitas**: el usuario reformula, copia la respuesta, abandona, escala a humano.
- **Judge asíncrono** sobre una muestra (~1–5%) del tráfico para faithfulness/toxicidad.
- **A/B**: asigna variante por usuario (hash estable), compara métricas de negocio (resolución, CSAT, escalamiento) con significancia estadística; o **shadow mode** (la variante nueva corre sin mostrarse).
- Casos malos de producción → al golden dataset.

---

## ⚖️ Trade-offs

| Enfoque | Pro | Contra |
|---|---|---|
| Scorers deterministas | Baratos, reproducibles | Solo miden lo verificable |
| LLM-as-judge | Escala, entiende matices | Costo, sesgos, necesita calibración |
| Evaluación humana | Máxima calidad | Lenta, cara, no escala |
| Dataset grande | Más señal | Costo por corrida en CI |
| A/B online | Mide impacto real | Requiere tráfico y tiempo; riesgo para usuarios |

---

## 📊 Números de referencia (aproximados)

- Golden dataset inicial: **~50–200 casos**; maduro: **cientos a miles**.
- Acuerdo juez–humano aceptable: **~80%+** en tareas bien definidas.
- Muestreo online para judge: **~1–5%** del tráfico.
- Ruido entre corridas con temperature > 0: **varios puntos %** → no reaccionar a diferencias menores sin repetir.

---

## 🎤 Preguntas de entrevista

**1. ¿Cómo sabes que un cambio de prompt no rompió nada?**
Golden dataset versionado con casos por categoría, scorers deterministas + LLM judge, corriendo en CI con umbrales y comparación contra baseline. Luego monitoreo online.

**2. ¿Qué es LLM-as-judge y cuáles son sus riesgos?**
Usar un modelo para puntuar respuestas con una rúbrica. Riesgos: sesgo de verbosidad, de posición, auto-preferencia, inconsistencia. Mitigo con rúbrica concreta, razonamiento antes del puntaje, comparación pareada con orden alternado y calibración contra humanos.

**3. El RAG responde mal. ¿Cómo localizas el problema?**
Separo retrieval y generación: si el recall@k es bajo, el problema está en chunking/embeddings/reranking; si el recall es bueno pero la faithfulness baja, está en el prompt o el modelo.

**4. Diferencia entre faithfulness y correctness.**
Faithfulness: la respuesta se apoya en el contexto dado (no inventa). Correctness: coincide con la verdad/referencia. Una respuesta puede ser fiel a un contexto incorrecto.

**5. ¿Cómo decides migrar a un modelo más barato?**
Corro el mismo dataset con ambos, comparo métricas por categoría, costo y latencia; si el barato cumple umbrales, A/B o shadow en producción antes del cambio total.

**6. ¿Qué haces con los 👎 de producción?**
Los reviso, clasifico la causa (retrieval, alucinación, tono, fuera de alcance), los convierto en casos del dataset y priorizo por frecuencia.

**7. ¿Cómo manejas la no-determinismo en CI?**
`temperature: 0` donde se pueda, varias corridas para casos críticos, umbrales con tolerancia y comparación contra baseline en lugar de valores exactos.

---

## 🔗 Relacionado

- [11-rag](./11-rag.md)
- [14-reranking](./14-reranking.md)
- [15-hallucinations](./15-hallucinations.md)
- [22-guardrails](./22-guardrails.md)
- [28-fine-tuning-vs-rag-vs-prompting](./28-fine-tuning-vs-rag-vs-prompting.md)
- [31-observabilidad-llmops](./31-observabilidad-llmops.md)
- [32-seleccion-de-modelos](./32-seleccion-de-modelos.md)
