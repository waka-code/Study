# Eventos y Formularios

React usa SyntheticEvent para manejar eventos de forma compatible y eficiente.

```jsx
function Boton() {
  function handleClick() {
    alert('Click!');
  }
  return <button onClick={handleClick}>Haz clic</button>;
}
```

## Formularios controlados

```jsx
function Formulario() {
  const [nombre, setNombre] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Hola, ${nombre}`);
  };
  return (
    <form onSubmit={handleSubmit}>
      <input value={nombre} onChange={e => setNombre(e.target.value)} />
      <button type="submit">Enviar</button>
    </form>
  );
}
```
