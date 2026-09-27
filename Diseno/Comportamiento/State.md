# State Pattern

## ¿Cuándo usarlo?
Cuando un objeto debe cambiar su comportamiento según su estado interno, evitando grandes condicionales.

## Ejemplo en .NET (C#)
```csharp
public interface IState {
    void Handle(Context context);
}

public class ConcreteStateA : IState {
    public void Handle(Context context) { context.State = new ConcreteStateB(); }
}

public class ConcreteStateB : IState {
    public void Handle(Context context) { context.State = new ConcreteStateA(); }
}

public class Context {
    public IState State { get; set; }
    public Context(IState state) { State = state; }
    public void Request() { State.Handle(this); }
}
```

## Ejemplo en TypeScript
```typescript
interface State {
  handle(context: Context): void;
}

class ConcreteStateA implements State {
  handle(context: Context) { context.state = new ConcreteStateB(); }
}

class ConcreteStateB implements State {
  handle(context: Context) { context.state = new ConcreteStateA(); }
}

class Context {
  constructor(public state: State) {}
  request() { this.state.handle(this); }
}
```
