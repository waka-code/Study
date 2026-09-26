# Sesión 13 — Async / await y concurrencia: esperar sin bloquear

> **Objetivo de la sesión**: entender *por qué* existe la programación asíncrona, *qué* es realmente una `Task`, y *cómo* el compilador transforma un método `async` en una máquina de estados. Al terminar deberías poder explicar la diferencia entre I/O-bound y CPU-bound, por qué `.Result` puede causar deadlocks, qué hace `ConfigureAwait(false)`, por qué `async void` es peligroso, y cómo usar cancelación, `Task.WhenAll`, `ValueTask` e `IAsyncEnumerable` con criterio senior.

---

## 1. El problema: los hilos son caros y esperar es desperdicio

Imagina una API que por cada request consulta una base de datos (50 ms). Con código **síncrono**:

```
Hilo 1: [recibe req]──[espera BD........50ms........]──[responde]
Hilo 2: [recibe req]──[espera BD........50ms........]──[responde]
...
Hilo N: bloqueado esperando. El thread pool se agota → nuevas requests hacen cola.
```

Un hilo del sistema operativo cuesta ~1 MB de stack reservado, tiempo de creación y cambios de contexto. Si 1.000 requests esperan la BD, **1.000 hilos están bloqueados sin hacer nada**.

Con código **asíncrono**:

```
Hilo 1: [req A: inicia consulta]─libre─[req B: inicia consulta]─libre─[req A: responde]...
                     │                                                    ▲
                     └──────── la BD/red trabaja, NINGÚN hilo espera ──────┘
```

> **Idea central**: `async/await` no hace tu código "más rápido". Hace que **no bloquees hilos mientras esperas**, lo que da **escalabilidad** (servidor: más requests con los mismos hilos) y **responsividad** (UI: la ventana no se congela).

> ❓ **Entrevista**: *"¿Async hace que el código corra más rápido?"* → No. Una operación individual tarda lo mismo (o un poco más por el overhead). Lo que mejora es el **throughput**: los hilos quedan libres durante la espera de I/O y pueden atender otras cosas.

---

## 2. I/O-bound vs CPU-bound

| | I/O-bound | CPU-bound |
|---|---|---|
| **Qué espera** | Red, disco, BD, HTTP | Cálculo (procesador) |
| **Ejemplo** | `HttpClient.GetAsync`, `File.ReadAllTextAsync`, EF Core `ToListAsync` | Comprimir, hashear, procesar imágenes |
| **Hilo durante la espera** | **Ninguno** (el SO notifica al terminar) | Uno ocupado calculando |
| **Herramienta** | `await` sobre la API async | `Task.Run` (para sacarlo del hilo actual) o `Parallel` (Sesión 29) |

> ⚠️ **"There is no thread"**: durante una operación de I/O verdadera no hay ningún hilo esperando. El driver del SO completa la operación y el runtime (vía IOCP en Windows, epoll/kqueue en Linux/macOS) avisa para continuar. Este es el concepto que distingue a quien entiende async de quien lo usa de memoria.

```csharp
// ❌ Envolver I/O en Task.Run: ocupas un hilo del pool para esperar
var html = await Task.Run(() => new HttpClient().GetStringAsync(url).Result);

// ✅ I/O: await directo sobre la API async
var html2 = await httpClient.GetStringAsync(url);

// ✅ CPU en una app de UI: Task.Run para no congelar el hilo de UI
var hash = await Task.Run(() => CalcularHashPesado(datos));
```

> ⚠️ En **ASP.NET Core** no uses `Task.Run` para "hacer async" trabajo CPU dentro de una request: solo mueves el trabajo de un hilo del pool a otro hilo del pool, con overhead extra y ningún beneficio.

---

## 3. `Task` y `Task<T>`: promesas de un resultado futuro

Una `Task` representa una **operación que puede no haber terminado aún**. Es análoga a una `Promise` de JavaScript.

```csharp
Task tarea = Task.Delay(1000);              // operación sin resultado
Task<int> tareaConValor = ContarAsync();     // operación que producirá un int

// Estados posibles
// Created → WaitingForActivation/Running → RanToCompletion | Faulted | Canceled
Console.WriteLine(tarea.Status);
Console.WriteLine(tarea.IsCompletedSuccessfully);
```

| Propiedad | Significado |
|---|---|
| `IsCompleted` | Terminó (de cualquier forma: éxito, fallo o cancelación) |
| `IsCompletedSuccessfully` | Terminó con éxito |
| `IsFaulted` | Terminó con excepción (`Exception` es una `AggregateException`) |
| `IsCanceled` | Se canceló |

> Una `Task` **no es un hilo**. Es un objeto que representa trabajo futuro. Puede estar respaldada por un hilo (`Task.Run`), por I/O del SO (sin hilo), o por un timer (`Task.Delay`).

---

## 4. `async` y `await`

```csharp
public async Task<int> ObtenerLongitudAsync(string url)
{
    using var http = new HttpClient();         // (en producción: IHttpClientFactory, Sesión 22)
    Console.WriteLine("Antes del await");

    string contenido = await http.GetStringAsync(url);   // ← punto de suspensión

    Console.WriteLine("Después del await");    // continuación
    return contenido.Length;                    // devuelves int; el compilador lo envuelve en Task<int>
}
```

- **`async`** habilita `await` dentro del método y hace que el compilador lo transforme. No hace nada asíncrono por sí solo.
- **`await`** hace esto:
  1. Si la tarea **ya terminó** → sigue de forma síncrona (camino rápido, sin suspender).
  2. Si no → **registra el resto del método como continuación** y **devuelve el control** al llamador. El hilo queda libre.
  3. Cuando la tarea termina → la continuación se ejecuta (en el contexto capturado, sección 6).
  4. Si la tarea falló → `await` **relanza la excepción** (la primera, desenvuelta).

Tipos de retorno válidos:

| Retorno | Uso |
|---|---|
| `Task` | Async sin valor |
| `Task<T>` | Async con valor |
| `ValueTask` / `ValueTask<T>` | Optimización para caminos síncronos frecuentes (sección 11) |
| `IAsyncEnumerable<T>` | Streams async (sección 12) |
| `void` | **Solo** event handlers (sección 7) |

**Convención**: el nombre termina en `Async`.

---

## 5. Por dentro: la máquina de estados

El compilador (Roslyn) reescribe tu método `async` como una **struct que implementa `IAsyncStateMachine`**. Conceptualmente:

```csharp
// Tu código:
async Task<int> SumarAsync()
{
    int a = await ObtenerAAsync();
    int b = await ObtenerBAsync();
    return a + b;
}

// Lo que genera (simplificado):
struct SumarAsyncStateMachine : IAsyncStateMachine
{
    public int state;                       // en qué await va (-1 = inicio)
    public AsyncTaskMethodBuilder<int> builder;
    private int a;                          // las variables locales se vuelven CAMPOS
    private TaskAwaiter<int> awaiter;

    public void MoveNext()
    {
        switch (state)
        {
            case -1:
                awaiter = ObtenerAAsync().GetAwaiter();
                if (!awaiter.IsCompleted)
                {
                    state = 0;
                    builder.AwaitUnsafeOnCompleted(ref awaiter, ref this); // "llámame al terminar"
                    return;                                                 // ← libera el hilo
                }
                goto case 0;
            case 0:
                a = awaiter.GetResult();    // aquí se relanza la excepción si falló
                // ... igual para ObtenerBAsync con state = 1 ...
                builder.SetResult(a /* + b */);
                break;
        }
    }
    public void SetStateMachine(IAsyncStateMachine sm) { }
}
```

Consecuencias prácticas:
- Las **variables locales sobreviven** entre awaits porque pasan a ser campos.
- La struct se **boxea al heap** la primera vez que un await realmente suspende (asignación, Sesión 14).
- Cada `await` es un "corte" del método; el código entre awaits corre de corrido.
- `await` funciona sobre cualquier cosa con un método `GetAwaiter()` (patrón "awaitable", duck typing), no solo `Task`.

> ❓ **Entrevista**: *"¿Qué hace el compilador con un método async?"* → Lo convierte en una máquina de estados (`IAsyncStateMachine`): las variables locales se vuelven campos, cada `await` es un estado, y `MoveNext()` se invoca de nuevo como continuación cuando la tarea esperada termina.

---

## 6. `SynchronizationContext` y `ConfigureAwait(false)`

Cuando haces `await`, por defecto se **captura el contexto actual** para ejecutar la continuación en él:

| Entorno | `SynchronizationContext` | Continuación corre en... |
|---|---|---|
| WinForms / WPF / MAUI | De UI (un solo hilo) | El hilo de UI (puedes tocar controles) |
| ASP.NET clásico (.NET Framework) | `AspNetSynchronizationContext` | El contexto de la request |
| **ASP.NET Core** | **Ninguno** (`null`) | Cualquier hilo del thread pool |
| Consola | Ninguno | Cualquier hilo del thread pool |

`ConfigureAwait(false)` dice: *"no necesito volver al contexto original; continúa donde sea"*.

```csharp
// En una LIBRERÍA de propósito general (NuGet), que no sabe quién la llamará:
public async Task<string> LeerConfigAsync(string ruta)
{
    string texto = await File.ReadAllTextAsync(ruta).ConfigureAwait(false);
    return texto.Trim();   // no toca UI → no necesita el contexto
}
```

Reglas prácticas 2026:
- **Código de librería**: usa `ConfigureAwait(false)` (evita deadlocks si un consumidor de UI bloquea, y es un poco más eficiente).
- **Código de aplicación ASP.NET Core**: no tiene efecto práctico (no hay contexto); es opcional.
- **Código de UI** que después toca controles: **no** lo uses.

### 6.1 El deadlock clásico

```csharp
// En WinForms/WPF o ASP.NET clásico:
private void Boton_Click(object sender, EventArgs e)
{
    string s = DescargarAsync().Result;   // ❌ bloquea el hilo de UI esperando la Task
}

private async Task<string> DescargarAsync()
{
    await Task.Delay(1000);   // captura el contexto de UI
    return "listo";           // la continuación necesita el hilo de UI... ¡que está bloqueado!
}
```

```
Hilo UI:  .Result → BLOQUEADO esperando que la Task termine
                                         ▲
Task:     la continuación quiere correr en el hilo UI ─┘  → nunca puede → DEADLOCK
```

Soluciones (en orden de preferencia):
1. **Async hasta arriba** ("async all the way"): `private async void Boton_Click(...) { string s = await DescargarAsync(); }`.
2. `ConfigureAwait(false)` en `DescargarAsync` (la continuación no necesita el hilo UI).

> ⚠️ **Sync-over-async** (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()`) es un antipatrón. Incluso en ASP.NET Core, donde no hay deadlock por contexto, **bloquea un hilo del pool** y bajo carga provoca *thread pool starvation*: el pool se queda sin hilos y la app se arrastra.

> ❓ **Entrevista**: *"¿Por qué `.Result` puede causar deadlock?"* → Porque bloquea el hilo que la continuación necesita. Si hay un `SynchronizationContext` de un solo hilo (UI), la continuación del `await` interno espera ese hilo, y ese hilo espera la tarea: ciclo. Solución: async hasta arriba o `ConfigureAwait(false)`.

---

## 7. `async void`: solo para event handlers

```csharp
// ❌ async void en un método normal
public async void GuardarAsync()
{
    await Task.Delay(100);
    throw new InvalidOperationException("¡boom!");
}
```

Problemas:
1. **No puedes hacer `await`** → el llamador no sabe cuándo termina.
2. **Las excepciones no se pueden capturar** desde el llamador: se relanzan en el `SynchronizationContext` (o en el thread pool si no hay), y normalmente **tumban el proceso**.
3. Imposible de testear correctamente (Sesión 27).

```csharp
try
{
    GuardarAsync();   // ← el catch NUNCA verá la excepción
}
catch (Exception) { }
```

Su **única** razón de existir: los event handlers (`EventHandler` devuelve `void`, Sesión 11).

```csharp
boton.Click += async (s, e) =>
{
    try
    {
        await GuardarDatosAsync();   // ✅ delega en un método async Task
    }
    catch (Exception ex)             // ✅ captura aquí adentro, siempre
    {
        MostrarError(ex);
    }
};
```

> ⚠️ Cuidado con lambdas: `list.ForEach(async x => await ProcesarAsync(x));` — `ForEach` recibe un `Action<T>`, así que la lambda es **`async void`**. No espera a nadie y las excepciones se pierden. Usa `foreach` + `await`, o `Task.WhenAll`.

---

## 8. Componer tareas: secuencial vs concurrente

```csharp
// ❌ Secuencial sin necesidad: 3 s en total
var u = await ObtenerUsuarioAsync();     // 1 s
var p = await ObtenerPedidosAsync();     // 1 s
var r = await ObtenerReseñasAsync();     // 1 s

// ✅ Concurrente: ~1 s (las tres operaciones de I/O en vuelo a la vez)
Task<Usuario> tu = ObtenerUsuarioAsync();       // arrancan AL INVOCAR
Task<Pedido[]> tp = ObtenerPedidosAsync();
Task<Reseña[]> tr = ObtenerReseñasAsync();
await Task.WhenAll(tu, tp, tr);
Usuario usuario = tu.Result;   // ✅ aquí .Result es seguro: la tarea YA terminó
// o simplemente: var usuario = await tu;
```

> Las tareas "calientes" (*hot*) empiezan a ejecutarse **en el momento en que llamas al método**, no cuando haces `await`. El `await` solo espera el resultado.

| Método | Qué hace |
|---|---|
| `Task.WhenAll(tareas)` | Completa cuando **todas** terminan. Devuelve `T[]` para `Task<T>` |
| `Task.WhenAny(tareas)` | Completa cuando **la primera** termina; devuelve esa tarea |
| `Task.Delay(ms, ct)` | Espera asíncrona (no bloquea, a diferencia de `Thread.Sleep`) |
| `Task.FromResult(x)` | Tarea ya completada con valor (útil en mocks e interfaces) |
| `Task.CompletedTask` | Tarea ya completada sin valor |
| `tarea.WaitAsync(timeout)` | .NET 6+: espera con timeout / cancelación |
| `Task.Run(func)` | Encola trabajo CPU en el thread pool |

### 8.1 Excepciones con `WhenAll`

```csharp
static async Task FallarAsync(Exception ex)
{
    await Task.Delay(10);
    throw ex;   // (aquí sí es aceptable: la excepción es nueva, no hay trace que perder)
}

Task t1 = FallarAsync(new InvalidOperationException("uno"));
Task t2 = FallarAsync(new ArgumentException("dos"));
Task todas = Task.WhenAll(t1, t2);

try
{
    await todas;
}
catch (Exception ex)
{
    // ⚠️ await relanza SOLO la primera excepción
    Console.WriteLine(ex.Message);                         // "uno"

    // Para verlas todas, inspecciona la Task:
    foreach (var inner in todas.Exception!.InnerExceptions)
        Console.WriteLine($" - {inner.Message}");          // "uno", "dos"
}
```

`.Wait()` y `.Result` en cambio lanzan la `AggregateException` completa (Sesión 12).

### 8.2 Timeout con `WhenAny` o `WaitAsync`

```csharp
// Moderno (.NET 6+)
try
{
    string datos = await ObtenerDatosAsync().WaitAsync(TimeSpan.FromSeconds(2));
}
catch (TimeoutException)
{
    Console.WriteLine("Tardó demasiado");
    // ⚠️ La operación original SIGUE corriendo; WaitAsync solo deja de esperarla.
    //    Para detenerla de verdad, usa CancellationToken (sección 9).
}
```

### 8.3 Limitar concurrencia con `SemaphoreSlim`

Lanzar 10.000 requests HTTP a la vez con `WhenAll` puede tumbar al servidor remoto o agotar sockets.

```csharp
var semaforo = new SemaphoreSlim(initialCount: 10);   // máximo 10 a la vez

var tareas = urls.Select(async url =>
{
    await semaforo.WaitAsync();          // espera asíncrona por un "cupo"
    try
    {
        return await http.GetStringAsync(url);
    }
    finally
    {
        semaforo.Release();              // SIEMPRE en finally
    }
});

string[] resultados = await Task.WhenAll(tareas);

// Alternativa .NET 6+:
// await Parallel.ForEachAsync(urls, new ParallelOptions { MaxDegreeOfParallelism = 10 },
//     async (url, ct) => await http.GetStringAsync(url, ct));
```

> ⚠️ **No puedes usar `await` dentro de un `lock`** (error CS1996): el lock está atado al hilo, y tras el await podrías estar en otro. Usa `SemaphoreSlim(1, 1)` como "lock asíncrono". Locks a fondo en la Sesión 29.

---

## 9. Cancelación cooperativa: `CancellationToken`

.NET no "mata" tareas. La cancelación es **cooperativa**: quien la pide levanta una bandera; quien trabaja la revisa.

```
CancellationTokenSource  ──crea──▶  CancellationToken  ──se pasa a──▶  métodos async
       │ .Cancel()                         │ IsCancellationRequested
       └───────── "levanta la bandera" ────┘ ThrowIfCancellationRequested()
```

```csharp
public static async Task ProcesarArchivosAsync(
    IEnumerable<string> rutas, CancellationToken ct = default)
{
    foreach (var ruta in rutas)
    {
        ct.ThrowIfCancellationRequested();                  // revisa en cada iteración

        string texto = await File.ReadAllTextAsync(ruta, ct); // propaga el token hacia abajo
        await Task.Delay(500, ct);                           // simula trabajo
        Console.WriteLine($"Procesado {ruta} ({texto.Length} chars)");
    }
}

// Llamador
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3)); // auto-cancela a los 3 s
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); }; // o con Ctrl+C

try
{
    await ProcesarArchivosAsync(Directory.GetFiles("."), cts.Token);
}
catch (OperationCanceledException)   // también atrapa TaskCanceledException (hereda de ella)
{
    Console.WriteLine("Cancelado por el usuario o timeout");
}
```

Buenas prácticas:
- El `CancellationToken` va como **último parámetro**, con `= default` en APIs públicas.
- **Propágalo siempre** hacia abajo (EF Core, HttpClient, streams lo aceptan).
- En ASP.NET Core, recíbelo en la acción del controller: se cancela si el cliente cierra la conexión (`HttpContext.RequestAborted`, Sesión 23).
- Combina tokens: `CancellationTokenSource.CreateLinkedTokenSource(ct1, ct2)`.
- Dispose el `CancellationTokenSource` (especialmente si usa timer).

> ❓ **Entrevista**: *"¿Cómo cancelas una Task en ejecución?"* → No se puede forzar. Se usa un `CancellationTokenSource`; el token se pasa al método, que debe revisarlo (`ThrowIfCancellationRequested`) o pasarlo a APIs que lo respeten. La cancelación se señala con `OperationCanceledException`.

---

## 10. Thread pool, `Task.Run` y `TaskCompletionSource`

### 10.1 Thread pool
Conjunto de hilos reutilizables gestionado por el runtime. `Task.Run`, las continuaciones de `await` (sin contexto) y los timers corren aquí. Inyecta hilos gradualmente cuando detecta bloqueos (algoritmo *hill climbing*): por eso el starvation se manifiesta como latencia que sube lentamente.

```csharp
ThreadPool.GetMinThreads(out int workerMin, out int ioMin);
Console.WriteLine($"Min workers: {workerMin}, Min IO: {ioMin}");
Console.WriteLine($"Hilo actual: {Environment.CurrentManagedThreadId}");
```

| | `Thread` | `Task` |
|---|---|---|
| Nivel | Bajo (hilo del SO) | Alto (unidad de trabajo) |
| Costo | ~1 MB stack, creación cara | Liviano, usa el pool |
| Resultado / excepciones | Manual | Integrado (`Result`, `Exception`) |
| Composición | Difícil | `WhenAll`, `ContinueWith`, `await` |
| Cuándo | Hilo dedicado de larga vida (raro) | Casi siempre |

> Para trabajo **de muy larga duración** en un hilo dedicado: `Task.Factory.StartNew(..., TaskCreationOptions.LongRunning)` evita secuestrar un hilo del pool. `Task.Run` es un atajo de `StartNew` con opciones seguras por defecto; prefiérelo en el resto de casos.

### 10.2 `TaskCompletionSource<T>`: convertir callbacks en Tasks

```csharp
// Adaptar una API antigua basada en eventos (Sesión 11) a async/await
public static Task<string> EsperarMensajeAsync(ColaLegacy cola)
{
    var tcs = new TaskCompletionSource<string>(
        TaskCreationOptions.RunContinuationsAsynchronously);  // ⚠️ recomendable siempre

    void Handler(object? s, string msg)
    {
        cola.MensajeRecibido -= Handler;   // evita fuga de memoria (Sesión 14)
        tcs.TrySetResult(msg);             // completa la Task
    }
    cola.MensajeRecibido += Handler;
    return tcs.Task;
}

public class ColaLegacy
{
    public event EventHandler<string>? MensajeRecibido;
    public void Simular(string m) => MensajeRecibido?.Invoke(this, m);
}
```

`RunContinuationsAsynchronously` evita que las continuaciones corran **sincrónicamente dentro** de `TrySetResult`, lo cual puede causar reentradas y deadlocks sutiles.

---

## 11. `ValueTask<T>`: evitar asignaciones en el camino rápido

`Task<T>` es una clase → cada llamada async que completa asigna un objeto en el heap. Si un método **casi siempre** termina de forma síncrona (ej. dato en caché), esa asignación es desperdicio.

```csharp
private readonly Dictionary<int, string> _cache = new();

public ValueTask<string> ObtenerNombreAsync(int id)
{
    if (_cache.TryGetValue(id, out var nombre))
        return ValueTask.FromResult(nombre);             // sin asignación en el heap

    return new ValueTask<string>(CargarDesdeBdAsync(id)); // camino lento: envuelve una Task
}

private async Task<string> CargarDesdeBdAsync(int id)
{
    await Task.Delay(50);
    return _cache[id] = $"Usuario {id}";
}
```

> ⚠️ **Reglas de `ValueTask`** (romperlas da bugs muy raros):
> - Haz `await` **una sola vez**. No la awaites dos veces.
> - No la awaites concurrentemente desde varios lugares.
> - No uses `.Result` / `.GetAwaiter().GetResult()` si no está completada.
> - Si necesitas alguna de esas cosas → `.AsTask()`.

**Default: usa `Task`**. Usa `ValueTask` solo en hot paths medidos (Sesión 30). La BCL lo usa en `Stream.ReadAsync(Memory<byte>)`, `IAsyncEnumerator.MoveNextAsync` y `IAsyncDisposable.DisposeAsync`.

---

## 12. `IAsyncEnumerable<T>` y `await foreach` (C# 8)

Para producir/consumir una **secuencia** cuyos elementos llegan de forma asíncrona (paginación de una API, filas de BD, mensajes):

```csharp
using System.Runtime.CompilerServices;

public static async IAsyncEnumerable<int> LeerSensorAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    for (int i = 0; i < 5; i++)
    {
        await Task.Delay(300, ct);   // simula esperar la siguiente lectura
        yield return Random.Shared.Next(15, 30);
    }
}

// Consumidor: procesa cada elemento en cuanto llega (no espera la lista completa)
using var cts = new CancellationTokenSource();
await foreach (int temp in LeerSensorAsync().WithCancellation(cts.Token))
{
    Console.WriteLine($"Temperatura: {temp}°C");
}
```

| | `Task<List<T>>` | `IAsyncEnumerable<T>` |
|---|---|---|
| Entrega | Todo al final | Elemento por elemento |
| Memoria | Toda la colección | Un elemento a la vez (streaming) |
| Primer resultado | Tras cargar todo | Inmediato |

EF Core lo expone con `AsAsyncEnumerable()` (Sesión 25). Para productor/consumidor con backpressure, mira **Channels** en la Sesión 29.

### 12.1 `IAsyncDisposable` y `await using`

```csharp
await using var conexion = new SqlConnection(cs);   // llama DisposeAsync() al salir
```

Profundizamos el patrón Dispose en la Sesión 14.

---

## 13. Antipatrones y buenas prácticas

```
✅ Async hasta arriba (de Main/controller al I/O)
✅ Propaga CancellationToken
✅ Task.WhenAll para I/O independiente
✅ ConfigureAwait(false) en librerías
✅ Devuelve la Task directamente si no hay lógica después (opcional, ver ⚠️)
✅ Nombres con sufijo Async

❌ .Result / .Wait() / GetAwaiter().GetResult()  (sync-over-async)
❌ async void (salvo event handlers)
❌ Task.Run para envolver I/O
❌ Thread.Sleep en código async (usa Task.Delay)
❌ await dentro de lock
❌ Fire-and-forget sin manejo de errores: _ = HacerAlgoAsync();
```

> ⚠️ **Eliding async** (`Task<int> F() => OtroAsync();` sin `async/await`) ahorra la máquina de estados, pero cambia el comportamiento: si hay un `using` o `try` en el método, el recurso se libera **antes** de que termine la tarea, y las excepciones síncronas se lanzan al invocar en vez de al awaitar. Solo elide en *pass-through* triviales.

**Main asíncrono** (C# 7.1+), y con top-level statements basta con usar `await`:

```csharp
// Program.cs
await ProcesarArchivosAsync(["a.txt", "b.txt"]);
```

---

## Resumen mental de la sesión

```
async/await → no bloquear hilos mientras se ESPERA (escalabilidad/responsividad)
I/O-bound  → await directo (no hay hilo esperando)
CPU-bound  → Task.Run (UI) / Parallel (Sesión 29)

Task = promesa de resultado futuro, NO un hilo
Compilador → máquina de estados: locales = campos, cada await = un estado

await:
  ¿ya terminó? → sigue síncrono
  si no        → registra continuación, devuelve control
  al terminar  → continúa en el contexto capturado (o pool)
  si falló     → relanza la PRIMERA excepción

.Result/.Wait()      → deadlock (UI/ASP.NET clásico) + starvation del pool
ConfigureAwait(false)→ no volver al contexto (librerías)
async void           → solo event handlers; excepciones incapturables
WhenAll / WhenAny / WaitAsync / SemaphoreSlim
CancellationToken    → cancelación cooperativa, OperationCanceledException
ValueTask            → evita asignación en camino síncrono; awaitar UNA vez
IAsyncEnumerable     → await foreach, streaming
TaskCompletionSource → callbacks/eventos → Task
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué problema resuelve async/await? ¿Hace el código más rápido?
2. ❓ ¿Diferencia entre I/O-bound y CPU-bound? ¿Cuándo usarías `Task.Run`?
3. ❓ ¿Una `Task` es un hilo? Explica "there is no thread".
4. ❓ ¿Qué genera el compilador para un método `async`?
5. ❓ ¿Por qué `.Result` puede causar un deadlock? ¿Cómo lo evitas?
6. ❓ ¿Qué hace `ConfigureAwait(false)` y cuándo lo usas? ¿Importa en ASP.NET Core?
7. ❓ ¿Por qué `async void` es peligroso? ¿Cuándo es aceptable?
8. ❓ Con `Task.WhenAll`, si fallan dos tareas, ¿qué excepción ves con `await`?
9. ❓ ¿Cómo cancelas una operación async? ¿Qué significa que sea cooperativa?
10. ❓ ¿Cuándo usarías `ValueTask` en lugar de `Task`? ¿Qué restricciones tiene?
11. ❓ ¿Para qué sirve `IAsyncEnumerable<T>`?
12. ❓ ¿Cómo limitas cuántas operaciones async corren a la vez?

## Ejercicio práctico
1. `dotnet new console -o AsyncLab && cd AsyncLab`.
2. Crea `SimularIoAsync(string nombre, int ms)` que imprima `Environment.CurrentManagedThreadId` antes y después de `await Task.Delay(ms)`. Observa que el hilo **puede cambiar**.
3. Llama tres veces en secuencia y mide con `Stopwatch`; luego con `Task.WhenAll`. Compara tiempos.
4. Haz que una de las tres lance una excepción y otra lance otra distinta. Captura con `await` y luego recorre `tarea.Exception.InnerExceptions`.
5. Agrega un `CancellationTokenSource(TimeSpan.FromSeconds(1))` y cancela un bucle de 10 `Task.Delay(300, ct)`. Captura `OperationCanceledException`.
6. Descarga 20 URLs (o simula con `Task.Delay`) limitando a 3 concurrentes con `SemaphoreSlim`. Imprime cuántas hay en vuelo en cada momento.
7. Escribe un `IAsyncEnumerable<int>` que emita números cada 200 ms y consúmelo con `await foreach`.
8. (Opcional) Escribe `list.ForEach(async x => { await Task.Delay(100); throw new Exception(); });` y observa qué pasa. Explica por qué.

---

➡️ **Cuando termines**, marca la Sesión 13 en el [README](Readme.md) y pídeme la **Sesión 14 — Manejo de memoria y Garbage Collector**.
