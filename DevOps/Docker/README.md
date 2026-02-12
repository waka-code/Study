# Docker para Seniors

Docker resuelve la portabilidad y consistencia de entornos. Un senior debe dominar:

- Imagen vs contenedor
- Dockerfile vs docker-compose
- Dockerizar frontend y backend
- Variables de entorno en Docker
- Multi-stage builds
- Exponer puertos
- Volúmenes (conceptual)

**Ejemplo Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

> Saber explicar multi-stage build y variables de entorno es clave para destacar.
