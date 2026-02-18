# Serializers Personalizados

```ruby
# app/serializers/user_serializer.rb
class UserSerializer
  def initialize(user)
    @user = user
  end
  
  def as_json
    {
      id: @user.id,
      name: @user.name,
      email: @user.email,
      posts_count: @user.posts.count
    }
  end
end

# Controller
render json: UserSerializer.new(user).as_json
```
