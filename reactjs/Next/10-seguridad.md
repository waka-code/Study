# Seguridad en Next.js

Incluye cookies server-side, headers de seguridad, CSRF en Server Actions, secrets en server y middleware security.

**Ejemplo:**
```js
// app/api/secure/route.js
export async function POST(request) {
  const csrf = request.headers.get('x-csrf-token');
  // Validar CSRF
}
```
