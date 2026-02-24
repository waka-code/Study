# Bucket

Un bucket en Amazon S3 es el contenedor principal donde se almacenan los objetos (archivos). Cada bucket tiene un nombre único a nivel global y está asociado a una región específica.

## Características
- **Nombre único:**
  - El nombre del bucket debe ser único a nivel global.
- **Región:**
  - Los datos se almacenan en la región seleccionada al crear el bucket.
- **Configuraciones:**
  - Políticas de acceso, versionado, cifrado, entre otros.

## Casos de Uso
- Almacenamiento de datos estructurados y no estructurados.
- Hosting de sitios web estáticos.
- Almacenamiento de copias de seguridad y archivos de registro.

## Ejemplo de Creación con AWS CLI
```sh
aws s3api create-bucket --bucket my-bucket --region us-east-1 --create-bucket-configuration LocationConstraint=us-east-1
```