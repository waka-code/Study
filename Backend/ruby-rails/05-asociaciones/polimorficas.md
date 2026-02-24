# Asociaciones Polimórficas

Un modelo puede pertenecer a **múltiples tipos de modelos**.

```ruby
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true
end

class Post < ApplicationRecord
  has_many :comments, as: :commentable
end

class Photo < ApplicationRecord
  has_many :comments, as: :commentable
end

# Migración
create_table :comments do |t|
  t.text :body
  t.references :commentable, polymorphic: true
  # Crea commentable_id y commentable_type
end

# Uso
post = Post.first
post.comments.create(body: "Great post!")

photo = Photo.first
photo.comments.create(body: "Nice photo!")
```
