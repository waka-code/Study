# Sesión 2 — Variables, tipos, operadores, casting y E/S

> **Objetivo de la sesión**: manejar los ladrillos con los que se construye *todo* programa Java. Al terminar deberías distinguir tipos primitivos vs referencia, declarar constantes, usar `var`, dominar los operadores, convertir tipos con y sin riesgo (casting, autoboxing) y leer/escribir por consola.

---

## 1. Variables

Una **variable** es un espacio con nombre que guarda un valor de un **tipo** concreto. En Java **siempre** declaras el tipo (o dejas que `var` lo infiera):

```java
int edad = 30;
String nombre = "Ana";
double precio = 19.99;
```

Estructura: `tipo nombre = valor;`

En Java hay **dos grandes familias** de tipos, y entender la diferencia es clave para todo lo demás (incluida la POO y la memoria):

- **Primitivos**: guardan el **valor directamente**.
- **Referencia** (objetos): la variable guarda una **dirección** que apunta al objeto en memoria.

---

## 2. Tipos primitivos

Son 8, están integrados en el lenguaje, se escriben en minúscula y **no son objetos**. Guardan el dato en crudo.

| Tipo | Tamaño | Rango / uso | Ejemplo |
|---|---|---|---|
| `byte` | 8 bits | -128 a 127 | `byte b = 100;` |
| `short` | 16 bits | -32.768 a 32.767 | `short s = 5000;` |
| `int` | 32 bits | ±2.1 mil millones | `int i = 42;` |
| `long` | 64 bits | enteros enormes | `long l = 9_000_000_000L;` |
| `float` | 32 bits | decimal precisión simple | `float f = 3.14f;` |
| `double` | 64 bits | decimal precisión doble | `double d = 3.14;` |
| `char` | 16 bits | un carácter Unicode | `char c = 'A';` |
| `boolean` | 1 bit (lógico) | `true` / `false` | `boolean ok = true;` |

Detalles que se preguntan:

- **`int` es el entero por defecto** y **`double` el decimal por defecto**. Por eso `long` lleva sufijo `L` y `float` lleva `f` (si no, el literal `3.14` es `double` y no cabe en un `float`).
- `char` va entre **comillas simples** (`'A'`); `String` entre **comillas dobles** (`"A"`).
- Los primitivos **nunca son `null`**: un `int` no declarado vale `0`, un `boolean` vale `false` (cuando son campos de clase; las variables locales deben inicializarse antes de usarse).
- Puedes usar `_` como separador visual en números: `1_000_000`.

---

## 3. Tipos de referencia

Todo lo que **no** es primitivo es un tipo de referencia: `String`, arreglos, y cualquier clase (`Integer`, `List`, `Object`, tus propias clases…). La variable guarda una **referencia** (puntero) al objeto, no el objeto en sí.

```java
String s = "Hola";        // s apunta a un objeto String
Integer n = 42;           // wrapper: versión objeto de int
Object o = new Object();  // la clase raíz de todo en Java
```

Consecuencias importantes:

- Un tipo de referencia **sí puede ser `null`** (no apunta a nada).
- Se crean normalmente con `new` (aunque `String` y los wrappers tienen atajos).
- Comparar con `==` compara **referencias** (¿son el mismo objeto?), no contenido. Para comparar contenido se usa `.equals()` — esto se ve a fondo en POO, pero anótalo ya:

```java
String a = new String("hola");
String b = new String("hola");
System.out.println(a == b);        // false → distinto objeto
System.out.println(a.equals(b));   // true  → mismo contenido
```

### 3.1 Wrappers (envoltorios)

Cada primitivo tiene una **clase envoltorio** (wrapper) que lo representa como objeto:

| Primitivo | Wrapper |
|---|---|
| `int` | `Integer` |
| `long` | `Long` |
| `double` | `Double` |
| `boolean` | `Boolean` |
| `char` | `Character` |

Se necesitan porque las colecciones (`List`, `Map`…) **solo almacenan objetos**, no primitivos: no existe `List<int>`, sino `List<Integer>`. La conversión entre ambos es el **autoboxing** (sección 6).

---

## 4. Constantes: `final`

`final` convierte una variable en **constante**: solo se le puede asignar valor **una vez**.

```java
final double PI = 3.14159;
PI = 3.0;   // ❌ error de compilación: no se puede reasignar
```

Convención: las constantes se nombran en **MAYÚSCULAS_CON_GUIONES**. A menudo se combinan con `static`:

```java
public static final int MAX_INTENTOS = 3;
```

> Ojo: en un objeto, `final` impide reasignar la **referencia**, no modificar el objeto apuntado. `final List<String> lista = ...` no deja hacer `lista = otra`, pero sí `lista.add("x")`.

---

## 5. Inferencia de tipos: `var` (Java 10+)

`var` deja que el compilador **infiera el tipo** por el valor asignado. **Sigue siendo tipado estático** — el tipo se fija en compilación, no cambia después.

```java
var edad = 30;             // el compilador deduce int
var nombre = "Ana";        // String
var lista = new ArrayList<String>();  // ArrayList<String>
```

Reglas y límites:

- Solo para **variables locales** (dentro de métodos), y **debe inicializarse** en la misma línea (el compilador necesita el valor para inferir).
- No sirve para campos de clase, parámetros ni retornos.
- `var x;` o `var x = null;` **no compilan** (no hay tipo que inferir).
- Úsalo cuando el tipo es **obvio por el lado derecho**; evita abusar si perjudica la legibilidad.

---

## 6. Conversión de datos

### 6.1 Casting entre primitivos

Hay dos direcciones:

**Ampliación (widening)** — de tipo pequeño a grande: es **automática** y segura (no se pierde información):

```java
int i = 100;
long l = i;        // int → long: automático
double d = l;      // long → double: automático
```

**Reducción (narrowing)** — de tipo grande a pequeño: es **manual** y puede **perder datos**. Debes escribir el cast explícito:

```java
double d = 9.99;
int i = (int) d;   // i = 9  → se trunca la parte decimal (no redondea)

long grande = 300;
byte b = (byte) grande;  // desbordamiento: resultado inesperado
```

> Regla: *ampliar es gratis; reducir se paga con un cast explícito y riesgo de pérdida*.

### 6.2 Autoboxing y unboxing

Conversión automática entre primitivo y su wrapper:

- **Autoboxing**: primitivo → wrapper (`int` → `Integer`).
- **Unboxing**: wrapper → primitivo (`Integer` → `int`).

```java
Integer objeto = 5;    // autoboxing: int 5 → Integer
int primitivo = objeto; // unboxing: Integer → int

List<Integer> nums = new ArrayList<>();
nums.add(3);           // autoboxing automático al añadir
int x = nums.get(0);   // unboxing automático al leer
```

⚠️ **Trampa de entrevista**: hacer unboxing de un wrapper `null` lanza `NullPointerException`:

```java
Integer n = null;
int y = n;   // 💥 NullPointerException en tiempo de ejecución
```

### 6.3 Conversión texto ↔ número

Muy habitual al leer datos:

```java
int n = Integer.parseInt("42");        // String → int
double d = Double.parseDouble("3.14"); // String → double
String s = String.valueOf(42);         // int → String
String s2 = "" + 42;                   // truco rápido: concatenar con ""
```

---

## 7. Operadores

### 7.1 Aritméticos

```java
+   -   *   /   %      // suma, resta, mult, división, módulo (resto)
```

- **División entera**: si ambos operandos son enteros, el resultado es entero (se trunca): `7 / 2 == 3`. Para decimal, al menos uno debe ser `double`: `7.0 / 2 == 3.5`.
- **`%` (módulo)** devuelve el resto: `7 % 2 == 1`. Muy usado para paridad (`n % 2 == 0`) y ciclos.

### 7.2 Comparación (devuelven `boolean`)

```java
==   !=   >   <   >=   <=
```

Recuerda: con objetos `==` compara referencias, no contenido.

### 7.3 Lógicos

```java
&&   ||   !     // AND, OR, NOT
```

Son de **cortocircuito**: `&&` no evalúa el lado derecho si el izquierdo ya es `false`; `||` no lo evalúa si el izquierdo ya es `true`. Esto permite patrones seguros:

```java
if (usuario != null && usuario.esActivo()) { ... }
// si usuario es null, no se llama a esActivo() → no hay NPE
```

### 7.4 Asignación

```java
=   +=   -=   *=   /=   %=
```

`x += 3` es azúcar de `x = x + 3`.

### 7.5 Incremento / decremento

```java
i++   ++i   i--   --i
```

Diferencia **pre vs post**:

```java
int i = 5;
int a = i++;   // a = 5, luego i pasa a 6  (post: usa y luego incrementa)
int b = ++i;   // i pasa a 7, luego b = 7  (pre: incrementa y luego usa)
```

### 7.6 Bitwise (a nivel de bits)

```java
&   |   ^   ~   <<   >>   >>>
```

Operan sobre los bits del número (AND, OR, XOR, NOT, desplazamientos). Menos frecuentes en backend de negocio, pero aparecen en optimizaciones, flags y algoritmos. Ejemplo: `x << 1` multiplica por 2.

### 7.7 Ternario

Un `if/else` en una expresión: `condición ? valorSiTrue : valorSiFalse`.

```java
String etiqueta = (edad >= 18) ? "mayor" : "menor";
```

---

## 8. Entrada y salida por consola

### 8.1 Salida: `System.out`

```java
System.out.println("con salto de línea");
System.out.print("sin salto");
System.out.printf("Hola %s, tienes %d años%n", nombre, edad); // formateado
```

`printf` usa marcadores: `%s` (String), `%d` (entero), `%f` (decimal), `%n` (salto de línea portable).

### 8.2 Entrada: `Scanner`

La forma más común de leer del teclado:

```java
import java.util.Scanner;

Scanner scanner = new Scanner(System.in);
System.out.print("Nombre: ");
String nombre = scanner.nextLine();   // lee una línea completa
System.out.print("Edad: ");
int edad = scanner.nextInt();          // lee un entero
scanner.close();
```

Métodos: `nextLine()` (línea completa), `next()` (una palabra), `nextInt()`, `nextDouble()`, `nextBoolean()`.

> ⚠️ Trampa clásica: mezclar `nextInt()` con `nextLine()`. `nextInt()` no consume el salto de línea, así que el siguiente `nextLine()` lee "vacío". Solución: un `nextLine()` extra para descartar el sobrante.

### 8.3 Alternativas (para conocer)

- **`BufferedReader`** (`java.io`): más rápido para leer grandes volúmenes; lee texto por líneas. Requiere manejar `IOException`.
- **`System.console()`**: útil para leer contraseñas sin mostrarlas (`readPassword()`), pero es `null` dentro de muchos IDEs.
- **`PrintStream`**: es el tipo de `System.out`; rara vez lo instancias tú directamente.

Para aprender, **`Scanner`** es más que suficiente; las demás las verás con E/S de archivos (Sesión 12).

---

## 9. Preguntas de entrevista (nivel Junior)

1. ¿Cuáles son los 8 tipos primitivos de Java?
2. ¿Diferencia entre tipo primitivo y tipo de referencia?
3. ¿Por qué `long` lleva `L` y `float` lleva `f`?
4. ¿Qué diferencia hay entre `==` y `.equals()`?
5. ¿Qué es autoboxing y qué riesgo tiene?
6. ¿Diferencia entre widening y narrowing? ¿Cuál requiere cast?
7. ¿Qué hace `final`? ¿Y `static final`?
8. ¿Qué limitaciones tiene `var`?
9. ¿Cuánto vale `7 / 2` y por qué? ¿Y `7.0 / 2`?
10. ¿Diferencia entre `i++` y `++i`?

<details>
<summary>Respuestas resumidas</summary>

1. `byte, short, int, long, float, double, char, boolean`.
2. El primitivo guarda el valor directo; el de referencia guarda una dirección al objeto (y puede ser `null`).
3. Porque los literales por defecto son `int` y `double`; el sufijo indica que es `long`/`float`.
4. `==` compara referencias (mismo objeto); `.equals()` compara contenido.
5. Conversión automática primitivo→wrapper; riesgo: hacer unboxing de un wrapper `null` lanza `NullPointerException`.
6. Widening (pequeño→grande) es automático; narrowing (grande→pequeño) requiere cast explícito y puede perder datos.
7. `final` impide reasignar la variable; `static final` la hace constante compartida por toda la clase.
8. Solo variables locales, inicializadas en la misma línea; no en campos, parámetros ni con `null`.
9. `7/2 == 3` (división entera trunca); `7.0/2 == 3.5` (uno es double).
10. `i++` usa el valor y luego incrementa; `++i` incrementa y luego usa.

</details>

---

## 10. Práctica sugerida

En `jshell` o en un `main`:

1. Declara un `int`, un `double`, un `char` y un `boolean` e imprímelos con `printf`.
2. Convierte un `double` a `int` con cast y observa el truncamiento.
3. Provoca a propósito un `NullPointerException` con unboxing de un `Integer` `null`.
4. Lee tu nombre y edad con `Scanner` y saluda con `printf`.
5. Calcula si un número es par usando `%`.

---

## ✅ Checklist para pasar a la Sesión 3

- [ ] Distingo tipos **primitivos** de **referencia** (y cuál puede ser `null`).
- [ ] Recuerdo los 8 primitivos y por qué `L`/`f`.
- [ ] Entiendo `==` vs `.equals()`.
- [ ] Sé hacer **casting** (widening/narrowing) y explico autoboxing/unboxing.
- [ ] Uso `final` y `var` correctamente y conozco sus límites.
- [ ] Domino los operadores (incluidos `%`, ternario, pre/post-incremento y cortocircuito).
- [ ] Leo del teclado con `Scanner` y escribo con `printf`.

Cuando marques todo, avísame y pasamos a la **Sesión 3 — Control de flujo, métodos, scope y arrays** (cierre del Nivel 1).
