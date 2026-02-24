# Preguntas de Entrevista para Ruby on Rails (Senior)

Este documento contiene una recopilación de preguntas y respuestas relacionadas con Ruby on Rails, Active Record, Action Cable y Sidekiq, diseñadas para ayudar a desarrolladores senior a prepararse para entrevistas técnicas.

---

## Active Record

### 1. ¿Cuándo NO usarías Active Record?
- **Cuando necesitas alta flexibilidad en las consultas**: Si tu aplicación requiere consultas SQL muy complejas o personalizadas, Active Record puede ser limitado y menos eficiente que usar SQL puro o un ORM más flexible como Sequel.
- **Cuando trabajas con bases de datos no relacionales**: Active Record está diseñado para bases de datos relacionales. Si usas bases de datos NoSQL como MongoDB, no es adecuado.
- **Cuando necesitas un modelo de dominio más rico**: Active Record mezcla lógica de negocio con la persistencia de datos, lo que puede violar principios de diseño como la separación de responsabilidades. En estos casos, podrías usar un patrón como Data Mapper o Repositorios.

### 2. ¿Qué es el problema N+1?
- **Definición**: El problema N+1 ocurre cuando una consulta inicial a la base de datos genera múltiples consultas adicionales para obtener datos relacionados. Esto puede causar un impacto significativo en el rendimiento.
- **Ejemplo**:
```ruby
# Problema N+1
users = User.all
users.each do |user|
  puts user.posts.count # Esto genera una consulta por cada usuario
end

# Solución: Usar `includes` para evitar el problema N+1
users = User.includes(:posts)
users.each do |user|
  puts user.posts.count # Carga los posts en una sola consulta
end
```
- **Cómo evitarlo**: Utiliza métodos como `includes`, `joins` o `eager_load` para cargar las relaciones necesarias en una sola consulta.

### 3. ¿Cómo optimizas relaciones?
- **Estrategias comunes**:
  1. **Eager Loading**: Usa `includes` para cargar relaciones de manera anticipada y evitar el problema N+1.
  2. **Indexación**: Asegúrate de que las columnas utilizadas en las relaciones (como claves foráneas) estén indexadas.
  3. **Scopes**: Define consultas reutilizables y optimizadas en los modelos.
  4. **Paginar resultados**: Usa gemas como `kaminari` o `will_paginate` para limitar la cantidad de datos cargados.
  5. **Cacheo**: Implementa cacheo para evitar consultas repetitivas a la base de datos.

### 4. ¿Active Record viola Clean Architecture?
- **Sí, puede violarla**: Active Record mezcla la lógica de negocio con la lógica de persistencia, lo que va en contra del principio de separación de responsabilidades de Clean Architecture. En este enfoque, los modelos deberían ser entidades puras que no dependan de la base de datos.
- **Alternativa**: Usar el patrón Repository para separar la lógica de negocio de la persistencia. Ejemplo:
```ruby
class UserRepository
  def find_by_email(email)
    User.find_by(email: email)
  end
end

class UserService
  def initialize(user_repository = UserRepository.new)
    @user_repository = user_repository
  end

  def activate_user(email)
    user = @user_repository.find_by_email(email)
    user.activate! if user
  end
end
```

### 5. ¿Cómo testearías modelos con callbacks?
- **Estrategias**:
  1. **Pruebas unitarias**: Asegúrate de que los callbacks se ejecuten correctamente en los escenarios esperados.
  2. **Usa `before_save` y `after_save`**: Verifica que los cambios esperados ocurran antes o después de guardar el modelo.
  3. **Mocks y stubs**: Usa herramientas como `RSpec` para simular el comportamiento de los callbacks.
  4. **Evita lógica compleja en callbacks**: Si un callback tiene demasiada lógica, considera moverla a un servicio o modelo separado para facilitar las pruebas.

- **Ejemplo**:
```ruby
# app/models/user.rb
class User < ApplicationRecord
  before_save :normalize_name

  private

  def normalize_name
    self.name = name.downcase.titleize
  end
end

# spec/models/user_spec.rb
RSpec.describe User, type: :model do
  it "normaliza el nombre antes de guardar" do
    user = User.new(name: "jUAN perez")
    user.save
    expect(user.name).to eq("Juan Perez")
  end
end
```

### 6. ¿Cómo manejarías lógica de negocio compleja?
- **No en los modelos**: Evita sobrecargar los modelos con lógica de negocio compleja. Los modelos deben ser responsables de la validación y la persistencia de datos.
- **Usa servicios**: Implementa clases de servicio para encapsular la lógica de negocio. Esto mejora la reutilización y el testeo.
- **Ejemplo de clase de servicio**:
```ruby
# app/services/order_processor.rb
class OrderProcessor
  def initialize(order)
    @order = order
  end

  def process
    ActiveRecord::Base.transaction do
      @order.update!(status: "processing")
      PaymentGateway.charge(@order)
      @order.update!(status: "completed")
    end
  rescue => e
    @order.update!(status: "failed")
    raise e
  end
end

# Uso en un controlador
class OrdersController < ApplicationController
  def create
    order = Order.new(order_params)
    if order.save
      OrderProcessor.new(order).process
      render json: order, status: :created
    else
      render json: order.errors, status: :unprocessable_entity
    end
  end

  private

  def order_params
    params.require(:order).permit(:amount, :user_id)
  end
end
```

---

## Action Cable

### ¿Por qué Action Cable necesita Redis?
- **Pub/Sub**: Redis actúa como un sistema de publicación/suscripción que permite a los servidores de Action Cable comunicarse entre sí.
- **Coordinación entre servidores**: En una configuración de múltiples servidores, Redis asegura que los mensajes enviados a un canal sean recibidos por todos los clientes suscritos, sin importar en qué servidor estén conectados.
- **Alto rendimiento**: Redis es rápido y eficiente para manejar grandes volúmenes de mensajes en tiempo real.

### ¿Cómo escala horizontalmente?
- **Uso de Redis**: Redis permite que múltiples instancias de Action Cable compartan el mismo backend de mensajes, lo que facilita la escalabilidad horizontal.
- **Balanceadores de carga**: Se pueden usar balanceadores de carga (como NGINX o AWS ELB) para distribuir las conexiones WebSocket entre múltiples servidores.

### ¿Diferencia entre `stream_from` y `stream_for`?
- **`stream_from`**:
  - Se utiliza para escuchar un canal específico.
  - Ejemplo:
  ```ruby
  stream_from "chat_channel"
  ```

- **`stream_for`**:
  - Es un atajo para crear un canal único basado en un modelo o recurso específico.
  - Ejemplo:
  ```ruby
  stream_for current_user
  ```

### ¿Dónde autenticas y dónde autorizas?
- **Autenticación**:
  - Se realiza en el archivo `ApplicationCable::Connection`.
  - Ejemplo:
  ```ruby
  module ApplicationCable
    class Connection < ActionCable::Connection::Base
      identified_by :current_user

      def connect
        self.current_user = find_verified_user
      end

      private

      def find_verified_user
        if (user = User.find_by(id: cookies.signed[:user_id]))
          user
        else
          reject_unauthorized_connection
        end
      end
    end
  end
  ```

- **Autorización**:
  - Se realiza en los canales específicos, generalmente en el método `subscribed`.
  - Ejemplo:
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

---

## Sidekiq

### ¿Por qué Sidekiq usa Redis?
- **Alto rendimiento**: Redis es una base de datos en memoria extremadamente rápida, lo que permite a Sidekiq manejar miles de trabajos por segundo.
- **Estructuras de datos optimizadas**: Redis utiliza listas y conjuntos ordenados, que son ideales para gestionar colas de trabajos.
- **Persistencia opcional**: Redis puede almacenar datos en disco, lo que permite recuperar trabajos en caso de reinicio.
- **Soporte para Pub/Sub**: Esto permite que Sidekiq implemente notificaciones en tiempo real y comunicación eficiente entre procesos.

### ¿Qué pasa si Redis cae?
- **Pérdida de trabajos en memoria**: Si Redis no está configurado para persistir datos en disco, los trabajos en memoria se perderán.
- **Interrupción del procesamiento**: Sidekiq no puede procesar trabajos sin Redis, ya que depende de él para gestionar las colas.
- **Soluciones**:
  1. Configurar Redis con persistencia (RDB o AOF).
  2. Implementar un clúster de Redis con alta disponibilidad (Redis Sentinel o Redis Cluster).
  3. Monitorear Redis con herramientas como `Redis Monitor` o `Prometheus` para detectar problemas rápidamente.

### ¿Cómo evitas jobs duplicados?
- **Uso de claves únicas en Redis**: Puedes usar gemas como `sidekiq-unique-jobs` para garantizar que no se encolen trabajos duplicados.
- **Ejemplo con `sidekiq-unique-jobs`**:
```ruby
class MyWorker
  include Sidekiq::Worker
  sidekiq_options unique: :until_executed

  def perform(args)
    # Lógica del trabajo
  end
end
```
- **Evitar reintentos innecesarios**: Configura el número de reintentos y el tiempo de expiración de los jobs para evitar duplicados.

### ¿Cómo escalas Sidekiq?
- **Estrategias de escalabilidad**:
  1. **Aumentar el número de procesos**: Ejecuta múltiples procesos de Sidekiq en diferentes servidores.
  2. **Configurar múltiples colas**: Prioriza trabajos críticos asignándolos a colas específicas con mayor prioridad.
  3. **Optimizar Redis**: Usa un clúster de Redis para manejar grandes volúmenes de datos.
  4. **Monitoreo y métricas**: Usa herramientas como `Sidekiq Pro` o `Sidekiq Enterprise` para obtener métricas avanzadas y monitoreo.

---

¡Prepárate bien para tu entrevista y demuestra tus habilidades avanzadas en Ruby on Rails! 🚀