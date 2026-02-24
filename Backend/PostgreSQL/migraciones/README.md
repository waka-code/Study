# 1️⃣1️⃣ Migraciones y versionado

Muy importante en equipos.

## Debes saber

### Migraciones incrementales
- **Descripción**: Las migraciones incrementales consisten en aplicar cambios a la base de datos de manera gradual, en lugar de realizar cambios masivos de una sola vez.
- **Ventajas**:
  - Permiten un control más granular de los cambios.
  - Facilitan la identificación y solución de errores.
- **Ejemplo**:
  ```sql
  -- Crear una nueva tabla
  CREATE TABLE usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL
  );

  -- Agregar una nueva columna
  ALTER TABLE usuarios ADD COLUMN email VARCHAR(255);
  ```

### Rollback seguro
- **Descripción**: La capacidad de revertir una migración en caso de errores o problemas.
- **Buenas prácticas**:
  - Escribir scripts de rollback para cada migración.
  - Probar los scripts de rollback en un entorno de prueba antes de aplicarlos en producción.
- **Ejemplo**:
  ```sql
  -- Migración
  ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(15);

  -- Rollback
  ALTER TABLE usuarios DROP COLUMN telefono;
  ```

### Cambios sin downtime
- **Descripción**: Implementar cambios en la base de datos sin interrumpir el servicio.
- **Técnicas comunes**:
  1. **Agregar columnas nuevas**: En lugar de modificar columnas existentes, agregar nuevas columnas y migrar los datos gradualmente.
  2. **Feature toggles**: Controlar la activación de nuevas funcionalidades a nivel de aplicación.
  3. **Shadow Writes**: Escribir datos en la nueva estructura mientras se mantiene la antigua.
- **Ejemplo**:
  ```sql
  -- Paso 1: Agregar nueva columna
  ALTER TABLE usuarios ADD COLUMN nuevo_email VARCHAR(255);

  -- Paso 2: Migrar datos
  UPDATE usuarios SET nuevo_email = email;

  -- Paso 3: Cambiar la aplicación para usar la nueva columna

  -- Paso 4: Eliminar la columna antigua
  ALTER TABLE usuarios DROP COLUMN email;
  ```

### Locks en migraciones
- **Descripción**: Durante una migración, la base de datos puede bloquear tablas, lo que afecta el rendimiento y la disponibilidad.
- **Buenas prácticas**:
  - Dividir migraciones grandes en pasos más pequeños.
  - Evitar operaciones que requieran bloquear toda la tabla, como `ALTER TABLE ... ADD COLUMN NOT NULL` sin un valor predeterminado.
- **Ejemplo**:
  ```sql
  -- Evitar esto
  ALTER TABLE usuarios ADD COLUMN edad INT NOT NULL;

  -- Alternativa
  ALTER TABLE usuarios ADD COLUMN edad INT;
  UPDATE usuarios SET edad = 0;
  ALTER TABLE usuarios ALTER COLUMN edad SET NOT NULL;
  ```

### Estrategias blue-green
- **Descripción**: Implementar cambios en un entorno paralelo (blue) mientras el entorno actual (green) sigue funcionando. Una vez que el nuevo entorno está listo, se realiza el cambio.
- **Ventajas**:
  - Minimiza el riesgo de interrupciones.
  - Permite pruebas en el entorno blue antes de la transición.
- **Ejemplo**:
  1. Configurar un nuevo entorno (blue) con la nueva versión de la base de datos.
  2. Migrar los datos al entorno blue.
  3. Probar el entorno blue.
  4. Cambiar el tráfico al entorno blue.
  5. Mantener el entorno green como respaldo temporal.

---

**Conclusión**: Las migraciones y el versionado son esenciales para mantener la estabilidad y escalabilidad de las bases de datos en entornos de producción. Es fundamental planificar cuidadosamente cada cambio y contar con estrategias de rollback y despliegue seguro.
