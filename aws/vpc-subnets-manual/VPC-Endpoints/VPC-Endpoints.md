# AWS VPC Endpoints

## Definición

VPC Endpoints permiten conectar tu VPC a servicios AWS de manera privada sin requerir una gateway de internet, VPN connection o AWS Direct Connect. Los endpoints proporcionan conectividad segura y confiable entre tu VPC y los servicios soportados sin exponer tu tráfico a la internet pública.

## Tipos de VPC Endpoints

### 1. **Interface Endpoints**
- Utilizan Elastic Network Interfaces (ENIs)
- Asignan IPs privadas en tus subnets
- Soportan servicios powered by PrivateLink
- Requieren security groups

### 2. **Gateway Endpoints**
- Utilizan gateways de red
- Soportan solo S3 y DynamoDB
- No requieren ENIs
- Sin costos adicionales por hora

## Características Principales

### **Seguridad**
- Tráfico completamente privado
- Sin exposición a internet pública
- Control granular con security groups
- Aislamiento de red mantenido

### **Rendimiento**
- Baja latencia
- Alto ancho de banda
- Conexión directa a servicios
- Sin overhead de NAT

### **Flexibilidad**
- Soporte para múltiples servicios
- Configuración por subnet
- Políticas de acceso personalizadas
- Integración con IAM

## Configuración de VPC Endpoints

### **Gestión de Interface Endpoints**
```python
import boto3
import json
from datetime import datetime

class VPCEndpointManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_interface_endpoint(self, vpc_id, service_name, subnet_ids, 
                                security_group_ids=None, policy_document=None,
                                private_dns_enabled=True):
        """Crear interface endpoint"""
        
        try:
            endpoint_params = {
                'VpcId': vpc_id,
                'ServiceName': service_name,
                'SubnetIds': subnet_ids,
                'PrivateDnsEnabled': private_dns_enabled,
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpc-endpoint',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'endpoint-{service_name.split(".")[0]}'},
                            {'Key': 'Type', 'Value': 'Interface'},
                            {'Key': 'Service', 'Value': service_name}
                        ]
                    }
                ]
            }
            
            # Agregar security groups si se especifican
            if security_group_ids:
                endpoint_params['SecurityGroupIds'] = security_group_ids
            
            # Agregar política si se especifica
            if policy_document:
                endpoint_params['PolicyDocument'] = policy_document
            
            response = self.ec2.create_vpc_endpoint(**endpoint_params)
            endpoint_id = response['VpcEndpoint']['VpcEndpointId']
            
            # Esperar a que el endpoint esté disponible
            self.wait_for_endpoint_available(endpoint_id)
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'service_name': service_name,
                'state': response['VpcEndpoint']['State'],
                'dns_entries': response['VpcEndpoint'].get('DnsEntries', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_gateway_endpoint(self, vpc_id, service_name, route_table_ids, 
                               policy_document=None):
        """Crear gateway endpoint"""
        
        try:
            endpoint_params = {
                'VpcId': vpc_id,
                'ServiceName': service_name,
                'RouteTableIds': route_table_ids,
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpc-endpoint',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'endpoint-{service_name.split(".")[0]}'},
                            {'Key': 'Type', 'Value': 'Gateway'},
                            {'Key': 'Service', 'Value': service_name}
                        ]
                    }
                ]
            }
            
            # Agregar política si se especifica
            if policy_document:
                endpoint_params['PolicyDocument'] = policy_document
            
            response = self.ec2.create_vpc_endpoint(**endpoint_params)
            endpoint_id = response['VpcEndpoint']['VpcEndpointId']
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'service_name': service_name,
                'state': response['VpcEndpoint']['State'],
                'route_table_ids': route_table_ids
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def modify_endpoint_policy(self, endpoint_id, policy_document):
        """Modificar política de endpoint"""
        
        try:
            response = self.ec2.modify_vpc_endpoint(
                VpcEndpointId=endpoint_id,
                PolicyDocument=policy_document
            )
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'message': 'Policy updated successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_security_groups_to_endpoint(self, endpoint_id, security_group_ids):
        """Agregar security groups a interface endpoint"""
        
        try:
            response = self.ec2.modify_vpc_endpoint(
                VpcEndpointId=endpoint_id,
                AddSecurityGroupIds=security_group_ids
            )
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'security_groups_added': security_group_ids
            }
            
        except Exception e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_subnets_to_endpoint(self, endpoint_id, subnet_ids):
        """Agregar subnets a interface endpoint"""
        
        try:
            response = self.ec2.modify_vpc_endpoint(
                VpcEndpointId=endpoint_id,
                AddSubnetIds=subnet_ids
            )
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'subnets_added': subnet_ids
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_endpoint(self, endpoint_id):
        """Eliminar VPC endpoint"""
        
        try:
            self.ec2.delete_vpc_endpoints(
                VpcEndpointIds=[endpoint_id]
            )
            
            return {
                'success': True,
                'endpoint_id': endpoint_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_endpoints(self, vpc_id=None):
        """Describir VPC endpoints"""
        
        try:
            params = {}
            if vpc_id:
                params['Filters'] = [{'Name': 'vpc-id', 'Values': [vpc_id]}]
            
            response = self.ec2.describe_vpc_endpoints(**params)
            
            endpoints = []
            for endpoint in response['VpcEndpoints']:
                endpoint_info = {
                    'endpoint_id': endpoint['VpcEndpointId'],
                    'vpc_id': endpoint['VpcId'],
                    'service_name': endpoint['ServiceName'],
                    'state': endpoint['State'],
                    'vpc_endpoint_type': endpoint['VpcEndpointType'],
                    'creation_timestamp': endpoint['CreationTimestamp'],
                    'private_dns_enabled': endpoint.get('PrivateDnsEnabled', False),
                    'dns_entries': endpoint.get('DnsEntries', []),
                    'subnet_ids': endpoint.get('SubnetIds', []),
                    'security_group_ids': endpoint.get('Groups', []),
                    'route_table_ids': endpoint.get('RouteTableIds', []),
                    'tags': endpoint.get('Tags', [])
                }
                endpoints.append(endpoint_info)
            
            return {
                'success': True,
                'endpoints': endpoints,
                'count': len(endpoints)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_available_services(self):
        """Obtener servicios disponibles para endpoints"""
        
        try:
            response = self.ec2.describe_vpc_endpoint_services()
            
            services = []
            for service in response['ServiceDetails']:
                service_info = {
                    'service_name': service['ServiceName'],
                    'service_type': service['ServiceType'],
                    'availability_zones': service.get('AvailabilityZones', []),
                    'base_endpoint_dns_names': service.get('BaseEndpointDnsNames', []),
                    'private_dns_names': service.get('PrivateDnsNames', []),
                    'private_dns_name_confirmation_required': service.get('PrivateDnsNameConfirmationRequired', False),
                    'tags': service.get('Tags', [])
                }
                services.append(service_info)
            
            return {
                'success': True,
                'services': services,
                'count': len(services)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def wait_for_endpoint_available(self, endpoint_id, timeout=300):
        """Esperar a que endpoint esté disponible"""
        
        try:
            waiter = self.ec2.get_waiter('vpc_endpoint_available')
            waiter.wait(
                VpcEndpointIds=[endpoint_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def create_endpoint_policy(self, allowed_principals=None, allowed_actions=None):
        """Crear política de endpoint"""
        
        if not allowed_principals:
            allowed_principals = ['*']
        if not allowed_actions:
            allowed_actions = ['*']
        
        policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Effect': 'Allow',
                    'Principal': {'AWS': allowed_principals},
                    'Action': allowed_actions,
                    'Resource': '*'
                }
            ]
        }
        
        return json.dumps(policy, indent=2)
    
    def create_s3_access_policy(self, bucket_name, allowed_actions=None):
        """Crear política específica para S3"""
        
        if not allowed_actions:
            allowed_actions = ['s3:GetObject', 's3:PutObject', 's3:ListBucket']
        
        policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Effect': 'Allow',
                    'Principal': {'AWS': '*'},
                    'Action': allowed_actions,
                    'Resource': [
                        f'arn:aws:s3:::{bucket_name}',
                        f'arn:aws:s3:::{bucket_name}/*'
                    ]
                }
            ]
        }
        
        return json.dumps(policy, indent=2)
```

## Casos de Uso

### **1. Interface Endpoint para S3**
```python
# Ejemplo: Crear endpoint para S3
manager = VPCEndpointManager('us-east-1')

# Crear interface endpoint para S3
endpoint_result = manager.create_interface_endpoint(
    vpc_id='vpc-1234567890abcdef0',
    service_name='com.amazonaws.us-east-1.s3',
    subnet_ids=['subnet-1234567890abcdef0', 'subnet-0987654321fedcba0'],
    security_group_ids=['sg-1234567890abcdef0'],
    private_dns_enabled=True
)

if endpoint_result['success']:
    print(f"S3 endpoint created: {endpoint_result['endpoint_id']}")
    print(f"DNS entries: {endpoint_result['dns_entries']}")
```

### **2. Gateway Endpoint para DynamoDB**
```python
# Ejemplo: Crear gateway endpoint para DynamoDB
endpoint_result = manager.create_gateway_endpoint(
    vpc_id='vpc-1234567890abcdef0',
    service_name='com.amazonaws.us-east-1.dynamodb',
    route_table_ids=['rtb-1234567890abcdef0'],
    policy_document=manager.create_s3_access_policy('my-table')
)

if endpoint_result['success']:
    print(f"DynamoDB endpoint created: {endpoint_result['endpoint_id']}")
```

### **3. Endpoint para API Gateway**
```python
# Ejemplo: Crear endpoint para API Gateway
endpoint_result = manager.create_interface_endpoint(
    vpc_id='vpc-1234567890abcdef0',
    service_name='com.amazonaws.us-east-1.execute-api',
    subnet_ids=['subnet-1234567890abcdef0'],
    security_group_ids=['sg-1234567890abcdef0'],
    policy_document=manager.create_endpoint_policy(
        allowed_principals=['arn:aws:iam::123456789012:role/api-access'],
        allowed_actions=['execute-api:Invoke']
    )
)
```

## Configuración con AWS CLI

### **Crear Interface Endpoint**
```bash
# Crear interface endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-1234567890abcdef0 \
  --service-name com.amazonaws.us-east-1.s3 \
  --subnet-ids subnet-1234567890abcdef0 subnet-0987654321fedcba0 \
  --security-group-ids sg-1234567890abcdef0 \
  --private-dns-enabled \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=s3-endpoint}]'

# Crear gateway endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-1234567890abcdef0 \
  --service-name com.amazonaws.us-east-1.dynamodb \
  --route-table-ids rtb-1234567890abcdef0 \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=dynamodb-endpoint}]'
```

### **Gestionar Endpoints**
```bash
# Describir endpoints
aws ec2 describe-vpc-endpoints \
  --filters Name=vpc-id,Values=vpc-1234567890abcdef0

# Modificar endpoint
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-1234567890abcdef0 \
  --add-security-group-ids sg-0987654321fedcba0

# Eliminar endpoint
aws ec2 delete-vpc-endpoints \
  --vpc-endpoint-ids vpce-1234567890abcdef0
```

## Políticas de Endpoint

### **Política Restringida**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/admin"
      },
      "Action": "s3:*",
      "Resource": "*"
    }
  ]
}
```

### **Política por Servicio**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "*"},
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

## Servicios Soportados

### **Interface Endpoints**
- API Gateway
- CloudFormation
- CloudWatch
- DynamoDB
- EC2
- ECR
- ECS
- EKS
- KMS
- Lambda
- RDS
- Redshift
- S3
- SQS
- SNS
- Y muchos más

### **Gateway Endpoints**
- S3
- DynamoDB

## Best Practices

### **1. Seguridad**
- Usar políticas restrictivas
- Implementar security groups específicos
- Monitorear acceso a endpoints
- Rotar credenciales regularmente

### **2. Rendimiento**
- Desplegar en múltiples AZs
- Usar DNS privado cuando sea posible
- Optimizar configuración de red
- Monitorear latencia

### **3. Costos**
- Evaluar costo vs beneficio
- Usar gateway endpoints cuando sea posible
- Monitorear consumo de datos
- Optimizar número de endpoints

### **4. Gestión**
- Etiquetar todos los endpoints
- Documentar propósito y configuración
- Revisar periódicamente endpoints activos
- Automatizar creación y configuración

## Costos

### **Interface Endpoints**
- Cargo por hora por endpoint
- Cargo por GB de datos procesados
- Sin cargo por datos transferidos dentro de la misma AZ

### **Gateway Endpoints**
- Sin cargo por hora
- Sin cargo por datos procesados
- Solo costos de transferencia de datos estándar

## Troubleshooting

### **Problemas Comunes**
1. **Endpoint no accesible**: Verificar security groups y route tables
2. **DNS resolution issues**: Configurar DNS privado
3. **Permisos denegados**: Revisar políticas de endpoint
4. **Conexión lenta**: Optimizar configuración de red

### **Comandos de Diagnóstico**
```bash
# Verificar estado del endpoint
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-1234567890abcdef0

# Verificar conectividad
nslookup my-bucket.s3.us-east-1.vpce.amazonaws.com

# Verificar políticas
aws ec2 get-vpc-endpoint-policy-attributes \
  --vpc-endpoint-id vpce-1234567890abcdef0
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/VPCEndpoints
- Latencia de conexión
- Bytes transferidos
- Errores de conexión

### **Alarmas Recomendadas**
- Endpoint unavailable
- High latency
- Connection errors
- Data transfer thresholds
