# AWS SQS (Simple Queue Service)

## Definición

AWS SQS (Simple Queue Service) es un servicio de cola de mensajes totalmente gestionado que permite desacoplar y escalar microservicios, sistemas distribuidos y aplicaciones serverless. Proporciona una cola de mensajes fiable, escalable y segura que permite transmitir datos entre componentes de software sin perder mensajes ni requerir que los componentes estén disponibles simultáneamente.

## Características Principales

### 1. **Colas de Mensajes**
- Mensajería asíncrona
- Desacoplamiento de componentes
- Escalabilidad automática
- Alta disponibilidad

### 2. **Tipos de Colas**
- Standard Queue
- FIFO Queue
- Dead-Letter Queue (DLQ)
- Delay Queue

### 3. **Seguridad**
- Encriptación con KMS
- Control de acceso con IAM
- Server-side encryption
- VPC endpoints

### 4. **Monitoring**
- CloudWatch metrics
- Alarms automáticas
- Visibility timeout
- Message retention

## Componentes Clave

### **Queue**
- Contenedor principal de mensajes
- Configuración de parámetros
- Políticas de acceso
- Atributos personalizados

### **Message**
- Contenido del mensaje
- Metadatos
- Message ID
- Receipt handle

### **Producer**
- Aplicación que envía mensajes
- SendMessage API
- Batch operations
- Message attributes

### **Consumer**
- Aplicación que procesa mensajes
- ReceiveMessage API
- DeleteMessage API
- Visibility timeout

## Tipos de Colas

### **Standard Queue**
```bash
# Crear cola estándar
aws sqs create-queue \
  --queue-name my-standard-queue \
  --attributes file://standard-queue-attributes.json

# standard-queue-attributes.json
{
  "DelaySeconds": "0",
  "MaximumMessageSize": "262144",
  "MessageRetentionPeriod": "1209600",
  "ReceiveMessageWaitTimeSeconds": "20",
  "VisibilityTimeout": "30",
  "RedrivePolicy": ""
}
```

### **FIFO Queue**
```bash
# Crear cola FIFO
aws sqs create-queue \
  --queue-name my-fifo-queue.fifo \
  --attributes file://fifo-queue-attributes.json

# fifo-queue-attributes.json
{
  "DelaySeconds": "0",
  "MaximumMessageSize": "262144",
  "MessageRetentionPeriod": "1209600",
  "ReceiveMessageWaitTimeSeconds": "20",
  "VisibilityTimeout": "30",
  "FifoQueue": "true",
  "ContentBasedDeduplication": "true"
}
```

### **Dead-Letter Queue**
```bash
# Crear Dead-Letter Queue
aws sqs create-queue \
  --queue-name my-dlq \
  --attributes file://dlq-attributes.json

# dlq-attributes.json
{
  "MessageRetentionPeriod": "1209600"
}

# Configurar redrive policy
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attributes '{
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:my-dlq\",\"maxReceiveCount\":5}"
  }'
```

## Operaciones Básicas

### **Enviar Mensajes**
```python
import boto3
import json
import uuid

class SQSProducer:
    def __init__(self, queue_url):
        self.sqs = boto3.client('sqs')
        self.queue_url = queue_url
    
    def send_message(self, message_body, message_attributes=None):
        """Enviar un mensaje a la cola"""
        
        try:
            response = self.sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=message_body,
                MessageAttributes=message_attributes or {},
                MessageGroupId=None,  # Para colas FIFO
                MessageDeduplicationId=None  # Para colas FIFO
            )
            
            return {
                'success': True,
                'message_id': response['MessageId'],
                'md5_of_message_body': response['MD5OfMessageBody']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_batch_messages(self, messages):
        """Enviar múltiples mensajes en batch"""
        
        entries = []
        for i, message in enumerate(messages):
            entry = {
                'Id': str(i),
                'MessageBody': message['body'],
                'MessageAttributes': message.get('attributes', {})
            }
            
            # Para colas FIFO
            if message.get('group_id'):
                entry['MessageGroupId'] = message['group_id']
                entry['MessageDeduplicationId'] = message.get('dedup_id', str(uuid.uuid4()))
            
            entries.append(entry)
        
        try:
            response = self.sqs.send_message_batch(
                QueueUrl=self.queue_url,
                Entries=entries
            )
            
            return {
                'success': True,
                'successful': response['Successful'],
                'failed': response['Failed']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_delayed_message(self, message_body, delay_seconds):
        """Enviar mensaje con retraso"""
        
        try:
            response = self.sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=message_body,
                DelaySeconds=delay_seconds
            )
            
            return {
                'success': True,
                'message_id': response['MessageId'],
                'delay_seconds': delay_seconds
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### **Recibir Mensajes**
```python
import boto3
import json
import time

class SQSConsumer:
    def __init__(self, queue_url):
        self.sqs = boto3.client('sqs')
        self.queue_url = queue_url
    
    def receive_messages(self, max_messages=10, wait_time=20):
        """Recibir mensajes de la cola"""
        
        try:
            response = self.sqs.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=max_messages,
                WaitTimeSeconds=wait_time,
                AttributeNames=['All'],
                MessageAttributeNames=['All']
            )
            
            messages = response.get('Messages', [])
            
            return {
                'success': True,
                'messages': messages,
                'count': len(messages)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_message(self, message):
        """Procesar un mensaje individual"""
        
        try:
            # Extraer información del mensaje
            message_body = json.loads(message['Body'])
            message_attributes = message.get('MessageAttributes', {})
            
            # Procesar según tipo de mensaje
            message_type = message_attributes.get('MessageType', {}).get('StringValue', 'default')
            
            if message_type == 'user_registration':
                result = self.process_user_registration(message_body)
            elif message_type == 'order_processing':
                result = self.process_order(message_body)
            elif message_type == 'notification':
                result = self.process_notification(message_body)
            else:
                result = self.process_generic_message(message_body)
            
            return {
                'success': True,
                'result': result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_message(self, message):
        """Eliminar mensaje después de procesarlo"""
        
        try:
            self.sqs.delete_message(
                QueueUrl=self.queue_url,
                ReceiptHandle=message['ReceiptHandle']
            )
            
            return True
            
        except Exception as e:
            print(f"Error deleting message: {e}")
            return False
    
    def change_visibility(self, message, visibility_timeout):
        """Cambiar visibility timeout de un mensaje"""
        
        try:
            self.sqs.change_message_visibility(
                QueueUrl=self.queue_url,
                ReceiptHandle=message['ReceiptHandle'],
                VisibilityTimeout=visibility_timeout
            )
            
            return True
            
        except Exception as e:
            print(f"Error changing visibility: {e}")
            return False
    
    def start_consuming(self, processor_callback, max_messages=10, wait_time=20):
        """Iniciar consumo continuo de mensajes"""
        
        while True:
            try:
                # Recibir mensajes
                result = self.receive_messages(max_messages, wait_time)
                
                if result['success'] and result['messages']:
                    for message in result['messages']:
                        try:
                            # Procesar mensaje
                            process_result = self.process_message(message)
                            
                            if process_result['success']:
                                # Eliminar mensaje si se procesó correctamente
                                self.delete_message(message)
                                print(f"Message processed and deleted: {message['MessageId']}")
                            else:
                                # No eliminar mensaje para que sea reintentado
                                print(f"Message processing failed: {process_result['error']}")
                        
                        except Exception as e:
                            print(f"Error processing message {message['MessageId']}: {e}")
                            # No eliminar mensaje para que sea reintentado
                else:
                    print("No messages received, continuing...")
                    
            except Exception as e:
                print(f"Error in consumer loop: {e}")
                time.sleep(5)  # Esperar antes de reintentar
```

## Casos de Uso

### **1. Procesamiento de Órdenes**
```python
class OrderProcessingQueue:
    def __init__(self):
        self.producer = SQSProducer('https://sqs.us-east-1.amazonaws.com/123456789012/order-queue')
        self.consumer = SQSConsumer('https://sqs.us-east-1.amazonaws.com/123456789012/order-queue')
    
    def submit_order(self, order_data):
        """Enviar orden para procesamiento"""
        
        message_body = json.dumps({
            'order_id': order_data['order_id'],
            'customer_id': order_data['customer_id'],
            'items': order_data['items'],
            'total_amount': order_data['total_amount'],
            'timestamp': datetime.utcnow().isoformat()
        })
        
        message_attributes = {
            'MessageType': {
                'DataType': 'String',
                'StringValue': 'order_processing'
            },
            'Priority': {
                'DataType': 'String',
                'StringValue': order_data.get('priority', 'normal')
            }
        }
        
        return self.producer.send_message(message_body, message_attributes)
    
    def process_order(self, order_data):
        """Procesar orden recibida"""
        
        try:
            # Validar orden
            if not self.validate_order(order_data):
                return {'success': False, 'error': 'Invalid order data'}
            
            # Verificar inventario
            inventory_check = self.check_inventory(order_data['items'])
            if not inventory_check['available']:
                return {'success': False, 'error': 'Insufficient inventory'}
            
            # Calcular total
            total = self.calculate_total(order_data['items'])
            
            # Procesar pago
            payment_result = self.process_payment(
                order_data['customer_id'],
                total
            )
            
            if not payment_result['success']:
                return {'success': False, 'error': 'Payment failed'}
            
            # Actualizar inventario
            self.update_inventory(order_data['items'])
            
            # Enviar confirmación
            self.send_order_confirmation(order_data['order_id'])
            
            return {
                'success': True,
                'order_id': order_data['order_id'],
                'total': total,
                'payment_id': payment_result['payment_id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def validate_order(self, order_data):
        """Validar datos de la orden"""
        required_fields = ['order_id', 'customer_id', 'items', 'total_amount']
        
        for field in required_fields:
            if field not in order_data:
                return False
        
        if not isinstance(order_data['items'], list) or len(order_data['items']) == 0:
            return False
        
        return True
    
    def check_inventory(self, items):
        """Verificar disponibilidad de inventario"""
        
        # Simulación de verificación de inventario
        available = True
        unavailable_items = []
        
        for item in items:
            # En producción, esto consultaría base de datos de inventario
            if item.get('quantity', 0) > 100:  # Simulación de límite
                available = False
                unavailable_items.append(item['product_id'])
        
        return {
            'available': available,
            'unavailable_items': unavailable_items
        }
    
    def calculate_total(self, items):
        """Calcular total de la orden"""
        
        total = 0
        for item in items:
            total += item['price'] * item['quantity']
        
        return total
    
    def process_payment(self, customer_id, amount):
        """Procesar pago"""
        
        # Simulación de procesamiento de pago
        import uuid
        
        return {
            'success': True,
            'payment_id': str(uuid.uuid4()),
            'amount': amount
        }
    
    def update_inventory(self, items):
        """Actualizar inventario"""
        
        # En producción, esto actualizaría base de datos
        for item in items:
            print(f"Updating inventory for product {item['product_id']}: -{item['quantity']}")
    
    def send_order_confirmation(self, order_id):
        """Enviar confirmación de orden"""
        
        # Enviar notificación (podría ser otra cola SQS)
        notification_data = {
            'type': 'order_confirmation',
            'order_id': order_id,
            'status': 'completed'
        }
        
        # Simulación de envío
        print(f"Order confirmation sent for order {order_id}")
```

### **2. Notificaciones Masivas**
```python
class NotificationQueue:
    def __init__(self):
        self.producer = SQSProducer('https://sqs.us-east-1.amazonaws.com/123456789012/notification-queue')
        self.consumer = SQSConsumer('https://sqs.us-east-1.amazonaws.com/123456789012/notification-queue')
    
    def send_bulk_notification(self, notification_data, recipients):
        """Enviar notificación masiva"""
        
        messages = []
        
        for recipient in recipients:
            message = {
                'body': json.dumps({
                    'notification_id': notification_data['notification_id'],
                    'recipient': recipient,
                    'subject': notification_data['subject'],
                    'content': notification_data['content'],
                    'template': notification_data.get('template', 'default'),
                    'timestamp': datetime.utcnow().isoformat()
                }),
                'attributes': {
                    'MessageType': {
                        'DataType': 'String',
                        'StringValue': 'notification'
                    },
                    'Priority': {
                        'DataType': 'String',
                        'StringValue': notification_data.get('priority', 'normal')
                    },
                    'Channel': {
                        'DataType': 'String',
                        'StringValue': recipient.get('channel', 'email')
                    }
                }
            }
            messages.append(message)
        
        # Enviar en batches de 10 mensajes
        batch_size = 10
        results = []
        
        for i in range(0, len(messages), batch_size):
            batch = messages[i:i + batch_size]
            result = self.producer.send_batch_messages(batch)
            results.append(result)
        
        return results
    
    def process_notification(self, notification_data):
        """Procesar notificación individual"""
        
        try:
            recipient = notification_data['recipient']
            channel = recipient.get('channel', 'email')
            
            if channel == 'email':
                result = self.send_email_notification(notification_data)
            elif channel == 'sms':
                result = self.send_sms_notification(notification_data)
            elif channel == 'push':
                result = self.send_push_notification(notification_data)
            else:
                result = {'success': False, 'error': f'Unknown channel: {channel}'}
            
            # Registrar resultado
            self.log_notification_result(notification_data['notification_id'], result)
            
            return result
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_email_notification(self, notification_data):
        """Enviar notificación por email"""
        
        # Simulación de envío de email
        print(f"Sending email to {notification_data['recipient']['address']}")
        
        return {
            'success': True,
            'channel': 'email',
            'recipient': notification_data['recipient']['address']
        }
    
    def send_sms_notification(self, notification_data):
        """Enviar notificación por SMS"""
        
        # Simulación de envío de SMS
        print(f"Sending SMS to {notification_data['recipient']['phone']}")
        
        return {
            'success': True,
            'channel': 'sms',
            'recipient': notification_data['recipient']['phone']
        }
    
    def send_push_notification(self, notification_data):
        """Enviar notificación push"""
        
        # Simulación de envío de push
        print(f"Sending push to device {notification_data['recipient']['device_id']}")
        
        return {
            'success': True,
            'channel': 'push',
            'recipient': notification_data['recipient']['device_id']
        }
    
    def log_notification_result(self, notification_id, result):
        """Registrar resultado de notificación"""
        
        # En producción, esto guardaría en base de datos
        log_entry = {
            'notification_id': notification_id,
            'result': result,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        print(f"Notification result logged: {log_entry}")
```

### **3. Procesamiento de Archivos**
```python
class FileProcessingQueue:
    def __init__(self):
        self.producer = SQSProducer('https://sqs.us-east-1.amazonaws.com/123456789012/file-processing-queue')
        self.consumer = SQSConsumer('https://sqs.us-east-1.amazonaws.com/123456789012/file-processing-queue')
    
    def submit_file_for_processing(self, file_info):
        """Enviar archivo para procesamiento"""
        
        message_body = json.dumps({
            'file_id': file_info['file_id'],
            'file_name': file_info['file_name'],
            'file_path': file_info['file_path'],
            'file_size': file_info['file_size'],
            'file_type': file_info['file_type'],
            'processing_type': file_info.get('processing_type', 'default'),
            'metadata': file_info.get('metadata', {}),
            'timestamp': datetime.utcnow().isoformat()
        })
        
        message_attributes = {
            'MessageType': {
                'DataType': 'String',
                'StringValue': 'file_processing'
            },
            'ProcessingType': {
                'DataType': 'String',
                'StringValue': file_info.get('processing_type', 'default')
            },
            'Priority': {
                'DataType': 'String',
                'StringValue': file_info.get('priority', 'normal')
            }
        }
        
        return self.producer.send_message(message_body, message_attributes)
    
    def process_file(self, file_data):
        """Procesar archivo recibido"""
        
        try:
            processing_type = file_data.get('processing_type', 'default')
            
            if processing_type == 'image_resize':
                result = self.process_image_resize(file_data)
            elif processing_type == 'video_transcode':
                result = self.process_video_transcode(file_data)
            elif processing_type == 'document_conversion':
                result = self.process_document_conversion(file_data)
            elif processing_type == 'data_extraction':
                result = self.process_data_extraction(file_data)
            else:
                result = self.process_generic_file(file_data)
            
            # Actualizar estado del archivo
            self.update_file_status(file_data['file_id'], 'completed', result)
            
            return result
            
        except Exception as e:
            # Actualizar estado con error
            self.update_file_status(file_data['file_id'], 'failed', {'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def process_image_resize(self, file_data):
        """Procesar redimensionamiento de imagen"""
        
        print(f"Resizing image: {file_data['file_name']}")
        
        # Simulación de procesamiento
        time.sleep(2)  # Simular tiempo de procesamiento
        
        return {
            'success': True,
            'processing_type': 'image_resize',
            'output_sizes': ['small', 'medium', 'large'],
            'processing_time': 2.0
        }
    
    def process_video_transcode(self, file_data):
        """Procesar transcodificación de video"""
        
        print(f"Transcoding video: {file_data['file_name']}")
        
        # Simulación de procesamiento más largo
        time.sleep(10)
        
        return {
            'success': True,
            'processing_type': 'video_transcode',
            'output_formats': ['mp4', 'webm'],
            'resolutions': ['720p', '1080p'],
            'processing_time': 10.0
        }
    
    def process_document_conversion(self, file_data):
        """Procesar conversión de documento"""
        
        print(f"Converting document: {file_data['file_name']}")
        
        time.sleep(3)
        
        return {
            'success': True,
            'processing_type': 'document_conversion',
            'output_formats': ['pdf', 'docx'],
            'processing_time': 3.0
        }
    
    def process_data_extraction(self, file_data):
        """Procesar extracción de datos"""
        
        print(f"Extracting data from: {file_data['file_name']}")
        
        time.sleep(5)
        
        return {
            'success': True,
            'processing_type': 'data_extraction',
            'extracted_fields': ['name', 'date', 'amount'],
            'record_count': 1000,
            'processing_time': 5.0
        }
    
    def update_file_status(self, file_id, status, result):
        """Actualizar estado del archivo"""
        
        # En producción, esto actualizaría base de datos
        status_update = {
            'file_id': file_id,
            'status': status,
            'result': result,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        print(f"File status updated: {status_update}")
```

## Configuración Avanzada

### **Colas con VPC Endpoints**
```bash
# Crear VPC endpoint para SQS
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-1234567890abcdef0 \
  --service-name com.amazonaws.us-east-1.sqs \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-12345678 subnet-87654321 \
  --security-group-ids sg-1234567890abcdef0 \
  --private-dns-enabled

# Crear política de endpoint
cat > endpoint-policy.json << EOF
{
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
EOF

aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-1234567890abcdef0 \
  --policy-document file://endpoint-policy.json
```

### **Encriptación con KMS**
```bash
# Crear KMS key para SQS
aws kms create-key \
  --description "KMS key for SQS encryption" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS \
  --tags TagKey=Application,TagValue=MyApp

# Habilitar encriptación en cola
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attributes '{
    "KmsMasterKeyId": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }'
```

### **Políticas de Acceso**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/sqs-producer-role"
      },
      "Action": [
        "sqs:SendMessage",
        "sqs:SendMessageBatch"
      ],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:my-queue"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/sqs-consumer-role"
      },
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:ChangeMessageVisibility"
      ],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:my-queue"
    }
  ]
}
```

## Monitoring y Métricas

### **CloudWatch Metrics**
```python
class SQSMonitoring:
    def __init__(self, queue_url):
        self.cloudwatch = boto3.client('cloudwatch')
        self.queue_url = queue_url
        self.queue_name = queue_url.split('/')[-1]
    
    def get_queue_metrics(self):
        """Obtener métricas de la cola"""
        
        metrics = [
            'ApproximateNumberOfMessagesVisible',
            'ApproximateNumberOfMessagesNotVisible',
            'ApproximateAgeOfOldestMessage',
            'NumberOfMessagesReceived',
            'NumberOfMessagesDeleted',
            'NumberOfEmptyReceives'
        ]
        
        results = {}
        
        for metric in metrics:
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/SQS',
                    MetricName=metric,
                    Dimensions=[
                        {
                            'Name': 'QueueName',
                            'Value': self.queue_name
                        }
                    ],
                    StartTime=datetime.utcnow() - timedelta(hours=24),
                    EndTime=datetime.utcnow(),
                    Period=300,
                    Statistics=['Average', 'Sum']
                )
                
                if response['Datapoints']:
                    results[metric] = response['Datapoints'][-1]
                
            except Exception as e:
                print(f"Error getting metric {metric}: {e}")
        
        return results
    
    def setup_alarms(self):
        """Configurar alarmas para la cola"""
        
        alarms = [
            {
                'name': f'{self.queue_name}-HighMessageCount',
                'metric': 'ApproximateNumberOfMessagesVisible',
                'threshold': 1000,
                'comparison': 'GreaterThanThreshold',
                'description': 'Too many messages in queue'
            },
            {
                'name': f'{self.queue_name}-OldMessage',
                'metric': 'ApproximateAgeOfOldestMessage',
                'threshold': 3600,  # 1 hour
                'comparison': 'GreaterThanThreshold',
                'description': 'Messages too old in queue'
            },
            {
                'name': f'{self.queue_name}-EmptyReceives',
                'metric': 'NumberOfEmptyReceives',
                'threshold': 100,
                'comparison': 'GreaterThanThreshold',
                'description': 'Too many empty receives'
            }
        ]
        
        for alarm in alarms:
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm['name'],
                AlarmDescription=alarm['description'],
                MetricName=alarm['metric'],
                Namespace='AWS/SQS',
                Dimensions=[
                    {
                        'Name': 'QueueName',
                        'Value': self.queue_name
                    }
                ],
                Statistic='Average',
                Period=300,
                EvaluationPeriods=2,
                Threshold=alarm['threshold'],
                ComparisonOperator=alarm['comparison'],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:sqs-alerts'
                ]
            )
    
    def create_dashboard(self):
        """Crear dashboard para la cola"""
        
        dashboard = {
            "widgets": [
                {
                    "type": "metric",
                    "properties": {
                        "metrics": [
                            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", self.queue_name],
                            [".", "ApproximateNumberOfMessagesNotVisible", ".", self.queue_name]
                        ],
                        "view": "timeSeries",
                        "stacked": false,
                        "region": "us-east-1",
                        "title": f"Message Count - {self.queue_name}",
                        "period": 300
                    }
                },
                {
                    "type": "metric",
                    "properties": {
                        "metrics": [
                            ["AWS/SQS", "NumberOfMessagesReceived", "QueueName", self.queue_name],
                            [".", "NumberOfMessagesDeleted", ".", self.queue_name]
                        ],
                        "view": "timeSeries",
                        "stacked": false,
                        "region": "us-east-1",
                        "title": f"Message Operations - {self.queue_name}",
                        "period": 300
                    }
                }
            ]
        }
        
        self.cloudwatch.put_dashboard(
            DashboardName=f'SQS-{self.queue_name}',
            DashboardBody=json.dumps(dashboard)
        )
```

## Best Practices

### **1. Diseño de Colas**
- Elegir tipo de cola apropiado (Standard vs FIFO)
- Configurar DLQ para manejo de errores
- Ajustar visibility timeout según tiempo de procesamiento
- Usar wait time para reducir costos

### **2. Procesamiento de Mensajes**
- Validar mensajes antes de procesar
- Implementar retry con backoff exponencial
- Eliminar mensajes solo después de procesamiento exitoso
- Manejar errores de forma robusta

### **3. Security**
- Usar IAM roles con permisos mínimos
- Encriptar mensajes sensibles con KMS
- Usar VPC endpoints para tráfico privado
- Implementar logging y auditoría

### **4. Performance**
- Usar batch operations cuando sea posible
- Optimizar tamaño de mensajes
- Configurar apropiado message retention
- Monitorizar métricas clave

## Cost Management

### **Pricing Components**
- **Request charges**: $0.40 por millón de requests
- **Data transfer**: Standard AWS rates
- **KMS encryption**: $0.012 por 10,000 requests
- **VPC endpoints**: $0.01 por hora + data processing

### **Cost Optimization**
```python
def calculate_sqs_costs(monthly_requests, message_size_kb=256):
    """Calcular costos de SQS"""
    
    # Request charges
    request_cost = (monthly_requests / 1000000) * 0.40
    
    # Data transfer (asumiendo 50% in, 50% out)
    data_transfer_gb = (monthly_requests * message_size_kb * 1024) / (1024**3) * 0.5
    data_transfer_cost = data_transfer_gb * 0.09  # US East rate
    
    # KMS encryption
    encryption_requests = monthly_requests * 2  # encrypt + decrypt
    encryption_cost = (encryption_requests / 10000) * 0.012
    
    total_cost = request_cost + data_transfer_cost + encryption_cost
    
    return {
        'request_cost': request_cost,
        'data_transfer_cost': data_transfer_cost,
        'encryption_cost': encryption_cost,
        'total_monthly_cost': total_cost
    }
```

## Troubleshooting

### **Common Issues**
1. **Messages not being processed**
   - Check visibility timeout
   - Verify consumer permissions
   - Review DLQ configuration

2. **Messages appearing multiple times**
   - Check if delete operation is working
   - Verify visibility timeout settings
   - Review error handling

3. **High latency**
   - Check queue depth
   - Monitor consumer performance
   - Review message size

### **Debug Commands**
```bash
# Ver atributos de cola
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attribute-names All

# Ver métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=my-queue \
  --statistics Average \
  --period 300

# Purge cola (solo para testing)
aws sqs purge-queue \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
```

## Comparison con Otros Servicios

### **SQS vs SNS**
- **SQS**: Point-to-point, pull-based, persistent
- **SNS**: Publish-subscribe, push-based, fan-out

### **SQS vs Kinesis**
- **SQS**: Simple messaging, at-least-once delivery
- **Kinesis**: Streaming, real-time, ordered delivery

### **SQS vs RabbitMQ**
- **SQS**: Managed service, scalable, serverless
- **RabbitMQ**: Self-managed, complex routing, protocols

## Conclusion

AWS SQS es fundamental para arquitecturas desacopladas y sistemas distribuidos, proporcionando una solución robusta y escalable para mensajería asíncrona. Es ideal para desacoplar microservicios, procesar workloads en background, implementar patrones de fan-out y construir sistemas resilientes que puedan manejar picos de carga de manera eficiente.
