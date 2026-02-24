# Control de Flujo en Ruby

Ruby ofrece estructuras de control muy expresivas y legibles.

---

## 🔀 Condicionales

### if / elsif / else

```ruby
age = 18

if age >= 18
  puts "Eres mayor de edad"
elsif age >= 13
  puts "Eres adolescente"
else
  puts "Eres niño"
end
```

**Forma inline** (muy Ruby):

```ruby
puts "Mayor de edad" if age >= 18
```

---

### unless (if negado)

```ruby
unless age < 18
  puts "Eres mayor de edad"
end

# Forma inline
puts "Mayor de edad" unless age < 18
```

**Consejo**: usa `unless` solo cuando mejore la legibilidad. Si necesitas `else`, usa `if`.

---

### Ternario

```ruby
status = age >= 18 ? "adulto" : "menor"
```

---

### case / when

```ruby
grade = "B"

result = case grade
when "A"
  "Excelente"
when "B"
  "Muy bien"
when "C"
  "Bien"
else
  "Necesitas mejorar"
end

puts result  # => "Muy bien"
```

**Con rangos**:

```ruby
score = 85

case score
when 90..100
  "A"
when 80..89
  "B"
when 70..79
  "C"
else
  "F"
end
```

---

## 🔁 Bucles

### while

```ruby
counter = 0

while counter < 5
  puts counter
  counter += 1
end
```

---

### until (while negado)

```ruby
counter = 0

until counter >= 5
  puts counter
  counter += 1
end
```

---

### for (NO se usa mucho)

```ruby
for i in 1..5
  puts i
end
```

**Mejor**: usa iteradores (`.each`, `.times`, etc.)

---

## 🚀 Iteradores (lo más usado en Ruby)

### .each

```ruby
[1, 2, 3].each do |num|
  puts num
end

# Forma corta
[1, 2, 3].each { |num| puts num }
```

**Con hashes**:

```ruby
user = { name: "Ana", age: 25 }

user.each do |key, value|
  puts "#{key}: #{value}"
end
```

---

### .times

```ruby
5.times do |i|
  puts "Iteración #{i}"
end

# Forma corta
5.times { |i| puts i }
```

---

### .map (transformación)

Crea un **nuevo array** transformando cada elemento.

```ruby
numbers = [1, 2, 3, 4]
doubled = numbers.map { |n| n * 2 }
# => [2, 4, 6, 8]

# Con bloques
names = ["ana", "luis", "carlos"]
capitalized = names.map { |name| name.capitalize }
# => ["Ana", "Luis", "Carlos"]
```

**Atajo**: `.map(&:capitalize)` (ver metaprogramación)

```ruby
names.map(&:capitalize)  # => ["Ana", "Luis", "Carlos"]
```

---

### .select (filtro)

Crea un **nuevo array** con elementos que cumplan una condición.

```ruby
numbers = [1, 2, 3, 4, 5, 6]
evens = numbers.select { |n| n.even? }
# => [2, 4, 6]

# Con objetos
users = [
  { name: "Ana", active: true },
  { name: "Luis", active: false },
  { name: "Carlos", active: true }
]

active_users = users.select { |user| user[:active] }
# => [{ name: "Ana", active: true }, { name: "Carlos", active: true }]
```

---

### .reject (filtro inverso)

```ruby
numbers = [1, 2, 3, 4, 5, 6]
odds = numbers.reject { |n| n.even? }
# => [1, 3, 5]
```

---

### .find (primer elemento)

```ruby
numbers = [1, 2, 3, 4, 5]
first_even = numbers.find { |n| n.even? }
# => 2
```

---

### .reduce (acumulador)

```ruby
numbers = [1, 2, 3, 4, 5]
sum = numbers.reduce(0) { |acc, n| acc + n }
# => 15

# Forma corta
sum = numbers.reduce(:+)  # => 15
```

**Ejemplo con hashes**:

```ruby
cart = [
  { name: "Book", price: 10 },
  { name: "Pen", price: 2 },
  { name: "Notebook", price: 5 }
]

total = cart.reduce(0) { |sum, item| sum + item[:price] }
# => 17
```

---

### .any? y .all?

```ruby
numbers = [1, 2, 3, 4]

numbers.any? { |n| n > 3 }   # => true (al menos uno)
numbers.all? { |n| n > 0 }   # => true (todos)
numbers.all? { |n| n > 2 }   # => false
```

---

### .each_with_index

```ruby
["a", "b", "c"].each_with_index do |item, index|
  puts "#{index}: #{item}"
end
# 0: a
# 1: b
# 2: c
```

---

## 🛑 Control de flujo en bucles

### break (salir del bucle)

```ruby
[1, 2, 3, 4, 5].each do |n|
  break if n > 3
  puts n
end
# 1
# 2
# 3
```

---

### next (saltar a la siguiente iteración)

```ruby
[1, 2, 3, 4, 5].each do |n|
  next if n.even?
  puts n
end
# 1
# 3
# 5
```

---

### return (salir de un método)

```ruby
def find_first_even(numbers)
  numbers.each do |n|
    return n if n.even?
  end
  nil
end

find_first_even([1, 3, 4, 5])  # => 4
```

---

## 🧪 Rangos

```ruby
# Inclusivo
(1..5).to_a     # => [1, 2, 3, 4, 5]

# Exclusivo
(1...5).to_a    # => [1, 2, 3, 4]

# Con strings
("a".."e").to_a # => ["a", "b", "c", "d", "e"]

# Verificar si un valor está en el rango
(1..10).include?(5)   # => true
(1..10).cover?(5)     # => true (más rápido)
```

---

## 📊 Comparación con otros lenguajes

| Ruby | JavaScript | C# |
|------|------------|-----|
| `.each` | `.forEach()` | `.ForEach()` |
| `.map` | `.map()` | `.Select()` |
| `.select` | `.filter()` | `.Where()` |
| `.reduce` | `.reduce()` | `.Aggregate()` |
| `.find` | `.find()` | `.FirstOrDefault()` |

---

## 🎯 Ejemplo completo

```ruby
# Lista de usuarios
users = [
  { name: "Ana", age: 25, active: true },
  { name: "Luis", age: 17, active: false },
  { name: "Carlos", age: 30, active: true },
  { name: "Maria", age: 22, active: true }
]

# Filtrar usuarios activos y mayores de edad
adults = users.select { |u| u[:active] && u[:age] >= 18 }

# Obtener solo los nombres
names = adults.map { |u| u[:name] }

# Resultado
puts names.join(", ")  # => "Ana, Carlos, Maria"
```

---

## 💡 Mejores prácticas

1. **Prefiere iteradores** sobre `for` o `while`
2. **Usa bloques de una línea** `{ }` para operaciones simples
3. **Usa bloques multilínea** `do...end` para lógica compleja
4. **Evita `unless` con `else`** (usa `if` negado)
5. **Usa `.map`, `.select`, `.reduce`** en lugar de bucles manuales

---

## 🔥 Atajos útiles

```ruby
# Map con símbolos
["ruby", "rails"].map(&:upcase)  # => ["RUBY", "RAILS"]

# Select compacto
[1, nil, 2, nil, 3].compact  # => [1, 2, 3]

# Flatten (aplanar arrays)
[[1, 2], [3, 4]].flatten  # => [1, 2, 3, 4]

# Uniq (únicos)
[1, 2, 2, 3, 3].uniq  # => [1, 2, 3]
```

**Siguiente**: [bloques-procs-lambdas.md](./bloques-procs-lambdas.md)
