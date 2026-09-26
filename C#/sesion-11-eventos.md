# Sesión 11 — Eventos: el patrón publicador/suscriptor en C#

> **Objetivo de la sesión**: entender qué es un evento en C# y en qué se diferencia de un simple campo delegate (Sesión 10), implementar el patrón estándar de .NET (`EventHandler<TEventArgs>`, `On…`, `sender`/`e`), conocer los *event accessors* (`add`/`remove`), la seguridad frente a hilos, el famoso **memory leak por eventos** y sus soluciones, y ubicar los eventos frente a alternativas modernas (`IObservable<T>`, eventos de dominio, mensajería). Al terminar deberías poder responder con precisión *"¿qué es la keyword `event` y qué te protege?"*.

---

## 1. ¿Qué problema resuelven los eventos?

Imagina una clase `Termostato` que mide la temperatura. Varias partes del sistema quieren enterarse cuando supera un umbral: la pantalla, un logger, un servicio de alertas. Si el termostato los **llama directamente**, queda **acoplado** a todos ellos:

```csharp
// ❌ Acoplamiento fuerte: el termostato conoce a todos sus interesados
public class TermostatoAcoplado
{
    private readonly Pantalla _pantalla = new();
    private readonly Logger _logger = new();
    private readonly Alertas _alertas = new();

    public void Medir(double t)
    {
        if (t > 30) { _pantalla.Mostrar(t); _logger.Log(t); _alertas.Enviar(t); }
        // ¿Otro interesado? → hay que modificar esta clase (viola Open/Closed)
    }
}
```

La solución es el **patrón Observer** (publicador/suscriptor): el publicador **anuncia** que algo pasó y no sabe quién escucha. Los interesados se **suscriben** por su cuenta.

```
                        ┌──────────────┐
                        │  Termostato  │  (publisher)
                        │  event       │
                        │  Sobrecalent.│
                        └──────┬───────┘
          "algo pasó" (raise)  │   no conoce a nadie concreto
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   ┌──────────┐          ┌──────────┐          ┌──────────┐
   │ Pantalla │          │  Logger  │          │ Alertas  │   (subscribers)
   └──────────┘          └──────────┘          └──────────┘
        += suscripción          += suscripción        += suscripción
```

C# tiene este patrón **en el lenguaje** con la keyword `event`, construida sobre los delegates multicast que ya conoces (Sesión 10).

---

## 2. ¿Por qué no basta con un campo delegate público?

Podríamos exponer un delegate multicast público. Funciona... y es peligroso:

```csharp
public class TermostatoInseguro
{
    public Action<double>? Sobrecalentado;          // campo delegate PÚBLICO

    public void Medir(double t)
    {
        if (t > 30) Sobrecalentado?.Invoke(t);
    }
}

var termo = new TermostatoInseguro();
termo.Sobrecalentado += t => Console.WriteLine($"Pantalla: {t}");
termo.Sobrecalentado += t => Console.WriteLine($"Logger: {t}");

// Cualquier código externo puede...
termo.Sobrecalentado = t => Console.WriteLine("¡Te borré a todos!");  // 1) REEMPLAZAR con '=' (borra suscriptores)
termo.Sobrecalentado?.Invoke(999);                                    // 2) DISPARARLO desde fuera (eventos falsos)
termo.Sobrecalentado = null;                                          // 3) LIMPIARLO
```

La keyword **`event`** es un **modificador de acceso** sobre el delegate: desde **fuera** de la clase solo permite `+=` y `-=`.

```csharp
public class Termostato
{
    public event Action<double>? Sobrecalentado;    // ← 'event'

    public void Medir(double t)
    {
        if (t > 30) Sobrecalentado?.Invoke(t);      // ✅ dentro de la clase: se puede invocar
    }
}

var termo = new Termostato();
termo.Sobrecalentado += t => Console.WriteLine(t);   // ✅
// termo.Sobrecalentado = null;                      ❌ CS0070: solo puede aparecer a la izquierda de += o -=
// termo.Sobrecalentado?.Invoke(1);                  ❌ CS0070
```

| Capacidad desde FUERA de la clase | Campo delegate público | `event` |
|---|---|---|
| Suscribirse `+=` | ✅ | ✅ |
| Desuscribirse `-=` | ✅ | ✅ |
| Asignar `=` (borrar a otros) | ✅ 😱 | ❌ |
| Invocar / disparar | ✅ 😱 | ❌ |
| Leer la lista de suscriptores | ✅ | ❌ |
| Puede ir en una **interfaz** | ❌ (los campos no) | ✅ |

> ❓ **Entrevista**: *"¿Diferencia entre un delegate y un evento?"* → Un **delegate** es un *tipo* (una firma de método). Un **evento** es un *miembro* de una clase que encapsula una instancia de delegate, igual que una propiedad encapsula un campo: expone solo `add`/`remove` al exterior, y solo la clase que lo declara puede invocarlo o reasignarlo. Frase clave: *"un evento es a un delegate lo que una propiedad es a un campo"*.

> ⚠️ Ni siquiera las **clases derivadas** pueden invocar un evento del padre (CS0070). Por eso existe el patrón `protected virtual void OnXxx(...)` (sección 3).

---

## 3. El patrón estándar de .NET (`EventHandler<TEventArgs>`)

Puedes usar cualquier delegate como tipo de evento, pero .NET tiene una **convención** que toda la BCL, WinForms, WPF, MAUI y ASP.NET siguen. Respétala: es lo que esperan los demás desarrolladores y las herramientas.

**Reglas de la convención:**
1. El delegate es `EventHandler` o `EventHandler<TEventArgs>`: `void (object? sender, TEventArgs e)`.
2. `sender` = quién disparó el evento; `e` = los datos.
3. Los datos van en una clase que hereda de `EventArgs` (hoy es opcional, pero habitual), con sufijo `EventArgs`.
4. El evento se nombra con un verbo: pasado (`Changed`, `Completed`) para "ya ocurrió", gerundio (`Closing`, `Saving`) para "está por ocurrir" (normalmente cancelable).
5. Se dispara desde un método `protected virtual void OnNombreEvento(TEventArgs e)`.

```csharp
// 1) Datos del evento (inmutables: los suscriptores no deberían alterarlos)
public sealed class TemperaturaEventArgs(double actual, double umbral) : EventArgs
{
    public double Actual { get; } = actual;
    public double Umbral { get; } = umbral;
    public DateTime Momento { get; } = DateTime.UtcNow;
}

// 2) Publicador
public class Termostato
{
    private double _temperatura;
    public double Umbral { get; init; } = 30;

    // Declaración del evento: field-like event
    public event EventHandler<TemperaturaEventArgs>? Sobrecalentado;

    public double Temperatura
    {
        get => _temperatura;
        set
        {
            if (value == _temperatura) return;   // no notificar si no cambió
            _temperatura = value;
            if (value > Umbral)
                OnSobrecalentado(new TemperaturaEventArgs(value, Umbral));
        }
    }

    // 3) Método "raiser": protected virtual → las subclases pueden interceptar/extender
    protected virtual void OnSobrecalentado(TemperaturaEventArgs e)
        => Sobrecalentado?.Invoke(this, e);      // 'this' como sender
}

// 4) Suscriptores
public class Pantalla
{
    public void Suscribir(Termostato t) => t.Sobrecalentado += AlSobrecalentar;
    public void Desuscribir(Termostato t) => t.Sobrecalentado -= AlSobrecalentar;

    // Handler: convención Objeto_Evento o On/Al + evento
    private void AlSobrecalentar(object? sender, TemperaturaEventArgs e)
        => Console.WriteLine($"🔥 {e.Actual}° (umbral {e.Umbral}°) a las {e.Momento:T}");
}

// 5) Uso
var termo = new Termostato { Umbral = 30 };
var pantalla = new Pantalla();
pantalla.Suscribir(termo);
termo.Sobrecalentado += (s, e) => Console.WriteLine($"[log] {e.Actual}");   // lambda

termo.Temperatura = 25;   // nada
termo.Temperatura = 35;   // 🔥 35° (umbral 30°) ...   [log] 35
```

> 💡 Si el evento no lleva datos: `public event EventHandler? Iniciado;` y se dispara con `Iniciado?.Invoke(this, EventArgs.Empty);` (`EventArgs.Empty` evita alocar un objeto vacío cada vez).

> ❓ **Entrevista**: *"¿Por qué el método `OnXxx` es `protected virtual`?"* → Porque las derivadas no pueden invocar el evento del padre directamente; `OnXxx` les da un punto de extensión: pueden sobrescribirlo para reaccionar **antes** que los suscriptores externos, o suprimir el evento, llamando o no a `base.OnXxx(e)`.

---

## 4. Qué genera el compilador: field-like events y accessors

Cuando escribes `public event EventHandler<T>? Algo;`, el compilador genera tres cosas (simplificado):

```csharp
// 1) Un campo delegate PRIVADO
private EventHandler<T>? Algo;

// 2) y 3) Dos métodos públicos: add y remove
public event EventHandler<T>? Algo
{
    add
    {
        // Loop lock-free con Interlocked.CompareExchange (thread-safe)
        EventHandler<T>? actual = this.Algo, previo;
        do
        {
            previo = actual;
            var nuevo = (EventHandler<T>?)Delegate.Combine(previo, value);
            actual = Interlocked.CompareExchange(ref this.Algo, nuevo, previo);
        } while (actual != previo);
    }
    remove { /* igual, con Delegate.Remove */ }
}
```

Por eso, **dentro** de la clase, `Algo` se refiere al **campo** (puedes invocarlo o asignarlo), y **fuera** se refiere al **evento** (solo `add`/`remove`). En IL verás métodos `add_Algo` y `remove_Algo`, igual que `get_X`/`set_X` en las propiedades (Sesión 6).

```
    Código externo              Clase publicadora
    ──────────────              ───────────────────────────
    obj.Algo += h;   ────────▶  add_Algo(h)    ─┐
    obj.Algo -= h;   ────────▶  remove_Algo(h) ─┼─▶ campo privado EventHandler<T>? Algo
                                Algo?.Invoke()  ─┘   (solo accesible aquí dentro)
```

### 4.1 Event accessors personalizados
Como una propiedad con `get`/`set` explícitos, puedes escribir `add`/`remove` a mano. Casos reales:

```csharp
// a) Delegar el evento en otro objeto (fachada / wrapper)
public class ServicioFacade
{
    private readonly Termostato _interno = new();

    public event EventHandler<TemperaturaEventArgs>? Sobrecalentado
    {
        add    => _interno.Sobrecalentado += value;
        remove => _interno.Sobrecalentado -= value;
    }
}

// b) Validar o registrar suscripciones; controlar concurrencia con un lock propio
public class Sensor
{
    private EventHandler? _lectura;
    private readonly Lock _lock = new();   // .NET 9 (antes: private readonly object _lock = new();)
    private int _suscriptores;

    public event EventHandler? Lectura
    {
        add    { lock (_lock) { _lectura += value; _suscriptores++; if (_suscriptores == 1) EncenderHardware(); } }
        remove { lock (_lock) { _lectura -= value; _suscriptores--; if (_suscriptores == 0) ApagarHardware(); } }
    }
    // Patrón "lazy": solo consume recursos mientras alguien escucha
    private void EncenderHardware() { }
    private void ApagarHardware() { }
}
```

c) **`EventHandlerList`** (WinForms): un control tiene ~70 eventos y casi nadie se suscribe a más de 3. En vez de 70 campos delegate (70 punteros por instancia), usa accessors personalizados que guardan los handlers en un diccionario disperso. Optimización de memoria clásica.

> ⚠️ Con accessors personalizados **ya no existe el campo implícito**: no puedes hacer `Lectura?.Invoke(...)` sobre el evento; invocas tu campo de respaldo (`_lectura?.Invoke(...)`).

---

## 5. Seguridad frente a hilos al disparar eventos

El problema clásico (pre C# 6):

```csharp
// ❌ Condición de carrera
if (Sobrecalentado != null)              // hilo A: hay suscriptores
    // ... hilo B hace -= y deja el campo en null ...
    Sobrecalentado(this, e);             // hilo A: 💥 NullReferenceException
```

Soluciones:

```csharp
// ✅ Copia local (patrón clásico): los delegates son INMUTABLES, la copia no cambia
var handler = Sobrecalentado;
if (handler != null) handler(this, e);

// ✅ C# 6+: el operador ?. evalúa la referencia UNA sola vez → equivalente a lo anterior
Sobrecalentado?.Invoke(this, e);
```

Esto funciona porque, como vimos en la **Sesión 10**, `+=` / `-=` **crean un delegate nuevo** en lugar de mutar el existente. La copia local conserva la lista vieja intacta.

> ⚠️ **Lo que `?.Invoke` NO resuelve**: un suscriptor puede recibir **una notificación después de haberse desuscrito** (el hilo A ya copió la lista vieja). Los handlers deben tolerarlo (p. ej., comprobar si ya están "dispuestos").

> ⚠️ **Los handlers corren en el hilo que dispara el evento**, de forma **síncrona**. Si el termostato dispara desde un hilo del ThreadPool, tu handler de UI se ejecuta ahí → en WPF/WinForms/MAUI debes volver al hilo de UI (`Dispatcher.Invoke`, `SynchronizationContext`). Y un handler lento **bloquea** al publicador y a los suscriptores siguientes.

---

## 6. Excepciones en los handlers

Un evento es un delegate multicast: si un suscriptor lanza, **los siguientes no se ejecutan** y la excepción sube hasta **quien disparó** el evento.

```csharp
termo.Sobrecalentado += (s, e) => Console.WriteLine("A");
termo.Sobrecalentado += (s, e) => throw new InvalidOperationException("B falló");
termo.Sobrecalentado += (s, e) => Console.WriteLine("C");   // nunca se ejecuta

termo.Temperatura = 40;   // imprime A y luego 💥 en el setter de Temperatura
```

Si tu publicador no debe caerse por culpa de un suscriptor (librerías, buses, plugins), invoca cada handler aislado:

```csharp
protected virtual void OnSobrecalentado(TemperaturaEventArgs e)
{
    var handlers = Sobrecalentado;
    if (handlers is null) return;

    List<Exception>? errores = null;
    foreach (EventHandler<TemperaturaEventArgs> h in handlers.GetInvocationList())
    {
        try { h(this, e); }
        catch (Exception ex) { (errores ??= new()).Add(ex); }
    }
    if (errores is not null)
        throw new AggregateException("Uno o más suscriptores fallaron", errores);  // Sesión 12
}
```

---

## 7. El memory leak por eventos (pregunta obligada)

Recuerda de la Sesión 10: un delegate a un método de instancia guarda una **referencia fuerte** a su `Target`. Al suscribirte, **el publicador pasa a referenciar al suscriptor**:

```
   Publicador (vive MUCHO: singleton, estático, ventana principal)
   ┌──────────────────────────┐
   │ event Cambio ────────────┼──▶ delegate ──Target──▶ Suscriptor (debería morir)
   └──────────────────────────┘                        ┌─────────────────────┐
                                                       │ ViewModel / Form    │
                                                       │ + 200 MB de datos   │
                                                       └─────────────────────┘
   El suscriptor es ALCANZABLE desde el publicador → el GC NO puede recolectarlo
```

La dirección importa:

| Quién vive más | ¿Leak? | Por qué |
|---|---|---|
| Publicador de larga vida, suscriptor de corta vida | ✅ **Sí** | El publicador mantiene vivo al suscriptor |
| Publicador de corta vida, suscriptor de larga vida | ❌ No | Cuando el publicador muere, se lleva la referencia |
| Misma vida (p. ej., un form y su botón) | ❌ No | Mueren juntos (el GC maneja ciclos) |

```csharp
public static class Configuracion                // estático → vive para siempre
{
    public static event EventHandler? Cambio;
    public static void Recargar() => Cambio?.Invoke(null, EventArgs.Empty);  // sender null en eventos estáticos
}

public class DetalleViewModel
{
    private readonly byte[] _datos = new byte[100_000_000];
    public DetalleViewModel() => Configuracion.Cambio += AlCambiar;   // ⚠️ nunca se desuscribe
    private void AlCambiar(object? s, EventArgs e) { }
}

for (int i = 0; i < 20; i++)
    _ = new DetalleViewModel();   // 20 × 100 MB que el GC NUNCA libera → OutOfMemoryException
```

### 7.1 Soluciones

**1. Desuscribirse explícitamente (la más común).** Combínalo con `IDisposable` (Sesión 14):
```csharp
public sealed class DetalleViewModel : IDisposable
{
    public DetalleViewModel() => Configuracion.Cambio += AlCambiar;
    private void AlCambiar(object? s, EventArgs e) { }
    public void Dispose() => Configuracion.Cambio -= AlCambiar;    // ✅ romper la referencia
}

using var vm = new DetalleViewModel();   // Dispose al salir del scope
```

**2. Devolver un "token" de suscripción** (el estilo de Rx y de muchas librerías):
```csharp
public static class EventExtensions
{
    public static IDisposable Suscribir(this Termostato t, EventHandler<TemperaturaEventArgs> h)
    {
        t.Sobrecalentado += h;
        return new Desuscriptor(() => t.Sobrecalentado -= h);
    }

    private sealed class Desuscriptor(Action alDisponer) : IDisposable
    {
        private Action? _alDisponer = alDisponer;
        public void Dispose() => Interlocked.Exchange(ref _alDisponer, null)?.Invoke(); // idempotente
    }
}

using IDisposable sub = termo.Suscribir((s, e) => Console.WriteLine(e.Actual));
// al hacer Dispose se desuscribe (útil también con lambdas, que no se pueden quitar con -= directo)
```

**3. Weak events**: el publicador guarda una `WeakReference` al suscriptor, que no impide su recolección. WPF lo trae (`WeakEventManager<TSource,TArgs>`); en otros contextos se implementa con `WeakReference<T>` o `ConditionalWeakTable`. Coste: más complejidad y overhead; úsalo cuando no controlas el ciclo de vida del suscriptor.

> ⚠️ **Lambdas que capturan `this`** también provocan leak (la closure referencia al suscriptor) y, además, **no puedes desuscribirlas** con `-=` salvo que hayas guardado la referencia (Sesión 10, sección 8).

> ❓ **Entrevista**: *"¿Cómo pueden los eventos causar memory leaks en un lenguaje con GC?"* → El GC libera lo **inalcanzable**. Suscribirse hace que el publicador tenga una referencia fuerte al suscriptor a través del `Target` del delegate. Si el publicador vive más (estático, singleton, servicio de larga vida), el suscriptor permanece alcanzable aunque ya no se use. Soluciones: desuscribirse (idealmente en `Dispose`), tokens `IDisposable`, weak events. Detectable con un profiler de memoria (dotMemory, `dotnet-gcdump`) buscando el *retention path*.

---

## 8. Eventos cancelables y "antes/después"

Convención: un evento en gerundio (`Closing`) ocurre **antes** y puede cancelarse; uno en pasado (`Closed`) ocurre **después**.

```csharp
using System.ComponentModel;   // CancelEventArgs

public sealed class GuardandoEventArgs(string archivo) : CancelEventArgs
{
    public string Archivo { get; } = archivo;
    // hereda: public bool Cancel { get; set; }
}

public class Documento
{
    public event EventHandler<GuardandoEventArgs>? Guardando;   // antes (cancelable)
    public event EventHandler? Guardado;                        // después

    public bool Guardar(string archivo)
    {
        var e = new GuardandoEventArgs(archivo);
        Guardando?.Invoke(this, e);
        if (e.Cancel) return false;            // algún suscriptor vetó la operación

        File.WriteAllText(archivo, "contenido");
        Guardado?.Invoke(this, EventArgs.Empty);
        return true;
    }
}

var doc = new Documento();
doc.Guardando += (s, e) =>
{
    if (e.Archivo.EndsWith(".exe")) e.Cancel = true;   // un validador veta
};
Console.WriteLine(doc.Guardar("virus.exe"));   // False
```

> ⚠️ Con varios suscriptores, el **último** puede volver a poner `Cancel = false` y anular el veto de otro. Si el veto debe ser definitivo, recorre `GetInvocationList()` y detente en cuanto `e.Cancel` sea `true`.

---

## 9. Eventos en interfaces, estáticos y `INotifyPropertyChanged`

```csharp
// Eventos en interfaces: parte del contrato
public interface ISensor
{
    event EventHandler<double>? LecturaRecibida;    // TEventArgs ya no necesita heredar de EventArgs (.NET 4.5+)
}

// La interfaz de eventos más usada de .NET: base de todo el data binding (WPF, MAUI, Blazor)
public class ClienteViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    private string _nombre = "";
    public string Nombre
    {
        get => _nombre;
        set
        {
            if (_nombre == value) return;
            _nombre = value;
            OnPropertyChanged();                         // CallerMemberName rellena "Nombre"
        }
    }

    protected virtual void OnPropertyChanged([CallerMemberName] string? prop = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(prop));
}
```
(`[CallerMemberName]` es un atributo del compilador; los atributos se ven en la **Sesión 20**. Requiere `using System.Runtime.CompilerServices;`.)

> ⚠️ **Eventos estáticos**: úsalos con mucha precaución. Viven toda la vida del proceso → son la fuente #1 de leaks del apartado 7.

---

## 10. Eventos y asincronía

`EventHandler` devuelve `void`, así que un handler asíncrono es `async void`:

```csharp
termo.Sobrecalentado += async (s, e) =>
{
    await EnviarAlertaAsync(e.Actual);   // si lanza aquí, la excepción NO vuelve al publicador
};
```

> ⚠️ `async void` es aceptable **solo** en handlers de eventos, pero: el publicador **no espera** a que termine (continúa inmediatamente), y una excepción no capturada se relanza en el `SynchronizationContext`/ThreadPool y puede **tumbar el proceso**. Envuelve siempre el cuerpo en `try/catch`. Lo vemos a fondo en la **Sesión 13**.

Si el publicador **necesita** esperar a los suscriptores, no uses `EventHandler`; define un delegate que devuelva `Task`:

```csharp
public delegate Task AsyncEventHandler<TArgs>(object? sender, TArgs e);

public class Pedidos
{
    public event AsyncEventHandler<int>? PedidoCreado;

    public async Task CrearAsync(int id)
    {
        if (PedidoCreado is null) return;
        var tareas = PedidoCreado.GetInvocationList()
                                 .Cast<AsyncEventHandler<int>>()
                                 .Select(h => h(this, id));
        await Task.WhenAll(tareas);          // espera a TODOS (en paralelo)
    }
}
```

---

## 11. Eventos vs alternativas modernas

| Mecanismo | Acoplamiento | Cuándo | Ejemplo |
|---|---|---|---|
| **`event` C#** | Suscriptor necesita referencia al publicador (mismo proceso) | Notificaciones dentro de un objeto/componente, UI | `Button.Click`, `INotifyPropertyChanged` |
| **`IObservable<T>` / Rx.NET** | Igual, pero composable (filtrar, throttle, combinar streams) con LINQ | Flujos de eventos complejos: sensores, UI reactiva | `clicks.Throttle(...).Where(...)` |
| **`Channel<T>`** | Productor/consumidor desacoplados, con backpressure y async | Pipelines asíncronos en el mismo proceso | Sesión 29 |
| **Eventos de dominio + mediador** (MediatR) | Publicador **no** tiene referencia a los handlers (los resuelve DI) | Clean Architecture / DDD: "PedidoConfirmado" → handlers | Sesión 26 |
| **Mensajería** (RabbitMQ, SQS/SNS, Kafka) | Entre procesos/servicios, persistente | Microservicios, integración | EventBridge, outbox pattern |

```csharp
// IObservable<T> nativo de .NET (sin Rx): el Subscribe devuelve IDisposable → sin leaks
public class TermostatoObservable : IObservable<double>
{
    private readonly List<IObserver<double>> _observadores = [];

    public IDisposable Subscribe(IObserver<double> o)
    {
        _observadores.Add(o);
        return new Desuscriptor(() => _observadores.Remove(o));
    }

    public void Publicar(double t) { foreach (var o in _observadores.ToArray()) o.OnNext(t); }
    public void Terminar()         { foreach (var o in _observadores.ToArray()) o.OnCompleted(); }

    private sealed class Desuscriptor(Action a) : IDisposable { public void Dispose() => a(); }
}
```

Ventajas de `IObservable<T>` sobre `event`: la suscripción es un objeto `IDisposable` (desuscripción explícita), hay canal de **error** (`OnError`) y de **finalización** (`OnCompleted`), y con Rx.NET se componen como consultas LINQ (Sesión 9).

> ❓ **Entrevista**: *"¿`event` o eventos de dominio con MediatR?"* → `event` es un mecanismo del **lenguaje** para notificaciones en proceso con acoplamiento directo (el suscriptor conoce al publicador). Los eventos de dominio son un **patrón de arquitectura**: la entidad registra "qué pasó" y un dispatcher, normalmente tras persistir (`SaveChanges`), lo entrega a handlers resueltos por DI, sin que la entidad los conozca. Para cruzar procesos → mensajería (con *outbox* para consistencia).

---

## 12. Resumen mental de la sesión

```
Observer / pub-sub: el publicador anuncia, no conoce a los suscriptores

event = modificador sobre un delegate  ("es a un delegate lo que una propiedad a un campo")
   fuera de la clase: SOLO += y -=   (no '=', no Invoke, ni siquiera en derivadas)
   compilador genera: campo privado + add_X/remove_X (thread-safe con Interlocked)

Convención .NET:
   event EventHandler<TArgs>? Cambiado;          (sender, e)
   TArgs : EventArgs, inmutable · EventArgs.Empty si no hay datos
   protected virtual void OnCambiado(TArgs e) => Cambiado?.Invoke(this, e);
   "-ing" = antes/cancelable (CancelEventArgs) · "-ed" = después

Disparo: ?.Invoke = copia atómica (delegates inmutables) · handlers SÍNCRONOS, en el hilo del publicador
Excepción en un handler → corta la cadena y sube al publicador (GetInvocationList para aislar)
LEAK: publicador longevo → Target → suscriptor vivo para siempre
   → -= en Dispose · token IDisposable · weak events · cuidado con eventos static
async void solo en handlers, con try/catch
```

---

## 13. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué diferencia hay entre un delegate y un evento? ¿Qué te impide hacer la keyword `event`?
2. ❓ ¿Qué genera el compilador para un field-like event? ¿Qué son `add_X` y `remove_X`?
3. ❓ Describe la convención estándar de eventos en .NET (`sender`, `EventArgs`, `OnXxx`).
4. ❓ ¿Por qué el método `OnXxx` es `protected virtual`? ¿Puede una clase derivada invocar el evento del padre?
5. ❓ ¿Por qué `Evento?.Invoke(this, e)` es thread-safe y qué problema sigue sin resolver?
6. ❓ ¿Qué pasa si uno de los suscriptores lanza una excepción? ¿Cómo aíslas a los demás?
7. ❓ Explica el memory leak por eventos: ¿en qué dirección de lifetimes ocurre y cómo lo evitas?
8. ❓ ¿Cuándo escribirías accessors `add`/`remove` personalizados?
9. ❓ ¿Cómo implementas un evento cancelable?
10. ❓ ¿En qué hilo se ejecutan los handlers? ¿Qué implica para una UI?
11. ❓ ¿Qué problemas tiene un handler `async void` y cómo harías un evento "awaitable"?
12. ❓ `event` vs `IObservable<T>` vs eventos de dominio vs mensajería: ¿cuándo cada uno?

## 14. Ejercicio práctico
1. Crea `dotnet new console -o EventosLab`.
2. Implementa una clase `CuentaBancaria` con:
   - `event EventHandler<MovimientoEventArgs>? MovimientoRealizado` (datos: tipo, monto, saldo resultante),
   - `event EventHandler<RetiroEventArgs>? Retirando` **cancelable** (hereda de `CancelEventArgs`),
   - métodos `Depositar` y `Retirar` que disparen los eventos con el patrón `protected virtual OnXxx`.
3. Crea tres suscriptores: un `Auditor` que imprime cada movimiento, un `ControlFraude` que cancela retiros mayores a 1.000.000, y un `Notificador` que lanza una excepción a propósito. Verifica que el `Auditor` deja de recibir notificaciones si se suscribe **después** del `Notificador`, y luego arréglalo aislando los handlers con `GetInvocationList()`.
4. Intenta desde `Program.cs` hacer `cuenta.MovimientoRealizado = null;` y `cuenta.MovimientoRealizado?.Invoke(...)`. Lee los errores del compilador (CS0070).
5. **Reproduce el leak**: crea un publicador `static` y 50 suscriptores con un `byte[10_000_000]` cada uno. Llama a `GC.Collect()` y mide `GC.GetTotalMemory(true)`. Luego haz que implementen `IDisposable` desuscribiéndose, úsalos con `using` y compara la memoria.
6. Implementa el método de extensión `Suscribir(...)` que devuelve un `IDisposable` y úsalo con una lambda.
7. (Avanzado) Reescribe `CuentaBancaria` para que implemente `IObservable<MovimientoEventArgs>` y comprueba que `Dispose()` sobre la suscripción deja de notificar.

---

➡️ **Cuando termines**, marca la Sesión 11 en el [README](Readme.md) y pídeme la **Sesión 12 — Manejo de excepciones**.
