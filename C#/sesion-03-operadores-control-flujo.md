# Sesión 3 — Operadores y control de flujo: decidir, repetir y saltar

> **Objetivo de la sesión**: dominar los operadores de C# (aritméticos, lógicos, bit a bit, de nulos) con sus trampas de precedencia y cortocircuito, y todas las estructuras de control: `if`, `switch` clásico y *switch expressions*, los cuatro bucles, y `break`/`continue`/`return`. Al terminar deberías poder explicar por qué `foreach` funciona sobre cualquier cosa "enumerable", cuándo `&&` evita un `NullReferenceException` y por qué modificar una colección dentro de un `foreach` explota.

---

## 1. Operadores aritméticos

| Operador | Significado | Ejemplo | Resultado |
|---|---|---|---|
| `+` `-` `*` | suma, resta, multiplicación | `7 * 2` | `14` |
| `/` | división | `7 / 2` | **`3`** (división entera) |
| `%` | resto (módulo) | `7 % 2` | `1` |
| `++` `--` | incremento / decremento | `i++` | — |

### 1.1 La división entera (el error #1 de principiantes)

```csharp
int a = 7, b = 2;
Console.WriteLine(a / b);          // 3     → int / int = int (trunca hacia cero)
Console.WriteLine(a / (double)b);  // 3.5   → basta con que UNO sea double
Console.WriteLine(7 / 2.0);        // 3.5
Console.WriteLine(-7 / 2);         // -3    → trunca hacia cero, NO hacia -∞ (Python da -4)
Console.WriteLine(-7 % 2);         // -1    → el signo del resto sigue al dividendo

// División por cero: depende del tipo
// Console.WriteLine(a / 0);       // ❌ int: DivideByZeroException (o error de compilación si es constante)
Console.WriteLine(7.0 / 0);        // ∞     → double: Infinity, NO lanza
Console.WriteLine(0.0 / 0);        // NaN   → Not a Number
Console.WriteLine(double.NaN == double.NaN); // False  😱 usa double.IsNaN(x)
```

> ⚠️ Para saber si un número es par con negativos: `n % 2 == 0` funciona, pero `n % 2 == 1` **falla** para impares negativos (`-3 % 2 == -1`). Usa `n % 2 != 0`.

### 1.2 Prefijo vs sufijo

```csharp
int i = 5;
int x = i++;   // x = 5, luego i = 6   (sufijo: devuelve el valor ANTES)
int y = ++i;   // i = 7, luego y = 7   (prefijo: devuelve el valor DESPUÉS)
```

> ❓ **Entrevista**: *"¿Qué imprime `int i = 0; i = i++; Console.WriteLine(i);`?"* → `0`. `i++` evalúa a 0 (el valor viejo), incrementa `i` a 1, y luego la asignación sobrescribe `i` con ese 0. En C# el orden de evaluación está **definido** (izquierda a derecha), a diferencia de C++ donde es comportamiento indefinido.

### 1.3 Operadores compuestos

```csharp
int total = 10;
total += 5;    // total = total + 5
total -= 3;
total *= 2;
total /= 4;
total %= 3;
string s = "a"; s += "b";   // también con strings
```

---

## 2. Operadores de comparación y lógicos

| Operador | Significado |
|---|---|
| `==` `!=` | igual / distinto |
| `<` `>` `<=` `>=` | relacionales |
| `&&` | AND lógico **con cortocircuito** |
| `\|\|` | OR lógico **con cortocircuito** |
| `!` | NOT |
| `&` `\|` | AND / OR **sin** cortocircuito (en `bool`) |
| `^` | XOR |

### 2.1 Cortocircuito (*short-circuit*)

`&&` no evalúa el lado derecho si el izquierdo es `false`; `||` no lo evalúa si el izquierdo es `true`. Esto no es solo optimización: **es un patrón de seguridad**.

```csharp
string? nombre = null;

if (nombre != null && nombre.Length > 3)   // ✅ si es null, Length NUNCA se evalúa
    Console.WriteLine("largo");

// if (nombre != null & nombre.Length > 3) // ❌ & evalúa ambos lados → NullReferenceException

bool Costoso() { Console.WriteLine("¡Me llamaron!"); return true; }
bool r = true || Costoso();   // no imprime nada: Costoso() no se ejecuta
bool q = true | Costoso();    // imprime "¡Me llamaron!"
```

> ❓ **Entrevista**: *"¿Diferencia entre `&` y `&&`?"* → Con `bool`, ambos son AND lógico, pero `&&` cortocircuita (no evalúa el segundo operando si el primero ya decide el resultado) y `&` siempre evalúa ambos. Con enteros, `&` es AND bit a bit y `&&` no compila.

### 2.2 `==` y la igualdad (adelanto)

```csharp
int a = 5, b = 5;
Console.WriteLine(a == b);            // True → value types: por valor

var o1 = new object();
var o2 = new object();
Console.WriteLine(o1 == o2);          // False → reference types: por referencia (por defecto)

string s1 = "hola", s2 = "HOLA".ToLower();
Console.WriteLine(s1 == s2);          // True → string sobrecarga ==
Console.WriteLine(string.Equals(s1, "HOLA", StringComparison.OrdinalIgnoreCase)); // True
```

La igualdad (`Equals`, `GetHashCode`, sobrecarga de `==`) la profundizamos en la Sesión 5 y con records en la Sesión 17.

---

## 3. Operadores bit a bit

Operan sobre los bits de enteros. Son la base de los enums `[Flags]` (Sesión 2) y aparecen en entrevistas de algoritmos.

| Operador | Nombre | Ejemplo (`a=0b1100`, `b=0b1010`) | Resultado |
|---|---|---|---|
| `&` | AND | `a & b` | `0b1000` |
| `\|` | OR | `a \| b` | `0b1110` |
| `^` | XOR | `a ^ b` | `0b0110` |
| `~` | NOT (complemento) | `~0` | `-1` |
| `<<` | desplazamiento izq. | `1 << 3` | `8` |
| `>>` | desplazamiento der. (aritmético, conserva signo) | `-16 >> 2` | `-4` |
| `>>>` | desplazamiento der. **sin signo** (C# 11) | `-16 >>> 28` | `15` |

```csharp
// Trucos clásicos de entrevista
bool EsPar(int n)            => (n & 1) == 0;
bool EsPotenciaDe2(int n)    => n > 0 && (n & (n - 1)) == 0;
int  EncenderBit(int n, int k) => n | (1 << k);
int  ApagarBit(int n, int k)   => n & ~(1 << k);
bool BitEncendido(int n, int k) => (n & (1 << k)) != 0;

// Encontrar el único número sin pareja: XOR cancela duplicados (x ^ x = 0)
int[] datos = { 4, 1, 2, 1, 2 };
int unico = 0;
foreach (var d in datos) unico ^= d;
Console.WriteLine(unico);   // 4

Console.WriteLine(System.Numerics.BitOperations.PopCount(0b1011u)); // 3 bits encendidos
```

---

## 4. Operadores de nulos (los que más usarás en código moderno)

| Operador | Nombre | Qué hace |
|---|---|---|
| `??` | null-coalescing | `a ?? b` → `a` si no es null, si no `b` |
| `??=` | null-coalescing assignment | `a ??= b` → asigna `b` solo si `a` es null |
| `?.` | null-conditional | `a?.B` → `null` si `a` es null, en vez de lanzar |
| `?[]` | null-conditional index | `arr?[0]` |
| `!` (postfijo) | null-forgiving | "confía en mí, no es null" → solo silencia warnings (Sesión 15) |

```csharp
string? input = null;
string nombre = input ?? "Anónimo";           // "Anónimo"

List<string>? cache = null;
cache ??= new List<string>();                 // inicialización perezosa
cache.Add("x");

Cliente? cliente = ObtenerCliente();
int? largoCalle = cliente?.Direccion?.Calle?.Length;  // null si cualquier eslabón es null
int largo = cliente?.Direccion?.Calle?.Length ?? 0;   // combinados: valor por defecto

// Invocar un delegado/evento de forma segura (Sesión 11)
Action? alTerminar = null;
alTerminar?.Invoke();                          // no hace nada si es null

// throw expression (C# 7): lanzar en medio de una expresión
string Requerido(string? s) => s ?? throw new ArgumentNullException(nameof(s));

Cliente? ObtenerCliente() => null;
record Direccion(string? Calle);
record Cliente(Direccion? Direccion);
```

> ⚠️ `?.` sobre un value type cambia el tipo del resultado a nullable: `cliente?.Edad` es `int?`, no `int`. Por eso muchas veces lo verás combinado con `??`.

> ❓ **Entrevista**: *"¿Qué hace `x?.Metodo()` si `x` es null?"* → No llama al método y la expresión completa evalúa a `null` (cortocircuita toda la cadena a la derecha). Si el método devuelve `void`, simplemente no hace nada.

---

## 5. Otros operadores útiles

```csharp
// Ternario
int edad = 20;
string tipo = edad >= 18 ? "adulto" : "menor";

// nameof: nombre del símbolo como string, verificado en compilación (sobrevive a refactors)
Console.WriteLine(nameof(edad));   // "edad"

// typeof / GetType / is / as (a fondo en Sesión 16 y 20)
Type t = typeof(string);
object o = "hola";
if (o is string s) Console.WriteLine(s.Length);   // type pattern + variable
string? comoString = o as string;                  // null si no es string (no lanza)

// sizeof (value types no gestionados)
Console.WriteLine(sizeof(long));   // 8

// Rangos e índices (C# 8)
int[] nums = { 10, 20, 30, 40, 50 };
Console.WriteLine(nums[^1]);        // 50 → ^1 = último
int[] medio = nums[1..4];           // { 20, 30, 40 } → [inicio, fin)
string sub = "Hola Mundo"[5..];     // "Mundo"
```

---

## 6. Precedencia y asociatividad

No hay que memorizar la tabla entera, pero sí el orden grueso (de mayor a menor):

```
1. Primarios        x.y  f(x)  a[i]  x?.y  x++  x--  new  typeof  nameof
2. Unarios          +x  -x  !x  ~x  ++x  --x  (T)x  await  ^x
3. Rango            x..y
4. switch / with    x switch {...}   x with {...}
5. Multiplicativos  *  /  %
6. Aditivos         +  -
7. Desplazamiento   <<  >>  >>>
8. Relacionales     <  >  <=  >=  is  as
9. Igualdad         ==  !=
10. AND bits        &
11. XOR bits        ^
12. OR bits         |
13. AND lógico      &&
14. OR lógico       ||
15. Null-coalescing ??            ← ¡muy baja!
16. Ternario        ?:
17. Asignación      =  +=  ??=  =>  (asociatividad DERECHA)
```

```csharp
int? cantidad = null;
int total = cantidad ?? 0 + 10;      // ⚠️ se lee: cantidad ?? (0 + 10) → 10
int bien  = (cantidad ?? 0) + 10;    // ✅ 10 también aquí, pero si cantidad=5: 15 vs 5

bool r = 1 + 2 == 3 && true;         // (1 + 2) == 3 && true → True
int bits = 1 << 2 + 1;               // ⚠️ 1 << (2 + 1) = 8, no (1 << 2) + 1 = 5
```

> ⚠️ **Regla práctica**: cuando mezcles `??`, `?:`, desplazamientos o bits con aritmética, **pon paréntesis**. El código se lee más veces de las que se escribe.

---

## 7. `if` / `else`

```csharp
int nota = 72;

if (nota >= 90)
{
    Console.WriteLine("Excelente");
}
else if (nota >= 60)
{
    Console.WriteLine("Aprobado");
}
else
{
    Console.WriteLine("Reprobado");
}
```

- La condición **debe** ser `bool`. `if (1)` o `if (x = 5)` **no compilan** (a diferencia de C). Esto elimina una clase entera de bugs.
- Las llaves son opcionales para una sola sentencia, pero la mayoría de guías de estilo las exigen (evita el bug "goto fail" de Apple).

### 7.1 Guard clauses: aplanar el código

```csharp
// ❌ "Flecha" de ifs anidados
decimal CalcularDescuentoMal(Cliente? c)
{
    if (c != null)
    {
        if (c.Activo)
        {
            if (c.Compras > 10) return 0.15m;
            else return 0.05m;
        }
    }
    return 0m;
}

// ✅ Guard clauses: salir temprano, el "camino feliz" queda sin indentar
decimal CalcularDescuento(Cliente? c)
{
    if (c is null) return 0m;
    if (!c.Activo) return 0m;
    return c.Compras > 10 ? 0.15m : 0.05m;
}

record Cliente(bool Activo, int Compras);
```

---

## 8. `switch`: statement clásico y switch expression

### 8.1 Switch statement

```csharp
DayOfWeek dia = DateTime.Today.DayOfWeek;

switch (dia)
{
    case DayOfWeek.Saturday:
    case DayOfWeek.Sunday:              // varios case apilados = mismo bloque
        Console.WriteLine("Fin de semana");
        break;
    case DayOfWeek.Friday:
        Console.WriteLine("¡Casi!");
        break;                          // obligatorio
    default:
        Console.WriteLine("Laboral");
        break;
}
```

> ⚠️ **No hay fall-through implícito** en C#. Si un `case` con código no termina en `break`, `return`, `throw` o `goto case`, **no compila** (CS0163). Es deliberado: el fall-through accidental de C/Java es una fuente clásica de bugs. Si realmente lo quieres: `goto case DayOfWeek.Sunday;`.

### 8.2 Switch con patrones y `when`

```csharp
object valor = 42;

switch (valor)
{
    case int n when n < 0:
        Console.WriteLine("entero negativo");
        break;
    case int n:
        Console.WriteLine($"entero {n}");
        break;
    case string s:
        Console.WriteLine($"string de {s.Length} chars");
        break;
    case null:
        Console.WriteLine("null");
        break;
    default:
        Console.WriteLine("otra cosa");
        break;
}
```

### 8.3 Switch expression (C# 8) — el estilo moderno

Es una **expresión** (devuelve un valor), no una sentencia. Más concisa y el compilador avisa si no es exhaustiva.

```csharp
string Clasificar(int nota) => nota switch
{
    >= 90            => "Excelente",     // relational pattern (C# 9)
    >= 60 and < 90   => "Aprobado",      // combinadores and / or / not
    < 0 or > 100     => throw new ArgumentOutOfRangeException(nameof(nota)),
    _                => "Reprobado"      // discard = default
};

decimal CostoEnvio(string pais, decimal peso) => (pais, peso) switch   // tuple pattern
{
    ("CL", < 1m)  => 2_990m,
    ("CL", _)     => 4_990m,
    ("AR" or "PE", _) => 9_990m,
    _             => 19_990m
};

Console.WriteLine(Clasificar(75));            // Aprobado
Console.WriteLine(CostoEnvio("CL", 0.5m));    // 2990
```

| | Switch statement | Switch expression |
|---|---|---|
| Es | Sentencia | Expresión (produce valor) |
| `break` | Obligatorio | No existe |
| Default | `default:` | `_ =>` |
| Exhaustividad | No se verifica | Warning CS8509 si faltan casos; lanza `SwitchExpressionException` en runtime si ninguno coincide |
| Uso ideal | Ejecutar bloques con varias sentencias | Mapear entrada → valor |

Todos los tipos de patrones (property, list, positional…) se ven a fondo en la **Sesión 16**.

> ❓ **Entrevista**: *"¿Qué pasa si ningún brazo de una switch expression coincide?"* → Lanza `System.Runtime.CompilerServices.SwitchExpressionException` en runtime. El compilador ya te había avisado con un warning de no exhaustividad; la buena práctica es cubrir con `_` (o tratar los warnings como errores).

---

## 9. Bucles

### 9.1 `for` — cuando conoces el número de iteraciones o necesitas el índice

```csharp
for (int i = 0; i < 5; i++)
{
    Console.Write($"{i} ");      // 0 1 2 3 4
}

// Varias variables y pasos arbitrarios
for (int i = 0, j = 10; i < j; i++, j--)
    Console.WriteLine($"{i}-{j}");

// Recorrer al revés (útil para eliminar de una lista sin romper índices)
var lista = new List<int> { 1, 2, 3, 4, 5, 6 };
for (int i = lista.Count - 1; i >= 0; i--)
    if (lista[i] % 2 == 0) lista.RemoveAt(i);
// lista = { 1, 3, 5 }
```

### 9.2 `while` — mientras se cumpla la condición (puede ejecutarse 0 veces)

```csharp
int intentos = 0;
while (intentos < 3 && !Conectar())
{
    intentos++;
    Console.WriteLine($"Reintento {intentos}");
}

bool Conectar() => Random.Shared.Next(3) == 0;
```

### 9.3 `do-while` — se ejecuta **al menos una vez**

```csharp
string? respuesta;
do
{
    Console.Write("¿Continuar? (s/n): ");
    respuesta = Console.ReadLine();
} while (respuesta != "s" && respuesta != "n");
```

### 9.4 `foreach` — recorrer cualquier secuencia

```csharp
string[] frutas = { "manzana", "pera", "uva" };
foreach (var fruta in frutas)
    Console.WriteLine(fruta);

var edades = new Dictionary<string, int> { ["Ana"] = 30, ["Luis"] = 25 };
foreach (var (nombre, edad) in edades)          // deconstrucción de KeyValuePair
    Console.WriteLine($"{nombre}: {edad}");
```

#### ¿Cómo funciona `foreach` por dentro?

`foreach` es *azúcar sintáctico*. El compilador lo traduce aproximadamente a:

```csharp
// foreach (var x in coleccion) { Cuerpo(x); }
// se convierte en:
using (var e = coleccion.GetEnumerator())
{
    while (e.MoveNext())
    {
        var x = e.Current;
        Cuerpo(x);
    }
}
```

```
 coleccion.GetEnumerator()
        │
        ▼
 ┌──────────────┐  MoveNext() → true   ┌─────────┐
 │  Enumerator  │ ───────────────────▶ │ Current │ → cuerpo del bucle
 │  (cursor)    │ ◀─────────────────── └─────────┘
 └──────────────┘  repetir
        │ MoveNext() → false
        ▼
    Dispose()  (el using garantiza limpieza)
```

Datos importantes:
- Funciona con **cualquier tipo que tenga un método `GetEnumerator()`** público con `MoveNext()` y `Current` (*duck typing*); no necesita implementar `IEnumerable` formalmente. `List<T>` devuelve un enumerador `struct` para evitar allocations.
- Sobre **arrays**, el compilador lo optimiza a un `for` con índice.
- La variable de iteración es de **solo lectura** (no puedes asignarle).
- Implementar tus propias secuencias con `yield return` lo vemos en las Sesiones 7 y 9.

> ⚠️ **No modifiques una colección mientras la recorres con `foreach`**:
> ```csharp
> var nums = new List<int> { 1, 2, 3, 4 };
> foreach (var n in nums)
>     if (n % 2 == 0) nums.Remove(n);   // 💥 InvalidOperationException:
>                                       // "Collection was modified; enumeration operation may not execute."
> ```
> El enumerador de `List<T>` guarda un número de versión; cualquier cambio lo invalida. Soluciones: `nums.RemoveAll(n => n % 2 == 0)`, recorrer con `for` al revés, o iterar sobre una copia (`nums.ToList()`).

> ❓ **Entrevista**: *"¿Qué necesita un tipo para poder usarse en un `foreach`?"* → Un método `GetEnumerator()` accesible que devuelva un tipo con `bool MoveNext()` y una propiedad `Current`. Normalmente se cumple implementando `IEnumerable<T>`, pero el compilador usa *pattern-based* lookup, así que la interfaz no es estrictamente necesaria (desde C# 9 incluso sirve un `GetEnumerator` de extensión).

### 9.5 Tabla de decisión

| Bucle | Úsalo cuando… |
|---|---|
| `for` | Necesitas el índice, pasos no triviales o recorrer al revés |
| `foreach` | Solo quieres recorrer todos los elementos (lo más legible, el default) |
| `while` | La condición de término no depende de un contador conocido |
| `do-while` | El cuerpo debe ejecutarse al menos una vez (menús, validar input) |
| LINQ (Sesión 9) | Transformar/filtrar datos en vez de "hacer cosas" paso a paso |

---

## 10. Sentencias de salto

| Sentencia | Efecto |
|---|---|
| `break` | Sale del bucle o `switch` **más interno** |
| `continue` | Salta a la siguiente iteración del bucle más interno |
| `return` | Sale del método (opcionalmente devolviendo un valor) |
| `goto` | Salta a una etiqueta (evítalo; útil solo en `switch` y para salir de bucles anidados) |
| `throw` | Lanza una excepción (Sesión 12) |

```csharp
// continue: saltar elementos
for (int i = 1; i <= 10; i++)
{
    if (i % 3 == 0) continue;   // omite múltiplos de 3
    Console.Write($"{i} ");     // 1 2 4 5 7 8 10
}

// Salir de bucles anidados: break solo sale del interno
int[,] matriz = { { 1, 2 }, { 3, 4 } };
(int fila, int col)? Buscar(int objetivo)
{
    for (int f = 0; f < matriz.GetLength(0); f++)
        for (int c = 0; c < matriz.GetLength(1); c++)
            if (matriz[f, c] == objetivo)
                return (f, c);      // ✅ la forma limpia: extraer a método y usar return
    return null;
}
Console.WriteLine(Buscar(3));       // (1, 0)
```

> ⚠️ C# no tiene `break etiqueta` como Java. Para salir de bucles anidados: extrae a un método y usa `return` (lo más limpio), usa un flag `bool`, o `goto` (legal pero mal visto).

---

## 11. Checked, unchecked y bucles con overflow

Recordando la Sesión 2: la aritmética entera por defecto es `unchecked`. En bucles eso puede producir bucles infinitos silenciosos:

```csharp
// ⚠️ byte va de 0 a 255: b <= 255 SIEMPRE es true → bucle infinito
// for (byte b = 0; b <= 255; b++) { }

int max = int.MaxValue;
int desborda = unchecked(max + 1);   // -2147483648
// int error = checked(max + 1);     // OverflowException
```

---

## Resumen mental de la sesión

```
int / int = int (trunca hacia 0) · 7.0 / 0 = ∞ · NaN != NaN
i++ devuelve el valor viejo · ++i el nuevo

&& || → CORTOCIRCUITO (patrón de seguridad contra null)
& |   → evalúan ambos lados (y en enteros: bits)

??  ??=  ?.  ?[]  → trabajar con null sin ifs
?? tiene precedencia MUY baja → usa paréntesis

if → condición SIEMPRE bool · guard clauses > ifs anidados
switch statement → sin fall-through implícito (break obligatorio)
switch expression → devuelve valor, patrones, _ = default, exhaustividad

for (índice) · foreach (default) · while (0..n) · do-while (1..n)
foreach = GetEnumerator + MoveNext + Current + Dispose
NO modificar la colección dentro del foreach → InvalidOperationException
break (sale) · continue (siguiente) · return (sale del método)
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué devuelve `-7 / 2` y `-7 % 2` en C#? ¿Y `7.0 / 0`?
2. ❓ ¿Qué imprime `int i = 0; i = i++;`? Explica por qué.
3. ❓ ¿Diferencia entre `&` y `&&`? Da un caso donde usar `&` provoca un bug.
4. ❓ ¿Qué hacen `??`, `??=` y `?.`? ¿Qué tipo tiene `persona?.Edad` si `Edad` es `int`?
5. ❓ ¿Por qué `cantidad ?? 0 + 10` puede no dar lo que esperas?
6. ❓ ¿Por qué C# no permite fall-through implícito en `switch`? ¿Cómo lo simulas?
7. ❓ Switch statement vs switch expression: ¿cuándo usar cada uno? ¿Qué pasa si ningún brazo coincide?
8. ❓ ¿Cómo traduce el compilador un `foreach`? ¿Qué necesita un tipo para ser "foreach-able"?
9. ❓ ¿Por qué falla eliminar elementos de una `List<T>` dentro de un `foreach`? Da tres soluciones.
10. ❓ ¿Diferencia entre `while` y `do-while`?
11. ❓ ¿Cómo sales de dos bucles anidados en C# de forma limpia?
12. ❓ ¿Cómo sabes si un entero es potencia de 2 con operadores de bits?

## Ejercicio práctico
1. Crea `dotnet new console -o ControlLab`.
2. **FizzBuzz con switch expression**: del 1 al 100 imprime "Fizz" (múltiplo de 3), "Buzz" (de 5), "FizzBuzz" (de ambos) o el número. Usa un *tuple pattern*: `(i % 3, i % 5) switch { (0, 0) => ..., ... }`.
3. **Menú con `do-while`**: muestra un menú (1. Sumar, 2. Restar, 0. Salir), lee con `Console.ReadLine()` y `int.TryParse`, y repite hasta elegir 0. Usa un `switch` statement para las opciones.
4. **Cortocircuito**: escribe dos métodos que impriman algo y devuelvan `bool`. Combínalos con `&&`, `&`, `||`, `|` y anota cuáles se ejecutan en cada caso.
5. **Rompe un `foreach`**: provoca a propósito la `InvalidOperationException` eliminando pares de una lista. Luego arréglalo de las tres formas vistas.
6. **Enumerador propio**: crea una clase `Cuenta` con un método `GetEnumerator()` que devuelva un struct con `MoveNext()`/`Current` que cuente de 1 a N, **sin** implementar ninguna interfaz, y úsala en un `foreach`.
7. **Bits**: implementa `EsPotenciaDe2`, `ContarBits` (sin `PopCount`, con un bucle `while` y `n &= n - 1`) y prueba con varios valores.
8. (Opcional) Busca el número primo más grande menor a 10.000 usando `for`, `continue` y `break`.

---

➡️ **Cuando termines**, marca la Sesión 3 en el [README](Readme.md) y pídeme la **Sesión 4 — Métodos (parámetros, ref/out/in/params, sobrecarga, funciones locales)**.
