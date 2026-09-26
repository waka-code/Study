# Sesión 32 — Evolución de C# 8 → 13: qué trajo cada versión y por qué

> **Objetivo de la sesión**: cerrar el curso con una **línea de tiempo** del C# moderno. Al terminar deberías poder decir qué versión introdujo cada feature importante, *qué problema resolvía*, cómo se relaciona la versión del lenguaje con la de .NET, y leer con soltura código de cualquier época (desde un proyecto .NET Core 3.1 hasta .NET 9/10). Muchas features ya las viste en detalle en sesiones anteriores: aquí las ordenamos y rellenamos los huecos.

---

## 1. Versión del lenguaje vs versión de .NET

C# (el lenguaje, compilador Roslyn) y .NET (runtime + librerías) evolucionan **juntos pero son cosas distintas** (Sesión 1). Desde .NET Core 3.0, cada versión de .NET trae una versión de C# **por defecto**:

| C# | .NET por defecto | Año | Tema central |
|---|---|---|---|
| **8.0** | .NET Core 3.0 / 3.1 | 2019 | Seguridad frente a null, streams async, patrones |
| **9.0** | .NET 5 | 2020 | Records, inmutabilidad, menos ceremonia |
| **10.0** | .NET 6 (LTS) | 2021 | Menos boilerplate (global using, file-scoped namespaces) |
| **11.0** | .NET 7 | 2022 | Generic math, raw strings, `required`, list patterns |
| **12.0** | .NET 8 (LTS) | 2023 | Primary constructors, collection expressions |
| **13.0** | .NET 9 | 2024 | `params` colecciones, `Lock`, `ref struct` más flexibles |
| **14.0** | .NET 10 (LTS) | 2025 | Extension members, `field`, null-conditional assignment |

```xml
<PropertyGroup>
  <TargetFramework>net8.0</TargetFramework>   <!-- implica LangVersion 12 por defecto -->
  <!-- <LangVersion>13</LangVersion>  posible, pero NO soportado oficialmente sobre net8.0 -->
</PropertyGroup>
```

¿Por qué ligarlos? Porque muchas features **necesitan soporte del runtime o de la BCL**:
- *Default interface methods* (C# 8) requieren cambios en el CLR → no funcionan en .NET Framework.
- `IAsyncEnumerable<T>` (C# 8) es un tipo de la BCL.
- *Static abstract members* (C# 11) requieren soporte del runtime.
- `init` (C# 9) usa el tipo `IsExternalInit`; `required` (C# 11) usa atributos nuevos.

Otras features son **puro azúcar del compilador** (switch expressions, file-scoped namespaces, raw strings) y funcionarían en cualquier runtime.

> ❓ **Entrevista**: *"¿Puedo usar C# 12 en un proyecto .NET Framework 4.8?"* → Técnicamente puedes subir `LangVersion`, y las features que son solo sintaxis compilarán, pero las que dependen del runtime o de tipos de la BCL (default interface methods, `IAsyncEnumerable` sin paquetes, static abstract, `ref` fields) no funcionarán, y Microsoft no lo soporta. La combinación soportada es la versión por defecto del TFM.

---

## 2. C# 8 (2019): el salto del C# "moderno"

### 2.1 Nullable Reference Types (Sesión 15)

El cambio más grande en años: el compilador analiza el flujo para avisarte de posibles `NullReferenceException`.

```csharp
#nullable enable
string nombre = null;      // ⚠️ warning CS8600: estás metiendo null en un string no-nullable
string? apodo = null;      // ✅ explícitamente nullable
int largo = apodo.Length;  // ⚠️ warning CS8602: posible desreferencia de null
int ok = apodo?.Length ?? 0;
```

Es análisis **estático** (solo warnings, no cambia el runtime). Hoy viene activado por defecto en las plantillas (`<Nullable>enable</Nullable>`).

### 2.2 Switch expressions y patrones recursivos (Sesión 16)

```csharp
static decimal Envio(Pedido p) => p switch
{
    { Total: >= 100 }                   => 0m,            // property pattern (relacional llegó en C# 9)
    { Pais: "CL", Express: true }       => 5_000m,
    { Pais: "CL" }                      => 3_000m,
    _                                   => 15_000m
};

// Tuple pattern
static string Piedra(string a, string b) => (a, b) switch
{
    ("piedra", "tijera") or ("tijera", "papel") or ("papel", "piedra") => "Gana A",
    var (x, y) when x == y => "Empate",
    _ => "Gana B"
};

record Pedido(decimal Total, string Pais, bool Express);
```

(Los combinadores `or`/`and`/`not` y los patrones relacionales `>=` son de C# 9; C# 8 trajo switch expressions, property, tuple y positional patterns.)

### 2.3 Async streams: `IAsyncEnumerable<T>` y `await foreach` (Sesión 13)

```csharp
await foreach (var linea in LeerLineasAsync("log.txt"))
    Console.WriteLine(linea);

static async IAsyncEnumerable<string> LeerLineasAsync(string ruta)
{
    using var reader = new StreamReader(ruta);
    while (await reader.ReadLineAsync() is { } linea)
        yield return linea;          // produce elementos a medida que llegan, sin cargar todo
}
```

EF Core (`AsAsyncEnumerable`), gRPC streaming, `Channel.Reader.ReadAllAsync` (Sesión 29) usan esta interfaz.

### 2.4 Índices y rangos

```csharp
int[] n = [10, 20, 30, 40, 50];
int ultimo = n[^1];          // 50   (^1 = "1 desde el final")
int[] medio = n[1..4];       // [20, 30, 40]  (el final es EXCLUSIVO)
string s = "Hola Mundo"[5..]; // "Mundo"
Range r = ..2;               // tipos System.Index y System.Range
```

⚠️ En un array, `n[1..4]` **copia** a un array nuevo. Con `Span<T>` (Sesión 19) el slicing no copia.

### 2.5 Default interface methods

```csharp
public interface ILogger
{
    void Log(string mensaje);
    void LogError(Exception ex) => Log($"ERROR: {ex.Message}");   // implementación por defecto
}
```

Permite **añadir métodos a una interfaz publicada sin romper** a quienes ya la implementan. ⚠️ El método por defecto solo es accesible a través de la interfaz (`((ILogger)obj).LogError(...)`), no desde la clase.

### 2.6 Otras de C# 8

```csharp
// using declarations: se desecha al final del scope, sin llaves extra (Sesión 12)
using var archivo = File.OpenRead("datos.bin");

// Null-coalescing assignment
List<string>? cache = null;
cache ??= new List<string>();      // asigna solo si es null

// Static local functions: no pueden capturar variables (evita closures accidentales)
int Doble(int x) => x * 2;
static int Triple(int x) => x * 3;
```

También: miembros `readonly` en structs, `ref struct` desechables, `stackalloc` en expresiones anidadas, `$@"..."` y `@$"..."` intercambiables.

---

## 3. C# 9 (2020, .NET 5): records y menos ceremonia

### 3.1 Records e `init` (Sesión 17)

```csharp
public record Persona(string Nombre, int Edad);   // clase inmutable con igualdad por VALOR

var a = new Persona("Ana", 30);
var b = a with { Edad = 31 };        // copia no destructiva
Console.WriteLine(a == new Persona("Ana", 30));   // True: compara valores, no referencias
Console.WriteLine(a);                // Persona { Nombre = Ana, Edad = 30 }

public class Config
{
    public string Url { get; init; } = "";   // asignable solo en inicialización
}
```

### 3.2 Top-level statements (Sesiones 1 y 18)

```csharp
// Program.cs completo
Console.WriteLine("Hola");
```

### 3.3 Mejoras de pattern matching

```csharp
static string Clasificar(int temp) => temp switch
{
    < 0            => "Congelado",   // relacional
    >= 0 and < 15  => "Frío",        // and
    >= 15 and < 25 => "Templado",
    _              => "Calor"
};

if (obj is not null) { }             // not: más legible que !(obj is null)
if (c is >= 'a' and <= 'z' or >= 'A' and <= 'Z') { }
```

### 3.4 Otras de C# 9

```csharp
// Target-typed new
Dictionary<string, List<int>> mapa = new();

// Covariant return types: un override puede devolver un tipo MÁS DERIVADO
public abstract class Animal { public abstract Animal Clonar(); }
public class Perro : Animal { public override Perro Clonar() => new(); }

// Static anonymous functions: la lambda no puede capturar (sin asignación de closure)
Func<int, int> f = static x => x * 2;

// Lambda discards
Func<int, int, int> constante = (_, _) => 42;

// Module initializers: código que corre al cargar el assembly
// [ModuleInitializer] internal static void Init() { ... }
```

También: `nint`/`nuint` (enteros de tamaño nativo), punteros a función (`delegate*<int, void>`) para interop de alto rendimiento, `[SkipLocalsInit]`, métodos parciales con más firmas (base de los **source generators**), `GetEnumerator` como extensión para `foreach`.

---

## 4. C# 10 (2021, .NET 6 LTS): adiós al boilerplate

```csharp
// global using: una vez en el proyecto (o implícitos con <ImplicitUsings>) (Sesión 18)
global using System.Text.Json;

// File-scoped namespace: un nivel de indentación menos en TODO el archivo
namespace Tienda.Dominio;

public class Producto { }
```

```csharp
// record struct: records con semántica de valor (sin asignación en heap)
public readonly record struct Coordenada(double Lat, double Lon);

// Extended property patterns: navegar propiedades anidadas
if (pedido is { Cliente.Direccion.Ciudad: "Santiago" }) { }
// antes: { Cliente: { Direccion: { Ciudad: "Santiago" } } }

// Lambdas con tipo natural, atributos y tipo de retorno explícito
var parsear = (string s) => int.Parse(s);         // se infiere Func<string, int>
var elegir = object (bool b) => b ? 1 : "uno";    // tipo de retorno explícito
// Minimal APIs (Sesión 23) dependen de esto: app.MapGet("/", [Authorize] () => "hola");

// Constantes interpoladas
const string Base = "api";
const string Ruta = $"/{Base}/v1";

// with sobre structs y tipos anónimos
var p2 = new { X = 1, Y = 2 } with { Y = 5 };
```

`CallerArgumentExpression`: el compilador pasa **el texto** de un argumento. Así funcionan `ArgumentNullException.ThrowIfNull(x)` y los mensajes de las librerías de aserciones:

```csharp
using System.Runtime.CompilerServices;

static void Requerir(bool condicion,
    [CallerArgumentExpression(nameof(condicion))] string? expresion = null)
{
    if (!condicion) throw new ArgumentException($"Falló: {expresion}");
}

Requerir(1 + 1 == 3);   // ArgumentException: Falló: 1 + 1 == 3
```

**Interpolated string handlers**: `$"..."` ya no siempre crea un `string` intermedio. Los loggers y `StringBuilder.Append($"...")` pueden recibir la interpolación por partes, sin boxing y **sin construirla si no se va a usar** (ej. un nivel de log desactivado). Esto hizo la interpolación mucho más eficiente (Sesión 31).

---

## 5. C# 11 (2022, .NET 7): el lenguaje se vuelve más expresivo

### 5.1 Raw string literals

```csharp
string json = """
    {
      "nombre": "Ana",
      "ruta": "C:\temp\archivo.txt"
    }
    """;   // sin escapes; la indentación de las comillas de cierre se recorta

var nombre = "Ana";
string plantilla = $$"""
    { "saludo": "Hola {{nombre}}" }
    """;   // $$ → las llaves simples son literales; {{ }} interpola
```

Ideal para JSON, SQL, regex y tests.

### 5.2 `required` members

```csharp
public class Usuario
{
    public required string Email { get; init; }
    public string? Telefono { get; init; }
}

var u = new Usuario { Email = "a@b.cl" };   // ✅
// var x = new Usuario();                   // ❌ error CS9035: falta el miembro requerido 'Email'
```

Combina lo mejor de los inicializadores de objeto y la obligatoriedad de un constructor. Y funciona bien con NRT: una propiedad `required` no-nullable ya no dispara el warning "no inicializada".

### 5.3 List patterns

```csharp
static string Describir(int[] valores) => valores switch
{
    []                      => "vacío",
    [var unico]             => $"uno: {unico}",
    [1, ..]                 => "empieza con 1",
    [.., var penult, _]     => $"penúltimo: {penult}",
};

// Parsear comandos
string[] args2 = ["deploy", "--env", "prod"];
if (args2 is ["deploy", "--env", var entorno]) Console.WriteLine($"Deploy a {entorno}");
```

### 5.4 Generic math: static abstract members en interfaces

Antes no había forma de escribir un `Sumar<T>` genérico sobre números: los operadores son estáticos y las interfaces no podían declarar miembros estáticos abstractos. C# 11 + .NET 7 lo permiten, y la BCL define `INumber<T>`, `IAdditionOperators<...>`, etc.

```csharp
using System.Numerics;

static T Suma<T>(IEnumerable<T> valores) where T : INumber<T>
{
    T total = T.Zero;                  // miembro estático abstracto de la interfaz
    foreach (var v in valores) total += v;   // operador + definido por la interfaz
    return total;
}

Console.WriteLine(Suma([1, 2, 3]));            // 6   (int)
Console.WriteLine(Suma([1.5m, 2.25m]));        // 3.75 (decimal)

// Tu propia interfaz con static abstract
public interface IParseableSimple<TSelf> where TSelf : IParseableSimple<TSelf>
{
    static abstract TSelf Parse(string s);
}
```

Como el JIT especializa genéricos para value types (Sesión 31), `Suma<int>` rinde como un bucle escrito a mano.

### 5.5 Otras de C# 11

```csharp
// Atributos genéricos
public class ValidadorAttribute<T> : Attribute where T : class { }
[Validador<Usuario>] public class UsuarioDto { }

// Literales UTF-8: ReadOnlySpan<byte> sin conversión en runtime
ReadOnlySpan<byte> cabecera = "Content-Type"u8;

// Tipos locales al archivo: visibles solo en ese .cs (muy usado por source generators)
file class Ayudante { }

// Operador de desplazamiento sin signo
int negativo = -16;
Console.WriteLine(negativo >>> 28);   // 15
```

También: saltos de línea dentro de `{ }` interpolados, structs con campos auto-inicializados a `default`, `ref` fields y `scoped` (la base de `Span<T>` escrito en C#, Sesión 19), operadores `checked` definidos por el usuario, pattern matching de `Span<char>` contra strings constantes.

---

## 6. C# 12 (2023, .NET 8 LTS): la versión de este curso

### 6.1 Primary constructors en clases y structs (Sesiones 18 y 24)

```csharp
public class PedidoService(IPedidoRepositorio repo, ILogger<PedidoService> log)
{
    public async Task<Pedido?> ObtenerAsync(int id)
    {
        log.LogInformation("Buscando pedido {Id}", id);
        return await repo.PorIdAsync(id);
    }
}
```

⚠️ Diferencias con los records: en una **clase**, los parámetros del primary constructor **no** se convierten en propiedades públicas; son parámetros capturados, visibles en todo el cuerpo y **mutables** (puedes reasignarlos por accidente). Si necesitas inmutabilidad, asígnalos a un campo `readonly`: `private readonly IPedidoRepositorio _repo = repo;`.

### 6.2 Collection expressions

```csharp
int[] a = [1, 2, 3];
List<string> nombres = ["Ana", "Luis"];
Span<int> s = [1, 2, 3];               // puede ir en el stack
ImmutableArray<int> inm = [4, 5];
int[] todos = [..a, 99, ..inm];        // spread: [1, 2, 3, 99, 4, 5]
List<int> vacia = [];
```

Una sintaxis uniforme para cualquier colección; el compilador elige la construcción más eficiente para el tipo destino.

### 6.3 Otras de C# 12

```csharp
// Parámetros por defecto en lambdas
var saludar = (string nombre = "mundo") => $"Hola {nombre}";
Console.WriteLine(saludar());    // Hola mundo

// Alias para cualquier tipo (tuplas, arrays, genéricos cerrados)
using Punto = (int X, int Y);
Punto p = (3, 4);

// Inline arrays: buffer de tamaño fijo dentro de un struct, sin unsafe
[System.Runtime.CompilerServices.InlineArray(8)]
public struct Buffer8 { private int _elemento0; }

// ref readonly parameters: pasar por referencia de solo lectura (API más clara que 'in' en algunos casos)
static double Norma(ref readonly Vector3Grande v) => Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);

public struct Vector3Grande { public double X, Y, Z; }
```

También: `[Experimental]` para marcar APIs en prueba e **interceptors** (experimental, usado por source generators de ASP.NET Core para AOT).

---

## 7. C# 13 (2024, .NET 9)

### 7.1 `params` con cualquier colección

```csharp
static int Sumar(params ReadOnlySpan<int> valores)   // antes solo params int[]
{
    int total = 0;
    foreach (var v in valores) total += v;
    return total;
}

Sumar(1, 2, 3);   // con Span: el compilador puede poner los argumentos en el stack → 0 asignaciones
static void Log(params IEnumerable<string> msgs) { }
```

La BCL de .NET 9 añadió sobrecargas `params ReadOnlySpan<T>` en métodos como `string.Join`, `Task.WhenAll`, `Path.Combine`: recompilar contra .NET 9 elimina asignaciones "gratis".

### 7.2 El nuevo tipo `Lock` (Sesión 29)

```csharp
public class Contador
{
    private readonly Lock _lock = new();   // System.Threading.Lock
    private int _valor;

    public void Incrementar()
    {
        lock (_lock) { _valor++; }          // el compilador usa Lock.EnterScope(), más rápido que Monitor
    }
}
```

⚠️ Si conviertes un `Lock` a `object` y haces `lock` sobre ese `object`, vuelves a `Monitor` (el compilador avisa).

### 7.3 `ref struct` más útiles

```csharp
// Los ref struct ya pueden implementar interfaces...
public ref struct Lector : IDisposable
{
    public void Dispose() { }
}

// ...y los genéricos pueden aceptarlos con el anti-constraint 'allows ref struct'
static void Procesar<T>(T valor) where T : allows ref struct { }
```

Además, los métodos `async` e iteradores pueden declarar locales `ref` y `ref struct` (como `Span<T>`), siempre que no crucen un `await`/`yield`.

### 7.4 Otras de C# 13

```csharp
// Secuencia de escape \e (ESC, útil para colores ANSI en consola)
Console.WriteLine("\e[32mVerde\e[0m");

// Índice desde el final en inicializadores de objeto
var cuenta = new CuentaRegresiva { Valores = { [^1] = 0, [^2] = 1 } };

public class CuentaRegresiva { public int[] Valores { get; } = new int[5]; }
```

También: **propiedades e indexadores `partial`** (clave para source generators como el de MVVM Toolkit), `[OverloadResolutionPriority]` para que los autores de librerías prioricen una sobrecarga nueva más eficiente, y la palabra clave **`field`** en *preview*.

---

## 8. Un vistazo a C# 14 (.NET 10 LTS, noviembre 2025)

Como .NET 10 es la nueva LTS, conviene conocer lo principal:

```csharp
// 1. Extension members: bloques 'extension' con propiedades, métodos y miembros ESTÁTICOS de extensión
public static class EnumerableExtensions
{
    extension<T>(IEnumerable<T> source)
    {
        public bool IsEmpty => !source.Any();                 // ¡propiedad de extensión!
        public IEnumerable<T> NoNulos() => source.Where(x => x is not null);
    }
}
// uso: if (lista.IsEmpty) ...

// 2. 'field': accede al campo generado de una auto-propiedad, sin declararlo a mano
public class Cliente
{
    public string Nombre
    {
        get;
        set => field = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
    }
}

// 3. Null-conditional assignment
cliente?.Nombre = "Ana";      // asigna solo si cliente no es null
```

Otras: `nameof(List<>)` con genéricos sin cerrar, conversiones implícitas a `Span<T>`/`ReadOnlySpan<T>` ("first-class spans"), modificadores (`out`, `ref`, `scoped`) en parámetros de lambda sin escribir sus tipos, constructores y eventos `partial`, y operadores de asignación compuesta (`+=`) definidos por el usuario.

---

## 9. La foto completa: features por tema

| Tema | Evolución |
|---|---|
| **Null safety** | `?.`/`??` (C# 6) → NRT (8) → `??=` (8) → `required` (11) → `?.=` asignación (14) |
| **Pattern matching** | `is T x` (7) → switch expression, property/tuple/positional (8) → `and/or/not`, relacional (9) → extended property (10) → list patterns (11) |
| **Inmutabilidad** | `readonly` (1) → `readonly struct` (7.2) → records, `init` (9) → `record struct` (10) → `required` (11) |
| **Menos ceremonia** | top-level (9) → global using, file-scoped ns (10) → primary ctors, collection expressions (12) → `field` (14) |
| **Rendimiento** | `Span`, `ref struct` (7.2) → `stackalloc` expresión (8) → `nint`, function pointers, `SkipLocalsInit` (9) → interpolated handlers (10) → `ref` fields, `scoped`, `u8` (11) → inline arrays (12) → `params Span`, `Lock` (13) → first-class spans (14) |
| **Genéricos / abstracción** | covarianza (4) → default interface methods (8) → static abstract / generic math (11) → `allows ref struct` (13) → extension members (14) |
| **Metaprogramación** | reflection → source generators + partial methods extendidos (9) → `file` types (11) → interceptors (12) → partial properties (13) |

---

## 10. Leer código de cualquier época: el mismo modelo en 3 estilos

```csharp
// ─── Estilo C# 7 (.NET Core 2.x / Framework) ───
namespace Tienda
{
    public class ProductoDto
    {
        public ProductoDto(int id, string nombre) { Id = id; Nombre = nombre; }
        public int Id { get; }
        public string Nombre { get; }
        public override bool Equals(object obj) => obj is ProductoDto o && o.Id == Id && o.Nombre == Nombre;
        public override int GetHashCode() => (Id, Nombre).GetHashCode();
    }
}

// ─── Estilo C# 9 (.NET 5) ───
namespace Tienda
{
    public record ProductoDto(int Id, string Nombre);
}

// ─── Estilo C# 12 (.NET 8) ───
namespace Tienda;

public sealed record ProductoDto(int Id, string Nombre)
{
    public required IReadOnlyList<string> Tags { get; init; } = [];
}
```

> ❓ **Entrevista**: *"¿Qué feature moderna de C# te parece más importante y por qué?"* → Una buena respuesta elige una y la justifica con un problema real. Ej: *"NRT, porque convierte el error más común en producción (NullReferenceException) en un warning de compilación, y obliga a modelar explícitamente qué puede faltar"*; o *"records + pattern matching, porque permiten modelar dominios con datos inmutables y lógica exhaustiva y legible"*.

⚠️ **Modernizar no es un objetivo en sí**. En un código base grande, introduce features nuevas de forma consistente (con `.editorconfig` y analizadores, Sesión 21) en lugar de mezclar tres estilos en el mismo archivo. Y cuidado con cambios que parecen cosméticos pero no lo son: pasar una `class` a `record` cambia la semántica de igualdad; un primary constructor en clase no genera propiedades.

---

## 11. Resumen mental de la sesión

```
C# y .NET van juntos: TFM → LangVersion por defecto (net8.0 = C# 12)
Features de runtime (DIM, static abstract, ref fields) ≠ azúcar del compilador

C# 8  (Core 3.x) NRT · switch expr · patrones · IAsyncEnumerable · ^ y .. · DIM · using var · ??=
C# 9  (.NET 5)   records · init · top-level · and/or/not/relacional · new() · covariant returns
C# 10 (.NET 6)   global using · file-scoped ns · record struct · {A.B: x} · lambdas naturales
                 CallerArgumentExpression · interpolated string handlers
C# 11 (.NET 7)   raw strings """ · required · list patterns [a, .., b] · generic math (static abstract)
                 u8 · file types · generic attributes · ref fields/scoped · >>>
C# 12 (.NET 8)   primary ctors · collection expressions [..a, b] · alias any type · inline arrays
                 default lambda params · ref readonly params
C# 13 (.NET 9)   params Span/IEnumerable · Lock · ref struct + interfaces · allows ref struct
                 partial properties · \e · [^1] en inicializadores
C# 14 (.NET 10)  extension members · field · a?.B = x · nameof(List<>) · first-class spans
```

---

## 12. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué relación hay entre la versión de C# y la de .NET? ¿Qué versión de C# usa `net8.0` por defecto?
2. ❓ Nombra una feature que dependa del runtime y otra que sea solo azúcar del compilador.
3. ❓ ¿Qué problema resuelven los default interface methods y qué limitación tienen?
4. ❓ ¿Qué versión introdujo records? ¿Y `record struct`? ¿Qué diferencia hay entre ambos?
5. ❓ ¿Qué es un raw string literal y cómo se interpola cuando el contenido tiene llaves?
6. ❓ ¿`required` vs parámetro de constructor: cuándo cada uno?
7. ❓ Escribe un list pattern que capture el primer y último elemento de un array.
8. ❓ ¿Qué es generic math y qué feature del lenguaje lo hizo posible?
9. ❓ ¿Qué diferencia hay entre el primary constructor de una clase y el de un record?
10. ❓ ¿Qué ventaja tiene `params ReadOnlySpan<T>` (C# 13) sobre `params T[]`?
11. ❓ ¿Qué son los interpolated string handlers y por qué mejoran el logging?
12. ❓ Menciona dos features de C# 14.

## 13. Ejercicio práctico
1. Crea `dotnet new console -o EvolucionCSharp`.
2. Escribe una clase "legacy" estilo C# 7 (constructor, propiedades de solo lectura, `Equals`/`GetHashCode` a mano, `switch` statement clásico, `string.Format`, bloques `using { }`, namespace con llaves) que modele `Pedido` con líneas y calcule descuentos.
3. **Moderniza paso a paso**, haciendo un commit por versión y verificando que el comportamiento no cambia (escribe antes 3-4 tests con xUnit, Sesión 27):
   - C# 8: NRT, switch expression, `using var`, `??=`.
   - C# 9: `record`, `init`, patrones relacionales, `new()`.
   - C# 10: file-scoped namespace, `global using`, extended property patterns.
   - C# 11: `required`, raw string para exportar el pedido a JSON, list pattern para validar líneas.
   - C# 12: primary constructor en el servicio, collection expressions.
4. Implementa `Promedio<T>(IEnumerable<T>) where T : INumber<T>` y pruébalo con `int`, `double` y `decimal`.
5. (Opcional) Instala el SDK de .NET 10, cambia el TFM a `net10.0` y reescribe una extensión como **extension member** con una propiedad `IsEmpty`.

---

## 🎓 ¡Felicitaciones: terminaste el curso!

Has recorrido las **32 sesiones**: desde qué es el CLR y cómo se compila el IL (Sesión 1), pasando por el lenguaje completo (tipos, POO, genéricos, LINQ, delegates, async, memoria, NRT, pattern matching, records, `Span`, reflection), el backend profesional (HTTP, ASP.NET Core, DI, EF Core, arquitectura, testing, seguridad) y los temas senior (concurrencia, performance, internals del CLR y evolución del lenguaje). Eso es exactamente el temario de una entrevista **senior .NET**.

Marca la Sesión 32 en el [README](Readme.md) y, para consolidarlo todo, te propongo un proyecto final.

### Proyecto capstone: "OrderFlow", un sistema de pedidos de punta a punta

Una API de pedidos para una tienda online que obliga a usar casi todo el curso:

| Parte | Qué construir | Sesiones |
|---|---|---|
| **Dominio** | Entidades y value objects con `record`/`readonly record struct`, NRT activado, reglas con pattern matching (`switch` exhaustivo sobre estados del pedido), `required` | 5, 15, 16, 17, 26 |
| **Arquitectura** | Clean Architecture (Domain / Application / Infrastructure / Api), CQRS con handlers, Result pattern para errores de negocio | 12, 26 |
| **API** | Minimal APIs con DTOs, validación, ProblemDetails, versionado, OpenAPI | 22, 23 |
| **Persistencia** | EF Core + PostgreSQL, migraciones, proyecciones, `AsNoTracking`, `ExecuteUpdateAsync`, índices | 25, 30 |
| **DI y configuración** | Options pattern, lifetimes correctos, `IHttpClientFactory` para un proveedor de pagos simulado | 21, 24, 30 |
| **Seguridad** | JWT, políticas de autorización por rol, rate limiting, secretos fuera del repo | 28 |
| **Asincronía y concurrencia** | `POST /pedidos` responde `202` y encola en un `Channel<T>` bounded; un `BackgroundService` procesa pagos con `Parallel.ForEachAsync` limitado; `SemaphoreSlim` para el token del proveedor | 13, 29 |
| **Performance** | `HybridCache` con Redis para el catálogo, Output Caching con invalidación por tags, benchmarks de un serializador o cálculo de precios con BenchmarkDotNet | 19, 30 |
| **Testing** | Unit tests del dominio (xUnit), mocks de puertos, tests de integración con `WebApplicationFactory` + Testcontainers (Postgres y Redis) | 27 |
| **Operación** | Docker Compose, health checks, logs estructurados, métricas con OpenTelemetry, observar con `dotnet-counters` bajo carga (k6) | 3, 30 |
| **Extra senior** | Publicar un worker de notificaciones como **Native AOT** con `JsonSerializerContext`, y comparar arranque/memoria con la versión JIT | 20, 31 |

**Próximos pasos sugeridos**:
1. Construye OrderFlow en un repositorio público con un README que explique tus decisiones de arquitectura (en entrevistas, **explicar el porqué** vale más que el código).
2. Repasa en voz alta los *Chequeos de entrevista* de las 32 sesiones; las que no puedas responder de memoria, reléelas.
3. Practica *system design* con .NET: cómo escalarías OrderFlow (colas durables, Outbox, réplicas de lectura, particionado).
4. Sigue la evolución: lee cada año el post *"Performance Improvements in .NET N"* del blog de .NET y el *"What's new in C#"* de Microsoft Learn.

➡️ **Cuando termines**, marca la Sesión 32 en el [README](Readme.md) y pídeme la **Sesión 33 — ASP.NET Core avanzado** (Bloque 6 — Senior en producción). Puedes empezar OrderFlow ya; el Bloque 6 le agrega mensajería, microservicios, Docker, CI/CD y observabilidad.
