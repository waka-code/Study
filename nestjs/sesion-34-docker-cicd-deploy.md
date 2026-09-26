# Sesión 34 — Producción: Docker, CI/CD, graceful shutdown, deploy en AWS (ECS / Lambda)

> **Objetivo de la sesión**: llevar TiendaApi desde el repositorio hasta tráfico real sin cortar requests en cada despliegue. Al terminar deberías poder escribir un **Dockerfile multi-stage** pequeño y seguro, explicar por qué el proceso debe recibir `SIGTERM` y cómo lo maneja Nest con **`enableShutdownHooks`**, montar un pipeline de **GitHub Actions** (CI + CD con OIDC hacia AWS), desplegar en **ECS Fargate** detrás de un ALB con rolling updates y rollback automático, y evaluar cuándo **Lambda** tiene sentido para una app Nest y cómo mitigar sus **cold starts**.

---

## 1. Qué significa "listo para producción"

Una app lista para producción no es "la que compila", es la que se puede **desplegar, escalar, observar y matar** sin que el usuario lo note. Los principios de *The Twelve-Factor App* siguen siendo la mejor lista corta:

| Factor | En TiendaApi |
|---|---|
| Config en el entorno | `ConfigModule` + validación (Sesión 7), secretos inyectados, nada en la imagen |
| Procesos sin estado | Sesiones, caché y rate limit en Redis (Sesiones 20, 25) |
| Port binding | `app.listen(process.env.PORT)` en `0.0.0.0` |
| Desechabilidad | Arranque rápido + **graceful shutdown** (sección 4) |
| Logs como streams | JSON a stdout (Sesión 32); el orquestador los recoge |
| Paridad dev/prod | La misma imagen en staging y producción; solo cambia la config |
| Build, release, run | CI construye **una** imagen inmutable (tag = commit SHA) que se promueve entre entornos |

> ❓ **Entrevista**: *"¿Por qué construir la imagen una vez y promoverla, en vez de reconstruir por entorno?"* → Porque reconstruir puede producir un artefacto distinto (dependencias resueltas otro día, base image actualizada). Lo que probaste en staging debe ser **byte a byte** lo que corre en producción. La diferencia entre entornos es solo configuración.

---

## 2. Dockerfile multi-stage

### 2.1 Por qué multi-stage

Para compilar TypeScript necesitas `typescript`, `@nestjs/cli`, tipos, Jest... Para **ejecutar** solo necesitas `dist/` y las dependencias de producción. Un Dockerfile de una etapa arrastra todo: imágenes de 1+ GB, más superficie de ataque y más CVEs que parchear.

```
 ┌──────────── etapa "deps" ───────────┐   ┌──────────── etapa "build" ──────────┐
 │ package*.json → npm ci (todo)        │──▶│ COPY src → nest build → dist/       │
 └──────────────────────────────────────┘   │ npm prune --omit=dev                │
                                            └──────────────┬──────────────────────┘
                                                           │ COPY --from=build (solo lo necesario)
                                            ┌──────────────▼──────────────────────┐
                                            │ etapa "runtime": node + dist +      │
                                            │ node_modules de prod, usuario node  │
                                            └─────────────────────────────────────┘
```

### 2.2 El Dockerfile de TiendaApi

```dockerfile
# syntax=docker/dockerfile:1

# ---------- Etapa 1: dependencias (se cachea mientras no cambie el lockfile) ----------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci: instalación reproducible exacta desde el lockfile (falla si no coinciden)
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- Etapa 2: build ----------
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
 && npm prune --omit=dev          # elimina devDependencies de node_modules

# ---------- Etapa 3: runtime ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Solo lo necesario para ejecutar
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

# Nunca como root: la imagen oficial trae el usuario "node" (uid 1000)
USER node

EXPOSE 3000

# Forma "exec" (array): node es PID 1 y recibe SIGTERM directamente
CMD ["node", "--enable-source-maps", "dist/main.js"]
```

```gitignore
# .dockerignore — lo que NO entra al contexto de build
node_modules
dist
coverage
.git
.env*
*.md
test
docker-compose*.yml
```

### 2.3 Decisiones que debes poder justificar

| Decisión | Por qué |
|---|---|
| `COPY package*.json` **antes** que el código | Docker cachea por capa: si solo cambió `src/`, `npm ci` no se repite |
| `npm ci` y no `npm install` | Reproducible: respeta el lockfile exacto y falla si está desincronizado |
| `node:22-slim` vs `alpine` | Alpine usa **musl** en vez de glibc: módulos nativos (`bcrypt`, `argon2`, `sharp`) pueden requerir compilar o binarios distintos y hay diferencias sutiles de DNS/rendimiento. Slim es un buen default; alpine si mides y funciona. Distroless para superficie mínima |
| `USER node` | Si alguien explota tu app, no es root dentro del contenedor |
| `CMD ["node", ...]` y no `npm run start:prod` | npm como PID 1 no reenvía bien las señales al hijo: tu app no recibe `SIGTERM`, no hace graceful shutdown y termina con `SIGKILL` |
| `.env` fuera de la imagen | Los secretos en una capa quedan para siempre en el historial de la imagen |
| Tag = commit SHA | Trazabilidad y rollback exacto; `latest` no dice qué corre |

> ⚠️ **PID 1**: el proceso con PID 1 en Linux no tiene handlers por defecto para `SIGTERM`/`SIGINT`: si tu código no los maneja, la señal se **ignora**. Nest los maneja con `enableShutdownHooks()`. Si además lanzas procesos hijos, usa `docker run --init` (o `initProcessEnabled` en ECS) para tener un init (tini) que reenvíe señales y recoja zombies.

> ❓ **Entrevista**: *"Tu contenedor tarda exactamente 30 segundos en detenerse en cada deploy. ¿Por qué?"* → Casi seguro el proceso no está recibiendo o no maneja `SIGTERM` (npm/sh como PID 1, forma *shell* del `CMD`, o falta `enableShutdownHooks`), así que el orquestador espera su timeout (30 s por defecto en ECS y `docker stop` usa 10 s) y envía `SIGKILL`. Las requests en vuelo se cortan.

### 2.4 Entorno local con docker compose

```yaml
# docker-compose.yml — paridad dev/prod: mismas versiones de Postgres y Redis que en AWS
services:
  api:
    build: .
    ports: ['3000:3000']
    environment:
      DATABASE_URL: postgres://tienda:tienda@db:5432/tienda
      REDIS_URL: redis://redis:6379
    depends_on:
      db: { condition: service_healthy }
  db:
    image: postgres:16
    environment: { POSTGRES_USER: tienda, POSTGRES_PASSWORD: tienda, POSTGRES_DB: tienda }
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U tienda']
      interval: 5s
      retries: 10
  redis:
    image: redis:7
```

---

## 3. Arranque: fallar rápido

```ts
// src/main.ts (versión de producción)
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // abortOnError: true (default) → si falla la resolución de DI, el proceso termina
  });
  app.useLogger(app.get(Logger));

  app.enableShutdownHooks();          // sección 4

  const server = app.getHttpServer();
  server.keepAliveTimeout = 65_000;   // > idle timeout del ALB (Sesión 33)
  server.headersTimeout = 66_000;

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap().catch((err) => {
  // Un error al arrancar (config inválida, DB inalcanzable) debe MATAR el proceso:
  // el orquestador lo reintenta y el despliegue falla visiblemente
  console.error('Fallo en el arranque', err);
  process.exit(1);
});
```

La validación de configuración de la Sesión 7 es parte del deploy seguro: una variable faltante debe impedir que la tarea pase a `RUNNING`, y el circuit breaker de ECS (sección 7) revierte el despliegue.

---

## 4. Graceful shutdown

### 4.1 El problema

En cada despliegue, autoscaling hacia abajo o reemplazo de un host, el orquestador **detiene** tus contenedores. Si el proceso muere de golpe:
- Las requests en vuelo reciben un error (502 en el ALB).
- Las transacciones quedan a medias, los jobs de BullMQ quedan "activos" hasta que expira su lock.
- Los últimos logs, métricas y spans en buffer se pierden (Sesión 32).

### 4.2 Cómo lo resuelve Nest

Por defecto Nest **no** escucha señales del sistema (registrar listeners tiene un costo y puede interferir con otros handlers). `app.enableShutdownHooks()` registra listeners para `SIGTERM`, `SIGINT`, etc. y, al recibir una, llama a `app.close()`, que ejecuta los hooks en este orden:

```
 SIGTERM
   │
   ▼
 1. onModuleDestroy()                 ← deja de aceptar trabajo nuevo (workers de colas, consumers)
   │
   ▼
 2. beforeApplicationShutdown(signal) ← aún con conexiones abiertas: termina lo que está en curso
   │
   ▼
 3. cierre del servidor HTTP          ← deja de aceptar conexiones, espera las activas
   │
   ▼
 4. onApplicationShutdown(signal)     ← cierra DB, Redis, flush de OTel
   │
   ▼
 el proceso termina cuando no quedan handles abiertos
```

```ts
// src/ordenes/ordenes-queue.worker.ts
import { Injectable, Logger, OnApplicationShutdown, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class OrdenesWorker implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(OrdenesWorker.name);
  private aceptando = true;

  async onModuleDestroy() {
    this.aceptando = false;                 // no tomes jobs nuevos
    this.logger.log('Dejando de consumir la cola de órdenes');
    // con @nestjs/bullmq, el Worker se cierra esperando el job en curso
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log({ signal }, 'Apagado completo');
  }
}
```

TypeORM, Mongoose, `@nestjs/bullmq` y los clientes de microservicios cierran sus conexiones en sus propios hooks: por eso `enableShutdownHooks` es imprescindible también para ellos.

### 4.3 Readiness durante el apagado y conexiones keep-alive

Dos detalles que separan un deploy "casi limpio" de uno limpio:

```ts
// src/health/shutdown-state.service.ts
import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';

@Injectable()
export class ShutdownState implements BeforeApplicationShutdown {
  apagando = false;
  beforeApplicationShutdown() {
    this.apagando = true;   // /health/ready empieza a responder 503 → el LB deja de enviar tráfico
  }
}
```

```ts
// Las conexiones keep-alive ociosas pueden impedir que server.close() termine.
// forceCloseConnections cierra las conexiones abiertas al hacer app.close()
const app = await NestFactory.create(AppModule, { forceCloseConnections: true });
```

> ⚠️ `forceCloseConnections` corta también conexiones con requests en curso. Úsalo junto con un periodo de drenaje previo (el LB ya dejó de enviarte tráfico), no en su lugar.

### 4.4 La coreografía con el load balancer

**ECS + ALB**: al detener una tarea, ECS la **desregistra** del target group, espera el *deregistration delay* (default 300 s; bájalo a 30–60 s para APIs) y recién entonces envía `SIGTERM`; tras `stopTimeout` (default 30 s, máx. 120 s en Fargate) envía `SIGKILL`.

**Kubernetes**: la eliminación del endpoint y el `SIGTERM` ocurren **en paralelo**, así que durante unos segundos pueden seguir llegando requests. Se mitiga con un `preStop` que duerme unos segundos, o con `TerminusModule.forRoot({ gracefulShutdownTimeoutMs })` (Sesión 32), que retrasa el cierre.

```
ECS:  [desregistrar del ALB] ──drain (deregistration delay)──▶ SIGTERM ──stopTimeout──▶ SIGKILL
K8s:  [quitar endpoint] ∥ [preStop sleep] ──▶ SIGTERM ──terminationGracePeriodSeconds──▶ SIGKILL
```

> ❓ **Entrevista**: *"¿Cómo garantizas cero requests perdidas en un deploy?"* → Proceso que recibe `SIGTERM` (exec form, node como PID 1), `enableShutdownHooks`, readiness que pasa a 503 al apagar, drenaje en el LB (deregistration delay / preStop), cierre ordenado de consumidores y conexiones en los lifecycle hooks, timeouts coherentes (drenaje < stopTimeout) y `keepAliveTimeout` mayor que el idle timeout del LB. Y lo verifico con un load test corriendo durante el deploy.

---

## 5. Migraciones de base de datos en el deploy

Nunca `synchronize: true` en producción (Sesión 14). Opciones para ejecutar migraciones:

| Opción | Pros | Contras |
|---|---|---|
| Al arrancar la app (`migrationsRun: true`) | Simple | N réplicas compitiendo; arranque lento; un fallo deja tareas en crash loop |
| **Paso previo en el pipeline** (tarea ECS one-off con el mismo image) | Una sola ejecución, falla antes del deploy | Un paso más en el CD |
| Job separado (K8s Job, Lambda) | Aislado | Más infraestructura |

Y como durante un rolling update conviven **la versión vieja y la nueva** del código contra la misma DB, las migraciones deben ser compatibles hacia atrás: patrón **expand/contract**.

```
 Release 1 (expand):  ADD COLUMN precio_centavos (nullable) + código escribe en ambas
 Release 2 (migrar):  backfill + código lee de la nueva
 Release 3 (contract): DROP COLUMN precio  (ya nadie la usa)
```

> ⚠️ Un `ALTER TABLE ... RENAME COLUMN` en un solo release rompe a las tareas viejas que siguen corriendo durante el deploy: son minutos de 500s.

---

## 6. CI/CD con GitHub Actions

### 6.1 CI: cada PR

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:                          # DB real para los tests e2e (Sesión 22)
        image: postgres:16
        env: { POSTGRES_USER: tienda, POSTGRES_PASSWORD: tienda, POSTGRES_DB: tienda_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U tienda" --health-interval 5s --health-retries 10
    env:
      DATABASE_URL: postgres://tienda:tienda@localhost:5432/tienda_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build               # type-check incluido
      - run: npm test -- --coverage
      - run: npm run test:e2e
      - run: npm audit --audit-level=high --omit=dev
```

### 6.2 CD: de `main` a ECS

Autenticación con **OIDC**: GitHub emite un token firmado y AWS lo cambia por credenciales temporales de un rol IAM. **No** hay access keys guardadas en los secrets del repo.

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write      # necesario para OIDC
  contents: read

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: tienda-api
  ECS_CLUSTER: tienda-prod
  ECS_SERVICE: tienda-api
  CONTAINER_NAME: api

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production          # permite exigir aprobación manual en GitHub
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy-tienda
          aws-region: ${{ env.AWS_REGION }}

      - id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - uses: docker/setup-buildx-action@v3

      - id: image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
          cache-from: type=gha         # caché de capas entre ejecuciones
          cache-to: type=gha,mode=max

      - id: taskdef
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: infra/task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}

      - uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.taskdef.outputs.task-definition }}
          cluster: ${{ env.ECS_CLUSTER }}
          service: ${{ env.ECS_SERVICE }}
          wait-for-service-stability: true    # el job falla si el deploy no se estabiliza
```

Antes del paso de deploy, en un pipeline real agregas: escaneo de la imagen (ECR scan / Trivy), la **tarea one-off de migraciones** (`aws ecs run-task` con el mismo image y comando `node dist/migrate.js`) y el despliegue a staging con smoke tests antes de producción.

> ❓ **Entrevista**: *"¿Por qué OIDC en vez de guardar `AWS_ACCESS_KEY_ID` en los secrets de GitHub?"* → Las access keys son credenciales de larga duración: si se filtran (logs, un fork, un action comprometido) sirven hasta que alguien las rote. Con OIDC las credenciales son temporales (minutos) y la *trust policy* del rol puede restringir qué repo, rama o environment puede asumirlo (`sub: repo:org/tienda:environment:production`).

---

## 7. ECS Fargate

### 7.1 Arquitectura

```
 Internet ─▶ Route 53 ─▶ ALB (HTTPS, ACM cert) ─▶ Target Group (health: /health/ready)
                                                       │
                           ┌───────────────────────────┼───────────────────────────┐
                           ▼                           ▼                           ▼
                   ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
  subnets privadas │ Task (api)   │            │ Task (api)   │            │ Task (api)   │
  (varias AZ)      │ Fargate      │            │ Fargate      │            │ Fargate      │
                   └──────┬───────┘            └──────┬───────┘            └──────┬───────┘
                          └───────────────┬───────────┴────────────────┬──────────┘
                                          ▼                            ▼
                                   RDS Postgres (Multi-AZ)       ElastiCache Redis
   Logs → CloudWatch (awslogs) · Secretos → Secrets Manager · Imagen → ECR
```

- **Cluster**: agrupación lógica. **Service**: mantiene N tareas vivas, las registra en el ALB y gestiona despliegues. **Task definition**: la "receta" versionada (imagen, CPU/memoria, variables, secretos, logs). **Task**: una instancia en ejecución.
- **Fargate**: no gestionas EC2; pagas por vCPU/memoria de la tarea.

### 7.2 Task definition (extracto)

```jsonc
// infra/task-definition.json
{
  "family": "tienda-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "runtimePlatform": { "cpuArchitecture": "ARM64", "operatingSystemFamily": "LINUX" },
  "executionRoleArn": "arn:aws:iam::123456789012:role/tienda-ecs-execution",  // pull de ECR, leer secretos
  "taskRoleArn": "arn:aws:iam::123456789012:role/tienda-api-task",            // permisos de TU app (S3, SQS)
  "containerDefinitions": [
    {
      "name": "api",
      "image": "PLACEHOLDER",                 // lo reemplaza render-task-definition
      "essential": true,
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "NODE_OPTIONS", "value": "--max-old-space-size=768" }   // ~75% de 1 GB (Sesión 33)
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:tienda/db-url" },
        { "name": "JWT_SECRET",   "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/tienda/jwt-secret" }
      ],
      "stopTimeout": 30,
      "linuxParameters": { "initProcessEnabled": true },
      "healthCheck": {
        "command": ["CMD-SHELL", "node -e \"fetch('http://localhost:3000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""],
        "interval": 15, "timeout": 5, "retries": 3, "startPeriod": 20
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tienda-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

> ⚠️ `executionRoleArn` vs `taskRoleArn` es pregunta clásica: el **execution role** lo usa el agente de ECS para *arrancar* la tarea (bajar la imagen, leer los `secrets`, escribir logs); el **task role** lo usa *tu código* vía el SDK de AWS. Mezclarlos da permisos de más o errores `AccessDenied` confusos.

> ⚠️ Si compilas la imagen en un runner x86 y la tarea es `ARM64` (Graviton, más barata), verás `exec format error`. Construye para la plataforma correcta (`platforms: linux/arm64` en `build-push-action`) o multi-arch.

### 7.3 Estrategias de despliegue

```jsonc
// Configuración del service (extracto)
"deploymentConfiguration": {
  "minimumHealthyPercent": 100,   // nunca baja de la capacidad deseada
  "maximumPercent": 200,          // puede duplicar tareas temporalmente
  "deploymentCircuitBreaker": { "enable": true, "rollback": true }  // revierte si las tareas no se estabilizan
}
```

| Estrategia | Cómo | Rollback |
|---|---|---|
| **Rolling update** (default ECS) | Levanta tareas nuevas, espera que estén healthy en el ALB, drena las viejas | Circuit breaker o redeploy de la task definition anterior |
| **Blue/green** | Dos target groups; el tráfico se cambia de golpe o gradual (canary/linear) | Instantáneo: volver al target group anterior. Históricamente con CodeDeploy; ECS incorporó blue/green nativo en 2025 (revisa la documentación vigente) |
| **Canary** | Un % pequeño del tráfico a la versión nueva, se observa, se amplía | Rápido y con poco impacto |

**Autoscaling**: *target tracking* sobre CPU (~60%) o `ALBRequestCountPerTarget`. Define mínimo ≥ 2 tareas en AZ distintas para alta disponibilidad.

> ❓ **Entrevista**: *"El deploy dejó tareas en un ciclo de arranque y caída. ¿Qué pasó y cómo lo contienes?"* → Típicamente config faltante, migración no aplicada o health check mal apuntado (liveness que depende de la DB, `startPeriod` corto para el tiempo de arranque real). El **deployment circuit breaker** con `rollback: true` detecta que las tareas no alcanzan estado estable y vuelve a la última task definition sana; con `minimumHealthyPercent: 100` las tareas viejas nunca dejaron de atender.

---

## 8. Nest en AWS Lambda

### 8.1 ¿Tiene sentido?

| Criterio | ECS Fargate | Lambda |
|---|---|---|
| Tráfico | Sostenido, predecible | Esporádico, con picos, o bajo (paga por uso, escala a cero) |
| Latencia | Estable | **Cold starts** en invocaciones nuevas |
| Conexiones largas (WebSockets, SSE) | ✅ | ❌ (usa API Gateway WebSocket, otro modelo) |
| Trabajo en background tras responder | ✅ | ❌ el entorno se congela al devolver la respuesta |
| Conexiones a la DB | Pool estable | Una por entorno concurrente → RDS Proxy casi obligatorio |
| Límites | Pocos | Timeout máx. 15 min, payload de API Gateway/Function URL limitado |
| Operación | Más infraestructura | Mínima |

Un buen uso: APIs internas o de backoffice con poco tráfico, webhooks, o una app Nest usada como **standalone application** (`NestFactory.createApplicationContext`) para procesar eventos SQS/S3 reutilizando tus servicios y DI.

### 8.2 El handler

```bash
npm i @codegenie/serverless-express
npm i -D @types/aws-lambda
```

```ts
// src/lambda.ts
import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import type { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';

// Se guarda FUERA del handler: vive mientras el entorno de ejecución esté "caliente"
let server: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // la misma configuración global que en main.ts (pipes, filtros, prefijo...)
  await app.init();                              // init, NO listen: no hay puerto que abrir
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp }); // traduce eventos de API Gateway ↔ req/res de Express
}

export const handler: Handler = async (event: unknown, context: Context, callback: Callback) => {
  server = server ?? (await bootstrap());        // cold start: solo la primera invocación del entorno
  return server(event, context, callback);
};
```

> ⚠️ Extrae la configuración común (`useGlobalPipes`, `setGlobalPrefix`, filtros) a una función compartida entre `main.ts` y `lambda.ts`. Es muy común que en Lambda "desaparezca" la validación porque solo se configuró en `main.ts`.

> 💡 Alternativa: **AWS Lambda Web Adapter** ejecuta tu app normal (con `listen` en un puerto) dentro de Lambda y traduce eventos por fuera; no necesitas un handler especial y la misma imagen sirve para ECS y Lambda.

### 8.3 Anatomía y mitigación del cold start

```
 Cold start:  [crear entorno + bajar código] → [iniciar Node + cargar módulos] → [NestFactory: scan + DI] → handler
 Warm:                                                                                                 → handler
```

| Mitigación | Efecto |
|---|---|
| **Bundlear** con esbuild/webpack (un solo archivo, sin miles de `require` a `node_modules`) | Reduce mucho la carga de módulos |
| Menos dependencias pesadas en el camino de arranque (SDKs completos, ORMs grandes) | Menos código que parsear |
| `LazyModuleLoader` para módulos que no todas las rutas usan (Sesión 24) | Menos providers al arrancar |
| Reutilizar la app entre invocaciones (variable `server` de arriba) | Solo se paga una vez por entorno |
| Más memoria asignada | Lambda asigna CPU proporcional a la memoria: arranques más rápidos |
| **Provisioned concurrency** | Entornos pre-inicializados: elimina el cold start a cambio de pagar por ellos |
| SnapStart | Disponible para algunos runtimes (Java, Python, .NET); verifica si ya soporta Node.js antes de contar con ello |

> ⚠️ Con `abortOnError` y una DB inalcanzable, cada cold start falla y reintenta: define timeouts cortos de conexión. Y usa **RDS Proxy**: con 500 invocaciones concurrentes tienes 500 entornos, cada uno con su pool, y agotas `max_connections` de Postgres.

> ❓ **Entrevista**: *"¿Pondrías TiendaApi completa en Lambda?"* → Depende del tráfico. Para una API con tráfico constante, ECS suele ser más barato y predecible, sin cold starts y con pools de DB estables. Lambda brilla con tráfico irregular o bajo y en procesamiento de eventos. Si voy a Lambda: bundling, app cacheada entre invocaciones, RDS Proxy, nada de trabajo después de responder, y provisioned concurrency para rutas sensibles a latencia.

---

## 9. Checklist de producción para TiendaApi

```
[ ] Imagen multi-stage, USER node, CMD exec form, tag = SHA, escaneada
[ ] Config validada al arrancar; secretos desde Secrets Manager / SSM
[ ] enableShutdownHooks + hooks de cierre + readiness 503 al apagar
[ ] keepAliveTimeout > idle del ALB; deregistration delay < stopTimeout coherente
[ ] /health/live (sin deps) y /health/ready (DB) · /metrics interno
[ ] Logs JSON + trazas OTel + alertas sobre SLO (Sesión 32)
[ ] Migraciones como paso previo, compatibles hacia atrás (expand/contract)
[ ] CI: lint, build, unit, e2e, audit · CD con OIDC, staging → prod
[ ] ≥ 2 tareas en AZ distintas, autoscaling, circuit breaker con rollback
[ ] Límites: memoria (--max-old-space-size), body, timeouts, pool de DB
```

---

## Resumen mental de la sesión

```
12-FACTOR: config en env · sin estado · logs a stdout · desechable · build once, promote

DOCKERFILE multi-stage: deps (npm ci, cacheable) → build (nest build, npm prune --omit=dev)
  → runtime (slim, USER node, dist + node_modules prod, CMD ["node","dist/main.js"])
  npm como PID 1 = no llegan señales · .dockerignore · alpine = musl (ojo nativos)

GRACEFUL SHUTDOWN: app.enableShutdownHooks()
  SIGTERM → onModuleDestroy → beforeApplicationShutdown → cierre HTTP → onApplicationShutdown
  readiness 503 al apagar · forceCloseConnections · drain del LB antes (ECS) / preStop (K8s)

MIGRACIONES: paso previo del pipeline · expand/contract (versiones conviven en el deploy)

GITHUB ACTIONS: CI (services postgres, lint/build/test/e2e/audit)
  CD: OIDC (id-token: write) → configure-aws-credentials → ecr-login → build-push (tag SHA)
      → render-task-definition → ecs-deploy-task-definition (wait-for-service-stability)

ECS FARGATE: ALB → target group (/health/ready) → service → tasks en subnets privadas
  execution role (arrancar) ≠ task role (tu código) · secrets desde ARN
  rolling (min 100 / max 200) + circuit breaker rollback · blue/green · autoscaling

LAMBDA: @codegenie/serverless-express · app.init() sin listen · app cacheada fuera del handler
  cold start: bundle, menos deps, lazy modules, más memoria, provisioned concurrency
  RDS Proxy · sin trabajo post-respuesta · Web Adapter como alternativa
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Por qué multi-stage? ¿Qué va en cada etapa y por qué copias `package*.json` antes que el código?
2. ❓ ¿Por qué `CMD ["node", "dist/main.js"]` y no `npm run start:prod`? ¿Qué tiene de especial el PID 1?
3. ❓ Alpine vs slim vs distroless para una app Nest: ¿qué consideras?
4. ❓ ¿Qué hace `enableShutdownHooks()` y por qué no viene activado por defecto?
5. ❓ ¿En qué orden se ejecutan los lifecycle hooks de apagado y qué harías en cada uno?
6. ❓ Describe la coreografía de un deploy sin requests perdidas en ECS con ALB. ¿Qué cambia en Kubernetes?
7. ❓ ¿Cómo ejecutas migraciones en un deploy con rolling update? Explica expand/contract.
8. ❓ ¿Por qué OIDC en vez de access keys en GitHub Actions? ¿Qué restringes en la trust policy?
9. ❓ Diferencia entre `executionRoleArn` y `taskRoleArn` en ECS.
10. ❓ ¿Qué hace el deployment circuit breaker y qué configuración de `minimumHealthyPercent` usarías?
11. ❓ ¿Cómo adaptas Nest a Lambda? ¿Por qué `app.init()` y no `app.listen()`, y por qué cachear la app fuera del handler?
12. ❓ ¿Qué compone un cold start de Nest en Lambda y cómo lo reduces? ¿Por qué RDS Proxy?

## Ejercicio práctico
1. Escribe el Dockerfile multi-stage y el `.dockerignore` de la sección 2. Construye (`docker build -t tienda-api:local .`) y compara el tamaño con una versión de una sola etapa.
2. Verifica el usuario: `docker run --rm tienda-api:local id` debe mostrar `uid=1000(node)`.
3. Agrega `OrdenesWorker` con logs en `onModuleDestroy` y `onApplicationShutdown`. Ejecuta el contenedor, haz `docker stop` y confirma en los logs el orden de los hooks y que el contenedor se detiene en < 1 s (no en 10 s).
4. Cambia el `CMD` a `["npm", "run", "start:prod"]`, repite `docker stop` y mide cuánto tarda. Explica la diferencia.
5. Crea un endpoint `GET /lento` que tarde 5 s. Lanza una request, envía `docker stop` al segundo 1 y verifica que la request **termina** correctamente antes de que el proceso salga.
6. Implementa `ShutdownState` y haz que `/health/ready` devuelva 503 cuando `apagando` sea `true`.
7. Crea `ci.yml` con el servicio de Postgres y haz que un PR con un test roto quede en rojo.
8. (AWS) Crea el rol IAM con trust policy OIDC para tu repo, el repositorio ECR, el cluster Fargate, el ALB y el service con circuit breaker. Despliega con `deploy.yml`. Rompe a propósito una variable de entorno requerida y observa cómo el circuit breaker revierte.
9. (AWS, opcional) Despliega TiendaApi en Lambda con `src/lambda.ts` (bundle con esbuild o webpack) detrás de una Function URL. Mide el tiempo de la primera invocación vs las siguientes en CloudWatch (`Init Duration`) y compara con y sin bundling.

---

➡️ **Cuando termines**, marca la Sesión 34 en el [README](README.md) y pasa a la **Sesión 35 — Internals de NestJS y preparación de entrevista senior**.
