# Proxy Pattern

## ¿Cuándo usarlo?
Cuando quieres poner un **intermediario** delante de un objeto que tenga la misma interfaz, para controlar el acceso a él. Casos típicos:
- **Proxy virtual (lazy loading):** crear el objeto pesado solo cuando se usa.
- **Proxy de protección:** verificar permisos antes de delegar.
- **Proxy de caché:** guardar resultados de llamadas costosas.
- **Proxy remoto:** representar un objeto que vive en otro servidor (clientes gRPC/HTTP).
- **Logging / métricas:** registrar cada llamada.

## Explicación simple (analogía de la tarjeta de crédito)
Una tarjeta de crédito es un proxy de tu cuenta bancaria: se usa igual que el dinero (misma "interfaz": pagar), pero por detrás valida saldo, registra la transacción y te evita cargar efectivo.

## Ejemplo en .NET (C#)
```csharp
public interface IVideoService {
    string GetVideo(string id);
}

// Servicio real (costoso)
public class YouTubeService : IVideoService {
    public string GetVideo(string id) {
        Console.WriteLine($"Descargando {id} desde la red...");
        return $"video-{id}";
    }
}

// Proxy de caché
public class CachedVideoService : IVideoService {
    private readonly IVideoService _service;
    private readonly Dictionary<string, string> _cache = new();

    public CachedVideoService(IVideoService service) { _service = service; }

    public string GetVideo(string id) {
        if (!_cache.ContainsKey(id))
            _cache[id] = _service.GetVideo(id);
        return _cache[id];
    }
}
```

## Ejemplo en TypeScript
```typescript
interface VideoService {
  getVideo(id: string): string;
}

// Servicio real (costoso)
class YouTubeService implements VideoService {
  getVideo(id: string) {
    console.log(`Descargando ${id} desde la red...`);
    return `video-${id}`;
  }
}

// Proxy de caché
class CachedVideoService implements VideoService {
  private cache = new Map<string, string>();
  constructor(private service: VideoService) {}

  getVideo(id: string) {
    if (!this.cache.has(id)) this.cache.set(id, this.service.getVideo(id));
    return this.cache.get(id)!;
  }
}

// Uso
const service: VideoService = new CachedVideoService(new YouTubeService());
service.getVideo("abc"); // descarga
service.getVideo("abc"); // desde caché

// JavaScript trae un Proxy nativo
const target = { name: "Ana" };
const logged = new Proxy(target, {
  get(obj, prop) {
    console.log(`Leyendo ${String(prop)}`);
    return Reflect.get(obj, prop);
  },
});
logged.name;
```

## Proxy vs Decorator vs Facade
- **Proxy:** misma interfaz, **controla el acceso** al objeto (y a menudo gestiona su ciclo de vida).
- **Decorator:** misma interfaz, **agrega comportamiento**; se pueden apilar varios.
- **Facade:** **nueva interfaz simplificada** sobre varios objetos.
