# Prompt Caching

**Prompt caching** es la capacidad del proveedor de reutilizar el cómputo (el KV cache) de un **prefijo del prompt** que ya procesó en una request anterior. Si dos requests comparten exactamente los mismos primeros N tokens, la segunda no paga el prefill completo de esos N tokens: se cobran como "cache read", a una fracción del precio, y el TTFT baja mucho.

**Por qué importa en producción:** en casi toda app LLM real hay una parte grande y estable del prompt (system prompt, definiciones de tools, documentos, few-shot examples, historial de conversación) y una parte pequeña que cambia (el último mensaje). Cachear el prefijo puede reducir el costo de input en torno a un orden de magnitud y recortar segundos de latencia en prompts largos. Es probablemente la optimización con mejor relación esfuerzo/impacto.

---

## 🧠 Cómo funciona

El caché es por **prefijo exacto**. El proveedor hashea el contenido hasta un punto (breakpoint) y, si ya tiene el KV cache de ese prefijo, lo reutiliza.

```
Request 1:
[ tools | system (15k tokens) | doc (30k) | user: "¿qué dice la cláusula 4?" ]
 └──────────── se procesa y se ESCRIBE en caché ──────────┘   └─ normal ─┘

Request 2 (segundos después):
[ tools | system (15k tokens) | doc (30k) | user: "¿y la cláusula 7?" ]
 └──────────── CACHE HIT: se LEE, barato y rápido ────────┘   └─ normal ─┘
```

Reglas clave:
- **Prefijo exacto**: un solo byte distinto al inicio invalida todo lo que sigue.
- El orden de evaluación típico es `tools → system → messages`. Cambiar las tools invalida el system y los mensajes.
- Tiene **TTL** corto (en Anthropic, ~5 min por defecto, renovado en cada hit; opción de 1 hora con otro precio de escritura).
- Hay un **mínimo de tokens** cacheables (del orden de ~1k–4k según el modelo). Prompts cortos no se cachean.
- Es por organización/workspace; no se comparte entre clientes.

---

## 🧱 Orden estable del prompt

La regla de oro: **lo estable primero, lo variable al final**.

```
┌────────────────────────────────────┐  ▲ más estable
│ Tool definitions                   │  │
├────────────────────────────────────┤  │
│ System prompt (instrucciones)      │  │
├────────────────────────────────────┤  │
│ Contexto fijo (docs, few-shot)     │  │   ← breakpoint
├────────────────────────────────────┤  │
│ Historial de conversación          │  │   ← breakpoint (se mueve)
├────────────────────────────────────┤  │
│ Mensaje actual del usuario         │  ▼ más variable
└────────────────────────────────────┘
```

❌ Cosas que rompen el caché sin que te des cuenta:
```typescript
// ❌ Timestamp al inicio del system prompt: prefijo distinto en cada request
const system = `Fecha y hora actual: ${new Date().toISOString()}\nEres un asistente...`;

// ❌ Tools en orden no determinista (Object.keys de un Map construido async, etc.)
const tools = Object.values(registry); // orden puede variar entre deploys/instancias

// ❌ Inyectar el nombre del usuario en el system prompt
const system2 = `Estás hablando con ${user.name}. ${BASE_INSTRUCTIONS}`;
```

✅ Mover lo variable al final y serializar de forma determinista:
```typescript
// ✅ Instrucciones fijas arriba; datos dinámicos en el último mensaje
const system = BASE_INSTRUCTIONS; // constante, versionada
const tools = [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
const userTurn = `Fecha: ${today}\nUsuario: ${user.name}\n\n${question}`;
```

---

## 🛠️ `cache_control` en Anthropic

En la API de Anthropic marcas **breakpoints** explícitos con `cache_control` (hasta 4 por request). Todo lo anterior al breakpoint se cachea.

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function askAboutContract(contractText: string, history: Anthropic.MessageParam[], question: string) {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    tools: TOOLS, // estables y ordenadas
    system: [
      { type: 'text', text: LEGAL_ASSISTANT_INSTRUCTIONS },
      {
        type: 'text',
        text: `<contrato>\n${contractText}\n</contrato>`,
        cache_control: { type: 'ephemeral' }, // breakpoint 1: tools + system + contrato
      },
    ],
    messages: [...history, { role: 'user', content: question }],
  });

  // Verificar que el caché funciona
  const u = res.usage;
  console.log({
    cacheWrite: u.cache_creation_input_tokens, // pagado con recargo (primera vez)
    cacheRead: u.cache_read_input_tokens,      // pagado a fracción del precio
    uncached: u.input_tokens,                  // input normal después del breakpoint
    output: u.output_tokens,
  });
  return res;
}
```

### Conversaciones multi-turno: breakpoint móvil

```typescript
// ✅ Marcar el último bloque del último mensaje para que el historial se cachee incrementalmente
function withCacheBreakpoint(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const copy = structuredClone(messages);
  const last = copy[copy.length - 1];
  if (typeof last.content === 'string') {
    last.content = [{ type: 'text', text: last.content, cache_control: { type: 'ephemeral' } }];
  } else {
    const block = last.content[last.content.length - 1] as any;
    block.cache_control = { type: 'ephemeral' };
  }
  return copy;
}
```

En el turno siguiente, el prefijo (todo el historial previo) ya está cacheado y solo se paga completo el mensaje nuevo.

> TTL extendido: `cache_control: { type: 'ephemeral', ttl: '1h' }`. Útil para tráfico espaciado (ej. un usuario que vuelve cada 15 min); la escritura cuesta más que la de 5 min.

### OpenAI y otros

OpenAI aplica caché de prefijos **automáticamente** para prompts por encima de un tamaño mínimo (no hay `cache_control`), y reporta `usage.prompt_tokens_details.cached_tokens`. Las mismas reglas de orden estable aplican. Gemini tiene "context caching" explícito con recursos de caché y TTL.

---

## 💰 Impacto en costo y latencia

Modelo de precios aproximado (Anthropic, relativo al precio base de input):

| Tipo de token | Precio relativo (aprox.) |
|---------------|--------------------------|
| Input normal | 1× |
| Cache write (TTL 5 min) | ~1.25× |
| Cache write (TTL 1 h) | ~2× |
| Cache read | ~0.1× |

```
Ejemplo: prefijo de 50k tokens, 20 preguntas en 5 minutos

Sin caché:   20 × 50k × 1.0            = 1.000k tokens-equivalentes
Con caché:   1 × 50k × 1.25 + 19 × 50k × 0.1 = 62.5k + 95k ≈ 157k
Ahorro:      ~85% del costo de input del prefijo
```

Latencia: el prefill de un prefijo cacheado es mucho más rápido; con prompts de decenas de miles de tokens el TTFT puede bajar de varios segundos a menos de uno (aproximado, depende del modelo y la carga).

**Cuándo NO compensa:** prefijos que se usan una sola vez (pagas el recargo de escritura sin reutilizar), o prompts por debajo del mínimo.

---

## 🆚 Prompt caching vs caché de respuestas vs caché semántica

| | Prompt caching | Caché de respuestas (exacta) | Caché semántica |
|---|---|---|---|
| Qué se guarda | KV cache del prefijo (en el proveedor) | La respuesta completa (en tu Redis) | Respuesta indexada por embedding de la pregunta |
| Clave | Prefijo exacto de tokens | Hash del prompt completo + parámetros | Similitud coseno > umbral |
| ¿Se llama al LLM? | Sí (pero más barato) | No | No |
| Salida | Nueva, adaptada a la pregunta | Idéntica a la anterior | La de otra pregunta "parecida" |
| Riesgo | Casi ninguno (resultado equivalente) | Respuestas obsoletas | **Falsos positivos**: responder otra cosa |
| Dónde vive | Proveedor | Tu infra | Tu infra + vector store |
| Ideal para | System prompts largos, RAG, chat multi-turno | Prompts deterministas repetidos (clasificación, FAQs) | FAQs con mucha paráfrasis, tolerantes a imprecisión |

```typescript
// Caché de respuestas exacta (tu lado), complementaria al prompt caching
import { createHash } from 'node:crypto';

async function cachedCompletion(params: Anthropic.MessageCreateParamsNonStreaming) {
  const key = 'llm:resp:' + createHash('sha256').update(JSON.stringify(params)).digest('hex');
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  const res = await anthropic.messages.create(params);
  await redis.set(key, JSON.stringify(res), 'EX', 3600);
  return res;
}
```

⚠️ La caché semántica en multi-tenant debe **particionar por tenant y permisos**: nunca devolver a un usuario una respuesta generada con documentos que no puede ver.

---

## 🔴 Problemas típicos

- **Hit rate 0% sin saber por qué**: algo dinámico en el prefijo (fecha, UUID de request, orden de tools, JSON con claves no ordenadas).
- **Cambios de deploy**: cambiar una coma del system prompt invalida el caché de todos los usuarios (spike de costo y latencia tras deploy).
- **Tráfico espaciado**: con TTL de 5 min, un usuario que pregunta cada 10 min nunca pega en caché.
- **Breakpoint mal ubicado**: después de contenido variable → no se reutiliza.

---

## ✅ Buenas prácticas

✅ Prefijo estable: tools ordenadas, system prompt constante y versionado
✅ Datos dinámicos (fecha, usuario, request id) en el último mensaje
✅ Breakpoint tras el contexto grande y otro móvil al final del historial
✅ Monitorear `cache_read_input_tokens / total_input` como métrica (hit rate)
✅ Serialización determinista de JSON inyectado en el prompt
✅ Considerar TTL de 1 h para sesiones con pausas largas
✅ Combinar con caché de respuestas para requests repetidas idénticas

---

## 📊 Números de referencia (aproximados)

| Concepto | Valor aproximado |
|----------|------------------|
| TTL por defecto (Anthropic) | ~5 min, se renueva con cada hit |
| Breakpoints por request (Anthropic) | hasta 4 |
| Mínimo cacheable | ~1k–4k tokens según modelo |
| Descuento en lectura | ~90% sobre input normal |
| Hit rate objetivo en chat con system largo | >70–80% |

---

## 🎤 Preguntas de entrevista

**1. ¿Qué es prompt caching y en qué se diferencia de cachear respuestas?**
Reutiliza el cómputo de un prefijo idéntico en el proveedor; el modelo igual genera una respuesta nueva. Cachear respuestas evita la llamada completa y devuelve la misma salida; solo sirve si el prompt completo se repite.

**2. Tu hit rate de caché es 0%. ¿Qué revisas?**
Contenido dinámico en el prefijo (timestamps, IDs, nombre de usuario), orden no determinista de tools o claves JSON, breakpoint después de contenido variable, prompt bajo el mínimo, o TTL expirado por tráfico espaciado. Lo verifico con `cache_creation_input_tokens` vs `cache_read_input_tokens`.

**3. ¿Cómo estructurarías el prompt de un chatbot RAG para maximizar caché?**
Tools y system constantes primero, luego contexto estable, historial con breakpoint móvil, y al final los chunks recuperados + la pregunta (lo más variable). Si los chunks cambian por pregunta, van después del breakpoint.

**4. ¿Cuándo el prompt caching aumenta el costo?**
Cuando el prefijo se escribe pero no se reutiliza antes del TTL: pagas el recargo de escritura sin lecturas.

**5. ¿Qué riesgos tiene la caché semántica?**
Falsos positivos (preguntas parecidas con respuestas distintas: "cancelar pedido" vs "cancelar suscripción"), fugas entre tenants si no se particiona, y respuestas obsoletas. Requiere umbral conservador, partición por tenant/permisos e invalidación.

**6. ¿Qué pasa con el caché cuando despliegas un cambio en el system prompt?**
Se invalida para todos; hay un pico de costo y TTFT hasta que se re-escribe. Conviene versionar prompts, desplegar cambios agrupados y monitorear el hit rate post-deploy.

---

## 🔗 Relacionado

- [03-context-window](./03-context-window.md)
- [06-system-user-prompts](./06-system-user-prompts.md)
- [16-context-management](./16-context-management.md)
- [18-cost-optimization](./18-cost-optimization.md)
- [19-latency](./19-latency.md)
- [26-transformers-y-atencion](./26-transformers-y-atencion.md)
- [34-arquitectura-llm-en-produccion](./34-arquitectura-llm-en-produccion.md)
