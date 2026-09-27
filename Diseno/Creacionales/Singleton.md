# Singleton Pattern (⚠️ Usar con cuidado)

## ¿Cuándo usarlo?
Cuando necesitas garantizar que una clase tenga una única instancia global y un punto de acceso global a ella. Úsalo con precaución, ya que puede dificultar pruebas y acoplar el código.

# video
# https://www.youtube.com/watch?v=tSZn4wkBIu8
# https://www.youtube.com/watch?v=412kLiN9PQU

## Ejemplo en .NET (C#)
```csharp
public class Singleton {
    private static Singleton _instance;
    private static readonly object _lock = new object();
    private Singleton() {}
    public static Singleton Instance {
        get {
            lock(_lock) {
                if (_instance == null)
                    _instance = new Singleton();
                return _instance;
            }
        }
    }
}
```

## Ejemplo en TypeScript
```typescript
class Singleton {
  private static instance: Singleton;
  private constructor() {}
  static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
}
```
