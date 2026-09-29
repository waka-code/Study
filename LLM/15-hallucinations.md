# Hallucinations

Una **alucinación** es una salida del LLM que suena plausible y segura pero es **falsa, inventada o no respaldada** por la información disponible: una API que no existe, una cita legal inventada, una cifra que no está en el documento, una política de devoluciones "razonable" pero que no es la de tu empresa.

No es un bug ocasional: es una consecuencia directa de cómo funcionan los LLM. El modelo genera el **siguiente token más probable** dado el contexto; no consulta una base de hechos ni tiene una noción nativa de "no sé" a menos que se le dé y se le entrene para ello.

**Por qué importa en producción:**
- Responden con la misma confianza cuando aciertan que cuando inventan: el usuario no puede distinguir.
- Riesgo legal y reputacional (casos reales de abogados citando jurisprudencia inventada, chatbots prometiendo reembolsos inexistentes).
- No se eliminan: se **reducen, detectan y contienen** con diseño de sistema.

---

## 🧠 Tipos

```
┌─────────────────────────┬──────────────────────────────────────────────┐
│ Factual (intrínseca)    │ "Node 18 introdujo fetch nativo en 2019"     │
│                         │ → hecho del mundo incorrecto                 │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Infiel al contexto      │ Contexto: "garantía de 12 meses"             │
│ (unfaithful)            │ Respuesta: "garantía de 24 meses"            │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Fabricación             │ Inventa URLs, citas, papers, métodos de SDK, │
│                         │ campos de un JSON, IDs                       │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Extrapolación           │ El contexto responde a medias; el modelo     │
│                         │ "completa" lo que falta                      │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

## 🔴 Causas

- **Objetivo de entrenamiento**: predecir texto plausible, no verdadero. La fluidez se premia más que la abstención.
- **Conocimiento ausente o desactualizado**: fecha de corte; datos privados que nunca vio.
- **Hechos raros (long tail)**: cuanto menos aparece algo en el entrenamiento, más probable que lo invente.
- **Presión del prompt**: "responde siempre", "sé conciso, sin disclaimers", preguntas con premisas falsas ("¿por qué X es mejor que Y?").
- **Contexto malo en RAG**: chunks irrelevantes, contradictorios o incompletos; la respuesta está en el medio de un contexto enorme.
- **Sampling**: temperatura alta aumenta la variabilidad (aunque temperatura 0 no elimina alucinaciones).
- **Tareas que el modelo no sabe hacer bien**: aritmética larga, conteos, fechas relativas.
- **Formato forzado**: un schema con campo obligatorio `invoice_number` → si no existe, lo inventa.

---

## ✅ Mitigación (por capas)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Grounding: dar la información correcta (RAG, tools, DB)  │
│ 2. Instrucciones: permitir "no sé", exigir citas            │
│ 3. Diseño de salida: campos nullable, enums, citas          │
│ 4. Verificación: validar citas, checks, LLM-judge, tools    │
│ 5. Producto: mostrar fuentes, human-in-the-loop, límites    │
│ 6. Evaluación continua: medir tasa de alucinación en CI     │
└─────────────────────────────────────────────────────────────┘
```

### 1️⃣ Grounding

Anclar la respuesta en fuentes: RAG, tool calling hacia la DB/API real, datos del usuario. **Los hechos deben venir del sistema, no de los pesos del modelo.**

```
❌ "¿Cuál es el saldo de mi cuenta?"  → el modelo "estima"
✅ tool get_balance(userId) → el modelo solo redacta con el dato real
```

### 2️⃣ Permitir y pedir "no sé"

```typescript
// ❌ Presiona a inventar
const system = 'Eres un experto en nuestros productos. Responde siempre de forma completa y segura.';

// ✅ Da una salida válida cuando falta información
const system = `Responde usando SOLO la información de <sources>.
- Cada afirmación debe citar su fuente con [n].
- Si las fuentes no contienen la respuesta, responde exactamente:
  "No tengo información suficiente para responder eso." y sugiere contactar a soporte.
- Si la pregunta contiene una premisa falsa según las fuentes, corrígela.
- No uses conocimiento externo a las fuentes.`;
```

Técnicas extra de prompt: pedir que primero **extraiga citas textuales** relevantes y luego responda solo con ellas; pedir que señale su nivel de certeza.

### 3️⃣ Diseño de la salida estructurada

```typescript
// ❌ Todo obligatorio → inventa lo que no encuentra
const schema = { invoice_number: 'string', due_date: 'string', total: 'number' };

// ✅ Nullable + evidencia
import { z } from 'zod';
const Invoice = z.object({
  invoice_number: z.string().nullable(),
  due_date: z.string().nullable().describe('ISO 8601, null si no aparece'),
  total: z.number().nullable(),
  evidence: z.array(z.object({ field: z.string(), quote: z.string() })),
});
```

### 4️⃣ Verificación posterior

```typescript
interface Source { id: number; content: string }

// Validación barata y determinista: las citas deben existir y el quote debe estar en la fuente
export function verifyQuotes(
  evidence: { sourceId: number; quote: string }[],
  sources: Source[],
): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const e of evidence) {
    const src = sources.find((s) => s.id === e.sourceId);
    if (!src) failures.push(`fuente inexistente ${e.sourceId}`);
    else if (!norm(src.content).includes(norm(e.quote))) failures.push(`quote no encontrado en ${e.sourceId}`);
  }
  return { ok: failures.length === 0, failures };
}
```

Otras verificaciones:
- **LLM-as-judge de faithfulness**: otro llamado (modelo pequeño) comprueba si cada afirmación está soportada por el contexto.
- **Self-consistency**: generar varias respuestas; si discrepan, baja confianza.
- **Validación de dominio**: el SKU mencionado existe en la DB, la URL responde 200, el código compila / pasa tests.
- **Citas nativas** del proveedor: devuelven el span exacto del documento citado.

### 5️⃣ Producto

- Mostrar las fuentes y dejar que el usuario las abra.
- Acciones irreversibles (reembolsos, emails, cambios en DB) → confirmación humana.
- Limitar el alcance del asistente (topic guardrails).

---

## ⚖️ Trade-offs

| Medida | Reduce alucinación | Costo |
|---|---|---|
| RAG / tools | Mucho (en hechos del dominio) | Infra, latencia de retrieval |
| "Di no sé" | Bastante | Más abstenciones (falsos "no sé") |
| Citas obligatorias + validación | Mucho | Prompt más largo, parsing |
| LLM-judge | Detecta, no previene | +1 llamada, latencia |
| Temperatura baja | Poco | Menos diversidad |
| Modelo más grande | Algo | Costo y latencia |

Hay una tensión real entre **helpfulness y abstención**: un sistema que dice "no sé" demasiado también fracasa. Se mide ambas cosas.

---

## 📊 Números de referencia (aproximados)

- Tasas de alucinación en resumen de documentos: del orden de **1–5%** en modelos frontera y más en modelos pequeños (varía mucho según benchmark y tarea).
- En preguntas de hechos raros sin grounding, las tasas pueden ser de decenas de %.
- Un RAG bien hecho con citas validadas reduce errores factuales del dominio de forma muy significativa, pero nunca a cero.

---

## 🎤 Preguntas de entrevista

**1. ¿Por qué alucinan los LLM?**
Porque están entrenados para generar texto probable, no verdadero. Sin la información en su contexto, o con hechos raros, generan la continuación plausible. Además el entrenamiento y los prompts suelen premiar responder sobre abstenerse.

**2. ¿Temperatura 0 elimina las alucinaciones?**
No. Hace la salida más determinista, pero el token más probable puede ser incorrecto. Reduce variabilidad, no errores de conocimiento.

**3. ¿Cómo reduces alucinaciones en un chatbot de soporte?**
Grounding con RAG y tools para datos reales, instrucciones de usar solo las fuentes con citas, una salida explícita de "no sé" con escalado a humano, validación de citas y evals de faithfulness en CI. Acciones sensibles con confirmación.

**4. ¿Cómo detectas alucinaciones en producción?**
Validaciones deterministas (citas existen, IDs existen), LLM-as-judge de faithfulness sobre una muestra, feedback de usuarios (thumbs down), y monitoreo de la tasa de "no sé" y de reclamos.

**5. En extracción estructurada, el modelo inventa campos. ¿Qué haces?**
Hacer los campos nullable, pedir evidencia textual por campo, verificar que la evidencia exista en el documento y bajar la temperatura. Nunca forzar un campo obligatorio que puede no existir.

**6. ¿Qué es grounding?**
Condicionar la respuesta a información provista en el contexto (documentos, resultados de herramientas) y verificable, en vez de al conocimiento paramétrico del modelo.

**7. ¿Cómo equilibras "no sé" con utilidad?**
Midiendo ambas: tasa de respuestas correctas, de alucinaciones y de abstenciones indebidas en un golden set que incluya preguntas sin respuesta. Ajustar retrieval (para que haya contexto) antes que relajar las instrucciones.

---

## 🔗 Relacionado

- [01 - Qué es un LLM](./01-que-es-un-llm.md)
- [04 - Temperature y Sampling](./04-temperature-y-sampling.md)
- [07 - Structured Output](./07-structured-output.md)
- [11 - RAG](./11-rag.md)
- [14 - Reranking](./14-reranking.md)
- [22 - Guardrails](./22-guardrails.md)
- [23 - Evaluación de respuestas](./23-evaluacion-de-respuestas.md)
