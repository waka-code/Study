# API Routes / Route Handlers en Next.js

En Next.js, los endpoints se definen en `app/api/*` usando HTTP verbs, validación y auth.

**Ejemplo:**
```js
// app/api/user/route.js
export async function GET(request) {
  return Response.json({ name: 'John' });
}
```

**Nota:** Next puede ser BFF, pero no siempre debe ser el backend principal.
