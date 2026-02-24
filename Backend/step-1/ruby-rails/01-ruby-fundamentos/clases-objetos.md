# Clases y Objetos en Ruby

Ruby es un lenguaje **orientado a objetos puro**: todo es un objeto.

---

## 🏗️ Definir una clase

```ruby
class User
  # Constructor
  def initialize(name, email)
    @name = name    # Variable de instancia
    @email = email
  end

  # Método de instancia
  def greet
    "Hola, soy #{@name}"
  end
end

# Crear instancia
user = User.new("Ana", "ana@example.com")
user.greet  # => "Hola, soy Ana"
```

---

## 📦 Variables de instancia

Las variables que empiezan con `@` son **variables de instancia**.

```ruby
class User
  def initialize(name)
    @name = name  # Solo accesible dentro de la clase
  end

  def name
    @name  # Getter manual
  end

  def name=(value)
    @name = value  # Setter manual
  end
end

user = User.new("Ana")
user.name          # => "Ana"
user.name = "Luis"
user.name          # => "Luis"
```

---

## 🔓 attr_accessor, attr_reader, attr_writer

Ruby ofrece atajos para crear getters/setters:

```ruby
class User
  attr_accessor :name, :email  # getter + setter
  attr_reader :id               # solo getter
  attr_writer :password         # solo setter

  def initialize(name, email)
    @name = name
    @email = email
    @id = generate_id
  end

  private

  def generate_id
    rand(1000..9999)
  end
end

user = User.new("Ana", "ana@example.com")
user.name           # => "Ana"
user.name = "Luis"
user.id             # => 1234 (solo lectura)
user.id = 5678      # Error: no setter
```

---

## 🔒 Métodos públicos, privados y protegidos

```ruby
class BankAccount
  attr_reader :balance

  def initialize
    @balance = 0
  end

  # Método público
  def deposit(amount)
    @balance += amount if valid_amount?(amount)
  end

  def withdraw(amount)
    @balance -= amount if can_withdraw?(amount)
  end

  private  # Todo lo que sigue es privado

  def valid_amount?(amount)
    amount > 0
  end

  def can_withdraw?(amount)
    amount > 0 && amount <= @balance
  end
end

account = BankAccount.new
account.deposit(100)
account.withdraw(50)
account.balance  # => 50

account.valid_amount?(10)  # Error: método privado
```

**Regla**:
- `public`: accesible desde cualquier lugar (por defecto)
- `private`: solo desde dentro de la clase
- `protected`: desde la clase y subclases

---

## 🧬 Herencia

```ruby
class Animal
  attr_accessor :name

  def initialize(name)
    @name = name
  end

  def speak
    "Hace un sonido"
  end
end

class Dog < Animal
  def speak
    "#{name} dice: Guau!"
  end
end

class Cat < Animal
  def speak
    "#{name} dice: Miau!"
  end
end

dog = Dog.new("Firulais")
dog.speak  # => "Firulais dice: Guau!"

cat = Cat.new("Michi")
cat.speak  # => "Michi dice: Miau!"
```

---

## 🔄 super (llamar al método padre)

```ruby
class Vehicle
  attr_reader :brand

  def initialize(brand)
    @brand = brand
  end

  def info
    "Vehículo de marca #{brand}"
  end
end

class Car < Vehicle
  attr_reader :model

  def initialize(brand, model)
    super(brand)  # Llama a Vehicle#initialize
    @model = model
  end

  def info
    "#{super} - Modelo: #{model}"
  end
end

car = Car.new("Toyota", "Corolla")
car.info  # => "Vehículo de marca Toyota - Modelo: Corolla"
```

---

## 🏭 Métodos de clase (class methods)

```ruby
class User
  @@count = 0  # Variable de clase

  def initialize(name)
    @name = name
    @@count += 1
  end

  # Método de clase
  def self.count
    @@count
  end

  # Otra forma de definir métodos de clase
  class << self
    def create_admin(name)
      user = new(name)
      user.admin = true
      user
    end
  end
end

user1 = User.new("Ana")
user2 = User.new("Luis")

User.count  # => 2
```

**En Rails**:

```ruby
User.all
User.find(1)
User.where(active: true)
```

Todos son métodos de clase.

---

## 📌 Constantes

```ruby
class MathConstants
  PI = 3.14159
  E = 2.71828
end

MathConstants::PI  # => 3.14159
```

**En Rails**:

```ruby
ApplicationController
User::ROLES = ["admin", "user", "guest"]
```

---

## 🧪 self (contexto)

```ruby
class User
  attr_accessor :name

  def initialize(name)
    @name = name
  end

  def greet
    # self se refiere a la instancia actual
    "Hola, soy #{self.name}"
  end

  def self.create_guest
    # Aquí self se refiere a la clase User
    new("Guest")
  end
end

user = User.new("Ana")
user.greet  # self = user

guest = User.create_guest  # self = User
```

---

## 🔍 Introspección

Ruby permite inspeccionar objetos en tiempo de ejecución:

```ruby
user = User.new("Ana")

user.class                    # => User
user.is_a?(User)              # => true
user.respond_to?(:greet)      # => true
user.methods                  # Array de todos los métodos
user.instance_variables       # [:@name, :@email]

User.ancestors                # Cadena de herencia
User.instance_methods(false)  # Métodos definidos solo en User
```

---

## 🎯 Ejemplo completo: Modelo User

```ruby
class User
  attr_accessor :name, :email
  attr_reader :id, :created_at

  @@users = []

  def initialize(name, email)
    @id = generate_id
    @name = name
    @email = email
    @created_at = Time.now
    @@users << self
  end

  def save
    validate!
    puts "User #{name} saved"
  end

  def self.all
    @@users
  end

  def self.find(id)
    @@users.find { |u| u.id == id }
  end

  def self.count
    @@users.length
  end

  private

  def generate_id
    rand(1000..9999)
  end

  def validate!
    raise "Email is required" if email.nil? || email.empty?
    raise "Invalid email" unless email.include?("@")
  end
end

# Uso
user1 = User.new("Ana", "ana@example.com")
user1.save

user2 = User.new("Luis", "luis@example.com")

User.count  # => 2
User.all    # => [user1, user2]
User.find(user1.id)  # => user1
```

---

## 🔄 to_s y to_h (representaciones)

```ruby
class User
  attr_accessor :name, :email

  def initialize(name, email)
    @name = name
    @email = email
  end

  # Representación en string
  def to_s
    "User: #{name} (#{email})"
  end

  # Convertir a hash
  def to_h
    { name: name, email: email }
  end
end

user = User.new("Ana", "ana@example.com")
puts user  # => "User: Ana (ana@example.com)"
user.to_h  # => { name: "Ana", email: "ana@example.com" }
```

**En Rails**: ActiveRecord define automáticamente `to_s`, `to_json`, etc.

---

## 🧬 Operadores personalizados

```ruby
class Money
  attr_reader :amount

  def initialize(amount)
    @amount = amount
  end

  def +(other)
    Money.new(amount + other.amount)
  end

  def -(other)
    Money.new(amount - other.amount)
  end

  def to_s
    "$#{amount}"
  end
end

price1 = Money.new(100)
price2 = Money.new(50)

total = price1 + price2
puts total  # => "$150"
```

---

## 📊 Comparación con otros lenguajes

| Ruby | JavaScript | C# |
|------|------------|-----|
| `class User` | `class User` | `class User` |
| `def initialize` | `constructor()` | `public User()` |
| `@name` | `this.name` | `this.name` |
| `attr_accessor` | getters/setters | `{ get; set; }` |
| `self` | `this` | `this` |

---

## 💡 Mejores prácticas

1. **Usa `attr_accessor`** en lugar de getters/setters manuales
2. **Marca métodos como `private`** si no deben ser llamados externamente
3. **Usa `initialize`** para configuración inicial
4. **No abuses de variables de clase** (`@@var`) - pueden causar problemas
5. **Prefiere composición sobre herencia** (usa módulos, ver siguiente sección)

---

## 🔥 Patrones comunes en Rails

```ruby
class User < ApplicationRecord
  # Validaciones
  validates :email, presence: true, uniqueness: true

  # Asociaciones
  has_many :posts

  # Scopes
  scope :active, -> { where(active: true) }

  # Callbacks
  before_save :downcase_email

  # Métodos de instancia
  def full_name
    "#{first_name} #{last_name}"
  end

  # Métodos de clasehttp://localhost:3000/setting/user
  def self.admins
    where(role: "admin")
  end

  private

  def downcase_email
    self.email = email.downcase
  end
end
```

**Siguiente**: [modulos.md](./modulos.md)
