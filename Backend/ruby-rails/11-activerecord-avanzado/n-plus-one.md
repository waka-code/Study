# Detectar y Resolver N+1

## El Problema

```ruby
# ❌ N+1: 1 query para users + 1 query por cada user
users = User.all
users.each { |u| puts u.posts.count }
# SELECT * FROM users
# SELECT COUNT(*) FROM posts WHERE user_id = 1
# SELECT COUNT(*) FROM posts WHERE user_id = 2
# ... N veces más
```

## Soluciones: `includes` / `preload` / `eager_load`

```ruby
# ✅ includes: Rails elige la estrategia (preload o eager_load)
users = User.includes(:posts)
# → 2 queries: SELECT users / SELECT posts WHERE user_id IN (1,2,3...)

# preload: siempre 2 queries separadas
User.preload(:posts)

# eager_load: siempre LEFT OUTER JOIN (útil para WHERE en asociación)
User.eager_load(:posts).where(posts: { published: true })

# Nested includes
Post.includes(user: [:profile, :roles], comments: :user)
```

**Regla:** usa `includes` por defecto. Usa `eager_load` cuando necesitas filtrar por la asociación en el WHERE.

## Detectar con Bullet

```ruby
# Gemfile
gem 'bullet', group: :development

# config/environments/development.rb
config.after_initialize do
  Bullet.enable        = true
  Bullet.alert         = true
  Bullet.console       = true  # Muestra warning en consola del browser
  Bullet.rails_logger  = true  # Muestra en log de Rails
end
```

## `strict_loading`: Prevenir N+1 en Producción (Rails 6.1+)

```ruby
# Por modelo: lanza error si accedes a asociación no cargada
class User < ApplicationRecord
  self.strict_loading_by_default = true
end

user = User.find(1)
user.posts  # ⚠️ ActiveRecord::StrictLoadingViolationError
            # "User is marked for strict_loading and Post cannot be lazily loaded"

# Por query: solo para este scope
User.strict_loading.find(1).posts  # También lanza error

# Solución: cargar explícitamente
User.strict_loading.includes(:posts).find(1).posts  # ✅ OK
```

**Cuándo usar:** En desarrollo/staging para detectar N+1 antes de llegar a producción.

## `counter_cache`: Contar sin Query Adicional

```ruby
# Sin counter_cache: cada .count genera una query
post.comments.count  # SELECT COUNT(*) FROM comments WHERE post_id = 1

# Con counter_cache: el conteo se guarda en la tabla posts
class Comment < ApplicationRecord
  belongs_to :post, counter_cache: true
end

# Migración necesaria:
add_column :posts, :comments_count, :integer, default: 0, null: false

# Ahora .count usa la columna (sin query extra)
post.comments.count   # Lee post.comments_count directamente
post.comments.size    # Ídem (usa cache si está cargado)

# Rails actualiza comments_count automáticamente en create/destroy de Comment
```

**Ideal para:** mostrar conteos en listados sin N+1 (ej: "42 comentarios").

## Pregunta de Entrevista

**P: ¿Diferencia entre `includes`, `preload` y `eager_load`?**

- `preload`: siempre 2 queries separadas (`SELECT users` + `SELECT posts WHERE user_id IN (...)`)
- `eager_load`: siempre 1 query con LEFT OUTER JOIN — permite WHERE en la asociación
- `includes`: Rails elige según el contexto (preload si no hay WHERE en la asociación, eager_load si lo hay)

**P: ¿Qué es `strict_loading` y cuándo lo usarías?**

Lanza `StrictLoadingViolationError` si accedes a una asociación que no fue precargada (lazy loading). Lo activaría en development/staging para detectar N+1 antes de producción, pero no en producción donde puede romper funcionalidades legítimas.
