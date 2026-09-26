# 🐈 Curso NestJS — De Junior a Senior

Material de estudio por **sesiones digeribles**. Cada sesión es autocontenida: teoría con el *porqué*, código real (NestJS 11 + TypeScript), diagramas, tablas comparativas, errores comunes y notas de entrevista (❓).

> **Prerrequisitos**: JavaScript moderno, TypeScript básico, HTTP/REST y Node.js (event loop, async/await). Si te falta algo, repasa [../typescript](../typescript) y [../Backend/node](../Backend/node).

---

## 🗺️ Roadmap por nivel: qué se espera de ti

### 🟢 Junior — "Construyo una API REST funcional con Nest"
- Entiendes **por qué existe Nest**: estructura opinada sobre Express/Fastify, inspirada en Angular.
- Usas el **CLI** (`nest new`, `nest g resource`) y entiendes la estructura del proyecto.
- Sabes qué es un **decorador** y cómo Nest usa metadata (`reflect-metadata`).
- Organizas código en **módulos**, **controllers** y **providers (services)**.
- Entiendes la **inyección de dependencias** básica (`@Injectable`, constructor injection).
- Recibes datos con `@Param`, `@Query`, `@Body`, `@Headers` y devuelves códigos HTTP correctos.
- Validas entradas con **DTOs + class-validator + ValidationPipe**.
- Lees configuración con **ConfigModule** y variables de entorno.

### 🟡 Mid — "Construyo APIs de producción, seguras, testeadas y persistentes"
- Dominas el **ciclo de vida de la request**: middleware → guards → interceptors → pipes → handler → interceptors → filters.
- Escribes **exception filters, pipes, guards, interceptors y decoradores propios**.
- Persistes datos con **TypeORM, Prisma o Mongoose**: relaciones, migraciones, transacciones, paginación.
- Implementas **autenticación** (Passport, JWT, refresh tokens) y **autorización** (RBAC, CASL).
- Proteges la API: Helmet, CORS, rate limiting, OWASP API Top 10.
- Documentas con **OpenAPI/Swagger**, versionas y serializas respuestas.
- Escribes **tests unitarios y e2e** con Jest, `Test.createTestingModule` y Supertest.

### 🔴 Senior — "Diseño sistemas con Nest y sé lo que pasa por dentro"
- Dominas la **DI avanzada**: custom providers, scopes (REQUEST/TRANSIENT) y su costo, dependencias circulares, `ModuleRef`, lazy loading.
- Construyes **módulos dinámicos** reutilizables (`forRoot`, `forRootAsync`, `ConfigurableModuleBuilder`).
- Integras **caching, colas (BullMQ), cron, eventos**, uploads/streaming, **WebSockets** y **GraphQL**.
- Diseñas **microservicios** (TCP, Redis, NATS, RabbitMQ, Kafka, gRPC) y **event-driven**.
- Aplicas **CQRS, DDD y arquitectura hexagonal** sin sobre-ingeniería.
- Gestionas **monorepos** (Nest workspaces / Nx) y librerías compartidas.
- Llevas a producción: **observabilidad** (Pino, Terminus, Prometheus, OpenTelemetry), **performance** (Fastify, profiling, leaks), **Docker, CI/CD, graceful shutdown**.
- Entiendes los **internals**: scanner, injector, `NestFactory`, instance loader, cómo se resuelve el grafo de dependencias.

---

## 📚 Plan de sesiones

### Bloque 1 — Fundamentos (Junior)
- [ ] **Sesión 1 — Qué es NestJS: filosofía, arquitectura, Express vs Fastify, CLI y estructura del proyecto** → [sesion-01-introduccion.md](sesion-01-introduccion.md)
- [ ] **Sesión 2 — TypeScript para Nest: clases, decoradores, reflect-metadata y generics** → [sesion-02-typescript-decoradores.md](sesion-02-typescript-decoradores.md)
- [ ] **Sesión 3 — Módulos: imports, exports, providers, módulos globales y compartidos** → [sesion-03-modulos.md](sesion-03-modulos.md)
- [ ] **Sesión 4 — Controllers y routing: params, query, body, headers, status codes, respuestas** → [sesion-04-controllers-routing.md](sesion-04-controllers-routing.md)
- [ ] **Sesión 5 — Providers e Inyección de Dependencias (básico)** → [sesion-05-providers-di.md](sesion-05-providers-di.md)
- [ ] **Sesión 6 — DTOs y validación: class-validator, class-transformer y ValidationPipe** → [sesion-06-dtos-validacion.md](sesion-06-dtos-validacion.md)
- [ ] **Sesión 7 — Configuración: ConfigModule, .env, validación de config y entornos** → [sesion-07-configuracion.md](sesion-07-configuracion.md)

### Bloque 2 — El ciclo de vida de la request (Junior → Mid)
- [ ] **Sesión 8 — Middleware** → [sesion-08-middleware.md](sesion-08-middleware.md)
- [ ] **Sesión 9 — Exception Filters y manejo global de errores** → [sesion-09-exception-filters.md](sesion-09-exception-filters.md)
- [ ] **Sesión 10 — Pipes: built-in, custom, transformación y validación** → [sesion-10-pipes.md](sesion-10-pipes.md)
- [ ] **Sesión 11 — Guards: autorización por request, ExecutionContext y Reflector** → [sesion-11-guards.md](sesion-11-guards.md)
- [ ] **Sesión 12 — Interceptors: RxJS, logging, transformación, timeout, caching** → [sesion-12-interceptors.md](sesion-12-interceptors.md)
- [ ] **Sesión 13 — Custom decorators y el orden completo del request lifecycle** → [sesion-13-decoradores-lifecycle.md](sesion-13-decoradores-lifecycle.md)

### Bloque 3 — Persistencia (Mid)
- [ ] **Sesión 14 — TypeORM: entidades, relaciones, repositorios, QueryBuilder** → [sesion-14-typeorm.md](sesion-14-typeorm.md)
- [ ] **Sesión 15 — Prisma: schema, cliente, relaciones, integración con Nest** → [sesion-15-prisma.md](sesion-15-prisma.md)
- [ ] **Sesión 16 — MongoDB con Mongoose: schemas, populate, índices, agregaciones** → [sesion-16-mongoose.md](sesion-16-mongoose.md)
- [ ] **Sesión 17 — Datos en producción: migraciones, transacciones, paginación, N+1, patrón repository** → [sesion-17-datos-produccion.md](sesion-17-datos-produccion.md)

### Bloque 4 — Seguridad, documentación y testing (Mid)
- [ ] **Sesión 18 — Autenticación: Passport, JWT, access/refresh tokens, hashing** → [sesion-18-autenticacion.md](sesion-18-autenticacion.md)
- [ ] **Sesión 19 — Autorización: roles (RBAC), CASL, policies y ownership** → [sesion-19-autorizacion.md](sesion-19-autorizacion.md)
- [ ] **Sesión 20 — Seguridad de la API: Helmet, CORS, Throttler, CSRF, OWASP API Top 10** → [sesion-20-seguridad.md](sesion-20-seguridad.md)
- [ ] **Sesión 21 — OpenAPI/Swagger, versionado de API y serialización de respuestas** → [sesion-21-openapi-versionado-serializacion.md](sesion-21-openapi-versionado-serializacion.md)
- [ ] **Sesión 22 — Testing: unit, integración y e2e con Jest y Supertest** → [sesion-22-testing.md](sesion-22-testing.md)

### Bloque 5 — Nest avanzado (Mid → Senior)
- [ ] **Sesión 23 — DI avanzada: custom providers, scopes, dependencias circulares, ModuleRef** → [sesion-23-di-avanzada.md](sesion-23-di-avanzada.md)
- [ ] **Sesión 24 — Módulos dinámicos, lifecycle hooks y DiscoveryService** → [sesion-24-modulos-dinamicos-lifecycle.md](sesion-24-modulos-dinamicos-lifecycle.md)
- [ ] **Sesión 25 — Caching (Redis), tareas programadas, colas con BullMQ y eventos** → [sesion-25-cache-colas-eventos.md](sesion-25-cache-colas-eventos.md)
- [ ] **Sesión 26 — Archivos: uploads, streaming, S3, Server-Sent Events y compresión** → [sesion-26-archivos-streaming.md](sesion-26-archivos-streaming.md)
- [ ] **Sesión 27 — WebSockets: Gateways, Socket.io, rooms, auth y escalado con Redis** → [sesion-27-websockets.md](sesion-27-websockets.md)
- [ ] **Sesión 28 — GraphQL: code-first, resolvers, DataLoader, subscriptions** → [sesion-28-graphql.md](sesion-28-graphql.md)

### Bloque 6 — Senior: arquitectura y sistemas distribuidos
- [ ] **Sesión 29 — Microservicios: transports (TCP, Redis, NATS, RabbitMQ, Kafka, gRPC) y apps híbridas** → [sesion-29-microservicios.md](sesion-29-microservicios.md)
- [ ] **Sesión 30 — Arquitectura: Clean/Hexagonal, DDD y CQRS con @nestjs/cqrs** → [sesion-30-arquitectura-cqrs-ddd.md](sesion-30-arquitectura-cqrs-ddd.md)
- [ ] **Sesión 31 — Monorepos: Nest workspaces, Nx y librerías compartidas** → [sesion-31-monorepos.md](sesion-31-monorepos.md)
- [ ] **Sesión 32 — Observabilidad: logging con Pino, health checks, métricas y OpenTelemetry** → [sesion-32-observabilidad.md](sesion-32-observabilidad.md)
- [ ] **Sesión 33 — Performance: Fastify, event loop, profiling, memory leaks, clustering** → [sesion-33-performance.md](sesion-33-performance.md)
- [ ] **Sesión 34 — Producción: Docker, CI/CD, graceful shutdown, deploy en AWS (ECS / Lambda)** → [sesion-34-docker-cicd-deploy.md](sesion-34-docker-cicd-deploy.md)
- [ ] **Sesión 35 — Internals de NestJS y preparación de entrevista senior** → [sesion-35-internals-entrevista.md](sesion-35-internals-entrevista.md)

---

## 🧪 Proyecto hilo conductor
Todas las sesiones construyen sobre la misma app: **"TiendaApi"** (productos, categorías, usuarios, órdenes). Empieza en memoria (Bloque 1), pasa por base de datos (Bloque 3), se asegura y testea (Bloque 4), se enriquece (Bloque 5) y termina partida en microservicios observables y desplegada (Bloque 6).

## 🎯 Cómo estudiar cada sesión
1. Lee la sesión completa una vez, sin código.
2. Reléela escribiendo y ejecutando **cada** ejemplo.
3. Responde de memoria el **chequeo de entrevista** (❓) del final.
4. Haz el **ejercicio práctico**.
5. Marca la casilla `[x]` cuando la domines y pasa a la siguiente.
