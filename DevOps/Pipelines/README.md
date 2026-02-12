# Pipelines CI/CD

Un pipeline CI/CD automatiza el flujo de desarrollo, pruebas y despliegue. Un senior debe entender:

- Qué es CI (Integración Continua) y CD (Entrega/Despliegue Continua)
- Pasos típicos: install, lint, test, build, deploy
- Diferencia entre build-time y runtime
- Pipeline por PR vs por main
- Variables de entorno y secrets
- Qué hacer si el pipeline falla

## Herramientas comunes
- GitHub Actions
- GitLab CI
- Bitbucket Pipelines
- Azure DevOps

**Ejemplo básico GitHub Actions:**
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
      - name: Ejecutar tests
        run: npm test
```

> Un senior no debe escribir pipelines complejos, pero sí leerlos, ajustarlos y entenderlos.
