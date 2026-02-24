# Elastic Load Balancing (ELB)

**Elastic Load Balancing (ELB)** es un servicio administrado de **AWS** que **distribuye automáticamente el tráfico entrante** entre múltiples recursos (EC2, contenedores, IPs, Lambdas) para lograr **alta disponibilidad, escalabilidad y tolerancia a fallos**.

## ¿Para qué sirve ELB?

ELB se encarga de:

- Repartir tráfico entre varios servidores
- Detectar instancias caídas (**health checks**)
- Redirigir tráfico solo a instancias sanas
- Escalar automáticamente junto con Auto Scaling
- Terminar SSL/TLS (HTTPS)
- Soportar millones de requests sin que tú hagas nada

👉 En resumen: **evita que tu app se caiga cuando hay carga o fallos**.

## Tipos de Load Balancer en AWS

### 1️⃣ Application Load Balancer (ALB)
- **Capa 7 (HTTP/HTTPS)**
- Ideal para apps web, APIs REST/GraphQL, microservicios.

### 2️⃣ Network Load Balancer (NLB)
- **Capa 4 (TCP/UDP)**
- Ideal para tráfico muy alto y latencia ultra baja.

### 3️⃣ Gateway Load Balancer (GWLB)
- **Capa 3/4**
- Ideal para firewalls y appliances de red.

### 4️⃣ Classic Load Balancer (CLB)
- **Legacy / obsoleto**
- No recomendado para nuevos proyectos.