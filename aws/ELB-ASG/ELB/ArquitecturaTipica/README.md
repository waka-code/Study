# Arquitectura Típica con ELB

## Diagrama

```
Internet
   ↓
Application Load Balancer
   ↓
Auto Scaling Group
   ↓
EC2 / Containers
```

## ¿Qué pasa en esta arquitectura?

- El ALB recibe todo el tráfico entrante
- Hace health checks a las instancias
- Envía requests solo a instancias sanas
- Si una instancia cae → cero downtime
- Si aumenta el tráfico → se escalan instancias automáticamente

## Componentes clave

| Componente | Rol |
| --- | --- |
| Internet | Fuente del tráfico |
| ALB | Distribuye y filtra tráfico |
| ASG | Escala instancias según demanda |
| EC2 | Procesa las requests |

## Beneficios

- **Alta disponibilidad**: si una EC2 cae, el ALB redirige a las sanas
- **Escalabilidad**: el ASG agrega instancias cuando hay más carga
- **Sin downtime**: todo es automático y transparente al usuario
