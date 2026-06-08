# AWS IoT Core

AWS IoT Core es un servicio completamente administrado que permite a dispositivos conectarse de manera segura a la nube de AWS y comunicarse con aplicaciones y otros dispositivos. Es ideal para conectar millones de dispositivos IoT, recopilar datos y tomar acciones basadas en esos datos.

## Características principales

- **Conectividad segura:**
  - Autenticación basada en certificados X.509 y políticas de IAM.
- **Escalabilidad:**
  - Maneja millones de dispositivos conectados de manera simultánea.
- **Procesamiento de datos en tiempo real:**
  - Reglas para procesar, transformar y enrutar mensajes.
- **Integración con servicios de AWS:**
  - Compatible con Lambda, S3, DynamoDB, SNS, SQS, y más.
- **Dispositivos sombra (Device Shadows):**
  - Mantiene un estado sincronizado entre el dispositivo y la nube.
- **Gestión de dispositivos:**
  - Aprovisionamiento, actualización y administración centralizada de dispositivos.

## Casos de uso

- **Monitoreo industrial:**
  - Recopilar datos de sensores en plantas de manufactura.
- **Hogar inteligente:**
  - Controlar dispositivos como luces, cerraduras y sistemas de seguridad.
- **Agricultura de precisión:**
  - Monitorear condiciones de suelo, clima y cultivos.
- **Vehículos conectados:**
  - Recopilar datos de telemetría y diagnóstico de vehículos.
- **Salud conectada:**
  - Dispositivos médicos que envían datos a aplicaciones de monitoreo.

## Beneficios

- **Escalabilidad global:**
  - Conecta y gestiona millones de dispositivos de manera eficiente.
- **Seguridad:**
  - Encriptación end-to-end y autenticación fuerte.
- **Bajo costo:**
  - Modelo de precios flexible basado en conexiones y mensajes.
- **Integración simplificada:**
  - Funciona con otros servicios de AWS sin configuración adicional.

## Ejemplo de configuración

### Crear una cosa (Thing) en AWS IoT Core
```bash
aws iot create-thing \
    --thing-name MiDispositivo
```

### Crear un certificado
```bash
aws iot create-keys-and-certificate \
    --set-as-active > mi-certificado.json
```

### Crear una política
```bash
aws iot create-policy \
    --policy-name MiPoliticaIoT \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "iot:*",
                "Resource": "*"
            }
        ]
    }'
```

### Conectar con Python usando AWS IoT SDK
```python
from awscrt import mqtt
from awsiot import iotshadow
import json

# Configurar cliente MQTT
client = mqtt.Client(bootstrap_servers=['iot.us-east-1.amazonaws.com:8883'])
client.connect(ca_filepath='./AmazonRootCA1.pem',
               cert_filepath='./certificate.crt',
               key_filepath='./private.key',
               on_connection_interrupted=on_connection_interrupted,
               on_connection_resumed=on_connection_resumed)

# Publicar mensaje
client.publish(topic='$aws/things/MiDispositivo/shadow/update',
               qos=mqtt.QoS.AT_LEAST_ONCE,
               payload=json.dumps({"state": {"desired": {"color": "red"}}}))
```

## Arquitectura de AWS IoT Core

```
┌──────────────────────────────────────────────────────┐
│                  AWS IoT Core                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │     Device Communication Gateway             │  │
│  │  (MQTT, HTTP, WebSocket)                    │  │
│  └──────────────────────────────────────────────┘  │
│              ↓                ↓                      │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ Device Registry  │  │ Device Shadows   │        │
│  │ (Metadatos)      │  │ (Estado sincr.)  │        │
│  └──────────────────┘  └──────────────────┘        │
│              ↓                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  Rules Engine & Message Broker               │  │
│  └──────────────────────────────────────────────┘  │
│    ↓         ↓         ↓         ↓         ↓       │
│  ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐     │
│  │ S3 │   │ DDB│   │SNS │   │SQS │   │ Lambda│   │
│  └────┘   └────┘   └────┘   └────┘   └────┘     │
│                                                      │
└──────────────────────────────────────────────────────┘
         ↓              ↓              ↓
    ┌─────────┐    ┌─────────┐    ┌────────┐
    │Sensor1  │    │Sensor2  │    │Gateway │
    └─────────┘    └─────────┘    └────────┘
```

## Protocolos soportados

- **MQTT:**
  - Protocolo de mensajería ligero, ideal para dispositivos con recursos limitados.

- **HTTP/HTTPS:**
  - Para dispositivos que requieren HTTP tradicional.

- **WebSocket Seguro:**
  - Para aplicaciones web que se conectan a IoT Core.

## Device Shadows (Sombras de dispositivos)

Las Device Shadows permiten sincronizar el estado entre el dispositivo y la nube:

```json
{
  "state": {
    "desired": {
      "color": "red",
      "temperature": 20
    },
    "reported": {
      "color": "red",
      "temperature": 19
    }
  }
}
```

## Reglas (Rules)

Las reglas permiten procesar y enrutar mensajes:

```sql
SELECT * FROM 'device/+/telemetry' WHERE temp > 30
```

## Buenas prácticas

1. **Seguridad de certificados:**
   - Rota certificados regularmente y revoca los comprometidos.

2. **Gestión de dispositivos:**
   - Usa Device Registry para mantener metadatos actualizados.

3. **Monitoreo:**
   - Usa Amazon CloudWatch para supervisar métricas de conectividad.

4. **Optimización de ancho de banda:**
   - Comprime datos y limita la frecuencia de publicación.

5. **Escalabilidad:**
   - Usa Device Shadows y reglas para escalar de manera eficiente.

## Integración con otros servicios AWS

- **AWS Lambda:**
  - Ejecuta funciones en respuesta a eventos IoT.

- **Amazon DynamoDB:**
  - Almacena datos de dispositivos.

- **Amazon S3:**
  - Archiva datos históricos.

- **Amazon SNS/SQS:**
  - Notificaciones y colas de mensajes.

- **AWS Greengrass:**
  - Procesamiento local en dispositivos edge.

## Limitaciones

- **Latencia:**
  - Depende de la calidad de la conexión a internet.

- **Costo de datos:**
  - Costo por millón de mensajes publicados.

- **Complejidad de reglas:**
  - Reglas complejas pueden ser difíciles de mantener.

## Recursos adicionales

- [Documentación oficial de AWS IoT Core](https://docs.aws.amazon.com/iot/)
- [Guía de inicio rápido](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html)
- [Ejemplos de código](https://github.com/aws-samples/aws-iot-core-samples)
- [AWS IoT Device SDK](https://github.com/aws/aws-iot-device-sdk-python)