# Amazon MQ (ActiveMQ)

## Definición

Amazon MQ es un servicio de mensajería gestionado para Apache ActiveMQ que facilita la configuración y operación de brokers de mensajería en la nube. Proporciona una infraestructura de mensajería compatible con estándares que permite desacoplar aplicaciones y sistemas mediante comunicación asíncrona basada en mensajes.

## Características Principales

### **Gestión Simplificada**
- Configuración automática de brokers
- Parches de seguridad automáticos
- Monitoreo integrado
- Backup y recuperación

### **Alta Disponibilidad**
- Configuración multi-AZ
- Failover automático
- Replicación de datos
- Tiempo de actividad del 99.9%

### **Seguridad**
- Cifrado en tránsito y en reposo
- Integración con IAM
- Control de acceso granular
- Auditoría de mensajes

### **Compatibilidad**
- Protocolos estándar (JMS, AMQP, MQTT, STOMP)
- Clientes existentes compatibles
- Migración simplificada
- Ecosistema ActiveMQ

## Componentes Clave

### **1. Broker**
- Instancia de ActiveMQ gestionada
- Configuración de almacenamiento
- Gestión de conexiones
- Monitoreo de rendimiento

### **2. Destinations**
- Queues (point-to-point)
- Topics (publish-subscribe)
- Virtual destinations
- Temporary destinations

### **3. Connections**
- Client connections
- Network connections
- Security credentials
- Connection pooling

## Configuración de Amazon MQ

### **Gestión de Brokers MQ**
```python
import boto3
import json
from datetime import datetime, timedelta

class AmazonMQManager:
    def __init__(self, region='us-east-1'):
        self.mq = boto3.client('mq', region_name=region)
        self.region = region
    
    def create_broker(self, broker_name, engine_type='ACTIVEMQ', engine_version='5.15.14',
                     deployment_mode='SINGLE_INSTANCE', subnet_ids=None, security_groups=None,
                     auto_minor_version_upgrade=True, publicly_accessible=False,
                     maintenance_window_start_time=None, logs=None, encryption_options=None):
        """Crear broker de Amazon MQ"""
        
        try:
            broker_params = {
                'AutoMinorVersionUpgrade': auto_minor_version_upgrade,
                'BrokerName': broker_name,
                'DeploymentMode': deployment_mode,
                'EngineType': engine_type,
                'EngineVersion': engine_version,
                'HostInstanceType': 'mq.t3.micro',
                'PubliclyAccessible': publicly_accessible,
                'StorageType': 'ebs',
                'Users': [
                    {
                        'Username': 'admin',
                        'Password': 'YourSecurePassword123!',
                        'ConsoleAccess': True,
                        'Tags': [
                            {'Key': 'Role', 'Value': 'administrator'}
                        ]
                    }
                ],
                'Tags': [
                    {'Key': 'Name', 'Value': broker_name},
                    {'Key': 'Environment', 'Value': 'production'}
                ]
            }
            
            # Agregar configuración de red si se especifica
            if subnet_ids and security_groups:
                broker_params['SubnetIds'] = subnet_ids
                broker_params['SecurityGroups'] = security_groups
            
            # Agregar ventana de mantenimiento si se especifica
            if maintenance_window_start_time:
                broker_params['MaintenanceWindowStartTime'] = maintenance_window_start_time
            
            # Agregar configuración de logs si se especifica
            if logs:
                broker_params['Logs'] = logs
            
            # Agregar opciones de cifrado si se especifica
            if encryption_options:
                broker_params['EncryptionOptions'] = encryption_options
            
            response = self.mq.create_broker(**broker_params)
            broker_id = response['BrokerId']
            
            # Esperar a que el broker esté disponible
            self.wait_for_broker_available(broker_id)
            
            return {
                'success': True,
                'broker_id': broker_id,
                'broker_name': broker_name,
                'engine_type': engine_type,
                'deployment_mode': deployment_mode
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_configuration(self, configuration_name, engine_type='ACTIVEMQ', 
                          engine_version='5.15.14', configuration_data=None):
        """Crear configuración de broker"""
        
        try:
            if not configuration_data:
                # Configuración por defecto para ActiveMQ
                configuration_data = """
<beans>
  <broker xmlns="http://activemq.apache.org/schema/core">
    <destinationPolicy>
      <policyMap>
        <policyEntries>
          <policyEntry queue=">" gcInactiveDestinations="true">
            <deadLetterStrategy>
              <individualDeadLetterStrategy queuePrefix="DLQ." useQueueForQueueMessages="true"/>
            </deadLetterStrategy>
          </policyEntry>
        </policyEntries>
      </policyMap>
    </destinationPolicy>
    
    <managementContext>
      <managementContext createConnector="false"/>
    </managementContext>
    
    <persistenceAdapter>
      <kahaDB directory="activemq-data"/>
    </persistenceAdapter>
    
    <systemUsage>
      <systemUsage>
        <memoryUsage>
          <memoryUsage limit="64 mb"/>
        </memoryUsage>
        <storeUsage>
          <storeUsage limit="100 gb"/>
        </storeUsage>
        <tempUsage>
          <tempUsage limit="50 gb"/>
        </tempUsage>
      </systemUsage>
    </systemUsage>
    
    <transportConnectors>
      <transportConnector name="openwire" uri="tcp://0.0.0.0:61616?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
      <transportConnector name="amqp" uri="amqp://0.0.0.0:5672?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
      <transportConnector name="stomp" uri="stomp://0.0.0.0:61613?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
      <transportConnector name="mqtt" uri="mqtt://0.0.0.0:1883?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
    </transportConnectors>
  </broker>
</beans>
                """.strip()
            
            response = self.mq.create_configuration(
                EngineType=engine_type,
                EngineVersion=engine_version,
                Name=configuration_name,
                Data=configuration_data,
                Tags=[
                    {'Key': 'Name', 'Value': configuration_name},
                    {'Key': 'Engine', 'Value': engine_type}
                ]
            )
            
            configuration_id = response['Id']
            
            return {
                'success': True,
                'configuration_id': configuration_id,
                'configuration_name': configuration_name,
                'engine_type': engine_type
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_broker(self, broker_id):
        """Obtener detalles del broker"""
        
        try:
            response = self.mq.describe_broker(BrokerId=broker_id)
            
            broker_info = {
                'broker_id': response['BrokerId'],
                'broker_name': response['BrokerName'],
                'broker_state': response['BrokerState'],
                'engine_type': response['EngineType'],
                'engine_version': response['EngineVersion'],
                'deployment_mode': response['DeploymentMode'],
                'host_instance_type': response['HostInstanceType'],
                'auto_minor_version_upgrade': response['AutoMinorVersionUpgrade'],
                'created_time': response['Created'],
                'publicly_accessible': response['PubliclyAccessible'],
                'subnet_ids': response.get('SubnetIds', []),
                'security_groups': response.get('SecurityGroups', []),
                'endpoints': response.get('Endpoints', []),
                'users': response.get('Users', []),
                'logs': response.get('Logs', {}),
                'encryption_options': response.get('EncryptionOptions', {}),
                'tags': response.get('Tags', [])
            }
            
            return {
                'success': True,
                'broker': broker_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_brokers(self, max_results=100):
        """Listar todos los brokers"""
        
        try:
            response = self.mq.list_brokers(MaxResults=max_results)
            
            brokers = []
            for broker in response['BrokerSummaries']:
                broker_info = {
                    'broker_id': broker['BrokerId'],
                    'broker_name': broker['BrokerName'],
                    'broker_state': broker['BrokerState'],
                    'engine_type': broker['EngineType'],
                    'engine_version': broker['EngineVersion'],
                    'deployment_mode': broker['DeploymentMode'],
                    'host_instance_type': broker['HostInstanceType'],
                    'created_time': broker['Created']
                }
                brokers.append(broker_info)
            
            return {
                'success': True,
                'brokers': brokers,
                'count': len(brokers)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_broker(self, broker_id, **kwargs):
        """Actualizar configuración del broker"""
        
        try:
            update_params = {'BrokerId': broker_id}
            
            # Agregar parámetros opcionales
            if 'auto_minor_version_upgrade' in kwargs:
                update_params['AutoMinorVersionUpgrade'] = kwargs['auto_minor_version_upgrade']
            
            if 'configuration' in kwargs:
                update_params['Configuration'] = kwargs['configuration']
            
            if 'engine_version' in kwargs:
                update_params['EngineVersion'] = kwargs['engine_version']
            
            if 'host_instance_type' in kwargs:
                update_params['HostInstanceType'] = kwargs['host_instance_type']
            
            if 'logs' in kwargs:
                update_params['Logs'] = kwargs['logs']
            
            if 'security_groups' in kwargs:
                update_params['SecurityGroups'] = kwargs['security_groups']
            
            response = self.mq.update_broker(**update_params)
            
            # Esperar a que se complete la actualización
            self.wait_for_broker_available(broker_id)
            
            return {
                'success': True,
                'broker_id': broker_id,
                'configuration_id': response.get('Configuration', {}).get('Id')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def reboot_broker(self, broker_id):
        **Reiniciar broker**
        
        try:
            self.mq.reboot_broker(BrokerId=broker_id)
            
            # Esperar a que el broker esté disponible
            self.wait_for_broker_available(broker_id)
            
            return {
                'success': True,
                'broker_id': broker_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_broker(self, broker_id):
        **Eliminar broker**
        
        try:
            self.mq.delete_broker(BrokerId=broker_id)
            
            return {
                'success': True,
                'broker_id': broker_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_user(self, broker_id, username, password, console_access=True, groups=None):
        **Crear usuario en broker**
        
        try:
            user_params = {
                'BrokerId': broker_id,
                'Username': username,
                'Password': password,
                'ConsoleAccess': console_access
            }
            
            if groups:
                user_params['Groups'] = groups
            
            self.mq.create_user(**user_params)
            
            return {
                'success': True,
                'broker_id': broker_id,
                'username': username
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_user(self, broker_id, username, **kwargs):
        **Actualizar usuario**
        
        try:
            update_params = {
                'BrokerId': broker_id,
                'Username': username
            }
            
            if 'console_access' in kwargs:
                update_params['ConsoleAccess'] = kwargs['console_access']
            
            if 'password' in kwargs:
                update_params['Password'] = kwargs['password']
            
            if 'groups' in kwargs:
                update_params['Groups'] = kwargs['groups']
            
            self.mq.update_user(**update_params)
            
            return {
                'success': True,
                'broker_id': broker_id,
                'username': username
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_user(self, broker_id, username):
        **Eliminar usuario**
        
        try:
            self.mq.delete_user(BrokerId=broker_id, Username=username)
            
            return {
                'success': True,
                'broker_id': broker_id,
                'username': username
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_configurations(self, max_results=100):
        **Listar configuraciones**
        
        try:
            response = self.mq.list_configurations(MaxResults=max_results)
            
            configurations = []
            for config in response['Configurations']:
                config_info = {
                    'id': config['Id'],
                    'name': config['Name'],
                    'engine_type': config['EngineType'],
                    'engine_version': config['EngineVersion'],
                    'created_time': config['Created']
                }
                configurations.append(config_info)
            
            return {
                'success': True,
                'configurations': configurations,
                'count': len(configurations)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_configuration(self, configuration_id):
        **Obtener detalles de configuración**
        
        try:
            response = self.mq.describe_configuration(ConfigurationId=configuration_id)
            
            config_info = {
                'id': response['Id'],
                'name': response['Name'],
                'engine_type': response['EngineType'],
                'engine_version': response['EngineVersion'],
                'created_time': response['Created'],
                'data': response['Data'],
                'tags': response.get('Tags', [])
            }
            
            return {
                'success': True,
                'configuration': config_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def wait_for_broker_available(self, broker_id, timeout=1800):
        **Esperar a que broker esté disponible**
        
        try:
            waiter = self.mq.get_waiter('broker_available')
            waiter.wait(
                BrokerIds=[broker_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def monitor_broker_health(self, broker_id):
        **Monitorear salud del broker**
        
        try:
            response = self.mq.describe_broker(BrokerId=broker_id)
            
            health_status = 'healthy'
            if response['BrokerState'] != 'RUNNING':
                health_status = 'unhealthy'
            elif response.get('PendingEngineVersion'):
                health_status = 'maintenance'
            
            return {
                'success': True,
                'broker_id': broker_id,
                'broker_state': response['BrokerState'],
                'health_status': health_status,
                'engine_version': response['EngineVersion'],
                'pending_engine_version': response.get('PendingEngineVersion')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Configuración Completa de Broker**
```python
# Ejemplo: Configurar broker completo
manager = AmazonMQManager('us-east-1')

# Configuración de logs
logs_config = {
    'Audit': True,
    'General': True
}

# Opciones de cifrado
encryption_config = {
    'UseAwsOwnedKey': True
}

# Ventana de mantenimiento
maintenance_window = {
    'DayOfWeek': 'SUNDAY',
    'TimeOfDay': '03:00',
    'TimeZone': 'UTC'
}

# Crear broker
broker_result = manager.create_broker(
    broker_name='production-mq-broker',
    deployment_mode='ACTIVE_STANDBY_MULTI_AZ',
    subnet_ids=['subnet-1234567890abcdef0', 'subnet-0987654321fedcba0'],
    security_groups=['sg-1234567890abcdef0'],
    auto_minor_version_upgrade=True,
    publicly_accessible=False,
    maintenance_window_start_time=maintenance_window,
    logs=logs_config,
    encryption_options=encryption_config
)

if broker_result['success']:
    broker_id = broker_result['broker_id']
    
    # Crear usuarios adicionales
    users = [
        {'username': 'app_user', 'password': 'AppPass123!', 'groups': ['application']},
        {'username': 'admin_user', 'password': 'AdminPass123!', 'console_access': True, 'groups': ['administrators']}
    ]
    
    for user in users:
        user_result = manager.create_user(
            broker_id=broker_id,
            username=user['username'],
            password=user['password'],
            console_access=user.get('console_access', False),
            groups=user.get('groups', [])
        )
        
        if user_result['success']:
            print(f"User {user['username']} created")
    
    print(f"Broker configured: {broker_id}")
```

### **2. Gestión de Configuraciones**
```python
# Ejemplo: Crear y aplicar configuración personalizada
config_result = manager.create_configuration(
    configuration_name='high-performance-config',
    engine_type='ACTIVEMQ',
    engine_version='5.15.14'
)

if config_result['success']:
    config_id = config_result['configuration_id']
    
    # Aplicar configuración a broker existente
    update_result = manager.update_broker(
        broker_id='b-1234567890abcdef0',
        configuration={
            'Id': config_id,
            'Revision': 1
        }
    )
    
    if update_result['success']:
        print("Configuration applied successfully")
```

### **3. Monitoreo y Mantenimiento**
```python
# Ejemplo: Monitorear salud y realizar mantenimiento
health_result = manager.monitor_broker_health('b-1234567890abcdef0')

if health_result['success']:
    print(f"Broker state: {health_result['broker_state']}")
    print(f"Health status: {health_result['health_status']}")
    
    # Si necesita mantenimiento
    if health_result['health_status'] == 'maintenance':
        reboot_result = manager.reboot_broker('b-1234567890abcdef0')
        if reboot_result['success']:
            print("Broker rebooted successfully")
```

## Configuración con AWS CLI

### **Crear Broker**
```bash
# Crear broker
aws mq create-broker \
  --broker-name production-mq-broker \
  --deployment-mode ACTIVE_STANDBY_MULTI_AZ \
  --engine-type ACTIVEMQ \
  --engine-version 5.15.14 \
  --host-instance-type mq.t3.micro \
  --subnet-ids subnet-1234567890abcdef0 subnet-0987654321fedcba0 \
  --security-groups sg-1234567890abcdef0 \
  --users Username=admin,Password=SecurePass123!,ConsoleAccess=true \
  --auto-minor-version-upgrade \
  --publicly-accessible false \
  --logs Audit=true,General=true \
  --encryption-options UseAwsOwnedKey=true \
  --maintenance-window-start-time DayOfWeek=SUNDAY,TimeOfDay=03:00,TimeZone=UTC

# Describir broker
aws mq describe-broker --broker-id b-1234567890abcdef0

# Listar brokers
aws mq list-brokers --max-results 100
```

### **Gestión de Usuarios**
```bash
# Crear usuario
aws mq create-user \
  --broker-id b-1234567890abcdef0 \
  --username app_user \
  --password AppPass123! \
  --console-access \
  --groups application

# Actualizar usuario
aws mq update-user \
  --broker-id b-1234567890abcdef0 \
  --username app_user \
  --password NewAppPass123!

# Eliminar usuario
aws mq delete-user \
  --broker-id b-1234567890abcdef0 \
  --username app_user
```

## Clientes y Protocolos

### **JMS Client (Java)**
```java
import javax.jms.*;
import org.apache.activemq.ActiveMQConnectionFactory;

public class MQProducer {
    public static void main(String[] args) throws JMSException {
        // Crear conexión
        ConnectionFactory factory = new ActiveMQConnectionFactory(
            "ssl://b-1234567890abcdef0-1.mq.us-east-1.amazonaws.com:61617"
        );
        
        Connection connection = factory.createConnection("admin", "password");
        connection.start();
        
        // Crear sesión
        Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
        
        // Crear cola
        Queue queue = session.createQueue("TEST.QUEUE");
        
        // Crear producer
        MessageProducer producer = session.createProducer(queue);
        
        // Enviar mensaje
        TextMessage message = session.createTextMessage("Hello from Amazon MQ!");
        producer.send(message);
        
        // Cerrar recursos
        connection.close();
    }
}
```

### **Python Client (STOMP)**
```python
import stomp

class MQClient:
    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.conn = None
    
    def connect(self):
        self.conn = stomp.Connection([(self.host, self.port)])
        self.conn.connect(self.username, self.password, wait=True)
    
    def send_message(self, destination, message):
        self.conn.send(body=message, destination=destination)
    
    def subscribe(self, destination, callback):
        self.conn.subscribe(destination=destination, id=1, ack='auto')
        self.conn.set_listener('', stomp.ConnectionListener())
    
    def disconnect(self):
        if self.conn:
            self.conn.disconnect()

# Uso
client = MQClient(
    host='b-1234567890abcdef0-1.mq.us-east-1.amazonaws.com',
    port=61614,
    username='admin',
    password='password'
)

client.connect()
client.send_message('/queue/TEST.QUEUE', 'Hello from Python!')
client.disconnect()
```

## Best Practices

### **1. Diseño**
- Usar deployment mode ACTIVE_STANDBY_MULTI_AZ para producción
- Planificar capacidad adecuada
- Implementar monitoreo completo
- Documentar arquitectura

### **2. Seguridad**
- Usar SSL/TLS para todas las conexiones
- Implementar IAM policies restrictivas
- Rotar credenciales regularmente
- Habilitar audit logs

### **3. Rendimiento**
- Optimizar tamaño de mensajes
- Configurar prefetch limits
- Usar connection pooling
- Monitorear métricas de rendimiento

### **4. Operaciones**
- Configurar ventanas de mantenimiento
- Implementar backup strategy
- Monitorear health checks
- Automatizar provisioning

## Costos

### **Componentes de Costo**
- **Broker Instance**: Por hora según tipo de instancia
- **Storage**: Por GB-month
- **Data Transfer**: Estándar de AWS
- **Logs**: Costos de CloudWatch

### **Precios Estimados**
- mq.t3.micro: ~$0.004 por hora
- mq.m5.large: ~$0.28 por hora
- Storage: ~$0.08 por GB-month

### **Optimización**
- Elegir tamaño adecuado de instancia
- Optimizar storage usage
- Usar data caching
- Monitorear consumo

## Troubleshooting

### **Problemas Comunes**
1. **Connection refused**: Verificar security groups y endpoints
2. **Authentication failed**: Validar credenciales
3. **Memory issues**: Ajustar heap size
4. **Slow performance**: Optimizar configuración

### **Comandos de Diagnóstico**
```bash
# Verificar estado del broker
aws mq describe-broker --broker-id b-1234567890abcdef0

# Verificar logs
aws logs describe-log-groups --log-group-name-prefix /aws/amazonmq

# Test de conexión
telnet b-1234567890abcdef0-1.mq.us-east-1.amazonaws.com 61617
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/AmazonMQ
- BrokerUptime
- CPUUtilization
- MemoryUsage
- DiskUsage
- NetworkIn/Out

### **Alarmas Recomendadas**
- Broker down
- High CPU usage
- High memory usage
- Disk space low
- Connection errors