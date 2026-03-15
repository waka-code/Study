# AWS Network ACLs (Access Control Lists)

## Definición

Las Network ACLs (NACLs) son una capa de seguridad a nivel de subnet que actúan como un firewall stateless para controlar el tráfico de entrada y salida. A diferencia de los Security Groups que operan a nivel de instancia, las NACLs se aplican a toda la subnet y proporcionan una capa adicional de control de tráfico.

## Características Principales

### 1. **Stateless**
- No mantienen estado de conexiones
- Cada regla se evalúa independientemente
- Deben permitir tráfico de respuesta explícitamente

### 2. **Subnet Level**
- Se aplican a todas las instancias en la subnet
- Una subnet solo puede tener una NACL asociada
- Todas las instancias heredan las reglas de la NACL

### 3. **Bidirectional**
- Controlan tráfico de entrada (ingress)
- Controlan tráfico de salida (egress)
- Reglas separadas para cada dirección

### 4. **Rule Evaluation**
- Reglas numeradas del 1-32766
- Evaluadas en orden numérico
- Primera regla que coincide determina la acción

## Tipos de Network ACLs

### **Default NACL**
```
Reglas por defecto:
- Entrada: Permitir todo (rule 100)
- Salida: Permitir todo (rule 100)
- Creada automáticamente con cada VPC
```

### **Custom NACL**
```
Reglas personalizadas:
- Entrada: Denegar todo (implicit deny)
- Salida: Denegar todo (implicit deny)
- Debes crear reglas explícitas para permitir tráfico
```

## Configuración con AWS CLI

### Creación de NACL Personalizada
```bash
# Crear Network ACL
aws ec2 create-network-acl \
  --vpc-id vpc-1234567890abcdef0 \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=my-custom-nacl}]'

# Respuesta esperada:
{
    "NetworkAcl": {
        "Associations": [],
        "Entries": [
            {
                "CidrBlock": "0.0.0.0/0",
                "Egress": true,
                "IcmpTypeCode": {},
                "PortRange": {},
                "Protocol": "-1",
                "RuleAction": "deny",
                "RuleNumber": 32767
            },
            {
                "CidrBlock": "0.0.0.0/0",
                "Egress": false,
                "IcmpTypeCode": {},
                "PortRange": {},
                "Protocol": "-1",
                "RuleAction": "deny",
                "RuleNumber": 32767
            }
        ],
        "IsDefault": false,
        "NetworkAclId": "acl-1234567890abcdef0",
        "OwnerId": "123456789012",
        "VpcId": "vpc-1234567890abcdef0"
    }
}
```

### Agregar Reglas de Entrada
```bash
# Regla 100: Permitir SSH desde red corporativa
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --protocol 6 \
  --rule-action allow \
  --ingress \
  --port-range From=22,To=22 \
  --cidr-block 203.0.113.0/24

# Regla 110: Permitir HTTP desde cualquier lugar
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 110 \
  --protocol 6 \
  --rule-action allow \
  --ingress \
  --port-range From=80,To=80 \
  --cidr-block 0.0.0.0/0

# Regla 120: Permitir HTTPS desde cualquier lugar
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 120 \
  --protocol 6 \
  --rule-action allow \
  --ingress \
  --port-range From=443,To=443 \
  --cidr-block 0.0.0.0/0

# Regla 130: Permitir ICMP (ping)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 130 \
  --protocol 1 \
  --rule-action allow \
  --ingress \
  --icmp-type-code Type=8,Code=0 \
  --cidr-block 0.0.0.0/0
```

### Agregar Reglas de Salida
```bash
# Regla 100: Permitir HTTP saliente
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --protocol 6 \
  --rule-action allow \
  --egress \
  --port-range From=80,To=80 \
  --cidr-block 0.0.0.0/0

# Regla 110: Permitir HTTPS saliente
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 110 \
  --protocol 6 \
  --rule-action allow \
  --egress \
  --port-range From=443,To=443 \
  --cidr-block 0.0.0.0/0

# Regla 120: Permitir DNS (UDP 53)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 120 \
  --protocol 17 \
  --rule-action allow \
  --egress \
  --port-range From=53,To=53 \
  --cidr-block 0.0.0.0/0

# Regla 130: Permitir todo el tráfico de salida (opcional)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 130 \
  --protocol -1 \
  --rule-action allow \
  --egress \
  --cidr-block 0.0.0.0/0
```

### Asociación con Subnet
```bash
# Asociar NACL a subnet
aws ec2 associate-network-acl-subnet \
  --network-acl-id acl-1234567890abcdef0 \
  --subnet-id subnet-1234567890abcdef0

# Respuesta esperada:
{
    "AssociationId": "acla-1234567890abcdef0",
    "NetworkAclId": "acl-1234567890abcdef0",
    "SubnetId": "subnet-1234567890abcdef0"
}
```

### Gestión de Network ACLs
```bash
# Listar todas las NACLs
aws ec2 describe-network-acls

# Describir NACL específica
aws ec2 describe-network-acls \
  --network-acl-ids acl-1234567890abcdef0

# Reemplazar asociación (cambiar NACL de subnet)
aws ec2 replace-network-acl-association \
  --association-id acla-1234567890abcdef0 \
  --network-acl-id acl-87654321fedcba98

# Eliminar regla de NACL
aws ec2 delete-network-acl-entry \
  --network-acl-id acl-1234567890abcdef0 \
  --rule-number 100 \
  --egress

# Eliminar Network ACL
aws ec2 delete-network-acl \
  --network-acl-id acl-1234567890abcdef0
```

## Configuración con Python

### Clase NetworkACLManager
```python
import boto3
import json
from datetime import datetime

class NetworkACLManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_network_acl(self, vpc_id, name, description=None):
        """Crear Network ACL personalizada"""
        
        try:
            params = {
                'VpcId': vpc_id,
                'TagSpecifications': [
                    {
                        'ResourceType': 'network-acl',
                        'Tags': [{'Key': 'Name', 'Value': name}]
                    }
                ]
            }
            
            if description:
                params['TagSpecifications'][0]['Tags'].append(
                    {'Key': 'Description', 'Value': description}
                )
            
            response = self.ec2.create_network_acl(**params)
            
            return {
                'success': True,
                'network_acl_id': response['NetworkAcl']['NetworkAclId'],
                'vpc_id': vpc_id,
                'is_default': response['NetworkAcl']['IsDefault']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_ingress_rule(self, nacl_id, rule_number, protocol, port_range=None, 
                         cidr_block=None, icmp_type_code=None):
        """Agregar regla de entrada"""
        
        try:
            params = {
                'NetworkAclId': nacl_id,
                'RuleNumber': rule_number,
                'Protocol': str(protocol),
                'RuleAction': 'allow',
                'Egress': False
            }
            
            # Agregar rango de puertos
            if port_range:
                params['PortRange'] = port_range
            
            # Agregar CIDR block
            if cidr_block:
                params['CidrBlock'] = cidr_block
            
            # Agregar ICMP type/code
            if icmp_type_code:
                params['IcmpTypeCode'] = icmp_type_code
            
            response = self.ec2.create_network_acl_entry(**params)
            
            return {
                'success': True,
                'rule_number': rule_number,
                'network_acl_id': nacl_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_egress_rule(self, nacl_id, rule_number, protocol, port_range=None, 
                        cidr_block=None, icmp_type_code=None):
        """Agregar regla de salida"""
        
        try:
            params = {
                'NetworkAclId': nacl_id,
                'RuleNumber': rule_number,
                'Protocol': str(protocol),
                'RuleAction': 'allow',
                'Egress': True
            }
            
            # Agregar rango de puertos
            if port_range:
                params['PortRange'] = port_range
            
            # Agregar CIDR block
            if cidr_block:
                params['CidrBlock'] = cidr_block
            
            # Agregar ICMP type/code
            if icmp_type_code:
                params['IcmpTypeCode'] = icmp_type_code
            
            response = self.ec2.create_network_acl_entry(**params)
            
            return {
                'success': True,
                'rule_number': rule_number,
                'network_acl_id': nacl_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def associate_with_subnet(self, nacl_id, subnet_id):
        """Asociar NACL a subnet"""
        
        try:
            response = self.ec2.associate_network_acl_subnet(
                NetworkAclId=nacl_id,
                SubnetId=subnet_id
            )
            
            return {
                'success': True,
                'association_id': response['NetworkAclAssociationId'],
                'network_acl_id': nacl_id,
                'subnet_id': subnet_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def describe_network_acl(self, nacl_id):
        """Obtener detalles de Network ACL"""
        
        try:
            response = self.ec2.describe_network_acls(
                NetworkAclIds=[nacl_id]
            )
            
            if not response['NetworkAcls']:
                return {
                    'success': False,
                    'error': 'Network ACL not found'
                }
            
            nacl = response['NetworkAcls'][0]
            
            # Analizar reglas
            ingress_rules = []
            egress_rules = []
            
            for entry in nacl['Entries']:
                rule_info = {
                    'rule_number': entry['RuleNumber'],
                    'protocol': entry['Protocol'],
                    'rule_action': entry['RuleAction'],
                    'port_range': entry.get('PortRange'),
                    'cidr_block': entry.get('CidrBlock'),
                    'icmp_type_code': entry.get('IcmpTypeCode')
                }
                
                if entry['Egress']:
                    egress_rules.append(rule_info)
                else:
                    ingress_rules.append(rule_info)
            
            return {
                'success': True,
                'network_acl_id': nacl['NetworkAclId'],
                'vpc_id': nacl['VpcId'],
                'is_default': nacl['IsDefault'],
                'owner_id': nacl['OwnerId'],
                'associations': nacl['Associations'],
                'ingress_rules': ingress_rules,
                'egress_rules': egress_rules,
                'tags': nacl.get('Tags', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_network_acls(self, vpc_id=None):
        """Listar Network ACLs"""
        
        try:
            params = {}
            if vpc_id:
                params['Filters'] = [{'Name': 'vpc-id', 'Values': [vpc_id]}]
            
            response = self.ec2.describe_network_acls(**params)
            
            nacls = []
            for nacl in response['NetworkAcls']:
                nacl_info = {
                    'network_acl_id': nacl['NetworkAclId'],
                    'vpc_id': nacl['VpcId'],
                    'is_default': nacl['IsDefault'],
                    'owner_id': nacl['OwnerId'],
                    'associations_count': len(nacl.get('Associations', [])),
                    'tags': nacl.get('Tags', [])
                }
                nacls.append(nacl_info)
            
            return {
                'success': True,
                'network_acls': nacls,
                'count': len(nacls)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_network_acl(self, nacl_id):
        """Eliminar Network ACL"""
        
        try:
            # Primero eliminar todas las asociaciones
            nacl_info = self.describe_network_acl(nacl_id)
            
            if nacl_info['success']:
                for association in nacl_info['associations']:
                    self.ec2.delete_network_acl_entry(
                        NetworkAclId=nacl_id,
                        RuleNumber=32767,
                        Egress=association['SubnetId'] is None
                    )
            
            # Eliminar Network ACL
            self.ec2.delete_network_acl(NetworkAclId=nacl_id)
            
            return {
                'success': True,
                'network_acl_id': nacl_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### Ejemplos de Configuración

#### NACL para Servidores Web
```python
def create_web_server_nacl(vpc_id, nacl_manager):
    """Crear NACL para servidores web"""
    
    # Crear NACL
    nacl_result = nacl_manager.create_network_acl(
        vpc_id,
        'web-server-nacl',
        'Network ACL for web servers'
    )
    
    if not nacl_result['success']:
        return nacl_result
    
    nacl_id = nacl_result['network_acl_id']
    
    # Reglas de entrada
    ingress_rules = [
        {
            'rule_number': 100,
            'protocol': 6,  # TCP
            'port_range': {'From': 80, 'To': 80},
            'cidr_block': '0.0.0.0/0'
        },
        {
            'rule_number': 110,
            'protocol': 6,  # TCP
            'port_range': {'From': 443, 'To': 443},
            'cidr_block': '0.0.0.0/0'
        },
        {
            'rule_number': 120,
            'protocol': 6,  # TCP
            'port_range': {'From': 22, 'To': 22},
            'cidr_block': '203.0.113.0/24'  # Red corporativa
        },
        {
            'rule_number': 130,
            'protocol': 1,  # ICMP
            'icmp_type_code': {'Type': 8, 'Code': 0},  # Ping
            'cidr_block': '0.0.0.0/0'
        }
    ]
    
    # Agregar reglas de entrada
    for rule in ingress_rules:
        result = nacl_manager.add_ingress_rule(
            nacl_id,
            rule['rule_number'],
            rule['protocol'],
            rule.get('port_range'),
            rule.get('cidr_block'),
            rule.get('icmp_type_code')
        )
        
        if not result['success']:
            print(f"Error adding ingress rule {rule['rule_number']}: {result['error']}")
    
    # Reglas de salida
    egress_rules = [
        {
            'rule_number': 100,
            'protocol': 6,  # TCP
            'port_range': {'From': 80, 'To': 80},
            'cidr_block': '0.0.0.0/0'
        },
        {
            'rule_number': 110,
            'protocol': 6,  # TCP
            'port_range': {'From': 443, 'To': 443},
            'cidr_block': '0.0.0.0/0'
        },
        {
            'rule_number': 120,
            'protocol': 17,  # UDP
            'port_range': {'From': 53, 'To': 53},
            'cidr_block': '0.0.0.0/0'
        }
    ]
    
    # Agregar reglas de salida
    for rule in egress_rules:
        result = nacl_manager.add_egress_rule(
            nacl_id,
            rule['rule_number'],
            rule['protocol'],
            rule.get('port_range'),
            rule.get('cidr_block'),
            rule.get('icmp_type_code')
        )
        
        if not result['success']:
            print(f"Error adding egress rule {rule['rule_number']}: {result['error']}")
    
    return {
        'success': True,
        'network_acl_id': nacl_id,
        'ingress_rules_count': len(ingress_rules),
        'egress_rules_count': len(egress_rules)
    }
```

#### NACL para Base de Datos
```python
def create_database_nacl(vpc_id, app_cidr, nacl_manager):
    """Crear NACL restrictiva para bases de datos"""
    
    # Crear NACL
    nacl_result = nacl_manager.create_network_acl(
        vpc_id,
        'database-nacl',
        'Restrictive Network ACL for database servers'
    )
    
    if not nacl_result['success']:
        return nacl_result
    
    nacl_id = nacl_result['network_acl_id']
    
    # Reglas de entrada (solo desde capa de aplicación)
    ingress_rules = [
        {
            'rule_number': 100,
            'protocol': 6,  # TCP
            'port_range': {'From': 3306, 'To': 3306},  # MySQL
            'cidr_block': app_cidr
        },
        {
            'rule_number': 110,
            'protocol': 6,  # TCP
            'port_range': {'From': 5432, 'To': 5432},  # PostgreSQL
            'cidr_block': app_cidr
        },
        {
            'rule_number': 120,
            'protocol': 1,  # ICMP
            'icmp_type_code': {'Type': 8, 'Code': 0},  # Ping desde app
            'cidr_block': app_cidr
        }
    ]
    
    # Agregar reglas de entrada
    for rule in ingress_rules:
        result = nacl_manager.add_ingress_rule(
            nacl_id,
            rule['rule_number'],
            rule['protocol'],
            rule.get('port_range'),
            rule.get('cidr_block'),
            rule.get('icmp_type_code')
        )
        
        if not result['success']:
            print(f"Error adding ingress rule {rule['rule_number']}: {result['error']}")
    
    # Reglas de salida (actualizaciones y DNS)
    egress_rules = [
        {
            'rule_number': 100,
            'protocol': 6,  # TCP
            'port_range': {'From': 443, 'To': 443},  # HTTPS para actualizaciones
            'cidr_block': '0.0.0.0/0'
        },
        {
            'rule_number': 110,
            'protocol': 17,  # UDP
            'port_range': {'From': 53, 'To': 53},  # DNS
            'cidr_block': '0.0.0.0/0'
        },
        {
            'rule_number': 120,
            'protocol': 6,  # TCP
            'port_range': {'From': 80, 'To': 80},  # HTTP
            'cidr_block': '0.0.0.0/0'
        }
    ]
    
    # Agregar reglas de salida
    for rule in egress_rules:
        result = nacl_manager.add_egress_rule(
            nacl_id,
            rule['rule_number'],
            rule['protocol'],
            rule.get('port_range'),
            rule.get('cidr_block'),
            rule.get('icmp_type_code')
        )
        
        if not result['success']:
            print(f"Error adding egress rule {rule['rule_number']}: {result['error']}")
    
    return {
        'success': True,
        'network_acl_id': nacl_id,
        'ingress_rules_count': len(ingress_rules),
        'egress_rules_count': len(egress_rules),
        'allowed_cidr': app_cidr
    }
```

## Protocolos y Puertos Comunes

### Protocolos Numéricos
```python
PROTOCOLS = {
    -1: 'All',
    1: 'ICMP',
    6: 'TCP',
    17: 'UDP'
}

# Ejemplos de uso
protocol = 6  # TCP
protocol = 17  # UDP
protocol = 1  # ICMP
protocol = -1  # All protocols
```

### Rangos de Puertos
```python
# Puertos específicos
port_range = {'From': 80, 'To': 80}     # Solo puerto 80
port_range = {'From': 443, 'To': 443}   # Solo puerto 443

# Rangos de puertos
port_range = {'From': 1024, 'To': 65535}  # Puertos dinámicos
port_range = {'From': 0, 'To': 65535}       # Todos los puertos

# Puertos comunes
COMMON_PORTS = {
    'HTTP': {'From': 80, 'To': 80},
    'HTTPS': {'From': 443, 'To': 443},
    'SSH': {'From': 22, 'To': 22},
    'FTP': {'From': 21, 'To': 21},
    'MySQL': {'From': 3306, 'To': 3306},
    'PostgreSQL': {'From': 5432, 'To': 5432},
    'RDP': {'From': 3389, 'To': 3389},
    'DNS': {'From': 53, 'To': 53}
}
```

### ICMP Type and Code
```python
# Ping (Echo Request/Reply)
icmp_ping = {'Type': 8, 'Code': 0}   # Echo Request
icmp_ping_reply = {'Type': 0, 'Code': 0}  # Echo Reply

# Destination Unreachable
icmp_dest_unreachable = {'Type': 3, 'Code': 0}  # Network unreachable
icmp_host_unreachable = {'Type': 3, 'Code': 1}  # Host unreachable
icmp_port_unreachable = {'Type': 3, 'Code': 2}  # Port unreachable

# Time Exceeded
icmp_ttl_expired = {'Type': 11, 'Code': 0}  # TTL expired
icmp_fragment_reassembly = {'Type': 11, 'Code': 1}  # Fragment reassembly timeout
```

## Casos de Uso Prácticos

### 1. Segmentación de Seguridad por Ambiente
```python
def create_environment_nacls(vpc_id, nacl_manager):
    """Crear NACLs para diferentes ambientes"""
    
    nacls = {}
    
    # NACL para Desarrollo (más permisiva)
    dev_result = nacl_manager.create_network_acl(
        vpc_id, 'dev-nacl', 'Development Environment NACL'
    )
    
    if dev_result['success']:
        nacl_id = dev_result['network_acl_id']
        
        # Permitir todo el tráfico de entrada
        nacl_manager.add_ingress_rule(nacl_id, 100, -1, None, '0.0.0.0/0')
        # Permitir todo el tráfico de salida
        nacl_manager.add_egress_rule(nacl_id, 100, -1, None, '0.0.0.0/0')
        
        nacls['development'] = nacl_id
    
    # NACL para Producción (restrictiva)
    prod_result = nacl_manager.create_network_acl(
        vpc_id, 'prod-nacl', 'Production Environment NACL'
    )
    
    if prod_result['success']:
        nacl_id = prod_result['network_acl_id']
        
        # Reglas específicas para producción
        ingress_rules = [
            {'rule_number': 100, 'protocol': 6, 'port_range': {'From': 80, 'To': 80}, 'cidr_block': '0.0.0.0/0'},
            {'rule_number': 110, 'protocol': 6, 'port_range': {'From': 443, 'To': 443}, 'cidr_block': '0.0.0.0/0'},
            {'rule_number': 120, 'protocol': 6, 'port_range': {'From': 22, 'To': 22}, 'cidr_block': '10.0.0.0/16'}
        ]
        
        for rule in ingress_rules:
            nacl_manager.add_ingress_rule(
                nacl_id, rule['rule_number'], rule['protocol'],
                rule['port_range'], rule['cidr_block']
            )
        
        # Reglas de salida restrictivas
        egress_rules = [
            {'rule_number': 100, 'protocol': 6, 'port_range': {'From': 443, 'To': 443}, 'cidr_block': '0.0.0.0/0'},
            {'rule_number': 110, 'protocol': 17, 'port_range': {'From': 53, 'To': 53}, 'cidr_block': '0.0.0.0/0'}
        ]
        
        for rule in egress_rules:
            nacl_manager.add_egress_rule(
                nacl_id, rule['rule_number'], rule['protocol'],
                rule['port_range'], rule['cidr_block']
            )
        
        nacls['production'] = nacl_id
    
    return nacls
```

### 2. Auditoría de Seguridad de NACLs
```python
def audit_nacl_security(nacl_id, nacl_manager):
    """Auditar configuración de seguridad de NACL"""
    
    nacl_info = nacl_manager.describe_network_acl(nacl_id)
    
    if not nacl_info['success']:
        return nacl_info
    
    security_score = 100
    issues = []
    recommendations = []
    
    # Analizar reglas de entrada
    ingress_rules = nacl_info['ingress_rules']
    egress_rules = nacl_info['egress_rules']
    
    # Verificar reglas muy permisivas
    for rule in ingress_rules:
        if (rule['protocol'] == -1 and 
            rule['cidr_block'] == '0.0.0.0/0' and
            rule['rule_action'] == 'allow'):
            security_score -= 30
            issues.append("Allows all ingress traffic from anywhere")
            recommendations.append("Restrict ingress traffic to specific sources and ports")
    
    # Verificar reglas de salida muy permisivas
    for rule in egress_rules:
        if (rule['protocol'] == -1 and 
            rule['cidr_block'] == '0.0.0.0/0' and
            rule['rule_action'] == 'allow'):
            security_score -= 20
            issues.append("Allows all egress traffic to anywhere")
            recommendations.append("Restrict egress traffic to specific destinations")
    
    # Verificar si hay reglas SSH expuestas
    for rule in ingress_rules:
        if (rule['protocol'] == 6 and 
            rule['port_range'] and 
            rule['port_range']['From'] == 22 and
            rule['cidr_block'] == '0.0.0.0/0'):
            security_score -= 25
            issues.append("SSH access from anywhere")
            recommendations.append("Restrict SSH access to specific IP ranges")
    
    # Verificar si permite ICMP sin restricciones
    for rule in ingress_rules:
        if (rule['protocol'] == 1 and 
            rule['cidr_block'] == '0.0.0.0/0' and
            rule['rule_action'] == 'allow'):
            security_score -= 10
            issues.append("ICMP access from anywhere")
            recommendations.append("Consider restricting ICMP to specific sources")
    
    # Verificar complejidad
    total_rules = len(ingress_rules) + len(egress_rules)
    if total_rules > 20:
        security_score -= 15
        issues.append(f"Too many rules ({total_rules})")
        recommendations.append("Simplify rules for better maintainability")
    
    return {
        'network_acl_id': nacl_id,
        'security_score': max(0, security_score),
        'issues': issues,
        'recommendations': recommendations,
        'ingress_rules_count': len(ingress_rules),
        'egress_rules_count': len(egress_rules)
    }
```

### 3. Automatización de NACLs para Subnets
```python
def setup_subnet_nacls(vpc_id, subnet_configs, nacl_manager):
    """Configurar NACLs para múltiples subnets"""
    
    results = {}
    
    for subnet_config in subnet_configs:
        subnet_id = subnet_config['subnet_id']
        subnet_type = subnet_config['type']  # 'web', 'app', 'db', 'isolated'
        
        if subnet_type == 'web':
            # Crear NACL para web servers
            nacl_result = create_web_server_nacl(vpc_id, nacl_manager)
            nacl_id = nacl_result['network_acl_id']
            
        elif subnet_type == 'app':
            # Crear NACL para application servers
            nacl_result = create_app_server_nacl(vpc_id, subnet_config['web_cidr'], nacl_manager)
            nacl_id = nacl_result['network_acl_id']
            
        elif subnet_type == 'db':
            # Crear NACL para database servers
            nacl_result = create_database_nacl(vpc_id, subnet_config['app_cidr'], nacl_manager)
            nacl_id = nacl_result['network_acl_id']
            
        elif subnet_type == 'isolated':
            # Crear NACL para subred aislada (sin internet)
            nacl_result = create_isolated_nacl(vpc_id, nacl_manager)
            nacl_id = nacl_result['network_acl_id']
        
        if nacl_result['success']:
            # Asociar NACL a subnet
            association = nacl_manager.associate_with_subnet(nacl_id, subnet_id)
            
            results[subnet_id] = {
                'subnet_type': subnet_type,
                'network_acl_id': nacl_id,
                'association_id': association['association_id'],
                'status': 'associated'
            }
        else:
            results[subnet_id] = {
                'subnet_type': subnet_type,
                'error': nacl_result['error']
            }
    
    return results

def create_isolated_nacl(vpc_id, nacl_manager):
    """Crear NACL para subred aislada"""
    
    # Crear NACL
    nacl_result = nacl_manager.create_network_acl(
        vpc_id,
        'isolated-nacl',
        'Network ACL for isolated subnet (no internet access)'
    )
    
    if not nacl_result['success']:
        return nacl_result
    
    nacl_id = nacl_result['network_acl_id']
    
    # Solo permitir comunicación interna de VPC
    ingress_rules = [
        {
            'rule_number': 100,
            'protocol': -1,
            'cidr_block': '10.0.0.0/16'  # Solo dentro de la VPC
        }
    ]
    
    for rule in ingress_rules:
        nacl_manager.add_ingress_rule(
            nacl_id,
            rule['rule_number'],
            rule['protocol'],
            None,
            rule['cidr_block']
        )
    
    # Permitir salida solo hacia VPC
    egress_rules = [
        {
            'rule_number': 100,
            'protocol': -1,
            'cidr_block': '10.0.0.0/16'  # Solo hacia la VPC
        }
    ]
    
    for rule in egress_rules:
        nacl_manager.add_egress_rule(
            nacl_id,
            rule['rule_number'],
            rule['protocol'],
            None,
            rule['cidr_block']
        )
    
    return {
        'success': True,
        'network_acl_id': nacl_id,
        'isolation_level': 'vpc_only'
    }
```

## Troubleshooting

### Problemas Comunes

#### 1. Conectividad Bloqueada
```bash
# Síntomas:
- No se puede acceder a instancias
- Las instancias no pueden salir a internet
- Aplicaciones no responden

# Diagnóstico:
aws ec2 describe-network-acls \
  --filters Name=vpc-id,Values=vpc-1234567890abcdef0

# Verificar reglas específicas
aws ec2 describe-network-acl-entries \
  --network-acl-id acl-1234567890abcdef0

# Solución común:
# - Verificar que las reglas permitan el tráfico necesario
# - Revisar que las reglas estén en orden numérico correcto
# - Asegurar que las reglas de entrada y salida sean consistentes
```

#### 2. Reglas No Se Aplican
```bash
# Síntomas:
- Las reglas parecen correctas pero no funcionan
- El tráfico sigue siendo bloqueado

# Diagnóstico:
aws ec2 describe-network-acls \
  --network-acl-ids acl-1234567890abcdef0

# Verificar asociaciones
aws ec2 describe-network-acls \
  --filters Name=association.subnet-id,Values=subnet-1234567890abcdef0

# Solución común:
# - Verificar que la NACL esté asociada a la subnet correcta
# - Reemplazar la asociación si es necesario
# - Verificar que no haya NACLs en conflicto
```

#### 3. Demasiadas Reglas
```bash
# Síntomas:
- Configuración compleja
- Dificultad para troubleshooting
- Reglas se solapan

# Diagnóstico:
aws ec2 describe-network-acl-entries \
  --network-acl-id acl-1234567890abcdef0

# Contar reglas
aws ec2 describe-network-acl-entries \
  --network-acl-id acl-1234567890abcdef0 | jq '.NetworkAcls[0].Entries | length'

# Solución común:
# - Consolidar reglas usando rangos de IP
# - Usar reglas más amplias donde sea posible
# - Eliminar reglas redundantes
```

### Scripts de Diagnóstico
```python
class NACLDiagnostics:
    def __init__(self, nacl_manager):
        self.nacl_manager = nacl_manager
    
    def diagnose_connectivity_issues(self, subnet_id, source_ip, destination_port):
        """Diagnosticar problemas de conectividad"""
        
        diagnosis = {
            'subnet_id': subnet_id,
            'source_ip': source_ip,
            'destination_port': destination_port,
            'issues': [],
            'recommendations': []
        }
        
        # Obtener NACL asociada a la subnet
        nacls = self.nacl_manager.list_network_acls()
        
        associated_nacl = None
        for nacl in nacls['network_acls']:
            nacl_details = self.nacl_manager.describe_network_acl(nacl['network_acl_id'])
            if nacl_details['success']:
                for association in nacl_details['associations']:
                    if association['SubnetId'] == subnet_id:
                        associated_nacl = nacl_details
                        break
        
        if not associated_nacl:
            diagnosis['issues'].append('No Network ACL associated with subnet')
            return diagnosis
        
        # Verificar reglas de entrada
        ingress_allowed = False
        for rule in associated_nacl['ingress_rules']:
            if self._rule_matches(rule, source_ip, destination_port):
                if rule['rule_action'] == 'allow':
                    ingress_allowed = True
                    diagnosis['matching_ingress_rule'] = rule
                    break
                else:
                    diagnosis['issues'].append(f"Traffic blocked by deny rule {rule['rule_number']}")
        
        if not ingress_allowed:
            diagnosis['issues'].append('No allow rule found for ingress traffic')
            diagnosis['recommendations'].append(
                'Add allow rule for source IP and destination port'
            )
        
        # Verificar reglas de salida (para tráfico de respuesta)
        egress_allowed = False
        for rule in associated_nacl['egress_rules']:
            if self._rule_matches(rule, source_ip, destination_port):
                if rule['rule_action'] == 'allow':
                    egress_allowed = True
                    diagnosis['matching_egress_rule'] = rule
                    break
                else:
                    diagnosis['issues'].append(f"Response traffic blocked by deny rule {rule['rule_number']}")
        
        if not egress_allowed:
            diagnosis['issues'].append('No allow rule found for response traffic')
            diagnosis['recommendations'].append(
                'Add allow rule for response traffic'
            )
        
        diagnosis['connectivity_status'] = 'allowed' if ingress_allowed else 'blocked'
        
        return diagnosis
    
    def _rule_matches(self, rule, ip, port):
        """Verificar si una regla coincide con IP y puerto"""
        
        # Verificar CIDR block
        if rule.get('cidr_block'):
            if not self._ip_in_cidr(ip, rule['cidr_block']):
                return False
        
        # Verificar puerto
        if rule.get('port_range'):
            port_range = rule['port_range']
            if not (port_range['From'] <= port <= port_range['To']):
                return False
        
        return True
    
    def _ip_in_cidr(self, ip, cidr):
        """Verificar si IP está en rango CIDR"""
        import ipaddress
        
        try:
            ip_addr = ipaddress.IPv4Address(ip)
            network = ipaddress.IPv4Network(cidr)
            return ip_addr in network
        except:
            return False
    
    def generate_nacl_report(self, vpc_id):
        """Generar reporte completo de NACLs en VPC"""
        
        report = {
            'vpc_id': vpc_id,
            'nacls': [],
            'summary': {
                'total_nacls': 0,
                'default_nacls': 0,
                'custom_nacls': 0,
                'unassociated_subnets': []
            },
            'security_issues': []
        }
        
        # Obtener todas las NACLs
        nacls = self.nacl_manager.list_network_acls(vpc_id)
        
        if not nacls['success']:
            return nacls
        
        report['summary']['total_nacls'] = nacls['count']
        
        # Analizar cada NACL
        for nacl in nacls['network_acls']:
            nacl_details = self.nacl_manager.describe_network_acl(nacl['network_acl_id'])
            
            if nacl_details['success']:
                nacl_info = {
                    'network_acl_id': nacl['network_acl_id'],
                    'is_default': nacl_details['is_default'],
                    'associations_count': len(nacl_details['associations']),
                    'ingress_rules_count': len(nacl_details['ingress_rules']),
                    'egress_rules_count': len(nacl_details['egress_rules']),
                    'tags': nacl_details['tags']
                }
                
                if nacl_details['is_default']:
                    report['summary']['default_nacls'] += 1
                else:
                    report['summary']['custom_nacls'] += 1
                
                # Auditoría de seguridad
                security_audit = audit_nacl_security(nacl['network_acl_id'], self.nacl_manager)
                if security_audit['security_score'] < 70:
                    report['security_issues'].append({
                        'nacl_id': nacl['network_acl_id'],
                        'security_score': security_audit['security_score'],
                        'issues': security_audit['issues']
                    })
                
                report['nacls'].append(nacl_info)
        
        return report
```

## Best Practices

### 1. Diseño de Reglas
```python
class NACLBestPractices:
    @staticmethod
    def create_secure_template(vpc_id):
        """Plantilla de NACL segura"""
        
        return {
            'ingress_rules': [
                # Regla 100: Permitir HTTP/HTTPS
                {
                    'rule_number': 100,
                    'protocol': 6,
                    'port_range': {'From': 80, 'To': 80},
                    'cidr_block': '0.0.0.0/0',
                    'description': 'HTTP traffic'
                },
                {
                    'rule_number': 110,
                    'protocol': 6,
                    'port_range': {'From': 443, 'To': 443},
                    'cidr_block': '0.0.0.0/0',
                    'description': 'HTTPS traffic'
                },
                # Regla 120: Permitir SSH desde red corporativa
                {
                    'rule_number': 120,
                    'protocol': 6,
                    'port_range': {'From': 22, 'To': 22},
                    'cidr_block': '203.0.113.0/24',
                    'description': 'SSH from corporate network'
                },
                # Regla 130: Permitir ICMP limitado
                {
                    'rule_number': 130,
                    'protocol': 1,
                    'icmp_type_code': {'Type': 8, 'Code': 0},
                    'cidr_block': '0.0.0.0/0',
                    'description': 'Ping requests'
                }
            ],
            'egress_rules': [
                # Regla 100: Permitir HTTP/HTTPS saliente
                {
                    'rule_number': 100,
                    'protocol': 6,
                    'port_range': {'From': 80, 'To': 80},
                    'cidr_block': '0.0.0.0/0',
                    'description': 'HTTP outbound'
                },
                {
                    'rule_number': 110,
                    'protocol': 6,
                    'port_range': {'From': 443, 'To': 443},
                    'cidr_block': '0.0.0.0/0',
                    'description': 'HTTPS outbound'
                },
                # Regla 120: Permitir DNS
                {
                    'rule_number': 120,
                    'protocol': 17,
                    'port_range': {'From': 53, 'To': 53},
                    'cidr_block': '0.0.0.0/0',
                    'description': 'DNS queries'
                },
                # Regla 130: Permitir NTP
                {
                    'rule_number': 130,
                    'protocol': 17,
                    'port_range': {'From': 123, 'To': 123},
                    'cidr_block': '0.0.0.0/0',
                    'description': 'NTP time sync'
                }
            ]
        }
    
    @staticmethod
    def get_rule_numbering_strategy():
        """Estrategia para numeración de reglas"""
        
        return {
            'ingress': {
                'allow_rules': [100, 110, 120, 130, 140, 150],
                'deny_rules': [200, 210, 220, 230, 240, 250],
                'description': '100-149 for allow, 200-249 for deny'
            },
            'egress': {
                'allow_rules': [100, 110, 120, 130, 140, 150],
                'deny_rules': [200, 210, 220, 230, 240, 250],
                'description': '100-149 for allow, 200-249 for deny'
            },
            'best_practice': {
                'spacing': 'Use increments of 10 for easy insertion',
                'documentation': 'Document purpose of each rule',
                'review': 'Review rules quarterly for relevance'
            }
        }
```

### 2. Mantenimiento
```python
class NACLMaintenance:
    def __init__(self, nacl_manager):
        self.nacl_manager = nacl_manager
    
    def cleanup_unused_nacls(self, vpc_id):
        """Eliminar NACLs no utilizadas"""
        
        # Obtener todas las NACLs
        nacls = self.nacl_manager.list_network_acls(vpc_id)
        
        unused_nacls = []
        for nacl in nacls['network_acls']:
            nacl_details = self.nacl_manager.describe_network_acl(nacl['network_acl_id'])
            
            if nacl_details['success']:
                # Verificar si tiene asociaciones
                if len(nacl_details['associations']) == 0:
                    # No es la NACL por defecto
                    if not nacl_details['is_default']:
                        unused_nacls.append(nacl['network_acl_id'])
        
        # Eliminar NACLs no utilizadas
        cleanup_results = []
        for nacl_id in unused_nacls:
            result = self.nacl_manager.delete_network_acl(nacl_id)
            cleanup_results.append(result)
        
        return {
            'unused_nacls_found': len(unused_nacls),
            'cleanup_results': cleanup_results
        }
    
    def optimize_rule_order(self, nacl_id):
        """Optimizar orden de reglas para mejor rendimiento"""
        
        nacl_details = self.nacl_manager.describe_network_acl(nacl_id)
        
        if not nacl_details['success']:
            return nacl_details
        
        # Recolectar reglas
        ingress_rules = nacl_details['ingress_rules']
        egress_rules = nacl_details['egress_rules']
        
        # Ordenar reglas por número (ya deberían estar ordenadas)
        ingress_rules.sort(key=lambda x: x['rule_number'])
        egress_rules.sort(key=lambda x: x['rule_number'])
        
        # Verificar si hay gaps en la numeración
        optimization_suggestions = []
        
        # Verificar gaps en reglas de entrada
        for i in range(len(ingress_rules) - 1):
            current_rule = ingress_rules[i]
            next_rule = ingress_rules[i + 1]
            
            expected_next = current_rule['rule_number'] + 1
            if next_rule['rule_number'] != expected_next:
                optimization_suggestions.append(
                    f"Gap between ingress rules {current_rule['rule_number']} and {next_rule['rule_number']}"
                )
        
        # Verificar gaps en reglas de salida
        for i in range(len(egress_rules) - 1):
            current_rule = egress_rules[i]
            next_rule = egress_rules[i + 1]
            
            expected_next = current_rule['rule_number'] + 1
            if next_rule['rule_number'] != expected_next:
                optimization_suggestions.append(
                    f"Gap between egress rules {current_rule['rule_number']} and {next_rule['rule_number']}"
                )
        
        # Verificar si hay demasiadas reglas
        total_rules = len(ingress_rules) + len(egress_rules)
        if total_rules > 50:
            optimization_suggestions.append(
                f"Too many rules ({total_rules}). Consider consolidating similar rules"
            )
        
        return {
            'network_acl_id': nacl_id,
            'total_rules': total_rules,
            'ingress_rules': len(ingress_rules),
            'egress_rules': len(egress_rules),
            'optimization_suggestions': optimization_suggestions
        }
```

## Conclusion

Las Network ACLs son una herramienta fundamental para el control de seguridad a nivel de subnet en AWS. Proporcionan una capa adicional de protección que complementa a los Security Groups, permitiendo un control granular del tráfico de red a nivel de subnet.

### Puntos Clave:
1. **Stateless**: Deben permitir tanto el tráfico de solicitud como de respuesta
2. **Subnet Level**: Se aplican a toda la subnet, no a instancias individuales
3. **Order Matters**: Las reglas se evalúan en orden numérico ascendente
4. **Bidirectional**: Controlan tanto tráfico de entrada como de salida

### Cuando Usar NACLs:
- Para requirements de cumplimiento normativo
- Para segmentación de seguridad por subnet
- Como capa adicional de protección
- Para control de tráfico a nivel de infraestructura

### Mejores Prácticas:
- Usar reglas específicas en lugar de reglas generales
- Documentar el propósito de cada regla
- Revisar y optimizar regularmente
- Combinar con Security Groups para defensa en profundidad