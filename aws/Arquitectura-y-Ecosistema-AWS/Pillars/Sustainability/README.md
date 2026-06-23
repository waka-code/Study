# Pilar 6 — Sostenibilidad (Sustainability)

Este documento resume el pilar de **Sostenibilidad** del AWS Well‑Architected Framework: objetivos, principios, prácticas, métricas, checklist y ejemplos enfocados en reducir el consumo energético, minimizar la huella de carbono y diseñar workloads ambientalmente responsables.

## Objetivos clave

- Minimizar el consumo de energía de la infraestructura IT.
- Reducir la huella de carbono (emissions) de aplicaciones y operaciones.
- Elegir regiones y recursos optimizados energéticamente.
- Monitorizar impacto ambiental.
- Contribuir a objetivos ESG (Environmental, Social, Governance) corporativos.

## Principios de diseño

- **Eficiencia energética**: usar recursos que consuman menos energía.
- **Right-sizing**: no sobreasignado == menor consumo.
- **Serverless**: delegar gestión de infraestructura física a AWS.
- **Regiones con energía renovable**: AWS ofrece regiones con energía limpia.
- **Monitorización y medición**: rastrear carbon footprint.

## Prácticas recomendadas

- **Selección de regiones**:
  - AWS publica carbon intensity de cada región (región-específica basada en matriz energética local).
  - Priorizar regiones con alta proporción de energía renovable cuando sea posible.
  - Considerar latencia vs impacto ambiental en decisiones de multi-región.
- **Optimización de recursos**:
  - Right-sizing: reducir overprovisioning ahorra energía.
  - Auto Scaling: escala a cero en horarios bajos.
  - Serverless (Lambda, Fargate, managed services): AWS optimiza eficiencia de data centers.
  - Usar instancias de generación reciente (mejor rendimiento/watt).
- **Optimización de almacenamiento**:
  - Eliminar datos innecesarios o duplicados.
  - S3 Intelligent-Tiering: archiva automáticamente datos menos accedidos (menor consumo energético).
  - Compresión de datos.
- **Eficiencia de aplicaciones**:
  - Algoritmos eficientes: reducen time-to-completion y energía.
  - Caché y CDN: reducen transfers innecesarios.
  - Batch processing en horarios con energía renovable si es viable.
- **Monitorización y reporting**:
  - AWS Carbon Dashboard (disponible en algunas cuentas/regiones): visualiza estimaciones de carbono.
  - Rastrear carbon intensity por región y servicio.
  - Reportes periódicos de emissions para stakeholders.

## Relación con otros pilares

- **Cost Optimization**: reducir costes energy-aware (right-sizing ahorra dinero y energía).
- **Performance Efficiency**: algoritmos eficientes benefician performance y energía.
- **Operational Excellence**: automatización reduce sprawl y desperdicio.

## Métricas y KPIs sugeridos

- **Carbon emissions per transaction / request** (kg CO₂ equivalente).
- **Energy consumption per compute unit** (kWh/vCPU-hora).
- **Data center utilization rate** (PUE — Power Usage Effectiveness).
- **% de workloads en regiones con alta energía renovable**.
- **Trending de carbon footprint** (año-a-año).

## Checklist rápido (sostenibilidad)

- [ ] ¿Hemos evaluado carbon intensity de regiones y elegido apropiadamente?
- [ ] ¿Right-sizing y Auto Scaling están implementados?
- [ ] ¿Usamos serverless donde es apropiado?
- [ ] ¿S3 Intelligent-Tiering y lifecycle policies están habilitadas?
- [ ] ¿Eliminamos regularmente datos redundantes u obsoletos?
- [ ] ¿Monitoreamos carbon emissions si es disponible?
- [ ] ¿Incluimos sostenibilidad en decisiones arquitectónicas?
- [ ] ¿Reportamos carbon footprint a stakeholders?

## Ejemplo — Arquitectura sostenible

- Región elegida con alto % de energía renovable (ej. eu-north-1, ca-central-1).
- EC2 Auto Scaling a cero en horarios bajos (ej. DEV/TEST).
- Lambda y Fargate para workloads variables.
- S3 Intelligent-Tiering: archiva automáticamente datos >90 días.
- Batch jobs ejecutados en horarios con peak de energía renovable.
- CloudFront para reducir data transfer origen.
- Monitorización mensual de carbon emissions y reportes a ESG team.

## Herramientas AWS relevantes

- **AWS Regions**: information sobre carbon intensity en el selector de regiones.
- **AWS Carbon Dashboard**: visualización de estimaciones de carbon (beta/regional).
- **AWS Sustainability Center**: recursos y guías sobre sostenibilidad en AWS.
- **AWS Well‑Architected Tool**: include preguntas sobre sostenibilidad.
- **Cost Explorer**: indirectamente, reducir costes = reducir energía.
- **CloudWatch**: monitoreo de utilización y eficiencia.

## Estándares y certificaciones

- **ISO 14001**: gestión ambiental.
- **B Corp**: certificación de impacto social y ambiental.
- **Science Based Targets (SBT)**: objetivos alineados con ciencia climática.
- **Greenhouse Gas Protocol**: estándar para reportes de emissions.

## Recursos corporativos y políticas

- Alineación con compromisos corporativos de carbon neutrality (ej. Net Zero por 2050).
- Integración con reportes ESG/sustainability corporativos.
- Educación del team en prácticas sostenibles.

## Buenas prácticas operativas

- Incluir sostenibilidad en architecture reviews.
- Comunicar beneficios de sostenibilidad además de costes/performance.
- Experimentar con batch jobs en horarios de peak renovables.
- Revisar trimestralmente y ajustar regions/servicios según carbon intensity.

## Antipatrones a evitar

- Ignorar carbon footprint en decisiones arquitectónicas.
- Priorizar región "más cerca" sin considerar energía.
- Mantener recursos infrautilizados indefinidamente.
- Desactivar monitorización de emissions sin motivo válido.

## Recursos y lecturas

- Sustainability pillar — AWS Well‑Architected: https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/welcome.html
- AWS Sustainability Center: https://aws.amazon.com/sustainability/
- AWS Carbon Footprint Tool: https://docs.aws.amazon.com/awsaccountmanagement/
- Greenhouse Gas Protocol: https://ghgprotocol.org/

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Pillars/Sustainability/README.md`
