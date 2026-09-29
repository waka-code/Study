# Temperature y Sampling

En cada paso, el LLM produce una **distribución de probabilidad** sobre todo su vocabulario para el siguiente token. El **sampling** es la estrategia para elegir un token de esa distribución. Los parámetros **temperature**, **top-p** y **top-k** modifican esa distribución antes de elegir; **max tokens** y **stop sequences** controlan cuándo se detiene la generación.

Estos parámetros definen el balance entre **determinismo** (misma entrada → salida parecida) y **diversidad/creatividad**. En backend, casi siempre queremos lo primero: extracción, clasificación, generación de JSON o código se benefician de sampling conservador.

**Por qué importa en producción:**
- Temperature alta en tareas de extracción → **salidas inconsistentes y más errores de formato**.
- `max_tokens` mal dimensionado → **respuestas truncadas** o costos/latencias descontrolados.
- Aun con temperature 0, **la salida no es 100% determinista** (batching en GPU, punto flotante, cambios de infraestructura).
- En modelos recientes con razonamiento, algunos proveedores **ya no aceptan** parámetros de sampling (retornan 400): el control se hace vía prompt, *effort* o structured output.

---

## 🎲 Cómo funciona

```
Logits del modelo para el próximo token después de "El cielo es"

token      logit   softmax(T=1)   softmax(T=0.2)   softmax(T=1.5)
" azul"     5.0       0.71           0.99             0.52
" gris"     3.8       0.21           0.01             0.23
" rojo"     2.0       0.04           0.00             0.10
" verde"    1.5       0.02           0.00             0.08
...                   ...            ...              ...

softmax_T(z_i) = exp(z_i / T) / Σ exp(z_j / T)
```

- **T → 0**: casi siempre el token más probable (*greedy*). Determinista en la práctica.
- **T = 1**: distribución "natural" del modelo.
- **T > 1**: aplana la distribución → más aleatorio, más incoherencias.

### Pipeline de sampling

```
logits ──► / temperature ──► top-k (quedarse con K mejores)
       ──► top-p (quedarse con el menor set que sume ≥ p)
       ──► renormalizar ──► sortear ──► token
       ──► ¿es stop sequence / fin de turno / max_tokens? ──► parar o repetir
```

### Top-k

Solo considera los **K tokens más probables**. `top_k = 1` equivale a greedy. Corta la "cola larga" de tokens improbables sin importar cuán plana esté la distribución.

### Top-p (nucleus sampling)

Considera el **conjunto mínimo de tokens cuya probabilidad acumulada ≥ p**. Es adaptativo:

```
Distribución concentrada:  " azul" 0.95  → con p=0.9 solo queda " azul"
Distribución plana:        10 tokens de ~0.1 → con p=0.9 quedan ~9
```

> Recomendación general de los proveedores: **ajusta temperature o top-p, no ambos**.

---

## 🛑 Max tokens y stop sequences

### `max_tokens`

Límite **duro** de tokens de salida. Al alcanzarlo, el modelo se corta a mitad de frase y `stop_reason` es `"max_tokens"`. No hace que el modelo sea más conciso: **solo lo corta**.

```typescript
const res = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Resume este documento: ..." }],
});

switch (res.stop_reason) {
  case "end_turn":      break;                              // terminó normalmente
  case "max_tokens":    throw new TruncatedResponseError(); // incompleto
  case "stop_sequence": break;                              // res.stop_sequence indica cuál
  case "tool_use":      break;                              // quiere llamar una tool
  case "refusal":       throw new RefusalError();           // el modelo declinó
}
```

### Stop sequences

Strings que, al generarse, **detienen la generación** (y no se incluyen en la salida).

```typescript
const res = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 500,
  stop_sequences: ["</respuesta>"],
  messages: [{
    role: "user",
    content: "Responde dentro de <respuesta>...</respuesta> y nada más: ¿qué es un deadlock?",
  }],
});

if (res.stop_reason === "stop_sequence") {
  console.log("Se detuvo en:", res.stop_sequence); // "</respuesta>"
}
```

Usos: cortar después de un bloque delimitado, evitar que el modelo "siga hablando", simular turnos en prompts de completado. Hoy, para formato estructurado, **structured output es preferible**.

---

## 💻 Ejemplos de configuración

```typescript
// ✅ Extracción / clasificación (modelo que acepta sampling)
await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 256,
  temperature: 0,
  messages: [{ role: "user", content: `Clasifica el ticket: ${ticket}` }],
});

// ✅ Brainstorming / copywriting
await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  temperature: 0.9,
  messages: [{ role: "user", content: "Dame 10 nombres para un producto de pagos" }],
});

// ✅ Equivalente en OpenAI (Chat Completions)
await openai.chat.completions.create({
  model: "gpt-4.1-mini",
  temperature: 0,
  max_tokens: 256,
  stop: ["</respuesta>"],
  messages: [{ role: "user", content: prompt }],
});
```

```typescript
// ❌ Pasar temperature a un modelo que no lo soporta
await client.messages.create({ model: "claude-sonnet-5", temperature: 0, /* ... */ });
// → 400 en modelos de razonamiento recientes que eliminaron los parámetros de sampling.
// ✅ Controlar consistencia con instrucciones claras, ejemplos y structured output.
```

```typescript
// ❌ Temperature alta + JSON "a mano"
temperature: 1.2 // → claves inventadas, comillas rotas, texto extra fuera del JSON

// ❌ Subir top_k y top_p y temperature a la vez "para más creatividad"
// → interacciones difíciles de razonar; ajusta UN parámetro y mide.
```

---

## 🔴 Mitos y problemas

| Mito | Realidad |
|---|---|
| "Temperature 0 = determinista" | Casi; pueden variar tokens por no determinismo numérico y de infraestructura |
| "Temperature baja = menos alucinaciones" | Reduce variabilidad, no hace al modelo más veraz. Si no sabe, alucina igual (de forma consistente) |
| "`max_tokens` bajo = respuestas concisas" | Solo trunca. La concisión se pide en el prompt |
| "Usar seed garantiza reproducibilidad" | Donde existe, es *best effort*; cambios de backend rompen la reproducibilidad |

---

## ✅ Buenas prácticas

- **Tareas deterministas** (extracción, clasificación, SQL, JSON): temperature 0–0,3 o default + structured output.
- **Tareas creativas**: temperature 0,7–1,0; nunca combines con parsing estricto sin schema.
- **Dimensiona `max_tokens`** según el percentil 99 real de la tarea más margen; no uses el máximo "por si acaso" en requests sin streaming (timeouts).
- **Maneja todos los `stop_reason`** explícitamente.
- **No persigas determinismo total**: diseña para tolerar variación (validación, evals con múltiples muestras).
- Si necesitas **diversidad controlada** (ej. generar variantes), prefiere N llamadas con temperature moderada y deduplicar.
- Documenta y **versiona los parámetros** junto al prompt; son parte del "código".

---

## ⚖️ Trade-offs

| Parámetro | Bajo | Alto |
|---|---|---|
| Temperature | Consistente, repetitivo, "seguro" | Diverso, creativo, más errores |
| Top-p | Solo tokens muy probables | Incluye opciones menos probables |
| Top-k | Muy restrictivo | Casi sin efecto |
| Max tokens | Barato, rápido, riesgo de truncar | Permite respuestas largas, más costo/latencia potencial |

---

## 📊 Números de referencia (aproximados)

| Caso de uso | Temperature sugerida (aprox.) |
|---|---|
| Extracción, clasificación, JSON, SQL | 0 – 0,2 |
| Q&A factual, RAG | 0 – 0,5 |
| Chat general | 0,5 – 0,8 |
| Escritura creativa, ideas | 0,8 – 1,0 |
| Top-p típico | 0,9 – 0,95 |
| Top-k típico (si se usa) | 20 – 100 |
| `max_tokens` para clasificación | ~50 – 256 |
| `max_tokens` para respuestas de chat | ~1k – 4k |

---

## 🎤 Preguntas de entrevista

**1. ¿Qué hace la temperature matemáticamente?**
Divide los logits por T antes del softmax. T<1 concentra la probabilidad en los tokens más probables; T>1 la aplana. T→0 equivale a greedy decoding.

**2. Diferencia entre top-k y top-p.**
Top-k toma un número fijo de candidatos; top-p toma los necesarios para acumular probabilidad p, adaptándose a cuán segura está la distribución. Top-p suele ser más robusto.

**3. ¿Temperature 0 garantiza la misma salida siempre?**
No. Hay no determinismo por batching, operaciones de punto flotante en paralelo y cambios de infraestructura o versión del modelo. Hay que diseñar para tolerar variaciones.

**4. Tu JSON llega cortado a veces. ¿Qué revisas?**
`stop_reason === "max_tokens"`. Subo `max_tokens`, pido salida más compacta, uso structured output y trato ese caso como error con reintento o degradación.

**5. ¿Para qué sirven las stop sequences hoy?**
Para cortar la generación al encontrar un delimitador (ej. cierre de tag) y ahorrar tokens. Para formato estructurado prefiero structured output/JSON schema, que es más robusto.

**6. ¿Bajar la temperature reduce alucinaciones?**
Reduce la variabilidad, no la falta de conocimiento. El remedio real es darle contexto (RAG), permitir "no sé" y validar.

**7. Un modelo nuevo rechaza `temperature` con 400. ¿Cómo controlas la consistencia?**
Instrucciones precisas, few-shot, structured output con schema, niveles de *effort*/razonamiento cuando el proveedor los ofrece y evals que midan la variación entre corridas.

---

## 🔗 Relacionado

- [01 - ¿Qué es un LLM?](./01-que-es-un-llm.md)
- [02 - Tokens](./02-tokens.md)
- [05 - Prompt engineering](./05-prompt-engineering.md)
- [07 - Structured output](./07-structured-output.md)
- [15 - Hallucinations](./15-hallucinations.md)
- [23 - Evaluación de respuestas](./23-evaluacion-de-respuestas.md)
