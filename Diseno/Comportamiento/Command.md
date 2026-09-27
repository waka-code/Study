# Command Pattern

## ¿Cuándo usarlo?
Cuando necesitas encapsular una petición como un objeto, permitiendo parametrizar clientes con diferentes solicitudes, colas o registros de operaciones.

## Ejemplo en .NET (C#)
```csharp
public interface ICommand {
    void Execute();
}

public class ConcreteCommand : ICommand {
    private Receiver _receiver;
    public ConcreteCommand(Receiver receiver) { _receiver = receiver; }
    public void Execute() { _receiver.Action(); }
}

public class Receiver {
    public void Action() { /* ... */ }
}

public class Invoker {
    private ICommand _command;
    public Invoker(ICommand command) { _command = command; }
    public void Run() { _command.Execute(); }
}
```

## Ejemplo en TypeScript
```typescript
interface Command {
  execute(): void;
}

class Receiver {
  action() { /* ... */ }
}

class ConcreteCommand implements Command {
  constructor(private receiver: Receiver) {}
  execute() { this.receiver.action(); }
}

class Invoker {
  constructor(private command: Command) {}
  run() { this.command.execute(); }
}
```
