# Error Boundaries en React

Permiten capturar errores en componentes hijos y mostrar UI alternativa.

## Ejemplo básico
```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { /* log */ }
  render() {
    if (this.state.hasError) return <h1>Error!</h1>;
    return this.props.children;
  }
}
```
