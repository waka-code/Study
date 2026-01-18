# Performance Backend

## Optimización de consultas
- Usa índices, evita N+1 queries, selecciona solo los campos necesarios.

### Ejemplo (SQL)
```sql
SELECT nombre FROM usuarios WHERE email = 'ana@email.com';
```

---

## Caching
- Guarda resultados de operaciones costosas para responder más rápido.

### Ejemplo (Node.js + Redis)
```js
const redis = require('redis').createClient();
async function getUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  const user = await db.getUser(id);
  await redis.set(`user:${id}`, JSON.stringify(user));
  return user;
}
```

---

## Concurrencia y asincronía
- Usa workers, colas o threads para tareas pesadas.

### Ejemplo (Node.js)
```js
const { Worker } = require('worker_threads');
new Worker('./tareaPesada.js');
```

---

## Paginación
- Divide grandes resultados en páginas para reducir carga y latencia.

### Ejemplo (SQL)
```sql
SELECT * FROM productos LIMIT 10 OFFSET 20;
```
