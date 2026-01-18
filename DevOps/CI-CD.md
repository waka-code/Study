# CI/CD (Integración y Despliegue Continuos)

## Pipelines
- Secuencia automatizada de pasos para construir, probar y desplegar código.

### Ejemplo (GitHub Actions)
```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Instalar dependencias
        run: npm install
      - name: Lint
        run: npm run lint
      - name: Test
        run: npm test
      - name: Deploy
        run: npm run deploy
```

---

## Lint
- Herramienta que analiza el código para detectar errores de estilo o potenciales bugs.

### Ejemplo (TypeScript)
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### Ejemplo (C#)
```csharp
// .editorconfig
[*.cs]
dotnet_diagnostic.IDE0055.severity = warning
```

---

## Tests
- Automatizan la validación del código.

### Ejemplo (TypeScript)
```typescript
test('suma', () => {
  expect(1 + 2).toBe(3);
});
```

### Ejemplo (C#)
```csharp
using Xunit;
public class MathTests {
  [Fact]
  public void Suma() {
    Assert.Equal(3, 1 + 2);
  }
}
```

---

## Deploy automático
- El código pasa a producción sin intervención manual tras pasar los tests.

### Ejemplo (GitHub Actions)
```yaml
- name: Deploy
  run: npm run deploy
```
