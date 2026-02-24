# Migraciones de Datos

```ruby
class BackfillUsernames < ActiveRecord::Migration[7.0]
  def up
    User.where(username: nil).find_each do |user|
      user.update_column(:username, "user_#{user.id}")
    end
  end
  
  def down
    # Opcional: revertir cambios
  end
end
```

**Cuidado**: usa `update_column` para evitar validaciones y callbacks.
