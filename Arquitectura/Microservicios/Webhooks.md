# Webhooks - HTTP Callbacks para Integración

> **Concepto clave:**
> Webhooks son callbacks HTTP que permiten a un servicio notificar a otro cuando ocurre un evento específico, usando el patrón "event-driven" sobre HTTP.

---

## ¿Qué son los Webhooks?

Un webhook es una **URL HTTP** que tu aplicación expone para **recibir notificaciones** de eventos de otros servicios.

### Flujo típico:

```
1. Tu app se registra en Servicio Externo (ej: Stripe, GitHub)
2. Proporcionas URL de webhook: https://tuapi.com/webhooks/stripe
3. Cuando ocurre evento (pago exitoso), Servicio envía POST a tu URL
4. Tu app recibe y procesa el evento
```

---

## ¿Por qué Webhooks?

### Ventajas ✅

- **Real-time**: Notificaciones instantáneas vs polling periódico
- **Eficiencia**: No desperdiciar requests consultando si hay cambios
- **Escalabilidad**: El servicio externo push, tú no pull
- **Desacoplamiento**: Servicios se comunican sin conocerse directamente

### vs Polling

| Aspecto | Webhooks (Push) | Polling (Pull) |
|---------|-----------------|----------------|
| **Latencia** | Baja (inmediato) | Alta (intervalo de polling) |
| **Requests** | Solo cuando hay evento | Constantes (aunque no haya cambios) |
| **Server load** | Bajo | Alto (requests innecesarios) |
| **Implementación** | Media (endpoint + seguridad) | Simple |

---

## Casos de Uso Comunes

1. **Payment providers** (Stripe, PayPal):
   - Notificar pago exitoso
   - Alertar de fallo en pago recurrente

2. **Git platforms** (GitHub, GitLab):
   - Push a repositorio → Trigger CI/CD
   - Pull Request creado → Notificar equipo

3. **APIs de terceros**:
   - Slack: Mensaje en canal
   - Twilio: SMS enviado
   - SendGrid: Email entregado/abierto

4. **Microservicios**:
   - Order Service → Notificar Inventory Service
   - Auth Service → Notificar Audit Service

---

## Implementación de Webhook Receiver

### Ejemplo: Stripe Webhooks en Express

```typescript
import express from 'express';
import Stripe from 'stripe';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// IMPORTANTE: Raw body para verificar firma
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      // Verificar firma de Stripe (seguridad)
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Procesar evento según tipo
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedPayment);
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // SIEMPRE responder 200 para confirmar recepción
    res.json({ received: true });
  }
);

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.orderId;

  await db.orders.update(
    { id: orderId },
    {
      status: 'paid',
      paymentIntentId: paymentIntent.id,
      paidAt: new Date(),
    }
  );

  console.log(`[✓] Order ${orderId} marked as paid`);

  // Notificar usuario
  await sendEmail({
    to: paymentIntent.receipt_email!,
    subject: 'Payment Successful',
    body: `Your order ${orderId} has been confirmed.`,
  });
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  console.error(`[✗] Payment failed: ${paymentIntent.last_payment_error?.message}`);
  // Notificar usuario del fallo
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  await db.users.update({ id: userId }, { subscriptionStatus: 'canceled' });
}
```

---

## Seguridad en Webhooks (CRÍTICO)

### 1. Verificación de Firma (Signature Verification)

**Problema:** Cualquiera podría enviar POST a tu endpoint de webhook.

**Solución:** Verificar firma criptográfica del servicio.

```typescript
// Stripe usa HMAC SHA256
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Uso
app.post('/webhooks/custom', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Procesar webhook...
  res.json({ received: true });
});
```

### 2. HTTPS Obligatorio

```typescript
// Rechazar webhooks no-HTTPS en producción
app.post('/webhooks/*', (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.status(403).json({ error: 'HTTPS required' });
  }
  next();
});
```

### 3. Validación de Origen

```typescript
const ALLOWED_IPS = ['192.168.1.100', '10.0.0.50']; // IPs del servicio externo

app.post('/webhooks/internal', (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  if (!ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: 'Unauthorized IP' });
  }

  next();
});
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Máx 100 requests
  message: 'Too many webhook requests',
});

app.post('/webhooks/*', webhookLimiter);
```

---

## Idempotencia (CRÍTICO)

Webhooks pueden ser **enviados múltiples veces** (retry logic). Tu endpoint debe ser **idempotente**.

### Problema:

```typescript
// ❌ NO IDEMPOTENTE
app.post('/webhooks/payment', async (req, res) => {
  const { orderId, amount } = req.body;

  // Si este webhook se ejecuta 2 veces, se procesará 2 veces
  await db.orders.update({ id: orderId }, { credits: credits + amount });

  res.json({ received: true });
});
```

### Solución:

```typescript
// ✅ IDEMPOTENTE con event ID
app.post('/webhooks/payment', async (req, res) => {
  const { eventId, orderId, amount } = req.body;

  // Verificar si ya procesamos este evento
  const existing = await db.webhookEvents.findOne({ eventId });
  if (existing) {
    console.log(`Event ${eventId} already processed, skipping`);
    return res.json({ received: true, duplicate: true });
  }

  // Procesar evento + guardar eventId en transacción
  await db.transaction(async (trx) => {
    await trx.orders.update({ id: orderId }, { credits: credits + amount });
    await trx.webhookEvents.insert({ eventId, processedAt: new Date() });
  });

  res.json({ received: true });
});
```

---

## Retry Strategy

Si tu endpoint falla (error 5xx, timeout), el servicio externo reintentará el webhook.

### Respuestas HTTP correctas:

- **200-299**: Éxito, no reintentar
- **400-499**: Error del cliente, **no reintentar**
- **500-599**: Error del servidor, **reintentar**

### Implementación de Retry Logic (cuando tú envías webhooks):

```typescript
async function sendWebhook(url: string, payload: any, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000; // 1s, 2s, 4s (exponential)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': generateSignature(payload),
          'X-Webhook-Attempt': attempt.toString(),
        },
        body: JSON.stringify(payload),
        timeout: 5000, // 5s timeout
      });

      if (response.ok) {
        console.log(`[✓] Webhook sent successfully (attempt ${attempt})`);
        return { success: true, attempt };
      }

      // Error 4xx - no reintentar
      if (response.status >= 400 && response.status < 500) {
        console.error(`[✗] Webhook failed with client error: ${response.status}`);
        return { success: false, error: 'Client error', attempt };
      }

      // Error 5xx - reintentar
      console.warn(`[⚠] Webhook failed (attempt ${attempt}), retrying...`);
    } catch (error) {
      console.error(`[✗] Webhook request error (attempt ${attempt}):`, error);
    }

    // Esperar antes de reintentar (exponential backoff)
    if (attempt < maxRetries) {
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Todos los reintentos fallaron
  console.error(`[✗] Webhook failed after ${maxRetries} attempts`);
  return { success: false, error: 'Max retries exceeded', attempts: maxRetries };
}
```

---

## Async Processing con Queues

Para webhooks que requieren procesamiento pesado, usa **background jobs**.

```typescript
import { Queue } from 'bullmq';

const webhookQueue = new Queue('webhooks');

app.post('/webhooks/github', express.json(), async (req, res) => {
  const event = req.headers['x-github-event'];
  const signature = req.headers['x-hub-signature-256'];

  // Verificar firma
  if (!verifyGitHubSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Encolar para procesamiento asíncrono
  await webhookQueue.add('process-github-event', {
    event,
    payload: req.body,
    receivedAt: new Date().toISOString(),
  });

  // Responder inmediatamente (< 5 segundos)
  res.json({ received: true });
});

// Worker procesa en background
const worker = new Worker('webhooks', async (job) => {
  const { event, payload } = job.data;

  switch (event) {
    case 'push':
      await triggerCICD(payload);
      break;
    case 'pull_request':
      await notifyTeam(payload);
      break;
  }
});
```

---

## Webhook Provider (Enviar webhooks)

Si tu servicio necesita **enviar** webhooks a clientes:

### 1. Registrar Webhook URL

```typescript
// API para que clientes registren su webhook
app.post('/api/webhooks', authenticateUser, async (req, res) => {
  const { url, events } = req.body;

  // Validar URL
  if (!isValidURL(url) || !url.startsWith('https://')) {
    return res.status(400).json({ error: 'Invalid webhook URL' });
  }

  // Guardar configuración
  const webhook = await db.webhooks.create({
    userId: req.user.id,
    url,
    events, // ['order.created', 'order.updated']
    secret: generateSecret(), // Para firma HMAC
  });

  res.json({ webhook, secret: webhook.secret });
});
```

### 2. Trigger Webhook cuando ocurre evento

```typescript
async function createOrder(orderData: any) {
  // Crear orden en DB
  const order = await db.orders.create(orderData);

  // Trigger webhooks registrados
  await triggerWebhooks('order.created', {
    eventId: generateUUID(),
    eventType: 'order.created',
    data: order,
    timestamp: new Date().toISOString(),
  });

  return order;
}

async function triggerWebhooks(eventType: string, payload: any) {
  // Buscar webhooks suscritos a este evento
  const webhooks = await db.webhooks.find({
    events: { $contains: eventType },
    enabled: true,
  });

  // Enviar a cada webhook (en paralelo)
  const promises = webhooks.map((webhook) => {
    const signature = generateHMAC(payload, webhook.secret);

    return sendWebhook(webhook.url, payload, {
      headers: { 'X-Webhook-Signature': signature },
    });
  });

  await Promise.allSettled(promises);
}
```

### 3. Webhook Dashboard para Clientes

```typescript
// Ver historial de webhooks enviados
app.get('/api/webhooks/:id/deliveries', authenticateUser, async (req, res) => {
  const deliveries = await db.webhookDeliveries.find({
    webhookId: req.params.id,
  }).limit(100);

  res.json({ deliveries });
});

// Reenviar webhook fallido
app.post('/api/webhooks/:id/deliveries/:deliveryId/retry', async (req, res) => {
  const delivery = await db.webhookDeliveries.findOne({
    id: req.params.deliveryId,
  });

  await sendWebhook(delivery.url, delivery.payload);

  res.json({ message: 'Webhook resent' });
});
```

---

## Testing de Webhooks

### 1. Usando ngrok para desarrollo local

```bash
# Exponer puerto local al internet
ngrok http 3000

# Usar URL generada en configuración de webhook:
# https://abc123.ngrok.io/webhooks/stripe
```

### 2. Mock de Webhooks en tests

```typescript
import request from 'supertest';
import { app } from './app';

describe('Stripe Webhook', () => {
  it('should process payment success webhook', async () => {
    const payload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          metadata: { orderId: 'order_456' },
          amount: 5000,
        },
      },
    };

    // Mock de firma Stripe
    const signature = generateStripeSignature(payload);

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);

    // Verificar que orden fue actualizada
    const order = await db.orders.findOne({ id: 'order_456' });
    expect(order.status).toBe('paid');
  });
});
```

---

## Best Practices

### 1. Responder rápido (< 5 segundos)

```typescript
// ❌ Mal - procesamiento síncrono pesado
app.post('/webhooks/payment', async (req, res) => {
  await processOrder(req.body); // 30 segundos
  await sendEmail(req.body); // 10 segundos
  res.json({ received: true }); // Timeout!
});

// ✅ Bien - encolar y responder
app.post('/webhooks/payment', async (req, res) => {
  await queue.add('process-payment', req.body);
  res.json({ received: true }); // < 1 segundo
});
```

### 2. Logging completo

```typescript
app.post('/webhooks/*', (req, res, next) => {
  const webhookLog = {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    receivedAt: new Date(),
  };

  console.log('[Webhook Received]', webhookLog);

  res.on('finish', () => {
    console.log('[Webhook Response]', {
      status: res.statusCode,
      duration: Date.now() - webhookLog.receivedAt.getTime(),
    });
  });

  next();
});
```

### 3. Monitoreo y Alertas

```typescript
// Alertar si webhook falla repetidamente
const failedWebhooks = await db.webhookDeliveries.count({
  status: 'failed',
  createdAt: { $gte: new Date(Date.now() - 3600000) }, // Última hora
});

if (failedWebhooks > 10) {
  await sendAlert({
    message: `${failedWebhooks} webhooks failed in the last hour`,
    severity: 'high',
  });
}
```

---

## Preguntas de Entrevista

### 1. ¿Cómo garantizas que un webhook se procese solo una vez?

**Respuesta:**
Implemento idempotencia usando un `eventId` único:

```typescript
const { eventId } = req.body;
const processed = await db.webhookEvents.findOne({ eventId });
if (processed) {
  return res.json({ received: true, duplicate: true });
}

await db.transaction(async (trx) => {
  await processWebhook(req.body, trx);
  await trx.webhookEvents.insert({ eventId, processedAt: new Date() });
});
```

### 2. ¿Cómo verificas que un webhook proviene del servicio legítimo?

**Respuesta:**
Verifico la firma HMAC usando el secret compartido:

```typescript
const signature = req.headers['x-webhook-signature'];
const expectedSignature = crypto
  .createHmac('sha256', SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### 3. ¿Qué estrategia de retry usarías al enviar webhooks?

**Respuesta:**
Exponential backoff con límite de reintentos:

- Intento 1: Inmediato
- Intento 2: +1 segundo
- Intento 3: +2 segundos
- Intento 4: +4 segundos
- Máximo 5 intentos

Si todos fallan, guardo en Dead Letter Queue para procesamiento manual.

---

## Recursos

- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **GitHub Webhooks:** https://docs.github.com/webhooks
- **Webhook.site (testing):** https://webhook.site/

---

**Última actualización:** 2026-02-20
