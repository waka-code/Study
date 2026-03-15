# AWS Lambda

## Definición

AWS Lambda es un servicio de computación serverless que te permite ejecutar código sin aprovisionar ni gestionar servidores. Lambda ejecuta tu código solo cuando lo necesitas y escala automáticamente, desde pocas solicitudes por día hasta miles por segundo.

## Características Principales

### 1. **Ejecución bajo demanda**
- El código se ejecuta solo en respuesta a eventos o invocaciones
- No hay servidores corriendo cuando no hay trabajo

### 2. **Escalado automático**
- Lambda escala automáticamente según el número de solicitudes
- Maneja picos de tráfico sin configuración manual

### 3. **Pago por milisegundo**
- Pago solo por el tiempo de computación consumido
- Primer millón de solicitudes gratuito cada mes

### 4. **Múltiples lenguajes soportados**
- Node.js, Python, Java, Go, Ruby, C#, PowerShell
- Runtime personalizados con contenedores

## Componentes de una Función Lambda

### **Handler (Manejador)**
- Punto de entrada de tu función
- Recibe eventos y devuelve respuestas
- Formato: `def handler_name(event, context)`

### **Event (Evento)**
- Datos que activan la función
- Formato JSON
- Varía según la fuente del evento

### **Context**
- Información sobre la invocación
- Metadatos de tiempo de ejecución
- Límites de memoria y tiempo

### **Layers (Capas)**
- Bibliotecas y dependencias compartidas
- Reducen el tamaño del paquete de despliegue
- Reutilizables entre funciones

## Fuentes de Evento (Event Sources)

### **Servicios AWS Integrados**
- **API Gateway**: Endpoints HTTP/REST
- **S3**: Eventos de objetos (creación, eliminación)
- **DynamoDB**: Cambios en tablas
- **SNS**: Notificaciones y mensajes
- **SQS**: Mensajes en cola
- **CloudWatch**: Eventos programados (cron)
- **Kinesis**: Streams de datos

### **Fuentes de Invocación**
- **Síncronas**: API Gateway, Application Load Balancer
- **Asíncronas**: S3, SNS, SQS, EventBridge
- **Basadas en streaming**: Kinesis, DynamoDB Streams

## Configuración

### **Memoria**
- 128 MB a 10,240 MB
- Afecta el rendimiento y el costo
- Más memoria = más CPU

### **Tiempo de ejecución**
- Máximo 15 minutos
- Configurable por función
- Timeout detiene la ejecución

### **Entorno de ejecución**
- Versiones específicas de lenguajes
- Amazon Linux 2
- Variables de entorno

### **Red**
- VPC integration
- Endpoints privados
- Security groups

## Modelo de Precios

### **Cálculo**
- $0.20 por 1M de solicitudes
- $0.0000166667 por GB-segundo
- Primer millón de solicitudes gratuito
- 400,000 GB-segundos gratuitos mensuales

### **Factores de costo**
- Memoria asignada
- Tiempo de ejecución
- Número de invocaciones
- Transferencia de datos

## Casos de Uso

### **1. APIs REST**
- Endpoints backend sin servidores
- Microservicios serverless
- Webhooks

### **2. Procesamiento de datos**
- Transformación de archivos
- Procesamiento de imágenes
- ETL serverless

### **3. Automatización**
- Tareas programadas
- Procesamiento de eventos
- Orquestación de workflows

### **4. Integraciones**
- Webhook processing
- Chatbots
- IoT data processing

## Mejores Prácticas

### **1. Diseño de funciones**
- Funciones pequeñas y específicas
- Una responsabilidad por función
- Manejo de errores robusto

### **2. Gestión de estado**
- Evitar estado local
- Usar servicios externos (DynamoDB, S3)
- Stateless design

### **3. Seguridad**
- Principio de menor privilegio
- IAM roles específicos
- Variables de entorno para secrets

### **4. Monitoreo**
- CloudWatch Logs
- Métricas personalizadas
- X-Ray para tracing

## Limitaciones

### **Ejecución**
- Máximo 15 minutos por invocación
- 10 GB de memoria máxima
- 6 MB de payload (síncrono)
- 256 KB de payload (asíncrono)

### **Despliegue**
- 50 MB de código (ZIP)
- 250 MB descomprimido
- 10 GB con contenedores

### **Concurrencia**
- Límites de concurrencia por región
- Reserved Concurrency disponible
- Provisioned Concurrency para cold starts

## Herramientas y Frameworks

### **AWS SAM (Serverless Application Model)**
- Template YAML para infraestructura
- CLI para despliegue
- Integración con CloudFormation

### **Serverless Framework**
- Multi-cloud
- Plugins extensibles
- Gestión de lifecycle

### **Terraform**
- Infrastructure as Code
- Gestión de recursos AWS
- State management

## Ejemplo de Función (Python)

```python
import json

def lambda_handler(event, context):
    # Extraer datos del evento
    name = event.get('name', 'World')
    
    # Lógica de negocio
    message = f'Hello, {name}!'
    
    # Respuesta
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': message
        })
    }
```

## Monitoreo y Debugging

### **CloudWatch Logs**
- Logs automáticos de ejecución
- Métricas de invocación
- Errores y throttling

### **X-Ray**
- Distributed tracing
- Mapa de servicios
- Análisis de rendimiento

### **Lambda Insights**
- Métricas detalladas
- Performance monitoring
- Debugging avanzado

## Conclusión

AWS Lambda es fundamental en la arquitectura serverless, permitiendo construir aplicaciones escalables, rentables y sin preocuparse por la infraestructura subyacente. Es ideal para microservicios, APIs y procesamiento de eventos.
