# Performance en Bases de Datos

Optimizar una base de datos no consiste en aplicar trucos sueltos. Es un ciclo: **medir, encontrar el cuello de botella, corregirlo y volver a medir**. Este archivo cubre la metodología y las técnicas del lado de las consultas y del esquema. Para el detalle de cada tema hay archivos propios:

- Leer planes (`EXPLAIN ANALYZE`): [PlanesDeEjecucion.md](PlanesDeEjecucion.md)
- Diseño de índices: [Indices.md](Indices.md)
- Caché delante de la BD: [Caching.md](Caching.md)
- Pool de conexiones: [ConnectionPooling.md](ConnectionPooling.md)
- N+1 y SQL que generan los ORMs: [ORMs.md](ORMs.md)
- Métricas y alertas: [Observabilidad.md](Observabilidad.md)

## Metodología: medir primero

- **No optimices por intuición.** Con frecuencia la consulta "obviamente lenta" no es el problema: lo es otra de 3 ms que se ejecuta 50.000 veces por minuto.
- Ordena las consultas por **tiempo total** (`calls × mean`), no por el tiempo medio. Así ves dónde se gasta realmente la BD.
- Usa **percentiles (p95/p99)**, no promedios. Un promedio de 20 ms puede ocultar un p99 de 2 s causado por esperas de locks, cold cache o planes malos para ciertos parámetros.
- Separa **latencia** de **throughput**: una consulta puede ser rápida sola y degradarse con concurrencia por contención (locks, CPU, IO).

### pg_stat_statements

Es la extensión estándar para ver qué consultas consumen la BD, normalizadas y sin literales.

```sql
-- postgresql.conf: shared_preload_libraries = 'pg_stat_statements'
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT
  queryid,
  calls,
  round(total_exec_time::numeric, 0)          AS total_ms,
  round(mean_exec_time::numeric, 2)           AS mean_ms,
  round(stddev_exec_time::numeric, 2)         AS stddev_ms,
  rows,
  shared_blks_hit,
  shared_blks_read,                            -- lecturas fuera del buffer cache
  left(query, 120)                             AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

- Si `stddev` es alto comparado con `mean`, suele haber varianza por parámetros (datos sesgados) o esperas.
- Si `shared_blks_read` es alto, la consulta va a disco: faltan índices o memoria.
- Resetea con `SELECT pg_stat_statements_reset();` antes de medir un cambio.

### Slow query log y auto_explain

```conf
log_min_duration_statement = 500ms   # registra consultas que tardan más de 500 ms
auto_explain.log_min_duration = 1s   # registra el plan real de las muy lentas
auto_explain.log_analyze = on        # cuidado: agrega overhead; en prod, usar sampling
auto_explain.sample_rate = 0.1
```

- En MySQL el equivalente es `slow_query_log` + `long_query_time`.
- `auto_explain` sirve para capturar el plan **en el momento** en que la consulta fue lenta, que puede ser distinto al que ves después en tu consola.

### Flujo típico

1. p99 de un endpoint sube → trazas APM muestran que el tiempo está en la BD.
2. `pg_stat_statements` identifica la consulta.
3. `EXPLAIN (ANALYZE, BUFFERS)` con parámetros reales → ver [PlanesDeEjecucion.md](PlanesDeEjecucion.md).
4. Corrección (índice, reescritura, cambio de acceso desde la app).
5. Volver a medir en el mismo percentil.

## Paginación: OFFSET vs keyset (cursor)

### Por qué OFFSET escala mal

```sql
SELECT id, title, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 20 OFFSET 100000;
```

- La BD tiene que **generar y descartar** 100.000 filas antes de devolver 20. El costo es **O(offset + limit)**: la página 5.000 es 5.000 veces más cara que la primera.
- Es **inestable**: si entran filas nuevas mientras el usuario pagina, aparecen filas duplicadas o se saltan otras.
- OFFSET sigue siendo aceptable con tablas pequeñas, en backoffices donde se "salta a la página N" y donde el offset máximo está acotado.

### Keyset pagination

Se recuerda la última fila vista y se pide "lo que viene después". Como `created_at` no es único, se desempata con `id`:

```sql
CREATE INDEX idx_posts_created_id ON posts (created_at DESC, id DESC);

-- Primera página
SELECT id, title, created_at
FROM posts
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Siguientes: el cliente envía (created_at, id) de la última fila
SELECT id, title, created_at
FROM posts
WHERE (created_at, id) < ($1, $2)       -- comparación de tuplas (row values)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

- Con el índice compuesto, la BD hace un **Index Scan** que arranca en el punto exacto y lee 20 entradas: costo **O(log n + limit)** sin importar la profundidad.
- El `ORDER BY` debe coincidir con el orden del índice (o ser exactamente su inverso).
- Si hay filtros (`WHERE tenant_id = $3`), inclúyelos al inicio del índice: `(tenant_id, created_at DESC, id DESC)`.
- El cursor se expone a la API como token opaco (base64 de `created_at|id`), para que el cliente no dependa de su formato.

```ts
// Codificación de cursor opaco
const encodeCursor = (r: { createdAt: Date; id: string }) =>
  Buffer.from(`${r.createdAt.toISOString()}|${r.id}`).toString('base64url');

const decodeCursor = (c: string) => {
  const [createdAt, id] = Buffer.from(c, 'base64url').toString().split('|');
  return { createdAt: new Date(createdAt), id };
};
```

| | OFFSET | Keyset |
|---|---|---|
| Costo en página profunda | O(offset) | O(log n) |
| Saltar a página N | Sí | No (solo siguiente/anterior) |
| Estable ante inserciones | No | Sí |
| Requiere orden determinista + índice | Recomendable | Obligatorio |

- Prisma soporta keyset con `cursor` + `skip: 1`; en TypeORM se arma con QueryBuilder. **Cuidado**: el `cursor` de Prisma usa un solo campo único; para `(created_at, id)` suele convenir armar el `where` a mano.

## Proyección de columnas

- `SELECT *` trae columnas que no usas, incluidas columnas **TOAST** (textos/JSON grandes) que requieren lecturas extra.
- Impide **Index Only Scans**: si el índice cubre `(email, name)` y pides `*`, hay que ir al heap.
- Rompe fácilmente cuando cambia el esquema (orden de columnas, columnas nuevas pesadas).

```sql
-- Índice cubriente: permite Index Only Scan
CREATE INDEX idx_users_email_cov ON users (email) INCLUDE (name);
SELECT email, name FROM users WHERE email = 'a@b.com';
```

En ORMs: `select` en Prisma, `.select([...])` en TypeORM, proyecciones/DTOs en JPA. Ver [ORMs.md](ORMs.md).

## Escrituras masivas

### Batch inserts

Insertar fila por fila significa un round-trip y (en autocommit) un commit con `fsync` por cada fila.

```sql
-- Un solo statement con múltiples filas
INSERT INTO events (user_id, type, payload)
VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9);

-- Alternativa con arrays (un solo parámetro por columna, no depende del N)
INSERT INTO events (user_id, type)
SELECT * FROM unnest($1::bigint[], $2::text[]);
```

- Lotes de 500-5.000 filas suelen ser un buen punto: lotes gigantes generan transacciones largas, mucho WAL de golpe y el límite de 65.535 parámetros del protocolo.
- Para cargas grandes, **`COPY`** es entre 5 y 10 veces más rápido que `INSERT`:

```ts
import { from as copyFrom } from 'pg-copy-streams';
import { pipeline } from 'node:stream/promises';

const client = await pool.connect();
try {
  const stream = client.query(copyFrom('COPY events (user_id, type) FROM STDIN WITH (FORMAT csv)'));
  await pipeline(csvReadable, stream);
} finally {
  client.release();
}
```

- En cargas iniciales: crear índices y FKs **después** de cargar los datos.

### Bulk updates

```sql
-- Actualizar muchas filas con valores distintos en un statement
UPDATE products p
SET price = v.price
FROM (VALUES (1, 10.5), (2, 20.0), (3, 7.25)) AS v(id, price)
WHERE p.id = v.id;
```

- Para actualizar millones de filas, hazlo **en lotes** (por rango de PK) con commits intermedios: evitas locks largos, lag de réplicas y bloat. Ver backfills en [Migraciones.md](Migraciones.md).

## Evitar N+1

El problema más común en backends con ORM: 1 consulta para la lista y N consultas para las relaciones. Se resuelve con eager loading, JOIN o `WHERE id IN (...)` / DataLoader. Detalle completo en [ORMs.md](ORMs.md).

## Set-based vs fila por fila

La BD está optimizada para operar sobre **conjuntos**. Iterar en la app (o con cursores en PL/pgSQL) multiplica round-trips y anula el optimizador.

```ts
// Mal: N round-trips, N transacciones
for (const o of overdueOrders) {
  await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['expired', o.id]);
}
```

```sql
-- Bien: una sola sentencia
UPDATE orders
SET status = 'expired'
WHERE status = 'pending' AND created_at < now() - interval '7 days';
```

- Cuando el conjunto es enorme, combina lo set-based con lotes (`... AND id BETWEEN $1 AND $2`).
- Para lógica compleja: CTEs, `INSERT ... SELECT`, `UPDATE ... FROM`, `MERGE` (PG15+), `INSERT ... ON CONFLICT`. Ver [SQLAvanzado.md](SQLAvanzado.md).

## COUNT(*) es caro

En PostgreSQL, por MVCC, cada fila puede ser visible o no según la transacción, así que `COUNT(*)` debe **recorrer la tabla o un índice completo** (el Index Only Scan ayuda solo si el visibility map está al día). Ver [InternosMotor.md](InternosMotor.md).

Alternativas:

- **No mostrar el total exacto**: "más de 1.000 resultados" o simplemente "siguiente página".
- **Conteo acotado**: `SELECT count(*) FROM (SELECT 1 FROM t WHERE ... LIMIT 1001) s;`
- **Estimación** del planner (muy barata, precisión aproximada):

```sql
SELECT reltuples::bigint AS estimado FROM pg_class WHERE oid = 'public.orders'::regclass;
-- Para una consulta con filtros: parsear las filas estimadas de EXPLAIN (FORMAT JSON)
```

- **Contadores mantenidos**: tabla de contadores actualizada por la app o por trigger. Ojo: un contador global en una sola fila se vuelve un **hotspot de locks**; se puede repartir en N filas y sumarlas.
- `EXISTS` en vez de `COUNT(*) > 0` para verificar existencia: se detiene en la primera fila.

## Tipos de datos correctos

- **IDs: usa `BIGINT` (o `bigint GENERATED ALWAYS AS IDENTITY`).** `INT` llega hasta ~2.147 millones. Agotarlo en una PK es un incidente real y frecuente: las inserciones fallan y migrar a `BIGINT` una tabla grande requiere reescribirla (con el FK en cascada). Los 4 bytes ahorrados por fila casi nunca justifican ese riesgo.
- UUID: si lo usas como PK, prefiere **UUIDv7** (ordenado en el tiempo) sobre UUIDv4: los valores aleatorios dispersan las inserciones por todo el B-tree (page splits, peor uso del caché). Guárdalo como `uuid` (16 bytes), no como `text` (36+ bytes).
- Dinero: `numeric(12,2)` o enteros en centavos; **nunca** `float`/`real`.
- Fechas: `timestamptz` en lugar de `timestamp` (evita bugs de zona horaria; ocupa lo mismo).
- Texto: en PostgreSQL `text` y `varchar(n)` rinden igual; `varchar(n)` es solo una restricción.
- `jsonb` sobre `json` si vas a consultar su contenido; pero no lo uses para evitar modelar columnas que filtras siempre.
- Mismo tipo en ambos lados de un JOIN/WHERE: comparar `bigint` con `text` o aplicar una función a la columna **impide usar el índice**.

```sql
-- No usa el índice sobre created_at
SELECT * FROM orders WHERE date(created_at) = '2026-01-01';
-- Sí lo usa (rango sargable)
SELECT * FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2026-01-02';
```

## Timeouts: proteger a la BD de sí misma

Una consulta descontrolada o una transacción que espera un lock puede tumbar todo el sistema (se acumulan conexiones y el pool se agota).

```sql
-- Por rol (aplica a todas las conexiones de la app)
ALTER ROLE app_user SET statement_timeout = '5s';
ALTER ROLE app_user SET lock_timeout = '2s';
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '30s';

-- Por transacción, para una operación puntual más larga
BEGIN;
SET LOCAL statement_timeout = '60s';
-- ...
COMMIT;
```

- **`statement_timeout`**: cancela consultas que tardan más de X.
- **`lock_timeout`**: cancela si espera un lock más de X. Esencial en migraciones (ver [Migraciones.md](Migraciones.md)).
- **`idle_in_transaction_session_timeout`**: mata sesiones con `BEGIN` abierto y sin actividad (típico de bugs en la app). Esas sesiones retienen locks y bloquean al VACUUM.
- El timeout de la BD debe ser **menor** que el timeout HTTP: si el cliente ya se fue, no tiene sentido seguir ejecutando.

## Configuración clave de PostgreSQL

| Parámetro | Qué hace | Punto de partida |
|---|---|---|
| `shared_buffers` | Caché de páginas propio de PG | ~25% de la RAM |
| `effective_cache_size` | **Pista** al planner sobre cuánta caché hay (PG + SO). No reserva memoria | 50-75% de la RAM |
| `work_mem` | Memoria **por operación** de sort/hash, por nodo del plan y por conexión | 4-64 MB; subir por sesión cuando haga falta |
| `maintenance_work_mem` | VACUUM, CREATE INDEX | 512 MB - 2 GB |
| `max_connections` | Conexiones máximas | Bajo (100-300) + pooler. Ver [ConnectionPooling.md](ConnectionPooling.md) |
| `random_page_cost` | Costo relativo de acceso aleatorio | 1.1 en SSD (el default de 4 asume discos giratorios) |

- **Cuidado con `work_mem`**: una consulta con 3 hashes × 200 conexiones × 64 MB puede pedir 38 GB. Sube el valor por sesión (`SET work_mem = '256MB'`) solo para reportes.
- Si `EXPLAIN ANALYZE` muestra `Sort Method: external merge Disk`, el sort no cupo en `work_mem`.
- En RDS/Aurora muchos se configuran en **parameter groups** y algunos defaults ya son razonables.

## Vistas materializadas

Guardan físicamente el resultado de una consulta costosa (agregaciones, dashboards).

```sql
CREATE MATERIALIZED VIEW sales_daily AS
SELECT date_trunc('day', created_at) AS day, product_id, sum(amount) AS total
FROM orders
GROUP BY 1, 2;

CREATE UNIQUE INDEX ON sales_daily (day, product_id);  -- requerido para CONCURRENTLY

REFRESH MATERIALIZED VIEW CONCURRENTLY sales_daily;    -- no bloquea lecturas
```

- El refresh es **completo** (PostgreSQL no tiene refresh incremental nativo). Si la base es grande y cambia poco, puede convenir una tabla resumen mantenida de forma incremental (job o trigger).
- Los datos quedan **stale** hasta el próximo refresh: solo sirve si el negocio tolera ese retraso.
- Cuando la analítica crece, conviene sacarla del OLTP: ver [OLTPvsOLAP.md](OLTPvsOLAP.md).

## Hardware e IO

- La regla: si el **working set** (datos + índices calientes) cabe en RAM, casi todo es rápido. Mira el **cache hit ratio**:

```sql
SELECT sum(blks_hit) * 100.0 / nullif(sum(blks_hit) + sum(blks_read), 0) AS hit_pct
FROM pg_stat_database;   -- en OLTP se espera > 99%
```

- El **IO del WAL** (commits) es sensible a la latencia de `fsync`: discos con baja latencia o, si el negocio lo tolera, `synchronous_commit = off` para escrituras no críticas (se arriesga perder los últimos ms, no corrompe la BD).
- En la nube: los volúmenes tienen límites de **IOPS y throughput** (gp3, io2). Un volumen saturado se ve como latencia alta sin CPU alta.
- **Bloat**: tablas e índices hinchados por updates/deletes sin VACUUM eficaz ocupan más páginas y reducen el hit ratio. Monitorear autovacuum. Ver [InternosMotor.md](InternosMotor.md).
- Escalar verticalmente es a menudo la solución más barata en tiempo de ingeniería antes de réplicas o sharding. Ver [Escalabilidad.md](Escalabilidad.md).

## Orden recomendado de ataque

1. Consultas: N+1, falta de índices, `SELECT *`, paginación con OFFSET.
2. Acceso desde la app: batching, set-based, pool bien dimensionado.
3. Configuración de la BD y hardware.
4. Caché ([Caching.md](Caching.md)), réplicas de lectura ([ReadReplicas.md](ReadReplicas.md)).
5. Particionado / sharding ([Sharding.md](Sharding.md)): es lo último por su costo operativo.

## Preguntas de entrevista

1. **¿Cómo investigas un endpoint cuyo p99 subió de 200 ms a 2 s?**
   Trazas para confirmar que el tiempo está en la BD; `pg_stat_statements` ordenado por tiempo total y comparado contra la línea base; `EXPLAIN (ANALYZE, BUFFERS)` con los parámetros reales; revisar esperas de locks (`pg_stat_activity.wait_event`), cambios recientes de plan, crecimiento de datos o autovacuum atrasado.
2. **¿Por qué no alcanza con mirar el tiempo promedio?**
   Porque esconde las colas. Los usuarios sufren el p99, y en fan-out (un request que hace 10 consultas) la probabilidad de caer en la cola se multiplica.
3. **¿Por qué OFFSET es lento y cómo lo reemplazas?**
   La BD genera y descarta todas las filas previas: O(offset). Keyset pagination con `WHERE (created_at, id) < ($1, $2)` e índice compuesto en el mismo orden: O(log n) y estable ante inserciones. Trade-off: no se puede saltar a una página arbitraria.
4. **¿Por qué `COUNT(*)` es lento en PostgreSQL y qué harías?**
   MVCC obliga a verificar la visibilidad de cada fila. Opciones: no mostrar el total, conteo acotado con LIMIT, estimación de `pg_class.reltuples`/EXPLAIN o contadores mantenidos (repartidos para evitar hotspots).
5. **¿`INT` o `BIGINT` para una PK?**
   `BIGINT`. El ahorro de 4 bytes es marginal y agotar un `INT` provoca una caída de inserciones y una migración costosa que reescribe la tabla y sus FKs.
6. **¿Qué pasa si subes `work_mem` a 1 GB globalmente?**
   Es por operación y por conexión: con concurrencia puedes provocar OOM. Se sube por sesión o por rol para cargas analíticas.
7. **¿Para qué sirven `lock_timeout` e `idle_in_transaction_session_timeout`?**
   El primero evita que una sesión espere un lock indefinidamente y encole a otras detrás (clave en DDL). El segundo mata transacciones abiertas y ociosas que retienen locks e impiden al VACUUM limpiar.
8. **¿Cuándo usarías una vista materializada y cuándo no?**
   Para agregaciones costosas que toleran datos algo desactualizados. No sirven si se necesita frescura en tiempo real o si el refresh completo cuesta más que el beneficio; en ese caso, tablas resumen incrementales o un sistema OLAP.

## Errores comunes

- Optimizar sin medir, o medir con promedios.
- Probar consultas en local con 1.000 filas y asumir que el plan será igual en producción con 100 millones.
- `SELECT *` en endpoints calientes.
- Paginación con OFFSET en APIs públicas o scroll infinito.
- Bucles de `UPDATE`/`INSERT` fila por fila desde la app.
- Aplicar funciones sobre columnas indexadas en el `WHERE` (`lower(email)`, `date(created_at)`) sin un índice de expresión.
- `INT` en PKs de tablas que crecen.
- No configurar `statement_timeout`: una sola consulta mala agota el pool.
- Subir `max_connections` para "arreglar" la falta de conexiones en lugar de usar un pooler.
