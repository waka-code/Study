# Sesión 27 — Testing: xUnit, Moq y pruebas de integración

> **Objetivo de la sesión**: entender *por qué* y *qué* testear (pirámide de tests, qué es realmente una "unidad"), dominar **xUnit** (Fact, Theory, fixtures, ciclo de vida), aislar dependencias con **dobles de prueba** (Moq y NSubstitute), escribir **tests de integración** reales de un API ASP.NET Core con `WebApplicationFactory` y **Testcontainers**, y conocer las herramientas que completan el cuadro (FluentAssertions, cobertura, tests de arquitectura, mutation testing). Al terminar deberías poder testear de punta a punta la solución `Tienda` de la Sesión 26.

---

## 1. ¿Por qué testear? (y qué NO es el objetivo)

Un test automatizado es código que **verifica** que otro código se comporta como esperas. El valor real no es "encontrar bugs hoy", sino:

- **Red de seguridad para cambiar**: refactorizar sin miedo. Sin tests, el código se "congela".
- **Documentación ejecutable**: un buen test explica el comportamiento mejor que un comentario.
- **Feedback de diseño**: si algo es difícil de testear, casi siempre está mal acoplado (Sesión 26).

> ⚠️ **La cobertura no es el objetivo**. 100% de cobertura con asserts débiles no garantiza nada. Mide *líneas ejecutadas*, no *comportamiento verificado*. Úsala para encontrar zonas **sin** tests, no como meta.

### 1.1 La pirámide (y el trofeo)

```
                 ▲  lentos, caros, frágiles, alta confianza
                ╱ ╲
               ╱E2E╲          pocos: flujos críticos (Playwright, Selenium)
              ╱─────╲
             ╱ Integ. ╲       varios: API + BD real, contratos
            ╱───────────╲
           ╱   Unitarios  ╲   muchos: dominio, lógica pura (ms cada uno)
          ╱─────────────────╲
                 ▼  rápidos, baratos, estables, confianza local
```

| Tipo | Qué prueba | Dependencias | Velocidad |
|---|---|---|---|
| **Unitario** | Una unidad de *comportamiento* aislada | Ninguna real (dobles o sin deps) | ms |
| **Integración** | Varias piezas juntas (API + EF + BD) | Reales (BD en contenedor) | 100 ms – s |
| **E2E** | El sistema completo como lo usa el usuario | Todo desplegado | s – min |
| **Contrato** | Que productor y consumidor respetan el mismo contrato (Pact) | Mock del otro lado | ms |

Kent C. Dodds propone el **"testing trophy"**: más peso en integración, porque ahí se esconden los bugs reales (mapeos, SQL, serialización). En .NET moderno, con Testcontainers, los tests de integración son lo suficientemente rápidos para ser una parte grande de la suite.

> ❓ **Entrevista**: *"¿Qué es una unidad en un test unitario?"* → Hay dos escuelas. **Clásica (Detroit/Chicago)**: una unidad de *comportamiento*, que puede involucrar varias clases; solo se reemplazan dependencias compartidas o lentas (BD, red, reloj). **Mockista (London)**: una *clase*; se mockean todos sus colaboradores. La clásica produce tests menos frágiles ante refactors; la mockista aísla más, pero acopla los tests a la implementación.

---

## 2. Montar el proyecto de tests

```bash
dotnet new xunit -o tests/Tienda.Domain.Tests
dotnet sln add tests/Tienda.Domain.Tests
dotnet add tests/Tienda.Domain.Tests reference src/Tienda.Domain
dotnet add tests/Tienda.Domain.Tests package FluentAssertions
dotnet test                              # compila y ejecuta todos los tests de la solución
dotnet test --filter "Category=Unit"     # filtrar por trait
dotnet test --logger "console;verbosity=detailed"
```

Frameworks disponibles en .NET:

| Framework | Rasgos | Nota |
|---|---|---|
| **xUnit** | Nueva instancia de clase por test, sin `[SetUp]` (usa ctor/`IDisposable`), paralelo por colección | El más usado en .NET Core; lo usa el propio equipo de .NET |
| **NUnit** | `[SetUp]/[TearDown]`, `[TestCase]`, muy maduro | Popular en proyectos legacy/enterprise |
| **MSTest** | `[TestMethod]`, integración Visual Studio; v3 moderno | Oficial de Microsoft |
| **TUnit** | Source generators, AOT, async-first | Nuevo, en crecimiento |

> 💡 **xUnit v3** (2024+) cambia a ejecutables independientes y `TestContext.Current.CancellationToken`. Todo lo de esta sesión aplica a v2 y v3 salvo detalles de paquete (`xunit.v3`).

---

## 3. xUnit a fondo

### 3.1 Anatomía: Arrange – Act – Assert

```csharp
using FluentAssertions;
using Tienda.Domain.Common;
using Tienda.Domain.Orders;
using Xunit;

namespace Tienda.Domain.Tests.Orders;

public class OrderTests
{
    // Convención de nombres: Método_Escenario_ResultadoEsperado
    [Fact]
    public void Place_WithoutLines_ThrowsDomainException()
    {
        // Arrange: preparar el escenario
        var order = Order.Create(Guid.NewGuid(), "CLP");

        // Act: ejecutar UNA acción
        var act = () => order.Place(DateTime.UtcNow);

        // Assert: verificar el resultado observable
        act.Should().Throw<DomainException>().WithMessage("*vacío*");
    }

    [Fact]
    public void AddLine_SameProductTwice_MergesQuantities()
    {
        var order = Order.Create(Guid.NewGuid(), "CLP");
        var productId = Guid.NewGuid();

        order.AddLine(productId, new Money(1000, "CLP"), 2);
        order.AddLine(productId, new Money(1000, "CLP"), 3);

        order.Lines.Should().ContainSingle()
             .Which.Quantity.Should().Be(5);
        order.Total.Should().Be(new Money(5000, "CLP"));   // igualdad por valor del record
    }

    [Fact]
    public void Place_WithLines_RaisesOrderPlacedEvent()
    {
        var order = Order.Create(Guid.NewGuid(), "CLP");
        order.AddLine(Guid.NewGuid(), new Money(500, "CLP"), 1);
        var now = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc); // determinista

        order.Place(now);

        order.Status.Should().Be(OrderStatus.Placed);
        order.DomainEvents.Should().ContainSingle()
             .Which.Should().BeOfType<OrderPlaced>()
             .Which.OccurredOnUtc.Should().Be(now);
    }
}
```

> ⚠️ **Un test = un comportamiento**. Varios asserts están bien si verifican *el mismo* comportamiento; si un test prueba tres cosas y falla, no sabes cuál.

> ⚠️ **Licencia**: FluentAssertions v8+ (2025) pasó a licencia comercial. La v7.x sigue siendo Apache 2.0; alternativas libres: **Shouldly** o **AwesomeAssertions** (fork). Los asserts nativos de xUnit (`Assert.Equal`, `Assert.Throws`) siempre funcionan.

### 3.2 Theory: tests parametrizados

```csharp
public class MoneyTests
{
    [Theory]
    [InlineData(-1, "CLP")]
    [InlineData(10, "")]
    [InlineData(10, "PESOS")]
    public void Ctor_InvalidInput_Throws(decimal amount, string currency)
    {
        var act = () => new Money(amount, currency);
        act.Should().Throw<DomainException>();
    }

    // MemberData: datos que no son constantes de compilación (decimal, objetos)
    public static TheoryData<Money, Money, Money> SumCases => new()
    {
        { new Money(1, "USD"),  new Money(2, "USD"),  new Money(3, "USD") },
        { new Money(0, "CLP"),  new Money(990, "CLP"), new Money(990, "CLP") },
    };

    [Theory]
    [MemberData(nameof(SumCases))]
    public void Add_SameCurrency_ReturnsSum(Money a, Money b, Money expected)
        => a.Add(b).Should().Be(expected);
}
```

| Atributo | Uso |
|---|---|
| `[Fact]` | Test sin parámetros |
| `[Theory]` + `[InlineData]` | Parámetros constantes (int, string, bool…) |
| `[MemberData]` / `TheoryData<>` | Datos desde propiedad/método estático, tipados |
| `[ClassData]` | Datos desde una clase `IEnumerable<object[]>` reutilizable |
| `[Trait("Category","Unit")]` | Etiquetar para filtrar |
| `[Fact(Skip = "motivo")]` | Omitir (deja rastro del porqué) |

### 3.3 Ciclo de vida y fixtures (clave en entrevistas)

xUnit crea **una instancia nueva de la clase de test por cada test**. Eso garantiza aislamiento: el estado de un test no contamina a otro.

| Necesidad | Mecanismo xUnit | Equivalente NUnit |
|---|---|---|
| Setup/teardown por test | Constructor / `IDisposable` / `IAsyncLifetime` | `[SetUp]` / `[TearDown]` |
| Contexto compartido por **clase** | `IClassFixture<T>` | `[OneTimeSetUp]` |
| Contexto compartido por **varias clases** | `[CollectionDefinition]` + `ICollectionFixture<T>` | `[SetUpFixture]` |
| Contexto de toda la ejecución | `AssemblyFixture` (xUnit v3) | — |

```csharp
// Fixture costoso (p. ej. un contenedor de BD) creado UNA vez para toda la clase
public sealed class ExpensiveFixture : IAsyncLifetime
{
    public string ConnectionString { get; private set; } = "";
    public Task InitializeAsync() { ConnectionString = "..."; return Task.CompletedTask; }
    public Task DisposeAsync() => Task.CompletedTask;
}

public class RepoTests(ExpensiveFixture fx) : IClassFixture<ExpensiveFixture>, IDisposable
{
    // El constructor corre ANTES de cada test (primary ctor, Sesión 18)
    private readonly List<string> _perTestState = new();

    [Fact] public void A() => fx.ConnectionString.Should().NotBeNull();
    [Fact] public void B() => _perTestState.Should().BeEmpty(); // siempre vacío: instancia nueva

    public void Dispose() { /* corre DESPUÉS de cada test */ }
}
```

**Paralelismo**: por defecto, las clases de distintas *colecciones* corren en paralelo; los tests dentro de una misma clase corren en **serie**. Cada clase es su propia colección salvo que declares `[Collection("Db")]`. Tests que comparten un recurso mutable (misma BD) deben estar en la **misma colección** o aislarse por datos.

```csharp
[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<ExpensiveFixture> { } // solo marcador

[Collection("Database")] public class OrdersDbTests(ExpensiveFixture fx) { /* ... */ }
[Collection("Database")] public class CustomersDbTests(ExpensiveFixture fx) { /* ... */ }
```

### 3.4 Tests asíncronos y output

```csharp
public class AsyncTests(ITestOutputHelper output)       // Console.WriteLine NO aparece en xUnit
{
    [Fact]
    public async Task Handler_Completes()                // async Task, NUNCA async void
    {
        output.WriteLine("Log visible en el reporte del test");
        await Task.Delay(10);
        await FluentActions.Awaiting(() => FailAsync()).Should().ThrowAsync<InvalidOperationException>();
    }
    private static Task FailAsync() => throw new InvalidOperationException();
}
```

> ⚠️ `async void` en un test (Sesión 13) hace que xUnit no pueda esperar el resultado: el test "pasa" aunque falle. Siempre `async Task`. Y nunca uses `.Result`/`.Wait()` en tests: deadlocks y excepciones envueltas en `AggregateException`.

---

## 4. Dobles de prueba (Test Doubles)

Gerard Meszaros definió la taxonomía. "Mock" se usa coloquialmente para todo, pero en entrevista conviene precisar:

| Doble | Qué hace | Se verifica |
|---|---|---|
| **Dummy** | Se pasa pero nunca se usa (rellena un parámetro) | Nada |
| **Stub** | Devuelve respuestas predefinidas | El **estado/resultado** del SUT |
| **Fake** | Implementación funcional simplificada (repo en memoria, `FakeTimeProvider`) | Estado |
| **Spy** | Stub que además **registra** cómo se lo llamó | Llamadas, después del act |
| **Mock** | Objeto con **expectativas** sobre las interacciones | La **interacción** (que se llamó X con Y) |

```
  Stub  → "cuando te pidan el pedido 1, devuelve este"      (entrada al SUT)
  Mock  → "verifica que se llamó SaveChanges exactamente 1"  (salida del SUT)
```

> ❓ **Entrevista**: *"¿Diferencia entre mock y stub?"* → El stub **provee datos** al sistema bajo prueba y verificas el resultado; el mock **verifica interacciones** (que ciertas llamadas ocurrieron). Regla práctica: *stub para queries, mock para commands* (efectos hacia afuera: email, cola, guardar). No verifiques interacciones con stubs: acopla el test a la implementación.

---

## 5. Moq

```bash
dotnet new xunit -o tests/Tienda.Application.Tests
dotnet add tests/Tienda.Application.Tests reference src/Tienda.Application
dotnet add tests/Tienda.Application.Tests package Moq
```

Testeamos el `PlaceOrderHandler` de la Sesión 26:

```csharp
using FluentAssertions;
using Moq;
using Tienda.Application.Abstractions;
using Tienda.Application.Orders.PlaceOrder;
using Tienda.Domain.Orders;
using Xunit;

public class PlaceOrderHandlerTests
{
    private readonly Mock<IOrderRepository> _repo = new();
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IClock> _clock = new();
    private readonly PlaceOrderHandler _sut;            // SUT = System Under Test

    public PlaceOrderHandlerTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)); // STUB
        _sut = new PlaceOrderHandler(_repo.Object, _uow.Object, _clock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_AddsOrderAndSavesOnce()
    {
        var cmd = new PlaceOrderCommand(Guid.NewGuid(), "CLP",
            [new PlaceOrderLine(Guid.NewGuid(), 1500m, 2)]);   // collection expression (Sesión 18)

        Order? captured = null;
        _repo.Setup(r => r.Add(It.IsAny<Order>()))
             .Callback<Order>(o => captured = o);             // SPY: capturar el argumento

        var result = await _sut.Handle(cmd, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        captured.Should().NotBeNull();
        captured!.Status.Should().Be(OrderStatus.Placed);
        captured.Total.Amount.Should().Be(3000m);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once); // MOCK
    }

    [Fact]
    public async Task Handle_NoLines_ReturnsFailureAndDoesNotSave()
    {
        var result = await _sut.Handle(new PlaceOrderCommand(Guid.NewGuid(), "CLP", []), default);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("Order.Empty");
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _repo.VerifyNoOtherCalls();
    }
}
```

API de Moq que más usarás:

| Necesidad | Código |
|---|---|
| Devolver valor | `m.Setup(x => x.Get(1)).Returns(obj)` |
| Async | `m.Setup(x => x.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(obj)` |
| Cualquier argumento / condición | `It.IsAny<T>()`, `It.Is<int>(i => i > 0)` |
| Lanzar excepción | `.Throws<TimeoutException>()` / `.ThrowsAsync(new ...)` |
| Respuestas en secuencia | `m.SetupSequence(x => x.Next()).Returns(1).Returns(2).Throws<Exception>()` |
| Verificar | `m.Verify(x => x.Save(), Times.Once)` / `Times.Never` / `Times.Exactly(3)` |
| Mock estricto | `new Mock<T>(MockBehavior.Strict)` → falla ante cualquier llamada no configurada |
| Propiedades con estado | `m.SetupProperty(x => x.Name)` |

> ⚠️ Moq **solo puede mockear** interfaces, clases abstractas y miembros `virtual`. No puede mockear métodos `static`, `sealed`, ni no-virtuales (usa Castle DynamicProxy, que genera subclases en runtime). Si necesitas mockear `DateTime.Now` o `File.ReadAllText`, el problema es de diseño: introduce una abstracción (`TimeProvider`, `IFileSystem`).

> ⚠️ Polémica de 2023: Moq 4.20.0 incluyó *SponsorLink*, que leía el email de git del desarrollador. Se retiró, pero muchos equipos migraron a **NSubstitute**. Saberlo es un plus en entrevistas.

### 5.1 NSubstitute (sintaxis alternativa)

```csharp
// dotnet add package NSubstitute
var repo = Substitute.For<IOrderRepository>();
var uow  = Substitute.For<IUnitOfWork>();
var clock = Substitute.For<IClock>();
clock.UtcNow.Returns(DateTime.UnixEpoch);                 // stub: sin lambdas Setup

var sut = new PlaceOrderHandler(repo, uow, clock);
await sut.Handle(cmd, default);

repo.Received(1).Add(Arg.Is<Order>(o => o.Status == OrderStatus.Placed));
await uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
```

### 5.2 Fakes: a menudo mejores que mocks

```csharp
// Un fake en memoria: tests más legibles y menos acoplados a "qué método se llamó"
public sealed class InMemoryOrderRepository : IOrderRepository, IUnitOfWork
{
    public Dictionary<OrderId, Order> Store { get; } = new();
    private readonly List<Order> _pending = new();
    public int SaveCount { get; private set; }

    public Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct) =>
        Task.FromResult(Store.GetValueOrDefault(id));
    public void Add(Order order) => _pending.Add(order);
    public Task<int> SaveChangesAsync(CancellationToken ct)
    {
        foreach (var o in _pending) Store[o.Id] = o;
        var n = _pending.Count; _pending.Clear(); SaveCount++;
        return Task.FromResult(n);
    }
}
```

Y para el tiempo, .NET 8 trae `FakeTimeProvider` (`Microsoft.Extensions.TimeProvider.Testing`): `fake.Advance(TimeSpan.FromMinutes(5))` hace avanzar relojes y timers sin esperar.

> ❓ **Entrevista**: *"¿Qué problemas trae el exceso de mocks?"* → Tests **frágiles** que se rompen al refactorizar aunque el comportamiento no cambie, tests que verifican la implementación en vez del resultado, y falsa confianza (el mock devuelve lo que tú crees que hace la dependencia real). Mockea solo en las **fronteras** del sistema (I/O, servicios externos) y prefiere fakes o dependencias reales para lo demás.

---

## 6. Tests de integración con WebApplicationFactory

`Microsoft.AspNetCore.Mvc.Testing` levanta tu API **en memoria** (con `TestServer`, sin puerto de red), usando tu `Program.cs` real: middleware, DI, routing, serialización, filtros. Solo sustituyes lo que necesites.

```bash
dotnet new xunit -o tests/Tienda.Api.IntegrationTests
dotnet add tests/Tienda.Api.IntegrationTests reference src/Tienda.Api
dotnet add tests/Tienda.Api.IntegrationTests package Microsoft.AspNetCore.Mvc.Testing
dotnet add tests/Tienda.Api.IntegrationTests package Testcontainers.PostgreSql
```

Con top-level statements, `Program` es una clase `internal` generada. Hazla visible al proyecto de test:

```csharp
// al final de Tienda.Api/Program.cs
public partial class Program { }
```

### 6.1 Por qué no la BD InMemory de EF

| Opción | Pros | Contras |
|---|---|---|
| `UseInMemoryDatabase` | Rápida, sin setup | ⚠️ **No es relacional**: no valida FKs, ni constraints, ni transacciones, ni traduce SQL. Microsoft desaconseja usarla para tests |
| SQLite in-memory | Relacional, rápida | Dialecto distinto a tu BD de producción (tipos, funciones) |
| **Testcontainers** (BD real en Docker) | Mismo motor que producción, migraciones reales | Requiere Docker; arranque de unos segundos (una vez por fixture) |

### 6.2 Fixture con Testcontainers

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using Tienda.Infrastructure.Persistence;
using Xunit;

public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            // Reemplazar el DbContext registrado en Program.cs por uno apuntando al contenedor
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseNpgsql(_db.GetConnectionString()));
        });
    }

    public async Task InitializeAsync()
    {
        await _db.StartAsync();                                   // docker run postgres
        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await base.DisposeAsync();
    }
}
```

```csharp
using System.Net;
using System.Net.Http.Json;

[CollectionDefinition("Api")] public class ApiCollection : ICollectionFixture<ApiFactory> { }

[Collection("Api")]
public class OrdersEndpointsTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient(); // HttpClient contra el TestServer

    [Fact]
    public async Task PostOrder_ThenGet_ReturnsPersistedOrder()
    {
        var body = new
        {
            customerId = Guid.NewGuid(),
            currency = "CLP",
            lines = new[] { new { productId = Guid.NewGuid(), unitPrice = 1000m, quantity = 3 } }
        };

        var post = await _client.PostAsJsonAsync("/orders", body);
        post.StatusCode.Should().Be(HttpStatusCode.Created);
        var location = post.Headers.Location!;

        var dto = await _client.GetFromJsonAsync<OrderDto>(location);
        dto!.Total.Should().Be(3000m);
        dto.Status.Should().Be("Placed");
    }

    [Fact]
    public async Task PostOrder_WithoutLines_Returns400ProblemDetails()
    {
        var res = await _client.PostAsJsonAsync("/orders",
            new { customerId = Guid.NewGuid(), currency = "CLP", lines = Array.Empty<object>() });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        res.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
    }

    [Fact]
    public async Task GetOrder_Unknown_Returns404()
        => (await _client.GetAsync($"/orders/{Guid.NewGuid()}")).StatusCode.Should().Be(HttpStatusCode.NotFound);

    private sealed record OrderDto(Guid Id, string Status, decimal Total, string Currency);
}
```

```
 xUnit ──▶ HttpClient ──▶ TestServer (en memoria) ──▶ Middleware → Routing → Handler
                                                                        │
                                                         EF Core ──▶ Postgres (Docker)
```

### 6.3 Aislamiento de datos entre tests

Con una BD compartida por la colección, los tests pueden pisarse. Estrategias:

| Estrategia | Cómo | Trade-off |
|---|---|---|
| Datos únicos por test | Ids/emails aleatorios, asserts solo sobre lo creado | Simple; no sirve para "listar todo" |
| **Respawn** | Borra todas las tablas (respetando FKs) antes de cada test | Rápido y fiable; muy usado |
| Transacción + rollback | Envolver cada test en una transacción | No funciona si el código bajo prueba abre su propia transacción o usa otro contexto |
| Una BD/contenedor por clase | Aislamiento total | Más lento |

### 6.4 Autenticación en tests de integración

Para endpoints `[Authorize]` (Sesión 28), registra un `AuthenticationHandler` de prueba en `ConfigureTestServices` que siempre autentique con los claims que necesites, o genera JWT reales firmados con una clave de test. Así pruebas autorización (roles, policies) sin depender del identity provider.

> ❓ **Entrevista**: *"¿Cómo harías tests de integración de un API .NET?"* → `WebApplicationFactory<Program>` para levantar el pipeline real en memoria, `ConfigureTestServices` para reemplazar dependencias externas (colas, APIs de terceros con fakes o WireMock), una **BD real con Testcontainers** con migraciones aplicadas, y **Respawn** para limpiar entre tests. Evito EF InMemory porque no se comporta como una BD relacional.

---

## 7. Otras herramientas del ecosistema

### 7.1 Tests de arquitectura

Hacen cumplir la regla de dependencia de la Sesión 26 en CI:

```csharp
// dotnet add package NetArchTest.Rules
using NetArchTest.Rules;

public class ArchitectureTests
{
    [Fact]
    public void Domain_ShouldNotDependOn_InfrastructureOrEfCore()
    {
        var result = Types.InAssembly(typeof(Tienda.Domain.Orders.Order).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny("Microsoft.EntityFrameworkCore", "Tienda.Infrastructure", "Tienda.Application")
            .GetResult();

        result.IsSuccessful.Should().BeTrue(string.Join(", ", result.FailingTypeNames ?? []));
    }
}
```

### 7.2 Cobertura

```bash
# coverlet.collector viene en la plantilla xunit
dotnet test --collect:"XPlat Code Coverage"
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:coverage -reporttypes:Html
```

### 7.3 Mutation testing (Stryker.NET)

Stryker **modifica tu código** (cambia `>` por `>=`, borra llamadas, invierte condiciones) y ejecuta los tests. Si los tests siguen pasando, el "mutante sobrevivió": tus tests no verifican ese comportamiento. Es la métrica honesta de la calidad de la suite.

```bash
dotnet tool install -g dotnet-stryker
cd tests/Tienda.Domain.Tests && dotnet stryker
```

### 7.4 Más herramientas

| Herramienta | Para qué |
|---|---|
| **Bogus** / **AutoFixture** | Generar datos de prueba realistas/anónimos |
| **Verify** | Snapshot testing (compara la salida serializada con un archivo aprobado) |
| **WireMock.Net** | Simular APIs HTTP externas |
| **Playwright** | Tests E2E de navegador |
| **BenchmarkDotNet** | Micro-benchmarks, no tests de corrección (Sesión 30) |
| **Pact** | Contract testing entre servicios |

---

## 8. Buenas prácticas y anti-patrones

| ✅ Hacer | ⚠️ Evitar |
|---|---|
| Nombres que describen el comportamiento | `Test1`, `TestOrder` |
| Tests deterministas (reloj, random y Guid inyectados) | `DateTime.Now`, `Thread.Sleep`, orden aleatorio que importa |
| Probar comportamiento público observable | Testear métodos `private` vía reflection (Sesión 20) |
| Un escenario por test; AAA visible | Lógica (`if`, `for`) dentro del test |
| Builders / Object Mothers para arrange repetitivo | Copiar 30 líneas de arrange en cada test |
| Fallar por la razón correcta: ver el test en rojo primero (TDD) | Tests que nunca fallaron (¿prueban algo?) |
| Tests independientes del orden de ejecución | Tests que dependen de datos dejados por otro |
| Tests de integración para mapeos, SQL, serialización | Mockear `DbContext`/`DbSet` (frágil y engañoso) |

**TDD** (Test-Driven Development) en una línea: **Red → Green → Refactor**. Escribes un test que falla, el mínimo código para pasarlo, y luego mejoras el diseño con la red de seguridad puesta.

> ❓ **Entrevista**: *"¿Cómo testeas código que usa `DateTime.Now` o `HttpClient`?"* → Tiempo: inyectar `TimeProvider` y usar `FakeTimeProvider`. `HttpClient`: no se mockea la clase; se inyecta un `HttpMessageHandler` falso (o WireMock) vía `IHttpClientFactory`, o se abstrae detrás de una interfaz propia del cliente tipado.

---

## Resumen mental de la sesión

```
Por qué: red de seguridad para cambiar + documentación + feedback de diseño
Pirámide: muchos unitarios, varios integración, pocos E2E (trofeo: más integración)
Unidad: comportamiento (clásica) vs clase (mockista)

xUnit: [Fact] · [Theory]+[InlineData]/[MemberData]/TheoryData
  instancia NUEVA por test → ctor = setup, Dispose = teardown, IAsyncLifetime = async
  IClassFixture (por clase) · ICollectionFixture (varias clases, sin paralelismo entre ellas)
  ITestOutputHelper para logs · async Task, nunca async void

Dobles: dummy · stub (datos in) · fake (impl. simple) · spy (registra) · mock (verifica interacción)
  stub para queries, mock para commands · mockear en FRONTERAS
Moq: Setup/Returns(Async)/It.IsAny/Verify/Times · solo interfaces y virtual
NSubstitute: Substitute.For, .Returns, .Received

Integración: WebApplicationFactory<Program> + ConfigureTestServices
  + Testcontainers (BD real) + Respawn (limpiar) · NO EF InMemory
Extra: NetArchTest (arquitectura) · coverlet (cobertura ≠ calidad) · Stryker (mutantes)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Dibuja la pirámide de tests y explica el trade-off de cada nivel. ¿Qué propone el "testing trophy"?
2. ❓ Escuela clásica vs mockista: ¿qué es una "unidad" en cada una?
3. ❓ ¿Por qué xUnit no tiene `[SetUp]`? ¿Cómo haces setup por test, por clase y entre varias clases?
4. ❓ ¿Cómo se ejecutan en paralelo los tests en xUnit y cómo evitas que dos clases compartan una BD en paralelo?
5. ❓ Diferencia entre dummy, stub, fake, spy y mock. ¿Cuándo verificarías una interacción?
6. ❓ ¿Qué limitaciones tiene Moq y por qué? ¿Cómo testeas código con `DateTime.Now`?
7. ❓ ¿Qué hace `WebApplicationFactory` y cómo reemplazas un servicio para un test?
8. ❓ ¿Por qué no usar `UseInMemoryDatabase` para tests de integración? ¿Qué alternativa usas?
9. ❓ ¿Cómo aíslas los datos entre tests que comparten una BD?
10. ❓ ¿Qué mide la cobertura y qué no? ¿Qué aporta el mutation testing?
11. ❓ ¿Qué es un test frágil y cómo lo evitas?
12. ❓ Explica el ciclo de TDD y un beneficio de diseño que produce.

## Ejercicio práctico
1. Sobre la solución `Tienda` de la Sesión 26, crea `Tienda.Domain.Tests`, `Tienda.Application.Tests` y `Tienda.Api.IntegrationTests`.
2. **Domain**: escribe al menos 8 tests de `Order` y `Money` (usa `[Theory]` para las validaciones), incluyendo la regla de "máximo 20 líneas".
3. **Application**: testea `PlaceOrderHandler` dos veces: una con **Moq** y otra con el **fake** `InMemoryOrderRepository`. Compara cuál es más legible y cuál se rompe si renombras un método interno.
4. **Integración**: implementa `ApiFactory` con Testcontainers (Postgres) y los 3 tests de endpoints de la sección 6.2. Añade **Respawn** para limpiar la BD antes de cada test.
5. Añade un test de arquitectura con NetArchTest que falle si Domain referencia EF Core. Rompe la regla a propósito y confirma que el test falla.
6. Ejecuta cobertura con coverlet + ReportGenerator y abre el HTML. Luego corre **Stryker** sobre el proyecto de dominio y mata al menos 2 mutantes supervivientes escribiendo tests nuevos.
7. (Opcional) Configura un workflow de GitHub Actions que ejecute `dotnet test` en cada push (los runners `ubuntu-latest` ya traen Docker para Testcontainers).

---

➡️ **Cuando termines**, marca la Sesión 27 en el [README](Readme.md) y pídeme la **Sesión 28 — Seguridad (JWT, OAuth, Identity, OWASP)**.
