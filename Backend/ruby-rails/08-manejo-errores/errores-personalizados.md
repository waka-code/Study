# Excepciones Personalizadas

```ruby
# app/errors/application_error.rb
class ApplicationError < StandardError; end
class UnauthorizedError < ApplicationError; end
class ForbiddenError < ApplicationError; end
class NotFoundError < ApplicationError; end
class ValidationError < ApplicationError; end

# ApplicationController
rescue_from UnauthorizedError, with: -> { render json: { error: "Unauthorized" }, status: 401 }
rescue_from ForbiddenError, with: -> { render json: { error: "Forbidden" }, status: 403 }
rescue_from NotFoundError, with: -> { render json: { error: "Not found" }, status: 404 }

# Uso en servicios
class PostService
  def publish(post)
    raise ForbiddenError unless current_user.can_publish?(post)
    post.update(published: true)
  end
end
```
