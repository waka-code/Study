# Sesión 14 — Manejo de memoria y Garbage Collector: quién limpia y cuándo

> **Objetivo de la sesión**: entender *cómo* .NET asigna memoria, *cómo* decide el Garbage Collector qué objetos están muertos, y *por qué* está diseñado en generaciones. Al terminar deberías poder explicar raíces, mark/compact, Gen0/1/2, LOH y POH, Workstation vs Server GC, la diferencia entre `Dispose` y un finalizador, implementar el patrón Dispose correctamente, y diagnosticar las "fugas de memoria" típicas de código managed.

---

## 1. Repaso: stack vs heap (y la letra chica)

En la Sesión 2 vimos la regla simplificada: *value types en el stack, reference types en el heap*. La versión precisa:

| | Stack | Managed heap |
|---|---|---|
| **Qué guarda** | Frames de métodos: variables locales, parámetros, direcciones de retorno | Objetos de reference types (y value types *boxeados* o que son campos de un objeto) |
| **Quién libera** | Automático al salir del método (mover un puntero) | **El Garbage Collector** |
| **Velocidad** | Extremadamente rápido | Asignar es rápido; liberar tiene costo (GC) |
| **Tamaño** | Pequeño (~1 MB por hilo por defecto) | Grande, crece según necesidad |
| **Por hilo** | Uno por hilo | Compartido por todos los hilos |

```csharp
void Ejemplo()
{
    int x = 42;                   // local value type → stack
    var p = new Punto(1, 2);      // struct local → stack
    var c = new Cliente("Ana");   // la REFERENCIA c está en el stack; el OBJETO, en el heap
    object o = x;                 // boxing: se crea una copia de x en el heap (Sesión 31)
    int[] arr = new int[10];      // array (reference type) → heap, aunque contenga ints
}

record struct Punto(int X, int Y);
class Cliente(string nombre) { public string Nombre { get; } = nombre; public Punto Ubicacion; }
// ↑ Cliente.Ubicacion es un struct, pero vive DENTRO del objeto Cliente → en el heap
```

> ⚠️ La frase correcta de entrevista: *"Los value types viven donde se declaran: como variable local, en el stack; como campo de una clase, dentro de ese objeto en el heap"*. Además, las locales capturadas por lambdas (Sesión 10) o que sobreviven un `await` (Sesión 13) se mueven a objetos en el heap.

---

## 2. ¿Por qué un Garbage Collector?

En C/C++ tú liberas con `free`/`delete`. Los errores clásicos:
- **Memory leak**: olvidas liberar.
- **Dangling pointer / use-after-free**: usas memoria ya liberada.
- **Double free**: liberas dos veces → corrupción.

El GC elimina las tres categorías **para memoria managed**: nunca liberas a mano, y un objeto solo se libera cuando **nadie puede alcanzarlo**. El precio: pausas ocasionales y menos control sobre *cuándo* se libera.

> El GC gestiona **memoria**. **No** gestiona recursos no managed (archivos, sockets, conexiones de BD, handles del SO). Para eso existe `IDisposable` (sección 8). Esta distinción es la base de media sesión.

---

## 3. Cómo asigna memoria .NET: el bump pointer

El managed heap asigna de forma **contigua**. Cada hilo tiene un pequeño bloque reservado (*allocation context*); asignar es básicamente:

```
     objetos existentes                       espacio libre
 ┌──────┬────────┬─────┬───┬──────────────────────────────────┐
 │ obj1 │  obj2  │obj3 │o4 │                                  │
 └──────┴────────┴─────┴───┴──────────────────────────────────┘
                              ▲
                     "next object pointer"
new Foo() → devuelve el puntero actual y lo avanza sizeof(Foo). ¡Eso es todo!
```

Por eso **asignar en .NET es muy barato** (más que un `malloc` que busca huecos en una lista libre). Lo caro viene después: **recolectar**. Cada objeto además lleva un *overhead*: object header (8 B) + puntero al tipo (MethodTable, 8 B) en 64 bits, y el tamaño mínimo de cualquier objeto es **24 bytes** (incluso un `new object()` vacío).

---

## 4. ¿Cómo sabe el GC qué está muerto? Raíces y alcanzabilidad

El GC **no** cuenta referencias (como Python o `shared_ptr`). Hace **tracing**: parte de las **raíces** y marca todo lo alcanzable. Lo no marcado es basura.

**Raíces (GC roots)**:
- Variables locales y parámetros **vivos** en el stack de cada hilo (y registros de CPU).
- Campos `static`.
- Handles del GC (`GCHandle`, objetos *pinned*).
- La cola de finalización (sección 9).

```
 RAÍCES                    HEAP
 ┌──────────┐
 │ static   │──────▶ [A] ──▶ [B]
 │ _cache   │
 ├──────────┤
 │ local x  │──────▶ [C] ◀──┐
 └──────────┘               │
                     [D] ──▶ [E]      ← D y E se referencian entre sí...
                      ▲       │         ...pero NADIE desde una raíz → BASURA
                      └───────┘
 Vivos: A, B, C       Muertos: D, E  (los ciclos NO son problema para un tracing GC)
```

> ❓ **Entrevista**: *"¿Las referencias circulares causan fugas en .NET?"* → No. El GC es de tipo *tracing* desde raíces: si un ciclo no es alcanzable desde ninguna raíz, se recolecta completo. Los ciclos solo son problema en esquemas de *reference counting*.

> ⚠️ En builds **Release**, el JIT sabe cuándo una local deja de usarse y el objeto puede recolectarse **antes** de terminar el método. En **Debug**, las locales se mantienen vivas hasta el final del método (para que el depurador las vea). Por eso algunos experimentos con GC dan resultados distintos en Debug y Release.

### 4.1 Las fases de una recolección

```
1. SUSPENSIÓN  → se detienen los hilos managed en un "safe point"
2. MARK        → desde las raíces, marcar todo lo alcanzable
3. PLAN/SWEEP  → calcular dónde irá cada objeto vivo
4. COMPACT     → mover los vivos para eliminar huecos y actualizar TODAS las referencias
5. REANUDACIÓN → los hilos siguen
```

**Compactar** es clave: elimina la fragmentación y mantiene el bump pointer funcionando. Pero implica **mover objetos**, por eso las direcciones de memoria de objetos managed no son estables (y hace falta *pinning* para pasar punteros a código nativo, Sesión 19).

---

## 5. El GC generacional

Observación empírica (*hipótesis generacional*): **la mayoría de los objetos mueren jóvenes** (strings temporales, DTOs de una request, iteradores de LINQ). Unos pocos viven mucho (cachés, singletons).

Entonces, en vez de revisar todo el heap cada vez, .NET divide en **generaciones**:

```
 ┌──────────────┐   sobrevive   ┌──────────────┐   sobrevive   ┌─────────────────────────┐
 │    Gen 0     │ ────────────▶ │    Gen 1     │ ────────────▶ │          Gen 2           │
 │ objetos nuevos│              │  "buffer"    │               │ objetos de larga vida    │
 │ GC muy seguido│              │              │               │ GC poco frecuente, caro  │
 │ muy barato   │               │              │               │ (full GC)                │
 └──────────────┘               └──────────────┘               └─────────────────────────┘
                                                                ┌─────────────────────────┐
                                                                │ LOH (objetos ≥ 85.000 B) │ ← lógicamente Gen 2
                                                                ├─────────────────────────┤
                                                                │ POH (pinned, .NET 5+)    │
                                                                └─────────────────────────┘
```

| Generación | Contenido | Frecuencia de GC | Costo |
|---|---|---|---|
| **Gen 0** | Recién creados | Muy alta | Muy bajo (poca memoria viva) |
| **Gen 1** | Sobrevivieron un GC de Gen 0 | Media | Bajo |
| **Gen 2** | Sobrevivieron Gen 1: larga vida | Baja | **Alto**: revisa todo el heap |
| **LOH** | Objetos ≥ **85.000 bytes** | Con Gen 2 | Alto; por defecto **no se compacta** |
| **POH** | Objetos asignados como pinned | Con Gen 2 | No se compacta (por definición) |

Reglas:
- Recolectar Gen N implica recolectar también todas las generaciones menores.
- Un GC de Gen 2 = **full GC**.
- El GC ajusta el tamaño de cada generación dinámicamente según el patrón de la app.

### 5.1 ¿Cómo recolecta Gen 0 sin revisar Gen 2? Card tables

Problema: un objeto viejo (Gen 2) puede apuntar a uno joven (Gen 0). Si solo miramos Gen 0, ¿cómo sabemos que está vivo?

Solución: cada vez que escribes una referencia en un campo, el JIT inserta una **write barrier** que marca una "tarjeta" en la **card table** si un objeto viejo pasó a apuntar a uno joven. En un GC de Gen 0, las tarjetas marcadas se tratan como raíces adicionales. Por eso escribir referencias en objetos de Gen 2 tiene un costo pequeño extra.

### 5.2 La crisis de la mediana edad (mid-life crisis)

El peor patrón para el GC: objetos que viven **lo suficiente para llegar a Gen 2 y luego mueren** (ej. objetos cacheados por unos minutos). Se pagan las promociones **y** después hace falta un full GC para liberarlos.

> ⚠️ Los objetos con **finalizador** sobreviven automáticamente al menos un GC más (sección 9) → son candidatos típicos a esta crisis.

```csharp
var obj = new object();
Console.WriteLine(GC.GetGeneration(obj));   // 0

GC.Collect();                                // ⚠️ solo para demostración
Console.WriteLine(GC.GetGeneration(obj));   // 1 (sobrevivió → promovido)

GC.Collect();
Console.WriteLine(GC.GetGeneration(obj));   // 2

Console.WriteLine(GC.GetGeneration(new byte[100_000]));  // 2 → LOH

Console.WriteLine($"GCs Gen0: {GC.CollectionCount(0)}, Gen1: {GC.CollectionCount(1)}, Gen2: {GC.CollectionCount(2)}");
GC.KeepAlive(obj);   // mantiene obj vivo hasta aquí (sección 4 ⚠️ Release)
```

> ❓ **Entrevista**: *"¿Por qué el GC de .NET es generacional?"* → Porque la mayoría de los objetos mueren jóvenes. Recolectar solo Gen 0 revisa poca memoria, encuentra mucha basura y es muy rápido. Los objetos de larga vida se revisan rara vez, en Gen 2.

---

## 6. El Large Object Heap (LOH)

Objetos de **85.000 bytes o más** (típicamente arrays grandes y strings enormes) van directo al LOH. ¿Por qué separarlos? **Copiar** (compactar) objetos grandes es caro.

Consecuencias:
- El LOH **no se compacta por defecto** → puede **fragmentarse**: hay memoria libre total suficiente, pero no un hueco contiguo del tamaño pedido.
- Solo se recolecta en **Gen 2** → la basura grande vive más.
- Asignar muchos objetos grandes y temporales **dispara full GCs**.

```csharp
byte[] pequeño = new byte[84_000];   // Gen 0 (con el header queda bajo 85.000)
byte[] grande  = new byte[85_000];   // LOH

// Forzar la compactación del LOH en el próximo full GC (raro, medido):
System.Runtime.GCSettings.LargeObjectHeapCompactionMode =
    System.Runtime.GCLargeObjectHeapCompactionMode.CompactOnce;
GC.Collect();
```

Soluciones reales:
- **Reutilizar buffers** con `ArrayPool<T>.Shared` (Sesión 30):
  ```csharp
  byte[] buffer = System.Buffers.ArrayPool<byte>.Shared.Rent(1_000_000);
  try
  {
      // usar buffer (⚠️ puede ser MÁS grande que lo pedido)
  }
  finally
  {
      System.Buffers.ArrayPool<byte>.Shared.Return(buffer);
  }
  ```
- Trabajar en **streaming** en vez de cargar todo en memoria.
- `Span<T>` / `Memory<T>` para trocear sin copiar (Sesión 19).
- `RecyclableMemoryStream` (Microsoft.IO) en lugar de `MemoryStream` gigantes.

### 6.1 Pinned Object Heap (POH) y pinning
A veces código nativo necesita la dirección fija de un buffer. **Pinning** impide que el GC mueva un objeto, lo que fragmenta Gen 0/1. Desde .NET 5 puedes asignarlo directamente en el POH:

```csharp
byte[] pinned = GC.AllocateArray<byte>(4096, pinned: true);   // vive en el POH, no se moverá
```

---

## 7. Modos del GC: Workstation vs Server, concurrente/background

| Modo | Características | Default en |
|---|---|---|
| **Workstation** | Un heap; GC en el hilo que disparó; pausas cortas, menos memoria | Apps de consola y escritorio |
| **Server** | Un heap **y un hilo de GC por núcleo lógico**; mayor throughput, más memoria | **ASP.NET Core** |
| **Background (concurrente)** | Los full GC (Gen 2) marcan **en paralelo** mientras la app sigue corriendo; Gen 0/1 siguen pausando | Activado por defecto en ambos |

```xml
<!-- .csproj -->
<PropertyGroup>
  <ServerGarbageCollector>true</ServerGarbageCollector>
  <ConcurrentGarbageCollection>true</ConcurrentGarbageCollection>
  <!-- .NET 8: DATAS = Server GC que adapta el nº de heaps a la carga (default en .NET 9) -->
  <GarbageCollectionAdaptationMode>1</GarbageCollectionAdaptationMode>
</PropertyGroup>
```

O vía variables de entorno (útil en contenedores): `DOTNET_gcServer=1`, `DOTNET_GCHeapHardLimit=0x20000000`.

> ⚠️ **Contenedores (ECS/Kubernetes)**: .NET respeta los límites de memoria del cgroup: por defecto el heap se limita al **75%** del límite del contenedor. Con Server GC y muchos núcleos visibles pero poca memoria, podías ver OOMKills; DATAS (.NET 8 opt-in, default en .NET 9) mitiga esto. Ajusta con `GCHeapHardLimitPercent` si hace falta.

Desde .NET 7 el GC usa **regions** (bloques de tamaño fijo reasignables entre generaciones) en vez de grandes *segments*, lo que reduce la fragmentación y mejora la devolución de memoria al SO.

### 7.1 Latencia configurable

```csharp
using System.Runtime;

var anterior = GCSettings.LatencyMode;
try
{
    // Evitar full GCs bloqueantes durante una ventana crítica (ej. trading, render)
    GCSettings.LatencyMode = GCLatencyMode.SustainedLowLatency;
    // ... sección sensible a latencia ...
}
finally
{
    GCSettings.LatencyMode = anterior;
}

// Aún más extremo: ninguna GC mientras no superes X bytes asignados
if (GC.TryStartNoGCRegion(10_000_000))
{
    try { /* ... */ }
    finally
    {
        if (GCSettings.LatencyMode == GCLatencyMode.NoGCRegion)
            GC.EndNoGCRegion();
    }
}
```

---

## 8. Recursos no managed e `IDisposable`

El GC libera **memoria**, pero:
1. **No sabe** que tu objeto tiene un handle de archivo, un socket o una conexión de BD.
2. **No es determinista**: no sabes *cuándo* correrá. Una conexión de BD no puede esperar "a que haya presión de memoria".

`IDisposable` ofrece **liberación determinista**:

```csharp
public interface IDisposable
{
    void Dispose();
}
```

```csharp
// ✅ Forma idiomática: using garantiza Dispose() incluso con excepciones (Sesión 12)
using (var conexion = new SqlConnection(cadena))
{
    conexion.Open();
    // ...
}   // ← Dispose() aquí: la conexión vuelve al pool

// C# 8+: using declaration → Dispose() al final del scope
using var archivo = new FileStream("log.txt", FileMode.Append);
using var escritor = new StreamWriter(archivo);
escritor.WriteLine("hola");
// al salir del método: escritor.Dispose() y luego archivo.Dispose() (orden inverso)

// Async (Sesión 13)
await using var stream = File.OpenWrite("datos.bin");
```

| | `Dispose()` | Finalizador (`~Clase()`) |
|---|---|---|
| Quién lo llama | **Tú** (o `using`) | **El GC** (hilo de finalización) |
| Cuándo | Determinista: cuando decides | No determinista: *algún día*, o nunca |
| Propósito | Liberar managed + unmanaged | **Red de seguridad** si olvidaron `Dispose` |
| Costo | Ninguno especial | Alto (sección 9) |
| ¿Debo implementarlo? | Si tienes recursos o campos `IDisposable` | **Casi nunca** (usa `SafeHandle`) |

> ❓ **Entrevista**: *"¿Diferencia entre Dispose y Finalize?"* → `Dispose` es liberación **determinista** que invoca el código (vía `using`). El finalizador lo invoca el GC de forma **no determinista** y solo sirve como red de seguridad para recursos **no managed**. Un buen `Dispose` llama a `GC.SuppressFinalize(this)` para evitar el costo del finalizador.

---

## 9. Finalizadores: por qué son caros

```csharp
class ConFinalizador
{
    ~ConFinalizador()      // se compila como override de Object.Finalize()
    {
        Console.WriteLine("Finalizando...");
    }
}
```

El ciclo de vida de un objeto con finalizador:

```
new ConFinalizador()
   │  → se registra en la FINALIZATION QUEUE (asignación más lenta)
   ▼
se vuelve inalcanzable
   │  GC #1: "está muerto... pero tiene finalizador"
   │  → se mueve a la F-REACHABLE QUEUE (¡es una raíz! el objeto REVIVE)
   │  → es PROMOVIDO a la siguiente generación (y todo lo que referencia)
   ▼
el hilo de finalización ejecuta ~ConFinalizador()
   ▼
GC #2 (de una generación más alta): ahora sí se libera la memoria
```

Problemas:
- El objeto (y su grafo) sobrevive **al menos una GC extra** → promoción → mid-life crisis.
- **Un solo hilo** de finalización: si un finalizador se bloquea, **ninguno** más corre → fuga.
- Orden no garantizado: no puedes tocar otros objetos managed finalizables (pueden estar ya finalizados).
- Puede no ejecutarse nunca (en .NET Core/5+ **no** se ejecutan finalizadores al cerrar el proceso).
- Excepción no controlada en un finalizador → **termina el proceso**.

---

## 10. El patrón Dispose (completo y moderno)

### 10.1 Caso común (95%): solo envuelves otros `IDisposable`

**Sin finalizador**. Clase `sealed`:

```csharp
public sealed class ServicioReportes : IDisposable
{
    private readonly HttpClient _http = new();
    private readonly FileStream _log = File.OpenWrite("reportes.log");
    private bool _disposed;

    public void Generar()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);   // .NET 7+
        // ...
    }

    public void Dispose()
    {
        if (_disposed) return;          // idempotente: llamar 2 veces no debe fallar
        _http.Dispose();
        _log.Dispose();
        _disposed = true;
    }
}
```

### 10.2 Caso base no sellada (herencia) — el patrón clásico

```csharp
public class RecursoBase : IDisposable
{
    private readonly Stream _stream;
    private bool _disposed;

    public RecursoBase(Stream stream) => _stream = stream;

    public void Dispose()
    {
        Dispose(disposing: true);
        GC.SuppressFinalize(this);   // si una subclase agrega finalizador, ya no hace falta correrlo
    }

    // disposing = true  → llamado desde Dispose(): libera managed + unmanaged
    // disposing = false → llamado desde un finalizador: SOLO unmanaged (los managed pueden estar muertos)
    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing)
        {
            _stream.Dispose();
        }
        // aquí liberarías recursos unmanaged directos (si los hubiera)
        _disposed = true;
    }
}

public class RecursoDerivado : RecursoBase
{
    private readonly Timer _timer = new(_ => { }, null, 0, 1000);
    private bool _disposed;

    public RecursoDerivado(Stream s) : base(s) { }

    protected override void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing) _timer.Dispose();
            _disposed = true;
        }
        base.Dispose(disposing);     // ⚠️ SIEMPRE llamar a la base
    }
}
```

### 10.3 Recursos unmanaged de verdad: usa `SafeHandle`

En vez de guardar un `IntPtr` y escribir un finalizador, envuélvelo en un `SafeHandle`: ya trae finalizador crítico, es seguro ante excepciones asíncronas y contra *handle recycling*.

```csharp
using Microsoft.Win32.SafeHandles;

public sealed class HandleNativo : SafeHandleZeroOrMinusOneIsInvalid
{
    public HandleNativo() : base(ownsHandle: true) { }

    protected override bool ReleaseHandle()
    {
        // return CloseHandle(handle);   // P/Invoke real (Sesión 19)
        return true;
    }
}
// Tu clase solo tiene un campo HandleNativo y lo "disposea" como cualquier IDisposable.
```

> **Regla moderna**: *casi nunca escribas un finalizador*. Si tienes recursos nativos, usa `SafeHandle`. Si solo tienes campos `IDisposable`, implementa `Dispose()` simple (10.1).

> ⚠️ **¿Quién hace Dispose?** El que **crea** (o es dueño de) el objeto. Si te lo inyectan por DI, **el contenedor** lo dispone según su lifetime (Sesión 24) — no lo hagas tú.

> ⚠️ **`HttpClient`**: aunque es `IDisposable`, crear y disponer uno por request agota sockets (TIME_WAIT). Reutilízalo o usa `IHttpClientFactory` (Sesión 22).

---

## 11. "Fugas de memoria" en código managed

El GC no puede liberar lo que **sigue siendo alcanzable**. Una fuga en .NET = **referencias que olvidaste que existían**.

| Causa | Por qué fuga | Solución |
|---|---|---|
| **Eventos no desuscritos** | El publicador guarda una referencia al suscriptor en su delegate (Sesión 11). Publicador longevo → suscriptor inmortal | `-=` al terminar, `IDisposable` que desuscriba, weak events |
| **Colecciones `static` / cachés sin límite** | `static` es raíz; lo que agregues vive para siempre | `MemoryCache` con expiración y `SizeLimit` (Sesión 30) |
| **Closures que capturan de más** | La lambda mantiene vivo todo lo capturado (Sesión 10) | Capturar solo lo necesario, `static` lambdas |
| **Timers no dispuestos** | `System.Threading.Timer` activo mantiene su callback | `Dispose()` del timer |
| **Singleton que guarda Scoped** | "Captive dependency": el scoped nunca muere (Sesión 24) | Respetar lifetimes, `IServiceScopeFactory` |
| **`IDisposable` no dispuesto** | Recursos nativos retenidos hasta el finalizador (o nunca) | `using` |
| **Strings grandes / `Substring` masivos** | Muchas copias en LOH | `Span<char>`, `StringBuilder` |

```csharp
// Fuga clásica por evento
public class Publicador              // vive toda la app (ej. singleton)
{
    public event EventHandler? Cambio;
}

public class Pantalla : IDisposable  // se crea y se "cierra" muchas veces
{
    private readonly Publicador _pub;
    private readonly byte[] _datos = new byte[1_000_000];   // 1 MB por pantalla

    public Pantalla(Publicador pub)
    {
        _pub = pub;
        _pub.Cambio += OnCambio;     // ← _pub ahora referencia a esta Pantalla
    }

    private void OnCambio(object? s, EventArgs e) { /* ... */ }

    public void Dispose() => _pub.Cambio -= OnCambio;   // ✅ sin esto, cada Pantalla vive para siempre
}
```

### 11.1 `WeakReference<T>`: referencias que no mantienen vivo

```csharp
var grande = new byte[10_000_000];
var debil = new WeakReference<byte[]>(grande);

grande = null!;          // eliminamos la única referencia fuerte
GC.Collect();

if (debil.TryGetTarget(out var recuperado))
    Console.WriteLine("Sigue vivo");
else
    Console.WriteLine("Fue recolectado");   // lo más probable en Release
```

Útil para cachés "oportunistas" o para asociar datos a objetos sin extender su vida (`ConditionalWeakTable<TKey, TValue>`). No es un sustituto de un buen diseño de lifetimes.

---

## 12. `GC.Collect()`: ¿cuándo llamarlo?

Casi **nunca**.

```csharp
GC.Collect();                       // ❌ en código de producción
GC.Collect(2, GCCollectionMode.Forced, blocking: true, compacting: true);  // aún peor
```

Por qué:
- El GC tiene heurísticas afinadas: sabe mejor que tú cuándo conviene.
- Forzar un full GC **promueve** objetos vivos a Gen 2 prematuramente → más full GCs después.
- Pausa todos los hilos.

Casos legítimos (raros): tests/benchmarks que necesitan un estado limpio, justo después de liberar una estructura enorme de una sola vez en una app de escritorio (ej. cerrar un documento gigante), antes de tomar un snapshot de memoria para diagnóstico.

```csharp
// Patrón para tests de fugas: forzar recolección completa incluyendo finalizadores
GC.Collect();
GC.WaitForPendingFinalizers();   // espera a que el hilo de finalización vacíe su cola
GC.Collect();                    // recolecta lo que los finalizadores liberaron
```

> ❓ **Entrevista**: *"¿Deberías llamar a `GC.Collect()`?"* → En producción casi nunca. Interfiere con las heurísticas, promueve objetos prematuramente y pausa la app. Si "necesitas" llamarlo, suele indicar una fuga o un patrón de asignación que hay que corregir (pooling, streaming).

---

## 13. Diagnóstico: medir antes de optimizar

```csharp
// Métricas desde el código
Console.WriteLine($"Heap aprox.: {GC.GetTotalMemory(forceFullCollection: false) / 1024} KB");
Console.WriteLine($"Asignado total por este hilo: {GC.GetAllocatedBytesForCurrentThread()} B");
Console.WriteLine($"Asignado total proceso: {GC.GetTotalAllocatedBytes()} B");

GCMemoryInfo info = GC.GetGCMemoryInfo();
Console.WriteLine($"Heap: {info.HeapSizeBytes / 1024 / 1024} MB, " +
                  $"fragmentado: {info.FragmentedBytes / 1024} KB, " +
                  $"pausa: {info.PauseTimePercentage}%");
```

Herramientas (CLI de diagnóstico de .NET):

| Herramienta | Para qué |
|---|---|
| `dotnet-counters monitor -p <PID>` | Ver en vivo: tamaño de heap, GCs por generación, % tiempo en GC, tasa de asignación |
| `dotnet-gcdump collect -p <PID>` | Snapshot del heap: qué tipos ocupan memoria y quién los retiene |
| `dotnet-dump collect` + `analyze` | Dump completo; comandos SOS: `dumpheap -stat`, `gcroot <addr>` |
| `dotnet-trace` | Trazas de eventos GC y asignaciones |
| Visual Studio / Rider / PerfView | Profilers de memoria con UI |
| BenchmarkDotNet `[MemoryDiagnoser]` | Bytes asignados y GCs por operación (Sesión 30) |

```bash
dotnet tool install -g dotnet-counters
dotnet tool install -g dotnet-gcdump
dotnet-counters monitor --process-id 12345 --counters System.Runtime
```

Señales de alarma:
- **% time in GC** alto sostenido (>10–20%).
- **Gen 2 GCs** frecuentes.
- Heap que **solo crece** tras ciclos de carga repetidos → fuga (compara dos `gcdump`).
- Mucha asignación en LOH.

> ⚠️ **Reducir asignaciones** es la optimización de memoria más efectiva: menos objetos = menos GCs. Herramientas: `struct` donde tenga sentido, `Span<T>`, `ArrayPool`, `StringBuilder`, evitar boxing, evitar LINQ en hot paths, `static` lambdas. Lo profundizamos en las Sesiones 19, 30 y 31.

---

## Resumen mental de la sesión

```
Stack → frames, liberación automática · Heap managed → el GC
Value types viven DONDE se declaran (local → stack, campo de clase → heap)

Asignar: bump pointer (barato) · Recolectar: lo caro
GC tracing desde RAÍCES (locales vivas, statics, handles, f-reachable)
  → ciclos NO fugan
Fases: suspender → mark → plan → compact → reanudar

Generacional (la mayoría muere joven):
  Gen0 (seguido, barato) → Gen1 → Gen2 (full GC, caro)
  LOH ≥ 85.000 B: solo en Gen2, no compacta por defecto → ArrayPool
  POH: pinned sin fragmentar · card tables + write barrier para refs viejo→joven

Workstation (consola) vs Server (ASP.NET Core) · Background GC por defecto · DATAS
Contenedor: heap limitado al 75% del límite del cgroup

GC = MEMORIA. Recursos (archivos, sockets, BD) = IDisposable + using
Dispose: determinista, lo llamas tú · Finalizador: GC, no determinista, caro
  → casi nunca escribas finalizador; usa SafeHandle
  → Dispose idempotente, sealed si puedes, GC.SuppressFinalize en el patrón clásico

Fugas managed = referencias olvidadas: eventos, statics, cachés, timers, captive deps
GC.Collect() → casi nunca · Mide: dotnet-counters, dotnet-gcdump
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Dónde vive un `int` que es campo de una clase? ¿Y una local capturada por una lambda?
2. ❓ ¿Cómo determina el GC que un objeto es basura? ¿Qué son las raíces?
3. ❓ ¿Las referencias circulares causan fugas en .NET? ¿Por qué?
4. ❓ Explica las generaciones 0, 1 y 2 y la hipótesis generacional.
5. ❓ ¿Qué es el LOH, cuál es el umbral y qué problema de fragmentación tiene?
6. ❓ ¿Diferencia entre Workstation y Server GC? ¿Cuál usa ASP.NET Core por defecto?
7. ❓ ¿Diferencia entre `Dispose` y un finalizador? ¿Por qué los finalizadores son costosos?
8. ❓ ¿Para qué sirve `GC.SuppressFinalize(this)`? ¿Qué significa el parámetro `disposing`?
9. ❓ ¿Por qué se recomienda `SafeHandle` en lugar de un finalizador propio?
10. ❓ Nombra tres causas de fugas de memoria en código managed y cómo evitarlas.
11. ❓ ¿Cuándo es aceptable llamar a `GC.Collect()`?
12. ❓ ¿Qué herramientas usarías para diagnosticar un heap que crece sin parar en producción?

## Ejercicio práctico
1. `dotnet new console -o MemoriaLab && cd MemoriaLab`.
2. Crea un objeto pequeño y un `byte[85_000]`; imprime `GC.GetGeneration` de cada uno. Llama `GC.Collect()` dos veces y observa la promoción del pequeño.
3. Asigna 1.000.000 de strings temporales en un bucle e imprime `GC.CollectionCount(0/1/2)` antes y después. Repite en **Debug** y **Release** (`dotnet run -c Release`).
4. Implementa `ServicioReportes` (sección 10.1) y verifica con un `Console.WriteLine` dentro de `Dispose` que `using` lo invoca incluso si lanzas una excepción en el bloque.
5. Reproduce la **fuga por evento** (sección 11): crea 100 `Pantalla` sin llamar a `Dispose`, fuerza GC y mide `GC.GetTotalMemory(true)`. Luego llama a `Dispose` en cada una y compara.
6. Usa `WeakReference<Pantalla>` para comprobar si una pantalla fue recolectada con y sin desuscribir el evento.
7. (Opcional) Corre la app en un bucle infinito que asigne memoria y obsérvala en vivo con `dotnet-counters monitor -n MemoriaLab`. Toma un `dotnet-gcdump` y ábrelo en Visual Studio, Rider o PerfView.

---

➡️ **Cuando termines**, marca la Sesión 14 en el [README](Readme.md) y pídeme la **Sesión 15 — Nullable Reference Types**.
