# 🚀 Roadmap Completo C#/.NET Backend  
## **Junior → Mid → Senior**  

Este roadmap garantiza un aprendizaje estructurado y progresivo para convertirte en desarrollador backend profesional con C# y .NET.

---

## 🔹 **NIVEL JUNIOR – FUNDAMENTOS SÓLIDOS**  
*Duración estimada: 4-6 meses*

### **1️⃣ Fundamentos de Programación (OBLIGATORIO)**
- Qué es un programa, compilación y CLR
- Variables y tipos de datos
- Tipos de valor vs referencia
- Operadores (aritméticos, lógicos, comparación)
- Control de flujo
  - `if` / `else`
  - `switch`
  - `for`, `foreach`, `while`, `do-while`
- Métodos
  - Parámetros
  - Retorno
  - Sobrecarga
- **Agregado:**
  - Expresiones vs sentencias
  - Scope de variables
  - Comentarios y documentación básica

### **2️⃣ C# Básico**
- Sintaxis del lenguaje
- Convenciones de nombres
- `var` vs tipos explícitos
- Nullable types (`?`)
- Casting implícito y explícito
- `enum`
- `struct`
- **Agregado:**
  - `using` statements y gestión de recursos
  - Propiedades autoimplementadas
  - Métodos de extensión básicos

### **3️⃣ Programación Orientada a Objetos (POO)**
- Clases y objetos
- Encapsulación
- Herencia
- Polimorfismo
- Abstracción
- `interface` vs `abstract class`
- Modificadores de acceso
  - `public`, `private`, `protected`, `internal`
- **Agregado:**
  - Constructores (por defecto, parametrizados, estáticos)
  - `static` classes y miembros
  - Propiedades y indexadores
  - `sealed` y `virtual`

### **4️⃣ Manejo de Colecciones**
- Arrays
- `List<T>`
- `Dictionary<TKey, TValue>`
- `Queue`, `Stack`
- `IEnumerable` vs `ICollection` vs `IList`
- **Agregado:**
  - `HashSet<T>`
  - `LinkedList<T>`
  - Iteradores básicos (`yield return`)

### **5️⃣ Manejo de Errores**
- `try` / `catch` / `finally`
- Excepciones comunes
- Crear excepciones personalizadas
- **Agregado:**
  - `throw` vs `throw ex`
  - `AggregateException`
  - Logging básico de excepciones

### **6️⃣ LINQ (Básico)**
- `Where`, `Select`
- `First`, `FirstOrDefault`
- `Any`, `All`
- `OrderBy`
- Proyección
- **Agregado:**
  - `Skip` y `Take`
  - `Count` vs `Any` para verificar existencia
  - LINQ con colecciones en memoria

### **7️⃣ .NET Básico**
- .NET SDK
- `dotnet` CLI
- Estructura de un proyecto
- `Program.cs`
- Namespaces
- Dependencias (NuGet)
- **Agregado:**
  - Tipos de proyectos (Class Library, Console, Web API)
  - `.csproj` y gestión de paquetes

### **8️⃣ Introducción a Backend**
- Qué es HTTP
- REST
- Métodos HTTP
- Status Codes
- JSON
- **Agregado:**
  - Headers comunes
  - CORS básico
  - Herramientas: Postman, curl

### **9️⃣ ASP.NET Core – Básico**
- Crear Web API
- Controllers
- Routing
- Model Binding
- DTOs
- Swagger
- **Agregado:**
  - `[ApiController]` y `[Route]`
  - Validación con `[Required]`, `[MaxLength]`

### **🔟 Bases de Datos (Básico)**
- Qué es una base de datos
- SQL básico
- CRUD
- Introducción a Entity Framework Core
- **Agregado:**
  - Diseño de tablas básicas (PK, FK)
  - Transacciones básicas

👉 **Resultado Junior:** Puedes crear APIs simples, entender código existente y realizar CRUDs básicos con bases de datos.

---

## 🔸 **NIVEL MID – DESARROLLADOR PROFESIONAL**  
*Duración estimada: 6-8 meses*

### **1️⃣1️⃣ C# Intermedio**
- Records
- Init-only properties
- Pattern Matching
- `ValueTask`
- Tuplas
- `Span<T>` / `Memory<T>` (conceptos)
- **Agregado:**
  - Nullable reference types y análisis de nulabilidad
  - Expresiones `nameof`, `default`
  - Delegados y eventos

### **1️⃣2️⃣ LINQ Avanzado**
- `GroupBy`
- `Join`
- `SelectMany`
- Expresiones lambda complejas
- `IQueryable` vs `IEnumerable`
- **Agregado:**
  - LINQ con expresiones dinámicas
  - Performance de LINQ en colecciones grandes

### **1️⃣3️⃣ Async / Await y Concurrencia**
- `Task`
- `async` / `await`
- Deadlocks
- `Parallel`
- `Thread` vs `Task`
- `CancellationToken`
- **Agregado:**
  - `Task.WhenAll` / `Task.WhenAny`
  - `ConfigureAwait(false)`
  - `ValueTask` en escenarios de alto rendimiento

### **1️⃣4️⃣ ASP.NET Core – Intermedio**
- Middlewares
- Filtros
- Dependency Injection
- Configuración (`appsettings`)
- Logging
- Health Checks
- **Agregado:**
  - Model Binding avanzado
  - Versionado de APIs básico
  - Response Caching

### **1️⃣5️⃣ Entity Framework Core – Intermedio**
- `DbContext`
- Migrations
- Relaciones
- Lazy vs Eager Loading
- Tracking vs NoTracking
- Performance con EF
- **Agregado:**
  - Raw SQL y stored procedures
  - Configuración de relaciones (Fluent API)

### **1️⃣6️⃣ Arquitectura**
- Clean Architecture
- Onion Architecture
- Separation of Concerns
- DTOs vs Entities
- Capas
- **Agregado:**
  - Repository Pattern
  - Unit of Work

### **1️⃣7️⃣ Testing**
- Unit Testing
- xUnit / NUnit
- Moq
- Tests de integración
- Testing de APIs
- **Agregado:**
  - Test Doubles (Fakes, Mocks, Stubs)
  - Coverage y herramientas

### **1️⃣8️⃣ Seguridad**
- Autenticación
- Autorización
- JWT
- Roles y Claims
- Hashing
- HTTPS
- **Agregado:**
  - `[Authorize]` con políticas
  - Identity básico

### **1️⃣9️⃣ Git y Flujo de Trabajo**
- Git Flow
- Pull Requests
- Code Review
- Versionado semántico
- **Agregado:**
  - `.gitignore` y hooks
  - Resolución de conflictos avanzada

### **2️⃣0️⃣ Performance Básico**
- Caching
- Memory usage
- Response time
- Logging eficiente
- **Agregado:**
  - `StringBuilder` vs concatenación
  - Medición con `Stopwatch`

👉 **Resultado Mid:** Desarrollas APIs robustas, trabajas con arquitecturas limpias, implementas seguridad básica y colaboras eficientemente con Git.

---

## 🔺 **NIVEL SENIOR – EXPERTO Y ARQUITECTO**  
*Duración estimada: 12+ meses*

### **2️⃣1️⃣ C# Avanzado**
- CLR internals
- Garbage Collector
- Allocation
- `struct` vs `class` (performance)
- Unsafe code
- Memory management
- **Agregado:**
  - Source Generators
  - Reflection y expresiones IL

### **2️⃣2️⃣ ASP.NET Core Avanzado**
- Custom Middleware
- API Versioning
- Rate Limiting
- Background Services
- Hosted Services
- gRPC
- GraphQL
- **Agregado:**
  - Middleware pipeline avanzado
  - Response Compression
  - SignalR

### **2️⃣3️⃣ Arquitectura Avanzada**
- DDD
- CQRS
- Event Driven Architecture
- Microservicios
- Monolitos bien diseñados
- **Agregado:**
  - Hexagonal Architecture
  - Event Sourcing

### **2️⃣4️⃣ Mensajería y Procesos Asíncronos**
- RabbitMQ
- Kafka (conceptos)
- Background jobs
- Retry patterns
- **Agregado:**
  - Dead Letter Queues
  - Sagas para orquestación

### **2️⃣5️⃣ Seguridad Avanzada**
- OAuth2
- OpenID Connect
- Identity Server
- OWASP Top 10
- Protección de APIs
- **Agregado:**
  - Rate limiting avanzado
  - Auditoría de seguridad

### **2️⃣6️⃣ Escalabilidad y Cloud**
- Docker
- Kubernetes (conceptos)
- Azure / AWS
- CI/CD
- Observabilidad
- **Agregado:**
  - Service Mesh (Istio, Linkerd)
  - Infraestructura como código (Terraform)

### **2️⃣7️⃣ Performance Avanzado**
- Profiling
- Memory leaks
- BenchmarkDotNet
- Caching distribuido
- Redis
- **Agregado:**
  - Application Performance Management (APM)
  - Database sharding y replicación

### **2️⃣8️⃣ Buenas Prácticas Senior**
- Code Quality
- Refactorización
- Legacy Code
- Mentoring
- Documentación
- Decisiones técnicas
- **Agregado:**
  - Architectural Decision Records (ADR)
  - Tech Radar y evaluación de tecnologías

👉 **Resultado Senior:** Diseñas sistemas escalables, tomas decisiones arquitectónicas, lideras equipos e implementas soluciones empresariales complejas.

---

## 🧠 **EXTRA (TE DIFERENCIA)**
- Design Patterns
- SOLID profundo
- Refactoring avanzado
- Entender el negocio
- Comunicación técnica
- **Agregado:**
  - Event Storming
  - Stakeholder management
  - Presentaciones técnicas y charlas

---

## 📅 **Plan de Estudio Sugerido**

### **Fase 1: Junior (Meses 1-4)**
- **Semana 1-4:** Fundamentos de programación y C# básico
- **Semana 5-8:** POO y colecciones
- **Semana 9-12:** LINQ, manejo de errores y .NET básico
- **Semana 13-16:** Backend básico y ASP.NET Core

### **Fase 2: Mid (Meses 5-10)**
- **Mes 5-6:** C# intermedio y LINQ avanzado
- **Mes 7-8:** Async/Await y ASP.NET Core intermedio
- **Mes 9-10:** EF Core, arquitectura y testing

### **Fase 3: Senior (Meses 11-24)**
- **Mes 11-14:** C# avanzado y ASP.NET Core avanzado
- **Mes 15-18:** Arquitectura avanzada y mensajería
- **Mes 19-21:** Seguridad avanzada y cloud
- **Mes 22-24:** Performance, escalabilidad y prácticas senior

---

## 📚 **Recursos Recomendados**
### **Libros:**
- "C# in Depth" (Jon Skeet)
- "Clean Code" (Robert C. Martin)
- "Design Patterns: Elements of Reusable Object-Oriented Software"
- "Domain-Driven Design" (Eric Evans)
- "The Pragmatic Programmer"

### **Plataformas:**
- Microsoft Learn (gratis)
- Pluralsight
- YouTube (Nick Chapsas, CodeOpinion, Amir Touraj)
- Udemy (cursos de Mosh Hamedani, Neil Cummings)

### **Práctica:**
- Proyectos personales completos
- Contribuir a proyectos open source
- Katas de código (Codewars, LeetCode)
- Simulaciones de sistemas empresariales

### **Herramientas Esenciales:**
- Visual Studio 2022 / VS Code
- Postman / Insomnia
- SQL Server Management Studio / Azure Data Studio
- Docker Desktop
- Git + GitHub/GitLab

---

## 🎯 **Consejos Finales**
1. **Consistencia > Intensidad:** 1-2 horas diarias es mejor que 10 horas un fin de semana
2. **Aprender haciendo:** Cada concepto debe ir acompañado de código real
3. **Proyectos progresivos:** Comienza con una API simple y añade complejidad gradualmente
4. **Comunidad:** Únete a foros, Discord de .NET y asiste a meetups
5. **Mentoría:** Busca feedback constante de desarrolladores más experimentados

---

**Este roadmap es un documento vivo** - ajústalo según tu contexto, experiencia previa y objetivos específicos. ¡El viaje de Junior a Senior es un maratón, no un sprint! 🏃‍♂️💨

*¿Necesitas que desarrolle un plan detallado semana por semana o profundice en algún área específica?*