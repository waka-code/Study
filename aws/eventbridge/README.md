# AWS EventBridge

## Definición

AWS EventBridge es un servicio de event bus serverless que permite conectar aplicaciones usando datos de eventos de fuentes de eventos y responder a cambios en estado en las aplicaciones. Proporciona una manera centralizada de enrutar eventos entre diferentes servicios, aplicaciones y sistemas, facilitando la construcción de arquitecturas event-driven y desacopladas.

## Características Principales

### 1. **Event Bus Serverless**
- Event routing centralizado
- No requiere infraestructura
- Escalabilidad automática
- Pago por uso

### 2. **Event Sources**
- AWS services events
- Custom applications
- SaaS partners
- Third-party integrations

### 3. **Event Targets**
- Lambda functions
- SQS queues
- SNS topics
- Step Functions
- API destinations

### 4. **Event Rules**
- Pattern matching
- Content filtering
- Event transformation
- Retry policies

## Componentes Clave

### **Event Bus**
- Canal de eventos
- Default bus y custom buses
- Event routing
- Access control

### **Event**
- Datos del evento
- Event source
- Event type
- Event detail

### **Rule**
- Event pattern
- Event filtering
- Event transformation
- Target routing

### **Target**
- Destino del evento
- Event processing
- Retry configuration
- Dead-letter queue

## Tipos de Event Bus

### **Default Event Bus**
```bash
# Event bus por defecto para eventos de AWS
aws events describe-event-bus \
  --name default
```

### **Custom Event Bus**
```bash
# Crear event bus personalizado
aws events create-event-bus \
  --name my-custom-bus \
  --event-source-name my-application

# Listar event buses
aws events list-event-buses

# Describir event bus personalizado
aws events describe-event-bus \
  --name my-custom-bus
```

### **Partner Event Bus**
```bash
# Crear partner event bus
aws events create-event-bus \
  --name partner-bus \
  --event-source-name com.partner.application
```

## Event Rules y Patterns

### **Configuración de Rules**
```python
import boto3
import json
import time
from datetime import datetime

class EventBridgeManager:
    def __init__(self):
        self.events = boto3.client('events')
    
    def create_simple_rule(self, rule_name, event_pattern, targets=None):
        """Crear regla simple de eventos"""
        
        try:
            params = {
                'Name': rule_name,
                'EventPattern': json.dumps(event_pattern),
                'State': 'ENABLED'
            }
            
            if targets:
                params['Targets'] = targets
            
            response = self.events.put_rule(**params)
            
            return {
                'success': True,
                'rule_arn': response['RuleArn'],
                'rule_name': rule_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_s3_event_rule(self, rule_name, bucket_name, target_arn):
        """Crear regla para eventos S3"""
        
        event_pattern = {
            'source': ['aws.s3'],
            'detail-type': ['Object Created'],
            'detail': {
                'bucket': {'name': [bucket_name]}
            }
        }
        
        targets = [
            {
                'Id': 'S3EventTarget',
                'Arn': target_arn,
                'RetryPolicy': {
                    'MaximumRetryAttempts': 3,
                    'MaximumEventAgeInSeconds': 3600
                }
            }
        ]
        
        return self.create_simple_rule(rule_name, event_pattern, targets)
    
    def create_ec2_event_rule(self, rule_name, instance_state, target_arn):
        """Crear regla para eventos EC2"""
        
        event_pattern = {
            'source': ['aws.ec2'],
            'detail-type': ['EC2 Instance State-change Notification'],
            'detail': {
                'state': [instance_state]
            }
        }
        
        targets = [
            {
                'Id': 'EC2EventTarget',
                'Arn': target_arn
            }
        ]
        
        return self.create_simple_rule(rule_name, event_pattern, targets)
    
    def create_lambda_event_rule(self, rule_name, lambda_arn):
        """Crear regla para invocar Lambda"""
        
        event_pattern = {
            'source': ['my.application'],
            'detail-type': ['UserAction']
        }
        
        targets = [
            {
                'Id': 'LambdaTarget',
                'Arn': lambda_arn,
                'RetryPolicy': {
                    'MaximumRetryAttempts': 2
                },
                'DeadLetterConfig': {
                    'Arn': 'arn:aws:sqs:us-east-1:123456789012:eventbridge-dlq'
                }
            }
        ]
        
        return self.create_simple_rule(rule_name, event_pattern, targets)
    
    def create_api_destination_rule(self, rule_name, api_destination_arn, connection_arn):
        """Crear regla para API destination"""
        
        event_pattern = {
            'source': ['my.application'],
            'detail-type': ['ExternalNotification']
        }
        
        targets = [
            {
                'Id': 'APITarget',
                'Arn': api_destination_arn,
                'HttpParameters': {
                    'HeaderParameters': {
                        'Content-Type': 'application/json'
                    },
                    'PathParameterValues': ['/webhook']
                },
                'ConnectionArn': connection_arn,
                'RetryPolicy': {
                    'MaximumRetryAttempts': 3
                }
            }
        ]
        
        return self.create_simple_rule(rule_name, event_pattern, targets)
    
    def create_input_transformer_rule(self, rule_name, target_arn):
        """Crear regla con input transformer"""
        
        event_pattern = {
            'source': ['my.application'],
            'detail-type': ['OrderEvent']
        }
        
        targets = [
            {
                'Id': 'TransformedTarget',
                'Arn': target_arn,
                'InputTransformer': {
                    'InputPathsMap': {
                        'order_id': '$.detail.order_id',
                        'customer_id': '$.detail.customer_id',
                        'amount': '$.detail.amount'
                    },
                    'InputTemplate': '{ "order_id": <order_id>, "customer_id": <customer_id>, "total_amount": <amount>, "processed_at": "<aws.events.rule.name>" }'
                }
            }
        ]
        
        return self.create_simple_rule(rule_name, event_pattern, targets)
    
    def create_schedule_rule(self, rule_name, schedule_expression, target_arn):
        """Crear regla programada (cron)"""
        
        params = {
            'Name': rule_name,
            'ScheduleExpression': schedule_expression,
            'State': 'ENABLED',
            'Targets': [
                {
                    'Id': 'ScheduledTarget',
                    'Arn': target_arn
                }
            ]
        }
        
        try:
            response = self.events.put_rule(**params)
            
            return {
                'success': True,
                'rule_arn': response['RuleArn'],
                'schedule': schedule_expression
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_rate_rule(self, rule_name, rate_expression, target_arn):
        """Crear regla con rate expression"""
        
        params = {
            'Name': rule_name,
            'ScheduleExpression': rate_expression,
            'State': 'ENABLED',
            'Targets': [
                {
                    'Id': 'RateTarget',
                    'Arn': target_arn
                }
            ]
        }
        
        try:
            response = self.events.put_rule(**params)
            
            return {
                'success': True,
                'rule_arn': response['RuleArn'],
                'rate': rate_expression
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_rules(self, name_prefix=None, event_bus_name=None):
        """Listar reglas"""
        
        try:
            params = {}
            
            if name_prefix:
                params['NamePrefix'] = name_prefix
            
            if event_bus_name:
                params['EventBusName'] = event_bus_name
            
            response = self.events.list_rules(**params)
            
            rules = []
            for rule in response['Rules']:
                rule_info = {
                    'name': rule['Name'],
                    'arn': rule['Arn'],
                    'state': rule['State'],
                    'event_pattern': rule.get('EventPattern'),
                    'schedule_expression': rule.get('ScheduleExpression'),
                    'event_bus_name': rule.get('EventBusName')
                }
                rules.append(rule_info)
            
            return {
                'success': True,
                'rules': rules,
                'count': len(rules)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_rule(self, rule_name, event_bus_name=None):
        """Deshabilitar regla"""
        
        try:
            params = {'Name': rule_name}
            
            if event_bus_name:
                params['EventBusName'] = event_bus_name
            
            self.events.disable_rule(**params)
            
            return {
                'success': True,
                'rule_name': rule_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_rule(self, rule_name, event_bus_name=None):
        """Habilitar regla"""
        
        try:
            params = {'Name': rule_name}
            
            if event_bus_name:
                params['EventBusName'] = event_bus_name
            
            self.events.enable_rule(**params)
            
            return {
                'success': True,
                'rule_name': rule_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_rule(self, rule_name, event_bus_name=None, force=False):
        """Eliminar regla"""
        
        try:
            params = {'Name': rule_name, 'Force': force}
            
            if event_bus_name:
                params['EventBusName'] = event_bus_name
            
            self.events.delete_rule(**params)
            
            return {
                'success': True,
                'rule_name': rule_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Event Publishing

### **Custom Events**
```python
class EventPublisher:
    def __init__(self, event_bus_name='default'):
        self.events = boto3.client('events')
        self.event_bus_name = event_bus_name
    
    def publish_custom_event(self, source, detail_type, detail, resources=None):
        """Publicar evento personalizado"""
        
        try:
            params = {
                'Source': source,
                'DetailType': detail_type,
                'Detail': json.dumps(detail),
                'EventBusName': self.event_bus_name
            }
            
            if resources:
                params['Resources'] = resources
            
            response = self.events.put_events(Entries=[params])
            
            return {
                'success': True,
                'event_id': response['Entries'][0]['EventId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def publish_user_event(self, user_id, event_type, event_data):
        """Publicar evento de usuario"""
        
        detail = {
            'user_id': user_id,
            'event_type': event_type,
            'event_data': event_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.publish_custom_event(
            'my.application',
            'UserEvent',
            detail,
            [f"arn:aws:iam::123456789012:user/{user_id}"]
        )
    
    def publish_order_event(self, order_id, event_type, order_data):
        """Publicar evento de orden"""
        
        detail = {
            'order_id': order_id,
            'event_type': event_type,
            'order_data': order_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.publish_custom_event(
            'my.application',
            'OrderEvent',
            detail,
            [f"arn:aws:orders:us-east-1:123456789012:order/{order_id}"]
        )
    
    def publish_system_event(self, system_name, event_type, system_data):
        """Publicar evento de sistema"""
        
        detail = {
            'system_name': system_name,
            'event_type': event_type,
            'system_data': system_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.publish_custom_event(
            'my.application',
            'SystemEvent',
            detail,
            [f"arn:aws:systems:us-east-1:123456789012:system/{system_name}"]
        )
    
    def publish_batch_events(self, events):
        """Publicar múltiples eventos"""
        
        try:
            entries = []
            
            for event in events:
                entry = {
                    'Source': event['source'],
                    'DetailType': event['detail_type'],
                    'Detail': json.dumps(event['detail']),
                    'EventBusName': self.event_bus_name
                }
                
                if event.get('resources'):
                    entry['Resources'] = event['resources']
                
                entries.append(entry)
            
            response = self.events.put_events(Entries=entries)
            
            return {
                'success': True,
                'events_sent': len(response['Entries']),
                'failed_entries': len([e for e in response['Entries'] if 'ErrorCode' in e])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## API Destinations

### **Configuración de API Destinations**
```python
class APIDestinationManager:
    def __init__(self):
        self.events = boto3.client('events')
    
    def create_connection(self, connection_name, auth_config, base_url):
        """Crear conexión para API destination"""
        
        try:
            params = {
                'Name': connection_name,
                'AuthorizationType': auth_config['type'],
                'DestinationConfiguration': {
                    'HttpParameters': {
                        'EndpointUrl': base_url
                    }
                }
            }
            
            # Configurar autorización según tipo
            if auth_config['type'] == 'API_KEY':
                params['AuthParameters'] = {
                    'ApiKeyAuthParameters': {
                        'ApiKeyName': auth_config['api_key_name'],
                        'ApiKeyValue': auth_config['api_key_value']
                    }
                }
            elif auth_config['type'] == 'BASIC':
                params['AuthParameters'] = {
                    'BasicAuthParameters': {
                        'Username': auth_config['username'],
                        'Password': auth_config['password']
                    }
                }
            elif auth_config['type'] == 'OAUTH_CLIENT_CREDENTIALS':
                params['AuthParameters'] = {
                    'OAuthParameters': {
                        'ClientParameters': {
                            'ClientId': auth_config['client_id'],
                            'ClientSecret': auth_config['client_secret']
                        },
                        'AuthorizationEndpointParameters': {
                            'EndpointUrl': auth_config['auth_endpoint'],
                            'HttpMethod': 'POST'
                        },
                        'OAuthHttpParameters': {
                            'BodyParameters': {
                                'grant_type': 'client_credentials'
                            }
                        }
                    }
                }
            
            response = self.events.create_connection(**params)
            
            return {
                'success': True,
                'connection_arn': response['ConnectionArn'],
                'connection_name': connection_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_api_destination(self, destination_name, connection_arn, endpoint_url, http_method='POST'):
        """Crear API destination"""
        
        try:
            params = {
                'Name': destination_name,
                'ConnectionArn': connection_arn,
                'HttpParameters': {
                    'EndpointUrl': endpoint_url,
                    'HttpMethod': http_method
                }
            }
            
            response = self.events.create_api_destination(**params)
            
            return {
                'success': True,
                'destination_arn': response['ApiDestinationArn'],
                'destination_name': destination_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_api_destination(self, destination_name, updates):
        """Actualizar API destination"""
        
        try:
            params = {'Name': destination_name}
            
            if updates.get('connection_arn'):
                params['ConnectionArn'] = updates['connection_arn']
            
            if updates.get('http_parameters'):
                params['HttpParameters'] = updates['http_parameters']
            
            self.events.update_api_destination(**params)
            
            return {
                'success': True,
                'destination_name': destination_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_connections(self):
        """Listar conexiones"""
        
        try:
            response = self.events.list_connections()
            
            connections = []
            for connection in response['Connections']:
                connection_info = {
                    'name': connection['Name'],
                    'arn': connection['ConnectionArn'],
                    'authorization_type': connection['AuthorizationType'],
                    'state': connection['ConnectionState'],
                    'creation_time': connection['CreationTime']
                }
                connections.append(connection_info)
            
            return {
                'success': True,
                'connections': connections,
                'count': len(connections)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_api_destinations(self):
        """Listar API destinations"""
        
        try:
            response = self.events.list_api_destinations()
            
            destinations = []
            for destination in response['ApiDestinations']:
                dest_info = {
                    'name': destination['Name'],
                    'arn': destination['ApiDestinationArn'],
                    'connection_arn': destination['ConnectionArn'],
                    'http_method': destination['HttpParameters']['HttpMethod'],
                    'endpoint_url': destination['HttpParameters']['EndpointUrl'],
                    'state': destination['ApiDestinationState'],
                    'creation_time': destination['CreationTime']
                }
                destinations.append(dest_info)
            
            return {
                'success': True,
                'destinations': destinations,
                'count': len(destinations)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Event Patterns

### **Pattern Matching Avanzado**
```python
class EventPatternBuilder:
    def __init__(self):
        pass
    
    def build_s3_pattern(self, bucket_name=None, object_prefix=None, event_types=None):
        """Construir pattern para eventos S3"""
        
        pattern = {
            'source': ['aws.s3']
        }
        
        if event_types:
            pattern['detail-type'] = event_types
        else:
            pattern['detail-type'] = ['Object Created', 'Object Removed']
        
        detail = {}
        
        if bucket_name:
            detail['bucket'] = {'name': [bucket_name]}
        
        if object_prefix:
            detail['object'] = {'key': [{'prefix': object_prefix}]}
        
        if detail:
            pattern['detail'] = detail
        
        return pattern
    
    def build_ec2_pattern(self, instance_ids=None, states=None, event_types=None):
        """Construir pattern para eventos EC2"""
        
        pattern = {
            'source': ['aws.ec2']
        }
        
        if event_types:
            pattern['detail-type'] = event_types
        else:
            pattern['detail-type'] = ['EC2 Instance State-change Notification']
        
        detail = {}
        
        if instance_ids:
            detail['instance-id'] = instance_ids
        
        if states:
            detail['state'] = states
        
        if detail:
            pattern['detail'] = detail
        
        return pattern
    
    def build_lambda_pattern(self, function_names=None, event_types=None):
        """Construir pattern para eventos Lambda"""
        
        pattern = {
            'source': ['aws.lambda']
        }
        
        if event_types:
            pattern['detail-type'] = event_types
        else:
            pattern['detail-type'] = ['Lambda Function Invocation Result']
        
        detail = {}
        
        if function_names:
            detail['function-name'] = function_names
        
        if detail:
            pattern['detail'] = detail
        
        return pattern
    
    def build_rds_pattern(self, db_instance_identifiers=None, event_types=None):
        """Construir pattern para eventos RDS"""
        
        pattern = {
            'source': ['aws.rds']
        }
        
        if event_types:
            pattern['detail-type'] = event_types
        else:
            pattern['detail-type'] = ['RDS DB Event']
        
        detail = {}
        
        if db_instance_identifiers:
            detail['SourceIdentifier'] = db_instance_identifiers
        
        if detail:
            pattern['detail'] = detail
        
        return pattern
    
    def build_custom_pattern(self, source, detail_type, detail_filters=None):
        """Construir pattern personalizado"""
        
        pattern = {
            'source': [source],
            'detail-type': [detail_type]
        }
        
        if detail_filters:
            pattern['detail'] = detail_filters
        
        return pattern
    
    def build_multi_source_pattern(self, sources, detail_types=None):
        """Construir pattern para múltiples fuentes"""
        
        pattern = {
            'source': sources
        }
        
        if detail_types:
            pattern['detail-type'] = detail_types
        
        return pattern
    
    def build_time_pattern(self, start_time=None, end_time=None):
        """Construir pattern basado en tiempo"""
        
        pattern = {}
        
        if start_time:
            pattern['time'] = {
                'timestamp': [{
                    'begins_with': start_time
                }]
            }
        
        return pattern
    
    def build_content_filter_pattern(self, field, operator, value):
        """Construir pattern con filtro de contenido"""
        
        if operator == 'equals':
            return {field: [value]}
        elif operator == 'prefix':
            return {field: [{'prefix': value}]}
        elif operator == 'anything-but':
            return {field: [{'anything-but': value}]}
        elif operator == 'numeric':
            return {field: [{operator: value}]}
        else:
            return {field: [value]}
```

## Casos de Uso

### **1. Sistema de Notificaciones de Eventos**
```python
class EventNotificationSystem:
    def __init__(self):
        self.event_manager = EventBridgeManager()
        self.event_publisher = EventPublisher('notification-bus')
    
    def setup_notification_system(self):
        """Configurar sistema de notificaciones"""
        
        # Crear event bus para notificaciones
        self.event_manager.events.create_event_bus(
            Name='notification-bus',
            EventSourceName='notification-service'
        )
        
        # Regla para eventos de usuario
        user_rule = self.event_manager.create_simple_rule(
            'UserNotificationRule',
            {
                'source': ['my.application'],
                'detail-type': ['UserEvent'],
                'detail': {
                    'event_type': ['user_registered', 'user_updated', 'password_changed']
                }
            },
            [
                {
                    'Id': 'NotificationLambda',
                    'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:notification-processor'
                }
            ]
        )
        
        # Regla para eventos de orden
        order_rule = self.event_manager.create_simple_rule(
            'OrderNotificationRule',
            {
                'source': ['my.application'],
                'detail-type': ['OrderEvent'],
                'detail': {
                    'event_type': ['order_created', 'order_shipped', 'order_delivered']
                }
            },
            [
                {
                    'Id': 'OrderNotificationLambda',
                    'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:order-notification-processor'
                }
            ]
        )
        
        return {
            'user_rule': user_rule,
            'order_rule': order_rule
        }
    
    def publish_user_notification(self, user_id, event_type, notification_data):
        """Publicar notificación de usuario"""
        
        detail = {
            'user_id': user_id,
            'event_type': event_type,
            'notification_data': notification_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.event_publisher.publish_custom_event(
            'my.application',
            'UserEvent',
            detail
        )
    
    def publish_order_notification(self, order_id, event_type, order_data):
        """Publicar notificación de orden"""
        
        detail = {
            'order_id': order_id,
            'event_type': event_type,
            'order_data': order_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.event_publisher.publish_custom_event(
            'my.application',
            'OrderEvent',
            detail
        )
```

### **2. Pipeline de Procesamiento de Datos**
```python
class DataProcessingPipeline:
    def __init__(self):
        self.event_manager = EventBridgeManager()
        self.event_publisher = EventPublisher('data-processing-bus')
    
    def setup_pipeline(self):
        """Configurar pipeline de procesamiento"""
        
        # Crear event bus para procesamiento
        self.event_manager.events.create_event_bus(
            Name='data-processing-bus',
            EventSourceName='data-processor'
        )
        
        # Regla para archivos S3
        s3_rule = self.event_manager.create_s3_event_rule(
            'S3FileProcessingRule',
            'my-data-bucket',
            'arn:aws:lambda:us-east-1:123456789012:function:file-processor'
        )
        
        # Regla para archivos CSV específicos
        csv_rule = self.event_manager.create_simple_rule(
            'CSVProcessingRule',
            {
                'source': ['aws.s3'],
                'detail-type': ['Object Created'],
                'detail': {
                    'bucket': {'name': ['my-data-bucket']},
                    'object': {'key': [{'suffix': '.csv'}]}
                }
            },
            [
                {
                    'Id': 'CSVProcessor',
                    'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:csv-processor'
                }
            ]
        )
        
        # Regla para archivos JSON específicos
        json_rule = self.event_manager.create_simple_rule(
            'JSONProcessingRule',
            {
                'source': ['aws.s3'],
                'detail-type': ['Object Created'],
                'detail': {
                    'bucket': {'name': ['my-data-bucket']},
                    'object': {'key': [{'suffix': '.json'}]}
                }
            },
            [
                {
                    'Id': 'JSONProcessor',
                    'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:json-processor'
                }
            ]
        )
        
        return {
            's3_rule': s3_rule,
            'csv_rule': csv_rule,
            'json_rule': json_rule
        }
    
    def publish_data_event(self, data_source, event_type, data_info):
        """Publicar evento de datos"""
        
        detail = {
            'data_source': data_source,
            'event_type': event_type,
            'data_info': data_info,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.event_publisher.publish_custom_event(
            'data.processor',
            'DataEvent',
            detail
        )
```

### **3. Sistema de Automatización de Infraestructura**
```python
class InfrastructureAutomation:
    def __init__(self):
        self.event_manager = EventBridgeManager()
        self.event_publisher = EventPublisher('infrastructure-bus')
    
    def setup_automation(self):
        """Configurar automatización de infraestructura"""
        
        # Crear event bus para infraestructura
        self.event_manager.events.create_event_bus(
            Name='infrastructure-bus',
            EventSourceName='infrastructure-automation'
        )
        
        # Regla para instancias EC2 que se detienen
        ec2_stop_rule = self.event_manager.create_ec2_event_rule(
            'EC2StoppedRule',
            'stopping',
            'arn:aws:lambda:us-east-1:123456789012:function:ec2-stopped-handler'
        )
        
        # Regla para instancias EC2 que fallan
        ec2_fail_rule = self.event_manager.create_simple_rule(
            'EC2FailureRule',
            {
                'source': ['aws.ec2'],
                'detail-type': ['EC2 Instance State-change Notification'],
                'detail': {
                    'state': ['running']
                }
            },
            [
                {
                    'Id': 'EC2FailureHandler',
                    'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:ec2-failure-handler'
                }
            ]
        )
        
        # Regla programada para backup diario
        backup_rule = self.event_manager.create_schedule_rule(
            'DailyBackupRule',
            'cron(0 2 * * ? *)',  # Todos los días a las 2 AM
            'arn:aws:lambda:us-east-1:123456789012:function:daily-backup'
        )
        
        return {
            'ec2_stop_rule': ec2_stop_rule,
            'ec2_fail_rule': ec2_fail_rule,
            'backup_rule': backup_rule
        }
    
    def publish_infrastructure_event(self, resource_type, resource_id, event_type, event_data):
        """Publicar evento de infraestructura"""
        
        detail = {
            'resource_type': resource_type,
            'resource_id': resource_id,
            'event_type': event_type,
            'event_data': event_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.event_publisher.publish_custom_event(
            'infrastructure.automation',
            'InfrastructureEvent',
            detail,
            [f"arn:aws:ec2:us-east-1:123456789012:{resource_type}/{resource_id}"]
        )
```

## Security y Access Control

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "events:PutRule",
        "events:PutTargets",
        "events:PutEvents",
        "events:RemoveTargets",
        "events:DeleteRule",
        "events:EnableRule",
        "events:DisableRule"
      ],
      "Resource": "arn:aws:events:*:*:rule/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:CreateEventBus",
        "events:DeleteEventBus",
        "events:DescribeEventBus",
        "events:ListEventBuses"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:CreateConnection",
        "events:UpdateConnection",
        "events:DeleteConnection",
        "events:DescribeConnection",
        "events:ListConnections"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:CreateApiDestination",
        "events:UpdateApiDestination",
        "events:DeleteApiDestination",
        "events:DescribeApiDestination",
        "events:ListApiDestinations"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Event Bus Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/event-publisher"
      },
      "Action": "events:PutEvents",
      "Resource": "arn:aws:events:us-east-1:123456789012:event-bus/my-custom-bus"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::987654321098:root"
      },
      "Action": "events:PutEvents",
      "Resource": "arn:aws:events:us-east-1:123456789012:event-bus/my-custom-bus"
    }
  ]
}
```

## Monitoring y Métricas

### **CloudWatch Metrics**
```python
class EventBridgeMonitoring:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
    
    def get_eventbridge_metrics(self, rule_name=None):
        """Obtener métricas de EventBridge"""
        
        metrics = [
            'Invocations',
            'FailedInvocations',
            'ThrottledRules',
            'TriggeredRules'
        ]
        
        results = {}
        
        for metric in metrics:
            try:
                params = {
                    'Namespace': 'AWS/Events',
                    'MetricName': metric,
                    'StartTime': datetime.utcnow() - timedelta(hours=24),
                    'EndTime': datetime.utcnow(),
                    'Period': 300,
                    'Statistics': ['Sum', 'Average']
                }
                
                if rule_name:
                    params['Dimensions'] = [
                        {
                            'Name': 'RuleName',
                            'Value': rule_name
                        }
                    ]
                
                response = self.cloudwatch.get_metric_statistics(**params)
                
                if response['Datapoints']:
                    results[metric] = response['Datapoints'][-1]
                
            except Exception as e:
                print(f"Error getting metric {metric}: {e}")
        
        return results
    
    def setup_eventbridge_alarms(self, rule_name):
        """Configurar alarmas para EventBridge"""
        
        alarms = [
            {
                'name': f'EventBridge-HighFailures-{rule_name}',
                'metric': 'FailedInvocations',
                'threshold': 5,
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': f'EventBridge-HighThrottling-{rule_name}',
                'metric': 'ThrottledRules',
                'threshold': 1,
                'comparison': 'GreaterThanThreshold'
            }
        ]
        
        for alarm in alarms:
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm['name'],
                AlarmDescription=f'Alarm for EventBridge rule {rule_name}',
                MetricName=alarm['metric'],
                Namespace='AWS/Events',
                Dimensions=[
                    {
                        'Name': 'RuleName',
                        'Value': rule_name
                    }
                ],
                Statistic='Sum',
                Period=300,
                EvaluationPeriods=2,
                Threshold=alarm['threshold'],
                ComparisonOperator=alarm['comparison'],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:eventbridge-alerts'
                ]
            )
```

## Best Practices

### **1. Diseño de Eventos**
- Usar eventos inmutables
- Incluir timestamp en todos los eventos
- Usar nombres consistentes para source y detail-type
- Evitar información sensible en eventos

### **2. Event Patterns**
- Ser específico en los patterns
- Usar filtering para reducir tráfico
- Validar patterns antes de deployar
- Documentar patterns complejos

### **3. Targets**
- Configurar dead-letter queues
- Implementar retry policies apropiadas
- Usar input transformers cuando sea necesario
- Monitorear target failures

### **4. Security**
- Usar event buses específicos por aplicación
- Implementar políticas de acceso restrictivas
- Encriptar datos sensibles
- Auditar event flows

## Cost Management

### **Pricing Components**
- **Events**: $1.00 por millón de eventos publicados
- **Rules**: $1.00 por regla por mes
- **API Destinations**: $0.50 por destino por mes + $0.20 por 1000 invocaciones
- **Connections**: $0.50 por conexión por mes

### **Cost Optimization**
```python
def calculate_eventbridge_costs(events_per_month, rules_count, api_destinations, connections):
    """Calcular costos de EventBridge"""
    
    # Events cost
    events_cost = (events_per_month / 1000000) * 1.00
    
    # Rules cost
    rules_cost = rules_count * 1.00
    
    # API destinations cost
    api_destinations_cost = api_destinations * 0.50
    
    # Connections cost
    connections_cost = connections * 0.50
    
    # API destination invocations (asumiendo 10000 invocaciones)
    api_invocations_cost = (10000 / 1000) * 0.20
    
    total_cost = events_cost + rules_cost + api_destinations_cost + connections_cost + api_invocations_cost
    
    return {
        'events_cost': events_cost,
        'rules_cost': rules_cost,
        'api_destinations_cost': api_destinations_cost,
        'connections_cost': connections_cost,
        'api_invocations_cost': api_invocations_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS EventBridge es fundamental para construir arquitecturas event-driven en AWS, proporcionando una solución serverless y escalable para conectar aplicaciones y servicios. Es ideal para implementar patrones de pub/sub, automatización de workflows, integración con servicios SaaS y construcción de sistemas desacoplados que responden a eventos de manera eficiente y confiable.
