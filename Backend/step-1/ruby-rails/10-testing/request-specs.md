# Request Specs (API Tests)

```ruby
# spec/requests/users_spec.rb
require 'rails_helper'

RSpec.describe "Users API", type: :request do
  describe "GET /users" do
    it "returns all users" do
      create_list(:user, 3)
      
      get '/users'
      
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).size).to eq(3)
    end
  end
  
  describe "POST /users" do
    context "with valid parameters" do
      it "creates a new user" do
        expect {
          post '/users', params: { user: { name: "John", email: "john@example.com" } }
        }.to change(User, :count).by(1)
        
        expect(response).to have_http_status(:created)
      end
    end
    
    context "with invalid parameters" do
      it "returns errors" do
        post '/users', params: { user: { name: "" } }
        
        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)).to have_key("errors")
      end
    end
  end
end
```
