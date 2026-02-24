# 1️⃣2️⃣ Backup y recuperación

Esto es **responsabilidad senior**.

## Debes dominar

### `pg_dump`
`pg_dump` es una herramienta de PostgreSQL utilizada para realizar copias de seguridad lógicas de bases de datos. Genera un archivo que contiene los comandos SQL necesarios para reconstruir la base de datos, incluyendo su esquema y datos.

#### Ejemplo de uso básico:
```bash
pg_dump -U usuario -d nombre_base_datos -f backup.sql
```
- `-U`: Especifica el usuario de la base de datos.
- `-d`: Indica el nombre de la base de datos a respaldar.
- `-f`: Define el archivo de salida donde se guardará el backup.

#### Opciones avanzadas:
- `--data-only`: Exporta solo los datos, sin el esquema.
- `--schema-only`: Exporta solo el esquema, sin los datos.
- `--format=c`: Genera un archivo en formato comprimido personalizado.

### `pg_restore`
`pg_restore` es la herramienta complementaria de `pg_dump` y se utiliza para restaurar una base de datos desde un archivo de backup generado por `pg_dump`.

#### Ejemplo de uso básico:
```bash
pg_restore -U usuario -d nombre_base_datos backup.dump
```
- `-U`: Especifica el usuario de la base de datos.
- `-d`: Indica el nombre de la base de datos donde se restaurará el backup.

#### Opciones avanzadas:
- `--create`: Crea la base de datos antes de restaurarla.
- `--clean`: Elimina objetos existentes antes de restaurarlos.
- `--jobs=N`: Permite realizar la restauración en paralelo con `N` trabajos.

### Backups lógicos vs físicos
- **Backups lógicos**: Son copias de seguridad realizadas con herramientas como `pg_dump` o `pg_dumpall`. Contienen los comandos SQL necesarios para recrear la base de datos y sus datos. Son portables entre diferentes versiones de PostgreSQL, pero pueden ser más lentos para bases de datos grandes.
- **Backups físicos**: Son copias exactas de los archivos de datos del sistema de PostgreSQL. Se realizan utilizando herramientas como `pg_basebackup` o mediante la copia directa de los archivos del sistema de datos. Son más rápidos para bases de datos grandes, pero no son portables entre diferentes versiones de PostgreSQL.

### Point-in-time recovery (PITR)
El **PITR** permite restaurar una base de datos a un estado específico en el tiempo, útil para recuperar datos en caso de errores o fallos. Esto se logra utilizando backups físicos junto con los archivos de registro de transacciones (WAL).

#### Pasos para realizar un PITR:
1. Realizar un backup físico inicial con `pg_basebackup`:
   ```bash
   pg_basebackup -D /ruta/a/backup -F tar -z -P -U usuario
   ```
2. Configurar el archivo `postgresql.conf` para habilitar la archivación de WAL:
   ```
   archive_mode = on
   archive_command = 'cp %p /ruta/a/archivos_wal/%f'
   ```
3. Restaurar el backup físico y los archivos WAL:
   - Detener el servidor PostgreSQL.
   - Restaurar el backup físico.
   - Copiar los archivos WAL al directorio correspondiente.
   - Configurar el archivo `recovery.conf` para especificar el punto de recuperación:
     ```
     restore_command = 'cp /ruta/a/archivos_wal/%f %p'
     recovery_target_time = '2026-02-19 15:30:00'
     ```
   - Iniciar el servidor PostgreSQL.

### Estrategias de restore
- **Pruebas regulares**: Realizar pruebas periódicas de restauración para garantizar que los backups son válidos y funcionales.
- **Automatización**: Implementar scripts automatizados para realizar backups y restauraciones de manera eficiente.
- **Versionado**: Mantener múltiples versiones de backups para protegerse contra errores recientes.
- **Almacenamiento externo**: Guardar copias de seguridad en ubicaciones externas o en la nube para mayor seguridad.

> ¿Qué haces si se borra una tabla en producción?

1. **Identificar el problema**: Determinar qué tabla fue eliminada y confirmar el alcance del problema.
2. **Detener operaciones**: Si es posible, detener las operaciones que puedan afectar la base de datos mientras se realiza la recuperación.
3. **Restaurar desde backup**:
   - Si tienes un backup lógico reciente, utiliza `pg_restore` para restaurar la tabla específica:
     ```bash
     pg_restore -U usuario -d nombre_base_datos -t nombre_tabla backup.dump
     ```
   - Si tienes un backup físico, realiza un PITR para restaurar la base de datos al momento anterior al borrado.
4. **Validar la restauración**: Verificar que la tabla restaurada contiene los datos correctos.
5. **Comunicar y documentar**: Informar a los equipos afectados y documentar el incidente para evitar futuros problemas.
