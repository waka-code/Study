# Sesión 1 — Fundamentos de Jetpack y Jetpack Compose

> **Objetivo de la sesión**: entender *qué es* Jetpack, *qué es* Compose, *por qué existen* y el gran cambio de paradigma que representan (de **imperativo/XML** a **declarativo/Kotlin**). Al terminar deberías poder explicar con tus palabras qué problema resuelve Jetpack, por qué Google creó Compose, cómo se estructura un proyecto Android moderno y leer/escribir tu primer `@Composable`.

---

## 1. El problema: cómo era Android "antes"

Para valorar Jetpack hay que entender el dolor que vino a resolver.

Durante años, desarrollar Android significaba usar **solo el Android SDK**. Eso traía problemas recurrentes:

- **Ciclo de vida frágil**: al rotar la pantalla, la `Activity` se **destruía y recreaba**, y perdías el estado (el típico "se borró el formulario al girar el teléfono").
- **Boilerplate de UI**: definías vistas en **XML** y luego, en código Java/Kotlin, las "encontrabas" (`findViewById`) y las actualizabas a mano.
- **Cada equipo reinventaba la rueda**: navegación, base de datos, tareas en segundo plano… no había una forma oficial y todos improvisaban de forma distinta.
- **Fugas de memoria**: era muy fácil dejar referencias vivas a una `Activity` ya destruida.

```
Android "clásico"                        Consecuencia
──────────────────                       ─────────────
XML + findViewById                       mucho código repetitivo
Activity se recrea al rotar              se pierde el estado
sin librerías oficiales                  cada quien su arquitectura
UI y lógica mezcladas                    difícil de testear
```

---

## 2. ¿Qué es Jetpack?

**Jetpack** es un **conjunto de bibliotecas oficiales de Google** que estandarizan y facilitan el desarrollo Android. No es "un" framework único: es una **colección de piezas** (llamadas *Architecture Components* y otras) que puedes ir adoptando según necesites.

```
        Android SDK              (lo que da el sistema operativo)
             +
     Jetpack Libraries           (piezas oficiales que resuelven problemas comunes)
             =
   Android moderno y mantenible
```

Jetpack resuelve, con soluciones oficiales y probadas, cosas como:

| Problema | Librería Jetpack |
|---|---|
| Sobrevivir a rotaciones / separar UI de lógica | **ViewModel** |
| Reaccionar al ciclo de vida sin fugas | **Lifecycle** |
| Navegar entre pantallas | **Navigation** |
| Base de datos local | **Room** |
| Guardar preferencias/settings | **DataStore** |
| Tareas en segundo plano confiables | **WorkManager** |
| Cargar listas grandes por páginas | **Paging** |
| Construir la interfaz | **Compose** |

> 💡 Idea clave: **Jetpack ≠ Compose**. Compose es *una* de las piezas de Jetpack (la de UI). Puedes usar Jetpack (Room, ViewModel, Navigation…) con la UI antigua de XML, o con Compose. En Android moderno se combinan **Jetpack + Compose**.

### 2.1 ¿Por qué se llama "Jetpack"?

Metáfora: un *jetpack* (mochila propulsora) es algo que te **impulsa** y te lleva más rápido y más lejos con menos esfuerzo. Estas librerías te "impulsan" evitando que escribas desde cero lo que ya está resuelto.

---

## 3. ¿Qué es Jetpack Compose?

**Jetpack Compose** es el **framework moderno y oficial para construir interfaces de usuario (UI) en Android**, escrito **100% en Kotlin**. Reemplaza al sistema antiguo basado en **XML + Views**.

La diferencia fundamental es el **paradigma**:

### 3.1 Imperativo (XML/Views) vs Declarativo (Compose)

Este es **el concepto más importante de la sesión**.

**Imperativo** = describes los **pasos** para cambiar la UI, tú mismo la mutas.

```kotlin
// Mundo antiguo (imperativo): tú vas y modificas la vista a mano
val texto = findViewById<TextView>(R.id.miTexto)
val boton = findViewById<Button>(R.id.miBoton)
var contador = 0

boton.setOnClickListener {
    contador++
    texto.text = "Clicks: $contador"   // TÚ actualizas el TextView manualmente
}
```

**Declarativo** = describes **cómo debe verse la UI para un estado dado**, y el framework se encarga de actualizarla cuando el estado cambia.

```kotlin
// Mundo Compose (declarativo): describes la UI en función del estado
@Composable
fun Contador() {
    var contador by remember { mutableStateOf(0) }

    Button(onClick = { contador++ }) {
        Text("Clicks: $contador")   // NO actualizas nada a mano:
    }                               // Compose redibuja solo cuando 'contador' cambia
}
```

La analogía clásica:

```
Imperativo (XML)                Declarativo (Compose)
────────────────                ─────────────────────
"Ve, busca el TextView          "La UI ES: un botón que
 y cámbiale el texto"            muestra el contador"

Tú gestionas los cambios        El estado gestiona los cambios
Fácil equivocarse de estado     La UI siempre refleja el estado
```

> Frase para entrevista: *"En Compose, la UI es una **función de tu estado**: `UI = f(estado)`. No mutas la interfaz; cambias el estado y Compose reconstruye lo necesario."*

### 3.2 Recomposición (vistazo)

Cuando el **estado** que lee un `@Composable` cambia, Compose vuelve a **ejecutar esa función** para actualizar la pantalla. A eso se le llama **recomposición**. Es el motor de Compose y lo estudiaremos a fondo en la **Sesión 3**; por ahora quédate con la idea:

```
cambia el estado  ─►  Compose re-ejecuta los @Composable que leen ese estado  ─►  UI actualizada
```

### 3.3 ¿Por qué Google creó Compose?

- **Menos código y menos bugs**: se acaba el `findViewById`, los `Adapter` para listas, el `notifyDataSetChanged`, etc.
- **Un solo lenguaje**: todo es Kotlin (UI + lógica), no saltas entre XML y Kotlin.
- **UI y estado siempre sincronizados**: al ser declarativa, la pantalla no puede "quedarse desfasada" del estado.
- **Reutilización real**: los componentes son funciones, fáciles de componer y combinar.
- **Herramientas modernas**: previsualizaciones en vivo (`@Preview`), animaciones sencillas, theming potente.

---

## 4. La pieza base: Kotlin

Compose **no tiene XML**. Todo se escribe en **Kotlin**, y aprovecha características avanzadas del lenguaje (lambdas, funciones de orden superior, `by` delegates, corrutinas). Por eso **dominar Kotlin es requisito**, no un extra.

Lo que más usarás y repasaremos en la **Sesión 2**:

```kotlin
val / var            // inmutable vs mutable
String?  ?.  ?:  !!  // null safety
data class           // modelos de datos
sealed class         // estados/eventos cerrados (ideal para UI State)
lambda / fun         // funciones como parámetros (base de Compose)
let/run/apply/also   // scope functions
by lazy / by ...     // delegación de propiedades ('by remember' viene de aquí)
launch/async/Flow    // corrutinas (asincronía moderna)
```

> No necesitas ser experto en corrutinas hoy, pero sí entender que `by remember { mutableStateOf(...) }` usa **delegación de propiedades** (`by`) — un concepto de Kotlin, no de Compose.

---

## 5. Anatomía de un proyecto Android moderno

Al crear un proyecto en **Android Studio** (plantilla *Empty Activity* con Compose), verás algo como:

```
app/
├── src/main/
│   ├── java/com/ejemplo/app/
│   │   ├── MainActivity.kt        ← punto de entrada (Activity)
│   │   └── ui/theme/              ← colores, tipografía, tema (Material 3)
│   ├── res/                       ← recursos: strings, drawables, íconos
│   │   ├── values/strings.xml
│   │   └── drawable/
│   └── AndroidManifest.xml        ← "carné de identidad" de la app
├── build.gradle.kts (app)         ← dependencias y config del módulo
settings.gradle.kts                ← módulos del proyecto
gradle/libs.versions.toml          ← version catalog (versiones centralizadas)
```

Piezas clave:

- **`MainActivity`**: la `Activity` sigue existiendo como *contenedor* que arranca la app; pero su contenido ya no es XML, es Compose (via `setContent { }`).
- **`AndroidManifest.xml`**: declara la app al sistema — permisos, activities, punto de entrada. Aún es XML (esto **no** desaparece con Compose).
- **`res/`**: recursos como `strings.xml` (textos) o íconos. Se reduce mucho, pero sigue existiendo.
- **`build.gradle.kts`**: aquí se declaran las dependencias (Compose, Jetpack, etc.).
- **`libs.versions.toml`** (*Version Catalog*): archivo moderno donde se centralizan las versiones de librerías. Lo veremos en Modularización (Sesión 18).

> ⚠️ Nota importante: aunque Compose elimina el XML **de la UI**, el `AndroidManifest.xml` sigue siendo XML. Compose sustituye los *layouts*, no toda la plataforma.

---

## 6. Tu primer `@Composable`

Un **Composable** es simplemente una **función de Kotlin anotada con `@Composable`** que describe una parte de la UI.

```kotlin
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

@Composable
fun Saludo(nombre: String) {
    Text(text = "Hola, $nombre 👋")
}
```

Reglas mentales de un Composable:

- Empieza con **mayúscula** por convención (parece una función, se nombra como un "componente": `Saludo`, `BotonLogin`).
- **No devuelve UI** (no hace `return`): *emite* elementos en pantalla al ejecutarse.
- Se **compone** con otros: un Composable llama a otros Composables (como Lego).

### 6.1 Cómo se conecta con la Activity

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {                 // ← aquí empieza el mundo Compose
            MiAppTheme {             // tema Material 3 del proyecto
                Saludo(nombre = "Waddini")
            }
        }
    }
}
```

`setContent { }` es el **puente** entre la `Activity` (mundo Android clásico) y Compose (mundo declarativo). Todo lo que va dentro es UI en Compose.

### 6.2 Vista previa sin ejecutar la app: `@Preview`

Una de las grandes ventajas de Compose: previsualizar componentes en Android Studio **sin instalar la app en un emulador**.

```kotlin
import androidx.compose.ui.tooling.preview.Preview

@Preview(showBackground = true)
@Composable
fun SaludoPreview() {
    MiAppTheme {
        Saludo(nombre = "Preview")
    }
}
```

En XML no existía esto de forma tan directa: es un cambio enorme de productividad.

---

## 7. Composición de componentes (el "Lego")

La verdadera potencia: los Composables se **anidan y combinan**.

```kotlin
@Composable
fun TarjetaUsuario(nombre: String, rol: String) {
    Column {                         // apila verticalmente (lo verás en Sesión 5)
        Text(text = nombre)
        Text(text = rol)
    }
}
```

- `Text` es un Composable de Material 3.
- `Column` es un Composable de layout que organiza a sus hijos en vertical.
- `TarjetaUsuario` es **tu propio** Composable, hecho de otros.

Así se construye toda una app: funciones pequeñas que se combinan en funciones más grandes. Sin `Adapter`, sin `findViewById`, sin XML.

---

## 8. Mapa mental: dónde encaja cada cosa

```
                    ANDROID MODERNO
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
     KOTLIN            JETPACK            COMPOSE
   (el lenguaje)   (las librerías)    (la UI, parte
        │                 │            de Jetpack)
        │          ┌──────┼──────┐         │
   null safety   Room  ViewModel Navigation │
   lambdas       DataStore  WorkManager  @Composable
   corrutinas    Paging   Lifecycle    Modifier / State
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
               Una app escalable y testeable
```

---

## 9. Errores y confusiones típicas de principiante

- ❌ *"Compose reemplaza a Jetpack"* → **No**. Compose *es parte* de Jetpack (la capa de UI).
- ❌ *"Con Compose desaparece toda la Activity y el Manifest"* → **No**. La `Activity` sigue como contenedor; el `Manifest` sigue siendo XML.
- ❌ *"Un Composable devuelve una vista"* → **No**. *Emite* UI; no hace `return` de nada.
- ❌ *"Tengo que actualizar la UI a mano cuando cambian los datos"* → **No**, eso es el mundo imperativo. En Compose cambias el **estado** y la UI se recompone sola.
- ❌ *"Puedo aprender Compose sin saber Kotlin"* → **No** de forma sólida: Compose depende de features del lenguaje.

---

## 10. Preguntas de entrevista (nivel fundamentos)

1. **¿Qué es Jetpack y qué problemas resuelve?**
   Conjunto de librerías oficiales de Google (ViewModel, Room, Navigation, Compose…) que estandarizan y simplifican el desarrollo Android: ciclo de vida, persistencia, navegación, background, UI.

2. **¿Qué es Jetpack Compose y en qué se diferencia del sistema de Views/XML?**
   Es el toolkit declarativo de UI escrito en Kotlin. La diferencia clave es el paradigma: en XML/Views actualizas la UI de forma **imperativa** (`findViewById` + mutación); en Compose describes la UI de forma **declarativa** como función del estado (`UI = f(estado)`), y el framework la actualiza vía **recomposición**.

3. **¿Qué significa que Compose es "declarativo"?**
   Que describes *cómo se ve* la UI para un estado dado, en lugar de dar los pasos para modificarla. Al cambiar el estado, Compose reconstruye lo necesario automáticamente.

4. **¿Compose reemplaza a Jetpack?**
   No. Compose *forma parte* de Jetpack; es su capa moderna de UI. Se usa junto a otras piezas de Jetpack (ViewModel, Room, Navigation).

5. **¿Qué es un `@Composable`?**
   Una función de Kotlin anotada con `@Composable` que emite UI al ejecutarse y puede componerse con otras.

6. **¿Para qué sirve `setContent { }`?**
   Es el puente entre la `Activity` (Android clásico) y el mundo Compose; define el contenido de la UI en Compose.

7. **¿Por qué es imprescindible Kotlin para Compose?**
   Porque Compose no usa XML: toda la UI es Kotlin y se apoya en lambdas, funciones de orden superior y delegación de propiedades (`by`).

---

## 11. Resumen de la sesión

- **Jetpack** = colección de librerías oficiales de Google para Android moderno (ciclo de vida, datos, navegación, UI…).
- **Compose** = la pieza de **UI** de Jetpack; toolkit **declarativo** en **Kotlin**, sin XML.
- Paradigma central: **`UI = f(estado)`**. Cambias el estado → Compose **recompone** la UI.
- Un **Composable** es una función `@Composable` que emite UI y se combina con otras.
- `setContent { }` conecta la `Activity` con Compose; `@Preview` permite ver componentes sin ejecutar la app.
- **Kotlin es requisito**: la próxima sesión repasa lo imprescindible.

---

## 12. Para afianzar (mini-práctica)

Sin necesidad de correr nada aún, intenta *escribir en papel/editor*:

1. Un Composable `Bienvenida(nombre: String)` que muestre un `Text` con un saludo.
2. Un Composable `Perfil()` que use `Column` y llame dos veces a `Text` (nombre y rol).
3. Explica en una frase, con tus palabras, la diferencia entre imperativo y declarativo.
4. Enumera 3 librerías de Jetpack (que no sean Compose) y qué resuelve cada una.

> Cuando tengas esto claro, avísame y pasamos a la **Sesión 2 — Kotlin imprescindible para Compose**.
