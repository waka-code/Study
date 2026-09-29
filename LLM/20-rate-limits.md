# Rate Limits

Los proveedores de LLM limitan cuánto puedes consumir por unidad de tiempo, típicamente en varias dimensiones a la vez: **RPM** (requests por minuto), **TPM** (tokens por minuto, a veces separados en input TPM y output TPM) y a veces cuotas diarias o de gasto mensual. Al superarlos, la API responde **HTTP 429 Too Many Requests**.

**Por qué importa en producción:** el rate limit es un recurso **compartido por toda tu organización/API key**. Un job batch mal configurado o un tenant ruidoso puede agotar el TPM y tumbar el chat de todos los demás clientes. Además, en LLMs el límite que se golpea primero suele ser **TPM**, no RPM: pocas requests con contextos grandes lo agotan.

---

## ⚙️ Cómo funciona

```
Límites de la organización (ejemplo ilustrativo, por modelo):
  RPM        = 1.000
  Input TPM  = 400.000
  Output TPM = 80.000

Request de 8.000 tokens de input:
  400.000 / 8.000 = 50 requests/min  ← el TPM te limita mucho antes que el RPM
```

La mayoría de proveedores usan un algoritmo tipo **token bucket**: la capacidad se repone de forma continua, no se "resetea" al minuto exacto. Una ráfaga puede dar 429 aunque el promedio del minuto esté bajo el límite.

```
  capacidad ┤████████████░░░░░░░░   bucket se vacía con la ráfaga
            │            ↑
            │       ráfaga de 50 requests → 429
            │                   ▁▂▃▄▅▆▇█ se rellena gradualmente
            └──────────────────────────────▶ tiempo
```

### Headers de respuesta

Los proveedores informan el estado del límite en headers (nombres según proveedor):

```
Anthropic:
  anthropic-ratelimit-requests-remaining
  anthropic-ratelimit-input-tokens-remaining
  anthropic-ratelimit-output-tokens-remaining
  anthropic-ratelimit-tokens-reset          (timestamp RFC 3339)
  retry-after                                (segundos, en 429)

OpenAI:
  x-ratelimit-remaining-requests
  x-ratelimit-remaining-tokens
  x-ratelimit-reset-requests / x-ratelimit-reset-tokens
```

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const { data, response } = await client.messages
  .create({ model: 'claude-sonnet-5', max_tokens: 512, messages })
  .withResponse();

const remainingTokens = Number(response.headers.get('anthropic-ratelimit-input-tokens-remaining'));
metrics.gauge('llm.ratelimit.input_tokens_remaining', remainingTokens);
```

---

## 🔴 Problemas comunes

- **Tratar el 429 como error fatal** en lugar de señal de backpressure.
- **Reintentar inmediatamente** sin respetar `retry-after` → tormenta de retries que empeora el problema.
- **Un pool compartido sin aislamiento**: el job nocturno se come el TPM del chat en producción.
- **`Promise.all` sobre 5.000 items** → ráfaga instantánea de 429.
- **Ignorar el TPM de output**: `max_tokens` alto cuenta contra el límite (algunos proveedores estiman con `max_tokens` al admitir la request).
- **Varias réplicas del servicio**, cada una con su limitador en memoria → el límite real se multiplica por N réplicas.

---

## ✅ Estrategias

### 1️⃣ Respetar 429 y `retry-after`

El SDK de Anthropic ya reintenta 429 con backoff (`maxRetries`, por defecto 2) y respeta `retry-after`. Configúralo en vez de reimplementarlo. Detalle en [21-retries](./21-retries.md).

```typescript
const client = new Anthropic({ maxRetries: 4, timeout: 60_000 });

try {
  await client.messages.create(params);
} catch (err) {
  if (err instanceof Anthropic.RateLimitError) {
    // ✅ Tras agotar retries: degradar, encolar o responder 503 con Retry-After al cliente
    throw new ServiceUnavailableException('LLM saturado, reintenta en unos segundos');
  }
  throw err;
}
```

### 2️⃣ Limitador propio (token bucket distribuido)

Limita **antes** de llamar al proveedor, con estado compartido entre réplicas (Redis).

```typescript
import type { Redis } from 'ioredis';

// Token bucket atómico en Redis (Lua). Cuenta TOKENS de LLM, no solo requests.
const LUA = `
local key, capacity, refillPerSec, cost, now = KEYS[1], tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local b = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(b[1]) or capacity
local ts = tonumber(b[2]) or now
tokens = math.min(capacity, tokens + (now - ts) * refillPerSec)
if tokens < cost then
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('EXPIRE', key, 120)
  return math.ceil((cost - tokens) / refillPerSec * 1000)  -- ms a esperar
end
redis.call('HMSET', key, 'tokens', tokens - cost, 'ts', now)
redis.call('EXPIRE', key, 120)
return 0
`;

export class TokenBucket {
  constructor(private redis: Redis, private key: string, private tpm: number) {}

  async acquire(estimatedTokens: number): Promise<void> {
    for (;;) {
      const waitMs = (await this.redis.eval(
        LUA, 1, this.key,
        this.tpm, this.tpm / 60, estimatedTokens, Date.now() / 1000,
      )) as number;
      if (waitMs === 0) return;
      await new Promise((r) => setTimeout(r, waitMs + Math.random() * 100)); // jitter
    }
  }
}

// Uso: estimar tokens = input estimado + max_tokens
const estimate = Math.ceil(prompt.length / 4) + params.max_tokens;
await bucket.acquire(estimate);
```

Configura tu limitador **por debajo** del límite real (~80–90%) para dejar margen.

### 3️⃣ Colas y control de concurrencia

Para trabajo masivo, una cola con concurrencia y rate limit desacopla la ráfaga del proveedor:

```typescript
import { Queue, Worker } from 'bullmq';

const queue = new Queue('llm-jobs', { connection });

new Worker('llm-jobs', async (job) => processWithLLM(job.data), {
  connection,
  concurrency: 10,
  limiter: { max: 300, duration: 60_000 }, // ✅ 300 jobs/min en todo el cluster
});
```

```
  API (chat, prioridad alta) ──▶ carril interactivo ──┐
                                                       ├──▶ limitador ──▶ proveedor
  Jobs batch (prioridad baja) ──▶ cola con límite ────┘
```

- **Separar carriles**: tráfico interactivo vs batch, idealmente con **API keys / workspaces distintos** para aislar cuotas.
- Trabajo offline masivo → **Batch API** (límites separados, ver [18-cost-optimization](./18-cost-optimization.md)).

### 4️⃣ Cuotas por usuario / tenant

Protege al sistema de usuarios abusivos y distribuye la cuota justamente.

```typescript
@Injectable()
export class LlmQuotaGuard implements CanActivate {
  constructor(private readonly redis: Redis) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const { tenantId, plan } = req.user;
    const dailyLimit = plan === 'enterprise' ? 5_000_000 : 200_000; // tokens/día
    const key = `quota:${tenantId}:${new Date().toISOString().slice(0, 10)}`;

    const used = Number(await this.redis.get(key)) || 0;
    if (used >= dailyLimit) {
      throw new HttpException('Cuota diaria de IA agotada', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

// Tras la respuesta: sumar el consumo REAL (usage), no el estimado
await redis.incrby(key, res.usage.input_tokens + res.usage.output_tokens);
await redis.expire(key, 60 * 60 * 48);
```

Capas típicas: RPM por usuario (anti-abuso), tokens/día por tenant (plan comercial), presupuesto en USD por tenant (control de costo).

### 5️⃣ Degradación ante saturación

- Fallback a modelo más pequeño (otro límite, ver [21-retries](./21-retries.md)).
- Responder desde caché.
- Deshabilitar features no críticas (sugerencias, resúmenes automáticos).
- Devolver **429/503 con `Retry-After`** a tu cliente en vez de colgar la conexión.

---

## ⚖️ Trade-offs

| Estrategia | Pro | Contra |
|---|---|---|
| Solo retries del SDK | Simple | No previene ráfagas; varias réplicas compiten |
| Limitador en memoria | Rápido, sin dependencia | Incorrecto con N réplicas |
| Limitador en Redis | Límite global correcto | Latencia extra (~1 ms), punto de falla |
| Cola (BullMQ/SQS) | Absorbe ráfagas, prioriza | Latencia, no apto para respuesta inmediata |
| API keys separadas | Aislamiento real | Gestión de más cuotas y secretos |

---

## 📊 Números de referencia (aproximados)

- El límite que se golpea primero en apps con RAG: **TPM de input** casi siempre.
- Margen recomendado en limitador propio: **~80–90%** del límite oficial.
- Los límites suelen escalar por **tier** según gasto histórico; pedir aumento con anticipación a lanzamientos.
- `retry-after` típico en 429: **segundos** (1–60 s).

---

## 🎤 Preguntas de entrevista

**1. ¿Por qué el TPM suele ser más restrictivo que el RPM?**
Porque las requests LLM son grandes: con 8k tokens por request, un TPM de 400k da 50 req/min aunque el RPM sea 1.000. El dimensionamiento se hace en tokens.

**2. ¿Cómo evitas que un job batch afecte al chat en producción?**
Aislamiento: API key/workspace separado, cola con rate limit propio, prioridades, y para trabajo masivo Batch API. Nunca un `Promise.all` sin límite.

**3. Tienes 6 réplicas de NestJS. ¿Dónde pones el rate limiter?**
En un store compartido (Redis con script Lua atómico) o en un gateway/servicio central de LLM. Un limitador en memoria permitiría 6x el límite.

**4. ¿Qué haces al recibir un 429?**
Respeto `retry-after`, backoff exponencial con jitter, número máximo de intentos; si persiste, degrado (modelo alternativo, caché) o devuelvo 429/503 al cliente con `Retry-After`. Y lo mido: 429 frecuentes indican que hay que subir el tier o reducir consumo.

**5. ¿Cómo diseñas cuotas por tenant?**
Contadores en Redis por tenant y ventana (día/mes) en tokens o USD, con guard que bloquea antes de llamar y actualización con el `usage` real después. Distintos límites por plan, alertas al 80%.

**6. ¿Por qué estimar tokens antes de la request?**
Para descontar del bucket antes de llamar; si no, el limitador sólo reacciona después de gastar. Estimo con heurística (chars/4) o `countTokens`, más `max_tokens`, y luego reconcilio con el uso real.

---

## 🔗 Relacionado

- [02-tokens](./02-tokens.md)
- [18-cost-optimization](./18-cost-optimization.md)
- [19-latency](./19-latency.md)
- [21-retries](./21-retries.md)
- [31-observabilidad-llmops](./31-observabilidad-llmops.md)
- [34-arquitectura-llm-en-produccion](./34-arquitectura-llm-en-produccion.md)
