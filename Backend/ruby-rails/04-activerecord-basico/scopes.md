# 🔭 Scopes en ActiveRecord

Los scopes son **métodos reutilizables** para queries comunes. Hacen el código más legible y DRY.

---

## 📌 ¿Qué son los scopes?

```ruby
# ❌ Sin scopes - repetitivo
@published_posts = Post.where(published: true).order(created_at: :desc)
@recent_published = Post.where(published: true).where('created_at > ?', 1.week.ago)

# ✅ Con scopes - DRY
@published_posts = Post.published.recent
@recent_published = Post.published.last_week
```

---

## 🔥 Definir scopes

### Sintaxis básica

```ruby
class Post < ApplicationRecord
  # scope con lambda
  scope :published, -> { where(published: true) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_author, ->(author_id) { where(author_id: author_id) }
end

# Uso
Post.published
# SELECT * FROM posts WHERE published = true

Post.published.recent
# SELECT * FROM posts WHERE published = true ORDER BY created_at DESC

Post.by_author(1)
# SELECT * FROM posts WHERE author_id = 1
```

### Scope con parámetros

```ruby
class Post < ApplicationRecord
  scope :created_after, ->(date) { where('created_at > ?', date) }
  scope :with_min_views, ->(count) { where('views >= ?', count) }
  scope :search, ->(query) { where('title LIKE ?', "%#{query}%") }
end

# Uso
Post.created_after(1.week.ago)
Post.with_min_views(100)
Post.search('rails')
```

### Scope con valores por defecto

```ruby
class Post < ApplicationRecord
  scope :recent, ->(limit = 10) { order(created_at: :desc).limit(limit) }
  scope :paginated, ->(page = 1, per_page = 20) {
    offset((page - 1) * per_page).limit(per_page)
  }
end

# Uso
Post.recent        # limit 10 (default)
Post.recent(5)     # limit 5
Post.paginated(2, 25)
```

---

## 🎯 Scopes comunes

### 1️⃣ Filtros de estado

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :draft, -> { where(published: false) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :active, -> { where(archived_at: nil) }
end
```

### 2️⃣ Ordenamiento

```ruby
class Post < ApplicationRecord
  scope :recent, -> { order(created_at: :desc) }
  scope :oldest, -> { order(created_at: :asc) }
  scope :popular, -> { order(views: :desc) }
  scope :by_title, -> { order(title: :asc) }
end
```

### 3️⃣ Rangos de tiempo

```ruby
class Post < ApplicationRecord
  scope :today, -> { where(created_at: Time.zone.now.beginning_of_day..Time.zone.now.end_of_day) }
  scope :this_week, -> { where(created_at: 1.week.ago..Time.zone.now) }
  scope :this_month, -> { where(created_at: 1.month.ago..Time.zone.now) }
  scope :between, ->(start_date, end_date) { where(created_at: start_date..end_date) }
end
```

### 4️⃣ Búsqueda

```ruby
class Post < ApplicationRecord
  scope :search, ->(query) {
    where('title LIKE ? OR body LIKE ?', "%#{query}%", "%#{query}%")
  }

  scope :by_tag, ->(tag) {
    joins(:tags).where(tags: { name: tag })
  }
end
```

### 5️⃣ Combinación con includes

```ruby
class Post < ApplicationRecord
  scope :with_author, -> { includes(:author) }
  scope :with_comments, -> { includes(:comments) }
  scope :with_all, -> { includes(:author, :comments, :tags) }
end

# Uso (evita N+1)
Post.published.with_author
```

---

## 🧩 Default scope

`default_scope` se aplica **automáticamente** a todas las queries.

```ruby
class Post < ApplicationRecord
  default_scope { where(deleted_at: nil) }
end

# Todas las queries incluyen where(deleted_at: nil)
Post.all
# SELECT * FROM posts WHERE deleted_at IS NULL

Post.where(published: true)
# SELECT * FROM posts WHERE deleted_at IS NULL AND published = true
```

### Desactivar default_scope

```ruby
# Omitir default_scope para una query
Post.unscoped.all
# SELECT * FROM posts (sin where deleted_at)

Post.unscoped.where(published: true)
# SELECT * FROM posts WHERE published = true
```

### ⚠️ Evita default_scope

**Razones**:
- Puede causar bugs inesperados
- Difícil de depurar
- Afecta TODAS las queries (incluso las que no quieres)

```ruby
# ❌ Mal - default_scope
class Post < ApplicationRecord
  default_scope { order(created_at: :desc) }
end

# ✅ Bien - scope explícito
class Post < ApplicationRecord
  scope :recent, -> { order(created_at: :desc) }
end
```

---

## 🔗 Encadenar scopes

Los scopes son **chainables** (encadenables):

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :recent, -> { order(created_at: :desc) }
  scope :popular, -> { where('views > ?', 100) }
  scope :by_author, ->(author_id) { where(author_id: author_id) }
end

# Encadenar múltiples scopes
Post.published.recent.popular
# SELECT * FROM posts
# WHERE published = true AND views > 100
# ORDER BY created_at DESC

Post.published.by_author(1).recent.limit(10)
```

---

## 🆚 Scopes vs Métodos de clase

### Scopes (recomendado)

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
end
```

### Métodos de clase (alternativa)

```ruby
class Post < ApplicationRecord
  def self.published
    where(published: true)
  end
end
```

**Diferencias**:
- Scopes **siempre retornan ActiveRecord::Relation**
- Métodos de clase pueden retornar `nil` o arrays
- Scopes son más **seguros** para encadenar

```ruby
# Scope seguro
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
end

Post.published.recent  # ✅ Funciona siempre

# Método de clase inseguro
class Post < ApplicationRecord
  def self.published
    where(published: true) if condition
  end
end

Post.published.recent  # ❌ Error si published retorna nil
```

---

## 🆚 Comparación con Sequelize y Entity Framework

### Sequelize (Node.js)

```javascript
// models/Post.js
module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    title: DataTypes.STRING,
    published: DataTypes.BOOLEAN
  });

  // Scopes en Sequelize
  Post.addScope('published', {
    where: { published: true }
  });

  Post.addScope('recent', {
    order: [['createdAt', 'DESC']]
  });

  return Post;
};

// Uso
Post.scope('published', 'recent').findAll();
```

### Entity Framework (.NET)

```csharp
// Extensions/PostExtensions.cs
public static class PostExtensions
{
    public static IQueryable<Post> Published(this IQueryable<Post> query)
    {
        return query.Where(p => p.Published);
    }

    public static IQueryable<Post> Recent(this IQueryable<Post> query)
    {
        return query.OrderByDescending(p => p.CreatedAt);
    }
}

// Uso
_context.Posts.Published().Recent().ToListAsync();
```

| Aspecto | ActiveRecord | Sequelize | Entity Framework |
|---------|--------------|-----------|------------------|
| **Sintaxis** | `scope :name, -> {}` | `addScope('name', {})` | Extension methods |
| **Encadenable** | Sí | Sí | Sí (LINQ) |
| **Default** | `default_scope` | `defaultScope` | Global query filters |

---

## 🎓 Mejores prácticas

### 1️⃣ Usa scopes para queries comunes

```ruby
# ✅ Bien
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
end

Post.published  # Claro y reutilizable

# ❌ Mal - repetir where
Post.where(published: true)  # En todos lados
```

### 2️⃣ Combina scopes para queries complejas

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :recent, -> { order(created_at: :desc) }
  scope :popular, -> { where('views > ?', 100) }
end

# Fácil de leer
Post.published.recent.popular
```

### 3️⃣ Evita default_scope

```ruby
# ❌ Evita
default_scope { where(deleted_at: nil) }

# ✅ Usa scope explícito
scope :active, -> { where(deleted_at: nil) }
```

### 4️⃣ Usa lambdas siempre

```ruby
# ✅ Bien - lambda (se evalúa al ejecutar)
scope :recent, -> { where('created_at > ?', 1.week.ago) }

# ❌ Mal - sin lambda (se evalúa al cargar la clase)
scope :recent, where('created_at > ?', 1.week.ago)
```

### 5️⃣ Nombres descriptivos

```ruby
# ✅ Bien - nombres claros
scope :published_this_month, -> { published.where(created_at: 1.month.ago..Time.zone.now) }
scope :awaiting_approval, -> { where(status: 'pending', approved: false) }

# ❌ Mal - nombres confusos
scope :query1, -> { where(...) }
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Scopes básicos

Crea scopes para posts publicados, borradores y recientes.

<details>
<summary>Ver solución</summary>

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :draft, -> { where(published: false) }
  scope :recent, -> { order(created_at: :desc) }
end
```
</details>

### Ejercicio 2: Scope con parámetro

Crea un scope que busque posts por categoría.

<details>
<summary>Ver solución</summary>

```ruby
class Post < ApplicationRecord
  scope :by_category, ->(category) { where(category: category) }
end

# Uso
Post.by_category('ruby')
```
</details>

### Ejercicio 3: Scopes encadenados

Combina múltiples scopes para obtener posts publicados y populares de esta semana.

<details>
<summary>Ver solución</summary>

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :popular, -> { where('views > ?', 100) }
  scope :this_week, -> { where(created_at: 1.week.ago..Time.zone.now) }
end

# Uso
Post.published.popular.this_week
```
</details>

---

## 🔗 Recursos adicionales

- [ActiveRecord Scopes](https://guides.rubyonrails.org/active_record_querying.html#scopes)
- [Scopes Best Practices](https://www.theodinproject.com/lessons/ruby-on-rails-active-record-queries#scopes)

---

## 📝 Resumen

- **Scopes** son métodos reutilizables para queries comunes
- Sintaxis: `scope :name, -> { where(...) }`
- Scopes son **chainables** (encadenables)
- **Siempre usa lambdas** en scopes
- **Evita default_scope** (difícil de depurar)
- Scopes vs métodos de clase: scopes siempre retornan `Relation`
- Usa nombres **descriptivos**
- Combina scopes para queries complejas

---

**Siguiente**: [Queries](./queries.md)
