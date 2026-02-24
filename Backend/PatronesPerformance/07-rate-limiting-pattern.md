# Rate Limiting Pattern

Restringe el número de solicitudes permitidas en un periodo de tiempo para proteger el rendimiento y evitar abusos. Común en APIs públicas.

**Ventajas:**
- Previene ataques de denegación de servicio.
- Protege recursos críticos.
- Garantiza disponibilidad del servicio.

**Trade-off:**
- Puede afectar usuarios legítimos en picos de tráfico.
- Requiere gestión de límites y excepciones.
- Necesita almacenamiento de estado (Redis, memoria).

---

## 📊 Algoritmos de Rate Limiting

### 1️⃣ Fixed Window (Ventana Fija)

Cuenta las solicitudes en intervalos de tiempo fijos (ej: por minuto).

**Cómo funciona:**
```
Minuto 0 (00:00 - 00:59): Límite 100 requests
├─ Request 1 ✅
├─ Request 2 ✅
├─ ...
├─ Request 100 ✅
└─ Request 101 ❌ (rechazada)

Minuto 1 (01:00 - 01:59): Contador reinicia a 0
├─ Request 1 ✅
└─ ...
```

**Ventajas:**
- Simple de implementar
- Bajo uso de memoria
- Fácil de entender

**Desventajas:**
- **Problema de borde:** 200 requests posibles en 2 segundos
  ```
  00:59 → 100 requests ✅
  01:00 → 100 requests ✅ (contador reiniciado)
  Total: 200 requests en 1 segundo
  ```

**Implementación Node.js:**
```javascript
const express = require('express');
const app = express();

// Almacenamiento en memoria
const requestCounts = new Map();

const LIMIT = 100;
const WINDOW_MS = 60000; // 1 minuto

function fixedWindowRateLimiter(req, res, next) {
    const userId = req.ip; // o req.user.id
    const now = Date.now();
    const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;

    const key = `${userId}:${windowStart}`;
    const count = requestCounts.get(key) || 0;

    if (count >= LIMIT) {
        return res.status(429).json({
            error: 'Too Many Requests',
            retryAfter: WINDOW_MS - (now % WINDOW_MS)
        });
    }

    requestCounts.set(key, count + 1);

    // Limpiar ventanas antiguas
    setTimeout(() => requestCounts.delete(key), WINDOW_MS);

    next();
}

app.use(fixedWindowRateLimiter);
```

**Implementación C#:**
```csharp
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

public class FixedWindowRateLimiter
{
    private readonly ConcurrentDictionary<string, int> _counts = new();
    private const int Limit = 100;
    private const int WindowMs = 60000; // 1 minuto

    public bool AllowRequest(string userId)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowStart = (now / WindowMs) * WindowMs;
        var key = $"{userId}:{windowStart}";

        var count = _counts.GetOrAdd(key, 0);

        if (count >= Limit)
            return false;

        _counts[key] = count + 1;

        // Limpiar después de la ventana
        Task.Delay(WindowMs).ContinueWith(_ => _counts.TryRemove(key, out _));

        return true;
    }
}

// Middleware
app.Use(async (context, next) =>
{
    var limiter = context.RequestServices.GetRequiredService<FixedWindowRateLimiter>();
    var userId = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    if (!limiter.AllowRequest(userId))
    {
        context.Response.StatusCode = 429;
        await context.Response.WriteAsJsonAsync(new { error = "Too Many Requests" });
        return;
    }

    await next();
});
```

---

### 2️⃣ Sliding Window (Ventana Deslizante)

Cuenta las solicitudes en una ventana de tiempo que se mueve continuamente.

**Cómo funciona:**
```
Ventana: últimos 60 segundos desde ahora

12:00:00 → Cuenta requests entre 11:59:00 y 12:00:00
12:00:01 → Cuenta requests entre 11:59:01 y 12:00:01
12:00:02 → Cuenta requests entre 11:59:02 y 12:00:02
```

**Ventajas:**
- ✅ Soluciona el problema de borde de Fixed Window
- ✅ Distribución más uniforme de las solicitudes
- ✅ Límite más preciso

**Desventajas:**
- Más complejo de implementar
- Mayor uso de memoria (almacena timestamps)

**Implementación Node.js:**
```javascript
const requestTimestamps = new Map();

const LIMIT = 100;
const WINDOW_MS = 60000; // 1 minuto

function slidingWindowRateLimiter(req, res, next) {
    const userId = req.ip;
    const now = Date.now();

    // Obtener timestamps del usuario
    if (!requestTimestamps.has(userId)) {
        requestTimestamps.set(userId, []);
    }

    const timestamps = requestTimestamps.get(userId);

    // Filtrar solo los últimos 60 segundos
    const recentTimestamps = timestamps.filter(
        timestamp => now - timestamp < WINDOW_MS
    );

    if (recentTimestamps.length >= LIMIT) {
        const oldestTimestamp = Math.min(...recentTimestamps);
        const retryAfter = WINDOW_MS - (now - oldestTimestamp);

        return res.status(429).json({
            error: 'Too Many Requests',
            retryAfter: Math.ceil(retryAfter / 1000)
        });
    }

    // Agregar timestamp actual
    recentTimestamps.push(now);
    requestTimestamps.set(userId, recentTimestamps);

    next();
}

app.use(slidingWindowRateLimiter);
```

**Implementación C#:**
```csharp
using System.Collections.Concurrent;

public class SlidingWindowRateLimiter
{
    private readonly ConcurrentDictionary<string, List<long>> _timestamps = new();
    private const int Limit = 100;
    private const int WindowMs = 60000;

    public bool AllowRequest(string userId)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var timestamps = _timestamps.GetOrAdd(userId, _ => new List<long>());

        lock (timestamps)
        {
            // Remover timestamps fuera de la ventana
            timestamps.RemoveAll(ts => now - ts >= WindowMs);

            if (timestamps.Count >= Limit)
                return false;

            timestamps.Add(now);
            return true;
        }
    }
}
```

---

### 3️⃣ Token Bucket (Cubo de Tokens)

Algoritmo que permite ráfagas controladas de tráfico.

**Cómo funciona:**
```
Cubo con capacidad máxima de tokens
├─ Se añaden N tokens por segundo
├─ Cada request consume 1 token
└─ Si no hay tokens, rechazar request

Ejemplo: 10 tokens/seg, capacidad 100
├─ Permite ráfaga de 100 requests
└─ Luego 10 requests/segundo sostenido
```

**Implementación Node.js:**
```javascript
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;        // tokens máximos
        this.tokens = capacity;          // tokens actuales
        this.refillRate = refillRate;    // tokens/segundo
        this.lastRefill = Date.now();
    }

    refill() {
        const now = Date.now();
        const timePassed = (now - this.lastRefill) / 1000;
        const tokensToAdd = timePassed * this.refillRate;

        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    consume(tokens = 1) {
        this.refill();

        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }

        return false;
    }
}

const buckets = new Map();

function tokenBucketRateLimiter(req, res, next) {
    const userId = req.ip;

    if (!buckets.has(userId)) {
        buckets.set(userId, new TokenBucket(100, 10)); // 100 capacity, 10/sec
    }

    const bucket = buckets.get(userId);

    if (!bucket.consume(1)) {
        return res.status(429).json({
            error: 'Too Many Requests',
            retryAfter: 1
        });
    }

    next();
}

app.use(tokenBucketRateLimiter);
```

---

## 🔴 Usando Redis (Producción)

Para sistemas distribuidos, usa Redis en lugar de memoria local:

**Node.js con Redis:**
```javascript
const redis = require('redis');
const client = redis.createClient();

async function redisRateLimiter(req, res, next) {
    const userId = req.ip;
    const key = `rate_limit:${userId}`;
    const limit = 100;
    const window = 60; // segundos

    const current = await client.incr(key);

    if (current === 1) {
        // Primera solicitud, establecer expiración
        await client.expire(key, window);
    }

    if (current > limit) {
        const ttl = await client.ttl(key);
        return res.status(429).json({
            error: 'Too Many Requests',
            retryAfter: ttl
        });
    }

    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', limit - current);

    next();
}
```

**C# con Redis:**
```csharp
using StackExchange.Redis;

public class RedisRateLimiter
{
    private readonly IDatabase _redis;
    private const int Limit = 100;
    private const int WindowSeconds = 60;

    public RedisRateLimiter(IConnectionMultiplexer redis)
    {
        _redis = redis.GetDatabase();
    }

    public async Task<bool> AllowRequestAsync(string userId)
    {
        var key = $"rate_limit:{userId}";
        var current = await _redis.StringIncrementAsync(key);

        if (current == 1)
        {
            await _redis.KeyExpireAsync(key, TimeSpan.FromSeconds(WindowSeconds));
        }

        return current <= Limit;
    }
}
```

---

## 📊 Comparación de Algoritmos

| Algoritmo | Precisión | Complejidad | Memoria | Ráfagas | Uso |
|-----------|-----------|-------------|---------|---------|-----|
| **Fixed Window** | Baja | Simple | Baja | ❌ No controladas | APIs simples |
| **Sliding Window** | Alta | Media | Alta | ✅ Controladas | APIs críticas |
| **Token Bucket** | Media | Media | Media | ✅ Permitidas | CDNs, APIs flexibles |

---

## 💡 Headers HTTP Estándar

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000

HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000030
```

---

## 🎯 Mejores Prácticas

✅ Usar Redis en producción (estado compartido)
✅ Incluir headers `X-RateLimit-*`
✅ Devolver código `429 Too Many Requests`
✅ Usar `Retry-After` header
✅ Limitar por usuario/IP/API key
✅ Diferentes límites por endpoint crítico
✅ Monitorear y ajustar límites según uso real

---

## 🔗 Relación con Otros Patrones

- **Throttling Pattern**: Controla la velocidad de procesamiento
- **Circuit Breaker**: Protege servicios externos
- **Queue-Based Load Leveling**: Suaviza picos de carga

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
