# Node.js - Documentación Nivel Senior

> Documentación completa de Node.js enfocada en nivel senior, entrevistas técnicas y trabajo real en producción.

## 📚 Contenido

### [1️⃣ Runtime](./01-runtime/)

Fundamentos del runtime de Node.js, Event Loop y arquitectura interna.

- **[Event Loop Profundo](./01-runtime/event-loop-profundo.md)**
  - Fases del Event Loop en Node.js
  - setTimeout vs setImmediate vs process.nextTick
  - Microtasks y prioridades
  - Diferencias con el Event Loop del browser

- **[Single-Thread vs Multi-Process](./01-runtime/single-thread-vs-multi-process.md)**
  - Arquitectura real de Node.js
  - Thread Pool (libuv)
  - Worker Threads
  - Cluster Mode
  - Cuándo Node se ejecuta en múltiples threads

- **[Cuándo Node se Bloquea](./01-runtime/cuando-node-se-bloquea.md)**
  - Operaciones que bloquean el Event Loop
  - CPU-intensive vs I/O-bound
  - Soluciones: Worker Threads, Clustering, Chunking
  - Detección de bloqueos

**Conceptos clave:** Event Loop, Single-threaded, Non-blocking I/O, Worker Threads

---

### [2️⃣ Sistema de Módulos](./02-modulos/)

CommonJS vs ES Modules, resolución e interoperabilidad.

- **[CommonJS vs ES Modules](./02-modulos/commonjs-vs-esm.md)**
  - Diferencias fundamentales
  - require vs import
  - Carga síncrona vs asíncrona
  - Live binding vs copia
  - Cuándo usar cada uno

- **[Resolución de Módulos](./02-modulos/resolucion-modulos.md)**
  - Algoritmo de resolución
  - node_modules lookup
  - package.json (main, exports)
  - require.resolve()

- **[Interoperabilidad CJS ↔ ESM](./02-modulos/interoperabilidad.md)**
  - Importar CommonJS desde ES Modules
  - Importar ES Modules desde CommonJS
  - Dual packages
  - __dirname y __filename en ESM

**Conceptos clave:** CommonJS, ES Modules, require(), import, exports, package.json

---

### [3️⃣ APIs Nativas de Node](./03-apis-nativas/)

APIs built-in de Node.js (core modules).

- **[File System (fs)](./03-apis-nativas/fs-file-system.md)**
  - Sync vs Async vs Streams
  - readFile, writeFile, appendFile
  - Watchers (fs.watch)
  - Performance y mejores prácticas

- **[Path y OS](./03-apis-nativas/path-os.md)**
  - path.join, path.resolve
  - Cross-platform paths
  - os.cpus(), os.platform()
  - Información del sistema

- **[Crypto](./03-apis-nativas/crypto.md)**
  - Hashing (SHA-256, bcrypt)
  - Encryption (AES)
  - Random generation
  - Signing y verification

- **[Child Process y Cluster](./03-apis-nativas/child-process-cluster.md)**
  - spawn, exec, execFile, fork
  - Comunicación entre procesos (IPC)
  - Cluster mode
  - Worker pool pattern

- **[Process y Buffer](./03-apis-nativas/process-buffer.md)**
  - process.env, process.argv
  - process.exit(), signals (SIGTERM, SIGINT)
  - Buffer manipulation
  - Memory management

**Conceptos clave:** fs, path, crypto, child_process, cluster, process, buffer

---

### [4️⃣ Asincronía Avanzada](./04-asincronia-avanzada/)

Manejo avanzado de código asíncrono en Node.js.

- **[Callbacks → Promises → Async/Await](./04-asincronia-avanzada/callbacks-promises-async.md)**
  - Evolución de patrones asíncronos
  - Callback hell y soluciones
  - Promisificación
  - Error handling en cada patrón

- **[Error Handling Asíncrono](./04-asincronia-avanzada/error-handling.md)**
  - try/catch con async/await
  - .catch() con Promises
  - Error-first callbacks
  - Global error handlers

- **[Promise Combinators](./04-asincronia-avanzada/promise-combinators.md)**
  - Promise.all (paralelo)
  - Promise.allSettled (todos los resultados)
  - Promise.race (primero en completar)
  - Promise.any (primero exitoso)

- **[Backpressure en Streams](./04-asincronia-avanzada/backpressure-streams.md)**
  - Qué es backpressure
  - pipe() y pipeline()
  - Manejo manual de backpressure
  - Transform streams

**Conceptos clave:** Promises, async/await, Error handling, Streams, Backpressure

---

### [5️⃣ HTTP Real](./05-http/)

Módulo HTTP nativo y fundamentos del protocolo.

- **[HTTP Nativo](./05-http/http-nativo.md)**
  - Crear servidor HTTP básico
  - Request/Response objects
  - Routing manual

- **[Request/Response Cycle](./05-http/request-response-cycle.md)**
  - Ciclo de vida de una request
  - Headers y body parsing
  - Content negotiation

- **[Status Codes y Headers](./05-http/status-codes-headers.md)**
  - Códigos HTTP (2xx, 3xx, 4xx, 5xx)
  - Headers importantes (Content-Type, Authorization, CORS)
  - Custom headers

- **[HTTP/1.1 vs HTTP/2](./05-http/http-versions.md)**
  - Diferencias de protocolo
  - Keep-Alive connections
  - Multiplexing en HTTP/2

**Conceptos clave:** http module, Request, Response, Status codes, Headers

---

### [6️⃣ Frameworks](./06-frameworks/)

Express, Nest.js y Fastify - nivel senior.

- **[Express (Senior)](./06-frameworks/express-senior.md)**
  - Middleware order y scope
  - Router avanzado
  - Error handling middleware
  - Arquitectura de aplicación Express

- **[Nest.js](./06-frameworks/nestjs.md)**
  - Decoradores (@Controller, @Injectable)
  - Dependency Injection
  - Módulos y providers
  - Guards, Pipes, Interceptors

- **[Fastify](./06-frameworks/fastify.md)**
  - Performance vs Express
  - JSON Schema validation
  - Plugins y hooks
  - Cuándo usar Fastify

**Conceptos clave:** Express, Nest.js, Fastify, Middleware, DI, Decoradores

---

### [7️⃣ Errores y Estabilidad](./07-errores-estabilidad/)

Manejo de errores y estabilidad en producción.

- **[Global Error Handling](./07-errores-estabilidad/global-error-handling.md)**
  - Error handler middleware
  - try/catch en async routes
  - Centralized error handling

- **[Uncaught Exceptions](./07-errores-estabilidad/uncaught-exceptions.md)**
  - process.on('uncaughtException')
  - process.on('unhandledRejection')
  - Cuándo reiniciar el proceso

- **[Graceful Shutdown](./07-errores-estabilidad/graceful-shutdown.md)**
  - SIGTERM y SIGINT signals
  - Cerrar conexiones activas
  - Drain de queues
  - Health checks

**Conceptos clave:** Error handling, Uncaught exceptions, Graceful shutdown, Process signals

---

### [8️⃣ Performance y Escalabilidad](./08-performance/)

Optimización y escalabilidad en Node.js.

- **[Event Loop Monitoring](./08-performance/event-loop-monitoring.md)**
  - Detectar Event Loop lag
  - Métricas de performance
  - Herramientas de profiling

- **[Clustering](./08-performance/clustering.md)**
  - Cluster mode en producción
  - PM2 y process managers
  - Load balancing
  - Zero-downtime restarts

- **[Profiling y Memory](./08-performance/profiling-memory.md)**
  - CPU profiling
  - Memory profiling
  - Heap snapshots
  - Detectar memory leaks

**Conceptos clave:** Performance, Clustering, Profiling, Memory leaks, Event Loop lag

---

### [9️⃣ Seguridad](./09-seguridad/)

Seguridad en aplicaciones Node.js.

- **[Resumen de Seguridad](./09-seguridad/resumen-seguridad.md)**
  - Referencias a documentación existente de seguridad
  - Ver: `/Backend/step-1/PatronesSeguridad/`
  - Ver: `/Backend/step-1/SeguridadBasica/`

**Conceptos clave:** OWASP, JWT, CORS, CSRF, SQL Injection, XSS, Rate Limiting

---

### [🔟 Databases + Node](./10-databases/)

Integración de bases de datos en Node.js.

- **[ORMs vs Query Builders](./10-databases/orms-query-builders.md)**
  - Sequelize, TypeORM, Prisma
  - Knex, Kysely
  - Cuándo usar cada uno

- **[Transacciones y Pooling](./10-databases/transactions-pooling.md)**
  - Transacciones ACID
  - Connection pooling
  - Deadlocks y rollbacks

- **[Problema N+1](./10-databases/n-plus-one.md)**
  - Qué es el problema N+1
  - Eager loading vs Lazy loading
  - Soluciones y DataLoader

**Conceptos clave:** ORM, Query Builder, Transactions, Connection Pooling, N+1 Problem

---

### [1️⃣1️⃣ Testing](./11-testing/)

Testing en Node.js - unit, integration, e2e.

- **[Jest/Vitest](./11-testing/jest-vitest.md)**
  - Setup y configuración
  - Matchers y assertions
  - Mocking en Node.js
  - Coverage

- **[Supertest (API Testing)](./11-testing/supertest-api.md)**
  - Testing de endpoints HTTP
  - Assertions de status/headers/body
  - Integration testing

- **[Mocks y Stubs](./11-testing/mocks-stubs.md)**
  - jest.mock() y jest.fn()
  - Sinon para mocking
  - Mocking dependencies
  - Spies vs Stubs vs Mocks

**Conceptos clave:** Jest, Vitest, Supertest, Mocking, Unit Testing, Integration Testing

---

### [1️⃣2️⃣ DevOps Mínimo](./12-devops/)

DevOps esencial para desarrolladores Node.js.

- **[Env y Docker](./12-devops/env-docker.md)**
  - Variables de entorno (.env, dotenv)
  - Docker para Node.js
  - Multi-stage builds
  - .dockerignore

- **[PM2 Process Manager](./12-devops/pm2-process-manager.md)**
  - Comandos PM2
  - ecosystem.config.js
  - Clustering con PM2
  - Logs y monitoring

- **[Logs y Monitoring](./12-devops/logs-monitoring.md)**
  - Winston, Pino
  - Logs estructurados
  - APM (Application Performance Monitoring)
  - Metrics y alertas

**Conceptos clave:** Environment variables, Docker, PM2, Logging, Monitoring, APM

---

### [1️⃣3️⃣ Arquitectura Backend](./13-arquitectura/)

Patrones de arquitectura para aplicaciones Node.js.

- **[Monolito vs Microservicios](./13-arquitectura/monolith-vs-microservices.md)**
  - Pros y contras
  - Cuándo usar cada uno
  - Migración gradual

- **[Clean Architecture](./13-arquitectura/clean-architecture.md)**
  - Capas (Controllers, Services, Repositories)
  - Dependency Inversion
  - SOLID principles
  - Hexagonal architecture

- **[Event-Driven Architecture](./13-arquitectura/event-driven.md)**
  - Event Emitter pattern
  - Message queues (RabbitMQ, Kafka)
  - Pub/Sub pattern
  - Event sourcing (conceptos)

**Conceptos clave:** Arquitectura, Clean Code, SOLID, Microservicios, Event-Driven, Message Queues

---

## 🎯 Roadmap de Estudio

### Nivel Junior → Mid:
1. Runtime (Event Loop básico)
2. Sistema de módulos (CommonJS principalmente)
3. APIs nativas (fs, path, http)
4. Express básico
5. Async/await básico

### Nivel Mid → Senior:
1. Event Loop profundo (fases, microtasks)
2. ES Modules e interoperabilidad
3. Child Process y Cluster
4. Backpressure y streams
5. Error handling avanzado
6. Testing comprehensivo
7. Performance y profiling
8. Arquitectura (Clean, Event-driven)

### Nivel Senior → Staff:
1. Arquitectura de sistemas distribuidos
2. Microservicios y service mesh
3. Observabilidad avanzada
4. Optimización extrema de performance
5. Contribuciones a proyectos open-source

---

## 📖 Cómo Usar Esta Documentación

### Para Entrevistas:
1. Lee **Runtime** completo (Event Loop es pregunta común)
2. Domina **Sistema de Módulos** (CJS vs ESM)
3. Revisa **APIs Nativas** (crypto, child_process)
4. Estudia **Errores y Estabilidad** (graceful shutdown)
5. Practica **Preguntas de Entrevista** al final de cada archivo

### Para Trabajo Diario:
1. Referencia rápida de **Frameworks** (Express/Nest)
2. Consulta **Testing** antes de escribir pruebas
3. Revisa **Performance** cuando optimices
4. Usa **DevOps** para deployment

### Para Crecer como Senior:
1. Domina **Arquitectura** (Clean, Event-driven)
2. Profundiza en **Performance** (profiling, memory)
3. Estudia **Databases** (N+1, pooling)
4. Aprende **Seguridad** (OWASP, best practices)

---

## 🔗 Referencias Externas

- **Documentación Oficial:** https://nodejs.org/en/docs/
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices
- **Event Loop Visualizado:** http://latentflip.com/loupe/
- **Stream Handbook:** https://github.com/substack/stream-handbook

---

## 📝 Contenido Relacionado en el Repositorio

- **Asincronía y Concurrencia:** [../AsincroniaConcurrencia/](../AsincroniaConcurrencia/)
- **Patrones de Performance:** [../PatronesPerformance/](../PatronesPerformance/)
- **Patrones de Seguridad:** [../PatronesSeguridad/](../PatronesSeguridad/)
- **REST APIs:** [../REST/](../REST/)
- **Middlewares:** [../Middlewares/](../Middlewares/)
- **Testing General:** [/Testing/](/Testing/)
- **DevOps:** [/DevOps/](/DevOps/)
- **TypeScript:** [/typescript/](/typescript/)

---

**Última actualización:** 2026-02-12
