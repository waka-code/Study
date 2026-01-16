# Adapter Pattern

## ¿Cuándo usarlo?
Cuando necesitas que dos interfaces incompatibles trabajen juntas, adaptando la interfaz de una clase a lo que espera el cliente.

## Ejemplo en .NET (C#)
```csharp
public interface ITarget {
    void Request();
}

public class Adaptee {
    public void SpecificRequest() { /* ... */ }
}

public class Adapter : ITarget {
    private Adaptee _adaptee;
    public Adapter(Adaptee adaptee) { _adaptee = adaptee; }
    public void Request() { _adaptee.SpecificRequest(); }
}
```

## Ejemplo en TypeScript
```typescript
interface Target {
  request(): void;
}

class Adaptee {
  specificRequest() { /* ... */ }
}

class Adapter implements Target {
  constructor(private adaptee: Adaptee) {}
  request() { this.adaptee.specificRequest(); }
}
```
