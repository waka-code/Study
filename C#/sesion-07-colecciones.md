# Sesión 7 — Colecciones: List, Dictionary, HashSet, Queue, Stack y cómo elegir bien

> **Objetivo de la sesión**: conocer las colecciones de .NET *por dentro* (qué estructura de datos usan, su complejidad Big-O, cómo crecen en memoria) y saber **elegir la correcta** para cada problema. Al terminar deberías poder explicar cómo funciona un `Dictionary` (hashing, buckets, colisiones), por qué `GetHashCode` y `Equals` deben ir juntos, la jerarquía de interfaces (`IEnumerable` → `ICollection` → `IList`), y cuándo usar colecciones de solo lectura, inmutables, concurrentes o `FrozenDictionary`.

---

## 1. De arrays a colecciones: el porqué

En la Sesión 2 vimos los **arrays** (`int[]`): bloque contiguo de memoria, tamaño **fijo**, acceso O(1) por índice. Son la base de casi todo, pero tienen un límite: **no crecen**.

```csharp
int[] numeros = new int[3];
numeros[0] = 1;
// numeros[3] = 4;   // 💥 IndexOutOfRangeException: el tamaño es fijo
Array.Resize(ref numeros, 6);   // crea un array NUEVO y copia → O(n)
```

Las **colecciones** de `System.Collections.Generic` encapsulan estructuras de datos clásicas (array dinámico, tabla hash, lista enlazada, árbol, cola, pila) detrás de una API cómoda y **genérica** (Sesión 8), con seguridad de tipos y sin boxing.

> ⚠️ **Historia: no uses `System.Collections` (no genérico)**. `ArrayList`, `Hashtable`, `Queue`, `Stack` no genéricos guardan `object` → **boxing** de value types (Sesión 2) y casts en cada lectura. Existen solo por compatibilidad con .NET 1.x. Usa siempre `List<T>`, `Dictionary<TKey,TValue>`, etc.

```csharp
var viejo = new System.Collections.ArrayList();
viejo.Add(42);                 // boxing: int → object en el heap
int x = (int)viejo[0]!;        // unboxing + cast (puede fallar en runtime)
viejo.Add("hola");             // compila: ¡no hay seguridad de tipos!

var nuevo = new List<int>();
nuevo.Add(42);                 // sin boxing, int guardado directo en el array interno
// nuevo.Add("hola");          // ❌ error de COMPILACIÓN
```

---

## 2. La jerarquía de interfaces (el mapa)

Entender las interfaces es clave para **diseñar APIs**: recibe lo mínimo que necesitas, devuelve lo más útil posible.

```
IEnumerable<T>                 → se puede recorrer con foreach (solo GetEnumerator)
   │
   ├── IReadOnlyCollection<T>  → + Count
   │      ├── IReadOnlyList<T>        → + this[int] (solo lectura)
   │      ├── IReadOnlySet<T>         → + Contains, IsSubsetOf... (.NET 5)
   │      └── IReadOnlyDictionary<K,V>→ + this[key], TryGetValue, Keys, Values
   │
   └── ICollection<T>          → + Count, Add, Remove, Clear, Contains
          ├── IList<T>         → + this[int] get/set, Insert, RemoveAt, IndexOf
          ├── ISet<T>          → + UnionWith, IntersectWith, ...
          └── IDictionary<K,V> → + this[key], Add(k,v), TryGetValue, ...
```

| Interfaz | Qué garantiza | Úsala para… |
|---|---|---|
| `IEnumerable<T>` | Recorrible, posiblemente *lazy* | Parámetros que solo iteran; resultados LINQ (Sesión 9) |
| `IReadOnlyCollection<T>` | Recorrible + `Count` conocido | Devolver datos cuando importa el tamaño |
| `IReadOnlyList<T>` | + acceso por índice | Devolver listas sin permitir mutación |
| `ICollection<T>` / `IList<T>` | Mutable | Cuando el llamador *debe* poder modificar |

> ❓ **Entrevista**: *"¿Por qué recibir `IEnumerable<T>` en vez de `List<T>`?"* → Por el principio de **mínimo requerimiento**: si solo vas a iterar, aceptar `IEnumerable<T>` permite que te pasen arrays, listas, sets, resultados LINQ o generadores `yield`. Además comunica intención: "no voy a modificar tu colección".

> ⚠️ **Enumeración múltiple**: un `IEnumerable<T>` puede ser *lazy* (una query de LINQ o de EF Core). Recorrerlo dos veces **re-ejecuta** la consulta. Si lo necesitas varias veces, materialízalo con `.ToList()` una sola vez. Lo vemos en la Sesión 9.

---

## 3. `List<T>`: el array dinámico

La colección que más usarás. Por dentro es **un array `T[]` + un contador `_size`**.

```csharp
var lista = new List<string> { "a", "b", "c" };   // collection initializer → llama Add 3 veces
List<string> lista2 = ["a", "b", "c"];            // collection expression (C# 12, Sesión 18)

lista.Add("d");                 // O(1) amortizado
lista.Insert(0, "z");           // O(n): desplaza todos los elementos
lista.Remove("b");              // O(n): busca + desplaza
lista.RemoveAt(lista.Count - 1);// O(1): quitar del final no desplaza nada
bool hay = lista.Contains("c"); // O(n): búsqueda lineal
string x = lista[1];            // O(1): acceso directo al array
lista.Sort();                   // O(n log n): introsort
int i = lista.BinarySearch("c");// O(log n): SOLO si está ordenada
```

### 3.1 ¿Cómo crece? (Count vs Capacity)

```
Capacity = 4          Add() #5 → no cabe
┌──┬──┬──┬──┐         1. new T[8]          (duplica)
│a │b │c │d │         2. Array.Copy(4 elem)
└──┴──┴──┴──┘         3. el array viejo queda para el GC
Count = 4             ┌──┬──┬──┬──┬──┬──┬──┬──┐
                      │a │b │c │d │e │  │  │  │   Count=5, Capacity=8
                      └──┴──┴──┴──┴──┴──┴──┴──┘
```

- **`Count`**: cuántos elementos hay.
- **`Capacity`**: tamaño del array interno. Empieza en 0, luego 4, y **se duplica** al llenarse (4 → 8 → 16 → 32…).
- Como duplicar es O(n) pero ocurre cada vez menos, `Add` es **O(1) amortizado**.

```csharp
// Si conoces el tamaño, reserva de antemano: evita log2(n) reasignaciones y copias
var ids = new List<int>(capacity: 10_000);
for (int k = 0; k < 10_000; k++) ids.Add(k);   // cero reasignaciones
```

> ⚠️ **Listas enormes y el LOH**: arrays ≥ 85.000 bytes van al **Large Object Heap** (Sesión 14), que no se compacta por defecto. Una `List<T>` que crece a millones de elementos deja arrays grandes huérfanos por el camino. Pre-dimensionar ayuda.

### 3.2 Modificar mientras recorres

```csharp
var nums = new List<int> { 1, 2, 3, 4 };
// foreach (var n in nums) if (n % 2 == 0) nums.Remove(n);
// 💥 InvalidOperationException: Collection was modified; enumeration operation may not execute.

nums.RemoveAll(n => n % 2 == 0);       // ✅ O(n), una sola pasada
// o recorrer al revés con for:
for (int k = nums.Count - 1; k >= 0; k--)
    if (nums[k] > 2) nums.RemoveAt(k);
```

> ❓ **Entrevista**: *"¿Por qué falla modificar una lista en un `foreach`?"* → `List<T>` tiene un contador interno `_version` que se incrementa en cada mutación. El enumerador guarda la versión al empezar y, en cada `MoveNext`, compara: si cambió, lanza `InvalidOperationException`. Es un mecanismo *fail-fast*.

---

## 4. `Dictionary<TKey, TValue>`: la tabla hash

Asocia **claves únicas** con valores, con búsqueda **O(1) promedio**.

```csharp
var edades = new Dictionary<string, int>
{
    ["Ana"] = 30,          // index initializer
    ["Luis"] = 25,
};

edades.Add("Eva", 28);                 // 💥 ArgumentException si la clave ya existe
edades["Eva"] = 29;                    // upsert: agrega o reemplaza, nunca lanza
// int e = edades["Pepe"];             // 💥 KeyNotFoundException

if (edades.TryGetValue("Pepe", out int edad))   // ✅ patrón correcto: UNA sola búsqueda
    Console.WriteLine(edad);

edades.TryAdd("Ana", 99);              // false: ya existe, no lanza (.NET Core 2.0+)
edades.Remove("Luis", out int quitado);// quita y devuelve el valor

foreach (var (nombre, e2) in edades)   // deconstrucción de KeyValuePair
    Console.WriteLine($"{nombre}: {e2}");
```

> ⚠️ **Anti-patrón de doble búsqueda**:
> ```csharp
> if (dic.ContainsKey(k)) { var v = dic[k]; }   // ❌ calcula el hash y busca DOS veces
> if (dic.TryGetValue(k, out var v)) { ... }     // ✅ una vez
> ```

### 4.1 ¿Cómo funciona por dentro?

```
dic["Ana"] = 30

1. hash = "Ana".GetHashCode()          → p.ej. 1_874_392_115
2. bucket = hash % buckets.Length      → p.ej. 3   (buckets.Length es un número primo)
3. buckets[3] apunta a una entrada en entries[]
4. Se recorre la cadena de entradas del bucket comparando con Equals()

buckets[]            entries[]  (hash, key, value, next)
┌───┐
│ 0 │ -1
├───┤
│ 1 │ ──────▶ [h1, "Luis", 25, next=-1]
├───┤
│ 2 │ -1
├───┤
│ 3 │ ──────▶ [h2, "Ana", 30, next=•]──▶ [h3, "Eva", 29, next=-1]   ← COLISIÓN: mismo bucket
└───┘                                     (se distinguen con Equals)
```

- **Hash** decide el bucket (rápido). **Equals** confirma la identidad (dentro del bucket).
- **Colisión**: dos claves en el mismo bucket → se encadenan (*separate chaining*, con índices en un array, no nodos en el heap).
- **Load factor**: cuando `Count` alcanza la capacidad, se hace **resize** al siguiente primo ≥ 2×, y se **rehashea** todo → O(n) puntual, O(1) amortizado.
- Peor caso: todas las claves colisionan → O(n) por búsqueda. Por eso un `GetHashCode` malo es un problema de **rendimiento** (y de seguridad: ataques *hash flooding*; por eso `string.GetHashCode` está **aleatorizado por proceso** en .NET Core).

> ⚠️ **`string.GetHashCode()` cambia entre ejecuciones** del programa. Nunca lo persistas en BD ni lo uses como identificador estable.

> ⚠️ **El orden de enumeración de `Dictionary` NO está garantizado**. En la práctica, si solo agregas, sale en orden de inserción, pero tras un `Remove` + `Add` el hueco se reutiliza y el orden cambia. Si necesitas orden: `SortedDictionary` (por clave) u `OrderedDictionary<K,V>` (inserción, genérico desde .NET 9).

### 4.2 El contrato `Equals` / `GetHashCode`

Si usas **tus propios tipos como clave**, debes respetar la regla de oro:

> **Si `a.Equals(b)` es `true`, entonces `a.GetHashCode() == b.GetHashCode()`**. (Lo contrario no es obligatorio: hashes iguales pueden ser objetos distintos.)

```csharp
// ❌ Clase sin override: igualdad por REFERENCIA (Sesión 2)
public class Coord { public int X; public int Y; }

var d = new Dictionary<Coord, string>();
d[new Coord { X = 1, Y = 2 }] = "tesoro";
Console.WriteLine(d.ContainsKey(new Coord { X = 1, Y = 2 }));   // False 😱 son objetos distintos

// ✅ Opción 1: implementar IEquatable<T> + GetHashCode
public sealed class CoordOk : IEquatable<CoordOk>
{
    public int X { get; }
    public int Y { get; }
    public CoordOk(int x, int y) => (X, Y) = (x, y);

    public bool Equals(CoordOk? other) => other is not null && X == other.X && Y == other.Y;
    public override bool Equals(object? obj) => Equals(obj as CoordOk);
    public override int GetHashCode() => HashCode.Combine(X, Y);   // combina bien los campos
}

// ✅ Opción 2 (la moderna): un record genera Equals/GetHashCode por valor (Sesión 17)
public readonly record struct CoordRec(int X, int Y);

var d2 = new Dictionary<CoordRec, string> { [new(1, 2)] = "tesoro" };
Console.WriteLine(d2.ContainsKey(new(1, 2)));   // True
```

> ⚠️ **Nunca mutes una clave después de insertarla**. Si cambias `X` de un objeto usado como clave, su hash cambia, queda en el bucket equivocado y el diccionario ya no lo encuentra (pero sigue ahí ocupando espacio). Las claves deben ser **inmutables**.

> ❓ **Entrevista**: *"¿Qué pasa si sobrescribes `Equals` pero no `GetHashCode`?"* → Dos objetos "iguales" darán hashes distintos, caerán en buckets distintos y el `Dictionary`/`HashSet` los tratará como diferentes: duplicados y búsquedas fallidas. El compilador lanza la advertencia CS0659.

### 4.3 Comparadores personalizados

En vez de cambiar el tipo, puedes pasar un `IEqualityComparer<T>`:

```csharp
// Claves string sin distinguir mayúsculas — más rápido y correcto que hacer ToLower() en cada acceso
var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
{
    ["Content-Type"] = "application/json"
};
Console.WriteLine(headers["content-type"]);   // application/json
```

| Comparador | Uso |
|---|---|
| `StringComparer.Ordinal` | Identificadores, claves técnicas (el más rápido) |
| `StringComparer.OrdinalIgnoreCase` | Headers HTTP, rutas, nombres de archivo |
| `StringComparer.CurrentCulture(IgnoreCase)` | Texto visible al usuario, ordenamiento "humano" |

### 4.4 Actualizar sin doble búsqueda: `CollectionsMarshal`

Para contadores en hot paths (.NET 6+):

```csharp
using System.Runtime.InteropServices;

var conteo = new Dictionary<string, int>();
foreach (var palabra in "a b a c a b".Split(' '))
{
    ref int c = ref CollectionsMarshal.GetValueRefOrAddDefault(conteo, palabra, out _);
    c++;   // modifica el valor DENTRO del diccionario: una sola búsqueda por palabra
}
// Alternativa legible (dos búsquedas): conteo[palabra] = conteo.GetValueOrDefault(palabra) + 1;
```

> ⚠️ No agregues ni quites claves mientras mantienes ese `ref`: un resize invalidaría la referencia.

---

## 5. `HashSet<T>`: conjunto sin duplicados

Es un `Dictionary` **sin valores**: solo claves. Búsqueda, inserción y borrado **O(1)**.

```csharp
var vistos = new HashSet<int>();
Console.WriteLine(vistos.Add(5));   // True
Console.WriteLine(vistos.Add(5));   // False: ya estaba (no lanza)

// Deduplicar
int[] conRepetidos = [3, 1, 3, 2, 1];
var unicos = new HashSet<int>(conRepetidos);   // {3, 1, 2}

// Operaciones de conjuntos (modifican el set actual)
var a = new HashSet<string> { "C#", "Java", "Go" };
var b = new HashSet<string> { "Go", "Rust" };
a.IntersectWith(b);      // a = { Go }
// a.UnionWith(b);       // unión
// a.ExceptWith(b);      // diferencia
// a.SymmetricExceptWith(b); // en uno u otro pero no en ambos
bool sub = a.IsSubsetOf(b);  // True
```

> 💡 **Caso clásico de entrevista/performance**: `lista.Contains(x)` dentro de un bucle es O(n·m). Convertir la lista a `HashSet` primero lo baja a O(n+m).
> ```csharp
> var bloqueados = new HashSet<int>(idsBloqueados);           // O(m) una vez
> var validos = usuarios.Where(u => !bloqueados.Contains(u.Id)); // O(1) cada uno
> ```

`SortedSet<T>`: conjunto **ordenado** (árbol rojo-negro), O(log n), con `Min`, `Max`, `GetViewBetween`.

---

## 6. `Queue<T>`, `Stack<T>` y `PriorityQueue<TElement, TPriority>`

```csharp
// Queue: FIFO (First In, First Out) — array circular
var cola = new Queue<string>();
cola.Enqueue("pedido-1");
cola.Enqueue("pedido-2");
Console.WriteLine(cola.Peek());      // pedido-1 (mira sin sacar)
Console.WriteLine(cola.Dequeue());   // pedido-1 (saca)
if (cola.TryDequeue(out var sig)) Console.WriteLine(sig);   // evita InvalidOperationException si vacía

// Stack: LIFO (Last In, First Out) — array
var pila = new Stack<char>();
foreach (var ch in "({[") pila.Push(ch);
Console.WriteLine(pila.Pop());       // [
Console.WriteLine(pila.Peek());      // {

// PriorityQueue (.NET 6): min-heap; sale primero la MENOR prioridad
var tareas = new PriorityQueue<string, int>();
tareas.Enqueue("backup", 3);
tareas.Enqueue("incidente prod", 1);
tareas.Enqueue("reporte", 2);
while (tareas.TryDequeue(out var t, out var prio))
    Console.WriteLine($"{prio}: {t}");   // 1: incidente prod / 2: reporte / 3: backup
```

```
Queue (FIFO)                        Stack (LIFO)
Enqueue ─▶ [ 3 | 2 | 1 ] ─▶ Dequeue    Push ─▶ ┌───┐ ─▶ Pop
            tail      head                    │ 3 │ ← top
                                              │ 2 │
                                              │ 1 │
                                              └───┘
```

> ⚠️ `PriorityQueue` **no es estable** (elementos con igual prioridad no salen en orden de inserción garantizado) y **no permite** actualizar la prioridad de un elemento ya encolado.

Usos típicos: `Queue` → BFS, buffers, procesamiento en orden de llegada. `Stack` → DFS, deshacer (undo), validar paréntesis, evaluar expresiones. `PriorityQueue` → Dijkstra, scheduling, top-K.

---

## 7. `LinkedList<T>`, `SortedDictionary`, `SortedList`

```csharp
var ll = new LinkedList<int>();
var nodo = ll.AddLast(1);
ll.AddLast(3);
ll.AddAfter(nodo, 2);          // O(1) si YA tienes el nodo → 1, 2, 3
```

> ⚠️ **`LinkedList<T>` casi nunca es la respuesta** en .NET. Cada nodo es un objeto en el heap (overhead de ~40+ bytes, presión al GC) y los nodos están dispersos en memoria (malo para la caché de la CPU). Salvo que insertes/borres en medio **teniendo ya la referencia al nodo** (p. ej. una caché LRU), `List<T>` gana incluso con inserciones O(n).

| | `SortedDictionary<K,V>` | `SortedList<K,V>` |
|---|---|---|
| Estructura | Árbol rojo-negro | Dos arrays ordenados |
| Búsqueda | O(log n) | O(log n) (binaria) |
| Inserción/borrado | O(log n) | O(n) (desplaza) |
| Memoria | Más (nodos) | Menos (contigua) |
| Úsalo si… | Muchas inserciones | Se llena una vez y se lee mucho |

---

## 8. Tabla maestra de complejidad (memorízala)

| Colección | Estructura | Acceso índice | Buscar | Insertar | Borrar | Orden |
|---|---|---|---|---|---|---|
| `T[]` | Array contiguo | O(1) | O(n) | — (fijo) | — | Inserción |
| `List<T>` | Array dinámico | O(1) | O(n) | O(1)* final / O(n) medio | O(n) | Inserción |
| `Dictionary<K,V>` | Tabla hash | — | O(1)† | O(1)* | O(1) | ❌ No garantizado |
| `HashSet<T>` | Tabla hash | — | O(1)† | O(1)* | O(1) | ❌ |
| `SortedDictionary<K,V>` | Árbol RB | — | O(log n) | O(log n) | O(log n) | Por clave |
| `SortedSet<T>` | Árbol RB | — | O(log n) | O(log n) | O(log n) | Por valor |
| `Queue<T>` | Array circular | — | O(n) | O(1)* | O(1) (head) | FIFO |
| `Stack<T>` | Array | — | O(n) | O(1)* | O(1) (top) | LIFO |
| `PriorityQueue<T,P>` | Min-heap (4-ario) | — | — | O(log n) | O(log n) | Por prioridad |
| `LinkedList<T>` | Lista doble enlazada | O(n) | O(n) | O(1) con nodo | O(1) con nodo | Inserción |

\* amortizado · † promedio (peor caso O(n) con colisiones)

### 8.1 Árbol de decisión

```
¿Necesitas buscar por una clave?
 ├─ Sí → ¿necesitas orden por clave?
 │        ├─ No  → Dictionary<K,V>   (¿datos fijos tras cargar? → FrozenDictionary)
 │        └─ Sí  → SortedDictionary<K,V>
 └─ No → ¿solo necesitas saber si "está o no" / sin duplicados?
          ├─ Sí → HashSet<T>  (ordenado → SortedSet<T>)
          └─ No → ¿orden de procesamiento?
                   ├─ FIFO        → Queue<T>
                   ├─ LIFO        → Stack<T>
                   ├─ Prioridad   → PriorityQueue<T,P>
                   └─ Por índice  → List<T>   (tamaño fijo y conocido → T[])
```

---

## 9. Solo lectura vs inmutable vs congelada

Tres conceptos que en entrevistas se confunden a propósito:

```csharp
using System.Collections.Frozen;
using System.Collections.Immutable;

var fuente = new List<int> { 1, 2, 3 };

// 1) READ-ONLY VIEW: una vista que no permite mutar... pero la fuente sí puede cambiar
IReadOnlyList<int> vista = fuente.AsReadOnly();   // ReadOnlyCollection<int>
fuente.Add(4);
Console.WriteLine(vista.Count);   // 4 😮 la vista refleja el cambio

// 2) IMMUTABLE: nunca cambia; "modificar" devuelve una NUEVA colección (comparte estructura)
ImmutableList<int> inm = ImmutableList.Create(1, 2, 3);
ImmutableList<int> inm2 = inm.Add(4);   // inm sigue con 3 elementos
Console.WriteLine($"{inm.Count} {inm2.Count}");   // 3 4

// 3) FROZEN (.NET 8): inmutable y optimizada para LECTURA; creación costosa, búsqueda ultra-rápida
FrozenDictionary<string, int> codigos = new Dictionary<string, int>
{
    ["CL"] = 56, ["AR"] = 54, ["PE"] = 51
}.ToFrozenDictionary();
Console.WriteLine(codigos["CL"]);   // 56
FrozenSet<string> rolesAdmin = new[] { "admin", "root" }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);
```

| | `ReadOnlyCollection` / `IReadOnly*` | `Immutable*` | `Frozen*` (.NET 8) |
|---|---|---|---|
| ¿El dueño puede mutar la fuente? | ✅ (la vista lo refleja) | ❌ | ❌ |
| "Modificar" | No se puede | Devuelve nueva colección | No se puede |
| Thread-safe para lectura | Solo si nadie muta la fuente | ✅ | ✅ |
| Costo de creación | O(1) (envuelve) | Medio | Alto (analiza las claves) |
| Velocidad de lectura | Igual a la fuente | Más lenta (árboles) | La más rápida |
| Caso de uso | Exponer estado interno | Estado compartido, snapshots, undo | Tablas de configuración/lookup fijas |

> ❓ **Entrevista**: *"¿`IReadOnlyList<T>` significa que la lista es inmutable?"* → No. Significa que **tú, a través de esa referencia**, no puedes modificarla. Quien tenga la referencia a la `List<T>` original sí puede, e incluso tú podrías hacer `(List<T>)vista` si devolviste la lista directamente. Para inmutabilidad real: `ImmutableList<T>` o `FrozenSet<T>`.

---

## 10. Colecciones concurrentes (adelanto)

Las colecciones normales **no son thread-safe** para escrituras concurrentes. Un `Dictionary` escrito desde varios hilos puede corromperse (incluso entrar en bucle infinito en versiones antiguas).

```csharp
using System.Collections.Concurrent;

var cache = new ConcurrentDictionary<string, int>();

// GetOrAdd atómico respecto al diccionario...
int valor = cache.GetOrAdd("clave", k => CalcularCaro(k));
// ⚠️ ...pero la factory PUEDE ejecutarse más de una vez si dos hilos llegan a la vez.
//    Si es costosa o tiene efectos: usa Lazy<T> como valor.
var cacheLazy = new ConcurrentDictionary<string, Lazy<int>>();
int v2 = cacheLazy.GetOrAdd("clave", k => new Lazy<int>(() => CalcularCaro(k))).Value;

cache.AddOrUpdate("hits", 1, (_, actual) => actual + 1);   // incremento seguro

static int CalcularCaro(string k) => k.Length * 42;
```

| Concurrente | Equivalente |
|---|---|
| `ConcurrentDictionary<K,V>` | `Dictionary<K,V>` |
| `ConcurrentQueue<T>` | `Queue<T>` |
| `ConcurrentStack<T>` | `Stack<T>` |
| `ConcurrentBag<T>` | Bolsa sin orden (optimizada por hilo) |
| `BlockingCollection<T>` / `Channel<T>` | Productor-consumidor |

Todo esto (locks, `Channel<T>`, `Parallel`) lo profundizamos en la Sesión 29.

---

## 11. `foreach`, enumeradores y `yield` (cómo se recorre)

`foreach` no requiere `IEnumerable<T>`: basta con un método `GetEnumerator()` que devuelva algo con `MoveNext()` y `Current` (*duck typing*). Por eso `List<T>` devuelve un **struct** `List<T>.Enumerator`: recorrer una `List<T>` con `foreach` **no asigna memoria** en el heap.

```csharp
// Lo que el compilador genera para: foreach (var x in lista) Console.WriteLine(x);
List<int>.Enumerator e = lista.GetEnumerator();   // struct → sin allocation
try
{
    while (e.MoveNext())
    {
        var x = e.Current;
        Console.WriteLine(x);
    }
}
finally { e.Dispose(); }
```

> ⚠️ Si recorres la lista **a través de la interfaz** (`IEnumerable<int> seq = lista; foreach (var x in seq)`), el enumerador struct se **boxea** → una allocation. Irrelevante en general; relevante en hot paths (Sesión 30).

Puedes crear tus propias secuencias *lazy* con **`yield return`**:

```csharp
static IEnumerable<int> Fibonacci()
{
    int a = 0, b = 1;
    while (true)            // secuencia infinita: solo se calcula lo que se pide
    {
        yield return a;
        (a, b) = (b, a + b);
    }
}

foreach (var f in Fibonacci().Take(10))   // Take es LINQ (Sesión 9)
    Console.Write($"{f} ");               // 0 1 1 2 3 5 8 13 21 34
```

El compilador convierte el método en una **máquina de estados** que implementa `IEnumerator<T>`. Esta misma idea de "máquina de estados generada" reaparece con `async/await` (Sesión 13).

---

## 12. Colecciones y rendimiento: tips de senior

```csharp
// 1. Pre-dimensionar cuando conoces el tamaño
var dic = new Dictionary<int, string>(capacity: usuarios.Count);

// 2. Evitar .Count() de LINQ sobre List (usa la propiedad Count) — y Any() en IEnumerable
if (lista.Count > 0) { }        // O(1)
if (secuencia.Any()) { }        // no recorre todo, a diferencia de Count() > 0

// 3. Span sobre List para procesar sin copias (Sesión 19)
Span<int> span = CollectionsMarshal.AsSpan(listaInts);   // ⚠️ no agregues elementos mientras lo usas

// 4. Devolver colecciones vacías, nunca null
public IReadOnlyList<Pedido> Buscar(string filtro) =>
    string.IsNullOrEmpty(filtro) ? Array.Empty<Pedido>() : _pedidos.FindAll(p => p.Cliente == filtro);
// Array.Empty<T>() (o [] asignado a IReadOnlyList<T>/IEnumerable<T>) no asigna memoria;
// el llamador puede hacer foreach sin chequear null

// 5. Structs grandes en List: el indexador devuelve COPIA
// lista[0].X = 5;   // ❌ CS1612 si es struct (igual que con propiedades, Sesión 6)
```

> ❓ **Entrevista**: *"¿Devolverías `null` o una colección vacía?"* → Colección vacía. Evita `NullReferenceException` en el llamador, simplifica el código (no hay `if (x != null)`), y `Array.Empty<T>()` o `[]` no cuestan memoria.

---

## Resumen mental de la sesión

```
IEnumerable<T> → ICollection<T> → IList<T>/ISet<T>/IDictionary<K,V>
(recibe lo mínimo, devuelve IReadOnly* cuando no quieres que muten)

List<T>        array dinámico: índice O(1), Add O(1)*, Insert/Remove/Contains O(n)
               Capacity se DUPLICA; pre-dimensiona si sabes el tamaño
Dictionary     tabla hash: O(1) promedio. Hash → bucket, Equals → confirma
               Equals y GetHashCode SIEMPRE juntos; claves INMUTABLES
               TryGetValue (1 búsqueda) > ContainsKey + [] (2 búsquedas)
HashSet<T>     Dictionary sin valores: Contains O(1), operaciones de conjuntos
Queue/Stack    FIFO / LIFO · PriorityQueue = min-heap
Sorted*        árbol, O(log n), ordenado
LinkedList     casi nunca (overhead + mala localidad de caché)

ReadOnly (vista) ≠ Immutable (copias) ≠ Frozen (lectura ultra-rápida, .NET 8)
Multi-hilo → Concurrent* (Sesión 29) · No-genéricas (ArrayList) → NUNCA
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Cómo crece internamente una `List<T>`? ¿Qué es `Capacity` y por qué `Add` es O(1) *amortizado*?
2. ❓ Explica cómo funciona un `Dictionary` por dentro: hash, buckets, colisiones y resize.
3. ❓ ¿Qué es el contrato `Equals`/`GetHashCode`? ¿Qué pasa si lo rompes?
4. ❓ ¿Por qué no debes mutar un objeto que ya es clave de un `Dictionary`?
5. ❓ ¿`ContainsKey` + indexador vs `TryGetValue`? ¿Cuál y por qué?
6. ❓ ¿Cuándo usarías `HashSet<T>` en lugar de `List<T>`? Da un ejemplo de mejora de complejidad.
7. ❓ ¿Diferencia entre `IReadOnlyList<T>`, `ImmutableList<T>` y `FrozenSet<T>`?
8. ❓ ¿Por qué se lanza `InvalidOperationException` al modificar una lista dentro de un `foreach`?
9. ❓ ¿Por qué `LinkedList<T>` rara vez es buena opción en .NET?
10. ❓ ¿Qué problemas tienen `ArrayList` y `Hashtable`?
11. ❓ ¿`Dictionary` garantiza el orden de enumeración? ¿Qué usarías si lo necesitas?
12. ❓ ¿Por qué `GetOrAdd` de `ConcurrentDictionary` puede ejecutar la factory dos veces y cómo lo evitas?

## Ejercicio práctico
1. Crea el proyecto: `dotnet new console -o ColeccionesLab && cd ColeccionesLab`.
2. **Capacity**: crea una `List<int>` vacía, agrega 100 elementos e imprime `Count` y `Capacity` después de cada `Add` solo cuando `Capacity` cambie. Verifica la secuencia 4, 8, 16, 32, 64, 128.
3. **Frecuencia de palabras**: lee un texto (p. ej. un párrafo en un `string`), sepáralo en palabras y cuenta ocurrencias con `Dictionary<string,int>` usando `StringComparer.OrdinalIgnoreCase`. Hazlo primero con `TryGetValue` y luego con `CollectionsMarshal.GetValueRefOrAddDefault`. Imprime el top 5 (puedes usar `PriorityQueue` o, si ya te adelantas, LINQ).
4. **El bug del hash**: crea una clase `Coord` mutable sin `Equals/GetHashCode`, úsala como clave y demuestra que `ContainsKey` falla. Luego conviértela en `readonly record struct` y compara.
5. **Clave mutada**: con una clase con `Equals/GetHashCode` correctos pero propiedades con `set`, inserta en un `HashSet`, muta la propiedad y comprueba que `Contains` devuelve `false` aunque `Count` sea 1.
6. **Paréntesis balanceados**: implementa `bool Balanceado(string s)` con `Stack<char>` para `()[]{}`.
7. **Benchmark casero**: con `Stopwatch`, compara 10.000 búsquedas `Contains` en una `List<int>` de 100.000 elementos vs un `HashSet<int>` equivalente. Anota la diferencia (en la Sesión 30 lo haremos bien con BenchmarkDotNet).

---

➡️ **Cuando termines**, marca la Sesión 7 en el [README](Readme.md) y pídeme la **Sesión 8 — Generics y constraints (covarianza/contravarianza)**.
