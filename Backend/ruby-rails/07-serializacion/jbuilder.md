# Jbuilder

```ruby
# app/views/users/show.json.jbuilder
json.extract! @user, :id, :name, :email

json.posts @user.posts do |post|
  json.extract! post, :id, :title, :body
end
```

**Uso**: más flexible pero más lento.
