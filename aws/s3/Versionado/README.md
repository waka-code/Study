# Versionado

El versionado en Amazon S3 permite mantener múltiples versiones de un objeto en el mismo bucket. Esto es útil para protegerse contra eliminaciones accidentales y recuperar versiones anteriores de un objeto.

## Características
- **Habilitación:**
  - Se puede habilitar o suspender en cualquier momento.
- **Identificación de versiones:**
  - Cada versión de un objeto tiene un ID único.
- **Recuperación:**
  - Permite recuperar versiones anteriores de un objeto.

## Ejemplo de Habilitación con AWS CLI
```sh
aws s3api put-bucket-versioning --bucket my-bucket --versioning-configuration Status=Enabled
```