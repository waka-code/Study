# Transacciones ACID y Connection Pooling

## Propiedades ACID

| Propiedad | Descripción | Ejemplo |
|-----------|------------|---------|
| **Atomicity** | Todo o nada | Transferencia: débito + crédito juntos |
| **Consistency** | Datos válidos | Total dinero conservado |
| **Isolation** | Transacciones independientes | No interference entre usuarios |
| **Durability** | Persistencia garantizada | Datos guardados aunque crash |

## Transacciones Básicas

### Con Sequelize

```javascript
const { sequelize } = require('./models');

// Transacción implícita
const result = await sequelize.transaction(async (t) => {
  const user = await User.create({
    name: 'John'
  }, { transaction: t });

  const account = await Account.create({
    userId: user.id,
    balance: 1000
  }, { transaction: t });

  return { user, account };
});

// Si alguna falla, TODO se revierte automáticamente
```

### Con Prisma

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const result = await prisma.$transaction([
  prisma.user.create({
    data: { name: 'John' }
  }),
  prisma.account.create({
    data: { userId: 1, balance: 1000 }
  })
]);

// O con función
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { name: 'John' }
  });

  const account = await tx.account.create({
    data: { userId: user.id, balance: 1000 }
  });

  return { user, account };
});
```

### Con Knex

```javascript
const knex = require('knex');
const db = knex({ client: 'postgresql' });

const result = await db.transaction(async (trx) => {
  const user = await db('users')
    .insert({ name: 'John' }, 'id')
    .transacting(trx);

  const account = await db('accounts')
    .insert({ userId: user[0], balance: 1000 }, 'id')
    .transacting(trx);

  return { user, account };
});
```

## Casos de Uso Comunes

### Transferencia Bancaria

```javascript
async function transferMoney(fromUserId, toUserId, amount) {
  return await sequelize.transaction(async (t) => {
    // Lectura con LOCK
    const fromAccount = await Account.findByPk(fromUserId, {
      lock: true, // Evita race conditions
      transaction: t
    });

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Débito
    await Account.decrement('balance', {
      by: amount,
      where: { userId: fromUserId },
      transaction: t
    });

    // Crédito
    await Account.increment('balance', {
      by: amount,
      where: { userId: toUserId },
      transaction: t
    });

    // Log de transacción
    await Transaction.create({
      fromUserId,
      toUserId,
      amount
    }, { transaction: t });

    return true;
  });
}
```

### Carrito → Orden

```javascript
async function checkout(userId, cartItems) {
  return await sequelize.transaction(async (t) => {
    // 1. Crear orden
    const order = await Order.create({
      userId,
      status: 'pending',
      total: cartItems.reduce((s, i) => s + i.price * i.qty, 0)
    }, { transaction: t });

    // 2. Crear items de orden
    for (const item of cartItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.qty,
        price: item.price
      }, { transaction: t });

      // 3. Decrementar stock
      await Product.decrement('stock', {
        by: item.qty,
        where: { id: item.productId },
        transaction: t
      });
    }

    // 4. Vaciar carrito
    await Cart.destroy({
      where: { userId },
      transaction: t
    });

    return order;
  });
}
```

## Connection Pooling

Reutilizar conexiones en lugar de crear nuevas:

```javascript
const { Pool } = require('pg');

// ✅ BIEN: Connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  max: 20, // Máximo conexiones en pool
  idleTimeoutMillis: 30000, // Timeout conexión idle
  connectionTimeoutMillis: 2000 // Timeout de conexión
});

// Usar
const result = await pool.query('SELECT * FROM users WHERE id = $1', [1]);

// Retorna automáticamente al pool
```

### Conexión Directa (MAL)

```javascript
// ❌ MAL: Nueva conexión cada query
const { Client } = require('pg');

async function query(sql, params) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const result = await client.query(sql, params);
  await client.end();
  return result;
}

// Cada query → overhead de conexión
```

## Isolation Levels

```sql
-- Nivel de aislamiento (de menor a mayor)

-- READ UNCOMMITTED: Dirty reads permitidos
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

-- READ COMMITTED: Solo datos committed (default)
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- REPEATABLE READ: Mismos datos en transacción
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- SERIALIZABLE: Transacciones secuenciales (más lento)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### En Node.js

```javascript
// Sequelize
await sequelize.transaction({
  isolationLevel: 'SERIALIZABLE' // O 'REPEATABLE READ'
}, async (t) => {
  // ...
});

// Knex
await db.transaction(async (trx) => {
  await trx.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
  // ...
});
```

## Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| Deadlock | Orden de operaciones | Usar same order en todas transacciones |
| Timeout | Transacción muy larga | Dividir en partes |
| Race condition | Sin lock | Usar `SELECT ... FOR UPDATE` |
| Connection leak | No devolver conexión | Usar pools automáticos |

### Ejemplo: Deadlock

```javascript
// ❌ DEADLOCK posible
async function process1(trx) {
  await updateAccount(1, trx);
  await updateAccount(2, trx);
}

async function process2(trx) {
  await updateAccount(2, trx); // Orden inverso!
  await updateAccount(1, trx);
}

// ✅ BIEN: Siempre mismo orden
async function process1(trx) {
  await updateAccount(1, trx);
  await updateAccount(2, trx);
}

async function process2(trx) {
  await updateAccount(1, trx); // Mismo orden
  await updateAccount(2, trx);
}
```

## Testing de Transacciones

```javascript
describe('Transactions', () => {
  it('should rollback on error', async () => {
    try {
      await sequelize.transaction(async (t) => {
        await User.create({ name: 'Test' }, { transaction: t });
        throw new Error('Rollback!');
      });
    } catch (err) {
      // Expected
    }

    const user = await User.findOne({ where: { name: 'Test' } });
    expect(user).toBeNull(); // Usuario no fue creado
  });

  it('should commit on success', async () => {
    await sequelize.transaction(async (t) => {
      await User.create({ name: 'Test' }, { transaction: t });
    });

    const user = await User.findOne({ where: { name: 'Test' } });
    expect(user).not.toBeNull();
  });
});
```

## Monitoreo de Pool

```javascript
const pool = new Pool(config);

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('New connection');
});

pool.on('remove', () => {
  console.log('Connection removed');
});

// Status
setInterval(() => {
  console.log({
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 30000);
```

## Referencias

- [orms-query-builders.md](./orms-query-builders.md)
- [n-plus-one.md](./n-plus-one.md)
- [event-loop-monitoring.md](../08-performance/event-loop-monitoring.md)

## Pregunta de Entrevista

**¿Por qué son importantes las transacciones en operaciones de dinero?**

Sin transacciones, un crash entre débito y crédito deja dinero inconsistente. Transacciones garantizan atomicidad: débito y crédito ocurren juntos o no ocurren. Aislamiento evita race conditions entre usuarios.
