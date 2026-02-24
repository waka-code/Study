# EC2 Instance Store

El **Instance Store** es un tipo de **almacenamiento temporal** que viene **físicamente conectado al host** donde corre la instancia EC2.

## ¿Qué es EC2 Instance Store?

- Almacenamiento **local y efímero**
- Muy **rápido** (NVMe / SSD)
- **No persistente**
- Se pierde al:
    - Detener (stop) la instancia
    - Terminar (terminate)
    - Fallo del host