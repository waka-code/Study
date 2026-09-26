# Sesión 23 — ASP.NET Core: Controllers, Minimal APIs, routing y DTOs

> **Objetivo de la sesión**: entender *cómo* ASP.NET Core recibe una request HTTP y la convierte en una llamada a tu código. Al terminar deberías poder explicar el modelo de hosting (`WebApplication`, Kestrel), el **pipeline de middleware** y por qué el orden importa, construir la misma API con **Controllers** y con **Minimal APIs**, dominar routing y model binding, validar entradas, exponer **DTOs** en vez de entidades, manejar errores con Problem Details y configurar la app por entorno.

---

## 1. ¿Qué es ASP.NET Core?

ASP.NET Core es el framework web de .NET: open source, multiplataforma y uno de los más rápidos en los benchmarks TechEmpower. Sirve para APIs REST (Sesión 22), gRPC, SignalR (tiempo real), MVC/Razor Pages y Blazor.

| Pieza | Rol |
|---|---|
| **Kestrel** | Servidor HTTP **incluido**, multiplataforma, de alto rendimiento. Escucha el socket y parsea HTTP/1.1, 2 y 3. |
| **Host** (`WebApplication`) | Arranca la app: configuración, logging, **DI** (Sesión 24), ciclo de vida. |
| **Pipeline de middleware** | Cadena de componentes que procesa cada request/response. |
| **Endpoints** | El código final que atiende una ruta: una acción de controller o un handler de Minimal API. |

```
Internet ──▶ [ Reverse proxy opcional: Nginx / IIS / YARP / ALB ]
                     │
                     ▼
                  Kestrel  (parsea HTTP → HttpContext)
                     │
                     ▼
     ┌─────────── Pipeline de middleware ───────────┐
     │ ExceptionHandler → HTTPS → CORS → AuthN →     │
     │ AuthZ → RateLimiter → ... → Endpoint           │
     └───────────────────────────────────────────────┘
                     │
                     ▼
             Tu controller / handler
```

> ❓ **Entrevista**: *"¿Necesito IIS o Nginx delante de Kestrel?"* → No es obligatorio: Kestrel está listo para producción y puede exponerse directamente. Un reverse proxy se agrega por **TLS termination centralizada, balanceo, compartir el puerto 443 entre varias apps, caching o WAF**. En contenedores (ECS/Kubernetes) lo habitual es Kestrel detrás de un load balancer.

---

## 2. El `Program.cs` mínimo, línea por línea

```bash
dotnet new webapi -o TiendaApi --use-controllers   # plantilla con controllers
dotnet new webapi -o TiendaMinimal                 # plantilla Minimal API (default en .NET 8)
```

```csharp
var builder = WebApplication.CreateBuilder(args);   // 1. FASE DE CONFIGURACIÓN
                                                    //    carga appsettings, env vars, args, logging

builder.Services.AddControllers();                  // 2. Registrar SERVICIOS en el contenedor DI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();                   //    OpenAPI (Swashbuckle en la plantilla .NET 8)

var app = builder.Build();                          // 3. Se construye la app: el contenedor DI queda cerrado

if (app.Environment.IsDevelopment())                // 4. FASE DEL PIPELINE: el ORDEN importa
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();                               // 5. Registrar ENDPOINTS

app.Run();                                          // 6. Arranca Kestrel y bloquea
```

Dos fases, **no las mezcles**:
- **Antes de `Build()`** → `builder.Services.Add...` (qué existe).
- **Después de `Build()`** → `app.Use...` / `app.Map...` (cómo fluye cada request).

> ⚠️ Registrar un servicio después de `Build()` lanza `InvalidOperationException`: la colección de servicios ya es de solo lectura.

---

## 3. El pipeline de middleware

Un **middleware** es un componente que recibe el `HttpContext`, puede hacer algo **antes**, llamar al **siguiente** (`next`) y hacer algo **después**. Forman una "cebolla":

```
Request ─▶ MW1 (antes) ─▶ MW2 (antes) ─▶ MW3 (antes) ─▶ Endpoint
                                                            │
Response ◀─ MW1 (después) ◀─ MW2 (después) ◀─ MW3 (después) ◀┘
```

### 3.1 Escribir un middleware

```csharp
// Inline con app.Use: mide cuánto tarda cada request
app.Use(async (context, next) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    await next(context);                                  // pasa al siguiente
    sw.Stop();
    app.Logger.LogInformation("{Method} {Path} → {Status} en {Ms} ms",
        context.Request.Method, context.Request.Path,
        context.Response.StatusCode, sw.ElapsedMilliseconds);
});

// "Cortocircuito": NO llama a next → el pipeline se detiene aquí
app.Use(async (context, next) =>
{
    if (context.Request.Headers.ContainsKey("X-Bloqueado"))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;                                           // no await next()
    }
    await next(context);
});
```

Como clase reutilizable (convención: constructor con `RequestDelegate` + método `InvokeAsync`):

```csharp
public class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string Header = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
    {
        var id = context.Request.Headers[Header].FirstOrDefault() ?? Guid.NewGuid().ToString();
        context.Response.Headers[Header] = id;           // lo devolvemos al cliente

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
        {
            await next(context);
        }
    }
}

// Registro
app.UseMiddleware<CorrelationIdMiddleware>();
```

> ⚠️ Un middleware basado en convención es un **singleton** (se crea una vez). Si necesitas un servicio *scoped* (ej. `DbContext`), pídelo como **parámetro de `InvokeAsync`**, no en el constructor, o tendrás un *captive dependency* (Sesión 24).

> ⚠️ No modifiques headers **después** de que la response empezó a enviarse (`context.Response.HasStarted`): lanza excepción. Si necesitas agregar headers "al final", usa `context.Response.OnStarting(...)`.

### 3.2 El orden recomendado

```csharp
app.UseExceptionHandler();      // 1. primero: atrapa excepciones de TODO lo que sigue
app.UseHsts();                  //    (solo producción)
app.UseHttpsRedirection();
app.UseStaticFiles();           //    archivos estáticos: cortocircuita antes de auth si es público
app.UseRouting();               // 2. decide QUÉ endpoint (implícito en .NET 6+ si no lo pones)
app.UseCors();                  // 3. CORS entre routing y auth
app.UseAuthentication();        // 4. ¿quién eres?
app.UseAuthorization();         // 5. ¿puedes? (necesita saber el endpoint y el usuario)
app.UseRateLimiter();
app.MapControllers();           // 6. ejecuta el endpoint
```

> ❓ **Entrevista**: *"¿Qué pasa si pongo `UseAuthorization` antes de `UseAuthentication`?"* → La autorización corre sin usuario autenticado (`HttpContext.User` vacío) y rechaza con 401 cualquier endpoint protegido, aunque el token sea válido. El orden del pipeline **es** el comportamiento.

### 3.3 `Use` vs `Run` vs `Map`

| Método | Qué hace |
|---|---|
| `app.Use(...)` | Middleware que puede llamar a `next` |
| `app.Run(...)` | Middleware **terminal**: nunca llama a `next` |
| `app.Map("/ruta", branch => ...)` | Ramifica el pipeline según el path |
| `app.MapGet/MapPost/...` | Registra un **endpoint** (Minimal API) |

---

## 4. Controllers: el enfoque clásico (MVC)

```csharp
using Microsoft.AspNetCore.Mvc;

[ApiController]                         // activa comportamientos de API (ver 4.1)
[Route("api/v1/[controller]")]          // [controller] = "productos" (nombre sin "Controller")
public class ProductosController(IProductoService service) : ControllerBase
{
    // GET api/v1/productos?categoria=hogar&page=1&pageSize=20
    [HttpGet]
    [ProducesResponseType<PagedResult<ProductoDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ProductoDto>>> Listar(
        [FromQuery] string? categoria,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)          // se cancela si el cliente se desconecta
    {
        pageSize = Math.Clamp(pageSize, 1, 100); // nunca confíes en el cliente (Sesión 22)
        return Ok(await service.ListarAsync(categoria, page, pageSize, ct));
    }

    // GET api/v1/productos/42
    [HttpGet("{id:int}", Name = nameof(ObtenerPorId))]  // constraint: solo enteros
    [ProducesResponseType<ProductoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductoDto>> ObtenerPorId(int id, CancellationToken ct)
    {
        var dto = await service.ObtenerAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    // POST api/v1/productos
    [HttpPost]
    [ProducesResponseType<ProductoDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductoDto>> Crear(CrearProductoRequest request, CancellationToken ct)
    {
        // Con [ApiController], si el modelo es inválido ya se devolvió 400 automáticamente
        var creado = await service.CrearAsync(request, ct);
        return CreatedAtRoute(nameof(ObtenerPorId), new { id = creado.Id }, creado); // 201 + Location
    }

    // PUT api/v1/productos/42
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, ActualizarProductoRequest request, CancellationToken ct)
        => await service.ActualizarAsync(id, request, ct) ? NoContent() : NotFound();

    // DELETE api/v1/productos/42
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
        => await service.EliminarAsync(id, ct) ? NoContent() : NotFound();
}
```

### 4.1 Qué hace `[ApiController]`

| Comportamiento | Detalle |
|---|---|
| **Respuesta 400 automática** | Si `ModelState` es inválido, devuelve `ValidationProblemDetails` sin entrar a la acción. |
| **Inferencia de binding** | Tipos complejos → `[FromBody]`; parámetros de ruta → `[FromRoute]`; simples → `[FromQuery]`; `IFormFile` → `[FromForm]`. |
| **Attribute routing obligatorio** | No usa las rutas convencionales de MVC. |
| **Problem Details para errores** | `NotFound()` etc. devuelven `application/problem+json`. |

### 4.2 `IActionResult` vs `ActionResult<T>` vs tipo directo

| Retorno | Pros | Contras |
|---|---|---|
| `ProductoDto` | Simple | Solo puedes devolver 200 (o lanzar excepción) |
| `IActionResult` | Cualquier status | Swagger no conoce el tipo del body |
| **`ActionResult<ProductoDto>`** | Cualquier status **y** tipo conocido; `return dto;` hace `Ok` implícito | — (es la recomendada) |

> ⚠️ Hereda de **`ControllerBase`** para APIs, no de `Controller`: este último agrega soporte de Views (Razor) que no necesitas.

---

## 5. Minimal APIs: la misma API con menos ceremonia

Introducidas en .NET 6, maduras desde .NET 7/8. Sin clases de controller: mapeas lambdas o métodos a rutas.

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddScoped<IProductoService, ProductoService>();
builder.Services.AddProblemDetails();
var app = builder.Build();

app.UseExceptionHandler();

// RouteGroup: prefijo común + configuración compartida
var productos = app.MapGroup("/api/v1/productos")
                   .WithTags("Productos");
                   // .RequireAuthorization();  ← aplicaría a todo el grupo (Sesión 28)

productos.MapGet("/", async (IProductoService svc, string? categoria,
                            int page = 1, int pageSize = 20, CancellationToken ct = default) =>
    TypedResults.Ok(await svc.ListarAsync(categoria, page, Math.Clamp(pageSize, 1, 100), ct)));

productos.MapGet("/{id:int}", async Task<Results<Ok<ProductoDto>, NotFound>> (
        int id, IProductoService svc, CancellationToken ct) =>
    await svc.ObtenerAsync(id, ct) is { } dto
        ? TypedResults.Ok(dto)
        : TypedResults.NotFound())
    .WithName("ObtenerProducto");

productos.MapPost("/", async (CrearProductoRequest req, IProductoService svc, CancellationToken ct) =>
{
    var creado = await svc.CrearAsync(req, ct);
    return TypedResults.CreatedAtRoute(creado, "ObtenerProducto", new { id = creado.Id });
})
.AddEndpointFilter<ValidationFilter<CrearProductoRequest>>();   // validación (sección 7)

productos.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
        int id, IProductoService svc, CancellationToken ct) =>
    await svc.EliminarAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound());

app.Run();
```

- `TypedResults` (vs `Results`) devuelve tipos concretos → OpenAPI conoce status y body automáticamente, y los handlers son **testeables** sin HTTP.
- `Results<Ok<T>, NotFound>` es una **unión** de posibles respuestas, verificada por el compilador.
- Los parámetros se resuelven por inferencia: ruta, query, body (tipo complejo), servicios de DI, `HttpContext`, `CancellationToken`.

Para no tener un `Program.cs` de 2 000 líneas, organiza en métodos de extensión:

```csharp
public static class ProductoEndpoints
{
    public static RouteGroupBuilder MapProductos(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/productos").WithTags("Productos");
        g.MapGet("/{id:int}", ObtenerPorId).WithName("ObtenerProducto");
        return g;
    }

    // Método estático con nombre: más legible y testeable que una lambda gigante
    private static async Task<Results<Ok<ProductoDto>, NotFound>> ObtenerPorId(
        int id, IProductoService svc, CancellationToken ct)
        => await svc.ObtenerAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound();
}

// Program.cs
app.MapProductos();
```

### 5.1 Controllers vs Minimal APIs

| Aspecto | Controllers | Minimal APIs |
|---|---|---|
| Ceremonia | Más (clases, atributos, herencia) | Mínima |
| Rendimiento | Muy bueno | Algo mejor (menos capas, sin model binding MVC) |
| Native AOT | ❌ No soportado | ✅ Con `CreateSlimBuilder` + source generators (RDG) |
| Filtros | Action/Result/Exception/Resource filters | Endpoint filters |
| Validación automática | ✅ `[ApiController]` + DataAnnotations | ❌ en .NET 8 (manual o filtro); nativa desde .NET 10 |
| Organización | Por convención (un controller por recurso) | Libre: tú decides (extensiones, grupos, Carter, vertical slices) |
| Equipos grandes / legado | Familiar, convenciones claras | Requiere disciplina |

> ❓ **Entrevista**: *"¿Controllers o Minimal APIs?"* → No hay una respuesta absoluta. Minimal APIs para microservicios, AOT y vertical slices; controllers cuando el equipo valora las convenciones de MVC o hay mucho legado. Lo importante es que **el pipeline, DI, routing y middleware son los mismos**: ambos son endpoints del mismo sistema de routing. Puedes mezclarlos en la misma app.

---

## 6. Routing y model binding

### 6.1 Plantillas y constraints

```csharp
[HttpGet("{id:int:min(1)}")]                 // entero ≥ 1; "abc" o "0" → 404 (no matchea)
[HttpGet("{slug:regex(^[a-z0-9-]+$)}")]      // regex
[HttpGet("{fecha:datetime}")]
[HttpGet("archivos/{**ruta}")]               // catch-all: captura "a/b/c.txt"
[HttpGet("{id:guid}")]
[HttpGet("buscar/{termino?}")]               // opcional
```

> ⚠️ Los **constraints de ruta no son validación**. Sirven para *desambiguar* rutas (ej. `/productos/42` vs `/productos/destacados`). Un `id` inválido debería producir 400 por validación, no un 404 por "ruta no encontrada" que confunde al cliente.

### 6.2 De dónde viene cada dato

| Atributo | Origen | Ejemplo |
|---|---|---|
| `[FromRoute]` | Segmento de la URL | `/productos/{id}` |
| `[FromQuery]` | Query string | `?page=2` |
| `[FromBody]` | Body (JSON) — **solo uno por acción** | `POST` con JSON |
| `[FromHeader]` | Header | `[FromHeader(Name = "X-Tenant")] string tenant` |
| `[FromForm]` | `multipart/form-data` / form-urlencoded | subida de archivos |
| `[FromServices]` | Contenedor DI | servicio en un parámetro de acción |
| `[AsParameters]` | (Minimal) agrupa parámetros en un record | `[AsParameters] PaginacionQuery q` |

```csharp
public record PaginacionQuery(int Page = 1, int PageSize = 20, string? Sort = null);

app.MapGet("/api/v1/clientes", ([AsParameters] PaginacionQuery q) => ...);
```

> ❓ **Entrevista**: *"Mi POST devuelve 415 Unsupported Media Type"* → El cliente no envió `Content-Type: application/json` y el binder de `[FromBody]` no sabe cómo leer el body.

---

## 7. DTOs: nunca expongas tus entidades

Un **DTO** (*Data Transfer Object*) es la forma del dato **en el contrato HTTP**, separada de la forma del dato **en tu dominio/base de datos** (entidades de EF Core, Sesión 25).

```csharp
// ENTIDAD (dominio / EF Core) — interna
public class Producto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public decimal Precio { get; set; }
    public decimal CostoProveedor { get; set; }     // ¡secreto comercial!
    public bool Eliminado { get; set; }             // soft delete, interno
    public byte[] RowVersion { get; set; } = [];    // concurrencia
    public List<Resena> Resenas { get; set; } = []; // navegación → ciclos y N+1
}

// DTOs — contrato público
public record ProductoDto(int Id, string Nombre, decimal Precio, double RatingPromedio);

public record CrearProductoRequest(
    [property: Required, StringLength(100, MinimumLength = 3)] string Nombre,
    [property: Range(1, 10_000_000)] decimal Precio);

public record ActualizarProductoRequest(string Nombre, decimal Precio);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
```

¿Por qué? Cinco razones que debes poder recitar:

1. **Seguridad — over-posting / mass assignment**: si bindeas la entidad en un `POST`, un atacante puede enviar `"costoProveedor": 0` o `"esAdmin": true` y tu código lo guarda.
2. **Seguridad — over-exposure**: devolver la entidad filtra campos internos (`CostoProveedor`, `PasswordHash`).
3. **Desacople**: puedes refactorizar la base de datos sin romper el contrato de la API (y viceversa).
4. **Serialización sana**: sin ciclos de navegación ni lazy loading disparando consultas durante la serialización.
5. **Contratos distintos por operación**: el request de creación no tiene `Id`; la respuesta sí.

Mapeo: a mano (explícito, rápido, sin magia), con extensiones, o con librerías (Mapster, AutoMapper — este último pasó a licencia comercial en 2025). Con EF Core, lo ideal es **proyectar en la consulta**:

```csharp
// Proyección: EF genera un SELECT solo con las columnas necesarias (Sesión 25)
var dto = await db.Productos
    .Where(p => p.Id == id && !p.Eliminado)
    .Select(p => new ProductoDto(p.Id, p.Nombre, p.Precio,
                                 p.Resenas.Average(r => (double?)r.Estrellas) ?? 0))
    .FirstOrDefaultAsync(ct);
```

### 7.1 Validación

**DataAnnotations** (arriba) funciona automáticamente con `[ApiController]`. Para reglas más ricas, **FluentValidation** es el estándar de la industria:

```csharp
using FluentValidation;

public class CrearProductoValidator : AbstractValidator<CrearProductoRequest>
{
    public CrearProductoValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().Length(3, 100);
        RuleFor(x => x.Precio).GreaterThan(0).LessThanOrEqualTo(10_000_000);
    }
}

// Endpoint filter genérico para Minimal APIs
public class ValidationFilter<T>(IValidator<T> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var arg = ctx.Arguments.OfType<T>().FirstOrDefault();
        if (arg is null) return TypedResults.BadRequest();

        var result = await validator.ValidateAsync(arg, ctx.HttpContext.RequestAborted);
        return result.IsValid
            ? await next(ctx)                                        // sigue al handler
            : TypedResults.ValidationProblem(result.ToDictionary()); // 400 con errores por campo
    }
}

// Registro
builder.Services.AddValidatorsFromAssemblyContaining<CrearProductoValidator>();
```

> ⚠️ En un `record` posicional, `[Required]` sin el prefijo `property:` se aplica al **parámetro del constructor**, no a la propiedad. MVC valida parámetros de constructor de records, pero otras herramientas no: el prefijo `[property: ...]` evita sorpresas.

---

## 8. Manejo global de errores

No pongas `try/catch` en cada acción (Sesión 12). Centraliza:

```csharp
// .NET 8: IExceptionHandler
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger,
                                    IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            NotFoundException      => (StatusCodes.Status404NotFound, "Recurso no encontrado"),
            ConflictException      => (StatusCodes.Status409Conflict, "Conflicto de estado"),
            OperationCanceledException => (499, "Cliente canceló la request"),
            _                      => (StatusCodes.Status500InternalServerError, "Error interno")
        };

        if (status >= 500) logger.LogError(ex, "Error no controlado");

        ctx.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = ex,
            ProblemDetails = { Status = status, Title = title,
                               Detail = status < 500 ? ex.Message : null } // no filtres internals en 500
        });
    }
}

public class NotFoundException(string msg) : Exception(msg);
public class ConflictException(string msg) : Exception(msg);

// Program.cs
builder.Services.AddProblemDetails(o =>
    o.CustomizeProblemDetails = c =>
        c.ProblemDetails.Extensions["traceId"] = c.HttpContext.TraceIdentifier);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
// ...
app.UseExceptionHandler();   // primero del pipeline
```

> ⚠️ **Nunca** devuelvas el stack trace en producción. `app.UseDeveloperExceptionPage()` es solo para `Development` (y en .NET 6+ ya se activa sola en ese entorno).

> 💡 Debate senior: excepciones para flujo de negocio ("no encontrado") son caras y opacas. Muchos equipos prefieren un **Result pattern** (`Result<T>` con éxito/error) en la capa de aplicación y dejan las excepciones para lo realmente excepcional. Lo veremos en la Sesión 26.

---

## 9. Configuración, entornos y options pattern

La configuración se compone de **proveedores en capas**; el último gana:

```
appsettings.json
  └─▶ appsettings.{Environment}.json      (Development / Staging / Production)
        └─▶ User Secrets                   (solo Development)
              └─▶ Variables de entorno     (ConnectionStrings__Default=...)
                    └─▶ Argumentos de línea de comandos
```

El entorno se define con `ASPNETCORE_ENVIRONMENT` (default: `Production`).

```json
// appsettings.json
{
  "ConnectionStrings": { "Default": "Host=localhost;Database=tienda" },
  "Pagos": { "BaseUrl": "https://sandbox.pagos.cl", "TimeoutSegundos": 10 }
}
```

```csharp
// Options pattern: configuración TIPADA y validada al arrancar
public class PagosOptions
{
    public const string Seccion = "Pagos";
    [Required, Url] public string BaseUrl { get; set; } = "";
    [Range(1, 60)]  public int TimeoutSegundos { get; set; }
}

builder.Services.AddOptions<PagosOptions>()
    .BindConfiguration(PagosOptions.Seccion)
    .ValidateDataAnnotations()
    .ValidateOnStart();          // falla al ARRANCAR, no en la primera request

// Consumo (DI, Sesión 24)
public class PagosClient(IOptions<PagosOptions> options) { /* options.Value.BaseUrl */ }
```

| Interfaz | Lifetime | Recarga cambios | Uso |
|---|---|---|---|
| `IOptions<T>` | Singleton | ❌ | Config fija |
| `IOptionsSnapshot<T>` | Scoped | ✅ por request | Config que puede cambiar, en servicios scoped |
| `IOptionsMonitor<T>` | Singleton | ✅ en vivo + `OnChange` | Singletons que necesitan valores actualizados |

> ⚠️ Secretos (connection strings de producción, API keys) **nunca** en `appsettings.json` versionado. En desarrollo: `dotnet user-secrets set "Pagos:ApiKey" "..."`. En producción: variables de entorno inyectadas por AWS Secrets Manager / Azure Key Vault / Kubernetes Secrets.

---

## 10. Extras que aparecen en producción

```csharp
// CORS
builder.Services.AddCors(o => o.AddPolicy("Front", p =>
    p.WithOrigins("https://app.tienda.cl").AllowAnyHeader().AllowAnyMethod()));
app.UseCors("Front");

// Health checks (liveness/readiness para ECS, Kubernetes, ALB)
builder.Services.AddHealthChecks();
app.MapHealthChecks("/health");

// Rate limiting (.NET 7+)
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter("api", l => { l.PermitLimit = 100; l.Window = TimeSpan.FromMinutes(1); });
});
app.UseRateLimiter();
productos.RequireRateLimiting("api");

// Output caching (.NET 7+)
builder.Services.AddOutputCache();
app.UseOutputCache();
productos.MapGet("/destacados", ...).CacheOutput(p => p.Expire(TimeSpan.FromSeconds(30)));
```

> ⚠️ `AllowAnyOrigin()` junto con `AllowCredentials()` está **prohibido** por la especificación CORS y ASP.NET Core lanza error. Especifica orígenes explícitos.

---

## Resumen mental de la sesión

```
Kestrel (servidor) → HttpContext → PIPELINE de middleware → Endpoint

Program.cs:
  builder.Services.Add...   ← QUÉ existe (DI)       [antes de Build]
  app.Use... / app.Map...   ← CÓMO fluye la request [después de Build]

Middleware = cebolla: antes → next() → después; no llamar next = cortocircuito
Orden: ExceptionHandler → HTTPS → Routing → CORS → AuthN → AuthZ → Endpoints

Controllers  → [ApiController] (400 automático, inferencia de binding), ActionResult<T>
Minimal APIs → MapGroup, TypedResults, Results<A,B>, endpoint filters, AOT-friendly
Mismo routing, mismo DI, mismo pipeline

Binding: Route · Query · Body (uno) · Header · Form · Services · AsParameters
DTOs SIEMPRE: over-posting, over-exposure, desacople, sin ciclos
Validación: DataAnnotations / FluentValidation → ValidationProblem (400)
Errores: IExceptionHandler + ProblemDetails, sin stack trace en prod
Config: json → json.{env} → secrets → env vars → args; Options pattern + ValidateOnStart
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es Kestrel y cuándo pondrías un reverse proxy delante?
2. ❓ ¿Qué diferencia hay entre `builder.Services` y `app.Use`? ¿Por qué no puedes registrar servicios después de `Build()`?
3. ❓ Explica el pipeline de middleware. ¿Qué es un cortocircuito? ¿Por qué el orden de `UseAuthentication` y `UseAuthorization` importa?
4. ❓ ¿Por qué no inyectarías un `DbContext` en el constructor de un middleware?
5. ❓ ¿Qué hace exactamente `[ApiController]`?
6. ❓ `IActionResult` vs `ActionResult<T>` vs `TypedResults`: ¿cuál y por qué?
7. ❓ Controllers vs Minimal APIs: ventajas de cada uno. ¿Cuál soporta Native AOT?
8. ❓ ¿Por qué usar DTOs en vez de entidades? Explica over-posting.
9. ❓ ¿Los route constraints son validación? ¿Para qué sirven?
10. ❓ ¿Cómo implementas manejo global de errores en .NET 8? ¿Qué formato devuelves?
11. ❓ ¿En qué orden se aplican las fuentes de configuración? ¿`IOptions` vs `IOptionsSnapshot` vs `IOptionsMonitor`?
12. ❓ ¿Dónde guardas secretos en desarrollo y en producción?

## Ejercicio práctico
1. `dotnet new webapi -o TiendaApi` (Minimal API) y ejecútala con `dotnet run`; abre `/swagger`.
2. Crea un `IProductoService` con implementación **en memoria** (`ConcurrentDictionary<int, Producto>`) y regístralo como singleton (en la Sesión 25 lo reemplazarás por EF Core).
3. Implementa el CRUD completo de productos con `MapGroup`, `TypedResults` y `Results<...>`, devolviendo `201 + Location`, `204`, `404` según corresponda.
4. Agrega `CrearProductoRequest` con FluentValidation y el `ValidationFilter<T>`. Prueba un POST con nombre vacío y verifica el `400` con `errors` por campo.
5. Agrega el `CorrelationIdMiddleware` y el middleware de timing; observa en consola el orden en que se ejecutan "antes" y "después".
6. Implementa `GlobalExceptionHandler` y crea un endpoint `/boom` que lance una excepción. Compara la respuesta en `Development` y en `Production` (`ASPNETCORE_ENVIRONMENT=Production dotnet run`).
7. Crea `PagosOptions` con `ValidateOnStart`, deja `BaseUrl` vacío y verifica que la app **no arranca**. Luego sobrescríbelo con la variable de entorno `Pagos__BaseUrl`.
8. (Opcional) Reescribe el endpoint `GET /{id}` como controller con `[ApiController]` en la misma app y comprueba que ambos conviven.
9. Prueba todo con un archivo `TiendaApi.http` (soportado por VS / Rider / VS Code REST Client).

---

➡️ **Cuando termines**, marca la Sesión 23 en el [README](Readme.md) y pídeme la **Sesión 24 — Dependency Injection**.
