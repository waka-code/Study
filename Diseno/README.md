# Design Patterns (Patrones de Diseño)

Esta carpeta contiene ejemplos y explicaciones de los principales patrones de diseño, organizados por tipo: Creacionales, Estructurales y de Comportamiento.

## ¿Por qué NO usarías un patrón aquí?

A veces, aplicar un patrón de diseño puede añadir complejidad innecesaria si el problema es simple o el patrón no aporta un beneficio claro. Los patrones deben usarse para resolver problemas recurrentes de diseño, no por moda o para complicar el código. Si una solución simple y directa es suficiente, es mejor evitar patrones que solo añadan capas de abstracción sin necesidad.

---

## Índice  

### Creacionales
- [Factory](./Factory.md)
- [Abstract Factory](./AbstractFactory.md)
- [Builder](./Builder.md)
- [Singleton](./Singleton.md)

### Estructurales
- [Adapter](./Adapter.md)
- [Facade](./Facade.md)
- [Decorator](./Decorator.md)

### Comportamiento
- [Strategy](./Strategy.md)
- [Observer](./Observer.md)
- [Command](./Command.md)
- [State](./State.md)

---

## Ejemplo de anti-patrón

### Singleton mal implementado (anti-patrón)
```typescript
// No controla instancias
class BadSingleton {
  static instance: BadSingleton;
  constructor() { BadSingleton.instance = this; }
}
const a = new BadSingleton();
const b = new BadSingleton();
console.log(a === b); // false (debería ser true)
```

**Explicación:**
Un Singleton mal implementado permite múltiples instancias, perdiendo el objetivo del patrón y generando bugs difíciles de rastrear.

---

## Facade

El patrón Facade proporciona una interfaz simplificada para un conjunto de interfaces en un subsistema, facilitando su uso y reduciendo la complejidad para el cliente.

### Ejemplo en TypeScript

```typescript
// Subsistema complejo
class CPU {
  freeze() { console.log('CPU freeze'); }
  jump(position: number) { console.log(`CPU jump to ${position}`); }
  execute() { console.log('CPU execute'); }
}

class Memory {
  load(position: number, data: string) { console.log(`Memory load ${data} at ${position}`); }
}

class HardDrive {
  read(lba: number, size: number): string {
    console.log(`HardDrive read ${size} bytes from ${lba}`);
    return 'data';
  }
}

// Facade
class ComputerFacade {
  private cpu: CPU;
  private memory: Memory;
  private hardDrive: HardDrive;

  constructor() {
    this.cpu = new CPU();
    this.memory = new Memory();
    this.hardDrive = new HardDrive();
  }

  start() {
    this.cpu.freeze();
    this.memory.load(0, this.hardDrive.read(0, 1024));
    this.cpu.jump(0);
    this.cpu.execute();
  }
}

// Cliente
const computer = new ComputerFacade();
computer.start();
```

El cliente interactúa solo con la fachada (`ComputerFacade`), sin preocuparse por la complejidad interna del subsistema.
