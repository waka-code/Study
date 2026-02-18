# Opciones de Dependent

Controla qué pasa con registros relacionados al eliminar.

```ruby
class User < ApplicationRecord
  # Al eliminar user, elimina todos sus posts
  has_many :posts, dependent: :destroy
  
  # Más rápido pero no ejecuta callbacks
  has_many :logs, dependent: :delete_all
  
  # Pone user_id = NULL en comments
  has_many :comments, dependent: :nullify
  
  # Lanza error si tiene orders
  has_many :orders, dependent: :restrict_with_error
end

# destroy: ejecuta callbacks de cada post
# delete_all: DELETE FROM posts WHERE user_id = ?
# nullify: UPDATE posts SET user_id = NULL
# restrict_with_error: lanza error si existen posts
```

**Mejores prácticas**:
- Usa `:destroy` cuando necesites callbacks
- Usa `:delete_all` para mejor performance
- Usa `:nullify` si el FK puede ser NULL
- Usa `:restrict_with_error` para prevenir eliminaciones accidentales
