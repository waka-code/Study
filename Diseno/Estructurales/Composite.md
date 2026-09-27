# Composite Pattern

## ¿Cuándo usarlo?
Cuando tu modelo tiene forma de **árbol** (carpetas y archivos, menús y submenús, organigramas, cajas que contienen productos y otras cajas) y quieres que el cliente trate igual a un elemento simple y a un grupo de elementos.

## Explicación simple (analogía de las cajas)
Un pedido tiene productos y cajas; cada caja puede tener productos u otras cajas. Para saber el precio total no quieres preguntar "¿esto es una caja o un producto?" en cada paso: simplemente le pides el precio a cada cosa, y una caja responde sumando el precio de lo que contiene.

## Ejemplo en .NET (C#)
```csharp
public interface IComponent {
    decimal GetPrice();
}

// Hoja
public class Product : IComponent {
    private readonly decimal _price;
    public Product(decimal price) { _price = price; }
    public decimal GetPrice() => _price;
}

// Compuesto
public class Box : IComponent {
    private readonly List<IComponent> _children = new();
    public void Add(IComponent component) => _children.Add(component);
    public decimal GetPrice() => _children.Sum(c => c.GetPrice());
}

// Uso
var small = new Box();
small.Add(new Product(10));
small.Add(new Product(5));

var big = new Box();
big.Add(small);
big.Add(new Product(100));

Console.WriteLine(big.GetPrice()); // 115
```

## Ejemplo en TypeScript
```typescript
interface Component {
  getPrice(): number;
}

// Hoja
class Product implements Component {
  constructor(private price: number) {}
  getPrice() { return this.price; }
}

// Compuesto
class Box implements Component {
  private children: Component[] = [];
  add(c: Component) { this.children.push(c); }
  getPrice() { return this.children.reduce((sum, c) => sum + c.getPrice(), 0); }
}

// Uso
const small = new Box();
small.add(new Product(10));
small.add(new Product(5));

const big = new Box();
big.add(small);
big.add(new Product(100));

console.log(big.getPrice()); // 115
```

## Ventajas
- El cliente trabaja con estructuras complejas de forma uniforme (recursión natural).
- Agregar nuevos tipos de nodos no rompe el código cliente.

## Desventajas
- Puede ser difícil definir una interfaz común cuando hojas y compuestos tienen comportamientos muy distintos.
