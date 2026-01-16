# I — Interface Segregation Principle (ISP)

El Principio de Segregación de Interfaces establece que los clientes no deben verse forzados a depender de interfaces que no utilizan. Es mejor tener varias interfaces específicas que una general.

---

## Ejemplo en .NET (C#)

Mal ejemplo:

```csharp
public interface IWorker {
    void Work();
    void Eat();
}

public class Robot : IWorker {
    public void Work() {
        // Lógica de trabajo
    }
    public void Eat() {
        throw new NotImplementedException(); // Los robots no comen
    }
}
```

**¿Qué está mal?**
- `Robot` se ve obligado a implementar un método que no necesita.

**Aplicando ISP:**

```csharp
public interface IWorkable {
    void Work();
}

public interface IFeedable {
    void Eat();
}

public class Human : IWorkable, IFeedable {
    public void Work() { /* ... */ }
    public void Eat() { /* ... */ }
}

public class Robot : IWorkable {
    public void Work() { /* ... */ }
}
```

---

## Ejemplo en TypeScript

Mal ejemplo:

```typescript
interface Worker {
  work(): void;
  eat(): void;
}

class Robot implements Worker {
  work() {
    // Lógica de trabajo
  }
  eat() {
    throw new Error('Los robots no comen');
  }
}
```

**¿Qué está mal?**
- `Robot` implementa un método innecesario.

**Aplicando ISP:**

```typescript
interface Workable {
  work(): void;
}

interface Feedable {
  eat(): void;
}

class Human implements Workable, Feedable {
  work() { /* ... */ }
  eat() { /* ... */ }
}

class Robot implements Workable {
  work() { /* ... */ }
}
```

Así, cada clase implementa solo las interfaces que necesita.