# Visitor Pattern

## ¿Cuándo usarlo?
Cuando tienes una **jerarquía de clases estable** (nodos de un AST, formas geométricas, elementos de un documento) y necesitas agregarle **operaciones nuevas** con frecuencia (exportar a JSON, calcular área, validar, imprimir) sin modificar esas clases cada vez.

## Explicación simple (analogía del agente de seguros)
Un agente de seguros visita distintos edificios: a una casa le ofrece seguro contra incendio, a un banco seguro contra robo, a una fábrica seguro contra accidentes. Los edificios no cambian; el agente (visitor) trae la operación y **cada edificio le dice qué tipo es** (`accept`) para que el agente aplique la oferta correcta. Esto se llama **double dispatch**.

**Trade-off clave:** agregar una operación nueva es fácil (un visitor nuevo), pero agregar una clase nueva a la jerarquía es caro (hay que tocar todos los visitors).

## Ejemplo en .NET (C#)
```csharp
public interface IShapeVisitor<T> {
    T VisitCircle(Circle c);
    T VisitRectangle(Rectangle r);
}

public interface IShape {
    T Accept<T>(IShapeVisitor<T> visitor);
}

public class Circle : IShape {
    public double Radius { get; init; }
    public T Accept<T>(IShapeVisitor<T> v) => v.VisitCircle(this);
}

public class Rectangle : IShape {
    public double Width { get; init; }
    public double Height { get; init; }
    public T Accept<T>(IShapeVisitor<T> v) => v.VisitRectangle(this);
}

// Operación nueva sin tocar las formas
public class AreaVisitor : IShapeVisitor<double> {
    public double VisitCircle(Circle c) => Math.PI * c.Radius * c.Radius;
    public double VisitRectangle(Rectangle r) => r.Width * r.Height;
}

public class JsonExportVisitor : IShapeVisitor<string> {
    public string VisitCircle(Circle c) => $"{{\"type\":\"circle\",\"r\":{c.Radius}}}";
    public string VisitRectangle(Rectangle r) => $"{{\"type\":\"rect\",\"w\":{r.Width},\"h\":{r.Height}}}";
}

// Uso
var shapes = new List<IShape> { new Circle { Radius = 1 }, new Rectangle { Width = 2, Height = 3 } };
var totalArea = shapes.Sum(s => s.Accept(new AreaVisitor()));
```

## Ejemplo en TypeScript
```typescript
interface ShapeVisitor<T> {
  visitCircle(c: Circle): T;
  visitRectangle(r: Rectangle): T;
}

interface Shape {
  accept<T>(visitor: ShapeVisitor<T>): T;
}

class Circle implements Shape {
  constructor(public radius: number) {}
  accept<T>(v: ShapeVisitor<T>) { return v.visitCircle(this); }
}

class Rectangle implements Shape {
  constructor(public width: number, public height: number) {}
  accept<T>(v: ShapeVisitor<T>) { return v.visitRectangle(this); }
}

// Operaciones nuevas sin tocar las formas
class AreaVisitor implements ShapeVisitor<number> {
  visitCircle(c: Circle) { return Math.PI * c.radius ** 2; }
  visitRectangle(r: Rectangle) { return r.width * r.height; }
}

class JsonExportVisitor implements ShapeVisitor<string> {
  visitCircle(c: Circle) { return JSON.stringify({ type: "circle", r: c.radius }); }
  visitRectangle(r: Rectangle) { return JSON.stringify({ type: "rect", w: r.width, h: r.height }); }
}

// Uso
const shapes: Shape[] = [new Circle(1), new Rectangle(2, 3)];
const total = shapes.reduce((sum, s) => sum + s.accept(new AreaVisitor()), 0);
```

> En TypeScript moderno, muchas veces se reemplaza Visitor por **uniones discriminadas + `switch`** con chequeo exhaustivo (`never`), que logra lo mismo con menos código.
