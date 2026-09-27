# Template Method Pattern

## ¿Cuándo usarlo?
Cuando varios algoritmos comparten la **misma estructura de pasos** y solo difieren en algunos de ellos. La clase base define el esqueleto (el "template method") y las subclases sobrescriben solo los pasos que cambian.

Ejemplos: importadores de archivos (abrir → parsear → validar → guardar), pipelines de ETL, hooks de ciclo de vida en frameworks (`OnInit`, `OnDestroy`), clases base de tests (`setUp`/`tearDown`).

## Explicación simple (analogía de construir una casa)
Toda casa se construye igual: cimientos → paredes → techo → terminaciones. Una casa de madera y una de ladrillo cambian **cómo** se hacen las paredes, pero el **orden** de los pasos es el mismo y lo controla el plano.

## Ejemplo en .NET (C#)
```csharp
public abstract class DataImporter {
    // Template method: define el orden, no se sobrescribe
    public void Import(string path) {
        var raw = ReadFile(path);
        var rows = Parse(raw);
        Validate(rows);
        Save(rows);
    }

    protected string ReadFile(string path) => File.ReadAllText(path);
    protected abstract List<string[]> Parse(string raw);     // paso obligatorio
    protected virtual void Validate(List<string[]> rows) {}  // hook opcional
    protected void Save(List<string[]> rows) => Console.WriteLine($"Guardadas {rows.Count} filas");
}

public class CsvImporter : DataImporter {
    protected override List<string[]> Parse(string raw) =>
        raw.Split('\n').Select(l => l.Split(',')).ToList();
}

public class TsvImporter : DataImporter {
    protected override List<string[]> Parse(string raw) =>
        raw.Split('\n').Select(l => l.Split('\t')).ToList();

    protected override void Validate(List<string[]> rows) {
        if (rows.Count == 0) throw new InvalidOperationException("Archivo vacío");
    }
}
```

## Ejemplo en TypeScript
```typescript
abstract class DataImporter {
  // Template method
  import(raw: string): void {
    const rows = this.parse(raw);
    this.validate(rows);
    this.save(rows);
  }

  protected abstract parse(raw: string): string[][]; // paso obligatorio
  protected validate(_rows: string[][]): void {}     // hook opcional
  private save(rows: string[][]) { console.log(`Guardadas ${rows.length} filas`); }
}

class CsvImporter extends DataImporter {
  protected parse(raw: string) { return raw.split("\n").map(l => l.split(",")); }
}

class TsvImporter extends DataImporter {
  protected parse(raw: string) { return raw.split("\n").map(l => l.split("\t")); }
  protected validate(rows: string[][]) {
    if (rows.length === 0) throw new Error("Archivo vacío");
  }
}

// Uso
new CsvImporter().import("a,b\nc,d");
```

## Template Method vs Strategy
- **Template Method:** usa **herencia**; varía partes de un algoritmo en tiempo de compilación.
- **Strategy:** usa **composición**; reemplaza el algoritmo completo en tiempo de ejecución.
Hoy suele preferirse Strategy (composición sobre herencia), pero Template Method es muy común en frameworks.
