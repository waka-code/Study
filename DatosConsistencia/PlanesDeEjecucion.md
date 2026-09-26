# Planes de ejecución (EXPLAIN)

## ¿Qué es?
- El **plan de ejecución** es la "ruta" que la base de datos elige para resolver una consulta.
- Leerlo es la habilidad #1 de un DBA: te dice *por qué* una query es lenta, no solo *que* lo es.
- Se obtiene con `EXPLAIN` (muestra el plan estimado) o `EXPLAIN ANALYZE` (ejecuta la query y muestra tiempos reales).

### Ejemplo básico
```sql
EXPLAIN ANALYZE
SELECT * FROM pedidos WHERE cliente_id = 42;
```

## Qué mirar primero
- **Seq Scan (escaneo secuencial)**: lee toda la tabla fila por fila. En tablas grandes suele ser señal de que **falta un índice**.
- **Index Scan / Index Seek**: usa un índice para ir directo a las filas. Es lo que normalmente quieres.
- **Rows**: cuántas filas estima (o realmente procesa) cada paso. Grandes diferencias entre estimado y real indican **estadísticas desactualizadas**.
- **Cost / Time**: el costo relativo y el tiempo real de cada operación. Busca el paso más caro.

## Tipos de operaciones comunes
- **Seq Scan**: recorre toda la tabla. Bien para tablas chicas, malo para grandes con filtro selectivo.
- **Index Scan**: usa un índice para localizar filas específicas.
- **Nested Loop**: para cada fila de una tabla, busca coincidencias en la otra. Eficiente cuando una tabla es pequeña.
- **Hash Join**: construye una tabla hash en memoria. Bueno para unir tablas grandes.
- **Merge Join**: une dos conjuntos ya ordenados. Eficiente si los datos ya vienen ordenados.
- **Sort**: ordena resultados (`ORDER BY`, `GROUP BY`). Costoso si no cabe en memoria (usa disco).

### Ejemplo interpretando un plan
```text
Seq Scan on pedidos  (cost=0.00..1834.00 rows=1 width=64)
                     (actual time=0.05..12.30 rows=1 loops=1)
  Filter: (cliente_id = 42)
  Rows Removed by Filter: 99999
```
- Leyó **100.000 filas** y descartó 99.999 solo para encontrar 1 → claramente **falta un índice** en `cliente_id`.

### Solución típica
```sql
-- Crear el índice que evita el Seq Scan
CREATE INDEX idx_pedidos_cliente ON pedidos (cliente_id);

-- Ahora el mismo EXPLAIN debería mostrar un "Index Scan"
```

## Señales de alerta en un plan
- **Seq Scan** sobre una tabla grande con un filtro selectivo → falta índice.
- Diferencia enorme entre `rows` estimado y real → ejecutar `ANALYZE` para actualizar estadísticas.
- **Sort** o **Hash** que "spill to disk" (usan disco) → considera más memoria de trabajo o un índice que ya entregue el orden.
- **Nested Loop** con muchas filas en ambos lados → probablemente un Hash Join sería mejor.

## Consejos prácticos
- Actualiza estadísticas con `ANALYZE` (Postgres) para que el optimizador tome buenas decisiones.
- No todo Seq Scan es malo: en tablas pequeñas es más rápido que usar un índice.
- Un índice ayuda a leer, pero **ralentiza escrituras** (INSERT/UPDATE) — no indexes todo por si acaso.
- Mide siempre con `EXPLAIN ANALYZE`, no adivines.
