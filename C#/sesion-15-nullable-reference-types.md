# Sesión 15 — Nullable Reference Types: el fin (casi) de la NullReferenceException

> **Objetivo de la sesión**: entender *por qué* existe la característica Nullable Reference Types (NRT), *cómo* funciona realmente (spoiler: es análisis estático del compilador, **no** un cambio en el runtime), y dominar las herramientas para expresar intención sobre nulos: `?`, `!`, `??`, `??=`, `?.`, atributos como `[NotNullWhen]`, y el contexto `<Nullable>`. Al terminar deberías poder migrar un proyecto a NRT, explicar la diferencia entre `int?` y `string?`, y responder con seguridad cualquier pregunta de entrevista sobre nulos.

---

## 1. El problema: "el error de mil millones de dólares"

Tony Hoare, inventor de la referencia nula (ALGOL W, 1965), la llamó su *"billion-dollar mistake"*. En C# clásico, **toda** variable de tipo referencia (`string`, `Cliente`, `List<T>`…) puede valer `null` sin que el tipo lo diga:

```csharp
string nombre = ObtenerNombre();   // ¿puede ser null? El tipo no lo dice
Console.WriteLine(nombre.Length);  // 💥 NullReferenceException en runtime si era null
```

El compilador no tiene forma de saber tu *intención*: ¿`null` es un valor válido aquí o es un bug? Resultado: la `NullReferenceException` (NRE) es históricamente **la excepción más común** en producción .NET.

Recuerda de la Sesión 2 la diferencia value vs reference:

| Tipo | ¿Puede ser null por defecto? | Cómo hacerlo nullable |
|---|---|---|
| **Value types** (`int`, `bool`, `DateTime`, `struct`) | ❌ No | `int?` = `Nullable<int>` (desde C# 2) |
| **Reference types** (`string`, clases) | ✅ Sí, *siempre* (antes de C# 8) | — no había forma de decir "NO puede ser null" |

C# 8 (2019) introdujo **Nullable Reference Types** para cerrar esa asimetría: ahora puedes decir en el tipo si una referencia **puede** o **no puede** ser null.

---

## 2. La idea central: anotaciones + análisis de flujo

Con NRT activado:

```csharp
string  a = "hola";   // NON-NULLABLE: el compilador asume que NUNCA es null
string? b = null;     // NULLABLE: puede ser null, y te obliga a comprobarlo
```

- `string` → "prometo que nunca será null".
- `string?` → "puede ser null; quien lo use debe verificar".

El compilador hace **análisis de flujo** (*flow analysis*): sigue cada variable a lo largo del método y sabe en cada punto si su *null-state* es **"not-null"** o **"maybe-null"**.

```csharp
void Saludar(string? nombre)
{
    Console.WriteLine(nombre.Length);   // ⚠️ CS8602: Dereference of a possibly null reference

    if (nombre is null) return;         // a partir de aquí el compilador SABE que no es null

    Console.WriteLine(nombre.Length);   // ✅ sin warning: null-state = not-null
}
```

```
   parámetro string? nombre
            │  null-state: maybe-null
            ▼
   if (nombre is null) return;
            │  null-state: not-null  (el compilador "estrecha" el tipo)
            ▼
   nombre.Length  ✅
```

> ⚠️ **Lo más importante de la sesión**: NRT es **100% tiempo de compilación**. Genera **warnings**, no errores (salvo que tú los conviertas), y **no cambia el IL ni el runtime**. En runtime, `string` y `string?` son **exactamente el mismo tipo** (`System.String`). Un `string` "non-nullable" **puede** llegar a ser null (vía reflection, deserialización, código sin NRT, o `!`). Es una red de seguridad, no una garantía absoluta.

> ❓ **Entrevista**: *"¿Qué diferencia hay entre `int?` y `string?`?"* → `int?` es un **tipo real distinto**: `Nullable<int>`, un struct con `HasValue` y `Value`; cambia el IL y el layout en memoria. `string?` es solo una **anotación** para el compilador; en runtime es `string`. El compilador lo representa con el atributo `[Nullable]` en la metadata.

---

## 3. Activar NRT: el contexto nullable

Desde .NET 6, las plantillas lo traen activado en el `.csproj` (lo viste en la Sesión 1):

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

Valores posibles:

| Valor | Anotaciones (`?`) | Warnings |
|---|---|---|
| `enable` | ✅ activas | ✅ activos |
| `warnings` | ❌ (todo se considera "oblivious") | ✅ solo warnings de desreferencias |
| `annotations` | ✅ activas | ❌ sin warnings |
| `disable` | ❌ | ❌ (comportamiento pre-C# 8) |

También se puede controlar **por archivo o por región** con directivas — clave para migraciones graduales:

```csharp
#nullable enable      // activa anotaciones + warnings desde aquí
#nullable disable     // desactiva
#nullable restore     // vuelve a lo que diga el .csproj
#nullable enable warnings   // solo una de las dos partes
```

Y para ser estricto, convierte los warnings en errores:

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
  <WarningsAsErrors>nullable</WarningsAsErrors>  <!-- todos los CS86xx como error -->
</PropertyGroup>
```

> 💡 **Estrategia de migración** en un proyecto legacy grande: `<Nullable>warnings</Nullable>` primero (ves los riesgos sin cambiar nada), luego `#nullable enable` archivo por archivo, empezando por las capas más bajas (modelos, utilidades), y al final `enable` global + `WarningsAsErrors`.

### 3.1 "Oblivious": el tercer estado
El código compilado **sin** NRT (librerías viejas) es *oblivious* ("inconsciente"): el compilador no sabe si sus tipos admiten null y **no emite warnings** al usarlos. Por eso una API legacy puede devolverte null "sin avisar".

---

## 4. Los operadores de nulos (caja de herramientas)

```csharp
string? entrada = Console.ReadLine();       // ReadLine devuelve string? (EOF → null)

// ?.  Null-conditional: si es null, toda la expresión da null (no lanza)
int? largo = entrada?.Length;               // int? porque puede no haber valor

// ?[] Null-conditional con índice
char? primera = entrada?[0];

// ??  Null-coalescing: valor por defecto si la izquierda es null
string nombre = entrada ?? "Anónimo";       // resultado: string (not-null)

// ??= Null-coalescing assignment: asigna SOLO si es null (C# 8)
List<string>? cache = null;
cache ??= new List<string>();               // inicialización perezosa
cache.Add("x");                             // ✅ el compilador sabe que ya no es null

// throw expression con ??: validar en una línea
string requerido = entrada ?? throw new ArgumentNullException(nameof(entrada));

// !  Null-forgiving ("damn-it operator"): "confía en mí, compilador, no es null"
string forzado = entrada!;                  // silencia el warning. NO hace nada en runtime.
```

| Operador | Nombre | Efecto en runtime | Uso típico |
|---|---|---|---|
| `?.` / `?[]` | Null-conditional | Corta la cadena si es null | Navegar objetos opcionales |
| `??` | Null-coalescing | Devuelve la derecha si izquierda es null | Valores por defecto |
| `??=` | Null-coalescing assignment | Asigna si es null | Lazy init |
| `!` (postfijo) | Null-forgiving | **Ninguno** | Callar un falso positivo |

> ⚠️ **El `!` es un olor de código si abusas de él**. No valida nada: si te equivocas, la NRE llega igual, solo que ahora sin warning. Úsalo cuando **tú sabes algo que el compilador no puede saber** (ej. tests, o tras una validación en otro método sin atributos). Si lo usas mucho, probablemente tus anotaciones están mal.

> ⚠️ `?.` con eventos/delegados: `Changed?.Invoke(this, e);` es el patrón thread-safe estándar (Sesión 11), porque evalúa la referencia **una sola vez**.

> ❓ **Entrevista**: *"¿`!` lanza excepción si el valor es null?"* → No. Es solo una anotación para el compilador; no genera código. El IL resultante es idéntico con o sin `!`.

---

## 5. Patrones de comprobación y el análisis de flujo

El compilador entiende muchas formas de comprobar null:

```csharp
void Procesar(string? s)
{
    if (s is null) return;             // ✅ recomendado: no se puede sobrecargar ==
    if (s is not null) { /* ... */ }   // ✅ C# 9
    if (s != null) { /* ... */ }       // ✅ funciona, pero == puede estar sobrecargado
    if (s is { } valor) { /* valor es string not-null */ } // property pattern vacío (Sesión 16)
    if (string.IsNullOrEmpty(s)) return; // ✅ entiende IsNullOrEmpty gracias a atributos (§7)

    ArgumentNullException.ThrowIfNull(s);          // .NET 6+: validación de guardia
    ArgumentException.ThrowIfNullOrEmpty(s);       // .NET 7+
    ArgumentException.ThrowIfNullOrWhiteSpace(s);  // .NET 8+
}
```

> 💡 Prefiere `is null` / `is not null` sobre `== null`: un tipo puede sobrecargar `operator ==` (Unity lo hace famosamente), y `is null` siempre compara la referencia real.

### 5.1 Límites del análisis de flujo
El análisis es **local al método** y conservador. No sigue estado entre llamadas:

```csharp
class Pedido
{
    public Cliente? Cliente { get; set; }

    public void Enviar()
    {
        if (Cliente is null) return;
        Validar();                        // el compilador NO sabe si Validar() cambió Cliente
        Console.WriteLine(Cliente.Nombre); // ✅ en la práctica NO avisa: asume que las llamadas
                                          //    no invalidan el estado (decisión pragmática)
    }
    void Validar() { Cliente = null; }    // ...y aquí está el agujero: NRE posible
}
```

> ⚠️ Con propiedades y campos, el análisis es **optimista**: tras comprobar `Cliente`, supone que sigue sin ser null aunque llames otros métodos. En código multihilo o con efectos secundarios, copia a una variable local: `var c = Cliente; if (c is null) return;`.

---

## 6. Clases, constructores y el warning CS8618

El warning más frecuente al activar NRT:

```csharp
public class Usuario
{
    public string Nombre { get; set; }   // ⚠️ CS8618: Non-nullable property 'Nombre' must contain
                                         //    a non-null value when exiting constructor.
}
```

El compilador exige que toda propiedad/campo non-nullable quede inicializado al salir del constructor. Soluciones, de mejor a peor según el caso:

```csharp
// 1) Inicializarla en el constructor (la más honesta)
public class Usuario1
{
    public Usuario1(string nombre) => Nombre = nombre;
    public string Nombre { get; }
}

// 2) Valor por defecto razonable
public class Usuario2
{
    public string Nombre { get; set; } = "";
    public List<string> Roles { get; set; } = [];   // collection expression (Sesión 18)
}

// 3) `required` (C# 11): obliga a asignarla en el object initializer (ideal para DTOs)
public class Usuario3
{
    public required string Nombre { get; init; }   // init-only: Sesión 6 y 17
}
var u = new Usuario3 { Nombre = "Ana" };  // ✅
// var x = new Usuario3();                // ❌ CS9035: Required member 'Nombre' must be set

// 4) Declararla nullable si de verdad es opcional
public class Usuario4
{
    public string? SegundoNombre { get; set; }
}

// 5) `= null!` — "se inicializará después" (EF Core, frameworks de DI/serialización)
public class Pedido
{
    public int Id { get; set; }
    public Cliente Cliente { get; set; } = null!;  // EF Core la rellena al cargar (Sesión 25)
}
```

> ❓ **Entrevista**: *"¿Qué hace `required`? ¿Sustituye a la validación?"* → `required` es un chequeo de **compilación**: obliga a quien crea el objeto a asignar el miembro en el inicializador. Pero puede asignarse explícitamente `null!`, y los deserializadores/reflection lo pueden saltar (System.Text.Json sí respeta `required` desde .NET 7 y lanza `JsonException` si falta). No sustituye validar datos de entrada.

> ⚠️ `[SetsRequiredMembers]` en un constructor le dice al compilador que ese constructor ya asigna todos los `required`, para poder usar `new Usuario3("Ana")` sin inicializador.

---

## 7. Atributos de análisis nullable (`System.Diagnostics.CodeAnalysis`)

A veces `?` no basta para expresar el contrato de un método. Por ejemplo, el famoso patrón `TryGet`:

```csharp
bool TryObtener(int id, out Cliente? cliente);   // si devuelve true... ¿cliente es null?
```

Los atributos enseñan al compilador la **semántica** del método:

```csharp
using System.Diagnostics.CodeAnalysis;

public class Repositorio
{
    private readonly Dictionary<int, Cliente> _datos = new();

    // "si devuelvo true, 'cliente' NO es null"
    public bool TryObtener(int id, [NotNullWhen(true)] out Cliente? cliente)
        => _datos.TryGetValue(id, out cliente);

    // "si devuelvo false, el parámetro NO era null" (así funciona string.IsNullOrEmpty)
    public static bool EsVacio([NotNullWhen(false)] string? s) => string.IsNullOrEmpty(s);

    // "este método nunca retorna normalmente" (siempre lanza)
    [DoesNotReturn]
    public static void Fallar(string msg) => throw new InvalidOperationException(msg);

    // "tras llamarme, 'valor' NO es null" (validación tipo guard)
    public static void AsegurarNoNulo([NotNull] object? valor)
    {
        if (valor is null) throw new ArgumentNullException(nameof(valor));
    }

    // "el retorno es no-null si el argumento 'fallback' es no-null"
    [return: NotNullIfNotNull(nameof(fallback))]
    public static string? Primero(string[] items, string? fallback)
        => items.Length > 0 ? items[0] : fallback;

    // "tras llamar a este método, estos miembros ya no son null"
    private string? _conexion;
    [MemberNotNull(nameof(_conexion))]
    private void Inicializar() => _conexion = "Server=...";
}

// Uso:
var repo = new Repositorio();
if (repo.TryObtener(1, out var c))
    Console.WriteLine(c.Nombre);   // ✅ sin warning gracias a [NotNullWhen(true)]

public record Cliente(string Nombre);
```

| Atributo | Dónde | Significado |
|---|---|---|
| `[AllowNull]` | parámetro/propiedad de entrada | Acepta null aunque el tipo sea non-nullable |
| `[DisallowNull]` | entrada | No aceptes null aunque el tipo sea `T?` |
| `[MaybeNull]` | salida/retorno | Puede devolver null aunque el tipo diga que no |
| `[NotNull]` | salida / parámetro | Tras la llamada, no es null |
| `[NotNullWhen(bool)]` | parámetro `out`/entrada | No es null si el método retorna ese bool |
| `[MaybeNullWhen(bool)]` | parámetro `out` | Puede ser null si retorna ese bool |
| `[NotNullIfNotNull(param)]` | retorno | No-null si ese parámetro era no-null |
| `[MemberNotNull(...)]` | método | Tras llamarlo, esos campos no son null |
| `[DoesNotReturn]` | método | Nunca retorna (lanza siempre) |

> ❓ **Entrevista**: *"¿Cómo sabe el compilador que tras `if (!string.IsNullOrEmpty(s))` la variable `s` no es null?"* → Porque `IsNullOrEmpty` está anotado con `[NotNullWhen(false)] string? value`. No hay magia especial: es el mismo mecanismo que puedes usar tú.

---

## 8. Nullable y generics: el caso `T?`

Aquí está la parte fina (conecta con la Sesión 8). `T?` significa cosas distintas según las constraints:

```csharp
// Con 'where T : struct'  → T? es Nullable<T>  (tipo real)
T? A<T>(T x) where T : struct => null;         // int? , DateTime?...

// Con 'where T : class'   → T? es anotación de referencia nullable
T? B<T>(T x) where T : class => null;          // string? , Cliente?...

// SIN constraint (C# 9+)  → T? significa "default(T) posible":
//   para referencias: puede ser null; para value types: ¡es T, NO Nullable<T>!
T? C<T>(IEnumerable<T> xs) => xs.FirstOrDefault();
// C<int>(new int[0])  → devuelve 0, no null. El tipo de retorno es int, no int?.
```

Constraints útiles:

| Constraint | Significado |
|---|---|
| `where T : class` | T es referencia **non-nullable** |
| `where T : class?` | T es referencia, nullable o no |
| `where T : notnull` | T no puede ser nullable (ni `int?` ni `string?`) — p.ej. claves de `Dictionary<TKey,TValue>` |
| `where T : struct` | T es value type non-nullable |

> ⚠️ Trampa: `FirstOrDefault()` sobre `List<int>` vacía devuelve `0`, no `null`. Si necesitas distinguir "no hay" de "es cero", usa `int?` explícito o `TryXxx`.

---

## 9. NRT en el mundo real: ASP.NET Core, EF Core y JSON

- **ASP.NET Core** (Sesión 23): con NRT activo, las propiedades non-nullable de un DTO se tratan como **`[Required]` implícito** en la validación de model binding. Un `string?` es opcional; un `string` ausente produce `400 Bad Request`.
- **EF Core** (Sesión 25): la nulabilidad del tipo define la columna: `string Nombre` → `NOT NULL`; `string? Notas` → `NULL`. ¡Cambiar un `?` genera una migración!
- **System.Text.Json**: no aplica NRT por defecto — puede asignar null a una propiedad `string`. Desde .NET 9 existe `JsonSerializerOptions.RespectNullableAnnotations = true` para hacerlo cumplir.

```csharp
// DTO de entrada en un controller [ApiController]
// (en Minimal APIs de .NET 8 no hay validación de modelo automática: debes validar tú)
public record CrearClienteDto(
    string Nombre,          // requerido: 400 si falta (validación MVC con NRT)
    string? Telefono,       // opcional
    int Edad);
```

> ⚠️ **Nunca confíes en NRT en las fronteras del sistema** (JSON entrante, BD, reflection, código de terceros oblivious). Valida explícitamente ahí. NRT protege el **interior** de tu código.

---

## 10. Casos límite que suelen preguntar

```csharp
// 1) Arrays: el compilador no rastrea elementos
string[] arr = new string[3];     // ¡contiene 3 nulls! y no hay warning
Console.WriteLine(arr[0].Length); // 💥 NRE sin aviso

// 2) default de struct con campos de referencia
struct Envoltorio { public string Texto; }
var e = default(Envoltorio);      // e.Texto es null, sin warning

// 3) La propiedad "not-null" que el deserializador deja en null
// var u = JsonSerializer.Deserialize<Usuario>("{}"); // u.Nombre == null aunque sea 'string'

// 4) Nullable y var: 'var' siempre infiere el tipo como NULLABLE para referencias
var s = "hola";   // tipo declarado: string? — pero su null-state es not-null, así que no molesta
s = null;         // ✅ permitido (porque var es string?)

// 5) Nullable<T> sobre value types — repaso
int? n = null;
int valor = n ?? 0;
int valor2 = n.GetValueOrDefault();
if (n.HasValue) Console.WriteLine(n.Value);  // n.Value con HasValue=false → InvalidOperationException
```

> ❓ **Entrevista**: *"¿NRT elimina por completo las NullReferenceException?"* → No. Reduce drásticamente las del código propio, pero quedan agujeros: arrays, `default` de structs, código oblivious, deserialización, reflection, abuso de `!`, y el análisis optimista de campos. Es análisis estático, no garantía de runtime (a diferencia de, por ejemplo, `Option` de Rust o Kotlin, que sí está en el sistema de tipos del runtime/compilador de forma sólida).

---

## 11. Comparativa rápida con otros lenguajes

| Lenguaje | Mecanismo | ¿Garantía sólida? |
|---|---|---|
| **C# (NRT)** | `T?` anotación + análisis de flujo, warnings | ❌ Best-effort, retrocompatible |
| **Kotlin** | `T?` en el sistema de tipos, errores de compilación | ✅ Casi (salvo interop con Java: *platform types*) |
| **TypeScript** | `strictNullChecks`: `T \| null` | ⚠️ Solo en compilación, se borra en JS |
| **Rust** | `Option<T>`, no existe null | ✅ |
| **Java** | `Optional<T>` + anotaciones `@Nullable` | ❌ Convención |

C# eligió warnings y no errores porque tenía **20 años de código existente**: un cambio que rompiera todo era inaceptable.

---

## Resumen mental de la sesión

```
NRT (C# 8) = ANOTACIONES + ANÁLISIS DE FLUJO en COMPILACIÓN
   string   → non-nullable (prometo no-null)
   string?  → nullable (debes comprobar)
   En runtime: string == string?   (solo metadata [Nullable])
   int?     → Nullable<int>, un TIPO REAL distinto

Activar:  <Nullable>enable</Nullable>  ·  #nullable enable/disable/restore
Estricto: <WarningsAsErrors>nullable</WarningsAsErrors>

Operadores:  ?.  ?[]  ??  ??=  throw-expr   ·   !  (solo calla, no valida)
Checks:      is null / is not null  ·  ArgumentNullException.ThrowIfNull
CS8618:      ctor · valor por defecto · required · T? · = null! (frameworks)
Atributos:   [NotNullWhen] [MaybeNull] [NotNull] [MemberNotNull] [DoesNotReturn]...
Generics:    T? sin constraint = "default posible", no Nullable<T>  ·  where T : notnull
Fronteras (JSON, BD, reflection) → VALIDA igual: NRT no es garantía
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué problema resuelve NRT y en qué versión de C# apareció?
2. ❓ ¿Diferencia entre `int?` y `string?` a nivel de runtime e IL?
3. ❓ ¿NRT produce errores o warnings? ¿Cómo lo harías estricto?
4. ❓ ¿Qué hace el operador `!` en runtime? ¿Cuándo es legítimo usarlo?
5. ❓ ¿Diferencia entre `??` y `??=`? Da un caso de uso de cada uno.
6. ❓ ¿Por qué preferir `is null` frente a `== null`?
7. ❓ ¿Qué es el warning CS8618 y qué opciones tienes para resolverlo?
8. ❓ ¿Para qué sirve `[NotNullWhen(true)]`? Explica cómo `string.IsNullOrEmpty` "enseña" al compilador.
9. ❓ ¿Qué significa `T?` en un método genérico sin constraints? ¿Y `where T : notnull`?
10. ❓ ¿Qué es el estado "oblivious"?
11. ❓ ¿Cómo migrarías gradualmente un proyecto legacy de 500k líneas a NRT?
12. ❓ Nombra tres formas en que un `string` non-nullable puede terminar valiendo null en runtime.

## Ejercicio práctico
1. Crea un proyecto: `dotnet new console -o NullDemo` y confirma que el `.csproj` tiene `<Nullable>enable</Nullable>`.
2. Escribe una clase `Usuario` con `Nombre`, `Email` y `SegundoNombre` sin inicializar. Compila (`dotnet build`) y lee los warnings CS8618. Resuélvelos usando **tres técnicas distintas** (ctor, `required`, `?`).
3. Implementa `bool TryBuscarUsuario(string email, [NotNullWhen(true)] out Usuario? usuario)` sobre un `Dictionary`. Verifica que al usarlo dentro de `if` no hay warnings; luego quita el atributo y observa el warning CS8602.
4. Agrega `<WarningsAsErrors>nullable</WarningsAsErrors>` y comprueba que ahora el build falla ante una desreferencia insegura.
5. Demuestra un agujero: crea `string[] arr = new string[2];` y accede a `arr[0].Length`. Observa que no hay warning pero sí NRE en runtime.
6. (Opcional avanzado) Abre el `.dll` con un descompilador (ILSpy / `dotnet-ildasm`) y comprueba que `string` y `string?` generan el mismo tipo, con el atributo `[Nullable]` en la metadata.

---

➡️ **Cuando termines**, marca la Sesión 15 en el [README](Readme.md) y pídeme la **Sesión 16 — Pattern Matching**.
