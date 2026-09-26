# Abstract Factory Pattern

## ¿Cuándo usarlo?
Cuando necesitas crear familias de objetos relacionados sin especificar sus clases concretas.

## Explicación simple (analogía de IKEA)

Piensa en comprar muebles por **estilo**:

- Eliges el estilo **Moderno** → te llega silla moderna, mesa moderna y sofá moderno.
- Eliges el estilo **Rústico** → te llega silla rústica, mesa rústica y sofá rústico.

Tú solo dices *"quiero el estilo Moderno"* y la fábrica se encarga de que **todo combine**. Nunca terminas con una silla moderna y una mesa rústica por error.

En el código, el "estilo" es el sistema operativo:

| Concepto IKEA | En el código |
|---|---|
| El estilo (Moderno / Rústico) | `WinFactory` / `MacFactory` |
| El catálogo de qué muebles hay | `GUIFactory` (la interfaz) |
| Los muebles (silla, mesa) | `Button`, `Checkbox` |
| La silla moderna vs. la rústica | `WinButton` vs. `MacButton` |

**El truco clave:** tu código solo pide "una fábrica", no le importa cuál. Cambias **una sola línea** (qué fábrica usas) y toda la interfaz cambia de estilo, garantizando que nada se mezcle. Así evitas llenar el código de `if (esWindows)` por todos lados.

```typescript
// Yo solo pido "una fábrica", no me importa cuál sea
function crearUI(factory: GUIFactory) {
  const boton = factory.createButton();   // ¿Win o Mac? No lo sé, ni me importa
  const check = factory.createCheckbox(); // Siempre combinan entre sí
  boton.paint();
  check.paint();
}

crearUI(new WinFactory()); // todo sale estilo Windows
crearUI(new MacFactory()); // todo sale estilo Mac
```

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
