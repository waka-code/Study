# Mediator Pattern

## ¿Cuándo usarlo?
Cuando muchos objetos se comunican entre sí de forma caótica (todos conocen a todos) y quieres centralizar esa comunicación en un **mediador**. Los componentes ya no se hablan directamente: le avisan al mediador y él coordina.

Ejemplos reales: formularios con campos interdependientes, salas de chat, **MediatR** en .NET (CQRS), buses de eventos internos.

## Explicación simple (analogía de la torre de control)
Los aviones no se comunican entre ellos para decidir quién aterriza: todos hablan con la **torre de control**. Sin la torre, cada piloto tendría que coordinar con todos los demás (N × N conexiones); con ella, cada uno solo habla con la torre (N conexiones).

## Ejemplo en .NET (C#)
```csharp
public interface IChatMediator {
    void Register(User user);
    void Send(string message, User from);
}

public class ChatRoom : IChatMediator {
    private readonly List<User> _users = new();
    public void Register(User user) => _users.Add(user);
    public void Send(string message, User from) {
        foreach (var u in _users.Where(u => u != from))
            u.Receive(message, from.Name);
    }
}

public class User {
    private readonly IChatMediator _mediator;
    public string Name { get; }
    public User(string name, IChatMediator mediator) {
        Name = name;
        _mediator = mediator;
        mediator.Register(this);
    }
    public void Send(string message) => _mediator.Send(message, this);
    public void Receive(string message, string from) =>
        Console.WriteLine($"[{Name}] {from}: {message}");
}

// Uso
var room = new ChatRoom();
var ana = new User("Ana", room);
var luis = new User("Luis", room);
ana.Send("Hola!"); // [Luis] Ana: Hola!
```

## Ejemplo en TypeScript
```typescript
interface ChatMediator {
  register(user: User): void;
  send(message: string, from: User): void;
}

class ChatRoom implements ChatMediator {
  private users: User[] = [];
  register(user: User) { this.users.push(user); }
  send(message: string, from: User) {
    this.users.filter(u => u !== from).forEach(u => u.receive(message, from.name));
  }
}

class User {
  constructor(public name: string, private mediator: ChatMediator) {
    mediator.register(this);
  }
  send(message: string) { this.mediator.send(message, this); }
  receive(message: string, from: string) { console.log(`[${this.name}] ${from}: ${message}`); }
}

// Uso
const room = new ChatRoom();
const ana = new User("Ana", room);
const luis = new User("Luis", room);
ana.send("Hola!"); // [Luis] Ana: Hola!
```

## Mediator vs Observer
- **Observer:** el sujeto difunde eventos a suscriptores que no conoce; comunicación uno-a-muchos.
- **Mediator:** un objeto central conoce a los participantes y **coordina** la lógica entre ellos.

## Desventajas
- El mediador puede convertirse en un **God Object** que concentra demasiada lógica.
