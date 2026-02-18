# Asincronía

La asincronía permite ejecutar tareas sin bloquear el hilo principal, mejorando la eficiencia y la experiencia del usuario. Es fundamental en aplicaciones web, móviles y backend para manejar operaciones como I/O, peticiones HTTP, o acceso a bases de datos.

## Ejemplo en JavaScript
```js
console.log('Inicio');
setTimeout(() => {
  console.log('Tarea asíncrona');
}, 1000);
console.log('Fin');
// Salida: Inicio, Fin, Tarea asíncrona
```

## Ejemplo en C#
```csharp
Console.WriteLine("Inicio");
await Task.Delay(1000);
Console.WriteLine("Tarea asíncrona");
Console.WriteLine("Fin");
```

## Ventajas
- No bloquea el hilo principal
- Mejor uso de recursos
- Escalabilidad

## Cuándo usarla
- Operaciones de red
- Acceso a archivos o bases de datos
- Procesos largos o costosos
