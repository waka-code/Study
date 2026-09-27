# Strategy Pattern

## ¿Cuándo usarlo?
Cuando necesitas definir una familia de algoritmos, encapsular cada uno y hacerlos intercambiables en tiempo de ejecución.

## Ejemplo en .NET (C#)
```csharp
public interface IStrategy {
    int DoOperation(int a, int b);
}

public class AddStrategy : IStrategy {
    public int DoOperation(int a, int b) => a + b;
}

public class SubtractStrategy : IStrategy {
    public int DoOperation(int a, int b) => a - b;
}

public class Context {
    private IStrategy _strategy;
    public Context(IStrategy strategy) { _strategy = strategy; }
    public int Execute(int a, int b) => _strategy.DoOperation(a, b);
}
```

## Ejemplo en TypeScript
```typescript
interface Strategy {
  doOperation(a: number, b: number): number;
}

class AddStrategy implements Strategy {
  doOperation(a: number, b: number) { return a + b; }
}

class SubtractStrategy implements Strategy {
  doOperation(a: number, b: number) { return a - b; }
}

class Context {
  constructor(private strategy: Strategy) {}
  execute(a: number, b: number) {
    return this.strategy.doOperation(a, b);
  }
}
```
