# Sesión 5 — Programación Orientada a Objetos: clases, los 4 pilares y el diseño con tipos

> **Objetivo de la sesión**: dominar la POO en C#: clases, objetos, constructores, modificadores de acceso, y los **cuatro pilares** (encapsulación, abstracción, herencia, polimorfismo) con la mecánica real de `virtual`/`override`/`new`/`sealed`. Además: clases abstractas vs interfaces (incluidos *default interface methods*), `static`, `object` y sus métodos (`Equals`, `GetHashCode`, `ToString`), y la regla de oro "composición sobre herencia". Al terminar deberías poder explicar qué es el *dynamic dispatch*, por qué `new` en un método es peligroso y cuándo elegir interfaz o clase abstracta.

---

## 1. Clase y objeto

- **Clase**: el **molde** (tipo) que define datos (*estado*) y comportamiento (*métodos*).
- **Objeto** (instancia): una **concreción** de ese molde en memoria (heap, Sesión 2), con su propio estado.

```csharp
public class CuentaBancaria
{
    // ── Campos (estado). Privados por convención: _camelCase
    private decimal _saldo;
    private readonly List<string> _movimientos = new();

    // ── Propiedades (acceso controlado al estado, Sesión 6)
    public string Titular { get; }
    public string Numero { get; }
    public decimal Saldo => _saldo;              // solo lectura hacia afuera

    // ── Constructor: inicializa un objeto válido
    public CuentaBancaria(string titular, string numero, decimal saldoInicial = 0)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(titular);
        if (saldoInicial < 0) throw new ArgumentOutOfRangeException(nameof(saldoInicial));

        Titular = titular;
        Numero = numero;
        _saldo = saldoInicial;
    }

    // ── Métodos (comportamiento)
    public void Depositar(decimal monto)
    {
        if (monto <= 0) throw new ArgumentOutOfRangeException(nameof(monto));
        _saldo += monto;
        _movimientos.Add($"+{monto}");
    }

    public bool Retirar(decimal monto)
    {
        if (monto <= 0 || monto > _saldo) return false;
        _saldo -= monto;
        _movimientos.Add($"-{monto}");
        return true;
    }

    public IReadOnlyList<string> Movimientos => _movimientos;   // exponer sin permitir modificar
}

var cuenta = new CuentaBancaria("Waddini", "001-123", 1_000m);   // instanciar
cuenta.Depositar(500m);
cuenta.Retirar(200m);
Console.WriteLine(cuenta.Saldo);        // 1300
// cuenta._saldo = 1_000_000;           // ❌ no compila: es privado
```

### 1.1 `this`

`this` es la referencia al objeto actual. Se usa para desambiguar, pasar el objeto actual a otro método o encadenar constructores.

---

## 2. Constructores (en detalle)

```csharp
public class Producto
{
    private static int _contador;                // compartido por TODAS las instancias

    public int Id { get; }
    public string Nombre { get; }
    public decimal Precio { get; }

    // Constructor estático: se ejecuta UNA vez, antes del primer uso del tipo
    static Producto()
    {
        _contador = 1000;
        Console.WriteLine("Tipo Producto inicializado");
    }

    // Constructor principal
    public Producto(string nombre, decimal precio)
    {
        Id = ++_contador;
        Nombre = nombre;
        Precio = precio;
    }

    // Encadenamiento con this(...): evita duplicar lógica
    public Producto(string nombre) : this(nombre, 0m) { }
}

var p1 = new Producto("Teclado", 25_000m);   // imprime "Tipo Producto inicializado" (solo la 1ª vez)
var p2 = new Producto("Mouse");
Console.WriteLine($"{p1.Id} {p2.Id}");        // 1001 1002
```

| Tipo de constructor | Características |
|---|---|
| **Por defecto** | Si no declaras ninguno, el compilador genera uno público sin parámetros. **Si declaras uno, deja de generarlo.** |
| **Parametrizado** | Recibe datos para dejar el objeto en un estado válido |
| **Encadenado** `: this(...)` | Reutiliza otro constructor de la misma clase |
| **Base** `: base(...)` | Llama al constructor de la clase padre (§6) |
| **Estático** `static Tipo()` | Sin modificadores ni parámetros; lo invoca el CLR una sola vez, thread-safe |
| **Privado** | Impide instanciar desde fuera (Singleton, factories, clases solo-estáticas) |
| **Primario** (C# 12) | `class Servicio(ILogger logger) { ... }` — parámetros en la declaración de la clase (Sesión 18) |

### 2.1 Inicializadores de objeto

```csharp
public class Direccion
{
    public string Calle { get; set; } = "";
    public string Ciudad { get; set; } = "Santiago";   // valor por defecto
    public required string Pais { get; init; }          // C# 11: OBLIGATORIO en el inicializador
}

var d = new Direccion { Calle = "Av. Providencia 123", Pais = "CL" };
// var d2 = new Direccion { Calle = "x" };   // ❌ CS9035: falta el miembro required 'Pais'
```

`init` y `required` se profundizan en las Sesiones 6 y 17.

### 2.2 Orden de inicialización (pregunta de entrevista avanzada)

```
new Derivada()
  1. Inicializadores de CAMPOS de Derivada
  2. Inicializadores de CAMPOS de Base
  3. Cuerpo del constructor de Base
  4. Cuerpo del constructor de Derivada
(Los constructores estáticos corren antes, una vez por tipo)
```

> ⚠️ **Nunca llames a un método `virtual` desde un constructor.** Si la derivada lo sobrescribe, se ejecutará la versión derivada **antes** de que el constructor de la derivada haya corrido, viendo campos sin inicializar.
> ```csharp
> class Base { public Base() => Iniciar(); protected virtual void Iniciar() { } }
> class Hija : Base
> {
>     private readonly string _nombre;
>     public Hija() { _nombre = "hija"; }
>     protected override void Iniciar() => Console.WriteLine(_nombre.Length); // 💥 NullReferenceException
> }
> ```

---

## 3. Modificadores de acceso

| Modificador | Visible desde |
|---|---|
| `public` | Cualquier lugar |
| `private` | Solo dentro del mismo tipo (**default para miembros de clase**) |
| `protected` | El tipo y sus derivados |
| `internal` | Cualquier código del mismo **assembly** (**default para tipos top-level**) |
| `protected internal` | Mismo assembly **O** derivados (unión) |
| `private protected` | Mismo assembly **Y** derivados (intersección) — C# 7.2 |
| `file` | Solo el archivo `.cs` actual (solo para tipos) — C# 11 |

```
                     misma clase  derivada(mismo asm)  otra clase(mismo asm)  derivada(otro asm)  otra(otro asm)
public                   ✅             ✅                   ✅                    ✅                ✅
protected internal       ✅             ✅                   ✅                    ✅                ❌
internal                 ✅             ✅                   ✅                    ❌                ❌
protected                ✅             ✅                   ❌                    ✅                ❌
private protected        ✅             ✅                   ❌                    ❌                ❌
private                  ✅             ❌                   ❌                    ❌                ❌
```

> ❓ **Entrevista**: *"¿Cuál es el acceso por defecto?"* → Para **tipos** declarados en un namespace: `internal`. Para **miembros** de clases y structs: `private`. Para miembros de interfaces: `public`.

> ⚠️ Regla práctica: empieza con **el acceso más restrictivo** posible y ábrelo solo cuando haga falta. Todo lo `public` es un contrato que luego no podrás cambiar sin romper a otros.

---

## 4. Pilar 1 — Encapsulación

**Ocultar el estado interno** y exponer solo operaciones que mantienen el objeto **válido** (sus *invariantes*). No es solo "poner `private`": es que **nadie pueda dejar el objeto en un estado imposible**.

```csharp
// ❌ Sin encapsulación: cualquiera puede romper las reglas
public class CuentaMala
{
    public decimal Saldo;            // cuenta.Saldo = -5000;  ← estado inválido
}

// ✅ Con encapsulación: el saldo solo cambia a través de operaciones que validan
//    (ver CuentaBancaria en §1: _saldo privado, Depositar/Retirar validan)
```

Técnicas de encapsulación en C#:
- Campos `private`, expuestos vía **propiedades** con `get` público y `set` privado o inexistente.
- Validación en constructores y métodos (fail fast).
- Exponer colecciones como `IReadOnlyList<T>` / `IReadOnlyCollection<T>`, no la `List<T>` interna.
- Objetos inmutables cuando sea posible (Sesión 17).

> ❓ **Entrevista**: *"¿Qué es la encapsulación y qué problema resuelve?"* → Es agrupar datos y comportamiento en una unidad y ocultar la representación interna, exponiendo solo una interfaz controlada. Protege los invariantes del objeto (nadie puede ponerlo en un estado inválido) y permite cambiar la implementación interna sin afectar a quienes lo usan.

---

## 5. Pilar 2 — Abstracción

**Modelar solo lo relevante** y exponer *qué* hace algo, ocultando *cómo* lo hace. En C# se materializa con **interfaces** y **clases abstractas**.

```csharp
public interface INotificador               // contrato: QUÉ se puede hacer
{
    Task EnviarAsync(string destino, string mensaje);
}

public class NotificadorEmail : INotificador   // implementación: CÓMO
{
    public Task EnviarAsync(string destino, string mensaje)
    {
        Console.WriteLine($"📧 SMTP → {destino}: {mensaje}");
        return Task.CompletedTask;
    }
}

public class NotificadorSms : INotificador
{
    public Task EnviarAsync(string destino, string mensaje)
    {
        Console.WriteLine($"📱 SMS → {destino}: {mensaje}");
        return Task.CompletedTask;
    }
}

// El código cliente depende de la ABSTRACCIÓN, no del detalle
public class ServicioPedidos(INotificador notificador)     // primary ctor (C# 12, Sesión 18)
{
    public Task ConfirmarAsync(string cliente) =>
        notificador.EnviarAsync(cliente, "Tu pedido fue confirmado");
}
```

Este es exactamente el fundamento de la **Inyección de Dependencias** (Sesión 24) y del testing con mocks (Sesión 27).

> 💡 **Encapsulación vs abstracción** (se confunden siempre): encapsulación = *proteger* el estado (esconder datos). Abstracción = *simplificar* la interfaz (esconder complejidad). Una cuenta con `_saldo` privado está encapsulada; `INotificador` es una abstracción.

---

## 6. Pilar 3 — Herencia

Una clase **derivada** hereda miembros de una clase **base** y puede extenderla o especializarla. Modela una relación **"es un"** (*is-a*).

```csharp
public class Empleado
{
    public string Nombre { get; }
    public decimal SueldoBase { get; }

    public Empleado(string nombre, decimal sueldoBase)
    {
        Nombre = nombre;
        SueldoBase = sueldoBase;
    }

    public virtual decimal CalcularSueldo() => SueldoBase;   // virtual: PUEDE sobrescribirse
    public override string ToString() => $"{GetType().Name} {Nombre}: {CalcularSueldo():C0}";
}

public class Gerente : Empleado                              // Gerente "es un" Empleado
{
    public decimal Bono { get; }

    public Gerente(string nombre, decimal sueldoBase, decimal bono)
        : base(nombre, sueldoBase)                           // llama al ctor de la base
    {
        Bono = bono;
    }

    public override decimal CalcularSueldo() => base.CalcularSueldo() + Bono;   // reutiliza la base
}

public sealed class Vendedor : Empleado                      // sealed: nadie puede heredar de Vendedor
{
    public decimal Ventas { get; set; }
    public Vendedor(string nombre, decimal sueldoBase) : base(nombre, sueldoBase) { }
    public override decimal CalcularSueldo() => SueldoBase + Ventas * 0.05m;
}
```

Reglas de la herencia en C#:
- **Herencia simple**: una clase hereda de **una sola** clase base (pero puede implementar **muchas** interfaces). Evita el "problema del diamante".
- Toda clase hereda en última instancia de **`System.Object`**.
- Los **constructores no se heredan**; la derivada debe llamar a uno de la base con `: base(...)` (si la base no tiene ctor sin parámetros, es obligatorio).
- Los **structs no admiten herencia** (son implícitamente `sealed`, heredan de `ValueType`).
- `sealed` en una clase impide heredar; en un `override` impide seguir sobrescribiéndolo.

```
                System.Object
                      │
                  Empleado            (virtual CalcularSueldo)
                 ┌────┴─────┐
             Gerente     Vendedor     (override CalcularSueldo)
                          [sealed]
```

---

## 7. Pilar 4 — Polimorfismo

**"Muchas formas"**: tratar objetos de distintos tipos a través de un tipo común, y que **cada uno responda con su propio comportamiento**.

```csharp
List<Empleado> plantilla =
[                                               // collection expression (C# 12)
    new Empleado("Ana", 1_000_000m),
    new Gerente("Luis", 2_000_000m, 500_000m),
    new Vendedor("Carla", 800_000m) { Ventas = 10_000_000m }
];

foreach (Empleado e in plantilla)               // la variable es de tipo Empleado...
    Console.WriteLine(e);                        // ...pero se ejecuta el CalcularSueldo del tipo REAL

// Empleado Ana: $1.000.000
// Gerente Luis: $2.500.000
// Vendedor Carla: $1.300.000

decimal total = plantilla.Sum(e => e.CalcularSueldo());   // un solo código para todos
```

### 7.1 Tipos de polimorfismo

| Tipo | Mecanismo en C# | Se resuelve en |
|---|---|---|
| **Estático** (ad-hoc) | Sobrecarga de métodos y operadores (Sesión 4) | Compilación |
| **Dinámico** (de subtipos) | `virtual` / `override` / `abstract` / interfaces | **Ejecución** |
| **Paramétrico** | Generics `List<T>` (Sesión 8) | Compilación + JIT |

### 7.2 ¿Cómo funciona por dentro? (dynamic dispatch)

Cada tipo tiene una **MethodTable** con una **VTable**: una tabla de punteros a la implementación de cada método virtual. Un `override` **reemplaza** la entrada de la base en la VTable de la derivada. Al llamar `e.CalcularSueldo()`, el CLR mira el tipo **real** del objeto (vía el puntero MethodTable en su header, Sesión 2) y salta a la entrada correspondiente.

```
 objeto Gerente (heap)            MethodTable de Gerente
 ┌──────────────────┐             ┌──────────────────────────────┐
 │ header           │             │ VTable:                      │
 │ MethodTable* ────┼───────────▶ │  [0] ToString  → Empleado.ToString   │
 │ Nombre, Sueldo…  │             │  [1] Equals    → Object.Equals       │
 │ Bono             │             │  [2] GetHashCode → Object.GetHashCode│
 └──────────────────┘             │  [3] CalcularSueldo → Gerente.CalcularSueldo ← override
                                  └──────────────────────────────┘
```

Esto tiene un pequeño costo (una indirección y, sobre todo, impide *inlining*). Por eso `sealed` ayuda al JIT a **desvirtualizar** llamadas. Lo detallamos en la Sesión 31.

### 7.3 `virtual`/`override` vs `new` (method hiding) — la trampa clásica

```csharp
class Animal
{
    public virtual string Sonido() => "...";
    public string Nombre() => "Animal";          // NO virtual
}

class Perro : Animal
{
    public override string Sonido() => "Guau";   // SOBRESCRIBE (polimórfico)
    public new string Nombre() => "Perro";       // OCULTA (no polimórfico)
}

Perro p = new Perro();
Animal a = p;                                    // mismo objeto, referencia de tipo base

Console.WriteLine(p.Sonido());   // Guau
Console.WriteLine(a.Sonido());   // Guau    ← override: decide el tipo REAL del objeto
Console.WriteLine(p.Nombre());   // Perro
Console.WriteLine(a.Nombre());   // Animal  ← new: decide el tipo de la VARIABLE (estático)
```

| | `override` | `new` |
|---|---|---|
| Requiere que la base sea | `virtual`, `abstract` u `override` | Cualquiera |
| Qué se llama vía referencia base | La versión **derivada** | La versión **base** |
| Resolución | Runtime (VTable) | Compilación (tipo de la variable) |
| Uso legítimo | Polimorfismo normal | Casi nunca: compatibilidad cuando la base añadió un miembro con tu nombre |

> ⚠️ Si declaras en la derivada un método con la misma firma que uno **no virtual** de la base y **olvidas** `new`, compila con **warning CS0108** y se comporta como `new`. Trata ese warning como error.

> ❓ **Entrevista**: *"¿Diferencia entre `override` y `new`?"* → `override` extiende la VTable: por cualquier referencia se ejecuta la versión del tipo real (polimorfismo). `new` crea un miembro distinto que solo *oculta* al de la base: qué versión se ejecuta depende del tipo **estático** de la variable. `new` rompe el principio de sustitución de Liskov y suele indicar un problema de diseño.

### 7.4 Casting en jerarquías

```csharp
Empleado e = new Gerente("Luis", 2_000_000m, 500_000m);   // UPCAST: implícito y siempre seguro

Gerente g1 = (Gerente)e;                     // DOWNCAST explícito: lanza InvalidCastException si no lo es
Gerente? g2 = e as Gerente;                   // null si no lo es (no lanza)
if (e is Gerente g3) Console.WriteLine(g3.Bono);   // ✅ lo idiomático: type pattern (Sesión 16)
```

> ⚠️ Si tu código está lleno de `if (x is A) ... else if (x is B) ...` para decidir comportamiento, probablemente te falta **polimorfismo**: mueve ese comportamiento a un método virtual.

---

## 8. Clases abstractas

Una clase `abstract` **no se puede instanciar**; sirve como base común que **puede** tener implementación y **obliga** a las derivadas a implementar sus miembros `abstract`.

```csharp
public abstract class Figura
{
    public string Nombre { get; }
    protected Figura(string nombre) => Nombre = nombre;      // ctor protected: solo para derivadas

    public abstract double Area();                           // SIN cuerpo: la derivada DEBE implementarlo
    public virtual string Describir() => $"{Nombre} de área {Area():F2}";   // con cuerpo, opcional sobrescribir

    // Template Method: el algoritmo fijo en la base, los pasos variables en las derivadas
    public void Imprimir()
    {
        Console.WriteLine(new string('-', 20));
        Console.WriteLine(Describir());
    }
}

public class Rectangulo(double ancho, double alto) : Figura("Rectángulo")
{
    public override double Area() => ancho * alto;
}

public class Circulo(double radio) : Figura("Círculo")
{
    public override double Area() => Math.PI * radio * radio;
    public override string Describir() => base.Describir() + $" (r={radio})";
}

// var f = new Figura("x");     // ❌ CS0144: no se puede crear instancia de clase abstracta
Figura[] figuras = { new Rectangulo(2, 3), new Circulo(1) };
foreach (var f in figuras) f.Imprimir();
```

---

## 9. Interfaces

Una **interfaz** es un **contrato**: declara *qué* miembros debe tener un tipo, sin decir cómo (clásicamente). Una clase o struct puede implementar **muchas**.

```csharp
public interface IIdentificable { Guid Id { get; } }

public interface IAuditable
{
    DateTime CreadoEn { get; }
    string Resumen() => $"Creado el {CreadoEn:yyyy-MM-dd}";   // Default Interface Method (C# 8)
}

public class Factura : IIdentificable, IAuditable, IComparable<Factura>
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime CreadoEn { get; } = DateTime.UtcNow;
    public decimal Monto { get; init; }

    public int CompareTo(Factura? otra) => Monto.CompareTo(otra?.Monto ?? 0);
}

var f = new Factura { Monto = 100 };
// f.Resumen();                          // ❌ el default method NO es visible desde la clase…
Console.WriteLine(((IAuditable)f).Resumen());   // ✅ …solo a través de la interfaz
```

### 9.1 Implementación explícita

Útil cuando dos interfaces tienen miembros con el mismo nombre, o para "esconder" un miembro de la API pública de la clase.

```csharp
public interface IArchivoLog   { void Escribir(string s); }
public interface IConsolaLog   { void Escribir(string s); }

public class Logger : IArchivoLog, IConsolaLog
{
    void IArchivoLog.Escribir(string s) => Console.WriteLine($"[archivo] {s}");  // explícita: sin modificador
    void IConsolaLog.Escribir(string s) => Console.WriteLine($"[consola] {s}");
}

var log = new Logger();
// log.Escribir("x");                   // ❌ no existe en la API pública de Logger
((IArchivoLog)log).Escribir("hola");    // [archivo] hola
IConsolaLog c = log; c.Escribir("hola"); // [consola] hola
```

### 9.2 Miembros estáticos abstractos (C# 11)

Las interfaces pueden declarar miembros `static abstract`, lo que habilita **generic math** (`INumber<T>`) y factories genéricas. Lo usamos en la Sesión 8.

```csharp
public interface ICreable<TSelf> where TSelf : ICreable<TSelf>
{
    static abstract TSelf Crear();
}
```

---

## 10. Clase abstracta vs interfaz (la comparación que siempre preguntan)

| Aspecto | Clase abstracta | Interfaz |
|---|---|---|
| Herencia múltiple | ❌ Una sola base | ✅ Muchas |
| Estado (campos de instancia) | ✅ Sí | ❌ No (solo estáticos) |
| Constructores | ✅ Sí | ❌ No |
| Implementación | ✅ Sí | Desde C# 8: default methods (limitado, sin estado) |
| Modificadores de acceso | Cualquiera | `public` por defecto (C# 8 permite otros) |
| Structs pueden usarla | ❌ No | ✅ Sí (⚠️ boxing si se usa vía la interfaz) |
| Relación que modela | **"es un"** (identidad, familia) | **"puede hacer"** (capacidad, rol) |
| Evolución (añadir miembros) | Fácil: añades un método virtual con cuerpo | Rompía implementadores → mitigado con default methods |
| Ejemplos BCL | `Stream`, `DbContext`, `ControllerBase` | `IEnumerable<T>`, `IDisposable`, `IComparable<T>` |

**Heurística de decisión**:
- ¿Tipos **no relacionados** comparten una **capacidad**? (`Factura` y `Usuario` son `IAuditable`) → **interfaz**.
- ¿Una **familia** de tipos comparte **estado y código** base, con variaciones? → **clase abstracta**.
- ¿Dudas? Empieza con **interfaz** (más flexible, ideal para DI y testing). Puedes combinar: interfaz como contrato + clase abstracta base opcional que la implementa (patrón muy común en el BCL).

> ❓ **Entrevista**: *"Con los default interface methods, ¿ya no hay diferencia con una clase abstracta?"* → Sigue habiendo diferencias clave: la interfaz no puede tener **estado de instancia** ni **constructores**, y los default methods solo son accesibles vía la interfaz. Su propósito principal es **evolucionar** interfaces publicadas sin romper implementaciones existentes, no reemplazar a las clases abstractas.

---

## 11. Miembros y clases `static`

```csharp
public static class Conversor                 // static class: no instanciable, no heredable, solo miembros static
{
    public const double KmPorMilla = 1.609344;
    public static double MillasAKm(double m) => m * KmPorMilla;
}

Console.WriteLine(Conversor.MillasAKm(10));   // 16.09344
```

| | `static` | Instancia |
|---|---|---|
| Una copia por | Tipo (una por proceso; en genéricos, una por cada tipo cerrado) | Objeto |
| Accede a `this` | No | Sí |
| Uso | Utilidades sin estado, constantes, factories, extension methods | Todo lo que depende del estado del objeto |

> ⚠️ **Estado estático mutable = estado global**: es compartido por todos los hilos y requests (en ASP.NET Core, entre **todos los usuarios**), dificulta testear y causa race conditions (Sesión 29). Prefiere servicios con ciclo de vida Singleton inyectados por DI (Sesión 24).

---

## 12. `System.Object`: los métodos que todo tipo hereda

| Método | Por defecto (class) | Cuándo sobrescribir |
|---|---|---|
| `ToString()` | Nombre completo del tipo | Casi siempre, para logging/depuración |
| `Equals(object?)` | Igualdad por **referencia** | Cuando el tipo tiene semántica de valor |
| `GetHashCode()` | Basado en la identidad del objeto | **Siempre que sobrescribas `Equals`** |
| `GetType()` | Tipo real en runtime (no virtual) | Nunca |
| `MemberwiseClone()` | Copia superficial (protected) | Para implementar clonación |
| `Finalize()` | — | Casi nunca (Sesión 14) |

### 12.1 Igualdad por valor bien hecha

```csharp
public sealed class Dinero : IEquatable<Dinero>
{
    public decimal Monto { get; }
    public string Moneda { get; }
    public Dinero(decimal monto, string moneda) => (Monto, Moneda) = (monto, moneda);

    public bool Equals(Dinero? otro) =>
        otro is not null && Monto == otro.Monto && Moneda == otro.Moneda;

    public override bool Equals(object? obj) => Equals(obj as Dinero);
    public override int GetHashCode() => HashCode.Combine(Monto, Moneda);   // mismos campos que Equals

    public static bool operator ==(Dinero? a, Dinero? b) => a is null ? b is null : a.Equals(b);
    public static bool operator !=(Dinero? a, Dinero? b) => !(a == b);

    public override string ToString() => $"{Monto:N0} {Moneda}";
}

var x = new Dinero(100, "CLP");
var y = new Dinero(100, "CLP");
Console.WriteLine(x == y);                          // True (por valor)
Console.WriteLine(ReferenceEquals(x, y));           // False (distintos objetos)
var set = new HashSet<Dinero> { x, y };
Console.WriteLine(set.Count);                       // 1 → gracias a GetHashCode coherente
```

> ⚠️ **Contrato Equals/GetHashCode**: si `a.Equals(b)` es `true`, entonces `a.GetHashCode() == b.GetHashCode()` **debe** ser `true`. Si lo rompes, `Dictionary` y `HashSet` (Sesión 7) no encontrarán tus objetos. Además, el hash debe basarse en datos **inmutables**: si un objeto cambia su hash estando dentro de un `HashSet`, queda "perdido".

> 💡 Todo este código repetitivo es exactamente lo que los **`record`** generan automáticamente (Sesión 17): `public record Dinero(decimal Monto, string Moneda);`.

---

## 13. Composición sobre herencia

La herencia es el acoplamiento **más fuerte** que existe: la derivada depende de los detalles internos de la base (el problema de la *fragile base class*). La **composición** ("tiene un", *has-a*) suele ser más flexible.

```csharp
// ❌ Herencia forzada: ¿un Pato de goma "es un" Pato que vuela?
// class PatoDeGoma : Pato { override Volar() => throw new NotSupportedException(); } // viola Liskov

// ✅ Composición: el comportamiento se inyecta como una pieza intercambiable
public interface IComportamientoVuelo { string Volar(); }
public class VuelaConAlas : IComportamientoVuelo { public string Volar() => "Volando 🪽"; }
public class NoVuela      : IComportamientoVuelo { public string Volar() => "No puedo volar"; }

public class Pato(string nombre, IComportamientoVuelo vuelo)
{
    public string Presentarse() => $"{nombre}: {vuelo.Volar()}";
}

var real  = new Pato("Donald", new VuelaConAlas());
var goma  = new Pato("Patito", new NoVuela());
Console.WriteLine(real.Presentarse());
Console.WriteLine(goma.Presentarse());
```

| | Herencia | Composición |
|---|---|---|
| Relación | "es un" | "tiene un" / "usa un" |
| Acoplamiento | Fuerte (en compilación) | Débil (vía interfaces) |
| Cambiar comportamiento en runtime | No | Sí |
| Reutiliza | Implementación | Comportamiento vía delegación |
| Riesgo | Jerarquías profundas y frágiles | Más clases pequeñas |

**Usa herencia cuando** la relación "es un" sea real y estable, y la derivada pueda sustituir a la base en *todos* los contextos (Liskov). **En los demás casos, compón.**

---

## 14. SOLID en una tabla (lo profundizamos en la Sesión 37)

| Principio | Idea | Conexión con esta sesión |
|---|---|---|
| **S** — Single Responsibility | Una clase, una razón para cambiar | Clases pequeñas y cohesivas |
| **O** — Open/Closed | Abierta a extensión, cerrada a modificación | Polimorfismo: nueva `Figura` sin tocar `Imprimir` |
| **L** — Liskov Substitution | Una derivada debe poder sustituir a su base | Evita `new` y `NotSupportedException` en overrides |
| **I** — Interface Segregation | Interfaces pequeñas y específicas | `IAuditable`, `IIdentificable` separados |
| **D** — Dependency Inversion | Depende de abstracciones | `ServicioPedidos` depende de `INotificador` |

---

## Resumen mental de la sesión

```
Clase = molde (estado + comportamiento) · Objeto = instancia en el heap
Constructores: default (desaparece si defines uno), this(...), base(...), static (1 vez), required/init
⚠️ No llamar virtual desde un constructor

Acceso: public · internal(default tipos) · protected · private(default miembros)
        protected internal (∪) · private protected (∩) · file

4 PILARES
  Encapsulación → proteger invariantes (private + métodos que validan)
  Abstracción   → exponer QUÉ, ocultar CÓMO (interfaces, abstractas)
  Herencia      → "es un", simple, : base(...), sealed
  Polimorfismo  → virtual/override → dispatch por VTable según tipo REAL
                  new → oculta, decide el tipo de la VARIABLE (evitar)

Abstracta: estado + ctor + código, una sola base, "es un"
Interfaz:  contrato, múltiple, "puede hacer", default methods sin estado
Equals ⇒ GetHashCode (mismos campos, inmutables) · record lo genera solo
Composición > herencia (salvo "es un" real que cumpla Liskov)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ Explica los cuatro pilares de la POO con un ejemplo de C# para cada uno.
2. ❓ ¿Encapsulación vs abstracción? ¿No son lo mismo?
3. ❓ ¿Qué pasa con el constructor por defecto si declaras uno con parámetros? ¿Qué es un constructor estático y cuándo se ejecuta?
4. ❓ ¿Por qué no debes llamar a un método virtual desde un constructor?
5. ❓ ¿Diferencia entre `protected internal` y `private protected`? ¿Accesos por defecto?
6. ❓ ¿`override` vs `new`? Da la salida de un ejemplo con referencia de tipo base.
7. ❓ ¿Cómo funciona el dynamic dispatch por dentro? ¿Por qué `sealed` puede mejorar el rendimiento?
8. ❓ ¿Clase abstracta vs interfaz? ¿Cambió algo con los default interface methods?
9. ❓ ¿Por qué C# no permite herencia múltiple de clases? ¿Cómo lo compensa?
10. ❓ ¿Para qué sirve la implementación explícita de interfaces?
11. ❓ ¿Cuál es el contrato entre `Equals` y `GetHashCode`? ¿Qué se rompe si no lo cumples?
12. ❓ ¿Por qué "composición sobre herencia"? Da un ejemplo donde la herencia viola Liskov.

## Ejercicio práctico
1. Crea `dotnet new console -o PooLab`.
2. **Encapsulación**: implementa `CuentaBancaria` (§1) y añade `Transferir(CuentaBancaria destino, decimal monto)` que sea atómica (o se hacen ambas operaciones o ninguna). Asegúrate de que el saldo **nunca** pueda quedar negativo desde fuera.
3. **Jerarquía + polimorfismo**: crea `abstract class Empleado` con `abstract decimal CalcularSueldo()` y tres derivadas (`Gerente`, `Vendedor`, `Practicante`). Recorre una `List<Empleado>` e imprime el total de la planilla **sin** usar `is` ni `switch` sobre el tipo.
4. **override vs new**: reproduce el ejemplo `Animal`/`Perro` del §7.3, predice la salida antes de ejecutar y anota el warning CS0108 que aparece si quitas `new`.
5. **Interfaces**: crea `IExportable { string Exportar(); }` con un default method `string ExportarConFecha()`. Impleméntala en `Factura` y en `Cliente` (tipos no relacionados). Llama al default method a través de la interfaz.
6. **Implementación explícita**: haz que una clase implemente `IArchivoLog` e `IConsolaLog` (§9.1) y demuestra que cada cast llama a una versión distinta.
7. **Igualdad**: implementa `Dinero` (§12.1). Luego **comenta** el `GetHashCode` y verifica que `HashSet<Dinero>` ahora acepta duplicados. Reescríbelo como `record` y compara.
8. **Composición**: modela `Pato` con `IComportamientoVuelo` y `IComportamientoGraznido`, y añade un método para **cambiar** el comportamiento de vuelo en runtime (ej. un pato que se lesiona el ala).
9. **Orden de inicialización**: crea `Base` y `Derivada` con inicializadores de campo que impriman (`private int _x = Log("campo Derivada");`) y constructores que impriman. Verifica el orden del §2.2.
10. (Opcional) Provoca el `NullReferenceException` del §2.2 llamando a un virtual desde el constructor de la base.

---

➡️ **Cuando termines**, marca la Sesión 5 en el [README](Readme.md) y pídeme la **Sesión 6 — Propiedades, indexadores e init-only**.
