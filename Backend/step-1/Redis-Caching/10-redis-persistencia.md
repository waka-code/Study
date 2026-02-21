# Persistencia y Backup en Redis

## Introducción
Redis ofrece opciones de persistencia para garantizar que los datos no se pierdan en caso de fallos.

## Métodos de Persistencia
1. **RDB (Redis Database Backup)**:
   - Crea snapshots periódicos de los datos.
   - **Ventajas**: Rápido para backups completos.
   - **Desventajas**: Puede perder datos recientes entre snapshots.

2. **AOF (Append-Only File)**:
   - Registra cada operación de escritura en un archivo de log.
   - **Ventajas**: Menor pérdida de datos.
   - **Desventajas**: Mayor uso de disco y CPU.

## Configuración Básica
```bash
# Habilitar RDB
save 60 1000

# Habilitar AOF
appendonly yes
appendfsync everysec
```

## Backup y Restauración
- **Backup**:
  ```bash
  cp dump.rdb /ruta/backup/
  cp appendonly.aof /ruta/backup/
  ```
- **Restauración**:
  ```bash
  cp /ruta/backup/dump.rdb /data/
  cp /ruta/backup/appendonly.aof /data/
  ```

## Casos de Uso
- **RDB**: Backups periódicos en sistemas donde la pérdida de datos recientes es aceptable.
- **AOF**: Sistemas que requieren alta durabilidad y mínima pérdida de datos.