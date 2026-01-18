# Performance Web (Frontend)

## SSR vs CSR
- **SSR (Server-Side Rendering):** El HTML se genera en el servidor y se envía listo al navegador. Mejora el SEO y el tiempo de primera carga.
- **CSR (Client-Side Rendering):** El HTML se genera en el navegador usando JavaScript. Permite apps más interactivas, pero la primera carga puede ser más lenta.

### Ejemplo SSR (Next.js)
```js
// pages/index.js
export async function getServerSideProps() {
  return { props: { data: 'Hola SSR' } };
}
export default function Home({ data }) {
  return <div>{data}</div>;
}
```

### Ejemplo CSR (React)
```js
// App.js
import { useEffect, useState } from 'react';
export default function App() {
  const [data, setData] = useState('');
  useEffect(() => {
    fetch('/api/data').then(r => r.text()).then(setData);
  }, []);
  return <div>{data}</div>;
}
```

---

## Lazy loading
- Cargar recursos (imágenes, componentes, módulos) solo cuando se necesitan.

### Ejemplo (React)
```js
import React, { Suspense, lazy } from 'react';
const LazyComponent = lazy(() => import('./LazyComponent'));
function App() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

---

## Memoization
- Guardar el resultado de funciones costosas para no recalcular si los datos no cambian.

### Ejemplo (React)
```js
import { useMemo } from 'react';
function App({ items }) {
  const expensiveResult = useMemo(() => items.sort(), [items]);
  return <div>{expensiveResult.join(', ')}</div>;
}
```

---

## Web Vitals
- Métricas clave de experiencia de usuario: LCP, FID, CLS, TTFB, INP.
- Mejorar estas métricas optimizando imágenes, minimizando JS, usando CDN, etc.

### Ejemplo de medición
```js
import { getCLS, getFID, getLCP } from 'web-vitals';
getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```
