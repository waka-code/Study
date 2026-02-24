# DevSecOps (scanning, CI/CD)

Integra seguridad en todo el ciclo de vida del desarrollo: escaneo de dependencias, análisis estático, pruebas de seguridad en pipelines CI/CD.

**Ejemplo GitHub Actions:**
```yaml
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Scan dependencias
        run: npm audit
```
