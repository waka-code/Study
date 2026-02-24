# 4️⃣ Queries avanzadas

Un senior **no solo usa `findAll()`**.

## Debes dominar
- `where` complejo
- Operadores (`Op.and`, `Op.or`, `Op.like`)
- `attributes`, `include`, `order`, `limit`, `offset`, subqueries, `group`, `having`

### Ejemplo senior:
```ts
User.findAll({
  where: {
    [Op.or]: [
      { status: 'active' },
      { email: { [Op.like]: '%@empresa.com' } }
    ]
  },
  include: [{ model: Profile }],
  order: [['createdAt', 'DESC']],
  limit: 10
})
```
