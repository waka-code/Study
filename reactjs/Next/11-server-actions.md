# Server Actions & Forms en Next.js

Las Server Actions en Next.js son una poderosa herramienta que permite realizar mutaciones directamente en el servidor, simplificando la lógica de las aplicaciones y mejorando el rendimiento. Estas acciones están diseñadas para trabajar de manera eficiente con formularios y flujos de datos dinámicos.

## ¿Qué son las Server Actions?

Las Server Actions permiten ejecutar lógica del lado del servidor directamente desde los componentes de React. Esto elimina la necesidad de configurar APIs REST o GraphQL para manejar mutaciones, ya que las acciones se definen y se llaman directamente desde los componentes.

**Ventajas:**
- **Simplicidad:** Menos configuración en comparación con APIs tradicionales.
- **Optimización del rendimiento:** Reduce la cantidad de JavaScript enviado al cliente.
- **Seguridad:** Las acciones se ejecutan en el servidor, lo que protege la lógica de negocio y los datos sensibles.

## Uso de `useFormStatus` y `useFormState`

### `useFormStatus`
El hook `useFormStatus` permite rastrear el estado de un formulario, como si está en proceso de envío (`pending`) o si ha ocurrido un error.

**Ejemplo:**
```tsx
import { useFormStatus } from 'react-dom';

export default function Form() {
  const status = useFormStatus();

  return (
    <form>
      <button type="submit" disabled={status.pending}>
        {status.pending ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}
```

### `useFormState`
El hook `useFormState` permite acceder al estado del formulario, como los valores actuales de los campos y los errores de validación.

**Ejemplo:**
```tsx
import { useFormState } from 'react-dom';

export default function Form() {
  const { values, errors } = useFormState();

  return (
    <form>
      <input name="email" placeholder="Correo electrónico" />
      {errors.email && <p>{errors.email}</p>}
      <button type="submit">Enviar</button>
    </form>
  );
}
```

## Optimistic UI

El patrón de **Optimistic UI** permite actualizar la interfaz de usuario inmediatamente después de una acción del usuario, antes de que el servidor confirme la mutación. Esto mejora la experiencia del usuario al hacer que la aplicación se sienta más rápida y receptiva.

**Ejemplo:**
```tsx
'use client';

import { useState } from 'react';

export default function Form() {
  const [items, setItems] = useState([]);

  async function handleSubmit(event) {
    event.preventDefault();
    const newItem = { id: Date.now(), name: 'Nuevo ítem' };

    // Actualización optimista
    setItems([...items, newItem]);

    // Confirmación del servidor
    await fetch('/api/add-item', {
      method: 'POST',
      body: JSON.stringify(newItem),
    });
  }

  return (
    <div>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <button type="submit">Agregar ítem</button>
      </form>
    </div>
  );
}
```

## Cache Invalidation Post-Mutation

Después de realizar una mutación en el servidor, es importante invalidar la caché para asegurarse de que los datos mostrados estén actualizados. Next.js proporciona herramientas para manejar esto de manera eficiente.

**Ejemplo:**
```tsx
import { revalidatePath } from 'next/cache';

export async function addItem(data) {
  // Lógica para agregar un ítem
  await database.add(data);

  // Invalidar la caché de una ruta específica
  revalidatePath('/items');
}
```

En este ejemplo, después de agregar un nuevo ítem a la base de datos, se invalida la caché de la ruta `/items` para que los datos actualizados se reflejen en la interfaz de usuario.

## Buenas prácticas

1. **Valida las entradas del usuario:** Asegúrate de validar los datos en el servidor para evitar problemas de seguridad.
2. **Usa Optimistic UI con precaución:** Asegúrate de manejar correctamente los errores en caso de que la mutación falle.
3. **Revalida la caché:** Siempre invalida la caché después de realizar mutaciones para mantener los datos actualizados.
4. **Protege las Server Actions:** Usa autenticación y validación para evitar accesos no autorizados.

Con estas herramientas y prácticas, puedes implementar formularios y mutaciones seguras y eficientes en tus aplicaciones Next.js.
