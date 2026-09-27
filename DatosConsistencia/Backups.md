# Backups y recuperación

## Concepto clave
- Un backup que nunca restauraste **no es un backup**: siempre hay que probar la restauración.
- El objetivo no es "tener respaldos", sino poder **volver a operar** tras un desastre (borrado accidental, corrupción, ransomware, fallo de región).
- **Una réplica NO es un backup**: un `DROP TABLE` o un `UPDATE` sin `WHERE` se replica en milisegundos a todas las réplicas. La replicación protege contra fallos de hardware; el backup protege contra errores humanos y corrupción lógica.

## RPO y RTO
- **RPO (Recovery Point Objective)**: ¿cuántos datos puedo permitirme perder? Define cada cuánto necesito respaldar.
  - RPO de 5 min → como mucho pierdo los últimos 5 minutos de datos.
- **RTO (Recovery Time Objective)**: ¿cuánto puedo tardar en volver a estar operativo?
  - RTO de 1 hora → el sistema debe estar de vuelta en máximo 1 hora.
- Menor RPO/RTO = más caro y más complejo. Se define **con el negocio**, no lo decide ingeniería sola.

| Estrategia | RPO típico | RTO típico |
|---|---|---|
| `pg_dump` nocturno | hasta 24 h | horas |
| Backup físico + archivo de WAL (PITR) | segundos–minutos | minutos–horas (según tamaño) |
| Réplica síncrona + failover automático | ~0 (fallo de hardware) | segundos–minutos |
| Multi-región activa | ~0 | segundos |

> Ojo: el RTO real incluye **detectar** el problema, **decidir** restaurar, restaurar, reproducir WAL, validar y redirigir tráfico. Restaurar 2 TB puede tomar horas: mídelo.

## Tipos de backup
- **Completo (full)**: copia toda la base de datos. Simple pero pesado y lento.
- **Incremental**: solo lo que cambió desde el último backup (de cualquier tipo). Ligero pero la restauración encadena varios.
- **Diferencial**: lo que cambió desde el último backup **completo**. Punto intermedio.
- **Lógico** (`pg_dump`, `mysqldump`): exporta esquema + datos como SQL o formato propio.
  - ✅ Portable entre versiones y plataformas, permite restaurar una sola tabla.
  - ❌ Lento en bases grandes, no permite PITR, la restauración reconstruye índices (lento).
- **Físico** (`pg_basebackup`, pgBackRest, Barman, Percona XtraBackup, snapshots de disco): copia los archivos de datos.
  - ✅ Rápido para bases grandes, base para PITR.
  - ❌ Misma versión mayor del motor, restaura toda la instancia.
- **Snapshots de almacenamiento** (EBS, RDS): instantáneos y baratos; en RDS los backups automáticos + logs de transacciones dan PITR hasta el segundo dentro del período de retención.

## PITR (Point-In-Time Recovery)
- Restaurar la BD a **un momento exacto** (ej: "justo antes del `DROP TABLE` de las 14:32").
- Combina un backup físico base + los **logs de transacciones** posteriores (WAL en Postgres, binlog en MySQL) que se reproducen hasta el instante objetivo.
- Requiere **archivado continuo** del WAL (`archive_mode`, `archive_command` o pgBackRest/WAL-G hacia S3).

```ini
# postgresql.conf (restauración con PITR, PG12+)
restore_command = 'pgbackrest --stanza=main archive-get %f "%p"'
recovery_target_time = '2026-09-26 14:31:00-03'
recovery_target_action = 'promote'
# + crear el archivo vacío recovery.signal en el directorio de datos
```

### Ejemplo backup lógico (PostgreSQL)
```bash
# Crear backup en formato custom (comprimido, permite restauración selectiva y paralela)
pg_dump -U usuario -d mi_base -F c -f backup.dump

# Restaurar en paralelo con 4 jobs
pg_restore -U usuario -d mi_base_nueva -j 4 backup.dump

# Restaurar solo una tabla
pg_restore -U usuario -d mi_base_nueva -t pedidos backup.dump
```

### Ejemplo backup lógico (MySQL)
```bash
# --single-transaction: snapshot consistente en InnoDB sin bloquear tablas
mysqldump -u usuario -p --single-transaction --routines mi_base > backup.sql
mysql -u usuario -p mi_base_nueva < backup.sql
```

## Recuperación ante errores humanos sin restaurar todo
- Restaurar la instancia completa a otro servidor en el punto en el tiempo y **copiar solo las filas afectadas** de vuelta a producción (evita perder los cambios legítimos posteriores).
- **Réplica diferida** (`recovery_min_apply_delay = '1h'` en Postgres): una réplica que aplica cambios con 1 h de retraso te da una ventana para rescatar datos borrados.
- Para datos críticos: auditoría/historial (tablas de historial, event sourcing) permite reconstruir sin restaurar.

## Buenas prácticas
- **Prueba la restauración** periódicamente (idealmente automatizada: restaurar cada semana en un entorno aislado y correr validaciones como conteos o checksums).
- Regla **3-2-1**: 3 copias, 2 medios distintos, 1 fuera del sitio (otra región/cuenta).
- Backups en **otra cuenta** con permisos separados e **inmutables** (S3 Object Lock / AWS Backup Vault Lock): protege contra ransomware y contra una credencial comprometida que borre también los backups.
- **Automatiza** y **monitorea** (alerta si el último backup exitoso tiene más de X horas o si el archivado de WAL se atrasa).
- **Cifra** los backups y controla quién puede restaurarlos: contienen todos tus datos sensibles.
- Define **retención** según negocio y regulación (ej: 7 días de PITR + mensuales por 1 año).
- Documenta un **runbook** de restauración; en un incidente nadie debería improvisar.

## Preguntas de entrevista
- **¿Por qué una réplica no reemplaza un backup?** Replica también los errores lógicos (DELETE accidental, corrupción por bug de la app). Protege contra fallo de hardware, no contra errores humanos.
- **Alguien borró una tabla a las 14:32. ¿Qué haces?** Detener escrituras relacionadas si es posible, restaurar con PITR a las 14:31 en una instancia **aparte**, extraer la tabla y reinsertarla en producción; así no se pierden cambios posteriores de otras tablas.
- **Diferencia entre RPO y RTO.** RPO = cuántos datos puedo perder (frecuencia de backup/replicación); RTO = cuánto tiempo puedo estar caído (velocidad de restauración y failover).
- **¿Backup lógico o físico para una BD de 3 TB?** Físico + WAL archiving: el lógico sería lento de generar y muchísimo más lento de restaurar (reconstruir índices), y no da PITR.
- **¿Cómo sabes que tus backups funcionan?** Restauraciones automáticas periódicas con validación y midiendo el tiempo real (valida el RTO).
- **¿Cómo te proteges de ransomware o de una cuenta comprometida?** Copias en otra cuenta, inmutables (Object Lock), con credenciales separadas y cifradas.

## Errores comunes
- Nunca haber probado una restauración, o descubrir en el incidente que el RTO real es 10× el esperado.
- Backups en el mismo servidor, disco o cuenta que la BD.
- Backup fallando en silencio durante semanas por falta de alertas.
- Confiar en `pg_dump` como única estrategia en bases grandes.
- Retención de WAL insuficiente: el backup base existe pero faltan segmentos para llegar al punto deseado.
