# ¿Qué es Rails?

**Ruby on Rails** (o simplemente **Rails**) es un framework web MVC escrito en Ruby.

---

## 🧩 Filosofía de Rails

### 1. Convention over Configuration (CoC)

No necesitas configurar todo manualmente. Rails asume convenciones inteligentes.

**Ejemplo**:

```ruby
# Rails automáticamente sabe que User usa la tabla "users"
class User < ApplicationRecord
end

# Y que UsersController maneja las rutas de /users
class UsersController < ApplicationController
end
```

**Sin configuración**:
- Nombre de tabla = nombre de clase en plural y snake_case
- Controlador = nombre del modelo + "Controller"
- Vista = nombre de la acción del controlador

---

### 2. DRY (Don't Repeat Yourself)

Evita duplicar código usando:
- **Helpers**
- **Partials**
- **Concerns**
- **Service Objects**

**Ejemplo**:

```ruby
# ❌ MAL - código duplicado
class PostsController
  def create
    @post = Post.new(post_params)
    if @post.save
      render json: @post, status: :created
    else
      render json: @post.errors, status: :unprocessable_entity
    end
  end
end

class CommentsController
  def create
    @comment = Comment.new(comment_params)
    if @comment.save
      render json: @comment, status: :created
    else
      render json: @comment.errors, status: :unprocessable_entity
    end
  end
end

# ✅ BIEN - lógica compartida
class ApplicationController < ActionController::API
  def render_resource(resource)
    if resource.save
      render json: resource, status: :created
    else
      render json: resource.errors, status: :unprocessable_entity
    end
  end
end

class PostsController < ApplicationController
  def create
    render_resource(Post.new(post_params))
  end
end
```

---

### 3. RESTful by default

Rails está diseñado para **APIs REST**.

```ruby
# config/routes.rb
resources :users
```

Genera automáticamente:

```
GET    /users          -> UsersController#index
POST   /users          -> UsersController#create
GET    /users/:id      -> UsersController#show
PUT    /users/:id      -> UsersController#update
DELETE /users/:id      -> UsersController#destroy
```

---

## 🏗️ MVC (Model-View-Controller)

Rails separa la lógica en 3 capas:

### Model (Modelo)
- Lógica de negocio
- Validaciones
- Relaciones con otros modelos
- Interacción con la base de datos

```ruby
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true
  has_many :posts
end
```

---

### View (Vista)
En **API mode**, usamos **serializers** en lugar de vistas HTML.

```ruby
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email
end
```

---

### Controller (Controlador)
- Maneja las requests HTTP
- Coordina modelos y vistas
- Retorna responses

```ruby
class UsersController < ApplicationController
  def index
    users = User.all
    render json: users
  end
end
```

---

## 🎯 Rails vs otros frameworks

| Aspecto | Rails | Express.js | .NET |
|---------|-------|------------|------|
| **Filosofía** | Opinionado | Minimalista | Equilibrado |
| **ORM** | ActiveRecord | Sequelize (opcional) | Entity Framework |
| **Routing** | Automático (REST) | Manual | Basado en atributos |
| **Productividad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Curva de aprendizaje** | Media | Baja | Media |

---

## 🔥 Cuándo usar Rails

### ✅ Ideal para:
- **APIs REST** (con ActiveRecord)
- **MVPs rápidos**
- **Startups** (mucha funcionalidad, poco código)
- **CRUD intensivo** (ActiveRecord brilla aquí)
- Equipos que valoran **convenciones**

### ⚠️ Considera alternativas si:
- Necesitas **máximo performance** (Go, Rust, .NET)
- Tu app es **muy simple** (Sinatra, FastAPI)
- Necesitas **mucho control** (Express, FastAPI)
- Tu equipo prefiere **poca magia** (Express)

---

## 📦 Ecosystem (Gemas)

Rails tiene **gemas** (librerías) para casi todo:

| Necesidad | Gema |
|-----------|------|
| Autenticación | `devise`, `jwt` |
| Autorización | `pundit`, `cancancan` |
| Background jobs | `sidekiq`, `resque` |
| File uploads | `active_storage`, `carrierwave` |
| Testing | `rspec-rails`, `factory_bot` |
| API serializers | `active_model_serializers`, `fast_jsonapi` |

---

## 🧪 Versiones de Rails

- **Rails 7.x** (actual, 2024+)
  - Mejor soporte para APIs
  - Hotwire (Turbo + Stimulus)
  - Importmap

- **Rails 6.x** (estable)
  - ActionMailbox
  - ActionText
  - Parallel testing

- **Rails 5.x** (legacy)
  - API mode

**Consejo**: usa **Rails 7.x** para proyectos nuevos.

---

## 🎯 Rails API mode

Para **solo backend**, usa modo API:

```bash
rails new my_api --api
```

**Diferencias**:
- ❌ Sin vistas HTML
- ❌ Sin assets (CSS, JS)
- ✅ Solo JSON
- ✅ Más ligero y rápido
- ✅ Configurado para CORS

---

## 💡 Principios a recordar

1. **Sigue las convenciones** → menos configuración
2. **Usa el generador de Rails** → estructura correcta automáticamente
3. **Confía en ActiveRecord** → no escribas SQL a menos que sea necesario
4. **Aprovecha las gemas** → no reinventes la rueda

---

## 📖 Documentación oficial

- https://guides.rubyonrails.org/
- https://api.rubyonrails.org/
- https://edgeguides.rubyonrails.org/ (versión en desarrollo)

---

**Siguiente**: [estructura-proyecto.md](./estructura-proyecto.md)
