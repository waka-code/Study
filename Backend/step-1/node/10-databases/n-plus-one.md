# Problema N+1 Query

## Qué es N+1

Hacer 1 query principal + N queries adicionales:

```javascript
// ❌ PROBLEMA N+1: 1 + 100 = 101 queries
const users = await User.findAll(); // Query 1

for (const user of users) {
  user.posts = await Post.findAll({
    where: { userId: user.id }
  }); // Query 2, 3, 4, ... N+1
}

// Resultado: 101 queries para 100 usuarios
```

## Soluciones

### 1. Eager Loading (Include)

Cargar relaciones en la query principal:

```javascript
// ✅ BIEN: 1 query con JOIN
const users = await User.findAll({
  include: [
    {
      association: 'posts', // Nombre de la relación
      attributes: ['id', 'title'] // Seleccionar columnas
    }
  ]
});

// Resultado: users[0].posts ya tiene los posts
```

### 2. Lazy Loading Explícito

Cargar después pero en batch:

```javascript
// ✅ BIEN: 2 queries en total
const users = await User.findAll();

// Cargar TODOS los posts de TODOS los usuarios
const postsByUser = await Post.findAll({
  where: {
    userId: users.map(u => u.id) // IN (id1, id2, ...)
  }
});

// Asociar manualmente
const userPostMap = {};
for (const post of postsByUser) {
  if (!userPostMap[post.userId]) {
    userPostMap[post.userId] = [];
  }
  userPostMap[post.userId].push(post);
}

for (const user of users) {
  user.posts = userPostMap[user.id] || [];
}
```

### 3. DataLoader (Batch + Cache)

```javascript
const DataLoader = require('dataloader');

// Batch loader
const userLoader = new DataLoader(async (userIds) => {
  const posts = await Post.findAll({
    where: { userId: userIds }
  });

  // Agrupar por usuario
  const postsByUser = {};
  for (const post of posts) {
    if (!postsByUser[post.userId]) {
      postsByUser[post.userId] = [];
    }
    postsByUser[post.userId].push(post);
  }

  // Retornar en el mismo orden
  return userIds.map(id => postsByUser[id] || []);
});

// Uso
const user = await User.findByPk(1);
const posts = await userLoader.load(user.id); // Batched automáticamente
```

## Tipos de Relaciones

### One-to-Many

```javascript
// User has many Posts
User.hasMany(Post, { foreignKey: 'userId' });
Post.belongsTo(User, { foreignKey: 'userId' });

// Eager load
const users = await User.findAll({
  include: ['Posts'] // O { association: 'Posts' }
});
```

### Many-to-Many

```javascript
// User has many Tags through UserTag
User.belongsToMany(Tag, {
  through: 'UserTag',
  foreignKey: 'userId',
  otherKey: 'tagId'
});

// Eager load
const users = await User.findAll({
  include: [{ association: 'Tags' }]
});
```

### Nested Include (Profundo)

```javascript
// ❌ MAL: Nested N+1
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
  for (const post of user.posts) {
    post.comments = await Comment.findAll({ where: { postId: post.id } });
  }
}

// ✅ BIEN: Eager load anidado
const users = await User.findAll({
  include: [
    {
      association: 'Posts',
      include: [
        { association: 'Comments' }
      ]
    }
  ]
});
```

## Prisma (Mejor DX)

```javascript
// ✅ BIEN: Automático
const users = await prisma.user.findMany({
  include: {
    posts: {
      select: { id: true, title: true },
      where: { published: true }
    }
  }
});

// Select solo campos necesarios
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: { select: { title: true } }
  }
});
```

## Detectar N+1

### Logging de Queries

```javascript
// Sequelize
sequelize.options.logging = (sql) => {
  console.log('[SQL]', sql);
};

// Knex
knex.on('query', (query) => {
  console.log('[SQL]', query.sql);
});
```

### Herramientas

```javascript
// npm install query-counter
const queryCounter = require('query-counter');

app.use(queryCounter.middleware);

app.get('/users', async (req, res) => {
  const count = req.queryCounter.count;
  console.log(`Request made ${count} queries`);
  res.json({ queryCount: count });
});
```

## Casos Reales

### Caso 1: Listar posts con autor

```javascript
// ❌ MAL: 1 + 10 queries
const posts = await Post.findAll({ limit: 10 });
for (const post of posts) {
  post.author = await User.findByPk(post.userId);
}

// ✅ BIEN: 1 query
const posts = await Post.findAll({
  include: [{ association: 'Author' }],
  limit: 10
});
```

### Caso 2: Dashboard con estadísticas

```javascript
// ❌ MAL: Múltiples queries
const user = await User.findByPk(userId);
const posts = await Post.findAll({ where: { userId } });
const comments = await Comment.findAll({ where: { userId } });
const followers = await User.findAll({
  include: [{
    association: 'Following',
    where: { id: userId }
  }]
});

// ✅ BIEN: Optimizado
const user = await User.findByPk(userId, {
  include: [
    { association: 'Posts', attributes: ['id', 'title'] },
    { association: 'Comments', attributes: ['id', 'content'] },
    { association: 'Followers', attributes: ['id', 'name'] }
  ]
});
```

### Caso 3: GraphQL (Alto riesgo N+1)

```javascript
// Resolver de User
const userResolver = {
  posts: (user) => {
    // ❌ PROBLEMA: Cada user hace query
    return Post.findAll({ where: { userId: user.id } });
  }
};

// ✅ SOLUCIÓN: DataLoader
const postLoader = new DataLoader(async (userIds) => {
  const posts = await Post.findAll({
    where: { userId: userIds }
  });
  // ... agrupar ...
  return userIds.map(id => /* posts */);
});

const userResolver = {
  posts: (user) => postLoader.load(user.id)
};
```

## Checklist de Performance

```javascript
// ✅ Antes de ir a producción

// 1. Verificar eager loading
const users = await User.findAll({
  include: ['Posts', 'Comments'] // ✓
});

// 2. Limitar campos
select: { id: true, name: true } // No traer todo

// 3. Limitar resultados
limit: 50 // No traer todos

// 4. Índices en FK
// Database: CREATE INDEX idx_post_userId ON posts(userId);

// 5. Logging de queries en desarrollo
if (process.env.NODE_ENV === 'development') {
  sequelize.options.logging = console.log;
}

// 6. Testing de N+1
it('should not have N+1 query', async () => {
  // ... spy on database queries ...
  const users = await User.findAll({ include: ['Posts'] });
  // ... assert only 1 query ...
});
```

## Referencias

- [orms-query-builders.md](./orms-query-builders.md)
- [transactions-pooling.md](./transactions-pooling.md)
- [profiling-memory.md](../08-performance/profiling-memory.md)

## Pregunta de Entrevista

**¿Qué es el problema N+1 y cómo lo soluciona?**

N+1 ocurre cuando hace 1 query para obtener N registros, luego N queries para cada relación = 1 + N queries ineficientes. Solución: eager loading (include relaciones en query principal), lazy loading batched (IN clause), o DataLoader para automático batching + caching.
