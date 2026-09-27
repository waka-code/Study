# Iterator Pattern

## ¿Cuándo usarlo?
Cuando quieres recorrer los elementos de una colección **sin exponer su estructura interna** (lista, árbol, grafo, resultados paginados de una API), o cuando necesitas varias formas de recorrerla (en profundidad, en anchura, al revés).

## Explicación simple (analogía del guía turístico)
Visitar una ciudad: puedes caminar al azar, usar una app o contratar un guía. La ciudad (colección) es la misma; lo que cambia es el **recorrido**. El iterador es el guía: te dice "siguiente" y "¿quedan lugares?", y tú no necesitas conocer el mapa.

En la práctica, casi todos los lenguajes lo traen integrado: `IEnumerable`/`IEnumerator` + `foreach` + `yield` en C#, y `Symbol.iterator` + `for...of` + generadores en JS/TS.

## Ejemplo en .NET (C#)
```csharp
public class TreeNode<T> {
    public T Value { get; }
    public List<TreeNode<T>> Children { get; } = new();
    public TreeNode(T value) { Value = value; }
}

public class Tree<T> : IEnumerable<T> {
    private readonly TreeNode<T> _root;
    public Tree(TreeNode<T> root) { _root = root; }

    // Recorrido en profundidad; el cliente no ve la estructura interna
    public IEnumerator<T> GetEnumerator() {
        var stack = new Stack<TreeNode<T>>();
        stack.Push(_root);
        while (stack.Count > 0) {
            var node = stack.Pop();
            yield return node.Value;
            for (int i = node.Children.Count - 1; i >= 0; i--)
                stack.Push(node.Children[i]);
        }
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

// Uso
// foreach (var value in tree) Console.WriteLine(value);
```

## Ejemplo en TypeScript
```typescript
class TreeNode<T> {
  children: TreeNode<T>[] = [];
  constructor(public value: T) {}
}

class Tree<T> implements Iterable<T> {
  constructor(private root: TreeNode<T>) {}

  // Recorrido en profundidad con un generador
  *[Symbol.iterator](): Iterator<T> {
    const stack = [this.root];
    while (stack.length) {
      const node = stack.pop()!;
      yield node.value;
      stack.push(...[...node.children].reverse());
    }
  }
}

// Uso
const root = new TreeNode("A");
root.children.push(new TreeNode("B"), new TreeNode("C"));
for (const value of new Tree(root)) console.log(value); // A, B, C

// Iterador asíncrono: recorrer una API paginada
async function* fetchAllPages(url: string) {
  let next: string | null = url;
  while (next) {
    const res: { items: unknown[]; next: string | null } = await (await fetch(next)).json();
    yield* res.items;
    next = res.next;
  }
}
```

## Ventajas
- Separa el algoritmo de recorrido de la colección (Single Responsibility).
- Permite recorridos perezosos (lazy): procesas elemento por elemento sin cargar todo en memoria.
