# AWS Backup

AWS Backup es un servicio completamente administrado que facilita la centralización y automatización de copias de seguridad (backups) para los servicios de AWS y recursos on‑premises compatibles. Proporciona políticas de protección, retención y restauración unificadas para cumplir requisitos de recuperación ante desastres y cumplimiento.

## Caracterización del servicio

- **Centralización:** Gestiona copias de seguridad para RDS, EFS, DynamoDB, EC2 (volúmenes EBS), Storage Gateway, FSx y otros desde un único lugar.
- **Políticas basadas en planes de backup:** Define planes con ventanas de backup, reglas de retención y ciclos de copia (incluyendo copias a otra región).
- **Automatización:** Automatiza la programación, transición y expiración de backups.
- **Restauración:** Restauración granular (por ejemplo, restaurar una tabla DynamoDB o un volumen EBS) y restauración completa.
- **Criptografía y seguridad:** Soporta cifrado con claves gestionadas por AWS KMS, control de acceso con IAM y registro de eventos con CloudTrail.
- **Conformidad y auditoría:** Genera artefactos necesarios para auditoría y cumplimiento (reportes, logs y políticas de retención).

## Casos de uso

- **Cumplimiento normativo:** Mantener retención de datos por periodos regulatorios y evidencias de backup.
- **Recuperación ante desastres (DR):** Replica backups entre regiones para escenarios de failover regional.
- **Operaciones gestionadas:** Automatizar backups de bases de datos y volúmenes EBS sin scripts ad-hoc.
- **Conservación de snapshots históricos:** Conservar snapshots periódicos durante meses o años según políticas.

## Componentes clave

- **Vault (Bóveda):** Contenedor lógico para almacenar backups; permite configurar claves KMS específicas.
- **Backup plan (Plan de backup):** Define reglas (frecuencia, ventanas, retención, copias a regiones/archivos fríos).
- **Backup rule (Regla):** Parte del plan que especifica schedule y lifecycle.
- **Backup vault lock:** Mecanismo para proteger datos de borrado (retención inmutable durante un periodo fijo).
- **Backup selection (Selección de recursos):** Grupos de recursos a los que aplica un plan (por tags o ARNs).

## Ejemplos prácticos (AWS CLI)

### 1) Crear un vault de backup
```bash
aws backup create-backup-vault \
  --backup-vault-name MiBackupVault \
  --encryption-key arn:aws:kms:us-east-1:123456789012:key/abcd-efgh-ijkl
```

### 2) Crear un plan de backup (JSON de ejemplo)
```bash
cat > plan-backup.json <<EOF
{
  "BackupPlanName": "PlanDiarioRetencion90",
  "Rules": [
    {
      "RuleName": "Diario",
      "TargetBackupVaultName": "MiBackupVault",
      "ScheduleExpression": "cron(0 5 ? * * *)", # todos los días a las 05:00 UTC
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 180,
      "Lifecycle": {
        "DeleteAfterDays": 90,
        "MoveToColdStorageAfterDays": 30
      }
    }
  ]
}
EOF

aws backup create-backup-plan --backup-plan file://plan-backup.json
```

### 3) Asociar recursos por tags (selección de backup)
```bash
# Suponiendo que tienes el backupPlanId obtenido anteriormente
aws backup create-backup-selection \
  --backup-plan-id <backupPlanId> \
  --backup-selection '{"SelectionName":"SeleccionPorTag","IamRoleArn":"arn:aws:iam::123456789012:role/AWSBackupDefaultServiceRole","Resources":[],"ListOfTags":[{"ConditionType":"STRINGEQUALS","ConditionKey":"backup","ConditionValue":"true"}]}'
```

### 4) Iniciar un backup on-demand (ejecución inmediata)
```bash
aws backup start-backup-job \
  --backup-vault-name MiBackupVault \
  --resource-arn arn:aws:ec2:us-east-1:123456789012:volume/vol-0abcd1234efgh5678 \
  --iam-role-arn arn:aws:iam::123456789012:role/AWSBackupDefaultServiceRole
```

### 5) Restaurar un volumen EBS desde un recovery point
```bash
aws backup start-restore-job \
  --recovery-point-arn arn:aws:backup:us-east-1:123456789012:recovery-point:rp-0123456789abcdef0 \
  --metadata '{"resourceType":"EBS","restoreToInstanceId":"i-0123456789abcdef0"}' \
  --iam-role-arn arn:aws:iam::123456789012:role/AWSBackupDefaultServiceRole
```

## Buenas prácticas

- **Usar tags consistentes:** Etiqueta recursos con claves como `backup=true` y `backup:retention=90` para automatizar selección y retención.
- **Proteger vaults sensibles con KMS:** Usa claves KMS dedicadas con políticas estrictas y rotación periódica.
- **Hacer pruebas periódicas de restauración:** Simula DR y valida procesos de restauración (RTO/RPO).
- **Copia entre regiones:** Para resiliencia regional, configura copias automáticas a otra región.
- **Usar vault lock para datos inmutables:** Cuando necesites WORM o cumplimiento que impida borrado.
- **Control de costes:** Define lifecycle para mover backups a cold storage y eliminar backups antiguos.
- **Auditoría:** Habilita CloudTrail para registrar operaciones de Backup y Restore.

## Limitaciones y consideraciones

- **Cobertura de recursos:** No todos los servicios/recursos de AWS pueden estar soportados directamente por AWS Backup; verificar lista de integraciones.
- **Límites de throughput:** Restauraciones masivas simultáneas pueden requerir planificación y throttling.
- **Coste:** El almacenamiento de backups y transferencias entre regiones generan costos; planificar lifecycle para optimizar gastos.
- **Dependencias de roles:** AWS Backup requiere roles y permisos IAM correctamente configurados para operar.

## Integración con otros servicios

- **AWS Backup + AWS Organizations:** Centraliza la gestión de backups en cuentas de una organización.
- **AWS Backup + AWS Storage Gateway:** Backup de volúmenes on‑premises expuestos por Storage Gateway.
- **AWS Backup + RDS, EFS, DynamoDB, FSx, EC2 (EBS):** Cobertura integrada para estos servicios.
- **AWS Backup + CloudWatch/CloudTrail:** Monitorización y auditoría de operaciones.

## Recursos adicionales

- Documentación oficial: https://docs.aws.amazon.com/backup/
- Guía de inicio rápido: https://docs.aws.amazon.com/backup/latest/devguide/what-is-aws-backup.html
- Ejemplos y SDKs: https://github.com/aws-samples

---

Ruta del archivo: `/Users/waddini/Study/aws/OtherServices/Backup/README.md`
