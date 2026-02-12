# Principle of Least Privilege

Otorga a cada usuario o proceso solo los permisos mínimos necesarios para realizar su tarea.

**Ejemplo:**
- Usuarios normales no pueden borrar registros.
- Servicios solo pueden acceder a recursos necesarios.

```sql
-- SQL: Crear usuario solo lectura
CREATE USER readonly;
GRANT SELECT ON tabla TO readonly;
```
