# Enums

```tsx
enum Rol { Admin, Usuario, Invitado }
let rol: Rol = Rol.Admin;
```

## Enum numérico (por defecto)
```tsx
enum Direccion { Norte, Sur, Este, Oeste }
const d: Direccion = Direccion.Norte; // 0
```

## Enum con valores personalizados
```tsx
enum Estado {
  Activo = 1,
  Inactivo = 0,
  Pendiente = -1
}
const e: Estado = Estado.Pendiente; // -1
```

## Enum de strings
```tsx
enum Color {
  Rojo = "red",
  Verde = "green",
  Azul = "blue"
}
const c: Color = Color.Verde; // "green"
```

## Iterar sobre un enum
```tsx
enum Dia { Lunes, Martes, Miercoles }
const dias = Object.keys(Dia).filter(k => isNaN(Number(k)));
// ['Lunes', 'Martes', 'Miercoles']
```

## Usar enum en funciones
```tsx
enum Prioridad { Baja, Media, Alta }
function setPrioridad(p: Prioridad) {
  if (p === Prioridad.Alta) {
    console.log("¡Prioridad alta!");
  }
}
setPrioridad(Prioridad.Alta);
```
