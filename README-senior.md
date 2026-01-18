# ¿CUÁNDO YA ERES SENIOR?

Eres senior cuando puedes responder:

---

## ¿Por qué esta arquitectura?
**Respuesta:**
Porque resuelve los requisitos del negocio, permite escalar, facilita el mantenimiento y el testing, y desacopla las dependencias.

**Ejemplo:**
- Uso Clean Architecture para separar dominio de infraestructura, facilitando cambios de base de datos o UI sin afectar la lógica de negocio.

---

## ¿Qué pasa si escala x10?
**Respuesta:**
Debo identificar cuellos de botella (DB, red, CPU), aplicar escalado horizontal, caching y particionamiento de datos.

**Ejemplo:**
- Si la app recibe 10x usuarios, agrego más instancias detrás de un load balancer y uso read replicas en la base de datos.

---

## ¿Qué rompería esto?
**Respuesta:**
Cambios en dependencias críticas, falta de pruebas, cuellos de botella no previstos, o errores en la gestión de concurrencia.

**Ejemplo:**
- Si la base de datos se cae y no hay retry/circuit breaker, la app deja de funcionar.

---

## ¿Cómo migrar sin downtime?
**Respuesta:**
Usando despliegues blue/green, migraciones de base de datos en dos fases, y feature toggles para activar nuevas funciones gradualmente.

**Ejemplo:**
- Despliego la nueva versión en paralelo, redirijo tráfico poco a poco y hago rollback si hay errores.

---

## ¿Cómo probar esto?
**Respuesta:**
Con tests unitarios, de integración, E2E y contract testing. Automatizo en CI/CD y uso mocks/stubs para dependencias externas.

**Ejemplo:**
- Uso Playwright para E2E, Jest/Xunit para unitarios, y Pact para contract testing entre microservicios.

---

## Ejemplo con Hexagonal Architecture
**¿Por qué esta arquitectura?**
- Hexagonal permite aislar el core de la aplicación de detalles externos (DB, APIs, UI), facilitando pruebas y cambios de tecnología.

**¿Qué pasa si escala x10?**
- Puedo agregar más adaptadores (por ejemplo, más APIs o canales de entrada) sin tocar el core.

**¿Qué rompería esto?**
- Si un adaptador externo falla pero el core está bien diseñado, el resto de la lógica sigue funcionando y puedo cambiar el adaptador fácilmente.

**¿Cómo migrar sin downtime?**
- Implemento un nuevo adaptador (por ejemplo, nueva base de datos) y lo conecto al core, migrando datos en paralelo y cambiando el adaptador cuando todo esté listo.

**¿Cómo probar esto?**
- Testeo el core con mocks de los puertos/adaptadores, y hago integración real solo en los adaptadores.

**Ejemplo de código (TypeScript):**
```typescript
// core/Servicio.ts
export class Servicio {
  constructor(private repo: RepoPort) {}
  ejecutar() { return this.repo.obtener(); }
}

// ports/RepoPort.ts
export interface RepoPort { obtener(): string[]; }

// adapters/RepoMemoria.ts
import { RepoPort } from '../ports/RepoPort';
export class RepoMemoria implements RepoPort {
  obtener() { return ['dato1', 'dato2']; }
}

// app.ts
import { Servicio } from './core/Servicio';
import { RepoMemoria } from './adapters/RepoMemoria';
const servicio = new Servicio(new RepoMemoria());
console.log(servicio.ejecutar());
```
