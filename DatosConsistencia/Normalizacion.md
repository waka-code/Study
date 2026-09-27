# Normalización

La **normalización** es el proceso de estructurar tablas para que cada hecho se almacene **una sola vez**, eliminando redundancia y las anomalías que produce. No es un fin estético: su objetivo es que la base de datos **no pueda representar estados inconsistentes**. La desnormalización es válida, pero debe ser una decisión deliberada, medida y con un mecanismo que mantenga la consistencia.

Relacionado: [Indices.md](Indices.md), [SQLAvanzado.md](SQLAvanzado.md), [Transacciones.md](Transacciones.md), [ModeladoNoSQL.md](ModeladoNoSQL.md), [OLTPvsOLAP.md](OLTPvsOLAP.md).

## Dependencias funcionales

- `X → Y` ("X determina Y"): para cada valor de X existe un único valor de Y. Ej: `cliente_id → cliente_email`.
- **Clave candidata**: conjunto mínimo de atributos que determina todos los demás. Una se elige como **PK**.
- **Atributo primo**: pertenece a alguna clave candidata.
- **Dependencia parcial**: un atributo no primo depende de *parte* de una clave compuesta.
- **Dependencia transitiva**: `A → B` y `B → C`, con `B` no clave, por lo que `A → C` indirectamente.
- Las dependencias funcionales vienen del **dominio del negocio**, no de los datos actuales. Que hoy no haya dos productos con el mismo nombre no implica `nombre → producto_id`.

## Anomalías

Considera esta tabla sin normalizar, donde se registra cada línea de pedido con todo su contexto:

| pedido_id | fecha | cliente_id | cliente_email | cliente_ciudad | producto_id | producto_nombre | precio_lista | cantidad | telefonos |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-03-01 | 10 | ana@x.com | Santiago | P1 | Teclado | 30 | 2 | 555-1, 555-2 |
| 1 | 2026-03-01 | 10 | ana@x.com | Santiago | P2 | Mouse | 15 | 1 | 555-1, 555-2 |
| 2 | 2026-03-02 | 11 | luis@x.com | Lima | P1 | Teclado | 30 | 5 | 555-9 |

- **Anomalía de actualización**: si Ana cambia de email, hay que actualizar N filas; si se actualiza solo una, la base tiene dos emails "verdaderos".
- **Anomalía de inserción**: no se puede registrar un producto nuevo sin que exista un pedido (o se insertan filas con NULLs artificiales).
- **Anomalía de borrado**: al borrar el pedido 2 se pierde toda la información de Luis y su ciudad.

## Ejemplo progresivo: de 0FN a BCNF

### 1FN: valores atómicos, sin grupos repetidos

- Cada celda contiene **un solo valor** del dominio; no hay listas ni columnas `telefono1, telefono2, telefono3`.
- Cada fila es identificable por una clave.
- `telefonos = '555-1, 555-2'` viola 1FN: no se puede indexar, validar ni buscar sin parsear.

```sql
-- Se extraen los teléfonos; la tabla queda con clave (pedido_id, producto_id)
CREATE TABLE cliente_telefonos (
  cliente_id BIGINT NOT NULL,
  telefono   TEXT   NOT NULL,
  PRIMARY KEY (cliente_id, telefono)
);
-- lineas_1fn(pedido_id, producto_id, fecha, cliente_id, cliente_email, cliente_ciudad,
--            producto_nombre, precio_lista, cantidad)   PK = (pedido_id, producto_id)
```

- Matiz senior: arrays y JSONB en PostgreSQL "violan" 1FN formalmente, pero son aceptables si el conjunto se lee y escribe siempre como unidad y no se usa para joins ni integridad referencial (ver [Desnormalización deliberada](#desnormalización-deliberada)).

### 2FN: sin dependencias parciales

- Requiere 1FN y que ningún atributo no primo dependa de **parte** de una clave compuesta.
- Con PK `(pedido_id, producto_id)`:
  - `pedido_id → fecha, cliente_id, cliente_email, cliente_ciudad` (parcial).
  - `producto_id → producto_nombre, precio_lista` (parcial).
  - Solo `cantidad` depende de la clave completa.
- Se descompone:

```sql
-- pedidos_2fn(pedido_id PK, fecha, cliente_id, cliente_email, cliente_ciudad)
-- productos(producto_id PK, nombre, precio_lista)
-- lineas_pedido(pedido_id, producto_id, cantidad)  PK = (pedido_id, producto_id)
```

- Una tabla con PK de una sola columna está automáticamente en 2FN.

### 3FN: sin dependencias transitivas

- Requiere 2FN y que ningún atributo no primo dependa de otro atributo no primo.
- En `pedidos_2fn`: `pedido_id → cliente_id → cliente_email, cliente_ciudad`. Transitiva.
- Se extrae `clientes`:

```sql
CREATE TABLE clientes (
  cliente_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  ciudad     TEXT NOT NULL
);

CREATE TABLE productos (
  producto_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre       TEXT NOT NULL,
  precio_lista NUMERIC(12,2) NOT NULL CHECK (precio_lista >= 0)
);

CREATE TABLE pedidos (
  pedido_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
  fecha      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lineas_pedido (
  pedido_id       BIGINT NOT NULL REFERENCES pedidos(pedido_id) ON DELETE CASCADE,
  producto_id     BIGINT NOT NULL REFERENCES productos(producto_id),
  cantidad        INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL,   -- precio histórico, ver nota
  PRIMARY KEY (pedido_id, producto_id)
);
CREATE INDEX idx_lineas_producto ON lineas_pedido (producto_id);  -- FK sin índice automático en PG
CREATE INDEX idx_pedidos_cliente ON pedidos (cliente_id);
```

- **`precio_unitario` no es redundancia**: `precio_lista` es el precio *actual*; `precio_unitario` es el precio *al momento de la venta*. Son hechos distintos. Confundirlos es un error de modelado frecuente (lo mismo con direcciones de envío en facturas).
- Resumen clásico: cada atributo no clave depende "de la clave, de toda la clave y de nada más que la clave".

### BCNF (Boyce-Codd)

- Para toda dependencia no trivial `X → Y`, **X debe ser superclave**. 3FN permite excepciones cuando Y es primo; BCNF no.
- Solo aparece con **varias claves candidatas superpuestas**. Ejemplo: tutorías donde cada tutor enseña una sola materia y cada alumno tiene un tutor por materia.

| alumno | materia | tutor |
|---|---|---|
| Ana | Cálculo | Pérez |
| Luis | Cálculo | Pérez |
| Ana | Física | Soto |

- Claves candidatas: `(alumno, materia)` y `(alumno, tutor)`. Existe `tutor → materia`, pero `tutor` no es superclave. Está en 3FN (materia es prima) pero no en BCNF: si Pérez pasa a enseñar Álgebra, hay que actualizar varias filas.
- Descomposición: `tutores(tutor PK, materia)` y `asignaciones(alumno, tutor, PK(alumno, tutor))`.
- **Trade-off**: la descomposición BCNF puede **perder dependencias**; la regla "un alumno tiene un solo tutor por materia" ya no se expresa con un `UNIQUE` simple y requiere trigger o lógica aplicativa. Por eso, en la práctica, 3FN suele ser el objetivo y BCNF se evalúa caso a caso.
- 4FN (dependencias multivaluadas) y 5FN existen; en entrevistas basta saber que tratan combinaciones independientes de atributos multivaluados.

## Desnormalización deliberada

Se desnormaliza para **evitar joins o agregaciones costosas en rutas calientes de lectura**, aceptando complejidad en escrituras. Antes de hacerlo: ¿se probaron índices adecuados, reescritura de la query, caché ([Caching.md](Caching.md)) o réplicas ([ReadReplicas.md](ReadReplicas.md))?

| Técnica | Ejemplo | Consistencia | Costo |
|---|---|---|---|
| **Columna generada** | `total = cantidad * precio` | Garantizada por el motor | Solo misma fila |
| **Contador / agregado** | `posts.comentarios_count` | Trigger o misma transacción | Contención en filas calientes |
| **Vista materializada** | Ventas por día | Obsoleta hasta el `REFRESH` | Refresh completo costoso |
| **Copia de atributo** | `pedidos.cliente_email` | Eventual si se sincroniza async | Actualizaciones en fan-out |
| **JSONB** | Atributos variables de producto | Sin FK; validación limitada | Consultas y updates más caros |
| **Tabla de lectura (CQRS)** | Proyección desde eventos | Eventual | Pipeline adicional ([OutboxCDC.md](OutboxCDC.md)) |

```sql
-- Columna generada (PG 12+): el motor garantiza la consistencia
ALTER TABLE lineas_pedido
  ADD COLUMN subtotal NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED;

-- Contador actualizado atómicamente en la misma transacción
BEGIN;
INSERT INTO comentarios (post_id, autor_id, cuerpo) VALUES (7, 3, 'Buen post');
UPDATE posts SET comentarios_count = comentarios_count + 1 WHERE id = 7;
COMMIT;

-- Vista materializada con refresh sin bloquear lecturas (requiere índice único)
CREATE MATERIALIZED VIEW ventas_diarias AS
SELECT date_trunc('day', p.fecha) AS dia, sum(l.cantidad * l.precio_unitario) AS total
FROM pedidos p JOIN lineas_pedido l USING (pedido_id)
GROUP BY 1;
CREATE UNIQUE INDEX ON ventas_diarias (dia);
REFRESH MATERIALIZED VIEW CONCURRENTLY ventas_diarias;
```

- **Contadores**: una fila muy popular (un post viral) se convierte en punto de contención de locks. Alternativas: contadores por shard (`N` filas sumadas al leer), agregación asíncrona, o aproximaciones.
- **JSONB** es apropiado para atributos realmente variables o documentos que se leen completos; es un mal reemplazo de columnas que se filtran, se unen o necesitan FK. Mejor: columnas relacionales para lo estable + JSONB para lo variable.
- En **OLAP** la desnormalización (esquemas estrella) es la norma, ver [OLTPvsOLAP.md](OLTPvsOLAP.md).
- Regla: toda copia de datos necesita un **dueño** (fuente de verdad) y un **mecanismo de sincronización** explícito.

## Claves naturales vs surrogate

- **Natural**: tiene significado de negocio (RUT, email, ISBN, código de país). **Surrogate**: identificador sin significado generado por el sistema.
- Las claves naturales **cambian** (emails, incluso "identificadores inmutables" por errores de carga), pueden ser anchas y exponen datos. Usar surrogate como PK y la natural con `UNIQUE`.
- Excepciones razonables: tablas de catálogo estables (`ISO 4217` para monedas), tablas de relación N:M con PK compuesta.

| Tipo | Tamaño | Orden | Pros | Contras |
|---|---|---|---|---|
| `SERIAL` / `BIGINT IDENTITY` | 8 B | Secuencial | Compacto, inserts al final del B-tree, excelente localidad | Enumerable (IDOR), requiere coordinación central, conflictos al fusionar bases |
| **UUID v4** | 16 B | Aleatorio | Generable en cliente, sin coordinación, no adivinable | Inserts dispersos: page splits, índices ~2x más grandes, peor caché y más WAL (full page writes) |
| **UUIDv7** | 16 B | Por tiempo (ms) + aleatorio | Generable sin coordinación y casi secuencial en el índice | Filtra el timestamp de creación; 2x más grande que bigint |
| **ULID** | 16 B (26 chars texto) | Por tiempo | Similar a v7, legible y ordenable como texto | No es estándar RFC; guardarlo como texto desperdicia espacio |

- Preferir `GENERATED ALWAYS AS IDENTITY` sobre `SERIAL` en PostgreSQL: es estándar SQL, evita inserts manuales accidentales y los permisos de la secuencia están ligados a la columna.
- Guarda UUIDs en el tipo nativo `uuid` (PG) o `BINARY(16)` (MySQL), nunca como `CHAR(36)`. PostgreSQL 18 incluye `uuidv7()`; en versiones anteriores se genera en la aplicación o con extensión.
- En **InnoDB y SQL Server** el costo de UUID v4 es mayor porque la PK es el clustered index (ver [Indices.md](Indices.md#innodb-mysql-clustered-index-y-por-qué-la-pk-importa)).
- Patrón común: `BIGINT` interno como PK + `uuid` público único para exponer en APIs.
- En sistemas distribuidos o con sharding ([Sharding.md](Sharding.md)), IDs generables sin coordinación (UUIDv7, Snowflake) evitan un cuello de botella central.

## Constraints: la base de datos como última línea de defensa

La validación en la aplicación no basta: hay múltiples servicios, scripts, migraciones y **condiciones de carrera**. Los constraints son declarativos, se verifican atómicamente y son gratis de mantener.

```sql
CREATE TABLE reservas (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sala_id     BIGINT NOT NULL REFERENCES salas(id) ON DELETE RESTRICT,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id),
  periodo     TSTZRANGE NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'ACTIVA'
              CHECK (estado IN ('ACTIVA', 'CANCELADA')),
  monto       NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  codigo      TEXT NOT NULL UNIQUE,
  CHECK (lower(periodo) < upper(periodo)),
  -- Ninguna sala puede tener dos reservas activas superpuestas
  EXCLUDE USING gist (sala_id WITH =, periodo WITH &&) WHERE (estado = 'ACTIVA')
);
-- EXCLUDE con igualdad sobre bigint requiere: CREATE EXTENSION btree_gist;
```

- **NOT NULL**: por defecto en todas las columnas salvo que la ausencia tenga significado. NULL complica consultas (ver [SQLAvanzado.md](SQLAvanzado.md#null-y-lógica-de-tres-valores)).
- **UNIQUE**: la única forma correcta de evitar duplicados bajo concurrencia. Crea un índice.
- **FOREIGN KEY**: integridad referencial. Definir `ON DELETE` conscientemente (`RESTRICT`, `CASCADE`, `SET NULL`). Costo: verificación en cada insert/delete y locks `FOR KEY SHARE` sobre la fila padre. En PG, indexar la columna hija.
- **CHECK**: reglas de la fila (rangos, enums, relaciones entre columnas). No puede consultar otras tablas. En MySQL se respetan solo desde 8.0.16 (antes se ignoraban en silencio).
- **EXCLUDE** (solo PostgreSQL): generaliza UNIQUE a cualquier operador; ideal para solapamiento de rangos (reservas, turnos, vigencias de precios). Sin él, evitar solapamientos requiere `SERIALIZABLE` o locks explícitos ([Transacciones.md](Transacciones.md)).
- **DEFERRABLE INITIALLY DEFERRED**: verifica al `COMMIT`; útil para referencias circulares o intercambios de valores únicos.
- En tablas grandes, agregar constraints sin bloquear: `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID;` y luego `VALIDATE CONSTRAINT` (toma un lock más débil). Ver [Migraciones.md](Migraciones.md).
- Cuándo se omiten FKs: sharding entre bases, tablas de eventos de altísimo volumen, microservicios con bases separadas. Es un trade-off consciente, no una optimización por defecto.

## Soft delete y sus problemas

Patrón: en vez de `DELETE`, marcar `eliminado_en TIMESTAMPTZ NULL`.

- **Problemas**:
  - **Unicidad rota**: `UNIQUE(email)` impide recrear un usuario borrado. Solución: índice único parcial `WHERE eliminado_en IS NULL` (PG/SQL Server); en MySQL, trucos con columnas generadas.
  - **Integridad referencial rota**: las FKs no conocen el soft delete; un pedido puede apuntar a un cliente "borrado", y `ON DELETE CASCADE` no se dispara.
  - **Filtro olvidado**: cada consulta debe incluir `WHERE eliminado_en IS NULL`. Un solo olvido filtra datos borrados (incluso a otros usuarios). Los scopes globales de ORMs ayudan pero se eluden con SQL crudo.
  - **Índices y estadísticas**: filas muertas inflan tablas e índices; los índices deben ser parciales para no degradarse.
  - **Cumplimiento legal**: GDPR/leyes de datos personales exigen borrado real; soft delete no es borrado ([Seguridad.md](Seguridad.md)).
- **Alternativas**:
  - **Tabla de archivo**: mover la fila a `usuarios_eliminados` en la misma transacción (`DELETE ... RETURNING` + `INSERT`).
  - **Auditoría/historial** con triggers o CDC ([OutboxCDC.md](OutboxCDC.md)) y borrado físico en la tabla principal.
  - **Estado de negocio explícito** (`estado = 'CERRADA'`) cuando "borrado" en realidad significa otra cosa.
- Si se usa: vista `usuarios_activos`, índices parciales, y job de purga definitiva tras el período de retención.

```sql
-- Archivar y borrar atómicamente
WITH borrado AS (
  DELETE FROM usuarios WHERE id = 42 RETURNING *
)
INSERT INTO usuarios_eliminados SELECT *, now() FROM borrado;
```

## Preguntas de entrevista

1. **Explica 2FN vs 3FN con un ejemplo.**
   2FN elimina dependencias de parte de una clave compuesta (en `(pedido, producto)`, el nombre del producto depende solo de `producto`). 3FN elimina dependencias entre atributos no clave (`pedido → cliente → email_cliente`).
2. **¿Cuándo una tabla está en 3FN pero no en BCNF, y vale la pena llevarla a BCNF?**
   Cuando hay claves candidatas superpuestas y un determinante que no es superclave (tutor → materia). La descomposición puede perder la dependencia original y obligar a triggers; se evalúa caso a caso.
3. **¿Cuándo desnormalizarías?**
   Cuando una lectura crítica y frecuente paga joins/agregaciones caras, tras agotar índices y reescrituras, y con un mecanismo claro de consistencia: columna generada, actualización en la misma transacción, vista materializada con refresh o proyección por eventos con consistencia eventual aceptada.
4. **¿Guardar `precio_unitario` en la línea del pedido es desnormalizar?**
   No: es un hecho distinto (el precio histórico al momento de la venta). El precio del catálogo puede cambiar sin alterar facturas pasadas.
5. **UUID v4, UUIDv7 o BIGINT como PK?**
   BIGINT IDENTITY si hay una sola base y no se exponen IDs; UUIDv7 si se necesita generar IDs sin coordinación o fusionar datos, manteniendo localidad en el B-tree. UUID v4 como PK degrada índices, sobre todo en motores con clustered index.
6. **¿Por qué no basta con validar unicidad en la aplicación?**
   Dos requests concurrentes pueden pasar el `SELECT` de verificación antes de que cualquiera inserte. Solo un `UNIQUE` (o `EXCLUDE`) lo garantiza atómicamente; la aplicación debe manejar el error de violación.
7. **¿Qué problemas trae el soft delete?**
   Rompe UNIQUE y FKs, obliga a filtrar en cada consulta, infla índices y no cumple borrado legal. Mitigar con índices parciales y vistas, o preferir tabla de archivo/auditoría.
8. **¿Cómo evitas reservas superpuestas de una sala?**
   En PostgreSQL con `EXCLUDE USING gist (sala_id WITH =, periodo WITH &&)`. En otros motores, `SERIALIZABLE` o lock de la fila de la sala (`SELECT ... FOR UPDATE`) antes de insertar.

## Errores comunes

- Guardar listas separadas por comas en una columna.
- Confundir datos históricos con redundancia (precio, dirección de envío).
- Desnormalizar "por performance" sin medir ni definir cómo se mantiene la consistencia.
- Usar el email u otra clave natural mutable como PK.
- Guardar UUIDs como `VARCHAR(36)`.
- Omitir `NOT NULL`, `CHECK` y FKs "porque la aplicación ya valida".
- Implementar soft delete sin índices únicos parciales ni vistas, dejando el filtro a la memoria de cada desarrollador.
- Usar JSONB para columnas que se filtran, se unen o requieren integridad referencial.
