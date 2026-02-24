# Validations vs DB Constraints

## ¿Cuál es la diferencia?

| | Validaciones Rails | DB Constraints |
|---|---|---|
| **Dónde viven** | Modelo Ruby | Base de datos |
| **Cuándo se ejecutan** | Antes de INSERT/UPDATE | En el INSERT/UPDATE |
| **Se pueden saltar** | Sí (`save(validate: false)`) | Nunca |
| **Mensajes de error** | Amigables, en `errors` | Excepción de BD |
| **Rendimiento** | Una query extra (uniqueness) | Sin overhead |
| **Protege contra** | Inputs del usuario | Todo (incluyendo consola, seeds, migraciones) |

**Conclusión:** No son excluyentes. Úsalas juntas.

---

## DB Constraints en Migraciones

### NOT NULL

```ruby
# En migración nueva
create_table :users do |t|
  t.string :email, null: false  # NOT NULL en DB
end

# En tabla existente
change_column_null :users, :email, false
```

### Unique Index

```ruby
# Índice único en DB
add_index :users, :email, unique: true

# Compuesto: combinación única
add_index :team_members, [:team_id, :user_id], unique: true
```

**Por qué siempre agregar un índice único cuando usas `validates :email, uniqueness: true`:**

```ruby
# Rails uniqueness valida con una SELECT antes del INSERT
# Entre la SELECT y el INSERT, otra request puede insertar el mismo email
# → Race condition → duplicados en producción

# La DB constraint lo previene: el INSERT falla en la DB
# → ActiveRecord::RecordNotUnique → puedes rescatarlo
```

### CHECK Constraints (PostgreSQL / MySQL 8+)

```ruby
# Valor positivo
execute <<-SQL
  ALTER TABLE products
  ADD CONSTRAINT price_positive CHECK (price > 0)
SQL

# Enum-like en DB
execute <<-SQL
  ALTER TABLE orders
  ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'cancelled'))
SQL

# Rails 6.1+ tiene sintaxis nativa:
add_check_constraint :products, "price > 0", name: "price_positive"
add_check_constraint :orders, "quantity > 0", name: "quantity_positive"
```

### Foreign Key Constraints

```ruby
# Garantiza integridad referencial en DB
add_foreign_key :posts, :users
# DELETE en users falla si tiene posts (por defecto)

# Con cascade
add_foreign_key :posts, :users, on_delete: :cascade
# DELETE en users → DELETE automático en sus posts

# En create_table
create_table :posts do |t|
  t.references :user, null: false, foreign_key: true
end
```

### DEFAULT Values

```ruby
change_column_default :users, :active, from: nil, to: true
change_column_default :orders, :status, "pending"
```

---

## Cuándo Usar Cada Una

### Solo Validación Rails (suficiente para reglas de negocio)

```ruby
# Reglas complejas que solo Rails puede expresar
validates :end_date, comparison: { greater_than: :start_date }
validates :password, format: { with: /\A(?=.*[a-z])(?=.*[A-Z])/ }
```

### Solo DB Constraint (cuando Rails no es el único escritor)

```ruby
# Si tienes scripts externos, migraciones de datos, o múltiples apps
# conectadas a la misma BD → la constraint de DB los cubre todos
add_check_constraint :accounts, "balance >= 0", name: "non_negative_balance"
```

### Ambas (el patrón correcto para campos críticos)

```ruby
# Modelo
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: { case_sensitive: false }
end

# Migración
add_index :users, :email, unique: true           # Previene race conditions
change_column_null :users, :email, false          # NOT NULL en DB
add_foreign_key :posts, :users                   # Integridad referencial
```

---

## Manejar Errores de DB Constraints

```ruby
def create_user(params)
  User.create!(params)
rescue ActiveRecord::RecordNotUnique => e
  # Índice único violado
  { error: "Email already taken" }
rescue ActiveRecord::NotNullViolation => e
  { error: "Required field missing" }
rescue ActiveRecord::InvalidForeignKey => e
  { error: "Referenced record does not exist" }
rescue ActiveRecord::StatementInvalid => e
  # Check constraint violado u otro error de DB
  { error: "Invalid data" }
end
```

---

## Pregunta de Entrevista

**P: ¿Por qué usar `add_index :users, :email, unique: true` si ya tienes `validates :email, uniqueness: true`?**

**R:** La validación Rails hace una SELECT antes del INSERT para verificar unicidad. En un sistema con múltiples procesos o alta concurrencia, dos requests pueden pasar la validación simultáneamente y ambas intentar INSERT — creando duplicados. El índice único en DB rechaza el segundo INSERT a nivel de motor de base de datos, sin importar cuántos procesos estén corriendo. Además, protege contra inserciones directas (consola, scripts, migraciones de datos). Las validaciones sirven para dar mensajes amigables al usuario; los constraints de DB son la garantía real.
