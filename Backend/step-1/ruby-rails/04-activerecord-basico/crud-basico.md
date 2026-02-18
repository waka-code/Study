# 📝 CRUD Básico con ActiveRecord

CRUD (Create, Read, Update, Delete) son las operaciones fundamentales con bases de datos. ActiveRecord hace esto **elegante y expresivo**.

---

## 📌 Modelo básico

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # ActiveRecord automáticamente mapea a la tabla 'users'
  # y expone métodos CRUD
end
```

**Tabla correspondiente**:
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

---

## 🟢 CREATE - Crear registros

### 1️⃣ create (inserta y guarda)

```ruby
# Crear y guardar en un solo paso
user = User.create(name: 'John', email: 'john@example.com')
# INSERT INTO users (name, email, created_at, updated_at) VALUES (...)

# Crear múltiples
users = User.create([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' }
])

# create con bloque
user = User.create do |u|
  u.name = 'Jane'
  u.email = 'jane@example.com'
end
```

### 2️⃣ new + save (dos pasos)

```ruby
# Crear instancia sin guardar
user = User.new(name: 'John', email: 'john@example.com')
user.persisted?  # false

# Guardar explícitamente
user.save        # INSERT INTO users ...
user.persisted?  # true
user.id          # 1

# save retorna true/false según si tuvo éxito
if user.save
  puts "Usuario creado: #{user.id}"
else
  puts "Error: #{user.errors.full_messages}"
end
```

### 3️⃣ create! y save! (lanza excepciones)

```ruby
# create! lanza excepción si falla
begin
  user = User.create!(name: '', email: 'invalid')
rescue ActiveRecord::RecordInvalid => e
  puts "Error: #{e.message}"
end

# save! lanza excepción si falla
user = User.new(name: '', email: 'invalid')
begin
  user.save!
rescue ActiveRecord::RecordInvalid => e
  puts "Error: #{e.message}"
end
```

**Cuándo usar cada uno**:
- `create` / `save`: cuando manejas errores con if/else
- `create!` / `save!`: cuando quieres que la excepción se propague

---

## 🔵 READ - Leer registros

### 1️⃣ all (todos los registros)

```ruby
users = User.all
# SELECT * FROM users

# all devuelve ActiveRecord::Relation (lazy loading)
users.class  # User::ActiveRecord_Relation

# No ejecuta query hasta que se accede
users.to_a   # Ahora sí ejecuta el SELECT
```

### 2️⃣ find (por ID)

```ruby
# Buscar por ID
user = User.find(1)
# SELECT * FROM users WHERE id = 1 LIMIT 1

# Múltiples IDs
users = User.find([1, 2, 3])
# SELECT * FROM users WHERE id IN (1, 2, 3)

# Si no existe, lanza ActiveRecord::RecordNotFound
begin
  user = User.find(999)
rescue ActiveRecord::RecordNotFound => e
  puts "Usuario no encontrado"
end
```

### 3️⃣ find_by (buscar por atributo)

```ruby
# Buscar por email
user = User.find_by(email: 'john@example.com')
# SELECT * FROM users WHERE email = 'john@example.com' LIMIT 1

# Si no existe, retorna nil (no lanza excepción)
user = User.find_by(email: 'noexiste@example.com')
user.nil?  # true

# Múltiples condiciones (AND)
user = User.find_by(email: 'john@example.com', name: 'John')
# SELECT * FROM users WHERE email = '...' AND name = 'John' LIMIT 1

# find_by! lanza excepción si no existe
user = User.find_by!(email: 'noexiste@example.com')
# ActiveRecord::RecordNotFound
```

### 4️⃣ where (múltiples registros)

```ruby
# Buscar todos los usuarios con email específico
users = User.where(email: 'john@example.com')
# SELECT * FROM users WHERE email = 'john@example.com'

# where retorna ActiveRecord::Relation
users.class  # User::ActiveRecord_Relation

# Múltiples condiciones (AND)
users = User.where(name: 'John', active: true)
# SELECT * FROM users WHERE name = 'John' AND active = true

# OR con array
users = User.where(name: ['John', 'Jane', 'Alice'])
# SELECT * FROM users WHERE name IN ('John', 'Jane', 'Alice')

# Rangos
users = User.where(created_at: 1.week.ago..Time.now)
# SELECT * FROM users WHERE created_at BETWEEN '...' AND '...'
```

### 5️⃣ first, last, take

```ruby
# Primer usuario
user = User.first
# SELECT * FROM users ORDER BY id ASC LIMIT 1

# Último usuario
user = User.last
# SELECT * FROM users ORDER BY id DESC LIMIT 1

# Primeros 5
users = User.first(5)
# SELECT * FROM users ORDER BY id ASC LIMIT 5

# take (sin orden específico)
user = User.take
# SELECT * FROM users LIMIT 1

# take(n)
users = User.take(3)
# SELECT * FROM users LIMIT 3
```

### 6️⃣ exists?

```ruby
# Verificar si existe
User.exists?(1)  # true/false
User.exists?(email: 'john@example.com')  # true/false

# any? y empty?
User.any?    # true si hay al menos un registro
User.empty?  # true si no hay registros

# where + exists?
User.where(active: true).exists?  # true/false
```

---

## 🟡 UPDATE - Actualizar registros

### 1️⃣ update (actualiza y guarda)

```ruby
user = User.find(1)

# update atributos
user.update(name: 'John Doe', email: 'newemail@example.com')
# UPDATE users SET name = 'John Doe', email = '...' WHERE id = 1

# update retorna true/false
if user.update(name: 'John Doe')
  puts "Usuario actualizado"
else
  puts "Error: #{user.errors.full_messages}"
end
```

### 2️⃣ update! (lanza excepciones)

```ruby
user = User.find(1)

begin
  user.update!(name: '', email: 'invalid')
rescue ActiveRecord::RecordInvalid => e
  puts "Error: #{e.message}"
end
```

### 3️⃣ update_attribute (sin validaciones)

```ruby
user = User.find(1)

# Actualiza SIN ejecutar validaciones ni callbacks
user.update_attribute(:name, 'John')
# UPDATE users SET name = 'John' WHERE id = 1

# ⚠️ Usar con cuidado - omite validaciones
```

### 4️⃣ update_column (sin validaciones ni callbacks)

```ruby
user = User.find(1)

# Actualiza SIN validaciones NI callbacks NI updated_at
user.update_column(:name, 'John')
# UPDATE users SET name = 'John' WHERE id = 1

# ⚠️ Usar con MUCHO cuidado
```

### 5️⃣ update_all (múltiples registros)

```ruby
# Actualizar múltiples registros
User.where(active: false).update_all(deleted_at: Time.now)
# UPDATE users SET deleted_at = '...' WHERE active = false

# ⚠️ No ejecuta validaciones ni callbacks
# ⚠️ No actualiza updated_at
```

### 6️⃣ Asignar + save

```ruby
user = User.find(1)

# Asignar atributos
user.name = 'John Doe'
user.email = 'john@example.com'

# Guardar cambios
user.save
# UPDATE users SET name = '...', email = '...' WHERE id = 1

# Verificar cambios
user.changed?  # false después de save
user.name_changed?  # false
user.changes   # {}
```

---

## 🔴 DELETE - Eliminar registros

### 1️⃣ destroy (con callbacks)

```ruby
user = User.find(1)
user.destroy
# DELETE FROM users WHERE id = 1

# destroy retorna el objeto (frozen)
user.frozen?  # true
user.destroyed?  # true

# destroy múltiples
User.destroy([1, 2, 3])
# DELETE FROM users WHERE id IN (1, 2, 3)

# ✅ Ejecuta callbacks (before_destroy, after_destroy)
```

### 2️⃣ destroy_all (con callbacks)

```ruby
# Eliminar múltiples registros
User.where(active: false).destroy_all
# SELECT * FROM users WHERE active = false
# DELETE FROM users WHERE id = 1
# DELETE FROM users WHERE id = 2
# ...

# ✅ Ejecuta callbacks para cada registro
# ⚠️ Puede ser lento si hay muchos registros
```

### 3️⃣ delete (sin callbacks)

```ruby
user = User.find(1)
user.delete
# DELETE FROM users WHERE id = 1

# ⚠️ NO ejecuta callbacks
# Más rápido pero menos seguro
```

### 4️⃣ delete_all (sin callbacks)

```ruby
# Eliminar múltiples registros
User.where(active: false).delete_all
# DELETE FROM users WHERE active = false

# ⚠️ NO ejecuta callbacks
# ⚠️ NO carga registros en memoria
# Muy rápido para eliminaciones masivas
```

---

## 🆚 Comparación con Sequelize y Entity Framework

### Sequelize (Node.js)

```javascript
// CREATE
const user = await User.create({ name: 'John', email: 'john@example.com' });

// READ
const user = await User.findByPk(1);
const user = await User.findOne({ where: { email: 'john@example.com' } });
const users = await User.findAll({ where: { active: true } });

// UPDATE
await user.update({ name: 'John Doe' });
await User.update({ active: false }, { where: { role: 'guest' } });

// DELETE
await user.destroy();
await User.destroy({ where: { active: false } });
```

### Entity Framework (.NET)

```csharp
// CREATE
var user = new User { Name = "John", Email = "john@example.com" };
_context.Users.Add(user);
await _context.SaveChangesAsync();

// READ
var user = await _context.Users.FindAsync(1);
var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "john@example.com");
var users = await _context.Users.Where(u => u.Active).ToListAsync();

// UPDATE
user.Name = "John Doe";
await _context.SaveChangesAsync();

// DELETE
_context.Users.Remove(user);
await _context.SaveChangesAsync();
```

| Operación | ActiveRecord | Sequelize | Entity Framework |
|-----------|--------------|-----------|------------------|
| **CREATE** | `User.create(...)` | `User.create(...)` | `Add()` + `SaveChanges()` |
| **READ** | `User.find(1)` | `User.findByPk(1)` | `FindAsync(1)` |
| **UPDATE** | `user.update(...)` | `user.update(...)` | `user.Prop = val` + `SaveChanges()` |
| **DELETE** | `user.destroy` | `user.destroy()` | `Remove()` + `SaveChanges()` |

---

## 🎓 Mejores prácticas

### 1️⃣ Usa create!/save! en servicios

```ruby
# ✅ En servicios, usa ! para que las excepciones se propaguen
class UserCreator
  def call(params)
    User.create!(params)  # Lanza excepción si falla
  end
end

# ❌ No ocultes errores
def create_user(params)
  user = User.create(params)
  # Si falla, user.id será nil pero no sabrás por qué
end
```

### 2️⃣ Prefiere destroy sobre delete

```ruby
# ✅ Usa destroy (ejecuta callbacks)
user.destroy

# ❌ Evita delete a menos que sepas lo que haces
user.delete  # Omite callbacks
```

### 3️⃣ Usa find_by sobre where().first

```ruby
# ✅ Más expresivo
user = User.find_by(email: 'john@example.com')

# ❌ Menos expresivo
user = User.where(email: 'john@example.com').first
```

### 4️⃣ Verifica persisted? después de create/save

```ruby
user = User.create(name: 'John', email: 'john@example.com')

if user.persisted?
  puts "Usuario creado con ID: #{user.id}"
else
  puts "Error: #{user.errors.full_messages}"
end
```

### 5️⃣ Usa transactions para operaciones múltiples

```ruby
ActiveRecord::Base.transaction do
  user = User.create!(name: 'John', email: 'john@example.com')
  post = Post.create!(user: user, title: 'First post')
  # Si cualquiera falla, ambas se revierten
end
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: CRUD completo

Implementa CRUD para un modelo Post (title, body, user_id).

<details>
<summary>Ver solución</summary>

```ruby
# CREATE
post = Post.create(title: 'My post', body: 'Content', user_id: 1)

# READ
post = Post.find(1)
post = Post.find_by(title: 'My post')
posts = Post.where(user_id: 1)
posts = Post.all

# UPDATE
post.update(title: 'Updated title')
post.title = 'New title'
post.save

# DELETE
post.destroy
```
</details>

### Ejercicio 2: Manejo de errores

Crea un usuario con validaciones y maneja errores.

<details>
<summary>Ver solución</summary>

```ruby
user = User.new(name: '', email: 'invalid')

if user.save
  puts "Usuario creado: #{user.id}"
else
  puts "Errores:"
  user.errors.full_messages.each do |message|
    puts "- #{message}"
  end
end
```
</details>

### Ejercicio 3: Bulk operations

Actualiza múltiples usuarios y elimina inactivos.

<details>
<summary>Ver solución</summary>

```ruby
# Actualizar múltiples
User.where(role: 'guest').update_all(active: false)

# Eliminar inactivos
User.where(active: false).destroy_all
```
</details>

---

## 🔗 Recursos adicionales

- [ActiveRecord Basics](https://guides.rubyonrails.org/active_record_basics.html)
- [ActiveRecord CRUD](https://guides.rubyonrails.org/active_record_basics.html#crud-reading-and-writing-data)
- [ActiveRecord API](https://api.rubyonrails.org/classes/ActiveRecord/Base.html)

---

## 📝 Resumen

- **CREATE**: `create`, `new + save`, `create!`, `save!`
- **READ**: `all`, `find`, `find_by`, `where`, `first`, `last`
- **UPDATE**: `update`, `update!`, `update_all`, `update_attribute`
- **DELETE**: `destroy`, `destroy_all`, `delete`, `delete_all`
- Usa **!** (bang methods) para lanzar excepciones
- **destroy** ejecuta callbacks, **delete** no
- **update_all** y **delete_all** son rápidos pero sin callbacks
- Usa **transactions** para operaciones múltiples

---

**Siguiente**: [Validaciones](./validaciones.md)
