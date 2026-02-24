# Concerns

```ruby
# app/models/concerns/sluggable.rb
module Sluggable
  extend ActiveSupport::Concern
  
  included do
    before_save :generate_slug
  end
  
  def generate_slug
    self.slug = title.parameterize if title_changed?
  end
end

# app/models/post.rb
class Post < ApplicationRecord
  include Sluggable
end

# app/controllers/concerns/error_handler.rb
module ErrorHandler
  extend ActiveSupport::Concern
  
  included do
    rescue_from ActiveRecord::RecordNotFound, with: :not_found
  end
  
  private
  
  def not_found
    render json: { error: "Not found" }, status: :not_found
  end
end

# ApplicationController
include ErrorHandler
```

**Cuándo usar**:
- Comportamiento compartido entre modelos/controllers
- Evitar herencia profunda
- DRY (Don't Repeat Yourself)
