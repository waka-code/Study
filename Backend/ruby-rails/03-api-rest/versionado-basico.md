# 🔢 Versionado de APIs

El versionado de APIs es **esencial** para mantener compatibilidad hacia atrás mientras evolucionas tu API. Rails hace esto elegante con namespaces.

---

## 📌 ¿Por qué versionar?

### Razones para versionar

1. **Breaking changes**: cambios que rompen compatibilidad
2. **Deprecación gradual**: mantener v1 mientras migras a v2
3. **Múltiples clientes**: móvil puede usar v1, web v2
4. **Contratos claros**: cada versión es un contrato con el cliente

### Cuándo crear nueva versión

- Cambias estructura de respuestas JSON
- Eliminas o renombras campos
- Cambias comportamiento de endpoints
- Modificas reglas de validación que afectan clientes

---

## 🎯 Estrategias de versionado

### 1️⃣ URL Path Versioning (recomendado)

La versión va en la URL: `/api/v1/posts`

**Ventajas**:
- Visible y explícito
- Fácil de cachear
- Funciona con todos los clientes
- Fácil de testear

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :posts
      resources :users
    end

    namespace :v2 do
      resources :posts
    end
  end
end
```

**Estructura de archivos**:
```
app/controllers/
├── api/
│   ├── v1/
│   │   ├── posts_controller.rb
│   │   └── users_controller.rb
│   └── v2/
│       └── posts_controller.rb
```

### 2️⃣ Header Versioning (Accept header)

La versión va en el header: `Accept: application/vnd.myapp.v1+json`

**Ventajas**:
- URLs limpias
- RESTful puro
- Permite content negotiation

**Desventajas**:
- Más complejo
- Difícil de testear en navegador
- Requiere configuración extra

```ruby
# lib/api_version_constraint.rb
class ApiVersionConstraint
  def initialize(version:, default: false)
    @version = version
    @default = default
  end

  def matches?(request)
    @default || request.headers['Accept']&.include?("application/vnd.myapp.v#{@version}+json")
  end
end

# config/routes.rb
require 'api_version_constraint'

Rails.application.routes.draw do
  namespace :api, defaults: { format: :json } do
    scope module: :v1, constraints: ApiVersionConstraint.new(version: 1, default: true) do
      resources :posts
    end

    scope module: :v2, constraints: ApiVersionConstraint.new(version: 2) do
      resources :posts
    end
  end
end
```

**Uso**:
```bash
# Default (v1)
curl http://localhost:3000/api/posts

# v1 explícito
curl -H "Accept: application/vnd.myapp.v1+json" http://localhost:3000/api/posts

# v2
curl -H "Accept: application/vnd.myapp.v2+json" http://localhost:3000/api/posts
```

### 3️⃣ Query Parameter Versioning

La versión va como query param: `/api/posts?version=1`

**NO recomendado** (rompe convenciones REST y complica caching).

---

## 🔥 Implementación completa - URL Versioning

### Paso 1: Configurar rutas

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      resources :posts do
        resources :comments, shallow: true
      end
      resources :users
    end

    namespace :v2 do
      resources :posts do
        resources :comments, shallow: true
      end
      resources :users
    end
  end
end
```

### Paso 2: Base controller por versión

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ApplicationController
      # Lógica común para v1
      rescue_from ActiveRecord::RecordNotFound, with: :not_found

      private

      def not_found(exception)
        render json: { error: exception.message }, status: :not_found
      end
    end
  end
end

# app/controllers/api/v2/base_controller.rb
module Api
  module V2
    class BaseController < ApplicationController
      # Lógica común para v2 (puede ser diferente)
      rescue_from ActiveRecord::RecordNotFound, with: :not_found

      private

      def not_found(exception)
        render json: {
          error: "Resource not found",
          message: exception.message,
          code: "NOT_FOUND"
        }, status: :not_found
      end
    end
  end
end
```

### Paso 3: Controladores por versión

```ruby
# app/controllers/api/v1/posts_controller.rb
module Api
  module V1
    class PostsController < BaseController
      def index
        @posts = Post.all
        render json: @posts, only: [:id, :title, :body, :created_at]
      end

      def show
        @post = Post.find(params[:id])
        render json: @post, only: [:id, :title, :body, :created_at]
      end
    end
  end
end

# app/controllers/api/v2/posts_controller.rb
module Api
  module V2
    class PostsController < BaseController
      def index
        @posts = Post.all.includes(:user)
        render json: @posts, include: { user: { only: [:id, :name] } }
      end

      def show
        @post = Post.find(params[:id])
        # v2 incluye más información
        render json: @post, include: [:user, :comments], methods: [:read_time]
      end
    end
  end
end
```

### Paso 4: Serializers por versión (opcional)

```ruby
# app/serializers/api/v1/post_serializer.rb
module Api
  module V1
    class PostSerializer < ActiveModel::Serializer
      attributes :id, :title, :body, :created_at
    end
  end
end

# app/serializers/api/v2/post_serializer.rb
module Api
  module V2
    class PostSerializer < ActiveModel::Serializer
      attributes :id, :title, :body, :created_at, :updated_at, :read_time

      belongs_to :user
      has_many :comments
    end
  end
end

# En controlador
render json: @post, serializer: Api::V2::PostSerializer
```

---

## 🧩 Compartir código entre versiones

### 1️⃣ Herencia de controladores

```ruby
# app/controllers/api/v2/posts_controller.rb
module Api
  module V2
    class PostsController < Api::V1::PostsController
      # Heredar todo de v1 y solo sobrescribir lo que cambió
      def index
        @posts = Post.all.includes(:user)  # v2 incluye user
        render json: @posts, include: :user
      end

      # show, create, update, destroy se heredan de v1
    end
  end
end
```

### 2️⃣ Servicios compartidos

```ruby
# app/services/post_creator.rb
class PostCreator
  def initialize(user, params)
    @user = user
    @params = params
  end

  def call
    @user.posts.create!(@params)
  end
end

# Ambas versiones usan el mismo servicio
module Api
  module V1
    class PostsController < BaseController
      def create
        post = PostCreator.new(current_user, post_params).call
        render json: post, status: :created
      end
    end
  end
end
```

### 3️⃣ Concerns compartidos

```ruby
# app/controllers/concerns/paginatable.rb
module Paginatable
  extend ActiveSupport::Concern

  def paginate(collection)
    collection.page(params[:page]).per(params[:per_page] || 20)
  end
end

# Ambas versiones incluyen el concern
module Api
  module V1
    class PostsController < BaseController
      include Paginatable

      def index
        @posts = paginate(Post.all)
        render json: @posts
      end
    end
  end
end
```

---

## 🆚 Comparación con Express y .NET

### Express (Node.js)

```javascript
// routes/index.js
const express = require('express');
const app = express();

// v1 routes
const v1Posts = require('./v1/posts');
app.use('/api/v1/posts', v1Posts);

// v2 routes
const v2Posts = require('./v2/posts');
app.use('/api/v2/posts', v2Posts);

// routes/v1/posts.js
router.get('/', async (req, res) => {
  const posts = await Post.findAll();
  res.json(posts);
});

// routes/v2/posts.js
router.get('/', async (req, res) => {
  const posts = await Post.findAll({ include: ['user'] });
  res.json(posts);
});
```

### .NET Core

```csharp
// Controllers/V1/PostsController.cs
[ApiController]
[Route("api/v1/[controller]")]
public class PostsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PostV1Dto>>> GetPosts()
    {
        var posts = await _context.Posts.ToListAsync();
        return Ok(_mapper.Map<IEnumerable<PostV1Dto>>(posts));
    }
}

// Controllers/V2/PostsController.cs
[ApiController]
[Route("api/v2/[controller]")]
public class PostsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PostV2Dto>>> GetPosts()
    {
        var posts = await _context.Posts.Include(p => p.User).ToListAsync();
        return Ok(_mapper.Map<IEnumerable<PostV2Dto>>(posts));
    }
}
```

| Aspecto | Rails | Express | .NET Core |
|---------|-------|---------|-----------|
| **Estructura** | namespace :v1 | Carpetas manuales | Atributos [Route] |
| **Herencia** | Módulos Ruby | Manual | Clases base |
| **Serializers** | ActiveModel::Serializer | Manual | DTOs + AutoMapper |
| **DRY** | Concerns + herencia | Manual | Clases base + DI |

---

## 🎓 Mejores prácticas

### 1️⃣ No elimines versiones antiguas abruptamente

```ruby
# ❌ Mal
namespace :api do
  namespace :v2 do
    resources :posts  # ¿Dónde está v1?
  end
end

# ✅ Bien - mantén v1 deprecada pero funcional
namespace :api do
  namespace :v1 do
    resources :posts  # Deprecada pero funcional
  end

  namespace :v2 do
    resources :posts  # Versión actual
  end
end
```

### 2️⃣ Documenta breaking changes

```ruby
# app/controllers/api/v2/posts_controller.rb
module Api
  module V2
    # BREAKING CHANGES from v1:
    # - Response includes 'user' object
    # - 'body' renamed to 'content'
    # - Added 'updated_at' field
    # - Removed 'summary' field
    class PostsController < BaseController
      # ...
    end
  end
end
```

### 3️⃣ Usa deprecation headers

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ApplicationController
      before_action :set_deprecation_header

      private

      def set_deprecation_header
        response.headers['X-API-Deprecation'] = 'v1 is deprecated. Please migrate to v2 by 2024-12-31'
        response.headers['X-API-Sunset'] = '2024-12-31'
      end
    end
  end
end
```

### 4️⃣ Testea todas las versiones

```ruby
# spec/requests/api/v1/posts_spec.rb
RSpec.describe 'Api::V1::Posts', type: :request do
  describe 'GET /api/v1/posts' do
    it 'returns posts' do
      get '/api/v1/posts'
      expect(response).to have_http_status(:ok)
    end
  end
end

# spec/requests/api/v2/posts_spec.rb
RSpec.describe 'Api::V2::Posts', type: :request do
  describe 'GET /api/v2/posts' do
    it 'returns posts with users' do
      get '/api/v2/posts'
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).first).to have_key('user')
    end
  end
end
```

### 5️⃣ Versiona también tus serializers

```ruby
# app/serializers/api/v1/post_serializer.rb
module Api::V1
  class PostSerializer < ActiveModel::Serializer
    attributes :id, :title, :body
  end
end

# app/serializers/api/v2/post_serializer.rb
module Api::V2
  class PostSerializer < ActiveModel::Serializer
    attributes :id, :title, :content, :updated_at  # Breaking changes
    belongs_to :user
  end
end
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Versionado básico

Crea v1 y v2 de un endpoint de posts. v2 debe incluir el user.

<details>
<summary>Ver solución</summary>

```ruby
# config/routes.rb
namespace :api do
  namespace :v1 do
    resources :posts, only: [:index]
  end

  namespace :v2 do
    resources :posts, only: [:index]
  end
end

# app/controllers/api/v1/posts_controller.rb
module Api::V1
  class PostsController < ApplicationController
    def index
      @posts = Post.all
      render json: @posts, only: [:id, :title, :body]
    end
  end
end

# app/controllers/api/v2/posts_controller.rb
module Api::V2
  class PostsController < ApplicationController
    def index
      @posts = Post.all.includes(:user)
      render json: @posts, include: :user
    end
  end
end
```
</details>

### Ejercicio 2: Base controller compartido

Crea un base controller con manejo de errores para ambas versiones.

<details>
<summary>Ver solución</summary>

```ruby
# app/controllers/api/v1/base_controller.rb
module Api::V1
  class BaseController < ApplicationController
    rescue_from ActiveRecord::RecordNotFound, with: :not_found

    private

    def not_found(exception)
      render json: { error: exception.message }, status: :not_found
    end
  end
end

# app/controllers/api/v1/posts_controller.rb
module Api::V1
  class PostsController < BaseController
    # hereda manejo de errores
  end
end
```
</details>

### Ejercicio 3: Herencia entre versiones

Crea v2 que herede de v1 y solo sobrescriba index.

<details>
<summary>Ver solución</summary>

```ruby
# app/controllers/api/v2/posts_controller.rb
module Api::V2
  class PostsController < Api::V1::PostsController
    def index
      @posts = Post.all.includes(:user)
      render json: @posts, include: :user
    end

    # show, create, update, destroy se heredan de v1
  end
end
```
</details>

---

## 🔗 Recursos adicionales

- [API Versioning Best Practices](https://www.freecodecamp.org/news/how-to-version-a-rest-api/)
- [Rails API Versioning](https://chriskottom.com/blog/2017/04/versioning-a-rails-api/)
- [Semantic Versioning](https://semver.org/)

---

## 📝 Resumen

- **URL Path Versioning** es el enfoque recomendado (`/api/v1/posts`)
- Usa **namespace** para organizar versiones
- Crea **base controllers** por versión para lógica compartida
- **No elimines versiones antiguas** sin plan de deprecación
- Usa **deprecation headers** para avisar clientes
- **Testea todas las versiones** activas
- **Herencia de controladores** evita duplicación
- **Documenta breaking changes** claramente
- Versiona también **serializers** si los usas

---

**Siguiente**: [Formateo de respuestas](./response-format.md)
