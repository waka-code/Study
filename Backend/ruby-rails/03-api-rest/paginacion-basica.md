# 📄 Paginación Básica

La paginación es **esencial** para APIs que devuelven colecciones grandes. Rails tiene excelentes gemas para paginación: **Kaminari** y **Pagy**.

---

## 📌 ¿Por qué paginar?

### Problemas sin paginación

```ruby
# ❌ Devuelve TODOS los posts (puede ser millones)
def index
  @posts = Post.all
  render json: @posts
end
```

**Consecuencias**:
- Lentitud extrema
- Alto uso de memoria
- Timeout en requests
- Mala experiencia de usuario

### Con paginación

```ruby
# ✅ Devuelve 20 posts por página
def index
  @posts = Post.page(params[:page]).per(20)
  render json: @posts
end
```

---

## 🔥 Kaminari - La gema más popular

### Instalación

```ruby
# Gemfile
gem 'kaminari'

# Instalar
bundle install

# Configuración global (opcional)
rails g kaminari:config
```

### Uso básico

```ruby
# app/controllers/api/v1/posts_controller.rb
class PostsController < ApplicationController
  def index
    @posts = Post.page(params[:page]).per(20)
    render json: @posts
  end
end
```

**Request**:
```
GET /api/v1/posts?page=1
GET /api/v1/posts?page=2
```

### Opciones de Kaminari

```ruby
# Página actual y cantidad por página
@posts = Post.page(params[:page]).per(params[:per_page] || 20)

# Página específica
@posts = Post.page(1).per(20)

# Obtener información de paginación
@posts.current_page      # 1
@posts.total_pages       # 5
@posts.total_count       # 100
@posts.limit_value       # 20
@posts.first_page?       # true
@posts.last_page?        # false
@posts.next_page         # 2
@posts.prev_page         # nil
```

### Incluir metadata en respuesta

```ruby
def index
  @posts = Post.page(params[:page]).per(params[:per_page] || 20)

  render json: {
    data: @posts,
    meta: {
      current_page: @posts.current_page,
      next_page: @posts.next_page,
      prev_page: @posts.prev_page,
      total_pages: @posts.total_pages,
      total_count: @posts.total_count
    }
  }
end
```

**Respuesta**:
```json
{
  "data": [
    { "id": 1, "title": "Post 1" },
    { "id": 2, "title": "Post 2" }
  ],
  "meta": {
    "current_page": 1,
    "next_page": 2,
    "prev_page": null,
    "total_pages": 5,
    "total_count": 100
  }
}
```

### Configuración global

```ruby
# config/initializers/kaminari_config.rb
Kaminari.configure do |config|
  config.default_per_page = 25        # Default: 25
  config.max_per_page = 100          # Máximo por página
  config.window = 4                   # Ventana de paginación
  config.page_method_name = :page    # Método de página
  config.param_name = :page          # Nombre del parámetro
end
```

---

## ⚡ Pagy - Más rápida que Kaminari

Pagy es **más rápida** y **más ligera** que Kaminari.

### Instalación

```ruby
# Gemfile
gem 'pagy'

# Incluir en ApplicationController
class ApplicationController < ActionController::API
  include Pagy::Backend
end
```

### Uso básico

```ruby
# app/controllers/api/v1/posts_controller.rb
class PostsController < ApplicationController
  def index
    @pagy, @posts = pagy(Post.all, items: 20)

    render json: {
      data: @posts,
      meta: pagy_metadata(@pagy)
    }
  end

  private

  def pagy_metadata(pagy)
    {
      current_page: pagy.page,
      next_page: pagy.next,
      prev_page: pagy.prev,
      total_pages: pagy.pages,
      total_count: pagy.count
    }
  end
end
```

### Configuración global

```ruby
# config/initializers/pagy.rb
require 'pagy/extras/metadata'

Pagy::DEFAULT[:items] = 20         # Items por página
Pagy::DEFAULT[:max_items] = 100    # Máximo por página
```

---

## 🧩 Paginación con concern reutilizable

```ruby
# app/controllers/concerns/paginatable.rb
module Paginatable
  extend ActiveSupport::Concern

  def paginate(collection)
    page = params[:page] || 1
    per_page = [params[:per_page]&.to_i || 20, 100].min

    paginated = collection.page(page).per(per_page)

    {
      data: paginated,
      meta: pagination_meta(paginated)
    }
  end

  private

  def pagination_meta(collection)
    {
      current_page: collection.current_page,
      next_page: collection.next_page,
      prev_page: collection.prev_page,
      total_pages: collection.total_pages,
      total_count: collection.total_count,
      per_page: collection.limit_value
    }
  end
end

# En controladores
class PostsController < ApplicationController
  include Paginatable

  def index
    @posts = Post.all
    render json: paginate(@posts)
  end
end
```

---

## 🎯 Paginación con offset/limit (sin gemas)

Si no quieres usar gemas, puedes implementar paginación manualmente:

```ruby
def index
  page = params[:page]&.to_i || 1
  per_page = [params[:per_page]&.to_i || 20, 100].min
  offset = (page - 1) * per_page

  @posts = Post.limit(per_page).offset(offset)
  total_count = Post.count

  render json: {
    data: @posts,
    meta: {
      current_page: page,
      per_page: per_page,
      total_count: total_count,
      total_pages: (total_count.to_f / per_page).ceil
    }
  }
end
```

**Desventaja**: no tienes helpers como `next_page`, `prev_page`, etc.

---

## 🔗 Link headers (estilo GitHub)

Incluir links de paginación en headers HTTP:

```ruby
# app/controllers/concerns/linkable.rb
module Linkable
  extend ActiveSupport::Concern

  def set_pagination_headers(collection)
    links = []

    links << link_header(1, 'first')
    links << link_header(collection.prev_page, 'prev') if collection.prev_page
    links << link_header(collection.next_page, 'next') if collection.next_page
    links << link_header(collection.total_pages, 'last')

    response.headers['Link'] = links.join(', ')
    response.headers['X-Total-Count'] = collection.total_count.to_s
  end

  private

  def link_header(page, rel)
    url = request.original_url.split('?').first
    "<#{url}?page=#{page}>; rel=\"#{rel}\""
  end
end

# En controlador
class PostsController < ApplicationController
  include Linkable

  def index
    @posts = Post.page(params[:page]).per(20)
    set_pagination_headers(@posts)
    render json: @posts
  end
end
```

**Response headers**:
```
Link: <http://localhost:3000/api/v1/posts?page=1>; rel="first",
      <http://localhost:3000/api/v1/posts?page=2>; rel="next",
      <http://localhost:3000/api/v1/posts?page=5>; rel="last"
X-Total-Count: 100
```

---

## 🆚 Comparación con Express y .NET

### Express (Node.js)

```javascript
// controllers/postsController.js
exports.index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
  const offset = (page - 1) * perPage;

  const { count, rows } = await Post.findAndCountAll({
    limit: perPage,
    offset: offset,
    order: [['createdAt', 'DESC']]
  });

  res.json({
    data: rows,
    meta: {
      current_page: page,
      per_page: perPage,
      total_count: count,
      total_pages: Math.ceil(count / perPage)
    }
  });
};
```

### .NET Core

```csharp
// Controllers/PostsController.cs
[HttpGet]
public async Task<ActionResult<PaginatedResponse<PostDto>>> GetPosts(
    [FromQuery] int page = 1,
    [FromQuery] int perPage = 20)
{
    perPage = Math.Min(perPage, 100);
    var skip = (page - 1) * perPage;

    var totalCount = await _context.Posts.CountAsync();
    var posts = await _context.Posts
        .Skip(skip)
        .Take(perPage)
        .ToListAsync();

    return Ok(new PaginatedResponse<PostDto>
    {
        Data = _mapper.Map<List<PostDto>>(posts),
        Meta = new PaginationMeta
        {
            CurrentPage = page,
            PerPage = perPage,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)perPage)
        }
    });
}
```

| Aspecto | Rails (Kaminari) | Express | .NET Core |
|---------|------------------|---------|-----------|
| **Setup** | Gem + helpers | Manual | Manual |
| **Sintaxis** | `.page(1).per(20)` | `.limit().offset()` | `.Skip().Take()` |
| **Metadata** | Helpers integrados | Manual | Manual |
| **Performance** | Optimizado | Depende de ORM | Optimizado |

---

## 🎓 Mejores prácticas

### 1️⃣ Limita el máximo por página

```ruby
def index
  per_page = [params[:per_page]&.to_i || 20, 100].min  # Max 100
  @posts = Post.page(params[:page]).per(per_page)
  render json: paginate(@posts)
end
```

### 2️⃣ Usa cursor pagination para feeds en tiempo real

Para feeds tipo Twitter/Instagram, usa cursor pagination:

```ruby
def index
  cursor = params[:cursor]  # ID del último post visto
  posts = Post.where('id < ?', cursor || Float::INFINITY)
              .order(id: :desc)
              .limit(20)

  render json: {
    data: posts,
    meta: {
      next_cursor: posts.last&.id
    }
  }
end
```

### 3️⃣ Incluye always pagination headers

```ruby
# app/controllers/concerns/paginatable.rb
module Paginatable
  extend ActiveSupport::Concern

  included do
    after_action :set_pagination_headers, only: :index
  end

  private

  def set_pagination_headers
    return unless @collection

    response.headers['X-Page'] = @collection.current_page.to_s
    response.headers['X-Per-Page'] = @collection.limit_value.to_s
    response.headers['X-Total'] = @collection.total_count.to_s
  end
end
```

### 4️⃣ Cachea counts caros

```ruby
# Para tablas con millones de registros, el count() es caro
def index
  @posts = Post.page(params[:page]).per(20)

  # Cachea el count por 5 minutos
  total_count = Rails.cache.fetch('posts_count', expires_in: 5.minutes) do
    Post.count
  end

  render json: {
    data: @posts,
    meta: {
      current_page: @posts.current_page,
      per_page: @posts.limit_value,
      total_count: total_count
    }
  }
end
```

### 5️⃣ Pagina con includes para N+1

```ruby
# ❌ Mal - N+1 query
@posts = Post.includes(:user).page(params[:page]).per(20)

# ✅ Bien - eager loading
@posts = Post.includes(:user, :comments).page(params[:page]).per(20)
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Paginación básica con Kaminari

Implementa paginación en un endpoint de posts.

<details>
<summary>Ver solución</summary>

```ruby
def index
  @posts = Post.page(params[:page]).per(20)
  render json: @posts
end
```
</details>

### Ejercicio 2: Incluir metadata

Devuelve metadata de paginación en la respuesta.

<details>
<summary>Ver solución</summary>

```ruby
def index
  @posts = Post.page(params[:page]).per(20)

  render json: {
    data: @posts,
    meta: {
      current_page: @posts.current_page,
      total_pages: @posts.total_pages,
      total_count: @posts.total_count
    }
  }
end
```
</details>

### Ejercicio 3: Concern reutilizable

Crea un concern Paginatable para reutilizar lógica de paginación.

<details>
<summary>Ver solución</summary>

```ruby
# app/controllers/concerns/paginatable.rb
module Paginatable
  extend ActiveSupport::Concern

  def paginate(collection)
    page = params[:page] || 1
    per_page = [params[:per_page]&.to_i || 20, 100].min

    paginated = collection.page(page).per(per_page)

    {
      data: paginated,
      meta: {
        current_page: paginated.current_page,
        total_pages: paginated.total_pages,
        total_count: paginated.total_count,
        per_page: paginated.limit_value
      }
    }
  end
end

# En controlador
class PostsController < ApplicationController
  include Paginatable

  def index
    render json: paginate(Post.all)
  end
end
```
</details>

### Ejercicio 4: Cursor pagination

Implementa cursor pagination para un feed.

<details>
<summary>Ver solución</summary>

```ruby
def index
  cursor = params[:cursor]
  posts = Post.where('id < ?', cursor || Float::INFINITY)
              .order(id: :desc)
              .limit(20)

  render json: {
    data: posts,
    meta: {
      next_cursor: posts.last&.id,
      has_more: posts.size == 20
    }
  }
end
```
</details>

---

## 🔗 Recursos adicionales

- [Kaminari](https://github.com/kaminari/kaminari)
- [Pagy](https://github.com/ddnexus/pagy)
- [Cursor Pagination](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/)
- [GitHub API Pagination](https://docs.github.com/en/rest/guides/using-pagination-in-the-rest-api)

---

## 📝 Resumen

- **Kaminari** es la gema más popular para paginación
- **Pagy** es más rápida y ligera
- Usa `.page(n).per(20)` para paginar
- Incluye **metadata** en respuestas: current_page, total_pages, total_count
- **Limita máximo** por página (ej: 100)
- Usa **cursor pagination** para feeds en tiempo real
- **Cachea counts** caros en tablas grandes
- Usa **eager loading** (includes) para evitar N+1
- Considera **Link headers** para APIs tipo GitHub
- Crea **concern reutilizable** para DRY

---

**Módulo completo**. Siguiente: [04 - ActiveRecord Básico](../04-activerecord-basico/README.md)
