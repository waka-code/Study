# AWS Fault Injection Simulator (FIS)

AWS Fault Injection Simulator (FIS) es un servicio totalmente administrado que facilita la ejecución de experimentos de caos (chaos engineering) para probar la resiliencia de aplicaciones en AWS. Permite inyectar fallos controlados (latencia de red, errores de instancia, saturación de CPU, etc.) y medir cómo reaccionan los sistemas, automatizando condiciones de fallo y observabilidad.

## Características principales

- **Experiment templates:** Plantillas reproducibles que definen targets, acciones, condiciones de parada y rol IAM para ejecutar experimentos.
- **Acciones soportadas:** Inyección de latencia de red, terminación de instancias EC2, alterar capacidad de Auto Scaling, modificar condiciones en EKS, perturbar tráfico en balanceadores, detener/pausar RDS, entre otros (según integraciones disponibles).
- **Targets dinámicos:** Targets basados en tags, grupos de Auto Scaling, instancias específicas, o recursos EKS.
- **Stop conditions y safety controls:** Definir métricas/alarms de CloudWatch que detengan el experimento si se superan los umbrales.
- **Integración con observabilidad:** Integración con CloudWatch, X-Ray, y sistemas externos para recopilar métricas y trazas durante el experimento.
- **Auditoría y control de acceso:** Uso de IAM para otorgar permisos mínimos; eventos registrados en CloudTrail.

## Casos de uso

- Validar la tolerancia a fallos de aplicaciones distribuidas (microservicios, colas, caches).
- Probar estrategias de autoscaling y recuperación automática.
- Medir RTO (tiempos de recuperación) y comprobar runbooks de recuperación.
- Preparación para cutovers y pruebas de DR en entornos controlados.
- Evaluación del impacto de fallos en componentes críticos (bases de datos, colas, caches).

## Buenas prácticas

- **Empezar en entornos no productivos:** Ejecutar experimentos primero en entornos staging/pre‑prod.
- **Definir stop conditions:** Siempre configurar CloudWatch Alarms como condiciones de parada automáticas para mitigar daño involuntario.
- **Permisos mínimos (IAM):** Crear roles específicos para FIS con políticas de menor privilegio necesarias para las acciones.
- **Backups y snapshots:** Asegurar backups recientes (RDS snapshots, EBS snapshots) antes de ejecutar experimentos destructivos.
- **Runbooks y automación de rollback:** Tener playbooks SSM o automatizaciones listas para revertir cambios rápidamente.
- **Observabilidad centralizada:** Monitorear métricas clave (latencia, errores, saturación CPU, métricas de negocio) durante el experimento.
- **Pruebas incrementales:** Comenzar con acciones de bajo impacto (simular latencia pequeña) y aumentar la agresividad gradualmente.
- **Comunicaciones:** Avisar a stakeholders y tener ventanas de mantenimiento planificadas.

## Ejemplo: crear un experiment template (AWS CLI)

A continuación un ejemplo simplificado que inyecta latencia de red en instancias EC2 con tag `Service=web`:

```bash
aws fis create-experiment-template \
  --description "Inject 200ms network latency to web service" \
  --role-arn arn:aws:iam::123456789012:role/MyFISRole \
  --stop-conditions '[{"source":"aws:cloudwatch:alarm","value":"arn:aws:cloudwatch:us-east-1:123456789012:alarm:HighErrorRate"}]' \
  --targets '{"WebInstances":{"resourceType":"aws:ec2:instance","resourceArns":[],"selectionMode":"ALL","filters":[{"path":"tag:Service","values":["web"]}]}}' \
  --actions '{"InjectLatency":{"actionId":"aws:ec2:inject-network-latency","description":"Add 200ms latency","parameters":{"latencyMillis":"200"},"targets":{"Instances":"WebInstances"}}}'
```

Luego lanzar el experimento:

```bash
aws fis start-experiment --experiment-template-id <experiment-template-id>
```

Y detenerlo manualmente si es necesario:

```bash
aws fis stop-experiment --experiment-id <experiment-id>
```

## Ejemplo avanzado: terminar instancias EC2 en un ASG (precaución)

```bash
aws fis create-experiment-template \
  --description "Terminate 1 instance in ASG for resilience test" \
  --role-arn arn:aws:iam::123456789012:role/MyFISRole \
  --targets '{"MyAsg":{"resourceType":"aws:autoscaling:autoScalingGroup","resourceArns":[],"selectionMode":"RANDOM","filters":[{"path":"tag:Env","values":["staging"]}]}}' \
  --actions '{"TerminateInstance":{"actionId":"aws:ec2:terminate-instances","description":"Terminate random instance","parameters":{"instanceCount":"1"},"targets":{"Asg":"MyAsg"}}}'
```

## Seguridad y permisos (ejemplo IAM mínimo)

- Crear un role IAM que FIS use para ejecutar acciones. Políticas mínimas típicas incluyen permisos para las acciones que el template requiere (ec2:TerminateInstances, ssmmessages:SendCommand, autoscaling:UpdateAutoScalingGroup, etc.) y `fis:CreateExperiment*`, `fis:StartExperiment*` si usas APIs.

## Limitaciones y consideraciones

- **Riesgo inherente:** FIS ejecuta fallos reales; en entornos productivos hay riesgo de impacto. Usar con extremo cuidado.
- **Cobertura de acciones:** No todas las acciones posibles en AWS están soportadas por FIS; revisar la lista oficial de acciones soportadas.
- **Dependencia de permisos y red:** Agentes o permisos faltantes pueden impedir la ejecución de ciertas acciones.
- **Coste:** Ejecución de experimentos puede generar costes (instancias adicionales, I/O, recuperación manual).

## Integración con otras herramientas

- **AWS Systems Manager (SSM):** Ejecutar scripts de verificación o rollback en instancias afectadas.
- **CloudWatch / X-Ray / OpenTelemetry:** Recolectar métricas y trazas durante experimentos.
- **Step Functions / Lambda:** Orquestar pre/post tasks (prechecks y postchecks) alrededor del experimento.
- **PagerDuty / SNS:** Notificaciones y alertas automáticas durante la ejecución.

## Recursos adicionales

- Documentación oficial FIS: https://docs.aws.amazon.com/fis/
- Buenas prácticas de Chaos Engineering: https://aws.amazon.com/architecture/chaos-engineering/
- Ejemplos y workshops: https://github.com/aws-samples

---

Ruta del archivo: `/Users/waddini/Study/aws/OtherServices/FIS/README.md`
