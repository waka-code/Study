# Integración en React

## React con TypeScript
Ventajas, tipos, props tipadas.

## Redux Toolkit, Zustand, SWR/React Query
Gestión de estado y datos remotos.

## Ejemplo básico SWR
```js
import useSWR from 'swr';
const { data, error } = useSWR('/api/user', fetch);
```
