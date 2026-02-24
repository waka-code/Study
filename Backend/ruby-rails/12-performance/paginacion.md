# Paginación

```ruby
# Kaminari
gem 'kaminari'

# Model
class Post < ApplicationRecord
  paginates_per 25
end

# Controller
@posts = Post.page(params[:page]).per(10)

# API Response
{
  data: @posts,
  meta: {
    current_page: @posts.current_page,
    total_pages: @posts.total_pages,
    total_count: @posts.total_count
  }
}

# Pagy (más rápido)
gem 'pagy'

include Pagy::Backend
@pagy, @posts = pagy(Post.all, items: 20)
```
