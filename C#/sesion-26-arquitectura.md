# Sesión 26 — Arquitectura: Clean Architecture, CQRS, DDD y Repository/Unit of Work

> **Objetivo de la sesión**: entender *por qué* existen las arquitecturas por capas y qué problema resuelven (acoplamiento, testabilidad, cambio), saber explicar y dibujar **Clean Architecture**, aplicar los bloques tácticos de **DDD** (entidades, value objects, agregados, eventos de dominio), separar lecturas de escrituras con **CQRS** (con y sin MediatR), y tener una opinión fundamentada sobre **Repository/Unit of Work** encima de EF Core. Al terminar deberías poder montar una solución .NET 8 con capas `Domain / Application / Infrastructure / Api` y defender cada decisión en una entrevista de nivel senior.

---

## 1. ¿Por qué hablar de arquitectura?

Hasta la Sesión 25 construiste piezas: un API con ASP.NET Core (Sesión 23), inyección de dependencias (Sesión 24) y persistencia con EF Core (Sesión 25). Si lo pones todo en el controller, funciona... hasta que:

- La lógica de negocio se **duplica** entre endpoints, jobs y consumidores de colas.
- No puedes testear una regla sin levantar una base de datos (Sesión 27).
- Cambiar de SQL Server a PostgreSQL, o de REST a gRPC, obliga a tocar reglas de negocio.
- Nadie sabe *dónde* va un cambio nuevo.

La arquitectura es, en esencia, **gestionar dependencias**: decidir *quién conoce a quién*. El objetivo no es "tener capas", sino que **lo que cambia por razones distintas viva en lugares distintos** (Single Responsibility a nivel de sistema) y que **lo más estable (el negocio) no dependa de lo más volátil (frameworks, BD, UI)**.

| Síntoma de mala arquitectura | Causa típica |
|---|---|
| "Para testear esto necesito SQL Server" | El dominio depende directamente de la infraestructura |
| Controllers de 800 líneas | Lógica de aplicación y de dominio mezcladas con HTTP |
| Entidades anémicas con solo getters/setters públicos | Las reglas viven en "servicios" dispersos |
| Cambiar un campo toca 9 archivos | Acoplamiento excesivo o capas "pasamanos" sin valor |

> ⚠️ El extremo opuesto también es un problema: **sobre-ingeniería**. Un CRUD interno de 5 tablas no necesita DDD + CQRS + Event Sourcing. La arquitectura se elige por la **complejidad del dominio**, no por moda.

---

## 2. De N-Capas a Clean Architecture

### 2.1 La arquitectura en N-capas clásica

```
   ┌──────────────┐
   │ Presentación │   (Controllers)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │   Negocio    │   (Services)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Acceso Datos │   (DAL, EF Core)
   └──────┬───────┘
          ▼
        [ BD ]
```

El problema: las dependencias apuntan **hacia la base de datos**. El negocio *depende* del acceso a datos, así que el corazón del sistema queda atado a un detalle técnico.

### 2.2 La inversión: Clean / Onion / Hexagonal

Clean Architecture (Robert C. Martin), Onion (Jeffrey Palermo) y Hexagonal / Ports & Adapters (Alistair Cockburn) comparten **una sola regla**:

> **Regla de dependencia**: las dependencias del código fuente solo pueden apuntar **hacia adentro**, hacia las políticas de más alto nivel. Nada en un círculo interior puede saber algo de un círculo exterior.

```
   ┌─────────────────────────────────────────────┐
   │  Infrastructure / Api  (frameworks, BD, UI) │
   │   ┌─────────────────────────────────────┐   │
   │   │   Application (casos de uso)        │   │
   │   │   ┌─────────────────────────────┐   │   │
   │   │   │   Domain (entidades, reglas)│   │   │
   │   │   └─────────────────────────────┘   │   │
   │   └─────────────────────────────────────┘   │
   └─────────────────────────────────────────────┘
          las flechas de dependencia → hacia el centro
```

¿Cómo hace Application para guardar en BD si no puede conocer EF Core? Con el **Principio de Inversión de Dependencias (DIP)**: Application define una **interfaz** (un *puerto*) y Infrastructure la **implementa** (un *adaptador*). El contenedor de DI (Sesión 24) los une en runtime.

```
 Application                     Infrastructure
 ───────────                     ──────────────
 IOrderRepository  ◀─implementa─ EfOrderRepository
 (interfaz, puerto)              (clase, adaptador, usa DbContext)
```

| Estilo | Metáfora | Énfasis |
|---|---|---|
| **N-Capas** | Pila | Separación horizontal, dependencias hacia abajo (a la BD) |
| **Hexagonal** | Hexágono con puertos | Dentro vs fuera; adaptadores primarios (driving) y secundarios (driven) |
| **Onion** | Cebolla | Dominio en el centro, servicios de dominio, luego aplicación |
| **Clean** | Círculos concéntricos | Entidades → Casos de uso → Adaptadores → Frameworks |

> ❓ **Entrevista**: *"¿Qué diferencia hay entre Clean, Onion y Hexagonal?"* → Son variaciones de la misma idea: **el dominio en el centro y las dependencias apuntando hacia adentro**, logrado con inversión de dependencias. Cambian el vocabulario y cuántos anillos dibujan, no el principio.

---

## 3. Estructura de solución en .NET 8

```
src/
├── Tienda.Domain/          ← sin dependencias NuGet (salvo quizá nada)
│   ├── Orders/Order.cs, OrderLine.cs, OrderStatus.cs
│   ├── Common/Entity.cs, IDomainEvent.cs, Money.cs
│   └── Orders/Events/OrderPlaced.cs
├── Tienda.Application/     ← referencia Domain
│   ├── Abstractions/IOrderRepository.cs, IUnitOfWork.cs, IClock.cs
│   └── Orders/PlaceOrder/PlaceOrderCommand.cs, PlaceOrderHandler.cs
├── Tienda.Infrastructure/  ← referencia Application (+ EF Core, Redis, etc.)
│   ├── Persistence/AppDbContext.cs, Configurations/
│   └── Persistence/Repositories/OrderRepository.cs
└── Tienda.Api/             ← referencia Application + Infrastructure (composition root)
    └── Program.cs, Endpoints/
tests/
├── Tienda.Domain.Tests/
├── Tienda.Application.Tests/
└── Tienda.Api.IntegrationTests/
```

```bash
dotnet new sln -n Tienda
dotnet new classlib -o src/Tienda.Domain
dotnet new classlib -o src/Tienda.Application
dotnet new classlib -o src/Tienda.Infrastructure
dotnet new webapi   -o src/Tienda.Api
dotnet sln add src/**/*.csproj

# Las referencias SON la arquitectura: el compilador impide violar la regla de dependencia
dotnet add src/Tienda.Application    reference src/Tienda.Domain
dotnet add src/Tienda.Infrastructure reference src/Tienda.Application
dotnet add src/Tienda.Api            reference src/Tienda.Application src/Tienda.Infrastructure
```

> ⚠️ La **Api** referencia a Infrastructure *solo* para registrar servicios en el contenedor (es el **composition root**). Los controllers/endpoints no deberían usar `AppDbContext` directamente si eliges esta arquitectura.

> 💡 Para *garantizar* la regla en CI, usa tests de arquitectura con **NetArchTest** o **ArchUnitNET**: "Domain no debe depender de Microsoft.EntityFrameworkCore". Lo retomamos en la Sesión 27.

---

## 4. DDD táctico: modelar el dominio

**Domain-Driven Design** (Eric Evans, 2003) tiene dos mitades:

- **DDD estratégico**: *Ubiquitous Language* (lenguaje común con negocio), **Bounded Contexts** (fronteras donde un modelo es válido), Context Maps. Es la parte más valiosa y la que más se olvida.
- **DDD táctico**: los bloques de código — Entities, Value Objects, Aggregates, Domain Events, Domain Services, Repositories.

### 4.1 Entity vs Value Object

| | **Entity** | **Value Object** |
|---|---|---|
| Identidad | Tiene **Id**; dos entidades con mismos datos pero distinto Id son distintas | **Sin identidad**; igualdad por **valor** |
| Mutabilidad | Puede cambiar de estado a lo largo del tiempo | **Inmutable** |
| Ejemplo | `Order`, `Customer` | `Money`, `Email`, `Address`, `DateRange` |
| En C# | `class` con Id | `record` / `readonly record struct` (Sesión 17) |

```csharp
// Tienda.Domain/Common/Money.cs
namespace Tienda.Domain.Common;

// Value Object: igualdad por valor gratis gracias a record (Sesión 17)
public sealed record Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        // Las invariantes se validan en el constructor: un Money inválido NO puede existir
        if (amount < 0) throw new DomainException("El monto no puede ser negativo.");
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
            throw new DomainException("Moneda ISO-4217 inválida.");
        Amount = amount;
        Currency = currency.ToUpperInvariant();
    }

    public static Money Zero(string currency) => new(0, currency);

    public Money Add(Money other)
    {
        if (other.Currency != Currency)
            throw new DomainException("No se pueden sumar monedas distintas.");
        return new Money(Amount + other.Amount, Currency); // devuelve NUEVO objeto
    }

    public Money Multiply(int qty) => new(Amount * qty, Currency);
}

public sealed class DomainException(string message) : Exception(message);
```

> 💡 **Primitive obsession**: usar `decimal` y `string` sueltos para dinero, emails o ids es fuente de bugs (`Transfer(toId, fromId)` intercambiados compila sin error). Los Value Objects y los *strongly typed IDs* (`readonly record struct OrderId(Guid Value)`) hacen que el compilador trabaje por ti.

### 4.2 Entidad rica vs modelo anémico

```csharp
// ❌ Modelo anémico: la entidad es una bolsa de datos, cualquiera puede romperla
public class OrderAnemic
{
    public Guid Id { get; set; }
    public string Status { get; set; } = "";
    public List<OrderLineAnemic> Lines { get; set; } = new();
    public decimal Total { get; set; } // ¿quién garantiza que coincide con las líneas?
}
public class OrderLineAnemic { public decimal Price { get; set; } public int Qty { get; set; } }
```

En el modelo anémico las reglas viven en `OrderService`, y nada impide que otro código haga `order.Status = "Shipped"` sin pagar. Martin Fowler lo llama un **anti-patrón** cuando el dominio es complejo.

### 4.3 Aggregate y Aggregate Root

Un **Aggregate** es un grupo de objetos que se trata como **una unidad de consistencia**. Tiene una **raíz** (Aggregate Root) que es la *única* puerta de entrada: el exterior solo guarda referencias a la raíz, y toda modificación pasa por sus métodos, que protegen las **invariantes**.

```
   ┌──────────── Aggregate "Order" ────────────┐
   │   Order (ROOT)  ── invariante:            │
   │     │              Total = Σ líneas       │
   │     ├── OrderLine  no se modifica fuera   │
   │     └── OrderLine                         │
   └───────────────────────────────────────────┘
        Customer ──(solo CustomerId)──▶ otro aggregate
```

Reglas de oro de Vaughn Vernon:
1. Modela **invariantes verdaderas** dentro del aggregate.
2. Diseña aggregates **pequeños**.
3. Referencia otros aggregates **por Id**, no por navegación de objetos.
4. **Una transacción = un aggregate**. Entre aggregates, consistencia **eventual** (eventos de dominio).

```csharp
// Tienda.Domain/Common/Entity.cs
namespace Tienda.Domain.Common;

public interface IDomainEvent { DateTime OccurredOnUtc { get; } }

public abstract class AggregateRoot<TId>
{
    private readonly List<IDomainEvent> _domainEvents = new();
    public TId Id { get; protected init; } = default!;

    // Solo lectura hacia afuera: se "recolectan" al guardar
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    protected void Raise(IDomainEvent e) => _domainEvents.Add(e);
    public void ClearDomainEvents() => _domainEvents.Clear();
}
```

```csharp
// Tienda.Domain/Orders/Order.cs
using Tienda.Domain.Common;
namespace Tienda.Domain.Orders;

public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
}

public enum OrderStatus { Draft, Placed, Paid, Shipped, Cancelled }

public sealed record OrderPlaced(OrderId OrderId, Guid CustomerId, Money Total, DateTime OccurredOnUtc)
    : IDomainEvent;

public sealed class Order : AggregateRoot<OrderId>
{
    private readonly List<OrderLine> _lines = new();

    public Guid CustomerId { get; private set; }         // otro aggregate → solo Id
    public OrderStatus Status { get; private set; }
    public string Currency { get; private set; } = default!;
    public IReadOnlyList<OrderLine> Lines => _lines;      // nadie puede hacer Lines.Add desde fuera

    // Propiedad derivada: la invariante "Total = Σ líneas" es imposible de romper
    public Money Total => _lines.Aggregate(Money.Zero(Currency), (acc, l) => acc.Add(l.Subtotal));

    private Order() { } // requerido por EF Core (materialización)

    // Factory method: el único modo de crear un Order válido
    public static Order Create(Guid customerId, string currency)
    {
        if (customerId == Guid.Empty) throw new DomainException("Cliente requerido.");
        return new Order { Id = OrderId.New(), CustomerId = customerId, Currency = currency, Status = OrderStatus.Draft };
    }

    public void AddLine(Guid productId, Money unitPrice, int quantity)
    {
        EnsureStatus(OrderStatus.Draft);
        if (quantity <= 0) throw new DomainException("Cantidad debe ser > 0.");
        if (unitPrice.Currency != Currency) throw new DomainException("Moneda inconsistente.");

        var existing = _lines.FirstOrDefault(l => l.ProductId == productId);
        if (existing is not null) existing.Increase(quantity);   // regla: no duplicar productos
        else _lines.Add(new OrderLine(productId, unitPrice, quantity));
    }

    public void Place(DateTime nowUtc)
    {
        EnsureStatus(OrderStatus.Draft);
        if (_lines.Count == 0) throw new DomainException("No se puede confirmar un pedido vacío.");
        Status = OrderStatus.Placed;
        Raise(new OrderPlaced(Id, CustomerId, Total, nowUtc)); // "algo importante pasó"
    }

    public void Cancel()
    {
        if (Status is OrderStatus.Shipped) throw new DomainException("Ya fue despachado.");
        Status = OrderStatus.Cancelled;
    }

    private void EnsureStatus(OrderStatus expected)
    {
        if (Status != expected) throw new DomainException($"Estado inválido: {Status}, se esperaba {expected}.");
    }
}

public sealed class OrderLine
{
    public Guid ProductId { get; private set; }
    public Money UnitPrice { get; private set; } = default!;
    public int Quantity { get; private set; }
    public Money Subtotal => UnitPrice.Multiply(Quantity);

    private OrderLine() { } // EF Core
    internal OrderLine(Guid productId, Money unitPrice, int qty) // internal: solo Order la crea
        => (ProductId, UnitPrice, Quantity) = (productId, unitPrice, qty);

    internal void Increase(int qty) => Quantity += qty;
}
```

Observa: **cero** `using Microsoft.EntityFrameworkCore`. El dominio es C# puro y se testea en milisegundos.

> ❓ **Entrevista**: *"¿Qué es un Aggregate Root y por qué solo se modifica a través de él?"* → Es la entidad raíz de un grupo que forma una frontera de consistencia. Centralizar las modificaciones en ella garantiza que las **invariantes** del grupo se cumplan siempre, y define la unidad de persistencia y de transacción.

### 4.4 Domain Events

Un **evento de dominio** expresa algo que *ya ocurrió* en el negocio (`OrderPlaced`, en pasado). Sirven para desacoplar efectos secundarios (enviar email, reservar stock en otro aggregate) del caso de uso principal.

| | **Domain Event** | **Integration Event** |
|---|---|---|
| Alcance | Dentro del mismo bounded context / proceso | Entre servicios / bounded contexts |
| Transporte | En memoria (MediatR, dispatcher propio) | Broker (RabbitMQ, SQS, Kafka) |
| Consistencia | Normalmente misma transacción o justo después | Eventual |
| Riesgo | Bajo | "Dual write": guardar en BD y publicar pueden fallar por separado → **Outbox Pattern** |

> ⚠️ **Dual write**: si haces `SaveChanges()` y luego `bus.Publish()`, y el proceso muere entre ambos, pierdes el mensaje. El **Transactional Outbox** guarda el mensaje en una tabla `OutboxMessages` *en la misma transacción* y un proceso en background lo publica después (at-least-once → consumidores **idempotentes**).

### 4.5 Domain Service

Cuando una regla no pertenece naturalmente a una sola entidad (p. ej. calcular un descuento que depende de `Customer` y `Order`), se modela como **Domain Service**: una clase sin estado, en la capa Domain, que opera sobre varios objetos de dominio. No confundir con *Application Service* (orquesta casos de uso, maneja transacciones, llama repositorios).

---

## 5. La capa Application: casos de uso

Application **orquesta**: carga aggregates, invoca métodos de dominio, persiste, y devuelve DTOs. **No contiene reglas de negocio** (esas están en Domain) ni detalles técnicos (esos están en Infrastructure).

```csharp
// Tienda.Application/Abstractions/Abstractions.cs
using Tienda.Domain.Orders;
namespace Tienda.Application.Abstractions;

public interface IOrderRepository            // PUERTO: definido por quien lo necesita
{
    Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct);
    void Add(Order order);
}

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct);
}

public interface IClock { DateTime UtcNow { get; } } // abstraer el tiempo = tests deterministas (Sesión 27)
```

### 5.1 Resultado explícito en vez de excepciones para flujo esperado

Recuerda la Sesión 12: las excepciones son para lo **excepcional**. Un "producto no encontrado" es un resultado esperado. Un tipo `Result` lo hace explícito:

```csharp
namespace Tienda.Application.Common;

public sealed record Error(string Code, string Message)
{
    public static readonly Error None = new("", "");
}

public class Result
{
    public bool IsSuccess { get; }
    public Error Error { get; }
    protected Result(bool ok, Error error) => (IsSuccess, Error) = (ok, error);
    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error e) => new(false, e);
}

public sealed class Result<T> : Result
{
    private readonly T? _value;
    private Result(T value) : base(true, Error.None) => _value = value;
    private Result(Error e) : base(false, e) { }
    public T Value => IsSuccess ? _value! : throw new InvalidOperationException("Result fallido.");
    public static Result<T> Ok(T v) => new(v);
    public static new Result<T> Failure(Error e) => new(e);
}
```

> ⚠️ No conviertas *todo* en `Result`. Las violaciones de invariantes de dominio (bugs, datos corruptos) siguen siendo excepciones; `Result` es para fallos **de negocio esperables** que el llamador debe manejar.

---

## 6. CQRS: separar comandos de consultas

### 6.1 De CQS a CQRS

- **CQS** (Bertrand Meyer): un *método* o bien cambia estado (**command**, devuelve `void`) o bien devuelve datos (**query**, sin efectos secundarios). Nunca ambos.
- **CQRS** (Greg Young): lleva esa idea al nivel de **arquitectura**: modelos distintos para **escribir** y para **leer**.

```
                  ┌──────────── WRITE SIDE ────────────┐
  POST /orders ─▶ │ Command → Handler → Aggregate → EF │ ─▶ BD
                  └────────────────────────────────────┘
                  ┌──────────── READ SIDE ─────────────┐
  GET /orders  ─▶ │ Query → Handler → SQL/Dapper → DTO │ ◀─ BD (o réplica / vista / Elastic)
                  └────────────────────────────────────┘
```

¿Por qué? Las escrituras necesitan **reglas e invariantes** (aggregates ricos). Las lecturas necesitan **velocidad y forma** a la medida de la pantalla (proyecciones planas, joins, sin tracking). Forzar el mismo modelo para ambos genera aggregates llenos de navegaciones solo para mostrar datos, o queries lentas.

| Nivel de CQRS | Qué implica | Cuándo |
|---|---|---|
| **1. Lógico** | Clases Command/Query separadas, misma BD, mismo DbContext | Casi siempre vale la pena |
| **2. Modelos distintos** | Escritura con EF + aggregates; lectura con Dapper/proyecciones `AsNoTracking` | Dominio con lecturas complejas |
| **3. Almacenes distintos** | BD de escritura + read store (réplica, Elastic, Redis) sincronizado por eventos | Alta escala, lecturas >> escrituras; asumes **consistencia eventual** |

> ❓ **Entrevista**: *"¿CQRS implica Event Sourcing?"* → **No**. Son independientes. Event Sourcing (guardar la secuencia de eventos en lugar del estado actual) combina bien con CQRS, pero puedes hacer CQRS con una sola BD relacional y nada de eventos.

### 6.2 CQRS sin librerías (handlers explícitos)

```csharp
// Tienda.Application/Orders/PlaceOrder/PlaceOrder.cs
using Tienda.Application.Abstractions;
using Tienda.Application.Common;
using Tienda.Domain.Common;
using Tienda.Domain.Orders;

namespace Tienda.Application.Orders.PlaceOrder;

public sealed record PlaceOrderCommand(Guid CustomerId, string Currency, IReadOnlyList<PlaceOrderLine> Lines);
public sealed record PlaceOrderLine(Guid ProductId, decimal UnitPrice, int Quantity);

public sealed class PlaceOrderHandler(IOrderRepository orders, IUnitOfWork uow, IClock clock)
{
    public async Task<Result<Guid>> Handle(PlaceOrderCommand cmd, CancellationToken ct)
    {
        if (cmd.Lines.Count == 0)
            return Result<Guid>.Failure(new Error("Order.Empty", "El pedido no tiene líneas."));

        var order = Order.Create(cmd.CustomerId, cmd.Currency);          // dominio decide
        foreach (var l in cmd.Lines)
            order.AddLine(l.ProductId, new Money(l.UnitPrice, cmd.Currency), l.Quantity);
        order.Place(clock.UtcNow);

        orders.Add(order);
        await uow.SaveChangesAsync(ct);                                   // UNA transacción
        return Result<Guid>.Ok(order.Id.Value);
    }
}
```

### 6.3 CQRS con MediatR (pipeline behaviors)

**MediatR** implementa el patrón *Mediator*: el controller envía un mensaje y no conoce al handler. Su gran valor real son los **pipeline behaviors**: middleware para casos de uso (logging, validación, transacciones, métricas) aplicado de forma transversal.

> ⚠️ Desde 2025, MediatR (v13+) cambió a **licencia comercial** para empresas por encima de cierto tamaño. Alternativas: la versión 12.x (Apache 2.0), **Mediator** (source generator, martinothamar), **Wolverine**, o simplemente handlers inyectados como en 6.2. En una entrevista, mencionarlo muestra que estás al día.

```csharp
// dotnet add package MediatR --version 12.4.1
// dotnet add package FluentValidation.DependencyInjectionExtensions
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

public sealed record GetOrderQuery(Guid OrderId) : IRequest<OrderDto?>;
public sealed record OrderDto(Guid Id, string Status, decimal Total, string Currency);

// Query handler: lado de LECTURA, proyección directa, sin aggregate ni tracking
public sealed class GetOrderHandler(IOrderReadDb db) : IRequestHandler<GetOrderQuery, OrderDto?>
{
    public Task<OrderDto?> Handle(GetOrderQuery q, CancellationToken ct) => db.GetOrderDtoAsync(q.OrderId, ct);
}
public interface IOrderReadDb { Task<OrderDto?> GetOrderDtoAsync(Guid id, CancellationToken ct); }

// Pipeline behavior: validación transversal para TODOS los requests que tengan validators
public sealed class ValidationBehavior<TReq, TRes>(IEnumerable<IValidator<TReq>> validators)
    : IPipelineBehavior<TReq, TRes> where TReq : notnull
{
    public async Task<TRes> Handle(TReq request, RequestHandlerDelegate<TRes> next, CancellationToken ct)
    {
        if (!validators.Any()) return await next();
        var ctx = new ValidationContext<TReq>(request);
        var failures = (await Task.WhenAll(validators.Select(v => v.ValidateAsync(ctx, ct))))
                       .SelectMany(r => r.Errors).Where(f => f is not null).ToList();
        if (failures.Count > 0) throw new ValidationException(failures);
        return await next();                        // ← como app.Use(next) en middleware (Sesión 23)
    }
}

public sealed class LoggingBehavior<TReq, TRes>(ILogger<LoggingBehavior<TReq, TRes>> log)
    : IPipelineBehavior<TReq, TRes> where TReq : notnull
{
    public async Task<TRes> Handle(TReq request, RequestHandlerDelegate<TRes> next, CancellationToken ct)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try { return await next(); }
        finally { log.LogInformation("{Request} en {Ms} ms", typeof(TReq).Name, sw.ElapsedMilliseconds); }
    }
}
```

```
 Request ─▶ LoggingBehavior ─▶ ValidationBehavior ─▶ TransactionBehavior ─▶ Handler
         ◀──────────────────── respuesta recorre el camino inverso ◀──────────────
```

Registro en el composition root:

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(PlaceOrderHandler).Assembly);
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));     // orden = orden de ejecución
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});
builder.Services.AddValidatorsFromAssembly(typeof(PlaceOrderHandler).Assembly);

app.MapGet("/orders/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
    await sender.Send(new GetOrderQuery(id), ct) is { } dto ? Results.Ok(dto) : Results.NotFound());
```

> ❓ **Entrevista**: *"¿Qué aporta MediatR? ¿Lo usarías siempre?"* → Desacopla el emisor del handler y, sobre todo, permite **cross-cutting concerns** vía pipeline behaviors. Contras: indirección (el "Go to definition" no te lleva al handler), un poco de overhead, y la licencia. No es obligatorio para hacer CQRS.

---

## 7. Repository y Unit of Work sobre EF Core

### 7.1 Definiciones

- **Repository** (Fowler, PoEAA): *"media entre el dominio y la capa de mapeo de datos, actuando como una colección de objetos de dominio en memoria"*.
- **Unit of Work**: *"mantiene una lista de objetos afectados por una transacción de negocio y coordina la escritura de cambios"*.

La observación clave de la Sesión 25: **`DbContext` YA ES un Unit of Work y `DbSet<T>` YA ES un Repository**. `DbContext` hace change tracking y `SaveChanges()` persiste todo en una transacción.

### 7.2 El gran debate

| Postura | Argumento a favor | Argumento en contra |
|---|---|---|
| **No envolver EF** (usar `DbContext` en handlers) | Menos código; LINQ completo; `Include`, proyecciones y `AsNoTracking` sin fricción | Application depende de EF Core; más difícil de sustituir en unit tests |
| **Repositorio genérico** `IRepository<T>` con `GetAll/Add/Update/Delete` | Parece "limpio" | ⚠️ **Anti-patrón** frecuente: re-expone EF peor, fuga `IQueryable`, métodos que no significan nada en el dominio |
| **Repositorio por Aggregate** (`IOrderRepository`) con métodos de dominio | Respeta DDD (un repo por aggregate root), Application no conoce EF, intención explícita | Más código; hay que resistir la tentación de agregar 40 métodos de consulta (para eso está el lado *query* de CQRS) |

**Postura senior recomendada**: repositorios **por aggregate root**, solo para el **lado de escritura**, con pocos métodos (`GetByIdAsync`, `Add`, tal vez `Remove`). Las lecturas van por query handlers con proyecciones directas (EF `AsNoTracking().Select(...)` o Dapper).

> ⚠️ **Nunca** devuelvas `IQueryable<T>` desde un repositorio: filtras detalles de EF hacia afuera (evaluación diferida, `DbContext` que puede estar disposed, queries que no se traducen a SQL) y el repositorio deja de ser una abstracción.

### 7.3 Implementación en Infrastructure

```csharp
// Tienda.Infrastructure/Persistence/AppDbContext.cs
using MediatR;
using Microsoft.EntityFrameworkCore;
using Tienda.Application.Abstractions;
using Tienda.Domain.Common;
using Tienda.Domain.Orders;

namespace Tienda.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, IPublisher publisher)
    : DbContext(options), IUnitOfWork
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Order>(o =>
        {
            o.HasKey(x => x.Id);
            o.Property(x => x.Id).HasConversion(id => id.Value, v => new OrderId(v)); // strongly typed id
            o.Property(x => x.Status).HasConversion<string>();
            o.Ignore(x => x.Total);          // derivado, no se persiste
            o.Ignore(x => x.DomainEvents);
            o.OwnsMany(x => x.Lines, l =>    // OrderLine es parte del aggregate: owned type
            {
                l.WithOwner().HasForeignKey("OrderId");
                l.Property<int>("Id");
                l.HasKey("Id");
                l.OwnsOne(x => x.UnitPrice, m =>
                {
                    m.Property(p => p.Amount).HasColumnName("UnitPrice").HasPrecision(18, 2);
                    m.Property(p => p.Currency).HasColumnName("Currency").HasMaxLength(3);
                });
            });
            // EF accede al backing field _lines en vez de la propiedad de solo lectura
            o.Navigation(x => x.Lines).UsePropertyAccessMode(PropertyAccessMode.Field);
        });
    }

    // Despacho de domain events DESPUÉS de persistir (una opción; otra es antes, dentro de la tx)
    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var aggregates = ChangeTracker.Entries<AggregateRoot<OrderId>>()
            .Select(e => e.Entity).Where(a => a.DomainEvents.Count > 0).ToList();
        var events = aggregates.SelectMany(a => a.DomainEvents).ToList();
        aggregates.ForEach(a => a.ClearDomainEvents());

        var result = await base.SaveChangesAsync(ct);
        foreach (var e in events) await publisher.Publish(e, ct); // requiere que IDomainEvent : INotification
        return result;
    }
}

// Tienda.Infrastructure/Persistence/Repositories/OrderRepository.cs
public sealed class OrderRepository(AppDbContext db) : IOrderRepository
{
    public Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct) =>
        db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct); // owned types se cargan automáticamente

    public void Add(Order order) => db.Orders.Add(order);  // no guarda: eso es tarea del UoW
}
```

```csharp
// Tienda.Infrastructure/DependencyInjection.cs — cada capa expone su registro
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection s, IConfiguration cfg)
    {
        s.AddDbContext<AppDbContext>(o => o.UseNpgsql(cfg.GetConnectionString("Db")));
        s.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AppDbContext>()); // MISMA instancia scoped
        s.AddScoped<IOrderRepository, OrderRepository>();
        s.AddSingleton<IClock, SystemClock>();
        return s;
    }
}
public sealed class SystemClock : IClock { public DateTime UtcNow => DateTime.UtcNow; }
```

> ⚠️ **Lifetime crítico** (Sesión 24): `IUnitOfWork` y los repositorios deben ser **Scoped** y resolver el **mismo** `AppDbContext` del request. Si registras `IUnitOfWork` con `AddScoped<IUnitOfWork, AppDbContext>()` obtienes una *segunda* instancia de DbContext distinta de la que usa el repositorio → `SaveChanges` no guarda nada.

> ⚠️ Para que el snippet compile, `IDomainEvent` tendría que heredar de `MediatR.INotification`, lo cual haría que Domain dependa de MediatR. Alternativa purista: un `IDomainEventDispatcher` propio definido en Application e implementado en Infrastructure.

> ❓ **Entrevista**: *"¿Usarías Repository sobre EF Core?"* → Depende. `DbContext` ya es UoW y `DbSet` ya es repositorio. Evito el repositorio genérico; si hay dominio rico, uso un repositorio **por aggregate root** para el lado de escritura, y consultas directas para lecturas (CQRS). Si es un CRUD simple, uso `DbContext` directo y no me avergüenzo.

---

## 8. Vertical Slice Architecture: la alternativa

Clean Architecture organiza por **capa técnica** (todos los handlers juntos, todos los repos juntos). **Vertical Slice** (Jimmy Bogard) organiza por **feature**: cada caso de uso contiene su request, handler, validator, endpoint y acceso a datos en una carpeta.

```
 Clean (horizontal)                 Vertical Slice
 ──────────────────                 ──────────────
 Controllers/ ─┐                    Features/
 Application/ ─┼─ un feature        ├── PlaceOrder/  (endpoint+command+handler+validator)
 Infra/Repos/ ─┘  cruza 3 carpetas  ├── GetOrder/    (endpoint+query+SQL directo)
                                    └── CancelOrder/
```

| Criterio | Clean Architecture | Vertical Slice |
|---|---|---|
| Acoplamiento | Bajo entre capas, alto *dentro* de una capa | Bajo entre features, alto dentro del slice |
| Cambiar un feature | Tocas varias carpetas/proyectos | Tocas una carpeta |
| Reuso | Favorece abstracciones compartidas | Favorece duplicación controlada |
| Riesgo | Capas "pasamanos", sobreabstracción | Lógica de dominio duplicada entre slices si no hay un Domain común |

En la práctica muchos equipos combinan: **Domain rico compartido + slices verticales** para Application/Api. **Modular Monolith** (módulos por bounded context dentro de un solo deployable) es otra evolución muy popular antes de saltar a microservicios.

---

## 9. Errores comunes (checklist senior)

| ⚠️ Error | Consecuencia | Solución |
|---|---|---|
| Entidades de EF expuestas como respuesta HTTP | Over-posting, ciclos de serialización, contrato acoplado a la BD | DTOs (Sesión 23) |
| `public set` en todas las propiedades del dominio | Invariantes rotas desde cualquier parte | `private set`, métodos con intención |
| Un aggregate gigante (`Customer` con todos sus pedidos) | Contención, carga lenta, conflictos de concurrencia | Aggregates pequeños, referencia por Id |
| Modificar 2 aggregates en una transacción "porque es fácil" | Acoplamiento, bloqueos | Domain events + consistencia eventual |
| Interfaces para *todo* (`IOrderMapper`, `IOrderFactory`...) sin segunda implementación ni necesidad de test | Ruido, navegación difícil | Abstrae en las **fronteras** (I/O), no dentro del dominio |
| Application referenciando EF Core "solo para `Include`" | Rompe la regla de dependencia | Mover la consulta al repositorio o al read side |
| `DateTime.Now` dentro del dominio | Tests no deterministas | `IClock` / `TimeProvider` (.NET 8) |

> 💡 .NET 8 incluye **`TimeProvider`** (abstracción oficial del tiempo) y `FakeTimeProvider` en `Microsoft.Extensions.TimeProvider.Testing`. Puedes usarlo en lugar de tu propio `IClock`.

---

## Resumen mental de la sesión

```
Arquitectura = gestionar DEPENDENCIAS
Regla de dependencia: todo apunta HACIA EL DOMINIO (DIP: puertos en Application, adaptadores en Infra)

Domain         → Entities, Value Objects, Aggregates, Domain Events. C# puro.
Application    → Casos de uso (Commands/Queries + Handlers), interfaces (puertos). Orquesta.
Infrastructure → EF Core, repos, email, colas. Implementa puertos.
Api            → HTTP + composition root (DI).

DDD: Entity (identidad) · Value Object (valor, inmutable) · Aggregate (frontera de consistencia,
     1 tx = 1 aggregate, referenciar por Id) · Domain Event (pasado, desacopla efectos)
CQRS: Command (cambia, sin datos) / Query (datos, sin cambios). ≠ Event Sourcing.
MediatR: mediator + pipeline behaviors (validación, logging, tx). Opcional. Ojo licencia v13+.
Repository/UoW: DbContext YA es UoW, DbSet YA es repo. Si abstraes: 1 repo por aggregate,
     solo escritura, NUNCA IQueryable, NUNCA repo genérico CRUD.
Outbox: evita dual write al publicar integration events.
Alternativas: Vertical Slice, Modular Monolith. Elegir por complejidad del dominio.
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Enuncia la regla de dependencia de Clean Architecture y explica cómo la hace posible el DIP.
2. ❓ ¿Qué diferencia hay entre Clean, Onion y Hexagonal?
3. ❓ Entity vs Value Object: da dos ejemplos de cada uno y cómo los modelarías en C#.
4. ❓ ¿Qué es un Aggregate Root? Enuncia al menos tres reglas de diseño de aggregates.
5. ❓ ¿Qué es un modelo anémico y cuándo es aceptable?
6. ❓ CQS vs CQRS. ¿CQRS requiere Event Sourcing o dos bases de datos?
7. ❓ ¿Qué es un pipeline behavior de MediatR y qué casos de uso resuelve?
8. ❓ ¿Por qué el repositorio genérico sobre EF Core se considera un anti-patrón? ¿Por qué no devolver `IQueryable`?
9. ❓ Domain Event vs Integration Event. ¿Qué problema resuelve el Outbox Pattern?
10. ❓ ¿Qué lifetime deben tener DbContext, repositorios y UoW, y qué bug aparece si no comparten instancia?
11. ❓ Clean Architecture vs Vertical Slice: ¿cuándo elegirías cada una?
12. ❓ ¿Qué es un Bounded Context y por qué es más importante que los patrones tácticos?

## Ejercicio práctico
1. Crea la solución `Tienda` con los 4 proyectos de la sección 3 y las referencias exactas. Intenta agregar `using Microsoft.EntityFrameworkCore` en Domain y confirma que **no compila** sin el paquete: la arquitectura la impone el compilador.
2. Implementa `Money`, `OrderId`, `Order` y `OrderLine` en Domain. Añade una regla nueva: *un pedido no puede superar 20 líneas ni 1.000.000 en total*.
3. En Application, crea `PlaceOrderCommand` + handler (sin MediatR) y `CancelOrderCommand` que devuelva `Result` con error `Order.NotFound` si no existe.
4. En Infrastructure, configura `AppDbContext` con owned types y el value converter de `OrderId`. Usa SQLite o PostgreSQL en Docker y genera la migración (Sesión 25).
5. Expón `POST /orders` y `GET /orders/{id}`. El GET debe usar una **proyección** `AsNoTracking().Select(o => new OrderDto(...))` sin pasar por el repositorio (CQRS nivel 2).
6. (Opcional) Añade MediatR 12.x con `ValidationBehavior` + FluentValidation, y un handler de `OrderPlaced` que escriba un log "enviando email".
7. (Opcional avanzado) Implementa una tabla `OutboxMessages` y un `BackgroundService` que la procese cada 5 segundos.

---

➡️ **Cuando termines**, marca la Sesión 26 en el [README](Readme.md) y pídeme la **Sesión 27 — Testing (xUnit, Moq, integración)**.
