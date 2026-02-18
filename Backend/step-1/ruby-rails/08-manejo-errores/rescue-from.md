# rescue_from Global

```ruby
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :bad_request
  rescue_from StandardError, with: :internal_error
  
  private
  
  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end
  
  def unprocessable_entity(exception)
    render json: { 
      errors: exception.record.errors.full_messages 
    }, status: :unprocessable_entity
  end
  
  def bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
  
  def internal_error(exception)
    Rails.logger.error(exception.full_message)
    render json: { error: "Internal server error" }, status: :internal_server_error
  end
end
```
