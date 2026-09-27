# Chain of Responsibility Pattern

## ¿Cuándo usarlo?
Cuando una petición debe pasar por **una serie de manejadores** y cada uno decide si la procesa, la rechaza o la pasa al siguiente. Es la base de los **middlewares** (Express, NestJS, ASP.NET Core), filtros de validación, autenticación → autorización → rate limiting, etc.

## Explicación simple (analogía del soporte técnico)
Llamas a soporte: primero te atiende un bot; si no resuelve, pasa a un operador; si tampoco, a un técnico especialista. Tú solo haces la llamada; la cadena decide quién te atiende.

## Ejemplo en .NET (C#)
```csharp
public abstract class Handler {
    private Handler _next;

    public Handler SetNext(Handler next) {
        _next = next;
        return next; // permite encadenar: a.SetNext(b).SetNext(c)
    }

    public virtual string Handle(Request request) =>
        _next?.Handle(request) ?? "OK";
}

public record Request(string User, bool IsAdmin);

public class AuthHandler : Handler {
    public override string Handle(Request r) =>
        string.IsNullOrEmpty(r.User) ? "401 No autenticado" : base.Handle(r);
}

public class AdminHandler : Handler {
    public override string Handle(Request r) =>
        !r.IsAdmin ? "403 Prohibido" : base.Handle(r);
}

// Uso
var chain = new AuthHandler();
chain.SetNext(new AdminHandler());
Console.WriteLine(chain.Handle(new Request("ana", false))); // 403 Prohibido
```

## Ejemplo en TypeScript
```typescript
interface Req { user?: string; isAdmin: boolean; }

abstract class Handler {
  private next?: Handler;

  setNext(next: Handler): Handler {
    this.next = next;
    return next;
  }

  handle(req: Req): string {
    return this.next ? this.next.handle(req) : "OK";
  }
}

class AuthHandler extends Handler {
  handle(req: Req) {
    return !req.user ? "401 No autenticado" : super.handle(req);
  }
}

class AdminHandler extends Handler {
  handle(req: Req) {
    return !req.isAdmin ? "403 Prohibido" : super.handle(req);
  }
}

// Uso
const chain = new AuthHandler();
chain.setNext(new AdminHandler());
console.log(chain.handle({ user: "ana", isAdmin: true })); // OK

// Lo mismo en Express: cada middleware decide si llama a next()
// app.use(auth); app.use(admin); app.get("/admin", handler);
```

## Ventajas
- Desacopla al emisor de los receptores.
- Puedes agregar, quitar o reordenar manejadores sin tocar los demás (Open/Closed).

## Desventajas
- No hay garantía de que alguien maneje la petición.
- Depurar cadenas largas puede ser difícil.
