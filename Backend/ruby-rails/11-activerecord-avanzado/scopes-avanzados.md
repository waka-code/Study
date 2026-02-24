# Scopes Avanzados

```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :recent, -> (days = 7) { where("created_at > ?", days.days.ago) }
  scope :by_author, -> (author_id) { where(user_id: author_id) }
  scope :search, -> (query) { where("title ILIKE ?", "%#{sanitize_sql_like(query)}%") }
  
  # Scope que recibe múltiples parámetros
  scope :filter, -> (status: nil, category_id: nil) {
    scope = all
    scope = scope.where(status: status) if status.present?
    scope = scope.where(category_id: category_id) if category_id.present?
    scope
  }
  
  # Scope con joins
  scope :with_comments, -> { joins(:comments).distinct }
  scope :popular, -> { joins(:likes).group("posts.id").having("COUNT(likes.id) > ?", 10) }
end

# Uso encadenado
Post.published.recent(30).by_author(current_user.id)
```
