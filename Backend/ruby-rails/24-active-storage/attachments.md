# Attachments

```ruby
# Instalación
rails active_storage:install
rails db:migrate

# Modelo
class User < ApplicationRecord
  has_one_attached :avatar
  has_many_attached :documents
end

# Controller
def create
  user = User.new(user_params)
  user.avatar.attach(params[:avatar])
  user.save
end

# URL
user.avatar.url
user.avatar.variant(resize_to_limit: [100, 100])

# Validaciones (con gema)
gem 'active_storage_validations'

validates :avatar, content_type: ['image/png', 'image/jpg'],
                   size: { less_than: 5.megabytes }
```
