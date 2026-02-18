# Sidekiq

```ruby
# Gemfile
gem 'sidekiq'
gem 'redis'

# app/workers/hard_worker.rb
class HardWorker
  include Sidekiq::Worker
  
  def perform(user_id, count)
    user = User.find(user_id)
    # Tarea pesada
    count.times do
      user.do_something
    end
  end
end

# Encolar
HardWorker.perform_async(user.id, 5)
HardWorker.perform_in(5.minutes, user.id, 5)

# ActiveJob (abstracción)
class EmailJob < ApplicationJob
  queue_as :default
  
  def perform(user)
    UserMailer.welcome_email(user).deliver_now
  end
end

# Encolar
EmailJob.perform_later(user)
EmailJob.set(wait: 1.hour).perform_later(user)

# Iniciar Sidekiq
bundle exec sidekiq

# Monitoring
# http://localhost:3000/sidekiq
```
