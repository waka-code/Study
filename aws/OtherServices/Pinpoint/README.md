# Amazon Pinpoint

Amazon Pinpoint es un servicio de AWS para comunicaciones multicanal enfocadas en engagement de usuarios y campañas. Permite enviar mensajes por correo electrónico, SMS, notificaciones push, voz, y manejar campañas, journeys (viajes de usuario), segmentación y analítica para medir impacto y conversión.

## Características principales

- **Canales soportados:** Email (SES-backed), SMS, Push (APNs, FCM), Voice (IVR), In-app messaging.
- **Segmentación:** Segmentos basados en atributos de usuario, comportamiento (eventos), o importaciones de listas.
- **Campañas & Journeys:** Programar campañas y flujos de interacción (drip sequences, branching, wait conditions).
- **Templates:** Plantillas de mensajes reutilizables con personalización (substitución de variables).
- **Analítica y métricas:** Aperturas, clics, entregas, rebotes, conversiones; eventos custom para medición de ROI.
- **A/B testing:** Testeo de variantes de mensajes para optimizar rendimiento.
- **Integraciones:** AWS Lambda, EventBridge, Kinesis, SES, SNS para orquestación y procesamiento.
- **Compliance y opt-out:** Manejo de consentimientos, listas de supresión y cumplimiento regulatorio (GDPR, TCPA según región).

## Casos de uso

- Notificaciones transaccionales (confirmaciones, alertas). 
- Campañas de marketing segmentadas y automatizadas.
- Onboarding y re-engagement (user journeys).
- Mensajería crítica (alertas operacionales o de seguridad).

## Buenas prácticas

- **Usar templates y personalización:** Mejora entregabilidad y conversión.
- **Segmentación basada en eventos:** Enviar mensajes relevantes según comportamiento.
- **Gestionar listas de supresión:** Mantener buenas prácticas de opt-in/opt-out para evitar bloqueos.
- **Throttle y rate limits:** Controlar el ritmo de envío para cumplir con políticas de carriers/SES.
- **Monitoreo de métricas:** Vigilar entregas, bounces, complaints y tasa de conversión.
- **Costes y presupuesto:** Monitoriza costes por canal (SMS puede ser caro según país).
- **Pruebas en staging:** Validar templates y journeys con datos de prueba antes de producción.

## Ejemplos (AWS CLI)

Crear una aplicación (project) en Pinpoint:

```bash
aws pinpoint create-app --create-application-request Name="MyPinpointApp"
```

Enviar un mensaje SMS directo (ejemplo simplificado):

```bash
aws pinpoint send-messages \
  --application-id <app-id> \
  --message-request '{"Addresses":{"+12345556789":{"ChannelType":"SMS"}},"MessageConfiguration":{"SMSMessage":{"Body":"Hola desde Pinpoint","MessageType":"TRANSACTIONAL"}}}'
```

Crear un segmento simple por atributo:

```bash
aws pinpoint create-segment \
  --application-id <app-id> \
  --write-segment-request '{"Name":"ActiveUsers","SegmentGroups":{"Groups":[{"Dimensions":[{"Attributes":{"last_active":{"AttributeType":"INCLUSIVE","UserAttributes":["2026-01-01"]}}]}]}}'
```

Crear campaña (conceptual):

```bash
aws pinpoint create-campaign \
  --application-id <app-id> \
  --write-campaign-request file://campaign.json
```

## Integración con otros servicios

- **SES:** Integración para entrega de correo electrónico (enrutamiento, reputación).
- **SNS:** Opciones de fallback o procesamiento de notificaciones.
- **Lambda:** Enrich user profiles, transform messages, or handle events.
- **EventBridge / Kinesis:** Enviar eventos de Pinpoint a pipelines analíticos o iniciar workflows.

## Seguridad y permisos (ejemplo)

- Roles y políticas IAM: conceder `mobiletargeting:*`/`pinpoint:*` con el principio de menor privilegio según acciones (send-messages, create-campaign, manage-segments).
- Control de acceso a datos personales: cifrado en reposo (S3/Pinpoint) y gestión de accesos con IAM.

## Limitaciones y consideraciones

- **Regulación por país:** SMS/voice están sujetos a regulaciones locales (opt-in, formatos, limitaciones).
- **Límites de throughput:** Verificar cuotas y solicitar aumentos si fuera necesario.
- **Reputación de envío:** Para email usar buenas prácticas (DKIM, SPF, list cleaning) y monitorizar tasas de complaint.

## Recursos

- Documentación oficial: https://docs.aws.amazon.com/pinpoint/
- Ejemplos: https://github.com/aws-samples

---

Ruta del archivo: `/Users/waddini/Study/aws/OtherServices/Pinpoint/README.md`
