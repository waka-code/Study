# Active Record: Preguntas y Respuestas

Este documento está enfocado en preguntas relacionadas con Active Record, el ORM de Ruby on Rails. Aquí encontrarás respuestas detalladas y ejemplos prácticos para prepararte para entrevistas técnicas.

---

## Preguntas y Respuestas

### 1️⃣ ¿Cuándo NO usarías Active Record?
- **Cuando necesitas alta flexibilidad en las consultas**: Si tu aplicación requiere consultas SQL muy complejas o personalizadas, Active Record puede ser limitado y menos eficiente que usar SQL puro o un ORM más flexible como Sequel.
- **Cuando trabajas con bases de datos no relacionales**: Active Record está diseñado para bases de datos relacionales. Si usas bases de datos NoSQL como MongoDB, no es adecuado.
- **Cuando necesitas un modelo de dominio más rico**: Active Record mezcla lógica de negocio con la persistencia de datos, lo que puede violar principios de diseño como la separación de responsabilidades. En estos casos, podrías usar un patrón como Data Mapper o Repositorios.

---

### 2️⃣ ¿Qué es el problema N+1?
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

---

### 3️⃣ ¿Cómo optimizas relaciones?
- **Estrategias comunes**:
  1. **Eager Loading**: Usa `includes` para cargar relaciones de manera anticipada y evitar el problema N+1.
  2. **Indexación**: Asegúrate de que las columnas utilizadas en las relaciones (como claves foráneas) estén indexadas.
  3. **Scopes**: Define consultas reutilizables y optimizadas en los modelos.
  4. **Paginar resultados**: Usa gemas como `kaminari` o `will_paginate` para limitar la cantidad de datos cargados.
  5. **Cacheo**: Implementa cacheo para evitar consultas repetitivas a la base de datos.

---

### 4️⃣ ¿Active Record viola Clean Architecture?
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

---

### 5️⃣ ¿Cómo testearías modelos con callbacks?
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

---

### 6️⃣ ¿Cómo manejarías lógica de negocio compleja?
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

- **Divide y vencerás**: Divide la lógica en métodos pequeños y reutilizables. Usa patrones como Strategy o Command para manejar diferentes casos de uso.

---

¡Prepárate bien y mucha suerte en tu entrevista! 🚀