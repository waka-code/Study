# Roles y Permisos

Roles y permisos permiten definir qué acciones puede realizar cada usuario según su perfil. Se usan para autorización fina en sistemas multiusuario.

**Ejemplo:**
- Rol: `admin`, `user`, `editor`
- Permiso: `crear`, `editar`, `eliminar`

**Ejemplo en Express:**
```js
function authorize(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).send('No autorizado');
    next();
  };
}
app.use('/admin', authorize('admin'));
```
