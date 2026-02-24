# Configuración de Rails

Rails ofrece múltiples archivos de configuración para personalizar el comportamiento de tu aplicación según el entorno (development, test, production).

---

## 📁 Archivos principales de configuración

```
config/
├── application.rb           # Configuración global
├── boot.rb                  # Inicialización de bundler
├── environment.rb           # Carga el entorno Rails
├── database.yml             # Configuración de base de datos
├── routes.rb                # Definición de rutas
├── puma.rb                  # Configuración del servidor
├── credentials.yml.enc      # Secrets encriptados
├── master.key               # Clave para desencriptar credentials
├── environments/            # Configuraciones por entorno
│   ├── development.rb
│   ├── test.rb
│   └── production.rb
└── initializers/            # Código que se ejecuta al iniciar
    ├── cors.rb
    ├── filter_parameter_logging.rb
    └── inflections.rb
```

---

## 🌍 `config/application.rb` - Configuración global

Este archivo define la configuración que aplica a **todos los entornos**.

### Estructura básica

```ruby
# config/application.rb
require_relative "boot"
require "rails/all"

# Require the gems listed in Gemfile
Bundler.require(*Rails.groups)

module BlogApi
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version
    config.load_defaults 7.1

    # Configuraciones personalizadas aquí
  end
end
```

---

### Configuraciones comunes

#### Modo API

```ruby
config.api_only = true
```

Deshabilita vistas, assets, helpers, etc.

---

#### Zona horaria

```ruby
# Zona horaria de la aplicación
config.time_zone = 'America/Mexico_City'

# Zona horaria de la base de datos (recomendado: UTC)
config.active_record.default_timezone = :utc
```

**Lista de zonas**: [Time Zones en Rails](https://api.rubyonrails.org/classes/ActiveSupport/TimeZone.html)

---

#### Autoload paths

```ruby
# Agregar carpetas adicionales para auto-carga
config.autoload_paths << Rails.root.join('lib')
config.eager_load_paths << Rails.root.join('lib')
```

Útil para cargar clases personalizadas en `lib/`.

---

#### CORS (Cross-Origin Resource Sharing)

```ruby
# Permitir requests desde otros dominios
config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'  # Todos los orígenes (solo desarrollo)
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
```

**Producción**:

```ruby
config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'https://myapp.com', 'https://admin.myapp.com'
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete],
      credentials: true  # Permitir cookies
  end
end
```

---

#### Nivel de logging

```ruby
config.log_level = :debug  # :debug, :info, :warn, :error, :fatal
```

---

#### Generadores personalizados

```ruby
# Configurar qué archivos genera `rails g`
config.generators do |g|
  g.orm :active_record
  g.test_framework :rspec, fixtures: false
  g.fixture_replacement :factory_bot, dir: 'spec/factories'
  g.stylesheets false
  g.javascripts false
  g.helper false
end
```

---

#### Filtrar parámetros sensibles en logs

```ruby
config.filter_parameters += [:password, :token, :secret, :credit_card]
```

Los valores de estos parámetros aparecerán como `[FILTERED]` en los logs.

---

### Ejemplo completo

```ruby
# config/application.rb
module BlogApi
  class Application < Rails::Application
    config.load_defaults 7.1

    # API mode
    config.api_only = true

    # Zona horaria
    config.time_zone = 'America/Mexico_City'
    config.active_record.default_timezone = :utc

    # Locale
    config.i18n.default_locale = :es

    # Autoload
    config.autoload_paths << Rails.root.join('lib')

    # CORS
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*', headers: :any, methods: [:get, :post, :put, :delete]
      end
    end

    # Logging
    config.log_level = :info

    # Generadores
    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot
    end

    # Filtrar parámetros sensibles
    config.filter_parameters += [:password, :token, :api_key]
  end
end
```

---

## 🗄️ `config/database.yml` - Base de datos

Define la configuración de conexión a la base de datos para cada entorno.

### Estructura básica

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: blog_api_development

test:
  <<: *default
  database: blog_api_test

production:
  <<: *default
  database: blog_api_production
  username: <%= ENV['DATABASE_USER'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
  host: <%= ENV['DATABASE_HOST'] %>
```

---

### Adaptadores comunes

#### PostgreSQL (recomendado)

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: 5
  host: localhost
  port: 5432

development:
  <<: *default
  database: blog_api_development
  username: postgres
  password: password
```

---

#### MySQL

```yaml
default: &default
  adapter: mysql2
  encoding: utf8mb4
  pool: 5
  host: localhost
  port: 3306

development:
  <<: *default
  database: blog_api_development
  username: root
  password: password
```

---

#### SQLite3 (solo desarrollo)

```yaml
development:
  adapter: sqlite3
  database: db/development.sqlite3
  pool: 5
  timeout: 5000
```

---

### Usar variables de entorno

```yaml
production:
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  database: <%= ENV['DATABASE_NAME'] %>
  username: <%= ENV['DATABASE_USER'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
  host: <%= ENV['DATABASE_HOST'] %>
  port: <%= ENV.fetch('DATABASE_PORT', 5432) %>
```

---

### Pool de conexiones

```yaml
pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
```

- **Pool**: Número de conexiones simultáneas a la DB
- **Regla**: Pool >= número de threads del servidor (Puma)

---

## 🔧 `config/environments/` - Por entorno

Rails tiene 3 entornos por defecto:
- `development.rb` - Desarrollo local
- `test.rb` - Tests automatizados
- `production.rb` - Producción

---

### `development.rb` - Desarrollo

```ruby
# config/environments/development.rb
Rails.application.configure do
  # Cache classes (recargar código sin reiniciar)
  config.cache_classes = false

  # Eager loading (cargar todo al inicio)
  config.eager_load = false

  # Mostrar errores completos
  config.consider_all_requests_local = true

  # Caching
  config.action_controller.perform_caching = false

  # Cache store
  config.cache_store = :memory_store

  # Logging
  config.log_level = :debug

  # Migraciones pendientes
  config.active_record.migration_error = :page_load

  # Mostrar queries SQL en logs
  config.active_record.verbose_query_logs = true

  # Colorear logs
  config.colorize_logging = true
end
```

---

### `test.rb` - Testing

```ruby
# config/environments/test.rb
Rails.application.configure do
  # Cache classes (no recargar entre tests)
  config.cache_classes = true

  # Eager loading
  config.eager_load = false

  # No mostrar errores en respuestas
  config.consider_all_requests_local = true

  # Caching deshabilitado
  config.action_controller.perform_caching = false

  # Cache store
  config.cache_store = :null_store

  # Logging
  config.log_level = :warn

  # No enviar emails en tests
  config.action_mailer.delivery_method = :test
end
```

---

### `production.rb` - Producción

```ruby
# config/environments/production.rb
Rails.application.configure do
  # Cache classes (mejor performance)
  config.cache_classes = true

  # Eager loading (cargar todo al inicio)
  config.eager_load = true

  # No mostrar errores completos (seguridad)
  config.consider_all_requests_local = false

  # Caching habilitado
  config.action_controller.perform_caching = true

  # Cache store (Redis)
  config.cache_store = :redis_cache_store, { url: ENV['REDIS_URL'] }

  # Logging
  config.log_level = :info

  # Log a STDOUT (para Docker/Heroku)
  config.logger = ActiveSupport::Logger.new(STDOUT)

  # Forzar HTTPS
  config.force_ssl = true

  # Assets precompilados
  config.public_file_server.enabled = ENV['RAILS_SERVE_STATIC_FILES'].present?

  # I18n fallbacks
  config.i18n.fallbacks = true

  # No mostrar deprecation warnings
  config.active_support.report_deprecations = false

  # Configuración de Active Record
  config.active_record.dump_schema_after_migration = false
end
```

---

## 📍 `config/routes.rb` - Rutas

Define los endpoints de tu API.

### Ejemplo básico

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

Genera:

```
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id

GET    /api/v1/posts/:post_id/comments
POST   /api/v1/posts/:post_id/comments
...
```

---

### Rutas personalizadas

```ruby
Rails.application.routes.draw do
  # Ruta raíz
  root to: 'health#check'

  # Namespace API
  namespace :api do
    namespace :v1 do
      # Resources con solo algunas acciones
      resources :users, only: [:index, :show, :create]

      # Resources sin algunas acciones
      resources :posts, except: [:destroy]

      # Rutas anidadas
      resources :posts do
        resources :comments, only: [:index, :create]
      end

      # Rutas personalizadas
      post 'auth/login', to: 'auth#login'
      delete 'auth/logout', to: 'auth#logout'
      post 'auth/refresh', to: 'auth#refresh'

      # Ruta con member
      resources :users do
        member do
          post :activate
          post :deactivate
        end
      end
      # Genera: POST /api/v1/users/:id/activate

      # Ruta con collection
      resources :posts do
        collection do
          get :published
        end
      end
      # Genera: GET /api/v1/posts/published

      # Ruta de salud
      get 'health', to: 'health#check'
    end
  end

  # Catch-all (404)
  match '*path', to: 'application#not_found', via: :all
end
```

---

### Constraints

```ruby
Rails.application.routes.draw do
  # Solo aceptar formato JSON
  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      resources :users
    end
  end

  # Subdominios
  constraints subdomain: 'api' do
    namespace :api do
      resources :users
    end
  end

  # Versión en header
  scope module: :v1, constraints: ApiVersion.new('v1') do
    resources :users
  end
end
```

---

## 🎛️ `config/initializers/` - Inicializadores

Código que se ejecuta **una vez** al iniciar la aplicación.

### `cors.rb` - CORS

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Desarrollo
    if Rails.env.development?
      origins '*'
    else
      # Producción
      origins ENV.fetch('ALLOWED_ORIGINS', '').split(',')
    end

    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      max_age: 600
  end
end
```

---

### `filter_parameter_logging.rb` - Filtrar parámetros

```ruby
# config/initializers/filter_parameter_logging.rb
Rails.application.config.filter_parameters += [
  :passw, :secret, :token, :_key, :crypt, :salt, :certificate, :otp, :ssn,
  :cvv, :credit_card, :api_key
]
```

---

### `inflections.rb` - Pluralizaciones

```ruby
# config/initializers/inflections.rb
ActiveSupport::Inflector.inflections(:en) do |inflect|
  # Irregular
  inflect.irregular 'person', 'people'
  inflect.irregular 'octopus', 'octopi'

  # Uncountable (no plural)
  inflect.uncountable %w[money information equipment]

  # Acrónimos
  inflect.acronym 'API'
  inflect.acronym 'HTML'
  inflect.acronym 'HTTP'
end
```

---

### `custom_config.rb` - Configuraciones personalizadas

```ruby
# config/initializers/custom_config.rb
Rails.application.configure do
  config.x.jwt.secret = ENV['JWT_SECRET']
  config.x.jwt.expiration = 24.hours
  config.x.pagination.per_page = 20
  config.x.max_upload_size = 10.megabytes
end

# Uso en la aplicación
Rails.application.config.x.jwt.secret
Rails.application.config.x.pagination.per_page
```

---

## 🔐 `config/credentials.yml.enc` - Secrets encriptados

Rails 5.2+ usa **credentials encriptados** para guardar secrets de forma segura.

### Ver credentials

```bash
EDITOR="code --wait" rails credentials:edit
```

**Contenido**:

```yaml
secret_key_base: your_secret_key_here

jwt:
  secret: your_jwt_secret_here

database:
  production:
    username: admin
    password: super_secret_password

aws:
  access_key_id: YOUR_AWS_KEY
  secret_access_key: YOUR_AWS_SECRET

stripe:
  publishable_key: pk_test_xxx
  secret_key: sk_test_xxx
```

### Acceder a credentials

```ruby
# En cualquier parte de la aplicación
Rails.application.credentials.jwt[:secret]
Rails.application.credentials.aws[:access_key_id]
Rails.application.credentials.stripe[:secret_key]
```

### Por entorno

```bash
# Editar credentials para producción
EDITOR="code --wait" rails credentials:edit --environment production
```

---

## 🌿 Variables de entorno (`.env`)

Para configuraciones que cambian frecuentemente o no son tan sensibles.

### Instalar `dotenv-rails`

```ruby
# Gemfile
gem 'dotenv-rails', groups: [:development, :test]
```

```bash
bundle install
```

### Crear `.env`

```bash
# .env
DATABASE_HOST=localhost
DATABASE_USER=postgres
DATABASE_PASSWORD=password

REDIS_URL=redis://localhost:6379/0

JWT_SECRET=my_super_secret_key
JWT_EXPIRATION=86400

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
```

### Uso

```ruby
ENV['JWT_SECRET']
ENV['DATABASE_HOST']
ENV.fetch('JWT_EXPIRATION', 86400).to_i
```

### Importante

**Agregar a `.gitignore`**:

```
.env
.env.local
.env.*.local
config/master.key
```

---

## 🎯 Ejemplo completo: Configuración de una API

### 1. `config/application.rb`

```ruby
module BlogApi
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true
    config.time_zone = 'America/Mexico_City'
    config.active_record.default_timezone = :utc
    config.autoload_paths << Rails.root.join('lib')
    config.log_level = :info

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

### 2. `config/database.yml`

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: blog_api_development
  host: localhost
  username: postgres
  password: postgres

production:
  <<: *default
  database: <%= ENV['DATABASE_NAME'] %>
  username: <%= ENV['DATABASE_USER'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
  host: <%= ENV['DATABASE_HOST'] %>
```

---

### 3. `config/routes.rb`

```ruby
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post 'auth/login', to: 'auth#login'
      delete 'auth/logout', to: 'auth#logout'

      resources :users, only: [:index, :show, :create, :update]
      resources :posts do
        resources :comments, only: [:index, :create, :destroy]
      end
    end
  end

  get 'health', to: 'health#check'
end
```

---

### 4. `.env`

```bash
DATABASE_HOST=localhost
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=86400

REDIS_URL=redis://localhost:6379/0
```

---

### 5. `config/initializers/cors.rb`

```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins Rails.env.production? ? ENV['ALLOWED_ORIGINS'].split(',') : '*'
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end
```

---

## 💡 Mejores prácticas

1. **Usa credentials para secrets sensibles** (API keys, passwords)
2. **Usa `.env` para configuraciones que cambian frecuentemente**
3. **NO commitees `.env` ni `master.key`** - agrégalos a `.gitignore`
4. **Usa variables de entorno en producción** - no hardcodees valores
5. **Configura CORS correctamente** - no uses `*` en producción
6. **Filtra parámetros sensibles** en logs (`password`, `token`, etc.)
7. **Configura pool de conexiones** según los threads de Puma
8. **Usa diferentes bases de datos** para cada entorno

---

## 📊 Comparación con otros frameworks

| Rails | Express (Node) | ASP.NET Core |
|-------|----------------|--------------|
| `config/application.rb` | `app.js` | `Startup.cs` / `Program.cs` |
| `config/database.yml` | `.env` | `appsettings.json` |
| `config/routes.rb` | `routes.js` | `Startup.cs` (MapControllers) |
| `config/environments/` | `NODE_ENV` | `appsettings.{env}.json` |
| `credentials.yml.enc` | `dotenv` + encryption | User Secrets / Azure Key Vault |
| `.env` | `.env` | `appsettings.json` |

---

## 🔗 Recursos adicionales

- [Configuring Rails Applications](https://guides.rubyonrails.org/configuring.html)
- [Rails Credentials](https://edgeguides.rubyonrails.org/security.html#custom-credentials)
- [Environment Variables in Rails](https://guides.rubyonrails.org/configuring.html#custom-configuration)

---

**Siguiente**: [mvc.md](./mvc.md)
