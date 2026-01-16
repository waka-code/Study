
---

## Ejemplo visual de arquitectura de datos

```mermaid
graph TD;
  subgraph DBCluster
    Master((Master))
    Replica1((Replica))
    Replica2((Replica))
  end
  App1-->|Read/Write|Master
  App2-->|Read|Replica1
  App3-->|Read|Replica2
```

**Explicación:**
Este diagrama muestra una arquitectura típica con una base de datos principal y réplicas de solo lectura para escalar consultas y mejorar disponibilidad.
