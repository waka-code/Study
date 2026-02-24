# Active Model Serializers

```ruby
# Gemfile
gem 'active_model_serializers'

# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :created_at
  
  has_many :posts
  
  def created_at
    object.created_at.strftime("%Y-%m-%d")
  end
end

# Controller
def show
  user = User.find(params[:id])
  render json: user  # Usa UserSerializer automáticamente
end
```
