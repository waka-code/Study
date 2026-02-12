# Middleware & Edge Runtime en Next.js

Middleware permite ejecutar lógica antes de servir una ruta. Edge Runtime ejecuta código en la red de Vercel, cerca del usuario.

**Ejemplo Middleware:**
```js
// middleware.ts
import { NextResponse } from 'next/server';
export function middleware(request) {
  if (!request.cookies.get('token')) {
    return NextResponse.redirect('/login');
  }
}
```

**Nota:** Edge runtime tiene limitaciones (no Node APIs).
