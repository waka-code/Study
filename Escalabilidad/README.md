# NIVEL 6 — ESCALABILIDAD & PERFORMANCE

## 12️⃣ Escalado

### Vertical
- Consiste en aumentar la capacidad de un solo servidor (más CPU, RAM, disco).
- Es simple de implementar, pero tiene un límite físico y puede ser costoso.

#### Ejemplo
- Pasar de una máquina con 4 GB de RAM a una con 32 GB de RAM.
- Cambiar de un servidor de 2 núcleos a uno de 16 núcleos.

### Horizontal
- Consiste en agregar más servidores para repartir la carga.
- Permite escalar casi sin límite y mejorar la tolerancia a fallos.

#### Ejemplo
- Tener 1 servidor web y luego agregar 3 más para balancear el tráfico.
- Un clúster de bases de datos donde los datos se distribuyen entre varios nodos.

---

## Herramientas (solo ejemplos, no definición)
- Load balancers
- Caching (Redis)
- CDN
