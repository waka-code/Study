# Caching

Una caché guarda el resultado de operaciones costosas en un almacenamiento más rápido (memoria) para reducir latencia y carga sobre la base de datos. Es la palanca de rendimiento más potente y, a la vez, una fuente clásica de bugs: **datos desactualizados, inconsistencias y caídas en cascada** cuando la caché falla.

> "There are only two hard things in Computer Science: cache invalidation and naming things." (Phil Karlton)

Antes de cachear, confirma que la consulta no se arregla con un índice o una reescritura ([Performance.md](Performance.md), [Indices.md](Indices.md)). La caché no debe ocultar una consulta mala.

## Niveles de caché

- **Cliente/CDN**: HTTP `Cache-Control`, ETags. Ideal para contenido público.
- **Caché local en proceso** (memoria de la instancia): `lru-cache` en Node, Caffeine en Java.
- **Caché distribuida**: Redis, Memcached, ElastiCache/MemoryDB.
- **Caché de la propia BD**: `shared_buffers` y page cache del SO. Ya existe: no dupliques lo que la BD hace bien.
- **Resultados precalculados en la BD**: vistas materializadas o tablas resumen ([Performance.md](Performance.md)).

## Patrones de lectura y escritura

### Cache-aside (lazy loading)

La **aplicación** consulta la caché; si hay miss, lee de la BD y llena la caché. Es el patrón más común.

```ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const TTL_SECONDS = 300;

export async function getProduct(id: string): Promise<Product | null> {
  const key = `product:v1:${id}`;

  const cached = await redis.get(key);
  if (cached !== null) {
    return cached === 'null' ? null : (JSON.parse(cached) as Product); // negativo cacheado
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, price: true, stock: true },
  });

  // TTL con jitter para evitar expiraciones masivas simultáneas
  const ttl = product
    ? TTL_SECONDS + Math.floor(Math.random() * 60)
    : 30;                                            // negativos: TTL corto
  await redis.set(key, product ? JSON.stringify(product) : 'null', 'EX', ttl);

  return product;
}

export async function updateProduct(id: string, data: Partial<Product>) {
  await prisma.product.update({ where: { id }, data });
  await redis.del(`product:v1:${id}`);              // invalidar DESPUÉS del commit
}
```

- Ventajas: solo se cachea lo que se pide; si Redis cae, la app puede seguir leyendo de la BD (degradada).
- Desventajas: el primer acceso siempre es un miss; la lógica de caché queda repartida en el código.
- La versión en la key (`v1`) permite invalidar todo cambiando el formato del objeto sin conflictos entre despliegues.

### Read-through

La **caché** (o una librería/proveedor) se encarga de cargar desde la BD en un miss. La app solo habla con la caché. Ejemplos: Caffeine `LoadingCache`, DAX para DynamoDB, Spring `@Cacheable` (conceptualmente).

- Centraliza la lógica, pero acopla la caché al origen de datos.

### Write-through

Cada escritura va a la caché **y** a la BD de forma síncrona (normalmente la caché/capa escribe en la BD).

- La caché siempre tiene el dato fresco para las keys escritas.
- Mayor latencia de escritura; se cachean datos que quizás nunca se leen.
- Sin una transacción que abarque ambos, un fallo parcial deja inconsistencias.

### Write-behind (write-back)

Se escribe en la caché y la persistencia en la BD es **asíncrona** (en lotes).

- Latencia de escritura mínima y absorbe picos (contadores, métricas, likes).
- **Riesgo de pérdida de datos** si la caché cae antes de persistir; orden y consistencia complejos.
- **No usar** para datos de negocio críticos (pagos, órdenes, inventario).

### Write-around

Se escribe solo en la BD; la caché se llena en la siguiente lectura (cache-aside). Suele combinarse con invalidar la key.

- Evita llenar la caché con datos que se escriben mucho y se leen poco.

| Patrón | Quién carga la caché | Latencia de escritura | Frescura | Riesgo principal |
|---|---|---|---|---|
| Cache-aside | App, en el miss | Baja | Hasta TTL/invalidación | Race conditions, stampede |
| Read-through | La caché | Baja | Hasta TTL/invalidación | Acoplamiento |
| Write-through | Escritura síncrona | Alta | Alta | Fallos parciales |
| Write-behind | Escritura en caché, BD async | Mínima | Alta en caché | **Pérdida de datos** |
| Write-around | App, en el miss | Baja | Miss tras escribir | Primer read lento |

## Invalidación y TTL

Estrategias:

- **TTL**: el dato expira solo. Simple y a prueba de bugs de invalidación; acota la ventana de datos viejos. **Siempre** pon TTL, incluso si invalidas explícitamente: es la red de seguridad.
- **Invalidación explícita**: al escribir, borrar la key (`DEL`). Requiere conocer todas las keys afectadas (difícil con listas y agregados: `products:category:42:page:1`).
- **Invalidación por eventos**: la BD publica cambios (CDC con Debezium, outbox) y un consumidor invalida. Desacopla y cubre escrituras que no pasan por la app. Ver [OutboxCDC.md](OutboxCDC.md).
- **Versionado de keys**: incluir una versión o `updated_at` en la key (`user:42:v17`); una escritura incrementa la versión y las keys viejas mueren por TTL. Útil para invalidar grupos (namespace version).

Cómo elegir el TTL:

- ¿Cuánto tiempo de dato viejo tolera el negocio? Catálogo: minutos; configuración: segundos o minutos; precio en el checkout: no cachear o validar contra la BD.
- TTL corto = más carga en la BD; TTL largo = más inconsistencia visible.

## Consistencia caché-BD y race conditions

Caché y BD son dos sistemas sin transacción común: **la consistencia es eventual** por definición. Ver [CAP.md](CAP.md).

### Por qué borrar en vez de actualizar

Actualizar la caché en la escritura (`SET` con el valor nuevo) tiene una carrera entre escritores concurrentes:

```
A: UPDATE db price=10          B: UPDATE db price=20
                               B: SET cache price=20
A: SET cache price=10          → BD=20, caché=10 hasta que expire el TTL
```

Borrar (`DEL`) es idempotente: el siguiente lector recarga desde la BD. Por eso la recomendación es **delete-after-write**: primero commit en la BD, después `DEL` en la caché.

- No borres **antes** de escribir: un lector concurrente puede recargar el valor viejo entre el `DEL` y el commit.
- Invalida **después del commit**, no dentro de la transacción: si haces rollback, habrás invalidado sin motivo (inofensivo); si invalidas antes del commit, un lector puede releer el valor viejo y cachearlo.

### La carrera que queda con cache-aside

```
Lector: miss → lee BD (valor viejo)
Escritor: UPDATE db → DEL cache
Lector: SET cache (valor viejo)   → dato viejo hasta el TTL
```

Es poco probable (el lector debe ser más lento que toda la escritura), pero ocurre con carga. Mitigaciones:

- **TTL** acota el daño.
- **Delayed double delete**: borrar después del commit y de nuevo tras unos cientos de ms (por ejemplo, desde una cola con delay).
- **Versión en el valor**: guardar `version`/`updated_at` y escribir en la caché solo si es más nuevo (script Lua o `SET` condicional).
- **Invalidación por CDC**: el orden lo da el log de la BD.
- Para datos que requieren consistencia fuerte (saldo, stock en el checkout), **no leer de la caché** en la ruta crítica.

### Otras fuentes de inconsistencia

- Réplicas de lectura: si el miss recarga desde una réplica con lag, puedes cachear el valor viejo justo después de invalidar. Recarga desde el primario tras escrituras recientes. Ver [ReadReplicas.md](ReadReplicas.md).
- Fallo del `DEL` (Redis caído o timeout): reintentar, o invalidar por eventos, con TTL como respaldo.

## Cache stampede (thundering herd)

Una key muy popular expira y **cientos de requests** simultáneos tienen miss y van todos a la BD a recalcular lo mismo. Si el cálculo es caro, la BD colapsa.

Soluciones:

**1. Lock / mutex distribuido**: solo uno recalcula; los demás esperan o sirven el valor viejo.

```ts
async function getWithLock<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const lockKey = `lock:${key}`;
  const gotLock = await redis.set(lockKey, '1', 'PX', 5_000, 'NX'); // expira solo si el dueño muere
  if (gotLock) {
    try {
      const value = await load();
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      return value;
    } finally {
      await redis.del(lockKey); // en producción: valor único + borrado condicional (Lua) para no liberar un lock ajeno
    }
  }
  // No obtuvo el lock: esperar un poco y reintentar (acotar reintentos en código real)
  await new Promise((r) => setTimeout(r, 50));
  return getWithLock(key, ttl, load);
}
```

**2. Request coalescing (single-flight)**: dentro de una instancia, las peticiones concurrentes por la misma key comparten una sola promesa.

```ts
const inFlight = new Map<string, Promise<unknown>>();

function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}
```

- Reduce la carga a **una consulta por instancia**; combinado con el lock distribuido, a una en total.

**3. Expiración temprana probabilística (XFetch)**: cada lector, antes de que expire la key, decide con probabilidad creciente recalcular por adelantado. Así, un solo request refresca antes del vencimiento.

```ts
// delta = tiempo que tarda recalcular (ms); beta ≈ 1
const shouldRefresh = (expiresAtMs: number, deltaMs: number, beta = 1) =>
  Date.now() - deltaMs * beta * Math.log(Math.random()) >= expiresAtMs;
```

**4. Stale-while-revalidate / refresh en background**: guardar un "soft TTL" dentro del valor; si pasó, se devuelve el dato viejo y se refresca de forma asíncrona. Para keys críticas, un job puede precalentar la caché.

## Cache penetration

Peticiones por keys que **no existen** en la BD (IDs inválidos, ataques con IDs aleatorios): nunca se cachean, así que todas llegan a la BD.

- **Cachear negativos**: guardar un marcador `null` con TTL corto (como en el ejemplo de cache-aside).
- **Bloom filter**: estructura probabilística con todos los IDs válidos; si dice "no existe", es seguro (sin falsos negativos) y se responde sin consultar. Puede dar falsos positivos, que igual van a la BD. Redis Stack/RedisBloom: `BF.ADD`, `BF.EXISTS`.
- Validar el input (formato de ID) y aplicar rate limiting.

## Cache avalanche

**Muchas keys expiran al mismo tiempo** (cargadas juntas en un deploy o precalentamiento con el mismo TTL), o **la caché entera cae**: toda la carga llega de golpe a la BD.

- **TTL con jitter** aleatorio (`TTL + random(0, 10-20%)`).
- Alta disponibilidad de la caché: Redis con réplicas y failover (Sentinel, Cluster, ElastiCache Multi-AZ).
- **Circuit breaker y rate limiting** hacia la BD cuando la caché no está disponible: degradar funcionalidades antes que tumbar la BD.
- Caché local (L1) de corta duración como amortiguador.
- Dimensionar la BD sabiendo cuánto tráfico recibe **sin caché**: si depende al 100% de la caché para sobrevivir, la caché es un punto único de falla.

## Qué cachear y qué no

**Buenos candidatos:**

- Lecturas frecuentes, costosas de calcular y que cambian poco (catálogo, configuración, feature flags, perfiles públicos).
- Resultados agregados (rankings, contadores aproximados, dashboards).
- Sesiones, tokens, rate limiting (Redis como almacén primario efímero).
- Respuestas de APIs externas lentas o con límite de uso.

**Malos candidatos:**

- Datos que requieren **consistencia fuerte** en la ruta crítica: saldo antes de un cargo, stock al confirmar una compra. Se valida contra la BD con locks o condiciones.
- Datos con **baja tasa de acierto** (cada request pide algo distinto): la caché solo agrega latencia y memoria.
- Datos por usuario muy variados con TTL largo: consumen memoria y complican la invalidación.
- Consultas que ya son rápidas (por PK con índice, < 1 ms): el round-trip a Redis cuesta casi lo mismo.
- Datos sensibles sin cifrado ni controles de acceso adecuados ([Seguridad.md](Seguridad.md)).

Métricas clave: **hit ratio**, latencia de la caché, evictions, memoria usada y carga de la BD con y sin caché.

## Redis: estructuras útiles

| Estructura | Uso típico | Comandos |
|---|---|---|
| String | Objetos serializados, contadores | `GET`, `SET key val EX 60 NX`, `INCR` |
| Hash | Objeto con campos actualizables individualmente | `HSET`, `HGET`, `HINCRBY` |
| List | Colas simples, últimos N eventos | `LPUSH`, `LTRIM`, `BRPOP` |
| Set | Membresía, tags, únicos | `SADD`, `SISMEMBER` |
| Sorted set | Rankings, leaderboards, rate limiting por ventana, colas con prioridad | `ZADD`, `ZRANGE`, `ZREMRANGEBYSCORE` |
| HyperLogLog | Conteo aproximado de únicos con ~12 KB | `PFADD`, `PFCOUNT` |
| Stream | Log de eventos con consumer groups | `XADD`, `XREADGROUP` |
| Bloom filter (Redis Stack) | Anti-penetración | `BF.ADD`, `BF.EXISTS` |

- Evita **keys enormes** (hashes o sets con millones de elementos) y **hot keys** (una key recibiendo gran parte del tráfico): en Redis Cluster una key vive en un solo shard. Para hot keys: caché local L1 o réplicas de la key con sufijo.
- **No uses `KEYS *`** en producción (bloquea el servidor, que es single-threaded en la ejecución de comandos): usa `SCAN`.
- Usa **pipelining** o `MGET` para leer muchas keys en un round-trip.

### Eviction policies

Cuando se alcanza `maxmemory`, Redis aplica `maxmemory-policy`:

| Política | Comportamiento | Cuándo |
|---|---|---|
| `noeviction` | Rechaza escrituras (error) | Redis como almacén primario (colas, sesiones que no deben perderse) |
| `allkeys-lru` | Expulsa las menos usadas recientemente, de todas las keys | **Caché general**: el default recomendado |
| `allkeys-lfu` | Expulsa las menos usadas en frecuencia | Accesos con keys populares estables |
| `volatile-lru` / `volatile-lfu` | Solo entre keys con TTL | Mezcla de caché (con TTL) y datos persistentes (sin TTL) en la misma instancia |
| `volatile-ttl` | Las más cercanas a expirar | Poco común |
| `allkeys-random` / `volatile-random` | Aleatoria | Accesos uniformes |

- El default de Redis OSS es `noeviction`: en una caché pura provoca errores de escritura al llenarse. Configúralo explícitamente.
- Mejor separar instancias de caché (con eviction) y de datos que no pueden perderse (sin eviction y con persistencia).

## Caché local vs distribuida

| | Local (en proceso) | Distribuida (Redis) |
|---|---|---|
| Latencia | Nanosegundos a microsegundos | ~0,2-1 ms (red) |
| Consistencia entre instancias | Cada instancia tiene su copia; invalidar es difícil | Una sola copia compartida |
| Capacidad | Limitada por la memoria del proceso | Escalable (cluster) |
| Sobrevive a reinicios/deploys | No (cold start) | Sí |
| Costo operativo | Ninguno | Infraestructura adicional |

- **Local** para datos casi estáticos y muy leídos (configuración, feature flags) con TTL corto, o como **L1** delante de Redis para hot keys.
- **Distribuida** cuando las instancias deben ver el mismo valor, cuando hay invalidación explícita o cuando el dataset no cabe en cada proceso.
- Esquema **L1 + L2**: local con TTL de segundos + Redis con TTL de minutos. Para invalidar las L1, publica eventos (Redis Pub/Sub) o acepta la ventana del TTL corto.

## Preguntas de entrevista

1. **¿Por qué se recomienda borrar la key en lugar de actualizarla tras una escritura?**
   Actualizar tiene una carrera entre escritores concurrentes que deja un valor viejo en la caché. Borrar es idempotente y el próximo lector recarga desde la BD. Se hace después del commit.
2. **¿Qué inconsistencia queda con cache-aside + delete-after-write y cómo la mitigas?**
   Un lector lento que leyó el valor viejo antes de la escritura puede cachearlo después del `DEL`. Mitigación: TTL, delayed double delete, versionado del valor o invalidación por CDC; no usar caché en rutas que requieren consistencia fuerte.
3. **¿Qué es un cache stampede y cómo lo evitas?**
   Una key popular expira y muchos requests recalculan a la vez. Se evita con lock distribuido (`SET NX PX`), single-flight por instancia, expiración temprana probabilística o stale-while-revalidate.
4. **¿Diferencia entre penetration y avalanche?**
   Penetration: consultas por keys inexistentes que nunca se cachean (se resuelve cacheando negativos y con bloom filter). Avalanche: expiración masiva simultánea o caída de la caché (TTL con jitter, HA, circuit breaker).
5. **¿Cuándo usarías write-behind?**
   Para datos de alto volumen donde perder algunos es aceptable (contadores de vistas, métricas). Nunca para datos transaccionales críticos.
6. **¿Qué eviction policy configuras para una caché y por qué?**
   `allkeys-lru` (o `allkeys-lfu` si hay popularidad estable). El default `noeviction` provoca errores de escritura cuando se llena la memoria.
7. **¿Cuándo NO cachearías algo?**
   Si requiere consistencia fuerte en la ruta crítica, si tiene baja tasa de acierto, si la consulta ya es rápida o si la caché solo oculta una consulta sin índice.
8. **Tu BD cae cada vez que se reinicia Redis. ¿Qué harías?**
   La BD está dimensionada contando con la caché: agregar HA a Redis, precalentar keys críticas, TTL con jitter, single-flight, rate limiting y circuit breaker hacia la BD, y revisar la capacidad de la BD sin caché.

## Errores comunes

- Cachear sin TTL.
- Invalidar antes del commit o dentro de la transacción.
- Actualizar la caché en lugar de borrarla ante escrituras concurrentes.
- Mismo TTL fijo para todas las keys cargadas a la vez (avalanche).
- No cachear negativos ante IDs inexistentes.
- Usar Redis con `noeviction` como caché, o mezclar caché y datos críticos en la misma instancia.
- `KEYS *` en producción.
- Usar la caché para esconder consultas sin índice.
- Leer saldo o stock desde la caché para decisiones transaccionales.
- No medir el hit ratio: una caché con 20% de aciertos probablemente sobra.
