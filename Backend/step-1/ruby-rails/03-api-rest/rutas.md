# 🛣️ Rutas en Rails

El sistema de rutas de Rails es **RESTful por defecto** y sigue convenciones estrictas. En este archivo aprenderás desde `resources` básico hasta rutas avanzadas con `namespace`, `scope` y `constraints`.

---

## 📌 Resources - La base de todo

`resources` genera automáticamente las 7 rutas RESTful estándar:

```ruby
# config/routes.rb
Rails.application.routes.draw do
  resources :posts
end
```

**Genera**:

| Método HTTP | Path | Controller#Action | Nombre de ruta |
|-------------|------|-------------------|----------------|
| GET | `/posts` | `posts#index` | `posts_path` |
| GET | `/posts/new` | `posts#new` | `new_post_path` |
| POST | `/posts` | `posts#create` | `posts_path` |
| GET | `/posts/:id` | `posts#show` | `post_path(id)` |
| GET | `/posts/:id/edit` | `posts#edit` | `edit_post_path(id)` |
| PATCH/PUT | `/posts/:id` | `posts#update` | `post_path(id)` |
| DELETE | `/posts/:id` | `posts#destroy` | `post_path(id)` |

### Ver todas las rutas

```bash
rails routes
# o más legible
rails routes -c posts  # Solo rutas de posts
rails routes -g api    # Rutas que contengan "api"
```

---

## 🔥 Resources - Opciones avanzadas

### 1️⃣ Limitar acciones

```ruby
# Solo index y show
resources :posts, only: [:index, :show]

# Todas excepto new y edit (común en APIs)
resources :posts, except: [:new, :edit]
```

### 2️⃣ Rutas anidadas (nested routes)

```ruby
resources :posts do
  resources :comments
end
```

**Genera**:
```
GET    /posts/:post_id/comments          comments#index
POST   /posts/:post_id/comments          comments#create
GET    /posts/:post_id/comments/:id      comments#show
PATCH  /posts/:post_id/comments/:id      comments#update
DELETE /posts/:post_id/comments/:id      comments#destroy
```

**En controlador**:
```ruby
class CommentsController < ApplicationController
  def index
    @post = Post.find(params[:post_id])
    @comments = @post.comments
    render json: @comments
  end
end
```

### 3️⃣ Shallow nesting (evita rutas muy largas)

```ruby
resources :posts do
  resources :comments, shallow: true
end
```

**Genera**:
```
# Crear comentario necesita post_id
POST   /posts/:post_id/comments          comments#create

# Leer/actualizar/borrar usa solo comment_id
GET    /comments/:id                     comments#show
PATCH  /comments/:id                     comments#update
DELETE /comments/:id                     comments#destroy
```

### 4️⃣ Singular resource (no usa ID)

```ruby
# Para recursos singleton (perfil del usuario actual, configuración, etc.)
resource :profile, only: [:show, :update]
```

**Genera**:
```
GET    /profile       profiles#show
PATCH  /profile       profiles#update
```

---

## 🎯 Member routes vs Collection routes

### Member routes (operan sobre UN recurso específico)

```ruby
resources :posts do
  member do
    post :publish      # POST /posts/:id/publish
    delete :archive    # DELETE /posts/:id/archive
  end
end

# Atajo para una sola ruta
resources :posts do
  post :publish, on: :member
end
```

**En controlador**:
```ruby
class PostsController < ApplicationController
  def publish
    @post = Post.find(params[:id])
    @post.update(published: true)
    render json: @post
  end
end
```

### Collection routes (operan sobre la COLECCIÓN)

```ruby
resources :posts do
  collection do
    get :trending      # GET /posts/trending
    post :bulk_delete  # POST /posts/bulk_delete
  end
end

# Atajo para una sola ruta
resources :posts do
  get :trending, on: :collection
end
```

**En controlador**:
```ruby
class PostsController < ApplicationController
  def trending
    @posts = Post.where("views > ?", 1000).order(views: :desc)
    render json: @posts
  end

  def bulk_delete
    Post.where(id: params[:ids]).destroy_all
    head :no_content
  end
end
```

---

## 📦 Namespace (organizar rutas por versión o área)

```ruby
namespace :api do
  namespace :v1 do
    resources :posts
    resources :users
  end

  namespace :v2 do
    resources :posts
  end
end
```

**Genera**:
```
GET    /api/v1/posts          Api::V1::PostsController#index
GET    /api/v2/posts          Api::V2::PostsController#index
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

**Controlador**:
```ruby
# app/controllers/api/v1/posts_controller.rb
module Api
  module V1
    class PostsController < ApplicationController
      def index
        @posts = Post.all
        render json: @posts
      end
    end
  end
end
```

---

## 🔧 Scope (modificar path o module sin afectar nombres)

### 1️⃣ Cambiar path sin cambiar controlador

```ruby
scope path: '/api' do
  resources :posts  # => /api/posts
end
```

### 2️⃣ Cambiar module sin cambiar path

```ruby
scope module: 'api' do
  resources :posts  # => /posts, pero Api::PostsController
end
```

### 3️⃣ Cambiar ambos

```ruby
scope path: '/api/v1', module: 'api/v1' do
  resources :posts
end
```

### 4️⃣ Agregar defaults (params por defecto)

```ruby
scope defaults: { format: :json } do
  resources :posts
end
```

### 5️⃣ Scope con constraints

```ruby
scope constraints: { subdomain: 'api' } do
  resources :posts
end
# Solo responde si el request viene de api.example.com
```

---

## ⚙️ Constraints (condicionales avanzados)

### 1️⃣ Constraints simples

```ruby
# Solo acepta IDs numéricos
resources :posts, constraints: { id: /\d+/ }

# Acepta subdominios específicos
constraints subdomain: 'api' do
  resources :posts
end

# Acepta múltiples subdominios
constraints subdomain: /api|admin/ do
  resources :posts
end
```

### 2️⃣ Constraints por formato

```ruby
# Solo acepta JSON
constraints format: :json do
  resources :posts
end
```

### 3️⃣ Constraints por versión en header

```ruby
# config/routes.rb
constraints ApiVersionConstraint.new(version: 1) do
  namespace :v1 do
    resources :posts
  end
end

constraints ApiVersionConstraint.new(version: 2) do
  namespace :v2 do
    resources :posts
  end
end
```

**Clase de constraint**:
```ruby
# lib/api_version_constraint.rb
class ApiVersionConstraint
  def initialize(version:)
    @version = version
  end

  def matches?(request)
    request.headers['Accept'].include?("application/vnd.myapp.v#{@version}+json")
  end
end
```

**Uso**:
```bash
# Request con header
curl -H "Accept: application/vnd.myapp.v1+json" http://localhost:3000/posts
```

### 4️⃣ Constraints por IP

```ruby
constraints(ip: /192\.168\.1\.\d+/) do
  resources :admin_posts
end
```

### 5️⃣ Constraints con lambda

```ruby
constraints lambda { |req| req.headers['User-Agent'] =~ /iPhone/ } do
  resources :mobile_posts
end
```

---

## 🆚 Comparación con Express y .NET

### Express (Node.js)

```javascript
// routes/posts.js
const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');

// Rutas RESTful manuales
router.get('/', postsController.index);
router.get('/:id', postsController.show);
router.post('/', postsController.create);
router.put('/:id', postsController.update);
router.delete('/:id', postsController.destroy);

// Member routes manuales
router.post('/:id/publish', postsController.publish);

// Collection routes manuales
router.get('/trending', postsController.trending);

// Versionado con prefijo
const v1Router = express.Router();
v1Router.use('/posts', router);
app.use('/api/v1', v1Router);

module.exports = router;
```

### .NET Core

```csharp
// Controllers/PostsController.cs
[ApiController]
[Route("api/v1/[controller]")]
public class PostsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Post>>> GetPosts() { }

    [HttpGet("{id}")]
    public async Task<ActionResult<Post>> GetPost(int id) { }

    [HttpPost]
    public async Task<ActionResult<Post>> CreatePost(Post post) { }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdatePost(int id, Post post) { }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeletePost(int id) { }

    // Member route
    [HttpPost("{id}/publish")]
    public async Task<ActionResult> PublishPost(int id) { }

    // Collection route
    [HttpGet("trending")]
    public async Task<ActionResult<IEnumerable<Post>>> GetTrendingPosts() { }
}
```

| Aspecto | Rails | Express | .NET Core |
|---------|-------|---------|-----------|
| **Routing** | Convención (`resources`) | Manual | Atributos (`[HttpGet]`) |
| **RESTful** | Por defecto | Manual | Convención |
| **Versionado** | `namespace :v1` | Prefijos manuales | Route constraints |
| **Nested routes** | Automático | Manual | Manual |
| **Constraints** | Integrado | Middleware | Route constraints |

---

## 🎓 Mejores prácticas

### 1️⃣ Organiza APIs por versión

```ruby
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :posts do
        resources :comments, shallow: true
      end
      resources :users
    end

    namespace :v2 do
      resources :posts
    end
  end
end
```

### 2️⃣ Usa scope para defaults comunes

```ruby
scope defaults: { format: :json } do
  namespace :api do
    namespace :v1 do
      resources :posts
    end
  end
end
```

### 3️⃣ Evita nesting profundo (max 1 nivel)

```ruby
# ❌ Mal - muy profundo
resources :users do
  resources :posts do
    resources :comments do
      resources :likes  # /users/:user_id/posts/:post_id/comments/:comment_id/likes
    end
  end
end

# ✅ Bien - shallow o separado
resources :users do
  resources :posts, shallow: true
end

resources :comments do
  resources :likes, shallow: true
end
```

### 4️⃣ Usa concerns para rutas compartidas

```ruby
# config/routes.rb
concern :commentable do
  resources :comments, shallow: true
end

concern :likeable do
  resources :likes, only: [:create, :destroy]
end

resources :posts, concerns: [:commentable, :likeable]
resources :articles, concerns: [:commentable, :likeable]
```

### 5️⃣ Define root para APIs

```ruby
Rails.application.routes.draw do
  root to: proc { [200, {}, ['API v1.0']] }

  namespace :api do
    namespace :v1 do
      resources :posts
    end
  end
end
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Rutas básicas con recursos

Crea rutas para `articles` con solo index, show y create.

<details>
<summary>Ver solución</summary>

```ruby
resources :articles, only: [:index, :show, :create]
```
</details>

### Ejercicio 2: Nested routes

Crea rutas anidadas para `posts` y `comments` con shallow nesting.

<details>
<summary>Ver solución</summary>

```ruby
resources :posts do
  resources :comments, shallow: true
end
```
</details>

### Ejercicio 3: Namespace con versiones

Crea namespaces para api/v1 y api/v2 con posts.

<details>
<summary>Ver solución</summary>

```ruby
namespace :api do
  namespace :v1 do
    resources :posts
  end

  namespace :v2 do
    resources :posts
  end
end
```
</details>

### Ejercicio 4: Member y collection routes

Agrega una ruta member `publish` y una collection `trending` a posts.

<details>
<summary>Ver solución</summary>

```ruby
resources :posts do
  post :publish, on: :member
  get :trending, on: :collection
end
```
</details>

### Ejercicio 5: Constraints

Crea rutas que solo acepten JSON.

<details>
<summary>Ver solución</summary>

```ruby
constraints format: :json do
  resources :posts
end

# o con defaults
scope defaults: { format: :json } do
  resources :posts
end
```
</details>

---

## 🔗 Recursos adicionales

- [Rails Routing Guide](https://guides.rubyonrails.org/routing.html)
- [Advanced Constraints](https://edgeguides.rubyonrails.org/routing.html#advanced-constraints)
- [Routing Concerns](https://guides.rubyonrails.org/routing.html#routing-concerns)

---

## 📝 Resumen

- `resources :posts` genera las 7 rutas RESTful estándar
- Usa `only:` o `except:` para limitar rutas
- **Member routes** operan sobre un recurso: `/posts/:id/publish`
- **Collection routes** operan sobre la colección: `/posts/trending`
- **namespace** cambia path, module y nombres de ruta
- **scope** permite modificar path, module o defaults sin afectar lo demás
- **constraints** permiten rutas condicionales (subdomain, format, headers, IP)
- Usa **shallow nesting** para evitar URLs largas
- Organiza APIs por versión con namespace
- Evita nesting profundo (max 1 nivel)

---

**Siguiente**: [Versionado básico](./versionado-basico.md)
