# AWS Client VPN

## Definición

AWS Client VPN es un servicio VPN gestionado que permite a los usuarios remotos acceder de forma segura a recursos en AWS y redes on-premises. Utiliza el protocolo OpenVPN para proporcionar conectividad segura y cifrada para clientes individuales, permitiendo el acceso remoto seguro a aplicaciones y recursos en tu VPC.

## Características Principales

### **Seguridad**
- Cifrado TLS con certificados mutuos
- Autenticación multi-factor (MFA)
- Integración con AWS Directory Service
- Control de acceso granular

### **Escalabilidad**
- Soporte para miles de clientes simultáneos
- Auto-scaling automático
- Distribución multi-AZ
- High availability

### **Gestión Centralizada**
- Consola de administración
- Logging y monitoreo
- Políticas de acceso
- Gestión de clientes

## Componentes Clave

### **1. Client VPN Endpoint**
- Punto de acceso principal para clientes
- Configuración de red y seguridad
- Gestión de autenticación
- Logging y monitoreo

### **2. Authorization Rules**
- Control de acceso a redes
- Políticas por grupo de clientes
- Segmentación de red
- Gestión de permisos

### **3. Client VPN Connections**
- Conexiones individuales de clientes
- Sesiones activas
- Monitoreo de estado
- Gestión de dispositivos

## Configuración de Client VPN

### **Gestión de Client VPN**
```python
import boto3
import json
from datetime import datetime, timedelta

class ClientVPNManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.acm = boto3.client('acm', region_name=region)
        self.logs = boto3.client('logs', region_name=region)
        self.region = region
    
    def create_client_vpn_endpoint(self, vpc_id, server_certificate_arn,
                                 client_cidr_block, authentication_options,
                                 connection_log_options=None, dns_servers=None,
                                 transport_protocol='udp', vpn_port=443,
                                 split_tunnel=True):
        """Crear Client VPN endpoint"""
        
        try:
            endpoint_params = {
                'VpcId': vpc_id,
                'ServerCertificateArn': server_certificate_arn,
                'ClientCidrBlock': client_cidr_block,
                'AuthenticationOptions': authentication_options,
                'ConnectionLogOptions': connection_log_options or {
                    'Enabled': True,
                    'CloudWatchLogGroup': f'/aws/clientvpn/{vpc_id}'
                },
                'TransportProtocol': transport_protocol,
                'VpnPort': vpn_port,
                'SplitTunnel': split_tunnel,
                'TagSpecifications': [
                    {
                        'ResourceType': 'client-vpn-endpoint',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'client-vpn-{vpc_id}'},
                            {'Key': 'VPC', 'Value': vpc_id}
                        ]
                    }
                ]
            }
            
            # Agregar servidores DNS si se especifican
            if dns_servers:
                endpoint_params['DnsServers'] = dns_servers
            
            response = self.ec2.create_client_vpn_endpoint(**endpoint_params)
            endpoint_id = response['ClientVpnEndpointId']
            
            # Esperar a que el endpoint esté disponible
            self.wait_for_client_vpn_endpoint_available(endpoint_id)
            
            return {
                'success': True,
                'endpoint_id': endpoint_id,
                'vpc_id': vpc_id,
                'client_cidr_block': client_cidr_block,
                'transport_protocol': transport_protocol
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_client_vpn_target_network(self, client_vpn_endpoint_id, subnet_id):
        """Asociar endpoint a subnet"""
        
        try:
            response = self.ec2.associate_client_vpn_target_network(
                ClientVpnEndpointId=client_vpn_endpoint_id,
                SubnetId=subnet_id
            )
            
            association_id = response['AssociationId']
            
            # Esperar a que la asociación esté disponible
            self.wait_for_client_vpn_target_network_association_available(
                client_vpn_endpoint_id, association_id
            )
            
            return {
                'success': True,
                'association_id': association_id,
                'client_vpn_endpoint_id': client_vpn_endpoint_id,
                'subnet_id': subnet_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_client_vpn_authorization_rule(self, client_vpn_endpoint_id,
                                           target_network_cidr, authorize_all_groups=True,
                                           access_group_id=None):
        """Crear regla de autorización"""
        
        try:
            rule_params = {
                'ClientVpnEndpointId': client_vpn_endpoint_id,
                'TargetNetworkCidr': target_network_cidr,
                'AuthorizeAllGroups': authorize_all_groups
            }
            
            if not authorize_all_groups and access_group_id:
                rule_params['AccessGroupId'] = access_group_id
            
            self.ec2.create_client_vpn_authorization_rule(**rule_params)
            
            return {
                'success': True,
                'client_vpn_endpoint_id': client_vpn_endpoint_id,
                'target_network_cidr': target_network_cidr,
                'authorize_all_groups': authorize_all_groups
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_client_vpn_route(self, client_vpn_endpoint_id, destination_cidr_block,
                              target_vpc_subnet_id=None):
        """Crear ruta en Client VPN"""
        
        try:
            route_params = {
                'ClientVpnEndpointId': client_vpn_endpoint_id,
                'DestinationCidrBlock': destination_cidr_block
            }
            
            if target_vpc_subnet_id:
                route_params['TargetVpcSubnetId'] = target_vpc_subnet_id
            
            self.ec2.create_client_vpn_route(**route_params)
            
            return {
                'success': True,
                'client_vpn_endpoint_id': client_vpn_endpoint_id,
                'destination_cidr_block': destination_cidr_block
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def revoke_client_vpn_authorization_rule(self, client_vpn_endpoint_id,
                                           target_network_cidr, revoke_all_groups=True,
                                           access_group_id=None):
        """Revocar regla de autorización"""
        
        try:
            rule_params = {
                'ClientVpnEndpointId': client_vpn_endpoint_id,
                'TargetNetworkCidr': target_network_cidr,
                'RevokeAllGroups': revoke_all_groups
            }
            
            if not revoke_all_groups and access_group_id:
                rule_params['AccessGroupId'] = access_group_id
            
            self.ec2.revoke_client_vpn_authorization_rule(**rule_params)
            
            return {
                'success': True,
                'client_vpn_endpoint_id': client_vpn_endpoint_id,
                'target_network_cidr': target_network_cidr_block
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_client_vpn_route(self, client_vpn_endpoint_id, destination_cidr_block):
        """Eliminar ruta de Client VPN"""
        
        try:
            self.ec2.delete_client_vpn_route(
                ClientVpnEndpointId=client_vpn_endpoint_id,
                DestinationCidrBlock=destination_cidr_block
            )
            
            return {
                'success': True,
                'client_vpn_endpoint_id': client_vpn_endpoint_id,
                'destination_cidr_block': destination_cidr_block
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_client_vpn_endpoints(self, endpoint_ids=None):
        """Describir Client VPN endpoints"""
        
        try:
            params = {}
            if endpoint_ids:
                params['ClientVpnEndpointIds'] = endpoint_ids
            
            response = self.ec2.describe_client_vpn_endpoints(**params)
            
            endpoints = []
            for endpoint in response['ClientVpnEndpoints']:
                endpoint_info = {
                    'client_vpn_endpoint_id': endpoint['ClientVpnEndpointId'],
                    'description': endpoint.get('Description'),
                    'status': endpoint['Status'],
                    'creation_time': endpoint['CreationTime'],
                    'dns_name': endpoint.get('DnsName'),
                    'client_cidr_block': endpoint.get('ClientCidrBlock'),
                    'server_certificate_arn': endpoint.get('ServerCertificateArn'),
                    'authentication_options': endpoint.get('AuthenticationOptions', []),
                    'connection_log_options': endpoint.get('ConnectionLogOptions', {}),
                    'transport_protocol': endpoint.get('TransportProtocol'),
                    'vpn_port': endpoint.get('VpnPort'),
                    'split_tunnel': endpoint.get('SplitTunnel'),
                    'security_group_ids': endpoint.get('SecurityGroupIds', []),
                    'vpc_id': endpoint.get('VpcId'),
                    'dns_servers': endpoint.get('DnsServers', []),
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
    
    def describe_client_vpn_connections(self, client_vpn_endpoint_id):
        """Describir conexiones de clientes"""
        
        try:
            response = self.ec2.describe_client_vpn_connections(
                ClientVpnEndpointId=client_vpn_endpoint_id
            )
            
            connections = []
            for connection in response['Connections']:
                connection_info = {
                    'client_vpn_endpoint_id': connection['ClientVpnEndpointId'],
                    'connection_id': connection['ConnectionId'],
                    'username': connection.get('Username'),
                    'status': connection['Status'],
                    'connection_end_time': connection.get('ConnectionEndTime'),
                    'connection_start_time': connection.get('ConnectionStartTime'),
                    'client_ip': connection.get('ClientIp'),
                    'common_name': connection.get('CommonName'),
                    'egress_bytes': connection.get('EgressBytes'),
                    'ingress_bytes': connection.get('IngressBytes'),
                    'timestamp': connection.get('Timestamp')
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
    
    def describe_client_vpn_target_networks(self, client_vpn_endpoint_id):
        """Describir redes asociadas"""
        
        try:
            response = self.ec2.describe_client_vpn_target_networks(
                ClientVpnEndpointId=client_vpn_endpoint_id
            )
            
            target_networks = []
            for network in response['ClientVpnTargetNetworks']:
                network_info = {
                    'client_vpn_endpoint_id': network['ClientVpnEndpointId'],
                    'association_id': network['AssociationId'],
                    'vpc_id': network.get('VpcId'),
                    'subnet_id': network.get('SubnetId'),
                    'status': network['Status']
                }
                target_networks.append(network_info)
            
            return {
                'success': True,
                'target_networks': target_networks,
                'count': len(target_networks)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_client_vpn_client_configuration(self, client_vpn_endpoint_id):
        """Exportar configuración de cliente"""
        
        try:
            response = self.ec2.export_client_vpn_client_configuration(
                ClientVpnEndpointId=client_vpn_endpoint_id
            )
            
            return {
                'success': True,
                'client_configuration': response['ClientConfiguration'],
                'client_vpn_endpoint_id': client_vpn_endpoint_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def terminate_client_vpn_connections(self, client_vpn_endpoint_id,
                                       connection_id=None, username=None):
        """Terminar conexiones de clientes"""
        
        try:
            params = {
                'ClientVpnEndpointId': client_vpn_endpoint_id
            }
            
            if connection_id:
                params['ConnectionId'] = connection_id
            elif username:
                params['Username'] = username
            
            self.ec2.terminate_client_vpn_connections(**params)
            
            return {
                'success': True,
                'client_vpn_endpoint_id': client_vpn_endpoint_id,
                'connection_id': connection_id,
                'username': username
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_client_vpn_endpoint(self, client_vpn_endpoint_id):
        """Eliminar Client VPN endpoint"""
        
        try:
            self.ec2.delete_client_vpn_endpoint(
                ClientVpnEndpointId=client_vpn_endpoint_id
            )
            
            return {
                'success': True,
                'client_vpn_endpoint_id': client_vpn_endpoint_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def monitor_client_vpn_health(self, client_vpn_endpoint_id):
        """Monitorear salud del Client VPN"""
        
        try:
            # Obtener detalles del endpoint
            endpoint_response = self.describe_client_vpn_endpoints([client_vpn_endpoint_id])
            
            if not endpoint_response['success'] or not endpoint_response['endpoints']:
                return {
                    'success': False,
                    'error': 'Client VPN endpoint not found'
                }
            
            endpoint = endpoint_response['endpoints'][0]
            
            # Obtener conexiones activas
            connections_response = self.describe_client_vpn_connections(client_vpn_endpoint_id)
            
            if not connections_response['success']:
                return connections_response
            
            connections = connections_response['connections']
            
            # Analizar estado
            active_connections = len([c for c in connections if c['status']['Code'] == 'active'])
            total_connections = len(connections)
            
            # Obtener redes asociadas
            networks_response = self.describe_client_vpn_target_networks(client_vpn_endpoint_id)
            
            if networks_response['success']:
                active_networks = len([n for n in networks_response['target_networks'] 
                                     if n['status']['Code'] == 'active'])
                total_networks = len(networks_response['target_networks'])
            else:
                active_networks = 0
                total_networks = 0
            
            # Calcular estado general
            health_status = 'healthy'
            if endpoint['status']['Code'] != 'available':
                health_status = 'unhealthy'
            elif active_networks == 0:
                health_status = 'degraded'
            
            return {
                'success': True,
                'client_vpn_endpoint_id': client_vpn_endpoint_id,
                'endpoint_status': endpoint['status'],
                'active_connections': active_connections,
                'total_connections': total_connections,
                'active_networks': active_networks,
                'total_networks': total_networks,
                'health_status': health_status
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def wait_for_client_vpn_endpoint_available(self, endpoint_id, timeout=600):
        """Esperar a que endpoint esté disponible"""
        
        try:
            waiter = self.ec2.get_waiter('client_vpn_endpoint_available')
            waiter.wait(
                ClientVpnEndpointIds=[endpoint_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def wait_for_client_vpn_target_network_association_available(self, endpoint_id, 
                                                                association_id, timeout=300):
        """Esperar a que asociación de red esté disponible"""
        
        try:
            waiter = self.ec2.get_waiter('client_vpn_target_network_association_available')
            waiter.wait(
                ClientVpnEndpointId=endpoint_id,
                AssociationIds=[association_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def create_authentication_options(self, type_='certificate-auth', 
                                    active_directory_id=None,
                                    mutual_authentication=None):
        """Crear opciones de autenticación"""
        
        auth_options = [{
            'Type': type_
        }]
        
        if type_ == 'directory-service-authentication' and active_directory_id:
            auth_options[0]['ActiveDirectoryId'] = active_directory_id
        elif type_ == 'certificate-auth' and mutual_authentication:
            auth_options[0]['MutualAuthentication'] = mutual_authentication
        
        return auth_options
    
    def create_mutual_authentication(self, client_certificate_arn):
        """Crear configuración de autenticación mutua"""
        
        return {
            'ClientRootCertificateChainArn': client_certificate_arn
        }
```

## Casos de Uso

### **1. Configuración Completa de Client VPN**
```python
# Ejemplo: Configurar Client VPN completo
manager = ClientVPNManager('us-east-1')

# Opciones de autenticación
auth_options = manager.create_authentication_options(
    type_='certificate-auth',
    mutual_authentication=manager.create_mutual_authentication(
        client_certificate_arn='arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
    )
)

# Opciones de logging
connection_log_options = {
    'Enabled': True,
    'CloudWatchLogGroup': '/aws/clientvpn/my-company',
    'CloudWatchLogStream': 'connection-logs'
}

# Crear Client VPN endpoint
endpoint_result = manager.create_client_vpn_endpoint(
    vpc_id='vpc-1234567890abcdef0',
    server_certificate_arn='arn:aws:acm:us-east-1:123456789012:certificate/87654321-4321-4321-4321-210987654321',
    client_cidr_block='172.16.0.0/22',
    authentication_options=auth_options,
    connection_log_options=connection_log_options,
    dns_servers=['8.8.8.8', '8.8.4.4'],
    transport_protocol='udp',
    vpn_port=443,
    split_tunnel=True
)

if endpoint_result['success']:
    endpoint_id = endpoint_result['endpoint_id']
    
    # Asociar a subnets
    subnet_association = manager.associate_client_vpn_target_network(
        client_vpn_endpoint_id=endpoint_id,
        subnet_id='subnet-1234567890abcdef0'
    )
    
    if subnet_association['success']:
        # Crear regla de autorización
        auth_rule = manager.create_client_vpn_authorization_rule(
            client_vpn_endpoint_id=endpoint_id,
            target_network_cidr='10.0.0.0/16',
            authorize_all_groups=True
        )
        
        if auth_rule['success']:
            # Crear ruta para internet
            route_result = manager.create_client_vpn_route(
                client_vpn_endpoint_id=endpoint_id,
                destination_cidr_block='0.0.0.0/0'
            )
            
            print(f"Client VPN configured: {endpoint_id}")
```

### **2. Monitoreo y Gestión de Conexiones**
```python
# Ejemplo: Monitorear conexiones activas
health_result = manager.monitor_client_vpn_health('cvpn-endpoint-1234567890abcdef0')

if health_result['success']:
    print(f"Active connections: {health_result['active_connections']}")
    print(f"Health status: {health_result['health_status']}")

# Obtener configuración de cliente
config_result = manager.export_client_vpn_client_configuration('cvpn-endpoint-1234567890abcdef0')

if config_result['success']:
    # Guardar configuración para clientes
    with open('client-config.ovpn', 'w') as f:
        f.write(config_result['client_configuration'])
    print("Client configuration exported")
```

## Configuración con AWS CLI

### **Crear Client VPN Endpoint**
```bash
# Crear endpoint
aws ec2 create-client-vpn-endpoint \
  --client-cidr-block 172.16.0.0/22 \
  --server-certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012 \
  --authentication-options Type=certificate-auth,MutualAuthentication={ClientRootCertificateChainArn=arn:aws:acm:us-east-1:123456789012:certificate/87654321-4321-4321-4321-210987654321} \
  --connection-log-options Enabled=true,CloudWatchLogGroup=/aws/clientvpn/my-company \
  --dns-servers 8.8.8.8 8.8.4.4 \
  --split-tunnel \
  --transport-protocol udp \
  --vpn-port 443

# Asociar a subnet
aws ec2 associate-client-vpn-target-network \
  --client-vpn-endpoint-id cvpn-endpoint-1234567890abcdef0 \
  --subnet-id subnet-1234567890abcdef0

# Crear regla de autorización
aws ec2 create-client-vpn-authorization-rule \
  --client-vpn-endpoint-id cvpn-endpoint-1234567890abcdef0 \
  --target-network-cidr 10.0.0.0/16 \
  --authorize-all-groups

# Crear ruta
aws ec2 create-client-vpn-route \
  --client-vpn-endpoint-id cvpn-endpoint-1234567890abcdef0 \
  --destination-cidr-block 0.0.0.0/0
```

### **Gestión de Conexiones**
```bash
# Describir endpoints
aws ec2 describe-client-vpn-endpoints \
  --client-vpn-endpoint-ids cvpn-endpoint-1234567890abcdef0

# Describir conexiones
aws ec2 describe-client-vpn-connections \
  --client-vpn-endpoint-id cvpn-endpoint-1234567890abcdef0

# Exportar configuración de cliente
aws ec2 export-client-vpn-client-configuration \
  --client-vpn-endpoint-id cvpn-endpoint-1234567890abcdef0

# Terminar conexión
aws ec2 terminate-client-vpn-connections \
  --client-vpn-endpoint-id cvpn-endpoint-1234567890abcdef0 \
  --connection-id cvpn-conn-1234567890abcdef0
```

## Configuración de Cliente

### **OpenVPN Client Configuration**
```ini
# Archivo de configuración de cliente
client
dev tun
proto udp
remote your-vpn-endpoint.prod.clientvpn.amazonaws.com 443
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-CBC
auth SHA256
comp-lzo no
verb 3
auth-user-pass
<ca>
-----BEGIN CERTIFICATE-----
# Contenido del certificado CA
-----END CERTIFICATE-----
</ca>
<cert>
-----BEGIN CERTIFICATE-----
# Contenido del certificado de cliente
-----END CERTIFICATE-----
</cert>
<key>
-----BEGIN PRIVATE KEY-----
# Contenido de la clave privada
-----END PRIVATE KEY-----
</key>
```

## Best Practices

### **1. Seguridad**
- Usar certificados TLS válidos
- Implementar MFA cuando sea posible
- Segmentar red con reglas específicas
- Rotar certificados regularmente

### **2. Rendimiento**
- Usar split tunneling para reducir tráfico
- Configurar DNS apropiado
- Monitorear utilización de ancho de banda
- Optimizar MTU para UDP

### **3. Gestión**
- Implementar logging completo
- Configurar alarmas de monitoreo
- Documentar configuración
- Automatizar provisioning

### **4. Escalabilidad**
- Desplegar en múltiples AZs
- Configurar auto-scaling
- Balancear carga de conexiones
- Optimizar routing

## Costos

### **Componentes de Costo**
- **Client VPN Endpoint**: $0.05 por hora
- **Association**: $0.02 por hora por asociación
- **Data Transfer**: $0.01-0.05 por GB
- **Logging**: Costos estándar de CloudWatch

### **Optimización**
- Deshabilitar logging si no es necesario
- Usar split tunneling
- Optimizar número de asociaciones
- Monitorear consumo de datos

## Troubleshooting

### **Problemas Comunes**
1. **Conexión fallida**: Verificar certificados y autenticación
2. **Sin acceso a recursos**: Revisar reglas de autorización
3. **DNS issues**: Configurar servidores DNS correctos
4. **Performance lenta**: Optimizar MTU y protocolo

### **Comandos de Diagnóstico**
```bash
# Verificar estado del endpoint
aws ec2 describe-client-vpn-endpoints \
  --client-vpn-endpoint-ids cvpn-endpoint-1234567890abcdef0

# Verificar conexiones
aws ec2 describe-client-vpn-connections \
  --client-vpn-endpoint-id cvpn-endpoint-1234567890abcdef0

# Verificar logs
aws logs describe-log-groups \
  --log-group-name-prefix /aws/clientvpn

# Test de conectividad
ping 10.0.1.10  # Desde cliente VPN
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/ClientVPN
- ActiveConnections
- EgressBytes
- IngressBytes
- ConnectionErrors

### **Alarmas Recomendadas**
- Endpoint unavailable
- High connection count
- Connection errors
- High bandwidth utilization
