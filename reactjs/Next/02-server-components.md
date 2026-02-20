# Server Components en Next.js

Por defecto, los componentes en Next.js son **Server Components**. Estos componentes se renderizan en el servidor y no tienen acceso a APIs del navegador como `window` o `document`. Esto permite reducir la cantidad de JavaScript enviado al cliente, mejorando el rendimiento y la experiencia del usuario.

## ¿Qué son los Server Components?

SSR – Server Side Rendering

Los Server Components son una característica de React que permite renderizar componentes en el servidor. En Next.js, estos son el tipo de componente predeterminado. Se utilizan principalmente para tareas que no requieren interactividad en el cliente, como la obtención de datos o la generación de contenido estático.

**Ventajas:**
- **Menor carga de JavaScript en el cliente:** Solo se envía el HTML renderizado al navegador, lo que mejora los tiempos de carga.
- **Mejor rendimiento:** Al realizar la mayor parte del trabajo en el servidor, se reduce la carga en el dispositivo del usuario.
- **Composición eficiente:** Los Server Components pueden renderizar otros componentes, incluidos los Client Components, lo que permite una arquitectura híbrida.

## ¿Cuándo usar Server Components?

- Cuando necesitas renderizar contenido estático o dinámico en el servidor.
- Para páginas que no requieren interactividad en el cliente.
- Cuando deseas optimizar el rendimiento de la aplicación reduciendo el tamaño del paquete de JavaScript enviado al cliente.

## Ejemplo básico de Server Component

En este ejemplo, el componente `Home` es un Server Component que obtiene datos de una API y los renderiza en el servidor:

```tsx
// app/page.tsx
export default async function Home() {
  const data = await fetch('https://api.example.com').then(r => r.json());

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

En este caso:
- La función `fetch` se ejecuta en el servidor para obtener datos de una API.
- El contenido se renderiza en el servidor y se envía al cliente como HTML.

## ¿Cuándo usar Client Components?

Aunque los Server Components son el predeterminado en Next.js, hay casos en los que necesitas usar **Client Components**:
- Cuando necesitas manejar eventos del usuario, como clics o entradas de texto.
- Si necesitas usar hooks de React como `useState` o `useEffect`.
- Para componentes que dependen de APIs del navegador, como `localStorage` o `window`.

### Ventajas de los Client Components
- Permiten manejar interactividad y eventos del usuario directamente en el navegador.
- Acceso a APIs del navegador como `window`, `document`, `localStorage`, etc.
- Uso de hooks de React (`useState`, `useEffect`, etc.) para gestionar estado y efectos secundarios.
- Ideal para componentes que requieren una experiencia dinámica y reactiva.

### Desventajas de los Client Components
- Mayor cantidad de JavaScript enviado al cliente, lo que puede afectar el rendimiento y los tiempos de carga.
- Menor aprovechamiento de la renderización en el servidor, perdiendo algunos beneficios de SEO y performance.
- La lógica y el estado se gestionan en el cliente, lo que puede complicar la sincronización con el servidor en aplicaciones complejas.

Para definir un Client Component, simplemente agrega la directiva `"use client"` al inicio del archivo:

```tsx
"use client";

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Contador: {count}</p>
      <button onClick={() => setCount(count + 1)}>Incrementar</button>
    </div>
  );
}
```

En este ejemplo, el componente `Counter` es un Client Component porque utiliza el hook `useState` para manejar el estado del contador.
