# Amazon ECR (Elastic Container Registry)

Amazon Elastic Container Registry (ECR) es un servicio completamente administrado para almacenar, compartir y desplegar imágenes de contenedores Docker. Es altamente seguro y está diseñado para integrarse con Amazon ECS, AWS Fargate y Amazon EKS.

## Características principales

- **Almacenamiento seguro:**
  - Cifrado en reposo y en tránsito para proteger las imágenes.
- **Integración con otros servicios de AWS:**
  - Funciona de manera nativa con ECS, Fargate y EKS.
- **Escalabilidad:**
  - Maneja automáticamente el almacenamiento y la distribución de imágenes.
- **Control de acceso:**
  - Integración con IAM para gestionar permisos de acceso.
- **Escaneo de vulnerabilidades:**
  - Detecta vulnerabilidades en las imágenes almacenadas.

## Casos de uso

- **Almacenamiento de imágenes:**
  - Almacenar imágenes de contenedores para su uso en ECS, Fargate o EKS.
- **Distribución de imágenes:**
  - Compartir imágenes entre equipos o regiones.
- **Seguridad:**
  - Escanear imágenes en busca de vulnerabilidades antes de su despliegue.

## Ejemplo de configuración

### Crear un repositorio de ECR con AWS CLI
```bash
aws ecr create-repository \
    --repository-name MiRepositorioECR
```

### Autenticarse en ECR
```bash
aws ecr get-login-password \
    --region us-east-1 | docker login --username AWS --password-stdin <account_id>.dkr.ecr.us-east-1.amazonaws.com
```

### Subir una imagen a ECR
```bash
docker tag mi-imagen:latest <account_id>.dkr.ecr.us-east-1.amazonaws.com/mi-repositorio:latest
docker push <account_id>.dkr.ecr.us-east-1.amazonaws.com/mi-repositorio:latest
```

## Buenas prácticas

1. **Seguridad:**
   - Configura políticas de IAM para controlar el acceso a los repositorios.
2. **Escaneo de imágenes:**
   - Habilita el escaneo de vulnerabilidades para garantizar la seguridad de las imágenes.
3. **Optimización de costos:**
   - Elimina imágenes no utilizadas para reducir costos de almacenamiento.
4. **Automatización:**
   - Usa pipelines de CI/CD para automatizar el proceso de construcción y despliegue de imágenes.

## Recursos adicionales

- [Documentación oficial de Amazon ECR](https://docs.aws.amazon.com/ecr/)
- [Guía de inicio rápido](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html)
- [Ejemplos de uso](https://github.com/aws-samples/amazon-ecr-sample)