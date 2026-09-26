# Sesión 17 — Records, init e inmutabilidad: datos que no cambian a tus espaldas

> **Objetivo de la sesión**: entender *por qué* la inmutabilidad importa (concurrencia, razonamiento, hashing, DDD), y dominar las herramientas que C# da para expresarla: `readonly`, `init`, `required`, `record class`, `record struct`, `readonly struct`, expresiones `with` y colecciones inmutables. Al terminar deberías poder explicar exactamente qué genera el compilador para un `record`, en qué se diferencia de una `class` y de un `struct`, cuál es la trampa de la "inmutabilidad superficial" y cuándo usar cada uno en un sistema real.

---

## 1. ¿Por qué inmutabilidad?

Un objeto **inmutable** es aquel cuyo estado **no puede cambiar** después de construido. Si necesitas "cambiarlo", creas **uno nuevo**. Suena ineficiente, pero resuelve problemas muy caros:

| Problema con objetos mutables | Cómo lo resuelve la inmutabilidad |
|---|---|
| **Condiciones de carrera**: dos hilos modifican el mismo objeto (Sesión 13/29) | Nadie puede modificarlo → se comparte entre hilos **sin locks** |
| **Aliasing**: pasas un objeto a un método y te lo modifica "a escondidas" | El método no puede alterarlo |
| **Claves de diccionario corruptas**: cambias un campo usado en `GetHashCode` y el objeto "desaparece" del `HashSet` (Sesión 7) | El hash nunca cambia |
| **Razonamiento**: para saber el valor de algo tienes que rastrear todas las mutaciones | El valor es el del constructor. Punto. |
| **Invariantes**: un objeto válido puede volverse inválido por un setter | Se valida **una vez**, en la construcción |

```csharp
// El bug clásico de HashSet con objetos mutables
var set = new HashSet<PuntoMutable>();
var p = new PuntoMutable { X = 1, Y = 2 };
set.Add(p);
p.X = 99;                           // cambia el hash code del objeto
Console.WriteLine(set.Contains(p)); // False 😱 — está en el bucket del hash VIEJO

class PuntoMutable
{
    public int X { get; set; }
    public int Y { get; set; }
    public override int GetHashCode() => HashCode.Combine(X, Y);
    public override bool Equals(object? o) => o is PuntoMutable q && q.X == X && q.Y == Y;
}
```

El coste: crear objetos nuevos genera más asignaciones (presión en el GC, Sesión 14). En la práctica, para objetos pequeños de datos es despreciable frente a los bugs que evita — y los `record struct` eliminan las asignaciones en heap cuando hace falta.

> ❓ **Entrevista**: *"¿Por qué `string` es inmutable en .NET?"* → Seguridad (no se puede alterar una ruta o una clave tras validarla), thread-safety gratis, posibilidad de **interning** (compartir instancias de literales), y un hash code estable para usarlo como clave. El coste es que concatenar en bucles crea muchos objetos → `StringBuilder`.

---

## 2. Las herramientas de inmutabilidad (antes de records)

### 2.1 `readonly` en campos
Solo se puede asignar en la declaración o en el constructor:

```csharp
public class Cuenta
{
    private readonly string _id;
    private readonly List<string> _movimientos = new();   // ⚠️ ver 2.4

    public Cuenta(string id) => _id = id;
    // public void Cambiar() => _id = "x";   // ❌ CS0191: readonly field cannot be assigned
}
```

### 2.2 Propiedades get-only
```csharp
public class Moneda
{
    public Moneda(string codigo) => Codigo = codigo;
    public string Codigo { get; }        // solo asignable en el constructor
}
```

### 2.3 `init` accessors (C# 9)
El problema de get-only: **obliga** a usar constructores, y no permite la sintaxis de *object initializer* (`new X { A = 1 }`). `init` (visto en la Sesión 6) resuelve eso: la propiedad se puede asignar **solo durante la inicialización**.

```csharp
public class Producto
{
    public required string Sku { get; init; }     // C# 11: required + init = obligatorio e inmutable
    public string Nombre { get; init; } = "";
    public decimal Precio { get; init; }
}

var p = new Producto { Sku = "A-1", Nombre = "Teclado", Precio = 49.9m };  // ✅
// p.Precio = 10;   // ❌ CS8852: Init-only property can only be assigned in an object initializer
```

| Accessor | Asignable en ctor | En object initializer | Después |
|---|---|---|---|
| `{ get; set; }` | ✅ | ✅ | ✅ |
| `{ get; init; }` | ✅ | ✅ | ❌ |
| `{ get; }` | ✅ | ❌ | ❌ |
| `{ get; private set; }` | ✅ | ❌ (desde fuera) | ✅ solo desde dentro |

> ⚠️ `init` es una verificación del **compilador**. En IL, un `init` es un setter marcado con el modificador `modreq(IsExternalInit)`; la reflection y los serializadores pueden asignarlo igualmente. Es inmutabilidad "de lenguaje", no de runtime.

### 2.4 ⚠️ La gran trampa: inmutabilidad **superficial** (shallow)
`readonly`/`init` impiden cambiar **la referencia**, no **el objeto referenciado**:

```csharp
public class Pedido
{
    public required List<string> Items { get; init; }
}

var ped = new Pedido { Items = ["A", "B"] };
// ped.Items = new();     // ❌ no puedes reasignar la referencia
ped.Items.Add("C");       // ✅ ¡pero sí mutar la lista! El pedido "inmutable" cambió.
```

Soluciones (de menos a más estricto):

```csharp
public class PedidoSeguro
{
    private readonly List<string> _items;
    public PedidoSeguro(IEnumerable<string> items) => _items = items.ToList(); // copia defensiva

    public IReadOnlyList<string> Items => _items;           // 1) vista de solo lectura
    // public IReadOnlyList<string> Items => _items.AsReadOnly(); // 2) ReadOnlyCollection (no casteable a List)
}

// 3) Colecciones VERDADERAMENTE inmutables (System.Collections.Immutable)
public record PedidoInmutable(ImmutableList<string> Items);
```

> ❓ **Entrevista**: *"¿Qué diferencia hay entre `IReadOnlyList<T>`, `ReadOnlyCollection<T>` e `ImmutableList<T>`?"* → `IReadOnlyList<T>` es solo una **interfaz**: si detrás hay una `List<T>`, alguien puede castear y mutar, y tú ves los cambios. `ReadOnlyCollection<T>` es un **wrapper** que impide mutar a través de él, pero refleja cambios de la lista original. `ImmutableList<T>` **garantiza** que nunca cambia: cada "modificación" devuelve una nueva instancia (compartiendo estructura internamente).

---

## 3. Records (C# 9): tipos pensados para **datos**

Escribir una clase de datos inmutable "bien hecha" a mano requiere: constructor, propiedades, `Equals`, `GetHashCode`, `==`/`!=`, `ToString`, y un método para crear copias modificadas. ~50 líneas de boilerplate propenso a errores. Un **record** lo genera todo:

```csharp
public record Persona(string Nombre, string Apellido, int Edad);
```

Esa **única línea** (un *positional record*) le pide al compilador que genere:

```
 record Persona(string Nombre, string Apellido, int Edad)
 ────────────────────────────────────────────────────────
  ✔ Constructor primario  Persona(string Nombre, string Apellido, int Edad)
  ✔ Propiedades           public string Nombre { get; init; }  (idem Apellido, Edad)
  ✔ Deconstruct           void Deconstruct(out string Nombre, out ...)   → pattern matching (Sesión 16)
  ✔ Igualdad por VALOR    Equals(Persona?), Equals(object?), GetHashCode()
  ✔ Operadores            ==  y  !=
  ✔ IEquatable<Persona>
  ✔ ToString()            "Persona { Nombre = Ana, Apellido = Pérez, Edad = 30 }"
  ✔ PrintMembers()        (usado por ToString, protegido virtual)
  ✔ Clon para 'with'      <Clone>$() + constructor de copia protegido
  ✔ EqualityContract      Type virtual, para igualdad segura con herencia
```

```csharp
var a = new Persona("Ana", "Pérez", 30);
var b = new Persona("Ana", "Pérez", 30);

Console.WriteLine(a == b);              // True  ← igualdad por VALOR (con class sería False)
Console.WriteLine(ReferenceEquals(a, b)); // False ← son dos objetos distintos en el heap
Console.WriteLine(a);                   // Persona { Nombre = Ana, Apellido = Pérez, Edad = 30 }

var (nombre, _, edad) = a;              // deconstrucción
Console.WriteLine($"{nombre} tiene {edad}");
```

> ⚠️ Un `record` (sin más) es un **`record class`**: sigue siendo un **tipo referencia** que vive en el heap. Lo que cambia es la **semántica de igualdad**, no la ubicación en memoria.

### 3.1 La expresión `with`: mutación no destructiva

```csharp
var ana = new Persona("Ana", "Pérez", 30);
var anaMayor = ana with { Edad = 31 };     // COPIA de ana, con Edad cambiada

Console.WriteLine(ana.Edad);       // 30 — el original NO cambió
Console.WriteLine(anaMayor.Edad);  // 31
var clon = ana with { };           // copia idéntica (otra instancia)
```

Internamente: `with` llama a `<Clone>$()` (que usa el constructor de copia) y luego asigna las propiedades indicadas mediante sus `init` accessors.

```
   ana ──▶ [Persona: Ana, Pérez, 30]
                  │  <Clone>$()  (copia campo a campo — SHALLOW)
                  ▼
   anaMayor ▶ [Persona: Ana, Pérez, 30] ──init Edad=31──▶ [Ana, Pérez, 31]
```

> ⚠️ `with` hace **copia superficial**: si el record tiene una `List<T>`, el original y la copia **comparten la misma lista**. Mutarla en uno se ve en el otro.

```csharp
public record Carrito(string Cliente, List<string> Items);

var c1 = new Carrito("Ana", ["pan"]);
var c2 = c1 with { Cliente = "Luis" };
c2.Items.Add("leche");
Console.WriteLine(c1.Items.Count);   // 2 😱 — comparten la lista
```

### 3.2 Records con cuerpo, validación y miembros extra

```csharp
public record Email
{
    public string Valor { get; }

    public Email(string valor)
    {
        if (string.IsNullOrWhiteSpace(valor) || !valor.Contains('@'))
            throw new ArgumentException($"Email inválido: {valor}", nameof(valor));
        Valor = valor.Trim().ToLowerInvariant();   // normalización → igualdad coherente
    }

    public string Dominio => Valor[(Valor.IndexOf('@') + 1)..];
    public override string ToString() => Valor;   // puedes sobrescribir lo generado
}

// Record posicional con validación: se "redeclara" la propiedad para inicializarla
public record Rango(int Min, int Max)
{
    public int Min { get; } = Min <= Max ? Min : throw new ArgumentException("Min > Max");
    public int Longitud => Max - Min;
}
```

> ⚠️ Validar en un record posicional tiene un agujero: `with` **no pasa por el constructor primario**, pasa por el constructor de copia y los `init`. `new Rango(1, 5) with { Max = 0 }` crea un rango inválido. Si las invariantes importan (Value Objects de DDD), valida en los `init` o usa un record no posicional con propiedades `{ get; }` sin `init` (lo que deshabilita `with` para ellas).

```csharp
// Patrón robusto para Value Objects con invariantes: ctor privado + factoría + props sin init
public sealed record RangoSeguro
{
    public int Min { get; }          // sin 'init' → 'with { Min = ... }' NO compila (CS8852)
    public int Max { get; }

    private RangoSeguro(int min, int max) => (Min, Max) = (min, max);

    public static RangoSeguro Crear(int min, int max) =>
        min <= max ? new RangoSeguro(min, max)
                   : throw new ArgumentException($"Min ({min}) > Max ({max})");

    // "Modificaciones" explícitas que re-validan
    public RangoSeguro ConMax(int nuevoMax) => Crear(Min, nuevoMax);
}

var r = RangoSeguro.Crear(1, 5);
var r2 = r.ConMax(10);             // ✅ validado
// var r3 = r with { Max = 0 };    // ❌ no compila: Max no tiene init
```

Así conservas la igualdad por valor y el `ToString` generados, pero **todas** las instancias pasan por la validación.

### 3.3 Records mutables (sí, se puede)
```csharp
public record Configuracion
{
    public string Host { get; set; } = "localhost";  // setter normal: mutable
}
```
Válido, pero peligroso: un record mutable usado como clave en `Dictionary` tiene el mismo bug que vimos en §1. Si usas `record`, casi siempre quieres que sea inmutable.

---

## 4. Igualdad en records: cómo funciona de verdad

`Equals` generado compara **todos los campos de instancia** (incluidos los backing fields de propiedades) usando `EqualityComparer<T>.Default`, **más** el `EqualityContract`:

```csharp
// Lo que el compilador genera (simplificado)
public virtual bool Equals(Persona? other) =>
    (object)this == other ||
    (other is not null &&
     EqualityContract == other.EqualityContract &&          // ¡mismo tipo exacto!
     EqualityComparer<string>.Default.Equals(Nombre, other.Nombre) &&
     EqualityComparer<string>.Default.Equals(Apellido, other.Apellido) &&
     EqualityComparer<int>.Default.Equals(Edad, other.Edad));
```

### 4.1 Herencia y `EqualityContract`

```csharp
public record Animal(string Nombre);
public record Perro(string Nombre, string Raza) : Animal(Nombre);

Animal a = new Animal("Toby");
Animal p = new Perro("Toby", "Beagle");
Console.WriteLine(a == p);   // False — EqualityContract distinto (Animal vs Perro)
```

Esto evita la violación de simetría clásica (`a.Equals(p)` true pero `p.Equals(a)` false) que sufren las implementaciones manuales de `Equals` con herencia.

> ⚠️ Un `record` solo puede heredar de otro `record` (o de `object`), y una `class` no puede heredar de un `record`. Puedes sellarlos (`sealed record`) — recomendado si no esperas herencia: el compilador genera miembros no virtuales y el JIT puede *devirtualizar* llamadas.

### 4.2 ⚠️ La trampa de las colecciones en la igualdad

```csharp
public record Equipo(string Nombre, List<string> Miembros);

var e1 = new Equipo("A", ["Ana", "Luis"]);
var e2 = new Equipo("A", ["Ana", "Luis"]);
Console.WriteLine(e1 == e2);   // False 😱
```

¿Por qué? `List<T>` **no** tiene igualdad por valor: `EqualityComparer<List<string>>.Default` compara **referencias**. ¡`ImmutableList<T>` y los arrays tampoco! La igualdad por valor del record es **superficial**, igual que la inmutabilidad. Si necesitas igualdad estructural, sobrescribe `Equals`/`GetHashCode` (usando `SequenceEqual`) o usa un tipo de colección con igualdad por valor.

```csharp
public record Equipo2(string Nombre, IReadOnlyList<string> Miembros)
{
    public virtual bool Equals(Equipo2? other) =>
        other is not null && Nombre == other.Nombre && Miembros.SequenceEqual(other.Miembros);

    public override int GetHashCode()
    {
        var h = new HashCode();
        h.Add(Nombre);
        foreach (var m in Miembros) h.Add(m);
        return h.ToHashCode();
    }
}
```

> ❓ **Entrevista**: *"Dos records con las mismas listas, ¿son iguales?"* → No, a menos que la lista sea la **misma instancia**. La igualdad generada usa `EqualityComparer<T>.Default` por campo, y las colecciones comparan por referencia.

---

## 5. `record struct` y `readonly record struct` (C# 10)

Los records también pueden ser **value types**:

```csharp
public record struct PuntoMutable(int X, int Y);           // ⚠️ propiedades { get; set; } — MUTABLE
public readonly record struct Punto(int X, int Y);         // ✅ propiedades { get; init; } — inmutable

var p1 = new Punto(1, 2);
var p2 = p1 with { Y = 5 };      // 'with' también funciona con structs (y con tuplas/anonymous types)
Console.WriteLine(p1 == p2);     // False
Console.WriteLine(p1);           // Punto { X = 1, Y = 2 }
```

> ⚠️ Asimetría importante: en un `record class` posicional las propiedades son `init` (inmutables); en un `record struct` posicional son `set` (**mutables**). Para un struct inmutable, escribe `readonly record struct`.

¿Por qué `record struct` y no un `struct` normal? Un struct normal ya tiene igualdad por valor, **pero** su `Equals` por defecto (`ValueType.Equals`) usa **reflection** cuando hay campos referencia → es lento y además provoca **boxing**. `record struct` genera un `Equals(T)` fuertemente tipado, `==`, `!=`, `GetHashCode` eficiente y `ToString`.

| | `struct` normal | `record struct` |
|---|---|---|
| Igualdad | Por valor, vía `ValueType.Equals` (reflection si hay refs, boxing) | Por valor, generada y tipada, **rápida** |
| `==` | ❌ no existe (CS0019) salvo que la definas | ✅ generado |
| `ToString` | Nombre del tipo | `Punto { X = 1, Y = 2 }` |
| `with` | ✅ (C# 10) | ✅ |

---

## 6. Tabla maestra: class vs struct vs record class vs record struct

| | `class` | `struct` | `record` / `record class` | `readonly record struct` |
|---|---|---|---|---|
| Categoría | Referencia (heap) | Valor (stack/inline) | Referencia (heap) | Valor |
| Igualdad por defecto | **Referencia** | Valor (lenta) | **Valor** (generada) | **Valor** (generada) |
| `==` | Referencia | No definido | Valor | Valor |
| Mutabilidad posicional | — | — | `init` (inmutable) | `init` (inmutable) |
| Herencia | ✅ | ❌ | ✅ (solo entre records) | ❌ |
| `with` | ❌ | ✅ | ✅ | ✅ |
| Puede ser null | ✅ | ❌ (salvo `T?`) | ✅ | ❌ |
| Copia al asignar | La referencia | Todo el valor | La referencia | Todo el valor |
| Uso típico | Entidades con identidad, servicios, estado | Valores pequeños de alto rendimiento | DTOs, eventos, mensajes, Value Objects | Value Objects pequeños (coordenadas, dinero) |

> 💡 Regla práctica para structs (Sesión 2): menos de ~16 bytes, inmutable, semántica de valor, y que no se boxee a menudo. Si no, `record class`.

---

## 7. Records en el mundo real

### 7.1 DTOs de API (Sesión 22/23)
```csharp
public record CrearProductoRequest(string Nombre, decimal Precio, string? Descripcion);
public record ProductoResponse(Guid Id, string Nombre, decimal Precio);

// Minimal API
// app.MapPost("/productos", (CrearProductoRequest req) => ...);
```
System.Text.Json soporta records posicionales: deserializa usando el constructor primario (hace match por nombre de parámetro, sin distinguir mayúsculas).

### 7.2 Value Objects de DDD (Sesión 26)
Un **Value Object** se define por sus atributos, no por identidad: dos `Dinero(100, "CLP")` son intercambiables. Los records encajan perfectamente:

```csharp
public readonly record struct Dinero(decimal Monto, string Moneda)
{
    public static Dinero operator +(Dinero a, Dinero b)
    {
        if (a.Moneda != b.Moneda)
            throw new InvalidOperationException($"No se puede sumar {a.Moneda} con {b.Moneda}");
        return a with { Monto = a.Monto + b.Monto };
    }
    public override string ToString() => $"{Monto:N2} {Moneda}";
}

var total = new Dinero(1000, "CLP") + new Dinero(500, "CLP");   // 1.500,00 CLP
```

### 7.3 Eventos de dominio y mensajes
Los eventos son hechos del pasado: **por definición inmutables**.

```csharp
public abstract record EventoPedido(Guid PedidoId, DateTimeOffset Ocurrido);
public sealed record PedidoCreado(Guid PedidoId, DateTimeOffset Ocurrido, decimal Total) : EventoPedido(PedidoId, Ocurrido);
public sealed record PedidoPagado(Guid PedidoId, DateTimeOffset Ocurrido, string MetodoPago) : EventoPedido(PedidoId, Ocurrido);
public sealed record PedidoCancelado(Guid PedidoId, DateTimeOffset Ocurrido, string Motivo) : EventoPedido(PedidoId, Ocurrido);

// Se combinan de maravilla con pattern matching (Sesión 16)
static string Describir(EventoPedido e) => e switch
{
    PedidoCreado { Total: > 100_000 } c => $"Pedido grande {c.PedidoId}",
    PedidoCreado c                      => $"Pedido {c.PedidoId}",
    PedidoPagado(_, _, var metodo)      => $"Pagado con {metodo}",
    PedidoCancelado { Motivo: var m }   => $"Cancelado: {m}",
    _ => throw new UnreachableException()
};
```

### 7.4 ⚠️ Cuándo NO usar records
- **Entidades de EF Core** (Sesión 25): una entidad tiene **identidad** (su `Id`), no igualdad por valor. Si dos objetos `Cliente` con el mismo estado son "iguales" pero son filas distintas, el change tracker y los `HashSet` de navegación se confunden. Además EF necesita mutarlas. Usa `class`.
- Objetos con **mucho estado mutable** o ciclo de vida (servicios, controllers, repositorios).
- Cuando la igualdad por valor sería **costosa** (records con muchas propiedades usados como claves de diccionario hash-intensivas).

> ❓ **Entrevista**: *"¿Usarías un record para una entidad de EF Core?"* → No en general: las entidades tienen identidad y ciclo de vida; su igualdad debe basarse en el `Id` (o la referencia), no en todos sus campos. Records sí para DTOs, proyecciones de consultas (`Select(x => new ClienteDto(...))`) y Value Objects (como *owned types* o *complex types* de EF Core 8).

---

## 8. Colecciones inmutables y frozen

`System.Collections.Immutable` (incluido en .NET):

```csharp
using System.Collections.Immutable;

var lista = ImmutableList.Create(1, 2, 3);
var lista2 = lista.Add(4);          // NUEVA instancia; 'lista' sigue siendo [1,2,3]

// Para construir muchas: usa un Builder (evita crear N instancias intermedias)
var builder = ImmutableDictionary.CreateBuilder<string, int>();
builder["a"] = 1; builder["b"] = 2;
ImmutableDictionary<string, int> dic = builder.ToImmutable();

ImmutableArray<int> arr = [1, 2, 3];   // collection expression (Sesión 18)
```

| Tipo | Estructura interna | Lectura | "Modificación" | Cuándo |
|---|---|---|---|---|
| `ImmutableList<T>` | Árbol AVL (structural sharing) | O(log n) | O(log n), comparte nodos | Cambios frecuentes, snapshots |
| `ImmutableArray<T>` | Array envuelto (struct) | O(1), muy rápida | O(n): copia todo | Se construye una vez, se lee mucho |
| `FrozenDictionary<K,V>` / `FrozenSet<T>` (.NET 8) | Optimizada al crear | La **más rápida** | ❌ no se modifica | Lookups de config/catálogos que nunca cambian |

```csharp
using System.Collections.Frozen;
FrozenDictionary<string, int> codigos =
    new Dictionary<string, int> { ["CL"] = 56, ["AR"] = 54 }.ToFrozenDictionary();
// Creación más cara, lecturas más rápidas que Dictionary. Ideal para datos estáticos.
```

---

## 9. Otros tipos con semántica similar

- **Tuplas** `(int X, int Y)` (`ValueTuple`): value type, **mutable**, igualdad por valor con `==` (C# 7.3). Ideales para retornos locales, no para APIs públicas.
- **Anonymous types** `new { Nombre = "Ana" }`: referencia, inmutables, igualdad por valor en `Equals` (no en `==`), usados en LINQ (Sesión 9). Soportan `with` desde C# 10.
- **`readonly struct`**: el compilador garantiza que todos los campos son `readonly` y evita *defensive copies* al pasarlos con `in` (Sesión 4).

```csharp
var t1 = (1, "a"); var t2 = (1, "a");
Console.WriteLine(t1 == t2);           // True

var an = new { Nombre = "Ana", Edad = 30 };
var an2 = an with { Edad = 31 };       // C# 10
```

---

## Resumen mental de la sesión

```
INMUTABLE = no cambia tras construirse → thread-safe, hash estable, fácil de razonar
Herramientas:  readonly (campos) · { get; } · { get; init; } · required
Trampa #1:     inmutabilidad SUPERFICIAL — readonly List<T> se puede .Add()
               → IReadOnlyList (vista) · ReadOnlyCollection (wrapper) · ImmutableList (garantía)

record Persona(string Nombre, int Edad);   // record class = REFERENCIA
  genera: ctor, props init, Deconstruct, Equals/GetHashCode/==/!= por VALOR,
          ToString bonito, <Clone>$ para 'with', EqualityContract
  with   → copia SUPERFICIAL + init de lo cambiado (no pasa por el ctor primario)
  igualdad por valor también SUPERFICIAL: List/array comparan por referencia

record struct        → props { get; set; }  ¡mutable!
readonly record struct → inmutable, sin heap, Equals rápido (sin reflection)

Usa record: DTOs, eventos, mensajes, Value Objects
Evita record: entidades EF Core (identidad), servicios, estado mutable
Colecciones: ImmutableList (árbol) · ImmutableArray (lectura rápida) · Frozen* (.NET 8, solo lectura)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Da tres razones concretas por las que la inmutabilidad reduce bugs.
2. ❓ ¿Diferencia entre `{ get; }`, `{ get; init; }` y `{ get; private set; }`?
3. ❓ ¿Qué significa "inmutabilidad superficial"? Da un ejemplo con `init` y con `with`.
4. ❓ Enumera todo lo que el compilador genera para `record Persona(string Nombre, int Edad)`.
5. ❓ ¿Un `record` es value type o reference type? ¿Y `record struct`?
6. ❓ ¿Qué es `EqualityContract` y qué problema de herencia resuelve?
7. ❓ Dos records con listas de igual contenido, ¿son `==`? ¿Por qué?
8. ❓ ¿Por qué las propiedades de un `record struct` posicional son mutables y cómo lo evitas?
9. ❓ ¿Qué ventaja tiene `record struct` sobre un `struct` normal en igualdad?
10. ❓ ¿Por qué `with` puede romper las invariantes validadas en el constructor?
11. ❓ ¿Usarías records para entidades de EF Core? ¿Y para Value Objects?
12. ❓ `ImmutableList<T>` vs `ImmutableArray<T>` vs `FrozenDictionary<K,V>`: ¿cuándo cada uno?

## Ejercicio práctico
1. Crea `dotnet new console -o RecordsDemo`.
2. Reproduce el bug de §1: un `PuntoMutable` en un `HashSet`, cámbialo y comprueba que `Contains` devuelve `False`. Repite con `readonly record struct Punto` y confirma que ya no puedes mutarlo.
3. Declara `record Persona(string Nombre, int Edad)`. Compara dos instancias iguales con `==`, `Equals` y `ReferenceEquals`. Imprime con `ToString`. Crea una copia con `with`.
4. Demuestra las dos trampas superficiales: (a) un record con `List<string>` copiado con `with` y mutado; (b) dos records con listas iguales que **no** son `==`. Arregla ambas usando `ImmutableList` + `Equals`/`GetHashCode` personalizados con `SequenceEqual`.
5. Implementa un Value Object `Dinero` como `readonly record struct` con `operator +` que valide la moneda, y un `record Email` que valide y normalice en el constructor.
6. Modela 3 eventos de un pedido con `sealed record` heredando de `abstract record EventoPedido` y procésalos con un `switch` de pattern matching.
7. (Opcional avanzado) Abre el `.dll` en ILSpy/SharpLab y mira el código generado para un record: busca `<Clone>$`, `EqualityContract`, `PrintMembers` y el constructor de copia protegido.

---

➡️ **Cuando termines**, marca la Sesión 17 en el [README](Readme.md) y pídeme la **Sesión 18 — Features modernas (top-level, global using, primary ctors, collection expressions)**.
