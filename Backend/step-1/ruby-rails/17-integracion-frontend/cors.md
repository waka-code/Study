# CORS (Cross-Origin Resource Sharing)

```ruby
# Gemfile
gem 'rack-cors'

# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'localhost:3000', 'example.com'
    
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end

# Permitir todo (solo desarrollo)
allow do
  origins '*'
  resource '*', headers: :any, methods: :any
end
```
