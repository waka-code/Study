# Sesión 31 — Internals del CLR: JIT tiers, AOT, boxing y VTable

> **Objetivo de la sesión**: abrir el capó del runtime que presentamos en la Sesión 1. Al terminar deberías poder dibujar cómo es un objeto en memoria (header + MethodTable + campos), explicar cómo funciona una llamada virtual (VTable) y por qué `sealed` ayuda, detectar *boxing* oculto leyendo IL, describir la compilación por niveles (Tier0 → Tier1, OSR, Dynamic PGO), y comparar JIT, ReadyToRun y Native AOT con sus trade-offs reales.

---

## 1. Mapa general: qué hay dentro del CLR

En la Sesión 1 dijimos "el CLR ejecuta tu IL con JIT y GC". Ahora con más detalle (nombres de **CoreCLR**, el runtime de .NET moderno):

```
                         ┌───────────────── Proceso .NET ─────────────────┐
  MiApp.dll (IL +        │                                                 │
  metadata) ────────────►│  Class Loader  ──► crea MethodTables / EEClass  │
                         │       │                                         │
                         │       ▼                                         │
                         │  JIT (RyuJIT) ──► código nativo (Tier0/Tier1)   │
                         │       │              ▲                          │
                         │       │     ReadyToRun (código precompilado)    │
                         │       ▼                                         │
                         │  Ejecución ◄──► GC (heaps Gen0/1/2, LOH, POH)   │
                         │       │                                         │
                         │  Thread pool · Excepciones · Interop (P/Invoke) │
                         │  Type system · Seguridad de tipos · Reflection  │
                         └─────────────────────────────────────────────────┘
```

| Componente | Responsabilidad |
|---|---|
| **Class loader** | Lee la metadata del assembly y construye en memoria las estructuras de cada tipo cuando se usa por primera vez |
| **JIT (RyuJIT)** | Traduce IL → código máquina, método a método, la primera vez que se llama |
| **GC** | Asigna y libera memoria del heap administrado (Sesión 14) |
| **Execution engine (VM)** | Stubs de llamada, dispatch virtual/interfaces, excepciones, hilos, interop |

Herramientas para "mirar dentro" en esta sesión:
- **SharpLab** (<https://sharplab.io>): pega C# y ve el código "bajado" (*lowered*), el IL y el ensamblador JIT.
- **ILSpy / dotnet-ildasm**: ver el IL de tus `.dll`.
- **`DOTNET_JitDisasm`** (.NET 7+): el runtime imprime el ensamblador de un método: `DOTNET_JitDisasm="Sumar" dotnet run -c Release`.

---

## 2. Anatomía de un objeto en memoria

Cada instancia de una **clase** (tipo referencia) vive en el heap con esta forma (x64):

```
 variable 'p' (en el stack o en un campo)
      │
      │  la referencia apunta AQUÍ ▼ (no al inicio del bloque)
      │
 ┌────┴──────────────────────────────────┐
 │ Object header (8 bytes)  offset -8    │  ← sync block index / hash code / bits de lock "thin"
 ├───────────────────────────────────────┤
 │ MethodTable* (8 bytes)   offset 0     │  ← puntero al "tipo" del objeto
 ├───────────────────────────────────────┤
 │ campos de instancia      offset 8...  │  ← int Edad, string Nombre (referencia), ...
 └───────────────────────────────────────┘
```

- **Object header**: usado por `lock` (Monitor almacena ahí un "thin lock" o el índice a un *sync block*), por `GetHashCode()` por defecto, y por el GC.
- **MethodTable pointer**: identifica el tipo exacto. `obj.GetType()`, los casts y el dispatch virtual lo leen.
- **Tamaño mínimo de un objeto en x64: 24 bytes** (header + MT + 8 bytes mínimo para campos), aunque la clase esté vacía.

```csharp
class Vacia { }
class Punto { public int X; public int Y; }   // 8 + 8 + 4 + 4 = 24 bytes
// Un array: header + MT + longitud (8, con padding) + elementos
// int[10] ≈ 8 + 8 + 8 + 40 = 64 bytes
```

Un **struct** (tipo valor) **no tiene** header ni MethodTable pointer cuando está en el stack, en un campo o dentro de un array: son solo sus campos. Por eso `Punto` como struct ocupa 8 bytes y como class 24 + la referencia de 8 que apunta a él. Esta es la raíz de todo lo que veremos sobre boxing.

### 2.1 MethodTable y EEClass

```
 MethodTable (datos "calientes", usados en cada llamada)
 ┌──────────────────────────────────────┐
 │ flags, tamaño de instancia           │
 │ puntero a MethodTable padre          │──► MethodTable de la clase base
 │ puntero a EEClass                    │──► EEClass (datos "fríos": metadata, campos, nombres)
 │ mapa de interfaces                   │
 │ ─── VTable ─────────────────────     │
 │ slot 0: Object.ToString              │
 │ slot 1: Object.Equals                │
 │ slot 2: Object.GetHashCode           │
 │ slot 3: Object.Finalize              │
 │ slot 4..n: métodos virtuales propios │
 └──────────────────────────────────────┘
```

Hay **una MethodTable por tipo** (no por objeto). Todas las instancias de `Punto` apuntan a la misma.

> ❓ **Entrevista**: *"¿Qué contiene cada objeto del heap además de sus campos?"* → Un object header (8 bytes en x64, para locks, hash y GC) y un puntero a la MethodTable de su tipo (8 bytes). Por eso el mínimo es 24 bytes y por eso muchos objetos pequeños son caros.

---

## 3. Dispatch de métodos: estático, virtual e interfaz

### 3.1 Llamada no virtual

```csharp
public class Calculadora
{
    public int Sumar(int a, int b) => a + b;   // no virtual
}
```

La dirección del método se conoce en tiempo de JIT: `call <dirección>`. Además el JIT puede **inlinearlo** (copiar su cuerpo en el llamador), eliminando la llamada por completo.

### 3.2 Llamada virtual: la VTable

```csharp
public abstract class Figura
{
    public abstract double Area();
    public override string ToString() => $"Figura de área {Area():F2}";
}
public class Circulo(double r) : Figura
{
    public override double Area() => Math.PI * r * r;
}
public sealed class Cuadrado(double lado) : Figura
{
    public override double Area() => lado * lado;
}
```

```
 MethodTable Figura          MethodTable Circulo          MethodTable Cuadrado
 slot 0: Figura.ToString     slot 0: Figura.ToString      slot 0: Figura.ToString
 ...                         ...                          ...
 slot 4: (abstracto)         slot 4: Circulo.Area         slot 4: Cuadrado.Area
```

Un `override` **reemplaza** el contenido del mismo slot; un método `new` (Sesión 5) crea un slot nuevo, por eso no hay polimorfismo con `new`.

Para `figura.Area()` el código máquina hace, conceptualmente:

```
mov rax, [rcx]          ; 1. lee el MethodTable* del objeto
mov rax, [rax + 0x..]   ; 2. lee el bloque de la VTable
call [rax + slot*8]     ; 3. llamada INDIRECTA al slot 4
```

Coste: 2 lecturas de memoria + llamada indirecta (y **no se puede inlinear**, salvo devirtualización). Es poco (~1-2 ns), pero en bucles calientes suma.

### 3.3 `callvirt` y el chequeo de null

En IL, C# emite `callvirt` incluso para métodos **no** virtuales de instancia. ¿Por qué? Porque `callvirt` garantiza una `NullReferenceException` si la referencia es null (sin él, podrías ejecutar un método de instancia con `this == null`). El JIT, al ver que el método no es virtual, lo convierte en una llamada directa + chequeo de null barato.

### 3.4 Llamadas a interfaces

Una clase puede implementar muchas interfaces en órdenes distintos, así que no existe un "slot fijo" universal para `IComparable.CompareTo`. CoreCLR usa **Virtual Stub Dispatch (VSD)**: el sitio de llamada empieza con un *stub* que resuelve el método y luego cachea el resultado según el tipo observado (monomórfico → rápido; polimórfico → busca en una tabla hash). Es algo más caro que una llamada virtual normal.

### 3.5 Devirtualización: por qué `sealed` importa

Si el JIT **sabe** el tipo exacto, puede convertir una llamada virtual en directa (y luego inlinearla):

```csharp
Cuadrado c = new Cuadrado(3);
double a = c.Area();     // Cuadrado es sealed → nadie puede sobrescribir Area → llamada directa + inline
```

Casos en que el JIT devirtualiza:
- El tipo es `sealed` o el método es `sealed override`.
- El objeto se acaba de crear con `new` en el mismo método (tipo exacto conocido).
- **Guarded Devirtualization (GDV)** con Dynamic PGO (sección 5): *"en el 95% de las llamadas observé `Circulo`"* → genera `if (obj.GetType() == typeof(Circulo)) { código inline } else { llamada virtual }`.

> ❓ **Entrevista**: *"¿Marcar clases como `sealed` mejora el rendimiento?"* → Sí, un poco: permite al JIT devirtualizar e inlinear llamadas a métodos virtuales, y hace más baratos los casts (`is`/`as`) contra ese tipo (basta comparar un MethodTable pointer). Además comunica intención de diseño. Buena práctica: `sealed` por defecto en clases que no están diseñadas para herencia.

---

## 4. Boxing y unboxing a nivel de IL

**Boxing** = convertir un value type en un objeto del heap: se asigna un objeto (header + MethodTable + copia del valor). **Unboxing** = verificar el tipo y copiar el valor de vuelta.

```csharp
int x = 42;
object o = x;       // boxing: nuevo objeto de 24 bytes en el heap con una COPIA de 42
x = 100;            // 'o' sigue valiendo 42 (es una copia)
int y = (int)o;     // unboxing: chequea que 'o' sea exactamente un int boxeado y copia
long z = (long)o;   // ⚠️ InvalidCastException: solo puedes hacer unboxing al tipo EXACTO
long w = (int)o;    // ✅ unboxing a int y luego conversión a long
```

IL generado (lo puedes ver en SharpLab):

```
ldc.i4.s   42
stloc.0                          // x = 42
ldloc.0
box        [System.Runtime]System.Int32     // ← ASIGNACIÓN en el heap
stloc.1                          // o = box(x)
ldloc.1
unbox.any  [System.Runtime]System.Int32     // ← chequeo de tipo + copia
stloc.2                          // y
```

Regla de lectura: **cada instrucción `box` en IL es una asignación en el heap**.

```
   STACK                       HEAP
 ┌─────────┐              ┌──────────────────────┐
 │ x = 100 │              │ header               │
 ├─────────┤              │ MT* → System.Int32   │
 │ o ──────┼─────────────►│ 42                   │
 └─────────┘              └──────────────────────┘
```

### 4.1 Dónde se esconde el boxing

| Situación | ¿Por qué boxea? | Solución |
|---|---|---|
| Pasar un struct a un parámetro `object` | Conversión implícita a `object` | Sobrecargas tipadas o genéricos |
| Asignar un struct a una **interfaz** (`IComparable c = miStruct;`) | Las interfaces son tipos referencia | Genéricos con constraint `where T : IComparable<T>` |
| Colecciones no genéricas (`ArrayList`, `Hashtable`) | Guardan `object` | `List<T>`, `Dictionary<K,V>` (Sesión 7) |
| Llamar `ToString()`/`GetHashCode()`/`Equals()` **no sobrescritos** en un struct | El método vive en `ValueType`/`Object` y necesita un `this` referencia | Sobrescríbelos (o usa `record struct`, Sesión 17) |
| `Equals(object)` de un struct | El argumento es `object` | Implementar `IEquatable<T>` |
| `string.Format("{0}", 5)` / `Console.WriteLine("{0}", 5)` | Parámetros `object` | Interpolación (`$"{5}"`): desde C# 10 usa *interpolated string handlers* sin boxing |
| `foreach` sobre `IEnumerable<T>` de un `List<T>` | El enumerador struct de `List<T>` se boxea al tratarse como `IEnumerator<T>` | Iterar el tipo concreto cuando importe |
| `enum` pasado como `Enum` u `object` | `Enum` es tipo referencia | Genéricos `where T : struct, Enum` |

⚠️ **El `GetHashCode` por defecto de un struct** (`ValueType.GetHashCode`) puede usar **reflection** y, si el struct tiene campos referencia, en algunos casos solo considera el primer campo → hashes lentos y con muchas colisiones. Si usas un struct como clave de `Dictionary`, sobrescribe `Equals`/`GetHashCode` e implementa `IEquatable<T>`, o usa `readonly record struct`.

### 4.2 Genéricos y la instrucción `constrained.`

```csharp
static int Comparar<T>(T a, T b) where T : IComparable<T> => a.CompareTo(b);

Comparar(3, 5);   // ¿boxea 3 para llamar a IComparable<int>.CompareTo? NO.
```

El compilador emite `constrained. !!T callvirt IComparable<T>::CompareTo`. El prefijo `constrained.` le dice al JIT: *"si T es value type, llama al método directamente sobre el valor; no lo boxees"*. Como el JIT genera código **especializado para cada value type** (sección 6), la llamada acaba siendo directa e inlineable.

> ❓ **Entrevista**: *"¿Qué es boxing y por qué es caro?"* → Convertir un value type en objeto: asigna memoria en el heap, copia el valor, y más tarde el GC debe recolectarlo. El unboxing añade un chequeo de tipo y otra copia. Es caro en hot paths por la presión sobre el GC, no por la operación en sí. Se evita con genéricos, `IEquatable<T>`, sobrescribiendo métodos de `object` en structs y con interpolación moderna.

---

## 5. El JIT por dentro: compilación por niveles (Tiered Compilation)

Dilema del JIT: compilar **rápido** (para arrancar pronto) o compilar **bien** (código optimizado, pero la compilación tarda). .NET resuelve el dilema compilando **dos veces** los métodos que importan.

```
 Primera llamada
      │
      ▼
 ┌────────────────────────┐    ¿Hay código ReadyToRun precompilado?  ──sí──► se usa (calidad ~Tier1 sin PGO)
 │ Tier0 (quick JIT)      │                                                      │
 │ sin optimizaciones,    │                                                      │
 │ compila muy rápido     │                                                      │
 │ + instrumentación PGO  │                                                      │
 └───────────┬────────────┘                                                      │
             │ contador de llamadas: ~30 llamadas                                 │
             │ (tras un breve periodo de gracia al arrancar)  ◄──────────────────┘
             ▼
 ┌────────────────────────┐
 │ Tier1 (JIT optimizado) │   en un hilo de background; el método se "parchea"
 │ inlining, registros,   │   para que las siguientes llamadas usen el nuevo código
 │ + Dynamic PGO (GDV…)   │
 └────────────────────────┘

 Bucles largos en Tier0 → OSR (On-Stack Replacement): salta a código optimizado a mitad del bucle
```

| Concepto | Qué hace | Desde |
|---|---|---|
| **Tiered compilation** | Tier0 rápido primero, Tier1 optimizado para métodos "calientes" | Activo por defecto desde .NET Core 3.0 |
| **Quick JIT for loops + OSR** | Métodos con bucles también empiezan en Tier0; si un bucle se vuelve caliente, se reemplaza el frame en ejecución por uno optimizado | OSR por defecto en .NET 7 (x64/ARM64) |
| **Dynamic PGO** | Tier0 instrumentado registra qué tipos, ramas y métodos se usan realmente; Tier1 optimiza según ese perfil | Por defecto en **.NET 8** |
| **ReadyToRun (R2R)** | Código nativo precompilado dentro del assembly; se usa al arrancar y los métodos calientes se re-JITean a Tier1 | .NET Core 3.0 |

Optimizaciones que hace Tier1: **inlining** de métodos pequeños, eliminación de *bounds checks* cuando prueba que el índice es válido, asignación de variables a registros, *loop cloning*, vectorización de algunos patrones, **constant folding** (`typeof(T) == typeof(int)` se resuelve en compilación en código genérico especializado), **devirtualización** (y GDV con PGO), eliminación de código muerto.

```csharp
using System.Runtime.CompilerServices;

public static class Matematica
{
    [MethodImpl(MethodImplOptions.AggressiveInlining)]   // pista para inlinear aunque supere la heurística
    public static int Cuadrado(int x) => x * x;

    [MethodImpl(MethodImplOptions.NoInlining)]           // útil para benchmarks o stack traces
    public static void Log(string msg) => Console.WriteLine(msg);
}

// Bounds check elimination: el JIT ve que i < arr.Length y quita el chequeo dentro del bucle
static int Sumar(int[] arr)
{
    int s = 0;
    for (int i = 0; i < arr.Length; i++) s += arr[i];   // ✅ sin bounds check
    return s;
}
```

⚠️ Consecuencia práctica: **las primeras llamadas son más lentas** (Tier0). Por eso un benchmark casero sin warm-up mide código sin optimizar (Sesión 30), y por eso las apps sensibles al *cold start* usan R2R o AOT.

Ajustes en el `.csproj` (casi nunca hace falta tocarlos):

```xml
<TieredCompilation>true</TieredCompilation>        <!-- false = todo directo a código optimizado (arranque más lento) -->
<TieredPGO>true</TieredPGO>                        <!-- Dynamic PGO (defecto desde .NET 8) -->
<TieredCompilationQuickJitForLoops>true</TieredCompilationQuickJitForLoops>
```

> ❓ **Entrevista**: *"¿Qué es tiered compilation y Dynamic PGO?"* → El JIT compila primero cada método rápido y sin optimizar (Tier0), instrumentado para recoger un perfil de uso. Los métodos que se llaman mucho se recompilan en background con optimizaciones completas (Tier1) usando ese perfil: por ejemplo devirtualiza llamadas al tipo más frecuente (guarded devirtualization) y reordena ramas. Así se consigue arranque rápido **y** código de estado estable muy optimizado.

---

## 6. Genéricos en runtime: compartido vs especializado

¿Cuántas copias de código nativo genera el JIT para `List<T>.Add`?

| Instanciación | Código nativo |
|---|---|
| `List<string>`, `List<Cliente>`, `List<object>` | **Una sola copia compartida** (`List<__Canon>`): todas las referencias son punteros de 8 bytes y se manipulan igual. El tipo real se obtiene de un "diccionario genérico" en runtime |
| `List<int>` | Copia **especializada** para `int` |
| `List<Guid>` | Otra copia especializada para `Guid` |

```
 List<string> ─┐
 List<Cliente> ├──► código List<__Canon>.Add   (compartido)
 List<object> ─┘
 List<int>  ──────► código List<int>.Add       (especializado: sin boxing, inlineable)
 List<Guid> ──────► código List<Guid>.Add      (especializado)
```

Por eso los genéricos de .NET con value types **no boxean** (a diferencia de Java, que borra los tipos genéricos —*type erasure*— y obliga a usar `Integer`). Y por eso en código genérico especializado el JIT puede eliminar ramas como `if (typeof(T) == typeof(int))` por completo.

Trade-off: cada value type distinto usado como argumento genérico genera más código nativo (más memoria, más tiempo de JIT), y en Native AOT todas las instanciaciones deben conocerse en compilación.

> ❓ **Entrevista**: *"¿En qué se diferencian los genéricos de .NET y los de Java?"* → .NET los *reifica*: el tipo genérico existe en runtime (`typeof(List<int>)` es distinto de `typeof(List<string>)`), y el JIT genera código especializado para value types, sin boxing. Java usa *type erasure*: en runtime solo existe `List`, y los primitivos deben envolverse.

---

## 7. Inicialización de tipos: constructores estáticos y `beforefieldinit`

```csharp
public class ConfigA
{
    public static readonly string Valor = CargarValor();   // inicializador de campo, SIN static ctor explícito
    static string CargarValor() => "A";
}

public class ConfigB
{
    public static readonly string Valor;
    static ConfigB() { Valor = "B"; }                       // static ctor EXPLÍCITO
}
```

- Sin constructor estático explícito, el compilador marca la clase como **`beforefieldinit`**: el runtime puede inicializar los campos estáticos **cuando quiera antes** del primer acceso a un campo estático. Esto da libertad al JIT (en Tier1 a menudo ya están inicializados y el acceso es directo, e incluso puede tratar un `static readonly` como constante).
- Con constructor estático explícito, se garantiza que corre **exactamente** justo antes del primer uso del tipo; el JIT puede tener que insertar comprobaciones.
- En ambos casos el runtime garantiza que la inicialización es **thread-safe** y ocurre una sola vez. Si lanza una excepción, el tipo queda inutilizable: cada acceso posterior lanza `TypeInitializationException`.

---

## 8. Strings: inmutabilidad e internado

- `string` es un tipo referencia **inmutable**: cualquier "modificación" crea un nuevo objeto (por eso `StringBuilder`, Sesión 30).
- Los **literales** del código se **internan**: todas las apariciones de `"hola"` en el proceso apuntan al mismo objeto.

```csharp
string a = "hola";
string b = "hola";
string c = new string(['h', 'o', 'l', 'a']);

Console.WriteLine(ReferenceEquals(a, b));                 // True  (literal internado)
Console.WriteLine(ReferenceEquals(a, c));                 // False (creado en runtime)
Console.WriteLine(a == c);                                // True  (== compara contenido en string)
Console.WriteLine(ReferenceEquals(a, string.Intern(c)));  // True
```

⚠️ Por esto `lock("texto")` es peligroso (Sesión 29): bloqueas un objeto compartido por todo el proceso. Y `string.Intern` manual rara vez compensa: los strings internados nunca se liberan.

---

## 9. Excepciones: por qué son caras

Lanzar una excepción implica: capturar el *stack trace* (recorrer frames), buscar un `catch` compatible (primera pasada), ejecutar `finally`s mientras desenrolla la pila (segunda pasada). Puede costar microsegundos, **miles de veces** más que un `return`. .NET 9 reescribió el manejo de excepciones en managed code y lo hizo bastante más rápido, pero siguen sin ser para flujo normal. Por eso la Sesión 12 recomendaba `TryParse`/patrón *Try* y `Result<T>` para errores esperados.

---

## 10. Formas de compilar: JIT vs ReadyToRun vs Native AOT

```
             BUILD / PUBLISH                           RUNTIME
 ─────────────────────────────────────────   ─────────────────────────────────
 JIT       C# ─► IL                            IL ─► JIT (Tier0 → Tier1 + PGO)
 R2R       C# ─► IL + código nativo            usa nativo al arrancar; re-JIT a Tier1 si caliente
 NativeAOT C# ─► IL ─► ILC ─► ejecutable nativo   sin JIT; runtime mínimo embebido
```

| | JIT (defecto) | ReadyToRun | Native AOT |
|---|---|---|---|
| Arranque | Más lento | Rápido | **Muy rápido** (ms) |
| Rendimiento estable | **Máximo** (PGO dinámico) | Máximo (re-JIT) | Muy bueno, sin PGO dinámico |
| Memoria | Mayor (JIT + metadata) | Mayor | **Mínima** |
| Tamaño en disco | Pequeño (necesita runtime) | ~2-3× IL | Un ejecutable autocontenido (MBs), sin runtime instalado |
| Reflection / `Assembly.Load` / `Reflection.Emit` | ✅ Todo | ✅ Todo | ⚠️ Limitado / ❌ sin generación dinámica de código |
| Plataforma | Portable (IL) | Por RID | Por RID (compilas para cada SO/arquitectura) |

### 10.1 ReadyToRun

```xml
<PropertyGroup>
  <PublishReadyToRun>true</PublishReadyToRun>
  <RuntimeIdentifier>linux-x64</RuntimeIdentifier>
</PropertyGroup>
```

Es compatible con todo (sigue habiendo JIT como respaldo). Las propias librerías del framework ya vienen compiladas en R2R.

### 10.2 Native AOT

```xml
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <InvariantGlobalization>true</InvariantGlobalization>
</PropertyGroup>
```

```bash
dotnet publish -c Release -r linux-x64     # genera un ejecutable nativo en bin/Release/net8.0/linux-x64/publish/
```

El compilador **ILC** hace un análisis de todo el programa (*whole-program*), aplica **trimming** (elimina el código que no se alcanza) y genera código máquina. Consecuencias:

- ❌ No hay `Reflection.Emit` ni carga dinámica de assemblies (plugins).
- ⚠️ La reflection sobre tipos que el análisis no ve puede fallar en runtime (el trimmer los eliminó). El compilador emite **warnings de trimming/AOT** (`IL2026`, `IL3050`…): trátalos como errores.
- ✅ La solución es **mover el trabajo de runtime a compile time con source generators**:

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;

var json = JsonSerializer.Serialize(new Pedido(1, 99.5m), AppJsonContext.Default.Pedido); // sin reflection
Console.WriteLine(json);

public record Pedido(int Id, decimal Total);

[JsonSerializable(typeof(Pedido))]                 // el source generator crea el serializador en build
internal partial class AppJsonContext : JsonSerializerContext { }
```

Otros componentes AOT-friendly: `Regex` con `[GeneratedRegex]`, logging con `[LoggerMessage]`, Minimal APIs con `CreateSlimBuilder` y el *Request Delegate Generator*, configuration binding generator. EF Core tiene soporte AOT todavía experimental; MVC con controllers no es compatible con AOT.

Para librerías: `<IsAotCompatible>true</IsAotCompatible>` activa los analizadores que avisan de APIs incompatibles.

> ❓ **Entrevista**: *"¿Cuándo usarías Native AOT y cuándo no?"* → Sí: funciones serverless (AWS Lambda, cold start), herramientas CLI, microservicios en contenedores con mucha densidad, donde arranque y memoria importan. No: apps que dependen de reflection dinámica, plugins, `Reflection.Emit` (algunos ORMs, mocks, serializadores antiguos), MVC tradicional, o servicios de larga duración donde el JIT con Dynamic PGO puede dar mejor rendimiento estable.

---

## 11. Carga de assemblies: `AssemblyLoadContext`

Un **AssemblyLoadContext (ALC)** es un "espacio" donde se cargan assemblies. Todos tus assemblies van al ALC por defecto. Puedes crear ALCs propios para:
- **Plugins** aislados que usen versiones distintas de la misma dependencia.
- **Descargar código** (`isCollectible: true`): cargar un plugin, usarlo y liberarlo de memoria (el equivalente moderno a los AppDomains de .NET Framework, que ya no existen en .NET Core+).

```csharp
using System.Reflection;
using System.Runtime.Loader;

var alc = new AssemblyLoadContext("Plugin", isCollectible: true);
Assembly plugin = alc.LoadFromAssemblyPath(Path.GetFullPath("plugins/MiPlugin.dll"));
// ... usar tipos del plugin vía reflection o una interfaz compartida ...
alc.Unload();   // se descarga cuando ya no queden referencias vivas a sus tipos
```

---

## 12. Resumen mental de la sesión

```
Objeto en heap (x64): [header 8B][MethodTable* 8B][campos]   mínimo 24B
Struct: solo sus campos (sin header/MT) salvo cuando se boxea
MethodTable: 1 por tipo · padre · interfaces · VTable (slots)

Dispatch: directo (call, inlineable) · virtual (MT → slot, indirecto) · interfaz (VSD, stubs)
   override = mismo slot · new = slot nuevo
   sealed / tipo exacto / GDV(PGO) → devirtualización → inline

Boxing = instrucción 'box' en IL = asignación en heap; unboxing solo al tipo exacto
   Oculto: object/interfaces, ToString/GetHashCode no sobrescritos en structs, ArrayList
   Evitar: genéricos (+ constrained.), IEquatable<T>, record struct, interpolación moderna

JIT: Tier0 (rápido + instrumentado) → ~30 llamadas → Tier1 (optimizado + Dynamic PGO)
   OSR para bucles calientes · R2R = nativo precompilado + re-JIT
Genéricos: ref types comparten código (__Canon), value types especializado (sin boxing)
AOT: sin JIT, trimming, arranque/memoria mínimos, sin Reflection.Emit → source generators
beforefieldinit · strings internados · excepciones caras · ALC collectible para plugins
```

---

## 13. Chequeo de entrevista (respóndelas de memoria)
1. ❓ Dibuja la estructura de un objeto en el heap. ¿Por qué el mínimo es 24 bytes en x64?
2. ❓ ¿Qué es la MethodTable y qué es la VTable? ¿Cuántas hay por tipo?
3. ❓ ¿Qué diferencia hay a nivel de VTable entre `override` y `new`?
4. ❓ ¿Por qué C# emite `callvirt` incluso para métodos no virtuales?
5. ❓ ¿Qué es la devirtualización y cómo ayudan `sealed` y Dynamic PGO?
6. ❓ ¿Qué es boxing? Nombra 4 lugares donde ocurre de forma oculta.
7. ❓ ¿Por qué `(long)obj` falla si `obj` es un `int` boxeado?
8. ❓ Explica tiered compilation: Tier0, Tier1, OSR y PGO.
9. ❓ ¿Cómo comparte código el JIT entre `List<string>` y `List<Cliente>`? ¿Y con `List<int>`? ¿Diferencia con Java?
10. ❓ ¿JIT vs ReadyToRun vs Native AOT? ¿Limitaciones de AOT y cómo se sortean?
11. ❓ ¿Qué es `beforefieldinit`? ¿Qué pasa si un constructor estático lanza una excepción?
12. ❓ ¿Qué es el internado de strings y qué implicación tiene para `lock`?

## 14. Ejercicio práctico
1. **Boxing en IL**: en SharpLab, escribe un método que haga `object o = 42;`, otro que llame `string.Format("{0}", 42)` y otro con `$"{42}"`. Cambia la vista a *IL* y cuenta las instrucciones `box`.
2. **Struct como clave**: crea `struct Clave { public int A; public string B; }` y úsalo como clave de un `Dictionary` con 100 000 elementos. Mide con BenchmarkDotNet (Sesión 30) la búsqueda contra una versión `readonly record struct`. Observa tiempo y *Allocated*.
3. **Devirtualización**: benchmark de un bucle que llama `Area()` sobre una `Figura` (clase no sealed) vs sobre un `Cuadrado` sealed. Añade `[DisassemblyDiagnoser]` y busca la llamada indirecta.
4. **Tiers en vivo**: ejecuta un método 1 000 veces midiendo cada llamada con `Stopwatch.GetTimestamp()` e imprime las primeras 50 y las últimas: verás el salto Tier0 → Tier1. Repite con `DOTNET_TieredCompilation=0`.
5. **Ver el ensamblador**: `DOTNET_JitDisasm="Sumar" dotnet run -c Release` sobre el método de la sección 5; busca si hay chequeo de límites dentro del bucle.
6. **Native AOT**: crea `dotnet new console -o AotDemo`, añade `<PublishAot>true</PublishAot>`, serializa un record con `System.Text.Json` **sin** contexto y publica: lee los warnings. Arréglalo con `JsonSerializerContext`. Compara tamaño y tiempo de arranque (`time ./AotDemo`) con la versión `dotnet AotDemo.dll`.

---

➡️ **Cuando termines**, marca la Sesión 31 en el [README](Readme.md) y pídeme la **Sesión 32 — Evolución de C# 8 → 13**.
