# Bucket Policies

Las políticas de bucket en Amazon S3 permiten definir reglas para controlar el acceso a los recursos dentro de un bucket. Estas políticas se escriben en formato JSON y pueden incluir condiciones específicas.

## Características
- **Control de acceso:**
  - Permite definir quién puede acceder a los objetos dentro del bucket.
- **Condiciones:**
  - Basadas en IP, usuario, tiempo, entre otros.
- **Integración:**
  - Funciona junto con las políticas IAM y las ACLs.

## Ejemplo de Política
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
```