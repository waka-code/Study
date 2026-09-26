# Sesión 33 — ASP.NET Core avanzado: middleware y filtros propios, versionado, rate limiting, health checks y Background Services

> **Objetivo de la sesión**: pasar de "mi API funciona en mi máquina" a "mi API **aguanta producción**". En la Sesión 23 viste el pipeline, Minimal APIs y los extras en 5 líneas; aquí bajamos a cómo funcionan por dentro y a las decisiones que un senior debe defender: cuándo usar middleware vs filtro, cómo versionar sin romper clientes, qué algoritmo de rate limiting elegir y por qué, cómo diseñar health checks que **no** tumben tu clúster, y cómo escribir `BackgroundService` que arrancan, fallan y se apagan correctamente. Al terminar deberías poder explicar el ciclo de vida completo de una request y de un host .NET 8.

---

## 1. El mapa: ¿dónde vive cada pieza?

Antes de profundizar, ubica cada tema de hoy dentro de una app ASP.NET Core:

```
                         ┌────────────────────────── HOST (.NET Generic Host) ───────────────────────────┐
                         │                                                                                │
 Request ─▶ Kestrel ─▶   │  PIPELINE DE MIDDLEWARE                                                        │
                         │  ExceptionHandler → ForwardedHeaders → [middleware propio] → Routing           │
                         │  → CORS → AuthN → AuthZ → RateLimiter → RequestTimeouts → ...                  │
                         │                     │                                                          │
                         │                     ▼                                                          │
                         │  ENDPOINT  ── Minimal API: endpoint filters → handler                          │
                         │            └─ Controller:  filtros MVC (Auth→Resource→Action→Exception→Result) │
                         │                                                                                │
                         │  /health/live · /health/ready  (endpoints especiales de health checks)         │
                         │                                                                                │
                         │  HOSTED SERVICES (BackgroundService) ── corren EN PARALELO a las requests       │
                         └────────────────────────────────────────────────────────────────────────────────┘
```

| Tema | Nivel | Pregunta que responde |
|---|---|---|
| Middleware propio | Toda la app (HTTP) | ¿Qué hago con **cada** request, sin importar el endpoint? |
| Filtros | Un endpoint / controller | ¿Qué hago **alrededor** de la ejecución de *este* handler, con acceso a sus argumentos/resultados? |
| Versionado | Contrato público | ¿Cómo evoluciono la API sin romper clientes? |
| Rate limiting | Protección | ¿Cómo evito que un cliente (o un bug) me tumbe? |
| Health checks | Operación | ¿Cómo le digo al orquestador si estoy vivo y listo? |
| Background Services | Host | ¿Cómo ejecuto trabajo que no nace de una request? |

---

## 2. Middleware avanzado

En la Sesión 23 escribiste middleware inline (`app.Use`) y por convención (`RequestDelegate` + `InvokeAsync`). Hay un tercer estilo y varias técnicas que distinguen a un senior.

### 2.1 Convención vs `IMiddleware` (factory-based)

```csharp
// Middleware basado en IMiddleware: el contenedor lo crea POR REQUEST
// (según el lifetime con que lo registres), así que SÍ puede recibir scoped en el constructor.
public sealed class TenantMiddleware(ILogger<TenantMiddleware> log, TenantContext tenant) : IMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (!context.Request.Headers.TryGetValue("X-Tenant-Id", out var t) || string.IsNullOrWhiteSpace(t))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;   // cortocircuito
            await context.Response.WriteAsJsonAsync(new { error = "Falta X-Tenant-Id" });
            return;
        }

        tenant.TenantId = t!;                         // TenantContext es scoped: vive lo que dura la request
        using (log.BeginScope(new Dictionary<string, object> { ["TenantId"] = tenant.TenantId }))
            await next(context);                      // todos los logs "debajo" llevan TenantId
    }
}

public class TenantContext { public string TenantId { get; set; } = ""; }

// Registro: OBLIGATORIO registrarlo en DI (si no, falla en runtime al primer request)
builder.Services.AddTransient<TenantMiddleware>();
builder.Services.AddScoped<TenantContext>();
app.UseMiddleware<TenantMiddleware>();
```

| | Por convención | `IMiddleware` |
|---|---|---|
| Creación | **Una vez** al construir el pipeline (singleton de facto) | Por request, vía `IMiddlewareFactory` + DI |
| Servicios scoped | Solo como **parámetros de `InvokeAsync`** | En el constructor, sin problema |
| Registro en DI | No necesario | **Obligatorio** |
| Tipado | Por reflexión (sin interfaz) | Fuerte (interfaz), más fácil de testear |
| Costo | Mínimo | Una resolución de DI por request (despreciable casi siempre) |

> ❓ **Entrevista**: *"¿Por qué un middleware por convención no puede recibir un `DbContext` en el constructor?"* → Porque se instancia **una sola vez** para toda la vida de la app; un scoped capturado ahí se convierte en *captive dependency* (Sesión 24) y se comparte entre requests concurrentes. Soluciones: pedirlo en `InvokeAsync(HttpContext, AppDbContext db)` o usar `IMiddleware`.

### 2.2 Ramificar el pipeline: `UseWhen` vs `MapWhen` vs `Map`

```csharp
// UseWhen: rama CONDICIONAL que se REUNE con el pipeline principal
app.UseWhen(ctx => ctx.Request.Path.StartsWithSegments("/api"),
    branch => branch.UseMiddleware<TenantMiddleware>());   // solo /api exige tenant

// MapWhen: rama que NO vuelve (termina en su propio pipeline)
app.MapWhen(ctx => ctx.Request.Headers.ContainsKey("X-Legacy"),
    legacy => legacy.Run(ctx => ctx.Response.WriteAsync("Usa la v2")));
```

```
UseWhen:   A ─▶ [¿cond?]──sí──▶ Tenant ──┐
                   └──no─────────────────┴─▶ B ─▶ endpoint      (se reúne)

MapWhen:   A ─▶ [¿cond?]──sí──▶ Legacy (terminal, fin)
                   └──no──▶ B ─▶ endpoint                        (no se reúne)
```

### 2.3 Leer metadata del endpoint desde un middleware

Después de `UseRouting()` el middleware ya **sabe qué endpoint** se ejecutará y puede leer sus atributos. Así funcionan internamente `UseAuthorization`, `UseRateLimiter` o `UseOutputCache`: leen metadata (`[Authorize]`, `RequireRateLimiting`...) del endpoint elegido.

```csharp
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class AuditableAttribute(string accion) : Attribute
{
    public string Accion { get; } = accion;
}

public sealed class AuditMetadataMiddleware(RequestDelegate next, ILogger<AuditMetadataMiddleware> log)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        // null si estamos ANTES de UseRouting o si ningún endpoint coincidió
        var audit = ctx.GetEndpoint()?.Metadata.GetMetadata<AuditableAttribute>();
        await next(ctx);
        if (audit is not null)
            log.LogInformation("AUDIT {Accion} por {User} → {Status}",
                audit.Accion, ctx.User.Identity?.Name ?? "anon", ctx.Response.StatusCode);
    }
}

app.UseRouting();
app.UseMiddleware<AuditMetadataMiddleware>();      // DESPUÉS de routing: ya hay endpoint
app.MapPost("/pedidos", CrearPedido).WithMetadata(new AuditableAttribute("crear-pedido"));
```

> 💡 Este es el patrón para construir **tus propias "features declarativas"**: un atributo/metadata en el endpoint + un middleware que la interpreta. Es exactamente como el framework implementa las suyas.

### 2.4 Técnicas de producción

```csharp
// 1) Headers "al final": OnStarting se ejecuta justo antes de enviar los headers
app.Use(async (ctx, next) =>
{
    var sw = Stopwatch.StartNew();
    ctx.Response.OnStarting(() =>
    {
        ctx.Response.Headers["Server-Timing"] = $"app;dur={sw.Elapsed.TotalMilliseconds:F1}";
        return Task.CompletedTask;
    });
    await next(ctx);
});

// 2) Leer el body DOS veces (ej. verificar la firma HMAC de un webhook y luego bindear)
app.Use(async (ctx, next) =>
{
    ctx.Request.EnableBuffering();                             // permite rebobinar el stream
    using var reader = new StreamReader(ctx.Request.Body, leaveOpen: true);
    var raw = await reader.ReadToEndAsync(ctx.RequestAborted);
    ctx.Request.Body.Position = 0;                             // ⚠️ sin esto el endpoint lee vacío
    // ... validar firma con 'raw' ...
    await next(ctx);
});

// 3) .NET 8: ShortCircuit → el endpoint se ejecuta justo tras routing,
//    SALTÁNDOSE el resto del middleware (auth, CORS, rate limit...). Ideal para ruido barato.
app.MapGet("/robots.txt", () => "User-agent: *\nDisallow: /").ShortCircuit();
app.MapShortCircuit(404, "wp-admin", "phpmyadmin");           // bots escaneando: 404 sin costo
```

> ⚠️ `EnableBuffering` guarda el body en memoria (y a disco sobre 30 KB). Aplícalo **solo** a las rutas que lo necesitan (con `UseWhen`), nunca global: un upload de 500 MB se volvería un problema.

> ⚠️ `ShortCircuit()` se salta **también la autorización**. Úsalo solo en endpoints públicos por definición.

---

## 3. Filtros: middleware "con contexto del handler"

El middleware ve `HttpContext` y nada más: no conoce los argumentos ya bindeados ni el `IActionResult` que devolverá tu acción. Los **filtros** corren **dentro** del endpoint, después del model binding, y sí los ven.

### 3.1 El pipeline de filtros MVC

```
                  ┌───────────────── Filtros MVC (dentro del endpoint) ─────────────────┐
  Middleware ───▶ │ Authorization ─▶ Resource ─▶ [model binding] ─▶ Action ─▶ ACCIÓN     │
                  │   (401/403)      (caché,        ▲                 │  ▲               │
                  │                  antes del      │   Exception ◀───┘  │ (si lanza)    │
                  │                  binding)       │                    │               │
                  │                    ◀── Result filters ◀── ejecución del IActionResult │
                  └────────────────────────────────────────────────────────────────────────┘
```

| Filtro | Interfaz | Cuándo corre | Uso típico |
|---|---|---|---|
| Authorization | `IAsyncAuthorizationFilter` | Primero de todos | Autorización custom (preferir *policies*, Sesión 28) |
| Resource | `IAsyncResourceFilter` | Antes del model binding y al final de todo | Cortocircuitar con caché, deshabilitar binding de form para streaming |
| Action | `IAsyncActionFilter` | Justo antes/después de la acción; ve los **argumentos** | Validación, logging con argumentos, transacciones |
| Exception | `IAsyncExceptionFilter` | Si la acción/filtros de acción lanzan | Mapear excepciones de *un* controller a respuestas |
| Result | `IAsyncResultFilter` | Antes/después de ejecutar el resultado | Headers, envolver respuestas |

```csharp
// Filtro de acción async: la forma recomendada (un solo método, antes/después alrededor de next)
public sealed class TimingFilter(ILogger<TimingFilter> log) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // context.ActionArguments → los argumentos YA bindeados: aquí podrías validarlos
        var sw = Stopwatch.StartNew();
        ActionExecutedContext executed = await next();       // ejecuta la acción (y filtros internos)
        log.LogInformation("{Action} tardó {Ms} ms (excepción: {Ex})",
            context.ActionDescriptor.DisplayName, sw.ElapsedMilliseconds, executed.Exception is not null);
    }
}

// Filtro de excepción: traduce UNA excepción concreta, deja pasar el resto al handler global
public sealed class ConcurrencyExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is DbConcurrencyException)
        {
            context.Result = new ConflictObjectResult(new ProblemDetails { Title = "Conflicto de concurrencia", Status = 409 });
            context.ExceptionHandled = true;                   // marca como manejada
        }
    }
}
```

> ⚠️ Los **exception filters no atrapan** excepciones de resource filters, result filters ni de la ejecución del resultado (ej. serialización). Para errores globales usa `IExceptionHandler` (Sesión 12/23); el exception filter es para casos locales.

### 3.2 Alcance, orden e inyección de dependencias

```csharp
// Global (todas las acciones)
builder.Services.AddControllers(o => o.Filters.Add<TimingFilter>());

[ServiceFilter(typeof(AuditFilter))]              // lo RESUELVE del contenedor → debe estar registrado
[TypeFilter(typeof(ConcurrencyExceptionFilter))]  // lo CREA con ActivatorUtilities → no requiere registro
public class ClientesController : ControllerBase { /* ... */ }

builder.Services.AddScoped<AuditFilter>();        // requerido por ServiceFilter
```

- **Orden por alcance**: *before* → Global → Controller → Acción; *after* en orden inverso (cebolla otra vez). La propiedad `Order` (menor = más externo) lo sobrescribe.
- Un atributo `[MiFiltro]` normal **no puede** recibir servicios por constructor (los atributos se construyen por reflexión con constantes). Por eso existen `ServiceFilter`, `TypeFilter` o `IFilterFactory`.

> ❓ **Entrevista**: *"¿`ServiceFilter` vs `TypeFilter`?"* → `ServiceFilter` obtiene la instancia del contenedor (respeta el lifetime registrado; el filtro debe estar registrado). `TypeFilter` crea una instancia nueva con `ActivatorUtilities` (resuelve dependencias del constructor sin registrar el filtro y permite pasar argumentos extra con `Arguments`).

### 3.3 Endpoint filters (Minimal APIs)

En la Sesión 23 usaste `ValidationFilter<T>`. Dos detalles avanzados: el orden y las **filter factories**.

```csharp
public sealed class IdempotencyHeaderFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        if (!ctx.HttpContext.Request.Headers.ContainsKey("Idempotency-Key"))
            return TypedResults.Problem(statusCode: 400, title: "Falta el header Idempotency-Key");
        return await next(ctx);                          // ctx.Arguments tiene los parámetros bindeados
    }
}

pedidos.MapPost("/", CrearPedido)
    .AddEndpointFilter<IdempotencyHeaderFilter>()        // se registra 1º → corre 1º (más externo)
    .AddEndpointFilterFactory((factoryCtx, next) =>      // corre UNA VEZ al construir el endpoint
    {
        // Inspección costosa (reflection) se hace aquí, no por request
        var tieneCt = factoryCtx.MethodInfo.GetParameters().Any(p => p.ParameterType == typeof(CancellationToken));
        return async invCtx => await next(invCtx);       // delegado por request
    });
```

### 3.4 ¿Middleware o filtro? La tabla que te van a pedir

| Criterio | Middleware | Filtro (MVC / endpoint) |
|---|---|---|
| Alcance | Todas las requests (incluso 404, archivos estáticos) | Solo endpoints MVC / Minimal API |
| Ve argumentos bindeados | ❌ | ✅ (`ActionArguments` / `ctx.Arguments`) |
| Ve el `IActionResult` / valor devuelto | ❌ (solo bytes del response) | ✅ |
| Puede cortocircuitar | ✅ | ✅ |
| Ejemplos | Correlation ID, tenant, logging HTTP, seguridad de headers | Validación, auditoría con datos del comando, transacción por acción |

> ❓ **Entrevista**: *"¿Dónde pondrías la validación de DTOs, en middleware o en un filtro?"* → En un **filtro**: el middleware corre antes del model binding y solo vería un stream JSON crudo; el filtro recibe el DTO ya deserializado.

---

## 4. Versionado de APIs con `Asp.Versioning`

La Sesión 22 comparó estrategias (URL, query, header, media type). Ahora la implementación con el paquete oficial **`Asp.Versioning.Http`** (Minimal APIs) y **`Asp.Versioning.Mvc`** (controllers).

### 4.1 ¿Qué es un cambio que rompe?

| ✅ No rompe (misma versión) | ❌ Rompe (nueva versión mayor) |
|---|---|
| Agregar un campo opcional a la response | Renombrar o eliminar un campo |
| Agregar un endpoint nuevo | Cambiar el tipo de un campo (`decimal` → objeto `Dinero`) |
| Agregar un parámetro opcional | Hacer obligatorio un parámetro que era opcional |
| Nuevos valores de enum *si el cliente los tolera* | Cambiar semántica (status codes, reglas de negocio) |

> ⚠️ "Agregar un valor a un enum" rompe a clientes que hacen `switch` exhaustivo o deserializan con enums estrictos. Documenta desde el día 1 que los clientes deben **tolerar valores desconocidos** (*tolerant reader*).

### 4.2 Configuración

```csharp
builder.Services.AddApiVersioning(o =>
{
    o.DefaultApiVersion = new ApiVersion(1, 0);
    o.AssumeDefaultVersionWhenUnspecified = true;   // sin versión → v1 (útil para clientes legacy)
    o.ReportApiVersions = true;                     // headers api-supported-versions / api-deprecated-versions
    o.ApiVersionReader = ApiVersionReader.Combine(  // acepta la versión desde varias fuentes
        new UrlSegmentApiVersionReader(),           // /api/v2/...
        new HeaderApiVersionReader("X-Api-Version"),
        new QueryStringApiVersionReader("api-version"));

    // RFC 8594: anuncia CUÁNDO muere la v1 y dónde está la guía de migración (header Sunset + Link)
    o.Policies.Sunset(1.0)
        .Effective(new DateTimeOffset(2027, 1, 1, 0, 0, 0, TimeSpan.Zero))
        .Link("https://docs.orderflow.cl/migrar-v2").Title("Guía de migración").Type("text/html");
}).AddMvc();                                        // .AddMvc() solo si también usas controllers
```

### 4.3 Minimal APIs: version sets

```csharp
public record PedidoV1(Guid Id, decimal Total);
public record Dinero(decimal Monto, string Moneda);
public record PedidoV2(Guid Id, Dinero Total);              // cambio de tipo → breaking → v2

var pedidosSet = app.NewApiVersionSet()
    .HasApiVersion(new ApiVersion(1, 0))
    .HasApiVersion(new ApiVersion(2, 0))
    .HasDeprecatedApiVersion(new ApiVersion(1, 0))          // sigue funcionando, pero se anuncia obsoleta
    .ReportApiVersions()
    .Build();

var pedidos = app.MapGroup("/api/v{version:apiVersion}/pedidos").WithApiVersionSet(pedidosSet);

pedidos.MapGet("/{id:guid}", (Guid id) => TypedResults.Ok(new PedidoV1(id, 100m))).MapToApiVersion(1, 0);
pedidos.MapGet("/{id:guid}", (Guid id) => TypedResults.Ok(new PedidoV2(id, new Dinero(100m, "CLP")))).MapToApiVersion(2, 0);
```

Respuesta real de `GET /api/v1/pedidos/{id}` (verificado):

```
HTTP/1.1 200 OK
api-supported-versions: 1.0, 2.0
api-deprecated-versions: 1.0
{"id":"3fa85f64-...","total":100}
```

### 4.4 Controllers

```csharp
[ApiController]
[ApiVersion(1.0)]
[Route("api/v{version:apiVersion}/clientes")]
public class ClientesController : ControllerBase
{
    [HttpGet("{id:int}")]
    public ActionResult<string> Get(int id) => Ok($"cliente {id}");

    [HttpGet("{id:int}"), ApiVersion(2.0), MapToApiVersion(2.0)]
    public ActionResult<object> GetV2(int id) => Ok(new { id, nombre = "x" });
}
```

Para que Swagger/OpenAPI genere **un documento por versión** agrega `Asp.Versioning.Mvc.ApiExplorer` y `.AddApiExplorer(o => { o.GroupNameFormat = "'v'VVV"; o.SubstituteApiVersionInUrl = true; })`.

> ❓ **Entrevista**: *"¿Cómo retiras una versión de tu API?"* → (1) Márcala *deprecated* (headers `api-deprecated-versions` y `Sunset`), (2) mide quién la sigue usando (logs/métricas por versión y por cliente), (3) comunica fecha, (4) retírala devolviendo `410 Gone` o redirigiendo documentación. Nunca la apagas sin datos de uso.

> 💡 Estrategia senior: evita versionar **toda** la API por un cambio en un endpoint. Versiona por recurso/grupo, y prefiere evolución compatible (campos nuevos opcionales) sobre versiones nuevas. Cada versión viva es código que mantener y testear.

---

## 5. Rate limiting a fondo (`Microsoft.AspNetCore.RateLimiting`, .NET 7+)

En las Sesiones 23 y 28 lo usaste para proteger el login. Ahora: los **cuatro algoritmos**, particionamiento y las trampas.

### 5.1 Los algoritmos

```
Fixed window (100/min):       |■■■■■■■■■■|··········|■■■■■■■■■■|   ⚠️ ráfaga en el borde:
                              0s        60s        120s              100 a los 59s + 100 a los 61s

Sliding window (100/min, 6 segmentos de 10s): la ventana "se desliza" por segmentos,
                              los permisos de un segmento se devuelven cuando sale de la ventana

Token bucket (cap 100, +20 cada 10s):   [🪙🪙🪙🪙🪙...] → cada request toma 1 ficha;
                              permite ráfagas hasta la capacidad y un promedio sostenido

Concurrency (4):              limita requests SIMULTÁNEAS, no por tiempo
```

| Algoritmo | Limita | Ventaja | Úsalo para |
|---|---|---|---|
| **Fixed window** | N por ventana fija | Simple, barato | Límites gruesos (login: 5/min) |
| **Sliding window** | N por ventana móvil | Sin ráfaga doble en el borde | Cuotas de API más justas |
| **Token bucket** | Tasa promedio + ráfaga | Tolera picos legítimos | Límite general por cliente |
| **Concurrency** | N en vuelo a la vez | Protege recursos caros | Reportes, exportaciones, llamadas a un legacy frágil |

### 5.2 Configuración de producción

```csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;   // default es 503: ¡cámbialo!
    o.OnRejected = async (ctx, ct) =>
    {
        // Decirle al cliente CUÁNDO reintentar (lo usan los clientes con Polly, Sesión 34)
        if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            ctx.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { error = "Demasiadas solicitudes" }, ct);
    };

    // Límite GLOBAL particionado: un bucket por usuario autenticado, o por IP si es anónimo
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetTokenBucketLimiter(
            partitionKey: ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = 100,                            // ráfaga máxima
                TokensPerPeriod = 20,                        // reposición...
                ReplenishmentPeriod = TimeSpan.FromSeconds(10), // ...cada 10 s (≈ 2 req/s sostenido)
                QueueLimit = 0,                              // no encolar: rechazar de inmediato
                AutoReplenishment = true
            }));

    // Políticas con nombre que se SUMAN al global
    o.AddSlidingWindowLimiter("checkout", l =>
    {
        l.PermitLimit = 10; l.Window = TimeSpan.FromMinutes(1); l.SegmentsPerWindow = 6;
        l.QueueLimit = 0;
    });
    o.AddConcurrencyLimiter("reportes", l => { l.PermitLimit = 4; l.QueueLimit = 10; });
});

app.UseRouting();
app.UseAuthentication();       // ⚠️ ANTES del limiter si particionas por usuario (si no, User está vacío)
app.UseAuthorization();
app.UseRateLimiter();          // ⚠️ DESPUÉS de UseRouting para que vea las políticas del endpoint

pedidos.MapPost("/", CrearPedido).RequireRateLimiting("checkout");
app.MapGet("/api/reportes/ventas", Reporte).RequireRateLimiting("reportes");
app.MapHealthChecks("/health/ready").DisableRateLimiting();   // el orquestador nunca debe recibir 429
```

> ⚠️ **Trampa real (la verifiqué con el sample)**: con sliding window y `QueueLimit = 2`, la request nº 11 **no** fue rechazada: quedó esperando **60 segundos** hasta que el primer segmento salió de la ventana. En una API HTTP casi siempre quieres `QueueLimit = 0` (rechazo rápido + `Retry-After`) en límites por tiempo; la cola tiene sentido en el **concurrency limiter**, donde la espera es corta.

> ⚠️ **Detrás de un load balancer** (ALB, Nginx, Ingress) `RemoteIpAddress` es la IP del balanceador → **todos** los clientes comparten un bucket. Configura `UseForwardedHeaders` con `KnownProxies`/`KnownNetworks` para leer `X-Forwarded-For` de forma segura (confiar en ese header sin restringir proxies permite falsificarlo).

> ⚠️ **Es en memoria, por instancia.** Con 4 réplicas, "100/min" son en realidad ~400/min. Para un límite global exacto necesitas un store compartido (Redis con scripts atómicos, o hacerlo en el API Gateway — Sesión 35). Regla práctica: límite por instancia en la app como **protección**, cuota de negocio exacta en el gateway.

> ❓ **Entrevista**: *"¿Fixed window vs token bucket?"* → Fixed window permite el doble de la tasa en el borde entre ventanas y es rígido; token bucket controla la tasa **promedio** y permite ráfagas acotadas por su capacidad, lo que se parece más al uso real de un cliente.

---

## 6. Health checks que no tumban tu clúster

### 6.1 Liveness, readiness y startup

Kubernetes (y ECS / ALB) hacen preguntas distintas, y responder mal a cualquiera causa incidentes:

| Probe | Pregunta | Si falla, el orquestador... | Debe chequear |
|---|---|---|---|
| **Liveness** | ¿El proceso está vivo (no colgado)? | **Mata y reinicia** el contenedor | Solo el propio proceso. **Nunca dependencias.** |
| **Readiness** | ¿Puedo recibir tráfico **ahora**? | **Saca** la instancia del balanceador (no la mata) | Dependencias críticas (BD, caché), warm-up |
| **Startup** | ¿Terminé de arrancar? | Espera; mientras tanto no evalúa liveness | Migraciones, precarga de caché |

```
Postgres cae 30 segundos:

 ❌ Liveness chequea Postgres:  todas las réplicas fallan liveness → K8s REINICIA todas
                                → arranque en frío masivo → tormenta de conexiones al volver la BD
                                → el incidente de 30 s se convierte en uno de 10 minutos

 ✅ Readiness chequea Postgres: réplicas salen del balanceador (503 rápido en el LB)
                                → la BD vuelve → readiness OK → vuelven solas, sin reinicios
```

> ❓ **Entrevista**: *"¿Pondrías el check de la base de datos en liveness?"* → No. Liveness responde "¿reiniciarme arreglaría algo?". Si la BD está caída, reiniciar la app **no** la arregla y provoca reinicios en cascada. La BD va en readiness.

### 6.2 Implementación

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    // Dependencia NO crítica → Degraded (sigue devolviendo 200) en vez de Unhealthy (503)
    .AddCheck<PagosHealthCheck>("pagos", failureStatus: HealthStatus.Degraded, tags: ["ready"])
    // Paquete AspNetCore.HealthChecks.NpgSql (hay para Redis, RabbitMQ, SQS, Kafka...)
    .AddNpgSql(builder.Configuration.GetConnectionString("Db")!, name: "postgres", tags: ["ready"]);

app.MapHealthChecks("/health/live",  new HealthCheckOptions { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("ready"),
    ResponseWriter = EscribirJson                  // por defecto solo escribe "Healthy"/"Unhealthy"
});
```

```csharp
public sealed class PagosHealthCheck(IHttpClientFactory factory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(2));    // ⚠️ un health check lento = probe fallida
            var resp = await factory.CreateClient("pagos").GetAsync("/ping", cts.Token);
            return resp.IsSuccessStatusCode
                ? HealthCheckResult.Healthy()
                : new HealthCheckResult(context.Registration.FailureStatus, $"Pagos respondió {(int)resp.StatusCode}");
        }
        catch (Exception ex)
        {
            // Usa el FailureStatus configurado en el registro (Degraded aquí), no Unhealthy fijo
            return new HealthCheckResult(context.Registration.FailureStatus, "Pagos no responde", ex);
        }
    }
}

static Task EscribirJson(HttpContext ctx, HealthReport report)
{
    ctx.Response.ContentType = "application/json";
    return ctx.Response.WriteAsync(JsonSerializer.Serialize(new
    {
        status = report.Status.ToString(),
        checks = report.Entries.Select(e => new
        {
            name = e.Key, status = e.Value.Status.ToString(),
            ms = e.Value.Duration.TotalMilliseconds, error = e.Value.Exception?.Message
        })
    }));
}
```

Mapeo de estados a HTTP por defecto: `Healthy → 200`, `Degraded → 200`, `Unhealthy → 503` (configurable con `ResultStatusCodes`). El estado global es el **peor** de los checks incluidos.

### 6.3 Kubernetes

```yaml
startupProbe:   { httpGet: { path: /health/startup, port: 8080 }, periodSeconds: 5, failureThreshold: 30 }
livenessProbe:  { httpGet: { path: /health/live,    port: 8080 }, periodSeconds: 10, failureThreshold: 3 }
readinessProbe: { httpGet: { path: /health/ready,   port: 8080 }, periodSeconds: 5,  failureThreshold: 2 }
```

> ⚠️ **Seguridad**: el JSON detallado revela tu topología (nombres de BD, errores). Expón el detalle solo en red interna o con `.RequireHost("*:8081")` / autorización; al exterior, solo el status.

> ⚠️ **Costo**: cada réplica × cada probe × cada check pega a tu BD. 20 réplicas con probe cada 5 s = 4 queries/s solo de health. Mantén los checks baratos (`SELECT 1`) o cachea el resultado con un `IHealthCheckPublisher` que corre periódicamente en background.

---

## 7. Background Services: el ciclo de vida del host

La Sesión 24 mostró cómo usar servicios scoped desde un `BackgroundService` y la 29 la cola con `Channel<T>`. Ahora, lo que casi nadie domina: **arranque, errores y apagado**.

### 7.1 `IHostedService` vs `BackgroundService`

```csharp
public interface IHostedService
{
    Task StartAsync(CancellationToken cancellationToken);   // el host ESPERA a que termine
    Task StopAsync(CancellationToken cancellationToken);    // al apagar, con un timeout
}

// BackgroundService = IHostedService que implementa StartAsync llamando a tu ExecuteAsync
// y guardando la Task; StopAsync cancela el stoppingToken y espera esa Task.
```

```
dotnet run / contenedor arranca
   │
   ├─▶ StartAsync de cada hosted service (en orden de registro; .NET 8: opcionalmente concurrente)
   │      └─ BackgroundService: ejecuta ExecuteAsync HASTA SU PRIMER await "real"  ⚠️
   ├─▶ Kestrel empieza a escuchar  (en ASP.NET Core los hosted services arrancan ANTES del servidor)
   │
   │   ... requests y workers en paralelo ...
   │
SIGTERM (Kubernetes / docker stop / Ctrl+C)
   ├─▶ IHostApplicationLifetime.ApplicationStopping
   ├─▶ Kestrel deja de aceptar conexiones, drena las en vuelo
   ├─▶ StopAsync de cada hosted service (orden INVERSO) → stoppingToken cancelado
   └─▶ Si todo no termina en ShutdownTimeout (default 30 s) → se abandona y el proceso sale
```

> ⚠️ **La trampa del arranque**: en .NET 8, la parte **síncrona** de `ExecuteAsync` (antes del primer `await` que realmente se suspende) corre dentro de `StartAsync` y **bloquea el arranque de toda la app**. Un `while(true)` con trabajo síncrono al inicio = la API nunca empieza a escuchar. Solución: `await Task.Yield();` como primera línea, o no hacer trabajo pesado antes del primer await. (.NET 10 cambió esto para ejecutar `ExecuteAsync` completo en background, pero en .NET 8 debes cuidarlo.)

### 7.2 Un worker periódico bien escrito

```csharp
public sealed class LimpiezaWorker(IServiceScopeFactory scopes, ILogger<LimpiezaWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();                                     // no bloquear el arranque del host
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5)); // async, sin solapamiento de ticks
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();    // scope NUEVO por iteración (Sesión 24)
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var borrados = await db.Carritos
                    .Where(c => c.ActualizadoEn < DateTime.UtcNow.AddDays(-7))
                    .ExecuteDeleteAsync(stoppingToken);               // Sesión 25
                log.LogInformation("Carritos abandonados eliminados: {N}", borrados);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogError(ex, "Falló la limpieza; se reintenta en el próximo tick");  // un fallo NO mata al worker
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));      // false/cancelación al apagar
    }
}
```

| Opción de temporización | Comentario |
|---|---|
| `Task.Delay` en un loop | Funciona, pero el período "deriva" (período + duración del trabajo) |
| `System.Threading.Timer` | Callback síncrono, **puede solaparse** si el trabajo tarda más que el período |
| ✅ `PeriodicTimer` (.NET 6+) | Async, un tick a la vez, cancelable. La opción moderna |
| Quartz.NET / Hangfire | Cron, persistencia, reintentos, dashboard, clúster. Cuando el job **importa** |

### 7.3 ¿Qué pasa si `ExecuteAsync` lanza una excepción?

```csharp
builder.Services.Configure<HostOptions>(o =>
{
    // Desde .NET 6 el default es StopHost: una excepción no manejada en ExecuteAsync DETIENE la app.
    // (Antes de .NET 6 se ignoraba en silencio: el worker moría y nadie se enteraba.)
    o.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.StopHost;

    // Menor que terminationGracePeriodSeconds de Kubernetes (30 s default) para apagar limpio
    o.ShutdownTimeout = TimeSpan.FromSeconds(25);

    // .NET 8: arrancar/detener hosted services en paralelo (arranque más rápido si hay varios)
    o.ServicesStartConcurrently = true;
    o.ServicesStopConcurrently = true;
});
```

> ❓ **Entrevista**: *"Tu worker dejó de procesar en producción pero la API sigue respondiendo. ¿Qué pasó?"* → Probablemente una excepción no manejada con comportamiento `Ignore`, o una iteración colgada sin timeout. Defensa: `try/catch` por iteración, `StopHost` como red de seguridad, un **health check de liveness del worker** (ej. "último tick hace < 10 min") y métricas de mensajes procesados.

### 7.4 .NET 8: `IHostedLifecycleService` y el warm-up

```csharp
// Seis hooks en vez de dos: Starting/Start/Started y Stopping/Stop/Stopped
public sealed class WarmupService(StartupGate gate, ILogger<WarmupService> log) : IHostedLifecycleService
{
    public Task StartingAsync(CancellationToken ct) => Task.CompletedTask;   // antes de TODOS los StartAsync
    public async Task StartAsync(CancellationToken ct)
    {
        log.LogInformation("Precalentando caché...");
        await Task.Delay(500, ct);                                           // cargar catálogo, compilar regex...
        gate.Listo = true;                                                   // lo lee el startup health check
    }
    public Task StartedAsync(CancellationToken ct) => Task.CompletedTask;    // después de TODOS los StartAsync
    public Task StoppingAsync(CancellationToken ct) => Task.CompletedTask;   // ej. dejar de consumir de la cola
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
    public Task StoppedAsync(CancellationToken ct) => Task.CompletedTask;
}
```

### 7.5 Varias réplicas = el job corre N veces

Con 3 réplicas de tu API, `LimpiezaWorker` corre **3 veces** cada 5 minutos. Opciones:

| Opción | Cómo |
|---|---|
| Hacer el job **idempotente** | Borrar lo ya borrado no hace daño (el caso de arriba) |
| **Lock distribuido** | `pg_try_advisory_lock`, Redis `SET NX PX`, librería `DistributedLock` |
| **Competing consumers** | El trabajo viene de una cola: cada mensaje lo toma **una** réplica (Sesión 34) |
| Proceso separado | Un *Worker Service* (`dotnet new worker`) con 1 réplica, o un CronJob de Kubernetes |

> 💡 Separar workers de la API (`dotnet new worker`) permite escalarlos, desplegarlos y reiniciarlos de forma independiente. Mismo Generic Host, mismo DI, sin Kestrel.

---

## 8. Otros básicos de producción en .NET 8

```csharp
// Request timeouts (.NET 8): cancela HttpContext.RequestAborted pasado el tiempo → 504
builder.Services.AddRequestTimeouts(o =>
{
    o.DefaultPolicy = new RequestTimeoutPolicy { Timeout = TimeSpan.FromSeconds(10) };
    o.AddPolicy("lento", TimeSpan.FromSeconds(60));
});
app.UseRequestTimeouts();
app.MapGet("/api/reportes/ventas", async (CancellationToken ct) => { await Task.Delay(1000, ct); return Results.Ok(); })
   .WithRequestTimeout("lento");
```

> ⚠️ El timeout **solo funciona si tu código observa el `CancellationToken`** (Sesión 13): el middleware cancela el token, no mata el hilo. Tampoco se aplica con el debugger adjunto (para que puedas depurar tranquilo).

| Feature | Para qué |
|---|---|
| `UseForwardedHeaders` | IP/esquema reales detrás de un proxy (rate limit, HTTPS redirect, logs) |
| `AddRequestTimeouts` | No dejar requests colgadas consumiendo recursos |
| `AddProblemDetails` + `IExceptionHandler` | Errores consistentes (Sesión 23) |
| `AddResponseCompression` | Solo si no lo hace el proxy/CDN |
| `AddHttpLogging` | Depuración (cuidado con PII y costo) |
| Métricas nativas (`Microsoft.AspNetCore.Hosting`, `...RateLimiting`) | Requests, rechazos 429, duración: base de la Sesión 36 |

---

## Resumen mental de la sesión

```
Middleware:  convención (singleton, scoped por parámetro)  vs  IMiddleware (DI por request, registrar)
             UseWhen (se reúne) · MapWhen (terminal) · GetEndpoint() tras UseRouting → metadata
             OnStarting para headers · EnableBuffering solo donde haga falta · ShortCircuit (.NET 8)

Filtros MVC: Authorization → Resource → [binding] → Action → Acción → Exception → Result
             ServiceFilter (del contenedor) vs TypeFilter (ActivatorUtilities)
             Endpoint filters + factories para Minimal APIs
             Middleware = HTTP crudo; Filtro = argumentos y resultados del handler

Versionado:  Asp.Versioning · Combine(URL, header, query) · ReportApiVersions · deprecated + Sunset
             breaking = renombrar/eliminar/cambiar tipo · retirar con datos de uso

Rate limit:  fixed · sliding · token bucket · concurrency · particionar por usuario/IP
             429 + Retry-After · QueueLimit=0 en límites por tiempo · después de Routing y AuthN
             en memoria POR INSTANCIA · ForwardedHeaders detrás del LB

Health:      live = solo el proceso · ready = dependencias · startup = warm-up
             Degraded (200) vs Unhealthy (503) · checks baratos, con timeout, detalle solo interno

Host:        StartAsync bloquea el arranque (Task.Yield) · PeriodicTimer · scope por iteración
             StopHost (default .NET 6+) · ShutdownTimeout < grace period · IHostedLifecycleService
             N réplicas = N ejecuciones → idempotencia / lock distribuido / cola
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Diferencia entre un middleware por convención y uno `IMiddleware`? ¿Cómo usa cada uno un servicio scoped?
2. ❓ ¿Qué diferencia hay entre `UseWhen` y `MapWhen`? ¿Qué hace `ShortCircuit()` y qué riesgo tiene?
3. ❓ ¿Cómo puede un middleware leer un atributo del endpoint? ¿Por qué debe ir después de `UseRouting`?
4. ❓ Describe el orden de los filtros MVC. ¿Qué excepciones **no** atrapa un exception filter?
5. ❓ ¿`ServiceFilter` vs `TypeFilter`? ¿Por qué un atributo filtro normal no puede recibir servicios?
6. ❓ ¿Validación en middleware o en filtro? Justifica.
7. ❓ ¿Qué cambios son breaking en una API? ¿Cómo anuncias y retiras una versión?
8. ❓ Compara fixed window, sliding window, token bucket y concurrency limiter. ¿Cuál usarías como límite general por cliente?
9. ❓ Tu API tiene 4 réplicas detrás de un ALB y rate limiting por IP. ¿Qué dos problemas tiene?
10. ❓ Liveness vs readiness vs startup. ¿Por qué la BD nunca va en liveness?
11. ❓ ¿Qué pasa si `ExecuteAsync` hace trabajo síncrono pesado antes de su primer `await`? ¿Y si lanza una excepción?
12. ❓ ¿Cómo evitas que un job de un `BackgroundService` se ejecute N veces con N réplicas?

## Ejercicio práctico
Extiende **OrderFlow** (el capstone de la Sesión 32) con su capa de "producción":

1. **Tenant + correlación**: implementa `TenantMiddleware` como `IMiddleware` aplicado con `UseWhen` solo a `/api`, y verifica en los logs que cada línea lleva `TenantId` y `CorrelationId`.
2. **Auditoría declarativa**: crea `[Auditable("accion")]` + `AuditMetadataMiddleware` y márcalo en `POST /pedidos` y `POST /pedidos/{id}/cancelar`.
3. **Endpoint filter**: `IdempotencyHeaderFilter` que exige `Idempotency-Key` en `POST /pedidos` (la lógica de deduplicación real la harás en la Sesión 34).
4. **Versionado**: crea `v2` de `GET /pedidos/{id}` donde `Total` pasa de `decimal` a `Dinero(Monto, Moneda)`. Marca `v1` como deprecated con política `Sunset`, y comprueba con `curl -i` los headers `api-supported-versions`, `api-deprecated-versions` y `Sunset`.
5. **Rate limiting**: global token bucket por usuario (del JWT de la Sesión 28) o IP; `checkout` sliding window 10/min con `QueueLimit = 0`; `reportes` con concurrency limiter 4. Con un loop de `curl` (o k6) verifica el `429` y el header `Retry-After`. Luego pon `QueueLimit = 2` y mide cuánto espera la request nº 11.
6. **Health checks**: `/health/live` (solo `self`), `/health/ready` (Postgres + Redis Unhealthy, proveedor de pagos Degraded), `/health/startup` ligado a un `WarmupService` que precarga el catálogo en `HybridCache`. Detén el contenedor de Postgres en Docker Compose y observa: ready → 503, live → 200.
7. **Worker de limpieza**: `BackgroundService` con `PeriodicTimer` que cancela pedidos `Pendiente` con más de 30 min usando `ExecuteUpdateAsync`. Protégelo con `pg_try_advisory_lock` y levanta 2 instancias de la API para comprobar que solo una lo ejecuta.
8. **Apagado limpio**: con `ShutdownTimeout = 25s`, lanza un `POST` lento y envía `docker stop`; verifica en logs que la request termina y que `StopAsync` del worker se ejecuta antes de salir.
9. (Opcional) Escribe un test de integración con `WebApplicationFactory` (Sesión 27) que verifique que la request nº 11 a `checkout` devuelve `429`.

---

➡️ **Cuando termines**, marca la Sesión 33 en el [README](Readme.md) y pídeme la **Sesión 34 — Mensajería y resiliencia (RabbitMQ, Kafka, MassTransit, Polly, Outbox, idempotencia)**.
