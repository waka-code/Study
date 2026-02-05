# Patrones Clave en React

## Container vs Presentational
- Separar lógica de negocio (Container) de UI (Presentational).

## Feature Folders
- Organizar el código por funcionalidad.

## Composición
- Componer componentes pequeños para construir interfaces complejas.

## Ejemplo Container/Presentational
```jsx
// Presentational
const UserList = ({ users }) => (
  <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
);
// Container
function UserListContainer() {
  const [users, setUsers] = useState([]);
  useEffect(() => { /* fetch users */ }, []);
  return <UserList users={users} />;
}
```
