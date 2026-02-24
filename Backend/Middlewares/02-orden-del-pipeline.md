# Orden del pipeline

El pipeline define el orden en que se ejecutan los middlewares. El primero registrado es el primero en ejecutarse. El flujo puede ser interrumpido si un middleware no llama a `next()` (Express) o `_next(context)` (ASP.NET Core).

**Visualización:**
```
[Request] → [Middleware 1] → [Middleware 2] → ... → [Controller] → [Middleware N] → [Response]
```
