# Sesión 35 — Microservicios y Event-Driven Architecture: API Gateway, sagas, gRPC, GraphQL y SignalR

> **Objetivo de la sesión**: saber *cuándo* partir un sistema en servicios (y cuándo **no**), cómo se comunican entre sí (síncrono vs asíncrono, REST vs gRPC vs GraphQL vs SignalR vs eventos) y cómo mantener la consistencia de datos cuando ya no existe una transacción que lo abarque todo (sagas). Al terminar deberías poder dibujar en una pizarra la arquitectura distribuida de OrderFlow, justificar cada flecha y escribir en C# un gateway con YARP, un servicio gRPC, un endpoint GraphQL sin N+1, un hub de SignalR y una saga orquestada con compensaciones.

---

## 1. ¿Por qué microservicios? (y por qué casi siempre empezar por un monolito)

En la Sesión 26 separamos el código por **capas** (Clean Architecture) y por **bounded contexts** (DDD). Un microservicio es llevar esa frontera un paso más allá: cada bounded context se convierte en un **proceso independiente**, con su **propia base de datos**, su **propio pipeline de despliegue** y, idealmente, su **propio equipo**.

| | **Monolito (bien hecho)** | **Monolito modular** | **Microservicios** |
|---|---|---|---|
| Despliegue | 1 artefacto | 1 artefacto | N artefactos independientes |
| Llamadas entre módulos | En memoria (ns) | En memoria, vía contratos públicos | Red (ms), pueden fallar |
| Base de datos | Compartida | Compartida, **esquema por módulo** | Una por servicio |
| Transacciones | ACID locales | ACID locales | **Consistencia eventual** + sagas |
| Escalado | Todo junto | Todo junto | Por servicio |
| Complejidad operativa | Baja | Baja | **Muy alta** (red, observabilidad, versionado, CI/CD × N) |
| Autonomía de equipos | Baja | Media | Alta |

La motivación real de los microservicios es **organizacional**, no técnica: permitir que muchos equipos desplieguen de forma independiente sin coordinarse. La **Ley de Conway** lo resume: *"la arquitectura de un sistema acaba copiando la estructura de comunicación de la organización que lo construye"*.

> ⚠️ **El monolito distribuido**: el peor de los dos mundos. Servicios que comparten base de datos, que deben desplegarse juntos, o donde una request atraviesa 7 servicios en cadena síncrona. Pagas toda la complejidad de la red y no obtienes ninguna autonomía. Síntoma clásico: *"para sacar esta feature hay que desplegar Pedidos, Pagos e Inventario el mismo día y en orden"*.

Las **8 falacias de la computación distribuida** (Deutsch) son el recordatorio de todo lo que un monolito te regala gratis: *la red es fiable, la latencia es cero, el ancho de banda es infinito, la red es segura, la topología no cambia, hay un solo administrador, el transporte cuesta cero, la red es homogénea*. Cada una es falsa, y cada una exige código (timeouts, reintentos, idempotencia, TLS, service discovery…).

> ❓ **Entrevista**: *"¿Migrarías este monolito a microservicios?"* → La respuesta senior empieza con preguntas: ¿qué problema tenemos? ¿despliegues bloqueados entre equipos? ¿una parte necesita escalar distinto? ¿stacks distintos? Si el problema es "el código está desordenado", la solución es un **monolito modular** (Sesión 26), no la red. Martin Fowler: *"Monolith first"*. Si se migra, se hace de forma incremental con **Strangler Fig** (sección 9), extrayendo primero el bounded context con fronteras más claras.

### 1.1 Database per service

Cada servicio es **dueño exclusivo** de sus datos: nadie más lee ni escribe sus tablas. Si Pagos necesita datos de Pedidos, los pide por API o los recibe por eventos y guarda **su propia copia** (una proyección local).

```
   ✗ Base compartida                        ✓ Database per service
┌────────┐  ┌────────┐                  ┌────────┐        ┌────────┐
│Pedidos │  │ Pagos  │                  │Pedidos │─evento─▶│ Pagos  │
└───┬────┘  └───┬────┘                  └───┬────┘        └───┬────┘
    └────┬──────┘                           │                 │
     ┌───▼───┐  ← acoplamiento por       ┌──▼──┐           ┌──▼──┐
     │  BD   │    esquema: un ALTER      │ BD  │           │ BD  │
     └───────┘    rompe a todos          └─────┘           └─────┘
```

El precio: **no hay JOIN entre servicios ni transacción distribuida**. Las consultas que cruzan servicios se resuelven con *API composition* o con *read models* alimentados por eventos (CQRS, Sesión 26), y las escrituras que cruzan servicios con **sagas** (sección 5).

---

## 2. Comunicación entre servicios: síncrona vs asíncrona

La decisión más importante en un sistema distribuido no es el framework: es **qué tipo de acoplamiento aceptas** en cada flecha.

| Tipo de acoplamiento | Pregunta | Síncrono (HTTP/gRPC) | Asíncrono (eventos/colas) |
|---|---|---|---|
| **Temporal** | ¿Ambos deben estar vivos a la vez? | Sí | No: el broker guarda el mensaje |
| **De ubicación** | ¿Necesito saber dónde está el otro? | Sí (DNS / discovery) | No: solo el broker |
| **De disponibilidad** | Si B cae, ¿A cae? | Sí (sin circuit breaker, en cascada) | No |
| **De contrato** | ¿Comparto un esquema? | Sí | Sí (el evento **es** el contrato) |

Regla práctica: **consultas → síncrono**, **efectos secundarios → asíncrono**. "Dame el precio del producto" es una pregunta que necesita respuesta ahora; "el pedido se pagó, que alguien envíe el email" no necesita que el servicio de email esté vivo en este milisegundo.

La disponibilidad de una cadena síncrona es el **producto** de las disponibilidades:

```
Gateway ──▶ Pedidos ──▶ Inventario ──▶ Precios
 99,9%      99,9%        99,9%          99,9%     →  0,999⁴ ≈ 99,6%  (~35 h caído al año)
```

### 2.1 El menú de protocolos (ampliando la tabla de la Sesión 22)

| | **REST/JSON** | **gRPC** | **GraphQL** | **SignalR** | **Mensajería** (Sesión 34) |
|---|---|---|---|---|---|
| Transporte | HTTP/1.1-2-3 | HTTP/2 (obligatorio) | HTTP (POST) | WebSockets → SSE → long polling | AMQP, protocolo Kafka… |
| Formato | JSON texto | Protobuf binario | JSON | JSON o MessagePack | Lo que elijas (JSON, Avro, Protobuf) |
| Contrato | OpenAPI (opcional) | `.proto` (obligatorio, *code-first* del cliente) | Schema tipado | Interfaz del hub | Esquema del evento |
| Dirección | Request/response | Unary + 3 tipos de streaming | Query/mutation + subscriptions | Bidireccional, push | Fire-and-forget / pub-sub |
| Navegador | ✅ | ⚠️ solo con gRPC-Web | ✅ | ✅ | ❌ |
| Caso ideal | API pública, CRUD | Servicio ↔ servicio interno, baja latencia | BFF para frontends con necesidades variables | Tiempo real al usuario | Desacoplar servicios, picos, eventos |

---

## 3. API Gateway y BFF

Sin gateway, el cliente (app móvil, SPA) tendría que conocer la URL de cada servicio, autenticarse con cada uno y lidiar con CORS N veces. El **API Gateway** es la **única puerta de entrada**:

```
                        ┌──────────────────────────────┐
  Móvil ─┐              │         API GATEWAY          │      ┌──▶ Orders API
  SPA  ──┼──HTTPS──────▶│ TLS · AuthN JWT · rate limit │──────┼──▶ Catalog API
  B2B  ──┘              │ routing · CORS · correlation │      └──▶ Payments API
                        └──────────────────────────────┘      (red interna, HTTP/gRPC)
```

Responsabilidades **transversales** que sí van en el gateway: terminación TLS, validación del JWT (Sesión 28), rate limiting, CORS, correlation ID, routing, agregación simple. Lo que **no** va: reglas de negocio. Un gateway con `if (pedido.Total > 1000)` es un monolito disfrazado.

**BFF (Backend For Frontend)**: en vez de un gateway genérico, uno **por tipo de cliente** (BFF-móvil, BFF-web), cada uno propiedad del equipo del frontend y con respuestas moldeadas a esa pantalla. En la Sesión 28 vimos el BFF también como patrón de seguridad (los tokens nunca llegan al navegador).

### 3.1 YARP: un reverse proxy escrito en .NET

**YARP** (*Yet Another Reverse Proxy*) es la librería de Microsoft para construir gateways en ASP.NET Core. Como es un middleware más, puedes combinarlo con todo lo que ya sabes: autenticación, rate limiting, Output Cache, OpenTelemetry.

```json
// appsettings.json del Gateway
{
  "ReverseProxy": {
    "Routes": {
      "orders": {
        "ClusterId": "orders",
        "AuthorizationPolicy": "customer",        // política definida en AddAuthorization
        "RateLimiterPolicy": "per-user",
        "Match": { "Path": "/api/orders/{**rest}" },
        "Transforms": [ { "PathPattern": "/orders/{**rest}" } ]   // quita el prefijo /api
      }
    },
    "Clusters": {
      "orders": {
        "LoadBalancingPolicy": "PowerOfTwoChoices",  // elige 2 al azar, usa el menos cargado
        "HealthCheck": { "Active": { "Enabled": true, "Path": "/health/ready", "Interval": "00:00:10" } },
        "Destinations": {
          "d1": { "Address": "http://orders-api-1:8080/" },
          "d2": { "Address": "http://orders-api-2:8080/" }
        }
      }
    }
  }
}
```

```csharp
// Program.cs del Gateway — dotnet add package Yarp.ReverseProxy
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication().AddJwtBearer();   // Sesión 28: valida el token UNA vez aquí
builder.Services.AddAuthorization(o => o.AddPolicy("customer", p => p.RequireRole("customer")));
builder.Services.AddRateLimiter(o => o.AddPolicy("per-user", ctx =>
    RateLimitPartition.GetTokenBucketLimiter(
        ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
        _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 50, TokensPerPeriod = 10, ReplenishmentPeriod = TimeSpan.FromSeconds(1)
        })));

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapReverseProxy();        // YARP es un endpoint más del pipeline (Sesión 23)
app.Run();
```

> ⚠️ **Confianza cero hacia dentro**: que el gateway valide el JWT no significa que los servicios internos deban aceptar cualquier cosa. Reenvía el token (o uno interno de corta vida) y valida también en cada servicio, o usa mTLS con un service mesh. Si un atacante entra a la red interna, un servicio que "confía en el gateway" es una puerta abierta.

| Opción | Tipo | Cuándo |
|---|---|---|
| **YARP** | Librería .NET, tú escribes el gateway | Equipo .NET, lógica custom en C#, un binario más |
| **Nginx / Envoy / Traefik** | Proxy configurable | Rendimiento extremo, políticas por configuración |
| **AWS API Gateway / Azure APIM** | Servicio gestionado | Monetización, portal de developers, sin operar nada |
| **Service mesh** (Istio, Linkerd) | Sidecar por pod | Tráfico **este-oeste** (servicio↔servicio): mTLS, reintentos, métricas sin tocar código |

> ❓ **Entrevista**: *"¿API Gateway vs service mesh?"* → El gateway gestiona el tráfico **norte-sur** (de fuera hacia dentro); el mesh, el **este-oeste** (entre servicios) con un proxy sidecar junto a cada instancia. No compiten: muchos sistemas usan ambos.

---

## 4. Event-Driven Architecture (EDA)

En EDA los servicios no se *llaman* entre sí: **publican hechos** (`OrderPlaced`) y quien esté interesado **reacciona**. El emisor no sabe quién escucha. Esto invierte la dependencia: Pedidos no depende de Email; Email depende del *evento* de Pedidos.

La mecánica del broker (RabbitMQ exchanges, Kafka particiones y consumer groups, MassTransit, Outbox, consumidores idempotentes, DLQ) la vimos en la **Sesión 34**. Aquí nos centramos en **el diseño**: qué publicar, cómo versionarlo y cómo coordinar procesos de negocio.

### 4.1 Comando vs evento

| | **Comando** | **Evento** |
|---|---|---|
| Nombre | Imperativo: `CapturePayment` | Pasado: `PaymentCaptured` |
| Intención | "Haz esto" | "Esto ya ocurrió" |
| Destinatarios | **Exactamente uno** (cola) | **Cero o muchos** (pub/sub, topic) |
| ¿Se puede rechazar? | Sí | No: es un hecho, solo se reacciona |
| Acoplamiento | El emisor conoce al receptor | El emisor **no** conoce a nadie |

### 4.2 Tres estilos de evento

| Estilo | Qué lleva el evento | Ventaja | Coste |
|---|---|---|---|
| **Event Notification** | Solo el Id: `OrderPlaced { OrderId }` | Pequeño, sin datos sensibles | El consumidor debe volver a llamar (acoplamiento síncrono de vuelta) |
| **Event-Carried State Transfer** | El estado relevante: líneas, total, cliente | El consumidor es **autónomo** (guarda su copia) | Eventos grandes, datos duplicados, cuidado con PII |
| **Event Sourcing** | El evento **es** la fuente de verdad; el estado se reconstruye reproduciéndolos | Auditoría total, "viajar en el tiempo" | Complejidad alta, versionado de eventos eterno |

> ⚠️ **Event Sourcing ≠ EDA**. Puedes tener arquitectura orientada a eventos sin Event Sourcing (lo más común), y Event Sourcing dentro de un solo servicio sin publicar nada. Confundirlos es un clásico de entrevista (igual que confundir CQRS con Event Sourcing, Sesión 26).

### 4.3 Los eventos de integración son un contrato público

```csharp
// OrderFlow.Contracts (paquete NuGet interno, Sesión 21) — SOLO tipos, sin lógica
namespace OrderFlow.Contracts.Orders.V1;

/// <summary>Publicado por Orders cuando un pedido se confirma. Contrato público: no romper.</summary>
public sealed record OrderPlaced
{
    public required Guid EventId { get; init; }            // para idempotencia en el consumidor (Sesión 34)
    public required Guid OrderId { get; init; }
    public required Guid CustomerId { get; init; }
    public required DateTimeOffset OccurredAt { get; init; }
    public required IReadOnlyList<OrderPlacedLine> Lines { get; init; }
    public required decimal Total { get; init; }
    public string Currency { get; init; } = "CLP";         // campo NUEVO con default → cambio compatible
}

public sealed record OrderPlacedLine(string Sku, int Quantity, decimal UnitPrice);
```

Reglas de evolución (iguales a las de versionar una API, Sesión 22):

| Cambio | ¿Compatible? |
|---|---|
| Agregar campo opcional o con default | ✅ (los consumidores viejos lo ignoran) |
| Quitar un campo / renombrarlo / cambiar su tipo | ❌ → publica `V2` en paralelo, migra consumidores, retira `V1` |
| Cambiar el **significado** de un campo | ❌ el peor: compila y rompe en silencio |

> ⚠️ **Nunca publiques tus entidades de dominio ni tus domain events** como eventos de integración. El dominio debe poder cambiar libremente; el contrato no. Traduce en el borde (igual que los DTOs de la Sesión 23). Para Kafka, un **Schema Registry** (Avro/Protobuf) hace que el broker rechace cambios incompatibles.

### 4.4 Lo que EDA te obliga a aceptar

- **Consistencia eventual**: tras `POST /orders` → `202 Accepted`, el pedido estará "Pagado" *en algún momento*. La UI debe mostrar estados intermedios (y SignalR, sección 8, ayuda a notificarlo).
- **At-least-once**: los mensajes llegan **duplicados** → consumidores idempotentes (Sesión 34).
- **Orden**: solo garantizado dentro de una partición/cola. En Kafka, usa `OrderId` como *key* para que todos los eventos de un pedido vayan a la misma partición.
- **Depuración difícil**: sin trazas distribuidas (Sesión 36) no sabrás qué evento desencadenó qué.

---

## 5. Consistencia distribuida: Sagas

Colocar un pedido en OrderFlow implica **tres servicios, tres bases de datos**: reservar stock (Inventory), cobrar (Payments) y confirmar (Orders). No hay `BeginTransaction()` que abarque las tres.

**¿Y el 2PC (two-phase commit)?** Existe (MSDTC, XA), pero bloquea recursos mientras espera al coordinador, reduce la disponibilidad (si un participante no responde, todos esperan) y la mayoría de los brokers y bases NoSQL no lo soportan. En microservicios se considera un anti-patrón.

Una **saga** es una secuencia de **transacciones locales**; cada paso publica un evento/comando que dispara el siguiente, y si un paso falla se ejecutan **transacciones compensatorias** que deshacen *semánticamente* los pasos anteriores.

```
Camino feliz:   T1 Reservar stock ──▶ T2 Cobrar ──▶ T3 Confirmar pedido
Falla en T2:    T1 Reservar stock ──▶ T2 Cobrar ✗ ──▶ C1 Liberar stock ──▶ Rechazar pedido
```

> ⚠️ Compensar **no es un rollback**: el cobro sí ocurrió y quedó registrado; la compensación es un **reembolso** (un hecho nuevo). Y algunas acciones no se pueden compensar (un email enviado): ponlas **al final**, después de la *pivot transaction* (el paso a partir del cual la saga ya no puede fallar).

### 5.1 Coreografía vs orquestación

```
COREOGRAFÍA (cada uno reacciona a eventos)        ORQUESTACIÓN (un director manda comandos)

Orders ──OrderPlaced──▶ Inventory                         ┌─────────────────┐
                           │                     ┌───────▶│ OrderSaga       │◀───────┐
                     StockReserved               │ cmd    │ (state machine) │  evt   │
                           ▼                     │        └──┬──────────┬───┘        │
                        Payments                 │   Reserve │          │ Capture    │
                           │                     │           ▼          ▼            │
                    PaymentCaptured              │      Inventory    Payments ───────┘
                           ▼                     └──────────── eventos de vuelta
                        Orders (confirma)
```

| | **Coreografía** | **Orquestación** |
|---|---|---|
| Control | Distribuido: nadie ve el flujo completo | Centralizado en el orquestador |
| Acoplamiento | Bajo, pero implícito (¿quién escucha qué?) | Los participantes no se conocen entre sí |
| Visibilidad del flujo | Difícil: hay que reconstruirlo con trazas | Explícita: el estado de la saga está en una tabla |
| Riesgo | Dependencias cíclicas, "event spaghetti" | El orquestador puede volverse un "god service" |
| Cuándo | 2-3 pasos, flujos simples | 4+ pasos, compensaciones, timeouts, reglas de negocio |

### 5.2 Una saga orquestada en C# (máquina de estados explícita)

El núcleo de una saga es una **máquina de estados pura**: recibe un evento, cambia de estado y decide el siguiente comando. Sin infraestructura, se testea con xUnit en milisegundos (Sesión 27). El `switch` sobre tuplas de la Sesión 16 encaja perfecto:

```csharp
public enum SagaState { Started, StockReserved, Completed, Compensating, Failed }

public sealed class OrderSaga
{
    public required Guid OrderId { get; init; }
    public SagaState State { get; private set; } = SagaState.Started;
    public string? ReservationId { get; private set; }
    public string? FailureReason { get; private set; }
    public int Version { get; private set; }               // concurrencia optimista al persistir

    /// <summary>Aplica un evento y devuelve el siguiente comando a enviar (o null).</summary>
    public ISagaCommand? Handle(ISagaEvent evt)
    {
        (State, var next) = (State, evt) switch
        {
            (SagaState.Started, StockReserved e)       => (SagaState.StockReserved, (ISagaCommand?)new CapturePayment(OrderId, e.Amount)),
            (SagaState.Started, StockRejected e)       => (SagaState.Failed,        new RejectOrder(OrderId, e.Reason)),
            (SagaState.StockReserved, PaymentCaptured) => (SagaState.Completed,     new ConfirmOrder(OrderId)),
            (SagaState.StockReserved, PaymentFailed)   => (SagaState.Compensating,  new ReleaseStock(OrderId, ReservationId!)),
            (SagaState.Compensating, StockReleased)    => (SagaState.Failed,        new RejectOrder(OrderId, FailureReason ?? "Pago rechazado")),
            _ => (State, null)   // evento duplicado o fuera de orden → se ignora (idempotencia)
        };
        if (evt is StockReserved r) ReservationId = r.ReservationId;
        if (evt is PaymentFailed f) FailureReason = f.Reason;
        Version++;
        return next;
    }
}

public interface ISagaEvent { Guid OrderId { get; } }
public sealed record StockReserved(Guid OrderId, string ReservationId, decimal Amount) : ISagaEvent;
public sealed record StockRejected(Guid OrderId, string Reason) : ISagaEvent;
public sealed record PaymentCaptured(Guid OrderId, string PaymentId) : ISagaEvent;
public sealed record PaymentFailed(Guid OrderId, string Reason) : ISagaEvent;
public sealed record StockReleased(Guid OrderId) : ISagaEvent;

public interface ISagaCommand { Guid OrderId { get; } }
public sealed record CapturePayment(Guid OrderId, decimal Amount) : ISagaCommand;
public sealed record ReleaseStock(Guid OrderId, string ReservationId) : ISagaCommand;
public sealed record ConfirmOrder(Guid OrderId) : ISagaCommand;
public sealed record RejectOrder(Guid OrderId, string Reason) : ISagaCommand;
```

El *host* de la saga (un consumidor del broker) hace siempre lo mismo, **en una transacción local**: cargar la saga → `Handle(evento)` → guardar el nuevo estado **y** el comando en la tabla Outbox (Sesión 34) → commit. Así el cambio de estado y el envío del comando son atómicos.

```csharp
public sealed class OrderSagaConsumer(SagaDbContext db, TimeProvider clock)
{
    public async Task ConsumeAsync(ISagaEvent evt, CancellationToken ct)
    {
        var saga = await db.Sagas.SingleOrDefaultAsync(s => s.OrderId == evt.OrderId, ct)
                   ?? throw new InvalidOperationException($"Saga {evt.OrderId} no existe");

        var command = saga.Handle(evt);
        if (command is not null)
            db.Outbox.Add(OutboxMessage.From(command, clock.GetUtcNow()));   // mismo SaveChanges

        await db.SaveChangesAsync(ct);   // Version como concurrency token → DbUpdateConcurrencyException
    }                                     // si dos instancias procesan eventos de la misma saga a la vez
}
```

> ⚠️ **Timeouts**: ¿qué pasa si Payments nunca responde? Una saga real programa un mensaje diferido (*"si en 10 minutos sigo en StockReserved, compensa"*). **MassTransit** (Sesión 34) trae `MassTransitStateMachine<T>` con estados, eventos, `Schedule` para timeouts y persistencia en EF Core/Redis, y existen motores dedicados (Temporal, Dapr Workflows, AWS Step Functions). Escribirla a mano, como arriba, es para entender el mecanismo y para entrevistas.

> ❓ **Entrevista**: *"¿Cómo garantizas que una saga no deja el sistema inconsistente?"* → (1) Cada paso es una transacción local + Outbox (sin dual write). (2) Consumidores idempotentes: el mismo evento dos veces no avanza dos pasos (la máquina de estados ignora eventos que no corresponden al estado actual). (3) Compensaciones para cada paso reversible, y los irreversibles después de la pivot transaction. (4) Timeouts para participantes que no responden. (5) Aislamiento: como las sagas no tienen la "I" de ACID, se usan **contramedidas** como *semantic lock* (estado `PendingPayment` que impide que otra operación toque el pedido) o releer valores antes de actuar.

---

## 6. gRPC en .NET

**gRPC** es un framework RPC de Google: defines el servicio en un archivo `.proto`, y la herramienta genera cliente y servidor fuertemente tipados. Viaja en **Protobuf** (binario, compacto, rápido de serializar) sobre **HTTP/2** (multiplexación, streaming, Sesión 22).

```protobuf
// Protos/inventory.proto — el CONTRATO; se comparte entre servidor y clientes
syntax = "proto3";
option csharp_namespace = "OrderFlow.Inventory.Grpc";
package inventory.v1;                       // versiona en el package, no en el nombre del mensaje
import "google/protobuf/timestamp.proto";

service InventoryService {
  rpc Reserve (ReserveRequest) returns (ReserveReply);                 // unary
  rpc WatchStock (WatchStockRequest) returns (stream StockChanged);    // server streaming
}

message ReserveRequest {
  string order_id = 1;                       // el NÚMERO es lo que viaja, no el nombre
  repeated ReserveLine lines = 2;            // repeated = lista
}
message ReserveLine { string sku = 1; int32 quantity = 2; }
message ReserveReply {
  string reservation_id = 1;
  google.protobuf.Timestamp expires_at = 2;
}
message WatchStockRequest { string sku = 1; }
message StockChanged { string sku = 1; int32 available = 2; }
```

```xml
<!-- .csproj: Grpc.Tools genera las clases en cada build (no se versiona el código generado) -->
<ItemGroup>
  <Protobuf Include="Protos\inventory.proto" GrpcServices="Server" />   <!-- "Client" en el consumidor -->
  <PackageReference Include="Grpc.AspNetCore" Version="2.*" />
</ItemGroup>
```

> ⚠️ **Evolución del `.proto`**: nunca reutilices ni cambies el **número** de un campo; si lo eliminas, márcalo `reserved 3;`. Agregar campos nuevos es compatible (los clientes viejos los ignoran). En proto3 todos los campos escalares tienen default (`""`, `0`), así que "no enviado" y "vacío" son indistinguibles salvo que uses `optional` o *wrappers*.

### 6.1 Servidor

```csharp
// Program.cs de Inventory
builder.Services.AddGrpc(o => o.EnableDetailedErrors = builder.Environment.IsDevelopment());
app.MapGrpcService<InventoryGrpcService>();

public sealed class InventoryGrpcService(ILogger<InventoryGrpcService> logger)
    : InventoryService.InventoryServiceBase                      // clase base GENERADA
{
    public override Task<ReserveReply> Reserve(ReserveRequest request, ServerCallContext context)
    {
        if (request.Lines.Count == 0)                            // errores = StatusCode de gRPC, no HTTP
            throw new RpcException(new Status(StatusCode.InvalidArgument, "El pedido no tiene líneas"));

        if (request.Lines.Any(l => l.Quantity > 100))
            throw new RpcException(new Status(StatusCode.FailedPrecondition, "Stock insuficiente"));

        logger.LogInformation("Reservando stock para {OrderId}", request.OrderId);
        return Task.FromResult(new ReserveReply
        {
            ReservationId = Guid.NewGuid().ToString(),
            ExpiresAt = Timestamp.FromDateTime(DateTime.UtcNow.AddMinutes(15))   // requiere DateTimeKind.Utc
        });
    }

    public override async Task WatchStock(WatchStockRequest request,
        IServerStreamWriter<StockChanged> responseStream, ServerCallContext context)
    {
        var available = 50;
        // context.CancellationToken se cancela si el cliente se desconecta o vence el deadline
        while (!context.CancellationToken.IsCancellationRequested && available > 0)
        {
            await responseStream.WriteAsync(new StockChanged { Sku = request.Sku, Available = available-- });
            await Task.Delay(TimeSpan.FromSeconds(1), context.CancellationToken);
        }
    }
}
```

### 6.2 Cliente con `IHttpClientFactory`

```csharp
// Program.cs de Orders — dotnet add package Grpc.Net.ClientFactory
builder.Services.AddGrpcClient<InventoryService.InventoryServiceClient>(o =>
    o.Address = new Uri(builder.Configuration["Services:Inventory"]!));   // pooling de conexiones, DI

app.MapPost("/orders/{id:guid}/reserve", async (Guid id,
    InventoryService.InventoryServiceClient inventory, CancellationToken ct) =>
{
    try
    {
        var reply = await inventory.ReserveAsync(
            new ReserveRequest { OrderId = id.ToString(), Lines = { new ReserveLine { Sku = "SKU-1", Quantity = 2 } } },
            deadline: DateTime.UtcNow.AddSeconds(2),       // ⚠️ SIEMPRE un deadline
            cancellationToken: ct);
        return Results.Ok(new { reply.ReservationId, ExpiresAt = reply.ExpiresAt.ToDateTimeOffset() });
    }
    catch (RpcException ex) when (ex.StatusCode == StatusCode.FailedPrecondition)
    {
        return Results.Conflict(ex.Status.Detail);                    // traducir gRPC → HTTP en el borde
    }
    catch (RpcException ex) when (ex.StatusCode == StatusCode.DeadlineExceeded)
    {
        return Results.StatusCode(StatusCodes.Status504GatewayTimeout);
    }
});

// Consumir un server stream: IAsyncEnumerable (Sesión 32)
using var call = inventory.WatchStock(new WatchStockRequest { Sku = "SKU-1" }, cancellationToken: ct);
await foreach (var change in call.ResponseStream.ReadAllAsync(ct))
    Console.WriteLine($"{change.Sku}: {change.Available}");
```

| Tipo de llamada | Firma `.proto` | Ejemplo |
|---|---|---|
| **Unary** | `rpc A(Req) returns (Res)` | Reservar stock |
| **Server streaming** | `returns (stream Res)` | Precios o stock en vivo |
| **Client streaming** | `rpc A(stream Req) returns (Res)` | Subir lecturas de sensores, devolver resumen |
| **Bidireccional** | `stream` en ambos | Chat, sincronización |

> ⚠️ **Deadlines, no timeouts**: el deadline es un **instante absoluto** que se **propaga**: si Orders llama a Inventory con 2 s y este llama a Pricing, Pricing recibe el tiempo restante (con `EnableCallContextPropagation()` en el cliente). Sin deadline, una llamada colgada ocupa una conexión para siempre.

> ⚠️ **Balanceo de carga**: HTTP/2 mantiene **una conexión larga** y multiplexa todo por ella. Un balanceador L4 (TCP) reparte *conexiones*, no *llamadas* → todo el tráfico de un cliente acaba en **una sola instancia**. Soluciones: balanceador L7 que entienda HTTP/2 (Envoy, YARP, ALB con gRPC), service mesh, o balanceo del lado cliente (`GrpcChannelOptions` + `dns:///` resolver con `RoundRobin`).

**gRPC-Web / JSON transcoding**: el navegador no puede controlar tramas HTTP/2, así que gRPC no funciona directamente desde JavaScript. `Grpc.AspNetCore.Web` agrega el protocolo gRPC-Web, y `Microsoft.AspNetCore.Grpc.JsonTranscoding` (.NET 7+) expone el **mismo** servicio también como REST/JSON anotando el `.proto` con `google.api.http`.

> ❓ **Entrevista**: *"¿Por qué gRPC es más rápido que REST/JSON?"* → Tres razones: Protobuf es binario y compacto (sin nombres de campo, varints), su serialización no necesita parsear texto; HTTP/2 multiplexa muchas llamadas por una conexión y comprime headers; y el código generado evita reflection. A cambio: no es legible por humanos, necesita el `.proto` para depurar (grpcurl) y el soporte en navegador es limitado.

---

## 7. GraphQL con Hot Chocolate

**GraphQL** expone **un solo endpoint** con un **schema tipado**; el cliente declara exactamente qué campos quiere, y el servidor resuelve el grafo. Resuelve el *over-fetching* (recibir campos que no usas) y el *under-fetching* (tener que hacer 3 requests para armar una pantalla). Su hábitat natural es el **BFF** o una capa de agregación sobre varios servicios.

```graphql
# Lo que envía el cliente (POST /graphql)
query {
  products {
    name
    price
    reviews { stars text }     # relación: otro resolver, posiblemente otro servicio
  }
}
```

En .NET la librería de referencia es **Hot Chocolate** (ChilliCream). *Code-first*: el schema se deduce de tus clases C#.

```csharp
// dotnet add package HotChocolate.AspNetCore   (ejemplos probados con la versión 14)
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddTypeExtension<ProductExtensions>()
    .AddDataLoader<ReviewsByProductDataLoader>()
    .AddMaxExecutionDepthRule(8)                       // defensa contra queries maliciosamente profundas
    .ModifyRequestOptions(o => o.IncludeExceptionDetails = builder.Environment.IsDevelopment());

app.MapGraphQL();                                      // /graphql + IDE "Nitro" en desarrollo

public sealed class Query
{
    // "GetProducts" → campo "products" del schema
    public IQueryable<Product> GetProducts([Service] ProductRepository repo) => repo.Products;
    public Product? GetProduct(int id, [Service] ProductRepository repo) =>
        repo.Products.FirstOrDefault(p => p.Id == id);
}

[ExtendObjectType<Product>]                            // añade el campo "reviews" al tipo Product
public sealed class ProductExtensions
{
    public async Task<IEnumerable<Review>> GetReviews([Parent] Product product,
        ReviewsByProductDataLoader loader, CancellationToken ct) =>
        await loader.LoadAsync(product.Id, ct) ?? [];
}
```

### 7.1 El problema N+1 y los DataLoaders

Sin cuidado, la query anterior ejecuta **1** consulta de productos + **1 por producto** para las reseñas: el mismo N+1 de EF Core (Sesión 25), pero provocado por el cliente. Un **DataLoader** acumula todas las claves pedidas durante un "tick" de ejecución y hace **una sola** llamada por lotes:

```csharp
public sealed class ReviewsByProductDataLoader(
    ProductRepository repo, IBatchScheduler scheduler, DataLoaderOptions options)
    : GroupedDataLoader<int, Review>(scheduler, options)     // 1 clave → N valores
{
    protected override Task<ILookup<int, Review>> LoadGroupedBatchAsync(
        IReadOnlyList<int> keys, CancellationToken ct) =>
        repo.GetReviewsAsync(keys, ct);                       // WHERE ProductId IN (@keys) — UNA consulta
}
```

```
Sin DataLoader:  SELECT products;  SELECT reviews WHERE id=1;  ...id=2;  ...id=3;   (N+1)
Con DataLoader:  SELECT products;  SELECT reviews WHERE id IN (1,2,3);               (2)
```

> ⚠️ **Seguridad en GraphQL**: el cliente decide la forma de la query, así que puede pedir `products { reviews { product { reviews { ... } } } }` 20 niveles de profundidad y tumbarte. Obligatorio en producción: límite de profundidad, **análisis de coste/complejidad**, paginación con tope, timeouts, desactivar la *introspection* pública si la API no es abierta y, para clientes propios, **persisted queries** (el servidor solo acepta queries registradas por hash).

| | **REST** | **GraphQL** |
|---|---|---|
| Endpoints | Muchos (uno por recurso) | Uno |
| Forma de la respuesta | La decide el servidor | La decide el cliente |
| Caché HTTP | Nativa (GET + ETag, Sesión 22) | Difícil (POST); se cachea en cliente o por persisted query |
| Errores | Status codes | Casi siempre `200` con `errors[]` en el body |
| Versionado | `/v1`, `/v2` | Evolución continua: `@deprecated` en campos |
| Riesgo típico | Over/under-fetching | Queries costosas, N+1 |

**Federation**: con Hot Chocolate *Fusion* (o Apollo Federation) cada microservicio publica su subgrafo y un gateway los compone en un único schema. Potente, pero es otra pieza crítica a operar.

---

## 8. SignalR: tiempo real hacia el usuario

Con EDA el pedido pasa a "Pagado" segundos después del `202`. ¿Cómo se entera el navegador sin hacer polling? **SignalR** abstrae la conexión persistente: negocia **WebSockets**, y si no están disponibles cae a **Server-Sent Events** o **long polling**, con reconexión y serialización incluidas.

```csharp
// Hub fuertemente tipado: el compilador verifica los métodos que invocas en el cliente
public interface IOrderClient
{
    Task OrderStatusChanged(OrderStatusDto status);
}
public sealed record OrderStatusDto(Guid OrderId, string Status, DateTimeOffset At);

[Authorize]
public sealed class OrderHub : Hub<IOrderClient>
{
    // El cliente llama: connection.invoke("Follow", orderId)
    public Task Follow(Guid orderId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"order-{orderId}");
        // ⚠️ en producción: verificar que el pedido pertenece a Context.UserIdentifier

    public override async Task OnConnectedAsync()
    {
        if (Context.UserIdentifier is { } userId)      // viene del claim NameIdentifier del JWT
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        await base.OnConnectedAsync();
    }
}

builder.Services.AddSignalR();
app.MapHub<OrderHub>("/hubs/orders");
```

El hub **no** es donde vive la lógica: los hubs son transitorios (una instancia por invocación). Para empujar mensajes desde fuera —por ejemplo, desde el consumidor del evento `PaymentCaptured`— se inyecta `IHubContext`:

```csharp
public sealed class PaymentCapturedNotifier(IHubContext<OrderHub, IOrderClient> hub)
{
    public Task NotifyAsync(Guid orderId, CancellationToken ct) =>
        hub.Clients.Group($"order-{orderId}")
           .OrderStatusChanged(new OrderStatusDto(orderId, "Paid", DateTimeOffset.UtcNow));
}
```

```
Payments ──PaymentCaptured──▶ [broker] ──▶ Notifications (consumer)
                                                │ IHubContext
                                                ▼
                                   SignalR ══WebSocket══▶ navegador: "¡Pagado!"
```

> ⚠️ **Escalado horizontal**: cada instancia solo conoce **sus** conexiones. Si el usuario está conectado a la instancia A y el evento lo procesa la B, el mensaje se pierde. Soluciones: **backplane** de Redis (`AddStackExchangeRedis()`), que retransmite cada mensaje a todas las instancias, o **Azure SignalR Service**, que saca las conexiones de tus servidores. Además, sin WebSockets (long polling) necesitas **sticky sessions** en el balanceador.

> ⚠️ **Autenticación**: el navegador no puede enviar headers en el handshake de WebSocket, así que el cliente JS manda el JWT en la query string (`?access_token=`). Hay que leerlo en `JwtBearerEvents.OnMessageReceived` **solo** para la ruta `/hubs`, y cuidar que no quede en los logs de acceso.

> ❓ **Entrevista**: *"¿SignalR garantiza la entrega?"* → No. Es *at-most-once*: si el cliente está desconectado, el mensaje se pierde. Por eso SignalR es un **aviso**, no la fuente de verdad: al reconectar, el cliente debe volver a consultar el estado (`GET /orders/{id}`). Para entrega garantizada, persiste las notificaciones o usa un broker.

---

## 9. Otros patrones del kit de microservicios

| Patrón | Problema | Idea |
|---|---|---|
| **Strangler Fig** | Migrar un monolito sin "big bang" | El gateway (YARP) enruta ruta a ruta al servicio nuevo; el monolito se "estrangula" poco a poco |
| **Anti-Corruption Layer** | El sistema legacy tiene un modelo feo | Una capa que traduce entre su modelo y el tuyo (DDD, Sesión 26) |
| **API Composition** | Una pantalla necesita datos de 3 servicios | El BFF llama en paralelo (`Task.WhenAll`) y compone |
| **CQRS read model** | Consultas que cruzan servicios, rápidas | Un servicio consume eventos y mantiene una vista desnormalizada |
| **Circuit Breaker / Bulkhead** | Fallos en cascada | Polly / `AddStandardResilienceHandler` (Sesión 34) |
| **Service Discovery** | Las IPs cambian | DNS de Kubernetes (Sesión 36), Consul, .NET Aspire service discovery |
| **Sidecar** | Lógica transversal en cada servicio | Proceso vecino (Envoy, Dapr) que aporta mTLS, reintentos, pub/sub |

**.NET Aspire** (.NET 8+) merece mención: un `AppHost` en C# que describe los servicios y sus dependencias (Postgres, Redis, RabbitMQ), los levanta en local con service discovery y telemetría ya conectadas, y un dashboard con trazas. Es la forma más rápida de desarrollar OrderFlow multi-servicio en tu máquina (lo retomamos en la Sesión 36).

### 9.1 Checklist senior: errores comunes

1. Partir en servicios por **capas técnicas** (servicio "de datos", servicio "de validación") en vez de por **capacidades de negocio**.
2. Base de datos compartida "temporalmente".
3. Cadenas síncronas largas sin timeouts, deadlines ni circuit breakers.
4. Publicar eventos después de `SaveChanges()` sin Outbox (dual write, Sesión 34).
5. Consumidores no idempotentes.
6. Librería "Common" compartida con lógica de dominio → acoplamiento por paquete (cualquier cambio obliga a desplegar a todos). Compartir **solo contratos**.
7. Sin correlation ID ni trazas distribuidas: imposible depurar (Sesión 36).
8. Servicios demasiado pequeños ("nanoservicios"): más red que lógica.

---

## Resumen mental de la sesión

```
Microservicios = autonomía de DESPLIEGUE por equipo (Conway). Precio: la red.
  Empieza por monolito modular · migra con Strangler Fig · database per service
  ⚠️ monolito distribuido = BD compartida / despliegues coordinados / cadenas síncronas

Comunicación: consultas → síncrono · efectos → asíncrono (sin acoplamiento temporal)
  REST (público) · gRPC (interno, Protobuf+HTTP/2, deadlines, ojo LB L4)
  GraphQL (BFF, cliente elige campos, DataLoader vs N+1, límites de coste)
  SignalR (push al usuario, backplane Redis, at-most-once → reconsulta)
  Mensajería (Sesión 34: broker, Outbox, idempotencia)

Gateway (norte-sur): TLS, JWT, rate limit, routing — SIN negocio · YARP en .NET
BFF: un gateway por tipo de cliente · Mesh (este-oeste): mTLS, retries, sidecar

EDA: comando (imperativo, 1 receptor) vs evento (pasado, N receptores)
  Notification · Event-Carried State Transfer · Event Sourcing (≠ EDA)
  Evento de integración = contrato público: solo añadir campos, V2 en paralelo

Sagas (no 2PC): transacciones locales + compensaciones (≠ rollback)
  Coreografía (simple, implícita) vs Orquestación (state machine explícita)
  Cada paso: tx local + Outbox · idempotente · timeouts · pivot transaction
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Cuál es la motivación real de los microservicios? ¿Qué es la Ley de Conway y qué es un monolito distribuido?
2. ❓ ¿Por qué "database per service"? ¿Cómo resuelves entonces una consulta que necesita datos de dos servicios?
3. ❓ Explica acoplamiento temporal. ¿Cuándo elegirías comunicación síncrona y cuándo asíncrona?
4. ❓ ¿Qué responsabilidades van en un API Gateway y cuáles no? ¿Gateway vs BFF vs service mesh?
5. ❓ Comando vs evento. ¿Qué diferencia hay entre Event Notification, Event-Carried State Transfer y Event Sourcing?
6. ❓ ¿Cómo versionas un evento de integración sin romper a los consumidores?
7. ❓ ¿Por qué no usar 2PC entre microservicios? ¿Qué es una saga y qué es una transacción compensatoria?
8. ❓ Coreografía vs orquestación: ventajas, riesgos y cuándo elegir cada una.
9. ❓ ¿Por qué gRPC es más rápido que REST/JSON? ¿Qué problema de balanceo de carga tiene y cómo lo resuelves?
10. ❓ ¿Qué es un deadline en gRPC y por qué se propaga?
11. ❓ ¿Qué es el problema N+1 en GraphQL y cómo lo resuelve un DataLoader? ¿Cómo proteges un endpoint GraphQL?
12. ❓ ¿Cómo escalas SignalR a varias instancias? ¿Garantiza la entrega de mensajes?

## Ejercicio práctico
Parte OrderFlow (capstone de la Sesión 32) en servicios, reutilizando el broker y el Outbox de la Sesión 34:

1. Crea la solución con 5 proyectos ejecutables: `OrderFlow.Gateway` (YARP), `OrderFlow.Orders`, `OrderFlow.Inventory`, `OrderFlow.Payments`, `OrderFlow.Notifications`, más `OrderFlow.Contracts` (solo records de eventos/comandos y los `.proto`). Cada servicio con **su propia base** (bases distintas en el mismo Postgres de Docker está bien para empezar).
2. **Gateway**: enruta `/api/orders/**` y `/api/catalog/**`, valida el JWT y aplica rate limiting por usuario. Verifica que un token inválido nunca llega a Orders.
3. **gRPC**: expón `InventoryService.Reserve` con el `.proto` de la sección 6. Orders lo llama con deadline de 2 s; traduce `FailedPrecondition` → `409` y `DeadlineExceeded` → `504`. Simula un Inventory lento (`Task.Delay`) y observa el 504.
4. **Saga orquestada**: implementa `OrderSaga` (sección 5.2) en Orders, persistida con EF Core, `Version` como concurrency token, y comandos por Outbox. Escribe tests xUnit de la máquina de estados: camino feliz, pago rechazado (debe emitir `ReleaseStock`) y evento duplicado (no debe avanzar).
5. Añade un **timeout**: si una saga sigue en `StockReserved` tras 5 minutos, un `BackgroundService` la compensa.
6. **SignalR**: en Notifications, un `OrderHub` tipado; al consumir `PaymentCaptured` u `OrderRejected`, notifica al grupo `order-{id}`. Haz una página HTML mínima con `@microsoft/signalr` que muestre el cambio de estado en vivo.
7. **GraphQL** (opcional): un BFF con Hot Chocolate que exponga `order(id) { status lines { sku } customer { name } }` componiendo Orders y un servicio de clientes; usa un DataLoader y verifica en los logs que solo hay una llamada por lote.
8. Escribe en el README del repo un **diagrama de flechas** indicando para cada una si es síncrona o asíncrona y **por qué**. Esa explicación es exactamente lo que te pedirán en un *system design*.

---

➡️ **Cuando termines**, marca la Sesión 35 en el [README](Readme.md) y pídeme la **Sesión 36 — Docker, CI/CD y observabilidad (Dockerfile .NET, GitHub Actions, Kubernetes, OpenTelemetry, Serilog)**.
