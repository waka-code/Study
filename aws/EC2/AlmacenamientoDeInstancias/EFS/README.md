# Amazon EFS (Elastic File System)

**EFS** es un **sistema de archivos administrado**, **elástico** y **compartido**, usado principalmente por **instancias EC2** (y también por otros servicios).

## ¿Qué es EFS?

- Sistema de archivos **tipo NFS**
- **Almacenamiento en archivos** (file storage)
- **Compartido** entre múltiples instancias
- Escala automáticamente (sin aprovisionar tamaño)
- Totalmente administrado por AWS

## Características clave

- **Persistente**
- Acceso concurrente (muchas EC2 al mismo tiempo)
- Montable en múltiples AZ
- Alta disponibilidad
- Crece y reduce automáticamente