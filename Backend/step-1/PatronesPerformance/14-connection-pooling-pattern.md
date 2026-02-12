# Connection Pooling Pattern

Reutiliza conexiones abiertas a recursos (bases de datos, servicios) para evitar el costo de crearlas repetidamente. Mejora el rendimiento y reduce la latencia.

**Ventajas:**
- Reduce el tiempo de conexión.
- Mejora la eficiencia de recursos.

**Trade-off:**
- Puede agotar el pool si hay demasiadas solicitudes.
- Requiere gestión de límites y limpieza.
