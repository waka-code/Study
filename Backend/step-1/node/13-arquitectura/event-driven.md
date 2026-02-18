# Arquitectura Basada en Eventos

## Conceptos Fundamentales

Desacoplar componentes mediante eventos:

```
Component A (emit)  ──Event──>  Event Bus  ──Event──>  Component B (listen)
                                              ──Event──>  Component C
                                              ──Event──>  Component D
```

### Ventajas

✅ Desacoplamiento: Componentes no se conocen
✅ Escalabilidad: Agregar listeners sin tocar emitter
✅ Asincronía: Procesar en background
✅ Retries: Reintentar si falla
✅ Auditoria: Histórico de eventos

## Implementación Simple (In-Process)

```javascript
const EventEmitter = require('events');

class EventBus extends EventEmitter {
  emit(event, data) {
    console.log(`[Event] ${event}`, data);
    super.emit(event, data);
  }
}

const eventBus = new EventBus();

// Emitir evento
eventBus.emit('user.created', { userId: 1, email: 'john@example.com' });

// Escuchar evento
eventBus.on('user.created', (data) => {
  console.log('Sending welcome email to:', data.email);
});

eventBus.on('user.created', (data) => {
  console.log('Creating default settings for:', data.userId);
});
```

## Use Case: Checkout

```javascript
const eventBus = new EventBus();

// 1. Usuario completa checkout
async function checkout(userId, cartItems) {
  // Crear orden
  const order = await Order.create({
    userId,
    items: cartItems,
    status: 'pending'
  });

  // Emitir evento
  eventBus.emit('order.created', {
    orderId: order.id,
    userId,
    total: order.total
  });

  return order;
}

// 2. Payment service escucha
eventBus.on('order.created', async (data) => {
  const paymentResult = await processPayment(data.userId, data.total);

  if (paymentResult.success) {
    // Emitir nuevo evento
    eventBus.emit('payment.completed', {
      orderId: data.orderId,
      transactionId: paymentResult.id
    });
  } else {
    eventBus.emit('payment.failed', { orderId: data.orderId });
  }
});

// 3. Notification service escucha
eventBus.on('order.created', async (data) => {
  await sendEmail(data.userId, `Order ${data.orderId} created`);
});

eventBus.on('payment.completed', async (data) => {
  await sendEmail(data.userId, 'Payment received!');
});

// 4. Analytics service escucha
eventBus.on('order.created', (data) => {
  analytics.track('order_created', { total: data.total });
});

eventBus.on('payment.completed', (data) => {
  analytics.track('payment_completed');
});
```

## Message Queue: RabbitMQ

Para producción, usar message broker:

```bash
npm install amqplib
```

```javascript
const amqp = require('amqplib');

class RabbitMQEventBus {
  async connect() {
    this.connection = await amqp.connect('amqp://localhost');
    this.channel = await this.connection.createChannel();
  }

  async emit(eventType, data) {
    const exchange = 'events';
    await this.channel.assertExchange(exchange, 'topic');

    this.channel.publish(
      exchange,
      eventType,
      Buffer.from(JSON.stringify(data))
    );

    console.log(`Event emitted: ${eventType}`);
  }

  async subscribe(eventType, handler) {
    const exchange = 'events';
    const queue = `${eventType}-queue`;

    await this.channel.assertExchange(exchange, 'topic');
    await this.channel.assertQueue(queue);
    await this.channel.bindQueue(queue, exchange, eventType);

    this.channel.consume(queue, async (msg) => {
      const data = JSON.parse(msg.content.toString());
      try {
        await handler(data);
        this.channel.ack(msg);
      } catch (err) {
        console.error('Handler error:', err);
        // Nack y reintentar después
        this.channel.nack(msg, false, true);
      }
    });

    console.log(`Subscribed to: ${eventType}`);
  }
}

const eventBus = new RabbitMQEventBus();
await eventBus.connect();

// Emitir evento
await eventBus.emit('order.created', { orderId: 1, total: 100 });

// Escuchar evento
await eventBus.subscribe('order.created', async (data) => {
  console.log('Processing order:', data.orderId);
});
```

## Message Queue: Redis Pub/Sub

Alternativa más simple (pero sin persistencia):

```bash
npm install redis
```

```javascript
const redis = require('redis');

class RedisEventBus {
  constructor() {
    this.publisher = redis.createClient();
    this.subscriber = redis.createClient();
  }

  async emit(eventType, data) {
    await this.publisher.publish(
      eventType,
      JSON.stringify(data)
    );
  }

  async subscribe(eventType, handler) {
    await this.subscriber.subscribe(eventType, async (message) => {
      const data = JSON.parse(message);
      try {
        await handler(data);
      } catch (err) {
        console.error('Handler error:', err);
      }
    });
  }
}

const eventBus = new RedisEventBus();

// Uso igual que RabbitMQ
```

## Message Queue: Kafka

Para alta throughput (millones de eventos):

```bash
npm install kafkajs
```

```javascript
const { Kafka } = require('kafkajs');

class KafkaEventBus {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'app',
      brokers: ['localhost:9092']
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'app-group' });
  }

  async emit(eventType, data) {
    await this.producer.send({
      topic: eventType,
      messages: [{
        value: JSON.stringify(data)
      }]
    });
  }

  async subscribe(eventType, handler) {
    await this.consumer.subscribe({ topic: eventType });
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value);
        await handler(data);
      }
    });
  }
}
```

## Saga Pattern (Transacciones Distribuidas)

Coordinar múltiples servicios sin transacciones ACID:

```javascript
class OrderCheckoutSaga {
  constructor(eventBus, paymentService, inventoryService, notificationService) {
    this.eventBus = eventBus;
    this.paymentService = paymentService;
    this.inventoryService = inventoryService;
    this.notificationService = notificationService;
  }

  async execute(order) {
    try {
      // Paso 1: Reservar inventario
      const reserved = await this.inventoryService.reserve(order.items);
      if (!reserved) throw new Error('Inventory unavailable');

      // Paso 2: Procesar pago
      const payment = await this.paymentService.charge(order.userId, order.total);
      if (!payment.success) throw new Error('Payment failed');

      // Paso 3: Confirmar orden
      order.status = 'confirmed';
      await order.save();

      // Emitir eventos
      this.eventBus.emit('order.confirmed', order);
      this.notificationService.sendConfirmation(order);

    } catch (err) {
      // Rollback en caso de error
      await this.inventoryService.release(order.items);
      await this.paymentService.refund(order.payment);

      order.status = 'failed';
      await order.save();

      this.eventBus.emit('order.failed', order);
    }
  }
}
```

## Dead Letter Queue (DLQ)

Manejar mensajes que fallan persistentemente:

```javascript
class EventBusWithDLQ {
  async subscribe(eventType, handler, maxRetries = 3) {
    await this.channel.consume(queue, async (msg) => {
      const data = JSON.parse(msg.content.toString());

      let retries = 0;
      while (retries < maxRetries) {
        try {
          await handler(data);
          this.channel.ack(msg);
          return;
        } catch (err) {
          retries++;
          if (retries >= maxRetries) {
            // Enviar a DLQ
            await this.channel.sendToQueue('dlq', msg.content);
            this.channel.ack(msg);
            console.error(`Message sent to DLQ: ${eventType}`);
            return;
          }
          // Esperar antes de reintentar
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
        }
      }
    });
  }
}
```

## Event Sourcing

Guardar todos los eventos en lugar del estado final:

```javascript
class EventStore {
  constructor(database) {
    this.db = database;
  }

  async append(aggregateId, eventType, data) {
    await this.db('events').insert({
      aggregateId,
      eventType,
      data: JSON.stringify(data),
      timestamp: new Date(),
      version: await this.getVersion(aggregateId) + 1
    });
  }

  async getVersion(aggregateId) {
    const result = await this.db('events')
      .where('aggregateId', aggregateId)
      .max('version as maxVersion');
    return result[0].maxVersion || 0;
  }

  async getEvents(aggregateId, fromVersion = 0) {
    return this.db('events')
      .where('aggregateId', aggregateId)
      .where('version', '>', fromVersion)
      .orderBy('version');
  }

  async rebuild(aggregateId) {
    const events = await this.getEvents(aggregateId);
    let state = {};

    for (const event of events) {
      state = this.apply(state, event);
    }

    return state;
  }

  apply(state, event) {
    switch (event.eventType) {
      case 'user.created':
        return { ...state, id: event.data.id, name: event.data.name };
      case 'user.updated':
        return { ...state, name: event.data.name };
      case 'user.deleted':
        return null;
      default:
        return state;
    }
  }
}

// Uso
const eventStore = new EventStore(database);

// Guardar eventos
await eventStore.append(userId, 'user.created', { id: userId, name: 'John' });
await eventStore.append(userId, 'user.updated', { name: 'Jane' });

// Reconstruir estado
const userState = await eventStore.rebuild(userId);
console.log(userState); // { id: 1, name: 'Jane' }
```

## Comparación de Message Brokers

| Aspecto | RabbitMQ | Redis | Kafka |
|--------|----------|-------|-------|
| **Persistencia** | ✅ | ❌ | ✅ |
| **Throughput** | 50k/s | 100k/s | 1M+/s |
| **Latencia** | Baja | Muy baja | Media |
| **Complejidad** | Media | Baja | Alta |
| **Ordenamiento** | ❌ | ✅ | ✅ |

## Referencias

- [monolith-vs-microservices.md](./monolith-vs-microservices.md)
- [transactions-pooling.md](../10-databases/transactions-pooling.md)
- [logs-monitoring.md](../12-devops/logs-monitoring.md)

## Pregunta de Entrevista

**¿Cuál es la diferencia entre RabbitMQ y Kafka?**

RabbitMQ: Message broker flexible, baja latencia, para comunicación punto-a-punto. Kafka: Log distribuido, alta throughput, para event streaming. RabbitMQ: mejorado para queues. Kafka: mejorado para retransmisión y análisis.
