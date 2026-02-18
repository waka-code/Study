# 🔄 Callbacks en ActiveRecord

Los callbacks son **hooks** que se ejecutan en momentos específicos del ciclo de vida de un objeto ActiveRecord. Son extremadamente potentes pero deben usarse con cuidado.

---

## 📌 ¿Qué son los callbacks?

Callbacks permiten ejecutar código en estos momentos:
- Antes/después de crear un registro
- Antes/después de guardar
- Antes/después de validar
- Antes/después de actualizar
- Antes/después de destruir

```ruby
class User < ApplicationRecord
  before_save :normalize_email
  after_create :send_welcome_email

  private

  def normalize_email
    self.email = email.downcase.strip
  end

  def send_welcome_email
    UserMailer.welcome_email(self).deliver_later
  end
end
```

---

## 🔥 Callbacks disponibles

### Ciclo de vida completo

```
Crear:
┌─────────────────────┐
│ before_validation   │
│ after_validation    │
│ before_save         │
│ before_create       │
│ [INSERT SQL]        │
│ after_create        │
│ after_save          │
│ after_commit        │
└─────────────────────┘

Actualizar:
┌─────────────────────┐
│ before_validation   │
│ after_validation    │
│ before_save         │
│ before_update       │
│ [UPDATE SQL]        │
│ after_update        │
│ after_save          │
│ after_commit        │
└─────────────────────┘

Destruir:
┌─────────────────────┐
│ before_destroy      │
│ [DELETE SQL]        │
│ after_destroy       │
│ after_commit        │
└─────────────────────┘
```

### Lista completa de callbacks

```ruby
class User < ApplicationRecord
  # Validación
  before_validation :normalize_data
  after_validation :log_validation

  # Guardar (create o update)
  before_save :set_defaults
  after_save :log_save

  # Crear
  before_create :generate_token
  after_create :send_welcome_email

  # Actualizar
  before_update :track_changes
  after_update :notify_changes

  # Destruir
  before_destroy :check_dependencies
  after_destroy :cleanup_resources

  # Commit (después de transaction)
  after_commit :sync_to_elasticsearch, on: [:create, :update]
  after_commit :clear_cache, on: :destroy

  # Rollback
  after_rollback :handle_rollback
end
```

---

## 🎯 Callbacks comunes y casos de uso

### 1️⃣ before_validation

Normalizar o limpiar datos antes de validar.

```ruby
class User < ApplicationRecord
  before_validation :normalize_email, :strip_whitespace

  private

  def normalize_email
    self.email = email.downcase.strip if email.present?
  end

  def strip_whitespace
    self.name = name.strip if name.present?
  end
end
```

### 2️⃣ before_save

Ejecutar lógica antes de guardar (create o update).

```ruby
class Post < ApplicationRecord
  before_save :generate_slug, :sanitize_content

  private

  def generate_slug
    self.slug = title.parameterize if title_changed?
  end

  def sanitize_content
    self.body = ActionController::Base.helpers.sanitize(body)
  end
end
```

### 3️⃣ before_create

Solo ejecutar al crear (no al actualizar).

```ruby
class User < ApplicationRecord
  before_create :generate_api_token, :set_default_role

  private

  def generate_api_token
    self.api_token = SecureRandom.hex(20)
  end

  def set_default_role
    self.role ||= 'user'
  end
end
```

### 4️⃣ after_create

Ejecutar después de crear (enviar emails, notificaciones, etc.).

```ruby
class Order < ApplicationRecord
  after_create :send_confirmation_email, :update_inventory

  private

  def send_confirmation_email
    OrderMailer.confirmation_email(self).deliver_later
  end

  def update_inventory
    line_items.each do |item|
      item.product.decrement!(:stock, item.quantity)
    end
  end
end
```

### 5️⃣ before_update

Solo ejecutar al actualizar (no al crear).

```ruby
class Post < ApplicationRecord
  before_update :update_edited_at, if: :content_changed?

  private

  def update_edited_at
    self.edited_at = Time.current
  end

  def content_changed?
    title_changed? || body_changed?
  end
end
```

### 6️⃣ after_commit

Ejecutar **después** de que la transacción se haya confirmado.

```ruby
class Product < ApplicationRecord
  # ✅ Usa after_commit para operaciones externas
  after_commit :sync_to_elasticsearch, on: [:create, :update]
  after_commit :clear_cache, on: :destroy

  private

  def sync_to_elasticsearch
    ProductIndexer.perform_async(id)
  end

  def clear_cache
    Rails.cache.delete("product_#{id}")
  end
end
```

**Por qué after_commit**:
- `after_save` puede ejecutarse antes de que la transacción se confirme
- Si la transacción falla (rollback), `after_save` ya se ejecutó
- `after_commit` garantiza que los datos están en DB

### 7️⃣ before_destroy

Validar o limpiar antes de destruir.

```ruby
class User < ApplicationRecord
  before_destroy :check_if_can_be_deleted, prepend: true

  private

  def check_if_can_be_deleted
    if orders.any?
      errors.add(:base, "Cannot delete user with orders")
      throw :abort  # Detiene la destrucción
    end
  end
end
```

---

## ⚠️ Cuándo NO usar callbacks

### 1️⃣ Lógica de negocio compleja

```ruby
# ❌ Mal - lógica compleja en callback
class Order < ApplicationRecord
  after_create :process_payment, :send_invoices, :update_crm, :notify_warehouse

  def process_payment
    # 50 líneas de código...
  end
end

# ✅ Bien - usa servicio
class OrderCreator
  def call(params)
    order = Order.create!(params)
    PaymentProcessor.process(order)
    InvoiceService.send(order)
    CrmService.update(order)
    WarehouseNotifier.notify(order)
    order
  end
end
```

### 2️⃣ Efectos secundarios ocultos

```ruby
# ❌ Mal - efectos secundarios inesperados
class User < ApplicationRecord
  after_save :charge_credit_card  # ¡Sorpresa!
end

# Cualquier user.save cobra tarjeta
user.update(name: 'John')  # ¿Por qué me cobró?

# ✅ Bien - explícito
class SubscriptionService
  def charge(user)
    user.update!(last_charged_at: Time.current)
    PaymentGateway.charge(user.credit_card)
  end
end
```

### 3️⃣ Dependencias externas (usa after_commit)

```ruby
# ❌ Mal - API externa en after_save
class User < ApplicationRecord
  after_save :sync_to_crm  # Puede fallar el rollback
end

# ✅ Bien - after_commit
class User < ApplicationRecord
  after_commit :sync_to_crm, on: [:create, :update]
end
```

---

## 🧩 Callbacks condicionales

### Con :if y :unless

```ruby
class Post < ApplicationRecord
  before_save :generate_slug, if: :title_changed?
  after_create :notify_subscribers, unless: :draft?

  # Con Proc/Lambda
  before_update :log_change, if: -> { Rails.env.production? }

  private

  def draft?
    status == 'draft'
  end
end
```

### Con múltiples condiciones

```ruby
class Article < ApplicationRecord
  before_save :publish_to_feed,
    if: [:published?, :content_changed?],
    unless: :scheduled?

  private

  def published?
    status == 'published'
  end

  def content_changed?
    title_changed? || body_changed?
  end

  def scheduled?
    publish_at.present? && publish_at > Time.current
  end
end
```

---

## 🛑 Detener callbacks (throw :abort)

```ruby
class User < ApplicationRecord
  before_destroy :check_if_admin

  private

  def check_if_admin
    if admin?
      errors.add(:base, "Admin users cannot be deleted")
      throw :abort  # Detiene la destrucción
    end
  end
end

user = User.find(1)
user.destroy  # false (si es admin)
user.errors.full_messages  # ["Admin users cannot be deleted"]
```

---

## 🆚 Comparación con Sequelize y Entity Framework

### Sequelize (Node.js)

```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: DataTypes.STRING
  }, {
    hooks: {
      beforeValidate: (user) => {
        user.email = user.email.toLowerCase();
      },
      beforeCreate: (user) => {
        user.apiToken = generateToken();
      },
      afterCreate: async (user) => {
        await sendWelcomeEmail(user);
      },
      beforeDestroy: (user) => {
        if (user.role === 'admin') {
          throw new Error('Cannot delete admin');
        }
      }
    }
  });

  return User;
};
```

### Entity Framework (.NET)

```csharp
// Models/User.cs
public class User
{
    public int Id { get; set; }
    public string Email { get; set; }
}

// DbContext con interceptors
public class AppDbContext : DbContext
{
    public override int SaveChanges()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is User user)
            {
                user.Email = user.Email.ToLower();
            }
        }

        return base.SaveChanges();
    }
}
```

| Aspecto | ActiveRecord | Sequelize | Entity Framework |
|---------|--------------|-----------|------------------|
| **Sintaxis** | `before_save :method` | `hooks: { beforeSave }` | `SaveChanges` override |
| **Condicionales** | `if:`, `unless:` | Manual en hook | Manual |
| **Detener** | `throw :abort` | `throw new Error` | Return false |
| **Transacciones** | `after_commit` | `afterCommit` | `SaveChanges` post |

---

## 🎓 Mejores prácticas

### 1️⃣ Usa callbacks solo para lógica del modelo

```ruby
# ✅ Bien - relacionado con el modelo
before_save :normalize_email
before_validation :strip_whitespace

# ❌ Mal - lógica de negocio
after_create :charge_credit_card
after_create :send_to_crm
```

### 2️⃣ Prefiere after_commit sobre after_save

```ruby
# ✅ Bien - garantiza commit
after_commit :sync_to_search, on: [:create, :update]

# ❌ Mal - puede ejecutarse antes de commit
after_save :sync_to_search
```

### 3️⃣ Usa servicios para lógica compleja

```ruby
# ✅ Bien
class OrderCreator
  def call(params)
    Order.transaction do
      order = Order.create!(params)
      ProcessPayment.call(order)
      SendConfirmation.call(order)
      order
    end
  end
end

# ❌ Mal
class Order < ApplicationRecord
  after_create :process_payment
  after_create :send_confirmation
end
```

### 4️⃣ Documenta callbacks complejos

```ruby
class User < ApplicationRecord
  # Generates API token for new users
  # Token is used for API authentication
  before_create :generate_api_token

  private

  def generate_api_token
    self.api_token = SecureRandom.hex(20)
  end
end
```

### 5️⃣ Usa throw :abort para detener

```ruby
# ✅ Bien
before_destroy :check_dependencies
throw :abort if has_dependencies?

# ❌ Mal
before_destroy :check_dependencies
return false if has_dependencies?  # No funciona en Rails 5+
```

---

## 🧪 Ejercicios prácticos

### Ejercicio 1: Normalizar email

Crea un callback que normalice el email antes de guardar.

<details>
<summary>Ver solución</summary>

```ruby
class User < ApplicationRecord
  before_validation :normalize_email

  private

  def normalize_email
    self.email = email.downcase.strip if email.present?
  end
end
```
</details>

### Ejercicio 2: Generar slug

Crea un callback que genere un slug a partir del título.

<details>
<summary>Ver solución</summary>

```ruby
class Post < ApplicationRecord
  before_save :generate_slug, if: :title_changed?

  private

  def generate_slug
    self.slug = title.parameterize
  end
end
```
</details>

### Ejercicio 3: Validar antes de destruir

Evita que se elimine un usuario con órdenes activas.

<details>
<summary>Ver solución</summary>

```ruby
class User < ApplicationRecord
  has_many :orders

  before_destroy :check_active_orders, prepend: true

  private

  def check_active_orders
    if orders.where(status: 'active').any?
      errors.add(:base, "Cannot delete user with active orders")
      throw :abort
    end
  end
end
```
</details>

---

## 🔗 Recursos adicionales

- [ActiveRecord Callbacks](https://guides.rubyonrails.org/active_record_callbacks.html)
- [Callbacks Best Practices](https://thoughtbot.com/blog/how-to-use-rails-callbacks)
- [When to use callbacks](https://medium.com/@felipebravo/activerecord-callbacks-when-to-use-them-and-when-not-to-4a92b66fa984)

---

## 📝 Resumen

- **Callbacks** ejecutan código en momentos específicos del ciclo de vida
- Callbacks comunes: `before_validation`, `before_save`, `after_create`, `after_commit`
- **after_commit** es más seguro que `after_save` para operaciones externas
- Usa **throw :abort** para detener la operación
- Callbacks condicionales con `:if` y `:unless`
- **NO uses callbacks para lógica de negocio compleja**
- Prefiere **servicios** para orquestar operaciones complejas
- Documenta callbacks complejos

---

**Siguiente**: [Scopes](./scopes.md)
