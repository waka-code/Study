# Repository

El patrón Repository abstrae el acceso a datos, permitiendo trabajar con colecciones de objetos como si fueran una base de datos en memoria.

## Ventajas
- Facilita el testing
- Permite cambiar la fuente de datos fácilmente
- Centraliza la lógica de acceso a datos

## Ejemplo en TypeScript
```typescript
interface User {
  id: number;
  name: string;
}

interface UserRepository {
  findById(id: number): User | undefined;
  save(user: User): void;
}

class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];
  findById(id: number) {
    return this.users.find(u => u.id === id);
  }
  save(user: User) {
    this.users.push(user);
  }
}
```

## Ejemplo en C#
```csharp
public class User {
    public int Id { get; set; }
    public string Name { get; set; }
}

public interface IUserRepository {
    User FindById(int id);
    void Save(User user);
}

public class InMemoryUserRepository : IUserRepository {
    private readonly List<User> _users = new();
    public User FindById(int id) => _users.FirstOrDefault(u => u.Id == id);
    public void Save(User user) => _users.Add(user);
}
```
