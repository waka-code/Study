# Mailers

```ruby
# app/mailers/user_mailer.rb
class UserMailer < ApplicationMailer
  default from: 'noreply@example.com'
  
  def welcome_email(user)
    @user = user
    @url = 'http://example.com/login'
    mail(to: @user.email, subject: 'Welcome!')
  end
end

# app/views/user_mailer/welcome_email.html.erb
<h1>Welcome <%= @user.name %>!</h1>
<p>Click <a href="<%= @url %>">here</a> to login.</p>

# Enviar
UserMailer.welcome_email(@user).deliver_now
UserMailer.welcome_email(@user).deliver_later  # Asíncrono

# Configuración (development)
# config/environments/development.rb
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: 'smtp.gmail.com',
  port: 587,
  user_name: ENV['GMAIL_USER'],
  password: ENV['GMAIL_PASSWORD'],
  authentication: 'plain',
  enable_starttls_auto: true
}
```
