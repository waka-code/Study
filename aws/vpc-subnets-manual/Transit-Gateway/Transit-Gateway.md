# AWS Transit Gateway

## Definición

AWS Transit Gateway es un servicio de red centralizado que simplifica la conectividad entre miles de VPCs, on-premises networks, y otras redes en una sola gateway. Actúa como un hub central en una arquitectura hub-and-spoke, eliminando la necesidad de conexiones peer-to-peer complejas y reduciendo la sobrecarga de gestión de red.

## Características Principales

### **Centralización**
- Hub central para todas las conexiones
- Gestión simplificada de routing
- Políticas centralizadas
- Reducción de conexiones point-to-point

### **Escalabilidad**
- Soporte para hasta 5,000 VPC attachments
- 50 Gbps de ancho de banda por attachment
- Auto-scaling automático
- Multi-region support

### **Flexibilidad**
- Soporte para múltiples tipos de attachments
- Routing dinámico y estático
- Integración con Direct Connect y VPN
- Control granular de acceso

## Componentes Clave

### **1. Transit Gateway**
- Hub central de red
- Tablas de routing
- Políticas de acceso
- Configuración global

### **2. Attachments**
- VPC attachments
- VPN attachments
- Direct Connect attachments
- Connect attachments

### **3. Route Tables**
- Tablas de routing por attachment
- Propagación automática
- Filtros de routing
- Control de acceso

### **4. Peering**
- Transit Gateway peering
- Cross-region connectivity
- Multi-account sharing
- Global networking

## Configuración de Transit Gateway

### **Gestión de Transit Gateway**
```python
import boto3
import json
from datetime import datetime, timedelta

class TransitGatewayManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_transit_gateway(self, amazon_side_asn=None, auto_accept_shared_attachments='enable',
                              default_route_table_association='enable',
                              default_route_table_propagation='enable',
                              vpn_ecmp_support='enable', dns_support='enable'):
        """Crear Transit Gateway"""
        
        try:
            tgw_params = {
                'AmazonSideAsn': amazon_side_asn if amazon_side_asn else '64512',
                'AutoAcceptSharedAttachments': auto_accept_shared_attachments,
                'DefaultRouteTableAssociation': default_route_table_association,
                'DefaultRouteTablePropagation': default_route_table_propagation,
                'VpnEcmpSupport': vpn_ecmp_support,
                'DnsSupport': dns_support,
                'TagSpecifications': [
                    {
                        'ResourceType': 'transit-gateway',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'tgw-{self.region}'},
                            {'Key': 'Environment', 'Value': 'production'}
                        ]
                    }
                ]
            }
            
            response = self.ec2.create_transit_gateway(**tgw_params)
            tgw_id = response['TransitGateway']['TransitGatewayId']
            
            # Esperar a que esté disponible
            self.wait_for_transit_gateway_available(tgw_id)
            
            return {
                'success': True,
                'transit_gateway_id': tgw_id,
                'amazon_side_asn': amazon_side_asn,
                'state': response['TransitGateway']['State']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_transit_gateway_vpc_attachment(self, transit_gateway_id, vpc_id, 
                                             subnet_ids, dns_support='enable',
                                             ipv6_support='disable'):
        """Crear attachment de VPC"""
        
        try:
            attachment_params = {
                'TransitGatewayId': transit_gateway_id,
                'VpcId': vpc_id,
                'SubnetIds': subnet_ids,
                'Options': {
                    'DnsSupport': dns_support,
                    'Ipv6Support': ipv6_support
                },
                'TagSpecifications': [
                    {
                        'ResourceType': 'transit-gateway-attachment',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'tgw-attach-{vpc_id}'},
                            {'Key': 'VPC', 'Value': vpc_id}
                        ]
                    }
                ]
            }
            
            response = self.ec2.create_transit_gateway_vpc_attachment(**attachment_params)
            attachment_id = response['TransitGatewayVpcAttachment']['TransitGatewayAttachmentId']
            
            # Esperar a que el attachment esté disponible
            self.wait_for_transit_gateway_attachment_available(attachment_id)
            
            return {
                'success': True,
                'attachment_id': attachment_id,
                'transit_gateway_id': transit_gateway_id,
                'vpc_id': vpc_id,
                'subnet_ids': subnet_ids
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_transit_gateway_vpn_attachment(self, transit_gateway_id, vpn_connection_id):
        """Crear attachment de VPN"""
        
        try:
            attachment_params = {
                'TransitGatewayId': transit_gateway_id,
                'VpnConnectionId': vpn_connection_id,
                'TagSpecifications': [
                    {
                        'ResourceType': 'transit-gateway-attachment',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'tgw-vpn-{vpn_connection_id}'},
                            {'Key': 'Type', 'Value': 'VPN'}
                        ]
                    }
                ]
            }
            
            response = self.ec2.create_transit_gateway_vpn_attachment(**attachment_params)
            attachment_id = response['TransitGatewayVpnAttachment']['TransitGatewayAttachmentId']
            
            return {
                'success': True,
                'attachment_id': attachment_id,
                'transit_gateway_id': transit_gateway_id,
                'vpn_connection_id': vpn_connection_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_transit_gateway_route_table(self, transit_gateway_id):
        """Crear tabla de routing"""
        
        try:
            response = self.ec2.create_transit_gateway_route_table(
                TransitGatewayId=transit_gateway_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'transit-gateway-route-table',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'tgw-rt-{transit_gateway_id}'}
                        ]
                    }
                ]
            )
            
            route_table_id = response['TransitGatewayRouteTable']['TransitGatewayRouteTableId']
            
            return {
                'success': True,
                'route_table_id': route_table_id,
                'transit_gateway_id': transit_gateway_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_transit_gateway_route(self, transit_gateway_route_table_id, 
                                    destination_cidr_block, transit_gateway_attachment_id=None,
                                    blackhole=False):
        """Crear ruta en tabla de routing"""
        
        try:
            route_params = {
                'TransitGatewayRouteTableId': transit_gateway_route_table_id,
                'DestinationCidrBlock': destination_cidr_block
            }
            
            if transit_gateway_attachment_id:
                route_params['TransitGatewayAttachmentId'] = transit_gateway_attachment_id
            
            if blackhole:
                route_params['Blackhole'] = True
            
            self.ec2.create_transit_gateway_route(**route_params)
            
            return {
                'success': True,
                'route_table_id': transit_gateway_route_table_id,
                'destination_cidr_block': destination_cidr_block,
                'attachment_id': transit_gateway_attachment_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_transit_gateway_route_table(self, transit_gateway_route_table_id,
                                           transit_gateway_attachment_id):
        """Asociar attachment a tabla de routing"""
        
        try:
            response = self.ec2.associate_transit_gateway_route_table(
                TransitGatewayRouteTableId=transit_gateway_route_table_id,
                TransitGatewayAttachmentId=transit_gateway_attachment_id
            )
            
            association_id = response['Association']['TransitGatewayAttachmentId']
            
            return {
                'success': True,
                'association_id': association_id,
                'route_table_id': transit_gateway_route_table_id,
                'attachment_id': transit_gateway_attachment_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_transit_gateway_route_table_propagation(self, transit_gateway_route_table_id,
                                                      transit_gateway_attachment_id):
        """Habilitar propagación de rutas"""
        
        try:
            response = self.ec2.enable_transit_gateway_route_table_propagation(
                TransitGatewayRouteTableId=transit_gateway_route_table_id,
                TransitGatewayAttachmentId=transit_gateway_attachment_id
            )
            
            propagation_id = response['Propagation']['TransitGatewayAttachmentId']
            
            return {
                'success': True,
                'propagation_id': propagation_id,
                'route_table_id': transit_gateway_route_table_id,
                'attachment_id': transit_gateway_attachment_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_transit_gateway_peering_attachment(self, transit_gateway_id, 
                                                 peer_transit_gateway_id,
                                                 peer_account_id, peer_region=None):
        """Crear peering attachment"""
        
        try:
            peering_params = {
                'TransitGatewayId': transit_gateway_id,
                'PeerTransitGatewayId': peer_transit_gateway_id,
                'PeerAccountId': peer_account_id,
                'TagSpecifications': [
                    {
                        'ResourceType': 'transit-gateway-attachment',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'tgw-peering-{transit_gateway_id}-{peer_transit_gateway_id}'},
                            {'Key': 'Type', 'Value': 'Peering'}
                        ]
                    }
                ]
            }
            
            if peer_region:
                peering_params['PeerRegion'] = peer_region
            
            response = self.ec2.create_transit_gateway_peering_attachment(**peering_params)
            peering_id = response['TransitGatewayPeeringAttachment']['TransitGatewayAttachmentId']
            
            return {
                'success': True,
                'peering_id': peering_id,
                'transit_gateway_id': transit_gateway_id,
                'peer_transit_gateway_id': peer_transit_gateway_id,
                'peer_account_id': peer_account_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def accept_transit_gateway_peering_attachment(self, transit_gateway_attachment_id):
        """Aceptar peering attachment"""
        
        try:
            response = self.ec2.accept_transit_gateway_peering_attachment(
                TransitGatewayAttachmentId=transit_gateway_attachment_id
            )
            
            return {
                'success': True,
                'peering_id': transit_gateway_attachment_id,
                'status': response['TransitGatewayPeeringAttachment']['Status']['Code']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_transit_gateways(self, transit_gateway_ids=None):
        """Describir Transit Gateways"""
        
        try:
            params = {}
            if transit_gateway_ids:
                params['TransitGatewayIds'] = transit_gateway_ids
            
            response = self.ec2.describe_transit_gateways(**params)
            
            gateways = []
            for gateway in response['TransitGateways']:
                gateway_info = {
                    'transit_gateway_id': gateway['TransitGatewayId'],
                    'transit_gateway_arn': gateway['TransitGatewayArn'],
                    'state': gateway['State'],
                    'owner_id': gateway['OwnerId'],
                    'description': gateway.get('Description'),
                    'creation_time': gateway['CreationTime'],
                    'amazon_side_asn': gateway.get('AmazonSideAsn'),
                    'auto_accept_shared_attachments': gateway.get('Options', {}).get('AutoAcceptSharedAttachments'),
                    'default_route_table_association': gateway.get('Options', {}).get('DefaultRouteTableAssociation'),
                    'default_route_table_propagation': gateway.get('Options', {}).get('DefaultRouteTablePropagation'),
                    'vpn_ecmp_support': gateway.get('Options', {}).get('VpnEcmpSupport'),
                    'dns_support': gateway.get('Options', {}).get('DnsSupport'),
                    'tags': gateway.get('Tags', [])
                }
                gateways.append(gateway_info)
            
            return {
                'success': True,
                'transit_gateways': gateways,
                'count': len(gateways)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_transit_gateway_attachments(self, transit_gateway_ids=None, filters=None):
        """Describir attachments"""
        
        try:
            params = {}
            if transit_gateway_ids:
                params['Filters'] = [{'Name': 'transit-gateway-id', 'Values': transit_gateway_ids}]
            if filters:
                if 'Filters' in params:
                    params['Filters'].extend(filters)
                else:
                    params['Filters'] = filters
            
            response = self.ec2.describe_transit_gateway_attachments(**params)
            
            attachments = []
            for attachment in response['TransitGatewayAttachments']:
                attachment_info = {
                    'transit_gateway_attachment_id': attachment['TransitGatewayAttachmentId'],
                    'transit_gateway_id': attachment['TransitGatewayId'],
                    'transit_gateway_owner_id': attachment['TransitGatewayOwnerId'],
                    'resource_type': attachment['ResourceType'],
                    'resource_id': attachment['ResourceId'],
                    'state': attachment['State'],
                    'association': attachment.get('Association', {}),
                    'propagation': attachment.get('Propagation', {}),
                    'creation_time': attachment['CreationTime'],
                    'tags': attachment.get('Tags', [])
                }
                attachments.append(attachment_info)
            
            return {
                'success': True,
                'attachments': attachments,
                'count': len(attachments)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_transit_gateway_route_tables(self, transit_gateway_ids=None):
        """Describir tablas de routing"""
        
        try:
            params = {}
            if transit_gateway_ids:
                params['Filters'] = [{'Name': 'transit-gateway-id', 'Values': transit_gateway_ids}]
            
            response = self.ec2.describe_transit_gateway_route_tables(**params)
            
            route_tables = []
            for rt in response['TransitGatewayRouteTables']:
                rt_info = {
                    'transit_gateway_route_table_id': rt['TransitGatewayRouteTableId'],
                    'transit_gateway_id': rt['TransitGatewayId'],
                    'state': rt['State'],
                    'default_association_route_table': rt.get('DefaultAssociationRouteTable', False),
                    'default_propagation_route_table': rt.get('DefaultPropagationRouteTable', False),
                    'creation_time': rt['CreationTime'],
                    'tags': rt.get('Tags', [])
                }
                route_tables.append(rt_info)
            
            return {
                'success': True,
                'route_tables': route_tables,
                'count': len(route_tables)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_transit_gateway_routes(self, transit_gateway_route_table_id, filters=None):
        """Buscar rutas en tabla de routing"""
        
        try:
            params = {
                'TransitGatewayRouteTableId': transit_gateway_route_table_id
            }
            
            if filters:
                params['Filters'] = filters
            
            response = self.ec2.search_transit_gateway_routes(**params)
            
            routes = []
            for route in response['Routes']:
                route_info = {
                    'destination_cidr_block': route['DestinationCidrBlock'],
                    'state': route['State'],
                    'route_origin': route['RouteOrigin'],
                    'attachment_id': route.get('TransitGatewayAttachmentId'),
                    'resource_type': route.get('ResourceType'),
                    'resource_id': route.get('ResourceId')
                }
                routes.append(route_info)
            
            return {
                'success': True,
                'routes': routes,
                'count': len(routes)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_transit_gateway(self, transit_gateway_id):
        """Eliminar Transit Gateway"""
        
        try:
            self.ec2.delete_transit_gateway(
                TransitGatewayId=transit_gateway_id
            )
            
            return {
                'success': True,
                'transit_gateway_id': transit_gateway_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_transit_gateway_vpc_attachment(self, transit_gateway_attachment_id):
        """Eliminar attachment de VPC"""
        
        try:
            self.ec2.delete_transit_gateway_vpc_attachment(
                TransitGatewayAttachmentId=transit_gateway_attachment_id
            )
            
            return {
                'success': True,
                'attachment_id': transit_gateway_attachment_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def monitor_transit_gateway_health(self, transit_gateway_id):
        """Monitorear salud del Transit Gateway"""
        
        try:
            # Obtener detalles del gateway
            gateway_response = self.describe_transit_gateways([transit_gateway_id])
            
            if not gateway_response['success'] or not gateway_response['transit_gateways']:
                return {
                    'success': False,
                    'error': 'Transit Gateway not found'
                }
            
            gateway = gateway_response['transit_gateways'][0]
            
            # Obtener attachments
            attachments_response = self.describe_transit_gateway_attachments([transit_gateway_id])
            
            if not attachments_response['success']:
                return attachments_response
            
            attachments = attachments_response['attachments']
            
            # Analizar estado de attachments
            active_attachments = len([a for a in attachments if a['state'] == 'available'])
            total_attachments = len(attachments)
            
            # Obtener tablas de routing
            route_tables_response = self.describe_transit_gateway_route_tables([transit_gateway_id])
            
            if route_tables_response['success']:
                route_tables = route_tables_response['route_tables']
            else:
                route_tables = []
            
            # Calcular estado general
            health_status = 'healthy'
            if gateway['state'] != 'available':
                health_status = 'unhealthy'
            elif active_attachments == 0:
                health_status = 'degraded'
            
            return {
                'success': True,
                'transit_gateway_id': transit_gateway_id,
                'gateway_state': gateway['state'],
                'active_attachments': active_attachments,
                'total_attachments': total_attachments,
                'route_tables_count': len(route_tables),
                'health_status': health_status
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def wait_for_transit_gateway_available(self, transit_gateway_id, timeout=600):
        """Esperar a que Transit Gateway esté disponible"""
        
        try:
            waiter = self.ec2.get_waiter('transit_gateway_available')
            waiter.wait(
                TransitGatewayIds=[transit_gateway_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
    
    def wait_for_transit_gateway_attachment_available(self, attachment_id, timeout=300):
        """Esperar a que attachment esté disponible"""
        
        try:
            waiter = self.ec2.get_waiter('transit_gateway_attachment_available')
            waiter.wait(
                TransitGatewayAttachmentIds=[attachment_id],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': timeout // 15
                }
            )
            return True
        except Exception as e:
            return False
```

## Casos de Uso

### **1. Configuración Completa de Transit Gateway Hub**
```python
# Ejemplo: Configurar Transit Gateway hub completo
manager = TransitGatewayManager('us-east-1')

# Crear Transit Gateway
tgw_result = manager.create_transit_gateway(
    amazon_side_asn=64512,
    auto_accept_shared_attachments='enable',
    default_route_table_association='enable',
    default_route_table_propagation='enable',
    dns_support='enable'
)

if tgw_result['success']:
    tgw_id = tgw_result['transit_gateway_id']
    
    # Crear tabla de routing específica para VPCs
    vpc_rt_result = manager.create_transit_gateway_route_table(tgw_id)
    
    if vpc_rt_result['success']:
        vpc_rt_id = vpc_rt_result['route_table_id']
        
        # Conectar VPCs al hub
        vpcs_to_connect = [
            {'vpc_id': 'vpc-1234567890abcdef0', 'subnets': ['subnet-11111111111111111', 'subnet-22222222222222222']},
            {'vpc_id': 'vpc-0987654321fedcba0', 'subnets': ['subnet-33333333333333333', 'subnet-44444444444444444']},
            {'vpc_id': 'vpc-abcdef1234567890', 'subnets': ['subnet-55555555555555555', 'subnet-66666666666666666']}
        ]
        
        for vpc_info in vpcs_to_connect:
            # Crear attachment
            attachment_result = manager.create_transit_gateway_vpc_attachment(
                transit_gateway_id=tgw_id,
                vpc_id=vpc_info['vpc_id'],
                subnet_ids=vpc_info['subnets']
            )
            
            if attachment_result['success']:
                attachment_id = attachment_result['attachment_id']
                
                # Asociar a tabla de routing
                association_result = manager.associate_transit_gateway_route_table(
                    transit_gateway_route_table_id=vpc_rt_id,
                    transit_gateway_attachment_id=attachment_id
                )
                
                # Habilitar propagación
                propagation_result = manager.enable_transit_gateway_route_table_propagation(
                    transit_gateway_route_table_id=vpc_rt_id,
                    transit_gateway_attachment_id=attachment_id
                )
                
                print(f"VPC {vpc_info['vpc_id']} connected to Transit Gateway")
```

### **2. Configuración de Peering entre Regiones**
```python
# Ejemplo: Configurar peering entre Transit Gateways de diferentes regiones
# (Ejecutar en cada región)

# En región us-east-1
manager_east = TransitGatewayManager('us-east-1')
tgw_east_id = 'tgw-1234567890abcdef0'

# En región us-west-2
manager_west = TransitGatewayManager('us-west-2')
tgw_west_id = 'tgw-0987654321fedcba0'

# Crear peering desde east
peering_result = manager_east.create_transit_gateway_peering_attachment(
    transit_gateway_id=tgw_east_id,
    peer_transit_gateway_id=tgw_west_id,
    peer_account_id='123456789012',
    peer_region='us-west-2'
)

if peering_result['success']:
    peering_id = peering_result['peering_id']
    
    # Aceptar peering desde west
    accept_result = manager_west.accept_transit_gateway_peering_attachment(
        transit_gateway_attachment_id=peering_id
    )
    
    if accept_result['success']:
        print(f"Transit Gateway peering established: {peering_id}")
```

### **3. Monitoreo y Gestión de Rutas**
```python
# Ejemplo: Monitorear salud y gestionar rutas
health_result = manager.monitor_transit_gateway_health('tgw-1234567890abcdef0')

if health_result['success']:
    print(f"Active attachments: {health_result['active_attachments']}")
    print(f"Health status: {health_result['health_status']}")

# Buscar rutas específicas
routes_result = manager.search_transit_gateway_routes(
    transit_gateway_route_table_id='tgw-rtb-1234567890abcdef0',
    filters=[
        {'Name': 'state', 'Values': ['active']},
        {'Name': 'route-origin', 'Values': ['propagated']}
    ]
)

if routes_result['success']:
    print(f"Active routes: {routes_result['count']}")
    for route in routes_result['routes'][:5]:  # Mostrar primeras 5
        print(f"Route: {route['destination_cidr_block']} -> {route['attachment_id']}")
```

## Configuración con AWS CLI

### **Crear Transit Gateway**
```bash
# Crear Transit Gateway
aws ec2 create-transit-gateway \
  --amazon-side-asn 64512 \
  --auto-accept-shared-attachments enable \
  --default-route-table-association enable \
  --default-route-table-propagation enable \
  --dns-support enable \
  --vpn-ecmp-support enable \
  --tag-specifications 'ResourceType=transit-gateway,Tags=[{Key=Name,Value=main-tgw}]'

# Crear attachment de VPC
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-1234567890abcdef0 \
  --vpc-id vpc-1234567890abcdef0 \
  --subnet-ids subnet-11111111111111111 subnet-22222222222222222 \
  --options DnsSupport=enable,Ipv6Support=disable

# Crear tabla de routing
aws ec2 create-transit-gateway-route-table \
  --transit-gateway-id tgw-1234567890abcdef0 \
  --tag-specifications 'ResourceType=transit-gateway-route-table,Tags=[{Key=Name,Value=vpc-rt}]'

# Asociar attachment a tabla de routing
aws ec2 associate-transit-gateway-route-table \
  --transit-gateway-route-table-id tgw-rtb-1234567890abcdef0 \
  --transit-gateway-attachment-id tgw-attach-1234567890abcdef0

# Habilitar propagación
aws ec2 enable-transit-gateway-route-table-propagation \
  --transit-gateway-route-table-id tgw-rtb-1234567890abcdef0 \
  --transit-gateway-attachment-id tgw-attach-1234567890abcdef0
```

### **Peering entre Regiones**
```bash
# Crear peering attachment
aws ec2 create-transit-gateway-peering-attachment \
  --transit-gateway-id tgw-1234567890abcdef0 \
  --peer-transit-gateway-id tgw-0987654321fedcba0 \
  --peer-account-id 123456789012 \
  --peer-region us-west-2

# Aceptar peering (en región del peer)
aws ec2 accept-transit-gateway-peering-attachment \
  --transit-gateway-attachment-id tgw-attach-1234567890abcdef0
```

## Arquitecturas Comunes

### **1. Hub-and-Spoke Simple**
```
Transit Gateway (Hub)
├── VPC 1 (Spoke) - Production
├── VPC 2 (Spoke) - Development
├── VPC 3 (Spoke) - Staging
└── Direct Connect (On-premises)
```

### **2. Multi-Region Hub**
```
Region 1 (us-east-1)
├── Transit Gateway 1
├── Local VPCs
└── Peering to Region 2

Region 2 (us-west-2)
├── Transit Gateway 2
├── Local VPCs
└── Peering to Region 1
```

### **3. Multi-Account Hub**
```
Central Account
├── Transit Gateway (Shared)
├── Route Tables
└── Policies

Spoke Accounts
├── VPCs
├── Attachments
└── Local Route Tables
```

## Best Practices

### **1. Diseño**
- Planificar crecimiento futuro
- Usar tablas de routing separadas
- Implementar segmentación de red
- Documentar arquitectura

### **2. Seguridad**
- Implementar controles de acceso
- Usar security groups apropiados
- Monitorear tráfico sospechoso
- Auditar configuración regularmente

### **3. Rendimiento**
- Distribuir attachments en múltiples AZs
- Optimizar routing tables
- Monitorear utilización de ancho de banda
- Configurar ECMP para balanceo de carga

### **4. Gestión**
- Etiquetar todos los recursos
- Automatizar provisioning
- Implementar logging completo
- Configurar monitoreo proactivo

## Costos

### **Componentes de Costo**
- **Transit Gateway**: $0.05 por hora
- **Attachments**: $0.05 por hora por attachment
- **Data Transfer**: $0.02-0.05 por GB
- **Peering**: Sin costo adicional

### **Optimización**
- Consolidar attachments cuando sea posible
- Usar routing eficiente
- Optimizar transferencia de datos
- Monitorear consumo

## Troubleshooting

### **Problemas Comunes**
1. **Attachment no conecta**: Verificar configuración de subnets
2. **Routing issues**: Revisar propagación de rutas
3. **Peering fallido**: Validar permisos cross-account
4. **Performance lenta**: Optimizar routing y AZs

### **Comandos de Diagnóstico**
```bash
# Verificar estado del gateway
aws ec2 describe-transit-gateways \
  --transit-gateway-ids tgw-1234567890abcdef0

# Verificar attachments
aws ec2 describe-transit-gateway-attachments \
  --filters Name=transit-gateway-id,Values=tgw-1234567890abcdef0

# Buscar rutas
aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-1234567890abcdef0 \
  --filters Name=state,Values=active
```

## Monitoreo

### **Métricas CloudWatch**
- AWS/TransitGateway
- BytesIn, BytesOut
- PacketDropCount
- ActiveConnections
- AttachmentCount

### **Alarmas Recomendadas**
- Gateway unavailable
- High packet drops
- Attachment down
- High bandwidth utilization
