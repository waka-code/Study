# Roles comunes en IAM

## Roles de instancia EC2
Permiten que una instancia EC2 acceda a servicios AWS sin almacenar claves en la máquina.

## Roles de función Lambda
Permiten que una función Lambda acceda a otros servicios AWS.

## Role para CloudFormation
Permite que CloudFormation cree y gestione recursos en nombre del usuario.

**Ejemplo de política para EC2:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::example-bucket"
    }
  ]
}
```
