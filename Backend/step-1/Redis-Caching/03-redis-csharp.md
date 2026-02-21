# Implementación de Redis en C#/.NET

## Introducción
Redis es una herramienta poderosa para mejorar el rendimiento de aplicaciones .NET mediante el almacenamiento en caché, la gestión de sesiones y la implementación de patrones como Pub/Sub y rate limiting.

## Instalación
Para usar Redis en .NET, instala el paquete `StackExchange.Redis`:

```bash
dotnet add package StackExchange.Redis
```

## Ejemplo Básico
```csharp
using StackExchange.Redis;

var redis = ConnectionMultiplexer.Connect("localhost");
var db = redis.GetDatabase();

// Establecer un valor
db.StringSet("clave", "valor");

// Obtener un valor
string valor = db.StringGet("clave");
Console.WriteLine("Valor: " + valor);
```

## Uso Avanzado
- **Almacenamiento de sesiones**: Usar Redis para almacenar sesiones de usuario en aplicaciones ASP.NET Core.
- **Rate Limiting**: Implementar límites de solicitudes por usuario con comandos como `StringIncrement` y `KeyExpire`.
- **Pub/Sub**: Usar Redis para implementar comunicación en tiempo real entre servicios.