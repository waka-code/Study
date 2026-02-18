# SQL Injection

## ❌ Vulnerable
```ruby
User.where("email = '#{params[:email]}'")  # ¡PELIGRO!
```

## ✅ Seguro
```ruby
# Placeholders
User.where("email = ?", params[:email])

# Hash
User.where(email: params[:email])

# Named placeholders
User.where("email = :email", email: params[:email])
```

**Regla**: NUNCA interpolar directamente params en SQL.
