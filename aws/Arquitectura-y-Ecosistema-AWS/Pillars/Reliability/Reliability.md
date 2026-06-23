# Pilar 3 — Fiabilidad (Reliability)

Este documento resume el pilar de **Fiabilidad** del AWS Well‑Architected Framework: objetivos, principios, prácticas, métricas, checklist y ejemplos enfocados en construir sistemas resilientes que se recuperan de fallos y continúan funcionando.

## Objetivos clave

- Diseñar sistemas que se recuperen automáticamente de fallos.
- Minimizar downtime y pérdida de datos mediante redundancia y backup.
- Probar resiliencia y DR periódicamente.
- Escalar de forma confiable bajo carga.

## Principios de diseño

- **Diseña para fallos**: asume que componentes fallarán y diseña para recuperación automática.
- **Redundancia**: replica datos y componentes en múltiples zonas de disponibilidad (AZs) o regiones.
- **Circuit breakers y retry logic**: maneja degradaciones gracefully y evita cascadas de fallos.
- **Disaster Recovery (DR)**: planifica recuperación ante desastres mayores; define RTO/RPO.
- **Validación y testing**: prueba failovers, backups y recuperación con regularidad.

## Prácticas recomendadas

- **Alta disponibilidad (HA)**:
  - Multi-AZ: despliega aplicaciones en al menos 2 AZs con load balancing.
  - Auto Scaling: escala automáticamente bajo carga y recupera instancias defectuosas.
  - Managed services: usa RDS, DynamoDB, ECS/EKS (managed) que ofrecen HA built-in.
- **Estrategias de backup y recuperación**:
  - Backups automáticos y regulares (RDS snapshots, EBS snapshots, S3 versioning).
  - Cross-region replication para disaster recovery.
  - Definir y documentar RTO (Recovery Time Objective) y RPO (Recovery Point Objective).
- **Resilience patterns**:
  - Timeouts y retry con exponential backoff.
  - Circuit breakers para evitar fallos en cascada.
  - Bulkheads (aislamiento de fallos por componente).
  - Degradation graciosa (fallback a funcionalidad limitada).
- **Testing y validación**:
  - Chaos engineering (AWS FIS) para probar resiliencia ante fallos inyectados.
  - Disaster recovery drills periódicos.
  - Load testing para validar escalabilidad.
  - Test de failover para replicación y backups.
- **Monitoreo y alertas**:
  - Métricas de disponibilidad y latencia.
  - Alertas tempranas de degradación (antes de impacto total).
  - Health checks en aplicaciones y componentes.

## Estrategias de Disaster Recovery

El AWS Well-Architected recomienda 4 estrategias (también conocidas como 4 Rs de DR):

1. **Backup & Restore**: guardar backups regularmente; restaurar en caso de desastre (RTO/RPO más alto).
2. **Pilot Light**: mantener réplica mínima en otra región; activar bajo demanda (RTO/RPO moderado).
3. **Warm Standby**: réplica parcial activa en otra región; esclalar bajo demanda (RTO/RPO bajo).
4. **Multi-site Active‑Active**: réplica completa activa en múltiples regiones con traffic routing (RTO/RPO mínimo, coste más alto).

## Métricas y KPIs sugeridos

- **Availability %**: uptime / (uptime + downtime).
- **RTO / RPO**: tiempo y datos de recuperación objetivo.
- **MTBF (Mean Time Between Failures)** y **MTTR**: frecuencia de fallos y tiempo para recuperar.
- **Error rates por componente** (App, DB, Cache, etc.).
- **Latency percentiles** (p50, p95, p99).

## Checklist rápido (fiabilidad)

- [ ] ¿Están desplegadas aplicaciones críticas en múltiples AZs con load balancing?
- [ ] ¿Auto Scaling está configurado para escalar bajo carga y recuperar instancias?
- [ ] ¿Backups automáticos están habilitados con retención apropiada?
- [ ] ¿Replicación cross-region está implementada para críticos?
- [ ] ¿RTO/RPO están definidos y documentados?
- [ ] ¿Drills de DR se ejecutan periódicamente?
- [ ] ¿Timeouts y retry logic están implementados en aplicaciones?
- [ ] ¿Health checks en ALB/NLB están configurados correctamente?
- [ ] ¿Se realizan pruebas de chaos engineering / failover testing?

## Ejemplo — Multi-AZ con Auto Scaling y RDS

- EC2 Auto Scaling Group en 2+ AZs.
- Application Load Balancer (ALB) distribuyendo tráfico.
- RDS Multi-AZ con failover automático.
- CloudWatch alarms si cualquier AZ falla; Auto Scaling reemplaza instancias.

## Herramientas AWS relevantes

- **EC2 Auto Scaling**: escalado automático y recuperación de instancias.
- **RDS Multi-AZ / Aurora Global Database**: replicación y failover de bases de datos.
- **DynamoDB Global Tables**: replicación multi-región con baja latencia.
- **S3 replication**: cross-region replication para redundancia de datos.
- **Route 53**: health checks y failover a nivel de DNS.
- **Elastic Load Balancing (ALB/NLB)**: distribución de tráfico y health checks.
- **AWS Backup**: servicio centralizado para backups cross-AWS-services.
- **AWS FIS (Fault Injection Simulator)**: pruebas controladas de resiliencia.
- **CloudWatch**: monitoreo de métricas y alarmas.

## Buenas prácticas operativas

- Mantén playbooks de DR documentados y accesibles.
- Valida backups regularmente (restaura y verifica integridad).
- Automatiza failover donde sea seguro (RDS Multi-AZ, Route 53 health checks).
- Define SLAs y revisa periódicamente.

## Recursos y lecturas

- Reliability pillar — AWS Well‑Architected: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
- AWS Well‑Architected Labs (Reliability): https://wellarchitectedlabs.com/
- Guías de disaster recovery en AWS docs.

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Pillars/Reliability.md`
