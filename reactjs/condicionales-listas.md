# Condicionales y Listas

## Condicionales
- if/else fuera del JSX
- Operador ternario y && dentro del JSX
- Retornar null para no renderizar

## Listas
- Usar `.map()` para renderizar arrays
- Siempre usar una key única

```jsx
function ListaUsuarios({ usuarios }) {
  return (
    <ul>
      {usuarios.map(usuario => (
        <li key={usuario.id}>{usuario.nombre}</li>
      ))}
    </ul>
  );
}
```
