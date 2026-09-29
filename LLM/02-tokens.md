# Tokens

Un **token** es la unidad mínima de texto que procesa un LLM. No es una palabra ni un carácter: es un fragmento producido por un **tokenizador** (normalmente variantes de *Byte Pair Encoding*, BPE). Palabras frecuentes suelen ser un solo token; palabras raras, nombres propios, código o idiomas menos representados se parten en varios.

Los tokens son **la moneda del sistema**: se factura por token, los límites de contexto se miden en tokens, los rate limits son tokens por minuto y la latencia crece con los tokens de salida. Un backend que no mide tokens no controla ni su costo ni su latencia.

**Por qué importa en producción:**
- **Costo** = `input_tokens × precio_in + output_tokens × precio_out`.
- **Contexto**: prompt + historial + documentos + salida deben caber en la ventana.
- **Rate limits**: ITPM/OTPM (tokens por minuto) suelen saturarse antes que RPM.
- El español y el código **consumen más tokens** que el inglés para el mismo contenido.

---

## ⚙️ Cómo funciona la tokenización

```
Texto:   "Tokenización en producción"

Tokens:  ["Token", "ización", " en", " produ", "cción"]
IDs:     [ 15001,    89123,   662,   30911,   47220 ]   (ids ilustrativos)
```

BPE en una línea: empieza con bytes/caracteres y **fusiona iterativamente los pares más frecuentes** del corpus de entrenamiento hasta llegar a un vocabulario de N tokens.

```
Corpus → pares frecuentes → merges
"t" "h" → "th"
"th" "e" → "the"
" " "the" → " the"      ← el espacio suele ir pegado al inicio del token
```

Detalles que muerden:
- **El espacio es parte del token**: `" hola"` y `"hola"` son tokens distintos.
- **Mayúsculas cuentan**: `"Hola"`, `"hola"` y `"HOLA"` tokenizan diferente.
- **Números** se parten raro: `"1234567"` puede ser 2–4 tokens → los LLM son malos haciendo aritmética "a ojo".
- **Cada modelo tiene su tokenizador**: el mismo texto da conteos distintos en Claude, GPT o Llama, e incluso entre generaciones del mismo proveedor.

---

## 🌍 Idioma, código y formato

```
Mismo contenido (aprox.):
Inglés:   "The user was not found"        → ~5 tokens
Español:  "No se encontró el usuario"     → ~6-8 tokens
JSON:     {"error":"user_not_found"}      → ~8-10 tokens (llaves, comillas)
Base64:   "dXNlcl9ub3RfZm91bmQ="          → ~10+ tokens (ruido para el modelo)
```

| Tipo de contenido | Relación aprox. |
|---|---|
| Inglés | ~4 caracteres por token, ~0,75 palabras por token |
| Español | ~3–3,5 caracteres por token (≈15–30% más tokens que inglés) |
| Código | ~3 caracteres por token (indentación, símbolos) |
| Idiomas no latinos (CJK, árabe…) | 1–3 caracteres por token, a veces peor |

> Aproximaciones. Para decisiones de costo o límite, **cuenta con la API**, no estimes.

---

## 🔢 Contar tokens correctamente

```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

// ✅ Conteo exacto con el tokenizador real del modelo (incluye system y tools)
const { input_tokens } = await client.messages.countTokens({
  model: "claude-sonnet-5",
  system: systemPrompt,
  tools,
  messages,
});

if (input_tokens > 150_000) {
  // recortar historial, resumir o rechazar antes de gastar
}
```

```typescript
// ❌ Estimar con length / 4 para decidir si algo cabe en contexto
if (text.length / 4 < 200_000) send(text); // falla con español, código, JSON

// ❌ Usar el tokenizador de otro proveedor (ej. tiktoken para Claude)
// Conteos distintos → cortes y costos mal calculados

// ✅ Estimación barata SOLO para métricas o pre-filtros, con margen
const roughTokens = Math.ceil(text.length / 3); // conservador para español
```

### Leer el uso real de cada respuesta

```typescript
const res = await client.messages.create({ model, max_tokens: 1024, messages });

const { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } =
  res.usage;

metrics.histogram("llm.tokens.input", input_tokens, { model, route: "summarize" });
metrics.histogram("llm.tokens.output", output_tokens, { model, route: "summarize" });
```

---

## 💰 Tokens → dinero

```
Ejemplo (precios ilustrativos): entrada $3/MTok, salida $15/MTok

Request típica de chat con RAG:
  system prompt         1.500 tokens
  documentos RAG        6.000 tokens
  historial            2.500 tokens
  pregunta                100 tokens
  ─────────────────────────────────
  input                10.100 tokens  → 10.100 × 3 / 1e6  = $0,0303
  output                  600 tokens  →    600 × 15 / 1e6 = $0,0090
                                                     total ≈ $0,039

× 1.000.000 requests/mes ≈ $39.000/mes
```

Observaciones:
- En apps con RAG o agentes, **el input domina** el costo → prompt caching y recorte de contexto dan el mayor ahorro.
- En generación larga (reportes, código), **el output domina** → limitar `max_tokens` y pedir concisión.

---

## 🔴 Problemas comunes

- **Truncamiento silencioso**: la respuesta llega con `stop_reason: "max_tokens"` y el código la usa como si estuviera completa (JSON roto, frase cortada).
- **Historial que crece sin control**: cada turno reenvía todo → costo cuadrático en conversaciones largas.
- **Payloads inflados**: mandar JSON completo con campos irrelevantes, HTML crudo, base64 o logs enteros.
- **Asumir que el conteo no cambia**: al migrar de modelo, el tokenizador puede cambiar y el mismo prompt costar 10–35% más.

```typescript
// ❌ Mandar la entidad completa de la DB
content: JSON.stringify(order) // 3.000 tokens: timestamps, ids internos, auditoría...

// ✅ Proyectar solo lo necesario
content: JSON.stringify({ id: order.id, status: order.status, items: order.items.map(i => i.sku) })
```

---

## ✅ Buenas prácticas

- **Cuenta con la API del proveedor** (`countTokens`) antes de enviar prompts grandes.
- **Registra `usage` por ruta/feature/tenant** → permite atribuir costos y detectar regresiones.
- **Presupuesta tokens** por request: límite de historial, de documentos RAG y `max_tokens`.
- **Comprime el input**: elimina HTML, espacios repetidos, campos inútiles; prefiere texto plano o Markdown sobre HTML.
- **Revisa `stop_reason`** siempre y trata `max_tokens` como error recuperable.
- **Re-mide al cambiar de modelo**: el tokenizador puede ser otro.

---

## ⚖️ Trade-offs

| Decisión | Ventaja | Costo |
|---|---|---|
| Más contexto (más docs RAG) | Menos alucinación por falta de datos | Más costo, más latencia, "lost in the middle" |
| JSON vs texto plano en el prompt | Estructura clara para el modelo | ~20–40% más tokens por llaves y comillas |
| Resumir historial | Menos tokens por turno | Pierde detalle, costo de la llamada de resumen |
| Estimar vs contar | Estimar es gratis e instantáneo | Contar es exacto pero es un round-trip extra |

---

## 📊 Números de referencia (aproximados)

| Referencia | Valor aprox. |
|---|---|
| 1 token (inglés) | ~4 caracteres / ~0,75 palabras |
| 1 token (español) | ~3–3,5 caracteres |
| 1.000 tokens | ~750 palabras en inglés, ~600–650 en español |
| 1 página de texto | ~500–800 tokens |
| Imagen en un modelo multimodal | ~1.000–2.000 tokens según resolución |
| Relación precio salida/entrada | ~4–5× |

---

## 🎤 Preguntas de entrevista

**1. ¿Qué es un token y por qué no es igual a una palabra?**
Es un fragmento de texto del vocabulario del tokenizador (BPE). Palabras comunes son 1 token; palabras raras, números o código se dividen en varios. En inglés ~4 caracteres por token; en español algo menos, así que el mismo contenido cuesta más.

**2. ¿Cómo estimas el costo de una feature con LLM?**
Mido tokens de entrada y salida promedio (y p95) con tráfico real o representativo, multiplico por el precio del modelo y por el volumen esperado. Separo input y output porque tienen precios distintos y considero el ahorro por prompt caching.

**3. ¿Por qué no usar `text.length / 4` para validar límites?**
Porque varía según idioma, código y formato. Para decisiones duras (cabe o no cabe) uso el endpoint de conteo del proveedor con el tokenizador real; la heurística solo sirve para métricas aproximadas.

**4. Una respuesta llega con JSON inválido cortado al final. ¿Qué pasó?**
Casi seguro `stop_reason: "max_tokens"`. Aumentar `max_tokens`, pedir salida más compacta, usar structured output y tratar ese stop_reason como error con reintento.

**5. ¿Cómo reduces tokens sin perder calidad?**
Proyectar solo campos útiles, limpiar HTML/ruido, recortar o resumir historial, limitar y rerankear chunks de RAG, prompt caching para el prefijo estable y `max_tokens` ajustado con instrucciones de concisión.

**6. ¿Por qué los LLM fallan en contar letras o hacer aritmética?**
Porque ven tokens, no caracteres ni dígitos individuales. "strawberry" puede ser 2–3 tokens, así que contar letras requiere razonar sobre algo que no "ve" directamente. Para cálculos exactos, dale una tool.

---

## 🔗 Relacionado

- [01 - ¿Qué es un LLM?](./01-que-es-un-llm.md)
- [03 - Context window](./03-context-window.md)
- [16 - Context management](./16-context-management.md)
- [18 - Cost optimization](./18-cost-optimization.md)
- [20 - Rate limits](./20-rate-limits.md)
- [27 - Prompt caching](./27-prompt-caching.md)
