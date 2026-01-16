# Normalización

## ¿Qué es?
Proceso de organizar los datos en una base de datos para reducir la redundancia y mejorar la integridad.

## Ejemplo
### Sin normalizar
| Cliente | Dirección      | Producto |
|---------|---------------|----------|
| Ana     | Calle 1       | Libro    |
| Ana     | Calle 1       | Lápiz    |

### Normalizado
- Tabla `Clientes`: id, nombre, dirección
- Tabla `Pedidos`: id, cliente_id, producto

```sql
-- Normalización en SQL
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100),
  direccion VARCHAR(100)
);
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id),
  producto VARCHAR(100)
);
```

## Ventajas
- Menos duplicidad de datos.
- Facilita el mantenimiento y la integridad referencial.

## Desventajas
- Consultas más complejas (más joins).
- Puede impactar el rendimiento en lecturas masivas.
