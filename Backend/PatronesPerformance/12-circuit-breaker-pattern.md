# Circuit Breaker Pattern

Previene llamadas repetidas a servicios fallidos, protegiendo recursos y permitiendo recuperación. Se abre el circuito tras varios fallos, bloqueando nuevas llamadas temporalmente.

**Ventajas:**
- Evita degradación del sistema.
- Permite recuperación controlada.

**Trade-off:**
- Puede bloquear servicios legítimos temporalmente.
- Requiere monitoreo y ajuste de parámetros.
