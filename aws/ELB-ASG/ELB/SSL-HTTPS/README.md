# SSL / HTTPS con ELB

## ¿Qué es la terminación SSL?

ELB puede **terminar SSL/TLS** antes de enviar el tráfico a las instancias. Esto significa que:

- El cliente se conecta al ELB por **HTTPS**
- El ELB desencripta la conexión
- Envía el tráfico internamente como **HTTP** (o HTTPS si se configura)

## Integración con AWS ACM

AWS Certificate Manager (ACM) permite:

- **Certificados gratis** para tus dominios
- **Renovación automática**
- Instalación directa en el Load Balancer

## Flujo de tráfico

```
Cliente
   ↓ HTTPS (443)
ELB (termina SSL aquí)
   ↓ HTTP (80) — tráfico interno
EC2 / Containers
```

## Beneficios

- **Mejor rendimiento**: las EC2 no gastan CPU en encriptar/desencriptar
- **Certificados gratis**: ACM no tiene costo si se usa con ELB
- **Renovación automática**: no hay que gestionar vencimientos
- **Centralizado**: un solo certificado para todas las instancias

## Configuración típica

| Listener | Puerto | Protocolo |
| --- | --- | --- |
| HTTPS | 443 | SSL/TLS termination en ELB |
| HTTP | 80 | Redirigir a HTTPS |

## Buenas prácticas

- Siempre redirigir HTTP → HTTPS
- Usar certificados de ACM (gratis y automáticos)
- Habilitar **HTTP/2** en ALB para mejor rendimiento
- Configurar **Security Policy** para TLS moderno (TLS 1.2+)
