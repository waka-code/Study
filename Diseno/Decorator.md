# Decorator Pattern

## ¿Cuándo usarlo?
Cuando necesitas añadir funcionalidades a objetos de manera dinámica, sin modificar su estructura original.

## Ejemplo en .NET (C#)
```csharp
public interface IComponent {
    void Operation();
}

public class ConcreteComponent : IComponent {
    public void Operation() { /* ... */ }
}

public class Decorator : IComponent {
    private IComponent _component;
    public Decorator(IComponent component) { _component = component; }
    public void Operation() {
        // Funcionalidad adicional
        _component.Operation();
    }
}
```

## Ejemplo en TypeScript
```typescript
interface Component {
  operation(): void;
}

class ConcreteComponent implements Component {
  operation() { /* ... */ }
}

class Decorator implements Component {
  constructor(private component: Component) {}
  operation() {
    // Funcionalidad adicional
    this.component.operation();
  }
}
```
