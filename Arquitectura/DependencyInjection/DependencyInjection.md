# Dependency Injection

Dependency Injection (DI) es un patrón que permite desacoplar la creación de dependencias de la lógica de negocio, facilitando el testing y la mantenibilidad.

## Ventajas
- Facilita el testing (mocking de dependencias)
- Reduce el acoplamiento
- Mejora la mantenibilidad

## Ejemplo en TypeScript
```typescript
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(message);
  }
}

class UserService {
  constructor(private logger: Logger) {}
  createUser(name: string) {
    this.logger.log(`Usuario creado: ${name}`);
  }
}

const logger = new ConsoleLogger();
const userService = new UserService(logger);
userService.createUser('Juan');
```

## Ejemplo en C#
```csharp
public interface ILogger {
    void Log(string message);
}

public class ConsoleLogger : ILogger {
    public void Log(string message) => Console.WriteLine(message);
}

public class UserService {
    private readonly ILogger _logger;
    public UserService(ILogger logger) {
        _logger = logger;
    }
    public void CreateUser(string name) {
        _logger.Log($"Usuario creado: {name}");
    }
}

var logger = new ConsoleLogger();
var userService = new UserService(logger);
userService.CreateUser("Juan");
```
