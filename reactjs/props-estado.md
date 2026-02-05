# Props y Estado (`useState`)

## Props
- Valores que se pasan de padre a hijo.
- Inmutables dentro del componente.

## Estado
- Datos internos y mutables.
- Cambios de estado causan re-render.

```jsx
function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicks: {count}
    </button>
  );
}
```
