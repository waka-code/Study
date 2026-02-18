# Namespaces para Versiones

```ruby
# config/routes.rb
namespace :api do
  namespace :v1 do
    resources :users
    resources :posts
  end
  
  namespace :v2 do
    resources :users
    resources :posts
  end
end

# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      def index
        render json: User.all
      end
    end
  end
end

# app/controllers/api/v2/users_controller.rb
module Api
  module V2
    class UsersController < ApplicationController
      def index
        render json: UserSerializer.new(User.all).serializable_hash
      end
    end
  end
end
```

**URLs**:
- `/api/v1/users`
- `/api/v2/users`
