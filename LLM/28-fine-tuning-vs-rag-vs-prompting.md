# Fine-tuning vs RAG vs Prompting

Hay tres palancas principales para adaptar un LLM a tu caso de uso:

- **Prompting**: cambiar las instrucciones, ejemplos y contexto que envías. No toca el modelo.
- **RAG (Retrieval-Augmented Generation)**: recuperar documentos relevantes en tiempo de ejecución e inyectarlos en el prompt. Aporta **conocimiento**.
- **Fine-tuning**: seguir entrenando el modelo con tus ejemplos para modificar sus pesos. Cambia **comportamiento, formato o estilo**.

**Por qué importa en producción:** elegir mal es caro. Un fine-tuning para "que el modelo sepa de nuestros productos" suele fallar (el modelo alucina igual y queda desactualizado en semanas), mientras que un RAG para "que responda siempre en este formato JSON exacto" es sobreingeniería cuando bastaba structured output. La pregunta de entrevista típica: *"¿Harías fine-tuning o RAG para X?"*.

---

## 🧠 Qué cambia cada uno

```
                     ┌─────────────────────────────────────────┐
  Prompting    ───▶  │  Instrucciones + ejemplos en el input    │  qué hacer
                     └─────────────────────────────────────────┘
                     ┌─────────────────────────────────────────┐
  RAG          ───▶  │  Documentos recuperados en el input      │  qué saber (hoy)
                     └─────────────────────────────────────────┘
                     ┌─────────────────────────────────────────┐
  Fine-tuning  ───▶  │  Pesos del modelo                        │  cómo comportarse
                     └─────────────────────────────────────────┘
```

Regla mental: **RAG para conocimiento, fine-tuning para comportamiento, prompting siempre primero.**

---

## 1️⃣ Prompting (siempre el punto de partida)

Incluye: instrucciones claras, few-shot examples, formato de salida, structured output, tool calling, y cadena de pensamiento.

```typescript
const res = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 512,
  system: `Clasificas tickets de soporte en: billing, bug, feature_request, other.
Responde solo con la categoría.

Ejemplos:
"Me cobraron dos veces" → billing
"La app se cierra al subir foto" → bug`,
  messages: [{ role: 'user', content: ticket.body }],
});
```

- ✅ Iteración en minutos, sin infraestructura, reversible.
- ✅ Funciona con cualquier modelo nuevo que salga.
- ❌ Limitado por el contexto; prompts enormes suben costo/latencia (mitigable con prompt caching).

---

## 2️⃣ RAG

```
pregunta → embedding → vector DB (top-k) → rerank → prompt con chunks → LLM → respuesta con citas
```

- ✅ Conocimiento **actualizado** (reindexas, no reentrenas).
- ✅ **Citas y trazabilidad**: puedes mostrar la fuente.
- ✅ **Control de acceso**: filtras chunks por permisos del usuario. Imposible con fine-tuning.
- ❌ Calidad depende del retrieval (chunking, embeddings, reranking).
- ❌ Más componentes: ingesta, vector store, pipeline de actualización.

---

## 3️⃣ Fine-tuning

Entrenar con pares input → output deseado (cientos a miles de ejemplos de alta calidad).

Útil para:
- Formato/estilo muy consistente que el prompting no logra de forma fiable.
- Tareas estrechas de alto volumen donde un **modelo pequeño fine-tuneado** iguala a uno grande con prompt → baja costo y latencia.
- Jerga o dominio muy específico (clasificación, extracción).
- Reducir el tamaño del prompt (el comportamiento queda "horneado").

No sirve (bien) para:
- Inyectar hechos que cambian (precios, inventario, políticas).
- Que el modelo "deje de alucinar": aprende el estilo de tus respuestas, no garantiza exactitud.
- Permisos por usuario.

### LoRA (Low-Rank Adaptation)

En lugar de actualizar todos los pesos (full fine-tuning), LoRA congela el modelo base y entrena **matrices pequeñas de bajo rango** que se suman a ciertas capas.

```
W' = W  +  B · A        W: d×d (congelado, miles de millones de params)
                        A: r×d, B: d×r   con r pequeño (ej. 8–64)

Parámetros entrenables: típicamente <1% del modelo
```

- ✅ Entrenamiento mucho más barato (menos memoria de GPU; **QLoRA** además cuantiza el base a 4 bits).
- ✅ Adaptadores de pocos MB–cientos de MB; puedes tener **un adapter por cliente/tarea** sobre el mismo modelo base.
- ✅ Servidores como vLLM pueden servir múltiples LoRA sobre un base en caliente.
- ❌ Algo menos expresivo que full fine-tuning en cambios profundos.

### Fine-tuning gestionado

Algunos proveedores (OpenAI, Bedrock/Vertex para ciertos modelos) ofrecen fine-tuning como servicio: subes JSONL, obtienes un modelo con ID propio. Suele tener precio de inferencia mayor que el modelo base y queda atado a esa versión del modelo.

```jsonl
{"messages":[{"role":"system","content":"Extrae datos de facturas."},{"role":"user","content":"Factura N° 332..."},{"role":"assistant","content":"{\"numero\":\"332\",\"total\":15000}"}]}
```

---

## ⚖️ Tabla de decisión

| Necesidad | Prompting | RAG | Fine-tuning |
|-----------|:---------:|:---:|:-----------:|
| Responder sobre documentos internos | ⚠️ si caben | ✅ | ❌ |
| Datos que cambian a diario | ❌ | ✅ | ❌ |
| Citar fuentes | ⚠️ | ✅ | ❌ |
| Permisos por usuario/tenant | ⚠️ | ✅ | ❌ |
| Formato de salida estricto | ✅ (structured output) | — | ✅ |
| Tono/estilo de marca muy específico | ⚠️ | — | ✅ |
| Tarea estrecha a gran volumen, bajar costo | ⚠️ | — | ✅ (modelo pequeño) |
| Prototipo en 1 día | ✅ | ⚠️ | ❌ |
| Cambiar comportamiento sin datos etiquetados | ✅ | — | ❌ |
| Latencia mínima con prompts cortos | ⚠️ | ❌ (retrieval suma) | ✅ |

Leyenda: ✅ buena opción · ⚠️ posible con límites · ❌ mala opción · — no aplica

### Flujo de decisión

```
¿El problema es falta de CONOCIMIENTO (hechos, docs)?
   ├── Sí → ¿Cabe en contexto y cambia poco? → Prompting + prompt caching
   │         └── No → RAG
   └── No, es COMPORTAMIENTO (formato, estilo, tarea)
             ├── ¿Mejora con mejor prompt / few-shot / structured output? → Prompting
             └── No, o necesito bajar costo a gran volumen
                   → ¿Tengo ≥ cientos de ejemplos de calidad + evals? → Fine-tuning (LoRA)
                   └── No → sigue iterando el prompt y junta datos
```

Se combinan: lo común en producción maduro es **prompting + RAG**, y en casos de alto volumen, **fine-tuning de un modelo pequeño + RAG**.

---

## 💰 Costos

| | Costo inicial | Costo recurrente | Costo de cambio |
|---|---|---|---|
| Prompting | ~0 | Tokens del prompt (mitigable con caché) | Minutos |
| RAG | Pipeline de ingesta, vector DB | Embeddings + storage + tokens de contexto | Reindexar documentos |
| Fine-tuning | Dataset curado + entrenamiento + evals | Hosting del modelo o precio premium de inferencia | Reentrenar; migrar cuando sale un modelo base nuevo |

**Costo oculto del fine-tuning:** el dataset. Curar y mantener miles de ejemplos correctos es trabajo humano caro. Y cada vez que sale un modelo base mejor, tu fine-tune queda atrás.

---

## 🔴 Errores comunes

❌ "Hagamos fine-tuning con nuestra documentación para que el bot la conozca"
→ Memoriza mal, alucina con confianza, se desactualiza, no respeta permisos.
✅ RAG con citas y filtros por permisos.

❌ Fine-tuning sin evals: no sabes si mejoró o empeoró.
✅ Conjunto de evaluación fijo antes de empezar; comparar base+prompt vs fine-tune.

❌ Saltar directamente a fine-tuning sin agotar el prompting.
✅ Prompting → structured output → few-shot → RAG → fine-tuning, en ese orden.

---

## 📊 Números de referencia (aproximados)

| Concepto | Orden de magnitud |
|----------|-------------------|
| Ejemplos para fine-tuning útil | cientos a pocos miles, de alta calidad |
| Parámetros entrenables con LoRA | <1% del modelo |
| Tamaño de un adapter LoRA | MB a cientos de MB |
| Latencia agregada por RAG (embed + búsqueda + rerank) | ~50–500 ms |

---

## 🎤 Preguntas de entrevista

**1. ¿Fine-tuning o RAG para un chatbot sobre la documentación interna?**
RAG: el conocimiento cambia, necesito citas y respetar permisos por usuario. Fine-tuning no garantiza exactitud y se desactualiza.

**2. ¿Cuándo sí harías fine-tuning?**
Cuando el problema es de comportamiento (formato, estilo, tarea estrecha) y el prompting no alcanza, o para reemplazar un modelo grande por uno pequeño fine-tuneado en una tarea de alto volumen para bajar costo/latencia. Siempre con dataset curado y evals.

**3. ¿Qué es LoRA y por qué es popular?**
Entrena matrices de bajo rango sobre el modelo congelado; <1% de parámetros, mucho menos memoria, adapters pequeños e intercambiables (uno por tarea/cliente sobre el mismo base).

**4. ¿Pueden combinarse?**
Sí. Fine-tuning para que el modelo siga tu formato y use bien el contexto, RAG para aportar los hechos. Prompting siempre está presente.

**5. ¿Fine-tuning reduce alucinaciones?**
No de forma fiable. Enseña patrones, no hechos verificables. Para exactitud: RAG con grounding, citas y evals de fidelidad.

**6. ¿Cuál es el costo oculto de un fine-tune?**
Curar y mantener el dataset, las evals, el hosting, y la obsolescencia cuando sale un modelo base mejor que tu fine-tune.

---

## 🔗 Relacionado

- [05-prompt-engineering](./05-prompt-engineering.md)
- [07-structured-output](./07-structured-output.md)
- [09-embeddings](./09-embeddings.md)
- [11-rag](./11-rag.md)
- [15-hallucinations](./15-hallucinations.md)
- [23-evaluacion-de-respuestas](./23-evaluacion-de-respuestas.md)
- [32-seleccion-de-modelos](./32-seleccion-de-modelos.md)
