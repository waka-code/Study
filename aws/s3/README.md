# Amazon S3 (Simple Storage Service)

Amazon S3 es un servicio de almacenamiento de objetos en la nube de AWS. Permite almacenar y recuperar cualquier cantidad de datos desde cualquier lugar en la web.

## Conceptos Clave
- **Bucket**: Contenedor principal donde se almacenan los objetos (archivos).
- **Objeto**: Archivo y metadatos asociados.
- **Clave (Key)**: Nombre único de cada objeto dentro de un bucket.
- **Región**: Ubicación geográfica donde se almacena el bucket.
- **Políticas de acceso**: Controlan quién puede acceder a los buckets y objetos.

## Pasos para Configurar un Bucket S3

1. **Crear una cuenta en AWS**
2. **Acceder a la consola de AWS**
3. **Ir a S3 y crear un bucket**
   - Elegir un nombre único globalmente
   - Seleccionar la región
   - Configurar opciones de acceso (público/privado)
   - Habilitar/deshabilitar versiones
   - Configurar cifrado si es necesario
4. **Subir objetos (archivos)**
5. **Configurar políticas de acceso**
   - Usar políticas de bucket o políticas IAM
6. **Opcional: Configurar eventos, replicación, ciclo de vida, etc.**

## Buenas Prácticas
- Mantener los buckets privados por defecto
- Usar roles y políticas IAM para acceso seguro
- Habilitar el versionado para recuperación ante borrados accidentales
- Configurar el cifrado en reposo y en tránsito
- Usar políticas de ciclo de vida para gestionar el almacenamiento y costos

## Ejemplo de Política de Bucket (Solo lectura pública)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::NOMBRE_DEL_BUCKET/*"
    }
  ]
}
```

## CLI Básico
- Crear bucket:
  ```sh
  aws s3 mb s3://mi-bucket --region us-east-1
  ```
- Subir archivo:
  ```sh
  aws s3 cp archivo.txt s3://mi-bucket/
  ```
- Listar objetos:
  ```sh
  aws s3 ls s3://mi-bucket/
  ```

## Recursos útiles
- [Documentación oficial S3](https://docs.aws.amazon.com/s3/index.html)
- [Políticas de bucket S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html)
- [AWS CLI S3](https://docs.aws.amazon.com/cli/latest/reference/s3/index.html)
