# AWS Step Functions

AWS Step Functions es un servicio de orquestación que permite coordinar componentes distribuidos y servicios sin servidor en flujos de trabajo visuales usando máquinas de estados definidas en Amazon States Language (ASL).

## Tipos de Step Functions

- **Standard Workflows**: Adecuados para procesos de larga duración, con ejecuciones duraderas, at-least-once semantics y mejor tolerancia a fallos. Coste por ejecución/estado.
- **Express Workflows**: Diseñados para cargas de trabajo de alta concurrencia y baja latencia (millones de ejecuciones por día). Coste por tiempo de ejecución y memoria, con semantics oriented to high throughput.

## Casos de uso

- Orquestación de pipelines ETL/ELT (Glue, Lambda, Batch).
- Procesamiento de órdenes o tareas asíncronas: cola → worker → notificaciones.
- Sagas distribuidas y compensaciones transaccionales.
- Orquestación de despliegues y runbooks (prechecks, actualizaciones, rollback).
- Machine learning workflows (preprocesado, training, evaluación).

## Componentes clave

- **State Machine**: Definición ASL que describe estados (Task, Choice, Wait, Parallel, Map, Succeed, Fail, Pass).
- **Task State**: Invoca Lambda, Activities, Step Functions sync, o integraciones con servicios (SNS, SQS, DynamoDB, Batch, ECS, Glue).
- **Choice State**: Rutas condicionales.
- **Map State**: Ejecuta operaciones en paralelo sobre arrays.
- **Error Handling**: `Retry` y `Catch` para gestionar fallos y definir flujos de compensación.

## Ejemplo sencillo (ASL)

Un ejemplo que invoca una Lambda y luego publica un mensaje a SNS:

```json
{
  "Comment": "Simple workflow",
  "StartAt": "InvokeLambda",
  "States": {
    "InvokeLambda": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:MyFunction",
        "Payload.$": "$.input"
      },
      "Next": "PublishSNS",
      "Catch": [{"ErrorEquals": ["States.TaskFailed"], "Next": "HandleError"}]
    },
    "PublishSNS": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:MyTopic",
        "Message.$": "$.result"
      },
      "End": true
    },
    "HandleError": {
      "Type": "Fail",
      "Cause": "Lambda invocation failed"
    }
  }
}
```

## Crear una state machine (AWS CLI)

```bash
aws stepfunctions create-state-machine \
  --name MyStateMachine \
  --definition file://state-machine.json \
  --role-arn arn:aws:iam::123456789012:role/StepFunctionsExecutionRole
```

Para ejecuciones Express, especifica `--type EXPRESS`.

## Iniciar ejecución

```bash
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:MyStateMachine \
  --input '{"input":"value"}'
```

## Observabilidad y monitoreo

- **CloudWatch Logs**: Step Functions puede enviar trazas de ejecución a CloudWatch Logs.
- **X-Ray**: Integración para trazas distribuidas cuando las tareas soportan X-Ray (por ejemplo Lambda).
- **CloudWatch Metrics**: Métricas de ejecución, duración, errores y throttles.
- **Execution history**: Historial detallado por ejecución que facilita debugging.

## Buenas prácticas

- **Modela errores y compensaciones**: Usa `Retry` y `Catch` para manejar problemas y `Map`/`Parallel` con límites de concurrencia.
- **Idempotencia**: Asegura que las tareas sean idempotentes (especialmente con reintentos y at-least-once semantics).
- **Separar lógica de negocio**: Mantener la lógica en microservicios/Lambdas y usar Step Functions sólo para orquestación.
- **Timeouts y límites**: Define `TimeoutSeconds` y `HeartbeatSeconds` apropiados para detectar tareas bloqueadas.
- **Optimizar costs**: Para alto throughput, considera Express Workflows; para procesos duraderos, usa Standard.
- **Control de versiones**: Versiona tus state machines y gestion de despliegues (sam/cdk/terraform).
- **Seguridad IAM mínima**: Role de ejecución con permisos mínimos necesarios para las integraciones usadas.

## Patrón Saga (compensaciones)

- Diseña flujos donde cada `Task` exitoso registra un punto de compensación y, en caso de fallo, se recorren `Catch` para ejecutar actividades compensatorias.

## Integraciones comunes

- **Lambda**: Invocación directa con `arn:aws:states:::lambda:invoke`.
- **SNS / SQS**: Publicar eventos o encolar trabajos.
- **DynamoDB**: Actualizar estado o checkpoints.
- **ECS / Batch / Glue**: Orquestación de jobs largos (usando integrations o checkers).
- **API Gateway**: Start execution vía API/HTTP (async triggers).

## Costes

- **Standard**: Cobro por transición de estado y duración de ejecuciones.
- **Express**: Cobro por duración y cantidad de ejecuciones; recomendado para altos volúmenes.

## Recursos

- Docs: https://docs.aws.amazon.com/step-functions/
- Tutoriales y ejemplos: https://github.com/aws-samples
- Serverless Framework / SAM / CDK: plantillas y constructos para definir state machines

---

Ruta del archivo: `/Users/waddini/Study/aws/OtherServices/StepFunctions/README.md`
