# Builder Pattern

## ¿Cuándo usarlo?
Cuando necesitas construir un objeto complejo paso a paso, permitiendo diferentes representaciones del mismo proceso de construcción.

## Ejemplo en .NET (C#)
```csharp
public class Product {
    public string PartA { get; set; }
    public string PartB { get; set; }
}

public interface IBuilder {
    void BuildPartA();
    void BuildPartB();
    Product GetResult();
}

public class ConcreteBuilder : IBuilder {
    private Product _product = new Product();
    public void BuildPartA() { _product.PartA = "A"; }
    public void BuildPartB() { _product.PartB = "B"; }
    public Product GetResult() => _product;
}

public class Director {
    public Product Construct(IBuilder builder) {
        builder.BuildPartA();
        builder.BuildPartB();
        return builder.GetResult();
    }
}
```

## Ejemplo en TypeScript
```typescript
class Product {
  partA?: string;
  partB?: string;
}

interface Builder {
  buildPartA(): void;
  buildPartB(): void;
  getResult(): Product;
}

class ConcreteBuilder implements Builder {
  private product = new Product();
  buildPartA() { this.product.partA = "A"; }
  buildPartB() { this.product.partB = "B"; }
  getResult() { return this.product; }
}

class Director {
  construct(builder: Builder): Product {
    builder.buildPartA();
    builder.buildPartB();
    return builder.getResult();
  }
}
```
