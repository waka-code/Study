# Race conditions

## Qué es
- Una **race condition** ocurre cuando el resultado depende del **orden o del timing** en que se intercalan operaciones concurrentes, y algún intercalado produce un resultado incorrecto.
- No es un bug de la base de datos: es un bug de **diseño**. Funciona en local (1 usuario) y falla en producción (N requests, N instancias, N workers).
- Todas las demás anomalías de esta carpeta (lost update, dirty read, phantom, write skew) son **casos particulares** de race conditions sobre datos compartidos.

### Race condition vs data race
| | Race condition | Data race |
|---|---|---|
| Nivel | Lógica / semántica | Memoria |
| Definición | El resultado depende del intercalado | Dos hilos acceden a la misma posición de memoria sin sincronizar y al menos uno escribe |
| Ejemplo | Dos requests reservan el último asiento | Dos threads hacen `counter++` sobre la misma variable |
| ¿Se da en Node? | **Sí** (entre `await`s) | No (un solo hilo JS), salvo `SharedArrayBuffer`/workers |

- Puedes tener race conditions sin data races (todo sincronizado a bajo nivel, pero la lógica sigue mal) y viceversa.

## Los dos patrones culpables

### 1. Check-then-act (TOCTOU: time-of-check to time-of-use)
Verificas una condición y luego actúas asumiendo que sigue siendo cierta.
```ts
// ❌ Dos requests simultáneos con el mismo email pasan el check
const existe = await db.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
if (existe.rowCount === 0) {
  await db.query('INSERT INTO usuarios (email) VALUES ($1)', [email]); // duplicado
}
```
```sql
-- ✅ Que la base haga cumplir la regla
ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_uq UNIQUE (email);

INSERT INTO usuarios (email) VALUES ($1)
ON CONFLICT (email) DO NOTHING
RETURNING id;          -- 0 filas = ya existía
```
- Regla: si una invariante se puede expresar como **constraint** (`UNIQUE`, `CHECK`, `FK`, `EXCLUDE`), exprésala ahí. El constraint no tiene race conditions.

### 2. Read-modify-write
Lees un valor, lo transformas en la app y escribes el resultado absoluto.
```ts
// ❌ Dos requests leen stock=10 y ambos escriben 9
const { rows } = await db.query('SELECT stock FROM productos WHERE id = $1', [id]);
await db.query('UPDATE productos SET stock = $1 WHERE id = $2', [rows[0].stock - 1, id]);
```
```sql
-- ✅ Update atómico: el cálculo ocurre bajo el lock de fila
UPDATE productos SET stock = stock - 1 WHERE id = $1 AND stock > 0 RETURNING stock;
```
- Este caso tiene nombre propio: [Lost update](02-LostUpdates.md).

## Race conditions en Node.js (sí, aunque sea single-thread)
El event loop no te protege: cada `await` es un punto donde otro request puede ejecutarse.
```ts
// ❌ Cache en memoria: 100 requests concurrentes con cache vacío = 100 queries
const cache = new Map<string, Usuario>();

async function getUsuario(id: string) {
  if (!cache.has(id)) {
    const u = await db.findUsuario(id);   // <- aquí se intercalan los demás
    cache.set(id, u);
  }
  return cache.get(id)!;
}

// ✅ Guardar la promesa, no el valor (request coalescing / singleflight)
const enVuelo = new Map<string, Promise<Usuario>>();

function getUsuarioSeguro(id: string) {
  let p = enVuelo.get(id);
  if (!p) {
    p = db.findUsuario(id).finally(() => enVuelo.delete(id));
    enVuelo.set(id, p);
  }
  return p;
}
```
- Esto solo sirve **dentro de un proceso**. Con varias instancias (Kubernetes, PM2 cluster, lambdas) el estado en memoria no se comparte: la coordinación tiene que vivir en la base, en Redis o en un broker.
- La versión distribuida del mismo problema es el **cache stampede** (ver [../Caching.md](../Caching.md)).

## Escenarios clásicos

| Escenario | Race | Solución típica |
|---|---|---|
| Registro de usuario | Dos altas con el mismo email | `UNIQUE` + `ON CONFLICT` |
| Doble click en "Pagar" | Dos cobros | Clave de idempotencia con `UNIQUE` |
| Último asiento/stock | Sobreventa | Update atómico con condición, o `FOR UPDATE` |
| Reservas de sala | Dos reservas solapadas | `EXCLUDE USING gist` (ver [05-PhantomReads.md](05-PhantomReads.md)) |
| Cron en N instancias | Se ejecuta N veces | Advisory lock / lock distribuido con lease |
| Worker de colas | Dos workers toman el mismo job | `FOR UPDATE SKIP LOCKED` |
| Saldo mínimo / guardias | Invariante sobre varias filas | `SERIALIZABLE` o materializar el conflicto |
| Cache vacío | Stampede sobre la DB | Singleflight, lock de recomputación, stale-while-revalidate |

### Idempotencia contra el doble submit
```sql
CREATE TABLE pagos (
  id               bigserial PRIMARY KEY,
  idempotency_key  text NOT NULL UNIQUE,
  pedido_id        bigint NOT NULL,
  monto            numeric(12,2) NOT NULL,
  creado_en        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO pagos (idempotency_key, pedido_id, monto)
VALUES ($1, $2, $3)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id;   -- 0 filas: ya se procesó, devuelve el resultado anterior
```
- El cliente genera la clave (UUID) una vez por intento lógico y la reenvía en cada reintento (`Idempotency-Key` header, como hace Stripe).

## Locks distribuidos (cuando la DB no alcanza)
```ts
// Redis: SET NX con expiración (lease)
const token = crypto.randomUUID();
const ok = await redis.set(`lock:factura:${clienteId}`, token, 'PX', 30_000, 'NX');
if (!ok) return; // otro proceso lo tiene

try {
  await procesarFactura(clienteId);
} finally {
  // Liberar solo si sigue siendo mío (script atómico)
  await redis.eval(
    `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`,
    1, `lock:factura:${clienteId}`, token,
  );
}
```
- Problema: si el proceso se pausa (GC, red) más que el TTL, el lock expira, otro lo toma, y **ambos creen tenerlo**.
- Solución robusta: **fencing token**. El servicio de locks entrega un número monotónico creciente y el recurso protegido rechaza escrituras con un token menor al último visto. Sin fencing, un lock distribuido es una optimización ("casi siempre uno solo"), no una garantía de corrección (crítica de Kleppmann a Redlock).
- Si el recurso ya está en Postgres, suele ser más simple y seguro un `pg_advisory_xact_lock` o un `FOR UPDATE` sobre una fila de control.

## Cómo encontrarlas
- **Test de concurrencia** directo: dispara N operaciones a la vez contra una base real (no mocks) y verifica la invariante.
```ts
it('no sobrevende', async () => {
  await seedProducto({ id: 7, stock: 5 });
  const resultados = await Promise.allSettled(
    Array.from({ length: 20 }, () => comprar(7)),
  );
  const exitos = resultados.filter(r => r.status === 'fulfilled').length;
  expect(exitos).toBe(5);
  expect(await getStock(7)).toBe(0);
});
```
- Usa **conexiones distintas** (pool con varios clientes); si todo va por una conexión, se serializa y el test pasa en falso.
- Carga con `pgbench`, k6 o `autocannon`; inyecta `pg_sleep()` o delays artificiales entre el check y el act para ensanchar la ventana.
- Revisa código buscando `SELECT` seguido de `INSERT/UPDATE` basado en el resultado sin lock, versión ni constraint.

## Escalera de soluciones (de más simple a más compleja)
1. **Constraint** (`UNIQUE`, `CHECK`, `EXCLUDE`, FK).
2. **Operación atómica** en una sola sentencia (`UPDATE ... SET x = x - 1 WHERE ...`, `INSERT ... ON CONFLICT`).
3. **Control optimista** con columna de versión ([09-OptimisticConcurrency.md](09-OptimisticConcurrency.md)).
4. **Lock pesimista** (`FOR UPDATE`, advisory lock) ([10-PessimisticConcurrency.md](10-PessimisticConcurrency.md)).
5. **Nivel de aislamiento** más alto (`SERIALIZABLE`) + reintentos ([06-Isolation.md](06-Isolation.md)).
6. **Serializar por diseño**: una cola/partición por entidad (un solo consumidor por `cliente_id`, actor model).

## Preguntas de entrevista
1. **¿Qué es una race condition?** Un bug donde el resultado depende del intercalado de operaciones concurrentes. Los patrones típicos son check-then-act y read-modify-write.
2. **¿Node puede tener race conditions si es single-thread?** Sí: cada `await` cede el control. Y con varias instancias el problema se traslada a los datos compartidos.
3. **¿Cómo evitas usuarios duplicados?** Constraint `UNIQUE` e `INSERT ... ON CONFLICT`. Un `SELECT` previo nunca es suficiente.
4. **¿Cómo evitas el doble cobro?** Clave de idempotencia persistida con `UNIQUE` y respuesta cacheada del primer intento.
5. **¿Es seguro un lock en Redis?** Como optimización sí; para corrección necesitas fencing tokens, porque un lease puede expirar mientras el dueño sigue trabajando.

## Errores comunes
- Validar unicidad solo en la aplicación.
- Tests de concurrencia con una sola conexión o con mocks.
- Locks en memoria (`Mutex`, `Map`) creyendo que protegen entre instancias.
- Locks distribuidos con TTL sin fencing para operaciones que deben ser exactamente-una-vez.
- Arreglar la race con `setTimeout`/delays ("ya casi no pasa").
