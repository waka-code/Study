# Sesión 4 — Clases, objetos, constructores, `this` y encapsulamiento

> **Objetivo de la sesión**: entrar de lleno en la Programación Orientada a Objetos (POO). Al terminar deberías modelar una entidad como una **clase**, crear **objetos** con **constructores**, entender qué es `this`, y aplicar **encapsulamiento** con modificadores de acceso, getters y setters.

---

## 1. ¿Qué es la POO y por qué?

La **Programación Orientada a Objetos** organiza el código en torno a **objetos**: unidades que combinan **datos** (estado) y **comportamiento** (métodos). En vez de tener datos sueltos y funciones que los manipulan, cada objeto se encarga de sí mismo.

Los **cuatro pilares** de la POO (los verás repartidos en esta sesión y la 5):

1. **Encapsulamiento** — ocultar el estado interno y exponer solo lo necesario. *(esta sesión)*
2. **Herencia** — reutilizar y extender clases. *(Sesión 5)*
3. **Polimorfismo** — un mismo método se comporta distinto según el objeto. *(Sesión 5)*
4. **Abstracción** — modelar solo lo esencial, ocultar detalles. *(Sesión 5)*

> Frase para entrevista: *"Un objeto agrupa estado y comportamiento; la clase es el molde y el objeto la pieza fabricada con ese molde"*.

---

## 2. Clases

Una **clase** es una **plantilla** que define cómo serán los objetos de ese tipo: qué datos tienen (**campos/atributos**) y qué pueden hacer (**métodos**).

```java
public class Persona {
    // Campos (atributos) → el ESTADO
    String nombre;
    int edad;

    // Método → el COMPORTAMIENTO
    void saludar() {
        System.out.println("Hola, soy " + nombre);
    }
}
```

- Convención: el nombre de la clase va en **PascalCase** (`Persona`, `CuentaBancaria`).
- Un archivo `.java` puede tener varias clases, pero **solo una `public`**, y debe llamarse igual que el archivo.

---

## 3. Objetos: instanciación

Un **objeto** (o **instancia**) es una clase "hecha realidad" en memoria. Se crea con **`new`**:

```java
Persona p = new Persona();   // creamos un objeto
p.nombre = "Ana";            // asignamos su estado
p.edad = 30;
p.saludar();                 // usamos su comportamiento → "Hola, soy Ana"

Persona p2 = new Persona();  // otro objeto, independiente
p2.nombre = "Luis";
```

Qué pasa en memoria (idea clave que conecta con la Sesión 2):

```
p  ──────▶ [ Persona: nombre="Ana",  edad=30 ]   ← objeto en el HEAP
p2 ──────▶ [ Persona: nombre="Luis", edad=0  ]

Las variables p y p2 son REFERENCIAS (viven en el stack)
y apuntan a objetos distintos en el heap.
```

- `p` y `p2` son objetos **independientes**: cambiar uno no afecta al otro.
- Si haces `Persona p3 = p;`, **no copias el objeto**: `p3` apunta al **mismo** objeto que `p`. Modificar por `p3` se ve por `p`.
- Un objeto sin referencias que lo apunten se vuelve "basura" y el **Garbage Collector** lo elimina.

---

## 4. Constructores

Un **constructor** es un método especial que se ejecuta **al crear el objeto** (`new`). Sirve para inicializar su estado. Reglas:

- Se llama **exactamente igual** que la clase.
- **No tiene tipo de retorno** (ni `void`).

```java
public class Persona {
    String nombre;
    int edad;

    // Constructor
    public Persona(String nombre, int edad) {
        this.nombre = nombre;
        this.edad = edad;
    }
}

Persona p = new Persona("Ana", 30);   // se ejecuta el constructor
```

### 4.1 Constructor por defecto

Si **no** escribes ningún constructor, Java te da uno **vacío automático** (`Persona()`). Pero en cuanto escribes **uno propio**, el automático **desaparece**:

```java
Persona p = new Persona();   // ❌ ya no compila si definiste Persona(String, int)
```

Si quieres ambos, debes declararlos explícitamente (esto es sobrecarga de constructores).

### 4.2 Sobrecarga de constructores y `this(...)`

Igual que los métodos, los constructores se pueden **sobrecargar**. Y un constructor puede **llamar a otro** de la misma clase con `this(...)` (debe ser la primera línea):

```java
public class Persona {
    String nombre;
    int edad;

    public Persona(String nombre, int edad) {
        this.nombre = nombre;
        this.edad = edad;
    }

    public Persona(String nombre) {
        this(nombre, 0);   // reutiliza el otro constructor con edad=0
    }

    public Persona() {
        this("Sin nombre");
    }
}
```

Esto evita duplicar la lógica de inicialización.

---

## 5. `this`

**`this`** es una referencia al **objeto actual** (el que está ejecutando el método). Tiene tres usos:

1. **Desambiguar** cuando un parámetro tapa a un campo (shadowing, visto en Sesión 3):

```java
public void setNombre(String nombre) {
    this.nombre = nombre;   // this.nombre = campo; nombre = parámetro
}
```

2. **Llamar a otro constructor** de la misma clase: `this(...)` (visto arriba).

3. **Devolver el propio objeto**, útil para encadenar llamadas (patrón *fluent* / builder — Sesión 24):

```java
public Persona conNombre(String n) {
    this.nombre = n;
    return this;   // devuelve el mismo objeto
}
// permite: persona.conNombre("Ana").conEdad(30);
```

---

## 6. Encapsulamiento

El **encapsulamiento** consiste en **ocultar el estado interno** de un objeto y controlar el acceso a través de métodos. Es el primer pilar de la POO y una práctica **obligatoria** en código profesional.

### 6.1 El problema sin encapsular

```java
public class CuentaBancaria {
    double saldo;   // público de facto
}

cuenta.saldo = -5000;   // 😱 nadie impide un saldo negativo inválido
```

Cualquiera puede poner el objeto en un estado inválido. No hay control.

### 6.2 La solución: `private` + getters/setters

```java
public class CuentaBancaria {
    private double saldo;   // ← nadie accede directamente desde fuera

    public double getSaldo() {      // getter: lectura controlada
        return saldo;
    }

    public void depositar(double monto) {   // método con reglas de negocio
        if (monto <= 0) {
            throw new IllegalArgumentException("El monto debe ser positivo");
        }
        this.saldo += monto;
    }
}
```

Ahora el estado solo cambia por caminos **controlados y validados**. Los beneficios:

- **Integridad**: el objeto nunca queda en estado inválido.
- **Flexibilidad**: puedes cambiar la implementación interna sin romper a quien usa la clase.
- **Control**: validas, registras logs o disparas eventos en el setter.

> Regla práctica: **campos `private`, comportamiento `public`**. No expongas todos los campos con getters/setters "por reflejo"; expón solo lo que el resto del sistema realmente necesita.

### 6.3 Getters y setters

Convención de nombres: `getX()` / `setX()` para un campo `x`; para `boolean`, el getter suele ser `isX()`.

```java
private boolean activo;
public boolean isActivo() { return activo; }
public void setActivo(boolean activo) { this.activo = activo; }
```

Los IDEs los generan automáticamente. En proyectos reales se usa **Lombok** (`@Getter`, `@Setter`, `@Data`) para evitar escribirlos a mano, o **`record`** para datos inmutables (Sesión 29).

---

## 7. Modificadores de acceso

Controlan **desde dónde** es visible un campo, método o clase. De más restrictivo a más abierto:

| Modificador | Misma clase | Mismo paquete | Subclase (otro paquete) | Todos |
|---|:---:|:---:|:---:|:---:|
| `private` | ✅ | ❌ | ❌ | ❌ |
| *(sin modificador)* = **package-private** | ✅ | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

- **`private`**: solo dentro de la propia clase. El default para campos.
- **package-private** (no escribir nada): visible en el mismo paquete. Útil para colaboración interna entre clases de un módulo.
- **`protected`**: como package-private + las **subclases** (aunque estén en otro paquete). Conecta con herencia (Sesión 5).
- **`public`**: visible desde cualquier lugar. El default para la API que expones.

> Principio: **empieza con el acceso más restrictivo** y ábrelo solo cuando haga falta. Menos superficie pública = menos acoplamiento.

---

## 8. `toString`, `equals` y `hashCode` (introducción)

Toda clase hereda de `Object` (raíz de Java) tres métodos que casi siempre conviene **sobrescribir**:

- **`toString()`**: representación en texto del objeto. Por defecto imprime algo ilegible (`Persona@1b6d`). Sobrescríbelo para logs útiles:

```java
@Override
public String toString() {
    return "Persona{nombre='" + nombre + "', edad=" + edad + "}";
}
```

- **`equals()`** y **`hashCode()`**: definen cuándo **dos objetos se consideran iguales por contenido** (no por referencia). Son cruciales para usar objetos en `HashMap`/`HashSet` (Sesión 9). Regla de oro: **si sobrescribes `equals`, sobrescribe también `hashCode`**.

Se profundiza en la Sesión 9; por ahora quédate con que existen y que los IDEs/Lombok/`record` los generan por ti.

---

## 9. Preguntas de entrevista (nivel Junior)

1. ¿Diferencia entre clase y objeto?
2. ¿Qué es un constructor y qué pasa si no defines ninguno?
3. Si defines un constructor con parámetros, ¿sigue existiendo el vacío?
4. ¿Para qué sirve `this`? Menciona sus usos.
5. ¿Qué es el encapsulamiento y qué problema resuelve?
6. ¿Cuáles son los 4 modificadores de acceso y qué visibilidad da cada uno?
7. ¿Qué significa que dos referencias apunten al mismo objeto?
8. ¿Por qué conviene sobrescribir `toString()`?
9. ¿Qué relación hay entre `equals()` y `hashCode()`?
10. ¿Qué son los 4 pilares de la POO?

<details>
<summary>Respuestas resumidas</summary>

1. La clase es el molde/plantilla; el objeto es una instancia concreta creada con `new`.
2. Método especial que inicializa el objeto al crearlo; sin nombre de retorno. Si no defines ninguno, Java da uno vacío por defecto.
3. No: al definir uno propio, el constructor por defecto desaparece (hay que declararlo si lo quieres).
4. Referencia al objeto actual: desambiguar campos (shadowing), llamar a otro constructor `this(...)`, y devolver el propio objeto.
5. Ocultar el estado interno (`private`) y exponer acceso controlado; evita estados inválidos y desacopla.
6. `private` (solo la clase), package-private (mismo paquete), `protected` (+ subclases), `public` (todos).
7. Que ambos manejan el **mismo** objeto en memoria; un cambio por una referencia se ve por la otra.
8. Para obtener una representación legible en logs y depuración (en vez de `Clase@hash`).
9. Si dos objetos son `equals`, deben tener el mismo `hashCode`; es requisito para `HashMap`/`HashSet`.
10. Encapsulamiento, herencia, polimorfismo y abstracción.

</details>

---

## 10. Práctica sugerida

1. Crea una clase `Producto` con `nombre` y `precio` **privados**, constructor y getters.
2. Añade un setter `setPrecio` que lance excepción si el precio es negativo.
3. Sobrescribe `toString()` e imprime un `Producto`.
4. Crea dos objetos y comprueba que son independientes; luego asigna uno a otra variable y verifica que comparten el mismo objeto.
5. Sobrecarga el constructor: uno con precio y otro que lo ponga en 0 usando `this(...)`.

---

## ✅ Checklist para pasar a la Sesión 5

- [ ] Distingo **clase** (molde) de **objeto** (instancia).
- [ ] Creo objetos con `new` y entiendo que las variables son **referencias**.
- [ ] Escribo **constructores**, los sobrecargo y uso `this(...)`.
- [ ] Explico los tres usos de **`this`**.
- [ ] Aplico **encapsulamiento**: campos `private` + getters/setters con validación.
- [ ] Conozco los 4 **modificadores de acceso** y su alcance.
- [ ] Sé por qué se sobrescriben `toString`, `equals` y `hashCode`.

Cuando marques todo, seguimos con la **Sesión 5 — Herencia, polimorfismo, abstracción, interfaces y modificadores** (cierre del Nivel 2).
