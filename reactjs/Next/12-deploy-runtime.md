# Deploy & Runtime en Next.js

Incluye Vercel vs self-host, Edge vs Node, Dockerizar Next, env por entorno y CI/CD.

**Ejemplo Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Nota:** Vercel facilita el deploy, pero puedes usar Docker y CI/CD personalizados.
