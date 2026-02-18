# Controllers Delgados

## ❌ Controller gordo
```ruby
class PostsController < ApplicationController
  def create
    @post = current_user.posts.new(post_params)
    @post.slug = @post.title.parameterize
    @post.published_at = Time.current if params[:publish]
    
    if @post.save
      PostMailer.notify_followers(current_user, @post).deliver_later
      CacheService.clear_user_cache(current_user)
      AnalyticsService.track_post_created(@post)
      render json: @post, status: :created
    else
      render json: { errors: @post.errors }, status: :unprocessable_entity
    end
  end
end
```

## ✅ Controller delgado
```ruby
class PostsController < ApplicationController
  def create
    result = CreatePostService.new(current_user, post_params).call
    
    if result.success?
      render json: result.post, status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end
end

# app/services/create_post_service.rb
class CreatePostService
  # Lógica aquí
end
```
