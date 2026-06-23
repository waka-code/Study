
# AWS Cloud Adoption Framework (CAF)

El AWS Cloud Adoption Framework (CAF) proporciona una estructura para ayudar a organizaciones a planificar y ejecutar la adopción de la nube. CAF organiza las mejores prácticas y capacidades en seis perspetivas que cubren los aspectos técnico, operativo y organizacional necesarios para una transición exitosa a la nube.

## Objetivo

Proveer un enfoque estructurado para alinear personas, procesos y tecnología durante la adopción de la nube, identificar brechas de capacidad y diseñar un roadmap de adopción.

## Perspectivas del CAF

1. **Business (Negocio)**: Alinea la adopción de la nube con objetivos del negocio, define casos de uso, modelos de valor y métricas de éxito.
2. **People (Personas)**: Capacidades organizacionales, roles, habilidades, formación y gestión del cambio.
3. **Governance (Gobernanza)**: Políticas, métricas, toma de decisiones, riesgos y cumplimiento (SCPs, guardrails, finops).
4. **Platform (Plataforma)**: Arquitectura base, landing zone, redes, identidad, cuenta/account structure, IaC y automatización.
5. **Security (Seguridad)**: Identidad, acceso, protección de datos, detección y respuesta — estrechamente alineado con Well‑Architected Security pillar.
6. **Operations (Operaciones)**: Operaciones diarias, runbooks, observabilidad, SRE/ops practices — alineado con Operational Excellence.

## Fases de adopción (roadmap típico)

- **Strategy & Plan**: definir visión, objetivos, casos de negocio, sponsors y KPIs.
- **Ready**: preparar plataforma (landing zone), gobernanza y capacidades del equipo (training, procesos).
- **Migrate & Modernize**: migración de workloads (7R), refactorización y optimización.
- **Operate & Evolve**: operaciones en la nube, optimización continua y nuevas capacidades.

## Artefactos y outputs recomendados

- Inventory & discovery (Application Discovery Service, CMDB).
- Business case y TCO analysis.
- Cloud landing zone (Control Tower / Landing Zone accelerators).
- Account structure y tagging strategy.
- IaC templates (CloudFormation / CDK / Terraform) para ambiente base.
- Runbooks y playbooks operacionales.
- Roadmap con releases, pilots y métricas.

## Herramientas AWS útiles

- **AWS Application Discovery Service**: identificar apps y dependencias on‑prem.
- **AWS Migration Hub / MGN / DMS**: coordinar y ejecutar migraciones.
- **AWS Control Tower**: lanzar una landing zone con guardrails.
- **AWS Organizations**: manejo de cuentas y políticas SCP.
- **AWS Well‑Architected Tool**: validar arquitecturas.
- **AWS Service Catalog**: estandarizar plantillas e infra.
- **AWS Training & Certification**: upskilling de equipos.

## Cómo mapear CAF con Well‑Architected

- **Security perspective** → Security pillar.
- **Operations perspective** → Operational Excellence pillar.
- **Platform perspective** → Reliability / Performance / Cost pillars según componentes.
- **Governance perspective** → añade control y compliance a todos los pilares.

## Ejemplo de plan corto (90 días)

1. **Semana 1-2**: Sponsor kickoff, definir objetivos y KPIs.
2. **Semana 3-4**: Discovery de aplicaciones críticas y dependencias.
3. **Semana 5-8**: Implementar landing zone (Control Tower) y estructura de cuentas.
4. **Semana 9-12**: Ejecutar pilot de migración (1 aplicación) con MGN/DMS.
5. **Semana 13-16**: Validar operaciones, runbooks y observabilidad.
6. **Semana 17-24**: Escalar migraciones por grupos/prioridades.

## Buenas prácticas

- Involucra a stakeholders desde el inicio (C-level, Finance, Security).
- Ejecuta pilots de baja criticidad para validar procesos.
- Automatiza landing zone y provisioning con IaC.
- Documenta y versiona decisiones arquitectónicas.
- Mide progreso por KPIs y adapta roadmap.

## Plantillas y artefactos sugeridos

- Plantilla de Business Case (TCO/ROI).
- Inventory CSV export de Application Discovery.
- IaC: CloudFormation / CDK starter templates para VPC, IAM, logging.
- Playbook de migración y checklist de cutover.

## Recursos y lecturas

- AWS Cloud Adoption Framework: https://aws.amazon.com/professional/services/cloud-adoption-framework/
- Landing Zone & Control Tower: https://docs.aws.amazon.com/controltower/
- CAF Whitepapers y guías: https://aws.amazon.com/whitepapers/

---

Ruta del archivo: `/Users/waddini/Study/aws/Arquitectura-y-Ecosistema-AWS/CAF/README.md`
