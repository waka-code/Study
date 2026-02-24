# 1️⃣ Arquitectura y patrón (CLAVE)

Sequelize implementa **Active Record**.

## Implicaciones
- El modelo conoce la estructura de la tabla y ejecuta queries.
- La lógica de negocio **NO debe vivir en el modelo**.

> Si metes lógica compleja en el modelo, rompes mantenibilidad.
