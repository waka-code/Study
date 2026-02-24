# Índices Avanzados

```ruby
# Índice único
add_index :users, :email, unique: true

# Índice compuesto
add_index :posts, [:user_id, :created_at]

# Índice parcial (PostgreSQL)
add_index :posts, :slug, where: "published = true"

# Índice con nombre personalizado
add_index :users, :email, name: "idx_users_email"

# Eliminar índice
remove_index :users, :email
remove_index :users, name: "idx_users_email"
```
