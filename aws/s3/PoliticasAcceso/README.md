# Políticas de Acceso

Las políticas de acceso en Amazon S3 permiten controlar quién puede acceder a los recursos dentro de un bucket. Estas políticas pueden aplicarse a nivel de bucket o de objeto.

## Tipos de Políticas
- **Políticas de bucket:**
  - Controlan el acceso a todos los objetos dentro de un bucket.
- **Políticas IAM:**
  - Controlan el acceso basado en roles y usuarios.
- **Listas de control de acceso (ACLs):**
  - Permiten definir permisos a nivel de objeto.

## Ejemplo de Política
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-bucket/*"
    }
  ]
}
```