# Factory Pattern

## ¿Cuándo usarlo?
Cuando necesitas delegar la creación de objetos a una clase o método especializado, especialmente si el tipo exacto de objeto a crear puede variar en tiempo de ejecución.

## Video
## https://www.youtube.com/watch?v=-MHnvg7xZsI

## Ejemplo en .NET (C#)
```csharp
public interface IProduct {
    string GetName();
}

public class ConcreteProductA : IProduct {
    public string GetName() => "Producto A";
}

public class ConcreteProductB : IProduct {
    public string GetName() => "Producto B";
}

public class ProductFactory {
    public IProduct CreateProduct(string type) {
        if (type == "A") return new ConcreteProductA();
        if (type == "B") return new ConcreteProductB();
        throw new ArgumentException("Tipo desconocido");
    }
}
```

## Ejemplo en TypeScript
```typescript
interface Product {
  getName(): string;
}

class ConcreteProductA implements Product {
  getName() { return "Producto A"; }
}

class ConcreteProductB implements Product {
  getName() { return "Producto B"; }
}

class ProductFactory {
  createProduct(type: string): Product {
    if (type === "A") return new ConcreteProductA();
    if (type === "B") return new ConcreteProductB();
    throw new Error("Tipo desconocido");
  }
}
```

---

## Factory Method (versión GoF)

Lo de arriba es una **Simple Factory** (un método con `if`s). El **Factory Method** del catálogo GoF va un paso más allá: la clase base define el algoritmo y deja que **las subclases decidan qué objeto crear**, sobrescribiendo un método "fábrica". Así agregar un producto nuevo no obliga a tocar un `if` existente (Open/Closed).

### Explicación simple (analogía de logística)
Una empresa de logística planifica entregas siempre igual: crea el transporte y lo envía. La logística **terrestre** crea camiones; la **marítima**, barcos. El plan de entrega no cambia, solo *qué* transporte se fabrica.

### Ejemplo en .NET (C#)
```csharp
public interface ITransport { string Deliver(); }

public class Truck : ITransport { public string Deliver() => "Entrega por tierra en camión"; }
public class Ship  : ITransport { public string Deliver() => "Entrega por mar en barco"; }

public abstract class Logistics {
    // Factory Method
    protected abstract ITransport CreateTransport();

    public string PlanDelivery() {
        var transport = CreateTransport();
        return transport.Deliver();
    }
}

public class RoadLogistics : Logistics {
    protected override ITransport CreateTransport() => new Truck();
}

public class SeaLogistics : Logistics {
    protected override ITransport CreateTransport() => new Ship();
}
```

### Ejemplo en TypeScript
```typescript
interface Transport { deliver(): string; }

class Truck implements Transport { deliver() { return "Entrega por tierra en camión"; } }
class Ship implements Transport { deliver() { return "Entrega por mar en barco"; } }

abstract class Logistics {
  // Factory Method
  protected abstract createTransport(): Transport;

  planDelivery(): string {
    const transport = this.createTransport();
    return transport.deliver();
  }
}

class RoadLogistics extends Logistics {
  protected createTransport() { return new Truck(); }
}

class SeaLogistics extends Logistics {
  protected createTransport() { return new Ship(); }
}

// Uso
const logistics: Logistics = new SeaLogistics();
console.log(logistics.planDelivery());
```

### Simple Factory vs Factory Method vs Abstract Factory
| | Simple Factory | Factory Method | Abstract Factory |
|---|---|---|---|
| Mecanismo | Un método con condicionales | Herencia: la subclase sobrescribe el método creador | Composición: un objeto fábrica crea una familia |
| Crea | Un producto | Un producto | Varios productos relacionados |
| Agregar un tipo nuevo | Modificar el `if` | Nueva subclase | Nueva fábrica concreta |

interface define el contrato
clase concreta implementa detalles
clase base orquesta el flujo 
sub clase deciden que objeto crear