# Sesión 29 — Concurrencia avanzada: Channels, locks, Parallel y PLINQ

> **Objetivo de la sesión**: pasar de "sé usar `async/await`" (Sesión 13) a **razonar sobre estado compartido entre hilos**. Al terminar deberías poder explicar qué es una *race condition* y cómo evitarla, elegir la primitiva de sincronización correcta (`Interlocked`, `lock`, `SemaphoreSlim`, `ReaderWriterLockSlim`…), usar colecciones concurrentes sin caer en sus trampas, montar un pipeline productor/consumidor con **`System.Threading.Channels`**, y distinguir cuándo usar `Parallel`, `Parallel.ForEachAsync` o **PLINQ**.

---

## 1. Concurrencia vs paralelismo (y por qué importa distinguirlos)

En la Sesión 13 vimos `async/await`, que es sobre todo **concurrencia de I/O**: mientras esperas una respuesta HTTP o una query, el hilo se libera y atiende otra cosa. Aquí damos el siguiente paso: **varios hilos ejecutando código a la vez sobre los mismos datos**.

| Concepto | Qué es | Recurso limitante | Herramienta típica en .NET |
|---|---|---|---|
| **Concurrencia** | Gestionar *varias tareas en curso* a la vez (pueden turnarse en un solo núcleo) | Latencia de I/O | `async/await`, `Task.WhenAll`, Channels |
| **Paralelismo** | Ejecutar *varias tareas literalmente al mismo tiempo* en varios núcleos | CPU | `Parallel.For/ForEach`, PLINQ, `Task.Run` |
| **Asincronía** | No bloquear al que llama mientras la operación termina | — | `Task`, `ValueTask` |

```
Concurrencia (1 núcleo, I/O)        Paralelismo (4 núcleos, CPU)
────────────────────────────        ─────────────────────────────
Hilo: A──espera──A  B──espera──B    Núcleo 1: AAAAAAAA
         B     A                    Núcleo 2: BBBBBBBB
                                    Núcleo 3: CCCCCCCC
                                    Núcleo 4: DDDDDDDD
```

> ❓ **Entrevista**: *"¿`async/await` hace que mi código sea paralelo?"* → No necesariamente. `async` libera hilos mientras esperas I/O; no reparte cómputo entre núcleos. Para trabajo **CPU-bound** necesitas paralelismo explícito (`Parallel`, PLINQ, `Task.Run`).

**Regla mental**: *I/O-bound → async. CPU-bound → Parallel/PLINQ.* Mezclarlos mal (p. ej. `Parallel.ForEach` con lambdas `async void`) es uno de los bugs más comunes que verás en esta sesión.

---

## 2. El problema raíz: estado compartido mutable

Todo problema de concurrencia nace de tres ingredientes simultáneos: **(1) estado compartido**, **(2) mutable**, **(3) accedido por varios hilos**. Quita cualquiera y el problema desaparece. Por eso la inmutabilidad (Sesión 17) es la mejor "primitiva de sincronización": un objeto que no cambia no necesita locks.

### 2.1 Race condition en acción

```csharp
int contador = 0;

// 1 millón de incrementos repartidos en varios hilos
Parallel.For(0, 1_000_000, _ =>
{
    contador++;   // ⚠️ NO es atómico
});

Console.WriteLine(contador); // Esperas 1000000. Obtienes algo como 412873. Cada ejecución distinto.
```

¿Por qué? `contador++` son **tres** operaciones a nivel de CPU:

```
Hilo A                      Hilo B
──────                      ──────
lee contador (5)
                            lee contador (5)
suma 1 → 6
                            suma 1 → 6
escribe 6
                            escribe 6      ← se perdió un incremento
```

Eso es una **race condition**: el resultado depende del *orden* en que el scheduler intercala los hilos. Lo peor: en tu máquina con 2 núcleos puede "funcionar" y fallar en producción con 32.

### 2.2 Las tres propiedades que hay que garantizar

| Propiedad | Pregunta | Qué rompe si falta |
|---|---|---|
| **Atomicidad** | ¿La operación se ve "entera o nada"? | Incrementos perdidos, objetos a medio actualizar |
| **Visibilidad** | ¿Un hilo ve lo que escribió otro? | Un hilo sigue leyendo un valor viejo cacheado en registro/CPU |
| **Orden** | ¿Las escrituras se observan en el orden del código? | El compilador/JIT/CPU puede reordenar instrucciones |

`lock` garantiza las tres. `Interlocked` garantiza las tres para una sola variable. `volatile` solo garantiza visibilidad/orden, **no** atomicidad compuesta.

---

## 3. `Interlocked`: atomicidad sin locks

Para operaciones simples sobre una variable (`int`, `long`, referencias), `System.Threading.Interlocked` usa instrucciones atómicas de la CPU (`lock xadd`, `cmpxchg` en x86). Es la opción más barata.

```csharp
int contador = 0;
Parallel.For(0, 1_000_000, _ => Interlocked.Increment(ref contador));
Console.WriteLine(contador); // 1000000, siempre

long total = 0;
Interlocked.Add(ref total, 50);                 // suma atómica
int anterior = Interlocked.Exchange(ref contador, 0); // pone 0 y devuelve el valor viejo
```

### 3.1 Compare-And-Swap (CAS): el patrón lock-free

`Interlocked.CompareExchange(ref destino, nuevo, esperado)` escribe `nuevo` **solo si** `destino` sigue valiendo `esperado`. Con eso construyes cualquier actualización atómica en un bucle de reintento:

```csharp
// "Máximo atómico": actualizar solo si el nuevo valor es mayor
static void ActualizarMaximo(ref int maximo, int candidato)
{
    int actual;
    do
    {
        actual = Volatile.Read(ref maximo);
        if (candidato <= actual) return;            // nada que hacer
    }
    // si otro hilo cambió 'maximo' entre la lectura y aquí, CompareExchange falla y reintentamos
    while (Interlocked.CompareExchange(ref maximo, candidato, actual) != actual);
}
```

> ❓ **Entrevista**: *"¿Qué es CAS y qué es lock-free?"* → CAS es una instrucción atómica que escribe solo si el valor actual coincide con el esperado. Un algoritmo **lock-free** usa CAS en bucles de reintento en lugar de bloquear hilos: ningún hilo puede dejar a los demás esperando indefinidamente. `ConcurrentQueue<T>` está implementada así.

---

## 4. `lock` y `Monitor`: exclusión mutua

Cuando necesitas proteger **varias operaciones como una unidad** (una sección crítica), usas `lock`.

```csharp
public class CuentaBancaria
{
    private readonly object _sync = new();   // objeto PRIVADO dedicado solo a sincronizar
    private decimal _saldo;

    public bool Retirar(decimal monto)
    {
        lock (_sync)                          // solo un hilo a la vez entra aquí
        {
            if (_saldo < monto) return false; // chequeo...
            _saldo -= monto;                  // ...y modificación, juntos y atómicos
            return true;
        }
    }

    public void Depositar(decimal monto)
    {
        lock (_sync) { _saldo += monto; }
    }
}
```

`lock` es azúcar sintáctico sobre `Monitor`:

```csharp
bool tomado = false;
try
{
    Monitor.Enter(_sync, ref tomado);
    // sección crítica
}
finally
{
    if (tomado) Monitor.Exit(_sync);   // se libera AUNQUE haya excepción
}
```

⚠️ **Errores clásicos con `lock`**:
- `lock (this)` o `lock (typeof(MiClase))` → código externo puede bloquear el mismo objeto y provocar deadlocks. Usa siempre un campo `private readonly`.
- `lock ("texto")` → los literales string están **internados** (Sesión 31): ¡todo el proceso comparte ese objeto!
- `lock` sobre un **value type** → no compila (bien); `Monitor.Enter(miInt)` sí compila y hace *boxing* a un objeto nuevo cada vez: nunca bloquea nada.
- **No puedes usar `await` dentro de un `lock`** (error de compilación CS1996). Motivo: `Monitor` tiene *afinidad de hilo* y tras un `await` podrías continuar en otro hilo. Para código async → `SemaphoreSlim` (sección 5).

### 4.1 El nuevo tipo `System.Threading.Lock` (.NET 9 / C# 13)

Desde .NET 9 existe un tipo dedicado. El compilador de C# 13 lo reconoce y genera código más eficiente que `Monitor`:

```csharp
private readonly Lock _lock = new();   // .NET 9+

public void Operar()
{
    lock (_lock)          // C# 13 usa _lock.EnterScope() en vez de Monitor
    {
        // ...
    }
}
```

En .NET 8 (el objetivo del curso) sigue usando `object`. Lo retomamos en la Sesión 32.

### 4.2 `Monitor.Wait` / `Pulse` (señalización)

`Monitor` también permite que un hilo **espere una condición** soltando el lock (`Wait`) y que otro lo despierte (`Pulse`/`PulseAll`). Es la base de las colas bloqueantes clásicas, pero hoy casi nunca lo escribirás a mano: `Channel<T>` o `BlockingCollection<T>` lo hacen por ti.

---

## 5. El catálogo de primitivas de sincronización

| Primitiva | Uso | ¿Async-friendly? | ¿Entre procesos? | Coste |
|---|---|---|---|---|
| `Interlocked` | Operación atómica sobre 1 variable | N/A (no bloquea) | No | Mínimo |
| `lock` / `Monitor` / `Lock` | Sección crítica exclusiva | ❌ | No | Bajo (spin + espera) |
| `SpinLock` | Secciones críticas *minúsculas*, alta contención | ❌ | No | Quema CPU esperando |
| `SemaphoreSlim` | Limitar a N accesos concurrentes; "lock async" con N=1 | ✅ `WaitAsync` | No | Bajo |
| `ReaderWriterLockSlim` | Muchos lectores, pocos escritores | ❌ | No | Medio |
| `ManualResetEventSlim` / `CountdownEvent` / `Barrier` | Señalización / coordinación de fases | ❌ | No | Bajo |
| `Mutex` | Exclusión **entre procesos** (con nombre) | ❌ | ✅ | Alto (kernel) |
| `Semaphore` | Semáforo entre procesos | ❌ | ✅ | Alto (kernel) |

### 5.1 `SemaphoreSlim`: el "lock" del mundo async

```csharp
public class TokenService
{
    private readonly SemaphoreSlim _mutex = new(initialCount: 1, maxCount: 1); // 1 = exclusión mutua
    private string? _token;
    private DateTime _expira;

    public async Task<string> ObtenerTokenAsync(CancellationToken ct)
    {
        await _mutex.WaitAsync(ct);        // espera SIN bloquear el hilo
        try
        {
            if (_token is null || DateTime.UtcNow >= _expira)
            {
                _token = await PedirTokenAlServidorAsync(ct); // await permitido aquí dentro
                _expira = DateTime.UtcNow.AddMinutes(55);
            }
            return _token;
        }
        finally
        {
            _mutex.Release();              // SIEMPRE en finally
        }
    }

    private static async Task<string> PedirTokenAlServidorAsync(CancellationToken ct)
    {
        await Task.Delay(200, ct);
        return Guid.NewGuid().ToString();
    }
}
```

Con `initialCount > 1` sirve para **throttling**: "como máximo 5 llamadas simultáneas a esta API externa".

⚠️ `SemaphoreSlim` **no es reentrante**: si el mismo flujo llama `WaitAsync` dos veces sin `Release`, se bloquea a sí mismo. `Monitor` sí es reentrante.

### 5.2 `ReaderWriterLockSlim`

```csharp
public class CacheConfiguracion
{
    private readonly ReaderWriterLockSlim _rw = new();
    private readonly Dictionary<string, string> _datos = new();

    public string? Leer(string clave)
    {
        _rw.EnterReadLock();                // varios lectores a la vez
        try { return _datos.GetValueOrDefault(clave); }
        finally { _rw.ExitReadLock(); }
    }

    public void Escribir(string clave, string valor)
    {
        _rw.EnterWriteLock();               // exclusivo: espera a que salgan todos los lectores
        try { _datos[clave] = valor; }
        finally { _rw.ExitWriteLock(); }
    }
}
```

> ❓ **Entrevista**: *"¿Cuándo `ReaderWriterLockSlim` en vez de `lock`?"* → Cuando las lecturas son **mucho** más frecuentes que las escrituras y la sección crítica es no trivial. Para secciones cortas, `lock` suele ganar porque RWLS tiene más overhead. Y para lecturas casi exclusivas de datos que cambian rara vez, a menudo es mejor **reemplazar una referencia inmutable** (copy-on-write) o usar `FrozenDictionary` (Sesión 30).

### 5.3 `volatile` y `Volatile.Read/Write`

`volatile` impide que el JIT/CPU cachee o reordene accesos a un campo. Sirve para **flags** simples:

```csharp
private volatile bool _detener;

public void Trabajar()
{
    while (!_detener) { /* ... */ }   // sin volatile, el JIT podría leer _detener una sola vez y hacer un bucle infinito
}
public void Parar() => _detener = true;
```

⚠️ `volatile` **no** hace atómico `x++`. Y en código moderno es mejor usar un `CancellationToken` para esto.

---

## 6. Deadlocks, livelocks y starvation

**Deadlock**: dos (o más) hilos esperan cada uno un recurso que tiene el otro. Nadie avanza jamás.

```
Hilo 1: lock(A) ──► quiere lock(B) ──► espera...
Hilo 2: lock(B) ──► quiere lock(A) ──► espera...     ← abrazo mortal
```

```csharp
// ⚠️ Transferencia con deadlock potencial
void Transferir(Cuenta origen, Cuenta destino, decimal monto)
{
    lock (origen.Sync)
    lock (destino.Sync)   // T1: A→B y T2: B→A al mismo tiempo = deadlock
    { /* ... */ }
}

// ✅ Solución: orden global de adquisición
void TransferirSeguro(Cuenta origen, Cuenta destino, decimal monto)
{
    var (primero, segundo) = origen.Id < destino.Id ? (origen, destino) : (destino, origen);
    lock (primero.Sync)
    lock (segundo.Sync)
    { /* ... */ }
}
```

Las 4 condiciones de Coffman (se necesitan **todas** para un deadlock): exclusión mutua, retener y esperar, no expropiación, espera circular. Romper una basta; el **orden global de locks** rompe la espera circular.

Otras estrategias: `Monitor.TryEnter(obj, timeout)`, mantener secciones críticas cortas, **nunca llamar a código desconocido (callbacks, eventos) mientras tienes un lock**.

El deadlock más famoso de .NET, sin embargo, no usa locks explícitos: **sync-over-async** (`.Result` / `.Wait()` sobre un `Task` en un contexto con `SynchronizationContext`), que vimos en la Sesión 13.

| Problema | Síntoma |
|---|---|
| **Deadlock** | Hilos bloqueados para siempre, CPU a 0% |
| **Livelock** | Hilos activos reintentando sin progresar, CPU al 100% |
| **Starvation** | Un hilo nunca consigue el recurso porque otros siempre ganan |
| **Thread pool starvation** | Bloquear hilos del pool (`.Result`, `Thread.Sleep`) → el pool crece lento (~1-2 hilos/seg) y la latencia se dispara |

> ❓ **Entrevista**: *"Tu API responde lentísimo bajo carga pero la CPU está baja. ¿Qué sospechas?"* → **Thread pool starvation** por código que bloquea (sync-over-async, `Thread.Sleep`, locks largos). Se diagnostica con `dotnet-counters` (`threadpool-queue-length`, `threadpool-thread-count`).

---

## 7. Colecciones concurrentes

`List<T>` y `Dictionary<TKey,TValue>` **no son thread-safe** para escritura concurrente (Sesión 7): pueden corromperse internamente, no solo "perder datos". `System.Collections.Concurrent` ofrece alternativas:

| Colección | Semántica | Implementación |
|---|---|---|
| `ConcurrentDictionary<K,V>` | Diccionario | Locks por *buckets* (striping); lecturas sin lock |
| `ConcurrentQueue<T>` | FIFO | Lock-free (CAS) |
| `ConcurrentStack<T>` | LIFO | Lock-free |
| `ConcurrentBag<T>` | Sin orden, optimizada para que el mismo hilo produzca y consuma | Listas por hilo |
| `BlockingCollection<T>` | Envoltorio con bloqueo y límite de capacidad | Sobre las anteriores (API síncrona) |

### 7.1 `ConcurrentDictionary`: úsalo con sus métodos atómicos

```csharp
var visitas = new ConcurrentDictionary<string, int>();

// ❌ Check-then-act: dos operaciones atómicas NO forman una operación atómica
if (!visitas.ContainsKey("home")) visitas["home"] = 0;
visitas["home"] = visitas["home"] + 1;       // race condition igual que en 2.1

// ✅ Operación atómica de lectura-modificación-escritura
visitas.AddOrUpdate("home", addValue: 1, updateValueFactory: (_, actual) => actual + 1);

// ✅ Obtener o crear
int v = visitas.GetOrAdd("about", _ => 0);
```

⚠️ **La trampa de `GetOrAdd` con factory**: la *factory* se ejecuta **fuera del lock**. Si dos hilos piden la misma clave a la vez, **la factory puede ejecutarse dos veces** (solo un resultado se guarda). Si la factory es cara o tiene efectos secundarios (abre una conexión, llama a una API), envuelve el valor en `Lazy<T>`:

```csharp
var conexiones = new ConcurrentDictionary<string, Lazy<Conexion>>();

Conexion ObtenerConexion(string servidor) =>
    conexiones.GetOrAdd(servidor,
        s => new Lazy<Conexion>(() => new Conexion(s), LazyThreadSafetyMode.ExecutionAndPublication))
    .Value;  // Lazy garantiza que el constructor corra UNA sola vez

record Conexion(string Servidor);
```

> ❓ **Entrevista**: *"¿`ConcurrentDictionary.GetOrAdd` garantiza que la factory se ejecute una sola vez?"* → **No.** Garantiza que se almacene un solo valor, pero la factory puede correr varias veces en paralelo. Solución: `Lazy<T>` como valor.

---

## 8. `System.Threading.Channels`: productor/consumidor moderno

`Channel<T>` es una cola **async-first** y de alto rendimiento para pasar datos entre productores y consumidores. Es lo que usa internamente ASP.NET Core (Kestrel, SignalR). Reemplaza a `BlockingCollection<T>` en código async.

```
 Productores                      Canal                      Consumidores
 ───────────          ┌───────────────────────────┐          ────────────
 HTTP request ─┐      │                           │      ┌─► Worker 1
 HTTP request ─┼─────►│  [msg][msg][msg][ ][ ]    │─────►┼─► Worker 2
 Timer ────────┘      │     capacidad = 100       │      └─► Worker 3
      Writer.WriteAsync  └─────────────────────────┘  Reader.ReadAllAsync
```

### 8.1 Unbounded vs Bounded

| Tipo | Crear | Cuándo | Riesgo |
|---|---|---|---|
| **Unbounded** | `Channel.CreateUnbounded<T>()` | Productor nunca debe esperar y el volumen está acotado | Si el consumidor es más lento → la memoria crece sin límite |
| **Bounded** | `Channel.CreateBounded<T>(capacidad)` | **Por defecto en producción** | Hay que decidir qué hacer cuando está lleno |

Cuando un canal *bounded* se llena, `BoundedChannelFullMode` decide:
- `Wait` (defecto): `WriteAsync` espera → **backpressure** (el productor se frena al ritmo del consumidor).
- `DropOldest` / `DropNewest`: descarta mensajes (telemetría, métricas donde perder algo es aceptable).
- `DropWrite`: descarta el que intentas escribir.

### 8.2 Ejemplo completo (consola)

```csharp
using System.Threading.Channels;

var canal = Channel.CreateBounded<Pedido>(new BoundedChannelOptions(capacity: 10)
{
    FullMode = BoundedChannelFullMode.Wait, // backpressure
    SingleWriter = true,                    // pistas de optimización
    SingleReader = false
});

using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

// Productor
Task productor = Task.Run(async () =>
{
    for (int i = 1; i <= 50; i++)
    {
        await canal.Writer.WriteAsync(new Pedido(i, $"Cliente-{i}"), cts.Token);
        Console.WriteLine($"→ Producido pedido {i}");
    }
    canal.Writer.Complete();   // ¡CLAVE! Avisa que no habrá más; sin esto los consumidores esperan para siempre
});

// 3 consumidores en paralelo
Task[] consumidores = Enumerable.Range(1, 3).Select(id => Task.Run(async () =>
{
    // ReadAllAsync termina cuando el writer llama Complete() y el canal queda vacío
    await foreach (Pedido p in canal.Reader.ReadAllAsync(cts.Token))
    {
        await Task.Delay(100, cts.Token);   // simula trabajo
        Console.WriteLine($"   ✓ Worker {id} procesó pedido {p.Id}");
    }
})).ToArray();

await productor;
await Task.WhenAll(consumidores);
Console.WriteLine("Fin del pipeline");

record Pedido(int Id, string Cliente);
```

### 8.3 Patrón real: cola en background en ASP.NET Core

Un endpoint encola trabajo y responde `202 Accepted` inmediatamente; un `BackgroundService` lo procesa (enlaza con Sesiones 23 y 24):

```csharp
// Registro (Program.cs)
builder.Services.AddSingleton(Channel.CreateBounded<EmailJob>(500));
builder.Services.AddHostedService<EmailWorker>();

app.MapPost("/emails", async (EmailJob job, Channel<EmailJob> cola, CancellationToken ct) =>
{
    await cola.Writer.WriteAsync(job, ct);
    return Results.Accepted();
});

public record EmailJob(string Para, string Asunto);

public class EmailWorker(Channel<EmailJob> cola, ILogger<EmailWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in cola.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                log.LogInformation("Enviando email a {Para}", job.Para);
                await Task.Delay(300, stoppingToken); // envío real aquí
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogError(ex, "Falló el email a {Para}", job.Para); // un fallo no mata al worker
            }
        }
    }
}
```

⚠️ Un canal en memoria **pierde los mensajes si el proceso se reinicia**. Para trabajo que *no puede perderse* usa una cola durable (SQS, RabbitMQ, Azure Service Bus) o el patrón Outbox.

> ❓ **Entrevista**: *"¿`Channel<T>` vs `BlockingCollection<T>` vs `ConcurrentQueue<T>`?"* → `ConcurrentQueue` es solo una cola thread-safe sin espera (tienes que hacer polling). `BlockingCollection` añade espera y capacidad pero **bloquea hilos** (API síncrona). `Channel` hace lo mismo con **esperas async** (no consume hilos), backpressure configurable y mejor rendimiento. En código moderno: Channel.

---

## 9. Paralelismo de datos: `Parallel` y `Parallel.ForEachAsync`

### 9.1 `Parallel.For` / `Parallel.ForEach` (CPU-bound)

Parte una colección en trozos y los reparte entre hilos del thread pool. Bloquea al llamador hasta terminar.

```csharp
var imagenes = Directory.GetFiles("fotos", "*.jpg");

var opciones = new ParallelOptions
{
    MaxDegreeOfParallelism = Environment.ProcessorCount, // por defecto: sin límite explícito (lo gestiona el pool)
    CancellationToken = CancellationToken.None
};

Parallel.ForEach(imagenes, opciones, ruta =>
{
    // trabajo CPU-bound: redimensionar, calcular hash, comprimir...
    byte[] datos = File.ReadAllBytes(ruta);
    byte[] hash = System.Security.Cryptography.SHA256.HashData(datos);
    Console.WriteLine($"{Path.GetFileName(ruta)}: {Convert.ToHexString(hash)[..8]}");
});
```

**Agregaciones con estado local** (evitar contención en un acumulador compartido):

```csharp
long sumaTotal = 0;
Parallel.For(0, 10_000_000,
    localInit: () => 0L,                                   // cada hilo tiene su subtotal
    body: (i, _, subtotal) => subtotal + (i % 7),          // sin locks dentro del bucle
    localFinally: subtotal => Interlocked.Add(ref sumaTotal, subtotal)); // 1 operación atómica por hilo
Console.WriteLine(sumaTotal);
```

`ParallelLoopState` permite `Break()` (termina tras procesar los índices menores) y `Stop()` (termina lo antes posible). Las excepciones de las iteraciones se recogen en un **`AggregateException`**.

### 9.2 ⚠️ El anti-patrón: `Parallel.ForEach` + `async`

```csharp
// ❌ La lambda se convierte en async void: Parallel.ForEach NO la espera
Parallel.ForEach(urls, async url => await http.GetStringAsync(url));
// Termina "al instante", las excepciones se pierden o tumban el proceso
```

### 9.3 ✅ `Parallel.ForEachAsync` (.NET 6+) para I/O con límite de concurrencia

```csharp
using var http = new HttpClient();
string[] urls = ["https://example.com", "https://dotnet.microsoft.com", "https://learn.microsoft.com"];

await Parallel.ForEachAsync(urls,
    new ParallelOptions { MaxDegreeOfParallelism = 4 },  // máx 4 peticiones simultáneas (defecto: ProcessorCount)
    async (url, ct) =>
    {
        string html = await http.GetStringAsync(url, ct);
        Console.WriteLine($"{url}: {html.Length} caracteres");
    });
```

| Necesidad | Herramienta |
|---|---|
| N tareas de I/O, todas a la vez, pocas | `Task.WhenAll(urls.Select(...))` |
| N tareas de I/O, muchas, con límite de concurrencia | `Parallel.ForEachAsync` o `SemaphoreSlim` + `WhenAll` |
| Cómputo CPU sobre una colección | `Parallel.ForEach` o PLINQ |
| Flujo continuo productor/consumidor | `Channel<T>` |
| Pipeline de varias etapas con paralelismo por etapa | TPL Dataflow (`System.Threading.Tasks.Dataflow`) |

---

## 10. PLINQ: LINQ en paralelo

PLINQ (Parallel LINQ) paraleliza una consulta LINQ (Sesión 9) con un solo método: `.AsParallel()`.

```csharp
int[] numeros = Enumerable.Range(1, 5_000_000).ToArray();

// Secuencial
int primosSeq = numeros.Count(EsPrimo);

// Paralelo
int primosPar = numeros
    .AsParallel()                                  // a partir de aquí, PLINQ
    .WithDegreeOfParallelism(Environment.ProcessorCount)
    .Count(EsPrimo);

Console.WriteLine($"{primosSeq} == {primosPar}");

static bool EsPrimo(int n)
{
    if (n < 2) return false;
    for (int i = 2; (long)i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}
```

### 10.1 Operadores y comportamientos clave

| Operador | Efecto |
|---|---|
| `AsParallel()` | Activa PLINQ |
| `AsOrdered()` | Preserva el orden de la fuente (tiene coste) |
| `AsUnordered()` | Libera la restricción de orden en adelante |
| `AsSequential()` | Vuelve a LINQ secuencial |
| `WithDegreeOfParallelism(n)` | Máximo de hilos (1–512) |
| `WithCancellation(ct)` | Cancelación |
| `WithExecutionMode(ForceParallelism)` | PLINQ a veces decide ir secuencial si cree que no vale la pena; esto lo fuerza |
| `ForAll(accion)` | Ejecuta en paralelo **sin** volver a unir los resultados (más rápido que `foreach` sobre el resultado) |

```csharp
// ⚠️ Por defecto, el orden NO se preserva
var r1 = Enumerable.Range(1, 10).AsParallel().Select(x => x * 10).ToList();              // ej: 30,10,20,50...
var r2 = Enumerable.Range(1, 10).AsParallel().AsOrdered().Select(x => x * 10).ToList();  // 10,20,30...
```

### 10.2 Cuándo PLINQ **empeora** las cosas

- Trabajo por elemento **muy pequeño** (sumar números): el coste de particionar, sincronizar y unir resultados supera la ganancia.
- Trabajo **I/O-bound** (llamadas HTTP/BD): PLINQ bloquea hilos del pool esperando. Usa async.
- Efectos secundarios sobre estado compartido (`lista.Add` dentro de `Select`) → race conditions.
- `IQueryable` de EF Core: PLINQ es para objetos en memoria; `AsParallel()` sobre una query de EF traería todo a memoria primero.

> ❓ **Entrevista**: *"¿Por qué mi consulta PLINQ es más lenta que la secuencial?"* → Overhead de particionado/merge mayor que el trabajo por elemento, contención en estado compartido, o `AsOrdered` innecesario. **Mide siempre** con BenchmarkDotNet (Sesión 30).

---

## 11. Estado por hilo y por flujo async

| Tipo | Aislamiento | Uso típico |
|---|---|---|
| `[ThreadStatic] static` | Por hilo del SO | Legacy; no inicializa en otros hilos |
| `ThreadLocal<T>` | Por hilo del SO, con inicializador | Buffers reutilizables en `Parallel` |
| `AsyncLocal<T>` | Por **flujo lógico async** (fluye a través de `await`) | Correlation IDs, contexto de usuario, `Activity.Current` |

```csharp
await Task.WhenAll(Contexto.ManejarRequestAsync("req-A"), Contexto.ManejarRequestAsync("req-B"));
// Imprime req-A y req-B: cada flujo async conserva su propio valor

static class Contexto
{
    private static readonly AsyncLocal<string?> CorrelationId = new();

    public static async Task ManejarRequestAsync(string id)
    {
        CorrelationId.Value = id;
        await Task.Delay(10);                        // puede reanudar en OTRO hilo...
        Console.WriteLine(CorrelationId.Value);      // ...pero el valor fluye: sigue siendo 'id'
    }
}
```

⚠️ `ThreadLocal` + `async` es un bug: tras un `await` puedes estar en otro hilo con otro valor. En código async usa `AsyncLocal`.

`Random` tampoco es thread-safe: compartir una instancia entre hilos puede hacer que empiece a devolver solo ceros. Usa **`Random.Shared`** (.NET 6+), que es seguro.

---

## 12. Buenas prácticas resumidas

1. **Evita compartir** estado mutable: inmutabilidad (records), mensajes por canal, particionar datos.
2. Si compartes, usa la primitiva **más simple que funcione**: `Interlocked` → `lock` → `SemaphoreSlim` → otras.
3. **Secciones críticas cortas**: nada de I/O ni callbacks dentro de un `lock`.
4. En async: `SemaphoreSlim`, `Channel`, `Parallel.ForEachAsync`. **Nunca** `.Result`/`.Wait()`.
5. Colecciones concurrentes: usa sus métodos compuestos (`AddOrUpdate`, `GetOrAdd`, `TryRemove`), no *check-then-act*.
6. Siempre propaga `CancellationToken`.
7. Bounded channels por defecto: el backpressure evita que la memoria explote.
8. **Mide** antes de paralelizar.

---

## 13. Resumen mental de la sesión

```
Race condition = estado compartido + mutable + varios hilos
   Garantías: atomicidad · visibilidad · orden

Primitivas (de barata a cara):
   Interlocked (1 variable, CAS)
   lock/Monitor/Lock (sección crítica, sin await dentro)
   SemaphoreSlim (async, throttling, NO reentrante)
   ReaderWriterLockSlim (muchos lectores)
   Mutex/Semaphore (entre procesos, kernel)

Deadlock = espera circular → orden global de locks, timeouts, secciones cortas
Thread pool starvation = bloquear hilos del pool (.Result, Sleep)

Concurrent*: métodos atómicos compuestos; GetOrAdd factory puede correr 2 veces → Lazy<T>
Channel<T>: productor/consumidor async, Bounded + Wait = backpressure, Writer.Complete()

CPU-bound → Parallel.For/ForEach, PLINQ (AsParallel, AsOrdered, ForAll)
I/O-bound → async, Task.WhenAll, Parallel.ForEachAsync (con MaxDegreeOfParallelism)
Estado por flujo async → AsyncLocal ; Random.Shared
```

---

## 14. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Diferencia entre concurrencia y paralelismo? ¿`async/await` es paralelismo?
2. ❓ ¿Por qué `contador++` no es thread-safe? ¿Cómo lo arreglas de la forma más barata?
3. ❓ ¿Qué es CAS (`CompareExchange`) y qué significa "lock-free"?
4. ❓ ¿Por qué no se puede usar `await` dentro de un `lock`? ¿Qué usas en su lugar?
5. ❓ ¿Por qué `lock(this)` y `lock("texto")` son malas ideas?
6. ❓ ¿Qué es un deadlock, qué condiciones lo producen y cómo lo previenes?
7. ❓ ¿Qué es *thread pool starvation* y cómo lo diagnosticas?
8. ❓ ¿`ConcurrentDictionary.GetOrAdd` ejecuta la factory una sola vez? ¿Cómo lo garantizas?
9. ❓ ¿`Channel<T>` bounded vs unbounded? ¿Qué es backpressure?
10. ❓ ¿Qué pasa si usas `Parallel.ForEach` con una lambda `async`? ¿Alternativa?
11. ❓ ¿Cuándo PLINQ es más lento que LINQ secuencial?
12. ❓ ¿`ThreadLocal<T>` vs `AsyncLocal<T>`?

## 15. Ejercicio práctico
1. Crea `dotnet new console -o ConcurrenciaLab`.
2. **Race condition**: reproduce el contador de la sección 2.1 y ejecútalo 5 veces anotando los resultados. Arréglalo con `Interlocked`, luego con `lock`, y mide con `Stopwatch` la diferencia de tiempo.
3. **Deadlock**: implementa `Transferir` con locks en orden inconsistente, lánzalo con dos `Task.Run` cruzados en bucle hasta que se cuelgue. Luego aplica el orden global por `Id`.
4. **Pipeline con Channels**: construye un pipeline de 3 etapas conectadas por dos canales bounded:
   - Etapa 1: lee líneas de un archivo de texto grande (1 productor).
   - Etapa 2: 4 workers que cuentan palabras de cada línea.
   - Etapa 3: 1 agregador que suma en un `Dictionary<string,int>` (sin locks, porque es un único consumidor).
   - Recuerda llamar `Complete()` en cada writer al terminar la etapa anterior.
5. **PLINQ vs LINQ**: cuenta primos hasta 10 millones de forma secuencial, con `AsParallel()` y con `AsParallel().AsOrdered()`. Anota tiempos. Luego haz lo mismo con una operación trivial (`x * 2`) y observa cómo PLINQ pierde.
6. **Throttling**: descarga 20 URLs con `Parallel.ForEachAsync` y `MaxDegreeOfParallelism = 3`; imprime la hora de inicio/fin de cada una para comprobar que nunca hay más de 3 simultáneas.

---

➡️ **Cuando termines**, marca la Sesión 29 en el [README](Readme.md) y pídeme la **Sesión 30 — Performance (BenchmarkDotNet, caching, Redis, pooling)**.
