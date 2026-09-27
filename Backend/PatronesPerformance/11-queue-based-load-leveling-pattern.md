# Queue-Based Load Leveling Pattern

Utiliza colas para distribuir la carga de trabajo y suavizar picos de tráfico. Permite procesar tareas de forma controlada y evitar saturación.

**Ventajas:**
- Mejora la estabilidad y escalabilidad.
- Permite recuperación ante fallos.
- Desacopla productor y consumidor: cada uno escala por separado.
- La API responde rápido aunque el trabajo sea lento.

**Trade-off:**
- Puede aumentar la latencia.
- Requiere infraestructura adicional (colas, workers).
- Consistencia eventual: el resultado no está listo al responder.
- Hay que manejar reintentos, duplicados y mensajes fallidos.

---

## 📈 La idea: la cola absorbe el pico

```
Sin cola:                              Con cola:

Tráfico   ▁▁▇█▇▁▁                      Tráfico   ▁▁▇█▇▁▁
             │                                      │
Servicio  ▁▁███▁▁  ← se satura,        Cola      ▁▁▃▆▅▃▁  ← crece y se vacía
          errores/timeouts                          │
                                       Workers   ▃▃▃▃▃▃▃  ← ritmo constante
```

Los workers procesan a su capacidad sostenible; la cola guarda el exceso temporal. La DB o el servicio downstream nunca ve más carga de la que aguanta.

---

## ⚙️ Flujo típico

```
1. Cliente → POST /reports
2. API valida, encola { reportId, params }, responde 202 Accepted + reportId
3. Worker toma el mensaje, genera el reporte, guarda resultado
4. Cliente consulta GET /reports/:id (polling), o recibe webhook / WebSocket / email
```

```javascript
// API: encolar y responder rápido
app.post('/reports', async (req, res) => {
  const reportId = randomUUID();
  await db.report.create({ data: { id: reportId, status: 'pending' } });
  await reportQueue.add('generate', { reportId, params: req.body }, { jobId: reportId });
  res.status(202).json({ reportId, status: 'pending' });
});

app.get('/reports/:id', async (req, res) => {
  res.json(await db.report.findUnique({ where: { id: req.params.id } }));
});
```

---

## 🛠️ Implementación con BullMQ (Redis)

```javascript
const { Queue, Worker } = require('bullmq');
const connection = { host: 'localhost', port: 6379 };

const reportQueue = new Queue('reports', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s...
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

const worker = new Worker(
  'reports',
  async (job) => {
    const { reportId, params } = job.data;
    const file = await generateReport(params);
    await db.report.update({ where: { id: reportId }, data: { status: 'done', url: file } });
  },
  {
    connection,
    concurrency: 5,                         // jobs en paralelo por worker
    limiter: { max: 50, duration: 1000 },   // máx 50 jobs/s (protege al downstream)
  },
);

worker.on('failed', (job, err) => logger.error({ jobId: job.id, err }, 'job failed'));
```

### AWS SQS

```javascript
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const sqs = new SQSClient({});

while (running) {
  const { Messages = [] } = await sqs.send(new ReceiveMessageCommand({
    QueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20, // long polling
  }));
  for (const msg of Messages) {
    await handle(JSON.parse(msg.Body));
    await sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: msg.ReceiptHandle }));
  }
}
```

Si el worker muere antes del `Delete`, el mensaje reaparece tras el **visibility timeout** → entrega **at-least-once**.

---

## 🔁 Semántica de entrega

| Garantía | Qué significa | Consecuencia |
|---|---|---|
| **At-most-once** | Se entrega 0 o 1 vez | Se pueden perder mensajes |
| **At-least-once** | Se entrega 1 o más veces | **Duplicados** → el consumidor debe ser idempotente |
| **Exactly-once** | Exactamente 1 vez | En la práctica: at-least-once + idempotencia |

### Consumidor idempotente

```javascript
async function handlePayment(msg) {
  // Clave única: si ya se procesó, no se repite
  const inserted = await db.$executeRaw`
    INSERT INTO processed_messages (id) VALUES (${msg.id})
    ON CONFLICT (id) DO NOTHING`;
  if (inserted === 0) return; // duplicado

  await chargeCustomer(msg);
}
```

(Idealmente el `INSERT` y el efecto van en la misma transacción.)

---

## ☠️ Dead Letter Queue (DLQ)

Un mensaje que falla siempre ("poison message") no debe bloquear la cola ni reintentarse infinitamente.

```
Cola principal → falla 5 veces → DLQ → alerta + inspección manual + re-drive
```

- SQS: `RedrivePolicy` con `maxReceiveCount`.
- BullMQ: jobs en estado `failed` tras `attempts`.
- RabbitMQ: `x-dead-letter-exchange`.

---

## 📊 Backpressure y autoscaling

La métrica clave es la **profundidad de la cola** y la **edad del mensaje más viejo**.

```
Si queue_depth sube sostenidamente → los consumidores no dan abasto
  → escalar workers (KEDA en Kubernetes, SQS-based autoscaling en ECS)
  → o aplicar backpressure: rechazar/limitar en la API (429) antes de que la cola explote
```

| Métrica | Por qué |
|---|---|
| Profundidad de la cola | Carga pendiente |
| Edad del mensaje más viejo | Latencia real de procesamiento |
| Tasa de entrada vs salida | Si entrada > salida, la cola crece sin fin |
| Mensajes en DLQ | Errores persistentes |
| Tiempo de procesamiento por job | Capacidad de cada worker |

---

## 🧰 Herramientas

| Herramienta | Tipo | Cuándo |
|---|---|---|
| **BullMQ / Sidekiq** | Cola de jobs sobre Redis | Background jobs en una app |
| **AWS SQS** | Cola gestionada | Serverless/AWS, sin operar infra |
| **RabbitMQ** | Message broker | Routing complejo, prioridades, RPC |
| **Kafka** | Log distribuido | Streaming, alto throughput, replay, múltiples consumidores |
| **Postgres (`SKIP LOCKED`)** | Cola en la DB | Volumen bajo, evitar infra extra |

```sql
-- Cola simple en PostgreSQL
SELECT * FROM jobs
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;
```

---

## 🎯 Mejores Prácticas

✅ Responder `202 Accepted` con un id para consultar el estado
✅ Consumidores **idempotentes** (asumir at-least-once)
✅ Reintentos con **backoff exponencial** y límite
✅ **DLQ** con alertas
✅ Limitar concurrencia de workers para proteger el downstream
✅ Mensajes pequeños: ids y referencias, no payloads enormes
✅ Autoscaling por profundidad/edad de la cola
✅ Graceful shutdown: terminar el job en curso antes de salir
✅ Outbox pattern si el encolado debe ser atómico con una escritura en DB

---

## 🔗 Relación con Otros Patrones

- **Asynchronous Processing**: la cola es el mecanismo típico
- **Batch Processing**: workers que consumen en lotes
- **Throttling / Rate Limiting**: controlan la tasa de consumo y de entrada
- **Horizontal Scaling**: escalar workers de forma independiente
- **Circuit Breaker**: pausar consumo si el downstream está caído
- **Latency & Throughput**: sube throughput y estabilidad, a cambio de latencia end-to-end

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
