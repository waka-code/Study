# Amazon MQ

## Definición

Amazon MQ es un servicio de broker de mensajes gestionado que facilita la configuración y operación de brokers de mensajes Apache ActiveMQ y RabbitMQ en AWS. Proporciona una solución compatible con estándares de la industria que permite migrar aplicaciones existentes a la nube sin necesidad de reescribir el código, ofreciendo alta disponibilidad, seguridad y operaciones simplificadas.

## Características Principales

### 1. **Managed Message Brokers**
- Apache ActiveMQ y RabbitMQ
- Operación simplificada
- Actualizaciones automáticas
- Patch management

### 2. **Standards Compatibility**
- JMS (Java Message Service)
- AMQP (Advanced Message Queuing Protocol)
- MQTT (Message Queuing Telemetry Transport)
- STOMP (Streaming Text Oriented Messaging Protocol)
- WebSocket

### 3. **High Availability**
- Multi-AZ deployment
- Automatic failover
- Disaster recovery
- Data replication

### 4. **Security**
- Encriptación en tránsito y en reposo
- IAM integration
- VPC isolation
- Access control

## Tipos de Brokers

### **Apache ActiveMQ**
```bash
# Crear broker ActiveMQ
aws mq create-broker \
  --broker-name my-activemq-broker \
  --engine-type ACTIVEMQ \
  --engine-version 5.17.6 \
  --host-instance-type mq.t3.micro \
  --deployment-mode ACTIVE_STANDBY_MULTI_AZ \
  --publicly-accessible \
  --users file://users.json \
  --security-groups sg-1234567890abcdef0 \
  --subnet-ids subnet-12345678 subnet-87654321

# users.json
{
  "username": "admin",
  "password": "SecurePassword123!"
}
```

### **RabbitMQ**
```bash
# Crear broker RabbitMQ
aws mq create-broker \
  --broker-name my-rabbitmq-broker \
  --engine-type RABBITMQ \
  --engine-version 3.10.20 \
  --host-instance-type mq.t3.micro \
  --deployment-mode CLUSTER_MULTI_AZ \
  --publicly-accessible \
  --users file://rabbitmq-users.json \
  --security-groups sg-1234567890abcdef0 \
  --subnet-ids subnet-12345678 subnet-87654321

# rabbitmq-users.json
{
  "username": "admin",
  "password": "SecurePassword123!"
}
```

### **Configuración Avanzada**
```bash
# Configuración con logging y maintenance
aws mq create-broker \
  --broker-name my-advanced-broker \
  --engine-type ACTIVEMQ \
  --engine-version 5.17.6 \
  --host-instance-type mq.m5.large \
  --deployment-mode ACTIVE_STANDBY_MULTI_AZ \
  --auto-minor-version-upgrade \
  --maintenance-window-start-time "02:00" \
  --maintenance-window-day-of-week "SUNDAY" \
  --logs {
    "Audit": "ENABLED",
    "General": "ENABLED"
  } \
  --encryption-options UseAwsOwnedKey=true
```

## Configuración y Management

### **Broker Management**
```python
import boto3
import json
import time
from datetime import datetime

class AmazonMQManager:
    def __init__(self):
        self.mq = boto3.client('mq')
    
    def create_activemq_broker(self, broker_config):
        """Crear broker ActiveMQ"""
        
        try:
            params = {
                'BrokerName': broker_config['name'],
                'EngineType': 'ACTIVEMQ',
                'EngineVersion': broker_config.get('engine_version', '5.17.6'),
                'HostInstanceType': broker_config.get('instance_type', 'mq.t3.micro'),
                'DeploymentMode': broker_config.get('deployment_mode', 'ACTIVE_STANDBY_MULTI_AZ'),
                'PubliclyAccessible': broker_config.get('publicly_accessible', True),
                'Users': [
                    {
                        'Username': broker_config['admin_username'],
                        'Password': broker_config['admin_password']
                    }
                ],
                'SecurityGroups': broker_config.get('security_groups', []),
                'SubnetIds': broker_config.get('subnet_ids', [])
            }
            
            # Configuración opcional
            if broker_config.get('auto_minor_version_upgrade'):
                params['AutoMinorVersionUpgrade'] = True
            
            if broker_config.get('maintenance_window'):
                params['MaintenanceWindowStartTime'] = broker_config['maintenance_window']['start_time']
                params['MaintenanceWindowDayOfWeek'] = broker_config['maintenance_window']['day']
            
            if broker_config.get('encryption'):
                params['EncryptionOptions'] = {
                    'UseAwsOwnedKey': broker_config['encryption'].get('use_aws_key', True)
                }
            
            response = self.mq.create_broker(**params)
            
            return {
                'success': True,
                'broker_id': response['BrokerId'],
                'arn': response['BrokerArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_rabbitmq_broker(self, broker_config):
        """Crear broker RabbitMQ"""
        
        try:
            params = {
                'BrokerName': broker_config['name'],
                'EngineType': 'RABBITMQ',
                'EngineVersion': broker_config.get('engine_version', '3.10.20'),
                'HostInstanceType': broker_config.get('instance_type', 'mq.t3.micro'),
                'DeploymentMode': broker_config.get('deployment_mode', 'CLUSTER_MULTI_AZ'),
                'PubliclyAccessible': broker_config.get('publicly_accessible', True),
                'Users': [
                    {
                        'Username': broker_config['admin_username'],
                        'Password': broker_config['admin_password']
                    }
                ],
                'SecurityGroups': broker_config.get('security_groups', []),
                'SubnetIds': broker_config.get('subnet_ids', [])
            }
            
            # Configuración específica de RabbitMQ
            if broker_config.get('rabbitmq_config'):
                params['RabbitmqLogCollector'] = broker_config['rabbitmq_config'].get('log_collector', 'DISABLED')
            
            response = self.mq.create_broker(**params)
            
            return {
                'success': True,
                'broker_id': response['BrokerId'],
                'arn': response['BrokerArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_broker_info(self, broker_id):
        """Obtener información del broker"""
        
        try:
            response = self.mq.describe_broker(BrokerId=broker_id)
            
            broker_info = response['BrokerInstances'][0]
            
            return {
                'broker_id': response['BrokerId'],
                'broker_name': response['BrokerName'],
                'engine_type': response['EngineType'],
                'engine_version': response['EngineVersion'],
                'status': response['BrokerState'],
                'host_instance_type': broker_info['HostInstanceType'],
                'deployment_mode': response['DeploymentMode'],
                'created_at': response['Created'],
                'endpoints': broker_info['Endpoints'],
                'ip_addresses': broker_info['IpAddresses']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_brokers(self):
        """Listar todos los brokers"""
        
        try:
            response = self.mq.list_brokers()
            
            brokers = []
            for broker in response['BrokerSummaries']:
                brokers.append({
                    'broker_id': broker['BrokerId'],
                    'broker_name': broker['BrokerName'],
                    'engine_type': broker['EngineType'],
                    'deployment_mode': broker['DeploymentMode'],
                    'state': broker['BrokerState'],
                    'created': broker['Created']
                })
            
            return {
                'success': True,
                'brokers': brokers
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_broker(self, broker_id):
        """Eliminar broker"""
        
        try:
            response = self.mq.delete_broker(BrokerId=broker_id)
            
            return {
                'success': True,
                'broker_id': response['BrokerId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def reboot_broker(self, broker_id):
        """Reiniciar broker"""
        
        try:
            response = self.mq.reboot_broker(BrokerId=broker_id)
            
            return {
                'success': True,
                'broker_id': response['BrokerId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_broker(self, broker_id, update_config):
        """Actualizar configuración del broker"""
        
        try:
            params = {'BrokerId': broker_id}
            
            if update_config.get('host_instance_type'):
                params['HostInstanceType'] = update_config['host_instance_type']
            
            if update_config.get('engine_version'):
                params['EngineVersion'] = update_config['engine_version']
            
            if update_config.get('auto_minor_version_upgrade') is not None:
                params['AutoMinorVersionUpgrade'] = update_config['auto_minor_version_upgrade']
            
            response = self.mq.update_broker(**params)
            
            return {
                'success': True,
                'broker_id': response['BrokerId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Clientes de Mensajes

### **JMS Client (ActiveMQ)**
```java
import javax.jms.*;
import org.apache.activemq.ActiveMQConnectionFactory;

public class ActiveMQProducer {
    private Connection connection;
    private Session session;
    private MessageProducer producer;
    
    public void initialize(String brokerUrl, String username, String password) throws JMSException {
        // Crear connection factory
        ActiveMQConnectionFactory connectionFactory = new ActiveMQConnectionFactory(brokerUrl);
        connectionFactory.setUserName(username);
        connectionFactory.setPassword(password);
        
        // Crear conexión
        connection = connectionFactory.createConnection();
        connection.start();
        
        // Crear sesión
        session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
        
        // Crear producer
        producer = session.createProducer(session.createQueue("MY.QUEUE"));
    }
    
    public void sendTextMessage(String messageText) throws JMSException {
        TextMessage message = session.createTextMessage(message);
        message.setStringProperty("MessageType", "Text");
        message.setJMSTimestamp(System.currentTimeMillis());
        
        producer.send(message);
        System.out.println("Message sent: " + messageText);
    }
    
    public void sendObjectMessage(Serializable object) throws JMSException {
        ObjectMessage message = session.createObjectMessage(object);
        message.setStringProperty("MessageType", "Object");
        message.setJMSTimestamp(System.currentTimeMillis());
        
        producer.send(message);
        System.out.println("Object message sent");
    }
    
    public void close() throws JMSException {
        if (producer != null) producer.close();
        if (session != null) session.close();
        if (connection != null) connection.close();
    }
}

public class ActiveMQConsumer {
    private Connection connection;
    private Session session;
    private MessageConsumer consumer;
    
    public void initialize(String brokerUrl, String username, String password) throws JMSException {
        ActiveMQConnectionFactory connectionFactory = new ActiveMQConnectionFactory(brokerUrl);
        connectionFactory.setUserName(username);
        connectionFactory.setPassword(password);
        
        connection = connectionFactory.createConnection();
        connection.start();
        
        session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
        consumer = session.createConsumer(session.createQueue("MY.QUEUE"));
    }
    
    public void startListening() {
        try {
            consumer.setMessageListener(new MessageListener() {
                @Override
                public void onMessage(Message message) {
                    try {
                        if (message instanceof TextMessage) {
                            TextMessage textMessage = (TextMessage) message;
                            System.out.println("Received text message: " + textMessage.getText());
                        } else if (message instanceof ObjectMessage) {
                            ObjectMessage objectMessage = (ObjectMessage) message;
                            Object obj = objectMessage.getObject();
                            System.out.println("Received object message: " + obj);
                        }
                    } catch (JMSException e) {
                        e.printStackTrace();
                    }
                }
            });
        } catch (JMSException e) {
            e.printStackTrace();
        }
    }
    
    public void close() throws JMSException {
        if (consumer != null) consumer.close();
        if (session != null) session.close();
        if (connection != null) connection.close();
    }
}
```

### **Python Client (STOMP)**
```python
import stomp
import time
import json
from datetime import datetime

class ActiveMQSTOMPClient:
    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.connection = None
    
    def connect(self):
        """Conectar al broker ActiveMQ"""
        
        try:
            self.connection = stomp.Connection([(self.host, self.port)])
            self.connection.connect(self.username, self.password, wait=True)
            
            return {
                'success': True,
                'message': 'Connected to ActiveMQ'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_message(self, destination, message, headers=None):
        """Enviar mensaje"""
        
        if not self.connection:
            return {
                'success': False,
                'error': 'Not connected'
            }
        
        try:
            message_headers = {
                'timestamp': str(int(time.time())),
                'content-type': 'application/json'
            }
            
            if headers:
                message_headers.update(headers)
            
            if isinstance(message, dict):
                message = json.dumps(message)
            
            self.connection.send(
                destination=destination,
                body=message,
                headers=message_headers
            )
            
            return {
                'success': True,
                'destination': destination
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def subscribe_queue(self, queue_name, callback):
        """Suscribirse a cola"""
        
        if not self.connection:
            return {
                'success': False,
                'error': 'Not connected'
            }
        
        try:
            def message_handler(frame, message):
                try:
                    headers = frame.headers
                    body = message.body
                    
                    # Parsear JSON si es posible
                    try:
                        parsed_body = json.loads(body)
                    except:
                        parsed_body = body
                    
                    callback({
                        'headers': headers,
                        'body': parsed_body,
                        'destination': frame.headers.get('destination', queue_name)
                    })
                    
                except Exception as e:
                    print(f"Error in message handler: {e}")
            
            self.connection.subscribe(queue_name, id=queue_name, ack='auto')
            self.connection.set_listener(queue_name, message_handler)
            
            return {
                'success': True,
                'queue': queue_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_listening(self):
        """Iniciar escucha de mensajes"""
        
        if not self.connection:
            return {
                'success': False,
                'error': 'Not connected'
            }
        
        try:
            self.connection.loop_forever()
            
        except KeyboardInterrupt:
            self.disconnect()
            
    def disconnect(self):
        """Desconectar del broker"""
        
        if self.connection:
            self.connection.disconnect()
            self.connection = None
```

### **Python Client (AMQP - RabbitMQ)**
```python
import pika
import json
import time
from datetime import datetime

class RabbitMQClient:
    def __init__(self, host, port, username, password, virtual_host='/'):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.virtual_host = virtual_host
        self.connection = None
        self.channel = None
    
    def connect(self):
        """Conectar al broker RabbitMQ"""
        
        try:
            credentials = pika.PlainCredentials(self.username, self.password)
            parameters = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=self.virtual_host,
                credentials=credentials
            )
            
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.channel = self.connection.channel()
            
            return {
                'success': True,
                'message': 'Connected to RabbitMQ'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def declare_queue(self, queue_name, durable=True):
        """Declarar cola"""
        
        if not self.channel:
            return {
                'success': False,
                'error': 'Not connected'
            }
        
        try:
            self.channel.queue_declare(
                queue=queue_name,
                durable=durable
            )
            
            return {
                'success': True,
                'queue': queue_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_message(self, queue_name, message, persistent=True):
        """Enviar mensaje"""
        
        if not self.channel:
            return {
                'success': False,
                'error': 'Not connected'
            }
        
        try:
            properties = pika.BasicProperties(
                delivery_mode=2 if persistent else 1,  # 2 for persistent
                timestamp=time.time(),
                content_type='application/json'
            )
            
            if isinstance(message, dict):
                message = json.dumps(message)
            
            self.channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=message,
                properties=properties
            )
            
            return {
                'success': True,
                'queue': queue_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def consume_messages(self, queue_name, callback, auto_ack=False):
        """Consumir mensajes"""
        
        if not self.channel:
            return {
                'success': False,
                'error': 'Not connected'
            }
        
        try:
            def message_handler(ch, method, properties, body):
                try:
                    # Parsear JSON si es posible
                    try:
                        parsed_body = json.loads(body)
                    except:
                        parsed_body = body.decode('utf-8')
                    
                    callback({
                        'body': parsed_body,
                        'properties': properties,
                        'method': method,
                        'channel': ch
                    })
                    
                    if not auto_ack:
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                        
                except Exception as e:
                    print(f"Error in message handler: {e}")
                    if not auto_ack:
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            
            self.channel.basic_qos(prefetch_count=1)
            self.channel.basic_consume(
                queue=queue_name,
                on_message_callback=message_handler,
                auto_ack=auto_ack
            )
            
            return {
                'success': True,
                'queue': queue_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_consuming(self):
        """Iniciar consumo de mensajes"""
        
        if not self.channel:
            return {
                'success': False,
                'error': 'Not connected'
            }
        
        try:
            self.channel.start_consuming()
            
        except KeyboardInterrupt:
            self.disconnect()
            
    def disconnect(self):
        """Desconectar del broker"""
        
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            self.connection = None
            self.channel = None
```

## Casos de Uso

### **1. Sistema de Cola de Mensajes Empresarial**
```python
class EnterpriseMessagingSystem:
    def __init__(self):
        self.mq_manager = AmazonMQManager()
        self.stomp_client = None
        self.rabbitmq_client = None
    
    def setup_messaging_infrastructure(self, config):
        """Configurar infraestructura de mensajería"""
        
        # Crear broker ActiveMQ para JMS
        activemq_config = {
            'name': 'enterprise-activemq',
            'engine_type': 'ACTIVEMQ',
            'instance_type': 'mq.m5.large',
            'deployment_mode': 'ACTIVE_STANDBY_MULTI_AZ',
            'admin_username': 'admin',
            'admin_password': 'SecurePassword123!',
            'security_groups': [config['security_group']],
            'subnet_ids': config['subnets'],
            'auto_minor_version_upgrade': True,
            'maintenance_window': {
                'start_time': '02:00',
                'day': 'SUNDAY'
            }
        }
        
        activemq_result = self.mq_manager.create_activemq_broker(activemq_config)
        
        # Crear broker RabbitMQ para AMQP
        rabbitmq_config = {
            'name': 'enterprise-rabbitmq',
            'engine_type': 'RABBITMQ',
            'instance_type': 'mq.m5.large',
            'deployment_mode': 'CLUSTER_MULTI_AZ',
            'admin_username': 'admin',
            'admin_password': 'SecurePassword123!',
            'security_groups': [config['security_group']],
            'subnet_ids': config['subnets']
        }
        
        rabbitmq_result = self.mq_manager.create_rabbitmq_broker(rabbitmq_config)
        
        return {
            'activemq': activemq_result,
            'rabbitmq': rabbitmq_result
        }
    
    def setup_clients(self, activemq_info, rabbitmq_info):
        """Configurar clientes de mensajería"""
        
        # Configurar cliente STOMP para ActiveMQ
        self.stomp_client = ActiveMQSTOMPClient(
            activemq_info['endpoints'][0].split(':')[0],
            61614,  # STOMP port
            activemq_info['admin_username'],
            'admin_password'
        )
        
        # Configurar cliente AMQP para RabbitMQ
        self.rabbitmq_client = RabbitMQClient(
            rabbitmq_info['endpoints'][0].split(':')[0],
            5672,  # AMQP port
            rabbitmq_info['admin_username'],
            'admin_password'
        )
        
        # Conectar ambos clientes
        activemq_connection = self.stomp_client.connect()
        rabbitmq_connection = self.rabbitmq_client.connect()
        
        return {
            'activemq_connection': activemq_connection,
            'rabbitmq_connection': rabbitmq_connection
        }
    
    def setup_enterprise_queues(self):
        """Configurar colas empresariales"""
        
        # Configurar colas en ActiveMQ
        activemq_queues = [
            'order.processing',
            'payment.processing',
            'notification.dispatch',
            'audit.logging'
        ]
        
        # Configurar colas en RabbitMQ
        rabbitmq_queues = [
            'order.validation',
            'inventory.update',
            'customer.communication',
            'analytics.events'
        ]
        
        return {
            'activemq_queues': activemq_queues,
            'rabbitmq_queues': rabbitmq_queues
        }
    
    def send_order_message(self, order_data, queue='order.processing'):
        """Enviar mensaje de orden"""
        
        message = {
            'order_id': order_data['order_id'],
            'customer_id': order_data['customer_id'],
            'items': order_data['items'],
            'total_amount': order_data['total_amount'],
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'order-service'
        }
        
        return self.stomp_client.send_message(queue, message)
    
    def send_payment_message(self, payment_data, queue='payment.processing'):
        """Enviar mensaje de pago"""
        
        message = {
            'payment_id': payment_data['payment_id'],
            'order_id': payment_data['order_id'],
            'amount': payment_data['amount'],
            'method': payment_data['method'],
            'status': payment_data['status'],
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'payment-service'
        }
        
        return self.stomp_client.send_message(queue, message)
    
    def send_validation_message(self, validation_data, queue='order.validation'):
        """Enviar mensaje de validación"""
        
        message = {
            'validation_id': str(uuid.uuid4()),
            'order_id': validation_data['order_id'],
            'validation_type': validation_data['validation_type'],
            'validation_data': validation_data['data'],
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'validation-service'
        }
        
        return self.rabbitmq_client.send_message(queue, message)
    
    def start_order_processing(self):
        """Iniciar procesamiento de órdenes"""
        
        def process_order_message(message_data):
            """Procesar mensaje de orden"""
            
            order_id = message_data['body']['order_id']
            customer_id = message_data['body']['customer_id']
            
            print(f"Processing order {order_id} for customer {customer_id}")
            
            # Simular procesamiento
            time.sleep(2)
            
            # Enviar mensaje de validación
            validation_message = {
                'order_id': order_id,
                'validation_type': 'inventory_check',
                'data': {
                    'items': message_data['body']['items']
                }
            }
            
            self.send_validation_message(validation_message)
            
            print(f"Order {order_id} processed and validation sent")
        
        # Suscribirse a cola de procesamiento de órdenes
        result = self.stomp_client.subscribe_queue('order.processing', process_order_message)
        
        if result['success']:
            print("Subscribed to order processing queue")
            self.stomp_client.start_listening()
    
    def start_validation_processing(self):
        """Iniciar procesamiento de validaciones"""
        
        def process_validation_message(message_data):
            """Procesar mensaje de validación"""
            
            validation_id = message_data['body']['validation_id']
            order_id = message_data['body']['order_id']
            validation_type = message_data['body']['validation_type']
            
            print(f"Processing validation {validation_id} for order {order_id}")
            
            # Simular validación
            time.sleep(1)
            
            if validation_type == 'inventory_check':
                # Simular check de inventario
                items = message_data['body']['validation_data']['items']
                available = all(item['quantity'] <= 100 for item in items)
                
                if available:
                    print(f"Inventory check passed for order {order_id}")
                else:
                    print(f"Inventory check failed for order {order_id}")
        
        # Declarar cola en RabbitMQ
        self.rabbitmq_client.declare_queue('order.validation')
        
        # Suscribirse a cola de validaciones
        def callback_wrapper(message_data):
            process_validation_message({
                'body': message_data['body'],
                'properties': message_data['properties'],
                'method': message_data['method'],
                'channel': message_data['channel']
            })
        
        result = self.rabbitmq_client.consume_messages('order.validation', callback_wrapper)
        
        if result['success']:
            print("Subscribed to validation queue")
            self.rabbitmq_client.start_consuming()
```

### **2. Sistema de Integración Legacy**
```python
class LegacyIntegrationSystem:
    def __init__(self):
        self.mq_manager = AmazonMQManager()
        self.stomp_client = None
    
    def setup_legacy_bridge(self, config):
        """Configurar puente con sistema legacy"""
        
        # Crear broker compatible con sistema legacy
        legacy_config = {
            'name': 'legacy-bridge-broker',
            'engine_type': 'ACTIVEMQ',
            'engine_version': '5.15.14',  # Versión compatible con legacy
            'instance_type': 'mq.t3.medium',
            'deployment_mode': 'SINGLE_INSTANCE',
            'admin_username': 'legacy-admin',
            'admin_password': config['legacy_password'],
            'security_groups': [config['security_group']],
            'subnet_ids': config['subnets']
        }
        
        broker_result = self.mq_manager.create_activemq_broker(legacy_config)
        
        if broker_result['success']:
            # Configurar cliente STOMP
            broker_info = self.mq_manager.get_broker_info(broker_result['broker_id'])
            
            self.stomp_client = ActiveMQSTOMPClient(
                broker_info['endpoints'][0].split(':')[0],
                61614,
                'legacy-admin',
                config['legacy_password']
            )
            
            connection_result = self.stomp_client.connect()
            
            return {
                'broker': broker_result,
                'connection': connection_result
            }
        
        return broker_result
    
    def setup_legacy_queues(self):
        """Configurar colas compatibles con sistema legacy"""
        
        legacy_queues = [
            'legacy.order.input',
            'legacy.order.output',
            'legacy.inventory.sync',
            'legacy.customer.update',
            'legacy.reporting.queue'
        ]
        
        return legacy_queues
    
    def send_legacy_order(self, legacy_order_data):
        """Enviar orden en formato legacy"""
        
        # Convertir a formato legacy
        legacy_message = {
            'ORDER_ID': legacy_order_data['order_id'],
            'CUSTOMER_ID': legacy_order_data['customer_id'],
            'ORDER_DATE': legacy_order_data['order_date'],
            'ORDER_ITEMS': [
                {
                    'SKU': item['sku'],
                    'QUANTITY': item['quantity'],
                    'PRICE': item['price']
                }
                for item in legacy_order_data['items']
            ],
            'TOTAL_AMOUNT': legacy_order_data['total_amount'],
            'STATUS': 'NEW',
            'TIMESTAMP': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        headers = {
            'source': 'modern-system',
            'target': 'legacy-system',
            'message_type': 'ORDER_CREATE'
        }
        
        return self.stomp_client.send_message('legacy.order.input', legacy_message, headers)
    
    def send_legacy_inventory_update(self, inventory_data):
        """Enviar actualización de inventario en formato legacy"""
        
        legacy_message = {
            'INVENTORY_ID': inventory_data['inventory_id'],
            'PRODUCT_SKU': inventory_data['sku'],
            'QUANTITY': inventory_data['quantity'],
            'LOCATION': inventory_data['location'],
            'LAST_UPDATED': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'UPDATE_TYPE': inventory_data['update_type']
        }
        
        headers = {
            'source': 'modern-system',
            'target': 'legacy-system',
            'message_type': 'INVENTORY_UPDATE'
        }
        
        return self.stomp_client.send_message('legacy.inventory.sync', legacy_message, headers)
    
    def start_legacy_bridge(self):
        """Iniciar puente con sistema legacy"""
        
        def process_legacy_output(message_data):
            """Procesar mensajes del sistema legacy"""
            
            headers = message_data['headers']
            body = message_data['body']
            
            if headers.get('source') == 'legacy-system':
                message_type = headers.get('message_type', 'UNKNOWN')
                
                if message_type == 'ORDER_RESPONSE':
                    self.process_legacy_order_response(body)
                elif message_type == 'INVENTORY_RESPONSE':
                    self.process_legacy_inventory_response(body)
                elif message_type == 'REPORTING_DATA':
                    self.process_legacy_reporting_data(body)
                
                print(f"Processed legacy message: {message_type}")
        
        # Suscribirse a cola de salida del sistema legacy
        result = self.stomp_client.subscribe_queue('legacy.order.output', process_legacy_output)
        
        if result['success']:
            print("Subscribed to legacy output queue")
            self.stomp_client.start_listening()
    
    def process_legacy_order_response(self, order_response):
        """Procesar respuesta de orden del sistema legacy"""
        
        order_id = order_response.get('ORDER_ID')
        status = order_response.get('STATUS')
        error_message = order_response.get('ERROR_MESSAGE')
        
        print(f"Legacy order response: {order_id} - {status}")
        
        if status == 'ERROR':
            print(f"Legacy system error: {error_message}")
            # Manejar error
        else:
            print(f"Order {order_id} processed successfully by legacy system")
    
    def process_legacy_inventory_response(self, inventory_response):
        """Procesar respuesta de inventario del sistema legacy"""
        
        sku = inventory_response.get('PRODUCT_SKU')
        quantity = inventory_response.get('QUANTITY')
        status = inventory_response.get('STATUS')
        
        print(f"Legacy inventory response: {sku} - {quantity} - {status}")
        
        # Actualizar inventario en sistema moderno
        if status == 'SUCCESS':
            print(f"Inventory updated for SKU {sku}")
        else:
            print(f"Failed to update inventory for SKU {sku}")
```

## Monitoring y Métricas

### **CloudWatch Metrics**
```python
class MQMonitoring:
    def __init__(self, broker_name):
        self.cloudwatch = boto3.client('cloudwatch')
        self.broker_name = broker_name
    
    def get_broker_metrics(self):
        """Obtener métricas del broker"""
        
        metrics = [
            'CpuUtilization',
            'MemoryUsage',
            'NetworkIn',
            'NetworkOut',
            'BrokerCount',
            'QueueCount',
            'TopicCount',
            'ConnectionCount',
            'ConsumerCount',
            'ProducerCount'
        ]
        
        results = {}
        
        for metric in metrics:
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/AmazonMQ',
                    MetricName=metric,
                    Dimensions=[
                        {
                            'Name': 'Broker',
                            'Value': self.broker_name
                        }
                    ],
                    StartTime=datetime.utcnow() - timedelta(hours=24),
                    EndTime=datetime.utcnow(),
                    Period=300,
                    Statistics=['Average', 'Sum', 'Maximum']
                )
                
                if response['Datapoints']:
                    results[metric] = response['Datapoints'][-1]
                
            except Exception as e:
                print(f"Error getting metric {metric}: {e}")
        
        return results
    
    def setup_broker_alarms(self):
        """Configurar alarmas para el broker"""
        
        alarms = [
            {
                'name': f'{self.broker_name}-HighCPU',
                'metric': 'CpuUtilization',
                'threshold': 80,
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': f'{self.broker_name}-HighMemory',
                'metric': 'MemoryUsage',
                'threshold': 90,
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': f'{self.broker_name}-LowConnections',
                'metric': 'ConnectionCount',
                'threshold': 1,
                'comparison': 'LessThanThreshold'
            }
        ]
        
        for alarm in alarms:
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm['name'],
                AlarmDescription=f'Alarm for {self.broker_name}',
                MetricName=alarm['metric'],
                Namespace='AWS/AmazonMQ',
                Dimensions=[
                    {
                        'Name': 'Broker',
                        'Value': self.broker_name
                    }
                ],
                Statistic='Average',
                Period=300,
                EvaluationPeriods=2,
                Threshold=alarm['threshold'],
                ComparisonOperator=alarm['comparison'],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:mq-alerts'
                ]
            )
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
        "mq:CreateBroker",
        "mq:ListBrokers",
        "mq:DescribeBroker"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "mq:UpdateBroker",
        "mq:DeleteBroker",
        "mq:RebootBroker",
        "mq:CreateUser",
        "mq:DeleteUser",
        "mq:UpdateUser"
      ],
      "Resource": "arn:aws:mq:us-east-1:123456789012:broker:*"
    }
  ]
}
```

### **Security Groups**
```bash
# Crear security group para MQ
aws ec2 create-security-group \
  --group-name mq-security-group \
  --description "Security group for Amazon MQ"

# Permitir tráfico AMQP (5671)
aws ec2 authorize-security-group-ingress \
  --group-id sg-1234567890abcdef0 \
  --protocol tcp \
  --port 5671 \
  --source-group sg-9876543210fedcba9

# Permitir tráfico OpenWire (61616)
aws ec2 authorize-security-group-ingress \
  --group-id sg-1234567890abcdef0 \
  --protocol tcp \
  --port 61616 \
  --source-group sg-9876543210fedcba9

# Permitir tráfico STOMP (61613)
aws ec2 authorize-security-group-ingress \
  --group-id sg-1234567890abcdef0 \
  --protocol tcp \
  --port 61613 \
  --source-group sg-9876543210fedcba9

# Permitir tráfico MQTT (8883)
aws ec2 authorize-security-group-ingress \
  --group-id sg-1234567890abcdef0 \
  --protocol tcp \
  --port 8883 \
  --source-group sg-9876543210fedcba9
```

## Best Practices

### **1. Diseño de Brokers**
- Elegir deployment mode apropiado
- Configurar alta disponibilidad
- Usar encriptación para datos sensibles
- Configurar maintenance windows

### **2. Manejo de Mensajes**
- Usar colas durables para mensajes críticos
- Implementar acknowledgment patterns
- Manejar errores gracefully
- Monitorizar queue depth

### **3. Security**
- Usar VPC isolation
- Configurar security groups restrictivos
- Rotar credenciales regularmente
- Implementar logging y auditoría

### **4. Performance**
- Monitorear métricas clave
- Optimizar tamaños de mensajes
- Configurar apropiado sizing
- Implementar connection pooling

## Cost Management

### **Pricing Components**
- **Broker Instance**: Por hora según tipo de instancia
- **Storage**: GB-month según tamaño de almacenamiento
- **Data Transfer**: Standard AWS rates
- **Additional Features**: Logs, monitoring

### **Cost Optimization**
```python
def calculate_mq_costs(instance_type, hours_per_month, storage_gb, data_transfer_gb):
    """Calcular costos de Amazon MQ"""
    
    # Instance costs (precios aproximados)
    instance_costs = {
        'mq.t3.micro': 0.004,
        'mq.t3.small': 0.008,
        'mq.t3.medium': 0.016,
        'mq.m5.large': 0.25,
        'mq.m5.xlarge': 0.50
    }
    
    instance_cost_per_hour = instance_costs.get(instance_type, 0.25)
    monthly_instance_cost = hours_per_month * instance_cost_per_hour
    
    # Storage cost
    storage_cost = storage_gb * 0.02  # $0.02 por GB-month
    
    # Data transfer cost
    data_transfer_cost = data_transfer_gb * 0.09  # US East rate
    
    total_cost = monthly_instance_cost + storage_cost + data_transfer_cost
    
    return {
        'instance_cost': monthly_instance_cost,
        'storage_cost': storage_cost,
        'data_transfer_cost': data_transfer_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

Amazon MQ es ideal para empresas que necesitan migrar aplicaciones existentes basadas en ActiveMQ o RabbitMQ a la nube sin necesidad de reescribir código. Proporciona compatibilidad con estándares de la industria, alta disponibilidad y operaciones simplificadas, siendo una solución perfecta para integración con sistemas legacy, aplicaciones empresariales y sistemas de mensajería que requieren compatibilidad con protocolos estándar.
