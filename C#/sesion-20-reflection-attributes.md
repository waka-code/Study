# Sesión 20 — Reflection y Attributes: código que se inspecciona a sí mismo

> **Objetivo de la sesión**: entender qué es la **metadata** de un assembly, cómo **Reflection** te permite leerla e invocar código en tiempo de ejecución, qué son los **Attributes** y cómo crear los tuyos, por qué Reflection es lenta y cómo se mitiga (caching, delegates compilados, expression trees), y por qué el mundo .NET moderno se está moviendo hacia **Source Generators** (compatibles con Native AOT). Al terminar deberías poder construir un mini-validador basado en atributos y explicar en una entrevista cómo ASP.NET Core, EF Core o xUnit "descubren" tu código.

---

## 1. Metadata: la base de todo

Recuerda de la **Sesión 1**: un assembly (`.dll`) contiene **IL + metadata**. Esa metadata es una descripción completa y estructurada de todo lo que hay dentro:

```
MiApp.dll
├── Manifest        → nombre, versión, cultura, referencias a otros assemblies
├── Metadata        → TABLAS: tipos, métodos, campos, propiedades, parámetros,
│                     atributos, genéricos, herencia, interfaces...
└── IL              → el cuerpo de cada método
```

Gracias a la metadata, el CLR sabe cómo cargar tipos, el JIT sabe qué compilar, el GC sabe qué campos son referencias, e IntelliSense sabe qué métodos mostrarte de una librería compilada. **Reflection es simplemente la API pública para leer (y usar) esa metadata desde tu propio código.**

> ❓ **Entrevista**: *"¿Qué es Reflection?"* → La capacidad de un programa de inspeccionar su propia estructura (tipos, miembros, atributos) en tiempo de ejecución a partir de la metadata de los assemblies, y de crear instancias, invocar métodos o leer/escribir campos de forma dinámica.

---

## 2. `Type`: la puerta de entrada

Todo empieza con un objeto `System.Type`, que describe un tipo. Hay tres formas de obtenerlo:

```csharp
// 1) En compilación, cuando conoces el tipo → typeof (el más rápido)
Type t1 = typeof(List<int>);

// 2) Desde una instancia en runtime → GetType() (devuelve el tipo REAL, no el declarado)
object o = "hola";
Type t2 = o.GetType();                 // System.String

// 3) Desde un string → Type.GetType (necesita el nombre calificado si no está en mscorlib/el assembly actual)
Type? t3 = Type.GetType("System.Text.StringBuilder");
```

```csharp
Type t = typeof(Dictionary<string, int>);

Console.WriteLine(t.Name);             // Dictionary`2  ← `2 = aridad genérica
Console.WriteLine(t.FullName);         // System.Collections.Generic.Dictionary`2[[System.String, ...
Console.WriteLine(t.Namespace);        // System.Collections.Generic
Console.WriteLine(t.Assembly.GetName().Name);  // System.Private.CoreLib
Console.WriteLine(t.IsClass);          // True
Console.WriteLine(t.IsValueType);      // False
Console.WriteLine(t.IsGenericType);    // True
Console.WriteLine(string.Join(", ", t.GetGenericArguments().Select(a => a.Name)));  // String, Int32
Console.WriteLine(t.BaseType);         // System.Object
Console.WriteLine(t.GetInterfaces().Length);    // varias (IDictionary`2, IEnumerable...)
```

> ⚠️ `typeof(Animal)` vs `animal.GetType()`: si `animal` es una variable de tipo `Animal` que contiene un `Perro`, `GetType()` devuelve `Perro`. `typeof` es estático (compilación); `GetType()` es dinámico (runtime).

---

## 3. El modelo de objetos de Reflection

```
Assembly
  └── Module
        └── Type ─────────────────────────────┐
              ├── ConstructorInfo             │ todos heredan de
              ├── MethodInfo  ── ParameterInfo│ MemberInfo
              ├── PropertyInfo                │ (Name, DeclaringType,
              ├── FieldInfo                   │  CustomAttributes...)
              └── EventInfo  ─────────────────┘
```

### 3.1 Enumerar miembros y `BindingFlags`

```csharp
using System.Reflection;

public class Cuenta
{
    private decimal _saldo;
    public string Titular { get; set; } = "";
    public decimal Saldo => _saldo;
    public void Depositar(decimal monto) => _saldo += monto;
    private void Auditar(string msg) => Console.WriteLine($"[audit] {msg}");
    public static Cuenta Crear(string t) => new() { Titular = t };
}

Type t = typeof(Cuenta);

// Por defecto: solo miembros PÚBLICOS (de instancia y estáticos)
foreach (MethodInfo m in t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
    Console.WriteLine($"{m.ReturnType.Name} {m.Name}({string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
// String get_Titular()      ← ¡las propiedades son métodos get_/set_ en IL!
// Void set_Titular(String value)
// Decimal get_Saldo()
// Void Depositar(Decimal monto)

// Privados: hay que pedirlos explícitamente
FieldInfo? campo = t.GetField("_saldo", BindingFlags.NonPublic | BindingFlags.Instance);
```

| `BindingFlags` | Significado |
|---|---|
| `Public` / `NonPublic` | Visibilidad (debes indicar al menos uno) |
| `Instance` / `Static` | Tipo de miembro (debes indicar al menos uno) |
| `DeclaredOnly` | Excluye miembros heredados |
| `IgnoreCase` | Búsqueda por nombre insensible a mayúsculas |
| `FlattenHierarchy` | Incluye estáticos públicos/protegidos de clases base |

> ⚠️ El error más común: `t.GetMethod("Auditar")` devuelve `null` porque es privado. Si pasas `BindingFlags` debes pasar **ambas** dimensiones (visibilidad + instancia/static), si no, no encuentra nada.

### 3.2 Crear instancias, invocar métodos, leer/escribir

```csharp
Type t = typeof(Cuenta);

// Crear instancia (constructor sin parámetros)
object cuenta = Activator.CreateInstance(t)!;

// Escribir propiedad
t.GetProperty("Titular")!.SetValue(cuenta, "Ana");

// Invocar método público
t.GetMethod("Depositar")!.Invoke(cuenta, new object[] { 100m });   // args van boxeados en object[]

// Invocar método PRIVADO (Reflection se salta el encapsulamiento)
t.GetMethod("Auditar", BindingFlags.NonPublic | BindingFlags.Instance)!
 .Invoke(cuenta, new object[] { "depósito ok" });                   // [audit] depósito ok

// Leer campo privado
var saldo = (decimal)t.GetField("_saldo", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(cuenta)!;
Console.WriteLine(saldo);   // 100

// Método estático: el target es null
var c2 = (Cuenta)t.GetMethod("Crear")!.Invoke(null, new object[] { "Luis" })!;
```

> ⚠️ Si el método invocado lanza una excepción, `Invoke` la envuelve en **`TargetInvocationException`**; la original está en `.InnerException` (Sesión 12). Desde .NET 5 puedes usar `BindingFlags.DoNotWrapExceptions`.

> ❓ **Entrevista**: *"¿Reflection puede acceder a miembros privados? ¿Eso rompe el encapsulamiento?"* → Sí puede. El encapsulamiento en C# es una garantía del **compilador**, no una barrera de seguridad. Por eso nunca debes considerar `private` como mecanismo de seguridad contra código que corre en tu mismo proceso.

### 3.3 Genéricos en runtime

```csharp
// Construir List<T> donde T se conoce solo en runtime
Type elemento = typeof(DateTime);
Type listaCerrada = typeof(List<>).MakeGenericType(elemento);    // List<DateTime>
var lista = (System.Collections.IList)Activator.CreateInstance(listaCerrada)!;
lista.Add(DateTime.Now);

// Invocar un método genérico: Enumerable.Empty<T>()
MethodInfo empty = typeof(Enumerable).GetMethod(nameof(Enumerable.Empty))!
                                      .MakeGenericMethod(typeof(string));
var vacio = empty.Invoke(null, null);   // IEnumerable<string>
```

`typeof(List<>)` es un **tipo genérico abierto** (open generic); `List<DateTime>` es **cerrado**. Los contenedores de DI registran tipos abiertos así (`services.AddScoped(typeof(IRepo<>), typeof(Repo<>))`, **Sesión 24**).

### 3.4 Escanear assemblies (cómo funcionan los frameworks)

```csharp
// Encontrar todas las implementaciones concretas de una interfaz — típico en "plugins" o registro automático
public interface IHandler { void Handle(); }

var handlers = Assembly.GetExecutingAssembly()
    .GetTypes()
    .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IHandler).IsAssignableFrom(t))
    .Select(t => (IHandler)Activator.CreateInstance(t)!)
    .ToList();

handlers.ForEach(h => h.Handle());
```

Así es, a grandes rasgos, como **xUnit** encuentra métodos `[Fact]`, **ASP.NET Core** encuentra controllers, **MediatR** encuentra handlers y **EF Core** descubre `IEntityTypeConfiguration<T>`.

---

## 4. Attributes: metadata declarativa

Un **attribute** es una clase que hereda de `System.Attribute` y que puedes "pegar" a elementos del código (clases, métodos, propiedades, parámetros, assemblies…). El compilador lo **serializa en la metadata**. Por sí solo **no hace nada**: alguien (el compilador, el runtime, un framework o tu código vía Reflection) tiene que leerlo y actuar.

```csharp
[Obsolete("Usa CalcularV2", error: false)]     // el COMPILADOR lo lee → warning CS0618
public int Calcular() => 1;

[Serializable]                                  // el runtime / serializadores
public class Dto { }

[HttpGet("api/usuarios/{id}")]                  // ASP.NET Core lo lee por Reflection
public IActionResult Get(int id) => Ok();

[Fact]                                          // xUnit lo lee para descubrir tests
public void Suma_funciona() { }
```

Tipos de consumidores de atributos:

| Quién lo lee | Ejemplos |
|---|---|
| **Compilador** | `[Obsolete]`, `[Conditional("DEBUG")]`, `[CallerMemberName]`, `[NotNullWhen]` (Sesión 15), `[SetsRequiredMembers]` |
| **Runtime / JIT** | `[MethodImpl(AggressiveInlining)]`, `[StructLayout]`, `[ThreadStatic]`, `[DllImport]` |
| **Frameworks vía Reflection** | `[Route]`, `[Required]`, `[Key]`, `[JsonPropertyName]`, `[Fact]`, `[Authorize]` |
| **Source Generators** (compilación) | `[JsonSerializable]`, `[LoggerMessage]`, `[GeneratedRegex]`, `[LibraryImport]` |

> ❓ **Entrevista**: *"¿Un atributo ejecuta código?"* → No por sí mismo. Es metadata. Su constructor solo se ejecuta cuando alguien lo **materializa** con `GetCustomAttribute(s)`. El comportamiento lo aporta quien lo lee.

### 4.1 Sintaxis

```csharp
[Serializable, Obsolete]                    // varios en una línea
[Route("api/[controller]")]                 // argumento posicional (→ constructor)
[JsonPropertyName("nombre_completo")]
[Range(1, 120, ErrorMessage = "Edad inválida")]  // posicionales + nombrados (→ propiedades públicas)

// Targets explícitos cuando hay ambigüedad
[assembly: InternalsVisibleTo("MiApp.Tests")]      // a nivel de assembly
[return: NotNull]                                   // sobre el valor de retorno
public record Persona([property: JsonPropertyName("n")] string Nombre);  // sobre la propiedad generada (Sesión 17)
```

El sufijo `Attribute` se omite al usarlo: `ObsoleteAttribute` → `[Obsolete]`.

> ⚠️ Los argumentos de un atributo deben ser **constantes de compilación**: primitivos, `string`, `Type` (`typeof`), enums, o arrays unidimensionales de esos. No puedes pasar `new DateTime(...)` ni una variable. Desde C# 11 existen **atributos genéricos**: `[Validator<EmailRule>]`.

---

## 5. Crear tus propios attributes

```csharp
[AttributeUsage(AttributeTargets.Property, AllowMultiple = false, Inherited = true)]
public sealed class LongitudAttribute : Attribute
{
    public int Min { get; }
    public int Max { get; }
    public string? Mensaje { get; init; }          // parámetro NOMBRADO opcional

    public LongitudAttribute(int min, int max)     // parámetros POSICIONALES
    {
        Min = min;
        Max = max;
    }
}

[AttributeUsage(AttributeTargets.Property)]
public sealed class ObligatorioAttribute : Attribute { }
```

| Parámetro de `AttributeUsage` | Qué controla |
|---|---|
| `AttributeTargets` | Dónde se puede aplicar (`Class`, `Method`, `Property`, `Parameter`, `All`…). El compilador valida. |
| `AllowMultiple` | Si se puede repetir en el mismo elemento |
| `Inherited` | Si las clases derivadas "heredan" el atributo al consultarlo con `inherit: true` |

> 💡 Marca tus atributos como `sealed`: Reflection los busca más rápido y comunicas intención (Sesión 5).

### 5.1 Leerlos: un mini-validador

```csharp
using System.Reflection;

public class Usuario
{
    [Obligatorio]
    [Longitud(3, 20, Mensaje = "El nombre debe tener entre 3 y 20 caracteres")]
    public string? Nombre { get; set; }

    [Obligatorio]
    public string? Email { get; set; }

    public int Edad { get; set; }
}

public static class Validador
{
    public static IReadOnlyList<string> Validar(object obj)
    {
        var errores = new List<string>();

        foreach (PropertyInfo prop in obj.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            object? valor = prop.GetValue(obj);

            if (prop.IsDefined(typeof(ObligatorioAttribute)) &&        // IsDefined NO instancia el atributo: más barato
                (valor is null || valor is string { Length: 0 }))
            {
                errores.Add($"{prop.Name} es obligatorio");
                continue;
            }

            var lon = prop.GetCustomAttribute<LongitudAttribute>();     // instancia el atributo (ejecuta su ctor)
            if (lon is not null && valor is string s && (s.Length < lon.Min || s.Length > lon.Max))
                errores.Add(lon.Mensaje ?? $"{prop.Name}: longitud fuera de rango [{lon.Min},{lon.Max}]");
        }
        return errores;
    }
}

var u = new Usuario { Nombre = "Al", Email = "" };
foreach (var e in Validador.Validar(u)) Console.WriteLine(e);
// El nombre debe tener entre 3 y 20 caracteres
// Email es obligatorio
```

Esto es, en esencia, lo que hace `System.ComponentModel.DataAnnotations` (`[Required]`, `[StringLength]`, `[Range]`) que ASP.NET Core ejecuta automáticamente al hacer model binding (**Sesión 23**).

> ❓ **Entrevista**: *"¿Diferencia entre `IsDefined` y `GetCustomAttribute`?"* → `IsDefined` solo verifica la presencia en la metadata sin construir el objeto; `GetCustomAttribute` deserializa los argumentos y ejecuta el constructor, creando una instancia nueva **en cada llamada** (no se cachea).

---

## 6. Rendimiento: por qué Reflection es lenta

Una llamada directa `cuenta.Depositar(100)` compila a un `call` directo que el JIT puede incluso inlinear. `MethodInfo.Invoke` hace, en cada llamada:

```
1. Validar que el target es del tipo correcto
2. Validar número y tipo de argumentos
3. Boxear los value types en object[]  → asignaciones en heap
4. Chequeos de seguridad/accesibilidad
5. Llamar al método a través de un stub genérico
6. Boxear el valor de retorno
```

Orden de magnitud aproximado (depende mucho de versión y hardware; .NET 7+ mejoró `Invoke` notablemente):

| Técnica | Coste relativo |
|---|---|
| Llamada directa | 1× |
| Delegate compilado (`CreateDelegate`) | ~1–2× |
| Expression tree compilada | ~1–2× (tras el coste inicial de compilar) |
| `MethodInfo.Invoke` | ~10–50× |
| `GetMethod(...)` + `Invoke` en cada llamada | ~100×+ |
| `dynamic` | caching en call-site; rápido tras la 1ª llamada, pero lento el primer uso |

### 6.1 Estrategias de mitigación

**1) Cachear la metadata** — `GetProperties()`/`GetMethod()` son caros; hazlo una vez por tipo:

```csharp
using System.Collections.Concurrent;

static class PropsCache
{
    private static readonly ConcurrentDictionary<Type, PropertyInfo[]> _cache = new();
    public static PropertyInfo[] Get(Type t) => _cache.GetOrAdd(t, static x => x.GetProperties());
}
```

**2) Convertir `MethodInfo` en delegate tipado** — después la llamada es casi directa:

```csharp
MethodInfo mi = typeof(Cuenta).GetMethod(nameof(Cuenta.Depositar))!;
var depositar = mi.CreateDelegate<Action<Cuenta, decimal>>();   // "open instance delegate"

var c = new Cuenta();
for (int i = 0; i < 1_000_000; i++)
    depositar(c, 1m);                 // sin boxing, sin validaciones por llamada
```

**3) Expression trees compiladas** — para getters/setters genéricos (lo que hacían AutoMapper o Dapper históricamente):

```csharp
using System.Linq.Expressions;

static Func<object, object?> CrearGetter(PropertyInfo prop)
{
    // (object o) => (object)((Usuario)o).Nombre
    var param = Expression.Parameter(typeof(object), "o");
    var cuerpo = Expression.Convert(
        Expression.Property(Expression.Convert(param, prop.DeclaringType!), prop),
        typeof(object));
    return Expression.Lambda<Func<object, object?>>(cuerpo, param).Compile();
}

var getNombre = CrearGetter(typeof(Usuario).GetProperty("Nombre")!);
Console.WriteLine(getNombre(new Usuario { Nombre = "Eva" }));   // Eva
```

Los expression trees ya los viste como "código como datos" en LINQ (**Sesión 9**, `IQueryable`); aquí los usamos para *generar* código en runtime.

**4) `UnsafeAccessor` (.NET 8)** — acceso a miembros privados **sin Reflection**, resuelto por el JIT, compatible con AOT:

```csharp
using System.Runtime.CompilerServices;

static class CuentaHack
{
    [UnsafeAccessor(UnsafeAccessorKind.Field, Name = "_saldo")]
    public static extern ref decimal Saldo(Cuenta c);      // devuelve ref al campo privado
}

var cta = new Cuenta();
CuentaHack.Saldo(cta) = 500m;           // escribe el campo privado a velocidad nativa
Console.WriteLine(cta.Saldo);           // 500
```

> ⚠️ Nunca uses Reflection en un *hot path* sin cache. El patrón "`GetProperty` dentro de un loop" es uno de los problemas de rendimiento más frecuentes en code reviews.

---

## 7. Reflection, trimming y Native AOT

Reflection tiene un problema moderno más grave que la velocidad: **es opaca para las herramientas de análisis estático**.

- **Trimming** (`PublishTrimmed`): el linker elimina el código que "nadie usa". Si solo llamas a un método por su nombre en un string (`GetMethod("Depositar")`), el linker no lo ve → lo elimina → `null` en runtime.
- **Native AOT** (Sesión 1 y **Sesión 31**): no hay JIT, así que no puedes generar código en runtime. `Reflection.Emit` no funciona; `Expression.Compile()` cae a un intérprete lento; `MakeGenericType` con value types puede fallar.

El compilador te avisa con warnings `IL2026`, `IL2070`, `IL3050`… Puedes anotar tu código para ayudar al linker:

```csharp
using System.Diagnostics.CodeAnalysis;

// Le dice al trimmer: "preserva los constructores públicos del tipo que pasen aquí"
static T Crear<[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)] T>()
    => Activator.CreateInstance<T>();

[RequiresUnreferencedCode("Escanea tipos por Reflection; no es seguro con trimming")]
static void RegistrarTodo() { /* ... */ }
```

---

## 8. Source Generators: la alternativa moderna

Un **Source Generator** es un plugin de Roslyn que corre **durante la compilación**, inspecciona tu código (incluidos tus atributos) y **genera código C# adicional** que se compila junto al tuyo. Es "Reflection en tiempo de compilación".

```
            Reflection clásica                   Source Generator
            ──────────────────                   ────────────────
Cuándo:     runtime                              build time
Coste:      en cada ejecución (arranque/hot)     cero en runtime
AOT/Trim:   problemático                         ✅ totalmente compatible
Errores:    en producción                        en compilación
Debug:      difícil                              ves el código generado
```

Ejemplos que ya existen en .NET 8 y que deberías preferir:

```csharp
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

// 1) System.Text.Json sin Reflection
[JsonSerializable(typeof(Usuario))]
internal partial class AppJsonContext : JsonSerializerContext { }
// uso: JsonSerializer.Serialize(u, AppJsonContext.Default.Usuario);

// 2) Regex compilado en build time
public static partial class Patrones
{
    [GeneratedRegex(@"^[\w.+-]+@[\w-]+\.[\w.]+$", RegexOptions.IgnoreCase)]
    public static partial Regex Email();
}

// 3) Logging de alto rendimiento
public static partial class Logs
{
    [LoggerMessage(Level = LogLevel.Information, Message = "Usuario {Id} creado")]
    public static partial void UsuarioCreado(ILogger logger, int id);
}
```

Fíjate en el patrón: **atributo + `partial`**. Tú declaras la firma, el generador escribe el cuerpo. Los atributos siguen siendo la interfaz; lo que cambia es *quién* los lee y *cuándo*.

> ❓ **Entrevista**: *"¿Por qué .NET empuja Source Generators en vez de Reflection?"* → Porque mueven el trabajo de runtime a build time: arranque más rápido, cero coste por llamada, errores en compilación y compatibilidad con trimming y Native AOT (clave para contenedores y serverless).

---

## 9. Otras piezas relacionadas

| Herramienta | Qué es | Cuándo |
|---|---|---|
| `dynamic` | Enlace tardío vía DLR; el compilador no verifica | Interop COM, JSON dinámico. Evitar en código de negocio. |
| `Reflection.Emit` | Generar IL en runtime (`DynamicMethod`, `TypeBuilder`) | Proxies (Castle, Moq — **Sesión 27**), ORMs antiguos. No funciona en AOT. |
| `nameof(x)` | Nombre del símbolo como string **en compilación** | Siempre en vez de strings mágicos: `GetMethod(nameof(Cuenta.Depositar))` |
| `[CallerMemberName]`, `[CallerArgumentExpression]` | El compilador inyecta información del llamador | Logging, `INotifyPropertyChanged`, guard clauses |
| `AssemblyLoadContext` | Cargar/descargar assemblies aislados | Sistemas de plugins |

```csharp
// CallerArgumentExpression (C# 10): mensajes de error automáticos, sin Reflection
static void NoNulo(object? valor, [CallerArgumentExpression(nameof(valor))] string? expr = null)
{
    if (valor is null) throw new ArgumentNullException(expr);
}

NoNulo(usuario.Email);    // ArgumentNullException: "usuario.Email"
// Es lo que hace ArgumentNullException.ThrowIfNull(x) internamente.
```

---

## Resumen mental de la sesión

```
Assembly = IL + METADATA   ← Reflection lee la metadata en runtime

Type  (typeof = compilación · GetType() = runtime real)
 ├── GetMethods / GetProperties / GetFields (BindingFlags: visibilidad + instancia/static)
 ├── Activator.CreateInstance · MethodInfo.Invoke · PropertyInfo.Get/SetValue
 └── MakeGenericType / MakeGenericMethod (genéricos abiertos → cerrados)

Attribute = clase : Attribute → metadata declarativa, NO ejecuta nada sola
 ├── [AttributeUsage(Targets, AllowMultiple, Inherited)]
 ├── args = constantes de compilación
 └── lectores: compilador · runtime · frameworks (Reflection) · Source Generators

Reflection es lenta → cache + CreateDelegate + Expression.Compile + UnsafeAccessor
Reflection rompe trimming/AOT → anotaciones [DynamicallyAccessedMembers]
Futuro: Source Generators (atributo + partial) → trabajo en build time
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es la metadata de un assembly y qué relación tiene con Reflection?
2. ❓ Diferencia entre `typeof(T)` y `obj.GetType()`.
3. ❓ ¿Por qué `GetMethod("X")` puede devolver `null` aunque el método exista? ¿Qué son los `BindingFlags`?
4. ❓ ¿Puede Reflection acceder a miembros privados? ¿Qué implica para la seguridad?
5. ❓ ¿Qué es un atributo? ¿Ejecuta código? ¿Quién lo "activa"?
6. ❓ ¿Qué controla `AttributeUsage`? ¿Qué tipos de argumentos acepta un atributo?
7. ❓ ¿Por qué Reflection es lenta y cómo optimizarías un código que la usa intensivamente?
8. ❓ ¿Qué excepción lanza `MethodInfo.Invoke` si el método falla?
9. ❓ ¿Qué problemas tiene Reflection con trimming y Native AOT?
10. ❓ ¿Qué es un Source Generator y qué ventajas tiene sobre Reflection? Da dos ejemplos del BCL.
11. ❓ ¿Cómo descubre xUnit (o ASP.NET Core) tus tests (o controllers)?

## Ejercicio práctico
1. Crea `dotnet new console -o ReflectionLab`.
2. Escribe un método `Describir(Type t)` que imprima: nombre, namespace, clase base, interfaces, y cada método público declarado con su firma completa. Pruébalo con `typeof(string)` y con una clase tuya.
3. Implementa los atributos `[Obligatorio]` y `[Longitud]` y el `Validador` de la sección 5.1. Agrega un tercer atributo `[Rango(min, max)]` para `int`.
4. Optimiza el validador: cachea los `PropertyInfo[]` y los atributos por tipo en un `ConcurrentDictionary`. Mide con `Stopwatch` validando 1 millón de objetos antes y después.
5. Crea una interfaz `IComando` con tres implementaciones y un "dispatcher" que las descubra escaneando el assembly y las ejecute por nombre (`"saludar"` → `SaludarComando`), usando un atributo `[Comando("saludar")]`.
6. Usa `[UnsafeAccessor]` para leer un campo privado de una clase tuya y compara el tiempo contra `FieldInfo.GetValue` en un loop de 10 millones.
7. (Opcional avanzado) Agrega `<PublishAot>true</PublishAot>` al `.csproj`, ejecuta `dotnet publish -c Release` y lee los warnings `IL2xxx`/`IL3xxx` que aparecen. Reemplaza la serialización JSON por un `JsonSerializerContext`.

---

➡️ **Cuando termines**, marca la Sesión 20 en el [README](Readme.md) y pídeme la **Sesión 21 — .NET SDK, CLI, estructura de proyecto y NuGet**.
