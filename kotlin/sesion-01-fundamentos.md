# Sesión 1 — Fundamentos de Kotlin

> **Objetivo de la sesión:** dominar las bases del lenguaje: variables, tipos, operadores, strings y control de flujo (`if`, `when`, `for`, `while`). Al terminar deberías poder leer y escribir código Kotlin básico sin dudar.

Corresponde a los **Niveles 0 y 1** del roadmap.

---

## 1. ¿Qué es Kotlin? (contexto mínimo)

- Lenguaje moderno creado por **JetBrains** (2011), corre principalmente sobre la **JVM** (igual que Java, 100% interoperable con Java).
- Lenguaje **oficial de Android** desde 2017 (recomendado por Google).
- También sirve para **backend** (Spring Boot, Ktor), **multiplataforma** (KMP) e incluso compilar a JavaScript y nativo.
- Es **conciso**, **seguro contra nulos** y **expresivo**: muchas cosas que en Java son ceremonia, en Kotlin son una línea.

**Cómo se ejecuta un programa:** el punto de entrada es la función `main`.

```kotlin
fun main() {
    println("Hola Mundo")
}
```

> 💡 Puedes probar todo el código de esta sesión gratis en el navegador: **[play.kotlinlang.org](https://play.kotlinlang.org)**. No necesitas instalar nada todavía.

---

## 2. Variables: `val` vs `var`

Esta es la primera regla que debes interiorizar.

```kotlin
val nombre = "Juan"     // Inmutable — NO se puede reasignar
var edad = 20           // Mutable — SÍ se puede reasignar
```

- `val` (**value**) → constante de solo lectura. Equivale a `final` en Java.
- `var` (**variable**) → se puede cambiar su valor.

```kotlin
val nombre = "Juan"
nombre = "Pedro"   // ❌ ERROR de compilación

var edad = 20
edad = 21          // ✅ OK
```

### 🔑 Regla de oro
**Usa siempre `val` por defecto.** Solo cambia a `var` cuando *realmente* necesites reasignar la variable. Esto hace tu código más predecible y seguro (fundamental para concurrencia, que verás más adelante).

> ⚠️ `val` significa que la *referencia* no cambia, no que el objeto sea inmutable. Un `val` que apunta a una lista mutable sigue permitiendo modificar la lista. Lo veremos en la sesión de colecciones.

---

## 3. Tipos de datos

Kotlin es de **tipado estático**: cada variable tiene un tipo conocido en compilación.

### Tipos numéricos
| Tipo    | Tamaño   | Ejemplo             |
|---------|----------|---------------------|
| `Byte`  | 8 bits   | `val b: Byte = 127` |
| `Short` | 16 bits  | `val s: Short = 32000` |
| `Int`   | 32 bits  | `val i: Int = 10`   |
| `Long`  | 64 bits  | `val l: Long = 10L` |
| `Float` | 32 bits  | `val f: Float = 3.14f` |
| `Double`| 64 bits  | `val d: Double = 3.14` |

### Otros tipos
| Tipo      | Descripción            | Ejemplo                |
|-----------|------------------------|------------------------|
| `Boolean` | verdadero/falso        | `val activo = true`    |
| `Char`    | un solo carácter       | `val letra = 'A'`      |
| `String`  | cadena de texto        | `val texto = "Hola"`   |

### Declaración explícita vs inferencia

```kotlin
val numero: Int = 10   // Tipo explícito
val numero = 10        // Inferencia: Kotlin deduce que es Int
```

> 💡 Prefiere la **inferencia** cuando el tipo es obvio. Sé explícito cuando aporte claridad (por ejemplo en firmas de funciones o cuando el literal es ambiguo).

### Detalles importantes que suelen sorprender
- Los números **NO se convierten automáticamente** entre tipos. Debes convertir explícitamente:

```kotlin
val i: Int = 10
val l: Long = i.toLong()   // necesario, no basta con asignar
val d: Double = i.toDouble()
```

- Sufijos de literales: `L` para `Long`, `f`/`F` para `Float`.
- Separador visual con guion bajo (solo legibilidad): `val millon = 1_000_000`.

---

## 4. Operadores

### Aritméticos
```kotlin
+   // suma
-   // resta
*   // multiplicación
/   // división
%   // resto (módulo)
```

> ⚠️ Ojo con la división entera: `7 / 2` da `3` (no `3.5`), porque ambos son `Int`. Para decimales: `7.0 / 2` → `3.5`.

### De comparación
```kotlin
==   // igual (compara VALOR / contenido)
!=   // distinto
>    // mayor que
<    // menor que
>=   // mayor o igual
<=   // menor o igual
```

> 💡 En Kotlin `==` compara **contenido** (llama a `equals()`). Para comparar **identidad de referencia** se usa `===`. Esto es distinto de Java, donde `==` compara referencias.

### Lógicos
```kotlin
&&   // AND — verdadero si ambos son verdaderos
||   // OR  — verdadero si al menos uno es verdadero
!    // NOT — niega
```

`&&` y `||` son **cortocircuito**: si el primer operando ya define el resultado, el segundo no se evalúa.

---

## 5. Strings

### Interpolación (String Templates)
La forma idiomática de construir texto. Nada de concatenar con `+`.

```kotlin
val nombre = "Carlos"
println("Hola $nombre")                 // variable simple con $
println("Resultado ${10 + 5}")          // expresión con ${...}
println("Nombre en mayúsculas: ${nombre.uppercase()}")
```

- `$variable` → para una variable directa.
- `${expresión}` → para cualquier expresión (llamadas a métodos, operaciones, etc.).

### Strings multilínea (raw strings)
Con triple comilla `"""`. No interpretan caracteres de escape (`\n`, etc.).

```kotlin
val texto = """
    Hola
    Mundo
""".trimIndent()   // trimIndent() quita la indentación común
```

### Operaciones útiles con Strings
```kotlin
val s = "Kotlin"
s.length            // 6
s.uppercase()       // "KOTLIN"
s.lowercase()       // "kotlin"
s.first()           // 'K'
s.last()            // 'n'
s.contains("otl")   // true
s.startsWith("Ko")  // true
s[0]                // 'K' (acceso por índice)
```

---

## 6. Control de flujo

### 6.1 `if`

Como sentencia (igual que en la mayoría de lenguajes):

```kotlin
if (edad >= 18) {
    println("Mayor de edad")
} else {
    println("Menor de edad")
}
```

**Lo poderoso:** en Kotlin `if` es una **expresión** — devuelve un valor. Por eso Kotlin **no tiene operador ternario** (`? :`), no lo necesita:

```kotlin
val mensaje = if (edad >= 18) "Mayor" else "Menor"
```

Con bloques, el valor devuelto es la **última línea** de cada rama:

```kotlin
val descuento = if (esClienteVip) {
    println("Aplicando VIP")
    0.20            // este es el valor que se asigna
} else {
    0.0
}
```

### 6.2 `when` — el superpoder de Kotlin

Reemplaza al `switch` de Java, pero mucho más flexible. También es una **expresión**.

**Forma básica:**
```kotlin
when (numero) {
    1 -> println("Uno")
    2 -> println("Dos")
    else -> println("Otro")
}
```

**Como expresión (devolviendo valor):**
```kotlin
val texto = when (numero) {
    1 -> "Uno"
    2 -> "Dos"
    else -> "Otro"
}
```

**Con rangos (`in`):**
```kotlin
val categoria = when (edad) {
    in 0..12   -> "Niño"
    in 13..17  -> "Adolescente"
    in 18..64  -> "Adulto"
    else       -> "Adulto mayor"
}
```

**Varios valores en una rama:**
```kotlin
when (dia) {
    "sábado", "domingo" -> println("Fin de semana")
    else -> println("Día laboral")
}
```

**Sin argumento (como cadena de `if/else if`):**
```kotlin
val resultado = when {
    temperatura < 0   -> "Congelando"
    temperatura < 20  -> "Frío"
    temperatura < 30  -> "Templado"
    else              -> "Calor"
}
```

> 💡 Cuando usas `when` **como expresión**, el `else` suele ser obligatorio (el compilador exige cubrir todos los casos). Más adelante, con `enum` y `sealed class`, verás cuándo puedes omitirlo.

### 6.3 Rangos (`ranges`)

Los usarás constantemente con `for` y `when`:

```kotlin
1..10       // del 1 al 10 (ambos incluidos)
1 until 10  // del 1 al 9 (10 excluido)
10 downTo 1 // del 10 al 1 (descendente)
1..10 step 2 // 1, 3, 5, 7, 9
```

Comprobar pertenencia:
```kotlin
if (edad in 18..65) { ... }
if (letra !in 'a'..'z') { ... }
```

### 6.4 `for`

Kotlin no tiene `for` clásico de C (`for(i=0; i<n; i++)`). Siempre itera sobre algo:

```kotlin
for (i in 1..10) {
    println(i)
}

for (i in 1..10 step 2) { }     // de 2 en 2
for (i in 10 downTo 1) { }      // descendente
for (i in 0 until 5) { }        // 0,1,2,3,4

// Sobre una colección
val nombres = listOf("Ana", "Luis", "Sofía")
for (nombre in nombres) {
    println(nombre)
}

// Con índice
for ((indice, nombre) in nombres.withIndex()) {
    println("$indice: $nombre")
}
```

### 6.5 `while` y `do-while`

```kotlin
var x = 0
while (x < 10) {
    x++
}

do {
    x--
} while (x > 0)   // se ejecuta al menos una vez
```

### 6.6 `break` y `continue`
```kotlin
for (i in 1..10) {
    if (i == 5) break      // sale del bucle
    if (i % 2 == 0) continue // salta a la siguiente iteración
    println(i)
}
```

---

## 7. Resumen mental de la sesión

- `val` por defecto, `var` solo si necesitas reasignar.
- Tipos estáticos, **sin conversión numérica automática** (`toLong()`, `toDouble()`…).
- `==` compara **contenido** (no referencias como en Java).
- Interpolación con `$` y `${}` en vez de concatenar.
- `if` y `when` son **expresiones** que devuelven valor.
- `when` reemplaza al `switch` y es muchísimo más potente (rangos, múltiples valores, sin argumento).
- `for` siempre itera sobre rangos o colecciones.

---

## 8. Ejercicios (hazlos en [play.kotlinlang.org](https://play.kotlinlang.org))

1. **Variables y tipos:** declara tu nombre (`val`), tu edad (`var`) y súmale 1 a la edad. Imprime ambos con interpolación.

2. **Conversión:** dado `val entero = 7` y `val divisor = 2`, imprime el resultado de la división como decimal (debe dar `3.5`, no `3`).

3. **Clasificador de edad con `when`:** escribe una función mental o directa que, dada una edad, imprima "Niño" (0-12), "Adolescente" (13-17), "Adulto" (18-64) o "Adulto mayor" (65+). Usa rangos.

4. **FizzBuzz:** recorre del 1 al 30. Si el número es divisible por 3 imprime "Fizz", por 5 "Buzz", por ambos "FizzBuzz", si no el número. (Pista: `%` y `when { }` sin argumento).

5. **`if` como expresión:** dado un booleano `esVip`, asigna a una variable `descuento` el valor `0.20` si es VIP o `0.0` si no, en una sola línea.

6. **Tabla de multiplicar:** pide un número (usa uno fijo, ej. `7`) e imprime su tabla del 1 al 10 usando un `for`.

> Cuando termines los ejercicios y te sientas cómodo con esto, avísame y pasamos a la **Sesión 2: Funciones y Null Safety** (Niveles 2 y 3).

---

## Próximas sesiones (mapa)

| Sesión | Contenido | Niveles |
|--------|-----------|---------|
| **1** ✅ | Fundamentos: variables, tipos, control de flujo | 0-1 |
| 2 | Funciones + Null Safety | 2-3 |
| 3 | Clases y Programación Orientada a Objetos | 4-5 |
| 4 | Data Classes, Collections y Lambdas | 6-8 |
| 5 | Funciones de colecciones + Extension Functions | 9-10 |
| 6 | Scope Functions, Sealed, Enum, Object | 11-14 |
| 7 | Generics y Delegation | 15-16 |
| 8 ⭐ | Coroutines y Flow | 17 |
| … | (Funcional, DSL, Testing, Backend/Android, Arquitectura, Performance, JVM) | 18-33 |
