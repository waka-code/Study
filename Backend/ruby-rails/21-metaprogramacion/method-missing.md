# method_missing

```ruby
class DynamicFinder
  def method_missing(method_name, *args)
    if method_name.to_s.start_with?('find_by_')
      attribute = method_name.to_s.sub('find_by_', '')
      User.find_by(attribute => args.first)
    else
      super
    end
  end
  
  def respond_to_missing?(method_name, include_private = false)
    method_name.to_s.start_with?('find_by_') || super
  end
end

finder = DynamicFinder.new
finder.find_by_email('test@example.com')
finder.find_by_name('John')
```
