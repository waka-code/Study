# Tipos de Asociaciones

## belongs_to (pertenece a)

```ruby
class Post < ApplicationRecord
  belongs_to :user
end

# Requiere columna user_id en posts
post.user
```

## has_many (tiene muchos)

```ruby
class User < ApplicationRecord
  has_many :posts
end

user.posts
user.posts.create(title: "...")
```

## has_one (tiene uno)

```ruby
class User < ApplicationRecord
  has_one :profile
end

user.profile
user.create_profile(bio: "...")
```

## has_and_belongs_to_many

```ruby
class Post < ApplicationRecord
  has_and_belongs_to_many :tags
end

class Tag < ApplicationRecord
  has_and_belongs_to_many :posts
end

# Requiere tabla posts_tags (sin modelo)
post.tags << tag
```

**Siguiente**: [has-many-through.md](./has-many-through.md)
