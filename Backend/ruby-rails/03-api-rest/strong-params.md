# 🔒 Strong Parameters

Strong Parameters es el sistema de seguridad de Rails para proteger contra **mass assignment attacks**. Es obligatorio en Rails 4+ y reemplaza `attr_accessible`.

---

## 📌 ¿Qué es Mass Assignment?

Mass assignment permite actualizar múltiples atributos a la vez:

```ruby
# Mass assignment
user = User.new(params[:user])
user.update(params[:user])
```

**Problema**: sin protección, un atacante podría enviar:

```json
{
  "user": {
    "name": "John",
    "email": "john@example.com",
    "admin": true  // ⚠️ ¡Peligro!
  }
}
```

---

## 🛡️ Strong Parameters - Sintaxis básica

### 1️⃣ require y permit

```ruby
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)
    @user.save
  end

  private

  def user_params
    # require: el hash debe tener la key "user"
    # permit: solo estos campos están permitidos
    params.require(:user).permit(:name, :email, :password)
  end
end
```

**Request válido**:
```json
{
  "user": {
    "name": "John",
    "email": "john@example.com",
    "password": "secret123"
  }
}
```

**Request inválido** (sin key "user"):
```json
{
  "name": "John",
  "email": "john@example.com"
}
// ActionController::ParameterMissing
```

### 2️⃣ Permitir arrays

```ruby
def post_params
  params.require(:post).permit(:title, :body, tag_ids: [])
end
```

**Request**:
```json
{
  "post": {
    "title": "My post",
    "body": "Content",
    "tag_ids": [1, 2, 3]
  }
}
```

### 3️⃣ Nested params (parámetros anidados)

```ruby
def user_params
  params.require(:user).permit(
    :name,
    :email,
    address_attributes: [:street, :city, :zip]
  )
end
```

**Request**:
```json
{
  "user": {
    "name": "John",
    "email": "john@example.com",
    "address_attributes": {
      "street": "123 Main St",
      "city": "NYC",
      "zip": "10001"
    }
  }
}
```

### 4️⃣ Arrays de objetos anidados

```ruby
def post_params
  params.require(:post).permit(
    :title,
    :body,
    comments_attributes: [:id, :body, :_destroy]
  )
end
```

**Request**:
```json
{
  "post": {
    "title": "My post",
    "body": "Content",
    "comments_attributes": [
      { "body": "Great post!" },
      { "id": 5, "body": "Updated comment" },
      { "id": 7, "_destroy": true }
    ]
  }
}
```

---

## 🔥 Casos de uso avanzados

### 1️⃣ Parámetros opcionales

```ruby
def user_params
  # Campos obligatorios
  required = params.require(:user).permit(:name, :email)

  # Agregar campos opcionales si existen
  required[:avatar] = params[:user][:avatar] if params[:user][:avatar].present?

  required
end
```

### 2️⃣ Parámetros condicionales

```ruby
def user_params
  permitted = [:name, :email]

  # Solo admins pueden cambiar el rol
  permitted << :role if current_user.admin?

  params.require(:user).permit(permitted)
end
```

### 3️⃣ Múltiples permisos según acción

```ruby
def user_params
  if action_name == 'create'
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
  elsif action_name == 'update'
    params.require(:user).permit(:name, :email)
  end
end
```

### 4️⃣ Parámetros sin require (para query params)

```ruby
def index
  @users = User.all

  # Filtros opcionales sin require
  @users = @users.where(role: filter_params[:role]) if filter_params[:role].present?
  @users = @users.where("created_at > ?", filter_params[:since]) if filter_params[:since].present?

  render json: @users
end

private

def filter_params
  # permit sin require para query params opcionales
  params.permit(:role, :since, :page, :per_page)
end
```

---

## 🧩 Nested attributes - Accept nested

Para aceptar nested attributes en modelos:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one :address
  has_many :posts

  # Permite crear/actualizar address al crear/actualizar user
  accepts_nested_attributes_for :address

  # Permite crear/actualizar/destruir posts
  accepts_nested_attributes_for :posts, allow_destroy: true
end

# app/controllers/api/v1/users_controller.rb
def user_params
  params.require(:user).permit(
    :name,
    :email,
    address_attributes: [:id, :street, :city, :zip],
    posts_attributes: [:id, :title, :body, :_destroy]
  )
end
```

**Request para crear user con address y posts**:
```json
{
  "user": {
    "name": "John",
    "email": "john@example.com",
    "address_attributes": {
      "street": "123 Main St",
      "city": "NYC",
      "zip": "10001"
    },
    "posts_attributes": [
      { "title": "First post", "body": "Content 1" },
      { "title": "Second post", "body": "Content 2" }
    ]
  }
}
```

---

## 🆚 Comparación con Express y .NET

### Express (Node.js)

En Express no hay strong parameters por defecto. Debes validar manualmente:

```javascript
// controllers/usersController.js
const { body, validationResult } = require('express-validator');

// Middleware de validación
exports.validateUser = [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Solo tomar campos permitidos manualmente
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password });

  res.status(201).json(user);
};
```

### .NET Core

En .NET se usan DTOs (Data Transfer Objects):

```csharp
// DTOs/CreateUserDto.cs
public class CreateUserDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; }

    [Required]
    [MinLength(6)]
    public string Password { get; set; }
}

// Controllers/UsersController.cs
[HttpPost]
public async Task<ActionResult<User>> CreateUser(CreateUserDto dto)
{
    // ModelState valida automáticamente
    if (!ModelState.IsValid)
        return BadRequest(ModelState);

    var user = new User
    {
        Name = dto.Name,
        Email = dto.Email,
        Password = dto.Password
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
}
```

| Aspecto | Rails | Express | .NET Core |
|---------|-------|---------|-----------|
| **Protección** | Strong Parameters (integrado) | Manual (express-validator) | DTOs + Data Annotations |
| **Sintaxis** | `require(:user).permit(:name)` | Destructuring manual | DTOs separados |
| **Validación** | En modelos | Middleware/Joi | Data Annotations |
| **Nested params** | `accepts_nested_attributes_for` | Manual | DTOs anidados |
| **Seguridad** | Por defecto bloqueado | Por defecto abierto | Por defecto bloqueado |

---

## 🎓 Mejores prácticas

### 1️⃣ Define strong params por acción si es necesario

```ruby
def user_params
  case action_name
  when 'create'
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
  when 'update'
    params.require(:user).permit(:name, :email, :bio, :avatar)
  when 'update_password'
    params.require(:user).permit(:current_password, :password, :password_confirmation)
  end
end
```

### 2️⃣ Usa concern para parámetros compartidos

```ruby
# app/controllers/concerns/strong_parameters.rb
module StrongParameters
  extend ActiveSupport::Concern

  private

  def pagination_params
    params.permit(:page, :per_page)
  end

  def sort_params
    params.permit(:sort_by, :order)
  end
end

# En controladores
class UsersController < ApplicationController
  include StrongParameters

  def index
    @users = User.page(pagination_params[:page])
                 .order(sort_params[:sort_by] => sort_params[:order])
    render json: @users
  end
end
```

### 3️⃣ Documenta parámetros complejos

```ruby
# app/controllers/api/v1/posts_controller.rb
class PostsController < ApplicationController
  # POST /api/v1/posts
  # Body:
  # {
  #   "post": {
  #     "title": "string",
  #     "body": "string",
  #     "published": boolean,
  #     "category_ids": [1, 2, 3],
  #     "metadata": { "tags": ["ruby", "rails"] }
  #   }
  # }
  def create
    @post = Post.new(post_params)
    # ...
  end

  private

  def post_params
    params.require(:post).permit(
      :title,
      :body,
      :published,
      category_ids: [],
      metadata: [:tags]
    )
  end
end
```

### 4️⃣ Maneja errores de strong params

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActionController::ParameterMissing, with: :parameter_missing
  rescue_from ActionController::UnpermittedParameters, with: :unpermitted_parameters

  private

  def parameter_missing(exception)
    render json: {
      error: "Parameter missing",
      message: exception.message
    }, status: :bad_request
  end

  def unpermitted_parameters(exception)
    render json: {
      error: "Unpermitted parameters",
      params: exception.params
    }, status: :bad_request
  end
end
```

### 5️⃣ Logging de parámetros filtrados

```ruby
# config/initializers/filter_parameter_logging.rb
Rails.application.config.filter_parameters += [
  :password,
  :password_confirmation,
  :credit_card,
  :ssn
]

# Los logs mostrarán:
# Parameters: {"user"=>{"email"=>"john@example.com", "password"=>"[FILTERED]"}}
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Strong params básicos

Crea strong params para un modelo `Article` con: `title`, `content`, `published`.

<details>
<summary>Ver solución</summary>

```ruby
def article_params
  params.require(:article).permit(:title, :content, :published)
end
```
</details>

### Ejercicio 2: Nested attributes

Crea strong params para `Post` que acepta nested `comments_attributes`.

<details>
<summary>Ver solución</summary>

```ruby
# app/models/post.rb
class Post < ApplicationRecord
  has_many :comments
  accepts_nested_attributes_for :comments, allow_destroy: true
end

# app/controllers/api/v1/posts_controller.rb
def post_params
  params.require(:post).permit(
    :title,
    :body,
    comments_attributes: [:id, :body, :_destroy]
  )
end
```
</details>

### Ejercicio 3: Parámetros condicionales por rol

Solo admins pueden cambiar el campo `featured` de un artículo.

<details>
<summary>Ver solución</summary>

```ruby
def article_params
  permitted = [:title, :content, :published]
  permitted << :featured if current_user.admin?

  params.require(:article).permit(permitted)
end
```
</details>

### Ejercicio 4: Query params opcionales

Crea un endpoint de filtrado que acepte `status`, `category`, `min_price`, `max_price`.

<details>
<summary>Ver solución</summary>

```ruby
def index
  @products = Product.all

  @products = @products.where(status: filter_params[:status]) if filter_params[:status].present?
  @products = @products.where(category: filter_params[:category]) if filter_params[:category].present?
  @products = @products.where("price >= ?", filter_params[:min_price]) if filter_params[:min_price].present?
  @products = @products.where("price <= ?", filter_params[:max_price]) if filter_params[:max_price].present?

  render json: @products
end

private

def filter_params
  params.permit(:status, :category, :min_price, :max_price)
end
```
</details>

---

## 🔗 Recursos adicionales

- [Rails Strong Parameters Guide](https://edgeguides.rubyonrails.org/action_controller_overview.html#strong-parameters)
- [Nested Attributes](https://api.rubyonrails.org/classes/ActiveRecord/NestedAttributes/ClassMethods.html)
- [Parameter Filtering](https://edgeguides.rubyonrails.org/action_controller_overview.html#parameters-filtering)

---

## 📝 Resumen

- **Strong Parameters** protege contra mass assignment attacks
- `require(:key)` exige que el hash tenga esa key
- `permit(:field1, :field2)` solo permite esos campos
- Usa `field: []` para arrays
- Usa `nested_attributes: [:field]` para objetos anidados
- `accepts_nested_attributes_for` en modelos para nested params
- Define strong params por acción cuando sea necesario
- Maneja `ParameterMissing` y `UnpermittedParameters`
- Filtra parámetros sensibles en logs (password, credit_card, etc.)

---

**Siguiente**: [Rutas](./rutas.md)
