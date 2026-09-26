# Sesión 6 — Propiedades, indexadores e init-only: encapsulación con estilo C#

> **Objetivo de la sesión**: entender *por qué* C# tiene propiedades en lugar de getters/setters al estilo Java, *qué genera* el compilador cuando escribes `{ get; set; }`, y dominar todas sus variantes: auto-properties, propiedades calculadas, `init`, `required`, `field` backing explícito, propiedades estáticas y de solo lectura, e **indexadores** (`this[...]`). Al terminar deberías poder explicar la diferencia entre campo y propiedad, entre `readonly`, `get`-only e `init`, y diseñar una clase con una API pública limpia y segura.

---

## 1. El problema: campos públicos vs encapsulación

En la Sesión 5 vimos que la **encapsulación** consiste en ocultar el estado interno y exponer solo una API controlada. La forma más ingenua de exponer datos es un **campo público**:

```csharp
public class Cuenta
{
    public decimal Saldo;   // campo público: cualquiera puede escribir -1000
}

var c = new Cuenta();
c.Saldo = -1_000_000m;      // nada lo impide. Invariante rota.
```

Problemas de un campo público:
- **No hay validación**: no puedes impedir valores inválidos.
- **No puedes cambiar la implementación** sin romper a los clientes (pasar de campo a cálculo, agregar logging, lazy loading…).
- **Cambiar un campo a propiedad es un *breaking change binario***: el IL para acceder a un campo (`ldfld`) es distinto del de llamar a un método (`call get_Saldo`). Los assemblies que te consumen deben recompilarse.
- No participa en **data binding**, serialización por convención, interfaces (las interfaces no pueden declarar campos de instancia).

En Java la solución es escribir métodos `getSaldo()` / `setSaldo()` a mano. C# eleva ese patrón a **característica del lenguaje**: la **propiedad**.

---

## 2. ¿Qué es una propiedad? (lo que genera el compilador)

Una propiedad **parece un campo** desde fuera, pero **es un par de métodos** por dentro.

```csharp
public class Cuenta
{
    private decimal _saldo;                 // campo privado: el "backing field"

    public decimal Saldo                    // propiedad pública
    {
        get { return _saldo; }              // accessor get → método get_Saldo()
        set                                 // accessor set → método set_Saldo(decimal value)
        {
            if (value < 0)
                throw new ArgumentOutOfRangeException(nameof(value), "El saldo no puede ser negativo");
            _saldo = value;                 // 'value' es el parámetro implícito del set
        }
    }
}

var c = new Cuenta();
c.Saldo = 100m;        // en IL: call set_Saldo(100)
Console.WriteLine(c.Saldo); // en IL: call get_Saldo()
c.Saldo = -5m;         // 💥 ArgumentOutOfRangeException
```

Lo que Roslyn emite (simplificado):

```
Propiedad "Saldo" (metadata)
   ├── get_Saldo()        : decimal      ← método normal
   └── set_Saldo(decimal) : void         ← método normal
```

> ❓ **Entrevista**: *"¿Cuál es la diferencia entre un campo y una propiedad?"* → Un **campo** es una variable almacenada en el objeto. Una **propiedad** es un miembro con accessors `get`/`set` que el compilador traduce a **métodos**; puede tener lógica, validación, ser virtual, abstracta, estar en una interfaz, y cambiar su implementación sin romper la compatibilidad binaria de los consumidores.

| | Campo | Propiedad |
|---|---|---|
| Qué es | Almacenamiento | Par de métodos (+ opcional almacenamiento) |
| Validación / lógica | ❌ | ✅ |
| Puede ir en una `interface` | ❌ (instancia) | ✅ |
| `virtual` / `abstract` / `override` | ❌ | ✅ |
| Pasar por `ref` / `out` | ✅ | ❌ (salvo `ref` returns) |
| Cambiar implementación sin romper binario | ❌ | ✅ |
| Rendimiento | Acceso directo | Normalmente igual: el JIT hace *inlining* de accessors triviales |

> ⚠️ **No puedes pasar una propiedad como `ref`/`out`** (Sesión 4): `int.TryParse("5", out obj.Valor)` no compila si `Valor` es propiedad, porque no es una ubicación de memoria, es una llamada a método.

**Convención**: campos `private` (con `_camelCase`), propiedades `public` (con `PascalCase`). Los campos públicos solo se aceptan para `const` o `static readonly` en casos puntuales.

---

## 3. Auto-properties: el caso común

Si el get/set no tiene lógica, escribir el backing field a mano es ruido. Desde C# 3:

```csharp
public class Persona
{
    public string Nombre { get; set; } = "";   // auto-property con inicializador (C# 6)
    public int Edad { get; set; }
}
```

El compilador **genera un backing field oculto** (con un nombre ilegal en C#, algo como `<Nombre>k__BackingField`, para que no colisione con nada) y los accessors triviales.

```
public string Nombre { get; set; }
            │
            ▼  (Roslyn)
private string <Nombre>k__BackingField;
public string get_Nombre() => <Nombre>k__BackingField;
public void   set_Nombre(string value) => <Nombre>k__BackingField = value;
```

**¿Por qué usar una auto-property y no un campo público si "hacen lo mismo"?** Porque mañana puedes agregarle validación **sin romper** a nadie (la firma pública sigue siendo `get_Nombre`/`set_Nombre`), y porque funciona con interfaces, serializadores, ORMs (EF Core, Sesión 25) y binding.

---

## 4. Controlando el acceso: modificadores en accessors

Cada accessor puede tener un modificador **más restrictivo** que la propiedad:

```csharp
public class Pedido
{
    public Guid Id { get; } = Guid.NewGuid();         // get-only: se asigna solo en ctor/inicializador
    public DateTime CreadoEn { get; private set; }    // lectura pública, escritura solo dentro de la clase
    public decimal Total { get; protected set; }      // escritura desde la clase y derivadas
    public string Estado { get; internal set; } = "Nuevo"; // escritura desde el mismo assembly

    public Pedido()
    {
        CreadoEn = DateTime.UtcNow;   // OK: private set
    }

    public void AgregarLinea(decimal monto)
    {
        if (monto <= 0) throw new ArgumentException("Monto inválido", nameof(monto));
        Total += monto;               // OK: dentro de la clase
    }
}

var p = new Pedido();
p.AgregarLinea(50m);
// p.Total = 0;       // ❌ CS0272: el set es inaccesible
// p.Id = Guid.Empty; // ❌ CS0200: la propiedad es de solo lectura
```

Reglas:
- Solo **uno** de los dos accessors puede llevar modificador.
- El modificador del accessor debe ser **más restrictivo** que el de la propiedad.

### 4.1 get-only vs `private set` (diferencia sutil pero importante)

| | `{ get; }` | `{ get; private set; }` |
|---|---|---|
| Asignable en constructor | ✅ | ✅ |
| Asignable en otros métodos de la clase | ❌ | ✅ |
| Backing field generado | `readonly` | no `readonly` |
| Inmutabilidad real | ✅ (tras construir) | ❌ (la clase puede mutarlo) |

> ❓ **Entrevista**: *"¿`{ get; }` es igual a `{ get; private set; }`?"* → No. `{ get; }` genera un backing field **`readonly`**: solo se asigna en el constructor o inicializador. `private set` permite que cualquier método de la clase lo cambie después.

---

## 5. Propiedades calculadas y expression-bodied members

Una propiedad no necesita almacenamiento: puede **calcularse** a partir de otros datos.

```csharp
public class Rectangulo
{
    public double Ancho { get; set; }
    public double Alto { get; set; }

    // Propiedad calculada con expression body (C# 6): solo get
    public double Area => Ancho * Alto;

    // Equivalente largo:
    // public double Area { get { return Ancho * Alto; } }

    // Expression body en ambos accessors (C# 7)
    private string _nombre = "";
    public string Nombre
    {
        get => _nombre;
        set => _nombre = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
    }
}
```

> ⚠️ **Cuidado con la confusión `=>` vs `=`**:
> ```csharp
> public DateTime Ahora => DateTime.Now;   // se EVALÚA en cada acceso (propiedad calculada)
> public DateTime Creado { get; } = DateTime.Now; // se evalúa UNA vez al construir (inicializador)
> ```
> Un solo carácter de diferencia, comportamiento totalmente distinto. Error clásico en code review: `public List<int> Items => new();` crea una lista **nueva** cada vez que la lees, así que `obj.Items.Add(1)` se pierde.

### 5.1 ¿Propiedad o método? (guía de diseño)

Las propiedades deben *sentirse* como campos. Usa un **método** si:
- La operación es **costosa** (consulta a BD, I/O, cálculo pesado) → `GetClientes()`, no `Clientes`.
- Tiene **efectos secundarios** observables.
- Devuelve un resultado **distinto en cada llamada** sin cambio de estado (`Guid.NewGuid()` es método, no propiedad).
- Devuelve una **copia** de un array interno (el cliente podría asumir que modifica el original).
- Necesita **parámetros** (salvo indexadores).

> ⚠️ **Los getters no deben lanzar excepciones** normalmente (el debugger los evalúa al inspeccionar variables; un getter que lanza o tiene efectos secundarios vuelve loco al debugger). Los setters sí pueden lanzar por validación.

---

## 6. `init`: inmutabilidad con object initializers (C# 9)

Problema: queremos objetos **inmutables** (que no cambien tras crearse), pero también queremos la sintaxis cómoda de **object initializer**:

```csharp
var p = new Punto { X = 1, Y = 2 };   // object initializer
```

Con `{ get; }` no se puede (el initializer se ejecuta **después** del constructor, llamando al setter). Con `{ get; set; }` sí, pero entonces cualquiera puede mutarlo después. La solución: **`init`**.

```csharp
public class Punto
{
    public int X { get; init; }   // se puede asignar en el initializer, nunca después
    public int Y { get; init; }
}

var p = new Punto { X = 1, Y = 2 };  // ✅ permitido: fase de inicialización
// p.X = 10;                         // ❌ CS8852: solo se puede asignar en un initializer

var q = p with { X = 5 };            // (solo records/structs; Sesión 17) copia con cambios
```

Orden de ejecución de `new Punto { X = 1 }`:

```
1. Se reserva memoria (campos en default)
2. Inicializadores de campos/propiedades  ( = valor )
3. Constructor
4. Object initializer  { X = 1, Y = 2 }   ← aquí 'init' todavía está permitido
5. ──── a partir de aquí el objeto es "inmutable" para las init ────
```

`init` también puede tener cuerpo con validación:

```csharp
public class Producto
{
    private readonly decimal _precio;          // readonly: se puede asignar desde un init accessor

    public decimal Precio
    {
        get => _precio;
        init => _precio = value >= 0 ? value
                         : throw new ArgumentOutOfRangeException(nameof(value));
    }
}
```

> ❓ **Entrevista**: *"¿Diferencia entre `readonly`, get-only e `init`?"*
> - **`readonly` (campo)**: asignable solo en declaración o constructor.
> - **`{ get; }`**: propiedad cuyo backing field es readonly → asignable en constructor/inicializador de la propiedad.
> - **`{ get; init; }`**: además del constructor, asignable en un **object initializer** (y en `with`). Después, inmutable.

> ⚠️ **`init` es inmutabilidad superficial (shallow)**: si la propiedad es `List<string> Tags { get; init; }`, no puedes reasignar la lista pero sí `p.Tags.Add("x")`. Para inmutabilidad profunda usa `IReadOnlyList<T>` o colecciones inmutables (Sesión 7, 17).

> ⚠️ **`init` se puede saltar vía reflection** (y los serializadores lo hacen). Es una garantía del compilador, no del runtime. Internamente, `init` se marca con el *modreq* `IsExternalInit`, de modo que compiladores antiguos no puedan llamarlo como un set normal.

---

## 7. `required`: obligar a inicializar (C# 11)

`init` resuelve la mutabilidad, pero no obliga al cliente a asignar el valor. Esto compila y deja `Email` en `null`:

```csharp
var u = new Usuario { Nombre = "Ana" };   // ¿y el Email?
```

Con **`required`**, el compilador exige que se asigne en el object initializer:

```csharp
public class Usuario
{
    public required string Nombre { get; init; }
    public required string Email { get; init; }
    public string? Telefono { get; init; }          // opcional
}

var ok = new Usuario { Nombre = "Ana", Email = "ana@x.cl" };   // ✅
// var mal = new Usuario { Nombre = "Ana" };   // ❌ CS9035: 'Email' es required y debe establecerse
```

Si un constructor sí inicializa todo, puedes decírselo al compilador con `[SetsRequiredMembers]`:

```csharp
using System.Diagnostics.CodeAnalysis;

public class Usuario
{
    public required string Nombre { get; init; }
    public required string Email { get; init; }

    public Usuario() { }                          // el cliente deberá usar initializer

    [SetsRequiredMembers]                         // "confía en mí: este ctor asigna todos los required"
    public Usuario(string nombre, string email)
    {
        Nombre = nombre;
        Email = email;
    }
}

var u2 = new Usuario("Luis", "luis@x.cl");        // ✅ sin initializer
```

> 💡 `required` + Nullable Reference Types (Sesión 15) es la combinación moderna para DTOs: el compilador deja de advertir "propiedad no-nullable sin inicializar" porque sabe que el cliente la asignará.

| Modificador | Qué garantiza |
|---|---|
| `set` | Se puede escribir siempre |
| `init` | Solo se escribe durante la construcción |
| `required` | **Debe** escribirse durante la construcción |
| `required` + `init` | Obligatorio **e** inmutable (el patrón ideal para DTOs/modelos) |

---

## 8. Backing field explícito con `field` (C# 14 / preview en C# 13)

Durante años existió un dilema: si querías **una pizca** de lógica en el setter (p. ej. `Trim()` o notificar un cambio), tenías que abandonar la auto-property y declarar el campo a mano. C# 14 (.NET 10) introduce la palabra contextual **`field`**, que referencia el backing field generado:

```csharp
// C# 14 (.NET 10). En .NET 8 / C# 12 usa el patrón clásico con _campo.
public class Cliente
{
    public string Nombre
    {
        get;
        set => field = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
    } = "";
}
```

Equivalente en **C# 12** (lo que escribirás en este curso con .NET 8):

```csharp
public class Cliente
{
    private string _nombre = "";
    public string Nombre
    {
        get => _nombre;
        set => _nombre = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
    }
}
```

Lo retomamos en la Sesión 32 (evolución de C#). Es importante conocerlo porque aparece en entrevistas de "¿qué hay de nuevo?".

---

## 9. Ejemplo real: `INotifyPropertyChanged`

El uso más clásico de propiedades con lógica: notificar a la UI (WPF, MAUI, Blazor) cuando cambia un valor. Adelanta conceptos de eventos (Sesión 11):

```csharp
using System.ComponentModel;
using System.Runtime.CompilerServices;

public class PerfilViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    private string _nombre = "";
    public string Nombre
    {
        get => _nombre;
        set => SetField(ref _nombre, value);          // ref a un CAMPO: sí se puede
    }

    private int _edad;
    public int Edad
    {
        get => _edad;
        set
        {
            if (SetField(ref _edad, value))
                OnPropertyChanged(nameof(EsMayorDeEdad)); // propiedad dependiente
        }
    }

    public bool EsMayorDeEdad => Edad >= 18;

    // [CallerMemberName] inyecta el nombre de la propiedad que llama ("Nombre", "Edad")
    protected bool SetField<T>(ref T campo, T valor, [CallerMemberName] string? prop = null)
    {
        if (EqualityComparer<T>.Default.Equals(campo, valor)) return false; // sin cambios → no notificar
        campo = valor;
        OnPropertyChanged(prop);
        return true;
    }

    protected void OnPropertyChanged(string? prop) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(prop));
}

var vm = new PerfilViewModel();
vm.PropertyChanged += (_, e) => Console.WriteLine($"Cambió: {e.PropertyName}");
vm.Nombre = "Ana";   // Cambió: Nombre
vm.Edad = 20;        // Cambió: Edad / Cambió: EsMayorDeEdad
vm.Edad = 20;        // (nada: mismo valor)
```

Observa el patrón: `SetField<T>` es genérico (Sesión 8) y usa `EqualityComparer<T>.Default` (Sesión 7), y `ref` funciona porque pasamos el **campo**, no la propiedad.

---

## 10. Propiedades en herencia e interfaces

Como las propiedades son métodos, participan del polimorfismo (Sesión 5):

```csharp
public interface IFigura
{
    string Nombre { get; }        // la interfaz exige un get (la implementación puede añadir set)
    double Area { get; }
}

public abstract class Figura : IFigura
{
    public abstract double Area { get; }            // abstracta: sin implementación
    public virtual string Nombre => GetType().Name; // virtual: sobrescribible
}

public sealed class Circulo(double radio) : Figura  // primary constructor (C# 12, Sesión 18)
{
    public double Radio { get; } = radio;
    public override double Area => Math.PI * Radio * Radio;
    public override string Nombre => $"Círculo r={Radio}";
}

IFigura f = new Circulo(2);
Console.WriteLine($"{f.Nombre}: {f.Area:F2}");       // Círculo r=2: 12.57
```

> ⚠️ Una interfaz con `{ get; }` **no** impide que la clase tenga `set`: el contrato dice "al menos se puede leer". Si expones el objeto como la interfaz, el cliente solo ve el `get`.

### 10.1 Propiedades estáticas

```csharp
public class Config
{
    public static int Instancias { get; private set; }   // compartida por todas las instancias
    public static string Version => "1.0.0";
    public Config() => Instancias++;
}
```

---

## 11. Indexadores: `this[...]`

Un **indexador** permite que un objeto se use con sintaxis de array: `obj[i]`. Es, literalmente, una **propiedad con parámetros**, cuyo nombre en IL es `Item` (`get_Item`/`set_Item`).

```csharp
public class Matriz
{
    private readonly double[,] _datos;
    public int Filas { get; }
    public int Columnas { get; }

    public Matriz(int filas, int columnas)
    {
        Filas = filas;
        Columnas = columnas;
        _datos = new double[filas, columnas];
    }

    // Indexador de dos parámetros
    public double this[int fila, int col]
    {
        get
        {
            ValidarIndices(fila, col);
            return _datos[fila, col];
        }
        set
        {
            ValidarIndices(fila, col);
            _datos[fila, col] = value;
        }
    }

    private void ValidarIndices(int f, int c)
    {
        if ((uint)f >= (uint)Filas) throw new IndexOutOfRangeException($"fila {f}");   // truco: cubre negativos
        if ((uint)c >= (uint)Columnas) throw new IndexOutOfRangeException($"col {c}");
    }
}

var m = new Matriz(2, 2);
m[0, 0] = 1.5;          // set_Item(0, 0, 1.5)
Console.WriteLine(m[0, 0]); // get_Item(0, 0)
```

> 💡 El truco `(uint)i >= (uint)length` convierte un negativo en un número enorme, así un solo `if` cubre `i < 0` e `i >= length`. Lo usa la propia BCL.

### 11.1 Indexadores con otros tipos de clave y sobrecarga

```csharp
public class Inventario
{
    private readonly Dictionary<string, int> _stock = new(StringComparer.OrdinalIgnoreCase);

    // Indexador por string (como Dictionary)
    public int this[string sku]
    {
        get => _stock.TryGetValue(sku, out var n) ? n : 0;  // decisión de diseño: 0 si no existe
        set
        {
            ArgumentOutOfRangeException.ThrowIfNegative(value);  // helper .NET 8
            _stock[sku] = value;
        }
    }

    // Sobrecarga: indexador de solo lectura por posición
    public string this[int posicion] => _stock.Keys.ElementAt(posicion);
}

var inv = new Inventario();
inv["ABC-1"] = 10;
inv["abc-1"] += 5;                 // mismo SKU (comparador ignore case) → get + set
Console.WriteLine(inv["ABC-1"]);   // 15
Console.WriteLine(inv[0]);         // ABC-1
```

### 11.2 Soporte para `Index` (`^`) y `Range` (`..`)

Desde C# 8, si tu tipo tiene `Length`/`Count` y un indexador `int`, el compilador **automáticamente** soporta `obj[^1]` (desde el final). Para `obj[1..3]` necesitas además un método `Slice(int start, int length)`:

```csharp
public class Ventana
{
    private readonly int[] _v;
    public Ventana(params int[] v) => _v = v;
    public int Count => _v.Length;                  // "Length" o "Count" habilita ^
    public int this[int i] => _v[i];
    public Ventana Slice(int start, int length) => new(_v.AsSpan(start, length).ToArray()); // habilita ..
}

var w = new Ventana(10, 20, 30, 40);
Console.WriteLine(w[^1]);        // 40  → el compilador traduce a w[w.Count - 1]
var sub = w[1..3];               // → w.Slice(1, 2)  → {20, 30}
Console.WriteLine(sub[0]);       // 20
```

| | Propiedad | Indexador |
|---|---|---|
| Nombre | Tiene nombre (`Saldo`) | Sin nombre: `this[...]` (IL: `Item`) |
| Parámetros | No | Sí (uno o varios, de cualquier tipo) |
| Acceso | `obj.Saldo` | `obj[clave]` |
| Puede ser `static` | ✅ | ❌ |
| Sobrecarga | ❌ | ✅ (por firma de parámetros) |
| Auto-implementado | ✅ | ❌ (siempre escribes el cuerpo) |

> ❓ **Entrevista**: *"¿Qué es un indexador y en qué se diferencia de una propiedad?"* → Es una propiedad **parametrizada** que permite `obj[x]`. No tiene nombre (se declara con `this`), acepta parámetros, puede sobrecargarse y no puede ser estática. `List<T>`, `Dictionary<TKey,TValue>` y `string` los usan.

> ⚠️ Si otro lenguaje .NET consume tu indexador, puedes renombrar el `Item` con `[IndexerName("Celda")]`. Y como `Item` queda reservado, **no puedes** tener a la vez un indexador y una propiedad llamada `Item`.

---

## 12. Errores comunes (checklist de code review)

```csharp
// ❌ 1. Recursión infinita: el setter se llama a sí mismo → StackOverflowException
public string Nombre { get => Nombre; set => Nombre = value; }
// ✅ usa el campo: get => _nombre; set => _nombre = value;

// ❌ 2. Exponer una colección mutable interna
public List<string> Roles { get; } = new();   // el cliente hace Roles.Clear()
// ✅ exponer vista de solo lectura
private readonly List<string> _roles = new();
public IReadOnlyList<string> Roles => _roles;  // (aún se puede castear; para garantía total: _roles.AsReadOnly())

// ❌ 3. Propiedad costosa
public List<Cliente> Clientes => _db.Clientes.ToList();  // query en cada acceso
// ✅ método explícito
public Task<List<Cliente>> ObtenerClientesAsync() => _db.Clientes.ToListAsync();

// ❌ 4. '=>' donde querías '='
public List<int> Items => new();       // lista nueva en cada lectura
// ✅
public List<int> Items { get; } = new();

// ❌ 5. Mutar un struct devuelto por propiedad
public struct P { public int X; }
public class H { public P Pos { get; set; } }
// h.Pos.X = 5;  // ❌ CS1612: modificas una COPIA (value type, Sesión 2)
```

> ❓ **Entrevista**: *"¿Por qué `h.Pos.X = 5` no compila si `Pos` es un struct?"* → Porque el getter devuelve una **copia** del struct (value type). Modificar esa copia temporal no tendría efecto, así que el compilador lo prohíbe. Solución: `var p = h.Pos; p.X = 5; h.Pos = p;` o hacer el struct inmutable.

---

## Resumen mental de la sesión

```
Campo      = almacenamiento (privado, _camelCase)
Propiedad  = get_X() / set_X(value)  → parece campo, ES método
   ├── auto-property   { get; set; }        → backing field oculto
   ├── get-only        { get; }             → backing field readonly (solo ctor)
   ├── private set     { get; private set; }→ la clase puede mutarla
   ├── init            { get; init; }       → ctor + object initializer + with
   ├── required        required ... init    → OBLIGATORIO en el initializer
   ├── calculada       => expr              → se evalúa en cada acceso
   └── field (C# 14)   set => field = ...   → lógica sin declarar el campo

Indexador  = this[params]  → propiedad con parámetros (IL: Item), sobrecargable, no static
   ^ y ..  → gratis con Count/Length + this[int] (+ Slice para rangos)

Regla: si es caro, tiene efectos o cambia en cada llamada → MÉTODO, no propiedad
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué diferencia hay entre un campo y una propiedad? ¿Qué genera el compilador para una propiedad?
2. ❓ ¿Por qué cambiar un campo público a propiedad es un *breaking change* binario?
3. ❓ ¿`{ get; }` vs `{ get; private set; }` vs `{ get; init; }`?
4. ❓ ¿Qué problema resuelve `required` que `init` no resuelve? ¿Para qué sirve `[SetsRequiredMembers]`?
5. ❓ ¿Qué diferencia hay entre `public DateTime X => DateTime.Now;` y `public DateTime X { get; } = DateTime.Now;`?
6. ❓ ¿Cuándo preferirías un método en lugar de una propiedad?
7. ❓ ¿Por qué no puedes pasar una propiedad como argumento `out`?
8. ❓ ¿Qué es un indexador? ¿Cómo se llama en IL y qué restricciones tiene?
9. ❓ ¿Qué necesita un tipo para soportar `obj[^1]` y `obj[1..3]`?
10. ❓ ¿`init` garantiza inmutabilidad profunda? ¿Y en runtime?
11. ❓ ¿Por qué `h.Pos.X = 5` no compila cuando `Pos` es un struct expuesto por propiedad?

## Ejercicio práctico
1. Crea un proyecto: `dotnet new console -o PropiedadesLab && cd PropiedadesLab`.
2. Implementa una clase `CuentaBancaria` con:
   - `Id` (`Guid`, get-only, generado en el constructor).
   - `required string Titular { get; init; }`.
   - `Saldo` con `private set` y métodos `Depositar(decimal)` / `Retirar(decimal)` que validen montos y fondos.
   - `IReadOnlyList<string> Movimientos` expuesta sobre una `List<string>` privada.
   - Propiedad calculada `bool EnRojo => Saldo < 0;` (debería ser siempre `false` si validas bien).
3. Intenta `cuenta.Saldo = 1000;` y `new CuentaBancaria()` sin `Titular`: anota los códigos de error del compilador (CS0272, CS9035).
4. Crea una clase `Tablero` (tres en raya) con un indexador `char this[int fila, int col]` que valide rangos y solo permita `'X'`, `'O'` o `' '`. Agrega un indexador sobrecargado `char this[string celda]` que acepte `"A1"`, `"B3"`, etc.
5. Añade `Count` y verifica que `tablero[^1]`… ¿por qué **no** funciona con un indexador de dos dimensiones? (pista: el soporte implícito de `Index` requiere un indexador de **un** `int`).
6. (Opcional avanzado) Compila y abre el `.dll` con ILSpy o `ildasm`: busca `<Titular>k__BackingField`, `get_Item`/`set_Item` y el `modreq(IsExternalInit)` del init.

---

➡️ **Cuando termines**, marca la Sesión 6 en el [README](Readme.md) y pídeme la **Sesión 7 — Colecciones (List, Dictionary, HashSet, Queue, Stack…)**.
