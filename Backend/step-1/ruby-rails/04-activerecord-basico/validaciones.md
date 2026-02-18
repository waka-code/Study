# ✅ Validaciones en ActiveRecord

Las validaciones aseguran que solo datos **válidos** se guarden en la base de datos. ActiveRecord tiene validaciones integradas muy potentes.

---

## 📌 ¿Por qué validaciones en modelos?

```ruby
# ✅ Validaciones en el modelo (correcto)
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true
end

# ❌ Validaciones en el controlador (incorrecto)
def create
  if params[:email].blank?
    render json: { error: "Email can't be blank" }
  end
end
```

**Razones**:
- **DRY**: no repites validaciones en cada controlador
- **Reutilizable**: cualquier parte del código respeta las reglas
- **Testing**: más fácil de testear
- **Documentación**: el modelo es fuente de verdad

---

## 🔥 Validaciones básicas

### 1️⃣ presence (campo requerido)

```ruby
class User < ApplicationRecord
  validates :name, presence: true
  validates :email, presence: true
end

user = User.create(name: '', email: '')
user.valid?  # false
user.errors.full_messages
# ["Name can't be blank", "Email can't be blank"]
```

### 2️⃣ uniqueness (valor único)

```ruby
class User < ApplicationRecord
  validates :email, uniqueness: true
end

User.create!(email: 'john@example.com')
user = User.create(email: 'john@example.com')
user.errors.full_messages
# ["Email has already been taken"]

# ⚠️ Agrega índice en DB para performance y race conditions
# add_index :users, :email, unique: true
```

#### Uniqueness con scope

```ruby
class Post < ApplicationRecord
  # Título único por usuario
  validates :title, uniqueness: { scope: :user_id }
end

# Usuario 1 puede tener "My Post"
# Usuario 2 también puede tener "My Post"
# Pero Usuario 1 no puede tener dos posts con "My Post"
```

#### Uniqueness case-insensitive

```ruby
class User < ApplicationRecord
  validates :email, uniqueness: { case_sensitive: false }
end

# 'john@EXAMPLE.com' y 'john@example.com' son duplicados
```

### 3️⃣ length (longitud)

```ruby
class User < ApplicationRecord
  validates :name, length: { minimum: 2 }
  validates :bio, length: { maximum: 500 }
  validates :username, length: { in: 3..20 }
  validates :code, length: { is: 6 }
end

user = User.new(name: 'J', username: 'ab', code: '12345')
user.errors.full_messages
# ["Name is too short (minimum is 2 characters)",
#  "Username is too short (minimum is 3 characters)",
#  "Code is the wrong length (should be 6 characters)"]
```

### 4️⃣ format (regex)

```ruby
class User < ApplicationRecord
  # Email simple regex
  validates :email, format: { with: /\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i }

  # URL
  validates :website, format: { with: URI::DEFAULT_PARSER.make_regexp }

  # Solo letras y números
  validates :username, format: { with: /\A[a-zA-Z0-9]+\z/ }
end

user = User.new(email: 'invalid-email', username: 'user@123')
user.errors.full_messages
# ["Email is invalid", "Username is invalid"]
```

### 5️⃣ numericality (números)

```ruby
class Product < ApplicationRecord
  validates :price, numericality: true
  validates :stock, numericality: { only_integer: true }
  validates :rating, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 5 }
  validates :discount, numericality: { greater_than: 0, less_than: 100 }
end

product = Product.new(price: 'abc', stock: 1.5, rating: 10)
product.errors.full_messages
# ["Price is not a number",
#  "Stock must be an integer",
#  "Rating must be less than or equal to 5"]
```

### 6️⃣ inclusion / exclusion

```ruby
class User < ApplicationRecord
  validates :role, inclusion: { in: %w[admin moderator user guest] }
  validates :username, exclusion: { in: %w[admin root superuser] }
end

user = User.new(role: 'hacker', username: 'admin')
user.errors.full_messages
# ["Role is not included in the list",
#  "Username is reserved"]
```

### 7️⃣ confirmation (campo de confirmación)

```ruby
class User < ApplicationRecord
  validates :email, confirmation: true
  validates :email_confirmation, presence: true  # Opcional pero recomendado
end

user = User.new(email: 'john@example.com', email_confirmation: 'wrong@example.com')
user.valid?  # false
user.errors.full_messages
# ["Email confirmation doesn't match Email"]
```

### 8️⃣ acceptance (checkbox de términos)

```ruby
class User < ApplicationRecord
  validates :terms_of_service, acceptance: true
end

user = User.new(terms_of_service: '0')
user.valid?  # false
```

---

## 🎯 Validaciones avanzadas

### 1️⃣ Múltiples validaciones en un campo

```ruby
class User < ApplicationRecord
  validates :email,
    presence: true,
    uniqueness: { case_sensitive: false },
    format: { with: URI::MailTo::EMAIL_REGEXP },
    length: { maximum: 255 }
end
```

### 2️⃣ Validaciones condicionales

```ruby
class Order < ApplicationRecord
  # Solo valida si la orden está siendo enviada
  validates :shipping_address, presence: true, if: :shipping_required?

  # Validar a menos que...
  validates :billing_address, presence: true, unless: :same_as_shipping?

  # Con Proc/Lambda
  validates :discount, presence: true, if: -> { total_price > 100 }

  private

  def shipping_required?
    shipping_method != 'pickup'
  end

  def same_as_shipping?
    use_shipping_address_for_billing
  end
end
```

### 3️⃣ Validaciones con on: (create, update)

```ruby
class User < ApplicationRecord
  # Solo al crear
  validates :password, presence: true, on: :create

  # Solo al actualizar
  validates :current_password, presence: true, on: :update
end
```

### 4️⃣ Validaciones personalizadas (custom)

```ruby
class Invoice < ApplicationRecord
  validate :due_date_cannot_be_in_the_past
  validate :discount_cannot_be_greater_than_total

  private

  def due_date_cannot_be_in_the_past
    if due_date.present? && due_date < Date.today
      errors.add(:due_date, "can't be in the past")
    end
  end

  def discount_cannot_be_greater_than_total
    if discount > total_amount
      errors.add(:discount, "can't be greater than total amount")
    end
  end
end
```

### 5️⃣ Validadores personalizados reutilizables

```ruby
# app/validators/email_validator.rb
class EmailValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    unless value =~ URI::MailTo::EMAIL_REGEXP
      record.errors.add(attribute, options[:message] || "is not a valid email")
    end
  end
end

# Usar en modelos
class User < ApplicationRecord
  validates :email, email: true
  validates :secondary_email, email: { message: "must be a valid email address" }
end
```

### 6️⃣ validates_with (validador complejo)

```ruby
# app/validators/post_validator.rb
class PostValidator < ActiveModel::Validator
  def validate(record)
    if record.title.present? && record.title.length < 10
      record.errors.add(:title, "should be at least 10 characters")
    end

    if record.body.present? && record.body.length < 100
      record.errors.add(:body, "should be at least 100 characters")
    end

    if record.published? && record.tags.empty?
      record.errors.add(:tags, "must have at least one tag when published")
    end
  end
end

class Post < ApplicationRecord
  validates_with PostValidator
end
```

---

## 🧩 Manejo de errores

### Verificar validez

```ruby
user = User.new(name: '', email: 'invalid')

# valid? ejecuta todas las validaciones
user.valid?  # false
user.invalid?  # true
```

### Acceder a errores

```ruby
user.errors
# #<ActiveModel::Errors:0x00... @messages={:name=>["can't be blank"], :email=>["is invalid"]}>

user.errors.full_messages
# ["Name can't be blank", "Email is invalid"]

user.errors[:name]
# ["can't be blank"]

user.errors.details
# {:name=>[{:error=>:blank}], :email=>[{:error=>:invalid}]}
```

### Agregar errores manualmente

```ruby
class User < ApplicationRecord
  validate :custom_validation

  private

  def custom_validation
    if name == 'admin'
      errors.add(:name, 'cannot be admin')
    end

    if email&.include?('test')
      errors.add(:base, 'Test emails are not allowed')
    end
  end
end
```

---

## 🆚 Comparación con Sequelize y Entity Framework

### Sequelize (Node.js)

```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    age: {
      type: DataTypes.INTEGER,
      validate: {
        min: 18,
        max: 120
      }
    }
  });

  // Validación personalizada
  User.prototype.customValidation = function() {
    if (this.name === 'admin') {
      throw new Error('Name cannot be admin');
    }
  };

  return User;
};
```

### Entity Framework (.NET)

```csharp
// Models/User.cs
public class User
{
    public int Id { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; }

    [Range(18, 120)]
    public int Age { get; set; }
}

// Validación personalizada
public class User : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Name == "admin")
        {
            yield return new ValidationResult(
                "Name cannot be admin",
                new[] { nameof(Name) }
            );
        }
    }
}
```

| Validación | ActiveRecord | Sequelize | Entity Framework |
|------------|--------------|-----------|------------------|
| **Presence** | `presence: true` | `allowNull: false` | `[Required]` |
| **Uniqueness** | `uniqueness: true` | `unique: true` | `[Index(IsUnique)]` |
| **Length** | `length: { in: 2..100 }` | `len: [2, 100]` | `[StringLength(100, MinimumLength=2)]` |
| **Format** | `format: { with: /regex/ }` | `validate: { is: /regex/ }` | `[RegularExpression]` |
| **Custom** | `validate :method` | `validate: { custom }` | `IValidatableObject` |

---

## 🎓 Mejores prácticas

### 1️⃣ Valida en modelo, no en controlador

```ruby
# ✅ En modelo
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true
end

# ❌ En controlador
def create
  if params[:email].blank?
    render json: { error: 'Email required' }
  end
end
```

### 2️⃣ Agrega índice para uniqueness

```ruby
# app/models/user.rb
class User < ApplicationRecord
  validates :email, uniqueness: true
end

# db/migrate/xxx_add_index_to_users_email.rb
class AddIndexToUsersEmail < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :email, unique: true
  end
end
```

### 3️⃣ Usa validadores personalizados para lógica compleja

```ruby
# ✅ Validador reutilizable
class EmailValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    # Lógica compleja aquí
  end
end

# ❌ Validación en línea compleja
validates :email, format: { with: /muy-largo-regex/ }
```

### 4️⃣ Normaliza datos antes de validar

```ruby
class User < ApplicationRecord
  before_validation :normalize_email

  validates :email, uniqueness: { case_sensitive: false }

  private

  def normalize_email
    self.email = email.downcase.strip if email.present?
  end
end
```

### 5️⃣ Documenta validaciones personalizadas

```ruby
class Invoice < ApplicationRecord
  # Validates that due date is at least 7 days from today
  validate :due_date_must_be_at_least_one_week_away

  private

  def due_date_must_be_at_least_one_week_away
    if due_date.present? && due_date < 7.days.from_now
      errors.add(:due_date, "must be at least 7 days from today")
    end
  end
end
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Validaciones básicas

Crea un modelo Post con validaciones: title (requerido, 10-100 chars), body (requerido, min 50 chars).

<details>
<summary>Ver solución</summary>

```ruby
class Post < ApplicationRecord
  validates :title, presence: true, length: { in: 10..100 }
  validates :body, presence: true, length: { minimum: 50 }
end
```
</details>

### Ejercicio 2: Validación con formato

Valida que un campo `phone` tenga formato de teléfono (10 dígitos).

<details>
<summary>Ver solución</summary>

```ruby
class User < ApplicationRecord
  validates :phone, format: { with: /\A\d{10}\z/, message: "must be 10 digits" }
end
```
</details>

### Ejercicio 3: Validación personalizada

Crea una validación que asegure que `end_date` sea posterior a `start_date`.

<details>
<summary>Ver solución</summary>

```ruby
class Event < ApplicationRecord
  validate :end_date_after_start_date

  private

  def end_date_after_start_date
    return if end_date.blank? || start_date.blank?

    if end_date < start_date
      errors.add(:end_date, "must be after start date")
    end
  end
end
```
</details>

---

## 🔗 Recursos adicionales

- [ActiveRecord Validations](https://guides.rubyonrails.org/active_record_validations.html)
- [Custom Validators](https://guides.rubyonrails.org/active_record_validations.html#custom-validators)
- [ActiveModel::Validations](https://api.rubyonrails.org/classes/ActiveModel/Validations.html)

---

## 📝 Resumen

- **Validaciones en modelos**, no en controladores
- Validaciones básicas: `presence`, `uniqueness`, `length`, `format`, `numericality`
- Validaciones condicionales: `if`, `unless`, `on: :create`
- **Validaciones personalizadas** con `validate :method`
- **Validadores reutilizables** heredando de `ActiveModel::EachValidator`
- Agrega **índice único** para `uniqueness`
- Usa `valid?` para verificar, `errors` para acceder errores
- **Normaliza datos** antes de validar (before_validation)

---

**Siguiente**: [Callbacks](./callbacks.md)
