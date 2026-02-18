# ORMs y Query Builders

## Comparación General

| Herramienta | Tipo | Nivel | Mejor Para |
|------------|------|-------|-----------|
| **Knex.js** | Query Builder | Bajo-Medio | SQL crudo, control total |
| **Sequelize** | ORM | Medio | Aplicaciones tradicionales |
| **TypeORM** | ORM | Medio-Alto | TypeScript, decoradores |
| **Prisma** | ORM Moderno | Medio-Alto | DX, type-safety |

## Knex.js: Query Builder

Query Builder permite construir SQL dinámicamente:

```javascript
const knex = require('knex');
const db = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL
});

// SELECT
const users = await db('users')
  .select('id', 'name', 'email')
  .where('active', true)
  .orderBy('name');

// WHERE con condiciones
const user = await db('users')
  .where('id', 1)
  .first(); // Devuelve un objeto, no array

// INSERT
const result = await db('users').insert({
  name: 'John',
  email: 'john@example.com'
});

// UPDATE
await db('users')
  .where('id', 1)
  .update({ name: 'Jane' });

// DELETE
await db('users')
  .where('id', 1)
  .del();

// JOIN
const posts = await db('posts')
  .join('users', 'posts.user_id', 'users.id')
  .select('posts.id', 'posts.title', 'users.name');

// GROUP BY
const counts = await db('orders')
  .select('user_id')
  .count('id as total')
  .groupBy('user_id');
```

### Ventajas/Desventajas

✅ Control total sobre SQL
✅ Fácil para consultas complejas
✅ Migrations incluidas
❌ Menos seguridad contra errores
❌ Requiere escribir más SQL

## Sequelize: ORM Tradicional

ORM mapea tablas a modelos:

```javascript
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL);

// Definir modelo
const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  age: DataTypes.INTEGER
});

const Post = sequelize.define('Post', {
  title: DataTypes.STRING,
  content: DataTypes.TEXT
});

// Asociaciones (Relationships)
User.hasMany(Post);
Post.belongsTo(User);

// Sync
await sequelize.sync();

// CRUD
const user = await User.create({
  name: 'John',
  email: 'john@example.com'
});

const users = await User.findAll({
  where: { active: true },
  limit: 10
});

const user = await User.findByPk(1);

await user.update({ name: 'Jane' });

await user.destroy();

// Eager loading (evitar N+1)
const users = await User.findAll({
  include: [{ association: 'Posts' }] // Carga posts junto con users
});
```

### Ventajas/Desventajas

✅ Abstracción de DB (cambiar fácilmente)
✅ Migrations nativas
✅ Validaciones built-in
❌ Overhead de performance
❌ Consultas complejas difíciles

## TypeORM: ORM para TypeScript

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  getRepository
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @OneToMany(() => Post, post => post.user)
  posts: Post[];
}

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToOne(() => User, user => user.posts)
  user: User;
}

// Usar
const userRepository = getRepository(User);

const user = await userRepository.create({
  name: 'John',
  email: 'john@example.com'
});

const users = await userRepository.find({
  relations: ['posts'] // Eager loading
});

const user = await userRepository.findOne(1, {
  relations: ['posts']
});

await userRepository.update(1, { name: 'Jane' });

await userRepository.delete(1);
```

### Ventajas/Desventajas

✅ Type-safe (TypeScript)
✅ Decoradores elegantes
✅ Relaciones automáticas
❌ Más overhead
❌ Configuración compleja

## Prisma: ORM Moderno

Prisma es el más moderno y DX-friendly:

```javascript
// schema.prisma
model User {
  id    Int     @id @default(autoincrement())
  name  String
  email String  @unique
  posts Post[]
}

model Post {
  id    Int     @id @default(autoincrement())
  title String
  user  User    @relation(fields: [userId], references: [id])
  userId Int
}
```

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CREATE
const user = await prisma.user.create({
  data: {
    name: 'John',
    email: 'john@example.com',
    posts: {
      create: [
        { title: 'Post 1' },
        { title: 'Post 2' }
      ]
    }
  }
});

// READ
const users = await prisma.user.findMany({
  include: { posts: true } // Eager loading
});

const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }
});

// UPDATE
await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Jane' }
});

// DELETE
await prisma.user.delete({ where: { id: 1 } });

// Transactions
await prisma.$transaction([
  prisma.user.update({ where: { id: 1 }, data: { balance: 100 } }),
  prisma.user.update({ where: { id: 2 }, data: { balance: 50 } })
]);
```

### Ventajas/Desventajas

✅ DX excelente (autocomplete perfecto)
✅ Type-safe automático
✅ Migraciones fáciles
✅ Moderno y mantenido
❌ Menos maduro que Sequelize
❌ Menos flexible para SQL crudo

## Comparación de Performance

```
Knex.js:     Más rápido (SQL directo)
Prisma:      Rápido (bien optimizado)
TypeORM:     Medio (más abstracción)
Sequelize:   Más lento (mucha abstracción)
```

## N+1 Problem

Problema: Cargar posts para cada usuario genera queries extra.

```javascript
// ❌ MAL: N+1 queries
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
  // 1 query para users + N queries para cada usuario = 1 + N
}

// ✅ BIEN: Eager loading
const users = await User.findAll({
  include: [{ association: 'Posts' }]
  // 1 query con JOIN
});
```

## Cuándo Usar Cada Uno

**Knex.js:**
- Necesitas queries SQL complejas
- Control total
- Migraciones nativas

**Sequelize:**
- Aplicación SQL tradicional
- Necesitas muchas features ORM
- Proyecto legacy

**TypeORM:**
- Aplicación TypeScript grande
- Decoradores y metadata
- Proyecto empresarial

**Prisma:**
- Proyecto nuevo
- TypeScript
- DX es prioridad
- Quieres type-safety automático

## Referencias

- [transactions-pooling.md](./transactions-pooling.md)
- [n-plus-one.md](./n-plus-one.md)
- [clean-architecture.md](../13-arquitectura/clean-architecture.md)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre un Query Builder y un ORM?**

Query Builder (Knex) genera SQL dinámicamente pero requiere escribirlo. ORM (Sequelize, Prisma) mapea objetos a tablas automáticamente. Query Builders dan más control, ORMs dan más abstracción y less boilerplate.
