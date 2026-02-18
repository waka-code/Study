# Respuestas Estandarizadas

```ruby
# lib/api_response.rb
module ApiResponse
  def success_response(data, status: :ok)
    render json: {
      success: true,
      data: data
    }, status: status
  end
  
  def error_response(message, status: :unprocessable_entity, errors: [])
    render json: {
      success: false,
      error: message,
      errors: errors
    }, status: status
  end
end

# ApplicationController
include ApiResponse

# Controller
def create
  if @post.save
    success_response(@post, status: :created)
  else
    error_response("Validation failed", errors: @post.errors.full_messages)
  end
end
```
