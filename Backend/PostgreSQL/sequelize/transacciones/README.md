# 5️⃣ Transacciones (OBLIGATORIO)

## Debes saber
- Transacciones manuales y automáticas
- Commit / rollback
- Transacciones anidadas

### Ejemplo senior:
```ts
const t = await sequelize.transaction()
try {
  await User.create(data, { transaction: t })
  await Profile.create(profile, { transaction: t })
  await t.commit()
} catch (e) {
  await t.rollback()
}
```
