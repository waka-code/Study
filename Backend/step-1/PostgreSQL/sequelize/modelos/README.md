# 2️⃣ Modelos (nivel avanzado)

No es solo `sequelize.define()`.

## Debes dominar
- Tipos de datos (`DataTypes`)
- Opciones de columnas: `allowNull`, `unique`, `defaultValue`, `validate`
- Hooks: `beforeCreate`, `afterUpdate`, `beforeDestroy`
- Campos virtuales y calculados
- Timestamps personalizados
- Soft deletes (`paranoid`)

### Ejemplo senior:
```ts
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  fullName: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.firstName + ' ' + this.lastName;
    }
  }
}, {
  paranoid: true,
  timestamps: true
})
```
