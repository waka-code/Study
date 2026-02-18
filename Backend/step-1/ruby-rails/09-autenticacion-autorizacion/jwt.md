# JSON Web Tokens (JWT)

```ruby
# Gemfile
gem 'jwt'

# app/services/json_web_token.rb
class JsonWebToken
  SECRET_KEY = Rails.application.secrets.secret_key_base
  
  def self.encode(payload, exp = 24.hours.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, SECRET_KEY)
  end
  
  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY)[0]
    HashWithIndifferentAccess.new(decoded)
  rescue
    nil
  end
end

# app/controllers/authentication_controller.rb
class AuthenticationController < ApplicationController
  def login
    user = User.find_by(email: params[:email])
    if user&.authenticate(params[:password])
      token = JsonWebToken.encode(user_id: user.id)
      render json: { token: token }
    else
      render json: { error: "Invalid credentials" }, status: :unauthorized
    end
  end
end

# ApplicationController
def authorize_request
  header = request.headers['Authorization']
  token = header.split(' ').last if header
  decoded = JsonWebToken.decode(token)
  @current_user = User.find(decoded[:user_id]) if decoded
rescue ActiveRecord::RecordNotFound
  render json: { error: "Unauthorized" }, status: :unauthorized
end

before_action :authorize_request
```
