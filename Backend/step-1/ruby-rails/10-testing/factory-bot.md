# FactoryBot

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { Faker::Name.name }
    email { Faker::Internet.email }
    password { "password123" }
    
    trait :admin do
      role { "admin" }
    end
    
    trait :with_posts do
      after(:create) do |user|
        create_list(:post, 3, user: user)
      end
    end
  end
end

# Uso
user = create(:user)
admin = create(:user, :admin)
user_with_posts = create(:user, :with_posts)
users = create_list(:user, 5)
```
