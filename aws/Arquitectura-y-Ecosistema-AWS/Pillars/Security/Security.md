# Pilar 2 — Seguridad (Security)

Este documento resume el pilar de **Seguridad** del AWS Well‑Architected Framework: objetivos, principios, prácticas, métricas, checklist y ejemplos enfocados en proteger datos, identidades, sistemas y detectar/mitigar amenazas.

## Objetivos clave

- Proteger la confidencialidad, integridad y disponibilidad de los datos y sistemas.
- Implementar control de acceso y autorización con principio de menor privilegio.
- Detectar y responder rápidamente a amenazas y anomalías.
- Cumplir requisitos regulatorios y de auditoría.

## Principios de diseño

- **Centro en identidad**: gestionar identidades, roles y permisos como primera línea de defensa.
- **Menor privilegio**: dar solo los permisos estrictamente necesarios.
- **Defensa en profundidad**: múltiples capas de control (perímetro, red, host, datos, aplicación).
- **Protección de datos**: cifrado en tránsito y en reposo, tokenización y gestión de claves.
- **Automatización de seguridad**: automatizar detección, respuesta y remediaciones.
- **Auditoría y trazabilidad**: habilitar logs y eventos para auditoría y forense.

## Prácticas recomendadas

- IAM seguro:
  - Usa roles y evita usuarios con credenciales permanentes donde sea posible.
  - Habilita MFA para cuentas críticas.
  - Usa IAM policies con condiciones y límites por recursos/acciones.
  - Aplica permisos por rol de forma centralizada y reutilizable (políticas gestionadas).
- Gestión de claves y cifrado:
  - Usa AWS KMS para gestionar claves maestras y claves simétricas.
  - Cifra datos en reposo (S3, EBS, RDS) y en tránsito (TLS/HTTPS).
  - Rotación de claves y control de acceso a KMS.
- Gestión de secretos:
  - Usa AWS Secrets Manager o Parameter Store con cifrado y rotación automática.
- Registración y monitorización:
  - Habilita CloudTrail para registro de actividad API y eventos.
  - Usa AWS Config para detección de drift y compliance.
  - Activa GuardDuty, Security Hub y Macie para detección avanzada y data discovery.
- Network security:
  - Segmenta con VPC/subnets, NACLs y Security Groups.
  - Usa PrivateLink, VPC endpoints y Transit Gateway para minimizar exposición pública.
  - WAF y Shield para proteger aplicaciones web.
- Seguridad en CI/CD y IaC:
  - Escanea IaC y dependencias (e.g., cfn-nag, tfsec, Snyk).
  - Protege secrets en pipelines, usa roles temporales.
- Protección de datos sensibles:
  - Clasifica datos, aplica políticas de retención y masking/tokenization.

## Detección y respuesta

- Definir playbooks de respuesta ante incidentes (IR runbooks) y ensayarlos.
- Automatizar remediaciones seguras (EventBridge → Lambda / Step Functions / SSM Automation) para incidentes comunes.
- Integrar alertas con sistemas de gestión de incidentes (PagerDuty, Opsgenie) y tickets.

## Métricas y KPIs sugeridos

- **Time to Detect** y **Time to Remediate** (seguridad): detección y mitigación de amenazas.
- **Número de findings críticos** (GuardDuty / Security Hub).
- **Cobertura de logs**: porcentaje de recursos con CloudTrail / CloudWatch Logs habilitado.
- **% de recursos con cifrado habilitado**.
- **% de cuentas con MFA habilitado para root/privileged users**.

## Checklist rápido (seguridad)

- [ ] ¿Tenemos IAM por roles y principios de menor privilegio implementados?
- [ ] ¿CloudTrail está habilitado en todas las cuentas y regiones relevantes?
- [ ] ¿KMS y cifrado están configurados para datos en reposo y en tránsito?
- [ ] ¿Secrets Manager / Parameter Store se utiliza para credenciales sensibles?
- [ ] ¿GuardDuty, Security Hub y Config están habilitados y con alertas configuradas?
- [ ] ¿WAF/Shield/ALB reglas para protección web están configuradas donde proceda?
- [ ] ¿Pipeline CI/CD escanea IaC y dependencias y protege secretos?
- [ ] ¿Tenemos playbooks y procesos de respuesta a incidentes documentados y ensayados?

## Ejemplos mínimos (política IAM restringida)

Ejemplo de política que permite lectura de objetos S3 en un bucket específico:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::mi-bucket-seguro/*"]
    }
  ]
}
```

## Herramientas AWS relevantes

- **IAM**: gestión de identidades y permisos.
- **AWS KMS**: gestión de claves y cifrado.
- **AWS Secrets Manager / SSM Parameter Store**: gestión de secretos.
- **CloudTrail**: auditoría de llamadas API.
- **AWS Config**: evaluación de conformidad y drift.
- **GuardDuty**: detección de amenazas.
- **Security Hub**: agregación y priorización de findings.
- **Macie**: descubrimiento y protección de datos sensibles en S3.
- **WAF / Shield**: protección a nivel de aplicación.
- **Inspector / Inspector2**: evaluación de vulnerabilidades en instancias y contenedores.

## Buenas prácticas de gobernanza y cumplimiento

- Centraliza logs y findings en una cuenta de seguridad dedicada.
- Define guardrails con AWS Organizations (SCPs) y Control Tower.
- Mantén un inventario de datos sensibles y aplica medidas de protección específicas.
- Revisión periódica de políticas y auditorías para cumplimiento.

## Recursos y lecturas

- Security pillar — AWS Well‑Architected: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html
- AWS Whitepapers de cifrado y gestión de claves: https://docs.aws.amazon.com/
- Guías de GuardDuty, Security Hub, Macie y Config en la documentación oficial.

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/Well-Architected/Security.md`
