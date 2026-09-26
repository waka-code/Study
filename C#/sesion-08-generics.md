# Sesión 8 — Generics y constraints: código reutilizable, seguro y rápido (covarianza/contravarianza)

> **Objetivo de la sesión**: entender *por qué* existen los genéricos, *cómo* los implementa el CLR (reificación, a diferencia del *type erasure* de Java), escribir clases, métodos e interfaces genéricas con **constraints** (`where T : ...`), y dominar el tema que más se pregunta y peor se responde: **covarianza y contravarianza** (`out` / `in`). Al terminar deberías poder explicar por qué `List<int>` no hace boxing, por qué `IEnumerable<string>` se puede asignar a `IEnumerable<object>` pero `List<string>` a `List<object>` no, y qué es *generic math*.

---

## 1. El problema: reutilizar sin perder tipos

Supón que necesitas una pila de enteros y otra de strings. Sin genéricos tienes dos malas opciones:

```csharp
// Opción A: duplicar código por tipo → PilaInt, PilaString, PilaCliente... 🤮
public class PilaInt    { private int[] _items = new int[16]; /* ... */ }
public class PilaString { private string[] _items = new string[16]; /* ... */ }

// Opción B: usar object (así era .NET 1.x con ArrayList, Sesión 7)
public class PilaObject
{
    private object[] _items = new object[16];
    private int _n;
    public void Push(object x) => _items[_n++] = x;   // int → object = BOXING
    public object Pop() => _items[--_n];
}

var p = new PilaObject();
p.Push(42);
p.Push("oops");              // compila: sin seguridad de tipos
int x = (int)p.Pop();        // 💥 InvalidCastException en RUNTIME
```

La opción B tiene tres costos: **boxing** (allocation en heap por cada value type, Sesión 2), **casts** en cada lectura y **errores en runtime** en vez de en compilación.

Los **genéricos** (C# 2.0, 2005) resuelven los tres: escribes el código **una vez** con un **parámetro de tipo** `T`, y el compilador/runtime lo especializa.

```csharp
public class Pila<T>
{
    private T[] _items = new T[16];
    private int _n;

    public int Count => _n;

    public void Push(T item)
    {
        if (_n == _items.Length) Array.Resize(ref _items, _n * 2);   // crece como List<T>
        _items[_n++] = item;
    }

    public T Pop()
    {
        if (_n == 0) throw new InvalidOperationException("Pila vacía");
        T item = _items[--_n];
        _items[_n] = default!;   // libera la referencia para el GC (importante con T referencia)
        return item;
    }
}

var enteros = new Pila<int>();
enteros.Push(42);            // sin boxing: T[] es realmente int[]
// enteros.Push("oops");     // ❌ error de COMPILACIÓN
int y = enteros.Pop();       // sin cast
```

| | `object` | Genéricos |
|---|---|---|
| Seguridad de tipos | Runtime (casts) | **Compilación** |
| Boxing de value types | ✅ sí (lento, basura) | ❌ no |
| Casts | En cada lectura | Ninguno |
| Reutilización | ✅ | ✅ |

---

## 2. Sintaxis: tipos, métodos e interfaces genéricas

```csharp
// Tipo genérico con dos parámetros
public class Par<TPrimero, TSegundo>
{
    public TPrimero Primero { get; }
    public TSegundo Segundo { get; }
    public Par(TPrimero a, TSegundo b) => (Primero, Segundo) = (a, b);
    public override string ToString() => $"({Primero}, {Segundo})";
}

// Interfaz genérica
public interface IRepositorio<T>
{
    T? ObtenerPorId(int id);
    IReadOnlyList<T> Listar();
    void Agregar(T entidad);
}

// Método genérico (puede vivir en una clase NO genérica)
public static class Util
{
    public static void Intercambiar<T>(ref T a, ref T b) => (a, b) = (b, a);

    public static T Primero<T>(IEnumerable<T> fuente)
    {
        foreach (var x in fuente) return x;
        throw new InvalidOperationException("Secuencia vacía");
    }
}

int m = 1, n = 2;
Util.Intercambiar(ref m, ref n);        // INFERENCIA de tipos: T = int (no hace falta <int>)
Util.Intercambiar<int>(ref m, ref n);   // explícito, equivalente
var par = new Par<string, int>("edad", 30);
```

**Inferencia**: el compilador deduce `T` de los **argumentos** del método. **No** infiere a partir del tipo de retorno ni en constructores (`new Par("a", 1)` no compila; por eso existen helpers como `Tuple.Create(...)` o `KeyValuePair.Create(...)`).

**Convenciones de nombres**: `T` si hay uno solo; con varios, prefijo `T` + nombre descriptivo (`TKey`, `TValue`, `TResult`, `TEntity`).

### 2.1 Tipos abiertos y cerrados

```csharp
Type abierto = typeof(Dictionary<,>);             // "open generic": sin argumentos
Type cerrado = typeof(Dictionary<string, int>);   // "closed": todos los argumentos definidos
Console.WriteLine(abierto.IsGenericTypeDefinition);   // True
Console.WriteLine(cerrado.GetGenericTypeDefinition() == abierto); // True

Type construido = abierto.MakeGenericType(typeof(int), typeof(bool));  // Dictionary<int,bool>
```

Los tipos abiertos aparecen en DI (Sesión 24): `services.AddScoped(typeof(IRepositorio<>), typeof(RepositorioEf<>));` y en reflection (Sesión 20).

---

## 3. Cómo implementa el CLR los genéricos (reificación)

Esta es **la** pregunta de nivel senior. .NET tiene **genéricos reificados**: los argumentos de tipo **existen en runtime** (en la metadata y en el tipo del objeto).

```
Compilación (Roslyn):   Pila<T>  →  UN solo tipo genérico en IL, con "T" como marcador (`1)

Runtime (JIT) al usarlo con...
 ├── Pila<int>      → código nativo ESPECIALIZADO para int      (T[] = int[], sin boxing)
 ├── Pila<double>   → código nativo ESPECIALIZADO para double
 ├── Pila<string>   ┐
 ├── Pila<Cliente>  ├→ código nativo COMPARTIDO (__Canon): todas las referencias
 └── Pila<object>   ┘   son punteros del mismo tamaño
```

- **Value types**: el JIT genera una copia del código **por cada** value type distinto → máximo rendimiento (sin boxing, inlining, tamaño exacto). Costo: más código nativo.
- **Reference types**: se **comparte** una sola versión, porque todas las referencias miden lo mismo (8 bytes en x64). El tipo exacto se obtiene de un "diccionario genérico" en runtime.

**Comparación con Java** (pregunta clásica):

| | C# / .NET | Java |
|---|---|---|
| Implementación | **Reificación** | **Type erasure** |
| `T` existe en runtime | ✅ `typeof(T)`, `obj is List<int>` | ❌ se borra a `Object` |
| Value types / primitivos | `List<int>` sin boxing | `List<Integer>` (boxing obligatorio) |
| `new T()` | ✅ con constraint `new()` | ❌ |
| `T[]` | ✅ | ❌ (no directo) |
| Sobrecargar por argumento genérico | ✅ `M(List<int>)` y `M(List<string>)` | ❌ misma firma tras erasure |

> ❓ **Entrevista**: *"¿Cómo implementa .NET los genéricos y en qué se diferencia de Java?"* → .NET los **reifica**: el tipo genérico existe en IL y el JIT genera código especializado por cada value type (sin boxing) y código compartido para los reference types. Java usa *type erasure*: los genéricos solo existen en compilación y en runtime todo es `Object`, por eso no admite primitivos ni `new T()`.

### 3.1 Consecuencia: campos estáticos por tipo cerrado

Cada tipo cerrado es un **tipo distinto** con sus propios campos `static`:

```csharp
public class Contador<T>
{
    public static int Instancias;
    public Contador() => Instancias++;
}

new Contador<int>(); new Contador<int>(); new Contador<string>();
Console.WriteLine(Contador<int>.Instancias);     // 2
Console.WriteLine(Contador<string>.Instancias);  // 1  ← campo estático SEPARADO
```

Esto habilita el patrón **generic static cache** (inicialización única y thread-safe por tipo, sin diccionario):

```csharp
public static class TypeInfoCache<T>
{
    // Se calcula UNA vez por T, la primera vez que se usa (el CLR garantiza thread-safety del static ctor)
    public static readonly string[] Propiedades =
        typeof(T).GetProperties().Select(p => p.Name).ToArray();
}

var props = TypeInfoCache<Uri>.Propiedades;   // reflection solo la primera vez (Sesión 20)
```

> ⚠️ El analizador CA1000 advierte contra miembros estáticos en tipos genéricos *públicos* por usabilidad (`Contador<int>.Instancias` es incómodo), no porque estén mal. En caches internas es un patrón excelente.

---

## 4. `default(T)`: el valor por defecto genérico

Dentro de código genérico no sabes si `T` es `int` (default `0`) o `string` (default `null`):

```csharp
public static T PrimeroODefecto<T>(IList<T> lista) =>
    lista.Count > 0 ? lista[0] : default;   // default literal (C# 7.1): 0, false, null, struct en ceros...

int a = PrimeroODefecto(new List<int>());        // 0
string? s = PrimeroODefecto(new List<string>()); // null
```

> ⚠️ **`default` en value types no es "ausencia"**: `PrimeroODefecto(new List<int>())` devuelve `0`, y no puedes distinguirlo de una lista cuyo primer elemento es `0`. Por eso la BCL prefiere el patrón **Try**: `bool TryGetFirst(out T value)`. Con NRT (Sesión 15) anota el retorno como `T?` y usa `[MaybeNull]`/`[NotNullWhen(true)]` cuando corresponda.

---

## 5. Constraints: `where T : ...`

Sin restricciones, dentro del código genérico `T` solo puede hacer lo que hace un `object` (`ToString`, `Equals`, `GetHashCode`). Los **constraints** le dicen al compilador qué más garantiza `T`, y a cambio **puedes usar** esas capacidades.

```csharp
// ❌ No compila: el compilador no sabe si T tiene CompareTo
// static T Max<T>(T a, T b) => a.CompareTo(b) > 0 ? a : b;

// ✅ Con constraint
static T Max<T>(T a, T b) where T : IComparable<T> =>
    a.CompareTo(b) >= 0 ? a : b;

Console.WriteLine(Max(3, 7));          // 7
Console.WriteLine(Max("pera", "uva")); // uva
// Max(new object(), new object());    // ❌ object no implementa IComparable<object>
```

### 5.1 Catálogo completo

| Constraint | Significa | Te permite |
|---|---|---|
| `where T : struct` | Value type **no nullable** | Usar `T?` como `Nullable<T>`, evitar nulls |
| `where T : class` | Reference type (no-nullable en contexto NRT) | Comparar con `null`, `as` |
| `where T : class?` | Reference type, nullable o no | — |
| `where T : notnull` | Cualquier tipo no nullable (C# 8) | Claves de diccionario (`TKey : notnull`) |
| `where T : unmanaged` | Struct sin referencias (C# 7.3) | `sizeof(T)`, punteros, `stackalloc`, `Span` de bytes (Sesión 19) |
| `where T : new()` | Tiene constructor público sin parámetros | `new T()` |
| `where T : ClaseBase` | Es o deriva de `ClaseBase` | Usar miembros de la base |
| `where T : IInterfaz` | Implementa la interfaz | Llamar sus métodos **sin boxing** |
| `where T : U` | `T` es o deriva de otro parámetro `U` | Relacionar dos parámetros |
| `where T : default` | Solo en overrides/implementaciones explícitas para resolver ambigüedad con `T?` (C# 9) | — |
| `where T : allows ref struct` | *Anti-constraint* (C# 13): permite `Span<T>` como argumento | Genéricos sobre ref structs |

### 5.2 Combinando constraints (orden obligatorio)

```csharp
public abstract class Entidad { public int Id { get; set; } }

public class Repositorio<TEntidad, TClave>
    where TEntidad : Entidad, IValidable, new()   // 1º class/struct/base, 2º interfaces, último new()
    where TClave : notnull
{
    private readonly Dictionary<TClave, TEntidad> _datos = new();

    public TEntidad Crear(TClave clave)
    {
        var e = new TEntidad();                    // gracias a new()
        e.Id = _datos.Count + 1;                   // gracias a : Entidad
        if (!e.EsValido()) throw new InvalidOperationException(); // gracias a : IValidable
        _datos[clave] = e;                         // gracias a notnull (sin warning)
        return e;
    }
}

public interface IValidable { bool EsValido(); }
public class Producto : Entidad, IValidable { public bool EsValido() => true; }

var repo = new Repositorio<Producto, string>();
var prod = repo.Crear("SKU-1");
```

Orden: **(1)** `class`/`struct`/`unmanaged`/`notnull`/clase base → **(2)** interfaces → **(3)** `new()` al final.

> ⚠️ **`new T()` usa reflection internamente** (`Activator.CreateInstance<T>()`) y es más lento que `new Producto()`. En hot paths, acepta un `Func<T>` como factory (Sesión 10).

### 5.3 Constraint de interfaz = sin boxing (detalle de performance)

```csharp
// Recibe la interfaz: si pasas un struct → BOXING
static bool IgualesA(IEquatable<int> a, int b) => a.Equals(b);

// Constraint genérico: el JIT especializa para el struct → llamada directa, SIN boxing
static bool IgualesB<T>(T a, T b) where T : IEquatable<T> => a.Equals(b);
```

Por eso `EqualityComparer<T>.Default` y `Comparer<T>.Default` (usados por `Dictionary`, `HashSet`, `List.Sort` en la Sesión 7) son genéricos: eligen la implementación óptima para cada `T`.

> ❓ **Entrevista**: *"¿Qué diferencia hay entre recibir `IComparable` como parámetro y usar `where T : IComparable<T>`?"* → Con el parámetro de interfaz, un struct se **boxea** al pasarlo. Con el constraint, el JIT genera código especializado para el value type y llama al método directamente, sin boxing y con posibilidad de *inlining*. Además el constraint conserva el tipo exacto (`T` de retorno en vez de la interfaz).

---

## 6. Generic math: static abstract members (C# 11 / .NET 7)

Históricamente **no podías** escribir `Sumar<T>(T a, T b) => a + b;` porque los operadores son `static` y las interfaces no podían exigir miembros estáticos. C# 11 añadió **`static abstract` en interfaces**, y .NET 7 reescribió los tipos numéricos para implementar `INumber<T>`, `IAdditionOperators<...>`, etc.

```csharp
using System.Numerics;

static T Suma<T>(IEnumerable<T> valores) where T : INumber<T>
{
    T total = T.Zero;                 // miembro ESTÁTICO de la interfaz
    foreach (var v in valores)
        total += v;                   // operador + exigido por INumber<T>
    return total;
}

static T Promedio<T>(IReadOnlyCollection<T> xs) where T : INumber<T> =>
    Suma(xs) / T.CreateChecked(xs.Count);   // convierte int → T

Console.WriteLine(Suma(new[] { 1, 2, 3 }));          // 6
Console.WriteLine(Suma(new[] { 1.5m, 2.5m }));       // 4.0
Console.WriteLine(Promedio(new List<double> { 1, 2, 3, 4 })); // 2.5
```

Y puedes definir **tus propias** interfaces con miembros estáticos abstractos:

```csharp
public interface IParseableCorto<TSelf> where TSelf : IParseableCorto<TSelf>   // "curiously recurring" pattern
{
    static abstract TSelf Parsear(string s);
}

public readonly record struct Rut(int Numero, char Dv) : IParseableCorto<Rut>
{
    public static Rut Parsear(string s)
    {
        var partes = s.Split('-');
        return new Rut(int.Parse(partes[0].Replace(".", "")), char.ToUpperInvariant(partes[1][0]));
    }
}

static List<T> ParsearTodos<T>(IEnumerable<string> textos) where T : IParseableCorto<T> =>
    textos.Select(s => T.Parsear(s)).ToList();   // T.Parsear: llamada estática resuelta por el JIT

var ruts = ParsearTodos<Rut>(["12.345.678-5", "9.876.543-k"]);
```

> 💡 La BCL ya trae `IParsable<TSelf>` y `ISpanParsable<TSelf>` con exactamente esta idea; ASP.NET Core Minimal APIs (Sesión 23) la usa para bindear parámetros de ruta a tus tipos.

---

## 7. Covarianza y contravarianza (el tema estrella)

### 7.1 El problema: la invarianza

`string` deriva de `object`. Intuitivamente, "una lista de strings **es** una lista de objects"… pero **no**:

```csharp
List<string> strings = new() { "a", "b" };
// List<object> objetos = strings;   // ❌ CS0029: List<T> es INVARIANTE
```

¿Por qué el compilador lo prohíbe? Porque si lo permitiera:

```csharp
List<object> objetos = strings;   // (supongamos que compila)
objetos.Add(42);                  // ¡un int dentro de una List<string>! 💥 corrupción de tipos
string s = strings[2];            // ¿qué devuelve esto?
```

`List<T>` **recibe** `T` (en `Add`) **y** lo **devuelve** (en el indexador). Cuando un tipo hace las dos cosas, la única opción segura es la **invarianza**.

### 7.2 Covarianza (`out T`): "solo produce T"

Si una interfaz **solo devuelve** `T` (nunca lo recibe), convertir "productor de `string`" a "productor de `object`" es seguro: todo string que salga es un object válido.

```csharp
// En la BCL: public interface IEnumerable<out T> { IEnumerator<T> GetEnumerator(); }
IEnumerable<string> strs = new List<string> { "a", "b" };
IEnumerable<object> objs = strs;         // ✅ COVARIANZA: Derivado → Base

IReadOnlyList<string> ro = new List<string> { "x" };
IReadOnlyList<object> roObj = ro;        // ✅ IReadOnlyList<out T>

Func<string> fabrica = () => "hola";
Func<object> fabricaObj = fabrica;       // ✅ Func<out TResult>
```

### 7.3 Contravarianza (`in T`): "solo consume T"

Si una interfaz **solo recibe** `T`, la conversión va **al revés**: algo que sabe manejar **cualquier `object`** también sabe manejar un `string`.

```csharp
// En la BCL: public delegate void Action<in T>(T obj);
Action<object> imprimirCualquiera = o => Console.WriteLine(o);
Action<string> imprimirString = imprimirCualquiera;   // ✅ CONTRAVARIANZA: Base → Derivado
imprimirString("funciona");

// IComparer<in T>: un comparador de Animal sirve para ordenar Perros
IComparer<Animal> porNombre = Comparer<Animal>.Create((a, b) => string.Compare(a.Nombre, b.Nombre));
var perros = new List<Perro> { new("Toby"), new("Ares") };
perros.Sort(porNombre);    // ✅ List<Perro>.Sort espera IComparer<Perro>; IComparer<Animal> encaja

public record Animal(string Nombre);
public record Perro(string Nombre) : Animal(Nombre);
```

### 7.4 El diagrama mental

```
Jerarquía:      object  ◀──── string       (string ES UN object)

COVARIANZA (out)  — sigue la misma dirección
   IEnumerable<object>  ◀──── IEnumerable<string>     ✅
   "si produces strings, produces objects"

CONTRAVARIANZA (in) — invierte la dirección
   Action<object>  ────▶  Action<string>             ✅
   "si consumes objects, puedes consumir strings"

INVARIANZA — ninguna conversión
   List<object>  ✖  List<string>                     (produce Y consume)
```

| Varianza | Keyword | T aparece en… | Conversión | Ejemplos BCL |
|---|---|---|---|---|
| **Covarianza** | `out` | Solo **salidas** (retornos) | `I<Derivado>` → `I<Base>` | `IEnumerable<out T>`, `IReadOnlyList<out T>`, `IEnumerator<out T>`, `Func<out TResult>`, `IQueryable<out T>` |
| **Contravarianza** | `in` | Solo **entradas** (parámetros) | `I<Base>` → `I<Derivado>` | `Action<in T>`, `IComparer<in T>`, `IEqualityComparer<in T>`, `Predicate<in T>` |
| **Invarianza** | — | Ambos | Ninguna | `List<T>`, `IList<T>`, `ICollection<T>`, `Dictionary<K,V>` |

`Func<in T, out TResult>` combina ambas: contravariante en el argumento, covariante en el resultado.

### 7.5 Declarar tus propias interfaces variantes

```csharp
public interface IProductor<out T>
{
    T Producir();
    // void Consumir(T x);   // ❌ CS1961: T covariante no puede estar en posición de entrada
}

public interface IConsumidor<in T>
{
    void Consumir(T x);
    // T Producir();         // ❌ CS1961: T contravariante no puede estar en posición de salida
}

public class ProductorPerros : IProductor<Perro>
{
    public Perro Producir() => new("Firulais");
}

IProductor<Animal> prod = new ProductorPerros();   // ✅ covarianza con tu propia interfaz
Console.WriteLine(prod.Producir().Nombre);
```

Reglas y límites:
- La varianza solo se declara en **interfaces** y **delegados** genéricos, **nunca en clases ni structs**.
- Solo aplica a **reference types**: `IEnumerable<int>` **no** se convierte a `IEnumerable<object>` (requeriría boxing de cada elemento, cambiando la representación).

```csharp
IEnumerable<int> ints = new[] { 1, 2 };
// IEnumerable<object> o = ints;         // ❌ la varianza no aplica a value types
IEnumerable<object> o = ints.Cast<object>();   // ✅ boxing explícito elemento a elemento (LINQ)
```

> ❓ **Entrevista**: *"Explica covarianza y contravarianza con un ejemplo."* → **Covarianza** (`out`): puedo usar un tipo **más derivado** del declarado; aplica cuando `T` solo sale. `IEnumerable<string>` → `IEnumerable<object>`. **Contravarianza** (`in`): puedo usar un tipo **menos derivado**; aplica cuando `T` solo entra. `Action<object>` → `Action<string>`. `List<T>` es invariante porque `T` entra y sale; permitirlo rompería la seguridad de tipos.

### 7.6 ⚠️ La covarianza rota de los arrays

Por herencia de Java y compatibilidad, los **arrays** de referencia en .NET son covariantes… **sin** ser seguros:

```csharp
string[] nombres = { "Ana", "Luis" };
object[] objetos = nombres;       // ✅ compila (covarianza de arrays)
objetos[0] = 42;                  // 💥 ArrayTypeMismatchException en RUNTIME
```

Para poder lanzar esa excepción, el CLR hace un **chequeo de tipo en cada escritura** a un array de reference types (un costo oculto de performance). Es un error de diseño histórico que los genéricos corrigen: `IEnumerable<T>` es covariante y **seguro**, porque no permite escribir.

> ❓ **Entrevista**: *"¿Los arrays en C# son covariantes?"* → Sí, para reference types, pero de forma **insegura**: el error se detecta en runtime con `ArrayTypeMismatchException`, y obliga al CLR a validar cada escritura. Por eso se prefieren `IReadOnlyList<T>`/`IEnumerable<T>` para exponer secuencias covariantes.

---

## 8. Genéricos y herencia

```csharp
public class Base<T> { public T? Valor { get; set; } }

public class DerivadaCerrada : Base<string> { }        // cierra el parámetro
public class DerivadaAbierta<T> : Base<T> { }          // lo propaga
public class DerivadaMas<T, U> : Base<T> { public U? Extra { get; set; } }

// Método genérico virtual: el override NO repite los constraints (los hereda)
public abstract class Serializador
{
    public abstract string Serializar<T>(T obj) where T : class;
}
public class SerializadorJson : Serializador
{
    public override string Serializar<T>(T obj) => System.Text.Json.JsonSerializer.Serialize(obj);
}
```

> ⚠️ `Base<string>` y `Base<int>` **no** tienen relación de herencia entre sí; son tipos hermanos cerrados de la misma definición. Si necesitas tratarlos uniformemente, define una **interfaz o clase base no genérica** (`IBase` con `object? ValorObj { get; }`). Es el patrón de `IEnumerable<T> : IEnumerable`.

---

## 9. Diseño: cuándo usar genéricos (y cuándo no)

```csharp
// ✅ Bueno: el tipo realmente varía y se preserva
public interface ICache<TKey, TValue> where TKey : notnull { /* ... */ }
public record Resultado<T>(bool Exito, T? Valor, string? Error)
{
    public static Resultado<T> Ok(T valor) => new(true, valor, null);
    public static Resultado<T> Falla(string error) => new(false, default, error);
}

// ❌ Innecesario: T no aporta nada, basta la interfaz
static void Log<T>(T item) where T : ILoggable => item.Log();   // (salvo que T sea struct y quieras evitar boxing)
static void LogSimple(ILoggable item) => item.Log();            // más simple
public interface ILoggable { void Log(); }
```

Checklist:
- ¿El tipo se **preserva** (entra `T`, sale `T`)? → genérico.
- ¿Trabajas con **value types** en hot paths y quieres evitar boxing? → genérico con constraint.
- ¿Solo llamas métodos de una interfaz sobre reference types? → basta con la interfaz.
- ¿Tienes más de 3 parámetros de tipo? → probablemente estás sobre-abstrayendo.

---

## Resumen mental de la sesión

```
Genéricos = código escrito UNA vez, especializado por tipo
   → seguridad en compilación, sin casts, SIN BOXING

CLR = REIFICACIÓN (≠ type erasure de Java)
   value types → código nativo especializado por cada T
   reference types → código compartido (__Canon)
   static fields → uno por cada tipo CERRADO (generic static cache)

default(T)  → 0 / null / struct en ceros  (ojo: no es "ausencia" → patrón Try)

Constraints: where T : struct | class | notnull | unmanaged | Base | IInterfaz | U | new()
   orden: (class/struct/base) → interfaces → new()
   constraint de interfaz = llamada directa sin boxing
Generic math: static abstract en interfaces → INumber<T>, T.Zero, operadores

Varianza (solo interfaces/delegados, solo reference types)
   out = covariante      → solo SALE    → IEnumerable<string> → IEnumerable<object>
   in  = contravariante  → solo ENTRA   → Action<object>      → Action<string>
   sin nada = invariante → entra y sale → List<string> ✖ List<object>
   arrays = covarianza INSEGURA → ArrayTypeMismatchException
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué tres problemas resuelven los genéricos frente a usar `object`?
2. ❓ ¿Cómo implementa el CLR los genéricos? ¿Qué diferencia hay entre value types y reference types en el código que genera el JIT?
3. ❓ ¿Reificación vs *type erasure*? ¿Qué puede hacer C# que Java no, gracias a esto?
4. ❓ ¿Por qué `Contador<int>.Instancias` y `Contador<string>.Instancias` son campos distintos? ¿Qué patrón aprovecha esto?
5. ❓ Enumera los constraints disponibles. ¿En qué orden deben escribirse?
6. ❓ ¿Qué diferencia de rendimiento hay entre recibir un parámetro `IComparable<T>` y usar `where T : IComparable<T>` con un struct?
7. ❓ ¿Qué es *generic math* y qué feature del lenguaje lo hizo posible?
8. ❓ Explica covarianza y contravarianza con ejemplos de la BCL.
9. ❓ ¿Por qué `List<string>` no se puede asignar a `List<object>` pero `IEnumerable<string>` a `IEnumerable<object>` sí?
10. ❓ ¿Por qué `IEnumerable<int>` no es convertible a `IEnumerable<object>`?
11. ❓ ¿Qué problema tiene la covarianza de arrays?
12. ❓ ¿Qué devuelve `default(T)` y por qué la BCL prefiere el patrón `TryXxx(out T)`?

## Ejercicio práctico
1. Crea el proyecto: `dotnet new console -o GenericsLab && cd GenericsLab`.
2. **Pila genérica**: implementa `Pila<T>` con `Push`, `Pop`, `Peek`, `TryPop(out T value)` y `Count`. Haz que implemente `IEnumerable<T>` usando `yield return` (Sesión 7) para recorrerla de arriba a abajo.
3. **Constraints**: escribe `T Max<T>(IEnumerable<T> xs) where T : IComparable<T>` y pruébalo con `int`, `string` y un `record Empleado(string Nombre, decimal Sueldo) : IComparable<Empleado>` que compare por sueldo.
4. **Repositorio en memoria**: `RepositorioMemoria<TEntidad, TClave> where TEntidad : class, IEntidad<TClave> where TClave : notnull`, con `Agregar`, `ObtenerPorId` (que devuelva `TEntidad?`) y `Listar` (devolviendo `IReadOnlyList<TEntidad>`).
5. **Generic math**: implementa `T Mediana<T>(IList<T> xs) where T : INumber<T>` y pruébala con `int[]`, `double[]` y `decimal[]`.
6. **Varianza**: declara `interface IFabrica<out T> { T Crear(); }` y `interface IValidador<in T> { bool Validar(T x); }`. Con la jerarquía `Animal ← Perro`, demuestra:
   - `IFabrica<Perro>` asignado a `IFabrica<Animal>`.
   - `IValidador<Animal>` asignado a `IValidador<Perro>`.
   - Quita el `out`/`in` y anota el error del compilador. Luego intenta poner `T` en la posición incorrecta y anota el CS1961.
7. **Array covariance**: reproduce la `ArrayTypeMismatchException` con `object[] o = new string[1]; o[0] = 1;`.
8. (Opcional avanzado) Verifica los campos estáticos por tipo cerrado con `Contador<T>` y crea un `TypeInfoCache<T>` que imprima cuántas veces se ejecutó la reflection (debería ser una por tipo).

---

➡️ **Cuando termines**, marca la Sesión 8 en el [README](Readme.md) y pídeme la **Sesión 9 — LINQ (básico → avanzado)**.
