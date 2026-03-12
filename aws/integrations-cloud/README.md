# Integraciones del Cloud en AWS

## Definición

Las integraciones del cloud en AWS son el conjunto de servicios, herramientas y patrones que permiten conectar diferentes sistemas, aplicaciones y plataformas tanto dentro del ecosistema AWS como con sistemas externos. Estas integraciones facilitan el flujo de datos, automatización de procesos y orquestación de workloads en entornos híbridos y multi-nube.

## Tipos de Integraciones

### **1. Integraciones AWS Nativas**
- Servicios de mensajería
- APIs y Gateway
- Orquestación de workflows
- Integración de datos

### **2. Integraciones On-Premises**
- Conexión híbrida
- Sincronización de datos
- Migración gradual
- Extensión de capacidades

### **3. Integraciones Multi-Cloud**
- Cross-cloud connectivity
- Gestión unificada
- Portabilidad de workloads
- Optimización de costos

### **4. Integraciones con Terceros**
- SaaS applications
- Partner solutions
- Marketplace integrations
- Custom connectors

## Servicios AWS de Integración

### **1. AWS Step Functions**
```yaml
# Orquestación de workflows complejos
Definition:
  StartAt: ValidateInput
  States:
    ValidateInput:
      Type: Task
      Resource: arn:aws:lambda:us-east-1:123456789012:function:validate-input
      Next: ProcessData
    
    ProcessData:
      Type: Task
      Resource: arn:aws:lambda:us-east-1:123456789012:function:process-data
      Next: StoreResults
    
    StoreResults:
      Type: Task
      Resource: arn:aws:lambda:us-east-1:123456789012:function:store-results
      End: true

# Ejemplo de implementación
import boto3

def create_step_function():
    client = boto3.client('stepfunctions')
    
    definition = {
        "Comment": "Integration workflow",
        "StartAt": "ValidateInput",
        "States": {
            "ValidateInput": {
                "Type": "Task",
                "Resource": "arn:aws:states:::lambda:invoke",
                "Parameters": {
                    "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:validate-input",
                    "Payload.$": "$"
                },
                "Next": "ProcessData"
            },
            "ProcessData": {
                "Type": "Task",
                "Resource": "arn:aws:states:::lambda:invoke",
                "Parameters": {
                    "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:process-data",
                    "Payload.$": "$"
                },
                "Next": "StoreResults"
            },
            "StoreResults": {
                "Type": "Task",
                "Resource": "arn:aws:states:::lambda:invoke",
                "Parameters": {
                    "FunctionName": "arn:aws:lambda:us-east-1:123456789012:function:store-results",
                    "Payload.$": "$"
                },
                "End": true
            }
        }
    }
    
    response = client.create_state_machine(
        name='IntegrationWorkflow',
        definition=json.dumps(definition),
        roleArn='arn:aws:iam::123456789012:role/StepFunctionsExecutionRole'
    )
    
    return response
```

### **2. AWS API Gateway**
```yaml
# Configuración de API Gateway para integración
Resources:
  MyApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: IntegrationAPI
      Description: API for cloud integrations
  
  MyResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref MyApi
      ParentId: !GetAtt MyApi.RootResourceId
      PathPart: integration
  
  MyMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref MyApi
      ResourceId: !Ref MyResource
      HttpMethod: POST
      AuthorizationType: NONE
      Integration:
        Type: AWS
        IntegrationHttpMethod: POST
        Uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:integration-handler/invocations
        PassthroughBehavior: WHEN_NO_MATCH
        IntegrationResponses:
          - StatusCode: 200
      MethodResponses:
        - StatusCode: 200

# Lambda handler para integración
def lambda_handler(event, context):
    """Handler para integración con sistemas externos"""
    
    try:
        # Procesar request
        request_data = json.loads(event['body'])
        
        # Validar datos
        if not validate_request_data(request_data):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid request data'})
            }
        
        # Integrar con sistema externo
        integration_result = integrate_with_external_system(request_data)
        
        # Formatear response
        response = {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'data': integration_result,
                'timestamp': datetime.utcnow().isoformat()
            })
        }
        
        return response
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

### **3. AWS SQS y SNS**
```python
# Implementación de mensajería asíncrona
import boto3
import json

class CloudIntegrationMessaging:
    def __init__(self):
        self.sqs = boto3.client('sqs')
        self.sns = boto3.client('sns')
    
    def setup_queues(self):
        """Configurar colas para integración"""
        
        # Cola para procesamiento de integraciones
        queue_url = self.sqs.create_queue(
            QueueName='integration-queue',
            Attributes={
                'DelaySeconds': '0',
                'MessageRetentionPeriod': '1209600',  # 14 days
                'VisibilityTimeout': '300',
                'DeadLetterTargetArn': 'arn:aws:sqs:us-east-1:123456789012:integration-dlq'
            }
        )
        
        return queue_url['QueueUrl']
    
    def setup_topics(self):
        """Configurar topics para notificaciones"""
        
        # Topic para eventos de integración
        topic_arn = self.sns.create_topic(
            Name='integration-events'
        )
        
        # Suscribir cola al topic
        self.sns.subscribe(
            TopicArn=topic_arn['TopicArn'],
            Protocol='sqs',
            Endpoint='arn:aws:sqs:us-east-1:123456789012:integration-queue'
        )
        
        return topic_arn['TopicArn']
    
    def send_integration_message(self, message_data, priority='normal'):
        """Enviar mensaje de integración"""
        
        message = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.utcnow().isoformat(),
            'priority': priority,
            'data': message_data
        }
        
        # Enviar a SQS para procesamiento
        response = self.sqs.send_message(
            QueueUrl='integration-queue',
            MessageBody=json.dumps(message),
            MessageAttributes={
                'Priority': {
                    'DataType': 'String',
                    'StringValue': priority
                }
            }
        )
        
        return response['MessageId']
    
    def publish_integration_event(self, event_type, event_data):
        """Publicar evento de integración"""
        
        event = {
            'event_type': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            'data': event_data
        }
        
        response = self.sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:integration-events',
            Message=json.dumps(event),
            Subject=f'Integration Event: {event_type}'
        )
        
        return response['MessageId']
```

### **4. AWS EventBridge**
```yaml
# Configuración de EventBridge para integración de eventos
Resources:
  EventBus:
    Type: AWS::Events::EventBus
    Properties:
      Name: IntegrationEventBus
  
  IntegrationRule:
    Type: AWS::Events::Rule
    Properties:
      Name: IntegrationProcessor
      Description: Process integration events
      EventBusName: !Ref EventBus
      EventPattern:
        source:
          - "com.myapp.integration"
        detail-type:
          - "IntegrationRequest"
          - "IntegrationResponse"
      Targets:
        - Arn: arn:aws:lambda:us-east-1:123456789012:function:integration-processor
          Id: IntegrationProcessorTarget
          RetryPolicy:
            MaximumRetryAttempts: 3
          DeadLetterConfig:
            Arn: arn:aws:sqs:us-east-1:123456789012:integration-dlq

# Lambda processor para EventBridge
def lambda_handler(event, context):
    """Procesar eventos de integración"""
    
    try:
        source = event['source']
        detail_type = event['detail-type']
        detail = event['detail']
        
        logger.info(f"Processing {detail_type} from {source}")
        
        # Procesar según tipo de evento
        if detail_type == 'IntegrationRequest':
            result = process_integration_request(detail)
        elif detail_type == 'IntegrationResponse':
            result = process_integration_response(detail)
        else:
            logger.warning(f"Unknown event type: {detail_type}")
            return
        
        # Publicar resultado
        publish_result_event(detail_type, result)
        
    except Exception as e:
        logger.error(f"Error processing event: {e}")
        raise
```

## Integraciones On-Premises

### **1. AWS Direct Connect**
```python
class OnPremisesIntegration:
    def __init__(self):
        self.direct_connect = boto3.client('directconnect')
        self.ec2 = boto3.client('ec2')
    
    def setup_direct_connect(self, connection_config):
        """Configurar conexión Direct Connect"""
        
        # Crear conexión
        connection = self.direct_connect.create_connection(
            location=connection_config['location_id'],
            bandwidth=connection_config['bandwidth'],
            connection_name=connection_config['connection_name']
        )
        
        # Crear virtual interface
        vif = self.direct_connect.create_private_virtual_interface(
            connection_id=connection['connectionId'],
            new_private_virtual_interface_allocation=1,
            virtual_interface_name=connection_config['vif_name'],
            vlan=connection_config['vlan'],
            asn=connection_config['asn'],
            auth_key=connection_config['auth_key'],
            amazon_address=connection_config['amazon_address'],
            customer_address=connection_config['customer_address'],
            virtual_gateway_id=connection_config['vgw_id']
        )
        
        return {
            'connection_id': connection['connectionId'],
            'vif_id': vif['virtualInterfaceId']
        }
    
    def setup_hybrid_networking(self, vpc_id, onprem_cidr):
        """Configurar networking híbrido"""
        
        # Crear VPN Gateway
        vgw = self.ec2.create_vpn_gateway(
            type='ipsec.1',
            amazonSideAsn=65000,
            tag_specifications=[
                {
                    'ResourceType': 'vpn-gateway',
                    'Tags': [
                        {'Key': 'Name', 'Value': 'hybrid-vgw'}
                    ]
                }
            ]
        )
        
        # Adjuntar a VPC
        self.ec2.attach_vpn_gateway(
            VpcId=vpc_id,
            VpnGatewayId=vgw['VpnGateway']['VpnGatewayId']
        )
        
        # Crear Customer Gateway
        cgw = self.ec2.create_customer_gateway(
            bgp_asn=65001,
            public_ip=onprem_cidr['public_ip'],
            type='ipsec.1',
            tag_specifications=[
                {
                    'ResourceType': 'customer-gateway',
                    'Tags': [
                        {'Key': 'Name', 'Value': 'onprem-cgw'}
                    ]
                }
            ]
        )
        
        # Crear VPN Connection
        vpn = self.ec2.create_vpn_connection(
            type='ipsec.1',
            customer_gateway_id=cgw['CustomerGateway']['CustomerGatewayId'],
            vpn_gateway_id=vgw['VpnGateway']['VpnGatewayId'],
            options={
                'StaticRoutesOnly': True,
                'TunnelInsideIpVersion': 'ipv4'
            }
        )
        
        return vpn['VpnConnection']['VpnConnectionId']
```

### **2. AWS DataSync**
```python
class OnPremisesDataSync:
    def __init__(self):
        self.datasync = boto3.client('datasync')
    
    def setup_datasync_agent(self, agent_config):
        """Configurar DataSync Agent para on-premises"""
        
        # Activar agent
        activation = self.datasync.create_agent(
            ActivationKey=agent_config['activation_key'],
            AgentName=agent_config['agent_name'],
            Tags=[
                {'Key': 'Environment', 'Value': 'onpremises'}
            ]
        )
        
        return activation['AgentArn']
    
    def create_location_onpremises(self, agent_arn, server_config):
        """Crear location on-premises"""
        
        location = self.datasync.create_location_smb(
            Subdirectory=server_config['subdirectory'],
            ServerHostname=server_config['hostname'],
            User=server_config['username'],
            Password=server_config['password'],
            AgentArns=[agent_arn],
            Tags=[
                {'Key': 'Type', 'Value': 'onpremises'}
            ]
        )
        
        return location['LocationArn']
    
    def create_location_s3(self, bucket_config):
        """Crear location S3"""
        
        location = self.datasync.create_location_s3(
            Subdirectory=bucket_config['subdirectory'],
            S3Config={
                'BucketArn': f"arn:aws:s3:::{bucket_config['bucket_name']}",
                'S3StorageClass': 'STANDARD'
            },
            Tags=[
                {'Key': 'Type', 'Value': 'cloud'}
            ]
        )
        
        return location['LocationArn']
    
    def create_sync_task(self, source_location, destination_location, options):
        """Crear tarea de sincronización"""
        
        task = self.datasync.create_task(
            SourceLocationArn=source_location,
            DestinationLocationArn=destination_location,
            Name=options['task_name'],
            Options={
                'VerifyMode': 'POINT_IN_TIME_CONSISTENT',
                'OverwriteMode': 'NEVER',
                'Atime': 'NONE',
                'Mtime': 'PRESERVE',
                'PosixPermissions': 'NONE',
                'BytesPerSecond': -1,  # Unlimited
                'TaskQueueing': 'ENABLED',
                'LogLevel': 'BASIC',
                'TransferMode': 'CHANGED'
            },
            Tags=[
                {'Key': 'Environment', 'Value': 'production'}
            ]
        )
        
        return task['TaskArn']
```

## Integraciones Multi-Cloud

### **1. AWS Outposts para Multi-Cloud**
```python
class MultiCloudIntegration:
    def __init__(self):
        self.outposts = boto3.client('outposts')
        self.ec2 = boto3.client('ec2')
    
    def setup_outpost_integration(self, outpost_config):
        """Configurar Outpost para integración multi-cloud"""
        
        # Crear Outpost
        outpost = self.outposts.create_outpost(
            Name=outpost_config['outpost_name'],
            SiteId=outpost_config['site_id'],
            AvailabilityZone=outpost_config['availability_zone']
        )
        
        # Extender VPC a Outpost
        subnet = self.ec2.create_subnet(
            VpcId=outpost_config['vpc_id'],
            CidrBlock=outpost_config['cidr_block'],
            AvailabilityZone=f"{outpost_config['region']}-outpost-{outpost['Outpost']['OutpostId']}"
        )
        
        return {
            'outpost_id': outpost['Outpost']['OutpostId'],
            'subnet_id': subnet['Subnet']['SubnetId']
        }
    
    def setup_multi_cloud_connectivity(self, cloud_providers):
        """Configurar conectividad multi-cloud"""
        
        connections = {}
        
        for provider, config in cloud_providers.items():
            if provider == 'azure':
                connection = self.setup_azure_integration(config)
            elif provider == 'gcp':
                connection = self.setup_gcp_integration(config)
            elif provider == 'oracle':
                connection = self.setup_oracle_integration(config)
            
            connections[provider] = connection
        
        return connections
    
    def setup_azure_integration(self, azure_config):
        """Configurar integración con Azure"""
        
        # Configurar VPN entre AWS y Azure
        vpn_connection = self.ec2.create_vpn_connection(
            type='ipsec.1',
            customer_gateway_id=azure_config['customer_gateway_id'],
            vpn_gateway_id=azure_config['vpn_gateway_id'],
            options={
                'StaticRoutesOnly': False,
                'TunnelInsideIpVersion': 'ipv4'
            }
        )
        
        return vpn_connection['VpnConnection']['VpnConnectionId']
    
    def setup_gcp_integration(self, gcp_config):
        """Configurar integración con GCP"""
        
        # Configurar interconnect
        # (Esto requeriría configuración específica de GCP)
        
        return {
            'type': 'interconnect',
            'status': 'configured'
        }
```

### **2. AWS Transit Gateway**
```yaml
# Configuración de Transit Gateway para multi-cloud
Resources:
  TransitGateway:
    Type: AWS::EC2::TransitGateway
    Properties:
      AmazonSideAsn: 64512
      AutoAcceptSharedAttachments: enable
      DefaultRouteTableAssociation: enable
      DefaultRouteTablePropagation: enable
      VpcEgress: enable
      DnsSupport: enable
      Tags:
        - Key: Name
          Value: MultiCloudTGW
  
  TGWAttachmentVPC:
    Type: AWS::EC2::TransitGatewayAttachment
    Properties:
      TransitGatewayId: !Ref TransitGateway
      VpcId: !Ref MainVPC
      SubnetIds: !Ref TGWSubnets
  
  TGWAttachmentVPN:
    Type: AWS::EC2::TransitGatewayAttachment
    Properties:
      TransitGatewayId: !Ref TransitGateway
      VpnConnectionId: !Ref VPNConnection
  
  TGWRouteTable:
    Type: AWS::EC2::TransitGatewayRouteTable
    Properties:
      TransitGatewayId: !Ref TransitGateway
      Tags:
        - Key: Name
          Value: MultiCloudRoutes
  
  TGWRoute:
    Type: AWS::EC2::TransitGatewayRoute
    Properties:
      TransitGatewayRouteTableId: !Ref TGWRouteTable
      DestinationCidrBlock: 10.0.0.0/8
      TransitGatewayAttachmentId: !Ref TGWAttachmentVPN
```

## Integraciones con Terceros

### **1. SaaS Applications**
```python
class SaaSIntegration:
    def __init__(self):
        self.secrets_manager = boto3.client('secretsmanager')
        self.lambda_client = boto3.client('lambda')
    
    def setup_salesforce_integration(self):
        """Configurar integración con Salesforce"""
        
        # Almacenar credenciales de forma segura
        self.secrets_manager.create_secret(
            Name='salesforce/credentials',
            SecretString=json.dumps({
                'client_id': 'your_client_id',
                'client_secret': 'your_client_secret',
                'username': 'your_username',
                'password': 'your_password',
                'security_token': 'your_security_token'
            })
        )
        
        # Crear Lambda function para integración
        self.lambda_client.create_function(
            FunctionName='salesforce-integration',
            Runtime='python3.9',
            Role='arn:aws:iam::123456789012:role/lambda-execution-role',
            Handler='salesforce_handler.lambda_handler',
            Code={
                'ZipFile': self.generate_salesforce_handler()
            },
            Environment={
                'Variables': {
                    'SALESFORCE_SECRET_NAME': 'salesforce/credentials'
                }
            }
        )
    
    def generate_salesforce_handler(self):
        """Generar código para handler de Salesforce"""
        
        handler_code = '''
import json
import boto3
import requests
from datetime import datetime

def lambda_handler(event, context):
    """Handler para integración con Salesforce"""
    
    try:
        # Obtener credenciales
        secrets_client = boto3.client('secretsmanager')
        secret_response = secrets_client.get_secret_value(
            SecretId=os.environ['SALESFORCE_SECRET_NAME']
        )
        credentials = json.loads(secret_response['SecretString'])
        
        # Autenticar con Salesforce
        sf_token = authenticate_salesforce(credentials)
        
        # Procesar evento
        if event['action'] == 'create_lead':
            result = create_salesforce_lead(sf_token, event['data'])
        elif event['action'] == 'update_contact':
            result = update_salesforce_contact(sf_token, event['data'])
        else:
            return {'statusCode': 400, 'body': 'Invalid action'}
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'result': result,
                'timestamp': datetime.utcnow().isoformat()
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def authenticate_salesforce(credentials):
    """Autenticar con Salesforce OAuth"""
    
    auth_url = "https://login.salesforce.com/services/oauth2/token"
    
    data = {
        'grant_type': 'password',
        'client_id': credentials['client_id'],
        'client_secret': credentials['client_secret'],
        'username': credentials['username'],
        'password': credentials['password'] + credentials['security_token']
    }
    
    response = requests.post(auth_url, data=data)
    
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        raise Exception("Salesforce authentication failed")

def create_salesforce_lead(token, lead_data):
    """Crear lead en Salesforce"""
    
    api_url = "https://yourinstance.salesforce.com/services/data/v52.0/sobjects/Lead/"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(api_url, json=lead_data, headers=headers)
    
    return response.json()
        '''
        
        return handler_code
```

### **2. Webhooks y APIs Externas**
```python
class WebhookIntegration:
    def __init__(self):
        self.api_gateway = boto3.client('apigateway')
        self.lambda_client = boto3.client('lambda')
    
    def setup_webhook_endpoint(self, webhook_config):
        """Configurar endpoint para webhooks"""
        
        # Crear API Gateway
        api = self.api_gateway.create_rest_api(
            name='WebhookAPI',
            description='API for receiving webhooks'
        )
        
        # Crear recurso
        resource = self.api_gateway.create_resource(
            restApiId=api['id'],
            parentId=api['root_resource_id'],
            pathPart=webhook_config['path']
        )
        
        # Configurar método POST
        self.api_gateway.put_method(
            restApiId=api['id'],
            resourceId=resource['id'],
            httpMethod='POST',
            authorizationType='NONE'
        )
        
        # Configurar integración con Lambda
        integration = self.api_gateway.put_integration(
            restApiId=api['id'],
            resourceId=resource['id'],
            httpMethod='POST',
            type='AWS',
            integrationHttpMethod='POST',
            uri=f'arn:aws:apigateway:{webhook_config["region"]}:lambda:path/2015-03-31/functions/{webhook_config["lambda_arn"]}/invocations'
        )
        
        return api['id']
    
    def create_webhook_handler(self, webhook_config):
        """Crear handler para procesar webhooks"""
        
        handler_code = f'''
import json
import hmac
import hashlib
import boto3
from datetime import datetime

def lambda_handler(event, context):
    """Handler para procesar webhooks"""
    
    try:
        # Validar firma del webhook
        if not validate_webhook_signature(event, '{webhook_config["secret"]}'):
            return {{
                'statusCode': 401,
                'body': json.dumps({{'error': 'Invalid signature'}})
            }}
        
        # Procesar payload
        payload = json.loads(event['body'])
        
        # Procesar según tipo de webhook
        webhook_type = event['headers'].get('X-Webhook-Type', 'generic')
        
        if webhook_type == 'github':
            result = process_github_webhook(payload)
        elif webhook_type == 'stripe':
            result = process_stripe_webhook(payload)
        else:
            result = process_generic_webhook(payload)
        
        # Almacenar resultado
        store_webhook_result(webhook_type, payload, result)
        
        return {{
            'statusCode': 200,
            'body': json.dumps({{'success': True, 'processed': True}})
        }}
        
    except Exception as e:
        return {{
            'statusCode': 500,
            'body': json.dumps({{'error': str(e)}})
        }}

def validate_webhook_signature(event, secret):
    """Validar firma HMAC del webhook"""
    
    signature = event['headers'].get('X-Webhook-Signature', '')
    payload = event['body']
    
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

def process_github_webhook(payload):
    """Procesar webhook de GitHub"""
    
    event_type = payload.get('action', 'unknown')
    repository = payload.get('repository', {{}})
    
    # Procesar eventos específicos
    if event_type == 'push':
        return handle_push_event(payload)
    elif event_type == 'pull_request':
        return handle_pull_request_event(payload)
    
    return {{'event_type': event_type, 'repository': repository.get('name')}}

def store_webhook_result(webhook_type, payload, result):
    """Almacenar resultado del webhook"""
    
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('webhook_results')
    
    table.put_item(Item={{
        'id': str(uuid.uuid4()),
        'webhook_type': webhook_type,
        'timestamp': datetime.utcnow().isoformat(),
        'payload': payload,
        'result': result
    }})
        '''
        
        # Crear Lambda function
        self.lambda_client.create_function(
            FunctionName='webhook-handler',
            Runtime='python3.9',
            Role='arn:aws:iam::123456789012:role/lambda-execution-role',
            Handler='lambda_function.lambda_handler',
            Code={
                'ZipFile': handler_code
            }
        )
```

## Patrones de Integración

### **1. Event-Driven Architecture**
```python
class EventDrivenIntegration:
    def __init__(self):
        self.eventbridge = boto3.client('events')
        self.sns = boto3.client('sns')
        self.sqs = boto3.client('sqs')
    
    def setup_event_pipeline(self):
        """Configurar pipeline de eventos"""
        
        # Crear Event Bus
        event_bus = self.eventbridge.create_event_bus(
            Name='IntegrationEventBus'
        )
        
        # Crear reglas para diferentes tipos de eventos
        rules = [
            {
                'name': 'UserEvents',
                'pattern': {
                    'source': ['com.myapp.users'],
                    'detail-type': ['UserCreated', 'UserUpdated', 'UserDeleted']
                }
            },
            {
                'name': 'OrderEvents',
                'pattern': {
                    'source': ['com.myapp.orders'],
                    'detail-type': ['OrderCreated', 'OrderUpdated', 'OrderCancelled']
                }
            }
        ]
        
        for rule in rules:
            self.eventbridge.put_rule(
                Name=rule['name'],
                EventPattern=json.dumps(rule['pattern']),
                State='ENABLED',
                EventBusName=event_bus['BusArn']
            )
        
        return event_bus['BusArn']
    
    def create_event_processor(self, event_type, processor_config):
        """Crear procesador para tipo de evento específico"""
        
        processor_code = f'''
import json
import boto3
from datetime import datetime

def lambda_handler(event, context):
    """Procesador de eventos {event_type}"""
    
    try:
        source = event['source']
        detail = event['detail']
        detail_type = event['detail-type']
        
        # Procesar evento específico
        if detail_type == '{event_type}':
            result = process_{event_type.lower().replace(" ", "_")}(detail)
        else:
            result = {{'status': 'unknown_event_type'}}
        
        # Publicar resultado
        publish_processed_event(source, detail_type, result)
        
        return {{
            'statusCode': 200,
            'body': json.dumps({{'processed': True, 'result': result}})
        }}
        
    except Exception as e:
        return {{
            'statusCode': 500,
            'body': json.dumps({{'error': str(e)}})
        }}

def process_{event_type.lower().replace(" ", "_")}(detail):
    """Procesar evento {event_type}"""
    
    # Lógica específica del procesador
    return {{
        'event_id': detail.get('id'),
        'processed_at': datetime.utcnow().isoformat(),
        'status': 'processed'
    }}

def publish_processed_event(source, event_type, result):
    """Publicar evento procesado"""
    
    sns = boto3.client('sns')
    
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:processed-events',
        Message=json.dumps({{
            'source': source,
            'event_type': event_type,
            'result': result,
            'timestamp': datetime.utcnow().isoformat()
        }}),
        Subject=f'Processed Event: {{event_type}}'
    )
        '''
        
        # Crear Lambda function
        lambda_client = boto3.client('lambda')
        lambda_client.create_function(
            FunctionName=f'{event_type.lower().replace(" ", "_")}_processor',
            Runtime='python3.9',
            Role='arn:aws:iam::123456789012:role/lambda-execution-role',
            Handler='lambda_function.lambda_handler',
            Code={'ZipFile': processor_code}
        )
```

### **2. Request-Response Pattern**
```python
class RequestResponseIntegration:
    def __init__(self):
        self.api_gateway = boto3.client('apigateway')
        self.lambda_client = boto3.client('lambda')
    
    def setup_api_integration(self, api_config):
        """Configurar API para integración request-response"""
        
        # Crear API Gateway
        api = self.api_gateway.create_rest_api(
            name=api_config['name'],
            description=api_config['description']
        )
        
        # Configurar endpoints
        for endpoint in api_config['endpoints']:
            self.create_endpoint(api['id'], endpoint)
        
        return api['id']
    
    def create_endpoint(self, api_id, endpoint_config):
        """Crear endpoint específico"""
        
        # Crear recurso
        resource = self.api_gateway.create_resource(
            restApiId=api_id,
            parentId=endpoint_config['parent_id'],
            pathPart=endpoint_config['path']
        )
        
        # Configurar método
        for method in endpoint_config['methods']:
            self.api_gateway.put_method(
                restApiId=api_id,
                resourceId=resource['id'],
                httpMethod=method['http_method'],
                authorizationType=method.get('auth_type', 'NONE')
            )
            
            # Configurar integración
            if method.get('integration'):
                self.api_gateway.put_integration(
                    restApiId=api_id,
                    resourceId=resource['id'],
                    httpMethod=method['http_method'],
                    type=method['integration']['type'],
                    integrationHttpMethod=method['integration']['method'],
                    uri=method['integration']['uri']
                )
        
        return resource['id']
```

## Security y Compliance

### **1. IAM Policies para Integraciones**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction",
        "apigateway:*",
        "events:*",
        "sns:*",
        "sqs:*",
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "eu-west-1",
            "ap-southeast-1"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt"
      ],
      "Resource": "arn:aws:kms:*:*:key/integration-key"
    }
  ]
}
```

### **2. Encryption y Security**
```python
class SecureIntegration:
    def __init__(self):
        self.kms = boto3.client('kms')
        self.secrets_manager = boto3.client('secretsmanager')
    
    def setup_encryption(self):
        """Configurar encriptación para integraciones"""
        
        # Crear KMS key
        key = self.kms.create_key(
            Description='KMS key for integrations',
            KeyUsage='ENCRYPT_DECRYPT',
            CustomerMasterKeySpec='SYMMETRIC_DEFAULT',
            Origin='AWS_KMS',
            Tags=[
                {'TagKey': 'Environment', 'TagValue': 'production'},
                {'TagKey': 'Application', 'TagValue': 'integrations'}
            ]
        )
        
        # Crear alias
        self.kms.create_alias(
            AliasName='alias/integration-key',
            TargetKeyId=key['KeyMetadata']['KeyId']
        )
        
        return key['KeyMetadata']['KeyId']
    
    def encrypt_sensitive_data(self, data, key_id):
        """Encriptar datos sensibles"""
        
        response = self.kms.encrypt(
            KeyId=key_id,
            Plaintext=json.dumps(data).encode()
        )
        
        return response['CiphertextBlob']
    
    def decrypt_sensitive_data(self, ciphertext_blob):
        """Desencriptar datos sensibles"""
        
        response = self.kms.decrypt(
            CiphertextBlob=ciphertext_blob
        )
        
        return json.loads(response['Plaintext'].decode())
```

## Monitoring y Observabilidad

### **1. Métricas de Integración**
```python
class IntegrationMonitoring:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
        self.xray = boto3.client('xray')
    
    def setup_monitoring(self, integration_config):
        """Configurar monitoring para integraciones"""
        
        # Crear alarmas para métricas clave
        alarms = [
            {
                'name': 'IntegrationLatencyHigh',
                'metric': 'IntegrationLatency',
                'threshold': 5000,  # 5 segundos
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': 'IntegrationErrorRateHigh',
                'metric': 'IntegrationErrors',
                'threshold': 10,  # 10 errores por minuto
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': 'IntegrationQueueDepthHigh',
                'metric': 'QueueDepth',
                'threshold': 1000,
                'comparison': 'GreaterThanThreshold'
            }
        ]
        
        for alarm in alarms:
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm['name'],
                AlarmDescription=f'Alarm for {alarm["metric"]}',
                MetricName=alarm['metric'],
                Namespace='Integration/Metrics',
                Statistic='Average',
                Period=60,
                EvaluationPeriods=2,
                Threshold=alarm['threshold'],
                ComparisonOperator=alarm['comparison'],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:integration-alerts'
                ]
            )
    
    def create_integration_dashboard(self):
        """Crear dashboard para integraciones"""
        
        dashboard = {
            "widgets": [
                {
                    "type": "metric",
                    "properties": {
                        "metrics": [
                            ["Integration/Metrics", "IntegrationLatency", "IntegrationType", "API", {"region": "us-east-1"}],
                            [".", ".", "IntegrationType", "Event", {"region": "us-east-1"}],
                            [".", ".", "IntegrationType", "Webhook", {"region": "us-east-1"}]
                        ],
                        "view": "timeSeries",
                        "stacked": false,
                        "region": "us-east-1",
                        "title": "Integration Latency by Type",
                        "period": 300
                    }
                },
                {
                    "type": "metric",
                    "properties": {
                        "metrics": [
                            ["Integration/Metrics", "IntegrationErrors", "IntegrationType", "API", {"region": "us-east-1"}],
                            [".", ".", "IntegrationType", "Event", {"region": "us-east-1"}],
                            [".", ".", "IntegrationType", "Webhook", {"region": "us-east-1"}]
                        ],
                        "view": "timeSeries",
                        "stacked": true,
                        "region": "us-east-1",
                        "title": "Integration Errors by Type",
                        "period": 300
                    }
                }
            ]
        }
        
        self.cloudwatch.put_dashboard(
            DashboardName='Integration-Dashboard',
            DashboardBody=json.dumps(dashboard)
        )
```

## Best Practices

### **1. Diseño de Integraciones**
- Arquitectura desacoplada
- Event-driven cuando sea posible
- Manejo robusto de errores
- Retry mechanisms con backoff exponencial

### **2. Security**
- Principio de menor privilegio
- Encriptación de datos sensibles
- Validación de inputs
- Audit logging completo

### **3. Performance**
- Caching estratégico
- Batch processing cuando sea apropiado
- Connection pooling
- Optimización de consultas

### **4. Operaciones**
- Monitoring completo
- Alerting proactivo
- Documentación clara
- Testing automatizado

## Conclusion

Las integraciones del cloud en AWS proporcionan un ecosistema completo para conectar sistemas, aplicaciones y plataformas tanto dentro como fuera de AWS. La clave es seleccionar los servicios apropiados según los requisitos específicos de cada integración, siguiendo las mejores prácticas de seguridad, performance y operaciones para garantizar soluciones robustas y escalables.
