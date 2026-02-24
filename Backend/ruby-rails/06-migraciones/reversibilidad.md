# Reversibilidad

```ruby
# Reversible automáticamente
def change
  add_column :users, :age, :integer
end

# Reversible manual
def up
  change_column_null :users, :email, false
end

def down
  change_column_null :users, :email, true
end

# Irreversible
class IrreversibleMigration < ActiveRecord::Migration[7.0]
  def change
    execute "UPDATE users SET ..."
    # Rails no puede revertir esto automáticamente
  end
end
```
