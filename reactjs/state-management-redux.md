# Redux y Redux Toolkit - State Management Profesional

> **Concepto clave:**
> Redux es una biblioteca de gestión de estado predecible para aplicaciones JavaScript, especialmente útil para estado complejo compartido entre muchos componentes.

---

## ¿Por qué Redux?

### Ventajas ✅

- **Estado predecible**: Single source of truth (una única fuente de verdad)
- **Debugging potente**: Redux DevTools permite time-travel debugging
- **Testeable**: Pure functions (reducers) son fáciles de testear
- **Middleware**: Redux Thunk, Redux Saga para lógica asíncrona
- **Escalable**: Funciona bien en aplicaciones grandes con estado complejo

### Desventajas ❌

- **Boilerplate**: Mucho código repetitivo (Redux Toolkit soluciona esto)
- **Curva de aprendizaje**: Conceptos como actions, reducers, middleware
- **Overkill**: Para aplicaciones pequeñas, Context API es suficiente

---

## Cuándo usar Redux vs Context API

| Criterio | Redux | Context API |
|----------|-------|-------------|
| **Tamaño de app** | Media-Grande | Pequeña-Media |
| **Complejidad estado** | Alta | Baja-Media |
| **Debugging** | Excelente (DevTools) | Limitado |
| **Performance** | Optimizado | Puede causar re-renders |
| **Async logic** | Middleware robusto | Manual |
| **Learning curve** | Alta | Baja |

**Regla práctica:**
- ✅ Usa Redux si: >10 componentes compartiendo estado, lógica async compleja, necesitas debugging avanzado
- ✅ Usa Context API si: Estado simple, pocos componentes, prototipo rápido

---

## Redux Toolkit (Recomendado en 2026)

Redux Toolkit es la **forma oficial y recomendada** de escribir lógica Redux. Simplifica el setup y reduce el boilerplate.

### Instalación

```bash
npm install @reduxjs/toolkit react-redux
```

---

## Conceptos Core de Redux

### 1. Store
El **store** es el objeto que contiene el estado global de la aplicación.

```typescript
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './features/counter/counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    // otros reducers aquí
  },
});

// Tipos para TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Slice
Un **slice** agrupa el estado, reducers y actions relacionados.

```typescript
// features/counter/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
  loading: boolean;
}

const initialState: CounterState = {
  value: 0,
  loading: false,
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      // Immer permite "mutar" el estado de forma segura
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    reset: (state) => {
      state.value = 0;
    },
  },
});

export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;
export default counterSlice.reducer;
```

### 3. Actions
Las **actions** son objetos que describen qué pasó.

```typescript
// Auto-generadas por createSlice:
increment(); // { type: 'counter/increment' }
incrementByAmount(5); // { type: 'counter/incrementByAmount', payload: 5 }
```

### 4. Reducers
Los **reducers** especifican cómo cambia el estado en respuesta a actions.

```typescript
// Ya definidos en el slice arriba
// Son pure functions: (state, action) => newState
```

### 5. Selectors
Los **selectors** extraen datos específicos del store.

```typescript
// features/counter/counterSlice.ts
export const selectCount = (state: RootState) => state.counter.value;
export const selectLoading = (state: RootState) => state.counter.loading;
```

---

## Setup en React

### Provider Setup

```typescript
// main.tsx o index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

### Hooks Tipados (TypeScript)

```typescript
// hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Usa estos hooks en lugar de los originales
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Usando Redux en Componentes

```typescript
import { useAppSelector, useAppDispatch } from '../../hooks';
import { increment, decrement, incrementByAmount, selectCount } from './counterSlice';

function Counter() {
  const count = useAppSelector(selectCount);
  const dispatch = useAppDispatch();

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => dispatch(increment())}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
      <button onClick={() => dispatch(incrementByAmount(5))}>+5</button>
    </div>
  );
}
```

---

## Async Logic con createAsyncThunk

Para operaciones asíncronas como API calls, usa `createAsyncThunk`.

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Define el thunk async
export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

interface UserState {
  entity: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  entity: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.entity = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user';
      });
  },
});

export default userSlice.reducer;
```

**Uso en componente:**

```typescript
function UserProfile({ userId }: { userId: string }) {
  const dispatch = useAppDispatch();
  const { entity: user, loading, error } = useAppSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchUserById(userId));
  }, [userId, dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return null;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

---

## RTK Query - Data Fetching Avanzado

**RTK Query** es una herramienta poderosa de Redux Toolkit para **data fetching y caching**.

### Setup

```typescript
// services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface User {
  id: string;
  name: string;
  email: string;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    addUser: builder.mutation<User, Partial<User>>({
      query: (user) => ({
        url: '/users',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, Partial<User> & { id: string }>({
      query: ({ id, ...patch }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = apiSlice;
```

**Agregar al store:**

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './services/api';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});
```

**Uso en componente:**

```typescript
function UserList() {
  const { data: users, isLoading, error } = useGetUsersQuery();
  const [addUser] = useAddUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  const handleAddUser = async () => {
    await addUser({ name: 'John Doe', email: 'john@example.com' });
  };

  return (
    <div>
      <button onClick={handleAddUser}>Add User</button>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
            <button onClick={() => deleteUser(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Ventajas de RTK Query:**
- ✅ Caching automático
- ✅ Invalidación de cache
- ✅ Polling y re-fetching
- ✅ Optimistic updates
- ✅ Loading states automáticos

---

## Middleware Personalizado (Avanzado)

```typescript
import { Middleware } from '@reduxjs/toolkit';

const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('Next state:', store.getState());
  return result;
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware),
});
```

---

## Redux vs Context API vs Zustand

| Feature | Redux Toolkit | Context API | Zustand |
|---------|---------------|-------------|---------|
| **Setup** | Medio | Simple | Simple |
| **Boilerplate** | Bajo (con RTK) | Muy bajo | Muy bajo |
| **DevTools** | ✅ Excelente | ❌ No | ✅ Sí |
| **Async** | ✅ Built-in | Manual | ✅ Simple |
| **Performance** | ✅ Optimizado | ⚠️ Re-renders | ✅ Optimizado |
| **Learning curve** | Media | Baja | Baja |
| **Ecosystem** | ✅ Enorme | N/A | Creciendo |
| **Tamaño bundle** | ~10KB | 0KB | ~1KB |

---

## Best Practices

### 1. Estructura de carpetas

```
src/
├── features/
│   ├── counter/
│   │   ├── Counter.tsx
│   │   └── counterSlice.ts
│   ├── users/
│   │   ├── UserList.tsx
│   │   └── usersSlice.ts
├── services/
│   └── api.ts (RTK Query)
├── store.ts
└── hooks.ts (typed hooks)
```

### 2. Normaliza el estado

**❌ Mal:**
```typescript
state = {
  posts: [
    { id: 1, author: { id: 10, name: 'John' }, comments: [...] }
  ]
}
```

**✅ Bien:**
```typescript
state = {
  posts: { byId: { 1: { id: 1, authorId: 10, commentIds: [...] } } },
  users: { byId: { 10: { id: 10, name: 'John' } } },
  comments: { byId: { ... } }
}
```

### 3. Usa createSelector para memoization

```typescript
import { createSelector } from '@reduxjs/toolkit';

const selectUsers = (state: RootState) => state.users;
const selectUserId = (state: RootState, userId: string) => userId;

export const selectUserById = createSelector(
  [selectUsers, selectUserId],
  (users, userId) => users.byId[userId]
);
```

### 4. Mantén reducers puros

**❌ Mal:**
```typescript
reducers: {
  addItem: (state, action) => {
    // Side effect - fetch API
    fetch('/api/items').then(...); // ❌ NO
    state.items.push(action.payload);
  }
}
```

**✅ Bien:**
```typescript
// Usa createAsyncThunk para side effects
export const addItem = createAsyncThunk(
  'items/add',
  async (item) => {
    await fetch('/api/items', { method: 'POST', body: JSON.stringify(item) });
    return item;
  }
);
```

---

## Preguntas de Entrevista

### 1. ¿Qué es Redux y cuándo lo usarías?

**Respuesta:**
Redux es una biblioteca de gestión de estado predecible basada en Flux. Lo usaría cuando:
- La aplicación tiene estado complejo compartido entre muchos componentes
- Necesito debugging avanzado (time-travel, action history)
- Hay lógica asíncrona compleja
- El equipo necesita un patrón predecible y escalable

Para aplicaciones pequeñas o estado simple, Context API es suficiente.

### 2. ¿Qué son los reducers y por qué deben ser puros?

**Respuesta:**
Los reducers son pure functions que toman el estado actual y una action, y retornan el nuevo estado: `(state, action) => newState`.

Deben ser puros porque:
- Predictibilidad: mismo input = mismo output
- Testing: fácil de testear sin side effects
- Time-travel debugging: podemos reproducir estados
- Performance: Redux puede optimizar basándose en pureza

### 3. ¿Cómo manejas async operations en Redux?

**Respuesta:**
Uso `createAsyncThunk` de Redux Toolkit, que maneja automáticamente los estados pending/fulfilled/rejected:

```typescript
export const fetchUser = createAsyncThunk(
  'users/fetch',
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);
```

Para casos más complejos, consideraría Redux Saga (para async workflows complejos) o RTK Query (para data fetching).

### 4. ¿Qué es RTK Query y cuándo lo usarías?

**Respuesta:**
RTK Query es una solución de data fetching y caching incluida en Redux Toolkit. Lo usaría cuando:
- Necesito caching automático de API calls
- Quiero invalidación de cache declarativa
- Necesito polling o re-fetching automático
- Quiero optimistic updates

Reemplaza bibliotecas como React Query pero integrado con Redux.

---

## Recursos

- **Documentación oficial:** https://redux-toolkit.js.org/
- **Redux DevTools:** https://github.com/reduxjs/redux-devtools
- **Redux Essentials Tutorial:** https://redux.js.org/tutorials/essentials/part-1-overview-concepts

---

**Última actualización:** 2026-02-20
