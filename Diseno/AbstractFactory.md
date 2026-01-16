# Abstract Factory Pattern

## ¿Cuándo usarlo?
Cuando necesitas crear familias de objetos relacionados sin especificar sus clases concretas.

## Ejemplo en .NET (C#)
```csharp
public interface IButton { void Paint(); }
public interface ICheckbox { void Paint(); }

public class WinButton : IButton { public void Paint() { /* ... */ } }
public class MacButton : IButton { public void Paint() { /* ... */ } }

public class WinCheckbox : ICheckbox { public void Paint() { /* ... */ } }
public class MacCheckbox : ICheckbox { public void Paint() { /* ... */ } }

public interface IGUIFactory {
    IButton CreateButton();
    ICheckbox CreateCheckbox();
}

public class WinFactory : IGUIFactory {
    public IButton CreateButton() => new WinButton();
    public ICheckbox CreateCheckbox() => new WinCheckbox();
}

public class MacFactory : IGUIFactory {
    public IButton CreateButton() => new MacButton();
    public ICheckbox CreateCheckbox() => new MacCheckbox();
}
```

## Ejemplo en TypeScript
```typescript
interface Button { paint(): void; }
interface Checkbox { paint(): void; }

class WinButton implements Button { paint() { /* ... */ } }
class MacButton implements Button { paint() { /* ... */ } }

class WinCheckbox implements Checkbox { paint() { /* ... */ } }
class MacCheckbox implements Checkbox { paint() { /* ... */ } }

interface GUIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

class WinFactory implements GUIFactory {
  createButton() { return new WinButton(); }
  createCheckbox() { return new WinCheckbox(); }
}

class MacFactory implements GUIFactory {
  createButton() { return new MacButton(); }
  createCheckbox() { return new MacCheckbox(); }
}
```
