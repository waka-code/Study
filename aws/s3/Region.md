# Región en Amazon S3

La **Región** es la ubicación geográfica donde se almacenan físicamente los datos de un bucket en AWS. Elegir la región adecuada es importante para la latencia, cumplimiento y costos.

## Características
- Cada bucket se crea en una sola región.
- Los datos no se replican automáticamente entre regiones (a menos que configures replicación).
- La región afecta la latencia de acceso y el precio del almacenamiento.

## Buenas prácticas
- Elige la región más cercana a tus usuarios o aplicaciones.
- Considera requisitos legales o de cumplimiento (por ejemplo, datos que deben permanecer en un país específico).
- Usa replicación entre regiones para alta disponibilidad y recuperación ante desastres.

## Ejemplo
- us-east-1 (Norte de Virginia)
- eu-west-1 (Irlanda)
