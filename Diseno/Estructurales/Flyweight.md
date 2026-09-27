# Flyweight Pattern

## ¿Cuándo usarlo?
Cuando necesitas **millones de objetos parecidos** y la memoria se vuelve un problema (partículas en un juego, árboles en un mapa, caracteres en un editor). Flyweight comparte la parte común entre muchos objetos en vez de duplicarla.

## Explicación simple (analogía del bosque)
Un bosque tiene un millón de árboles, pero solo 3 especies. Cada árbol tiene su propia posición (x, y) — eso es **estado extrínseco** (único). Pero la textura, el color y el nombre de la especie — el **estado intrínseco** (compartido) — se guardan **una sola vez** por especie, y todos los árboles apuntan a él.

| Estado | Ejemplo | Dónde vive |
|---|---|---|
| Intrínseco (compartido, inmutable) | especie, color, textura | En el flyweight (`TreeType`) |
| Extrínseco (único por objeto) | posición x, y | En el objeto de contexto (`Tree`) |

## Ejemplo en .NET (C#)
```csharp
// Flyweight: estado intrínseco
public class TreeType {
    public string Name { get; }
    public string Color { get; }
    public TreeType(string name, string color) { Name = name; Color = color; }
    public void Draw(int x, int y) => Console.WriteLine($"{Name} ({Color}) en {x},{y}");
}

// Fábrica que reutiliza flyweights
public static class TreeFactory {
    private static readonly Dictionary<string, TreeType> _types = new();
    public static TreeType GetTreeType(string name, string color) {
        var key = $"{name}_{color}";
        if (!_types.TryGetValue(key, out var type)) {
            type = new TreeType(name, color);
            _types[key] = type;
        }
        return type;
    }
}

// Contexto: estado extrínseco
public class Tree {
    private readonly int _x, _y;
    private readonly TreeType _type;
    public Tree(int x, int y, TreeType type) { _x = x; _y = y; _type = type; }
    public void Draw() => _type.Draw(_x, _y);
}
```

## Ejemplo en TypeScript
```typescript
// Flyweight: estado intrínseco
class TreeType {
  constructor(readonly name: string, readonly color: string) {}
  draw(x: number, y: number) { console.log(`${this.name} (${this.color}) en ${x},${y}`); }
}

// Fábrica que reutiliza flyweights
class TreeFactory {
  private static types = new Map<string, TreeType>();
  static getTreeType(name: string, color: string): TreeType {
    const key = `${name}_${color}`;
    if (!this.types.has(key)) this.types.set(key, new TreeType(name, color));
    return this.types.get(key)!;
  }
}

// Contexto: estado extrínseco
class Tree {
  constructor(private x: number, private y: number, private type: TreeType) {}
  draw() { this.type.draw(this.x, this.y); }
}

// Uso: 1.000.000 de árboles, pero solo 1 TreeType "Roble"
const trees: Tree[] = [];
for (let i = 0; i < 1_000_000; i++) {
  trees.push(new Tree(i, i, TreeFactory.getTreeType("Roble", "verde")));
}
```

## Ventajas
- Ahorro enorme de memoria cuando hay muchos objetos similares.

## Desventajas
- Añade complejidad; solo vale la pena si realmente tienes un problema de memoria.
- El estado intrínseco debe ser inmutable (si alguien lo modifica, cambia para todos).
