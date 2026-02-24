# Fundamentos de Redis

Redis (Remote Dictionary Server) es una base de datos in-memory key-value extremadamente rápida.

---

## Estructuras de Datos

### 1️⃣ Strings (El más básico)

```bash
# SET: Guardar valor
SET user:123:name "Juan García"
SET user:123:age 30

# GET: Obtener valor
GET user:123:name  # → "Juan García"

# SET con expiración (TTL en segundos)
SET session:abc123 "user_data" EX 3600  # Expira en 1 hora

# INCR/DECR: Incrementar/decrementar números atómicamente
SET page:views 0
INCR page:views  # → 1
INCR page:views  # → 2
DECR page:views  # → 1

# MGET: Obtener múltiples keys
MGET user:123:name user:123:age  # → ["Juan García", "30"]
```

**Uso típico:** Cache de valores simples, contadores, rate limiting.

---

### 2️⃣ Hashes (Objetos/Maps)

```bash
# HSET: Guardar campo en hash
HSET user:123 name "Juan García"
HSET user:123 email "juan@example.com"
HSET user:123 age 30

# HGET: Obtener campo
HGET user:123 name  # → "Juan García"

# HGETALL: Obtener todos los campos
HGETALL user:123
# → ["name", "Juan García", "email", "juan@example.com", "age", "30"]

# HMSET: Múltiples campos a la vez
HMSET user:456 name "Ana López" email "ana@example.com" age 28

# HINCRBY: Incrementar campo numérico
HINCRBY user:123 age 1  # → 31
```

**Uso típico:** Almacenar objetos completos (usuarios, productos).

---

### 3️⃣ Lists (Listas ordenadas)

```bash
# LPUSH/RPUSH: Añadir al inicio/final
LPUSH queue:jobs "job1"  # Añade al inicio
RPUSH queue:jobs "job2"  # Añade al final

# LPOP/RPOP: Sacar del inicio/final
LPOP queue:jobs  # → "job1"
RPOP queue:jobs  # → "job2"

# LRANGE: Obtener rango
LPUSH notifications "msg1" "msg2" "msg3"
LRANGE notifications 0 -1  # Todas: ["msg3", "msg2", "msg1"]
LRANGE notifications 0 1   # Primeras 2: ["msg3", "msg2"]

# LLEN: Longitud
LLEN notifications  # → 3
```

**Uso típico:** Colas de jobs, feeds de actividad, logs recientes.

---

### 4️⃣ Sets (Conjuntos únicos)

```bash
# SADD: Añadir elementos
SADD tags:post:1 "javascript" "nodejs" "backend"

# SMEMBERS: Obtener todos
SMEMBERS tags:post:1  # → ["javascript", "nodejs", "backend"]

# SISMEMBER: Verificar existencia
SISMEMBER tags:post:1 "javascript"  # → 1 (true)
SISMEMBER tags:post:1 "python"     # → 0 (false)

# SCARD: Cantidad de elementos
SCARD tags:post:1  # → 3

# Operaciones de conjuntos
SADD tags:post:2 "python" "backend" "api"
SINTER tags:post:1 tags:post:2  # Intersección → ["backend"]
SUNION tags:post:1 tags:post:2  # Unión → ["javascript", "nodejs", "backend", "python", "api"]
SDIFF tags:post:1 tags:post:2   # Diferencia → ["javascript", "nodejs"]
```

**Uso típico:** Tags, categorías, usuarios únicos, tracking.

---

### 5️⃣ Sorted Sets (Conjuntos ordenados por score)

```bash
# ZADD: Añadir con score
ZADD leaderboard 100 "player1"
ZADD leaderboard 200 "player2"
ZADD leaderboard 150 "player3"

# ZRANGE: Obtener rango (ascendente)
ZRANGE leaderboard 0 -1 WITHSCORES
# → ["player1", "100", "player3", "150", "player2", "200"]

# ZREVRANGE: Rango descendente (mayor a menor)
ZREVRANGE leaderboard 0 2 WITHSCORES
# → ["player2", "200", "player3", "150", "player1", "100"]

# ZINCRBY: Incrementar score
ZINCRBY leaderboard 50 "player1"  # → 150

# ZRANK: Posición (0-indexed)
ZRANK leaderboard "player1"  # → 0 (primera posición)

# ZCOUNT: Cantidad en rango de scores
ZCOUNT leaderboard 100 200  # → 3
```

**Uso típico:** Leaderboards, rankings, prioridades, trending topics.

---

## Comandos Esenciales

### Expiración (TTL)

```bash
# SET con expiración
SET token:abc "data" EX 3600  # Expira en 1 hora

# EXPIRE: Establecer expiración en key existente
SET session:xyz "user_data"
EXPIRE session:xyz 7200  # Expira en 2 horas

# TTL: Ver tiempo restante (en segundos)
TTL session:xyz  # → 7199

# PERSIST: Remover expiración
PERSIST session:xyz
```

---

### Gestión de Keys

```bash
# EXISTS: Verificar si existe
EXISTS user:123  # → 1 (true) o 0 (false)

# DEL: Eliminar
DEL user:123  # → 1 (eliminada)

# KEYS: Buscar keys por patrón (⚠️ No usar en producción!)
KEYS user:*  # → ["user:123", "user:456"]

# SCAN: Buscar keys de forma segura (iterativo)
SCAN 0 MATCH user:* COUNT 100

# RENAME: Renombrar key
RENAME old_key new_key

# TYPE: Tipo de dato
TYPE user:123  # → "hash"
```

**⚠️ IMPORTANTE:** Nunca uses `KEYS` en producción, usa `SCAN` para evitar bloquear Redis.

---

## Transacciones y Atomicidad

```bash
# MULTI/EXEC: Transacción (todo o nada)
MULTI
SET user:123:name "Juan"
INCR counter
EXEC

# WATCH: Optimistic locking
WATCH balance:123
MULTI
DECRBY balance:123 100
EXEC  # Solo ejecuta si balance:123 no cambió
```

---

## Pipeline (Batch de comandos)

Enviar múltiples comandos en un solo round-trip de red:

```javascript
// Node.js con ioredis
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.incr('counter');
await pipeline.exec();
```

**Beneficio:** Reduce latencia de red 10x-100x.

---

## Pub/Sub Básico

```bash
# SUBSCRIBE: Escuchar canal
SUBSCRIBE notifications

# PUBLISH: Publicar mensaje
PUBLISH notifications "New message!"

# PSUBSCRIBE: Patrón de canales
PSUBSCRIBE user:*:notifications
```

---

## Comandos de Info y Debugging

```bash
# INFO: Información del servidor
INFO server
INFO memory
INFO stats

# MONITOR: Ver comandos en tiempo real (⚠️ Solo debugging)
MONITOR

# SLOWLOG: Queries lentas
SLOWLOG GET 10

# MEMORY USAGE: Memoria usada por key
MEMORY USAGE user:123

# DBSIZE: Cantidad de keys
DBSIZE  # → 1523
```

---

## Convenciones de Naming

**Buenas prácticas:**

```bash
# ✅ BIEN: Namespace claro con ":"
user:123:profile
session:abc123
cache:products:list:page:1
rate_limit:user:456

# ❌ MAL: Sin namespace
123profile
abc123
productslist
```

**Patrón recomendado:** `namespace:entity:id:attribute`

---

## Configuración de Persistencia

```bash
# RDB Snapshot (default)
SAVE  # Snapshot síncrono (bloquea)
BGSAVE  # Snapshot en background

# AOF (Append-Only File)
# En redis.conf:
appendonly yes
appendfsync everysec  # Sync cada segundo
```

---

## Límites y Consideraciones

| Límite | Valor |
|--------|-------|
| **Max key size** | 512 MB |
| **Max value size** | 512 MB |
| **Max keys por DB** | Sin límite práctico |
| **Max memory** | Depende del servidor |

---

## Ejemplo Completo: Cache de Usuario

```bash
# 1. Guardar usuario como hash
HMSET user:123 name "Juan García" email "juan@example.com" age 30

# 2. Establecer expiración de 1 hora
EXPIRE user:123 3600

# 3. Obtener usuario
HGETALL user:123

# 4. Verificar tiempo restante
TTL user:123  # → 3599

# 5. Actualizar edad
HINCRBY user:123 age 1  # → 31

# 6. Eliminar cuando ya no se necesita
DEL user:123
```

---

## Próximo Paso

Continúa con [Implementación de Redis en Node.js](02-redis-nodejs.md) para ver ejemplos prácticos.

---

**Nivel de Dificultad:** ⭐⭐⭐ Intermedio
