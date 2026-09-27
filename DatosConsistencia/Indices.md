# Índices

Un **índice** es una estructura de datos auxiliar, separada de la tabla (o que *es* la tabla, en el caso de un índice clustered), que permite localizar filas sin recorrer toda la tabla. Acelera lecturas a cambio de **espacio**, **costo en escrituras** y **mantenimiento**. Un índice no es gratis: cada uno es una apuesta sobre cómo se va a consultar la tabla.

Relacionado: [PlanesDeEjecucion.md](PlanesDeEjecucion.md), [Performance.md](Performance.md), [InternosMotor.md](InternosMotor.md), [Normalizacion.md](Normalizacion.md).

## Cómo funciona un B-tree

El índice por defecto en PostgreSQL, MySQL/InnoDB, SQL Server y Oracle es un **B+tree** (se le dice "B-tree" coloquialmente).

- Está organizado en **páginas** de tamaño fijo: 8 KB en PostgreSQL y SQL Server, 16 KB en InnoDB.
- **Nodos internos**: contienen claves separadoras y punteros a páginas hijas.
- **Hojas**: contienen las claves ordenadas y un puntero a la fila (en PostgreSQL, el `ctid` = página + offset en el heap; en InnoDB, el valor de la PK). Las hojas están enlazadas entre sí, lo que permite **range scans** eficientes y recorrer en orden (`ORDER BY` sin sort).
- **Fan-out alto**: una página de 8 KB con claves `bigint` guarda cientos de entradas. Con fan-out ~300, 3 niveles cubren ~27 millones de claves y 4 niveles ~8 mil millones.
- **Altura** = O(log_fanout n). En la práctica, la altura es 2-4 y los niveles superiores viven en memoria (buffer pool), así que una búsqueda puntual cuesta 1-2 lecturas de disco reales.
- Es **auto-balanceado**: los inserts provocan *page splits* cuando una hoja se llena. Inserts en orden (secuencias) llenan la hoja derecha; inserts aleatorios (UUID v4) dividen páginas por todo el árbol, lo que aumenta fragmentación, tamaño e I/O (ver [Normalizacion.md](Normalizacion.md#claves-naturales-vs-surrogate)).

Operaciones que un B-tree resuelve bien: `=`, `<`, `>`, `BETWEEN`, `IN`, `LIKE 'prefijo%'`, `IS NULL` (en PostgreSQL), `ORDER BY` y `MIN/MAX`.

## Tipos de índice

| Tipo | Motor | Sirve para | No sirve para |
|------|-------|------------|---------------|
| **B-tree** | Todos | Igualdad, rangos, orden, prefijos | Contención (`@>`), búsqueda de texto libre |
| **Hash** | PG (WAL-safe desde v10), MEMORY en MySQL | Solo igualdad `=` | Rangos, orden, unicidad compuesta |
| **GIN** | PG | Valores multi-elemento: `jsonb`, arrays, `tsvector`, `pg_trgm` | Rangos escalares; es caro de actualizar |
| **GiST** | PG | Geometría (PostGIS), rangos (`tstzrange`), vecino más cercano, `EXCLUDE` | Igualdad simple (B-tree es mejor) |
| **SP-GiST** | PG | Datos particionables no balanceados (quadtrees, IPs) | Uso general |
| **BRIN** | PG | Tablas enormes con correlación física (timestamps append-only) | Datos desordenados físicamente |
| **Full-text** | PG (`tsvector` + GIN), MySQL `FULLTEXT`, SQL Server Full-Text | Búsqueda por palabras, stemming, ranking | Búsqueda exacta; relevancia avanzada (usar Elasticsearch/OpenSearch) |

```sql
-- GIN sobre JSONB: acelera @>, ?, ?|
CREATE INDEX idx_eventos_payload ON eventos USING gin (payload jsonb_path_ops);
SELECT * FROM eventos WHERE payload @> '{"tipo": "pago"}';

-- GIN con trigramas: habilita LIKE '%texto%' e ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_clientes_nombre_trgm ON clientes USING gin (nombre gin_trgm_ops);

-- BRIN: pocos KB para una tabla de cientos de GB ordenada por tiempo
CREATE INDEX idx_logs_creado_brin ON logs USING brin (creado_en);

-- Full-text en PostgreSQL
ALTER TABLE articulos ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', titulo || ' ' || cuerpo)) STORED;
CREATE INDEX idx_articulos_tsv ON articulos USING gin (tsv);
SELECT id FROM articulos WHERE tsv @@ plainto_tsquery('spanish', 'índices compuestos');
```

- **GIN** es rápido para leer y lento para escribir (usa una *pending list* con `fastupdate`); en tablas con muchas escrituras, medir.
- **BRIN** guarda min/max por rango de bloques: si los datos no están físicamente ordenados, es inútil.

### InnoDB (MySQL): clustered index y por qué la PK importa

- En InnoDB **la tabla es el índice de la PK** (clustered index): las hojas del B-tree de la PK contienen la fila completa.
- Los **índices secundarios** guardan en sus hojas el valor de la **PK**, no un puntero físico. Una búsqueda por índice secundario hace dos recorridos: secundario → PK → fila (*bookmark lookup*).
- Consecuencias:
  - Una **PK ancha** (ej. `VARCHAR(255)` o UUID en texto de 36 bytes) se copia en **todos** los índices secundarios: más espacio, menos entradas por página.
  - Una **PK aleatoria** (UUID v4) provoca inserts dispersos, page splits y un buffer pool menos efectivo. Preferir `BIGINT AUTO_INCREMENT` o UUID ordenado por tiempo (v7) guardado como `BINARY(16)`.
  - Sin PK explícita, InnoDB usa el primer `UNIQUE NOT NULL` o crea un `row_id` oculto de 6 bytes (con contención global). Siempre define PK.
- **PostgreSQL no tiene clustered index** persistente: la tabla es un *heap* y todos los índices son secundarios. `CLUSTER tabla USING idx` reordena una sola vez; el orden se degrada con las escrituras.

### SQL Server: clustered vs non-clustered

- **Clustered**: define el orden físico de la tabla; solo uno por tabla. Por defecto la PK se crea como clustered (se puede cambiar con `PRIMARY KEY NONCLUSTERED`).
- **Non-clustered**: estructura aparte; sus hojas apuntan a la clave clustered (o a un RID si la tabla es *heap*).
- Buena clave clustered: **estrecha, única, estática y creciente** (ej. `BIGINT IDENTITY`). `NEWID()` como clustered es un antipatrón clásico; `NEWSEQUENTIALID()` lo mitiga.
- SQL Server ofrece además **columnstore** para analítica (ver [OLTPvsOLAP.md](OLTPvsOLAP.md)).

## Índices compuestos y regla del prefijo izquierdo

Un índice sobre `(a, b, c)` está ordenado por `a`, luego `b` dentro de cada `a`, luego `c`. Es como una guía telefónica ordenada por apellido y luego nombre.

- Sirve para filtros sobre `a`, `a + b`, `a + b + c` (**prefijo izquierdo**).
- No sirve (o sirve mal) para filtrar solo por `b` o solo por `c`. PostgreSQL puede hacer un full index scan si es más barato que la tabla; MySQL 8 tiene *skip scan* limitado; Oracle también. No contar con ello.

**Orden de columnas: igualdad primero, luego rango.**

```sql
-- Consulta típica
SELECT * FROM pedidos
WHERE cliente_id = 42 AND estado = 'PAGADO' AND creado_en >= now() - interval '30 days'
ORDER BY creado_en DESC
LIMIT 20;

-- Buen índice: igualdades primero, rango/orden al final
CREATE INDEX idx_pedidos_cli_est_fecha ON pedidos (cliente_id, estado, creado_en DESC);
```

- Tras la primera columna usada con **rango**, las columnas siguientes no pueden usarse para acotar la búsqueda en el árbol (solo como filtro dentro del índice).
- Si el índice fuera `(cliente_id, creado_en, estado)`, el rango sobre `creado_en` dejaría `estado` como filtro residual: se leen más entradas de las necesarias.
- Poner la columna de `ORDER BY` al final permite devolver las filas ya ordenadas y cortar con `LIMIT` sin sort.
- La regla "la columna más selectiva primero" es un mito parcial: lo que importa es **qué predicados son de igualdad** y **qué combinaciones de consultas** deben servirse con el mismo índice.
- Un índice `(a, b)` hace redundante a un índice `(a)` (salvo casos de tamaño muy distinto o unicidad).

## Covering index, INCLUDE e index-only scan

Si el índice contiene **todas las columnas** que la consulta necesita, el motor no visita la tabla.

```sql
-- PostgreSQL 11+ y SQL Server: columnas no clave en las hojas
CREATE INDEX idx_pedidos_cliente_cov ON pedidos (cliente_id) INCLUDE (total, estado);

SELECT total, estado FROM pedidos WHERE cliente_id = 42;  -- Index Only Scan
```

- Las columnas de `INCLUDE` no forman parte del orden ni de la unicidad; solo viajan en las hojas. Útil para `UNIQUE (email) INCLUDE (nombre)`.
- **PostgreSQL**: el index-only scan depende del **visibility map**. Si las páginas no están marcadas como *all-visible* (falta de `VACUUM`), el motor igual consulta el heap. En `EXPLAIN (ANALYZE)` mira `Heap Fetches`.
- **InnoDB**: todo índice secundario incluye implícitamente la PK, así que `(cliente_id)` ya "cubre" `SELECT id ... WHERE cliente_id = ?`. MySQL no tiene `INCLUDE`: se agregan columnas al final de la clave.
- Trade-off: índices más anchos = más espacio, más I/O de escritura, menos entradas por página. No conviertas cada índice en una copia de la tabla.

## Índices parciales, de expresión y únicos

```sql
-- Parcial: solo indexa lo que se consulta (pequeño y rápido)
CREATE INDEX idx_pedidos_pendientes ON pedidos (creado_en) WHERE estado = 'PENDIENTE';
-- La consulta debe incluir un predicado que implique el WHERE del índice
SELECT * FROM pedidos WHERE estado = 'PENDIENTE' AND creado_en < now() - interval '1 hour';

-- Unicidad condicional (soft delete): email único solo entre activos
CREATE UNIQUE INDEX uq_usuarios_email_activo ON usuarios (lower(email)) WHERE eliminado_en IS NULL;

-- De expresión: la consulta debe usar exactamente la misma expresión
CREATE INDEX idx_usuarios_email_lower ON usuarios (lower(email));
SELECT * FROM usuarios WHERE lower(email) = lower('Ana@Email.com');
```

- **Parciales**: PostgreSQL y SQL Server (*filtered indexes*). MySQL no los tiene.
- **Expresión**: PostgreSQL; MySQL 8.0.13+ (*functional key parts*, o columna generada indexada); SQL Server vía columna calculada persistida.
- **Únicos**: además de acelerar, **garantizan integridad**; es la única forma correcta de evitar duplicados bajo concurrencia (un `SELECT` antes del `INSERT` tiene race conditions). En PostgreSQL los `NULL` se consideran distintos salvo `NULLS NOT DISTINCT` (PG 15+). SQL Server permite un solo `NULL` en un índice único (salvo filtrado).

## Selectividad y cardinalidad

- **Cardinalidad**: número de valores distintos de una columna (`n_distinct` en `pg_stats`).
- **Selectividad**: fracción de filas que devuelve un predicado. Alta selectividad = pocas filas = el índice conviene.
- Umbral orientativo: por encima de ~5-15% de las filas, un **Seq Scan** suele ser más barato que un index scan, porque el index scan hace I/O aleatorio a la tabla. El umbral depende de `random_page_cost`, correlación física y caché.
- PostgreSQL tiene **Bitmap Index Scan** como punto intermedio: recolecta TIDs, los ordena por página y lee el heap secuencialmente. También permite combinar varios índices (`BitmapAnd` / `BitmapOr`).
- Columnas booleanas o de estado con distribución sesgada: un índice completo no sirve para el valor mayoritario, pero un **índice parcial** sobre el valor minoritario es excelente.

```sql
SELECT attname, n_distinct, most_common_vals, most_common_freqs, correlation
FROM pg_stats WHERE tablename = 'pedidos';
```

## Cuándo el optimizador NO usa un índice

| Causa | Ejemplo | Solución |
|-------|---------|----------|
| **Función sobre la columna** | `WHERE date(creado_en) = '2026-01-01'` | Reescribir como rango: `creado_en >= '2026-01-01' AND creado_en < '2026-01-02'`, o índice de expresión |
| **Aritmética sobre la columna** | `WHERE precio * 1.19 > 100` | `WHERE precio > 100 / 1.19` |
| **LIKE con comodín inicial** | `WHERE nombre LIKE '%perez'` | `pg_trgm` + GIN, full-text, o columna invertida |
| **Cast implícito** | `WHERE telefono = 5551234` con `telefono VARCHAR` (MySQL convierte la columna) | Usar el tipo correcto en el parámetro |
| **Collation / opclass** | `LIKE 'abc%'` en PG con collation no-C | Índice con `text_pattern_ops` |
| **OR entre columnas distintas** | `WHERE a = 1 OR b = 2` | Índices separados (BitmapOr en PG, index merge en MySQL) o `UNION ALL` |
| **Baja selectividad** | `WHERE activo = true` con 95% activos | Es correcto no usarlo; considerar índice parcial |
| **Estadísticas desactualizadas** | Tras carga masiva, el planner estima 1 fila | `ANALYZE tabla`; ajustar `default_statistics_target`; `CREATE STATISTICS` para columnas correlacionadas |
| **No es prefijo izquierdo** | Índice `(a, b)` y filtro solo por `b` | Otro índice o reordenar |
| **Negaciones** | `WHERE estado <> 'X'`, `NOT IN` | Normalmente poco selectivas; reformular |
| **Prepared statements genéricos** | Plan genérico ignora el valor real (sesgo) | `plan_cache_mode`, revisar con `EXPLAIN` usando el valor real |
| **Tablas pequeñas** | 200 filas | Seq Scan es más barato; está bien |

En SQL Server, el caso de casts implícitos se llama **non-SARGable predicate** (ej. comparar `NVARCHAR` contra columna `VARCHAR`). Siempre verifica con `EXPLAIN (ANALYZE, BUFFERS)`, ver [PlanesDeEjecucion.md](PlanesDeEjecucion.md).

## Costo en escrituras y write amplification

- Cada `INSERT` escribe en la tabla **y en cada índice**. Cada `DELETE` marca entradas en cada índice.
- Cada `UPDATE`:
  - **PostgreSQL** crea una nueva versión de la fila (MVCC). Si no cambia ninguna columna indexada y hay espacio en la página, se hace un **HOT update** (Heap-Only Tuple) y los índices no se tocan. Si cambia una columna indexada, **todos** los índices reciben una nueva entrada. Por eso indexar una columna que se actualiza mucho (ej. `actualizado_en`) puede destruir los HOT updates. Ajustar `fillfactor` (ej. 90) deja espacio para HOT.
  - **InnoDB** actualiza en el lugar y solo toca los índices secundarios cuyas columnas cambian; cambiar la PK es muy caro (reescribe la fila y todos los secundarios).
- **Write amplification**: un insert lógico se convierte en N escrituras de páginas + WAL/redo log + posibles page splits. Con 10 índices, las escrituras se multiplican y el WAL crece (impacta réplicas y backups; ver [ReadReplicas.md](ReadReplicas.md)).
- Regla práctica: en tablas OLTP de alta escritura, **cada índice debe justificar su existencia** con consultas reales.

## Índices redundantes y no usados

```sql
-- Índices nunca usados desde el último reset de estadísticas (PostgreSQL)
SELECT s.schemaname, s.relname AS tabla, s.indexrelname AS indice,
       s.idx_scan, pg_size_pretty(pg_relation_size(s.indexrelid)) AS tamano
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0
  AND NOT i.indisunique           -- no borrar los que garantizan unicidad
  AND NOT i.indisprimary
ORDER BY pg_relation_size(s.indexrelid) DESC;
```

- Revisar `idx_scan` en **todas las réplicas**: las estadísticas son locales; un índice sin uso en el primario puede ser crítico para consultas de reportes en una réplica.
- Considerar desde cuándo se acumulan (`pg_stat_reset`, reinicios) y consultas mensuales/trimestrales antes de borrar.
- **Redundantes**: `(a)` cuando existe `(a, b)`; duplicados exactos creados por ORMs o migraciones (ver [Migraciones.md](Migraciones.md), [ORMs.md](ORMs.md)).
- **FK sin índice**: PostgreSQL **no** crea índices automáticamente en columnas FK (MySQL sí). Sin él, un `DELETE` en la tabla padre hace seq scan en la hija y los joins sufren.
- MySQL: `sys.schema_unused_indexes` y `sys.schema_redundant_indexes`. SQL Server: `sys.dm_db_index_usage_stats`.

## CREATE INDEX CONCURRENTLY

- `CREATE INDEX` normal toma un lock `SHARE` que **bloquea escrituras** durante toda la construcción. En una tabla grande en producción, eso es una caída.
- `CREATE INDEX CONCURRENTLY` permite escrituras: hace dos pasadas sobre la tabla y espera a que terminen las transacciones previas.

```sql
CREATE INDEX CONCURRENTLY idx_pedidos_cliente ON pedidos (cliente_id);
```

- Trade-offs:
  - Más lento (dos scans) y no puede ejecutarse **dentro de una transacción** (muchas herramientas de migración envuelven en transacción: desactivarlo para esa migración).
  - Si falla (ej. violación de unicidad, deadlock), deja un índice **INVALID** que igual se mantiene en escrituras. Detectarlo y borrarlo:
    ```sql
    SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
    DROP INDEX CONCURRENTLY idx_pedidos_cliente;
    ```
  - Espera a transacciones largas: una transacción abierta de horas lo bloquea.
- Equivalentes: MySQL/InnoDB `ALTER TABLE ... ADD INDEX, ALGORITHM=INPLACE, LOCK=NONE` (online DDL) o herramientas como `gh-ost`/`pt-online-schema-change`; SQL Server `WITH (ONLINE = ON)` (Enterprise).

## Bloat y REINDEX

- En PostgreSQL, las versiones muertas de filas dejan entradas muertas en los índices. `VACUUM` las marca como reutilizables, pero **no reduce** el tamaño del archivo ni recompacta páginas medio vacías. Resultado: **bloat** (índice más grande de lo necesario, más I/O, peor caché).
- Causas típicas: updates masivos, deletes masivos, transacciones largas que impiden a `VACUUM` limpiar, autovacuum mal configurado (ver [InternosMotor.md](InternosMotor.md)).
- PG 13+ tiene **deduplicación** en B-tree y PG 14 *bottom-up deletion*, que reducen bastante el bloat por updates.
- Medir con la extensión `pgstattuple` (`pgstatindex('idx')` → `avg_leaf_density`) o queries de estimación de bloat.
- Corregir:
  ```sql
  REINDEX INDEX CONCURRENTLY idx_pedidos_cliente;   -- PG 12+, sin bloquear escrituras
  REINDEX TABLE CONCURRENTLY pedidos;
  ```
  `REINDEX` sin `CONCURRENTLY` bloquea escrituras (y lecturas que usen ese índice). `pg_repack` es la alternativa para tablas + índices sin locks largos.
- SQL Server: `ALTER INDEX ... REORGANIZE` (liviano) o `REBUILD` (completo). MySQL: `OPTIMIZE TABLE` (reconstruye la tabla).

## Estrategia práctica para decidir índices

1. Partir de las **consultas reales** (`pg_stat_statements`, slow query log), no de las columnas.
2. Priorizar por tiempo total (`total_exec_time`), no solo por la consulta más lenta.
3. Diseñar un índice que sirva a varias consultas (prefijos compartidos).
4. Validar con `EXPLAIN (ANALYZE, BUFFERS)` antes y después.
5. Crear con `CONCURRENTLY` y monitorear su uso semanas después.
6. Revisar periódicamente índices no usados y bloat (ver [Observabilidad.md](Observabilidad.md)).

## Preguntas de entrevista

1. **¿Por qué un B-tree tiene altura tan baja incluso con miles de millones de filas?**
   Por el fan-out alto: cada página de 8-16 KB contiene cientos de claves, así que la altura es log base ~300 de n; 4 niveles cubren miles de millones y los niveles superiores están en caché.
2. **Tienes `WHERE tenant_id = ? AND created_at > ? ORDER BY created_at`. ¿Qué índice creas?**
   `(tenant_id, created_at)`: igualdad primero, luego rango, que además satisface el orden y permite cortar con `LIMIT`. Al revés, el rango sobre `created_at` impediría acotar por `tenant_id`.
3. **¿Por qué es mala idea UUID v4 como PK en InnoDB?**
   La tabla está agrupada por la PK: los inserts aleatorios provocan page splits, fragmentación y bajo hit ratio del buffer pool, y la PK (16-36 bytes) se replica en cada índice secundario. Usar `BIGINT` o UUIDv7 en `BINARY(16)`.
4. **Un índice existe pero `EXPLAIN` muestra Seq Scan. ¿Qué revisas?**
   Selectividad real vs estimada (`ANALYZE`), funciones o casts sobre la columna, prefijo izquierdo, tamaño de la tabla, tipo de parámetro, collation/opclass, y si el plan genérico de un prepared statement ignora el valor.
5. **¿Qué es un index-only scan y por qué en PostgreSQL a veces igual va al heap?**
   Responde solo desde el índice si contiene todas las columnas. En PG depende del visibility map: si la página no está marcada all-visible, debe verificar visibilidad en el heap (`Heap Fetches`). Un `VACUUM` al día lo mejora.
6. **¿Cómo agregas un índice a una tabla de 500 GB en producción?**
   `CREATE INDEX CONCURRENTLY` fuera de transacción, en horario de baja carga, vigilando transacciones largas y el lag de réplicas; verificar que no quede `INVALID`. En MySQL, online DDL o gh-ost.
7. **¿Cuándo NO agregarías un índice?**
   Tablas pequeñas, columnas de baja selectividad sin sesgo aprovechable, tablas con escritura intensa donde el índice no se usa en consultas críticas, o cuando rompería HOT updates en columnas que cambian constantemente.
8. **¿Cómo garantizas que un email sea único ignorando mayúsculas y solo entre usuarios activos?**
   `CREATE UNIQUE INDEX ... ON usuarios (lower(email)) WHERE eliminado_en IS NULL` en PostgreSQL (o tipo `citext`). En MySQL, columna generada + índice único, ya que no hay índices parciales.

## Errores comunes

- Crear un índice por columna "por si acaso" en vez de índices compuestos pensados por consulta.
- Olvidar indexar columnas FK en PostgreSQL.
- Envolver la columna en funciones (`date()`, `lower()`, `CAST`) y esperar que se use el índice normal.
- Ejecutar `CREATE INDEX` sin `CONCURRENTLY` en producción y bloquear escrituras.
- Dejar índices `INVALID` tras un `CONCURRENTLY` fallido.
- Borrar índices "no usados" mirando solo el primario y rompiendo consultas en réplicas.
- Confiar en un `SELECT` previo para evitar duplicados en lugar de un `UNIQUE`.
- Indexar columnas de timestamp que se actualizan en cada escritura y perder los HOT updates.
