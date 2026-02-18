# Queries Complejas

```ruby
# GROUP BY + HAVING
User.select("users.*, COUNT(posts.id) as posts_count")
    .joins(:posts)
    .group("users.id")
    .having("COUNT(posts.id) > ?", 5)

# Subqueries
active_user_ids = User.where(active: true).select(:id)
Post.where(user_id: active_user_ids)

# UNION
published = Post.where(published: true)
featured = Post.where(featured: true)
Post.from("(#{published.to_sql} UNION #{featured.to_sql}) AS posts")

# Window functions (PostgreSQL)
User.select("users.*, ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at) as row_num")
```
