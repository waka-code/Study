# AWS Site-to-Site VPN y Direct Connect

## Site-to-Site VPN

### Definición

AWS Site-to-Site VPN crea una conexión segura y cifrada entre tu red corporativa (on-premises) y tu VPC en AWS. Utiliza el protocolo IPsec para establecer un túnel VPN a través de internet pública, proporcionando conectividad segura y confiable entre tus datacenters y la nube AWS.

### Características Principales

#### **Seguridad**
- Cifrado IPsec (AES-256)
- Autenticación múltiple
- Perfect Forward Secrecy
- Integración con IAM

#### **Alta Disponibilidad**
- Túneles redundantes
- Failover automático
- Multi-AZ support
- Health checks

#### **Flexibilidad**
- Soporte para múltiples gateways
- Routing dinámico (BGP)
- Routing estático
- Configuración personalizable

## Direct Connect

### Definición

AWS Direct Connect proporciona una conexión dedicada y privada entre tu red corporativa y AWS. A diferencia de VPN que utiliza internet pública, Direct Connect establece una conexión física dedicada que ofrece mayor ancho de banda, menor latencia y mayor seguridad.

### Características Principales

#### **Rendimiento**
- Conexión dedicada (1Gbps, 10Gbps, 100Gbps)
- Baja latencia consistente
- Ancho de banda garantizado
- Sin jitter

#### **Confiabilidad**
- SLA del 99.99%
- Conexión redundante
- Monitoreo proactivo
- Soporte 24/7

#### **Flexibilidad**
- Conexiones virtuales (VIFs)
- Direct Connect Gateway
- Hybrid networking
- Multi-region support

## Configuración de Site-to-Site VPN

### **Gestión de VPN Connections**
```python
import boto3
import json
from datetime import datetime, timedelta

class SiteToSiteVPNManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_customer_gateway(self, bgp_asn, public_ip, type_='ipsec.1', 
                                certificate_arn=None):
        """Crear customer gateway"""
        
        try:
            cgw_params = {
                'Type': type_,
                'PublicIp': public_ip,
                'BgpAsn': bgp_asn,
                'TagSpecifications': [
                    {
                        'ResourceType': 'customer-gateway',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'cgw-{bgp_asn}'},
                            {'Key': 'Type', 'Value': 'Site-to-Site VPN'}
                        ]
                    }
                ]
            }
            
            if certificate_arn:
                cgw_params['CertificateArn'] = certificate_arn
            
            response = self.ec2.create_customer_gateway(**cgw_params)
            cgw_id = response['CustomerGateway']['CustomerGatewayId']
            
            return {
                'success': True,
                'customer_gateway_id': cgw_id,
                'bgp_asn': bgp_asn,
                'public_ip': public_ip
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_virtual_private_gateway(self, vpc_id, amazon_side_asn=None):
        """Crear virtual private gateway"""
        
        try:
            vpg_params = {
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpn-gateway',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'vpg-{vpc_id}'},
                            {'Key': 'VPC', 'Value': vpc_id}
                        ]
                    }
                ]
            }
            
            if amazon_side_asn:
                vpg_params['AmazonSideAsn'] = amazon_side_asn
            
            response = self.ec2.create_vpn_gateway(**vpg_params)
            vpg_id = response['VpnGateway']['VpnGatewayId']
            
            # Adjuntar a VPC
            self.ec2.attach_vpn_gateway(
                VpcId=vpc_id,
                VpnGatewayId=vpg_id
            )
            
            # Esperar a que esté disponible
            self.wait_for_vpn_gateway_available(vpg_id)
            
            return {
                'success': True,
                'vpn_gateway_id': vpg_id,
                'vpc_id': vpc_id,
                'amazon_side_asn': amazon_side_asn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_vpn_connection(self, customer_gateway_id, vpn_gateway_id,
                            type_='ipsec.1', static_routes_only=False,
                            local_ipv4_network_cidr=None, remote_ipv4_network_cidr=None,
                            tunnel_options=None):
        """Crear conexión VPN"""
        
        try:
            vpn_params = {
                'CustomerGatewayId': customer_gateway_id,
                'VpnGatewayId': vpn_gateway_id,
                'Type': type_,
                'StaticRoutesOnly': static_routes_only,
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpn-connection',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'vpn-{customer_gateway_id}-{vpn_gateway_id}'},
                            {'Key': 'Type', 'Value': 'Site-to-Site VPN'}
                        ]
                    }
                ]
            }
            
            # Agregar opciones de túnel si se especifican
            if tunnel_options:
                vpn_params['VpnTunnelOptionsSpecifications'] = tunnel_options
            
            # Agregar configuración de rutas si se especifica
            if local_ipv4_network_cidr and remote_ipv4_network_cidr:
                vpn_params['LocalIpv4NetworkCidr'] = local_ipv4_network_cidr
                vpn_params['RemoteIpv4NetworkCidr'] = remote_ipv4_network_cidr
            
            response = self.ec2.create_vpn_connection(**vpn_params)
            vpn_connection_id = response['VpnConnection']['VpnConnectionId']
            
            # Esperar a que la conexión esté disponible
            self.wait_for_vpn_connection_available(vpn_connection_id)
            
            return {
                'success': True,
                'vpn_connection_id': vpn_connection_id,
                'customer_gateway_id': customer_gateway_id,
                'vpn_gateway_id': vpn_gateway_id,
                'state': response['VpnConnection']['State']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_vpn_connection_route(self, vpn_connection_id, destination_cidr_block):
        """Crear ruta para conexión VPN"""
        
        try:
            self.ec2.create_vpn_connection_route(
                VpnConnectionId=vpn_connection_id,
                DestinationCidrBlock=destination_cidr_block
            )
            
            return {
                'success': True,
                'vpn_connection_id': vpn_connection_id,
                'destination_cidr_block': destination_cidr_block
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_vpn_connection_route(self, vpn_connection_id, destination_cidr_block):
        """Eliminar ruta de conexión VPN"""
        
        try:
            self.ec2.delete_vpn_connection_route(
                VpnConnectionId=vpn_connection_id,
                DestinationCidrBlock=destination_cidr_block
            )
            
            return {
                'success': True,
                'vpn_connection_id': vpn_connection_id,
                'destination_cidr_block': destination_cidr_block
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_vpn_connections(self, vpn_connection_ids=None):
        """Describir conexiones VPN"""
        
        try:
            params = {}
            if vpn_connection_ids:
                params['VpnConnectionIds'] = vpn_connection_ids
            
            response = self.ec2.describe_vpn_connections(**params)
            
            connections = []
            for connection in response['VpnConnections']:
                connection_info = {
                    'vpn_connection_id': connection['VpnConnectionId'],
                    'customer_gateway_id': connection['CustomerGatewayId'],
                    'vpn_gateway_id': connection['VpnGatewayId'],
                    'state': connection['State'],
                    'type': connection['Type'],
                    'category': connection.get('Category', ''),
                    'static_routes_only': connection.get('StaticRoutesOnly', False),
                    'local_ipv4_network_cidr': connection.get('LocalIpv4NetworkCidr'),
                    'remote_ipv4_network_cidr': connection.get('RemoteIpv4NetworkCidr'),
                    'routes': connection.get('Routes', []),
                    'vgw_telemetry': connection.get('VgwTelemetry', []),
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
    
    def monitor_vpn_connection_health(self, vpn_connection_id):
        """Monitorear salud de conexión VPN"""
        
        try:
            response = self.ec2.describe_vpn_connections(
                VpnConnectionIds=[vpn_connection_id]
            )
            
            if not response['VpnConnections']:
                return {
                    'success': False,
                    'error': 'VPN connection not found'
                }
            
            connection = response['VpnConnections'][0]
            telemetry = connection.get('VgwTelemetry', [])
            
            # Analizar telemetría de túneles
            tunnel_status = []
            for tunnel in telemetry:
                tunnel_info = {
                    'tunnel_ip_address': tunnel.get('OutsideIpAddress'),
                    'status': tunnel.get('Status'),
                    'last_status_change': tunnel.get('LastStatusChange'),
                    'status_message': tunnel.get('StatusMessage'),
                    'accepted_route_count': tunnel.get('AcceptedRouteCount', 0)
                }
                tunnel_status.append(tunnel_info)
            
            # Calcular estado general
            active_tunnels = len([t for t in tunnel_status if t['status'] == 'UP'])
            total_tunnels = len(tunnel_status)
            
            health_status = 'healthy' if active_tunnels == total_tunnels else 'degraded'
            if active_tunnels == 0:
                health_status = 'unhealthy'
            
            return {
                'success': True,
                'vpn_connection_id': vpn_connection_id,
                'connection_state': connection['State'],
                'tunnel_status': tunnel_status,
                'active_tunnels': active_tunnels,
                'total_tunnels': total_tunnels,
                'health_status': health_status
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def wait_for_vpn_gateway_available(self, vpn_gateway_id, timeout=300):
        """Esperar a que VPN gateway esté disponible"""
        
        try:
            waiter = self.ec2.get_waiter('vpn_gateway_available')
            waiter.wait(
                VpnGatewayIds=[vpn_gateway_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def wait_for_vpn_connection_available(self, vpn_connection_id, timeout=300):
        """Esperar a que conexión VPN esté disponible"""
        
        try:
            waiter = self.ec2.get_waiter('vpn_connection_available')
            waiter.wait(
                VpnConnectionIds=[vpn_connection_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def delete_vpn_connection(self, vpn_connection_id):
        """Eliminar conexión VPN"""
        
        try:
            self.ec2.delete_vpn_connection(
                VpnConnectionId=vpn_connection_id
            )
            
            return {
                'success': True,
                'vpn_connection_id': vpn_connection_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_customer_gateway(self, customer_gateway_id):
        """Eliminar customer gateway"""
        
        try:
            self.ec2.delete_customer_gateway(
                CustomerGatewayId=customer_gateway_id
            )
            
            return {
                'success': True,
                'customer_gateway_id': customer_gateway_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Configuración de Direct Connect

### **Gestión de Direct Connect**
```python
class DirectConnectManager:
    def __init__(self, region='us-east-1'):
        self.dx = boto3.client('directconnect', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_direct_connect_gateway(self, amazon_side_asn=None):
        """Crear Direct Connect Gateway"""
        
        try:
            dcg_params = {
                'AmazonSideAsn': amazon_side_asn if amazon_side_asn else '64512'
            }
            
            response = self.dx.create_direct_connect_gateway(**dcg_params)
            gateway_id = response['directConnectGateway']['directConnectGatewayId']
            
            return {
                'success': True,
                'gateway_id': gateway_id,
                'amazon_side_asn': amazon_side_asn
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_private_virtual_interface(self, connection_id, direct_connect_gateway_id,
                                       new_private_virtual_interface_allocation):
        """Crear interfaz virtual privada"""
        
        try:
            vif_params = {
                'ConnectionId': connection_id,
                'DirectConnectGatewayId': direct_connect_gateway_id,
                'NewPrivateVirtualInterfaceAllocation': new_private_virtual_interface_allocation
            }
            
            response = self.dx.create_private_virtual_interface(**vif_params)
            virtual_interface_id = response['virtualInterface']['virtualInterfaceId']
            
            return {
                'success': True,
                'virtual_interface_id': virtual_interface_id,
                'connection_id': connection_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_public_virtual_interface(self, connection_id, new_public_virtual_interface_allocation):
        """Crear interfaz virtual pública"""
        
        try:
            vif_params = {
                'ConnectionId': connection_id,
                'NewPublicVirtualInterfaceAllocation': new_public_virtual_interface_allocation
            }
            
            response = self.dx.create_public_virtual_interface(**vif_params)
            virtual_interface_id = response['virtualInterface']['virtualInterfaceId']
            
            return {
                'success': True,
                'virtual_interface_id': virtual_interface_id,
                'connection_id': connection_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_direct_connect_gateways(self, gateway_id=None):
        """Describir Direct Connect Gateways"""
        
        try:
            params = {}
            if gateway_id:
                params['directConnectGatewayId'] = gateway_id
            
            response = self.dx.describe_direct_connect_gateways(**params)
            
            gateways = []
            for gateway in response['directConnectGateways']:
                gateway_info = {
                    'gateway_id': gateway['directConnectGatewayId'],
                    'gateway_name': gateway.get('directConnectGatewayName'),
                    'amazon_side_asn': gateway.get('amazonSideAsn'),
                    'owner_account': gateway.get('ownerAccount'),
                    'gateway_state': gateway.get('directConnectGatewayState'),
                    'virtual_gateways': gateway.get('virtualGateways', [])
                }
                gateways.append(gateway_info)
            
            return {
                'success': True,
                'gateways': gateways,
                'count': len(gateways)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_virtual_interfaces(self, connection_id=None):
        """Describir interfaces virtuales"""
        
        try:
            params = {}
            if connection_id:
                params['connectionId'] = connection_id
            
            response = self.dx.describe_virtual_interfaces(**params)
            
            virtual_interfaces = []
            for vif in response['virtualInterfaces']:
                vif_info = {
                    'virtual_interface_id': vif['virtualInterfaceId'],
                    'virtual_interface_name': vif.get('virtualInterfaceName'),
                    'virtual_interface_type': vif['virtualInterfaceType'],
                    'virtual_interface_state': vif['virtualInterfaceState'],
                    'connection_id': vif['connectionId'],
                    'owner_account': vif.get('ownerAccount'),
                    'amazon_address': vif.get('amazonAddress'),
                    'customer_address': vif.get('customerAddress'),
                    'asn': vif.get('asn'),
                    'vlan': vif.get('vlan'),
                    'bgp_peers': vif.get('bgpPeers', [])
                }
                virtual_interfaces.append(vif_info)
            
            return {
                'success': True,
                'virtual_interfaces': virtual_interfaces,
                'count': len(virtual_interfaces)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_virtual_interface(self, virtual_interface_id):
        """Eliminar interfaz virtual"""
        
        try:
            self.dx.delete_virtual_interface(
                virtualInterfaceId=virtual_interface_id
            )
            
            return {
                'success': True,
                'virtual_interface_id': virtual_interface_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_direct_connect_gateway(self, gateway_id):
        """Eliminar Direct Connect Gateway"""
        
        try:
            self.dx.delete_direct_connect_gateway(
                directConnectGatewayId=gateway_id
            )
            
            return {
                'success': True,
                'gateway_id': gateway_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def monitor_direct_connect_health(self, connection_id):
        """Monitorear salud de Direct Connect"""
        
        try:
            # Obtener detalles de la conexión
            connection_response = self.dx.describe_connections(
                connectionId=connection_id
            )
            
            if not connection_response['connections']:
                return {
                    'success': False,
                    'error': 'Direct Connect connection not found'
                }
            
            connection = connection_response['connections'][0]
            
            # Obtener interfaces virtuales
            vif_response = self.describe_virtual_interfaces(connection_id)
            
            if not vif_response['success']:
                return vif_response
            
            virtual_interfaces = vif_response['virtual_interfaces']
            
            # Analizar estado de interfaces
            active_vifs = len([v for v in virtual_interfaces if v['virtual_interface_state'] == 'available'])
            total_vifs = len(virtual_interfaces)
            
            health_status = 'healthy' if active_vifs == total_vifs else 'degraded'
            if active_vifs == 0:
                health_status = 'unhealthy'
            
            return {
                'success': True,
                'connection_id': connection_id,
                'connection_state': connection.get('connectionState'),
                'bandwidth': connection.get('bandwidth'),
                'virtual_interfaces': virtual_interfaces,
                'active_virtual_interfaces': active_vifs,
                'total_virtual_interfaces': total_vifs,
                'health_status': health_status
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Configuración Site-to-Site VPN Completa**
```python
# Ejemplo: Configurar VPN completa
vpn_manager = SiteToSiteVPNManager('us-east-1')

# Crear customer gateway
cgw_result = vpn_manager.create_customer_gateway(
    bgp_asn=65000,
    public_ip='203.0.113.1'
)

if cgw_result['success']:
    # Crear virtual private gateway
    vpg_result = vpn_manager.create_virtual_private_gateway(
        vpc_id='vpc-1234567890abcdef0',
        amazon_side_asn=64512
    )
    
    if vpg_result['success']:
        # Crear conexión VPN
        vpn_result = vpn_manager.create_vpn_connection(
            customer_gateway_id=cgw_result['customer_gateway_id'],
            vpn_gateway_id=vpg_result['vpn_gateway_id'],
            static_routes_only=False
        )
        
        if vpn_result['success']:
            # Agregar rutas
            route_result = vpn_manager.create_vpn_connection_route(
                vpn_connection_id=vpn_result['vpn_connection_id'],
                destination_cidr_block='192.168.0.0/16'
            )
            
            print(f"VPN connection established: {vpn_result['vpn_connection_id']}")
```

### **2. Configuración Direct Connect Gateway**
```python
# Ejemplo: Configurar Direct Connect
dx_manager = DirectConnectManager('us-east-1')

# Crear Direct Connect Gateway
dcg_result = dx_manager.create_direct_connect_gateway(
    amazon_side_asn=64512
)

if dcg_result['success']:
    # Configurar interfaz virtual privada
    vif_allocation = {
        'virtualInterfaceName': 'my-private-vif',
        'asn': 65000,
        'vlan': 100,
        'amazonAddress': '169.254.255.2',
        'customerAddress': '169.254.255.1',
        'addressFamily': 'ipv4',
        'bgpAsn': 65000,
        'bgpAuthKey': 'your-bgp-auth-key',
        'mtu': 1500
    }
    
    vif_result = dx_manager.create_private_virtual_interface(
        connection_id='dxcon-1234567890abcdef0',
        direct_connect_gateway_id=dcg_result['gateway_id'],
        new_private_virtual_interface_allocation=vif_allocation
    )
    
    if vif_result['success']:
        print(f"Direct Connect VIF created: {vif_result['virtual_interface_id']}")
```

## Configuración con AWS CLI

### **Site-to-Site VPN**
```bash
# Crear customer gateway
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip 203.0.113.1 \
  --bgp-asn 65000

# Crear virtual private gateway
aws ec2 create-vpn-gateway \
  --type ipsec.1 \
  --amazon-side-asn 64512

# Adjuntar gateway a VPC
aws ec2 attach-vpn-gateway \
  --vpc-id vpc-1234567890abcdef0 \
  --vpn-gateway-id vgw-1234567890abcdef0

# Crear conexión VPN
aws ec2 create-vpn-connection \
  --type ipsec.1 \
  --customer-gateway-id cgw-1234567890abcdef0 \
  --vpn-gateway-id vgw-1234567890abcdef0 \
  --options "StaticRoutesOnly=false"
```

### **Direct Connect**
```bash
# Crear Direct Connect Gateway
aws directconnect create-direct-connect-gateway \
  --amazon-side-asn 64512

# Crear interfaz virtual privada
aws directconnect create-private-virtual-interface \
  --connection-id dxcon-1234567890abcdef0 \
  --direct-connect-gateway-id dxgw-1234567890abcdef0 \
  --new-private-virtual-interface-allocation file://vif-config.json
```

## Comparación: VPN vs Direct Connect

### **Site-to-Site VPN**
| Característica | Descripción |
|----------------|-------------|
| **Conexión** | Sobre internet pública |
| **Velocidad** | Hasta 1.25 Gbps |
| **Latencia** | Variable |
| **Costo** | Por hora + datos |
| **Setup** | Rápido (minutos) |
| **SLA** | 99.9% |

### **Direct Connect**
| Característica | Descripción |
|----------------|-------------|
| **Conexión** | Dedicada física |
| **Velocidad** | 1Gbps - 100Gbps |
| **Latencia** | Consistente y baja |
| **Costo** | Port + horas + datos |
| **Setup** | Días/semanas |
| **SLA** | 99.99% |

## Best Practices

### **Site-to-Site VPN**
1. **Redundancia**: Configurar siempre dos túneles
2. **BGP**: Usar BGP para routing dinámico
3. **Monitoreo**: Configurar alarmas de salud
4. **Security**: Implementar firewall rules
5. **Optimización**: Tunear MTU y MSS

### **Direct Connect**
1. **Redundancia**: Múltiples conexiones
2. **Capacity Planning**: Dimensionar correctamente
3. **Monitoring**: Health checks proactivos
4. **Security**: Segmentar con VIFs
5. **Cost Optimization**: Usar hosted connections

## Costos

### **Site-to-Site VPN**
- **VPN Connection**: $0.05 por hora
- **Data Transfer**: $0.02-0.05 por GB
- **Customer Gateway**: Sin costo

### **Direct Connect**
- **Connection Hours**: $0.30-2.11 por hora
- **Data Transfer**: $0.01-0.02 por GB
- **Port Hours**: $0.30-2.11 por hora
- **Cross-Connect**: Costos de partner

## Troubleshooting

### **VPN Issues**
1. **Tunnel Down**: Verificar configuración de firewall
2. **BGP Issues**: Revisar ASN y routing
3. **MTU Problems**: Ajustar MTU/MSS
4. **Performance**: Optimizar routing y QoS

### **Direct Connect Issues**
1. **Physical Layer**: Verificar cables y SFPs
2. **BGP Session**: Revisar configuración de peers
3. **VIF Issues**: Validar VLAN y addressing
4. **Performance**: Monitorear utilization

## Monitoreo

### **Métricas CloudWatch**
- AWS/VPN: TunnelState, DataIn, DataOut
- AWS/DirectConnect: ConnectionErrorCount, OpticalRxPower
- Latency y jitter
- Packet loss

### **Alarmas Recomendadas**
- VPN tunnel down
- Direct Connect link down
- High latency
- BGP session down
