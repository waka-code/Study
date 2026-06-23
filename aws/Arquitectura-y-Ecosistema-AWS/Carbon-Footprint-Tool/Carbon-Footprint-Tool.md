# AWS Customer Carbon Footprint Tool

Este documento describe el **AWS Customer Carbon Footprint Tool**: su propósito, funcionalidades, cómo usarlo, métricas que proporciona y su relación con objetivos de sostenibilidad corporativa.

## ¿Qué es el Carbon Footprint Tool?

El AWS Customer Carbon Footprint Tool es una herramienta disponible en la consola de AWS (AWS Account Management) que permite a los clientes estimar y rastrear la huella de carbono (emissions) asociada a su uso de servicios de AWS. Proporciona visibilidad en el impacto ambiental de la infraestructura en la nube y facilita reportes para cumplimiento regulatorio y objetivos ESG.

## Funcionalidades principales

- **Estimación de emissions**: calcula kg de CO₂ equivalente (CO₂e) basado en:
  - Consumo de energía estimado por servicio y región.
  - Carbon intensity de la región (matriz energética local).
  - Eficiencia de data centers AWS.
- **Desglose por servicio**: visualiza emissions por categoría (Compute, Storage, Database, Networking, etc.).
- **Desglose por región**: compara impacto entre regiones (utilidad para decisiones multi-región).
- **Trend reporting**: historial de emissions mes-a-mes para tracking.
- **Comparación vs baseline**: medir mejora tras optimizaciones.
- **Exportación de datos**: descarga reportes para análisis externo o auditoría.

## Acceso y disponibilidad

- Ubicación: **AWS Console → Account Management → Carbon Dashboard** (si está disponible en tu región/cuenta).
- Requisitos: permisos de IAM `ce:GetCarbonFootprint*` o equivalente.
- Disponibilidad: actualmente en beta/limited availability en algunas regiones.
- Nota: la herramienta evoluciona; revisar documentación oficial para última versión.

## Métricas y unidades

- **Primary metric**: kg CO₂e (kilogramos de dióxido de carbono equivalente).
- **Scope**: típicamente Scope 2 (energía comprada/grid) bajo Greenhouse Gas Protocol.
- **Factores de emisión**: basados en datos públicos (EIA, IEA, regional grids).
- **Data center efficiency**: AWS incorpora PUE (Power Usage Effectiveness) de sus data centers.

## Ejemplo de dashboard

```
Period: Jun 2026
Total Emissions: 1,250 kg CO₂e

By Service:
  - EC2:        450 kg CO₂e (36%)
  - Storage:    350 kg CO₂e (28%)
  - RDS:        250 kg CO₂e (20%)
  - Other:      200 kg CO₂e (16%)

By Region:
  - us-east-1:   600 kg CO₂e (48%)
  - eu-west-1:   400 kg CO₂e (32%)
  - ap-southeast-1: 250 kg CO₂e (20%)
```

## Cómo usar la herramienta

1. **Acceder al Carbon Dashboard**: navega a AWS Console → Account Management.
2. **Seleccionar período**: elige rango de fechas (últimos 30 días, trimestre, año, etc.).
3. **Revisar desglose**: examina emissions por servicio y región.
4. **Identificar oportunidades**: busca servicios/regiones con mayor impacto.
5. **Planificar optimizaciones**: combina con Cost Explorer y arquitectura para reducir ambos costes y carbon.
6. **Exportar y reportar**: descarga datos para reportes corporativos o auditoría.

## Interpretación de datos

- **High compute regions**: regiones con instancias grandes o cargas CPU-intensivas incrementan emissions.
- **Storage-heavy workloads**: aunque menos que compute, S3 a escala contribuye.
- **Multi-region redundancy**: réplicas en múltiples regiones aumentan footprint total (considerar trade-off con resilience).
- **Correlation with cost**: típicamente, workloads costosas = workloads con mayor emissions (pero no siempre lineal).

## Optimización basada en carbon footprint

- **Right-sizing**: reducir tamaño de instancias = menos energía = menos carbono (+ menos coste).
- **Serverless**: Lambda, Fargate, managed services distribuyen energía eficientemente.
- **Region optimization**: mover workloads a regiones con mayor % energía renovable.
- **Autoscaling**: apagar recursos en horarios bajos.
- **Efficient algorithms**: mejorar tiempo de ejecución = menos consumo.

## Limitaciones conocidas

- **Estimaciones**: los cálculos son estimaciones basadas en factores de emisión públicos; no son mediciones reales.
- **Scope limitado**: típicamente Scope 2 (energía grid); no incluye Scope 1 (generadores on-prem) o Scope 3 (cadena de suministro).
- **Granularidad**: desglose por servicio/región, pero no por instancia individual (usar CloudWatch + custom scripts para mayor detalle).
- **Lag**: puede haber delay de días antes de que datos aparezcan en dashboard.
- **Availability**: no está disponible en todas las regiones AWS o cuentas (beta/rolling out).

## Integración con procesos corporativos

- **ESG reporting**: exportar datos para reportes anuales de sostenibilidad.
- **Carbon accounting**: alimentar systems de carbon accounting corporativos.
- **SBT (Science Based Targets)**: usar como baseline para tracking de objetivos Net Zero.
- **Showback/Chargeback**: combinar con cost allocation tags para mostrar carbon por team/project.

## Herramientas complementarias

- **AWS Sustainability Center**: guías y resources sobre prácticas sostenibles.
- **Greenhouse Gas Protocol**: estándar internacional para reportes de emissions.
- **AWS Well-Architected Tool**: include preguntas sobre sostenibilidad y carbon footprint.
- **Cost Explorer + Carbon Dashboard**: análisis conjuntos de coste + carbono.

## Mejores prácticas

- **Revisar regularmente**: mensual o trimestral para tracking y tendencias.
- **Comparar vs baseline**: establece baseline inicial y mide mejora tras optimizaciones.
- **Comunicar beneficios**: no solo costes ahorrados, sino impacto ambiental positivo.
- **Automatizar reportes**: exportar datos automáticamente hacia sistemas corporativos.
- **Educación**: informar al team que optimizaciones de performance/coste = beneficios ambientales.

## Ejemplo — Caso de uso

Empresa ABC ejecuta workload en us-east-1 con 500 kg CO₂e/mes. Al migrar 50% a eu-north-1 (región con >80% energía renovable):
- Emissions reduction: ~100 kg CO₂e/mes.
- Coste ahorrado: ~5,000 USD/mes (right-sizing + region).
- Impacto reportable: "Redujimos carbon footprint en 20% mediante optimización de regiones".

## Recursos y documentación

- AWS Carbon Footprint Tool docs: https://docs.aws.amazon.com/awsaccountmanagement/latest/userguide/carbon-dashboard.html
- AWS Sustainability center: https://aws.amazon.com/sustainability/
- Greenhouse Gas Protocol: https://ghgprotocol.org/
- AWS Well-Architected Sustainability Pillar: https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Pillars/Sustainability/Carbon-Footprint-Tool.md`
