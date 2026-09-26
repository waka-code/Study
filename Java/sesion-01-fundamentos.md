# Sesión 1 — Fundamentos de Java

> **Objetivo de la sesión**: entender *qué es* Java, *por qué* existe y qué lo hace especial (la JVM y el bytecode). Al terminar deberías poder explicar la diferencia entre JDK/JRE/JVM, qué significa "compilar una vez, ejecutar en cualquier lado", cómo se compila e interpreta el código, y escribir + entender línea por línea tu primer programa.

---

## 1. ¿Qué es Java?

Java es un **lenguaje de programación** de propósito general, **orientado a objetos**, con **tipado estático y fuerte**, creado por **James Gosling** en **Sun Microsystems** (1995) y hoy mantenido por **Oracle** (con OpenJDK como implementación de referencia abierta).

Sus tres ideas de venta históricas:

1. **"Write Once, Run Anywhere" (WORA)**: compilas una vez y el mismo programa corre en Windows, Linux, Mac o un servidor, sin recompilar.
2. **Gestión automática de memoria**: no manejas `malloc`/`free` como en C; un **Garbage Collector** libera la memoria por ti.
3. **Robusto y seguro**: tipado estático (errores en compilación, no en producción), sin punteros crudos, con verificación de bytecode.

> Es de los lenguajes más usados del mundo para **backend empresarial**, Android (histórico), Big Data (Hadoop, Spark), y sistemas de banca/retail de alta escala.

### 1.1 Tipado estático y fuerte

- **Estático**: el tipo de cada variable se conoce y verifica en **tiempo de compilación**. Si escribes `int x = "hola";` no compila.
- **Fuerte**: no hay conversiones implícitas peligrosas; el lenguaje no adivina. Debes convertir explícitamente cuando hay riesgo de pérdida de datos.

Compáralo con Python (dinámico: el tipo se resuelve en ejecución) o JavaScript (débil: `"5" + 3` produce `"53"`).

---

## 2. La pieza clave: la JVM

Lo que hace único a Java **no es el lenguaje, es la máquina virtual**. Este es el concepto más importante de la sesión.

```
Tu código          Compilación          Ejecución
─────────          ───────────          ─────────
Main.java   ──▶  javac  ──▶  Main.class  ──▶  JVM  ──▶  CPU/SO
(texto)          (compilador)  (bytecode)      (traduce a
                                                 código máquina)
```

1. Escribes **código fuente** en un archivo `.java` (texto plano).
2. El compilador **`javac`** lo traduce a **bytecode** (archivo `.class`).
3. La **JVM** lee ese bytecode y lo **ejecuta** en la máquina concreta.

El bytecode **no es código máquina** (no lo entiende la CPU directamente) ni **código fuente** (no es texto legible). Es un formato intermedio que **solo la JVM entiende**.

### 2.1 ¿Por qué esto da WORA?

El bytecode es **el mismo en todas las plataformas**. Lo que cambia es la JVM: hay una JVM para Windows, otra para Linux, otra para Mac. Cada una sabe traducir el mismo bytecode al código máquina de *su* sistema.

```
              ┌──▶ JVM Windows ──▶ código máquina Windows
Main.class ───┼──▶ JVM Linux   ──▶ código máquina Linux
(bytecode)    └──▶ JVM Mac     ──▶ código máquina Mac
```

> Frase para entrevista: *"Java es portable porque el bytecode es universal; lo específico de cada sistema operativo lo resuelve la JVM, no tu código"*.

### 2.2 Compilación **e** interpretación

Java es un híbrido, y esto confunde a mucha gente:

- **Compilado**: `javac` compila tu fuente a bytecode **antes** de ejecutar.
- **Interpretado**: en ejecución, la JVM **interpreta** el bytecode instrucción a instrucción.
- **+ JIT (Just-In-Time)**: la JVM detecta el código que se ejecuta muchas veces ("hot spots") y lo **compila a código máquina nativo** en caliente para que vaya mucho más rápido. Por eso una app Java "calienta" y mejora su rendimiento tras unos segundos corriendo.

> Resumen: **compila a bytecode → interpreta → los tramos calientes se compilan a nativo con JIT**. El JIT lo veremos a fondo en la Sesión 14 (JVM).

---

## 3. JDK vs JRE vs JVM

Pregunta **clásica de entrevista junior**. Son tres cosas encajadas como muñecas rusas:

```
┌─────────────────────────────────────────┐
│ JDK (Java Development Kit)               │  ← para DESARROLLAR
│   javac, jar, javadoc, jshell, debugger  │
│  ┌────────────────────────────────────┐ │
│  │ JRE (Java Runtime Environment)      │ │  ← para EJECUTAR
│  │   librerías estándar + recursos     │ │
│  │  ┌──────────────────────────────┐   │ │
│  │  │ JVM (Java Virtual Machine)    │   │ │  ← el MOTOR
│  │  │   ejecuta el bytecode         │   │ │
│  │  └──────────────────────────────┘   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

| Componente | Qué es | Qué incluye | Cuándo lo necesitas |
|---|---|---|---|
| **JVM** | La máquina virtual que ejecuta bytecode | El motor de ejecución + GC + JIT | Siempre (es el núcleo) |
| **JRE** | Entorno de ejecución | JVM + librerías estándar (`java.util`, `java.lang`…) | Solo para **correr** apps Java |
| **JDK** | Kit de desarrollo | JRE + herramientas (`javac`, `jar`, `jshell`…) | Para **programar** en Java |

Regla mnemotécnica: **JDK = desarrollar, JRE = ejecutar, JVM = motor**. Si vas a programar, instalas el **JDK** (que ya trae todo lo demás dentro).

> Nota moderna: desde Java 11, Oracle dejó de distribuir el JRE por separado; hoy simplemente instalas el JDK.

---

## 4. Java vs otros lenguajes (para entrevista)

| | **Java** | **C#** | **Kotlin** | **Python** |
|---|---|---|---|---|
| Tipado | Estático, fuerte | Estático, fuerte | Estático, fuerte | Dinámico |
| Ejecución | Bytecode + JVM | Bytecode (IL) + CLR | Bytecode + JVM | Interpretado |
| Verbosidad | Alta | Media | Baja (conciso) | Muy baja |
| Ecosistema | Enorme (Spring…) | Enorme (.NET) | Interop con Java | Enorme (ciencia/IA) |
| Uso típico | Backend empresarial | Backend/Windows/juegos | Android moderno, backend | Scripting, IA, datos |

Puntos que conviene saber decir:

- **Java vs C#**: casi hermanos gemelos conceptualmente (VM, GC, OOP). C# nació después inspirado en Java y suele ir un paso adelante en azúcar sintáctico; Java es multiplataforma "de raíz" y con ecosistema open source gigante.
- **Java vs Kotlin**: Kotlin corre **sobre la misma JVM** y es 100% interoperable con Java (puedes mezclar clases). Es más conciso (menos "boilerplate"), null-safety en el tipo. Es el lenguaje preferido para Android hoy. No reemplaza a Java: lo complementa.
- **Java vs Python**: Java es más verboso pero más rápido y con tipado estático (mejor para sistemas grandes y equipos). Python es más rápido de escribir, ideal para scripting, datos e IA.

---

## 5. Instalación y configuración

### 5.1 Instalar el JDK

Instala un **JDK LTS** (Long Term Support): las versiones con soporte extendido. Las LTS actuales son **Java 17** y **Java 21** (usa 21 si empiezas hoy).

Distribuciones habituales (todas son OpenJDK por debajo): **Eclipse Temurin (Adoptium)**, **Amazon Corretto**, **Azul Zulu**, **Oracle JDK**.

En Mac con Homebrew:

```bash
brew install openjdk@21
```

Verifica que quedó instalado:

```bash
java -version    # muestra la versión del runtime
javac -version   # muestra la versión del compilador
```

### 5.2 `JAVA_HOME` y `PATH`

- **`JAVA_HOME`**: variable de entorno que apunta a la **carpeta raíz del JDK**. Muchas herramientas (Maven, Gradle, IDEs) la leen para saber qué JDK usar.
- **`PATH`**: lista de carpetas donde el sistema busca ejecutables. Al añadir el `bin` del JDK al `PATH`, puedes escribir `java` y `javac` desde cualquier carpeta de la terminal.

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
```

### 5.3 IDEs

- **IntelliJ IDEA** (JetBrains): el estándar de facto en el mundo Java. Community Edition es gratis y suficiente para empezar.
- **Eclipse**: veterano, gratuito, muy usado en empresas grandes.
- **VS Code**: liviano; con el *Extension Pack for Java* funciona bien para proyectos pequeños/medianos.

> Recomendación: empieza con **IntelliJ IDEA Community**. Su autocompletado y navegación aceleran mucho el aprendizaje.

---

## 6. Tu primer programa

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hola Mundo");
    }
}
```

### 6.1 Anatomía, palabra por palabra

Este bloque es fundamental; cada palabra aparece por una razón:

- **`public`** — *modificador de acceso*. Indica que la clase (y el método `main`) es **visible desde fuera**. La JVM necesita poder llamar a `main` desde afuera, por eso es público.
- **`class Main`** — declara una **clase** llamada `Main`. En Java **todo vive dentro de una clase** (no hay funciones sueltas como en Python/JS). El nombre de la clase pública **debe coincidir** con el nombre del archivo: `Main.java`.
- **`static`** — el método **pertenece a la clase, no a un objeto**. Como al arrancar el programa aún **no existe ningún objeto**, `main` debe ser `static` para poder invocarse sin instanciar nada. (Instancias y `static` a fondo en Sesiones 4–5.)
- **`void`** — el **tipo de retorno**: `main` **no devuelve** ningún valor.
- **`main`** — el **nombre del método de arranque**. La JVM busca *exactamente* este método con *esta* firma como punto de entrada del programa.
- **`String[] args`** — los **argumentos de línea de comandos** que le pasas al programa al ejecutarlo, como un arreglo de textos. Si ejecutas `java Main hola 42`, entonces `args = ["hola", "42"]`.
- **`System.out.println(...)`** — imprime en la **salida estándar** (la consola) y añade un salto de línea.
  - `System` → clase de la librería estándar.
  - `out` → el flujo de salida estándar (un `PrintStream`).
  - `println` → "print line": imprime y salta de línea (`print` imprime sin salto).
- **`;`** — cada sentencia termina en **punto y coma**. No es opcional en Java.
- **`{ }`** — las **llaves** delimitan bloques (el cuerpo de la clase y del método).

> La firma completa `public static void main(String[] args)` es un **contrato fijo**: si cambias algo (por ejemplo quitas `static`), la JVM no encuentra el punto de entrada y falla al arrancar.

### 6.2 Compilar y ejecutar a mano (sin IDE)

Entender el flujo manual te ayuda a comprender qué hace el IDE por ti:

```bash
javac Main.java     # compila → genera Main.class (bytecode)
java Main           # ejecuta la clase (¡sin la extensión .class!)
# Salida: Hola Mundo
```

- `javac Main.java` produce `Main.class`.
- `java Main` le dice a la JVM: "carga la clase `Main` y ejecuta su `main`".

### 6.3 Atajo moderno (Java 11+)

Desde Java 11 puedes ejecutar un archivo de una sola clase **sin compilar antes**:

```bash
java Main.java      # compila en memoria y ejecuta en un solo paso
```

Y para experimentar interactivamente existe **JShell** (Java 9+), una consola REPL:

```bash
jshell
jshell> System.out.println(2 + 2)
4
```

---

## 7. El flujo completo (cómo encaja todo)

```
1. Escribes código fuente en Main.java (texto)
2. javac compila  → Main.class (bytecode, portable)
3. java Main      → la JVM carga el bytecode
4. La JVM lo interpreta; el JIT compila los tramos calientes a nativo
5. El Garbage Collector libera memoria automáticamente mientras corre
6. El programa termina cuando main() finaliza
```

---

## 8. Preguntas de entrevista (nivel Junior)

Intenta responderlas **sin mirar** antes de revisar la teoría:

1. ¿Qué diferencia hay entre JDK, JRE y JVM?
2. ¿Qué es el bytecode y por qué existe?
3. ¿Por qué se dice que Java es "Write Once, Run Anywhere"?
4. ¿Java es compilado o interpretado?
5. ¿Qué hace el compilador `javac` y qué genera?
6. ¿Para qué sirven `JAVA_HOME` y el `PATH`?
7. ¿Por qué `main` es `static`?
8. ¿Qué significa que Java tenga tipado estático y fuerte?
9. ¿En qué se parecen y diferencian Java y Kotlin?
10. ¿Qué es una versión LTS y cuáles son las actuales?

<details>
<summary>Respuestas resumidas</summary>

1. **JVM** ejecuta bytecode (el motor); **JRE** = JVM + librerías para *ejecutar*; **JDK** = JRE + herramientas para *desarrollar* (`javac`, etc.).
2. Formato intermedio entre fuente y código máquina que **solo entiende la JVM**; permite portabilidad.
3. Porque el bytecode es universal y cada plataforma tiene su propia JVM que lo traduce a su código máquina.
4. **Ambos**: compila a bytecode con `javac`, luego la JVM lo interpreta y el **JIT** compila los tramos calientes a nativo.
5. Traduce el código fuente `.java` a **bytecode** `.class`.
6. `JAVA_HOME` apunta a la carpeta del JDK (lo leen las herramientas); `PATH` permite ejecutar `java`/`javac` desde cualquier lugar.
7. Porque al arrancar aún no existe ningún objeto; `static` permite invocarlo sin instanciar la clase.
8. **Estático**: los tipos se verifican en compilación. **Fuerte**: no hay conversiones implícitas peligrosas.
9. Ambos corren en la JVM y son interoperables; Kotlin es más conciso y con null-safety, preferido en Android.
10. **LTS** = soporte extendido; las actuales son **Java 17 y Java 21**.

</details>

---

## 9. Práctica sugerida (opcional, refuerza mucho)

Con el JDK instalado:

```bash
mkdir practica-01 && cd practica-01
```

1. Crea `Main.java` con el "Hola Mundo".
2. Compílalo con `javac Main.java` y observa que aparece `Main.class`.
3. Ejecútalo con `java Main`.
4. Modifica el programa para imprimir los argumentos: `System.out.println(args[0]);` y ejecútalo con `java Main hola`.
5. Abre `jshell` y prueba expresiones sueltas (`3 * 7`, `"Java".length()`).

---

## ✅ Checklist para pasar a la Sesión 2

- [ ] Explico qué es Java y sus tres ideas clave (WORA, GC, robustez).
- [ ] Distingo con claridad **JDK / JRE / JVM**.
- [ ] Entiendo qué es el **bytecode** y por qué da portabilidad.
- [ ] Sé por qué Java es **compilado e interpretado** (+ JIT).
- [ ] Tengo el **JDK instalado** y `java -version` funciona.
- [ ] Puedo **compilar y ejecutar** un programa a mano (`javac` / `java`).
- [ ] Explico **cada palabra** de `public static void main(String[] args)`.

Cuando marques todo, avísame y pasamos a la **Sesión 2 — Variables, tipos, operadores, casting y E/S**.
