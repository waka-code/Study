# Evaluator (Servicio de evaluación de migraciones)

`Evaluator` es un servicio/documento conceptual que describe una solución para evaluar automáticamente la preparación, riesgo y coste de migraciones a la nube. Está pensado como una herramienta de apoyo para equipos de migración que agrupa datos de descubrimiento, análisis de dependencias, estimaciones de coste, checks de compliance y ejecución de pruebas (smoke, performance) para producir informes accionables y una puntuación de readiness.

## Objetivos

- Automatizar la evaluación de aplicaciones y cargas de trabajo antes de una migración.
- Generar indicadores (RTO/RPO estimado, complejidad, riesgo, coste estimado, estrategia recomendada 7R).
- Producir artefactos reutilizables para planificación (listas de dependencias, playbooks, checklist de cutover).
- Integrarse con herramientas de descubrimiento y migración (Application Discovery, Migration Hub, MGN, DataSync).

## Características principales

- **Ingesta de datos:** Consume datos de Application Discovery Service, inventarios, métricas CloudWatch y CSVs exportadas.
- **Análisis de dependencias:** Agrupa servidores y aplicaciones que deben migrarse juntos (application grouping).
- **Estimación de costes:** Usa métricas de uso y reglas de dimensionamiento para proponer tamaños de instancias, almacenamiento y coste mensual estimado (integrable con Cost Explorer APIs).
- **Scoring y recomendaciones:** Calcula una puntuación de "migration readiness" y sugiere la estrategia 7R más adecuada por aplicación.
- **Checks de compliance y seguridad:** Reglas para detectar requisitos regulatorios, datos sensibles y recomendaciones de cifrado/KMS, IAM y redes.
- **Generación de runbooks y playbooks:** Crea pasos operativos para pilot, warm-standby o cutover, con comandos CLI/SSM Automation.
- **Orquestación de pruebas:** Ejecuta pruebas automatizadas (smoke tests, scripts de validación) mediante SSM Run Command o pipelines CI/CD.
- **Informes y dashboards:** Salidas en HTML/Markdown/CSV y dashboards en QuickSight o Grafana.

## Casos de uso

- Planificación de migraciones a gran escala (data centers enteros).
- Validación de readiness antes de un cutover.
- Identificación de dependencias ocultas que puedan causar fallos en el cutover.
- Priorización de aplicaciones para pilots según coste/beneficio/riesgo.

## Arquitectura (alta nivel)

```
[Application Discovery] -->
                    [Evaluator Ingest Layer] --> [Analysis Engine] --> [Reports / Dashboards]
                                  |                     |
                                  v                     v
                          [Cost Estimator]         [Playbook Generator]
                                  |
                                  v
                           [SSM / CI/CD (tests, smoke)]
```

Componentes:
- Ingest Layer: ETL que normaliza datos (CSV, API) y los guarda en S3/DynamoDB.
- Analysis Engine: Motor rules-based + ML (opcional) que calcula scoring, dependencias y recomendaciones.
- Playbook Generator: Plantillas IaC (CloudFormation/CDK) y SSM Automation documents para recuperación/validación.
- Runner: Orquestador que ejecuta pruebas (SSM, Lambda, Step Functions).
- Store: S3 para artefactos, DynamoDB/Elasticsearch para índices y QuickSight para visualización.

## Integración con servicios AWS

- **AWS Application Discovery Service:** fuente primaria de inventario y dependencias.
- **AWS Migration Hub:** centraliza estado de migración y tracking.
- **AWS Cost Explorer / Cost & Usage Report (CUR):** para estimaciones de coste.
- **AWS Systems Manager (SSM):** ejecutar pruebas y comandos en instancias migradas.
- **Amazon S3 / DynamoDB / OpenSearch:** almacenamiento de resultados y búsquedas.
- **AWS Lambda / Step Functions:** orquestación serverless de análisis y pipelines.
- **Amazon QuickSight:** dashboards de reporting.

## Ejemplo de flujo operativo

1. Recopilar datos de Application Discovery (export CSV/API) y métricas de CloudWatch.
2. Subir artefactos a S3 en la ruta del proyecto (`s3://bucket/migration/projectX/`).
3. Ejecutar job de ingest: normaliza y valida datos.
4. Ejecutar análisis: dependencia mapping, dimensionamiento y scoring.
5. Revisar reporte: ver lista de aplicaciones, prioridad y estrategia 7R sugerida.
6. Generar runbook para cada aplicación priorizada (CloudFormation/CDK y SSM documents).
7. Ejecutar pruebas de validación automatizadas en ambiente de staging mediante SSM/Step Functions.
8. Iterar hasta obtener readiness aceptable.

## Ejemplos de comandos (CLI) y artefactos

- Subir CSV de descubrimiento a S3:

```bash
aws s3 cp discovery-export.csv s3://mi-bucket/migration/projectX/discovery-export.csv
```

- Ejecutar job de ingest (script ejemplo):

```bash
python scripts/ingest.py --s3-uri s3://mi-bucket/migration/projectX/discovery-export.csv --project projectX
```

- Ejecutar análisis (script ejemplo):

```bash
python scripts/analyze.py --project projectX --output s3://mi-bucket/migration/projectX/reports/
```

- Lanzar runbook SSM para smoke tests:

```bash
aws ssm send-command --document-name "AWS-RunShellScript" \
  --targets "Key=tag:Project,Values=projectX" \
  --parameters commands=["/opt/migration-tests/smoke.sh"]
```

## Salidas y reports

- `projectX-readiness.json`: JSON con puntuación por aplicación, RTO/RPO estimado y estrategia recomendada.
- `projectX-deps.csv`: lista de dependencias y grupos de migración.
- Markdown/HTML detallado con playbooks por aplicación.

## Buenas prácticas

- Recolectar datos representativos (al menos 1–2 semanas) antes de tomar decisiones.
- Versionar artefactos (S3 path con versión) para reproducibilidad.
- Mantener reglas de scoring documentadas y auditables.
- Validar recomendaciones con SMEs (subject matter experts) antes del cutover.
- Automatizar pruebas en entornos de staging para detectar problemas antes del corte.

## Limitaciones y consideraciones

- Calidad del análisis depende de la calidad y el periodo de los datos de discovery.
- No reemplaza juicio humano: debe asistir en la priorización, no decidir automáticamente en entornos críticos.
- Para un producto sólido, se recomiendan reglas complementadas con ML/heurísticas ajustadas al entorno del cliente.

## Recursos adicionales

- AWS Application Discovery Service: https://docs.aws.amazon.com/application-discovery/
- AWS Migration Hub: https://docs.aws.amazon.com/migrationhub/
- AWS Systems Manager (SSM): https://docs.aws.amazon.com/systems-manager/

---

Ruta del archivo: `/Users/waddini/Study/aws/OtherServices/Migration/Evaluator/README.md`