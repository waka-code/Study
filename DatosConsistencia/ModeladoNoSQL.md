# Modelado en NoSQL

En relacional se modela la **información** (normalizar, ver [Normalizacion.md](Normalizacion.md)) y luego se escriben queries. En NoSQL se modela a partir de los **patrones de acceso**: primero las consultas, después el esquema. Para decidir *si* usar NoSQL, ver [SQLvsNoSQL.md](SQLvsNoSQL.md).

## Diseño orientado a patrones de acceso

Antes de diseñar, listar:

1. **Entidades** y sus relaciones (1:1, 1:N, N:M) y la **cardinalidad** real (¿1:pocos o 1:millones?).
2. **Consultas** con frecuencia y latencia esperada: "obtener pedidos de un cliente ordenados por fecha, 20 por página, p99 < 20 ms, 5k rps".
3. **Ratio lectura/escritura** y crecimiento de cada colección.
4. **Requisitos de consistencia** por operación.

Principios:

- **Lo que se lee junto, se guarda junto** (localidad): una consulta = una lectura de partición/documento.
- **Desnormalizar es normal**: se duplica información a cambio de lecturas baratas; el costo se paga en escrituras y en mantener copias sincronizadas.
- Sin joins eficientes (o sin joins) → los joins se hacen **al escribir**, no al leer.
- Cambiar patrones de acceso más tarde es **caro** (a veces requiere migrar todos los datos). Es el principal trade-off frente a SQL.

## MongoDB (documental)

### Embeber vs referenciar

| Embeber (subdocumento/array) | Referenciar (guardar `_id`) |
|---|---|
| Relación 1:1 o 1:pocos | 1:muchos o N:M |
| Se leen siempre juntos | Se leen por separado |
| El hijo no tiene vida propia | El hijo se consulta/actualiza solo |
| Actualización atómica en un documento | Requiere `$lookup` o 2 queries |
| Datos que no cambian (snapshot: dirección de envío de un pedido) | Datos que cambian y se comparten |

```js
// Embeber: pedido con sus líneas (acotadas) y snapshot del cliente
{
  _id: ObjectId("..."),
  customer: { id: ObjectId("..."), name: "Ana" },   // duplicado intencional
  status: "PAID",
  items: [
    { sku: "A1", qty: 2, price: 1990 },
    { sku: "B7", qty: 1, price: 4990 }
  ],
  createdAt: ISODate("2026-09-01T10:00:00Z")
}

// Referenciar: comentarios de un post (sin límite) en su propia colección
{ _id: ObjectId("..."), postId: ObjectId("..."), author: "u1", text: "...", createdAt: ISODate() }
```

- **Límite de 16 MB por documento**: duro. Nunca diseñar documentos que crezcan indefinidamente.
- **Arrays sin límite (unbounded arrays) = antipatrón**: `post.comments[]`, `user.events[]`. El documento crece, cada update reescribe más datos, los índices multikey explotan y eventualmente se alcanza el límite.
- Patrones útiles: **subset** (embeber los últimos 10 comentarios, el resto en otra colección), **bucket** (agrupar lecturas de sensores por hora en un documento), **extended reference** (copiar solo los campos del cliente que se muestran), **computed** (contadores precalculados).

### Índices

```js
db.orders.createIndex({ "customer.id": 1, createdAt: -1 });           // compuesto: igualdad + orden
db.orders.createIndex({ status: 1 }, { partialFilterExpression: { status: "PENDING" } });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
```

- Regla **ESR**: campos de **E**quality, luego **S**ort, luego **R**ange en índices compuestos.
- Sin índice → `COLLSCAN`. Verificar con `.explain("executionStats")` (`totalDocsExamined` vs `nReturned`). Concepto análogo a [PlanesDeEjecucion.md](PlanesDeEjecucion.md).
- Índices sobre arrays son **multikey**: una entrada por elemento.

### Transacciones multi-documento

- Desde 4.0 (replica set) y 4.2 (sharded). ACID con snapshot isolation.
- Límite práctico de 60 s por defecto (`transactionLifetimeLimitSeconds`), más costosas que operaciones de un documento, y pueden abortar por conflicto de escritura (`TransientTransactionError` → reintentar).
- Si necesitas transacciones multi-documento en cada operación, probablemente el modelo está mal (o necesitas relacional). Las operaciones sobre **un documento ya son atómicas**.

```ts
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await accounts.updateOne({ _id: from, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { session });
    await accounts.updateOne({ _id: to }, { $inc: { balance: amount } }, { session });
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
} finally {
  await session.endSession();
}
```

### Write concern y read concern

| Setting | Significado | Trade-off |
|---|---|---|
| `w: 1` | Confirma el primario | Rápido; se puede perder en failover (rollback) |
| `w: "majority"` | Confirma la mayoría del replica set | Durable ante failover; más latencia (default desde 5.0) |
| `j: true` | Escrito en el journal | Durabilidad ante crash |
| `readConcern: "local"` | Lo que tenga el nodo, aunque no esté replicado | Puede leer datos que luego se revierten |
| `readConcern: "majority"` | Solo datos confirmados por mayoría | No lee datos que se perderán |
| `readConcern: "linearizable"` | Lectura más reciente confirmada | Lento, solo primario |
| `readPreference: secondary` | Leer de secundarios | Datos atrasados (ver [ReadReplicas.md](ReadReplicas.md)) |

- **Causal consistency** con sesiones para garantizar read-your-writes aun leyendo de secundarios.

## DynamoDB (clave-valor / wide-column administrado)

### Claves

- **Partition key (PK)**: se hashea para decidir la partición física. Toda consulta eficiente parte de una PK exacta.
- **Sort key (SK)**: ordena ítems dentro de la partición; permite `begins_with`, `between`, `<`, `>`.
- Operaciones: `GetItem` (PK+SK), `Query` (PK + condición en SK), `Scan` (toda la tabla: evitar en producción).

### Índices secundarios

| | GSI (Global) | LSI (Local) |
|---|---|---|
| Clave | PK y SK distintas | Misma PK, otra SK |
| Cuándo se crea | En cualquier momento | Solo al crear la tabla |
| Consistencia | Solo eventual | Eventual o fuerte |
| Capacidad | Propia (puede throttlear la tabla base) | Compartida con la tabla |
| Límite | 20 por tabla (default) | 5 por tabla; colección de ítems por PK ≤ 10 GB |

### Single-table design

Guardar varias entidades en **una tabla** con claves genéricas (`PK`, `SK`) para resolver relaciones con un solo `Query`.

Patrones de acceso: (1) obtener cliente, (2) pedidos de un cliente por fecha, (3) pedido con sus líneas, (4) pedidos por estado.

| PK | SK | GSI1PK | GSI1SK | Atributos |
|---|---|---|---|---|
| `CUSTOMER#42` | `PROFILE` | | | name, email |
| `CUSTOMER#42` | `ORDER#2026-09-01#o-1001` | `STATUS#PENDING` | `2026-09-01#o-1001` | total |
| `ORDER#o-1001` | `ITEM#A1` | | | qty, price |
| `ORDER#o-1001` | `ITEM#B7` | | | qty, price |

```ts
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

// (2) Pedidos del cliente 42 en septiembre, más recientes primero
await ddb.send(new QueryCommand({
  TableName: 'app',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: { ':pk': 'CUSTOMER#42', ':sk': 'ORDER#2026-09' },
  ScanIndexForward: false,
  Limit: 20,
}));

// (4) Pedidos pendientes vía GSI1
await ddb.send(new QueryCommand({
  TableName: 'app', IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :s',
  ExpressionAttributeValues: { ':s': 'STATUS#PENDING' },
}));
```

- Ventaja: menos round-trips, menos costo. Desventaja: esquema opaco, difícil de evolucionar y de analizar. Para equipos nuevos o patrones cambiantes, varias tablas es aceptable.
- Ojo: `STATUS#PENDING` como PK de GSI es una **hot partition** si hay muchos pendientes; se agrega un sufijo (`STATUS#PENDING#3`) y se consultan N shards (**write sharding**).

### Hot partitions

- Cada partición física tiene límites (~3.000 RCU y 1.000 WCU por segundo). Una PK muy popular (celebridad, fecha actual, tenant gigante) **throttlea** aunque la tabla tenga capacidad sobrante.
- Adaptive capacity ayuda pero no resuelve una sola clave caliente. Solución: PKs de alta cardinalidad, sufijos aleatorios/calculados, caché (DAX) para lecturas.

### Capacidad

| | On-demand | Provisioned |
|---|---|---|
| Pago | Por request | Por capacidad reservada/hora |
| Ideal | Tráfico impredecible, nuevo, con picos | Tráfico estable y predecible |
| Costo | Más caro por request sostenido | Más barato con autoscaling + reserved |
| Riesgo | Factura sorpresa | Throttling si se subestima |

### Condiciones y transacciones

```ts
// Crear solo si no existe (idempotencia / unicidad)
await ddb.send(new PutCommand({
  TableName: 'app',
  Item: { PK: 'USER#ana@x.com', SK: 'EMAIL', userId: 'u1' },
  ConditionExpression: 'attribute_not_exists(PK)',
}));

// Bloqueo optimista con versión
await ddb.send(new UpdateCommand({
  TableName: 'app', Key: { PK: 'ORDER#o-1001', SK: 'META' },
  UpdateExpression: 'SET #s = :new, version = version + :one',
  ConditionExpression: 'version = :v',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':new': 'PAID', ':v': 3, ':one': 1 },
}));
```

- `TransactWriteItems`: hasta 100 ítems, ACID, cuesta el **doble** de WCU. Útil para unicidad multi-atributo o invariantes entre ítems.
- **Límite de 400 KB por ítem** (incluye nombres de atributos). Blobs → S3 y guardar la referencia.
- Lectura consistente fuerte solo en tabla base/LSI y cuesta el doble.

## Cassandra / ScyllaDB (wide-column)

- **Query-first**: se diseña **una tabla por consulta**. Duplicar datos entre tablas es lo esperado.
- **Partition key**: determina el nodo (anillo con consistent hashing). **Clustering columns**: orden dentro de la partición.
- No hay joins, ni agregaciones globales eficientes, ni filtros por columnas no clave (`ALLOW FILTERING` = señal de mal diseño).

```sql
-- Consulta: "últimas lecturas de un sensor en un día"
CREATE TABLE readings_by_sensor_day (
  sensor_id  uuid,
  day        date,
  ts         timestamp,
  value      double,
  PRIMARY KEY ((sensor_id, day), ts)     -- partición compuesta = bucketing por día
) WITH CLUSTERING ORDER BY (ts DESC)
  AND default_time_to_live = 2592000;   -- 30 días

SELECT ts, value FROM readings_by_sensor_day
 WHERE sensor_id = ? AND day = '2026-09-26' LIMIT 100;
```

- Particiones acotadas (regla práctica < 100 MB / < 100k filas): de ahí el **bucketing** por día.
- **Tombstones**: los DELETE y TTL escriben marcadores; se eliminan en compaction tras `gc_grace_seconds` (10 días default). Muchos tombstones en una lectura → lecturas lentas y `TombstoneOverwhelmingException`. Evitar patrones de cola (insertar y borrar mucho), y escribir `null` explícitos.
- **Consistencia ajustable** por query: `ONE`, `QUORUM`, `LOCAL_QUORUM`, `ALL`. Con RF=3, `QUORUM` en lectura + escritura (R + W > N) da lecturas consistentes. Ver [CAP.md](CAP.md).
- Escrituras muy baratas (LSM tree, append); lecturas pueden tocar varios SSTables.
- Lightweight transactions (`IF NOT EXISTS`) usan Paxos: 4 round-trips, usar con moderación.

## Redis como base de datos

- Estructuras: **strings**, **hashes**, **lists**, **sets**, **sorted sets** (rankings, colas por prioridad), **streams** (log con consumer groups), HyperLogLog, bitmaps, geo.
- Todo en memoria: latencia sub-milisegundo; el dataset está limitado por la RAM.

| Persistencia | Cómo | Pérdida posible |
|---|---|---|
| Ninguna | Solo memoria | Todo ante reinicio |
| **RDB** | Snapshot periódico (fork) | Desde el último snapshot (minutos) |
| **AOF** `everysec` | Log de comandos, fsync por segundo | ~1 s |
| **AOF** `always` | fsync en cada escritura | Mínima, pero mucho más lento |

- **No es durable por defecto** en el sentido de una BD transaccional; la replicación es **asíncrona** (un failover puede perder escrituras confirmadas). `WAIT` mitiga pero no garantiza.
- Usar como fuente de verdad solo si la pérdida acotada es aceptable (sesiones, rate limits, leaderboards) o con productos que cambian el modelo (MemoryDB con log transaccional multi-AZ). Como caché ver [Caching.md](Caching.md).
- `MULTI/EXEC` no tiene rollback; los scripts Lua / funciones son atómicos.

## Otros modelos

### Grafos (Neo4j, Amazon Neptune)

- Nodos y relaciones como ciudadanos de primera clase; recorrer relaciones es O(vecinos), no joins recursivos.
- Casos: recomendaciones, detección de fraude (anillos), permisos jerárquicos, knowledge graphs.
- Antes de adoptarlo: Postgres con `WITH RECURSIVE` resuelve jerarquías y grafos pequeños (ver [SQLAvanzado.md](SQLAvanzado.md)).

```cypher
MATCH (u:User {id: 'u1'})-[:FRIEND]->(f)-[:FRIEND]->(fof)
WHERE NOT (u)-[:FRIEND]->(fof) AND fof <> u
RETURN fof.id, count(*) AS mutual ORDER BY mutual DESC LIMIT 10;
```

### Series de tiempo (TimescaleDB, InfluxDB)

- Escritura append-only masiva, consultas por rango temporal, agregaciones (`avg` por minuto), retención y downsampling.
- **TimescaleDB**: extensión de Postgres (hypertables particionadas por tiempo, compresión columnar, continuous aggregates). Mantiene SQL, joins y el ecosistema Postgres.
- **InfluxDB**: motor propio, muy eficiente para métricas; cuidado con la **cardinalidad** de tags (series únicas).

```sql
SELECT create_hypertable('metrics', by_range('ts'));
SELECT time_bucket('5 minutes', ts) AS b, device_id, avg(value)
  FROM metrics WHERE ts > now() - interval '1 day'
 GROUP BY b, device_id;
```

### Búsqueda (Elasticsearch / OpenSearch)

- Índice invertido: full-text, relevancia, fuzzy, facetas, autocompletado, logs.
- **No como fuente de verdad**: near-real-time (refresh ~1 s), sin transacciones, historial de pérdidas de datos en split-brain, reindexar es habitual al cambiar mappings.
- Patrón: la verdad en Postgres → CDC/outbox → índice de búsqueda (ver [OutboxCDC.md](OutboxCDC.md)). Poder **reconstruir el índice** desde la fuente es requisito.

## Postgres JSONB como alternativa

Antes de sumar una BD documental, considerar JSONB:

```sql
CREATE TABLE products (
  id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku   text UNIQUE NOT NULL,
  price numeric(12,2) NOT NULL,
  attrs jsonb NOT NULL DEFAULT '{}'           -- atributos variables por categoría
);
CREATE INDEX products_attrs_gin ON products USING gin (attrs jsonb_path_ops);
CREATE INDEX products_color_idx ON products ((attrs->>'color'));  -- índice por expresión

SELECT sku, price FROM products WHERE attrs @> '{"color": "rojo", "talla": "M"}';
```

- Combina columnas tipadas (con constraints, FKs) para lo estable y JSONB para lo variable.
- Transacciones ACID, joins y un solo sistema que operar.
- Limitaciones: actualizar un campo reescribe el valor completo (TOAST), estadísticas del planner pobres sobre claves JSON, sin escalado horizontal nativo. Documentos enormes o muy actualizados rinden peor que en Mongo.

## Preguntas de entrevista

1. **¿Cuál es la diferencia fundamental al modelar en NoSQL vs relacional?** En relacional se normaliza la información y las queries se adaptan; en NoSQL se parte de los patrones de acceso y se desnormaliza para que cada consulta sea una lectura. El costo es la rigidez ante nuevos patrones.
2. **¿Cuándo embeber y cuándo referenciar en MongoDB?** Embeber para 1:pocos que se leen juntos y no tienen vida propia; referenciar para 1:muchos sin cota, N:M o datos que se actualizan independientemente. Nunca arrays sin límite (16 MB).
3. **¿Qué es una hot partition en DynamoDB y cómo la resuelves?** Una PK que concentra tráfico y supera el límite por partición, causando throttling aunque la tabla tenga capacidad. Se resuelve con claves de mayor cardinalidad, write sharding con sufijos y caché para lecturas.
4. **¿Qué ventajas y costos tiene el single-table design?** Resuelve varias entidades relacionadas en un solo Query (menos latencia y costo). Pero es opaco, difícil de evolucionar y de usar para analítica; exige conocer los patrones de acceso de antemano.
5. **¿Qué son los tombstones en Cassandra y por qué importan?** Marcadores de borrado que persisten hasta la compaction tras `gc_grace_seconds`. Muchos en una partición degradan o hacen fallar lecturas; se evitan modelos tipo cola y nulls explícitos.
6. **¿Es Redis durable?** Por defecto no del todo: RDB pierde minutos, AOF everysec ~1 s, y la replicación asíncrona puede perder escrituras en failover. Sirve como BD solo si esa pérdida es aceptable.
7. **¿Por qué Elasticsearch no debe ser fuente de verdad?** Es near-real-time, sin transacciones, con riesgo de pérdida y reindexaciones frecuentes. Debe ser una proyección reconstruible desde la BD principal.
8. **¿Cuándo JSONB en lugar de MongoDB?** Cuando la mayor parte del modelo es relacional y solo algunos atributos son variables, se necesitan transacciones/joins y no se requiere escalado horizontal. Evita operar otro sistema.

## Errores comunes

- Modelar NoSQL como si fuera relacional (una colección por tabla + `$lookup` en todas partes).
- Arrays que crecen sin límite dentro de un documento.
- Usar `Scan` en DynamoDB o `ALLOW FILTERING` en Cassandra en rutas de producción.
- PKs de baja cardinalidad (fecha, estado, país) → hot partitions.
- Asumir consistencia fuerte en lecturas de GSI o de secundarios.
- `w: 1` en datos críticos y sorprenderse por rollbacks tras failover.
- Tratar Redis o Elasticsearch como almacenamiento primario sin plan de reconstrucción.
- Elegir NoSQL por "esquema flexible" sin tener un problema de escala: el esquema existe igual, pero en el código.
