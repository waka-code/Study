# 3️⃣ Modelado de datos (MUY IMPORTANTE)

Aquí se nota la experiencia real.

## Debes dominar

### Normalización (hasta dónde)
- **Descripción**: La normalización es el proceso de estructurar una base de datos para reducir la redundancia y mejorar la integridad de los datos.
- **Ventajas**:
  - Minimiza la duplicación de datos.
  - Facilita el mantenimiento y la consistencia de los datos.
- **Desventajas**:
  - Puede hacer que las consultas sean más complejas debido a la necesidad de realizar múltiples uniones.
- **¿Hasta dónde normalizar?**:
  - Normalizar hasta la **3ª forma normal (3NF)** es generalmente suficiente para la mayoría de los casos.
  - Evitar la sobre-normalización en sistemas con alta carga de lectura.
- **Ejemplo**:
  ```sql
  -- 1NF: Eliminar datos repetidos
  CREATE TABLE clientes (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100),
      direccion VARCHAR(255)
  );

  -- 2NF: Separar datos dependientes de claves primarias
  CREATE TABLE pedidos (
      id SERIAL PRIMARY KEY,
      cliente_id INT REFERENCES clientes(id),
      fecha DATE
  );

  -- 3NF: Eliminar dependencias transitivas
  CREATE TABLE ciudades (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100)
  );

  ALTER TABLE clientes ADD COLUMN ciudad_id INT REFERENCES ciudades(id);
  ```

### Desnormalización (cuándo conviene)
- **Descripción**: La desnormalización implica combinar tablas para reducir la complejidad de las consultas y mejorar el rendimiento de lectura.
- **Ventajas**:
  - Reduce la necesidad de uniones complejas.
  - Mejora el rendimiento en sistemas de lectura intensiva.
- **Desventajas**:
  - Aumenta la redundancia de datos.
  - Incrementa el riesgo de inconsistencias.
- **¿Cuándo conviene?**:
  - En sistemas de análisis o reporting donde la velocidad de lectura es más importante que la consistencia estricta.
- **Ejemplo**:
  ```sql
  -- Normalizado
  SELECT clientes.nombre, ciudades.nombre
  FROM clientes
  JOIN ciudades ON clientes.ciudad_id = ciudades.id;

  -- Desnormalizado
  SELECT nombre_cliente, ciudad
  FROM clientes_desnormalizados;
  ```

### Relaciones: 1–1, 1–N, N–N
- **1–1**:
  - **Descripción**: Una fila en una tabla está relacionada con exactamente una fila en otra tabla.
  - **Ejemplo**:
    ```sql
    CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100)
    );

    CREATE TABLE perfiles (
        usuario_id INT PRIMARY KEY REFERENCES usuarios(id),
        bio TEXT
    );
    ```

- **1–N**:
  - **Descripción**: Una fila en una tabla está relacionada con muchas filas en otra tabla.
  - **Ejemplo**:
    ```sql
    CREATE TABLE autores (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100)
    );

    CREATE TABLE libros (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255),
        autor_id INT REFERENCES autores(id)
    );
    ```

- **N–N**:
  - **Descripción**: Muchas filas en una tabla están relacionadas con muchas filas en otra tabla.
  - **Ejemplo**:
    ```sql
    CREATE TABLE estudiantes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100)
    );

    CREATE TABLE cursos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100)
    );

    CREATE TABLE inscripciones (
        estudiante_id INT REFERENCES estudiantes(id),
        curso_id INT REFERENCES cursos(id),
        PRIMARY KEY (estudiante_id, curso_id)
    );
    ```

### Claves naturales vs surrogate keys
- **Claves naturales**:
  - **Ventajas**:
    - Representan datos del mundo real.
    - No requieren una columna adicional.
  - **Desventajas**:
    - Pueden cambiar, lo que afecta las relaciones.
    - Pueden ser largas y afectar el rendimiento.

- **Surrogate keys**:
  - **Ventajas**:
    - Son únicas y constantes.
    - Más eficientes para búsquedas y uniones.
  - **Desventajas**:
    - No tienen significado en el mundo real.

- **¿Cuándo usar cada una?**:
  - Usar claves naturales cuando el atributo es único, inmutable y significativo (por ejemplo, un número de identificación).
  - Usar surrogate keys en la mayoría de los casos para evitar problemas de mantenimiento.

### Soft delete vs hard delete
- **Soft delete**:
  - **Descripción**: Marcar un registro como eliminado sin eliminarlo físicamente de la base de datos.
  - **Ventajas**:
    - Permite recuperar datos eliminados.
    - Útil para auditorías y cumplimiento normativo.
  - **Desventajas**:
    - Aumenta el tamaño de la base de datos.
    - Requiere lógica adicional para filtrar registros eliminados.
  - **Ejemplo**:
    ```sql
    ALTER TABLE usuarios ADD COLUMN eliminado BOOLEAN DEFAULT FALSE;

    -- Marcar como eliminado
    UPDATE usuarios SET eliminado = TRUE WHERE id = 1;

    -- Consultar solo registros activos
    SELECT * FROM usuarios WHERE eliminado = FALSE;
    ```

- **Hard delete**:
  - **Descripción**: Eliminar un registro de la base de datos de forma permanente.
  - **Ventajas**:
    - Reduce el tamaño de la base de datos.
    - Simplifica las consultas.
  - **Desventajas**:
    - Los datos eliminados no se pueden recuperar.

- **¿Cuándo usar cada uno?**:
  - Usar **soft delete** cuando se necesite mantener un historial o cumplir con regulaciones.
  - Usar **hard delete** para datos temporales o no críticos donde la recuperación no es necesaria.

---

> **El esquema mal diseñado mata performance antes que el código.**

Un buen diseño de esquema es fundamental para garantizar el rendimiento y la escalabilidad de la base de datos. Es importante considerar el balance entre normalización y desnormalización, elegir las claves adecuadas y planificar cómo manejar los datos eliminados.
