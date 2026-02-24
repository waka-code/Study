# Transacciones en ActiveRecord

## Transacción Básica

```ruby
# Todo o nada: si algo falla, hace rollback automático
ActiveRecord::Base.transaction do
  user = User.create!(name: "John")
  Profile.create!(user: user, bio: "...")
end

# ⚠️ Bang methods (!) levantan excepciones → activan rollback
# Métodos sin ! devuelven false → NO activan rollback automático
ActiveRecord::Base.transaction do
  user.update(balance: 0)  # ⚠️ Si falla, NO hace rollback
  user.update!(balance: 0) # ✅ Si falla, SÍ hace rollback
end
```

## Rollback Manual

```ruby
ActiveRecord::Base.transaction do
  user.update!(banned: true)
  raise ActiveRecord::Rollback if user.admin? # Rollback silencioso
end
# ActiveRecord::Rollback es capturado por transaction{} — no necesitas rescatarlo
```

---

## Transacciones Anidadas

Por defecto, las anidadas usan **savepoints** (misma transacción de DB):

```ruby
User.transaction do
  user = User.create!(name: "John")

  User.transaction do          # Usa SAVEPOINT internamente
    Order.create!(user: user)
    raise ActiveRecord::Rollback  # Solo deshace el savepoint
  end
  # user sigue existiendo, order no
end
```

### `requires_new: true`: Transacción Real Independiente

```ruby
User.transaction do
  user = User.create!(name: "John")

  begin
    # BEGIN/COMMIT real — independiente del bloque padre
    User.transaction(requires_new: true) do
      AuditLog.create!(action: "user_created", user_id: user.id)
      raise "audit failed"
    end
  rescue => e
    logger.error(e.message)  # El audit falló, pero el user se guarda igual
  end
end
```

**Cuándo:** Audit/logging que no debe bloquear la operación principal.

---

## Locking

### Pessimistic Locking (SELECT FOR UPDATE)

```ruby
User.transaction do
  user = User.lock.find(1)  # SELECT ... FOR UPDATE (bloquea la fila)
  user.update!(balance: user.balance - 100)
end

# Falla inmediatamente si ya está bloqueado (no espera)
User.lock("FOR UPDATE NOWAIT").find(1)
```

### Optimistic Locking (lock_version)

No bloquea la fila; detecta ediciones concurrentes al guardar:

```ruby
# Migración necesaria:
add_column :users, :lock_version, :integer, default: 0, null: false

user_a = User.find(1)  # lock_version = 0
user_b = User.find(1)  # lock_version = 0

user_a.update!(name: "Alice")  # lock_version → 1 ✅
user_b.update!(name: "Bob")    # ⚠️ ActiveRecord::StaleObjectError

begin
  user.update!(name: "New name")
rescue ActiveRecord::StaleObjectError
  user.reload && retry
end
```

| | Pessimistic | Optimistic |
|---|---|---|
| **Bloquea la fila** | Sí (FOR UPDATE) | No |
| **Conflictos esperados** | Frecuentes | Raros |
| **Performance** | Menor (blocking) | Mayor |
| **Caso de uso** | Balance bancario | Edición de formularios |

---

## Callbacks dentro de Transacciones

**Trampa crítica:** `after_save` corre **dentro** de la transacción. Si hay rollback después, el callback ya se ejecutó.

```ruby
class Order < ApplicationRecord
  # ❌ MAL: job encolado antes del commit; si hay rollback, el order no existe
  after_save :enqueue_processing_job

  # ✅ BIEN: solo corre si la transaction hace commit exitoso
  after_commit :enqueue_processing_job, on: [:create, :update]
  after_commit :clear_cache, on: :destroy
  after_rollback :log_failure

  private

  def enqueue_processing_job
    OrderProcessorJob.perform_later(id)
  end
end
```

**Regla:** Cualquier efecto externo (emails, Sidekiq, APIs, caché) → `after_commit`.

---

## Patrón: Transferencia de Fondos

```ruby
def transfer(from_account, to_account, amount)
  Account.transaction do
    from = Account.lock.find(from_account.id)
    to   = Account.lock.find(to_account.id)

    raise "Insufficient funds" if from.balance < amount

    from.update!(balance: from.balance - amount)
    to.update!(balance: to.balance + amount)
    TransferLog.create!(from_account: from, to_account: to, amount: amount)
  end
end
```

---

## Pregunta de Entrevista

**P: ¿Diferencia entre `after_save` y `after_commit`?**

`after_save` corre dentro de la transacción. Si hay rollback, el callback ya se ejecutó (job encolado, email enviado). `after_commit` solo corre cuando los datos están confirmados en DB. Regla: efectos externos siempre en `after_commit`.

**P: ¿Para qué sirve `requires_new: true`?**

Por defecto, anidadas usan savepoints (misma transacción). Con `requires_new: true`, Rails abre una transacción real e independiente (BEGIN/COMMIT). Útil para audit/logging que puede fallar sin afectar la operación principal.
