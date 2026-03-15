# AWS SNS (Simple Notification Service)

## Definición

AWS SNS (Simple Notification Service) es un servicio de mensajería pub/sub totalmente gestionado que permite enviar notificaciones a múltiples suscriptores de manera escalable y confiable. Facilita el desacoplamiento de sistemas mediante el patrón publish-subscribe, permitiendo que los productores de mensajes se comuniquen con múltiples consumidores sin necesidad de conocer sus detalles específicos.

## Características Principales

### 1. **Pub/Sub Messaging**
- Desacoplamiento completo
- Múltiples suscriptores
- Diferentes protocolos
- Escalabilidad automática

### 2. **Múltiples Protocolos**
- HTTP/HTTPS endpoints
- Email notifications
- SMS messages
- Mobile push notifications
- SQS queues
- Lambda functions

### 3. **Seguridad**
- Server-side encryption
- Client-side encryption
- IAM access control
- VPC endpoints

### 4. **Global Reach**
- Multi-region deployment
- Cross-region notifications
- Global endpoints
- High availability

## Componentes Clave

### **Topic**
- Canal de comunicación
- Configuración de políticas
- Atributos personalizados
- Control de acceso

### **Message**
- Contenido de la notificación
- Atributos del mensaje
- Subject y body
- Metadata

### **Publisher**
- Aplicación que envía mensajes
- Publish API
- TargetArn specification
- Message attributes

### **Subscriber**
- Endpoint que recibe mensajes
- Protocol-specific configuration
- Filter policies
- Subscription attributes

## Tipos de Topics

### **Standard Topic**
```bash
# Crear topic estándar
aws sns create-topic \
  --name my-standard-topic \
  --attributes file://standard-topic-attributes.json

# standard-topic-attributes.json
{
  "DisplayName": "My Standard Topic",
  "Policy": "",
  "DeliveryPolicy": "",
  "EffectiveDeliveryPolicy": ""
}
```

### **FIFO Topic**
```bash
# Crear topic FIFO
aws sns create-topic \
  --name my-fifo-topic.fifo \
  --attributes file://fifo-topic-attributes.json

# fifo-topic-attributes.json
{
  "DisplayName": "My FIFO Topic",
  "FifoTopic": "true",
  "ContentBasedDeduplication": "true"
}
```

### **Topic con Encriptación**
```bash
# Crear topic con KMS encryption
aws sns create-topic \
  --name my-encrypted-topic \
  --attributes file://encrypted-topic-attributes.json

# encrypted-topic-attributes.json
{
  "DisplayName": "My Encrypted Topic",
  "KmsMasterKeyId": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
}
```

## Publicación de Mensajes

### **Publisher Básico**
```python
import boto3
import json
import uuid
from datetime import datetime

class SNSPublisher:
    def __init__(self, topic_arn):
        self.sns = boto3.client('sns')
        self.topic_arn = topic_arn
    
    def publish_message(self, message, subject=None, message_attributes=None):
        """Publicar mensaje al topic"""
        
        try:
            params = {
                'TopicArn': self.topic_arn,
                'Message': json.dumps(message) if isinstance(message, dict) else message
            }
            
            if subject:
                params['Subject'] = subject
            
            if message_attributes:
                params['MessageAttributes'] = message_attributes
            
            response = self.sns.publish(**params)
            
            return {
                'success': True,
                'message_id': response['MessageId'],
                'sequence_number': response.get('SequenceNumber')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def publish_user_event(self, user_id, event_type, event_data):
        """Publicar evento de usuario"""
        
        message = {
            'user_id': user_id,
            'event_type': event_type,
            'event_data': event_data,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'user-service'
        }
        
        message_attributes = {
            'EventType': {
                'DataType': 'String',
                'StringValue': event_type
            },
            'Priority': {
                'DataType': 'String',
                'StringValue': event_data.get('priority', 'normal')
            },
            'Source': {
                'DataType': 'String',
                'StringValue': 'user-service'
            }
        }
        
        subject = f"User Event: {event_type} for user {user_id}"
        
        return self.publish_message(message, subject, message_attributes)
    
    def publish_order_event(self, order_id, event_type, order_data):
        """Publicar evento de orden"""
        
        message = {
            'order_id': order_id,
            'event_type': event_type,
            'order_data': order_data,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'order-service'
        }
        
        message_attributes = {
            'EventType': {
                'DataType': 'String',
                'StringValue': event_type
            },
            'OrderStatus': {
                'DataType': 'String',
                'StringValue': order_data.get('status', 'unknown')
            },
            'Source': {
                'DataType': 'String',
                'StringValue': 'order-service'
            }
        }
        
        subject = f"Order Event: {event_type} for order {order_id}"
        
        return self.publish_message(message, subject, message_attributes)
    
    def publish_system_alert(self, alert_type, alert_data, severity='medium'):
        """Publicar alerta del sistema"""
        
        message = {
            'alert_id': str(uuid.uuid4()),
            'alert_type': alert_type,
            'alert_data': alert_data,
            'severity': severity,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'system-monitor'
        }
        
        message_attributes = {
            'AlertType': {
                'DataType': 'String',
                'StringValue': alert_type
            },
            'Severity': {
                'DataType': 'String',
                'StringValue': severity
            },
            'Source': {
                'DataType': 'String',
                'StringValue': 'system-monitor'
            }
        }
        
        subject = f"System Alert: {alert_type} [{severity.upper()}]"
        
        return self.publish_message(message, subject, message_attributes)
    
    def publish_batch_messages(self, messages):
        """Publicar múltiples mensajes"""
        
        results = []
        
        for message in messages:
            result = self.publish_message(
                message['content'],
                message.get('subject'),
                message.get('attributes')
            )
            results.append(result)
        
        return results
```

### **FIFO Publisher**
```python
class FIFO_SNSPublisher(SNSPublisher):
    def __init__(self, topic_arn):
        super().__init__(topic_arn)
        self.fifo = True
    
    def publish_fifo_message(self, message, message_group_id, deduplication_id=None):
        """Publicar mensaje FIFO"""
        
        try:
            params = {
                'TopicArn': self.topic_arn,
                'Message': json.dumps(message) if isinstance(message, dict) else message,
                'MessageGroupId': message_group_id
            }
            
            if deduplication_id:
                params['MessageDeduplicationId'] = deduplication_id
            
            response = self.sns.publish(**params)
            
            return {
                'success': True,
                'message_id': response['MessageId'],
                'sequence_number': response['SequenceNumber']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def publish_order_update(self, order_id, update_data):
        """Publicar actualización de orden con orden FIFO"""
        
        message = {
            'order_id': order_id,
            'update_data': update_data,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'order-service'
        }
        
        return self.publish_fifo_message(
            message,
            f"order-{order_id}",
            f"update-{order_id}-{int(time.time())}"
        )
```

## Suscripción y Consumo

### **Configuración de Suscriptores**
```python
import boto3
import json

class SNSManager:
    def __init__(self):
        self.sns = boto3.client('sns')
    
    def subscribe_email(self, topic_arn, email_address):
        """Suscribir endpoint de email"""
        
        try:
            response = self.sns.subscribe(
                TopicArn=topic_arn,
                Protocol='email',
                Endpoint=email_address
            )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_sms(self, topic_arn, phone_number):
        """Suscribir endpoint de SMS"""
        
        try:
            response = self.sns.subscribe(
                TopicArn=topic_arn,
                Protocol='sms',
                Endpoint=phone_number
            )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_http(self, topic_arn, http_endpoint):
        """Suscribir endpoint HTTP"""
        
        try:
            response = self.sns.subscribe(
                TopicArn=topic_arn,
                Protocol='http',
                Endpoint=http_endpoint
            )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_https(self, topic_arn, https_endpoint):
        """Suscribir endpoint HTTPS"""
        
        try:
            response = self.sns.subscribe(
                TopicArn=topic_arn,
                Protocol='https',
                Endpoint=https_endpoint
            )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_sqs(self, topic_arn, queue_arn):
        """Suscribir cola SQS"""
        
        try:
            response = self.sns.subscribe(
                TopicArn=topic_arn,
                Protocol='sqs',
                Endpoint=queue_arn
            )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_lambda(self, topic_arn, lambda_arn):
        """Suscribir función Lambda"""
        
        try:
            response = self.sns.subscribe(
                TopicArn=topic_arn,
                Protocol='lambda',
                Endpoint=lambda_arn
            )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def set_filter_policy(self, subscription_arn, filter_policy):
        """Configurar política de filtros"""
        
        try:
            self.sns.set_subscription_attributes(
                SubscriptionArn=subscription_arn,
                AttributeName='FilterPolicy',
                AttributeValue=json.dumps(filter_policy)
            )
            
            return {
                'success': True,
                'subscription_arn': subscription_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def confirm_subscription(self, token, topic_arn):
        """Confirmar suscripción (para endpoints como email)"""
        
        try:
            response = self.sns.confirm_subscription(
                TopicArn=topic_arn,
                Token=token
            )
            
            return {
                'success': True,
                'subscription_arn': response['SubscriptionArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### **HTTP/HTTPS Endpoint Handler**
```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)

class SNSWebhookHandler:
    def __init__(self, secret_key=None):
        self.secret_key = secret_key
    
    def verify_signature(self, message, signature):
        """Verificar firma de SNS"""
        
        if not self.secret_key:
            return True  # Skip verification if no secret key
        
        message_to_sign = message['Type'] + message['MessageId'] + message['Timestamp']
        calculated_signature = hmac.new(
            self.secret_key.encode(),
            message_to_sign.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, calculated_signature)
    
    def handle_message(self, message):
        """Manejar mensaje recibido"""
        
        message_type = message['Type']
        
        if message_type == 'SubscriptionConfirmation':
            return self.handle_subscription_confirmation(message)
        elif message_type == 'UnsubscribeConfirmation':
            return self.handle_unsubscribe_confirmation(message)
        elif message_type == 'Notification':
            return self.handle_notification(message)
        else:
            return {'status': 'unknown_message_type'}
    
    def handle_subscription_confirmation(self, message):
        """Manejar confirmación de suscripción"""
        
        try:
            # Confirmar suscripción automáticamente
            sns = boto3.client('sns')
            sns.confirm_subscription(
                TopicArn=message['TopicArn'],
                Token=message['Token']
            )
            
            return {
                'status': 'subscription_confirmed',
                'topic_arn': message['TopicArn']
            }
            
        except Exception as e:
            return {
                'status': 'confirmation_failed',
                'error': str(e)
            }
    
    def handle_notification(self, message):
        """Manejar notificación"""
        
        try:
            # Parsear mensaje
            message_data = json.loads(message['Message'])
            
            # Procesar según tipo de mensaje
            if message_data.get('source') == 'user-service':
                result = self.process_user_notification(message_data)
            elif message_data.get('source') == 'order-service':
                result = self.process_order_notification(message_data)
            elif message_data.get('source') == 'system-monitor':
                result = self.process_system_notification(message_data)
            else:
                result = self.process_generic_notification(message_data)
            
            return {
                'status': 'notification_processed',
                'result': result
            }
            
        except Exception as e:
            return {
                'status': 'processing_failed',
                'error': str(e)
            }
    
    def process_user_notification(self, message_data):
        """Procesar notificación de usuario"""
        
        user_id = message_data['user_id']
        event_type = message_data['event_type']
        
        # Lógica específica para notificaciones de usuario
        if event_type == 'user_registered':
            self.send_welcome_email(user_id)
        elif event_type == 'password_changed':
            self.send_security_alert(user_id)
        
        return {
            'user_id': user_id,
            'event_type': event_type,
            'processed': True
        }
    
    def process_order_notification(self, message_data):
        """Procesar notificación de orden"""
        
        order_id = message_data['order_id']
        event_type = message_data['event_type']
        
        # Lógica específica para notificaciones de orden
        if event_type == 'order_created':
            self.send_order_confirmation(order_id)
        elif event_type == 'order_shipped':
            self.send_shipping_notification(order_id)
        
        return {
            'order_id': order_id,
            'event_type': event_type,
            'processed': True
        }
    
    def process_system_notification(self, message_data):
        """Procesar notificación del sistema"""
        
        alert_type = message_data['alert_type']
        severity = message_data['severity']
        
        # Lógica específica para alertas del sistema
        if severity in ['high', 'critical']:
            self.send_immediate_alert(message_data)
        
        return {
            'alert_type': alert_type,
            'severity': severity,
            'processed': True
        }
    
    def process_generic_notification(self, message_data):
        """Procesar notificación genérica"""
        
        return {
            'source': message_data.get('source', 'unknown'),
            'processed': True
        }
    
    def send_welcome_email(self, user_id):
        """Enviar email de bienvenida"""
        print(f"Sending welcome email to user {user_id}")
    
    def send_security_alert(self, user_id):
        """Enviar alerta de seguridad"""
        print(f"Sending security alert to user {user_id}")
    
    def send_order_confirmation(self, order_id):
        """Enviar confirmación de orden"""
        print(f"Sending order confirmation for order {order_id}")
    
    def send_shipping_notification(self, order_id):
        """Enviar notificación de envío"""
        print(f"Sending shipping notification for order {order_id}")
    
    def send_immediate_alert(self, message_data):
        """Enviar alerta inmediata"""
        print(f"Sending immediate alert: {message_data['alert_type']}")

# Crear instancia del handler
handler = SNSWebhookHandler()

@app.route('/sns/webhook', methods=['POST'])
def sns_webhook():
    """Endpoint para recibir mensajes SNS"""
    
    try:
        # Obtener headers
        message_type = request.headers.get('x-amz-sns-message-type')
        signature = request.headers.get('x-amz-sns-signature')
        
        # Parsear mensaje
        message = json.loads(request.data.decode('utf-8'))
        
        # Verificar firma si está configurada
        if handler.secret_key and not handler.verify_signature(message, signature):
            return jsonify({'error': 'Invalid signature'}), 401
        
        # Manejar mensaje
        result = handler.handle_message(message)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Casos de Uso

### **1. Sistema de Notificaciones de Usuario**
```python
class UserNotificationSystem:
    def __init__(self):
        self.publisher = SNSPublisher('arn:aws:sns:us-east-1:123456789012:user-notifications')
        self.manager = SNSManager()
    
    def setup_notification_system(self):
        """Configurar sistema de notificaciones"""
        
        # Suscribir diferentes endpoints
        subscriptions = []
        
        # Email notifications
        email_sub = self.manager.subscribe_email(
            'arn:aws:sns:us-east-1:123456789012:user-notifications',
            'notifications@example.com'
        )
        subscriptions.append(email_sub)
        
        # SMS notifications
        sms_sub = self.manager.subscribe_sms(
            'arn:aws:sns:us-east-1:123456789012:user-notifications',
            '+1234567890'
        )
        subscriptions.append(sms_sub)
        
        # HTTP endpoint para procesamiento
        http_sub = self.manager.subscribe_http(
            'arn:aws:sns:us-east-1:123456789012:user-notifications',
            'http://my-app.example.com/notifications'
        )
        subscriptions.append(http_sub)
        
        # SQS queue para procesamiento asíncrono
        sqs_sub = self.manager.subscribe_sqs(
            'arn:aws:sns:us-east-1:123456789012:user-notifications',
            'arn:aws:sqs:us-east-1:123456789012:notification-queue'
        )
        subscriptions.append(sqs_sub)
        
        return subscriptions
    
    def setup_filter_policies(self):
        """Configurar políticas de filtros"""
        
        # Filtro para notificaciones críticas (solo email y SMS)
        critical_filter = {
            'severity': [
                {'comparison_operator': 'EqualTo', 'attribute_value': 'high'},
                {'comparison_operator': 'EqualTo', 'attribute_value': 'critical'}
            ]
        }
        
        # Filtro para notificaciones informativas (solo HTTP y SQS)
        info_filter = {
            'severity': [
                {'comparison_operator': 'EqualTo', 'attribute_value': 'low'},
                {'comparison_operator': 'EqualTo', 'attribute_value': 'info'}
            ]
        }
        
        # Aplicar filtros a suscripciones específicas
        # (en producción, esto se aplicaría a las suscripciones correspondientes)
        
        return {
            'critical_filter': critical_filter,
            'info_filter': info_filter
        }
    
    def send_user_notification(self, user_id, notification_type, content, severity='medium'):
        """Enviar notificación de usuario"""
        
        message = {
            'user_id': user_id,
            'notification_type': notification_type,
            'content': content,
            'severity': severity,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'notification-service'
        }
        
        message_attributes = {
            'NotificationType': {
                'DataType': 'String',
                'StringValue': notification_type
            },
            'Severity': {
                'DataType': 'String',
                'StringValue': severity
            },
            'Source': {
                'DataType': 'String',
                'StringValue': 'notification-service'
            }
        }
        
        subject = f"User Notification: {notification_type}"
        
        return self.publisher.publish_message(message, subject, message_attributes)
    
    def send_welcome_notification(self, user_id, user_data):
        """Enviar notificación de bienvenida"""
        
        content = {
            'title': 'Welcome to our service!',
            'body': f"Welcome {user_data['name']}! Thank you for joining our platform.",
            'action_url': '/welcome'
        }
        
        return self.send_user_notification(
            user_id,
            'welcome',
            content,
            'medium'
        )
    
    def send_security_notification(self, user_id, security_event):
        """Enviar notificación de seguridad"""
        
        content = {
            'title': 'Security Alert',
            'body': f"A security event occurred: {security_event['type']}",
            'action_url': '/security'
        }
        
        return self.send_user_notification(
            user_id,
            'security',
            content,
            'high'
        )
```

### **2. Sistema de Alertas del Sistema**
```python
class SystemAlertSystem:
    def __init__(self):
        self.publisher = SNSPublisher('arn:aws:sns:us-east-1:123456789012:system-alerts')
        self.manager = SNSManager()
    
    def setup_alert_system(self):
        """Configurar sistema de alertas"""
        
        # Suscribir Lambda function para procesamiento automático
        lambda_sub = self.manager.subscribe_lambda(
            'arn:aws:sns:us-east-1:123456789012:system-alerts',
            'arn:aws:lambda:us-east-1:123456789012:function:alert-processor'
        )
        
        # Suscribir SQS queue para logging
        sqs_sub = self.manager.subscribe_sqs(
            'arn:aws:sns:us-east-1:123456789012:system-alerts',
            'arn:aws:sqs:us-east-1:123456789012:alert-logging-queue'
        )
        
        # Suscribir email para alertas críticas
        email_sub = self.manager.subscribe_email(
            'arn:aws:sns:us-east-1:123456789012:system-alerts',
            'alerts@example.com'
        )
        
        return [lambda_sub, sqs_sub, email_sub]
    
    def send_system_alert(self, alert_type, message, severity='medium', metadata=None):
        """Enviar alerta del sistema"""
        
        alert_data = {
            'alert_id': str(uuid.uuid4()),
            'alert_type': alert_type,
            'message': message,
            'severity': severity,
            'metadata': metadata or {},
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'system-monitor'
        }
        
        message_attributes = {
            'AlertType': {
                'DataType': 'String',
                'StringValue': alert_type
            },
            'Severity': {
                'DataType': 'String',
                'StringValue': severity
            },
            'Source': {
                'DataType': 'String',
                'StringValue': 'system-monitor'
            }
        }
        
        subject = f"System Alert: {alert_type} [{severity.upper()}]"
        
        return self.publisher.publish_message(alert_data, subject, message_attributes)
    
    def send_performance_alert(self, service, metric, value, threshold):
        """Enviar alerta de performance"""
        
        message = f"Service {service} metric {metric} exceeded threshold: {value} > {threshold}"
        
        metadata = {
            'service': service,
            'metric': metric,
            'value': value,
            'threshold': threshold,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.send_system_alert(
            'performance',
            message,
            'high',
            metadata
        )
    
    def send_error_alert(self, service, error_message, error_count=1):
        """Enviar alerta de error"""
        
        message = f"Service {service} encountered {error_count} errors: {error_message}"
        
        metadata = {
            'service': service,
            'error_message': error_message,
            'error_count': error_count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.send_system_alert(
            'error',
            message,
            'high',
            metadata
        )
    
    def send_resource_alert(self, resource_type, resource_id, status):
        """Enviar alerta de recurso"""
        
        message = f"Resource {resource_type} {resource_id} status changed to {status}"
        
        metadata = {
            'resource_type': resource_type,
            'resource_id': resource_id,
            'status': status,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.send_system_alert(
            'resource',
            message,
            'medium',
            metadata
        )
```

### **3. Sistema de Comunicación de Eventos de Negocio**
```python
class BusinessEventSystem:
    def __init__(self):
        self.publisher = SNSPublisher('arn:aws:sns:us-east-1:123456789012:business-events')
        self.manager = SNSManager()
    
    def setup_event_system(self):
        """Configurar sistema de eventos de negocio"""
        
        # Suscribir diferentes departamentos
        subscriptions = []
        
        # Departamento de ventas
        sales_sub = self.manager.subscribe_sqs(
            'arn:aws:sns:us-east-1:123456789012:business-events',
            'arn:aws:sqs:us-east-1:123456789012:sales-events-queue'
        )
        subscriptions.append(sales_sub)
        
        # Departamento de finanzas
        finance_sub = self.manager.subscribe_sqs(
            'arn:aws:sns:us-east-1:123456789012:business-events',
            'arn:aws:sqs:us-east-1:123456789012:finance-events-queue'
        )
        subscriptions.append(finance_sub)
        
        # Departamento de logística
        logistics_sub = self.manager.subscribe_sqs(
            'arn:aws:sns:us-east-1:123456789012:business-events',
            'arn:aws:sqs:us-east-1:123456789012:logistics-events-queue'
        )
        subscriptions.append(logistics_sub)
        
        # Sistema de analytics
        analytics_sub = self.manager.subscribe_lambda(
            'arn:aws:sns:us-east-1:123456789012:business-events',
            'arn:aws:lambda:us-east-1:123456789012:function:business-analytics'
        )
        subscriptions.append(analytics_sub)
        
        return subscriptions
    
    def setup_department_filters(self):
        """Configurar filtros por departamento"""
        
        # Filtro para eventos de ventas
        sales_filter = {
            'department': [
                {'comparison_operator': 'EqualTo', 'attribute_value': 'sales'}
            ]
        }
        
        # Filtro para eventos financieros
        finance_filter = {
            'department': [
                {'comparison_operator': 'EqualTo', 'attribute_value': 'finance'}
            ]
        }
        
        # Filtro para eventos logísticos
        logistics_filter = {
            'department': [
                {'comparison_operator': 'EqualTo', 'attribute_value': 'logistics'}
            ]
        }
        
        return {
            'sales_filter': sales_filter,
            'finance_filter': finance_filter,
            'logistics_filter': logistics_filter
        }
    
    def publish_business_event(self, event_type, event_data, department='general'):
        """Publicar evento de negocio"""
        
        message = {
            'event_id': str(uuid.uuid4()),
            'event_type': event_type,
            'event_data': event_data,
            'department': department,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'business-system'
        }
        
        message_attributes = {
            'EventType': {
                'DataType': 'String',
                'StringValue': event_type
            },
            'Department': {
                'DataType': 'String',
                'StringValue': department
            },
            'Source': {
                'DataType': 'String',
                'StringValue': 'business-system'
            }
        }
        
        subject = f"Business Event: {event_type} [{department}]"
        
        return self.publisher.publish_message(message, subject, message_attributes)
    
    def publish_sale_event(self, sale_data):
        """Publicar evento de venta"""
        
        event_data = {
            'sale_id': sale_data['sale_id'],
            'customer_id': sale_data['customer_id'],
            'amount': sale_data['amount'],
            'products': sale_data['products'],
            'sales_rep': sale_data['sales_rep']
        }
        
        return self.publish_business_event(
            'sale_completed',
            event_data,
            'sales'
        )
    
    def publish_payment_event(self, payment_data):
        """Publicar evento de pago"""
        
        event_data = {
            'payment_id': payment_data['payment_id'],
            'sale_id': payment_data['sale_id'],
            'amount': payment_data['amount'],
            'method': payment_data['method'],
            'status': payment_data['status']
        }
        
        return self.publish_business_event(
            'payment_processed',
            event_data,
            'finance'
        )
    
    def publish_shipment_event(self, shipment_data):
        """Publicar evento de envío"""
        
        event_data = {
            'shipment_id': shipment_data['shipment_id'],
            'order_id': shipment_data['order_id'],
            'carrier': shipment_data['carrier'],
            'tracking_number': shipment_data['tracking_number'],
            'status': shipment_data['status']
        }
        
        return self.publish_business_event(
            'shipment_created',
            event_data,
            'logistics'
        )
```

## Mobile Push Notifications

### **Configuración de Push Notifications**
```python
class MobilePushManager:
    def __init__(self):
        self.sns = boto3.client('sns')
        self.platform_endpoints = {}
    
    def create_platform_application(self, platform_name, platform_arn):
        """Crear aplicación de plataforma"""
        
        try:
            response = self.sns.create_platform_application(
                Name=platform_name,
                PlatformPrincipal=platform_arn,
                Attributes={
                    'PlatformCredential': 'your_platform_credentials',
                    'PlatformPrincipal': platform_arn
                }
            )
            
            return {
                'success': True,
                'platform_arn': response['PlatformApplicationArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def register_device_token(self, platform_arn, device_token, user_data=None):
        """Registrar token de dispositivo"""
        
        try:
            response = self.sns.create_platform_endpoint(
                PlatformApplicationArn=platform_arn,
                Token=device_token,
                CustomUserData=json.dumps(user_data) if user_data else None,
                Attributes={
                    'Enabled': 'true'
                }
            )
            
            endpoint_arn = response['EndpointArn']
            self.platform_endpoints[device_token] = endpoint_arn
            
            return {
                'success': True,
                'endpoint_arn': endpoint_arn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_push_notification(self, device_token, message, title=None, badge=None, sound=None):
        """Enviar notificación push"""
        
        if device_token not in self.platform_endpoints:
            return {
                'success': False,
                'error': 'Device not registered'
            }
        
        endpoint_arn = self.platform_endpoints[device_token]
        
        # Construir mensaje para diferentes plataformas
        if 'APNS' in endpoint_arn:  # iOS
            payload = self.build_apns_payload(message, title, badge, sound)
        else:  # Android
            payload = self.build_fcm_payload(message, title, badge, sound)
        
        try:
            response = self.sns.publish(
                TargetArn=endpoint_arn,
                Message=json.dumps(payload),
                MessageStructure='json'
            )
            
            return {
                'success': True,
                'message_id': response['MessageId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def build_apns_payload(self, message, title=None, badge=None, sound=None):
        """Construir payload para Apple Push Notification Service"""
        
        aps = {
            'alert': {
                'body': message
            }
        }
        
        if title:
            aps['alert']['title'] = title
        
        if badge:
            aps['badge'] = badge
        
        if sound:
            aps['sound'] = sound
        else:
            aps['sound'] = 'default'
        
        return {
            'APNS': json.dumps({
                'aps': aps,
                'custom_data': {
                    'notification_id': str(uuid.uuid4()),
                    'timestamp': datetime.utcnow().isoformat()
                }
            })
        }
    
    def build_fcm_payload(self, message, title=None, badge=None, sound=None):
        """Construir payload para Firebase Cloud Messaging"""
        
        notification = {
            'body': message
        }
        
        if title:
            notification['title'] = title
        
        if sound:
            notification['sound'] = sound
        else:
            notification['sound'] = 'default'
        
        data = {
            'notification_id': str(uuid.uuid4()),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if badge:
            data['badge'] = badge
        
        return {
            'GCM': json.dumps({
                'notification': notification,
                'data': data
            })
        }
    
    def send_broadcast_notification(self, platform_arn, message, title=None):
        """Enviar notificación broadcast a todos los dispositivos"""
        
        try:
            response = self.sns.publish(
                TargetArn=platform_arn,
                Message=json.dumps({
                    'default': message,
                    'APNS': json.dumps({
                        'aps': {
                            'alert': {
                                'title': title or 'Notification',
                                'body': message
                            },
                            'sound': 'default'
                        }
                    }),
                    'GCM': json.dumps({
                        'notification': {
                            'title': title or 'Notification',
                            'body': message,
                            'sound': 'default'
                        }
                    })
                }),
                MessageStructure='json'
            )
            
            return {
                'success': True,
                'message_id': response['MessageId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Security y Compliance

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:CreateTopic",
        "sns:ListTopics"
      ],
      "Resource": [
        "arn:aws:sns:us-east-1:123456789012:*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:SetSubscriptionAttributes"
      ],
      "Resource": [
        "arn:aws:sns:us-east-1:123456789012:*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:CreatePlatformApplication",
        "sns:CreatePlatformEndpoint"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Topic Policies**
```json
{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/publisher-role"
      },
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:123456789012:my-topic"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/subscriber-role"
      },
      "Action": "sns:Subscribe",
      "Resource": "arn:aws:sns:us-east-1:123456789012:my-topic"
    }
  ]
}
```

## Monitoring y Métricas

### **CloudWatch Metrics**
```python
class SNSMonitoring:
    def __init__(self, topic_name):
        self.cloudwatch = boto3.client('cloudwatch')
        self.topic_name = topic_name
    
    def get_topic_metrics(self):
        """Obtener métricas del topic"""
        
        metrics = [
            'NumberOfMessagesPublished',
            'NumberOfNotificationsDelivered',
            'NumberOfNotificationsFailed',
            'PublishSize',
            'SMSSuccessRate',
            'SMSMonthToDateSpentUSD'
        ]
        
        results = {}
        
        for metric in metrics:
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/SNS',
                    MetricName=metric,
                    Dimensions=[
                        {
                            'Name': 'TopicName',
                            'Value': self.topic_name
                        }
                    ],
                    StartTime=datetime.utcnow() - timedelta(hours=24),
                    EndTime=datetime.utcnow(),
                    Period=300,
                    Statistics=['Sum', 'Average']
                )
                
                if response['Datapoints']:
                    results[metric] = response['Datapoints'][-1]
                
            except Exception as e:
                print(f"Error getting metric {metric}: {e}")
        
        return results
    
    def setup_topic_alarms(self):
        """Configurar alarmas para el topic"""
        
        alarms = [
            {
                'name': f'{self.topic_name}-HighFailureRate',
                'metric': 'NumberOfNotificationsFailed',
                'threshold': 10,
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': f'{self.topic_name}-LowDeliveryRate',
                'metric': 'NumberOfNotificationsDelivered',
                'threshold': 1,
                'comparison': 'LessThanThreshold'
            }
        ]
        
        for alarm in alarms:
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm['name'],
                AlarmDescription=f'Alarm for {self.topic_name}',
                MetricName=alarm['metric'],
                Namespace='AWS/SNS',
                Dimensions=[
                    {
                        'Name': 'TopicName',
                        'Value': self.topic_name
                    }
                ],
                Statistic='Sum',
                Period=300,
                EvaluationPeriods=2,
                Threshold=alarm['threshold'],
                ComparisonOperator=alarm['comparison'],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:sns-alerts'
                ]
            )
```

## Best Practices

### **1. Diseño de Topics**
- Usar nombres descriptivos
- Separar por dominio de negocio
- Configurar políticas de acceso apropiadas
- Usar filtros para routing eficiente

### **2. Manejo de Mensajes**
- Validar estructura de mensajes
- Usar atributos consistentes
- Implementar retry mechanisms
- Manejar errores gracefully

### **3. Security**
- Usar encriptación para datos sensibles
- Implementar firmas para endpoints HTTP
- Usar IAM roles con permisos mínimos
- Regularmente rotar credenciales

### **4. Performance**
- Usar filtros para reducir tráfico
- Optimizar tamaño de mensajes
- Configurar apropiado delivery policies
- Monitorizar métricas clave

## Cost Management

### **Pricing Components**
- **Publish**: $0.50 por millón de publicaciones
- **Delivery**: Variable por protocolo
- **Data Transfer**: Standard AWS rates
- **Platform Applications**: Variable por plataforma

### **Cost Optimization**
```python
def calculate_sns_costs(publish_count, email_count, sms_count, data_transfer_gb):
    """Calcular costos de SNS"""
    
    # Publish costs
    publish_cost = (publish_count / 1000000) * 0.50
    
    # Email costs
    email_cost = email_count * 0.0002  # $0.20 por 1000 emails
    
    # SMS costs
    sms_cost = sms_count * 0.00645  # $0.00645 por SMS (US)
    
    # Data transfer
    data_transfer_cost = data_transfer_gb * 0.09  # US East rate
    
    total_cost = publish_cost + email_cost + sms_cost + data_transfer_cost
    
    return {
        'publish_cost': publish_cost,
        'email_cost': email_cost,
        'sms_cost': sms_cost,
        'data_transfer_cost': data_transfer_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS SNS es fundamental para arquitecturas desacopladas que requieren comunicación pub/sub escalable y confiable. Es ideal para sistemas de notificaciones, alertas, eventos de negocio y comunicación entre microservicios, proporcionando una solución flexible y económicamente eficiente para distribuir mensajes a múltiples consumidores de manera simultánea.
