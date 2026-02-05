# Políticas de Bucket (Bucket Policies) en Amazon S3

## ¿Qué es una política de bucket?
Una **política de bucket** es un documento JSON que se adjunta a un bucket de S3 y define reglas (permisos) que controlan quién puede realizar qué acciones sobre el bucket y sus objetos. Las políticas de bucket se evalúan junto con las políticas IAM y las ACL, y permiten conceder o denegar acceso a nivel de bucket u objetos.

Las políticas de bucket son útiles para:
- Permitir o denegar acceso a cuentas o usuarios específicos (incluso cuentas externas).
- Hacer públicos ciertos objetos (por ejemplo, contenido estático de un sitio web).
- Restringir accesos por condiciones (direcciones IP, VPC, fecha/hora, TLS, etc.).
- Forzar prácticas de seguridad (por ejemplo, negar peticiones sin cifrado TLS).

---

## Componentes clave de una política
- `Version`: Versión del esquema de la política.
- `Statement`: Lista de declaraciones de permisos.
  - `Effect`: `Allow` o `Deny`.
  - `Principal`: Quién (usuario, cuenta, `*` para cualquiera).
  - `Action`: Acciones permitidas/denegadas (ej.: `s3:GetObject`, `s3:PutObject`, `s3:ListBucket`).
  - `Resource`: ARN(s) del bucket u objetos (`arn:aws:s3:::mi-bucket` o `arn:aws:s3:::mi-bucket/*`).
  - `Condition`: (Opcional) Restricciones adicionales (IP, VPC, `aws:SecureTransport`, etc.).

---

## Ejemplos prácticos

### 1) Lectura pública de objetos (sitio estático)
Permite que cualquiera lea objetos dentro del bucket.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mi-bucket/*"
    }
  ]
}
```
Uso típico: contenido estático (imágenes, CSS, JS) para un sitio web público.

---

### 2) Denegar solicitudes sin TLS (forzar HTTPS)
Evita que se acceda al contenido a través de HTTP no cifrado.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedRequests",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::mi-bucket", "arn:aws:s3:::mi-bucket/*"],
      "Condition": {
        "Bool": {"aws:SecureTransport": "false"}
      }
    }
  ]
}
```

---

### 3) Permitir acceso sólo desde una red (IP/VPC)
Limitación por rango IP.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowFromSpecificIP",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject","s3:ListBucket"],
      "Resource": ["arn:aws:s3:::mi-bucket","arn:aws:s3:::mi-bucket/*"],
      "Condition": {
        "IpAddress": {"aws:SourceIp": "203.0.113.0/24"}
      }
    }
  ]
}
```

---

### 4) Acceso cross-account (otra cuenta AWS)
Conceder permisos a una cuenta AWS diferente.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAccountListAndGet",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
      "Action": ["s3:ListBucket","s3:GetObject"],
      "Resource": ["arn:aws:s3:::mi-bucket","arn:aws:s3:::mi-bucket/*"]
    }
  ]
}
```

---

## Buenas prácticas y recomendaciones
- Mantén los buckets privados por defecto; habilita acceso público solo cuando sea necesario.
- Prefiere políticas IAM y roles sobre ACLs para mayor trazabilidad y control.
- Usa `Deny` explícitos para reforzar reglas críticas (por ejemplo, negar acceso público, forzar TLS).
- Añade condiciones para limitar el alcance (IP, VPC, MFA, `aws:SecureTransport`).
- Habilita registros de acceso (`S3 Access Logs`) y auditoría con `CloudTrail`.
- Prueba y valida políticas con el **IAM Policy Simulator** antes de aplicarlas en producción.
- Revisa periódicamente permisos con **Access Advisor** y el `credential report`.

---

## Aplicación y pruebas
- Consola: Accede a tu bucket > Permissions > Bucket Policy y pega el JSON.
- CLI: `aws s3api put-bucket-policy --bucket mi-bucket --policy file://policy.json`
- Validación: Usa el **IAM Policy Simulator** o intenta acciones reales con un usuario/rol de prueba.

---

## Referencias y recursos
- Más detalles y ejemplos: `PoliticasAcceso.md` en este mismo directorio.
- Documentación oficial: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Herramienta: IAM Policy Simulator (https://policysim.aws.amazon.com)
