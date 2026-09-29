# Structured Output

**Structured output** es obtener del LLM una respuesta en un **formato máquina-legible y validable** (casi siempre JSON que cumple un schema) en lugar de texto libre. Es el puente entre el mundo probabilístico del modelo y el mundo tipado de tu backend: DTOs, colas, bases de datos y otros servicios.

Hay tres niveles de garantía: (1) **pedirlo en el prompt** ("responde en JSON"), (2) **JSON mode** (el proveedor garantiza JSON sintácticamente válido) y (3) **JSON Schema / constrained decoding** (el proveedor garantiza que la salida cumple tu schema). Aun con el nivel 3, **tu backend debe validar**: el schema garantiza forma, no verdad.

**Por qué importa en producción:**
- `JSON.parse` sobre texto libre falla con ~1–5% de las respuestas (texto extra, comas, truncamiento), lo cual a escala son miles de errores diarios.
- Sin validación, datos malformados **se propagan** a la DB y a otros servicios.
- Un schema claro también **mejora la calidad**: obliga al modelo a completar campos concretos.

---

## 🧭 Niveles de garantía

```
            Garantía                             Cómo
┌───────────────────────────────┐
│ 1. Prompt "responde en JSON"  │  ~95-99% JSON válido, schema no garantizado
├───────────────────────────────┤
│ 2. JSON mode                  │  JSON válido garantizado, schema NO
├───────────────────────────────┤
│ 3. JSON Schema (strict)       │  JSON válido + cumple schema (constrained decoding)
├───────────────────────────────┤
│ 4. + Validación en backend    │  zod: tipos, rangos, reglas de negocio  ← siempre
└───────────────────────────────┘
```

**Constrained decoding**: en cada paso, el proveedor enmascara los tokens que harían inválido el JSON según el schema. El modelo *no puede* emitir una clave inexistente o un tipo incorrecto.

---

## 💻 Anthropic: structured output con zod

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

const InvoiceSchema = z.object({
  invoiceNumber: z.string(),
  issueDate: z.string().describe("Fecha ISO 8601, YYYY-MM-DD"),
  currency: z.enum(["CLP", "USD", "EUR"]),
  total: z.number(),
  lineItems: z.array(
    z.object({ description: z.string(), quantity: z.number(), unitPrice: z.number() }),
  ),
  confidence: z.enum(["high", "medium", "low"]),
});
type Invoice = z.infer<typeof InvoiceSchema>;

const response = await client.messages.parse({
  model: "claude-sonnet-5",
  max_tokens: 4096,
  system: "Extraes datos de facturas. Si un campo no aparece, usa tu mejor inferencia y baja la confianza.",
  messages: [{ role: "user", content: `<factura>\n${invoiceText}\n</factura>` }],
  output_config: { format: zodOutputFormat(InvoiceSchema) },
});

const invoice: Invoice | null = response.parsed_output; // null si no se pudo parsear
```

Con JSON Schema crudo (sin helper):

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: `Clasifica: ${ticket}` }],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["billing", "bug", "account", "other"] },
          priority: { type: "integer", enum: [1, 2, 3] },
        },
        required: ["category", "priority"],
        additionalProperties: false,
      },
    },
  },
});
const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
const data = JSON.parse(text);
```

## 💻 OpenAI: equivalente

```typescript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI();

const completion = await openai.chat.completions.parse({
  model: "gpt-4.1-mini",
  messages: [{ role: "user", content: invoiceText }],
  response_format: zodResponseFormat(InvoiceSchema, "invoice"),
});
const invoice = completion.choices[0].message.parsed;

// JSON mode (solo sintaxis, sin schema):
// response_format: { type: "json_object" }  ← el prompt debe mencionar "JSON"
```

---

## 🔴 Problemas comunes

```typescript
// ❌ Parseo "a lo bruto" de texto libre
const text = res.content[0].type === "text" ? res.content[0].text : "";
const data = JSON.parse(text);
// Falla con: "Aquí está el JSON: {...}", ```json fences, comas finales, truncamiento

// ❌ Regex para "extraer el JSON" del texto
const data = JSON.parse(text.match(/\{[\s\S]*\}/)![0]); // frágil, captura basura

// ❌ Confiar en el tipo sin validar
const order = JSON.parse(text) as Order; // "as" no valida nada en runtime
await this.orders.save(order);
```

```typescript
// ✅ Schema en la API + validación de negocio en el backend
const Refund = z.object({
  orderId: z.string().regex(/^ord_[a-z0-9]{12}$/),
  amount: z.number().positive().max(1_000_000),
  reason: z.enum(["duplicate", "fraud", "not_received", "other"]),
});
```

Más trampas:
- **Truncamiento**: `stop_reason: "max_tokens"` → JSON incompleto. Revisar siempre.
- **Refusal**: el modelo puede declinar y la salida no cumplir el schema; revisa `stop_reason`.
- **Schemas no soportados**: constrained decoding suele soportar un subconjunto de JSON Schema (ej. limitaciones con `minLength`, `pattern`, recursión, `oneOf` complejos). Las reglas que no entren en el schema → validación zod.
- **Campos obligatorios sin escape**: si todo es `required` y el dato no existe, el modelo **inventa**. Permite `null` o un campo `confidence`/`found`.

```typescript
// ❌ Obliga a inventar
z.object({ taxId: z.string() })

// ✅ Permite decir "no está"
z.object({ taxId: z.string().nullable().describe("null si no aparece en el documento") })
```

---

## 🔁 Validación con reintentos

Patrón: validar con zod → si falla, **reintentar enviando el error al modelo** para que se corrija (con un límite).

```typescript
import { ZodError, type ZodType } from "zod";

async function generateStructured<T>(
  schema: ZodType<T>,
  messages: Anthropic.MessageParam[],
  maxAttempts = 3,
): Promise<T> {
  const convo = [...messages];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      messages: convo,
      output_config: { format: zodOutputFormat(schema) },
    });

    if (res.stop_reason === "max_tokens") {
      throw new Error("Salida truncada: aumentar max_tokens o reducir la tarea");
    }
    if (res.stop_reason === "refusal") {
      throw new Error("El modelo declinó la solicitud");
    }

    const raw = res.content.find((b) => b.type === "text")?.text ?? "";
    try {
      return schema.parse(JSON.parse(raw)); // reglas de negocio además del schema
    } catch (err) {
      const detail =
        err instanceof ZodError ? JSON.stringify(err.issues) : (err as Error).message;
      logger.warn({ attempt, detail }, "structured output inválido");

      convo.push({ role: "assistant", content: res.content });
      convo.push({
        role: "user",
        content: `Tu respuesta no pasó la validación: ${detail}. Corrígela y responde de nuevo.`,
      });
    }
  }
  throw new Error(`Structured output inválido tras ${maxAttempts} intentos`);
}
```

- Diferencia **errores retryables** (validación de negocio, parse) de **no retryables** (truncamiento → cambiar parámetros; refusal → no insistir).
- Con constrained decoding, los reintentos por forma casi desaparecen; quedan los de **reglas de negocio**.
- Registra la **tasa de reintentos** como métrica de calidad del prompt/modelo.

---

## 🔀 Alternativa: tool calling como structured output

Antes del soporte nativo, se definía una tool con el schema deseado y se forzaba su uso. Sigue siendo válido si ya usas tools, con `strict: true` para garantizar el schema de los argumentos:

```typescript
tools: [{
  name: "record_classification",
  description: "Registra la clasificación del ticket",
  strict: true,
  input_schema: {
    type: "object",
    properties: { category: { type: "string", enum: ["billing", "bug", "other"] } },
    required: ["category"],
    additionalProperties: false,
  },
}],
tool_choice: { type: "tool", name: "record_classification" }, // no todos los modelos permiten forzar
```

---

## ✅ Buenas prácticas

- Usa **schema nativo del proveedor** cuando exista; JSON mode solo como fallback.
- **Un único schema fuente** (zod) → genera JSON Schema para la API y tipos TS para el código.
- **Valida siempre en runtime** (zod) y aplica reglas de negocio aparte del schema.
- Diseña schemas **planos y pequeños**, con `enum` para categorías y `.describe()` en campos ambiguos.
- Permite **null / "unknown"** para evitar invención.
- Si necesitas razonamiento, agrega un campo `reasoning` **antes** de los campos de respuesta (el orden importa: el modelo genera en orden), o usa thinking.
- Revisa `stop_reason` antes de parsear.

---

## ⚖️ Trade-offs

| Enfoque | Pros | Contras |
|---|---|---|
| Prompt "responde en JSON" | Universal, simple | Sin garantías, requiere retries |
| JSON mode | Sintaxis garantizada | No garantiza schema |
| JSON Schema strict | Forma garantizada | Subconjunto de JSON Schema; primera request con schema nuevo puede tener latencia extra |
| Tool calling forzado | Funciona en muchos proveedores | Semántica menos clara, forzar tool no siempre disponible |
| Schema muy detallado | Salidas precisas | Más tokens, más difícil para el modelo |

---

## 📊 Números de referencia (aproximados)

| Referencia | Valor aprox. |
|---|---|
| JSON inválido solo con prompt | ~1–5% según modelo/tarea |
| JSON inválido con schema strict | ~0% (salvo truncamiento/refusal) |
| Fallos de reglas de negocio | depende del dominio; medir |
| Reintentos razonables | 1–3 |
| Overhead en tokens de un schema | ~100–1.000 tokens |

---

## 🎤 Preguntas de entrevista

**1. ¿Diferencia entre JSON mode y structured output con schema?**
JSON mode garantiza JSON sintácticamente válido; structured output con schema (constrained decoding) garantiza además que cumple el schema. Ninguno garantiza que los valores sean correctos.

**2. Si el proveedor garantiza el schema, ¿por qué validar con zod?**
Porque el schema de la API cubre forma, no reglas de negocio (rangos, formatos, referencias existentes), y porque hay casos como truncamiento o refusal. Además, defensa en profundidad: la salida del LLM es input no confiable.

**3. ¿Cómo implementas reintentos de validación?**
Parseo y valido; si falla, devuelvo al modelo los errores concretos de zod y pido corrección, con máximo 2–3 intentos. Truncamiento y refusal no se reintentan igual. Mido la tasa de reintentos.

**4. ¿Cómo evitas que el modelo invente campos obligatorios?**
Hago nullable lo que puede no existir, agrego campos de confianza o "found", y lo explico en el prompt. Un campo requerido sin escape fuerza la alucinación.

**5. ¿Importa el orden de los campos?**
Sí: el modelo genera secuencialmente. Un campo de razonamiento antes de la respuesta final mejora la calidad; ponerlo después es solo justificación a posteriori.

**6. ¿Cómo lo integras en NestJS?**
Un servicio genérico `generateStructured(schema, input)` que usa el schema zod como fuente para la API y la validación, devuelve el tipo inferido, emite métricas (latencia, tokens, reintentos) y lanza excepciones de dominio mapeadas por un filtro.

---

## 🔗 Relacionado

- [04 - Temperature y sampling](./04-temperature-y-sampling.md)
- [05 - Prompt engineering](./05-prompt-engineering.md)
- [08 - Function / tool calling](./08-function-tool-calling.md)
- [15 - Hallucinations](./15-hallucinations.md)
- [21 - Retries](./21-retries.md)
- [22 - Guardrails](./22-guardrails.md)
