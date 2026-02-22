# Agile, Scrum y Mejores Prácticas de Desarrollo

> **Concepto clave:**
> Agile es una metodología de desarrollo de software que prioriza entrega iterativa, colaboración, flexibilidad y feedback continuo. Scrum es el framework Agile más popular.

---

## ¿Por qué Agile?

### Problemas del Waterfall (desarrollo tradicional):

- ❌ Entregas tardías (meses/años)
- ❌ Requisitos cambian, pero el plan es rígido
- ❌ Testing al final = bugs costosos
- ❌ Cliente ve el producto solo al final

### Solución Agile:

- ✅ **Iteraciones cortas** (sprints de 1-2 semanas)
- ✅ **Feedback constante** del cliente
- ✅ **Adaptación** a cambios
- ✅ **Testing continuo** (CI/CD)
- ✅ **Entregas frecuentes** de valor

---

## Manifiesto Agile (4 Valores Core)

1. **Individuos e interacciones** sobre procesos y herramientas
2. **Software funcionando** sobre documentación extensiva
3. **Colaboración con el cliente** sobre negociación de contratos
4. **Responder al cambio** sobre seguir un plan

---

## Scrum Framework

### Roles

#### 1. Product Owner (PO)
- **Responsabilidad:** Maximizar valor del producto
- **Tareas:**
  - Gestionar y priorizar Product Backlog
  - Definir historias de usuario y criterios de aceptación
  - Tomar decisiones de negocio
  - Aprobar trabajo completado

#### 2. Scrum Master (SM)
- **Responsabilidad:** Facilitar el proceso Scrum
- **Tareas:**
  - Remover impedimentos del equipo
  - Facilitar ceremonias (Daily, Planning, Retro)
  - Proteger al equipo de distracciones
  - Coach en prácticas Agile

#### 3. Development Team
- **Responsabilidad:** Entregar incremento de software funcional
- **Características:**
  - Auto-organizado (decide cómo trabajar)
  - Cross-functional (full-stack capabilities)
  - 3-9 personas idealmente
  - Sin jerarquías (todos son "developers")

---

### Artefactos de Scrum

#### 1. Product Backlog

Lista priorizada de todo el trabajo pendiente del producto.

**Ejemplo:**

| Prioridad | User Story | Story Points | Status |
|-----------|------------|--------------|--------|
| 1 | Como usuario, quiero registrarme con email para crear cuenta | 5 | To Do |
| 2 | Como usuario, quiero resetear contraseña para recuperar acceso | 3 | To Do |
| 3 | Como admin, quiero ver dashboard de usuarios para monitorear actividad | 8 | To Do |

**Formato de User Story:**
```
Como [rol]
Quiero [funcionalidad]
Para [beneficio]

Criterios de aceptación:
- [ ] Formulario de registro valida email format
- [ ] Contraseña mínimo 8 caracteres
- [ ] Email de confirmación enviado
- [ ] Usuario puede hacer login después de registro
```

#### 2. Sprint Backlog

Subset del Product Backlog seleccionado para el Sprint actual.

**Ejemplo Sprint Backlog (Sprint 5):**

| Task | Asignado | Estimación | Estado |
|------|----------|------------|--------|
| Diseñar API /register | John | 4h | Done |
| Implementar validación email | Sarah | 2h | In Progress |
| Escribir tests unitarios | Mike | 3h | To Do |
| Configurar email service | Sarah | 2h | To Do |

#### 3. Increment (Incremento)

Suma de todos los items completados del Sprint + Sprints anteriores.

- Debe ser **potencialmente entregable** (production-ready)
- Cumple **Definition of Done**
- Testeado y aprobado por PO

---

### Ceremonias de Scrum

#### 1. Sprint Planning (Inicio de Sprint)

**Duración:** 2-4 horas (para sprint de 2 semanas)

**Participantes:** Todo el equipo

**Objetivo:** Definir qué se hará en el Sprint

**Agenda:**
1. PO presenta prioridades del Product Backlog
2. Equipo estima esfuerzo (Planning Poker)
3. Equipo decide qué items caben en el Sprint
4. Se define **Sprint Goal** (objetivo del sprint)
5. Equipo descompone User Stories en tareas técnicas

**Output:** Sprint Backlog + Sprint Goal

**Ejemplo Sprint Goal:**
> "Completar flujo de registro de usuarios con autenticación por email"

---

#### 2. Daily Standup (Diario)

**Duración:** 15 minutos máximo

**Participantes:** Development Team + Scrum Master (PO opcional)

**Formato:** Cada miembro responde 3 preguntas:

1. ¿Qué hice ayer?
2. ¿Qué haré hoy?
3. ¿Tengo impedimentos?

**Ejemplo:**
```
John: "Ayer terminé la API de registro. Hoy empezaré con los tests. No tengo impedimentos."

Sarah: "Ayer trabajé en validación de email. Hoy la terminaré y empezaré
con el servicio de emails. Tengo un impedimento: necesito credenciales de SendGrid."

Mike: "Ayer revisé PRs. Hoy escribiré tests de integración. Sin impedimentos."
```

**Anti-patterns a evitar:**
- ❌ Status report al Scrum Master (hablar al equipo, no al SM)
- ❌ Resolver problemas técnicos (eso va después)
- ❌ Más de 15 minutos

---

#### 3. Sprint Review (Fin de Sprint)

**Duración:** 1-2 horas

**Participantes:** Todo el equipo + stakeholders

**Objetivo:** Demostrar trabajo completado

**Agenda:**
1. PO presenta Sprint Goal
2. Equipo hace **DEMO** de funcionalidades completadas
3. Stakeholders dan feedback
4. PO acepta o rechaza User Stories
5. Se revisa Product Backlog (re-priorizar si es necesario)

**Ejemplo:**
```
Demo de "User Registration":
1. Mostrar formulario de registro funcionando
2. Demostrar validación de email
3. Mostrar email de confirmación recibido
4. Login con usuario nuevo
5. Q&A con stakeholders
```

---

#### 4. Sprint Retrospective (Fin de Sprint)

**Duración:** 1-1.5 horas

**Participantes:** Development Team + Scrum Master (sin PO)

**Objetivo:** Mejorar proceso del equipo

**Formato (Start-Stop-Continue):**

| Start (Empezar a hacer) | Stop (Dejar de hacer) | Continue (Seguir haciendo) |
|-------------------------|----------------------|---------------------------|
| Code reviews más tempranos | PRs grandes (> 500 líneas) | Daily standups concisos |
| Pair programming en features complejos | Pushear a main sin tests | Retrospectivas honestas |

**Action items:**
- [ ] Implementar pre-commit hooks para linting (John)
- [ ] Documentar arquitectura en Confluence (Sarah)
- [ ] Configurar CI pipeline para tests automáticos (Mike)

---

### Estimación: Planning Poker

**Escala Fibonacci:** 1, 2, 3, 5, 8, 13, 21

**¿Por qué Fibonacci?**
- Refleja incertidumbre creciente en tareas grandes
- Evita falsa precisión (no hay diferencia entre 7 y 8)

**Proceso:**
1. PO lee User Story
2. Equipo hace preguntas de clarificación
3. Cada miembro elige carta (sin mostrar)
4. Todos muestran cartas al mismo tiempo
5. Si hay consenso, esa es la estimación
6. Si no, quien dio menor y mayor estimación explican su razonamiento
7. Se vota de nuevo hasta consenso

**Ejemplo:**
```
User Story: "Como usuario, quiero resetear contraseña"

Round 1:
- John: 5 (piensa que es complejo por email service)
- Sarah: 2 (ya usamos email service en registro)
- Mike: 3

Discusión:
John: "Necesitamos generar token seguro, expiración, validación..."
Sarah: "Pero ya tenemos email service configurado del registro, solo es otro template"

Round 2:
- John: 3
- Sarah: 3
- Mike: 3

Estimación final: 3 puntos
```

---

## Definition of Done (DoD)

Lista de criterios que TODA User Story debe cumplir para considerarse "Done".

**Ejemplo de DoD:**

```markdown
## Definition of Done

Una User Story está DONE cuando:

### Código
- [ ] Código implementado según criterios de aceptación
- [ ] Code review aprobado por al menos 1 peer
- [ ] Sin comentarios TODO o FIXME
- [ ] Cumple estándares de linting (ESLint, Prettier)

### Testing
- [ ] Tests unitarios escritos (coverage > 80%)
- [ ] Tests de integración para APIs
- [ ] Tests pasando en CI/CD
- [ ] Testing manual en staging completado

### Documentación
- [ ] README actualizado (si aplica)
- [ ] API docs actualizados (Swagger/OpenAPI)
- [ ] Comentarios en código complejo

### DevOps
- [ ] Mergeado a rama main/develop
- [ ] Deploy exitoso en staging
- [ ] Aprobado por Product Owner
- [ ] No introduce regresiones

### Seguridad
- [ ] Input validation implementada
- [ ] No vulnerabilidades de seguridad (OWASP)
- [ ] Secrets no committeados

### Performance
- [ ] No memory leaks
- [ ] Queries optimizadas (< 100ms)
- [ ] Indexación de DB correcta
```

---

## Code Review Best Practices

### Para el Autor (quien crea PR):

✅ **Hacer:**
- PRs pequeños (< 400 líneas)
- Descripción clara del cambio
- Self-review antes de pedir review
- Agregar screenshots/videos si es UI
- Linkear ticket de Jira/Linear

❌ **Evitar:**
- PRs gigantes (> 1000 líneas)
- Múltiples features en un PR
- Pushear sin tests
- Commits sin mensaje descriptivo

**Ejemplo de descripción de PR:**

```markdown
## Descripción
Implementa reset de contraseña con token JWT de expiración 15 minutos.

## Cambios
- POST /api/auth/forgot-password (envía email con token)
- POST /api/auth/reset-password (valida token y cambia contraseña)
- Agregado email template para reset password

## Testing
- [x] Tests unitarios de controller
- [x] Tests de integración de flujo completo
- [x] Testing manual en staging

## Screenshots
[Adjuntar captura de email recibido]

Closes #123
```

---

### Para el Reviewer:

✅ **Hacer:**
- Review en < 24 horas
- Comentarios constructivos
- Explicar el "por qué" de sugerencias
- Aprobar si cambios menores (nits)

❌ **Evitar:**
- Comentarios vagos ("esto está mal")
- Nitpicking excesivo
- Bloquear PR por preferencias personales
- Asumir intenciones negativas

**Ejemplo de comentarios:**

```markdown
✅ Bueno:
"Considera usar bcrypt en lugar de MD5 para hashear contraseñas.
MD5 es vulnerable a rainbow table attacks. Aquí un ejemplo: [link]"

❌ Malo:
"Esto está mal, usa bcrypt"
```

**Tipos de comentarios:**

- **🔴 Blocker:** Debe cambiarse antes de merge (bug, seguridad)
- **🟡 Suggestion:** Opcional, mejora calidad
- **🟢 Nit:** Muy menor (typo, spacing)
- **💬 Question:** Pedir clarificación

---

## Pair Programming

Dos desarrolladores trabajan juntos en el mismo código.

### Roles:

1. **Driver:** Quien escribe código (manos en teclado)
2. **Navigator:** Quien guía y piensa en big picture

**Rotación:** Cambiar roles cada 15-30 minutos.

### ¿Cuándo hacer Pair Programming?

✅ **Sí:**
- Features complejas o críticas
- Onboarding de nuevo miembro
- Debugging difícil
- Aprender nueva tecnología

❌ **No:**
- Tasks simples y repetitivas
- Refactors menores
- Todo el día (agota)

### Herramientas:

- **Presencial:** Una computadora, dos teclados/mouses
- **Remoto:** VS Code Live Share, Tuple, Zoom con screen sharing

---

## Continuous Integration / Continuous Deployment (CI/CD)

### CI: Integrar código frecuentemente

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### CD: Deploy automático a staging/producción

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Push to registry
        run: docker push myapp:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: kubectl set image deployment/myapp myapp=myapp:${{ github.sha }}
```

---

## Métricas Agile

### 1. Velocity (Velocidad del equipo)

**Definición:** Story points completados por Sprint

**Ejemplo:**
- Sprint 1: 25 puntos
- Sprint 2: 30 puntos
- Sprint 3: 28 puntos
- **Velocity promedio:** ~28 puntos/sprint

**Uso:** Predecir cuándo se completará el Product Backlog

### 2. Burndown Chart

Gráfico que muestra trabajo restante vs tiempo.

```
Story Points
     |
  30 |●
     |  ●
  20 |    ●
     |      ●
  10 |        ●
     |          ●
   0 |____________●
     Day 1  5  10  14
```

### 3. Lead Time

Tiempo desde que User Story entra en backlog hasta que está en producción.

**Objetivo:** Reducir Lead Time para entregas más rápidas.

### 4. Cycle Time

Tiempo desde que equipo empieza a trabajar en User Story hasta que está Done.

**Objetivo:** Identificar cuellos de botella.

---

## Anti-Patterns a Evitar

### 1. Sprint sin Sprint Goal
❌ "Vamos a hacer estas 10 tickets"
✅ "Este sprint completaremos el flujo de checkout para aumentar conversión"

### 2. Scrum Master = Project Manager
❌ Scrum Master asigna tasks y controla
✅ Scrum Master facilita, el equipo se auto-organiza

### 3. Retrospectivas sin action items
❌ "Hablamos de problemas pero no hacemos nada"
✅ "Identificamos 3 action items concretos con responsables"

### 4. Product Owner ausente
❌ PO no disponible, equipo bloqueado
✅ PO accesible para clarificar requisitos

### 5. No respetar Definition of Done
❌ "Funciona en mi máquina, lo paso a Done"
✅ "Cumple todos los criterios del DoD: tests, review, deploy a staging"

---

## Preguntas de Entrevista

### 1. ¿Cuál es la diferencia entre Scrum y Kanban?

**Respuesta:**

| Aspecto | Scrum | Kanban |
|---------|-------|--------|
| **Iteraciones** | Sprints fijos (1-2 semanas) | Flujo continuo |
| **Roles** | PO, SM, Dev Team | No roles prescriptivos |
| **Estimación** | Story points | Opcional |
| **Cambios** | No se cambia Sprint Backlog | Prioridad puede cambiar siempre |
| **Métricas** | Velocity, Burndown | Lead Time, Cycle Time |

Scrum es mejor para equipos que necesitan estructura y ceremonias. Kanban es mejor para trabajo continuo sin sprints definidos (ej: support teams).

### 2. ¿Cómo manejas cuando un Sprint no se completa?

**Respuesta:**
1. En Sprint Review, acepto lo completado y muevo lo incompleto de vuelta a Product Backlog
2. En Retrospective, analizo por qué:
   - ¿Estimaciones incorrectas?
   - ¿Impedimentos no resueltos?
   - ¿Scope creep durante el Sprint?
3. Ajusto para próximo Sprint:
   - Si sobre-estimamos, tomar más story points
   - Si hubo impedimentos, resolverlos antes de Planning
   - Si scope creep, proteger mejor el Sprint Backlog

No penalizo al equipo. El objetivo es aprender y mejorar.

### 3. ¿Cómo haces code review efectivos?

**Respuesta:**
- **Rapidez:** Review en < 24h para no bloquear
- **Constructivo:** Explicar el "por qué" de sugerencias
- **Automatizado:** Lint, tests automáticos (no revisar formato)
- **Pequeños:** PRs < 400 líneas, fácil de revisar
- **Checklist:** Seguridad, performance, tests, docs

Distingo entre blockers (must fix) y nits (nice to have).

---

## Recursos

- **Scrum Guide:** https://scrumguides.org/
- **Agile Manifesto:** https://agilemanifesto.org/
- **Atlassian Agile:** https://www.atlassian.com/agile

---

**Última actualización:** 2026-02-20
