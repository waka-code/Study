# Well-Architected Framework — Whitepapers

Este documento resume el AWS Well-Architected Framework y los whitepapers/“lenses” asociados, proporcionando definición, pilares, objetivos y enlaces a recursos oficiales y prácticas recomendadas.

## ¿Qué es el Well-Architected Framework?

AWS Well-Architected Framework es una colección de mejores prácticas, principios y guías diseñadas para ayudar a arquitectos y equipos a construir infraestructuras seguras, resilientes, eficientes y optimizadas en la nube. El framework se organiza en pilares y proporciona preguntas y recomendaciones que guían revisiones arquitectónicas (Well-Architected Reviews).

## Pilares del Well-Architected

- **Operational Excellence**: procesos para operar y monitorear sistemas, respuesta a eventos y mejora continua.
- **Security**: protección de datos, gestión de identidad, control de acceso, detección y prevención de amenazas.
- **Reliability**: tolerancia a fallos, recuperación ante desastres, diseño para disponibilidad y recuperación.
- **Performance Efficiency**: selección de recursos y diseño para escalar según demanda y optimizar latencia/throughput.
- **Cost Optimization**: uso eficiente de recursos, análisis de costes, y diseño para minimizar gasto sin sacrificar objetivos.
- **Sustainability**: (pilar más reciente) diseño para reducir consumo energético y huella de carbono.

## Whitepapers y Lenses relevantes

- **AWS Well-Architected Whitepaper (overview)** — documento base que explica el framework y metodología.
- **Pillar whitepapers / Guides** — documentos que profundizan en cada pilar (Operational, Security, Reliability, Performance, Cost, Sustainability).
- **Well-Architected Tool** — herramienta en la consola AWS para realizar reviews estructuradas y generar reportes de mejoras.
- **Lenses** — extensiones al framework para dominios específicos (Serverless, Data Analytics, SaaS, Containers, Machine Learning, etc.). Cada lens ofrece preguntas y recomendaciones específicas.

Recursos oficiales:
- Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/
- Documentación y whitepapers: https://docs.aws.amazon.com/wellarchitected/
- Well-Architected Tool: https://aws.amazon.com/well-architected-tool/
- Lenses: https://wa-lens.aws.amazon.com/ (o buscar "Well-Architected lens <domain>")

## Proceso de revisión (Well-Architected Review)

1. **Preparación**: definir el alcance (workloads, cuentas, regiones) y raspar datos relevantes (inventario, métricas, dependencias).
2. **Responder preguntas**: usar el Well-Architected Tool o plantillas para responder preguntas de cada pilar y lens aplicable.
3. **Identificar riesgos**: el tool o el whitepaper ayudan a detectar riesgos (High/Medium/Low) y recomendaciones para mitigarlos.
4. **Plan de mejoras**: priorizar acciones (remediaciones) con estimación de esfuerzo y beneficio.
5. **Implementar y validar**: ejecutar remediaciones, actualizar infraestructura (IaC) y volver a revisar.

## Ejemplo de outputs útiles

- Lista priorizada de mejoras (remediation backlog).
- Plantillas IaC para remediaciones (CloudFormation / CDK / Terraform).
- Dashboards de métricas y alertas relacionadas con riesgos detectados.

## Buenas prácticas al aplicar el Framework

- Ejecutar reviews periódicos y después de cambios mayores (releases, re-architects).
- Aplicar lenses relevantes (serverless, data, containers) al workload.
- Automatizar comprobaciones mediante scripts y políticas (Config, GuardDuty, Security Hub).
- Versionar las respuestas y resultados de las reviews en el repositorio para histórico.
- Mapear remediaciones a tickets/epics en backlog y medir closure rates.

## Plantilla rápida (checklist mínima)

- ¿Tenemos roles y políticas IAM con principio de menor privilegio? (Security)
- ¿Realizamos backups y pruebas de recuperación periódicas? (Reliability)
- ¿Monitoreamos errores y latencias con alertas apropiadas? (Operational / Performance)
- ¿Detectamos recursos infrautilizados y optimizamos costes? (Cost)
- ¿Hemos considerado impacto energético y optimizado cargas? (Sustainability)

## Recursos adicionales y whitepapers específicos

- AWS Well-Architected Whitepaper (PDF) — https://d1.awsstatic.com/whitepapers/architecture/AWS_Well-Architected_Framework.pdf
- Lenses populares: Serverless Lens, Data & Analytics Lens, Security Pillar Guide.
- Well-Architected Labs (hands-on): https://wellarchitectedlabs.com/

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Well-Architected/WhitePapers.md`
