# Replicación

La replicación en Amazon S3 permite copiar objetos de un bucket a otro de manera automática. Esto es útil para cumplir con requisitos de redundancia, recuperación ante desastres y proximidad geográfica.

## Tipos de Replicación
- **Replicación entre regiones (CRR):**
  - Copia objetos entre buckets en diferentes regiones.
- **Replicación dentro de la misma región (SRR):**
  - Copia objetos entre buckets en la misma región.

## Requisitos
- Ambos buckets deben habilitar el versionado.
- Configurar permisos adecuados para la replicación.

## Ejemplo de Configuración
```json
{
  "Role": "arn:aws:iam::123456789012:role/replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Prefix": "",
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket"
      }
    }
  ]
}
```