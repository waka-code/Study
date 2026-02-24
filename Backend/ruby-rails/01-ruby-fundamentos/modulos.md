# Módulos en Ruby

Los **módulos** permiten compartir comportamiento entre clases sin usar herencia.

---

## 📦 ¿Qué es un Módulo?

Un módulo es un **contenedor de métodos** que puedes incluir en clases.

```ruby
module Greetable
  def greet
    "Hola, soy #{name}"
  end
end

class User
  include Greetable  # Incluye el módulo
  attr_accessor :name

  def initialize(name)
    @name = name
  end
end

user = User.new("Ana")
user.greet  # => "Hola, soy Ana"
```

---

## 🔄 include vs extend vs prepend

### include (métodos de instancia)

```ruby
module Swimmable
  def swim
    "Estoy nadando"
  end
end

class Fish
  include Swimmable
end

fish = Fish.new
fish.swim  # => "Estoy nadando"
```

---

### extend (métodos de clase)

```ruby
module Findable
  def find_by_name(name)
    "Buscando #{name}..."
  end
end

class User
  extend Findable
end

User.find_by_name("Ana")  # => "Buscando Ana..."
```

---

### prepend (sobrescribir métodos)

```ruby
module Loggable
  def save
    puts "Guardando..."
    super  # Llama al método original
  end
end

class User
  def save
    puts "User guardado"
  end
end

class User
  prepend Loggable
end

user = User.new
user.save
# Guardando...
# User guardado
```

**Diferencia clave**:
- `include`: agrega métodos **después** de los de la clase
- `prepend`: agrega métodos **antes** de los de la clase

---

## 🧩 Namespaces (organización)

Los módulos también sirven para **organizar código**.

```ruby
module Api
  module V1
    class UsersController
      def index
        "API V1 Users"
      end
    end
  end
end

controller = Api::V1::UsersController.new
controller.index  # => "API V1 Users"
```

**En Rails**:

```
app/controllers/api/v1/users_controller.rb

module Api
  module V1
    class UsersController < ApplicationController
    end
  end
end
```

---

## 🔧 Módulos con configuración

```ruby
module Timestampable
  def self.included(base)
    base.class_eval do
      attr_accessor :created_at, :updated_at
    end
  end

  def touch
    @updated_at = Time.now
  end
end

class User
  include Timestampable

  def initialize
    @created_at = Time.now
    @updated_at = Time.now
  end
end

user = User.new
user.touch
user.updated_at  # => tiempo actual
```

---

## 🎯 Ejemplo práctico: Módulo de validación

```ruby
module Validatable
  def valid?
    validate
    errors.empty?
  end

  def errors
    @errors ||= []
  end

  def validate
    # Implementado en cada clase
    raise NotImplementedError
  end
end

class User
  include Validatable
  attr_accessor :name, :email

  def initialize(name, email)
    @name = name
    @email = email
  end

  def validate
    errors << "Name is required" if name.nil? || name.empty?
    errors << "Email is required" if email.nil? || email.empty?
    errors << "Invalid email" unless email&.include?("@")
  end
end

user = User.new("", "invalid")
user.valid?  # => false
user.errors  # => ["Name is required", "Invalid email"]
```

---

## 🔥 ActiveSupport::Concern (patrón Rails)

Rails usa `ActiveSupport::Concern` para simplificar módulos.

```ruby
module Timestampable
  extend ActiveSupport::Concern

  included do
    before_save :set_timestamps
  end

  def set_timestamps
    self.updated_at = Time.now
    self.created_at ||= Time.now
  end

  class_methods do
    def recent
      where("created_at > ?", 1.week.ago)
    end
  end
end

class User < ApplicationRecord
  include Timestampable
end

User.recent  # Método de clase
user = User.new
user.set_timestamps  # Método de instancia
```

---

## 🧪 Múltiples inclusiones

```ruby
module Greetable
  def greet
    "Hola"
  end
end

module Loggable
  def log(message)
    puts "[LOG] #{message}"
  end
end

class User
  include Greetable
  include Loggable
end

user = User.new
user.greet  # => "Hola"
user.log("User created")  # => "[LOG] User created"
```

---

## 📊 Orden de búsqueda de métodos (Method Lookup)

```ruby
module A
  def test
    "A"
  end
end

module B
  def test
    "B"
  end
end

class C
  include A
  include B
end

C.new.test  # => "B" (último incluido gana)
C.ancestors  # => [C, B, A, Object, Kernel, BasicObject]
```

**Con prepend**:

```ruby
class C
  prepend B
  include A
end

C.new.test  # => "B"
C.ancestors  # => [B, C, A, Object, Kernel, BasicObject]
```

---

## 🎯 Cuándo usar módulos

### ✅ Usa módulos cuando:

1. **Compartir comportamiento** entre clases no relacionadas
   ```ruby
   module Exportable
     def to_csv
       # ...
     end
   end

   class User
     include Exportable
   end

   class Product
     include Exportable
   end
   ```

2. **Organizar código** (namespaces)
   ```ruby
   module Admin
     class DashboardController
     end
   end
   ```

3. **Agregar funcionalidad** sin herencia
   ```ruby
   module Searchable
     def search(query)
       # ...
     end
   end
   ```

---

### ❌ NO uses módulos cuando:

1. Hay una clara relación **"es un"** (usa herencia)
   ```ruby
   # Mal
   module AnimalBehavior
   end

   class Dog
     include AnimalBehavior
   end

   # Bien
   class Animal
   end

   class Dog < Animal
   end
   ```

2. Solo **una clase** lo usará (define métodos directamente)

---

## 🔥 Patrones comunes en Rails

### Concerns (app/models/concerns/)

```ruby
# app/models/concerns/sluggable.rb
module Sluggable
  extend ActiveSupport::Concern

  included do
    before_save :generate_slug
  end

  def generate_slug
    self.slug = name.parameterize
  end
end

# app/models/post.rb
class Post < ApplicationRecord
  include Sluggable
end
```

---

### Mixins para servicios

```ruby
module Notifiable
  def notify_user(user, message)
    NotificationService.send(user, message)
  end
end

class OrderService
  include Notifiable

  def create_order(user, items)
    order = Order.create(user: user, items: items)
    notify_user(user, "Order created")
    order
  end
end
```

---

## 📌 Módulos vs Clases

| Módulos | Clases |
|---------|--------|
| NO se pueden instanciar | Se pueden instanciar |
| NO tienen herencia | Tienen herencia |
| Se usan con `include`/`extend` | Se usan con `new` |
| Agrupan comportamiento | Representan objetos |

---

## 💡 Mejores prácticas

1. **Usa nombres descriptivos** terminados en `-able` o `-ible`
   - `Searchable`, `Exportable`, `Notifiable`

2. **Mantén módulos pequeños** y enfocados en **una responsabilidad**

3. **Usa `ActiveSupport::Concern`** en Rails para módulos complejos

4. **Documenta dependencias**: si el módulo espera ciertos métodos/atributos

5. **Prefiere composición** (módulos) sobre herencia profunda

---

## 🧠 Ejemplo completo

```ruby
module Timestampable
  extend ActiveSupport::Concern

  included do
    before_create :set_created_at
    before_save :set_updated_at
  end

  def set_created_at
    self.created_at = Time.current
  end

  def set_updated_at
    self.updated_at = Time.current
  end
end

module Sluggable
  extend ActiveSupport::Concern

  included do
    before_save :generate_slug
  end

  def generate_slug
    self.slug = title.parameterize if title_changed?
  end
end

class Post < ApplicationRecord
  include Timestampable
  include Sluggable

  validates :title, presence: true
end

post = Post.create(title: "Mi Primer Post")
post.slug  # => "mi-primer-post"
post.created_at  # => 2025-01-15 10:30:00
```

**Siguiente**: [manejo-errores.md](./manejo-errores.md)
