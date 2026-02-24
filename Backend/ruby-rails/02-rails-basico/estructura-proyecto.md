# Estructura de un proyecto Rails

Rails sigue la filosofía **"Convention over Configuration"**: organiza tu código en carpetas predefinidas para que sepas exactamente dónde colocar cada archivo.

---

## 📂 Estructura completa de un proyecto Rails

Cuando creas un proyecto con `rails new myapp`, se genera esta estructura:

```
myapp/
├── app/                    # Código de la aplicación
│   ├── assets/            # Archivos estáticos (CSS, JS, imágenes)
│   ├── channels/          # ActionCable (WebSockets)
│   ├── controllers/       # Controladores (lógica de request/response)
│   ├── helpers/           # Helpers (funciones auxiliares para vistas)
│   ├── jobs/              # Background jobs (tareas asíncronas)
│   ├── mailers/           # Emails (ActionMailer)
│   ├── models/            # Modelos (lógica de negocio + ActiveRecord)
│   ├── serializers/       # Serializers (formateo de respuestas JSON)
│   └── views/             # Vistas (HTML/ERB) - no se usa en API mode
│
├── bin/                    # Ejecutables del proyecto
│   ├── rails              # CLI de Rails
│   ├── rake               # Tareas rake
│   └── setup              # Script de configuración inicial
│
├── config/                 # Configuración de la aplicación
│   ├── environments/      # Configuraciones por entorno
│   │   ├── development.rb
│   │   ├── test.rb
│   │   └── production.rb
│   ├── initializers/      # Código que se ejecuta al iniciar
│   ├── locales/           # Traducciones (i18n)
│   ├── application.rb     # Configuración global
│   ├── boot.rb            # Inicialización de bundler
│   ├── database.yml       # Configuración de base de datos
│   ├── environment.rb     # Carga el entorno Rails
│   ├── routes.rb          # Definición de rutas
│   └── puma.rb            # Configuración del servidor
│
├── db/                     # Base de datos
│   ├── migrate/           # Migraciones (cambios de schema)
│   ├── seeds.rb           # Datos iniciales (seed data)
│   └── schema.rb          # Schema actual de la DB
│
├── lib/                    # Código compartido/reutilizable
│   ├── tasks/             # Tareas rake personalizadas
│   └── assets/            # Assets compartidos
│
├── log/                    # Logs de la aplicación
│   ├── development.log
│   ├── test.log
│   └── production.log
│
├── public/                 # Archivos públicos (accesibles sin procesar)
│   ├── 404.html
│   ├── 500.html
│   └── robots.txt
│
├── spec/ (o test/)         # Tests (RSpec o Minitest)
│   ├── controllers/
│   ├── models/
│   ├── requests/
│   └── spec_helper.rb
│
├── storage/                # Archivos subidos (ActiveStorage)
│
├── tmp/                    # Archivos temporales
│   ├── cache/
│   ├── pids/
│   └── sockets/
│
├── vendor/                 # Gemas externas (opcional)
│
├── .gitignore              # Archivos ignorados por git
├── Gemfile                 # Dependencias del proyecto
├── Gemfile.lock            # Versiones exactas de gemas instaladas
├── Rakefile                # Definición de tareas rake
└── README.md               # Documentación del proyecto
```

---

## 🗂️ Carpetas principales: ¿Qué va en cada una?

### 1️⃣ `app/` - Código de la aplicación

Esta es la carpeta donde pasarás el 90% de tu tiempo.

#### `app/models/` - Modelos

Contienen la **lógica de negocio** y la **persistencia** (ActiveRecord).

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Validaciones
  validates :email, presence: true, uniqueness: true

  # Asociaciones
  has_many :posts

  # Métodos de negocio
  def full_name
    "#{first_name} #{last_name}"
  end

  # Scopes
  scope :active, -> { where(active: true) }
end
```

**Regla**: Los modelos deben ser **gordos** (fat models) - aquí va la lógica.

---

#### `app/controllers/` - Controladores

Manejan el **flujo de request/response**: reciben parámetros, llaman al modelo, devuelven JSON.

```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      # GET /api/v1/users
      def index
        @users = User.all
        render json: @users
      end

      # GET /api/v1/users/:id
      def show
        @user = User.find(params[:id])
        render json: @user
      end

      # POST /api/v1/users
      def create
        @user = User.new(user_params)

        if @user.save
          render json: @user, status: :created
        else
          render json: @user.errors, status: :unprocessable_entity
        end
      end

      private

      def user_params
        params.require(:user).permit(:name, :email)
      end
    end
  end
end
```

**Regla**: Los controladores deben ser **flacos** (skinny controllers) - solo orquestación.

---

#### `app/serializers/` - Serializers

Formatean la respuesta JSON (en API mode reemplazan a las vistas).

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :created_at

  has_many :posts

  # Atributos personalizados
  def created_at
    object.created_at.strftime("%Y-%m-%d")
  end
end
```

**Gemas populares**: `active_model_serializers`, `jsonapi-serializer`, `fast_jsonapi`.

---

#### `app/jobs/` - Background Jobs

Tareas asíncronas (envío de emails, procesamiento de archivos, etc.).

```ruby
# app/jobs/send_welcome_email_job.rb
class SendWelcomeEmailJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    user = User.find(user_id)
    UserMailer.welcome_email(user).deliver_now
  end
end

# Uso
SendWelcomeEmailJob.perform_later(user.id)
```

---

#### `app/mailers/` - Mailers

Envío de emails (ActionMailer).

```ruby
# app/mailers/user_mailer.rb
class UserMailer < ApplicationMailer
  def welcome_email(user)
    @user = user
    mail(to: @user.email, subject: 'Bienvenido a MyApp')
  end
end
```

---

### 2️⃣ `config/` - Configuración

#### `config/routes.rb` - Rutas

Define los endpoints de tu API.

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users
      resources :posts do
        resources :comments
      end
    end
  end
end
```

Genera rutas como:
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `GET /api/v1/posts/:post_id/comments`

---

#### `config/database.yml` - Base de datos

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: myapp_development

test:
  <<: *default
  database: myapp_test

production:
  <<: *default
  database: myapp_production
  username: <%= ENV['DATABASE_USER'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
```

---

#### `config/application.rb` - Configuración global

```ruby
module Myapp
  class Application < Rails::Application
    config.load_defaults 7.1

    # Solo cargar módulos necesarios para API
    config.api_only = true

    # Timezone
    config.time_zone = 'America/Mexico_City'

    # Auto-load paths
    config.autoload_paths << Rails.root.join('lib')

    # CORS
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*', headers: :any, methods: [:get, :post, :put, :delete]
      end
    end
  end
end
```

---

#### `config/environments/` - Por entorno

Configuraciones específicas para **development**, **test** y **production**.

```ruby
# config/environments/development.rb
Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false
  config.consider_all_requests_local = true
  config.action_controller.perform_caching = false
  config.active_record.migration_error = :page_load
  config.log_level = :debug
end
```

```ruby
# config/environments/production.rb
Rails.application.configure do
  config.cache_classes = true
  config.eager_load = true
  config.consider_all_requests_local = false
  config.action_controller.perform_caching = true
  config.log_level = :info
  config.force_ssl = true  # Forzar HTTPS
end
```

---

#### `config/initializers/` - Inicializadores

Código que se ejecuta al iniciar la app.

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'localhost:3000', 'myapp.com'
    resource '*', headers: :any, methods: [:get, :post, :put, :delete]
  end
end
```

```ruby
# config/initializers/filter_parameters.rb
Rails.application.config.filter_parameters += [:password, :token]
```

---

### 3️⃣ `db/` - Base de datos

#### `db/migrate/` - Migraciones

Cambios versionados en el schema de la base de datos.

```ruby
# db/migrate/20240101120000_create_users.rb
class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.boolean :active, default: true

      t.timestamps
    end

    add_index :users, :email, unique: true
  end
end
```

---

#### `db/seeds.rb` - Datos iniciales

```ruby
# db/seeds.rb
User.create!(name: "Admin", email: "admin@example.com")
User.create!(name: "User", email: "user@example.com")

puts "Created #{User.count} users"
```

Ejecutar con: `rails db:seed`

---

#### `db/schema.rb` - Schema actual

**NO editar manualmente**. Rails lo genera automáticamente después de correr migraciones.

```ruby
ActiveRecord::Schema[7.1].define(version: 2024_01_01_120000) do
  create_table "users", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end
end
```

---

### 4️⃣ `lib/` - Código compartido

Clases y módulos que no pertenecen a `app/` (lógica reutilizable).

```ruby
# lib/json_web_token.rb
class JsonWebToken
  SECRET_KEY = Rails.application.credentials.secret_key_base

  def self.encode(payload, exp = 24.hours.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, SECRET_KEY)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY)[0]
    HashWithIndifferentAccess.new(decoded)
  rescue JWT::DecodeError => e
    nil
  end
end
```

---

### 5️⃣ `spec/` o `test/` - Tests

Tests automatizados (RSpec o Minitest).

```ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  it { should validate_presence_of(:email) }
  it { should validate_uniqueness_of(:email) }
  it { should have_many(:posts) }

  describe '#full_name' do
    it 'returns the full name' do
      user = User.new(first_name: 'John', last_name: 'Doe')
      expect(user.full_name).to eq('John Doe')
    end
  end
end
```

---

## 🆚 Diferencias: Modo normal vs API mode

### Modo normal (Full-stack Rails)

```bash
rails new myapp
```

**Incluye**:
- Sistema de vistas (ERB, HTML)
- Asset pipeline (Sprockets)
- Helpers de vistas
- ActionView
- Turbo y Stimulus (Hotwire)

**Carpetas adicionales**:
- `app/views/`
- `app/assets/`
- `app/helpers/`

**Uso**: Aplicaciones con frontend en Rails (Hotwire, Turbo).

---

### Modo API (Solo backend)

```bash
rails new myapp --api
```

**Excluye**:
- Vistas (HTML/ERB)
- Asset pipeline
- Cookies y sesiones (por defecto)
- Helpers de vistas

**Incluye**:
- ActionController::API (más liviano)
- Serializers (en lugar de vistas)
- Modo JSON por defecto

**Carpetas eliminadas**:
- `app/views/` (no se genera)
- `app/assets/` (no se genera)
- `app/helpers/` (no se genera)

**Uso**: APIs REST que serán consumidas por frontend separado (React, Vue, móvil).

---

## 🔄 Comparación detallada

| Característica | Modo Normal | API Mode |
|----------------|-------------|----------|
| **Controlador base** | `ApplicationController < ActionController::Base` | `ApplicationController < ActionController::API` |
| **Vistas** | Sí (ERB, HTML) | No (JSON) |
| **Assets** | Sí (CSS, JS) | No |
| **Cookies/Sesiones** | Sí (por defecto) | No (debe habilitarse manualmente) |
| **Tamaño** | Más pesado | Más liviano |
| **Middleware** | Completo | Reducido |
| **Uso** | Fullstack | Solo backend |

---

## 🎯 Ejemplo visual: Flujo de una request

### En API Mode

```
1. HTTP Request
   ↓
2. config/routes.rb  →  Encuentra la ruta
   ↓
3. Controller        →  Procesa la request
   ↓
4. Model             →  Consulta la DB
   ↓
5. Serializer        →  Formatea la respuesta
   ↓
6. JSON Response
```

### En Modo Normal

```
1. HTTP Request
   ↓
2. config/routes.rb  →  Encuentra la ruta
   ↓
3. Controller        →  Procesa la request
   ↓
4. Model             →  Consulta la DB
   ↓
5. View (ERB)        →  Renderiza HTML
   ↓
6. HTML Response
```

---

## 💡 Mejores prácticas

1. **No toques `db/schema.rb`** - Rails lo gestiona automáticamente
2. **Usa `config/initializers/`** para configuraciones al inicio
3. **Mantén los controladores flacos** - mueve lógica a modelos o service objects
4. **Organiza los controladores en namespaces** - `api/v1/`, `api/v2/`
5. **Usa `lib/`** para código compartido entre apps
6. **Ignora archivos sensibles** en `.gitignore`:
   - `config/master.key`
   - `.env`
   - `log/*.log`
   - `tmp/`

---

## 🔥 Comandos útiles

```bash
# Ver la estructura del proyecto
tree -L 2 -I 'node_modules|vendor'

# Ver todas las rutas
rails routes

# Ver el schema actual
cat db/schema.rb

# Ver logs en tiempo real
tail -f log/development.log

# Limpiar archivos temporales
rails tmp:clear

# Ver estadísticas del código
rails stats
```

---

## 🎓 Ejercicio práctico

Crea un proyecto API y explora su estructura:

```bash
# Crear proyecto API
rails new blog_api --api --database=postgresql

# Entrar al proyecto
cd blog_api

# Explorar estructura
ls -la

# Ver rutas (vacías)
rails routes

# Ver configuración
cat config/application.rb

# Ver controlador base
cat app/controllers/application_controller.rb
```

Nota cómo `ApplicationController` hereda de `ActionController::API` en lugar de `ActionController::Base`.

---

## 📊 Comparación con otros frameworks

| Rails | Express (Node) | ASP.NET Core |
|-------|----------------|--------------|
| `app/models/` | `models/` | `Models/` |
| `app/controllers/` | `controllers/` o `routes/` | `Controllers/` |
| `config/routes.rb` | `routes.js` | `Startup.cs` o `Program.cs` |
| `db/migrate/` | `migrations/` | `Migrations/` |
| `config/database.yml` | `.env` | `appsettings.json` |
| `Gemfile` | `package.json` | `.csproj` |

---

## 🔗 Recursos adicionales

- [Rails Guides - Structure](https://guides.rubyonrails.org/getting_started.html#creating-the-blog-application)
- [API-only Applications](https://guides.rubyonrails.org/api_app.html)
- [Configuring Rails](https://guides.rubyonrails.org/configuring.html)

---

**Siguiente**: [comandos-basicos.md](./comandos-basicos.md)
