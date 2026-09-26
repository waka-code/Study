# Sesión 18 — Features modernas: menos ceremonia, más intención

> **Objetivo de la sesión**: dominar las características de C# 9–12 que cambiaron *cómo se ve* un programa C# moderno: top-level statements, `global using` e implicit usings, file-scoped namespaces, primary constructors (C# 12), collection expressions (C# 12), y un repaso de otras piezas que verás en todo código nuevo (raw string literals, target-typed `new`, alias de cualquier tipo, `file` types, lambdas con parámetros por defecto). Para cada una: qué genera el compilador por debajo, cuándo usarla y qué trampas tiene. Al terminar deberías leer un `Program.cs` de .NET 8 sin sorpresas y explicar en entrevista qué es "azúcar sintáctico" y qué no.

---

## 1. La idea que une todo: reducir *ceremonia*

C# arrastraba mucho texto repetitivo: un `Hola Mundo` necesitaba `namespace`, `class`, `static void Main`, llaves anidadas y varios `using`. Otros lenguajes (Python, JavaScript, Kotlin) competían con scripts de una línea. Desde C# 9 (2020), el equipo del lenguaje se propuso eliminar ceremonia **sin cambiar el runtime**.

> 💡 **Clave para entrevistas**: casi todo lo de esta sesión es **azúcar sintáctico** (*syntactic sugar*): Roslyn lo "reescribe" (*lowering*) a C# clásico antes de emitir IL. El CLR (Sesión 1) no sabe que existieron. Por eso puedes usar C# 12 apuntando a runtimes antiguos en muchos casos (con matices: algunas features requieren tipos del BCL).

| Feature | Versión C# | ¿Qué elimina? |
|---|---|---|
| Top-level statements | 9 | `class Program` + `static void Main` |
| Target-typed `new()` | 9 | Repetir el tipo: `List<int> x = new();` |
| `global using` | 10 | Repetir `using` en cada archivo |
| Implicit usings | 10 (SDK .NET 6) | Escribir los `using` comunes |
| File-scoped namespace | 10 | Un nivel de llaves e indentación |
| Raw string literals | 11 | Escapar comillas y `\` |
| `file` types | 11 | Colisiones de tipos auxiliares |
| **Primary constructors** (clases/structs) | **12** | Campos + constructor de asignación |
| **Collection expressions** | **12** | `new List<int> { ... }`, `new[] {}`, `Array.Empty` |
| Alias de cualquier tipo | 12 | Nombres largos de tuplas/genéricos |
| Lambdas con parámetros por defecto | 12 | Sobrecargas de delegados |

---

## 2. Top-level statements (C# 9)

Lo adelantamos en la Sesión 1. Un `Program.cs` puede contener directamente sentencias:

```csharp
// Program.cs — todo esto es un programa completo
using System.Text.Json;

var nombre = args.Length > 0 ? args[0] : "mundo";   // 'args' existe implícitamente
Console.WriteLine($"Hola, {nombre}");

var datos = await File.ReadAllTextAsync("config.json"); // 'await' permitido directamente
Console.WriteLine(Saludo(nombre));

return 0;                                            // 'return' con int = exit code

// Funciones locales al final
static string Saludo(string n) => $"¡Bienvenido, {n}!";

// Tipos: deben ir DESPUÉS de las sentencias
record Config(string Host, int Puerto);
```

### 2.1 ¿Qué genera el compilador?
Roslyn envuelve las sentencias en una clase y un `Main` sintetizados:

```csharp
// Lo que realmente se compila (simplificado)
[CompilerGenerated]
internal class Program          // nombre "Program" (desde .NET 6 es accesible como partial)
{
    private static async Task<int> <Main>$(string[] args)   // nombre impronunciable
    {
        var nombre = args.Length > 0 ? args[0] : "mundo";
        // ...
        return 0;
        static string Saludo(string n) => ...;   // las funciones pasan a ser locales de Main
    }
}
```

La **firma** de `Main` depende de lo que uses:

| Tu código usa... | Main generado |
|---|---|
| Nada especial | `static void Main(string[] args)` |
| `return <int>` | `static int Main(string[] args)` |
| `await` | `static async Task Main(string[] args)` |
| `await` + `return <int>` | `static async Task<int> Main(string[] args)` |

### 2.2 Reglas y trampas

- ⚠️ **Solo un archivo** por proyecto puede tener top-level statements (CS8802). Son el punto de entrada.
- ⚠️ Los **tipos** declarados en ese archivo deben ir **después** de las sentencias (CS8803).
- ⚠️ Las "funciones" que escribes ahí son **funciones locales** de `Main`: no puedes llamarlas desde otras clases.
- Las variables declaradas son **locales** a `Main`, no campos: no son accesibles desde otros tipos.
- Para tests de integración con `WebApplicationFactory<Program>` (Sesión 27) necesitas que `Program` sea visible: en .NET 6/7 se añadía `public partial class Program { }` al final; desde **.NET 10** el SDK lo genera automáticamente.

> ❓ **Entrevista**: *"Con top-level statements, ¿dónde está el `Main`?"* → Lo genera el compilador dentro de una clase `Program` sintetizada, con un nombre especial (`<Main>$`). Es azúcar sintáctico: el IL resultante es equivalente al estilo clásico. La firma (void/int/Task/Task<int>) se infiere según uses `await` y `return`.

**Cuándo usarlo**: siempre en el `Program.cs` de apps nuevas (consola, ASP.NET Core — Sesión 23). **Cuándo no**: en librerías (no tienen punto de entrada) o si tu `Program.cs` crece mucho — entonces la lógica debe vivir en clases.

---

## 3. `global using` e implicit usings (C# 10)

### 3.1 `global using`
Un `global using` en **cualquier** archivo aplica a **todos** los archivos del proyecto:

```csharp
// GlobalUsings.cs  (convención: un archivo dedicado)
global using System.Text.Json;
global using Microsoft.Extensions.Logging;
global using MiApp.Dominio;
global using static System.Math;               // 'using static': usar Sqrt(...) sin 'Math.'
global using Json = System.Text.Json.JsonSerializer;   // alias global
```

Deben ir **antes** de cualquier `using` normal y de cualquier declaración del archivo.

### 3.2 Implicit usings (SDK .NET 6+)
Con `<ImplicitUsings>enable</ImplicitUsings>` en el `.csproj` (lo viste en la Sesión 1), el SDK **genera un archivo** con `global using` según el tipo de proyecto:

```
obj/Debug/net8.0/<Proyecto>.GlobalUsings.g.cs   ← archivo generado; ábrelo para verlo
```

| SDK | Namespaces incluidos |
|---|---|
| `Microsoft.NET.Sdk` (consola/classlib) | `System`, `System.IO`, `System.Collections.Generic`, `System.Linq`, `System.Net.Http`, `System.Threading`, `System.Threading.Tasks` |
| `Microsoft.NET.Sdk.Web` | Lo anterior + `System.Net.Http.Json`, `Microsoft.AspNetCore.Builder`, `Microsoft.AspNetCore.Hosting`, `Microsoft.AspNetCore.Http`, `Microsoft.AspNetCore.Routing`, `Microsoft.Extensions.Configuration`, `Microsoft.Extensions.DependencyInjection`, `Microsoft.Extensions.Hosting`, `Microsoft.Extensions.Logging` |
| `Microsoft.NET.Sdk.Worker` | Base + `Microsoft.Extensions.*` (Configuration, DI, Hosting, Logging) |

Puedes añadir o quitar desde el `.csproj` sin tocar código:

```xml
<ItemGroup>
  <Using Include="MiApp.Dominio" />                         <!-- global using MiApp.Dominio; -->
  <Using Include="System.Console" Static="true" />          <!-- global using static ... -->
  <Using Include="System.Text.Json.JsonSerializer" Alias="Json" />
  <Using Remove="System.Net.Http" />                        <!-- quita uno de los implícitos -->
</ItemGroup>
```

> ⚠️ **Trampa: ambigüedades.** Más namespaces importados = más riesgo de nombres repetidos. Clásico: `Timer` existe en `System.Threading` y `System.Timers`; `Task` puede chocar con tu propia clase de dominio `Task` (¡típico en apps de gestión de tareas!). Error CS0104 *"'Task' is an ambiguous reference"*. Solución: alias (`using Tarea = MiApp.Dominio.Task;`) o nombre completo.

> 💡 No abuses de `global using` para namespaces de tu propio dominio: esconde las dependencias entre capas. En Clean Architecture (Sesión 26), ver `using MiApp.Infraestructura;` en la capa de Dominio es una señal de alarma que un `global using` ocultaría.

---

## 4. File-scoped namespaces (C# 10)

```csharp
// ANTES: todo el archivo indentado un nivel
namespace MiApp.Servicios
{
    public class EmailService
    {
        // ...
    }
}

// AHORA: una línea con ';' — aplica a todo el archivo
namespace MiApp.Servicios;

public class EmailService
{
    // ...
}
```

Reglas: solo **uno** por archivo, no se puede combinar con namespaces con llaves en el mismo archivo, y debe ir antes de cualquier tipo. Es puramente estético — y la convención recomendada hoy. Puedes forzarlo con `.editorconfig`:

```ini
[*.cs]
csharp_style_namespace_declarations = file_scoped:warning
```

---

## 5. Primary constructors para clases y structs (C# 12)

Los records posicionales (Sesión 17) ya tenían *primary constructors* desde C# 9. C# 12 los extendió a **cualquier** `class` y `struct`, con una semántica **diferente**, y esto es fuente de confusión.

### 5.1 El caso de uso estrella: inyección de dependencias

```csharp
// ANTES (clásico): campo + constructor + asignación = mucho boilerplate
public class PedidoService
{
    private readonly IPedidoRepositorio _repo;
    private readonly ILogger<PedidoService> _logger;

    public PedidoService(IPedidoRepositorio repo, ILogger<PedidoService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<Pedido?> ObtenerAsync(int id)
    {
        _logger.LogInformation("Buscando pedido {Id}", id);
        return await _repo.BuscarAsync(id);
    }
}

// AHORA (C# 12): los parámetros están en scope en TODO el cuerpo de la clase
public class PedidoService(IPedidoRepositorio repo, ILogger<PedidoService> logger)
{
    public async Task<Pedido?> ObtenerAsync(int id)
    {
        logger.LogInformation("Buscando pedido {Id}", id);
        return await repo.BuscarAsync(id);
    }
}
```

El contenedor de DI (Sesión 24) ve un constructor público normal con esos dos parámetros: funciona igual.

### 5.2 ¿Qué genera? (la diferencia clave con records)

| | `record Persona(string Nombre)` | `class Persona(string nombre)` |
|---|---|---|
| ¿Genera propiedad pública? | ✅ `Nombre { get; init; }` | ❌ **No** |
| ¿Qué es el parámetro? | Se copia a la propiedad | Un **parámetro capturado** en el scope de la clase |
| ¿Genera campo? | Backing field de la propiedad | Solo **si** lo usas en un miembro (campo oculto `<nombre>P`) |
| ¿Es readonly? | Propiedad `init` | ❌ **No**: el parámetro es **mutable** |
| Deconstruct / Equals / ToString | ✅ | ❌ |

```csharp
public class Contador(int inicial)
{
    public int Siguiente() => ++inicial;     // ⚠️ compila: el parámetro capturado es MUTABLE
}
```

> ⚠️ **Trampa #1 — No es `readonly`**: cualquier método puede reasignar el parámetro. Si quieres garantía de inmutabilidad, asígnalo explícitamente a un campo readonly:

```csharp
public class PedidoService(IPedidoRepositorio repo)
{
    private readonly IPedidoRepositorio _repo = repo;   // inicializador de campo usando el parámetro
    // Ahora usa _repo. (Si usas 'repo' Y '_repo', el compilador emite
    // warning CS9124: el parámetro se captura Y también inicializa un campo → doble estado)
}
```

> ⚠️ **Trampa #2 — Doble almacenamiento**: si usas el parámetro en un inicializador de propiedad **y** en un método, el compilador guarda dos copias que pueden divergir:

```csharp
public class Persona(string nombre)
{
    public string Nombre { get; set; } = nombre;   // copia 1: backing field de la propiedad
    public string Saludar() => $"Hola, {nombre}";  // copia 2: campo capturado  ⚠️ CS9124

    // p.Nombre = "Luis";  p.Saludar() → "Hola, Ana"  😱
}
```

Regla: usa el parámetro **o** para inicializar miembros, **o** directamente en métodos, **nunca ambos**.

### 5.3 Reglas adicionales

```csharp
// Otros constructores DEBEN encadenar al primario con this(...)
public class Punto(int x, int y)
{
    public Punto() : this(0, 0) { }         // ✅ obligatorio: CS8862 si falta
    public int X => x;
    public int Y => y;
}

// Herencia: pasar argumentos al constructor base
public class ExcepcionDominio(string mensaje, int codigo) : Exception(mensaje)
{
    public int Codigo { get; } = codigo;
}

// Validación: en inicializadores (no hay "cuerpo" del constructor primario)
public class Cliente(string email)
{
    private readonly string _email = email?.Contains('@') == true
        ? email
        : throw new ArgumentException("Email inválido", nameof(email));
}

// Structs también
public readonly struct Temperatura(double celsius)
{
    public double Celsius => celsius;
    public double Fahrenheit => celsius * 9 / 5 + 32;
}
```

> ❓ **Entrevista**: *"¿Diferencia entre el primary constructor de un record y el de una clase?"* → En el record, cada parámetro se convierte en una **propiedad pública** (`init` en record class) e interviene en igualdad, `ToString` y `Deconstruct`. En una clase (C# 12), los parámetros son solo **variables capturadas** en el scope de la clase: no son propiedades, no son públicos, no son `readonly`, y el compilador solo genera un campo oculto si se usan fuera de inicializadores.

**Cuándo usarlos**: servicios con DI (el caso ideal), clases pequeñas, excepciones personalizadas. **Cuándo no**: clases con lógica de construcción compleja o invariantes estrictas, o si tu equipo exige campos `readonly` explícitos (muchos analizadores lo sugieren).

---

## 6. Collection expressions (C# 12)

Una sintaxis **unificada** con corchetes para crear colecciones de cualquier tipo:

```csharp
// ANTES: cada tipo con su sintaxis
int[] a1 = new int[] { 1, 2, 3 };
List<int> l1 = new List<int> { 1, 2, 3 };
Span<int> s1 = stackalloc int[] { 1, 2, 3 };
ImmutableArray<int> i1 = ImmutableArray.Create(1, 2, 3);
int[] vacio1 = Array.Empty<int>();

// AHORA: la misma sintaxis, el TIPO DESTINO decide qué se crea (target-typed)
int[] a = [1, 2, 3];
List<int> l = [1, 2, 3];
Span<int> s = [1, 2, 3];
ReadOnlySpan<byte> bytes = [0x48, 0x6F, 0x6C, 0x61];
ImmutableArray<int> inm = [1, 2, 3];
IEnumerable<int> seq = [1, 2, 3];
HashSet<string> tags = ["c#", "dotnet"];
int[] vacio = [];                            // sin allocation para arrays vacíos (usa Array.Empty)
```

### 6.1 El spread operator `..`

```csharp
int[] pares = [2, 4, 6];
int[] impares = [1, 3, 5];
int[] todos = [0, .. pares, .. impares, 100];      // [0, 2, 4, 6, 1, 3, 5, 100]

List<string> roles = ["user", .. (esAdmin ? ["admin"] : Array.Empty<string>())];
IEnumerable<int> filtrados = [.. todos.Where(x => x > 3)];   // materializa un LINQ
```

> 💡 No confundas: `..` en una **collection expression** es *spread* (expandir). `..` en un **list pattern** (Sesión 16) es *slice* (resto). Misma sintaxis, operaciones inversas: una construye, la otra deconstruye.

```csharp
int[] datos = [1, .. otros, 9];          // construir
if (datos is [1, .. var medio, 9]) { }   // deconstruir
```

### 6.2 ¿Qué genera el compilador? (rendimiento)

El compilador elige la construcción **más eficiente** para cada tipo destino:

| Tipo destino | Lo que emite (aprox.) |
|---|---|
| `T[]` con tamaño conocido | `new T[n]` + asignación por índice |
| `List<T>` | `new List<T>(capacidad exacta)` y, en compiladores recientes, `CollectionsMarshal.SetCount` + escritura directa al span interno |
| `Span<T>` / `ReadOnlySpan<T>` | Buffer inline en stack (`[InlineArray]`) o datos estáticos en el assembly para constantes |
| Vacío `[]` a array / `IEnumerable<T>` | `Array.Empty<T>()` — cero allocations |
| `IEnumerable<T>` / `IReadOnlyList<T>` no vacío | Un tipo interno sintetizado de solo lectura (o un array) |
| Tipos con `[CollectionBuilder]` (`ImmutableArray<T>`…) | Llama al método factoría con un `ReadOnlySpan<T>` |
| Tipos con `Add` + ctor vacío (`HashSet<T>`, `Dictionary`…) | `new T()` + `Add` por elemento (como los *collection initializers*) |

Tu propio tipo puede soportarlo con `[CollectionBuilder]`:

```csharp
using System.Runtime.CompilerServices;

[CollectionBuilder(typeof(Bolsa), nameof(Bolsa.Crear))]
public class Bolsa<T> : IEnumerable<T>
{
    private readonly List<T> _items;
    internal Bolsa(ReadOnlySpan<T> items) => _items = [.. items];
    public IEnumerator<T> GetEnumerator() => _items.GetEnumerator();
    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}

public static class Bolsa
{
    public static Bolsa<T> Crear<T>(ReadOnlySpan<T> items) => new(items);
}

Bolsa<string> b = ["a", "b"];    // ✅ usa Bolsa.Crear
```

### 6.3 Trampas

> ⚠️ **Necesita tipo destino**. `var x = [1, 2, 3];` **no compila** (CS9176: *no target type*). El compilador no sabe si quieres array, lista o span.

> ⚠️ **Diccionarios**: en C# 12 **no** hay sintaxis `["a": 1]` (está propuesta para versiones futuras). Usa `new Dictionary<string,int> { ["a"] = 1 }`.

> ⚠️ **Tipo interfaz = tipo desconocido**. `IEnumerable<int> x = [1, 2];` te da un tipo que no controlas; no hagas cast a `List<int>` esperando mutar. Con `IList<T>`/`ICollection<T>` sí obtienes una `List<T>` mutable.

> ⚠️ **Overload resolution**: al pasar `[1, 2]` a un método con sobrecargas `(int[])` y `(ReadOnlySpan<int>)`, C# 12 prefiere `ReadOnlySpan<T>` (mejor rendimiento). Puede cambiar a qué sobrecarga llamas respecto a `new[] {1, 2}`.

> ❓ **Entrevista**: *"¿`List<int> x = [1, 2, 3];` es solo azúcar de `new List<int> { 1, 2, 3 }`?"* → Semánticamente sí, pero no es idéntico en IL: el collection expression **pre-dimensiona** la lista con la capacidad exacta y escribe directamente en su span interno, evitando llamadas a `Add` y redimensionamientos. En general, collection expressions son iguales o más eficientes que la forma antigua.

---

## 7. Otras features modernas que verás a diario

### 7.1 Target-typed `new` (C# 9)
```csharp
Dictionary<string, List<int>> mapa = new();      // no repites el tipo
private readonly List<Pedido> _pedidos = new();
Punto p = new(1, 2);
Procesar(new() { Host = "x" });                  // si el parámetro tiene tipo concreto
```
Complementa a `var` (el tipo a la izquierda en vez de la derecha). Útil en **campos**, donde `var` no está permitido.

### 7.2 Raw string literals (C# 11)
Tres o más comillas: sin escapes, multilínea, con la indentación eliminada según la posición de las comillas de cierre:

```csharp
var json = """
    {
      "nombre": "Ana",
      "ruta": "C:\temp\archivo.txt"
    }
    """;                          // la indentación hasta aquí se elimina

var id = 42;
var plantilla = $$"""
    { "id": {{id}}, "tags": ["a", "b"] }
    """;                          // $$ → interpolación con {{ }}; las { } simples son literales
```

Ideal para JSON, SQL, XML, regex y tests. La cantidad de `$` define cuántas llaves abren una interpolación.

### 7.3 Alias de cualquier tipo (C# 12)
```csharp
using Punto3D = (double X, double Y, double Z);          // tuplas con nombre
using Matriz = int[][];
using ClientesPorPais = System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<string>>;

Punto3D origen = (0, 0, 0);
Console.WriteLine(origen.X);
```
Antes solo se podían aliasar tipos con nombre (no tuplas, arrays ni punteros).

### 7.4 Tipos `file` (C# 11)
```csharp
// Helpers.cs
file class Formateador      // visible SOLO dentro de este archivo
{
    public static string Formatear(decimal d) => d.ToString("C");
}
```
Pensado para **source generators** (Sesión 20) y helpers privados: evita choques de nombres entre archivos generados.

### 7.5 Lambdas: parámetros por defecto, `params` y tipo natural (C# 10/12)
```csharp
var saludar = (string nombre = "mundo") => $"Hola, {nombre}";   // C# 12: default en lambda
Console.WriteLine(saludar());          // Hola, mundo

var sumar = (params int[] nums) => nums.Sum();                  // C# 12: params en lambda
Console.WriteLine(sumar(1, 2, 3));     // 6

var parsear = (string s) => int.Parse(s);   // C# 10: tipo "natural" → Func<string,int> (antes no se podía 'var')
var ruta = [Obsolete] (int id) => id;       // C# 10: atributos en lambdas (útil en Minimal APIs)
```
Muy usado en Minimal APIs (Sesión 23): `app.MapGet("/items", (int page = 1) => ...)`.

### 7.6 `required` members (C# 11) — repaso
Visto en las Sesiones 15 y 17: obliga a inicializar un miembro en el object initializer. Encaja con `init` para DTOs inmutables sin constructores largos.

### 7.7 Static abstract members en interfaces (C# 11) — mención
Permiten *generic math* (`INumber<T>`): `T Sumar<T>(T a, T b) where T : INumber<T> => a + b;`. Lo retomamos en la Sesión 32 (evolución de C#).

---

## 8. Todo junto: un proyecto moderno "real"

Así se ve un servicio pequeño en C# 12 combinando lo aprendido (y lo de las Sesiones 15–17):

```csharp
// GlobalUsings.cs
global using System.Collections.Immutable;
```

```csharp
// Dominio/Pedido.cs
namespace Tienda.Dominio;                                     // file-scoped

public enum EstadoPedido { Pendiente, Pagado, Enviado }

public sealed record Linea(string Sku, int Cantidad, decimal PrecioUnitario)   // record (S.17)
{
    public decimal Subtotal => Cantidad * PrecioUnitario;
}

public sealed record Pedido(int Id, ImmutableArray<Linea> Lineas, EstadoPedido Estado)
{
    public decimal Total => Lineas.Sum(l => l.Subtotal);
}
```

```csharp
// Servicios/PedidoService.cs
using Tienda.Dominio;
namespace Tienda.Servicios;

public interface IPedidoRepositorio { Pedido? Buscar(int id); }

public class PedidoService(IPedidoRepositorio repo)           // primary ctor (S.18)
{
    private readonly IPedidoRepositorio _repo = repo;         // campo readonly explícito

    public string Resumen(int id) => _repo.Buscar(id) switch  // pattern matching (S.16)
    {
        null                                      => "No existe",       // NRT (S.15)
        { Lineas: [] }                            => "Pedido vacío",    // list pattern
        { Estado: EstadoPedido.Pendiente, Total: > 100_000 } p => $"Pendiente grande: {p.Total:C}",
        var p                                     => $"{p.Estado}: {p.Total:C}"
    };
}

public class RepoEnMemoria : IPedidoRepositorio
{
    private readonly Dictionary<int, Pedido> _datos = new()
    {
        [1] = new(1, [new("TEC-1", 2, 60_000m)], EstadoPedido.Pendiente),   // collection expr
        [2] = new(2, [], EstadoPedido.Pagado),
    };
    public Pedido? Buscar(int id) => _datos.GetValueOrDefault(id);
}
```

```csharp
// Program.cs — top-level statements
using Tienda.Servicios;

var servicio = new PedidoService(new RepoEnMemoria());
foreach (var id in (int[])[1, 2, 3])
    Console.WriteLine($"#{id}: {servicio.Resumen(id)}");
// #1: Pendiente grande: $120,000.00   (el formato :C depende de la cultura del sistema)
// #2: Pedido vacío
// #3: No existe
```

Fíjate en `(int[])[1, 2, 3]`: el cast le da al collection expression su tipo destino dentro de un `foreach`.

---

## 9. Tabla de decisión rápida

| Situación | Usa |
|---|---|
| `Program.cs` de una app | Top-level statements |
| Namespaces que *todo* el proyecto usa (logging, JSON) | `global using` / `<Using>` en `.csproj` |
| Cualquier archivo nuevo | File-scoped namespace |
| Servicio con dependencias inyectadas | Primary constructor (+ campo `readonly` si quieres garantía) |
| Tipo de datos con igualdad por valor | `record` (no primary ctor de clase) |
| Crear arrays/listas/spans | Collection expressions `[...]` |
| JSON/SQL embebido | Raw string literals `"""` |
| Tipo largo repetido (tuplas) | `using Alias = ...;` |

---

## Resumen mental de la sesión

```
Casi todo = AZÚCAR SINTÁCTICO: Roslyn lo reescribe (lowering) → el CLR no se entera

Top-level (C#9)     sentencias sueltas → class Program { <Main>$ } generado
                    1 archivo por proyecto · tipos al final · void/int/Task/Task<int> según await/return
global using (C#10) aplica a todo el proyecto · ImplicitUsings genera obj/*.GlobalUsings.g.cs
                    trampa: ambigüedades (Task, Timer) → alias
File-scoped ns      namespace X;   (uno por archivo, sin llaves)
Primary ctor (C#12) class S(IRepo repo) → parámetro CAPTURADO en scope
                    ≠ record: NO propiedad, NO público, NO readonly
                    trampa: mutable + doble almacenamiento (CS9124) → úsalo o para init o en métodos
Collection expr     int[] a = [1, 2];  List<int> l = [.. a, 3];  Span<int> s = [];
                    target-typed (var x = [..] NO compila) · compilador elige lo más eficiente
                    ..  spread (construye)  vs  ..  slice en list pattern (deconstruye)
Otros               new() · """raw""" · using Alias = (int, int); · file class · lambdas con defaults
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué significa que una feature sea "azúcar sintáctico"? Da tres ejemplos de esta sesión.
2. ❓ Con top-level statements, ¿qué genera el compilador y cómo decide la firma del `Main`?
3. ❓ ¿Por qué solo un archivo puede tener top-level statements?
4. ❓ ¿Qué son los implicit usings, dónde puedes ver cuáles se generaron y cómo quitas uno?
5. ❓ ¿Qué problema puede causar `global using` y cómo lo resuelves?
6. ❓ ¿Diferencia entre el primary constructor de un `record` y el de una `class` en C# 12?
7. ❓ ¿Los parámetros de un primary constructor de clase son `readonly`? ¿Qué pasa si los usas en un inicializador de propiedad *y* en un método?
8. ❓ Si una clase tiene primary constructor, ¿qué deben hacer los demás constructores?
9. ❓ ¿Por qué `var x = [1, 2, 3];` no compila?
10. ❓ ¿Qué hace el compilador con `List<int> l = [1, 2, 3];` y por qué puede ser más eficiente que un collection initializer?
11. ❓ ¿Diferencia entre `..` en una collection expression y en un list pattern?
12. ❓ ¿Cómo haces que tu propio tipo de colección soporte collection expressions?

## Ejercicio práctico
1. Crea `dotnet new console -o ModernoDemo`, compila y abre `obj/Debug/net8.0/ModernoDemo.GlobalUsings.g.cs` para ver los implicit usings generados.
2. Crea `GlobalUsings.cs` con un `global using static System.Math;` y usa `Sqrt(16)` sin prefijo. Luego quita `System.Net.Http` desde el `.csproj` con `<Using Remove=... />`.
3. Escribe un `Program.cs` con top-level statements que use `await Task.Delay(100)` y `return 3;`. Ejecuta y comprueba el exit code (`echo $?`). Explica qué firma de `Main` se generó.
4. Convierte una clase de servicio clásica (campos + ctor) a **primary constructor**. Luego provoca a propósito el warning **CS9124** usando el parámetro en un inicializador de propiedad y en un método; demuestra con un test manual que los dos valores divergen.
5. Reescribe con **collection expressions**: un array, una `List<T>`, un `Span<T>`, un `ImmutableArray<T>` y un array vacío. Usa spread para concatenar dos listas y un filtro LINQ.
6. Implementa un tipo propio `Bolsa<T>` con `[CollectionBuilder]` y créalo con `["a", "b"]`.
7. Arma el mini proyecto de §8 en tres archivos (Dominio, Servicios, Program) con file-scoped namespaces y ejecútalo.
8. (Opcional avanzado) Pega el código de §5 y §6 en <https://sharplab.io> y mira el C# "lowered": busca el campo `<repo>P` del primary constructor y cómo se construye la `List<int>` del collection expression.

---

➡️ **Cuando termines**, marca la Sesión 18 en el [README](Readme.md) y pídeme la **Sesión 19 — Span<T>, Memory<T> y código unsafe**.
