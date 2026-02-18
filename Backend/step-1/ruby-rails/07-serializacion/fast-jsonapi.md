# Fast JSON API

```ruby
# Gemfile
gem 'jsonapi-serializer'

# app/serializers/user_serializer.rb
class UserSerializer
  include JSONAPI::Serializer
  
  attributes :name, :email
  has_many :posts
end

# Controller
render json: UserSerializer.new(user).serializable_hash
```

**Ventaja**: muy rápido, sigue JSON:API spec.
