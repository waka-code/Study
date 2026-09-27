# Memento Pattern

## ¿Cuándo usarlo?
Cuando necesitas **guardar y restaurar el estado** de un objeto (deshacer/rehacer, snapshots, checkpoints, borradores) sin romper su encapsulamiento, es decir, sin exponer sus campos privados.

## Explicación simple (analogía del "guardar partida")
En un videojuego guardas la partida: se crea una "foto" del estado. El juego (originador) sabe crear y leer esa foto; el menú de partidas guardadas (cuidador) solo las almacena, **sin poder ver ni modificar su contenido**.

| Rol | Responsabilidad | En el ejemplo |
|---|---|---|
| Originator | Crea el memento y se restaura desde él | `Editor` |
| Memento | Snapshot inmutable del estado | `EditorMemento` |
| Caretaker | Guarda el historial, no mira adentro | `History` |

## Ejemplo en .NET (C#)
```csharp
// Memento inmutable
public record EditorMemento(string Content, int Cursor);

// Originator
public class Editor {
    public string Content { get; private set; } = "";
    public int Cursor { get; private set; }

    public void Type(string text) {
        Content += text;
        Cursor = Content.Length;
    }

    public EditorMemento Save() => new(Content, Cursor);

    public void Restore(EditorMemento m) {
        Content = m.Content;
        Cursor = m.Cursor;
    }
}

// Caretaker
public class History {
    private readonly Stack<EditorMemento> _stack = new();
    public void Push(EditorMemento m) => _stack.Push(m);
    public EditorMemento Pop() => _stack.Pop();
}

// Uso
var editor = new Editor();
var history = new History();

editor.Type("Hola");
history.Push(editor.Save());
editor.Type(" mundo");
editor.Restore(history.Pop()); // Content = "Hola"
```

## Ejemplo en TypeScript
```typescript
// Memento inmutable
class EditorMemento {
  constructor(readonly content: string, readonly cursor: number) {
    Object.freeze(this);
  }
}

// Originator
class Editor {
  private content = "";
  private cursor = 0;

  type(text: string) {
    this.content += text;
    this.cursor = this.content.length;
  }

  save(): EditorMemento { return new EditorMemento(this.content, this.cursor); }

  restore(m: EditorMemento) {
    this.content = m.content;
    this.cursor = m.cursor;
  }

  getContent() { return this.content; }
}

// Caretaker
class History {
  private stack: EditorMemento[] = [];
  push(m: EditorMemento) { this.stack.push(m); }
  pop() { return this.stack.pop(); }
}

// Uso
const editor = new Editor();
const history = new History();

editor.type("Hola");
history.push(editor.save());
editor.type(" mundo");
editor.restore(history.pop()!);
console.log(editor.getContent()); // "Hola"
```

## Ventajas
- Implementa undo/redo sin violar el encapsulamiento.

## Desventajas
- Consume mucha memoria si se guardan snapshots grandes con frecuencia (se mitiga guardando solo diferencias o limitando el historial).
