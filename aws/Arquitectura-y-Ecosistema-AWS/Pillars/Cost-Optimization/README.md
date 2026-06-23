# Pilar 5 — Optimización de Costes (Cost Optimization)

Este documento resume el pilar de **Optimización de Costes** del AWS Well‑Architected Framework: objetivos, principios, prácticas, métricas, checklist y ejemplos enfocados en usar recursos de forma eficiente, evitar desperdicio y maximizar ROI en la nube.

## Objetivos clave

- Usar solo los recursos necesarios (right-sizing).
- Minimizar desperdicio (recursos ociosos, overprovisioning).
- Elegir modelos de precios apropiados (on-demand, reserved, spot).
- Monitorizar y optimizar continuamente.
- Maximizar ROI y TCO de la inversión en nube.

## Principios de diseño

- **Transparencia de costes**: visualizar y entender dónde va el dinero.
- **Gobernanza**: políticas y controles para evitar gasto inadecuado.
- **Automatización**: escalar según demanda, apagar recursos innecesarios.
- **Right-sizing**: elegir tipos y tamaños de recursos apropiados.
- **Modelos de precios**: usar Reserved Instances, Savings Plans, Spot donde sea viable.

## Prácticas recomendadas

- **Análisis y visibilidad de costes**:
  - AWS Cost Explorer: analizar gastos por servicio, tag, región, cuenta.
  - AWS Budgets: alertas cuando se aproxima al presupuesto.
  - Cost Anomaly Detection: detección automática de gastos anómalos.
  - Tag resources: etiquetar recursos por proyecto, team, cost-center para rastrear costes.
- **Right-sizing y optimización**:
  - AWS Compute Optimizer: recomendaciones de cambio de tipos/tamaños de instancia.
  - Usar AWS Trusted Advisor para identificar subutilización.
  - Desactivar o reducir recursos no críticos en horarios bajos.
  - Considerar serverless (Lambda, Fargate) para cargas variables.
- **Modelos de precios**:
  - **Reserved Instances (RI)**: compra de 1-3 años para descuentos (25-72%).
  - **Savings Plans**: descuentos por compromiso en compute (flexible entre instancias).
  - **Spot Instances**: ofertar por capacidad ociosa (hasta 90% descuento, con riesgo de interrupción).
  - **On-demand**: para cargas impredecibles o picos.
- **Gestión de almacenamiento**:
  - S3 Intelligent-Tiering: mueve objetos automáticamente a tiers de menor coste.
  - S3 lifecycle policies: archiva a Glacier después de días/meses.
  - EBS volume cleanup: elimina snapshots y volúmenes sin usar.
  - Compresión de datos para reducir almacenamiento.
- **Eliminación de recursos no utilizados**:
  - Identificar y eliminar: volúmenes EBS no attached, snapshots antiguos, IPs elásticas sin usar.
  - AWS Config para automatizar detección.
  - Automated cleanup via Lambda/EventBridge.
- **Monitoreo de licencias**:
  - Consolidar licencias (BYOL, bring your own license).
  - Revisar periódicamente y renegociar.

## Métodos de optimización por servicio

- **Compute**: Auto Scaling, Spot, Reserved, Fargate, Lambda según patrón de carga.
- **Storage**: tiering, compression, lifecycle policies.
- **Database**: RDS autoscaling, DynamoDB on-demand, Redshift Spectrum para queries sobre S3.
- **Networking**: minimizar data transfer out (usar VPC endpoints, PrivateLink).
- **DataTransfer**: coste por región y hacia internet (usar CloudFront para reducir).

## Métricas y KPIs sugeridos

- **Cost per transaction / request** — benchmarking y tendencia.
- **Cost per user / customer**.
- **Infrastructure cost as % of revenue**.
- **Utilization rate** de recursos (CPU, memoria, ancho de banda).
- **Chargeback accuracy** — capacidad de asignar costes a proyectos/teams.

## Checklist rápido (costes)

- [ ] ¿Tenemos Cost Explorer y Budgets configurados con alertas?
- [ ] ¿Recursos están etiquetados por proyecto/team/cost-center?
- [ ] ¿Ejecutamos Compute Optimizer y aplicamos sus recomendaciones?
- [ ] ¿Usamos Reserved Instances o Savings Plans donde es aplicable?
- [ ] ¿Spot Instances se utilizan para cargas tolerantes a interrupción?
- [ ] ¿S3 lifecycle policies están implementadas?
- [ ] ¿Revisamos mensualmente desalojo de recursos sin usar?
- [ ] ¿Aprovechamos serverless para cargas variables?
- [ ] ¿Monitoramos y limitamos data transfer out?
- [ ] ¿Tenemos procesos de chargeback o showback hacia teams?

## Ejemplo — Optimización completa de una aplicación

- EC2 instances right-sized con 60-80% utilización objetivo.
- Uso de Reserved Instances + Spot (2:1 ratio) para carga base + picos.
- Auto Scaling que baja a cero en horarios bajos.
- CloudFront + S3 Intelligent-Tiering para almacenamiento.
- RDS con downtime scheduling en dev/staging.
- Eliminación automática semanal de snapshots >30 días.
- Cost tagging por proyecto y team con reportes mensales.

Resultado esperado: 40-60% reducción de costes vs on-demand puro.

## Herramientas AWS relevantes

- **AWS Cost Explorer**: análisis de gastos.
- **AWS Budgets**: alertas y control de presupuesto.
- **Cost Anomaly Detection**: detección automática de gastos inusuales.
- **AWS Trusted Advisor**: recomendaciones de optimización.
- **AWS Compute Optimizer**: right-sizing de compute.
- **AWS License Manager**: gestión de licencias.
- **AWS Savings Plans**: planes de descuento.
- **AWS Reserved Instances**: compra de capacidad.
- **CloudWatch**: monitoreo de utilización.

## Antipatrones a evitar

- Overprovisioning sin monitoreo de utilización.
- Ignorar costes de data transfer out.
- No usar Reserved Instances en cargas predecibles.
- Mantener recursos de desarrollo/staging todo el tiempo.
- Falta de tagging y chargeback.

## Buenas prácticas operativas

- Revisión mensual de Cost Explorer con stakeholders.
- Trimestral: análisis de tendencias y proyecciones.
- Automatizar apagado de recursos en horarios bajos.
- Educación del team en cost awareness.

## Recursos y lecturas

- Cost Optimization pillar — AWS Well‑Architected: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html
- AWS Pricing pages: https://aws.amazon.com/pricing/
- Cost management best practices: https://docs.aws.amazon.com/cost-management/

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Pillars/Cost-Optimization/README.md`
