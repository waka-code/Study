# 📦 Formateo de Respuestas JSON

Una API profesional necesita respuestas **consistentes** y **bien estructuradas**. Este archivo cubre serializers, formateo de errores y convenciones JSON.

---

## 📌 Render básico vs Serializers

### Render básico (para APIs simples)

```ruby
# Simple pero limitado
render json: @user

# Con opciones
render json: @user, only: [:id, :name, :email], methods: [:full_name]
```

**Problemas**:
- Lógica de presentación en controlador
- Difícil de reutilizar
- No escala bien
- Mezcla responsabilidades

### Serializers (para APIs profesionales)

```ruby
# Limpio y reutilizable
render json: @user, serializer: UserSerializer
```

---

## 🔥 ActiveModel::Serializers

La gema más popular para serialización en Rails.

### Instalación

```ruby
# Gemfile
gem 'active_model_serializers', '~> 0.10.0'

# Instalar
bundle install

# Generar serializer
rails g serializer user
```

### Serializer básico

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :created_at

  # Método personalizado
  def created_at
    object.created_at.strftime('%Y-%m-%d')
  end
end

# Controlador
render json: @user  # Usa UserSerializer automáticamente
```

### Asociaciones

```ruby
# app/serializers/post_serializer.rb
class PostSerializer < ActiveModel::Serializer
  attributes :id, :title, :body, :created_at

  # Asociación belongs_to
  belongs_to :user

  # Asociación has_many
  has_many :comments
end

# Respuesta JSON
{
  "id": 1,
  "title": "My Post",
  "body": "Content",
  "created_at": "2024-01-15",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "comments": [
    { "id": 1, "body": "Great post!" },
    { "id": 2, "body": "Thanks for sharing" }
  ]
}
```

### Métodos personalizados

```ruby
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :full_name, :posts_count

  def full_name
    "#{object.first_name} #{object.last_name}"
  end

  def posts_count
    object.posts.count
  end
end
```

### Condicionales

```ruby
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :admin

  # Solo mostrar admin si el usuario actual es admin
  def admin
    object.admin? if scope&.admin?
  end

  # O excluir el atributo completamente
  def attributes(*args)
    hash = super
    hash.delete(:admin) unless scope&.admin?
    hash
  end
end

# En controlador, pasar scope
render json: @user, scope: current_user
```

---

## 🎯 Jbuilder (alternativa a serializers)

Jbuilder viene **incluido por defecto** en Rails y usa DSL para construir JSON.

### Ejemplo básico

```ruby
# app/views/api/v1/posts/index.json.jbuilder
json.array! @posts do |post|
  json.id post.id
  json.title post.title
  json.body post.body
  json.created_at post.created_at

  json.user do
    json.id post.user.id
    json.name post.user.name
  end
end
```

### Con parciales

```ruby
# app/views/api/v1/posts/_post.json.jbuilder
json.extract! post, :id, :title, :body, :created_at
json.user do
  json.partial! 'api/v1/users/user', user: post.user
end

# app/views/api/v1/posts/index.json.jbuilder
json.array! @posts, partial: 'api/v1/posts/post', as: :post
```

---

## 📊 Formateo de errores estandarizado

### 1️⃣ Errores de validación

```ruby
# app/controllers/api/v1/posts_controller.rb
def create
  @post = Post.new(post_params)

  if @post.save
    render json: @post, status: :created
  else
    render json: {
      errors: format_errors(@post.errors)
    }, status: :unprocessable_entity
  end
end

private

def format_errors(errors)
  errors.messages.map do |field, messages|
    {
      field: field,
      messages: messages
    }
  end
end
```

**Respuesta**:
```json
{
  "errors": [
    {
      "field": "title",
      "messages": ["can't be blank"]
    },
    {
      "field": "email",
      "messages": ["is invalid", "has already been taken"]
    }
  ]
}
```

### 2️⃣ Serializer de errores reutilizable

```ruby
# app/serializers/error_serializer.rb
class ErrorSerializer
  def initialize(errors)
    @errors = errors
  end

  def serialize
    {
      errors: @errors.messages.map do |field, messages|
        messages.map do |message|
          {
            field: field,
            message: "#{field.to_s.humanize} #{message}",
            code: error_code(field, message)
          }
        end
      end.flatten
    }
  end

  private

  def error_code(field, message)
    case message
    when "can't be blank" then 'REQUIRED'
    when "is invalid" then 'INVALID_FORMAT'
    when "has already been taken" then 'DUPLICATE'
    else 'VALIDATION_ERROR'
    end
  end
end

# En controlador
render json: ErrorSerializer.new(@post.errors).serialize, status: :unprocessable_entity
```

**Respuesta**:
```json
{
  "errors": [
    {
      "field": "title",
      "message": "Title can't be blank",
      "code": "REQUIRED"
    },
    {
      "field": "email",
      "message": "Email is invalid",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

### 3️⃣ Manejo global de errores

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :bad_request

  private

  def not_found(exception)
    render json: {
      error: {
        type: 'NotFound',
        message: exception.message,
        code: 'RESOURCE_NOT_FOUND'
      }
    }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: ErrorSerializer.new(exception.record.errors).serialize,
           status: :unprocessable_entity
  end

  def bad_request(exception)
    render json: {
      error: {
        type: 'BadRequest',
        message: exception.message,
        code: 'PARAMETER_MISSING'
      }
    }, status: :bad_request
  end
end
```

---

## 🧩 Convenciones JSON - Formato estándar

### JSON:API Specification

Formato estandarizado para APIs REST.

```ruby
# Gemfile
gem 'jsonapi-serializer'

# app/serializers/post_serializer.rb
class PostSerializer
  include JSONAPI::Serializer

  attributes :title, :body, :created_at
  belongs_to :user
  has_many :comments
end

# Respuesta
{
  "data": {
    "id": "1",
    "type": "post",
    "attributes": {
      "title": "My Post",
      "body": "Content",
      "created_at": "2024-01-15T10:00:00Z"
    },
    "relationships": {
      "user": {
        "data": { "id": "1", "type": "user" }
      },
      "comments": {
        "data": [
          { "id": "1", "type": "comment" },
          { "id": "2", "type": "comment" }
        ]
      }
    }
  },
  "included": [
    {
      "id": "1",
      "type": "user",
      "attributes": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

---

## 🆚 Comparación con Express y .NET

### Express (Node.js)

```javascript
// serializers/userSerializer.js
class UserSerializer {
  constructor(user) {
    this.user = user;
  }

  toJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      email: this.user.email,
      createdAt: this.user.createdAt
    };
  }
}

// controllers/usersController.js
exports.show = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  res.json(new UserSerializer(user).toJSON());
};

// Error handling
exports.create = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(new UserSerializer(user).toJSON());
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      res.status(422).json({
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
  }
};
```

### .NET Core

```csharp
// DTOs/UserDto.cs
public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Controllers/UsersController.cs
[HttpGet("{id}")]
public async Task<ActionResult<UserDto>> GetUser(int id)
{
    var user = await _context.Users.FindAsync(id);
    if (user == null)
        return NotFound(new { error = "User not found" });

    return Ok(_mapper.Map<UserDto>(user));
}

[HttpPost]
public async Task<ActionResult<UserDto>> CreateUser(CreateUserDto dto)
{
    if (!ModelState.IsValid)
    {
        return BadRequest(new
        {
            errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => new { message = e.ErrorMessage })
        });
    }

    var user = _mapper.Map<User>(dto);
    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetUser),
        new { id = user.Id },
        _mapper.Map<UserDto>(user));
}
```

| Aspecto | Rails | Express | .NET Core |
|---------|-------|---------|-----------|
| **Serializers** | ActiveModel::Serializer | Manual | AutoMapper + DTOs |
| **Error format** | Manual/gemas | Manual | ModelState |
| **Convenciones** | JSON:API opcional | Manual | ProblemDetails |
| **Automático** | Serializer por modelo | Manual | Configuración |

---

## 🎓 Mejores prácticas

### 1️⃣ Un serializer por modelo

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email
end

# app/serializers/post_serializer.rb
class PostSerializer < ActiveModel::Serializer
  attributes :id, :title, :body
  belongs_to :user
end
```

### 2️⃣ Serializers por versión

```ruby
# app/serializers/api/v1/user_serializer.rb
module Api::V1
  class UserSerializer < ActiveModel::Serializer
    attributes :id, :name, :email
  end
end

# app/serializers/api/v2/user_serializer.rb
module Api::V2
  class UserSerializer < ActiveModel::Serializer
    attributes :id, :name, :email, :avatar_url, :bio
  end
end
```

### 3️⃣ Usa concern para formateo de errores

```ruby
# app/controllers/concerns/error_handler.rb
module ErrorHandler
  extend ActiveSupport::Concern

  included do
    rescue_from ActiveRecord::RecordNotFound, with: :not_found
    rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
  end

  private

  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: ErrorSerializer.new(exception.record.errors).serialize,
           status: :unprocessable_entity
  end
end

# En controladores
class ApplicationController < ActionController::API
  include ErrorHandler
end
```

### 4️⃣ Documenta estructura de respuestas

```ruby
# app/controllers/api/v1/posts_controller.rb
class PostsController < ApplicationController
  # GET /api/v1/posts
  # Response:
  # [
  #   {
  #     "id": 1,
  #     "title": "string",
  #     "body": "string",
  #     "created_at": "2024-01-15T10:00:00Z",
  #     "user": {
  #       "id": 1,
  #       "name": "string"
  #     }
  #   }
  # ]
  def index
    @posts = Post.all
    render json: @posts
  end
end
```

### 5️⃣ Incluye metadata en colecciones

```ruby
def index
  @posts = Post.page(params[:page]).per(10)

  render json: {
    data: ActiveModelSerializers::SerializableResource.new(@posts),
    meta: {
      current_page: @posts.current_page,
      total_pages: @posts.total_pages,
      total_count: @posts.total_count,
      per_page: @posts.limit_value
    }
  }
end
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Serializer básico

Crea un serializer para User con id, name, email.

<details>
<summary>Ver solución</summary>

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email
end
```
</details>

### Ejercicio 2: Serializer con asociaciones

Crea un serializer para Post que incluya user y comments.

<details>
<summary>Ver solución</summary>

```ruby
class PostSerializer < ActiveModel::Serializer
  attributes :id, :title, :body, :created_at
  belongs_to :user
  has_many :comments
end
```
</details>

### Ejercicio 3: Formateo de errores

Crea un serializer de errores que devuelva field, message y code.

<details>
<summary>Ver solución</summary>

```ruby
class ErrorSerializer
  def initialize(errors)
    @errors = errors
  end

  def serialize
    {
      errors: @errors.messages.map do |field, messages|
        messages.map do |message|
          {
            field: field,
            message: "#{field.to_s.humanize} #{message}",
            code: error_code(message)
          }
        end
      end.flatten
    }
  end

  private

  def error_code(message)
    case message
    when "can't be blank" then 'REQUIRED'
    when "is invalid" then 'INVALID_FORMAT'
    else 'VALIDATION_ERROR'
    end
  end
end
```
</details>

---

## 🔗 Recursos adicionales

- [ActiveModel::Serializers](https://github.com/rails-api/active_model_serializers)
- [Jbuilder](https://github.com/rails/jbuilder)
- [JSON:API Specification](https://jsonapi.org/)
- [jsonapi-serializer](https://github.com/jsonapi-serializer/jsonapi-serializer)

---

## 📝 Resumen

- **Serializers** separan lógica de presentación del controlador
- **ActiveModel::Serializers** es la gema más popular
- **Jbuilder** es alternativa incluida por defecto
- **Formateo de errores** debe ser consistente y reutilizable
- Usa **ErrorSerializer** para validaciones
- Maneja errores **globalmente** con rescue_from
- **JSON:API** es estándar para APIs complejas
- **Documenta** estructura de respuestas
- Incluye **metadata** en colecciones (paginación, totales)

---

**Siguiente**: [Paginación básica](./paginacion-basica.md)
