# Specification

El patrón Specification encapsula reglas de negocio y criterios de consulta en objetos reutilizables y combinables.

## Ventajas
- Reglas reutilizables
- Composición de criterios
- Facilita validaciones complejas

## Ejemplo en TypeScript
```typescript
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

class AdultSpecification implements Specification<{ age: number }> {
  isSatisfiedBy(candidate: { age: number }) {
    return candidate.age >= 18;
  }
}
```

## Ejemplo en C#
```csharp
public interface ISpecification<T> {
    bool IsSatisfiedBy(T candidate);
}

public class AdultSpecification : ISpecification<Person> {
    public bool IsSatisfiedBy(Person candidate) => candidate.Age >= 18;
}
```
