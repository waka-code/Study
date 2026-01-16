# O — Open/Closed Principle (OCP)

El Principio Abierto/Cerrado establece que las entidades de software (clases, módulos, funciones) deben estar abiertas para su extensión, pero cerradas para su modificación.

---

## Ejemplo en .NET (C#)

Supón que tienes una clase para calcular el área de figuras:

```csharp
public class AreaCalculator {
    public double CalculateArea(object shape) {
        if (shape is Rectangle rect)
            return rect.Width * rect.Height;
        else if (shape is Circle circ)
            return Math.PI * circ.Radius * circ.Radius;
        // Si agregas más figuras, debes modificar este método
        return 0;
    }
}
```

**¿Qué está mal?**
- Cada vez que agregas una nueva figura, tienes que modificar `AreaCalculator`.

**Aplicando OCP:**

```csharp
public interface IShape {
    double Area();
}

public class Rectangle : IShape {
    public double Width { get; set; }
    public double Height { get; set; }
    public double Area() => Width * Height;
}

public class Circle : IShape {
    public double Radius { get; set; }
    public double Area() => Math.PI * Radius * Radius;
}

public class AreaCalculator {
    public double CalculateArea(IShape shape) => shape.Area();
}
```

Ahora puedes agregar nuevas figuras sin modificar `AreaCalculator`.

---

## Ejemplo en TypeScript

Mal ejemplo:

```typescript
class AreaCalculator {
  calculate(shape: any): number {
    if (shape.type === 'rectangle') {
      return shape.width * shape.height;
    } else if (shape.type === 'circle') {
      return Math.PI * shape.radius * shape.radius;
    }
    return 0;
  }
}
```

**¿Qué está mal?**
- Debes modificar el método cada vez que agregas una nueva figura.

**Aplicando OCP:**

```typescript
interface Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(public width: number, public height: number) {}
  area(): number {
    return this.width * this.height;
  }
}

class Circle implements Shape {
  constructor(public radius: number) {}
  area(): number {
    return Math.PI * this.radius * this.radius;
  }
}

class AreaCalculator {
  calculate(shape: Shape): number {
    return shape.area();
  }
}
```

Ahora puedes extender con nuevas figuras sin modificar `AreaCalculator`.