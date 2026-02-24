# Tipos de Datos en Ruby

Ruby tiene tipos dinámicos y todo es un objeto.

---

## 📦 Tipos Básicos

### String (Cadenas)

```ruby
# Comillas simples (literal)
name = 'Ana'

# Comillas dobles (permite interpolación)
greeting = "Hola, #{name}"  # => "Hola, Ana"

# Métodos útiles
"ruby".upcase           # => "RUBY"
"RUBY".downcase         # => "ruby"
"ruby".capitalize       # => "Ruby"
"hello world".split     # => ["hello", "world"]
"   trim   ".strip      # => "trim"
"ruby".include?("by")   # => true
"ruby".length           # => 4
```

**Diferencia clave**: siempre usa **comillas dobles** si necesitas interpolación.

---

### Integer y Float (Números)

```ruby
# Integers
age = 25
negative = -10

# Float
price = 19.99
pi = 3.14159

# Operaciones
10 + 5      # => 15
10 - 3      # => 7
10 * 2      # => 20
10 / 3      # => 3 (división entera)
10.0 / 3    # => 3.333... (división decimal)
10 % 3      # => 1 (módulo)
2 ** 3      # => 8 (exponente)

# Métodos útiles
42.even?    # => true
42.odd?     # => false
3.14.round  # => 3
3.14.ceil   # => 4
3.14.floor  # => 3
```

---

### Symbol (Símbolos)

Los **símbolos** son como strings inmutables optimizados en memoria. Se usan mucho en Rails.

```ruby
:name
:email
:status

# Comparación
:name == :name          # => true
:name.object_id == :name.object_id  # => true (mismo objeto en memoria)

"name".object_id == "name".object_id  # => false (objetos diferentes)

# Uso común
user = { name: "Ana", email: "ana@example.com" }
```

**Regla**: usa **símbolos** para **keys** y **identificadores**, strings para **datos** del usuario.

---

### Array (Arreglos)

```ruby
# Definición
numbers = [1, 2, 3, 4, 5]
mixed = [1, "two", :three, 4.0]

# Acceso
numbers[0]      # => 1
numbers[-1]     # => 5 (último elemento)
numbers[1..3]   # => [2, 3, 4] (rango)

# Métodos útiles
numbers.first   # => 1
numbers.last    # => 5
numbers.length  # => 5
numbers.empty?  # => false

# Agregar elementos
numbers << 6              # => [1, 2, 3, 4, 5, 6]
numbers.push(7)           # => [1, 2, 3, 4, 5, 6, 7]
numbers.unshift(0)        # => [0, 1, 2, 3, 4, 5, 6, 7]

# Eliminar elementos
numbers.pop               # => 7 (elimina y retorna el último)
numbers.shift             # => 0 (elimina y retorna el primero)

# Iteración (ver control-flujo.md)
numbers.each { |n| puts n }
numbers.map { |n| n * 2 }
numbers.select { |n| n > 3 }
```

---

### Hash (Diccionarios)

```ruby
# Definición (sintaxis antigua)
user = { "name" => "Ana", "age" => 25 }

# Definición (sintaxis moderna con símbolos)
user = { name: "Ana", age: 25 }

# Acceso
user[:name]     # => "Ana"
user[:email]    # => nil (no existe)

# Métodos útiles
user.keys       # => [:name, :age]
user.values     # => ["Ana", 25]
user.key?(:name)  # => true
user.empty?     # => false

# Agregar/modificar
user[:email] = "ana@example.com"
user.merge(city: "Madrid")  # no modifica original
user.merge!(city: "Madrid") # modifica original

# Eliminar
user.delete(:age)

# Iteración
user.each do |key, value|
  puts "#{key}: #{value}"
end
```

**En Rails**: los hashes son **fundamentales** para params, opciones, configuración, etc.

---

### Boolean (true / false)

```ruby
is_active = true
is_deleted = false

# Comparaciones
5 > 3       # => true
5 == 5      # => true
5 != 3      # => true

# Operadores lógicos
true && false   # => false (AND)
true || false   # => true (OR)
!true           # => false (NOT)
```

**Valores "falsy"**: solo `false` y `nil` son falsos. TODO lo demás es verdadero (incluso `0` y `""`).

```ruby
if 0
  puts "Esto se ejecuta"  # => Ruby evalúa 0 como true
end

if nil
  puts "Esto NO se ejecuta"
end
```

---

### Nil (Ausencia de valor)

```ruby
nothing = nil

nothing.nil?    # => true
nothing.class   # => NilClass

# Operador safe navigation
user = nil
user&.name      # => nil (no lanza error)

# Operador ||
name = nil
name || "default"  # => "default"
```

---

## 🔄 Conversiones de tipo

```ruby
# A String
42.to_s         # => "42"
[1, 2].to_s     # => "[1, 2]"

# A Integer
"42".to_i       # => 42
"abc".to_i      # => 0 (cuidado)
3.14.to_i       # => 3

# A Float
"3.14".to_f     # => 3.14
42.to_f         # => 42.0

# A Symbol
"name".to_sym   # => :name

# A Array
"a,b,c".split(",")  # => ["a", "b", "c"]
```

---

## 📌 Resumen

| Tipo | Ejemplo | Uso principal |
|------|---------|---------------|
| String | `"Hola"` | Texto del usuario |
| Integer | `42` | Números enteros |
| Float | `3.14` | Números decimales |
| Symbol | `:name` | Keys, identificadores |
| Array | `[1, 2, 3]` | Listas ordenadas |
| Hash | `{ name: "Ana" }` | Diccionarios clave-valor |
| Boolean | `true` / `false` | Condiciones |
| Nil | `nil` | Ausencia de valor |

---

## 🎯 Práctica

```ruby
# Crea un hash con tu información personal
profile = {
  name: "Carlos",
  age: 30,
  skills: ["Ruby", "Rails", "PostgreSQL"],
  is_active: true
}

# Accede al primer skill
profile[:skills].first  # => "Ruby"

# Agrega un nuevo skill
profile[:skills] << "React"

# Verifica si tiene la key :email
profile.key?(:email)  # => false
```

**Siguiente**: [control-flujo.md](./control-flujo.md)
