# Lazy Loading

Carga componentes solo cuando se necesitan usando React.lazy y Suspense.

```jsx
import React, { Suspense } from "react";
const MiComponentePesado = React.lazy(() => import("./MiComponentePesado"));

function App() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <MiComponentePesado />
    </Suspense>
  );
}
```
