# Bucket en Amazon S3

Un **Bucket** es el contenedor principal en Amazon S3 donde se almacenan los objetos (archivos y sus metadatos). Cada bucket tiene un nombre único a nivel global y pertenece a una región específica de AWS.

## Características principales
- **Nombre único**: No puede haber dos buckets con el mismo nombre en todo AWS.
- **Región**: Al crear un bucket, eliges la región donde se almacenarán físicamente los datos.
- **Propósito**: Organizar y aislar datos según aplicaciones, entornos o necesidades.
- **Propiedades configurables**: Versionado, cifrado, políticas de acceso, eventos, ciclo de vida, etc.

## Ejemplo de uso
- Un bucket puede almacenar imágenes, documentos, backups, logs, etc.
- Puedes tener múltiples buckets para separar datos de diferentes proyectos o ambientes.

## Buenas prácticas
- Usa nombres descriptivos y únicos.
- Mantén los buckets privados por defecto.
- Configura políticas de acceso y cifrado según la sensibilidad de los datos.
