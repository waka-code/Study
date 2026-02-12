# Cache & Revalidación en Next.js

Next.js implementa Full Route Cache, Data Cache, Request Memoization, ISR, on-demand revalidation y tag-based invalidation.

**Ejemplo:**
```tsx
export async function getStaticProps() {
  return {
    props: { data: await fetchData() },
    revalidate: 60,
  };
}
```

**Nota:** Un senior debe saber cuándo el cache puede ser enemigo (datos desactualizados).
