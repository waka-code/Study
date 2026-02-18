# Transacciones

```ruby
# Transacción básica
ActiveRecord::Base.transaction do
  user = User.create!(name: "John")
  profile = Profile.create!(user: user, bio: "...")
end
# Si algo falla, hace rollback automático

# Rollback manual
ActiveRecord::Base.transaction do
  user.update!(banned: true)
  raise ActiveRecord::Rollback if some_condition
end

# Locks
# Pessimistic locking
user = User.lock.find(1)  # SELECT * FROM users WHERE id = 1 FOR UPDATE
user.update(balance: user.balance - 100)

# Optimistic locking (columna lock_version)
user = User.find(1)
user.update(name: "New name")
# Lanza ActiveRecord::StaleObjectError si fue modificado por otro proceso
```
