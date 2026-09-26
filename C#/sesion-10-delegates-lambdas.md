# Sesión 10 — Delegates, Func/Action/Predicate, lambdas y closures: funciones como valores

> **Objetivo de la sesión**: entender qué es *realmente* un delegate (un objeto que apunta a un método, con su `Target` y su `Method`), cómo los delegates genéricos `Func`/`Action`/`Predicate` reemplazaron a los delegates a medida, cómo el compilador transforma una lambda en una clase oculta cuando **captura variables** (closures), y qué trampas de rendimiento y de corrección esconden. Al terminar deberías poder explicar qué genera el compilador para `x => x + n`, por qué un `for` con lambdas imprimía "3, 3, 3", qué es un *multicast delegate* y cuándo usar `static` lambdas.

---

## 1. ¿Qué problema resuelven los delegates?

Muchas veces quieres que **alguien más decida parte del comportamiento** de tu código: el criterio de un filtro, qué hacer cuando termina una descarga, cómo comparar dos elementos al ordenar. Necesitas pasar **código como parámetro**.

En C (punteros a función) eso es inseguro: el puntero puede apuntar a cualquier cosa. En Java antiguo se resolvía con interfaces de un solo método y clases anónimas (mucho ruido). C# introdujo desde la v1.0 el **delegate**: un **puntero a método con tipo seguro** (*type-safe function pointer*), que además es un **objeto** del CLR.

```csharp
// 1) DECLARAR el tipo delegate: define una FIRMA (parámetros + retorno)
public delegate int Operacion(int a, int b);

// 2) Métodos compatibles con esa firma
static int Sumar(int a, int b) => a + b;
static int Multiplicar(int a, int b) => a * b;

// 3) INSTANCIAR y usar
Operacion op = Sumar;               // conversión de grupo de métodos (method group)
Console.WriteLine(op(3, 4));        // 7  → equivalente a op.Invoke(3, 4)

op = Multiplicar;
Console.WriteLine(op(3, 4));        // 12

// 4) Pasarlo como parámetro: comportamiento inyectable
static int Aplicar(int x, int y, Operacion f) => f(x, y);
Console.WriteLine(Aplicar(10, 5, Sumar));   // 15
```

> ❓ **Entrevista**: *"¿Qué es un delegate?"* → Un **tipo** que representa referencias a métodos con una firma concreta. Sus instancias son objetos (heredan de `System.MulticastDelegate`) que encapsulan un método y, si es de instancia, el objeto sobre el que se invoca. Es *type-safe*: el compilador verifica que la firma coincida.

---

## 2. ¿Qué es un delegate por dentro?

Cuando escribes `public delegate int Operacion(int a, int b);`, el compilador genera una **clase sellada**:

```csharp
// Lo que el compilador genera (simplificado)
public sealed class Operacion : System.MulticastDelegate
{
    public Operacion(object target, IntPtr method);           // ctor
    public virtual int Invoke(int a, int b);                   // llamada síncrona
    public virtual IAsyncResult BeginInvoke(...);              // legado (no soportado en .NET Core+)
    public virtual int EndInvoke(IAsyncResult result);
}
```

Toda instancia de delegate guarda dos cosas:

```
        instancia de delegate (objeto en el HEAP)
        ┌───────────────────────────────┐
        │ _target  → objeto (o null)    │──▶ instancia de Calculadora (si método de instancia)
        │ _methodPtr → código del método│──▶ Calculadora.Sumar
        │ _invocationList → (multicast) │
        └───────────────────────────────┘
```

```csharp
class Calculadora
{
    public int Base { get; init; } = 100;
    public int SumarBase(int a, int b) => Base + a + b;   // método de INSTANCIA
}

var calc = new Calculadora();
Operacion op = calc.SumarBase;

Console.WriteLine(op.Target == calc);       // True  → el delegate MANTIENE VIVO a 'calc'
Console.WriteLine(op.Method.Name);          // SumarBase

Operacion op2 = Sumar;                      // método estático
Console.WriteLine(op2.Target is null);      // True
```

> ⚠️ **Consecuencia de memoria**: un delegate a un método de instancia guarda una **referencia fuerte** al objeto (`Target`). Mientras el delegate viva, el objeto no puede ser recolectado por el GC. Es la raíz del famoso *memory leak por eventos* que veremos en la **Sesión 11** y en la **Sesión 14**.

### 2.1 Los delegates son inmutables
Como `string`, un delegate **no cambia**: `+=` crea un delegate **nuevo**. Esto los hace seguros de leer desde varios hilos (copias la referencia y listo), detalle clave para los eventos.

---

## 3. Delegates genéricos predefinidos: `Func`, `Action`, `Predicate`

Declarar un tipo delegate para cada firma es tedioso. Desde .NET 3.5 la BCL trae delegates **genéricos** que cubren casi todos los casos:

| Delegate | Firma | Uso |
|---|---|---|
| `Action` | `void ()` | Hacer algo sin parámetros ni retorno |
| `Action<T1..T16>` | `void (T1, …)` | Hacer algo con hasta 16 parámetros |
| `Func<TResult>` | `TResult ()` | Producir un valor |
| `Func<T1..T16, TResult>` | `TResult (T1, …)` | Calcular un valor — **el último tipo es SIEMPRE el retorno** |
| `Predicate<T>` | `bool (T)` | Condición (legado: `List<T>.FindAll`, `RemoveAll`, `Array.Find`) |
| `Comparison<T>` | `int (T, T)` | Comparar (`List<T>.Sort`) |
| `EventHandler<TEventArgs>` | `void (object?, TEventArgs)` | Eventos (Sesión 11) |

```csharp
Action saludar = () => Console.WriteLine("Hola");
Action<string, int> repetir = (txt, n) => { for (int i = 0; i < n; i++) Console.Write(txt); };
Func<int> dado = () => Random.Shared.Next(1, 7);
Func<int, int, int> sumar = (a, b) => a + b;              // (int, int) → int
Func<string, bool> esLargo = s => s.Length > 5;
Predicate<string> esLargoP = s => s.Length > 5;

var nombres = new List<string> { "Ana", "Maximiliano", "Luis" };
nombres.RemoveAll(esLargoP);           // List usa Predicate<T>
var largos = nombres.Where(esLargo);   // LINQ usa Func<T,bool> (Sesión 9)
```

> ⚠️ **Los delegates no son compatibles entre sí aunque tengan la misma firma.** `Predicate<string>` y `Func<string,bool>` son **tipos distintos**:
> ```csharp
> Func<string, bool> f = s => s.Length > 5;
> // Predicate<string> p = f;              ❌ CS0029: no se puede convertir
> Predicate<string> p = new(f);            // ✅ envolviendo
> Predicate<string> p2 = f.Invoke;         // ✅ method group de Invoke
> ```
> Esto se llama *tipado nominal* (por nombre), no estructural. Es una de las razones por las que hoy se prefieren `Func`/`Action` en APIs nuevas.

### 3.1 ¿Cuándo declarar un delegate propio?
- Necesitas parámetros `ref`, `out`, `in` o `params` (Func/Action no los soportan):
  ```csharp
  public delegate bool TryParser<T>(string input, out T result);
  TryParser<int> parser = int.TryParse;
  ```
- Quieres un **nombre con significado de dominio** en una API pública (`delegate decimal CalculoDescuento(Pedido p)` documenta mejor que `Func<Pedido, decimal>`).
- Necesitas un parámetro `ref struct` como `Span<T>` en versiones antiguas (desde C# 13 existe `allows ref struct`, Sesión 19/32).

---

## 4. De métodos anónimos a lambdas (evolución)

```csharp
// C# 1.0: método con nombre
Func<int, int> f1 = Doblar;
static int Doblar(int x) => x * 2;

// C# 2.0: método anónimo
Func<int, int> f2 = delegate (int x) { return x * 2; };

// C# 3.0: expresión lambda
Func<int, int> f3 = x => x * 2;               // expression lambda (un solo cuerpo-expresión)
Func<int, int> f4 = x => { return x * 2; };   // statement lambda (bloque)

// C# 10: tipo natural, atributos y retorno explícito
var f5 = (int x) => x * 2;                    // inferido como Func<int,int>
var parse = int (string s) => int.Parse(s);   // tipo de retorno explícito
var conAtributo = [Obsolete] (int x) => x;

// C# 12: parámetros opcionales y params en lambdas
var incrementar = (int x, int paso = 1) => x + paso;
Console.WriteLine(incrementar(5));      // 6
Console.WriteLine(incrementar(5, 10));  // 15

// C# 9: descartes y lambdas static
Func<int, int, int> primero = (a, _) => a;
Func<int, int> sinCaptura = static x => x * 2;   // ver sección 7
```

> 💡 **Tipo natural (C# 10)**: `var f = (int x) => x * 2;` funciona porque el compilador elige `Func<int,int>`. Si la firma tiene `ref`/`out` o más de 16 parámetros, sintetiza un delegate anónimo interno. Antes de C# 10 era error: *"Cannot assign lambda expression to an implicitly-typed variable"*.

### 4.1 Una lambda puede convertirse en dos cosas distintas
```csharp
Func<int, bool>             asDelegate = x => x > 5;   // → IL compilado (un método)
Expression<Func<int, bool>> asArbol    = x => x > 5;   // → árbol de expresión (datos)
```
Mismo texto, resultado completamente diferente según el tipo destino. Es exactamente lo que permite a EF Core traducir tus lambdas a SQL (ver `IQueryable`, **Sesión 9**, sección 9).

> ⚠️ Solo **expression lambdas** pueden convertirse a `Expression<>`. Una statement lambda (`x => { return x > 5; }`) da error CS0834.

---

## 5. Closures: lambdas que capturan variables

Una lambda puede usar variables del método donde se define. Eso es una **closure** (clausura): la función "encierra" su entorno.

```csharp
static Func<int, int> CrearMultiplicador(int factor)
{
    return x => x * factor;      // 'factor' es una variable CAPTURADA
}

var triple = CrearMultiplicador(3);
Console.WriteLine(triple(10));   // 30 — ¡'factor' sigue vivo aunque el método ya retornó!
```

¿Cómo sobrevive `factor` si era un parámetro en la **pila** y el método ya terminó? Porque el compilador **no lo deja en la pila**.

### 5.1 Qué genera el compilador (display class)

```csharp
// Lo que escribes
static Func<int, int> CrearMultiplicador(int factor) => x => x * factor;

// Lo que genera Roslyn (simplificado, nombres reales como <>c__DisplayClass0_0)
[CompilerGenerated]
private sealed class DisplayClass
{
    public int factor;                              // la variable capturada es un CAMPO
    internal int Lambda(int x) => x * factor;       // la lambda es un MÉTODO de la clase
}

static Func<int, int> CrearMultiplicador(int factor)
{
    var dc = new DisplayClass();                    // ← asignación en el HEAP
    dc.factor = factor;
    return new Func<int, int>(dc.Lambda);           // ← otra asignación (el delegate)
}
```

```
   Pila (stack)                         Heap
   ┌─────────────┐                      ┌──────────────────────┐
   │ triple  ────┼────────────────────▶ │ Func<int,int>        │
   └─────────────┘                      │  Target ─────────────┼──┐
                                        │  Method = Lambda     │  │
                                        └──────────────────────┘  │
                                        ┌──────────────────────┐  │
                                        │ DisplayClass         │◀─┘
                                        │  factor = 3          │
                                        └──────────────────────┘
```

Consecuencias clave:
1. **Se captura la VARIABLE, no su valor.** La lambda y el método comparten el mismo campo.
2. La variable vive **tanto como el delegate** (extiende su lifetime → posibles leaks).
3. Hay **asignaciones en heap** (display class + delegate) → presión sobre el GC.

```csharp
int contador = 0;
Action incrementar = () => contador++;      // captura 'contador'

incrementar();
incrementar();
Console.WriteLine(contador);                // 2 — el método VE el cambio hecho por la lambda

contador = 100;
incrementar();
Console.WriteLine(contador);                // 101 — la lambda VE el cambio hecho por el método
```

> ❓ **Entrevista**: *"¿Qué es una closure y cómo la implementa C#?"* → Una función que captura variables de su ámbito léxico. El compilador *eleva* (hoisting) las variables capturadas a campos de una clase generada (display class); la lambda se convierte en un método de instancia de esa clase y el delegate apunta a esa instancia. Por eso se captura la variable (por referencia), no una copia del valor.

### 5.2 Un scope = una display class
Todas las lambdas que capturan variables del **mismo ámbito** comparten **una** display class:

```csharp
int a = 1;
Func<int> leer = () => a;
Action escribir = () => a = 42;
escribir();
Console.WriteLine(leer());    // 42 — comparten el mismo campo 'a'
```

> ⚠️ **Captura accidental prolongada**: si una lambda de vida corta y otra de vida larga capturan variables del mismo scope, la de vida larga mantiene vivas **todas** las variables de esa display class (incluido, p. ej., un array enorme que solo usaba la otra). Sutil fuente de leaks.

---

## 6. La trampa clásica: capturar la variable del bucle

```csharp
var acciones = new List<Action>();

for (int i = 0; i < 3; i++)
    acciones.Add(() => Console.Write(i + " "));

foreach (var a in acciones) a();
// Salida: 3 3 3   ← ¡no 0 1 2!
```

**¿Por qué?** En un `for`, `i` es **una sola variable** declarada fuera del cuerpo. Las tres lambdas capturan **la misma** `i`, y cuando se ejecutan el bucle ya terminó con `i == 3`.

```
for (int i = 0; ...)   ← UNA variable i para todo el bucle
   lambda 0 ─┐
   lambda 1 ─┼──▶ misma display class { i = 3 }
   lambda 2 ─┘
```

```csharp
// ✅ Solución: copia local DENTRO del cuerpo (una variable nueva por iteración)
for (int i = 0; i < 3; i++)
{
    int copia = i;
    acciones.Add(() => Console.Write(copia + " "));   // 0 1 2
}
```

**¿Y `foreach`?** Hasta C# 4, `foreach` tenía el **mismo bug**. C# 5 (2012) hizo un *breaking change* deliberado: la variable de iteración de `foreach` es **nueva en cada vuelta**.

| Bucle | ¿Nueva variable por iteración? | Captura en lambda |
|---|---|---|
| `for (int i…)` | ❌ No (una sola `i`) | Todas ven el valor final |
| `foreach (var x in …)` (C# 5+) | ✅ Sí | Cada lambda ve su propio valor |
| `while` con variable externa | ❌ No | Todas ven el valor final |

> ⚠️ Este bug reaparece con **tareas**: `for (int i…) tasks.Add(Task.Run(() => Procesar(i)));` → los `Task` leen `i` cuando se ejecutan, probablemente con valores repetidos o fuera de rango. (Async/await: Sesión 13.)

> ❓ **Entrevista**: *"¿Qué imprime este código?"* (el `for` con lambdas) → `3 3 3`. Explica que se captura la variable, no el valor, que el `for` tiene una sola variable y cómo lo arreglas. Bonus: menciona el cambio de `foreach` en C# 5.

---

## 7. Rendimiento: coste de lambdas y `static` lambdas

No todas las lambdas cuestan lo mismo. El compilador optimiza según lo que capturan:

| La lambda captura... | Qué genera | Asignaciones por creación |
|---|---|---|
| **Nada** | Método en una clase singleton `<>c`; el delegate se **cachea** en un campo estático | **0** tras la primera vez |
| Solo `this` | Método de instancia en tu propia clase | 1 (el delegate) |
| Variables locales/parámetros | Display class + delegate | 2 (y la display class se crea al **entrar al scope**, aunque la lambda no llegue a crearse) |

```csharp
// Sin captura → cacheada, cero alocaciones en llamadas repetidas
var pares = numeros.Where(n => n % 2 == 0);

// Con captura → 2 alocaciones cada vez que se ejecuta esta línea
int divisor = 2;
var multiplos = numeros.Where(n => n % divisor == 0);
```

### 7.1 `static` lambdas (C# 9): garantía del compilador
```csharp
int umbral = 10;
// Func<int, bool> f = static x => x > umbral;   ❌ CS8820: una lambda static no puede capturar 'umbral'
Func<int, bool> g = static x => x > 10;          // ✅ garantizado sin captura, sin alocación

const int Limite = 10;
Func<int, bool> h = static x => x > Limite;      // ✅ las constantes sí se permiten
```
Útil en código de alto rendimiento y librerías: si alguien añade una captura por accidente, **no compila**.

### 7.2 El patrón "state" para evitar closures
Muchas APIs modernas aceptan un parámetro de estado explícito para que puedas usar una lambda `static`:

```csharp
// Con closure (aloca display class)
string prefijo = "user:";
var cache = new System.Collections.Concurrent.ConcurrentDictionary<int, string>();
cache.GetOrAdd(42, id => prefijo + id);

// Sin closure: pasa el estado como argumento
cache.GetOrAdd(42, static (id, pre) => pre + id, prefijo);   // factoryArgument
```
Lo mismo con `string.Create`, `ThreadPool.QueueUserWorkItem(callback, state, …)` y muchos más. Lo retomamos en la **Sesión 30** (performance).

> ⚠️ **Conversión de method group**: antes de C# 11, `lista.Where(EsPar)` (pasar el nombre del método) creaba un **delegate nuevo en cada llamada**, mientras que `lista.Where(x => EsPar(x))` se cacheaba. Desde C# 11 el compilador también cachea los method groups estáticos. Buen dato para "entrevista de detalle".

---

## 8. Multicast delegates

Un delegate puede apuntar a **varios métodos** a la vez: su *invocation list*. `+=` agrega, `-=` quita.

```csharp
Action<string> log = msg => Console.WriteLine($"[Consola] {msg}");
log += msg => File.AppendAllText("app.log", msg + Environment.NewLine);
log += msg => System.Diagnostics.Debug.WriteLine(msg);

log("Arrancó la app");   // invoca los 3, EN ORDEN de suscripción

Console.WriteLine(log.GetInvocationList().Length);   // 3
```

Reglas que preguntan:

| Situación | Comportamiento |
|---|---|
| Delegate con retorno (`Func<int>`) multicast | Se ejecutan **todos**, pero solo obtienes el retorno del **último** |
| Un suscriptor lanza excepción | Se **corta la cadena**: los siguientes **no** se ejecutan |
| `-=` de una lambda | **No funciona**: cada lambda es una instancia distinta (guárdala en variable) |
| `-=` sobre un delegate que queda vacío | El resultado es **`null`** (no un delegate vacío) |
| Invocar un delegate `null` | `NullReferenceException` → usa `d?.Invoke(...)` |

```csharp
Func<int> f = () => 1;
f += () => 2;
f += () => 3;
Console.WriteLine(f());   // 3 — se perdieron el 1 y el 2

// Obtener TODOS los resultados y aislar excepciones
foreach (Func<int> handler in f.GetInvocationList().Cast<Func<int>>())
{
    try { Console.WriteLine(handler()); }
    catch (Exception ex) { Console.WriteLine($"Handler falló: {ex.Message}"); }
}

// -= con lambdas: guarda la referencia
Action<string> consola = m => Console.WriteLine(m);
log += consola;
log -= consola;                              // ✅ funciona
log -= m => Console.WriteLine(m);            // ❌ no quita nada (otra instancia)
```

> ❓ **Entrevista**: *"¿Qué pasa si un multicast delegate devuelve valor?"* → Todos los métodos se ejecutan en orden, pero la invocación devuelve el valor del último. Si necesitas todos, itera `GetInvocationList()`.

---

## 9. Varianza en delegates

Los delegates genéricos declaran varianza (tema de la **Sesión 8**): `Func<in T, out TResult>`, `Action<in T>`.

```csharp
Func<string> dameString = () => "hola";
Func<object> dameObject = dameString;       // ✅ covarianza en el retorno (out)

Action<object> imprimirObj = o => Console.WriteLine(o);
Action<string> imprimirStr = imprimirObj;   // ✅ contravarianza en el parámetro (in)
```

Además, sin genéricos, la **conversión de method group** ya permite varianza de firma:

```csharp
static string Nombre() => "Ana";
Func<object> f = Nombre;    // ✅ un método que retorna string sirve donde se espera object
```

> ⚠️ La varianza solo aplica a **tipos referencia**. `Func<int>` no es convertible a `Func<object>` (habría boxing).

---

## 10. Funciones de orden superior y patrones reales

Los delegates habilitan estilo **funcional** en C#: funciones que reciben o devuelven funciones.

```csharp
// Composición
static Func<T, TR2> Componer<T, TR1, TR2>(Func<T, TR1> f, Func<TR1, TR2> g) => x => g(f(x));

Func<string, string> limpiar = s => s.Trim();
Func<string, int> largo = s => s.Length;
var largoLimpio = Componer(limpiar, largo);
Console.WriteLine(largoLimpio("  hola  "));   // 4

// Memoización: cachear resultados de una función pura
static Func<T, TR> Memoizar<T, TR>(Func<T, TR> f) where T : notnull
{
    var cache = new Dictionary<T, TR>();           // capturado por la closure
    return x => cache.TryGetValue(x, out var r) ? r : cache[x] = f(x);
}

Func<int, long> lento = n => { Thread.Sleep(500); return (long)n * n; };
var rapido = Memoizar(lento);
rapido(9);   // 500 ms
rapido(9);   // instantáneo

// Estrategia sin jerarquía de clases (alternativa ligera al patrón Strategy)
var descuentos = new Dictionary<string, Func<decimal, decimal>>
{
    ["NINGUNO"]  = p => p,
    ["BLACK"]    = p => p * 0.7m,
    ["VIP"]      = p => Math.Max(0, p - 50),
};
decimal final = descuentos["BLACK"](100m);   // 70

// Retry genérico: recibe la operación como Func
static T Reintentar<T>(Func<T> operacion, int intentos = 3)
{
    for (int i = 1; ; i++)
    {
        try { return operacion(); }
        catch when (i < intentos) { Thread.Sleep(100 * i); }   // exception filter (Sesión 12)
    }
}
```

Dónde verás delegates en el mundo real:

| Lugar | Delegate |
|---|---|
| LINQ (Sesión 9) | `Func<T,bool>`, `Func<T,TKey>` |
| Eventos (Sesión 11) | `EventHandler<T>` |
| Tareas (Sesión 13) | `Task.Run(Func<Task>)`, `ContinueWith(Action<Task>)` |
| Minimal APIs (Sesión 23) | `app.MapGet("/", () => "Hola")` — ¡la lambda ES el endpoint! |
| DI (Sesión 24) | `services.AddSingleton<IFoo>(sp => new Foo(...))` — factories |
| Middleware (Sesión 23) | `RequestDelegate` = `Task (HttpContext)` |

> ❓ **Entrevista**: *"¿Delegate o interfaz?"* → Delegate cuando el contrato es **una sola operación** y quieres pasarla ligera (callbacks, estrategias simples, LINQ). Interfaz cuando hay **varias operaciones relacionadas**, estado, necesidad de DI/mocking con nombre claro, o el comportamiento es parte del dominio. Los eventos se basan en delegates; los plugins/servicios, en interfaces.

---

## 11. Otras trampas

```csharp
// 1) Capturar 'this' en objetos de larga vida
public class Pantalla
{
    private readonly byte[] _buffer = new byte[50_000_000];
    public void Registrar(System.Timers.Timer t) => t.Elapsed += (_, _) => Refrescar();  // captura 'this'
    private void Refrescar() { }
}
// Mientras el Timer viva, la Pantalla (y sus 50 MB) nunca se recolectan.

// 2) Captura en struct: una lambda no puede capturar 'this' de un struct (ni ref locals)
// struct S { int x; void M() { Action a = () => x++; } }   ❌ CS1673

// 3) Invocación nula en hilos: comprueba y llama sobre una COPIA
Action? callback = ObtenerCallback();
callback?.Invoke();   // ?. lee la referencia UNA vez → thread-safe frente a -= concurrente
```

---

## 12. Resumen mental de la sesión

```
Delegate = TIPO que representa una FIRMA de método (type-safe function pointer)
  instancia = objeto en heap: Target (objeto o null) + Method + InvocationList
  inmutable: += / -= crean delegates nuevos

Func<..., TResult>  (último = retorno) · Action<...> (void) · Predicate<T> (bool)
Mismo "shape" ≠ mismo tipo (Predicate<T> ≠ Func<T,bool>)
Lambda → delegate (IL)  o  → Expression<> (árbol de datos, EF/SQL)

CLOSURE: variables capturadas se ELEVAN a campos de una display class (heap)
  → se captura la VARIABLE, no el valor · extiende su lifetime
  for + lambda = "3 3 3"   ·   foreach (C# 5+) = nueva variable por vuelta
static lambda = no puede capturar → 0 alocaciones garantizado

Multicast: todos se ejecutan en orden · retorno = el del último
  · excepción corta la cadena · -= con lambda no funciona · vacío = null
```

---

## 13. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un delegate y de qué clase hereda? ¿Qué guardan `Target` y `Method`?
2. ❓ `Func` vs `Action` vs `Predicate`. ¿Por qué no puedes asignar un `Func<T,bool>` a un `Predicate<T>`?
3. ❓ ¿Cuándo declararías tu propio tipo delegate en lugar de usar `Func`/`Action`?
4. ❓ ¿Qué es una closure y qué genera el compilador para implementarla?
5. ❓ ¿Qué imprime un `for` que agrega lambdas `() => Console.Write(i)` y por qué? ¿Cambia con `foreach`?
6. ❓ ¿Qué diferencia hay, en alocaciones, entre una lambda que captura y una que no? ¿Para qué sirve `static` en una lambda?
7. ❓ ¿Qué es un multicast delegate? ¿Qué pasa con los valores de retorno y con las excepciones?
8. ❓ ¿Por qué `-= x => ...` no desuscribe nada?
9. ❓ ¿Cómo puede un delegate provocar un memory leak?
10. ❓ ¿Qué diferencia hay entre asignar una lambda a `Func<T,bool>` y a `Expression<Func<T,bool>>`?
11. ❓ ¿Cómo aplica la covarianza/contravarianza a `Func` y `Action`?
12. ❓ ¿Delegate o interfaz de un método? Argumenta.

## 14. Ejercicio práctico
1. Crea `dotnet new console -o DelegatesLab`.
2. Declara `delegate decimal CalculoImpuesto(decimal monto)` y escribe tres métodos (IVA 19 %, exento, tramo progresivo). Pásalos a un método `Facturar(decimal, CalculoImpuesto)`. Luego reescríbelo con `Func<decimal, decimal>`.
3. Reproduce el bug del `for` con lambdas (`3 3 3`), arréglalo con la copia local, y verifica que con `foreach` no ocurre.
4. Implementa `Memoizar<T,TR>` y mide con `Stopwatch` la diferencia en un Fibonacci recursivo ingenuo vs memoizado para `n = 40`. (Pista: el Fibonacci memoizado debe llamarse a sí mismo **a través** del delegate memoizado.)
5. Crea un multicast `Func<int>` con tres suscriptores donde el segundo lanza una excepción. Observa que el tercero no se ejecuta; luego recorre `GetInvocationList()` con `try/catch` para ejecutar todos.
6. Escribe una lambda que capture una variable y compílala; abre el `.dll` en ILSpy o en <https://sharplab.io> y localiza la clase `<>c__DisplayClass`. Luego márcala `static` y observa el error del compilador.
7. (Avanzado) Implementa `Func<T, TR> Componer(params Func<T, T>[] pasos)` que encadene N transformaciones de string (Trim, ToLower, reemplazar espacios por `-`) para generar *slugs*.

---

➡️ **Cuando termines**, marca la Sesión 10 en el [README](Readme.md) y pídeme la **Sesión 11 — Eventos**.
