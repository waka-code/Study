# Queries en ActiveRecord

ActiveRecord ofrece una interfaz expresiva para consultar la base de datos sin escribir SQL.

---

## 🔍 Métodos de consulta básicos

### where (condiciones)

```ruby
# Condición simple
User.where(active: true)
# SELECT * FROM users WHERE active = true

# Múltiples condiciones (AND)
User.where(active: true, role: "admin")
# SELECT * FROM users WHERE active = true AND role = 'admin'

# String interpolation (cuidado con SQL injection)
User.where("age > ?", 18)
User.where("name LIKE ?", "%john%")

# Hash de condiciones
User.where("age > :min_age AND city = :city", min_age: 18, city: "NYC")

# Array de valores (IN)
User.where(id: [1, 2, 3])
# SELECT * FROM users WHERE id IN (1, 2, 3)
```

---

### find y find_by

```ruby
# find (por ID, lanza error si no existe)
user = User.find(1)
# ActiveRecord::RecordNotFound si no existe

# find con múltiples IDs
users = User.find([1, 2, 3])

# find_by (primera coincidencia, retorna nil si no existe)
user = User.find_by(email: "ana@example.com")
user = User.find_by(email: "no-existe@example.com")  # => nil

# find_by! (lanza error si no existe)
user = User.find_by!(email: "ana@example.com")
```

---

### all, first, last

```ruby
# Todos los registros
User.all

# Primero
User.first
User.first(3)  # Primeros 3

# Último
User.last
User.last(5)   # Últimos 5

# Con condiciones
User.where(active: true).first
```

---

## 📊 Ordenamiento

```ruby
# Ascendente
User.order(:name)
User.order(name: :asc)

# Descendente
User.order(created_at: :desc)

# Múltiples campos
User.order(role: :asc, name: :asc)

# String SQL
User.order("created_at DESC, name ASC")
```

---

## 📏 Límites y offset

```ruby
# Límite
User.limit(10)  # Primeros 10

# Offset (saltar registros)
User.offset(20).limit(10)  # Del 21 al 30

# Paginación manual
page = 2
per_page = 10
User.offset((page - 1) * per_page).limit(per_page)
```

---

## 🎯 select (seleccionar columnas específicas)

```ruby
# Solo ciertas columnas
User.select(:id, :name, :email)
# SELECT id, name, email FROM users

# Con SQL custom
User.select("users.*, COUNT(posts.id) as posts_count")
    .joins(:posts)
    .group("users.id")
```

---

## 🔗 pluck (extraer valores)

```ruby
# Retorna array de valores
User.pluck(:email)
# => ["ana@example.com", "luis@example.com"]

# Múltiples columnas
User.pluck(:id, :name)
# => [[1, "Ana"], [2, "Luis"]]

# Más eficiente que map
User.pluck(:name)           # ✅ Eficiente
User.all.map(&:name)        # ❌ Carga todos los objetos
```

---

## 🧮 Agregaciones

```ruby
# Count
User.count                    # Total de usuarios
User.where(active: true).count

# Average
Order.average(:total)

# Sum
Order.sum(:total)

# Minimum y Maximum
Product.minimum(:price)
Product.maximum(:price)

# Agrupación
Order.group(:status).count
# => { "pending" => 5, "completed" => 10, "cancelled" => 2 }
```

---

## 🔍 Búsquedas avanzadas

### Operadores de comparación

```ruby
# Mayor que
Product.where("price > ?", 100)
Product.where("price > :price", price: 100)

# Menor o igual
Product.where("stock <= ?", 10)

# Entre valores (BETWEEN)
Product.where(price: 10..100)
Product.where("created_at BETWEEN ? AND ?", 1.week.ago, Time.now)

# NOT
User.where.not(role: "admin")
User.where.not(email: nil)
```

---

### LIKE / ILIKE

```ruby
# LIKE (case sensitive)
User.where("name LIKE ?", "%Ana%")

# ILIKE (case insensitive, solo PostgreSQL)
User.where("name ILIKE ?", "%ana%")

# Con comodines
User.where("email LIKE ?", "%@gmail.com")  # Termina en @gmail.com
User.where("name LIKE ?", "A%")            # Empieza con A
```

---

### OR

```ruby
# Rails 5+
User.where(role: "admin").or(User.where(role: "moderator"))

# SQL crudo
User.where("role = ? OR role = ?", "admin", "moderator")
```

---

## 🔗 Joins

```ruby
# INNER JOIN
User.joins(:posts)
# SELECT users.* FROM users INNER JOIN posts ON posts.user_id = users.id

# Múltiples joins
User.joins(:posts, :comments)

# Nested joins
Post.joins(user: :profile)

# LEFT OUTER JOIN
User.left_outer_joins(:posts)

# Con condiciones
User.joins(:posts).where(posts: { published: true })
```

---

## 📦 includes (eager loading)

Previene N+1 queries.

```ruby
# ❌ N+1 problem
users = User.all
users.each do |user|
  puts user.posts.count  # Query adicional por cada user
end

# ✅ Solución
users = User.includes(:posts)
users.each do |user|
  puts user.posts.count  # Sin queries adicionales
end

# Nested includes
Post.includes(user: [:profile, :roles])

# Con condiciones
User.includes(:posts).where(posts: { published: true }).references(:posts)
```

---

## 🎯 distinct

```ruby
# Eliminar duplicados
User.joins(:posts).distinct

# SQL
User.select("DISTINCT users.*")
```

---

## 🔄 Encadenamiento (chaining)

```ruby
# Puedes encadenar métodos
User.where(active: true)
    .where("age > ?", 18)
    .order(created_at: :desc)
    .limit(10)

# Las queries son lazy (no se ejecutan hasta que las necesitas)
query = User.where(active: true)  # No ejecuta query
query = query.where("age > ?", 18)  # Tampoco
results = query.to_a  # AQUÍ se ejecuta la query
```

---

## 🧪 exists?

```ruby
# Verifica si existe
User.exists?(email: "ana@example.com")
User.where(active: true).exists?

# Más eficiente que .count > 0
User.where(active: true).exists?  # ✅
User.where(active: true).count > 0  # ❌
```

---

## 📝 Scopes para reutilizar queries

```ruby
class User < ApplicationRecord
  scope :active, -> { where(active: true) }
  scope :adults, -> { where("age >= ?", 18) }
  scope :recent, -> { order(created_at: :desc).limit(10) }
end

# Uso
User.active
User.active.adults
User.recent
```

---

## 🔥 SQL crudo (cuando lo necesites)

```ruby
# find_by_sql
users = User.find_by_sql("SELECT * FROM users WHERE age > 18")

# execute
sql = "UPDATE users SET active = false WHERE last_login < '2023-01-01'"
ActiveRecord::Base.connection.execute(sql)

# Para queries complejas
result = ActiveRecord::Base.connection.exec_query(
  "SELECT users.name, COUNT(posts.id) as post_count 
   FROM users 
   LEFT JOIN posts ON posts.user_id = users.id 
   GROUP BY users.id"
)
```

---

## 💡 Mejores prácticas

1. **Usa scopes** para queries reutilizables
2. **Evita N+1** con `includes`
3. **Usa `pluck`** en lugar de `map` cuando solo necesites valores
4. **Usa `exists?`** en lugar de `.count > 0`
5. **Filtra en la DB**, no en Ruby
   ```ruby
   # ❌ Malo
   User.all.select { |u| u.active? }
   
   # ✅ Bueno
   User.where(active: true)
   ```

---

**Siguiente**: [migraciones-basicas.md](./migraciones-basicas.md)
