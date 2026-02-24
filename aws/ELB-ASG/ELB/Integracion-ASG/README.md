# ELB + Auto Scaling Group

## ¿Por qué van juntos?

ELB y ASG se complementan para lograr **escalabilidad real sin intervención manual**.

- **ELB** distribuye el tráfico
- **ASG** crea y elimina instancias según la carga
- ELB **detecta las nuevas instancias automáticamente**

## ¿Cómo interactúan?

```
Internet
   ↓
Application Load Balancer
   ↓
Auto Scaling Group
   ↓
EC2 (escala automáticamente)
```

| Componente | Responsabilidad |
| --- | --- |
| ELB | Distribuir tráfico y hacer health checks |
| ASG | Crear/eliminar instancias según métricas |
| Integración | ELB registra/desregistra EC2 del ASG automáticamente |

## Flujo de escalado

1. Aumenta el tráfico
2. ASG detecta la métrica (CPU, requests, etc.)
3. ASG lanza nuevas EC2
4. ELB detecta las nuevas instancias automáticamente
5. ELB empieza a enviarles tráfico

## Flujo de reducción

1. Baja el tráfico
2. ASG detecta capacidad sobrante
3. ASG termina instancias
4. ELB las desregistra automáticamente
5. Cero downtime

## Resultado

- **Cero downtime**
- **Costo optimizado** (solo pagas lo que usas)
- **Sin intervención manual**
