
# Políticas de Acceso en Amazon S3

Las **políticas de acceso** en S3 controlan quién puede acceder a los buckets y objetos, y qué acciones pueden realizar. Son esenciales para la seguridad y el control de datos en la nube.

---

## Tipos de políticas en S3

### 1. Políticas de bucket
Se adjuntan directamente a un bucket y definen permisos a nivel de bucket y objetos. Permiten controlar el acceso de usuarios, cuentas externas o públicos.

**Ejemplo: Permitir solo lectura pública a los objetos**
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

### 2. Políticas de usuario/rol (IAM)
Se asignan a usuarios o roles de AWS. Permiten definir permisos granulares sobre uno o varios buckets/objetos.

**Ejemplo: Permitir a un usuario subir y listar objetos en un bucket**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::NOMBRE_DEL_BUCKET",
        "arn:aws:s3:::NOMBRE_DEL_BUCKET/*"
      ]
    }
  ]
}
```

### 3. Listas de control de acceso (ACLs)
Permiten asignar permisos simples a nivel de objeto o bucket (lectura, escritura). Son menos recomendadas porque ofrecen menos control y trazabilidad.

**Ejemplo: Hacer un objeto público usando ACL**
```sh
aws s3api put-object-acl --bucket NOMBRE_DEL_BUCKET --key archivo.txt --acl public-read
```

---

## Componentes clave de una política de bucket
- **Effect**: Permite (Allow) o deniega (Deny) la acción.
- **Principal**: Quién recibe el permiso (usuario, cuenta, "*").
- **Action**: Qué acción se permite o deniega (ej: s3:GetObject, s3:PutObject).
- **Resource**: A qué recurso aplica (bucket u objeto específico).
- **Condition**: (Opcional) Restringe el permiso bajo ciertas condiciones (IP, tiempo, etc).

**Ejemplo con condición (acceso solo desde una IP):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::NOMBRE_DEL_BUCKET/*",
      "Condition": {
        "IpAddress": {"aws:SourceIp": "203.0.113.0/24"}
      }
    }
  ]
}
```

---

## Buenas prácticas para políticas de S3
- Mantén los buckets privados por defecto.
- Usa políticas IAM para control granular y delega acceso solo a quien lo necesita.
- Revisa y audita los permisos regularmente.
- Usa condiciones para restringir acceso por IP, tiempo, VPC, etc.
- Evita el acceso público salvo que sea estrictamente necesario.
- Habilita el registro de acceso (S3 Access Logs, CloudTrail).

---

## Recursos útiles
- [Documentación de políticas de bucket S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html)
- [Referencia de acciones S3](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations.html)
- [Mejores prácticas de seguridad S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

---

## Definición específica: ¿Qué son las políticas de bucket?
Las políticas de bucket son documentos JSON adjuntos a un bucket que definen permisos a nivel de bucket y objetos. Permiten conceder o denegar acciones (lectura, escritura, listado, borrado) a usuarios, cuentas o al público, y pueden incluir condiciones (IP, VPC, TLS, etc.).

Lee el archivo `BucketPolicies.md` para una definición ampliada, ejemplos y buenas prácticas.
