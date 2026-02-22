# Ruby on Rails: De Junior a Senior

## Introducción
Este documento está diseñado para ayudarte a dominar Ruby on Rails a nivel senior, enfocándote en los temas clave: desarrollo de APIs RESTful, ActiveRecord, trabajos en segundo plano (Sidekiq) y Action Cable. Aquí encontrarás explicaciones, ejemplos prácticos y una progresión desde conceptos básicos hasta avanzados.

---

## 1. Desarrollo de APIs RESTful

### Junior
- **Conceptos básicos de REST**:
  - ¿Qué es REST? Principios fundamentales (Stateless, Uniform Interface, etc.).
  - Métodos HTTP: GET, POST, PUT, DELETE.
  - Estructura de rutas en Rails (`config/routes.rb`).

- **Ejemplo básico**:
```ruby
# config/routes.rb
Rails.application.routes.draw do
  resources :articles
end

# app/controllers/articles_controller.rb
class ArticlesController < ApplicationController
  def index
    @articles = Article.all
    render json: @articles
  end

  def show
    @article = Article.find(params[:id])
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

  private

  def article_params
    params.require(:article).permit(:title, :content)
  end
end
```

### Mid-Level
- **Serialización**:
  - Uso de `ActiveModel::Serializers` o `Jbuilder` para estructurar respuestas JSON.
  - Ejemplo con ActiveModel::Serializers:

```ruby
# app/serializers/article_serializer.rb
class ArticleSerializer < ActiveModel::Serializer
  attributes :id, :title, :content, :created_at
end
```

- **Autenticación y autorización**:
  - Implementar autenticación con `Devise` o `JWT`.
  - Controlar el acceso a recursos con `Pundit` o `CanCanCan`.

### Senior
- **Optimización de APIs**:
  - Paginación con `kaminari` o `will_paginate`.
  - Cacheo de respuestas con `Rails.cache` o `FastJsonapi`.
  - Versionado de APIs.

- **Ejemplo avanzado**:
```ruby
# app/controllers/api/v1/articles_controller.rb
module Api
  module V1
    class ArticlesController < ApplicationController
      before_action :set_article, only: [:show, :update, :destroy]

      def index
        @articles = Article.page(params[:page]).per(10)
        render json: @articles, each_serializer: ArticleSerializer
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

      private

      def set_article
        @article = Article.find(params[:id])
      end

      def article_params
        params.require(:article).permit(:title, :content)
      end
    end
  end
end
```

---

## 2. ActiveRecord

### Junior
- **Conceptos básicos**:
  - ¿Qué es ActiveRecord? ORM en Rails.
  - Migraciones: Crear y modificar tablas.
  - Métodos básicos: `find`, `where`, `create`, `update`, `destroy`.

- **Ejemplo básico**:
```ruby
# Crear una migración
rails generate migration CreateArticles title:string content:text

# Modelo básico
class Article < ApplicationRecord
  validates :title, presence: true
  validates :content, length: { minimum: 10 }
end

# Uso en consola Rails
Article.create(title: "Mi primer artículo", content: "Contenido del artículo")
Article.where(title: "Mi primer artículo")
```

### Mid-Level
- **Consultas avanzadas**:
  - Uso de scopes para consultas reutilizables.
  - Métodos como `joins`, `includes` y `eager_load` para evitar N+1 queries.

- **Ejemplo**:
```ruby
class Article < ApplicationRecord
  scope :recent, -> { where("created_at >= ?", 1.week.ago) }
end

# Uso del scope
Article.recent.includes(:comments)
```

### Senior
- **Optimización de consultas**:
  - Indexación de columnas para mejorar el rendimiento.
  - Uso de `raw SQL` y `Arel` para consultas complejas.
  - Estrategias de particionamiento y sharding.

- **Ejemplo avanzado**:
```ruby
# Consulta con Arel
Article.where(Article.arel_table[:created_at].gt(1.week.ago))
```

---

## 3. Trabajos en segundo plano (Sidekiq)

### Junior
- **Introducción a Sidekiq**:
  - ¿Qué es Sidekiq? Procesamiento de trabajos en segundo plano.
  - Configuración básica de Sidekiq en un proyecto Rails.

- **Ejemplo básico**:
```ruby
# Gemfile
gem 'sidekiq'

# Configuración en config/application.rb
config.active_job.queue_adapter = :sidekiq

# Crear un job
rails generate job ExampleJob

# app/jobs/example_job.rb
class ExampleJob < ApplicationJob
  queue_as :default

  def perform(*args)
    # Lógica del trabajo
    puts "Ejecutando trabajo en segundo plano"
  end
end

# Enviar un trabajo a la cola
ExampleJob.perform_later("argumento")
```

### Mid-Level
- **Gestión de colas**:
  - Configurar múltiples colas con diferentes prioridades.
  - Monitoreo de Sidekiq con la interfaz web.

- **Ejemplo**:
```yaml
# config/sidekiq.yml
:queues:
  - default
  - mailers
  - critical
```

### Senior
- **Optimización y escalabilidad**:
  - Uso de Redis para manejar grandes volúmenes de trabajos.
  - Retries y manejo de errores personalizados.
  - Implementación de trabajos en lotes (batches).

- **Ejemplo avanzado**:
```ruby
class BatchJob
  include Sidekiq::Worker

  def perform(batch_id)
    # Procesar un lote de trabajos
    Batch.find(batch_id).process!
  end
end
```

---

## 4. Action Cable

### Junior
- **Introducción a Action Cable**:
  - ¿Qué es Action Cable? WebSockets en Rails.
  - Configuración básica de Action Cable.

- **Ejemplo básico**:
```ruby
# app/channels/chat_channel.rb
class ChatChannel < ApplicationCable::Channel
  def subscribed
    stream_from "chat_channel"
  end

  def unsubscribed
    # Cleanup cuando el cliente se desconecta
  end

  def speak(data)
    ActionCable.server.broadcast "chat_channel", message: data["message"]
  end
end

# app/assets/javascripts/channels/chat_channel.js
import consumer from "./consumer"

consumer.subscriptions.create("ChatChannel", {
  connected() {
    console.log("Conectado al canal de chat")
  },

  received(data) {
    console.log(data.message)
  },

  speak(message) {
    this.perform("speak", { message: message })
  }
})
```

### Mid-Level
- **Autenticación y autorización**:
  - Restringir acceso a canales con `current_user`.
  - Implementar lógica de suscripción dinámica.

- **Ejemplo**:
```ruby
class ChatChannel < ApplicationCable::Channel
  def subscribed
    if current_user.can_access?(params[:room_id])
      stream_from "chat_#{params[:room_id]}"
    else
      reject
    end
  end
end
```

### Senior
- **Optimización y escalabilidad**:
  - Uso de Redis para manejar múltiples servidores.
  - Implementación de notificaciones en tiempo real.
  - Integración con servicios externos como Firebase o Pusher.

- **Ejemplo avanzado**:
```ruby
# Notificaciones en tiempo real
class NotificationChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_user
  end

  def notify(data)
    NotificationChannel.broadcast_to(current_user, title: data["title"], body: data["body"])
  end
end
```

---

## Recursos adicionales
- [Documentación oficial de Ruby on Rails](https://guides.rubyonrails.org/)
- [Sidekiq](https://sidekiq.org/)
- [Action Cable](https://guides.rubyonrails.org/action_cable_overview.html)
- [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html)

---

¡Buena suerte en tu camino hacia el dominio de Ruby on Rails a nivel senior!