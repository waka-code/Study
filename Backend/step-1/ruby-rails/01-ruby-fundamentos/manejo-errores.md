# Manejo de Errores en Ruby

Ruby usa **excepciones** para manejar errores, similar a try/catch en otros lenguajes.

---

## 🚨 begin / rescue / ensure

```ruby
begin
  # Código que puede lanzar error
  result = 10 / 0
rescue
  # Si hay error, se ejecuta esto
  puts "Ocurrió un error"
end
```

---

## 📌 Capturar excepciones específicas

```ruby
begin
  file = File.open("archivo.txt")
  content = file.read
rescue Errno::ENOENT
  puts "Archivo no encontrado"
rescue Errno::EACCES
  puts "Sin permisos de lectura"
ensure
  file.close if file
end
```

**Estructura**:
- `begin`: código a ejecutar
- `rescue`: captura el error
- `ensure`: **siempre** se ejecuta (aunque haya error o no)

---

## 🔍 Acceder al objeto de error

```ruby
begin
  10 / 0
rescue ZeroDivisionError => e
  puts "Error: #{e.message}"
  puts "Tipo: #{e.class}"
  puts "Backtrace: #{e.backtrace.first}"
end
```

---

## 🎯 Tipos de excepciones comunes

```ruby
# ZeroDivisionError
10 / 0

# NoMethodError
nil.upcase

# TypeError
"10" + 10

# ArgumentError
def greet(name)
end
greet()  # Falta argumento

# NameError
puts undefined_variable

# RuntimeError (error genérico)
raise "Algo salió mal"
```

---

## 🔥 Lanzar excepciones (raise)

```ruby
def divide(a, b)
  raise ArgumentError, "b no puede ser 0" if b == 0
  a / b
end

begin
  divide(10, 0)
rescue ArgumentError => e
  puts e.message  # => "b no puede ser 0"
end
```

**Formas de raise**:

```ruby
raise "Error genérico"
raise RuntimeError, "Error específico"
raise ArgumentError, "Argumento inválido"
raise CustomError.new("Mi error personalizado")
```

---

## 🧩 Crear excepciones personalizadas

```ruby
class InvalidEmailError < StandardError
  def initialize(email)
    super("Email inválido: #{email}")
  end
end

def validate_email(email)
  raise InvalidEmailError.new(email) unless email.include?("@")
end

begin
  validate_email("invalid")
rescue InvalidEmailError => e
  puts e.message  # => "Email inválido: invalid"
end
```

---

## 🔄 retry (reintentar)

```ruby
attempts = 0

begin
  attempts += 1
  puts "Intento #{attempts}"
  raise "Error temporal" if attempts < 3
rescue
  retry if attempts < 3
  puts "Fallo después de 3 intentos"
end
```

**Cuidado**: puede crear bucles infinitos.

---

## 🛡️ rescue inline (una línea)

```ruby
# Forma larga
begin
  result = 10 / 0
rescue
  result = nil
end

# Forma corta
result = 10 / 0 rescue nil
```

**Útil para valores por defecto**:

```ruby
user = User.find(id) rescue User.new
config = load_config rescue {}
```

---

## 🎯 ensure (cleanup)

`ensure` se ejecuta **siempre**, incluso si hay `return`.

```ruby
def read_file
  file = File.open("data.txt")
  return file.read
rescue
  puts "Error leyendo archivo"
  return nil
ensure
  file&.close  # Siempre cierra el archivo
  puts "Archivo cerrado"
end
```

---

## 🔥 Patrón común: validación con excepciones

```ruby
class User
  attr_accessor :name, :email

  def initialize(name, email)
    @name = name
    @email = email
  end

  def save
    validate!
    puts "Usuario guardado: #{name}"
  end

  private

  def validate!
    raise "Name is required" if name.nil? || name.empty?
    raise "Email is required" if email.nil? || email.empty?
    raise "Invalid email" unless email.include?("@")
  end
end

begin
  user = User.new("", "invalid")
  user.save
rescue => e
  puts "Error: #{e.message}"
end
```

---

## 🧪 Jerarquía de excepciones

```
Exception (NO capturar)
├── NoMemoryError
├── ScriptError
│   ├── SyntaxError
│   └── LoadError
├── SignalException
│   └── Interrupt
├── StandardError (capturar este)
│   ├── ArgumentError
│   ├── IOError
│   │   └── EOFError
│   ├── IndexError
│   ├── LocalJumpError
│   ├── NameError
│   │   └── NoMethodError
│   ├── RangeError
│   ├── RuntimeError (raise por defecto)
│   ├── TypeError
│   └── ZeroDivisionError
└── SystemExit
```

**Regla**: SIEMPRE hereda de `StandardError`, NO de `Exception`.

---

## ⚠️ Antipatrón: capturar Exception

```ruby
# ❌ MAL - captura TODO, incluso Ctrl+C
begin
  # código
rescue Exception => e
  # ...
end

# ✅ BIEN - captura solo errores recuperables
begin
  # código
rescue StandardError => e
  # ...
end

# ✅ MEJOR - captura errores específicos
begin
  # código
rescue ActiveRecord::RecordNotFound => e
  # ...
end
```

---

## 🔥 Manejo en Rails

### En controladores

```ruby
class UsersController < ApplicationController
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity

  def show
    @user = User.find(params[:id])
    render json: @user
  end

  private

  def not_found
    render json: { error: "User not found" }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: { errors: exception.record.errors }, status: :unprocessable_entity
  end
end
```

---

### En modelos (validaciones)

```ruby
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true

  def save!
    # Lanza ActiveRecord::RecordInvalid si no es válido
    super
  end
end

begin
  user = User.new
  user.save!  # Lanza error si falta email
rescue ActiveRecord::RecordInvalid => e
  puts e.record.errors.full_messages
end
```

---

### Errores personalizados en Rails

```ruby
# app/errors/application_error.rb
class ApplicationError < StandardError; end

class UnauthorizedError < ApplicationError; end
class ForbiddenError < ApplicationError; end
class NotFoundError < ApplicationError; end

# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from UnauthorizedError, with: :unauthorized
  rescue_from ForbiddenError, with: :forbidden
  rescue_from NotFoundError, with: :not_found

  private

  def unauthorized
    render json: { error: "Unauthorized" }, status: :unauthorized
  end

  def forbidden
    render json: { error: "Forbidden" }, status: :forbidden
  end

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end
end

# En un controller
class PostsController < ApplicationController
  def show
    post = Post.find_by(id: params[:id])
    raise NotFoundError unless post
    render json: post
  end
end
```

---

## 📊 Comparación con otros lenguajes

| Ruby | JavaScript | C# |
|------|------------|-----|
| `begin` | `try` | `try` |
| `rescue` | `catch` | `catch` |
| `ensure` | `finally` | `finally` |
| `raise` | `throw` | `throw` |

---

## 💡 Mejores prácticas

1. **Captura excepciones específicas**, no `Exception` ni `StandardError` genérico

2. **No uses excepciones para control de flujo**
   ```ruby
   # ❌ MAL
   begin
     user = User.find(id)
   rescue
     user = User.new
   end

   # ✅ BIEN
   user = User.find_by(id: id) || User.new
   ```

3. **Usa `ensure` para cleanup** (cerrar archivos, conexiones, etc.)

4. **Crea excepciones personalizadas** para errores de negocio

5. **Documenta qué excepciones lanza un método**

6. **En Rails, usa `rescue_from`** en vez de `begin/rescue` en cada acción

---

## 🎯 Ejemplo completo: Servicio con manejo de errores

```ruby
class OrderService
  class OrderError < StandardError; end
  class InsufficientStockError < OrderError; end
  class PaymentFailedError < OrderError; end

  def create_order(user, items)
    validate_stock!(items)
    order = Order.create!(user: user, items: items)
    process_payment!(order)
    order
  rescue InsufficientStockError => e
    Rails.logger.error("Stock error: #{e.message}")
    raise
  rescue PaymentFailedError => e
    order&.cancel!
    Rails.logger.error("Payment error: #{e.message}")
    raise
  rescue StandardError => e
    Rails.logger.error("Unexpected error: #{e.message}")
    raise OrderError, "Failed to create order"
  end

  private

  def validate_stock!(items)
    items.each do |item|
      raise InsufficientStockError, "Out of stock: #{item.name}" if item.stock < 1
    end
  end

  def process_payment!(order)
    result = PaymentGateway.charge(order)
    raise PaymentFailedError, "Payment declined" unless result.success?
  end
end

# Uso
begin
  order = OrderService.new.create_order(user, items)
  render json: order, status: :created
rescue OrderService::InsufficientStockError => e
  render json: { error: e.message }, status: :unprocessable_entity
rescue OrderService::PaymentFailedError => e
  render json: { error: e.message }, status: :payment_required
rescue OrderService::OrderError => e
  render json: { error: e.message }, status: :internal_server_error
end
```

---

## 📝 Resumen

1. Usa `begin/rescue/ensure` para manejar errores
2. Captura excepciones **específicas**, no genéricas
3. Usa `raise` para lanzar errores
4. Crea excepciones personalizadas heredando de `StandardError`
5. En Rails, usa `rescue_from` en controladores
6. Siempre loguea errores inesperados
7. No uses excepciones para control de flujo normal

---

🎉 **¡Completaste Ruby Fundamentos!**

**Siguiente módulo**: [02-rails-basico](../02-rails-basico/)
