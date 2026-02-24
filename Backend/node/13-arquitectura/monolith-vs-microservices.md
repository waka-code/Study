# Monolith vs Microservices

## Monolith (Monolítica)

Una sola aplicación con toda la lógica:

```
┌─────────────────────────────────────┐
│       Monolith Application          │
├─────────────────────────────────────┤
│ Users Module                        │
│ Orders Module                       │
│ Products Module                     │
│ Payments Module                     │
│ Notifications Module                │
└─────────────────────────────────────┘
        │
        └──> Single Database
```

### Ventajas Monolith

✅ **Simplicidad**: Una sola codebase, deploy simple
✅ **Debugging**: Stack trace completo
✅ **Transacciones ACID**: Fáciles entre módulos
✅ **Performance**: Sin latencia de red entre componentes
✅ **Desarrollo inicial rápido**

### Desventajas Monolith

❌ **Escalado**: Solo puedes escalar todo (no módulos individuales)
❌ **Tecnología**: Atado a un stack (si usas Node, todo es Node)
❌ **Equipo**: Equipos grandes compiten por código
❌ **Deploys**: Cambio pequeño requiere deploy de todo
❌ **Fallos**: Error en un módulo afecta toda la app

### Ejemplo Monolith

```
project/
├── src/
│   ├── users/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   └── service.js
│   ├── orders/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   └── service.js
│   ├── products/
│   │   └── ...
│   ├── payments/
│   │   └── ...
│   └── app.js (une todo)
├── database.js
└── package.json
```

## Microservices (Microservicios)

Múltiples servicios pequeños, independientes:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ User Service │  │Order Service │  │Product Svc   │
│   (Node)     │  │   (Python)   │  │   (Java)     │
└──────────────┘  └──────────────┘  └──────────────┘
       │               │                    │
       └───────┬───────┴────────────────────┘
               │
         API Gateway
```

### Ventajas Microservices

✅ **Escalado independiente**: Solo escalar Users si necesita
✅ **Tecnología diversa**: Java, Python, Node en mismo sistema
✅ **Equipos autónomos**: Un equipo = un servicio
✅ **Deploys rápidos**: Cambio en Users no afecta Orders
✅ **Fallos aislados**: Orders puede fallar, Users sigue funcionando

### Desventajas Microservices

❌ **Complejidad operacional**: Muchos servicios que gestionar
❌ **Latencia de red**: Comunicación entre servicios
❌ **Transacciones distribuidas**: Difíciles de implementar
❌ **Debugging**: Stack trace fragmentado
❌ **Curva de aprendizaje**: DevOps, Docker, Kubernetes

## Cuándo Usar Cada Uno

### USA MONOLITH si:

- Startup pequeño (< 10 personas)
- MVP (Minimum Viable Product)
- Aplicación simple y pequeña
- Equipo va a escalar lentamente
- Presupuesto limitado

**Ejemplo**: App de blog, CRUD simple

### USA MICROSERVICES si:

- Aplicación grande y compleja
- Equipos múltiples (5+ equipos)
- Diferentes partes escalan diferente
- Necesitas tolerar fallos parciales
- Tecnologías diferentes por módulo

**Ejemplo**: Plataforma de e-commerce con millones de usuarios

## Evolución Típica

```
Monolith (Startup)
       │
       ├─ Crece ─> Modular Monolith
       │
       └─ Escala ─> Microservices
```

### Modular Monolith (Intermedio)

Mantiene monolith pero con módulos desacoplados:

```
Monolith (Node)
├── /users
│   ├── controller
│   ├── service
│   └── db (sqlite separate)
├── /orders
│   └── (similar, independent)
└── api-gateway (une todo)
```

Ventajas de ambos mundos:
- Fácil debugging (todo en una app)
- Escalabilidad parcial
- Preparación para microservices

## Patrones de Comunicación

### Microservices: Sincrónico (HTTP/gRPC)

```javascript
// User Service
const order = await fetch('http://orders-service/api/orders/123');

// Problema: Si Orders cae, User cae
```

### Microservices: Asincrónico (Message Queue)

```javascript
// User Service
eventBus.emit('user.created', { userId: 123 });

// Order Service (escucha)
eventBus.on('user.created', async (data) => {
  await notifyUser(data.userId);
});

// Ventaja: Desacoplado, Order puede estar down
```

## Estructura de Monolith Modular

```javascript
// src/app.js
const express = require('express');
const app = express();

// Cargar módulos
const userRoutes = require('./users/routes');
const orderRoutes = require('./orders/routes');

app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

app.listen(3000);
```

```javascript
// src/users/routes.js (Independiente)
const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/:id', controller.getUser);
router.post('/', controller.createUser);

module.exports = router;
```

## Patrón: Strangler Fig (Migración)

Gradualmente reemplazar monolith con microservices:

```
Fase 1:
API Gateway ─> Monolith

Fase 2:
API Gateway
├─> User Microservice (migrado)
└─> Monolith (Orders, Products)

Fase 3:
API Gateway
├─> User Microservice
├─> Order Microservice
└─> Monolith (Products)

Fase 4: Todo migrado a microservices
```

## Database por Servicio

**NO compartir base de datos entre servicios:**

```javascript
// ❌ MAL
UserService ──┐
OrderService ─┼─> Shared Database
ProductSvc ───┘

// Acoplamiento, difícil escalar

// ✅ BIEN
UserService ──> Users DB
OrderService ─> Orders DB
ProductSvc ──> Products DB

// Independiente, pero más complejo
```

## Distributed Tracing

Con microservices, tracking de request es importante:

```javascript
// User Service
const traceId = generateTraceId();
const user = await orderService.getOrder(123, { traceId });

// Order Service recibe traceId
// All logs tied to same traceId
// Tools (Jaeger, Zipkin) visualizan flow
```

## Comparación Técnica

| Aspecto | Monolith | Microservices |
|---------|----------|---------------|
| **Código** | Uno | Múltiples |
| **Database** | Una | Múltiples |
| **Deploy** | Todo junto | Independiente |
| **Escalado** | Vertical | Horizontal |
| **Latencia** | Baja | Más alta |
| **Debugging** | Fácil | Complejo |
| **Testing** | Fácil | Integración difícil |

## Recomendación por Etapa

```
Startup (<$1M revenue):
→ Monolith modular en Node/Python/Go
→ PostgreSQL única
→ Escalar verticalmente

Growth ($1-10M):
→ Modular Monolith más robusta
→ Considerar separar componentes críticos

Enterprise (>$10M):
→ Microservices selectivos (no todos)
→ API Gateway + múltiples servicios
→ Message queues para comunicación
```

## Referencias

- [clean-architecture.md](./clean-architecture.md)
- [event-driven.md](./event-driven.md)
- [clustering.md](../08-performance/clustering.md)

## Pregunta de Entrevista

**¿Cuándo cambiarías de monolith a microservices?**

Cuando:
1. Equipo > 5 personas (coordinar cambios)
2. Partes de app escalan diferente
3. Necesitas tecnologías diferentes
4. Frecuencia de deploy > semanal
5. Fallos en una parte afectan todo

Hasta entonces, monolith modular es suficiente.
