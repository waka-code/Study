# 🔴 Redis & Caching — Nivel Senior

> **Concepto clave:**
> Redis es una base de datos **in-memory key-value** extremadamente rápida, usada principalmente para **caching, sesiones, colas, pub/sub y rate limiting**.

---

## ¿Por qué Redis?

**Ventajas:**
- ✅ Velocidad: Datos en RAM (sub-millisecond latency)
- ✅ Versatilidad: Cache, sesiones, colas, pub/sub, leaderboards
- ✅ Persistencia opcional: RDB snapshots o AOF logs
- ✅ Estructuras de datos avanzadas: Strings, Lists, Sets, Sorted Sets, Hashes, Streams
- ✅ Escalabilidad: Clustering, replicación
- ✅ TTL automático: Expiración de keys

**Trade-offs:**
- ❌ Limitado por RAM disponible
- ❌ Datos volátiles si no se configura persistencia
- ❌ Single-threaded (aunque muy rápido)

---

## Índice

1. [Fundamentos de Redis](01-fundamentos-redis.md)
2. [Implementación de Redis en Node.js](02-redis-nodejs.md)
3. [Implementación de Redis en C#/.NET](03-redis-csharp.md)
4. [Session Storage con Redis](04-session-storage.md)
5. [Query Caching Avanzado](05-query-caching.md)
6. [Cache Invalidation Strategies](06-cache-invalidation.md)
7. [Pub/Sub Patterns](07-pubsub-patterns.md)
8. [Redis para Rate Limiting](08-redis-rate-limiting.md)
9. [Redis Clustering & Replicación](09-redis-clustering.md)
10. [Persistencia y Backup](10-redis-persistencia.md)
11. [Monitoreo y Debugging](11-redis-monitoring.md)
12. [Mejores Prácticas en Producción](12-best-practices.md)

---

## Casos de Uso Principales

| Caso de Uso | Estructura Redis | Ejemplo |
|-------------|------------------|---------|
| **Cache de consultas** | String/Hash | `user:123` → `{name, email}` |
| **Sesiones** | Hash con TTL | `session:abc123` → `{userId, expires}` |
| **Rate Limiting** | String con INCR | `rate_limit:user:123` → counter |
| **Pub/Sub** | Channels | `notifications` channel |
| **Colas** | Lists (LPUSH/RPOP) | `jobs:queue` → job data |
| **Leaderboards** | Sorted Sets | `scores` → `{user:score}` |
| **Contadores** | String (INCR/DECR) | `page:views` → number |

---

## Comparación: Redis vs Memcached

| Aspecto | Redis | Memcached |
|---------|-------|-----------|
| **Estructuras** | Strings, Lists, Sets, Hashes, Sorted Sets | Solo strings |
| **Persistencia** | Sí (RDB/AOF) | No |
| **Replicación** | Sí | No (solo sharding) |
| **Pub/Sub** | Sí | No |
| **TTL** | Per-key | Per-key |
| **Uso de memoria** | Más features, más memoria | Más eficiente para cache simple |
| **Caso de uso** | Cache + sesiones + pub/sub + colas | Solo cache |

**Conclusión:** Usa Redis para casi todo en aplicaciones modernas. Memcached solo si necesitas cache ultra-simple y eficiente en memoria.

---

## Cuándo usar Redis

✅ **SÍ usar Redis para:**
- Cache de queries de base de datos
- Almacenamiento de sesiones de usuario
- Rate limiting / throttling
- Pub/sub en tiempo real
- Colas de jobs (con bibliotecas como BullMQ)
- Leaderboards y rankings
- Contadores y estadísticas en tiempo real

❌ **NO usar Redis para:**
- Datos que DEBEN persistir (usa PostgreSQL/MySQL)
- Datos relacionales complejos
- Full-text search (usa Elasticsearch)
- Grandes volúmenes de datos (limitado por RAM)

---

## Arquitectura Típica

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ HTTP Request
       ↓
┌─────────────┐     Cache Hit?
│  Backend    │────────────────→ ┌─────────────┐
│  (Node/C#)  │                  │    Redis    │
└──────┬──────┘ ←────────────────└─────────────┘
       │ Cache Miss
       ↓
┌─────────────┐
│  PostgreSQL │ (Database principal)
└─────────────┘
```

**Flujo:**
1. Request llega al backend
2. Backend verifica Redis (cache hit = rápido)
3. Si no existe (cache miss), consulta PostgreSQL
4. Guarda resultado en Redis para próximas consultas
5. Responde al cliente

---

## Instalación Rápida

### Local (Docker)
```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

### Producción (AWS ElastiCache)
- Managed Redis service
- Alta disponibilidad
- Backups automáticos
- Monitoring integrado

---

## Próximo Paso

Empieza con [Fundamentos de Redis](01-fundamentos-redis.md) para entender los comandos básicos y estructuras de datos.

---

**Nivel de Dificultad:** ⭐⭐⭐⭐ Senior
