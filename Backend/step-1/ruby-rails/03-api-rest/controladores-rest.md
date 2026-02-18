# 🎮 Controladores RESTful

Los controladores en Rails siguen el patrón REST con acciones estándar: `index`, `show`, `create`, `update` y `destroy`. Para APIs, renderizamos JSON en lugar de vistas HTML.

---

## 📌 Las 5 acciones REST estándar

```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      before_action :set_user, only: [:show, :update, :destroy]

      # GET /api/v1/users
      def index
        @users = User.all
        render json: @users
      end

      # GET /api/v1/users/:id
      def show
        render json: @user
      end

      # POST /api/v1/users
      def create
        @user = User.new(user_params)

        if @user.save
          render json: @user, status: :created, location: api_v1_user_url(@user)
        else
          render json: @user.errors, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/users/:id
      def update
        if @user.update(user_params)
          render json: @user
        else
          render json: @user.errors, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/users/:id
      def destroy
        @user.destroy
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def user_params
        params.require(:user).permit(:name, :email)
      end
    end
  end
end
```

---

## 🎯 Render JSON - Opciones avanzadas

### 1️⃣ Render básico

```ruby
# Renderiza todo el objeto
render json: @user

# Renderiza un array
render json: @users

# Renderiza con status HTTP
render json: @user, status: :created  # 201
render json: { error: "Not found" }, status: :not_found  # 404
```

### 2️⃣ Seleccionar campos específicos

```ruby
# Solo campos específicos
render json: @user, only: [:id, :name, :email]

# Excluir campos
render json: @user, except: [:password_digest, :created_at, :updated_at]
```

### 3️⃣ Incluir relaciones

```ruby
# Incluir asociaciones
render json: @user, include: :posts

# Incluir múltiples asociaciones
render json: @user, include: [:posts, :comments]

# Incluir anidado con control
render json: @user, include: {
  posts: { only: [:id, :title] },
  comments: { except: [:user_id] }
}
```

### 4️⃣ Métodos personalizados

```ruby
# app/models/user.rb
class User < ApplicationRecord
  def full_name
    "#{first_name} #{last_name}"
  end
end

# Controlador
render json: @user, methods: [:full_name]
```

### 5️⃣ Root key (opcional)

```ruby
# Con root key
render json: @users, root: 'users'
# { "users": [...] }

# Sin root key (default en Rails API mode)
render json: @users
# [...]
```

---

## 📊 Status Codes - Referencia completa

Rails provee **símbolos** para status codes HTTP:

```ruby
# Éxito (2xx)
render json: @user, status: :ok                    # 200
render json: @user, status: :created               # 201
render json: { message: "Deleted" }, status: :no_content  # 204

# Redirección (3xx)
render json: @user, status: :moved_permanently     # 301
render json: @user, status: :found                 # 302
render json: @user, status: :not_modified          # 304

# Error del cliente (4xx)
render json: { error: "Bad request" }, status: :bad_request           # 400
render json: { error: "Unauthorized" }, status: :unauthorized         # 401
render json: { error: "Forbidden" }, status: :forbidden               # 403
render json: { error: "Not found" }, status: :not_found               # 404
render json: { error: "Conflict" }, status: :conflict                 # 409
render json: @user.errors, status: :unprocessable_entity              # 422

# Error del servidor (5xx)
render json: { error: "Server error" }, status: :internal_server_error  # 500
render json: { error: "Service unavailable" }, status: :service_unavailable  # 503
```

### Tabla de status codes más usados

| Status | Símbolo | Cuándo usarlo |
|--------|---------|---------------|
| 200 | `:ok` | Operación exitosa (GET, PUT) |
| 201 | `:created` | Recurso creado (POST) |
| 204 | `:no_content` | Operación exitosa sin contenido (DELETE) |
| 400 | `:bad_request` | Request mal formado |
| 401 | `:unauthorized` | No autenticado |
| 403 | `:forbidden` | Autenticado pero sin permisos |
| 404 | `:not_found` | Recurso no existe |
| 422 | `:unprocessable_entity` | Validaciones fallaron |
| 500 | `:internal_server_error` | Error interno del servidor |

---

## 🔥 Ejemplo completo - Controlador profesional

```ruby
# app/controllers/api/v1/posts_controller.rb
module Api
  module V1
    class PostsController < ApplicationController
      before_action :authenticate_user!, except: [:index, :show]
      before_action :set_post, only: [:show, :update, :destroy]
      before_action :authorize_user!, only: [:update, :destroy]

      # GET /api/v1/posts
      def index
        @posts = Post.includes(:user)
                     .order(created_at: :desc)
                     .page(params[:page])
                     .per(params[:per_page] || 20)

        render json: @posts, include: { user: { only: [:id, :name] } }
      end

      # GET /api/v1/posts/:id
      def show
        render json: @post, include: [:user, :comments]
      end

      # POST /api/v1/posts
      def create
        @post = current_user.posts.new(post_params)

        if @post.save
          render json: @post, status: :created, location: api_v1_post_url(@post)
        else
          render json: { errors: @post.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/posts/:id
      def update
        if @post.update(post_params)
          render json: @post
        else
          render json: { errors: @post.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/posts/:id
      def destroy
        @post.destroy
        head :no_content
      end

      private

      def set_post
        @post = Post.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Post not found" }, status: :not_found
      end

      def authorize_user!
        unless @post.user_id == current_user.id
          render json: { error: "Forbidden" }, status: :forbidden
        end
      end

      def post_params
        params.require(:post).permit(:title, :body, :published)
      end
    end
  end
end
```

---

## 🆚 Comparación con Express y .NET

### Express (Node.js)

```javascript
// controllers/postsController.js
const Post = require('../models/Post');

exports.index = async (req, res) => {
  try {
    const posts = await Post.findAll({
      include: ['user'],
      order: [['createdAt', 'DESC']],
      limit: req.query.perPage || 20,
      offset: (req.query.page - 1) * (req.query.perPage || 20)
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const post = await Post.create({
      ...req.body,
      userId: req.user.id
    });
    res.status(201).json(post);
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      res.status(422).json({ errors: error.errors.map(e => e.message) });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};
```

### .NET Core

```csharp
// Controllers/PostsController.cs
[ApiController]
[Route("api/v1/[controller]")]
public class PostsController : ControllerBase
{
    private readonly AppDbContext _context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Post>>> GetPosts(
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 20)
    {
        var posts = await _context.Posts
            .Include(p => p.User)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync();

        return Ok(posts);
    }

    [HttpPost]
    public async Task<ActionResult<Post>> CreatePost(CreatePostDto postDto)
    {
        var post = new Post
        {
            Title = postDto.Title,
            Body = postDto.Body,
            UserId = User.GetUserId()
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, post);
    }
}
```

| Aspecto | Rails | Express | .NET Core |
|---------|-------|---------|-----------|
| **Estructura** | Convenciones fuertes | Manual | Attribute routing |
| **Manejo de errores** | Integrado (rescue_from) | Try/catch manual | Exception filters |
| **Validaciones** | En modelos | Manual/Joi | Data annotations |
| **Status codes** | Símbolos (`:created`) | Números (201) | Helpers (`CreatedAtAction`) |
| **Paginación** | Gemas (kaminari/pagy) | Manual | Manual/PagedList |

---

## 🎓 Mejores prácticas

### 1️⃣ Usa before_action para DRY

```ruby
class PostsController < ApplicationController
  before_action :set_post, only: [:show, :update, :destroy]
  before_action :authenticate_user!, except: [:index, :show]
  before_action :authorize_user!, only: [:update, :destroy]
end
```

### 2️⃣ Maneja errores globalmente

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity

  private

  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: { errors: exception.record.errors.full_messages }, status: :unprocessable_entity
  end
end
```

### 3️⃣ Usa serializers para JSON complejo

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :created_at
  has_many :posts
end

# Controlador
render json: @user, serializer: UserSerializer
```

### 4️⃣ Incluye location header en POST

```ruby
def create
  @post = Post.create!(post_params)
  render json: @post, status: :created, location: api_v1_post_url(@post)
end
```

### 5️⃣ Usa head para respuestas sin body

```ruby
def destroy
  @post.destroy
  head :no_content  # Más eficiente que render json: {}
end
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Controlador básico

Crea un controlador `ArticlesController` con las 5 acciones REST estándar.

<details>
<summary>Ver solución</summary>

```ruby
# app/controllers/api/v1/articles_controller.rb
module Api
  module V1
    class ArticlesController < ApplicationController
      before_action :set_article, only: [:show, :update, :destroy]

      def index
        @articles = Article.all
        render json: @articles
      end

      def show
        render json: @article
      end

      def create
        @article = Article.new(article_params)

        if @article.save
          render json: @article, status: :created
        else
          render json: @article.errors, status: :unprocessable_entity
        end
      end

      def update
        if @article.update(article_params)
          render json: @article
        else
          render json: @article.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @article.destroy
        head :no_content
      end

      private

      def set_article
        @article = Article.find(params[:id])
      end

      def article_params
        params.require(:article).permit(:title, :content, :published)
      end
    end
  end
end
```
</details>

### Ejercicio 2: Manejo de errores

Agrega manejo de errores personalizado para `RecordNotFound`.

<details>
<summary>Ver solución</summary>

```ruby
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found

  private

  def record_not_found(exception)
    render json: {
      error: "Record not found",
      message: exception.message
    }, status: :not_found
  end
end
```
</details>

### Ejercicio 3: Respuesta con include

Crea un endpoint que devuelva un usuario con sus posts y comentarios.

<details>
<summary>Ver solución</summary>

```ruby
def show
  @user = User.find(params[:id])
  render json: @user, include: {
    posts: { only: [:id, :title, :created_at] },
    comments: { only: [:id, :body] }
  }
end
```
</details>

---

## 🔗 Recursos adicionales

- [Rails API Documentation](https://api.rubyonrails.org/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [ActiveModel::Serializers](https://github.com/rails-api/active_model_serializers)
- [Jbuilder](https://github.com/rails/jbuilder) (alternativa a serializers)

---

## 📝 Resumen

- Rails provee **convenciones RESTful** estándar: index, show, create, update, destroy
- Usa **símbolos** para status codes: `:created`, `:not_found`, etc.
- `render json:` acepta opciones: `only`, `except`, `include`, `methods`
- **before_action** evita código duplicado
- **rescue_from** centraliza manejo de errores
- Usa **serializers** para JSON complejo
- Incluye **location header** en POST exitosos
- Usa **head :no_content** para DELETE exitosos

---

**Siguiente**: [Strong Parameters](./strong-params.md)
