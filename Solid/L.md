# L — Liskov Substitution Principle (LSP)

El Principio de Sustitución de Liskov establece que los objetos de una clase derivada deben poder sustituir a los de su clase base sin alterar el correcto funcionamiento del programa.

---

## Ejemplo en .NET (C#)

Mal ejemplo:

```csharp
public class Bird {
    public virtual void Fly() {
        // Lógica para volar
    }
}

public class Ostrich : Bird {
    public override void Fly() {
        throw new NotSupportedException(); // Las avestruces no vuelan
    }
}
```

**¿Qué está mal?**
- `Ostrich` no puede volar, pero hereda el método `Fly`.

**Aplicando LSP:**

```csharp
public abstract class Bird {
    // Métodos y propiedades comunes
}

public interface IFlyingBird {
    void Fly();
}

public class Sparrow : Bird, IFlyingBird {
    public void Fly() {
        // Lógica para volar
    }
}

public class Ostrich : Bird {
    // No implementa Fly
}
```

Ahora, solo las aves que pueden volar implementan `IFlyingBird`.

---

## Ejemplo en TypeScript

Mal ejemplo:

```typescript
class Bird {
  fly() {
    // Lógica para volar
  }
}

class Penguin extends Bird {
  fly() {
    throw new Error('Los pingüinos no pueden volar');
  }
}
```

**¿Qué está mal?**
- `Penguin` no debería tener el método `fly`.

**Aplicando LSP:**

```typescript
abstract class Bird {
  // Métodos y propiedades comunes
}

interface FlyingBird {
  fly(): void;
}

class Sparrow extends Bird implements FlyingBird {
  fly() {
    // Lógica para volar
  }
}

class Penguin extends Bird {
  // No implementa fly
}
```

Así, solo las aves que pueden volar implementan la interfaz `FlyingBird`.