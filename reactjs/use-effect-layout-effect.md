# useEffect y useLayoutEffect

## useEffect
Se ejecuta después del renderizado. Ideal para efectos secundarios.

```jsx
useEffect(() => {
  console.log('Se ejecuta al montar y cuando cambia count');
}, [count]);
```

## useLayoutEffect
Se ejecuta antes del "paint" del DOM. Útil para leer/medir/modificar el layout.

```jsx
useLayoutEffect(() => {
  // Se ejecuta ANTES del paint
}, []);
```
