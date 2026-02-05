# Hooks Personalizados

Permiten reutilizar lógica de estado o efecto entre componentes.

```jsx
function useTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
```
