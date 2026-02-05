# Event Sourcing

Event Sourcing es un patrón donde el estado de una aplicación se determina almacenando una secuencia de eventos que representan cada cambio de estado. En vez de guardar solo el estado actual, se guardan todos los eventos que han ocurrido, permitiendo reconstruir el estado en cualquier momento y auditar todos los cambios.

## ¿Event Sourcing es solo para CQRS?
No. Event Sourcing es una técnica de persistencia y modelado de datos que puede usarse con o sin CQRS. Aunque suelen combinarse (porque CQRS se beneficia de la trazabilidad y reconstrucción de estado que ofrece Event Sourcing), puedes aplicar Event Sourcing en cualquier sistema donde necesites auditar, deshacer cambios o reconstruir el estado a partir de eventos, incluso sin separar comandos y queries.

- **Event Sourcing**: Técnica de almacenamiento basada en eventos.
- **CQRS**: Patrón arquitectónico que separa comandos (escritura) y queries (lectura).
- **Juntos**: Muy común, pero Event Sourcing puede usarse en otros contextos (auditoría, sistemas financieros, historiales, etc.).

## Ventajas
- Auditoría completa de cambios
- Posibilidad de reconstruir el estado en cualquier punto
- Facilita la integración con otros sistemas (event-driven)


# video
# https://www.youtube.com/watch?v=ID-_ic1fLkY

## Ejemplo básico en TypeScript
```typescript
// Definición de un evento
interface Event {
  type: string;
  data: any;
}

// Event Store
class EventStore {
  private events: Event[] = [];
  append(event: Event) {
    this.events.push(event);
  }
  getEvents() {
    return this.events;
  }
}

// Uso
const store = new EventStore();
store.append({ type: 'UserCreated', data: { id: 1, name: 'Ana' } });
store.append({ type: 'UserNameChanged', data: { id: 1, name: 'Ana María' } });
console.log(store.getEvents());
```

## Ejemplo básico en C#
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

// Uso
var store = new EventStore();
store.Append(new Event { Type = "UserCreated", Data = new { Id = 1, Name = "Ana" } });
store.Append(new Event { Type = "UserNameChanged", Data = new { Id = 1, Name = "Ana María" } });
foreach (var e in store.GetEvents()) {
    Console.WriteLine($"{e.Type}: {e.Data}");
}
```
