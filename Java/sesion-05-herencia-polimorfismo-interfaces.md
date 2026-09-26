# Sesión 5 — Herencia, polimorfismo, abstracción, interfaces y modificadores

> **Objetivo de la sesión**: cerrar la POO con los tres pilares restantes. Al terminar deberías extender clases con `extends`, entender el polimorfismo (sobreescritura y dynamic dispatch), usar clases `abstract` e `interface`, y conocer todos los modificadores del lenguaje.

---

## 1. Herencia (`extends`)

La **herencia** permite que una clase (**hija/subclase**) reutilice y extienda a otra (**padre/superclase**). Modela una relación **"es un"** (*is-a*): un `Perro` **es un** `Animal`.

```java
public class Animal {
    protected String nombre;

    public void comer() {
        System.out.println(nombre + " está comiendo");
    }
}

public class Perro extends Animal {
    public void ladrar() {
        System.out.println(nombre + " dice: Guau");  // hereda 'nombre'
    }
}

Perro p = new Perro();
p.nombre = "Rex";
p.comer();   // heredado de Animal
p.ladrar();  // propio de Perro
```

Puntos clave:

- La subclase **hereda** los campos y métodos accesibles del padre (`public`, `protected`, package-private si mismo paquete).
- Java tiene **herencia simple**: una clase solo puede extender **una** clase. (La "herencia múltiple" se logra con interfaces — sección 5.)
- Todas las clases heredan implícitamente de **`Object`**.

### 1.1 `super`

`super` referencia a la **superclase**. Dos usos:

**Llamar al constructor del padre** (debe ser la primera línea del constructor hijo):

```java
public class Animal {
    protected String nombre;
    public Animal(String nombre) { this.nombre = nombre; }
}

public class Perro extends Animal {
    private String raza;
    public Perro(String nombre, String raza) {
        super(nombre);      // llama al constructor de Animal
        this.raza = raza;
    }
}
```

> Si no llamas a `super(...)` explícitamente, Java inserta una llamada implícita a `super()` (el constructor sin argumentos del padre). Si el padre **no** tiene constructor sin argumentos, **debes** llamar a `super(...)` tú mismo o no compila.

**Llamar a un método del padre** (útil al sobrescribir):

```java
@Override
public void comer() {
    super.comer();   // ejecuta la versión del padre...
    System.out.println("...y luego el perro pide más");  // ...y añade
}
```

---

## 2. Polimorfismo

**Polimorfismo** = "muchas formas". Un mismo tipo o método se comporta distinto según el objeto real. Hay dos clases:

### 2.1 Sobreescritura (overriding) — polimorfismo en tiempo de ejecución

Una subclase **redefine** un método heredado con la misma firma. Usa la anotación **`@Override`** (buena práctica: el compilador verifica que realmente estás sobrescribiendo):

```java
public class Animal {
    public String sonido() { return "..."; }
}
public class Perro extends Animal {
    @Override
    public String sonido() { return "Guau"; }
}
public class Gato extends Animal {
    @Override
    public String sonido() { return "Miau"; }
}
```

### 2.2 Dynamic dispatch

La magia del polimorfismo: puedes tratar objetos distintos **como su tipo padre**, y Java llama a la versión correcta **en tiempo de ejecución** según el objeto **real**:

```java
Animal a1 = new Perro();   // referencia Animal, objeto Perro
Animal a2 = new Gato();

System.out.println(a1.sonido());   // "Guau" → se decide en runtime
System.out.println(a2.sonido());   // "Miau"

// Y esto es lo potente: código que no sabe el tipo concreto
List<Animal> animales = List.of(new Perro(), new Gato(), new Perro());
for (Animal a : animales) {
    System.out.println(a.sonido());   // cada uno responde según su tipo real
}
```

> El **tipo de la referencia** (`Animal`) decide **qué métodos puedes llamar** (los de Animal); el **tipo del objeto** (`Perro`) decide **qué versión se ejecuta**. A esto se le llama *dynamic dispatch* o *late binding*.

### 2.3 Sobreescritura vs sobrecarga (¡no confundir!)

| | **Sobreescritura (override)** | **Sobrecarga (overload)** |
|---|---|---|
| Dónde | Entre clase padre e hija | En la misma clase |
| Firma | **Misma** firma | **Distinta** lista de parámetros |
| Se decide | En **runtime** (objeto real) | En **compilación** (tipos de args) |
| Anotación | `@Override` | ninguna |

### 2.4 Casting de objetos e `instanceof`

Puedes convertir entre tipos de la jerarquía:

```java
Animal a = new Perro();        // upcasting: automático y seguro
Perro p = (Perro) a;           // downcasting: manual, puede fallar

if (a instanceof Perro perro) {   // pattern matching (Java 16+)
    perro.ladrar();               // 'perro' ya viene casteado y seguro
}
```

- **Upcasting** (hijo → padre): siempre seguro, automático.
- **Downcasting** (padre → hijo): manual; si el objeto no es realmente de ese tipo, lanza `ClassCastException`. Protégelo con `instanceof`.
- El **pattern matching de `instanceof`** (Java 16+) combina la comprobación y el cast en una línea.

---

## 3. Abstracción y clases abstractas

La **abstracción** consiste en definir **qué** hace algo sin fijar todavía el **cómo**, dejando que las subclases lo concreten.

Una **clase abstracta** (`abstract`):

- **No se puede instanciar** (`new` directo prohibido).
- Puede tener **métodos abstractos** (sin cuerpo, solo la firma) que las subclases **deben** implementar.
- Puede tener también métodos normales (con cuerpo) y campos.

```java
public abstract class Figura {
    protected String color;

    public abstract double area();   // método abstracto: sin cuerpo

    public void describir() {        // método concreto: con cuerpo
        System.out.println("Figura " + color + " con área " + area());
    }
}

public class Circulo extends Figura {
    private double radio;
    public Circulo(double radio) { this.radio = radio; }

    @Override
    public double area() {           // obligatorio implementarlo
        return Math.PI * radio * radio;
    }
}

// Figura f = new Figura();     ❌ no se puede instanciar
Figura f = new Circulo(5);      // ✅ vía subclase concreta
System.out.println(f.area());
```

Úsala cuando varias clases comparten una **base común con lógica** y algunas partes que cada una debe definir.

---

## 4. Interfaces

Una **interface** es un **contrato**: una lista de métodos que una clase se compromete a implementar. Define **qué** se puede hacer, sin estado ni implementación (tradicionalmente).

```java
public interface Volador {
    void volar();   // implícitamente public y abstract
}

public class Pajaro implements Volador {
    @Override
    public void volar() {
        System.out.println("El pájaro vuela");
    }
}
```

- Se implementa con **`implements`** (no `extends`).
- Una clase puede implementar **varias** interfaces → así Java logra el equivalente a la **herencia múltiple** de comportamiento:

```java
public class Pato implements Volador, Nadador {  // ambas a la vez
    public void volar()  { ... }
    public void nadar()  { ... }
}
```

- Sus métodos son implícitamente `public abstract`; sus campos, implícitamente `public static final` (constantes).

### 4.1 `default` y `static` methods (Java 8+)

Desde Java 8 las interfaces pueden tener métodos con cuerpo:

- **`default`**: implementación por defecto que las clases **heredan** (y pueden sobrescribir). Permitió añadir métodos a interfaces existentes sin romper el código que ya las implementaba (ej: `stream()` en `Collection`).

```java
public interface Volador {
    void volar();
    default void aterrizar() {          // implementación por defecto
        System.out.println("Aterrizando...");
    }
}
```

- **`static`**: métodos utilitarios asociados a la interface, llamados como `Interface.metodo()`.

### 4.2 Interfaces funcionales (adelanto)

Una interface con **un solo método abstracto** es una **interface funcional** (`@FunctionalInterface`). Son la base de las **lambdas** — el tema de la Sesión 6. Ejemplos: `Runnable`, `Comparator`, `Predicate`.

### 4.3 Clase abstracta vs interface (clásico de entrevista)

| | **Clase abstracta** | **Interface** |
|---|---|---|
| Relación | "es un" (*is-a*) | "es capaz de" (*can-do*) |
| Herencia | Solo **una** (`extends`) | **Varias** (`implements`) |
| Estado (campos) | Sí, con estado mutable | Solo constantes (`static final`) |
| Constructores | Sí | No |
| Métodos con cuerpo | Sí | Solo `default`/`static` |
| Cuándo usar | Base común **con estado/lógica** compartida | Contrato/capacidad que varias clases dispares comparten |

Regla práctica: **prefiere interfaces** para definir contratos (más flexible); usa clase abstracta cuando necesitas compartir estado o lógica concreta entre subclases relacionadas.

---

## 5. Todos los modificadores del lenguaje

Además de los de acceso (Sesión 4), Java tiene modificadores de comportamiento:

| Modificador | Aplica a | Qué hace |
|---|---|---|
| `static` | campos, métodos, bloques | Pertenece a la **clase**, no a la instancia (una sola copia) |
| `final` | var / método / clase | Constante / no sobrescribible / no heredable |
| `abstract` | clase / método | No instanciable / sin cuerpo (a implementar) |
| `sealed` | clase / interface | Restringe **qué clases** pueden extenderla (Java 17+) |
| `non-sealed` | subclase de `sealed` | Reabre la herencia que `sealed` cerró |
| `volatile` | campo | Lecturas/escrituras visibles entre hilos (concurrencia, Sesión 13) |
| `transient` | campo | Se **excluye** de la serialización |
| `synchronized` | método / bloque | Acceso exclusivo por un hilo a la vez (Sesión 13) |
| `native` | método | Implementado en código nativo (C/C++) vía JNI |
| `strictfp` | clase / método | Cálculos de punto flotante portables y estrictos |

Los más importantes para el día a día: **`static`, `final`, `abstract`**. Los de concurrencia (`volatile`, `synchronized`) los verás en la Sesión 13. `sealed` en la 29.

### 5.1 `final` aplicado a herencia

```java
public final class String { ... }       // clase final: nadie puede extenderla
public final void metodoClave() { ... } // método final: no se puede sobrescribir
```

Se usa para **proteger** clases/métodos críticos de ser modificados por herencia.

### 5.2 `sealed` (Java 17+, adelanto)

Permite declarar **exactamente qué clases** pueden extender una clase o implementar una interface — un punto medio entre `final` (nadie) y abierto (cualquiera):

```java
public sealed interface Forma permits Circulo, Cuadrado { }
```

Muy potente combinado con el pattern matching moderno. Se ve a fondo en la Sesión 29.

---

## 6. Composición vs herencia (mentalidad senior)

La herencia se **abusa** con frecuencia. Un principio clave: **"favorece la composición sobre la herencia"**.

- **Herencia** ("es un"): `Perro extends Animal`. Acopla fuertemente hijo y padre.
- **Composición** ("tiene un"): una clase **contiene** a otra como campo y delega en ella.

```java
// En vez de heredar de Motor, un Coche TIENE un Motor:
public class Coche {
    private final Motor motor;   // composición
    public Coche(Motor motor) { this.motor = motor; }
    public void arrancar() { motor.encender(); }
}
```

La composición es más flexible, menos frágil y facilita el testing. Úsala como opción por defecto; reserva la herencia para verdaderas relaciones "es un". (Se conecta con SOLID y patrones — Sesión 24.)

---

## 7. Preguntas de entrevista (nivel Junior/Mid)

1. ¿Qué es la herencia y qué relación modela?
2. ¿Java soporta herencia múltiple de clases? ¿Cómo se resuelve entonces?
3. ¿Para qué sirve `super`? ¿Qué pasa si no lo llamas?
4. ¿Diferencia entre sobreescritura y sobrecarga?
5. ¿Qué es el dynamic dispatch?
6. ¿Diferencia entre upcasting y downcasting? ¿Cuál puede fallar?
7. ¿Diferencia entre clase abstracta e interface? ¿Cuándo usar cada una?
8. ¿Qué son los métodos `default` en interfaces y por qué se añadieron?
9. ¿Qué hacen `final`, `static` y `abstract`?
10. ¿Por qué se dice "composición sobre herencia"?

<details>
<summary>Respuestas resumidas</summary>

1. Reutilizar/extender una clase; modela "es un" (*is-a*).
2. No para clases (herencia simple); se resuelve implementando **varias interfaces**.
3. Llama al constructor o a métodos del padre; si no llamas a `super(...)`, Java inserta `super()` implícito (falla si el padre no tiene constructor sin args).
4. Override: misma firma, entre padre/hijo, se decide en runtime. Overload: distinta lista de parámetros, misma clase, se decide en compilación.
5. Que la versión del método a ejecutar se elige en runtime según el **tipo real** del objeto, no el de la referencia.
6. Upcasting (hijo→padre) es automático y seguro; downcasting (padre→hijo) es manual y puede lanzar `ClassCastException`.
7. Clase abstracta: "es un", una sola, con estado/constructores. Interface: contrato, múltiple, sin estado. Interface para contratos flexibles; abstracta para compartir estado/lógica.
8. Métodos con cuerpo por defecto en interfaces; permiten añadir métodos sin romper implementaciones existentes.
9. `final`: no reasignable/sobrescribible/heredable; `static`: pertenece a la clase; `abstract`: sin cuerpo/no instanciable.
10. La composición ("tiene un") es más flexible y menos frágil que la herencia; reserva la herencia para verdaderas relaciones "es un".

</details>

---

## 8. Práctica sugerida

1. Crea `Animal` con método `sonido()` y subclases `Perro`, `Gato` que lo sobrescriban.
2. Guarda varios en un `List<Animal>` y recórrelos: observa el dynamic dispatch.
3. Crea una clase abstracta `Figura` con `area()` abstracto y subclases `Circulo`, `Cuadrado`.
4. Define una interface `Comparable`-like o `Volador` e impleméntala en dos clases distintas.
5. Refactoriza un caso de herencia a **composición** y compara.

---

## ✅ Checklist para pasar al Nivel 3 (Java Moderno)

- [ ] Uso `extends` y `super` (constructor y método) correctamente.
- [ ] Explico el **polimorfismo** y el **dynamic dispatch**.
- [ ] Distingo **sobreescritura** de **sobrecarga**.
- [ ] Manejo upcasting/downcasting con `instanceof` (y su pattern matching).
- [ ] Uso **clases abstractas** e **interfaces**, y sé cuándo elegir cada una.
- [ ] Conozco `default`/`static` en interfaces y qué es una interface funcional.
- [ ] Conozco todos los **modificadores** (foco en `static`, `final`, `abstract`).
- [ ] Entiendo "**composición sobre herencia**".

Con esto **cierras el Nivel 2 (POO)** — el corazón de Java. El siguiente salto es el **Nivel 3 — Java Moderno**: lambdas, interfaces funcionales, Streams y Optional, donde el código se vuelve mucho más expresivo. Avísame y seguimos con la **Sesión 6 — Lambdas, interfaces funcionales y method references**.
