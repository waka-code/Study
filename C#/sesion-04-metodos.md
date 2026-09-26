# Sesión 4 — Métodos: parámetros, ref/out/in/params, sobrecarga y funciones locales

> **Objetivo de la sesión**: entender a fondo cómo se definen y se invocan métodos en C#: la anatomía de una firma, **cómo se pasan realmente los argumentos** (por valor vs `ref`/`out`/`in`), parámetros opcionales, nombrados y `params`, cómo el compilador elige una sobrecarga, y las funciones locales, expression-bodied members, métodos de extensión y recursión. Al terminar deberías poder explicar con precisión la diferencia entre "pasar un reference type" y "pasar por referencia", que es una de las preguntas trampa más frecuentes.

---

## 1. Anatomía de un método

Un **método** es un bloque de código con nombre que pertenece a un tipo (clase, struct, record, interfaz). En C# no existen funciones "sueltas" (las top-level statements y funciones locales son azúcar que el compilador mete dentro de una clase).

```csharp
public class Calculadora
{
//  ┌─ modificador de acceso (Sesión 5)
//  │      ┌─ static: pertenece al TIPO, no a una instancia
//  │      │      ┌─ tipo de retorno (void = no devuelve nada)
//  │      │      │     ┌─ nombre (PascalCase)
//  │      │      │     │        ┌─ lista de parámetros
    public static int Sumar(int a, int b)
    {
        return a + b;             // cuerpo
    }

    public void Imprimir(string mensaje)   // método de INSTANCIA, void
    {
        Console.WriteLine(mensaje);
    }
}

int r = Calculadora.Sumar(2, 3);          // static → se llama sobre el tipo
var calc = new Calculadora();
calc.Imprimir($"Resultado: {r}");         // instancia → se llama sobre un objeto
```

### 1.1 Firma (signature)

La **firma** de un método, a efectos de sobrecarga, es: **nombre + número, tipos, orden y modificadores (`ref`/`out`/`in`) de los parámetros**.

> ⚠️ El **tipo de retorno NO forma parte de la firma** para la sobrecarga. Dos métodos `int F()` y `string F()` en el mismo tipo **no compilan** (CS0111).

### 1.2 Parámetros vs argumentos

- **Parámetro**: la variable declarada en la definición (`int a`).
- **Argumento**: el valor concreto que pasas al llamar (`Sumar(2, 3)` → `2` y `3`).

> ⚠️ **Para probar los ejemplos**: en un `Program.cs` con top-level statements, las declaraciones de tipos (`class`, `struct`, `record`, `static class`) deben ir **al final** del archivo, después de las sentencias (o en otro archivo `.cs`). Si copias un snippet donde la clase aparece primero, muévela abajo.

### 1.3 `static` vs instancia

| | Método `static` | Método de instancia |
|---|---|---|
| Pertenece a | El tipo | Un objeto concreto |
| Acceso a `this` / campos de instancia | ❌ No | ✅ Sí |
| Cómo se invoca | `Tipo.Metodo()` | `objeto.Metodo()` |
| Uso típico | Utilidades puras, factories (`int.Parse`, `Math.Max`) | Comportamiento que depende del estado del objeto |

---

## 2. Expression-bodied members

Si el cuerpo es **una sola expresión**, puedes usar `=>`:

```csharp
public class Circulo
{
    public double Radio { get; init; }

    public double Area() => Math.PI * Radio * Radio;           // método
    public double Perimetro => 2 * Math.PI * Radio;            // propiedad de solo lectura (Sesión 6)
    public override string ToString() => $"Círculo(r={Radio})";
    public void Log() => Console.WriteLine(this);              // también con void
}
```

Es exactamente el mismo IL que con llaves y `return`; es solo sintaxis más concisa.

---

## 3. Paso de parámetros: el tema central

### 3.1 Todo se pasa por valor… por defecto

En C#, **por defecto todos los argumentos se pasan por valor**: el método recibe una **copia** de lo que había en la variable del llamador.

- Si es un **value type** (Sesión 2) → se copia el dato.
- Si es un **reference type** → se copia **la referencia** (la "dirección"), no el objeto.

```csharp
class Caja { public int Valor; }

void Modificar(int n, Caja c)
{
    n = 100;               // modifica la COPIA local → el llamador no lo ve
    c.Valor = 100;         // modifica el OBJETO al que apunta la copia de la referencia → SÍ se ve
    c = new Caja { Valor = -1 };  // reasigna la copia local → el llamador NO lo ve
}

int numero = 1;
var caja = new Caja { Valor = 1 };
Modificar(numero, caja);
Console.WriteLine(numero);     // 1
Console.WriteLine(caja.Valor); // 100  (no -1)
```

```
 LLAMADOR                       MÉTODO Modificar
 numero = 1                     n = 1 → 100      (copia, independiente)
 caja  = 0xA0 ─────┐            c = 0xA0 ─┐       (copia de la referencia)
                   ▼                      │
              HEAP ┌──────────────┐ ◀────┘  c.Valor = 100 → afecta al objeto compartido
                   │ Caja Valor=100│
                   └──────────────┘
                                   c = 0xB0 → nuevo objeto, solo lo ve el método
```

### 3.2 `ref`: pasar la **variable** por referencia

Con `ref`, el método recibe un **alias** a la variable del llamador: leer o escribir el parámetro es leer o escribir la variable original.

```csharp
void Duplicar(ref int n) => n *= 2;
void Reemplazar(ref Caja c) => c = new Caja { Valor = -1 };

int x = 5;
Duplicar(ref x);                // ref obligatorio también en la llamada (explicitud)
Console.WriteLine(x);           // 10

var caja2 = new Caja { Valor = 1 };
Reemplazar(ref caja2);
Console.WriteLine(caja2.Valor); // -1 → ahora sí: se reasignó la variable del llamador

// ⚠️ La variable debe estar INICIALIZADA antes de pasarla con ref
int y;
// Duplicar(ref y);             // ❌ CS0165
```

Ejemplo clásico — `Swap` (imposible sin `ref`):

```csharp
void Swap<T>(ref T a, ref T b) => (a, b) = (b, a);   // swap con tuplas

int p = 1, q = 2;
Swap(ref p, ref q);
Console.WriteLine($"{p}, {q}");   // 2, 1
```

### 3.3 `out`: parámetro de salida

`out` también pasa por referencia, pero con reglas distintas: **el llamador no necesita inicializar** la variable y **el método está obligado a asignarla** antes de retornar.

```csharp
bool TryDividir(int a, int b, out int resultado)
{
    if (b == 0)
    {
        resultado = 0;          // ⚠️ obligatorio asignar en TODOS los caminos
        return false;
    }
    resultado = a / b;
    return true;
}

// Declaración inline de la variable out (C# 7)
if (TryDividir(10, 2, out int res))
    Console.WriteLine(res);     // 5

// Discard: no me interesa el valor
bool esNumero = int.TryParse("123", out _);

// El patrón Try-Parse del BCL
if (int.TryParse("42", out var n)) Console.WriteLine(n + 1);
if (DateTime.TryParse("2026-09-25", out var fecha)) Console.WriteLine(fecha.DayOfWeek);

var dic = new Dictionary<string, int> { ["a"] = 1 };
if (dic.TryGetValue("a", out var v)) Console.WriteLine(v);
```

> ❓ **Entrevista**: *"¿Por qué existe el patrón `TryParse` con `out` en vez de lanzar excepción?"* → Porque en entradas que *esperablemente* pueden ser inválidas (input de usuario), fallar no es excepcional. Las excepciones son costosas (captura de stack trace) y no deben usarse para control de flujo (Sesión 12). `Try*` devuelve `bool` y el valor por `out`, sin costo de excepción.

### 3.4 `in`: referencia de solo lectura

`in` pasa por referencia **pero el método no puede modificarla**. Su objetivo es **rendimiento**: evitar copiar structs grandes.

```csharp
public readonly struct Matriz4x4       // 16 doubles = 128 bytes: copiarlo es caro
{
    public readonly double M11, M12, /* ... */ M44;
    public Matriz4x4(double m11, double m44) { M11 = m11; M44 = m44; M12 = 0; }
}

double Traza(in Matriz4x4 m)            // pasa un puntero de 8 bytes, no 128
{
    // m = default;                     // ❌ no compila: in es readonly
    return m.M11 + m.M44;
}

var mat = new Matriz4x4(1, 2);
Console.WriteLine(Traza(in mat));       // 'in' en la llamada es opcional
Console.WriteLine(Traza(mat));
```

> ⚠️ **Defensive copies**: si pasas con `in` un struct **no** `readonly` y llamas a un método suyo, el compilador no puede garantizar que ese método no mute el struct, así que **hace una copia defensiva** en cada llamada… anulando el beneficio. Regla: usa `in` solo con **`readonly struct`**. Para tipos pequeños (`int`, `double`) `in` no aporta nada — copiar 8 bytes es igual que pasar un puntero.

### 3.5 `ref readonly` (C# 12)

Variante de `in` para APIs donde quieres que el llamador **deba** pasar una variable (no un valor temporal), con la misma garantía de solo lectura. Se usa sobre todo en APIs de bajo nivel (Sesión 19).

```csharp
double Norma(ref readonly Matriz4x4 m) => Math.Sqrt(m.M11 * m.M11);
Console.WriteLine(Norma(ref mat));   // warning si pasas sin ref/in
```

### 3.6 Tabla comparativa (memorízala)

| Modificador | Dirección | ¿Llamador debe inicializar? | ¿Método debe asignar? | ¿Método puede modificar? | Keyword en llamada | Uso típico |
|---|---|---|---|---|---|---|
| *(ninguno)* | entrada | Sí | No | Solo su copia | — | 99% de los casos |
| `ref` | entrada/salida | **Sí** | No | **Sí** (afecta al llamador) | `ref` obligatorio | Swap, modificar in-place |
| `out` | salida | **No** | **Sí** | Sí | `out` obligatorio | `TryXxx`, varios retornos |
| `in` | entrada | Sí | No | **No** | opcional | Structs grandes readonly |
| `ref readonly` | entrada | Sí (variable) | No | **No** | `ref`/`in` | APIs de bajo nivel |

Restricciones importantes:
- **No** se pueden usar `ref`/`out`/`in` en métodos **`async`** ni en **iteradores** (`yield`), porque sus variables viven en una state machine en el heap y una referencia a un stack frame no sobreviviría (Sesión 13).
- **No** se puede capturar un parámetro `ref`/`out`/`in` dentro de una **lambda** (Sesión 10).
- Las **propiedades** no se pueden pasar por `ref` (no son variables, son métodos get/set).

> ❓ **Entrevista (LA pregunta)**: *"¿Diferencia entre pasar un reference type por valor y pasarlo con `ref`?"* → Por valor, el método recibe una copia de la referencia: puede **mutar el objeto**, pero si **reasigna** el parámetro el llamador no lo ve. Con `ref`, recibe un alias a la **variable** del llamador: puede incluso reasignarla a otro objeto (o a `null`) y el llamador lo ve.

> ❓ **Entrevista**: *"¿`ref` vs `out`?"* → Ambos pasan por referencia. `ref` exige que la variable llegue inicializada y no obliga al método a asignarla (es bidireccional). `out` no exige inicialización pero obliga al método a asignarla antes de retornar (es solo salida). A nivel IL son lo mismo (un managed pointer `&`); la diferencia la impone el compilador. Por eso **no puedes sobrecargar** solo por `ref` vs `out`.

### 3.7 Alternativas modernas a `out`: tuplas y records

Para devolver varios valores, en código de aplicación suele ser más legible devolver una tupla o un record:

```csharp
// Con out (estilo BCL)
void MinMax(int[] datos, out int min, out int max) { min = datos.Min(); max = datos.Max(); }

// Con tupla nombrada (estilo moderno, más componible)
(int Min, int Max) MinMaxT(int[] datos) => (datos.Min(), datos.Max());

var (mn, mx) = MinMaxT(new[] { 3, 1, 4, 1, 5 });
Console.WriteLine($"{mn}..{mx}");   // 1..5

// Con record (Sesión 17), cuando el resultado tiene "entidad" propia
record Estadisticas(int Min, int Max, double Promedio);
```

---

## 4. `ref` returns y `ref` locals (nivel avanzado)

Un método también puede **devolver una referencia** a una variable (no una copia), para modificar datos in-place sin copiar. Es la base de `Span<T>` (Sesión 19).

```csharp
int[] numeros = { 10, 20, 30 };

ref int BuscarRef(int[] arr, int valor)
{
    for (int i = 0; i < arr.Length; i++)
        if (arr[i] == valor) return ref arr[i];   // referencia al elemento del array
    throw new InvalidOperationException("No encontrado");
}

ref int elemento = ref BuscarRef(numeros, 20);    // ref local: alias del slot
elemento = 99;
Console.WriteLine(string.Join(",", numeros));      // 10,99,30

// ⚠️ No puedes devolver ref a una variable LOCAL: su frame muere al retornar
// ref int Malo() { int x = 5; return ref x; }    // ❌ CS8168
```

---

## 5. Parámetros opcionales y argumentos nombrados

### 5.1 Parámetros opcionales

```csharp
void Conectar(string host, int puerto = 443, bool usarTls = true, int timeoutMs = 30_000)
{
    Console.WriteLine($"{host}:{puerto} tls={usarTls} timeout={timeoutMs}");
}

Conectar("api.ejemplo.cl");                    // api.ejemplo.cl:443 tls=True timeout=30000
Conectar("localhost", 8080, false);
```

Reglas:
- Los opcionales van **después** de los obligatorios.
- El valor por defecto debe ser una **constante de compilación**: literal, `const`, `default`, `null`, o `new ValueType()`. No puedes poner `DateTime.Now` ni `new List<int>()`.

```csharp
// void F(List<int> l = new List<int>()) {}     // ❌ no es constante
void F(List<int>? l = null) { l ??= new List<int>(); }   // ✅ patrón típico
```

> ⚠️ **Trampa de versionado (igual que `const`, Sesión 2)**: el valor por defecto se **copia en el sitio de llamada** al compilar. Si una librería cambia `puerto = 443` a `puerto = 8443` y el consumidor no recompila, sigue pasando `443`. En APIs públicas, prefiere **sobrecargas** a opcionales cuando el default pueda cambiar.

### 5.2 Argumentos nombrados

```csharp
Conectar("api.ejemplo.cl", timeoutMs: 5_000);            // saltar opcionales intermedios
Conectar(host: "x", usarTls: false, puerto: 80);          // orden libre
Conectar("x", 80, usarTls: false);                        // posicionales primero, luego nombrados

// Mejoran enormemente la legibilidad de booleanos "mágicos":
// EnviarCorreo(usuario, true, false);                    // ¿qué significa?
// EnviarCorreo(usuario, esUrgente: true, conCopia: false); // ✅ autoexplicativo
```

> ⚠️ Los nombres de parámetros pasan a ser **parte de tu API pública**: renombrar un parámetro rompe (en compilación) a quien lo llame por nombre.

---

## 6. `params`: número variable de argumentos

```csharp
int SumarTodos(params int[] numeros)
{
    int total = 0;
    foreach (var n in numeros) total += n;
    return total;
}

Console.WriteLine(SumarTodos());               // 0      → array vacío (no null)
Console.WriteLine(SumarTodos(1, 2, 3));        // 6      → el compilador crea new[] {1,2,3}
Console.WriteLine(SumarTodos(new[] { 4, 5 })); // 9      → también acepta el array directo
```

Reglas:
- Solo **un** `params` por método y debe ser el **último** parámetro.
- Hasta C# 12 debe ser un **array** unidimensional. Cada llamada crea un array nuevo (allocation).
- **C# 13 (.NET 9)** permite *params collections*: `params ReadOnlySpan<int>`, `params List<T>`, `params IEnumerable<T>`, etc. Con `ReadOnlySpan<T>` se evita la allocation en el heap. Lo vemos en la Sesión 32.

```csharp
// Ejemplos del BCL que ya usas:
Console.WriteLine("{0} + {1} = {2}", 1, 2, 3);   // params object?[] → ⚠️ boxing de cada int
string.Join(", ", "a", "b", "c");                 // params string[]
```

---

## 7. Sobrecarga de métodos (overloading)

Varios métodos con el **mismo nombre** y **distinta firma** en el mismo tipo. El compilador elige cuál llamar en **tiempo de compilación** según los argumentos (*overload resolution*).

```csharp
public static class Formateador
{
    public static string Formatear(int n)          => $"int: {n}";
    public static string Formatear(long n)         => $"long: {n}";
    public static string Formatear(double n)       => $"double: {n:F2}";
    public static string Formatear(string s)       => $"string: {s}";
    public static string Formatear(object o)       => $"object: {o}";
    public static string Formatear(int a, int b)   => $"par: {a},{b}";
}

Console.WriteLine(Formateador.Formatear(5));        // int: 5        → coincidencia exacta
Console.WriteLine(Formateador.Formatear(5L));       // long: 5
Console.WriteLine(Formateador.Formatear((short)5)); // int: 5        → short→int es la conversión "mejor"
Console.WriteLine(Formateador.Formatear(5.0f));     // double: 5.00  → float→double
Console.WriteLine(Formateador.Formatear('A'));      // int: 65       😱 char→int implícito gana a object
Console.WriteLine(Formateador.Formatear(DateTime.Now)); // object: ... → solo queda object (boxing)
```

### 7.1 Cómo decide el compilador (simplificado)

```
1. Buscar candidatos: métodos con ese nombre accesibles
2. Filtrar aplicables: los que aceptan esos argumentos (con conversiones implícitas)
3. Elegir el "mejor":
     coincidencia exacta  >  conversión implícita más específica  >  object
     sin params expandido >  con params
     no genérico          >  genérico (si empatan)
4. Si hay empate → error CS0121 "ambiguous call"
```

```csharp
void G(int a, double b) { }
void G(double a, int b) { }
// G(1, 1);   // ❌ CS0121: ambigua — cada una es mejor en un argumento
```

> ⚠️ **Sobrecarga + opcionales = confusión**. Si tienes `F(int a)` y `F(int a, int b = 0)`, `F(1)` llama a la **primera** (se prefiere la que no necesita rellenar opcionales). Evita mezclar ambas técnicas en el mismo método.

> ❓ **Entrevista**: *"¿Overloading vs overriding?"* → **Overloading** (sobrecarga): mismo nombre, distinta firma, en el mismo tipo; se resuelve en **compilación** (polimorfismo estático). **Overriding** (sobrescritura): una clase derivada redefine un método `virtual`/`abstract` de la base con la **misma firma**; se resuelve en **ejecución** según el tipo real del objeto (polimorfismo dinámico, Sesión 5).

---

## 8. Funciones locales

Una **función local** es un método declarado **dentro** de otro método. Solo es visible ahí.

```csharp
int Factorial(int n)
{
    if (n < 0) throw new ArgumentOutOfRangeException(nameof(n));
    return Calcular(n);                      // validación una vez, recursión sin re-validar

    static int Calcular(int k) => k <= 1 ? 1 : k * Calcular(k - 1);   // función local static
}

Console.WriteLine(Factorial(5));   // 120
```

### 8.1 ¿Por qué no usar una lambda?

```csharp
// Lambda: es un delegado (objeto en el heap)
Func<int, int> fibL = null!;
fibL = n => n < 2 ? n : fibL(n - 1) + fibL(n - 2);   // recursión incómoda: hay que pre-declarar

// Función local: es un método real
int Fib(int n) => n < 2 ? n : Fib(n - 1) + Fib(n - 2);  // recursión natural
```

| | Función local | Lambda (Sesión 10) |
|---|---|---|
| Qué es | Un método privado generado | Una instancia de delegado |
| Allocation | Ninguna (si no se convierte a delegado); las capturas van en un struct | Delegado + clase de closure en el heap si captura |
| Recursión | Natural | Requiere declarar la variable antes |
| Genéricos | ✅ `T Id<T>(T x) => x;` | ❌ |
| `ref`/`out`/`params`, atributos | ✅ | Limitado |
| Declarar después de usar | ✅ (se "hoistean") | ❌ |

### 8.2 `static` local functions (C# 8)

Marcarla `static` **prohíbe capturar** variables del método contenedor: garantiza que no hay closures ocultas y hace explícitas las dependencias.

```csharp
int factor = 3;
int Escalar(int x) => x * factor;           // captura 'factor'
// static int EscalarS(int x) => x * factor; // ❌ CS8421: una función local static no puede capturar
static int EscalarS(int x, int f) => x * f; // ✅ dependencia explícita
```

### 8.3 Uso idiomático: validación temprana en iteradores y async

```csharp
IEnumerable<int> Rango(int desde, int hasta)
{
    // Sin la función local, esta validación NO se ejecutaría hasta el primer MoveNext() (ejecución diferida)
    if (hasta < desde) throw new ArgumentException("hasta < desde");
    return Iterar();

    IEnumerable<int> Iterar()
    {
        for (int i = desde; i <= hasta; i++) yield return i;
    }
}
```

> ❓ **Entrevista**: *"¿Por qué usarías una función local en vez de un método privado?"* → Para encapsular un helper que solo tiene sentido dentro de un método (no ensucia la clase), para la validación *eager* en iteradores/async, y porque pueden capturar variables sin el costo de allocation de una lambda. Con `static` además garantizas que no hay capturas.

---

## 9. Métodos de extensión

Permiten "añadir" métodos a un tipo existente **sin modificarlo ni heredar**. Es azúcar sintáctico: por debajo es un método estático normal. LINQ entero (Sesión 9) está construido así.

```csharp
public static class StringExtensions             // 1. clase static, no genérica, no anidada
{
    public static bool EsPalindromo(this string s)   // 2. método static, 'this' en el primer parámetro
    {
        var limpio = s.Replace(" ", "").ToLowerInvariant();
        for (int i = 0, j = limpio.Length - 1; i < j; i++, j--)
            if (limpio[i] != limpio[j]) return false;
        return true;
    }

    public static string Truncar(this string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";
}

// Uso: como si fuera un método de instancia (requiere el using del namespace)
Console.WriteLine("Anita lava la tina".EsPalindromo());  // True
Console.WriteLine("Hola mundo cruel".Truncar(10));        // "Hola mundo…"

// El compilador lo traduce a:
Console.WriteLine(StringExtensions.EsPalindromo("oso"));
```

> ⚠️ Un método de extensión **nunca** gana a un método de instancia con la misma firma: si el tipo ya tiene `Truncar(int)`, el tuyo se ignora silenciosamente. Además, solo acceden a miembros **públicos** del tipo (no rompen encapsulación). Y como es estático, se puede llamar sobre `null` sin lanzar `NullReferenceException` en el sitio de llamada.

---

## 10. Recursión y el stack

Cada llamada a un método crea un **stack frame** (Sesión 2) con sus parámetros y locales. En la recursión, los frames se apilan hasta llegar al caso base.

```csharp
int SumaRec(int n) => n == 0 ? 0 : n + SumaRec(n - 1);

//  SumaRec(3)
//  ┌─────────────────┐
//  │ SumaRec(0) → 0  │  ← caso base, empieza a desapilar
//  │ SumaRec(1) → 1  │
//  │ SumaRec(2) → 3  │
//  │ SumaRec(3) → 6  │
//  │ Main            │
//  └─────────────────┘

// SumaRec(100_000);   // 💥 StackOverflowException → ¡NO se puede capturar con try/catch! El proceso muere.
```

> ⚠️ `StackOverflowException` **mata el proceso** y no es capturable en .NET moderno. El JIT de .NET **no garantiza** la eliminación de *tail calls* en C# (a diferencia de F#). Para profundidades grandes (recorrer árboles profundos, grafos), convierte la recursión en **iteración con una `Stack<T>` explícita** (Sesión 7).

```csharp
// Versión iterativa: sin límite de profundidad del stack del hilo
long SumaIter(int n) { long t = 0; for (int i = 1; i <= n; i++) t += i; return t; }
```

---

## 11. Buenas prácticas de diseño de métodos

| Práctica | Por qué |
|---|---|
| **Una responsabilidad** por método | Más fácil de testear, nombrar y reutilizar |
| Nombres con **verbo** (`CalcularTotal`, `EnviarCorreo`) | Un método *hace* algo |
| **Pocos parámetros** (≤ 3–4) | Si son más, agrúpalos en un objeto/record de parámetros |
| Evita **booleanos de control** (`Guardar(true)`) | Mejor dos métodos o argumento nombrado/enum |
| **Valida argumentos** al inicio | Falla rápido con un mensaje claro |
| Prefiere **retornar** a mutar parámetros | Menos efectos colaterales; `ref`/`out` solo cuando aporten |

```csharp
// Validación moderna de argumentos (.NET 6+/7+/8+): helpers estáticos del BCL
void Registrar(string email, int edad, object config)
{
    ArgumentException.ThrowIfNullOrWhiteSpace(email);   // .NET 8
    ArgumentOutOfRangeException.ThrowIfNegative(edad);   // .NET 8
    ArgumentNullException.ThrowIfNull(config);           // .NET 6
    // Usan [CallerArgumentExpression] para poner el nombre del parámetro automáticamente (Sesión 20)
}
```

---

## Resumen mental de la sesión

```
Firma = nombre + parámetros (tipos, orden, ref/out/in)   ← el retorno NO cuenta
static → del tipo · instancia → del objeto (tiene this)

TODO se pasa POR VALOR por defecto
  value type     → copia del dato
  reference type → copia de la REFERENCIA (mutas el objeto, no reasignas la variable)
ref  → alias a la variable (entrada/salida, debe venir inicializada)
out  → solo salida (el método DEBE asignar) → patrón TryParse
in   → ref de solo lectura, para readonly struct grandes (ojo copias defensivas)
✗ ref/out/in en async, iteradores y capturas de lambda

Opcionales → constante de compilación, se copia en el llamador (versionado)
Nombrados  → legibilidad, orden libre; el nombre es API pública
params     → último parámetro, crea array (C# 13: params Span sin alloc)

Overloading = compilación (estático) · Overriding = runtime (virtual)
Función local → método real, sin alloc, recursión fácil; static = sin capturas
Extensión    → static class + this T → azúcar para un static (base de LINQ)
Recursión profunda → StackOverflow (no capturable) → iterar con Stack<T>
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué forma parte de la firma de un método? ¿Se puede sobrecargar solo por tipo de retorno?
2. ❓ Si paso un objeto (clase) a un método sin `ref` y el método hace `obj = new X()`, ¿el llamador ve el cambio? ¿Y si hace `obj.Prop = 5`?
3. ❓ ¿Diferencias entre `ref`, `out` e `in`? ¿Por qué no puedes sobrecargar por `ref` vs `out`?
4. ❓ ¿Qué es una copia defensiva y cuándo `in` empeora el rendimiento?
5. ❓ ¿Por qué no se permiten parámetros `ref`/`out` en métodos `async`?
6. ❓ ¿Qué problema de versionado tienen los parámetros opcionales en una librería pública?
7. ❓ ¿Qué restricciones tiene `params`? ¿Qué cambió en C# 13?
8. ❓ ¿Overloading vs overriding? ¿Cuándo se resuelve cada uno?
9. ❓ ¿Por qué `Formatear('A')` elige la sobrecarga `int` y no `object`?
10. ❓ ¿Función local vs lambda? ¿Qué aporta marcarla `static`?
11. ❓ ¿Cómo funciona un método de extensión por debajo? ¿Qué pasa si el tipo ya tiene un método de instancia con la misma firma?
12. ❓ ¿Se puede capturar un `StackOverflowException`? ¿Cómo evitas el problema en recursiones profundas?

## Ejercicio práctico
1. Crea `dotnet new console -o MetodosLab`.
2. **Paso de parámetros**: crea `class Persona { public string Nombre = ""; }` y cuatro métodos: uno que muta `Nombre` sin `ref`, uno que reasigna sin `ref`, uno que reasigna con `ref`, y uno con `out` que crea una persona nueva. Predice el resultado de cada uno **antes** de ejecutar y compara.
3. **Swap genérico**: implementa `Swap<T>(ref T a, ref T b)` y pruébalo con `int` y con `string`.
4. **Try-pattern propio**: implementa `bool TryParseRut(string input, out int numero, out char dv)` que valide un RUT chileno (`"12345678-5"`) incluyendo el dígito verificador (módulo 11). Úsalo con `if (TryParseRut(..., out var n, out var dv))`.
5. **Opcionales + nombrados**: escribe `CrearUsuario(string nombre, string rol = "lector", bool activo = true, int cuotaMb = 100)` y llámalo de 4 formas distintas usando argumentos nombrados.
6. **params**: implementa `double Promedio(params double[] valores)` que lance `ArgumentException` si viene vacío (usa las validaciones del §11).
7. **Resolución de sobrecarga**: copia la clase `Formateador` del §7, añade una sobrecarga `Formatear(char c)` y observa cómo cambia la llamada con `'A'`. Luego provoca un error CS0121 a propósito.
8. **Función local + iterador**: implementa `Rango(desde, hasta)` del §8.3 dos veces: una con la validación dentro del iterador y otra con función local. Llama `Rango(10, 1)` **sin** recorrerlo y observa cuál lanza la excepción inmediatamente.
9. **Extensión**: crea `static class IntExtensions` con `bool EsPrimo(this int n)` y `IEnumerable<int> Hasta(this int desde, int hasta)`, y úsalo: `foreach (var p in 1.Hasta(50)) if (p.EsPrimo()) ...`.
10. (Opcional) Provoca un `StackOverflowException` con recursión infinita y observa que el `try/catch` no lo atrapa. Luego reescribe una suma recursiva de forma iterativa.

---

➡️ **Cuando termines**, marca la Sesión 4 en el [README](Readme.md) y pídeme la **Sesión 5 — Programación Orientada a Objetos (POO)**.
