# 4️⃣ Índices (CLAVE PARA SENIOR)

Esto **sí o sí** lo preguntan.

## Tipos de índices

### `BTREE` (default)
- **Descripción**: Es el tipo de índice predeterminado en PostgreSQL. Es ideal para búsquedas exactas y rangos.
- **Ventajas**:
  - Rápido para consultas de igualdad y rango (`=`, `<`, `>`, `BETWEEN`).
  - Soporta ordenamiento natural.
- **Desventajas**:
  - No es eficiente para búsquedas en datos no ordenados o con operadores complejos.
- **Ejemplo de uso**:
  ```sql
  CREATE INDEX idx_users_email ON users (email);
  SELECT * FROM users WHERE email = 'example@example.com';
  ```

### `HASH`
- **Descripción**: Índices basados en tablas hash, optimizados para búsquedas de igualdad.
- **Ventajas**:
  - Muy rápido para búsquedas exactas (`=`).
- **Desventajas**:
  - No soporta búsquedas por rango.
  - Menos flexible que `BTREE`.
- **Ejemplo de uso**:
  ```sql
  CREATE INDEX idx_users_hash_email ON users USING HASH (email);
  SELECT * FROM users WHERE email = 'example@example.com';
  ```

### `GIN` (Generalized Inverted Index)
- **Descripción**: Diseñado para manejar búsquedas en datos complejos, como arrays, JSONB y texto completo.
- **Ventajas**:
  - Ideal para búsquedas en columnas de tipo `JSONB` o arrays.
  - Soporta búsquedas de texto completo.
- **Desventajas**:
  - Costoso de construir y mantener.
  - Ocupa más espacio en disco.
- **Ejemplo de uso**:
  ```sql
  CREATE INDEX idx_users_jsonb_data ON users USING GIN (data);
  SELECT * FROM users WHERE data @> '{"key": "value"}';
  ```

### `GiST` (Generalized Search Tree)
- **Descripción**: Índice flexible que soporta búsquedas avanzadas, como proximidad geográfica y rangos.
- **Ventajas**:
  - Soporta búsquedas espaciales y de similitud.
  - Útil para datos geoespaciales y rangos.
- **Desventajas**:
  - Más lento que `BTREE` para búsquedas simples.
- **Ejemplo de uso**:
  ```sql
  CREATE INDEX idx_locations ON places USING GIST (location);
  SELECT * FROM places WHERE location <-> point '(10, 20)' < 5;
  ```

### `BRIN` (Block Range Index)
- **Descripción**: Optimizado para grandes conjuntos de datos donde los valores están agrupados físicamente.
- **Ventajas**:
  - Muy eficiente en almacenamiento.
  - Ideal para datos ordenados secuencialmente, como registros de tiempo.
- **Desventajas**:
  - Menos eficiente para datos no ordenados.
- **Ejemplo de uso**:
  ```sql
  CREATE INDEX idx_logs_time ON logs USING BRIN (timestamp);
  SELECT * FROM logs WHERE timestamp BETWEEN '2026-01-01' AND '2026-01-31';
  ```

---

## Debes saber

### Cuándo usar cada uno
- **BTREE**: Usar para la mayoría de las consultas de igualdad y rango.
- **HASH**: Usar solo para búsquedas exactas en columnas específicas.
- **GIN**: Usar para búsquedas en arrays, JSONB o texto completo.
- **GiST**: Usar para búsquedas espaciales o de similitud.
- **BRIN**: Usar para datos grandes y ordenados secuencialmente.

### Índices compuestos
- **Descripción**: Índices que abarcan múltiples columnas.
- **Ventajas**:
  - Mejoran el rendimiento de consultas que filtran por varias columnas.
- **Ejemplo**:
  ```sql
  CREATE INDEX idx_users_name_email ON users (name, email);
  SELECT * FROM users WHERE name = 'John' AND email = 'john@example.com';
  ```
- **Nota**: El orden de las columnas en el índice es importante.

### Índices parciales
- **Descripción**: Índices que solo incluyen filas que cumplen una condición específica.
- **Ventajas**:
  - Reducen el tamaño del índice.
  - Mejoran el rendimiento de consultas específicas.
- **Ejemplo**:
  ```sql
  CREATE INDEX idx_active_users ON users (email) WHERE active = true;
  SELECT * FROM users WHERE active = true AND email = 'example@example.com';
  ```

### Índices sobre JSONB
- **Descripción**: Índices diseñados para trabajar con datos JSONB.
- **Ventajas**:
  - Permiten búsquedas rápidas en estructuras JSON.
- **Ejemplo**:
  ```sql
  CREATE INDEX idx_users_jsonb ON users USING GIN (data);
  SELECT * FROM users WHERE data @> '{"key": "value"}';
  ```

### Coste de índices en writes
- **Descripción**: Los índices pueden ralentizar las operaciones de escritura debido a la necesidad de mantener los índices actualizados.
- **Consideraciones**:
  - Cada índice adicional aumenta el tiempo necesario para las operaciones `INSERT`, `UPDATE` y `DELETE`.
  - Es importante equilibrar el número de índices con las necesidades de rendimiento de lectura y escritura.

---

> ¿Por qué demasiados índices son malos?

1. **Impacto en el rendimiento de escritura**: Cada índice adicional aumenta el tiempo necesario para las operaciones de escritura.
2. **Consumo de espacio**: Los índices ocupan espacio en disco, lo que puede ser significativo en bases de datos grandes.
3. **Complejidad de mantenimiento**: Más índices significan más trabajo para el optimizador de consultas y mayor complejidad en la administración de la base de datos.

**Conclusión**: Los índices son herramientas poderosas, pero deben usarse con moderación y planificación para evitar impactos negativos en el rendimiento.
