# Optimistic concurrency (control optimista)

## Qué es
- Estrategia que **no bloquea** al leer: asume que los conflictos son raros y los **detecta al escribir**. Si alguien modificó el dato desde que lo leíste, la escritura se rechaza y decides qué hacer (reintentar, fusionar o avisar al usuario).
- Mecanismo general: **compare-and-set (CAS)**. "Escribe X solo si el valor/versión sigue siendo el que leí."
- Contraparte: [10-PessimisticConcurrency.md](10-PessimisticConcurrency.md).

## Flujo
```
1. Leer fila + versión (v=3)
2. Trabajar (ms en un job, minutos en un formulario)
3. UPDATE ... SET ..., version = 4 WHERE id = ? AND version = 3
4. ¿Filas afectadas = 1?  -> éxito
   ¿Filas afectadas = 0?  -> conflicto: otro escribió primero
```

## Implementación en SQL
```sql
ALTER TABLE documentos ADD COLUMN version integer NOT NULL DEFAULT 0;

-- Leer
SELECT id, titulo, cuerpo, version FROM documentos WHERE id = 42;

-- Escribir
UPDATE documentos
SET titulo = $1, cuerpo = $2, version = version + 1
WHERE id = 42 AND version = $versionLeida
RETURNING version;   -- nueva versión para el cliente
```
- El `UPDATE` toma el lock de fila durante un instante: si dos tx llegan juntas, la segunda espera, y al re-evaluar el `WHERE` (Read Committed en Postgres/MySQL) ve `version = 4` y afecta 0 filas. Correcto sin locks largos.
- Funciona en **Read Committed**; no necesitas subir el nivel de aislamiento.

### ¿Qué usar como versión?

| Opción | Pros | Contras |
|---|---|---|
| Entero incremental | Simple, exacto, portable | Una columna más |
| `updated_at` timestamp | Ya existe | Dos updates en el mismo tick de reloj; relojes distintos entre servidores; precisión truncada por el driver/JSON |
| Hash del contenido | No requiere columna | Costo de calcular; ABA si el contenido vuelve al mismo valor (a veces aceptable) |
| `rowversion` (SQL Server) | Automático, lo mantiene el motor | Específico de SQL Server |
| `xmin` (Postgres) | Automático, cambia en cada update | Columna de sistema; cambia también con `VACUUM FREEZE`/reescrituras; no portable |

- Recomendación: **entero** (`version`).

## Implementación en código
```ts
class ConflictError extends Error {}

async function guardarDocumento(id: number, cambios: Cambios, versionLeida: number) {
  const { rows, rowCount } = await pool.query(
    `UPDATE documentos
     SET titulo = $1, cuerpo = $2, version = version + 1
     WHERE id = $3 AND version = $4
     RETURNING version`,
    [cambios.titulo, cambios.cuerpo, id, versionLeida],
  );
  if (rowCount === 0) {
    // Distinguir "no existe" de "conflicto" si hace falta
    throw new ConflictError(`Documento ${id} modificado por otro usuario`);
  }
  return rows[0].version;
}
```

### Reintento automático (procesos sin humano)
```ts
async function conReintentoOptimista<T>(fn: () => Promise<T>, max = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();                    // fn relee, recalcula y escribe con CAS
    } catch (e) {
      if (!(e instanceof ConflictError) || i >= max) throw e;
      await sleep(Math.random() * 20 * 2 ** i);   // backoff con jitter
    }
  }
}
```
- Reintenta **leyendo de nuevo**: la versión y los datos viejos ya no sirven.
- Con humano de por medio, **no** reintentes a ciegas: devuelve el conflicto y deja que el usuario decida (o fusiona campo por campo si los cambios no se pisan).

## En HTTP: ETag + If-Match
```http
GET /documentos/42
200 OK
ETag: "7"

PUT /documentos/42
If-Match: "7"
Content-Type: application/json
{ "titulo": "Nuevo" }

-> 200 OK, ETag: "8"             (versión coincidía)
-> 412 Precondition Failed       (otro lo cambió)
```
- `412` es la respuesta semántica para `If-Match` fallido; muchas APIs usan `409 Conflict` cuando la versión viaja en el body.
- Puedes exigir `If-Match` y responder `428 Precondition Required` si falta.

## En ORMs y bases NoSQL

| Tecnología | Cómo |
|---|---|
| JPA / Hibernate | `@Version` → agrega `AND version = ?` al update; lanza `OptimisticLockException` (Spring: `ObjectOptimisticLockingFailureException`) |
| EF Core | `[ConcurrencyCheck]` o `[Timestamp]` (`rowversion`); lanza `DbUpdateConcurrencyException`. Npgsql puede mapearlo a `xmin` |
| Sequelize | `version: true` en el modelo; lanza `OptimisticLockError` |
| TypeORM | `@VersionColumn` **solo incrementa**: `save()` no agrega la versión al `WHERE`. Hazlo manual con `update({ id, version }, {...})` y revisa `affected` |
| Prisma | Sin soporte nativo: `updateMany({ where: { id, version }, data: { ..., version: { increment: 1 } } })` y verificar `count` |
| MongoDB | `updateOne({ _id, version: v }, { $set: {...}, $inc: { version: 1 } })` → `matchedCount === 0` = conflicto |
| DynamoDB | `ConditionExpression: "version = :v"` → `ConditionalCheckFailedException` |
| Redis | `WATCH clave` + `MULTI/EXEC`: `EXEC` devuelve `nil` si la clave cambió |
| Elasticsearch | `if_seq_no` + `if_primary_term` → 409 |

```ts
// Prisma
const { count } = await prisma.documento.updateMany({
  where: { id, version: versionLeida },
  data: { titulo, version: { increment: 1 } },
});
if (count === 0) throw new ConflictError();

// TypeORM (manual, porque save() no chequea)
const res = await repo.update({ id, version: versionLeida }, { titulo, version: versionLeida + 1 });
if (res.affected === 0) throw new ConflictError();
```

## Cuándo usarlo

| Úsalo cuando | Evítalo cuando |
|---|---|
| Los conflictos son raros | Muchas escrituras concurrentes a la misma fila (tasa de reintentos explota) |
| Hay "tiempo de pensar" (formularios, edición colaborativa simple) | La operación cabe en un update atómico (`stock = stock - 1`): es más simple |
| Datos que viajan fuera de la DB (APIs, cache, clientes móviles offline) | El trabajo entre leer y escribir es caro y no se puede repetir |
| Sistemas sin locks (DynamoDB, APIs REST, Mongo) | Hay efectos externos que no puedes deshacer si luego hay conflicto |

- Con contención alta, optimista puede ser **peor** que pesimista: cada conflicto desperdicia todo el trabajo hecho, y el que pierde puede seguir perdiendo (starvation).

## Limitaciones
- Protege **una fila/documento**. Invariantes entre varias filas (write skew) requieren incluir en la condición todas las versiones leídas, un agregado raíz con versión (DDD: la versión vive en el aggregate root), o Serializable.
- `DELETE` también debe llevar la versión: `DELETE FROM documentos WHERE id = $1 AND version = $2`.
- Si otras rutas de código actualizan la fila **sin** incrementar la versión, el mecanismo se rompe en silencio. Un trigger puede forzarlo:
```sql
CREATE FUNCTION bump_version() RETURNS trigger AS $$
BEGIN NEW.version := OLD.version + 1; RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER documentos_version BEFORE UPDATE ON documentos
FOR EACH ROW EXECUTE FUNCTION bump_version();
-- La app sigue filtrando WHERE version = $leida; el trigger incrementa siempre
```

## Preguntas de entrevista
1. **¿Qué es el control optimista?** No bloquear al leer y verificar al escribir que el dato no cambió (versión en el `WHERE`); si cambió, rechazar.
2. **¿Cómo detectas el conflicto?** Filas afectadas = 0 en el `UPDATE ... WHERE version = ?`.
3. **¿Por qué no usar `updated_at` como versión?** Colisiones en el mismo instante, relojes desincronizados y pérdida de precisión en serialización.
4. **¿Cómo se expone en una API REST?** `ETag` en el GET, `If-Match` en el PUT/PATCH, `412` si no coincide.
5. **¿Cuándo es mala idea?** Con alta contención sobre la misma fila o cuando rehacer el trabajo es caro.
6. **¿TypeORM `@VersionColumn` evita lost updates?** No por sí solo: incrementa la versión pero `save()` no la incluye en el `WHERE`.

## Errores comunes
- Leer la versión, pero no incluirla en el `WHERE`.
- No revisar filas afectadas.
- Reintentar sin releer los datos.
- Rutas de código (scripts, jobs, SQL manual) que actualizan sin tocar la versión.
- Usar optimista en contadores calientes en vez de un update atómico.
