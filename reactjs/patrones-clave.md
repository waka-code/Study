# Patrones Clave en React

## Container vs Presentational

Este patrón se basa en separar la lógica de negocio de la presentación visual. Los componentes **Container** se encargan de manejar el estado, las llamadas a APIs y la lógica de negocio, mientras que los componentes **Presentational** se enfocan únicamente en la presentación de la interfaz de usuario.

**Ventajas:**
- Facilita la reutilización de componentes presentacionales en diferentes contextos.
- Hace que los componentes sean más fáciles de probar, ya que los presentacionales no dependen de la lógica de negocio.
- Mejora la separación de responsabilidades, lo que resulta en un código más limpio y mantenible.

**Ejemplo:**
```jsx
// Presentational
const UserList = ({ users }) => (
  <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
);

// Container
function UserListContainer() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Simulación de una llamada a una API
    fetch('/api/users')
      .then(response => response.json())
      .then(data => setUsers(data));
  }, []);

  return <UserList users={users} />;
}
```

## Feature Folders

Este patrón organiza el código por funcionalidades en lugar de por tipo de archivo. En lugar de tener carpetas separadas para componentes, estilos y pruebas, cada funcionalidad tiene su propia carpeta que contiene todo lo necesario para esa funcionalidad.

**Ventajas:**
- Facilita la escalabilidad de la aplicación.
- Hace que sea más fácil encontrar y modificar el código relacionado con una funcionalidad específica.
- Reduce el acoplamiento entre diferentes partes de la aplicación.

**Ejemplo de estructura de carpetas:**
```
/src
  /features
    /UserManagement
      UserList.js
      UserForm.js
      userManagement.css
      userManagement.test.js
    /ProductCatalog
      ProductList.js
      ProductDetails.js
      productCatalog.css
      productCatalog.test.js
```

## Composición

La composición es un principio fundamental en React que permite construir interfaces complejas combinando componentes más pequeños y reutilizables. En lugar de herencia, React fomenta el uso de la composición para compartir funcionalidad entre componentes.

**Ventajas:**
- Promueve la reutilización de código.
- Facilita la creación de componentes modulares y fáciles de mantener.
- Permite una mayor flexibilidad al construir interfaces.

**Ejemplo:**
```jsx
const Card = ({ title, content, footer }) => (
  <div className="card">
    <h2>{title}</h2>
    <div>{content}</div>
    <footer>{footer}</footer>
  </div>
);

const App = () => (
  <Card
    title="Título de la tarjeta"
    content={<p>Este es el contenido de la tarjeta.</p>}
    footer={<button>Acción</button>}
  />
);
```

En este ejemplo, el componente `Card` es reutilizable y puede recibir diferentes elementos como `title`, `content` y `footer` a través de props, lo que permite una gran flexibilidad en su uso.
