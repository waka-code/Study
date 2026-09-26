# Sesión 34 — Mensajería y resiliencia: RabbitMQ, Kafka, MassTransit, Polly, Outbox e idempotencia

> **Objetivo de la sesión**: diseñar sistemas que **siguen funcionando cuando algo falla**, que en un sistema distribuido es siempre. Verás por qué desacoplar con mensajes, cómo funcionan por dentro RabbitMQ y Kafka (y cuándo elegir cada uno), cómo MassTransit te ahorra la fontanería, cómo Polly v8 aplica retry, circuit breaker y timeouts sin empeorar la caída, y los dos patrones que separan a un senior de un semi-senior: **Transactional Outbox** e **idempotencia**. Al terminar deberías poder explicar por qué "exactly-once" es un mito y qué se hace en su lugar.

---

## 1. ¿Por qué mensajería? El problema del acoplamiento temporal

En la Sesión 22 viste HTTP: el cliente **espera** la respuesta. Si `OrderFlow` crea un pedido y llama por HTTP a Inventario, Pagos y Notificaciones, pasa esto:

```
SÍNCRONO (HTTP en cadena)                       ASÍNCRONO (mensajes)

Cliente ─▶ Pedidos ─▶ Inventario ✅              Cliente ─▶ Pedidos ──(PedidoCreado)──▶ [ BROKER ]
                   ─▶ Pagos      ✅                            │ 202 Accepted            │  │  │
                   ─▶ Notif.     ❌ caído                      ▼                          ▼  ▼  ▼
          ◀── 500  (¡y el pago ya se cobró!)              responde en ms       Inventario Pagos Notif.
                                                                              (cada uno a su ritmo;
Disponibilidad = 0.99 × 0.99 × 0.99 ≈ 97%                                      si Notif. cae, su cola
Latencia = suma de todas                                                       espera y reintenta)
```

| | Síncrono (HTTP/gRPC) | Asíncrono (mensajes) |
|---|---|---|
| Acoplamiento temporal | Ambos deben estar vivos **a la vez** | El consumidor puede estar caído; el mensaje espera |
| Latencia percibida | Suma de la cadena | Solo la del productor |
| Picos de carga | Se propagan (y tumban) aguas abajo | La cola los **absorbe** (buffer) |
| Consistencia | Inmediata (si todo sale bien) | **Eventual** |
| Complejidad | Baja | Alta: duplicados, orden, DLQ, observabilidad |
| Cuándo | Necesitas la respuesta **ahora** (consultar precio) | Efectos secundarios, integración, trabajo largo |

> ⚠️ La mensajería **no es gratis**: cambias fallos visibles (500) por fallos silenciosos (mensajes atascados en una DLQ que nadie mira). Sin monitoreo de colas, es peor que HTTP.

### 1.1 Tipos de mensaje

| Tipo | Semántica | Nombre | Destinatarios | Ejemplo |
|---|---|---|---|---|
| **Command** | "Haz esto" | Imperativo | **Uno** (queue) | `CobrarPedido` |
| **Event** | "Esto ocurrió" | Pasado | **Cero o muchos** (pub/sub) | `PedidoCreado` |
| **Query/Reply** | "Dime esto" | Pregunta | Uno, con respuesta | Request/response sobre el bus (úsalo poco) |

> ❓ **Entrevista**: *"¿Command o event?"* → Un command tiene un dueño que lo ejecuta y puede rechazarlo; el emisor **sabe** quién lo procesa. Un event es un hecho que ya ocurrió, el emisor **no sabe** (ni le importa) quién escucha. Los integration events de la Sesión 26 son eventos.

---

## 2. Conceptos universales (valen para cualquier broker)

### 2.1 Garantías de entrega

| Garantía | Qué significa | Cómo se logra | Riesgo |
|---|---|---|---|
| **At-most-once** | 0 o 1 vez | Ack **antes** de procesar (auto-ack) | Pérdida de mensajes |
| **At-least-once** | 1 o más veces | Ack **después** de procesar | **Duplicados** |
| **Exactly-once** | Exactamente 1 vez | No existe de punta a punta con efectos externos | — |

```
¿Por qué hay duplicados con at-least-once?

Consumer:  recibe msg ─▶ procesa (cobra $) ─▶ envía ACK ──✖ (se cae la red / el pod muere)
Broker:    nunca recibió el ACK ─▶ re-entrega el msg ─▶ otro consumer lo procesa ─▶ ¡cobra otra vez!
```

> ❓ **Entrevista**: *"¿Cómo logras exactly-once?"* → No lo logras en el transporte; lo logras en el **efecto**: **at-least-once + consumidores idempotentes** = *effectively-once*. (Kafka ofrece "exactly-once semantics" con transacciones, pero solo para flujos leer-de-Kafka → escribir-en-Kafka; en cuanto tocas una BD o una API externa, vuelves a necesitar idempotencia.)

### 2.2 Otros conceptos que te preguntarán

- **Competing consumers**: N instancias leen la **misma** cola; cada mensaje lo procesa **una**. Así escalas horizontalmente (y así resuelves el "job que corre N veces" de la Sesión 33).
- **Pub/sub**: cada suscriptor tiene **su propia** cola/grupo y recibe **copia** de cada evento.
- **Ack / Nack**: confirmación explícita de procesamiento. Nack con `requeue` → vuelve a la cola; sin requeue → a la DLQ.
- **Dead Letter Queue (DLQ)**: destino de mensajes que fallaron N veces o son inválidos (*poison messages*). Sin DLQ, un mensaje venenoso bloquea o recicla eternamente.
- **Orden**: casi ningún sistema garantiza orden global con consumidores concurrentes. Kafka garantiza orden **por partición**; RabbitMQ por cola **con un solo consumidor**.
- **Backpressure / prefetch**: cuántos mensajes "en vuelo" acepta un consumidor antes de confirmar.

---

## 3. RabbitMQ: el broker de colas inteligentes

### 3.1 Modelo AMQP

El productor **nunca** publica directo en una cola: publica en un **exchange** con una **routing key**; los **bindings** deciden a qué colas llega.

```
                                    binding "pedido.*"
Productor ──(pedido.creado)──▶ [ exchange orderflow.events (topic) ] ──▶ [ cola notificaciones.pedidos ] ─▶ Consumer A
                                         │  binding "pedido.creado"
                                         └──────────────────────────────▶ [ cola inventario.pedidos ]    ─▶ Consumer B, B', B''
                                                                                                           (competing consumers)
     mensaje falla 5 veces ─▶ [ exchange orderflow.dlx ] ─▶ [ cola orderflow.dead-letters ]
```

| Exchange | Enruta por | Uso |
|---|---|---|
| **direct** | Routing key exacta | Commands a una cola concreta |
| **fanout** | Ignora la key: a **todas** las colas enlazadas | Broadcast, DLX |
| **topic** | Patrón: `*` = una palabra, `#` = cero o más (`pedido.*`, `pedido.#`) | Eventos con filtrado (el más usado) |
| **headers** | Headers del mensaje | Raro |

### 3.2 Publicar con confirmaciones (RabbitMQ.Client 7, API async)

```csharp
using RabbitMQ.Client;

var factory = new ConnectionFactory { HostName = "localhost", ClientProvidedName = "orderflow-api" };
// Conexión TCP: cara, larga vida, una por app. Canal: liviano, uno por hilo/consumidor.
await using IConnection conn = await factory.CreateConnectionAsync(ct);

// Publisher confirms: el broker confirma (ack) que PERSISTIÓ el mensaje.
// Con tracking habilitado, BasicPublishAsync espera el confirm y lanza si hay nack.
var opts = new CreateChannelOptions(publisherConfirmationsEnabled: true,
                                    publisherConfirmationTrackingEnabled: true);
await using IChannel ch = await conn.CreateChannelAsync(opts, ct);

// Topología (idempotente: declarar algo que ya existe igual no falla)
await ch.ExchangeDeclareAsync("orderflow.events", ExchangeType.Topic, durable: true, cancellationToken: ct);
await ch.ExchangeDeclareAsync("orderflow.dlx", ExchangeType.Fanout, durable: true, cancellationToken: ct);
await ch.QueueDeclareAsync("orderflow.dead-letters", durable: true, exclusive: false, autoDelete: false, cancellationToken: ct);
await ch.QueueBindAsync("orderflow.dead-letters", "orderflow.dlx", routingKey: "", cancellationToken: ct);

await ch.QueueDeclareAsync("notificaciones.pedidos", durable: true, exclusive: false, autoDelete: false,
    arguments: new Dictionary<string, object?>
    {
        ["x-queue-type"] = "quorum",                 // replicada (Raft): la opción recomendada para durabilidad
        ["x-dead-letter-exchange"] = "orderflow.dlx",// nack sin requeue / límite superado → DLX
        ["x-delivery-limit"] = 5                     // quorum: tras 5 entregas fallidas → dead-letter
    }, cancellationToken: ct);
await ch.QueueBindAsync("notificaciones.pedidos", "orderflow.events", routingKey: "pedido.*", cancellationToken: ct);

var evento = new PedidoCreado(Guid.NewGuid(), Guid.NewGuid(), 15_990m);
var props = new BasicProperties
{
    Persistent = true,                               // ⚠️ sin esto, un reinicio del broker lo pierde
    MessageId = Guid.NewGuid().ToString(),           // clave para la idempotencia del consumidor (§8)
    ContentType = "application/json",
    Type = nameof(PedidoCreado),
    CorrelationId = evento.PedidoId.ToString()
};
try
{
    await ch.BasicPublishAsync("orderflow.events", "pedido.creado", mandatory: true, // mandatory: avisa si no hay cola
        basicProperties: props, body: JsonSerializer.SerializeToUtf8Bytes(evento), cancellationToken: ct);
}
catch (PublishException ex)                          // nack del broker o mensaje sin ruta (return)
{
    logger.LogError(ex, "El broker no aceptó el mensaje");
    throw;
}

public record PedidoCreado(Guid PedidoId, Guid ClienteId, decimal Total);
```

> ⚠️ Durabilidad = **tres** cosas a la vez: exchange `durable`, cola `durable` (o quorum) **y** mensaje `Persistent`. Más publisher confirms para saber que el broker lo tiene. Si falta una, "funciona" hasta el primer reinicio.

### 3.3 Consumir con ack manual y prefetch

```csharp
// Prefetch: máx. 20 mensajes sin ack en este consumidor. Sin límite, RabbitMQ empuja TODA la cola
// a un solo consumidor (y los demás se quedan sin trabajo, o este se queda sin memoria).
await ch.BasicQosAsync(prefetchSize: 0, prefetchCount: 20, global: false, cancellationToken: ct);

var consumer = new AsyncEventingBasicConsumer(ch);
consumer.ReceivedAsync += async (_, ea) =>
{
    try
    {
        var evento = JsonSerializer.Deserialize<PedidoCreado>(ea.Body.Span)!;
        await notificador.EnviarAsync(evento, ct);                    // trabajo real
        await ch.BasicAckAsync(ea.DeliveryTag, multiple: false);     // ✅ ack DESPUÉS de procesar
    }
    catch (JsonException)
    {
        // Mensaje mal formado: reintentarlo nunca funcionará → directo a la DLQ
        await ch.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false);
    }
    catch (Exception)
    {
        // Fallo transitorio: vuelve a la cola (x-delivery-limit corta el bucle infinito)
        await ch.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: true);
    }
};
await ch.BasicConsumeAsync("notificaciones.pedidos", autoAck: false, consumer: consumer, cancellationToken: ct);
```

> ⚠️ `autoAck: true` = at-most-once: el broker borra el mensaje **al entregarlo**. Si tu proceso muere a mitad, se perdió. Casi nunca es lo que quieres.

> ⚠️ `requeue: true` sin límite crea un **bucle caliente**: el mensaje venenoso vuelve al instante, falla, vuelve... consumiendo 100% CPU. Usa `x-delivery-limit` (quorum queues) o reintentos con demora (MassTransit, §5).

---

## 4. Kafka: el log distribuido

Kafka **no es una cola**: es un **log append-only, particionado y replicado**. Los mensajes **no se borran** al consumirse; se retienen por tiempo/tamaño, y cada grupo de consumidores guarda **su posición (offset)**.

```
Topic "orderflow.pedidos" (3 particiones)          key = PedidoId → hash(key) % 3 = partición

Partición 0: [0][1][2][3][4][5][6] ◀── append
Partición 1: [0][1][2][3]
Partición 2: [0][1][2][3][4]

Consumer group "facturacion" (2 instancias):      Consumer group "analitica" (1 instancia):
   instancia A ← P0, P1  (offsets: P0=5, P1=3)        instancia X ← P0, P1, P2  (su PROPIO offset)
   instancia B ← P2      (offset:  P2=4)              puede ir atrasado o releer desde 0 (replay)
```

- **Orden garantizado solo dentro de una partición** → usa como *key* el id de la entidad (`PedidoId`): todos los eventos de un pedido van en orden.
- **Paralelismo máximo = número de particiones** de un grupo. Con 3 particiones, una 4ª instancia queda ociosa.
- **Rebalance**: al entrar/salir una instancia, Kafka reasigna particiones (pausa breve del grupo).

### 4.1 Producir

```csharp
using Confluent.Kafka;

var config = new ProducerConfig
{
    BootstrapServers = "localhost:9092",
    Acks = Acks.All,              // confirmar solo cuando TODAS las réplicas in-sync lo tienen
    EnableIdempotence = true,     // evita duplicados/desorden por reintentos internos del productor
    LingerMs = 5,                 // espera hasta 5 ms para agrupar en batches (throughput)
    CompressionType = CompressionType.Lz4
};
using var producer = new ProducerBuilder<string, string>(config).Build();   // singleton en DI: thread-safe

DeliveryResult<string, string> dr = await producer.ProduceAsync("orderflow.pedidos",
    new Message<string, string>
    {
        Key = evento.PedidoId.ToString(),                  // ⚠️ define partición y por tanto el ORDEN
        Value = JsonSerializer.Serialize(evento),
        Headers = new Headers { { "type", Encoding.UTF8.GetBytes(nameof(PedidoCreado)) } }
    }, ct);
logger.LogInformation("Escrito en partición {P}, offset {O}", dr.Partition.Value, dr.Offset.Value);
```

### 4.2 Consumir (commit manual después de procesar)

```csharp
public sealed class FacturacionKafkaWorker(ILogger<FacturacionKafkaWorker> log) : BackgroundService
{
    // Consume() es BLOQUEANTE: dale un hilo dedicado en vez de bloquear el thread pool (Sesión 33, §7.1)
    protected override Task ExecuteAsync(CancellationToken stoppingToken) =>
        Task.Factory.StartNew(() => Loop(stoppingToken), stoppingToken,
                              TaskCreationOptions.LongRunning, TaskScheduler.Default);

    private void Loop(CancellationToken ct)
    {
        var cfg = new ConsumerConfig
        {
            BootstrapServers = "localhost:9092",
            GroupId = "facturacion",                       // offsets separados por grupo
            AutoOffsetReset = AutoOffsetReset.Earliest,    // grupo nuevo: empieza desde el principio
            EnableAutoCommit = false                       // commit manual → at-least-once controlado
        };
        using var consumer = new ConsumerBuilder<string, string>(cfg).Build();
        consumer.Subscribe("orderflow.pedidos");
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var cr = consumer.Consume(ct);
                var evento = JsonSerializer.Deserialize<PedidoCreado>(cr.Message.Value)!;
                log.LogInformation("Facturando {Id} (p{P}@{O})", evento.PedidoId, cr.Partition.Value, cr.Offset.Value);
                // ... procesar de forma IDEMPOTENTE ...
                consumer.Commit(cr);                       // "procesé hasta aquí" (tras el efecto)
            }
        }
        catch (OperationCanceledException) { }
        finally { consumer.Close(); }                      // sale del grupo limpio → rebalance rápido
    }
}
```

> ⚠️ `Commit` por mensaje es lento (ida y vuelta al broker). En alto volumen: `EnableAutoCommit = true` + `EnableAutoOffsetStore = false` y llamar `consumer.StoreOffset(cr)` **después** de procesar; el commit periódico solo sube offsets ya procesados.

> ⚠️ Kafka **no tiene DLQ ni reintentos nativos por mensaje**: si un mensaje falla y no avanzas el offset, **bloqueas la partición entera**. Patrón: reintentar N veces en memoria, luego publicar a un topic `orderflow.pedidos.dlt` y avanzar.

### 4.3 RabbitMQ vs Kafka (y los servicios gestionados)

| Criterio | RabbitMQ | Kafka |
|---|---|---|
| Modelo | Colas: el mensaje se **borra** al hacer ack | Log: se **retiene**; cada grupo tiene su offset |
| Enrutamiento | Rico (exchanges, patrones) | Simple (topic + partición por key) |
| Replay / reprocesar histórico | ❌ | ✅ (resetear offset) |
| Orden | Por cola, con 1 consumidor | Por partición |
| Throughput | Decenas de miles/s | Cientos de miles a millones/s |
| DLQ, TTL, prioridades, delays | ✅ nativos | ❌ los construyes tú |
| Ideal para | Commands, work queues, integración entre servicios | Event streaming, event sourcing, analítica, CDC, alto volumen |

Equivalentes gestionados: **Amazon SQS/SNS** (≈ colas + fanout, sin servidor que operar), **Azure Service Bus** (≈ RabbitMQ con sesiones y DLQ), **Amazon MSK / Confluent Cloud / Event Hubs** (≈ Kafka).

> ❓ **Entrevista**: *"¿RabbitMQ o Kafka para OrderFlow?"* → Para comandos y eventos de integración entre pocos servicios con reintentos y DLQ: RabbitMQ (o SQS/Service Bus). Si necesito que analítica, facturación y un data lake **relean** el historial de pedidos, o volumen muy alto con orden por pedido: Kafka. Muchas empresas usan ambos.

---

## 5. MassTransit: la abstracción sobre el broker

Con el cliente crudo acabas escribiendo tú: serialización, topología, reintentos con demora, DLQ, correlación, outbox, inbox, sagas, tracing... **MassTransit** (o NServiceBus, Wolverine, Rebus) lo trae hecho y funciona igual sobre RabbitMQ, Azure Service Bus, SQS o en memoria (tests).

```csharp
builder.Services.AddMassTransit(x =>
{
    x.SetKebabCaseEndpointNameFormatter();                         // cola "pedido-creado"
    x.AddConsumer<PedidoCreadoConsumer, PedidoCreadoConsumerDefinition>();

    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host("localhost", "/", h => { h.Username("guest"); h.Password("guest"); });
        cfg.ConfigureEndpoints(ctx);                               // crea exchanges/colas/bindings por convención
    });
});

// Un consumer es una clase normal con DI (scoped por mensaje: puedes inyectar DbContext)
public sealed class PedidoCreadoConsumer(AppDbContext db, ILogger<PedidoCreadoConsumer> log) : IConsumer<PedidoCreado>
{
    public async Task Consume(ConsumeContext<PedidoCreado> context)
    {
        var msg = context.Message;
        log.LogInformation("Reservando stock {PedidoId} (reintento {N})", msg.PedidoId, context.GetRetryAttempt());
        // ... reservar stock con db ...
        await context.Publish(new StockReservado(msg.PedidoId), context.CancellationToken); // conserva CorrelationId
    }
}

public sealed class PedidoCreadoConsumerDefinition : ConsumerDefinition<PedidoCreadoConsumer>
{
    public PedidoCreadoConsumerDefinition() => ConcurrentMessageLimit = 16;   // backpressure por instancia

    protected override void ConfigureConsumer(IReceiveEndpointConfigurator endpoint,
        IConsumerConfigurator<PedidoCreadoConsumer> consumer, IRegistrationContext context)
    {
        endpoint.UseMessageRetry(r =>
        {
            r.Exponential(retryLimit: 5, minInterval: TimeSpan.FromMilliseconds(200),
                          maxInterval: TimeSpan.FromSeconds(10), intervalDelta: TimeSpan.FromMilliseconds(300));
            r.Ignore<ArgumentException>();         // error de programación/datos: reintentar no sirve
        });
        endpoint.UseEntityFrameworkOutbox<AppDbContext>(context);   // inbox + outbox del consumer (§7.3)
    }
}
```

| Mecanismo MassTransit | Qué hace | Cuándo |
|---|---|---|
| `UseMessageRetry` | Reintenta **en memoria**, reteniendo el mensaje | Fallos de milisegundos/segundos (deadlock, timeout breve) |
| `UseDelayedRedelivery` | Devuelve el mensaje al broker para **minutos** después (requiere scheduler/delayed exchange) | Dependencia caída un rato |
| Cola `<nombre>_error` | Destino tras agotar reintentos (+ evento `Fault<T>`) | La DLQ: **monitoréala** y re-procesa desde ahí |
| Cola `<nombre>_skipped` | Mensajes sin consumer que los entienda | Errores de despliegue/contrato |

> ⚠️ **Licencia**: en 2025 se anunció que **MassTransit v9 pasa a licencia comercial**; la v8 sigue siendo open source (Apache 2.0). Igual que con MediatR (Sesión 26), un senior revisa licencias antes de elegir dependencias estructurales. Alternativas: Wolverine, Rebus, NServiceBus (comercial) o el cliente crudo con tu propio outbox.

---

## 6. Resiliencia con Polly v8

Los fallos transitorios (timeouts, `503`, `429`, un pod reiniciándose) son **normales**. Polly v8 (`Polly.Core`) los maneja con **estrategias** componibles en un `ResiliencePipeline`.

### 6.1 Las estrategias

| Estrategia | Qué hace | Protege contra |
|---|---|---|
| **Retry** | Reintenta con backoff exponencial + jitter | Fallos transitorios breves |
| **Circuit Breaker** | Tras X% de fallos, **deja de llamar** un tiempo (falla rápido) | Martillar un servicio caído; agotar tus hilos/sockets esperando |
| **Timeout** | Cancela si tarda más de N | Requests colgadas |
| **Fallback** | Valor alternativo si todo falla | Degradación elegante (caché, default) |
| **Hedging** | Lanza una 2ª petición en paralelo si la 1ª tarda | Latencia de cola (p99) en lecturas |
| **Rate limiter** | Limita llamadas salientes | No sobrepasar la cuota del proveedor |

### 6.2 Circuit breaker: la máquina de estados

```
              fallos ≥ FailureRatio (con ≥ MinimumThroughput llamadas en SamplingDuration)
   ┌────────┐ ──────────────────────────────────────────────▶ ┌────────┐
   │ CLOSED │                                                 │  OPEN  │ ── toda llamada falla al instante
   │ (normal)│ ◀──── llamada de prueba OK ────┐               │        │    (BrokenCircuitException)
   └────────┘                                 │               └────────┘
                                         ┌───────────┐            │
                                         │ HALF-OPEN │ ◀──────────┘ pasado BreakDuration
                                         │ (1 prueba)│ ── prueba falla ──▶ OPEN otra vez
                                         └───────────┘
```

### 6.3 Un pipeline completo (y el orden importa)

```csharp
using Polly;
using Polly.CircuitBreaker;
using Polly.Fallback;
using Polly.Retry;
using Polly.Timeout;

var transitorio = new PredicateBuilder<HttpResponseMessage>()
    .Handle<HttpRequestException>()
    .Handle<TimeoutRejectedException>()                                   // timeout por intento
    .HandleResult(r => r.StatusCode is HttpStatusCode.TooManyRequests or >= HttpStatusCode.InternalServerError);

var pipeline = new ResiliencePipelineBuilder<HttpResponseMessage>()
    // 1) Fallback: lo más EXTERNO, atrapa lo que escape (aquí: circuito abierto)
    .AddFallback(new FallbackStrategyOptions<HttpResponseMessage>
    {
        ShouldHandle = new PredicateBuilder<HttpResponseMessage>().Handle<BrokenCircuitException>(),
        FallbackAction = _ => Outcome.FromResultAsValueTask(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable))
    })
    // 2) Timeout TOTAL: el presupuesto de la operación completa, incluidos todos los reintentos
    .AddTimeout(TimeSpan.FromSeconds(10))
    // 3) Retry
    .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
    {
        ShouldHandle = transitorio,
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true,                         // ⚠️ sin jitter, 1000 clientes reintentan en el MISMO instante
        Delay = TimeSpan.FromMilliseconds(200),
        // Respeta el Retry-After del servidor (el 429 de la Sesión 33); null → usa el backoff normal
        DelayGenerator = args => new ValueTask<TimeSpan?>(args.Outcome.Result?.Headers.RetryAfter?.Delta),
        OnRetry = args => { log.LogWarning("Reintento {N} tras {D}", args.AttemptNumber + 1, args.RetryDelay); return default; }
    })
    // 4) Circuit breaker: DENTRO del retry → cuenta cada intento individual
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions<HttpResponseMessage>
    {
        ShouldHandle = transitorio,
        FailureRatio = 0.5, MinimumThroughput = 10,
        SamplingDuration = TimeSpan.FromSeconds(30), BreakDuration = TimeSpan.FromSeconds(15)
    })
    // 5) Timeout por INTENTO: lo más interno
    .AddTimeout(TimeSpan.FromSeconds(2))
    .Build();

HttpResponseMessage resp = await pipeline.ExecuteAsync(
    async token => await http.GetAsync("/stock/ABC", token), ct);
```

```
Llamada ─▶ Fallback ─▶ Timeout total ─▶ Retry ─▶ Circuit breaker ─▶ Timeout intento ─▶ HTTP
           (externo)                                                 (interno)
```

Salida real de este pipeline (con `MinimumThroughput = 4` y un servidor que siempre responde 503, verificado):

```
  retry 1 delay 13ms
  retry 2 delay 14ms
  retry 3 delay 15ms
  ABIERTO 00:00:15
op 0: 503 Service Unavailable (llamadas reales=4)   ← 1 intento + 3 reintentos, abre el circuito
op 1: 503 fallback (llamadas reales=4)              ← circuito abierto: falla al instante, 0 llamadas
op 2: 503 fallback (llamadas reales=4)
```

> ❓ **Entrevista**: *"¿Para qué sirve un circuit breaker si ya tengo retry?"* → El retry **multiplica** la carga sobre un servicio que ya está sufriendo. El circuit breaker detecta que está caído y **deja de llamarlo**: protege al servicio remoto (le da aire para recuperarse) y a ti (no gastas hilos, sockets ni latencia esperando timeouts). Retry para lo transitorio; breaker para lo persistente.

### 6.4 En `HttpClient`: `Microsoft.Extensions.Http.Resilience`

En la Sesión 22 viste `AddStandardResilienceHandler()`. Sus defaults, que debes conocer:

| Capa (de fuera a dentro) | Default |
|---|---|
| Rate limiter | 1000 requests concurrentes |
| Timeout total | 30 s |
| Retry | 3 reintentos, exponencial con jitter, base 2 s; maneja 5xx, 408, 429 y excepciones de red |
| Circuit breaker | Abre con 10% de fallos, mín. 100 requests en 30 s; abierto 5 s |
| Timeout por intento | 10 s |

```csharp
// Ajustar el estándar (proveedor de pagos): POST no idempotente → NO reintentar
builder.Services.AddHttpClient<PagosClient>(c => c.BaseAddress = new Uri("https://pagos.example"))
    .AddStandardResilienceHandler(o =>
    {
        o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(3);
        o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(15);
        o.Retry.MaxRetryAttempts = 2;
        o.Retry.DisableForUnsafeHttpMethods();   // sin retry en POST/PUT/PATCH/DELETE (paquete 9.2+, funciona en net8.0)
    });

// Pipeline a medida
builder.Services.AddHttpClient<InventarioClient>(c => c.BaseAddress = new Uri("https://inventario.example"))
    .AddResilienceHandler("inventario", b =>
    {
        b.AddTimeout(TimeSpan.FromSeconds(10));
        b.AddRetry(new HttpRetryStrategyOptions { MaxRetryAttempts = 3, BackoffType = DelayBackoffType.Exponential, UseJitter = true });
        b.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions { FailureRatio = 0.5, MinimumThroughput = 10,
                                                                    SamplingDuration = TimeSpan.FromSeconds(30) });
        b.AddTimeout(TimeSpan.FromSeconds(2));
    });

// Pipelines para código que NO es HttpClient (publicar al broker, llamar a Redis...): registro con nombre
builder.Services.AddResiliencePipeline("broker-publish", b => b
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 5, BackoffType = DelayBackoffType.Exponential, UseJitter = true,
        ShouldHandle = new PredicateBuilder().Handle<TimeoutException>().Handle<IOException>()
    })
    .AddTimeout(TimeSpan.FromSeconds(5)));

// Uso: inyecta ResiliencePipelineProvider<string>
var pipeline = provider.GetPipeline("broker-publish");
await pipeline.ExecuteAsync(async token => await PublicarAsync(evento, token), ct);
```

> ⚠️ **Amplificación de reintentos**: API Gateway (3 reintentos) → OrderFlow (3) → Inventario (3) → BD. Una caída de la BD genera 4 × 4 × 4 = **64** llamadas por request original. Reintenta en **una sola capa** (idealmente la más cercana al fallo) y usa timeouts decrecientes hacia abajo.

> ⚠️ Un circuit breaker es **por instancia** y por pipeline: guárdalo como singleton (DI lo hace por ti). Crear el pipeline por request = breaker que nunca acumula estadística.

---

## 7. Transactional Outbox: publicar sin perder ni inventar mensajes

### 7.1 El problema del dual write

La Sesión 26 lo anticipó. Tienes que hacer **dos escrituras en dos sistemas** (BD y broker) y no hay transacción que las cubra a ambas:

```
Opción A: guardar y luego publicar            Opción B: publicar y luego guardar
  SaveChanges() ✅                              Publish() ✅
  💥 el proceso muere                           💥 SaveChanges falla (constraint, BD caída)
  Publish() ✗ nunca ocurre                      → otros servicios reaccionan a un pedido
  → pedido existe, nadie se enteró                que NO EXISTE
```

> ❓ **Entrevista**: *"¿Por qué no usas una transacción distribuida (2PC / MSDTC)?"* → Los brokers modernos y las BD en la nube no la soportan (o la soportan mal), bloquea recursos, y acopla la disponibilidad de ambos sistemas. El Outbox logra lo mismo con una transacción **local**.

### 7.2 La solución: el mensaje viaja en la misma transacción

```
      ┌─────────────── UNA transacción local ───────────────┐
API ─▶│  INSERT INTO Pedidos (...)                          │
      │  INSERT INTO OutboxMessages (type, payload, ...)    │── COMMIT (todo o nada)
      └─────────────────────────────────────────────────────┘
                                   │
     OutboxDispatcher (BackgroundService, cada 2 s)
       SELECT ... FOR UPDATE SKIP LOCKED  ─▶ Publish al broker ─▶ UPDATE ProcessedOnUtc
                                   │
               ⚠️ si muere entre Publish y UPDATE → re-publica → DUPLICADO → consumidor idempotente (§8)
```

```csharp
public class OutboxMessage
{
    public Guid Id { get; init; } = Guid.NewGuid();         // será el MessageId en el broker
    public required string Type { get; init; }
    public required string Payload { get; init; }
    public DateTime OccurredOnUtc { get; init; } = DateTime.UtcNow;
    public DateTime? ProcessedOnUtc { get; set; }
    public int Attempts { get; set; }
    public string? Error { get; set; }
}

// En el handler del caso de uso (Sesión 26): el evento se agrega al MISMO DbContext
db.Pedidos.Add(pedido);
db.OutboxMessages.Add(new OutboxMessage
{
    Type = nameof(PedidoCreado),
    Payload = JsonSerializer.Serialize(new PedidoCreado(pedido.Id, pedido.ClienteId, pedido.Total))
});
await db.SaveChangesAsync(ct);                              // una sola transacción: ambos o ninguno
```

```csharp
public sealed class OutboxDispatcher(IServiceScopeFactory scopes, ILogger<OutboxDispatcher> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try { await DespacharLoteAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogError(ex, "Error en outbox"); }
        }
    }

    private async Task DespacharLoteAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var publisher = scope.ServiceProvider.GetRequiredService<IMessagePublisher>();

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        // SKIP LOCKED (PostgreSQL / SQL Server con READPAST): varias réplicas del dispatcher
        // toman lotes DISTINTOS sin bloquearse → competing consumers sobre una tabla
        var lote = await db.OutboxMessages
            .FromSql($"""
                SELECT * FROM "OutboxMessages"
                WHERE "ProcessedOnUtc" IS NULL AND "Attempts" < 10
                ORDER BY "OccurredOnUtc"
                LIMIT 50
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(ct);

        foreach (var m in lote)
        {
            try
            {
                await publisher.PublishAsync(m.Type, m.Payload, messageId: m.Id, ct);  // con publisher confirms
                m.ProcessedOnUtc = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                m.Attempts++; m.Error = ex.Message;
                break;                     // preserva el orden: no publiques los siguientes si falló uno
            }
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
```

> ⚠️ Limpia la tabla: un job que borre mensajes procesados de más de N días, y un índice filtrado `WHERE "ProcessedOnUtc" IS NULL` para que la consulta siga siendo instantánea con millones de filas.

> 💡 **Alternativa sin polling**: *Change Data Capture* (Debezium leyendo el WAL de Postgres y publicando la tabla outbox a Kafka). Menor latencia y cero carga de polling, a costa de más infraestructura.

### 7.3 Con MassTransit: outbox e inbox listos

```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UsePostgres();                                  // usa FOR UPDATE SKIP LOCKED internamente
        o.UseBusOutbox();                                 // IPublishEndpoint en la API escribe en la tabla outbox
        o.QueryDelay = TimeSpan.FromSeconds(1);
        o.DuplicateDetectionWindow = TimeSpan.FromMinutes(30);   // ventana del inbox
    });
    // ... UsingRabbitMq ...
});

// DbContext: tablas InboxState, OutboxMessage y OutboxState de MassTransit
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.AddInboxStateEntity();
    mb.AddOutboxMessageEntity();
    mb.AddOutboxStateEntity();
}

// Endpoint: Publish ANTES de SaveChanges → queda en la tabla, se envía tras el commit
app.MapPost("/pedidos", async (CrearPedido req, AppDbContext db, IPublishEndpoint bus, CancellationToken ct) =>
{
    var pedido = new Pedido { Id = Guid.NewGuid(), ClienteId = req.ClienteId, Total = req.Total };
    db.Pedidos.Add(pedido);
    await bus.Publish(new PedidoCreado(pedido.Id, pedido.ClienteId, pedido.Total), ct); // aún NO sale al broker
    await db.SaveChangesAsync(ct);                                                        // pedido + outbox, atómico
    return Results.Accepted($"/pedidos/{pedido.Id}", new { pedido.Id });
});
```

En el lado consumidor, `UseEntityFrameworkOutbox<AppDbContext>(context)` (visto en §5) añade el **inbox**: registra el `MessageId` en `InboxState` y descarta duplicados dentro de la ventana, y guarda los mensajes que el consumer publica en la misma transacción que sus cambios (MassTransit llama a `SaveChangesAsync` por ti al terminar el consumer).

---

## 8. Idempotencia: la otra mitad del contrato

At-least-once (broker) + outbox (re-publica si duda) + reintentos (Polly) = **vas a recibir duplicados**. La idempotencia no es opcional.

### 8.1 Estrategias

| Estrategia | Cómo | Ejemplo |
|---|---|---|
| **Idempotencia natural** | La operación ya es idempotente | `UPDATE ... SET Estado = 'Pagado'` (no `Saldo = Saldo - 100`) |
| **Upsert / clave natural** | Unique constraint sobre el id de negocio | `INSERT ... ON CONFLICT (PedidoId) DO NOTHING` |
| **Inbox / tabla de procesados** | Guardar `(MessageId, Consumer)` en la **misma transacción** que el efecto | El caso general |
| **Versión / concurrencia optimista** | Ignorar eventos con versión ≤ a la actual | Proyecciones de lectura (Sesión 25, `RowVersion`) |

### 8.2 Consumidor idempotente con inbox propio

```csharp
public class ProcessedMessage
{
    public Guid MessageId { get; init; }
    public required string Consumer { get; init; }        // PK compuesta: el mismo msg lo procesan varios consumers
    public DateTime ProcessedOnUtc { get; init; } = DateTime.UtcNow;
}
// OnModelCreating: mb.Entity<ProcessedMessage>().HasKey(m => new { m.MessageId, m.Consumer });

public async Task<bool> ProcesarAsync(Guid messageId, PedidoCreado msg, CancellationToken ct)
{
    await using var tx = await db.Database.BeginTransactionAsync(ct);
    db.ProcessedMessages.Add(new ProcessedMessage { MessageId = messageId, Consumer = "facturacion.pedido-creado" });
    try
    {
        await db.SaveChangesAsync(ct);                    // la PK hace el trabajo: el 2º INSERT falla
    }
    catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
    {
        return false;                                     // duplicado → no hacer nada, pero SÍ dar ack
    }
    db.Facturas.Add(Factura.Para(msg));                   // efecto de negocio, mismo DbContext
    await db.SaveChangesAsync(ct);
    await tx.CommitAsync(ct);                             // marca + efecto: atómicos
    return true;
}
```

> ⚠️ El error clásico: `if (await db.ProcessedMessages.AnyAsync(m => m.MessageId == id)) return;` y luego procesar. Dos réplicas reciben el duplicado a la vez, ambas ven "no existe", ambas procesan (*check-then-act*, Sesión 29). La **unique constraint** es lo único atómico.

> ⚠️ Si el efecto es **externo** (cobrar en Stripe, enviar email) no puede entrar en tu transacción. Pasa tu `MessageId` como **idempotency key al proveedor** (Stripe, Adyen, etc. lo soportan) para que él deduplique.

### 8.3 Idempotencia en la API HTTP: `Idempotency-Key`

La Sesión 22 explicó la idea y la 33 exigió el header. Aquí la deduplicación real, como endpoint filter:

```csharp
public sealed class IdempotencyFilter(AppDbContext db) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var http = ctx.HttpContext;
        if (!http.Request.Headers.TryGetValue("Idempotency-Key", out var k) || k.Count != 1)
            return TypedResults.Problem(statusCode: 400, title: "Falta Idempotency-Key");

        var key = $"{http.User.Identity?.Name ?? "anon"}:{k[0]}";         // por usuario: evita colisiones/abuso
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(ctx.Arguments))));

        var previo = await db.IdempotencyRecords.AsNoTracking().FirstOrDefaultAsync(r => r.Key == key, http.RequestAborted);
        if (previo is not null)
        {
            if (previo.RequestHash != hash)                               // misma key, otro body → error del cliente
                return TypedResults.Problem(statusCode: 422, title: "Idempotency-Key reutilizada con otro body");
            if (previo.StatusCode == 0)                                   // la original sigue en curso
                return TypedResults.Problem(statusCode: 409, title: "Request original aún en proceso");
            http.Response.Headers["Idempotent-Replayed"] = "true";
            return Results.Content(previo.ResponseBody, "application/json", statusCode: previo.StatusCode); // misma respuesta
        }

        var registro = new IdempotencyRecord { Key = key, RequestHash = hash };  // "reserva" la key (PK)
        db.IdempotencyRecords.Add(registro);
        try { await db.SaveChangesAsync(http.RequestAborted); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return TypedResults.Problem(statusCode: 409, title: "Request concurrente con la misma key");
        }

        var resultado = await next(ctx);
        if (resultado is IStatusCodeHttpResult { StatusCode: < 500 } sc)   // guarda éxitos y errores 4xx
        {
            registro.StatusCode = sc.StatusCode ?? 200;
            registro.ResponseBody = resultado is IValueHttpResult v ? JsonSerializer.Serialize(v.Value) : null;
        }
        else db.IdempotencyRecords.Remove(registro);                      // 5xx: libera la key para reintentar
        await db.SaveChangesAsync(http.RequestAborted);
        return resultado;
    }
}
```

> 💡 Dale un TTL (24 h es lo típico, como Stripe) y bórralos con un job. En alto volumen, este registro vive mejor en Redis con `SET key value NX EX 86400`.

---

## 9. Checklist senior de sistemas distribuidos

| ✅ Haz | ❌ Evita |
|---|---|
| Ack **después** de procesar | `autoAck: true` en trabajo que importa |
| Exchange/cola durables + mensaje persistente + publisher confirms | Asumir que "publicar" = "llegó" |
| DLQ con alertas y un procedimiento para re-procesar | DLQ que nadie mira |
| Outbox para todo evento que nace de un cambio en BD | `SaveChanges()` + `Publish()` a secas |
| Consumidores idempotentes con unique constraint | `if (!Any()) procesar` |
| Retry con backoff + jitter, **solo** en operaciones idempotentes | Retry en cada capa (amplificación) |
| Circuit breaker + timeouts decrecientes hacia abajo | `HttpClient.Timeout` de 100 s por defecto |
| `MessageId` y `CorrelationId` en cada mensaje (tracing, Sesión 36) | Mensajes anónimos imposibles de rastrear |
| Contratos versionados, consumidores tolerantes (*tolerant reader*) | Cambiar un evento publicado sin coordinar |
| Métricas: profundidad de cola, edad del mensaje más viejo, tasa de errores | Descubrir el atasco porque se quejó un cliente |

---

## Resumen mental de la sesión

```
¿Por qué mensajes? desacople temporal, absorber picos, consistencia EVENTUAL
Command (1 dueño, imperativo) · Event (N suscriptores, pasado)

Entrega: at-most-once (pierde) · at-least-once (duplica) · exactly-once = at-least-once + idempotencia

RabbitMQ: producer → EXCHANGE (direct/fanout/topic) → binding → QUEUE → consumer
          durable + persistent + publisher confirms · ack manual · prefetch · quorum + DLX + delivery-limit
Kafka:    LOG particionado y retenido · orden POR PARTICIÓN (key) · consumer groups + offsets · replay
          acks=all + idempotence · commit tras procesar · sin DLQ nativa → topic .dlt
MassTransit: consumers con DI, retry (memoria) vs redelivery (broker), _error/_skipped, outbox/inbox
          ⚠️ v9 comercial

Polly v8: Fallback → Timeout total → Retry (exp + jitter, Retry-After) → Circuit breaker → Timeout intento
          CB: Closed → Open (falla rápido) → Half-open (prueba)
          HttpClient: AddStandardResilienceHandler / AddResilienceHandler · no reintentar POST
          reintenta en UNA capa · pipelines singleton

Outbox:   dual write ✗ → INSERT negocio + INSERT outbox en UNA transacción local
          dispatcher con FOR UPDATE SKIP LOCKED · o CDC (Debezium) · o MassTransit EF outbox
Idempotencia: natural · upsert · inbox (MessageId, Consumer) con UNIQUE en la misma TX
          HTTP: Idempotency-Key (+hash del body, 409 en curso, 422 body distinto, replay de respuesta)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Cuándo elegirías comunicación asíncrona por mensajes en vez de HTTP? ¿Qué pierdes?
2. ❓ Command vs event: ¿en qué se diferencian en semántica, nombre y número de destinatarios?
3. ❓ At-most-once vs at-least-once. ¿Por qué "exactly-once" no existe de punta a punta y qué haces en su lugar?
4. ❓ Explica exchange, binding y queue en RabbitMQ. ¿Qué tres cosas necesitas para que un mensaje sobreviva a un reinicio del broker?
5. ❓ ¿Qué es el prefetch y qué pasa si no lo configuras? ¿Por qué `requeue: true` sin límite es peligroso?
6. ❓ ¿Cómo garantiza Kafka el orden? ¿Qué limita el paralelismo de un consumer group?
7. ❓ RabbitMQ vs Kafka: da un caso de uso claro para cada uno.
8. ❓ ¿Qué problema resuelve el circuit breaker que el retry no resuelve? Describe sus tres estados.
9. ❓ ¿En qué orden compones fallback, retry, circuit breaker y timeouts? ¿Por qué dos timeouts?
10. ❓ ¿Qué es la amplificación de reintentos y cómo la evitas?
11. ❓ Explica el dual write y cómo lo resuelve el Transactional Outbox. ¿Por qué el outbox obliga a tener consumidores idempotentes?
12. ❓ Implementa de palabra un consumidor idempotente. ¿Por qué `if (!Any())` no basta? ¿Y si el efecto es cobrar en un proveedor externo?

## Ejercicio práctico
Convierte **OrderFlow** (Sesiones 32–33) en un sistema orientado a eventos:

1. **Infra local**: agrega a tu `docker-compose.yml` `rabbitmq:4-management` (UI en `:15672`) y, opcional, Kafka en modo KRaft (`apache/kafka`).
2. **Cliente crudo primero**: en una consola, declara con `RabbitMQ.Client` 7 el exchange topic `orderflow.events`, la cola quorum `notificaciones.pedidos` con DLX y `x-delivery-limit = 5`. Publica 10 `PedidoCreado` con publisher confirms y consúmelos con ack manual y `prefetchCount = 5`. Luego publica un JSON inválido y comprueba en la UI que termina en `orderflow.dead-letters`.
3. **Outbox propio**: reemplaza el `Channel<T>` en memoria del capstone. `POST /pedidos` guarda el pedido **y** un `OutboxMessage` en la misma transacción; el `OutboxDispatcher` los publica con `FOR UPDATE SKIP LOCKED`. Prueba: mata el proceso (`kill -9`) justo después del `SaveChanges` y verifica que al reiniciar el evento se publica igual.
4. **Consumidores**: servicio `Inventario` (reserva stock) y `Notificaciones` (email simulado), cada uno con su cola enlazada a `pedido.*`. Haz `Inventario` idempotente con la tabla `ProcessedMessages` (PK compuesta). Publica dos veces el mismo `MessageId` a mano desde la UI y comprueba que el stock se descuenta **una** vez.
5. **MassTransit**: migra los consumidores a MassTransit 8 con `UseMessageRetry` exponencial y `UseEntityFrameworkOutbox`. Lanza una excepción en el consumer y observa los reintentos en los logs y el mensaje final en la cola `_error`.
6. **Polly**: el cliente del proveedor de pagos simulado usa `AddStandardResilienceHandler` con `DisableForUnsafeHttpMethods()`. Crea un endpoint del simulador que devuelva `503` el 70% de las veces y otro que devuelva `429` con `Retry-After: 2`; observa en logs el backoff con jitter, la apertura del circuito y el respeto de `Retry-After`.
7. **Idempotency-Key**: activa el `IdempotencyFilter` en `POST /pedidos`. Verifica: misma key + mismo body → misma respuesta con `Idempotent-Replayed: true`; misma key + otro body → `422`; dos requests simultáneas con la misma key → una `202` y una `409`.
8. **Métricas mínimas**: expón en `/health/ready` un check de RabbitMQ (`AspNetCore.HealthChecks.Rabbitmq`) y agrega un check "outbox atrasado" que pase a `Degraded` si hay mensajes sin procesar de más de 1 minuto.
9. (Opcional) Publica los mismos eventos a Kafka con `key = PedidoId` y crea dos consumer groups (`facturacion`, `analitica`). Resetea el offset de `analitica` a `earliest` con `kafka-consumer-groups.sh` y comprueba el **replay** completo.

---

➡️ **Cuando termines**, marca la Sesión 34 en el [README](Readme.md) y pídeme la **Sesión 35 — Microservicios y Event-Driven Architecture (API Gateway, sagas, gRPC, GraphQL, SignalR)**.
