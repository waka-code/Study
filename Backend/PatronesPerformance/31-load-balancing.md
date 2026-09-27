# Load Balancing

Distribuye el tráfico entrante entre varias instancias de un servicio. Es lo que hace posible el [Horizontal Scaling](16-horizontal-scaling-pattern.md): sin un balanceador, agregar instancias no sirve porque nadie les manda tráfico.

```
                 ┌──────────────┐
                 │   Cliente    │
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │ Load Balancer│  ← health checks, TLS, routing
                 └──┬────┬────┬─┘
                    │    │    │
               ┌────▼┐ ┌─▼──┐ ┌▼───┐
               │App 1│ │App 2│ │App 3│
               └─────┘ └────┘ └────┘
```

**Ventajas:**
- Más throughput: la carga se reparte entre instancias.
- Alta disponibilidad: si una instancia cae, deja de recibir tráfico.
- Deploys sin downtime (rolling, blue/green, canary).
- Punto central para TLS, compresión, rate limiting.

**Trade-off:**
- Un salto de red extra (latencia mínima, pero existe).
- El LB puede ser un single point of failure si no es redundante.
- Obliga a que la app sea **stateless** (o a usar sticky sessions).

---

## 📊 L4 vs L7

| | **L4 (transporte)** | **L7 (aplicación)** |
|---|---|---|
| Ve | IP, puerto, TCP/UDP | HTTP: path, headers, cookies, host |
| Decide por | Conexión | Request |
| Velocidad | Muy rápido, poco overhead | Más overhead (parsea HTTP) |
| TLS | Normalmente passthrough | Termina TLS |
| Routing por contenido | ❌ | ✅ `/api` → servicio A, `/static` → B |
| Ejemplos | AWS NLB, HAProxy (modo TCP), IPVS | AWS ALB, Nginx, Envoy, Traefik, HAProxy (modo HTTP) |
| Usar para | TCP no HTTP, gRPC raw, altísimo throughput, IP fija | APIs HTTP, microservicios, routing por path/host |

**Ojo con L4 y conexiones largas:** con HTTP/2, gRPC o WebSockets, un L4 balancea **conexiones**, no requests. Si un cliente abre una conexión y manda 10.000 requests por ella, todas van a la misma instancia. Para gRPC suele necesitarse un L7 o balanceo del lado del cliente.

---

## ⚙️ Algoritmos de balanceo

### 1️⃣ Round Robin

Reparte en orden: 1, 2, 3, 1, 2, 3...

- ✅ Simple, bueno cuando las instancias y requests son homogéneas.
- ❌ Ignora la carga real: una instancia con requests lentas se sigue llenando.

### 2️⃣ Weighted Round Robin

Como round robin, pero con pesos (ej: una instancia más grande recibe el doble).

- ✅ Instancias heterogéneas, canary deploys (5% al nuevo release).

### 3️⃣ Least Connections / Least Outstanding Requests

Manda la request a la instancia con **menos requests en curso**.

- ✅ Mejor cuando la duración de las requests varía mucho.
- ✅ Suele dar mejor p99 que round robin.

### 4️⃣ Power of Two Choices (P2C)

Elige **2 instancias al azar** y manda a la menos cargada de las dos.

- ✅ Casi tan bueno como least connections, sin necesitar estado global exacto.
- Usado por Envoy, Linkerd, Finagle.

### 5️⃣ IP Hash / Consistent Hashing

La misma clave (IP, user id, cache key) siempre va a la misma instancia.

- ✅ Afinidad: caches locales, sesiones.
- ✅ **Consistent hashing**: al agregar/quitar un nodo solo se remapea ~1/N de las claves (clave en caches distribuidas y sharding).
- ❌ Distribución desigual si hay claves "calientes".

### 6️⃣ Random

- ✅ Sorprendentemente bueno con muchas instancias; sin estado.

| Algoritmo | Estado necesario | Requests heterogéneas | Afinidad |
|---|---|---|---|
| Round Robin | Mínimo | ❌ | ❌ |
| Weighted RR | Mínimo | ❌ | ❌ |
| Least Connections | Conteo por instancia | ✅ | ❌ |
| P2C | Conteo aproximado | ✅ | ❌ |
| Consistent Hash | Anillo de hash | ❌ | ✅ |

---

## ❤️ Health Checks

El LB solo debe enviar tráfico a instancias sanas.

```javascript
// Liveness: el proceso está vivo
app.get('/health/live', (req, res) => res.sendStatus(200));

// Readiness: puede recibir tráfico (dependencias OK, no está apagándose)
let shuttingDown = false;

app.get('/health/ready', async (req, res) => {
  if (shuttingDown) return res.sendStatus(503);
  try {
    await db.$queryRaw`SELECT 1`;
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});

// Graceful shutdown: dejar de estar "ready", terminar requests en curso, salir
process.on('SIGTERM', () => {
  shuttingDown = true;
  setTimeout(() => server.close(() => process.exit(0)), 10_000); // tiempo para que el LB lo saque
});
```

- **Activos**: el LB llama a `/health` cada X segundos; tras N fallos saca la instancia.
- **Pasivos (outlier detection)**: el LB observa errores 5xx/timeouts en tráfico real y expulsa temporalmente la instancia.
- ⚠️ No hagas el readiness demasiado estricto: si la DB tiene un hipo y **todas** las instancias fallan el check, el LB se queda sin destinos.

---

## 🍪 Sticky Sessions vs Stateless

**Sticky sessions**: el LB manda siempre al mismo usuario a la misma instancia (por cookie o IP).

- ❌ Distribución desigual.
- ❌ Si la instancia cae, se pierde la sesión.
- ❌ Complica el autoscaling y los deploys.

**Mejor: servicio stateless**
- Sesiones en Redis o tokens (JWT).
- Archivos en S3, no en disco local.
- Caches locales solo como optimización, nunca como fuente de verdad.

Sticky sessions solo cuando no hay alternativa (ej: WebSockets con estado en memoria, y aun así mejor un pub/sub con Redis).

---

## 🛠️ Ejemplo: Nginx como L7

```nginx
upstream api {
    least_conn;                       # algoritmo
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 weight=2;        # instancia más grande
    keepalive 64;                     # conexiones reutilizadas hacia upstream
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    location /api/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;
        proxy_next_upstream error timeout http_502 http_503;  # reintenta en otra instancia
    }
}
```

En Express, detrás de un proxy:

```javascript
app.set('trust proxy', 1); // para que req.ip y req.protocol usen X-Forwarded-*
```

---

## 🌍 Niveles de balanceo

| Nivel | Ejemplo | Qué reparte |
|---|---|---|
| **DNS / GSLB** | Route 53 latency/geo routing, Cloudflare | Tráfico entre regiones |
| **Edge / CDN** | CloudFront, Cloudflare | Entre PoPs y orígenes |
| **LB de entrada** | ALB, NLB, Nginx, Ingress de Kubernetes | Entre instancias de un servicio |
| **Service mesh / cliente** | Envoy, Linkerd, gRPC client-side LB | Entre servicios internos |
| **Proceso** | Node `cluster`, PM2 | Entre cores de una máquina |

---

## ⚠️ Problemas comunes

- **Keep-alive desbalanceado**: clientes con conexiones persistentes se "pegan" a instancias viejas tras un scale-out. Limitar la vida de las conexiones.
- **Timeouts desalineados**: el keep-alive timeout de la app debe ser **mayor** que el idle timeout del LB, o aparecen 502 esporádicos.
  ```javascript
  server.keepAliveTimeout = 65_000;  // ALB idle timeout por defecto = 60 s
  server.headersTimeout = 66_000;
  ```
- **Thundering herd al arrancar**: una instancia nueva recibe tráfico antes de calentar caches/JIT → usar slow start.
- **Reintentos en cascada**: el LB reintenta + el cliente reintenta + el servicio reintenta = tormenta. Reintentar solo en un nivel y solo operaciones idempotentes.
- **LB sin redundancia**: usar LBs gestionados (multi-AZ) o pares activo/pasivo.

---

## 🎯 Mejores Prácticas

✅ Servicios **stateless**; evitar sticky sessions
✅ Health checks de **readiness** separados de liveness
✅ Graceful shutdown: dejar de estar ready antes de cerrar
✅ Least connections / P2C cuando la duración de las requests varía
✅ L7 para HTTP (routing, TLS, observabilidad); L4 para TCP puro o throughput extremo
✅ Alinear timeouts (app > LB)
✅ Reintentos acotados, con backoff y solo en operaciones idempotentes
✅ LB redundante / gestionado multi-AZ

---

## 🔗 Relación con Otros Patrones

- **Horizontal Scaling**: el LB es lo que lo hace funcionar
- **Circuit Breaker / Outlier detection**: sacar instancias que fallan
- **Rate Limiting**: se aplica típicamente en el LB o API gateway
- **Keep-Alive**: afecta la distribución de conexiones
- **CDN**: balanceo en el edge
- **Read/Write Splitting**: balanceo de lecturas entre réplicas

---

**Nivel de Dificultad:** ⭐⭐⭐ Avanzado
