# Auto Scaling + Load Balancer

## El combo obligatorio

ASG y ELB son **inseparables en producción**. Juntos forman la base de cualquier arquitectura escalable en AWS.

## Arquitectura

```
Internet
   ↓
Application Load Balancer
   ↓
Auto Scaling Group
   ↓
EC2
```

## ¿Cómo interactúan?

| Componente | Acción |
| --- | --- |
| ELB | Recibe tráfico y lo distribuye |
| ASG | Crea/elimina instancias según métricas |
| ELB + ASG | ELB registra automáticamente las nuevas EC2 del ASG |

## Flujo completo

1. Llega tráfico → ELB lo recibe
2. ELB hace health checks → solo envía tráfico a instancias sanas
3. CPU sube → ASG lanza más EC2
4. ELB detecta las nuevas EC2 → empieza a enviarles tráfico
5. Tráfico baja → ASG termina EC2 sobrantes
6. ELB las desregistra automáticamente

## Health Checks compartidos

- El ASG puede usar el **health check del ELB**
- Si ELB marca una instancia como no sana → ASG la termina y crea una nueva
- Esto crea un ciclo de **auto-reparación**

## Resultado

- Cero downtime
- Escalado automático sin intervención
- Costo optimizado (pagas solo lo necesario)
