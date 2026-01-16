# Facade Pattern

## ¿Cuándo usarlo?
Cuando quieres proporcionar una interfaz simple para un subsistema complejo.

## Ejemplo en .NET (C#)
```csharp
public class SubsystemA { public void OperationA() { /* ... */ } }
public class SubsystemB { public void OperationB() { /* ... */ } }

public class Facade {
    private SubsystemA _a = new SubsystemA();
    private SubsystemB _b = new SubsystemB();
    public void Operation() {
        _a.OperationA();
        _b.OperationB();
    }
}
```

## Ejemplo en TypeScript
```typescript
class SubsystemA { operationA() { /* ... */ } }
class SubsystemB { operationB() { /* ... */ } }

class Facade {
  private a = new SubsystemA();
  private b = new SubsystemB();
  operation() {
    this.a.operationA();
    this.b.operationB();
  }
}
```
