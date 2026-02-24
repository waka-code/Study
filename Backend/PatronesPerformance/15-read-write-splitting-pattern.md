# Read/Write Splitting Pattern

Separa operaciones de lectura y escritura, permitiendo escalar cada una de forma independiente. Usado en bases de datos con réplicas.

**Ventajas:**
- Mejora la escalabilidad y rendimiento.
- Permite balanceo de carga.

**Trade-off:**
- Puede causar inconsistencia temporal.
- Requiere lógica de sincronización.
