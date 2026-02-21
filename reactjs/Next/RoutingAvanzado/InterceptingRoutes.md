# Interceptación de Rutas

La interceptación de rutas en Next.js te permite sobrescribir el comportamiento predeterminado de las rutas y renderizar una página o componente diferente para una ruta específica. Esto es útil para crear flujos de navegación personalizados o manejar casos especiales.

Para interceptar una ruta, puedes usar la funcionalidad de `middleware` en Next.js. El middleware se ejecuta antes de que la solicitud se complete y puede modificar la respuesta.

Ejemplo:

```javascript
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.clone();

  if (url.pathname === '/old-route') {
    url.pathname = '/new-route';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
```

En este ejemplo, las solicitudes a `/old-route` serán interceptadas y redirigidas a `/new-route`.