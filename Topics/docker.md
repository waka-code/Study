# Docker Masterclass - Senior DevOps Engineer Guide

> Guía completa de Docker para Senior DevOps Engineers y Backend Engineers. Domina Docker internamente para aprobar entrevistas técnicas avanzadas y diseñar infraestructuras modernas, escalables, seguras y listas para producción.

---

## Tabla de Contenidos

1. [Fundamentos Internos de Docker](#fundamentos-internos-de-docker)
2. [Imágenes Docker Profundo](#imágenes-docker-profundo)
3. [Dockerfile Avanzado](#dockerfile-avanzado)
4. [Networking Profundo](#networking-profundo)
5. [Volúmenes y Persistencia](#volúmenes-y-persistencia)
6. [Docker Compose Profundo](#docker-compose-profundo)
7. [Seguridad en Docker](#seguridad-en-docker)
8. [Performance y Optimización](#performance-y-optimización)
9. [Docker en Producción](#docker-en-producción)
10. [Docker + Kubernetes](#docker--kubernetes)
11. [CI/CD con Docker](#cicd-con-docker)
12. [Observabilidad y Debugging](#observabilidad-y-debugging)
13. [Arquitectura Moderna con Docker](#arquitectura-moderna-con-docker)
14. [Docker para Aplicaciones Reales](#docker-para-aplicaciones-reales)
15. [Docker Avanzado Internamente](#docker-avanzado-internamente)
16. [Entrevistas Técnicas Senior Docker](#entrevistas-técnicas-senior-docker)
17. [Cómo Responde un Senior Docker Engineer](#cómo-responde-un-senior-docker-engineer)

---

## Fundamentos Internos de Docker

### ¿Qué es Docker Realmente?

Docker es una **plataforma de contenedorización** que utiliza tecnologías del kernel Linux para empaquetar, distribuir y ejecutar aplicaciones de manera aislada.

**Docker NO es:**
- Una máquina virtual
- Un hypervisor
- Un sistema operativo completo

**Docker SÍ es:**
- Una herramienta de empaquetado
- Un runtime de contenedores
- Una plataforma de orquestación básica
- Un estándar de distribución (OCI)

---

### Arquitectura de Docker

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker CLI                              │
│  (docker build, docker run, docker ps, docker exec, etc.)   │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Docker Daemon (dockerd)                  │
│  - Gestiona imágenes, contenedores, redes, volúmenes        │
│  - Escucha API REST                                         │
│  - Orquesta containerd                                      │
└────────────────────┬────────────────────────────────────────┘
                     │ gRPC
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                     containerd                              │
│  - Runtime de alto nivel                                    │
│  - Gestiona el ciclo de vida de contenedores                │
│  - Gestiona imágenes y storage                              │
└────────────────────┬────────────────────────────────────────┘
                     │ OCI Runtime API
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                       runc                                   │
│  - Runtime de bajo nivel (implementación OCI)               │
│  - Crea y ejecuta contenedores                              │
│  - Usa namespaces y cgroups del kernel                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Linux Kernel                                │
│  - Namespaces (PID, NET, MNT, IPC, UTS, USER)               │
│  - Cgroups (CPU, Memory, I/O)                               │
│  - Capabilities                                             │
│  - Seccomp                                                   │
│  - OverlayFS                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

### Namespaces - Aislamiento de Procesos

Los namespaces son el mecanismo que Docker usa para **aislar procesos**.

| Namespace | Aísla | Comando Linux |
|-----------|-------|---------------|
| **PID** | IDs de procesos | `unshare --pid` |
| **NET** | Red, interfaces, routing | `unshare --net` |
| **MNT** | Sistema de archivos, mount points | `unshare --mount` |
| **IPC** | System V IPC, POSIX message queues | `unshare --ipc` |
| **UTS** | Hostname y domain name | `unshare --uts` |
| **USER** | User IDs y group IDs | `unshare --user` |

**Ejemplo práctico:**
```bash
# Sin Docker - proceso ve todos los procesos del host
ps aux

# Con Docker - proceso solo ve procesos del contenedor
docker run alpine ps aux
# Output: solo 1-2 procesos (PID 1 es el proceso principal)
```

---

### Cgroups - Control de Recursos

Los cgroups permiten **limitar y monitorear recursos** de grupos de procesos.

| Controlador | Función | Ejemplo |
|-------------|---------|---------|
| **cpu** | Limita CPU time | `--cpus="1.5"` |
| **memory** | Limita memoria | `--memory="512m"` |
| **blkio** | Limita I/O de disco | `--device-read-bps` |
| **pids** | Limita número de procesos | `--pids-limit` |
| **cpuset** | Asigna CPUs específicas | `--cpuset-cpus` |

```bash
# Limitar contenedor a 1 CPU y 512MB RAM
docker run --cpus="1" --memory="512m" stress --cpu 4
```

---

### Union File Systems y OverlayFS

Docker usa **Union File Systems** para construir imágenes en capas (layers).

```
┌─────────────────────────────────────┐
│         Container Layer (RW)        │ ← Cambios en tiempo de ejecución
├─────────────────────────────────────┤
│         Layer 3 (RO)                │ ← CMD, ENTRYPOINT
├─────────────────────────────────────┤
│         Layer 2 (RO)                │ ← COPY application code
├─────────────────────────────────────┤
│         Layer 1 (RO)                │ ← RUN apt-get install
├─────────────────────────────────────┤
│         Base Image (RO)             │ ← FROM ubuntu:22.04
└─────────────────────────────────────┘
```

**Copy-on-Write (CoW):** Cuando un contenedor necesita modificar un archivo, Docker copia el archivo del layer RO al layer RW antes de modificarlo.

---

### Imágenes vs Contenedores

| Aspecto | Imagen | Contenedor |
|---------|--------|------------|
| **Naturaleza** | Template estático | Instancia en ejecución |
| **Mutabilidad** | Inmutable | Mutable (en runtime) |
| **Storage** | Layers RO | Layer RW + layers RO |
| **Ciclo de vida** | Persiste hasta eliminación | Temporal (puede recrearse) |

---

### Lifecycle de un Contenedor

```
CREATED → RUNNING → STOPPED → EXITED → REMOVED
           ↑           ↓
           └───────────┘ (docker start)
```

**Estados adicionales:**
- **PAUSED**: Contenedor pausado (congelado)
- **RESTARTING**: Contenedor reiniciándose
- **DEAD**: Contenedor muerto (error crítico)

---

### Diferencia entre VM y Contenedores

#### Virtual Machine (VM)
```
┌─────────────────────────────────────────┐
│         Application A                    │
│         Application B                    │
├─────────────────────────────────────────┤
│         Guest OS (Kernel completo)       │
├─────────────────────────────────────────┤
│         Hypervisor (KVM, VMware, etc.)  │
├─────────────────────────────────────────┤
│         Host OS (Kernel)                 │
├─────────────────────────────────────────┤
│         Hardware                         │
└─────────────────────────────────────────┘
```

#### Contenedor Docker
```
┌─────────────────────────────────────────┐
│         Application A   │  Application B │
├─────────────────────────────────────────┤
│         Docker Engine                   │
├─────────────────────────────────────────┤
│         Host OS Kernel (Compartido)     │
├─────────────────────────────────────────┤
│         Hardware                         │
└─────────────────────────────────────────┘
```

**Comparación:**
- VM: Kernel propio, mayor aislamiento, mayor overhead, startup lento
- Contenedor: Kernel compartido, aislamiento parcial, menor overhead, startup rápido

---

### Kernel Sharing

Los contenedores **comparten el kernel del host**. Esto implica:
- Solo Linux (Docker en Mac/Windows usa VM)
- Dependencia del kernel version
- Root en contenedor = root en kernel (sin user namespace)

---

## Imágenes Docker Profundo

### Cómo se Construyen Imágenes

```bash
docker build -t myapp:1.0 .
```

**Pasos internos:**
1. Parse Dockerfile
2. Enviar build context al daemon
3. Crear layers por cada instrucción
4. Cache de layers por hash
5. Generar manifest y config

---

### Layers Internamente

Cada layer tiene:
- **Chain ID**: Hash acumulado de layers anteriores
- **Diff ID**: Hash del contenido descomprimido
- **Digest**: Hash del contenido comprimido

```bash
# Ver historia de layers
docker history myapp:1.0
```

---

### Caché de Build

Docker cachea layers basado en:
1. Instrucción exacta (string match)
2. Context de build (hash de archivos)
3. Imagen base (digest)

**Estrategia de caching:**
```dockerfile
# ❌ Invalida cache siempre
COPY . /app
RUN npm install

# ✅ Cache npm install si package.json no cambió
COPY package*.json ./
RUN npm install
COPY . /app
```

---

### Multi-Stage Builds

Permite usar múltiples `FROM` en un Dockerfile, copiando artefactos entre stages.

```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

**Ventajas:**
- Imágenes más pequeñas (sin herramientas de build)
- Mejor seguridad (sin secrets de build)
- Mejor caching (stages independientes)

---

### Image Optimization

**Estrategias:**
1. Base image pequeña (alpine, slim, distroless)
2. Layer merging (combinar RUN)
3. Orden inteligente (dependencies primero)
4. .dockerignore
5. Multi-stage builds

**Ejemplo:**
```dockerfile
# Antes (850MB)
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y nodejs npm

# Después (120MB)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM alpine:3.18
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

---

### Distroless Images

Imágenes que **NO incluyen** shell, package manager, ni herramientas del sistema.

```dockerfile
# Node.js distroless
FROM gcr.io/distroless/nodejs18-debian11

# Python distroless
FROM gcr.io/distroless/python3-debian11
```

**Ventajas:** Super pequeñas (2-10MB), super seguras
**Desventajas:** No debugging (no shell)

---

### Alpine vs Debian vs Ubuntu

| Aspecto | Alpine | Debian Slim | Ubuntu |
|---------|--------|-------------|--------|
| **Tamaño** | ~7MB | ~80MB | ~120MB |
| **glibc** | musl libc | glibc | glibc |
| **Paquetes** | apk (menos) | apt (muchos) | apt (muchos) |
| **Compatibilidad** | Puede tener issues | Alta | Alta |

**Recomendación:** Usar `-slim` por defecto, `-alpine` si necesitas ultra pequeño.

---

### BuildKit Internamente

BuildKit es el **nuevo motor de build** de Docker con:
- Builds paralelos
- Cache avanzado (remote cache)
- Build secrets
- SSH forwarding

```bash
# Habilitar BuildKit
export DOCKER_BUILDKIT=1

# Cache en registry
docker build \
  --cache-from type=registry,ref=myregistry.com/myapp:cache \
  --cache-to type=registry,ref=myregistry.com/myapp:cache \
  -t myapp:latest .
```

---

### Image Tagging

```bash
# Semantic versioning
myapp:1.0.0
myapp:staging
myapp:production

# Git commit
myapp:abc1234
```

**Anti-Patrón:** Evitar `latest` en producción, usar versiones específicas.

---

### Image Immutability

Una vez construida, una imagen **nunca cambia**.

```bash
# ❌ MAL - Modificar imagen en runtime
docker run -it myapp bash
apt-get update

# ✅ BIEN - Reconstruir imagen
docker build -t myapp:v1.0.1 .
```

---

### Docker Image Registries

| Registry | Uso | Pricing |
|----------|-----|---------|
| **Docker Hub** | Público/privado | Gratis/Pro |
| **GitHub Container Registry (GHCR)** | Integración GitHub | Gratis |
| **AWS ECR** | AWS | Por uso |
| **Google Artifact Registry** | GCP | Por uso |

**Ejemplo GHCR:**
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u username --password-stdin
docker tag myapp:1.0.0 ghcr.io/username/myapp:1.0.0
docker push ghcr.io/username/myapp:1.0.0
```

---

## Dockerfile Avanzado

### Instrucciones Detalladas

#### FROM
```dockerfile
FROM node:18.16.0
FROM node@sha256:abc123...  # reproducible
FROM --platform=linux/amd64 node:18
```

#### RUN
```dockerfile
# Shell form
RUN apt-get update && apt-get install -y nodejs

# Exec form
RUN ["apt-get", "update"]

# Con BuildKit cache
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y nodejs
```

#### CMD vs ENTRYPOINT
```dockerfile
# CMD - puede ser overriden
CMD ["node", "index.js"]

# ENTRYPOINT - no puede ser overriden fácilmente
ENTRYPOINT ["node", "index.js"]

# Combinados
ENTRYPOINT ["node"]
CMD ["index.js"]
```

#### COPY vs ADD
```dockerfile
# COPY - solo archivos locales
COPY package.json ./

# ADD - extrae tar, URLs
ADD archive.tar.gz /app/

# ✅ Usar COPY siempre
COPY --from=builder /app/dist ./dist
```

#### WORKDIR
```dockerfile
WORKDIR /app
RUN npm install  # ejecuta en /app
```

#### ENV vs ARG
```dockerfile
# ARG - build-time
ARG VERSION=1.0.0
FROM node:${VERSION}

# ENV - build + runtime
ENV NODE_ENV=production
```

#### USER
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

#### HEALTHCHECK
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1
```

---

### Buenas Practices

**1. Imágenes pequeñas**
```dockerfile
FROM node:18-alpine AS builder
COPY --from=builder /app/dist ./dist
```

**2. Sin root**
```dockerfile
RUN adduser -S appuser
USER appuser
```

**3. Caching inteligente**
```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

**4. Layers mínimos**
```dockerfile
RUN apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean
```

---

### Anti Patrones

```dockerfile
# ❌ latest tag
FROM node:latest

# ❌ múltiples RUN
RUN apt-get update
RUN apt-get install -y nodejs

# ❌ COPY todo al principio
COPY . .
RUN npm install

# ❌ ejecutar como root
USER root

# ❌ secrets en imagen
ENV API_KEY=secret123
```

---

## Networking Profundo

### Drivers de Red

| Driver | Descripción |
|--------|-------------|
| **bridge** | Por defecto, red privada |
| **host** | Comparte red del host |
| **overlay** | Multi-host (Swarm) |
| **macvlan** | MAC address real |
| **none** | Sin red |

### Bridge Network

```bash
# Crear bridge personalizado
docker network create mybridge

# Usar bridge
docker run --network mybridge nginx

# Contenedores en mismo bridge se comunican por nombre
docker exec web1 ping web2
```

### DNS Interno

Docker incluye un **DNS resolver interno**:
```bash
docker exec web1 ping web2
# web2 → 172.17.0.3
```

### Port Mapping

```bash
# Port mapping
docker run -p 8080:80 nginx

# Bind a IP específica
docker run -p 127.0.0.1:8080:80 nginx

# Puerto aleatorio
docker run -p 80 nginx
```

**Internamente usa iptables NAT.**

### Reverse Proxies

**NGINX:**
```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

**Traefik:**
```yaml
services:
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
  
  backend:
    image: myapp
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`localhost`)"
```

---

## Volúmenes y Persistencia

### Tipos de Storage

| Tipo | Descripción |
|------|-------------|
| **Volumes** | Gestionado por Docker |
| **Bind mounts** | Directorio del host |
| **tmpfs** | En memoria RAM |

### Volumes

```bash
# Crear volume
docker volume create mydata

# Usar volume
docker run -v mydata:/data nginx

# En docker-compose
services:
  app:
    volumes:
      - mydata:/data

volumes:
  mydata:
```

### Bind Mounts

```bash
# Montar directorio
docker run -v /host/path:/container/path nginx

# Read-only
docker run -v /host/path:/container/path:ro nginx
```

### tmpfs

```bash
# Montar tmpfs
docker run --tmpfs /tmp nginx

# Con tamaño
docker run --tmpfs /tmp:size=1G nginx
```

### Database Containers

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

### Backup Strategies

```bash
# Backup de volume
docker run --rm --volumes-from backup \
  -v $(pwd):/backup alpine \
  tar czf /backup/pgdata-backup.tar.gz /data
```

---

## Docker Compose Profundo

### Cómo Funciona Internamente

Docker Compose es una **herramienta de orquestación** que:
- Parsea docker-compose.yml
- Crea networks, volumes
- Inicia servicios en orden
- Gestiona dependencias

### Multi-Container Architecture

```yaml
version: '3.8'
services:
  nginx:
    image: nginx
    ports:
      - "80:80"
    depends_on:
      - backend
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/db
    depends_on:
      postgres:
        condition: service_healthy
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Health Checks

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Profiles

```yaml
services:
  app:
    image: myapp
    profiles:
      - production
  
  app-dev:
    image: myapp:dev
    profiles:
      - development
```

```bash
# Iniciar con profile
docker compose --profile production up
```

### Override Files

```bash
# docker-compose.yml (base)
# docker-compose.override.yml (local)
# docker-compose.prod.yml (producción)

docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

---

## Seguridad en Docker

### Container Isolation

**Namespaces** proporcionan aislamiento, pero no es perfecto:
- Kernel compartido = vulnerabilidades compartidas
- Root en contenedor puede ser root en host

### Rootless Containers

```bash
# Ejecutar Docker sin root
dockerd-rootless-setuptool.sh install

# Usar rootless
export DOCKER_HOST=unix:///run/user/1000/docker.sock
```

### Linux Capabilities

```bash
# Por defecto, Docker droppea muchas capabilities
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE nginx

# Capabilities comunes:
CAP_NET_BIND_SERVICE  # Bind ports < 1024
CAP_NET_ADMIN         # Configurar red
CAP_SYS_ADMIN         # Casi todo (evitar)
```

### Seccomp

```bash
# Docker tiene perfil seccomp por defecto
docker run --security-opt seccomp=default.json nginx

# Perfil personalizado
docker run --security-opt seccomp=my-profile.json nginx
```

### AppArmor/SELinux

```bash
# AppArmor (Ubuntu/Debian)
docker run --security-opt apparmor=docker-default nginx

# SELinux (RHEL/CentOS)
docker run --security-opt label=level:s0:c100,c200 nginx
```

### Secrets Management

```yaml
# Docker Swarm secrets
services:
  app:
    image: myapp
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

```bash
# Docker BuildKit secrets
docker build --secret id=token,secret.txt -t myapp .
```

### Image Scanning

```bash
# Trivy
trivy image myapp:1.0.0

# Snyk
snyk container test myapp:1.0.0

# Docker Scout
docker scout cves myapp:1.0.0
```

### Supply Chain Security

**Image signing:**
```bash
# Docker Content Trust
export DOCKER_CONTENT_TRUST=1
docker push myapp:1.0.0
```

**SBOM (Software Bill of Materials):**
```bash
# Syft
syft myapp:1.0.0 -o spdx-json > sbom.json

# Grype (scan con SBOM)
grype sbom.json
```

### Escape de Contenedores

**Vulnerabilidades comunes:**
- Privileged mode (`--privileged`)
- Mount de `/` o `/proc`
- Socket de Docker (`-v /var/run/docker.sock`)
- Capabilities excesivas

**Mitigación:**
```bash
# ❌ MAL
docker run --privileged -v /:/host nginx

# ✅ BIEN
docker run --read-only --cap-drop ALL nginx
```

---

## Performance y Optimización

### Optimización de Imágenes

```dockerfile
# Multi-stage
FROM node:18 AS builder
RUN npm run build

FROM alpine:3.18
COPY --from=builder /app/dist ./dist

# .dockerignore
node_modules
npm-debug.log
.git
```

### Resource Limits

```bash
# CPU limits
docker run --cpus="1.5" nginx
docker run --cpuset-cpus="0,1" nginx

# Memory limits
docker run --memory="512m" nginx
docker run --memory-swap="1g" nginx

# I/O limits
docker run --device-read-bps /dev/sda:1mb nginx
```

### Layer Caching

```bash
# Build con cache
docker build --cache-from myapp:latest -t myapp:latest .

# BuildKit remote cache
docker build \
  --cache-from type=registry,ref=myapp:cache \
  --cache-to type=registry,ref=myapp:cache \
  -t myapp .
```

### Startup Optimization

```dockerfile
# CMD con señal handling
CMD ["node", "index.js"]

# Graceful shutdown
STOPSIGNAL SIGTERM
```

### Benchmarking

```bash
# Medir tamaño
docker images myapp

# Medir startup time
time docker run myapp

# Medir resource usage
docker stats
```

---

## Docker en Producción

### Estrategias de Deployment

**Blue/Green:**
```bash
# Versión azul
docker compose -f docker-compose.blue.yml up -d

# Versión verde
docker compose -f docker-compose.green.yml up -d

# Switch
# Update load balancer
```

**Canary:**
```bash
# 10% canary
docker compose up --scale app=10
# Redirigir 10% del tráfico
```

**Rolling Update:**
```bash
# Docker Swarm
docker service update --image myapp:v2 myapp

# Kubernetes
kubectl set image deployment/myapp myapp=myapp:v2
```

### Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Graceful Shutdown

```dockerfile
# STOPSIGNAL
STOPSIGNAL SIGTERM

# Timeout
docker run --stop-timeout 30 myapp
```

### Logging

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Monitoring

```bash
# Docker stats
docker stats

# Prometheus + cAdvisor
docker run -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  google/cadvisor
```

---

## Docker + Kubernetes

### Relación Docker y Kubernetes

- **Docker**: Runtime de contenedores
- **Kubernetes**: Orquestador de contenedores
- Kubernetes soporta múltiples runtimes (containerd, CRI-O)

### Pods

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    ports:
    - containerPort: 3000
```

### Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:1.0.0
```

### Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### ConfigMaps y Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_URL: "postgres://..."
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  API_KEY: c2VjcmV0...
```

---

## CI/CD con Docker

### GitHub Actions

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to GHCR
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ghcr.io/${{ github.repository }}:latest
        cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
        cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
```

### Layer Caching en CI

```yaml
- name: Build with cache
  run: |
    docker build \
      --cache-from type=registry,ref=myapp:cache \
      --cache-to type=registry,ref=myapp:cache \
      -t myapp:${{ github.sha }} .
```

### Multi-Platform Builds

```yaml
- name: Build multi-platform
  run: |
    docker buildx build \
      --platform linux/amd64,linux/arm64 \
      -t myapp:latest \
      --push .
```

---

## Observabilidad y Debugging

### Docker Logs

```bash
# Ver logs
docker logs myapp

# Follow logs
docker logs -f myapp

# Logs con timestamp
docker logs -t myapp

# Logs de últimos N líneas
docker logs --tail 100 myapp
```

### Logging Drivers

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Drivers disponibles:** json-file, syslog, journald, gelf, fluentd, awslogs, splunk, etwlogs, none.

### Docker Events

```bash
# Ver eventos en tiempo real
docker events

# Filtrar eventos
docker events --filter 'event=stop'
```

### Container Inspection

```bash
# Inspeccionar contenedor
docker inspect myapp

# Ver IP
docker inspect --format='{{.NetworkSettings.IPAddress}}' myapp

# Ver mounts
docker inspect --format='{{json .Mounts}}' myapp
```

### Debugging Networking

```bash
# Ver network
docker network inspect bridge

# Ver DNS
docker exec myapp cat /etc/resolv.conf

# Ver conexiones
docker exec myapp netstat -tulpn
```

### Debugging Performance

```bash
# Stats en tiempo real
docker stats

# Stats específicos
docker stats --no-stream myapp

# Ver cgroups
docker exec myapp cat /proc/self/cgroup
```

---

## Arquitectura Moderna con Docker

### Microservices

```yaml
services:
  api-gateway:
    image: nginx
    ports:
      - "80:80"
  
  auth-service:
    build: ./auth
    environment:
      DATABASE_URL: postgres://...
  
  user-service:
    build: ./users
    environment:
      DATABASE_URL: postgres://...
  
  notification-service:
    build: ./notifications
    environment:
      KAFKA_BROKERS: kafka:9092
```

### Sidecar Pattern

```yaml
services:
  app:
    image: myapp
  sidecar:
    image: log-collector
    volumes:
      - /var/log/app:/var/log/app
```

### API Gateway

```yaml
services:
  gateway:
    image: kong:latest
    ports:
      - "8000:8000"
      - "8443:8443"
    environment:
      KONG_DATABASE: "off"
```

---

## Docker para Aplicaciones Reales

### Node.js

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### React

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### PostgreSQL

```dockerfile
FROM postgres:15-alpine
COPY init.sql /docker-entrypoint-initdb.d/
ENV POSTGRES_PASSWORD=secret
ENV POSTGRES_DB=mydb
```

### Full-Stack App

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/db
      REDIS_URL: redis://redis:6379
    ports:
      - "4000:4000"
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

---

## Docker Avanzado Internamente

### Namespaces Internamente

**PID Namespace:**
```c
// Crear nuevo PID namespace
clone(CLONE_NEWPID | SIGCHLD, child_stack);
```

**Network Namespace:**
```c
// Crear nuevo network namespace
unshare(CLONE_NEWNET);
```

### Cgroups Internamente

```bash
# Ver cgroups v2
/sys/fs/cgroup/
├── docker/
│   └── <container-id>/
│       ├── cpu.max
│       ├── memory.max
│       └── pids.max
```

### OverlayFS Internamente

```
/overlay/
├── upper/          # Container layer (RW)
├── work/           # Work directory para CoW
└── lower/
    ├── layer1/
    ├── layer2/
    └── layer3/
```

### OCI Specification

**Runtime Spec:** Define cómo ejecutar un contenedor
- config.json (configuración)
- rootfs (filesystem)

**Image Spec:** Define formato de imágenes
- manifest (metadata)
- config (configuración)
- layers (filesystem diffs)

---

## Entrevistas Técnicas Senior Docker

### Preguntas Reales

**1. ¿Cuál es la diferencia entre una imagen y un contenedor?**
- Imagen: template estático, inmutable
- Contenedor: instancia en ejecución, mutable en runtime

**2. ¿Cómo funciona el copy-on-write en Docker?**
- Layers son read-only
- Container layer es read-write
- Al modificar, Docker copia del layer RO al RW

**3. ¿Qué son los namespaces y cgroups?**
- Namespaces: aislamiento de recursos (PID, NET, MNT, etc.)
- Cgroups: control de recursos (CPU, memory, I/O)

**4. ¿Cuándo usarías multi-stage builds?**
- Para reducir tamaño de imagen
- Para separar dependencias de build de runtime
- Para mejorar seguridad

**5. ¿Cómo optimizarías una imagen Docker?**
- Base image pequeña (alpine, slim)
- Multi-stage builds
- Layer caching inteligente
- .dockerignore
- Combinar RUN commands

**6. ¿Qué es BuildKit y por qué es importante?**
- Nuevo motor de build
- Builds paralelos
- Cache avanzado
- Build secrets
- SSH forwarding

**7. ¿Cómo funciona el networking en Docker?**
- Bridge por defecto
- DNS interno
- iptables NAT para port mapping
- Multiple drivers (bridge, host, overlay, etc.)

**8. ¿Cómo persistir datos en Docker?**
- Volumes (gestionado por Docker)
- Bind mounts (directorio del host)
- tmpfs (en memoria)

**9. ¿Cómo asegurarías un contenedor Docker?**
- No ejecutar como root
- Drop capabilities
- Usar seccomp/AppArmor/SELinux
- Escanear imágenes
- No incluir secrets
- Usar distroless

**10. ¿Cuál es la diferencia entre CMD y ENTRYPOINT?**
- CMD: comando por defecto, puede ser overriden
- ENTRYPOINT: ejecutable principal, no puede ser overriden fácilmente

### Problemas de Producción

**Escenario 1: Contenedor consume toda la memoria del host**
```bash
# Solución: Limitar memoria
docker run --memory="512m" --memory-swap="1g" myapp
```

**Escenario 2: Contenedor no puede acceder a internet**
```bash
# Verificar DNS
docker exec myapp cat /etc/resolv.conf

# Verificar network
docker network inspect bridge
```

**Escenario 3: Imagen es demasiado grande**
```bash
# Usar multi-stage
# Usar alpine/slim
# Limpiar caches en RUN
# Usar .dockerignore
```

---

## Cómo Responde un Senior Docker Engineer

### Justificar Decisiones de Contenedorización

**Pregunta:** ¿Por qué dockerizar esta aplicación?

**Respuesta Senior:**
- **Portabilidad:** Mismo ambiente en dev, test, prod
- **Isolación:** No conflictos de dependencias
- **Escalabilidad:** Fácil escalar horizontalmente
- **CI/CD:** Build y deploy consistentes
- **Resource efficiency:** Mejor que VMs

**Trade-offs:**
- Overhead de aprendizaje
- Complejidad de debugging
- Security considerations

### Detectar Problemas de Seguridad

**Checklist:**
1. ¿Ejecuta como root?
2. ¿Incluye secrets en la imagen?
3. ¿Usa --privileged?
4. ¿Monta /var/run/docker.sock?
5. ¿Tiene vulnerabilities conocidas?
6. ¿Usa base image actualizada?

### Optimizar Imágenes

**Estrategia:**
1. Analizar tamaño actual (`docker images`)
2. Identificar layers grandes (`docker history`)
3. Usar multi-stage builds
4. Cambiar base image a alpine/slim
5. Combinar RUN commands
6. Agregar .dockerignore

### Diseñar Infraestructuras Containerizadas

**Consideraciones:**
1. **Microservices vs Monolith:** Granularidad adecuada
2. **Networking:** Bridge vs overlay vs host
3. **Storage:** Volumes vs bind mounts
4. **Security:** Least privilege, scanning
5. **Observability:** Logging, monitoring, tracing
6. **CI/CD:** Automated builds and deploys

---

## Roadmap Senior Docker

### Nivel 1: Fundamentos (1-2 meses)
- [ ] Comprender arquitectura de Docker
- [ ] Dominar Dockerfile básico
- [ ] Entender images vs containers
- [ ] Usar docker-compose básico

### Nivel 2: Intermedio (2-3 meses)
- [ ] Multi-stage builds
- [ ] Networking avanzado
- [ ] Volúmenes y persistencia
- [ ] Docker Compose avanzado

### Nivel 3: Avanzado (3-4 meses)
- [ ] Security (capabilities, seccomp, AppArmor)
- [ ] Performance optimization
- [ ] BuildKit
- [ ] CI/CD con Docker

### Nivel 4: Expert (4-6 meses)
- [ ] Kubernetes
- [ ] Service mesh
- [ ] Observabilidad avanzada
- [ ] Arquitectura de microservices

### Nivel 5: Senior (6+ meses)
- [ ] Diseño de infraestructuras
- [ ] Troubleshooting complejo
- [ ] Optimización a escala
- [ ] Mentorship y arquitectura

---

## Checklist Completo Senior Docker

### Fundamentos
- [ ] Entender arquitectura de Docker (CLI, daemon, containerd, runc)
- [ ] Comprender namespaces y cgroups
- [ ] Entender OverlayFS y copy-on-write
- [ ] Saber diferencia entre VM y contenedores
- [ ] Entender kernel sharing

### Imágenes
- [ ] Dominar Dockerfile avanzado
- [ ] Entender layers y caching
- [ ] Usar multi-stage builds
- [ ] Optimizar tamaño de imágenes
- [ ] Entender distroless, alpine, slim
- [ ] Usar BuildKit
- [ ] Entender tagging y versioning
- [ ] Saber usar diferentes registries

### Networking
- [ ] Entender bridge, host, overlay, macvlan, none
- [ ] Configurar DNS interno
- [ ] Entender port mapping e iptables
- [ ] Usar reverse proxies (NGINX, Traefik)
- [ ] Configurar load balancing

### Storage
- [ ] Usar volumes, bind mounts, tmpfs
- [ ] Configurar persistencia para databases
- [ ] Implementar backup strategies
- [ ] Entender storage drivers

### Docker Compose
- [ ] Configurar multi-container apps
- [ ] Usar health checks
- [ ] Gestionar dependencias
- [ ] Usar profiles y override files
- [ ] Escalar servicios

### Seguridad
- [ ] No ejecutar como root
- [ ] Entender y usar capabilities
- [ ] Configurar seccomp, AppArmor, SELinux
- [ ] Gestionar secrets correctamente
- [ ] Escanear imágenes (Trivy, Snyk)
- [ ] Entender supply chain security
- [ ] Prevenir container escapes

### Performance
- [ ] Optimizar imágenes
- [ ] Configurar resource limits
- [ ] Usar layer caching
- [ ] Optimizar startup time
- [ ] Benchmarkear contenedores

### Producción
- [ ] Implementar blue/green deployments
- [ ] Implementar rolling updates
- [ ] Configurar health checks
- [ ] Implementar graceful shutdown
- [ ] Configurar logging centralizado
- [ ] Implementar monitoring

### Kubernetes
- [ ] Entender pods, deployments, services
- [ ] Configurar ConfigMaps y Secrets
- [ ] Usar Persistent Volumes
- [ ] Implementar autoscaling

### CI/CD
- [ ] Integrar Docker en pipelines
- [ ] Usar layer caching en CI
- [ ] Implementar multi-platform builds
- [ ] Automatizar deployments

### Observabilidad
- [ ] Configurar logging drivers
- [ ] Implementar metrics (Prometheus)
- [ ] Implementar tracing
- [ ] Debugging avanzado

### Arquitectura
- [ ] Diseñar microservices
- [ ] Implementar API Gateway
- [ ] Usar sidecar pattern
- [ ] Diseñar arquitecturas event-driven

---

## Recursos Adicionales

### Documentación Oficial
- Docker Documentation: https://docs.docker.com/
- OCI Specification: https://github.com/opencontainers
- containerd: https://containerd.io/

### Herramientas
- Trivy: https://github.com/aquasecurity/trivy
- Syft: https://github.com/anchore/syft
- Grype: https://github.com/anchore/grype
- Dive: https://github.com/wagoodman/dive

### Cursos
- Docker Mastery: Udemy
- Docker for the Absolute Beginner: Udemy
- Docker Certified Associate: Udemy

### Libros
- "Docker Deep Dive" by Nigel Poulton
- "The Docker Book" by James Turnbull
- "Docker in Action" by Jeff Nickoloff

---

**Conclusión:** Dominar Docker a nivel Senior requiere entender no solo cómo usar las herramientas, sino también cómo funcionan internamente. Esta guía cubre desde los fundamentos del kernel Linux hasta arquitecturas de producción complejas. Practica cada concepto, construye proyectos reales, y prepárate para entrevistas técnicas con los ejemplos proporcionados.
