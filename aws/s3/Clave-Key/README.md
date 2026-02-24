# Clave (Key)

En Amazon S3, una clave (key) es el identificador único de un objeto dentro de un bucket. Cada objeto en un bucket se identifica de manera única mediante la combinación del nombre del bucket y su clave.

## Características
- **Identificador único:**
  - Cada objeto tiene una clave única dentro de un bucket.
- **Jerarquía simulada:**
  - Las claves pueden incluir prefijos para simular una estructura de carpetas.

## Ejemplo
- Bucket: `my-bucket`
- Clave: `fotos/vacaciones/imagen1.jpg`

El objeto estará disponible en la ruta: `s3://my-bucket/fotos/vacaciones/imagen1.jpg`