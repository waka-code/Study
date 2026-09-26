# Sesión 30 — Performance: BenchmarkDotNet, caching, Redis y pooling

> **Objetivo de la sesión**: aprender a optimizar **con datos, no con intuición**. Al terminar deberías poder escribir un benchmark correcto con BenchmarkDotNet, diagnosticar problemas con `dotnet-counters` y `dotnet-trace`, reducir asignaciones (pooling, `Span`, `StringBuilder`, colecciones congeladas), aplicar caching en capas (`IMemoryCache`, Redis con `IDistributedCache`, `HybridCache`, Output Caching) conociendo sus trampas, y reutilizar recursos caros (`HttpClient`, conexiones de BD, `DbContext`).

---

## 1. La mentalidad: medir, no adivinar

> *"Premature optimization is the root of all evil"* — Donald Knuth. La frase completa sigue: *"...yet we should not pass up our opportunities in that critical 3%"*.

El ciclo de performance profesional:

```
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │ 1. Definir   │────►│ 2. Medir     │────►│ 3. Encontrar │────►│ 4. Optimizar │
   │ objetivo     │     │ (baseline)   │     │ el cuello    │     │ UNA cosa     │
   │ p99 < 200ms  │     │              │     │ de botella   │     │              │
   └──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
          ▲                                                              │
          └───────────────────── 5. Volver a medir ◄─────────────────────┘
```

Qué suele costar en una app .NET típica, de mayor a menor:

| Coste | Orden de magnitud | Ejemplo |
|---|---|---|
| Red entre regiones | ~100 ms | Llamar a una API en otro continente |
| Query a BD / Redis en la misma red | ~0.5–5 ms | `SELECT` indexado, `GET` en Redis |
| Leer de disco SSD | ~0.1 ms | `File.ReadAllBytes` pequeño |
| GC Gen2 completo | ms a cientos de ms | Heap grande con muchas asignaciones |
| Acceso a memoria RAM | ~100 ns | Cache miss de CPU |
| Llamada a método virtual | ~1 ns | `callvirt` |

**Conclusión**: el 90% de los problemas reales está en **I/O** (queries N+1, llamadas de red en serie, falta de caché) y en **asignaciones excesivas** que presionan al GC (Sesión 14). Micro-optimizar un `for` rara vez importa.

> ❓ **Entrevista**: *"¿Cómo abordas un endpoint lento?"* → Defino la métrica (latencia p95/p99, throughput), mido en un entorno parecido a producción, identifico el cuello de botella con trazas/profiler (¿BD? ¿red? ¿CPU? ¿GC?), optimizo lo que más pesa, y vuelvo a medir. Nunca optimizo sin baseline.

---

## 2. BenchmarkDotNet: microbenchmarks correctos

Medir con `Stopwatch` en un bucle es **engañoso**: el JIT tiene tiers (Tier0 → Tier1, Sesión 31), hay warm-up, el GC interviene al azar, el compilador puede eliminar código cuyo resultado no usas (*dead code elimination*). BenchmarkDotNet resuelve todo eso: ejecuta en un proceso aparte, hace warm-up, repite muchas iteraciones y calcula estadísticas.

```bash
dotnet new console -o Benchmarks
cd Benchmarks
dotnet add package BenchmarkDotNet
```

```csharp
using System.Text;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

BenchmarkRunner.Run<StringBenchmarks>();

[MemoryDiagnoser]                 // muestra bytes asignados y colecciones del GC por operación
public class StringBenchmarks
{
    [Params(10, 1_000)]           // se ejecuta el benchmark para cada valor
    public int N;

    [Benchmark(Baseline = true)]  // las demás se comparan contra esta (columna Ratio)
    public string Concatenar()
    {
        string s = "";
        for (int i = 0; i < N; i++) s += i;   // cada += crea un string NUEVO
        return s;                             // devolver el resultado evita dead code elimination
    }

    [Benchmark]
    public string ConStringBuilder()
    {
        var sb = new StringBuilder();
        for (int i = 0; i < N; i++) sb.Append(i);
        return sb.ToString();
    }

    [Benchmark]
    public string ConStringJoin() => string.Join("", Enumerable.Range(0, N));
}
```

```bash
dotnet run -c Release     # ⚠️ SIEMPRE en Release; en Debug BenchmarkDotNet se niega a correr
```

Salida típica (ilustrativa):

```
| Method           | N    | Mean         | Ratio | Gen0     | Allocated  | Alloc Ratio |
|----------------- |----- |-------------:|------:|---------:|-----------:|------------:|
| Concatenar       | 1000 | 280,000.0 ns |  1.00 | 950.0000 | 3,900 KB   |        1.00 |
| ConStringBuilder | 1000 |   9,000.0 ns |  0.03 |   2.0000 |    13 KB   |       0.003 |
| ConStringJoin    | 1000 |  12,000.0 ns |  0.04 |   2.5000 |    16 KB   |       0.004 |
```

Cómo leerla: **Mean** (tiempo medio), **Ratio** (vs baseline), **Gen0** (colecciones Gen0 por cada 1000 operaciones), **Allocated** (bytes asignados por operación). *Allocated* suele ser el número más importante en servidores: menos asignación = menos GC = mejor p99.

Atributos útiles:

| Atributo | Para qué |
|---|---|
| `[GlobalSetup]` / `[GlobalCleanup]` | Preparar datos una vez (no se mide) |
| `[IterationSetup]` | Antes de cada iteración (cuidado: distorsiona benchmarks muy cortos) |
| `[Arguments(...)]` | Parámetros del método benchmark |
| `[SimpleJob(RuntimeMoniker.Net80)]` | Comparar runtimes (.NET 8 vs 9) |
| `[DisassemblyDiagnoser]` | Ver el código máquina generado por el JIT |

⚠️ **Errores comunes**: correr en Debug o con el depurador conectado; no devolver/consumir el resultado; medir cosas con I/O real (resultados ruidosos); sacar conclusiones de un microbenchmark sin comprobar el impacto en la app real.

---

## 3. Diagnóstico en runtime: las herramientas `dotnet-*`

BenchmarkDotNet mide *un método*. Para una **aplicación corriendo** usas las herramientas de diagnóstico:

```bash
dotnet tool install -g dotnet-counters
dotnet tool install -g dotnet-trace
dotnet tool install -g dotnet-dump
dotnet tool install -g dotnet-gcdump
```

| Herramienta | Pregunta que responde | Ejemplo |
|---|---|---|
| `dotnet-counters` | ¿Cómo está la app *ahora*? (CPU, GC, thread pool, excepciones/seg, requests/seg) | `dotnet-counters monitor -n MiApi` |
| `dotnet-trace` | ¿*Dónde* se va el tiempo? (muestreo de CPU, eventos) | `dotnet-trace collect -p <pid>` → abrir `.nettrace` en PerfView/VS/SpeedScope |
| `dotnet-gcdump` | ¿*Qué objetos* ocupan el heap? | Detectar fugas de memoria |
| `dotnet-dump` | Snapshot completo del proceso | Analizar deadlocks, hilos colgados (`clrstack`, `syncblk`) |

Contadores que miras primero en un servicio:
- `% Time in GC since last GC` → si es alto (>10%), estás asignando demasiado.
- `Gen 0/1/2 GC Count` y `Allocation Rate` → presión de asignación.
- `ThreadPool Queue Length` creciendo → thread pool starvation (Sesión 29).
- `Exception Count` → excepciones usadas como flujo de control (Sesión 12) son caras.

En producción, lo mismo se expone vía **OpenTelemetry** (métricas + trazas distribuidas) hacia Prometheus/Grafana, Datadog, CloudWatch, etc.

---

## 4. Reducir asignaciones

Cada objeto en el heap es trabajo futuro para el GC. En código "caliente" (ejecutado miles de veces por segundo), reducir asignaciones es la optimización con mejor retorno.

### 4.1 Strings

```csharp
// ❌ Concatenación en bucle: O(n²) en memoria
// ✅ StringBuilder (ver benchmark)

// ✅ string.Create: construye el string directamente en su memoria final, sin buffer intermedio
static string FormatearId(int cliente, int pedido) =>
    string.Create(21, (cliente, pedido), static (span, estado) =>
    {
        estado.cliente.TryFormat(span[..10], out _, "D10");   // 10 dígitos con ceros
        span[10] = '-';
        estado.pedido.TryFormat(span[11..], out _, "D10");
    });

Console.WriteLine(FormatearId(42, 7)); // 0000000042-0000000007

// ✅ Comparaciones sin crear strings nuevos
bool iguales = string.Equals(a, b, StringComparison.OrdinalIgnoreCase); // en vez de a.ToLower() == b.ToLower()

// ✅ Trabajar con slices en vez de Substring (Sesión 19)
ReadOnlySpan<char> dominio = email.AsSpan(email.IndexOf('@') + 1);  // 0 asignaciones
```

La lambda `static` impide capturar variables por accidente (una captura crearía un closure = asignación, Sesión 10).

### 4.2 `ArrayPool<T>`: reutilizar buffers

```csharp
using System.Buffers;

async Task CopiarAsync(Stream origen, Stream destino, CancellationToken ct)
{
    byte[] buffer = ArrayPool<byte>.Shared.Rent(81920);  // puede devolver un array MÁS GRANDE que lo pedido
    try
    {
        int leidos;
        while ((leidos = await origen.ReadAsync(buffer.AsMemory(0, 81920), ct)) > 0)
            await destino.WriteAsync(buffer.AsMemory(0, leidos), ct);
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer);   // devolver SIEMPRE; clearArray: true si tenía datos sensibles
    }
}
```

⚠️ Trampas del pooling: usar `buffer.Length` en vez del tamaño pedido (puede ser mayor); seguir usando el array después de `Return` (otro código ya lo tiene: corrupción de datos); olvidar devolverlo (no es fuga grave, pero pierdes el beneficio).

### 4.3 `ObjectPool<T>`: reutilizar objetos caros

```csharp
using System.Text;
using Microsoft.Extensions.ObjectPool;   // paquete Microsoft.Extensions.ObjectPool

var provider = new DefaultObjectPoolProvider();
ObjectPool<StringBuilder> pool = provider.CreateStringBuilderPool();

string ConstruirCsv(IEnumerable<string[]> filas)
{
    StringBuilder sb = pool.Get();
    try
    {
        foreach (var fila in filas) sb.AppendJoin(',', fila).AppendLine();
        return sb.ToString();
    }
    finally
    {
        pool.Return(sb);   // la policy de StringBuilder hace Clear() al devolver
    }
}
```

Otros pools que ya usas sin saberlo: el **pool de conexiones de ADO.NET**, el pool de conexiones de `SocketsHttpHandler`, el **thread pool**, `RecyclableMemoryStream` (paquete `Microsoft.IO.RecyclableMemoryStream`) para `MemoryStream` grandes que irían al LOH.

### 4.4 Colecciones: elige y dimensiona bien

```csharp
using System.Buffers;
using System.Collections.Frozen;

// ✅ Capacidad inicial si conoces el tamaño: evita re-crecimientos (copias) internos
var lista = new List<string>(capacity: 5_000);
var mapa  = new Dictionary<int, string>(capacity: 10_000);

Console.WriteLine(Catalogos.Tasas["USD"]);                 // 1
Console.WriteLine(Catalogos.PaisesPermitidos.Contains("CL")); // True
Console.WriteLine(Catalogos.PrimeraVocal("Murciélago"));      // 1

static class Catalogos
{
    // ✅ .NET 8: colecciones congeladas para datos de solo lectura consultados muchísimo.
    // Creación más lenta (analiza las claves para elegir la mejor estrategia), lecturas más rápidas.
    public static readonly FrozenDictionary<string, decimal> Tasas = new Dictionary<string, decimal>
    {
        ["CLP"] = 0.0011m, ["USD"] = 1m, ["EUR"] = 1.08m
    }.ToFrozenDictionary();

    public static readonly FrozenSet<string> PaisesPermitidos = new[] { "CL", "AR", "PE" }.ToFrozenSet();

    // ✅ .NET 8: SearchValues precalcula la búsqueda de un conjunto de caracteres (usa SIMD)
    private static readonly SearchValues<char> Vocales = SearchValues.Create("aeiouAEIOU");

    public static int PrimeraVocal(string texto) => texto.AsSpan().IndexOfAny(Vocales);
}
```

### 4.5 Otras palancas

| Técnica | Qué ahorra | Referencia |
|---|---|---|
| `Span<T>`, `stackalloc` | Asignaciones de arrays temporales | Sesión 19 |
| `ValueTask<T>` en métodos que suelen completar sincrónicamente | La asignación del `Task` | Sesión 13 |
| `struct` pequeños e inmutables (`readonly struct`) | Objetos en heap (cuidado con el boxing) | Sesiones 2 y 31 |
| `sealed` en clases | Permite devirtualizar al JIT | Sesión 31 |
| Evitar LINQ en hot paths extremos | Enumeradores y delegates | Sesión 9 |
| JSON con source generators | Reflection en runtime, arranque | Sesiones 22 y 31 |
| Streaming (`IAsyncEnumerable`) en vez de cargar todo | Picos de memoria | Sesión 13 |

---

## 5. Caching: la optimización más rentable (y más peligrosa)

> *"There are only two hard things in Computer Science: cache invalidation and naming things."* — Phil Karlton

Cachear es guardar el resultado de algo caro para reutilizarlo. La pregunta nunca es "¿cacheo?", sino **"¿cuánto tiempo puedo tolerar datos desactualizados?"**.

```
   Cliente ──► [CDN / Output cache] ──► [L1: memoria del proceso] ──► [L2: Redis] ──► [BD]
                  ~0 ms en app             ~100 ns                     ~1 ms           ~5-50 ms
                  por respuesta HTTP        por instancia               compartido      fuente de verdad
```

### 5.1 Patrones de caché

| Patrón | Cómo funciona | Pros / Contras |
|---|---|---|
| **Cache-aside** (lazy loading) | La app mira la caché; si falla (miss), lee la BD y guarda en caché | El más común. Primer request lento; posible dato viejo hasta que expire |
| **Read-through** | La caché misma carga de la BD en un miss | La app no conoce la BD; requiere soporte del proveedor |
| **Write-through** | Cada escritura va a caché y BD a la vez | Caché siempre fresca; escrituras más lentas |
| **Write-behind** | Escribe en caché y la BD se actualiza después | Escrituras rapidísimas; riesgo de perder datos |

Estrategias de invalidación: **TTL** (expiración por tiempo, la más simple y robusta), **invalidación explícita** al escribir (borrar la clave), **por eventos** (un mensaje avisa a todas las instancias), **versionado de claves** (`producto:42:v7`).

### 5.2 `IMemoryCache` (L1, en proceso)

```csharp
builder.Services.AddMemoryCache(o => o.SizeLimit = 10_000);   // límite en "unidades" que tú defines

public class ProductoService(IMemoryCache cache, AppDbContext db)
{
    public async Task<ProductoDto?> ObtenerAsync(int id, CancellationToken ct)
    {
        return await cache.GetOrCreateAsync($"producto:{id}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10); // máximo absoluto
            entry.SlidingExpiration = TimeSpan.FromMinutes(2);                // expira si nadie lo lee en 2 min
            entry.Size = 1;                                                   // obligatorio si hay SizeLimit

            return await db.Productos
                .AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new ProductoDto(p.Id, p.Nombre, p.Precio))
                .FirstOrDefaultAsync(ct);
        });
    }

    public void Invalidar(int id) => cache.Remove($"producto:{id}");  // al actualizar el producto
}
```

⚠️ **Trampas de `IMemoryCache`**:
1. **Sin límite de tamaño = fuga de memoria** si las claves dependen de input del usuario (ej. cachear búsquedas arbitrarias).
2. **Cache stampede** (*thundering herd*): expira una clave popular y 500 requests simultáneos ven el miss y van **todos** a la BD. `GetOrCreateAsync` de `IMemoryCache` **no** lo evita.
3. **Cachear objetos mutables**: devuelves la misma instancia a todos; si alguien la modifica, la corrompes para el resto. Cachea DTOs inmutables (records).
4. **Con varias instancias** (Kubernetes, ECS), cada una tiene su propia caché → datos inconsistentes entre instancias e invalidación que solo afecta a una.

### 5.3 Redis con `IDistributedCache` (L2, compartido)

**Redis** es un almacén clave-valor en memoria, externo al proceso, compartido por todas las instancias. Además de caché ofrece estructuras (hashes, listas, sets ordenados), pub/sub, contadores atómicos y locks distribuidos.

```bash
docker run -d --name redis -p 6379:6379 redis:7
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
```

```csharp
builder.Services.AddStackExchangeRedisCache(o =>
{
    o.Configuration = builder.Configuration.GetConnectionString("Redis"); // "localhost:6379"
    o.InstanceName = "tienda:";   // prefijo para todas las claves
});

public class CatalogoService(IDistributedCache cache, AppDbContext db)
{
    private static readonly DistributedCacheEntryOptions Opciones = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public async Task<List<CategoriaDto>> CategoriasAsync(CancellationToken ct)
    {
        string? json = await cache.GetStringAsync("categorias", ct);
        if (json is not null)
            return JsonSerializer.Deserialize<List<CategoriaDto>>(json)!;   // hit

        var categorias = await db.Categorias.AsNoTracking()
            .Select(c => new CategoriaDto(c.Id, c.Nombre)).ToListAsync(ct); // miss → BD

        await cache.SetStringAsync("categorias", JsonSerializer.Serialize(categorias), Opciones, ct);
        return categorias;
    }
}
```

`IDistributedCache` trabaja con `byte[]`/strings: **tú serializas**. Para funcionalidades avanzadas de Redis usa directamente `StackExchange.Redis` (`IConnectionMultiplexer`, registrado como **singleton**: está diseñado para compartirse y reutilizar conexiones).

⚠️ Si Redis cae, ¿tu app cae? Decide la política: normalmente *fail-open* (captura el error, ve a la BD) con timeouts cortos.

### 5.4 `HybridCache` (.NET 9+): L1 + L2 + anti-stampede

`HybridCache` (paquete `Microsoft.Extensions.Caching.Hybrid`, usable también desde .NET 8) combina una caché en memoria (L1) con la `IDistributedCache` registrada (L2), y **protege contra stampede**: si 500 requests piden la misma clave en un miss, solo **uno** ejecuta la factory y los demás esperan su resultado. Además serializa por ti y soporta invalidación por **tags**.

```csharp
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = "localhost:6379"); // L2 (opcional)
builder.Services.AddHybridCache(o =>
{
    o.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(5),          // L2
        LocalCacheExpiration = TimeSpan.FromMinutes(1) // L1
    };
});

public class ProductoQuery(HybridCache cache, AppDbContext db)
{
    public ValueTask<ProductoDto?> ObtenerAsync(int id, CancellationToken ct) =>
        cache.GetOrCreateAsync(
            $"producto:{id}",
            async token => await db.Productos.AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new ProductoDto(p.Id, p.Nombre, p.Precio))
                .FirstOrDefaultAsync(token),
            tags: ["productos"],
            cancellationToken: ct);

    public ValueTask InvalidarTodosAsync(CancellationToken ct) =>
        cache.RemoveByTagAsync("productos", ct);
}
```

| | `IMemoryCache` | `IDistributedCache` (Redis) | `HybridCache` |
|---|---|---|---|
| Ubicación | Proceso | Externa, compartida | Ambas (L1 + L2) |
| Latencia | ~ns | ~ms (red + serialización) | ns en hit L1 |
| Sobrevive a reinicios | ❌ | ✅ | L2 sí |
| Consistente entre instancias | ❌ | ✅ | L2 sí (L1 puede ir unos segundos detrás) |
| Protección stampede | ❌ | ❌ | ✅ |
| Serialización | No necesita | Manual | Automática |

> ❓ **Entrevista**: *"¿Qué es un cache stampede y cómo lo evitas?"* → Cuando una clave popular expira y muchas peticiones concurrentes hacen miss a la vez y golpean la fuente. Soluciones: coalescer peticiones (un solo "fetch" por clave, como hace `HybridCache` o un `SemaphoreSlim`/`Lazy` por clave), expiraciones con *jitter* aleatorio para que no expiren todas juntas, y refresco anticipado en background.

### 5.5 Output Caching en ASP.NET Core (.NET 7+)

Cachea la **respuesta HTTP completa** en el servidor; el endpoint ni siquiera se ejecuta en un hit.

```csharp
builder.Services.AddOutputCache(o =>
{
    o.AddPolicy("Catalogo", p => p.Expire(TimeSpan.FromSeconds(60)).Tag("catalogo"));
});

var app = builder.Build();
app.UseOutputCache();

app.MapGet("/productos", async (AppDbContext db) => await db.Productos.AsNoTracking().ToListAsync())
   .CacheOutput("Catalogo");

app.MapGet("/productos/{id:int}", (int id) => $"Producto {id}")
   .CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)).SetVaryByQuery("lang"));

// Invalidar al modificar
app.MapPost("/productos", async (IOutputCacheStore store, CancellationToken ct) =>
{
    // ... guardar ...
    await store.EvictByTagAsync("catalogo", ct);
    return Results.Created();
});
```

A diferencia del viejo *Response Caching* (basado en cabeceras `Cache-Control` que el cliente puede saltarse), Output Caching lo controla el servidor, tiene protección contra stampede y puede usar Redis como almacén (`AddStackExchangeRedisOutputCache`, .NET 8).

⚠️ Nunca cachees respuestas **personalizadas por usuario** sin variar por usuario: filtrarías datos de un cliente a otro (Sesión 28). Por defecto Output Caching no cachea requests autenticados ni con cookies.

---

## 6. Pooling de recursos caros

### 6.1 `HttpClient`: el bug más famoso de .NET

```csharp
// ❌ Crear y desechar HttpClient por petición
using (var http = new HttpClient())         // cada instancia abre sus propias conexiones TCP
    await http.GetStringAsync(url);         // al desecharla, los sockets quedan en TIME_WAIT
// Bajo carga → "socket exhaustion": se agotan los puertos

// ❌ Un HttpClient static para siempre sin configuración → no respeta cambios de DNS
```

Soluciones correctas:

```csharp
// ✅ Opción 1: IHttpClientFactory (lo normal en ASP.NET Core, Sesión 24)
builder.Services.AddHttpClient<PagosClient>(c =>
{
    c.BaseAddress = new Uri("https://api.pagos.com/");
    c.Timeout = TimeSpan.FromSeconds(10);
});
// La factory recicla los handlers (y sus conexiones) periódicamente → respeta DNS, sin socket exhaustion

// ✅ Opción 2: un HttpClient compartido con rotación de conexiones (consolas, librerías)
static readonly HttpClient Http = new(new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(2)   // renueva conexiones → nuevos DNS
});
```

### 6.2 Conexiones a base de datos

ADO.NET (y por tanto EF Core) mantiene un **pool de conexiones** por cadena de conexión. `Open()` toma una del pool; `Dispose()`/`Close()` la **devuelve** (no cierra el socket). Por eso el patrón correcto es *abrir tarde, cerrar pronto*:

```csharp
await using var conn = new SqlConnection(cadena);   // barato: toma del pool
await conn.OpenAsync(ct);
// ... usar ...
// al salir del using vuelve al pool
```

⚠️ Si no desechas conexiones (o las mantienes durante operaciones largas), agotas el pool (defecto `Max Pool Size=100` en SqlClient) y los requests empiezan a fallar con timeout esperando conexión.

### 6.3 EF Core: los grandes ahorros (Sesión 25)

```csharp
// ✅ DbContext pooling: reutiliza instancias de DbContext (resetea su estado)
builder.Services.AddDbContextPool<AppDbContext>(o => o.UseNpgsql(cadena));

// ✅ Lecturas sin tracking: no crea snapshots para detección de cambios
var lista = await db.Pedidos.AsNoTracking().Where(p => p.ClienteId == id).ToListAsync(ct);

// ✅ Proyecta solo lo que necesitas (SELECT de 3 columnas, no de 40)
var resumen = await db.Pedidos
    .Where(p => p.Fecha >= desde)
    .Select(p => new PedidoResumen(p.Id, p.Total, p.Cliente.Nombre))  // join resuelto en SQL
    .ToListAsync(ct);

// ✅ Evita N+1: Include o proyección, nunca lazy loading en bucles
// ❌ foreach (var p in pedidos) Console.WriteLine(p.Cliente.Nombre); // 1 query por pedido con lazy loading

// ✅ Actualizaciones masivas sin cargar entidades (EF Core 7+)
await db.Productos.Where(p => p.Stock == 0)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Activo, false), ct);

// ✅ Queries compiladas para consultas ultra frecuentes
static readonly Func<AppDbContext, int, Task<Producto?>> PorId =
    EF.CompileAsyncQuery((AppDbContext db, int id) => db.Productos.FirstOrDefault(p => p.Id == id));
```

Y lo que ningún código arregla: **índices** en la BD. Revisa el plan de ejecución de las queries lentas.

---

## 7. Configuración del runtime

| Ajuste (`.csproj`) | Efecto | Cuándo |
|---|---|---|
| `<ServerGarbageCollector>true</ServerGarbageCollector>` | Un heap GC por núcleo, más throughput | Por defecto en ASP.NET Core |
| `<ConcurrentGarbageCollection>` | GC de Gen2 en background | Activado por defecto |
| `<TieredPGO>true</TieredPGO>` | Optimización guiada por perfil dinámico | **Activado por defecto desde .NET 8** (Sesión 31) |
| `<PublishReadyToRun>true</PublishReadyToRun>` | Precompila a nativo, mejor arranque | Apps con cold start sensible |
| `<PublishAot>true</PublishAot>` | Native AOT: arranque mínimo, menos memoria | Lambdas, CLIs, microservicios (Sesión 31) |
| `<InvariantGlobalization>true</InvariantGlobalization>` | Quita ICU, imagen más ligera | Contenedores sin necesidad de culturas |

Desde .NET 9, Server GC activa por defecto **DATAS** (adaptación dinámica del número de heaps), lo que reduce mucho la memoria en contenedores con poca carga.

Y no olvides lo más barato: **actualizar de versión de .NET**. Cada versión trae mejoras de rendimiento sustanciales "gratis".

---

## 8. Resumen mental de la sesión

```
Medir → encontrar cuello de botella → optimizar UNA cosa → volver a medir
   Microbenchmark: BenchmarkDotNet, Release, [MemoryDiagnoser], Baseline
   App viva: dotnet-counters (qué pasa) · dotnet-trace (dónde) · gcdump/dump (qué objetos / hilos)

Asignaciones = trabajo para el GC
   StringBuilder, string.Create, Span, ArrayPool (Rent/Return en finally), ObjectPool
   Capacidad inicial, FrozenDictionary/FrozenSet, SearchValues, ValueTask, sealed

Caching (¿cuánto dato viejo tolero?)
   Cache-aside + TTL + invalidación explícita
   IMemoryCache (L1, por instancia, SizeLimit!) · Redis/IDistributedCache (L2, compartido)
   HybridCache = L1+L2 + anti-stampede + tags · Output Cache = respuesta HTTP entera
   Trampas: stampede, objetos mutables, sin límite, datos por usuario

Pooling: IHttpClientFactory / PooledConnectionLifetime · pool ADO.NET (abre tarde, cierra pronto)
EF Core: AddDbContextPool, AsNoTracking, proyección, sin N+1, ExecuteUpdate, índices
```

---

## 9. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Por qué `Stopwatch` en un bucle no es un benchmark fiable? ¿Qué resuelve BenchmarkDotNet?
2. ❓ En un resultado de BenchmarkDotNet, ¿qué significan `Allocated` y `Gen0`? ¿Por qué importan en un servidor?
3. ❓ ¿Qué herramienta usas para ver en vivo el uso de GC y del thread pool de una app en producción?
4. ❓ ¿Cómo funciona `ArrayPool<T>` y cuáles son sus trampas?
5. ❓ Explica cache-aside. ¿Qué estrategias de invalidación conoces?
6. ❓ ¿`IMemoryCache` vs `IDistributedCache` vs `HybridCache`? ¿Cuándo cada uno?
7. ❓ ¿Qué es un cache stampede y cómo se mitiga?
8. ❓ ¿Qué riesgos tiene cachear respuestas en un endpoint autenticado?
9. ❓ ¿Por qué `new HttpClient()` por petición es un problema? ¿Y un `static` sin configurar?
10. ❓ ¿Cómo funciona el pool de conexiones de ADO.NET? ¿Qué pasa si no desechas conexiones?
11. ❓ Nombra 5 optimizaciones de EF Core.
12. ❓ ¿Qué es `FrozenDictionary` y cuándo lo usarías?

## 10. Ejercicio práctico
1. Crea un proyecto `Benchmarks` con BenchmarkDotNet y compara:
   - Concatenación vs `StringBuilder` vs `string.Join` (sección 2).
   - `Dictionary` vs `FrozenDictionary` para 1 000 lecturas sobre 100 claves.
   - `new byte[8192]` vs `ArrayPool<byte>.Shared.Rent(8192)` dentro de un método. Observa la columna *Allocated*.
2. Crea una Minimal API con un endpoint `/productos/{id}` que simule una BD lenta (`await Task.Delay(200)`).
   - Mide con `curl -w "%{time_total}\n"` o con `bombardier`/`k6`.
   - Añade `IMemoryCache` con `SizeLimit` y TTL. Vuelve a medir.
   - Levanta Redis con Docker, cambia a `HybridCache` con L2 Redis, arranca **dos instancias** de la API en puertos distintos y verifica que comparten la caché.
3. **Stampede**: lanza 200 requests concurrentes a una clave sin cachear con `IMemoryCache.GetOrCreateAsync` y cuenta cuántas veces se ejecuta la "BD" (con un `Interlocked.Increment`). Repite con `HybridCache` y compara.
4. Añade `AddOutputCache` a un endpoint de listado con tag e invalídalo desde un `POST`.
5. Ejecuta la API bajo carga y observa `dotnet-counters monitor -n <nombre>`: anota *Allocation Rate* y *% Time in GC* antes y después de tus optimizaciones.

---

➡️ **Cuando termines**, marca la Sesión 30 en el [README](Readme.md) y pídeme la **Sesión 31 — Internals del CLR (JIT tiers, AOT, boxing, VTable)**.
