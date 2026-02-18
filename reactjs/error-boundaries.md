# Error Boundaries en React

Permiten capturar errores en componentes hijos y mostrar una interfaz de usuario alternativa en caso de que ocurra un error. Esto es útil para evitar que un error en una parte de la aplicación afecte al resto de la interfaz.

## ¿Qué son los Error Boundaries?

Los Error Boundaries son componentes de React que actúan como un "muro de contención" para errores de JavaScript que ocurren en el árbol de componentes que envuelven. Capturan errores en el ciclo de vida de los componentes hijos, en métodos como `render`, `componentDidMount`, y en los manejadores de eventos.

Es importante destacar que los Error Boundaries **no capturan errores** en:
- Manejadores de eventos asíncronos (como `setTimeout` o `requestAnimationFrame`).
- Código fuera del árbol de React (por ejemplo, en servicios o utilidades).
- Errores en el servidor al renderizar en el lado del servidor (SSR).

## Ejemplo básico
```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar la UI alternativa en caso de error
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Puedes registrar el error en un servicio de monitoreo
    console.error("Error capturado por ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Algo salió mal. Por favor, inténtalo de nuevo más tarde.</h1>;
    }

    return this.props.children;
  }
}
```

## ¿Cómo usar un Error Boundary?

Para usar un Error Boundary, simplemente envuelve los componentes que deseas proteger con este componente. Por ejemplo:

```jsx
<ErrorBoundary>
  <MiComponente />
</ErrorBoundary>
```

En este caso, si `MiComponente` o cualquiera de sus hijos lanza un error durante el renderizado, el Error Boundary capturará el error y mostrará la UI alternativa definida en su método `render`.

## Buenas prácticas

1. **Usa múltiples Error Boundaries:** Divide tu aplicación en secciones más pequeñas y utiliza un Error Boundary para cada una. Esto asegura que un error en una sección no afecte a toda la aplicación.
2. **Registra los errores:** Usa el método `componentDidCatch` para enviar los errores a un servicio de monitoreo como Sentry o LogRocket.
3. **No abuses de los Error Boundaries:** Intenta escribir código robusto y manejar errores en el nivel más bajo posible antes de depender de un Error Boundary.

## Limitaciones

- No pueden capturar errores en funciones asíncronas como `setTimeout` o `fetch`.
- No capturan errores en el servidor durante el renderizado en el lado del servidor (SSR).
- No capturan errores en el propio Error Boundary.

Los Error Boundaries son una herramienta poderosa para mejorar la experiencia del usuario al manejar errores de manera elegante y evitar que toda la aplicación falle debido a un problema en una parte específica.
