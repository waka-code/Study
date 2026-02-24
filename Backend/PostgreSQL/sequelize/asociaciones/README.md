# 3️⃣ Asociaciones (MUY IMPORTANTE)

## Tipos
- `hasOne`
- `hasMany`
- `belongsTo`
- `belongsToMany`

## Debes saber
- Foreign keys explícitas
- Alias (`as`)
- Through tables
- Cascadas (`onDelete`, `onUpdate`)
- Lazy vs eager loading

### Ejemplo senior:
```ts
User.hasMany(Order, { as: 'orders', foreignKey: 'userId' })
```
