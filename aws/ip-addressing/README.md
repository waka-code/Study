# AWS IP Addressing

## Definición

AWS IP Addressing es el sistema de gestión de direcciones IP en la nube de AWS que permite asignar, administrar y controlar el acceso a recursos mediante direcciones IP estáticas y dinámicas. Proporciona flexibilidad para configurar networking, acceso a internet, y comunicación entre recursos, tanto en IPv4 como IPv6, con opciones para direcciones públicas y privadas según las necesidades de la arquitectura.

## Características Principales

### 1. **Tipos de Direcciones IP**
- IPv4 e IPv6
- Públicas y privadas
- Estáticas y dinámicas
- Elastic IPs

### 2. **Gestión Automática**
- Auto-assignment en subnets
- DHCP configuration
- DNS resolution
- IP address lifecycle

### 3. **Control y Seguridad**
- Security Groups integration
- Network ACLs
- IP filtering
- Access control

### 4. **Escalabilidad**
- Rangos de IP personalizables
- VPC CIDR blocks
- Subnet subdivision
- Peering support

## Tipos de Direcciones IP

### **IPv4 vs IPv6**
```bash
# IPv4 - 32 bits, formato decimal
192.168.1.10
10.0.0.5
172.16.0.100

# IPv6 - 128 bits, formato hexadecimal
2001:db8:85a3::8a2e:370:7334
2600:1f14:1bfa:7e00:a2c4:8f1a:1234:5678
fe80::1ff:fe23:4567:890a
```

### **Públicas vs Privadas**
```bash
# IPv4 Privadas (RFC 1918)
10.0.0.0 - 10.255.255.255     (10.0.0.0/8)
172.16.0.0 - 172.31.255.255   (172.16.0.0/12)
192.168.0.0 - 192.168.255.255 (192.168.0.0/16)

# IPv4 Públicas (resto del espacio)
3.8.0.0/16
52.94.0.0/16
54.230.0.0/16
```

## Elastic IP Addresses

### **Creación y Gestión**
```bash
# Asignar Elastic IP
aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=my-eip}]'

# Asignar Elastic IP a instancia
aws ec2 associate-address \
  --instance-id i-1234567890abcdef0 \
  --allocation-id eipalloc-1234567890abcdef0

# Desasociar Elastic IP
aws ec2 disassociate-address \
  --association-id eipassoc-1234567890abcdef0

# Liberar Elastic IP
aws ec2 release-address \
  --allocation-id eipalloc-1234567890abcdef0

# Describir Elastic IPs
aws ec2 describe-addresses \
  --allocation-ids eipalloc-1234567890abcdef0
```

### **Configuración Avanzada**
```python
import boto3
import time
from datetime import datetime

class ElasticIPManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def allocate_elastic_ip(self, config):
        """Asignar Elastic IP con configuración"""
        
        try:
            params = {
                'TagSpecifications': [
                    {
                        'ResourceType': 'elastic-ip',
                        'Tags': config.get('tags', [{'Key': 'Name', 'Value': config.get('name', 'eip')}])
                    }
                ]
            }
            
            # Configurar dominio (VPC o estándar)
            if config.get('domain') == 'vpc':
                params['Domain'] = 'vpc'
            
            # Configurar dirección IPv4 específica
            if config.get('public_ipv4_pool'):
                params['PublicIpv4Pool'] = config['public_ipv4_pool']
            
            response = self.ec2.allocate_address(**params)
            
            return {
                'success': True,
                'allocation_id': response['AllocationId'],
                'public_ip': response['PublicIp'],
                'domain': response['Domain']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_elastic_ip(self, allocation_id, instance_id=None, network_interface_id=None, private_ip_address=None):
        """Asociar Elastic IP a recurso"""
        
        try:
            params = {
                'AllocationId': allocation_id
            }
            
            if instance_id:
                params['InstanceId'] = instance_id
            elif network_interface_id:
                params['NetworkInterfaceId'] = network_interface_id
                if private_ip_address:
                    params['PrivateIpAddress'] = private_ip_address
            else:
                return {
                    'success': False,
                    'error': 'Must specify either instance_id or network_interface_id'
                }
            
            response = self.ec2.associate_address(**params)
            
            return {
                'success': True,
                'association_id': response['AssociationId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_elastic_ips(self, filters=None):
        """Describir Elastic IPs"""
        
        try:
            params = {}
            if filters:
                params['Filters'] = filters
            
            response = self.ec2.describe_addresses(**params)
            
            elastic_ips = []
            for address in response['Addresses']:
                eip_info = {
                    'allocation_id': address['AllocationId'],
                    'association_id': address.get('AssociationId'),
                    'public_ip': address.get('PublicIp'),
                    'private_ip_address': address.get('PrivateIpAddress'),
                    'instance_id': address.get('InstanceId'),
                    'network_interface_id': address.get('NetworkInterfaceId'),
                    'domain': address.get('Domain'),
                    'instance_owner_id': address.get('InstanceId'),
                    'tags': address.get('Tags', [])
                }
                elastic_ips.append(eip_info)
            
            return {
                'success': True,
                'elastic_ips': elastic_ips,
                'count': len(elastic_ips)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def release_elastic_ip(self, allocation_id):
        """Liberar Elastic IP"""
        
        try:
            # Primero desasociar si está asociada
            eip_info = self.describe_elastic_ips([
                {'Name': 'allocation-id', 'Values': [allocation_id]}
            ])
            
            if eip_info['success'] and eip_info['elastic_ips']:
                eip = eip_info['elastic_ips'][0]
                if eip['association_id']:
                    self.ec2.disassociate_address(AssociationId=eip['association_id'])
            
            # Liberar Elastic IP
            self.ec2.release_address(AllocationId=allocation_id)
            
            return {
                'success': True,
                'allocation_id': allocation_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_unused_elastic_ips(self):
        """Obtener Elastic IPs no utilizadas"""
        
        try:
            response = self.ec2.describe_addresses()
            
            unused_eips = []
            for address in response['Addresses']:
                # Si no está asociada a ninguna instancia o interfaz
                if not address.get('AssociationId'):
                    unused_eips.append({
                        'allocation_id': address['AllocationId'],
                        'public_ip': address['PublicIp'],
                        'domain': address.get('Domain'),
                        'tags': address.get('Tags', [])
                    })
            
            return {
                'success': True,
                'unused_eips': unused_eips,
                'count': len(unused_eips)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## IPv6 Addressing

### **Configuración de IPv6 en VPC**
```bash
# Habilitar IPv6 en VPC
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-1234567890abcdef0 \
  --enable-dns-hostnames \
  --enable-dns-support

# Asociar bloque CIDR IPv6
aws ec2 associate-vpc-cidr-block \
  --vpc-id vpc-1234567890abcdef0 \
  --amazon-provided-ipv6-cidr-block

# Describir VPC con IPv6
aws ec2 describe-vpcs \
  --vpc-ids vpc-1234567890abcdef0
```

### **Subnets IPv6**
```bash
# Crear subnet con IPv6
aws ec2 create-subnet \
  --vpc-id vpc-1234567890abcdef0 \
  --cidr-block 10.0.1.0/24 \
  --ipv6-cidr-block 2600:1f14:1bfa:7e00::/64 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ipv6-subnet}]'

# Modificar atributos de IPv6 en subnet
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-1234567890abcdef0 \
  --assign-ipv6-address-on-creation

# Describir subnets con IPv6
aws ec2 describe-subnets \
  --subnet-ids subnet-1234567890abcdef0
```

### **Gestión de IPv6 con Python**
```python
class IPv6Manager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def enable_ipv6_vpc(self, vpc_id):
        """Habilitar IPv6 en VPC"""
        
        try:
            # Asociar bloque CIDR IPv6
            response = self.ec2.associate_vpc_cidr_block(
                VpcId=vpc_id,
                AmazonProvidedIpv6CidrBlock=True
            )
            
            ipv6_cidr = response['Ipv6CidrBlockAssociation']['Ipv6CidrBlock']
            
            return {
                'success': True,
                'vpc_id': vpc_id,
                'ipv6_cidr_block': ipv6_cidr,
                'association_id': response['Ipv6CidrBlockAssociation']['AssociationId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ipv6_subnet(self, vpc_id, ipv4_cidr, availability_zone, ipv6_cidr=None):
        """Crear subnet con soporte IPv6"""
        
        try:
            params = {
                'VpcId': vpc_id,
                'CidrBlock': ipv4_cidr,
                'AvailabilityZone': availability_zone,
                'TagSpecifications': [
                    {
                        'ResourceType': 'subnet',
                        'Tags': [{'Key': 'Name', 'Value': f'ipv6-subnet-{availability_zone}'}]
                    }
                ]
            }
            
            # Agregar IPv6 CIDR si se especifica
            if ipv6_cidr:
                params['Ipv6CidrBlock'] = ipv6_cidr
            
            response = self.ec2.create_subnet(**params)
            subnet_id = response['Subnet']['SubnetId']
            
            # Habilitar auto-assign IPv6
            self.ec2.modify_subnet_attribute(
                SubnetId=subnet_id,
                AssignIpv6AddressOnCreation=True
            )
            
            return {
                'success': True,
                'subnet_id': subnet_id,
                'ipv4_cidr': ipv4_cidr,
                'ipv6_cidr': response['Subnet'].get('Ipv6CidrBlockAssociationSet', [{}])[0].get('Ipv6CidrBlock')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def assign_ipv6_address(self, network_interface_id):
        """Asignar dirección IPv6 a interfaz de red"""
        
        try:
            response = self.ec2.assign_ipv6_addresses(
                NetworkInterfaceId=network_interface_id,
                Ipv6AddressCount=1
            )
            
            return {
                'success': True,
                'network_interface_id': network_interface_id,
                'assigned_ipv6_addresses': response['AssignedIpv6Addresses']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_ipv6_addresses(self, vpc_id=None):
        """Describir direcciones IPv6"""
        
        try:
            params = {}
            if vpc_id:
                params['Filters'] = [{'Name': 'vpc-id', 'Values': [vpc_id]}]
            
            response = self.ec2.describe_addresses(**params)
            
            ipv6_addresses = []
            for address in response['Addresses']:
                if address.get('PrivateIpAddress') and ':' in address.get('PrivateIpAddress', ''):
                    ipv6_info = {
                        'allocation_id': address['AllocationId'],
                        'private_ipv6': address['PrivateIpAddress'],
                        'network_interface_id': address.get('NetworkInterfaceId'),
                        'instance_id': address.get('InstanceId'),
                        'association_id': address.get('AssociationId')
                    }
                    ipv6_addresses.append(ipv6_info)
            
            return {
                'success': True,
                'ipv6_addresses': ipv6_addresses,
                'count': len(ipv6_addresses)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Network Interfaces

### **ENI (Elastic Network Interfaces)**
```bash
# Crear ENI
aws ec2 create-network-interface \
  --subnet-id subnet-1234567890abcdef0 \
  --description "Primary ENI for web server" \
  --groups sg-1234567890abcdef0 \
  --private-ip-address 10.0.1.100 \
  --tag-specifications 'ResourceType=network-interface,Tags=[{Key=Name,Value=web-eni}]'

# Adjuntar ENI a instancia
aws ec2 attach-network-interface \
  --network-interface-id eni-1234567890abcdef0 \
  --instance-id i-1234567890abcdef0 \
  --device-index 1

# Describir ENIs
aws ec2 describe-network-interfaces \
  --network-interface-ids eni-1234567890abcdef0
```

### **Gestión de ENIs con Python**
```python
class NetworkInterfaceManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_network_interface(self, config):
        """Crear interfaz de red elástica"""
        
        try:
            params = {
                'SubnetId': config['subnet_id'],
                'Description': config.get('description', ''),
                'TagSpecifications': [
                    {
                        'ResourceType': 'network-interface',
                        'Tags': config.get('tags', [{'Key': 'Name', 'Value': config.get('name', 'eni')}])
                    }
                ]
            }
            
            # Agregar security groups
            if config.get('security_groups'):
                params['Groups'] = config['security_groups']
            
            # Agregar dirección IP privada
            if config.get('private_ip_address'):
                params['PrivateIpAddress'] = config['private_ip_address']
            
            # Agregar direcciones IPv6 secundarias
            if config.get('ipv6_addresses'):
                params['Ipv6Addresses'] = config['ipv6_addresses']
            
            response = self.ec2.create_network_interface(**params)
            
            return {
                'success': True,
                'network_interface_id': response['NetworkInterface']['NetworkInterfaceId'],
                'subnet_id': response['NetworkInterface']['SubnetId'],
                'private_ip': response['NetworkInterface']['PrivateIpAddress']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def attach_network_interface(self, network_interface_id, instance_id, device_index=1):
        """Adjuntar ENI a instancia"""
        
        try:
            response = self.ec2.attach_network_interface(
                NetworkInterfaceId=network_interface_id,
                InstanceId=instance_id,
                DeviceIndex=device_index
            )
            
            return {
                'success': True,
                'attachment_id': response['AttachmentId'],
                'network_interface_id': network_interface_id,
                'instance_id': instance_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_network_interfaces(self, filters=None):
        """Describir interfaces de red"""
        
        try:
            params = {}
            if filters:
                params['Filters'] = filters
            
            response = self.ec2.describe_network_interfaces(**params)
            
            interfaces = []
            for interface in response['NetworkInterfaces']:
                interface_info = {
                    'network_interface_id': interface['NetworkInterfaceId'],
                    'subnet_id': interface['SubnetId'],
                    'vpc_id': interface['VpcId'],
                    'availability_zone': interface['AvailabilityZone'],
                    'description': interface.get('Description'),
                    'private_ip_address': interface['PrivateIpAddress'],
                    'private_ip_addresses': interface['PrivateIpAddresses'],
                    'ipv6_addresses': interface['Ipv6Addresses'],
                    'mac_address': interface['MacAddress'],
                    'interface_type': interface['InterfaceType'],
                    'attachment': interface.get('Attachment'),
                    'groups': interface['Groups'],
                    'tags': interface.get('Tags', [])
                }
                interfaces.append(interface_info)
            
            return {
                'success': True,
                'interfaces': interfaces,
                'count': len(interfaces)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def assign_secondary_private_ip(self, network_interface_id, secondary_ip):
        """Asignar IP privada secundaria"""
        
        try:
            response = self.ec2.assign_private_ip_addresses(
                NetworkInterfaceId=network_interface_id,
                PrivateIpAddresses=[secondary_ip]
            )
            
            return {
                'success': True,
                'network_interface_id': network_interface_id,
                'assigned_ips': response['AssignedPrivateIpAddresses']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def unassign_private_ip(self, network_interface_id, private_ip):
        """Desasignar IP privada"""
        
        try:
            self.ec2.unassign_private_ip_addresses(
                NetworkInterfaceId=network_interface_id,
                PrivateIpAddresses=[private_ip]
            )
            
            return {
                'success': True,
                'network_interface_id': network_interface_id,
                'unassigned_ip': private_ip
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. High Availability con Elastic IPs**
```python
class HighAvailabilityIPManager:
    def __init__(self, region='us-east-1'):
        self.eip_manager = ElasticIPManager(region)
        self.eni_manager = NetworkInterfaceManager(region)
        self.ec2 = boto3.client('ec2', region_name=region)
    
    def setup_ha_ip_configuration(self, config):
        """Configurar IP para alta disponibilidad"""
        
        # Crear Elastic IP principal
        primary_eip = self.eip_manager.allocate_elastic_ip({
            'name': config['name'] + '-primary',
            'domain': 'vpc',
            'tags': config.get('tags', [])
        })
        
        if not primary_eip['success']:
            return primary_eip
        
        # Crear ENI principal
        primary_eni = self.eni_manager.create_network_interface({
            'subnet_id': config['primary_subnet_id'],
            'private_ip_address': config['primary_private_ip'],
            'security_groups': config['security_groups'],
            'description': 'Primary ENI for HA',
            'tags': [{'Key': 'Name', 'Value': config['name'] + '-primary-eni'}]
        })
        
        if not primary_eni['success']:
            return primary_eni
        
        # Asociar EIP a ENI principal
        eip_association = self.eip_manager.associate_elastic_ip(
            primary_eip['allocation_id'],
            network_interface_id=primary_eni['network_interface_id']
        )
        
        # Adjuntar ENI a instancia principal
        eni_attachment = self.eni_manager.attach_network_interface(
            primary_eni['network_interface_id'],
            config['primary_instance_id']
        )
        
        return {
            'success': True,
            'primary_eip': primary_eip,
            'primary_eni': primary_eni,
            'eip_association': eip_association,
            'eni_attachment': eni_attachment
        }
    
    def failover_ip_to_secondary(self, eip_allocation_id, secondary_instance_id, secondary_eni_id=None):
        """Realizar failover de IP a instancia secundaria"""
        
        try:
            # Obtener información del EIP actual
            eip_info = self.eip_manager.describe_elastic_ips([
                {'Name': 'allocation-id', 'Values': [eip_allocation_id]}
            ])
            
            if not eip_info['success'] or not eip_info['elastic_ips']:
                return {'success': False, 'error': 'Elastic IP not found'}
            
            current_eip = eip_info['elastic_ips'][0]
            
            # Desasociar EIP de recurso actual
            if current_eip['association_id']:
                self.ec2.disassociate_address(AssociationId=current_eip['association_id'])
            
            # Crear o usar ENI secundaria
            if secondary_eni_id:
                # Usar ENI existente
                secondary_eni = secondary_eni_id
            else:
                # Crear nueva ENI en la instancia secundaria
                # (requeriría información de la subnet de la instancia secundaria)
                return {'success': False, 'error': 'Secondary ENI ID required'}
            
            # Asociar EIP a ENI secundaria
            new_association = self.eip_manager.associate_elastic_ip(
                eip_allocation_id,
                network_interface_id=secondary_eni
            )
            
            return {
                'success': True,
                'failover_completed': True,
                'new_association_id': new_association['association_id'],
                'secondary_instance_id': secondary_instance_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### **2. Gestión de IPs para Microservicios**
```python
class MicroserviceIPManager:
    def __init__(self, region='us-east-1'):
        self.eip_manager = ElasticIPManager(region)
        self.eni_manager = NetworkInterfaceManager(region)
    
    def setup_service_ip_pool(self, service_config):
        """Configurar pool de IPs para microservicio"""
        
        ip_pool = {}
        
        # Crear EIPs para cada instancia del servicio
        for i, instance_config in enumerate(service_config['instances']):
            eip_result = self.eip_manager.allocate_elastic_ip({
                'name': f"{service_config['service_name']}-eip-{i}",
                'domain': 'vpc',
                'tags': [
                    {'Key': 'Name', 'Value': f"{service_config['service_name']}-eip-{i}"},
                    {'Key': 'Service', 'Value': service_config['service_name']},
                    {'Key': 'Instance', 'Value': instance_config['instance_id']}
                ]
            })
            
            if eip_result['success']:
                # Asociar EIP a la instancia
                association = self.eip_manager.associate_elastic_ip(
                    eip_result['allocation_id'],
                    instance_id=instance_config['instance_id']
                )
                
                ip_pool[instance_config['instance_id']] = {
                    'eip_allocation_id': eip_result['allocation_id'],
                    'public_ip': eip_result['public_ip'],
                    'association_id': association['association_id']
                }
        
        return {
            'success': True,
            'service_name': service_config['service_name'],
            'ip_pool': ip_pool,
            'total_ips': len(ip_pool)
        }
    
    def add_instance_to_service(self, service_name, instance_id, subnet_id, security_groups):
        """Agregar nueva instancia al pool de IPs del servicio"""
        
        # Crear EIP para nueva instancia
        eip_result = self.eip_manager.allocate_elastic_ip({
            'name': f"{service_name}-eip-{instance_id}",
            'domain': 'vpc',
            'tags': [
                {'Key': 'Name', 'Value': f"{service_name}-eip-{instance_id}"},
                {'Key': 'Service', 'Value': service_name},
                {'Key': 'Instance', 'Value': instance_id}
            ]
        })
        
        if eip_result['success']:
            # Asociar EIP a instancia
            association = self.eip_manager.associate_elastic_ip(
                eip_result['allocation_id'],
                instance_id=instance_id
            )
            
            return {
                'success': True,
                'instance_id': instance_id,
                'eip_allocation_id': eip_result['allocation_id'],
                'public_ip': eip_result['public_ip'],
                'association_id': association['association_id']
            }
        
        return eip_result
    
    def remove_instance_from_service(self, instance_id, eip_allocation_id):
        """Remover instancia del pool de IPs"""
        
        try:
            # Desasociar EIP de la instancia
            eip_info = self.eip_manager.describe_elastic_ips([
                {'Name': 'allocation-id', 'Values': [eip_allocation_id]}
            ])
            
            if eip_info['success'] and eip_info['elastic_ips']:
                eip = eip_info['elastic_ips'][0]
                if eip['association_id']:
                    self.ec2.disassociate_address(AssociationId=eip['association_id'])
            
            # Liberar EIP
            release_result = self.eip_manager.release_elastic_ip(eip_allocation_id)
            
            return {
                'success': True,
                'instance_id': instance_id,
                'eip_released': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_service_ip_summary(self, service_name):
        """Obtener resumen de IPs del servicio"""
        
        try:
            # Filtrar EIPs por tag de servicio
            eip_info = self.eip_manager.describe_elastic_ips([
                {'Name': 'tag:Service', 'Values': [service_name]}
            ])
            
            if not eip_info['success']:
                return eip_info
            
            service_ips = []
            for eip in eip_info['elastic_ips']:
                service_ip_info = {
                    'public_ip': eip['public_ip'],
                    'instance_id': eip['instance_id'],
                    'allocation_id': eip['allocation_id'],
                    'association_id': eip['association_id'],
                    'status': 'associated' if eip['association_id'] else 'unassociated'
                }
                service_ips.append(service_ip_info)
            
            return {
                'success': True,
                'service_name': service_name,
                'service_ips': service_ips,
                'total_ips': len(service_ips),
                'associated_ips': len([ip for ip in service_ips if ip['status'] == 'associated'])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### **3. IPv6 Migration Strategy**
```python
class IPv6MigrationManager:
    def __init__(self, region='us-east-1'):
        self.ipv6_manager = IPv6Manager(region)
        self.eni_manager = NetworkInterfaceManager(region)
    
    def migrate_vpc_to_ipv6(self, vpc_id, migration_config):
        """Migrar VPC a soporte IPv6"""
        
        migration_results = {}
        
        # Habilitar IPv6 en VPC
        vpc_ipv6 = self.ipv6_manager.enable_ipv6_vpc(vpc_id)
        migration_results['vpc_ipv6'] = vpc_ipv6
        
        if not vpc_ipv6['success']:
            return migration_results
        
        # Migrar subnets existentes
        subnet_migrations = []
        for subnet_config in migration_config['subnets']:
            # Modificar subnet existente para soportar IPv6
            try:
                self.ec2.modify_subnet_attribute(
                    SubnetId=subnet_config['subnet_id'],
                    AssignIpv6AddressOnCreation=True
                )
                
                subnet_migrations.append({
                    'subnet_id': subnet_config['subnet_id'],
                    'ipv6_enabled': True
                })
                
            except Exception as e:
                subnet_migrations.append({
                    'subnet_id': subnet_config['subnet_id'],
                    'error': str(e)
                })
        
        migration_results['subnet_migrations'] = subnet_migrations
        
        # Crear nuevas subnets IPv6 si se especifican
        new_subnets = []
        for new_subnet in migration_config.get('new_ipv6_subnets', []):
            subnet_result = self.ipv6_manager.create_ipv6_subnet(
                vpc_id,
                new_subnet['ipv4_cidr'],
                new_subnet['availability_zone'],
                new_subnet.get('ipv6_cidr')
            )
            
            new_subnets.append(subnet_result)
        
        migration_results['new_subnets'] = new_subnets
        
        return migration_results
    
    def assign_ipv6_to_instances(self, instance_configs):
        """Asignar direcciones IPv6 a instancias"""
        
        assignments = []
        
        for instance_config in instance_configs:
            try:
                # Obtener interfaces de red de la instancia
                interfaces = self.eni_manager.describe_network_interfaces([
                    {'Name': 'attachment.instance-id', 'Values': [instance_config['instance_id']]}
                ])
                
                if interfaces['success'] and interfaces['interfaces']:
                    primary_interface = interfaces['interfaces'][0]
                    
                    # Asignar dirección IPv6
                    ipv6_assignment = self.ipv6_manager.assign_ipv6_address(
                        primary_interface['network_interface_id']
                    )
                    
                    assignments.append({
                        'instance_id': instance_config['instance_id'],
                        'network_interface_id': primary_interface['network_interface_id'],
                        'ipv6_assignment': ipv6_assignment
                    })
                
            except Exception as e:
                assignments.append({
                    'instance_id': instance_config['instance_id'],
                    'error': str(e)
                })
        
        return {
            'success': True,
            'assignments': assignments,
            'total_assignments': len(assignments)
        }
```

## Security y Best Practices

### **Security Groups y IP Filtering**
```python
class IPSecurityManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
    
    def create_ip_whitelist_security_group(self, vpc_id, allowed_ips, sg_config):
        """Crear security group con whitelist de IPs"""
        
        try:
            # Crear security group
            sg_response = self.ec2.create_security_group(
                GroupName=sg_config['name'],
                Description=sg_config.get('description', 'Security group with IP whitelist'),
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': sg_config.get('tags', [{'Key': 'Name', 'Value': sg_config['name']}])
                    }
                ]
            )
            
            sg_id = sg_response['GroupId']
            
            # Agregar reglas de entrada para IPs permitidas
            for rule in sg_config.get('ingress_rules', []):
                for ip in allowed_ips:
                    ip_rule = rule.copy()
                    ip_rule['IpRanges'] = [{'CidrIp': ip}]
                    
                    self.ec2.authorize_security_group_ingress(
                        GroupId=sg_id,
                        IpPermissions=[ip_rule]
                    )
            
            return {
                'success': True,
                'security_group_id': sg_id,
                'allowed_ips': allowed_ips
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_ip_whitelist(self, sg_id, new_allowed_ips, port_ranges):
        """Actualizar whitelist de IPs en security group"""
        
        try:
            # Primero remover reglas existentes
            current_rules = self.ec2.describe_security_groups(GroupIds=[sg_id])
            
            if current_rules['SecurityGroups']:
                sg = current_rules['SecurityGroups'][0]
                
                # Revocar reglas existentes (excepto las por defecto)
                for rule in sg['IpPermissions']:
                    self.ec2.revoke_security_group_ingress(
                        GroupId=sg_id,
                        IpPermissions=[rule]
                    )
                
                # Agregar nuevas reglas
                for port_range in port_ranges:
                    for ip in new_allowed_ips:
                        new_rule = {
                            'IpProtocol': 'tcp',
                            'FromPort': port_range['from'],
                            'ToPort': port_range['to'],
                            'IpRanges': [{'CidrIp': ip}]
                        }
                        
                        self.ec2.authorize_security_group_ingress(
                            GroupId=sg_id,
                            IpPermissions=[new_rule]
                        )
            
            return {
                'success': True,
                'security_group_id': sg_id,
                'updated_ips': new_allowed_ips
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def audit_ip_exposure(self, vpc_id):
        """Auditar exposición de IPs en VPC"""
        
        try:
            # Obtener todos los security groups
            sg_response = self.ec2.describe_security_groups(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            
            audit_results = {
                'security_groups': [],
                'public_exposures': [],
                'recommendations': []
            }
            
            for sg in sg_response['SecurityGroups']:
                sg_audit = {
                    'sg_id': sg['GroupId'],
                    'sg_name': sg['GroupName'],
                    'public_rules': [],
                    'restricted_rules': []
                }
                
                # Analizar reglas de entrada
                for rule in sg['IpPermissions']:
                    for ip_range in rule.get('IpRanges', []):
                        if ip_range['CidrIp'] == '0.0.0.0/0':
                            sg_audit['public_rules'].append({
                                'protocol': rule.get('IpProtocol'),
                                'from_port': rule.get('FromPort'),
                                'to_port': rule.get('ToPort')
                            })
                            
                            # Agregar a exposiciones públicas
                            audit_results['public_exposures'].append({
                                'security_group': sg['GroupName'],
                                'protocol': rule.get('IpProtocol'),
                                'port_range': f"{rule.get('FromPort', 'any')}-{rule.get('ToPort', 'any')}",
                                'exposure': '0.0.0.0/0'
                            })
                        else:
                            sg_audit['restricted_rules'].append({
                                'protocol': rule.get('IpProtocol'),
                                'from_port': rule.get('FromPort'),
                                'to_port': rule.get('ToPort'),
                                'cidr': ip_range['CidrIp']
                            })
                
                audit_results['security_groups'].append(sg_audit)
            
            # Generar recomendaciones
            if audit_results['public_exposures']:
                audit_results['recommendations'].append('Review public exposure rules')
                audit_results['recommendations'].append('Consider restricting access to specific IP ranges')
                audit_results['recommendations'].append('Implement bastion hosts for administrative access')
            
            return {
                'success': True,
                'vpc_id': vpc_id,
                'audit_results': audit_results
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
def calculate_ip_addressing_costs(elastic_ips, nat_gateways, data_transfer_gb):
    """Calcular costos de direccionamiento IP"""
    
    # Elastic IP cost (no asignadas)
    # $0.005 por hora por IP no asignada
    # Asignadas son gratuitas si están asociadas a instancias running
    
    elastic_ip_cost = elastic_ips * 0.005 * 24 * 30  # Mensual
    
    # NAT Gateway cost
    nat_cost = nat_gateways * 0.045 * 24 * 30  # $0.045 por hora
    
    # Data Transfer cost
    data_transfer_cost = data_transfer_gb * 0.09  # $0.09 por GB
    
    total_cost = elastic_ip_cost + nat_cost + data_transfer_cost
    
    return {
        'elastic_ip_cost': elastic_ip_cost,
        'nat_gateway_cost': nat_cost,
        'data_transfer_cost': data_transfer_cost,
        'total_monthly_cost': total_cost
    }

def optimize_ip_costs(ip_manager):
    """Optimizar costos de IPs"""
    
    optimization_suggestions = []
    
    # Obtener EIPs no utilizadas
    unused_eips = ip_manager.get_unused_elastic_ips()
    
    if unused_eips['success'] and unused_eips['count'] > 0:
        optimization_suggestions.append({
            'type': 'unused_elastic_ips',
            'count': unused_eips['count'],
            'suggestion': 'Release unused Elastic IPs to save costs',
            'potential_savings': unused_eips['count'] * 0.005 * 24 * 30
        })
    
    return {
        'optimization_suggestions': optimization_suggestions,
        'total_potential_savings': sum(s['potential_savings'] for s in optimization_suggestions)
    }
```

## Conclusion

AWS IP Addressing es fundamental para el networking en AWS, proporcionando control completo sobre la asignación y gestión de direcciones IP tanto IPv4 como IPv6. Es esencial para configurar accesibilidad a internet, implementar alta disponibilidad, gestionar microservicios y planificar migraciones a IPv6, ofreciendo flexibilidad y escalabilidad para arquitecturas modernas en la nube.
