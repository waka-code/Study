# Fragmentos y Keys

## Fragmentos
Permiten agrupar elementos sin añadir nodos extra al DOM.

```jsx
<>
  <li>Uno</li>
  <li>Dos</li>
</>
```

## Keys
Clave única para cada elemento de lista.

```jsx
{items.map(item => <Item key={item.id} {...item} />)}
```
