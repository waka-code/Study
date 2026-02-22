# Message Queues - Comunicación Asíncrona en Microservicios

> **Concepto clave:**
> Message Queues son sistemas que permiten comunicación asíncrona entre servicios mediante colas de mensajes, desacoplando productores y consumidores.

---

## ¿Por qué Message Queues?

### Problemas que resuelven:

1. **Acoplamiento temporal**: Servicios no necesitan estar disponibles al mismo tiempo
2. **Picos de tráfico**: Queue absorbe carga y procesa a su ritmo
3. **Resiliencia**: Si un servicio falla, mensajes quedan en queue
4. **Escalabilidad**: Múltiples workers pueden consumir de la misma queue
5. **Event-driven architecture**: Reacción a eventos en lugar de polling

### Ventajas ✅

- **Asincronía**: Operaciones lentas no bloquean el flujo principal
- **Desacoplamiento**: Productores y consumidores independientes
- **Reliability**: Mensajes persisten hasta ser procesados
- **Escalabilidad horizontal**: Agregar más workers fácilmente
- **Load leveling**: Suaviza picos de carga

### Trade-offs ❌

- **Complejidad**: Infraestructura adicional
- **Debugging**: Flujo asíncrono más difícil de trazar
- **Eventual consistency**: No garantiza procesamiento inmediato
- **Overhead**: Latencia adicional vs llamadas síncronas

---

## Conceptos Fundamentales

### 1. Producer (Productor)
Servicio que **envía** mensajes a la queue.

### 2. Consumer (Consumidor)
Servicio que **recibe y procesa** mensajes de la queue.

### 3. Queue (Cola)
Buffer FIFO (First In, First Out) que almacena mensajes.

### 4. Message (Mensaje)
Unidad de datos enviada, típicamente JSON.

### 5. Exchange (Intercambiador)
Componente que enruta mensajes a queues según reglas (en RabbitMQ).

### 6. Topic
Categoría o canal temático (en Kafka).

---

## Arquitectura Básica

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  Producer   │ ─── publish ───→ │   Queue     │ ─── consume ───→ │  Consumer   │
│  (API)      │                  │ (RabbitMQ)  │                  │  (Worker)   │
└─────────────┘                  └─────────────┘                  └─────────────┘
                                       ↓
                                  Persistence
                                    (disk)
```

---

## RabbitMQ - Message Broker Tradicional

### ¿Qué es RabbitMQ?

- **Message broker** basado en AMQP (Advanced Message Queuing Protocol)
- Ideal para **task queues** y **pub/sub patterns**
- Garantiza entrega de mensajes (at-least-once, exactly-once)
- Soporta routing complejo con exchanges

### Instalación (Docker)

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

**Management UI:** http://localhost:15672 (user: guest, pass: guest)

---

### Ejemplo: Task Queue en Node.js

#### Setup

```bash
npm install amqplib
```

#### Producer (enviar tareas)

```typescript
import amqp from 'amqplib';

async function sendTask(task: string) {
  // Conectar a RabbitMQ
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // Declarar queue (idempotente - crea si no existe)
  const queue = 'tasks';
  await channel.assertQueue(queue, {
    durable: true, // Persiste mensajes en disco
  });

  // Enviar mensaje
  const message = JSON.stringify({
    type: 'SEND_EMAIL',
    data: { to: 'user@example.com', subject: 'Hello' },
    timestamp: new Date().toISOString(),
  });

  channel.sendToQueue(queue, Buffer.from(message), {
    persistent: true, // Mensaje sobrevive reinicio de RabbitMQ
  });

  console.log(`[x] Sent: ${message}`);

  // Cerrar conexión después de un delay
  setTimeout(() => {
    connection.close();
  }, 500);
}

// Enviar tarea
sendTask('SEND_EMAIL');
```

#### Consumer (procesar tareas)

```typescript
import amqp from 'amqplib';

async function startWorker() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const queue = 'tasks';
  await channel.assertQueue(queue, { durable: true });

  // Procesar solo 1 mensaje a la vez (fair dispatch)
  channel.prefetch(1);

  console.log(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);

  // Consumir mensajes
  channel.consume(
    queue,
    async (msg) => {
      if (msg) {
        const content = msg.content.toString();
        console.log(`[x] Received: ${content}`);

        try {
          const task = JSON.parse(content);

          // Procesar tarea (simular trabajo pesado)
          await processTask(task);

          // Acknowledge: mensaje procesado exitosamente
          channel.ack(msg);
          console.log('[✓] Task completed');
        } catch (error) {
          console.error('[✗] Task failed:', error);
          // Requeue mensaje para reintento
          channel.nack(msg, false, true);
        }
      }
    },
    {
      noAck: false, // Requiere acknowledge manual
    }
  );
}

async function processTask(task: any) {
  // Simular procesamiento (enviar email, generar PDF, etc.)
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(`Processed task: ${task.type}`);
}

startWorker();
```

---

### Pub/Sub Pattern (Broadcast)

```typescript
// Publisher
async function publishEvent(event: string, data: any) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const exchange = 'events';
  await channel.assertExchange(exchange, 'fanout', { durable: false });

  const message = JSON.stringify({ event, data });
  channel.publish(exchange, '', Buffer.from(message));

  console.log(`[x] Published event: ${event}`);
}

// Subscriber 1 (Email Service)
async function subscribeToEvents() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const exchange = 'events';
  await channel.assertExchange(exchange, 'fanout', { durable: false });

  // Queue temporal exclusiva para este consumer
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, exchange, '');

  console.log('[*] Waiting for events...');

  channel.consume(queue, (msg) => {
    if (msg) {
      const { event, data } = JSON.parse(msg.content.toString());
      console.log(`[Email Service] Received event: ${event}`, data);
      // Enviar email de notificación
    }
  });
}
```

---

## Apache Kafka - Event Streaming Platform

### ¿Qué es Kafka?

- **Distributed streaming platform** para manejo de eventos en tiempo real
- Diseñado para **high-throughput** (millones de mensajes/segundo)
- Log append-only distribuido y replicado
- Ideal para **event sourcing** y **data pipelines**

### Diferencias: RabbitMQ vs Kafka

| Aspecto | RabbitMQ | Kafka |
|---------|----------|-------|
| **Tipo** | Message Broker | Event Streaming |
| **Patrón** | Task Queue, Pub/Sub | Event Log |
| **Throughput** | ~20K msg/sec | ~1M+ msg/sec |
| **Retención** | Mensajes eliminados al consumir | Retención configurable (días) |
| **Ordenamiento** | No garantizado | Garantizado por partition |
| **Replay** | No | Sí (consumers pueden releer) |
| **Uso típico** | Background jobs, task queues | Event sourcing, logs, analytics |

---

### Ejemplo: Kafka con Node.js

#### Setup

```bash
npm install kafkajs
```

#### Producer

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

async function publishEvent(topic: string, event: any) {
  await producer.connect();

  await producer.send({
    topic,
    messages: [
      {
        key: event.userId, // Garantiza orden por userId (mismo partition)
        value: JSON.stringify(event),
        headers: {
          'correlation-id': generateId(),
        },
      },
    ],
  });

  console.log(`[x] Event published to topic: ${topic}`);
}

// Publicar evento
publishEvent('user-events', {
  userId: '123',
  event: 'USER_REGISTERED',
  data: { email: 'user@example.com' },
  timestamp: new Date().toISOString(),
});
```

#### Consumer

```typescript
const consumer = kafka.consumer({ groupId: 'email-service' });

async function subscribeToTopic(topic: string) {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value!.toString());
      console.log(`[x] Received event:`, {
        topic,
        partition,
        offset: message.offset,
        event,
      });

      // Procesar evento
      await handleEvent(event);
    },
  });
}

async function handleEvent(event: any) {
  switch (event.event) {
    case 'USER_REGISTERED':
      await sendWelcomeEmail(event.data.email);
      break;
    case 'ORDER_PLACED':
      await sendOrderConfirmation(event.userId);
      break;
  }
}

subscribeToTopic('user-events');
```

---

## Patrones de Uso

### 1. Task Queue (Workers)

**Caso de uso:** Background jobs (enviar emails, generar reportes, procesar imágenes)

```
API ─── enqueue ───→ Queue ───→ Worker 1
                              ├─→ Worker 2
                              └─→ Worker 3
```

**Implementación:** RabbitMQ, BullMQ (Redis-based)

---

### 2. Pub/Sub (Broadcast)

**Caso de uso:** Notificar múltiples servicios de un evento

```
Publisher ───→ Exchange ───→ Queue 1 → Email Service
                        ├──→ Queue 2 → Analytics Service
                        └──→ Queue 3 → Audit Service
```

**Implementación:** RabbitMQ (fanout exchange), Kafka (topics)

---

### 3. Event Sourcing

**Caso de uso:** Almacenar todos los cambios de estado como eventos

```
Command ───→ Event Store (Kafka) ───→ Projections
                    ↓
              Event History
              (immutable log)
```

**Implementación:** Kafka, EventStoreDB

---

### 4. Request Replay

**Caso de uso:** Reintentar requests fallidos

```
API ─── failed request ───→ Dead Letter Queue
                                    ↓
                              Retry Worker
                                    ↓
                              Original Queue
```

---

### 5. Fire and Forget

**Caso de uso:** Operaciones que no requieren respuesta inmediata

```typescript
// API Controller
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);

  // Fire and forget - no esperar respuesta
  await queue.publish('order-created', order);

  // Responder inmediatamente
  res.json({ orderId: order.id, status: 'processing' });
});

// Worker procesará el evento eventualmente
```

---

## BullMQ - Queue basada en Redis (Recomendado para Node.js)

### ¿Por qué BullMQ?

- Basado en Redis (infraestructura más simple que RabbitMQ/Kafka)
- Retry strategies built-in
- Job priorities y delays
- Dashboard UI (Bull Board)
- TypeScript-first

### Instalación

```bash
npm install bullmq ioredis
```

### Ejemplo Completo

```typescript
import { Queue, Worker, Job } from 'bullmq';

// Conexión Redis
const connection = {
  host: 'localhost',
  port: 6379,
};

// Crear Queue
const emailQueue = new Queue('emails', { connection });

// Producer
async function sendEmail(to: string, subject: string) {
  await emailQueue.add(
    'send-email',
    { to, subject, body: 'Hello from BullMQ!' },
    {
      attempts: 3, // Reintentar hasta 3 veces
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s
      },
      removeOnComplete: 100, // Mantener últimos 100 completados
      removeOnFail: 200,
    }
  );
  console.log(`[x] Email job queued for ${to}`);
}

// Consumer (Worker)
const worker = new Worker(
  'emails',
  async (job: Job) => {
    console.log(`[x] Processing job ${job.id}:`, job.data);

    // Simular envío de email
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (Math.random() > 0.7) {
      throw new Error('Email service unavailable'); // Será reintentado
    }

    console.log(`[✓] Email sent to ${job.data.to}`);
  },
  {
    connection,
    concurrency: 5, // Procesar 5 jobs en paralelo
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

// Enviar emails
sendEmail('user1@example.com', 'Welcome!');
sendEmail('user2@example.com', 'Order Confirmation');
```

---

## Best Practices

### 1. Idempotencia

Los consumers deben ser **idempotentes** (procesar mismo mensaje múltiples veces = mismo resultado).

```typescript
async function processOrder(orderId: string) {
  // ✅ Verificar si ya fue procesado
  const existing = await db.orders.findOne({ id: orderId });
  if (existing.status === 'processed') {
    console.log('Order already processed, skipping');
    return;
  }

  // Procesar orden...
  await db.orders.update({ id: orderId }, { status: 'processed' });
}
```

### 2. Dead Letter Queues (DLQ)

Mensajes que fallan repetidamente van a una queue especial para investigación.

```typescript
const queue = new Queue('tasks', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

// Worker
worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts!) {
    // Enviar a Dead Letter Queue
    await dlqQueue.add('failed-job', {
      originalJob: job.data,
      error: err.message,
      attempts: job.attemptsMade,
    });
  }
});
```

### 3. Monitoreo

```typescript
// Métricas
queue.on('waiting', () => console.log('Job waiting'));
queue.on('active', () => console.log('Job active'));
queue.on('completed', () => console.log('Job completed'));
queue.on('failed', () => console.log('Job failed'));

// Dashboard (Bull Board)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
// Acceder a http://localhost:3000/admin/queues
```

### 4. Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close(); // Termina jobs en proceso antes de cerrar
  await queue.close();
  process.exit(0);
});
```

---

## Comparación de Tecnologías

| Tecnología | Uso ideal | Complejidad | Throughput | Persistence |
|------------|-----------|-------------|------------|-------------|
| **BullMQ** | Background jobs en Node.js | Baja | Media | Redis |
| **RabbitMQ** | Task queues, routing complejo | Media | Alta | Disk |
| **Kafka** | Event streaming, analytics | Alta | Muy Alta | Disk (log) |
| **AWS SQS** | Serverless, simple queuing | Baja | Alta | Managed |
| **Redis Streams** | Lightweight event streaming | Baja | Alta | Redis |

---

## Preguntas de Entrevista

### 1. ¿Cuándo usarías RabbitMQ vs Kafka?

**Respuesta:**
- **RabbitMQ**: Task queues, background jobs, routing complejo, garantías de entrega
- **Kafka**: Event sourcing, data pipelines, high-throughput, replay de eventos, analytics

Kafka es mejor para **streaming** y **event logs**. RabbitMQ es mejor para **task distribution** con routing complejo.

### 2. ¿Cómo garantizas que un mensaje se procese exactamente una vez?

**Respuesta:**
Combino:
1. **Idempotencia**: El consumer verifica si el mensaje ya fue procesado (usando ID único)
2. **Transactions**: Database transaction + queue acknowledge atómicos
3. **Deduplication**: Mantener registro de message IDs procesados (con TTL)

```typescript
async function processMessage(messageId: string, data: any) {
  const processed = await redis.get(`processed:${messageId}`);
  if (processed) return; // Ya procesado

  await db.transaction(async (trx) => {
    await trx.insert(data);
    await redis.set(`processed:${messageId}`, '1', 'EX', 86400); // TTL 24h
  });
}
```

### 3. ¿Qué es una Dead Letter Queue y cuándo la usarías?

**Respuesta:**
Una DLQ es una queue que almacena mensajes que fallaron después de múltiples reintentos. La uso para:
- Investigar errores sin perder datos
- Procesar manualmente mensajes problemáticos
- Alertar del problema
- Estadísticas de fallos

---

## Recursos

- **RabbitMQ:** https://www.rabbitmq.com/tutorials
- **Kafka:** https://kafka.apache.org/documentation/
- **BullMQ:** https://docs.bullmq.io/
- **Bull Board:** https://github.com/felixmosh/bull-board

---

**Última actualización:** 2026-02-20
