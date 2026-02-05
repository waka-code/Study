# Record, Pick, Omit

## Record
```tsx
type Roles = "admin" | "user";
const permisos: Record<Roles, boolean> = {
  admin: true,
  user: false,
};
```

## Pick
```tsx
interface Usuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
}
// Solo selecciona 'id' y 'nombre'
type UsuarioBasico = Pick<Usuario, "id" | "nombre">;
const usuario: UsuarioBasico = { id: 1, nombre: "Ana" };
```

## Omit
```tsx
interface Usuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
}
// Omite 'email' y 'activo'
type UsuarioSinPrivado = Omit<Usuario, "email" | "activo">;
const usuario: UsuarioSinPrivado = { id: 2, nombre: "Luis" };
```
