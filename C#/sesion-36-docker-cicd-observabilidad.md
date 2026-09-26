# Sesión 36 — Docker, CI/CD y observabilidad: del `git push` a producción, y saber qué está pasando ahí

> **Objetivo de la sesión**: empaquetar una API .NET 8 en una imagen de contenedor pequeña, segura y reproducible; llevarla a producción con un pipeline de GitHub Actions que construye una vez y despliega muchas; ejecutarla en Kubernetes con probes, límites y apagado ordenado; y, sobre todo, **observarla**: logs estructurados con Serilog, trazas distribuidas y métricas con OpenTelemetry. Al terminar deberías poder explicar cada línea de un Dockerfile .NET, diseñar un pipeline de CI/CD con estrategia de despliegue y migraciones, y responder *"un cliente dice que su pedido tardó 8 segundos: ¿cómo lo investigas?"*.

---

## 1. El puente entre "funciona en mi máquina" y producción

En la Sesión 21 vimos `dotnet publish` y un pipeline de CI mínimo; en la 35 partimos OrderFlow en cinco servicios. Cinco servicios × varios entornos × varias instancias hacen imposible desplegar "a mano". Tres ideas guían toda la sesión:

| Principio | Qué significa | Cómo se materializa |
|---|---|---|
| **Build once, deploy many** | El **mismo artefacto** (imagen con un digest `sha256:...`) pasa por dev → staging → prod | Se construye una vez en CI; solo cambia la **configuración** por entorno |
| **Config en el entorno** (12-factor) | Nada de `appsettings.Production.json` con secretos | Variables de entorno, ConfigMaps, Secrets, Key Vault / Secrets Manager (Sesión 23) |
| **Inmutabilidad** | No se "parchea" un servidor: se reemplaza | Contenedores efímeros; un cambio = imagen nueva |

> ❓ **Entrevista**: *"¿Por qué no compilar de nuevo en cada entorno?"* → Porque entonces lo que probaste en staging no es lo que corre en producción: otra versión de un paquete transitivo, otro SDK, otro flag. Promocionar la misma imagen (por digest, no por tag) garantiza que el binario probado es el desplegado.

---

## 2. Docker para .NET

Un **contenedor** es un proceso aislado (namespaces + cgroups del kernel Linux) que ve su propio sistema de archivos, montado desde una **imagen** compuesta por **capas** de solo lectura. No es una VM: comparte el kernel del host, arranca en milisegundos y pesa megas.

### 2.1 Las imágenes oficiales de .NET

| Imagen (`mcr.microsoft.com/dotnet/...`) | Contiene | Uso |
|---|---|---|
| `sdk:8.0` | SDK completo (~800 MB) | **Solo** en la etapa de build, nunca en producción |
| `aspnet:8.0` | Runtime .NET + ASP.NET Core | APIs framework-dependent (lo más común) |
| `runtime:8.0` | Runtime .NET sin ASP.NET | Workers / consolas |
| `runtime-deps:8.0` | Solo dependencias nativas (libc, OpenSSL, ICU) | Apps **self-contained** o **Native AOT** (Sesiones 21 y 31) |
| `aspnet:8.0-alpine` | Sobre Alpine (musl) | Muy pequeña; ojo con libs nativas que asumen glibc |
| `aspnet:8.0-jammy-chiseled` / `-noble-chiseled` | Ubuntu "cincelado": **sin shell, sin gestor de paquetes, no-root** | Producción con superficie de ataque mínima (~110 MB → la mitad) |
| `...-chiseled-extra` | Chiseled + ICU y tzdata | Si necesitas globalización o zonas horarias |

Novedades de .NET 8 que **debes** conocer:
- El puerto por defecto dentro del contenedor pasó de 80 a **8080** (`ASPNETCORE_HTTP_PORTS=8080`), para poder correr sin root.
- Las imágenes traen un usuario **`app`** (UID 1654) expuesto en la variable **`APP_UID`**. Las chiseled ya corren como no-root por defecto.

### 2.2 Un Dockerfile multi-stage bien hecho

```dockerfile
# syntax=docker/dockerfile:1
# ───────────── Etapa 1: build (imagen grande, se descarta) ─────────────
# --platform=$BUILDPLATFORM: compila con la arquitectura NATIVA del runner (rápido)
# aunque el destino sea otro (cross-compile de IL con -a $TARGETARCH)
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG TARGETARCH
WORKDIR /src

# 1) Copiar SOLO lo que afecta al restore → esta capa se cachea mientras no cambien dependencias
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/OrderFlow.Orders.Api/*.csproj            src/OrderFlow.Orders.Api/
COPY src/OrderFlow.Orders.Application/*.csproj    src/OrderFlow.Orders.Application/
COPY src/OrderFlow.Orders.Domain/*.csproj         src/OrderFlow.Orders.Domain/
COPY src/OrderFlow.Orders.Infrastructure/*.csproj src/OrderFlow.Orders.Infrastructure/
RUN dotnet restore src/OrderFlow.Orders.Api -a $TARGETARCH

# 2) Ahora sí el código: un cambio en un .cs invalida desde aquí, no el restore
COPY src/ src/
RUN dotnet publish src/OrderFlow.Orders.Api -c Release -a $TARGETARCH \
      --no-restore -o /app /p:UseAppHost=false

# ───────────── Etapa 2: runtime (lo único que llega a producción) ─────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled AS final
WORKDIR /app
COPY --from=build /app .
# no-root (en chiseled ya es el default; explícito no daña)
USER $APP_UID
EXPOSE 8080
ENV DOTNET_EnableDiagnostics=0 \
    ASPNETCORE_HTTP_PORTS=8080
# forma exec (JSON): dotnet es PID 1 y recibe SIGTERM
ENTRYPOINT ["dotnet", "OrderFlow.Orders.Api.dll"]
```

```gitignore
# .dockerignore — sin esto COPY src/ copia bin/ y obj/ de tu Mac y rompe el build
**/bin/
**/obj/
**/.vs/
**/*.user
.git/
**/appsettings.Development.json
**/secrets.json
```

```
Capas de la imagen final                 ¿Qué invalida cada capa?
┌──────────────────────────────┐
│ COPY --from=build /app       │ ← cambia en cada commit (~10-30 MB)
├──────────────────────────────┤
│ aspnet:8.0-chiseled          │ ← cambia al actualizar la imagen base (parches)
└──────────────────────────────┘   compartida entre TODOS tus servicios en el nodo
```

> ⚠️ **Los comentarios en un Dockerfile solo valen al inicio de línea**: `USER $APP_UID  # no-root` no es un comentario, es parte del argumento. Y un comentario tras el JSON de `ENTRYPOINT [...]` rompe el JSON, con lo que Docker lo interpreta silenciosamente en forma *shell*.

> ⚠️ **`ENTRYPOINT` en forma *shell*** (`ENTRYPOINT dotnet app.dll`) lanza `/bin/sh -c`, que se convierte en PID 1 y **no reenvía SIGTERM** a tu proceso: Kubernetes esperará el grace period y hará `SIGKILL`, cortando requests a medias. Usa siempre la forma JSON (*exec*). Además, chiseled no tiene shell: la forma shell ni siquiera arranca.

> ⚠️ **Secretos en la imagen**: cualquier `COPY` o `ENV` con una contraseña queda en una capa y se puede extraer con `docker history`/`docker save`, aunque una capa posterior lo "borre". Para feeds NuGet privados en el build usa `RUN --mount=type=secret,id=nuget ...` (BuildKit), que no persiste en ninguna capa.

> ⚠️ **`HEALTHCHECK` con `curl`** no funciona en chiseled (no hay curl) y Kubernetes **ignora** el `HEALTHCHECK` de Docker: usa probes (sección 4). En Docker Compose, si lo necesitas, añade un pequeño comando `healthcheck` a tu propia app o usa la imagen no-chiseled en desarrollo.

**Alternativa sin Dockerfile** (Sesión 21): `dotnet publish -t:PublishContainer -p:ContainerBaseImage=mcr.microsoft.com/dotnet/aspnet:8.0-jammy-chiseled` genera la imagen directamente con el SDK, sin escribir Dockerfile (e incluso sin daemon de Docker si la empuja directo a un registry con `-p:ContainerRegistry=...`). Ideal para servicios estándar; el Dockerfile sigue siendo necesario si instalas dependencias nativas o necesitas control fino.

> ❓ **Entrevista**: *"¿Qué pasa con el GC dentro de un contenedor?"* → .NET lee los límites del cgroup: el heap se limita por defecto al 75% del límite de memoria y el número de heaps del Server GC depende de las CPUs asignadas (Sesión 14). Con límites pequeños (<1 CPU, 256 MB) conviene evaluar Workstation GC o `DOTNET_GCHeapCount`, o activar **DATAS** (dynamic adaptation, `DOTNET_GCDynamicAdaptationMode=1` en .NET 8, por defecto en .NET 9), que ajusta los heaps a la carga.

### 2.3 Docker Compose para el entorno local

```yaml
# compose.yaml — levanta OrderFlow completo con `docker compose up --build`
services:
  orders-api:
    build: { context: ., dockerfile: src/OrderFlow.Orders.Api/Dockerfile }
    ports: ["5001:8080"]
    environment:
      ConnectionStrings__Orders: "Host=postgres;Database=orders;Username=app;Password=dev-only"
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://aspire-dashboard:18889"   # telemetría → dashboard
      OTEL_SERVICE_NAME: "orders-api"
    depends_on:
      postgres: { condition: service_healthy }     # espera a que el HEALTHCHECK pase, no solo a que arranque
      rabbitmq: { condition: service_healthy }

  postgres:
    image: postgres:16
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: dev-only, POSTGRES_DB: orders }
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U app"], interval: 5s, retries: 10 }
    volumes: ["pgdata:/var/lib/postgresql/data"]

  rabbitmq:
    image: rabbitmq:3-management
    healthcheck: { test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"], interval: 10s, retries: 10 }

  aspire-dashboard:                                 # UI de trazas/métricas/logs OTLP, sin instalar nada
    image: mcr.microsoft.com/dotnet/aspire-dashboard:8.1
    environment:
      DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS: "true"   # solo en local: sin token de login
    ports: ["18888:18888"]                          # UI → http://localhost:18888

volumes: { pgdata: {} }
```

> ⚠️ `depends_on` sin `condition: service_healthy` solo espera a que el contenedor **arranque**, no a que Postgres acepte conexiones. Aun así, tu app debe tolerar que la base no esté lista (reintentos al arrancar, `EnableRetryOnFailure` de EF Core): en Kubernetes no existe `depends_on`.

---

## 3. CI/CD con GitHub Actions

- **CI (Continuous Integration)**: cada push/PR se compila, se testea y se analiza automáticamente. El objetivo es que `main` esté **siempre** en verde.
- **Continuous Delivery**: cada commit en `main` produce un artefacto **desplegable**; el paso a producción es un botón (aprobación manual).
- **Continuous Deployment**: ese paso también es automático. Requiere tests y observabilidad muy maduros.

```
 PR ──▶ [build · format · test · vuln scan] ──▶ merge a main
                                                  │
                                                  ▼
            [build image (sha) · push registry · SBOM/scan] ──▶ imagen inmutable
                                                  │
              ┌───────────────────────────────────┼─────────────────────────┐
              ▼                                   ▼                         ▼
          deploy dev (auto)          deploy staging (auto + smoke)   deploy prod (aprobación)
                         MISMA imagen (digest) — cambia solo la configuración
```

### 3.1 El workflow completo

Extiende el CI de la Sesión 21 con tests de integración, publicación de la imagen y despliegue por entornos:

```yaml
# .github/workflows/orders.yml
name: orders
on:
  push:
    branches: [main]
    paths: ["src/OrderFlow.Orders.**", "src/OrderFlow.Contracts/**", ".github/workflows/orders.yml"]
  pull_request:
    paths: ["src/OrderFlow.Orders.**", "src/OrderFlow.Contracts/**"]

concurrency:                     # cancela runs obsoletos de la misma rama
  group: orders-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  packages: write          # push a GHCR con GITHUB_TOKEN
  id-token: write          # OIDC para asumir un rol en AWS/Azure SIN secretos de larga vida

env:
  IMAGE: ghcr.io/${{ github.repository_owner }}/orderflow-orders   # ⚠️ GHCR exige minúsculas: si tu usuario tiene mayúsculas, escríbelo en minúsculas a mano

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { global-json-file: global.json }
      - run: dotnet restore --locked-mode
      - run: dotnet build -c Release --no-restore
      # Testcontainers (Sesión 27) usa el Docker del runner: Postgres/RabbitMQ reales
      - run: dotnet test -c Release --no-build --logger trx --collect:"XPlat Code Coverage"
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: test-results, path: "**/TestResults/**" }

  image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      digest: ${{ steps.push.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: src/OrderFlow.Orders.Api/Dockerfile
          platforms: linux/amd64,linux/arm64     # Graviton / Apple Silicon
          push: true
          tags: ${{ env.IMAGE }}:${{ github.sha }}  # tag = commit; NUNCA desplegar ":latest"
          cache-from: type=gha
          cache-to: type=gha,mode=max
          sbom: true
          provenance: true

  deploy-staging:
    needs: image
    runs-on: ubuntu-latest
    environment: staging                        # secretos y reglas por entorno
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy/deploy.sh staging "${{ env.IMAGE }}@${{ needs.image.outputs.digest }}"
      - run: ./deploy/smoke-test.sh https://staging.orderflow.cl

  deploy-prod:
    needs: [image, deploy-staging]
    runs-on: ubuntu-latest
    environment: production                     # "required reviewers" → aprobación manual
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy/deploy.sh production "${{ env.IMAGE }}@${{ needs.image.outputs.digest }}"
```

> ⚠️ **Secretos en CI**: nunca `AWS_SECRET_ACCESS_KEY` en los secrets del repo si puedes evitarlo. Con **OIDC** (`id-token: write` + `aws-actions/configure-aws-credentials` con `role-to-assume`) GitHub emite un token de corta vida que AWS/Azure canjean por credenciales temporales limitadas a ese repo y rama. Tampoco imprimas variables en logs, y cuidado con `pull_request_target` en repos públicos (ejecuta código del fork con tus secretos).

### 3.2 Migraciones de base de datos en el pipeline

La app **no** debería ejecutar `Database.Migrate()` al arrancar en producción: con 3 réplicas arrancando a la vez, tres procesos compiten por migrar, y la cuenta de la app necesitaría permisos de DDL.

| Opción (EF Core, Sesión 25) | Cómo | Nota |
|---|---|---|
| **Script idempotente** | `dotnet ef migrations script --idempotent -o migrate.sql` | Revisable por un DBA, se aplica con `psql`/`sqlcmd` |
| **Migration bundle** | `dotnet ef migrations bundle -r linux-x64 --self-contained -o efbundle` | Un ejecutable; se corre como **Job** de Kubernetes antes del despliegue |

Para **zero downtime**, durante un rolling update conviven la versión N y la N+1 contra la **misma** base. Por eso los cambios de esquema siguen **expand/contract**: (1) *expand*: añadir la columna nueva como nullable, desplegar código que escribe en ambas; (2) migrar datos; (3) *contract*: en un despliegue **posterior**, eliminar la columna vieja. Nunca un `RENAME COLUMN` en un solo paso.

### 3.3 Estrategias de despliegue

| Estrategia | Cómo | Rollback | Coste |
|---|---|---|---|
| **Recreate** | Apaga todo, levanta lo nuevo | Lento | Downtime |
| **Rolling update** | Reemplaza instancias de a poco (default en K8s y ECS) | Otro rolling | Conviven 2 versiones |
| **Blue/Green** | Entorno nuevo completo; se cambia el tráfico de golpe | Instantáneo (volver a blue) | Doble infraestructura durante el cambio |
| **Canary** | 5% del tráfico a la versión nueva, se mide, se amplía | Rápido, afecta a pocos | Necesita métricas por versión y routing por peso |
| **Feature flags** | El código nuevo se despliega apagado y se enciende por config | Apagar el flag | Deuda si no se limpian los flags |

> ❓ **Entrevista**: *"¿Deploy vs release?"* → **Deploy** es poner el binario en producción; **release** es exponer la funcionalidad a los usuarios. Canary y feature flags los separan: puedes desplegar el lunes y liberar el jueves, o liberar solo a usuarios internos. Eso reduce el riesgo de cada despliegue y permite desplegar muchas veces al día.

---

## 4. Kubernetes para desarrolladores .NET

**Kubernetes** (K8s) es un orquestador: le declaras el **estado deseado** ("3 réplicas de esta imagen, con estos recursos") y sus controladores trabajan continuamente para que la realidad coincida (*reconciliation loop*). Si un nodo muere, reprograma los pods en otro.

| Objeto | Qué es | Analogía |
|---|---|---|
| **Pod** | 1+ contenedores que comparten red y volúmenes; la unidad que se programa | Una instancia de tu API |
| **Deployment** | Mantiene N réplicas de un pod y gestiona rolling updates | El "servicio" desplegado |
| **Service** | IP/DNS estable que balancea entre los pods (`http://orders-api`) | Service discovery (Sesión 35) |
| **Ingress / Gateway API** | Entrada HTTP desde fuera, TLS, rutas por host/path | El API Gateway norte-sur |
| **ConfigMap / Secret** | Configuración y secretos inyectados como env vars o archivos | `appsettings` externo |
| **HPA** | Escala réplicas según CPU/memoria/métricas custom | Autoscaling |
| **Job / CronJob** | Tareas que terminan (migraciones, batch) | `efbundle` |

### 4.1 Un Deployment de producción

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  labels: { app: orders-api }
spec:
  replicas: 3
  strategy:
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }   # nunca bajar de 3 durante el despliegue
  selector: { matchLabels: { app: orders-api } }
  template:
    metadata: { labels: { app: orders-api } }
    spec:
      terminationGracePeriodSeconds: 40           # > preStop + ShutdownTimeout de .NET
      securityContext: { runAsNonRoot: true }
      containers:
        - name: api
          image: ghcr.io/acme/orderflow-orders@sha256:3f1c...   # por DIGEST, inmutable
          ports: [{ containerPort: 8080 }]
          env:
            - { name: ASPNETCORE_ENVIRONMENT, value: Production }
            - { name: OTEL_SERVICE_NAME, value: orders-api }
            - { name: OTEL_EXPORTER_OTLP_ENDPOINT, value: "http://otel-collector:4317" }
            - name: ConnectionStrings__Orders             # "__" = ":" en la config de .NET
              valueFrom: { secretKeyRef: { name: orders-db, key: connection-string } }
          envFrom: [{ configMapRef: { name: orders-config } }]
          resources:
            requests: { cpu: "250m", memory: "256Mi" }    # lo que el scheduler RESERVA
            limits:   { memory: "512Mi" }                 # superar memoria → OOMKilled
          startupProbe:                                    # protege el arranque lento (JIT, caches)
            httpGet: { path: /health/live, port: 8080 }
            failureThreshold: 30
            periodSeconds: 2
          livenessProbe:                                   # ¿el proceso está colgado? → reiniciar
            httpGet: { path: /health/live, port: 8080 }
            periodSeconds: 10
          readinessProbe:                                  # ¿puede recibir tráfico? → sacar del Service
            httpGet: { path: /health/ready, port: 8080 }
            periodSeconds: 5
          lifecycle:
            preStop: { sleep: { seconds: 5 } }             # K8s 1.30+: sin necesitar /bin/sleep (chiseled)
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
          volumeMounts: [{ name: tmp, mountPath: /tmp }]   # .NET necesita un /tmp escribible
      volumes: [{ name: tmp, emptyDir: {} }]
---
apiVersion: v1
kind: Service
metadata: { name: orders-api }
spec:
  selector: { app: orders-api }
  ports: [{ port: 80, targetPort: 8080 }]
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: orders-api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: orders-api }
  minReplicas: 3
  maxReplicas: 12
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

### 4.2 Probes ↔ health checks de ASP.NET Core

| Probe | Pregunta | Si falla | Qué debe comprobar |
|---|---|---|---|
| **startup** | ¿Terminó de arrancar? | Sigue esperando (hasta el umbral), luego reinicia | Lo mismo que liveness |
| **liveness** | ¿Está vivo o colgado? | **Reinicia** el contenedor | Solo el proceso (sin dependencias) |
| **readiness** | ¿Puede atender tráfico ahora? | Lo **saca** del balanceo, no lo reinicia | Dependencias críticas: BD, broker |

```csharp
// Los health checks en detalle están en la Sesión 33; aquí el mapeo a K8s
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddNpgSql(builder.Configuration.GetConnectionString("Orders")!, tags: ["ready"]);  // AspNetCore.HealthChecks.NpgSql

app.MapHealthChecks("/health/live",  new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new() { Predicate = r => r.Tags.Contains("ready") });
```

> ⚠️ **Nunca pongas la base de datos en el liveness**. Si Postgres tiene un hipo de 30 s, *todos* los pods fallan el liveness, Kubernetes los reinicia a la vez, y al volver todos hacen *cold start* y abren conexiones simultáneamente: convertiste un problema de la BD en una caída total. La BD va en **readiness**.

### 4.3 Apagado ordenado (graceful shutdown)

```
kubectl rollout / scale-down
   │
   ├─▶ el pod se marca Terminating → se quita de los Endpoints del Service (asíncrono, tarda ~segundos)
   ├─▶ preStop: sleep 5s      ← da tiempo a que kube-proxy/Ingress dejen de enviar tráfico
   ├─▶ SIGTERM al PID 1 (dotnet)
   │     └─ IHostApplicationLifetime.ApplicationStopping
   │     └─ Kestrel deja de aceptar conexiones y DRENA las requests en curso
   │     └─ BackgroundServices reciben stoppingToken cancelado (Sesiones 13 y 33)
   │     └─ espera hasta HostOptions.ShutdownTimeout (default 30 s en .NET 8)
   └─▶ si tras terminationGracePeriodSeconds sigue vivo → SIGKILL
```

```csharp
builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(25));
```

> ❓ **Entrevista**: *"Tras cada despliegue vemos algunos 502. ¿Por qué?"* → Carrera entre la eliminación del pod de los endpoints y el SIGTERM: el pod deja de aceptar conexiones mientras el balanceador aún le envía tráfico. Solución: `preStop` con un sleep corto, `ShutdownTimeout` suficiente para drenar, `terminationGracePeriodSeconds` mayor que ambos, `maxUnavailable: 0` y readiness correcta. Y consumidores de colas que hagan `ack` solo al terminar (Sesión 34), para que un mensaje a medias se reentregue.

**¿Y en AWS sin Kubernetes?** En **ECS/Fargate** los conceptos se mapean casi 1:1: *task definition* ≈ Pod spec, *service* ≈ Deployment, health check del ALB ≈ readiness, `stopTimeout` ≈ grace period, y la *deployment circuit breaker* de ECS revierte automáticamente un despliegue que no pasa los health checks.

---

## 5. Observabilidad: los tres pilares (y lo que los une)

**Monitorizar** es vigilar lo que ya sabes que puede fallar (CPU > 90%). **Observabilidad** es poder responder preguntas **que no anticipaste** ("¿por qué solo los pedidos con más de 20 líneas del cliente X son lentos desde el martes?") a partir de la telemetría que el sistema emite.

| Pilar | Qué es | Pregunta que responde | En .NET |
|---|---|---|---|
| **Logs** | Eventos discretos con contexto | ¿Qué pasó exactamente en esta request? | `ILogger<T>` + Serilog |
| **Métricas** | Números agregados en el tiempo, baratos | ¿Cuántas? ¿Qué tan rápido? ¿Está empeorando? | `System.Diagnostics.Metrics` (`Meter`) |
| **Trazas** | El recorrido de una operación a través de servicios | ¿Dónde se fueron los 8 segundos? | `System.Diagnostics.Activity` (`ActivitySource`) |

Lo que los convierte en un sistema es la **correlación**: un `TraceId` que aparece en cada log, en cada span y (vía *exemplars*) en las métricas. Con él saltas de "el p99 subió" → a una traza lenta → a los logs de esa traza exacta.

---

## 6. Logs estructurados con Serilog

`ILogger<T>` es la **abstracción** (Sesión 24); Serilog es un **proveedor** con un ecosistema enorme de *sinks* (destinos) y *enrichers*. Lo importante no es la librería, sino que los logs sean **estructurados**: el mensaje es una **plantilla** y los valores viajan como **propiedades** consultables.

```csharp
// ✗ Interpolación: el backend recibe un string opaco; no puedes filtrar por OrderId,
//   y además construyes el string aunque el nivel esté desactivado
logger.LogInformation($"Pedido {orderId} creado para {customerId}");

// ✓ Message template: propiedades OrderId y CustomerId indexadas
logger.LogInformation("Pedido {OrderId} creado para {CustomerId}", orderId, customerId);
// → {"@mt":"Pedido {OrderId} creado para {CustomerId}","OrderId":"8c1e...","CustomerId":"42",
//    "TraceId":"4bf92f3577b34da6a3ce929d0e0e4736","service":"orders-api"}
```

En rutas calientes, el source generator `[LoggerMessage]` (Sesión 20) evita boxing y parsing de la plantilla en cada llamada.

### 6.1 Configuración de producción

```csharp
// dotnet add package Serilog.AspNetCore   (incluye Console, Configuration y formato Compact)
// dotnet add package Serilog.Sinks.OpenTelemetry
using Serilog;
using Serilog.Events;

// "Two-stage init": un logger mínimo para capturar errores ANTES de que exista el host
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, services, cfg) => cfg
        .ReadFrom.Configuration(ctx.Configuration)       // niveles desde appsettings/env vars
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()                           // propiedades de LogContext / scopes
        .Enrich.WithProperty("service", "orders-api")
        .WriteTo.Console(new Serilog.Formatting.Compact.RenderedCompactJsonFormatter()) // JSON a stdout
        .WriteTo.OpenTelemetry());                         // OTLP → collector (usa OTEL_* env vars)

    var app = builder.Build();

    // Reemplaza los ~5 logs por request de ASP.NET Core por UNO resumido con status y duración
    app.UseSerilogRequestLogging(o =>
    {
        o.EnrichDiagnosticContext = (diag, http) =>
            diag.Set("UserId", http.User.Identity?.Name ?? "anon");
        o.GetLevel = (http, elapsedMs, ex) =>
            ex is not null || http.Response.StatusCode >= 500 ? LogEventLevel.Error
            : elapsedMs > 1000 ? LogEventLevel.Warning                      // requests lentas destacan
            : LogEventLevel.Information;
    });

    // ... endpoints
    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)   // HostAbortedException: la lanzan las herramientas de EF
{
    Log.Fatal(ex, "La aplicación terminó inesperadamente");
}
finally
{
    Log.CloseAndFlush();                                       // vacía los buffers de los sinks
}
```

```json
// appsettings.json — el nivel se cambia por entorno SIN recompilar
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
      }
    }
  }
}
```

> ⚠️ **En contenedores, logs a stdout**. El runtime (Docker, K8s, ECS) los recoge y un agente (Fluent Bit, CloudWatch agent, OTel Collector) los envía al backend. Escribir a archivos dentro del contenedor los pierde al reiniciar y llena el disco efímero.

> ⚠️ **PII y secretos**: nunca loguees contraseñas, tokens, números de tarjeta ni el body completo de requests. Un log es una **copia** de los datos con otra política de acceso y retención (GDPR / Ley de datos personales). Usa destructuring con cuidado (`{@Pedido}` serializa el objeto entero) y enmascara campos sensibles.

| Nivel | Uso | En producción |
|---|---|---|
| `Trace` / `Verbose` | Detalle extremo | Apagado |
| `Debug` | Diagnóstico de desarrollo | Apagado (encendible por config) |
| `Information` | Hechos de negocio: "pedido creado" | ✅ |
| `Warning` | Anómalo pero recuperado: reintento, request lenta | ✅ |
| `Error` | Falló una operación | ✅ + alerta si la tasa sube |
| `Critical` / `Fatal` | La app no puede continuar | ✅ + alerta inmediata |

---

## 7. OpenTelemetry: trazas y métricas estándar

**OpenTelemetry (OTel)** es el estándar de la CNCF para emitir telemetría de forma **neutral respecto al proveedor**: instrumentas una vez con OTel y envías por **OTLP** a Jaeger, Tempo, Prometheus, Datadog, New Relic, CloudWatch/X-Ray, Azure Monitor o el dashboard de Aspire. Cambiar de backend es cambiar una variable de entorno.

```
┌───────────┐  OTLP   ┌──────────────────────┐         ┌── Tempo / Jaeger  (trazas)
│ orders-api│────────▶│   OTel Collector     │────────▶├── Prometheus      (métricas)
│ payments  │────────▶│ batch · sampling ·   │         ├── Loki / Elastic  (logs)
│ inventory │────────▶│ filtrado de PII ·    │         └── Datadog / X-Ray / Azure Monitor
└───────────┘         │ reintentos           │
                      └──────────────────────┘
```

.NET no necesita un SDK propietario para las APIs de instrumentación: **ya están en el runtime** desde hace años, y OTel las adoptó.

| Concepto OpenTelemetry | API de .NET |
|---|---|
| Tracer | `System.Diagnostics.ActivitySource` |
| Span | `System.Diagnostics.Activity` |
| Attribute | `Activity.SetTag` |
| Meter / Counter / Histogram | `System.Diagnostics.Metrics.Meter`, `Counter<T>`, `Histogram<T>` |
| Context propagation | `traceparent` (W3C), automático en `HttpClient` y ASP.NET Core |

### 7.1 Configuración

```csharp
// dotnet add package OpenTelemetry.Extensions.Hosting
// dotnet add package OpenTelemetry.Instrumentation.AspNetCore / .Http / .Runtime
// dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
builder.Services.AddSingleton<OrderMetrics>();

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("orders-api",
        serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString()))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation(o =>
            o.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health"))  // sin ruido de probes
        .AddHttpClientInstrumentation()               // propaga traceparent en llamadas salientes
        .AddSource(OrderTelemetry.SourceName)          // ⚠️ tus spans custom NO se exportan sin esto
        .SetSampler(new ParentBasedSampler(new TraceIdRatioBasedSampler(0.10)))  // 10% de trazas
        .AddOtlpExporter())                            // endpoint desde OTEL_EXPORTER_OTLP_ENDPOINT
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()                // http.server.request.duration, etc.
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()                   // GC, thread pool, excepciones (Sesiones 14 y 30)
        .AddMeter(OrderMetrics.MeterName)
        .AddOtlpExporter());
```

Paquetes de instrumentación adicionales cubren EF Core, Npgsql (`AddNpgsql()`), Redis, gRPC; MassTransit y los clientes de RabbitMQ/Kafka propagan el contexto en los **headers del mensaje** (Sesión 34), así que la traza sigue viva a través del broker.

### 7.2 Spans y métricas propias

```csharp
public static class OrderTelemetry
{
    public const string SourceName = "OrderFlow.Orders";
    public static readonly ActivitySource Source = new(SourceName, "1.0.0");   // uno por componente, static
}

app.MapPost("/orders", async (PlaceOrder cmd, OrderMetrics metrics, CancellationToken ct) =>
{
    // StartActivity devuelve NULL si nadie escucha o el sampler lo descartó → usar ?.
    using var activity = OrderTelemetry.Source.StartActivity("PlaceOrder");
    activity?.SetTag("order.customer_id", cmd.CustomerId);
    activity?.SetTag("order.lines", cmd.Lines);

    var start = Stopwatch.GetTimestamp();
    try
    {
        var orderId = await handler.HandleAsync(cmd, ct);
        metrics.OrderPlaced(cmd.Total, channel: "web");
        return Results.Accepted($"/orders/{orderId}", new { orderId });
    }
    catch (Exception ex)
    {
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        activity?.AddException(ex);          // DiagnosticSource 9+ (llega con los paquetes de OTel)
        throw;
    }
    finally
    {
        metrics.RecordDuration(Stopwatch.GetElapsedTime(start).TotalMilliseconds);
    }
});

public sealed class OrderMetrics
{
    public const string MeterName = "OrderFlow.Orders";
    private readonly Counter<long> _placed;
    private readonly Histogram<double> _amount;
    private readonly Histogram<double> _duration;

    public OrderMetrics(IMeterFactory meterFactory)    // .NET 8: IMeterFactory integra Meter con DI y tests
    {
        var meter = meterFactory.Create(MeterName);
        _placed   = meter.CreateCounter<long>("orderflow.orders.placed", unit: "{order}", description: "Pedidos creados");
        _amount   = meter.CreateHistogram<double>("orderflow.orders.amount", unit: "CLP");
        _duration = meter.CreateHistogram<double>("orderflow.orders.place.duration", unit: "ms");
    }

    public void OrderPlaced(decimal total, string channel)
    {
        var tag = new KeyValuePair<string, object?>("channel", channel);   // baja cardinalidad: web/app/b2b
        _placed.Add(1, tag);
        _amount.Record((double)total, tag);
    }

    public void RecordDuration(double ms) => _duration.Record(ms);
}
```

Así se ve el resultado de una request que atraviesa tres servicios (lo que muestra Jaeger o el dashboard de Aspire):

```
TraceId 4bf92f3577b34da6a3ce929d0e0e4736                                 total 8.120 ms
├─ gateway     POST /api/orders                        ███████████████████████████ 8.120
│  └─ orders   POST /orders                             ██████████████████████████ 8.050
│     ├─ orders   PlaceOrder                             █████████████████████████ 7.990
│     │  ├─ npgsql  INSERT orders                        ▌ 12
│     │  └─ grpc    inventory.v1.InventoryService/Reserve ████████████████████████ 7.900  ← aquí
│     │     └─ inventory  SELECT stock ... FOR UPDATE      ███████████████████████ 7.850  ← lock!
```

El header que hace posible la magia viaja en cada llamada HTTP/gRPC:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  └─────────── trace-id ──────────┘ └─ parent span ─┘ └ sampled
             versión
```

> ⚠️ **Cardinalidad de métricas**: cada combinación distinta de tags crea una **serie temporal** nueva. Un tag `order_id` o `user_id` en un contador genera millones de series y puede tumbar Prometheus (o disparar la factura de Datadog). Tags de métricas: pocos valores (`channel`, `status_code`, `region`). Los identificadores de alta cardinalidad van en **trazas y logs**.

> ⚠️ **Sampling**: exportar el 100% de las trazas en un sistema con miles de rps es carísimo. `ParentBased` respeta la decisión del servicio que inició la traza (para no tener trazas rotas a medias). El sampling *head-based* (al inicio) es barato pero puede descartar justo la traza con error; el *tail-based* (en el Collector, tras ver la traza completa) permite "guarda todas las trazas con error o > 2 s y el 5% del resto".

> ❓ **Entrevista**: *"Un cliente dice que su pedido tardó 8 segundos. ¿Cómo lo investigas?"* → Con su OrderId busco en los logs el `TraceId` (está enriquecido en cada línea). Abro esa traza y veo el *waterfall*: qué servicio y qué span consumió el tiempo (en el ejemplo, un `SELECT ... FOR UPDATE` bloqueado en Inventory). Luego miro las métricas para saber si es un caso aislado o el p99 completo subió a esa hora, y si se correlaciona con un despliegue, con el thread pool (Sesión 13) o con el GC (Sesión 14). Sin trazas distribuidas estaría adivinando entre cinco servicios.

---

## 8. Qué medir y cuándo despertar a alguien

**Métodos para elegir métricas**:
- **RED** (para servicios que atienden requests): **R**ate (rps), **E**rrors (tasa de 5xx), **D**uration (latencia en percentiles).
- **USE** (para recursos: CPU, pool de conexiones, cola): **U**tilization, **S**aturation (lo que espera), **E**rrors.
- **Golden signals** de Google SRE: latencia, tráfico, errores, saturación.

> ⚠️ **Nunca alertes por el promedio de latencia**. Un promedio de 120 ms puede esconder que el 1% de los usuarios espera 6 s. Usa **percentiles** (p95, p99) calculados desde **histogramas** (los percentiles no se pueden promediar entre instancias; los buckets de un histograma sí se pueden sumar).

**SLI → SLO → error budget**:

| Término | Definición | Ejemplo OrderFlow |
|---|---|---|
| **SLI** (indicator) | Una métrica que representa la experiencia del usuario | % de `POST /orders` con status < 500 y duración < 500 ms |
| **SLO** (objective) | El objetivo interno para ese SLI en una ventana | 99,5% en 30 días |
| **SLA** (agreement) | Compromiso contractual con penalización (más laxo que el SLO) | 99% o se devuelve un 10% |
| **Error budget** | Lo que te "sobra": 100% − SLO | 0,5% ≈ 3,6 h al mes; si se agota, se congelan features y se prioriza fiabilidad |

Buenas alertas: **pocas**, basadas en **síntomas** que sufre el usuario (SLO en riesgo, *burn rate* del error budget), no en causas (CPU al 85% a las 3 AM sin impacto no debe despertar a nadie), y cada una con un **runbook** que diga qué mirar primero.

Cuando la telemetría no basta, las herramientas de la Sesión 30 funcionan también en contenedores: `dotnet-counters`, `dotnet-trace` y `dotnet-dump` desde un contenedor sidecar/efímero (`kubectl debug`) compartiendo el socket de diagnóstico, o **dotnet-monitor** como sidecar que expone dumps y trazas vía HTTP. (Por eso, si deshabilitas `DOTNET_EnableDiagnostics` como en el Dockerfile de arriba, sepas que también apagas eso: decide según tu política de seguridad.)

---

## Resumen mental de la sesión

```
Build once, deploy many: MISMA imagen (digest) en todos los entornos; cambia la config

Dockerfile .NET: multi-stage (sdk → aspnet/chiseled/runtime-deps)
  copiar *.csproj + restore ANTES del código (cache) · .dockerignore (bin/obj)
  .NET 8: puerto 8080 · USER $APP_UID · ENTRYPOINT exec (PID 1 recibe SIGTERM)
  sin secretos en capas (--mount=type=secret) · GC respeta cgroups (DATAS)

CI/CD (GitHub Actions): test (Testcontainers) → image (tag sha, cache gha, SBOM)
  → staging → prod (environment con aprobación) · OIDC en vez de claves
  Migraciones: script idempotente / bundle como Job · expand/contract
  Rolling · Blue/Green · Canary · Feature flags (deploy ≠ release)

Kubernetes: Deployment · Service · Ingress · ConfigMap/Secret · HPA · Job
  requests/limits · startup / liveness (solo proceso) / readiness (dependencias)
  shutdown: endpoints fuera → preStop → SIGTERM → drenar (ShutdownTimeout) → SIGKILL

Observabilidad = logs + métricas + trazas, UNIDOS por TraceId
  Serilog: message templates, JSON a stdout, request logging, bootstrap logger, sin PII
  OTel: ActivitySource/Activity (trazas) · Meter/IMeterFactory (métricas) · OTLP → Collector
  AddSource/AddMeter obligatorios · traceparent W3C · sampling ParentBased / tail en collector
  Cardinalidad baja en métricas · percentiles desde histogramas · RED / USE
  SLI → SLO → error budget · alertar por síntomas + runbook
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es un build multi-stage y por qué se copian los `.csproj` y se hace `restore` antes de copiar el código?
2. ❓ `aspnet` vs `chiseled` vs `runtime-deps` vs `alpine`: ¿cuándo cada una? ¿Qué cambió en .NET 8 respecto al puerto y al usuario?
3. ❓ ¿Por qué el `ENTRYPOINT` debe ir en forma exec? ¿Qué pasa con SIGTERM en la forma shell?
4. ❓ ¿Qué significa *build once, deploy many* y por qué se despliega por digest y no por `:latest`?
5. ❓ ¿Cómo gestionas secretos en el Dockerfile y en GitHub Actions? ¿Qué aporta OIDC?
6. ❓ ¿Cómo ejecutas migraciones de EF Core en un pipeline con varias réplicas y sin downtime?
7. ❓ Rolling vs blue/green vs canary. ¿Qué diferencia hay entre deploy y release?
8. ❓ Liveness vs readiness vs startup probe. ¿Por qué no incluir la base de datos en el liveness?
9. ❓ Describe el apagado ordenado de un pod .NET. ¿Por qué aparecen 502 durante los despliegues y cómo lo evitas?
10. ❓ ¿Qué es un log estructurado? ¿Por qué no usar interpolación de strings en `LogInformation`?
11. ❓ Explica trazas, spans y context propagation. ¿Cómo se mapean OpenTelemetry y `System.Diagnostics` en .NET?
12. ❓ ¿Qué es la cardinalidad de una métrica y por qué un tag `user_id` es un problema? ¿SLI vs SLO vs SLA?

## Ejercicio práctico
Lleva OrderFlow (Sesiones 32 y 35) a un entorno "de producción" en tu máquina:

1. Escribe el **Dockerfile multi-stage** de la sección 2.2 para `OrderFlow.Orders.Api` con imagen final chiseled y `.dockerignore`. Compara tamaños con `docker images` contra la variante `aspnet:8.0` y contra `dotnet publish -t:PublishContainer`. Cambia un `.cs`, reconstruye y verifica en la salida de BuildKit que la capa del `restore` sale de caché (`CACHED`).
2. Comprueba que corre como no-root: `docker run --rm --entrypoint whoami ...` debe **fallar** en chiseled (no hay shell ni binarios); inspecciona el usuario con `docker inspect`.
3. Crea `compose.yaml` con Orders, Payments, Inventory, Postgres, RabbitMQ y el **Aspire Dashboard**. Todo debe levantar con `docker compose up --build`.
4. **Serilog**: bootstrap logger, JSON compacto a stdout, `UseSerilogRequestLogging` con `UserId` y nivel `Warning` para requests > 1 s. Crea una request lenta y encuéntrala por nivel.
5. **OpenTelemetry** en los tres servicios con `AddSource` y `AddMeter` propios. Crea un pedido y encuentra en el dashboard la traza que cruza gateway → orders → inventory (gRPC) → broker → payments. Copia el `TraceId` de un log y búscalo en las trazas.
6. Añade la métrica `orderflow.orders.placed` con tag `channel` y un histograma de duración; genera carga con k6 (Sesión 30) y observa el p95 en el dashboard.
7. **GitHub Actions**: implementa el workflow de la sección 3.1 (puedes omitir el deploy real): tests con Testcontainers, imagen multi-arquitectura a GHCR con tag `sha`, environment `production` con aprobación manual.
8. (Opcional avanzado) Instala **kind** o **k3d**, aplica el Deployment/Service/HPA de la sección 4.1, y haz un `kubectl rollout restart` mientras k6 genera carga. Primero **sin** `preStop` y con `terminationGracePeriodSeconds: 5`; luego con la configuración correcta. Compara la tasa de errores de ambos rollouts: esa diferencia es la respuesta a la pregunta 9.

---

➡️ **Cuando termines**, marca la Sesión 36 en el [README](Readme.md) y pídeme la **Sesión 37 — SOLID y patrones de diseño en C#**.
