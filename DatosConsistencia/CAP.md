# CAP Theorem

El teorema CAP establece que una base de datos distribuida solo puede garantizar dos de estas tres propiedades al mismo tiempo:

- **Consistency (Consistencia):** Todos los nodos ven los mismos datos al mismo tiempo.
- **Availability (Disponibilidad):** Cada solicitud recibe una respuesta (éxito o error).
- **Partition tolerance (Tolerancia a particiones):** El sistema sigue funcionando aunque haya fallos de red entre nodos.

## ¿Qué sacrificas y por qué?
- **CA (Consistencia + Disponibilidad):** Sacrificas tolerancia a particiones.
- **CP (Consistencia + Tolerancia a particiones):** Sacrificas disponibilidad.
- **AP (Disponibilidad + Tolerancia a particiones):** Sacrificas consistencia.

## Ejemplo visual
```
  Consistency
   /      \
  /        \
 CA         CP
  \        /
   \      /
Availability---Partition tolerance
```

## Ejemplo
- **CP:** MongoDB en modo replicaset prioriza consistencia y tolerancia a particiones, pero puede rechazar escrituras si no hay quorum.
- **AP:** Couchbase prioriza disponibilidad y particionado, pero puede devolver datos desactualizados.
- **CA:** Un sistema centralizado (no distribuido) puede garantizar consistencia y disponibilidad, pero no tolera particiones.
