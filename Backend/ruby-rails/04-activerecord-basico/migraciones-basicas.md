# Migraciones Básicas

Las **migraciones** son la forma de Rails para modificar la base de datos de forma controlada y versionada.

---

## 🎯 ¿Qué son las migraciones?

- **Archivos Ruby** que modifican la estructura de la DB
- **Versionadas** (se ejecutan en orden)
- **Reversibles** (puedes hacer rollback)
- **Independientes de la DB** (funcionan con PostgreSQL, MySQL, SQLite)

---

## 📝 Crear una migración

```bash
# Generar migración
rails generate migration CreateUsers

# Con timestamp
# db/migrate/20250213120000_create_users.rb
```

---

## 🏗️ Crear tablas

```ruby
class CreateUsers < ActiveRecord::Migration[7.0]
  def change
    create_table :users do |t|
      t.string :name
      t.string :email
      t.integer :age
      t.boolean :active, default: true
      t.timestamps
    end
  end
end
```

**Ejecutar**:
```bash
rails db:migrate
```

---

## 📊 Tipos de datos

```ruby
create_table :products do |t|
  t.string :name              # VARCHAR(255)
  t.text :description         # TEXT
  t.integer :quantity         # INTEGER
  t.bigint :user_id           # BIGINT
  t.float :rating             # FLOAT
  t.decimal :price, precision: 10, scale: 2  # DECIMAL(10,2)
  t.boolean :available        # BOOLEAN
  t.date :release_date        # DATE
  t.datetime :published_at    # DATETIME
  t.time :opens_at            # TIME
  t.json :metadata            # JSON
  t.jsonb :settings           # JSONB (PostgreSQL)
  t.timestamps                # created_at y updated_at
end
```

---

## ➕ Agregar columnas

```bash
rails generate migration AddPhoneToUsers phone:string
```

```ruby
class AddPhoneToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :phone, :string
  end
end
```

---

## ➖ Eliminar columnas

```bash
rails generate migration RemovePhoneFromUsers phone:string
```

```ruby
class RemovePhoneFromUsers < ActiveRecord::Migration[7.0]
  def change
    remove_column :users, :phone, :string
  end
end
```

---

## 🔄 Renombrar columnas

```ruby
class RenameEmailToEmailAddress < ActiveRecord::Migration[7.0]
  def change
    rename_column :users, :email, :email_address
  end
end
```

---

## 🔍 Índices

```ruby
class AddIndexToUsersEmail < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :email, unique: true
  end
end

# Índice compuesto
add_index :posts, [:user_id, :published_at]

# Índice con nombre personalizado
add_index :users, :email, name: "index_users_on_email_unique"
```

---

## 🔗 Foreign Keys (Relaciones)

```ruby
class CreatePosts < ActiveRecord::Migration[7.0]
  def change
    create_table :posts do |t|
      t.string :title
      t.text :body
      
      # Opción 1: references (recomendado)
      t.references :user, foreign_key: true
      
      # Opción 2: manual
      # t.bigint :user_id
      # add_foreign_key :posts, :users
      
      t.timestamps
    end
    
    # Índice automático con references
    # add_index :posts, :user_id (ya incluido con references)
  end
end
```

---

## 🔄 up y down (migraciones no reversibles)

```ruby
class ChangeUserEmailToNotNull < ActiveRecord::Migration[7.0]
  def up
    change_column_null :users, :email, false
  end
  
  def down
    change_column_null :users, :email, true
  end
end
```

---

## 🗑️ Eliminar tablas

```ruby
class DropProducts < ActiveRecord::Migration[7.0]
  def up
    drop_table :products
  end
  
  def down
    create_table :products do |t|
      # Recrear estructura
    end
  end
end
```

---

## 🔧 Cambiar tipo de columna

```ruby
class ChangeUserAgeToInteger < ActiveRecord::Migration[7.0]
  def change
    change_column :users, :age, :integer
  end
end
```

---

## ⚙️ Valores por defecto

```ruby
class AddDefaultsToUsers < ActiveRecord::Migration[7.0]
  def change
    change_column_default :users, :active, from: nil, to: true
    change_column_default :users, :role, from: nil, to: "user"
  end
end
```

---

## 📌 Comandos de migraciones

```bash
# Ejecutar migraciones pendientes
rails db:migrate

# Rollback última migración
rails db:rollback

# Rollback N migraciones
rails db:rollback STEP=3

# Ir a una versión específica
rails db:migrate:status  # Ver versiones
rails db:migrate VERSION=20250213120000

# Rehacer última migración
rails db:migrate:redo

# Reset completo (DROP + CREATE + MIGRATE)
rails db:reset

# Drop + Create
rails db:drop db:create

# Crear DB
rails db:create

# Ver estado
rails db:migrate:status
```

---

## 🧪 Migración completa (ejemplo)

```ruby
class CreateBlogTables < ActiveRecord::Migration[7.0]
  def change
    # Tabla users
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.string :password_digest
      t.boolean :admin, default: false
      t.timestamps
    end
    add_index :users, :email, unique: true
    
    # Tabla posts
    create_table :posts do |t|
      t.string :title, null: false
      t.text :body
      t.boolean :published, default: false
      t.references :user, foreign_key: true, null: false
      t.timestamps
    end
    add_index :posts, [:user_id, :published_at]
    
    # Tabla comments
    create_table :comments do |t|
      t.text :body, null: false
      t.references :post, foreign_key: true, null: false
      t.references :user, foreign_key: true, null: false
      t.timestamps
    end
  end
end
```

---

## 💡 Mejores prácticas

1. **Nunca modifiques migraciones ya ejecutadas** (crea una nueva)
2. **Usa `change` en lugar de `up`/`down`** cuando sea posible
3. **Agrega índices** a foreign keys y campos de búsqueda frecuente
4. **Usa `null: false`** para campos requeridos
5. **Agrega defaults** cuando tenga sentido
6. **Prueba rollback** antes de commitear
7. **Usa `references`** para foreign keys

---

**Módulo completado**: [04-activerecord-basico](./README.md)
