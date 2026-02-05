# Lifting State Up

Cuando varios componentes necesitan compartir estado, se "levanta" el estado al ancestro común.

```jsx
import { useState } from 'react';

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>Contador: {count}</h1>
      <Child count={count} setCount={setCount} />
    </div>
  );
}

function Child({ count, setCount }) {
  return (
    <div>
      <p>El contador en el hijo es: {count}</p>
      <button onClick={() => setCount(count + 1)}>Incrementar</button>
    </div>
  );
}
```
