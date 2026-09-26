# Sesión 38 — SQL para desarrolladores .NET: de SELECT a índices, ADO.NET y Dapper

> **Objetivo de la sesión**: escribir y *leer* SQL con soltura (JOINs, agregaciones, subconsultas, CTEs y window functions), entender **por qué** una consulta es lenta (índices, sargabilidad, planes de ejecución), controlar **transacciones y niveles de aislamiento**, blindarte contra **SQL injection**, y trabajar con **ADO.NET** y **Dapper** sabiendo cuándo conviene cada uno frente a EF Core (Sesión 25). Los ejemplos van para **SQL Server** y **PostgreSQL**, marcando las diferencias.

---

## 1. ¿Por qué SQL si ya uso EF Core?

En la Sesión 25 viste que EF Core traduce LINQ a SQL. Pero:

- Cuando una consulta tarda 8 s en producción, el DBA te mostrará **SQL y un plan de ejecución**, no LINQ.
- `ToQueryString()` y los logs de EF te dan SQL: si no lo lees, no puedes saber si generó un N+1, un `LEFT JOIN` innecesario o un scan.
- Reportes, dashboards y operaciones masivas suelen ser más claros (y rápidos) en SQL directo.

```
   Tu código          Capa de acceso             Motor de BD
   ─────────          ──────────────             ───────────
   LINQ      ──▶  EF Core (genera SQL)  ──┐
   SQL       ──▶  Dapper (mapea)        ──┼──▶ ADO.NET ──▶ Parser ─▶ Optimizer ─▶ Plan ─▶ Ejecución
   SQL       ──▶  ADO.NET directo       ──┘   (driver)            (usa estadísticas e índices)
```

> 💡 Todo acaba en **ADO.NET** (`DbConnection`, `DbCommand`, `DbDataReader`). EF Core y Dapper son capas encima. Teoría complementaria de BD en [../DatosConsistencia/README.md](../DatosConsistencia/README.md).

### 1.1 Modelo de ejemplo

```sql
-- SQL Server                                   -- PostgreSQL
CREATE TABLE Clientes (                         -- CREATE TABLE clientes (
  Id     INT IDENTITY PRIMARY KEY,              --   id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  Nombre NVARCHAR(100) NOT NULL,                --   nombre VARCHAR(100) NOT NULL,
  Ciudad NVARCHAR(60)  NULL,                    --   ciudad VARCHAR(60) NULL,
  CreadoUtc DATETIME2 NOT NULL                  --   creado_utc TIMESTAMPTZ NOT NULL
);                                              -- );

CREATE TABLE Pedidos (
  Id        INT IDENTITY PRIMARY KEY,
  ClienteId INT NOT NULL REFERENCES Clientes(Id),
  FechaUtc  DATETIME2 NOT NULL,
  Estado    TINYINT NOT NULL,            -- 0=Pendiente 1=Pagado 2=Cancelado
  Total     DECIMAL(18,2) NOT NULL
);

CREATE TABLE LineasPedido (
  PedidoId   INT NOT NULL REFERENCES Pedidos(Id),
  ProductoId INT NOT NULL,
  Cantidad   INT NOT NULL,
  Precio     DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (PedidoId, ProductoId)
);
```

> ⚠️ En PostgreSQL los identificadores sin comillas se pasan a **minúsculas** (`Pedidos` → `pedidos`). Si EF Core creó `"Pedidos"` con comillas, tendrás que escribir `"Pedidos"` siempre. Por eso en PG se usa `snake_case` (paquete `EFCore.NamingConventions`).

---

## 2. SELECT y el orden lógico de ejecución

Escribes `SELECT` primero, pero el motor lo evalúa **casi al final**. Este orden explica la mitad de los errores de SQL:

```
Orden en que ESCRIBES          Orden LÓGICO en que se EVALÚA
─────────────────────          ─────────────────────────────
SELECT   ⑤                     1. FROM / JOIN      (arma las filas)
FROM     ①                     2. WHERE            (filtra filas)
WHERE    ②                     3. GROUP BY         (agrupa)
GROUP BY ③                     4. HAVING           (filtra grupos)
HAVING   ④                     5. SELECT           (calcula columnas, alias, window functions)
ORDER BY ⑥                     6. ORDER BY         (ordena; aquí ya existen los alias)
OFFSET/TOP ⑦                   7. OFFSET / FETCH / TOP / LIMIT
```

```sql
-- ❌ Error: el alias 'Anio' no existe todavía en el WHERE (paso 2 < paso 5)
SELECT YEAR(FechaUtc) AS Anio, Total FROM Pedidos WHERE Anio = 2026;

-- ✅ En ORDER BY sí existe
SELECT YEAR(FechaUtc) AS Anio, Total FROM Pedidos ORDER BY Anio;
```

### 2.1 Paginación: sintaxis por motor

```sql
-- SQL Server (2012+) y PostgreSQL: estándar ANSI, ORDER BY obligatorio en SQL Server
SELECT Id, Total FROM Pedidos ORDER BY FechaUtc DESC, Id DESC
OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY;

SELECT TOP (20) Id, Total FROM Pedidos ORDER BY FechaUtc DESC;   -- solo SQL Server
SELECT id, total FROM pedidos ORDER BY fecha_utc DESC LIMIT 20 OFFSET 40;   -- solo PostgreSQL
```

### 2.2 NULL: lógica de tres valores

`NULL` significa "desconocido". Cualquier comparación con `NULL` da **UNKNOWN** (ni true ni false), y `WHERE` solo deja pasar `TRUE`.

```sql
SELECT * FROM Clientes WHERE Ciudad = NULL;      -- ❌ siempre 0 filas
SELECT * FROM Clientes WHERE Ciudad IS NULL;     -- ✅
SELECT * FROM Clientes WHERE Ciudad <> 'Lima';   -- ⚠️ NO devuelve los que tienen Ciudad NULL
SELECT COALESCE(Ciudad, 'Sin ciudad') FROM Clientes;   -- estándar (SQL Server también tiene ISNULL)
```

> ❓ **Entrevista**: *"¿`COUNT(*)` vs `COUNT(columna)`?"* → `COUNT(*)` cuenta filas; `COUNT(col)` cuenta filas donde `col` **no es NULL**; `COUNT(DISTINCT col)` cuenta valores distintos no nulos. Todas las agregaciones (`SUM`, `AVG`...) ignoran NULL, así que `AVG` sobre una columna con NULLs no divide por el total de filas.

---

## 3. JOINs

```
Clientes        Pedidos             INNER JOIN   → solo coincidencias        (A ∩ B)
┌──┬─────┐     ┌──┬─────────┐       LEFT JOIN    → todo A + lo que calce de B (NULL si no)
│1 │Ana  │     │10│Cliente 1│       RIGHT JOIN   → todo B + lo que calce de A
│2 │Luis │     │11│Cliente 1│       FULL JOIN    → todo A y todo B
│3 │Eva  │     │12│Cliente 2│       CROSS JOIN   → producto cartesiano (|A| × |B|)
└──┴─────┘     └──┴─────────┘
INNER: Ana-10, Ana-11, Luis-12       LEFT: + Eva-NULL
```

```sql
-- Clientes con su cantidad de pedidos (incluyendo los que tienen 0)
SELECT c.Id, c.Nombre, COUNT(p.Id) AS Pedidos        -- COUNT(p.Id), NO COUNT(*): Eva daría 1
FROM Clientes c
LEFT JOIN Pedidos p ON p.ClienteId = c.Id
GROUP BY c.Id, c.Nombre;
```

### 3.1 La trampa del LEFT JOIN + WHERE

```sql
-- ❌ Querías "todos los clientes y sus pedidos PAGADOS", pero el WHERE elimina las filas
--    con p.Estado NULL → el LEFT JOIN se convirtió silenciosamente en INNER JOIN
SELECT c.Nombre, p.Id
FROM Clientes c LEFT JOIN Pedidos p ON p.ClienteId = c.Id
WHERE p.Estado = 1;

-- ✅ El filtro de la tabla "opcional" va en el ON
SELECT c.Nombre, p.Id
FROM Clientes c LEFT JOIN Pedidos p ON p.ClienteId = c.Id AND p.Estado = 1;
```

> ⚠️ **Explosión de filas**: unir `Pedidos` con `LineasPedido` y con `Pagos` a la vez multiplica filas (líneas × pagos por pedido) y un `SUM(Total)` sale inflado. Es la misma *cartesian explosion* que viste con `Include` múltiples en EF Core (Sesión 25 §6.2). Solución: agregar en subconsultas/CTEs antes de unir.

---

## 4. GROUP BY y HAVING

```sql
-- Ventas por cliente en 2026, solo clientes con más de 5 pedidos pagados
SELECT   p.ClienteId,
         COUNT(*)          AS CantPedidos,
         SUM(p.Total)      AS TotalVendido,
         AVG(p.Total)      AS TicketPromedio,
         MAX(p.FechaUtc)   AS UltimaCompra
FROM     Pedidos p
WHERE    p.Estado = 1                                   -- filtra FILAS (antes de agrupar, usa índices)
  AND    p.FechaUtc >= '2026-01-01' AND p.FechaUtc < '2027-01-01'
GROUP BY p.ClienteId
HAVING   COUNT(*) > 5                                   -- filtra GRUPOS (después de agrupar)
ORDER BY TotalVendido DESC;
```

- Toda columna del `SELECT` que no esté en una agregación **debe** estar en el `GROUP BY` (PostgreSQL permite omitirla si agrupas por la PK de su tabla).
- Filtra en `WHERE` todo lo que puedas: reduce filas **antes** de agrupar. `HAVING` es solo para condiciones sobre agregados.

---

## 5. Subconsultas: escalares, IN, EXISTS y LATERAL

```sql
-- Escalar: devuelve 1 valor
SELECT Id, Total, Total - (SELECT AVG(Total) FROM Pedidos) AS DifVsPromedio FROM Pedidos;

-- EXISTS (semi-join): "clientes que compraron algo en 2026". Se detiene al primer match.
SELECT c.* FROM Clientes c
WHERE EXISTS (SELECT 1 FROM Pedidos p
              WHERE p.ClienteId = c.Id AND p.FechaUtc >= '2026-01-01');   -- correlacionada
```

### 5.1 La trampa de NOT IN con NULL

```sql
-- Productos que nunca se vendieron
SELECT * FROM Productos WHERE Id NOT IN (SELECT ProductoId FROM LineasPedido);
-- ⚠️ Si la subconsulta devuelve UN SOLO NULL, el resultado es VACÍO:
--    x NOT IN (1, 2, NULL)  ≡  x<>1 AND x<>2 AND x<>NULL  →  ... AND UNKNOWN  →  nunca TRUE

-- ✅ Usa NOT EXISTS (anti-join): semántica correcta con NULLs y el optimizador lo maneja bien
SELECT * FROM Productos pr
WHERE NOT EXISTS (SELECT 1 FROM LineasPedido l WHERE l.ProductoId = pr.Id);
```

### 5.2 "Top N por grupo" con APPLY / LATERAL

```sql
-- Los 3 últimos pedidos de CADA cliente
-- SQL Server                                   
SELECT c.Nombre, u.Id, u.FechaUtc
FROM Clientes c
CROSS APPLY (SELECT TOP (3) p.Id, p.FechaUtc FROM Pedidos p
             WHERE p.ClienteId = c.Id ORDER BY p.FechaUtc DESC) u;   -- OUTER APPLY = estilo LEFT

-- PostgreSQL
SELECT c.nombre, u.id, u.fecha_utc
FROM clientes c
CROSS JOIN LATERAL (SELECT p.id, p.fecha_utc FROM pedidos p
                    WHERE p.cliente_id = c.id ORDER BY p.fecha_utc DESC LIMIT 3) u;
```

---

## 6. CTE (Common Table Expressions)

Una CTE es una **subconsulta con nombre**, definida con `WITH`. Mejora la legibilidad y permite recursión.

```sql
WITH VentasCliente AS (
    SELECT ClienteId, SUM(Total) AS Total
    FROM Pedidos WHERE Estado = 1
    GROUP BY ClienteId
),
Segmentos AS (
    SELECT ClienteId, Total,
           CASE WHEN Total >= 1000000 THEN 'Oro'
                WHEN Total >=  200000 THEN 'Plata'
                ELSE 'Bronce' END AS Segmento
    FROM VentasCliente
)
SELECT Segmento, COUNT(*) AS Clientes, SUM(Total) AS Ventas
FROM Segmentos GROUP BY Segmento;
```

### 6.1 CTE recursiva (jerarquías: categorías, organigramas)

```sql
-- PostgreSQL exige WITH RECURSIVE; en SQL Server escribe solo WITH (RECURSIVE no existe allí)
WITH RECURSIVE Arbol AS (
    SELECT Id, Nombre, PadreId, 0 AS Nivel
    FROM Categorias WHERE PadreId IS NULL           -- ancla: raíces
    UNION ALL
    SELECT c.Id, c.Nombre, c.PadreId, a.Nivel + 1
    FROM Categorias c JOIN Arbol a ON c.PadreId = a.Id   -- paso recursivo
)
SELECT * FROM Arbol ORDER BY Nivel;
-- SQL Server corta a 100 niveles por defecto: OPTION (MAXRECURSION 500)
```

> ⚠️ Una CTE **no es una tabla temporal**. En SQL Server se "inlinea" (si la referencias dos veces, puede ejecutarse dos veces). En PostgreSQL ≥ 12 también se inlinea salvo que uses `AS MATERIALIZED`. Si necesitas materializar un resultado intermedio grande, usa una tabla temporal (`#Temp` / `CREATE TEMP TABLE`).

---

## 7. Window functions: el superpoder que pocos devs usan

Una **window function** calcula sobre un conjunto de filas relacionadas (*ventana*) **sin colapsarlas** como hace `GROUP BY`. Sintaxis: `funcion() OVER (PARTITION BY ... ORDER BY ... [frame])`.

```
GROUP BY ClienteId               SUM(Total) OVER (PARTITION BY ClienteId)
──────────────────               ────────────────────────────────────────
ClienteId | Suma                 PedidoId | ClienteId | Total | SumaCliente
    1     | 300                     10    |     1     |  100  |   300
    2     |  50                     11    |     1     |  200  |   300
(pierdes el detalle)                12    |     2     |   50  |    50
                                 (mantienes cada fila + el agregado)
```

```sql
SELECT
    Id, ClienteId, FechaUtc, Total,
    ROW_NUMBER() OVER (PARTITION BY ClienteId ORDER BY FechaUtc)        AS NumCompra,   -- 1,2,3... sin empates
    RANK()       OVER (ORDER BY Total DESC)                             AS RankTotal,   -- 1,2,2,4 (salta)
    DENSE_RANK() OVER (ORDER BY Total DESC)                             AS RankDenso,   -- 1,2,2,3 (no salta)
    LAG(Total)   OVER (PARTITION BY ClienteId ORDER BY FechaUtc)        AS TotalAnterior,
    SUM(Total)   OVER (PARTITION BY ClienteId ORDER BY FechaUtc
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS Acumulado,  -- running total
    AVG(Total)   OVER (ORDER BY FechaUtc ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS Media7
FROM Pedidos;
```

```sql
-- Clásico de entrevista: el pedido más caro de cada cliente (top-1 por grupo)
WITH Ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY ClienteId ORDER BY Total DESC, Id) AS rn
    FROM Pedidos
)
SELECT * FROM Ranked WHERE rn = 1;   -- no se puede filtrar rn en el WHERE directo (orden lógico, §2)

-- Deduplicar: borrar duplicados dejando el más reciente (SQL Server permite DELETE sobre la CTE)
WITH Dups AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY Email ORDER BY CreadoUtc DESC) AS rn FROM Suscriptores
)
DELETE FROM Dups WHERE rn > 1;
```

> ⚠️ Con `ORDER BY` y sin frame explícito, el default es `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: filas con el **mismo** valor de orden se suman juntas (el "acumulado" salta). Escribe `ROWS BETWEEN ...` cuando quieras fila a fila.

> ❓ **Entrevista**: *"`ROW_NUMBER` vs `RANK` vs `DENSE_RANK`"* → Ante empates: `ROW_NUMBER` asigna números únicos arbitrarios (agrega un desempate determinista), `RANK` repite y deja huecos, `DENSE_RANK` repite sin huecos.

---

## 8. Índices: por qué una consulta es rápida o lenta

Sin índice, buscar `WHERE ClienteId = 42` obliga a leer **toda** la tabla (*scan*). Un índice es una estructura ordenada — casi siempre un **B-tree** (B+tree) — que permite llegar a las filas en O(log n) (*seek*).

```
                   [ 500 | 1000 ]                 ← raíz
                 /        |       \
       [100|300]     [700|900]     [1200|1500]    ← nodos intermedios
        /  |  \         ...            ...
   hojas ordenadas: 1..99 │ 100..299 │ 300..499 ...  ← hojas: clave + (fila completa | puntero/clave)
   enlazadas entre sí ──▶ ──▶ ──▶  (range scans eficientes: BETWEEN, >, ORDER BY)
```

### 8.1 Clustered vs non-clustered

| | SQL Server | PostgreSQL |
|---|---|---|
| Almacenamiento de la tabla | **Clustered index**: la tabla *es* el B-tree ordenado por la clave (por defecto la PK) | **Heap**: filas sin orden; todos los índices son secundarios (`CLUSTER` reordena una vez, no se mantiene) |
| Índice secundario apunta a | La clave clustered | El `ctid` (ubicación física) |
| Ir del índice a la fila | **Key Lookup** | **Heap fetch** (evitable con *Index Only Scan* si el visibility map lo permite) |

```sql
-- Índice compuesto + columnas incluidas = "covering index"
-- SQL Server y PostgreSQL 11+
CREATE INDEX IX_Pedidos_Cliente_Fecha
    ON Pedidos (ClienteId, FechaUtc DESC)
    INCLUDE (Total, Estado);      -- en la hoja, no en la clave: cubre la query sin ir a la tabla

-- Índice filtrado (SQL Server) / parcial (PostgreSQL): solo filas "calientes"
CREATE INDEX IX_Pedidos_Pendientes ON Pedidos (FechaUtc) WHERE Estado = 0;
```

### 8.2 Reglas que un senior aplica

1. **Prefijo izquierdo**: el índice `(ClienteId, FechaUtc)` sirve para `WHERE ClienteId = @x` y para `ClienteId = @x AND FechaUtc > @d`, pero **no** para `WHERE FechaUtc > @d` sola. Regla: igualdades primero, luego el rango/orden.
2. **Selectividad**: indexar `Estado` (3 valores) sola rara vez sirve; el optimizador preferirá scan. Indexa columnas que filtran mucho.
3. **Las FKs no se indexan solas** (ni en SQL Server ni en PG). EF Core sí crea índice en las FKs por convención; en SQL a mano, recuérdalo.
4. **Cada índice encarece las escrituras** (INSERT/UPDATE/DELETE mantienen todos los índices) y ocupa espacio. No indexes "por si acaso".

### 8.3 Sargabilidad (SARG = *Search ARGument able*)

Un predicado es **sargable** si el motor puede usar el índice para buscarlo. Aplicar una función sobre la **columna** lo destruye:

```sql
-- ❌ No sargable: hay que calcular YEAR() para cada fila → scan
WHERE YEAR(FechaUtc) = 2026
WHERE LOWER(Email) = 'ana@x.com'
WHERE Total * 1.19 > 100000
WHERE Nombre LIKE '%perez'                 -- comodín al inicio

-- ✅ Sargable: la columna queda "desnuda"
WHERE FechaUtc >= '2026-01-01' AND FechaUtc < '2027-01-01'
WHERE Email = 'ana@x.com'                  -- con collation case-insensitive (SQL Server) o índice sobre LOWER(email) (PG)
WHERE Total > 100000 / 1.19
WHERE Nombre LIKE 'perez%'                 -- prefijo sí usa índice
```

> ⚠️ **Conversión implícita**: si la columna es `VARCHAR` y el parámetro llega como `NVARCHAR` (el default de .NET para `string`), SQL Server convierte **la columna** → scan. Se ve en el plan como `CONVERT_IMPLICIT`. En Dapper se evita con `DbString { IsAnsi = true }` (§12); en EF Core con `.IsUnicode(false)` en el mapeo.

---

## 9. Planes de ejecución

El optimizador elige un plan según **estadísticas** (distribución de valores). Aprende a pedirlo y a leer los operadores caros. Notas extendidas: [../DatosConsistencia/PlanesDeEjecucion.md](../DatosConsistencia/PlanesDeEjecucion.md).

```sql
-- SQL Server: en SSMS/Azure Data Studio → "Include Actual Execution Plan" (Ctrl+M), y además:
SET STATISTICS IO, TIME ON;       -- lecturas lógicas por tabla: LA métrica para comparar queries
SELECT Total FROM Pedidos WHERE ClienteId = 42 AND FechaUtc >= '2026-01-01';

-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS)        -- ANALYZE ejecuta de verdad (¡cuidado con UPDATE/DELETE!)
SELECT total FROM pedidos WHERE cliente_id = 42 AND fecha_utc >= '2026-01-01';
```

| Operador (SQL Server / PG) | Significado | ¿Preocupa? |
|---|---|---|
| Index **Seek** / Index Scan (con condición) | Navega el B-tree a las filas exactas | ✅ ideal |
| Clustered Index **Scan** / **Seq Scan** | Lee la tabla completa | ⚠️ en tablas grandes con filtro selectivo |
| **Key Lookup** / heap fetch por fila | Por cada fila del índice va a buscar columnas faltantes | ⚠️ si son miles → covering index (`INCLUDE`) |
| Nested Loops | Por cada fila externa busca en la interna | ✅ con pocas filas externas |
| Hash Match / Hash Join | Construye tabla hash de un lado | Normal en volúmenes grandes; ojo con *spills* a disco |
| Sort | Ordena en memoria/disco | ⚠️ evitable con índice en el orden correcto |
| Estimado ≠ Real (filas) | Estadísticas malas o *parameter sniffing* | ⚠️ causa #1 de planes malos |

### 9.1 Parameter sniffing (SQL Server)

SQL Server compila el plan con el **primer** valor de parámetro que recibe y lo **cachea**. Si ese valor era atípico (un cliente con 2 pedidos) y luego llega un cliente con 2 millones, se reutiliza un plan pésimo.

```sql
-- Mitigaciones (de menos a más invasivas)
UPDATE STATISTICS Pedidos;                              -- estadísticas frescas
SELECT ... WHERE ClienteId = @id OPTION (RECOMPILE);     -- plan nuevo en cada ejecución (cuesta CPU)
SELECT ... WHERE ClienteId = @id OPTION (OPTIMIZE FOR UNKNOWN);   -- plan "promedio"
-- SQL Server 2022: Parameter Sensitive Plan optimization (varios planes por consulta) + Query Store
```

> ❓ **Entrevista**: *"Una query es rápida en SSMS y lenta desde la app. ¿Por qué?"* → Clásico: planes distintos en caché. SSMS tiene `SET ARITHABORT ON` y ADO.NET `OFF` → distintas entradas de caché; y la de la app puede estar "olfateada" con un valor atípico. Además revisa conversiones implícitas por tipo de parámetro.

---

## 10. Transacciones y niveles de aislamiento

**ACID**: Atomicidad (todo o nada), Consistencia (constraints se cumplen), Aislamiento (transacciones concurrentes no se pisan), Durabilidad (lo confirmado sobrevive a una caída). Detalle en [../DatosConsistencia/Transacciones.md](../DatosConsistencia/Transacciones.md).

### 10.1 Las anomalías

| Anomalía | Qué pasa |
|---|---|
| **Dirty read** | Lees datos que otra transacción aún no confirmó (y quizá haga rollback) |
| **Non-repeatable read** | Lees la misma fila dos veces y cambió entre medio (otro hizo UPDATE + COMMIT) |
| **Phantom read** | Repites un `WHERE` y aparecen/desaparecen filas (otro hizo INSERT/DELETE) |
| **Lost update** | Dos transacciones leen, calculan y escriben: una pisa a la otra |

### 10.2 Niveles (estándar ANSI) y cómo los implementa cada motor

| Nivel | Dirty | Non-repeatable | Phantom | SQL Server | PostgreSQL |
|---|---|---|---|---|---|
| READ UNCOMMITTED | posible | posible | posible | `NOLOCK` | se comporta como READ COMMITTED |
| **READ COMMITTED** | ✗ | posible | posible | **default** (con locks; o versiones si RCSI está activo) | **default** (MVCC) |
| REPEATABLE READ | ✗ | ✗ | posible* | locks compartidos hasta el fin | *snapshot*: en PG tampoco hay phantoms |
| SNAPSHOT | ✗ | ✗ | ✗ | con `ALLOW_SNAPSHOT_ISOLATION` | (≈ REPEATABLE READ de PG) |
| SERIALIZABLE | ✗ | ✗ | ✗ | range locks | SSI: aborta con error `40001` → reintentar |

```
SQL Server clásico (locking)              PostgreSQL / SQL Server con RCSI (MVCC)
───────────────────────────               ──────────────────────────────────────
Lector espera al escritor                 Lector ve la última versión confirmada
Escritor espera al lector                 Lectores y escritores no se bloquean
→ bloqueos y deadlocks frecuentes         → más espacio (versiones), VACUUM en PG
```

> 💡 En SQL Server on-prem considera activar **READ_COMMITTED_SNAPSHOT (RCSI)**: elimina la mayoría de bloqueos lector/escritor. En **Azure SQL Database viene activado por defecto**.

> ⚠️ `WITH (NOLOCK)` no es "más rápido y ya": puede leer filas **dos veces o saltárselas** durante page splits, además de datos no confirmados. Nunca para dinero ni inventario.

### 10.3 Evitar el lost update

```sql
-- ❌ Lectura y escritura separadas: dos requests concurrentes venden el mismo stock
SELECT Stock FROM Productos WHERE Id = 7;             -- ambos leen 1
UPDATE Productos SET Stock = 0 WHERE Id = 7;          -- ambos "venden"

-- ✅ 1) Update atómico condicional (la opción más simple y escalable)
UPDATE Productos SET Stock = Stock - 1 WHERE Id = 7 AND Stock >= 1;   -- filas afectadas = 0 → sin stock

-- ✅ 2) Bloqueo pesimista explícito dentro de una transacción
SELECT Stock FROM Productos WITH (UPDLOCK, ROWLOCK) WHERE Id = 7;     -- SQL Server
SELECT stock FROM productos WHERE id = 7 FOR UPDATE;                  -- PostgreSQL

-- ✅ 3) Concurrencia optimista con rowversion/xmin → la vimos en EF Core (Sesión 25 §9)
```

**Deadlocks**: T1 bloquea A y espera B; T2 bloquea B y espera A. El motor mata a una (SQL Server error `1205`, PG `40P01`). Prevención: acceder a las tablas **siempre en el mismo orden**, transacciones **cortas**, índices adecuados (menos filas bloqueadas) y **reintentar** la víctima (Polly, Sesión 34).

---

## 11. SQL injection y consultas parametrizadas

```csharp
// ❌ CONCATENACIÓN: el input del usuario se convierte en CÓDIGO SQL
string sql = $"SELECT * FROM Usuarios WHERE Email = '{email}'";
// email = "' OR 1=1 --"          →  ...WHERE Email = '' OR 1=1 --'      → devuelve todos
// email = "'; DROP TABLE Usuarios; --"                                   → catástrofe
```

Con **parámetros**, el valor viaja **separado** del texto SQL (protocolo TDS / protocolo extendido de PG). El motor nunca lo interpreta como código, sin importar qué contenga.

```csharp
// ✅ Parametrizado
await using var cmd = new SqlCommand("SELECT Id, Nombre FROM Usuarios WHERE Email = @email", conn);
cmd.Parameters.Add("@email", SqlDbType.NVarChar, 256).Value = email;   // tipo y tamaño explícitos
```

Beneficios adicionales: **reutilización del plan** (mismo texto SQL → mismo plan en caché) y conversión de tipos correcta (fechas, decimales, sin problemas de cultura).

### 11.1 Lo que NO se puede parametrizar

Nombres de tablas, columnas, `ASC/DESC`: los parámetros son **valores**, no identificadores. Para un `ORDER BY` dinámico usa **whitelist**:

```csharp
// ✅ El usuario elige una clave; tú decides el SQL
static readonly Dictionary<string, string> Orden = new(StringComparer.OrdinalIgnoreCase)
{
    ["fecha"] = "FechaUtc", ["total"] = "Total", ["cliente"] = "ClienteId"
};
string columna = Orden.TryGetValue(sortBy, out var c) ? c : "FechaUtc";
string dir = desc ? "DESC" : "ASC";
string sql = $"SELECT Id, Total FROM Pedidos ORDER BY {columna} {dir}, Id";   // interpolar es seguro: no viene del usuario
```

| Herramienta | Seguro | Inseguro |
|---|---|---|
| ADO.NET | `cmd.Parameters.Add(...)` | concatenar en `CommandText` |
| Dapper | `QueryAsync(sql, new { email })` | `$"...{email}..."` en el `sql` |
| EF Core (Sesión 25 §10.3) | `FromSql($"...{x}")`, `SqlQuery($"...")` | `FromSqlRaw($"...{x}")` |

> ❓ **Entrevista**: *"¿Un stored procedure previene SQL injection?"* → Solo si **dentro** no arma SQL dinámico concatenando (`EXEC('...' + @param)`). Si necesitas SQL dinámico dentro del SP, usa `sp_executesql` con parámetros. La defensa real es la parametrización, más el principio de **mínimo privilegio** del usuario de BD (Sesión 28).

---

## 12. ADO.NET: la base de todo

```bash
dotnet add package Microsoft.Data.SqlClient   # SQL Server (NO System.Data.SqlClient, que está en modo mantenimiento)
dotnet add package Npgsql                     # PostgreSQL
```

| Abstracción (`System.Data.Common`) | SQL Server | PostgreSQL |
|---|---|---|
| `DbConnection` | `SqlConnection` | `NpgsqlConnection` |
| `DbCommand` | `SqlCommand` | `NpgsqlCommand` |
| `DbDataReader` | `SqlDataReader` | `NpgsqlDataReader` |
| `DbTransaction` | `SqlTransaction` | `NpgsqlTransaction` |
| `DbDataSource` (.NET 7+) | — | `NpgsqlDataSource` (recomendado) |

```csharp
using Microsoft.Data.SqlClient;

public sealed record PedidoResumen(int Id, DateTime FechaUtc, decimal Total);

public sealed class PedidosAdoRepository(string connectionString)
{
    public async Task<List<PedidoResumen>> PorClienteAsync(int clienteId, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);   // del pool (Sesión 30 §6.2)
        await conn.OpenAsync(ct);                                     // abrir tarde...

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT Id, FechaUtc, Total
            FROM Pedidos
            WHERE ClienteId = @clienteId
            ORDER BY FechaUtc DESC
            """;
        cmd.Parameters.Add(new SqlParameter("@clienteId", SqlDbType.Int) { Value = clienteId });

        var result = new List<PedidoResumen>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);    // cursor forward-only, streaming
        int oId = reader.GetOrdinal("Id"), oF = reader.GetOrdinal("FechaUtc"), oT = reader.GetOrdinal("Total");
        while (await reader.ReadAsync(ct))
            result.Add(new PedidoResumen(reader.GetInt32(oId), reader.GetDateTime(oF), reader.GetDecimal(oT)));
        return result;
    }                                                                  // ...cerrar pronto: vuelve al pool
}
```

Transacción explícita en ADO.NET:

```csharp
await using var conn = new SqlConnection(cs);
await conn.OpenAsync(ct);
await using var tx = (SqlTransaction)await conn.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
try
{
    await using var cmd = new SqlCommand(
        "UPDATE Productos SET Stock = Stock - @c WHERE Id = @id AND Stock >= @c", conn, tx); // ⚠️ pasar tx
    cmd.Parameters.AddWithValue("@c", 2);        // AddWithValue infiere tipo: ok para int, evítalo con strings
    cmd.Parameters.AddWithValue("@id", 7);
    if (await cmd.ExecuteNonQueryAsync(ct) == 0) throw new InvalidOperationException("Sin stock");
    await tx.CommitAsync(ct);
}
catch { await tx.RollbackAsync(ct); throw; }
```

> ⚠️ En SqlClient, si abriste una transacción y ejecutas un comando **sin** asignarle `Transaction`, lanza `InvalidOperationException`. En Dapper se pasa con `transaction: tx`.

```csharp
// PostgreSQL moderno: NpgsqlDataSource como Singleton (maneja pool, config, tipos)
builder.Services.AddNpgsqlDataSource(builder.Configuration.GetConnectionString("Db")!);  // paquete Npgsql.DependencyInjection
// luego inyectas NpgsqlDataSource y haces: await using var conn = await dataSource.OpenConnectionAsync(ct);
```

---

## 13. Dapper: SQL tuyo, mapeo gratis

**Dapper** (de Stack Overflow) son métodos de extensión sobre `IDbConnection`: tú escribes el SQL, él crea parámetros y mapea columnas → propiedades por nombre. Rendimiento cercano a ADO.NET a mano.

```csharp
// dotnet add package Dapper
using Dapper;

public sealed class PedidosQueries(NpgsqlDataSource ds)
{
    // Consulta simple: las columnas se mapean por nombre (alias para snake_case)
    public async Task<IReadOnlyList<PedidoResumen>> PorClienteAsync(int clienteId, CancellationToken ct)
    {
        await using var conn = await ds.OpenConnectionAsync(ct);
        var rows = await conn.QueryAsync<PedidoResumen>(new CommandDefinition("""
            SELECT id AS Id, fecha_utc AS FechaUtc, total AS Total
            FROM pedidos WHERE cliente_id = @clienteId
            ORDER BY fecha_utc DESC
            """, new { clienteId }, cancellationToken: ct));      // CommandDefinition = forma de pasar el CT
        return rows.AsList();
    }

    // Una fila o null
    public Task<PedidoResumen?> ObtenerAsync(IDbConnection conn, int id) =>
        conn.QuerySingleOrDefaultAsync<PedidoResumen>(
            "SELECT id AS Id, fecha_utc AS FechaUtc, total AS Total FROM pedidos WHERE id = @id", new { id });

    // Listas: SQL Server → Dapper expande "IN @ids" a (@ids1,@ids2,...)
    //         PostgreSQL → mejor pasar un array real con ANY (un solo parámetro, un solo plan)
    public async Task<IEnumerable<PedidoResumen>> PorIdsAsync(IDbConnection conn, int[] ids) =>
        await conn.QueryAsync<PedidoResumen>(
            "SELECT id AS Id, fecha_utc AS FechaUtc, total AS Total FROM pedidos WHERE id = ANY(@ids)", new { ids });
}
```

> 💡 `DefaultTypeMap.MatchNamesWithUnderscores = true;` (una vez al arrancar) hace que `fecha_utc` mapee a `FechaUtc` sin alias.

### 13.1 Multi-mapping y múltiples resultados

```csharp
// Multi-mapping: un JOIN → dos objetos. splitOn indica dónde empieza el segundo.
var sql = """
    SELECT p.Id, p.Total, c.Id, c.Nombre
    FROM Pedidos p JOIN Clientes c ON c.Id = p.ClienteId
    WHERE p.FechaUtc >= @desde
    """;
var pedidos = await conn.QueryAsync<PedidoConCliente, ClienteDto, PedidoConCliente>(
    sql, (p, c) => p with { Cliente = c }, new { desde }, splitOn: "Id");   // el 2º "Id" inicia ClienteDto

// QueryMultiple: varios SELECT en un solo round-trip (dashboard)
using var multi = await conn.QueryMultipleAsync("""
    SELECT COUNT(*) FROM Pedidos WHERE Estado = 0;
    SELECT TOP (5) Id, FechaUtc, Total FROM Pedidos ORDER BY Total DESC;
    """);
int pendientes = await multi.ReadSingleAsync<int>();
var top5 = (await multi.ReadAsync<PedidoResumen>()).AsList();
```

### 13.2 Escrituras y transacciones

```csharp
await using var conn = new SqlConnection(cs);
await conn.OpenAsync(ct);
await using var tx = await conn.BeginTransactionAsync(ct);

int pedidoId = await conn.ExecuteScalarAsync<int>(
    "INSERT INTO Pedidos (ClienteId, FechaUtc, Estado, Total) OUTPUT INSERTED.Id VALUES (@ClienteId, @FechaUtc, 0, @Total)",
    new { dto.ClienteId, FechaUtc = DateTime.UtcNow, dto.Total }, tx);   // PG: ... RETURNING id

// Pasar una colección ejecuta el comando UNA VEZ POR ELEMENTO (N round-trips, no un bulk insert)
await conn.ExecuteAsync(
    "INSERT INTO LineasPedido (PedidoId, ProductoId, Cantidad, Precio) VALUES (@PedidoId, @ProductoId, @Cantidad, @Precio)",
    dto.Lineas.Select(l => new { PedidoId = pedidoId, l.ProductoId, l.Cantidad, l.Precio }), tx);

await tx.CommitAsync(ct);

// Strings contra columnas VARCHAR en SQL Server: evita el CONVERT_IMPLICIT de §8.3
await conn.QueryAsync<Cliente>("SELECT * FROM Clientes WHERE Rut = @rut",
    new { rut = new DbString { Value = rut, IsAnsi = true, Length = 12 } });
```

> ⚠️ Para cargas masivas reales: `SqlBulkCopy` (SQL Server) o `COPY ... FROM STDIN (FORMAT BINARY)` con `conn.BeginBinaryImport` (Npgsql). Órdenes de magnitud más rápido que N `INSERT`.

**Upsert** (insertar o actualizar) — difiere por motor:

```sql
-- PostgreSQL: simple y atómico
INSERT INTO stock (producto_id, cantidad) VALUES (@id, @c)
ON CONFLICT (producto_id) DO UPDATE SET cantidad = stock.cantidad + EXCLUDED.cantidad;

-- SQL Server: MERGE tiene bugs/carreras conocidos; patrón robusto:
UPDATE Stock WITH (UPDLOCK, SERIALIZABLE) SET Cantidad = Cantidad + @c WHERE ProductoId = @id;
IF @@ROWCOUNT = 0 INSERT INTO Stock (ProductoId, Cantidad) VALUES (@id, @c);
```

---

## 14. Dapper vs EF Core vs ADO.NET: cuándo usar cada uno

| Criterio | EF Core (Sesión 25) | Dapper | ADO.NET |
|---|---|---|---|
| Quién escribe el SQL | EF (desde LINQ) | Tú | Tú |
| Mapeo | Automático + relaciones | Automático por nombre | Manual |
| Change tracking / Unit of Work | ✅ | ❌ | ❌ |
| Migrations | ✅ | ❌ (usa DbUp, FluentMigrator o las de EF) | ❌ |
| Consultas complejas (CTE, window, hints) | Parcial (`FromSql`/`SqlQuery`) | ✅ total control | ✅ |
| Rendimiento lectura | Muy bueno (EF 8, `AsNoTracking`, compiled queries) | Excelente | Máximo (streaming, sin reflexión) |
| Refactor seguro (tipado) | ✅ LINQ compila | ❌ SQL en strings | ❌ |
| Portabilidad entre motores | ✅ alta | ❌ SQL por motor | ❌ |
| Curva / riesgo | Magia: N+1, cartesian explosion | Hay que saber SQL | Verboso |

**Postura senior**: no es "uno u otro". Encaja con CQRS (Sesión 26):

```
 Comandos (escrituras)                      Queries (lecturas)
 ─────────────────────                      ──────────────────
 EF Core + aggregates                       EF AsNoTracking().Select(dto)   ← 80% de los casos
 change tracking, invariantes               Dapper + SQL a mano             ← reportes, CTEs, window functions,
 transacción de SaveChanges                                                   dashboards, hot paths medidos
                           ambos sobre la MISMA BD
```

```csharp
// Mezclarlos compartiendo conexión y transacción de EF Core
await using var tx = await db.Database.BeginTransactionAsync(ct);
db.Pedidos.Add(pedido);
await db.SaveChangesAsync(ct);

var conn = db.Database.GetDbConnection();                       // la MISMA conexión
await conn.ExecuteAsync("UPDATE Productos SET Stock = Stock - @c WHERE Id = @id",
    new { c = 2, id = 7 }, tx.GetDbTransaction());               // la MISMA transacción
await tx.CommitAsync(ct);
```

> ❓ **Entrevista**: *"¿Dapper es más rápido que EF Core?"* → En microbenchmarks sí, pero desde EF Core 6–8 la brecha para lecturas `AsNoTracking` con proyección es pequeña. La diferencia grande en producción casi nunca es el mapper: es el **SQL generado y los índices**. Elige Dapper por **control del SQL**, no por un 10% de mapeo.

---

## 15. Diferencias SQL Server vs PostgreSQL (chuleta)

| Tema | SQL Server | PostgreSQL |
|---|---|---|
| Autoincremento | `IDENTITY` | `GENERATED ... AS IDENTITY` (o `SERIAL` legacy) |
| Devolver lo insertado | `OUTPUT INSERTED.Id` | `RETURNING id` |
| Limitar filas | `TOP (n)` / `OFFSET FETCH` | `LIMIT n OFFSET m` / `OFFSET FETCH` |
| Concatenar / nulos | `+`, `ISNULL`, `CONCAT` | `\|\|`, `COALESCE`, `CONCAT` |
| Texto case-insensitive | Por *collation* (default CI) | Case-sensitive: `ILIKE`, `citext`, índice en `lower()` |
| Upsert | `MERGE` (con cuidado) | `INSERT ... ON CONFLICT` |
| Top-N por grupo | `CROSS/OUTER APPLY` | `LATERAL` |
| Plan | Plan gráfico, `STATISTICS IO` | `EXPLAIN (ANALYZE, BUFFERS)` |
| Concurrencia | Locking (RCSI opcional) | MVCC siempre (+ `VACUUM`) |
| Booleano | `BIT` | `BOOLEAN` |

---

## Resumen mental de la sesión

```
Orden lógico: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → OFFSET
NULL = desconocido: IS NULL, NOT IN + NULL = vacío → usa NOT EXISTS
LEFT JOIN: filtros de la tabla opcional van en el ON
CTE = subconsulta con nombre (no tabla temporal) · recursiva para jerarquías
Window functions: agregan SIN colapsar filas → ROW_NUMBER top-N, LAG, running totals

Índices: B-tree · prefijo izquierdo · INCLUDE = covering · FKs no se indexan solas
Sargable = columna "desnuda" (sin funciones, sin conversión implícita)
Plan: Seek bien · Scan/Key Lookup/Sort a revisar · estimado≠real → stats/sniffing

Transacciones: ACID · READ COMMITTED default en ambos · PG y RCSI = MVCC
Lost update → UPDATE condicional atómico / UPDLOCK / FOR UPDATE / rowversion
Deadlock → mismo orden, tx cortas, reintentar

SQL injection → SIEMPRE parámetros · identificadores → whitelist
ADO.NET = base (Connection/Command/Reader, pool) · Dapper = tu SQL + mapeo
EF Core para escribir y el 80% de lecturas · Dapper para SQL complejo/hot paths
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿En qué orden lógico se evalúa un `SELECT`? ¿Por qué no puedes usar un alias del `SELECT` en el `WHERE`?
2. ❓ ¿Por qué `NOT IN` puede devolver cero filas inesperadamente? ¿Qué usarías en su lugar?
3. ❓ Tienes un `LEFT JOIN` que se comporta como `INNER JOIN`. ¿Cuál es la causa probable?
4. ❓ Obtén el pedido más caro de cada cliente con una window function. ¿`ROW_NUMBER`, `RANK` o `DENSE_RANK`?
5. ❓ Clustered vs non-clustered index. ¿Cómo cambia esto en PostgreSQL?
6. ❓ ¿Qué es un covering index y cómo elimina un Key Lookup?
7. ❓ ¿Qué es la sargabilidad? Da tres ejemplos de predicados no sargables y su reescritura.
8. ❓ Una query va rápida en SSMS y lenta en la app. ¿Qué investigas?
9. ❓ Explica dirty read, non-repeatable read y phantom. ¿Qué nivel de aislamiento es el default en SQL Server y en PostgreSQL, y cómo difieren?
10. ❓ ¿Cómo evitas un lost update al descontar stock? Da dos alternativas.
11. ❓ ¿Por qué los parámetros previenen SQL injection? ¿Cómo haces un `ORDER BY` dinámico seguro?
12. ❓ ¿Cuándo elegirías Dapper sobre EF Core y cómo los combinarías en la misma transacción?

## Ejercicio práctico
1. Levanta PostgreSQL y SQL Server con Docker (Sesión 36):
   ```bash
   docker run -d --name pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
   docker run -d --name mssql -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='Dev_12345!' -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
   ```
2. Crea el modelo de §1.1 e inserta ~1 millón de pedidos con `generate_series` (PG) o un `INSERT ... SELECT` sobre `sys.all_objects` cruzada (SQL Server).
3. Escribe: ventas mensuales con variación vs mes anterior (`LAG`), top-3 pedidos por cliente, y clientes sin pedidos con `NOT EXISTS`.
4. Mide `SELECT Total FROM Pedidos WHERE ClienteId = 42 AND FechaUtc >= '2026-01-01'` con `EXPLAIN (ANALYZE, BUFFERS)` / `STATISTICS IO`. Crea el índice `(ClienteId, FechaUtc)` y luego agrégale `INCLUDE (Total)`. Anota lecturas antes/después y el cambio de operador.
5. Reescribe `WHERE YEAR(FechaUtc) = 2026` de forma sargable y compara planes.
6. Abre dos sesiones y reproduce un **non-repeatable read** en READ COMMITTED; luego repítelo en REPEATABLE READ. Provoca un **deadlock** actualizando dos filas en orden inverso.
7. Crea una API mínima con: un endpoint que haga el reporte del paso 3 con **Dapper**, otro que cree pedidos con **EF Core**, y uno que combine ambos en la **misma transacción** (§14).
8. Intenta un SQL injection contra un endpoint vulnerable que concatene strings, y luego corrígelo con parámetros y un whitelist para el `ORDER BY`.

---

➡️ **Cuando termines**, marca la Sesión 38 en el [README](Readme.md) y pídeme la **Sesión 39 — Git y flujo de trabajo profesional (Git flow, PRs, code review, versionado semántico, buenas prácticas senior)**.
