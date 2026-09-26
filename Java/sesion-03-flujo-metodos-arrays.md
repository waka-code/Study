# Sesión 3 — Control de flujo, métodos, scope y arrays

> **Objetivo de la sesión**: cerrar el Nivel 1. Al terminar deberías controlar el flujo de un programa (condicionales y bucles), organizar el código en métodos (incluida la sobrecarga), entender dónde "vive" cada variable (scope) y manejar arreglos de una y varias dimensiones.

---

## 1. Control de flujo

El **flujo** es el orden en que se ejecutan las instrucciones. Por defecto es de arriba abajo; las estructuras de control lo alteran.

### 1.1 `if` / `else if` / `else`

Ejecuta un bloque según una condición **booleana**:

```java
int nota = 75;

if (nota >= 90) {
    System.out.println("Excelente");
} else if (nota >= 60) {
    System.out.println("Aprobado");
} else {
    System.out.println("Reprobado");
}
```

- La condición **debe** ser `boolean` (a diferencia de C, un `int` no cuenta como condición).
- Las llaves `{}` son opcionales para una sola sentencia, pero **ponlas siempre**: evita bugs al añadir líneas después.

### 1.2 `switch` clásico

Compara una variable contra varios valores fijos:

```java
int dia = 3;
switch (dia) {
    case 1:
        System.out.println("Lunes");
        break;          // sin break, "cae" al siguiente case (fall-through)
    case 2:
        System.out.println("Martes");
        break;
    default:
        System.out.println("Otro día");
}
```

- **`break`** es crítico: sin él, la ejecución "cae" (fall-through) a los `case` siguientes. Es fuente clásica de bugs.
- Funciona con `int`, `char`, `String`, y `enum`.

### 1.3 `switch` como expresión (Java 14+)

La versión moderna: más segura (sin fall-through), devuelve un valor y usa `->`:

```java
String nombre = switch (dia) {
    case 1 -> "Lunes";
    case 2 -> "Martes";
    case 6, 7 -> "Fin de semana";   // varios valores juntos
    default -> "Otro día";
};
```

- No necesita `break` (no hay fall-through).
- Puede **retornar un valor** y asignarse a una variable.
- Para bloques con varias líneas se usa `yield` para devolver el valor:

```java
int puntos = switch (nivel) {
    case "alto" -> 100;
    case "medio" -> {
        int base = 50;
        yield base + 10;   // yield devuelve el valor del bloque
    }
    default -> 0;
};
```

> Prefiere el `switch` expresión moderno cuando puedas: elimina la clase de bugs del `break` olvidado.

### 1.4 Bucles

**`for`** — cuando sabes cuántas veces iterar:

```java
for (int i = 0; i < 5; i++) {
    System.out.println(i);   // 0,1,2,3,4
}
```

Tres partes: `inicialización; condición; actualización`.

**`while`** — repite *mientras* se cumpla la condición (puede no ejecutarse nunca):

```java
int i = 0;
while (i < 5) {
    System.out.println(i);
    i++;
}
```

**`do-while`** — igual, pero ejecuta **al menos una vez** (evalúa la condición al final):

```java
int i = 0;
do {
    System.out.println(i);
    i++;
} while (i < 5);
```

**`for-each`** (enhanced for) — recorre colecciones/arreglos sin índice:

```java
int[] numeros = {10, 20, 30};
for (int n : numeros) {
    System.out.println(n);   // "para cada n en numeros"
}
```

Úsalo cuando solo necesitas **leer** cada elemento y no te importa el índice.

### 1.5 Palabras de salto: `break`, `continue`, `return`

- **`break`**: sale del bucle (o `switch`) inmediatamente.
- **`continue`**: salta a la siguiente iteración, ignorando el resto del cuerpo.
- **`return`**: sale del **método** completo (opcionalmente devolviendo un valor).

```java
for (int i = 0; i < 10; i++) {
    if (i == 3) continue;   // se salta el 3
    if (i == 7) break;      // corta el bucle en el 7
    System.out.println(i);  // 0,1,2,4,5,6
}
```

---

## 2. Métodos

Un **método** es un bloque de código reutilizable con nombre. Evita repetir lógica y organiza el programa.

### 2.1 Anatomía

```java
public static int sumar(int a, int b) {
    return a + b;
}
//     │        │      │        │
//  retorno   nombre  parámetros  cuerpo
```

- **Tipo de retorno**: qué devuelve (`int`, `String`, `void` si no devuelve nada…).
- **Nombre**: en `camelCase` (`calcularTotal`).
- **Parámetros**: entradas tipadas, separadas por comas.
- **`return`**: devuelve el valor y termina el método. Un método `void` puede usar `return;` sin valor para salir antes.

```java
int total = sumar(3, 4);   // llamada; total = 7
```

### 2.2 Parámetros vs argumentos

- **Parámetro**: la variable en la *declaración* (`int a, int b`).
- **Argumento**: el valor real en la *llamada* (`3, 4`).

> Java pasa argumentos **por valor**: el método recibe una **copia**. Para primitivos, cambiar el parámetro dentro no afecta al original. Para objetos, la copia es de la **referencia**, así que puedes modificar el objeto apuntado, pero no reasignar la variable externa. (Concepto fino que se afianza en POO — Sesión 4.)

### 2.3 Sobrecarga (overloading)

Varios métodos con el **mismo nombre** pero **distinta lista de parámetros** (tipo, cantidad u orden). El compilador elige cuál según los argumentos:

```java
int sumar(int a, int b)          { return a + b; }
double sumar(double a, double b) { return a + b; }
int sumar(int a, int b, int c)   { return a + b + c; }

sumar(1, 2);        // usa el primero
sumar(1.5, 2.5);    // usa el segundo
sumar(1, 2, 3);     // usa el tercero
```

⚠️ El **tipo de retorno NO cuenta** para diferenciar: dos métodos que solo se distinguen por el retorno no compilan. La sobrecarga se decide por la **firma** (nombre + parámetros).

### 2.4 Métodos estáticos vs de instancia

- **Estático** (`static`): pertenece a la **clase**. Se llama con `Clase.metodo()` sin crear objeto. Ej: `Math.max(3, 5)`.
- **De instancia**: pertenece a un **objeto**. Necesitas crear el objeto: `persona.saludar()`.

```java
Math.sqrt(16);        // estático: no creas un Math
"hola".toUpperCase(); // de instancia: sobre el objeto "hola"
```

Se profundiza en la Sesión 4 (POO), pero recuerda: **`main` es estático** por eso mismo — arranca sin que exista ningún objeto.

---

## 3. Scope (ámbito de las variables)

El **scope** define **dónde es visible y vive** una variable. En Java es **de bloque**: una variable existe desde donde se declara hasta el `}` que cierra su bloque.

```java
public void ejemplo() {
    int x = 10;              // visible en todo el método
    if (x > 5) {
        int y = 20;          // visible SOLO dentro del if
        System.out.println(x + y);
    }
    // System.out.println(y); // ❌ error: y ya no existe aquí
}
```

Tipos de variables según dónde viven:

- **Locales**: declaradas dentro de un método/bloque. Solo viven ahí. **No tienen valor por defecto**: deben inicializarse antes de usarse.
- **Atributos / campos de instancia**: declarados en la clase, fuera de métodos. Viven mientras vive el objeto. **Sí tienen valor por defecto** (`0`, `false`, `null`).
- **Estáticas de clase** (`static`): compartidas por toda la clase, una sola copia.

> Java **no tiene variables globales** como otros lenguajes. Lo más parecido es un campo `public static`.

### 3.1 Shadowing (ocultamiento)

Ocurre cuando una variable local tiene el **mismo nombre** que un campo, y "tapa" al campo dentro de su ámbito. Para referirte al campo usas `this`:

```java
public class Persona {
    private String nombre = "campo";

    public void set(String nombre) {   // parámetro "nombre" tapa al campo
        nombre = nombre;          // ❌ se asigna el parámetro a sí mismo (bug)
        this.nombre = nombre;     // ✅ this.nombre = el campo; nombre = el parámetro
    }
}
```

Es una de las razones por las que verás `this.` tan seguido en los setters. (`this` a fondo en la Sesión 4.)

---

## 4. Arrays (arreglos)

Un **array** es una colección de **tamaño fijo** de elementos del **mismo tipo**, guardados de forma contigua y accesibles por **índice** (empezando en **0**).

### 4.1 Declaración e inicialización

```java
int[] numeros = new int[5];          // array de 5 int, todos en 0
int[] datos = {10, 20, 30, 40};      // con valores iniciales (literal)
String[] nombres = new String[3];    // 3 String, todos en null

numeros[0] = 100;                    // asignar por índice
int primero = datos[0];              // leer → 10
int largo = datos.length;            // tamaño → 4 (¡atributo, sin paréntesis!)
```

Puntos clave:

- El tamaño es **fijo** al crearlo; no crece. Para tamaño dinámico se usa `ArrayList` (Sesión 9).
- `.length` es un **atributo** (sin `()`), a diferencia de `String.length()` que es método.
- Acceder fuera de rango lanza **`ArrayIndexOutOfBoundsException`**:

```java
int[] a = {1, 2, 3};
a[3];   // 💥 índice válido es 0..2 → excepción
```

- Al crearlos, se rellenan con el **valor por defecto** del tipo: `0` para numéricos, `false` para `boolean`, `null` para referencias.

### 4.2 Recorrer arrays

```java
int[] datos = {10, 20, 30};

// con índice (útil si necesitas la posición)
for (int i = 0; i < datos.length; i++) {
    System.out.println(i + " -> " + datos[i]);
}

// for-each (más limpio si solo lees el valor)
for (int valor : datos) {
    System.out.println(valor);
}
```

### 4.3 Arrays multidimensionales (matrices)

Un array de arrays. El caso más común es la matriz 2D (filas × columnas):

```java
int[][] matriz = {
    {1, 2, 3},
    {4, 5, 6}
};

int valor = matriz[1][2];   // fila 1, columna 2 → 6
int filas = matriz.length;      // 2
int columnas = matriz[0].length; // 3

// recorrer con doble bucle
for (int i = 0; i < matriz.length; i++) {
    for (int j = 0; j < matriz[i].length; j++) {
        System.out.print(matriz[i][j] + " ");
    }
    System.out.println();
}
```

También se pueden crear vacías: `int[][] m = new int[2][3];` (2 filas, 3 columnas).

### 4.4 Utilidades: `Arrays`

La clase `java.util.Arrays` trae ayudantes muy usados:

```java
import java.util.Arrays;

int[] a = {3, 1, 2};
Arrays.sort(a);                    // ordena in-place → {1, 2, 3}
System.out.println(Arrays.toString(a));  // imprime "[1, 2, 3]"
int[] copia = Arrays.copyOf(a, 5); // copia con nuevo tamaño
boolean iguales = Arrays.equals(a, copia);
```

> `System.out.println(array)` directo imprime algo ilegible (`[I@1b6d3586`, la referencia). Usa `Arrays.toString(array)`.

---

## 5. Preguntas de entrevista (nivel Junior)

1. ¿Diferencia entre `while` y `do-while`?
2. ¿Qué es el fall-through en un `switch` y cómo se evita?
3. ¿Qué ventajas tiene el `switch` como expresión (Java 14+)?
4. ¿Diferencia entre `break`, `continue` y `return`?
5. ¿Qué es la sobrecarga de métodos? ¿El tipo de retorno la diferencia?
6. ¿Java pasa los argumentos por valor o por referencia?
7. ¿Qué es el scope de bloque? ¿Java tiene variables globales?
8. ¿Qué es el shadowing y cómo se resuelve?
9. ¿Desde qué índice empiezan los arrays y qué excepción da salirse de rango?
10. ¿Diferencia entre `array.length` y `String.length()`?

<details>
<summary>Respuestas resumidas</summary>

1. `while` evalúa antes (puede no ejecutarse); `do-while` ejecuta al menos una vez (evalúa al final).
2. Cuando falta `break` y la ejecución "cae" a los `case` siguientes; se evita con `break` o usando el `switch` expresión con `->`.
3. No hay fall-through, puede devolver un valor y es más conciso/seguro.
4. `break` sale del bucle; `continue` salta a la siguiente iteración; `return` sale del método.
5. Mismo nombre con distinta lista de parámetros; el tipo de retorno **no** la diferencia.
6. Siempre **por valor**: copia del primitivo, o copia de la referencia para objetos.
7. Una variable vive dentro del bloque `{}` donde se declara; Java no tiene globales (lo más cercano es `public static`).
8. Una variable local tapa a un campo con el mismo nombre; se resuelve con `this.campo`.
9. Desde **0**; salirse lanza `ArrayIndexOutOfBoundsException`.
10. `array.length` es un atributo (sin `()`); `String.length()` es un método (con `()`).

</details>

---

## 6. Práctica sugerida

1. Escribe un método `esPar(int n)` que devuelva `boolean` usando `%`.
2. Recorre un array del 1 al 10 con `for` e imprime solo los pares (usa `continue`).
3. Sobrecarga un método `saludar()` y `saludar(String nombre)`.
4. Crea una matriz 3×3, llénala con un doble bucle e imprímela.
5. Reescribe un `switch` clásico como `switch` expresión.

---

## ✅ Checklist para pasar al Nivel 2 (POO)

- [ ] Uso `if/else`, `switch` (clásico y expresión), `for`, `while`, `do-while` y `for-each`.
- [ ] Distingo `break`, `continue` y `return`.
- [ ] Escribo métodos y explico la **sobrecarga** (y que el retorno no la diferencia).
- [ ] Explico que Java pasa argumentos **por valor**.
- [ ] Entiendo el **scope de bloque** y el **shadowing** (`this`).
- [ ] Manejo arrays 1D y 2D: índice base 0, `.length`, recorrido y `Arrays.toString`.

Con esto **cierras el Nivel 1** (Sesiones 1-2-3): ya dominas la sintaxis y la lógica básica de Java. El siguiente gran salto es el **Nivel 2 — Programación Orientada a Objetos**, donde Java "empieza de verdad". Avísame y seguimos con la **Sesión 4 — Clases, objetos, constructores, `this` y encapsulamiento**.
