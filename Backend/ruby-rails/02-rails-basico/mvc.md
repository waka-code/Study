# MVC en Rails

**MVC (Model-View-Controller)** es el patrón arquitectónico que Rails usa para organizar el código. En modo API, las vistas son reemplazadas por **serializers**.

---

## 🏗️ ¿Qué es MVC?

MVC separa la lógica en 3 capas:

```
Request → Routes → Controller → Model → Database
                      ↓
                  Serializer → JSON Response
```

| Capa | Responsabilidad | En Rails |
|------|-----------------|----------|
| **Model** | Lógica de negocio + Persistencia | `app/models/` |
| **View** | Presentación de datos | `app/serializers/` (en API mode) |
| **Controller** | Orquestación (request/response) | `app/controllers/` |

---

## 📦 Modelo (Model)

Los modelos representan **entidades de negocio** y su **persistencia** en la base de datos.

### Responsabilidades del Modelo

- Definir el **schema** (estructura de la tabla)
- **Validaciones** (reglas de negocio)
- **Asociaciones** (relaciones con otros modelos)
- **Métodos de negocio** (lógica del dominio)
- **Scopes** (queries reutilizables)
- **Callbacks** (hooks del ciclo de vida)

---

### Ejemplo completo: Modelo User

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # === ASOCIACIONES ===
  has_many :posts, dependent: :destroy
  has_many :comments, dependent: :destroy

  # === VALIDACIONES ===
  validates :name, presence: true, length: { minimum: 2, maximum: 50 }
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :age, numericality: { greater_than_or_equal_to: 18 }, allow_nil: true

  # === CALLBACKS ===
  before_save :downcase_email
  before_create :generate_auth_token
  after_create :send_welcome_email

  # === SCOPES ===
  scope :active, -> { where(active: true) }
  scope :admins, -> { where(role: 'admin') }
  scope :recent, -> { order(created_at: :desc) }

  # === ENUMS ===
  enum role: { user: 0, admin: 1, moderator: 2 }

  # === MÉTODOS DE INSTANCIA ===
  def full_name
    "#{first_name} #{last_name}"
  end

  def admin?
    role == 'admin'
  end

  def deactivate!
    update!(active: false)
  end

  # === MÉTODOS DE CLASE ===
  def self.search(query)
    where('name ILIKE ? OR email ILIKE ?', "%#{query}%", "%#{query}%")
  end

  def self.active_count
    active.count
  end

  private

  def downcase_email
    self.email = email.downcase if email.present?
  end

  def generate_auth_token
    self.auth_token = SecureRandom.hex(20)
  end

  def send_welcome_email
    UserMailer.welcome_email(self).deliver_later
  end
end
```

---

### Validaciones (Validations)

Rails ofrece múltiples validadores integrados.

```ruby
class Post < ApplicationRecord
  # Presencia
  validates :title, presence: true

  # Longitud
  validates :title, length: { minimum: 5, maximum: 100 }

  # Unicidad
  validates :slug, uniqueness: true

  # Formato (regex)
  validates :url, format: { with: URI::regexp(%w[http https]) }

  # Numericidad
  validates :views, numericality: { greater_than_or_equal_to: 0 }

  # Inclusión
  validates :status, inclusion: { in: %w[draft published archived] }

  # Confirmación
  validates :email, confirmation: true  # Requiere email_confirmation

  # Personalizada
  validate :future_publication_date

  private

  def future_publication_date
    if published_at.present? && published_at < Time.current
      errors.add(:published_at, "must be in the future")
    end
  end
end
```

---

### Asociaciones (Associations)

Define relaciones entre modelos.

#### `has_many` / `belongs_to` (1:N)

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_many :posts
end

# app/models/post.rb
class Post < ApplicationRecord
  belongs_to :user
end

# Uso
user = User.first
user.posts  # Todos los posts del usuario

post = Post.first
post.user   # El usuario del post
```

---

#### `has_many :through` (N:M)

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_many :enrollments
  has_many :courses, through: :enrollments
end

# app/models/enrollment.rb
class Enrollment < ApplicationRecord
  belongs_to :user
  belongs_to :course
end

# app/models/course.rb
class Course < ApplicationRecord
  has_many :enrollments
  has_many :users, through: :enrollments
end

# Uso
user.courses  # Cursos del usuario
course.users  # Usuarios del curso
```

---

#### `has_one`

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one :profile
end

# app/models/profile.rb
class Profile < ApplicationRecord
  belongs_to :user
end

# Uso
user.profile  # Perfil del usuario
profile.user  # Usuario del perfil
```

---

#### Asociaciones polimórficas

```ruby
# app/models/comment.rb
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true
end

# app/models/post.rb
class Post < ApplicationRecord
  has_many :comments, as: :commentable
end

# app/models/video.rb
class Video < ApplicationRecord
  has_many :comments, as: :commentable
end

# Migración
create_table :comments do |t|
  t.text :content
  t.references :commentable, polymorphic: true
  t.timestamps
end

# Uso
post.comments   # Comentarios del post
video.comments  # Comentarios del video
```

---

### Scopes

Queries reutilizables.

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :draft, -> { where(published: false) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_user, ->(user_id) { where(user_id: user_id) }

  # Scope con joins
  scope :with_comments, -> { joins(:comments).distinct }

  # Scope con where not
  scope :without_tags, -> { where.missing(:tags) }
end

# Uso
Post.published
Post.published.recent
Post.by_user(user.id).published
Post.where(category: 'tech').published.recent.limit(10)
```

---

### Callbacks

Hooks del ciclo de vida de un objeto.

```ruby
class User < ApplicationRecord
  # Antes de validar
  before_validation :normalize_email

  # Después de validar
  after_validation :log_errors

  # Antes de guardar (create o update)
  before_save :encrypt_password

  # Después de guardar
  after_save :clear_cache

  # Antes de crear
  before_create :set_default_role

  # Después de crear
  after_create :send_welcome_email

  # Antes de actualizar
  before_update :log_changes

  # Después de actualizar
  after_update :notify_changes

  # Antes de eliminar
  before_destroy :check_dependencies

  # Después de eliminar
  after_destroy :cleanup_files

  # Después de commit (transacción completada)
  after_commit :index_in_elasticsearch, on: [:create, :update]

  private

  def normalize_email
    self.email = email.downcase.strip if email.present?
  end

  def set_default_role
    self.role ||= 'user'
  end

  def send_welcome_email
    UserMailer.welcome_email(self).deliver_later
  end
end
```

**Orden de ejecución**:

```
before_validation
  ↓
after_validation
  ↓
before_save
  ↓
before_create (o before_update)
  ↓
[INSERT/UPDATE en DB]
  ↓
after_create (o after_update)
  ↓
after_save
  ↓
after_commit
```

---

### Métodos de clase vs instancia

```ruby
class User < ApplicationRecord
  # Método de clase (llamado desde User)
  def self.search(query)
    where('name ILIKE ?', "%#{query}%")
  end

  # Método de instancia (llamado desde user)
  def full_name
    "#{first_name} #{last_name}"
  end
end

# Uso
User.search('john')    # Método de clase
user.full_name         # Método de instancia
```

---

## 🎨 Vista (View) - Serializers en API mode

En modo API, las vistas son reemplazadas por **serializers** que formatean la respuesta JSON.

### Sin serializer (respuesta directa)

```ruby
# app/controllers/api/v1/users_controller.rb
def index
  @users = User.all
  render json: @users
end
```

**Respuesta** (incluye TODO):

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "password_digest": "$2a$12$...",
  "auth_token": "abc123...",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Problema**: Expone información sensible.

---

### Con `active_model_serializers`

#### Instalar

```ruby
# Gemfile
gem 'active_model_serializers', '~> 0.10.0'
```

```bash
bundle install
```

#### Generar serializer

```bash
rails g serializer User
```

#### Definir serializer

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :created_at

  # Atributo personalizado
  attribute :full_name

  # Asociaciones
  has_many :posts

  # Método personalizado
  def full_name
    "#{object.first_name} #{object.last_name}"
  end

  # Formatear fecha
  def created_at
    object.created_at.strftime('%Y-%m-%d')
  end
end
```

#### Usar en controlador

```ruby
# app/controllers/api/v1/users_controller.rb
def index
  @users = User.all
  render json: @users, each_serializer: UserSerializer
end

def show
  @user = User.find(params[:id])
  render json: @user, serializer: UserSerializer
end
```

**Respuesta**:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "created_at": "2024-01-01",
  "posts": [
    { "id": 1, "title": "First Post" },
    { "id": 2, "title": "Second Post" }
  ]
}
```

---

### Serializers con JSON:API

```ruby
# Gemfile
gem 'jsonapi-serializer'
```

```ruby
# app/serializers/user_serializer.rb
class UserSerializer
  include JSONAPI::Serializer

  attributes :name, :email

  attribute :full_name do |object|
    "#{object.first_name} #{object.last_name}"
  end

  has_many :posts
end
```

```ruby
# Controlador
def index
  @users = User.all
  render json: UserSerializer.new(@users).serializable_hash
end
```

**Respuesta (JSON:API format)**:

```json
{
  "data": [
    {
      "id": "1",
      "type": "user",
      "attributes": {
        "name": "John Doe",
        "email": "john@example.com",
        "full_name": "John Doe"
      },
      "relationships": {
        "posts": {
          "data": [
            { "id": "1", "type": "post" },
            { "id": "2", "type": "post" }
          ]
        }
      }
    }
  ]
}
```

---

### Serializer manual (sin gemas)

```ruby
# app/serializers/user_serializer.rb
class UserSerializer
  def initialize(user)
    @user = user
  end

  def as_json
    {
      id: @user.id,
      name: @user.name,
      email: @user.email,
      full_name: "#{@user.first_name} #{@user.last_name}",
      created_at: @user.created_at.strftime('%Y-%m-%d'),
      posts: @user.posts.map { |post| PostSerializer.new(post).as_json }
    }
  end
end

# Controlador
def show
  @user = User.find(params[:id])
  render json: UserSerializer.new(@user).as_json
end
```

---

## 🎮 Controlador (Controller)

Los controladores **orquestan** el flujo: reciben la request, llaman al modelo, y devuelven la response.

### Responsabilidades del Controlador

- Recibir parámetros del request
- Validar permisos (autorización)
- Llamar al modelo (lógica de negocio)
- Manejar errores
- Renderizar respuesta (JSON)

**Regla de oro**: Los controladores deben ser **flacos** (thin controllers).

---

### Estructura básica

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
          render json: @user, status: :created
        else
          render json: { errors: @user.errors }, status: :unprocessable_entity
        end
      end

      # PUT/PATCH /api/v1/users/:id
      def update
        if @user.update(user_params)
          render json: @user
        else
          render json: { errors: @user.errors }, status: :unprocessable_entity
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
        params.require(:user).permit(:name, :email, :age)
      end
    end
  end
end
```

---

### Strong Parameters

**Protege contra mass assignment**.

```ruby
# Permitir solo ciertos parámetros
def user_params
  params.require(:user).permit(:name, :email, :age)
end

# Permitir arrays
def post_params
  params.require(:post).permit(:title, :content, tag_ids: [])
end

# Permitir hashes anidados
def user_params
  params.require(:user).permit(:name, :email, profile_attributes: [:bio, :avatar])
end

# Uso
@user = User.new(user_params)
@user.update(user_params)
```

---

### Renderizar respuestas

```ruby
# JSON básico
render json: @user

# JSON con status
render json: @user, status: :created  # 201
render json: { errors: @user.errors }, status: :unprocessable_entity  # 422

# JSON con serializer
render json: @user, serializer: UserSerializer

# JSON personalizado
render json: { message: 'Success', data: @user }

# Sin contenido (204)
head :no_content

# Redirigir (raro en APIs)
redirect_to user_path(@user)
```

---

### Status codes comunes

```ruby
render json: @user, status: :ok                    # 200
render json: @user, status: :created               # 201
head :no_content                                   # 204
render json: { error: 'Bad Request' }, status: :bad_request  # 400
render json: { error: 'Unauthorized' }, status: :unauthorized  # 401
render json: { error: 'Forbidden' }, status: :forbidden  # 403
render json: { error: 'Not Found' }, status: :not_found  # 404
render json: { errors: @user.errors }, status: :unprocessable_entity  # 422
render json: { error: 'Server Error' }, status: :internal_server_error  # 500
```

---

### Callbacks del controlador

```ruby
class UsersController < ApplicationController
  # Ejecutar antes de todas las acciones
  before_action :authenticate_user!

  # Ejecutar antes de ciertas acciones
  before_action :set_user, only: [:show, :update, :destroy]

  # Ejecutar después de ciertas acciones
  after_action :log_activity, only: [:create, :update, :destroy]

  # Ejecutar alrededor de una acción
  around_action :log_time, only: [:index]

  def index
    @users = User.all
    render json: @users
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def log_activity
    ActivityLog.create(action: action_name, user: current_user)
  end

  def log_time
    start_time = Time.current
    yield
    duration = Time.current - start_time
    Rails.logger.info "Request took #{duration} seconds"
  end
end
```

---

### Manejo de errores

```ruby
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :record_invalid
  rescue_from ActionController::ParameterMissing, with: :parameter_missing

  private

  def record_not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def record_invalid(exception)
    render json: { errors: exception.record.errors }, status: :unprocessable_entity
  end

  def parameter_missing(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
```

---

## 🔄 Flujo completo de una request

### 1. Request HTTP

```
POST /api/v1/users
Content-Type: application/json

{
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### 2. Routes (config/routes.rb)

```ruby
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users
    end
  end
end
```

Rails busca la ruta `POST /api/v1/users` → `Api::V1::UsersController#create`

---

### 3. Controller recibe la request

```ruby
# app/controllers/api/v1/users_controller.rb
def create
  @user = User.new(user_params)

  if @user.save
    render json: @user, status: :created
  else
    render json: { errors: @user.errors }, status: :unprocessable_entity
  end
end

private

def user_params
  params.require(:user).permit(:name, :email)
end
```

---

### 4. Model ejecuta validaciones y callbacks

```ruby
# app/models/user.rb
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true
  before_save :downcase_email

  private

  def downcase_email
    self.email = email.downcase
  end
end
```

---

### 5. Database (SQL)

```sql
INSERT INTO users (name, email, created_at, updated_at)
VALUES ('John Doe', 'john@example.com', '2024-01-01 00:00:00', '2024-01-01 00:00:00')
RETURNING *
```

---

### 6. Serializer formatea la respuesta

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :created_at
end
```

---

### 7. Response JSON

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## 🎯 Ejemplo completo: CRUD de Posts

### Modelo

```ruby
# app/models/post.rb
class Post < ApplicationRecord
  belongs_to :user
  has_many :comments, dependent: :destroy

  validates :title, presence: true, length: { minimum: 5, maximum: 100 }
  validates :content, presence: true

  scope :published, -> { where(published: true) }
  scope :recent, -> { order(created_at: :desc) }

  def publish!
    update!(published: true, published_at: Time.current)
  end
end
```

---

### Serializer

```ruby
# app/serializers/post_serializer.rb
class PostSerializer < ActiveModel::Serializer
  attributes :id, :title, :content, :published, :published_at, :created_at

  belongs_to :user
  has_many :comments

  def published_at
    object.published_at&.strftime('%Y-%m-%d %H:%M')
  end
end
```

---

### Controlador

```ruby
# app/controllers/api/v1/posts_controller.rb
module Api
  module V1
    class PostsController < ApplicationController
      before_action :authenticate_user!, except: [:index, :show]
      before_action :set_post, only: [:show, :update, :destroy]

      # GET /api/v1/posts
      def index
        @posts = Post.published.recent.includes(:user, :comments)
        render json: @posts
      end

      # GET /api/v1/posts/:id
      def show
        render json: @post
      end

      # POST /api/v1/posts
      def create
        @post = current_user.posts.build(post_params)

        if @post.save
          render json: @post, status: :created
        else
          render json: { errors: @post.errors }, status: :unprocessable_entity
        end
      end

      # PUT/PATCH /api/v1/posts/:id
      def update
        if @post.update(post_params)
          render json: @post
        else
          render json: { errors: @post.errors }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/posts/:id
      def destroy
        @post.destroy
        head :no_content
      end

      # POST /api/v1/posts/:id/publish
      def publish
        @post = Post.find(params[:id])
        @post.publish!
        render json: @post
      end

      private

      def set_post
        @post = Post.find(params[:id])
      end

      def post_params
        params.require(:post).permit(:title, :content, :published)
      end
    end
  end
end
```

---

### Rutas

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :posts do
        member do
          post :publish
        end
      end
    end
  end
end
```

---

## 💡 Mejores prácticas

### Modelo

1. **Fat models, skinny controllers** - La lógica va en el modelo
2. **Valida todo** - No confíes en el frontend
3. **Usa scopes** para queries reutilizables
4. **Evita callbacks complejos** - pueden causar efectos secundarios inesperados
5. **Índices en foreign keys** - Mejora performance

### Controlador

1. **Thin controllers** - Solo orquestación
2. **Strong parameters** - Siempre usa `permit`
3. **Maneja errores** - Usa `rescue_from`
4. **Status codes correctos** - 200, 201, 204, 400, 401, 404, 422, 500
5. **No pongas lógica de negocio** - va en el modelo o service objects

### Serializer

1. **No expongas datos sensibles** - password, tokens, etc.
2. **Formatea fechas** - Usa formato consistente
3. **Cuidado con N+1** - Usa `includes` en el controlador
4. **Serializers diferentes para diferentes contextos** - `UserSerializer` vs `UserDetailSerializer`

---

## 📊 Comparación con otros frameworks

| Rails MVC | Express (Node) | ASP.NET Core |
|-----------|----------------|--------------|
| Model (`ActiveRecord`) | Model (Sequelize/TypeORM) | Model (Entity Framework) |
| Serializer | DTO / Serializer | DTO / AutoMapper |
| Controller | Controller / Route Handler | Controller |
| `validates` | Joi / class-validator | Data Annotations |
| `has_many` | associations | Navigation Properties |
| `scope` | Custom methods | LINQ methods |

---

## 🔗 Recursos adicionales

- [Active Record Basics](https://guides.rubyonrails.org/active_record_basics.html)
- [Active Record Validations](https://guides.rubyonrails.org/active_record_validations.html)
- [Active Record Associations](https://guides.rubyonrails.org/association_basics.html)
- [Action Controller Overview](https://guides.rubyonrails.org/action_controller_overview.html)

---

**Fin del módulo**: [02-rails-basico](./README.md)
