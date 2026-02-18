# Controlados vs No Controlados en React

En React, los inputs pueden ser **controlados** o **no controlados**. La diferencia radica en quién gestiona el valor del input: React (estado) o el propio DOM.

## Inputs Controlados

Un input controlado es aquel cuyo valor es gestionado por el estado de React. Esto significa que el valor del input siempre está sincronizado con el estado del componente. Cada vez que el usuario escribe, se dispara el evento `onChange`, que actualiza el estado, y ese estado es el que determina el valor del input.

**Ventajas:**
- El valor del input siempre está en el estado de React, lo que facilita validaciones, formateos y lógica condicional.
- Permite tener un solo punto de verdad para los datos del formulario.
- Facilita el reseteo de formularios y la manipulación de los valores desde el código.

**Ejemplo:**
```jsx
const ControlledInput = () => {
  const [value, setValue] = useState("");
  return <input value={value} onChange={e => setValue(e.target.value)} />;
};
```

## Inputs No Controlados

Un input no controlado es aquel cuyo valor es gestionado directamente por el DOM, no por el estado de React. Para acceder a su valor, se utiliza una referencia (`ref`). React no está al tanto de los cambios hasta que se accede al valor mediante la ref.

**Ventajas:**
- Menos renders, ya que el estado de React no cambia con cada pulsación.
- Útil para integraciones rápidas o formularios muy grandes donde el rendimiento es crítico.
- Útil cuando necesitas interactuar con librerías externas que manipulan el DOM directamente.

**Ejemplo:**
```jsx
const UncontrolledInput = () => {
  const inputRef = useRef(null);
  const handleSubmit = () => alert(inputRef.current.value);
  return (
    <>
      <input ref={inputRef} />
      <button onClick={handleSubmit}>Enviar</button>
    </>
  );
};
```

## ¿Cuándo usar cada uno?

- Usa **controlados** cuando necesitas validar, formatear o manipular el valor del input en tiempo real, o cuando el valor del input debe estar sincronizado con el estado de la aplicación.
- Usa **no controlados** cuando solo necesitas el valor del input en momentos puntuales (por ejemplo, al enviar un formulario) o cuando buscas optimizar el rendimiento en formularios muy grandes.
