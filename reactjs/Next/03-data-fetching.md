# Data Fetching server-first en Next.js

Next.js introduce un enfoque "server-first" para la obtención de datos, lo que significa que las solicitudes de datos se realizan principalmente en el servidor. Esto permite aprovechar las capacidades del servidor para manejar la lógica de datos y reducir la carga en el cliente.

## Extensión de `fetch()`

Next.js extiende la función nativa `fetch()` de JavaScript para incluir características específicas que mejoran el rendimiento y la flexibilidad del data fetching. Algunas de estas características incluyen:

- **Cache por defecto:** Las solicitudes realizadas con `fetch()` en Next.js están en caché automáticamente para mejorar el rendimiento.
- **Control de caché:** Puedes personalizar el comportamiento de la caché utilizando opciones como `cache: 'no-store'` para deshabilitar la caché o `revalidate` para establecer un tiempo de revalidación.
- **Helpers adicionales:** Métodos como `headers()` y `cookies()` permiten acceder fácilmente a los encabezados y cookies de la solicitud.

## Ejemplo básico de Data Fetching

En este ejemplo, se realiza una solicitud a una API con la opción `cache: 'no-store'` para asegurarse de que los datos no se almacenen en caché y siempre se obtengan datos frescos:

```tsx
export default async function Page() {
  const res = await fetch('https://api.example.com', { cache: 'no-store' });
  const data = await res.json();

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

## Opciones avanzadas de `fetch()`

1. **`cache: 'no-store'`:**
   - Desactiva la caché para obtener siempre datos actualizados.
   - Útil para datos que cambian con frecuencia.

2. **`revalidate`:**
   - Permite definir un tiempo en segundos para revalidar los datos en el servidor.
   - Ejemplo:
     ```tsx
     const res = await fetch('https://api.example.com', { next: { revalidate: 60 } });
     ```
     En este caso, los datos se revalidarán cada 60 segundos.

3. **`revalidateTag`:**
   - Permite invalidar la caché de manera programática cuando se actualizan ciertos datos.
   - Útil para aplicaciones que necesitan actualizaciones en tiempo real.

## Helpers útiles

- **`headers()`:** Accede a los encabezados de la solicitud.
- **`cookies()`:** Obtén las cookies de la solicitud.

**Ejemplo:**
```tsx
import { headers, cookies } from 'next/headers';

export default async function Page() {
  const userAgent = headers().get('user-agent');
  const sessionCookie = cookies().get('session');

  return (
    <div>
      <p>User Agent: {userAgent}</p>
      <p>Session: {sessionCookie?.value}</p>
    </div>
  );
}
```

## Buenas prácticas

- Usa `cache: 'no-store'` solo cuando sea absolutamente necesario, ya que deshabilitar la caché puede afectar el rendimiento.
- Aprovecha `revalidate` para datos que cambian con menos frecuencia y no necesitan ser actualizados en tiempo real.
- Utiliza los helpers `headers()` y `cookies()` para manejar datos específicos de la solicitud de manera eficiente.
