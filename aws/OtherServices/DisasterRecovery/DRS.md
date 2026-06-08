# DRS — Resumen rápido de estrategias de Recuperación ante Desastres

Este archivo es un resumen conciso (DRS: Disaster Recovery Strategies) para elegir e implementar la estrategia de recuperación ante desastres adecuada en AWS.

## Objetivo
Proporcionar una referencia rápida con los patrones DR más usados, sus implicaciones en RTO/RPO y cuándo aplicarlos.

## Patrones principales (resumen)

- Backup & Restore
  - RTO: Alto (horas+), RPO: Depende de la frecuencia de backups (horas/días).
  - Costo: Bajo. Complejidad: baja.
  - Uso: Datos no críticos / costes bajos.

- Pilot Light
  - RTO: Medio (min–hrs), RPO: Bajo si existe replicación.
  - Costo: Moderado (inicia infraestructura mínima).
  - Uso: Aplicaciones críticas que pueden escalar rápidamente.

- Warm Standby
  - RTO: Bajo (minutos–horas), RPO: Bajo.
  - Costo: Moderado–alto (recursos reducidos activos).
  - Uso: Servicios con necesidad de rápida recuperación pero optimizando costos.

- Multi‑Site Active‑Active
  - RTO: Muy bajo (casi 0), RPO: Muy bajo.
  - Costo: Alto (recursos activos en múltiples regiones).
  - Uso: Sistemas críticos globales con alta disponibilidad.

- Hybrid / On‑Prem ↔ AWS
  - RTO/RPO: Variables según la solución (EDR/CloudEndure, Storage Gateway).
  - Uso: Migraciones en progreso o sitios on‑premises que deben recuperarse en la nube.

## Tabla de decisión rápida

- ¿RTO <= 15 min y RPO cercano a 0? → Multi‑Site Active‑Active
- ¿RTO <= 1 h y se puede pagar infraestructura reducida? → Warm Standby
- ¿RTO < 4 h y quieres ahorrar costos? → Pilot Light
- ¿RTO > 4 h y presupuesto limitado? → Backup & Restore
- ¿Origen on‑premises y necesitas RTO bajo? → Elastic Disaster Recovery (CloudEndure)

## Servicios AWS recomendados por patrón

- Backup & Restore: AWS Backup, S3, Glacier, RDS snapshots, EBS snapshots.
- Pilot Light: AMIs, snapshot replication, CloudFormation/CDK para orquestar escalado.
- Warm Standby: RDS Read Replicas/Aurora Global, DynamoDB Global Tables, S3 CRR.
- Multi‑Site: Route 53 + Global Accelerator, DynamoDB Global Tables, Aurora Global DB.
- Hybrid: AWS Elastic Disaster Recovery, Storage Gateway, DataSync, Direct Connect.

## Runbook reducido (failover manual rápido)

1. Detectar y confirmar incidente (CloudWatch, Route 53 health checks).
2. Evaluar impacto y elegir estrategia (según DRS decision table).
3. Ejecutar playbook:
   - Multi‑Site: Confirmar failover DNS; validar endpoints.
   - Warm Standby/Pilot Light: Escalar replicas/instancias con IaC (CloudFormation/CDK) y activar RDS promotion.
   - Backup & Restore: Restaurar snapshots prioritarios y rehacer configuraciones de red.
4. Validar servicios (smoke tests automatizados).
5. Comunicar estado y proceder con failback planificado.

## Checklist mínimo pre‑implementación

- [ ] Definir RTO y RPO por aplicación
- [ ] Inventario de dependencias y puntos únicos de fallo
- [ ] Selección de patrón DR por prioridad del servicio
- [ ] Automatización de despliegue (IaC) para recreación rápida
- [ ] Políticas de backup y retención (KMS, vault lock si aplica)
- [ ] Plan de pruebas DR y calendario de ejercicios

## Notas rápidas

- Practica DR drills regularmente; los backups sin pruebas son ilusiones de seguridad.
- Automatiza tanto como sea posible (SSM, Lambda, CloudFormation/CDK).
- Considera el coste total (replicación, almacenamiento, instancias standby) al elegir patrón.

---
Ruta del archivo: `/Users/waddini/Study/aws/DisasterRecovery/DRS.md`
