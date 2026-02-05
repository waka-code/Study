# Unit of Work

El patrón Unit of Work gestiona un conjunto de operaciones como una única transacción, asegurando la consistencia y el control de cambios en el almacenamiento de datos.

## Ventajas
- Consistencia transaccional
- Control centralizado de cambios
- Facilita el rollback

## Ejemplo en TypeScript
```typescript
class UnitOfWork {
  private operations: (() => void)[] = [];
  addOperation(op: () => void) {
    this.operations.push(op);
  }
  commit() {
    this.operations.forEach(op => op());
    this.operations = [];
  }
  rollback() {
    this.operations = [];
  }
}
```

## Ejemplo en C#
```csharp
public class UnitOfWork {
    private readonly List<Action> _operations = new();
    public void AddOperation(Action op) => _operations.Add(op);
    public void Commit() {
        foreach (var op in _operations) op();
        _operations.Clear();
    }
    public void Rollback() => _operations.Clear();
}
```
