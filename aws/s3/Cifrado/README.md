# Cifrado en Amazon S3

Amazon S3 ofrece múltiples opciones de cifrado para proteger los datos almacenados en la nube. Estas opciones aseguran que los datos estén protegidos tanto en reposo como en tránsito.

## Tipos de Cifrado

### 1. Cifrado en Reposo
El cifrado en reposo protege los datos almacenados en S3 mediante el uso de claves de cifrado. Amazon S3 soporta las siguientes opciones:

- **SSE-S3 (Server-Side Encryption con claves gestionadas por S3):**
  - Amazon S3 gestiona automáticamente las claves de cifrado.
  - Los datos se cifran con AES-256.

- **SSE-KMS (Server-Side Encryption con AWS Key Management Service):**
  - Permite un control más granular sobre las claves de cifrado.
  - Integra con AWS KMS para gestionar y auditar el uso de claves.

- **SSE-C (Server-Side Encryption con claves proporcionadas por el cliente):**
  - El cliente proporciona las claves de cifrado.
  - Amazon S3 no almacena las claves proporcionadas.

- **Cifrado del lado del cliente (Client-Side Encryption):**
  - Los datos se cifran antes de ser enviados a S3.
  - El cliente gestiona las claves y el proceso de cifrado.

### 2. Cifrado en Tránsito
El cifrado en tránsito protege los datos mientras se transfieren entre el cliente y Amazon S3. Esto se logra mediante:

- **SSL/TLS:**
  - Asegura que los datos estén protegidos durante la transferencia.

## Configuración de Cifrado

### Habilitar SSE-S3
```sh
aws s3api put-bucket-encryption \
  --bucket my-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

### Habilitar SSE-KMS
```sh
aws s3api put-bucket-encryption \
  --bucket my-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "<kms-key-id>"
        }
      }
    ]
  }'
```

## Buenas Prácticas
- Habilitar el cifrado en reposo para todos los buckets.
- Usar SSE-KMS para un control más granular y auditorías.
- Asegurar que las transferencias de datos usen SSL/TLS.
- Rotar las claves de cifrado regularmente.

## Casos de Uso
- Cumplimiento de normativas como GDPR, HIPAA, PCI DSS.
- Protección de datos sensibles o confidenciales.
- Prevención de accesos no autorizados a datos almacenados.

Con estas opciones, Amazon S3 proporciona un conjunto robusto de herramientas para garantizar la seguridad de los datos en la nube.