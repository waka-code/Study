# 🎯 ORDEN DE ESTUDIO PARA ENTREVISTA FULLSTACK SENIOR

> **Objetivo:** Preparación completa para entrevista técnica fullstack senior con enfoque en Node.js, Ruby on Rails, React/Next.js, PostgreSQL, Redis y arquitectura escalable.

---

## 📊 Visión General del Plan

Este repositorio contiene **TODO** lo que necesitas dominar para una entrevista fullstack senior. El contenido está organizado en **4 fases críticas** que cubren:

- ✅ **Frontend avanzado** (React, Next.js, state management, styling)
- ✅ **Backend robusto** (Node.js, Ruby on Rails, APIs RESTful, authentication)
- ✅ **Databases & Performance** (PostgreSQL, Redis, optimización, caching)
- ✅ **Architecture & DevOps** (Microservicios, CI/CD, Docker, seguridad, escalabilidad)

**Tiempo estimado:** 6-8 semanas de estudio intensivo

---

## 🎯 ¿Por qué este orden de estudio?

### Principios de este plan:

1. **Fundamentos primero**: Entender los "por qué" antes de los "cómo"
2. **Full-stack real**: Frontend y Backend se estudian en paralelo, como en el trabajo real
3. **De lo simple a lo complejo**: Cada sección construye sobre la anterior
4. **Enfoque práctico**: Ejemplos de código en cada tema
5. **Interview-ready**: Preguntas comunes de entrevistas senior incluidas

### ¿Por qué necesitas dominar cada área?

#### **Frontend (React/Next.js)**
- **React**: Framework más demandado, base para Next.js
- **Next.js**: SSR, SSG, ISR son CRÍTICOS para performance y SEO
- **State Management**: Redux/Context API - manejo de estado complejo es pregunta común
- **Styling**: Tailwind CSS es el estándar moderno, styled-components para component-based
- **Performance**: Lazy loading, code splitting - diferencia entre mid y senior

#### **Backend (Node.js + Ruby on Rails)**
- **Node.js**: Async/await, Event Loop, streams - conceptos fundamentales en entrevistas
- **Express/Nest/Fastify**: Conocer trade-offs entre frameworks demuestra experiencia
- **Ruby on Rails**: ActiveRecord, Sidekiq, Action Cable - preguntarán sobre background jobs y websockets
- **REST APIs**: Diseño de APIs escalables, versionado, paginación
- **Authentication**: JWT, OAuth, session management - seguridad es CRÍTICA

#### **Databases & Caching**
- **PostgreSQL**: Índices, transactions, query optimization - optimización de queries es pregunta común
- **Sequelize/ActiveRecord**: ORMs profesionales, N+1 problem, eager loading
- **Redis**: Caching strategies, session storage, pub/sub - ElastiCache en AWS es estándar
- **Performance**: Connection pooling, cache invalidation - escalabilidad real

#### **Architecture & DevOps**
- **Microservicios**: Message queues, event-driven - arquitectura distribuida es senior+
- **CQRS, Event Sourcing**: Patrones avanzados para escalabilidad
- **Docker, CI/CD**: DevOps básico es requisito para senior
- **Security**: Sanitization, validation, rate limiting - OWASP top 10
- **Escalabilidad**: Sharding, replicas, normalization - pensamiento de arquitecto

---

## 📚 FASE 1: FUNDAMENTOS FULLSTACK (Semanas 1-2)

> **Objetivo:** Reforzar bases sólidas de frontend y backend antes de temas avanzados.

### 🎨 Frontend Básico

#### 1.1 TypeScript Esencial
**Carpeta:** [`/typescript/`](./typescript/)

**Por qué estudiar esto:**
- TypeScript es REQUISITO en 2026, no opcional
- Type safety previene bugs en producción
- Demuestra profesionalismo y experiencia en equipos grandes

**Orden de estudio:**
1. [Tipos primitivos](./typescript/tipos-primitivos.md)
2. [Interfaces](./typescript/interfaces.md) y [Type vs Interface](./typescript/type-vs-interface.md)
3. [Generics](./typescript/generics.md) ⭐ (Pregunta común en entrevistas)
4. [Utility Types](./typescript/utility-types.md) - `Pick`, `Omit`, `Partial`, `Record`
5. [Unknown vs Any](./typescript/unknown-vs-any.md) - Diferencia entre mid y senior

**⏱️ Tiempo:** 3 días

---

#### 1.2 React Fundamentos
**Carpeta:** [`/reactjs/`](./reactjs/)

**Por qué estudiar esto:**
- React es base para Next.js (requisito principal)
- Hooks modernos (useState, useEffect, useMemo) son preguntas obligatorias
- Component lifecycle y performance optimization

**Orden de estudio:**
1. [¿Qué es React?](./reactjs/que-es-react.md) - Virtual DOM, reconciliation
2. [Componentes funcionales](./reactjs/componentes-funcionales.md) y [JSX](./reactjs/jsx.md)
3. [Props y Estado](./reactjs/props-estado.md)
4. [useEffect y useLayoutEffect](./reactjs/use-effect-layout-effect.md) ⭐ (Timing crítico)
5. [useMemo, useCallback, React.memo](./reactjs/memo-callback-memo.md) ⭐ (Performance)
6. [Context API](./reactjs/context-api.md) - State management básico
7. [useReducer](./reactjs/use-reducer.md) - Estado complejo
8. [Hooks personalizados](./reactjs/hooks-personalizados.md)
9. [Lazy loading y Code Splitting](./reactjs/lazy-loading.md)
10. [Error Boundaries](./reactjs/error-boundaries.md)
11. [React 18/19 novedades](./reactjs/novedades-react-18-19.md) - Concurrent features

**⏱️ Tiempo:** 4 días

---

#### 1.3 Styling Moderno
**Carpeta:** [`/reactjs/Styling/`](./reactjs/Styling/)

**Por qué estudiar esto:**
- Tailwind CSS es el estándar de facto en 2026
- Responsive design y mobile-first son obligatorios
- styled-components para component libraries

**Orden de estudio:**
1. [CSS3 moderno](./reactjs/Styling/01-css3.md) - Flexbox, Grid, custom properties
2. [Sass/SCSS](./reactjs/Styling/02-sass-scss.md) - Variables, mixins, nesting
3. [Tailwind CSS](./reactjs/Styling/03-tailwind.md) ⭐ (Utility-first CSS)
4. [styled-components](./reactjs/Styling/04-styled-components.md) - CSS-in-JS

**⏱️ Tiempo:** 2 días

---

### 🔧 Backend Básico

#### 1.4 Fundamentos Web y HTTP
**Carpeta:** [`/Backend/step-1/Web/`](./Backend/step-1/Web/)

**Por qué estudiar esto:**
- HTTP es el protocolo fundamental de la web
- Entender request/response cycle es CRÍTICO
- Códigos de estado, headers, idempotencia son preguntas comunes

**Orden de estudio:**
1. [¿Qué es HTTP?](./Backend/step-1/Web/01-que-es-http.md)
2. [Cliente vs Servidor](./Backend/step-1/Web/02-cliente-vs-servidor.md)
3. [Ciclo Request/Response](./Backend/step-1/Web/03-ciclo-request-response.md)
4. [Métodos HTTP](./Backend/step-1/Web/04-metodos-http.md) - GET, POST, PUT, PATCH, DELETE
5. [Códigos de estado](./Backend/step-1/Web/05-codigos-de-estado.md) ⭐ (2xx, 3xx, 4xx, 5xx)
6. [Headers HTTP](./Backend/step-1/Web/06-headers-http.md)
7. [Idempotencia](./Backend/step-1/Web/08-idempotencia.md) ⭐ (Pregunta senior)
8. [Stateless vs Stateful](./Backend/step-1/Web/09-stateless-vs-stateful.md)

**⏱️ Tiempo:** 2 días

---

#### 1.5 REST API Design
**Carpeta:** [`/Backend/step-1/REST/`](./Backend/step-1/REST/)

**Por qué estudiar esto:**
- Diseño de APIs RESTful es core skill de backend
- Naming conventions, versionado, paginación son estándares de industria
- Error handling y status codes apropiados

**Orden de estudio:**
1. [¿Qué es REST?](./Backend/step-1/REST/01-que-es-rest.md)
2. [Recursos y Endpoints](./Backend/step-1/REST/02-recursos-endpoints.md)
3. [Nombres de rutas](./Backend/step-1/REST/03-nombres-rutas.md)
4. [Métodos HTTP correctos](./Backend/step-1/REST/04-metodos-http-correcto.md)
5. [Versionado de APIs](./Backend/step-1/REST/05-versionado-apis.md) ⭐
6. [Paginación](./Backend/step-1/REST/06-paginacion-basica.md)
7. [Filtrado y ordenamiento](./Backend/step-1/REST/07-filtrado-ordenamiento.md)
8. [Manejo de errores](./Backend/step-1/REST/08-manejo-errores-rest.md)

**⏱️ Tiempo:** 2 días

---

## 📚 FASE 2: BACKEND AVANZADO (Semanas 3-4)

> **Objetivo:** Dominar Node.js y Ruby on Rails a nivel senior, con énfasis en performance, seguridad y patrones avanzados.

### 🟢 Node.js Nivel Senior

**Carpeta:** [`/Backend/step-1/node/`](./Backend/step-1/node/)

**Por qué estudiar esto:**
- Event Loop es pregunta #1 en entrevistas Node.js
- Async patterns, error handling, performance son diferenciadores senior
- Express/Nest/Fastify - conocer trade-offs demuestra experiencia

**Orden de estudio:**

#### 2.1 Runtime y Event Loop (CRÍTICO ⭐⭐⭐)
1. [Event Loop profundo](./Backend/step-1/node/01-runtime/event-loop-profundo.md) - Fases, microtasks, macrotasks
2. [Single-thread vs Multi-process](./Backend/step-1/node/01-runtime/single-thread-vs-multi-process.md)
3. [Cuándo Node se bloquea](./Backend/step-1/node/01-runtime/cuando-node-se-bloquea.md)

#### 2.2 Sistema de Módulos
1. [CommonJS vs ESM](./Backend/step-1/node/02-modulos/commonjs-vs-esm.md) ⭐
2. [Resolución de módulos](./Backend/step-1/node/02-modulos/resolucion-modulos.md)
3. [Interoperabilidad CJS ↔ ESM](./Backend/step-1/node/02-modulos/interoperabilidad.md)

#### 2.3 APIs Nativas
1. [File System (fs)](./Backend/step-1/node/03-apis-nativas/fs-file-system.md) - Sync vs Async vs Streams
2. [Crypto](./Backend/step-1/node/03-apis-nativas/crypto.md) - Hashing, encryption
3. [Child Process y Cluster](./Backend/step-1/node/03-apis-nativas/child-process-cluster.md)
4. [Process y Buffer](./Backend/step-1/node/03-apis-nativas/process-buffer.md)

#### 2.4 Asincronía Avanzada (CRÍTICO ⭐⭐⭐)
1. [Callbacks → Promises → Async/Await](./Backend/step-1/node/04-asincronia-avanzada/callbacks-promises-async.md)
2. [Error Handling asíncrono](./Backend/step-1/node/04-asincronia-avanzada/error-handling.md)
3. [Promise Combinators](./Backend/step-1/node/04-asincronia-avanzada/promise-combinators.md) - all, allSettled, race, any
4. [Backpressure en Streams](./Backend/step-1/node/04-asincronia-avanzada/backpressure-streams.md)

#### 2.5 Frameworks
1. [Express Senior](./Backend/step-1/node/06-frameworks/express-senior.md)
2. [Nest.js](./Backend/step-1/node/06-frameworks/nestjs.md) - DI, decorators, modules
3. [Fastify](./Backend/step-1/node/06-frameworks/fastify.md) - Performance vs Express

#### 2.6 Errores y Estabilidad (CRÍTICO para producción ⭐⭐⭐)
1. [Global Error Handling](./Backend/step-1/node/07-errores-estabilidad/global-error-handling.md)
2. [Uncaught Exceptions](./Backend/step-1/node/07-errores-estabilidad/uncaught-exceptions.md)
3. [Graceful Shutdown](./Backend/step-1/node/07-errores-estabilidad/graceful-shutdown.md) ⭐

#### 2.7 Performance
1. [Event Loop Monitoring](./Backend/step-1/node/08-performance/event-loop-monitoring.md)
2. [Clustering](./Backend/step-1/node/08-performance/clustering.md)
3. [Profiling y Memory](./Backend/step-1/node/08-performance/profiling-memory.md)

#### 2.8 Databases + Node
1. [ORMs vs Query Builders](./Backend/step-1/node/10-databases/orms-query-builders.md)
2. [Transacciones y Pooling](./Backend/step-1/node/10-databases/transactions-pooling.md)
3. [Problema N+1](./Backend/step-1/node/10-databases/n-plus-one.md) ⭐

**⏱️ Tiempo Node.js:** 7 días

---

### 🟥 Ruby on Rails Nivel Senior

**Carpeta:** [`/Backend/step-1/ruby-rails/`](./Backend/step-1/ruby-rails/)

**Por qué estudiar esto:**
- ActiveRecord, Sidekiq, Action Cable son REQUISITOS explícitos
- Rails convention over configuration - framework muy opinionado
- Background jobs y WebSockets son diferenciadores senior

**Orden de estudio:**

#### 2.9 Ruby Fundamentos
1. [Tipos de datos](./Backend/step-1/ruby-rails/01-ruby-fundamentos/tipos-datos.md)
2. [Clases y objetos](./Backend/step-1/ruby-rails/01-ruby-fundamentos/clases-objetos.md)
3. [Bloques, Procs, Lambdas](./Backend/step-1/ruby-rails/01-ruby-fundamentos/bloques-procs-lambdas.md) ⭐
4. [Módulos](./Backend/step-1/ruby-rails/01-ruby-fundamentos/modulos.md)

#### 2.10 Rails Básico
1. [¿Qué es Rails?](./Backend/step-1/ruby-rails/02-rails-basico/que-es-rails.md)
2. [MVC](./Backend/step-1/ruby-rails/02-rails-basico/mvc.md)
3. [Estructura del proyecto](./Backend/step-1/ruby-rails/02-rails-basico/estructura-proyecto.md)

#### 2.11 ActiveRecord (CRÍTICO ⭐⭐⭐)
**Básico:**
1. [CRUD básico](./Backend/step-1/ruby-rails/04-activerecord-basico/crud-basico.md)
2. [Queries](./Backend/step-1/ruby-rails/04-activerecord-basico/queries.md)
3. [Validaciones](./Backend/step-1/ruby-rails/04-activerecord-basico/validaciones.md)
4. [Callbacks](./Backend/step-1/ruby-rails/04-activerecord-basico/callbacks.md)
5. [Scopes](./Backend/step-1/ruby-rails/04-activerecord-basico/scopes.md)

**Avanzado:**
1. [Queries complejas](./Backend/step-1/ruby-rails/11-activerecord-avanzado/queries-complejas.md)
2. [N+1 problem](./Backend/step-1/ruby-rails/11-activerecord-avanzado/n-plus-one.md) ⭐
3. [Transacciones](./Backend/step-1/ruby-rails/11-activerecord-avanzado/transacciones.md)
4. [Scopes avanzados](./Backend/step-1/ruby-rails/11-activerecord-avanzado/scopes-avanzados.md)

#### 2.12 Asociaciones
1. [Tipos de asociaciones](./Backend/step-1/ruby-rails/05-asociaciones/tipos-asociaciones.md)
2. [has_many :through](./Backend/step-1/ruby-rails/05-asociaciones/has-many-through.md)
3. [Asociaciones polimórficas](./Backend/step-1/ruby-rails/05-asociaciones/polimorficas.md)
4. [Carga eficiente](./Backend/step-1/ruby-rails/05-asociaciones/carga-eficiente.md) - includes, joins, eager_load

#### 2.13 Performance Rails
1. [Caching](./Backend/step-1/ruby-rails/12-performance/caching.md) ⭐
2. [Paginación](./Backend/step-1/ruby-rails/12-performance/paginacion.md)

#### 2.14 Sidekiq - Background Jobs (REQUISITO CRÍTICO ⭐⭐⭐)
1. [Sidekiq setup](./Backend/step-1/ruby-rails/26-background-jobs/sidekiq.md)
   - Async job processing
   - Job queues y prioridades
   - Retry strategies
   - Monitoring

#### 2.15 Action Cable - WebSockets (REQUISITO CRÍTICO ⭐⭐⭐)
1. [Channels](./Backend/step-1/ruby-rails/19-actioncable/channels.md)
   - Real-time communication
   - Broadcasting
   - Stream from/to channels
   - Authentication

#### 2.16 Testing Rails
1. [RSpec setup](./Backend/step-1/ruby-rails/10-testing/rspec-setup.md)
2. [Model specs](./Backend/step-1/ruby-rails/10-testing/model-specs.md)
3. [Request specs](./Backend/step-1/ruby-rails/10-testing/request-specs.md)
4. [FactoryBot](./Backend/step-1/ruby-rails/10-testing/factory-bot.md)

**⏱️ Tiempo Rails:** 7 días

---

### 🔐 Seguridad Backend

**Carpetas:** [`/Backend/step-1/PatronesSeguridad/`](./Backend/step-1/PatronesSeguridad/) y [`/Seguridad/`](./Seguridad/)

**Por qué estudiar esto:**
- OWASP Top 10 es pregunta estándar en entrevistas senior
- JWT, OAuth, sanitization son CRÍTICOS
- Rate limiting, CSRF, XSS prevención

**Orden de estudio:**

1. **Básicos de Seguridad:**
   - [Authentication vs Authorization](./Backend/step-1/PatronesSeguridad/01-authentication-vs-authorization.md)
   - [Password Hashing](./Backend/step-1/PatronesSeguridad/04-password-hashing.md) - bcrypt, argon2
   - [JWT y Sessions](./Backend/step-1/PatronesSeguridad/05-jwt-sessions-tokens.md) ⭐

2. **Input Validation:**
   - [Input Validation & Sanitization](./Backend/step-1/PatronesSeguridad/03-input-validation-sanitization.md) ⭐
   - [Zod](./Backend/step-1/PatronesSeguridad/Auth/validacion-zod.md) - Schema validation
   - [SQL Injection & XSS](./Backend/step-1/PatronesSeguridad/06-sql-injection-xss.md)

3. **Headers y Protección:**
   - [Helmet.js](./Backend/step-1/PatronesSeguridad/Helmet.md) - Security headers
   - [CORS vs CSP](./Backend/step-1/PatronesSeguridad/13-cors-vs-csp.md)
   - [CSRF Protection](./Backend/step-1/PatronesSeguridad/10-csrf-protection.md)

4. **Rate Limiting:**
   - [Rate Limiting](./Backend/step-1/PatronesSeguridad/09-rate-limiting.md) ⭐

5. **Autenticación Avanzada:**
   - [OAuth Flow](./Backend/step-1/PatronesSeguridad/Auth/oauth-flow.md)
   - [Refresh Tokens](./Backend/step-1/PatronesSeguridad/Auth/refresh-tokens.md)
   - [JWT Middleware](./Backend/step-1/PatronesSeguridad/Auth/auth-middleware.md)

**⏱️ Tiempo:** 3 días

---

## 📚 FASE 3: DATABASES, CACHING & PERFORMANCE (Semanas 5-6)

> **Objetivo:** Dominar PostgreSQL, Redis, optimización de queries, caching strategies, y performance tuning.

### 🐘 PostgreSQL Profesional

**Carpeta:** [`/Backend/step-1/PostgreSQL/`](./Backend/step-1/PostgreSQL/)

**Por qué estudiar esto:**
- Índices y query optimization son CRÍTICOS para escalabilidad
- Transactions, MVCC, locks - conceptos senior
- Sequelize ORM es estándar en Node.js

**Orden de estudio:**

#### 3.1 Fundamentos PostgreSQL
1. [Fundamentos](./Backend/step-1/PostgreSQL/fundamentos/README.md)
2. [Tipos de datos](./Backend/step-1/PostgreSQL/tipos-datos/README.md)
3. [Modelado de datos](./Backend/step-1/PostgreSQL/modelado/README.md)

#### 3.2 Índices (CRÍTICO ⭐⭐⭐)
1. [Índices](./Backend/step-1/PostgreSQL/indices/README.md)
   - B-tree, Hash, GIN, GiST
   - Cuándo y cómo usar índices
   - Índices compuestos
   - EXPLAIN ANALYZE

#### 3.3 Queries Avanzadas
1. [Queries avanzadas](./Backend/step-1/PostgreSQL/queries-avanzadas/README.md)
   - JOINs, subqueries, CTEs
   - Window functions
   - Agregaciones complejas

#### 3.4 Transacciones (CRÍTICO ⭐⭐⭐)
1. [Transacciones](./Backend/step-1/PostgreSQL/transacciones/README.md)
   - ACID properties
   - Isolation levels
   - Deadlocks y rollbacks
2. [MVCC](./Backend/step-1/PostgreSQL/mvcc/README.md) - Multi-Version Concurrency Control

#### 3.5 Performance
1. [Performance](./Backend/step-1/PostgreSQL/performance/README.md)
   - Query optimization
   - Connection pooling
   - Vacuuming y autovacuum
2. [Antipatrones](./Backend/step-1/PostgreSQL/antipatrones/README.md)

#### 3.6 Sequelize ORM (Node.js)
**Carpeta:** [`/Backend/step-1/PostgreSQL/sequelize/`](./Backend/step-1/PostgreSQL/sequelize/)

1. [Modelos](./Backend/step-1/PostgreSQL/sequelize/modelos/README.md)
2. [Asociaciones](./Backend/step-1/PostgreSQL/sequelize/asociaciones/README.md)
3. [Queries avanzadas](./Backend/step-1/PostgreSQL/sequelize/queries-avanzadas/README.md)
4. [Transacciones](./Backend/step-1/PostgreSQL/sequelize/transacciones/README.md)
5. [Performance](./Backend/step-1/PostgreSQL/sequelize/performance/README.md) ⭐
6. [Migraciones](./Backend/step-1/PostgreSQL/sequelize/migraciones/README.md)

**⏱️ Tiempo PostgreSQL:** 5 días

---

### 🔴 Redis & ElastiCache

**Carpeta:** [`/Backend/step-1/Redis-Caching/`](./Backend/step-1/Redis-Caching/)

**Por qué estudiar esto:**
- Redis es estándar para caching y session storage
- ElastiCache (AWS managed Redis) es requisito explícito
- Pub/Sub patterns, rate limiting, query caching

**Orden de estudio:**

1. [Fundamentos de Redis](./Backend/step-1/Redis-Caching/01-fundamentos-redis.md)
2. [Redis en Node.js](./Backend/step-1/Redis-Caching/02-redis-nodejs.md) ⭐
3. [Session Storage](./Backend/step-1/Redis-Caching/04-session-storage.md)
4. [Query Caching](./Backend/step-1/Redis-Caching/05-query-caching.md) ⭐
5. [Cache Invalidation](./Backend/step-1/Redis-Caching/06-cache-invalidation.md) ⭐ (Estrategias críticas)
6. [Pub/Sub Patterns](./Backend/step-1/Redis-Caching/07-pubsub-patterns.md)
7. [Rate Limiting con Redis](./Backend/step-1/Redis-Caching/08-redis-rate-limiting.md)
8. [Clustering y Replicación](./Backend/step-1/Redis-Caching/09-redis-clustering.md)
9. [Best Practices](./Backend/step-1/Redis-Caching/12-best-practices.md)

**⏱️ Tiempo:** 4 días

---

### ⚡ Performance y Escalabilidad

**Carpetas:** [`/Performance/`](./Performance/), [`/Backend/step-1/PatronesPerformance/`](./Backend/step-1/PatronesPerformance/)

**Por qué estudiar esto:**
- Diferencia entre mid y senior: pensar en escalabilidad
- Caching, pagination, indexing son preguntas obligatorias
- Connection pooling, lazy loading, debouncing

**Orden de estudio:**

#### 3.7 Patrones de Performance
1. [Caching Pattern](./Backend/step-1/PatronesPerformance/01-caching-pattern.md) ⭐
2. [Lazy Loading](./Backend/step-1/PatronesPerformance/02-lazy-loading-pattern.md)
3. [Eager Loading](./Backend/step-1/PatronesPerformance/03-eager-loading-pattern.md)
4. [Pagination Pattern](./Backend/step-1/PatronesPerformance/04-pagination-pattern.md) ⭐
5. [Batch Processing](./Backend/step-1/PatronesPerformance/05-batch-processing-pattern.md)
6. [Debounce Pattern](./Backend/step-1/PatronesPerformance/08-debounce-pattern.md)
7. [Connection Pooling](./Backend/step-1/PatronesPerformance/14-connection-pooling-pattern.md) ⭐
8. [Indexing Pattern](./Backend/step-1/PatronesPerformance/19-indexing-pattern.md)

#### 3.8 Performance Web y Database
1. [Performance Web](./Performance/web.md)
2. [Performance Backend](./Performance/backend.md)
3. [Performance Database](./Performance/database.md) ⭐

**⏱️ Tiempo:** 3 días

---

### 📊 Datos, Consistencia y Escalabilidad

**Carpetas:** [`/DatosConsistencia/`](./DatosConsistencia/), [`/Escalabilidad/`](./Escalabilidad/)

**Por qué estudiar esto:**
- CQRS, sharding, replicas - arquitectura de sistemas distribuidos
- Normalization vs denormalization trade-offs
- CAP theorem, eventual consistency

**Orden de estudio:**

1. [Índices](./DatosConsistencia/Indices.md) - Tipos, estrategias
2. [Normalization](./DatosConsistencia/Normalizacion.md) ⭐
3. [Read Replicas](./DatosConsistencia/ReadReplicas.md)
4. [Sharding](./DatosConsistencia/Sharding.md) ⭐
5. [SQL vs NoSQL](./DatosConsistencia/SQLvsNoSQL.md)
6. [CAP Theorem](./DatosConsistencia/CAP.md)
7. [Transacciones Distribuidas](./DatosConsistencia/TransaccionesDistribuidas.md)

**Archivos raíz importantes:**
- [Idempotencia](./Idenpotencia.md) ⭐
- [Bloqueo optimista vs pesimista](./bloqueo_optimista_vs_pesimista_operaciones.md)

**⏱️ Tiempo:** 3 días

---

## 📚 FASE 4: FRONTEND AVANZADO & NEXT.JS (Semana 7)

> **Objetivo:** Dominar Next.js 14/15 con App Router, SSR/SSG/ISR, Server Components, y deployment.

### ⚡ Next.js Nivel Senior (REQUISITO CRÍTICO ⭐⭐⭐)

**Carpeta:** [`/reactjs/Next/`](./reactjs/Next/)

**Por qué estudiar esto:**
- Next.js es REQUISITO PRINCIPAL de la entrevista
- SSR, SSG, ISR son diferenciadores entre mid y senior
- Server Components (React 18/19) son el futuro
- Performance, SEO, caching strategies

**Orden de estudio:**

1. [App Router](./reactjs/Next/01-app-router.md) ⭐ - File-based routing, layouts
2. [Server Components](./reactjs/Next/02-server-components.md) ⭐⭐⭐ (CRÍTICO)
   - RSC vs Client Components
   - Cuándo usar cada uno
   - Hidratación
3. [Data Fetching](./reactjs/Next/03-data-fetching.md) ⭐⭐⭐
   - fetch() en Server Components
   - Request memoization
   - Parallel data fetching
4. [Cache y Revalidation](./reactjs/Next/04-cache-revalidacion.md) ⭐⭐⭐ (MUY IMPORTANTE)
   - Cache strategies (force-cache, no-store, revalidate)
   - ISR (Incremental Static Regeneration)
   - On-demand revalidation
5. [Rendering Strategies](./reactjs/Next/05-rendering-strategies.md) ⭐⭐⭐
   - SSR (Server-Side Rendering)
   - SSG (Static Site Generation)
   - ISR (Incremental Static Regeneration)
   - CSR (Client-Side Rendering)
   - Trade-offs de cada estrategia
6. [Middleware y Edge](./reactjs/Next/06-middleware-edge.md)
   - Edge Runtime
   - Middleware para auth, redirects
7. [API Routes](./reactjs/Next/07-api-routes.md)
   - Route Handlers
   - REST API en Next.js
8. [SEO](./reactjs/Next/08-seo.md) - Metadata API, sitemap, robots
9. [Performance](./reactjs/Next/09-performance.md) ⭐
   - Image optimization
   - Font optimization
   - Script optimization
10. [Seguridad](./reactjs/Next/10-seguridad.md)
11. [Server Actions](./reactjs/Next/11-server-actions.md) ⭐ - Mutations sin API routes
12. [Deploy y Runtime](./reactjs/Next/12-deploy-runtime.md)

**Routing Avanzado:**
- [Dynamic Routes](./reactjs/Next/RoutingAvanzado/DynamicRoutes.md)
- [Parallel Routes](./reactjs/Next/RoutingAvanzado/ParallelRoutes.md)
- [Intercepting Routes](./reactjs/Next/RoutingAvanzado/InterceptingRoutes.md)
- [Route Groups](./reactjs/Next/RoutingAvanzado/RouteGroups.md)

**⏱️ Tiempo:** 6 días

---

### 🎨 State Management Avanzado

**Por qué estudiar esto:**
- Redux es pregunta común (aunque menos usado en Next.js con Server Components)
- Context API + useReducer es el estándar moderno
- Zustand/Jotai son alternativas modernas

**Contenido nuevo a agregar:**
1. **Redux Toolkit** (nuevo) ⭐
   - Store, slices, reducers
   - Async thunks
   - RTK Query
2. **Context API avanzado** (ya existe en [`/reactjs/context-api.md`](./reactjs/context-api.md))
3. **State Management Patterns** (nuevo)
   - Cuándo usar cada solución
   - Server State vs Client State
   - Trade-offs

**⏱️ Tiempo:** 2 días

---

## 📚 FASE 5: ARQUITECTURA & MICROSERVICIOS (Semana 8)

> **Objetivo:** Pensar como arquitecto senior - microservicios, event-driven, CQRS, patrones de integración.

### 🏗️ Arquitectura de Software

**Carpetas:** [`/Arquitectura/`](./Arquitectura/), [`/Diseno/`](./Diseno/)

**Por qué estudiar esto:**
- Diferencia principal entre mid y senior: pensamiento arquitectónico
- SOLID, Clean Architecture, DDD son fundamentos
- Microservicios, CQRS, Event Sourcing son nivel senior+

**Orden de estudio:**

#### 5.1 Principios SOLID
**Carpeta:** [`/Solid/`](./Solid/)
1. [S - Single Responsibility](./Solid/S.md)
2. [O - Open/Closed](./Solid/O.md)
3. [L - Liskov Substitution](./Solid/L.md)
4. [I - Interface Segregation](./Solid/I.md)
5. [D - Dependency Inversion](./Solid/D.md)

#### 5.2 Patrones de Diseño
**Carpeta:** [`/Diseno/`](./Diseno/)

**Creacionales:**
1. [Singleton](./Diseno/Singleton.md)
2. [Factory](./Diseno/Factory.md)
3. [Builder](./Diseno/Builder.md)

**Estructurales:**
4. [Adapter](./Diseno/Adapter.md)
5. [Decorator](./Diseno/Decorator.md)
6. [Facade](./Diseno/Facade.md)

**Comportamiento:**
7. [Strategy](./Diseno/Strategy.md) ⭐
8. [Observer](./Diseno/Observer.md) ⭐
9. [Command](./Diseno/Command.md)
10. [State](./Diseno/State.md)

#### 5.3 Arquitecturas
**Carpeta:** [`/Arquitectura/`](./Arquitectura/)

1. [Clean Architecture](./Arquitectura/CleanArchitecture/CleanArchitecture.md) ⭐
2. [Hexagonal Architecture](./Arquitectura/HexagonalArchitecture/HexagonalArchitecture.md)
3. [DDD (Domain-Driven Design)](./Arquitectura/DDD/DDD.md)
4. [CQRS](./Arquitectura/CQRS/CQRS.md) ⭐⭐ (Separación Command/Query)
5. [Event Sourcing](./Arquitectura/EventSourcing/EventSourcing.md) ⭐⭐

#### 5.4 Patrones Arquitectónicos
1. [Repository Pattern](./Arquitectura/Repository/Repository.md)
2. [Unit of Work](./Arquitectura/UnitOfWork/UnitOfWork.md)
3. [Dependency Injection](./Arquitectura/DependencyInjection/DependencyInjection.md)
4. [Specification Pattern](./Arquitectura/Specification/Specification.md)

**⏱️ Tiempo:** 4 días

---

### 🔄 Microservicios e Integración

**Carpeta:** [`/Arquitectura/Microservicios/`](./Arquitectura/Microservicios/)

**Por qué estudiar esto:**
- Microservicios son pregunta obligatoria para senior
- Message queues, event-driven architecture
- API Gateways, service communication

**Orden de estudio:**

1. [Estructura de Microservicios](./Arquitectura/Microservicios/EstructuraMicroservicios.md)
2. **Message Queues** (nuevo - agregar)
   - RabbitMQ, Kafka
   - Pub/Sub patterns
   - Event-driven communication
3. **Webhooks** (nuevo - agregar)
   - Webhook patterns
   - Retry strategies
   - Security
4. **API Gateway** (nuevo - agregar)
   - Request routing
   - Rate limiting
   - Authentication
5. **Service Communication** (nuevo - agregar)
   - Request replay
   - Fire and forget
   - Circuit breaker

**⏱️ Tiempo:** 3 días

---

## 📚 FASE 6: DEVOPS & DEPLOYMENT (Semana 9)

> **Objetivo:** CI/CD, Docker, AWS, monitoring, y prácticas DevOps esenciales para seniors.

### 🐳 DevOps Esencial

**Carpeta:** [`/DevOps/`](./DevOps/)

**Por qué estudiar esto:**
- Docker es estándar para deployment
- CI/CD pipelines son requisito senior
- AWS conocimiento básico es esperado

**Orden de estudio:**

#### 6.1 Docker
**Carpeta:** [`/DevOps/Docker/`](./DevOps/Docker/)
1. Contenedores y Docker basics
2. Dockerfile y multi-stage builds
3. Docker Compose
4. Docker en producción

#### 6.2 CI/CD
1. [CI/CD Pipelines](./DevOps/CI-CD.md) ⭐
   - GitHub Actions
   - GitLab CI
   - Jenkins
2. [Pipelines](./DevOps/Pipelines/README.md)

#### 6.3 Observabilidad
1. [Observabilidad](./DevOps/Observabilidad.md)
   - Logs, metrics, traces
   - APM (Application Performance Monitoring)
2. [Contenedores](./DevOps/Contenedores.md)

#### 6.4 AWS Básico
**Carpeta:** [`/aws/`](./aws/)
1. [Cloud Computing](./aws/cloud-computing/README.md)
2. [S3](./aws/s3/README.md) - Object storage
3. [IAM](./aws/iam/README.md) - Permissions

**⏱️ Tiempo:** 4 días

---

### 🧪 Testing Profesional

**Carpeta:** [`/Testing/`](./Testing/)

**Por qué estudiar esto:**
- Testing es diferenciador clave entre mid y senior
- TDD, integration tests, E2E
- Code coverage y testing strategies

**Orden de estudio:**
1. Unit Testing (Jest, Vitest)
2. Integration Testing
3. E2E Testing (Cypress, Playwright)
4. TDD (Test-Driven Development)
5. Mocking strategies

**⏱️ Tiempo:** 2 días

---

## 📚 FASE 7: REPASO Y PRÁCTICA (Semanas 10-12)

> **Objetivo:** Consolidar conocimiento, practicar preguntas de entrevista, y llenar gaps.

### 🎯 Preguntas de Entrevista

**Carpeta:** [`/entrevista/`](./entrevista/)

**Orden de estudio:**
1. [Preguntas Senior](./entrevista/preguntas-sr.md) ⭐⭐⭐
2. [Preguntas Mid](./entrevista/preguntas-mid.md)
3. [Respuestas](./entrevista/respuestas.md)

### 🔄 Práctica Diaria Recomendada

#### Semana 10: Frontend Deep Dive
- Repasar React hooks avanzados
- Practicar Next.js con proyectos pequeños
- Server Components vs Client Components
- Caching strategies en Next.js

#### Semana 11: Backend Deep Dive
- Event Loop - explicar en whiteboard
- ActiveRecord queries complejas
- Sidekiq background jobs
- Redis caching patterns

#### Semana 12: System Design
- Diseñar APIs RESTful escalables
- Microservicios architecture
- Database design y normalization
- Caching strategies

---

## 📊 CHECKLIST DE PREPARACIÓN

### 🎨 Frontend (React/Next.js)

- [ ] **React Hooks:**
  - [ ] useState, useEffect explicados en profundidad
  - [ ] useMemo, useCallback - cuándo usar y por qué
  - [ ] useReducer para estado complejo
  - [ ] Custom hooks

- [ ] **Next.js 14/15:**
  - [ ] App Router vs Pages Router
  - [ ] Server Components vs Client Components
  - [ ] SSR vs SSG vs ISR - trade-offs
  - [ ] Data fetching patterns
  - [ ] Caching strategies (force-cache, no-store, revalidate)
  - [ ] Server Actions

- [ ] **State Management:**
  - [ ] Context API + useReducer
  - [ ] Redux Toolkit basics
  - [ ] Cuándo usar cada solución

- [ ] **Styling:**
  - [ ] Tailwind CSS utility-first
  - [ ] CSS-in-JS (styled-components)
  - [ ] Responsive design

### 🔧 Backend (Node.js)

- [ ] **Event Loop:**
  - [ ] Fases del Event Loop
  - [ ] Microtasks vs Macrotasks
  - [ ] setTimeout vs setImmediate vs process.nextTick
  - [ ] Cuándo Node se bloquea

- [ ] **Async Patterns:**
  - [ ] Callbacks → Promises → Async/Await
  - [ ] Error handling asíncrono
  - [ ] Promise.all, allSettled, race, any
  - [ ] Backpressure en streams

- [ ] **Express/Nest/Fastify:**
  - [ ] Middleware order
  - [ ] Error handling
  - [ ] Dependency Injection (Nest)

- [ ] **Error Handling:**
  - [ ] Global error handlers
  - [ ] Uncaught exceptions
  - [ ] Graceful shutdown

### 🟥 Backend (Ruby on Rails)

- [ ] **ActiveRecord:**
  - [ ] CRUD operations
  - [ ] Associations (has_many, belongs_to, through)
  - [ ] N+1 problem - includes, joins, eager_load
  - [ ] Scopes y queries complejas
  - [ ] Callbacks y validaciones

- [ ] **Sidekiq:**
  - [ ] Background job setup
  - [ ] Job queues y prioridades
  - [ ] Retry strategies
  - [ ] Monitoring

- [ ] **Action Cable:**
  - [ ] WebSocket channels
  - [ ] Broadcasting
  - [ ] Real-time communication

### 🗄️ Databases & Caching

- [ ] **PostgreSQL:**
  - [ ] Índices (B-tree, Hash, GIN, GiST)
  - [ ] EXPLAIN ANALYZE
  - [ ] Transactions y ACID
  - [ ] MVCC
  - [ ] Connection pooling

- [ ] **Sequelize/ActiveRecord:**
  - [ ] Migrations
  - [ ] Associations
  - [ ] Query optimization
  - [ ] N+1 problem

- [ ] **Redis:**
  - [ ] Data structures (Strings, Lists, Sets, Hashes)
  - [ ] Session storage
  - [ ] Query caching
  - [ ] Cache invalidation strategies
  - [ ] Pub/Sub patterns
  - [ ] Rate limiting

### 🔐 Seguridad

- [ ] **Authentication:**
  - [ ] JWT vs Sessions
  - [ ] OAuth flow
  - [ ] Password hashing (bcrypt, argon2)
  - [ ] Refresh tokens

- [ ] **Input Validation:**
  - [ ] Sanitization
  - [ ] Zod schema validation
  - [ ] SQL Injection prevention
  - [ ] XSS prevention

- [ ] **Headers & Protection:**
  - [ ] Helmet.js
  - [ ] CORS
  - [ ] CSRF protection
  - [ ] Rate limiting

### ⚡ Performance & Escalabilidad

- [ ] **Caching:**
  - [ ] Cache strategies (LRU, TTL)
  - [ ] Cache invalidation
  - [ ] CDN

- [ ] **Database:**
  - [ ] Indexing strategies
  - [ ] Query optimization
  - [ ] Connection pooling
  - [ ] Read replicas
  - [ ] Sharding

- [ ] **Patterns:**
  - [ ] Lazy loading vs Eager loading
  - [ ] Pagination
  - [ ] Batch processing
  - [ ] Debouncing

### 🏗️ Arquitectura

- [ ] **SOLID:**
  - [ ] Explicar cada principio con ejemplo

- [ ] **Patrones de Diseño:**
  - [ ] Singleton, Factory, Strategy, Observer

- [ ] **Arquitecturas:**
  - [ ] Clean Architecture
  - [ ] CQRS
  - [ ] Event Sourcing
  - [ ] Microservicios

### 🐳 DevOps

- [ ] **Docker:**
  - [ ] Dockerfile
  - [ ] Multi-stage builds
  - [ ] Docker Compose

- [ ] **CI/CD:**
  - [ ] GitHub Actions
  - [ ] Pipeline básico

- [ ] **Monitoring:**
  - [ ] Logs
  - [ ] Metrics
  - [ ] APM

---

## 🎓 PREGUNTAS CLAVE DE ENTREVISTA SENIOR

### Frontend

1. **"Explica la diferencia entre Server Components y Client Components en Next.js"**
   - RSC rendering, hidratación, cuándo usar cada uno

2. **"¿Cuál es la diferencia entre SSR, SSG e ISR en Next.js?"**
   - Trade-offs, performance, SEO

3. **"¿Cómo optimizarías el rendimiento de una aplicación React?"**
   - useMemo, useCallback, React.memo, code splitting, lazy loading

4. **"¿Cuándo usarías Context API vs Redux?"**
   - Complejidad del estado, performance, debugging

### Backend (Node.js)

1. **"Explica el Event Loop de Node.js en detalle"**
   - Fases: timers, pending callbacks, idle, poll, check, close
   - Microtasks vs macrotasks

2. **"¿Cómo manejarías errores no capturados en producción?"**
   - uncaughtException, unhandledRejection, graceful shutdown

3. **"¿Cuál es la diferencia entre clustering y worker threads?"**
   - I/O-bound vs CPU-intensive

4. **"¿Cómo implementarías rate limiting?"**
   - Redis, sliding window, token bucket

### Backend (Ruby on Rails)

1. **"Explica el problema N+1 y cómo resolverlo en ActiveRecord"**
   - includes, joins, eager_load, preload

2. **"¿Cómo funcionan los background jobs en Sidekiq?"**
   - Job queues, Redis, retry strategies

3. **"Explica Action Cable y cuándo lo usarías"**
   - WebSockets, real-time features, channels, broadcasting

### Databases

1. **"¿Cómo decidirías qué índice crear en una tabla?"**
   - EXPLAIN ANALYZE, query patterns, composite indexes

2. **"Explica MVCC en PostgreSQL"**
   - Multi-Version Concurrency Control, snapshots

3. **"¿Cuáles son las estrategias de cache invalidation?"**
   - TTL, event-based, manual, lazy

### Arquitectura

1. **"¿Cuándo usarías microservicios vs monolito?"**
   - Team size, complexity, deployment, trade-offs

2. **"Explica CQRS y cuándo lo usarías"**
   - Command Query Responsibility Segregation, read/write separation

3. **"¿Cómo diseñarías un sistema de rate limiting distribuido?"**
   - Redis, sliding window, distributed rate limiter

---

## 🚀 RUTINA DE ESTUDIO DIARIA RECOMENDADA

### Estructura Diaria (6-8 horas)

**Mañana (3-4 horas):**
- 📖 **Lectura y teoría** (2 horas)
  - Leer documentación de este repo
  - Tomar notas de conceptos clave
- 💻 **Práctica de código** (1-2 horas)
  - Implementar ejemplos del material
  - Crear mini-proyectos

**Tarde (3-4 horas):**
- 🧠 **Deep dive técnico** (2 horas)
  - Profundizar en temas complejos
  - Ver documentación oficial
- 🎯 **Preguntas de entrevista** (1 hora)
  - Practicar respuestas en voz alta
  - Simular whiteboard coding
- 📝 **Repaso y flashcards** (30 min)

**Noche (1 hora):**
- 🔄 **Repaso del día**
- ✅ **Actualizar checklist**

---

## 🎯 PRIORIDADES ABSOLUTAS (Si tienes poco tiempo)

Si solo tienes **2-3 semanas**, enfócate en:

### ⭐⭐⭐ CRÍTICO (80% del valor):

1. **Next.js completo** (Server Components, SSR/SSG/ISR, caching)
2. **Node.js Event Loop** (fases, async patterns)
3. **ActiveRecord avanzado** (N+1, includes, scopes)
4. **Sidekiq** (background jobs)
5. **Action Cable** (WebSockets)
6. **Redis caching** (strategies, invalidation)
7. **PostgreSQL indexes** (EXPLAIN ANALYZE)
8. **JWT authentication**
9. **Error handling** (global, graceful shutdown)
10. **SOLID principles**

### ⭐⭐ MUY IMPORTANTE (15% del valor):

11. **CQRS y Event Sourcing** (conceptos)
12. **Microservicios basics**
13. **Docker basics**
14. **Security headers** (Helmet, CORS, CSRF)
15. **Performance patterns** (pagination, lazy loading)

### ⭐ BUENO SABER (5% del valor):

16. **Patrones de diseño** (Strategy, Observer)
17. **Testing avanzado**
18. **AWS basics**

---

## 📌 RECURSOS ADICIONALES

### Documentación Oficial
- **React:** https://react.dev/
- **Next.js:** https://nextjs.org/docs
- **Node.js:** https://nodejs.org/docs/
- **Ruby on Rails:** https://guides.rubyonrails.org/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Redis:** https://redis.io/docs/

### Libros Recomendados
- "Designing Data-Intensive Applications" - Martin Kleppmann
- "Node.js Design Patterns" - Mario Casciaro
- "The Pragmatic Programmer" - Hunt & Thomas

### YouTube Channels
- Fireship (conceptos rápidos)
- Theo - t3.gg (Next.js, full-stack)
- Hussein Nasser (backend, databases)

---

## ✅ CRITERIOS DE ÉXITO

Sabrás que estás listo cuando puedas:

1. ✅ Explicar Event Loop en whiteboard sin notas
2. ✅ Diseñar una API RESTful escalable desde cero
3. ✅ Implementar caching con Redis (código real)
4. ✅ Optimizar queries PostgreSQL con EXPLAIN ANALYZE
5. ✅ Crear Server Components en Next.js
6. ✅ Configurar Sidekiq para background jobs
7. ✅ Implementar WebSockets con Action Cable
8. ✅ Explicar trade-offs SSR vs SSG vs ISR
9. ✅ Diseñar sistema de authentication con JWT
10. ✅ Explicar CQRS y cuándo usarlo

---

## 🎉 MENSAJE FINAL

Este repositorio contiene **TODO** lo que necesitas. No busques más recursos - enfócate en **dominar** lo que está aquí.

**Principios para el éxito:**
1. **Profundidad > Amplitud**: Mejor dominar 10 temas que conocer 50 superficialmente
2. **Práctica > Teoría**: Escribe código real, no solo leas
3. **Explica en voz alta**: Si no puedes explicarlo, no lo entiendes
4. **Simula entrevistas**: Practica con whiteboard y timer

**¡Mucha suerte en tu entrevista! 🚀**

---

**Última actualización:** 2026-02-20
**Versión:** 1.0
