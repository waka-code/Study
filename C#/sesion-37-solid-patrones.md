# Sesión 37 — SOLID y patrones de diseño en C#: del principio al refactor en producción

> **Objetivo de la sesión**: dominar SOLID *de verdad* (no la definición de memoria, sino detectar la violación en un PR y refactorizarla), y conocer los patrones GoF que **realmente** aparecen en código .NET moderno: Strategy, Factory, Builder, Decorator (con Scrutor), Adapter, Observer, Mediator, Chain of Responsibility, Specification y Result. Al terminar deberías poder justificar *cuándo* aplicar cada uno, *cuándo no*, y reconocer los antipatrones que un senior bloquea en code review.

---

## 1. ¿Por qué SOLID y patrones siguen importando?

En la Sesión 5 viste SOLID en una tabla y en la Sesión 26 lo aplicaste a nivel de **arquitectura** (capas, dependencias hacia adentro). Aquí bajamos al nivel de **clase y método**: el código que revisas cada día en un PR.

La idea central es una sola: **gestionar el cambio**. Todo principio y patrón responde a la pregunta *"cuando el requisito cambie (y cambiará), ¿cuántos archivos tengo que tocar y cuánto riesgo corro?"*.

```
Código rígido                         Código flexible
─────────────                         ───────────────
un cambio → 10 archivos               un cambio → 1 clase nueva
switch/if gigantes                    polimorfismo + DI
new en todas partes                   dependencias inyectadas
tests imposibles                      tests unitarios triviales
```

> ⚠️ Los patrones son **vocabulario**, no objetivos. Un senior no dice "voy a meter un Abstract Factory"; dice "tengo tres proveedores de pago que cambian en runtime → Strategy resuelto por DI". Si el problema no existe, el patrón es sobreingeniería (ver §14). Las notas generales de patrones están en [../Diseno/README.md](../Diseno/README.md).

---

## 2. S — Single Responsibility Principle (SRP)

> *"Una clase debe tener una, y solo una, razón para cambiar."* — Robert C. Martin

La formulación moderna (Clean Architecture) es más precisa: **un módulo debe responder a un solo actor** (un solo stakeholder que pida cambios). No es "hacer una sola cosa" — un método hace una cosa; una clase agrupa cosas que cambian **por el mismo motivo**.

### 2.1 La violación típica

```csharp
// ❌ Tres actores distintos piden cambios aquí: negocio (reglas), DBA (persistencia), marketing (email)
public class PedidoService
{
    public async Task CrearAsync(PedidoDto dto)
    {
        // 1) Validación + regla de negocio
        if (dto.Lineas.Count == 0) throw new ArgumentException("Pedido vacío");
        decimal total = dto.Lineas.Sum(l => l.Precio * l.Cantidad);
        if (dto.EsVip) total *= 0.9m;

        // 2) Persistencia con SQL a mano
        using var conn = new SqlConnection("Server=...;");      // además: config hardcodeada
        await conn.ExecuteAsync("INSERT INTO Pedidos ...", new { total });

        // 3) Notificación
        var smtp = new SmtpClient("smtp.empresa.com");
        await smtp.SendMailAsync("no-reply@x.com", dto.Email, "Pedido creado", $"Total: {total}");
    }
}
```

### 2.2 El refactor

```csharp
// Cada colaborador tiene UNA razón para cambiar
public sealed class CalculadoraPrecio                     // cambia si cambian las reglas de precio
{
    public decimal Total(IReadOnlyList<LineaDto> lineas, bool esVip)
    {
        decimal total = lineas.Sum(l => l.Precio * l.Cantidad);
        return esVip ? total * 0.9m : total;
    }
}

public interface IPedidoRepository { Task AgregarAsync(Pedido p, CancellationToken ct); }   // cambia si cambia la BD
public interface INotificador      { Task PedidoCreadoAsync(Pedido p, CancellationToken ct); } // cambia si cambia el canal

// El servicio ahora ORQUESTA: su única razón de cambio es el flujo del caso de uso
public sealed class CrearPedidoHandler(
    CalculadoraPrecio precios, IPedidoRepository repo, INotificador notificador)
{
    public async Task<Guid> Handle(PedidoDto dto, CancellationToken ct)
    {
        var pedido = Pedido.Crear(dto.ClienteId, precios.Total(dto.Lineas, dto.EsVip));
        await repo.AgregarAsync(pedido, ct);
        await notificador.PedidoCreadoAsync(pedido, ct);
        return pedido.Id;
    }
}
```

**Señales de violación de SRP en un PR**: clase con >7 dependencias en el constructor, nombres como `Manager`/`Helper`/`Utils`, regiones (`#region`) para separar "partes", tests que necesitan 6 mocks para probar una regla de precio.

> ❓ **Entrevista**: *"¿SRP significa que una clase tenga un solo método?"* → No. Significa **cohesión por motivo de cambio**. Un `Pedido` rico con 10 métodos de dominio cumple SRP si todos cambian cuando cambian las reglas del pedido. Partir demasiado genera el antipatrón opuesto: clases anémicas y lógica dispersa.

---

## 3. O — Open/Closed Principle (OCP)

> *"Abierto a extensión, cerrado a modificación."*

Agregar un comportamiento nuevo debe significar **agregar código**, no editar código probado. El mecanismo en C#: **polimorfismo + DI** (o delegados, Sesión 10).

```csharp
// ❌ Cada método de envío nuevo obliga a abrir y modificar esta clase (y re-testearla entera)
public decimal CostoEnvio(Pedido p, string metodo) => metodo switch
{
    "standard" => 3_990m,
    "express"  => p.Total > 50_000m ? 0m : 7_990m,
    "retiro"   => 0m,
    _ => throw new NotSupportedException(metodo)
};
```

```csharp
// ✅ Extensión = nueva clase registrada en DI. Nada existente se toca.
public interface IMetodoEnvio
{
    string Codigo { get; }
    decimal Costo(Pedido p);
}
public sealed class EnvioStandard : IMetodoEnvio { public string Codigo => "standard"; public decimal Costo(Pedido p) => 3_990m; }
public sealed class EnvioExpress  : IMetodoEnvio { public string Codigo => "express";  public decimal Costo(Pedido p) => p.Total > 50_000m ? 0m : 7_990m; }
// Mañana: public sealed class EnvioDron : IMetodoEnvio { ... }  ← solo esto + 1 línea de registro
```

> ⚠️ Un `switch` **no** es malo per se. Un `switch` sobre un enum cerrado que nunca crece (días de la semana) es perfecto. OCP aplica a los **ejes de variación reales**: los que el negocio ya cambió antes o claramente cambiará. Abstraer todo "por si acaso" viola YAGNI.

---

## 4. L — Liskov Substitution Principle (LSP)

> *"Los subtipos deben ser sustituibles por sus tipos base sin alterar la corrección del programa."*

LSP es sobre **contratos de comportamiento**, no sobre firmas (el compilador ya valida firmas). Un subtipo **no puede**: fortalecer precondiciones, debilitar postcondiciones, romper invariantes, ni lanzar excepciones nuevas que el llamador no espera.

### 4.1 El ejemplo que existe en la BCL

```csharp
ICollection<int> numeros = new int[] { 1, 2, 3 };   // un array implementa ICollection<T>...
numeros.Add(4);                                      // 💥 NotSupportedException en runtime

// ReadOnlyCollection<T> también implementa IList<T> y lanza en Add/Remove.
// Es una violación de LSP heredada de .NET 1.0/2.0 — por eso luego llegaron
// IReadOnlyCollection<T>/IReadOnlyList<T> (.NET 4.5): interfaces que NO prometen escritura.
```

### 4.2 Violación típica en código de negocio

```csharp
public class CuentaBancaria
{
    public decimal Saldo { get; protected set; }
    public virtual void Retirar(decimal monto)
    {
        if (monto > Saldo) throw new InvalidOperationException("Saldo insuficiente");
        Saldo -= monto;
    }
}

// ❌ Fortalece la precondición: el código que funcionaba con CuentaBancaria ahora explota
public class CuentaPlazoFijo : CuentaBancaria
{
    public override void Retirar(decimal monto) =>
        throw new NotSupportedException("No se puede retirar antes del vencimiento");
}
```

**Refactor**: la jerarquía estaba mal modelada. No toda cuenta es "retirable". Separa capacidades (esto conecta con ISP):

```csharp
public abstract class Cuenta { public decimal Saldo { get; protected set; } }
public interface IRetirable { void Retirar(decimal monto); }

public sealed class CuentaCorriente : Cuenta, IRetirable { public void Retirar(decimal m) { /* ... */ } }
public sealed class CuentaPlazoFijo : Cuenta { /* no promete lo que no puede cumplir */ }
```

> ❓ **Entrevista**: *"¿Cuál es la señal más clara de violación de LSP?"* → Un override que lanza `NotSupportedException`/`NotImplementedException`, o código cliente que hace `if (x is TipoDerivado)` para evitar un caso especial. El clásico académico es Rectángulo/Cuadrado: un `Cuadrado` que cambia `Alto` al setear `Ancho` rompe la postcondición de `Rectangulo`.

---

## 5. I — Interface Segregation Principle (ISP)

> *"Ningún cliente debe depender de métodos que no usa."*

```csharp
// ❌ "Fat interface": el reporte de solo lectura depende de métodos de escritura
public interface IProductoRepository
{
    Task<Producto?> ObtenerAsync(int id);
    Task<IReadOnlyList<Producto>> BuscarAsync(string texto);
    Task AgregarAsync(Producto p);
    Task EliminarAsync(int id);
    Task ReindexarBusquedaAsync();      // ← solo lo usa un job nocturno
}

// ✅ Interfaces por rol del cliente. Una clase puede implementar varias.
public interface ILectorProductos   { Task<Producto?> ObtenerAsync(int id); Task<IReadOnlyList<Producto>> BuscarAsync(string t); }
public interface IEscritorProductos { Task AgregarAsync(Producto p); Task EliminarAsync(int id); }
public interface IIndexadorBusqueda { Task ReindexarBusquedaAsync(); }

public sealed class ProductoRepository : ILectorProductos, IEscritorProductos, IIndexadorBusqueda { /* ... */ }
```

```csharp
// Registro: UNA instancia expuesta bajo varias interfaces (mismo scope)
services.AddScoped<ProductoRepository>();
services.AddScoped<ILectorProductos>(sp => sp.GetRequiredService<ProductoRepository>());
services.AddScoped<IEscritorProductos>(sp => sp.GetRequiredService<ProductoRepository>());
```

Beneficios concretos: mocks más pequeños en tests (Sesión 27), permisos más claros (un handler de query **no puede** escribir), y es la base natural de CQRS (Sesión 26).

---

## 6. D — Dependency Inversion Principle (DIP)

> *"Los módulos de alto nivel no deben depender de los de bajo nivel. Ambos deben depender de abstracciones. Y la abstracción la define el de alto nivel."*

Lo viste a fondo en la **Sesión 24** (DIP vs IoC vs DI). El matiz senior que suele faltar es la segunda mitad: **la interfaz pertenece al consumidor**.

```
❌ Sin inversión                       ✅ Con inversión
Application ──▶ Infrastructure         Application ◀── Infrastructure
(usa SqlPedidoRepo)                    (define IPedidoRepository;
                                        Infrastructure lo implementa)
```

```csharp
// ❌ La "abstracción" filtra detalles del bajo nivel: no es inversión real
public interface IPedidoRepository
{
    Task<SqlDataReader> EjecutarAsync(string sql);   // Application ahora "sabe" de SQL Server
}

// ✅ La abstracción habla el idioma del dominio
public interface IPedidoRepository
{
    Task<Pedido?> ObtenerAsync(PedidoId id, CancellationToken ct);
    Task AgregarAsync(Pedido pedido, CancellationToken ct);
}
```

> ❓ **Entrevista**: *"¿DI y DIP son lo mismo?"* → No. **DIP** es un principio de diseño (dirección de las dependencias). **DI** es una técnica (pasar dependencias desde fuera). Puedes hacer DI de clases concretas sin cumplir DIP, y cumplir DIP con un factory manual sin contenedor.

### 6.1 SOLID de un vistazo: violación → síntoma → cura

| Principio | Síntoma en el PR | Refactor típico |
|---|---|---|
| SRP | Clase `XxxManager` de 800 líneas, 9 dependencias | Extraer clases por motivo de cambio |
| OCP | `switch` que crece en cada sprint | Strategy / polimorfismo + DI |
| LSP | Override que lanza `NotSupportedException` | Rediseñar jerarquía, composición |
| ISP | Mocks con 10 `Setup` irrelevantes | Partir la interfaz por rol |
| DIP | `new SqlConnection` en la capa Application | Interfaz definida por el consumidor + DI |

---

## 7. Patrones creacionales en .NET moderno

### 7.1 Factory (y por qué el contenedor ya es una)

Notas generales: [../Diseno/Factory.md](../Diseno/Factory.md) y [../Diseno/AbstractFactory.md](../Diseno/AbstractFactory.md).

En .NET moderno, el contenedor de DI **es** la gran factory. Escribes una factory explícita cuando la creación depende de **datos de runtime** que el contenedor no conoce (un tenant, un parámetro del request):

```csharp
public interface IExportadorFactory { IExportador Crear(FormatoExportacion formato); }

public sealed class ExportadorFactory(IServiceProvider sp) : IExportadorFactory
{
    // Aquí SÍ se permite tocar IServiceProvider: la factory es parte del composition root
    public IExportador Crear(FormatoExportacion formato) => formato switch
    {
        FormatoExportacion.Csv   => sp.GetRequiredService<CsvExportador>(),
        FormatoExportacion.Excel => sp.GetRequiredService<ExcelExportador>(),
        _ => throw new ArgumentOutOfRangeException(nameof(formato))
    };
}
```

Factories que ya usas sin saberlo: `IHttpClientFactory` (Sesión 30), `ILoggerFactory`, `IDbContextFactory<T>` (EF Core en Blazor/background), `ActivatorUtilities.CreateInstance<T>(sp, args)` (mezcla dependencias del contenedor + argumentos manuales).

> ⚠️ Inyectar `IServiceProvider` en clases de negocio es **Service Locator** (antipatrón, Sesión 24 §9). Confínalo a factories dentro de Infrastructure/composition root.

### 7.2 Builder

Notas: [../Diseno/Builder.md](../Diseno/Builder.md). Sirve cuando construir un objeto requiere **muchos pasos opcionales** o **validación al final**. La BCL está llena: `WebApplication.CreateBuilder`, `StringBuilder`, `UriBuilder`, `SqlConnectionStringBuilder`, `HostBuilder`.

```csharp
// Builder fluido para objetos de TEST (muy usado: "Test Data Builder")
public sealed class PedidoBuilder
{
    private Guid _clienteId = Guid.NewGuid();
    private readonly List<(string sku, int cant, decimal precio)> _lineas = [];
    private bool _pagado;

    public PedidoBuilder DeCliente(Guid id)          { _clienteId = id; return this; }
    public PedidoBuilder ConLinea(string sku, int c = 1, decimal p = 1000m) { _lineas.Add((sku, c, p)); return this; }
    public PedidoBuilder Pagado()                    { _pagado = true; return this; }

    public Pedido Build()
    {
        var pedido = Pedido.Crear(_clienteId);
        foreach (var (sku, c, p) in _lineas) pedido.AgregarLinea(sku, c, p);
        if (_lineas.Count == 0) pedido.AgregarLinea("SKU-DEFAULT", 1, 1000m);  // defaults válidos
        if (_pagado) pedido.MarcarPagado();
        return pedido;                        // siempre pasa por los métodos de dominio → invariantes OK
    }
}

// En el test solo se expresa lo relevante:
var pedido = new PedidoBuilder().ConLinea("A", 3).Pagado().Build();
```

> 💡 Con `record` + `required` + `init` (Sesiones 6 y 17), muchos builders de DTOs dejan de hacer falta. Builder se justifica cuando hay **pasos**, **invariantes** o **construcción costosa**.

---

## 8. Strategy: el patrón más usado en backend

Notas: [../Diseno/Strategy.md](../Diseno/Strategy.md). Encapsula algoritmos intercambiables. Es la cura directa del `switch` que viola OCP (§3). En .NET 8 hay tres formas idiomáticas de **seleccionar** la estrategia:

```csharp
public interface IPasarelaPago
{
    string Proveedor { get; }
    Task<ResultadoPago> CobrarAsync(Cobro cobro, CancellationToken ct);
}
public sealed class StripePasarela  : IPasarelaPago { public string Proveedor => "stripe";  /* ... */ }
public sealed class WebpayPasarela  : IPasarelaPago { public string Proveedor => "webpay";  /* ... */ }

// ── Opción A: IEnumerable<T> + diccionario (resolución por dato de runtime) ──
public sealed class ResolvedorPasarela(IEnumerable<IPasarelaPago> pasarelas)
{
    private readonly Dictionary<string, IPasarelaPago> _porNombre =
        pasarelas.ToDictionary(p => p.Proveedor, StringComparer.OrdinalIgnoreCase);

    public IPasarelaPago Para(string proveedor) =>
        _porNombre.TryGetValue(proveedor, out var p) ? p
            : throw new NotSupportedException($"Proveedor {proveedor} no soportado");
}

// ── Opción B: Keyed services (.NET 8, Sesión 24 §7.2) ──
builder.Services.AddKeyedScoped<IPasarelaPago, StripePasarela>("stripe");
builder.Services.AddKeyedScoped<IPasarelaPago, WebpayPasarela>("webpay");

public sealed class CheckoutConStripe([FromKeyedServices("stripe")] IPasarelaPago pasarela) { /* ... */ }
// Resolución dinámica: sp.GetRequiredKeyedService<IPasarelaPago>(proveedor)

// ── Opción C: Strategy "ligera" con delegados (Sesión 10) cuando no hay dependencias ──
public sealed class Redondeo(Func<decimal, decimal> estrategia)
{
    public decimal Aplicar(decimal monto) => estrategia(monto);
}
var clp = new Redondeo(m => Math.Round(m, 0, MidpointRounding.AwayFromZero));
```

| Selección | Cuándo |
|---|---|
| Constructor (una sola impl. por entorno) | La estrategia se decide por configuración al arrancar |
| `IEnumerable<T>` + diccionario | Se decide por dato del request; quieres descubrir todas las impl. |
| Keyed services | Clave conocida en compile-time o resolución puntual |
| `Func<>` | Algoritmo puro, sin dependencias |

> ❓ **Entrevista**: *"¿Strategy vs State?"* → Estructura casi idéntica; cambia la intención. En **Strategy** el cliente elige el algoritmo; en **State** ([../Diseno/State.md](../Diseno/State.md)) el propio objeto cambia de estado y con él su comportamiento, y los estados conocen las transiciones.

---

## 9. Decorator (y Scrutor)

Notas: [../Diseno/Decorator.md](../Diseno/Decorator.md). En la **Sesión 24 §8** hiciste un `CachedProductoRepository` registrado a mano con una factory lambda. Funciona, pero con 3 decoradores anidados el registro se vuelve ilegible. **Scrutor** resuelve eso y además agrega *assembly scanning*.

```csharp
// dotnet add package Scrutor
public interface IProductoRepository { Task<ProductoDto?> ObtenerAsync(int id, CancellationToken ct); }

public sealed class LoggingProductoRepository(IProductoRepository inner, ILogger<LoggingProductoRepository> log)
    : IProductoRepository
{
    public async Task<ProductoDto?> ObtenerAsync(int id, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var r = await inner.ObtenerAsync(id, ct);
        log.LogInformation("ObtenerAsync({Id}) en {Ms} ms, hit={Hit}", id, sw.ElapsedMilliseconds, r is not null);
        return r;
    }
}

// Registro: la implementación base primero, luego decoradores de ADENTRO hacia AFUERA
builder.Services.AddScoped<IProductoRepository, EfProductoRepository>();
builder.Services.Decorate<IProductoRepository, CachedProductoRepository>();   // envuelve a Ef
builder.Services.Decorate<IProductoRepository, LoggingProductoRepository>();  // envuelve a Cached
```

```
Consumidor ─▶ LoggingProductoRepository      (último Decorate = capa más externa)
                 └─▶ CachedProductoRepository
                        └─▶ EfProductoRepository ─▶ SQL
```

Scrutor también registra por convención (útil para Strategy o handlers):

```csharp
builder.Services.Scan(scan => scan
    .FromAssemblyOf<StripePasarela>()
    .AddClasses(c => c.AssignableTo<IPasarelaPago>())
    .AsImplementedInterfaces()
    .WithScopedLifetime());
```

> ⚠️ **El orden importa**. ¿Logging por fuera del caché? Entonces logueas también los hits. ¿Por dentro? Solo mides los accesos reales a BD. Decide explícitamente. Y cuida los **lifetimes**: un decorador Singleton sobre un repo Scoped es una *captive dependency* (Sesión 24 §5).

> ❓ **Entrevista**: *"¿Decorator vs herencia?"* → La herencia fija el comportamiento en compile-time y explota combinatoriamente (`CachedLoggedRepo`, `LoggedRetryRepo`...). El decorador **compone** en runtime, respeta OCP y cada capa se testea sola. Ejemplos en la BCL: `BufferedStream`/`GZipStream` envolviendo `Stream`, y los `DelegatingHandler` de `HttpClient`.

---

## 10. Adapter

Notas: [../Diseno/Adapter.md](../Diseno/Adapter.md). Convierte una interfaz ajena (SDK de terceros, sistema legacy) en **tu** interfaz. Es la pieza que hace posible el DIP (§6) con librerías externas y es el corazón de la arquitectura hexagonal (*ports & adapters*, Sesión 26).

```csharp
// Tu puerto (definido en Application, en tu idioma)
public interface IAlmacenArchivos
{
    Task<Uri> SubirAsync(string nombre, Stream contenido, CancellationToken ct);
}

// Adapter para AWS S3 (vive en Infrastructure). El SDK de AWS NO se filtra hacia adentro.
public sealed class S3AlmacenArchivos(IAmazonS3 s3, IOptions<S3Options> opt) : IAlmacenArchivos
{
    public async Task<Uri> SubirAsync(string nombre, Stream contenido, CancellationToken ct)
    {
        await s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = opt.Value.Bucket, Key = nombre, InputStream = contenido
        }, ct);
        return new Uri($"https://{opt.Value.Bucket}.s3.amazonaws.com/{Uri.EscapeDataString(nombre)}");
    }
}
// Mañana migras a Azure Blob: nuevo adapter, cero cambios en Application ni en tests de dominio.
```

| Patrón | Intención |
|---|---|
| **Adapter** | Cambiar la *forma* de una interfaz existente para que encaje |
| **Decorator** | Misma interfaz, *agregar* comportamiento |
| **Facade** ([../Diseno/Facade.md](../Diseno/Facade.md)) | Interfaz *simplificada* sobre un subsistema complejo |
| **Proxy** | Misma interfaz, *controlar acceso* (lazy, remoto, permisos) |

> ⚠️ También se adapta **el error**: traduce `AmazonS3Exception` a tu propia excepción o `Result` en el adapter. Si el llamador tiene que hacer `catch (AmazonS3Exception)`, el adapter está incompleto.

---

## 11. Observer y Mediator

### 11.1 Observer

Notas: [../Diseno/Observer.md](../Diseno/Observer.md). En C# es un ciudadano de primera clase: los `event` de la **Sesión 11** son Observer implementado en el lenguaje. También existe `IObservable<T>`/`IObserver<T>` (base de Rx.NET) para *streams* de eventos.

En backend, el uso moderno es **Domain Events** (Sesión 26 §4.4): el aggregate "publica" y varios handlers reaccionan sin que el aggregate los conozca.

```csharp
public sealed record PedidoPagado(Guid PedidoId, decimal Total) : IDomainEvent;

public interface IDomainEventHandler<in TEvent> where TEvent : IDomainEvent
{
    Task Handle(TEvent e, CancellationToken ct);
}

// N observadores independientes — agregar uno nuevo no toca a los demás (OCP)
public sealed class EnviarBoleta(IFacturacion f)   : IDomainEventHandler<PedidoPagado> { public Task Handle(PedidoPagado e, CancellationToken ct) => f.EmitirAsync(e.PedidoId, ct); }
public sealed class SumarPuntos(IFidelizacion fid) : IDomainEventHandler<PedidoPagado> { public Task Handle(PedidoPagado e, CancellationToken ct) => fid.AcumularAsync(e.PedidoId, e.Total, ct); }

// Dispatcher mínimo
public sealed class DomainEventDispatcher(IServiceProvider sp)
{
    public async Task PublicarAsync<TEvent>(TEvent e, CancellationToken ct) where TEvent : IDomainEvent
    {
        foreach (var h in sp.GetServices<IDomainEventHandler<TEvent>>())
            await h.Handle(e, ct);   // secuencial: un handler que falla detiene al resto → decide tu política
    }
}
```

> ⚠️ **Memory leak clásico del Observer**: un suscriptor de vida corta que se suscribe al `event` de un objeto de vida larga (Singleton) y nunca hace `-=`. El publicador mantiene una referencia fuerte al suscriptor → el GC nunca lo recoge (Sesión 14).

> ⚠️ Observer **en proceso** no es mensajería. Si el proceso muere entre el `SaveChanges` y el handler, el evento se pierde. Para efectos que *deben* ocurrir (emitir la boleta), usa **Outbox** + broker (Sesión 34).

### 11.2 Mediator

Lo implementaste con MediatR en la **Sesión 26 §6.3**. En resumen: los objetos no se hablan entre sí, hablan con un mediador que enruta. Aporta desacoplamiento emisor/handler y un punto único para *cross-cutting concerns*.

```
Sin mediator:  Controller ─▶ HandlerA, HandlerB, ValidatorA, Logger...   (N×M dependencias)
Con mediator:  Controller ─▶ ISender ─▶ [pipeline] ─▶ Handler            (1 dependencia)
```

> ❓ **Entrevista**: *"¿Observer vs Mediator?"* → **Observer**: 1 publicador → N suscriptores, el publicador no sabe quién escucha (notificación). **Mediator**: centraliza la comunicación entre muchos colegas; en MediatR, `Send` es 1→1 (request/handler, estilo Mediator) y `Publish` es 1→N (`INotification`, estilo Observer).

---

## 12. Chain of Responsibility: pipelines

Una petición pasa por una cadena de handlers; cada uno decide **procesar, delegar al siguiente, o cortocircuitar**. Es probablemente el patrón más omnipresente en ASP.NET Core, aunque nadie lo llame por su nombre:

| Dónde | El "siguiente eslabón" |
|---|---|
| Middleware ASP.NET Core (Sesiones 23/33) | `await next(context)` |
| `DelegatingHandler` de `HttpClient` | `base.SendAsync(request, ct)` |
| MediatR `IPipelineBehavior` (Sesión 26) | `await next()` |
| Polly / `Microsoft.Extensions.Resilience` (Sesión 34) | estrategias encadenadas |

```csharp
// DelegatingHandler: agrega un header de correlación a TODAS las llamadas salientes
public sealed class CorrelationIdHandler(IHttpContextAccessor accessor) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
    {
        var id = accessor.HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();
        req.Headers.TryAddWithoutValidation("X-Correlation-Id", id);
        return base.SendAsync(req, ct);   // ← pasa al siguiente eslabón de la cadena
    }
}

builder.Services.AddTransient<CorrelationIdHandler>();
builder.Services.AddHttpClient<IInventarioClient, InventarioClient>()
    .AddHttpMessageHandler<CorrelationIdHandler>()      // eslabón 1
    .AddStandardResilienceHandler();                    // eslabón 2 (reintentos, timeout, circuit breaker)
```

Versión "de negocio" hecha a mano — reglas de aprobación de un crédito:

```csharp
public abstract class ReglaAprobacion
{
    private ReglaAprobacion? _siguiente;
    public ReglaAprobacion Luego(ReglaAprobacion s) { _siguiente = s; return s; }

    public Decision Evaluar(Solicitud s) =>
        EvaluarPropia(s) ?? _siguiente?.Evaluar(s) ?? Decision.Aprobada;   // null = "no me corresponde, sigue"

    protected abstract Decision? EvaluarPropia(Solicitud s);
}
public sealed class ReglaListaNegra : ReglaAprobacion { protected override Decision? EvaluarPropia(Solicitud s) => s.EnListaNegra ? Decision.Rechazada("Lista negra") : null; }
public sealed class ReglaMonto      : ReglaAprobacion { protected override Decision? EvaluarPropia(Solicitud s) => s.Monto > 10_000_000m ? Decision.RevisionManual : null; }

var cadena = new ReglaListaNegra();
cadena.Luego(new ReglaMonto()).Luego(new ReglaScore());
var decision = cadena.Evaluar(solicitud);
```

> ⚠️ En una cadena **el orden es semántica**. `UseAuthentication` antes de `UseAuthorization`; el handler de reintentos por fuera del de timeout-por-intento. Un bug de orden no lo detecta el compilador: cúbrelo con tests de integración.

---

## 13. Specification y Result

### 13.1 Specification

Encapsula un **criterio de negocio** reutilizable y combinable. Con EF Core se implementa sobre `Expression<Func<T,bool>>` para que se **traduzca a SQL** (no se evalúe en memoria — Sesión 25 §5.1).

```csharp
public abstract class Specification<T>
{
    public abstract Expression<Func<T, bool>> Criterio { get; }
    public bool EsSatisfechaPor(T entidad) => Criterio.Compile()(entidad);   // para validar en memoria

    public Specification<T> And(Specification<T> otra) => new AndSpec<T>(this, otra);
}

internal sealed class AndSpec<T>(Specification<T> a, Specification<T> b) : Specification<T>
{
    public override Expression<Func<T, bool>> Criterio
    {
        get
        {
            // Reescribe el parámetro de b para que ambas expresiones compartan el mismo "x"
            var p = Expression.Parameter(typeof(T), "x");
            var cuerpo = Expression.AndAlso(
                Expression.Invoke(a.Criterio, p), Expression.Invoke(b.Criterio, p));
            return Expression.Lambda<Func<T, bool>>(cuerpo, p);   // EF Core 3+ "inlinea" los Invoke antes de traducir
            // (Compile() lo soporta; algunos providers IQueryable no-EF no: alternativa = ExpressionVisitor que reemplaza parámetros)
        }
    }
}

public sealed class ClienteMoroso(DateTime hoy) : Specification<Cliente>
{
    public override Expression<Func<Cliente, bool>> Criterio =>
        c => c.Facturas.Any(f => !f.Pagada && f.Vencimiento < hoy.AddDays(-30));
}
public sealed class ClienteActivo : Specification<Cliente>
{
    public override Expression<Func<Cliente, bool>> Criterio => c => c.Activo;
}

// Uso: se traduce a un único WHERE ... AND EXISTS(...) en SQL
var spec = new ClienteActivo().And(new ClienteMoroso(DateTime.UtcNow));
var morosos = await db.Clientes.Where(spec.Criterio).ToListAsync(ct);
```

> 💡 En proyectos reales se usa **Ardalis.Specification**, que además encapsula `Include`, orden y paginación. Es útil sobre todo si usas Repository genérico (Sesión 26 §7). Si consultas `DbContext` directo, un método de extensión `IQueryable<Cliente>.Morosos(hoy)` suele ser más simple — y es aceptable.

### 13.2 Result pattern (más allá de la Sesión 26)

En la **Sesión 26 §5.1** definiste `Result`/`Result<T>`. Lo que eleva el patrón a nivel producción es: (1) componerlo sin `if` anidados y (2) mapearlo a HTTP en **un solo lugar**.

```csharp
public static class ResultExtensions
{
    // Encadenar pasos: si uno falla, los siguientes no se ejecutan ("railway-oriented programming")
    public static async Task<Result<TOut>> Then<TIn, TOut>(
        this Task<Result<TIn>> task, Func<TIn, Task<Result<TOut>>> siguiente)
    {
        var r = await task;
        return r.IsSuccess ? await siguiente(r.Value) : Result<TOut>.Failure(r.Error);
    }

    // Traducción ÚNICA a HTTP (Problem Details, RFC 9457)
    public static IResult ToHttp<T>(this Result<T> r) => r.IsSuccess
        ? Results.Ok(r.Value)
        : r.Error.Code switch
        {
            var c when c.EndsWith(".NotFound")   => Results.Problem(r.Error.Message, statusCode: 404),
            var c when c.EndsWith(".Conflict")   => Results.Problem(r.Error.Message, statusCode: 409),
            var c when c.EndsWith(".Validation") => Results.Problem(r.Error.Message, statusCode: 400),
            _                                    => Results.Problem(r.Error.Message, statusCode: 422)
        };
}

// El endpoint queda en una línea: el flujo de errores ya está en la firma de los métodos
app.MapPost("/pedidos/{id:guid}/pagar", async (Guid id, PagarPedidoHandler h, CancellationToken ct) =>
    (await h.Handle(id, ct).Then(p => h.EmitirComprobante(p, ct))).ToHttp());
```

| Enfoque | Pros | Contras |
|---|---|---|
| Excepciones para flujo | Idiomático en .NET, stack trace | Caras (Sesión 12), flujo invisible en la firma |
| `Result<T>` | Fallos explícitos en la firma, rápido | Verboso sin helpers; el llamador puede ignorarlo |
| Librerías (`ErrorOr`, `FluentResults`, `OneOf`) | Helpers listos, *discriminated unions* | Otra dependencia; el equipo debe adoptarla |

---

## 14. Antipatrones que un senior bloquea en code review

| Antipatrón | Qué es | Cura |
|---|---|---|
| **God Object** | Una clase que sabe/hace todo (`AppManager`) | SRP, extraer colaboradores |
| **Service Locator** | `sp.GetService<T>()` dentro de la lógica (Sesión 24 §9) | Inyección por constructor |
| **Singleton estático** | `Config.Instance`, estado global mutable ([../Diseno/Singleton.md](../Diseno/Singleton.md)) | Lifetime Singleton del contenedor |
| **Anemic Domain Model** | Entidades solo con getters/setters; reglas en "services" (Sesión 26 §4.2) | Mover comportamiento al dominio |
| **Primitive Obsession** | `string email`, `decimal monto` sin moneda, `Guid` intercambiables | Value Objects, `record struct PedidoId(Guid Value)` |
| **Shotgun Surgery** | Un cambio pequeño toca 15 archivos | Agrupar lo que cambia junto (cohesión) |
| **Speculative Generality** | Interfaces con 1 implementación "por si acaso", genéricos sin uso | YAGNI; abstrae cuando aparece la 2ª variante |
| **Lava Flow / Dead code** | Código que nadie entiende ni se atreve a borrar | Tests de caracterización + borrar |
| **Exceptions as control flow** | `try { int.Parse } catch` para validar | `TryParse`, `Result` |
| **Leaky abstraction** | `IRepository` que devuelve `IQueryable` o `SqlDataReader` | Contratos en idioma de dominio |

```csharp
// Primitive obsession → el compilador ya no deja confundir ids
public readonly record struct ClienteId(Guid Value);
public readonly record struct PedidoId(Guid Value);

void Cancelar(PedidoId pedido, ClienteId solicitante) { /* ... */ }
// Cancelar(clienteId, pedidoId);   // ❌ ya no compila: antes era Cancelar(Guid, Guid) y pasaba
```

> ❓ **Entrevista**: *"¿Una interfaz por cada clase es buena práctica?"* → No automáticamente. Una interfaz se justifica si hay (a) más de una implementación real, (b) una frontera de arquitectura (DIP hacia Infrastructure), o (c) necesidad de sustituirla en tests por algo que no puedes instanciar (I/O). Clases de dominio puras y calculadoras sin I/O se testean directamente, sin interfaz.

---

## 15. ¿Cómo elegir? (cheat-sheet)

```
¿El algoritmo varía según un dato?            → Strategy (DI / keyed / diccionario)
¿Crear depende de datos de runtime?           → Factory (o ActivatorUtilities)
¿Construcción con muchos pasos opcionales?    → Builder (o record + init)
¿Agregar caché/log/retry sin tocar la clase?  → Decorator (Scrutor)
¿Encajar un SDK ajeno en tu interfaz?         → Adapter
¿Reaccionar a algo sin acoplar al emisor?     → Observer / Domain Events
¿Cross-cutting en casos de uso?               → Mediator + pipeline behaviors
¿Procesar en etapas con posible corte?        → Chain of Responsibility
¿Criterio de negocio reutilizable en queries? → Specification
¿Fallo de negocio esperado?                   → Result
¿Nada de lo anterior duele todavía?           → código simple. No apliques nada.
```

---

## Resumen mental de la sesión

```
SOLID = gestionar el cambio
  S  una razón (un actor) para cambiar        → extraer colaboradores
  O  extender agregando, no editando          → polimorfismo + DI
  L  subtipos cumplen el CONTRATO de la base  → sin NotSupportedException
  I  interfaces por rol del cliente           → mocks pequeños, base de CQRS
  D  alto nivel define la abstracción         → Infrastructure implementa

Patrones .NET modernos
  Creacionales : Factory (el contenedor ya lo es) · Builder (tests, config)
  Estructurales: Decorator (Scrutor.Decorate, orden = capas) · Adapter (ports & adapters)
  Comportamiento: Strategy (keyed/IEnumerable) · Observer (events, domain events)
                  Mediator (MediatR Send/Publish) · Chain (middleware, DelegatingHandler)
  De dominio   : Specification (Expression → SQL) · Result (fallos esperados, HTTP en 1 lugar)

Regla de oro: el patrón aparece cuando la 2ª variante duele, no antes (YAGNI)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Define SRP con la formulación del "actor". ¿Por qué "hacer una sola cosa" es impreciso?
2. ❓ Da un ejemplo de violación de LSP presente en la propia BCL de .NET y cómo se corrigió.
3. ❓ ¿Cuándo un `switch` NO viola OCP?
4. ❓ ¿DIP, IoC y DI son lo mismo? ¿Quién debe ser dueño de la interfaz?
5. ❓ Tres formas de resolver una Strategy en .NET 8 y cuándo usar cada una.
6. ❓ Con Scrutor registras `Decorate<Cached>` y luego `Decorate<Logging>`. ¿Cuál es la capa externa? ¿Qué implicancia tiene para el logging?
7. ❓ Decorator vs Adapter vs Proxy vs Facade.
8. ❓ ¿Qué memory leak típico produce Observer con `event` en C#?
9. ❓ Observer vs Mediator. ¿Cómo se mapean a `Publish` y `Send` de MediatR?
10. ❓ Nombra tres Chain of Responsibility de ASP.NET Core / HttpClient. ¿Por qué importa el orden?
11. ❓ ¿Por qué una Specification para EF Core debe usar `Expression<Func<T,bool>>` y no `Func<T,bool>`?
12. ❓ ¿Cuándo usar `Result` y cuándo una excepción? ¿Una interfaz por cada clase es buena práctica?

## Ejercicio práctico
1. Toma este "God service" y refactorízalo aplicando SOLID:
   ```csharp
   public class FacturaService
   {
       public void Emitir(Factura f, string pais)
       {
           if (pais == "CL") f.Impuesto = f.Neto * 0.19m;
           else if (pais == "PE") f.Impuesto = f.Neto * 0.18m;
           else if (pais == "MX") f.Impuesto = f.Neto * 0.16m;
           File.WriteAllText($"c:/facturas/{f.Id}.json", JsonSerializer.Serialize(f));
           new SmtpClient("smtp.x.com").Send("a@x.com", f.Email, "Factura", "Adjunta");
       }
   }
   ```
2. Implementa el cálculo de impuestos como **Strategy** por país con **keyed services**.
3. Crea `IAlmacenFacturas` con un **Adapter** a disco local y otro en memoria para tests.
4. Agrega con **Scrutor** un decorador de logging y otro de reintentos (Polly) sobre `IAlmacenFacturas`. Escribe un test que verifique el orden de las capas.
5. Modela "factura vencida y de monto alto" como dos **Specifications** combinadas con `And` y verifica con `ToQueryString()` (Sesión 25) que se traduce a un único `WHERE`.
6. Haz que `Emitir` devuelva `Result<FacturaId>` y mapea sus errores a HTTP con un único `ToHttp()` en una Minimal API.
7. (Opcional) Revisa un proyecto tuyo y encuentra un ejemplo real de cada antipatrón de §14.

---

➡️ **Cuando termines**, marca la Sesión 37 en el [README](Readme.md) y pídeme la **Sesión 38 — SQL para desarrolladores .NET (SQL básico → intermedio, índices, ADO.NET y Dapper)**.
