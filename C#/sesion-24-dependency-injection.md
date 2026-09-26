# Sesión 24 — Dependency Injection: desacoplar, componer y controlar lifetimes

> **Objetivo de la sesión**: entender *por qué* existe la inyección de dependencias (no solo *cómo* se usa), dominar el contenedor nativo de .NET (`Microsoft.Extensions.DependencyInjection`), elegir correctamente entre **Transient, Scoped y Singleton**, detectar y evitar **captive dependencies**, y manejar escenarios avanzados: múltiples implementaciones, keyed services (.NET 8), factories, decoradores, `IServiceScopeFactory` en background services y cuándo el Service Locator es un antipatrón.

---

## 1. El problema: acoplamiento

```csharp
// ❌ Sin DI: la clase CREA sus dependencias
public class PedidoService
{
    private readonly SqlPedidoRepository _repo = new("Server=prod;...");  // cadena fija
    private readonly SmtpEmailSender _email = new("smtp.empresa.cl", 587); // implementación concreta

    public void Confirmar(int pedidoId)
    {
        var pedido = _repo.Obtener(pedidoId);
        pedido.Confirmar();
        _repo.Guardar(pedido);
        _email.Enviar(pedido.ClienteEmail, "Pedido confirmado");
    }
}
```

Problemas:
- **No testeable**: para probar `Confirmar` necesitas una base de datos real y un servidor SMTP (Sesión 27).
- **Rígido**: cambiar SMTP por SendGrid o SES obliga a modificar `PedidoService`.
- **Configuración enterrada**: la cadena de conexión está hardcodeada.
- **Ciclo de vida descontrolado**: ¿quién hace `Dispose` de la conexión?

## 2. Los conceptos: DIP, IoC y DI

Tres ideas relacionadas que en entrevista **no** debes confundir:

| Concepto | Qué es |
|---|---|
| **DIP** — Dependency Inversion Principle (la "D" de SOLID) | Un **principio de diseño**: los módulos de alto nivel no deben depender de los de bajo nivel; ambos deben depender de **abstracciones**. |
| **IoC** — Inversion of Control | Un **principio más general**: el control del flujo (o de la creación de objetos) lo tiene un framework, no tu código. *"Don't call us, we'll call you"*. |
| **DI** — Dependency Injection | Una **técnica** concreta para aplicar IoC/DIP: las dependencias se **entregan desde afuera** (normalmente por constructor) en vez de crearse adentro. |
| **Contenedor DI / IoC container** | La **herramienta** que automatiza la DI: sabe qué implementación corresponde a cada abstracción, las crea, las inyecta y gestiona su ciclo de vida. |

```
Sin DIP:   PedidoService ───────▶ SqlPedidoRepository      (alto nivel depende de bajo nivel)

Con DIP:   PedidoService ───────▶ IPedidoRepository ◀─────── SqlPedidoRepository
                                  (abstracción)              (detalle implementa la abstracción)
```

```csharp
// ✅ Con DI: la clase DECLARA lo que necesita; alguien más se lo entrega
public interface IPedidoRepository
{
    Task<Pedido?> ObtenerAsync(int id, CancellationToken ct);
    Task GuardarAsync(Pedido pedido, CancellationToken ct);
}

public interface IEmailSender
{
    Task EnviarAsync(string to, string asunto, CancellationToken ct);
}

public class PedidoService(IPedidoRepository repo, IEmailSender email, ILogger<PedidoService> logger)
{
    public async Task ConfirmarAsync(int pedidoId, CancellationToken ct)
    {
        var pedido = await repo.ObtenerAsync(pedidoId, ct)
                     ?? throw new NotFoundException($"Pedido {pedidoId}");
        pedido.Confirmar();
        await repo.GuardarAsync(pedido, ct);
        await email.EnviarAsync(pedido.ClienteEmail, "Pedido confirmado", ct);
        logger.LogInformation("Pedido {Id} confirmado", pedidoId);
    }
}
```

> ❓ **Entrevista**: *"¿DI e IoC son lo mismo?"* → No. IoC es el principio general (el framework controla); DI es una forma de implementarlo (las dependencias se inyectan). Otras formas de IoC: eventos, template method, service locator.

### 2.1 Formas de inyección

| Tipo | Cómo | Cuándo |
|---|---|---|
| **Constructor** | Parámetros del constructor | ✅ **Por defecto**. Dependencias obligatorias, objeto válido desde que nace, inmutable. |
| **Método / parámetro** | Parámetro de un método (`[FromServices]`, parámetros de Minimal API, `InvokeAsync` de middleware) | Dependencia usada solo en una operación. |
| **Propiedad** | Setter público | Dependencias opcionales. El contenedor nativo **no** la soporta (Autofac sí). Úsala poco. |

---

## 3. El contenedor nativo de .NET

Vive en `Microsoft.Extensions.DependencyInjection` y viene integrado en ASP.NET Core, Worker Services y cualquier app con `Host`. Dos piezas:

- **`IServiceCollection`**: la lista de *registros* ("para `IEmailSender` usa `SesEmailSender` como singleton"). Se llena antes de `Build()`.
- **`IServiceProvider`**: el contenedor ya construido que *resuelve* instancias.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IPedidoRepository, EfPedidoRepository>();
builder.Services.AddSingleton<IEmailSender, SesEmailSender>();
builder.Services.AddScoped<PedidoService>();              // registrar una clase concreta también es válido

var app = builder.Build();                                  // IServiceCollection → IServiceProvider

app.MapPost("/pedidos/{id:int}/confirmacion",
    async (int id, PedidoService svc, CancellationToken ct) =>   // inyección por parámetro
    {
        await svc.ConfirmarAsync(id, ct);
        return TypedResults.NoContent();
    });

app.Run();
```

Al resolver `PedidoService`, el contenedor ve su constructor, resuelve recursivamente `IPedidoRepository`, `IEmailSender` y `ILogger<PedidoService>`, y arma el **grafo de objetos** completo.

```
PedidoService
 ├── IPedidoRepository → EfPedidoRepository
 │                         └── TiendaDbContext (scoped) → DbContextOptions
 ├── IEmailSender      → SesEmailSender (singleton)
 │                         └── IOptions<SesOptions>
 └── ILogger<PedidoService>  (registrado por el host)
```

> ⚠️ Si hay **varios constructores**, el contenedor elige el que tenga más parámetros que *pueda* resolver. Si hay ambigüedad, lanza excepción. Regla práctica: **un solo constructor público**.

---

## 4. Lifetimes: la parte que más preguntan

| Lifetime | Instancias | Se destruye (`Dispose`) | Uso típico |
|---|---|---|---|
| **Transient** | **Una nueva cada vez** que se resuelve | Al terminar el scope que la creó | Servicios livianos y sin estado |
| **Scoped** | **Una por scope** (en ASP.NET Core: una por request HTTP) | Al terminar el scope (fin de la request) | `DbContext`, Unit of Work, contexto del usuario/tenant actual |
| **Singleton** | **Una para toda la vida de la app** | Al apagar la app | Caches, configuración, clientes thread-safe, `HttpClient` handlers |

```
Tiempo ──────────────────────────────────────────────────────────▶
App  [━━━━━━━━━━━━━━━━━━━━━ Singleton S1 ━━━━━━━━━━━━━━━━━━━━━━━━━]

Request 1 [━━━ Scoped A1 ━━━]
           T1  T2  T3                 ← Transient: una por cada resolución

Request 2              [━━━ Scoped A2 ━━━]
                        T4  T5
```

### 4.1 Demostración ejecutable

```csharp
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddTransient<TransientDep>();
services.AddScoped<ScopedDep>();
services.AddSingleton<SingletonDep>();

// validateScopes: detecta captive dependencies (activo por defecto en Development en ASP.NET Core)
using var provider = services.BuildServiceProvider(new ServiceProviderOptions
{
    ValidateScopes = true,
    ValidateOnBuild = true
});

for (int request = 1; request <= 2; request++)
{
    using var scope = provider.CreateScope();       // simula una request HTTP
    var sp = scope.ServiceProvider;

    Console.WriteLine($"--- Request {request} ---");
    Console.WriteLine($"Transient: {sp.GetRequiredService<TransientDep>().Id} / {sp.GetRequiredService<TransientDep>().Id}");
    Console.WriteLine($"Scoped:    {sp.GetRequiredService<ScopedDep>().Id} / {sp.GetRequiredService<ScopedDep>().Id}");
    Console.WriteLine($"Singleton: {sp.GetRequiredService<SingletonDep>().Id} / {sp.GetRequiredService<SingletonDep>().Id}");
}   // ← aquí se hace Dispose de los scoped y transient de ese scope

abstract class Dep : IDisposable
{
    public string Id { get; } = Guid.NewGuid().ToString()[..4];
    public void Dispose() => Console.WriteLine($"  Dispose {GetType().Name} {Id}");
}
class TransientDep : Dep;
class ScopedDep : Dep;
class SingletonDep : Dep;

// Salida (ids ilustrativos):
// --- Request 1 ---
// Transient: 3f1a / 9c02      ← distintos siempre
// Scoped:    77b0 / 77b0      ← iguales dentro de la request
// Singleton: e5d4 / e5d4
//   Dispose ScopedDep 77b0    ← orden INVERSO a la creación
//   Dispose TransientDep 9c02
//   Dispose TransientDep 3f1a
// --- Request 2 ---
// Transient: a8e1 / 0b6f
// Scoped:    41c9 / 41c9      ← distinto de la request 1
// Singleton: e5d4 / e5d4      ← el mismo de siempre
// ...
//   Dispose SingletonDep e5d4 ← solo al disponer el provider (fin de la app)
```

### 4.2 ¿Cómo elegir?

```
¿Tiene estado mutable compartido o es caro de crear? ──▶ ¿Es thread-safe? ── sí ──▶ Singleton
                                                                         └─ no ──▶ ⚠️ rediseña o Scoped
¿Depende de algo por-request (DbContext, usuario actual)? ──────────────────────▶ Scoped
¿Es liviano, sin estado? ──────────────────────────────────────────────────────▶ Transient (o Singleton si no tiene deps scoped)
```

> ⚠️ Un **singleton se usa concurrentemente** desde todas las requests. Si guarda estado en un `Dictionary` normal o en campos mutables, tendrás *race conditions* (Sesión 29). Usa `ConcurrentDictionary`, inmutabilidad o locks.

> ⚠️ El contenedor **solo hace `Dispose` de lo que él creó**. Si registras una instancia ya creada (`AddSingleton(new MiServicio())`), su `Dispose` es responsabilidad tuya.

> ⚠️ Transients `IDisposable` resueltos desde el **root provider** (fuera de un scope) se acumulan hasta que la app termina → **fuga de memoria**. Resuélvelos siempre dentro de un scope.

---

## 5. Captive dependency: el bug clásico

Una **captive dependency** ocurre cuando un servicio de vida **larga** captura uno de vida **corta**:

```csharp
builder.Services.AddDbContext<TiendaDbContext>(...);   // Scoped (por defecto)
builder.Services.AddSingleton<CacheDeProductos>();      // Singleton

public class CacheDeProductos(TiendaDbContext db)       // ❌ captura un scoped para siempre
{
    public Task<List<Producto>> TodosAsync() => db.Productos.ToListAsync();
}
```

¿Qué pasa? El singleton se crea una vez con **el `DbContext` de la primera request**. Ese `DbContext`:
- Se **dispone** al terminar esa request → `ObjectDisposedException` después.
- Si no se dispusiera, se **comparte entre hilos** → `DbContext` no es thread-safe → excepciones o datos corruptos.
- Su change tracker crece indefinidamente → fuga de memoria.

| Quién depende de quién | ¿OK? |
|---|---|
| Transient → cualquier cosa | ✅ |
| Scoped → Scoped / Singleton | ✅ |
| Scoped → Transient | ✅ (el transient vive lo que el scoped) |
| **Singleton → Scoped** | ❌ **Captive dependency** |
| Singleton → Transient | ⚠️ El transient se vuelve singleton de facto |

ASP.NET Core en `Development` activa `ValidateScopes` y lanza: *"Cannot consume scoped service 'TiendaDbContext' from singleton 'CacheDeProductos'"*. En `Production` esa validación está **apagada** por performance: por eso los bugs aparecen en prod.

### 5.1 La solución: crear un scope explícito

```csharp
public class CacheDeProductos(IServiceScopeFactory scopeFactory, ILogger<CacheDeProductos> logger)
{
    private IReadOnlyList<ProductoDto> _cache = [];

    public IReadOnlyList<ProductoDto> Actual => _cache;   // lectura atómica de una referencia

    public async Task RefrescarAsync(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();     // scope propio, corto
        var db = scope.ServiceProvider.GetRequiredService<TiendaDbContext>();

        _cache = await db.Productos.AsNoTracking()
            .Select(p => new ProductoDto(p.Id, p.Nombre, p.Precio, 0))
            .ToListAsync(ct);                                        // reemplazo atómico

        logger.LogInformation("Cache refrescada con {N} productos", _cache.Count);
    }   // ← aquí se dispone el DbContext
}
```

Mismo patrón para **`BackgroundService`** (que es singleton):

```csharp
public class RefrescoCacheWorker(CacheDeProductos cache) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        do
        {
            try { await cache.RefrescarAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { /* loguear y seguir: una excepción no manejada detiene el host en .NET 6+ */ }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

builder.Services.AddSingleton<CacheDeProductos>();
builder.Services.AddHostedService<RefrescoCacheWorker>();
```

> ❓ **Entrevista**: *"¿Cómo usas un DbContext dentro de un BackgroundService?"* → Inyectando `IServiceScopeFactory` y creando un scope por unidad de trabajo (por mensaje, por iteración). Nunca inyectando el `DbContext` directamente. Alternativa específica de EF: `IDbContextFactory<T>` (Sesión 25).

---

## 6. Formas de registrar

```csharp
// 1. Interfaz → implementación
services.AddScoped<IPedidoRepository, EfPedidoRepository>();

// 2. Tipo concreto
services.AddScoped<PedidoService>();

// 3. Factory: cuando la construcción necesita lógica
services.AddSingleton<IStorage>(sp =>
{
    var opts = sp.GetRequiredService<IOptions<StorageOptions>>().Value;
    return opts.Proveedor == "s3"
        ? new S3Storage(opts.Bucket)
        : new DiscoLocalStorage(opts.Ruta);
});

// 4. Instancia existente (el contenedor NO la dispone)
services.AddSingleton(TimeProvider.System);     // .NET 8: abstracción de tiempo testeable

// 5. Genéricos abiertos
services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
// IRepository<Cliente> → EfRepository<Cliente>, IRepository<Pedido> → EfRepository<Pedido>...

// 6. TryAdd: registra SOLO si no existe (típico en librerías, para no pisar lo del usuario)
services.TryAddSingleton<IEmailSender, SmtpEmailSender>();

// 7. Una implementación, varias interfaces, MISMA instancia
services.AddSingleton<RelojSistema>();
services.AddSingleton<IReloj>(sp => sp.GetRequiredService<RelojSistema>());
services.AddSingleton<IFechaActual>(sp => sp.GetRequiredService<RelojSistema>());
```

> ⚠️ `services.AddSingleton<IReloj, RelojSistema>(); services.AddSingleton<IFechaActual, RelojSistema>();` crea **dos** instancias distintas de `RelojSistema`. Si necesitas una sola, usa el patrón 7.

### 6.1 Organización: métodos de extensión

```csharp
public static class InfraestructuraExtensions
{
    public static IServiceCollection AddInfraestructura(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<TiendaDbContext>(o => o.UseNpgsql(config.GetConnectionString("Default")));
        services.AddScoped<IPedidoRepository, EfPedidoRepository>();
        services.AddSingleton<IEmailSender, SesEmailSender>();
        return services;   // permite encadenar
    }
}

// Program.cs queda legible
builder.Services
    .AddAplicacion()
    .AddInfraestructura(builder.Configuration);
```

Así lo hace el propio framework (`AddControllers`, `AddDbContext`, `AddHttpClient`) y es la base para Clean Architecture (Sesión 26).

---

## 7. Múltiples implementaciones

### 7.1 `IEnumerable<T>`: todas

```csharp
services.AddScoped<INotificador, EmailNotificador>();
services.AddScoped<INotificador, SmsNotificador>();
services.AddScoped<INotificador, PushNotificador>();

public class Notificaciones(IEnumerable<INotificador> notificadores)
{
    public Task NotificarTodosAsync(string msg) =>
        Task.WhenAll(notificadores.Select(n => n.EnviarAsync(msg)));  // patrón composite / strategy
}

// Si pides UNO solo (INotificador), obtienes el ÚLTIMO registrado → PushNotificador
```

### 7.2 Keyed services (.NET 8)

Antes de .NET 8 había que inventar factories o diccionarios. Ahora es nativo:

```csharp
services.AddKeyedSingleton<IPasarelaPago, WebpayPasarela>("webpay");
services.AddKeyedSingleton<IPasarelaPago, MercadoPagoPasarela>("mercadopago");

// Inyección por atributo
public class CheckoutService([FromKeyedServices("webpay")] IPasarelaPago pasarela) { }

// Resolución dinámica según un dato de runtime
app.MapPost("/pagos/{proveedor}", (string proveedor, IServiceProvider sp, PagoRequest req) =>
{
    var pasarela = sp.GetKeyedService<IPasarelaPago>(proveedor);
    return pasarela is null ? Results.BadRequest("Proveedor no soportado") : Results.Ok(pasarela.Cobrar(req));
});
```

---

## 8. Decorador: agregar comportamiento sin tocar la clase

El contenedor nativo no tiene soporte directo de decoradores, pero se puede con una factory (o con la librería **Scrutor**: `services.Decorate<IProductoRepository, CachedProductoRepository>()`).

```csharp
public interface IProductoRepository
{
    Task<ProductoDto?> ObtenerAsync(int id, CancellationToken ct);
}

// Decorador: implementa la misma interfaz y envuelve a la real
public class CachedProductoRepository(IProductoRepository inner, IMemoryCache cache) : IProductoRepository
{
    public Task<ProductoDto?> ObtenerAsync(int id, CancellationToken ct) =>
        cache.GetOrCreateAsync($"producto:{id}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return inner.ObtenerAsync(id, ct);           // delega en la implementación real
        });
}

// Registro manual del decorador
services.AddMemoryCache();
services.AddScoped<EfProductoRepository>();
services.AddScoped<IProductoRepository>(sp =>
    new CachedProductoRepository(
        sp.GetRequiredService<EfProductoRepository>(),
        sp.GetRequiredService<IMemoryCache>()));
```

```
Consumidor ──▶ IProductoRepository
                   │
                   ▼
            CachedProductoRepository  (¿está en caché? → devuelve)
                   │ no
                   ▼
            EfProductoRepository ──▶ base de datos
```

Principio **Open/Closed** en acción: agregas caching, logging, métricas o reintentos sin modificar `EfProductoRepository`.

---

## 9. Service Locator: el antipatrón

```csharp
// ❌ Service Locator: la clase pide cosas al contenedor por su cuenta
public class PedidoService(IServiceProvider sp)
{
    public async Task ConfirmarAsync(int id)
    {
        var repo = sp.GetRequiredService<IPedidoRepository>();   // dependencia OCULTA
        var email = sp.GetRequiredService<IEmailSender>();
        // ...
    }
}
```

Problemas: las dependencias no se ven en el constructor (la firma miente), los errores de registro aparecen en runtime en vez de al arrancar, los tests requieren montar un contenedor, y acopla tu código al framework de DI.

**Excepciones legítimas** (código de *infraestructura*, no de negocio): factories registradas, `IServiceScopeFactory` en singletons/background services, resolución por clave dinámica, middleware del framework.

> ❓ **Entrevista**: *"¿Por qué el Service Locator es un antipatrón?"* → Oculta dependencias, mueve errores a runtime y dificulta el testing. La DI por constructor hace explícito el contrato de la clase. Se tolera solo en la *composition root* e infraestructura.

---

## 10. Composition root, validación y otros contenedores

**Composition root** = el único lugar donde se arma el grafo (en .NET: `Program.cs` y sus extensiones). El resto del código solo declara dependencias en constructores y **no sabe** que existe un contenedor.

Validación al arrancar (recomendada en todos los entornos si el costo de arranque es aceptable):

```csharp
builder.Host.UseDefaultServiceProvider(o =>
{
    o.ValidateScopes = true;    // detecta captive dependencies
    o.ValidateOnBuild = true;   // verifica que TODOS los registros se pueden construir al hacer Build()
});
```

| Contenedor | Qué agrega sobre el nativo |
|---|---|
| **Nativo (MS.DI)** | Suficiente para el 90% de los casos. Rápido, integrado, compatible con AOT. |
| **Autofac** | Módulos, property injection, decoradores nativos, registro por convención, child scopes nombrados. |
| **Scrutor** (extensión del nativo) | `Scan` (registro por convención de ensamblados) y `Decorate`. |
| Lamar, DryIoc, Simple Injector | Diversas features avanzadas; menos comunes hoy. |

```csharp
// Scrutor: registrar todas las clases que terminen en "Service" contra sus interfaces
services.Scan(s => s.FromAssemblyOf<PedidoService>()
    .AddClasses(c => c.Where(t => t.Name.EndsWith("Service")))
    .AsImplementedInterfaces()
    .WithScopedLifetime());
```

### 10.1 DI y testing (adelanto de la Sesión 27)

Como `PedidoService` depende de abstracciones, el test no necesita contenedor ni infraestructura:

```csharp
[Fact]
public async Task Confirmar_EnviaEmail()
{
    var pedido = new Pedido(1, "ana@x.com");
    var repo = new Mock<IPedidoRepository>();
    repo.Setup(r => r.ObtenerAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(pedido);
    var email = new Mock<IEmailSender>();

    var sut = new PedidoService(repo.Object, email.Object, NullLogger<PedidoService>.Instance);
    await sut.ConfirmarAsync(1, CancellationToken.None);

    email.Verify(e => e.EnviarAsync("ana@x.com", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
}
```

---

## Resumen mental de la sesión

```
DIP  = principio (depender de abstracciones)
IoC  = principio general (el framework controla)
DI   = técnica (dependencias entregadas desde afuera, por CONSTRUCTOR)
Contenedor = IServiceCollection (registros) → Build() → IServiceProvider (resuelve)

Lifetimes:
  Transient → nueva cada vez
  Scoped    → una por request/scope   (DbContext)
  Singleton → una por app, CONCURRENTE → thread-safe obligatorio

Regla de oro: nunca un lifetime largo depende de uno corto
  Singleton → Scoped = CAPTIVE DEPENDENCY  ⇒ IServiceScopeFactory
  ValidateScopes / ValidateOnBuild lo detectan (en prod están apagados por defecto)

Registros: interfaz→impl · factory · instancia · genéricos abiertos · TryAdd · keyed (.NET 8)
Varias impl: IEnumerable<T> (todas) · pedir una = la última · keyed para elegir
Decorador = misma interfaz envolviendo la real (factory o Scrutor)
Service Locator = antipatrón fuera de la infraestructura
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Diferencia entre DIP, IoC y DI?
2. ❓ ¿Por qué se prefiere la inyección por constructor?
3. ❓ Explica Transient, Scoped y Singleton con un ejemplo de uso para cada uno.
4. ❓ ¿Qué es una captive dependency? Da un ejemplo con `DbContext` y cómo solucionarlo.
5. ❓ ¿Por qué el error de captive dependency aparece en Development pero no en Production?
6. ❓ ¿Cómo usas un servicio scoped dentro de un `BackgroundService`?
7. ❓ Registras 3 implementaciones de `INotificador`. ¿Qué obtienes si inyectas `INotificador`? ¿Y `IEnumerable<INotificador>`?
8. ❓ ¿Qué son los keyed services y qué problema resuelven?
9. ❓ ¿Cómo implementarías un decorador de caching con el contenedor nativo?
10. ❓ ¿Por qué Service Locator es un antipatrón? ¿Cuándo es aceptable usar `IServiceProvider`?
11. ❓ ¿Quién hace `Dispose` de un servicio registrado con `AddSingleton(new X())`? ¿Y de uno registrado con `AddSingleton<X>()`?
12. ❓ ¿Cuándo usarías Autofac o Scrutor en lugar del contenedor nativo?

## Ejercicio práctico
1. Crea una consola con `dotnet add package Microsoft.Extensions.DependencyInjection` y ejecuta la demo de la sección 4.1. Explica la salida en voz alta, línea por línea.
2. En esa misma demo, registra un singleton que dependa de `ScopedDep` y verifica que con `ValidateScopes = true` falla; luego pon `false` y observa cómo el singleton retiene un scoped ya dispuesto.
3. En tu `TiendaApi` de la Sesión 23, refactoriza `Program.cs` para usar métodos de extensión `AddAplicacion()` y `AddInfraestructura(config)`.
4. Implementa `INotificador` con tres implementaciones (consola, archivo, "fake SMS") y un servicio que use `IEnumerable<INotificador>`.
5. Registra dos `IPasarelaPago` como keyed services y crea un endpoint `POST /pagos/{proveedor}` que elija la implementación en runtime.
6. Implementa el decorador `CachedProductoRepository` a mano; luego instala Scrutor y reemplázalo por `services.Decorate<...>()`.
7. Crea un `BackgroundService` que cada 30 segundos use `IServiceScopeFactory` para leer productos y loguear cuántos hay.
8. Activa `ValidateOnBuild = true` y elimina a propósito un registro: comprueba que la app falla **al arrancar** y no en la primera request.

---

➡️ **Cuando termines**, marca la Sesión 24 en el [README](Readme.md) y pídeme la **Sesión 25 — Entity Framework Core**.
