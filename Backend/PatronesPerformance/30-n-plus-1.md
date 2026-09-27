# N+1 Query Problem

Anti-patrón donde se ejecuta **1 query** para traer una lista y luego **N queries adicionales**, una por cada elemento, para traer sus datos relacionados.

```
1 query:  SELECT * FROM posts LIMIT 100;           → 100 posts
N queries: SELECT * FROM users WHERE id = 1;
           SELECT * FROM users WHERE id = 2;
           ...
           SELECT * FROM users WHERE id = 100;
Total: 101 queries (y 101 round trips de red)
```

**Por qué es tan caro:** cada query individual es rápida (~1 ms), pero el costo dominante es el **round trip**. 100 round trips × 1-2 ms = 100-200 ms solo en esperar la red, además de ocupar una conexión del pool todo ese tiempo.

**Por qué es traicionero:**
- En desarrollo, con 5 filas, no se nota.
- En producción, con 500 filas, el endpoint pasa de 20 ms a 1 s.
- El código se ve limpio: el ORM esconde las queries.

---

## 🔴 Cómo aparece

### ORM con lazy loading (Sequelize / TypeORM / ActiveRecord)

```javascript
// ❌ Sequelize
const posts = await Post.findAll({ limit: 100 });
for (const post of posts) {
  const author = await post.getAuthor(); // 1 query por post
  console.log(post.title, author.name);
}
```

```ruby
# ❌ Rails
@posts = Post.limit(100)
# en la vista:
@posts.each { |post| post.author.name }  # 1 query por post
```

### Código "a mano" con await en un loop

```javascript
// ❌
const orders = await db.query('SELECT * FROM orders WHERE status = $1', ['pending']);
for (const order of orders.rows) {
  order.customer = (await db.query('SELECT * FROM customers WHERE id = $1', [order.customer_id])).rows[0];
}
```

### GraphQL (resolvers por campo)

```javascript
// ❌ El resolver de "author" se ejecuta una vez por cada post
const resolvers = {
  Query: { posts: () => db.post.findMany({ take: 100 }) },
  Post: {
    author: (post) => db.user.findUnique({ where: { id: post.authorId } }),
  },
};
```

### Llamadas HTTP entre microservicios

El mismo problema pero peor: `GET /orders` y luego `GET /users/:id` por cada orden. Cada round trip cuesta decenas de ms.

---

## ✅ Soluciones

### 1️⃣ Eager loading (JOIN o query con IN)

```javascript
// ✅ Sequelize: 1 query con JOIN
const posts = await Post.findAll({
  limit: 100,
  include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
});
```

```javascript
// ✅ Prisma: 2 queries (posts + users WHERE id IN (...))
const posts = await prisma.post.findMany({
  take: 100,
  include: { author: { select: { id: true, name: true } } },
});
```

```ruby
# ✅ Rails
@posts = Post.includes(:author).limit(100)
# preload → 2 queries con IN
# eager_load → 1 query con LEFT JOIN
```

```csharp
// ✅ EF Core
var posts = await db.Posts
    .Include(p => p.Author)
    .Take(100)
    .ToListAsync();
```

Ver [Eager Loading Pattern](03-eager-loading-pattern.md).

### 2️⃣ Batch manual con IN + Map

```javascript
// ✅ 2 queries en total, sin importar N
const orders = (await db.query('SELECT * FROM orders WHERE status = $1', ['pending'])).rows;

const customerIds = [...new Set(orders.map((o) => o.customer_id))];
const customers = (await db.query('SELECT * FROM customers WHERE id = ANY($1)', [customerIds])).rows;

const byId = new Map(customers.map((c) => [c.id, c]));
for (const order of orders) {
  order.customer = byId.get(order.customer_id);
}
```

### 3️⃣ DataLoader (GraphQL y resolvers)

Agrupa todas las llamadas `load(id)` que ocurren en el mismo tick del event loop en **una sola** query, y cachea por request.

```javascript
const DataLoader = require('dataloader');

function createLoaders() {
  return {
    userById: new DataLoader(async (ids) => {
      const users = await db.user.findMany({ where: { id: { in: [...ids] } } });
      const byId = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => byId.get(id) ?? null); // mismo orden que ids
    }),
  };
}

// Un set de loaders NUEVO por request (la cache no debe compartirse entre usuarios)
const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Post: {
      author: (post, _, ctx) => ctx.loaders.userById.load(post.authorId),
    },
  },
  context: () => ({ loaders: createLoaders() }),
});
```

Resultado: 100 posts → 1 query de posts + 1 query de users.

### 4️⃣ Endpoints batch entre servicios

```
❌ GET /users/1, GET /users/2, ... GET /users/100
✅ GET /users?ids=1,2,...,100   o   POST /users/batch
```

---

## ⚠️ Cuidado con la solución

| Riesgo | Detalle |
|---|---|
| **Sobre-fetching** | `include` de todo trae columnas y relaciones que no usas |
| **Explosión cartesiana** | JOIN de varias relaciones 1:N multiplica filas (post × comments × tags). Mejor queries separadas con IN (`preload`, `AsSplitQuery()` en EF Core) |
| **IN gigantes** | `IN` con 50.000 ids es lento; paginar primero |
| **Cache de DataLoader global** | Filtra datos entre usuarios y nunca invalida; crear por request |

---

## 🔍 Cómo detectarlo

- **Logs de queries en desarrollo**: ver la misma query repetida con distinto id.
- **Contar queries por request** y alertar si supera un umbral.
- **APM / tracing**: un trace con 100 spans de DB idénticos en fila es inconfundible.
- **Herramientas específicas**:
  - Rails: gem `bullet`
  - Django: `django-debug-toolbar`, `nplusone`
  - .NET: MiniProfiler, logs de EF Core
  - Node: logs de Prisma/Sequelize + tracing con OpenTelemetry
- **Tests**: asegurar el número de queries de un endpoint.

```javascript
// Test: el endpoint no debe hacer más de 3 queries
let count = 0;
prisma.$on('query', () => count++);
await request(app).get('/posts');
expect(count).toBeLessThanOrEqual(3);
```

---

## 🎯 Mejores Prácticas

✅ Nunca `await` a la DB dentro de un loop sobre resultados de otra query
✅ Eager loading explícito de las relaciones que la vista/respuesta usa
✅ `select` solo los campos necesarios de la relación
✅ Queries separadas con IN cuando hay varias relaciones 1:N
✅ DataLoader por request en GraphQL
✅ Endpoints batch entre microservicios
✅ Monitorear queries por request en APM

---

## 🔗 Relación con Otros Patrones

- **Eager Loading**: la solución principal
- **Lazy Loading**: la causa habitual cuando se usa sin cuidado
- **Batch Processing**: mismo principio, agrupar operaciones
- **Database Latency**: el N+1 es una de sus causas más frecuentes
- **Caching**: mitiga pero no corrige; mejor arreglar la query

---

**Nivel de Dificultad:** ⭐⭐ Intermedio
