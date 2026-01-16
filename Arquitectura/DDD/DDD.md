# DDD (Domain-Driven Design)

> Esto es **nivel senior alto**.

## Conceptos clave
- **Bounded Context:** Límite explícito de un modelo de dominio.
- **Entities:** Objetos con identidad propia.
- **Value Objects:** Objetos sin identidad, definidos solo por sus atributos.
- **Aggregates:** Conjunto de entidades y objetos de valor tratados como una unidad.
- **Repositories:** Encapsulan la lógica de acceso a datos para los aggregates.
- **Domain Events:** Eventos que representan algo que ocurrió en el dominio.

## Ejemplo
```tsx
Order
 ├─ OrderItems (VO)
 ├─ Total (VO)
```

## Principio
👉 El dominio **manda**, no la base de datos.

---

## Ventajas
- El modelo refleja el negocio real.
- Facilita la comunicación entre expertos de dominio y desarrolladores.
- Permite sistemas complejos y bien estructurados.
