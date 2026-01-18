# Contenedores

## Docker
- Herramienta para empaquetar aplicaciones y sus dependencias en contenedores portables.

### Ejemplo Dockerfile (TypeScript/Node.js)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

### Ejemplo Dockerfile (C#)
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["MyApp/MyApp.csproj", "MyApp/"]
RUN dotnet restore "MyApp/MyApp.csproj"
COPY . .
WORKDIR "/src/MyApp"
RUN dotnet build "MyApp.csproj" -c Release -o /app/build
FROM build AS publish
RUN dotnet publish "MyApp.csproj" -c Release -o /app/publish
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

---

## Docker Compose
- Orquesta múltiples contenedores (app, base de datos, etc) en un solo archivo.

### Ejemplo
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
```

---

## Kubernetes (conceptos)
- Orquestador de contenedores para despliegue, escalado y gestión automática.
- Conceptos clave: Pod, Service, Deployment, ReplicaSet, Namespace, Ingress.
