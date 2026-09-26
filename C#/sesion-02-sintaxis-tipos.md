# Sesión 2 — Sintaxis básica y tipos: variables, value vs reference y stack/heap

> **Objetivo de la sesión**: dominar la sintaxis mínima de C# (variables, constantes, literales, conversiones) y, sobre todo, entender **la distinción más importante del lenguaje**: *value types* vs *reference types*. Al terminar deberías poder explicar qué pasa en memoria cuando asignas una variable, por qué un `struct` se copia y una `class` no, qué es el boxing, y desmentir el mito de que "los value types siempre viven en el stack".

---

## 1. Sintaxis mínima: las reglas del juego

C# hereda la sintaxis de la familia C (C, C++, Java). Si has visto alguno, te resultará familiar:

| Regla | Ejemplo |
|---|---|
| Las sentencias terminan en `;` | `int x = 5;` |
| Los bloques se delimitan con `{ }` | `if (x > 0) { ... }` |
| **Case-sensitive** | `nombre` y `Nombre` son variables distintas |
| Comentarios de línea | `// esto es un comentario` |
| Comentarios de bloque | `/* varias líneas */` |
| Comentarios de documentación XML | `/// <summary>Describe el método</summary>` |

### 1.1 Convenciones de nombres (las que usa Microsoft y te exigirán en code review)

| Elemento | Convención | Ejemplo |
|---|---|---|
| Clases, structs, records, enums | `PascalCase` | `CustomerOrder` |
| Métodos y propiedades | `PascalCase` | `CalculateTotal()` |
| Interfaces | `I` + `PascalCase` | `IRepository` |
| Variables locales y parámetros | `camelCase` | `orderCount` |
| Campos privados | `_camelCase` | `_logger` |
| Constantes | `PascalCase` | `MaxRetries` |

> ⚠️ En C# las constantes **no** van en `MAYUSCULAS_CON_GUIONES` como en Java o C. Es `PascalCase`. Escribir `MAX_RETRIES` delata que vienes de otro lenguaje.

---

## 2. Variables: declarar, inicializar, inferir

Una **variable** es un nombre asociado a una ubicación de memoria que guarda un valor de un **tipo** concreto.

```csharp
int edad = 30;                 // tipo explícito
string nombre = "Waddini";     // string es un reference type (lo veremos en §5)
double precio = 19.99;

var ciudad = "Santiago";       // INFERENCIA: el compilador deduce que es string
var total = 10 * 2.5;          // deduce double

// ciudad = 42;                // ❌ error de compilación: ciudad ES string para siempre
```

### 2.1 `var` NO es tipado dinámico

`var` es **inferencia en tiempo de compilación**: el tipo queda fijo y el IL generado es idéntico a haber escrito el tipo explícito. No tiene nada que ver con el `var` de JavaScript.

| Palabra | Cuándo se resuelve el tipo | ¿Puede cambiar de tipo? |
|---|---|---|
| `var` | Compilación (estático) | No |
| `dynamic` | Ejecución (DLR) | Sí, se chequea en runtime |
| `object` | Compilación (tipo base de todo) | Guarda cualquier cosa, pero necesitas *cast* para usarla |

```csharp
dynamic d = "hola";
d = 42;                        // ✅ compila: el chequeo se hace en runtime
// d.MetodoQueNoExiste();      // compila, pero explota en RUNTIME (RuntimeBinderException)

object o = "hola";
// o.Length;                   // ❌ no compila: object no tiene Length
int largo = ((string)o).Length; // necesitas cast
```

> ❓ **Entrevista**: *"¿Cuál es la diferencia entre `var` y `dynamic`?"* → `var` es inferencia estática: el compilador fija el tipo y hay type-safety completa. `dynamic` desactiva el chequeo en compilación y lo difiere al runtime (Dynamic Language Runtime); los errores aparecen al ejecutar.

**Cuándo usar `var`** (guía práctica): cuando el tipo es obvio por el lado derecho (`var lista = new List<int>();`) o cuando es muy largo/anónimo (LINQ, Sesión 9). Evítalo cuando oscurece la intención (`var x = Calcular();` → ¿qué devuelve?).

### 2.2 Constantes: `const` vs `readonly`

```csharp
public class Config
{
    public const int MaxUsuarios = 100;           // valor fijado en COMPILACIÓN
    public readonly DateTime Creado;              // valor fijado en RUNTIME (constructor)
    public static readonly Guid InstanciaId = Guid.NewGuid(); // runtime, una vez por tipo

    public Config()
    {
        Creado = DateTime.UtcNow;                 // solo se puede asignar aquí o en la declaración
    }
}
```

| | `const` | `readonly` |
|---|---|---|
| Momento de evaluación | Compilación | Ejecución |
| Tipos permitidos | Primitivos, `string`, enums, `null` | Cualquiera |
| Implícitamente `static` | Sí | No (puedes añadir `static`) |
| Dónde se asigna | En la declaración | Declaración o constructor |
| Se "incrusta" en quien lo usa | **Sí** | No |

> ⚠️ **Trampa de versionado**: un `const` público se **copia literalmente** en el IL de los assemblies que lo consumen. Si la librería A cambia `const int Version = 2` a `3` y la app B no se recompila, B **sigue viendo 2**. Por eso para valores públicos que pueden cambiar, prefiere `static readonly`.

---

## 3. Tipos primitivos (built-in)

Cada palabra clave de C# es un **alias** de un tipo del CTS (Sesión 1): `int` *es* `System.Int32`.

### 3.1 Enteros

| Alias C# | Tipo .NET | Tamaño | Rango aprox. |
|---|---|---|---|
| `byte` | `System.Byte` | 8 bits | 0 a 255 |
| `sbyte` | `System.SByte` | 8 bits | -128 a 127 |
| `short` | `System.Int16` | 16 bits | ±32 mil |
| `ushort` | `System.UInt16` | 16 bits | 0 a 65 mil |
| `int` | `System.Int32` | 32 bits | ±2.1 mil millones |
| `uint` | `System.UInt32` | 32 bits | 0 a 4.2 mil millones |
| `long` | `System.Int64` | 64 bits | ±9.2 × 10¹⁸ |
| `ulong` | `System.UInt64` | 64 bits | 0 a 1.8 × 10¹⁹ |
| `nint` / `nuint` | `IntPtr` / `UIntPtr` | tamaño del puntero (32/64) | depende de la plataforma |
| — | `System.Int128` | 128 bits | .NET 7+ |

### 3.2 Punto flotante y decimal

| Alias | Tamaño | Precisión | Base | Uso típico |
|---|---|---|---|---|
| `float` | 32 bits | ~6–9 dígitos | binaria (IEEE 754) | gráficos, juegos |
| `double` | 64 bits | ~15–17 dígitos | binaria (IEEE 754) | ciencia, cálculos generales |
| `decimal` | 128 bits | 28–29 dígitos | **decimal** (base 10) | **dinero**, finanzas |

```csharp
double a = 0.1 + 0.2;
Console.WriteLine(a == 0.3);          // False  😱 → 0.30000000000000004
Console.WriteLine(a);                  // 0.30000000000000004

decimal b = 0.1m + 0.2m;
Console.WriteLine(b == 0.3m);         // True   ✅ decimal representa 0.1 exacto
```

> ❓ **Entrevista**: *"¿Por qué no usar `double` para dinero?"* → `double` es binario: números como 0.1 no tienen representación exacta en base 2 y se acumulan errores de redondeo. `decimal` usa base 10, representa exactamente las fracciones decimales. Es más lento (no tiene soporte nativo de la CPU), pero para dinero la exactitud manda.

### 3.3 Otros primitivos

| Alias | Tipo | Notas |
|---|---|---|
| `bool` | `System.Boolean` | `true`/`false`. **No** se convierte implícitamente a/desde `int` (a diferencia de C). |
| `char` | `System.Char` | 16 bits, una unidad **UTF-16** (`'A'`, `'\n'`, `'\u00F1'`) |
| `string` | `System.String` | Secuencia inmutable de `char`. **Reference type**. |
| `object` | `System.Object` | Raíz de toda la jerarquía de tipos. |

### 3.4 Literales útiles

```csharp
int millon    = 1_000_000;     // separador de dígitos (C# 7), solo legibilidad
int hex       = 0xFF;          // 255
int binario   = 0b1010_1010;   // 170
long grande   = 5_000_000_000L; // sufijo L = long
float f       = 3.14f;         // sufijo f obligatorio: 3.14 por defecto es double
decimal m     = 9.99m;         // sufijo m obligatorio para decimal
uint u        = 42u;

// Strings
string ruta    = @"C:\temp\archivo.txt";      // verbatim: \ no escapa
string saludo  = $"Hola {nombre}, tienes {edad} años"; // interpolación
string json    = """
    { "nombre": "Ana", "edad": 30 }
    """;                                        // raw string literal (C# 11): sin escapes
string rawInterp = $$"""{ "nombre": "{{nombre}}" }"""; // $$ → las llaves de interpolación son dobles
```

### 3.5 Valores por defecto

Todo tipo tiene un valor por defecto (`default`) — son "todos los bits en cero":

```csharp
Console.WriteLine(default(int));     // 0
Console.WriteLine(default(bool));    // False
Console.WriteLine(default(char) == '\0'); // True
Console.WriteLine(default(string) is null); // True → reference types: null
```

> ⚠️ Los **campos** de una clase se inicializan automáticamente a `default`. Las **variables locales no**: el compilador te obliga a asignarlas antes de leerlas (*definite assignment*).
> ```csharp
> int x;
> // Console.WriteLine(x);  // ❌ CS0165: uso de variable local no asignada
> ```

---

## 4. Conversiones de tipo

```csharp
int entero = 100;
long largo = entero;            // IMPLÍCITA: no hay pérdida posible (widening)
double d = entero;              // implícita

double pi = 3.99;
int truncado = (int)pi;         // EXPLÍCITA (cast): trunca → 3 (no redondea)

long enorme = 5_000_000_000;
int desbordado = (int)enorme;   // compila, pero da basura: 705032704 (overflow silencioso)

// checked: fuerza a lanzar OverflowException en vez de "dar la vuelta"
try
{
    int seguro = checked((int)enorme);
}
catch (OverflowException) { Console.WriteLine("¡Overflow detectado!"); }

// Parseo desde string
int n1 = int.Parse("42");                       // lanza FormatException si falla
bool ok = int.TryParse("abc", out int n2);      // no lanza: ok = false, n2 = 0 (Sesión 4: out)
int n3 = Convert.ToInt32("42");                 // Convert.ToInt32(null) devuelve 0 (Parse lanzaría)

// Redondeo real
int redondeado = (int)Math.Round(3.5);          // 4 — ⚠️ pero Math.Round(2.5) = 2 (banker's rounding)
int arriba = (int)Math.Round(2.5, MidpointRounding.AwayFromZero); // 3
```

| Tipo de conversión | Sintaxis | Riesgo |
|---|---|---|
| Implícita | `long l = i;` | Ninguno (el compilador lo garantiza) |
| Explícita (cast) | `(int)d` | Truncamiento / overflow |
| Parse | `int.Parse(s)` | Excepción si el formato es inválido |
| TryParse | `int.TryParse(s, out var n)` | Ninguno — **preferido para input de usuario** |
| `Convert.ToX` | `Convert.ToInt32(x)` | Maneja `null`; redondea (banker's) en vez de truncar |
| `as` / `is` | `obj as string` | Solo reference/nullable types (Sesión 16) |

> ⚠️ **Banker's rounding**: `Math.Round` por defecto redondea al par más cercano (`2.5 → 2`, `3.5 → 4`) para minimizar sesgo estadístico. Sorprende a todos la primera vez. `Convert.ToInt32(2.5)` también da `2`.

> ❓ **Entrevista**: *"¿Qué pasa si haces `(int)` de un `long` que no cabe?"* → Por defecto el contexto es `unchecked`: se descartan los bits altos y obtienes un valor incorrecto sin error. Con `checked` (o `<CheckForOverflowUnderflow>true</CheckForOverflowUnderflow>` en el `.csproj`) lanza `OverflowException`.

---

## 5. Value types vs Reference types (el corazón de la sesión)

Todo tipo en .NET cae en una de dos categorías:

| | **Value types** | **Reference types** |
|---|---|---|
| Qué guarda la variable | **El dato mismo** | Una **referencia** (dirección) al objeto |
| Al asignar `b = a` | Se **copia** el dato | Se copia la **referencia** → ambos apuntan al mismo objeto |
| Puede ser `null` | No (salvo `Nullable<T>` / `int?`) | Sí |
| Heredan de | `System.ValueType` | `System.Object` directamente (o de otra clase) |
| Herencia | No pueden heredar (son `sealed`) | Sí |
| Ejemplos | `int`, `double`, `bool`, `char`, `decimal`, `DateTime`, `Guid`, **`struct`**, **`enum`**, tuplas `(int, string)` | **`class`**, `string`, arrays (`int[]`), `interface`, `delegate`, `record` (class), `object` |
| Comparación `==` por defecto | Por valor (en primitivos) | Por referencia (salvo `string`, records y overloads) |

### 5.1 Ver la diferencia con código

```csharp
// ─── VALUE TYPE ───
struct PuntoS { public int X; public int Y; }

// ─── REFERENCE TYPE ───
class PuntoC { public int X; public int Y; }

var s1 = new PuntoS { X = 1, Y = 1 };
var s2 = s1;          // COPIA de todos los campos
s2.X = 99;
Console.WriteLine(s1.X);   // 1   ← s1 no se enteró

var c1 = new PuntoC { X = 1, Y = 1 };
var c2 = c1;          // copia la REFERENCIA: mismo objeto
c2.X = 99;
Console.WriteLine(c1.X);   // 99  ← c1 y c2 son el mismo objeto
```

Diagrama de memoria:

```
 VALUE TYPE (struct)                    REFERENCE TYPE (class)

 s1 ┌──────────┐                       c1 ┌────────┐        HEAP
    │ X=1 Y=1  │                          │ 0x7A10 │───┐   ┌──────────────┐
    └──────────┘                          └────────┘   ├──▶│ header       │
 s2 ┌──────────┐                       c2 ┌────────┐   │   │ MethodTable* │
    │ X=99 Y=1 │ ← copia independiente    │ 0x7A10 │───┘   │ X=99  Y=1    │
    └──────────┘                          └────────┘       └──────────────┘
                                          dos referencias, UN objeto
```

### 5.2 Paso a métodos (adelanto de la Sesión 4)

```csharp
void Mover(PuntoS p) => p.X = 500;   // recibe una COPIA
void MoverC(PuntoC p) => p.X = 500;  // recibe una copia de la REFERENCIA

Mover(s1);   Console.WriteLine(s1.X); // 1   → no cambió
MoverC(c1);  Console.WriteLine(c1.X); // 500 → cambió el objeto compartido
```

> ❓ **Entrevista (trampa clásica)**: *"¿En C# los objetos se pasan por referencia?"* → **No exactamente.** Por defecto **todo** se pasa **por valor**. En un reference type, lo que se copia es *la referencia*; por eso puedes mutar el objeto, pero si reasignas el parámetro (`p = new PuntoC()`), el llamador no lo ve. El paso real por referencia es con `ref`/`out`/`in` (Sesión 4).

---

## 6. Stack y Heap: dónde vive cada cosa (y el gran mito)

### 6.1 Las dos zonas

| | **Stack** (pila) | **Heap** (montón administrado) |
|---|---|---|
| Qué es | Memoria por **hilo**, LIFO, un "frame" por llamada a método | Memoria compartida del proceso, gestionada por el GC |
| Asignación | Mover un puntero → casi gratis | Más costosa; el GC debe rastrearla |
| Liberación | Automática al salir del método (se descarta el frame) | La hace el **GC** cuando el objeto es inalcanzable (Sesión 14) |
| Tamaño | Pequeño (~1 MB por hilo por defecto) | Grande |
| Error típico | `StackOverflowException` (recursión infinita) | `OutOfMemoryException` |

```
        STACK (hilo principal)                    HEAP (managed)
   ┌─────────────────────────────┐
   │ frame: Main()               │
   │   int edad = 30             │
   │   PuntoS s1 {X=1,Y=1}       │
   │   PuntoC c1 = 0x7A10  ──────┼────────▶ ┌────────────────┐
   │   string n  = 0x7B20  ──────┼──┐       │ PuntoC {1, 1}  │
   ├─────────────────────────────┤  │       └────────────────┘
   │ frame: Calcular(int a)      │  └─────▶ ┌────────────────┐
   │   int a = 5                 │          │ string "Ana"   │
   │   double r = 2.5            │          └────────────────┘
   └─────────────────────────────┘
      ▲ se "desapila" al retornar
```

### 6.2 El mito: "los value types viven en el stack"

Es **falso** como regla general. La verdad (tal como la explica Eric Lippert, ex-diseñador del compilador): **dónde vive un valor depende de su *contexto*, no de su tipo.**

| Situación | ¿Dónde vive? |
|---|---|
| Variable local value type (`int x` en un método) | Stack (o en un registro de la CPU) |
| **Campo** value type dentro de una **clase** | **Heap**, *inline* dentro del objeto |
| Elementos de un array `int[]` | **Heap** (el array es un objeto) |
| Value type **boxeado** (`object o = 5`) | **Heap** |
| Local capturada por una **lambda** (closure, Sesión 10) | **Heap** (se mueve a una clase generada) |
| Local en un método **`async`** o iterador (`yield`) | **Heap** (se mueve a la state machine) |
| Referencia a un objeto (la variable `c1`) | Stack si es local; la **instancia** siempre en heap |
| `ref struct` (ej. `Span<T>`, Sesión 19) | **Garantizado** stack — nunca puede ir al heap |

```csharp
class Pedido
{
    public int Cantidad;      // value type... pero vive en el HEAP dentro de cada Pedido
    public decimal Total;     // idem
}

int[] numeros = { 1, 2, 3 }; // los tres int viven en el HEAP (dentro del array)
```

> ❓ **Entrevista**: *"¿Dónde se almacenan los value types?"* → La respuesta senior: *"Las variables locales de value type normalmente van en el stack, pero no es una propiedad del tipo: si el value type es un campo de una clase, un elemento de array, está boxeado o capturado por una closure/async, vive en el heap. La diferencia esencial entre value y reference types es la **semántica de copia**, no la ubicación en memoria."*

### 6.3 ¿Qué contiene un objeto en el heap?

Cada instancia de reference type tiene *overhead* además de sus campos:

```
┌───────────────────────┐
│ Object header (8 B)   │ ← sync block index (lock, hash code)
│ MethodTable ptr (8 B) │ ← puntero a la info del tipo (métodos, VTable → Sesión 31)
│ campos...             │
└───────────────────────┘
Mínimo en 64 bits: 24 bytes aunque la clase esté vacía.
```

Por eso crear millones de objetos pequeños tiene costo (memoria + presión sobre el GC), y por eso existen los `struct`.

---

## 7. Boxing y unboxing

**Boxing** = convertir un value type a `object` (o a una interfaz que implementa). El runtime **crea un objeto en el heap** y copia el valor dentro. **Unboxing** = extraer el valor de vuelta (con cast explícito).

```csharp
int n = 42;
object caja = n;          // BOXING: alloc en heap + copia de 42
int m = (int)caja;        // UNBOXING: verifica tipo + copia de vuelta

n = 100;
Console.WriteLine(caja);  // 42 → la caja tiene su PROPIA copia

// long l = (long)caja;   // ❌ InvalidCastException: solo se puede unboxear al tipo EXACTO
long l = (int)caja;       // ✅ unbox a int, luego conversión implícita a long
```

```
 STACK                 HEAP
 n = 42  ──boxing──▶  ┌──────────────────┐
                      │ header | MT(Int32)│
 caja = ref ────────▶ │ 42               │
                      └──────────────────┘
```

### 7.1 Dónde se esconde el boxing (y por qué importa)

```csharp
// 1. Colecciones no genéricas (legacy)
var lista = new System.Collections.ArrayList();
lista.Add(5);                    // boxing en cada Add → usa List<int> (Sesión 7-8)

// 2. Interpolación / concatenación con object en APIs viejas
string s = string.Format("{0}", 5);   // boxing del 5 (params object[])
// Nota: $"{5}" en C# 10+ usa DefaultInterpolatedStringHandler y evita el boxing

// 3. Llamar a un método de interfaz sobre un struct vía la interfaz
IComparable c = 5;               // boxing

// 4. Enum.HasFlag en versiones antiguas de .NET (hoy el JIT lo optimiza)
```

> ⚠️ El boxing no es "malo", pero en *hot paths* (bucles con millones de iteraciones) genera asignaciones innecesarias y presión sobre el GC. Los **generics** (Sesión 8) existen en gran parte para eliminarlo. Profundizamos en el costo en la Sesión 31.

> ❓ **Entrevista**: *"¿Qué es boxing y por qué `List<int>` es mejor que `ArrayList`?"* → Boxing envuelve un value type en un objeto del heap. `ArrayList` guarda `object`, así que cada `int` se boxea al insertar y se unboxea al leer (costo + no type-safe). `List<int>` es genérico: el JIT genera código especializado para `int` y los valores se guardan sin boxing en un array `int[]` interno.

---

## 8. `string`: el reference type que se comporta como valor

`string` es un reference type, pero tiene dos características que lo hacen parecer un value type:

1. **Inmutable**: ningún método modifica el string; todos devuelven uno **nuevo**.
2. **`==` compara contenido**, no referencia (el operador está sobrecargado).

```csharp
string a = "hola";
string b = a;
b += " mundo";              // crea un NUEVO string; 'a' sigue apuntando al viejo
Console.WriteLine(a);       // "hola"

string x = "abc";
string y = new string(new[] { 'a', 'b', 'c' });
Console.WriteLine(x == y);                     // True  → compara contenido
Console.WriteLine(ReferenceEquals(x, y));      // False → son objetos distintos

// Interning: los LITERALES idénticos comparten la misma instancia
string p = "abc";
Console.WriteLine(ReferenceEquals(x, p));      // True → mismo literal, internado
```

### 8.1 Concatenar en bucles: usa `StringBuilder`

```csharp
// ❌ O(n²): cada += crea un string nuevo y copia todo lo anterior
string malo = "";
for (int i = 0; i < 10_000; i++) malo += i;

// ✅ StringBuilder: buffer mutable que crece
var sb = new System.Text.StringBuilder();
for (int i = 0; i < 10_000; i++) sb.Append(i);
string bueno = sb.ToString();
```

> ❓ **Entrevista**: *"¿Por qué `string` es inmutable?"* → Seguridad en hilos (se puede compartir sin locks), permite el *interning* y el uso seguro como clave de diccionario (su hash no cambia), y evita que un método altere un string que le pasaste. El costo es que modificar crea copias → `StringBuilder` para construcción repetida.

---

## 9. `struct` vs `class`: cuándo usar cada uno

```csharp
// Buen candidato a struct: pequeño, inmutable, semántica de "valor"
public readonly struct Coordenada
{
    public double Lat { get; }
    public double Lon { get; }
    public Coordenada(double lat, double lon) => (Lat, Lon) = (lat, lon);
}
```

Guía oficial de Microsoft — considera `struct` **solo si** se cumplen todas:
- Representa lógicamente **un único valor** (como `int`, `DateTime`, un punto).
- Tamaño de instancia **< 16 bytes** aproximadamente.
- Es **inmutable**.
- No necesitará boxearse con frecuencia.

| Criterio | `struct` | `class` |
|---|---|---|
| Semántica | Valor (copia) | Identidad (referencia) |
| Costo de asignación | Ninguno en el heap (si es local) | Allocation en heap + GC |
| Costo de copia | Proporcional al tamaño | Siempre 8 bytes (la referencia) |
| Herencia | No | Sí |
| Constructor sin parámetros | Permitido desde C# 10 | Sí |
| `null` | No (usa `T?`) | Sí |

> ⚠️ **Structs mutables = bugs sutiles.** Si modificas una copia creyendo que modificas el original:
> ```csharp
> var lista = new List<PuntoS> { new PuntoS { X = 1 } };
> // lista[0].X = 5;   // ❌ CS1612: el indexador devuelve una COPIA, el compilador lo impide
> var p = lista[0]; p.X = 5; lista[0] = p;   // hay que reasignar
> ```
> Por eso la regla: **structs inmutables** (`readonly struct`). Records e inmutabilidad en la Sesión 17.

---

## 10. Nullable value types (`int?`)

Un value type no puede ser `null`… salvo que lo envuelvas en `Nullable<T>`, cuyo atajo es `T?`:

```csharp
int? edad = null;                    // Nullable<int>
Console.WriteLine(edad.HasValue);    // False
edad = 25;
Console.WriteLine(edad.Value);       // 25   (⚠️ .Value con null lanza InvalidOperationException)

int segura = edad ?? 0;              // null-coalescing: 0 si es null (Sesión 3)
int otra   = edad.GetValueOrDefault();
```

`Nullable<T>` es a su vez un **struct** con dos campos: `bool hasValue` y `T value`. No es boxing ni heap.

> ⚠️ No confundas `int?` (**nullable value type**, un tipo real distinto: `Nullable<int>`) con `string?` (**nullable reference type**, solo una anotación para el análisis estático del compilador). Esto último lo vemos a fondo en la Sesión 15.

---

## 11. Enums y tuplas (value types frecuentes)

```csharp
enum EstadoPedido { Pendiente, Pagado, Enviado, Entregado }   // int por defecto: 0,1,2,3

[Flags]
enum Permisos { Ninguno = 0, Leer = 1, Escribir = 2, Borrar = 4 } // potencias de 2

var estado = EstadoPedido.Pagado;
Console.WriteLine((int)estado);                  // 1
Console.WriteLine(estado.ToString());            // "Pagado"

var p = Permisos.Leer | Permisos.Escribir;       // combinar bits
Console.WriteLine(p.HasFlag(Permisos.Escribir)); // True
Console.WriteLine(p);                            // "Leer, Escribir" (gracias a [Flags])

// ⚠️ Un enum acepta CUALQUIER valor de su tipo subyacente
var raro = (EstadoPedido)42;                      // compila y corre
Console.WriteLine(Enum.IsDefined(raro));          // False → valida input externo

// Tuplas (ValueTuple): value type, ideal para devolver varios valores
(string Nombre, int Edad) persona = ("Ana", 30);
Console.WriteLine(persona.Nombre);
var (n, e) = persona;                             // deconstrucción
```

---

## Resumen mental de la sesión

```
var      → inferencia ESTÁTICA (no es dynamic)
const    → compilación, se incrusta · readonly → runtime, en ctor
decimal  → dinero · double → ciencia (0.1+0.2 != 0.3)

VALUE TYPE     = la variable CONTIENE el dato → asignar COPIA
  int, double, bool, char, decimal, DateTime, struct, enum, tuplas
REFERENCE TYPE = la variable contiene una REFERENCIA → asignar comparte objeto
  class, string, array, interface, delegate, record

Stack: frames por hilo, LIFO, gratis · Heap: compartido, lo limpia el GC
MITO: "value types en el stack" → depende del CONTEXTO (campo, array, box, closure, async → heap)

Boxing   = value → object (alloc en heap)   · Unboxing = cast al tipo EXACTO
string   = reference, INMUTABLE, == por contenido → StringBuilder en bucles
Todo se pasa POR VALOR por defecto (en reference types, el valor es la referencia)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Diferencia entre `var`, `dynamic` y `object`?
2. ❓ ¿`const` vs `readonly`? ¿Qué problema de versionado tiene un `const` público?
3. ❓ ¿Por qué `0.1 + 0.2 != 0.3` en `double` y qué tipo usarías para dinero?
4. ❓ Explica value types vs reference types en términos de **semántica de asignación**.
5. ❓ ¿Es cierto que los value types siempre viven en el stack? Da tres contraejemplos.
6. ❓ ¿Qué es boxing? Da dos lugares donde ocurre sin que lo notes.
7. ❓ ¿Por qué `(long)caja` falla si `caja` contiene un `int` boxeado?
8. ❓ ¿`string` es value o reference type? ¿Por qué `==` compara contenido?
9. ❓ ¿Por qué concatenar strings en un bucle es O(n²) y cuál es la solución?
10. ❓ ¿Cuándo elegirías un `struct` en lugar de una `class`? ¿Por qué deben ser inmutables?
11. ❓ ¿Qué diferencia hay entre `int?` y `string?`?
12. ❓ "En C# los objetos se pasan por referencia" — ¿verdadero o falso? Matiza.

## Ejercicio práctico
1. Crea un proyecto: `dotnet new console -o TiposLab` y ábrelo.
2. **Copia vs referencia**: define `struct PuntoS` y `class PuntoC` con `X` e `Y`. Asigna, modifica la copia e imprime ambos. Luego pásalos a un método que los modifique y compara resultados.
3. **Precisión**: imprime `0.1 + 0.2` con `double` y con `decimal`. Luego imprime `Math.Round(2.5)` y `Math.Round(2.5, MidpointRounding.AwayFromZero)`.
4. **Overflow**: convierte `long l = 5_000_000_000` a `int` sin y con `checked`. Luego activa `<CheckForOverflowUnderflow>true</CheckForOverflowUnderflow>` en el `.csproj` y observa el cambio.
5. **Boxing medible**: ejecuta este código y compara la memoria asignada:
   ```csharp
   long antes = GC.GetAllocatedBytesForCurrentThread();
   var al = new System.Collections.ArrayList();
   for (int i = 0; i < 1_000_000; i++) al.Add(i);
   Console.WriteLine($"ArrayList: {GC.GetAllocatedBytesForCurrentThread() - antes:N0} bytes");

   antes = GC.GetAllocatedBytesForCurrentThread();
   var li = new List<int>();
   for (int i = 0; i < 1_000_000; i++) li.Add(i);
   Console.WriteLine($"List<int>: {GC.GetAllocatedBytesForCurrentThread() - antes:N0} bytes");
   ```
   Explica con tus palabras por qué `ArrayList` asigna mucho más.
6. **StringBuilder**: mide con `System.Diagnostics.Stopwatch` 50.000 concatenaciones con `+=` vs `StringBuilder`.
7. (Opcional) Usa `ReferenceEquals` para comprobar el *interning* de literales y que `string.Concat("ab", x)` en runtime **no** está internado (prueba `string.Intern`).

---

➡️ **Cuando termines**, marca la Sesión 2 en el [README](Readme.md) y pídeme la **Sesión 3 — Operadores y control de flujo**.
