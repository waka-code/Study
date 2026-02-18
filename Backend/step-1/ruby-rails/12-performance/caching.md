# Caching en Rails

```ruby
# Fragment caching
<% cache @post do %>
  <%= render @post %>
<% end %>

# Russian doll caching
<% cache @post do %>
  <%= @post.title %>
  <% cache @post.comments do %>
    <%= render @post.comments %>
  <% end %>
<% end %>

# Low-level caching
Rails.cache.fetch("user:#{user.id}:profile", expires_in: 1.hour) do
  user.profile.expensive_operation
end

# Cache en modelos
class Product < ApplicationRecord
  def cached_reviews
    Rails.cache.fetch([self, "reviews"], expires_in: 1.hour) do
      reviews.to_a
    end
  end
end
```
