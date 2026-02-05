# Objeto en Amazon S3

Un **Objeto** es la unidad básica de almacenamiento en S3. Cada objeto está compuesto por:
- **Datos**: El archivo en sí (imagen, documento, video, etc.).
- **Metadatos**: Información adicional sobre el archivo (tipo de contenido, fecha de creación, etiquetas personalizadas, etc.).
- **Clave (Key)**: El nombre único que identifica al objeto dentro del bucket.

## Características
- Los objetos pueden tener cualquier tamaño (desde bytes hasta terabytes).
- Puedes definir metadatos personalizados para cada objeto.
- Los objetos pueden ser versionados si el bucket tiene versionado habilitado.

## Ejemplo de uso
- Subir una foto como objeto a un bucket.
- Descargar un objeto usando su clave.
- Asignar metadatos para clasificar archivos.
