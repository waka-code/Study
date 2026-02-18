# Rate Limiting

```ruby
# Gemfile
gem 'rack-attack'

# config/initializers/rack_attack.rb
class Rack::Attack
  # Throttle login attempts
  throttle('logins/ip', limit: 5, period: 60.seconds) do |req|
    req.ip if req.path == '/login' && req.post?
  end
  
  # Throttle API requests
  throttle('api/ip', limit: 100, period: 1.hour) do |req|
    req.ip if req.path.start_with?('/api')
  end
  
  # Block bad actors
  blocklist('bad_ips') do |req|
    ['1.2.3.4', '5.6.7.8'].include?(req.ip)
  end
end

# config/application.rb
config.middleware.use Rack::Attack
```
