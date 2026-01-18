# NIVEL 9 — TESTING (arquitectura testeable)

## Tipos de testing

### Unit (Unitario)
- Prueba funciones o métodos individuales de forma aislada.
- Rápido y fácil de automatizar.

#### Ejemplo (TypeScript)
```typescript
test('suma', () => {
  expect(1 + 2).toBe(3);
});
```

#### Ejemplo (C#)
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

### Integration (Integración)
- Prueba la interacción entre varios módulos o servicios (ej: app + base de datos).

#### Ejemplo (TypeScript)
```typescript
import request from 'supertest';
import app from './app';
test('GET /users', async () => {
  const res = await request(app).get('/users');
  expect(res.status).toBe(200);
});
```

---

### E2E (End to End)
- Prueba el sistema completo como lo haría un usuario real.
- Usa navegadores reales o simulados.

#### Ejemplo (Playwright)
```typescript
import { test, expect } from '@playwright/test';
test('homepage', async ({ page }) => {
  await page.goto('https://ejemplo.com');
  await expect(page).toHaveTitle(/Ejemplo/);
});
```

---

### Contract testing
- Verifica que la comunicación entre servicios (APIs) cumple el contrato esperado.
- Útil en microservicios.

#### Ejemplo (pseudocódigo)
```js
// Pact.js o similar
test('API contract', () => {
  expect(apiResponse).toMatchContract(contractSchema);
});
```

---

## 🧠 Senior sabe:
> Si no se puede testear, está mal diseñado.

- El testing guía el diseño: código desacoplado, inyectable y con dependencias claras es más fácil de testear.
- Playwright es una herramienta moderna para E2E, soporta múltiples navegadores, fácil de integrar en CI/CD y permite pruebas visuales y de accesibilidad.
