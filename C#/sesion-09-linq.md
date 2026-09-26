# Sesión 9 — LINQ: consultar datos como un lenguaje (básico → avanzado)

> **Objetivo de la sesión**: dominar LINQ (*Language INtegrated Query*) desde los operadores básicos hasta sus entrañas: qué es realmente un método de extensión sobre `IEnumerable<T>`, qué significa **ejecución diferida**, por qué `IEnumerable<T>` e `IQueryable<T>` se comportan tan distinto, cómo evitar la **enumeración múltiple** y cómo escribir tus propios operadores con `yield return`. Al terminar deberías poder leer cualquier consulta LINQ, predecir *cuándo* se ejecuta y *cuánto* cuesta, y defender tus decisiones en una entrevista senior.

---

## 1. ¿Qué es LINQ y por qué existe?

Antes de LINQ (C# 3.0, 2007), filtrar una lista, consultar una base de datos y recorrer un XML eran **tres APIs distintas** con tres estilos distintos. LINQ unificó todo en **un solo modelo de consulta**, integrado en el lenguaje y verificado por el compilador.

```csharp
// Sin LINQ: imperativo, "CÓMO" hacerlo
var caros = new List<string>();
foreach (var p in productos)
{
    if (p.Precio > 100)
        caros.Add(p.Nombre);
}
caros.Sort();

// Con LINQ: declarativo, "QUÉ" quiero
var caros2 = productos
    .Where(p => p.Precio > 100)   // filtra
    .OrderBy(p => p.Nombre)       // ordena
    .Select(p => p.Nombre)        // proyecta
    .ToList();                    // materializa
```

LINQ se apoya en varias features que llegaron *juntas* en C# 3 precisamente para hacerlo posible:

| Feature | Rol en LINQ |
|---|---|
| **Métodos de extensión** | `Where`, `Select`... son métodos `static` de `System.Linq.Enumerable` que "parecen" de instancia. |
| **Lambdas** | El criterio `p => p.Precio > 100` (Sesión 10). |
| **Tipos anónimos** | `new { p.Nombre, p.Precio }` para proyecciones ad hoc. |
| **`var`** | Necesario para guardar tipos anónimos. |
| **Expression trees** | Permiten traducir la lambda a SQL (`IQueryable`, sección 7). |
| **Iteradores (`yield`)** | Implementan la ejecución diferida (sección 4). |

> ❓ **Entrevista**: *"¿LINQ es parte del lenguaje o de la librería?"* → Ambas. La **sintaxis de consulta** (`from … where … select`) es del lenguaje; el compilador la traduce a llamadas a métodos (`Where`, `Select`) que viven en la **librería** (`System.Linq`). Cualquier tipo que exponga métodos con esos nombres y firmas puede usarse con la sintaxis de consulta.

---

## 2. Datos de ejemplo (úsalos en toda la sesión)

```csharp
public record Producto(int Id, string Nombre, string Categoria, decimal Precio, int Stock);
public record Venta(int ProductoId, int Cantidad, DateOnly Fecha);

var productos = new List<Producto>
{
    new(1, "Teclado",   "Periféricos", 45m,  10),
    new(2, "Mouse",     "Periféricos", 25m,  0),
    new(3, "Monitor",   "Pantallas",   320m, 5),
    new(4, "Notebook",  "Equipos",     1200m, 2),
    new(5, "Webcam",    "Periféricos", 80m,  7),
    new(6, "Monitor 4K","Pantallas",   650m, 1),
};

var ventas = new List<Venta>
{
    new(1, 3, new DateOnly(2026, 1, 10)),
    new(3, 1, new DateOnly(2026, 1, 12)),
    new(1, 2, new DateOnly(2026, 2, 3)),
    new(4, 1, new DateOnly(2026, 2, 15)),
    new(9, 5, new DateOnly(2026, 3, 1)),   // producto inexistente (útil para joins)
};
```

(Los `record` los vemos a fondo en la Sesión 17; aquí basta con saber que son clases inmutables con igualdad por valor.)

---

## 3. Dos sintaxis, un mismo resultado

### 3.1 Method syntax (fluida)
```csharp
var r1 = productos
    .Where(p => p.Stock > 0)
    .OrderByDescending(p => p.Precio)
    .Select(p => new { p.Nombre, p.Precio });
```

### 3.2 Query syntax (estilo SQL)
```csharp
var r2 = from p in productos
         where p.Stock > 0
         orderby p.Precio descending
         select new { p.Nombre, p.Precio };
```

El compilador **traduce** la query syntax a method syntax. Son idénticas en IL.

| Aspecto | Method syntax | Query syntax |
|---|---|---|
| Cobertura | **Todos** los operadores | Solo un subconjunto (`where`, `select`, `orderby`, `group`, `join`, `let`) |
| `Count`, `First`, `Distinct`, `Take`... | Sí | No → hay que mezclar: `(from ... select x).Count()` |
| Joins y `let` | Verboso | **Más legible** |
| Uso en la industria | Mayoritario | Minoritario, pero aparece en código con joins complejos |

```csharp
// 'let' introduce una variable intermedia: donde query syntax brilla
var conIva = from p in productos
             let precioIva = p.Precio * 1.19m          // se calcula una vez por elemento
             where precioIva > 100
             select new { p.Nombre, precioIva };

// Equivalente en method syntax (el compilador genera algo así):
var conIva2 = productos
    .Select(p => new { p, precioIva = p.Precio * 1.19m })
    .Where(t => t.precioIva > 100)
    .Select(t => new { t.p.Nombre, t.precioIva });
```

---

## 4. Ejecución diferida: EL concepto de LINQ

Esta es la idea que separa a un junior de un senior. **La mayoría de operadores LINQ no ejecutan nada cuando los llamas.** Solo construyen una "receta" (una cadena de iteradores). El trabajo ocurre cuando alguien **enumera** el resultado (`foreach`, `ToList()`, `Count()`, `First()`...).

```csharp
var numeros = new List<int> { 1, 2, 3 };

var query = numeros.Where(n =>
{
    Console.WriteLine($"  evaluando {n}");
    return n > 1;
});

Console.WriteLine("Query creada (nada impreso todavía)");
numeros.Add(4);                 // ¡modificamos la fuente DESPUÉS de crear la query!

foreach (var n in query)        // AQUÍ se ejecuta
    Console.WriteLine($"-> {n}");

// Salida:
// Query creada (nada impreso todavía)
//   evaluando 1
//   evaluando 2
// -> 2
//   evaluando 3
// -> 3
//   evaluando 4
// -> 4        ← el 4 aparece: la query ve el estado de la fuente AL ENUMERAR
```

Observa dos cosas:
1. **Diferida**: nada corre hasta el `foreach`.
2. **Streaming (lazy, elemento a elemento)**: no filtra todo y luego imprime; procesa **un elemento a la vez** a través de toda la cadena.

### 4.1 Cómo funciona por dentro (el pipeline)

```
foreach pide MoveNext()
      │
      ▼
 ┌─────────┐  MoveNext()  ┌─────────┐  MoveNext()  ┌─────────┐  MoveNext() ┌────────┐
 │ Select  │ ───────────▶ │  Where  │ ───────────▶ │ OrderBy │ ──────────▶ │ List<T>│
 │iterator │ ◀─────────── │iterator │ ◀─────────── │iterator │ ◀────────── │ fuente │
 └─────────┘   Current    └─────────┘   Current    └─────────┘   Current   └────────┘
       "pull model": el consumidor TIRA de los datos desde el final
```

Una implementación simplificada de `Where` muestra que no hay magia, solo un **iterador**:

```csharp
public static class MiLinq
{
    // Método de extensión: 'this' en el primer parámetro
    public static IEnumerable<T> MiWhere<T>(this IEnumerable<T> source, Func<T, bool> predicate)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(predicate);
        return Iterador(source, predicate);   // separar validación del iterador (ver ⚠️)

        static IEnumerable<T> Iterador(IEnumerable<T> src, Func<T, bool> pred)
        {
            foreach (var item in src)
                if (pred(item))
                    yield return item;   // el compilador genera una máquina de estados
        }
    }
}
```

> ⚠️ **Validación "diferida" por accidente**: si pones `ThrowIfNull` *dentro* de un método con `yield`, la excepción **no** salta al llamar al método sino al enumerar (quizás mucho después y en otro lugar). Por eso la BCL separa validación (eager) del iterador (lazy) con una función local (Sesión 4).

### 4.2 Clasificación de operadores por modo de ejecución

| Categoría | Operadores | ¿Cuándo ejecuta? |
|---|---|---|
| **Diferido + streaming** | `Where`, `Select`, `SelectMany`, `Take`, `Skip`, `TakeWhile`, `Concat`, `Zip`, `OfType`, `Cast`, `Chunk` | Al enumerar, elemento a elemento |
| **Diferido + no streaming (buffering)** | `OrderBy`, `ThenBy`, `GroupBy`, `Reverse`, `Distinct`*, `Join`*, `Except`*, `Intersect`* | Al pedir el **primer** elemento, lee (casi) toda la fuente |
| **Inmediato (materializa)** | `ToList`, `ToArray`, `ToDictionary`, `ToHashSet`, `ToLookup` | En el momento de la llamada |
| **Inmediato (escalar)** | `Count`, `Sum`, `Min`, `Max`, `Average`, `Aggregate`, `First`, `Single`, `Any`, `All`, `Contains`, `ElementAt` | En el momento de la llamada |

\* `Distinct` streamea pero guarda un `HashSet` interno de lo visto; `Join`/`Except`/`Intersect` cargan la **segunda** secuencia completa en un lookup/set y luego streamean la primera.

> ❓ **Entrevista**: *"¿`OrderBy` es lazy?"* → Es **diferido** (no hace nada al llamarlo), pero **no es streaming**: para devolver el primer elemento necesita haber visto todos (no puedes saber cuál es el menor sin mirarlos todos). Coste O(n log n) y memoria O(n).

---

## 5. Enumeración múltiple: el bug silencioso

Como una query es una *receta*, **cada vez que la enumeras se vuelve a ejecutar entera**.

```csharp
IEnumerable<Producto> caros = productos.Where(p =>
{
    Console.WriteLine("filtrando...");   // efecto visible
    return p.Precio > 100;
});

if (caros.Any())                         // enumeración 1 (se detiene en el primero)
{
    Console.WriteLine(caros.Count());    // enumeración 2 (completa)
    foreach (var p in caros) { }         // enumeración 3 (completa)
}
```

Con una `List` en memoria es "solo" CPU desperdiciada. Pero si la fuente es:
- una **consulta a BD** (`IQueryable`) → **3 round-trips SQL**,
- un **stream/archivo** (`File.ReadLines`) → se relee el archivo,
- un **iterador con efectos** (genera IDs, llama a una API) → resultados **distintos** cada vez,

...tienes un bug de rendimiento o de corrección.

```csharp
// ✅ Materializa UNA vez si vas a recorrer varias veces
List<Producto> carosList = productos.Where(p => p.Precio > 100).ToList();
if (carosList.Count > 0) { /* Count es propiedad O(1) en List */ }
```

> ⚠️ Rider/ReSharper/analizadores avisan con *"Possible multiple enumeration of IEnumerable"*. No lo ignores.

> ❓ **Entrevista**: *"¿Cuándo llamarías `ToList()`?"* → Cuando necesitas (a) enumerar varias veces, (b) congelar un snapshot del estado actual, (c) ejecutar la consulta *ya* (p. ej. antes de cerrar un `DbContext` o salir de un `using`), o (d) indexar. **No** lo llames "por si acaso" al final de cada línea: cada `ToList()` intermedio aloca una lista entera.

---

## 6. Catálogo de operadores (lo que debes conocer de memoria)

### 6.1 Filtrado y proyección
```csharp
var enStock   = productos.Where(p => p.Stock > 0);
var conIndice = productos.Where((p, i) => i % 2 == 0);     // overload con índice
var nombres   = productos.Select(p => p.Nombre.ToUpper());
var numerados = productos.Select((p, i) => $"{i + 1}. {p.Nombre}");

object[] mezcla = [1, "dos", 3, "cuatro"];
var soloStrings = mezcla.OfType<string>();                 // filtra por tipo (seguro)
// mezcla.Cast<string>() → InvalidCastException en el 1
```

### 6.2 `SelectMany`: aplanar
`Select` produce una secuencia **de secuencias**; `SelectMany` la **aplana**.

```csharp
string[] frases = ["hola mundo", "linq es genial"];

IEnumerable<string[]> anidado = frases.Select(f => f.Split(' '));    // [[hola,mundo],[linq,es,genial]]
IEnumerable<string>   plano   = frases.SelectMany(f => f.Split(' ')); // [hola,mundo,linq,es,genial]

// Producto cartesiano con query syntax (dos 'from' = SelectMany)
var combinaciones = from talla in new[] { "S", "M" }
                    from color in new[] { "Rojo", "Azul" }
                    select $"{talla}-{color}";   // S-Rojo, S-Azul, M-Rojo, M-Azul
```

```
Select:      [A] → [[a1,a2]]   [B] → [[b1]]        ⇒ [[a1,a2],[b1]]
SelectMany:  [A] → [a1,a2]     [B] → [b1]          ⇒ [a1,a2,b1]
```

### 6.3 Ordenamiento
```csharp
var ordenados = productos
    .OrderBy(p => p.Categoria)             // clave primaria
    .ThenByDescending(p => p.Precio)       // desempate
    .ThenBy(p => p.Nombre);

// .NET 7+: Order() / OrderDescending() para tipos comparables
int[] nums = [5, 3, 9];
var asc = nums.Order();
```

> ⚠️ **`OrderBy(...).OrderBy(...)`** NO es un orden secundario: el segundo `OrderBy` **reemplaza** al primero (aunque el sort es *estable*). Para desempatar usa `ThenBy`.

> 💡 `OrderBy` en LINQ to Objects es **estable** (conserva el orden relativo de elementos con igual clave). `List<T>.Sort()` **no** lo es.

### 6.4 Elementos individuales: `First` vs `Single` vs `...OrDefault`

| Método | 0 elementos | 1 elemento | 2+ elementos |
|---|---|---|---|
| `First()` | 💥 `InvalidOperationException` | ✅ | ✅ devuelve el primero |
| `FirstOrDefault()` | `default(T)` (null / 0) | ✅ | ✅ el primero |
| `Single()` | 💥 | ✅ | 💥 |
| `SingleOrDefault()` | `default(T)` | ✅ | 💥 |
| `Last()` / `ElementAt(i)` | 💥 | ✅ | ✅ |

```csharp
var notebook = productos.Single(p => p.Id == 4);              // afirmas: existe exactamente uno
var tablet   = productos.FirstOrDefault(p => p.Nombre == "Tablet");            // null
var primero  = productos.FirstOrDefault(p => p.Stock > 99, defaultValue: productos[0]); // .NET 6+
```

> ❓ **Entrevista**: *"¿`First` o `Single`?"* → `Single` **expresa una invariante** (debe haber exactamente uno, p. ej. búsqueda por clave única) y falla si se rompe; pero debe recorrer **toda** la secuencia para confirmar que no hay un segundo. `First` se detiene en el primer match → más rápido. En EF Core, `Single` genera `TOP 2` y `First` genera `TOP 1`.

### 6.5 Cuantificadores
```csharp
bool hayAgotados = productos.Any(p => p.Stock == 0);   // se detiene en el primer true
bool todosCaros  = productos.All(p => p.Precio > 10);  // se detiene en el primer false
bool tieneMouse  = productos.Select(p => p.Nombre).Contains("Mouse");
```

> ⚠️ **`Count() > 0` vs `Any()`**: sobre un `IEnumerable` genérico, `Count()` recorre **todo**; `Any()` para en el primero. Usa `Any()`. (Si ya tienes una `List`/array, usa `.Count`/`.Length`, que son O(1). `Enumerable.Count()` detecta `ICollection<T>` y también es O(1), pero la propiedad es más clara.)

> ⚠️ `All` sobre una secuencia **vacía** devuelve `true` (verdad vacua). Es un clásico de preguntas trampa.

### 6.6 Agregaciones
```csharp
decimal total    = productos.Sum(p => p.Precio * p.Stock);
decimal promedio = productos.Average(p => p.Precio);
var masCaro      = productos.MaxBy(p => p.Precio);        // .NET 6+: devuelve el ELEMENTO
decimal precioMax= productos.Max(p => p.Precio);          // devuelve el VALOR

// Aggregate: el "reduce" general
string csv = productos.Select(p => p.Nombre)
                      .Aggregate((acc, n) => $"{acc},{n}");       // mejor: string.Join
int factorial5 = Enumerable.Range(1, 5).Aggregate(1, (acc, x) => acc * x); // seed = 1 → 120
```

> ⚠️ `Max()`, `Min()`, `Average()` sobre una secuencia **vacía** de tipo no nullable lanzan `InvalidOperationException`. `Sum()` devuelve 0. Si puede estar vacía: `DefaultIfEmpty()` o proyecta a nullable (`Max(p => (decimal?)p.Precio)` → `null`).

### 6.7 Particionado y paginación
```csharp
int pagina = 2, tamanio = 2;
var paginaActual = productos.OrderBy(p => p.Id)       // ¡paginar SIN ordenar es no determinista en BD!
                            .Skip((pagina - 1) * tamanio)
                            .Take(tamanio);

var mientrasBaratos = productos.OrderBy(p => p.Precio).TakeWhile(p => p.Precio < 100);
var ultimos2 = productos.TakeLast(2);
var rango    = productos.Take(1..3);                  // .NET 6+: con Range
IEnumerable<Producto[]> lotes = productos.Chunk(4);   // .NET 6+: lotes de 4 (útil para batch inserts)
```

### 6.8 Conjuntos
```csharp
int[] a = [1, 2, 3, 4], b = [3, 4, 5];
a.Union(b);        // 1,2,3,4,5  (sin duplicados)
a.Intersect(b);    // 3,4
a.Except(b);       // 1,2
a.Concat(b);       // 1,2,3,4,3,4,5 (con duplicados)
a.Distinct();

// Variantes "By" (.NET 6+): comparan por una clave
var unoPorCategoria = productos.DistinctBy(p => p.Categoria);
```

> ⚠️ `Distinct`, `Union`, etc. usan `Equals`/`GetHashCode`. Con **clases** normales comparan por **referencia**; con `record` comparan por valor. Si necesitas otra cosa: `IEqualityComparer<T>` o la variante `...By`. (Igualdad en colecciones: Sesión 7.)

---

## 7. Agrupación: `GroupBy` y `ToLookup`

```csharp
var porCategoria = productos.GroupBy(p => p.Categoria);

foreach (IGrouping<string, Producto> grupo in porCategoria)
{
    Console.WriteLine($"{grupo.Key}: {grupo.Count()} productos");  // Key = clave de agrupación
    foreach (var p in grupo)                                        // el grupo ES un IEnumerable<Producto>
        Console.WriteLine($"   - {p.Nombre}");
}

// Agrupar + agregar (el "GROUP BY ... SUM" de SQL)
var resumen = productos
    .GroupBy(p => p.Categoria)
    .Select(g => new
    {
        Categoria = g.Key,
        Cantidad  = g.Count(),
        ValorInventario = g.Sum(p => p.Precio * p.Stock),
        MasCaro   = g.MaxBy(p => p.Precio)!.Nombre
    })
    .OrderByDescending(x => x.ValorInventario);

// Clave compuesta con tupla o tipo anónimo
var porCatYStock = productos.GroupBy(p => (p.Categoria, TieneStock: p.Stock > 0));

// .NET 9: CountBy / AggregateBy evitan crear los grupos intermedios
// var conteo = productos.CountBy(p => p.Categoria);   // IEnumerable<KeyValuePair<string,int>>
```

| | `GroupBy` | `ToLookup` |
|---|---|---|
| Ejecución | **Diferida** | **Inmediata** |
| Resultado | `IEnumerable<IGrouping<K,T>>` | `ILookup<K,T>` (indexable: `lookup["Pantallas"]`) |
| Clave inexistente | — | Devuelve secuencia **vacía** (no lanza, a diferencia de `Dictionary`) |
| Uso típico | Transformar y agregar | Búsquedas repetidas por clave |

---

## 8. Joins

### 8.1 Inner join
```csharp
var detalle = from v in ventas
              join p in productos on v.ProductoId equals p.Id   // 'equals', no '=='
              select new { p.Nombre, v.Cantidad, Total = v.Cantidad * p.Precio };

// Method syntax
var detalle2 = ventas.Join(productos,
                           v => v.ProductoId,        // clave externa
                           p => p.Id,                // clave interna
                           (v, p) => new { p.Nombre, v.Cantidad });
// La venta con ProductoId = 9 NO aparece (inner join)
```

`Join` construye un **lookup hash** de la secuencia interna (`productos`) → O(n + m), no O(n·m) como un doble `foreach` ingenuo.

### 8.2 Group join y left join
```csharp
// GroupJoin: cada producto con SU colección de ventas (jerárquico)
var productosConVentas = from p in productos
                         join v in ventas on p.Id equals v.ProductoId into vs
                         select new { p.Nombre, Unidades = vs.Sum(x => x.Cantidad) };

// LEFT JOIN clásico: GroupJoin + SelectMany + DefaultIfEmpty
var ventasConProducto = from v in ventas
                        join p in productos on v.ProductoId equals p.Id into ps
                        from p in ps.DefaultIfEmpty()           // null si no hay match
                        select new { v.ProductoId, Nombre = p?.Nombre ?? "(desconocido)" };

// .NET 10 añade LeftJoin/RightJoin como operadores directos.
```

> ❓ **Entrevista**: *"¿Cómo haces un left join en LINQ?"* → `GroupJoin` (`join … into`) seguido de `SelectMany` con `DefaultIfEmpty()`. Es la pregunta de LINQ más repetida después de ejecución diferida. (En .NET 10 ya existe `LeftJoin`, pero te preguntarán el patrón clásico.)

---

## 9. `IEnumerable<T>` vs `IQueryable<T>` (la pregunta estrella)

Mismos nombres de método, **mundos distintos**:

```csharp
// LINQ to Objects: System.Linq.Enumerable
public static IEnumerable<T> Where<T>(this IEnumerable<T> source, Func<T, bool> predicate);

// LINQ to Entities/SQL: System.Linq.Queryable
public static IQueryable<T> Where<T>(this IQueryable<T> source, Expression<Func<T, bool>> predicate);
```

La diferencia está en el parámetro: `Func<T,bool>` es **código compilado** (un delegate, Sesión 10) que se ejecuta en tu proceso. `Expression<Func<T,bool>>` es un **árbol de expresión**: la lambda como **datos** (un AST) que un *provider* (EF Core) puede inspeccionar y **traducir a SQL**.

```
IEnumerable<T>                                IQueryable<T>
──────────────                                ─────────────
Func<T,bool>  (IL ejecutable)                 Expression<Func<T,bool>> (árbol de datos)
Se ejecuta en MEMORIA (tu proceso)            Se TRADUCE (p. ej. a SQL) y corre en la BD
Filtra DESPUÉS de traer los datos             Filtra ANTES de traerlos (WHERE en SQL)
Cualquier método C# vale                      Solo lo que el provider sabe traducir
```

```csharp
Func<Producto, bool>             f = p => p.Precio > 100;   // delegate
Expression<Func<Producto, bool>> e = p => p.Precio > 100;   // árbol

Console.WriteLine(e.Body);             // (p.Precio > 100)  ← puedes inspeccionarlo
Console.WriteLine(e.Body.NodeType);    // GreaterThan
Func<Producto, bool> compilada = e.Compile();   // árbol → delegate
```

### 9.1 El error de producción más caro de LINQ
```csharp
// db.Productos es IQueryable<Producto> (EF Core, Sesión 25)

// ❌ AsEnumerable()/ToList() prematuro: trae TODA la tabla y filtra en memoria
var malo = db.Productos.ToList().Where(p => p.Precio > 100);
// SQL: SELECT * FROM Productos

// ❌ Igual de malo, pero más sutil: el tipo declarado cambia qué Where se elige
IEnumerable<Producto> fuente = db.Productos;       // "upcast" a IEnumerable
var tambienMalo = fuente.Where(p => p.Precio > 100); // resuelve Enumerable.Where → en memoria

// ✅ Filtra en la base de datos
var bueno = db.Productos.Where(p => p.Precio > 100).ToList();
// SQL: SELECT ... FROM Productos WHERE Precio > 100
```

> ⚠️ **La resolución es estática**: qué `Where` se usa depende del **tipo en tiempo de compilación** de la variable, no del objeto real. Un repositorio que devuelve `IEnumerable<T>` sobre EF "convierte" silenciosamente todas las consultas siguientes a LINQ to Objects.

> ⚠️ Con `IQueryable`, un método propio dentro de la lambda (`Where(p => MiValidacion(p))`) no puede traducirse a SQL → EF Core lanza `InvalidOperationException` ("could not be translated"). No es un bug: es la frontera entre ambos mundos.

> ❓ **Entrevista**: *"¿Diferencia entre `IEnumerable` e `IQueryable`?"* → `IEnumerable` ejecuta en memoria con delegates; `IQueryable` construye un expression tree que un provider traduce y ejecuta en la fuente remota. Menciona: filtrado del lado del servidor, `Expression<Func<>>` vs `Func<>`, que la resolución depende del tipo estático y el peligro de `ToList()`/`AsEnumerable()` prematuro.

---

## 10. Escribir tus propios operadores

Un operador LINQ es simplemente un **método de extensión** sobre `IEnumerable<T>` que usa `yield return`. Ejemplo útil real:

```csharp
public static class LinqExtensions
{
    /// Filtra sólo si la condición es verdadera (útil para filtros opcionales en APIs)
    public static IEnumerable<T> WhereIf<T>(this IEnumerable<T> source, bool condicion,
                                            Func<T, bool> predicate)
        => condicion ? source.Where(predicate) : source;

    /// Versión para IQueryable: recibe Expression para que EF lo traduzca a SQL
    public static IQueryable<T> WhereIf<T>(this IQueryable<T> source, bool condicion,
                                           Expression<Func<T, bool>> predicate)
        => condicion ? source.Where(predicate) : source;

    /// Ventana deslizante: [1,2,3,4] con tamaño 2 → [1,2],[2,3],[3,4]
    public static IEnumerable<T[]> Ventana<T>(this IEnumerable<T> source, int tamanio)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(tamanio);
        return Iterar();

        IEnumerable<T[]> Iterar()
        {
            var buffer = new Queue<T>(tamanio);
            foreach (var item in source)
            {
                buffer.Enqueue(item);
                if (buffer.Count > tamanio) buffer.Dequeue();
                if (buffer.Count == tamanio) yield return buffer.ToArray();
            }
        }
    }
}

// Uso: filtros opcionales de un endpoint de búsqueda
string? categoria = "Periféricos";
decimal? precioMax = null;
var resultado = productos
    .WhereIf(categoria is not null, p => p.Categoria == categoria)
    .WhereIf(precioMax is not null, p => p.Precio <= precioMax);
```

### 10.1 Secuencias infinitas (posibles solo gracias a la pereza)
```csharp
static IEnumerable<long> Fibonacci()
{
    long a = 0, b = 1;
    while (true)                 // infinito: ¡sin problema mientras nadie pida "todo"!
    {
        yield return a;
        (a, b) = (b, a + b);
    }
}

var primeros10 = Fibonacci().Take(10).ToList();     // ✅ termina
// Fibonacci().Count();  ❌ nunca termina
// Fibonacci().OrderBy(x => x).First(); ❌ OrderBy necesita TODA la secuencia
```

---

## 11. Rendimiento y trampas avanzadas

### 11.1 El coste de LINQ
LINQ to Objects tiene overhead frente a un `for`: aloca **iteradores** y **closures**, invoca **delegates** por elemento (llamada indirecta, sin inlining). En la mayoría del código de negocio es irrelevante; en *hot paths* (bucles de millones de iteraciones, servidores de alta carga) importa.

| Situación | Recomendación |
|---|---|
| Código de negocio, legibilidad | LINQ sin culpa |
| Hot path medido con BenchmarkDotNet (Sesión 30) | `for`/`foreach` o `Span<T>` (Sesión 19) |
| `.Where(...).Count()` | `.Count(pred)` — menos iteradores |
| `.Where(...).First()` | `.First(pred)` |
| `OrderBy(x).First()` | `MinBy(x)` → O(n) en vez de O(n log n) |
| Búsquedas repetidas `list.Where(x => x.Id == id)` en un bucle | `ToDictionary` una vez → O(1) |

> 💡 .NET 7/8/9 optimizaron mucho LINQ: `Sum`/`Min`/`Max` sobre arrays usan **SIMD**, y cadenas como `Where().Select()` se fusionan en un solo iterador (`WhereSelectListIterator`). Aun así, las reglas de la tabla siguen valiendo.

### 11.2 Closures que capturan variables mutables
```csharp
int umbral = 100;
var query = productos.Where(p => p.Precio > umbral);   // captura la VARIABLE, no el valor
umbral = 1000;                                          // cambia antes de enumerar
Console.WriteLine(query.Count());                      // 1 (usa umbral = 1000)
```
Este comportamiento de captura lo explicamos a fondo en la **Sesión 10**.

### 11.3 Efectos secundarios dentro de lambdas
```csharp
int contador = 0;
var q = productos.Select(p => { contador++; return p.Nombre; });
// contador == 0 aquí; y valdrá 6, 12, 18... según cuántas veces enumeres.
```
> ⚠️ Las lambdas de LINQ deberían ser **funciones puras**. LINQ no garantiza cuántas veces ni en qué orden se invocan (y con PLINQ, Sesión 29, ni siquiera en qué hilo).

### 11.4 Modificar la colección mientras se enumera
```csharp
foreach (var p in productos.Where(p => p.Stock == 0))
    productos.Remove(p);   // 💥 InvalidOperationException: Collection was modified
// ✅ productos.RemoveAll(p => p.Stock == 0);   o materializa antes con ToList()
```

---

## 12. Resumen mental de la sesión

```
LINQ = métodos de extensión (Enumerable / Queryable) + lambdas + iteradores
Query syntax ──compilador──▶ method syntax (idénticas)

EJECUCIÓN DIFERIDA: la query es una RECETA; corre al enumerar
   streaming:   Where, Select, Take, SelectMany...    (1 elemento a la vez)
   buffering:   OrderBy, GroupBy, Reverse...          (lee todo al 1er MoveNext)
   inmediatos:  ToList, Count, Sum, First, Any...     (ejecutan YA)

Enumerar 2 veces = ejecutar 2 veces → materializa con ToList() si repites
Any() > Count()>0 · First vs Single (invariante) · ThenBy, no OrderBy.OrderBy
Left join = join...into + from x in g.DefaultIfEmpty()

IEnumerable<T> → Func<>        → en memoria
IQueryable<T>  → Expression<>  → traducido (SQL) → se elige por TIPO ESTÁTICO
ToList()/AsEnumerable() prematuro = SELECT * de toda la tabla
```

---

## 13. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es la ejecución diferida? Da un ejemplo en que cause un resultado inesperado.
2. ❓ ¿Qué diferencia hay entre un operador diferido *streaming* y uno *buffering*? Clasifica `Where`, `OrderBy` y `Count`.
3. ❓ ¿Qué es la enumeración múltiple y por qué es peligrosa con `IQueryable` o `File.ReadLines`?
4. ❓ `IEnumerable<T>` vs `IQueryable<T>`: ¿qué cambia en la firma de `Where` y qué implica?
5. ❓ ¿Por qué asignar un `DbSet` a una variable `IEnumerable<T>` puede traer toda la tabla?
6. ❓ `First` vs `FirstOrDefault` vs `Single` vs `SingleOrDefault`: ¿cuándo usar cada uno?
7. ❓ ¿Cómo implementas un left join con LINQ?
8. ❓ `Select` vs `SelectMany`.
9. ❓ `GroupBy` vs `ToLookup`.
10. ❓ ¿Por qué `Any()` es preferible a `Count() > 0`? ¿Qué devuelve `All` sobre una secuencia vacía?
11. ❓ ¿Cómo escribirías tu propio operador LINQ y por qué separar la validación del iterador?
12. ❓ ¿Cuándo evitarías LINQ por rendimiento y qué usarías?

## 14. Ejercicio práctico
1. Crea `dotnet new console -o LinqLab` y pega los datos de la sección 2.
2. Reporte de ventas: con un **join**, calcula el total vendido por categoría (`Cantidad * Precio`), ordenado de mayor a menor. Hazlo en **method syntax** y en **query syntax**.
3. Haz un **left join** de `ventas` → `productos` que muestre `"(desconocido)"` para la venta del producto 9.
4. Demuestra la **ejecución diferida**: crea una query con `Console.WriteLine` dentro del `Where`, agrega un elemento a la lista *después* de crearla y enumera dos veces. Cuenta cuántas veces se imprime cada evaluación. Luego repite con `.ToList()` y compara.
5. Implementa el operador `Ventana<T>` de la sección 10 y úsalo para calcular la **media móvil de 3** de `[10, 20, 30, 40, 50]` → `[20, 30, 40]`.
6. Implementa `Fibonacci()` infinito y obtén el primer número de Fibonacci mayor a 1.000.000 (`First(x => x > 1_000_000)`).
7. (Avanzado) Construye un `Expression<Func<Producto,bool>>` a mano con `Expression.Parameter`, `Expression.Property`, `Expression.GreaterThan` y `Expression.Lambda`, compílalo y úsalo en un `Where`. Imprime `expr.ToString()`. Ese es el mecanismo que usa EF Core.

---

➡️ **Cuando termines**, marca la Sesión 9 en el [README](Readme.md) y pídeme la **Sesión 10 — Delegates, Func/Action/Predicate, lambdas y closures**.
