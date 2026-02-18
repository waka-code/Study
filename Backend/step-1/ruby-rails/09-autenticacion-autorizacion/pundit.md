# Pundit - Autorización

```ruby
# Gemfile
gem 'pundit'

# ApplicationController
include Pundit::Authorization

# app/policies/post_policy.rb
class PostPolicy < ApplicationPolicy
  def update?
    user == record.user || user.admin?
  end
  
  def destroy?
    user == record.user || user.admin?
  end
  
  class Scope < Scope
    def resolve
      if user.admin?
        scope.all
      else
        scope.where(user: user)
      end
    end
  end
end

# Controller
def update
  @post = Post.find(params[:id])
  authorize @post  # Llama a PostPolicy#update?
  
  if @post.update(post_params)
    render json: @post
  else
    render json: { errors: @post.errors }, status: :unprocessable_entity
  end
end
```
