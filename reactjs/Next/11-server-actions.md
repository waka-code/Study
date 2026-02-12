# Server Actions & Forms en Next.js

Permiten mutaciones en server, uso de `useFormStatus`, `useFormState`, Optimistic UI y cache invalidation post-mutation.

**Ejemplo:**
```tsx
// app/page.tsx
import { useFormStatus } from 'react-dom';
export default function Form() {
  const status = useFormStatus();
  return <form>{status.pending ? 'Enviando...' : 'Enviar'}</form>;
}
```
