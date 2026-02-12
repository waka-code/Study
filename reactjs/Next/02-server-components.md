# Server Components en Next.js

Por defecto, los componentes en Next.js son Server Components. No usan hooks de cliente ni acceden a `window`. Reducen el JS enviado al cliente y permiten composición Server → Client.

**Ejemplo:**
```tsx
// app/page.tsx
export default async function Home() {
  const data = await fetch('https://api.example.com').then(r => r.json());
  return <div>{data.title}</div>;
}
```

**Nota:** Usa Client Components solo cuando necesitas interactividad.
