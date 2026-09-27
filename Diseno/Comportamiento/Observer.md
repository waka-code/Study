# Observer Pattern

El patrón Observer es un patrón de diseño de comportamiento que establece una relación de suscripción entre objetos. Permite que un objeto (el sujeto) notifique automáticamente a múltiples objetos (los observadores) sobre cambios en su estado, sin que estos estén estrechamente acoplados.

## Relación con Suscripción y Eventos
El patrón Observer se basa en el concepto de suscripción y eventos:
- **Suscripción**: Los observadores se "suscriben" al sujeto para recibir notificaciones cuando ocurre un cambio.
- **Eventos**: El sujeto "emite eventos" que los observadores escuchan y manejan.

Este patrón es ampliamente utilizado en sistemas donde es necesario mantener la consistencia entre objetos relacionados, como en interfaces gráficas, sistemas de notificaciones y arquitecturas basadas en eventos.

## ¿Cuándo usarlo?
- Cuando un objeto debe notificar a otros objetos sobre cambios en su estado.
- Cuando deseas minimizar el acoplamiento entre el objeto que cambia y los objetos que dependen de él.

## Ejemplo en .NET (C#)
```csharp
public interface IObserver {
    void Update();
}

public class ConcreteObserver : IObserver {
    public void Update() {
        Console.WriteLine("Notificado de un cambio.");
    }
}

public class Subject {
    private List<IObserver> _observers = new List<IObserver>();

    public void Attach(IObserver observer) {
        _observers.Add(observer);
    }

    public void Notify() {
        foreach (var observer in _observers) {
            observer.Update();
        }
    }
}

// Uso
var subject = new Subject();
var observer = new ConcreteObserver();
subject.Attach(observer);
subject.Notify();
```

## Ejemplo en TypeScript
```typescript
interface Observer {
  update(): void;
}

class ConcreteObserver implements Observer {
  update() {
    console.log("Notificado de un cambio.");
  }
}

class Subject {
  private observers: Observer[] = [];

  attach(observer: Observer) {
    this.observers.push(observer);
  }

  notify() {
    this.observers.forEach(o => o.update());
  }
}

// Uso
const subject = new Subject();
const observer = new ConcreteObserver();
subject.attach(observer);
subject.notify();
```

## Comparación con Eventos en JavaScript
En JavaScript, el patrón Observer se implementa comúnmente utilizando eventos. Por ejemplo:

```javascript
const EventEmitter = require('events');

class Subject extends EventEmitter {}

const subject = new Subject();

// Suscribir observadores
subject.on('change', () => {
  console.log('Notificado de un cambio.');
});

// Emitir evento
subject.emit('change');
```

## Ventajas
- **Desacoplamiento**: Los observadores no necesitan conocer los detalles del sujeto.
- **Flexibilidad**: Puedes agregar o quitar observadores en tiempo de ejecución.

## Desventajas
- **Complejidad**: Puede ser difícil de depurar cuando hay muchos observadores.
- **Rendimiento**: Si hay demasiados observadores, las notificaciones pueden afectar el rendimiento.

El patrón Observer es una herramienta poderosa para manejar la comunicación entre objetos en sistemas dinámicos y basados en eventos.
