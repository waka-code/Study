# Sesión 19 — Span<T>, Memory<T> y código unsafe: trabajar con memoria sin copiar

> **Objetivo de la sesión**: entender *por qué* existen `Span<T>`, `ReadOnlySpan<T>` y `Memory<T>`, qué problema resuelven (copias y asignaciones innecesarias en el heap), por qué `Span<T>` es un `ref struct` y qué restricciones implica, cuándo usar `Memory<T>` en su lugar (async), cómo se relacionan con `stackalloc`, `ArrayPool<T>` y el código `unsafe` con punteros. Al terminar deberías poder reescribir un parser con `string.Substring` a uno "zero-allocation" y explicar en una entrevista la diferencia entre `Span<T>` y `Memory<T>`.

---

## 1. El problema: copias y basura en el heap

Recuerda de la **Sesión 2** que los arrays y strings viven en el **heap**, y de la **Sesión 14** que todo lo que asignas en el heap tarde o temprano lo tiene que recolectar el **GC**. Mira este código típico:

```csharp
// Parsear "2026-09-25" en año, mes, día
string fecha = "2026-09-25";

int anio = int.Parse(fecha.Substring(0, 4));   // Substring → NUEVO string en el heap
int mes  = int.Parse(fecha.Substring(5, 2));   // otro string más
int dia  = int.Parse(fecha.Substring(8, 2));   // y otro más
```

Cada `Substring` **copia** caracteres a un string nuevo. Para una llamada da igual. Para un servidor que parsea **millones** de líneas por segundo (logs, CSV, HTTP headers), eso son millones de objetos de vida cortísima → presión sobre el GC → pausas → latencia.

La idea que queremos es: *"no me des una copia, dame una **ventana** (vista) sobre la memoria que ya existe"*.

```
string fecha:   [ 2 | 0 | 2 | 6 | - | 0 | 9 | - | 2 | 5 ]
                  ▲───────────▲       ▲───▲       ▲───▲
                  Span(0,4)           Span(5,2)   Span(8,2)
                  (sin copiar: solo puntero + longitud)
```

Eso es exactamente `Span<T>`.

---

## 2. ¿Qué es `Span<T>`?

`Span<T>` (desde .NET Core 2.1 / C# 7.2) es una **vista tipada y segura sobre una región contigua de memoria**. Internamente es solo dos cosas:

```
Span<T>  ≈  { ref T _reference;  int _length; }
             └─ "puntero administrado" al primer elemento
```

Esa región de memoria puede venir de **tres** orígenes distintos, y `Span<T>` los unifica con una sola API:

| Origen | Ejemplo |
|---|---|
| **Heap administrado** (array) | `new int[100].AsSpan()` |
| **Stack** | `Span<byte> buf = stackalloc byte[256];` |
| **Memoria nativa (unmanaged)** | `new Span<byte>(ptr, length)` sobre `NativeMemory.Alloc` |

```csharp
int[] numeros = { 1, 2, 3, 4, 5, 6, 7, 8 };

Span<int> todo   = numeros;                 // conversión implícita desde array
Span<int> medio  = numeros.AsSpan(2, 4);    // vista de [3,4,5,6] — NO copia
Span<int> cola   = todo[5..];               // ranges (Sesión 18) → [6,7,8]

medio[0] = 99;                              // escribe en el array ORIGINAL
Console.WriteLine(numeros[2]);              // 99  ← misma memoria

// Operaciones útiles ya incluidas
medio.Fill(0);                              // pone ceros en esa ventana
medio.Reverse();
bool contiene = todo.Contains(7);
int idx       = todo.IndexOf(8);
todo.Sort();                                // MemoryExtensions.Sort (desde .NET 5)
```

> ⚠️ `Span<T>` **no es dueño** de la memoria. Es una vista. Si modificas el span, modificas la fuente. Si la fuente deja de existir (ej: memoria del stack de un método que ya retornó), el span sería inválido — y por eso el compilador te impide que eso ocurra (sección 3).

### 2.1 `ReadOnlySpan<T>` y los strings

Los `string` son **inmutables**, así que no pueden darte un `Span<char>` (podrías modificarlos). Te dan un `ReadOnlySpan<char>`:

```csharp
string fecha = "2026-09-25";
ReadOnlySpan<char> s = fecha.AsSpan();

// int.Parse, double.Parse, DateTime.Parse... tienen sobrecargas con ReadOnlySpan<char>
int anio = int.Parse(s[..4]);      // cero asignaciones
int mes  = int.Parse(s[5..7]);
int dia  = int.Parse(s[8..]);

Console.WriteLine($"{anio}/{mes}/{dia}");   // 2026/9/25
```

Mismo resultado que la versión con `Substring`, **cero strings nuevos**. Los literales también: `ReadOnlySpan<char> x = "hola";` y, desde C# 11, `ReadOnlySpan<byte> utf8 = "hola"u8;` (literal UTF-8 embebido en el binario, sin asignación).

> ❓ **Entrevista**: *"¿Por qué `string.AsSpan()` devuelve `ReadOnlySpan<char>` y no `Span<char>`?"* → Porque los strings son inmutables e incluso pueden estar *interned* (compartidos). Un `Span<char>` permitiría mutarlos y romper esa garantía.

---

## 3. `ref struct`: por qué `Span<T>` tiene restricciones

`Span<T>` está declarado como `public readonly ref struct Span<T>`. La palabra `ref struct` significa: **este tipo SOLO puede vivir en el stack**. Nunca en el heap.

¿Por qué? Porque puede apuntar a memoria del stack (`stackalloc`). Si un `Span` que apunta al stack se guardara en el heap (en un campo de una clase, en un closure, boxeado…), podría sobrevivir al método que creó esa memoria → puntero colgante (*dangling pointer*) → corrupción. El compilador lo prohíbe por construcción.

Consecuencias (las **restricciones** que siempre preguntan):

| ❌ No puedes… | Por qué |
|---|---|
| Ser campo de una `class` o de un `struct` normal | Viviría en el heap |
| Boxearlo (`object o = span;`) ni castear a interfaz | Boxing = copia al heap |
| Usarlo como argumento genérico (`List<Span<int>>`) antes de C# 13 | El genérico podría guardarlo en el heap |
| Capturarlo en una lambda o función local capturadora | El closure es una clase en el heap (Sesión 10) |
| Usarlo a través de un `await` en métodos `async` | La state machine guarda locals en el heap (Sesión 13) |
| Usarlo a través de un `yield return` en iteradores | Igual: el iterador es una clase |

```csharp
class Cache
{
    // private Span<byte> _buffer;     // ❌ CS8345: Field or auto-implemented property cannot be of type 'Span<byte>'
}

async Task ProcesarAsync(byte[] data)
{
    Span<byte> s = data;               // ✅ se puede declarar...
    s[0] = 1;
    await Task.Delay(10);
    // s[1] = 2;                       // ❌ CS4007: no puede preservarse a través del await
}
```

Sí puedes declarar **tus propios** `ref struct` que contengan spans (desde C# 11 incluso campos `ref`):

```csharp
// Un "lector" zero-allocation que avanza sobre texto
ref struct Tokenizer
{
    private ReadOnlySpan<char> _resto;
    public Tokenizer(ReadOnlySpan<char> texto) => _resto = texto;

    public bool TrySiguiente(char sep, out ReadOnlySpan<char> token)
    {
        if (_resto.IsEmpty) { token = default; return false; }
        int i = _resto.IndexOf(sep);
        if (i < 0) { token = _resto; _resto = default; return true; }
        token = _resto[..i];
        _resto = _resto[(i + 1)..];
        return true;
    }
}
```

> 💡 **C# 13 / .NET 9**: aparece el anti-constraint `allows ref struct`, que permite que un genérico acepte `ref struct` (`where T : allows ref struct`). Y los métodos `async`/iteradores pueden *declarar* locales `ref struct` siempre que no crucen un `await`/`yield`. Lo retomamos en la **Sesión 32**.

> ❓ **Entrevista**: *"¿Por qué no puedo usar `Span<T>` en un método async?"* → Porque es un `ref struct` (solo stack) y el compilador convierte el método async en una state machine cuyos locales viven en el heap cuando se suspende. Solución: usar `Memory<T>`.

---

## 4. `stackalloc`: buffers en el stack sin GC

`stackalloc` reserva memoria en el **stack** del hilo actual. Se libera sola al salir del método: cero GC. Antes de `Span<T>` requería `unsafe` y punteros; hoy es seguro si lo asignas a un `Span<T>`:

```csharp
static string ToHex(ReadOnlySpan<byte> bytes)
{
    // Umbral: buffers pequeños en stack, grandes en heap (patrón estándar)
    const int MaxStack = 256;
    Span<char> buffer = bytes.Length * 2 <= MaxStack
        ? stackalloc char[MaxStack]
        : new char[bytes.Length * 2];

    buffer = buffer[..(bytes.Length * 2)];
    for (int i = 0; i < bytes.Length; i++)
    {
        bytes[i].TryFormat(buffer.Slice(i * 2, 2), out _, "x2");   // escribe en el buffer, sin strings intermedios
    }
    return new string(buffer);    // la ÚNICA asignación: el string final
}

Console.WriteLine(ToHex(new byte[] { 0xDE, 0xAD, 0xBE, 0xEF }));   // deadbeef
```

> ⚠️ **Stack overflow**: el stack de un hilo es pequeño (~1 MB en Windows, ~8 MB en Linux main thread, menos en hilos secundarios). `stackalloc` con tamaño **controlado por el usuario** es una vulnerabilidad (DoS). Regla: tamaño **acotado** (ej. ≤ 256–1024 bytes) y fallback a heap o `ArrayPool`. Nunca `stackalloc` dentro de un loop (no se libera hasta salir del método).

> ⚠️ La memoria de `stackalloc` **no se inicializa necesariamente a cero** si el método tiene `[SkipLocalsInit]`. Por defecto sí se inicializa.

---

## 5. `Memory<T>`: el hermano que sí puede vivir en el heap

¿Y si necesitas una "ventana" que cruce un `await`, o guardarla en un campo? Para eso existe `Memory<T>` / `ReadOnlyMemory<T>`: un **`struct` normal** (no `ref struct`) que representa la misma idea pero guardando una referencia al *objeto* dueño (array, string o `MemoryManager<T>`) + offset + longitud.

```csharp
async Task<int> ContarLineasAsync(Stream stream)
{
    byte[] arr = new byte[4096];
    Memory<byte> buffer = arr;             // ✅ Memory puede cruzar await
    int lineas = 0, leidos;

    while ((leidos = await stream.ReadAsync(buffer)) > 0)   // Stream.ReadAsync(Memory<byte>)
    {
        // Para PROCESAR, bajas a Span (rápido) en código síncrono:
        lineas += buffer.Span[..leidos].Count((byte)'\n');
    }
    return lineas;
}
```

Patrón mental: **`Memory<T>` para almacenar y transportar; `.Span` para trabajar**.

| | `Span<T>` | `Memory<T>` |
|---|---|---|
| Tipo | `ref struct` (solo stack) | `struct` normal |
| Puede ser campo de clase | ❌ | ✅ |
| Cruza `await` / `yield` | ❌ | ✅ |
| Apunta a `stackalloc` | ✅ | ❌ (solo heap o `MemoryManager`) |
| Apunta a memoria nativa | ✅ directo | Vía `MemoryManager<T>` |
| Rendimiento de acceso | Máximo (indexación directa) | Ligeramente menor; usa `.Span` |
| Uso típico | Parsing, algoritmos síncronos, hot paths | APIs async (Streams, Pipelines, sockets) |

> ❓ **Entrevista**: *"¿Span vs Memory?"* → Ambos son vistas sin copia sobre memoria contigua. `Span` es `ref struct`: más rápido, puede apuntar al stack, pero no sale del stack (ni async ni campos). `Memory` es un struct normal que puede almacenarse y cruzar awaits; obtienes un `Span` con `.Span` para procesarlo.

### 5.1 Guía para diseñar APIs

```
¿El método es síncrono y no guarda el buffer?     → acepta Span<T> / ReadOnlySpan<T>
¿El método es async o guarda el buffer?           → acepta Memory<T> / ReadOnlyMemory<T>
¿Solo lees?                                       → prefiere las versiones ReadOnly*
¿Necesitas liberar/devolver la memoria?           → IMemoryOwner<T> (ownership explícito)
```

---

## 6. `ArrayPool<T>`: reutilizar arrays en lugar de crearlos

`stackalloc` sirve para buffers pequeños. Para buffers grandes (KBs–MBs) que se crean constantemente, la solución es **alquilarlos** de un pool y devolverlos:

```csharp
using System.Buffers;

static int ProcesarArchivo(Stream s)
{
    byte[] buffer = ArrayPool<byte>.Shared.Rent(64 * 1024);   // puede devolver uno MÁS GRANDE
    try
    {
        int leidos = s.Read(buffer, 0, 64 * 1024);
        Span<byte> datos = buffer.AsSpan(0, leidos);           // trabaja solo con lo leído
        return datos.Count((byte)0);
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer, clearArray: false);   // SIEMPRE devolver (finally)
    }
}
```

> ⚠️ Errores clásicos con `ArrayPool`:
> 1. **Asumir que `Rent(n)` devuelve exactamente `n`** → devuelve *al menos* `n` (potencia de 2). Usa tu propia longitud.
> 2. **No devolverlo** → no es fuga de memoria (el GC lo recoge), pero pierdes el beneficio.
> 3. **Usarlo después de `Return`** → otro código ya puede estar escribiendo en él. Bug silencioso gravísimo.
> 4. **Devolverlo dos veces** → dos consumidores compartirán el mismo array.
> 5. Datos sensibles (contraseñas, tokens) → `Return(buffer, clearArray: true)`.

Lo profundizamos junto con `ObjectPool` y benchmarking en la **Sesión 30**.

---

## 7. APIs modernas basadas en Span (lo que ya usas sin saberlo)

Desde .NET Core 2.1, el BCL se reescribió internamente sobre spans. Muchas APIs tienen versiones "Try…" que escriben en un `Span` de destino en vez de crear objetos:

```csharp
// Formatear sin crear strings intermedios
Span<char> dest = stackalloc char[32];
if (DateTime.Now.TryFormat(dest, out int escritos, "yyyy-MM-dd"))
    Console.WriteLine(dest[..escritos].ToString());

// Parsear números desde bytes UTF-8 (.NET 8: IUtf8SpanParsable)
ReadOnlySpan<byte> utf8 = "12345"u8;
int n = int.Parse(utf8);

// Split sin asignar arrays (.NET 8: MemoryExtensions.Split con rangos)
ReadOnlySpan<char> csv = "ana,30,santiago";
Span<Range> partes = stackalloc Range[3];
int cuantos = csv.Split(partes, ',');
foreach (Range r in partes[..cuantos])
    Console.WriteLine(csv[r].ToString());

// Crear un string escribiendo directamente en su memoria
string id = string.Create(8, 42, (span, valor) =>
{
    span.Fill('0');
    valor.TryFormat(span[^2..], out _);   // "00000042"
});
```

Otras piezas del ecosistema construidas sobre esto: `System.Text.Json` (`Utf8JsonReader` es un `ref struct`), `System.IO.Pipelines` (Kestrel, el servidor de ASP.NET Core — **Sesión 23**), `BinaryPrimitives`, `Base64`, `SearchValues<T>` (.NET 8).

---

## 8. Código `unsafe`: punteros de verdad

Antes de `Span<T>`, la única forma de manipular memoria "a lo C" era el código **unsafe**. Sigue existiendo y lo necesitarás en interop nativo (P/Invoke), código de altísimo rendimiento o al leer código antiguo.

"Unsafe" no significa "malo": significa **que el CLR deja de verificar** la seguridad de tipos y los límites. Tú asumes la responsabilidad.

Habilitarlo en el `.csproj`:

```xml
<PropertyGroup>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
</PropertyGroup>
```

```csharp
unsafe
{
    int x = 10;
    int* p = &x;               // & = dirección de; int* = puntero a int
    *p = 20;                   // * = desreferenciar
    Console.WriteLine(x);      // 20

    // Aritmética de punteros
    int* arr = stackalloc int[4] { 1, 2, 3, 4 };
    for (int i = 0; i < 4; i++)
        Console.Write(*(arr + i) + " ");     // equivalente a arr[i]
}

// Un método entero puede ser unsafe
static unsafe void Copiar(byte* origen, byte* destino, int n)
{
    for (int i = 0; i < n; i++) destino[i] = origen[i];   // SIN bounds checking
}
```

### 8.1 `fixed`: fijar objetos para que el GC no los mueva

El GC **compacta** el heap (Sesión 14): mueve objetos para eliminar huecos. Si tienes un puntero crudo a un array y el GC lo mueve, tu puntero apunta a basura. `fixed` **"pinea"** el objeto mientras dure el bloque:

```csharp
byte[] datos = new byte[1024];

unsafe
{
    fixed (byte* p = datos)          // pin: el GC no moverá 'datos' dentro de este bloque
    {
        p[0] = 0xFF;
        // ... pasar p a una función nativa, etc.
    }                                // unpin automático
}
```

```
Heap antes de compactar:   [A][basura][datos][basura][B]
Heap después (sin pin):    [A][datos][B]            ← 'datos' se movió: puntero inválido
Con fixed:                 [A][hueco][datos][hueco][B]  ← no se mueve (fragmentación)
```

> ⚠️ Pinear mucho tiempo o muchos objetos **fragmenta el heap** y degrada el GC. Pinea lo mínimo y lo más breve posible. Para buffers que se pinean siempre existe el **POH** (Pinned Object Heap, .NET 5+): `GC.AllocateArray<byte>(n, pinned: true)`.

### 8.2 Otras herramientas "de bajo nivel"

| Herramienta | Para qué |
|---|---|
| `sizeof(T)` | Tamaño en bytes de un tipo unmanaged |
| `NativeMemory.Alloc/Free` (.NET 6+) | `malloc`/`free` fuera del heap administrado |
| `Marshal` | Interop clásico: `AllocHGlobal`, `PtrToStructure`… |
| `Unsafe` (`System.Runtime.CompilerServices`) | Operaciones sin verificación **sin** `unsafe` keyword: `Unsafe.As`, `Unsafe.Add` |
| `MemoryMarshal` | Reinterpretar spans: `MemoryMarshal.Cast<byte,int>(span)`, `GetReference` |
| `[StructLayout]`, `fixed` buffers en structs | Layout exacto de memoria para interop |
| `where T : unmanaged` | Constraint genérico: T sin referencias administradas (Sesión 8) |

```csharp
// Reinterpretar bytes como ints SIN copiar y SIN unsafe (pero ojo con endianness y alineación)
byte[] raw = { 1, 0, 0, 0, 2, 0, 0, 0 };
ReadOnlySpan<int> ints = MemoryMarshal.Cast<byte, int>(raw);
Console.WriteLine(ints[1]);   // 2 (en máquinas little-endian)

// Memoria nativa envuelta en un Span
unsafe
{
    byte* nativo = (byte*)NativeMemory.Alloc(100);
    try
    {
        var span = new Span<byte>(nativo, 100);  // ahora tienes bounds checking otra vez
        span.Clear();
    }
    finally { NativeMemory.Free(nativo); }       // TÚ liberas: el GC no sabe que existe
}
```

> ❓ **Entrevista**: *"¿Qué hace `fixed` y por qué es necesario?"* → Pinea un objeto del heap administrado para que el GC no lo reubique durante la compactación mientras hay un puntero nativo apuntándolo. Sin él, el puntero quedaría inválido tras un GC.

---

## 9. Span vs unsafe: ¿cuál uso?

| Criterio | `Span<T>` | `unsafe` + punteros |
|---|---|---|
| Seguridad de tipos | ✅ verificada | ❌ tú respondes |
| Bounds checking | ✅ (el JIT lo elimina cuando puede probar que es seguro) | ❌ nunca |
| Requiere `AllowUnsafeBlocks` | No | Sí |
| Funciona con memoria stack/heap/nativa | ✅ | ✅ |
| Rendimiento | Casi idéntico en la práctica | Máximo teórico |
| Legibilidad / mantenibilidad | Alta | Baja |

**Regla 2026**: empieza siempre con `Span<T>`. Baja a `unsafe` solo si un **benchmark** (Sesión 30) demuestra que lo necesitas o para interop que lo exige.

---

## 10. Caso completo: parser de CSV zero-allocation

```csharp
using System.Buffers;

// Suma la columna "monto" (3ra) de un CSV grande sin crear strings por campo
static decimal SumarMontos(ReadOnlySpan<char> csv)
{
    decimal total = 0;
    Span<Range> campos = stackalloc Range[8];         // máx 8 columnas, en stack

    foreach (ReadOnlySpan<char> linea in csv.EnumerateLines())   // .NET 6+: sin asignar
    {
        if (linea.IsEmpty) continue;
        int n = linea.Split(campos, ',');
        if (n < 3) continue;

        ReadOnlySpan<char> monto = linea[campos[2]].Trim();
        if (decimal.TryParse(monto, System.Globalization.NumberStyles.Number,
                             System.Globalization.CultureInfo.InvariantCulture, out var valor))
            total += valor;
    }
    return total;
}

string data = """
    id,cliente,monto
    1,ana,10.50
    2,luis,20.25
    3,eva,5.00
    """;
Console.WriteLine(SumarMontos(data));   // 35.75 (la cabecera no parsea como decimal → se ignora)
```

Comparación mental con la versión ingenua (`File.ReadAllLines` + `Split(',')` + `decimal.Parse`): la ingenua crea **1 string por línea + 1 array + 1 string por campo**. Esta crea **cero** objetos por línea.

> ⚠️ **No lo optimices todo**. Span hace el código más verboso. Úsalo en *hot paths* medidos (parsers, serializadores, middleware, bucles con millones de iteraciones), no en un controlador que se llama 10 veces por minuto.

---

## Resumen mental de la sesión

```
Problema:  Substring / ToArray / Split → copias → basura → presión GC

Span<T>          vista {ref, length} sobre memoria contigua (heap | stack | nativa)
ReadOnlySpan<T>  lo mismo, solo lectura (strings → ReadOnlySpan<char>)
   └── ref struct → SOLO stack: no campos, no boxing, no lambdas, no await/yield

Memory<T>        vista almacenable (struct normal) → cruza await, va en campos
   └── .Span para procesar

stackalloc       buffer en stack, sin GC, TAMAÑO ACOTADO (stack overflow)
ArrayPool<T>     Rent/Return de arrays grandes; Rent puede dar más; Return en finally

unsafe           punteros, sin verificación; <AllowUnsafeBlocks>
fixed            pinea objeto → el GC no lo mueve (fragmenta si abusas)
NativeMemory     malloc/free fuera del GC

Regla: Span primero → unsafe solo con benchmark o interop
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué problema resuelve `Span<T>`? Da un ejemplo con strings.
2. ❓ ¿Qué es un `ref struct` y qué restricciones impone? ¿Por qué existen?
3. ❓ ¿Por qué no puedes usar un `Span<T>` a través de un `await`? ¿Qué usas en su lugar?
4. ❓ Diferencias entre `Span<T>` y `Memory<T>`. ¿Cuándo aceptarías cada uno en una API pública?
5. ❓ ¿Por qué `string.AsSpan()` devuelve un `ReadOnlySpan<char>`?
6. ❓ ¿Qué es `stackalloc`, qué riesgo tiene y cómo lo mitigas?
7. ❓ ¿Cómo funciona `ArrayPool<T>` y cuáles son los errores típicos al usarlo?
8. ❓ ¿Qué significa realmente "unsafe" en C#? ¿Cómo se habilita?
9. ❓ ¿Qué hace `fixed` y qué efecto negativo tiene abusar de él?
10. ❓ ¿Cuál es la relación entre la compactación del GC y el pinning?
11. ❓ ¿Cuándo elegirías `unsafe` sobre `Span<T>`?

## Ejercicio práctico
1. Crea un proyecto: `dotnet new console -o SpanLab` y habilita `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>` en el `.csproj`.
2. Escribe dos versiones de un parser de fechas `"yyyy-MM-dd"`: una con `Substring` y otra con `ReadOnlySpan<char>`. Ejecuta ambas 10 millones de veces y compara la memoria asignada:
   ```csharp
   long antes = GC.GetAllocatedBytesForCurrentThread();
   // ... loop ...
   Console.WriteLine($"Asignado: {GC.GetAllocatedBytesForCurrentThread() - antes:N0} bytes");
   ```
3. Implementa el `ref struct Tokenizer` de la sección 3 y úsalo para separar `"a;b;;c"`. Intenta guardarlo como campo de una clase y lee el error del compilador.
4. Escribe un método `async` que lea un archivo con `Stream.ReadAsync(Memory<byte>)` usando un buffer alquilado de `ArrayPool<byte>.Shared`, y cuente las vocales procesando con `.Span`.
5. En un bloque `unsafe`, recorre un `int[]` con `fixed` y aritmética de punteros sumando sus elementos. Compara el resultado con `array.AsSpan()` + `foreach`.
6. (Opcional avanzado) Mide las dos versiones del paso 2 con BenchmarkDotNet usando `[MemoryDiagnoser]` (adelanto de la Sesión 30).

---

➡️ **Cuando termines**, marca la Sesión 19 en el [README](Readme.md) y pídeme la **Sesión 20 — Reflection y Attributes**.
