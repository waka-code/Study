# Índices

## ¿Qué es un índice?
Estructura de datos que acelera las búsquedas y consultas en una base de datos.

## Ejemplo
```sql
-- Crear índice en columna email
CREATE INDEX idx_email ON usuarios(email);
-- Consulta usando el índice
SELECT * FROM usuarios WHERE email = 'ana@email.com';
```

## Ventajas
- Consultas mucho más rápidas.

## Desventajas
- Ocupan espacio extra.
- Pueden ralentizar las operaciones de escritura (insert/update/delete).
