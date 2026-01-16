# SQL vs NoSQL

## ¿Qué es SQL?
- Bases de datos relacionales (ej: PostgreSQL, MySQL, SQL Server).
- Estructura fija: tablas, filas y columnas.
- Soporte para transacciones ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad).
- Ideal para relaciones complejas y consultas avanzadas.

## ¿Qué es NoSQL?
- Bases de datos no relacionales (ej: MongoDB, Cassandra, Redis).
- Estructura flexible: documentos, clave-valor, grafos, columnas.
- Escalabilidad horizontal y alta disponibilidad.
- Ideal para grandes volúmenes de datos y esquemas variables.

## ¿Cuándo usar cada una?
- **SQL:** Cuando necesitas integridad, relaciones complejas y transacciones.
- **NoSQL:** Cuando necesitas escalar horizontalmente, manejar datos no estructurados o alta velocidad de escritura/lectura.

## Ejemplo SQL
```sql
-- Crear tabla y consulta relacional
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100)
);
INSERT INTO usuarios (nombre) VALUES ('Ana');
SELECT * FROM usuarios WHERE nombre = 'Ana';
```

## Ejemplo NoSQL (MongoDB)
```js
// Insertar y consultar documento
const usuario = { nombre: 'Ana' };
db.usuarios.insertOne(usuario);
db.usuarios.find({ nombre: 'Ana' });
```
