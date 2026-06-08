# AWS DataSync

AWS DataSync es un servicio administrado que automatiza y acelera la transferencia de datos entre sistemas on‑premises y servicios de AWS (S3, EFS, FSx), o entre servicios de AWS, de forma segura y eficiente.

## Características principales

- **Transferencia rápida y escalable:** Diseñado para mover grandes volúmenes de datos con optimizaciones y paralelización.
- **Agentes ligeros para on‑premises:** DataSync usa un agente que se despliega on‑premises (VM) para conectarse a NFS/SMB y mover datos hacia/desde AWS.
- **Soporte de múltiples destinos/orígenes:** Amazon S3, Amazon EFS, Amazon FSx for Windows File Server, Amazon FSx for Lustre, y ubicaciones NFS/SMB on‑prem.
- **Validación de integridad:** Verificación por checksum durante la transferencia para asegurar la integridad de los datos.
- **Filtrado y opciones de metadata:** Incluye/excluye objetos por patrones y preserva permisos, timestamps y atributos POSIX cuando corresponde.
- **Programación y ejecución ad‑hoc:** Tareas (tasks) que se pueden ejecutar manualmente, programar o integrar con workflows de CI/CD.
- **Limitación de ancho de banda:** Control de throughput para no saturar enlaces de red.
- **Monitoreo y logs:** Integración con CloudWatch y CloudTrail para métricas, logs y auditoría.

## Casos de uso

- Migración masiva de datos on‑premises a S3/EFS/FSx.
- Replicación periódica o sincronización bidireccional de archivos.
- Transferencia de datos de aplicaciones HPC (FSx for Lustre) hacia S3.
- Archiving y consolidación de datos en S3/Glacier.
- Backup y recuperación de volúmenes de archivos.

## Componentes clave

- **Agent:** VM que se despliega on‑premises (VMware, Hyper‑V, KVM) o en entorno edge para acceder a NFS/SMB.
- **Location:** Fuente o destino (arn) que indica dónde leer o escribir datos (S3 bucket, EFS, FSx, NFS, SMB).
- **Task:** Configuración que conecta una `source location` con una `destination location` con reglas de transferencia, filtros y opciones.
- **Task execution:** Instancia de ejecución de una task; produce métricas, logs y puntos de fallo.

## Flujo básico de trabajo

1. Desplegar agente DataSync on‑premises y activarlo en AWS.
2. Crear `Location` para origen y destino (S3/EFS/NFS/SMB/FSx).
3. Crear `Task` que defina reglas, filtros y opciones de metadata.
4. Ejecutar `Task execution` (manual o programado).
5. Monitorizar la ejecución via CloudWatch y revisar logs en caso de errores.

## Ejemplos prácticos (AWS CLI)

### 1) Desplegar y activar agente (resumen)
- Descarga/instala la OVA/VM del agente desde la consola DataSync.
- Inicia la máquina virtual y obtén la IP local.
- En AWS CLI: registrar el agente (ejemplo):
```bash
aws datasync activate-agent \
  --activation-key <activation-key-from-agent-web-ui> \
  --agent-name MiAgenteOnPrem \
  --region us-east-1
```

### 2) Crear una location S3 (destino)
```bash
aws datasync create-location-s3 \
  --s3-bucket-arn arn:aws:s3:::mi-bucket-datasync \
  --s3-config "{\"BucketAccessRoleArn\":\"arn:aws:iam::123456789012:role/DataSyncS3Role\"}" \
  --subdirectory "/datos"
```

### 3) Crear una location NFS (origen on‑prem)
```bash
aws datasync create-location-nfs \
  --server-hostname 10.0.0.10 \
  --on-prem-config "{\"AgentArns\":[\"arn:aws:datasync:us-east-1:123456789012:agent/agent-0123456789abcdef0\"]}" \
  --subdirectory "/export/data"
```

### 4) Crear task entre NFS → S3
```bash
aws datasync create-task \
  --source-location-arn arn:aws:datasync:us-east-1:123456789012:location/loc-0123456789abcdef0 \
  --destination-location-arn arn:aws:datasync:us-east-1:123456789012:location/loc-0fedcba9876543210 \
  --name "NFS-to-S3" \
  --options "{\"VerifyMode\":\"POINT_IN_TIME_CONSISTENT\",\"OverwriteMode\":\"ALWAYS\",\"PosixPermissions\":\"PRESERVE\"}"
```

### 5) Iniciar ejecución del task
```bash
aws datasync start-task-execution \
  --task-arn arn:aws:datasync:us-east-1:123456789012:task/task-0123456789abcdef0
```

### 6) Consultar estado de la ejecución
```bash
aws datasync describe-task-execution \
  --task-execution-arn arn:aws:datasync:us-east-1:123456789012:taskexecution/exec-0123456789abcdef0
```

### 7) Ejemplo: limitar ancho de banda (durante la creación de task)
En `Options` usar `BytesPerSecond`:
```bash
aws datasync create-task \
  --source-location-arn <src> \
  --destination-location-arn <dst> \
  --options "{\"BytesPerSecond\": 10485760}"  # ~10 MB/s
```

## Opciones y filtros relevantes

- **Include/Exclude patterns:** Permiten incluir o excluir archivos/dirs por expresiones (globs).
- **Preservación de metadata:** POSIX permissions, ownership, timestamps.
- **OverwriteMode:** `ALWAYS` o `NEVER` para controlar sobrescritura.
- **VerifyMode:** `POINT_IN_TIME_CONSISTENT` o `ONLY_FILES_TRANSFERRED` para verificación de integridad.
- **Task settings:** `BytesPerSecond`, `TransferMode` (CHANGED, ALL), `Atime`, `Mtime`.

## Monitorización y depuración

- **CloudWatch Metrics:** `BytesTransferred`, `FilesTransferred`, `Errors`.
- **CloudWatch Logs:** Detalles por tarea y ejecución.
- **CloudTrail:** Auditoría de operaciones administrativas.
- **Errores comunes:** Problemas de permisos (IAM role S3), conectividad entre agente y AWS, paths incorrectos en subdirectory.

## Buenas prácticas

- **Probar en pequeño:** Validar task con subset de datos antes de migración masiva.
- **Roles IAM mínimos:** Crear role específico para DataSync con permisos limitados (principio de menor privilegio).
- **Uso de Include/Exclude:** Evitar mover archivos temporales o grandes binarios innecesarios.
- **Límites de throughput:** Configurar `BytesPerSecond` para no saturar enlaces WAN.
- **Automatizar y versionar tasks:** Mantener definiciones de task en IaC (CloudFormation/CDK) cuando sea posible.
- **Verificación de integridad:** Habilitar `VerifyMode` apropiado para asegurar consistencia.
- **Backup pre‑migración:** Mantener snapshots/backups antes de operaciones destructivas.

## Limitaciones y consideraciones

- **Agente on‑premises:** Requiere despliegue de VM/agent on‑prem que debe mantenerse actualizado.
- **Coste:** Coste por GB transferido + almacenamiento del destino (S3/EFS/FSx).
- **Protocolos soportados:** NFS, SMB for source; para destinos S3, EFS, FSx.
- **No es un reemplazo completo de soluciones de sincronización bidireccional compleja:** Para escenarios muy complejos de sincronización bidireccional, evalúa arquitectura a medida.

## Integración con otros servicios AWS

- **Amazon S3 / S3 Glacier:** Destinos para archivado y análisis.
- **Amazon EFS / FSx:** Movilidad de archivos entre sistemas de archivos.
- **AWS Lambda / Step Functions:** Orquestación post‑transfer (procesado de datos, notificaciones).
- **AWS CloudWatch / CloudTrail:** Observabilidad y auditoría.
- **AWS Batch / Glue:** Procesar datos movidos a S3 para ETL o análisis.

## Recursos adicionales

- Documentación oficial: https://docs.aws.amazon.com/datasync/
- Guía de inicio rápido: https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html
- Ejemplos y scripts: https://github.com/aws-samples

---

Ruta del archivo: `/Users/waddini/Study/aws/OtherServices/DataSync/README.md`
