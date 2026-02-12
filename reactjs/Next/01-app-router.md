# App Router en Next.js

Next.js usa routing basado en archivos dentro de la carpeta `app/`. Los archivos `page.tsx` definen rutas, `layout.tsx` layouts persistentes, y puedes usar route groups `(group)`, segmentos dinámicos `[id]`, catch-all `[...slug]`, y archivos especiales como `loading.tsx`, `error.tsx`, `not-found.tsx`.

**Ejemplo:**
```
app/
  dashboard/
    page.tsx
    layout.tsx
    loading.tsx
    error.tsx
    [id]/page.tsx
    (admin)/page.tsx
```

**Código:**
```tsx
// app/dashboard/page.tsx
export default function Dashboard() {
  return <div>Dashboard</div>;
}
```
