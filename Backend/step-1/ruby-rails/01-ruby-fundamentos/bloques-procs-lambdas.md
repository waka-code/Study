# Bloques, Procs y Lambdas

Los **bloques** son una de las características más poderosas de Ruby. Entenderlos es fundamental.

---

## 📦 ¿Qué es un Bloque?

Un **bloque** es un fragmento de código que puedes pasar a un método.

```ruby
# Bloque de una línea
[1, 2, 3].each { |n| puts n }

# Bloque multilínea
[1, 2, 3].each do |n|
  puts "Número: #{n}"
end
```

**Regla**: usa `{ }` para una línea, `do...end` para múltiples líneas.

---

## 🔧 Bloques con parámetros

```ruby
# Sin parámetros
5.times { puts "Hola" }

# Con un parámetro
[1, 2, 3].each { |n| puts n }

# Con múltiples parámetros
{ name: "Ana", age: 25 }.each { |key, value| puts "#{key}: #{value}" }
```

---

## 🏗️ Creando métodos que aceptan bloques

### Usando `yield`

```ruby
def greet
  puts "Antes del bloque"
  yield
  puts "Después del bloque"
end

greet { puts "Hola desde el bloque" }
# Antes del bloque
# Hola desde el bloque
# Después del bloque
```

**Con parámetros**:

```ruby
def greet_user
  yield("Ana", 25)
end

greet_user { |name, age| puts "Hola #{name}, tienes #{age} años" }
# => "Hola Ana, tienes 25 años"
```

**Verificar si hay bloque**:

```ruby
def maybe_greet
  if block_given?
    yield
  else
    puts "No se pasó bloque"
  end
end

maybe_greet { puts "Hola" }  # => "Hola"
maybe_greet                   # => "No se pasó bloque"
```

---

## 🎯 Ejemplo real: implementar `each`

```ruby
class MyArray
  def initialize(items)
    @items = items
  end

  def my_each
    i = 0
    while i < @items.length
      yield(@items[i])
      i += 1
    end
  end
end

arr = MyArray.new([1, 2, 3])
arr.my_each { |n| puts n * 2 }
# 2
# 4
# 6
```

---

## 📌 Procs (Bloques como objetos)

Un **Proc** es un bloque convertido en objeto. Puedes guardarlo en una variable y reutilizarlo.

```ruby
# Crear un Proc
multiply_by_two = Proc.new { |n| n * 2 }

# Ejecutarlo
multiply_by_two.call(5)   # => 10

# Usarlo con map
[1, 2, 3].map(&multiply_by_two)  # => [2, 4, 6]
```

**Con múltiples parámetros**:

```ruby
greet = Proc.new { |name, age| "Hola #{name}, tienes #{age} años" }
greet.call("Ana", 25)  # => "Hola Ana, tienes 25 años"
```

---

### Pasar un Proc a un método

```ruby
def run_proc(my_proc)
  my_proc.call("Ruby")
end

say_hello = Proc.new { |lang| puts "Hola desde #{lang}" }
run_proc(say_hello)  # => "Hola desde Ruby"
```

---

### & (convertir bloque a Proc)

```ruby
def execute(&block)
  block.call
end

execute { puts "Ejecutando bloque" }
# => "Ejecutando bloque"
```

---

## 🎭 Lambdas (Procs estrictos)

Las **lambdas** son como Procs, pero con **comportamiento más estricto**.

```ruby
# Crear lambda
multiply = lambda { |n| n * 2 }

# Sintaxis moderna (->)
multiply = ->(n) { n * 2 }

# Ejecutar
multiply.call(5)  # => 10
```

**Con múltiples parámetros**:

```ruby
greet = ->(name, age) { "Hola #{name}, #{age} años" }
greet.call("Ana", 25)  # => "Hola Ana, 25 años"
```

---

## 🔥 Diferencias: Proc vs Lambda

### 1. Return behavior

```ruby
# Proc: return sale del método que lo contiene
def proc_test
  my_proc = Proc.new { return "Desde Proc" }
  my_proc.call
  "Después del Proc"  # Nunca se ejecuta
end

proc_test  # => "Desde Proc"

# Lambda: return solo sale de la lambda
def lambda_test
  my_lambda = -> { return "Desde Lambda" }
  my_lambda.call
  "Después de Lambda"  # SÍ se ejecuta
end

lambda_test  # => "Después de Lambda"
```

---

### 2. Argumentos

```ruby
# Proc: flexible con argumentos
my_proc = Proc.new { |a, b| puts "a=#{a}, b=#{b}" }
my_proc.call(1)       # => a=1, b=  (no error)
my_proc.call(1, 2, 3) # => a=1, b=2 (ignora el 3)

# Lambda: estricto con argumentos
my_lambda = ->(a, b) { puts "a=#{a}, b=#{b}" }
my_lambda.call(1)       # => ArgumentError
my_lambda.call(1, 2, 3) # => ArgumentError
```

---

## 📊 Comparación

| Característica | Bloque | Proc | Lambda |
|----------------|--------|------|--------|
| Es un objeto | ❌ | ✅ | ✅ |
| Sintaxis | `{ }` o `do...end` | `Proc.new { }` | `->() { }` |
| Return | - | Sale del método | Sale de la lambda |
| Argumentos | - | Flexible | Estricto |
| Uso típico | Iteradores | Callbacks | Funciones |

---

## 🎯 Cuándo usar cada uno

### Bloques
Cuando pasas código a un método **una sola vez**.

```ruby
[1, 2, 3].each { |n| puts n }
```

### Procs
Cuando necesitas **reutilizar** código o pasarlo como **callback**.

```ruby
logger = Proc.new { |msg| puts "[LOG] #{msg}" }
logger.call("User created")
logger.call("User deleted")
```

### Lambdas
Cuando necesitas **comportamiento estricto** (como funciones).

```ruby
validate_email = ->(email) do
  return false if email.nil?
  email.include?("@")
end

validate_email.call("test@example.com")  # => true
```

---

## 🧪 Ejemplos prácticos

### Callback pattern

```ruby
class User
  attr_accessor :name

  def initialize(name, &callback)
    @name = name
    callback.call(self) if callback
  end
end

User.new("Ana") { |user| puts "Usuario creado: #{user.name}" }
# => "Usuario creado: Ana"
```

---

### Higher-order functions

```ruby
def apply_operation(numbers, operation)
  numbers.map { |n| operation.call(n) }
end

double = ->(n) { n * 2 }
square = ->(n) { n ** 2 }

apply_operation([1, 2, 3], double)  # => [2, 4, 6]
apply_operation([1, 2, 3], square)  # => [1, 4, 9]
```

---

### Closures (capturan variables del contexto)

```ruby
def create_multiplier(factor)
  ->(n) { n * factor }
end

times_two = create_multiplier(2)
times_three = create_multiplier(3)

times_two.call(5)    # => 10
times_three.call(5)  # => 15
```

---

## 💡 El operador & (ampersand)

Convierte:
- **Bloque → Proc** (cuando defines un método)
- **Proc → Bloque** (cuando llamas un método)

```ruby
# Bloque → Proc
def my_method(&block)
  block.call
end

my_method { puts "Hola" }

# Proc → Bloque
numbers = [1, 2, 3]
double = ->(n) { n * 2 }
numbers.map(&double)  # => [2, 4, 6]

# Symbol → Proc (¡magia!)
["ruby", "rails"].map(&:upcase)  # => ["RUBY", "RAILS"]
# Equivale a: map { |s| s.upcase }
```

---

## 🔥 Patrón común en Rails

```ruby
# Callback en modelos
class User < ApplicationRecord
  before_create :generate_token

  private

  def generate_token
    self.token = SecureRandom.hex(10)
  end
end

# Scopes con lambdas
class User < ApplicationRecord
  scope :active, -> { where(active: true) }
  scope :created_after, ->(date) { where("created_at > ?", date) }
end

User.active
User.created_after(1.week.ago)
```

---

## 📝 Resumen

1. **Bloques**: código que pasas a métodos (`{ }` o `do...end`)
2. **yield**: ejecuta el bloque dentro de un método
3. **Procs**: bloques convertidos en objetos (`Proc.new`)
4. **Lambdas**: Procs con comportamiento estricto (`->`)
5. **&**: convierte bloques ↔ Procs

**Siguiente**: [clases-objetos.md](./clases-objetos.md)
