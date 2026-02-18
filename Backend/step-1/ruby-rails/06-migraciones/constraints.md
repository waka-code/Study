# Constraints en la DB

```ruby
# NOT NULL
change_column_null :users, :email, false

# CHECK constraint (PostgreSQL)
execute <<-SQL
  ALTER TABLE products
  ADD CONSTRAINT price_positive
  CHECK (price > 0)
SQL

# DEFAULT
change_column_default :users, :active, from: nil, to: true

# Unique
add_index :users, :email, unique: true
```
