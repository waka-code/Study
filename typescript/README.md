# 🧠 TypeScript

## ✅ Tipos Primitivos
```tsx
let nombre: string = "Juan";
let edad: number = 30;
let activo: boolean = true;
let cualquier: any = "texto o número";
```

## ✅ Arrays y Tuplas
```tsx
let numeros: number[] = [1, 2, 3];
let tupla: [string, number] = ["id", 123];
```

## ✅ Enums
```tsx
enum Rol { Admin, Usuario, Invitado }
let rol: Rol = Rol.Admin;
```

## ✅ Type Aliases y Literales
```tsx
type ID = string | number;
type Estado = "activo" | "inactivo";
```

## ✅ Interfaces
```tsx
interface Usuario {
  id: number;
  nombre: string;
  activo?: boolean; // Opcional
}
```

## ✅ Type vs Interface
- `interface` puede extender y combinarse.
- `type` puede ser union/intersection.

## ✅ Uniones y Intersecciones
```tsx
type Admin = { permisos: string[] };
type Empleado = { nombre: string };
type AdminEmpleado = Admin & Empleado;
```

## ✅ Funciones Tipadas
```tsx
function saludar(nombre: string): string {
  return `Hola, ${nombre}`;
}
```

## ✅ Funciones Flecha
```tsx
const sumar = (a: number, b: number): number => a + b;
```

## ✅ Generics (Genéricos)
```tsx
function identidad<T>(valor: T): T {
  return valor;
}
```

## ✅ Type Assertions
```tsx
const valor = document.getElementById("input") as HTMLInputElement;
```

## ✅ Unknown vs Any
- `any`: desactiva el chequeo de tipos.
- `unknown`: tipo seguro, requiere verificacion.

## ✅ Nullable Types
```tsx
function imprimir(valor: string | null) {
  if (valor) console.log(valor);
}
```

## ✅ Utility Types
```tsx
type ParcialUsuario = Partial<Usuario>;
type SoloLectura = Readonly<Usuario>;
```

## ✅ Record, Pick, Omit
```tsx
type Roles = "admin" | "user";
const permisos: Record<Roles, boolean> = {
  admin: true,
  user: false,
};
```
