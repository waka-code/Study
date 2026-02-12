# Rate Limiting Pattern

Restringe el número de solicitudes permitidas en un periodo de tiempo para proteger el rendimiento y evitar abusos. Común en APIs públicas.

**Ventajas:**
- Previene ataques de denegación de servicio.
- Protege recursos críticos.

**Trade-off:**
- Puede afectar usuarios legítimos en picos de tráfico.
- Requiere gestión de límites y excepciones.
