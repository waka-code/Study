# Bcrypt - Hash de Passwords

```ruby
# Gemfile
gem 'bcrypt'

# app/models/user.rb
class User < ApplicationRecord
  has_secure_password
  
  validates :email, presence: true, uniqueness: true
  validates :password, length: { minimum: 6 }, if: -> { new_record? || password.present? }
end

# Migración
create_table :users do |t|
  t.string :email, null: false
  t.string :password_digest  # Bcrypt almacena el hash aquí
  t.timestamps
end

# Uso
user = User.create(email: "test@example.com", password: "secret123")
user.authenticate("secret123")  # => user
user.authenticate("wrong")       # => false
```
