# Rendering Strategies en Next.js

Next.js ofrece varias estrategias de renderizado que permiten optimizar el rendimiento y la experiencia del usuario según las necesidades de la aplicación. Estas estrategias incluyen **Server-Side Rendering (SSR)**, **Static Site Generation (SSG)**, **Incremental Static Regeneration (ISR)**, **Streaming** y **Partial Rendering**.

## Server-Side Rendering (SSR)

En SSR, las páginas se renderizan en el servidor en cada solicitud. Esto asegura que el contenido esté siempre actualizado, pero puede aumentar el tiempo de respuesta debido al procesamiento en el servidor.

**Ventajas:**
- Contenido siempre actualizado.
- Ideal para páginas con datos dinámicos que cambian frecuentemente.

**Ejemplo:**
```tsx
export async function getServerSideProps() {
  const data = await fetchData();
  return { props: { data } };
}

export default function Page({ data }) {
  return <div>{data.title}</div>;
}
```

## Static Site Generation (SSG)

En SSG, las páginas se generan en el momento de la construcción (build time) y se sirven como HTML estático. Esto es ideal para contenido que no cambia con frecuencia.

**Ventajas:**
- Rendimiento óptimo, ya que las páginas estáticas se sirven rápidamente desde un CDN.
- Ideal para contenido que no necesita ser actualizado frecuentemente.

**Ejemplo:**
```tsx
export async function getStaticProps() {
  const data = await fetchData();
  return { props: { data } };
}

export default function Page({ data }) {
  return <div>{data.title}</div>;
}
```

## Incremental Static Regeneration (ISR)

ISR combina lo mejor de SSR y SSG. Permite regenerar páginas estáticas en el servidor después de un período de tiempo definido, manteniendo el rendimiento de SSG con la capacidad de actualizar datos dinámicamente.

**Ventajas:**
- Combina rendimiento y datos actualizados.
- Ideal para contenido que cambia ocasionalmente.

**Ejemplo:**
```tsx
export async function getStaticProps() {
  const data = await fetchData();
  return { props: { data }, revalidate: 60 };
}

export default function Page({ data }) {
  return <div>{data.title}</div>;
}
```

En este ejemplo, la página se revalidará cada 60 segundos, obteniendo nuevos datos del servidor.

## Streaming

El streaming permite enviar partes de la página al cliente a medida que están listas, en lugar de esperar a que toda la página se renderice. Esto mejora la percepción de velocidad para el usuario.

**Ventajas:**
- Mejora la experiencia del usuario al mostrar contenido más rápido.
- Ideal para páginas con contenido que tarda en cargarse completamente.

**Ejemplo:**
```tsx
export default async function Page() {
  const data = await fetchData();

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

## Partial Rendering

El renderizado parcial permite renderizar solo partes de la página en el servidor, mientras que otras partes se cargan en el cliente. Esto es útil para aplicaciones que necesitan una mezcla de contenido estático y dinámico.

**Ventajas:**
- Flexibilidad para manejar contenido estático y dinámico en la misma página.
- Reduce la carga en el servidor al renderizar solo lo necesario.

**Ejemplo:**
```tsx
"use client";

export default function Page({ serverData }) {
  const [clientData, setClientData] = useState(null);

  useEffect(() => {
    fetch('/api/client-data')
      .then(res => res.json())
      .then(data => setClientData(data));
  }, []);

  return (
    <div>
      <h1>{serverData.title}</h1>
      {clientData ? <p>{clientData.description}</p> : <p>Cargando...</p>}
    </div>
  );
}
```

En este ejemplo, `serverData` se obtiene en el servidor, mientras que `clientData` se obtiene en el cliente después de que la página se haya cargado.
