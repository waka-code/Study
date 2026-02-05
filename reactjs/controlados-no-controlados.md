# Controlados vs No Controlados

## Controlados
React mantiene el estado del input.

```jsx
const ControlledInput = () => {
  const [value, setValue] = useState("");
  return <input value={value} onChange={e => setValue(e.target.value)} />;
};
```

## No Controlados
El DOM maneja el valor, accedes con ref.

```jsx
const UncontrolledInput = () => {
  const inputRef = useRef(null);
  const handleSubmit = () => alert(inputRef.current.value);
  return <><input ref={inputRef} /><button onClick={handleSubmit}>Enviar</button></>;
};
```
