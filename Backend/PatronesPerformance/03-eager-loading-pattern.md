# Eager Loading Pattern

Carga anticipada de datos relacionados para evitar múltiples accesos repetidos. Utilizado en ORMs para traer datos asociados en una sola consulta.

**Ventajas:**
- Reduce el número de consultas.
- Evita el problema [N+1](30-n-plus-1.md).

**Trade-off:**
- Puede cargar más datos de los necesarios.
- Aumenta el consumo de memoria.
