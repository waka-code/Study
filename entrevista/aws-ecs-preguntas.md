# Preguntas de Entrevista AWS — Stack de Contenedores (ECS)

> Enfoque en el stack: **ECS, ECR, RDS, S3, CloudFront, Cognito, VPC, IAM** + los tres pegamentos: **ALB, Secrets Manager, CloudWatch**.
> Respuestas pensadas para entrevista: cortas, con el *por qué* y el *cuándo*.

---

## Preguntas base

### ¿Por qué usar ECS y no EC2?
Son cosas distintas y ahí está el truco. EC2 es una **máquina virtual**; ECS es un **orquestador de contenedores**. La comparación real es "gestionar contenedores a mano sobre EC2" vs. "dejar que ECS los orqueste". Con ECS obtienes reinicio automático de tareas caídas, escalado, integración con ALB, health checks y despliegues controlados sin escribir esa lógica tú. Usas ECS cuando tu app va en contenedores (Docker) y quieres orquestación gestionada sin la complejidad de Kubernetes (EKS).

### ¿Cuándo usarías Fargate en lugar de EC2 (launch type de ECS)?
**Fargate = serverless para contenedores**: no gestionas, parcheas ni escalas servidores; pagas por vCPU/memoria de la tarea.
- **Fargate** cuando: no quieres administrar el SO ni el capacity, cargas variables/intermitentes (batch, picos), y quieres aislamiento fuerte por tarea.
- **EC2 launch type** cuando: necesitas control del host (GPU, kernel, agentes), optimizar costo con Reserved/Spot en cargas grandes y constantes, o más densidad de contenedores por instancia.

### ¿Por qué poner CloudFront delante de S3?
- **Latencia**: cachea en edge locations cerca del usuario.
- **Costo**: transferencia por CloudFront más barata y reduce peticiones a S3.
- **Seguridad**: el bucket queda **privado**; añades HTTPS/TLS, WAF y protección DDoS (Shield).
- **Control**: dominio propio, headers, redirecciones, restricción geográfica.

### ¿Cómo proteges un bucket S3 para que solo CloudFront pueda acceder?
Con **OAC (Origin Access Control)** — reemplazo moderno de OAI:
1. Bucket **privado** (Block Public Access activado).
2. Creas un OAC y lo asocias a la distribución de CloudFront.
3. En la *bucket policy* permites `s3:GetObject` **solo** al servicio de CloudFront, restringido con condición `AWS:SourceArn` al ARN de tu distribución.

Resultado: acceso directo a la URL de S3 → *Access Denied*; solo CloudFront lee el origen.

### ¿Qué diferencia hay entre un Security Group y una Network ACL?

| | Security Group | Network ACL |
|---|---|---|
| Nivel | Instancia / ENI (recurso) | Subred |
| Estado | **Stateful** (respuesta sale sola) | **Stateless** (permitir ida y vuelta) |
| Reglas | Solo *allow* | *Allow* y *deny* |
| Evaluación | Todas juntas | Por orden numérico, para en la 1ª coincidencia |
| Default | Deniega lo no permitido | Permite todo |

Mnemotécnica: SG = firewall del servidor (stateful); NACL = firewall de la subred (stateless, con deny explícito). SG es la 1ª línea; NACL es defensa en profundidad.

### ¿Cómo harías un despliegue sin downtime en ECS?
- **Rolling update** (nativo): `minimumHealthyPercent` (ej. 100%) y `maximumPercent` (ej. 200%). ECS levanta tareas nuevas, espera health checks del ALB, drena conexiones de las viejas (*connection draining*) y recién ahí las apaga.
- **Blue/Green con CodeDeploy**: levanta el entorno *green* en paralelo, el ALB conmuta el tráfico, permite *canary* (10% primero) y **rollback instantáneo** si saltan alarmas de CloudWatch. El más seguro para producción crítica.

### ¿Cómo almacenas secretos de forma segura para una app en ECS?
Con **Secrets Manager** o **SSM Parameter Store (SecureString)**. En la *task definition* referencias el secreto por ARN en el bloque `secrets`; ECS lo inyecta como **variable de entorno en runtime**. Regla de oro: **nada de secretos en la imagen, ni en el código, ni en texto plano en la task definition**.
- Secrets Manager: rotación automática (ideal para credenciales RDS), algo más caro.
- Parameter Store: gratis en tier estándar, sin rotación automática nativa.

### ¿Qué permisos IAM necesita una tarea de ECS para acceder a S3 o Secrets Manager?
Distinguir **dos roles** (punto muy preguntado):
- **Task Execution Role** (lo usa el agente de ECS para *arrancar* la tarea): tirar imagen de ECR (`ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:GetAuthorizationToken`), logs (`logs:CreateLogStream`, `logs:PutLogEvents`) y **leer secretos al inyectarlos** (`secretsmanager:GetSecretValue`).
- **Task Role** (lo usa tu **app en runtime**): permisos a S3 (`s3:GetObject`/`s3:PutObject` sobre el ARN del bucket) u otros secretos que la app lea directamente.

Siempre **mínimo privilegio**: acotado al ARN concreto, nunca `*`.

---

## Los tres pegamentos

### ALB (Application Load Balancer)
Capa 7 (HTTP/HTTPS). Distribuye a las tareas ECS vía **target groups**, hace *health checks*, routing por path/host (`/api` → servicio A, `/web` → B) y termina TLS. Puerta de entrada estándar a ECS. Diferencia con NLB: NLB es capa 4 (TCP), para ultra-baja latencia o protocolos no-HTTP.

### Secrets Manager vs Parameter Store
Rotación automática → **Secrets Manager**. Configuración simple y gratis → **Parameter Store (SecureString)**.

### CloudWatch
Tres cosas: **Logs** (`stdout` de contenedores), **Metrics** (CPU, memoria, requests) y **Alarms** (disparan acciones o SNS). Se conecta con el **auto scaling** de ECS: alarma de CPU alta → escala tareas. Es la observabilidad base.

---

## Preguntas extra que conviene preparar

### ¿Diferencia entre ECS y EKS? ¿Cuándo Kubernetes?
EKS si ya tienes ecosistema K8s o necesitas portabilidad multi-cloud; ECS si quieres simplicidad y estás casado con AWS.

### ¿Qué es una VPC y cómo separas subredes públicas y privadas?
Tareas ECS y RDS en **subredes privadas**; ALB en **públicas**. Salida a internet desde privadas vía **NAT Gateway**.

### ¿Cómo se conecta ECS a RDS de forma segura?
RDS en subred privada; su Security Group permite el puerto (5432/3306) **solo desde el SG de las tareas ECS** (referencia SG-a-SG, no rangos de IP).

### ¿Multi-AZ vs Read Replicas en RDS?
Multi-AZ = **alta disponibilidad** (failover automático). Read Replicas = **escalar lecturas**. No son lo mismo.

### ¿Rol de IAM vs usuario de IAM? ¿Por qué roles y no access keys?
Roles = credenciales temporales rotadas solas. Nunca claves largas en el código.

### ¿Qué hace Cognito? User Pool vs Identity Pool
User Pool = **autenticación** (login, tokens JWT). Identity Pool = **autorización** a recursos AWS (credenciales temporales). Muy preguntado y suele confundirse.

### ECR: ¿cómo se autentica push/pull y por qué escanear imágenes?
Autenticación vía token de `ecr:GetAuthorizationToken` (docker login). Escaneo de vulnerabilidades + *lifecycle policies* para limpiar imágenes viejas.

---

## Flujo completo del stack (para explicar de punta a punta)

```
Usuario
  │  HTTPS
  ▼
CloudFront ──► S3 (estáticos, bucket privado vía OAC)
  │
  ▼
ALB (capa 7, health checks, TLS)   [subred pública]
  │
  ▼
ECS / Fargate (tareas)             [subred privada]
  │  imagen ◄── ECR
  │  secretos ◄── Secrets Manager
  │  logs/metrics ──► CloudWatch
  ▼
RDS (Multi-AZ)                     [subred privada]

IAM  → Task Execution Role (arranca la tarea) + Task Role (permisos de la app)
Cognito → auth de usuarios (User Pool) + acceso a recursos (Identity Pool)
VPC  → SGs (stateful) + NACLs (stateless) + NAT Gateway para salida
```

**Historia narrativa**: contenedor → registro (ECR) → orquestación (ECS/Fargate) → base de datos (RDS) → almacenamiento (S3) → CDN (CloudFront) → auth (Cognito) → red (VPC) → permisos (IAM), con ALB de entrada, Secrets Manager para secretos y CloudWatch para observabilidad.

---

## Fundamentos por servicio (definiciones que debes poder explicar)

### ECS — Task, Service, Cluster
- **Task**: la unidad de ejecución. Es una o varias contenedores corriendo juntos según una **Task Definition** (el "plano": imagen, CPU/memoria, puertos, variables, secretos, roles). Análogo a "una instancia de tu app".
- **Service**: mantiene N tareas corriendo (*desired count*), las reemplaza si mueren, las conecta al ALB y gestiona los despliegues (rolling/blue-green). Es lo que da **alta disponibilidad**.
- **Cluster**: agrupación lógica donde corren las tareas/servicios. Con Fargate es solo un contenedor lógico; con EC2 son las instancias que aportan el capacity.

Jerarquía: `Cluster` → contiene `Services` → que mantienen `Tasks` → definidas por una `Task Definition`.

### ECR — subir, versionar y usar imágenes
1. **Autenticar** Docker contra ECR: `aws ecr get-login-password | docker login ...`.
2. **Tag + push**: `docker build -t app .`, `docker tag app:latest <cuenta>.dkr.ecr.<region>.amazonaws.com/app:v1`, `docker push ...`.
3. **Versionar**: usar tags semánticos (`v1`, `v1.2.0`) o el SHA del commit en vez de solo `latest` (evita ambigüedad en despliegues y rollbacks).
4. **Usar desde ECS**: en la Task Definition, `image` apunta al ARN/URI de la imagen en ECR; el **Task Execution Role** hace el pull.
- Extra: **image scanning** (vulnerabilidades) y **lifecycle policies** (borrar imágenes viejas automáticamente).

### RDS — backups, motores y escalado
- **Motores**: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server y **Aurora** (compatible MySQL/Postgres, más rendimiento y HA gestionada por AWS).
- **Backups**: *automated backups* con **point-in-time recovery** (retención hasta 35 días) + **snapshots manuales** (persisten hasta que los borres).
- **Multi-AZ**: réplica síncrona en otra AZ para **failover automático** → alta disponibilidad (no escala lecturas).
- **Read Replicas**: réplicas asíncronas para **escalar lecturas** (reporting, cargas de solo lectura); pueden estar en otra región.
- **Escalado**: vertical (cambiar clase de instancia), storage autoscaling, y horizontal de lecturas con réplicas. Aurora Serverless escala capacidad automáticamente.

### S3 — hosting, versionado y lifecycle
- **Static website hosting**: S3 sirve HTML/CSS/JS estático directamente (aunque en producción se pone **CloudFront delante** por HTTPS, caché y bucket privado).
- **Versionado**: guarda versiones de cada objeto → protege contra sobreescrituras y borrados accidentales (recuperación).
- **Lifecycle policies**: reglas automáticas para mover objetos a clases más baratas (Standard → **IA → Glacier**) o **expirarlos** tras X días → optimiza costo.
- **Clases de almacenamiento**: Standard, Intelligent-Tiering, Standard-IA, Glacier (según frecuencia de acceso).

### CloudFront — invalidaciones y TTL
- La caché sirve contenido hasta que expira su **TTL**.
- **Invalidación**: fuerza a CloudFront a descartar objetos cacheados antes del TTL (ej. `/*` o `/index.html`) tras un deploy, para que sirva la versión nueva.
- Alternativa a invalidar mucho: **versionar los nombres de archivo** (`app.a1b2c3.js`) → cada deploy cambia la URL y no necesitas invalidar (más barato y sin latencia de propagación).

### Cognito — integración con React / APIs
- **User Pool**: directorio de usuarios; maneja registro, login, MFA y emite **tokens JWT** (ID, Access, Refresh).
- **Frontend (React)**: con **Amplify** o `amazon-cognito-identity-js` el usuario hace login y recibe el JWT; se guarda y se manda en cada request.
- **Backend/API**: el **Access Token (JWT)** viaja en el header `Authorization: Bearer <token>`; API Gateway/ALB/tu backend valida la firma contra el User Pool antes de autorizar.
- **Identity Pool**: intercambia el token por **credenciales temporales de AWS** para que el cliente acceda directo a recursos (ej. subir a S3) con permisos IAM acotados.

### VPC — Internet Gateway vs NAT Gateway
- **Internet Gateway (IGW)**: da acceso **bidireccional** a internet a las **subredes públicas** (el ALB entra por aquí).
- **NAT Gateway**: permite que las **subredes privadas** tengan salida **solo saliente** a internet (ej. ECS descarga dependencias o llama a APIs externas) **sin ser accesibles desde fuera**. Vive en una subred pública.
- Regla: público = tiene ruta a IGW; privado = tiene ruta a NAT (o nada).

### IAM — Policies (y sus piezas)
- **Policy**: documento JSON que define permisos. Piezas: `Effect` (Allow/Deny), `Action` (`s3:GetObject`), `Resource` (ARN concreto) y opcional `Condition`.
- **Tipos**: *managed* (AWS o propias, reutilizables) vs *inline* (pegadas a una sola identidad).
- Se **adjuntan** a Users, Groups o **Roles**. Mínimo privilegio = `Action`/`Resource` lo más específicos posible, nunca `"*"` salvo que sea inevitable.
- **User** (persona/credencial larga) vs **Role** (identidad asumible con credenciales temporales) → para servicios como ECS **siempre roles**.

---

## Despliegue de Frontend

### AWS Amplify
Plataforma **all-in-one** para apps web/móviles. Dos caras que suelen confundirse:
- **Amplify Hosting**: CI/CD gestionado para frontends. Conectas el repo (GitHub/GitLab), en cada `push` **buildea y despliega** automáticamente, sirve por CDN con HTTPS, dominios propios, *preview* por branch y rollback. Ideal para SPA/SSG (React, Vue, Next.js).
- **Amplify Libraries/CLI**: SDK y herramientas para conectar el frontend con backend AWS (Auth con Cognito, API con AppSync/API Gateway, Storage con S3) escribiendo poco código.

**Cuándo usarlo**: quieres deploy rápido con Git-push-to-deploy y sin montar infraestructura. **Trade-off**: menos control fino y puede salir más caro a escala que S3 + CloudFront armado a mano.

### Cómo desplegar un frontend SIN Amplify

**Opción 1 — S3 + CloudFront (la más común para SPA/estáticos):**
1. `npm run build` genera los estáticos (`dist/` o `build/`).
2. Subir a un bucket **S3 privado**: `aws s3 sync ./dist s3://mi-bucket --delete`.
3. **CloudFront** delante con **OAC** (bucket privado, HTTPS, caché global, dominio propio).
4. **SPA routing**: configurar *custom error responses* en CloudFront → 403/404 devuelven `/index.html` con código 200, para que React Router maneje las rutas.
5. Tras cada deploy: **invalidar** la caché (`aws cloudfront create-invalidation --paths "/*"`) o versionar los nombres de archivo.
6. **CI/CD**: automatizar los pasos 2 y 5 con GitHub Actions / CodePipeline + CodeBuild.

Este es el patrón "Amplify hecho a mano": más pasos, pero control total y más barato a escala.

**Opción 2 — Frontend con SSR (ej. Next.js con servidor):**
- **En contenedor sobre ECS/Fargate** detrás de un ALB (igual que un backend). Tiene sentido si ya tienes el stack ECS montado y quieres SSR/API routes.
- O **serverless**: Lambda + API Gateway / Lambda@Edge (más complejo de armar a mano).

**Opción 3 — EC2 + Nginx**: servir el build estático o hacer de reverse proxy. Poco recomendado hoy para estáticos (tienes que gestionar el servidor); solo si hay requisitos muy específicos.

**Regla rápida**:
- Estático/SPA puro → **S3 + CloudFront** (o Amplify si quieres cero-config).
- SSR/Next.js con servidor → **ECS/Fargate + ALB** (o serverless).
- Quiero Git-push-to-deploy sin infra → **Amplify Hosting**.
