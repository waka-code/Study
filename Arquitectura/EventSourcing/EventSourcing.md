# Event Sourcing

Event Sourcing almacena todos los eventos que modifican el estado de una entidad, permitiendo reconstruir el estado y auditar cambios fácilmente.

## Ventajas
- Auditoría completa
- Reconstrucción de estado
- Facilita integración con otros sistemas

## Ejemplo en TypeScript
```typescript
interface Event {
  type: string;
  data: any;
}

class EventStore {
  private events: Event[] = [];
  append(event: Event) {
    this.events.push(event);
  }
  getEvents() {
    return this.events;
  }
}
```

## Ejemplo en C#
```csharp
public class Event {
    public string Type { get; set; }
    public object Data { get; set; }
}

public class EventStore {
    private readonly List<Event> _events = new();
    public void Append(Event e) => _events.Add(e);
    public IEnumerable<Event> GetEvents() => _events;
}
```
