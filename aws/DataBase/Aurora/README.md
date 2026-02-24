# Amazon Aurora

Amazon Aurora es un motor de base de datos relacional compatible con MySQL y PostgreSQL, diseñado para ofrecer un rendimiento y disponibilidad superiores a un costo reducido.

## Características principales

- **Alto rendimiento:**
  - Hasta 5 veces más rápido que MySQL.
  - Hasta 3 veces más rápido que PostgreSQL.
- **Alta disponibilidad:**
  - Réplicas distribuidas en 3 AZs.
  - Recuperación automática ante fallos.
- **Escalabilidad:**
  - Escalado automático de almacenamiento hasta 128 TB.
  - Réplicas de lectura con baja latencia.
- **Seguridad:**
  - Cifrado en reposo y en tránsito.
  - Integración con IAM y KMS.

## Casos de uso

- Aplicaciones críticas.
- SaaS (Software as a Service).
- Aplicaciones financieras.
- Juegos en línea.

## Ejemplo de configuración

```bash
aws rds create-db-cluster \
    --db-cluster-identifier myauroracluster \
    --engine aurora-mysql \
    --master-username admin \
    --master-user-password password \
    --backup-retention-period 7
```

## Buenas prácticas

- Usar réplicas de lectura para distribuir la carga.
- Configurar backups automáticos.
- Monitorear métricas con CloudWatch.
- Habilitar Multi-AZ para alta disponibilidad.