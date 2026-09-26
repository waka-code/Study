# Sesión 12 — Manejo de excepciones: errores que no se pueden ignorar

> **Objetivo de la sesión**: entender *qué es* una excepción en .NET, *cómo* viaja por la pila de llamadas, y *cuándo* conviene lanzarla (y cuándo no). Al terminar deberías dominar `try/catch/finally`, la diferencia entre `throw` y `throw ex`, los filtros `when`, las excepciones personalizadas, el costo real de lanzar excepciones, y las alternativas (Try-pattern, Result pattern) que un senior pone sobre la mesa en una entrevista.

---

## 1. ¿Qué es una excepción y por qué existe?

Antes de las excepciones, los errores se comunicaban con **códigos de retorno** (estilo C: `return -1;`). El problema: nada te obliga a revisarlos. Si olvidas el `if`, el programa sigue corriendo con datos corruptos.

Una **excepción** es un objeto que representa una **condición anómala** y que **interrumpe el flujo normal**: el runtime deja de ejecutar el método actual y "desenrolla" la pila buscando alguien que la maneje. Si nadie la maneja, el proceso **termina**. No se puede ignorar por accidente.

| Enfoque | Ventaja | Desventaja |
|---|---|---|
| **Códigos de retorno** | Barato, explícito en la firma | Fácil de ignorar; ensucia el valor de retorno |
| **Excepciones** | Imposible de ignorar; separa el camino feliz del manejo de errores; trae stack trace | Costosas de lanzar; flujo "invisible" en la firma |
| **Result pattern** (sección 10) | Explícito y barato | Más código; C# no tiene soporte nativo |

> **Regla de oro**: las excepciones son para situaciones **excepcionales** — algo que el método **no puede cumplir** según su contrato. No para control de flujo normal ("el usuario no existe" en un login suele ser un caso esperado, no excepcional).

---

## 2. La jerarquía de excepciones

Todas las excepciones heredan de `System.Exception` (herencia, Sesión 5).

```
System.Object
└── System.Exception
    ├── System.SystemException           ← lanzadas por el runtime/BCL
    │   ├── NullReferenceException
    │   ├── IndexOutOfRangeException
    │   ├── InvalidCastException
    │   ├── InvalidOperationException
    │   │   └── ObjectDisposedException
    │   ├── ArgumentException
    │   │   ├── ArgumentNullException
    │   │   └── ArgumentOutOfRangeException
    │   ├── ArithmeticException
    │   │   ├── DivideByZeroException
    │   │   └── OverflowException
    │   ├── FormatException
    │   ├── IO.IOException
    │   │   └── FileNotFoundException
    │   ├── OutOfMemoryException          ← (casi) imposible de recuperar
    │   ├── StackOverflowException        ← NO se puede capturar
    │   └── OperationCanceledException
    │       └── TaskCanceledException      (Sesión 13)
    ├── System.ApplicationException        ← histórico, NO heredes de aquí
    └── System.AggregateException          ← agrupa varias (Sesión 13)
```

Propiedades importantes de `Exception`:

| Propiedad | Para qué sirve |
|---|---|
| `Message` | Descripción legible del error |
| `StackTrace` | Dónde ocurrió (se llena cuando se **lanza**, no cuando se crea) |
| `InnerException` | La excepción original que causó esta (encadenamiento) |
| `Data` | `IDictionary` para adjuntar contexto extra |
| `HResult` | Código numérico (interop COM/Win32) |
| `Source`, `TargetSite` | Assembly y método donde se originó |

> ⚠️ **`ApplicationException`**: la guía original de .NET decía heredar de ella para excepciones propias. Microsoft retractó ese consejo: **hereda directamente de `Exception`** (o de una específica como `InvalidOperationException`).

---

## 3. `try`, `catch`, `finally`

```csharp
static int LeerNumero(string ruta)
{
    StreamReader? lector = null;
    try
    {
        // Camino feliz: código que puede fallar
        lector = new StreamReader(ruta);
        string linea = lector.ReadLine() ?? throw new InvalidDataException("Archivo vacío");
        return int.Parse(linea);                  // puede lanzar FormatException
    }
    catch (FileNotFoundException ex)              // 1° el MÁS específico
    {
        Console.WriteLine($"No existe: {ex.FileName}");
        return -1;
    }
    catch (FormatException)                       // no necesito la variable → la omito
    {
        Console.WriteLine("El contenido no es un número");
        return -1;
    }
    // catch (Exception) al final solo si REALMENTE puedes hacer algo útil
    finally
    {
        // SIEMPRE se ejecuta: haya excepción, return o nada
        lector?.Dispose();
        Console.WriteLine("finally ejecutado");
    }
}
```

Reglas clave:
- Los `catch` se evalúan **en orden**, de arriba a abajo; entra en el **primero** compatible. Por eso van de **específico → general**. El compilador da error (CS0160) si pones `catch (Exception)` antes de uno más específico.
- `finally` se ejecuta **incluso si hay `return`** dentro del `try` o del `catch`.
- No puedes hacer `return` desde un `finally` (CS0157).

### 3.1 ¿Cuándo NO se ejecuta `finally`?

| Caso | ¿Corre `finally`? |
|---|---|
| Excepción capturada | ✅ |
| `return` en el `try` | ✅ |
| Excepción **no** capturada por nadie | ⚠️ Depende: el runtime puede terminar el proceso sin desenrollar |
| `Environment.FailFast(...)` | ❌ |
| `StackOverflowException` | ❌ (el proceso muere) |
| Matar el proceso (`kill -9`, corte de luz) | ❌ |

> ❓ **Entrevista**: *"¿`finally` se ejecuta siempre?"* → Casi siempre: con excepción capturada, con `return`, con `break`. **No** con `Environment.FailFast`, stack overflow, o terminación abrupta del proceso. Por eso no confíes en `finally` para invariantes críticas de negocio que deben sobrevivir un crash (usa transacciones).

### 3.2 `using` es un `try/finally` disfrazado

```csharp
using (var lector = new StreamReader("datos.txt"))
{
    Console.WriteLine(lector.ReadToEnd());
}

// El compilador lo transforma aproximadamente en:
var lector2 = new StreamReader("datos.txt");
try
{
    Console.WriteLine(lector2.ReadToEnd());
}
finally
{
    lector2?.Dispose();
}

// C# 8+: using declaration (se libera al salir del scope)
using var archivo = File.OpenRead("datos.txt");
```

El patrón `IDisposable` lo profundizamos en la **Sesión 14**.

---

## 4. Cómo viaja una excepción (stack unwinding)

```
Main()
 └─ ProcesarPedido()          ← tiene catch (InvalidOperationException)
     └─ CalcularTotal()       ← sin try
         └─ ObtenerPrecio()   ← throw new InvalidOperationException()

1. ObtenerPrecio lanza           → el CLR busca handler en ObtenerPrecio: no hay
2. Sube a CalcularTotal          → no hay handler: sus finally se ejecutan, se abandona
3. Sube a ProcesarPedido         → ¡catch compatible! se ejecuta el catch
4. El flujo continúa DESPUÉS del try/catch de ProcesarPedido
```

El CLR hace esto en **dos pasadas**:
1. **Búsqueda**: recorre la pila hacia arriba buscando un `catch` compatible (y evalúa los filtros `when` — sección 6).
2. **Desenrollado (unwind)**: vuelve a recorrer ejecutando los `finally` de cada frame abandonado hasta llegar al handler.

Esta distinción importa para los filtros: un `when` se evalúa **antes** de que se ejecute cualquier `finally` intermedio, con la pila todavía intacta.

---

## 5. `throw` vs `throw ex` vs `throw new ...(ex)`

Esta es **la** pregunta clásica de entrevista.

```csharp
try
{
    ObtenerPrecio();
}
catch (Exception ex)
{
    Log(ex);

    throw;            // ✅ Re-lanza la MISMA excepción conservando el stack trace original
    // throw ex;      // ❌ Re-lanza, pero RESETEA el stack trace a esta línea → pierdes el origen
    // throw new ServicioException("Fallo al obtener precio", ex);
    //                // ✅ Envuelve: nueva excepción con más contexto, la original en InnerException
}
```

| Forma | Stack trace | Cuándo usarla |
|---|---|---|
| `throw;` | Se conserva | Registraste/limpiaste algo y quieres que siga subiendo |
| `throw ex;` | **Se pierde** (empieza en esta línea) | Prácticamente nunca. El analizador CA2200 lo marca |
| `throw new X("...", ex);` | El original queda en `InnerException` | Traducir a una excepción de tu capa/dominio con más contexto |

### 5.1 `ExceptionDispatchInfo`: re-lanzar fuera del `catch`

A veces capturas una excepción y quieres relanzarla **más tarde** (otro método, otro hilo) sin perder su stack trace. `throw;` solo funciona dentro del `catch`.

```csharp
using System.Runtime.ExceptionServices;

ExceptionDispatchInfo? capturada = null;
try
{
    int.Parse("abc");
}
catch (FormatException ex)
{
    capturada = ExceptionDispatchInfo.Capture(ex);   // guarda excepción + stack trace
}

// ... más tarde ...
capturada?.Throw();   // relanza preservando el trace original (+ marca "rethrown")
```

Así es exactamente como `await` relanza la excepción de una `Task` fallida (Sesión 13).

---

## 6. Filtros de excepción (`when`)

Desde C# 6 puedes condicionar un `catch`:

```csharp
try
{
    await cliente.GetStringAsync(url);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    Console.WriteLine("Recurso no encontrado");
}
catch (HttpRequestException ex) when (ex.StatusCode >= HttpStatusCode.InternalServerError)
{
    Console.WriteLine("Error del servidor, reintentando...");
}
```

¿Por qué es mejor que un `if` dentro del `catch` + `throw;`?
1. **No desenrolla la pila** si el filtro da `false`: la excepción sigue buscando handler como si ese `catch` no existiera. En un crash dump verás el estado **original** de la pila.
2. Código más declarativo.

### 6.1 Truco senior: loguear sin capturar

```csharp
try
{
    ProcesarPedido();
}
catch (Exception ex) when (LogYDevolverFalse(ex))
{
    // nunca entra aquí
}

static bool LogYDevolverFalse(Exception ex)
{
    Console.WriteLine($"[LOG] {ex.GetType().Name}: {ex.Message}");
    return false;   // → la excepción sigue subiendo intacta, sin unwind
}
```

> ⚠️ Un filtro que **lanza** una excepción se trata como `false` (la excepción del filtro se traga silenciosamente). Mantén los filtros simples y sin efectos secundarios riesgosos.

> ❓ **Entrevista**: *"¿Qué ventaja tiene `catch ... when` sobre un `if` dentro del catch?"* → El filtro se evalúa en la **primera pasada** (antes del unwind); si es falso, la pila no se desenrolla y no se ejecutan `finally` intermedios. Preserva el contexto para depuración y evita el costo de capturar y relanzar.

---

## 7. Lanzar excepciones correctamente

### 7.1 Guard clauses con los helpers de .NET 6/7/8

```csharp
public sealed class CuentaBancaria
{
    public decimal Saldo { get; private set; }
    public string Titular { get; }

    public CuentaBancaria(string titular, decimal saldoInicial)
    {
        // .NET 6+: lanza ArgumentNullException con el nombre del parámetro automáticamente
        ArgumentNullException.ThrowIfNull(titular);
        // .NET 8: null, "" o solo espacios → ArgumentException
        ArgumentException.ThrowIfNullOrWhiteSpace(titular);
        // .NET 8: helpers de rango
        ArgumentOutOfRangeException.ThrowIfNegative(saldoInicial);

        Titular = titular;
        Saldo = saldoInicial;
    }

    public void Retirar(decimal monto)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(monto);

        // Argumentos válidos, pero el ESTADO del objeto no permite la operación
        if (monto > Saldo)
            throw new InvalidOperationException(
                $"Saldo insuficiente: saldo {Saldo}, solicitado {monto}");

        Saldo -= monto;
    }
}
```

¿Cómo saben el nombre del parámetro? Usan `[CallerArgumentExpression]` (C# 10), que captura el **texto** de la expresión pasada. Attributes en la Sesión 20.

### 7.2 ¿Qué excepción lanzar?

| Situación | Excepción |
|---|---|
| Argumento `null` que no debería serlo | `ArgumentNullException` |
| Argumento fuera de rango permitido | `ArgumentOutOfRangeException` |
| Argumento inválido por otra razón | `ArgumentException` |
| El objeto no está en un estado que permita la operación | `InvalidOperationException` |
| Usaron el objeto tras `Dispose()` | `ObjectDisposedException` (`ObjectDisposedException.ThrowIf(_disposed, this)` en .NET 7+) |
| Operación no soportada por diseño (ej. colección read-only) | `NotSupportedException` |
| Método aún no implementado | `NotImplementedException` (nunca en producción) |
| Timeout | `TimeoutException` |
| Cancelación cooperativa | `OperationCanceledException` (Sesión 13) |

> ⚠️ **Nunca lances** `Exception`, `SystemException`, `NullReferenceException`, `IndexOutOfRangeException` ni `StackOverflowException` a mano. Las primeras dos son demasiado genéricas (obligan al llamador a capturar todo); las otras están reservadas para el runtime.

### 7.3 `throw` como expresión (C# 7)

```csharp
public string Nombre
{
    get => _nombre;
    set => _nombre = value ?? throw new ArgumentNullException(nameof(value));
}

string modo = args.Length > 0 ? args[0] : throw new ArgumentException("Falta el modo");
```

---

## 8. Excepciones personalizadas

Crea una propia cuando el llamador necesite **distinguirla** para reaccionar distinto, o cuando quieras transportar datos de dominio.

```csharp
// Convención: el nombre termina en "Exception"
public class SaldoInsuficienteException : InvalidOperationException
{
    public decimal SaldoActual { get; }
    public decimal MontoSolicitado { get; }

    // Los tres constructores estándar (recomendados por las guías de diseño)
    public SaldoInsuficienteException() { }

    public SaldoInsuficienteException(string message) : base(message) { }

    public SaldoInsuficienteException(string message, Exception inner) : base(message, inner) { }

    // Constructor de dominio con datos útiles
    public SaldoInsuficienteException(decimal saldoActual, decimal montoSolicitado)
        : base($"Saldo insuficiente: saldo {saldoActual}, solicitado {montoSolicitado}")
    {
        SaldoActual = saldoActual;
        MontoSolicitado = montoSolicitado;
    }
}

// Uso
try
{
    throw new SaldoInsuficienteException(100m, 250m);
}
catch (SaldoInsuficienteException ex)
{
    Console.WriteLine($"Faltan {ex.MontoSolicitado - ex.SaldoActual:C}");
}
```

> ⚠️ **Serialización binaria**: en código antiguo verás `[Serializable]` y un constructor `protected (SerializationInfo, StreamingContext)`. En .NET 8 ese constructor está **obsoleto** (SYSLIB0051) porque `BinaryFormatter` fue deprecado por inseguro. En código nuevo **no lo agregues**.

**Jerarquía de dominio**: en apps grandes es común una base `DomainException` de la que heredan `NotFoundException`, `ConflictException`, etc. Un middleware global (sección 11) traduce cada una a un código HTTP (404, 409…). Lo conectamos con la Sesión 26 (arquitectura).

---

## 9. El costo de las excepciones

Lanzar una excepción es **caro**. ¿Por qué?
- Se crea un objeto en el heap (Sesión 14).
- Se **captura el stack trace** (recorrer la pila y resolver metadata).
- Dos pasadas por la pila (búsqueda + unwind), ejecutando `finally`s.

Órdenes de magnitud (orientativos): un `return` normal cuesta nanosegundos; un `throw/catch` cuesta **microsegundos** — del orden de **1.000× o más**. .NET 9 mejoró bastante esto con un nuevo modelo de manejo de excepciones, pero sigue siendo mucho más caro que un `if`.

> Un bloque `try` **sin** excepción es prácticamente gratis. Lo caro es **lanzar**.

```csharp
// ❌ Excepciones como control de flujo (lento si falla seguido)
int ParsearLento(string s)
{
    try { return int.Parse(s); }
    catch (FormatException) { return 0; }
}

// ✅ Try-pattern: sin excepción en el camino "normal" de fallo
int ParsearRapido(string s) => int.TryParse(s, out int n) ? n : 0;
```

Mide estas cosas con BenchmarkDotNet (Sesión 30).

---

## 10. Alternativas: Try-pattern y Result pattern

### 10.1 Try-pattern (el de la BCL)

Convención: `bool TryX(..., out T resultado)`. Devuelve `false` en el fallo **esperado**, y aún puede lanzar en errores verdaderamente excepcionales (ej. argumento null).

```csharp
public bool TryRetirar(decimal monto, out string? error)
{
    if (monto > Saldo)
    {
        error = "Saldo insuficiente";
        return false;
    }
    Saldo -= monto;
    error = null;
    return true;
}
```

Ejemplos en la BCL: `int.TryParse`, `Dictionary.TryGetValue`, `ConcurrentQueue.TryDequeue`. (`out` en la Sesión 4.)

### 10.2 Result pattern

Muy usado en arquitecturas limpias (Sesión 26). Hace el error **explícito en el tipo de retorno**:

```csharp
public readonly record struct Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsSuccess => Error is null;

    private Result(T? value, string? error) => (Value, Error) = (value, error);

    public static Result<T> Ok(T value) => new(value, null);
    public static Result<T> Fail(string error) => new(default, error);
}

public static Result<decimal> CalcularDescuento(decimal total, string cupon) =>
    cupon switch
    {
        "PROMO10" => Result<decimal>.Ok(total * 0.10m),
        ""        => Result<decimal>.Fail("Cupón vacío"),
        _         => Result<decimal>.Fail($"Cupón '{cupon}' inválido")
    };

var r = CalcularDescuento(1000m, "XYZ");
Console.WriteLine(r.IsSuccess ? $"Descuento: {r.Value}" : $"Error: {r.Error}");
```

(Records en la Sesión 17, `switch` expressions en la Sesión 16.) Librerías populares: `FluentResults`, `ErrorOr`, `OneOf`.

| Criterio | Excepción | Try-pattern | Result |
|---|---|---|---|
| Fallo es raro/inesperado | ✅ | — | — |
| Fallo es frecuente/esperado | ❌ caro | ✅ | ✅ |
| Transporta detalle del error | ✅ | Poco | ✅ |
| Obliga a manejar el error | Sí (o crash) | No | Parcialmente |
| Visible en la firma | No | Sí | Sí |

> ❓ **Entrevista**: *"¿Excepciones o Result pattern?"* → Excepciones para violaciones de contrato e infraestructura (BD caída, bug, argumento nulo). Result/Try para fallos **esperados de negocio** (validación, cupón inválido) — son más baratos y explícitos. Lo importante es ser **consistente** dentro de la capa.

---

## 11. Excepciones no controladas y manejo global

Si una excepción llega al tope de la pila de un hilo sin handler, el proceso **termina**. Puedes observarlo (no evitarlo) con:

```csharp
AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
{
    var ex = (Exception)e.ExceptionObject;
    Console.Error.WriteLine($"FATAL: {ex}");   // último recurso: loguear
    // e.IsTerminating == true → el proceso va a morir igual
};

// Tareas fallidas cuya excepción nadie observó (Sesión 13)
TaskScheduler.UnobservedTaskException += (s, e) =>
{
    Console.Error.WriteLine($"Task no observada: {e.Exception}");
    e.SetObserved();
};
```

### 11.1 En ASP.NET Core (.NET 8): `IExceptionHandler`

No pongas `try/catch` en cada controller. Centraliza (Sesión 23):

```csharp
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        logger.LogError(ex, "Error no controlado");

        var (status, titulo) = ex switch
        {
            SaldoInsuficienteException => (StatusCodes.Status409Conflict, "Saldo insuficiente"),
            ArgumentException          => (StatusCodes.Status400BadRequest, "Solicitud inválida"),
            _                          => (StatusCodes.Status500InternalServerError, "Error interno")
        };

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails   // RFC 7807 / 9457
        {
            Status = status,
            Title = titulo
            // ⚠️ NO expongas ex.Message ni el StackTrace al cliente en producción
        }, ct);

        return true;   // true = manejada; false = pasa al siguiente handler
    }
}

// Program.cs
// builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
// builder.Services.AddProblemDetails();
// app.UseExceptionHandler();
```

(Primary constructors en la Sesión 18; `ILogger` y DI en la Sesión 24.) Exponer stack traces al cliente es una fuga de información (OWASP, Sesión 28).

---

## 12. Casos especiales que debes conocer

### 12.1 `checked` / `unchecked` y overflow
Por defecto la aritmética entera **no** verifica overflow (da la vuelta silenciosamente):

```csharp
int max = int.MaxValue;
int a = unchecked(max + 1);     // -2147483648, sin error
int b = checked(max + 1);       // OverflowException en runtime
// Se puede activar globalmente: <CheckForOverflowUnderflow>true</CheckForOverflowUnderflow>
```

### 12.2 Excepciones en constructores estáticos
Si un constructor estático lanza, el tipo queda **inutilizable** para siempre en ese proceso: cada acceso lanza `TypeInitializationException` (con la original en `InnerException`).

### 12.3 Excepciones que no puedes (o no debes) capturar
- `StackOverflowException`: no se puede capturar desde .NET 2.0; el proceso muere. Causa típica: recursión infinita (Sesión 4).
- `OutOfMemoryException`: capturarla rara vez sirve; el estado puede estar corrupto.
- `AccessViolationException`: corrupción de memoria (unsafe/interop, Sesión 19); no se entrega a `catch` normales.

### 12.4 Excepciones en `Dispose` y `finally`
Si el `finally` lanza mientras ya había una excepción en vuelo, **la original se pierde** (reemplazada por la nueva). Por eso `Dispose()` **no debería lanzar** nunca.

```csharp
try
{
    throw new InvalidOperationException("original");
}
finally
{
    throw new IOException("del finally");   // ← esta es la que sube; "original" desaparece
}
```

### 12.5 `AggregateException`
Agrupa varias excepciones (típico en `Task.WaitAll`, `Parallel.ForEach`, `.Result`). Se inspecciona con `.InnerExceptions` o `.Flatten()`. `await` la "desenvuelve" y relanza solo la primera. Detalle en la Sesión 13.

---

## 13. Buenas prácticas (checklist senior)

```
✅ Captura solo lo que puedes MANEJAR (recuperar, reintentar, traducir, loguear en el borde)
✅ De lo específico a lo general
✅ throw;  para re-lanzar (jamás throw ex;)
✅ Envuelve con InnerException al cruzar capas
✅ Mensajes con contexto (ids, valores), sin datos sensibles
✅ Manejo global en el borde de la app (middleware, Main)
✅ Try-pattern / Result para fallos frecuentes y esperados
✅ Libera recursos con using (no con catch)

❌ catch (Exception) { }                      → "tragar" errores: el peor pecado
❌ Excepciones para control de flujo
❌ Loguear y relanzar en CADA capa             → el mismo error aparece 5 veces en logs
❌ Lanzar Exception genérica
❌ Lanzar desde Dispose / finally
```

> ⚠️ **Tragar excepciones** (`catch { }` vacío) es la causa #1 de bugs "imposibles" en producción: el sistema sigue funcionando con datos inconsistentes y no queda rastro. Si de verdad debes ignorar algo, captura el tipo **exacto** y deja un comentario explicando por qué.

> ❓ **Entrevista**: *"¿Dónde deberías loguear una excepción?"* → Una sola vez, idealmente en el **borde** donde se maneja (middleware global, handler del mensaje). Las capas intermedias o dejan pasar la excepción, o la envuelven con contexto — pero no loguean cada una.

---

## Resumen mental de la sesión

```
Exception  → objeto que interrumpe el flujo y desenrolla la pila
             buscando un catch compatible; si no hay → el proceso muere

try      → código que puede fallar
catch    → de ESPECÍFICO a GENERAL; solo si puedes hacer algo útil
finally  → siempre (salvo FailFast / StackOverflow / kill)
using    → try/finally + Dispose()

throw;            conserva stack trace        ✅
throw ex;         lo resetea                  ❌
throw new X(m,ex) envuelve con InnerException ✅
ExceptionDispatchInfo → relanzar después preservando el trace (lo usa await)

catch (X) when (cond) → filtro en la 1ª pasada, sin unwind si es false

Lanzar es CARO (stack trace + 2 pasadas) · try sin throw es ~gratis
Fallo esperado → TryX(out) o Result<T>
Fallo inesperado / contrato roto → excepción
Guard clauses: ArgumentNullException.ThrowIfNull, ThrowIfNegative...
Manejo global: IExceptionHandler + ProblemDetails (sin filtrar stack traces)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Diferencia entre `throw`, `throw ex` y `throw new X("...", ex)`?
2. ❓ ¿En qué orden se evalúan los `catch` y por qué importa?
3. ❓ ¿`finally` se ejecuta siempre? Da tres casos en que no.
4. ❓ ¿Qué ventaja tiene un filtro `when` frente a un `if` + `throw;` dentro del catch?
5. ❓ ¿Por qué lanzar excepciones es costoso? ¿Un `try` sin excepción cuesta?
6. ❓ ¿Cuándo usarías el Try-pattern o un Result en lugar de excepciones?
7. ❓ ¿Qué excepción lanzas si el argumento es válido pero el objeto no está en el estado correcto?
8. ❓ ¿Cuándo tiene sentido crear una excepción personalizada? ¿De qué clase heredas?
9. ❓ ¿Qué pasa si un `finally` lanza una excepción mientras otra estaba en vuelo?
10. ❓ ¿Qué es `AggregateException` y cuándo aparece?
11. ❓ ¿Cómo centralizas el manejo de excepciones en una API ASP.NET Core?
12. ❓ ¿Para qué sirve `ExceptionDispatchInfo`?

## Ejercicio práctico
1. Crea un proyecto: `dotnet new console -o Excepciones && cd Excepciones`.
2. Implementa `CuentaBancaria` (sección 7.1) con guard clauses y una `SaldoInsuficienteException` propia con `SaldoActual` y `MontoSolicitado`.
3. Escribe tres métodos anidados `A() → B() → C()` donde `C` lanza. En `B` prueba primero `throw;` y luego `throw ex;`. Imprime `ex.StackTrace` en `A` y **compara**: ¿desaparece `C` del trace?
4. Agrega un `catch (Exception ex) when (Log(ex))` que devuelva `false` y verifica que la excepción sigue subiendo.
5. Crea un `Result<T>` y reescribe `Retirar` como `Result<decimal> TryRetirar(decimal monto)`.
6. (Opcional) Mide con un `Stopwatch` 100.000 llamadas a `int.Parse` en un `try/catch` con input inválido vs `int.TryParse`. Anota la diferencia.

---

➡️ **Cuando termines**, marca la Sesión 12 en el [README](Readme.md) y pídeme la **Sesión 13 — Async / await y concurrencia**.
