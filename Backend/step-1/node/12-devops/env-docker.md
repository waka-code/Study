# Variables de Entorno y Docker

## .env y dotenv

### Archivo .env

```bash
# .env (NUNCA commit esto)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost/mydb
JWT_SECRET=your-secret-key-here
API_KEY=sk_live_abcd1234
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### Cargar con dotenv

```bash
npm install dotenv
```

```javascript
// main.js - PRIMERO, antes de nada
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});
```

### Validar Variables Requeridas

```javascript
// config/env.js
require('dotenv').config();

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  API_KEY: process.env.API_KEY,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
```

```javascript
// app.js
const config = require('./config/env');
// Todas las variables validadas
```

### .env.example (Commit esto)

```bash
# .env.example (compartir con equipo)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost/mydb
JWT_SECRET=change-me-in-production
API_KEY=
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### .gitignore

```bash
# .gitignore
.env
.env.local
.env.*.local
secrets/
```

## Docker para Node.js

### Dockerfile Simple

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --only=production

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "app.js"]
```

### Build y Run

```bash
# Build
docker build -t myapp:1.0 .

# Run
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  myapp:1.0

# Con .env file
docker run -p 3000:3000 \
  --env-file .env.production \
  myapp:1.0
```

## Multi-stage Builds (Optimizado)

Reduce tamaño de imagen separando build de runtime:

```dockerfile
# Stage 1: Build
FROM node:18 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # Compilar TypeScript, etc

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Copiar node_modules del builder
COPY --from=builder /app/node_modules ./node_modules
# Copiar build output
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/app.js"]
```

### Ventajas

```
Dockerfile simple:   800MB
Multi-stage:        150MB  (5.3x más pequeño)
```

## Healthcheck en Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "app.js"]
```

```javascript
// healthcheck.js
const http = require('http');

const req = http.get('http://localhost:3000/health', (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // Healthy
  } else {
    process.exit(1); // Unhealthy
  }
});

req.on('error', () => {
  process.exit(1);
});

setTimeout(() => {
  process.exit(1); // Timeout
}, 5000);
```

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    volumes:
      - .:/app # Hot reload en desarrollo
    networks:
      - mynetwork

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - mynetwork

  cache:
    image: redis:7-alpine
    networks:
      - mynetwork

volumes:
  db_data:

networks:
  mynetwork:
    driver: bridge
```

```bash
# Usar
docker-compose up -d     # Iniciar en background
docker-compose logs -f   # Ver logs
docker-compose down      # Parar y limpiar
```

## Optimización de Imagen

### .dockerignore

```
node_modules
npm-debug.log
.git
.env
.env.local
dist
.vscode
.DS_Store
```

### Layers Optimization

```dockerfile
# ❌ MAL: Cada RUN crea layer
FROM node:18
RUN apt-get update
RUN apt-get install -y curl git
RUN npm install -g pm2

# ✅ BIEN: Una sola layer
FROM node:18
RUN apt-get update && \
    apt-get install -y curl git && \
    npm install -g pm2

# ❌ MAL: COPY está al inicio (invalida cache si cambia)
COPY . .
RUN npm install

# ✅ BIEN: package primero
COPY package*.json ./
RUN npm install
COPY . .
```

## Ambiente Production vs Development

```dockerfile
# Dockerfile con args
FROM node:18-alpine

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

WORKDIR /app
COPY package*.json ./

# Instalar solo dependencias necesarias
RUN if [ "$NODE_ENV" = "production" ]; \
      then npm ci --only=production; \
      else npm ci; \
    fi

COPY . .

EXPOSE 3000
CMD ["node", "app.js"]
```

```bash
# Production
docker build -t myapp:prod .

# Development (con dev dependencies)
docker build -t myapp:dev --build-arg NODE_ENV=development .
```

## Security Best Practices

```dockerfile
# ✅ BIEN: No correr como root
FROM node:18-alpine

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000
CMD ["node", "app.js"]
```

## Debugging en Docker

```bash
# Entrar en container
docker exec -it container_id sh

# Ver logs
docker logs -f container_id

# Inspeccionar variables
docker exec container_id env

# Debug mode
docker run -it --entrypoint /bin/sh myapp:latest
```

## Referencias

- [logs-monitoring.md](./logs-monitoring.md)
- [pm2-process-manager.md](./pm2-process-manager.md)
- [graceful-shutdown.md](../07-errores-estabilidad/graceful-shutdown.md)

## Pregunta de Entrevista

**¿Por qué usar multi-stage builds en Docker?**

Reduce significativamente el tamaño de imagen final. Etapa 1 (builder) instala dependencias de desarrollo y compila. Etapa 2 (runtime) copia solo lo necesario. Resultado: imagen más pequeña, más rápida de descargar/ejecutar, menor superficie de ataque.
