# AWS VPC (Virtual Private Cloud)

## Definición

AWS VPC (Virtual Private Cloud) es el servicio de red fundamental de AWS que permite lanzar recursos AWS en una red virtual aislada y definida por el usuario. Proporciona control completo sobre el entorno de red, incluyendo selección de rangos de IP, creación de subredes, configuración de tablas de rutas y gateways de red, permitiendo construir arquitecturas de red seguras y escalables.

## Características Principales

### 1. **Aislamiento de Red**
- Red virtual privada
- Rangos de IP personalizables
- Aislamiento lógico completo
- Control de acceso granular

### 2. **Networking Avanzado**
- Subnets públicas y privadas
- Route tables personalizadas
- Internet Gateways
- NAT Gateways

### 3. **Seguridad**
- Security Groups
- Network ACLs
- Flow Logs
- PrivateLink

### 4. **Conectividad**
- VPN Connections
- Direct Connect
- Peering
- Transit Gateway

## Componentes Clave

### **VPC**
- Red virtual principal
- Rango de IP (CIDR)
- Main route table
- Main network ACL

### **Subnets**
- Subdivisiones de la VPC
- Públicas vs privadas
- Availability Zones
- Auto-assign IPs

### **Gateways**
- Internet Gateway
- NAT Gateway
- VPN Gateway
- Virtual Private Gateway

### **Routing**
- Route tables
- Routes
- Propagation
- Target associations

## Configuración Básica de VPC

### **Creación de VPC**
```bash
# Crear VPC básica
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'

# Crear VPC con DNS support
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --enable-dns-support \
  --enable-dns-hostnames \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'

# Describir VPC
aws ec2 describe-vpcs \
  --vpc-ids vpc-1234567890abcdef0
```

### **Subnets**
```bash
# Crear subnet pública
aws ec2 create-subnet \
  --vpc-id vpc-1234567890abcdef0 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --map-public-ip-on-launch \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-1a}]'

# Crear subnet privada
aws ec2 create-subnet \
  --vpc-id vpc-1234567890abcdef0 \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-1a}]'

# Listar subnets
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=vpc-1234567890abcdef0
```

### **Internet Gateway**
```bash
# Crear Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=my-igw}]'

# Adjuntar a VPC
aws ec2 attach-internet-gateway \
  --vpc-id vpc-1234567890abcdef0 \
  --internet-gateway-id igw-1234567890abcdef0
```

### **Route Tables**
```bash
# Crear route table para subnet pública
aws ec2 create-route-table \
  --vpc-id vpc-1234567890abcdef0 \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]'

# Agregar ruta a Internet
aws ec2 create-route \
  --route-table-id rtb-1234567890abcdef0 \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-1234567890abcdef0

# Asociar route table a subnet
aws ec2 associate-route-table \
  --route-table-id rtb-1234567890abcdef0 \
  --subnet-id subnet-1234567890abcdef0
```

## VPC Management con Python

### **VPC Manager**
```python
import boto3
import json
import time
from datetime import datetime

class VPCManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_vpc(self, vpc_config):
        """Crear VPC con configuración completa"""
        
        try:
            # Crear VPC
            vpc_params = {
                'CidrBlock': vpc_config['cidr_block'],
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpc',
                        'Tags': vpc_config.get('tags', [{'Key': 'Name', 'Value': vpc_config['name']}])
                    }
                ]
            }
            
            # Configurar DNS options
            if vpc_config.get('enable_dns_support', True):
                vpc_params['EnableDnsSupport'] = True
            
            if vpc_config.get('enable_dns_hostnames', True):
                vpc_params['EnableDnsHostnames'] = True
            
            response = self.ec2.create_vpc(**vpc_params)
            vpc_id = response['Vpc']['VpcId']
            
            # Esperar a que la VPC esté disponible
            self.wait_for_vpc(vpc_id)
            
            # Crear subnets si se especifican
            subnets_created = []
            if vpc_config.get('subnets'):
                for subnet_config in vpc_config['subnets']:
                    subnet_result = self.create_subnet(vpc_id, subnet_config)
                    if subnet_result['success']:
                        subnets_created.append(subnet_result['subnet_id'])
            
            # Crear y configurar Internet Gateway si se especifica
            igw_id = None
            if vpc_config.get('internet_gateway', False):
                igw_result = self.create_internet_gateway(vpc_id, vpc_config['name'])
                if igw_result['success']:
                    igw_id = igw_result['igw_id']
            
            return {
                'success': True,
                'vpc_id': vpc_id,
                'vpc_arn': response['Vpc']['Arn'],
                'subnets_created': subnets_created,
                'internet_gateway_id': igw_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_subnet(self, vpc_id, subnet_config):
        """Crear subnet en VPC"""
        
        try:
            subnet_params = {
                'VpcId': vpc_id,
                'CidrBlock': subnet_config['cidr_block'],
                'AvailabilityZone': subnet_config.get('availability_zone', f"{self.region}a"),
                'TagSpecifications': [
                    {
                        'ResourceType': 'subnet',
                        'Tags': subnet_config.get('tags', [{'Key': 'Name', 'Value': subnet_config['name']}])
                    }
                ]
            }
            
            # Configurar auto-assign public IP
            if subnet_config.get('map_public_ip_on_launch', False):
                subnet_params['MapPublicIpOnLaunch'] = True
            
            response = self.ec2.create_subnet(**subnet_params)
            subnet_id = response['Subnet']['SubnetId']
            
            # Esperar a que la subnet esté disponible
            self.wait_for_subnet(subnet_id)
            
            return {
                'success': True,
                'subnet_id': subnet_id,
                'subnet_arn': response['Subnet']['Arn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_internet_gateway(self, vpc_id, name_prefix):
        """Crear y adjuntar Internet Gateway"""
        
        try:
            # Crear Internet Gateway
            response = self.ec2.create_internet_gateway(
                TagSpecifications=[
                    {
                        'ResourceType': 'internet-gateway',
                        'Tags': [{'Key': 'Name', 'Value': f"{name_prefix}-igw"}]
                    }
                ]
            )
            
            igw_id = response['InternetGateway']['InternetGatewayId']
            
            # Adjuntar a VPC
            self.ec2.attach_internet_gateway(
                VpcId=vpc_id,
                InternetGatewayId=igw_id
            )
            
            return {
                'success': True,
                'igw_id': igw_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_nat_gateway(self, vpc_id, subnet_id, name_prefix):
        """Crear NAT Gateway"""
        
        try:
            # Primero crear Elastic IP para NAT Gateway
            eip_response = self.ec2.allocate_address(
                Domain='vpc',
                TagSpecifications=[
                    {
                        'ResourceType': 'elastic-ip',
                        'Tags': [{'Key': 'Name', 'Value': f"{name_prefix}-nat-eip"}]
                    }
                ]
            )
            
            allocation_id = eip_response['AllocationId']
            
            # Crear NAT Gateway
            nat_response = self.ec2.create_nat_gateway(
                SubnetId=subnet_id,
                AllocationId=allocation_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'natgateway',
                        'Tags': [{'Key': 'Name', 'Value': f"{name_prefix}-nat"}]
                    }
                ]
            )
            
            nat_id = nat_response['NatGateway']['NatGatewayId']
            
            # Esperar a que NAT Gateway esté disponible
            self.wait_for_nat_gateway(nat_id)
            
            return {
                'success': True,
                'nat_id': nat_id,
                'allocation_id': allocation_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_route_table(self, vpc_id, routes, name_prefix):
        """Crear route table con rutas específicas"""
        
        try:
            # Crear route table
            response = self.ec2.create_route_table(
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'route-table',
                        'Tags': [{'Key': 'Name', 'Value': f"{name_prefix}-rt"}]
                    }
                ]
            )
            
            route_table_id = response['RouteTable']['RouteTableId']
            
            # Agregar rutas
            for route in routes:
                route_params = {
                    'RouteTableId': route_table_id,
                    'DestinationCidrBlock': route['destination_cidr']
                }
                
                if route.get('gateway_id'):
                    route_params['GatewayId'] = route['gateway_id']
                elif route.get('nat_gateway_id'):
                    route_params['NatGatewayId'] = route['nat_gateway_id']
                elif route.get('instance_id'):
                    route_params['InstanceId'] = route['instance_id']
                elif route.get('vpc_peering_connection_id'):
                    route_params['VpcPeeringConnectionId'] = route['vpc_peering_connection_id']
                
                self.ec2.create_route(**route_params)
            
            return {
                'success': True,
                'route_table_id': route_table_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_route_table(self, route_table_id, subnet_id):
        """Asociar route table a subnet"""
        
        try:
            response = self.ec2.associate_route_table(
                RouteTableId=route_table_id,
                SubnetId=subnet_id
            )
            
            return {
                'success': True,
                'association_id': response['AssociationId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_security_group(self, vpc_id, sg_config):
        """Crear security group"""
        
        try:
            sg_params = {
                'GroupName': sg_config['name'],
                'Description': sg_config.get('description', ''),
                'VpcId': vpc_id,
                'TagSpecifications': [
                    {
                        'ResourceType': 'security-group',
                        'Tags': sg_config.get('tags', [{'Key': 'Name', 'Value': sg_config['name']}])
                    }
                ]
            }
            
            response = self.ec2.create_security_group(**sg_params)
            sg_id = response['GroupId']
            
            # Agregar reglas de entrada
            if sg_config.get('ingress_rules'):
                for rule in sg_config['ingress_rules']:
                    self.ec2.authorize_security_group_ingress(
                        GroupId=sg_id,
                        IpPermissions=[rule]
                    )
            
            # Agregar reglas de salida
            if sg_config.get('egress_rules'):
                self.ec2.authorize_security_group_egress(
                    GroupId=sg_id,
                    IpPermissions=sg_config['egress_rules']
                )
            
            return {
                'success': True,
                'security_group_id': sg_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def wait_for_vpc(self, vpc_id):
        """Esperar a que VPC esté disponible"""
        
        waiter = self.ec2.get_waiter('vpc_available')
        waiter.wait(VpcIds=[vpc_id])
    
    def wait_for_subnet(self, subnet_id):
        """Esperar a que subnet esté disponible"""
        
        waiter = self.ec2.get_waiter('subnet_available')
        waiter.wait(SubnetIds=[subnet_id])
    
    def wait_for_nat_gateway(self, nat_id):
        """Esperar a que NAT Gateway esté disponible"""
        
        waiter = self.ec2.get_waiter('nat_gateway_available')
        waiter.wait(NatGatewayIds=[nat_id])
    
    def describe_vpc(self, vpc_id):
        """Obtener detalles de VPC"""
        
        try:
            response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            
            if response['Vpcs']:
                vpc = response['Vpcs'][0]
                
                return {
                    'success': True,
                    'vpc': {
                        'vpc_id': vpc['VpcId'],
                        'cidr_block': vpc['CidrBlock'],
                        'state': vpc['State'],
                        'is_default': vpc['IsDefault'],
                        'tags': vpc.get('Tags', []),
                        'enable_dns_support': vpc.get('DnsOptions', {}).get('DnsSupport', False),
                        'enable_dns_hostnames': vpc.get('DnsHostnames', False)
                    }
                }
            else:
                return {
                    'success': False,
                    'error': 'VPC not found'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_vpcs(self):
        """Listar todas las VPCs"""
        
        try:
            response = self.ec2.describe_vpcs()
            
            vpcs = []
            for vpc in response['Vpcs']:
                vpc_info = {
                    'vpc_id': vpc['VpcId'],
                    'cidr_block': vpc['CidrBlock'],
                    'state': vpc['State'],
                    'is_default': vpc['IsDefault'],
                    'tags': vpc.get('Tags', [])
                }
                vpcs.append(vpc_info)
            
            return {
                'success': True,
                'vpcs': vpcs,
                'count': len(vpcs)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_vpc(self, vpc_id, force=False):
        """Eliminar VPC"""
        
        try:
            if force:
                # Eliminar dependencias primero
                self.cleanup_vpc_dependencies(vpc_id)
            
            # Eliminar VPC
            self.ec2.delete_vpc(VpcId=vpc_id)
            
            return {
                'success': True,
                'vpc_id': vpc_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def cleanup_vpc_dependencies(self, vpc_id):
        """Limpiar dependencias de VPC antes de eliminar"""
        
        try:
            # Eliminar subnets
            subnets_response = self.ec2.describe_subnets(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
            for subnet in subnets_response['Subnets']:
                self.ec2.delete_subnet(SubnetId=subnet['SubnetId'])
            
            # Eliminar route tables (excepto main)
            rt_response = self.ec2.describe_route_tables(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
            for rt in rt_response['RouteTables']:
                if not rt.get('Main', False):
                    self.ec2.delete_route_table(RouteTableId=rt['RouteTableId'])
            
            # Eliminar security groups
            sg_response = self.ec2.describe_security_groups(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
            for sg in sg_response['SecurityGroups']:
                if sg['GroupName'] != 'default':
                    self.ec2.delete_security_group(GroupId=sg['GroupId'])
            
            return {
                'success': True,
                'message': 'Dependencies cleaned up'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. VPC Multi-Tier Architecture**
```python
class MultiTierVPC:
    def __init__(self, region='us-east-1'):
        self.vpc_manager = VPCManager(region)
        self.region = region
    
    def create_multi_tier_vpc(self, config):
        """Crear VPC con arquitectura multi-tier"""
        
        # Configuración de VPC
        vpc_config = {
            'name': config['name'],
            'cidr_block': config['cidr_block'],
            'enable_dns_support': True,
            'enable_dns_hostnames': True,
            'internet_gateway': True,
            'subnets': [
                # Web tier (públicas)
                {
                    'name': f"{config['name']}-web-1a",
                    'cidr_block': config['subnets']['web']['cidr_blocks'][0],
                    'availability_zone': f"{self.region}a",
                    'map_public_ip_on_launch': True,
                    'tags': [{'Key': 'Tier', 'Value': 'Web'}]
                },
                {
                    'name': f"{config['name']}-web-1b",
                    'cidr_block': config['subnets']['web']['cidr_blocks'][1],
                    'availability_zone': f"{self.region}b",
                    'map_public_ip_on_launch': True,
                    'tags': [{'Key': 'Tier', 'Value': 'Web'}]
                },
                # Application tier (privadas)
                {
                    'name': f"{config['name']}-app-1a",
                    'cidr_block': config['subnets']['app']['cidr_blocks'][0],
                    'availability_zone': f"{self.region}a",
                    'map_public_ip_on_launch': False,
                    'tags': [{'Key': 'Tier', 'Value': 'Application'}]
                },
                {
                    'name': f"{config['name']}-app-1b",
                    'cidr_block': config['subnets']['app']['cidr_blocks'][1],
                    'availability_zone': f"{self.region}b",
                    'map_public_ip_on_launch': False,
                    'tags': [{'Key': 'Tier', 'Value': 'Application'}]
                },
                # Database tier (privadas)
                {
                    'name': f"{config['name']}-db-1a",
                    'cidr_block': config['subnets']['db']['cidr_blocks'][0],
                    'availability_zone': f"{self.region}a",
                    'map_public_ip_on_launch': False,
                    'tags': [{'Key': 'Tier', 'Value': 'Database'}]
                },
                {
                    'name': f"{config['name']}-db-1b",
                    'cidr_block': config['subnets']['db']['cidr_blocks'][1],
                    'availability_zone': f"{self.region}b",
                    'map_public_ip_on_launch': False,
                    'tags': [{'Key': 'Tier', 'Value': 'Database'}]
                }
            ]
        }
        
        # Crear VPC
        vpc_result = self.vpc_manager.create_vpc(vpc_config)
        
        if not vpc_result['success']:
            return vpc_result
        
        vpc_id = vpc_result['vpc_id']
        
        # Crear NAT Gateway para subnets privadas
        nat_result = self.vpc_manager.create_nat_gateway(
            vpc_id,
            vpc_result['subnets_created'][0],  # Usar primera subnet web
            config['name']
        )
        
        if nat_result['success']:
            nat_id = nat_result['nat_id']
        else:
            nat_id = None
        
        # Crear route tables
        
        # Route table para web tier (pública)
        web_routes = [
            {
                'destination_cidr': '0.0.0.0/0',
                'gateway_id': vpc_result['internet_gateway_id']
            }
        ]
        
        web_rt_result = self.vpc_manager.create_route_table(
            vpc_id, web_routes, f"{config['name']}-web"
        )
        
        # Route table para app tier (privada con NAT)
        app_routes = [
            {
                'destination_cidr': '0.0.0.0/0',
                'nat_gateway_id': nat_id
            }
        ]
        
        app_rt_result = self.vpc_manager.create_route_table(
            vpc_id, app_routes, f"{config['name']}-app"
        )
        
        # Route table para db tier (sin salida a internet)
        db_routes = []  # Sin rutas por defecto para máxima seguridad
        
        db_rt_result = self.vpc_manager.create_route_table(
            vpc_id, db_routes, f"{config['name']}-db"
        )
        
        # Asociar route tables a subnets
        associations = []
        
        # Asociar web subnets a web route table
        for i in range(2):  # 2 web subnets
            association = self.vpc_manager.associate_route_table(
                web_rt_result['route_table_id'],
                vpc_result['subnets_created'][i]
            )
            associations.append(association)
        
        # Asociar app subnets a app route table
        for i in range(2, 4):  # 2 app subnets
            association = self.vpc_manager.associate_route_table(
                app_rt_result['route_table_id'],
                vpc_result['subnets_created'][i]
            )
            associations.append(association)
        
        # Asociar db subnets a db route table
        for i in range(4, 6):  # 2 db subnets
            association = self.vpc_manager.associate_route_table(
                db_rt_result['route_table_id'],
                vpc_result['subnets_created'][i]
            )
            associations.append(association)
        
        # Crear security groups para cada tier
        security_groups = {}
        
        # Web tier SG
        web_sg_config = {
            'name': f"{config['name']}-web-sg",
            'description': 'Security group for web tier',
            'ingress_rules': [
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 80,
                    'ToPort': 80,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                },
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 443,
                    'ToPort': 443,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                },
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 22,
                    'ToPort': 22,
                    'IpRanges': [{'CidrIp': config.get('admin_cidr', '10.0.0.0/16')}]
                }
            ],
            'egress_rules': [
                {
                    'IpProtocol': '-1',
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                }
            ]
        }
        
        web_sg_result = self.vpc_manager.create_security_group(vpc_id, web_sg_config)
        security_groups['web'] = web_sg_result
        
        # App tier SG
        app_sg_config = {
            'name': f"{config['name']}-app-sg",
            'description': 'Security group for application tier',
            'ingress_rules': [
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 8080,
                    'ToPort': 8080,
                    'IpRanges': [{'CidrIp': config['cidr_block']}]  # Solo desde VPC
                },
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 22,
                    'ToPort': 22,
                    'IpRanges': [{'CidrIp': config.get('admin_cidr', '10.0.0.0/16')}]
                }
            ],
            'egress_rules': [
                {
                    'IpProtocol': '-1',
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                }
            ]
        }
        
        app_sg_result = self.vpc_manager.create_security_group(vpc_id, app_sg_config)
        security_groups['app'] = app_sg_result
        
        # DB tier SG
        db_sg_config = {
            'name': f"{config['name']}-db-sg",
            'description': 'Security group for database tier',
            'ingress_rules': [
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 3306,
                    'ToPort': 3306,
                    'IpRanges': [{'CidrIp': config['cidr_block']}]  # Solo desde VPC
                }
            ],
            'egress_rules': [
                {
                    'IpProtocol': '-1',
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                }
            ]
        }
        
        db_sg_result = self.vpc_manager.create_security_group(vpc_id, db_sg_config)
        security_groups['db'] = db_sg_result
        
        return {
            'success': True,
            'vpc_id': vpc_id,
            'subnets': vpc_result['subnets_created'],
            'internet_gateway': vpc_result['internet_gateway_id'],
            'nat_gateway': nat_id,
            'route_tables': {
                'web': web_rt_result['route_table_id'],
                'app': app_rt_result['route_table_id'],
                'db': db_rt_result['route_table_id']
            },
            'security_groups': security_groups,
            'associations': associations
        }
```

### **2. VPC Peering**
```python
class VPCPeeringManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_vpc_peering(self, requester_vpc_id, accepter_vpc_id, peer_region=None):
        """Crear conexión de VPC peering"""
        
        try:
            # Crear peering connection
            peering_params = {
                'VpcId': requester_vpc_id,
                'PeerVpcId': accepter_vpc_id,
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpc-peering-connection',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'peering-{requester_vpc_id}-{accepter_vpc_id}'}
                        ]
                    }
                ]
            }
            
            if peer_region and peer_region != self.region:
                peering_params['PeerRegion'] = peer_region
            
            response = self.ec2.create_vpc_peering_connection(**peering_params)
            peering_id = response['VpcPeeringConnection']['VpcPeeringConnectionId']
            
            return {
                'success': True,
                'peering_id': peering_id,
                'status': 'pending-acceptance'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def accept_vpc_peering(self, peering_id):
        """Aceptar conexión de VPC peering"""
        
        try:
            response = self.ec2.accept_vpc_peering_connection(
                VpcPeeringConnectionId=peering_id
            )
            
            return {
                'success': True,
                'peering_id': peering_id,
                'status': response['VpcPeeringConnection']['Status']['Code']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_peering_route_tables(self, peering_id, requester_vpc_id, accepter_vpc_id):
        """Actualizar route tables para peering"""
        
        try:
            # Obtener route tables del requester VPC
            requester_rts = self.ec2.describe_route_tables(
                Filters=[{'Name': 'vpc-id', 'Values': [requester_vpc_id]}]
            )
            
            # Agregar ruta al accepter VPC en route tables del requester
            for rt in requester_rts['RouteTables']:
                self.ec2.create_route(
                    RouteTableId=rt['RouteTableId'],
                    DestinationCidrBlock=self.get_vpc_cidr(accepter_vpc_id),
                    VpcPeeringConnectionId=peering_id
                )
            
            # Obtener route tables del accepter VPC
            accepter_rts = self.ec2.describe_route_tables(
                Filters=[{'Name': 'vpc-id', 'Values': [accepter_vpc_id]}]
            )
            
            # Agregar ruta al requester VPC en route tables del accepter
            for rt in accepter_rts['RouteTables']:
                self.ec2.create_route(
                    RouteTableId=rt['RouteTableId'],
                    DestinationCidrBlock=self.get_vpc_cidr(requester_vpc_id),
                    VpcPeeringConnectionId=peering_id
                )
            
            return {
                'success': True,
                'peering_id': peering_id,
                'message': 'Route tables updated successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_vpc_cidr(self, vpc_id):
        """Obtener CIDR block de VPC"""
        
        try:
            response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            if response['Vpcs']:
                return response['Vpcs'][0]['CidrBlock']
            else:
                return None
        except:
            return None
    
    def delete_vpc_peering(self, peering_id):
        """Eliminar conexión de VPC peering"""
        
        try:
            self.ec2.delete_vpc_peering_connection(
                VpcPeeringConnectionId=peering_id
            )
            
            return {
                'success': True,
                'peering_id': peering_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_vpc_peerings(self):
        """Listar conexiones de VPC peering"""
        
        try:
            response = self.ec2.describe_vpc_peering_connections()
            
            peerings = []
            for peering in response['VpcPeeringConnections']:
                peering_info = {
                    'peering_id': peering['VpcPeeringConnectionId'],
                    'requester_vpc_id': peering['RequesterVpcId'],
                    'accepter_vpc_id': peering['AccepterVpcId'],
                    'status': peering['Status']['Code'],
                    'requester_owner': peering['RequesterOwnerId'],
                    'accepter_owner': peering['AccepterOwnerId'],
                    'tags': peering.get('Tags', [])
                }
                peerings.append(peering_info)
            
            return {
                'success': True,
                'peerings': peerings,
                'count': len(peerings)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### **3. VPC Flow Logs**
```python
class VPCFlowLogs:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.logs = boto3.client('logs', region_name=region)
        self.region = region
    
    def create_flow_log(self, vpc_id, log_group_name, traffic_type='ALL'):
        """Crear flow log para VPC"""
        
        try:
            # Crear log group si no existe
            try:
                self.logs.create_log_group(logGroupName=log_group_name)
            except self.logs.exceptions.ResourceAlreadyExistsException:
                pass  # El log group ya existe
            
            # Crear flow log
            response = self.ec2.create_flow_logs(
                ResourceIds=[vpc_id],
                ResourceType='VPC',
                TrafficType=traffic_type,
                LogGroupName=log_group_name,
                DeliverLogsPermissionArn='arn:aws:iam::123456789012:role/flow-logs-role',
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc-flow-log',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'flow-log-{vpc_id}'},
                            {'Key': 'VPC', 'Value': vpc_id}
                        ]
                    }
                ]
            )
            
            return {
                'success': True,
                'flow_log_ids': response['FlowLogIds'],
                'log_group_name': log_group_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_flow_logs(self, vpc_id=None):
        """Describir flow logs"""
        
        try:
            params = {}
            if vpc_id:
                params['Filters'] = [{'Name': 'resource-id', 'Values': [vpc_id]}]
            
            response = self.ec2.describe_flow_logs(**params)
            
            flow_logs = []
            for flow_log in response['FlowLogs']:
                flow_log_info = {
                    'flow_log_id': flow_log['FlowLogId'],
                    'resource_id': flow_log['ResourceId'],
                    'resource_type': flow_log['ResourceType'],
                    'traffic_type': flow_log['TrafficType'],
                    'log_group_name': flow_log['LogGroupName'],
                    'deliver_logs_status': flow_log['DeliverLogsStatus'],
                    'log_destination_type': flow_log['LogDestinationType'],
                    'tags': flow_log.get('Tags', [])
                }
                flow_logs.append(flow_log_info)
            
            return {
                'success': True,
                'flow_logs': flow_logs,
                'count': len(flow_logs)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_flow_log(self, flow_log_id):
        """Eliminar flow log"""
        
        try:
            self.ec2.delete_flow_logs(
                FlowLogIds=[flow_log_id]
            )
            
            return {
                'success': True,
                'flow_log_id': flow_log_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_flow_logs(self, log_group_name, hours=24):
        """Analizar flow logs"""
        
        try:
            # Configurar timeframe
            start_time = datetime.utcnow() - timedelta(hours=hours)
            end_time = datetime.utcnow()
            
            # Query para obtener logs de flow logs
            query = f"""
            fields @timestamp, @message
            | filter @logStream like /flow-log/
            | parse @message "{{version}} {{account_id}} {{interface_id}} {{srcaddr}} {{dstaddr}} {{srcport}} {{dstport}} {{protocol}} {{packets}} {{bytes}} {{start}} {{end}} {{action}} {{log_status}}"
            | stats count() as flow_count, sum(bytes) as total_bytes by srcaddr, dstaddr, action
            | sort flow_count desc
            | limit 100
            """
            
            # Ejecutar query (requiere CloudWatch Logs Insights)
            # Esta es una implementación simplificada
            
            return {
                'success': True,
                'log_group': log_group_name,
                'analysis_period': f"Last {hours} hours",
                'message': 'Flow log analysis completed (simplified implementation)'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Security y Best Practices

### **Security Groups Configuration**
```python
class SecurityGroupManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
    
    def create_restricted_security_group(self, vpc_id, sg_config):
        """Crear security group con restricciones estrictas"""
        
        try:
            # Crear security group base
            sg_params = {
                'GroupName': sg_config['name'],
                'Description': sg_config.get('description', ''),
                'VpcId': vpc_id,
                'TagSpecifications': [
                    {
                        'ResourceType': 'security-group',
                        'Tags': sg_config.get('tags', [{'Key': 'Name', 'Value': sg_config['name']}])
                    }
                ]
            }
            
            response = self.ec2.create_security_group(**sg_params)
            sg_id = response['GroupId']
            
            # Aplicar reglas de entrada restrictivas
            if sg_config.get('ingress_rules'):
                for rule in sg_config['ingress_rules']:
                    # Validar que las reglas no sean muy abiertas
                    if self.validate_security_rule(rule):
                        self.ec2.authorize_security_group_ingress(
                            GroupId=sg_id,
                            IpPermissions=[rule]
                        )
            
            # Reglas de salida por defecto (restrictivas)
            default_egress = [
                {
                    'IpProtocol': '-1',
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                }
            ]
            
            # Si se especifican reglas de salida personalizadas
            if sg_config.get('egress_rules'):
                # Primero remover reglas por defecto
                self.ec2.revoke_security_group_egress(
                    GroupId=sg_id,
                    IpPermissions=default_egress
                )
                
                # Agregar reglas personalizadas
                for rule in sg_config['egress_rules']:
                    if self.validate_security_rule(rule):
                        self.ec2.authorize_security_group_egress(
                            GroupId=sg_id,
                            IpPermissions=rule
                        )
            
            return {
                'success': True,
                'security_group_id': sg_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_security_rule(self, rule):
        """Validar que una regla de seguridad sea segura"""
        
        # Verificar que no se permita acceso desde cualquier IP a puertos sensibles
        sensitive_ports = [22, 3389, 1433, 3306, 5432, 6379, 27017]
        
        if rule.get('IpRanges'):
            for ip_range in rule['IpRanges']:
                if ip_range['CidrIp'] == '0.0.0.0/0':
                    if rule.get('FromPort') in sensitive_ports:
                        return False  # No permitir acceso desde cualquier IP a puertos sensibles
        
        return True
    
    def audit_security_groups(self, vpc_id):
        """Auditar security groups en busca de configuraciones inseguras"""
        
        try:
            response = self.ec2.describe_security_groups(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            audit_results = {
                'total_security_groups': len(response['SecurityGroups']),
                'insecure_configurations': [],
                'recommendations': []
            }
            
            for sg in response['SecurityGroups']:
                sg_issues = []
                
                # Verificar reglas de entrada
                for rule in sg['IpPermissions']:
                    # Verificar acceso desde cualquier IP
                    if rule.get('IpRanges'):
                        for ip_range in rule['IpRanges']:
                            if ip_range['CidrIp'] == '0.0.0.0/0':
                                if rule.get('IpProtocol') == '-1':
                                    sg_issues.append('Allows all traffic from any IP')
                                elif rule.get('FromPort') == 22:
                                    sg_issues.append('Allows SSH from any IP')
                                elif rule.get('FromPort') == 3389:
                                    sg_issues.append('Allows RDP from any IP')
                
                if sg_issues:
                    audit_results['insecure_configurations'].append({
                        'security_group_id': sg['GroupId'],
                        'security_group_name': sg['GroupName'],
                        'issues': sg_issues
                    })
            
            # Generar recomendaciones
            if audit_results['insecure_configurations']:
                audit_results['recommendations'].append('Restrict access to sensitive ports')
                audit_results['recommendations'].append('Use specific IP ranges instead of 0.0.0.0/0')
                audit_results['recommendations'].append('Implement bastion hosts for SSH/RDP access')
            
            return {
                'success': True,
                'audit_results': audit_results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Monitoring y Métricas

### **VPC Monitoring**
```python
class VPCMonitoring:
    def __init__(self, region='us-east-1'):
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.ec2 = boto3.client('ec2', region_name=region)
    
    def get_vpc_metrics(self, vpc_id, hours=24):
        """Obtener métricas de VPC"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours)
            
            # Métricas de NAT Gateway
            nat_metrics = {}
            
            # Obtener NAT Gateways en la VPC
            nat_response = self.ec2.describe_nat_gateways(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            for nat in nat_response['NatGateways']:
                nat_id = nat['NatGatewayId']
                
                # Métricas de bytes procesados
                bytes_response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/NATGateway',
                    MetricName='BytesOutFromSource',
                    Dimensions=[
                        {'Name': 'NatGatewayId', 'Value': nat_id}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum', 'Average']
                )
                
                # Métricas de paquetes descartados
                packets_response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/NATGateway',
                    MetricName='BytesOutToDestination',
                    Dimensions=[
                        {'Name': 'NatGatewayId', 'Value': nat_id}
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum', 'Average']
                )
                
                nat_metrics[nat_id] = {
                    'bytes_processed': bytes_response['Datapoints'],
                    'packets_dropped': packets_response['Datapoints']
                }
            
            return {
                'success': True,
                'vpc_id': vpc_id,
                'nat_gateway_metrics': nat_metrics,
                'time_range': f"Last {hours} hours"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_vpc_alarms(self, vpc_id, notification_topic):
        """Configurar alarmas para VPC"""
        
        try:
            alarms_created = []
            
            # Obtener NAT Gateways
            nat_response = self.ec2.describe_nat_gateways(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            for nat in nat_response['NatGateways']:
                nat_id = nat['NatGatewayId']
                
                # Alarm para error rate de NAT Gateway
                alarm_response = self.cloudwatch.put_metric_alarm(
                    AlarmName=f'NAT-ErrorRate-{nat_id}',
                    AlarmDescription=f'High error rate for NAT Gateway {nat_id}',
                    MetricName='ErrorPortAllocation',
                    Namespace='AWS/NATGateway',
                    Statistic='Sum',
                    Period=300,
                    EvaluationPeriods=2,
                    Threshold=1,
                    ComparisonOperator='GreaterThanThreshold',
                    Dimensions=[
                        {'Name': 'NatGatewayId', 'Value': nat_id}
                    ],
                    AlarmActions=[notification_topic]
                )
                
                alarms_created.append(f'NAT-ErrorRate-{nat_id}')
            
            return {
                'success': True,
                'alarms_created': alarms_created,
                'vpc_id': vpc_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Cost Management

### **Cost Optimization**
```python
def calculate_vpc_costs(nat_gateways, flow_logs, data_transfer_gb):
    """Calcular costos de VPC"""
    
    # NAT Gateway cost
    nat_cost = nat_gateways * 0.045  # $0.045 por hora
    
    # Flow Logs cost
    flow_logs_cost = flow_logs * 0.50  # $0.50 por GB
    
    # Data Transfer cost
    data_transfer_cost = data_transfer_gb * 0.09  # $0.09 por GB
    
    total_cost = nat_cost + flow_logs_cost + data_transfer_cost
    
    return {
        'nat_gateway_cost': nat_cost,
        'flow_logs_cost': flow_logs_cost,
        'data_transfer_cost': data_transfer_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS VPC es el componente fundamental de networking en AWS, proporcionando control completo sobre el entorno de red y permitiendo construir arquitecturas seguras, escalables y aisladas. Es esencial para implementar mejores prácticas de seguridad, cumplir con requisitos de compliance y diseñar redes que soporten aplicaciones modernas con múltiples capas y requerimientos específicos de conectividad.
