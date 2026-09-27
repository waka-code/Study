# Horizontal Scaling Pattern

Aumenta la capacidad del sistema añadiendo más instancias del servicio. Permite manejar más tráfico y distribuir la carga.

**Ventajas:**
- Escalabilidad flexible.
- Alta disponibilidad.
- Sin techo de hardware: se agregan máquinas en vez de comprar una más grande.
- Permite escalar hacia abajo y pagar solo lo que se usa.

**Trade-off:**
- Requiere balanceo de carga.
- Puede aumentar la complejidad de gestión.
- La app debe ser stateless.
- Mueve el cuello de botella a los recursos compartidos (DB, cache, APIs externas).

---

## 📊 Horizontal vs Vertical

| | **Horizontal (scale out)** | **Vertical (scale up)** |
|---|---|---|
| Cómo | Más instancias | Instancia más grande (CPU/RAM) |
| Límite | Prácticamente ninguno | El tamaño máximo de máquina |
| Disponibilidad | ✅ Si cae una, siguen las otras | ❌ Single point of failure |
| Downtime al escalar | No | Normalmente sí (reinicio) |
| Complejidad | Mayor (LB, estado compartido) | Baja |
| Ideal para | Servicios stateless, web/API, workers | DBs, cargas difíciles de distribuir |

En la práctica se combinan: escalar vertical hasta un tamaño razonable y luego horizontal.

---

## ✅ Requisito: servicio stateless

Cualquier instancia debe poder atender cualquier request.

| Estado | ❌ En la instancia | ✅ Externalizado |
|---|---|---|
| Sesiones | Memoria del proceso | Redis, JWT |
| Archivos subidos | Disco local | S3 / blob storage |
| Cache | Memoria (como única fuente) | Redis / Memcached (o local solo como L1) |
| Jobs programados | `setInterval` en cada instancia | Scheduler único, cola, o lock distribuido |
| WebSockets | Estado del room en memoria | Pub/sub (Redis adapter) |
| Rate limiting | Contador en `Map` | Contador en Redis |

```javascript
// ❌ Con 3 instancias, el cron corre 3 veces
setInterval(sendDailyEmails, 24 * 60 * 60 * 1000);

// ✅ Lock distribuido: solo una instancia lo ejecuta
const lock = await redis.set('lock:daily-emails', instanceId, 'NX', 'EX', 3600);
if (lock) await sendDailyEmails();
```

```javascript
// ✅ Socket.IO con varias instancias
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
```

---

## 📈 Autoscaling

### Métricas para escalar

| Métrica | Bueno para | Cuidado |
|---|---|---|
| **CPU** | Servicios CPU-bound | En Node I/O-bound la CPU puede estar baja con latencia alta |
| **Requests por instancia** | APIs web | Requiere conocer la capacidad por instancia |
| **Latencia p95** | Proteger el SLO | Reacciona tarde; ruidosa |
| **Profundidad de la cola** | Workers | La mejor métrica para consumidores |
| **Conexiones activas** | WebSockets | — |

### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3          # mínimo para HA (una por AZ)
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65   # bajo la "rodilla" de la curva de latencia
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # evitar flapping
```

### AWS ECS: target tracking

```
Métrica: ECSServiceAverageCPUUtilization o ALBRequestCountPerTarget
Target:  65% CPU  |  1000 req/target
Min/Max: 3 / 30 tareas
```

### Consideraciones

- **Tiempo de arranque**: si una instancia tarda 2 min en estar lista, el autoscaling llega tarde a los picos → imágenes livianas, readiness rápido, o escalado **predictivo/programado** para picos conocidos.
- **Mínimo ≥ 2-3** instancias en distintas AZs para alta disponibilidad.
- **Scale down conservador** y graceful shutdown para no cortar requests.

---

## 🔴 El cuello de botella se mueve

```
10 instancias API → 100 instancias API
       │                    │
       ▼                    ▼
   PostgreSQL           PostgreSQL  ← ahora el problema es este
```

Qué revisar al escalar horizontalmente:

| Recurso compartido | Riesgo | Mitigación |
|---|---|---|
| **Conexiones a DB** | pool × instancias > `max_connections` | PgBouncer / RDS Proxy, pools chicos |
| **DB (CPU/IOPS)** | Satura con más carga | Caching, read replicas, índices, sharding |
| **Cache (Redis)** | Hot keys, ancho de banda | Cluster, cache local L1 |
| **APIs externas** | Rate limits del proveedor | Colas, rate limiting propio, circuit breaker |
| **Locks / filas calientes** | Contención crece con concurrencia | Rediseñar, colas por clave, optimistic locking |

**Ley de Amdahl:** si una parte del trabajo es serial (un lock global, una fila contador), agregar instancias deja de ayudar.

```
Speedup máximo = 1 / (fracción_serial + fracción_paralela / N)

Con 10% serial → speedup máximo ≈ 10× aunque tengas 1000 instancias
```

---

## 🧱 Escalar la capa de datos

La app se escala fácil; la DB no.

1. **Vertical** de la DB (lo más simple, hasta cierto punto)
2. **Caching** delante de la DB
3. **Read replicas** para lecturas ([Read/Write Splitting](15-read-write-splitting-pattern.md))
4. **Particionamiento** de tablas grandes
5. **Sharding**: dividir datos entre varias DBs (ver `DatosConsistencia/Sharding.md`)

---

## 🎯 Mejores Prácticas

✅ Servicios **stateless**; estado en Redis/DB/S3
✅ Load balancer con health checks de readiness
✅ Mínimo 2-3 instancias en distintas AZs
✅ Autoscaling con la métrica que refleja el cuello real (CPU, req/target, cola)
✅ Target de utilización bajo (~60-70%) para absorber picos mientras escala
✅ Arranque rápido y graceful shutdown
✅ Revisar límites de recursos compartidos (conexiones DB, rate limits externos)
✅ Pruebas de carga para conocer la capacidad por instancia

---

## 🔗 Relación con Otros Patrones

- **Load Balancing**: indispensable para repartir el tráfico
- **Vertical Scaling**: la alternativa/complemento
- **Connection Pooling**: se multiplica con las instancias
- **Queue-Based Load Leveling**: los workers escalan horizontalmente por profundidad de cola
- **Caching / Read-Write Splitting**: protegen la DB cuando la app escala
- **CPU & Memory Bottlenecks**: saber si escalar realmente resuelve el problema

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
