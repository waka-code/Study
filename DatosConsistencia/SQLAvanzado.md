# SQL Avanzado

SQL es un lenguaje **declarativo** basado en conjuntos: describes *qué* resultado quieres y el optimizador decide *cómo*. Un desarrollador senior piensa en conjuntos (no en bucles), conoce la semántica exacta de `NULL`, domina window functions y CTEs, y sabe cuándo empujar lógica a la base de datos y cuándo no.

Esquema usado en los ejemplos (PostgreSQL):

```sql
CREATE TABLE departamentos (id BIGINT PRIMARY KEY, nombre TEXT NOT NULL);
CREATE TABLE empleados (
  id         BIGINT PRIMARY KEY,
  nombre     TEXT NOT NULL,
  depto_id   BIGINT REFERENCES departamentos(id),
  jefe_id    BIGINT REFERENCES empleados(id),
  salario    NUMERIC(12,2) NOT NULL,
  ingreso    DATE NOT NULL
);
CREATE TABLE ventas (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empleado_id BIGINT NOT NULL REFERENCES empleados(id),
  fecha       DATE NOT NULL,
  monto       NUMERIC(12,2) NOT NULL
);
```

Relacionado: [Indices.md](Indices.md), [PlanesDeEjecucion.md](PlanesDeEjecucion.md), [Normalizacion.md](Normalizacion.md), [ORMs.md](ORMs.md), [Transacciones.md](Transacciones.md).

## Orden lógico de evaluación

`FROM/JOIN` → `WHERE` → `GROUP BY` → `HAVING` → window functions → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT/OFFSET`.

- Explica por qué no puedes usar un alias del `SELECT` en el `WHERE`, y por qué no puedes filtrar por una window function en `WHERE` (hay que envolverla en subconsulta/CTE).
- Es el orden **lógico**; el optimizador puede ejecutar en otro orden físico si el resultado es equivalente.

## Tipos de JOIN

| JOIN | Devuelve |
|---|---|
| `INNER JOIN` | Filas con coincidencia en ambos lados |
| `LEFT JOIN` | Todas las de la izquierda; NULLs a la derecha si no hay match |
| `RIGHT JOIN` | Simétrico; casi siempre se reescribe como LEFT por legibilidad |
| `FULL OUTER JOIN` | Todas de ambos lados (MySQL no lo soporta: emular con `UNION`) |
| `CROSS JOIN` | Producto cartesiano |
| Self join | Tabla consigo misma (empleado y jefe) |
| **Semi-join** (`EXISTS`, `IN`) | Filas de la izquierda que *tienen* match, sin duplicarlas |
| **Anti-join** (`NOT EXISTS`) | Filas de la izquierda *sin* match |
| **LATERAL** | Subconsulta que puede referenciar filas previas del `FROM` |

**Trampa clásica del LEFT JOIN**: un filtro sobre la tabla derecha en el `WHERE` lo convierte en INNER.

```sql
-- MAL: elimina departamentos sin ventas en 2026 (NULL no pasa el filtro)
SELECT d.nombre, count(v.id)
FROM departamentos d
LEFT JOIN empleados e ON e.depto_id = d.id
LEFT JOIN ventas v ON v.empleado_id = e.id
WHERE v.fecha >= '2026-01-01'
GROUP BY d.nombre;

-- BIEN: el filtro va en la condición del JOIN
SELECT d.nombre, count(v.id)
FROM departamentos d
LEFT JOIN empleados e ON e.depto_id = d.id
LEFT JOIN ventas v ON v.empleado_id = e.id AND v.fecha >= '2026-01-01'
GROUP BY d.nombre;
```

### Semi-join y anti-join

```sql
-- Semi-join: empleados que vendieron algo (no duplica filas como un JOIN)
SELECT e.* FROM empleados e
WHERE EXISTS (SELECT 1 FROM ventas v WHERE v.empleado_id = e.id);

-- Anti-join: empleados sin ventas
SELECT e.* FROM empleados e
WHERE NOT EXISTS (SELECT 1 FROM ventas v WHERE v.empleado_id = e.id);
```

**NOT IN con NULLs**: si la subconsulta devuelve algún `NULL`, `NOT IN` devuelve **cero filas**.

```sql
-- Empleados que no son jefe de nadie: devuelve VACÍO porque jefe_id tiene NULLs
SELECT * FROM empleados WHERE id NOT IN (SELECT jefe_id FROM empleados);
-- x NOT IN (1, NULL)  =  x <> 1 AND x <> NULL  =  ... AND UNKNOWN  ->  nunca TRUE

-- Correcto
SELECT * FROM empleados e
WHERE NOT EXISTS (SELECT 1 FROM empleados s WHERE s.jefe_id = e.id);
```

- Además, PostgreSQL no puede transformar `NOT IN` en un hash anti-join eficiente (por esa semántica), mientras que `NOT EXISTS` sí. Regla: **usa siempre `NOT EXISTS`**.

### LATERAL

Permite una subconsulta "por fila", ideal para top-N por grupo con índice. En SQL Server: `CROSS APPLY` / `OUTER APPLY`. MySQL 8.0.14+ soporta `LATERAL`.

```sql
-- Las 3 ventas más recientes de cada empleado
SELECT e.nombre, u.fecha, u.monto
FROM empleados e
CROSS JOIN LATERAL (
  SELECT v.fecha, v.monto FROM ventas v
  WHERE v.empleado_id = e.id
  ORDER BY v.fecha DESC
  LIMIT 3
) u;
-- Con índice (empleado_id, fecha DESC) cada iteración lee solo 3 entradas
```

## NULL y lógica de tres valores

`NULL` significa "desconocido / no aplica". Las comparaciones con NULL devuelven **UNKNOWN**, no FALSE.

| a | b | a AND b | a OR b |
|---|---|---|---|
| TRUE | UNKNOWN | UNKNOWN | TRUE |
| FALSE | UNKNOWN | FALSE | UNKNOWN |
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

- `WHERE` solo deja pasar TRUE; UNKNOWN se descarta igual que FALSE. `NOT UNKNOWN` sigue siendo UNKNOWN.
- `col = NULL` nunca es verdadero: usar `IS NULL`. Para comparar tratando NULL como valor: `IS DISTINCT FROM` / `IS NOT DISTINCT FROM` (MySQL: `<=>`).
- Agregados ignoran NULL: `count(col)` cuenta no nulos, `count(*)` cuenta filas; `avg(col)` divide solo entre no nulos. `sum` sobre cero filas devuelve NULL, no 0: usar `COALESCE(sum(x), 0)`.
- `GROUP BY` y `DISTINCT` agrupan los NULL juntos. Los `UNIQUE` los tratan como distintos (en PG, salvo `NULLS NOT DISTINCT`).
- Orden: en PG los NULL van al final en `ASC` (al inicio en MySQL/SQL Server). Controlar con `NULLS FIRST/LAST`.
- `CHECK (x > 0)` **acepta** NULL (UNKNOWN no viola el check): combinar con `NOT NULL`.
- Oracle trata `''` como NULL; PostgreSQL, MySQL y SQL Server no.

## GROUP BY y HAVING

```sql
SELECT depto_id, count(*) AS n, avg(salario) AS promedio
FROM empleados
WHERE ingreso >= '2020-01-01'   -- filtra filas antes de agrupar (usa índices)
GROUP BY depto_id
HAVING count(*) >= 5;           -- filtra grupos después de agregar
```

- Filtra en `WHERE` todo lo que no dependa de agregados: reduce filas antes del agrupamiento.
- PostgreSQL permite columnas no agregadas si la PK del grupo está en el `GROUP BY` (dependencia funcional). MySQL con `ONLY_FULL_GROUP_BY` desactivado devuelve valores arbitrarios: mantenerlo activado.
- Agregado condicional: `count(*) FILTER (WHERE monto > 1000)` (PG) o `sum(CASE WHEN monto > 1000 THEN 1 ELSE 0 END)` (portable).
- `GROUPING SETS`, `ROLLUP` y `CUBE` calculan subtotales en una sola pasada.

## Window functions

Calculan sobre un conjunto de filas relacionadas **sin colapsarlas** (a diferencia de `GROUP BY`).

```sql
SELECT nombre, depto_id, salario,
  ROW_NUMBER() OVER w AS rn,          -- 1,2,3,4 (desempate arbitrario salvo ORDER BY total)
  RANK()       OVER w AS rnk,         -- 1,2,2,4 (salta)
  DENSE_RANK() OVER w AS drnk,        -- 1,2,2,3 (no salta)
  salario - avg(salario) OVER (PARTITION BY depto_id) AS diff_promedio,
  round(100.0 * salario / sum(salario) OVER (PARTITION BY depto_id), 2) AS pct_depto
FROM empleados
WINDOW w AS (PARTITION BY depto_id ORDER BY salario DESC);
```

```sql
-- LAG/LEAD: comparar con la fila anterior/siguiente
SELECT fecha, total,
  total - LAG(total) OVER (ORDER BY fecha) AS variacion,
  LEAD(fecha) OVER (ORDER BY fecha) AS siguiente_fecha
FROM (SELECT fecha, sum(monto) AS total FROM ventas GROUP BY fecha) d;
```

### Frames

- Sintaxis: `ROWS | RANGE | GROUPS BETWEEN <inicio> AND <fin>`.
- **Frame por defecto con `ORDER BY`**: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Con `RANGE`, las filas **empatadas** en el `ORDER BY` se incluyen todas: un running total con fechas repetidas "salta". Usar `ROWS` si se quiere fila a fila.
- Sin `ORDER BY`, el frame es toda la partición.
- `LAST_VALUE` con frame por defecto devuelve la fila actual; necesita `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

```sql
-- Promedio móvil de 7 días (asume una fila por día)
SELECT fecha, total,
  avg(total) OVER (ORDER BY fecha ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS media_7d
FROM ventas_diarias;

-- Con días faltantes, usar RANGE con intervalo (PG 11+)
SELECT fecha, total,
  avg(total) OVER (ORDER BY fecha RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW)
FROM ventas_diarias;
```

- Costo: cada `PARTITION BY/ORDER BY` distinto puede requerir un sort. Un índice que coincida con `(partition, order)` lo evita.

## Top-N por grupo

```sql
-- Opción 1: window function (portable, lee todo el grupo)
SELECT * FROM (
  SELECT e.*, ROW_NUMBER() OVER (PARTITION BY depto_id ORDER BY salario DESC, id) AS rn
  FROM empleados e
) t
WHERE rn <= 3;

-- Opción 2: DISTINCT ON (solo PG, top-1 por grupo)
SELECT DISTINCT ON (depto_id) depto_id, nombre, salario
FROM empleados
ORDER BY depto_id, salario DESC, id;

-- Opción 3: LATERAL + LIMIT (mejor con muchos grupos grandes e índice adecuado)
```

- Usa `RANK`/`DENSE_RANK` si los empates deben incluirse; `ROW_NUMBER` con un desempate determinista (`id`) si no.
- SQL Server: `TOP (n) WITH TIES`; PG 13+: `FETCH FIRST n ROWS WITH TIES`.

## CTEs y CTEs recursivas

```sql
WITH ventas_2026 AS (
  SELECT empleado_id, sum(monto) AS total
  FROM ventas WHERE fecha >= '2026-01-01'
  GROUP BY empleado_id
)
SELECT e.nombre, v.total
FROM empleados e JOIN ventas_2026 v ON v.empleado_id = e.id
ORDER BY v.total DESC;
```

- Mejoran la legibilidad. **PostgreSQL < 12** materializaba siempre las CTEs (barrera de optimización: no empujaba predicados). Desde PG 12 se inlinan si se referencian una vez y no tienen efectos; se controla con `AS MATERIALIZED` / `AS NOT MATERIALIZED`.
- **CTEs con escritura** (PG): `WITH x AS (DELETE ... RETURNING *) INSERT ... SELECT FROM x` en una sola sentencia atómica.

### Recursiva: árbol jerárquico

```sql
-- Toda la cadena de subordinados del empleado 1, con nivel y ruta
WITH RECURSIVE organigrama AS (
  SELECT id, nombre, jefe_id, 1 AS nivel, ARRAY[id] AS ruta
  FROM empleados WHERE id = 1                       -- ancla
  UNION ALL
  SELECT e.id, e.nombre, e.jefe_id, o.nivel + 1, o.ruta || e.id
  FROM empleados e
  JOIN organigrama o ON e.jefe_id = o.id            -- paso recursivo
  WHERE NOT e.id = ANY(o.ruta)                      -- protege contra ciclos
    AND o.nivel < 20                                -- límite de profundidad
)
SELECT repeat('  ', nivel - 1) || nombre AS arbol, nivel
FROM organigrama
ORDER BY ruta;
```

- PG 14+ tiene `CYCLE` y `SEARCH DEPTH FIRST BY` nativos. SQL Server usa `WITH` sin `RECURSIVE` y `MAXRECURSION` (100 por defecto).
- Alternativas para árboles muy consultados: `ltree` (materialized path), nested sets o closure table. Trade-off: lecturas rápidas vs escrituras más complejas.
- También sirve para generar series (aunque en PG `generate_series` es mejor).

## UPSERT

```sql
-- PostgreSQL: requiere un UNIQUE/PK sobre el target del conflicto
INSERT INTO inventario (producto_id, stock)
VALUES (10, 5)
ON CONFLICT (producto_id)
DO UPDATE SET stock = inventario.stock + EXCLUDED.stock,
              actualizado_en = now()
WHERE inventario.bloqueado = false
RETURNING producto_id, stock, (xmax = 0) AS insertado;   -- truco PG: xmax=0 indica insert

-- Ignorar duplicados
INSERT INTO eventos_procesados (evento_id) VALUES ('abc') ON CONFLICT DO NOTHING;
```

```sql
-- MySQL 8.0.19+ (VALUES() está deprecado desde 8.0.20)
INSERT INTO inventario (producto_id, stock) VALUES (10, 5) AS nuevo
ON DUPLICATE KEY UPDATE stock = inventario.stock + nuevo.stock;

-- SQL Server / PostgreSQL 15+: MERGE estándar
MERGE INTO inventario AS t
USING (VALUES (10, 5)) AS s(producto_id, stock) ON t.producto_id = s.producto_id
WHEN MATCHED THEN UPDATE SET stock = t.stock + s.stock
WHEN NOT MATCHED THEN INSERT (producto_id, stock) VALUES (s.producto_id, s.stock);
```

- `ON CONFLICT` es **atómico frente a concurrencia**. `MERGE` no lo es por sí solo: en SQL Server necesita `WITH (HOLDLOCK)` y en PG puede fallar con violación de unicidad bajo carrera. Para upserts concurrentes en PG, preferir `ON CONFLICT`.
- `ON DUPLICATE KEY` en MySQL se dispara con **cualquier** índice único, no solo el que esperas.
- Útil para **idempotencia** de consumidores de mensajes ([OutboxCDC.md](OutboxCDC.md)).
- Consume valores de secuencia aunque no inserte (huecos en IDs: normal).

## RETURNING

```sql
UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1 AND saldo >= 100 RETURNING saldo;
DELETE FROM sesiones WHERE expira_en < now() RETURNING usuario_id;
```

- Evita un roundtrip y la race condition de hacer `SELECT` después. Si el `UPDATE` no devuelve filas, la condición no se cumplió (útil para *optimistic locking* con `version`).
- SQL Server: `OUTPUT inserted.*, deleted.*`. MySQL no tiene `RETURNING` (MariaDB sí); se usa `LAST_INSERT_ID()`.

## Vistas vs vistas materializadas

| | Vista | Vista materializada |
|---|---|---|
| Almacena datos | No (es una query guardada) | Sí (resultado persistido) |
| Frescura | Siempre actual | Hasta el último `REFRESH` |
| Costo de lectura | El de la query subyacente | Leer una tabla (indexable) |
| Uso | Encapsular lógica, seguridad (exponer columnas) | Agregados costosos, reportes, dashboards |

- `REFRESH MATERIALIZED VIEW CONCURRENTLY` (PG) no bloquea lecturas pero requiere un índice único y recalcula todo. No hay refresh incremental nativo en PG (extensiones como `pg_ivm`); SQL Server tiene *indexed views* mantenidas automáticamente (con muchas restricciones); MySQL no tiene vistas materializadas.
- Vistas con `security_barrier` / `security_invoker` (PG 15+) importan para RLS ([Seguridad.md](Seguridad.md)).
- Vistas anidadas sobre vistas ocultan complejidad y producen planes enormes.

## JSONB básico

```sql
CREATE TABLE productos_attr (id BIGINT PRIMARY KEY, attrs JSONB NOT NULL DEFAULT '{}');

SELECT attrs->'dimensiones'        AS json_obj,   -- devuelve jsonb
       attrs->>'color'             AS color,      -- devuelve text
       attrs #>> '{dimensiones,alto}' AS alto
FROM productos_attr
WHERE attrs @> '{"color": "rojo"}'                 -- contención: usa índice GIN
  AND attrs ? 'garantia';                          -- existe la clave

UPDATE productos_attr SET attrs = jsonb_set(attrs, '{stock}', '10') WHERE id = 1;
UPDATE productos_attr SET attrs = attrs - 'obsoleto' WHERE id = 1;

-- Índice B-tree de expresión para una clave consultada por igualdad o rango
CREATE INDEX idx_attr_color ON productos_attr ((attrs->>'color'));
```

- `jsonb` (binario, indexable, sin duplicados ni orden de claves) sobre `json` (texto) salvo que importe preservar el texto exacto.
- Cualquier update reescribe el documento completo (y lo reescribe en TOAST si es grande): mal para documentos grandes con updates frecuentes.
- El planner no tiene buenas estadísticas dentro del JSON: estimaciones pobres.
- Ver [Normalizacion.md](Normalizacion.md#desnormalización-deliberada) y [ModeladoNoSQL.md](ModeladoNoSQL.md).

## Funciones, stored procedures y triggers

- **Funciones** (`CREATE FUNCTION`): devuelven valores; se usan en queries. Marcar volatilidad correcta (`IMMUTABLE`, `STABLE`, `VOLATILE`): una función en un índice de expresión debe ser `IMMUTABLE`.
- **Procedures** (`CREATE PROCEDURE`, PG 11+): se invocan con `CALL` y pueden controlar transacciones (`COMMIT` dentro), útil para procesos batch.
- **Triggers**: lógica automática ante `INSERT/UPDATE/DELETE`.

```sql
CREATE OR REPLACE FUNCTION set_actualizado_en() RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_productos_actualizado
BEFORE UPDATE ON productos
FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
```

**Cuándo sí**: auditoría, invariantes que involucran varias tablas y no se expresan con constraints, mantener columnas derivadas, procesamiento de muchos datos cerca de ellos (evitar mover millones de filas por la red).

**Cuándo evitarlos**:
- Lógica de negocio compleja: difícil de versionar, testear, depurar y observar; queda escondida para quien lee el código de la aplicación.
- Triggers en cascada: efectos ocultos, escrituras amplificadas y deadlocks difíciles de diagnosticar.
- Escalabilidad: la base es el componente más difícil de escalar horizontalmente; CPU gastada en PL/pgSQL compite con las queries.
- Lock-in de motor; migraciones de esquema más frágiles ([Migraciones.md](Migraciones.md)).
- Llamadas externas (HTTP, colas) desde triggers: acoplan la transacción a un sistema externo; usar Outbox ([OutboxCDC.md](OutboxCDC.md)).

## Antipatrones

- **`SELECT *`**: trae columnas innecesarias (incluyendo TOAST grandes), impide index-only scans, rompe cuando cambia el esquema y aumenta tráfico de red.
- **N+1**: una query para la lista y una por cada elemento. Se resuelve con `JOIN`, `WHERE id = ANY($1)` / `IN (...)` en lote o eager loading del ORM ([ORMs.md](ORMs.md)).
- **EAV** (Entity-Attribute-Value): tabla `(entidad_id, atributo, valor TEXT)`. Sin tipos, sin constraints, pivots costosos con N self-joins. Alternativa: columnas reales + JSONB para lo variable.
- **Funciones sobre columnas en `WHERE`**: `WHERE extract(year FROM fecha) = 2026` no usa el índice; usar rango ([Indices.md](Indices.md#cuándo-el-optimizador-no-usa-un-índice)).
- **Paginación con `OFFSET` grande**: el motor lee y descarta todas las filas previas. Usar **keyset pagination**: `WHERE (fecha, id) < ($1, $2) ORDER BY fecha DESC, id DESC LIMIT 20`.
- **`DISTINCT` para "arreglar" duplicados** producidos por un JOIN mal planteado; usar `EXISTS`.
- **`count(*)` para verificar existencia**: usar `EXISTS`.
- **Concatenar strings para SQL**: inyección SQL; usar parámetros ([Seguridad.md](Seguridad.md)).

## Ejercicios típicos de entrevista

### Segundo salario más alto

```sql
-- Con DENSE_RANK (maneja empates y generaliza a N)
SELECT DISTINCT salario FROM (
  SELECT salario, DENSE_RANK() OVER (ORDER BY salario DESC) AS r FROM empleados
) t WHERE r = 2;

-- Clásico: devuelve NULL si no existe
SELECT max(salario) FROM empleados
WHERE salario < (SELECT max(salario) FROM empleados);

-- Con OFFSET sobre valores distintos
SELECT DISTINCT salario FROM empleados ORDER BY salario DESC OFFSET 1 LIMIT 1;
```

Por departamento: agregar `PARTITION BY depto_id` al `DENSE_RANK`.

### Encontrar y borrar duplicados

```sql
-- Encontrar
SELECT lower(email) AS email, count(*) FROM usuarios
GROUP BY lower(email) HAVING count(*) > 1;

-- Borrar dejando el de menor id
DELETE FROM usuarios u
USING usuarios d
WHERE lower(u.email) = lower(d.email) AND u.id > d.id;

-- Alternativa con window function
DELETE FROM usuarios WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY id) AS rn FROM usuarios
  ) t WHERE rn > 1
);
-- Después: CREATE UNIQUE INDEX ... ON usuarios (lower(email)) para que no vuelva a pasar
```

### Running total

```sql
SELECT fecha, monto,
  sum(monto) OVER (ORDER BY fecha, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado,
  sum(monto) OVER (PARTITION BY date_trunc('month', fecha) ORDER BY fecha, id
                   ROWS UNBOUNDED PRECEDING) AS acumulado_mes
FROM ventas
WHERE empleado_id = 7;
```

`ROWS` + desempate por `id` evita el salto por empates del frame `RANGE` por defecto.

### Gaps and islands: rachas de días consecutivos

```sql
-- Rachas de días consecutivos con ventas por empleado
WITH dias AS (
  SELECT DISTINCT empleado_id, fecha FROM ventas
), grupos AS (
  SELECT empleado_id, fecha,
    fecha - (ROW_NUMBER() OVER (PARTITION BY empleado_id ORDER BY fecha))::int AS grp
  FROM dias
)
SELECT empleado_id, min(fecha) AS inicio, max(fecha) AS fin, count(*) AS dias
FROM grupos
GROUP BY empleado_id, grp
ORDER BY empleado_id, inicio;
```

- Idea: en una secuencia consecutiva, `fecha - row_number` es constante; cada cambio de constante es una nueva isla.
- **Gaps** (huecos) en IDs:

```sql
SELECT id + 1 AS desde, siguiente - 1 AS hasta
FROM (SELECT id, LEAD(id) OVER (ORDER BY id) AS siguiente FROM ventas) t
WHERE siguiente - id > 1;
```

### Otros frecuentes

```sql
-- Empleados que ganan más que su jefe (self join)
SELECT e.nombre FROM empleados e JOIN empleados j ON j.id = e.jefe_id
WHERE e.salario > j.salario;

-- Departamentos sin empleados (anti-join)
SELECT d.* FROM departamentos d
WHERE NOT EXISTS (SELECT 1 FROM empleados e WHERE e.depto_id = d.id);

-- Pivot: ventas por trimestre en columnas
SELECT empleado_id,
  sum(monto) FILTER (WHERE extract(quarter FROM fecha) = 1) AS q1,
  sum(monto) FILTER (WHERE extract(quarter FROM fecha) = 2) AS q2
FROM ventas WHERE fecha >= '2026-01-01' AND fecha < '2027-01-01'
GROUP BY empleado_id;
```

## Preguntas de entrevista

1. **¿Por qué `NOT IN` puede devolver cero filas y qué usas en su lugar?**
   Si la subconsulta contiene un NULL, `x <> NULL` es UNKNOWN y el `AND` nunca es TRUE. Uso `NOT EXISTS`, que además se optimiza como anti-join.
2. **Diferencia entre `ROW_NUMBER`, `RANK` y `DENSE_RANK`.**
   Ante empates: ROW_NUMBER asigna números únicos (arbitrarios si no hay desempate), RANK repite y salta (1,1,3), DENSE_RANK repite sin saltar (1,1,2).
3. **¿Qué frame usa por defecto `sum() OVER (ORDER BY fecha)` y qué problema causa?**
   `RANGE UNBOUNDED PRECEDING AND CURRENT ROW`: las filas con la misma fecha se suman juntas, así que el acumulado salta en empates. Uso `ROWS` y un desempate único.
4. **¿`WHERE` vs `HAVING`?**
   WHERE filtra filas antes de agrupar y puede usar índices; HAVING filtra grupos por agregados. Todo lo no agregado debe ir en WHERE.
5. **¿Cómo haces un upsert seguro ante concurrencia?**
   En PG `INSERT ... ON CONFLICT` sobre un índice único, que es atómico. `MERGE` no garantiza atomicidad frente a inserts concurrentes sin locks adicionales (HOLDLOCK en SQL Server).
6. **¿Cuándo usarías una vista materializada en lugar de una vista o una tabla de resumen?**
   Para agregados costosos donde se tolera frescura acotada y el refresh completo es barato relativo a la frecuencia de lectura. Si necesita actualización incremental o frescura casi real, una tabla de resumen mantenida por eventos o triggers.
7. **¿Por qué evitarías la lógica de negocio en triggers y stored procedures?**
   Oculta comportamiento, complica testing, versionado y observabilidad, amplifica escrituras y consume CPU en el componente más difícil de escalar. Los reservo para integridad, auditoría y procesamiento masivo cercano a los datos.
8. **Una paginación con `OFFSET 100000` es lenta. ¿Por qué y cómo la arreglas?**
   El motor debe leer y descartar 100000 filas. Uso keyset pagination con un cursor `(fecha, id)` y un índice compuesto que coincida con el orden.

## Errores comunes

- Filtrar la tabla derecha de un `LEFT JOIN` en el `WHERE`.
- Usar `= NULL` o `NOT IN` con columnas nullables.
- `ROW_NUMBER` sin desempate determinista: resultados distintos entre ejecuciones.
- Olvidar que `sum` de cero filas es NULL.
- Usar `DISTINCT` para ocultar un JOIN que multiplica filas.
- Asumir que una CTE siempre se materializa (o que nunca lo hace) sin revisar la versión y el plan.
- `MERGE` concurrente sin locks, esperando que se comporte como `ON CONFLICT`.
- Recursivas sin protección contra ciclos ni límite de profundidad.
