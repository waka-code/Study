# Seguridad en Next.js

La seguridad es un aspecto fundamental en cualquier aplicación web, y Next.js proporciona varias herramientas y prácticas recomendadas para proteger tus aplicaciones. Estas incluyen el manejo seguro de cookies, configuración de headers de seguridad, protección contra ataques CSRF, manejo de secretos y el uso de middlewares para reforzar la seguridad.

## Cookies server-side

En Next.js, las cookies se pueden manejar de manera segura en el servidor, lo que ayuda a proteger información sensible y evitar que sea accesible desde el cliente. Esto es especialmente útil para almacenar tokens de autenticación o datos de sesión.

**Ejemplo:**
```js
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return new Response('No autorizado', { status: 401 });
  }

  return new Response('Autorizado', { status: 200 });
}
```

## Headers de seguridad

Next.js permite configurar headers de seguridad para proteger tu aplicación contra ataques comunes como XSS, clickjacking y sniffing de contenido. Esto se puede hacer en el archivo `next.config.js`.

**Ejemplo:**
```js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self';" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};
```

## Protección contra CSRF en Server Actions

El ataque de falsificación de solicitudes entre sitios (CSRF) puede prevenirse validando tokens CSRF en las solicitudes entrantes. Next.js permite manejar esto fácilmente en las Server Actions.

**Ejemplo:**
```js
// app/api/secure/route.js
export async function POST(request) {
  const csrf = request.headers.get('x-csrf-token');

  if (!csrf || csrf !== process.env.CSRF_SECRET) {
    return new Response('CSRF token inválido', { status: 403 });
  }

  return new Response('Solicitud válida', { status: 200 });
}
```

## Manejo de secretos en el servidor

Next.js permite almacenar secretos de manera segura utilizando variables de entorno. Estas variables no se exponen al cliente y solo están disponibles en el servidor.

**Ejemplo:**
```js
// .env.local
API_SECRET=mysecretkey
```

```js
// app/api/secure/route.js
export async function POST(request) {
  const apiSecret = process.env.API_SECRET;

  if (!apiSecret) {
    return new Response('Falta la clave secreta', { status: 500 });
  }

  return new Response(`Clave secreta: ${apiSecret}`, { status: 200 });
}
```

## Middleware de seguridad

Los middlewares en Next.js permiten interceptar solicitudes y aplicar lógica personalizada antes de que lleguen a las rutas de la aplicación. Esto es útil para implementar medidas de seguridad adicionales, como la autenticación o la validación de permisos.

**Ejemplo:**
```js
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('auth-token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/secure/:path*'],
};
```

En este ejemplo, el middleware verifica si existe un token de autenticación en las cookies. Si no está presente, redirige al usuario a la página de inicio de sesión.

## Buenas prácticas de seguridad en Next.js

1. **Usa HTTPS:** Asegúrate de que tu aplicación esté configurada para usar HTTPS en producción.
2. **Configura headers de seguridad:** Implementa políticas como Content Security Policy (CSP) y X-Frame-Options.
3. **Valida entradas del usuario:** Siempre valida y sanitiza los datos que recibes del cliente.
4. **Protege las cookies:** Usa la opción `httpOnly` y `secure` para evitar accesos no autorizados.
5. **Monitorea y registra:** Implementa herramientas de monitoreo para detectar actividades sospechosas.

Con estas prácticas y herramientas, puedes construir aplicaciones Next.js seguras y resistentes a ataques comunes.
