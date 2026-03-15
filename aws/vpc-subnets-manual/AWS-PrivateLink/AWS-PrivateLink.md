# AWS PrivateLink

## Definición

AWS PrivateLink es un servicio que permite conectar aplicaciones en tu VPC a servicios AWS de manera privada sin requerir acceso a internet pública, NAT gateways o VPN connections. PrivateLink utiliza VPC Endpoints de tipo interface para proporcionar conectividad segura y escalable entre tus aplicaciones y los servicios soportados.

## Componentes Clave

### 1. **Service Consumer**
- Aplicaciones que consumen servicios
- VPC endpoints de tipo interface
- Security groups para control de acceso
- DNS resolution privada

### 2. **Service Provider**
- Servicios AWS o servicios propios
- Network Load Balancers (NLB)
- Endpoint services
- Políticas de acceso

### 3. **VPC Endpoint Service**
- Interfaz para servicios privados
- Configuración de acceso
- Gestión de consumidores
- Monitoreo y logging

## Características Principales

### **Seguridad**
- Tráfico completamente privado
- Sin exposición a internet
- Control granular con security groups
- Aislamiento de red completo

### **Rendimiento**
- Baja latencia
- Alto ancho de banda
- Conexión directa a servicios
- Escalabilidad automática

### **Flexibilidad**
- Servicios AWS y servicios propios
- Multi-region y multi-cuenta
- Configuración personalizada
- Integración con IAM

## Configuración de PrivateLink

### **Gestión de Endpoint Services**
```python
import boto3
import json
from datetime import datetime
import time

class PrivateLinkManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.elbv2 = boto3.client('elbv2', region_name=region)
        self.region = region
    
    def create_endpoint_service(self, network_load_balancer_arns, 
                               acceptance_required=True, 
                               allowed_principals=None,
                               private_dns_name=None):
        """Crear endpoint service para PrivateLink"""
        
        try:
            service_params = {
                'NetworkLoadBalancerArns': network_load_balancer_arns,
                'AcceptanceRequired': acceptance_required,
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpc-endpoint-service',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'privatelink-service-{int(time.time())}'},
                            {'Key': 'Type', 'Value': 'PrivateLink'}
                        ]
                    }
                ]
            }
            
            # Agregar nombre DNS privado si se especifica
            if private_dns_name:
                service_params['PrivateDnsName'] = private_dns_name
            
            response = self.ec2.create_vpc_endpoint_service_configuration(**service_params)
            service_id = response['ServiceConfiguration']['ServiceId']
            
            # Agregar principals permitidos si se especifican
            if allowed_principals:
                for principal in allowed_principals:
                    self.ec2.modify_vpc_endpoint_service_permissions(
                        ServiceId=service_id,
                        AddAllowedPrincipals=[principal]
                    )
            
            return {
                'success': True,
                'service_id': service_id,
                'service_name': response['ServiceConfiguration']['ServiceName'],
                'service_state': response['ServiceConfiguration']['ServiceState'],
                'acceptance_required': response['ServiceConfiguration']['AcceptanceRequired']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_private_link_connection(self, vpc_id, service_id, 
                                      subnet_ids, security_group_ids=None):
        """Crear conexión PrivateLink (endpoint)"""
        
        try:
            # Obtener detalles del servicio
            service_details = self.ec2.describe_vpc_endpoint_service_configurations(
                ServiceIds=[service_id]
            )
            
            if not service_details['ServiceConfigurations']:
                return {
                    'success': False,
                    'error': 'Service not found'
                }
            
            service_name = service_details['ServiceConfigurations'][0]['ServiceName']
            
            # Crear VPC endpoint
            endpoint_params = {
                'VpcId': vpc_id,
                'ServiceName': service_name,
                'SubnetIds': subnet_ids,
                'VpcEndpointType': 'Interface',
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpc-endpoint',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'privatelink-{service_id}'},
                            {'Key': 'ServiceId', 'Value': service_id}
                        ]
                    }
                ]
            }
            
            if security_group_ids:
                endpoint_params['SecurityGroupIds'] = security_group_ids
            
            response = self.ec2.create_vpc_endpoint(**endpoint_params)
            endpoint_id = response['VpcEndpoint']['VpcEndpointId']
            
            # Esperar a que el endpoint esté disponible
            if response['VpcEndpoint']['State'] == 'pendingAcceptance':
                # Aceptar la conexión si es requerido
                acceptance_result = self.accept_endpoint_connection(endpoint_id)
                if not acceptance_result['success']:
                    return acceptance_result
            
            # Esperar a que el endpoint esté disponible
            self.wait_for_endpoint_available(endpoint_id)
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'service_name': service_name,
                'service_id': service_id,
                'state': response['VpcEndpoint']['State']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def accept_endpoint_connection(self, endpoint_id):
        """Aceptar conexión de endpoint"""
        
        try:
            response = self.ec2.accept_vpc_endpoint_connections(
                ServiceId=self.get_service_id_from_endpoint(endpoint_id),
                VpcEndpointIds=[endpoint_id]
            )
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'message': 'Connection accepted'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def reject_endpoint_connection(self, endpoint_id):
        """Rechazar conexión de endpoint"""
        
        try:
            response = self.ec2.reject_vpc_endpoint_connections(
                ServiceId=self.get_service_id_from_endpoint(endpoint_id),
                VpcEndpointIds=[endpoint_id]
            )
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'message': 'Connection rejected'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def modify_service_permissions(self, service_id, add_principals=None, 
                                 remove_principals=None):
        """Modificar permisos del servicio"""
        
        try:
            # Agregar principals
            if add_principals:
                self.ec2.modify_vpc_endpoint_service_permissions(
                    ServiceId=service_id,
                    AddAllowedPrincipals=add_principals
                )
            
            # Remover principals
            if remove_principals:
                self.ec2.modify_vpc_endpoint_service_permissions(
                    ServiceId=service_id,
                    RemoveAllowedPrincipals=remove_principals
                )
            
            return {
                'success': True,
                'service_id': service_id,
                'message': 'Permissions modified successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_endpoint_services(self, service_ids=None):
        """Describir servicios de endpoint"""
        
        try:
            params = {}
            if service_ids:
                params['ServiceIds'] = service_ids
            
            response = self.ec2.describe_vpc_endpoint_service_configurations(**params)
            
            services = []
            for service in response['ServiceConfigurations']:
                service_info = {
                    'service_id': service['ServiceId'],
                    'service_name': service['ServiceName'],
                    'service_state': service['ServiceState'],
                    'availability_zones': service.get('AvailabilityZones', []),
                    'network_load_balancer_arns': service.get('NetworkLoadBalancerArns', []),
                    'gateway_load_balancer_arns': service.get('GatewayLoadBalancerArns', []),
                    'acceptance_required': service.get('AcceptanceRequired', False),
                    'manages_vpc_endpoints': service.get('ManagesVpcEndpoints', False),
                    'private_dns_name': service.get('PrivateDnsName'),
                    'private_dns_name_configuration': service.get('PrivateDnsNameConfiguration', {}),
                    'base_endpoint_dns_names': service.get('BaseEndpointDnsNames', []),
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
    
    def describe_service_connections(self, service_id):
        """Describir conexiones del servicio"""
        
        try:
            response = self.ec2.describe_vpc_endpoint_connections(
                ServiceId=service_id
            )
            
            connections = []
            for connection in response['VpcEndpointConnections']:
                connection_info = {
                    'vpc_endpoint_id': connection['VpcEndpointId'],
                    'vpc_endpoint_owner': connection['VpcEndpointOwner'],
                    'creation_timestamp': connection['CreationTimestamp'],
                    'dns_entries': connection.get('DnsEntries', []),
                    'network_load_balancer_arns': connection.get('NetworkLoadBalancerArns', []),
                    'gateway_load_balancer_arns': connection.get('GatewayLoadBalancerArns', []),
                    'private_dns_name': connection.get('PrivateDnsName'),
                    'vpc_endpoint_state': connection['VpcEndpointState'],
                    'tags': connection.get('Tags', [])
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
    
    def create_network_load_balancer_for_privatelink(self, vpc_id, subnet_ids, 
                                                    service_name, target_group_arn):
        """Crear Network Load Balancer para PrivateLink"""
        
        try:
            lb_params = {
                'Name': f'nlb-{service_name}',
                'Type': 'network',
                'Scheme': 'internal',
                'Subnets': subnet_ids,
                'Tags': [
                    {'Key': 'Name', 'Value': f'nlb-{service_name}'},
                    {'Key': 'Purpose', 'Value': 'PrivateLink'},
                    {'Key': 'Service', 'Value': service_name}
                ]
            }
            
            response = self.elbv2.create_load_balancer(**lb_params)
            lb_arn = response['LoadBalancers'][0]['LoadBalancerArn']
            
            # Esperar a que el NLB esté disponible
            self.wait_for_load_balancer_available(lb_arn)
            
            # Crear listener
            listener_response = self.elbv2.create_listener(
                LoadBalancerArn=lb_arn,
                Protocol='TCP',
                Port=80,
                DefaultActions=[
                    {
                        'Type': 'forward',
                        'TargetGroupArn': target_group_arn
                    }
                ]
            )
            
            return {
                'success': True,
                'load_balancer_arn': lb_arn,
                'load_balancer_name': response['LoadBalancers'][0]['LoadBalancerName'],
                'dns_name': response['LoadBalancers'][0]['DNSName'],
                'listener_arn': listener_response['Listeners'][0]['ListenerArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_target_group_for_privatelink(self, service_name, vpc_id, 
                                          protocol='TCP', port=80):
        """Crear target group para PrivateLink"""
        
        try:
            tg_params = {
                'Name': f'tg-{service_name}',
                'Protocol': protocol,
                'Port': port,
                'VpcId': vpc_id,
                'TargetType': 'instance',
                'Tags': [
                    {'Key': 'Name', 'Value': f'tg-{service_name}'},
                    {'Key': 'Purpose', 'Value': 'PrivateLink'},
                    {'Key': 'Service', 'Value': service_name}
                ]
            }
            
            response = self.elbv2.create_target_group(**tg_params)
            target_group_arn = response['TargetGroups'][0]['TargetGroupArn']
            
            return {
                'success': True,
                'target_group_arn': target_group_arn,
                'target_group_name': response['TargetGroups'][0]['TargetGroupName']
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
    
    def wait_for_load_balancer_available(self, lb_arn, timeout=300):
        """Esperar a que load balancer esté disponible"""
        
        try:
            waiter = self.elbv2.get_waiter('load_balancer_available')
            waiter.wait(
                LoadBalancerArns=[lb_arn],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def get_service_id_from_endpoint(self, endpoint_id):
        """Obtener service ID desde endpoint ID"""
        
        try:
            response = self.ec2.describe_vpc_endpoints(
                VpcEndpointIds=[endpoint_id]
            )
            
            if response['VpcEndpoints']:
                return response['VpcEndpoints'][0]['ServiceName']
            else:
                return None
                
        except Exception as e:
            return None
    
    def delete_endpoint_service(self, service_id):
        """Eliminar servicio de endpoint"""
        
        try:
            self.ec2.delete_vpc_endpoint_service_configurations(
                ServiceIds=[service_id]
            )
            
            return {
                'success': True,
                'service_id': service_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def monitor_service_health(self, service_id):
        """Monitorear salud del servicio"""
        
        try:
            # Obtener conexiones del servicio
            connections_result = self.describe_service_connections(service_id)
            
            if not connections_result['success']:
                return connections_result
            
            connections = connections_result['connections']
            
            # Estadísticas de conexiones
            total_connections = len(connections)
            active_connections = len([c for c in connections if c['vpc_endpoint_state'] == 'available'])
            pending_connections = len([c for c in connections if c['vpc_endpoint_state'] == 'pendingAcceptance'])
            failed_connections = len([c for c in connections if c['vpc_endpoint_state'] == 'failed'])
            
            return {
                'success': True,
                'service_id': service_id,
                'total_connections': total_connections,
                'active_connections': active_connections,
                'pending_connections': pending_connections,
                'failed_connections': failed_connections,
                'health_status': 'healthy' if failed_connections == 0 else 'degraded'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Crear Servicio PrivateLink Propio**
```python
# Ejemplo: Crear servicio PrivateLink para aplicación interna
manager = PrivateLinkManager('us-east-1')

# Crear target group
tg_result = manager.create_target_group_for_privatelink(
    service_name='my-app-service',
    vpc_id='vpc-1234567890abcdef0',
    protocol='TCP',
    port=8080
)

if tg_result['success']:
    # Crear Network Load Balancer
    nlb_result = manager.create_network_load_balancer_for_privatelink(
        vpc_id='vpc-1234567890abcdef0',
        subnet_ids=['subnet-1234567890abcdef0', 'subnet-0987654321fedcba0'],
        service_name='my-app-service',
        target_group_arn=tg_result['target_group_arn']
    )
    
    if nlb_result['success']:
        # Crear servicio de endpoint
        service_result = manager.create_endpoint_service(
            network_load_balancer_arns=[nlb_result['load_balancer_arn']],
            acceptance_required=True,
            allowed_principals=['arn:aws:iam::123456789012:root'],
            private_dns_name='my-app-service.example.com'
        )
        
        if service_result['success']:
            print(f"PrivateLink service created: {service_result['service_id']}")
```

### **2. Conectar a Servicio PrivateLink**
```python
# Ejemplo: Conectar a servicio PrivateLink existente
connection_result = manager.create_private_link_connection(
    vpc_id='vpc-0987654321fedcba0',
    service_id='vpce-svc-1234567890abcdef0',
    subnet_ids=['subnet-0987654321fedcba0'],
    security_group_ids=['sg-0987654321fedcba0']
)

if connection_result['success']:
    print(f"PrivateLink connection established: {connection_result['endpoint_id']}")
```

### **3. Gestión de Permisos**
```python
# Ejemplo: Modificar permisos del servicio
permission_result = manager.modify_service_permissions(
    service_id='vpce-svc-1234567890abcdef0',
    add_principals=['arn:aws:iam::987654321098:root'],
    remove_principals=['arn:aws:iam::123456789012:root']
)

if permission_result['success']:
    print("Service permissions updated")
```

## Configuración con AWS CLI

### **Crear Servicio PrivateLink**
```bash
# Crear servicio de endpoint
aws ec2 create-vpc-endpoint-service-configuration \
  --network-load-balancer-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/my-nlb/1234567890abcdef0 \
  --acceptance-required \
  --private-dns-name my-service.example.com \
  --allowed-principals arn:aws:iam::123456789012:root

# Crear conexión al servicio
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-1234567890abcdef0 \
  --service-name com.amazonaws.vpce.us-east-1.vpce-svc-1234567890abcdef0 \
  --subnet-ids subnet-1234567890abcdef0 \
  --security-group-ids sg-1234567890abcdef0 \
  --private-dns-enabled
```

### **Gestionar Conexiones**
```bash
# Listar servicios
aws ec2 describe-vpc-endpoint-service-configurations

# Aceptar conexión
aws ec2 accept-vpc-endpoint-connections \
  --service-id vpce-svc-1234567890abcdef0 \
  --vpc-endpoint-ids vpce-1234567890abcdef0

# Rechazar conexión
aws ec2 reject-vpc-endpoint-connections \
  --service-id vpce-svc-1234567890abcdef0 \
  --vpc-endpoint-ids vpce-1234567890abcdef0
```

## Arquitecturas Comunes

### **1. Servicio Centralizado**
```
VPC Provider (Servicio)
├── Network Load Balancer
├── Target Group
├── Endpoint Service
└── PrivateLink Service

VPC Consumer (Cliente)
├── VPC Endpoint
├── Security Groups
└── Applications
```

### **2. Multi-Tenant**
```
Provider VPC
├── NLB por tenant
├── Target Groups separados
└── Endpoint Services

Consumer VPCs
├── VPC Endpoints
├── Security Groups específicos
└── Aplicaciones por tenant
```

## Best Practices

### **1. Diseño del Servicio**
- Usar Network Load Balancers internos
- Implementar health checks
- Configurar multi-AZ
- Monitorear rendimiento

### **2. Seguridad**
- Implementar acceptance_required
- Usar security groups restrictivos
- Rotar certificados regularmente
- Auditar conexiones

### **3. Gestión**
- Etiquetar todos los recursos
- Automatizar provisioning
- Implementar logging
- Configurar monitoreo

### **4. Rendimiento**
- Optimizar target groups
- Configurar connection draining
- Monitorear latencia
- Escalar horizontalmente

## Costos

### **Componentes de Costo**
- **Endpoint Service**: $0.01 por hora por AZ
- **VPC Endpoint**: $0.01 por hora por AZ
- **Data Processing**: $0.01 por GB
- **NLB**: Costos estándar de NLB

### **Optimización**
- Consolidar servicios cuando sea posible
- Usar endpoints compartidos
- Optimizar transferencia de datos
- Monitorear consumo

## Troubleshooting

### **Problemas Comunes**
1. **Conexión rechazada**: Verificar permisos del servicio
2. **DNS resolution**: Configurar DNS privado
3. **Health checks fallidos**: Revisar configuración de targets
4. **Timeout de conexión**: Optimizar configuración de red

### **Comandos de Diagnóstico**
```bash
# Verificar estado del servicio
aws ec2 describe-vpc-endpoint-service-configurations \
  --service-ids vpce-svc-1234567890abcdef0

# Verificar conexiones
aws ec2 describe-vpc-endpoint-connections \
  --service-id vpce-svc-1234567890abcdef0

# Verificar health checks
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/1234567890abcdef0
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/PrivateLink
- AWS/NetworkLoadBalancer
- Latencia de conexión
- Conexiones activas
- Errores de conexión

### **Alarmas Recomendadas**
- Endpoint unavailable
- High connection latency
- Connection errors
- NLB unhealthy hosts
