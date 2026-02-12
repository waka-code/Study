# Data Fetching server-first en Next.js

Next.js extiende `fetch()` para server-first data fetching. Cache por defecto, opciones como `cache: 'no-store'`, `revalidate`, `revalidateTag`, y helpers como `headers()`, `cookies()`.

**Ejemplo:**
```tsx
export default async function Page() {
  const res = await fetch('https://api.example.com', { cache: 'no-store' });
  const data = await res.json();
  return <div>{data.title}</div>;
}
```
