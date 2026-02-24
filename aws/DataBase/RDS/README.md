# Amazon RDS (Relational Database Service)

Amazon RDS es un servicio administrado de bases de datos relacionales que facilita la configuración, operación y escalado de bases de datos en la nube. Es compatible con varios motores de bases de datos populares.

## Características principales

- **Compatibilidad con múltiples motores:**
  - Amazon Aurora
  - PostgreSQL
  - MySQL
  - MariaDB
  - Oracle
  - SQL Server
- **Automatización:**
  - Backups automáticos.
  - Actualizaciones de software.
  - Escalado de almacenamiento.
- **Alta disponibilidad:**
  - Implementación Multi-AZ.
  - Réplicas de lectura.
- **Seguridad:**
  - Integración con IAM.
  - Cifrado en reposo y en tránsito.

## Casos de uso

- Aplicaciones empresariales.
- E-commerce.
- Aplicaciones móviles y web.
- Análisis de datos.

## Ejemplo de configuración

```bash
aws rds create-db-instance \
    --db-instance-identifier mydbinstance \
    --db-instance-class db.t3.micro \
    --engine mysql \
    --allocated-storage 20 \
    --master-username admin \
    --master-user-password password \
    --backup-retention-period 7
```

## Buenas prácticas

- Configurar backups automáticos.
- Usar Multi-AZ para alta disponibilidad.
- Monitorear métricas con CloudWatch.
- Aplicar actualizaciones de seguridad regularmente.