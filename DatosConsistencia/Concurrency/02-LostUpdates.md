# Lost updates

## Qué es
- Dos transacciones leen el mismo valor, cada una calcula un valor nuevo a partir de él y escriben. La segunda escritura **pisa** a la primera sin haberla visto: un cambio se pierde en silencio.
- Es la race condition más frecuente en backends con ORM, porque el patrón natural del ORM (`load → modificar objeto → save`) es exactamente read-modify-write.

```sql
-- stock inicial = 10
-- T1                                        -- T2
BEGIN;                                       BEGIN;
SELECT stock FROM productos WHERE id = 7;    
-- 10                                        SELECT stock FROM productos WHERE id = 7;
                                             -- 10
UPDATE productos SET stock = 9 WHERE id = 7;
COMMIT;
                                             UPDATE productos SET stock = 9 WHERE id = 7;
                                             COMMIT;
-- Se vendieron 2 unidades, stock = 9
```
- Nadie lanzó error. No hubo dirty read: T2 leyó un valor confirmado. El problema es que **decidió** con un valor que quedó obsoleto antes de escribir.

## Variantes que no parecen lost updates

### Guardar la entidad completa
```ts
// Request A: cambia el precio       // Request B: cambia la descripción
const p = await repo.findOne(7);     const p = await repo.findOne(7);
p.precio = 1990;                     p.descripcion = 'Nueva';
await repo.save(p);                  await repo.save(p);
// Si el ORM escribe TODAS las columnas, B restaura el precio viejo.
```
- Hibernate: `@DynamicUpdate` hace que solo se escriban las columnas modificadas. TypeORM y Prisma escriben solo lo cambiado en `save`/`update`, pero el problema vuelve si reconstruyes la entidad desde el body del request y la guardas entera.

### Documentos / JSON
```sql
-- Leer el JSON, agregar un tag en la app y reescribir el documento entero
UPDATE articulos SET meta = $1 WHERE id = 5;   -- ❌ pisa tags agregados por otros

-- Modificar en la base
UPDATE articulos
SET meta = jsonb_set(meta, '{tags}', (meta->'tags') || to_jsonb($1::text))
WHERE id = 5;                                   -- ✅ atómico sobre la fila
```
- En MongoDB lo mismo: `$set` de un documento entero vs `$inc`, `$push`, `$addToSet`.

### HTTP PUT sin precondición
- Dos usuarios abren el mismo formulario, editan y guardan. El último gana y el primero pierde su trabajo. Se resuelve con `ETag` + `If-Match` (ver [09-OptimisticConcurrency.md](09-OptimisticConcurrency.md)).

### Contadores en caché
- `GET contador` → `+1` en la app → `SET contador`. Usa `INCR` en Redis.

## Qué hace cada motor

| Motor / nivel | ¿Lost update con leer-calcular-escribir? |
|---|---|
| Postgres Read Committed (default) | **Sí**, se pierde en silencio |
| Postgres Repeatable Read | No: la segunda tx falla con `40001 could not serialize access due to concurrent update` |
| Postgres Serializable | No: `40001` |
| MySQL InnoDB Repeatable Read (default) | **Sí**: el `UPDATE` hace *current read* sobre la última versión confirmada y no detecta que tu `SELECT` quedó obsoleto |
| MySQL Serializable | No, pero porque los `SELECT` toman locks compartidos → deadlocks frecuentes |
| SQL Server Read Committed (default) | **Sí** |
| SQL Server `SNAPSHOT` | No: error **3960** (update conflict) |
| Oracle Read Committed | **Sí**; en `SERIALIZABLE` falla con `ORA-08177` |

- Conclusión: **no confíes en el nivel de aislamiento por defecto** para evitarlo. En los defaults de los cuatro motores principales el lost update ocurre.

## Soluciones

### 1. Update atómico (la mejor cuando cabe en SQL)
```sql
UPDATE productos SET stock = stock - 1
WHERE id = 7 AND stock >= 1
RETURNING stock;
```
- El `UPDATE` toma el lock de fila; si otra tx modificó la fila, espera, y en Read Committed de Postgres **re-evalúa el `WHERE`** sobre la versión nueva (EvalPlanQual). No hay sobreventa.
- Siempre revisa filas afectadas: 0 filas significa "no se cumplió la condición".

### 2. Compare-and-set / versión (optimista)
```sql
UPDATE productos SET stock = $nuevo, version = version + 1
WHERE id = 7 AND version = $versionLeida;
-- 0 filas -> conflicto: recargar y reintentar
```
- Útil cuando la lógica entre leer y escribir es compleja o vive en la app, o hay tiempo humano de por medio.

### 3. Lock pesimista
```sql
BEGIN;
SELECT stock, reservado FROM productos WHERE id = 7 FOR UPDATE;
-- lógica en la app con los valores bloqueados
UPDATE productos SET stock = $1, reservado = $2 WHERE id = 7;
COMMIT;
```
- La segunda tx espera en el `SELECT ... FOR UPDATE` y lee el valor ya actualizado.

### 4. Subir el aislamiento (solo Postgres/SQL Server snapshot)
```ts
// Repeatable Read en Postgres convierte el lost update en error reintentable
await conTransaccion(async (c) => {
  const { rows } = await c.query('SELECT stock FROM productos WHERE id = 7');
  await c.query('UPDATE productos SET stock = $1 WHERE id = 7', [rows[0].stock - 1]);
}, 'REPEATABLE READ'); // con reintento ante 40001
```
- Requiere lógica de reintento. En MySQL **no** sirve (ver tabla).

### En ORMs
```ts
// TypeORM: incremento atómico
await repo.decrement({ id: 7 }, 'stock', 1);

// Prisma: operaciones atómicas
await prisma.producto.update({
  where: { id: 7 },
  data: { stock: { decrement: 1 } },
});

// Prisma: condicional atómico (0 filas = sin stock)
const { count } = await prisma.producto.updateMany({
  where: { id: 7, stock: { gte: 1 } },
  data: { stock: { decrement: 1 } },
});
```

## Cómo elegir

| Situación | Solución |
|---|---|
| La operación es aritmética o condicional simple | Update atómico |
| Formulario / edición humana | Optimista (versión + 409) |
| Lógica compleja, contención alta, sección corta | `FOR UPDATE` |
| Muchas tablas y reglas, en Postgres | Repeatable Read/Serializable + reintentos |
| Una fila recibe miles de escrituras/s | Contadores fragmentados o agregación en Redis (hot row) |

## Preguntas de entrevista
1. **¿Qué es un lost update y por qué no lo evita Read Committed?** Read Committed solo garantiza leer datos confirmados; no impide que tu decisión se base en un valor que otra tx cambia antes de que escribas.
2. **¿MySQL Repeatable Read evita lost updates?** No. Los `SELECT` leen del snapshot pero `UPDATE` hace current read, así que no hay detección de conflicto.
3. **¿Postgres Repeatable Read?** Sí: si intentas modificar una fila cambiada después de tu snapshot, aborta con 40001.
4. **¿Cómo lo resuelves con un ORM?** Operaciones atómicas (`increment`, `{ decrement: 1 }`), versión optimista o lock pesimista explícito; nunca `find → modificar → save` sin protección.
5. **¿Diferencia con write skew?** En el lost update ambas tx escriben la **misma** fila; en write skew escriben filas **distintas** y la invariante se rompe entre ellas.

## Errores comunes
- `entity.stock -= 1; save()` sin versión ni lock.
- Reconstruir la entidad completa desde el body del request y guardarla.
- Asumir que "la transacción" lo evita: `BEGIN/COMMIT` en Read Committed no cambia nada.
- Usar `updated_at` con precisión de segundos como versión (dos updates en el mismo segundo no se distinguen).
- No verificar filas afectadas en el update condicional.
