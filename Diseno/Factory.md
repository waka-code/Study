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
