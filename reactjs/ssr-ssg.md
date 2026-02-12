# SSR y SSG en React

## Next.js y Gatsby
Diferencias entre Server-Side Rendering y Static Site Generation.

## Casos de uso
SEO, performance, aplicaciones híbridas.

## Ejemplo Next.js SSR
```js
export async function getServerSideProps() {
  return { props: { data: await fetchData() } };
}
```
