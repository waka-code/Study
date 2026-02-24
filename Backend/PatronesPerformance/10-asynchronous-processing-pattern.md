# Asynchronous Processing Pattern

Permite ejecutar tareas en segundo plano, liberando el hilo principal y mejorando la capacidad de respuesta. Usado en procesamiento de archivos, envío de emails, etc.

**Ventajas:**
- Evita bloqueos y mejora la escalabilidad.
- Permite manejar tareas largas sin afectar la UI.

**Trade-off:**
- Complejidad en la gestión de concurrencia.
- Requiere manejo de errores y sincronización.
