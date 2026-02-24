# Auto Scaling Group (ASG)

Un **Auto Scaling Group (ASG)** es un servicio de **AWS** que **crea, elimina y mantiene** instancias EC2 automáticamente para que tu aplicación:

- Nunca se quede sin capacidad.
- No se caiga si una instancia falla.
- No gastes de más cuando no hay tráfico.

👉 Es **el cerebro que escala** tus servidores.

## ¿Qué hace exactamente un ASG?

1️⃣ **Cantidad correcta de instancias**
- Mantiene siempre el número deseado (`desired capacity`).
- Si una EC2 muere → la reemplaza sola.

2️⃣ **Escalado automático**
- Agrega instancias cuando sube la carga.
- Elimina instancias cuando baja.

3️⃣ **Alta disponibilidad**
- Distribuye instancias entre **múltiples AZ**.
- Integración directa con **ELB / ALB**.

## Componentes de un Auto Scaling Group

### 1️⃣ Launch Template
Define **cómo nace cada EC2**:
- AMI, tipo de instancia, Security Groups, User Data, etc.

### 2️⃣ Capacidades del ASG
| Parámetro | Qué hace |
| --- | --- |
| `min` | Mínimo de instancias |
| `desired` | Instancias normales |
| `max` | Máximo permitido |

### 3️⃣ Availability Zones
- El ASG reparte instancias entre AZs.
- Si una AZ cae → la app sigue viva.