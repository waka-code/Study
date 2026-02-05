# Context API

Permite compartir datos globales entre componentes sin prop drilling.

```jsx
const ThemeContext = React.createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>Contenido</div>;
}
```

---

## 🆕 Novedades de Context API en React 19

- **Context Providers anidados**: Ahora React 19 optimiza el renderizado de múltiples providers anidados, mejorando el rendimiento.
- **useContextSelector** (propuesta): Permite seleccionar solo una parte del contexto para evitar renders innecesarios.
- **Mejoras en Server Components**: Context API ahora es compatible y eficiente en Server Components.
- **Mejoras en el tipado y warnings**: Mejor feedback en desarrollo para mal uso de contextos.

> Consulta la documentación oficial para ejemplos y detalles actualizados: https://react.dev/reference/react/Context
