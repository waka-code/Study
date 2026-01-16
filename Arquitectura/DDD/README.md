# DDD (Domain-Driven Design)

> Esto es **nivel senior alto**.

## Conceptos clave
- **Bounded Context:** Límite explícito de un modelo de dominio.
- **Entities:** Objetos con identidad propia.
- **Value Objects:** Objetos sin identidad, definidos solo por sus atributos.
- **Aggregates:** Conjunto de entidades y objetos de valor tratados como una unidad.
- **Repositories:** Encapsulan la lógica de acceso a datos para los aggregates.
- **Domain Events:** Eventos que representan algo que ocurrió en el dominio.

## Ejemplo mínimo en TypeScript

### Entity y Value Object
```typescript
// domain/Order.ts
export class Order {
  constructor(public id: string, public items: OrderItem[], public total: Total) {}
}

export class OrderItem {
  constructor(public name: string, public price: number) {}
}

export class Total {
  constructor(public value: number) {}
}
```

### Repository
```typescript
// domain/OrderRepository.ts
import { Order } from './Order';
export interface OrderRepository {
  save(order: Order): void;
  findById(id: string): Order | undefined;
}
```

### Uso
```typescript
// app.ts
import { Order, OrderItem, Total } from './domain/Order';
const order = new Order('1', [new OrderItem('Libro', 20)], new Total(20));
console.log(order);
```

## Principio
👉 El dominio **manda**, no la base de datos.

## Ventajas
- El modelo refleja el negocio real.
- Facilita la comunicación entre expertos de dominio y desarrolladores.
- Permite sistemas complejos y bien estructurados.

---

## Ejemplo Aggregate y Domain Event

### Aggregate
```typescript
// domain/OrderAggregate.ts
import { Order, OrderItem, Total } from './Order';
export class OrderAggregate {
  constructor(public order: Order) {}
  addItem(item: OrderItem) {
    this.order.items.push(item);
    this.order.total.value += item.price;
  }
}
```

### Domain Event
```typescript
// domain/OrderCreatedEvent.ts
import { Order } from './Order';
export class OrderCreatedEvent {
  constructor(public order: Order, public date: Date = new Date()) {}
}
```

### Uso de repositorio y eventos
```typescript
// app.ts
import { Order, OrderItem, Total } from './domain/Order';
import { OrderAggregate } from './domain/OrderAggregate';
import { OrderCreatedEvent } from './domain/OrderCreatedEvent';
const order = new Order('1', [], new Total(0));
const agg = new OrderAggregate(order);
agg.addItem(new OrderItem('Libro', 20));
const event = new OrderCreatedEvent(order);
console.log(order, event);
```
