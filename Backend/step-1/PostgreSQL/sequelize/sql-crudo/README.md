# 9️⃣ SQL crudo con Sequelize

Un senior **NO le tiene miedo al SQL**.

## Debes saber
```ts
sequelize.query(
  'SELECT * FROM users WHERE email = :email',
  { replacements: { email }, type: QueryTypes.SELECT }
)
```

- Cuándo usar raw SQL
- Cómo evitar SQL injection
- Mezclar ORM + SQL
