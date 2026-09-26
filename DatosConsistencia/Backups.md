# Backups y recuperación

## Concepto clave
- Un backup que nunca restauraste **no es un backup**: siempre hay que probar la restauración.
- El objetivo no es "tener respaldos", sino poder **volver a operar** tras un desastre (borrado accidental, corrupción, fallo de hardware).

## RPO y RTO
- **RPO (Recovery Point Objective)**: ¿cuántos datos puedo permitirme perder? Define cada cuánto necesito respaldar.
  - RPO de 5 min → como mucho pierdo los últimos 5 minutos de datos.
- **RTO (Recovery Time Objective)**: ¿cuánto puedo tardar en volver a estar operativo?
  - RTO de 1 hora → el sistema debe estar de vuelta en máximo 1 hora.
- Menor RPO/RTO = más caro y más complejo. Se define según el negocio.

## Tipos de backup
- **Completo (full)**: copia toda la base de datos. Simple pero pesado y lento.
- **Incremental**: solo copia lo que cambió desde el último backup (de cualquier tipo). Ligero pero la restauración encadena varios.
- **Diferencial**: copia lo que cambió desde el último backup **completo**. Punto intermedio.
- **Físico vs. lógico**:
  - **Lógico** (`pg_dump`, `mysqldump`): exporta sentencias SQL. Portable, más lento en bases grandes.
  - **Físico**: copia los archivos de datos directamente. Rápido para bases grandes.

## PITR (Point-In-Time Recovery)
- Permite restaurar la base de datos a **un momento exacto** en el tiempo (ej: "justo antes del DROP TABLE de las 14:32").
- Combina un backup completo base + los **logs de transacciones** (WAL en Postgres, binlog en MySQL) posteriores.
- Es la técnica que salva la carrera cuando alguien ejecuta un borrado catastrófico en producción.

### Ejemplo backup lógico (PostgreSQL)
```bash
# Crear backup
pg_dump -U usuario -d mi_base -F c -f backup.dump

# Restaurar
pg_restore -U usuario -d mi_base_nueva backup.dump
```

### Ejemplo backup lógico (MySQL)
```bash
# Crear backup
mysqldump -u usuario -p mi_base > backup.sql

# Restaurar
mysql -u usuario -p mi_base_nueva < backup.sql
```

## Buenas prácticas
- **Prueba la restauración** periódicamente, no solo la creación del backup.
- Guarda copias **fuera del servidor** (otra región / almacenamiento externo) — regla 3-2-1: 3 copias, 2 medios, 1 fuera del sitio.
- **Automatiza** los backups y **monitorea** que se completen (un backup que falla en silencio es peor que no tenerlo).
- Cifra los backups: contienen todos tus datos sensibles.
