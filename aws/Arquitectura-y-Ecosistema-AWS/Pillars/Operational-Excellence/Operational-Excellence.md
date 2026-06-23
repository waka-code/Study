# Pilar 1 — Excelencia Operativa (Operational Excellence)

Este documento resume el pilar de **Excelencia Operativa** del AWS Well‑Architected Framework: objetivos, principios, prácticas, métricas y un checklist práctico para aplicar en workloads.

## ¿Qué es la Excelencia Operativa?

La Excelencia Operativa se centra en las prácticas que permiten ejecutar y monitorizar sistemas para entregar valor al cliente de forma continua. Incluye la capacidad de responder a eventos, automatizar procesos, mejorar continuamente y realizar cambios seguros y rápidos en la infraestructura y aplicaciones.

## Objetivos clave

- Entregar cambios de forma fiable y rápida.
- Detectar y responder a incidentes con baja latencia y menor impacto.
- Mejorar continuamente mediante experimentación y feedback.
- Automatizar operaciones repetitivas para reducir errores humanos.

## Principios de diseño

- **Automatiza todo lo repetible**: despliegues, pruebas, rollbacks y runbooks.
- **Instrumenta tu sistema**: métricas, logs y trazas deben estar disponibles y ser accionables.
- **Prueba y valida en staging**: reproduce condiciones reales y realiza tests de chaos/simulaciones.
- **Define procesos de incident response**: roles claros, runbooks y comunicación.
- **Itera y aprende**: postmortems, métricas y mejoras continuas.

## Prácticas recomendadas

- IaC y pipelines CI/CD para despliegues reproducibles (CloudFormation, CDK, Terraform + CodePipeline/GitHub Actions).
- Runbooks y playbooks documentados, versionados y accesibles (SSM Documents, Confluence/Docs).
- Prechecks automáticos antes de cambios (tests, canary deployments, feature flags).
- Observabilidad completa: CloudWatch (metrics/logs), X-Ray (traces), OpenTelemetry.
- Automatización de remediaciones seguras (EventBridge → Lambda / Step Functions / SSM Automation).
- Simulacros periódicos (chaos engineering con FIS, pruebas de DR y cutover rehearsals).
- Gestión de cambios controlada: despliegues canary/blue‑green, gates automatizados.

## Métricas y KPIs útiles

- **MTTD (Mean Time To Detect)**: tiempo medio para detectar un incidente.
- **MTTR (Mean Time To Repair/Recover)**: tiempo medio para recuperar servicio.
- **Change Failure Rate**: porcentaje de cambios que generan incidentes.
- **Deployment Frequency**: frecuencia de despliegues a producción.
- **Availability / SLA metrics**: uptime, error rates, latency percentiles.
- **Operationally actionable alerts**: ratio alertas reales vs ruido.

## Runbooks y respuesta a incidentes

- Mantén runbooks simples y pasos claros: detección, mitigación, comunicación, root cause analysis, y remediation.
- Versiona los runbooks junto al código/infra y valida su ejecución con drills.
- Automatiza pasos que puedan ejecutarse sin riesgo (rety, circuit breaker toggles, scale out).

Ejemplo mínimo de SSM Automation (conceptual):

```yaml
description: "Restart web service on EC2 and validate health"
mainSteps:
  - name: restartService
    action: aws:runShellScript
    inputs:
      runCommand:
        - sudo systemctl restart my-web-service
        - curl -f http://localhost:8080/health || exit 1
  - name: notify
    action: aws:invokeLambdaFunction
    inputs:
      FunctionName: arn:aws:lambda:...:NotifyOnRecovery
```

## Checklist rápido (operacional)

- [ ] ¿Tenemos pipelines CI/CD con tests automatizados y despliegues reproducibles?
- [ ] ¿Los runbooks están documentados, versionados y accesibles?
- [ ] ¿Existen métricas/alerts para detectar degradación antes de impacto al usuario?
- [ ] ¿Automatizamos remediaciones seguras donde proceda?
- [ ] ¿Realizamos drills y pruebas de DR con regularidad?
- [ ] ¿Analizamos postmortems y aplicamos mejoras (no repetir errores)?
- [ ] ¿Control de cambios con canary/blue-green y feature flags implementado?

## Herramientas AWS relevantes

- **AWS Systems Manager (SSM)**: runbooks (Automation), remediations, param store.
- **AWS CloudWatch**: métricas, dashboards, alarmas, Logs Insights.
- **AWS X-Ray / OpenTelemetry**: trazas distribuidas.
- **AWS EventBridge**: orquestación de eventos y triggers automáticos.
- **AWS Step Functions**: orquestación de flujos de remediación/rollback.
- **AWS Fault Injection Simulator (FIS)**: pruebas controladas de resiliencia.
- **AWS Config / Security Hub**: comprobaciones de conformidad y posture.
- **CI/CD tools**: CodePipeline, CodeBuild, GitHub Actions, Jenkins.

## Ejemplo operativo — despliegue canary con métricas

- Despliega versión canary al 5% del tráfico.
- Monitorea errores, latencia y métricas de negocio (p. ej. tasa de conversión) durante window.
- Si las métricas se mantienen dentro de umbrales, incrementa tráfico a 25%, luego 100%.
- Si falla, rollback automático y ejecutar remediación (automatizada) y crear incidente.

## Medición y mejora continua

- Instrumenta la retroalimentación: relaciona cambios con métricas de negocio.
- Define objetivos SLO/SLI y revisa en ciclos regulares.
- Publica métricas de operación y realiza revisiones de procesos trimestralmente.

## Recursos y lecturas recomendadas

- Operational Excellence pillar — AWS Well‑Architected: https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html
- Runbooks y SSM Automation examples: https://docs.aws.amazon.com/systems-manager/
- Chaos engineering on AWS: https://aws.amazon.com/architecture/chaos-engineering/

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Well-Architected/Operational-Excellence.md`
