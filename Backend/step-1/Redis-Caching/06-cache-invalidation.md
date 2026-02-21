# Cache Invalidation Strategies

> "There are only two hard things in Computer Science: cache invalidation and naming things."
> — Phil Karlton

La invalidación de cache es **crítica** para evitar mostrar datos desactualizados (stale data).

---

## Estrategias de Invalidación

### 1️⃣ TTL (Time To Live) — Expiración Automática

**Concepto:** El cache se elimina automáticamente después de un tiempo.

```javascript
// Cache que expira en 1 hora
await redis.setex('user:123', 3600, JSON.stringify(user));

// Diferentes TTLs según tipo de dato
await redis.setex('product:456', 300, data);      // 5 min (datos que cambian seguido)
await redis.setex('settings', 86400, config);      // 24 horas (datos estáticos)
await redis.setex('analytics:daily', 3600, stats); // 1 hora (calculado cada hora)
```

**Ventajas:**
- ✅ Simple de implementar
- ✅ No requiere lógica de invalidación
- ✅ Garantiza que datos stale no vivan forever

**Desventajas:**
- ❌ Puede mostrar datos desactualizados hasta que expire
- ❌ No reacciona a cambios inmediatos

**Cuándo usar:**
- Datos que cambian poco
- Reportes y analytics
- Configuraciones globales

---

### 2️⃣ Invalidación Manual (Write-Through)

**Concepto:** Cuando actualizas la DB, inmediatamente eliminas o actualizas el cache.

```javascript
class UserService {
    async updateUser(userId, data) {
        // 1. Actualizar en DB
        const user = await db.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
            [data.name, data.email, userId]
        );

        // 2. Invalidar cache
        await redis.del(`user:${userId}`);

        // O actualizar cache directamente (write-through):
        // await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));

        return user;
    }

    async deleteUser(userId) {
        // 1. Eliminar de DB
        await db.query('DELETE FROM users WHERE id = $1', [userId]);

        // 2. Eliminar de cache
        await redis.del(`user:${userId}`);
    }
}
```

**Ventajas:**
- ✅ Datos siempre consistentes
- ✅ Control total sobre invalidación

**Desventajas:**
- ❌ Requiere código en cada operación de escritura
- ❌ Fácil olvidar invalidar (bugs)

**Cuándo usar:**
- Datos críticos que deben estar actualizados
- APIs con pocos escritores

---

### 3️⃣ Cache Stampede Prevention (con Lock)

**Problema:** Múltiples requests regeneran cache simultáneamente cuando expira.

```
Cache expira → 1000 requests simultáneos → 1000 consultas a DB 💥
```

**Solución: Lock con SET NX**

```javascript
async function getUserWithStampedeProtection(userId) {
    const cacheKey = `user:${userId}`;
    const lockKey = `lock:${cacheKey}`;

    // 1. Intentar obtener de cache
    let cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 2. Intentar adquirir lock (solo uno lo consigue)
    const lockAcquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (lockAcquired) {
        try {
            // Solo este request consulta la DB
            const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

            // Guardar en cache
            await redis.setex(cacheKey, 3600, JSON.stringify(user));

            return user;
        } finally {
            // Liberar lock
            await redis.del(lockKey);
        }
    } else {
        // Otros esperan un poco y releen cache
        await sleep(100);
        cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        // Si aún no está, consultar DB (fallback)
        return await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### 4️⃣ Cache Tag-Based Invalidation

**Concepto:** Asignar tags a múltiples cache entries y invalidar por tag.

```javascript
class CacheManager {
    async cacheWithTags(key, value, ttl, tags) {
        // Guardar valor
        await redis.setex(key, ttl, JSON.stringify(value));

        // Asociar cada tag con esta key
        for (const tag of tags) {
            await redis.sadd(`tag:${tag}`, key);
        }
    }

    async invalidateByTag(tag) {
        // Obtener todas las keys con este tag
        const keys = await redis.smembers(`tag:${tag}`);

        if (keys.length > 0) {
            // Eliminar todas las keys
            await redis.del(...keys);
        }

        // Eliminar el set de tags
        await redis.del(`tag:${tag}`);
    }
}

// Uso
const cache = new CacheManager();

await cache.cacheWithTags('product:123', product, 3600, ['products', 'category:electronics']);
await cache.cacheWithTags('product:456', product2, 3600, ['products', 'category:electronics']);

// Invalidar todos los productos electrónicos
await cache.invalidateByTag('category:electronics');
```

**Cuándo usar:**
- Cuando un cambio afecta múltiples cache entries
- Categorías, colecciones, filtros

---

### 5️⃣ Stale-While-Revalidate

**Concepto:** Devolver cache expirado mientras regeneras en background.

```javascript
async function getWithSWR(key, fetchFn, ttl) {
    const staleKey = `${key}:stale`;

    // 1. Intentar obtener cache fresco
    let cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    // 2. Intentar obtener cache stale
    const stale = await redis.get(staleKey);

    // 3. Regenerar en background
    const regenerate = async () => {
        const fresh = await fetchFn();
        await redis.setex(key, ttl, JSON.stringify(fresh));
        await redis.setex(staleKey, ttl * 2, JSON.stringify(fresh)); // Doble TTL
    };

    if (stale) {
        // Devolver stale inmediatamente
        regenerate().catch(console.error); // No esperar
        return JSON.parse(stale);
    }

    // 4. Si no hay stale, esperar generación
    const fresh = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(fresh));
    await redis.setex(staleKey, ttl * 2, JSON.stringify(fresh));
    return fresh;
}

// Uso
const product = await getWithSWR(
    'product:123',
    () => db.query('SELECT * FROM products WHERE id = 123'),
    300 // 5 minutos
);
```

**Ventajas:**
- ✅ Siempre responde rápido (usa stale si es necesario)
- ✅ Regenera en background

**Cuándo usar:**
- APIs públicas de alta velocidad
- Datos donde "casi actualizado" es aceptable

---

### 6️⃣ Write-Behind (Lazy Write)

**Concepto:** Escribir primero en cache, y luego en DB (async).

```javascript
class WriteBehin Cache {
    constructor() {
        this.queue = [];
    }

    async updateUser(userId, data) {
        // 1. Actualizar cache inmediatamente
        await redis.setex(`user:${userId}`, 3600, JSON.stringify(data));

        // 2. Encolar actualización de DB
        this.queue.push({ userId, data });

        // 3. Procesar cola cada 1 segundo
        this.processQueue();

        return data;
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, 100); // Procesar en batches

            await Promise.all(
                batch.map(({ userId, data }) =>
                    db.query('UPDATE users SET data = $1 WHERE id = $2', [data, userId])
                )
            );
        }

        this.processing = false;
    }
}
```

**⚠️ Peligroso:** Puede perder datos si Redis falla antes de escribir a DB.

**Cuándo usar:**
- Escrituras muy frecuentes (analytics, logs)
- Datos no críticos

---

### 7️⃣ Event-Driven Invalidation (Pub/Sub)

**Concepto:** Publicar eventos cuando los datos cambian, invalidar cache en subscribers.

```javascript
// Publisher (cuando actualizas datos)
class UserService {
    async updateUser(userId, data) {
        await db.query('UPDATE users SET ... WHERE id = $1', [userId]);

        // Publicar evento
        await redis.publish('user:updated', JSON.stringify({ userId }));
    }
}

// Subscriber (escucha cambios)
const subscriber = new Redis();
subscriber.subscribe('user:updated');

subscriber.on('message', async (channel, message) => {
    const { userId } = JSON.parse(message);

    // Invalidar cache
    await redis.del(`user:${userId}`);
    console.log(`Cache invalidated for user ${userId}`);
});
```

**Cuándo usar:**
- Arquitecturas de microservicios
- Múltiples instancias de aplicación

---

## Patrón: Cache Aside con Invalidación Selectiva

```javascript
class ProductRepository {
    async getProduct(productId) {
        const key = `product:${productId}`;
        const cached = await redis.get(key);

        if (cached) return JSON.parse(cached);

        const product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
        await redis.setex(key, 600, JSON.stringify(product)); // 10 min
        return product;
    }

    async updateProduct(productId, data) {
        const product = await db.query(
            'UPDATE products SET name = $1, price = $2 WHERE id = $3 RETURNING *',
            [data.name, data.price, productId]
        );

        // Invalidar solo este producto
        await redis.del(`product:${productId}`);

        // Invalidar listados relacionados
        await redis.del('products:list:*'); // Pattern delete (usar SCAN en producción)

        return product;
    }
}
```

---

## Estrategia Híbrida Recomendada

```javascript
class SmartCache {
    async get(key, fetchFn, options = {}) {
        const {
            ttl = 3600,        // 1 hora default
            staleTTL = 7200,   // 2 horas para stale
            tags = []          // Tags para invalidación
        } = options;

        // 1. Intentar cache fresco
        let cached = await redis.get(key);
        if (cached) return JSON.parse(cached);

        // 2. Intentar cache stale + regenerar en background
        const staleKey = `${key}:stale`;
        const stale = await redis.get(staleKey);

        const regenerate = async () => {
            const fresh = await fetchFn();
            await redis.setex(key, ttl, JSON.stringify(fresh));
            await redis.setex(staleKey, staleTTL, JSON.stringify(fresh));

            // Asociar tags
            for (const tag of tags) {
                await redis.sadd(`tag:${tag}`, key);
            }

            return fresh;
        };

        if (stale) {
            regenerate().catch(console.error);
            return JSON.parse(stale);
        }

        // 3. No hay nada, esperar regeneración
        return await regenerate();
    }

    async invalidate(key) {
        await redis.del(key, `${key}:stale`);
    }

    async invalidateByTag(tag) {
        const keys = await redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
            const allKeys = keys.flatMap(k => [k, `${k}:stale`]);
            await redis.del(...allKeys);
        }
        await redis.del(`tag:${tag}`);
    }
}
```

---

## TTL Recomendados por Tipo de Dato

| Tipo de Dato | TTL Sugerido | Razón |
|--------------|--------------|-------|
| **Usuario (perfil)** | 1-4 horas | Cambia poco |
| **Producto (catálogo)** | 5-15 minutos | Precios/stock cambian |
| **Listado (paginado)** | 2-5 minutos | Se actualiza seguido |
| **Analytics/Stats** | 15-60 minutos | Recalculado periódicamente |
| **Configuración global** | 12-24 horas | Casi nunca cambia |
| **Session** | 24 horas | Renovado en cada request |
| **Rate Limit** | 60 segundos | Ventana de tiempo fija |

---

## Métricas Clave

```javascript
class CacheMetrics {
    async logInvalidation(key, reason) {
        await redis.hincrby('metrics:invalidations', reason, 1);
        console.log(`Cache invalidated: ${key} (reason: ${reason})`);
    }

    async getInvalidationStats() {
        return await redis.hgetall('metrics:invalidations');
        // { manual: 45, ttl_expired: 1203, tag_based: 23 }
    }
}
```

---

## Mejores Prácticas

✅ **Combinar TTL + invalidación manual**
✅ **Usar tags para invalidar grupos**
✅ **Prevenir cache stampede con locks**
✅ **Stale-while-revalidate para alta disponibilidad**
✅ **Pub/Sub para invalidación distribuida**
✅ **Monitorear hit rate y invalidaciones**

❌ **No invalidar todo el cache a la vez**
❌ **No usar TTL infinito**
❌ **No olvidar invalidar en updates/deletes**

---

## Próximo Paso

Continúa con [Pub/Sub Patterns](07-pubsub-patterns.md) para comunicación en tiempo real.

---

**Nivel de Dificultad:** ⭐⭐⭐⭐⭐ Senior/Expert
