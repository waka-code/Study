# React.memo, useCallback, useMemo

## React.memo
Memoriza un componente funcional, solo se renderiza si cambian sus props.

```jsx
const MemoComponent = React.memo(({ value }) => <div>{value}</div>);
```

## useCallback
Memoriza una función, solo cambia si cambian sus dependencias.

```jsx
const handleClick = useCallback(() => {
  console.log("clic");
}, []);
```

## useMemo
Memoriza el resultado de una función costosa.

```jsx
const resultado = useMemo(() => {
  return lista.filter(item => item.activo);
}, [lista]);
```
