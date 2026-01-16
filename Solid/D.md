# D — Dependency Inversion Principle (DIP)

El Principio de Inversión de Dependencias establece que los módulos de alto nivel no deben depender de módulos de bajo nivel, ambos deben depender de abstracciones. Las abstracciones no deben depender de los detalles, los detalles deben depender de las abstracciones.

---

## Ejemplo en .NET (C#)

Mal ejemplo:

```csharp
public class EmailSender {
    public void Send(string message) {
        // Lógica para enviar email
    }
}

public class Notification {
    private EmailSender _emailSender = new EmailSender();
    public void Send(string message) {
        _emailSender.Send(message);
    }
}
```

**¿Qué está mal?**
- `Notification` depende directamente de la implementación concreta `EmailSender`.

**Aplicando DIP:**

```csharp
public interface IMessageSender {
    void Send(string message);
}

public class EmailSender : IMessageSender {
    public void Send(string message) {
        // Lógica para enviar email
    }
}

public class Notification {
    private IMessageSender _sender;
    public Notification(IMessageSender sender) {
        _sender = sender;
    }
    public void Send(string message) {
        _sender.Send(message);
    }
}
```

Ahora, `Notification` depende de una abstracción y no de una implementación concreta.

---

## Ejemplo en TypeScript

Mal ejemplo:

```typescript
class EmailSender {
  send(message: string) {
    // Lógica para enviar email
  }
}

class Notification {
  private emailSender = new EmailSender();
  send(message: string) {
    this.emailSender.send(message);
  }
}
```

**¿Qué está mal?**
- `Notification` depende directamente de `EmailSender`.

**Aplicando DIP:**

```typescript
interface MessageSender {
  send(message: string): void;
}

class EmailSender implements MessageSender {
  send(message: string) {
    // Lógica para enviar email
  }
}

class Notification {
  constructor(private sender: MessageSender) {}
  send(message: string) {
    this.sender.send(message);
  }
}
```

Ahora, `Notification` depende de una abstracción (`MessageSender`).