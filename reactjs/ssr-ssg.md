# SSR y SSG en React

## Next.js y Gatsby
Diferencias entre Server-Side Rendering y Static Site Generation.

### Server-Side Rendering (SSR)
- **Definición**: En SSR, las páginas se renderizan en el servidor en cada solicitud. Esto significa que el HTML completo se genera dinámicamente en el servidor y se envía al cliente.
- **Ventajas**:
  - Mejora el SEO al entregar contenido completamente renderizado a los motores de búsqueda.
  - Ideal para aplicaciones con contenido que cambia frecuentemente.
  - Permite personalización basada en la solicitud del usuario (por ejemplo, datos específicos del usuario).
- **Desventajas**:
  - Mayor tiempo de respuesta inicial debido al renderizado en el servidor.
  - Mayor carga en el servidor, ya que cada solicitud requiere procesamiento.

### Static Site Generation (SSG)
- **Definición**: En SSG, las páginas se generan en el momento de la construcción (build time) y se sirven como archivos HTML estáticos. Esto significa que el contenido no cambia hasta la próxima vez que se reconstruya el sitio.
- **Ventajas**:
  - Rendimiento extremadamente rápido, ya que las páginas estáticas se sirven directamente desde un CDN.
  - Ideal para contenido que no cambia frecuentemente.
  - Menor carga en el servidor, ya que no se necesita renderizado dinámico.
- **Desventajas**:
  - No es adecuado para contenido que cambia frecuentemente o que necesita personalización en tiempo real.
  - Requiere reconstruir el sitio para reflejar cambios en el contenido.

---

## Casos de uso
- **SEO**:
  - **SSR**: Ideal para páginas que necesitan ser indexadas rápidamente por motores de búsqueda, como páginas de productos o blogs con contenido dinámico.
  - **SSG**: Perfecto para sitios con contenido estático, como documentación o portafolios.

- **Performance**:
  - **SSR**: Útil para aplicaciones que necesitan mostrar contenido actualizado en cada solicitud.
  - **SSG**: Ofrece tiempos de carga más rápidos gracias a la entrega de contenido estático desde un CDN.

- **Aplicaciones híbridas**:
  - Frameworks como Next.js permiten combinar SSR y SSG en una misma aplicación. Por ejemplo, puedes usar SSG para páginas estáticas y SSR para páginas dinámicas.

---

## Ejemplo Next.js SSR
```js
export async function getServerSideProps(context) {
  const res = await fetch(`https://api.example.com/data`);
  const data = await res.json();

  return {
    props: {
      data,
    },
  };
}

export default function Page({ data }) {
  return (
    <div>
      <h1>Datos desde el servidor</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

---

## Ejemplo Next.js SSG
```js
export async function getStaticProps() {
  const res = await fetch(`https://api.example.com/data`);
  const data = await res.json();

  return {
    props: {
      data,
    },
    revalidate: 10, // Revalida cada 10 segundos
  };
}

export default function Page({ data }) {
  return (
    <div>
      <h1>Datos generados estáticamente</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

---

Estos conceptos son fundamentales para entender cómo optimizar aplicaciones React para diferentes casos de uso, como SEO, rendimiento y escalabilidad. ¡Explóralos y ponlos en práctica! 🚀
