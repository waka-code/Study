# Volumen EBS (Elastic Block Store)

**EBS** es un servicio de **almacenamiento en bloques** para **instancias EC2**.

## Características

- Almacenamiento **persistente**
- Funciona como un **disco duro virtual**
- Se adjunta a instancias EC2
- Los datos **no se pierden** al detener la instancia
- Replicado automáticamente dentro de la AZ

## Tipos comunes de volúmenes EBS

| Tipo | Uso |
| --- | --- |
| gp3 / gp2 | Uso general |
| io2 / io1 | Alto IOPS (BD críticas) |
| st1 | HDD optimizado para throughput |
| sc1 | HDD frío |

## Relación con EC2

- Una instancia puede tener **varios volúmenes EBS**
- El **volumen raíz** (root) suele ser EBS
- EBS **vive en una AZ específica**
- Se puede **desconectar y adjuntar** a otra instancia (misma AZ)

## Borrar al terminar (Delete on Termination)

### ✔️ Activado (`true`)

- El volumen **se borra** al eliminar la instancia
- Común en:
    - Volumen raíz
    - Entornos temporales (dev, test)

### ❌ Desactivado (`false`)

- El volumen **permanece**
- Útil para:
    - Datos importantes
    - Backups
    - Recuperación manual

## Buenas prácticas

- Verifica **Delete on Termination** antes de borrar instancias
- Usa **snapshots** para respaldo
- Mantén etiquetas (tags) para identificar volúmenes huérfanos
- No confundir **detener (stop)** con **terminar (terminate)**:
    - Stop → **no borra** EBS
    - Terminate → **puede borrar** EBS