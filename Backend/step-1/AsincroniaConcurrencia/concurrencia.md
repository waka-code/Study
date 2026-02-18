# Concurrencia

La concurrencia es la capacidad de un sistema para ejecutar varias tareas al mismo tiempo (o de forma intercalada), aprovechando múltiples hilos, procesos o núcleos. Es clave para sistemas de alto rendimiento y aplicaciones que manejan muchas operaciones simultáneas.

## Ejemplo en JavaScript (simulada)
```js
async function tarea1() { await new Promise(r => setTimeout(r, 1000)); console.log('Tarea 1'); }
async function tarea2() { await new Promise(r => setTimeout(r, 500)); console.log('Tarea 2'); }
tarea1();
tarea2();
// Ambas tareas avanzan "en paralelo" (event loop)
```

## Ejemplo en C#
```csharp
Task t1 = Task.Run(() => { /* ... */ });
Task t2 = Task.Run(() => { /* ... */ });
await Task.WhenAll(t1, t2);
```

## Ventajas
- Mejor uso de CPU
- Permite manejar múltiples tareas simultáneas
- Escalabilidad en sistemas multiusuario

## Cuándo usarla
- Procesamiento paralelo
- Servidores web
- Algoritmos intensivos en CPU
