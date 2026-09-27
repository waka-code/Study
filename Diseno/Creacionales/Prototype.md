# Prototype Pattern

## ¿Cuándo usarlo?
Cuando necesitas crear copias de objetos existentes sin que tu código dependa de sus clases concretas, o cuando crear un objeto desde cero es costoso (consultas, cálculos, mucha configuración) y es más barato clonar uno ya preparado.

## Explicación simple (analogía de la división celular)
Una célula no se "fabrica" desde cero: se **duplica a sí misma**. El objeto sabe clonarse, así que quien necesita una copia no necesita saber cómo está construido por dentro (ni acceder a sus campos privados).

**Ojo con la copia superficial vs profunda:** si el objeto tiene referencias a otros objetos (listas, objetos anidados), una copia superficial los comparte entre original y clon. Normalmente quieres una copia profunda.

## Ejemplo en .NET (C#)
```csharp
public interface IPrototype<T> {
    T Clone();
}

public class Address {
    public string City { get; set; }
}

public class Employee : IPrototype<Employee> {
    public string Name { get; set; }
    public Address Address { get; set; }

    public Employee Clone() {
        // Copia profunda: también clonamos Address
        return new Employee {
            Name = Name,
            Address = new Address { City = Address.City }
        };
    }
}

// Uso
var original = new Employee { Name = "Ana", Address = new Address { City = "Santiago" } };
var copia = original.Clone();
copia.Address.City = "Lima"; // no afecta al original
```

## Ejemplo en TypeScript
```typescript
interface Prototype<T> {
  clone(): T;
}

class Address {
  constructor(public city: string) {}
}

class Employee implements Prototype<Employee> {
  constructor(public name: string, public address: Address) {}

  clone(): Employee {
    // Copia profunda
    return new Employee(this.name, new Address(this.address.city));
  }
}

// Uso
const original = new Employee("Ana", new Address("Santiago"));
const copia = original.clone();
copia.address.city = "Lima"; // original sigue en "Santiago"

// En JS moderno también existe structuredClone() para objetos planos
const plano = structuredClone({ a: 1, nested: { b: 2 } });
```

## Ventajas
- Clonas objetos sin acoplarte a sus clases concretas.
- Evitas repetir código de inicialización costoso.

## Desventajas
- Clonar objetos con referencias circulares o recursos (conexiones, streams) es complicado.
