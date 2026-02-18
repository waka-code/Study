# Detectar y Resolver N+1

```ruby
# Detectar N+1 con bullet
# Gemfile
gem 'bullet', group: :development

# config/environments/development.rb
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true
  Bullet.console = true
end

# Resolver N+1
# ❌ Problema
users = User.all
users.each { |u| puts u.posts.count }  # N queries

# ✅ Solución
users = User.includes(:posts)
users.each { |u| puts u.posts.count }  # 2 queries

# Nested includes
Post.includes(user: [:profile, :roles], comments: :user)
```
