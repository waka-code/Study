# Carga Eficiente (N+1)

## Problema N+1

```ruby
# ❌ N+1 query problem
users = User.limit(10)
users.each do |user|
  puts user.posts.count  # 1 query por cada user = 10 queries
end
```

## Soluciones

### includes (eager loading)

```ruby
# ✅ Solución: 2 queries total
users = User.includes(:posts).limit(10)
users.each do |user|
  puts user.posts.count  # No query adicional
end
```

### preload

```ruby
# Siempre usa queries separadas
User.preload(:posts)
# SELECT * FROM users
# SELECT * FROM posts WHERE user_id IN (1,2,3...)
```

### eager_load

```ruby
# Siempre usa LEFT OUTER JOIN
User.eager_load(:posts)
# SELECT * FROM users LEFT OUTER JOIN posts ...
```

### joins (solo filtra, no carga)

```ruby
# Solo para filtrar (no carga los posts)
User.joins(:posts).where(posts: { published: true })
```

**Regla**: usa `includes` por defecto.
