# Estrategias de migración a la nube — Las 7R

Este documento describe las 7 estrategias (las "7R") que se usan para planificar migraciones de aplicaciones y cargas de trabajo a la nube. Cada "R" incluye definición, ventajas/desventajas, cuándo aplicarla, ejemplos y herramientas AWS recomendadas.

Índice
- Rehost (Lift and Shift)
- Replatform (Lift, Tinker and Shift)
- Repurchase (Drop and Shop)
- Refactor / Re-architect
- Retire
- Retain (Revisit)
- Relocate (Move without conversion)
- Tabla de decisión rápida
- Checklist de migración y pasos recomendados
- Herramientas AWS útiles

---

## 1) Rehost (Lift-and-Shift)

- Descripción: Migrar la aplicación tal cual a la nube sin cambios arquitectónicos significativos. Se reprovisionan máquinas/VMs (o se usan imágenes/instantáneas) en la nube y se mueven datos.
- Ventajas:
  - Rápido de ejecutar y bajo esfuerzo de re‑ingeniería.
  - Reduce el downtime si está bien planificado.
- Desventajas:
  - No aprovecha las capacidades nativas cloud (costes operativos y de licencia pueden ser mayores).
  - Posible diseño subóptimo en la nube (no optimizado para escalado automático, etc.).
- Cuándo usarlo:
  - Migraciones con plazo corto o cuando se requiere mover rápidamente infra para liberación de CPD.
  - Aplicaciones con poca o nula posibilidad de refactor inmediata.
- Ejemplo:
  - Levantar AMIs en EC2 a partir de snapshots de VMs on‑prem.
- Herramientas AWS recomendadas:
  - AWS Application Migration Service (MGN), AWS Server Migration Service (legacy), AWS DataSync (datos), AWS Snowball (datos masivos).

---

## 2) Replatform (Lift, Tinker and Shift)

- Descripción: Hacer pequeños cambios para optimizar la aplicación a la nube sin cambiar su arquitectura fundamental. Por ejemplo trasladar una base de datos gestionada o cambiar el sistema de archivos por uno optimizado para cloud.
- Ventajas:
  - Mejora el rendimiento/coste sin una reingeniería profunda.
  - Aprovecha servicios gestionados (RDS, ECS/EKS, S3).
- Desventajas:
  - Requiere pruebas y adaptación (compatibilidad de drivers, parámetros).
- Cuándo usarlo:
  - Cuando quieres reducir el OPEX y aprovechar servicios gestionados, pero no puedes o no quieres rediseñar la app completa.
- Ejemplo:
  - Migrar una base MySQL en VM a Amazon RDS, o mover almacenamiento de archivos NFS a Amazon EFS.
- Herramientas AWS recomendadas:
  - AWS DMS (migración de bases de datos), AWS Application Migration Service, DataSync, CloudEndure/EDR para replicación.

---

## 3) Repurchase (Drop-and-Shop)

- Descripción: Reemplazar la aplicación por una solución comercial o SaaS (por ejemplo, cambiar un sistema local de CRM por Salesforce o usar Amazon WorkSpaces para escritorios).
- Ventajas:
  - Reduce mantenimiento y actualizaciones (proveedor SaaS se encarga).
  - Posible mejora funcional y de escalabilidad.
- Desventajas:
  - Pérdida de personalización, migración de datos y procesos de negocio puede ser compleja.
  - Costes de licenciamiento/ suscripción.
- Cuándo usarlo:
  - Sistemas no estratégicos con buen equivalente SaaS, cuando TCO favorece la compra frente a la migración.
- Ejemplo:
  - Reemplazar un ERP local por un ERP SaaS o usar Amazon Connect en lugar de PBX local.
- Herramientas AWS recomendadas:
  - Integraciones con S3, DMS (para datos), AWS Transfer Family, API Gateway para integraciones.

---

## 4) Refactor / Re-architect

- Descripción: Rediseñar partes o toda la aplicación para aprovechar la nube (microservicios, serverless, eventos, autoscaling). Su objetivo es mejorar escalabilidad, resiliencia y reducir costes a largo plazo.
- Ventajas:
  - Mayor agilidad, escalabilidad y reducción de costes operativos a mediano/largo plazo.
  - Posibilidad de utilizar PaaS/Serverless (Lambda, Fargate, Aurora Serverless).
- Desventajas:
  - Requiere mayor esfuerzo, tiempo y riesgo (pruebas, reescritura, validación).
- Cuándo usarlo:
  - Aplicaciones estratégicas con necesidad de escala, o cuando la deuda técnica limita el negocio.
- Ejemplo:
  - Reescribir componentes monolíticos como microservicios que usan API Gateway + Lambda + DynamoDB.
- Herramientas AWS recomendadas:
  - AWS Lambda, Amazon ECS/Fargate, Amazon EKS, Amazon RDS/Aurora, Amazon DynamoDB, AWS X-Ray para observabilidad.

---

## 5) Retire

- Descripción: Identificar aplicaciones que ya no aportan valor y retirarlas en lugar de migrarlas.
- Ventajas:
  - Reduce gasto y complejidad.
  - Libera recursos para enfocarse en lo que genera valor.
- Desventajas:
  - Riesgo de eliminar funcionalidad inadvertida si no se valida correctamente.
- Cuándo usarlo:
  - Aplicaciones obsoletas, duplicadas o poco usadas.
- Ejemplo:
  - Apagar un sistema legado cuya funcionalidad es cubierta por otro sistema.
- Herramientas AWS recomendadas:
  - Inventario con AWS Application Discovery Service, análisis de uso y logs.

---

## 6) Retain (o Revisit / Re-evaluate)

- Descripción: Mantener la carga de trabajo on‑premises por ahora y revisarla posteriormente. Se retiene por razones técnicas, regulatorias o económicas.
- Ventajas:
  - Evita un movimiento prematuro que podría ser costoso o riesgoso.
  - Da tiempo para planificar mejor la migración.
- Desventajas:
  - Mantener infra on‑prem implica costes contínuos.
- Cuándo usarlo:
  - Requisitos regulatorios, latencia extrema, dependencias de hardware especializado.
- Ejemplo:
  - Sistemas con dependencias hardware específicas o cumplimiento que impide mover datos.
- Herramientas AWS recomendadas:
  - Hybrid options: AWS Outposts, Storage Gateway, Direct Connect; monitorización y plan de re-evaluación.

---

## 7) Relocate (Move without conversion)

- Descripción: Mover máquinas virtuales (o instancias) a la nube con mínima conversión, generalmente usando herramientas que replican el servidor al proveedor (similar a rehost pero con enfoque en mover la VM entera a la infra del proveedor en forma nativa). A veces se usa el término para describir movimientos a proveedores de cloud o a entornos VMware Cloud on AWS.
- Ventajas:
  - Conserva la configuración exacta del servidor; útil cuando la compatibilidad es crítica.
  - Minimiza cambios operativos al migrar a entornos gestionados de VM.
- Desventajas:
  - No aprovecha servicios nativos cloud; puede mantener deuda técnica.
- Cuándo usarlo:
  - Cuando tienes un entorno VMware y quieres moverlo a VMware Cloud on AWS o cuando conversiones son arriesgadas.
- Ejemplo:
  - Migración de VMware vSphere a VMware Cloud on AWS, o usar AWS MGN para replicar servidores.
- Herramientas AWS recomendadas:
  - VMware Cloud on AWS, AWS Application Migration Service (MGN), AWS Server Migration Service (legacy).

---

## Tabla de decisión rápida

- Prioridad velocidad / coste bajo esfuerzo → **Rehost / Relocate**
- Prioridad reducir OPEX y aprovechar servicios gestionados → **Replatform**
- Elegir SaaS como reemplazo → **Repurchase**
- Necesitas escalabilidad/resiliencia y puedes invertir tiempo → **Refactor**
- Aplicación obsoleta → **Retire**
- Requisitos regulatorios o dependencia hardware → **Retain**

---

## Checklist de migración (pasos recomendados)

1. Inventario y evaluación de aplicaciones (dependencias, licencias, datos, RTO/RPO).
2. Clasificar aplicaciones por estrategia 7R.
3. Elegir herramientas y diseñar pilot (prueba de concepto) para cada grupo.
4. Preparar plan de datos y red: replicación, seguridad, KMS, IAM.
5. Automatizar despliegue con IaC (CloudFormation / CDK / Terraform).
6. Ejecutar pruebas (functional, performance, security).
7. Ejecutar migración (cutover) con rollback plan.
8. Validación post‑migración y optimización de costes.
9. Documentar y actualizar runbooks.

---

## Herramientas AWS útiles por estrategia

- General: AWS Migration Hub (orquestación y tracking), AWS Application Discovery Service
- Rehost / Relocate: AWS Application Migration Service (MGN), AWS Server Migration Service (legacy)
- Replatform: AWS DMS (bases), DataSync (ficheros), S3 Transfer Family
- Repurchase: Integraciones APIs, AWS Marketplace, connectors
- Refactor: Lambda, ECS/Fargate, EKS, RDS/Aurora Serverless, DynamoDB
- Retire/Retain: Application Discovery, CloudWatch usage metrics, AWS Outposts, Storage Gateway
- Complementarias: AWS Config, Cost Explorer, Trusted Advisor, CloudTrail, IAM, KMS

---

## Ejemplo rápido — decisión para una base de datos MySQL on‑prem

- Opción Rehost: VM con MySQL → EC2 + EBS, quick lift-and-shift con MGN.
- Opción Replatform: Mover datos a Amazon RDS MySQL con AWS DMS para minimizar cambios.
- Opción Refactor: Migrar a Aurora Serverless si se requiere escalabilidad automática y compatibilidad.
- Opción Repurchase: Usar un servicio SaaS (si existe) que satisfaga requisitos.

---

## Recomendaciones finales

- No todas las aplicaciones deben seguir la misma estrategia; segmenta por prioridad.
- Comienza con pilots en cargas de baja criticidad para validar procesos y herramientas.
- Automatiza todo lo posible (IaC, pipelines, tests) para repetir y escalar migraciones.
- Monitorea y optimiza costes tras la migración: típicamente se producen optimizaciones importantes en semanas/meses.

---

Ruta del archivo: `/Users/waddini/Study/aws/Migration/7Rs/README.md`
