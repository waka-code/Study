# SQL vs NoSQL

## ¿Qué es SQL?
- Bases de datos relacionales (ej: PostgreSQL, MySQL, SQL Server).
- Estructura fija: tablas, filas y columnas.
- Soporte para transacciones ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad).
- Ideal para relaciones complejas y consultas avanzadas.

## ¿Qué es NoSQL?
- Bases de datos no relacionales (ej: MongoDB, Cassandra, Redis).
- Estructura flexible: documentos, clave-valor, grafos, columnas.
- Escalabilidad horizontal y alta disponibilidad.
- Ideal para grandes volúmenes de datos y esquemas variables.

## ¿Cuándo usar cada una?
- **SQL:** Cuando necesitas integridad, relaciones complejas y transacciones.
- **NoSQL:** Cuando necesitas escalar horizontalmente, manejar datos no estructurados o alta velocidad de escritura/lectura.

## Ejemplo SQL
```sql
-- Crear tabla y consulta relacional
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100)
);
INSERT INTO usuarios (nombre) VALUES ('Ana');
SELECT * FROM usuarios WHERE nombre = 'Ana';
```

## Ejemplo NoSQL (MongoDB)
```js
// Insertar y consultar documento
const usuario = { nombre: 'Ana' };
db.usuarios.insertOne(usuario);
db.usuarios.find({ nombre: 'Ana' });
```

---

## Más allá de la dicotomía

"SQL vs NoSQL" es una simplificación. NoSQL agrupa modelos muy distintos (documental, clave-valor, wide-column, grafos, búsqueda, series de tiempo) y las líneas se han borrado:

- Postgres tiene **JSONB**, búsqueda full-text, extensiones de series de tiempo y vectores.
- MongoDB tiene **transacciones multi-documento**, schema validation y joins (`$lookup`).
- DynamoDB tiene transacciones y lecturas consistentes.
- **NewSQL** ofrece SQL + ACID + escalado horizontal.

La pregunta real no es "¿SQL o NoSQL?" sino: **¿qué modelo de datos, garantías de consistencia y perfil operativo necesita esta carga de trabajo?** Detalle de cada modelo en [ModeladoNoSQL.md](ModeladoNoSQL.md).

## Criterios de decisión senior

### 1. Patrones de acceso

- **Conocidos, estables, por clave** (obtener carrito por usuario, sesión por token) → clave-valor/documental encaja muy bien.
- **Cambiantes, ad-hoc, con reportes, filtros combinables** → relacional. SQL permite queries que nadie previó al diseñar; NoSQL castiga cada patrón nuevo (nuevo índice, nueva tabla, backfill).
- **Muchas relaciones N:M con recorridos profundos** → grafos (o `WITH RECURSIVE` si es moderado).
- En etapa temprana de un producto los patrones **no se conocen** → argumento fuerte a favor de relacional.

### 2. Consistencia e invariantes

- ¿Hay invariantes que cruzan entidades? (saldo ≥ 0, stock, unicidad de email, reservas sin doble booking) → transacciones y constraints de la BD son la forma más barata de garantizarlos. Ver [Transacciones.md](Transacciones.md).
- ¿Tolera lecturas atrasadas o pérdida acotada? (feed, contadores de vistas, telemetría) → consistencia eventual es aceptable. Ver [CAP.md](CAP.md).
- Reimplementar integridad referencial y unicidad en la app es propenso a race conditions.

### 3. Escala real (con números)

- Un Postgres bien afinado en hardware moderno maneja **decenas de miles de TPS** y **varios TB**. La mayoría de sistemas nunca sale de ahí.
- Preguntas concretas: ¿cuántas escrituras/s en el pico?, ¿cuánto crecen los datos por año?, ¿el working set cabe en RAM?
- NoSQL de escalado horizontal (DynamoDB, Cassandra) se justifica con escrituras sostenidas muy altas, datasets de decenas/cientos de TB, o multi-región activo-activo. Ver [Escalabilidad.md](Escalabilidad.md) y [Sharding.md](Sharding.md).

### 4. Operación

- ¿Administrado (RDS, Aurora, DynamoDB, Atlas) o autogestionado? Cassandra autogestionado exige expertise (repairs, compaction, tombstones).
- Backups/PITR, upgrades, monitoreo, failover: cada motor tiene su curva. Ver [Backups.md](Backups.md) y [Observabilidad.md](Observabilidad.md).
- Herramientas del ecosistema: ORMs, migraciones, BI, CDC.

### 5. Costo

- **DynamoDB on-demand**: barato en poco tráfico, caro en tráfico alto sostenido; las transacciones y lecturas fuertes cuestan el doble.
- **Relacional administrado**: costo por instancia (paga aunque esté ocioso), réplicas multiplican.
- Costo oculto: horas de ingeniería para modelar, migrar y operar; licencias (Oracle, Enterprise de Mongo); transferencia entre regiones.

### 6. Equipo

- La tecnología que el equipo **sabe operar a las 3 AM** vale más que la óptima en papel.
- Contratación: SQL es conocimiento universal; DynamoDB single-table o Cassandra requieren especialización.

## NewSQL y SQL distribuido

SQL + ACID + escalado horizontal automático (sharding transparente con consenso Raft/Paxos por rango).

| Motor | Características | Trade-offs |
|---|---|---|
| **Google Spanner** | Consistencia externa (linearizable) global con **TrueTime** (relojes atómicos/GPS), multi-región | Solo GCP, costo alto, latencia de escritura multi-región |
| **CockroachDB** | Compatible con protocolo Postgres, serializable por defecto, geo-partitioning | Latencia mayor que Postgres single-node, reintentos por conflictos serializables, licencia comercial |
| **YugabyteDB** | Reusa la capa de queries de Postgres (alta compatibilidad), DocDB (LSM) abajo | Operación de un sistema distribuido; features de PG no todas soportadas |
| **TiDB** | Compatible con MySQL, HTAP con TiFlash (columnar) | Varios componentes (PD, TiKV, TiDB) |
| **Aurora DSQL** | Serverless AWS, distribuido activo-activo multi-región, compatible Postgres, concurrencia optimista | Subconjunto de PG (limitaciones en FKs, tamaño de transacción, extensiones), abortos por conflicto al commit |

- **Cuándo sí**: necesitas ACID y SQL pero superas un nodo en escrituras, o requieres multi-región con consistencia fuerte y RPO≈0.
- **Cuándo no**: cabes en un Postgres (con réplicas). Pagarás latencia (consenso en cada escritura: ~ms intra-región, decenas-cientos de ms entre regiones), costo y complejidad sin beneficio.
- El diseño de claves sigue importando: claves secuenciales generan **hotspots** en el rango final (usar UUID o hash-sharded indexes).
- Nota: **Aurora (clásico)** no es NewSQL; escala lecturas y almacenamiento, pero las escrituras siguen en un solo nodo.

## Persistencia políglota

Usar el motor adecuado para cada necesidad: Postgres para transacciones, Redis para caché, OpenSearch para búsqueda, un warehouse para analítica.

Costos que se subestiman:

- **Sincronización**: cada almacén adicional es una copia que puede divergir. Requiere outbox/CDC y consumidores idempotentes ([OutboxCDC.md](OutboxCDC.md)); dual-write es un bug.
- **Consistencia entre almacenes**: no hay transacción común; el usuario puede ver datos distintos en búsqueda y en el detalle.
- **Operación multiplicada**: backups, monitoreo, upgrades, seguridad, on-call y expertise por cada motor.
- **Seguridad y cumplimiento**: PII replicada en N lugares; borrar datos de un usuario (GDPR) implica N sistemas.

Reglas prácticas:

- Una **fuente de verdad** por dato; el resto son **proyecciones reconstruibles**.
- Agregar un motor solo cuando el principal ya no resuelve el problema con números, no por anticipación.
- Preferir extensiones (JSONB, pg_trgm, TimescaleDB, pgvector) mientras la escala lo permita.

## Mitos frecuentes

| Mito | Realidad |
|---|---|
| "SQL no escala" | Escala verticalmente muy lejos, horizontalmente en lecturas con réplicas, y con sharding (Citus, Vitess) o NewSQL. Instagram, Shopify, GitHub corren sobre MySQL/Postgres a escala masiva. |
| "NoSQL no puede hacer joins" | Puede (`$lookup`, joins en la app), pero es **caro** y no optimizado; por eso se modela para evitarlos. No es imposible, es un trade-off de diseño. |
| "NoSQL es schemaless" | Es **schema-on-read**: el esquema existe en el código y en los datos viejos. Sin validación, cada lector maneja todas las versiones históricas. |
| "NoSQL no tiene ACID" | Mongo, DynamoDB y otros tienen transacciones; con límites de alcance, tamaño y costo. |
| "NoSQL es más rápido" | Una lectura por clave es rápida en cualquier motor. NoSQL es predecible a gran escala *para los patrones para los que se modeló*. |
| "Mongo es para prototipar rápido" | Iterar rápido en esquema se paga después en migraciones de datos inconsistentes. Postgres + JSONB permite iterar igual. |
| "Si uso NoSQL no necesito pensar en el modelo" | Es al revés: el modelo es más crítico porque cambiarlo es más caro. |

## Tabla de decisión por caso de uso

| Caso de uso | Primera opción | Alternativa | Motivo |
|---|---|---|---|
| Pagos, facturación, ledger | PostgreSQL | Spanner/CockroachDB (multi-región) | Invariantes, ACID, auditoría |
| E-commerce (catálogo + órdenes) | PostgreSQL (+ JSONB para atributos) | MongoDB para catálogo | Órdenes transaccionales; catálogo con atributos variables |
| Carrito / sesiones | Redis o DynamoDB | Postgres | Acceso por clave, TTL, tolera pérdida acotada |
| Perfil de usuario a escala masiva | DynamoDB | Postgres particionado | Acceso por clave, latencia predecible |
| Feed / timeline social | Cassandra / DynamoDB | Redis (fan-out) | Escrituras masivas, lecturas por usuario |
| Telemetría IoT / métricas | TimescaleDB / InfluxDB | ClickHouse, Cassandra | Append-only, rangos temporales, retención |
| Búsqueda full-text, facetas | OpenSearch/Elasticsearch (proyección) | Postgres FTS + pg_trgm | Relevancia; la verdad vive en otro lado |
| Recomendaciones, fraude por relaciones | Neo4j / Neptune | Postgres recursivo | Recorridos profundos |
| Analítica / BI | Warehouse (BigQuery, Snowflake, Redshift, ClickHouse) | Réplica de lectura (volumen bajo) | Columnar; ver [OLTPvsOLAP.md](OLTPvsOLAP.md) |
| Rankings / rate limiting / locks | Redis | DynamoDB | Estructuras especializadas, sub-ms |
| SaaS multi-tenant B2B | PostgreSQL (+ RLS, Citus si crece) | NewSQL | Relaciones ricas, aislamiento por tenant |
| Contenido CMS con estructura variable | MongoDB o Postgres JSONB | — | Documentos leídos completos |

## Checklist antes de elegir un motor distinto de Postgres

Responder con números y por escrito (ADR):

1. ¿Qué patrón de acceso concreto **no** resuelve Postgres bien hoy? ¿Lo medí (EXPLAIN, benchmark)?
2. ¿Probé las opciones intermedias? Índices adecuados, particionamiento, réplicas de lectura, JSONB, caché, extensiones.
3. ¿Qué garantías de consistencia pierdo y dónde reimplemento las invariantes?
4. ¿Cuál es la fuente de verdad y cómo se sincronizan las copias (outbox/CDC)?
5. ¿Quién lo opera, lo monitorea y lo restaura? ¿Hay runbooks y backups probados?
6. ¿Cuánto cuesta a 1x, 10x y 100x del tráfico actual?
7. ¿Cómo salgo si me equivoco? (costo de migración, lock-in del proveedor).

| Señal | Probable conclusión |
|---|---|
| "Necesitamos escalar" sin métricas | Quedarse en Postgres y medir |
| Escrituras sostenidas > capacidad de un nodo grande tras optimizar | Sharding (Citus/Vitess), NewSQL o wide-column |
| Acceso 100% por clave, latencia predecible, sin reportes | DynamoDB / Redis |
| Multi-región activo-activo con consistencia fuerte | Spanner / CockroachDB / Aurora DSQL |
| Multi-región activo-activo con consistencia eventual | DynamoDB Global Tables / Cassandra |
| Búsqueda por relevancia | Proyección en OpenSearch |

> **Regla práctica:** empieza con Postgres salvo que tengas un requisito concreto y medido (escala de escritura, multi-región activo-activo, patrón de acceso muy especializado) que no pueda cubrir.

## Preguntas de entrevista

1. **¿Cómo decides entre SQL y NoSQL para un sistema nuevo?** Por patrones de acceso (conocidos vs ad-hoc), invariantes y consistencia requerida, escala real medida, capacidad operativa del equipo y costo. Sin un requisito claro, relacional por flexibilidad de consultas y garantías.
2. **"SQL no escala": ¿qué respondes?** Escala verticalmente mucho, las lecturas con réplicas, y horizontalmente con sharding (Citus, Vitess) o NewSQL. El límite práctico suele ser escrituras en un nodo, y está más lejos de lo que se cree.
3. **¿Qué es NewSQL y cuándo lo usarías?** SQL distribuido con ACID y sharding automático sobre consenso (Spanner, CockroachDB, Yugabyte, Aurora DSQL). Cuando se necesita consistencia fuerte y escritura que supera un nodo o multi-región con RPO≈0; se paga en latencia y costo.
4. **¿Qué costos tiene la persistencia políglota?** Sincronización (outbox/CDC), divergencia entre almacenes, operación y on-call por motor, y PII replicada. Mitigación: una fuente de verdad, el resto proyecciones reconstruibles.
5. **¿NoSQL es realmente schemaless?** No: es schema-on-read. El esquema vive en el código y hay que manejar documentos de versiones viejas; se recomienda validación de esquema y migraciones igualmente.
6. **¿Por qué Spanner puede ofrecer consistencia externa global?** TrueTime acota la incertidumbre del reloj y el sistema espera ese intervalo (commit wait) antes de confirmar, garantizando orden real de transacciones entre regiones.
7. **¿Cuándo DynamoDB es mala elección?** Cuando los patrones de acceso no están claros o cambian, se necesitan queries ad-hoc/reportes, hay muchas relaciones o el tráfico alto sostenido lo vuelve caro frente a una instancia relacional.

## Errores comunes

- Elegir NoSQL por "escalar" sin números que lo justifiquen.
- Elegir MongoDB por "esquema flexible" y terminar con datos inconsistentes y joins en la app.
- Sumar motores (Redis, Elastic, Mongo) antes de agotar Postgres y sin plan de sincronización.
- Asumir que NewSQL es un Postgres más grande sin costo de latencia.
- Hacer reportes/analítica sobre DynamoDB o Cassandra (exportar a un warehouse).
