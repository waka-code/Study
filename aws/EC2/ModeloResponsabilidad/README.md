# Modelo de Responsabilidad Compartida para EC2

El modelo de responsabilidad compartida de AWS define las responsabilidades de AWS y del cliente para garantizar la seguridad y el cumplimiento en la nube.

## Responsabilidades de AWS
- **Infraestructura:**
  - Seguridad física de los centros de datos.
  - Redundancia y disponibilidad.
- **Servicios Gestionados:**
  - Seguridad del hardware y software subyacente.

## Responsabilidades del Cliente
- **Configuración de Instancias:**
  - Elegir tipos de instancia adecuados.
  - Configurar grupos de seguridad y NACLs.
- **Gestión de Datos:**
  - Cifrado de datos en reposo y en tránsito.
  - Respaldo y recuperación de datos.

## Buenas Prácticas
- Usar IAM para controlar el acceso.
- Habilitar monitoreo con CloudWatch.
- Configurar backups automáticos.