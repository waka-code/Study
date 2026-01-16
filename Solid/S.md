# S — Single Responsibility Principle (SRP)

El Principio de Responsabilidad Única establece que una clase debe tener una sola razón para cambiar, es decir, debe estar enfocada en una única tarea o responsabilidad.

---

## Ejemplo en .NET (C#)

Supongamos que tenemos una aplicación que gestiona reportes. Un mal ejemplo sería una clase que genera y guarda reportes:

```csharp
public class Report {
    public string Title { get; set; }
    public string Content { get; set; }

    public void Generate() {
        // Lógica para generar el reporte
    }

    public void SaveToFile(string path) {
        // Lógica para guardar el reporte en un archivo
    }
}
```

**¿Qué está mal?**
- La clase `Report` tiene dos responsabilidades: generar el reporte y guardarlo en un archivo.

**Aplicando SRP:**

```csharp
public class Report {
    public string Title { get; set; }
    public string Content { get; set; }

    public void Generate() {
        // Lógica para generar el reporte
    }
}

public class ReportSaver {
    public void SaveToFile(Report report, string path) {
        // Lógica para guardar el reporte en un archivo
    }
}
```

Ahora, cada clase tiene una única responsabilidad.

---

## Ejemplo en TypeScript

Mal ejemplo:

```typescript
class Invoice {
  constructor(public amount: number) {}

  print() {
    // Lógica para imprimir la factura
  }

  saveToDatabase() {
    // Lógica para guardar en la base de datos
  }
}
```

**¿Qué está mal?**
- `Invoice` maneja tanto la lógica de impresión como la de persistencia.

**Aplicando SRP:**

```typescript
class Invoice {
  constructor(public amount: number) {}
}

class InvoicePrinter {
  print(invoice: Invoice) {
    // Lógica para imprimir la factura
  }
}

class InvoiceRepository {
  save(invoice: Invoice) {
    // Lógica para guardar en la base de datos
  }
}
```

Ahora, cada clase tiene una única responsabilidad.
