# React Senior Engineer - Guía Completa

> Guía técnica avanzada para dominar React a nivel Senior, enfocada en arquitectura enterprise, performance y escalabilidad.

---

## Fundamentos internos de React

### Qué es React realmente
React es una biblioteca declarativa para construir interfaces de usuario, no un framework. Se compone de tres capas:

**1. Scheduler**: Gestiona prioridades de actualizaciones (SyncLane, TransitionLane, IdleLane)
**2. Reconciler**: Compara Virtual DOM y decide qué actualizar (diffing algorithm O(n))
**3. Renderer**: Aplica cambios al platform específico (DOM, Native, etc.)

### Arquitectura interna
```
JSX → Babel/SWC → React Core → Scheduler → Reconciler → Renderer → DOM
```

### Virtual DOM
Representación ligera del DOM real en memoria. Permite:
- Diffs eficientes sin manipular DOM real
- Batching de actualizaciones
- Cross-platform (web, native, etc.)

### Fiber Architecture
Fiber reemplazó el Stack Reconciler en React 16. Cada Fiber Node contiene:
- `tag`: Tipo de componente (FunctionComponent, ClassComponent, HostRoot, etc.)
- `return/child/sibling`: Punteros a la estructura del árbol
- `pendingProps/memoizedProps`: Props actuales y memoizados
- `memoizedState/updateQueue`: Estado y cola de actualizaciones
- `effectTag`: Efectos a aplicar en commit phase
- `alternate`: Copia para double buffering

### Reconciliation Algorithm
Algoritmo heurístico O(n):
1. Diferentes tipos → reemplazo completo
2. Mismo tipo → update props
3. Hijos diferentes → diff recursivo
4. Keys → identificación de elementos

### Rendering Pipeline
**Schedule Phase**: setState → update queue → schedule callback
**Render Phase** (interrumpible): create work-in-progress tree → calculate changes → mark effects
**Commit Phase** (no interrumpible): before mutation → mutation (DOM changes) → layout (useLayoutEffect)

### Concurrent Rendering
Características:
- **Interruptible rendering**: React puede pausar/reanudar renderizado
- **Priority-based updates**: SyncLane (input) vs TransitionLane (search results)
- **Time slicing**: Divide trabajo en chunks pequeños
- **Transitions**: useTransition marca updates como no urgentes

```typescript
const [isPending, startTransition] = useTransition();
startTransition(() => {
  // Update no urgente
});
```

### React Compiler
Compilador automático que optimiza mediante memoización:
```typescript
// Código original
function Component({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <div>{total}</div>;
}

// Compilado a (automático)
function Component({ items }) {
  const $ = useMemo(() => ({
    total: items.reduce((sum, item) => sum + item.value, 0)
  }), [items]);
  return <div>{$.total}</div>;
}
```

### React Server Components (RSC)
**Server Components** (default):
- ✅ Async, acceso a backend, secrets
- ❌ No hooks, no browser APIs, no eventos

**Client Components** ('use client'):
- ✅ Hooks, eventos, browser APIs
- ❌ No acceso directo a backend

### JSX Internamente
```typescript
// JSX
<div>Hello</div>

// Transformado (React 17+)
import { jsx as _jsx } from 'react/jsx-runtime';
_jsx('div', { children: 'Hello' });
```

### Synthetic Events
React normaliza eventos cross-browser. React 17+ eliminó event pooling (ya no necesitas `e.persist()`).

### Event Delegation
React adjunta UN solo listener en el document/root y dispatch al componente correcto basado en target.

### Batch Updates
React 18 hace automatic batching en más lugares (promises, timeouts, async):
```typescript
// 1 render (batched)
setCount(1);
setName('John');

// Forzar render inmediato
flushSync(() => setCount(1));
setName('John'); // 2 renders
```

### Keys
```typescript
// ✅ Keys únicas y estables
items.map(item => <li key={item.id}>{item.name}</li>)

// ❌ Índices (problema con reordenamiento)
items.map((item, i) => <li key={i}>{item.name}</li>)
```

---

## Rendering y Reconciliation

### Render Triggers
1. setState
2. Parent re-render
3. Context change
4. Props change (si parent re-render)

### Re-rendering
Component re-renderiza si setState se llama, parent re-renderiza y props cambiaron, o context value cambió.

**Optimización con React.memo:**
```typescript
const Child = React.memo(function Child() {
  return <div>Child</div>;
});
// Solo re-render si props cambiaron (shallow comparison)
```

### useMemo
Memoiza valores calculados costosos:
```typescript
const sorted = useMemo(() => 
  [...items].sort((a, b) => a.value - b.value), 
  [items]
);
```

### useCallback
Memoiza callbacks para evitar re-renders de children memoizados:
```typescript
const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []);
```

### Stale Closures

Un stale closure (closure obsoleta) ocurre cuando una función “recuerda” valores antiguos del estado o props porque fue creada en un render previo.

```typescript
// ❌ Stale closure
useEffect(() => {
  const interval = setInterval(() => console.log(count), 1000);
  return () => clearInterval(interval);
}, []);

// ✅ Solución 1: agregar dependencia
useEffect(() => {
  const interval = setInterval(() => console.log(count), 1000);
  return () => clearInterval(interval);
}, [count]);

// ✅ Solución 2: functional update
useEffect(() => {
  const interval = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(interval);
}, []);
```

### Infinite Re-renders
Causas comunes:
- setState en render sin condición
- setState en effect sin dependencia correcta
- Object/array nuevo en dependency array
- Function nueva en dependency array

### Render Waterfalls
Evitar esperar secuencialmente:
```typescript
// ❌ Waterfall
useEffect(() => { fetchUser().then(setUser); }, []);
useEffect(() => { if (user) fetchPosts(user.id).then(setPosts); }, [user]);

// ✅ Paralelo
useEffect(() => {
  Promise.all([fetchUser(), fetchPosts()]).then(([u, p]) => {
    setData({ user: u, posts: p });
  });
}, []);
```

### Performance Optimization
- Virtualization (react-window) para listas largas
- Code splitting (React.lazy)
- Debouncing/throttling inputs
- Batch DOM reads/writes (evitar layout thrashing)

---

## Hooks Profundo

### useState Internamente
```typescript
function useState(initialState) {
  const hook = updateWorkInProgressHook();
  
  if (currentHook === null) {
    // Primer render
    hook.memoizedState = initialState;
    hook.queue = { pending: null, dispatch: dispatchAction };
    return [hook.memoizedState, hook.queue.dispatch];
  }
  
  // Procesar updates en queue
  let newState = hook.memoizedState;
  let update = hook.queue.first;
  while (update) {
    newState = typeof update.action === 'function' 
      ? update.action(newState) 
      : update.action;
    update = update.next;
  }
  hook.memoizedState = newState;
  return [newState, hook.queue.dispatch];
}
```

**Lazy initialization:**
```typescript
const [state, setState] = useState(() => expensiveCalculation());
```

### useEffect Internamente
```typescript
function useEffect(create, deps) {
  const hook = updateWorkInProgressHook();
  
  if (currentHook !== null) {
    const prevDeps = currentHook.memoizedState.deps;
    if (areHookInputsEqual(deps, prevDeps)) {
      return; // Skip effect
    }
  }
  
  currentlyRenderingFiber.flags |= PassiveEffect;
  hook.memoizedState = pushEffect(PassiveEffect | HasEffect, create, undefined, deps);
}
```

### useLayoutEffect vs useEffect
- **useLayoutEffect**: Ejecuta después de mutations, antes de paint (síncrono)
- **useEffect**: Ejecuta después de paint (asíncrono)

Usar useLayoutEffect solo cuando necesitas leer DOM antes de paint (evitar flicker).

### useRef
```typescript
function useRef(initialValue) {
  const hook = updateWorkInProgressHook();
  if (currentHook === null) {
    hook.memoizedState = { current: initialValue };
  }
  return hook.memoizedState; // Reusa misma referencia
}
```

Usos: acceder DOM, mantener valor mutable entre renders, evitar stale closures.

### useReducer
Para estado complejo con lógica de actualización:
```typescript
type State = { count: number };
type Action = { type: 'increment' } | { type: 'decrement' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    case 'decrement': return { count: state.count - 1 };
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0 });
```

### useContext Optimización
Dividir context por feature para evitar re-renders innecesarios:
```typescript
// ❌ Un solo context causa re-renders de todos
const AppContext = createContext({ theme, user });

// ✅ Dividir context
const ThemeContext = createContext(theme);
const UserContext = createContext(user);
```

### useImperativeHandle
Exponer métodos imperativos a parent via ref:
```typescript
const Child = forwardRef((props, ref) => {
  const inputRef = useRef();
  
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus()
  }));
  
  return <input ref={inputRef} />;
});
```

### useTransition
Marcar updates como no urgentes:
```typescript
const [isPending, startTransition] = useTransition();
startTransition(() => {
  // Update de baja prioridad
});
```

### useDeferredValue
Diferir valor no crítico:
```typescript
const deferredQuery = useDeferredValue(query);
// Usa valor diferido para renderizado pesado
```

### useSyncExternalStore
Suscribirse a stores externos (Redux, Zustand):
```typescript
const store = useSyncExternalStore(
  store.subscribe,
  () => store.getState()
);
```

### Custom Hooks
Patrones comunes:
```typescript
// Data fetching
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(url).then(res => res.json()).then(setData).finally(() => setLoading(false));
  }, [url]);
  return { data, loading };
}

// localStorage
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

// Debounce
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}
```

### Hook Rules
Los hooks dependen del orden de ejecución (almacenados en array ligado al fiber). Siempre al tope del componente, nunca en condiciones o loops.

### Dependency Arrays
Comparación es shallow (Object.is), no deep comparison. Arrays/objects nuevos causan re-ejecución.

---

## Concurrent React Avanzado


### Concurrent Rendering Features
- **Interruptible rendering**: React puede pausar renderizado
- **Priority-based updates**: Urgentes (input) vs no urgentes (search)
- **Time slicing**: Divide trabajo en chunks
- **Transitions**: useTransition marca updates como no urgentes
El Concurrent Rendering es un conjunto de capacidades que permiten a React interrumpir, pausar y reanudar renders para mantener la UI fluida incluso cuando hay trabajo pesado.
### Suspense
Permite mostrar fallback mientras carga:
```typescript
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>

// React 19+ data fetching
async function DataComponent() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Streaming Rendering
Server Components envían HTML progresivamente en chunks.

### React Scheduler
Prioridades: SyncLane (máxima) → InputContinuousLane → DefaultLane → TransitionLane → IdleLane (mínima).

---

## React Server Components

### Server vs Client Components
**Server Component** (default):
```typescript
async function ProductList() {
  const products = await db.products.findMany();
  return <ProductCard products={products} />;
}
```

**Client Component**:
```typescript
'use client';
function AddToCart({ productId }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => setAdded(true)}>Add</button>;
}
```

### Server Actions
```typescript
async function addToCart(formData: FormData) {
  'use server';
  await db.cart.create({ productId: formData.get('productId') });
}
```

### Streaming
HTML se envía progresivamente: Header → Skeleton → Content cuando carga.

---

## Estado y Arquitectura Avanzada

### Estrategias de Estado
**Local state**: useState para estado local del componente
**Global state**: Zustand, Redux Toolkit, Jotai
**Server state**: React Query, SWR (caching, invalidation, optimistic updates)
**UI state**: useState, useReducer
**Derived state**: useMemo

### Redux Internamente
```typescript
import { configureStore, createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1; }
  }
});

const store = configureStore({ reducer: { counter: counterSlice.reducer } });
```

### Zustand
```typescript
const useStore = create(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}));
```

### Context API Optimización
Dividir context por feature, usar selector pattern.

### State Normalization
Normalizar datos anidados para evitar duplicación:
```typescript
// Normalized
{
  entities: {
    users: { 1: { id: 1, name: 'John' }, 2: { id: 2, name: 'Jane' } },
    posts: { 1: { id: 1, title: 'Post', author: 1 } }
  },
  results: { users: [1, 2], posts: [1] }
}
```

---

## React + TypeScript Avanzado

### Generic Components
```typescript
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
}

function Table<T>({ data, columns }: TableProps<T>) {
  return <table>{/* ... */}</table>;
}
```

### Polymorphic Components
```typescript
interface BoxProps<E extends React.ElementType> {
  as?: E;
  children: React.ReactNode;
}

function Box<E extends React.ElementType = 'div'>({ 
  as, children, ...props 
}: BoxProps<E> & Omit<React.ComponentPropsWithoutRef<E>, keyof BoxProps<E>>) {
  const Component = as || 'div';
  return <Component {...props}>{children}</Component>;
}
```

### Type-Safe Props
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}
```

### Compound Components Tipados
```typescript
const TabsContext = createContext<TabsContextValue | null>(null);

function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>;
}

function Tab({ value, children }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');
  const { activeTab, setActiveTab } = context;
  return <button onClick={() => setActiveTab(value)}>{children}</button>;
}
```

---

## Performance y Optimización

### Rendering Optimization
```typescript
// React.memo para componentes puros
const Expensive = React.memo(function Expensive({ data }) {
  return <ComplexVisualization data={data} />;
});

// useMemo para cálculos costosos
const sorted = useMemo(() => [...items].sort(), [items]);

// useCallback para callbacks
const handleClick = useCallback(() => setCount(c => c + 1), []);
```

### Profiling
```typescript
import { Profiler } from 'react';
El profiling es el proceso de medir el rendimiento real de tu aplicación para identificar qué componentes, renders o cálculos están consumiendo más recursos.
<Profiler id="App" onRender={(id, phase, actualDuration) => console.log({ id, phase, actualDuration })}>
  <App />
</Profiler>
```

### Bundle Optimization
```typescript
// Code splitting
const Dashboard = React.lazy(() => import('./Dashboard'));

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

### Virtualization
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList height={400} itemCount={items.length} itemSize={35}>
  {({ index, style }) => <div style={style}>{items[index]}</div>}
</FixedSizeList>
```

---

## Data Fetching Moderno

### React Query
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json()),
  staleTime: 5 * 60 * 1000
});

const mutation = useMutation({
  mutationFn: (user) => fetch('/api/users', { method: 'POST', body: JSON.stringify(user) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
});
```

### Suspense Data Fetching (React 19+)
```typescript
async function Users() {
  const data = await fetch('/api/users').then(r => r.json());
  return <UserList users={data} />;
}

<Suspense fallback={<Loading />}>
  <Users />
</Suspense>
```

---

## Formularios Avanzados

### React Hook Form
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });
  
  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

---

## Arquitectura Frontend Senior

### Feature-Driven Architecture
```
src/
├── features/
│   ├── auth/ (components, hooks, api, types)
│   ├── dashboard/ (components, hooks, api, types)
│   └── shared/ (components, hooks, utils)
├── app/
└── lib/
```

### Atomic Design
```
src/
├── atoms/ (Button, Input, Icon)
├── molecules/ (Card, FormField, Navbar)
├── organisms/ (Header, Sidebar, DataTable)
├── templates/ (DashboardLayout, AuthLayout)
└── pages/ (HomePage, DashboardPage)
```

### Monorepos
- **Nx**: Build system con caching inteligente
- **Turborepo**: Build system rápido
- **Module Federation**: Microfrontends

### Design Systems
Component library compartido con Storybook, tokens de diseño, documentación.

---

## Next.js Profundo

### SSR, SSG, ISR
```typescript
// SSR
export async function getServerSideProps(context) {
  const data = await fetchData();
  return { props: { data } };
}

// SSG
export async function getStaticProps() {
  const data = await fetchData();
  return { props: { data }, revalidate: 60 };
}

// ISR
export async function getStaticPaths() {
  return { paths: [{ params: { id: '1' } }], fallback: 'blocking' };
}
```

### App Router
```typescript
// app/page.tsx (Server Component por defecto)
async function HomePage() {
  const data = await fetchData();
  return <div><ClientComponent data={data} /></div>;
}

// components/ClientComponent.tsx
'use client';
function ClientComponent({ data }) {
  const [count, setCount] = useState(0);
  return <div>{count} - {data}</div>;
}
```

### Server Actions
```typescript
'use server';
async function createProduct(formData: FormData) {
  await db.product.create({ name: formData.get('name') });
}

<form action={createProduct}>
  <input name="name" />
  <button type="submit">Create</button>
</form>
```

### Caching y Revalidation
```typescript
fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // ISR
});

fetch('https://api.example.com/data', {
  cache: 'no-store' // No cache
});

revalidatePath('/products');
```

---

## Seguridad en React

### XSS
React escapa JSX por defecto. Para HTML inseguro:
```typescript
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(html);
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

### JWT Storage
- ✅ HttpOnly cookies (backend)
- ❌ localStorage (vulnerable a XSS)
- ❌ sessionStorage (vulnerable a XSS)

### CSP
```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
`;
```

---

## Testing Profesional React

### React Testing Library
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Counter', () => {
  it('increments count', async () => {
    const user = userEvent.setup();
    render(<Counter />);
    
    const button = screen.getByRole('button', { name: /increment/i });
    await user.click(button);
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

### Vitest
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Counter } from './Counter';

describe('Counter', () => {
  it('renders initial count', () => {
    render(<Counter />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
});
```

### E2E con Playwright
```typescript
import { test, expect } from '@playwright/test';

test('counter increments', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('button:text("Increment")');
  await expect(page.locator('text=Count: 1')).toBeVisible();
});
```

---

## Build Systems y Tooling

### Vite
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
});
```

### Webpack
```javascript
module.exports = {
  module: {
    rules: [{ test: /\.(js|jsx)$/, use: 'babel-loader' }]
  },
  optimization: {
    splitChunks: { chunks: 'all' }
  }
};
```

### Turbopack
Build system de Next.js, más rápido que Webpack.

---

## APIs y Comunicación

### REST
```typescript
fetch('/api/users')
  .then(res => res.json())
  .then(users => console.log(users));
```

### GraphQL con Apollo
```typescript
import { useQuery, gql } from '@apollo/client';

const GET_USERS = gql`query GetUsers { users { id name email } }`;

function Users() {
  const { loading, error, data } = useQuery(GET_USERS);
  if (loading) return <Loading />;
  return <UserList users={data.users} />;
}
```

### WebSockets
```typescript
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => console.log(event.data);
```

---

## Accesibilidad Avanzada

### ARIA
```typescript
<button
  aria-expanded={isOpen}
  aria-controls="panel-1"
  onClick={() => setIsOpen(!isOpen)}
>
  Toggle
</button>
<div id="panel-1" role="region" hidden={!isOpen}>
  Content
</div>
```

### Keyboard Navigation
```typescript
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Focus Management
```typescript
const modalRef = useRef();
useEffect(() => {
  if (isOpen) modalRef.current?.focus();
}, [isOpen]);
```

---

## Entrevistas Técnicas Senior React

### Preguntas Comunes

**1. ¿Cómo funciona React internamente?**
Respuesta: React tiene tres capas: Scheduler (gestiona prioridades), Reconciler (compara Virtual DOM con diffing O(n)), Renderer (aplica cambios al platform). Usa Fiber Architecture para renderizado interrumpible. Rendering phases: Schedule → Render (interrumpible) → Commit (no interrumpible).

**2. ¿Cuándo usar useMemo vs useCallback?**
useMemo para memoizar valores calculados costosos. useCallback para memoizar callbacks pasados a children memoizados. Solo cuando es necesario para performance (medir primero).

**3. ¿Cómo optimizar re-renders?**
React.memo para componentes puros, useMemo/useCallback para memoización, context splitting para evitar re-renders de todos consumers, virtualization para listas largas, code splitting para bundles.

**4. ¿Qué es Concurrent React?**
Rendering interrumpible con prioridades. useTransition marca updates como no urgentes. useDeferredValue difiere valores. Suspense para loading states. Time slicing divide trabajo en chunks.

**5. ¿Diferencia entre Server y Client Components?**
Server Components (default): async, acceso a backend, secrets, no hooks, no browser APIs. Client Components ('use client'): hooks, eventos, browser APIs, no acceso directo a backend.

### Live Coding

**Problema: Infinite re-renders**
```typescript
// ❌ Problema
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => { setCount(count + 1); }, [count]);
  return <div>{count}</div>;
}

// ✅ Solución: functional update
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => { setCount(c => c + 1); }, []);
  return <div>{count}</div>;
}
```

---

## Cómo Responde un Senior React

### Justificar Arquitectura
Explicar trade-offs: escalabilidad vs complejidad, performance vs developer experience, maintainability vs time-to-market. Considerar team size, experiencia, y requerimientos del proyecto.

**Ejemplo:** "Elegí feature-driven architecture porque permite trabajo en paralelo entre equipos, reduce coupling entre features, facilita testing y debugging. Trade-off: puede haber código duplicado, pero mitigamos con shared components."

### Detectar Problemas de Rendering
Usar React DevTools Profiler, identificar componentes que re-renderizan innecesariamente, verificar memoización, revisar context splitting, usar React Compiler (React 19+).

### Pensar como Arquitecto Frontend
Considerar: escalabilidad (¿cómo escala con features y equipo?), performance (¿es performante para el caso de uso?), maintainability (¿es fácil de mantener?), developer experience (¿es fácil de desarrollar?), testing (¿es testeable?), accesibilidad, SEO.

---

## Roadmap Senior React

### Junior
- Basics de React
- Componentes simples
- useState, useEffect
- Sigue tutoriales

### Mid
- Rendering y re-renders
- Hooks correctamente
- Optimización básica
- Testing básico
- Next.js

### Senior
- React internamente (Fiber, Reconciler)
- Arquitectura frontend enterprise
- Performance avanzada
- Concurrent React
- React Server Components
- System design frontend
- Mentoring

### Staff/Principal
- Arquitectura de sistemas frontend
- Decisiones técnicas a nivel empresa
- Optimización a gran escala
- Build systems y tooling
- Innovación en React

---

## Checklist Completo Senior React

### Fundamentos
- [ ] Entiendo React internamente (Fiber, Reconciler, Renderer)
- [ ] Conozco Virtual DOM y diffing algorithm
- [ ] Entiendo rendering phases (render, commit)
- [ ] Conozco Concurrent React y time slicing
- [ ] Entiendo React Compiler

### Hooks
- [ ] Sé cómo funcionan los hooks internamente
- [ ] Entiendo hook rules y por qué existen
- [ ] Puedo crear custom hooks
- [ ] Conozco todos los hooks avanzados
- [ ] Entiendo dependency arrays

### Rendering
- [ ] Sé cuándo y por qué re-renderiza
- [ ] Puedo optimizar re-renders
- [ ] Entiendo memoization (useMemo, useCallback, React.memo)
- [ ] Sé usar Profiler
- [ ] Conozco render waterfalls y cómo evitarlos

### Performance
- [ ] Sé optimizar bundles
- [ ] Conozco code splitting
- [ ] Sé usar virtualization
- [ ] Entiendo React DevTools Profiler
- [ ] Puedo debuggear performance issues

### Arquitectura
- [ ] Puedo diseñar arquitectura frontend enterprise
- [ ] Conozco patrones (Atomic Design, Feature-driven)
- [ ] Entiendo monorepos (Nx, Turborepo)
- [ ] Sé implementar microfrontends
- [ ] Conozco design systems

### Estado
- [ ] Conozco todas las estrategias de estado
- [ ] Sé cuándo usar cada una
- [ ] Entiendo Redux internamente
- [ ] Sé usar Zustand, Jotai, Recoil
- [ ] Conozco React Query

### TypeScript
- [ ] Puedo crear componentes tipados
- [ ] Sé usar generic components
- [ ] Conozco polymorphic components
- [ ] Entiendo compound components tipados
- [ ] Sé usar utility types avanzadas

### Testing
- [ ] Sé escribir tests unitarios
- [ ] Conozco React Testing Library
- [ ] Puedo testear hooks
- [ ] Sé escribir tests E2E
- [ ] Conozco testing patterns

### Next.js
- [ ] Entiendo SSR, SSG, ISR
- [ ] Conozco App Router
- [ ] Sé usar Server Components
- [ ] Entiendo Server Actions
- [ ] Conozco caching y revalidation

### Seguridad
- [ ] Conozco vulnerabilidades comunes (XSS, CSRF)
- [ ] Sé sanitizar input
- [ ] Entiendo JWT storage seguro
- [ ] Conozco CSP
- [ ] Sé implementar seguridad frontend

### Accesibilidad
- [ ] Conozco ARIA
- [ ] Sé implementar keyboard navigation
- [ ] Entiendo screen readers
- [ ] Conozco WCAG
- [ ] Sé hacer testing de accesibilidad

---

## Anti Patrones

### Rendering
```typescript
// ❌ setState en render
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Infinite loop
  return <div>{count}</div>;
}

// ❌ Efectos sin dependencias correctas
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => { setCount(count + 1); }, []); // Falta count
}

// ❌ Memoización innecesaria
function Component() {
  const sum = useMemo(() => 1 + 1, []); // Overhead innecesario
  return <div>{sum}</div>;
}
```

### Estado
```typescript
// ❌ Prop drilling
function App() {
  const [user, setUser] = useState(null);
  return <A user={user}><B user={user}><C user={user}><D user={user} /></C></B></A>;
}

// ✅ Context
const UserContext = createContext(null);
```

### Hooks
```typescript
// ❌ Hooks en condiciones
function Component() {
  if (condition) {
    const [state, setState] = useState(0); // Rompe orden
  }
}

// ✅ Hooks al tope
function Component() {
  const [state, setState] = useState(0);
  if (condition) { /* lógica */ }
}
```

---

## Buenas Prácticas Senior

### Componentes
- Componentes pequeños y enfocados (Single Responsibility)
- Composición sobre herencia
- Props drilling solo para 1-2 niveles, usar Context para más
- Componentes puros cuando sea posible (React.memo)

### Estado
- Estado local para estado del componente
- Context para estado global compartido
- React Query para server state
- Zustand/Redux para estado global complejo

### Performance
- Medir antes de optimizar (Profiler)
- useMemo/useCallback solo cuando es necesario
- Virtualization para listas largas
- Code splitting para bundles grandes

### Testing
- Testear comportamiento, no implementación
- React Testing Library sobre Enzyme
- Tests unitarios para lógica de negocio
- E2E para flujos críticos

### TypeScript
- Tipos estrictos (no any)
- Generic components para reusabilidad
- Utility types para manipulación de tipos
- Zod para validación runtime

---

## Recursos Recomendados

### Oficiales
- React Documentation (react.dev)
- Next.js Documentation (nextjs.org)
- React Query Documentation (tanstack.com/query)

### Libros
- "React Patterns" por Artem Sidorov
- "Production-Ready React" por Michele Bertoli
- "The Road to React" por Robin Wieruch

### Cursos
- Epic React por Kent C. Dodds
- React Performance por Josh Comeau
- React Server Components por Vercel

### Tools
- React DevTools Profiler
- Bundle Analyzer
- Lighthouse
- axe DevTools (accesibilidad)

---

## Conclusión

Para ser un Senior React Engineer necesitas:
1. **Fundamentos sólidos**: Entender React internamente (Fiber, Reconciler, Renderer)
2. **Arquitectura**: Diseñar sistemas escalables y mantenibles
3. **Performance**: Optimizar rendering, bundles, y data fetching
4. **Testing**: Estrategias de testing completas
5. **TypeScript**: Tipado avanzado y componentes genéricos
6. **Concurrent React**: Rendering interrumpible y transiciones
7. **RSC**: Server Components y Next.js App Router
8. **Mentoring**: Guiar a junior y mid developers

La clave es entender no solo CÓMO usar React, sino POR QUÉ funciona así y CUÁNDO aplicar cada patrón.
