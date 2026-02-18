# Comandos básicos de Rails

Rails viene con un CLI potente que te permite generar código, gestionar la base de datos, y mucho más.

---

## 🚀 `rails new` - Crear un nuevo proyecto

### Sintaxis básica

```bash
rails new nombre_proyecto [opciones]
```

### Opciones comunes

```bash
# Proyecto API (sin vistas, assets, etc.)
rails new blog_api --api

# Especificar base de datos
rails new blog_api --database=postgresql
rails new blog_api --database=mysql
rails new blog_api --database=sqlite3  # Por defecto

# Sin tests (si usarás RSpec)
rails new blog_api --skip-test

# Sin Action Cable (WebSockets)
rails new blog_api --skip-action-cable

# Sin Action Mailer (emails)
rails new blog_api --skip-action-mailer

# Sin Active Storage (archivos)
rails new blog_api --skip-active-storage

# Sin Jbuilder (generador de JSON)
rails new blog_api --skip-jbuilder

# Combinar opciones
rails new blog_api --api --database=postgresql --skip-test
```

### Ejemplo completo: Proyecto API con PostgreSQL

```bash
rails new blog_api \
  --api \
  --database=postgresql \
  --skip-test \
  --skip-action-cable

cd blog_api
```

---

## 🌐 `rails server` - Iniciar el servidor

### Sintaxis básica

```bash
rails server
# o
rails s
```

### Opciones comunes

```bash
# Puerto personalizado (por defecto: 3000)
rails s -p 4000

# Enlazar a una IP específica
rails s -b 0.0.0.0  # Accesible desde otras máquinas

# Modo desarrollo (por defecto)
rails s -e development

# Modo producción
rails s -e production

# Daemon (en segundo plano)
rails s -d

# Detener daemon
kill $(cat tmp/pids/server.pid)
```

### Ejemplo práctico

```bash
# Iniciar en puerto 4000
rails s -p 4000

# Acceder desde el navegador o Postman
# http://localhost:4000
```

**Ctrl + C** para detener el servidor.

---

## 💻 `rails console` - Consola interactiva

La consola de Rails te permite interactuar con tu aplicación en tiempo real (similar a Node REPL).

### Sintaxis básica

```bash
rails console
# o
rails c
```

### Ejemplos en la consola

```ruby
# Crear un usuario
user = User.new(name: "Ana", email: "ana@example.com")
user.save

# O en una línea
User.create(name: "Luis", email: "luis@example.com")

# Consultar todos los usuarios
User.all

# Buscar por ID
User.find(1)

# Buscar por email
User.find_by(email: "ana@example.com")

# Actualizar
user = User.first
user.update(name: "Ana María")

# Eliminar
user.destroy

# Contar registros
User.count

# Ver el último query SQL ejecutado
User.last
# SQL: SELECT "users".* FROM "users" ORDER BY "users"."id" DESC LIMIT 1

# Reload (recargar clases sin reiniciar consola)
reload!

# Salir
exit
```

### Modo sandbox (no guarda cambios)

```bash
rails c --sandbox
```

Todo se revierte al salir (útil para experimentar).

---

## 🎨 `rails generate` - Generar código

Rails puede generar automáticamente modelos, controladores, migraciones, etc.

### Sintaxis básica

```bash
rails generate tipo nombre [opciones]
# o
rails g tipo nombre [opciones]
```

---

### 1️⃣ Generar un modelo

```bash
rails g model User name:string email:string age:integer active:boolean
```

**Genera**:
- `app/models/user.rb` (modelo)
- `db/migrate/20240101120000_create_users.rb` (migración)
- `spec/models/user_spec.rb` (test, si usas RSpec)

**Migración generada**:

```ruby
class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :name
      t.string :email
      t.integer :age
      t.boolean :active

      t.timestamps
    end
  end
end
```

---

### 2️⃣ Generar un controlador

```bash
rails g controller Api::V1::Users index show create update destroy
```

**Genera**:
- `app/controllers/api/v1/users_controller.rb`
- Rutas en `config/routes.rb` (opcional)
- Archivos de test

**Controlador generado**:

```ruby
module Api
  module V1
    class UsersController < ApplicationController
      def index
      end

      def show
      end

      def create
      end

      def update
      end

      def destroy
      end
    end
  end
end
```

---

### 3️⃣ Generar una migración

```bash
# Agregar columna
rails g migration AddPhoneToUsers phone:string

# Eliminar columna
rails g migration RemovePhoneFromUsers phone:string

# Crear índice
rails g migration AddIndexToUsersEmail

# Agregar foreign key
rails g migration AddUserRefToPosts user:references
```

**Ejemplo: Agregar columna**

```bash
rails g migration AddPhoneToUsers phone:string
```

**Genera**:

```ruby
class AddPhoneToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :phone, :string
  end
end
```

---

### 4️⃣ Generar un resource (modelo + controlador + rutas)

```bash
rails g resource Post title:string content:text user:references
```

**Genera**:
- Modelo (`app/models/post.rb`)
- Migración (`db/migrate/...`)
- Controlador (`app/controllers/posts_controller.rb`)
- Rutas (`resources :posts` en `routes.rb`)
- Tests

---

### 5️⃣ Generar un scaffold (todo completo)

```bash
rails g scaffold Article title:string content:text published:boolean
```

**Genera**:
- Modelo
- Migración
- Controlador con CRUD completo
- Serializer (si usas Active Model Serializers)
- Tests completos

**NO recomendado** para APIs profesionales (genera código innecesario).

---

### 6️⃣ Otros generadores útiles

```bash
# Serializer
rails g serializer User name email

# Job (background job)
rails g job SendWelcomeEmail

# Mailer
rails g mailer UserMailer welcome_email

# Channel (ActionCable)
rails g channel Notification

# Task (Rake task)
rails g task cleanup purge_old_data
```

---

### Deshacer un generador

Si te equivocaste, puedes revertir:

```bash
rails destroy model User
# o
rails d model User
```

Esto elimina todos los archivos generados.

---

## 🗄️ Comandos de base de datos

### `rails db:create` - Crear la base de datos

```bash
rails db:create
```

Crea las bases de datos definidas en `config/database.yml`:
- `myapp_development`
- `myapp_test`

---

### `rails db:migrate` - Ejecutar migraciones

```bash
rails db:migrate
```

Aplica todas las migraciones pendientes.

**Ejemplo**:

```bash
# Crear migración
rails g migration CreateUsers name:string email:string

# Ejecutar migración
rails db:migrate

# Ver el schema actualizado
cat db/schema.rb
```

---

### `rails db:rollback` - Revertir migraciones

```bash
# Revertir la última migración
rails db:rollback

# Revertir las últimas 3 migraciones
rails db:rollback STEP=3

# Revertir a una versión específica
rails db:migrate:down VERSION=20240101120000
```

---

### `rails db:migrate:status` - Estado de migraciones

```bash
rails db:migrate:status
```

**Salida**:

```
database: blog_api_development

 Status   Migration ID    Migration Name
--------------------------------------------------
   up     20240101120000  Create users
   up     20240101130000  Create posts
  down    20240101140000  Add phone to users
```

---

### `rails db:seed` - Poblar base de datos

```bash
rails db:seed
```

Ejecuta el archivo `db/seeds.rb`:

```ruby
# db/seeds.rb
User.create!(name: "Admin", email: "admin@example.com")
User.create!(name: "User", email: "user@example.com")

10.times do |i|
  Post.create!(
    title: "Post #{i}",
    content: "Content for post #{i}",
    user: User.first
  )
end

puts "Created #{User.count} users and #{Post.count} posts"
```

---

### `rails db:reset` - Reiniciar base de datos

```bash
rails db:reset
```

Equivale a:

```bash
rails db:drop
rails db:create
rails db:migrate
rails db:seed
```

**Cuidado**: Elimina TODOS los datos.

---

### `rails db:setup` - Configurar base de datos

```bash
rails db:setup
```

Equivale a:

```bash
rails db:create
rails db:schema:load  # Carga el schema.rb directamente (más rápido que migrate)
rails db:seed
```

Útil al clonar un proyecto.

---

## 🗺️ `rails routes` - Ver todas las rutas

```bash
rails routes
```

**Salida**:

```
                   Prefix Verb   URI Pattern                  Controller#Action
         api_v1_users GET    /api/v1/users(.:format)      api/v1/users#index
                      POST   /api/v1/users(.:format)      api/v1/users#create
          api_v1_user GET    /api/v1/users/:id(.:format)  api/v1/users#show
                      PATCH  /api/v1/users/:id(.:format)  api/v1/users#update
                      PUT    /api/v1/users/:id(.:format)  api/v1/users#update
                      DELETE /api/v1/users/:id(.:format)  api/v1/users#destroy
```

### Filtrar rutas

```bash
# Buscar rutas de usuarios
rails routes | grep user

# Buscar rutas de un controlador específico
rails routes -c users

# Buscar rutas GET
rails routes | grep GET
```

---

## 🧪 `rails test` - Ejecutar tests

### Con Minitest (por defecto)

```bash
# Ejecutar todos los tests
rails test

# Ejecutar tests de modelos
rails test:models

# Ejecutar tests de controladores
rails test:controllers

# Ejecutar un archivo específico
rails test test/models/user_test.rb

# Ejecutar un test específico (línea)
rails test test/models/user_test.rb:10
```

### Con RSpec (si lo instalaste)

```bash
# Ejecutar todos los tests
bundle exec rspec

# Ejecutar tests de modelos
bundle exec rspec spec/models

# Ejecutar un archivo específico
bundle exec rspec spec/models/user_spec.rb

# Ejecutar un test específico (línea)
bundle exec rspec spec/models/user_spec.rb:10
```

---

## 📊 `rails stats` - Estadísticas del código

```bash
rails stats
```

**Salida**:

```
+----------------------+--------+--------+---------+---------+-----+-------+
| Name                 |  Lines |    LOC | Classes | Methods | M/C | LOC/M |
+----------------------+--------+--------+---------+---------+-----+-------+
| Controllers          |    150 |    120 |       5 |      20 |   4 |     6 |
| Models               |    200 |    160 |       8 |      30 |   3 |     5 |
| Serializers          |     80 |     60 |       4 |      12 |   3 |     5 |
| Mailers              |     40 |     30 |       2 |       4 |   2 |     7 |
| Jobs                 |     30 |     20 |       2 |       2 |   1 |    10 |
+----------------------+--------+--------+---------+---------+-----+-------+
| Total                |    500 |    390 |      21 |      68 |   3 |     5 |
+----------------------+--------+--------+---------+---------+-----+-------+
  Code LOC: 390     Test LOC: 0     Code to Test Ratio: 1:0.0
```

---

## 🔍 Otros comandos útiles

### Ver versión de Rails

```bash
rails -v
# Rails 7.1.0
```

### Ver todas las tareas Rake disponibles

```bash
rails -T
# o
rake -T
```

### Limpiar archivos temporales

```bash
rails tmp:clear
```

### Limpiar cache

```bash
rails tmp:cache:clear
```

### Ver logs en tiempo real

```bash
tail -f log/development.log
```

### Ver el entorno actual

```bash
rails runner "puts Rails.env"
# development
```

### Ejecutar código Ruby en el contexto de Rails

```bash
rails runner "puts User.count"
# 10
```

---

## 🔥 Workflow típico de desarrollo

### 1. Crear un nuevo proyecto

```bash
rails new blog_api --api --database=postgresql
cd blog_api
```

### 2. Crear la base de datos

```bash
rails db:create
```

### 3. Generar un modelo

```bash
rails g model Post title:string content:text published:boolean
```

### 4. Ejecutar migraciones

```bash
rails db:migrate
```

### 5. Generar un controlador

```bash
rails g controller Api::V1::Posts index show create update destroy
```

### 6. Definir rutas

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :posts
    end
  end
end
```

### 7. Ver las rutas

```bash
rails routes
```

### 8. Iniciar el servidor

```bash
rails s
```

### 9. Probar en la consola

```bash
rails c

# Crear posts
Post.create(title: "First Post", content: "Hello World", published: true)
Post.create(title: "Second Post", content: "Testing", published: false)

# Consultar
Post.all
Post.where(published: true)
```

### 10. Poblar datos de prueba

```ruby
# db/seeds.rb
10.times do |i|
  Post.create!(
    title: "Post #{i}",
    content: "This is the content for post #{i}",
    published: [true, false].sample
  )
end

puts "Created #{Post.count} posts"
```

```bash
rails db:seed
```

---

## 💡 Mejores prácticas

1. **Usa `rails g` con moderación** - No abuses de los generadores en producción
2. **Revierte con `rails d`** - Si te equivocas, usa `destroy` en lugar de borrar manualmente
3. **Migra frecuentemente** - Corre `rails db:migrate` después de cada generación
4. **Usa la consola** - `rails c` es tu mejor amigo para debugging
5. **Revisa las rutas** - Usa `rails routes` para ver los endpoints disponibles
6. **Crea seeds** - Mantén un `db/seeds.rb` actualizado para datos de prueba
7. **Usa sandbox** - `rails c --sandbox` para experimentar sin riesgo

---

## 🎓 Ejercicio práctico

Crea una API de blog completa:

```bash
# 1. Crear proyecto
rails new blog_api --api --database=postgresql
cd blog_api

# 2. Crear base de datos
rails db:create

# 3. Generar modelos
rails g model User name:string email:string
rails g model Post title:string content:text published:boolean user:references

# 4. Ejecutar migraciones
rails db:migrate

# 5. Generar controladores
rails g controller Api::V1::Users index show create
rails g controller Api::V1::Posts index show create update destroy

# 6. Definir rutas
# (Editar config/routes.rb manualmente)

# 7. Poblar datos
# (Editar db/seeds.rb)
rails db:seed

# 8. Probar en consola
rails c

# 9. Iniciar servidor
rails s
```

---

## 📊 Comparación con otros frameworks

| Rails | Express (Node) | ASP.NET Core |
|-------|----------------|--------------|
| `rails new` | `npm init` + `express-generator` | `dotnet new webapi` |
| `rails s` | `npm start` | `dotnet run` |
| `rails c` | `node` | No tiene equivalente directo |
| `rails g model` | No tiene generador | `dotnet ef migrations add` |
| `rails db:migrate` | `npx sequelize-cli db:migrate` | `dotnet ef database update` |
| `rails routes` | Revisar código o usar herramienta | Revisar código |

---

## 🔗 Recursos adicionales

- [Rails Command Line Guide](https://guides.rubyonrails.org/command_line.html)
- [Rails Generators](https://guides.rubyonrails.org/generators.html)
- [Active Record Migrations](https://guides.rubyonrails.org/active_record_migrations.html)

---

**Siguiente**: [configuracion.md](./configuracion.md)
