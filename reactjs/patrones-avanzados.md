# Patrones Avanzados en React

## Compound Components
Los **Compound Components** son un patrón que permite componer componentes relacionados para crear interfaces más flexibles y reutilizables. Este patrón es útil cuando tienes un conjunto de componentes que necesitan trabajar juntos, pero quieres mantener la flexibilidad para que los desarrolladores puedan personalizar cómo se combinan.

### Ejemplo:
```jsx
const Tabs = ({ children }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  return (
    <div>
      {React.Children.map(children, (child, index) => {
        if (child.type === TabList) {
          return React.cloneElement(child, { activeIndex, setActiveIndex });
        }
        if (child.type === TabPanels) {
          return React.cloneElement(child, { activeIndex });
        }
        return child;
      })}
    </div>
  );
};

const TabList = ({ children, activeIndex, setActiveIndex }) => (
  <div>
    {React.Children.map(children, (child, index) =>
      React.cloneElement(child, {
        isActive: index === activeIndex,
        onClick: () => setActiveIndex(index),
      })
    )}
  </div>
);

const Tab = ({ isActive, onClick, children }) => (
  <button
    style={{ fontWeight: isActive ? "bold" : "normal" }}
    onClick={onClick}
  >
    {children}
  </button>
);

const TabPanels = ({ children, activeIndex }) => (
  <div>{React.Children.toArray(children)[activeIndex]}</div>
);

const TabPanel = ({ children }) => <div>{children}</div>;

// Uso del patrón Compound Components
<Tabs>
  <TabList>
    <Tab>Tab 1</Tab>
    <Tab>Tab 2</Tab>
    <Tab>Tab 3</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>Contenido del Tab 1</TabPanel>
    <TabPanel>Contenido del Tab 2</TabPanel>
    <TabPanel>Contenido del Tab 3</TabPanel>
  </TabPanels>
</Tabs>
```

---

## Render Props
El patrón de **Render Props** permite compartir lógica entre componentes al pasar una función como prop. Esto es útil para manejar estados compartidos o lógica compleja sin necesidad de usar HOCs.

### Ejemplo:
```jsx
const MouseTracker = ({ render }) => {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (event) => {
    setPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div style={{ height: "100vh" }} onMouseMove={handleMouseMove}>
      {render(position)}
    </div>
  );
};

// Uso del patrón Render Props
<MouseTracker
  render={({ x, y }) => (
    <h1>
      La posición del mouse es ({x}, {y})
    </h1>
  )}
/>
```

---

## Higher Order Components (HOC)
Los **Higher Order Components (HOC)** son funciones que reciben un componente como argumento y devuelven un nuevo componente con lógica adicional. Este patrón es útil para reutilizar lógica entre múltiples componentes.

### Ejemplo:
```jsx
const withLogger = (WrappedComponent) => {
  return (props) => {
    React.useEffect(() => {
      console.log("Componente montado");
      return () => console.log("Componente desmontado");
    }, []);

    return <WrappedComponent {...props} />;
  };
};

const MyComponent = () => <div>Hola, mundo</div>;

const MyComponentWithLogger = withLogger(MyComponent);

// Uso del HOC
<MyComponentWithLogger />
```

---

## Controlled vs Uncontrolled
Los componentes controlados y no controlados son dos enfoques diferentes para manejar el estado de los formularios en React.

- **Controlled Components**:
  - El estado del formulario es controlado por React a través de `useState` o `this.setState`.
  - Ejemplo:
  ```jsx
  const ControlledInput = () => {
    const [value, setValue] = React.useState("");

    return (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  };
  ```

- **Uncontrolled Components**:
  - El estado del formulario es manejado directamente por el DOM.
  - Ejemplo:
  ```jsx
  const UncontrolledInput = () => {
    const inputRef = React.useRef();

    const handleSubmit = () => {
      alert(inputRef.current.value);
    };

    return (
      <div>
        <input ref={inputRef} />
        <button onClick={handleSubmit}>Enviar</button>
      </div>
    );
  };
  ```

---

## Context Avanzado
El **Context API** de React permite compartir datos entre componentes sin necesidad de pasar props manualmente a través de cada nivel del árbol de componentes. En un nivel avanzado, se pueden implementar patrones para mejorar el rendimiento y manejar contextos complejos.

### Estrategias avanzadas:
1. **Dividir contextos**: Usa múltiples contextos para evitar renderizados innecesarios.
2. **Custom Providers**: Crea proveedores personalizados para encapsular lógica adicional.
3. **Memorización**: Usa `React.memo` y `useMemo` para evitar renderizados innecesarios.

### Ejemplo:
```jsx
const ThemeContext = React.createContext();

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = React.useState("light");

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const value = React.useMemo(() => ({ theme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

const ThemedButton = () => {
  const { theme, toggleTheme } = React.useContext(ThemeContext);

  return (
    <button
      style={{ background: theme === "light" ? "#fff" : "#333", color: theme === "light" ? "#000" : "#fff" }}
      onClick={toggleTheme}
    >
      Cambiar Tema
    </button>
  );
};

// Uso del Contexto
<ThemeProvider>
  <ThemedButton />
</ThemeProvider>
```

---

Estos patrones avanzados te permitirán construir aplicaciones React más flexibles, escalables y fáciles de mantener. ¡Explóralos y ponlos en práctica! 🚀
