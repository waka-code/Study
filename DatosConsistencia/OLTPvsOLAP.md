# OLTP vs OLAP

Dos tipos de carga con requisitos opuestos. Entender la diferencia explica por qué existen los data warehouses y por qué no se deben correr reportes pesados sobre la base transaccional.

## Definiciones

| | OLTP (transaccional) | OLAP (analítico) |
|---|---|---|
| Propósito | Operar el negocio (crear orden, pagar) | Analizar el negocio (ventas por región/mes) |
| Queries | Cortas, muchas, por clave | Pocas, largas, escanean millones de filas |
| Filas por query | 1–100 | Millones–miles de millones |
| Columnas por query | Casi todas de pocas filas | Pocas columnas de muchas filas |
| Escrituras | INSERT/UPDATE constantes, pequeños | Cargas masivas por lote o streaming (append) |
| Latencia objetivo | ms | segundos–minutos |
| Concurrencia | Miles de usuarios | Decenas de analistas / dashboards |
| Modelo | Normalizado (3NF) | Desnormalizado (star schema) |
| Almacenamiento | Por filas | Columnar |
| Motores | PostgreSQL, MySQL, Oracle, SQL Server | Redshift, BigQuery, Snowflake, ClickHouse, DuckDB |
| Datos | Estado actual | Historia (años) |

## Por qué no correr reportes pesados sobre la BD transaccional

- **Competencia por recursos**: un `GROUP BY` sobre 200M filas consume CPU, I/O y memoria (`work_mem`, spills a disco) y satura el **buffer pool**, expulsando las páginas calientes del OLTP → la latencia p99 de la app sube.
- **Transacciones largas en MVCC**: una query de 40 minutos mantiene un snapshot viejo; **VACUUM no puede limpiar** las versiones muertas generadas en ese tiempo → bloat, y en casos extremos riesgo de wraparound (ver [InternosMotor.md](InternosMotor.md)).
- **Locks**: un reporte con `SELECT` bloquea DDL (`ALTER TABLE` espera el `AccessShareLock`) y las migraciones se atascan, encolando a todos detrás (ver [Migraciones.md](Migraciones.md)).
- **Modelo inadecuado**: esquema normalizado → joins de 10 tablas; almacenamiento por filas → lee columnas que no necesita.
- **Réplica de lectura como paso intermedio**: sirve para volumen moderado, pero con `hot_standby_feedback = on` el problema de VACUUM vuelve al primario, y con `off` las queries largas se cancelan por conflicto de replicación. Ver [ReadReplicas.md](ReadReplicas.md).

Camino típico: réplica de lectura → vistas materializadas/tablas de agregados → warehouse dedicado alimentado por CDC/ELT.

## Almacenamiento por filas vs columnar

```
Por filas (heap Postgres):            Columnar:
[1, Ana, CL, 100][2, Luis, AR, 50]    id:     [1, 2, 3, ...]
[3, Eva, CL, 70] ...                  nombre: [Ana, Luis, Eva, ...]
                                      pais:   [CL, AR, CL, ...]
                                      monto:  [100, 50, 70, ...]
```

`SELECT pais, sum(monto) FROM ventas GROUP BY pais` en columnar lee **solo 2 columnas**; por filas lee todas las páginas completas.

Ventajas del columnar:

- **Menos I/O**: solo las columnas referenciadas.
- **Compresión**: valores del mismo tipo y a menudo repetidos juntos → dictionary encoding, run-length encoding (RLE), delta encoding, bit-packing. Ratios de 5–10x son comunes. Menos bytes = menos I/O y más datos en caché.
- **Ejecución vectorizada**: se procesan bloques de miles de valores por instrucción (SIMD), sin overhead por fila; aprovecha caché de CPU.
- **Data skipping**: metadatos min/max por bloque (zone maps) permiten saltar bloques completos (`WHERE fecha >= '2026-09-01'`).
- Procesamiento sobre datos comprimidos (sin descomprimir).

Desventajas:

- Actualizar o borrar una fila toca N columnas/archivos → UPDATE/DELETE caros, típicamente se hacen por lotes o con "merge on read".
- Leer una fila completa (`SELECT * WHERE id = ?`) es lento.
- Inserciones fila a fila son ineficientes: se cargan en lotes (micro-batches).

| Operación | Filas | Columnar |
|---|---|---|
| Obtener una orden por id | Excelente | Mala |
| Actualizar un estado | Excelente | Cara |
| Sumar montos de 1.000M filas | Lenta | Excelente |
| Compresión | Baja | Alta |

## Data warehouses

| Motor | Modelo | Puntos fuertes | Cuidados |
|---|---|---|---|
| **Amazon Redshift** | Cluster MPP (o serverless), columnar | Integración AWS, Spectrum sobre S3 | Elegir distribution/sort keys; VACUUM y concurrencia |
| **Google BigQuery** | Serverless, separa storage/compute | Cero administración, escala enorme | Cobro por bytes escaneados: `SELECT *` cuesta dinero; particionar y clusterizar |
| **Snowflake** | Virtual warehouses sobre storage compartido | Aislamiento de cargas, time travel, zero-copy clone | Costo por créditos si los warehouses no se suspenden |
| **ClickHouse** | Open source, MergeTree columnar | Latencia sub-segundo en analítica de eventos, dashboards en tiempo real | Joins y updates limitados; modelado por `ORDER BY` de la tabla |
| **DuckDB** | Embebido, in-process | Analítica local sobre Parquet/CSV | Un solo proceso, no es servidor multiusuario |

Conceptos transversales: **MPP** (procesamiento paralelo masivo), **separación de cómputo y almacenamiento** (escalar cada uno por separado), particionamiento por fecha, y clustering/sort keys para data skipping.

```sql
-- BigQuery: tabla particionada por día y clusterizada
CREATE TABLE analytics.fact_sales (
  sale_date   DATE,
  customer_sk INT64,
  product_sk  INT64,
  store_sk    INT64,
  quantity    INT64,
  amount      NUMERIC
)
PARTITION BY sale_date
CLUSTER BY store_sk, product_sk;
```

## Modelado dimensional

### Hechos y dimensiones

- **Tabla de hechos (fact)**: eventos medibles del negocio. Contiene **medidas** numéricas (monto, cantidad) y **FKs a dimensiones**. Muchas filas, delgada.
- **Grano**: qué representa una fila ("una línea de venta por producto por ticket"). Definirlo es la **primera decisión** y la más importante.
- **Dimensiones**: el contexto para filtrar y agrupar (quién, qué, dónde, cuándo): cliente, producto, tienda, fecha. Pocas filas, anchas, descriptivas.
- **Surrogate keys** (`customer_sk`) en dimensiones, distintas del id del sistema origen: permiten historia (SCD) y aislar cambios del origen.
- Tipos de medidas: **aditivas** (monto: se suman en cualquier dimensión), **semi-aditivas** (saldo: no se suman en el tiempo), **no aditivas** (ratios: recalcular desde componentes).

### Star schema

La tabla de hechos al centro y dimensiones **desnormalizadas** alrededor (un join por dimensión).

```sql
CREATE TABLE dim_date (
  date_sk     int PRIMARY KEY,         -- 20260926
  full_date   date NOT NULL,
  year        int, quarter int, month int, day_of_week int, is_holiday boolean
);

CREATE TABLE dim_product (
  product_sk  bigint PRIMARY KEY,
  product_id  text NOT NULL,           -- natural key del origen
  name        text, category text, subcategory text, brand text
);

CREATE TABLE fact_sales (
  date_sk     int    REFERENCES dim_date,
  product_sk  bigint REFERENCES dim_product,
  customer_sk bigint,
  store_sk    bigint,
  quantity    int,
  amount      numeric(14,2)
);

-- Ventas por categoría y trimestre
SELECT d.year, d.quarter, p.category, sum(f.amount) AS revenue
FROM fact_sales f
JOIN dim_date d    ON d.date_sk = f.date_sk
JOIN dim_product p ON p.product_sk = f.product_sk
WHERE d.year = 2026
GROUP BY d.year, d.quarter, p.category
ORDER BY revenue DESC;
```

### Snowflake schema

Las dimensiones se **normalizan** en sub-dimensiones (`dim_product → dim_category → dim_department`).

| | Star | Snowflake |
|---|---|---|
| Joins | Menos (uno por dimensión) | Más |
| Redundancia | Mayor en dimensiones | Menor |
| Simplicidad para analistas/BI | Alta | Menor |
| Rendimiento en columnar | Generalmente mejor | Algo peor |
| Cuándo | Default | Dimensiones enormes o jerarquías compartidas |

En warehouses columnares el costo de almacenamiento de la redundancia es bajo (compresión) → **star es el default**. También existen tablas "One Big Table" totalmente desnormalizadas, populares en BigQuery/ClickHouse.

### Slowly Changing Dimensions (SCD)

¿Qué pasa cuando un cliente cambia de ciudad? ¿Las ventas antiguas se atribuyen a la ciudad vieja o a la nueva?

- **Tipo 1 — sobrescribir**: se actualiza el valor; se pierde la historia. Para correcciones o atributos cuya historia no importa.
- **Tipo 2 — nueva fila por versión**: se cierra la fila vigente y se inserta otra con nuevo surrogate key. Los hechos viejos apuntan a la versión vieja → análisis histórico correcto.
- (Tipo 3: columna `valor_anterior`; poco usado.)

```sql
CREATE TABLE dim_customer (
  customer_sk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id text NOT NULL,
  city        text,
  segment     text,
  valid_from  timestamptz NOT NULL,
  valid_to    timestamptz,                 -- NULL = vigente
  is_current  boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX one_current_per_customer
  ON dim_customer (customer_id) WHERE is_current;

-- SCD2: el cliente C-42 se mudó a Valparaíso
-- Cierra la versión vigente solo si cambió, e inserta la nueva en la misma sentencia
WITH closed AS (
  UPDATE dim_customer
     SET valid_to = now(), is_current = false
   WHERE customer_id = 'C-42' AND is_current
     AND city IS DISTINCT FROM 'Valparaíso'
  RETURNING customer_id, segment
)
INSERT INTO dim_customer (customer_id, city, segment, valid_from)
SELECT customer_id, 'Valparaíso', segment, now() FROM closed;
```

- Al cargar hechos se busca la versión vigente **en la fecha del hecho** (`valid_from <= fecha < coalesce(valid_to, 'infinity')`).
- En la práctica se implementa con `MERGE` o con herramientas (dbt snapshots).

## ETL vs ELT

| | ETL | ELT |
|---|---|---|
| Orden | Extraer → Transformar (fuera) → Cargar | Extraer → Cargar crudo → Transformar dentro del warehouse |
| Dónde transforma | Servidor/herramienta intermedia (Informatica, Spark, Glue) | SQL en el warehouse (dbt) |
| Auge | Warehouses caros, cómputo escaso | Warehouses elásticos en la nube |
| Ventajas | Datos limpios al llegar; filtrar PII antes de cargar | Datos crudos disponibles para re-procesar; transformaciones versionadas en SQL |
| Desventajas | Cambiar lógica implica re-extraer | Datos crudos (incl. PII) en el warehouse; costo de cómputo |

- Extracción: **CDC** (Debezium, AWS DMS, Fivetran, Airbyte) en lugar de dumps completos o queries `WHERE updated_at > x` (que pierden borrados y cargan el OLTP). Ver [OutboxCDC.md](OutboxCDC.md).
- Capas típicas: **raw/bronze** (copia fiel) → **staging/silver** (limpio, tipado, deduplicado) → **marts/gold** (modelos dimensionales para BI).
- Orquestación: Airflow, Dagster; transformación: dbt con tests (unicidad, not null, relaciones).

## Data lake y lakehouse

- **Data lake**: archivos en almacenamiento de objetos (S3, GCS) en formatos abiertos; barato, cualquier tipo de dato. Riesgo: "data swamp" sin gobierno, sin transacciones ni esquema.
- **Parquet**: formato de archivo **columnar** con compresión, estadísticas por row group y predicate pushdown. Estándar de facto (ORC es la alternativa).
- **Formatos de tabla** (**Apache Iceberg**, Delta Lake, Hudi): capa de metadatos sobre Parquet que agrega transacciones ACID, evolución de esquema, time travel, particionamiento oculto y snapshots consistentes.
- **Lakehouse**: lake + formato de tabla + motores de consulta (Trino/Athena, Spark, Snowflake, BigQuery, Redshift sobre Iceberg). Datos en un solo lugar abierto, múltiples motores sin copiar.

```sql
-- Athena / Trino sobre Iceberg
SELECT store_sk, sum(amount)
FROM lake.fact_sales
FOR TIMESTAMP AS OF TIMESTAMP '2026-09-01 00:00:00 UTC'   -- time travel
WHERE sale_date >= DATE '2026-08-01'
GROUP BY store_sk;
```

- Cuándo lake/lakehouse: volúmenes enormes, datos semiestructurados, ML, evitar lock-in. Cuándo warehouse administrado: equipo pequeño que quiere SQL sin operar infraestructura.

## HTAP y opciones intermedias

- **HTAP** (TiDB + TiFlash, SingleStore, AlloyDB columnar engine, Aurora zero-ETL a Redshift): transaccional y analítico en un sistema, con réplicas columnares.
- En Postgres, antes de un warehouse: vistas materializadas (`REFRESH MATERIALIZED VIEW CONCURRENTLY`), tablas de agregados mantenidas por jobs, particionamiento, BRIN en tablas append-only, extensiones columnares (Citus columnar, pg_duckdb).
- Regla: si los dashboards tocan pocos millones de filas, una réplica + agregados basta. Cuando son cientos de millones o se cruzan múltiples fuentes, warehouse.

## Preguntas de entrevista

1. **¿Por qué un almacenamiento columnar es más rápido para analítica?** Lee solo las columnas necesarias, comprime mucho mejor (valores homogéneos), permite ejecución vectorizada y saltar bloques por min/max. Es malo para leer o actualizar filas individuales.
2. **¿Qué problemas causa correr reportes pesados en el primario de Postgres?** Compite por CPU/I/O y buffer pool (sube la latencia de la app), mantiene snapshots viejos que impiden a VACUUM limpiar (bloat) y bloquea DDL de migraciones.
3. **¿Qué es el grano de una tabla de hechos y por qué es lo primero?** Lo que representa una fila. Determina qué medidas y dimensiones son válidas; mezclar granos produce doble conteo.
4. **Explica SCD tipo 1 vs tipo 2.** Tipo 1 sobrescribe el atributo y pierde historia; tipo 2 versiona con nueva fila, surrogate key y vigencia, permitiendo atribuir hechos históricos al valor vigente en su momento.
5. **¿Star o snowflake schema?** Star por defecto: menos joins y más simple para BI; en columnar la redundancia comprime bien. Snowflake si hay dimensiones enormes o jerarquías compartidas.
6. **¿ETL o ELT?** ELT en warehouses cloud elásticos: cargar crudo y transformar con SQL versionado (dbt) permite reprocesar. ETL cuando hay que filtrar/enmascarar antes de cargar o el destino no tiene cómputo.
7. **¿Qué aporta Iceberg sobre Parquet en S3?** Transacciones ACID, snapshots consistentes, time travel, evolución de esquema y particionamiento oculto; convierte un conjunto de archivos en una tabla confiable para múltiples motores.
8. **¿Cómo alimentas el warehouse sin cargar la BD transaccional?** CDC desde el WAL/binlog (Debezium, DMS) hacia el lake/warehouse, en lugar de dumps o queries incrementales por `updated_at` que pierden borrados.

## Errores comunes

- Dashboards de BI apuntando directo al primario de producción.
- Usar `SELECT *` en BigQuery (cobro por bytes) o no particionar tablas grandes.
- No definir el grano y mezclar líneas con cabeceras → sumas duplicadas.
- Usar la natural key del origen como FK en hechos → imposible versionar dimensiones.
- Extraer con `updated_at > x` y perder borrados.
- Hacer UPDATEs fila a fila en un motor columnar.
- Copiar PII cruda al warehouse sin enmascarar ni controlar acceso (ver [Seguridad.md](Seguridad.md)).
