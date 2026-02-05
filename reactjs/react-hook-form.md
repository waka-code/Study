# react-hook-form

Librería para manejar formularios y validaciones usando hooks.

## Instalación
```bash
npm install react-hook-form
```

## Ejemplo básico
```jsx
import { useForm } from 'react-hook-form';

function Formulario() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const onSubmit = (data) => console.log(data);
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('nombre', { required: true })} />
      {errors.nombre && <span>El nombre es obligatorio</span>}
      <button type="submit">Enviar</button>
    </form>
  );
}
```
