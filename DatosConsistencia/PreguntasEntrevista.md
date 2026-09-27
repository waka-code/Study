# Preguntas de entrevista — Bases de Datos (nivel Senior)

Banco de repaso. Responde **en voz alta** antes de leer la respuesta. Un senior no solo da la definición: menciona **trade-offs**, **cuándo no** aplicarlo y un **ejemplo real**.

> Cada archivo de la carpeta tiene sus propias preguntas específicas al final. Aquí están las transversales y las que más se repiten.

---

## 1. Modelado y SQL

**1. ¿Cuándo desnormalizarías?**
Cuando un patrón de lectura crítico y medido sufre por JOINs o agregaciones costosas y la duplicación es controlable: contadores (`total_comentarios`), snapshots históricos (precio al momento de la compra, que *debe* duplicarse), vistas materializadas, read models. Siempre con un mecanismo claro para mantener la copia sincronizada (trigger, misma transacción, eventos). → [Normalizacion.md](Normalizacion.md)

**2. ¿UUID o BIGINT como PK?**
BIGINT: compacto (8 bytes), secuencial (inserciones al final del B-tree, poca fragmentación). UUIDv4: generable en el cliente y sin coordinación, pero aleatorio → inserciones dispersas, page splits, peor caché, 16 bytes en cada índice secundario (especialmente costoso en InnoDB, donde la PK se copia en todos los índices). Término medio: **UUIDv7/ULID** (ordenados por tiempo). No expongas IDs secuenciales si permiten enumerar recursos.

**3. ¿`NOT IN` vs `NOT EXISTS`?**
Si la subconsulta devuelve algún `NULL`, `NOT IN` devuelve **cero filas** (lógica de tres valores). `NOT EXISTS` es seguro y el optimizador lo convierte en anti-join. → [SQLAvanzado.md](SQLAvanzado.md)

**4. Top 3 productos más vendidos por categoría.**
```sql
SELECT * FROM (
  SELECT categoria_id, producto_id, ventas,
         ROW_NUMBER() OVER (PARTITION BY categoria_id ORDER BY ventas DESC) AS rn
  FROM ventas_por_producto
) t WHERE rn <= 3;
```
(`RANK`/`DENSE_RANK` si hay que incluir empates.)

---

## 2. Índices y rendimiento

**5. Tengo un índice en `(a, b, c)`. ¿Cuáles de estas queries lo usan bien?**
- `WHERE a = 1 AND b = 2` ✅ (prefijo)
- `WHERE b = 2` ❌ (no empieza por `a`; como mucho un full index scan)
- `WHERE a = 1 AND c = 3` ⚠️ usa `a`, `c` se filtra después
- `WHERE a = 1 AND b > 5 AND c = 3` ⚠️ el rango en `b` corta el uso de `c` para navegar
- `WHERE a = 1 ORDER BY b` ✅ evita el Sort
Regla: **igualdades primero, rangos al final**. → [Indices.md](Indices.md)

**6. Hay índice en `email` pero la query hace Seq Scan. ¿Por qué?**
`WHERE lower(email) = ...` (función sobre la columna → índice de expresión), cast implícito de tipo, `LIKE '%x'`, baja selectividad, estadísticas desactualizadas, tabla pequeña, o collation distinta. Verificar con `EXPLAIN ANALYZE`.

**7. Una query que tardaba 50 ms ahora tarda 5 s sin cambios de código. ¿Cómo investigas?**
1) `pg_stat_statements` / Performance Insights para confirmar y ver si es una query o todas. 2) `EXPLAIN (ANALYZE, BUFFERS)`: ¿cambió el plan? (estadísticas, crecimiento de datos que cruzó un umbral, plan genérico). 3) ¿Esperas de locks? (`pg_stat_activity.wait_event`, `pg_locks`). 4) ¿Bloat/VACUUM atrasado? 5) Recursos: CPU, IOPS, memoria, conexiones. 6) ¿Algo nuevo compite (job batch, migración, backup)? → [Observabilidad.md](Observabilidad.md)

**8. ¿Por qué `OFFSET 100000` es lento y qué usas en su lugar?**
El motor debe generar y descartar 100.000 filas. Paginación **keyset**: `WHERE (created_at, id) < (:ultimo_created_at, :ultimo_id) ORDER BY created_at DESC, id DESC LIMIT 20` con índice en `(created_at, id)`. Contra: no permite saltar a la página N. → [Performance.md](Performance.md)

**9. La app tiene 20 instancias con pool de 50 y Postgres empieza a fallar. ¿Qué pasa?**
20 × 50 = 1000 conexiones; cada una es un proceso con memoria propia y hay contención interna. Más conexiones que núcleos no aumenta el throughput. Solución: pools más chicos (~10), PgBouncer en modo transacción o RDS Proxy. → [ConnectionPooling.md](ConnectionPooling.md)

**10. ¿Qué es el problema N+1 y cómo lo detectas?**
1 query para la lista + N queries para las relaciones de cada elemento. Se detecta con el log de SQL del ORM, APM, o `pg_stat_statements` (una misma query con `calls` altísimo). Se soluciona con eager loading/JOIN, `WHERE id IN (...)` o DataLoader. → [ORMs.md](ORMs.md)

---

## 3. Transacciones y concurrencia

**11. Dos usuarios compran el último producto a la vez. ¿Cómo evitas vender de más?**
Opciones, de más simple a más compleja:
- Update atómico condicional: `UPDATE productos SET stock = stock - 1 WHERE id = $1 AND stock > 0` y revisar `rowCount`.
- Lock pesimista: `SELECT ... FOR UPDATE` dentro de la transacción.
- Lock optimista: columna `version`, reintentar si no se actualizó ninguna fila.
- Constraint `CHECK (stock >= 0)` como última línea de defensa.
El **anti-patrón** es leer el stock en la app, restar y escribir (lost update). → [Transacciones.md](Transacciones.md)

**12. Explica write skew con un ejemplo.**
Dos médicos de guardia; regla: al menos uno debe quedarse. Ambos leen "hay 2 de guardia" y cada uno se da de baja → quedan 0. Cada transacción modificó una fila **distinta**, así que Repeatable Read/snapshot no lo detecta. Se evita con `SERIALIZABLE`, `SELECT ... FOR UPDATE` sobre las filas leídas o materializando el conflicto.

**13. ¿Optimista o pesimista?**
Optimista cuando los conflictos son raros y las transacciones cortas o con interacción de usuario (no se pueden mantener locks mientras el usuario piensa). Pesimista cuando la contención es alta y reintentar sale caro. Con alta contención el optimista degenera en reintentos continuos.

**14. ¿Cómo implementas una cola de trabajos en Postgres con varios workers?**
```sql
UPDATE jobs SET estado = 'procesando', tomado_en = now()
WHERE id = (
  SELECT id FROM jobs WHERE estado = 'pendiente'
  ORDER BY creado_en
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```
`SKIP LOCKED` hace que cada worker salte las filas que otros ya tomaron, sin esperar.

**15. ¿Qué es MVCC y qué costo tiene?**
Cada escritura crea una nueva versión de la fila; los lectores ven un snapshot y no bloquean a los escritores. Costo: versiones muertas (bloat) que VACUUM debe limpiar; las transacciones largas impiden limpiar y hacen crecer las tablas. → [InternosMotor.md](InternosMotor.md)

**16. ¿Qué pasa si una transacción queda abierta 6 horas?**
Retiene locks (puede bloquear DDL y encolar a todos detrás), impide que VACUUM limpie tuplas muertas (bloat en toda la BD), y en el peor caso acerca el wraparound de XID. Mitigación: `idle_in_transaction_session_timeout`, alertas sobre la antigüedad de `xact_start`.

---

## 4. Distribuido y escala

**17. Explica CAP correctamente.**
Ante una **partición de red** un sistema distribuido debe elegir entre **consistencia** (linealizabilidad: rechazar operaciones) y **disponibilidad** (responder con datos posiblemente viejos). Las particiones no son opcionales, así que "CA" no aplica a un sistema distribuido. **PACELC** completa: y cuando **no** hay partición, eliges entre latencia y consistencia. → [CAP.md](CAP.md)

**18. Un usuario actualiza su perfil, recarga y ve el dato viejo. ¿Qué pasó y cómo lo arreglas?**
Leyó de una réplica con lag (se viola read-your-writes). Soluciones: leer del primario durante unos segundos tras escribir (flag en sesión/cookie), leer del primario lo que es del propio usuario, esperar a que la réplica alcance el LSN de la escritura, o actualizar la UI de forma optimista. → [ReadReplicas.md](ReadReplicas.md)

**19. ¿Cómo eliges una shard key?**
Alta cardinalidad, distribución uniforme de datos **y de tráfico**, y que la mayoría de queries incluya la clave (para evitar scatter-gather). En multi-tenant, `tenant_id` es típico, pero cuidado con tenants gigantes (hot shard). Evita claves monótonas (timestamp) con sharding por rango. → [Sharding.md](Sharding.md)

**20. Tu BD Postgres está al 90% de CPU. ¿Shardeas?**
No como primer paso. Orden: optimizar queries top (pg_stat_statements + índices), revisar N+1 y pooling, caché para lecturas calientes, réplicas de lectura, escalar verticalmente, particionar tablas grandes, mover analítica a un warehouse. El sharding es el último recurso por su complejidad operativa. → [Escalabilidad.md](Escalabilidad.md)

**21. Guardas un pedido y publicas un evento en Kafka. ¿Qué puede fallar?**
Dual-write: si la BD confirma y Kafka falla (o el proceso muere entre ambos), el sistema queda inconsistente; al revés, publicas un evento de algo que no existe. Solución: **Transactional Outbox** (insertar el evento en una tabla `outbox` en la misma transacción y publicarlo con un relay o CDC) + consumidores idempotentes. → [OutboxCDC.md](OutboxCDC.md)

**22. ¿Cómo garantizas "exactly once"?**
En la red no existe; se logra **at-least-once + idempotencia**: idempotency key con `UNIQUE` constraint (`INSERT ... ON CONFLICT DO NOTHING`), tabla de mensajes procesados en la misma transacción que el efecto. → [TransaccionesDistribuidas.md](TransaccionesDistribuidas.md)

**23. Saga vs 2PC.**
2PC da atomicidad, pero bloquea recursos y depende del coordinador (si cae en la fase 2, los participantes quedan bloqueados); poco soportado por brokers y servicios cloud. La Saga usa transacciones locales + compensaciones: más disponible, pero con consistencia eventual, estados intermedios visibles y compensaciones que hay que diseñar (y que sean idempotentes).

---

## 5. Operación

**24. Necesitas renombrar una columna en una tabla de 500M filas sin downtime.**
Expand/contract: 1) agregar la columna nueva (nullable, instantáneo); 2) desplegar código que escribe en ambas; 3) backfill por lotes; 4) desplegar código que lee de la nueva; 5) dejar de escribir la vieja; 6) borrarla. Cada `ALTER` con `lock_timeout` corto para no encolar tráfico detrás de un lock `ACCESS EXCLUSIVE`. → [Migraciones.md](Migraciones.md)

**25. ¿Por qué un `ALTER TABLE` "instantáneo" tumbó producción?**
Necesita `ACCESS EXCLUSIVE`; si hay una transacción larga leyendo la tabla, el ALTER espera, y **todas las queries posteriores se encolan detrás del ALTER**. Solución: `SET lock_timeout = '3s'` y reintentar.

**26. ¿Cómo implementas multi-tenancy?**
BD por tenant (máximo aislamiento, operación costosa), schema por tenant (intermedio, sufre con miles de schemas), tabla compartida con `tenant_id` (escala mejor; exige disciplina: RLS de Postgres, `tenant_id` en todos los índices y en la shard key). → [Seguridad.md](Seguridad.md)

**27. ¿Dónde guardarías búsquedas full-text con facetas sobre 50M productos?**
Postgres full-text puede servir para casos simples. Para relevancia, facetas y tolerancia a errores: OpenSearch/Elasticsearch **alimentado por CDC**, nunca como fuente de verdad. → [ModeladoNoSQL.md](ModeladoNoSQL.md)

**28. El equipo de BI corre reportes sobre la BD de producción y la ralentiza.**
Corto plazo: una réplica dedicada a analítica con `statement_timeout`. Correcto: pipeline ELT/CDC hacia un warehouse columnar (BigQuery, Redshift, Snowflake, ClickHouse). → [OLTPvsOLAP.md](OLTPvsOLAP.md)

---

## 6. Ejercicios de diseño (system design de datos)

Para cada uno, practica: **entidades → patrones de acceso → elección de almacenamiento → esquema e índices → concurrencia → escala → fallos**.

### A. Acortador de URLs
- Escritura: `POST /url` → código corto. Lectura: `GET /:code` (100:1 lecturas/escrituras).
- Esquema: `urls(code PK, url_larga, user_id, creado_en, expira_en)`.
- Código: base62 de un ID (secuencia o Snowflake) o hash + resolución de colisiones con `UNIQUE`.
- Lectura: caché (Redis) cache-aside, TTL largo; CDN para redirecciones populares.
- Escala: KV (DynamoDB) con `code` como partition key escala de forma natural; conteo de clics asíncrono (eventos → agregación), no un `UPDATE contador` por clic (hot row).

### B. Reservas de asientos / tickets
- El riesgo principal es la **doble venta**.
- `asientos(evento_id, asiento_id, estado, reservado_hasta, usuario_id)` con PK `(evento_id, asiento_id)`.
- Reserva temporal: `UPDATE asientos SET estado='reservado', usuario_id=$u, reservado_hasta=now()+'10 min' WHERE evento_id=$e AND asiento_id=$a AND (estado='libre' OR reservado_hasta < now())` → `rowCount = 1` significa que lo obtuviste.
- Pago con idempotency key; confirmar a `vendido` en la misma transacción que registra el pago.
- Picos (salida a la venta): cola virtual de espera antes de llegar a la BD.

### C. Feed de red social
- Fan-out on write (precalcular el timeline de cada seguidor en Redis/Cassandra) vs fan-out on read (armar el feed al leer). Híbrido: fan-out on write salvo para celebridades con millones de seguidores.
- Posts en una BD particionada por `user_id`; timeline como lista acotada (`LTRIM`) en Redis.
- Paginación keyset por `(created_at, post_id)`.

### D. Billetera / ledger financiero
- **Nunca** un `saldo` mutable como única verdad: ledger **append-only** de doble entrada (`movimientos(id, cuenta_id, monto, transaccion_id)`, cada transacción suma 0).
- Saldo = suma de movimientos (con snapshots/saldo materializado actualizado en la **misma** transacción).
- `NUMERIC` / enteros en centavos, jamás `FLOAT`.
- Idempotency key por operación, `SERIALIZABLE` o `FOR UPDATE` sobre la cuenta para evitar sobregiros.
- Auditoría inmutable y conciliación periódica.

### E. Métricas / IoT (millones de eventos por minuto)
- Escritura masiva append-only, consultas por rango de tiempo y agregadas.
- TimescaleDB / ClickHouse / Cassandra; particionado por tiempo (borrar datos viejos = `DROP` de la partición).
- Ingesta por lotes vía Kafka; rollups precalculados (1 min → 1 h → 1 día); retención por nivel.

---

## 7. Preguntas rápidas (respuesta en una línea)

| Pregunta | Respuesta |
|---|---|
| ¿Qué garantiza el WAL? | Durabilidad: el cambio se escribe y hace fsync en el log antes de confirmar; tras un crash se reproduce |
| ¿Nivel de aislamiento por defecto en Postgres / MySQL? | Read Committed / Repeatable Read |
| ¿`DELETE` vs `TRUNCATE`? | DELETE fila a fila, dispara triggers, genera WAL por fila; TRUNCATE libera los archivos, casi instantáneo, toma lock exclusivo |
| ¿`COUNT(*)` vs `COUNT(col)`? | COUNT(col) ignora NULLs |
| ¿`UNION` vs `UNION ALL`? | UNION elimina duplicados (sort/hash extra); usa UNION ALL si no hacen falta |
| ¿`WHERE` vs `HAVING`? | WHERE filtra filas antes de agrupar; HAVING filtra grupos |
| ¿Clustered index? | La tabla está físicamente ordenada por él (InnoDB: la PK); solo hay uno por tabla |
| ¿Tipo para dinero? | `NUMERIC(p,s)` o entero en centavos, nunca float |
| ¿Timestamps? | `timestamptz` en UTC; convertir a la zona horaria del usuario en la capa de presentación |
| ¿Por qué no `SELECT *` en producción? | Más I/O y red, rompe los Index Only Scan, frágil ante cambios de esquema |
| ¿Qué es un hot row? | Una fila actualizada por muchas transacciones concurrentes (contador global) → contención; se resuelve con contadores sharded o agregación asíncrona |
| ¿Para qué sirve `VACUUM ANALYZE`? | Limpiar tuplas muertas, actualizar la visibility map y las estadísticas |
| ¿Qué es un replication slot y su riesgo? | Garantiza que el primario retenga el WAL hasta que el consumidor lo lea; un consumidor caído llena el disco |

---

## Cómo responder como senior

1. **Aclara requisitos** antes de diseñar: volumen, ratio lectura/escritura, consistencia requerida, latencia, crecimiento.
2. **Empieza simple** (un Postgres bien indexado) y escala cuando una métrica lo justifique.
3. **Nombra el trade-off** explícitamente: "esto gana X a costa de Y".
4. **Piensa en fallos**: ¿qué pasa si el proceso muere entre estas dos líneas? ¿si se reintenta? ¿si la réplica está atrasada?
5. **Habla de operación**: cómo lo monitoreas, cómo lo migras, cómo lo recuperas.
