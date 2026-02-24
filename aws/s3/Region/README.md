# Región

En Amazon S3, una región es la ubicación geográfica donde se almacenan los datos. Al crear un bucket, se debe seleccionar una región específica para optimizar la latencia y cumplir con requisitos regulatorios.

## Características
- **Latencia:**
  - Elegir una región cercana a los usuarios finales reduce la latencia.
- **Cumplimiento:**
  - Algunas regulaciones requieren que los datos se almacenen en regiones específicas.
- **Costo:**
  - Los costos de almacenamiento y transferencia pueden variar según la región.

## Ejemplo de Creación de Bucket en una Región
```sh
aws s3api create-bucket --bucket my-bucket --region us-west-2 --create-bucket-configuration LocationConstraint=us-west-2
```