# CQRS

Command Query Responsibility Segregation (CQRS) separa los modelos de lectura y escritura, permitiendo optimizar y escalar cada uno de forma independiente.

## Ventajas
- Escalabilidad
- Optimización de queries y comandos
- Flexibilidad

# video
# https://www.youtube.com/watch?v=SvjdJoNPcHs 

## Ejemplo en TypeScript
```typescript
// Command
class CreateUserCommand {
  constructor(public name: string) {}
}

// Query
class GetUserQuery {
  constructor(public id: number) {}
}

// Handler
class UserHandler {
  private users: { id: number; name: string }[] = [];
  handleCommand(cmd: CreateUserCommand) {
    this.users.push({ id: this.users.length + 1, name: cmd.name });
  }
  handleQuery(query: GetUserQuery) {
    return this.users.find(u => u.id === query.id);
  }
}
```

## Ejemplo en C#
```csharp
// Command
public class CreateUserCommand {
    public string Name { get; set; }
}

// Query
public class GetUserQuery {
    public int Id { get; set; }
}

// Handler
public class UserHandler {
    private readonly List<(int Id, string Name)> _users = new();
    public void HandleCommand(CreateUserCommand cmd) {
        _users.Add((_users.Count + 1, cmd.Name));
    }
    public (int Id, string Name)? HandleQuery(GetUserQuery query) {
        return _users.FirstOrDefault(u => u.Id == query.Id);
    }
}
```
