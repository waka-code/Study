# Retries

Las APIs de LLM fallan con más frecuencia que una API REST típica: sobrecarga del proveedor, rate limits, timeouts por respuestas largas, cortes de red a mitad de un stream. Una estrategia de **reintentos** correcta distingue qué errores vale la pena reintentar, espera de forma inteligente (**backoff exponencial con jitter**) y sabe cuándo rendirse y **degradar** (circuit breaker, fallback a otro modelo o proveedor).

**Por qué importa en producción:** sin retries, un 1–2% de errores transitorios llega al usuario. Con retries mal hechos, conviertes un pico del proveedor en una **tormenta de reintentos** que multiplica la carga, agota tu rate limit, duplica costo (cada intento se cobra si generó tokens) y dispara la latencia p99.

---

## ⚙️ Clasificación de errores

| Código | Significado | ¿Reintentar? |
|---|---|---|
| 400 | Request inválida (schema, contexto excedido) | ❌ No — arreglar la request |
| 401 / 403 | Auth / permisos | ❌ No |
| 404 | Modelo o recurso inexistente | ❌ No |
| 413 | Request demasiado grande | ❌ No (recortar) |
| 408 | Timeout del request | ✅ Sí |
| 409 | Conflicto (transitorio en algunos proveedores) | ✅ Con cautela |
| 429 | Rate limit | ✅ Sí, respetando `retry-after` |
| 500 / 502 / 503 / 504 | Error del servidor | ✅ Sí |
| 529 | Overloaded (Anthropic) | ✅ Sí, backoff más largo |
| Error de red / ECONNRESET | Conexión cortada | ✅ Sí |

Errores "semánticos" (el JSON no valida, el modelo se negó) no son errores HTTP: se reintentan con otra estrategia (re-prompt con el error, otro modelo), con un límite estricto. Ver [07-structured-output](./07-structured-output.md).

---

## ⚙️ Backoff exponencial con jitter

```
Sin jitter (todos los clientes sincronizados):
  t=0  ████████████ 1000 clientes fallan
  t=1s ████████████ 1000 reintentan a la vez → vuelven a fallar
  t=2s ████████████ ...  (thundering herd)

Con full jitter (espera aleatoria en [0, base·2^n]):
  t=0..1s  ▂▃▂▄▃▂▃▂   reintentos repartidos
  t=1..3s  ▁▂▁▂▁▂▁▂   el proveedor se recupera
```

```
delay(n) = random(0, min(cap, base × 2^n))     // "full jitter"
base = 500 ms, cap = 30 s
intento 1: 0–0.5 s | 2: 0–1 s | 3: 0–2 s | 4: 0–4 s ...
```

Si el servidor envía `retry-after`, **manda sobre el cálculo**.

---

## 🔴 Problemas comunes

```typescript
// ❌ Retry infinito, sin espera, reintenta TODO (incluso 400)
async function call(params) {
  while (true) {
    try { return await client.messages.create(params); }
    catch { /* again */ }
  }
}
```

- **Retries en varias capas** (SDK + tu wrapper + la cola + el cliente HTTP) → 3 × 3 × 3 = 27 intentos.
- Reintentar **errores no reintentables** (400 por contexto excedido nunca se va a arreglar solo).
- Sin **timeout total** (deadline): el usuario espera 2 minutos.
- **Efectos secundarios duplicados**: reintentar un paso de agente que ya ejecutó una tool (envió un email, cobró).
- Reintentar un **stream** que ya emitió texto al usuario → contenido duplicado.

---

## ✅ Implementación

### 1️⃣ Usa el retry del SDK primero

Los SDK de Anthropic y OpenAI ya reintentan conexiones fallidas, 408, 409, 429 y 5xx con backoff exponencial, y respetan `retry-after`.

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  maxRetries: 3,     // default: 2
  timeout: 60_000,   // por intento
});

// Override por request
await client.messages.create(params, { maxRetries: 0 }); // p. ej. si ya hay retry en la cola
```

### 2️⃣ Wrapper propio (cuando necesitas control: deadline, métricas, fallback)

```typescript
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true; // red / timeout
  if (err instanceof Anthropic.APIError) return err.status !== undefined && RETRYABLE.has(err.status);
  return false;
}

function retryAfterMs(err: unknown): number | undefined {
  if (!(err instanceof Anthropic.APIError)) return undefined;
  const h = err.headers?.get?.('retry-after');
  const s = h ? Number(h) : NaN;
  return Number.isFinite(s) ? s * 1000 : undefined;
}

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  { maxAttempts = 4, baseMs = 500, capMs = 20_000, deadlineMs = 45_000 } = {},
): Promise<T> {
  const deadline = Date.now() + deadlineMs;

  for (let attempt = 1; ; attempt++) {
    const signal = AbortSignal.timeout(Math.max(0, deadline - Date.now()));
    try {
      return await fn(signal);
    } catch (err) {
      const remaining = deadline - Date.now();
      if (!isRetryable(err) || attempt >= maxAttempts || remaining <= 0) throw err;

      const backoff = Math.random() * Math.min(capMs, baseMs * 2 ** (attempt - 1)); // full jitter
      const delay = Math.min(retryAfterMs(err) ?? backoff, remaining);
      metrics.increment('llm.retry', { attempt, status: (err as any).status ?? 'network' });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// Uso (desactivando el retry interno para no duplicar capas)
const res = await withRetry((signal) =>
  client.messages.create(params, { signal, maxRetries: 0 }),
);
```

### 3️⃣ Idempotencia

Una llamada al LLM en sí es "idempotente" (solo cuesta dinero), pero **lo que haces con la respuesta** no siempre.

```typescript
// ❌ Agente: el retry del paso completo vuelve a ejecutar la tool
await sendEmail(draft);            // se ejecutó
await client.messages.create(...); // falla → retry del paso → email duplicado

// ✅ Idempotency key por acción con efecto secundario
const key = `tool:${conversationId}:${toolUseId}`;
if (await redis.set(key, 'done', 'EX', 86_400, 'NX')) {
  await sendEmail(draft);
}
```

- Usa el `tool_use.id` que da el modelo como clave natural de idempotencia.
- En jobs de cola, guarda el resultado por `jobId` antes de ack; si el job se reprocesa, reutiliza el resultado.
- Streams: si falló después de emitir texto, no reintentes transparentemente; informa al cliente o reinicia la respuesta explícitamente.

### 4️⃣ Circuit breaker

Si el proveedor está caído, reintentar solo suma latencia. El breaker corta rápido y deja que el fallback actúe.

```
  CLOSED ──(tasa de error > 50% en 30 s)──▶ OPEN ──(tras 30 s)──▶ HALF-OPEN
    ▲                                        │ falla rápido           │
    └──────────(requests de prueba OK)───────┴──────(falla)───────────┘
```

```typescript
import CircuitBreaker from 'opossum';

const primary = new CircuitBreaker(
  (params: Anthropic.MessageCreateParamsNonStreaming) =>
    client.messages.create(params, { maxRetries: 1 }),
  {
    timeout: 30_000,
    errorThresholdPercentage: 50,
    resetTimeout: 30_000,
    volumeThreshold: 20,
    errorFilter: (err) => !isRetryable(err), // ✅ los 400 no abren el circuito
  },
);
```

### 5️⃣ Fallback entre modelos y proveedores

```
  request ──▶ [breaker A: claude-sonnet-5] ──falla──▶ [claude-haiku-4-5] ──falla──▶ [proveedor B] ──▶ [respuesta degradada / caché]
```

```typescript
type Attempt = { name: string; call: () => Promise<string> };

export async function completeWithFallback(prompt: string): Promise<{ text: string; via: string }> {
  const chain: Attempt[] = [
    { name: 'sonnet', call: () => callAnthropic('claude-sonnet-5', prompt) },
    { name: 'haiku', call: () => callAnthropic('claude-haiku-4-5', prompt) },
    { name: 'openai', call: () => callOpenAI('gpt-4.1-mini', prompt) },
  ];

  let lastErr: unknown;
  for (const a of chain) {
    try {
      return { text: await a.call(), via: a.name };
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err; // un 400 fallará igual en todos
      metrics.increment('llm.fallback', { from: a.name });
    }
  }
  throw lastErr;
}
```

Consideraciones del fallback multi-proveedor:
- **Prompts no son 100% portables**: el prompt del fallback debe tener sus propias evals.
- Diferencias en tool calling, structured output y tokenización → capa de abstracción (adapter).
- Revisar **acuerdos de datos** del proveedor B (ver [25-seguridad-de-datos](./25-seguridad-de-datos.md)).
- Loggear `via` para saber cuánto tráfico sale por el fallback.

---

## ⚖️ Trade-offs

| Decisión | Pro | Contra |
|---|---|---|
| Más intentos | Mayor tasa de éxito | Latencia p99, costo, carga al proveedor |
| Backoff largo | Menos presión | Usuario espera más |
| Circuit breaker | Falla rápido, protege | Puede abrir por un pico breve; tuning |
| Fallback a modelo pequeño | Disponibilidad | Calidad menor |
| Fallback multi-proveedor | Resiliencia real | Doble mantenimiento de prompts/evals, compliance |

---

## 📊 Números de referencia (aproximados)

- Tasa de errores transitorios en APIs LLM: **~0.1–2%**, con picos mayores en incidentes.
- Intentos razonables en tráfico interactivo: **2–3**; en jobs asíncronos: **5+** con backoff más largo.
- Base de backoff: **~0.5–1 s**; cap: **~20–60 s**.
- Deadline total en request interactivo: **acorde al timeout del gateway** (p. ej. < 30 s).

---

## 🎤 Preguntas de entrevista

**1. ¿Qué errores reintentas y cuáles no?**
Reintento red, timeouts, 408, 429, 5xx y 529. No reintento 400/401/403/404/413: son deterministas; reintentarlos solo gasta.

**2. ¿Por qué jitter?**
Sin jitter, los clientes que fallaron juntos reintentan juntos (thundering herd) y vuelven a tumbar el servicio. El jitter reparte la carga en el tiempo.

**3. ¿Qué pasa si hay retries en el SDK, en tu servicio y en la cola?**
Se multiplican. Defino una sola capa responsable (o reduzco las internas a 0–1) y un deadline total por operación.

**4. ¿Cómo garantizas idempotencia en un agente con tools?**
Idempotency key por tool call (el `tool_use.id`), guardado del resultado antes de continuar, y las tools con efectos secundarios diseñadas para aceptar la clave.

**5. ¿Para qué el circuit breaker si ya tengo retries?**
El retry asume que el error es transitorio; el breaker detecta que no lo es y corta rápido, evitando latencia inútil y carga extra, y activa el fallback.

**6. ¿Riesgos de hacer fallback a otro proveedor?**
Calidad distinta, prompts no portables, diferencias en tool calling y structured output, y compliance (dónde van los datos). Requiere evals y contrato de datos para ambos.

**7. Un stream se corta a mitad. ¿Reintentas?**
No de forma transparente si ya envié texto al cliente. Lo informo, y reinicio la generación completa o continúo pasando la respuesta parcial como prefill si el caso lo permite.

---

## 🔗 Relacionado

- [07-structured-output](./07-structured-output.md)
- [08-function-tool-calling](./08-function-tool-calling.md)
- [17-streaming](./17-streaming.md)
- [18-cost-optimization](./18-cost-optimization.md)
- [20-rate-limits](./20-rate-limits.md)
- [29-agentes-y-agentic-loops](./29-agentes-y-agentic-loops.md)
- [32-seleccion-de-modelos](./32-seleccion-de-modelos.md)
- [34-arquitectura-llm-en-produccion](./34-arquitectura-llm-en-produccion.md)
