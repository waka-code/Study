# Setup GraphQL

```ruby
# Gemfile
gem 'graphql'

# Instalación
rails generate graphql:install

# app/graphql/types/user_type.rb
module Types
  class UserType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :email, String, null: false
    field :posts, [Types::PostType], null: false
  end
end

# app/graphql/types/query_type.rb
module Types
  class QueryType < Types::BaseObject
    field :users, [Types::UserType], null: false
    
    def users
      User.all
    end
    
    field :user, Types::UserType, null: false do
      argument :id, ID, required: true
    end
    
    def user(id:)
      User.find(id)
    end
  end
end

# Query GraphQL
query {
  users {
    id
    name
    posts {
      title
    }
  }
}
```
