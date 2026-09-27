# Planes de ejecución (EXPLAIN)

## ¿Qué es?
- El **plan de ejecución** es la "ruta" que el optimizador elige para resolver una consulta.
- Leerlo es la habilidad #1 para optimizar: te dice *por qué* una query es lenta, no solo *que* lo es.
- `EXPLAIN` muestra el plan **estimado** (no ejecuta). `EXPLAIN ANALYZE` **ejecuta** la query y muestra tiempos y filas reales.
- ⚠️ `EXPLAIN ANALYZE` ejecuta de verdad: con `UPDATE`/`DELETE` envuélvelo en una transacción y haz `ROLLBACK`.

### La forma completa que conviene usar (PostgreSQL)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT * FROM pedidos WHERE cliente_id = 42;

-- Para UPDATE/DELETE sin modificar datos
BEGIN;
EXPLAIN ANALYZE DELETE FROM pedidos WHERE creado < now() - interval '2 years';
ROLLBACK;
```
- **BUFFERS**: cuántas páginas vinieron de memoria (`shared hit`) y cuántas de disco (`read`). Clave para distinguir problemas de CPU vs I/O.
- Equivalentes: MySQL `EXPLAIN ANALYZE` (8.0.18+) / `EXPLAIN FORMAT=TREE`; SQL Server "Actual Execution Plan" / `SET STATISTICS IO, TIME ON`.

## Cómo se lee un plan
- Es un **árbol**: se lee de **adentro hacia afuera** (los nodos más indentados se ejecutan primero y alimentan a su padre).
- Cada nodo muestra:
  - `cost=inicio..total`: unidades arbitrarias del optimizador (no milisegundos). Sirve para comparar planes, no para medir.
  - `rows`: filas estimadas. `width`: bytes promedio por fila.
  - `actual time=inicio..total`: ms reales **por loop**.
  - `loops`: cuántas veces se ejecutó el nodo. **Tiempo real total = actual time × loops**. Error clásico: ignorar `loops` en un Nested Loop.

```text
Nested Loop  (cost=0.43..850.12 rows=10 width=72) (actual time=0.03..45.10 rows=5000 loops=1)
  ->  Seq Scan on clientes c  (cost=0.00..25.00 rows=10 ...) (actual time=0.01..0.30 rows=5000 loops=1)
        Filter: (pais = 'CL')
  ->  Index Scan using idx_pedidos_cliente on pedidos p (...) (actual time=0.005..0.008 rows=1 loops=5000)
        Index Cond: (cliente_id = c.id)
```
- El optimizador estimó **10** clientes pero hubo **5000** → eligió Nested Loop pensando que eran pocos. El índice interno se ejecutó 5000 veces. Causa: estadísticas malas → `ANALYZE clientes;`.

## Tipos de acceso a tablas
| Nodo | Qué hace | Cuándo es bueno |
|---|---|---|
| **Seq Scan** | Lee toda la tabla | Tablas pequeñas o cuando se devuelve gran % de filas |
| **Index Scan** | Recorre el índice y va al heap por cada fila | Filtros muy selectivos |
| **Index Only Scan** | Responde solo con el índice (covering) | Todas las columnas pedidas están en el índice y la visibility map está al día |
| **Bitmap Index Scan + Bitmap Heap Scan** | Junta los punteros del índice, los ordena por página y lee el heap en orden | Selectividad media, o combinar varios índices (`BitmapAnd`/`BitmapOr`) |
| **Index Seek / Scan** (SQL Server) | Seek = navegación directa; Scan = recorre todo el índice | Seek es lo deseable |

- `Index Only Scan` con muchos `Heap Fetches` → la visibility map está desactualizada; `VACUUM` la actualiza (ver [InternosMotor.md](InternosMotor.md)).
- `Rows Removed by Filter` alto → el filtro no está en el índice o el índice no es el adecuado.
- `Filter` vs `Index Cond`: `Index Cond` se resuelve con el índice; `Filter` se aplica **después** de leer la fila (trabajo desperdiciado).

## Tipos de JOIN
| Algoritmo | Cómo funciona | Ideal cuando | Costo aprox. |
|---|---|---|---|
| **Nested Loop** | Por cada fila externa busca en la interna | Lado externo pequeño + índice en lado interno | O(n × log m) |
| **Hash Join** | Construye hash del lado pequeño, recorre el grande | Tablas grandes sin orden, igualdad | O(n + m), usa memoria |
| **Merge Join** | Recorre dos entradas ordenadas en paralelo | Ambos lados ya ordenados (por índice) | O(n + m) |

- Hash Join con `Batches: 8` (más de 1) → el hash no cupo en `work_mem` y fue a disco.

## Otras operaciones
- **Sort**: mira `Sort Method: quicksort Memory: ...` (bien) vs `external merge Disk: ...` (spill a disco). Solución: índice que entregue el orden o subir `work_mem` para esa sesión.
- **HashAggregate / GroupAggregate**: agregaciones; GroupAggregate requiere entrada ordenada.
- **Limit**: con `ORDER BY ... LIMIT` y un índice en ese orden, el motor para temprano (top-N barato).
- **Gather / Parallel Seq Scan**: ejecución paralela en varios workers.
- **Materialize / Memoize**: cachea resultados internos para reutilizarlos en loops.
- **SubPlan**: subconsulta correlacionada que se ejecuta por fila → suele reescribirse como JOIN o `EXISTS`.

## Ejemplo interpretando un plan
```text
Seq Scan on pedidos  (cost=0.00..1834.00 rows=1 width=64)
                     (actual time=0.05..12.30 rows=1 loops=1)
  Filter: (cliente_id = 42)
  Rows Removed by Filter: 99999
  Buffers: shared hit=834
```
- Leyó **100.000 filas** (834 páginas) y descartó 99.999 para encontrar 1 → **falta un índice** en `cliente_id`.

```sql
CREATE INDEX CONCURRENTLY idx_pedidos_cliente ON pedidos (cliente_id);
-- Ahora: Index Scan using idx_pedidos_cliente ... Buffers: shared hit=4
```

## Estimaciones y estadísticas
- El optimizador decide con **estadísticas** (`pg_stats`): número de valores distintos, valores más comunes, histogramas.
- Estimado vs real muy diferente (10x o más) → la causa raíz de la mayoría de planes malos.
- Soluciones:
  - `ANALYZE tabla;` (autovacuum lo hace, pero no siempre a tiempo tras cargas masivas).
  - Subir el detalle: `ALTER TABLE t ALTER COLUMN c SET STATISTICS 1000;`.
  - Columnas correlacionadas (ej: `ciudad` y `pais`): `CREATE STATISTICS st (dependencies) ON ciudad, pais FROM direcciones;`.

## Prepared statements y planes genéricos
- Con queries parametrizadas, Postgres puede pasar tras 5 ejecuciones a un **plan genérico** (no depende del valor del parámetro).
- Problema: con datos sesgados (ej: `estado = 'activo'` es 95% y `'bloqueado'` es 0.1%), un plan genérico puede ser malo para algunos valores.
- Diagnóstico: la query es rápida en `psql` con literales pero lenta desde la app. Opción: `plan_cache_mode = force_custom_plan`.
- En SQL Server el equivalente es **parameter sniffing**.

## Señales de alerta en un plan
- **Seq Scan** sobre tabla grande con filtro selectivo → falta índice o el índice no aplica (función sobre la columna, cast implícito; ver [Indices.md](Indices.md)).
- `rows` estimado vs real con diferencia enorme → `ANALYZE` / estadísticas extendidas.
- **Sort** o **Hash** con spill a disco → `work_mem` o un índice que entregue el orden.
- **Nested Loop** con miles de loops sobre algo caro → estimación mala; debería ser Hash Join.
- **SubPlan** ejecutado por cada fila → reescribir.
- `Buffers: read` alto → datos fríos / working set mayor que la RAM.
- Tiempo de **planning** alto (queries con muchos JOINs o muchas particiones).

## Herramientas
- [explain.dalibo.com](https://explain.dalibo.com) y [explain.depesz.com](https://explain.depesz.com): visualizan planes y resaltan el nodo caro.
- `auto_explain`: registra automáticamente los planes de queries que superan un umbral en producción.
- `pg_stat_statements`: encontrar **qué** queries optimizar primero (ver [Observabilidad.md](Observabilidad.md)).

## Consejos prácticos
- Optimiza lo que más **tiempo total** consume (`calls × mean_time`), no la query más lenta aislada.
- Prueba con **volumen de datos realista**: en local con 100 filas todo es Seq Scan y todo es rápido.
- No todo Seq Scan es malo: si devuelves más del ~5-10% de la tabla, leer secuencialmente suele ganar.
- Un índice acelera lecturas pero **ralentiza escrituras** — no indexes todo por si acaso.
- Mide siempre con `EXPLAIN (ANALYZE, BUFFERS)`, no adivines. Ejecuta dos veces: la primera puede estar fría de caché.

## Preguntas de entrevista
- **¿Diferencia entre `EXPLAIN` y `EXPLAIN ANALYZE`?** El primero muestra el plan estimado sin ejecutar; el segundo ejecuta y muestra tiempos y filas reales, lo que permite ver errores de estimación.
- **Una query es rápida en psql pero lenta desde la app. ¿Por qué?** Plan genérico de prepared statement / parameter sniffing, distinto `search_path` o settings, caché fría, o la app arrastra una transacción larga o esperas de lock. Comparar con `auto_explain`.
- **¿Qué significa que estimado y real difieran mucho?** Estadísticas desactualizadas o insuficientes (correlación entre columnas, datos sesgados). El optimizador elige mal el algoritmo de join o el tipo de scan.
- **¿Cuándo el optimizador prefiere Seq Scan aunque haya índice?** Cuando la selectividad es baja (se devuelve una fracción grande), la tabla es pequeña, o las estadísticas lo inducen a creerlo.
- **¿Qué es un Index Only Scan y qué lo impide?** Responder solo desde el índice; requiere que todas las columnas estén en él y que las páginas estén marcadas all-visible (VACUUM al día).
- **¿Cuándo un Hash Join es mejor que un Nested Loop?** Cuando ambas entradas son grandes y no hay un índice útil o el lado externo tiene muchas filas.
- **¿Cómo detectas un spill a disco?** `Sort Method: external merge Disk` o `Batches > 1` en un Hash.

## Errores comunes
- Ignorar `loops` al calcular el tiempo real de un nodo.
- Optimizar con datos de desarrollo pequeños.
- Ejecutar `EXPLAIN ANALYZE` de un `DELETE` en producción sin `ROLLBACK`.
- Crear un índice nuevo sin comprobar si una estadística desactualizada era el verdadero problema.
