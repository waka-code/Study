# Sesión 16 — Pattern Matching: preguntarle a los datos "¿qué forma tienes?"

> **Objetivo de la sesión**: dominar el pattern matching de C# de principio a fin — desde el `is` clásico hasta los *list patterns* de C# 11 — y entender *por qué* cambió la forma de escribir lógica condicional en C#. Al terminar deberías conocer cada tipo de patrón (type, constant, relational, logical, property, positional, var, discard, list), escribir *switch expressions* expresivas, saber cómo el compilador verifica exhaustividad y cuándo pattern matching es mejor (o peor) que el polimorfismo.

---

## 1. ¿Qué es pattern matching y por qué existe?

Un **patrón** es una *pregunta* que le haces a un valor: *"¿eres un `Circulo`?"*, *"¿eres mayor que 18?"*, *"¿tienes una propiedad `Pais` igual a `"CL"`?"*, *"¿eres una lista que empieza con 1?"*. Si la respuesta es sí, opcionalmente **extraes** partes del valor en variables.

Antes de C# 7, esto se hacía con casts manuales y `if` anidados:

```csharp
// C# 6 y anteriores: verboso y propenso a errores
if (forma is Circulo)
{
    var c = (Circulo)forma;           // segundo chequeo de tipo (cast)
    area = Math.PI * c.Radio * c.Radio;
}
else if (forma is Rectangulo)
{
    var r = (Rectangulo)forma;
    area = r.Ancho * r.Alto;
}
```

Con pattern matching moderno:

```csharp
double area = forma switch
{
    Circulo c            => Math.PI * c.Radio * c.Radio,
    Rectangulo { Ancho: var w, Alto: var h } => w * h,
    _                    => throw new ArgumentException("Forma desconocida")
};
```

La idea viene de los lenguajes **funcionales** (ML, F#, Haskell, Scala). C# la fue incorporando por capas:

| Versión | Qué agregó |
|---|---|
| **C# 7.0** (2017) | `is` con declaración (`x is int n`), `case` con tipos y `when`, patrones constante y `var` |
| **C# 8.0** (2019) | **switch expression**, property patterns, positional patterns, tuple patterns |
| **C# 9.0** (2020) | **relational** (`<`, `>=`), **logical** (`and`, `or`, `not`), type pattern simple, paréntesis |
| **C# 10** (2021) | Extended property patterns (`{ Direccion.Pais: "CL" }`) |
| **C# 11** (2022) | **List patterns** (`[1, 2, ..]`), slice pattern, `Span<char>` contra constantes string |

> ❓ **Entrevista**: *"¿Qué ventaja tiene pattern matching sobre casts manuales?"* → Evalúa el tipo **una sola vez**, declara la variable ya tipada y con alcance limitado, es más declarativo y el compilador puede verificar **exhaustividad** y **casos inalcanzables**. Además combina tipo + forma + valores en una sola expresión.

---

## 2. Dónde se pueden usar patrones

Tres lugares:

```csharp
// 1) Expresión 'is'  → devuelve bool
if (obj is string s && s.Length > 0) { }

// 2) Sentencia switch (clásica, con 'case')
switch (obj)
{
    case int n when n > 0: Console.WriteLine("positivo"); break;
    case null:             Console.WriteLine("null");     break;
    default:               Console.WriteLine("otro");     break;
}

// 3) Switch expression (C# 8) → produce un VALOR
string texto = obj switch
{
    int n when n > 0 => "positivo",
    null             => "null",
    _                => "otro"
};
```

| | `switch` statement | `switch` expression |
|---|---|---|
| Produce | Nada (ejecuta sentencias) | Un **valor** |
| Sintaxis | `case X: ... break;` | `X => valor,` |
| Default | `default:` | `_ =>` (discard) |
| No exhaustivo | Simplemente no entra | ⚠️ warning CS8509 + `SwitchExpressionException` en runtime |
| Ideal para | Efectos secundarios, varias líneas | Mapear/transformar valores |

---

## 3. Catálogo de patrones (uno por uno)

Usaremos este modelo para todos los ejemplos:

```csharp
public abstract record Forma;
public record Circulo(double Radio) : Forma;
public record Rectangulo(double Ancho, double Alto) : Forma;
public record Triangulo(double Base, double Altura) : Forma;

public record Direccion(string Ciudad, string Pais);
public record Cliente(string Nombre, int Edad, Direccion? Direccion, bool EsVip);
```

(Los `record` los vemos a fondo en la Sesión 17; aquí basta saber que generan constructor, propiedades y `Deconstruct`.)

### 3.1 Constant pattern
Compara con una constante (literal, `const`, enum, `null`):

```csharp
string Dia(int d) => d switch
{
    1 => "Lunes",
    2 => "Martes",
    _ => "Otro"
};

if (x is null) { }            // el constant pattern más usado (Sesión 15)
if (estado is Estado.Activo) { }
```

### 3.2 Type pattern y declaration pattern

```csharp
if (forma is Circulo) { }         // type pattern (solo pregunta)
if (forma is Circulo c) { }       // declaration pattern (pregunta + extrae)
// 'c' solo está "definitivamente asignada" dentro de la rama verdadera
```

> ⚠️ `x is T t` **nunca** es true si `x` es `null`. Esto lo hace un chequeo de null implícito — y es la razón de `is { } v` (ver 3.6).

### 3.3 Relational patterns (C# 9)

```csharp
string Categoria(int edad) => edad switch
{
    < 0            => throw new ArgumentOutOfRangeException(nameof(edad)),
    < 13           => "Niño",
    < 18           => "Adolescente",
    < 65           => "Adulto",
    _              => "Adulto mayor"
};
```

Los brazos se evalúan **en orden**, de arriba hacia abajo: el primero que coincide gana.

### 3.4 Logical patterns: `and`, `or`, `not` (C# 9)

```csharp
bool EsLetra(char c) => c is (>= 'a' and <= 'z') or (>= 'A' and <= 'Z');

bool EsDiaLaboral(DayOfWeek d) => d is not (DayOfWeek.Saturday or DayOfWeek.Sunday);

if (obj is not null) { }
if (obj is not string) { }
```

Precedencia: `not` > `and` > `or`. Usa paréntesis para claridad.

> ⚠️ `and`/`or` de patrones **no** son `&&`/`||`. Trabajan sobre **el mismo valor** que se está comparando: `x is > 0 and < 10`. No puedes escribir `x is > 0 and y < 10` (para eso, `&&` fuera del patrón o una guarda `when`).

### 3.5 Property pattern (C# 8) y extended property pattern (C# 10)

Inspecciona propiedades o campos, recursivamente:

```csharp
decimal Descuento(Cliente c) => c switch
{
    { EsVip: true, Edad: >= 65 }                    => 0.30m,
    { EsVip: true }                                 => 0.20m,
    { Direccion: { Pais: "CL" } }                   => 0.10m,  // forma C# 8
    { Direccion.Ciudad: "Santiago" }                => 0.05m,  // C# 10: extended
    _                                               => 0m
};
```

- Un property pattern implica **no-null**: `{ EsVip: true }` falla si `c` es null.
- Si `Direccion` es null, `{ Direccion.Pais: "CL" }` simplemente **no coincide** (no lanza NRE).

### 3.6 El patrón vacío `{ }` — "no es null"

```csharp
if (cliente.Direccion is { } dir)      // "si Direccion no es null, llámala dir"
    Console.WriteLine(dir.Ciudad);

// Equivale a:  if (cliente.Direccion is not null) { var dir = cliente.Direccion; ... }
```

Combinable con tipo: `obj is Cliente { Edad: > 18 } adulto`.

### 3.7 Positional pattern (deconstrucción)

Si el tipo tiene un método `Deconstruct` (los records posicionales y las tuplas lo tienen), puedes hacer match por **posición**:

```csharp
double Area(Forma f) => f switch
{
    Circulo(var r)               => Math.PI * r * r,
    Rectangulo(var w, var h) when w == h => w * w,   // cuadrado
    Rectangulo(var w, var h)     => w * h,
    Triangulo(var b, var a)      => b * a / 2,
    _                            => throw new NotSupportedException()
};

// Con tu propio Deconstruct en una clase normal:
public class Punto
{
    public int X { get; } public int Y { get; }
    public Punto(int x, int y) => (X, Y) = (x, y);
    public void Deconstruct(out int x, out int y) => (x, y) = (X, Y);
}

string Cuadrante(Punto p) => p switch
{
    (0, 0)           => "Origen",
    ( > 0, > 0)      => "I",
    ( < 0, > 0)      => "II",
    ( < 0, < 0)      => "III",
    ( > 0, < 0)      => "IV",
    _                => "Sobre un eje"
};
```

### 3.8 Tuple pattern — el "switch sobre varias variables"

Muy útil para máquinas de estado y tablas de decisión:

```csharp
enum Luz { Roja, Amarilla, Verde }
enum Accion { Avanzar, Esperar, Emergencia }

Luz Siguiente(Luz actual, Accion accion) => (actual, accion) switch
{
    (_, Accion.Emergencia)          => Luz.Roja,        // cualquier luz + emergencia
    (Luz.Roja, Accion.Avanzar)      => Luz.Verde,
    (Luz.Verde, Accion.Avanzar)     => Luz.Amarilla,
    (Luz.Amarilla, Accion.Avanzar)  => Luz.Roja,
    (var l, Accion.Esperar)         => l,               // se queda igual
    _ => throw new InvalidOperationException()
};

// Piedra-papel-tijera en 6 líneas
string Jugar(string a, string b) => (a, b) switch
{
    var (x, y) when x == y                                   => "Empate",
    ("piedra", "tijera") or ("tijera", "papel") or ("papel", "piedra") => "Gana A",
    _                                                        => "Gana B"
};
```

### 3.9 `var` pattern y discard `_`

```csharp
// var: siempre coincide (incluso null) y captura el valor
if (ObtenerNumero() is var n && n > 10) { }   // truco para "nombrar" un resultado en una expresión

// _ : siempre coincide, no captura. En switch expression = default
var tipo = obj switch { int => "int", string => "string", _ => "otro" };
```

> ⚠️ Diferencia sutil: `var x` **coincide con null**; `{ } x` **no**. En `switch`, un brazo `var x =>` actúa como default que captura.

### 3.10 List patterns (C# 11)

Match sobre arrays, `List<T>`, `Span<T>` — cualquier tipo "countable" (con `Length`/`Count`) e indexable:

```csharp
string Describir(int[] nums) => nums switch
{
    []                  => "Vacío",
    [var unico]         => $"Uno solo: {unico}",
    [1, 2, 3]           => "Exactamente 1,2,3",
    [0, ..]             => "Empieza con 0",
    [.., 99]            => "Termina en 99",
    [var primero, .., var ultimo] => $"De {primero} a {ultimo}",
};

// Slice pattern con captura: '..' puede capturar el "resto"
if (args is ["--verbose", .. var resto])
    Console.WriteLine($"Modo verbose con {resto.Length} args más");

// Combinado con otros patrones
bool EmpiezaConPositivos(int[] a) => a is [> 0, > 0, ..];

// Parser de comandos muy legible
string Ejecutar(string[] cmd) => cmd switch
{
    ["help"]                  => "Uso: ...",
    ["add", var item]         => $"Añadido {item}",
    ["remove", var id, "--force"] => $"Borrado forzado {id}",
    ["remove", var id]        => $"Borrado {id}",
    [var desconocido, ..]     => $"Comando '{desconocido}' no existe",
    []                        => "Sin comando"
};
```

- Solo **un** `..` por patrón de lista.
- Capturar con `.. var resto` requiere que el tipo soporte rangos (arrays, `string`, `Span<T>`); con `List<T>` puedes usar `..` pero no capturar el slice.

> ❓ **Entrevista**: *"¿Qué requisitos debe cumplir un tipo para usar list patterns?"* → Ser *countable* (propiedad `Length` o `Count`) e indexable (indexador `this[int]` o `this[Index]`). Para capturar un slice (`.. var x`), además debe soportar `this[Range]` o un método `Slice(int, int)`.

---

## 4. Guardas `when`

Cuando el patrón no basta, añades una condición arbitraria:

```csharp
string Clasificar(Pedido p) => p switch
{
    { Total: > 1000 } when p.Cliente.EsVip => "VIP grande",
    { Total: > 1000 }                      => "Grande",
    { Items.Count: 0 }                     => "Vacío",
    _ when DateTime.Now.Hour >= 22         => "Nocturno",
    _                                      => "Normal"
};

public record Pedido(decimal Total, Cliente Cliente, List<string> Items);
```

> ⚠️ Las guardas `when` **desactivan parte del análisis de exhaustividad**: el compilador no puede razonar sobre expresiones arbitrarias, así que un brazo con `when` no "cubre" su patrón. Necesitarás un caso sin guarda o `_` final.

---

## 5. Exhaustividad y orden: lo que el compilador verifica

El compilador analiza los patrones y te avisa de dos cosas:

```csharp
// 1) NO EXHAUSTIVO → warning CS8509
string Signo(int n) => n switch
{
    > 0 => "positivo",
    < 0 => "negativo",
    // falta el 0 → CS8509: "The switch expression does not handle all possible values (e.g. 0)"
};
// En runtime, Signo(0) lanza System.Runtime.CompilerServices.SwitchExpressionException

// 2) INALCANZABLE → error CS8510
string Mal(object o) => o switch
{
    object  => "objeto",
    string  => "string",   // ❌ CS8510: ya cubierto por el brazo anterior
};
```

**Regla de oro**: ordena de **más específico a más general**. El compilador te obligará con CS8510.

Con NRT activo (Sesión 15) existe además **CS8655**: *"does not handle some null inputs"* — si el valor de entrada es de tipo referencia nullable y ningún brazo cubre `null` (los type/property patterns **no** coinciden con null).

### 5.1 Exhaustividad con enums y jerarquías — el punto débil

```csharp
enum Color { Rojo, Verde, Azul }

string Hex(Color c) => c switch
{
    Color.Rojo  => "#F00",
    Color.Verde => "#0F0",
    Color.Azul  => "#00F",
    // ⚠️ igual da CS8524: "(Color)3 is not covered" — un enum puede valer (Color)42,
    //    porque los enums en C# son solo ints con nombre
};
```

Y C# **no tiene tipos cerrados** (*discriminated unions* / *sealed hierarchies* como Kotlin o F#): aunque `Forma` sea `abstract` con 3 subclases, alguien puede añadir una cuarta en otro assembly, así que siempre necesitas `_`.

```csharp
// Patrón común: default que falla ruidosamente
_ => throw new UnreachableException()   // .NET 7+: System.Diagnostics.UnreachableException
```

> 💡 Hay una propuesta activa de **discriminated unions** para C#; mientras tanto, librerías como `OneOf` simulan el patrón. Si en entrevista te preguntan por "sum types" en C#, esa es la respuesta.

---

## 6. ¿Cómo se compila? (el porqué del rendimiento)

El compilador **no** evalúa los brazos uno por uno de forma ingenua: construye un **árbol de decisión** (*decision DAG*) que reutiliza chequeos comunes. Por ejemplo:

```
 forma switch                         Árbol generado (simplificado)
 {                                    ─────────────────────────────
   Circulo { Radio: 0 } => A,         ¿forma is Circulo?
   Circulo c            => B,            ├─ sí → ¿Radio == 0? ─ sí → A
   Rectangulo r         => C,            │                    └ no → B
   _                    => D             └─ no → ¿is Rectangulo? ─ sí → C
 }                                                              └ no → D
```

- El test de tipo `Circulo` se hace **una vez**, no dos.
- Constantes enteras densas se compilan a una instrucción IL `switch` (tabla de saltos, O(1)).
- Strings constantes: el compilador puede generar comparación por longitud + carácter o hashing.

Conclusión: una switch expression bien escrita es **tan rápida o más** que la cadena de `if/else` equivalente.

---

## 7. Pattern matching vs polimorfismo (la pregunta de diseño)

Esta es una pregunta de entrevista *senior* clásica. Los dos resuelven "hacer algo distinto según el tipo":

```csharp
// Opción A — POLIMORFISMO (Sesión 5): el comportamiento vive DENTRO de cada tipo
abstract class FormaOO { public abstract double Area(); }
class CirculoOO(double r) : FormaOO { public override double Area() => Math.PI * r * r; }

// Opción B — PATTERN MATCHING: el comportamiento vive FUERA, en una función
static double Area(Forma f) => f switch { Circulo(var r) => Math.PI * r * r, /*...*/ _ => 0 };
```

Esto es el **Expression Problem**:

| | Polimorfismo (OO) | Pattern matching (funcional) |
|---|---|---|
| Añadir un **nuevo tipo** | ✅ Fácil: una clase nueva | ❌ Hay que tocar cada `switch` |
| Añadir una **nueva operación** | ❌ Hay que tocar cada clase | ✅ Fácil: una función nueva |
| Cumple Open/Closed para... | Tipos | Operaciones |
| Ideal cuando | Tipos cambian, operaciones estables (plugins, estrategias) | Tipos estables, muchas operaciones (AST, eventos de dominio, DTOs, mensajes) |

> ❓ **Entrevista**: *"¿Pattern matching rompe el principio Open/Closed?"* → Depende del eje de cambio. Si el conjunto de tipos es **cerrado y estable** (ej. los nodos de un AST, los estados de un pedido, respuestas de una API), pattern matching es excelente y hace fácil añadir operaciones. Si el conjunto de tipos **crece** (plugins), prefiere polimorfismo. Además, pattern matching funciona con tipos que **no controlas** (no puedes añadirles métodos virtuales).

### 7.1 Ejemplo realista: evaluador de expresiones (AST)

```csharp
using System.Diagnostics;   // UnreachableException (.NET 7+)

// Uso (en Program.cs los top-level statements van ANTES de las declaraciones de tipos)
var expr = new Suma(new Mult(new Num(1), new Num(5)), new Num(0));
Console.WriteLine(Algebra.Mostrar(expr));                       // (1 * 5 + 0)
Console.WriteLine(Algebra.Mostrar(Algebra.Simplificar(expr)));  // 5
Console.WriteLine(Algebra.Eval(expr));                          // 5

public abstract record Expr;
public record Num(double Valor) : Expr;
public record Suma(Expr Izq, Expr Der) : Expr;
public record Mult(Expr Izq, Expr Der) : Expr;
public record Neg(Expr Operando) : Expr;

public static class Algebra
{
    public static double Eval(Expr e) => e switch
    {
        Num(var v)          => v,
        Suma(var a, var b)  => Eval(a) + Eval(b),
        Mult(var a, var b)  => Eval(a) * Eval(b),
        Neg(var x)          => -Eval(x),
        _ => throw new UnreachableException()   // Expr no es "cerrado": hace falta el default
    };

    // Una operación NUEVA sin tocar los tipos: simplificación algebraica
    public static Expr Simplificar(Expr e) => e switch
    {
        Suma(Num(0), var x)                => Simplificar(x),   // 0 + x = x
        Suma(var x, Num(0))                => Simplificar(x),   // x + 0 = x
        Mult(Num(1), var x)                => Simplificar(x),   // 1 * x = x
        Mult(var x, Num(1))                => Simplificar(x),   // x * 1 = x
        Mult(Num(0), _) or Mult(_, Num(0)) => new Num(0),       // 0 * x = 0  ('or' sin capturas)
        Neg(Neg(var x))                    => Simplificar(x),   // --x = x
        Suma(var a, var b) => new Suma(Simplificar(a), Simplificar(b)),
        Mult(var a, var b) => new Mult(Simplificar(a), Simplificar(b)),
        _ => e
    };

    public static string Mostrar(Expr e) => e switch
    {
        Num(var v)         => v.ToString(),
        Suma(var a, var b) => $"({Mostrar(a)} + {Mostrar(b)})",
        Mult(var a, var b) => $"{Mostrar(a)} * {Mostrar(b)}",
        Neg(var x)         => $"-{Mostrar(x)}",
        _ => "?"
    };
}
```

Fíjate en que `Num(0)` es un **patrón anidado**: positional pattern (`Num(...)`) que contiene un constant pattern (`0`). Los patrones se componen recursivamente, y eso es lo que los hace tan expresivos para árboles.

> ⚠️ **No se pueden declarar variables dentro de `or` ni de `not`** (error CS8780). Sería tentador escribir `Suma(Num(0), var x) or Suma(var x, Num(0)) => ...`, pero no compila: el compilador no permite que la misma variable venga de dos ramas alternativas. Separa los brazos, como arriba. `or` **sin** capturas (`Mult(Num(0), _) or Mult(_, Num(0))`) sí es válido.

> ⚠️ Con `not`: `if (x is not string s) return; Console.WriteLine(s.Length);` **sí compila** — `s` queda asignada *después* del `if`, porque si llegaste ahí es que `x` sí era string. Es un idiom muy usado para "guard clauses".

---

## 8. Patrones con `Span<char>` y strings (C# 11)

```csharp
ReadOnlySpan<char> verbo = "GET /api".AsSpan(0, 3);
var metodo = verbo switch
{
    "GET"  => HttpMethod.Get,     // C# 11: Span<char> contra constante string, sin allocations
    "POST" => HttpMethod.Post,
    _      => throw new NotSupportedException()
};
```

Útil en parsers de alto rendimiento (Sesión 19).

---

## 9. Buenas prácticas y errores comunes

| ✅ Haz | ❌ Evita |
|---|---|
| Ordenar de específico a general | Brazos con `when` complejos que esconden lógica de negocio |
| `_ => throw new UnreachableException()` cuando "no debería pasar" | `_ => null` o `_ => default` que ocultan bugs |
| `is null` / `is not null` / `is { } x` | `== null` en tipos con `operator ==` sobrecargado |
| Tuple patterns para tablas de decisión | Switch gigantes que deberían ser polimorfismo |
| Switch expression para *mapear* | Switch expression con efectos secundarios (`=> Guardar()`) |
| Extended property patterns (`A.B.C: x`) | Anidar `{ A: { B: { C: x } } }` innecesariamente |

> ⚠️ Los property patterns invocan **getters**. Si un getter es costoso o tiene efectos secundarios (lazy loading de EF Core → consulta a BD), el pattern matching los ejecutará. El compilador puede reordenar/evitar evaluaciones y asume que los getters son puros.

---

## Resumen mental de la sesión

```
Patrón = pregunta sobre la FORMA de un valor (+ extracción opcional)
Dónde:  x is P   ·   switch { case P: }   ·   x switch { P => valor }

Constant    1, "a", null, Enum.X
Type/Decl   Circulo  /  Circulo c
Relational  < 0, >= 18                     (C# 9)
Logical     and, or, not                   (C# 9)  — sin capturas en or/not
Property    { Edad: > 18, Direccion.Pais: "CL" }   (C# 8 / 10)
Vacío       { } x   → "no es null"
Positional  Rectangulo(var w, var h)   (requiere Deconstruct)
Tuple       (a, b) switch { (X, Y) => ... }
var / _     var x (incluye null) · _ (descarta, default)
List        [], [1, ..], [var h, .. var resto]  (C# 11)
Guarda      P when cond

Compilador: CS8509 no exhaustivo (→ SwitchExpressionException), CS8510 inalcanzable
Se compila a un ÁRBOL DE DECISIÓN (tests compartidos, jump tables)
Diseño: tipos estables + muchas operaciones → pattern matching
        tipos crecen + operaciones estables → polimorfismo  (Expression Problem)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Diferencia entre switch statement y switch expression? ¿Qué pasa si una switch expression no cubre un valor?
2. ❓ ¿Por qué `x is string s` es false cuando `x` es null? ¿Qué diferencia hay entre `var x` y `{ } x`?
3. ❓ ¿Qué es un property pattern y qué agregó C# 10 (extended property patterns)?
4. ❓ ¿Qué requisito tiene un tipo para usar positional patterns?
5. ❓ ¿Cómo implementarías una máquina de estados con tuple patterns?
6. ❓ ¿Qué requisitos tiene un tipo para soportar list patterns? ¿Y para capturar el slice?
7. ❓ ¿Por qué un `switch` sobre un enum con todos sus valores sigue dando warning de no exhaustivo?
8. ❓ ¿Puedes declarar variables dentro de un patrón `or`? ¿Por qué?
9. ❓ ¿Cómo compila el compilador un switch expression? ¿Es más lento que `if/else`?
10. ❓ Explica el Expression Problem: ¿cuándo prefieres pattern matching y cuándo polimorfismo?
11. ❓ ¿Qué efecto tienen las guardas `when` en el análisis de exhaustividad?

## Ejercicio práctico
1. Crea `dotnet new console -o PatternsDemo`.
2. Define la jerarquía `Forma` (Circulo, Rectangulo, Triangulo) como records y escribe `Area` y `Perimetro` con switch expressions usando **positional patterns**. Añade un brazo que detecte cuadrados con `when`.
3. Escribe `string Categoria(Cliente c)` usando **property patterns** anidados + extended property patterns + relational patterns (edad, país, VIP).
4. Implementa un mini-CLI que lea `args` y los procese con **list patterns** (`["add", var x]`, `["list"]`, `["remove", var id, "--force"]`, `[]`, `[var cmd, ..]`).
5. Implementa la máquina de estados de un pedido (`Pendiente → Pagado → Enviado → Entregado`, más `Cancelado`) con un **tuple pattern** `(estado, evento) switch`.
6. Provoca a propósito CS8509 y CS8510 y lee los mensajes del compilador. Luego llama a la función no exhaustiva con el valor faltante y observa la `SwitchExpressionException`.
7. (Opcional avanzado) Extiende el evaluador de `Expr` (§7.1) con `Div` y `Var(string Nombre)` y una función `Derivar(Expr e, string variable)`. Observa que no tocas ninguna clase: solo agregas funciones.

---

➡️ **Cuando termines**, marca la Sesión 16 en el [README](Readme.md) y pídeme la **Sesión 17 — Records, init e inmutabilidad**.
