# Query Caching Avanzado

Estrategias para cachear resultados de consultas a base de datos y reducir carga en PostgreSQL/MySQL.

---

## Patrón Cache-Aside (Lazy Loading)

El patrón más común: **verificar cache → si no existe, consultar DB → guardar en cache**.

### Node.js con ioredis

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class UserRepository {
    async getUserById(userId) {
        const cacheKey = `user:${userId}`;

        // 1. Intentar obtener de cache
        const cached = await redis.get(cacheKey);
        if (cached) {
            console.log('Cache HIT');
            return JSON.parse(cached);
        }

        console.log('Cache MISS');

        // 2. Si no existe, consultar DB
        const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

        // 3. Guardar en cache (1 hora)
        await redis.setex(cacheKey, 3600, JSON.stringify(user));

        return user;
    }
}
```

---

### C# con StackExchange.Redis

```csharp
using StackExchange.Redis;
using System.Text.Json;

public class UserRepository
{
    private readonly IDatabase _redis;
    private readonly DbContext _db;

    public UserRepository(IConnectionMultiplexer redis, DbContext db)
    {
        _redis = redis.GetDatabase();
        _db = db;
    }

    public async Task<User> GetUserByIdAsync(int userId)
    {
        var cacheKey = $"user:{userId}";

        // 1. Intentar obtener de cache
        var cached = await _redis.StringGetAsync(cacheKey);
        if (!cached.IsNullOrEmpty)
        {
            Console.WriteLine("Cache HIT");
            return JsonSerializer.Deserialize<User>(cached);
        }

        Console.WriteLine("Cache MISS");

        // 2. Consultar DB
        var user = await _db.Users.FindAsync(userId);

        // 3. Guardar en cache (1 hora)
        var serialized = JsonSerializer.Serialize(user);
        await _redis.StringSetAsync(cacheKey, serialized, TimeSpan.FromHours(1));

        return user;
    }
}
```

---

## Cachear Listados con Paginación

```javascript
class ProductRepository {
    async getProducts(page = 1, limit = 10) {
        const cacheKey = `products:list:page:${page}:limit:${limit}`;

        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const offset = (page - 1) * limit;
        const products = await db.query(
            'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        // Cache por 5 minutos
        await redis.setex(cacheKey, 300, JSON.stringify(products));

        return products;
    }
}
```

---

## Cachear Queries Complejas

```javascript
class AnalyticsRepository {
    async getDashboardStats(userId) {
        const cacheKey = `dashboard:stats:${userId}`;

        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        // Query costosa con múltiples JOINs y agregaciones
        const stats = await db.query(`
            SELECT
                u.id,
                COUNT(DISTINCT o.id) as total_orders,
                SUM(o.total) as total_spent,
                AVG(r.rating) as avg_rating
            FROM users u
            LEFT JOIN orders o ON o.user_id = u.id
            LEFT JOIN reviews r ON r.user_id = u.id
            WHERE u.id = $1
            GROUP BY u.id
        `, [userId]);

        // Cache por 15 minutos (datos que cambian poco)
        await redis.setex(cacheKey, 900, JSON.stringify(stats));

        return stats;
    }
}
```

---

## Cache con Hash (Múltiples Campos)

```javascript
class ProductRepository {
    async getProductById(productId) {
        const cacheKey = `product:${productId}`;

        // 1. Intentar obtener todos los campos del hash
        const cached = await redis.hgetall(cacheKey);

        if (Object.keys(cached).length > 0) {
            console.log('Cache HIT');
            return {
                id: parseInt(cached.id),
                name: cached.name,
                price: parseFloat(cached.price),
                stock: parseInt(cached.stock)
            };
        }

        console.log('Cache MISS');

        // 2. Consultar DB
        const product = await db.query(
            'SELECT * FROM products WHERE id = $1',
            [productId]
        );

        // 3. Guardar como hash en Redis
        await redis.hmset(cacheKey, {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock
        });

        // 4. Establecer expiración
        await redis.expire(cacheKey, 3600);

        return product;
    }
}
```

**Ventaja:** Puedes actualizar campos individuales sin reescribir todo el objeto.

---

## Cache con Múltiples Niveles (L1 + L2)

```javascript
class CacheService {
    constructor() {
        this.memoryCache = new Map(); // L1: Memoria local (ms)
        this.redis = new Redis();      // L2: Redis (sub-ms a ms)
    }

    async get(key) {
        // L1: Memoria local (más rápido)
        if (this.memoryCache.has(key)) {
            console.log('L1 Cache HIT (memory)');
            return this.memoryCache.get(key);
        }

        // L2: Redis
        const cached = await this.redis.get(key);
        if (cached) {
            console.log('L2 Cache HIT (Redis)');
            const value = JSON.parse(cached);
            this.memoryCache.set(key, value); // Guardar en L1
            return value;
        }

        console.log('Cache MISS (L1 + L2)');
        return null;
    }

    async set(key, value, ttl) {
        // Guardar en ambos niveles
        this.memoryCache.set(key, value);
        await this.redis.setex(key, ttl, JSON.stringify(value));
    }
}
```

---

## Cache con Pipeline (Batch)

```javascript
async function getMultipleUsers(userIds) {
    const pipeline = redis.pipeline();

    // 1. Leer múltiples keys en paralelo
    userIds.forEach(id => {
        pipeline.get(`user:${id}`);
    });

    const results = await pipeline.exec();
    const users = [];
    const missingIds = [];

    // 2. Separar hits de misses
    results.forEach((result, index) => {
        const [err, value] = result;
        if (value) {
            users.push(JSON.parse(value));
        } else {
            missingIds.push(userIds[index]);
        }
    });

    // 3. Consultar DB solo para los que no están en cache
    if (missingIds.length > 0) {
        const missingUsers = await db.query(
            'SELECT * FROM users WHERE id = ANY($1)',
            [missingIds]
        );

        // 4. Guardar en cache
        const savePipeline = redis.pipeline();
        missingUsers.forEach(user => {
            savePipeline.setex(
                `user:${user.id}`,
                3600,
                JSON.stringify(user)
            );
        });
        await savePipeline.exec();

        users.push(...missingUsers);
    }

    return users;
}
```

---

## Cache de Agregaciones

```javascript
class OrderRepository {
    async getTotalRevenue() {
        const cacheKey = 'analytics:total_revenue';

        const cached = await redis.get(cacheKey);
        if (cached) return parseFloat(cached);

        const result = await db.query('SELECT SUM(total) as revenue FROM orders');
        const revenue = result.rows[0].revenue;

        // Cache por 1 hora
        await redis.setex(cacheKey, 3600, revenue.toString());

        return revenue;
    }
}
```

---

## Cache Warming (Precalentamiento)

Poblar el cache antes de que los usuarios lo soliciten:

```javascript
// Ejecutar cada hora con cron job
async function warmProductsCache() {
    console.log('Warming cache...');

    const products = await db.query('SELECT * FROM products WHERE active = true');

    const pipeline = redis.pipeline();
    products.forEach(product => {
        pipeline.setex(
            `product:${product.id}`,
            7200, // 2 horas
            JSON.stringify(product)
        );
    });

    await pipeline.exec();
    console.log(`Cached ${products.length} products`);
}

// Ejecutar al iniciar servidor
warmProductsCache();
```

---

## Cache con Fallback (Tolerancia a fallos)

```javascript
async function getUserById(userId) {
    const cacheKey = `user:${userId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error('Redis error, falling back to DB:', err);
        // Continuar sin cache
    }

    // Consultar DB
    const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

    // Intentar guardar en cache (no crítico)
    try {
        await redis.setex(cacheKey, 3600, JSON.stringify(user));
    } catch (err) {
        console.error('Failed to cache, continuing:', err);
    }

    return user;
}
```

---

## Cache con Compression (gzip)

Para datos grandes:

```javascript
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

async function cacheWithCompression(key, data, ttl) {
    const json = JSON.stringify(data);
    const compressed = await gzip(json);
    await redis.setex(key, ttl, compressed);
}

async function getCachedCompressed(key) {
    const compressed = await redis.getBuffer(key);
    if (!compressed) return null;

    const decompressed = await gunzip(compressed);
    return JSON.parse(decompressed.toString());
}
```

**Beneficio:** Reduce uso de memoria en Redis 70-90% para JSON grandes.

---

## Métricas de Cache

```javascript
class CacheMetrics {
    constructor() {
        this.hits = 0;
        this.misses = 0;
    }

    recordHit() {
        this.hits++;
    }

    recordMiss() {
        this.misses++;
    }

    getHitRate() {
        const total = this.hits + this.misses;
        if (total === 0) return 0;
        return (this.hits / total) * 100;
    }

    reset() {
        this.hits = 0;
        this.misses = 0;
    }
}

const metrics = new CacheMetrics();

// En tu función de cache:
const cached = await redis.get(key);
if (cached) {
    metrics.recordHit();
} else {
    metrics.recordMiss();
}

// Endpoint de métricas
app.get('/metrics/cache', (req, res) => {
    res.json({
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: metrics.getHitRate().toFixed(2) + '%'
    });
});
```

---

## Mejores Prácticas

✅ **Usar TTL siempre** (evitar cache infinito)
✅ **Pipeline para múltiples operaciones**
✅ **Cache invalidation estratégico** (ver siguiente sección)
✅ **Medir hit rate** (objetivo: >80%)
✅ **Fallback a DB si Redis falla**
✅ **Comprimir datos grandes** (>10KB)
✅ **Naming conventions claras** (`namespace:entity:id`)
✅ **Cache warming para datos críticos**

❌ **No cachear datos sensibles sin encriptar**
❌ **No usar TTL muy largos** (datos stale)
❌ **No cachear todo ciegamente** (solo lo costoso)

---

## Próximo Paso

Continúa con [Cache Invalidation Strategies](06-cache-invalidation.md) para aprender cuándo y cómo invalidar el cache.

---

**Nivel de Dificultad:** ⭐⭐⭐⭐ Senior
