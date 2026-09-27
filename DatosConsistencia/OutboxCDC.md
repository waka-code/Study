# Outbox, Inbox, CDC, Event Sourcing y CQRS

Cómo publicar eventos de forma **confiable** cuando el estado vive en una base de datos y los eventos viajan por un broker (Kafka, RabbitMQ, SNS/SQS). Es la pieza que hace funcionar en la práctica las sagas de [TransaccionesDistribuidas.md](TransaccionesDistribuidas.md).

## El problema del dual-write

Un servicio que "guarda en la BD y publica en Kafka" escribe en **dos sistemas sin transacción común**. No existe forma atómica de hacerlo sin coordinación.

```ts
// ANTIPATRÓN: dual-write
await db.query('INSERT INTO orders (id, total) VALUES ($1, $2)', [id, total]);
await kafka.send({ topic: 'orders', messages: [{ key: id, value: JSON.stringify(evt) }] });
// ¿Qué pasa si el proceso muere entre ambas líneas?
```

Escenarios de fallo:

| Orden | Falla | Resultado |
|---|---|---|
| BD → broker | Crash / broker caído después del COMMIT | Orden existe, **evento perdido**. Downstream nunca se entera. |
| Broker → BD | COMMIT falla (constraint, deadlock, timeout) | **Evento fantasma**: otros servicios reaccionan a algo que no existe. |
| Publicar dentro de la tx | Se publica y luego la tx hace ROLLBACK | Igual que arriba, y además la tx queda abierta esperando red. |

- Reintentar no lo arregla: no sabes si el `send` llegó (timeout ≠ fallo).
- **2PC/XA** entre BD y Kafka no es práctico (Kafka no participa en XA; ver [TransaccionesDistribuidas.md](TransaccionesDistribuidas.md)).
- La solución estándar: **escribir el evento en la misma BD, en la misma transacción**, y publicarlo después de forma asíncrona. Eso es el **Transactional Outbox**.

## Transactional Outbox

Idea: la BD es la única fuente de verdad. El evento se inserta en una tabla `outbox` en la **misma transacción** que el cambio de negocio. Un proceso aparte (**relay**) lee la outbox y publica.

```sql
CREATE TABLE outbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text        NOT NULL,          -- 'order'
  aggregate_id   text        NOT NULL,          -- clave de partición en Kafka
  event_type     text        NOT NULL,          -- 'OrderCreated'
  payload        jsonb       NOT NULL,
  headers        jsonb       NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz                    -- NULL = pendiente (solo para relay por polling)
);

-- Índice parcial: solo las filas pendientes, se mantiene pequeño
CREATE INDEX outbox_pending_idx ON outbox (created_at) WHERE published_at IS NULL;
```

```ts
import { Pool } from 'pg';
const pool = new Pool();

export async function createOrder(order: { id: string; customerId: string; total: number }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO orders (id, customer_id, total) VALUES ($1, $2, $3)',
      [order.id, order.customerId, order.total],
    );
    await client.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ('order', $1, 'OrderCreated', $2)`,
      [order.id, JSON.stringify({ ...order, version: 1 })],
    );
    await client.query('COMMIT'); // ambos o ninguno
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

Garantía resultante: **at-least-once**. El relay puede publicar y morir antes de marcar la fila → la vuelve a publicar. Por eso el consumidor **debe ser idempotente** (ver Inbox).

### Relay por polling con `FOR UPDATE SKIP LOCKED`

```ts
async function relayBatch(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, aggregate_id, event_type, payload, headers
         FROM outbox
        WHERE published_at IS NULL
        ORDER BY created_at
        LIMIT 100
        FOR UPDATE SKIP LOCKED`,
    );
    if (rows.length === 0) { await client.query('COMMIT'); return 0; }

    await producer.send({
      topic: 'orders.events',
      messages: rows.map(r => ({
        key: r.aggregate_id,                 // orden por agregado
        value: JSON.stringify(r.payload),
        headers: { eventId: r.id, eventType: r.event_type },
      })),
    }); // producer con acks=all e idempotence=true

    await client.query(
      'UPDATE outbox SET published_at = now() WHERE id = ANY($1::uuid[])',
      [rows.map(r => r.id)],
    );
    await client.query('COMMIT');
    return rows.length;
  } catch (e) {
    await client.query('ROLLBACK'); // las filas vuelven a estar disponibles
    throw e;
  } finally {
    client.release();
  }
}
```

- **`SKIP LOCKED`** permite varias instancias del relay sin pisarse: cada una toma filas no bloqueadas.
- **Trade-off de orden**: con varios relays en paralelo, dos eventos del mismo agregado pueden publicarse desordenados. Opciones: un solo relay activo (leader election / advisory lock), o particionar el trabajo por `hashtext(aggregate_id) % N`.
- **Latencia**: igual al intervalo de polling (típico 100 ms–1 s). Se puede bajar con `LISTEN/NOTIFY` como "despertador", manteniendo el polling como red de seguridad.
- **Limpieza**: borrar/particionar filas publicadas (`DELETE ... WHERE published_at < now() - interval '7 days'` en lotes, o particionar por día y hacer `DROP PARTITION`). Una outbox que crece sin límite genera bloat (ver [InternosMotor.md](InternosMotor.md)).
- Ojo: mantener la tx abierta mientras se publica al broker alarga locks; con lotes pequeños es aceptable.

### Relay por CDC

En vez de consultar la tabla, un conector CDC (Debezium) lee el **log de la BD** y publica cada `INSERT` en la outbox. Debezium trae el **Outbox Event Router** (SMT) que enruta por `aggregate_type` y usa `aggregate_id` como key.

- La app solo hace `INSERT` en outbox; se puede borrar la fila en la misma tx (el INSERT igual queda en el WAL) → la tabla nunca crece.
- Menor latencia y cero carga de polling sobre la BD.
- Costo: operar Kafka Connect + Debezium + replication slots.

| | Polling | CDC (Debezium) |
|---|---|---|
| Complejidad operativa | Baja (código propio) | Alta (Kafka Connect, slots) |
| Latencia | Intervalo de polling | Sub-segundo |
| Carga en la BD | Queries periódicas + UPDATEs | Lectura del WAL |
| Orden | Requiere cuidado con múltiples relays | Orden del log (commit order) |
| Cuándo | Volumen moderado, equipo pequeño | Alto volumen, ya hay plataforma Kafka |

## Inbox pattern: deduplicación en el consumidor

At-least-once + reintentos del consumidor = **duplicados garantizados**. El consumidor debe ser idempotente. Dos formas:

1. **Idempotencia natural**: `UPSERT`, `SET status = 'PAID'` (no `balance = balance + x`).
2. **Inbox / tabla de mensajes procesados**: registrar el `eventId` en la **misma transacción** que el efecto.

```sql
CREATE TABLE inbox (
  consumer   text        NOT NULL,
  event_id   uuid        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, event_id)
);
```

```ts
async function handlePaymentCaptured(evt: { eventId: string; orderId: string }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO inbox (consumer, event_id) VALUES ('billing', $1)
       ON CONFLICT DO NOTHING`,
      [evt.eventId],
    );
    if (res.rowCount === 0) { await client.query('ROLLBACK'); return; } // duplicado
    await client.query(`UPDATE orders SET status = 'PAID' WHERE id = $1`, [evt.orderId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e; // no se commitea el offset → se reintenta
  } finally {
    client.release();
  }
}
```

- Hacer el commit del offset de Kafka **después** del COMMIT en la BD.
- "Exactly-once" de Kafka (transacciones) solo cubre **Kafka → Kafka**; si el efecto es en tu BD, necesitas inbox o idempotencia.
- El consumidor también puede escribir en su propia outbox en la misma tx → cadena confiable de servicios.

## CDC con Debezium

**Change Data Capture**: capturar cambios leyendo el log de replicación de la BD, no la tabla.

- **PostgreSQL**: WAL + **logical decoding** (plugin `pgoutput`, nativo desde PG10). Requiere `wal_level = logical`, una **publication** y un **replication slot**.
- **MySQL**: **binlog** en formato `ROW` (`binlog_format=ROW`, `binlog_row_image=FULL`).
- **MongoDB**: change streams (oplog).

```sql
-- postgresql.conf: wal_level = logical, max_replication_slots, max_wal_senders
CREATE PUBLICATION dbz_pub FOR TABLE public.outbox, public.orders;

-- Debezium crea el slot; para inspeccionarlo:
SELECT slot_name, plugin, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
```

Usos de CDC más allá de outbox: alimentar data warehouse ([OLTPvsOLAP.md](OLTPvsOLAP.md)), invalidar caché ([Caching.md](Caching.md)), sincronizar Elasticsearch, migrar datos entre BDs sin downtime.

### El riesgo del replication slot

Un slot **garantiza** que Postgres retiene todo el WAL que el consumidor aún no confirmó. Si Debezium se cae, se atrasa o se abandona el slot:

- El WAL se acumula en `pg_wal` **sin límite** → **disco lleno → la BD primaria se detiene**. Es una causa clásica de incidentes.
- Además bloquea el avance de `xmin` en catálogos → bloat.

Mitigaciones:

- Alertar sobre `retained_wal` por slot y sobre slots `active = false` (ver [Observabilidad.md](Observabilidad.md)).
- `max_slot_wal_keep_size` (PG13+): límite de WAL retenido; si se supera, el slot se **invalida** (pierdes el CDC y debes hacer re-snapshot, pero salvas la BD).
- Borrar slots huérfanos: `SELECT pg_drop_replication_slot('nombre');`.
- En tablas poco escritas, configurar heartbeat de Debezium para que el slot avance.
- Failover: en PG < 17 los slots lógicos no se replican a la standby; tras un failover hay que recrearlos (riesgo de perder o duplicar eventos). PG17 agrega sincronización de slots de failover.

### CDC directo sobre tablas de negocio vs outbox

- CDC sobre `orders` expone tu **esquema interno** como contrato público: renombrar una columna rompe consumidores.
- La outbox publica **eventos de dominio** con esquema explícito y versionado (`OrderCreated v2`). Preferir outbox para integración entre servicios; CDC de tablas crudas para replicación/analítica.

## Orden de eventos y particionado

- Kafka garantiza orden **solo dentro de una partición**. Usar el **aggregate id como key** → todos los eventos de una orden van a la misma partición y se consumen en orden.
- No hay orden global entre agregados, y normalmente **no se necesita**. Si crees necesitarlo, revisa el modelo.
- Amenazas al orden:
  - Relay con varias instancias sin partición del trabajo.
  - Productor con reintentos sin `enable.idempotence=true` (o `max.in.flight > 5`).
  - Cambiar el número de particiones de un topic (cambia el mapeo key → partición).
  - Consumidores que procesan en paralelo dentro de una partición.
- Defensa en el consumidor: incluir `version` (secuencia por agregado) en el payload y descartar eventos con versión ≤ a la ya aplicada.

```sql
UPDATE order_read_model
   SET status = $2, version = $3
 WHERE order_id = $1 AND version < $3;  -- ignora eventos viejos o repetidos
```

## Event Sourcing

En lugar de guardar el **estado actual**, se guarda la **secuencia inmutable de eventos**; el estado se obtiene reproduciéndolos (fold).

```sql
CREATE TABLE events (
  stream_id   text        NOT NULL,      -- 'account-42'
  version     int         NOT NULL,      -- secuencia dentro del stream
  event_type  text        NOT NULL,
  payload     jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, version)       -- concurrencia optimista
);
```

```ts
// Append con control de concurrencia optimista
await client.query(
  'INSERT INTO events (stream_id, version, event_type, payload) VALUES ($1, $2, $3, $4)',
  [streamId, expectedVersion + 1, 'MoneyWithdrawn', JSON.stringify({ amount })],
); // si otro escribió version+1 antes → unique_violation (23505) → recargar y reintentar
```

- **Snapshots**: cada N eventos se guarda el estado materializado (`snapshots(stream_id, version, state)`). Se carga el snapshot y se aplican solo los eventos posteriores. Son una optimización, descartables y regenerables.
- La tabla de eventos **es** la outbox: publicar desde ella (polling o CDC).
- **Versionado de eventos (upcasting)**: los eventos viejos no se modifican; se transforman al leer.

**Cuándo sí**: auditoría obligatoria e inmutable (finanzas, ledger, salud), necesidad de reconstruir estado a cualquier punto del tiempo, dominios donde el "qué pasó" es tan importante como el "cómo está".

**Cuándo no**: CRUD simple, equipos sin experiencia en el patrón, necesidad fuerte de queries ad-hoc sobre el estado, requisitos de borrado de datos (GDPR: los eventos son inmutables → hace falta crypto-shredding). Es un compromiso difícil de revertir; aplicarlo por bounded context, nunca a todo el sistema.

## CQRS y read models

**Command Query Responsibility Segregation**: separar el modelo de escritura (comandos, invariantes, normalizado) del de lectura (queries, desnormalizado, optimizado por pantalla).

```
Comando → [Write model / Postgres] → outbox/eventos → [Proyector] → Read model (Postgres desnormalizado, Elasticsearch, Redis)
                                                                              ↑
                                                                         Queries
```

- Los **read models** son **proyecciones** reconstruibles: si hay un bug, se borran y se re-proyectan desde los eventos.
- Consistencia **eventual** entre escritura y lectura → problema de *read-your-writes*: el usuario crea algo y no lo ve. Soluciones: devolver el estado en la respuesta del comando, leer del write model justo después de escribir, o esperar a que la proyección alcance la versión.
- CQRS **no requiere** event sourcing ni dos BDs. Un nivel liviano: vistas materializadas o tablas de lectura en la misma BD.
- **No usar** si las lecturas y escrituras tienen la misma forma: duplicas código e introduces lag sin beneficio.

## Preguntas de entrevista

1. **¿Por qué no basta con publicar en Kafka justo después del COMMIT?** Porque el proceso puede morir entre ambos pasos o el broker fallar: el evento se pierde sin rastro. No hay atomicidad entre dos sistemas; la outbox la recupera haciendo que el evento sea parte de la misma transacción local.
2. **¿Qué garantía de entrega da la outbox?** At-least-once. El relay puede publicar y caerse antes de marcar la fila; por eso el consumidor debe ser idempotente (inbox o upsert).
3. **¿Para qué sirve `FOR UPDATE SKIP LOCKED` en el relay?** Permite que varias instancias tomen lotes distintos sin bloquearse entre sí. Costo: puede romper el orden por agregado si no se particiona el trabajo.
4. **¿Qué riesgo operativo tiene un replication slot de Debezium?** Si el consumidor se detiene, Postgres retiene WAL indefinidamente y puede llenar el disco del primario. Se mitiga con alertas de WAL retenido, `max_slot_wal_keep_size` y limpieza de slots huérfanos.
5. **¿Cómo garantizas orden de eventos?** Usando el aggregate id como key de partición, productor idempotente y un número fijo de particiones; en el consumidor, versión por agregado para descartar eventos atrasados. El orden global no se garantiza ni suele necesitarse.
6. **¿CDC sobre tablas o outbox?** Outbox para integración entre servicios (contrato de eventos explícito y versionado); CDC de tablas para replicación/analítica, donde acoplarse al esquema es aceptable.
7. **¿Cuándo NO usarías event sourcing?** En CRUD sin necesidad de historia, cuando se necesitan muchas queries ad-hoc sobre el estado, con equipos sin experiencia o requisitos fuertes de borrado. Agrega complejidad (versionado, proyecciones, snapshots) difícil de revertir.
8. **¿CQRS implica dos bases de datos?** No. Puede ser una tabla o vista materializada en la misma BD. Separar almacenamientos solo se justifica cuando los patrones de lectura difieren mucho (búsqueda full-text, agregaciones) o escalan distinto.

## Errores comunes

- Publicar al broker dentro de la transacción de BD "para que sea atómico" (no lo es, y alarga locks).
- Consumidores no idempotentes asumiendo exactly-once.
- Commitear el offset antes de persistir el efecto.
- Outbox sin limpieza → tabla gigante e índice degradado.
- Olvidar el replication slot de un conector dado de baja → disco lleno semanas después.
- Usar un id aleatorio como key de Kafka (o ninguna) → eventos del mismo agregado desordenados.
- Exponer tablas internas vía CDC como API pública entre equipos.
- Adoptar event sourcing en todo el sistema por moda.
